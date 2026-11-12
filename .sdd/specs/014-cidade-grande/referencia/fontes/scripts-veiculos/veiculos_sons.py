"""Sons dos veículos da Cidade Grande (spec 014, T13-T15): os WAV que vão para o pacote cidade-grande-veiculos.mp3.
Tudo como no esboço aprovado (scripts/sons_veiculos_r2.py, "agora ficou perfeito os sons"), só que cru: o jogo varia a rotação
(playbackRate) e o filtro ao vivo, então os motores vão como laços de marcha lenta sem curva de RPM.
  lacoCarro    Citroën Saxo 1.1 em marcha lenta (BigSoundBank 0187, CC0), 21,0-27,5 s
  lacoOnibus   diesel Iveco Daily 3.0 (BigSoundBank 1145, CC0), 2,0-9,0 s
  lacoSorvete  motor de Ford Courier (BigSoundBank 0896, CC0), 3,0-9,5 s
  freio        freio a ar (BigSoundBank 1490, CC0), só o chiado útil
  uiui         o "uí-uí" de brinquedo da polícia (síntese, igual ao esboço)
  sorveteInteira / sorveteFrase  a valsinha do sorvete (MIDI do esboço, FluidR3_GM pelo FluidSynth, mesmos ajustes)
  buzina       o "fom-fom" de brinquedo de perto (a mesma buzina de bulbo de ambiente.buzininha, sem o filtro de longe)
  toc          batidinha de plástico de brinquedo (síntese)
Laços: laco() do esboço (cruzamento de 0,25 s) a 22 050 Hz e, no WAV, [P amostras do fim] + laço (L) + [Q amostras do começo],
P = Q = 1323, como a regra musica.laco do índice: loopStart = ini + P/taxa e loopEnd = ini + (P+L)/taxa servem com ou sem o atraso
do codificador. Nada depois disto mexe na forma do laço (o codificador só aplica um ganho).
Uso (ver rodar.sh): python3 -I veiculos_sons.py <wav> <receitas.json> <midi>   (BAIXADOS=/b com bsb/*.mp3)
"""
import sys, os, json, subprocess, struct, wave
sys.path.insert(0, '/s019')
import numpy as np
import lib
from lib import SR, filtro, banda, finalizar, juntar, osc, adsr, glide, vibrato, bordas, rms_ativo, limitar, t_

saida, receitas_p, midid = sys.argv[1:4]
os.makedirs(saida, exist_ok=True)
os.makedirs(midid, exist_ok=True)
B = os.path.join(os.environ.get('BAIXADOS', '/b'), 'bsb')
SR_ARQ = 22050
P = Q = 1323
ALVO = -23.0


def dec(p, sr, ini=None, fim=None):
    x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'],
                                     capture_output=True, check=True).stdout, np.float32).astype(np.float64)
    if ini is not None:
        x = x[int(ini * sr):int(fim * sr)]
    return x


def salvar(caminho, x, sr):
    with wave.open(caminho, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((np.clip(x, -1, 1) * 32767).round().astype('<i2').tobytes())


def normal(x, alvo=ALVO):
    for _ in range(5):
        x = x * 10 ** ((alvo - rms_ativo(x)) / 20)
        x = limitar(x)
    return x


rec = {}


def guardar(chave, x, sr, fontes, nota, kbps=48, **extra):
    if not np.isfinite(x).all() or np.max(np.abs(x)) < 1e-6:
        raise RuntimeError('sinal vazio ' + chave)
    salvar(os.path.join(saida, chave + '.wav'), x, sr)
    rec[chave] = dict(fontes=fontes, nota=nota, kbps=kbps, alvoDb=ALVO, taxaWav=sr, amostrasWav=len(x), **extra)
    print(chave, round(len(x) / sr, 3), 's', round(rms_ativo(x, sr), 1), 'dB', flush=True)


# ------------------------------------------------------------------ laços de marcha lenta (22 050 Hz, crus)
def laco(seg, cruz=0.25, sr=SR_ARQ):
    """O laco() do esboço: as últimas amostras cruzam com as primeiras; o resultado é periódico."""
    n = int(cruz * sr)
    f = np.linspace(0, 1, n)
    y = seg[:-n].copy()
    y[:n] = seg[:n] * f + seg[-n:] * (1 - f)
    return y - np.mean(y)


LACOS = {'lacoCarro': ('0187.mp3', 21.0, 27.5, 'Citroën Saxo 1.1 em marcha lenta'),
         'lacoOnibus': ('1145.mp3', 2.0, 9.0, 'diesel Iveco Daily 3.0 em marcha lenta'),
         'lacoSorvete': ('0896.mp3', 3.0, 9.5, 'motor de Ford Courier em marcha lenta')}
for chave, (arq, a, b, nome) in LACOS.items():
    y = laco(dec(os.path.join(B, arq), SR_ARQ, a, b))
    L = len(y)
    g = 10 ** ((ALVO - rms_ativo(y, SR_ARQ)) / 20)       # só ganho: o laço continua periódico
    y = y * g
    pk = np.max(np.abs(y))
    if pk > 10 ** (-1.5 / 20):
        y *= 10 ** (-1.5 / 20) / pk
    arquivo = np.concatenate([y[-P:], y, y[:Q]])
    guardar(chave, arquivo, SR_ARQ, ['bsb/' + arq], f'{nome}: laço cru de {a}-{b} s (laco() do esboço, cruzamento 0,25 s)',
            laco={'P': P, 'L': L, 'Q': Q})

# ------------------------------------------------------------------ freio a ar (o arquivo inteiro tem 0,88 s)
fr = lib.ler('bsb/1490.mp3')
guardar('freio', finalizar(fr, ent=0.004, sai=0.12, mol=0, trim=-50, alvo=ALVO), SR, ['bsb/1490.mp3'],
        'freio a ar do ônibus: o chiado útil (a gravação inteira tem 0,88 s)')


# ------------------------------------------------------------------ "uí-uí" de brinquedo (o mesmo do esboço)
def ui(dur=0.34):
    n = int(dur * SR)
    f = vibrato(glide(dur, [(0, 620), (0.45, 900), (1, 860)]), 7, 0.15)
    y = osc(f, 'sine') * 0.8 + osc(f * 2, 'sine') * 0.12
    return filtro(y, 'low', 2600, 2) * adsr(n, 0.03, 0.12)


guardar('uiui', finalizar(juntar([ui(), ui()], 0.08), alvo=ALVO, mol=0.18), SR, ['sintese'], 'uí-uí de brinquedo da polícia (síntese do esboço)')


# ------------------------------------------------------------------ buzina "fom-fom" de perto
def fom(dur, f0):
    """Um "fom" de buzina de bulbo (o mesmo de scripts-pacote/vozes_cidade.py e do esboço sons_cidade.py)."""
    n = int(dur * SR)
    f = glide(dur, [(0, f0 * 0.94), (0.15, f0), (1, f0 * 0.985)])
    y = osc(f, 'saw') * 0.6 + osc(f * 2, 'sine') * 0.25
    return banda(y, 300, 2600) * adsr(n, 0.015, 0.06)


# as mesmas notas e durações da buzininha aprovada (buzina_longe(466, 0.16, 0.26, 0.07)), sem sala grande, eco nem abafado de longe
buz = filtro(juntar([fom(0.16, 466), fom(0.26, 466)], 0.07), 'low', 3200, 2)
guardar('buzina', finalizar(buz, mol=0.08), SR, ['sintese'], 'fom-fom de brinquedo de perto (a buzina de bulbo de ambiente.buzininha)')


# ------------------------------------------------------------------ "toc" de plástico
def toc():
    r = np.random.default_rng(1414)
    t = t_(0.11)
    corpo = (np.sin(2 * np.pi * 780 * t) * np.exp(-t / 0.016) + 0.45 * np.sin(2 * np.pi * 1390 * t + 0.6) * np.exp(-t / 0.009)
             + 0.25 * np.sin(2 * np.pi * 2310 * t + 1.1) * np.exp(-t / 0.005))
    grave = 0.55 * np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.028)
    clique = banda(r.standard_normal(len(t)), 1800, 5000) * np.exp(-t / 0.0025) * 0.25
    y = (corpo + grave + clique) * (1 - np.exp(-t / 0.0006))
    return filtro(y, 'low', 5200, 2)


guardar('toc', finalizar(toc(), ent=0.001, sai=0.03, mol=0.06, trim=-45, alvo=ALVO, sala_dur=0.04), SR, ['sintese'], 'batidinha de plástico de brinquedo (síntese)')

# ------------------------------------------------------------------ musiquinha do sorvete (o MIDI do esboço)
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
CANAIS = {'caixinha': (0, 10, 110), 'acomp': (1, 8, 70), 'baixo': (2, 45, 80)}


def eventos(compassos):
    ev = []
    for b, (mel, h) in enumerate(zip(MEL[:compassos], HARM[:compassos])):
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
    return ev


def render(nome, compassos):
    mid = os.path.join(midid, nome + '.mid')
    midi(mid, 120, CANAIS, eventos(compassos), compassos * 3 * PPQ)
    wav = os.path.join(midid, nome + '.wav')
    subprocess.run(['fluidsynth', '-ni', '-q', '-F', wav, '-T', 'wav', '-O', 'float', '-r', str(SR), '-g', '0.5', '-R', '1', '-C', '0',
                    '-o', 'synth.reverb.room-size=0.6', '-o', 'synth.reverb.level=0.55', '/usr/share/sounds/sf2/FluidR3_GM.sf2', mid],
                   check=True, stderr=subprocess.DEVNULL)
    x = dec(wav, SR)
    a = np.abs(x)
    return mid, x[: np.where(a > 1e-3)[0][-1] + int(0.1 * SR)]


mid_inteira, tune = render('sorvete', 16)
# o MIDI tem de ser o mesmo do esboço (referencia/fontes/sorvete.mid, conferido no rodar.sh)
tune = bordas(tune, 0.01, 1.2)
tune = filtro(tune, 'high', 45, 2)
guardar('sorveteInteira', normal(tune), SR, ['FluidR3_GM'], 'a valsinha do sorvete inteira (16 compassos de 3/4 a 120), com a cauda do reverb', kbps=64)

# frase: os 4 primeiros compassos (6 s, terminam na tônica), renderizados sozinhos com os mesmos ajustes, e 2 s de cauda esmaecendo
_, fr4 = render('sorvete-frase', 4)
FRASE, CAUDA = 6.0, 2.0
n = int((FRASE + CAUDA) * SR)
fr4 = np.concatenate([fr4, np.zeros(max(0, n - len(fr4)))])[:n]
fr4[int(FRASE * SR):] *= np.cos(np.linspace(0, np.pi / 2, n - int(FRASE * SR))) ** 2
fr4 = filtro(bordas(fr4, 0.01, 0.02), 'high', 45, 2)
guardar('sorveteFrase', normal(fr4), SR, ['FluidR3_GM'], 'os 4 primeiros compassos da valsinha (6 s) + 2 s de cauda esmaecendo', kbps=64,
        fraseNominal=FRASE)

json.dump({'arquivos': rec, 'midi': os.path.basename(mid_inteira)}, open(receitas_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
