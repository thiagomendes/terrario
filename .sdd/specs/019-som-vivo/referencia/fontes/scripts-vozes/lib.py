"""Biblioteca de tratamento e síntese para as vozes do esboço 019 (todo código nosso, sem dependência de terceiros além de numpy/scipy/ffmpeg).
Processa a 44,1 kHz; a saída final é codificada a 22,05 kHz."""
import os, subprocess, wave, numpy as np
from scipy.signal import butter, sosfiltfilt, sosfilt, lfilter, stft, istft
from scipy.ndimage import minimum_filter1d, uniform_filter1d

SR = 44100
ALVO_RMS = -23.0            # rms "enquanto soa" (janelas de 50 ms acima de -60 dBFS), igual à mediana das vozes de hoje
TETO = 10 ** (-3.0 / 20)    # pico máximo no WAV (o MP3 sobe um pouco: conferimos depois)
B = os.environ.get('BAIXADOS', '/b')
_cache = {}


def ler(nome, ini=None, fim=None):
    """Lê um arquivo baixado (caminho relativo a /b), mono 44,1 kHz; recorta [ini, fim] em segundos."""
    if nome not in _cache:
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(B, nome), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                             capture_output=True, check=True).stdout
        x = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
        _cache[nome] = x - np.mean(x)
    x = _cache[nome]
    if ini is None: return x.copy()
    a = max(0, int(ini * SR)); b = len(x) if fim is None else min(len(x), int(fim * SR))
    return x[a:b].copy()


def filtro(x, tipo, f, ordem=2):
    f = np.atleast_1d(f) / (SR / 2)
    if np.any(f >= 0.999): return x
    return sosfiltfilt(butter(ordem, f if len(f) > 1 else f[0], btype=tipo, output='sos'), x)


def banda(x, lo, hi, ordem=2):
    if lo: x = filtro(x, 'high', lo, ordem)
    if hi: x = filtro(x, 'low', hi, ordem)
    return x


def pico_eq(x, f, ganho_db, q=1.0):
    """Equalizador de pico (biquad RBJ)."""
    A = 10 ** (ganho_db / 40); w = 2 * np.pi * f / SR; al = np.sin(w) / (2 * q)
    b = [1 + al * A, -2 * np.cos(w), 1 - al * A]; a = [1 + al / A, -2 * np.cos(w), 1 - al / A]
    return lfilter(np.array(b) / a[0], np.array(a) / a[0], x)


def fita(x, r0, r1=None):
    """Toca como fita: r>1 sobe o tom e encurta; r0 -> r1 em glissando ao longo do som."""
    r1 = r0 if r1 is None else r1
    n = max(2, int(len(x) / ((r0 + r1) / 2))); u = np.linspace(0, 1, n)
    taxa = r0 + (r1 - r0) * u; pos = np.concatenate([[0], np.cumsum(taxa[:-1])]); pos = pos[pos < len(x) - 1]
    return np.interp(pos, np.arange(len(x)), x)


def fita_curva(x, curva):
    """Fita com taxa variável dada por pontos [(u, taxa), ...] em u=0..1 do tempo de saída (aprox.)."""
    us, rs = zip(*curva); rm = np.mean(rs)
    n = max(2, int(len(x) / rm)); u = np.linspace(0, 1, n); taxa = np.interp(u, us, rs)
    pos = np.concatenate([[0], np.cumsum(taxa[:-1])]); pos = pos[pos < len(x) - 1]
    return np.interp(pos, np.arange(len(x)), x)


def esticar(x, fator, n_fft=1024, hop=256):
    """Muda a duração (fator>1 alonga) sem mudar o tom: vocoder de fase com travamento simples."""
    if abs(fator - 1) < 1e-3 or len(x) < n_fft: return x.copy()
    w = np.hanning(n_fft); xp = np.concatenate([np.zeros(n_fft), x, np.zeros(n_fft)])
    nfr = (len(xp) - n_fft) // hop
    S = np.array([np.fft.rfft(w * xp[i * hop:i * hop + n_fft]) for i in range(nfr)])
    t = np.arange(0, nfr - 1, 1 / fator); mag = np.abs(S); fase = np.angle(S)
    omega = 2 * np.pi * hop * np.arange(n_fft // 2 + 1) / n_fft
    acc = fase[0].copy(); out = np.zeros(int(len(t) * hop + n_fft)); norm = np.zeros_like(out)
    for k, ti in enumerate(t):
        i = int(ti); fr = ti - i
        m = (1 - fr) * mag[i] + fr * mag[i + 1]
        dp = fase[i + 1] - fase[i] - omega; dp -= 2 * np.pi * np.round(dp / (2 * np.pi))
        y = np.fft.irfft(m * np.exp(1j * acc)) * w
        out[k * hop:k * hop + n_fft] += y; norm[k * hop:k * hop + n_fft] += w ** 2
        acc += omega + dp
    out /= np.maximum(norm, 1e-3)
    return out[n_fft:n_fft + int(len(x) * fator)]


def tom(x, semitons):
    """Sobe/desce o tom sem mudar a duração (vocoder + fita)."""
    r = 2 ** (semitons / 12)
    return fita(esticar(x, r), r)


def formante(x, fator):
    """Desloca só as formantes (corpo menor quando fator>1), mantendo tom e duração."""
    y = fita(x, fator)              # sobe tom e formantes, encurta
    y = esticar(y, len(x) / max(1, len(y)))  # volta a duração
    return tom(y, -12 * np.log2(fator))      # volta o tom


def env_db(x, w=0.01):
    k = max(1, int(w * SR)); n = max(1, len(x) // k)
    e = np.sqrt(np.mean(x[:n * k].reshape(n, k) ** 2, axis=1) + 1e-14); return 20 * np.log10(e), k


def aparar(x, rel=-36):
    d, k = env_db(x); on = np.where(d > d.max() + rel)[0]
    if not len(on): return x
    a = max(0, on[0] * k - int(0.01 * SR)); b = min(len(x), (on[-1] + 1) * k + int(0.03 * SR)); return x[a:b]


def portao(x, rel=-30, chao=-16):
    d, k = env_db(x, 0.005); lim = d.max() + rel
    g = np.clip((d - lim) / 10, 0, 1); g = 10 ** ((1 - g) * chao / 20)
    g = np.convolve(g, np.ones(5) / 5, mode='same'); gi = np.interp(np.arange(len(x)), np.arange(len(g)) * k + k / 2, g)
    return x * gi


def bordas(x, ent=0.006, sai=0.06):
    x = x.copy(); a = min(len(x) // 3, int(ent * SR)); b = min(len(x) // 2, int(sai * SR))
    if a: x[:a] *= np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    if b: x[-b:] *= np.cos(np.linspace(0, np.pi / 2, b)) ** 2
    return x


_rng_sala = np.random.default_rng(1919)
_irs = {}


def sala(x, dur=0.12, mol=0.10, brilho=3800):
    kk = (dur, brilho)
    if kk not in _irs:
        n = int(dur * SR); ir = _rng_sala.standard_normal(n) * np.exp(-np.arange(n) / (n / 6.9))
        ir = filtro(ir, 'low', brilho); _irs[kk] = ir / np.sqrt(np.sum(ir ** 2))
    ir = _irs[kk]; n = len(ir); pre = int(0.006 * SR)
    seco = np.concatenate([x, np.zeros(n)]); m = np.convolve(x, ir)[:len(seco)]
    m = np.concatenate([np.zeros(pre), m])[:len(seco)]
    return seco + m * mol


def eco(x, atraso=0.14, ret=0.35, n=3, lp=2500):
    out = np.concatenate([x, np.zeros(int(atraso * SR * n) + 10)]); y = x.copy()
    for i in range(1, n + 1):
        y = filtro(y, 'low', lp) * ret; a = int(atraso * SR * i); out[a:a + len(y)] += y
    return out


def coro(x, cents=9, atraso=0.012, m_=0.35):
    a = fita(x, 2 ** (cents / 1200)); b = fita(x, 2 ** (-cents / 1200)); d = int(atraso * SR)
    return mix_((x, 1, 0), (a, m_, atraso), (b, m_, 2 * atraso)) / (1 + m_ * 0.6)


def rms_ativo(x, sr=SR):
    w = int(0.05 * sr); n = len(x) // w
    if n == 0: return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
    r = np.sqrt(np.mean(x[:n * w].reshape(n, w) ** 2, axis=1)); r = r[r > 0.001]
    return 20 * np.log10(np.sqrt(np.mean(r ** 2))) if len(r) else -99


def limitar(x, teto=TETO):
    a = np.abs(x); g = np.minimum(1, teto / np.maximum(a, 1e-9)); k = int(0.004 * SR)
    g = minimum_filter1d(g, 2 * k + 1); g = uniform_filter1d(g, 2 * k + 1)
    return x * np.minimum(g, np.minimum(1, teto / np.maximum(a, 1e-9)))


def finalizar(x, ent=0.006, sai=0.06, mol=0.10, trim=-36, alvo=ALVO_RMS, sala_dur=0.12, lp=10000):
    x = aparar(x, trim); x = bordas(x, ent, sai)
    if mol: x = sala(x, dur=sala_dur, mol=mol)
    x = filtro(x, 'low', lp, 4); x = filtro(x, 'high', 45, 2); x = x - np.mean(x)
    for _ in range(5):
        x = x * 10 ** ((alvo - rms_ativo(x)) / 20); x = limitar(x)
    x = bordas(x, 0.002, 0.03)
    return np.concatenate([x, np.zeros(int(0.01 * SR))])


def salvar(caminho, x):
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    with wave.open(caminho, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())


def juntar(partes, gap=0.03, ov=0.0):
    out = np.zeros(0)
    for i, p in enumerate(partes):
        if i and gap > 0: out = np.concatenate([out, np.zeros(int(gap * SR))])
        if i and ov > 0 and len(out) > int(ov * SR):
            o = int(ov * SR); o = min(o, len(p)); out[-o:] += p[:o]; out = np.concatenate([out, p[o:]])
        else: out = np.concatenate([out, p])
    return out


def mix_(*camadas): return mix(*camadas)


def mix(*camadas):
    """camadas: (sinal, ganho, atraso_s)"""
    n = max(int(a * SR) + len(s) for s, g, a in camadas); out = np.zeros(n)
    for s, g, a in camadas:
        i = int(a * SR); out[i:i + len(s)] += s * g
    return out


def norm(x):
    return x / (np.max(np.abs(x)) + 1e-12)


# ------------------------------------------------------------------ eventos (trechos com som)
def eventos(x, min_dur=0.04, junta=0.06, rel=-28):
    d, k = env_db(x, 0.01); piso = np.percentile(d, 15); lim = max(piso + 10, d.max() + rel)
    on = d > lim; evs = []; i = 0; n = len(d); jj = int(junta / 0.01)
    while i < n:
        if on[i]:
            j = i
            while j < n and (on[j] or on[j:j + jj].any()): j += 1
            if (j - i) * 0.01 >= min_dur:
                seg = x[i * k:j * k]; evs.append((i * 0.01, j * 0.01, 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-12), f0(seg)))
            i = j
        else: i += 1
    return evs


def f0(seg):
    m = seg[len(seg) // 4: len(seg) // 4 + 4096]
    if len(m) < 1024: return (0, 0)
    m = m - m.mean(); nn = len(m); X = np.fft.rfft(m, 2 * nn); ac = np.fft.irfft(X * np.conj(X))[:nn]
    if ac[0] <= 0: return (0, 0)
    ac /= ac[0]; lo, hi = SR // 2000, SR // 60; kk = lo + int(np.argmax(ac[lo:hi]))
    return (round(SR / kk), round(float(ac[kk]), 2))


# ------------------------------------------------------------------ síntese
rng = np.random.default_rng(2019)


def t_(dur): return np.arange(int(dur * SR)) / SR


def adsr(n, a=0.005, r=0.05, forma=1.0):
    e = np.ones(n); na = min(n // 2, int(a * SR)); nr = min(n - na, int(r * SR))
    if na: e[:na] = np.linspace(0, 1, na) ** forma
    if nr: e[-nr:] = np.linspace(1, 0, nr) ** 2
    return e


def osc(freq, forma='sine', fase0=0.0):
    """freq: array por amostra. Formas suaves (sem aliasing forte)."""
    ph = 2 * np.pi * np.cumsum(freq) / SR + fase0
    if forma == 'sine': return np.sin(ph)
    if forma == 'tri': return (2 / np.pi) * np.arcsin(np.sin(ph))
    if forma == 'square':  # quadrada macia (soma de 7 harmônicos ímpares)
        return sum(np.sin((2 * h + 1) * ph) / (2 * h + 1) for h in range(7)) * 1.1
    if forma == 'saw':
        return sum(np.sin(h * ph) / h * (-1) ** (h + 1) for h in range(1, 10)) * 0.6
    raise ValueError(forma)


def glide(dur, pontos, log=True):
    """pontos: [(u, hz), ...]; interpola em log-freq."""
    n = int(dur * SR); u = np.linspace(0, 1, n); us, hs = zip(*pontos)
    return np.exp(np.interp(u, us, np.log(hs))) if log else np.interp(u, us, hs)


def vibrato(f, taxa=5.5, prof_semi=0.3, atraso=0.0):
    t = np.arange(len(f)) / SR; amp = np.clip((t - atraso) / 0.08, 0, 1)
    return f * 2 ** (prof_semi * amp * np.sin(2 * np.pi * taxa * t) / 12)


def ruido(n, lo=None, hi=None):
    return banda(rng.standard_normal(n), lo, hi)


def bolha(f0=500, f1=None, dur=0.06, amort=None):
    """Bolha: seno que sobe rápido com queda exponencial (modelo de Minnaert)."""
    f1 = f1 or f0 * 2.2; t = t_(dur); f = f0 * (f1 / f0) ** (t / dur)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (amort or dur / 3.5))
    return bordas(y, 0.002, 0.01)


def boing(f0=300, f_top=None, dur=0.35, vib=11, prof=2.5, forma='sine'):
    f_top = f_top or f0 * 1.6; n = int(dur * SR); t = np.arange(n) / SR
    base = f0 + (f_top - f0) * np.exp(-t / (dur * 0.25))
    f = base * 2 ** (prof * np.exp(-t / (dur * 0.5)) * np.sin(2 * np.pi * vib * t) / 12)
    return osc(f, forma) * np.exp(-t / (dur * 0.45)) * adsr(n, 0.004, 0.04)


def apito(pontos, dur, ar=0.12, vib=(5.5, 0.25)):
    """Assobio: seno + sopro de ar na mesma frequência."""
    f = vibrato(glide(dur, pontos), *vib); n = len(f)
    y = osc(f) + ar * banda(rng.standard_normal(n), 2000, 6000) * 0.3
    return y * adsr(n, 0.02, 0.05)


def puf(dur=0.25, lo=200, hi=2500, cair=True):
    n = int(dur * SR); t = np.arange(n) / SR; x = rng.standard_normal(n)
    # passa-baixa que fecha (puf macio)
    out = np.zeros(n); blocos = 16; k = n // blocos + 1
    for i in range(blocos):
        fc = hi * (0.25 + 0.75 * (1 - i / blocos)) if cair else hi
        seg = x[i * k:(i + 1) * k]
        if len(seg) < 10: continue
        out[i * k:i * k + len(seg)] = filtro(seg, 'low', fc, 2)
    out = filtro(out, 'high', lo, 2)
    return out * (t / 0.012).clip(0, 1) * np.exp(-t / (dur * 0.3))


def bip(freq, dur, forma='square', glide_to=None, lp=3200):
    f = glide(dur, [(0, freq), (1, glide_to or freq)]); n = len(f)
    return filtro(osc(f, forma), 'low', lp) * adsr(n, 0.003, min(0.03, dur / 3))


# ------------------------------------------------------------------ voz de formantes (moradores e fantasias): código nosso
VOGAIS = {  # F1, F2, F3 (Hz) de uma voz adulta média; escalamos para "brinquedo"
    'a': (800, 1300, 2700), 'é': (640, 1900, 2700), 'e': (460, 2100, 2800), 'i': (300, 2400, 3100),
    'ó': (620, 1000, 2600), 'o': (460, 850, 2600), 'u': (330, 750, 2500), 'ã': (650, 1300, 2700),
}


def _ressoar(src, fs_tr, bws, ganhos=None, bloco=128):
    """Banco de ressonadores em paralelo com coeficientes por bloco. fs_tr: array (n, nf)."""
    n, nf = fs_tr.shape; out = np.zeros(n)
    for j in range(nf):
        zi = np.zeros(2); y = np.zeros(n); bw = bws[j]
        for i in range(0, n, bloco):
            f = fs_tr[min(n - 1, i + bloco // 2), j]
            r = np.exp(-np.pi * bw / SR); c = 2 * r * np.cos(2 * np.pi * f / SR)
            a = [1, -c, r * r]; b = [(1 - r) * np.sqrt(1 - 2 * r * np.cos(4 * np.pi * f / SR) + r * r)]
            y[i:i + bloco], zi = lfilter(b, a, src[i:i + bloco], zi=zi)
        g = 1.0 if ganhos is None else ganhos[j]
        out += y * g * (1 if j % 2 == 0 else -1) * (1.0 if j == 0 else 0.7)
    return out


def glote(f, sopro=0.08, jitter=0.004, tp=0.42, tn=0.18):
    """Pulso glótico de Rosenberg com derivada (radiação), jitter e sopro."""
    n = len(f); jit = 1 + jitter * np.convolve(rng.standard_normal(n), np.ones(400) / 400, 'same') * 20
    ph = np.cumsum(f * jit) / SR; p = ph - np.floor(ph)
    g = np.where(p < tp, 0.5 * (1 - np.cos(np.pi * p / tp)), np.where(p < tp + tn, np.cos(np.pi * (p - tp) / (2 * tn)), 0))
    dg = np.diff(g, prepend=0) * SR / (np.maximum(f, 50) * 4)
    asp = rng.standard_normal(n) * (0.4 + 0.6 * g) * sopro
    return dg + asp


def falar(silabas, f_base=300, escala=1.18, sopro=0.08, vib=(5.5, 0.25), legato=0.03, bw=(110, 150, 220), nasal=0.0, f3_r=None,
          degraus=False, jitter=0.004, carrier=None):
    """silabas: lista de dicts {c: consoante('', b, d, m, n, l, p, t, nh, r, g, br, bl), v: vogal, dur, nota (semitons), gl (semitons de glissando)}.
    Retorna o sinal. Consoantes são aproximadas com transições de formantes (b/d/g), murmúrio nasal (m/n/nh), lateral (l), estouro (p/t) e batida (r)."""
    # contorno de tom e formantes por amostra
    tot = sum(s['dur'] for s in silabas); n = int(tot * SR) + 1
    f0 = np.zeros(n); F = np.zeros((n, 3)); amp = np.zeros(n); estouro = np.zeros(n); i0 = 0
    for k, s in enumerate(silabas):
        m = int(s['dur'] * SR); seg = slice(i0, i0 + m); u = np.linspace(0, 1, m)
        nota = s.get('nota', 0); gl = s.get('gl', 0)
        f0[seg] = f_base * 2 ** ((nota + gl * u ** 1.5) / 12)
        alvo = np.array(VOGAIS[s['v']]) * escala
        c = s.get('c', ''); tc = min(0.045, s['dur'] * 0.35); mc = int(tc * SR)
        Fs = np.tile(alvo, (m, 1)); a = np.ones(m)
        if c in ('b', 'br', 'bl', 'p', 'm'):
            loc = np.array([280, 900, 2300]) * escala
        elif c in ('d', 't', 'n', 'l', 'r'):
            loc = np.array([300, 1700, 2600]) * escala
        elif c in ('g',):
            loc = np.array([300, 2000, 2300]) * escala
        elif c == 'nh':
            loc = np.array([280, 2100, 2900]) * escala
        else:
            loc = alvo
        if c and mc > 4:
            w = (np.linspace(0, 1, mc) ** 0.7)[:, None]; Fs[:mc] = loc * (1 - w) + alvo * w
            if c in ('m', 'n', 'nh'):
                a[:mc // 2] = 0.35; a[mc // 2:mc] = np.linspace(0.35, 1, mc - mc // 2)
            elif c in ('b', 'd', 'g', 'br', 'bl'):
                q = int(0.018 * SR); a[:min(q, m)] = 0.12; a[q:mc] = np.linspace(0.3, 1, max(0, mc - q))[:max(0, min(mc, m) - q)]
            elif c in ('p', 't'):
                q = int(0.03 * SR); a[:min(q, m)] = 0.0; a[q:mc] = np.linspace(0.2, 1, max(0, mc - q))[:max(0, min(mc, m) - q)]
                b0 = i0 + q; estouro[b0:b0 + int(0.006 * SR)] = 1 if c == 't' else 0.7
            elif c == 'l':
                a[:mc] = np.linspace(0.6, 1, mc)
            elif c == 'r':
                q = int(0.012 * SR); a[:q] = np.linspace(1, 0.25, q); a[q:2 * q] = np.linspace(0.25, 1, q)
            if c in ('br', 'bl'):  # encontro: segunda batida curta
                q = int(0.03 * SR); r2 = int(0.012 * SR); a[q:q + r2] *= 0.4
        if f3_r and 'r' in c or (f3_r and s.get('caipira')):
            Fs[:, 2] = np.minimum(Fs[:, 2], f3_r)  # r caipira (retroflexo): F3 baixo
        a *= adsr(m, 0.012, min(0.05, s['dur'] * 0.4))
        F[seg] = Fs; amp[seg] = a; i0 += m
    # suaviza contornos (legato)
    kl = max(1, int(legato * SR))
    ker = np.hanning(kl * 2 + 1); ker /= ker.sum()
    if not degraus: f0 = np.exp(np.convolve(np.log(np.maximum(f0, 30)), ker, 'same'))
    for j in range(3): F[:, j] = np.convolve(F[:, j], ker, 'same')
    F[:kl, :] = F[kl, :]; F[-kl:, :] = F[-kl - 1, :]
    if degraus: pass
    else:
        f0[:kl] = f0[kl]; f0[-kl:] = f0[-kl - 1]
    f0 = vibrato(f0, vib[0], vib[1], 0.05)
    src = glote(f0, sopro=sopro, jitter=jitter) if carrier is None else carrier(f0)
    y = _ressoar(src, F, bw, ganhos=[1.0, 0.8, 0.35])
    if nasal: y = y + nasal * _ressoar(src, np.tile([250, 2200, 3200], (n, 1)).astype(float), (60, 200, 300)) * 0.5
    y = y * np.convolve(amp, np.ones(64) / 64, 'same')
    if estouro.any():
        b = ruido(n, 1500, 7000) * np.convolve(estouro, np.ones(40) / 40, 'same') * 0.6; y = y + b * np.max(np.abs(y))
    return y
