"""Trilha da Cidade Grande para o pacote do jogo (spec 014, T09): a partitura aprovada no esboço (compor_cidade.py,
jazz leve em Fá maior com swing) partida em camadas e frases como as da 019 (scripts-musica/compor.py).

Rodar tudo de novo: ver rodar.sh (nesta pasta). Este passo: python3 -I musica_compor.py <pasta_midi>
Escreve uma faixa MIDI por camada ou frase e plano.json (o que musica_processar.py precisa).

Forma: os 16 compassos de 4/4 da melodia aprovada (A, A', Bx, By de 4 compassos), a 126 semínimas por minuto.
O esboço tocava a 108 com 18 compassos; a 108 a volta teria 40 s e o pacote passaria da meta de memória (15 MB),
então a volta é a dos 16 compassos (o By já fecha em Fá) e o andamento sobe um pouco (volta de 30,5 s; a do Rancho
tem 25,7 s). As camadas e as frases têm o mesmo andamento e cabem na volta, como em todos os temas.
Camadas: base (baixo andando, piano acompanhando, vassourinha bem baixinha), noite (piano e vibrafone, notas longas),
amigos (chimbal; o estalo de dedos é síntese nossa somada em musica_processar.py; 2 compassos), mov (escovinha,
1 compasso), pingos (piano agudo, gotinhas, 4 compassos). Sem perigo (o guaxinim é manso).
Frases: dia = melodia de piano (A e Bx com duas versões), entardecer = vibrafone em sextas.
"""
import struct, sys, os, json

PPQ = 480
SR = 22050
Q = 126
CPC = 4 * PPQ
CAUDA_TICKS = PPQ * 6
ESCALA = {5, 7, 9, 10, 0, 2, 4}   # Fá maior


def vlq(n):
    b = [n & 0x7F]
    n >>= 7
    while n:
        b.append(0x80 | (n & 0x7F))
        n >>= 7
    return bytes(reversed(b))


def escrever(caminho, canais, ev, fim):
    """canais: nome -> (canal, programa, volume, pan); ev: (tick, nome, nota, vel, dur). Canal 9 = bateria (programa = kit)."""
    msgs = [(0, 0, b'\xff\x51\x03' + round(60_000_000 / Q).to_bytes(3, 'big')), (0, 0, b'\xff\x58\x04' + bytes([4, 2, 24, 8]))]
    for nome, (c, prog, vol, pan) in canais.items():
        msgs += [(0, 1, bytes([0xC0 | c, prog])), (0, 1, bytes([0xB0 | c, 7, vol])), (0, 1, bytes([0xB0 | c, 10, pan])),
                 (0, 1, bytes([0xB0 | c, 91, 64])), (0, 1, bytes([0xB0 | c, 93, 0]))]
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
    trk += vlq(max(0, fim + CAUDA_TICKS - ult)) + b'\xff\x2f\x00'
    with open(caminho, 'wb') as f:
        f.write(b'MThd' + struct.pack('>IHHH', 6, 0, 1, PPQ))
        f.write(b'MTrk' + struct.pack('>I', len(trk)) + trk)


def hsh(n):
    return ((n * 2654435761 + 12345) & 0xFFFFFFFF) / 0xFFFFFFFF


# ------------------------------------------------------------------ harmonia e melodia aprovadas (compor_cidade.py)
AC = {
    'F7M': (41, [41, 45, 48, 52], [57, 60, 64, 67]),
    'Dm7': (38, [38, 41, 45, 48], [53, 57, 60, 64]),
    'Gm7': (43, [43, 46, 50, 53], [53, 57, 58, 62]),
    'C7': (36, [36, 40, 43, 46], [52, 57, 58, 62]),
    'Am7': (45, [45, 48, 52, 55], [55, 60, 64, 67]),
    'D7': (38, [38, 42, 45, 48], [54, 59, 60, 64]),
    'F7': (41, [41, 45, 48, 51], [51, 55, 57, 62]),
    'Bb7M': (46, [46, 50, 53, 57], [50, 53, 57, 60]),
    'Bbm6': (46, [46, 49, 53, 55], [53, 55, 58, 61]),
    'F6': (41, [41, 45, 48, 50], [57, 62, 65, 69]),
}
FORMA = [['F7M'], ['Dm7'], ['Gm7'], ['C7'], ['Am7'], ['D7'], ['Gm7', 'C7'], ['F7M'],
         ['F7M'], ['F7'], ['Bb7M'], ['Bbm6'], ['Am7'], ['D7'], ['Gm7', 'C7'], ['F6']]
NC = len(FORMA)
MEL = [
    [(0, 69, 2), (2, 72, 2), (4, 76, 3)],
    [(0, 74, 1), (1, 72, 1), (2, 69, 2), (4, 65, 4)],
    [(0, 70, 2), (2, 74, 2), (4, 77, 3)],
    [(0, 76, 1), (1, 74, 1), (2, 72, 2), (4, 70, 3)],
    [(0, 72, 2), (2, 76, 2), (4, 79, 3)],
    [(0, 78, 1), (1, 76, 1), (2, 74, 2), (4, 72, 2), (6, 69, 2)],
    [(0, 70, 2), (2, 74, 1), (3, 72, 1), (4, 70, 2), (6, 67, 2)],
    [(0, 69, 6)],
    [(0, 69, 2), (2, 72, 2), (4, 76, 3)],
    [(0, 75, 1), (1, 74, 1), (2, 72, 2), (4, 69, 2), (6, 72, 2)],
    [(0, 74, 2), (2, 77, 2), (4, 81, 3)],
    [(0, 79, 1), (1, 77, 1), (2, 73, 2), (4, 70, 4)],
    [(0, 72, 2), (2, 76, 2), (4, 79, 2), (6, 76, 2)],
    [(0, 78, 2), (2, 74, 2), (4, 72, 2), (6, 69, 2)],
    [(0, 70, 1), (1, 72, 1), (2, 74, 2), (4, 76, 2), (6, 79, 2)],
    [(0, 77, 6)],
]
FRASES = [('A', 0, 4), ("A'", 4, 4), ('Bx', 8, 4), ('By', 12, 4)]
NOME_ARQ = {'A': 'a', "A'": 'a2', 'Bx': 'bx', 'By': 'by'}
VARIANTES_DIA = {'A': 2, "A'": 1, 'Bx': 2, 'By': 1}
SWING = 0.62


def colcheia(i):
    """Tick da colcheia i (0..8) no compasso, com swing."""
    return (i // 2) * PPQ + (round(PPQ * SWING) if i % 2 else 0)


def pcs_compasso(b):
    """Classes de altura que soam bem no compasso b: as do acorde e as da escala que não esbarram num cromatismo dele."""
    ac = set()
    for nome in FORMA[b]:
        ac |= {n % 12 for n in AC[nome][1]} | {n % 12 for n in AC[nome][2]}
    crom = ac - ESCALA
    return ac | {p for p in ESCALA if all((p - c) % 12 not in (1, 11) for c in crom)}


def abaixo(n, b, opcoes):
    pcs = pcs_compasso(b)
    for k in opcoes:
        if (n - k) % 12 in pcs:
            return n - k
    return n - opcoes[0]


# ------------------------------------------------------------------ camadas
def base():
    ev = []
    for b, acs in enumerate(FORMA):
        t0 = b * CPC
        for k, nome in enumerate(acs):
            raiz, notas, voic = AC[nome]
            batidas = 4 // len(acs)
            prox = AC[acs[k + 1] if k + 1 < len(acs) else FORMA[(b + 1) % NC][0]][0]
            linha = [raiz, notas[1 + (b % 2)], notas[2], prox + (1 if hsh(b * 7 + k) < 0.5 else -1)] if batidas == 4 else \
                [raiz, prox - 1 if prox > raiz else prox + 1]
            for j, n in enumerate(linha):
                v = 74 if j == 0 else 64 + round(6 * hsh(b * 31 + j))
                ev.append((t0 + (k * batidas + j) * PPQ, 'baixo', n, v, PPQ - 40))
            # piano da mão esquerda: Charleston macio (1 e o "e" do 2); com dois acordes, um toque por acorde
            ini = t0 + k * batidas * PPQ
            toques = [(0, PPQ - 60), (PPQ + round(PPQ * SWING), PPQ // 2)] if batidas == 4 else [(0, PPQ * 2 - 80)]
            for (dt, dur) in toques:
                for i, n in enumerate(voic):
                    ev.append((ini + dt + i * 6, 'piano_e', n, 46 + round(5 * hsh(b * 11 + i + dt)), dur))
        # vassourinha: varrida no 1 e no 3, toque e chimbal de pé no 2 e no 4, prato de condução bem baixinho
        for j in range(4):
            if j % 2 == 0:
                ev.append((t0 + j * PPQ, 'bateria', 40, 26 + round(4 * hsh(b * 5 + j)), PPQ * 2 - 40))
            else:
                ev.append((t0 + j * PPQ, 'bateria', 38, 30 + round(4 * hsh(b * 3 + j)), PPQ // 2))
                ev.append((t0 + j * PPQ, 'bateria', 44, 34, PPQ // 2))
                ev.append((t0 + j * PPQ + round(PPQ * SWING), 'bateria', 51, 22, PPQ // 3))
    can = {'piano_e': (0, 0, 84, 58), 'baixo': (2, 32, 108, 64), 'bateria': (9, 40, 84, 64)}
    return can, ev, NC


def noite():
    """Piano e vibrafone, mais calmos: o vibrafone em mínimas pelas notas do acorde, o piano em acordes longos bem agudos."""
    ev = []
    fins = {ini + n - 1 for _, ini, n in FRASES}
    for b, acs in enumerate(FORMA):
        t0 = b * CPC
        for k, nome in enumerate(acs):
            raiz, notas, voic = AC[nome]
            batidas = 4 // len(acs)
            ini = t0 + k * batidas * PPQ
            alto = [n + 12 for n in voic]
            for i, n in enumerate(alto):
                ev.append((ini + i * 30, 'piano', n, 34 + round(4 * hsh(b * 3 + i)), batidas * PPQ - 40))
            if batidas == 4:
                pos = [(0, alto[1 + b % 2]), (2 * PPQ, alto[3] if b % 2 == 0 else alto[0] + 12)]
                if b in fins:
                    pos = pos[:1]
            else:
                pos = [(0, alto[2])]
            for j, (dt, n) in enumerate(pos):
                ev.append((ini + dt, 'vibra', n, 50 if j == 0 else 42, (batidas * PPQ if b in fins and batidas == 4 else 2 * PPQ) - 30))
    return {'piano': (0, 0, 80, 54), 'vibra': (1, 11, 96, 74)}, ev, NC


AMIGOS_COMPASSOS = 2


def amigos():
    """Chimbal de jazz (kit Jazz): condução no 1, 2, "e" do 2, 3, 4, "e" do 4; chimbal de pé no 2 e no 4.
    O estalo de dedos (no 2 e no 4) é síntese nossa: musica_processar.py soma nas posições de plano['estalos']."""
    ev = []
    for b in range(AMIGOS_COMPASSOS):
        t0 = b * CPC
        for j, (dt, v) in enumerate([(0, 30), (PPQ, 38), (PPQ + round(PPQ * SWING), 26), (2 * PPQ, 30), (3 * PPQ, 38), (3 * PPQ + round(PPQ * SWING), 26 + 4 * b)]):
            ev.append((t0 + dt, 'bateria', 42, v + round(3 * hsh(b * 9 + j)), PPQ // 3))
        for j in (1, 3):
            ev.append((t0 + j * PPQ, 'bateria', 44, 40, PPQ // 2))
    estalos = [b * CPC + j * PPQ for b in range(AMIGOS_COMPASSOS) for j in (1, 3)]
    return {'bateria': (9, 32, 100, 64)}, ev, AMIGOS_COMPASSOS, estalos


def mov():
    """Escovinha: toques de vassourinha em todas as colcheias com swing e uma varrida no 1 e no 3 (kit Brush)."""
    ev = []
    for i, v in enumerate([36, 22, 30, 24, 34, 22, 30, 26]):
        ev.append((colcheia(i), 'bateria', 38, v, PPQ // 3))
    ev.append((0, 'bateria', 40, 30, PPQ * 2 - 40))
    ev.append((2 * PPQ, 'bateria', 40, 26, PPQ * 2 - 40))
    return {'bateria': (9, 40, 100, 64)}, ev, 1


def pingos():
    """Gotinhas de piano agudo: só dó e sol (cabem em todos os acordes da forma)."""
    ev = []
    notas = [84, 91, 96, 79]
    for s in range(4 * 8):
        h = int(hsh(s * 7 + 3) * 0xFFFFFFFF)
        if h % 5 == 0:
            t = (s // 8) * CPC + colcheia(s % 8)
            ev.append((t, 'piano', notas[(h >> 8) % 4], 46 + (h >> 12) % 14, PPQ))
    return {'piano': (0, 0, 100, 64)}, ev, 4


# ------------------------------------------------------------------ frases
def notas_frase(ini, nb):
    out = []
    for b in range(ini, ini + nb):
        for (c, n, d) in MEL[b]:
            out.append((b, c, n, d))
    return out


def frase_dia(nome, ini, nb, variante):
    ev = []
    ns = notas_frase(ini, nb)
    cont = 0
    for i, (b, c, n, d) in enumerate(ns):
        t = (b - ini) * CPC + colcheia(c)
        dur = (colcheia(c + d) - colcheia(c)) if c + d < 8 else CPC - colcheia(c)
        v = 66 + round(8 * hsh(b * 13 + c)) - (6 if c % 2 else 0)
        ev.append((t, 'mel', n, v, max(60, dur - 20)))
        if variante == 2 and i < len(ns) - 1:
            if d >= 2:
                cont += 1
                if cont % 2 == 1 and t >= 60:   # apojatura de baixo (a "volta 2", mais enfeitada)
                    ev.append((t - 55, 'mel', abaixo(n, b, (1, 2)), v - 20, 70))
            if d >= 3:                           # terça de baixo, bem macia, nas notas longas
                ev.append((t + 8, 'mel', abaixo(n, b, (3, 4)), v - 24, max(60, dur - 40)))
    return {'mel': (1, 0, 100, 70)}, ev


def frase_tarde(nome, ini, nb):
    """Vibrafone em sextas: as notas de tempo forte ou longas, cada uma com a sexta de baixo."""
    ns = [x for x in notas_frase(ini, nb) if x[1] % 2 == 0 or x[3] >= 2]
    fim = nb * CPC
    ev = []
    for i, (b, c, n, d) in enumerate(ns):
        t = (b - ini) * CPC + colcheia(c)
        prox = (ns[i + 1][0] - ini) * CPC + colcheia(ns[i + 1][1]) if i + 1 < len(ns) else fim
        dur = min(prox - t, colcheia(min(8, c + d)) - colcheia(c) + 2 * PPQ if c + d < 8 else CPC)
        ev.append((t, 'vibra', n, 72, max(60, dur - 10)))
        ev.append((t + 6, 'vibra', abaixo(n, b, (9, 8)), 60, max(60, dur - 10)))
    return {'vibra': (1, 11, 100, 64)}, ev


if __name__ == '__main__':
    saida = sys.argv[1]
    os.makedirs(saida, exist_ok=True)
    tid = 'cidade-grande'
    amostras_c = 4 * 60 * SR / Q
    assert abs(amostras_c - round(amostras_c)) < 1e-9
    amostras_c = round(amostras_c)
    item = dict(nome='Cidade Grande', tom='Fá maior', q=Q, compasso='4/4', amostrasCompasso=amostras_c, compassos=NC,
                amostrasVolta=amostras_c * NC, frases=[], camadas=[],
                carater='jazz leve de praça em Fá maior, com swing: piano e baixo acústico andando, vassourinha bem baixinha',
                orquestra='piano acústico, baixo acústico e vassourinha; vibrafone no entardecer e à noite; estalo de dedos e chimbal com os amigos; escovinha no andar; piano agudo na chuva')
    for cam in ['base', 'noite', 'amigos', 'mov', 'pingos']:
        r = globals()[cam]()
        can, ev, ncomp = r[:3]
        arq = f'{tid}__{cam}'
        escrever(os.path.join(saida, arq + '.mid'), can, ev, ncomp * CPC)
        c = dict(id=cam, arq=arq, compassos=ncomp, notas=len(ev))
        if cam == 'amigos':
            c['estalos'] = [round(t * (amostras_c / CPC)) for t in r[3]]
        item['camadas'].append(c)
    for nome_f, ini, nb in FRASES:
        for v in range(1, VARIANTES_DIA[nome_f] + 1):
            can, ev = frase_dia(nome_f, ini, nb, v)
            arq = f'{tid}__dia_{NOME_ARQ[nome_f]}_{v}'
            escrever(os.path.join(saida, arq + '.mid'), can, ev, nb * CPC)
            item['frases'].append(dict(id=f'dia_{NOME_ARQ[nome_f]}_{v}', frase=nome_f, contexto='dia', variante=v, compassoInicio=ini, compassos=nb, arq=arq, notas=len(ev)))
        can, ev = frase_tarde(nome_f, ini, nb)
        arq = f'{tid}__tarde_{NOME_ARQ[nome_f]}_1'
        escrever(os.path.join(saida, arq + '.mid'), can, ev, nb * CPC)
        item['frases'].append(dict(id=f'tarde_{NOME_ARQ[nome_f]}_1', frase=nome_f, contexto='entardecer', variante=1, compassoInicio=ini, compassos=nb, arq=arq, notas=len(ev)))
    seg_c = amostras_c / SR
    est = sum(c['compassos'] * seg_c + 0.12 for c in item['camadas']) + sum(f['compassos'] * seg_c + 0.76 for f in item['frases'])
    item['estimativaSeg'] = round(est, 1)
    json.dump({tid: item}, open(os.path.join(saida, 'plano.json'), 'w'), indent=1, ensure_ascii=False)
    print(f"{tid}: volta {NC} comp = {amostras_c * NC / SR:.2f} s, camadas {len(item['camadas'])}, frases {len(item['frases'])}, "
          f"memória est. {est:.1f} s = {est * 24000 * 4 / 1048576:.2f} MB a 24 kHz")
