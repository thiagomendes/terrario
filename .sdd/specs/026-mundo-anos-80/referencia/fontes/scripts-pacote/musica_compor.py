"""Trilha do bairro da Vila Neon para o pacote do jogo (spec 026, T18): synth-pop de bairro dos anos 80,
partitura escrita aqui, nota por nota (nada de música existente), partida em camadas e frases como as
da 019 e da 014 (014/scripts-pacote/musica_compor.py).

Rodar tudo de novo: ver rodar.sh (nesta pasta). Este passo: python3 -I musica_compor.py <pasta_midi>
Escreve uma faixa MIDI por camada ou frase e plano.json (o que musica_processar.py precisa).

Forma: 16 compassos de 4/4 a 120 semínimas por minuto (2 s por compasso, volta de 32 s), em Ré maior,
frases A, A', Bx, By de 4 compassos. O andamento é o mesmo do show (src/jogo/show.ts): o compasso do
bairro e o do palco têm o mesmo tamanho, e a batida do rinque e a do rádio entram na grade da trilha.
Camadas: base (baixo de sintetizador em colcheias, pad quente e a bateria eletrônica bem baixinha),
noite (pad macio e piano elétrico em arpejo lento, sem bateria), amigos (palmas, 2 compassos), mov
(chimbal da bateria eletrônica, 1 compasso), pingos (caixinha de música, gotinhas, 4 compassos).
Sem perigo (a noite do bairro é mansa).
Frases: dia = a melodia calma no sintetizador quadrado (a A com duas versões; a 2 ganha a celesta
uma oitava acima nas notas longas), entardecer = guitarra limpa com eco (o eco escrito na partitura).
"""
import struct, sys, os, json

PPQ = 480
SR = 22050
Q = 120
CPC = 4 * PPQ
COLC = PPQ // 2
CAUDA_TICKS = PPQ * 6
ESCALA = {2, 4, 6, 7, 9, 11, 1}   # Ré maior


def vlq(n):
    b = [n & 0x7F]
    n >>= 7
    while n:
        b.append(0x80 | (n & 0x7F))
        n >>= 7
    return bytes(reversed(b))


def escrever(caminho, canais, ev, fim, q=Q, rev=64, cauda=CAUDA_TICKS):
    """canais: nome -> (canal, programa, volume, pan); ev: (tick, nome, nota, vel, dur). Canal 9 = bateria (programa = kit)."""
    msgs = [(0, 0, b'\xff\x51\x03' + round(60_000_000 / q).to_bytes(3, 'big')), (0, 0, b'\xff\x58\x04' + bytes([4, 2, 24, 8]))]
    for nome, (c, prog, vol, pan) in canais.items():
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


# ------------------------------------------------------------------ harmonia e melodia (escritas aqui)
# nome: (baixo, notas do acorde para o pad)
AC = {
    'D': (38, [57, 62, 66, 69]),
    'Bm7': (35, [57, 62, 66, 71]),
    'G7M': (43, [55, 59, 62, 66]),
    'A': (45, [57, 61, 64, 69]),
    'Em7': (40, [55, 59, 62, 67]),
    'F#m7': (42, [54, 57, 61, 64]),
}
FORMA = [['D'], ['Bm7'], ['G7M'], ['A'], ['D'], ['Bm7'], ['Em7'], ['A'],
         ['G7M'], ['F#m7'], ['Em7'], ['A'], ['G7M'], ['F#m7'], ['Em7', 'A'], ['D']]
NC = len(FORMA)
# melodia: (colcheia de início 0..7, nota, colcheias)
MEL = [
    [(0, 74, 3), (3, 73, 1), (4, 74, 2), (6, 78, 2)],
    [(0, 76, 4), (4, 74, 2), (6, 71, 2)],
    [(0, 71, 2), (2, 74, 2), (4, 78, 3), (7, 79, 1)],
    [(0, 76, 6), (6, 73, 2)],
    [(0, 74, 3), (3, 73, 1), (4, 74, 2), (6, 81, 2)],
    [(0, 78, 4), (4, 76, 2), (6, 74, 2)],
    [(0, 71, 2), (2, 74, 2), (4, 79, 2), (6, 78, 2)],
    [(0, 76, 7)],
    [(0, 83, 2), (2, 81, 2), (4, 79, 2), (6, 78, 2)],
    [(0, 76, 3), (3, 78, 1), (4, 81, 4)],
    [(0, 79, 2), (2, 78, 2), (4, 76, 2), (6, 74, 2)],
    [(0, 73, 4), (4, 76, 4)],
    [(0, 83, 2), (2, 81, 2), (4, 79, 2), (6, 83, 2)],
    [(0, 81, 4), (4, 78, 2), (6, 76, 2)],
    [(0, 74, 2), (2, 76, 2), (4, 73, 2), (6, 76, 2)],
    [(0, 74, 6)],
]
FRASES = [('A', 0, 4), ("A'", 4, 4), ('Bx', 8, 4), ('By', 12, 4)]
NOME_ARQ = {'A': 'a', "A'": 'a2', 'Bx': 'bx', 'By': 'by'}
# só a A tem duas versões (com 16 compassos de 2 s, a memória fica abaixo da meta da 019, 15 MB a 24 kHz)
VARIANTES_DIA = {'A': 2, "A'": 1, 'Bx': 1, 'By': 1}
BUMBO, CAIXA, PALMA, CHIMBAL, CHIMBAL_PE = 36, 38, 39, 42, 44


def pcs_compasso(b):
    ac = set()
    for nome in FORMA[b]:
        ac |= {n % 12 for n in AC[nome][1]} | {AC[nome][0] % 12}
    crom = ac - ESCALA
    return ac | {p for p in ESCALA if all((p - c) % 12 not in (1, 11) for c in crom)}


def acima(n, b, opcoes):
    pcs = pcs_compasso(b)
    for k in opcoes:
        if (n + k) % 12 in pcs:
            return n + k
    return n + opcoes[0]


# ------------------------------------------------------------------ camadas
def base():
    ev = []
    for b, acs in enumerate(FORMA):
        t0 = b * CPC
        for k, nome in enumerate(acs):
            raiz, pad = AC[nome]
            n8 = 8 // len(acs)
            ini = t0 + k * n8 * COLC
            # baixo de sintetizador em colcheias (o pulso da época), macio; a última sobe a oitava às vezes
            for j in range(n8):
                n = raiz + (12 if (j == n8 - 1 and hsh(b * 5 + k) < 0.5) else 0)
                v = 70 if j % 2 == 0 else 58
                ev.append((ini + j * COLC, 'baixo', n, v + round(4 * hsh(b * 17 + j)), COLC - 50))
            # o pad quente segura o acorde
            for i, n in enumerate(pad):
                ev.append((ini + i * 8, 'pad', n, 50 + round(4 * hsh(b * 3 + i)), n8 * COLC - 30))
        # bateria eletrônica bem baixinha: bumbo no 1 e no 3, caixa macia no 2 e no 4
        for j in (0, 2):
            ev.append((t0 + j * PPQ, 'bateria', BUMBO, 62, PPQ // 2))
        for j in (1, 3):
            ev.append((t0 + j * PPQ, 'bateria', CAIXA, 40 + round(4 * hsh(b + j)), PPQ // 2))
        if b % 4 == 3:
            ev.append((t0 + 3 * PPQ + COLC, 'bateria', BUMBO, 50, PPQ // 3))
    can = {'baixo': (2, 39, 96, 64), 'pad': (0, 89, 80, 64), 'bateria': (9, 25, 90, 64)}
    return can, ev, NC


def noite():
    """Pad macio e piano elétrico em arpejo de semínimas, sem bateria."""
    ev = []
    for b, acs in enumerate(FORMA):
        t0 = b * CPC
        for k, nome in enumerate(acs):
            raiz, pad = AC[nome]
            batidas = 4 // len(acs)
            ini = t0 + k * batidas * PPQ
            for i, n in enumerate(pad):
                ev.append((ini + i * 20, 'pad', n, 46, batidas * PPQ - 30))
            arp = [pad[0] + 12, pad[2] + 12, pad[1] + 12, pad[3] + 12]
            for j in range(batidas):
                ev.append((ini + j * PPQ, 'ep', arp[(j + b) % 4], 44 + round(6 * hsh(b * 9 + j)), PPQ * 2))
    return {'pad': (0, 89, 84, 60), 'ep': (1, 4, 90, 70)}, ev, NC


AMIGOS_COMPASSOS = 2


def amigos():
    """Palmas no 2 e no 4 (da bateria eletrônica), com um pandeirinho macio nas colcheias de trás."""
    ev = []
    for b in range(AMIGOS_COMPASSOS):
        t0 = b * CPC
        for j in (1, 3):
            ev.append((t0 + j * PPQ, 'bateria', PALMA, 64 + round(4 * hsh(b * 3 + j)), PPQ // 2))
        for j in range(4):
            ev.append((t0 + j * PPQ + COLC, 'bateria', 54, 34 + round(4 * hsh(b * 7 + j)), PPQ // 3))
    return {'bateria': (9, 25, 100, 64)}, ev, AMIGOS_COMPASSOS


def mov():
    """Chimbal da bateria eletrônica em semicolcheias, com o acento nas colcheias."""
    ev = []
    for i in range(16):
        ev.append((i * (PPQ // 4), 'bateria', CHIMBAL, 46 if i % 2 == 0 else 30, PPQ // 6))
    return {'bateria': (9, 25, 100, 64)}, ev, 1


def pingos():
    """Gotinhas de caixinha de música: só lá e mi (cabem em todos os acordes da forma)."""
    ev = []
    notas = [81, 88, 93, 76]
    for s in range(4 * 8):
        h = int(hsh(s * 7 + 5) * 0xFFFFFFFF)
        if h % 5 == 0:
            t = (s // 8) * CPC + (s % 8) * COLC
            ev.append((t, 'caixinha', notas[(h >> 8) % 4], 44 + (h >> 12) % 14, PPQ))
    return {'caixinha': (0, 10, 96, 64)}, ev, 4


# ------------------------------------------------------------------ frases
def notas_frase(ini, nb):
    return [(b, c, n, d) for b in range(ini, ini + nb) for (c, n, d) in MEL[b]]


def frase_dia(nome, ini, nb, variante):
    ev = []
    for (b, c, n, d) in notas_frase(ini, nb):
        t = (b - ini) * CPC + c * COLC
        v = 74 + round(6 * hsh(b * 13 + c)) - (6 if c % 2 else 0)
        ev.append((t, 'mel', n, v, d * COLC - 40))
        if variante == 2 and d >= 3:
            # a celesta brilha uma oitava acima nas notas longas, e uma terça macia por cima
            ev.append((t + 6, 'cel', n + 12, v - 18, min(d * COLC, PPQ * 2)))
            ev.append((t + 10, 'mel', acima(n, b, (3, 4)), v - 26, d * COLC - 60))
    return {'mel': (1, 80, 76, 66), 'cel': (2, 8, 80, 74)}, ev


def frase_tarde(nome, ini, nb):
    """Guitarra limpa: as notas de tempo forte ou longas, cada uma com o eco escrito (colcheia pontuada)."""
    ns = [x for x in notas_frase(ini, nb) if x[1] % 2 == 0 or x[3] >= 2]
    ev = []
    for (b, c, n, d) in ns:
        t = (b - ini) * CPC + c * COLC
        dur = max(d, 2) * COLC - 30
        ev.append((t, 'gtr', n - 12, 76, dur))
        for k, vv in ((1, 40), (2, 22)):
            te = t + k * 3 * (PPQ // 2) // 1
            if te < nb * CPC:
                ev.append((te, 'eco', n - 12, vv, dur))
    return {'gtr': (1, 27, 100, 56), 'eco': (2, 27, 90, 80)}, ev


if __name__ == '__main__':
    saida = sys.argv[1]
    os.makedirs(saida, exist_ok=True)
    tid = 'vila-neon'
    amostras_c = 4 * 60 * SR / Q
    assert abs(amostras_c - round(amostras_c)) < 1e-9
    amostras_c = round(amostras_c)
    item = dict(nome='Vila Neon', tom='Ré maior', q=Q, compasso='4/4', amostrasCompasso=amostras_c, compassos=NC,
                amostrasVolta=amostras_c * NC, frases=[], camadas=[],
                carater='synth-pop de bairro dos anos 80 em Ré maior: baixo de sintetizador em colcheias, pad quente, bateria eletrônica baixinha e a melodia calma no sintetizador',
                orquestra='baixo de sintetizador, pad quente e bateria eletrônica (TR-808 do FluidR3); sintetizador quadrado e celesta de dia; guitarra limpa com eco no entardecer; pad e piano elétrico à noite; palmas com os amigos; chimbal no andar; caixinha de música na chuva')
    for cam in ['base', 'noite', 'amigos', 'mov', 'pingos']:
        can, ev, ncomp = globals()[cam]()
        arq = f'{tid}__{cam}'
        escrever(os.path.join(saida, arq + '.mid'), can, ev, ncomp * CPC)
        item['camadas'].append(dict(id=cam, arq=arq, compassos=ncomp, notas=len(ev)))
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
