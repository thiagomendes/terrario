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

O show de verdade (16 nov 2026, uns 6 min): tudo o que vem acima fica igual (o pacote antigo sai byte a byte, os pedaços
novos entram depois dele no MP3). Os pedaços novos chegam em trilhas (show_compor.py) e são juntados na régua das camadas
da m1 (cada trilha no mesmo RMS "ativo", o teclado 1,5 dB abaixo, a cama de cordas 7 dB abaixo, o solo 4 dB acima) e
postos em LUFS (BS.1770, a conta de amostras.py; o ebur128 do ffmpeg confere em show_previa.py) contra o refrão da m1 com
as três camadas juntas, medidos como o jogo toca a parte (o laço repetido, a frase de novo a cada "c" compassos): refrões
e fins no nível do refrão da m1, solos 0,5 LU abaixo, versos e introduções 1,5 abaixo, a ponte 2,5 e o chamado 2,5. As
contagens e os acordes do toque no volume percebido dos da m1, o acorde final m3_final 2 dB abaixo do "final" (o jogo soma
REFORCO_FINAL_DB e o aplauso por cima). Síntese nossa (gerador próprio, o sorteio dos sons antigos não muda): na abertura,
o drone de Mi abrindo o filtro, o "oooh" da plateia no escuro, o "fffuu" das varreduras (2,5 e 6,5 s), o "zzt" do raio
(10,0, 10,3, 10,45, 11,0 s), o zumbido do neon e a subida até o estouro (18 s, no nível do refrão da m1); na entrada, a
plateia vibrando (some antes da contagem da m1); a torcida (8 s em laço, no volume do aplauso) e os fogos de estrelinhas
(o "fiuuu", um "pof" abafado e o crepitar, 3 LU abaixo do aplauso). No índice: "c" (compassos) em cada pedaço de música,
"laco" nos laços, a "setlist" das três músicas e abertura, entrada, torcida e fogos.
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
trilhas = {}   # as trilhas dos pedaços novos (show_compor.py: show_novos), juntadas mais abaixo
for p in plano['pedacos']:
    x, sr = ler(os.path.join(rend, p['arq'] + '.wav'))
    assert sr == SR0
    x = x.mean(axis=1)
    nom = round(p['compassos'] * p.get('amostrasCompasso', CPS))
    parcial = p.get('parcial', False)
    if p['tipo'] == 'laco':
        n0 = nom * 2
        y = np.zeros(n0)
        np.add.at(y, np.arange(len(x)) % n0, x)
        y = meia_periodica(y)
        assert len(y) == nom
        if parcial:
            trilhas[p['id']] = dict(y=y, laco=True, nom=nom, p=p)
        else:
            pedacos[p['id']] = dict(y=limitar(y, laco=True), laco=True, nom=nom, p=p)
    else:
        cauda = round(1.6 * SR) if p['id'] == 'final' else (round(p['caudaS'] * SR) if 'caudaS' in p else CAUDA)
        n0 = 2 * (nom + cauda) + 2 * SR0
        z = np.zeros(n0)
        z[:min(n0, len(x))] = x[:n0]
        y = meia_periodica(z)[:nom + cauda]
        fade = int(0.25 * SR)
        y[-fade:] *= 0.5 * (1 + np.cos(np.linspace(0, np.pi, fade)))
        if parcial:
            trilhas[p['id']] = dict(y=y, laco=False, nom=nom, cauda=cauda, p=p)
        else:
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


# ================================================================== o show de verdade (16 nov 2026): os pedaços novos
# Tudo o que está acima fica como era (o pacote antigo sai igual, byte a byte). Daqui para baixo: as trilhas novas
# juntadas, a régua em LUFS (BS.1770, como amostras.py e o ebur128) contra o refrão da m1 com as três camadas, e a
# síntese nossa da abertura, da entrada, da torcida e dos fogos (gerador próprio: o sorteio do pacote antigo não muda).
rng2 = np.random.default_rng(20261116)


def lufs(x):
    """LUFS integrado (BS.1770-4) mono a 22 050 Hz: filtro K e as portas -70 e -10 (a mesma conta de amostras.py)."""
    G, Qs, fc = 3.99984385397, 0.7071752369554193, 1681.9744509555319
    A = 10 ** (G / 40)
    w0 = 2 * np.pi * fc / SR
    al = np.sin(w0) / (2 * Qs)
    c = np.cos(w0)
    b = [A * ((A + 1) + (A - 1) * c + 2 * np.sqrt(A) * al), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - 2 * np.sqrt(A) * al)]
    a = [(A + 1) - (A - 1) * c + 2 * np.sqrt(A) * al, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - 2 * np.sqrt(A) * al]
    y = lfilter(b, a, x)
    fh, Qh = 38.13547087613982, 0.5003270373253953
    w0 = 2 * np.pi * fh / SR
    al = np.sin(w0) / (2 * Qh)
    c = np.cos(w0)
    y = lfilter([(1 + c) / 2, -(1 + c), (1 + c) / 2], [1 + al, -2 * c, 1 - al], y)
    blk, passo = int(0.4 * SR), int(0.1 * SR)
    z = np.array([np.mean(y[i:i + blk] ** 2) for i in range(0, max(1, len(y) - blk), passo)])
    lz = -0.691 + 10 * np.log10(z + 1e-20)
    z1 = z[lz > -70]
    if not len(z1):
        return -99.0
    rel = -0.691 + 10 * np.log10(np.mean(z1)) - 10
    z2 = z1[(-0.691 + 10 * np.log10(z1)) > rel]
    return round(float(-0.691 + 10 * np.log10(np.mean(z2))), 2)


def janela(x, t0, t1):
    return x[int(t0 * SR):int(t1 * SR)]


def ganho_lufs(x, medido, alvo):
    return x * 10 ** ((alvo - medido) / 20)


def teto(x, laco, db_teto=-1.5):
    """o limitador do pacote (musica_processar.limitar) com teto absoluto: só pega o pico que passaria de db_teto."""
    return limitar(x, laco=laco, folga=db_teto - db(rms(x)))


REF = lufs(mix_show[8 * CPS:16 * CPS])            # o refrão da m1, as três camadas juntas: a régua das músicas novas
REF_VERSO = lufs(mix_show[:8 * CPS])
novos = {d['id']: d for d in plano['novos']}

# ---- juntar as trilhas: bateria, guitarra (com o baixo) e teclado no mesmo nível, o teclado 1,5 dB abaixo (a régua das
# camadas da m1); a cama de cordas 7 dB abaixo; o solo 4 dB por cima, e nos solos a guitarra base e o teclado mais atrás
NIVEL_TRILHA = {'bateria': 0.0, 'guitarra': 0.0, 'teclado': -1.5, 'solo': 4.0, 'cama': -7.0}
AJUSTE_TRILHA = {('m1_solo', 'teclado'): -4.0, ('m1_solo', 'guitarra'): -2.0, ('m3_solo', 'guitarra'): -2.0,
                 ('m3_chamado', 'bateria'): -2.0, ('m3_final', 'teclado'): 1.0, ('m2_ponte', 'teclado'): 1.0,
                 ('m2_ponte', 'cama'): 2.0}


def juntar(cid):
    d = novos[cid]
    nomn = round(d['compassos'] * d['amostrasCompasso'])
    ys = {tr: trilhas[f'{cid}__{tr}']['y'] for tr in d['trilhas']}
    if len(ys) == 1:
        return next(iter(ys.values())), {}
    out, g = 0, {}
    for tr, y in ys.items():
        alvo = -30 + NIVEL_TRILHA.get(tr, 0.0) + AJUSTE_TRILHA.get((cid, tr), 0.0)
        g[tr] = 10 ** ((alvo - rms_ativo(y[:nomn])) / 20)
        out = out + y * g[tr]
    return out, {tr: db(v) for tr, v in g.items()}


def na_parte(y, laco, cps, c, npar):
    """o que o jogo toca numa parte de npar compassos: o laço repetido, ou a frase de novo a cada c compassos (a cauda soa por
    cima da próxima vez)."""
    if laco:
        return np.tile(y, npar // c)
    out = np.zeros(npar * cps + len(y))
    for k in range(max(1, npar // c)):
        out[k * c * cps:k * c * cps + len(y)] += y
    return out[:npar * cps]


# a régua das partes: LU em relação ao refrão da m1 (REF), medido como o jogo toca a parte (tamanho dela no SETLIST)
ALVO_PARTE = {
    'm1_solo': (8, -0.5), 'm1_fim': (None, 0.0),
    'm2_intro': (2, -1.5), 'm2_verso': (8, -1.5), 'm2_refrao': (8, 0.0), 'm2_ponte': (8, -2.5), 'm2_fim': (None, 0.0),
    'm3_intro': (2, -1.5), 'm3_verso': (8, -1.5), 'm3_refrao': (8, 0.0), 'm3_solo': (4, -0.5), 'm3_chamado': (2, -2.5),
}
medidas_novas = {'refM1': REF, 'versoM1': REF_VERSO, 'partes': {}, 'trilhasDb': {}}
for cid, (npar, lu) in ALVO_PARTE.items():
    d = novos[cid]
    laco = d['tipo'] == 'laco'
    y, gtr = juntar(cid)
    y = limitar(y, laco=laco)
    cps, c = d['amostrasCompasso'], round(d['compassos'])
    if npar is None:
        med = lufs(y[:c * cps + SR])     # o fim: os dois compassos e o primeiro segundo do acorde segurado
    else:
        med = lufs(na_parte(y, laco, cps, c, npar))
    y = teto(ganho_lufs(y, med, REF + lu), laco)
    final_med = lufs(y[:c * cps + SR]) if npar is None else lufs(na_parte(y, laco, cps, c, npar))
    medidas_novas['partes'][cid] = dict(alvoLU=lu, lufs=final_med, relRefLU=round(final_med - REF, 2))
    medidas_novas['trilhasDb'][cid] = gtr
    pedacos[cid] = dict(y=y, laco=laco, nom=len(y), novo=True)

# a contagem, os acordes do toque e o acorde final das músicas novas: no volume percebido dos da m1
L_CONTAGEM, L_ACORDE, L_FINAL = lufs(pedacos['contagem']['y']), lufs(pedacos['acorde_0']['y']), lufs(pedacos['final']['y'])
# o acorde final do show fica 2 dB abaixo do da m1: o jogo já soma REFORCO_FINAL_DB e o aplauso por cima
for cid, alvo in ([('m2_contagem', L_CONTAGEM), ('m3_contagem', L_CONTAGEM), ('m3_final', L_FINAL - 2.0)] +
                  [(f'{m}_acorde_{k}', lufs(pedacos[f'acorde_{k}']['y'])) for m in ('m2', 'm3') for k in range(3)]):
    y, gtr = juntar(cid)
    y = limitar(y, laco=False)
    y = teto(ganho_lufs(y, lufs(y), alvo), False)
    medidas_novas['partes'][cid] = dict(lufs=lufs(y), alvo=alvo)
    if gtr:
        medidas_novas['trilhasDb'][cid] = gtr
    pedacos[cid] = dict(y=y, laco=False, nom=len(y), novo=True)


# ---- síntese nossa: ferramentas
def banda_movel(x, centro, largura_oit, ganho_t=None):
    """filtra x com uma banda (gaussiana em oitavas) cujo centro anda no tempo: centro(t) em Hz; STFT de 1024."""
    from scipy.signal import stft, istft
    f, tt, Z = stft(x, fs=SR, nperseg=1024, noverlap=768)
    fc = np.maximum(centro(tt), 30.0)
    H = np.exp(-0.5 * (np.log2(np.maximum(f, 1.0)[:, None] / fc[None, :]) / largura_oit) ** 2)
    if ganho_t is not None:
        H = H * ganho_t(tt)[None, :]
    _, y = istft(Z * H, fs=SR, nperseg=1024, noverlap=768)
    out = np.zeros(len(x))
    out[:min(len(x), len(y))] = y[:len(x)]
    return out


def passa_baixa(x, fc, laco=False):
    n = len(x)
    X = np.fft.rfft(x)
    fq = np.fft.rfftfreq(n, 1 / SR)
    return np.fft.irfft(X / np.sqrt(1 + (fq / fc) ** 4), n)


def norm(x):
    return x / (np.max(np.abs(x)) + 1e-12)


def ruido_colorido(n, centro, largura_oit, periodico=True):
    """ruído com espectro em banda (gaussiana em oitavas); feito pela FFT, já é periódico em n (laço sem emenda)."""
    X = np.fft.rfft(rng2.standard_normal(n))
    fq = np.fft.rfftfreq(n, 1 / SR)
    X *= np.exp(-0.5 * (np.log2(np.maximum(fq, 1) / centro) / largura_oit) ** 2)
    return norm(np.fft.irfft(X, n))


VOGAIS = {'a': ([800, 1250, 2600], [110, 130, 180], [1, 0.7, 0.25]), 'e': ([520, 1850, 2600], [90, 130, 180], [1, 0.55, 0.3]),
          'o': ([520, 880, 2500], [90, 110, 170], [1, 0.5, 0.15]), 'u': ([420, 980, 2700], [80, 110, 180], [1, 0.45, 0.12]),
          'i': ([330, 2300, 3000], [70, 140, 200], [1, 0.35, 0.3])}


def voz2(f0, dur, v0, v1, vib=(5.5, 0.012), sopro=0.12, troca=None, escala=1.0, tremido=0.0):
    """uma voz da plateia (sem palavra): fonte de pulso + formantes, passando da vogal v0 para a v1. escala: o tamanho
    da voz (criança ~1,2: formantes mais altos); tremido: a afinação passeando devagar, como voz de gente."""
    t = t_(dur)
    f = f0(t) * (1 + vib[1] * np.sin(2 * np.pi * vib[0] * t + rng2.uniform(0, 6.28)))
    if tremido:
        passeio = np.cumsum(rng2.standard_normal(len(t) // 200 + 2))
        passeio = np.interp(np.arange(len(t)) / 200, np.arange(len(passeio)), passeio - passeio.mean())
        f = f * (1 + tremido * passeio / (np.max(np.abs(passeio)) + 1e-9))
    fase = 2 * np.pi * np.cumsum(f) / SR
    fonte = harmonicos(fase, float(np.max(f)), 30, lambda k: 1 / k ** 1.15) + sopro * rng2.standard_normal(len(t))
    def vg(v):
        fs, bs, gs = VOGAIS[v]
        return [x * escala for x in fs], [x * escala for x in bs], gs
    a = formantes(fonte, *vg(v0))
    b = formantes(fonte, *vg(v1)) if v1 != v0 else a
    m = troca(t) if troca is not None else np.clip((t - 0.15 * dur) / (0.5 * dur), 0, 1)
    return norm((1 - m) * a + m * b)


def por_em(out, x, t0, ganho=1.0, laco=False):
    i = int(round(t0 * SR))
    if laco:
        np.add.at(out, (np.arange(len(x)) + i) % len(out), ganho * x)
    else:
        i0 = max(0, i)
        x = x[i0 - i:]
        out[i0:i0 + len(x)] += ganho * x[:max(0, len(out) - i0)]


def palma():
    k = chiado(0.03, rng2.uniform(900, 2100), 1.0)
    return k * np.exp(-np.arange(len(k)) / SR / 0.006)


def plateia(dur, laco, dens_vozes=11.0, dens_uhuu=1.0, n_palmas=22, assobios=3, pesos=(0.7, 1.0, 0.55, 0.14)):
    """Uma plateia feliz inventada: o "rumor" (ruído em banda, respirando), vozes gritando "aaah", "êêê", "uuu" (crianças e
    adultos, sem palavra), "uhuu" subindo, palmas de muita gente e uns assobios compridos (nada do "fiu-fiu"). Em laço:
    tudo cai numa volta só (o que passa do fim continua no começo) e o rumor é periódico: a emenda não aparece."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    # o rumor: duas bandas (o grave da multidão e o brilho das vozes), respirando em ciclos inteiros da volta
    rum = 0.75 * ruido_colorido(n, 650, 0.9) + 0.35 * ruido_colorido(n, 1700, 0.7)
    resp = 1 + 0.12 * np.sin(2 * np.pi * 2 * t / dur) + 0.08 * np.sin(2 * np.pi * 5 * t / dur + 1.3)
    rum = norm(rum * resp)
    vozes = np.zeros(n)
    # muita gente (umas 11 vozes começando por segundo), cada uma do seu jeito: o grito que sobe e cai, o "aaaah" reto,
    # o "êêê!" subindo, o "ôôô" descendo; poucas perto (mais fortes), a maioria longe (baixinho)
    formas = [lambda u: 0.9 + 0.22 * np.minimum(1, u / 0.3) - 0.3 * np.maximum(0, (u - 0.55) / 0.45),
              lambda u: 1.0 - 0.06 * u,
              lambda u: 0.88 + 0.3 * u ** 0.7,
              lambda u: 1.08 - 0.25 * u ** 1.3]
    for _ in range(int(dens_vozes * dur)):
        crianca = rng2.random() < 0.6
        fb = rng2.uniform(260, 460) if crianca else rng2.uniform(140, 270)
        d = rng2.uniform(0.5, 2.2)
        v0, v1 = [('a', 'a'), ('e', 'e'), ('a', 'e'), ('o', 'a'), ('e', 'i'), ('a', 'o'), ('u', 'a'), ('o', 'o')][rng2.integers(8)]
        forma = formas[rng2.integers(len(formas))]
        def f0(tt, fb=fb, d=d, forma=forma):
            return fb * forma(tt / d)
        x = voz2(f0, d, v0, v1, vib=(rng2.uniform(4.5, 6.5), rng2.uniform(0.005, 0.02)), sopro=rng2.uniform(0.2, 0.45),
                 escala=rng2.uniform(1.12, 1.28) if crianca else rng2.uniform(0.95, 1.05), tremido=0.025)
        tt = np.arange(len(x)) / SR
        x *= np.minimum(1, tt / rng2.uniform(0.03, 0.15)) * np.minimum(1, (d - tt) / (0.35 * d)) * min(1.0, rng2.exponential(0.3) + 0.08)
        por_em(vozes, x, rng2.uniform(0, dur if laco else dur - 0.5), laco=laco)
    for _ in range(int(dens_uhuu * dur)):
        fb = rng2.uniform(300, 440)
        d = rng2.uniform(0.8, 1.2)
        def f0(tt, fb=fb, d=d):
            return fb * np.where(tt < 0.12, 0.9, 1 + 0.45 * np.minimum(1, (tt - 0.12) / 0.2) - 0.25 * np.maximum(0, (tt - 0.55 * d) / (0.45 * d)))
        x = voz2(f0, d, 'u', 'u', vib=(5.5, 0.012), sopro=0.14)
        tt = np.arange(len(x)) / SR
        x *= np.minimum(1, tt / 0.03) * np.minimum(1, (d - tt) / 0.3) * np.where((tt > 0.1) & (tt < 0.15), 0.35, 1.0) * rng2.uniform(0.5, 1.0)
        por_em(vozes, x, rng2.uniform(0, dur if laco else dur - 1.0), laco=laco)
    palmas = np.zeros(n)
    for _ in range(n_palmas):
        taxa = rng2.uniform(3.4, 4.6)
        if laco:
            taxa = max(1, round(taxa * dur)) / dur
        k = palma()
        tk = rng2.uniform(0, 1 / taxa)
        while tk < dur:
            por_em(palmas, k * rng2.uniform(0.6, 1.0), tk + rng2.normal(0, 0.01), laco=laco)
            tk += 1 / taxa
    ass = np.zeros(n)
    for _ in range(assobios):
        d = rng2.uniform(0.5, 0.9)
        tt = t_(d)
        f1 = rng2.uniform(1900, 2300)
        f = f1 * (1 + 0.18 * np.minimum(1, tt / (0.3 * d))) * (1 + 0.01 * np.sin(2 * np.pi * 6 * tt))
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.08 * np.sin(4 * np.pi * np.cumsum(f) / SR)
        x *= np.minimum(1, tt / 0.05) * np.minimum(1, (d - tt) / 0.15)
        por_em(ass, x, rng2.uniform(0, dur if laco else dur - 1.0), laco=laco)
    partes = [rum, vozes, palmas, ass]
    out = sum(p_ * w / (rms(p_) + 1e-12) for p_, w in zip(partes, pesos))
    return passa_baixa(out, 7000)


def soma_em(n, *itens):
    out = np.zeros(n)
    for x, t0 in itens:
        por_em(out, x, t0)
    return out


def nivelar(x, t0, t1, alvo):
    """põe x no nível alvo (LUFS) medido na janela t0..t1 (s)."""
    return ganho_lufs(x, lufs(janela(x, t0, t1)), alvo)


def tr_(cid, nome):
    return trilhas[f'{cid}__{nome}']['y']


# ---- a abertura (0 a 18 s e a cauda do estouro): os instrumentos das trilhas e a síntese, no volume de cada momento
NA = len(tr_('abertura', 'boom'))
ta = np.arange(NA) / SR
# o drone: Mi grave (Mi1, Mi2 e Si2, três osciladores levemente desafinados), o filtro abrindo devagar até o estouro
corte = np.interp(ta, [0, 2.5, 10, 14, 18], [150, 210, 420, 900, 2000])
drone = np.zeros(NA)
for f0, a0 in ((41.2, 1.0), (82.41, 0.8), (123.47, 0.45)):
    for det in (-0.0012, 0.0, 0.0013):
        f = f0 * (1 + det)
        ph = rng2.uniform(0, 6.28)
        for k in range(1, int(6000 / f) + 1):
            if a0 / k / np.sqrt(1 + (k * f / 2000) ** 4) < 4e-4:
                break
            drone += (a0 / k) / np.sqrt(1 + (k * f / corte) ** 4) * np.sin(2 * np.pi * k * f * ta + k * ph)
drone *= np.interp(ta, [0, 2.5, 9.5, 11, 14, 17.95, 18.1, 18.6], [0, 0.6, 0.75, 1.3, 1.5, 1.7, 0.7, 0]) ** 1.2
# o "oooh" da plateia esperando no escuro: 14 vozes baixinhas, de "u" para "o", subindo um tiquinho
oooh = np.zeros(NA)
for _ in range(14):
    fb = rng2.uniform(170, 340)
    d = rng2.uniform(2.6, 3.4)
    x = voz2(lambda tt, fb=fb, d=d: fb * (1 + 0.08 * tt / d), d, 'u', 'o', vib=(5, 0.01), sopro=0.3)
    tt = np.arange(len(x)) / SR
    x *= np.minimum(1, tt / 0.6) * np.minimum(1, (d - tt) / 0.9) * rng2.uniform(0.5, 1.0)
    por_em(oooh, x, rng2.uniform(0.1, 0.6))
oooh += 0.25 * norm(ruido_colorido(NA, 600, 0.8)) * np.interp(ta, [0, 0.5, 3.0, 4.2], [0, 1, 1, 0]) * rms(oooh) / 0.05
# o "fffuu" das varreduras: a cada 2 compassos desde o fim do escuro (2,5 e 6,5 s), o ruído numa banda que sobe e desce
whoosh = np.zeros(NA)
for t0 in (2.5, 6.5):
    d = 3.0
    x = rng2.standard_normal(int(d * SR))
    x = banda_movel(x, lambda tt: 350 * (2600 / 350) ** np.sin(np.pi * np.clip(tt / d, 0, 1)), 0.55,
                    lambda tt: np.sin(np.pi * np.clip(tt / d, 0, 1)) ** 2)
    por_em(whoosh, x, t0)
# o raio acendendo: "zzt" macio em 10,0, 10,3, 10,45 e 11,0 s (zumbido elétrico com chiado, cortado em pedacinhos)
zzt = np.zeros(NA)
for t0, d in ((10.0, 0.09), (10.3, 0.06), (10.45, 0.11), (11.0, 0.16)):
    tt = t_(d)
    fase = 2 * np.pi * 100 * tt
    x = sum((1 / k) * np.sin(k * fase + rng2.uniform(0, 6.28)) for k in range(1, 40))
    x = x * (0.55 + 0.45 * np.sign(np.sin(2 * np.pi * rng2.uniform(28, 44) * tt))) + 0.6 * rng2.standard_normal(len(tt))
    x = banda_movel(np.concatenate([x, np.zeros(1024)]), lambda q: 1800 + 0 * q, 1.1)[:len(tt)]
    x *= np.minimum(1, tt / 0.003) * np.minimum(1, (d - tt) / 0.02)
    por_em(zzt, norm(x), t0)
# o zumbido do neon aceso (como o do bairro, mais macio) de 11 s até o estouro
zumbido = sum((1 / k ** 1.6) * np.sin(2 * np.pi * 120 * k * ta + k) for k in range(1, 7))
zumbido *= np.interp(ta, [0, 11.0, 11.4, 17.9, 18.4], [0, 0, 1, 1.15, 0])
# a subida: o ruído numa banda subindo de 250 Hz a 6 kHz e um tom subindo de Mi2 a Mi4, crescendo até o estouro
dsub = 8.0
x = rng2.standard_normal(int(dsub * SR))
sub = banda_movel(x, lambda tt: 250 * (6000 / 250) ** np.clip(tt / dsub, 0, 1), 0.7)
tt = t_(dsub)
f = 82.41 * 4 ** (tt / dsub)
fase = 2 * np.pi * np.cumsum(f) / SR
tom = sum((1 / k) * np.sin(k * fase) for k in range(1, 9))
sub = norm(sub) + 0.35 * norm(tom)
sub *= (0.08 + 0.92 * (tt / dsub) ** 1.3) * np.minimum(1, (dsub - 0.05 - tt) / 0.03).clip(0, 1)
subida_s = soma_em(NA, (sub, 10.0))
elementos_ab = [  # (sinal, janela de medida, LU em relação ao refrão da m1)
    (tr_('abertura', 'boom'), (18, 21), 0.0), (tr_('abertura', 'conta'), (14, 18), -4.5), (tr_('abertura', 'pulso'), (2.5, 10), -14.0),
    (drone, (0, 2.5), -26.0), (oooh, (0.3, 3.3), -21.0), (whoosh, (2.5, 9.5), -19.0), (zzt, (10.0, 11.2), -15.0),
    (zumbido, (11.4, 14), -19.0), (subida_s, (16, 18), -10.0),
]
ab = sum(nivelar(x, a_, b_, REF + lu) for x, (a_, b_), lu in elementos_ab)
ab = teto(nivelar(ab, 18, 21, REF), False)
pedacos['abertura'] = dict(y=ab, laco=False, nom=len(ab), novo=True)

# ---- a entrada (18 a 38 s do show): a plateia vibrando, o pad, a guitarra, o baixo e o baterista
NE = len(tr_('entrada', 'pad'))
te = np.arange(NE) / SR
povo = plateia(NE / SR, False, dens_vozes=4.5, dens_uhuu=0.9, n_palmas=22, assobios=5)
povo *= np.interp(te, [0, 0.4, 3.0, 6.0, 16, 17.5, 19, 19.8, 20.6, NE / SR], [0.6, 1.0, 1.0, 0.72, 0.68, 1.0, 1.0, 0.55, 0.15, 0])
elementos_en = [
    (povo, (1, 16), -6.5), (tr_('entrada', 'pad'), (3, 18), -17.0), (tr_('entrada', 'guitarra'), (8, 15.5), -13.0),
    (tr_('entrada', 'baixo'), (10, 12), -11.0), (tr_('entrada', 'bateria'), (14, 20), -10.0),
]
en = teto(sum(nivelar(x, a_, b_, REF + lu) for x, (a_, b_), lu in elementos_en), False)
pedacos['entrada'] = dict(y=en, laco=False, nom=len(en), novo=True)

# ---- a torcida (8 s em laço, nas pausas e por baixo do fim) no volume do aplauso; os fogos um pouco abaixo
L_APLAUSO = lufs(pedacos['aplauso']['y'])
torc = plateia(8.0, True)
pedacos['torcida'] = dict(y=teto(ganho_lufs(torc, lufs(torc), L_APLAUSO), True), laco=True, nom=len(torc), novo=True)
# os fogos de estrelinhas: o "fiuuu" subindo baixinho, um "pof" abafado (nada de estouro) e o crepitar brilhando e sumindo
df = 3.1
nf_ = int(df * SR)
tf = np.arange(nf_) / SR
fogo = np.zeros(nf_)
x = banda_movel(rng2.standard_normal(int(0.85 * SR)), lambda tt: 600 * (2800 / 600) ** np.clip(tt / 0.85, 0, 1), 0.5)
tt = t_(0.85)
x = norm(x) * (tt / 0.85) ** 1.5 * np.minimum(1, (0.85 - tt) / 0.05)
x += 0.12 * np.sin(2 * np.pi * np.cumsum(900 * 2 ** (tt / 0.85)) / SR) * (tt / 0.85)
por_em(fogo, 0.35 * x, 0.0)
tt = t_(0.35)
pof = passa_baixa(rng2.standard_normal(len(tt)), 450) * np.exp(-tt / 0.05) + 0.8 * np.sin(2 * np.pi * 85 * tt) * np.exp(-tt / 0.07)
por_em(fogo, 0.25 * norm(pof), 0.86)
crepita = np.zeros(nf_)
for _ in range(360):
    t0 = 0.9 + rng2.exponential(0.8)
    if t0 > df - 0.15:
        continue
    d = rng2.uniform(0.0015, 0.005)
    g_ = chiado(d + 0.004, rng2.uniform(1500, 4500), 1.0) * np.exp(-np.arange(int((d + 0.004) * SR)) / SR / d)
    por_em(crepita, g_ * rng2.uniform(0.3, 1.0) * np.exp(-(t0 - 0.9) / 1.3), t0)
brilho = np.zeros(nf_)
for _ in range(26):
    t0 = rng2.uniform(1.0, 2.9)
    tt = t_(0.09)
    brilho_x = np.sin(2 * np.pi * rng2.uniform(2400, 4200) * tt) * np.exp(-tt / 0.025) * np.minimum(1, tt / 0.002)
    por_em(brilho, brilho_x * rng2.uniform(0.3, 1.0), t0)
chia = passa_baixa(rng2.standard_normal(nf_), 7500)
chia = (chia - passa_baixa(chia, 3000)) * np.interp(tf, [0, 0.9, 1.1, 2.6, df], [0, 0, 1, 0.3, 0]) * (0.6 + 0.4 * rng2.random(nf_))
fogo += 0.9 * norm(crepita) + 0.25 * norm(brilho) + 0.12 * norm(chia)
fogo = passa_baixa(fogo, 8000)
fogo *= np.minimum(1, (df - tf) / 0.3).clip(0, 1)
pedacos['fogos'] = dict(y=teto(ganho_lufs(fogo, lufs(fogo), L_APLAUSO - 3.0), False), laco=False, nom=nf_, novo=True)
for cid in ('abertura', 'entrada', 'torcida', 'fogos'):
    medidas_novas['partes'][cid] = dict(lufs=lufs(pedacos[cid]['y']))
medidas_novas['partes']['abertura'].update(estouroLufs=lufs(janela(pedacos['abertura']['y'], 18, 21)))
medidas_novas['aplausoLufs'] = L_APLAUSO

# ------------------------------------------------------------------ WAV com folga, MP3, decodifica, mede, emenda
NOVOS = ['m1_solo', 'm1_fim',
         'm2_contagem', 'm2_intro', 'm2_verso', 'm2_refrao', 'm2_ponte', 'm2_fim', 'm2_acorde_0', 'm2_acorde_1', 'm2_acorde_2',
         'm3_contagem', 'm3_intro', 'm3_verso', 'm3_refrao', 'm3_solo', 'm3_chamado', 'm3_final', 'm3_acorde_0', 'm3_acorde_1',
         'm3_acorde_2', 'abertura', 'entrada', 'torcida', 'fogos']
ORDEM = ([f'{c}_{p}' for c in ('bateria', 'guitarra', 'teclado') for p in ('verso', 'refrao', 'subida')] +
         ['contagem', 'acorde_0', 'acorde_1', 'acorde_2', 'final', 'aplauso', 'uhuu', 'batida', 'estojo', 'ladrilho', 'tum',
          'fliperama_0', 'fliperama_1', 'fliperama_2', 'fita', 'rodinhas', 'campainha', 'orelhao', 'lhama', 'radio_liga',
          'radio_desliga', 'neon'] + NOVOS)
assert set(ORDEM) == set(pedacos), set(pedacos) ^ set(ORDEM)
# o tamanho de cada pedaço de música em compassos (o jogo repete a frase a cada "c" compassos dentro da parte)
COMPASSOS_CLIP = {f'{c}_{p}': 4 for c in ('bateria', 'guitarra', 'teclado') for p in ('verso', 'refrao', 'subida')}
COMPASSOS_CLIP['contagem'] = 1
COMPASSOS_CLIP.update({k: round(d['compassos']) for k, d in novos.items() if k in ALVO_PARTE or k.endswith('_contagem')})
COMPASSOS_CLIP.update(abertura=9, entrada=10)


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
    if cid in COMPASSOS_CLIP:
        c['c'] = COMPASSOS_CLIP[cid]
    medidas[cid] = dict(segundos=round(len(y) / SR, 3), rmsDb=db(rms(corpo)), ativoDb=rms_ativo(corpo), picoDb=db(float(np.max(np.abs(z)))),
                        cortes=int(np.sum(np.abs(z) >= 0.999)), desvioCodificador=int(lag), kb=c['kb'])
    if d.get('novo') or cid in ('contagem', 'acorde_0', 'final', 'aplauso'):
        medidas[cid]['lufs'] = lufs(corpo)
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
    'carater': 'rock de brinquedo dos anos 80 (mais metal que pop): m1 em Mi a 120, o riff galopando, o refrão com o sintetizador e o glockenspiel dobrados pela guitarra com distorção, bumbo duplo macio, o solo e a subida; m2 em Lá a 140, reto, com o gancho no sintetizador e a ponte; m3 em Ré a 100, o hino de meio tempo com palmas, o solo, o chamado e o acorde final com a caixinha de música',
    'regua': {'refraoRmsDb': medidas_show['refraoRmsDb'], 'acorde': -22, 'final': -20.5, 'contagem': -27, 'aplauso': -27, 'brinquedos': -23, 'batida': -28, 'neon': -36,
              'refraoM1Lufs': REF, 'partesLU': {k: v[1] for k, v in ALVO_PARTE.items()}},
    'setlist': [
        {'id': 'm1', 'contagem': 'contagem',
         'partes': {'verso': ['bateria_verso', 'guitarra_verso', 'teclado_verso'], 'refrao': ['bateria_refrao', 'guitarra_refrao', 'teclado_refrao'],
                    'subida': ['bateria_subida', 'guitarra_subida', 'teclado_subida'], 'solo': ['m1_solo'], 'fim': ['m1_fim']},
         'acordes': ['acorde_0', 'acorde_1', 'acorde_2']},
        {'id': 'm2', 'contagem': 'm2_contagem',
         'partes': {'intro': ['m2_intro'], 'verso': ['m2_verso'], 'refrao': ['m2_refrao'], 'ponte': ['m2_ponte'], 'fim': ['m2_fim']},
         'acordes': ['m2_acorde_0', 'm2_acorde_1', 'm2_acorde_2']},
        {'id': 'm3', 'contagem': 'm3_contagem',
         'partes': {'intro': ['m3_intro'], 'verso': ['m3_verso'], 'refrao': ['m3_refrao'], 'solo': ['m3_solo'], 'chamado': ['m3_chamado']},
         'acordes': ['m3_acorde_0', 'm3_acorde_1', 'm3_acorde_2'], 'final': 'm3_final'},
    ],
    'abertura': 'abertura', 'entrada': 'entrada', 'torcida': 'torcida', 'fogos': 'fogos',
}
medidas_show['novos'] = medidas_novas
json.dump(dict(show=show, medidas=medidas, mixShow=medidas_show), open(saida_p, 'w'), ensure_ascii=False, indent=1)
print(f"show: {len(buf) / 1024:.1f} KB, {seg:.1f} s ({show['memoriaMB22k']} MB a 22 kHz); refrão {medidas_show['refraoRmsDb']} verso "
      f"{medidas_show['versoRmsDb']} subida {medidas_show['subidaRmsDb']} pico {medidas_show['picoDb']}; sozinhas {medidas_show['sozinha']}; "
      f"desvios {sorted({v['desvioCodificador'] for v in medidas.values()})}; pico máx {max(v['picoDb'] for v in medidas.values())}")
