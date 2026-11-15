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
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from musica_compor import escrever, hsh, PPQ  # noqa: E402

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
    json.dump(plano, open(os.path.join(saida, 'show_plano.json'), 'w'), indent=1, ensure_ascii=False)
    print('show:', len(plano['pedacos']), 'pedaços, compasso', amostras_c, 'amostras')
