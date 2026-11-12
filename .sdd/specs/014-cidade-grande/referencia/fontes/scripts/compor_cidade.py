"""Amostra da trilha da Cidade Grande (esboço da spec 014): jazz leve de piano e baixo acústico, com vassourinha.
Partitura original desta spec. Mesmo caminho da 019: MIDI escrito aqui -> FluidSynth + FluidR3_GM (MIT) -> processar_cidade.py.
Uso: python3 -I compor_cidade.py <pasta_midi>
Saem: cidade-dia.mid (16 compassos + final, swing, vassourinha) e cidade-noite.mid (mais lenta, sem bateria, vibrafone).
"""
import struct, sys, os

PPQ = 480
CAUDA = PPQ * 6


def vlq(n):
    b = [n & 0x7F]
    n >>= 7
    while n:
        b.append(0x80 | (n & 0x7F))
        n >>= 7
    return bytes(reversed(b))


def escrever(caminho, q, canais, ev, fim):
    """canais: nome -> (canal, programa, volume, pan); ev: (tick, nome, nota, vel, dur)."""
    msgs = [(0, 0, b'\xff\x51\x03' + round(60_000_000 / q).to_bytes(3, 'big')), (0, 0, b'\xff\x58\x04' + bytes([4, 2, 24, 8]))]
    for nome, (c, prog, vol, pan) in canais.items():
        msgs += [(0, 1, bytes([0xC0 | c, prog])), (0, 1, bytes([0xB0 | c, 7, vol])), (0, 1, bytes([0xB0 | c, 10, pan])),
                 (0, 1, bytes([0xB0 | c, 91, 64])), (0, 1, bytes([0xB0 | c, 93, 0]))]
    for t, nome, nota, v, d in ev:
        c = canais[nome][0]
        msgs.append((t, 3, bytes([0x90 | c, nota, v])))
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


def hsh(n):
    return ((n * 2654435761 + 12345) & 0xFFFFFFFF) / 0xFFFFFFFF


# ------------------------------------------------------------------ harmonia (Fá maior, 18 compassos de 4/4)
# (fundamental do baixo, notas do acorde para o baixo andar, voicing sem fundamental para a mão esquerda)
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
         ['F7M'], ['F7'], ['Bb7M'], ['Bbm6'], ['Am7'], ['D7'], ['Gm7', 'C7'], ['F6'],
         ['Gm7', 'C7'], ['F6']]
# melodia: (colcheia de início 0..7, nota, duração em colcheias)
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
    [(0, 74, 2), (2, 72, 2), (4, 70, 2), (6, 76, 2)],
    [(0, 77, 8)],
]


def colcheia(i, swing):
    """Tick da colcheia i (0..7) no compasso, com swing (2:1 no contratempo)."""
    return (i // 2) * PPQ + (round(PPQ * swing) if i % 2 else 0)


def compor(noite):
    swing = 0.62 if not noite else 0.6
    ev = []
    cpc = 4 * PPQ
    for b, acs in enumerate(FORMA):
        t0 = b * cpc
        final = b == len(FORMA) - 1
        # --- baixo: andando em semínimas (de dia); de noite, mínimas
        for k, nome in enumerate(acs):
            raiz, notas, voic = AC[nome]
            batidas = 4 // len(acs)
            prox = AC[(acs[k + 1] if k + 1 < len(acs) else (FORMA[b + 1][0] if b + 1 < len(FORMA) else acs[k]))][0]
            if final:
                ev.append((t0, 'baixo', raiz - 12 if raiz > 40 else raiz, 70, cpc * 2))
                continue
            if noite:
                for j in range(0, batidas, 2):
                    n = raiz if j == 0 else notas[2]
                    ev.append((t0 + (k * batidas + j) * PPQ, 'baixo', n, 66, PPQ * 2 - 30))
            else:
                linha = [raiz, notas[1 + (b % 2)], notas[2], prox + (1 if hsh(b * 7 + k) < 0.5 else -1)] if batidas == 4 else [raiz, prox - 1 if prox > raiz else prox + 1]
                for j, n in enumerate(linha):
                    v = 74 if j == 0 else 64 + round(6 * hsh(b * 31 + j))
                    ev.append((t0 + (k * batidas + j) * PPQ, 'baixo', n, v, PPQ - 40))
            # --- mão esquerda do piano: Charleston (1 e "e" do 2), bem macia
            base = t0 + k * batidas * PPQ
            if final:
                for i, n in enumerate(voic):
                    ev.append((t0 + i * 40, 'piano_e', n, 44, cpc * 2))
                continue
            toques = [(0, PPQ - 60), (PPQ + round(PPQ * swing), PPQ // 2)] if batidas == 4 else [(0, PPQ * 2 - 80)]
            if noite:
                toques = [(0, PPQ * batidas - 60)]
            for (dt, dur) in toques:
                for i, n in enumerate(voic):
                    ev.append((base + dt + i * 6, 'piano_e', n, (40 if noite else 46) + round(5 * hsh(b * 11 + i + dt)), dur))
        # --- melodia: piano (dia) ou vibrafone (noite)
        for (c, n, d) in MEL[b]:
            t = t0 + colcheia(c, swing)
            dur = colcheia(min(8, c + d), swing) - colcheia(c, swing) if c + d < 8 else cpc - colcheia(c, swing)
            if final:
                dur = cpc * 2
            v = (58 if noite else 66) + round(8 * hsh(b * 13 + c)) - (6 if c % 2 else 0)
            ev.append((t, 'mel', n + (0 if not noite else -12 if n > 78 else 0), v, max(60, dur - 20)))
        # --- vassourinha (só de dia): varrida no 1 e no 3, toque no 2 e no 4, chimbal de pé no 2 e no 4
        if not noite and not final:
            for j in range(4):
                if j % 2 == 0:
                    ev.append((t0 + j * PPQ, 'bateria', 40, 26 + round(4 * hsh(b * 5 + j)), PPQ * 2 - 40))
                else:
                    ev.append((t0 + j * PPQ, 'bateria', 38, 30 + round(4 * hsh(b * 3 + j)), PPQ // 2))
                    ev.append((t0 + j * PPQ, 'bateria', 44, 34, PPQ // 2))
                # prato de condução bem baixinho no "e" do 2 e do 4
                if j % 2 == 1:
                    ev.append((t0 + j * PPQ + round(PPQ * swing), 'bateria', 51, 22, PPQ // 3))
        if final and not noite:
            ev.append((t0, 'bateria', 40, 24, cpc * 2))
    fim = len(FORMA) * cpc
    return ev, fim


if __name__ == '__main__':
    pasta = sys.argv[1]
    os.makedirs(pasta, exist_ok=True)
    ev, fim = compor(False)
    escrever(os.path.join(pasta, 'cidade-dia.mid'), 108,
              {'piano_e': (0, 0, 84, 58), 'mel': (1, 0, 100, 70), 'baixo': (2, 32, 108, 64), 'bateria': (9, 40, 84, 64)}, ev, fim)
    ev, fim = compor(True)
    escrever(os.path.join(pasta, 'cidade-noite.mid'), 88,
              {'piano_e': (0, 0, 74, 56), 'mel': (1, 11, 92, 72), 'baixo': (2, 32, 96, 64)}, ev, fim)
    print('ok', pasta)
