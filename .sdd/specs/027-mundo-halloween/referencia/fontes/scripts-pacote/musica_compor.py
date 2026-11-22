"""Trilha da Noite das Fantasias para o pacote do jogo (spec 027, T21): a partitura aprovada no esboço
(../compor_noite.py: Ré dórico, o xilofone saltitante, o fagote na ponta dos pés, o pizzicato no contratempo, a marchinha e as
"risadinhas" da flauta) partida em camadas e frases como as da 019, da 014 e da 026 (026/scripts-pacote/musica_compor.py).
Nada de música existente: melodia, baixo e contracanto escritos aqui (os compassos 0-3 e 8-11 são os do esboço aprovado).

Rodar tudo de novo: ver rodar.sh (nesta pasta). Este passo: python3 -I musica_compor.py <pasta_midi>
Escreve uma faixa MIDI por camada ou frase e plano.json (o que musica_processar.py precisa).

Forma: 16 compassos de 4/4 a 126 semínimas por minuto (1,905 s por compasso, volta de 30,5 s; o esboço era 128, e 126 dá
um compasso inteiro de amostras a 22 050 Hz), em Ré dórico, frases A, A', Bx, By de 4 compassos:
  A  Dm | G | Dm | C A7     (o tema A do esboço)
  A' Dm | G | Dm | A7       (a resposta, subindo até o Ré agudo e parando no Lá)
  Bx F  | C | Dm | G A7     (a marchinha do esboço: a síncope semicolcheia-colcheia-semicolcheia)
  By F  | C | Dm | A7       (a marchinha de volta, descendo para o Ré do começo)
Camadas: base (o fagote na ponta dos pés, o pizzicato no contratempo, o "relojinho" da marimba, o tique-taque dos blocos de
madeira e a tuba macia no "um"; na marchinha, a tuba no 1 e no 3 e o surdinho bem macio), noite (harpa em arpejo lento e a
celesta nas notas longas, sem percussão), amigos (palmas baixinhas, pandeiro no 2 e no 4 e as castanholas, 2 compassos),
mov (o ganzá em semicolcheias, 1 compasso), pingos (gotinhas de caixinha de música, 4 compassos, uma nota que cabe no acorde
de cada lugar da frase). Sem perigo (a noite é mansa).
Frases: dia = a melodia no xilofone com as risadinhas da flauta (a A com duas versões; a 2 ganha o glockenspiel uma oitava
acima, como a volta do tema no esboço), entardecer = a mesma melodia na flauta, mais cantada, com a marimba uma oitava abaixo
nas notas longas. Neste mundo o dia todo é um entardecer: as duas são do entardecer de brinquedo, só a cor muda.
Nada de órgão, trêmolo de cordas, grito, voz gravada ou bumbo pesado: escalas de brinquedo, nunca de terror.
"""
import struct, sys, os, json

PPQ = 480
SR = 22050
Q = 126
CPC = 4 * PPQ
SEMI = PPQ // 4
COLC = PPQ // 2
TERC = PPQ // 6
CAUDA_TICKS = PPQ * 6


def vlq(n):
    b = [n & 0x7F]
    n >>= 7
    while n:
        b.append(0x80 | (n & 0x7F))
        n >>= 7
    return bytes(reversed(b))


def escrever(caminho, canais, ev, fim, q=Q, cauda=CAUDA_TICKS):
    """canais: nome -> (canal, programa, volume, pan, reverb); ev: (tick, nome, nota, vel, dur). Canal 9 = percussão."""
    msgs = [(0, 0, b'\xff\x51\x03' + round(60_000_000 / q).to_bytes(3, 'big')), (0, 0, b'\xff\x58\x04' + bytes([4, 2, 24, 8]))]
    for nome, (c, prog, vol, pan, rev) in canais.items():
        msgs += [(0, 1, bytes([0xC0 | c, prog])), (0, 1, bytes([0xB0 | c, 7, vol])), (0, 1, bytes([0xB0 | c, 10, pan])),
                 (0, 1, bytes([0xB0 | c, 91, rev])), (0, 1, bytes([0xB0 | c, 93, 0]))]
    for t, nome, nota, v, d in ev:
        c = canais[nome][0]
        v = max(1, min(127, int(v)))
        msgs.append((t, 3, bytes([0x90 | c, nota, v])))
        msgs.append((t + max(20, int(d)), 2, bytes([0x80 | c, nota, 0])))
    msgs.sort(key=lambda m: (m[0], m[1]))
    trk, ult = bytearray(), 0
    for t, _, b in msgs:
        trk += vlq(t - ult) + b
        ult = t
    trk += vlq(max(0, fim + cauda - ult)) + b'\xff\x2f\x00'
    with open(caminho, 'wb') as f:
        f.write(b'MThd' + struct.pack('>IHHH', 6, 0, 1, PPQ))
        f.write(b'MTrk' + struct.pack('>I', len(trk)) + trk)


def hsh(n):
    return ((n * 2654435761 + 12345) & 0xFFFFFFFF) / 0xFFFFFFFF


# ------------------------------------------------------------------ harmonia (a do esboço aprovado)
ACORDE = {'Dm': (62, 65, 69), 'G': (59, 62, 67), 'C': (60, 64, 67), 'A7': (61, 64, 67), 'F': (60, 65, 69), 'D': (62, 66, 69)}
RAIZ = {'Dm': 38, 'G': 43, 'C': 36, 'A7': 33, 'F': 41, 'D': 38}
QUINTA = {'Dm': 45, 'G': 38, 'C': 43, 'A7': 40, 'F': 36, 'D': 45}
FORMA = [['Dm'], ['G'], ['Dm'], ['C', 'A7'], ['Dm'], ['G'], ['Dm'], ['A7'],
         ['F'], ['C'], ['Dm'], ['G', 'A7'], ['F'], ['C'], ['Dm'], ['A7']]
NC = len(FORMA)
MARCHINHA = set(range(8, 16))
# melodia: compassos 0-7 em colcheias (início, nota, colcheias); 8-15 em semicolcheias (início, nota, semicolcheias)
MEL = [
    [(0, 74, 1), (1, 77, 1), (2, 81, 2), (5, 83, 1), (6, 81, 1), (7, 77, 1)],
    [(0, 79, 1), (1, 83, 1), (2, 86, 2), (5, 84, 1), (6, 83, 1), (7, 79, 1)],
    [(0, 81, 1), (1, 81, 1), (2, 77, 1), (3, 74, 1), (4, 76, 2), (6, 77, 1), (7, 79, 1)],
    [(0, 79, 1), (1, 76, 1), (2, 72, 1), (3, 76, 1), (4, 73, 2)],
    [(0, 74, 1), (1, 77, 1), (2, 81, 2), (5, 83, 1), (6, 81, 1), (7, 77, 1)],
    [(0, 79, 1), (1, 83, 1), (2, 86, 2), (5, 84, 1), (6, 83, 1), (7, 79, 1)],
    [(0, 77, 1), (1, 81, 1), (2, 86, 2), (4, 84, 1), (5, 81, 1), (6, 77, 1), (7, 76, 1)],
    [(0, 73, 2), (2, 76, 1), (3, 79, 1), (4, 81, 3)],
    [(0, 81, 1), (1, 84, 2), (3, 81, 1), (4, 77, 2), (6, 79, 2), (8, 81, 4)],
    [(0, 79, 1), (1, 84, 2), (3, 79, 1), (4, 76, 2), (6, 77, 2), (8, 79, 4)],
    [(0, 77, 1), (1, 81, 2), (3, 77, 1), (4, 74, 2), (6, 76, 2), (8, 77, 2), (10, 79, 2), (12, 81, 4)],
    [(0, 83, 1), (1, 86, 2), (3, 83, 1), (4, 79, 2), (6, 81, 2), (8, 85, 2), (10, 88, 2), (12, 81, 4)],
    [(0, 81, 1), (1, 84, 2), (3, 81, 1), (4, 77, 2), (6, 79, 2), (8, 81, 4)],
    [(0, 79, 1), (1, 84, 2), (3, 79, 1), (4, 76, 2), (6, 77, 2), (8, 79, 4)],
    [(0, 77, 1), (1, 81, 2), (3, 77, 1), (4, 74, 2), (6, 76, 2), (8, 74, 4), (12, 77, 2), (14, 79, 2)],
    [(0, 81, 1), (1, 85, 2), (3, 81, 1), (4, 79, 2), (6, 76, 2), (8, 73, 4), (12, 76, 4)],
]
# as risadinhas da flauta (compasso, semicolcheia de início, notas): nas pausas da melodia, como no esboço
RISADAS = [(3, 12, [86, 88, 89, 91, 93]), (7, 14, [88, 89, 91, 93]), (8, 12, [88, 89, 91, 93, 95]),
           (10, 12, [86, 88, 89, 91, 93]), (12, 12, [88, 89, 91, 93, 95])]
FRASES = [('A', 0, 4), ("A'", 4, 4), ('Bx', 8, 4), ('By', 12, 4)]
NOME_ARQ = {'A': 'a', "A'": 'a2', 'Bx': 'bx', 'By': 'by'}
VARIANTES_DIA = {'A': 2, "A'": 1, 'Bx': 1, 'By': 1}
BLOCO_AGUDO, BLOCO_GRAVE, CASTANHOLA, TRIANGULO = 76, 77, 85, 81
MARACAS, CABASA, PANDEIRO, PALMA, SURDINHO = 70, 69, 54, 39, 41


def notas_do_compasso(b):
    """(tick no compasso, nota, duração em ticks)."""
    passo = SEMI if b in MARCHINHA else COLC
    return [(i * passo, n, d * passo) for (i, n, d) in MEL[b]]


def metades(b):
    """(tick, acorde, ticks) de cada acorde do compasso."""
    acs = FORMA[b]
    n = len(acs)
    return [(k * CPC // n, a, CPC // n) for k, a in enumerate(acs)]


# ------------------------------------------------------------------ camadas
def base():
    ev = []
    for b in range(NC):
        t0 = b * CPC
        prox = FORMA[(b + 1) % NC][0]
        for ini, ac, dur in metades(b):
            r = RAIZ[ac]
            q = QUINTA[ac] if QUINTA[ac] > r else QUINTA[ac] + 12
            if dur == CPC:
                # o fagote na ponta dos pés: fundamental, quinta, oitava e a notinha cromática que chega no próximo
                alvo = RAIZ[prox]
                aprox = alvo - 1 if alvo - 1 != r + 12 else alvo + 1
                while aprox > r + 14:
                    aprox -= 12
                while aprox < r:
                    aprox += 12
                pe = (r, q, r + 12, aprox)
            else:
                pe = (r, q)
            for i, n in enumerate(pe):
                ev.append((t0 + ini + i * PPQ, 'fagote', n, 72 + (6 if i == 0 else 0) + round(4 * hsh(b * 7 + i)), COLC - 40))
            # o relojinho da marimba (colcheias) e o pizzicato no contratempo
            a = ACORDE[ac]
            padrao = (a[0] - 12, a[1] - 12, a[2] - 12, a[1], a[0], a[2] - 12, a[1] - 12, a[2] - 12)
            for i in range(dur // COLC):
                ev.append((t0 + ini + i * COLC, 'marimba', padrao[i], 52 + (8 if i % 4 == 0 else 0), COLC - 20))
            if b in MARCHINHA:
                # o pizzicato no 2, na síncope (a semicolcheia 10) e no 4; no compasso de dois acordes, no 2 de cada metade
                toques = [(4, 74), (10, 66), (12, 74)] if dur == CPC else [(4, 74)]
                for s, v in toques:
                    for k, n in enumerate(a):
                        ev.append((t0 + ini + s * SEMI, 'pizz', n, v - 4 * k, 100))
                # tuba no 1 e no 3 (a quinta no 3, ou a fundamental do acorde novo) e o surdinho bem macio
                ev.append((t0 + ini, 'tuba', r, 74, PPQ - 60))
                if dur == CPC:
                    ev.append((t0 + 2 * PPQ, 'tuba', QUINTA[ac], 66, PPQ - 60))
                ev.append((t0 + ini, 'perc', SURDINHO, 44 if ini == 0 else 36, COLC))
            else:
                for bt in (1, 3):
                    if ini <= bt * PPQ < ini + dur:
                        for k, n in enumerate(a):
                            ev.append((t0 + bt * PPQ, 'pizz', n, 70 - 4 * k, 110))
                ev.append((t0 + ini, 'tuba', r, 56, PPQ))
        # o tique-taque dos blocos de madeira, baixinho
        for bt in range(4):
            ev.append((t0 + bt * PPQ, 'perc', BLOCO_AGUDO if bt % 2 == 0 else BLOCO_GRAVE, 40 + (8 if bt == 0 else 0), COLC))
        if b % 4 == 0:
            ev.append((t0, 'perc', TRIANGULO, 46, CPC))
    can = {'fagote': (3, 70, 70, 52, 30), 'marimba': (1, 12, 52, 46, 36), 'pizz': (2, 45, 50, 84, 44), 'tuba': (4, 58, 56, 64, 30),
           'perc': (9, 0, 72, 64, 34)}
    return can, ev, NC


def noite():
    """Harpa em arpejo lento (semínimas) e a celesta nas notas longas do acorde; sem percussão."""
    ev = []
    for b in range(NC):
        t0 = b * CPC
        for ini, ac, dur in metades(b):
            a = ACORDE[ac]
            arp = (a[0] - 12, a[1] - 12, a[2] - 12, a[0])
            for j in range(dur // PPQ):
                ev.append((t0 + ini + j * PPQ, 'harpa', arp[(j + b) % 4], 50 + round(8 * hsh(b * 9 + j)), PPQ * 2))
            ev.append((t0 + ini + 6, 'harpa', RAIZ[ac] + 12, 46, dur))
        if b % 2 == 0:
            n = ACORDE[FORMA[b][0]][2] + 12
            ev.append((t0 + PPQ, 'celesta', n, 44, PPQ * 3))
    return {'harpa': (0, 46, 92, 58, 60), 'celesta': (1, 8, 70, 72, 70)}, ev, NC


AMIGOS_COMPASSOS = 2


def amigos():
    """Palmas baixinhas e pandeiro no 2 e no 4, as castanholas da marchinha no fim do segundo compasso."""
    ev = []
    for b in range(AMIGOS_COMPASSOS):
        t0 = b * CPC
        for j in (1, 3):
            ev.append((t0 + j * PPQ, 'perc', PALMA, 58 + round(4 * hsh(b * 3 + j)), PPQ // 2))
            ev.append((t0 + j * PPQ, 'perc', PANDEIRO, 50, PPQ // 2))
        if b == 1:
            for i in (12, 13, 14):
                ev.append((t0 + i * SEMI, 'perc', CASTANHOLA, 62 + 4 * (i - 12), SEMI))
    return {'perc': (9, 0, 100, 64, 34)}, ev, AMIGOS_COMPASSOS


def mov():
    """O ganzá (cabasa e maracas) em semicolcheias, com o acento da marchinha."""
    ev = []
    for i in range(16):
        ev.append((i * SEMI, 'perc', CABASA if i % 2 else MARACAS, 44 + (16 if i in (0, 3, 6, 8, 11, 14) else 0), SEMI))
    return {'perc': (9, 0, 100, 64, 30)}, ev, 1


def pingos():
    """Gotinhas de caixinha de música, numa nota que cabe no acorde do lugar da frase em todas as quatro frases
    (1º compasso: Lá, de Ré menor e de Fá; 2º: Sol, de Sol e de Dó; 3º: Ré, Fá ou Lá, de Ré menor; 4º: Sol, de Dó, Lá7 e Sol)."""
    cabe = [[81, 93], [79, 91], [86, 89, 93], [79, 91]]
    ev = []
    for s in range(4 * 8):
        h = int(hsh(s * 7 + 5) * 0xFFFFFFFF)
        if h % 5 == 0:
            c = s // 8
            ev.append((c * CPC + (s % 8) * COLC, 'caixinha', cabe[c][(h >> 8) % len(cabe[c])], 44 + (h >> 12) % 14, PPQ))
    return {'caixinha': (0, 10, 96, 64, 60)}, ev, 4


# ------------------------------------------------------------------ frases
def risadinha(ev, t, notas, v):
    for i, n in enumerate(notas):
        ev.append((t + i * TERC, 'flauta', n, v - 3 * i - (8 if i == len(notas) - 1 else 0), TERC - 14))


def frase_dia(ini, nb, variante):
    ev = []
    for b in range(ini, ini + nb):
        t0 = (b - ini) * CPC
        for (t, n, d) in notas_do_compasso(b):
            forte = t % PPQ == 0
            v = (94 if forte else 84) + round(4 * hsh(b * 13 + t))
            ev.append((t0 + t, 'xilo', n, v, d - 40))
            if variante == 2:
                ev.append((t0 + t, 'glock', n + 12, 62, min(d, PPQ) - 40))
        for (rb, s, notas) in RISADAS:
            if rb == b:
                risadinha(ev, t0 + s * SEMI, notas, 74)
    return {'xilo': (0, 13, 116, 60, 40), 'glock': (1, 9, 76, 76, 50), 'flauta': (2, 73, 112, 88, 50)}, ev


def frase_tarde(ini, nb):
    """A melodia na flauta, mais cantada (as notas ligadas), com a marimba uma oitava abaixo nas notas longas."""
    ev = []
    for b in range(ini, ini + nb):
        t0 = (b - ini) * CPC
        ns = notas_do_compasso(b)
        for k, (t, n, d) in enumerate(ns):
            prox = ns[k + 1][0] if k + 1 < len(ns) else CPC
            dur = max(d, min(prox - t, d * 2)) - 30
            ev.append((t0 + t, 'flautam', n, 78 + round(4 * hsh(b * 11 + t)), dur))
            if d >= PPQ:
                ev.append((t0 + t + 8, 'marimba', n - 12, 60, d - 40))
    return {'flautam': (0, 73, 96, 70, 56), 'marimba': (1, 12, 70, 50, 40)}, ev


if __name__ == '__main__':
    saida = sys.argv[1]
    os.makedirs(saida, exist_ok=True)
    tid = 'noite-das-fantasias'
    amostras_c = 4 * 60 * SR / Q
    assert abs(amostras_c - round(amostras_c)) < 1e-9
    amostras_c = round(amostras_c)
    item = dict(nome='Noite das Fantasias', tom='Ré dórico', q=Q, compasso='4/4', amostrasCompasso=amostras_c, compassos=NC,
                amostrasVolta=amostras_c * NC, frases=[], camadas=[],
                carater='festa à fantasia de brinquedo em Ré dórico, travessa e alegre, nunca de terror: xilofone saltitante, fagote na ponta dos pés, pizzicato no contratempo, a marchinha e as risadinhas da flauta',
                orquestra='fagote, pizzicato, marimba, tuba macia e blocos de madeira na base; xilofone com as risadinhas da flauta (e o glockenspiel na volta do tema) no dia; flauta cantada com a marimba no entardecer; harpa e celesta à noite; palmas, pandeiro e castanholas com os amigos; ganzá no andar; caixinha de música na chuva')
    for cam in ['base', 'noite', 'amigos', 'mov', 'pingos']:
        can, ev, ncomp = globals()[cam]()
        arq = f'{tid}__{cam}'
        escrever(os.path.join(saida, arq + '.mid'), can, ev, ncomp * CPC)
        item['camadas'].append(dict(id=cam, arq=arq, compassos=ncomp, notas=len(ev)))
    for nome_f, ini, nb in FRASES:
        for v in range(1, VARIANTES_DIA[nome_f] + 1):
            can, ev = frase_dia(ini, nb, v)
            arq = f'{tid}__dia_{NOME_ARQ[nome_f]}_{v}'
            escrever(os.path.join(saida, arq + '.mid'), can, ev, nb * CPC)
            item['frases'].append(dict(id=f'dia_{NOME_ARQ[nome_f]}_{v}', frase=nome_f, contexto='dia', variante=v, compassoInicio=ini, compassos=nb, arq=arq, notas=len(ev)))
        can, ev = frase_tarde(ini, nb)
        arq = f'{tid}__tarde_{NOME_ARQ[nome_f]}_1'
        escrever(os.path.join(saida, arq + '.mid'), can, ev, nb * CPC)
        item['frases'].append(dict(id=f'tarde_{NOME_ARQ[nome_f]}_1', frase=nome_f, contexto='entardecer', variante=1, compassoInicio=ini, compassos=nb, arq=arq, notas=len(ev)))
    seg_c = amostras_c / SR
    est = sum(c['compassos'] * seg_c + 0.12 for c in item['camadas']) + sum(f['compassos'] * seg_c + 0.76 for f in item['frases'])
    item['estimativaSeg'] = round(est, 1)
    json.dump({tid: item}, open(os.path.join(saida, 'plano.json'), 'w'), indent=1, ensure_ascii=False)
    print(f"{tid}: volta {NC} comp = {amostras_c * NC / SR:.2f} s, camadas {len(item['camadas'])}, frases {len(item['frases'])}, "
          f"memória est. {est:.1f} s = {est * 24000 * 4 / 1048576:.2f} MB a 24 kHz")
