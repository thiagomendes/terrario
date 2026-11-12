"""Sons dos veículos, rodada 2 (esboço da spec 014).
Motores a partir de gravações CC0 do BigSoundBank (marcha lenta de verdade), tocadas com a rotação de uma curva de RPM
(a gravação é lida mais depressa quando o motor gira mais: o tom e o ritmo das explosões sobem juntos), com camada de
carga (mais agudo e mais forte acelerando, mais abafado soltando o pedal), trocas de marcha e redução.
  carro (táxi, carros comuns, polícia): Citroën Saxo 1.1 em marcha lenta (BigSoundBank 0187, CC0)
  ônibus: diesel Iveco Daily 3.0 (BigSoundBank 1145, CC0) + freio a ar (BigSoundBank 1490, CC0)
  carrinho de sorvete: motor de Ford Courier (BigSoundBank 0896, CC0)
Musiquinha do sorvete: melodia original (caixinha de música), gravada com FluidR3_GM (MIT).
Uso: python3 -I sons_r2.py <saida> <medidas.json> <pasta_sons_da_cidade> <pasta_midi>
"""
import sys, os, json, subprocess, struct
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import filtro, banda, finalizar, juntar, osc, adsr, glide, vibrato, bordas, rms_ativo, limitar, SR

saida, medp, cidade, midid = sys.argv[1:5]
os.makedirs(saida, exist_ok=True)
os.makedirs(midid, exist_ok=True)
rng = np.random.default_rng(2)


def dec(p, ini=None, fim=None, canais=1):
    x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', str(canais), '-ar', str(SR), '-f', 'f32le', '-'],
                                     capture_output=True, check=True).stdout, np.float32).astype(np.float64)
    if canais == 2: x = x.reshape(-1, 2)
    if ini is not None: x = x[int(ini * SR):int(fim * SR)]
    return x


def laco(seg, cruz=0.25):
    n = int(cruz * SR)
    f = np.linspace(0, 1, n)
    y = seg[:-n].copy()
    y[:n] = seg[:n] * f + seg[-n:] * (1 - f)
    return y - np.mean(y)


def ler_laco(seg, taxa):
    """Lê o laço com a taxa de cada amostra (1 = marcha lenta da gravação)."""
    L = len(seg)
    fase = np.cumsum(taxa)
    i0 = np.floor(fase).astype(np.int64)
    fr = fase - i0
    return seg[i0 % L] * (1 - fr) + seg[(i0 + 1) % L] * fr


def curva(pontos, dur):
    t = np.arange(int(dur * SR)) / SR
    ts, vs = zip(*pontos)
    return np.interp(t, ts, vs)


def motor(seg, rpm, carga, f_explosao, brilho=900):
    """rpm: taxa de leitura (1 = lenta); carga: 0..1 (pedal)."""
    x = ler_laco(seg, rpm)
    claro = x + 0.7 * filtro(x, 'high', 400, 2)
    escuro = filtro(x, 'low', brilho, 2)
    y = escuro * (1 - carga) + claro * carga
    # ruído de admissão, pulsando com as explosões, só com o pé no acelerador
    fase = np.cumsum(f_explosao * rpm) / SR
    pulso = 0.5 + 0.5 * np.sin(2 * np.pi * fase)
    ar = banda(rng.standard_normal(len(x)), 700, 2600) * pulso * carga * 0.05
    nivel = 0.5 + 0.5 * carga + 0.25 * (rpm - 1)
    return (y + ar) * nivel


def normal(x, alvo):
    for _ in range(5):
        x = x * 10 ** ((alvo - rms_ativo(x)) / 20)
        x = limitar(x)
    return x


def mp3(x, caminho, kbps=64):
    estereo = x.ndim == 2
    y = np.clip(x, -1, 1).astype('<f4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2' if estereo else '1', '-i', '-',
                    '-ac', '2' if estereo else '1', '-ar', '22050', '-c:a', 'libmp3lame', '-b:a', f'{kbps}k', '-map_metadata', '-1', caminho],
                   input=y.tobytes(), check=True)


# ------------------------------------------------------------------ fontes
B = '/b/bsb/'
SEG = {
    'carro': laco(dec(B + '0187.mp3', 21.0, 27.5)),
    'onibus': laco(dec(B + '1145.mp3', 2.0, 9.0)),
    'sorvete': laco(dec(B + '0896.mp3', 3.0, 9.5)),
}
SEG['policia'] = SEG['carro']
FREIO_AR = dec(B + '1490.mp3')
EXPLOSAO = {'carro': 27, 'policia': 27, 'onibus': 19, 'sorvete': 25}

# arrancar -> rodar -> desacelerar -> parar (11 s); trocas: a rotação cai e o pedal alivia um instante
PASSADA = {
    'carro': dict(dur=11.0,
                  rpm=[(0, 1), (0.8, 1), (2.5, 2.35), (2.75, 1.55), (4.4, 2.15), (4.65, 1.6), (6.4, 1.95), (7.6, 1.92), (8.5, 1.45),
                       (8.65, 1.7), (9.6, 1.12), (10.1, 1.0), (11, 1.0)],
                  carga=[(0, 0.1), (0.8, 0.1), (0.9, 0.9), (2.5, 0.9), (2.6, 0.05), (2.75, 0.8), (4.4, 0.75), (4.5, 0.05), (4.65, 0.6),
                         (6.4, 0.5), (6.6, 0.32), (7.6, 0.32), (7.7, 0.0), (10.1, 0.0), (10.3, 0.1), (11, 0.1)]),
    'policia': dict(dur=11.0,
                    rpm=[(0, 1), (0.7, 1), (2.3, 2.5), (2.5, 1.6), (4.1, 2.3), (4.3, 1.7), (6.2, 2.05), (7.6, 2.0), (8.4, 1.5),
                         (8.55, 1.75), (9.5, 1.15), (10.0, 1.0), (11, 1.0)],
                    carga=[(0, 0.1), (0.7, 0.1), (0.8, 0.95), (2.3, 0.95), (2.4, 0.05), (2.5, 0.85), (4.1, 0.8), (4.2, 0.05),
                           (4.3, 0.65), (6.2, 0.5), (6.4, 0.35), (7.6, 0.35), (7.7, 0.0), (10.0, 0.0), (10.2, 0.1), (11, 0.1)]),
    'onibus': dict(dur=12.0,
                   rpm=[(0, 1), (1.0, 1), (3.2, 1.75), (3.5, 1.3), (5.8, 1.65), (6.1, 1.35), (7.8, 1.55), (8.6, 1.5), (9.8, 1.15),
                        (10.6, 1.0), (12, 1.0)],
                   carga=[(0, 0.15), (1.0, 0.15), (1.1, 0.85), (3.2, 0.85), (3.35, 0.05), (3.5, 0.75), (5.8, 0.7), (5.95, 0.05),
                          (6.1, 0.55), (7.8, 0.45), (8.0, 0.0), (10.6, 0.0), (10.9, 0.15), (12, 0.15)]),
    'sorvete': dict(dur=10.0,
                    rpm=[(0, 1), (0.8, 1), (2.6, 1.6), (2.85, 1.25), (5.2, 1.45), (6.6, 1.45), (8.0, 1.1), (8.6, 1.0), (10, 1.0)],
                    carga=[(0, 0.1), (0.8, 0.1), (0.9, 0.7), (2.6, 0.7), (2.7, 0.05), (2.85, 0.5), (5.2, 0.35), (6.6, 0.35),
                           (6.7, 0.0), (8.6, 0.0), (8.8, 0.1), (10, 0.1)]),
}
ALVO = {'carro': -27, 'policia': -27, 'onibus': -26, 'sorvete': -31}
ALVO_LENTA = {'carro': -31, 'policia': -31, 'onibus': -29, 'sorvete': -33}

sons = {}
for v, p in PASSADA.items():
    seg, fe = SEG[v], EXPLOSAO[v]
    # marcha lenta em laço (3 s), com a rotação respirando um tiquinho
    n = int(3.0 * SR)
    t = np.arange(n) / SR
    rpm = 1 + 0.015 * np.sin(2 * np.pi * t / 3.0)
    lenta = motor(seg, rpm, np.full(n, 0.12), fe)
    sons[f'{v}-lenta'] = (normal(bordas(laco(np.concatenate([lenta, lenta[:int(0.25 * SR)]])), 0.01, 0.01), ALVO_LENTA[v]), 'laço de marcha lenta, 3 s')
    rpm = curva(p['rpm'], p['dur'])
    carga = curva(p['carga'], p['dur'])
    x = motor(seg, rpm, carga, fe)
    if v == 'onibus':
        # freio a ar no fim da parada
        i = int(10.75 * SR)
        f = FREIO_AR * 0.6
        x[i:i + len(f)] += f[:len(x) - i] * np.max(np.abs(x)) / (np.max(np.abs(f)) + 1e-9) * 0.5
    sons[f'{v}-passada'] = (normal(bordas(x, 0.05, 0.3), ALVO[v]), 'arranca, troca de marcha, roda, solta o pedal, reduz e para')

    # passando da esquerda para a direita (estéreo), a 4 blocos, com um quase-Doppler
    dur = 6.0
    n = int(dur * SR)
    t = np.arange(n) / SR
    vel = 7.0 if v != 'onibus' else 5.5
    xpos = (t - dur / 2) * vel
    d = np.sqrt(xpos ** 2 + 4.0 ** 2)
    vr = np.gradient(d, 1 / SR)
    dop = 340 / (340 + vr * 3)  # exagerado um pouco para se ouvir
    cruz = {'carro': 1.85, 'policia': 1.95, 'onibus': 1.5, 'sorvete': 1.4}[v]
    y = motor(seg, cruz * dop, np.full(n, 0.4), fe)
    g = 4.0 / d
    abaf = filtro(y, 'low', 1400, 2)
    perto = np.clip(4.0 / d, 0, 1)
    y = (y * perto + abaf * (1 - perto)) * g
    pan = np.clip(xpos / 12, -1, 1)
    esq = y * np.sqrt((1 - pan) / 2)
    dir_ = y * np.sqrt((1 + pan) / 2)
    st = np.stack([esq, dir_], 1)
    ref = rms_ativo(y)
    st *= 10 ** ((ALVO[v] + 2 - ref) / 20)
    m = np.max(np.abs(st))
    if m > 0.89: st *= 0.89 / m
    env = np.r_[np.linspace(0, 1, int(0.3 * SR)), np.ones(n - int(0.9 * SR)), np.linspace(1, 0, int(0.6 * SR))]
    sons[f'{v}-passando'] = (st * env[:len(st), None], 'passando da esquerda para a direita, estéreo')

# ------------------------------------------------------------------ "uí-uí" de brinquedo da polícia
def ui(dur=0.34):
    n = int(dur * SR)
    f = vibrato(glide(dur, [(0, 620), (0.45, 900), (1, 860)]), 7, 0.15)
    y = osc(f, 'sine') * 0.8 + osc(f * 2, 'sine') * 0.12
    return filtro(y, 'low', 2600, 2) * adsr(n, 0.03, 0.12)


sons['policia-ui-ui'] = (finalizar(juntar([ui(), ui()], 0.08), alvo=-26, mol=0.18), 'uí-uí de brinquedo, -26 dB, raro')

# ------------------------------------------------------------------ musiquinha do sorvete (original)
PPQ = 480


def vlq(n):
    b = [n & 0x7F]
    n >>= 7
    while n:
        b.append(0x80 | (n & 0x7F))
        n >>= 7
    return bytes(reversed(b))


def midi(caminho, q, canais, ev, fim):
    msgs = [(0, 0, b'\xff\x51\x03' + round(60_000_000 / q).to_bytes(3, 'big')), (0, 0, b'\xff\x58\x04' + bytes([3, 2, 24, 8]))]
    for nome, (c, prog, vol) in canais.items():
        msgs += [(0, 1, bytes([0xC0 | c, prog])), (0, 1, bytes([0xB0 | c, 7, vol])), (0, 1, bytes([0xB0 | c, 91, 70]))]
    for t, nome, nota, v, d in ev:
        c = canais[nome][0]
        msgs.append((t, 3, bytes([0x90 | c, nota, v])))
        msgs.append((t + d, 2, bytes([0x80 | c, nota, 0])))
    msgs.sort(key=lambda m: (m[0], m[1]))
    trk, ult = bytearray(), 0
    for t, _, b in msgs:
        trk += vlq(t - ult) + b
        ult = t
    trk += vlq(max(0, fim + PPQ * 6 - ult)) + b'\xff\x2f\x00'
    with open(caminho, 'wb') as f:
        f.write(b'MThd' + struct.pack('>IHHH', 6, 0, 1, PPQ))
        f.write(b'MTrk' + struct.pack('>I', len(trk)) + trk)


# valsinha em Fá maior, 16 compassos de 3/4: (nota, tempos)
MEL = [[(84, 1), (81, 1), (77, 1)], [(79, 1), (81, 1), (82, 1)], [(84, 2), (81, 1)], [(77, 3)],
       [(86, 1), (84, 1), (82, 1)], [(81, 1), (79, 1), (77, 1)], [(79, 1), (81, 1), (79, 1)], [(72, 3)],
       [(81, 1), (84, 1), (89, 1)], [(88, 1), (86, 1), (84, 1)], [(82, 1), (86, 1), (82, 1)], [(81, 3)],
       [(79, 1), (82, 1), (88, 1)], [(86, 1), (84, 1), (82, 1)], [(81, 1), (79, 1), (76, 1)], [(77, 2), (None, 1)]]
AC = {'F': (53, [65, 69, 72]), 'C7': (48, [64, 67, 70]), 'C': (48, [64, 67, 72]), 'Bb': (46, [65, 70, 74]), 'Gm': (55, [62, 67, 70])}
HARM = ['F', 'C7', 'F', 'F', 'Bb', 'F', 'C7', 'C', 'F', 'C', 'Bb', 'F', 'C7', 'Gm', 'C7', 'F']
ev = []
for b, (mel, h) in enumerate(zip(MEL, HARM)):
    t0 = b * 3 * PPQ
    t = t0
    for nota, d in mel:
        if nota: ev.append((t, 'caixinha', nota, 72 + (6 if t == t0 else 0), d * PPQ - 30))
        t += d * PPQ
    baixo, acorde = AC[h]
    ev.append((t0, 'baixo', baixo, 58, PPQ - 60))
    for k in (1, 2):
        for i, n in enumerate(acorde):
            ev.append((t0 + k * PPQ + i * 8, 'acomp', n, 34, PPQ - 80))
fim = 16 * 3 * PPQ
mid = os.path.join(midid, 'sorvete.mid')
midi(mid, 120, {'caixinha': (0, 10, 110), 'acomp': (1, 8, 70), 'baixo': (2, 45, 80)}, ev, fim)
wav = os.path.join(midid, 'sorvete.wav')
subprocess.run(['fluidsynth', '-ni', '-q', '-F', wav, '-T', 'wav', '-O', 'float', '-r', str(SR), '-g', '0.5', '-R', '1', '-C', '0',
                '-o', 'synth.reverb.room-size=0.6', '-o', 'synth.reverb.level=0.55', '/usr/share/sounds/sf2/FluidR3_GM.sf2', mid],
               check=True, stderr=subprocess.DEVNULL)
tune = dec(wav)
a = np.abs(tune)
tune = tune[: np.where(a > 1e-3)[0][-1] + int(0.1 * SR)]
tune = bordas(tune, 0.01, 1.2)
musica_sorvete = tune * 10 ** ((-30 - 20 * np.log10(np.sqrt(np.mean(tune ** 2)))) / 20)
sons['sorvete-musiquinha'] = (musica_sorvete, 'melodia original de caixinha de música, -30 dBFS (a trilha da cidade é -24,6)')

# a musiquinha chegando na praça, com a trilha da cidade de dia: chega de longe (6 s) e fica parada perto da criança
musica = dec(os.path.join(cidade, 'cidade-dia.mp3'))
D = min(len(musica_sorvete) / SR, 26.0)
n = int(D * SR)
fade = np.clip(np.arange(n) / SR / 6.0, 0, 1) ** 1.6
perto = musica_sorvete[:n] * fade * 10 ** (-1 / 20)
trilha = np.tile(musica, 2)[:n]
mixs = trilha + perto
mixs[-int(1.5 * SR):] *= np.linspace(1, 0, int(1.5 * SR)) ** 1.5
sons['sorvete-com-a-trilha'] = (mixs, 'a trilha da cidade (como no arquivo) + a musiquinha chegando à praça e parando')

# ------------------------------------------------------------------ a rua em 15 s, com a trilha da cidade (estéreo)
D = 15.0
n = int(D * SR)
rua = np.zeros((n, 2))
tr = musica[:n]
rua += np.stack([tr, tr], 1) * 0.92


def soma(st, t0, ganho_db=0):
    i = int(t0 * SR)
    s = st if st.ndim == 2 else np.stack([st, st], 1) * 0.7
    s = s * 10 ** (ganho_db / 20)
    rua[i:i + len(s)] += s[:n - i]


soma(sons['carro-passando'][0], 0.5, -8)
soma(sons['policia-passando'][0], 4.5, -10)
pas = sons['onibus-passada'][0]
soma(pas[int(5.0 * SR):], 7.0, -10)  # o ônibus chegando ao ponto, com o freio a ar no fim
soma(dec(os.path.join(cidade, 'pombo-chamado.mp3')) * 10 ** (-9 / 20), 2.0)
soma(sons['policia-ui-ui'][0], 6.2, -13)
soma(musica_sorvete[:int(6 * SR)] * np.linspace(0, 1, int(6 * SR)) * 10 ** (-12 / 20), 9.0)
rua[-int(1.5 * SR):] *= (np.linspace(1, 0, int(1.5 * SR)) ** 1.5)[:, None]
ref = np.stack([tr, tr], 1) * 0.92
ref[-int(1.5 * SR):] *= (np.linspace(1, 0, int(1.5 * SR)) ** 1.5)[:, None]
sons['trilha-sozinha-15s'] = (ref, 'referência: só a trilha, do mesmo jeito que entra na mistura da rua')
sons['rua-com-veiculos'] = (rua, 'trilha + carro passando, polícia passando com o uí-uí baixinho, ônibus chegando ao ponto (freio a ar), pombo, sorvete ao longe')

# ------------------------------------------------------------------ gravar e medir
med = {}
for nome, (x, nota) in sons.items():
    m = os.path.join(saida, nome + '.mp3')
    mp3(x, m, 64 if (x.ndim == 2 or len(x) > 8 * SR) else 48)
    lufs = subprocess.run(['ffmpeg', '-nostats', '-i', m, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    li = [l for l in lufs.splitlines() if l.strip().startswith('I:')]
    y = dec(m)
    med[nome] = dict(nota=nota, segundos=round(len(y) / SR, 2), rmsAtivoDb=round(rms_ativo(y), 1),
                     rmsDb=round(20 * np.log10(np.sqrt(np.mean(y ** 2)) + 1e-12), 1), picoDb=round(20 * np.log10(np.max(np.abs(y)) + 1e-12), 1),
                     lufs=li[-1].split()[1] if li else None, kb=round(os.path.getsize(m) / 1024, 1))
# a trilha sozinha, para comparar
lufs = subprocess.run(['ffmpeg', '-nostats', '-i', os.path.join(cidade, 'cidade-dia.mp3'), '-t', '15', '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
med['trilha-da-cidade-sozinha-15s'] = dict(lufs=[l for l in lufs.splitlines() if l.strip().startswith('I:')][-1].split()[1])
json.dump(med, open(medp, 'w'), ensure_ascii=False, indent=1)
for k, v in med.items():
    print(k, v.get('rmsAtivoDb'), v.get('lufs'), v.get('segundos'))
