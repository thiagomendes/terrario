"""Renders (44,1 kHz, estéreo) -> laços e frases em 22,05 kHz mono, equilibrados para o volume de hoje.
Uso: python3 -I processar.py <render> <plano.json> <saida_wav> <medidas.json>
Laços: a cauda é dobrada sobre o começo (estado estacionário do laço) e o arquivo é periódico com folga P antes e Q depois
(qualquer janela de L amostras dentro dele é um laço perfeito, com ou sem o atraso do codificador MP3).
Frases: P zeros + frase + 0,7 s de cauda (com esmaecimento).
"""
import sys, os, json, struct
import numpy as np

SR0, SR = 44100, 22050
P = Q = 1323            # 60 ms de folga (atraso do LAME = 1105 amostras)
CAUDA = round(0.7 * SR)
ALVO = dict(dia=-24.6, tardeRel=-7.5, noite=-27.5, correndo=-23.6, correndoAmigos=-22.8, perigo=-26.5, pingosRel=-13.0, melRel=-5.0)


def ler(c):
    b = open(c, 'rb').read()
    i, fmt = 12, None
    while i < len(b):
        cid, n = b[i:i + 4], struct.unpack('<I', b[i + 4:i + 8])[0]
        if cid == b'fmt ':
            fmt = struct.unpack('<HHIIHH', b[i + 8:i + 24])
        if cid == b'data':
            dados = b[i + 8:i + 8 + n]
            break
        i += 8 + n + (n & 1)
    tag, ch, sr, _, _, bits = fmt
    x = np.frombuffer(dados, '<f4') if (tag == 3 or bits == 32) else np.frombuffer(dados, '<i2').astype(np.float32) / 32768
    return x.reshape(-1, ch).astype(np.float64), sr


def gravar(c, x):
    raw = x.astype('<f4').tobytes()
    with open(c, 'wb') as f:
        f.write(b'RIFF' + struct.pack('<I', 36 + len(raw)) + b'WAVEfmt ' + struct.pack('<IHHIIHH', 16, 3, 1, SR, SR * 4, 4, 32) + b'data' + struct.pack('<I', len(raw)) + raw)


def meia_periodica(x):
    """2:1 por FFT, exato para sinal periódico (o laço continua laço)."""
    n = len(x)
    assert n % 2 == 0
    X = np.fft.rfft(x)
    k = n // 4
    Y = X[:k + 1].copy()
    a = int(k * 0.93)
    Y[a:] *= 0.5 * (1 + np.cos(np.linspace(0, np.pi, k + 1 - a)))
    return np.fft.irfft(Y, n=n // 2) * 0.5


db = lambda v: float(round(20 * np.log10(v), 2)) if v > 0 else -999.0
rms = lambda x: float(np.sqrt(np.mean(x ** 2)))


def medir(x):
    return dict(rmsDb=db(rms(x)), picoDb=db(float(np.max(np.abs(x)))), cortes=int(np.sum(np.abs(x) >= 0.999)))


def silencio(x):
    w = int(0.05 * SR)
    n = len(x) // w
    r = np.sqrt(np.mean(x[:n * w].reshape(n, w) ** 2, axis=1))
    return round(float(np.mean(r < 10 ** (-60 / 20))), 3)


def afinacao(x, pcs):
    """Picos do espectro entre 80 Hz e 3 kHz: fração da energia em classes da escala e desvio médio (cents)."""
    n = 1 << int(np.ceil(np.log2(len(x))))
    S = np.abs(np.fft.rfft(x * np.hanning(len(x)), n=n)) ** 2
    f = np.fft.rfftfreq(n, 1 / SR)
    sel = (f > 80) & (f < 3000)
    S2, f2 = S[sel], f[sel]
    pico = (S2[1:-1] > S2[:-2]) & (S2[1:-1] > S2[2:]) & (S2[1:-1] > S2.max() * 1e-4)
    idx = np.where(pico)[0] + 1
    if len(idx) == 0:
        return dict(naEscala=None, centsMedio=None)
    ff, ee = f2[idx], S2[idx]
    m = 69 + 12 * np.log2(ff / 440)
    nr = np.round(m)
    cents = (m - nr) * 100
    ok = np.isin(nr.astype(int) % 12, pcs)
    return dict(naEscala=round(float(ee[ok].sum() / ee.sum()), 3), centsMedio=round(float(np.sum(np.abs(cents) * ee) / ee.sum()), 1))


def ganho_para(alvo, fixo, var):
    """g tal que rms(fixo + g*var) = alvo (dB)."""
    lo, hi = 0.0, 50.0
    for _ in range(60):
        g = (lo + hi) / 2
        if db(rms(fixo + g * var)) > alvo:
            hi = g
        else:
            lo = g
    return (lo + hi) / 2


def limitar(x, laco, folga=17.0):
    """Doma só os estalos: pico acima de RMS + folga dB é baixado com envelope curto (ataque 1 ms, soltura 60 ms).
    Em laço, processa três voltas e fica com a do meio (continua periódico)."""
    n = len(x)
    y = np.tile(x, 3) if laco else np.concatenate([x, np.zeros(SR // 10)])
    thr = rms(x) * 10 ** (folga / 20)
    a = np.abs(y)
    if a.max() <= thr:
        return x
    w = int(0.002 * SR)
    # máximo móvel rápido (janela 2w+1) por blocos
    from numpy.lib.stride_tricks import sliding_window_view
    pk = sliding_window_view(np.pad(a, (w, w)), 2 * w + 1).max(axis=1)
    alvo = np.minimum(1.0, thr / np.maximum(pk, 1e-12))
    rel = np.exp(-1 / (0.06 * SR))
    g = np.empty_like(alvo)
    cur = 1.0
    for i in range(len(alvo)):
        cur = alvo[i] if alvo[i] < cur else alvo[i] + (cur - alvo[i]) * rel
        g[i] = cur
    g = np.convolve(g, np.ones(w) / w, mode='same')   # sem degrau no ataque
    y = y * g
    return y[n:2 * n] if laco else y[:n]


def ladrilhar(x, L):
    return np.tile(x, L // len(x) + 1)[:L]


def seq(frases, L, cps):
    out = np.zeros(L)
    for x, ini in frases:
        p = ini * cps
        idx = (np.arange(len(x)) + p) % L
        np.add.at(out, idx, x)
    return out


if __name__ == '__main__':
    rend, plano, saida, medidas = sys.argv[1:5]
    plano = json.load(open(plano))
    os.makedirs(saida, exist_ok=True)
    escalas = {'MAIOR': [0, 2, 4, 5, 7, 9, 11], 'LIDIO': [0, 2, 4, 6, 7, 9, 11]}
    tonicas = {'bruma-e-luz': (65, 'MAIOR'), 'mata-encantada': (62, 'MAIOR'), 'era-dos-dinos': (60, 'MAIOR'), 'exploracao-lunar': (64, 'MAIOR'),
               'doce-reino': (70, 'MAIOR'), 'planeta-vivo': (69, 'LIDIO'), 'rancho-alegre': (67, 'MAIOR')}
    res = {}
    for tid, it in plano.items():
        cps = it['amostrasCompasso']
        L = it['amostrasVolta']
        ton, esc = tonicas[tid]
        pcs = [(ton + s) % 12 for s in escalas[esc]]
        pcs_perigo = [(ton - 3 + s) % 12 for s in [0, 2, 3, 5, 7, 8, 11]]
        cam = {}
        for c in it['camadas']:
            x, sr = ler(os.path.join(rend, c['arq'] + '.wav'))
            assert sr == SR0
            x = x.mean(axis=1)
            n0 = c['compassos'] * cps * 2
            y = np.zeros(n0)
            np.add.at(y, np.arange(len(x)) % n0, x)      # estado estacionário do laço
            cam[c['id']] = meia_periodica(y)
            assert len(cam[c['id']]) == c['compassos'] * cps
        fr = {}
        for f in it['frases']:
            x, sr = ler(os.path.join(rend, f['arq'] + '.wav'))
            x = x.mean(axis=1)
            nom = f['compassos'] * cps
            n0 = 2 * (nom + CAUDA) + 2 * SR0
            z = np.zeros(n0)
            z[:min(n0, len(x))] = x[:n0]
            y = meia_periodica(z)[:nom + CAUDA]
            fade = int(0.25 * SR)
            y[-fade:] *= 0.5 * (1 + np.cos(np.linspace(0, np.pi, fade)))
            fr[f['id']] = (y, f)
        # ---- equilíbrio
        for k in cam:
            cam[k] = limitar(cam[k], laco=True)
        for k in fr:
            fr[k] = (limitar(fr[k][0], laco=False), fr[k][1])
        base = cam['base']
        v1 = [k for k, (y, f) in fr.items() if f['contexto'] == 'dia' and f['variante'] == 1]
        t1 = [k for k, (y, f) in fr.items() if f['contexto'] == 'entardecer']
        dia = seq([(fr[k][0], fr[k][1]['compassoInicio']) for k in v1], L, cps)
        g_mel = 10 ** ((db(rms(base)) + ALVO['melRel'] - db(rms(dia))) / 20)
        dia *= g_mel
        g_all = 10 ** ((ALVO['dia'] - db(rms(base + dia))) / 20)
        base = base * g_all
        dia *= g_all
        g = {'base': g_all, 'dia': g_mel * g_all}
        tarde = seq([(fr[k][0], fr[k][1]['compassoInicio']) for k in t1], L, cps)
        g['entardecer'] = 10 ** ((db(rms(base)) + ALVO['tardeRel'] - db(rms(tarde))) / 20)
        tarde *= g['entardecer']
        g['noite'] = ganho_para(ALVO['noite'], 0.65 * base, cam['noite'])
        noite = cam['noite'] * g['noite']
        mov = ladrilhar(cam['mov'], L)
        g['mov'] = ganho_para(ALVO['correndo'], base + dia, mov)
        mov *= g['mov']
        g['amigos'] = ganho_para(ALVO['correndoAmigos'], base + dia + mov, cam['amigos'])
        amigos = cam['amigos'] * g['amigos']
        g['pingos'] = 10 ** ((db(rms(base)) + ALVO['pingosRel'] - db(rms(cam['pingos']))) / 20)
        pingos = ladrilhar(cam['pingos'], L) * g['pingos']
        if 'perigo' in cam:
            g['perigo'] = 10 ** ((ALVO['perigo'] - db(rms(cam['perigo']))) / 20)
        mixes = {
            'dia': (base + dia, {'base': 1, 'frases dia': 1}),
            'entardecer': (base + tarde, {'base': 1, 'frases entardecer': 1}),
            'noite': (0.65 * base + noite, {'base': 0.65, 'noite': 1}),
            'chuva (dia, sem o filtro)': (base + dia + pingos, {'base': 1, 'frases dia': 1, 'pingos': 1}),
            'caverna (sem o filtro)': (0.6 * base + noite + pingos, {'base': 0.6, 'noite': 1, 'pingos': 1}),
            'andando': (base + dia + 0.6 * mov, {'base': 1, 'frases dia': 1, 'movimento': 0.6}),
            'correndo': (base + dia + mov, {'base': 1, 'frases dia': 1, 'movimento': 1}),
            'amigos (parado)': (base + dia + amigos, {'base': 1, 'frases dia': 1, 'amigos': 1}),
            'correndo + amigos': (base + dia + mov + amigos, {'base': 1, 'frases dia': 1, 'movimento': 1, 'amigos': 1}),
            'tudo ligado (pior caso)': (base + dia + tarde + noite + mov + amigos + pingos, {}),
        }
        if 'perigo' in cam:
            mixes['perigo'] = (cam['perigo'] * g['perigo'], {'perigo': 1})
        r = dict(ganhos={k: db(v) for k, v in g.items()}, mixes={}, arquivos={})
        for k, (x, gs) in mixes.items():
            r['mixes'][k] = dict(medir(x), ganhos=gs)
        # ---- arquivos
        for cid, x in cam.items():
            gg = {'base': g['base'], 'noite': g['noite'], 'amigos': g['amigos'], 'mov': g['mov'], 'pingos': g['pingos'], 'perigo': g.get('perigo')}[cid]
            y = x * gg
            Lc = len(y)
            pad = np.concatenate([np.tile(y, 2)[-P:] if Lc < P else y[-P:], y, np.tile(y, 2)[:Q] if Lc < Q else y[:Q]])
            arq = f'{tid}__{cid}'
            gravar(os.path.join(saida, arq + '.wav'), pad)
            sem = silencio(y)
            a = afinacao(y, pcs_perigo if cid == 'perigo' else pcs) if cid != 'mov' else dict(naEscala=None, centsMedio=None)
            r['arquivos'][arq] = dict(tipo='camada', id=cid, amostrasLaco=Lc, folgaAntes=P, folgaDepois=Q, saltoEmendaWav=round(float(abs(y[-1] - y[0])), 5),
                                      difMediaWav=round(float(np.median(np.abs(np.diff(y)))), 5), silencio=sem, **medir(y), **a)
        for fid, (y0, f) in fr.items():
            gg = g['entardecer'] if f['contexto'] == 'entardecer' else g['dia']
            y = y0 * gg
            if f['contexto'] == 'dia' and f['variante'] == 2:
                par = fid[:-1] + '1'
                y *= rms(fr[par][0] * g['dia']) / rms(y)     # versão 2 no mesmo volume da 1
            pad = np.concatenate([np.zeros(P), y])
            arq = f'{tid}__{fid}'
            gravar(os.path.join(saida, arq + '.wav'), pad)
            nom = f['compassos'] * cps
            r['arquivos'][arq] = dict(tipo='frase', id=fid, amostrasNominais=nom, amostrasCauda=CAUDA, folgaAntes=P, silencio=silencio(y[:nom]),
                                      **medir(y), **afinacao(y, pcs))
        res[tid] = r
        print(tid, json.dumps(r['ganhos']), {k: v['rmsDb'] for k, v in r['mixes'].items()})
    json.dump(res, open(medidas, 'w'), indent=1, ensure_ascii=False)
