"""Receitas dos 35 bichos (7 temas x 5 vagas) e dos filhotes. Cada momento tem 2-3 versões.
Uso: python3 -I criaturas.py [tema ...]  -> /t/wav/<tema>/<slot>.<momento>.<n>.wav (+ filhote) e /t/receitas_bichos.json"""
import sys, json; sys.path.insert(0, "/s")
from base_bichos import *
import base_bichos as bb
import rancho_antigo as RA

C = 'commons/'
# atalhos de fontes
CABRAS, CABRA1, OV2, OV3, OV1 = C + 'cabras.ogg', C + 'cabra1.wav', C + 'ovelha2.ogg', C + 'ovelha3.wav', C + 'ovelha1.ogg'
COELHO, CHILR, FELIZ, WHEEK, AFLITA = C + 'coelho_sq.wav', C + 'cobaia_chilreio.ogg', C + 'cobaia_feliz.ogg', C + 'cobaia_wheek.ogg', C + 'cobaia_aflita.ogg'
BOL1, BOL2 = C + 'bolhas1.ogg', C + 'bolhas2.opus'
SAPO, RA_, PERERECA = C + 'sapo.ogg', C + 'ra_comestivel.ogg', C + 'perereca.ogg'
ASS1, ASS2, ASS3 = C + 'assobio1.ogg', C + 'assobio2.ogg', C + 'assobio3.ogg'
ELFO, RISADAS, MENINA, GIGGLY = C + 'risada_elfo.ogg', C + 'risadas.ogg', C + 'risada_menina.wav', C + 'risadinha.webm'
LOBOS, CAO_UIVO, SPITZF = C + 'lobos.ogg', C + 'cao_uivo.ogg', C + 'spitz_fala.ogg'
PURR, POMBA, POMBOM, CORUJA = C + 'gato_ronrona.oga', C + 'pomba.ogg', C + 'pombo_maos.ogg', C + 'coruja.ogg'
ELEF, GUIRA, PARDAL, PARDAL2, PERU, PELIC = C + 'elefante.ogg', C + 'guira.wav', C + 'pardal.wav', C + 'pardal_sardin.oga', C + 'peru.wav', C + 'pelicano.ogg'
CANTA, PRADARIA, FILHOTE = C + 'cantarola.wav', C + 'caoz_pradaria.ogg', C + 'c_filhote_noite.ogg'
VACA1, VACA2, CAO, MUDI, SPITZ, OFEGO = 'bsb/0546.mp3', 'bsb/2383.mp3', 'bsb/2954.mp3', 'bsb/0612.mp3', 'bsb/0682.mp3', 'bsb/1547.mp3'


def L(f, *a, **k): return lambda: f(*a, **k)


# ------------------------------------------------------------------ peças reutilizáveis
def bale(fonte, i, r=1.12, lp=3800, hp=140, maxdur=None, **kw):
    return fita(limpo(tr(fonte, i, maxdur=maxdur, **kw), hp, lp), r)


def agua_chamado(base=600, k=0, brilho=None):
    rr = np.random.default_rng(10 + k + int(base))
    x = bolhas(3 + k % 2, base, 0.08, rr)
    real = fita(limpo(tr(BOL2, k, dmin=0.05, dmax=0.25, conf=0.6), 300, 6000), base / 700)
    y = mix((x, 0.8, 0), (real, 0.5 * np.max(np.abs(x)) / (np.max(np.abs(real)) + 1e-9), 0.05))
    if brilho: y = mix((y, 1, 0), (bip(brilho, 0.14, 'sine', lp=8000) * np.exp(-t_(0.14) / 0.05), 0.18 * np.max(np.abs(y)), 0.1))
    return y


def agua_susto(base=500, k=0):
    rr = np.random.default_rng(20 + k)
    sp = puf(0.12, 900, 5000)
    return mix((sp, 0.5, 0), (bolhas(5, base * 1.2, 0.035, rr, 0.045), 1, 0.02), (bolha(base * 0.6, base * 1.8, 0.09), 0.9, 0.0))


def agua_contente(base=600, k=0, brilho=None):
    rr = np.random.default_rng(30 + k)
    y = mix((bolha(base, base * 1.6, 0.1), 1, 0), (bolha(base * 1.25, base * 2, 0.08), 0.7, 0.16 + 0.03 * k))
    if brilho: y = mix((y, 1, 0), (bip(brilho, 0.2, 'sine', lp=8000) * np.exp(-t_(0.2) / 0.08), 0.15, 0.05), (bip(brilho * 1.26, 0.2, 'sine', lp=8000) * np.exp(-t_(0.2) / 0.08), 0.12, 0.17))
    return y


def agua_ai(base=450, k=0):
    """'blub' com guinchinho: o peixe não grita."""
    return mix((bolha(base, base * 2.4, 0.1), 1, 0), (guincho(900 + 120 * k, 1300 + 150 * k, 0.1) * 0.25, 1, 0.02))


def peixe(base, brilho=None):
    return {'chamado': [L(agua_chamado, base, k, brilho) for k in range(3)], 'susto': [L(agua_susto, base, k) for k in range(2)],
            'contente': [L(agua_contente, base, k, brilho) for k in range(2)], 'ai': [L(agua_ai, base * 0.8, k) for k in range(2)]}


def voz_sint(silabas, f_base, escala=1.0, sopro=0.12, vib=(5, 0.4), eco_=None, coro_=True, carrier=None, legato=0.04):
    y = falar(silabas, f_base=f_base, escala=escala, sopro=sopro, vib=vib, carrier=carrier, legato=legato)
    if coro_: y = coro(y, 10, 0.014, 0.4)
    if eco_: y = eco(y, *eco_)
    return y


def S(v, dur, nota=0, gl=0, c=''): return dict(c=c, v=v, dur=dur, nota=nota, gl=gl)


def flaps(n=3, gap=0.07):
    return juntar([puf(0.06, 300, 1400) for _ in range(n)], gap)


def bips(notas, dur=0.07, gap=0.025, forma='square', lp=3000):
    return juntar([bip(f, dur, forma, lp=lp) for f in notas], gap)


def r2(seq, k):
    rr = np.random.default_rng(500 + k)
    partes = []
    for f, d in seq:
        g = f * rr.uniform(1.25, 1.6) if rr.random() < 0.5 else f / rr.uniform(1.15, 1.4)
        partes.append(filtro(osc(glide(d, [(0, f), (1, g)]), 'tri'), 'low', 4000) * adsr(int(d * SR), 0.003, 0.02))
    return juntar(partes, 0.02)


def latido_robo(f=620, k=0, n=2):
    car = lambda f0: glote(f0, 0.02, 0.001) + np.diff(osc(f0, 'square') * 0.2, prepend=0) * 8
    um = lambda nota: falar([S('a', 0.11, nota, -5, 'b'), S('u', 0.05, nota - 5, -2)], f_base=f, escala=1.25, sopro=0.03, carrier=car, vib=(6, 0.05))
    return juntar([um(0), um(-2 + k)][:n], 0.08)


def radio(x):
    return eco(banda(x, 450, 3400, 2), 0.11, 0.3, 2, 2400)


def sussurra(x, quanto=0.5):
    d, k = env_db(x, 0.005); e = 10 ** (d / 20); e = np.interp(np.arange(len(x)), np.arange(len(e)) * k, e)
    return x * (1 - quanto * 0.6) + banda(np.random.default_rng(7).standard_normal(len(x)), 1800, 7000) * e * quanto * 0.9


# ------------------------------------------------------------------ os 7 temas
def tema_bruma():
    cervo = {
        'chamado': [L(bale, CABRAS, i, 1.14, 3600, 160, maxdur=0.75, dmin=0.18, dmax=0.8, conf=0.6, fmin=180, fmax=500) for i in range(2)] + [L(bale, CABRA1, 0, 1.18, 3600, 150)],
        'susto': [L(bale, CABRAS, i, 1.38, 4200, 180, maxdur=0.28, dmin=0.05, dmax=0.25, conf=0.75) for i in range(2)],
        'contente': [lambda: fita(limpo(tr(CABRAS, 2, dmin=0.18, dmax=0.8, conf=0.6, fmin=180, fmax=500, maxdur=0.5), 120, 1300), 1.0, 0.94),
                     lambda: fita(limpo(tr(OV3, 0, maxdur=0.45), 120, 1300), 1.15, 1.1)],
        'ai': [lambda i=i: ai_de(limpo(tr(CABRAS, i, dmin=0.05, dmax=0.25, conf=0.75), 160, 4500), 1.25, 1.8, camada=mola(480 + 40 * i, 900)) for i in range(3)],
    }
    coelho = {
        'chamado': [lambda i=i: repete(fita(limpo(tr(COELHO, i, dmin=0.04, dmax=0.12, conf=0.85, tmin=20, tmax=24), 300, 7000), 1.45), 2, 0.07, 0.04) for i in range(3)],
        'susto': [lambda: fita(limpo(tr(CHILR, 0, maxdur=0.2), 400, 8000), 1.05), lambda: fita(limpo(tr(CHILR, 1, maxdur=0.2), 400, 8000), 1.1)],
        'contente': [lambda i=i: repete(fita(limpo(tr(CHILR, i, dmin=0.06, dmax=0.15, conf=0.8, fmax=1300), 400, 7000), 1.2), 3, 0.04, 0.03) for i in range(2)],
        'ai': [lambda i=i: ai_de(limpo(tr(COELHO, i, dmin=0.04, dmax=0.12, conf=0.85, tmin=20, tmax=24), 300, 7000), 1.45, 2.0, 0.2, camada=guincho(1200, 1800)) for i in range(2)],
    }
    espectro = {  # fantasminha pastel: "uuuh" de desenho com a pomba-rola misturada bem baixinho
        'chamado': [lambda k=k: mix((voz_sint([S('u', 0.85, 0, -4 + k)], 250 + 25 * k, 1.0, 0.25, (4.5, 0.6), eco_=(0.16, 0.3, 2, 1800)), 1, 0),
                                    (fita(limpo(tr(POMBA, k, dmin=0.8, conf=0.8), 200, 2000, False), 0.9), 0.12, 0.05)) for k in range(3)],
        'susto': [L(voz_sint, [S('o', 0.24, 5, 7)], 330, 1.1, 0.18, (6, 0.3)), L(voz_sint, [S('ó', 0.08, 3), S('o', 0.2, 7, 6)], 320, 1.1, 0.18, (6, 0.3))],
        'contente': [lambda k=k: eco(fita(limpo(tr(CANTA, k, dmin=0.15, dmax=0.7, conf=0.95, maxdur=0.6), 150, 2600, False), 1.12), 0.15, 0.25, 2, 2000) for k in range(2)],
        'ai': [lambda k=k: mix((voz_sint([S('u', 0.09, 2), S('ó', 0.16, 9 + k, -6)], 300, 1.05, 0.18, (7, 0.3)), 1, 0), (mola(300, 560, 0.25), 0.25, 0.02)) for k in range(2)],
    }
    raposa = {
        'chamado': [lambda i=i: fita(limpo(tr(MUDI, i, dmin=0.12, dmax=0.6, conf=0.6, maxdur=0.32), 250, 6500), 1.42) for i in range(2)]
                   + [lambda: limpo(trecho(PRADARIA, 2.6, 3.1), 300, 7000)],
        'susto': [lambda i=i: fita(limpo(tr(MUDI, i + 2, dmin=0.12, dmax=0.3, conf=0.6, maxdur=0.18), 250, 6500), 1.6, 1.7) for i in range(2)],
        'contente': [lambda i=i: mix((fita(limpo(tr(PURR, i, dmin=0.2, dmax=0.6), 200, 3000, False), 1.3), 1, 0)) for i in range(2)],
        'ai': [lambda i=i: ai_de(limpo(tr(MUDI, i, dmin=0.12, dmax=0.3, conf=0.6), 250, 6500), 1.5, 2.1, 0.22, camada=guincho(1100, 1700)) for i in range(2)],
    }
    return {
        'cervo': dict(nome='Cervo-musgo', porte='medio', baque='pelo', derrota='puf_medio', momentos=cervo, filhote=1.4),
        'coelho': dict(nome='Coelho-bruma', porte='pequeno', baque='pelo', derrota='puf_pequeno', momentos=coelho, filhote=1.3),
        'peixe': dict(nome='Peixe-lume', porte='pequeno', baque='agua', derrota='plop', momentos=peixe(650, 1568)),
        'espectro': dict(nome='Espectro da bruma', porte='grande', baque='pano', derrota='puf_grande', momentos=espectro),
        'raposa': dict(nome='Raposa-lume', porte='pequeno', baque='pelo', derrota='puf_pequeno', momentos=raposa, filhote=1.3),
    }


def tema_planeta():
    lesma = {
        'chamado': [lambda k=k: mix((voz_sint([S('u', 0.5, 0, 5 + k)], 290 + 20 * k, 1.05, 0.1, (7.5, 0.7)), 1, 0),
                                    (fita(limpo(tr(BOL2, k + 3, dmin=0.08, dmax=0.3), 200, 3000, False), 0.65), 0.25, 0.05)) for k in range(3)],
        'susto': [lambda k=k: mix((bolha(230 + 30 * k, 700, 0.14), 1, 0), (voz_sint([S('ó', 0.16, 7, -5)], 320, 1.05, 0.1, (8, 0.6)), 0.6, 0.03)) for k in range(2)],
        'contente': [lambda k=k: mix((fita(limpo(tr(PURR, k + 2, dmin=0.2, dmax=0.6), 150, 2500, False), 0.92), 1, 0),
                                     (voz_sint([S('u', 0.4, 0, 3, 'm')], 300, 1.05, 0.12, (8.5, 0.8)), 0.4, 0.02)) for k in range(2)],
        'ai': [lambda k=k: mix((boing(220 + 30 * k, 420, 0.32, vib=9, prof=3), 1, 0), (voz_sint([S('u', 0.18, 3, 7)], 330, 1.05, 0.1, (9, 0.6)), 0.4, 0)) for k in range(2)],
    }
    pulga = {
        'chamado': [lambda k=k: mix((boing(480 + 70 * k, 900 + 100 * k, 0.32, vib=12, prof=2.2), 1, 0),
                                    (fita(limpo(tr(CHILR, k + 2, dmin=0.06, dmax=0.15, conf=0.8), 500, 8000), 1.35), 0.3, 0.05)) for k in range(3)],
        'susto': [lambda k=k: mix((fita(limpo(tr(AFLITA, 0, maxdur=0.15), 500, 7500), 1.15 + 0.1 * k), 1, 0), (boing(900, 1500, 0.15), 0.3, 0)) for k in range(2)],
        'contente': [lambda k=k: juntar([boing(f, f * 1.5, 0.14, vib=14, prof=1.5) for f in ([520, 620, 780] if k == 0 else [600, 760, 900])], 0.03) for k in range(2)],
        'ai': [lambda k=k: mix((mola(600 + 80 * k, 1100), 1, 0), (guincho(1300, 1900, 0.1), 0.35, 0.02)) for k in range(2)],
    }
    sombrinha = {
        'chamado': [lambda i=i: sussurra(fita(limpo(tr(ELFO, i, dmin=0.3, dmax=1.0, conf=0.8, maxdur=0.7), 250, 6000), 1.25), 0.45) for i in range(3)],
        'susto': [lambda i=i: fita_curva(limpo(tr(RISADAS, i, dmin=0.06, dmax=0.14, conf=0.8, maxdur=0.13), 250, 6000), [(0, 1.3), (1, 1.75)]) for i in range(2)],
        'contente': [lambda: sussurra(fita(limpo(tr(GIGGLY, 0, maxdur=0.9), 200, 6000), 1.18), 0.35),
                     lambda: sussurra(fita(limpo(tr(ELFO, 3, dmin=0.3, dmax=1.0, conf=0.8, maxdur=0.6), 250, 6000), 1.3), 0.4)],
        'ai': [lambda i=i: ai_de(limpo(tr(RISADAS, i + 2, dmin=0.06, dmax=0.14, conf=0.8), 250, 6000), 1.3, 1.85, 0.2, camada=mola(500, 900)) for i in range(2)],
    }
    robocao = {
        'chamado': [L(latido_robo, 640 + 60 * k, k) for k in range(3)],
        'susto': [lambda k=k: bip(1500 + 100 * k, 0.22, 'square', glide_to=600, lp=3000) for k in range(2)],
        'contente': [lambda k=k: bips([1000, 1150, 1330, 1500] if k == 0 else [990, 1320, 1180, 1480], 0.05, 0.02, 'tri', 5000) for k in range(2)],
        'ai': [lambda k=k: mix((bip(1250 + 100 * k, 0.16, 'square', glide_to=700, lp=2600), 0.7, 0), (mola(500, 900, 0.22), 0.6, 0.03)) for k in range(2)],
    }
    return {
        'cervo': dict(nome='Lesma-pastora', porte='medio', baque='gelatina', derrota='puf_medio', momentos=lesma, filhote=1.35),
        'coelho': dict(nome='Pulga-bola', porte='pequeno', baque='gelatina', derrota='puf_pequeno', momentos=pulga, filhote=1.3),
        'peixe': dict(nome='Água-viva lilás', porte='pequeno', baque='agua', derrota='plop', momentos=peixe(760, 1760)),
        'espectro': dict(nome='Sombrinha curiosa', porte='medio', baque='pano', derrota='puf_medio', momentos=sombrinha),
        'raposa': dict(nome='Robô-cão', porte='pequeno', baque='lata', derrota='robo', momentos=robocao, filhote=1.3),
    }


def tema_mata():
    capivara = {  # parente do porquinho-da-índia: o mesmo assobio-estalo, mais grave
        'chamado': [lambda i=i: fita(limpo(tr(WHEEK, i, dmin=0.06, dmax=0.35, conf=0.55), 200, 5000), 0.78) for i in range(2)]
                   + [lambda: repete(fita(limpo(tr(CHILR, 3, dmin=0.06, dmax=0.15, conf=0.8), 200, 5000), 0.8), 3, 0.05)],
        'susto': [lambda i=i: fita(limpo(tr(FELIZ, i, dmin=0.05, dmax=0.1, conf=0.8, maxdur=0.12), 150, 4000), 0.8) for i in range(2)],
        'contente': [lambda i=i: fita(limpo(tr(FELIZ, i, dmin=0.15, dmax=0.35, maxdur=0.4), 100, 2500, False), 0.72) for i in range(2)],
        'ai': [lambda i=i: ai_de(limpo(tr(WHEEK, i, dmin=0.06, dmax=0.35, conf=0.55), 200, 5000), 0.95, 1.35, 0.25, camada=mola(380, 700)) for i in range(2)],
    }
    sapo = {
        'chamado': [lambda i=i: juntar([fita(limpo(tr(SAPO, i + j, dmin=0.06, dmax=0.15, conf=0.9), 150, 4500), 0.86 - 0.03 * j) for j in range(3)], 0.05) for i in range(3)],
        'susto': [lambda i=i: fita(limpo(tr(RA_, i, dmin=0.05, dmax=0.2, maxdur=0.18), 200, 5000), 1.0) for i in range(2)],
        'contente': [lambda i=i: juntar([fita(limpo(tr(PERERECA, i + j, dmin=0.08, dmax=0.25, conf=0.7, maxdur=0.15), 150, 2600), 0.9) for j in range(2)], 0.08) for i in range(2)],
        'ai': [lambda i=i: ai_de(limpo(tr(SAPO, i, dmin=0.06, dmax=0.15, conf=0.9), 150, 4500), 1.0, 1.5, 0.2, camada=mola(300, 600)) for i in range(2)],
    }
    saci = {  # assobio que sobe e desce e risadinha travessa
        'chamado': [lambda: juntar([apito([(0, 1400), (0.45, 2150), (0.6, 2150), (1, 1500)], 0.32, 0.15, (6, 0.3)), apito([(0, 1450), (0.45, 2250), (0.6, 2250), (1, 1550)], 0.34, 0.15, (6, 0.3))], 0.08), lambda: limpo(trecho(ASS1, 0.15, 1.3), 600, 7000, False),
                    lambda: fita(limpo(trecho(ASS2, 2.0, 3.0), 500, 7000, False), 1.15)],
        'susto': [lambda i=i: fita_curva(limpo(tr(ELFO, i, dmin=0.05, dmax=0.15, conf=0.6, maxdur=0.12), 250, 6500), [(0, 1.25), (1, 1.8)]) for i in range(2)],
        'contente': [lambda i=i: fita(limpo(tr(ELFO, i, dmin=0.3, dmax=1.0, conf=0.8, maxdur=0.75), 200, 6500), 1.32) for i in range(2)]
                    + [lambda: mix((fita(limpo(tr(MENINA, 0, maxdur=0.9, pad=0.4), 200, 6500), 1.2), 1, 0))],
        'ai': [lambda i=i: ai_de(limpo(tr(RISADAS, i + 4, dmin=0.06, dmax=0.14, conf=0.8), 250, 6000), 1.35, 1.9, 0.2, camada=mola(520, 950)) for i in range(2)],
    }
    guara = {  # o "uó" grave do lobo-guará: latido-uivo curto, nunca bravo
        'chamado': [lambda i=i: fita(limpo(tr(CAO, i, dmin=0.1, dmax=0.2, conf=0.85), 120, 3200), 0.94) for i in range(2)]
                   + [lambda: fita(limpo(tr(LOBOS, 0, dmin=0.3, dmax=0.5, conf=0.6, maxdur=0.5), 150, 3200), 1.0)],
        'susto': [lambda i=i: fita(limpo(tr(LOBOS, i, dmin=0.05, dmax=0.15, conf=0.8, maxdur=0.15), 200, 4000), 1.15) for i in range(2)],
        'contente': [lambda i=i: fita(limpo(tr(OFEGO, i, dmin=0.25, dmax=1.0, maxdur=0.7), 250, 4500), 0.92) for i in range(2)],
        'ai': [lambda i=i: ai_de(limpo(tr(LOBOS, i + 2, dmin=0.05, dmax=0.15, conf=0.8), 200, 4500), 1.2, 1.7, 0.22, camada=mola(380, 700)) for i in range(2)],
    }
    return {
        'cervo': dict(nome='Capivara', porte='medio', baque='pelo', derrota='puf_medio', momentos=capivara, filhote=1.3),
        'coelho': dict(nome='Sapo-cururu', porte='pequeno', baque='agua', derrota='puf_pequeno', momentos=sapo, filhote=1.35),
        'peixe': dict(nome='Lambari', porte='pequeno', baque='agua', derrota='plop', momentos=peixe(600)),
        'espectro': dict(nome='Saci travesso', porte='medio', baque='pano', derrota='puf_medio', momentos=saci),
        'raposa': dict(nome='Lobo-guará', porte='medio', baque='pelo', derrota='puf_medio', momentos=guara, filhote=1.35),
    }


def tema_doce():
    ovelha = {
        'chamado': [lambda: bale(OV2, 0, 1.12, 3000, 150, maxdur=0.9, dmin=0.4), lambda: bale(OV3, 0, 1.2, 3000, 150), lambda: fita(limpo(lib.ler(OV1), 150, 3000), 1.12)],
        'susto': [lambda: bale(OV2, 0, 1.38, 3600, 160, maxdur=0.3, dmin=0.4), lambda: bale(OV3, 0, 1.45, 3600, 160, maxdur=0.28)],
        'contente': [lambda: bale(OV2, 0, 1.05, 1100, 120, maxdur=0.45, dmin=0.4), lambda: bale(OV3, 0, 1.1, 1100, 120, maxdur=0.4)],
        'ai': [lambda: ai_de(limpo(tr(OV2, 0, dmin=0.4), 150, 4000), 1.25, 1.8, camada=mola(460, 860)), lambda: ai_de(limpo(tr(OV3, 0), 150, 4000), 1.3, 1.85, camada=mola(500, 900))],
    }
    gelatina = {
        'chamado': [lambda k=k: mix((boing(320 + 50 * k, 720, 0.42, vib=16, prof=3), 1, 0), (fita(limpo(tr(COELHO, k, dmin=0.04, dmax=0.12, conf=0.85, tmin=20, tmax=24), 300, 7000), 1.4), 0.25, 0.04)) for k in range(3)],
        'susto': [lambda k=k: mix((fita(limpo(tr(AFLITA, 0, maxdur=0.15), 500, 7500), 1.3 + 0.1 * k), 1, 0), (boing(1000, 1500, 0.14, vib=16), 0.3, 0)) for k in range(2)],
        'contente': [lambda k=k: juntar([boing(f, f * 1.4, 0.16, vib=16, prof=2) for f in ([700, 600, 520] if k == 0 else [520, 700, 600])], 0.02) for k in range(2)],
        'ai': [lambda k=k: mix((mola(420 + 60 * k, 900, 0.3), 1, 0), (guincho(1100, 1600, 0.1), 0.3, 0.02)) for k in range(2)],
    }

    def fizz(k):
        rr = np.random.default_rng(40 + k); n = int(0.5 * SR); g = np.zeros(n)
        for _ in range(60):
            i = int(rr.uniform(0, 0.9) * n); m = int(0.002 * SR); g[i:i + m] += rr.standard_normal(m) * np.hanning(m) * rr.uniform(0.3, 1)
        return filtro(g, 'high', 3500) * np.exp(-np.arange(n) / (0.25 * SR))
    pbala = peixe(720)
    pbala['chamado'] = [lambda k=k: mix((agua_chamado(720, k), 1, 0), (fizz(k), 0.12, 0.02)) for k in range(3)]
    pbala['contente'] = [lambda k=k: mix((agua_contente(720, k), 1, 0), (fizz(k + 3), 0.1, 0.0)) for k in range(2)]
    fantasma = {
        'chamado': [lambda k=k: voz_sint([S('u', 0.6, 0, 3 + k)], 370 + 20 * k, 1.15, 0.2, (5, 0.5)) for k in range(2)]
                   + [lambda: fita(limpo(tr(CANTA, 2, dmin=0.15, dmax=0.7, conf=0.95, maxdur=0.6), 150, 3000, False), 1.3)],
        'susto': [lambda i=i: fita_curva(limpo(tr(MENINA, i + 2, maxdur=0.12), 250, 5500), [(0, 1.3), (1, 1.6)]) for i in range(2)],
        'contente': [lambda: fita(limpo(tr(RISADAS, 0, dmin=0.3, dmax=1.2, maxdur=0.8), 200, 6000), 1.3),
                     lambda: fita(limpo(tr(GIGGLY, 0, maxdur=0.9), 200, 6000), 1.3)],
        'ai': [lambda k=k: mix((voz_sint([S('u', 0.08, 2), S('ó', 0.16, 9 + k, -6)], 380, 1.15, 0.15, (7, 0.3)), 1, 0), (mola(420, 760, 0.25), 0.3, 0.02)) for k in range(2)],
    }
    biscoito = {
        'chamado': [lambda i=i: fita(limpo(tr(MUDI, i + 4, dmin=0.12, dmax=0.6, conf=0.6, maxdur=0.32), 250, 6500), 1.22) for i in range(2)]
                   + [lambda: fita(limpo(trecho(SPITZ, 0.72, 1.17), 250, 6500), 1.25)],
        'susto': [lambda i=i: fita(limpo(tr(MUDI, i + 6, dmin=0.12, dmax=0.3, conf=0.6, maxdur=0.18), 250, 6500), 1.45, 1.55) for i in range(2)],
        'contente': [lambda i=i: fita(limpo(tr(OFEGO, i + 2, dmin=0.25, dmax=1.0, maxdur=0.6), 300, 5000), 1.18) for i in range(2)],
        'ai': [lambda i=i: ai_de(limpo(tr(FILHOTE, i, dmin=0.1, dmax=0.4, conf=0.6), 400, 6500, True), 1.0, 1.3, 0.28, camada=mola(520, 900)) for i in range(2)],
    }
    return {
        'cervo': dict(nome='Ovelha de marshmallow', porte='medio', baque='gelatina', derrota='puf_medio', momentos=ovelha, filhote=1.45),
        'coelho': dict(nome='Coelho de gelatina', porte='pequeno', baque='gelatina', derrota='puf_pequeno', momentos=gelatina, filhote=1.3),
        'peixe': dict(nome='Peixe-bala', porte='pequeno', baque='agua', derrota='plop', momentos=pbala),
        'espectro': dict(nome='Fantasminha de alcaçuz', porte='medio', baque='gelatina', derrota='puf_medio', momentos=fantasma),
        'raposa': dict(nome='Cãozinho de biscoito', porte='pequeno', baque='crocante', derrota='puf_pequeno', momentos=biscoito, filhote=1.35),
    }


def tema_dinos():
    def trombeta(k, r=0.85):
        e = fita(limpo(tr(ELEF, 0), 120, 2400), r - 0.04 * k)
        v = fita(limpo(tr(VACA1, 2 + k % 2, dmin=0.6, maxdur=0.8), 70, 1800), 1.0 + 0.04 * k)
        return mix((e, 1, 0), (v, 0.6 * np.max(np.abs(e)) / (np.max(np.abs(v)) + 1e-9), 0.05))
    pescocudo = {
        'chamado': [L(trombeta, k) for k in range(3)],
        'susto': [lambda k=k: fita(limpo(tr(VACA1, k, dmin=0.6, maxdur=0.3), 90, 3000), 1.25, 1.35) for k in range(2)],
        'contente': [lambda k=k: fita(limpo(tr(VACA1, k + 2, dmin=0.6, maxdur=0.7), 70, 900), 0.95, 0.9) for k in range(2)],
        'ai': [lambda k=k: ai_de(limpo(tr(VACA1, k, dmin=0.6), 90, 3500), 1.1, 1.6, 0.3, camada=mola(200, 380, 0.3)) for k in range(2)],
    }
    lagartixa = {
        'chamado': [lambda i=i: mix((repete(fita(limpo(tr(PARDAL2, i, maxdur=0.12), 600, 8000), 0.92), 3, 0.045), 1, 0)) for i in range(2)]
                   + [lambda: repete(fita(limpo(tr(CHILR, 4, dmin=0.06, dmax=0.15, conf=0.8), 400, 8000), 1.25), 3, 0.04)],
        'susto': [lambda k=k: fita(limpo(tr(AFLITA, 0, maxdur=0.15), 500, 7500), 1.05 + 0.1 * k) for k in range(2)],
        'contente': [lambda i=i: repete(fita(limpo(tr(PARDAL2, i + 3, maxdur=0.1), 600, 6000), 0.85), 2, 0.07) for i in range(2)],
        'ai': [lambda k=k: mix((guincho(1300 + 100 * k, 1900, 0.12), 1, 0), (mola(650, 1100, 0.2), 0.6, 0.03)) for k in range(2)],
    }
    pcouraca = peixe(380)
    tonk = lambda: filtro(sum(np.sin(2 * np.pi * 420 * h * t_(0.12)) * np.exp(-t_(0.12) / (0.04 / h)) / h for h in (1, 2.02)), 'low', 1800)
    pcouraca['ai'] = [lambda k=k: mix((agua_ai(320, k), 1, 0), (tonk(), 0.3, 0)) for k in range(2)]
    morcego = {
        'chamado': [lambda i=i: mix((repete(fita(limpo(tr(WHEEK, i + 2, dmin=0.06, dmax=0.35, conf=0.55, maxdur=0.2), 300, 7000), 1.25), 2, 0.06), 1, 0), (flaps(3), 0.18, 0.25)) for i in range(2)]
                   + [lambda: fita(limpo(tr(PELIC, 0, dmin=0.1, dmax=0.3, fmin=900, maxdur=0.25), 300, 6000), 1.1)],
        'susto': [lambda k=k: mix((filtro(osc(glide(0.45, [(0, 1900 + 100 * k), (0.2, 2100), (1, 650)]), 'tri'), 'low', 5000) * adsr(int(0.45 * SR), 0.01, 0.08), 1, 0)) for k in range(2)],
        'contente': [lambda i=i: mix((juntar([fita(limpo(tr(PELIC, i + j, dmin=0.08, dmax=0.25, fmin=900, maxdur=0.12), 300, 5000), 1.05) for j in range(3)], 0.05), 1, 0), (flaps(2), 0.15, 0.1)) for i in range(2)],
        'ai': [lambda i=i: ai_de(limpo(tr(WHEEK, i, dmin=0.06, dmax=0.35, conf=0.55), 300, 7000), 1.3, 1.8, 0.2, camada=mola(520, 900)) for i in range(2)],
    }
    raptor = {
        'chamado': [lambda i=i: fita(limpo(tr(GUIRA, i + 1, dmin=0.1, conf=0.7), 300, 7000), 0.92) for i in range(2)]
                   + [lambda: fita(limpo(tr(PARDAL, 0, dmin=0.15, dmax=0.4, conf=0.6, maxdur=0.4), 500, 7000), 0.85)],
        'susto': [lambda: fita(limpo(tr(PERU, 0), 250, 6000), 1.1), lambda: fita(limpo(tr(PERU, 1, maxdur=0.25), 250, 6000), 1.2)],
        'contente': [lambda i=i: repete(fita(limpo(tr(PARDAL2, i + 5, maxdur=0.12), 600, 6000), 0.95), 2, 0.06) for i in range(2)],
        'ai': [lambda i=i: ai_de(limpo(tr(GUIRA, i + 1, dmin=0.1, conf=0.7), 300, 7000), 1.15, 1.6, 0.22, camada=guincho(1000, 1500)) for i in range(2)],
    }
    return {
        'cervo': dict(nome='Pescoçudo-filhote', porte='grande', baque='pelo', derrota='puf_grande', momentos=pescocudo, filhote=1.35),
        'coelho': dict(nome='Lagartixa-pula-pula', porte='pequeno', baque='pelo', derrota='puf_pequeno', momentos=lagartixa, filhote=1.15),
        'peixe': dict(nome='Peixe-couraça', porte='pequeno', baque='agua', derrota='plop', momentos=pcouraca),
        'espectro': dict(nome='Morcegossauro', porte='medio', baque='pano', derrota='puf_medio', momentos=morcego),
        'raposa': dict(nome='Raptorzinho', porte='medio', baque='pena', derrota='puf_medio', momentos=raptor, filhote=1.15),
    }


def tema_lua():
    def motor(dur=0.22):
        return filtro(osc(np.full(int(dur * SR), 110.0), 'saw'), 'low', 600) * adsr(int(dur * SR), 0.02, 0.05)
    rover = {
        'chamado': [lambda k=k: mix((motor(), 0.25, 0), (bips([[660, 880, 660], [523, 659, 784], [880, 660]][k], 0.07, 0.03, 'square', 2800), 1, 0.05)) for k in range(3)],
        'susto': [lambda k=k: mix((filtro(osc(glide(0.35, [(0, 900 + 80 * k), (1, 380)]), 'saw'), 'low', 2000) * adsr(int(0.35 * SR), 0.01, 0.06), 1, 0), (puf(0.2, 1500, 5000, False), 0.08, 0)) for k in range(2)],
        'contente': [lambda k=k: bips([523, 659, 784, 1047] if k == 0 else [587, 740, 880, 1175], 0.06, 0.02, 'tri', 5000) for k in range(2)],
        'ai': [lambda k=k: mix((bip(1000 + 80 * k, 0.15, 'square', glide_to=600, lp=2500), 0.7, 0), (mola(420, 800, 0.24), 0.7, 0.02)) for k in range(2)],
    }
    coelho = {
        'chamado': [lambda i=i: radio(repete(fita(limpo(tr(COELHO, i + 3, dmin=0.04, dmax=0.12, conf=0.85, tmin=20, tmax=24), 300, 7000), 1.4), 2, 0.06)) for i in range(2)]
                   + [lambda: radio(juntar([fita(limpo(tr(CHILR, 5, dmin=0.06, dmax=0.15, conf=0.8), 300, 7000), 1.2), bip(1568, 0.05, 'sine', lp=6000) * 0.2], 0.03))],
        'susto': [lambda k=k: radio(fita(limpo(tr(AFLITA, 0, maxdur=0.15), 500, 7500), 1.2 + 0.1 * k)) for k in range(2)],
        'contente': [lambda i=i: radio(repete(fita(limpo(tr(CHILR, i + 6, dmin=0.06, dmax=0.15, conf=0.8, fmax=1300), 300, 6000), 1.3), 3, 0.04, 0.03)) for i in range(2)],
        'ai': [lambda i=i: radio(ai_de(limpo(tr(COELHO, i + 3, dmin=0.04, dmax=0.12, conf=0.85, tmin=20, tmax=24), 300, 7000), 1.45, 2.0, 0.2, camada=guincho(1200, 1800))) for i in range(2)],
    }
    pgelo = peixe(900, 2093)
    eco_s = (0.18, 0.38, 3, 1600)
    sombra = {
        'chamado': [lambda k=k: voz_sint([S('u', 0.6, 0, 5 + k)], 210 + 15 * k, 1.0, 0.15, (5, 0.4), eco_=eco_s) for k in range(2)]
                   + [lambda: voz_sint([S('u', 0.18, 0, 0, 'm'), S('u', 0.32, 3, 2, 'm')], 200, 1.0, 0.15, (5, 0.4), eco_=eco_s)],
        'susto': [lambda k=k: voz_sint([S('i', 0.1, 0, 3), S('i', 0.14, 4, 5)], 520 + 30 * k, 1.2, 0.12, (6, 0.3), eco_=(0.12, 0.3, 2, 2500)) for k in range(2)],
        'contente': [lambda k=k: voz_sint([S('u', 0.5, 0, 4, 'm')], 230 + 20 * k, 1.0, 0.12, (5, 0.5), eco_=eco_s) for k in range(2)],
        'ai': [lambda k=k: mix((voz_sint([S('u', 0.09, 2), S('ó', 0.18, 9 + k, -6)], 260, 1.0, 0.15, (7, 0.3), eco_=(0.12, 0.25, 2, 2000)), 1, 0), (mola(280, 520, 0.25), 0.3, 0.02)) for k in range(2)],
    }
    seq = [[(880, 0.06), (1320, 0.05), (990, 0.08)], [(1175, 0.05), (1568, 0.05), (1320, 0.05), (1760, 0.07)], [(1047, 0.07), (784, 0.05), (1397, 0.08)]]
    car = lambda f0: glote(f0, 0.02, 0.001) + np.diff(osc(f0, 'square') * 0.2, prepend=0) * 8
    robo = {
        'chamado': [L(r2, seq[k], k) for k in range(3)],
        'susto': [lambda k=k: falar([S('u', 0.12, 5 + k), S('o', 0.2, 0 + k, -2)], f_base=520, escala=1.2, sopro=0.03, carrier=car, vib=(6, 0.05), degraus=True) for k in range(2)],
        'contente': [lambda k=k: juntar([bip(f, 0.04, 'tri', lp=6000) for f in ([1047, 1175, 1319, 1397, 1568, 1760] if k == 0 else [1319, 1568, 1319, 1760, 2093])], 0.012) for k in range(2)],
        'ai': [lambda k=k: mix((bip(1400 + 100 * k, 0.12, 'square', glide_to=800, lp=2600), 0.6, 0), (mola(560, 1000, 0.22), 0.7, 0.02)) for k in range(2)],
    }
    return {
        'cervo': dict(nome='Rover-pastor', porte='medio', baque='lata', derrota='robo', momentos=rover, filhote=1.3),
        'coelho': dict(nome='Coelho-lunar', porte='pequeno', baque='pano', derrota='puf_pequeno', momentos=coelho, filhote=1.3),
        'peixe': dict(nome='Peixe de gelo', porte='pequeno', baque='agua', derrota='plop', momentos=pgelo),
        'espectro': dict(nome='Eco-sombra', porte='grande', baque='pano', derrota='puf_grande', momentos=sombra),
        'raposa': dict(nome='Robô-companheiro', porte='pequeno', baque='lata', derrota='robo', momentos=robo, filhote=1.3),
    }


def antigo(k):
    """Refaz uma receita do esboço do Rancho (vozes019) com a lib nova."""
    (cid, fk, ini, fim, r0, r1, hp, lp, ex) = next(r for r in RA.R if r[0] == k)
    x = trecho(RA.F[fk], ini, fim, pad=0.03)
    for (fk2, i2, f2) in ex.get('emenda', []):
        y = trecho(RA.F[fk2], i2, f2, pad=0.03); x = juntar([bordas(x, .003, .02), bordas(y, .003, .02)], 0.04)
    x = banda(x, hp, lp)
    if ex.get('portao'): x = portao(x)
    return fita(x, r0, r1)


def tema_rancho():
    def de(animal):
        return {m: [L(antigo, r[0]) for r in RA.R if r[0].startswith(f'{animal}.{m}.')] for m in ('chamado', 'susto', 'contente', 'ai')}
    coruja = {
        'chamado': [lambda: fita(limpo(trecho(POMBOM, 0.45, 1.25), 200, 2500, False), 0.92), lambda: fita(limpo(trecho(POMBOM, 0.08, 0.62), 200, 2500, False), 0.9),
                    lambda: fita(limpo(tr(POMBA, 0, dmin=0.8, conf=0.8, maxdur=0.9), 200, 2000, False), 0.8)],
        'susto': [lambda i=i: fita(limpo(tr(CORUJA, i, dmin=0.12, dmax=0.3, conf=0.75, maxdur=0.22), 400, 6000), 1.0) for i in range(2)],
        'contente': [lambda: fita(limpo(trecho(POMBOM, 2.18, 2.5), 200, 1300, False), 0.95), lambda: fita(limpo(tr(POMBA, 1, dmin=0.15, dmax=0.4, conf=0.8), 200, 1200, False), 0.82)],
        'ai': [lambda i=i: ai_de(limpo(tr(CORUJA, i + 2, dmin=0.12, dmax=0.3, conf=0.75), 400, 6000), 1.05, 1.45, 0.24, camada=mola(420, 760)) for i in range(2)],
    }
    vaca = de('vaca'); galinha = de('galinha'); cao = de('cachorro')
    return {
        'cervo': dict(nome='Vaca malhada', porte='grande', baque='pelo', derrota='puf_grande', momentos=vaca, filhote=1.45, filhote_nome='bezerro'),
        'coelho': dict(nome='Galinha caipira', porte='pequeno', baque='pena', derrota='puf_pequeno', momentos=galinha, filhote=de('pintinho'), filhote_nome='pintinho',
                       extra={'galo': de('galo')}),
        'peixe': dict(nome='Tilápia do açude', porte='pequeno', baque='agua', derrota='plop', momentos=peixe(520)),
        'espectro': dict(nome='Coruja curiosa', porte='medio', baque='pena', derrota='puf_medio', momentos=coruja),
        'raposa': dict(nome='Cachorro do sítio', porte='medio', baque='pelo', derrota='puf_medio', momentos=cao, filhote=de('filhote'), filhote_nome='filhote'),
    }


TEMAS = {'bruma-e-luz': tema_bruma, 'planeta-vivo': tema_planeta, 'mata-encantada': tema_mata, 'doce-reino': tema_doce,
         'era-dos-dinos': tema_dinos, 'exploracao-lunar': tema_lua, 'rancho-alegre': tema_rancho}


def filhote_de(momentos, r):
    """Filhote: as duas primeiras versões de cada momento, mais finas (fita) e um tico mais curtas."""
    return {m: [(lambda f=f, m=m: filtro(fita(f(), r * (1.04 if m == 'susto' else 1.0)), 'low', 5500)) for f in fs[:2]] for m, fs in momentos.items()}


def render(tema, slot, grupo, momento, k, fn, rec):
    bb.USADOS.clear()
    x = fn()
    if not np.isfinite(x).all() or np.max(np.abs(x)) < 1e-6: raise RuntimeError(f'sinal vazio {tema}/{slot} {momento}')
    y = fechar(x, momento)
    cid = f'{tema}/{grupo}.{momento}.{k + 1}'
    salvar(f'/t/wav/{cid}.wav', y)
    rec[cid] = {'fontes': sorted(bb.USADOS) or ['sintese'], 'seg': round(len(y) / SR, 3), 'rmsAtivoDb': round(rms_ativo(y), 1), 'picoDb': round(20 * np.log10(np.abs(y).max()), 1)}
    return cid


if __name__ == '__main__':
    so = sys.argv[1:] or list(TEMAS)
    rec = {}; estrutura = {}
    for tema in so:
        bichos = TEMAS[tema](); estrutura[tema] = {}
        for slot, b in bichos.items():
            e = {'nome': b['nome'], 'porte': b['porte'], 'baque': b['baque'], 'derrota': b['derrota'], 'momentos': {}}
            for m, fs in b['momentos'].items():
                e['momentos'][m] = [render(tema, slot, slot, m, k, f, rec) for k, f in enumerate(fs)]
            if 'filhote' in b:
                fm = b['filhote'] if isinstance(b['filhote'], dict) else filhote_de(b['momentos'], b['filhote'])
                e['filhote'] = {'nome': b.get('filhote_nome', 'filhote'), 'momentos': {m: [render(tema, slot, slot + '.filhote', m, k, f, rec) for k, f in enumerate(fs)] for m, fs in fm.items()}}
            for nome_x, mm in b.get('extra', {}).items():
                e.setdefault('extra', {})[nome_x] = {m: [render(tema, slot, slot + '.' + nome_x, m, k, f, rec) for k, f in enumerate(fs)] for m, fs in mm.items()}
            estrutura[tema][slot] = e
            print(tema, slot, b['nome'], {m: len(v) for m, v in e['momentos'].items()}, 'filhote' if 'filhote' in e else '', flush=True)
    try: old = json.load(open('/t/receitas_bichos.json'))
    except Exception: old = {'arquivos': {}, 'estrutura': {}}
    old['arquivos'].update(rec); old['estrutura'].update(estrutura)
    json.dump(old, open('/t/receitas_bichos.json', 'w'), ensure_ascii=False, indent=1)
