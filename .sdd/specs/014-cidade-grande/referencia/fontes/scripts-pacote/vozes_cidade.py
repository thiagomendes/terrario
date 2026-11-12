"""Vozes, sons da obra e ambiente da Cidade Grande (spec 014, T09), com a biblioteca e as receitas da 019
(019/scripts-vozes: lib.py, base_bichos.py, criaturas.py, moradores.py) e os recortes aprovados no esboço (sons_cidade.py).

Rodar tudo de novo: ver rodar.sh. Este passo (no contêiner som014:local, BAIXADOS=/b com as gravações baixadas,
/s019 = 019/scripts-vozes, /s = esta pasta, /o = trabalho):
  BAIXADOS=/b python3 -I vozes_cidade.py <obra_render> <saida_wav> <receitas.json>
Gravações (todas CC0 ou domínio público; baixadas pelo commons_baixar.py da 019, que recusa o resto, e do BigSoundBank):
  commons/pomba.ogg, commons/pombo_maos.ogg, commons/gato_pede.oga, commons/gata_jovem.ogg, commons/gato_ronrona.oga,
  commons/cobaia_chilreio.ogg, commons/cobaia_feliz.ogg, commons/pardal_sardin.oga, commons/bolhas2.opus,
  bsb/2954.mp3, bsb/0916.mp3, bsb/1547.mp3, bsb/0612.mp3, bsb/0682.mp3, commons/c_filhote_noite.ogg.
Síntese nossa: trinado do guaxinim, estalos, poeirinha, buzininha "fom-fom", fogos de brinquedo, grilo, moradores e o pedreiro
(sintetizador de formantes lib.falar). Instrumentos da obra: renders de obra_compor.py (FluidR3_GM, MIT).
Régua: finalizar() da 019 (RMS "enquanto soa" -23 dB); o coreto sai a -26 e a buzininha ao longe a -31 (vozes_codificar.py confere no MP3).
"""
import sys, os, json, zlib
sys.path.insert(0, '/s019')
import numpy as np
import lib
from lib import (SR, tom, filtro, banda, finalizar, salvar, juntar, mix, eco, sala, osc, adsr, glide, vibrato, bordas, fita,
                 fita_curva, aparar, falar, coro, pico_eq, puf, bolha, rms_ativo, t_)
import base_bichos as bb
from base_bichos import tr, trecho, limpo, ai_de, mola, guincho, fechar
import criaturas as CR
import moradores as MO

obra_render, saida, receitas_p = sys.argv[1:4]
TEMA = 'cidade-grande'
C, B = 'commons/', 'bsb/'
POMBA, POMBOM, GATO, GATA, PURR = C + 'pomba.ogg', C + 'pombo_maos.ogg', C + 'gato_pede.oga', C + 'gata_jovem.ogg', C + 'gato_ronrona.oga'
CHILR, FELIZ, PARDAL2 = C + 'cobaia_chilreio.ogg', C + 'cobaia_feliz.ogg', C + 'pardal_sardin.oga'
CAO, CAO2, OFEGO = B + '2954.mp3', B + '0916.mp3', B + '1547.mp3'
ler = bb.ler_reg
S = CR.S


def sec(x, a, b):
    return x[int(a * SR):int(b * SR)].copy()


# ------------------------------------------------------------------ cachorro grande (vaga cervo)
def au(cortes, fonte=CAO, semi=-3, lp=4200):
    d = ler(fonte)
    return filtro(tom(juntar([sec(d, a, b) for a, b in cortes], 0.1), semi), 'low', lp, 2)


cachorro = {
    'chamado': [lambda: au([(0.08, 0.32), (0.43, 0.66)]),                       # o "au-au" aprovado no esboço
                lambda: au([(8.06, 8.62)]), lambda: au([(2.48, 3.05)])],
    'susto': [lambda: fita(limpo(trecho(CAO, 11.80, 11.99), 120, 4500, False), 1.04),
              lambda: fita(limpo(trecho(CAO2, 15.67, 15.86), 120, 4500, False), 1.02),
              lambda: fita(limpo(trecho(CAO2, 19.83, 20.02), 120, 4500, False), 1.02)],
    'contente': [lambda: fita(limpo(trecho(OFEGO, 2.98, 3.94), 250, 4500), 0.9), lambda: fita(limpo(trecho(OFEGO, 4.12, 4.94), 250, 4500), 0.92),
                 lambda: fita(limpo(trecho(OFEGO, 4.98, 5.80), 250, 4500), 0.9)],
    'ai': [lambda: ai_de(limpo(trecho(CAO, 5.09, 5.24), 120, 4500, False), 1.05, 1.45, 0.24, camada=mola(300, 560), lp=4500),
           lambda: ai_de(limpo(trecho(CAO, 0.45, 0.63), 120, 4500, False), 1.05, 1.45, 0.24, camada=mola(320, 580), lp=4500),
           lambda: ai_de(limpo(trecho(CAO2, 4.26, 4.46), 120, 4500, False), 1.05, 1.4, 0.24, camada=mola(300, 540), lp=4500)],
}
filhote_cao = {m: [(lambda k=k, m=m: fita(CR.antigo(f'filhote.{m}.{k}'), 1.02)) for k in (1, 2)] for m in ('chamado', 'susto', 'contente', 'ai')}


# ------------------------------------------------------------------ pombo da praça (vaga coelho)
def pomba():
    return ler(POMBA)


pombo = {
    'chamado': [lambda: tom(sec(pomba(), 1.0, 2.8), -3),                         # aprovado no esboço
                lambda: tom(sec(pomba(), 3.66, 4.98), -3),
                lambda: fita(limpo(trecho(POMBOM, 0.45, 1.25), 200, 2500, False), 0.95)],
    'susto': [lambda k=k: mix((CR.flaps(3, 0.05), 0.5, 0), (fita(limpo(tr(POMBA, k, dmin=0.15, dmax=0.45, conf=0.6, maxdur=0.3), 200, 3000, False), 1.15), 1, 0.06))
              for k in range(2)],
    'contente': [lambda: tom(juntar([sec(pomba(), 3.25, 3.55), sec(pomba(), 5.5, 5.82)], 0.05), -1),   # aprovado no esboço
                 lambda: tom(juntar([sec(pomba(), 5.5, 5.82), sec(pomba(), 3.25, 3.55)], 0.06), -2),
                 lambda: fita(limpo(trecho(POMBOM, 2.18, 2.5), 200, 1300, False), 1.0)],
    'ai': [lambda k=k: ai_de(limpo(tr(POMBA, k, dmin=0.15, dmax=0.45, conf=0.6), 200, 3000, False), 1.1, 1.5, 0.24, camada=mola(420, 760)) for k in range(2)]
          + [lambda: ai_de(limpo(trecho(POMBOM, 0.45, 0.8), 200, 2500, False), 1.1, 1.5, 0.24, camada=mola(440, 780))],
}


# ------------------------------------------------------------------ guaxinim travesso (vaga espectro): chilreio mais grave + trinado nosso
def chilreios():
    c = ler(CHILR)
    return [sec(c, a, b) for a, b in [(0.87, 1.0), (1.07, 1.19), (1.29, 1.43), (1.5, 1.59)]]


def trinado(dur=0.32, pts=((0, 900), (0.5, 1100), (1, 800)), taxa=22):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return osc(vibrato(glide(dur, list(pts)), 28, 1.2)) * adsr(n, 0.01, 0.08) * (0.5 + 0.5 * np.sin(2 * np.pi * taxa * t)) ** 2


def trr(ordem, semi):
    p = chilreios()
    return tom(juntar([p[i] for i in ordem], 0.03), semi)


guaxinim = {
    'chamado': [lambda: juntar([trr([0, 1, 2, 3], -7), trinado() * 0.35], 0.06),     # aprovado no esboço
                lambda: juntar([trinado(0.26, ((0, 850), (0.5, 1050), (1, 780))) * 0.3, trr([2, 0, 3], -6)], 0.05),
                lambda: juntar([trr([1, 3, 0], -8), trinado(0.28, ((0, 820), (0.6, 1000), (1, 760)), 20) * 0.3], 0.06)],
    'susto': [lambda k=k: mix((tom(chilreios()[2 * k], -5), 1, 0), (trinado(0.12, ((0, 900), (1, 1250)), 26) * 0.25, 1, 0.08)) for k in range(2)],
    'contente': [lambda k=k: mix((fita(limpo(tr(FELIZ, k, dmin=0.15, dmax=0.35, maxdur=0.4), 100, 2500, False), 0.8), 1, 0),
                                 (trinado(0.25, ((0, 1000), (1, 1300)), 24) * 0.25, 1, 0.12)) for k in range(2)],
    'ai': [lambda k=k: ai_de(limpo(chilreios()[k + 1], 300, 6000, False), 1.0, 1.4, 0.22, camada=mola(380, 700)) for k in range(2)],
}


# ------------------------------------------------------------------ gato de rua (vaga raposa)
gato = {
    'chamado': [lambda: sec(ler(GATO), 3.6, 4.8),                                  # aprovado no esboço
                lambda: limpo(trecho(GATO, 6.73, 7.56), 200, 6000, False),
                lambda: fita(limpo(trecho(GATO, 9.45, 10.15), 200, 6000, False), 1.03)],
    'susto': [lambda: fita(limpo(aparar(ler(GATA))[:int(0.2 * SR)], 250, 6000, False), 1.1),
              lambda: fita(limpo(trecho(GATO, 10.21, 10.41), 250, 6000, False), 1.1)],
    'contente': [lambda: tom(aparar(ler(GATA)), 1),                               # aprovado no esboço
                 lambda: fita(limpo(tr(PURR, 0, dmin=0.2, dmax=0.6), 150, 3000, False), 1.0),
                 lambda: fita(limpo(tr(PURR, 1, dmin=0.2, dmax=0.6), 150, 3000, False), 1.04)],
    'ai': [lambda: ai_de(limpo(aparar(ler(GATA)), 250, 6000, False), 1.1, 1.45, 0.24, camada=guincho(900, 1300)),
           lambda: ai_de(limpo(sec(ler(GATO), 3.6, 4.0), 250, 6000, False), 1.1, 1.45, 0.24, camada=guincho(950, 1350))],
}

BICHOS = {
    'cervo': dict(nome='Cachorro grande', porte='grande', baque='pelo', derrota='puf_grande', momentos=cachorro, filhote=filhote_cao, filhote_nome='filhote de cachorro'),
    'coelho': dict(nome='Pombo da praça', porte='pequeno', baque='pena', derrota='puf_pequeno', momentos=pombo, filhote=1.3, filhote_nome='pombinho'),
    'peixe': dict(nome='Carpa do lago', porte='pequeno', baque='agua', derrota='plop', momentos=CR.peixe(480)),
    'espectro': dict(nome='Guaxinim travesso', porte='medio', baque='pelo', derrota='puf_medio', momentos=guaxinim),
    'raposa': dict(nome='Gato de rua', porte='pequeno', baque='pelo', derrota='puf_pequeno', momentos=gato, filhote=1.3, filhote_nome='gatinho'),
}

# ------------------------------------------------------------------ moradores da cidade: o balbucio da 019 com sabor "urbano"
MO.TEMAS[TEMA] = dict(cons=['', 'd', 't', 'l', 'n', 'b'], vog=['é', 'a', 'i', 'e', 'o'], sabor='urbano',
                      F=dict(f_base=350, escala=1.24, sopro=0.07), M=dict(f_base=212, escala=1.08, sopro=0.06))


def morador_cidade(sexo, momento, k):
    """Como moradores.morador, com o sabor da cidade: um tico mais ligeiro e mais claro (brilho em 3 kHz), com a última
    sílaba subindo um pouco no cumprimento (simpático, de quem cumprimenta na calçada)."""
    cfg = MO.TEMAS[TEMA]; p = dict(cfg[sexo])
    molde = MO.MOLDES[momento][k]
    for tentativa in range(60):   # mais rígido que a 019: nenhuma palavra da lista (nem "oi") em lugar nenhum do balbucio
        r = np.random.default_rng(zlib.crc32(f'{TEMA}{sexo}{momento}{k}{tentativa or ""}'.encode()))
        sil = MO.sorteia(cfg['cons'], cfg['vog'], len(molde), r)
        txt = ''.join(c + v for c, v in sil)
        sem_acento = txt.translate(str.maketrans('éóáíú', 'eoaiu'))
        if not any(w in txt or w in sem_acento for w in MO.PROIBIDAS + ['lati', 'late', 'dado', 'tela', 'bate', 'lobo', 'tio', 'tia', 'dono', 'dona', 'nota', 'toda', 'todo', 'bela', 'belo', 'leo', 'teta'] if len(w) >= 2):
            break
    if momento == 'obrigado':
        sil = [(c, v if j < 2 else ('a' if v in 'iu' else v)) for j, (c, v) in enumerate(sil)]
    ss = [dict(c=c, v=v, dur=dur * 0.94, nota=nota, gl=gl) for (c, v), (dur, nota, gl) in zip(sil, molde)]
    if momento == 'cumprimento':
        ss[-1]['gl'] += 2
    vib = (5.8, 0.2) if momento != 'obrigado' else (5.8, 0.4)
    y = falar(ss, f_base=p['f_base'], escala=p['escala'], sopro=p['sopro'], vib=vib, legato=0.028)
    y = coro(y, cents=7, atraso=0.011, m_=0.28)
    y = pico_eq(y, 3000, 2.5, 0.9)
    y = banda(y, 120 if sexo == 'F' else 90, 7000)
    y = finalizar(y, 0.004, 0.07, mol=0.11, sala_dur=0.12)
    return y, [s['c'] + s['v'] for s in ss]


# ------------------------------------------------------------------ pedreiro (voz de formantes, masculina e mansa)
def pedreiro_hum(k):
    """"Hum?" de quem pergunta com carinho: boca fechada (m + u, nasal), subindo no fim. Nada de zumbido de erro."""
    if k == 0:
        s = [S('u', 0.30, 0, 5, 'm')]
    else:
        s = [S('u', 0.11, 2, -1, 'm'), S('u', 0.22, 0, 6, 'm')]
    y = falar(s, f_base=150, escala=1.0, sopro=0.05, nasal=0.6, vib=(5, 0.12), legato=0.03)
    y = filtro(y, 'low', 2000, 2)
    return finalizar(y, 0.02, 0.06, mol=0.08, sala_dur=0.1)


def pedreiro_tada():
    y = falar([S('a', 0.12, 0, 0, 't'), S('a', 0.34, 5, 1, 'd')], f_base=165, escala=1.02, sopro=0.07, vib=(5.5, 0.35), legato=0.03)
    return banda(coro(y, 7, 0.011, 0.25), 90, 6500)


# ------------------------------------------------------------------ sons de brinquedo (síntese nossa)
def fom(dur, f0):
    """Um "fom" de buzina de bulbo (o mesmo do esboço, sons_cidade.py)."""
    n = int(dur * SR)
    f = glide(dur, [(0, f0 * 0.94), (0.15, f0), (1, f0 * 0.985)])
    y = osc(f, 'saw') * 0.6 + osc(f * 2, 'sine') * 0.25
    return banda(y, 300, 2600) * adsr(n, 0.015, 0.06)


def buzina_perto(f0=523):
    return juntar([fom(0.11, f0), fom(0.17, f0)], 0.05)


def buzina_longe(f0, d1, d2, gap):
    bz = juntar([fom(d1, f0), fom(d2, f0)], gap)
    return filtro(eco(sala(bz, 0.35, 0.5, 2200), 0.21, 0.22, 2, 1800), 'low', 2300, 2)


def poeira(dur=0.12, k=0):
    lib.rng = np.random.default_rng(700 + k)
    return puf(dur, 400, 2400)


def brilhos(n, ini, fim, k, f_lo=2000, f_hi=3600):
    r = np.random.default_rng(900 + k)
    out = np.zeros(int((fim + 0.2) * SR))
    for _ in range(n):
        t0 = r.uniform(ini, fim)
        f = r.uniform(f_lo, f_hi)
        tt = t_(0.12)
        s = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 2.76 * tt)) * np.exp(-tt / 0.035) * r.uniform(0.5, 1)
        i = int(t0 * SR)
        out[i:i + len(s)] += s[:len(out) - i]
    return filtro(out, 'low', 6500, 2)


def fogos(ini, k=0):
    """Fogos de brinquedo: três assobios macios subindo, cada um abrindo em brilhinhos (nenhum estouro)."""
    out = np.zeros(int((ini + 1.6) * SR))
    for j in range(3):
        t0 = ini + 0.24 * j
        d = 0.32
        f = glide(d, [(0, 650 + 80 * j), (1, 1500 + 150 * j)])
        a = osc(f) * adsr(len(f), 0.05, 0.08) * 0.22
        i = int(t0 * SR)
        out[i:i + len(a)] += a[:len(out) - i]
        b = brilhos(9, t0 + d - 0.02, t0 + d + 0.3, k * 10 + j)
        out[i:i + len(b)] += 0.5 * b[:len(out) - i]
    return out


def ler_render(nome):
    import wave
    from musica_processar import ler as ler_wav
    x, sr = ler_wav(os.path.join(obra_render, nome + '.wav'))
    assert sr == SR
    x = x.mean(axis=1)
    i = np.argmax(np.abs(x) > 1e-4)
    return x[max(0, i - 20):]


def caber(x, seg, sai=0.05):
    """Garante a duração máxima: corta com esmaecimento."""
    n = int(seg * SR)
    if len(x) <= n:
        return x
    x = x[:n].copy()
    m = int(sai * SR)
    x[-m:] *= np.cos(np.linspace(0, np.pi / 2, m)) ** 2
    return x


def norm_pico(x):
    return x / (np.max(np.abs(x)) + 1e-12)


FOLGA_MP3 = 0.08   # o MP3 decodificado sai ~0,08 s mais longo (atraso do LAME + o resto do último quadro): o "s" do índice cabe no máximo


def fechar_efeito(x, maximo, alvo=-23.0, mol=0.06, sai=0.06):
    x = caber(x, maximo - FOLGA_MP3 - 0.02, sai)
    y = finalizar(x, 0.002, sai, mol=mol, sala_dur=0.08, trim=-50, alvo=alvo)
    return caber(y, maximo - FOLGA_MP3, 0.03)


def obra():
    o = {}
    o['plim'] = []
    for i in range(11):
        x = norm_pico(caber(ler_render(f'plim_{i + 1:02d}'), 0.4, 0.12))
        x = mix((x, 1, 0), (norm_pico(poeira(0.12, i)), 0.07, 0.015))
        o['plim'].append((fechar_efeito(x, 0.5, sai=0.1), ['FluidR3_GM', 'sintese']))
    o['acorde'] = [(fechar_efeito(caber(ler_render(f'acorde_{k}'), 0.95, 0.25), 1.0, sai=0.2), ['FluidR3_GM']) for k in (1, 2)]
    piano = norm_pico(caber(ler_render('tada_1'), 1.5, 0.3))
    horn = norm_pico(buzina_perto(523))
    voz = norm_pico(pedreiro_tada())
    t1 = mix((piano, 1, 0), (horn, 0.32, 0.72))
    t2 = mix((piano, 1, 0), (horn, 0.30, 0.78), (voz, 0.42, 0.0))
    o['tada'] = [(fechar_efeito(t1, 1.6, sai=0.2), ['FluidR3_GM', 'sintese']), (fechar_efeito(t2, 1.6, sai=0.2), ['FluidR3_GM', 'sintese', 'sintese-formantes'])]
    pg = norm_pico(caber(ler_render('tadagrande'), 2.4, 0.5))
    tg = mix((pg, 1, 0), (voz, 0.40, 0.12), (horn, 0.30, 0.95), (norm_pico(fogos(0.0, 1)), 0.4, 0.95))
    o['tadaGrande'] = [(fechar_efeito(tg, 2.6, sai=0.3), ['FluidR3_GM', 'sintese', 'sintese-formantes'])]
    o['hum'] = [(caber(pedreiro_hum(k), 0.6 - FOLGA_MP3, 0.04), ['sintese-formantes']) for k in range(2)]
    o['coreto'] = [(fechar_efeito(caber(ler_render('coreto'), 2.9, 0.4), 3.0, alvo=-26.0, mol=0.08, sai=0.3), ['FluidR3_GM'])]
    col = norm_pico(caber(ler_render('colher'), 0.5, 0.15))
    col = mix((col, 1, 0), (norm_pico(brilhos(5, 0.16, 0.32, 3, 2600, 3600)), 0.18, 0))
    o['colher'] = [(fechar_efeito(col, 0.6, sai=0.12), ['FluidR3_GM', 'sintese'])]
    return o


def grilo(k):
    """Grilo de jardim (síntese nossa): cri-cri macio, portadora mais grave que a de um grilo de verdade."""
    f0, pulsos, grupos, esp = [(3300, 4, 3, 0.3), (3100, 3, 4, 0.25)][k]
    out = np.zeros(int((grupos * esp + 0.2) * SR))
    r = np.random.default_rng(1200 + k)
    for g in range(grupos):
        for p in range(pulsos):
            t0 = g * esp + p * 0.024
            n = int(0.014 * SR)
            tt = np.arange(n) / SR
            s = (np.sin(2 * np.pi * f0 * tt) + 0.12 * np.sin(2 * np.pi * 2 * f0 * tt)) * np.hanning(n) * (0.8 + 0.2 * r.random()) * (1 - 0.15 * (p == pulsos - 1))
            i = int(t0 * SR)
            out[i:i + n] += s
    return filtro(out, 'low', 5000, 2)


def ambiente():
    a = {}
    pa = ler(PARDAL2)
    a['pardal'] = [(finalizar(juntar([sec(pa, 0.08, 0.38), sec(pa, 0.7, 1.0)], 0.12)), [PARDAL2]),     # aprovado no esboço
                   (finalizar(fita(juntar([sec(pa, 0.7, 1.0), sec(pa, 0.08, 0.38), sec(pa, 0.7, 1.0)], 0.1), 1.03)), [PARDAL2]),
                   (finalizar(juntar([limpo(tr(PARDAL2, 3, maxdur=0.3), 600, 8000, False), limpo(tr(PARDAL2, 4, maxdur=0.3), 600, 8000, False)], 0.1)), [PARDAL2])]
    a['buzininha'] = [(finalizar(buzina_longe(466, 0.16, 0.26, 0.07), alvo=-31, mol=0.2, sala_dur=0.3), ['sintese']),   # aprovada no esboço
                      (finalizar(buzina_longe(415, 0.14, 0.22, 0.08), alvo=-31, mol=0.2, sala_dur=0.3), ['sintese'])]
    a['grilo'] = [(finalizar(grilo(k), 0.003, 0.05, mol=0.15, sala_dur=0.15), ['sintese']) for k in range(2)]
    return a


if __name__ == '__main__':
    sys.path.insert(0, '/s')
    os.makedirs(saida, exist_ok=True)
    arquivos, est = {}, {'criaturas': {}, 'moradores': {}, 'obra': {}, 'ambiente': {}}

    def guardar(cid, y, fontes, **extra):
        if not np.isfinite(y).all() or np.max(np.abs(y)) < 1e-6:
            raise RuntimeError('sinal vazio ' + cid)
        salvar(os.path.join(saida, cid + '.wav'), y)
        arquivos[cid] = dict(fontes=fontes, seg=round(len(y) / SR, 3), rmsAtivoDb=round(rms_ativo(y), 1), picoDb=round(20 * np.log10(np.abs(y).max()), 1), **extra)
        return cid

    def render(grupo, momento, k, fn):
        bb.USADOS.clear()
        y = fechar(fn(), momento)
        return guardar(f'{grupo}.{momento}.{k + 1}', y, sorted(bb.USADOS) or ['sintese'])

    for slot, b in BICHOS.items():
        e = {'nome': b['nome'], 'porte': b['porte'], 'baque': b['baque'], 'derrota': b['derrota'], 'momentos': {}}
        for m, fs in b['momentos'].items():
            e['momentos'][m] = [render(slot, m, k, f) for k, f in enumerate(fs)]
        if 'filhote' in b:
            fm = b['filhote'] if isinstance(b['filhote'], dict) else CR.filhote_de(b['momentos'], b['filhote'])
            e['filhote'] = {'nome': b['filhote_nome'], 'momentos': {m: [render(slot + '.filhote', m, k, f) for k, f in enumerate(fs)] for m, fs in fm.items()}}
        est['criaturas'][slot] = e
        print(slot, b['nome'], {m: len(v) for m, v in e['momentos'].items()}, 'filhote' if 'filhote' in e else '', flush=True)
    for sexo, chave, nome in (('F', 'feminino', 'moradora'), ('M', 'masculino', 'morador')):
        est['moradores'][chave] = {}
        for momento in MO.MOLDES:
            est['moradores'][chave][momento] = []
            for k in range(2):
                y, sil = morador_cidade(sexo, momento, k)
                est['moradores'][chave][momento].append(guardar(f'{nome}.{momento}.{k + 1}', y, ['sintese-formantes'], silabas=sil))
    for secao, sons in (('obra', obra()), ('ambiente', ambiente())):
        for nome, lst in sons.items():
            est[secao][nome] = [guardar(f'{secao}.{nome}.{k + 1}', y, f) for k, (y, f) in enumerate(lst)]
    json.dump(dict(tema=TEMA, estrutura=est, arquivos=arquivos), open(receitas_p, 'w'), ensure_ascii=False, indent=1)
    for k, v in arquivos.items():
        print(k, v['seg'], v['rmsAtivoDb'], v['picoDb'], v['fontes'])
