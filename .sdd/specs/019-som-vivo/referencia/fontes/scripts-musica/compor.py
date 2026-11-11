"""Partituras dos 7 temas (spec 019, esboço grande) e exportação para MIDI, uma faixa por camada ou frase.

Cada tema tem uma volta (forma) de frases: A, A', B e respiro (R). No Rancho, a moda aprovada no esboço
(18 compassos de 2/4 a 84) é mantida nota por nota, com o B partido em Bx e By.
Saem:
  camadas (laço): base, noite, amigos (mesmo tamanho da volta); movimento (2 compassos) e pingos (4 compassos),
    que não dependem da harmonia e cabem um número inteiro de vezes na volta; perigo (8 compassos, substitui tudo).
  frases (para o jogo sequenciar sobre a base): melodia do dia (A, A', B, R; 2 versões de A e B) e do entardecer.
Uso: python3 -I compor.py <pasta_midi>   (escreve também plano.json com o que o processamento precisa)
"""
import struct, sys, os, json

PPQ = 480
SR = 22050
MAIOR = [0, 2, 4, 5, 7, 9, 11]
LIDIO = [0, 2, 4, 6, 7, 9, 11]
MENOR_H = [0, 2, 3, 5, 7, 8, 11]
CAUDA_TICKS = PPQ * 6


def grau(esc, base, d):
    return base + 12 * (d // 7) + esc[d % 7]


def dobrar(n, lo):
    """Leva a nota para a oitava [lo, lo+12)."""
    while n < lo:
        n += 12
    while n >= lo + 12:
        n -= 12
    return n


def hsh(n):
    return (n * 2654435761 + 12345) & 0xFFFFFFFF


# ------------------------------------------------------------------------------------------------ temas
# compasso: (semínimas por compasso, unidades por compasso, unidades por tempo); q = semínimas por minuto
# melodias: graus da escala (0 = tônica em mel_base) e duração em unidades; None = pausa
TEMAS = {
    'bruma-e-luz': dict(
        nome='Bruma e Luz', tom='Fá maior', esc=MAIOR, tonica=65, q=120, qpc=3, upc=6, upt=2, metrica='3/4',
        carater='canção de ninar em valsa lenta, luz de vaga-lume: harpa e cordas macias embalam, a celesta canta',
        forma=[0, 5, 3, 4, 0, 5, 4, 0, 3, 0, 3, 4, 0, 0],
        frases=[('A', 0, 4), ("A'", 4, 4), ('B', 8, 4), ('R', 12, 2)],
        mel={
            'A': [[(4, 2), (2, 1), (3, 1), (4, 2)], [(5, 4), (4, 1), (3, 1)], [(5, 2), (3, 1), (2, 1), (3, 2)], [(1, 4), (None, 2)]],
            "A'": [[(4, 2), (2, 1), (3, 1), (4, 2)], [(7, 3), (5, 1), (4, 2)], [(4, 2), (6, 1), (4, 1), (1, 2)], [(0, 4), (None, 2)]],
            'B': [[(5, 2), (7, 2), (5, 2)], [(4, 3), (2, 1), (4, 2)], [(3, 1), (5, 1), (7, 2), (5, 2)], [(6, 2), (4, 2), (1, 2)]],
            'R': [[(None, 2), (4, 1), (2, 1), (0, 2)], [(None, 6)]],
        },
        mel_base=77, acorde_lo=53, baixo_lo=41,
        base=[('pad', 'cordas'), ('valsa_baixo', 'harpa')],
        inst=dict(cordas=(49, 72), harpa=(46, 100), celesta=(8, 110), harpa_d=(46, 70), cordas_t=(49, 92),
                  harpa_n=(46, 90), caixinha=(10, 80), celesta_p=(8, 80), trem=(44, 70), harpa_p=(46, 90)),
        mel_inst='celesta', mel2_dobra=('harpa_d', 0), tarde_inst='cordas_t', tarde_oit=-12,
        noite=('harpa_n', 65, [0, 1, 2, 3, 2, 1]), amigos=('caixinha', 77, [1, 3, 5]),
        pingos=('celesta_p', 77, 0.8), mov=[(0, 82, 52), (1, 82, 34), (2, 82, 46), (3, 82, 34), (4, 82, 46), (5, 82, 34), (0, 77, 40)],
        perigo=('trem', 'harpa_p'),
        orquestra='harpa, celesta e cordas macias; caixinha de música com os amigos; celesta aguda na chuva',
    ),
    'mata-encantada': dict(
        nome='Mata Encantada', tom='Ré maior', esc=MAIOR, tonica=62, q=126, qpc=3, upc=6, upt=3, metrica='6/8',
        carater='passeio saltitante na mata em 6/8: a flauta brinca, a harpa balança e a kalimba pinga',
        forma=[0, 3, 0, 4, 0, 3, 4, 0, 5, 3, 0, 4, 0, 0],
        frases=[('A', 0, 4), ("A'", 4, 4), ('B', 8, 4), ('R', 12, 2)],
        mel={
            'A': [[(2, 2), (4, 1), (7, 2), (4, 1)], [(5, 2), (3, 1), (5, 2), (7, 1)], [(4, 2), (2, 1), (0, 2), (2, 1)], [(1, 3), (4, 2), (None, 1)]],
            "A'": [[(2, 2), (4, 1), (7, 2), (4, 1)], [(5, 2), (7, 1), (8, 2), (7, 1)], [(6, 2), (4, 1), (1, 2), (6, 1)], [(7, 5), (None, 1)]],
            'B': [[(5, 2), (4, 1), (2, 2), (0, 1)], [(3, 3), (5, 2), (3, 1)], [(4, 2), (2, 1), (4, 2), (7, 1)], [(6, 2), (5, 1), (4, 3)]],
            'R': [[(None, 3), (7, 1), (4, 1), (2, 1)], [(0, 3), (None, 3)]],
        },
        mel_base=74, acorde_lo=57, baixo_lo=38,
        base=[('baixo68', 'harpa'), ('acorde68', 'kalimba')],
        inst=dict(harpa=(46, 100), kalimba=(108, 80), flauta=(73, 105), kalimba_d=(108, 64), pan=(75, 95),
                  harpa_n=(46, 88), glock=(9, 62), kalimba_p=(108, 80), trem=(44, 70), harpa_p=(46, 90)),
        mel_inst='flauta', mel2_dobra=('kalimba_d', 12), tarde_inst='pan', tarde_oit=-12,
        noite=('harpa_n', 62, [0, 1, 2, 3, 2, 1]), amigos=('glock', 86, [1, 4]),
        pingos=('kalimba_p', 74, 0.8), mov=[(0, 77, 48), (3, 76, 36), (0, 82, 40), (1, 82, 26), (2, 82, 30), (3, 82, 36), (4, 82, 26), (5, 82, 30)],
        perigo=('trem', 'harpa_p'),
        orquestra='flauta, harpa e kalimba; flauta de pã no entardecer; sininho (glockenspiel) com os amigos',
    ),
    'era-dos-dinos': dict(
        nome='Era dos Dinos', tom='Dó maior', esc=MAIOR, tonica=60, q=90, qpc=2, upc=4, upt=2, metrica='2/4',
        carater='passinho de dinossauro manso em 2/4: marimba no tum-tá, flauta grave e ocarina',
        forma=[0, 0, 3, 4, 0, 0, 4, 0, 3, 0, 3, 4, 0, 0],
        frases=[('A', 0, 4), ("A'", 4, 4), ('B', 8, 4), ('R', 12, 2)],
        mel={
            'A': [[(0, 1), (2, 1), (4, 2)], [(5, 1), (4, 1), (2, 2)], [(3, 1), (5, 1), (7, 1), (5, 1)], [(4, 3), (None, 1)]],
            "A'": [[(0, 1), (2, 1), (4, 2)], [(7, 1), (5, 1), (4, 2)], [(6, 1), (4, 1), (1, 1), (3, 1)], [(0, 3), (None, 1)]],
            'B': [[(5, 2), (5, 1), (7, 1)], [(4, 2), (2, 2)], [(3, 1), (5, 1), (3, 1), (2, 1)], [(1, 3), (None, 1)]],
            'R': [[(4, 1), (None, 1), (0, 1), (None, 1)], [(None, 4)]],
        },
        mel_base=60, acorde_lo=55, baixo_lo=36,
        base=[('oompa', 'marimba')],
        inst=dict(marimba=(12, 100), flauta=(73, 110), ocarina_d=(79, 70), ocarina=(79, 100), marimba_n=(12, 85),
                  xilo=(13, 70), marimba_p=(12, 85), trem=(44, 70), marimba_pp=(12, 95)),
        mel_inst='flauta', mel2_dobra=('ocarina_d', 12), tarde_inst='ocarina', tarde_oit=0,
        noite=('marimba_n', 60, [0, 1, 2, 1]), amigos=('xilo', 79, [1, 3]),
        pingos=('marimba_p', 72, 0.9), mov=[(0, 77, 50), (2, 77, 40), (1, 76, 30), (3, 76, 30), (0, 45, 34)],
        perigo=('trem', 'marimba_pp'),
        orquestra='marimba, flauta grave e ocarina; xilofone com os amigos; percussão de madeira no andar',
    ),
    'exploracao-lunar': dict(
        nome='Exploração Lunar', tom='Mi maior', esc=MAIOR, tonica=64, q=160, qpc=4, upc=4, upt=1, metrica='4/4',
        carater='flutuando devagar na Lua: colchão macio, vibrafone e celesta, sinos ao longe',
        forma=[0, 3, 5, 4, 0, 3, 4, 0, 3, 0, 1, 4, 0, 0],
        frases=[('A', 0, 4), ("A'", 4, 4), ('B', 8, 4), ('R', 12, 2)],
        mel={
            'A': [[(4, 2), (2, 1), (4, 1)], [(5, 3), (3, 1)], [(7, 2), (5, 1), (4, 1)], [(6, 2), (4, 2)]],
            "A'": [[(4, 2), (2, 1), (4, 1)], [(5, 2), (7, 1), (8, 1)], [(8, 2), (6, 1), (4, 1)], [(7, 3), (None, 1)]],
            'B': [[(7, 2), (5, 2)], [(4, 2), (2, 2)], [(3, 2), (5, 1), (3, 1)], [(1, 3), (None, 1)]],
            'R': [[(None, 2), (4, 1), (7, 1)], [(None, 4)]],
        },
        mel_base=64, acorde_lo=52, baixo_lo=40,
        base=[('pad', 'colchao'), ('baixo_meia', 'baixo')],
        inst=dict(colchao=(89, 80), baixo=(32, 80), vibra=(11, 110), celesta_d=(8, 62), celesta=(8, 100),
                  vibra_n=(11, 85), glock=(9, 56), sino=(14, 52), trem=(44, 66), vibra_p=(11, 90)),
        mel_inst='vibra', mel2_dobra=('celesta_d', 12), tarde_inst='celesta', tarde_oit=0,
        noite=('vibra_n', 64, [0, 1, 2, 1]), amigos=('glock', 88, [0.5, 1.5, 2.5, 3.5]),
        pingos=('sino', 76, 0.7), mov=[(0, 69, 34), (0.5, 69, 24), (1, 69, 30), (1.5, 69, 24), (2, 69, 34), (2.5, 69, 24), (3, 69, 30), (3.5, 69, 24), (1, 80, 26), (3, 80, 26)],
        perigo=('trem', 'vibra_p'),
        orquestra='colchão macio (pad), vibrafone, celesta e sinos; sininho com os amigos',
    ),
    'doce-reino': dict(
        nome='Doce Reino', tom='Si bemol maior', esc=MAIOR, tonica=70, q=147, qpc=3, upc=6, upt=2, metrica='3/4',
        carater='valsinha de caixinha de música: marimba no um-dois-três, glockenspiel de açúcar',
        forma=[0, 4, 4, 0, 0, 3, 4, 0, 3, 0, 1, 4, 0, 0],
        frases=[('A', 0, 4), ("A'", 4, 4), ('B', 8, 4), ('R', 12, 2)],
        mel={
            'A': [[(7, 2), (4, 2), (2, 2)], [(1, 2), (6, 1), (8, 1), (4, 2)], [(6, 2), (4, 2), (1, 2)], [(2, 4), (None, 2)]],
            "A'": [[(7, 2), (4, 2), (2, 2)], [(5, 2), (3, 1), (5, 1), (7, 2)], [(8, 2), (6, 2), (4, 2)], [(7, 4), (None, 2)]],
            'B': [[(7, 2), (5, 2), (3, 2)], [(4, 2), (2, 1), (3, 1), (4, 2)], [(5, 2), (3, 2), (1, 2)], [(6, 3), (4, 1), (1, 2)]],
            'R': [[(None, 2), (4, 1), (7, 1), (None, 2)], [(None, 6)]],
        },
        mel_base=70, acorde_lo=58, baixo_lo=34,
        base=[('valsa', 'marimba')],
        inst=dict(marimba=(12, 100), caixinha=(10, 112), glock_d=(9, 56), marimba_t=(12, 95), caixinha_n=(10, 80),
                  glock=(9, 60), caixinha_p=(10, 76), trem=(44, 66), marimba_p=(12, 95)),
        mel_inst='caixinha', mel2_dobra=('glock_d', 12), tarde_inst='marimba_t', tarde_oit=0,
        noite=('caixinha_n', 70, [0, 1, 2, 3, 2, 1]), amigos=('glock', 82, [3, 5]),
        pingos=('caixinha_p', 74, 0.8), mov=[(0, 82, 42), (1, 82, 28), (2, 82, 36), (3, 82, 28), (4, 82, 36), (5, 82, 28), (2, 54, 26), (4, 54, 26)],
        perigo=('trem', 'marimba_p'),
        orquestra='caixinha de música, glockenspiel e marimba em valsa',
    ),
    'planeta-vivo': dict(
        nome='Planeta Vivo', tom='Lá lídio', esc=LIDIO, tonica=69, q=105, qpc=2, upc=4, upt=2, metrica='2/4',
        carater='bolhas de um planeta curioso em 2/4: colchão de sintetizador, kalimba que borbulha e vibrafone com a quarta aumentada',
        forma=[0, 1, 0, 4, 0, 1, 4, 0, 5, 2, 1, 4, 0, 0],
        frases=[('A', 0, 4), ("A'", 4, 4), ('B', 8, 4), ('R', 12, 2)],
        mel={
            'A': [[(2, 1), (4, 1), (7, 2)], [(8, 1), (5, 1), (3, 2)], [(4, 1), (2, 1), (4, 1), (7, 1)], [(6, 3), (None, 1)]],
            "A'": [[(2, 1), (4, 1), (7, 2)], [(8, 1), (10, 1), (8, 2)], [(6, 1), (4, 1), (6, 1), (8, 1)], [(7, 3), (None, 1)]],
            'B': [[(5, 2), (4, 1), (2, 1)], [(4, 2), (6, 2)], [(5, 1), (3, 1), (1, 1), (3, 1)], [(4, 3), (None, 1)]],
            'R': [[(7, 1), (None, 1), (11, 1), (None, 1)], [(None, 4)]],
        },
        mel_base=69, acorde_lo=57, baixo_lo=45,
        base=[('pad', 'colchao'), ('ostinato', 'kalimba')],
        inst=dict(colchao=(88, 70), kalimba=(108, 88), vibra=(11, 110), kalimba_d=(108, 62), vibra_t=(11, 90),
                  kalimba_n=(108, 84), steel=(114, 56), vibra_p=(11, 80), trem=(44, 62), vibra_pp=(11, 92)),
        mel_inst='vibra', mel2_dobra=('kalimba_d', 12), tarde_inst='vibra_t', tarde_oit=-12,
        noite=('kalimba_n', 69, [0, 1, 2, 1]), amigos=('steel', 81, [1, 3]),
        pingos=('vibra_p', 81, 0.9), mov=[(0, 64, 42), (2, 63, 34), (1, 62, 24), (3, 62, 24), (0, 82, 26), (1, 82, 20), (2, 82, 26), (3, 82, 20)],
        perigo=('trem', 'vibra_pp'),
        orquestra='colchão de sintetizador (New Age pad), kalimba e vibrafone; tambor de aço (steel drum) com os amigos; congas no andar',
    ),
}

# Rancho Alegre: a moda aprovada (mesma partitura da classe Moda do esboço)
R_FORMA = ['G', 'G', 'D', 'G', 'G', 'C', 'D', 'G', 'C', 'G', 'D', 'D', 'C', 'G', 'D', 'G', 'G', 'G']
R_ACO = {
    'G': dict(r=43, q=50, s=[55, 59, 62], arp=[55, 59, 62, 59]),
    'C': dict(r=48, q=43, s=[55, 60, 64], arp=[48, 55, 60, 64]),
    'D': dict(r=50, q=45, s=[54, 57, 62], arp=[50, 57, 62, 66]),
}
R_MEL = [
    [[4, 2], [4, 1], [5, 1]], [[4, 1], [3, 1], [2, 2]], [[1, 1], [2, 1], [3, 1], [1, 1]], [[2, 3], [None, 1]],
    [[4, 2], [4, 1], [5, 1]], [[7, 1], [5, 1], [5, 2]], [[4, 1], [3, 1], [1, 1], [3, 1]], [[2, 2], [0, 2]],
    [[5, 1], [7, 1], [5, 1], [4, 1]], [[4, 2], [2, 2]], [[3, 1], [4, 1], [5, 1], [3, 1]], [[1, 3], [None, 1]],
    [[5, 1], [7, 1], [5, 1], [4, 1]], [[4, 1], [3, 1], [2, 2]], [[1, 1], [2, 1], [3, 1], [1, 1]], [[0, 3], [None, 1]],
    [[None, 4]], [[None, 4]],
]
RANCHO = dict(
    nome='Rancho Alegre', tom='Sol maior', esc=MAIOR, tonica=67, q=84, qpc=2, upc=4, upt=2, metrica='2/4',
    carater='a moda de viola aprovada no esboço (ponteio em terças), arranjo acústico: violões de aço dobrados, sanfona e baixo do violão',
    frases=[('A', 0, 4), ("A'", 4, 4), ('Bx', 8, 4), ('By', 12, 4), ('R', 16, 2)],
    orquestra='violões de aço dobrados (doze cordas), sanfona e baixo do violão de náilon; dedilhado de náilon + aço à noite; harmônicos de violão na chuva; maracas, bumbo e surdo no andar; sanfona e triângulo com os amigos',
)
TEMAS['rancho-alegre'] = RANCHO
ORDEM = ['bruma-e-luz', 'mata-encantada', 'era-dos-dinos', 'exploracao-lunar', 'doce-reino', 'planeta-vivo', 'rancho-alegre']


def vel(g):
    return max(20, min(127, round(40 + 160 * g)))


# ------------------------------------------------------------------------------------------------ MIDI
def vlq(n):
    b = [n & 0x7F]
    n >>= 7
    while n:
        b.append(0x80 | (n & 0x7F))
        n >>= 7
    return bytes(reversed(b))


def escrever(caminho, q, qpc, canais, ev, fim_conteudo):
    """canais: nome -> (programa, volume, cents) ; ev: (tick, canal, nota, vel, dur). 'drum' = canal 10."""
    tempo = round(60_000_000 / q)
    num = {}
    i = 0
    for nome in canais:
        if nome == 'drum':
            continue
        if i == 9:
            i += 1
        num[nome] = i
        i += 1
    num['drum'] = 9
    msgs = [(0, 0, b'\xff\x51\x03' + tempo.to_bytes(3, 'big'))]
    den = {2: 2, 3: 2, 4: 2}[qpc]
    msgs.append((0, 0, b'\xff\x58\x04' + bytes([qpc, den, 24, 8])))
    for nome, cfg in canais.items():
        c = num[nome]
        if nome == 'drum':
            msgs += [(0, 1, bytes([0xB9, 7, cfg[1]])), (0, 1, bytes([0xB9, 91, 60]))]
            continue
        prog, vol, cents = cfg
        msgs += [(0, 1, bytes([0xC0 | c, prog])), (0, 1, bytes([0xB0 | c, 7, vol])), (0, 1, bytes([0xB0 | c, 10, 64])),
                 (0, 1, bytes([0xB0 | c, 91, 72])), (0, 1, bytes([0xB0 | c, 93, 0]))]
        bend = 8192 + round(cents / 200 * 8192)
        msgs.append((0, 1, bytes([0xE0 | c, bend & 0x7F, bend >> 7])))
    for t, nome, nota, v, d in ev:
        c = num[nome]
        msgs.append((t, 3, bytes([0x90 | c, nota, v])))
        msgs.append((t + d, 2, bytes([0x80 | c, nota, 0])))
    fim = fim_conteudo + CAUDA_TICKS
    msgs.sort(key=lambda m: (m[0], m[1]))
    trk, ult = bytearray(), 0
    for t, _, b in msgs:
        trk += vlq(t - ult) + b
        ult = t
    trk += vlq(max(0, fim - ult)) + b'\xff\x2f\x00'
    with open(caminho, 'wb') as f:
        f.write(b'MThd' + struct.pack('>IHHH', 6, 0, 1, PPQ))
        f.write(b'MTrk' + struct.pack('>I', len(trk)) + trk)


# ------------------------------------------------------------------------------------------------ peças genéricas
class Peca:
    def __init__(self, tid):
        self.id = tid
        self.T = T = TEMAS[tid]
        self.esc = T['esc']
        self.cpt = PPQ * T['qpc']               # ticks por compasso
        self.un = self.cpt // T['upc']          # ticks por unidade
        self.nc = len(T['forma'])

    def inst(self, nome, cents=0):
        p, v = self.T['inst'][nome]
        return (p, v, cents)

    def acorde(self, r, lo=None, sete=False):
        lo = self.T['acorde_lo'] if lo is None else lo
        ds = [r, r + 2, r + 4] + ([r + 6] if sete else [])
        return sorted(dobrar(grau(self.esc, self.T['tonica'], d), lo) for d in ds)

    def baixo(self, r, mais=0):
        return dobrar(grau(self.esc, self.T['tonica'], r + mais), self.T['baixo_lo'])

    # --- camadas em laço
    def base(self):
        T, ev, can = self.T, [], {}
        for estilo, nome in T['base']:
            can[nome] = self.inst(nome)
            for b, r in enumerate(T['forma']):
                t = b * self.cpt
                ac = self.acorde(r)
                if estilo == 'pad':
                    for m in ac:
                        ev.append((t, nome, m, 52, self.cpt + 30))
                elif estilo == 'valsa_baixo':  # harpa: baixo no 1, quinta no 3
                    ev.append((t, nome, self.baixo(r), 74, self.un * 4))
                    ev.append((t + self.un * 4, nome, self.baixo(r, 4) + (12 if self.baixo(r, 4) < self.baixo(r) else 0), 56, self.un * 2))
                elif estilo == 'valsa':
                    ev.append((t, nome, self.baixo(r), 78, self.un * 2))
                    for k in (2, 4):
                        for m in ac[1:]:
                            ev.append((t + k * self.un, nome, m, 50, self.un))
                elif estilo == 'baixo68':
                    ev.append((t, nome, self.baixo(r), 76, self.un * 3))
                    ev.append((t + 3 * self.un, nome, self.baixo(r, 4) if self.baixo(r, 4) > self.baixo(r) else self.baixo(r, 4) + 12, 58, self.un * 3))
                elif estilo == 'acorde68':
                    for k in (2, 5):
                        for m in ac:
                            ev.append((t + k * self.un, nome, m, 44, self.un))
                elif estilo == 'oompa':
                    ev.append((t, nome, self.baixo(r), 84, self.un))
                    q5 = self.baixo(r, 4)
                    ev.append((t + 2 * self.un, nome, q5 if q5 > self.baixo(r) else q5 + 12 if q5 + 12 < 60 else q5, 66, self.un))
                    for k in (1, 3):
                        for m in ac[1:]:
                            ev.append((t + k * self.un, nome, m, 48, self.un // 2))
                elif estilo == 'baixo_meia':
                    ev.append((t, nome, self.baixo(r), 64, self.cpt // 2))
                    ev.append((t + self.cpt // 2, nome, self.baixo(r, 4) if self.baixo(r, 4) > self.baixo(r) else self.baixo(r, 4) + 12, 52, self.cpt // 2))
                elif estilo == 'ostinato':
                    pts = [0, 4, 7, 4]
                    for k in range(T['upc']):
                        m = dobrar(grau(self.esc, T['tonica'], r), T['acorde_lo']) + [0, 7, 12, 7][k % 4]
                        ev.append((t + k * self.un, nome, m, 62 if k % 2 == 0 else 48, self.un))
        return can, ev, self.nc

    def noite(self):
        T = self.T
        nome, lo, padrao = T['noite']
        ev = []
        for b, r in enumerate(T['forma']):
            t = b * self.cpt
            ac = self.acorde(r, lo=lo)
            ac4 = ac + [ac[0] + 12]
            ultimo = b in [f[1] + f[2] - 1 for f in T['frases']]
            for k in range(T['upc']):
                if ultimo and k > 0:
                    break
                m = ac4[padrao[k % len(padrao)]]
                ev.append((t + k * self.un, nome, m, 50 if k == 0 else 42, self.un * 2))
        return {nome: self.inst(nome)}, ev, self.nc

    def amigos(self):
        T = self.T
        nome, lo, pos = T['amigos']
        ev = []
        for b, r in enumerate(T['forma']):
            t = b * self.cpt
            ac = self.acorde(r, lo=lo)
            for i, p in enumerate(pos):
                tk = round(p * (PPQ if T['upt'] == 1 else self.un)) if isinstance(p, float) else p * self.un
                if T['upt'] == 1 and not isinstance(p, float):
                    tk = p * self.un
                m = ac[(i + b) % 3]
                ev.append((t + tk, nome, m, 58 if i == 0 else 48, self.un // (2 if T['upt'] == 1 else 1)))
        return {nome: self.inst(nome)}, ev, self.nc

    def pingos(self):
        T = self.T
        nome, lo, _ = T['pingos']
        n_c = 4
        ev = []
        notas = [0, 4, 7, 11]
        for s in range(n_c * T['upc']):
            h = hsh(s * 7 + 3)
            if h % 5 == 0:
                d = notas[(h >> 8) % 4]
                m = dobrar(grau(self.esc, T['tonica'], 0), lo) + MAIOR[d % 7] + 12 * (d // 7)
                ev.append((s * self.un, nome, m, 44 + (h >> 12) % 14, self.un * 2))
        return {nome: self.inst(nome)}, ev, n_c

    def mov(self):
        T = self.T
        ev = []
        unit = PPQ if T['upt'] == 1 else self.un
        for b in range(2):
            for p, nota, v in T['mov']:
                ev.append((b * self.cpt + round(p * unit), 'drum', nota, v - (4 if b else 0), 60))
        return {'drum': (0, 100)}, ev, 2

    def perigo(self):
        T = self.T
        trem, ost = T['perigo']
        ton = T['tonica'] - 3
        prog = [0, 4, 0, 4, 3, 0, 4, 4]
        ev = []
        tempo = self.un * T['upt']
        for b, r in enumerate(prog):
            t = b * self.cpt
            ac = sorted(dobrar(grau(MENOR_H, ton, d), T['acorde_lo'] - 5) for d in (r, r + 2, r + 4))
            for m in ac:
                ev.append((t, trem, m, 46, self.cpt + 20))
            rt = dobrar(grau(MENOR_H, ton, r), T['baixo_lo'] + 7)
            for k in range(T['upc'] // T['upt']):
                ev.append((t + k * tempo, ost, rt if k % 2 == 0 else rt + 7, 58 if k == 0 else 46, tempo))
            ev.append((t, 'drum', 36, 52, 120))
            ev.append((t + PPQ // 2, 'drum', 36, 34, 120))
        can = {trem: self.inst(trem), ost: self.inst(ost), 'drum': (0, 100)}
        return can, ev, 8

    # --- frases
    def melodia(self, frase, variante):
        bars = self.T['mel'][frase]
        if variante == 2:
            bars = ornar(bars)
        return bars

    def notas(self, bars):
        out, p = [], 0
        for bi, bar in enumerate(bars):
            for d, dur in bar:
                if d is not None:
                    out.append((bi * self.T['upc'] + p, d, dur))
                p += dur
            assert p == self.T['upc'], (self.id, bars, p)
            p = 0
        return out

    def frase_dia(self, frase, variante):
        T = self.T
        mi = T['mel_inst']
        can = {mi: self.inst(mi)}
        ev = []
        for pos, d, dur in self.notas(self.melodia(frase, variante)):
            m = grau(self.esc, T['mel_base'], d)
            ev.append((pos * self.un, mi, m, 92 - (6 if pos % T['upt'] else 0), dur * self.un - 10))
            if variante == 2:
                dn, oit = T['mel2_dobra']
                can[dn] = self.inst(dn)
                ev.append((pos * self.un + 6, dn, m + oit, 60, dur * self.un - 10))
        return can, ev

    def frase_tarde(self, frase):
        T = self.T
        ti = T['tarde_inst']
        nts = self.notas(T['mel'][frase])
        manter = [n for n in nts if n[0] % T['upt'] == 0 or n[2] >= 2]
        fim = len(T['mel'][frase]) * T['upc']
        ev = []
        for i, (pos, d, dur) in enumerate(manter):
            prox = manter[i + 1][0] if i + 1 < len(manter) else min(fim, pos + max(dur, 2 * T['upt']))
            dd = min(prox - pos, 2 * T['upt'] + dur)
            for k, gv in ((d, 72), (d - 5, 60)):
                ev.append((pos * self.un, ti, grau(self.esc, T['mel_base'] + T['tarde_oit'], k), gv, dd * self.un - 10))
        return {ti: self.inst(ti)}, ev


def ornar(bars):
    """Versão 2: notas longas (que não fecham a frase) ganham uma nota de passagem ou bordadura, uma sim, outra não."""
    seq = [(bi, ni, d) for bi, bar in enumerate(bars) for ni, (d, _) in enumerate(bar) if d is not None]
    ultimo = seq[-1][:2] if seq else None
    prox = {}
    for i, (bi, ni, d) in enumerate(seq):
        prox[(bi, ni)] = seq[i + 1][2] if i + 1 < len(seq) else None
    out, cont = [], 0
    for bi, bar in enumerate(bars):
        nb = []
        for ni, (d, dur) in enumerate(bar):
            if d is not None and dur >= 2 and (bi, ni) != ultimo:
                cont += 1
                if cont % 2 == 1:
                    nx = prox[(bi, ni)]
                    if nx is None or nx == d:
                        st = 1
                    elif abs(nx - d) == 1:
                        st = -(1 if nx > d else -1)
                    else:
                        st = 1 if nx > d else -1
                    nb += [(d, dur - 1), (d + st, 1)]
                    continue
            nb.append((d, dur))
        out.append(nb)
    return out


# ------------------------------------------------------------------------------------------------ Rancho (moda)
class Rancho:
    id = 'rancho-alegre'

    def __init__(self):
        self.T = RANCHO
        self.cpt = PPQ * 2
        self.semi = 120
        self.nc = 18
        self.esc = MAIOR
        self.mel_pos = []
        for c in R_MEL:
            m, p = {}, 0
            for g, d in c:
                if g is not None:
                    m[p] = (g, d)
                p += d * 2
            self.mel_pos.append(m)

    @staticmethod
    def g(d):
        return 67 + 12 * (d // 7) + MAIOR[d % 7]

    def viola(self, ev, t, m, gv, par=True, rasgo=7, canal='viola', canalpar='par', dur=None):
        d = dur or PPQ * 3
        ev.append((t, canal, m, vel(gv), d))
        if par:
            oit = m < 62
            ev.append((t + rasgo, canalpar, m + 12 if oit else m, vel(gv * (0.4 if oit else 0.7)), d))

    def base(self):
        ev = []
        for fc in range(18):
            t = fc * self.cpt
            ac = R_ACO[R_FORMA[fc]]
            resp = fc >= 16
            for m in ac['s']:
                ev.append((t, 'sanfona', m, vel(0.05 if resp else 0.04) + 40, self.semi * 8 + 20))
            self.viola(ev, t, ac['r'], 0.55, par=False, canal='baixo', dur=PPQ * 2)
            if not resp:
                self.viola(ev, t + 4 * self.semi, ac['q'], 0.4, par=False, canal='baixo', dur=PPQ * 2)
        return {'sanfona': (21, 70, 0), 'baixo': (24, 105, 0)}, ev, 18

    def noite(self):
        ev = []
        for s in range(18 * 8):
            pos, fc = s % 8, s // 8
            ac = R_ACO[R_FORMA[fc]]
            if pos % 2 == 0 and fc < 16 and not (fc % 4 == 3 and pos > 0):
                self.viola(ev, s * self.semi, ac['arp'][pos // 2], 0.26 if pos == 0 else 0.2, rasgo=14, canal='ded', canalpar='dedpar')
        return {'ded': (24, 95, 0), 'dedpar': (25, 70, 5)}, ev, 18

    def amigos(self):
        ev = []
        for fc in range(18):
            t = fc * self.cpt
            ac = R_ACO[R_FORMA[fc]]
            for pos in (2, 6):
                for m in ac['s']:
                    ev.append((t + pos * self.semi, 'sanfona', m + 12, 60 if pos == 2 else 54, self.semi + 40))
                ev.append((t + pos * self.semi, 'drum', 81 if (pos == 6 and fc % 2 == 1) else 80, 44 if pos == 6 else 34, 120))
        return {'sanfona': (21, 64, 0), 'drum': (0, 100)}, ev, 18

    def mov(self):
        ev = []
        for s in range(8):
            t, pos = s * self.semi, s % 8
            ev.append((t, 'drum', 70, 70 if pos % 4 == 2 else 46, 60))
            if pos in (0, 3, 4):
                ev.append((t, 'drum', 35, vel({0: 0.5, 3: 0.25, 4: 0.35}[pos] * 0.8), 120))
                if pos == 0:
                    ev.append((t, 'drum', 41, vel(0.3), 200))
        return {'drum': (0, 100)}, ev, 1

    def pingos(self):
        ev = []
        notas = [79, 86, 91, 83]   # sol, ré, sol, si agudos (violão de náilon, bem curtinho): cabem sobre sol, dó e ré
        for s in range(4 * 8):
            h = hsh(s * 7 + 3)
            if h % 9 == 0:
                ev.append((s * self.semi, 'harm', notas[(h >> 8) % 4], 58 + (h >> 12) % 14, PPQ))
        return {'harm': (24, 100, 0)}, ev, 4

    def frase_dia(self, frase, variante):
        ini, nb = {'A': (0, 4), "A'": (4, 4), 'Bx': (8, 4), 'By': (12, 4)}[frase]
        ev = []
        for fc in range(ini, ini + nb):
            for pos, (gr, d) in sorted(self.mel_pos[fc].items()):
                t = (fc - ini) * self.cpt + pos * self.semi
                topo = self.g(gr)
                sextas = variante == 2 and fc >= 8
                if variante == 2 and d >= 2 and gr > 0 and t >= 24:
                    self.viola(ev, t - 24, self.g(gr - 1), 0.14, par=False)   # apojatura (a "volta 2" da moda)
                self.viola(ev, t, topo, 0.34)
                self.viola(ev, t + 5, self.g(gr - (5 if sextas else 2)), 0.26)
                if variante == 2 and d == 1 and fc in (2, 10):
                    self.viola(ev, t + self.semi, topo, 0.2)
        return {'viola': (25, 100, 0), 'par': (25, 80, 6)}, ev

    def frase_tarde(self, frase):
        ini, nb = {'A': (0, 4), "A'": (4, 4), 'Bx': (8, 4), 'By': (12, 4)}[frase]
        ev = []
        for fc in range(ini, ini + nb):
            for pos, (gr, d) in sorted(self.mel_pos[fc].items()):
                if pos % 4 == 0 or d >= 2:
                    t = (fc - ini) * self.cpt + pos * self.semi
                    self.viola(ev, t, self.g(gr), 0.28)
                    self.viola(ev, t + 10, self.g(gr - 5), 0.22)
        return {'viola': (25, 100, 0), 'par': (25, 80, 6)}, ev


# ------------------------------------------------------------------------------------------------ plano
VARIANTES_DIA = {'A': 2, "A'": 1, 'B': 2, 'R': 1, 'Bx': 2, 'By': 1}
NOME_ARQ = {'A': 'a', "A'": 'a2', 'B': 'b', 'R': 'r', 'Bx': 'bx', 'By': 'by'}

if __name__ == '__main__':
    saida = sys.argv[1]
    os.makedirs(saida, exist_ok=True)
    plano = {}
    for tid in ORDEM:
        P = Rancho() if tid == 'rancho-alegre' else Peca(tid)
        T = P.T
        q, qpc = T['q'], T['qpc']
        cpt = P.cpt
        amostras_c = qpc * 60 * SR / q
        assert abs(amostras_c - round(amostras_c)) < 1e-6, (tid, amostras_c)
        amostras_c = round(amostras_c)
        item = dict(nome=T['nome'], tom=T['tom'], q=q, compasso=T['metrica'], amostrasCompasso=amostras_c, compassos=P.nc,
                    amostrasVolta=amostras_c * P.nc, carater=T['carater'], orquestra=T['orquestra'], frases=[], camadas=[])
        camadas = ['base', 'noite', 'amigos', 'mov', 'pingos'] + ([] if tid == 'rancho-alegre' else ['perigo'])
        for cam in camadas:
            can, ev, ncomp = getattr(P, cam)()
            arq = f'{tid}__{cam}'
            escrever(os.path.join(saida, arq + '.mid'), q, qpc, can, ev, ncomp * cpt)
            item['camadas'].append(dict(id=cam, arq=arq, compassos=ncomp, notas=len(ev)))
        for nome_f, ini, nb in T['frases']:
            for v in range(1, VARIANTES_DIA[nome_f] + 1):
                if tid == 'rancho-alegre' and nome_f == 'R':
                    continue   # na moda o respiro é só a base
                can, ev = P.frase_dia(nome_f, v)
                arq = f'{tid}__dia_{NOME_ARQ[nome_f]}_{v}'
                escrever(os.path.join(saida, arq + '.mid'), q, qpc, can, ev, nb * cpt)
                item['frases'].append(dict(id=f'dia_{NOME_ARQ[nome_f]}_{v}', frase=nome_f, contexto='dia', variante=v, compassoInicio=ini, compassos=nb, arq=arq, notas=len(ev)))
            if nome_f != 'R':
                can, ev = P.frase_tarde(nome_f)
                arq = f'{tid}__tarde_{NOME_ARQ[nome_f]}_1'
                escrever(os.path.join(saida, arq + '.mid'), q, qpc, can, ev, nb * cpt)
                item['frases'].append(dict(id=f'tarde_{NOME_ARQ[nome_f]}_1', frase=nome_f, contexto='entardecer', variante=1, compassoInicio=ini, compassos=nb, arq=arq, notas=len(ev)))
        # estimativa de memória (s) antes de gravar
        seg_c = amostras_c / SR
        est = sum(c['compassos'] * seg_c + 0.12 for c in item['camadas']) + sum(f['compassos'] * seg_c + 0.76 for f in item['frases'])
        item['estimativaSeg'] = round(est, 1)
        plano[tid] = item
        print(f"{tid:18s} volta {P.nc} comp = {amostras_c * P.nc / SR:6.2f} s  camadas {len(item['camadas'])}  frases {len(item['frases'])}  memória est. {est:6.1f} s")
    json.dump(plano, open(os.path.join(saida, 'plano.json'), 'w'), indent=1, ensure_ascii=False)
