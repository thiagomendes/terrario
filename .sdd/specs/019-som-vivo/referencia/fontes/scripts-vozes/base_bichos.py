"""Ferramentas comuns das receitas dos bichos: escolher trechos, momentos genéricos (chamado, susto, contente, ai) e registrar fontes."""
import sys, json; sys.path.insert(0, '/s')
import lib
from lib import *

USADOS = set()
_ler = lib.ler


def ler_reg(nome, ini=None, fim=None):
    USADOS.add(nome); return _ler(nome, ini, fim)


lib.ler = ler_reg
_ev = {}


def evs(fonte):
    if fonte not in _ev: _ev[fonte] = eventos(_ler(fonte))
    return _ev[fonte]


def escolhe(fonte, dmin=0.05, dmax=3.0, conf=0.0, fmin=0, fmax=99999, n=3, pular=0, ordem='db', tmin=0, tmax=1e9):
    """Trechos (ini, fim) do arquivo que batem com os critérios, os mais fortes primeiro."""
    L = [(s, e, db, f) for (s, e, db, f) in evs(fonte) if dmin <= e - s <= dmax and f[1] >= conf and fmin <= f[0] <= fmax and tmin <= s <= tmax]
    if ordem == 'db': L.sort(key=lambda v: -v[2])
    elif ordem == 'conf': L.sort(key=lambda v: (-v[3][1], -v[2]))
    L = L[pular:pular + n]
    if not L: raise RuntimeError(f'sem trecho em {fonte} {dmin}-{dmax} conf>={conf}')
    while len(L) < n: L = L + L[:n - len(L)]
    return [(s, e) for s, e, *_ in L]


def trecho(fonte, ini, fim, pad=0.015, maxdur=None):
    x = lib.ler(fonte, max(0, ini - pad), fim + pad * 2)
    if maxdur: x = x[:int(maxdur * SR)]
    return x


def tr(fonte, i, **kw):
    """i-ésimo melhor trecho (kw = critérios de escolhe + maxdur/pad)."""
    md = kw.pop('maxdur', None); pad = kw.pop('pad', 0.015)
    s, e = escolhe(fonte, n=i + 1, **kw)[i]
    return trecho(fonte, s, e, pad, md)


def limpo(x, hp=80, lp=8000, gate=True):
    x = banda(x, hp, lp)
    return portao(x) if gate else x


def ai_de(x, r0=1.15, r1=1.7, dur=0.26, camada=None, lp=5500):
    """'Ai' de desenho: pedacinho do bicho com o tom puxado para cima e uma mola/guincho por baixo. Curto e macio."""
    x = x[:int(dur * SR / ((r0 + r1) / 2) * 1.05)]
    y = fita_curva(x, [(0, r0), (0.55, r1), (1, r1 * 0.92)])
    y = filtro(y, 'low', lp); y = bordas(y, 0.004, 0.06)
    if camada is not None:
        y = mix((y, 1, 0), (camada * np.max(np.abs(y)) / (np.max(np.abs(camada)) + 1e-9), 0.35, 0.01))
    return y


def mola(f0=420, top=820, dur=0.24):
    return boing(f0, top, dur, vib=12, prof=2.0)


def guincho(f0=900, top=1500, dur=0.14):
    f = glide(dur, [(0, f0), (0.4, top), (1, top * 0.85)]); n = len(f)
    return osc(f, 'tri') * adsr(n, 0.004, 0.05)


def bolhas(n=3, base=500, esp=0.07, r=None, tam=0.06):
    r = r or np.random.default_rng(int(base) + n)
    return mix(*[(bolha(base * r.uniform(0.8, 1.3), None, tam * r.uniform(0.8, 1.2)), r.uniform(0.6, 1.0), i * esp * r.uniform(0.7, 1.3)) for i in range(n)])


def repete(x, vezes=2, gap=0.06, var=0.0):
    partes = [fita(x, 1 + var * i) if var else x for i in range(vezes)]
    return juntar(partes, gap)


# finalização por momento
FIM = {'chamado': dict(ent=0.006, sai=0.08), 'susto': dict(ent=0.003, sai=0.06), 'contente': dict(ent=0.03, sai=0.12),
       'ai': dict(ent=0.003, sai=0.05), 'derrota': dict(ent=0.003, sai=0.08)}


def agudo(x):
    sp = np.abs(np.fft.rfft(x)) ** 2; fr = np.fft.rfftfreq(len(x), 1 / SR)
    return float(sp[fr > 4000].sum() / (sp.sum() + 1e-12))


def fechar(x, momento, mol=0.10, sala_dur=0.12, lp=10000):
    """Fecha o som; se o brilho acima de 4 kHz passar de 20%, amacia (nada de som estridente para criança pequena)."""
    k = FIM.get(momento, FIM['chamado'])
    if momento in ('ai', 'susto'): x = filtro(x, 'low', 6500)
    for _ in range(3):
        if agudo(x) <= 0.2: break
        x = pico_eq(x, 6000, -6, 0.7); x = filtro(x, 'low', 6000)
    return finalizar(x, k['ent'], k['sai'], mol=mol, sala_dur=sala_dur, lp=lp)
