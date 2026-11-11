"""Baques do golpe (porte x material) e "puf" de derrota, compartilhados entre os bichos. Síntese nossa.
Saída: /t/wav/comum/baque.<material>.<porte>.<n>.wav e /t/wav/comum/derrota.<tipo>.<n>.wav"""
import sys, json; sys.path.insert(0, '/s')
from lib import *
import lib

PORTE = {'pequeno': (250, 140, 0.10), 'medio': (150, 85, 0.14), 'grande': (95, 52, 0.19)}  # tom do baque (de, até) e duração


def tum(de, ate, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    f = ate + (de - ate) * np.exp(-t / (dur * 0.18))
    return osc(f) * np.exp(-t / (dur * 0.28)) * adsr(n, 0.002, 0.03)


def baque(mat, porte, k):
    lib.rng = np.random.default_rng(100 + k * 7 + len(mat) * 3 + len(porte))
    de, ate, dur = PORTE[porte]; v = 2 ** ((k - 0.5) * 1.5 / 12); de *= v; ate *= v
    corpo = tum(de, ate, dur); n = len(corpo)
    esc = {'pequeno': 1.5, 'medio': 1.0, 'grande': 0.7}[porte]
    if mat == 'pelo':
        x = mix((corpo, 1, 0), (puf(dur * 0.8, 150, 900 * esc), 0.5, 0.0))
    elif mat == 'pena':
        fl = puf(dur * 1.6, 1800, 6500, cair=False) * (0.6 + 0.4 * np.sin(2 * np.pi * 28 * t_(dur * 1.6)))
        x = mix((corpo, 0.8, 0), (fl, 0.35, 0.01), (puf(dur * 0.6, 150, 900 * esc), 0.35, 0))
    elif mat == 'pano':
        x = mix((corpo, 0.8, 0), (puf(dur * 1.4, 250, 1600 * esc), 0.7, 0.0))
    elif mat == 'gelatina':
        b = boing(ate * 2.2, ate * 3.2, dur * 3.2, vib=13, prof=1.6)
        x = mix((corpo, 0.7, 0), (b, 0.45, 0.005))
    elif mat == 'agua':
        sp = puf(dur * 1.5, 900, 5500 * min(1.2, esc), cair=True)
        bs = [bolha(f, f * 2.1, 0.05) for f in (lib.rng.uniform(500, 900) * esc, lib.rng.uniform(700, 1200) * esc, lib.rng.uniform(600, 1000) * esc)]
        x = mix((corpo, 0.4, 0), (sp, 0.8, 0.004), (bs[0], 0.25, 0.04), (bs[1], 0.2, 0.08), (bs[2], 0.18, 0.12))
    elif mat == 'lata':  # brinquedo de plástico oco: parciais graves e curtas (nada de vidro)
        f1 = ate * 3.0; tt = t_(dur * 1.1)
        tk = sum(np.sin(2 * np.pi * f1 * h * tt) * np.exp(-tt / (dur * 0.35 / h)) / h for h in (1, 2.01, 2.97))
        x = mix((corpo, 0.7, 0), (filtro(tk, 'low', 1800) * adsr(len(tt), 0.002, 0.03), 0.45, 0))
    elif mat == 'crocante':
        gr = np.zeros(int(dur * 1.3 * SR))
        for _ in range(9):
            i = int(lib.rng.uniform(0, 0.6) * len(gr)); m = int(0.004 * SR); gr[i:i + m] += lib.rng.standard_normal(len(gr[i:i + m])) * np.hanning(len(gr[i:i + m]))
        x = mix((corpo, 0.8, 0), (filtro(gr, 'high', 1500), 0.35, 0))
    return x


def derrota(tipo, k):
    lib.rng = np.random.default_rng(300 + k + len(tipo))
    if tipo in ('puf_pequeno', 'puf_medio', 'puf_grande'):
        porte = tipo.split('_')[1]; d = {'pequeno': 0.22, 'medio': 0.3, 'grande': 0.4}[porte]; hi = {'pequeno': 3500, 'medio': 2600, 'grande': 1800}[porte]
        p = puf(d, 150, hi)
        notas = [(1568, 2093), (1760, 2349)][k]  # brilhinho que sobe no fim: some como mágica, sem tristeza
        bl = [bip(f, 0.09, 'sine', lp=6000) * np.exp(-t_(0.09) / 0.04) for f in notas]
        return mix((p, 1, 0), (bl[0], 0.16, d * 0.45), (bl[1], 0.14, d * 0.45 + 0.07))
    if tipo == 'plop':
        b = bolha(330 + 60 * k, 900 + 80 * k, 0.09); s = puf(0.12, 700, 4000)
        return mix((b, 1, 0), (s, 0.35, 0.0), (bolha(800, 1700, 0.04), 0.3, 0.12))
    if tipo == 'robo':
        p = puf(0.22, 200, 2400)
        b = juntar([bip(880 if k == 0 else 988, 0.05, 'square', lp=2500), bip(1320 if k == 0 else 1480, 0.07, 'square', lp=2500)], gap=0.03)
        return mix((p, 1, 0), (b, 0.22, 0.1))


if __name__ == '__main__':
    rec = {}
    for mat in ('pelo', 'pena', 'pano', 'gelatina', 'agua', 'lata', 'crocante'):
        for porte in PORTE:
            for k in range(2):
                y = finalizar(baque(mat, porte, k), 0.001, 0.04, mol=0.05, trim=-40, alvo=ALVO_RMS + 1)
                cid = f'comum/baque.{mat}.{porte}.{k + 1}'; salvar(f'/t/wav/{cid}.wav', y)
                rec[cid] = {'fonte': 'sintese', 'tipo': 'baque', 'material': mat, 'porte': porte, 'seg': round(len(y) / SR, 3)}
    for tipo in ('puf_pequeno', 'puf_medio', 'puf_grande', 'plop', 'robo'):
        for k in range(2):
            y = finalizar(derrota(tipo, k), 0.003, 0.06, mol=0.1, trim=-40)
            cid = f'comum/derrota.{tipo}.{k + 1}'; salvar(f'/t/wav/{cid}.wav', y)
            rec[cid] = {'fonte': 'sintese', 'tipo': 'derrota', 'seg': round(len(y) / SR, 3)}
    for k, v in rec.items(): print(k, v['seg'])
    json.dump(rec, open('/t/receitas_banco.json', 'w'), ensure_ascii=False, indent=1)
