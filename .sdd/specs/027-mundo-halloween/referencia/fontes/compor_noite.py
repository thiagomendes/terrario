"""Amostra da música da Noite das Fantasias (esboço da spec 027): a festa à fantasia de uma vila de brinquedo, travessa e
alegre, nunca de terror. Partitura original desta spec (melodia, baixo, contracanto e as "risadinhas" escritos aqui, nada de
música existente: nenhum tema conhecido de Halloween, de filme ou de desenho). Mesmo caminho da 019, da 014 e da 026:
MIDI escrito aqui -> FluidSynth + FluidR3_GM (licença MIT) -> ffmpeg.

Tom: Ré dórico (Ré menor com o Si natural, o "sorrisinho" do modo), que soa brincalhão e não triste; o fim resolve em
Ré MAIOR. Acordes: Dm, G (o quarto grau maior, a cor do dórico), C, A7 e, na parte de marchinha, F e C.
Andamento 128 semínimas por minuto, 4/4, 1,875 s por compasso, 13 compassos + a cauda, ~25 s.

Arranjo (nada de órgão, de trêmolo de cordas, de grito, de voz gravada, de bumbo pesado):
  - xilofone (13) na melodia, em notas curtas e saltitantes;
  - marimba (12) no arpejo de "relojinho de corda" em colcheias e, na marchinha, dobrando a melodia uma oitava abaixo;
  - cordas em pizzicato (45) nos acordes do contratempo, "pé ante pé";
  - fagote (70), o travesso: o baixo em semínimas na ponta dos pés (fundamental, quinta, oitava e uma notinha de
    aproximação cromática) e, na marchinha, as respostas "pom-pom-pom" subindo;
  - tuba (58) macia no "um" e no "três" da marchinha, o baixo de banda de coreto;
  - flauta (73) e celesta (8) nas "risadinhas": cinco notinhas em quiálteras de semicolcheia subindo, bem curtas;
  - glockenspiel (9) dobrando a melodia na volta do tema, e a caixinha de música (10) no brilho do final;
  - percussão leve do kit padrão: blocos de madeira (o tique-taque), ganzá (cabasa + maracas em semicolcheias), pandeiro
    no 2 e no 4, castanholas nos enfeites, triângulo nas chegadas, palmas baixinhas na marchinha e o surdinho (tom grave,
    bem macio) no "um" da marchinha, o toque de bloco de carnaval.
Forma:
  1 introdução: o fagote na ponta dos pés, o tique-taque e o ganzá chegando; a celesta dá uma risadinha;
  2–5 tema A (Ré dórico): a melodia no xilofone, o arpejo da marimba, o pizzicato no contratempo; risadinha da flauta;
  6–9 tema B, a marchinha: a síncope (semicolcheia, colcheia, semicolcheia) na melodia, tuba e surdinho no 1 e no 3,
      pandeiro, palmas e ganzá; a flauta ri nas pausas e o fagote responde;
  10–11 a volta do tema A com o glockenspiel por cima e as castanholas;
  12 a parada: só o pizzicato subindo na ponta dos pés pelo A7, o tique-taque, a risadinha e a escadinha do xilofone;
  13 o final em Ré maior: "ta... ta-DÁ!", com o triângulo e o brilho da caixinha de música e da celesta.
Uso: python3 -I compor_noite.py <pasta_midi>
"""
import json
import struct
import sys
import os

PPQ = 480
Q = 128
CAUDA = PPQ * 4
SEMI = PPQ // 4
COLC = PPQ // 2
COMP = PPQ * 4
TERC = PPQ // 6  # quiáltera de semicolcheia (seis por tempo): a velocidade da risadinha


def vlq(n):
    b = [n & 0x7F]
    n >>= 7
    while n:
        b.append(0x80 | (n & 0x7F))
        n >>= 7
    return bytes(reversed(b))


def escrever(caminho, canais, ev, fim):
    """canais: nome -> (canal, programa, volume, pan, banco, reverb); ev: (tick, nome, nota, vel, dur)."""
    msgs = [(0, 0, b'\xff\x51\x03' + round(60_000_000 / Q).to_bytes(3, 'big')),
            (0, 0, b'\xff\x58\x04' + bytes([4, 2, 24, 8]))]
    for nome, (c, prog, vol, pan, banco, rev) in canais.items():
        if banco:
            msgs.append((0, 1, bytes([0xB0 | c, 0, banco])))
        msgs += [(0, 1, bytes([0xC0 | c, prog])), (0, 1, bytes([0xB0 | c, 7, vol])),
                 (0, 1, bytes([0xB0 | c, 10, pan])), (0, 1, bytes([0xB0 | c, 91, rev])),
                 (0, 1, bytes([0xB0 | c, 93, 12]))]
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


# nome -> (canal, programa, volume, pan, banco, reverb). Volumes da revisão 1, medidos por instrumento separado: o
# xilofone (a melodia) por cima de tudo; o pizzicato, a marimba e o fagote, que cobriam a melodia, mais baixos; a flauta das
# risadinhas bem mais alta (as notinhas são curtas e sumiam); a celesta e a caixinha mais baixas (a risadinha da
# introdução saltava do resto como um susto)
CANAIS = {
    'xilo': (0, 13, 118, 60, 0, 40),
    'marimba': (1, 12, 54, 46, 0, 36),
    'pizz': (2, 45, 49, 84, 0, 44),
    'fagote': (3, 70, 64, 52, 0, 30),
    'tuba': (4, 58, 58, 64, 0, 30),
    'flauta': (5, 73, 117, 88, 0, 50),
    'celesta': (6, 8, 70, 36, 0, 56),
    'glock': (7, 9, 77, 76, 0, 50),
    'caixinha': (8, 10, 74, 64, 0, 60),
    'perc': (9, 0, 75, 64, 0, 34),
}
BLOCO_AGUDO, BLOCO_GRAVE, CASTANHOLA, TRIANGULO, TRIANG_ABAF = 76, 77, 85, 81, 80
MARACAS, CABASA, PANDEIRO, PALMA, SURDINHO = 70, 69, 54, 39, 41

# acordes (vozes para o pizzicato e a marimba) e a fundamental grave (fagote e tuba)
ACORDE = {'Dm': (62, 65, 69), 'G': (59, 62, 67), 'C': (60, 64, 67), 'A7': (61, 64, 67), 'F': (60, 65, 69),
          'D': (62, 66, 69)}
RAIZ = {'Dm': 38, 'G': 43, 'C': 36, 'A7': 33, 'F': 41, 'D': 38}
QUINTA = {'Dm': 45, 'G': 38, 'C': 43, 'A7': 40, 'F': 36, 'D': 45}

ev = []


def nota(t, nome, n, v, d):
    ev.append((t, nome, n, v, d))


def acorde(t, nome, ac, v, d, oit=0):
    for k, n in enumerate(ACORDE[ac]):
        nota(t, nome, n + oit, v - 4 * k, d)


def risadinha(t, nome, notas, v=78):
    """A risadinha: notinhas curtas em quiálteras de semicolcheia subindo, a última mais leve ("hi-hi-hi-hi-hi")."""
    for i, n in enumerate(notas):
        nota(t + i * TERC, nome, n, v - 3 * i - (8 if i == len(notas) - 1 else 0), TERC - 14)


def fagote_pe_ante_pe(tc, ac, prox, v=78):
    """O baixo na ponta dos pés: fundamental, quinta, oitava e a notinha cromática que chega no próximo acorde."""
    r = RAIZ[ac]
    alvo = RAIZ[prox]
    aprox = alvo - 1 if alvo - 1 != r + 12 else alvo + 1
    while aprox > r + 14:
        aprox -= 12
    while aprox < r:
        aprox += 12
    for i, n in enumerate((r, QUINTA[ac] if QUINTA[ac] > r else QUINTA[ac] + 12, r + 12, aprox)):
        nota(tc + i * PPQ, 'fagote', n, v + (6 if i == 0 else 0), COLC - 40)


def tique_taque(tc, v=52):
    for b in range(4):
        nota(tc + b * PPQ, 'perc', BLOCO_AGUDO if b % 2 == 0 else BLOCO_GRAVE, v + (8 if b == 0 else 0), COLC)


def ganza(tc, v=46, acentos=(0, 3, 6, 8, 11, 14)):
    for i in range(16):
        nota(tc + i * SEMI, 'perc', CABASA if i % 2 else MARACAS, v + (16 if i in acentos else 0), SEMI)


def arpejo_relojinho(tc, ac, v=58, de=0, ate=8):
    a = ACORDE[ac]
    padrao = (a[0] - 12, a[1] - 12, a[2] - 12, a[1], a[0], a[2] - 12, a[1] - 12, a[2] - 12)
    for i in range(de, ate):
        nota(tc + i * COLC, 'marimba', padrao[i], v + (8 if i % 4 == 0 else 0), COLC - 20)


# ------------------------------------------------------------------ 1: introdução
t0 = 0
fagote_pe_ante_pe(t0, 'Dm', 'Dm', 70)
tique_taque(t0, 54)
ganza(t0, 38)
for b in (1, 3):
    acorde(t0 + b * PPQ, 'pizz', 'Dm', 72, 100)
# a celesta ri no último tempo e puxa o tema
risadinha(t0 + 3 * PPQ, 'celesta', [81, 83, 84, 86, 88, 89], 64)

# ------------------------------------------------------------------ 2–5: tema A (Ré dórico)
# melodia original: (colcheia de início, nota, colcheias)
MEL_A = [
    ('Dm', [(0, 74, 1), (1, 77, 1), (2, 81, 2), (5, 83, 1), (6, 81, 1), (7, 77, 1)]),
    ('G', [(0, 79, 1), (1, 83, 1), (2, 86, 2), (5, 84, 1), (6, 83, 1), (7, 79, 1)]),
    ('Dm', [(0, 81, 1), (1, 81, 1), (2, 77, 1), (3, 74, 1), (4, 76, 2), (6, 77, 1), (7, 79, 1)]),
    ('C', [(0, 79, 1), (1, 76, 1), (2, 72, 1), (3, 76, 1), (4, 73, 2)]),  # o A7 entra no terceiro tempo
]


def tema_a(c0, compassos, brilho=False, castanholas=False):
    for c, (ac, mel) in enumerate(compassos):
        tc = t0 + (c0 + c) * COMP
        prox = compassos[c + 1][0] if c + 1 < len(compassos) else 'Dm'
        ultimo_a = mel[-1][1] == 73
        for (ini, n, du) in mel:
            v = 96 if ini in (0, 4) else 86
            nota(tc + ini * COLC, 'xilo', n, v, du * COLC - 40)
            if brilho:
                nota(tc + ini * COLC, 'glock', n + 12, 70, min(du * COLC, PPQ) - 40)
        if ultimo_a:
            # C nos dois primeiros tempos, A7 nos dois últimos
            arpejo_relojinho(tc, 'C', ate=4)
            arpejo_relojinho(tc, 'A7', de=4)
            for b, ac2 in ((1, 'C'), (3, 'A7')):
                acorde(tc + b * PPQ, 'pizz', ac2, 74, 110)
            nota(tc, 'fagote', RAIZ['C'], 84, COLC - 40)
            nota(tc + PPQ, 'fagote', QUINTA['C'], 76, COLC - 40)
            nota(tc + 2 * PPQ, 'fagote', RAIZ['A7'] + 12, 82, COLC - 40)
            nota(tc + 3 * PPQ, 'fagote', 49, 78, COLC - 40)  # Dó sustenido: a sensível chegando no Ré
            nota(tc, 'tuba', RAIZ['C'], 64, PPQ)
            nota(tc + 2 * PPQ, 'tuba', RAIZ['A7'], 64, PPQ)
            # a flauta ri no último tempo
            risadinha(tc + 3 * PPQ, 'flauta', [86, 88, 89, 91, 93], 74)
            nota(tc + 2 * PPQ, 'perc', TRIANG_ABAF, 50, COLC)
        else:
            arpejo_relojinho(tc, ac)
            for b in (1, 3):
                acorde(tc + b * PPQ, 'pizz', ac, 74, 110)
            fagote_pe_ante_pe(tc, ac, prox)
            nota(tc, 'tuba', RAIZ[ac], 62, PPQ)
        tique_taque(tc)
        ganza(tc, 40)
        if castanholas:
            for i in (6, 7, 14):
                nota(tc + i * SEMI, 'perc', CASTANHOLA, 70, SEMI)
        if c == 0:
            nota(tc, 'perc', TRIANGULO, 62, COMP)


tema_a(1, MEL_A)

# ------------------------------------------------------------------ 6–9: tema B, a marchinha
# melodia em semicolcheias: (semicolcheia de início, nota, semicolcheias). A síncope da marchinha na primeira metade.
MEL_B = [
    ('F', None, [(0, 81, 1), (1, 84, 2), (3, 81, 1), (4, 77, 2), (6, 79, 2), (8, 81, 4)]),
    ('C', None, [(0, 79, 1), (1, 84, 2), (3, 79, 1), (4, 76, 2), (6, 77, 2), (8, 79, 4)]),
    ('Dm', None, [(0, 77, 1), (1, 81, 2), (3, 77, 1), (4, 74, 2), (6, 76, 2), (8, 77, 2), (10, 79, 2), (12, 81, 4)]),
    ('G', 'A7', [(0, 83, 1), (1, 86, 2), (3, 83, 1), (4, 79, 2), (6, 81, 2), (8, 85, 2), (10, 88, 2), (12, 81, 4)]),
]
for c, (ac, ac2, mel) in enumerate(MEL_B):
    tc = t0 + (5 + c) * COMP
    for (ini, n, du) in mel:
        v = 98 if ini in (0, 1, 8) else 88
        nota(tc + ini * SEMI, 'xilo', n, v, du * SEMI - 30)
        nota(tc + ini * SEMI, 'marimba', n - 12, 72, du * SEMI - 30)
    metades = ((0, ac), (2, ac2 or ac))
    for b0, a in metades:
        # tuba no "um" (fundamental) e no "três" (quinta, ou a fundamental do acorde novo); surdinho macio junto
        nota(tc + b0 * PPQ, 'tuba', RAIZ[a] if b0 == 0 or ac2 else QUINTA[a], 80, PPQ - 60)
        nota(tc + b0 * PPQ, 'perc', SURDINHO, 52 if b0 == 0 else 42, COLC)
    # pizzicato: no 2, na síncope (a semicolcheia 10) e no 4
    for s in (4, 10, 12):
        a = ac2 if (ac2 and s >= 8) else ac
        acorde(tc + s * SEMI, 'pizz', a, 78 if s != 10 else 70, 100)
    for b in (1, 3):
        nota(tc + b * PPQ, 'perc', PANDEIRO, 56, COLC)
        nota(tc + b * PPQ, 'perc', PALMA, 40, COLC)
    ganza(tc, 46, acentos=(0, 3, 4, 7, 8, 10, 12, 15))
    if c in (0, 2):
        # a flauta ri na pausa da melodia
        risadinha(tc + 3 * PPQ, 'flauta', [88, 89, 91, 93, 95] if c == 0 else [86, 88, 89, 91, 93], 72)
        nota(tc + 2 * PPQ, 'fagote', RAIZ[ac] + 12, 76, PPQ - 60)
    elif c == 1:
        # o fagote responde: "pom-pom-pom" subindo
        for i, n in enumerate((48, 52, 55)):
            nota(tc + 2 * PPQ + COLC + i * COLC, 'fagote', n, 80 + 4 * i, COLC - 50)
        nota(tc + 3 * PPQ + COLC, 'perc', CASTANHOLA, 72, SEMI)
    else:
        for i in (12, 13, 14):
            nota(tc + i * SEMI, 'perc', CASTANHOLA, 70 + 4 * (i - 12), SEMI)
        nota(tc + 2 * PPQ, 'fagote', 45, 80, PPQ - 60)
        nota(tc + 3 * PPQ, 'fagote', 49, 80, PPQ - 60)
    if c == 0:
        nota(tc, 'perc', TRIANGULO, 66, COMP)

# ------------------------------------------------------------------ 10–11: a volta do tema A, com brilho
tema_a(9, MEL_A[:2], brilho=True, castanholas=True)

# ------------------------------------------------------------------ 12: a parada (pé ante pé no A7)
tc = t0 + 11 * COMP
for i, n in enumerate((57, 61, 64, 67)):
    nota(tc + i * PPQ, 'pizz', n, 70 + 4 * i, 90)
    nota(tc + i * PPQ, 'pizz', n + 12, 62 + 4 * i, 90)
tique_taque(tc, 58)
nota(tc, 'fagote', 33 + 12, 70, COLC - 40)
nota(tc + PPQ, 'fagote', 40 + 12, 68, COLC - 40)
risadinha(tc + PPQ + COLC, 'flauta', [85, 86, 88, 89, 91], 70)
risadinha(tc + 2 * PPQ + COLC, 'celesta', [88, 89, 91, 93, 95], 66)
# a escadinha do xilofone no último tempo, chegando no Ré
for i, n in enumerate((69, 71, 73, 74)):
    nota(tc + 3 * PPQ + i * SEMI, 'xilo', n + 12, 80 + 5 * i, SEMI - 20)

# ------------------------------------------------------------------ 13: o final em Ré maior, "ta... ta-DÁ!"
tf = t0 + 12 * COMP
for nome, oit, v in (('xilo', 12, 88), ('marimba', 0, 80), ('pizz', 0, 84)):
    acorde(tf, nome, 'D', v, COLC + 60, oit)
nota(tf, 'fagote', 50, 88, COLC)
nota(tf, 'tuba', 38, 82, COLC + 60)
nota(tf, 'perc', TRIANGULO, 78, COMP)
nota(tf, 'perc', SURDINHO, 56, COLC)
# o brilho subindo (caixinha de música e celesta) entre o "ta" e o "DÁ"
for i, n in enumerate((86, 90, 93, 98, 102)):
    nota(tf + COLC + i * SEMI, 'caixinha', n, 80 - 2 * i, PPQ)
    nota(tf + COLC + i * SEMI, 'celesta', n - 12, 64, PPQ)
# a anacruse ("ta-") e a chegada ("DÁ!") no terceiro tempo, curta e fechada
tda = tf + 2 * PPQ
nota(tda - SEMI, 'xilo', 81, 92, SEMI - 20)
for nome, oit, v in (('xilo', 12, 94), ('marimba', 0, 84), ('pizz', 0, 90), ('glock', 12, 66)):
    acorde(tda, nome, 'D', v, COLC, oit)
nota(tda, 'fagote', 38, 92, COLC)
nota(tda, 'tuba', 38, 90, COLC)
nota(tda, 'perc', CASTANHOLA, 80, SEMI)
nota(tda, 'perc', TRIANGULO, 84, COMP)
nota(tda, 'perc', SURDINHO, 60, COLC)
nota(tda + SEMI, 'caixinha', 98, 66, PPQ)
fim = tda + COLC

pasta = sys.argv[1]
os.makedirs(pasta, exist_ok=True)
escrever(os.path.join(pasta, 'noite-das-fantasias-demo.mid'), CANAIS, ev, fim)

json.dump(dict(tempo=Q, compassos=13, fimUltimaNotaS=round(fim / PPQ * 60 / Q, 4), notas=len(ev)),
          open(os.path.join(pasta, 'noite-das-fantasias-demo.json'), 'w'))
print('ok', len(ev), 'notas, fim da última nota em', round(fim / PPQ * 60 / Q, 2), 's')
