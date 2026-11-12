"""Sons dos veículos do esboço da spec 014: tudo síntese própria (numpy/scipy), de brinquedo e baixinho.
Mesma régua das vozes da 019: RMS "enquanto soa" (janelas de 50 ms acima de -60 dBFS) medido no MP3.
  buzinas e campainha da parada: -23 dB (como as vozes); freio, porta: -26 dB; motores (laço): -32 dB a 2 blocos.
Uso: python3 -I sons_veiculos.py <saida> <medidas.json> <pasta_sons_da_cidade>
"""
import sys, os, json, subprocess
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import (filtro, banda, finalizar, salvar, juntar, mix, eco, sala, osc, adsr, glide, vibrato, bordas,
                 rms_ativo, limitar, SR, aparar)

saida, medp, cidade = sys.argv[1:4]
os.makedirs(saida, exist_ok=True)
rng = np.random.default_rng(14)
sons = {}


def t_(d): return np.arange(int(d * SR)) / SR


def normal_rms(x, alvo):
    for _ in range(5):
        x = x * 10 ** ((alvo - rms_ativo(x)) / 20)
        x = limitar(x)
    return x


def laco(x, cruz=0.25):
    """Laço sem emenda: o fim se mistura no começo."""
    n = int(cruz * SR)
    a, b = x[:n].copy(), x[-n:].copy()
    f = np.linspace(0, 1, n)
    y = x[:-n].copy()
    y[:n] = a * f + b * (1 - f)
    return y


def ruido(n, lo, hi):
    return banda(rng.standard_normal(n), lo, hi)


# ------------------------------------------------------------------ motores (laços de 3 s)
def motor_corda(f0=118, dur=3.25):
    """V1 brinquedo de corda: zumbido macio + catraca do mecanismo (tique-tique miudinho)."""
    t = t_(dur)
    hum = osc(np.full(len(t), f0) * (1 + 0.01 * np.sin(2 * np.pi * 0.7 * t)), 'tri') * 0.5
    hum += osc(np.full(len(t), f0 * 2.01), 'sine') * 0.18
    hum = filtro(hum, 'low', 900, 2)
    tiques = np.zeros(len(t))
    k = 0
    for ti in np.arange(0, dur, 1 / 16):
        i = int(ti * SR)
        c = ruido(int(0.008 * SR), 2500, 7000) * np.exp(-np.arange(int(0.008 * SR)) / (0.0015 * SR))
        tiques[i:i + len(c)] += c[:len(tiques) - i] * (0.55 if k % 4 == 0 else 0.3)
        k += 1
    return laco(hum + tiques * 0.5)


def motor_bloquinho(f0=7.0, dur=3.25):
    """V2 bloquinhos: puque-puque de madeira (motorzinho de brinquedo de madeira)."""
    t = t_(dur)
    x = np.zeros(len(t))
    for ti in np.arange(0, dur, 1 / f0):
        i = int(ti * SR)
        n = int(0.09 * SR)
        tt = np.arange(n) / SR
        thump = np.sin(2 * np.pi * (95 + 40 * np.exp(-tt / 0.02)) * tt) * np.exp(-tt / 0.03)
        clique = ruido(n, 600, 2200) * np.exp(-tt / 0.006) * 0.35
        x[i:i + n] += (thump + clique)[:len(x) - i]
    x += filtro(rng.standard_normal(len(t)), 'low', 300, 2) * 0.05
    return laco(x)


def motor_ronron(f0=135, dur=3.25):
    """V3 carinha: ronronzinho fofo (zumbido com vibrato lento e um "mmm" de boca fechada)."""
    t = t_(dur)
    f = f0 * (1 + 0.025 * np.sin(2 * np.pi * 5.2 * t))
    x = osc(f, 'saw') * 0.4
    x = filtro(x, 'low', 700, 2) + banda(x, 380, 620) * 0.6
    x *= 0.8 + 0.2 * np.sin(2 * np.pi * 2.6 * t) ** 2
    return laco(x)


def motor_retro(f0=92, dur=3.25):
    """V4 retrô: zumbido redondo de carro antigo de brinquedo, com um borbulhar baixinho."""
    t = t_(dur)
    x = osc(np.full(len(t), f0), 'saw') * 0.35 + osc(np.full(len(t), f0 * 1.007), 'saw') * 0.35
    x = filtro(x, 'low', 420, 2)
    borb = filtro(rng.standard_normal(len(t)), 'low', 120, 2) * 2.5
    x *= 0.85 + 0.15 * np.tanh(borb)
    return laco(x)


MOTORES = {'v1': motor_corda, 'v2': motor_bloquinho, 'v3': motor_ronron, 'v4': motor_retro}
for v, f in MOTORES.items():
    sons[f'{v}-motor-taxi'] = (normal_rms(bordas(f(), 0.02, 0.02), -32), 'motor', 'laço de 3 s, -32 dB a 2 blocos')
    base = {'v1': 88, 'v2': 5.2, 'v3': 100, 'v4': 70}[v]
    sons[f'{v}-motor-onibus'] = (normal_rms(bordas(f(base), 0.02, 0.02), -32), 'motor', 'mais grave que o do táxi')


# ------------------------------------------------------------------ buzinas
def toque(dur, f, forma='square', lo=300, hi=2600, queda=1.0, vib=0):
    n = int(dur * SR)
    ff = glide(dur, [(0, f * 0.96), (0.12, f), (1, f * queda)])
    if vib: ff = vibrato(ff, 6, vib)
    y = osc(ff, forma)
    return banda(y, lo, hi) * adsr(n, 0.012, 0.05)


def acorde(dur, fs, forma='saw', lo=200, hi=2200):
    return sum(toque(dur, f, forma, lo, hi) for f in fs) / len(fs)


BUZINAS = {
    # V1 corda: buzina de lata, "bi-bi" (táxi) e "fom-fom" (ônibus)
    'v1-buzina-taxi': juntar([toque(0.12, 740, 'square', 500, 3000), toque(0.18, 740, 'square', 500, 3000)], 0.06),
    'v1-buzina-onibus': juntar([toque(0.18, 392, 'saw', 250, 2200), toque(0.28, 392, 'saw', 250, 2200)], 0.08),
    # V2 bloquinhos: buzina de pera de borracha, "pó-pó"
    'v2-buzina-taxi': juntar([toque(0.14, 520, 'saw', 350, 2400, 0.8), toque(0.2, 520, 'saw', 350, 2400, 0.78)], 0.07),
    'v2-buzina-onibus': juntar([toque(0.2, 300, 'saw', 200, 1800, 0.82), toque(0.3, 300, 'saw', 200, 1800, 0.8)], 0.09),
    # V3 carinha: "bip-bip" que sobe (táxi) e "bom-bom" em terça (ônibus)
    'v3-buzina-taxi': juntar([toque(0.1, 880, 'tri', 400, 4000, 1.18), toque(0.14, 988, 'tri', 400, 4000, 1.15)], 0.05),
    'v3-buzina-onibus': juntar([acorde(0.2, [392, 494], 'tri'), acorde(0.3, [349, 440], 'tri')], 0.08),
    # V4 retrô: "uuu-a" de buzina antiga bem baixinha (táxi) e buzina de dois tons (ônibus)
    'v4-buzina-taxi': toque(0.42, 330, 'saw', 250, 2000, 1.45, 0.15),
    'v4-buzina-onibus': juntar([acorde(0.22, [220, 277], 'saw', 180, 1600), acorde(0.34, [220, 277], 'saw', 180, 1600)], 0.08),
}
for k, x in BUZINAS.items():
    sons[k] = (finalizar(x, mol=0.12), 'buzina', 'buzinadinha de brinquedo')
# a buzinadinha para o morador: a do táxi, mais curta e mais baixa
sons['v1-bibi-morador'] = (finalizar(toque(0.08, 740, 'square', 500, 3000), alvo=-28, mol=0.1), 'buzina', 'só um "bi", -28 dB')

# ------------------------------------------------------------------ freio, porta e campainha
n = int(0.42 * SR)
fre = osc(vibrato(glide(0.42, [(0, 1650), (1, 1380)]), 9, 0.25), 'sine') * adsr(n, 0.03, 0.15) * 0.6
fre += ruido(n, 1200, 4500) * adsr(n, 0.01, 0.2) * 0.25
sons['freio'] = (finalizar(fre, alvo=-26, mol=0.1), 'comum', 'chiadinho de freio de brinquedo')
n = int(0.6 * SR)
tt = np.arange(n) / SR
pssh = ruido(n, 1800, 7000) * np.exp(-tt / 0.18) * np.clip(tt / 0.02, 0, 1)
clunk = np.sin(2 * np.pi * 160 * tt) * np.exp(-tt / 0.03) * 0.6
sons['onibus-porta'] = (finalizar(pssh + clunk, alvo=-26, mol=0.1), 'comum', '"pssh" da porta')


def sino(f, dur):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    y = sum(a * np.sin(2 * np.pi * f * m * tt) * np.exp(-tt / (dur * d)) for m, a, d in [(1, 1, 0.5), (2.01, 0.35, 0.25), (3.02, 0.15, 0.15)])
    return y * np.clip(tt / 0.004, 0, 1)


sons['onibus-campainha'] = (finalizar(juntar([sino(784, 0.6), sino(659, 0.9)], 0.0, 0.35), mol=0.2), 'comum', '"plim-plom" da parada')

# ------------------------------------------------------------------ gravar e medir
med = {}
SRF = 22050
for nome, (x, grupo, nota) in sons.items():
    w = os.path.join(saida, nome + '.wav')
    salvar(w, x)
    m = os.path.join(saida, nome + '.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', w, '-ac', '1', '-ar', str(SRF), '-c:a', 'libmp3lame', '-b:a', '48k', '-map_metadata', '-1', m], check=True)
    os.remove(w)
    y = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', m, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout, np.float32).astype(np.float64)
    med[nome] = dict(grupo=grupo, nota=nota, segundos=round(len(y) / SR, 2), rmsDb=round(rms_ativo(y), 1), picoDb=round(20 * np.log10(np.max(np.abs(y)) + 1e-12), 1), kb=round(os.path.getsize(m) / 1024, 1))


# ------------------------------------------------------------------ a rua em 15 s, com a trilha da cidade (versão 1)
def dec(p):
    return np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout, np.float32).astype(np.float64)


D = 15.0
musica = dec(os.path.join(cidade, 'cidade-dia.mp3'))[:int(D * SR)]
rua = np.zeros(int(D * SR))
rua[:len(musica)] += musica


def passa(sinal, t0, dur, pico_db):
    """Um veículo que passa: chega, fica mais alto perto da criança e vai embora (sem efeito Doppler)."""
    n = int(dur * SR)
    reps = int(np.ceil(n / len(sinal))) + 1
    s = np.tile(sinal, reps)[:n]
    u = np.linspace(-1, 1, n)
    g = 10 ** ((pico_db - 0) / 20) / (1 + 9 * u ** 2)  # 1 / distância²: 10x mais baixo nas pontas
    i = int(t0 * SR)
    rua[i:i + n] += (s * g)[:len(rua) - i]


def em(nome, t0, ganho_db):
    s = dec(os.path.join(saida, nome + '.mp3')) * 10 ** (ganho_db / 20)
    i = int(t0 * SR)
    rua[i:i + len(s)] += s[:len(rua) - i]


passa(dec(os.path.join(saida, 'v1-motor-taxi.mp3')), 0.8, 6.0, 0)
em('v1-bibi-morador', 3.6, -2)
passa(dec(os.path.join(saida, 'v1-motor-onibus.mp3')), 6.0, 5.0, 0)
em('freio', 8.4, -4)
em('onibus-porta', 9.2, -4)
em('onibus-campainha', 9.9, -5)
em('v1-buzina-taxi', 12.6, -12)
pombo = dec(os.path.join(cidade, 'pombo-chamado.mp3')) * 10 ** (-9 / 20)
i = int(1.8 * SR)
rua[i:i + len(pombo)] += pombo[:len(rua) - i]
n = int(1.5 * SR)
rua[-n:] *= np.linspace(1, 0, n) ** 1.5
rua[:int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))
mp = os.path.join(saida, 'rua-com-veiculos.mp3')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-ac', '1', '-ar', str(SRF), '-c:a', 'libmp3lame', '-b:a', '64k', '-map_metadata', '-1', mp],
               input=np.clip(rua, -1, 1).astype('<f4').tobytes(), check=True)
y = dec(mp)
med['rua-com-veiculos'] = dict(grupo='mistura', nota='15 s: trilha da cidade (como no arquivo) + táxi passando, buzinadinha no morador, ônibus chegando ao ponto (freio, porta, campainha), buzina longe e pombo',
                               segundos=round(len(y) / SR, 2), rmsDb=round(20 * np.log10(np.sqrt(np.mean(y ** 2))), 1), picoDb=round(20 * np.log10(np.max(np.abs(y))), 1), kb=round(os.path.getsize(mp) / 1024, 1))
json.dump(med, open(medp, 'w'), ensure_ascii=False, indent=1)
for k, v in med.items():
    print(k, v['rmsDb'], v['picoDb'], v['segundos'])
