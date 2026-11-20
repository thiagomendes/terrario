"""A folha de sons da Noite das Fantasias (esboço da spec 027): síntese nossa, aqui, em numpy (nada gravado de fora, nenhuma
amostra de terceiros). Cada som sai em WAV (44,1 kHz, mono, float) sem nivelar; o nivelamento, o MP3 e as medidas ficam
no finalizar_noite.py. Tudo fofo e de brinquedo: nada de grito, de risada maligna, de rangido ou de susto.

  campainha              "dim-dom" de campainha de brinquedo: duas placas de metalofone, Lá5 e Fá5 (terça maior descendo),
                         com a batidinha do martelo;
  lanterna-acende        o "puf" macio da chama e o brilho subindo (Dó-Mi-Sol-Dó-Mi em sininhos) sobre um acorde quentinho;
  risadinha-fantasminha  "hi-hi-hi-hi" tímido: voz de formantes (fonte de pulsos + ressonâncias de um "i" de criança), cada
                         sílaba com a sua quedinha de altura, a última bem leve, dobrada baixinho por uma celesta;
  miado-tufinho          "miau" curto de filhote: o "m" fechado e o "iau" abrindo, a altura subindo e caindo (formantes);
  apito-trem             o "piu-iiií" do Trem das Risadas: três tubinhos em acorde maior, com sopro, o segundo toque subindo;
  abobora-pula           "boing" macio: a batidinha surda no chão e a mola balançando, sem chiado;
  morceguinho            quatro batidinhas de asa (sopro filtrado) e um "piu" agudinho e baixinho no fim.
Uso: python3 -I sons_noite.py <pasta_wav>
"""
import sys
import os
import struct
import numpy as np
from scipy.signal import lfilter, butter, sosfilt

SR = 44100
rng = np.random.default_rng(27)


def t_(dur):
    return np.arange(int(round(dur * SR))) / SR


def gravar(c, x):
    raw = x.astype('<f4').tobytes()
    with open(c, 'wb') as f:
        f.write(b'RIFF' + struct.pack('<I', 36 + len(raw)) + b'WAVEfmt ' + struct.pack('<IHHIIHH', 16, 3, 1, SR, SR * 4, 4, 32)
                + b'data' + struct.pack('<I', len(raw)) + raw)


def por_em(saida, x, t0, g=1.0):
    i = int(round(t0 * SR))
    n = min(len(x), len(saida) - i)
    saida[i:i + n] += g * x[:n]


def passa(x, tipo, f, ordem=2):
    sos = butter(ordem, f, btype=tipo, fs=SR, output='sos')
    return sosfilt(sos, x)


def placa(f0, dur, parciais, ataque=0.002):
    """Uma placa de metalofone/sininho: parciais (razão, amplitude, tau) com decaimento exponencial."""
    t = t_(dur)
    y = sum(a * np.sin(2 * np.pi * f0 * r * t) * np.exp(-t / tau) for r, a, tau in parciais)
    return y * np.minimum(1, t / ataque)


def sala(x, dur=0.45, mistura=0.16, brilho=5500):
    """Um ambiente pequeno e claro: convolução com ruído em decaimento exponencial (semente fixa)."""
    t = t_(dur)
    ri = rng.standard_normal(len(t)) * np.exp(-t / (dur / 6.0))
    ri = passa(ri, 'lowpass', brilho)
    ri /= np.sqrt(np.sum(ri ** 2))
    molhado = np.convolve(x, ri)
    seco = np.concatenate([x, np.zeros(len(molhado) - len(x))])
    return seco + mistura * molhado


def formantes(fonte, fs, bs, gs):
    """Ressonâncias de dois polos em paralelo; fs, bs, gs podem ser fixos ou curvas no tempo (aplicadas por blocos)."""
    n = len(fonte)
    curvas = [np.broadcast_to(np.asarray(v, float), (n,)) if np.ndim(v) == 0 else np.asarray(v, float) for v in fs]
    bands = [np.broadcast_to(np.asarray(v, float), (n,)) if np.ndim(v) == 0 else np.asarray(v, float) for v in bs]
    y = np.zeros(n)
    bloco = 64
    for F, B, g in zip(curvas, bands, gs):
        zi = np.zeros(2)
        g = np.broadcast_to(np.asarray(g, float), (n,)) if np.ndim(g) == 0 else np.asarray(g, float)
        for i in range(0, n, bloco):
            f, b = F[i], B[i]
            r = np.exp(-np.pi * b / SR)
            th = 2 * np.pi * f / SR
            a = [1, -2 * r * np.cos(th), r * r]
            seg, zi = lfilter([(1 - r) * np.sqrt(1 - 2 * r * np.cos(2 * th) + r * r)], a, fonte[i:i + bloco], zi=zi)
            y[i:i + bloco] += g[i:i + bloco] * seg
    return y


def fonte_vozeada(f0, sopro=0.08):
    """Pulsos glotais suaves (soma de harmônicos com queda de -12 dB/oitava) + um pouco de sopro."""
    fase = 2 * np.pi * np.cumsum(f0) / SR
    kmax = int(9000 / np.max(f0))
    y = sum(np.sin(k * fase) / k ** 1.6 for k in range(1, kmax + 1))
    return y + sopro * rng.standard_normal(len(f0))


sons = {}

# ------------------------------------------------------------------ 1. campainha: "dim-dom" de brinquedo
# placa de metalofone: fundamental, a parcial de 2,76 (a cor de lâmina) e uma pitada de 5,4; o "dim" mais curto que o "dom"
PARC = [(1, 1.0, 0.55), (2.0, 0.18, 0.25), (2.76, 0.22, 0.12), (5.4, 0.05, 0.04)]
dim = placa(880.0, 1.0, PARC)
dom = placa(698.46, 1.4, [(r, a, tau * 1.25) for r, a, tau in PARC])
martelo = passa(rng.standard_normal(int(0.006 * SR)), 'bandpass', [2500, 6000]) * np.hanning(int(0.006 * SR))
y = np.zeros(int(1.55 * SR))
por_em(y, dim, 0.0, 0.9)
por_em(y, martelo, 0.0, 0.25)
por_em(y, dom, 0.36, 1.0)
por_em(y, martelo, 0.36, 0.22)
t = t_(1.55)
y *= np.minimum(1, (1.55 - t) / 0.25)
sons['campainha'] = sala(y, 0.5, 0.18)

# ------------------------------------------------------------------ 2. lanterna-acende: "puf" macio + sininhos subindo
dur = 1.3
y = np.zeros(int(dur * SR))
puf = passa(rng.standard_normal(int(0.16 * SR)), 'bandpass', [180, 1400])
tp = t_(0.16)
puf *= (1 - np.exp(-tp / 0.012)) * np.exp(-tp / 0.04)
por_em(y, puf, 0.0, 0.55)
# o acorde quentinho da luz (Dó5, Sol5, Mi6), inchando devagar
t = t_(1.1)
calor = sum(a * np.sin(2 * np.pi * f * t) for f, a in ((523.25, 0.5), (783.99, 0.35), (1318.5, 0.18)))
calor *= np.minimum(1, t / 0.18) * np.exp(-np.maximum(0, t - 0.25) / 0.35)
por_em(y, calor, 0.04, 0.32)
SININHO = [(1, 1.0, 0.35), (2.0, 0.2, 0.15), (3.0, 0.08, 0.06)]
for i, f in enumerate((1046.5, 1318.5, 1568.0, 2093.0, 2637.0)):
    por_em(y, placa(f, 0.7, SININHO), 0.05 + i * 0.065, 0.5 - 0.04 * i)
# o cintilar: um fio agudo subindo, bem baixinho
t = t_(0.5)
f = 2400 + 1800 * t / 0.5
cint = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.5) ** 2 * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * t))
por_em(y, cint, 0.1, 0.05)
t = t_(dur)
y *= np.minimum(1, (dur - t) / 0.3)
sons['lanterna-acende'] = sala(y, 0.6, 0.2)

# ------------------------------------------------------------------ 3. risadinha-fantasminha: "hi-hi-hi-hi" tímido
# quatro sílabas; cada uma com o "h" (sopro passando pelos mesmos formantes) e o "i" vozeado com a quedinha de altura
SILABAS = [(0.00, 740, 1.0), (0.145, 790, 0.92), (0.29, 720, 0.8), (0.435, 660, 0.55)]
dur = 0.78
y = np.zeros(int(dur * SR))
cel = np.zeros(int(dur * SR))
for ini, f_alto, vol in SILABAS:
    d_h, d_v = 0.03, 0.085
    tt = t_(d_h + d_v)
    f0 = f_alto * (1.0 - 0.13 * np.clip((tt - d_h) / d_v, 0, 1))  # cai um pouquinho dentro da sílaba
    vozeado = fonte_vozeada(f0, sopro=0.03) * np.clip((tt - d_h * 0.6) / 0.012, 0, 1)
    sopro = rng.standard_normal(len(tt)) * 0.7 * np.exp(-np.maximum(0, tt - d_h * 0.5) / 0.02)
    env = np.minimum(1, tt / 0.008) * np.clip((d_h + d_v - tt) / 0.035, 0, 1)
    # formantes de um "i" aberto de criança (quase "ê"), com o F1 perto da fundamental: fofo, não estridente
    s = formantes((vozeado + sopro) * env, [520, 2650, 3700], [110, 220, 320], [1.0, 0.45, 0.16])
    por_em(y, s, ini, vol)
    # a celesta junto, baixinha, no tom da sílaba (deixa com cara de brinquedo)
    por_em(cel, placa(f_alto * 2, 0.25, [(1, 1, 0.12), (2, 0.15, 0.05)]), ini + d_h, vol)
y = passa(y, 'highpass', 250)
y = y / np.max(np.abs(y)) + 0.10 * cel / np.max(np.abs(cel))
sons['risadinha-fantasminha'] = sala(y, 0.35, 0.14)

# ------------------------------------------------------------------ 4. miado-tufinho: "miau" curto de filhote
dur = 0.56
t = t_(dur)
u = t / dur
# altura: começa em 620 Hz, sobe até ~900 Hz em 30 % do miado e desce para ~640 Hz; vibrato fino de 7 Hz
f0 = np.interp(u, [0, 0.12, 0.32, 0.7, 1.0], [600, 700, 900, 780, 640]) * (1 + 0.012 * np.sin(2 * np.pi * 7 * t))
fonte = fonte_vozeada(f0, sopro=0.06)
# boca: "m" fechado (só a ressonância nasal baixa) -> "i" -> "a" aberto -> "u" fechando
F1 = np.interp(u, [0, 0.14, 0.25, 0.55, 1.0], [320, 520, 980, 1050, 620])
F2 = np.interp(u, [0, 0.14, 0.25, 0.55, 1.0], [1500, 2500, 1900, 1600, 1100])
F3 = np.interp(u, [0, 0.25, 1.0], [3300, 3400, 3000])
abre = np.interp(u, [0, 0.12, 0.2, 1.0], [0.25, 0.35, 1.0, 1.0])
y = formantes(fonte, [F1, F2, F3], [130, 200, 300], [abre, 0.5 * abre, 0.18 * abre])
y = y + 0.35 * formantes(fonte, [260], [80], [np.interp(u, [0, 0.15, 0.25], [1, 0.4, 0])])  # o murmúrio nasal do "m"
y *= np.minimum(1, t / 0.03) * np.clip((dur - t) / 0.14, 0, 1) ** 1.5
y = passa(y, 'highpass', 220)
sons['miado-tufinho'] = sala(y, 0.3, 0.1)

# ------------------------------------------------------------------ 5. apito-trem: "piu-iiií" alegre, de brinquedo
TUBOS = (1046.5, 1318.5, 1568.0)  # Dó6, Mi6, Sol6: acorde maior, sem dissonância de apito de verdade


def toque(dur, glissando, rampa=0.12):
    t = t_(dur)
    sobe = 2 ** (-glissando / 12 * np.clip(1 - t / rampa, 0, 1))  # começa abaixo e chega no tom
    y = np.zeros(len(t))
    for k, f in enumerate(TUBOS):
        fi = f * sobe * (1 + 0.004 * np.sin(2 * np.pi * (5.5 + k) * t))
        fase = 2 * np.pi * np.cumsum(fi) / SR
        y += (np.sin(fase) + 0.12 * np.sin(2 * fase)) * (1.0 - 0.15 * k)
        sopro = passa(rng.standard_normal(len(t)), 'bandpass', [f * 0.9, f * 1.1])
        y += 0.5 * sopro
    env = np.minimum(1, t / 0.03) * np.clip((dur - t) / 0.08, 0, 1)
    return y * env


y = np.zeros(int(1.3 * SR))
por_em(y, toque(0.22, 1.5, 0.05), 0.0, 0.8)
por_em(y, toque(0.78, 3.0, 0.16), 0.3, 1.0)
y = passa(y, 'lowpass', 7000)
sons['apito-trem'] = sala(y, 0.5, 0.16)

# ------------------------------------------------------------------ 6. abobora-pula: "boing" macio
dur = 0.62
t = t_(dur)
# a batidinha surda no chão (abóbora é fofa: grave curto, sem estalo)
tum = np.sin(2 * np.pi * (95 + 60 * np.exp(-t / 0.02)) * t) * np.exp(-t / 0.045) * np.minimum(1, t / 0.003)
# a mola: sobe de 200 para 400 Hz em 35 ms e balança (14 Hz, cada vez menos) em volta de 340 Hz
base = 340 + 60 * np.exp(-t / 0.05) - 140 * np.exp(-t / 0.012)
balanco = 1 + 0.09 * np.exp(-t / 0.18) * np.sin(2 * np.pi * 14 * t)
fase = 2 * np.pi * np.cumsum(base * balanco) / SR
mola = (np.sin(fase) + 0.3 * np.sin(2 * fase) + 0.08 * np.sin(3 * fase)) * np.exp(-t / 0.2) * np.minimum(1, t / 0.006)
y = 0.8 * tum + 0.75 * mola
y *= np.clip((dur - t) / 0.12, 0, 1)
y = passa(y, 'lowpass', 3200)
sons['abobora-pula'] = sala(y, 0.3, 0.1)

# ------------------------------------------------------------------ 7. morceguinho: asinhas batendo e um "piu" baixinho
dur = 0.78
y = np.zeros(int(dur * SR))
for k, (ini, vol) in enumerate(((0.0, 0.8), (0.085, 1.0), (0.17, 0.85), (0.255, 0.95), (0.34, 0.6))):
    n = int(0.06 * SR)
    tt = np.arange(n) / SR
    asa = passa(rng.standard_normal(n), 'bandpass', [700 + 60 * k, 2600])
    asa += 0.5 * passa(rng.standard_normal(n), 'bandpass', [250, 600])  # o "fup" do ar empurrado
    asa *= (1 - np.exp(-tt / 0.006)) * np.exp(-tt / 0.016)
    por_em(y, asa, ini, vol)
t = t_(0.09)
f = 2300 + 500 * np.sin(np.pi * t / 0.09)  # "piu": sobe e volta, curtinho
piu = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.09) ** 2
por_em(y, piu, 0.46, 0.16)
por_em(y, piu[::-1] * 0.7, 0.57, 0.12)
sons['morceguinho'] = sala(y, 0.3, 0.12)

pasta = sys.argv[1]
os.makedirs(pasta, exist_ok=True)
for nome, x in sons.items():
    x = x / np.max(np.abs(x)) * 0.5
    gravar(os.path.join(pasta, nome + '.wav'), x)
    print(f'{nome}: {len(x) / SR:.2f} s')
