"""Sons do canteiro de obras (spec 014, T09) que são instrumento: MIDI para FluidSynth + FluidR3_GM (MIT).
Rodar tudo de novo: ver rodar.sh. Este passo: python3 -I obra_compor.py <pasta_midi>
Saem: plim_01..11 (celesta + piano, uma nota da escala por bloco posto), acorde_1/2 (piano dó-mi-sol-dó, fecha uma camada),
tada_1 (arpejo de piano subindo até um acorde claro), tadagrande (o mesmo, mais alto e mais longo), coreto (frase
original de caixinha de música em Fá maior, ~2,5 s) e colher (celesta "plim-plim").
A poeirinha, a buzininha, os fogos de brinquedo e a voz do pedreiro são síntese nossa, somados em vozes_cidade.py.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from musica_compor import escrever, Q, PPQ  # noqa: E402

TPS = Q / 60 * PPQ     # ticks por segundo no andamento dos MIDI (126)
T = lambda s: round(s * TPS)
ESCALA_PLIM = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96]   # 523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093 Hz


def mid(pasta, nome, canais, ev, fim_s):
    escrever(os.path.join(pasta, nome + '.mid'), canais, [(T(t), c, n, v, T(d)) for t, c, n, v, d in ev], T(fim_s))


if __name__ == '__main__':
    pasta = sys.argv[1]
    os.makedirs(pasta, exist_ok=True)
    CEL = {'cel': (0, 8, 100, 64), 'pno': (1, 0, 90, 64)}
    for i, n in enumerate(ESCALA_PLIM):
        mid(pasta, f'plim_{i + 1:02d}', CEL, [(0, 'cel', n, 74, 0.14), (0.004, 'pno', n, 46, 0.12)], 0.2)
    P = {'pno': (0, 0, 100, 64)}
    mid(pasta, 'acorde_1', P, [(i * 0.012, 'pno', n, 62 - 2 * i, 0.6) for i, n in enumerate([60, 64, 67, 72])], 0.7)
    mid(pasta, 'acorde_2', P, [(i * 0.012, 'pno', n, 58 - 2 * i, 0.6) for i, n in enumerate([72, 76, 79, 84])], 0.7)
    PC = {'pno': (0, 0, 100, 64), 'cel': (1, 8, 80, 64)}
    arp = [(0.0, 'pno', 60, 58, 0.5), (0.075, 'pno', 64, 62, 0.45), (0.15, 'pno', 67, 66, 0.4), (0.225, 'pno', 72, 70, 0.35)]
    acorde = [(0.33 + i * 0.008, 'pno', n, 72 - i, 0.85) for i, n in enumerate([60, 67, 72, 76, 79, 84])] + \
             [(0.335, 'cel', 84, 52, 0.5), (0.34, 'cel', 88, 46, 0.5)]
    mid(pasta, 'tada_1', PC, arp + acorde, 1.2)
    arp2 = [(i * 0.07, 'pno', n, 56 + 3 * i, 0.6 - 0.04 * i) for i, n in enumerate([60, 64, 67, 72, 76, 79])]
    acorde2 = [(0.45 + i * 0.008, 'pno', n, 74 - i, 1.3) for i, n in enumerate([60, 67, 72, 76, 79, 84])] + \
              [(0.455, 'cel', 84, 54, 0.8), (0.46, 'cel', 88, 48, 0.8), (0.465, 'cel', 91, 42, 0.8)]
    mid(pasta, 'tadagrande', PC, arp2 + acorde2, 1.9)
    MB = {'mb': (0, 10, 100, 64), 'acp': (1, 10, 70, 64)}
    e = 0.19
    frase = [(0, 81, 2), (2, 84, 1), (3, 89, 2), (5, 88, 1), (6, 86, 1), (7, 84, 1), (8, 86, 1), (9, 82, 1), (10, 79, 1), (11, 81, 1), (12, 77, 3)]
    ev = [(p * e, 'mb', n, 70 if p % 3 == 0 else 60, d * e) for p, n, d in frase]
    ev += [(0, 'acp', 65, 40, 3 * e), (0, 'acp', 72, 36, 3 * e), (5 * e, 'acp', 70, 38, 3 * e), (5 * e, 'acp', 74, 34, 3 * e),
           (9 * e, 'acp', 72, 38, 3 * e), (9 * e, 'acp', 76, 34, 3 * e), (12 * e, 'acp', 65, 40, 4 * e), (12 * e, 'acp', 69, 36, 4 * e)]
    mid(pasta, 'coreto', MB, ev, 3.2)
    mid(pasta, 'colher', {'cel': (0, 8, 100, 64)}, [(0, 'cel', 91, 66, 0.12), (0.1, 'cel', 96, 72, 0.2)], 0.4)
    print('ok', len(os.listdir(pasta)))
