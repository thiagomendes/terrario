"""Amostra da trilha do festival (esboço da spec 026): rock de brinquedo dos anos 80, partitura
original desta spec (riffs e melodia escritos aqui, nada de música existente). Mesmo caminho da 019 e
da 014: MIDI escrito aqui -> FluidSynth + FluidR3_GM (licença MIT) -> ffmpeg.

Arranjo (Mi maior com o sétimo grau abaixado: E5, D5, A5, B5, os acordes de "power chord"):
  - guitarra abafada (Guitar Mutes, 28) galopando em colcheias e semicolcheias: o "chug" da época,
    baixinho, de brinquedo;
  - guitarra com distorção (Distortion, 30) nos acordes de quinta e dobrando a melodia no refrão, numa
    oitava abaixo (rodada 2: mais metal, a pedido do dono), sempre com velocidade moderada;
  - baixo de sintetizador (Synth Bass 1, 38) nas fundamentais;
  - bateria de brinquedo (kit Power, banco 128, programa 16): bumbo duplo em semicolcheias no refrão,
    tons no virado e o prato de ataque;
  - a melodia no sintetizador de serra (Saw Lead, 81), dobrada uma oitava acima pelo glockenspiel (9),
    que dá o jeito de brinquedo;
  - arpejo de sintetizador na introdução (Square Lead, 80) e a caixinha de música (10) no fim.
Forma (150 semínimas por minuto, 4/4, 1,6 s por compasso, 12 compassos + o final, ~20 s):
  1–2 introdução (arpejo, contagem nas baquetas, virada nos tons) · 3–6 o riff galopando ·
  7–10 o refrão (melodia, bumbo duplo, pratos) · 11–12 a subida e o acorde final com o brilho.
Uso: python3 -I compor_festival.py <pasta_midi>
"""
import struct
import sys
import os

PPQ = 480
Q = 150
CAUDA = PPQ * 8
SEMI = PPQ // 4
COLC = PPQ // 2
COMP = PPQ * 4


def vlq(n):
    b = [n & 0x7F]
    n >>= 7
    while n:
        b.append(0x80 | (n & 0x7F))
        n >>= 7
    return bytes(reversed(b))


def escrever(caminho, canais, ev, fim):
    """canais: nome -> (canal, programa, volume, pan, banco); ev: (tick, nome, nota, vel, dur)."""
    msgs = [(0, 0, b'\xff\x51\x03' + round(60_000_000 / Q).to_bytes(3, 'big')),
            (0, 0, b'\xff\x58\x04' + bytes([4, 2, 24, 8]))]
    for nome, (c, prog, vol, pan, banco) in canais.items():
        if banco:
            msgs.append((0, 1, bytes([0xB0 | c, 0, banco])))
        msgs += [(0, 1, bytes([0xC0 | c, prog])), (0, 1, bytes([0xB0 | c, 7, vol])),
                 (0, 1, bytes([0xB0 | c, 10, pan])), (0, 1, bytes([0xB0 | c, 91, 52])),
                 (0, 1, bytes([0xB0 | c, 93, 20]))]
    for t, nome, nota, v, d in ev:
        c = canais[nome][0]
        msgs.append((t, 3, bytes([0x90 | c, nota, max(1, min(127, v))])))
        msgs.append((t + d, 2, bytes([0x80 | c, nota, 0])))
    msgs.sort(key=lambda m: (m[0], m[1]))
    trk, ult = bytearray(), 0
    for t, _, b in msgs:
        trk += vlq(t - ult) + b
        ult = t
    trk += vlq(max(0, fim + CAUDA - ult)) + b'\xff\x2f\x00'
    with open(caminho, 'wb') as f:
        f.write(b'MThd' + struct.pack('>IHHH', 6, 0, 1, PPQ))
        f.write(b'MTrk' + struct.pack('>I', len(trk)) + trk)


CANAIS = {
    'abafada': (0, 28, 92, 40, 0),
    'drive': (1, 30, 70, 88, 0),
    'dobra': (7, 30, 64, 40, 0),
    'baixo': (2, 38, 96, 64, 0),
    'serra': (3, 81, 70, 58, 0),
    'glock': (4, 9, 66, 76, 0),
    'arpejo': (5, 80, 58, 70, 0),
    'caixinha': (6, 10, 72, 64, 0),
    'bateria': (9, 16, 104, 64, 128),
}
# acordes de quinta (fundamental na 2ª oitava): nota grave e o par para a guitarra com drive
QUINTAS = {'E': 40, 'D': 38, 'A': 45, 'B': 47, 'G': 43}
BUMBO, CAIXA, CHIMBAL, CHIMBAL_ABERTO, ATAQUE, CONDUCAO, BAQUETAS = 36, 38, 42, 46, 49, 51, 37
TONS = [50, 48, 47, 45, 43, 41]

ev = []


def nota(t, nome, n, v, d):
    ev.append((t, nome, n, v, d))


def quinta(t, raiz, v, d, oit=0):
    r = QUINTAS[raiz] + 12 + oit
    for k in (0, 7, 12):
        nota(t, 'drive', r + k, v - (6 if k else 0), d)


# ------------------------------------------------------------------ 1–2: introdução
t0 = 0
ARP = [64, 71, 76, 79, 76, 71, 64, 71]  # E, B, E, G#... no sintetizador quadrado
ARP = [64, 71, 76, 80, 83, 80, 76, 71]
for c in range(2):
    for i in range(8):
        nota(t0 + c * COMP + i * COLC, 'arpejo', ARP[i] + (0 if c == 0 else 2 if i < 4 else 0), 70 + (i % 2) * 8, COLC - 30)
# contagem nas baquetas (um, dois, três, quatro) no primeiro compasso
for i in range(4):
    nota(t0 + i * PPQ, 'bateria', BAQUETAS, 70 + i * 6, 60)
# virada nos tons no segundo compasso (semicolcheias descendo) e o baixo segurando o Mi
for i in range(16):
    tom = TONS[min(5, i // 3)]
    nota(t0 + COMP + i * SEMI, 'bateria', tom if i % 4 != 3 else CAIXA, 80 + i * 2, SEMI)
nota(t0 + COMP, 'baixo', 28, 90, COMP)
quinta(t0 + COMP + 3 * PPQ + COLC, 'E', 90, COLC)

# ------------------------------------------------------------------ 3–6: o riff galopando
# galope: colcheia + duas semicolcheias (o "pa-pa-pa" da época), abafado no Mi grave; no fim de
# cada compasso o acorde de quinta do compasso seguinte
GIRO = ['E', 'G', 'A', 'D']
for c in range(4):
    tc = t0 + (2 + c) * COMP
    for b in range(3):
        tb = tc + b * PPQ
        for k, (dt, du) in enumerate([(0, COLC), (COLC, SEMI), (COLC + SEMI, SEMI)]):
            nota(tb + dt, 'abafada', 40 if not (c == 3 and b == 2) else 38, 96 - k * 6, du - 20)
    # o último tempo: a "resposta" com o acorde de quinta
    prox = GIRO[c]
    quinta(tc + 3 * PPQ, prox, 98, PPQ - 40)
    nota(tc, 'baixo', 28, 96, COLC)
    for i in range(1, 6):
        nota(tc + i * COLC, 'baixo', 28 if i % 2 else 40, 84, COLC - 30)
    nota(tc + 3 * PPQ, 'baixo', QUINTAS[prox] - 12, 100, PPQ - 30)
    # bateria: bumbo no 1 e no 3 (com o galope), caixa no 2 e 4, chimbal em colcheias
    for i in range(8):
        nota(tc + i * COLC, 'bateria', CHIMBAL, 70 if i % 2 else 84, COLC)
    for b in (0, 2):
        nota(tc + b * PPQ, 'bateria', BUMBO, 104, COLC)
        nota(tc + b * PPQ + COLC + SEMI, 'bateria', BUMBO, 86, SEMI)
    for b in (1, 3):
        nota(tc + b * PPQ, 'bateria', CAIXA, 100, COLC)
    if c == 0:
        nota(tc, 'bateria', ATAQUE, 104, COMP)
    if c == 3:
        # virada curta para o refrão
        for i in range(4):
            nota(tc + 3 * PPQ + i * SEMI, 'bateria', TONS[i], 92 + i * 4, SEMI)

# ------------------------------------------------------------------ 7–10: o refrão
# melodia original (Mi mixolídio): (colcheia de início, nota, colcheias)
MEL = [
    [(0, 71, 1), (1, 71, 1), (2, 76, 1), (3, 78, 1), (4, 80, 2), (6, 78, 1), (7, 76, 1)],
    [(0, 78, 2), (2, 81, 2), (4, 78, 1), (5, 76, 1), (6, 74, 2)],
    [(0, 76, 2), (2, 81, 2), (4, 83, 1), (5, 81, 1), (6, 78, 1), (7, 76, 1)],
    [(0, 78, 2), (2, 78, 1), (3, 80, 1), (4, 81, 2), (6, 83, 2)],
]
REFRAO = ['E', 'D', 'A', 'B']
for c in range(4):
    tc = t0 + (6 + c) * COMP
    raiz = REFRAO[c]
    # acordes de quinta: um no 1, e repetidos em colcheias no segundo tempo de cada metade
    quinta(tc, raiz, 104, PPQ + COLC)
    quinta(tc + 2 * PPQ, raiz, 96, COLC)
    quinta(tc + 2 * PPQ + COLC, raiz, 92, COLC)
    quinta(tc + 3 * PPQ, raiz, 100, PPQ - 40)
    # baixo em colcheias na fundamental
    for i in range(8):
        nota(tc + i * COLC, 'baixo', QUINTAS[raiz] - 12, 96 if i % 2 == 0 else 82, COLC - 30)
    # bumbo duplo em semicolcheias (de brinquedo: macio), caixa no 2 e 4, condução e ataque
    for i in range(16):
        nota(tc + i * SEMI, 'bateria', BUMBO, 78 + (8 if i % 4 == 0 else 0), SEMI)
    for b in (1, 3):
        nota(tc + b * PPQ, 'bateria', CAIXA, 104, COLC)
    for i in range(4):
        nota(tc + i * PPQ, 'bateria', CONDUCAO, 76, PPQ)
    nota(tc, 'bateria', ATAQUE, 100 if c != 2 else 110, COMP)
    for (ini, n, du) in MEL[c]:
        nota(tc + ini * COLC, 'serra', n, 92, du * COLC - 40)
        nota(tc + ini * COLC, 'glock', n + 12, 78, min(du * COLC, PPQ))
        # a guitarra com distorção dobra a melodia uma oitava abaixo (o jeito metal do refrão)
        nota(tc + ini * COLC, 'dobra', n - 12, 84, du * COLC - 40)

# ------------------------------------------------------------------ 11–12: a subida e o final
tc = t0 + 10 * COMP
SUBIDA = ['A', 'B']
for c in range(2):
    raiz = SUBIDA[c]
    for i in range(8):
        quinta(tc + c * COMP + i * COLC, raiz, 84 + i * 3, COLC - 30)
        nota(tc + c * COMP + i * COLC, 'baixo', QUINTAS[raiz] - 12, 90, COLC - 30)
    for i in range(16 if c == 1 else 8):
        passo = SEMI if c == 1 else COLC
        nota(tc + c * COMP + i * passo, 'bateria', CAIXA, 70 + i * 2, passo)
    for i in range(4):
        nota(tc + c * COMP + i * PPQ, 'bateria', BUMBO, 100, COLC)
    # a melodia sobe em degraus
    for i, n in enumerate([81, 83, 85, 88] if c == 0 else [83, 86, 88, 90]):
        nota(tc + c * COMP + i * PPQ, 'serra', n - 2, 88, PPQ - 60)
        nota(tc + c * COMP + i * PPQ, 'glock', n + 10, 70, PPQ - 60)
# o acorde final (Mi, segurado) com o prato e a caixinha de música brilhando por cima
tf = tc + 2 * COMP
quinta(tf, 'E', 110, COMP * 2)
nota(tf, 'baixo', 28, 104, COMP * 2)
nota(tf, 'bateria', ATAQUE, 120, COMP * 2)
nota(tf, 'bateria', BUMBO, 120, COLC)
for i, n in enumerate([88, 92, 95, 100, 95, 100]):
    nota(tf + COLC + i * SEMI, 'caixinha', n, 84, PPQ)
    nota(tf + COLC + i * SEMI, 'glock', n, 60, PPQ)
fim = tf + COMP * 2

pasta = sys.argv[1]
os.makedirs(pasta, exist_ok=True)
escrever(os.path.join(pasta, 'festival-demo.mid'), CANAIS, ev, fim)
print('ok', len(ev), 'notas,', round(fim / PPQ * 60 / Q, 1), 's')
