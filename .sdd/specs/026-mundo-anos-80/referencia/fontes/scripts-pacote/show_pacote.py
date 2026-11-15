"""O pacote do show e dos brinquedos da Vila Neon (spec 026, T18 e T19): public/sons/pacotes/vila-neon-show.mp3.
Rodar tudo de novo: ver rodar.sh. Este passo:
  python3 -I show_pacote.py <render> <show_plano.json> <trabalho> <pacote.mp3> <show.json>
<render>: os WAV do FluidSynth (renderizar.sh sobre os MIDI do show_compor.py). Escreve em <trabalho>/show/{wav,mp3,dec}
e grava o pacote e a seção "show" do índice (show.json).

Os pedaços do FluidSynth viram 22,05 kHz mono como a trilha (014/musica_processar.py): os laços (o verso das camadas e
a batida) são dobrados sobre o começo, periódicos; as frases têm P zeros antes e a cauda. Os sons que não precisam de
instrumento são síntese nossa, aqui, em numpy (nada gravado de fora):
  - fliperama_0..2: três musiquinhas de 8 bits inventadas aqui (onda de pulso, baixo de triângulo, chiado de bateria);
  - fita: o "zzzzip" da fita rebobinando (o chiado subindo e o "clac" no fim);
  - rodinhas: as rodinhas dos patins rolando nos ladrilhos (curtinho, uma remada);
  - campainha: a campainha de bicicleta da rua ("trim-trim"); orelhao: o orelhão chamando;
  - lhama: o "bé" da lhama (fonte de pulso + formantes do "é", o sintetizador de formantes da 019);
  - radio_liga, radio_desliga: o clique e o assobiozinho do rádio gigante;
  - neon: o zumbido macio do neon de noite, em laço de 4 s;
  - aplauso e uhuu: palmas de uma plateia inventada (cada palma é um estalo de ruído em banda) e o "uhuu" de vozes de
    formantes (nada de gravação de plateia de verdade).
Régua: as três camadas juntas no refrão em -23,6 dBFS (1 dB acima da mistura "dia" da trilha, que fica em -24,6), cada
camada sozinha no mesmo nível (o teclado 1,5 dB abaixo); o acorde do toque em -22 "enquanto soa" (sobe por cima do show),
o acorde final em -20,5, a contagem em -27, o aplauso em -27; os brinquedos em -23 "enquanto soa" como as vozes da 019;
a batida em -28 e o neon em -36. Pico sempre <= -1 dBFS. O volume de cada um no jogo é o do src/audio/somVila.ts.
"""
import sys, os, json, subprocess
import numpy as np
from scipy.signal import lfilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from musica_processar import ler, gravar, meia_periodica, limitar, rms, db, SR0, SR, P, Q  # noqa: E402

rend, plano_p, trab, pacote_p, saida_p = sys.argv[1:6]
plano = json.load(open(plano_p))
CPS = plano['amostrasCompasso']
CAUDA = round(0.7 * SR)
W = os.path.join(trab, 'show')
for d in ('wav', 'mp3', 'dec'):
    os.makedirs(os.path.join(W, d), exist_ok=True)
rng = np.random.default_rng(2026)


def rms_ativo(x):
    w = int(0.05 * SR)
    n = len(x) // w
    if n == 0:
        return db(rms(x))
    r = np.sqrt(np.mean(x[:n * w].reshape(n, w) ** 2, axis=1))
    r = r[r > 0.001 * np.max(np.abs(x) + 1e-12) * 10]
    return db(float(np.sqrt(np.mean(r ** 2)))) if len(r) else -99.0


def ate(x, alvo, f=rms_ativo):
    return x * 10 ** ((alvo - f(x)) / 20)


def pico_ok(x, teto=-1.0):
    pk = db(float(np.max(np.abs(x))))
    return x * 10 ** ((teto - pk) / 20) if pk > teto else x


# ------------------------------------------------------------------ os pedaços do FluidSynth
pedacos = {}
for p in plano['pedacos']:
    x, sr = ler(os.path.join(rend, p['arq'] + '.wav'))
    assert sr == SR0
    x = x.mean(axis=1)
    nom = round(p['compassos'] * CPS)
    if p['tipo'] == 'laco':
        n0 = nom * 2
        y = np.zeros(n0)
        np.add.at(y, np.arange(len(x)) % n0, x)
        y = meia_periodica(y)
        assert len(y) == nom
        pedacos[p['id']] = dict(y=limitar(y, laco=True), laco=True, nom=nom, p=p)
    else:
        cauda = round(1.6 * SR) if p['id'] == 'final' else CAUDA
        n0 = 2 * (nom + cauda) + 2 * SR0
        z = np.zeros(n0)
        z[:min(n0, len(x))] = x[:n0]
        y = meia_periodica(z)[:nom + cauda]
        fade = int(0.25 * SR)
        y[-fade:] *= 0.5 * (1 + np.cos(np.linspace(0, np.pi, fade)))
        pedacos[p['id']] = dict(y=limitar(y, laco=False), laco=False, nom=nom, cauda=cauda, p=p)

# ------------------------------------------------------------------ a régua das camadas (pela forma do show)
FORMA = [('verso', 0, 8), ('refrao', 8, 4), ('refrao', 12, 4), ('subida', 16, 4)]
NB = 20


def sequencia(camada):
    out = np.zeros(NB * CPS + SR * 2)
    for ped, c0, nb in FORMA:
        d = pedacos[f'{camada}_{ped}']
        if d['laco']:
            x = np.tile(d['y'], nb // 4)
        else:
            x = d['y']
        i = c0 * CPS
        out[i:i + len(x)] += x[:len(out) - i]
    return out[:NB * CPS]


OFFSET = {'bateria': 0.0, 'guitarra': 0.0, 'teclado': -1.5}
ganhos = {}
seqs = {}
for cam in ('bateria', 'guitarra', 'teclado'):
    s = sequencia(cam)
    ganhos[cam] = 10 ** ((-30 + OFFSET[cam] - db(rms(s))) / 20)
    seqs[cam] = s * ganhos[cam]
soma = sum(seqs.values())
refr = soma[8 * CPS:16 * CPS]
G = 10 ** ((-23.6 - db(rms(refr))) / 20)
for cam in ganhos:
    ganhos[cam] *= G
    for ped in ('verso', 'refrao', 'subida'):
        pedacos[f'{cam}_{ped}']['y'] = pedacos[f'{cam}_{ped}']['y'] * ganhos[cam]
# o teclado do verso é só o arpejo: sozinho (uma caixa acesa antes do show) ele sobe 3 dB para se ouvir
pedacos['teclado_verso']['y'] = pedacos['teclado_verso']['y'] * 10 ** (3 / 20)
mix_show = sum(sequencia(c) for c in ganhos)
medidas_show = {
    'refraoRmsDb': db(rms(mix_show[8 * CPS:16 * CPS])), 'versoRmsDb': db(rms(mix_show[:8 * CPS])), 'subidaRmsDb': db(rms(mix_show[16 * CPS:])),
    'showRmsDb': db(rms(mix_show)), 'picoDb': db(float(np.max(np.abs(mix_show)))),
    'sozinha': {c: db(rms(sequencia(c))) for c in ganhos}, 'ganhosDb': {c: db(g) for c, g in ganhos.items()},
}
pedacos['contagem']['y'] = ate(pedacos['contagem']['y'], -27)
for k in range(3):
    pedacos[f'acorde_{k}']['y'] = ate(pedacos[f'acorde_{k}']['y'], -22)
pedacos['final']['y'] = ate(pedacos['final']['y'], -20.5)
pedacos['batida']['y'] = ate(pedacos['batida']['y'], -28, f=lambda v: db(rms(v)))
for k in ('estojo', 'ladrilho', 'tum'):
    pedacos[k]['y'] = ate(pedacos[k]['y'], -23)


# ------------------------------------------------------------------ síntese nossa
def t_(seg):
    return np.arange(int(seg * SR)) / SR


def harmonicos(fase, f_max, nmax, peso):
    """Soma de harmônicos limitada: fase acumulada (rad), f_max (Hz) para não passar de 6 kHz (macio)."""
    y = np.zeros_like(fase)
    for k in range(1, nmax + 1):
        if k * f_max > 6000:
            break
        y += peso(k) * np.sin(k * fase)
    return y


def nota_pulso(f, dur, duty=0.25, vol=1.0):
    t = t_(dur)
    fase = 2 * np.pi * f * t
    y = harmonicos(fase, f, 24, lambda k: (2 / (k * np.pi)) * np.sin(k * np.pi * duty))
    env = np.minimum(1, t / 0.006) * np.exp(-t / (dur * 0.9)) * np.minimum(1, (dur - t) / 0.02)
    return y * env * vol


def nota_triangulo(f, dur, vol=1.0):
    t = t_(dur)
    fase = 2 * np.pi * f * t
    y = harmonicos(fase, f, 15, lambda k: (8 / (np.pi ** 2 * k ** 2)) * (1 if k % 2 else 0) * (-1) ** ((k - 1) // 2))
    env = np.minimum(1, t / 0.008) * np.minimum(1, (dur - t) / 0.02)
    return y * env * vol


def chiado(dur, centro, vol):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    X *= np.exp(-0.5 * ((np.log(np.maximum(f, 1)) - np.log(centro)) / 0.5) ** 2)
    y = np.fft.irfft(X, n)
    y /= np.max(np.abs(y)) + 1e-12
    t = np.arange(n) / SR
    return y * np.exp(-t / (dur * 0.3)) * vol


def midi_hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def musiquinha(mel, baixo, bpm=160, duty=0.25):
    """mel/baixo: (semicolcheia de início, nota MIDI, semicolcheias). Chiado nos tempos."""
    s16 = 60 / bpm / 4
    fim = max(a + d for a, _, d in mel + baixo)
    out = np.zeros(int((fim * s16 + 0.4) * SR))

    def pos(a, y):
        i = int(a * s16 * SR)
        out[i:i + len(y)] += y[:len(out) - i]
    for a, n, d in mel:
        pos(a, nota_pulso(midi_hz(n), d * s16 * 0.95 + (0.25 if a + d == fim else 0), duty, 0.55))
    for a, n, d in baixo:
        pos(a, nota_triangulo(midi_hz(n), d * s16 * 0.9, 0.5))
    for a in range(0, fim, 4):
        pos(a, chiado(0.05, 3000 if a % 8 else 1200, 0.12))
    return out


FLIPERAMA = [
    # 0 a navinha: sobe em arpejo, dá uma volta e pousa no dó
    ([(0, 72, 1), (1, 76, 1), (2, 79, 1), (3, 84, 2), (5, 83, 1), (6, 79, 1), (8, 81, 1), (9, 77, 1), (10, 81, 1), (11, 86, 2),
      (13, 83, 1), (14, 79, 1), (16, 84, 4)],
     [(0, 48, 4), (4, 43, 4), (8, 41, 4), (12, 43, 4), (16, 48, 4)]),
    # 1 o carrinho: pula em sol, faz a curva e chega
    ([(0, 67, 1), (1, 67, 1), (2, 71, 1), (3, 74, 1), (4, 79, 2), (6, 78, 1), (7, 76, 1), (8, 74, 2), (10, 71, 1), (11, 74, 1),
      (12, 76, 1), (13, 78, 1), (14, 79, 4)],
     [(0, 43, 4), (4, 50, 4), (8, 48, 4), (12, 50, 2), (14, 43, 4)]),
    # 2 os blocos: caem dois a dois e fecham o acorde
    ([(0, 72, 1), (1, 72, 1), (2, 67, 1), (3, 72, 1), (4, 76, 2), (6, 74, 2), (8, 72, 1), (9, 74, 1), (10, 76, 1), (11, 79, 1),
      (12, 77, 1), (13, 76, 1), (14, 74, 1), (15, 71, 1), (16, 72, 3), (16, 76, 3), (16, 79, 3)],
     [(0, 48, 4), (4, 45, 4), (8, 41, 4), (12, 43, 4), (16, 36, 3)]),
]

sint = {}
for i, (m, b) in enumerate(FLIPERAMA):
    sint[f'fliperama_{i}'] = musiquinha(m, b, duty=[0.25, 0.5, 0.125][i])

# a fita rebobinando: o assobio subindo com o tremido da fita, chiado em cima e o "clac" no fim
t = t_(1.05)
f = 260 * (1600 / 260) ** np.minimum(1, t / 0.82)
fase = 2 * np.pi * np.cumsum(f) / SR
y = (np.sin(fase) + 0.35 * np.sin(2 * fase) + 0.12 * np.sin(3 * fase)) * (0.75 + 0.25 * np.sin(2 * np.pi * 34 * t))
sopro = chiado(1.05, 2500, 1.0) / np.maximum(np.exp(-t / (1.05 * 0.3)), 0.05)
y = y * 0.5 + 0.12 * sopro / (np.max(np.abs(sopro)) + 1e-12)
env = np.minimum(1, t / 0.04) * np.where(t < 0.84, 1, np.maximum(0, 1 - (t - 0.84) / 0.06))
y *= env
clac = chiado(0.04, 1500, 1.0) * 0.9
i = int(0.86 * SR)
y[i:i + len(clac)] += clac[:len(y) - i]
sint['fita'] = y

# as rodinhas: rolar grave nos ladrilhos (ruído abaixo de 700 Hz, pulsando nas emendas) e um zumbidinho
t = t_(0.5)
n = len(t)
X = np.fft.rfft(rng.standard_normal(n))
fq = np.fft.rfftfreq(n, 1 / SR)
X *= 1 / (1 + (fq / 650) ** 4) * (fq > 60)
ru = np.fft.irfft(X, n)
ru /= np.max(np.abs(ru)) + 1e-12
y = ru * (0.6 + 0.4 * np.sin(2 * np.pi * 22 * t)) + 0.25 * np.sin(2 * np.pi * 170 * t)
sint['rodinhas'] = y * np.minimum(1, t / 0.04) * np.minimum(1, (0.5 - t) / 0.2)


def sino(f0, parciais, dur, golpes):
    t = t_(dur)
    y = np.zeros_like(t)
    for g0, vol in golpes:
        tt = np.maximum(0, t - g0)
        on = t >= g0
        for r, a, tau in parciais:
            y += on * vol * a * np.sin(2 * np.pi * f0 * r * tt) * np.exp(-tt / tau) * np.minimum(1, tt / 0.002)
    return y


# campainha de bicicleta: dois toques ("trim-trim"), o primeiro com o tremidinho da alavanca
c = sino(1900, [(1, 1, 0.45), (1.47, 0.5, 0.3), (2.76, 0.25, 0.15)], 1.0, [(0, 1), (0.05, 0.6), (0.1, 0.5), (0.24, 0.9)])
sint['campainha'] = c * 0.5
# o orelhão chamando: duas tocadas de campainha elétrica (o martelinho batendo a 20 vezes por segundo)
t = t_(1.3)
toca = (t < 0.42) | ((t > 0.68) & (t < 1.1))
batidas = np.zeros(len(t))
for k in range(int(1.3 * 40)):
    i = int(k / 40 * SR)
    if toca[i]:
        batidas[i] = 1.0 if k % 2 == 0 else 0.8
y = np.convolve(batidas, sino(1150, [(1, 1, 0.03), (2.1, 0.35, 0.02)], 0.12, [(0, 1)]))[:len(t)]
sint['orelhao'] = y * np.minimum(1, (1.3 - t) / 0.1)


def formantes(fonte, fs, bs, ganhos_f):
    y = np.zeros_like(fonte)
    for F, B, g in zip(fs, bs, ganhos_f):
        r = np.exp(-np.pi * B / SR)
        th = 2 * np.pi * F / SR
        y += g * lfilter([1 - r], [1, -2 * r * np.cos(th), r * r], fonte)
    return y


def voz(f0, dur, fs, bs, gs, vib=(0, 0), sopro=0.05):
    t = t_(dur)
    f = f0(t) * (1 + vib[1] * np.sin(2 * np.pi * vib[0] * t))
    fase = 2 * np.pi * np.cumsum(f) / SR
    fonte = harmonicos(fase, float(np.max(f)), 30, lambda k: 1 / k ** 1.1) + sopro * rng.standard_normal(len(t))
    y = formantes(fonte, fs, bs, gs)
    return y / (np.max(np.abs(y)) + 1e-12)


# a lhama: "bé-é", cantado e manso (vibrato de 8 Hz, como o da voz sintetizada do tema)
E_ = ([600, 1800, 2600], [90, 120, 160], [1, 0.6, 0.25])
b1 = voz(lambda t: 380 - 50 * t / 0.4, 0.4, *E_, vib=(8, 0.03))
b2 = voz(lambda t: 340 - 40 * t / 0.45, 0.45, *E_, vib=(8, 0.035))
y = np.zeros(int(0.95 * SR))
for x, ini, vol in ((b1, 0.0, 1.0), (b2, 0.46, 0.7)):
    tt = np.arange(len(x)) / SR
    x = x * np.minimum(1, tt / 0.04) * np.minimum(1, (tt[-1] - tt) / 0.12) * vol
    i = int(ini * SR)
    y[i:i + len(x)] += x[:len(y) - i]
sint['lhama'] = y

# o rádio: o clique do botão e o assobiozinho da sintonia (subindo ao ligar, descendo ao desligar)
for nome, (f1, f2, dur) in (('radio_liga', (600, 950, 0.18)), ('radio_desliga', (760, 420, 0.12))):
    t = t_(dur + 0.08)
    clique = chiado(0.012, 2200, 0.9)
    f = np.where(t < 0.03, f1, f1 + (f2 - f1) * np.minimum(1, (t - 0.03) / dur))
    fase = 2 * np.pi * np.cumsum(f) / SR
    y = 0.35 * np.sin(fase) * (t > 0.03) * np.minimum(1, (t - 0.03) / 0.02) * np.maximum(0, 1 - (t - 0.03) / (dur + 0.05))
    y[:len(clique)] += clique
    sint[nome] = y

# o neon: zumbido macio de 120 Hz, em laço de 4 s (480 ciclos: emenda perfeita), respirando devagar
t = np.arange(4 * SR) / SR
y = sum((1 / k ** 1.6) * np.sin(2 * np.pi * 120 * k * t + k) for k in range(1, 7))
y *= 0.8 + 0.2 * np.sin(2 * np.pi * 0.5 * t)
sint['neon'] = y

# o "uhuu" de uma plateia inventada: quatro vozes de formantes do "u", subindo e caindo
U_ = ([420, 980, 2700], [80, 110, 180], [1, 0.45, 0.12])


def uhuu(seed_f, dur=1.0):
    def f0(t):
        return seed_f * np.where(t < 0.12, 0.9, 1 + 0.45 * np.minimum(1, (t - 0.12) / 0.2) - 0.25 * np.maximum(0, (t - 0.55) / 0.45))
    x = voz(f0, dur, *U_, vib=(5.5, 0.012), sopro=0.12)
    tt = np.arange(len(x)) / SR
    gap = np.where((tt > 0.1) & (tt < 0.15), 0.35, 1.0)
    return x * np.minimum(1, tt / 0.03) * np.minimum(1, (dur - tt) / 0.3) * gap


u = np.zeros(int(1.4 * SR))
for f0, ini, vol in ((330, 0, 1), (370, 0.07, 0.8), (300, 0.14, 0.8), (410, 0.2, 0.6)):
    x = uhuu(f0) * vol
    i = int(ini * SR)
    u[i:i + len(x)] += x[:len(u) - i]
sint['uhuu'] = u

# o aplauso: 16 pessoas batendo palmas (cada uma no seu ritmo e no seu timbre), subindo, segurando e indo embora
dur = 4.6
n = int(dur * SR)
ap = np.zeros(n)
for k in range(16):
    taxa = rng.uniform(3.3, 4.6)
    tk = rng.uniform(0, 0.25)
    centro = rng.uniform(900, 2100)
    kern = chiado(0.03, centro, 1.0)
    kern *= np.exp(-np.arange(len(kern)) / SR / 0.006)
    fim_k = rng.uniform(2.6, 4.2)
    while tk < fim_k:
        i = int(tk * SR)
        v = rng.uniform(0.6, 1.0)
        ap[i:i + len(kern)] += v * kern[:n - i]
        tk += 1 / taxa + rng.normal(0, 0.012)
t = np.arange(n) / SR
ap *= np.minimum(1, t / 0.25) * np.clip((4.4 - t) / 1.8, 0, 1)
X = np.fft.rfft(ap)
fq = np.fft.rfftfreq(n, 1 / SR)
ap = np.fft.irfft(X / (1 + (fq / 5500) ** 4), n)
ap = ap / (np.max(np.abs(ap)) + 1e-12)
ap_u = ap.copy()
uu = u / (np.max(np.abs(u)) + 1e-12) * 0.9
i = int(0.15 * SR)
ap_u[i:i + len(uu)] += uu[:n - i]
sint['aplauso'] = ap_u

ALVO_SINT = {'neon': ('rms', -36), 'aplauso': ('ativo', -27), 'uhuu': ('ativo', -26)}
for k, x in sint.items():
    modo, alvo = ALVO_SINT.get(k, ('ativo', -23))
    x = ate(x, alvo, f=(lambda v: db(rms(v))) if modo == 'rms' else rms_ativo)
    pedacos[k] = dict(y=x, laco=(k == 'neon'), nom=len(x), sint=True)

# ------------------------------------------------------------------ WAV com folga, MP3, decodifica, mede, emenda
ORDEM = ([f'{c}_{p}' for c in ('bateria', 'guitarra', 'teclado') for p in ('verso', 'refrao', 'subida')] +
         ['contagem', 'acorde_0', 'acorde_1', 'acorde_2', 'final', 'aplauso', 'uhuu', 'batida', 'estojo', 'ladrilho', 'tum',
          'fliperama_0', 'fliperama_1', 'fliperama_2', 'fita', 'rodinhas', 'campainha', 'orelhao', 'lhama', 'radio_liga',
          'radio_desliga', 'neon'])
assert set(ORDEM) == set(pedacos), set(pedacos) ^ set(ORDEM)


def dec(p_):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', p_, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, np.float32).astype(np.float64)


buf = bytearray()
clips, medidas = {}, {}
tot = 0
for cid in ORDEM:
    d = pedacos[cid]
    y = pico_ok(d['y'])
    if d['laco']:
        L = len(y)
        pad = np.concatenate([np.tile(y, 2)[-P:], y, np.tile(y, 2)[:Q]])
    else:
        pad = np.concatenate([np.zeros(P), y])
    w = os.path.join(W, 'wav', cid + '.wav')
    gravar(w, pad)
    m = os.path.join(W, 'mp3', cid + '.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', w, '-af', 'volume=0.44dB', '-c:a', 'libmp3lame', '-b:a', '64k', '-ar', str(SR), '-ac', '1',
                    '-map_metadata', '-1', '-id3v2_version', '0', m], check=True)
    z = dec(m)
    nn = min(len(pad), len(z), SR * 3)
    best, lag = -1, 0
    for k in range(-600, 601):
        cc = np.dot(pad[P:nn - 700], z[P + k:nn - 700 + k])
        if cc > best:
            best, lag = cc, k
    # som periódico (o zumbido do neon): a correlação empata em vários atrasos; fica o zero se ele empata
    if np.dot(pad[P:nn - 700], z[P:nn - 700]) >= 0.999 * best:
        lag = 0
    b = open(m, 'rb').read()
    assert b[0] == 0xFF and (b[1] & 0xE0) == 0xE0, cid
    o = [len(buf), len(b)]
    buf += b
    tot += len(z)
    corpo = z[P + lag:P + lag + len(y)]
    c = {'o': o, 'n': int(len(y)), 'arquivo': int(len(z)), 'kb': round(len(b) / 1024, 1)}
    if d['laco']:
        c['laco'] = int(len(y))
    medidas[cid] = dict(segundos=round(len(y) / SR, 3), rmsDb=db(rms(corpo)), ativoDb=rms_ativo(corpo), picoDb=db(float(np.max(np.abs(z)))),
                        cortes=int(np.sum(np.abs(z) >= 0.999)), desvioCodificador=int(lag), kb=c['kb'])
    if d['laco']:
        medidas[cid]['emendaSaltoDb'] = db(abs(float(z[P + lag + len(y) - 1] - z[P + lag])))
    clips[cid] = c
open(pacote_p, 'wb').write(buf)
seg = tot / SR
show = {
    'pacote': os.path.basename(pacote_p), 'taxa': SR, 'folga': P, 'amostrasCompasso': CPS, 'tempo': plano['q'],
    'compassos': NB, 'forma': [dict(pedaco=p_, compassoInicio=c0, compassos=nb) for p_, c0, nb in FORMA],
    'camadas': ['bateria', 'guitarra', 'teclado'],
    'acordes': ['acorde_0', 'acorde_1', 'acorde_2', 'acorde_0'],
    'fliperama': ['fliperama_0', 'fliperama_1', 'fliperama_2'],
    'clips': clips,
    'totalKB': round(len(buf) / 1024, 1), 'segundosDecodificados': round(seg, 1), 'memoriaMB22k': round(tot * 4 / 1048576, 2),
    'carater': 'rock de brinquedo dos anos 80 em Mi (mais metal que pop): o riff galopando, o refrão com o sintetizador e o glockenspiel dobrados pela guitarra com distorção, bumbo duplo macio, a subida e o acorde final com a caixinha de música',
    'regua': {'refraoRmsDb': medidas_show['refraoRmsDb'], 'acorde': -22, 'final': -20.5, 'contagem': -27, 'aplauso': -27, 'brinquedos': -23, 'batida': -28, 'neon': -36},
}
json.dump(dict(show=show, medidas=medidas, mixShow=medidas_show), open(saida_p, 'w'), ensure_ascii=False, indent=1)
print(f"show: {len(buf) / 1024:.1f} KB, {seg:.1f} s ({show['memoriaMB22k']} MB a 22 kHz); refrão {medidas_show['refraoRmsDb']} verso "
      f"{medidas_show['versoRmsDb']} subida {medidas_show['subidaRmsDb']} pico {medidas_show['picoDb']}; sozinhas {medidas_show['sozinha']}; "
      f"desvios {sorted({v['desvioCodificador'] for v in medidas.values()})}; pico máx {max(v['picoDb'] for v in medidas.values())}")
