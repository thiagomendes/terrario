"""O Show da Vila para o pacote do jogo (spec 026, T18): a amostra aprovada (../compor_festival.py, "rock de
brinquedo", mais metal que pop) reescrita nas regras do show do jogo (src/jogo/show.ts): 120 semínimas por minuto,
compassos de 2 s, a contagem de um compasso nas baquetas, 20 compassos (40 s) com os acordes Mi, Dó, Ré, Mi (um por
compasso, em laço: ACORDES_SHOW) e o acorde final (ACORDE_FINAL) com a caixinha de música por cima. Tudo escrito
aqui, nota por nota: nenhum riff, refrão ou banda de verdade.

Rodar tudo de novo: ver rodar.sh. Este passo: python3 -I show_compor.py <pasta_midi>
Escreve um MIDI por pedaço e show_plano.json (o que show_pacote.py precisa).

As três camadas (uma por caixa de som do palco: bateria; baixo + guitarras; teclado com o glockenspiel) têm três
pedaços cada, que o jogo encadeia no tempo do núcleo (src/audio/somVila.ts):
  verso   4 compassos, em laço: o riff galopando (compassos 0 a 7 do show, e o brinquedo livre das caixas);
  refrao  4 compassos + cauda: a melodia no sintetizador e no glockenspiel, dobrada uma oitava abaixo pela guitarra
          com distorção, o bumbo duplo macio e os acordes de quinta (compassos 8 a 15, duas vezes);
  subida  4 compassos + cauda: a subida em degraus e o compasso do chamado, segurando o Mi (16 a 19).
Pedaços soltos: a contagem (baquetas + o arpejo da introdução), um acorde curto por acorde do show (o toque no
palco), o acorde final, a batida do rádio e do rinque (bateria eletrônica, 2 compassos em laço), o "plim" do estojo
e do ladrilho e o "tum" da caixa.

O show de verdade (16 nov 2026, uns 6 min: o roteiro de src/jogo/show.ts, SETLIST e ROTEIRO). Os pedaços acima não
mudam nenhuma nota (o brinquedo livre das caixas segue com eles, e o pacote deles sai igual, byte a byte); vêm depois:
  m1 (Mi, 120): m1_solo (8 compassos: o galope por baixo, a guitarra com overdrive cantando com bend e vibrato na
      primeira volta e correndo em semicolcheias na segunda, até o Mi agudo) e m1_fim (Mi, Dó, Ré-Ré em golpes, a virada
      e o Mi segurado com o rufar dos tons).
  m2 (Lá, 140, Lá Sol Ré Lá): rock reto em colcheias (nada de galope), o gancho no sintetizador quadrado com o
      glockenspiel: m2_contagem, m2_intro, m2_verso (laço), m2_refrao, m2_ponte (meio tempo com o piano elétrico, depois
      subindo), m2_fim (Sol, Sol, Lá segurado) e os acordes do toque m2_acorde_0..2 (Lá, Sol, Ré).
  m3 (Ré, 100, Ré Sol Ré Lá): o hino de meio tempo, caixa grande no 3 e palmas no 2 e no 4 por cima da bateria inteira,
      o refrão para cantar no sintetizador de serra com o glockenspiel: m3_contagem, m3_intro, m3_verso (laço),
      m3_refrao, m3_solo, m3_chamado (laço de 2 compassos: o Ré pulsando e o prato respirando, esperando o toque),
      m3_final (o Ré cheio com a caixinha de música, ~7 s) e m3_acorde_0..2 (Ré, Sol, Lá).
  abertura (18 s na grade de 120 + a cauda do estouro) e entrada (20 s): aqui só os instrumentos; o drone, a plateia,
      as varreduras, o "zzt" do raio, o zumbido, a subida, a torcida e os fogos são síntese de show_pacote.py.
Cada pedaço novo sai em trilhas (show__<id>__<trilha>.mid: bateria, guitarra com o baixo, teclado, cama de cordas, solo;
na abertura e na entrada, cada elemento), que show_pacote.py junta na régua. Tudo escrito aqui, nota por nota.
"""
import sys, os, json, struct
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from musica_compor import escrever, hsh, vlq, PPQ  # noqa: E402

Q = 120
SR = 22050
COMP = 4 * PPQ
COLC = PPQ // 2
SEMI = PPQ // 4

# a régua do núcleo (src/jogo/show.ts), conferida pelo teste de unidade do índice
ACORDES_SHOW = [[40, 47, 52, 56, 59, 64], [36, 43, 48, 52, 55, 60], [38, 45, 50, 54, 57, 62], [40, 47, 52, 56, 59, 64]]
ACORDE_FINAL = [28, 40, 47, 52, 59, 64, 71]
GIRO = ['E', 'C', 'D', 'E']
RAIZ = {'E': 40, 'C': 36, 'D': 38}
# a nota abafada do galope (na guitarra: Mi2, Dó3, Ré3)
ABAFADA = {'E': 40, 'C': 48, 'D': 50}
TRIADE = {'E': [64, 68, 71], 'C': [60, 64, 67], 'D': [62, 66, 69]}
BUMBO, CAIXA, CHIMBAL, CHIMBAL_ABERTO, ATAQUE, CONDUCAO, BAQUETAS = 36, 38, 42, 46, 49, 51, 37
TONS = [50, 48, 47, 45, 43, 41]

CANAIS = {
    'abafada': (0, 28, 88, 44),
    'drive': (1, 30, 64, 84),
    'dobra': (7, 30, 60, 44),
    'baixo': (2, 38, 92, 64),
    'serra': (3, 81, 64, 58),
    'glock': (4, 9, 66, 76),
    'arpejo': (5, 80, 56, 70),
    'caixinha': (6, 10, 72, 64),
    'bateria': (9, 16, 100, 64),
}
CAMADA_DO_CANAL = {'bateria': 'bateria', 'abafada': 'guitarra', 'drive': 'guitarra', 'dobra': 'guitarra', 'baixo': 'guitarra',
                   'serra': 'teclado', 'glock': 'teclado', 'arpejo': 'teclado', 'caixinha': 'teclado'}


class Pedaco:
    def __init__(self):
        self.ev = []

    def n(self, t, nome, nota, v, d):
        self.ev.append((t, nome, nota, v, d))

    def quinta(self, t, raiz, v, d):
        r = RAIZ[raiz] + 12
        for k in (0, 7, 12):
            self.n(t, 'drive', r + k, v - (6 if k else 0), d)


def canais_de(ev):
    usados = {e[1] for e in ev}
    return {k: v for k, v in CANAIS.items() if k in usados}


# ------------------------------------------------------------------ a contagem (o compasso antes do primeiro tempo)
def contagem():
    p = Pedaco()
    for i in range(4):
        p.n(i * PPQ, 'bateria', BAQUETAS, 66 + i * 6, 60)
    # o arpejo da introdução da amostra, baixinho, subindo para o Mi
    for i, nota in enumerate([64, 71, 76, 80, 83, 80, 76, 71]):
        p.n(i * COLC, 'arpejo', nota, 58 + (i % 2) * 8, COLC - 30)
    # a viradinha nos tons no último tempo
    for i in range(4):
        p.n(3 * PPQ + i * SEMI, 'bateria', TONS[i + 1], 70 + i * 5, SEMI)
    return p.ev


# ------------------------------------------------------------------ verso: o riff galopando (4 compassos, em laço)
def verso(camada):
    p = Pedaco()
    for c in range(4):
        tc = c * COMP
        ac = GIRO[c]
        if camada == 'guitarra':
            # galope: colcheia + duas semicolcheias, abafado, nos três primeiros tempos; no quarto o acorde de quinta
            for b in range(3):
                for k, (dt, du) in enumerate([(0, COLC), (COLC, SEMI), (COLC + SEMI, SEMI)]):
                    p.n(tc + b * PPQ + dt, 'abafada', ABAFADA[ac], 90 - k * 6, du - 20)
            p.quinta(tc + 3 * PPQ, ac, 92, PPQ - 40)
            for i in range(8):
                p.n(tc + i * COLC, 'baixo', RAIZ[ac] - 12 + (12 if i % 2 else 0), 90 if i % 2 == 0 else 78, COLC - 30)
        elif camada == 'bateria':
            for i in range(8):
                p.n(tc + i * COLC, 'bateria', CHIMBAL, 64 if i % 2 else 78, COLC)
            for b in (0, 2):
                p.n(tc + b * PPQ, 'bateria', BUMBO, 96, COLC)
                p.n(tc + b * PPQ + COLC + SEMI, 'bateria', BUMBO, 80, SEMI)
            for b in (1, 3):
                p.n(tc + b * PPQ, 'bateria', CAIXA, 92, COLC)
            if c == 0:
                p.n(tc, 'bateria', ATAQUE, 92, COMP)
            if c == 3:
                for i in range(4):
                    p.n(tc + 3 * PPQ + i * SEMI, 'bateria', TONS[i], 84 + i * 3, SEMI)
        else:
            # teclado: o arpejo da tríade em colcheias no sintetizador quadrado, e o glockenspiel no tempo 1 e no 3
            tri = TRIADE[ac]
            ordem = [0, 1, 2, 1, 0, 1, 2, 1] if c % 2 == 0 else [0, 2, 1, 2, 0, 2, 1, 2]
            for i, k in enumerate(ordem):
                p.n(tc + i * COLC, 'arpejo', tri[k] + (12 if i in (2, 6) else 0), 62 + (i % 2) * 6, COLC - 30)
            for b in (0, 2):
                p.n(tc + b * PPQ, 'glock', tri[2] + 12, 58, PPQ)
    return p.ev


# ------------------------------------------------------------------ refrão (4 compassos + cauda)
# melodia original em Mi (colcheia de início, nota, colcheias), um compasso por acorde: Mi, Dó, Ré, Mi
MEL = [
    [(0, 71, 1), (1, 71, 1), (2, 76, 1), (3, 78, 1), (4, 80, 2), (6, 78, 1), (7, 76, 1)],
    [(0, 76, 2), (2, 79, 2), (4, 76, 1), (5, 74, 1), (6, 72, 2)],
    [(0, 78, 2), (2, 81, 2), (4, 83, 1), (5, 81, 1), (6, 78, 1), (7, 74, 1)],
    [(0, 76, 2), (2, 76, 1), (3, 78, 1), (4, 80, 2), (6, 83, 2)],
]


def refrao(camada):
    p = Pedaco()
    for c in range(4):
        tc = c * COMP
        ac = GIRO[c]
        if camada == 'guitarra':
            p.quinta(tc, ac, 96, PPQ + COLC)
            p.quinta(tc + 2 * PPQ, ac, 88, COLC)
            p.quinta(tc + 2 * PPQ + COLC, ac, 84, COLC)
            p.quinta(tc + 3 * PPQ, ac, 92, PPQ - 40)
            for i in range(8):
                p.n(tc + i * COLC, 'baixo', RAIZ[ac] - 12, 90 if i % 2 == 0 else 78, COLC - 30)
            # a guitarra com distorção dobra a melodia uma oitava abaixo (o jeito metal do refrão)
            for (ini, nota, du) in MEL[c]:
                p.n(tc + ini * COLC, 'dobra', nota - 12, 80, du * COLC - 40)
        elif camada == 'bateria':
            # bumbo duplo em semicolcheias, de brinquedo: macio
            for i in range(16):
                p.n(tc + i * SEMI, 'bateria', BUMBO, 64 + (10 if i % 4 == 0 else 0), SEMI)
            for b in (1, 3):
                p.n(tc + b * PPQ, 'bateria', CAIXA, 96, COLC)
            for i in range(4):
                p.n(tc + i * PPQ, 'bateria', CONDUCAO, 70, PPQ)
            if c in (0, 2):
                p.n(tc, 'bateria', ATAQUE, 92 if c == 0 else 84, COMP)
            if c == 3:
                for i in range(4):
                    p.n(tc + 3 * PPQ + i * SEMI, 'bateria', TONS[i + 1], 80 + i * 3, SEMI)
        else:
            for (ini, nota, du) in MEL[c]:
                p.n(tc + ini * COLC, 'serra', nota, 86, du * COLC - 40)
                p.n(tc + ini * COLC, 'glock', nota + 12, 74, min(du * COLC, PPQ))
    return p.ev


# ------------------------------------------------------------------ subida e o chamado (4 compassos + cauda)
DEGRAUS = [[76, 78, 80, 83], [79, 81, 84, 86], [81, 83, 86, 88]]


def subida(camada):
    p = Pedaco()
    for c in range(4):
        tc = c * COMP
        ac = GIRO[c]
        if camada == 'guitarra':
            if c < 3:
                for i in range(8):
                    p.quinta(tc + i * COLC, ac, 76 + c * 4 + i * 2, COLC - 30)
                    p.n(tc + i * COLC, 'baixo', RAIZ[ac] - 12, 86, COLC - 30)
            else:
                # o chamado: o Mi em semicolcheias bem macias, esperando o toque da criança
                for i in range(16):
                    p.quinta(tc + i * SEMI, 'E', 66 + (8 if i % 4 == 0 else 0), SEMI - 20)
                p.n(tc, 'baixo', RAIZ['E'] - 12, 84, COMP - 40)
        elif camada == 'bateria':
            if c < 3:
                passo = SEMI if c == 2 else COLC
                for i in range(COMP // passo):
                    p.n(tc + i * passo, 'bateria', CAIXA, 62 + c * 8 + i, passo)
                for i in range(4):
                    p.n(tc + i * PPQ, 'bateria', BUMBO, 90, COLC)
            else:
                # o rufar macio no prato de condução, crescendo, e o bumbo nos tempos
                for i in range(16):
                    p.n(tc + i * SEMI, 'bateria', CONDUCAO, 50 + i * 2, SEMI)
                for i in range(4):
                    p.n(tc + i * PPQ, 'bateria', BUMBO, 80, COLC)
        else:
            if c < 3:
                for i, nota in enumerate(DEGRAUS[c]):
                    p.n(tc + i * PPQ, 'serra', nota, 80 + c * 3, PPQ - 60)
                    p.n(tc + i * PPQ, 'glock', nota + 12, 66, PPQ - 60)
            else:
                p.n(tc, 'serra', 88, 78, COMP - 60)
                for i in range(8):
                    p.n(tc + i * COLC, 'glock', [88, 92, 95, 92][i % 4] + 12, 52 + i * 2, COLC)
    return p.ev


# ------------------------------------------------------------------ o toque no palco e o acorde final
def acorde(k):
    """O acorde do toque: a guitarra com drive descendo as cordas (as notas de ACORDES_SHOW) e o glockenspiel em cima."""
    p = Pedaco()
    notas = ACORDES_SHOW[k]
    for i, nota in enumerate(notas):
        p.n(i * 14, 'drive', nota, 84 - i * 2, PPQ + COLC)
    p.n(0, 'baixo', notas[0] - 12, 84, PPQ)
    p.n(10, 'glock', notas[-1] + 24, 70, PPQ)
    p.n(10, 'glock', notas[-2] + 24, 58, PPQ)
    return p.ev


def final():
    """O acorde final (ACORDE_FINAL, Mi em quintas), o prato, e a caixinha de música e o glockenspiel brilhando."""
    p = Pedaco()
    for i, nota in enumerate(ACORDE_FINAL[1:]):
        p.n(i * 10, 'drive', nota, 98 - i * 2, COMP * 2 - 60)
    p.n(0, 'baixo', ACORDE_FINAL[0], 96, COMP * 2)
    p.n(0, 'bateria', ATAQUE, 104, COMP * 2)
    p.n(0, 'bateria', BUMBO, 104, COLC)
    p.n(0, 'bateria', 57, 84, COMP * 2)
    for i, nota in enumerate([88, 92, 95, 100, 95, 100, 104, 100]):
        p.n(COLC + i * SEMI, 'caixinha', nota, 82, PPQ)
        p.n(COLC + i * SEMI, 'glock', nota, 56, PPQ)
    p.n(3 * PPQ, 'serra', 88, 70, COMP)
    return p.ev


# ------------------------------------------------------------------ os pedaços soltos dos brinquedos
def batida():
    """A batida do rádio gigante e do rinque: bateria eletrônica (TR-808) em 2 compassos, macia."""
    ev = []
    for c in range(2):
        tc = c * COMP
        for b in (0, 2):
            ev.append((tc + b * PPQ, 'bateria', BUMBO, 84, COLC))
        ev.append((tc + 2 * PPQ + COLC + (SEMI if c else 0), 'bateria', BUMBO, 64, SEMI))
        for b in (1, 3):
            ev.append((tc + b * PPQ, 'bateria', 39, 66, COLC))
        for i in range(8):
            ev.append((tc + i * COLC, 'bateria', CHIMBAL if i != 7 or c == 0 else CHIMBAL_ABERTO, 52 if i % 2 else 40, COLC))
        ev.append((tc + 3 * PPQ + COLC, 'bateria', 75, 60, SEMI))
    return {'bateria': (9, 25, 100, 64)}, ev


def plim_estojo():
    ev = [(0, 'glock', 88, 84, PPQ * 2), (PPQ // 3, 'glock', 95, 80, PPQ * 2), (PPQ // 3, 'cel', 100, 60, PPQ * 2)]
    return {'glock': (0, 9, 100, 64), 'cel': (1, 8, 90, 64)}, ev


def plim_ladrilho():
    return {'cel': (0, 8, 100, 64), 'vib': (1, 11, 70, 64)}, [(0, 'cel', 81, 84, PPQ), (0, 'vib', 81, 50, PPQ)]


def tum_caixa():
    # o bumbo grande do kit Power + o Mi grave do baixo de sintetizador, curtinho
    return {'bateria': (9, 16, 100, 64), 'baixo': (2, 38, 90, 64)}, [(0, 'bateria', 35, 96, PPQ), (0, 'baixo', 28, 84, PPQ // 2)]


PEDACOS_CAMADA = {'verso': verso, 'refrao': refrao, 'subida': subida}


# ================================================================== o show de verdade (uns 6 min): o que veio depois
# Tudo daqui para baixo é novo (16 nov 2026). Cada pedaço novo é gravado em trilhas separadas (bateria; guitarra e baixo;
# teclado; o solo; na abertura e na entrada, cada elemento), que show_pacote.py junta na régua das camadas da m1 (cada
# trilha no mesmo nível, o teclado 1,5 dB abaixo, o solo por cima) e põe no volume percebido do refrão da m1.
# Os pedaços da m1 lá de cima não mudam nenhuma nota (nem o MIDI): o pacote deles sai igual, byte a byte.

CANAIS2 = dict(CANAIS)
CANAIS2.update({
    'gancho': (8, 80, 84, 70),     # sintetizador quadrado (Square Lead): o gancho da m2
    'epiano': (10, 5, 84, 56),     # piano elétrico de FM (o "DX" dos anos 80)
    'cordas': (11, 50, 66, 64),    # cordas de sintetizador (Synth Strings 1): a cama
    'solo': (12, 29, 100, 60),     # guitarra com overdrive (Overdriven Guitar): os solos, com bend e vibrato
    'palheta': (13, 34, 100, 64),  # baixo de palheta (Picked Bass): a m2, reta; e o deslize da entrada
    'pad': (14, 89, 100, 64),      # pad quente (Warm Pad): o Mi grave da entrada
    'feedback': (15, 29, 96, 70),  # a guitarra "microfonando" de leve na entrada (a mesma Overdriven, crescendo)
})


def canais2(ev):
    usados = {e[1] for e in ev}
    return {k: v for k, v in CANAIS2.items() if k in usados}


def escrever_ctl(caminho, canais, ev, ctl, fim, q, rev=52, cauda=PPQ * 6, faixa_bend=None):
    """Como musica_compor.escrever, mais controles: ctl = (tick, nome, tipo, a, b), tipo 'cc' (controle a = b) ou 'pb'
    (pitch bend a, de -8192 a 8191). faixa_bend: nome -> semitons (RPN 0) do bend daquele canal (padrão 2)."""
    msgs = [(0, 0, b'\xff\x51\x03' + round(60_000_000 / q).to_bytes(3, 'big')), (0, 0, b'\xff\x58\x04' + bytes([4, 2, 24, 8]))]
    for nome, (c, prog, vol, pan) in canais.items():
        msgs += [(0, 1, bytes([0xC0 | c, prog])), (0, 1, bytes([0xB0 | c, 7, vol])), (0, 1, bytes([0xB0 | c, 10, pan])),
                 (0, 1, bytes([0xB0 | c, 91, rev])), (0, 1, bytes([0xB0 | c, 93, 0]))]
        if faixa_bend and nome in faixa_bend:
            for cc, v in ((101, 0), (100, 0), (6, faixa_bend[nome]), (38, 0), (101, 127), (100, 127)):
                msgs.append((0, 1, bytes([0xB0 | c, cc, v])))
    for t, nome, nota, v, d in ev:
        c = canais[nome][0]
        v = max(1, min(127, int(v)))
        msgs.append((t, 3, bytes([0x90 | c, nota, v])))
        msgs.append((t + max(20, int(d)), 2, bytes([0x80 | c, nota, 0])))
    for t, nome, tipo, a, b in ctl:
        c = canais[nome][0]
        if tipo == 'cc':
            msgs.append((int(t), 2, bytes([0xB0 | c, a, max(0, min(127, int(b)))])))
        else:
            v = max(0, min(16383, int(a) + 8192))
            msgs.append((int(t), 2, bytes([0xE0 | c, v & 0x7F, v >> 7])))
    msgs.sort(key=lambda m: (m[0], m[1]))
    trk, ult = bytearray(), 0
    for t, _, b in msgs:
        trk += vlq(t - ult) + b
        ult = t
    trk += vlq(max(0, fim + cauda - ult)) + b'\xff\x2f\x00'
    with open(caminho, 'wb') as f:
        f.write(b'MThd' + struct.pack('>IHHH', 6, 0, 1, PPQ))
        f.write(b'MTrk' + struct.pack('>I', len(trk)) + trk)


class Trilhas:
    """Um pedaço novo: as notas e os controles de cada trilha (bateria, guitarra, teclado, solo...), num andamento."""

    def __init__(self, q):
        self.q = q
        self.ev = {}
        self.ctl = {}

    def n(self, trilha, t, nome, nota, v, d):
        if nome == 'cordas' and trilha == 'teclado':
            trilha = 'cama'        # a cama de cordas é trilha própria: fica por baixo e não tira o lugar da melodia
        self.ev.setdefault(trilha, []).append((int(t), nome, int(nota), v, int(d)))

    def c(self, trilha, t, nome, tipo, a, b=0):
        self.ctl.setdefault(trilha, []).append((int(t), nome, tipo, a, b))

    def bat(self, t, nota, v, d=COLC):
        self.n('bateria', t, 'bateria', nota, v, d)

    def quinta(self, t, raiz, v, d, trilha='guitarra'):
        for k in (0, 7, 12):
            self.n(trilha, t, 'drive', raiz + k, v - (6 if k else 0), d)

    def seg(self, s):
        """segundos -> ticks neste andamento"""
        return round(s * self.q / 60 * PPQ)

    def melodia(self, tc, frase, nome, v, trilha='teclado', oit=0, d_menos=40, teto=200):
        """frase em semicolcheias: (início, nota, duração)."""
        for (ini, nota, du) in frase:
            if nota + oit <= teto:
                self.n(trilha, tc + ini * SEMI, nome, nota + oit, v, du * SEMI - d_menos)


def solo(T, tc0, notas, vel=100, trilha='solo', canal='solo', prof=0.28, hz=5.6):
    """A guitarra solando: notas = (semicolcheia, nota, semicolcheias[, bend de baixo em semitons[, vibrato]]).
    O bend sobe da nota de baixo até a escrita numa semicolcheia; o vibrato (pitch bend, 5,6 Hz, crescendo) entra
    depois de um terço das notas longas. Faixa do bend: 2 semitons (o padrão). Monofônico."""
    tick_s = 60 / (T.q * PPQ)
    um = 8191 / 2
    for item in notas:
        s, nota, du = item[:3]
        b = item[3] if len(item) > 3 else 0
        vib = item[4] if len(item) > 4 else du >= 4
        v = vel + (6 if s % 4 == 0 else 0) - (8 if du == 1 and s % 2 else 0)
        t0 = tc0 + s * SEMI
        d = du * SEMI
        T.c(trilha, t0, canal, 'pb', 0)
        T.n(trilha, t0, canal, nota - b, v, d - 12)
        subida = min(SEMI, d // 3) if b else 0
        if b:
            for k in range(1, 7):
                T.c(trilha, t0 + subida * k // 6, canal, 'pb', round(um * b * (1 - (1 - k / 6) ** 2)))
        if vib:
            a0 = t0 + max(subida, d // 3)
            for tt in range(a0, t0 + d - 12, 18):
                x = (tt - a0) * tick_s
                cresce = min(1.0, x / 0.25)
                T.c(trilha, tt, canal, 'pb', round(um * (b + prof * cresce * np.sin(2 * np.pi * hz * x))))
    ult = max(tc0 + it[0] * SEMI + it[2] * SEMI for it in notas)
    T.c(trilha, ult + 240, canal, 'pb', 0)


def acorde_toque(notas):
    """O acorde do toque de qualquer música: como acorde(k) da m1, com as notas daquela música."""
    p = Pedaco()
    for i, nota in enumerate(notas):
        p.n(i * 14, 'drive', nota, 84 - i * 2, PPQ + COLC)
    p.n(0, 'baixo', notas[0] - 12, 84, PPQ)
    p.n(10, 'glock', notas[-1] + 24, 70, PPQ)
    p.n(10, 'glock', notas[-2] + 24, 58, PPQ)
    return p.ev


def contagem_baquetas(T, extra):
    for i in range(4):
        T.bat(i * PPQ, BAQUETAS, 66 + i * 6, 60)
    for t, nota, v in extra:
        T.bat(t, nota, v, SEMI)


# ------------------------------------------------------------------ m1: o solo de guitarra e o fim
# O solo (8 compassos, Mi Dó Ré Mi duas vezes): a primeira volta canta (notas longas, bends e vibrato), a segunda corre
# em semicolcheias (o mesmo desenho do arpejo passando por Mi e por Dó), sobe a escala no Ré e grita o Mi agudo no fim.
SOLO_M1 = [
    [(0, 71, 6, 2, True), (6, 68, 1), (7, 71, 1), (8, 76, 6, 0, True), (14, 78, 1), (15, 80, 1)],
    [(0, 79, 3), (3, 76, 1), (4, 72, 2), (6, 76, 2), (8, 81, 2), (10, 79, 2), (12, 76, 4, 0, True)],
    [(0, 78, 2), (2, 81, 2), (4, 83, 4, 2, True), (8, 81, 2), (10, 78, 2), (12, 74, 2), (14, 76, 2)],
    [(0, 80, 6, 0, True), (6, 78, 1), (7, 76, 1), (8, 71, 4, 0, True), (12, 71, 1), (13, 73, 1), (14, 75, 1), (15, 76, 1)],
    [(i, n, 1) for i, n in enumerate([76, 80, 83, 80, 76, 80, 83, 80, 78, 80, 83, 85, 83, 80, 78, 76])],
    [(i, n, 1) for i, n in enumerate([72, 76, 79, 76, 72, 76, 79, 76, 74, 76, 79, 81, 79, 76, 74, 72])],
    [(i, n, 1) for i, n in enumerate([74, 76, 78, 79, 81, 83, 85, 86])] + [(8, 86, 2), (10, 85, 1), (11, 83, 1), (12, 85, 2),
                                                                           (14, 86, 1), (15, 87, 1)],
    [(0, 88, 6, 2, True), (6, 83, 2), (8, 80, 2), (10, 78, 2), (12, 76, 4, 0, True)],
]


def m1_solo():
    T = Trilhas(Q)
    for metade in range(2):
        for cam in ('bateria', 'guitarra', 'teclado'):
            for (t, nome, nota, v, d) in verso(cam):
                tt = t + metade * 4 * COMP
                if cam == 'bateria' and metade == 1 and nota == CHIMBAL:
                    nota, v = CONDUCAO, v - 4          # a segunda volta no prato de condução: sobe a energia
                if cam == 'guitarra' and nome == 'abafada':
                    v -= 8                             # o galope um pouco atrás, para o solo cantar
                if cam == 'teclado':
                    if nome == 'glock':
                        continue                       # o glockenspiel sai: o solo não briga com ele
                    v -= 10
                T.n(cam, tt, nome, nota, v, d)
        if metade == 1:
            T.bat(4 * COMP, ATAQUE, 90, COMP)
    for c in range(8):
        for k in TRIADE[GIRO[c % 4]]:
            T.n('teclado', c * COMP, 'cordas', k - 12, 54, COMP - 30)
    for c, frase in enumerate(SOLO_M1):
        solo(T, c * COMP, frase)
    return T


def m1_fim():
    """O fim da m1: Mi, Mi, Si-Si em golpes (o jeito rock de pousar: quinto grau e volta), a virada nos tons e o Mi
    grande segurado."""
    T = Trilhas(Q)
    raiz = {'E': 52, 'B': 47}
    golpes = [(0, 'E', COLC, 100, ATAQUE), (PPQ, 'E', COLC, 94, 57), (2 * PPQ, 'B', SEMI + 40, 92, 55), (2 * PPQ + COLC, 'B', COLC, 96, None)]
    TRIADE_B = {'E': TRIADE['E'], 'B': [63, 66, 71]}
    for t, ac, d, v, prato in golpes:
        T.quinta(t, raiz[ac], v, d)
        T.n('guitarra', t, 'baixo', raiz[ac] - 24, 92, d)
        T.bat(t, BUMBO, 100)
        T.bat(t, CAIXA, 90)
        if prato:
            T.bat(t, prato, 86, PPQ)
        T.n('teclado', t, 'serra', TRIADE_B[ac][2] + 12, 80, d)
        T.n('teclado', t, 'glock', TRIADE_B[ac][2] + 12, 64, d)
    for i in range(4):
        T.bat(3 * PPQ + i * SEMI, TONS[i + 1], 84 + i * 4, SEMI)
    # o último golpe, segurado: o Mi cheio (as seis cordas), o baixo, os pratos e o brilho do glockenspiel
    t = COMP
    for i, nota in enumerate(ACORDES_SHOW[0]):
        T.n('guitarra', t + i * 12, 'drive', nota, 100 - i * 2, COMP + PPQ * 2)
    T.n('guitarra', t, 'baixo', 28, 100, COMP + PPQ * 2)
    T.n('guitarra', t, 'dobra', 52, 80, COMP + PPQ * 2)
    T.bat(t, ATAQUE, 108, COMP * 2)
    T.bat(t, 57, 96, COMP * 2)
    T.bat(t, BUMBO, 110)
    T.bat(t, 35, 100)
    # o rufar nos tons, descendo e sumindo (o baterista segura o fim com a banda)
    for i in range(12):
        T.bat(t + PPQ + i * SEMI, TONS[2 + (i // 3) % 4], 74 - i * 4, SEMI)
    T.n('teclado', t, 'serra', 88, 80, COMP + PPQ)
    T.n('teclado', t, 'cordas', 64, 70, COMP + PPQ * 2)
    T.n('teclado', t, 'cordas', 71, 66, COMP + PPQ * 2)
    for i, nota in enumerate([88, 92, 95, 100]):
        T.n('teclado', t + i * SEMI, 'glock', nota, 70 - i * 4, PPQ)
    return T


# ------------------------------------------------------------------ m2: rock reto e rápido em Lá a 140 (Lá, Sol, Ré, Lá)
Q2 = 140
M2_ACORDES = [[45, 52, 57, 61, 64, 69], [43, 50, 55, 59, 62, 67], [38, 45, 50, 54, 57, 62]]
M2_GIRO = ['A', 'G', 'D', 'A']
M2_RAIZ = {'A': 45, 'G': 43, 'D': 50}      # a quinta da guitarra (raiz, quinta, oitava)
M2_BAIXO = {'A': 33, 'G': 31, 'D': 38}
M2_TRIADE = {'A': [57, 61, 64], 'G': [55, 59, 62], 'D': [54, 57, 62]}
# o gancho (semicolcheias): sobe da terça até a oitava, segura a sétima maior no contratempo ("dó# mi LÁ sol#——") e
# pousa na sexta; o Sol repete o desenho um tom abaixo, o Ré sobe até o Lá e desce, e o Lá responde ("mi —— lá sol# lá").
# O verso só cochicha um pedacinho dele.
GANCHO_M2 = [
    [(0, 73, 2), (2, 76, 2), (4, 81, 2), (6, 80, 4), (10, 76, 2), (12, 78, 4)],
    [(0, 71, 2), (2, 74, 2), (4, 79, 2), (6, 78, 4), (10, 74, 2), (12, 76, 4)],
    [(0, 69, 2), (2, 74, 2), (4, 78, 2), (6, 81, 4), (10, 78, 2), (12, 76, 2), (14, 73, 2)],
    [(0, 76, 4), (4, 81, 2), (6, 80, 2), (8, 81, 8)],
]
PONTE_M2 = [
    [(0, 76, 8), (8, 73, 8)],
    [(0, 74, 12), (12, 71, 4)],
    [(0, 69, 8), (8, 74, 4), (12, 78, 4)],
    [(0, 76, 16)],
    [(0, 73, 2), (2, 76, 2), (4, 81, 2), (8, 73, 2), (10, 76, 2), (12, 81, 4)],
    [(0, 71, 2), (2, 74, 2), (4, 79, 2), (8, 71, 2), (10, 74, 2), (12, 79, 4)],
    [(0, 74, 2), (2, 76, 2), (4, 78, 2), (6, 79, 2), (8, 81, 2), (10, 83, 2), (12, 85, 2), (14, 86, 2)],
    [(0, 88, 12)],
]


def m2_batida(T, tc, c, refrao, ultimo):
    pratos = CONDUCAO if refrao else CHIMBAL
    for i in range(8):
        T.bat(tc + i * COLC, pratos, (74 if i % 2 == 0 else 60) - (0 if refrao else 2), COLC)
    bumbos = [0, 3, 4, 7] if refrao else ([0, 4, 5] if c % 2 == 0 else [0, 3, 4])
    for i in bumbos:
        T.bat(tc + i * COLC, BUMBO, 96 if i in (0, 4) else 82)
    T.bat(tc + 2 * COLC, CAIXA, 98)
    if ultimo:
        for i in range(4):
            T.bat(tc + 3 * PPQ + i * SEMI, TONS[i + 1] if refrao else CAIXA, 76 + i * 6, SEMI)
    else:
        T.bat(tc + 6 * COLC, CAIXA, 98)


def m2_verso():
    T = Trilhas(Q2)
    for c in range(4):
        tc = c * COMP
        ac = M2_GIRO[c]
        m2_batida(T, tc, c, False, c == 3)
        if c == 0:
            T.bat(tc, ATAQUE, 80, COMP)
        # guitarra: o golpe de quinta no 1 e as colcheias abafadas na raiz, retas (nada de galope)
        T.quinta(tc, M2_RAIZ[ac], 92, COLC - 20)
        for i in range(1, 8):
            T.n('guitarra', tc + i * COLC, 'abafada', M2_RAIZ[ac], 86 if i % 2 == 0 else 76, COLC - 30)
        for i in range(8):
            T.n('guitarra', tc + i * COLC, 'palheta', M2_BAIXO[ac], 92 if i % 2 == 0 else 80, COLC - 30)
        for k in M2_TRIADE[ac]:
            T.n('teclado', tc, 'cordas', k, 52, COMP - 30)
            T.n('teclado', tc, 'epiano', k + 12, 62, COLC)
            T.n('teclado', tc + 3 * COLC, 'epiano', k + 12, 56, COLC)
    # a respostinha do sintetizador no fim do 2.º e do 4.º compasso
    T.melodia(COMP, [(10, 74, 2), (12, 76, 2), (14, 79, 2)], 'gancho', 62)
    T.melodia(3 * COMP, [(10, 76, 2), (12, 78, 2), (14, 81, 2)], 'gancho', 66)
    return T


def m2_refrao():
    T = Trilhas(Q2)
    for c in range(4):
        tc = c * COMP
        ac = M2_GIRO[c]
        m2_batida(T, tc, c, True, c == 3)
        if c in (0, 2):
            T.bat(tc, ATAQUE, 92 if c == 0 else 84, COMP)
        for i, du, v in ((0, 3, 96), (3, 1, 88), (4, 2, 92), (6, 1, 86), (7, 1, 88)):
            T.quinta(tc + i * COLC, M2_RAIZ[ac], v, du * COLC - 30)
        for i in range(8):
            T.n('guitarra', tc + i * COLC, 'palheta', M2_BAIXO[ac] + (12 if i == 7 else 0), 94 if i % 2 == 0 else 82, COLC - 30)
        for k in M2_TRIADE[ac]:
            T.n('teclado', tc, 'cordas', k, 58, COMP - 30)
        T.melodia(tc, GANCHO_M2[c], 'gancho', 92)
        T.melodia(tc, GANCHO_M2[c], 'glock', 70, oit=12, teto=96)
    return T


def m2_intro():
    T = Trilhas(Q2)
    T.quinta(0, M2_RAIZ['A'], 96, COMP - 40)
    T.n('guitarra', 0, 'palheta', 33, 94, COMP - 40)
    T.bat(0, ATAQUE, 92, COMP)
    T.bat(0, BUMBO, 100)
    for i in range(1, 8):
        T.bat(i * COLC, CHIMBAL, 66 if i % 2 == 0 else 54, COLC)
    for b in (1, 2, 3):
        T.bat(b * PPQ, BUMBO, 78 + b * 3)
    tc = COMP
    for i in range(8):
        T.n('guitarra', tc + i * COLC, 'abafada', M2_RAIZ['A'], 70 + i * 4, COLC - 30)
        T.n('guitarra', tc + i * COLC, 'palheta', 33, 84 + i * 2, COLC - 30)
        T.bat(tc + i * COLC, CAIXA, 56 + i * 6, COLC)
        if i % 2 == 0:
            T.bat(tc + i * COLC, BUMBO, 90)
    T.bat(tc + 7 * COLC + SEMI, TONS[1], 92, SEMI)
    for k in M2_TRIADE['A']:
        T.n('teclado', 0, 'cordas', k, 56, 2 * COMP - 30)
    T.melodia(0, GANCHO_M2[0], 'gancho', 92)
    T.melodia(0, GANCHO_M2[0], 'glock', 70, oit=12, teto=96)
    T.melodia(COMP, GANCHO_M2[3], 'gancho', 92)
    T.melodia(COMP, GANCHO_M2[3], 'glock', 70, oit=12, teto=96)
    return T


def m2_ponte():
    """8 compassos: quatro em meio tempo (piano elétrico, cordas, a melodia larga), quatro subindo até o refrão."""
    T = Trilhas(Q2)
    for c in range(8):
        tc = c * COMP
        ac = M2_GIRO[c % 4]
        tri = M2_TRIADE[ac]
        arp = [tri[0], tri[1], tri[2], tri[0] + 12, tri[2], tri[1], tri[0], tri[1]]
        for i, nota in enumerate(arp):
            T.n('teclado', tc + i * COLC, 'epiano', nota + 12, (62 if c < 4 else 66) + (6 if i % 4 == 0 else 0), COLC + 60)
        for k in tri:
            T.n('teclado', tc, 'cordas', k, 56 if c < 4 else 60, COMP - 30)
        T.melodia(tc, PONTE_M2[c], 'gancho', 80 if c < 4 else 88)
        T.melodia(tc, PONTE_M2[c], 'glock', 60 if c < 4 else 66, oit=12, teto=96)
        if c < 4:
            # meio tempo: bumbo no 1, caixa no 3, chimbal em semínimas
            T.bat(tc, BUMBO, 88)
            T.bat(tc + 3 * COLC, BUMBO, 66)
            T.bat(tc + 2 * PPQ, CAIXA, 90)
            for b in range(4):
                T.bat(tc + b * PPQ, CHIMBAL, 56, COLC)
            if c == 0:
                T.bat(tc, ATAQUE, 74, COMP)
            if c == 3:
                T.bat(tc + 3 * PPQ, TONS[2], 74, COLC)
                T.bat(tc + 3 * PPQ + COLC, TONS[4], 80, COLC)
            T.quinta(tc, M2_RAIZ[ac], 72, COMP - 40)
            for b in (0, 2):
                T.n('guitarra', tc + b * PPQ, 'palheta', M2_BAIXO[ac], 86, 2 * PPQ - 40)
        else:
            k = c - 4
            for i in range(8):
                T.bat(tc + i * COLC, CHIMBAL if k < 3 else CONDUCAO, 58 + k * 4 + (8 if i % 2 == 0 else 0), COLC)
            for b in ((0, 2) if k == 0 else (0, 1, 2, 3)):
                T.bat(tc + b * PPQ, BUMBO, 84 + k * 4)
            if k < 2:
                T.bat(tc + PPQ, CAIXA, 80 + k * 8)
                T.bat(tc + 3 * PPQ, CAIXA, 80 + k * 8)
            elif k == 2:
                for i in range(8):
                    T.bat(tc + i * COLC, CAIXA, 62 + i * 4, COLC)
            else:
                for i in range(16):
                    T.bat(tc + i * SEMI, CAIXA, 64 + i * 3, SEMI)
            for i in range(8):
                v = 66 + k * 9 + i
                if k < 3:
                    T.n('guitarra', tc + i * COLC, 'abafada', M2_RAIZ[ac], v, COLC - 30)
                else:
                    T.quinta(tc + i * COLC, M2_RAIZ[ac], v, COLC - 30)
                T.n('guitarra', tc + i * COLC, 'palheta', M2_BAIXO[ac], 82 + k * 3, COLC - 30)
    return T


def m2_fim():
    """O fim da m2: a resposta do gancho com a banda inteira, e Sol, Sol, Lá segurado (o jeito rock de pousar)."""
    T = Trilhas(Q2)
    m2_batida(T, 0, 0, True, True)
    T.bat(0, ATAQUE, 92, COMP)
    for i, du, v in ((0, 3, 96), (3, 1, 88), (4, 2, 92), (6, 1, 86)):
        T.quinta(i * COLC, M2_RAIZ['A'], v, du * COLC - 30)
    for i in range(7):
        T.n('guitarra', i * COLC, 'palheta', 33, 94 if i % 2 == 0 else 82, COLC - 30)
    resposta = [(0, 76, 4), (4, 81, 2), (6, 80, 2), (8, 81, 4)]
    T.melodia(0, resposta, 'gancho', 92)
    T.melodia(0, resposta, 'glock', 70, oit=12)
    for k in M2_TRIADE['A']:
        T.n('teclado', 0, 'cordas', k, 58, COMP - 30)
    tc = COMP
    for t in (tc, tc + PPQ):
        T.quinta(t, M2_RAIZ['G'], 98, COLC - 20)
        T.n('guitarra', t, 'palheta', 31, 96, COLC - 20)
        T.bat(t, BUMBO, 104)
        T.bat(t, CAIXA, 94)
        T.bat(t, 55, 80, PPQ)
        T.n('teclado', t, 'gancho', 79, 88, COLC - 20)
        T.n('teclado', t, 'glock', 91, 64, COLC - 20)
    t = tc + 2 * PPQ
    for i, nota in enumerate(M2_ACORDES[0]):
        T.n('guitarra', t + i * 12, 'drive', nota, 100 - i * 2, COMP + PPQ)
    T.n('guitarra', t, 'palheta', 33, 100, COMP + PPQ)
    T.bat(t, ATAQUE, 108, COMP * 2)
    T.bat(t, 57, 96, COMP * 2)
    T.bat(t, BUMBO, 110)
    T.bat(t, 35, 100)
    for i in range(8):
        T.bat(t + PPQ + i * SEMI, [50, 48, 47, 45, 43, 41, 41, 41][i], 76 - i * 5, SEMI)
    T.n('teclado', t, 'gancho', 81, 88, COMP)
    for k in (69, 73, 76, 81):
        T.n('teclado', t, 'cordas', k, 66, COMP + PPQ)
    for i, nota in enumerate([81, 85, 88, 93]):
        T.n('teclado', t + i * SEMI, 'glock', nota, 72 - i * 3, PPQ)
    return T


# ------------------------------------------------------------------ m3: o hino de meio tempo em Ré a 100 (Ré, Sol, Ré, Lá)
Q3 = 100
M3_ACORDES = [[38, 45, 50, 54, 57, 62], [43, 50, 55, 59, 62, 67], [45, 52, 57, 61, 64, 69]]
M3_GIRO = ['D', 'G', 'D', 'A']
M3_RAIZ = {'D': 38, 'G': 43, 'A': 45}
M3_BAIXO = {'D': 26, 'G': 31, 'A': 33}
M3_TRIADE = {'D': [62, 66, 69], 'G': [62, 67, 71], 'A': [61, 64, 69]}
PALMAS = 39
# o refrão para cantar junto (semicolcheias): salta do Ré agudo para o Lá, borda e desce até o Fá#; o Sol repete o
# desenho uma terça abaixo; o Ré sobe de volta até o Ré agudo e o Lá pousa. O verso, mais baixo, no piano elétrico,
# desce em degraus e responde subindo no Sol.
REFRAO_M3 = [
    [(0, 86, 4), (4, 81, 4), (8, 83, 2), (10, 81, 2), (12, 78, 4)],
    [(0, 83, 4), (4, 79, 4), (8, 81, 2), (10, 79, 2), (12, 74, 4)],
    [(0, 78, 4), (4, 81, 4), (8, 86, 6), (14, 85, 2)],
    [(0, 88, 6), (6, 85, 2), (8, 81, 8)],
]
VERSO_M3 = [
    [(0, 74, 4), (4, 78, 2), (6, 79, 2), (8, 74, 4), (12, 69, 4)],
    [(0, 71, 4), (4, 74, 4), (8, 79, 6), (14, 78, 2)],
    [(0, 81, 4), (4, 78, 2), (6, 76, 2), (8, 74, 4), (12, 76, 4)],
    [(0, 76, 6), (6, 73, 2), (8, 69, 8)],
]
SOLO_M3 = [
    [(0, 78, 6, 2, True), (6, 74, 2), (8, 81, 6, 0, True), (14, 79, 1), (15, 78, 1)],
    [(0, 79, 4, 0, True), (4, 83, 4, 2, True), (8, 86, 6, 0, True), (14, 83, 1), (15, 81, 1)],
    [(i, n, 1) for i, n in enumerate([78, 81, 86, 81, 78, 81, 86, 88])] + [(8, 90, 8, 2, True)],
    [(0, 88, 2), (2, 85, 2), (4, 81, 2), (6, 76, 2), (8, 81, 8, 0, True)],
]


def m3_batida(T, tc, c, forte, ultimo):
    """meio tempo: bumbo no 1 (e no 2 e meio), a caixa grande no 3, as palmas no 2 e no 4, chimbal ou condução em colcheias."""
    pratos = CONDUCAO if forte else CHIMBAL
    for i in range(8):
        T.bat(tc + i * COLC, pratos, (70 if i % 2 == 0 else 56) + (2 if forte else 0), COLC)
    T.bat(tc, BUMBO, 98)
    T.bat(tc + 3 * COLC, BUMBO, 80)
    if forte:
        T.bat(tc + 5 * COLC, BUMBO, 78)
    T.bat(tc + 2 * PPQ, CAIXA, 100)
    for b in (1, 3):
        T.bat(tc + b * PPQ, PALMAS, 92 if forte else 86, COLC)
    if ultimo:
        for i in range(4):
            T.bat(tc + 3 * PPQ + i * SEMI, TONS[i + 1], 76 + i * 5, SEMI)


def m3_verso():
    T = Trilhas(Q3)
    for c in range(4):
        tc = c * COMP
        ac = M3_GIRO[c]
        m3_batida(T, tc, c, False, c == 3)
        if c == 0:
            T.bat(tc, ATAQUE, 76, COMP)
        T.quinta(tc, M3_RAIZ[ac], 84, 2 * PPQ - 40)
        T.quinta(tc + 2 * PPQ, M3_RAIZ[ac], 78, 2 * PPQ - 40)
        for b in range(4):
            T.n('guitarra', tc + b * PPQ, 'baixo', M3_BAIXO[ac] + 12, 88 if b % 2 == 0 else 80, PPQ - 40)
        for k in M3_TRIADE[ac]:
            T.n('teclado', tc, 'cordas', k - 12, 52, COMP - 30)
        T.melodia(tc, VERSO_M3[c], 'epiano', 88, oit=0)
        T.melodia(tc, VERSO_M3[c], 'glock', 52, oit=12)
    return T


def m3_refrao(T=None, tc0=0, melodia=True, ultimo_fill=True):
    T = T or Trilhas(Q3)
    for c in range(4):
        tc = tc0 + c * COMP
        ac = M3_GIRO[c]
        m3_batida(T, tc, c, True, ultimo_fill and c == 3)
        T.bat(tc, ATAQUE, 90 if c % 2 == 0 else 78, COMP)
        T.quinta(tc, M3_RAIZ[ac], 96, 2 * PPQ - 30)
        for i, v in ((4, 88), (5, 80), (6, 86), (7, 80)):
            T.quinta(tc + i * COLC, M3_RAIZ[ac], v, COLC - 30)
        for i in range(8):
            T.n('guitarra', tc + i * COLC, 'baixo', M3_BAIXO[ac] + 12, 92 if i % 2 == 0 else 80, COLC - 30)
        for k in M3_TRIADE[ac]:
            T.n('teclado', tc, 'cordas', k, 58, COMP - 30)
        if melodia:
            T.melodia(tc, REFRAO_M3[c], 'serra', 90)
            T.melodia(tc, REFRAO_M3[c], 'glock', 72, oit=12)
            # a guitarra com distorção dobra o refrão uma oitava abaixo (o mesmo jeito metal da m1)
            T.melodia(tc, REFRAO_M3[c], 'dobra', 74, oit=-12, trilha='guitarra')
    return T


def m3_intro():
    T = Trilhas(Q3)
    for i, nota in enumerate(M3_ACORDES[0]):
        T.n('guitarra', i * 12, 'drive', nota, 96 - i * 2, COMP - 40)
    T.n('guitarra', 0, 'baixo', 38, 96, COMP - 40)
    T.bat(0, ATAQUE, 96, COMP)
    T.bat(0, BUMBO, 104)
    T.bat(0, 35, 96)
    T.melodia(0, REFRAO_M3[0], 'serra', 88)
    T.melodia(0, REFRAO_M3[0], 'glock', 70, oit=12)
    for k in M3_TRIADE['D']:
        T.n('teclado', 0, 'cordas', k, 60, 2 * COMP - 30)
    tc = COMP
    for b in (0, 2):
        T.bat(tc + b * PPQ, BUMBO, 92)
    for b in (1, 3):
        T.bat(tc + b * PPQ, PALMAS, 88, COLC)
    for i in range(6):
        T.bat(tc + i * COLC, CHIMBAL, 60 + i * 2, COLC)
    for i in range(4):
        T.bat(tc + 3 * PPQ + i * SEMI, TONS[i + 1], 78 + i * 5, SEMI)
    for i in range(8):
        T.n('guitarra', tc + i * COLC, 'abafada', 50, 66 + i * 4, COLC - 30)
    for b in range(4):
        T.n('guitarra', tc + b * PPQ, 'baixo', 38, 86, PPQ - 40)
    T.melodia(tc, [(0, 76, 4), (4, 74, 4), (8, 69, 8)], 'serra', 82)
    T.melodia(tc, [(0, 76, 4), (4, 74, 4), (8, 69, 8)], 'glock', 62, oit=12)
    return T


def m3_solo():
    T = Trilhas(Q3)
    for c in range(4):
        tc = c * COMP
        ac = M3_GIRO[c]
        m3_batida(T, tc, c, True, c == 3)
        if c in (0, 2):
            T.bat(tc, ATAQUE, 86, COMP)
        T.quinta(tc, M3_RAIZ[ac], 86, 2 * PPQ - 30)
        for i, v in ((4, 80), (5, 72), (6, 78), (7, 72)):
            T.quinta(tc + i * COLC, M3_RAIZ[ac], v, COLC - 30)
        for i in range(8):
            T.n('guitarra', tc + i * COLC, 'baixo', M3_BAIXO[ac] + 12, 90 if i % 2 == 0 else 78, COLC - 30)
        for k in M3_TRIADE[ac]:
            T.n('teclado', tc, 'cordas', k, 58, COMP - 30)
    for c, frase in enumerate(SOLO_M3):
        solo(T, c * COMP, frase, vel=102)
    return T


def m3_chamado():
    """2 compassos em laço: o Ré segurado e pulsando de leve, o prato de condução respirando (sobe e desce: a emenda não
    aparece) e o glockenspiel chamando; espera o toque da criança, e some no acorde final."""
    T = Trilhas(Q3)
    for c in range(2):
        tc = c * COMP
        for i, v in enumerate([72, 58, 64, 58, 68, 58, 64, 58]):
            T.quinta(tc + i * COLC, M3_RAIZ['D'], v, COLC - 30)
        T.n('guitarra', tc, 'baixo', 38, 84, COMP - 30)
        for k in M3_TRIADE['D']:
            T.n('teclado', tc, 'cordas', k, 62, COMP - 30)
        figura = [86, 90, 93, 98] if c == 0 else [98, 93, 90, 86]
        for i, nota in enumerate(figura):
            T.n('teclado', tc + i * COLC, 'glock', nota, 56 + i * 2, COLC)
        T.n('teclado', tc + 2 * PPQ, 'serra', 81 if c == 0 else 78, 64, 2 * PPQ - 60)
        for b in (0, 2):
            T.bat(tc + b * PPQ, BUMBO, 78)
        for b in (1, 3):
            T.bat(tc + b * PPQ, PALMAS, 70, COLC)
    for i in range(32):
        T.bat(i * SEMI, CONDUCAO, 30 + 52 * np.sin(np.pi * i / 32) ** 2, SEMI)
    T.bat(16 * SEMI, ATAQUE, 58, COMP)
    return T


def m3_final():
    """O acorde final do show: o Ré cheio, os pratos, o baixo bem grave, e a caixinha de música e o glockenspiel
    brilhando por cima (como o final da m1, agora em Ré), tocando uns 7 s."""
    T = Trilhas(Q3)
    for i, nota in enumerate(M3_ACORDES[0] + [66]):
        T.n('guitarra', i * 10, 'drive', nota, 100 - i * 2, COMP * 2 - 60)
    T.n('guitarra', 0, 'dobra', 50, 84, COMP * 2 - 60)
    T.n('guitarra', 0, 'baixo', 26, 98, COMP * 2)
    T.n('guitarra', 0, 'baixo', 38, 80, COMP * 2)
    T.bat(0, ATAQUE, 106, COMP * 2)
    T.bat(0, 57, 94, COMP * 2)
    T.bat(0, BUMBO, 108)
    T.bat(0, 35, 100)
    for i, nota in enumerate([86, 90, 93, 98, 93, 98, 102, 98]):
        T.n('teclado', COLC + i * SEMI, 'caixinha', nota, 82, PPQ)
        T.n('teclado', COLC + i * SEMI, 'glock', nota, 56, PPQ)
    for k in (62, 66, 69, 74):
        T.n('teclado', 0, 'cordas', k, 70, COMP * 2)
    T.n('teclado', 3 * PPQ, 'serra', 86, 72, COMP)
    return T


# ------------------------------------------------------------------ a abertura (18 s + a cauda) e a entrada (20 s)
# Na grade de 120 (tempo de 0,5 s, compasso de 2 s), nas horas de src/jogo/show.ts: escuro até ESCURO_INTRO (2,5 s), as
# caixas pulsando em cada tempo até o raio (RAIO_ACENDE, 10 s) e além, as quatro batidas de CONTA_INTRO (14, 15, 16,
# 17 s) e o estouro no fim da abertura (18 s). O drone, a plateia, o "fffuu" das varreduras, o "zzt" do raio, o zumbido
# e a subida são síntese nossa (show_pacote.py); aqui ficam os instrumentos, cada grupo numa trilha.
def abertura():
    T = Trilhas(Q)
    s = T.seg
    # as caixas pulsando: bumbo, o Mi grave do baixo de sintetizador e um toquinho do quadrado em cada tempo, de 2,5 s
    # até o raio (10 s); dali até as batidas ficam o raio, o zumbido e a subida
    n_pulsos = int((10 - 2.5) / 0.5)
    for k in range(n_pulsos):
        t = s(2.5 + 0.5 * k)
        f = k / (n_pulsos - 1)
        T.n('pulso', t, 'bateria', BUMBO, 72 + 22 * f, COLC)
        T.n('pulso', t, 'baixo', 28, 80 + 14 * f, COLC - 60)
        T.n('pulso', t, 'arpejo', 52, 46 + 22 * f, SEMI + 40)
        T.n('pulso', t, 'arpejo', 59, 42 + 20 * f, SEMI + 40)
    # as quatro batidas, cada uma mais alta: Mi, Sol, Lá, Si; tons subindo e o glockenspiel subindo junto
    for i, (tt, raiz, tom, gl) in enumerate(zip((14, 15, 16, 17), (40, 43, 45, 47), (41, 45, 48, 50), (76, 79, 81, 83))):
        t = s(tt)
        for k in (0, 7, 12):
            T.n('conta', t, 'drive', raiz + k, 90 + i * 4 - (6 if k else 0), s(0.45))
        T.n('conta', t, 'baixo', raiz - 12, 92 + i * 3, s(0.45))
        T.n('conta', t, 'bateria', BUMBO, 98 + i * 4, COLC)
        T.n('conta', t, 'bateria', tom, 92 + i * 4, COLC)
        T.n('conta', t, 'bateria', 55, 66 + i * 6, PPQ)
        T.n('conta', t, 'glock', gl, 80 + i * 3, PPQ)
    for i in range(4):
        T.n('conta', s(17.5) + i * SEMI, 'bateria', CAIXA, 70 + i * 10, SEMI)
    # o estouro: o Mi cheio, o baixo, os dois pratos, os bumbos, o brilho em cima; tocando uns 4 s para dentro da entrada
    t = s(18)
    for i, nota in enumerate(ACORDES_SHOW[0]):
        T.n('boom', t + i * 12, 'drive', nota, 104 - i * 2, s(3.6))
    T.n('boom', t, 'dobra', 52, 86, s(3.6))
    T.n('boom', t, 'baixo', 28, 104, s(3.6))
    T.n('boom', t, 'bateria', ATAQUE, 112, s(4))
    T.n('boom', t, 'bateria', 57, 100, s(4))
    T.n('boom', t, 'bateria', BUMBO, 112, COLC)
    T.n('boom', t, 'bateria', 35, 104, COLC)
    T.n('boom', t, 'glock', 88, 84, PPQ * 2)
    T.n('boom', t + SEMI, 'glock', 95, 74, PPQ * 2)
    for k in (64, 68, 71, 76):
        T.n('boom', t, 'cordas', k, 72, s(3.4))
    return T


def entrada():
    """20 s (de 18 a 38 s do show): o Mi grave do pad; a guitarra crescendo de leve ("microfonia" mansa) a partir de 8 s
    (26 s do show), o baixo deslizando em 10 s (28 s), as viradas do baterista de 14 s (32 s), o prato crescendo de 18 s
    até 20 s (38 s, quando entra a contagem da m1). A plateia é síntese (show_pacote.py)."""
    T = Trilhas(Q)
    s = T.seg
    # o pad: Mi, Si, Mi, entrando por baixo do estouro e saindo antes da contagem
    for k in (40, 47, 52):
        T.n('pad', 0, 'pad', k, 96, s(20.4))
    for i in range(0, 211):
        x = i * 0.1
        e = min(1.0, x / 3.0) * (1.0 if x < 18.6 else max(0.0, 1 - (x - 18.6) / 1.8))
        T.c('pad', s(x), 'pad', 'cc', 11, round(110 * e))
    # a guitarra no palco: duas notas crescendo (Si, depois Mi) com vibrato, e um acorde de quinta tocado de leve
    for (ini, nota, dur) in ((8.0, 71, 3.6), (12.0, 76, 3.2)):
        T.n('guitarra', s(ini), 'feedback', nota, 92, s(dur))
        for i in range(int(dur / 0.04) + 1):
            x = i * 0.04
            e = min(1.0, (x / (dur * 0.55)) ** 1.5) if x < dur * 0.55 else max(0.0, 1 - (x - dur * 0.55) / (dur * 0.45))
            T.c('guitarra', s(ini + x), 'feedback', 'cc', 11, round(8 + 110 * e))
            if x > 0.8:
                T.c('guitarra', s(ini + x), 'feedback', 'pb', round(4095 * 0.22 * np.sin(2 * np.pi * 5.2 * (x - 0.8)) * min(1, (x - 0.8) / 0.5)))
        T.c('guitarra', s(ini + dur) + 30, 'feedback', 'pb', 0)
    for k in (52, 59, 64):
        T.n('guitarra', s(15.5), 'drive', k, 74, s(2.2))
    # o baixo deslizando: o Mi grave subindo uma oitava (faixa do bend de 12 semitons) e voltando
    T.n('baixo', s(10.0), 'palheta', 28, 100, s(1.9))
    for i in range(21):
        x = i * 0.025
        T.c('baixo', s(10.15 + x), 'palheta', 'pb', round(8191 * (x / 0.5) ** 1.4))
    for i in range(11):
        x = i * 0.04
        T.c('baixo', s(11.3 + x), 'palheta', 'pb', round(8191 * (1 - x / 0.4)))
    T.c('baixo', s(12.0), 'palheta', 'pb', 0)
    T.n('baixo', s(12.5), 'palheta', 28, 88, s(0.4))
    T.n('baixo', s(12.75), 'palheta', 40, 82, s(0.3))
    # o baterista: viradas para o povo e o prato crescendo para a contagem
    for i, nota in enumerate([50, 48, 47, 45, 43, 41]):
        T.n('bateria', s(14.0) + i * SEMI, 'bateria', nota, 80 + i * 3, SEMI)
    T.n('bateria', s(14.75), 'bateria', BUMBO, 96, COLC)
    T.n('bateria', s(14.75), 'bateria', ATAQUE, 80, PPQ * 2)
    for tt in (15.5, 15.75):
        T.n('bateria', s(tt), 'bateria', CAIXA, 90, SEMI)
        T.n('bateria', s(tt), 'bateria', BUMBO, 92, SEMI)
    for i, nota in enumerate([41, 43, 45, 47, 48, 50, 48, 50]):
        T.n('bateria', s(16.5) + i * SEMI, 'bateria', nota, 76 + i * 3, SEMI)
    T.n('bateria', s(17.5), 'bateria', 57, 76, PPQ * 2)
    T.n('bateria', s(17.5), 'bateria', BUMBO, 96, COLC)
    for i in range(16):
        T.n('bateria', s(18.0) + i * SEMI, 'bateria', ATAQUE, 22 + 76 * (i / 15) ** 1.6, SEMI)
    return T


def show_novos():
    """(id, Trilhas, compassos, tipo, cauda em s): os pedaços novos do pacote."""
    m2c, m3c = Trilhas(Q2), Trilhas(Q3)
    contagem_baquetas(m2c, [(3 * PPQ + 2 * SEMI, CAIXA, 64), (3 * PPQ + 3 * SEMI, CAIXA, 76)])
    contagem_baquetas(m3c, [(3 * PPQ, TONS[3], 74), (3 * PPQ + COLC, TONS[5], 84)])
    return [
        ('m1_solo', m1_solo(), 8, 'frase', 0.7), ('m1_fim', m1_fim(), 2, 'frase', 2.6),
        ('m2_contagem', m2c, 1, 'frase', 0.4), ('m2_intro', m2_intro(), 2, 'frase', 0.7), ('m2_verso', m2_verso(), 4, 'laco', 0),
        ('m2_refrao', m2_refrao(), 4, 'frase', 0.7), ('m2_ponte', m2_ponte(), 8, 'frase', 0.7), ('m2_fim', m2_fim(), 2, 'frase', 2.3),
        ('m3_contagem', m3c, 1, 'frase', 0.4), ('m3_intro', m3_intro(), 2, 'frase', 0.7), ('m3_verso', m3_verso(), 4, 'laco', 0),
        ('m3_refrao', m3_refrao(), 4, 'frase', 0.7), ('m3_solo', m3_solo(), 4, 'frase', 0.7), ('m3_chamado', m3_chamado(), 2, 'laco', 0),
        ('m3_final', m3_final(), 2, 'frase', 2.0),
        ('abertura', abertura(), 9, 'frase', 3.6), ('entrada', entrada(), 10, 'frase', 1.2),
    ]


if __name__ == '__main__':
    saida = sys.argv[1]
    os.makedirs(saida, exist_ok=True)
    amostras_c = round(4 * 60 * SR / Q)
    plano = dict(q=Q, amostrasCompasso=amostras_c, pedacos=[])

    def gravar(id_, canais, ev, compassos, tipo, extra=None, cauda=PPQ * 6):
        escrever(os.path.join(saida, f'show__{id_}.mid'), canais, ev, round(compassos * COMP), q=Q, rev=52, cauda=cauda)
        d = dict(id=id_, arq=f'show__{id_}', compassos=compassos, tipo=tipo, notas=len(ev))
        d.update(extra or {})
        plano['pedacos'].append(d)

    for camada in ('bateria', 'guitarra', 'teclado'):
        for nome, f in PEDACOS_CAMADA.items():
            ev = f(camada)
            assert all(CAMADA_DO_CANAL[e[1]] == camada for e in ev), (camada, nome)
            gravar(f'{camada}_{nome}', canais_de(ev), ev, 4, 'laco' if nome == 'verso' else 'frase', dict(camada=camada, pedaco=nome))
    ev = contagem()
    gravar('contagem', canais_de(ev), ev, 1, 'frase')
    for k in range(3):
        ev = acorde(k)
        gravar(f'acorde_{k}', canais_de(ev), ev, 0.75, 'frase', dict(acorde=k))
    ev = final()
    gravar('final', canais_de(ev), ev, 2, 'frase', cauda=PPQ * 8)
    can, ev = batida()
    gravar('batida', can, ev, 2, 'laco')
    for id_, f in (('estojo', plim_estojo), ('ladrilho', plim_ladrilho), ('tum', tum_caixa)):
        can, ev = f()
        gravar(id_, can, ev, 0.5, 'frase', cauda=PPQ * 4)

    # ---- o show de verdade: os pedaços novos, cada um em trilhas (show_pacote.py junta), e os acordes do toque da m2 e da m3
    plano['novos'] = []

    def gravar_novo(id_, T, compassos, tipo, cauda_s, extra=None):
        cps = round(4 * 60 * SR / T.q)
        assert abs(cps - 4 * 60 * SR / T.q) < 1e-9, 'o compasso precisa caber em amostras inteiras'
        trilhas = sorted(T.ev)
        for tr in trilhas:
            ev, ctl = T.ev[tr], T.ctl.get(tr, [])
            arq = f'show__{id_}__{tr}'
            escrever_ctl(os.path.join(saida, arq + '.mid'), canais2(ev), ev, ctl, round(compassos * COMP), T.q,
                         cauda=T.seg(cauda_s + 2.5), faixa_bend={'palheta': 12} if id_ == 'entrada' else None)
            plano['pedacos'].append(dict(id=f'{id_}__{tr}', arq=arq, compassos=compassos, tipo=tipo, notas=len(ev), q=T.q,
                                         amostrasCompasso=cps, caudaS=cauda_s, parcial=True, clip=id_, trilha=tr))
        d = dict(id=id_, compassos=compassos, tipo=tipo, q=T.q, amostrasCompasso=cps, caudaS=cauda_s, trilhas=trilhas)
        d.update(extra or {})
        plano['novos'].append(d)

    for id_, T, compassos, tipo, cauda_s in show_novos():
        gravar_novo(id_, T, compassos, tipo, cauda_s)
    for m, q, acs in (('m2', Q2, M2_ACORDES), ('m3', Q3, M3_ACORDES)):
        for k, notas in enumerate(acs):
            T = Trilhas(q)
            for e in acorde_toque(notas):
                T.n('acorde', *e)
            # o acorde do toque dura o mesmo 1,5 s em toda música (o da m1: 0,75 compasso de 2 s)
            gravar_novo(f'{m}_acorde_{k}', T, 1.5 / (240 / q), 'frase', 0.5, dict(acorde=k))
    json.dump(plano, open(os.path.join(saida, 'show_plano.json'), 'w'), indent=1, ensure_ascii=False)
    print('show:', len(plano['pedacos']), 'pedaços, compasso', amostras_c, 'amostras')
