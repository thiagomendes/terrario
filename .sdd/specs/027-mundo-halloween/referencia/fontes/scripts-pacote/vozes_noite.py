"""Vozes, sons da festa e ambiente da Noite das Fantasias (spec 027, T21), tudo de síntese nossa (nenhuma gravação de fora).

Parte das receitas é a folha aprovada no esboço (../sons_noite.py: campainha, lanterna acendendo, risadinha da fantasminha, miado
do Tufinho, apito do trem, abóbora pulando e morceguinho), lida dos WAV que ela grava; o resto é feito aqui no mesmo jeito
(placas de metalofone, sininhos, voz de formantes, sopros filtrados), e os moradores falam o balbucio de brinquedo da 019
(019/scripts-vozes: lib.falar e moradores.py) com o sabor da festa. Nada assusta: nenhuma risada de bruxa, grito, trovão,
rangido ou órgão; tudo em escala maior, curto e macio.

Rodar tudo de novo: ver rodar.sh. Este passo (no contêiner som014:local, /s019 = 019/scripts-vozes, /s = esta pasta):
  python3 -I vozes_noite.py <aprovados_wav> <saida_wav> <receitas.json>
Régua: finalizar() da 019 (RMS "enquanto soa" -23 dB, pico -3 dBFS no WAV); o ambiente sai a -27 (vozes_codificar.py confere no MP3).

O que sai (o id de cada arquivo é <seção>.<chave>.<n>):
  bichos: cervo = abóbora saltitante, coelho = morceguinho, peixe = peixinho do laguinho, espectro = fantasminha,
          raposa = sapinho de chapeuzinho; cada um com chamado, susto, contente e "ai" (2 ou 3 versões).
  moradores: feminino e masculino (cumprimento, contente, obrigado, surpresa; 2 versões), sabor "festa".
  festa: campainha, lanterna, risadinha (a Lulu e a travessura), miau e ronrono (o Tufinho), abraco (o Bento), varinha,
         confete (a travessura), abobora (a abóbora gigante tocada), apito (o trem, parte 3). O coaxinho do sapinho é a
         voz dele (raposa: o "croc" do chamado e o "croc-croc" contente de quando ele é domado com a uva).
  ambiente: praca (os sininhos das bandeirolas), rua (a campainha e a risadinha ao longe), bosque (o grilo e a corujinha),
            horta (o regador e as abóboras).
"""
import sys, os, json, struct, zlib
sys.path.insert(0, '/s019')
import numpy as np
from lib import (SR, filtro, banda, pico_eq, fita, tom, bordas, sala, coro, finalizar, salvar, juntar, mix, osc, glide, adsr,
                 bolha, puf, falar, t_, rms_ativo)
import moradores as MO

apr_dir, saida, receitas_p = sys.argv[1:4]
TEMA = 'noite-das-fantasias'
rng = np.random.default_rng(2721)


def ler_aprovado(nome):
    b = open(os.path.join(apr_dir, nome + '.wav'), 'rb').read()
    i = 12
    while i < len(b):
        cid, n = b[i:i + 4], struct.unpack('<I', b[i + 4:i + 8])[0]
        if cid == b'data':
            x = np.frombuffer(b[i + 8:i + 8 + n], '<f4').astype(np.float64)
            return x / (np.max(np.abs(x)) + 1e-12)
        i += 8 + n + (n & 1)
    raise SystemExit(nome)


APR = {n: ler_aprovado(n) for n in ('campainha', 'lanterna-acende', 'risadinha-fantasminha', 'miado-tufinho', 'apito-trem',
                                    'abobora-pula', 'morceguinho')}


def S(v, dur, nota=0, gl=0, c=''):
    return dict(c=c, v=v, dur=dur, nota=nota, gl=gl)


def corte(x, a, b):
    return bordas(x[int(a * SR):int(b * SR)].copy(), 0.004, 0.03)


def placa(f0, dur, parciais=((1, 1.0, 0.35), (2.0, 0.2, 0.15), (3.0, 0.08, 0.06)), ataque=0.002):
    t = t_(dur)
    y = sum(a * np.sin(2 * np.pi * f0 * r * t) * np.exp(-t / tau) for r, a, tau in parciais)
    return y * np.minimum(1, t / ataque)


def por(saida_, x, t0, g=1.0):
    i = int(t0 * SR)
    n = min(len(x), len(saida_) - i)
    saida_[i:i + n] += g * x[:n]


NOTA = lambda m: 440.0 * 2 ** ((m - 69) / 12)

# ------------------------------------------------------------------ receitas novas (parte 1)


def coaxinho(k, alto=0.0, n=1, curto=1.0):
    """"Croc" redondo de sapinho de brinquedo: dois pulsinhos de voz em "ó" com a rouquidão macia do "cr" (modulação de 55 Hz)."""
    partes = []
    for j in range(n):
        base = 230 * 2 ** ((alto + (1.5 if j % 2 else 0) + (k % 3) * 0.7) / 12)
        y = falar([S('ó', 0.06 * curto, 0, -1, 'g'), S('o', 0.1 * curto, -2, -3)], f_base=base, escala=0.92, sopro=0.05, vib=(6, 0.1))
        tt = np.arange(len(y)) / SR
        y = y * (0.72 + 0.28 * np.sin(2 * np.pi * 55 * tt))
        y = y + 0.5 * filtro(y, 'low', 420)
        partes.append(y)
    return banda(juntar(partes, 0.07), 120, 3600)


def ronrono(k, dur=1.5):
    """Ronrono de gatinho: sopro grave pulsando a ~25 Hz (inspira e expira), macio, com uma voz bem baixinha por baixo."""
    t = t_(dur)
    taxa = 24.5 + 1.5 * k
    pulso = np.maximum(0, np.sin(2 * np.pi * taxa * t)) ** 3
    resp = 0.55 + 0.45 * np.sin(np.pi * np.clip(t / (dur / 2), 0, 2)) ** 2
    ru = banda(rng.standard_normal(len(t)), 70, 700)
    y = ru * pulso * resp
    y += 0.35 * banda(osc(np.full(len(t), taxa * 4)), 60, 400) * pulso * resp
    y = filtro(y, 'low', 900, 4)
    return y * adsr(len(t), 0.12, 0.3)


def abraco(k):
    """O abraço do Bento: o "fuf" macio de pelúcia se encostando, o "hum-hum" contente de boca fechada e dois sininhos subindo
    (Dó e Mi, a terça maior), bem baixinhos."""
    y = np.zeros(int(1.3 * SR))
    pf = puf(0.22, 120, 1200)
    por(y, pf, 0.0, 0.7)
    hum = falar([S('u', 0.16, 0, 1, 'm'), S('u', 0.26, 4 + k, -1, 'm')], f_base=250 + 30 * k, escala=1.1, sopro=0.06, nasal=0.6, vib=(5, 0.2))
    hum = filtro(hum, 'low', 2200)
    por(y, hum, 0.12, 0.9)
    for i, m in enumerate((84, 88) if k == 0 else (86, 90)):
        por(y, placa(NOTA(m), 0.7), 0.42 + i * 0.16, 0.16)
    return y


def varinha(k):
    """A varinha de condão: as estrelinhas subindo (seis sininhos em Ré maior, um a cada 45 ms), o brilho fininho por cima e o
    "plim" da florzinha nascendo no fim."""
    notas = (86, 90, 93, 98, 102, 105) if k == 0 else (88, 91, 95, 100, 103, 107)
    y = np.zeros(int(1.35 * SR))
    for i, m in enumerate(notas):
        por(y, placa(NOTA(m), 0.5), 0.02 + i * 0.045, 0.5 - 0.03 * i)
    t = t_(0.45)
    f = 3000 + 2500 * t / 0.45
    cint = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.45) ** 2 * (0.6 + 0.4 * np.sin(2 * np.pi * 27 * t))
    por(y, cint, 0.05, 0.05)
    por(y, placa(NOTA(93 if k == 0 else 95), 0.8, ((1, 1, 0.3), (2, 0.25, 0.12), (4.1, 0.06, 0.04))), 0.38, 0.75)
    por(y, placa(NOTA(81 if k == 0 else 83), 0.6), 0.38, 0.25)
    return filtro(y, 'low', 9000)


def confete(k):
    """O confete da travessura: o "pof" macio do canudinho de festa (nada de estouro) e as folhinhas caindo, tic-tic de papel."""
    y = np.zeros(int(1.2 * SR))
    pf = puf(0.16, 200, 2200 + 300 * k)
    por(y, pf, 0.0, 1.0)
    r = np.random.default_rng(90 + k)
    for i in range(26):
        t0 = 0.08 + r.uniform(0, 0.9) ** 1.4
        n = int(0.012 * SR)
        tic = banda(r.standard_normal(n), 2500, 7000) * np.exp(-np.arange(n) / (0.003 * SR))
        por(y, tic, t0, 0.18 * (1 - t0 / 1.2))
    for i, m in enumerate((93, 97, 100)):
        por(y, placa(NOTA(m + 2 * k), 0.4), 0.12 + 0.07 * i, 0.12)
    return y


def sininhos(k):
    """O vento nas bandeirolas da praça: quatro a seis sininhos soltos, em Ré maior pentatônica, bem longe."""
    r = np.random.default_rng(300 + k)
    escala = (86, 88, 90, 93, 95, 98)
    y = np.zeros(int(2.0 * SR))
    for i in range(4 + k % 3):
        por(y, placa(NOTA(escala[r.integers(len(escala))]), 0.9), 0.05 + i * r.uniform(0.18, 0.3), 0.3 + 0.2 * r.random())
    return sala(filtro(y, 'low', 6000), 0.4, 0.25)


def grilo(k):
    """O grilinho do bosque: três trinados curtos a 4,4 kHz (cada um com quatro pulsinhos)."""
    y = np.zeros(int(1.1 * SR))
    f = 4300 + 150 * k
    for j in range(3):
        for p in range(4):
            n = int(0.012 * SR)
            tt = np.arange(n) / SR
            por(y, np.sin(2 * np.pi * f * tt) * np.sin(np.pi * tt / (n / SR)) ** 2, 0.02 + j * 0.3 + p * 0.022, 1.0)
    return y


def corujinha(k):
    """A corujinha do poleiro: "hu-huu" macio e redondo (voz de formantes em "u", soprada), subindo um tiquinho no fim."""
    y = falar([S('u', 0.14, 0, 0, 'b'), S('u', 0.05, 0, 0), S('u', 0.32, 2 + k, -1, 'b')], f_base=380 + 25 * k, escala=0.95, sopro=0.2,
              vib=(4.5, 0.15))
    return filtro(y, 'low', 1800)


def regador(k):
    """O regador da horta: o chuvisco macio das gotinhas no canteiro (ruído filtrado com gotinhas)."""
    dur = 1.4
    t = t_(dur)
    y = banda(rng.standard_normal(len(t)), 1500, 6500) * 0.25 * np.sin(np.pi * t / dur) ** 0.6
    r = np.random.default_rng(700 + k)
    for i in range(18):
        por(y, bolha(r.uniform(1400, 2600), None, 0.03), r.uniform(0.05, dur - 0.1), 0.25)
    return y


# ------------------------------------------------------------------ os bichos
def bichos():
    pula, morc, risa = APR['abobora-pula'], APR['morceguinho'], APR['risadinha-fantasminha']
    pio = lambda a, b, d: osc(glide(d, [(0, a), (0.5, b), (1, a * 0.95)])) * np.sin(np.pi * np.linspace(0, 1, int(d * SR))) ** 2
    fantasma_uu = lambda k: coro(falar([S('u', 0.22, 0, 1), S('u', 0.36, 4 + k, -1)], f_base=430 + 20 * k, escala=1.25, sopro=0.1,
                                       vib=(5.2, 0.35)), 8, 0.012, 0.3)
    return {
        'cervo': dict(nome='Abóbora saltitante', porte='medio', baque='gelatina', derrota='puf_medio', momentos={
            'chamado': [pula, fita(pula, 0.92), fita(pula, 1.08)],
            'susto': [fita(corte(pula, 0, 0.3), 1.3), fita(corte(pula, 0, 0.3), 1.42)],
            'contente': [juntar([fita(corte(pula, 0, 0.3), 1.1), fita(pula, 1.2)], 0.02), juntar([fita(corte(pula, 0, 0.3), 1.0), fita(pula, 1.12)], 0.03)],
            'ai': [mix((puf(0.12, 200, 1500), 0.6, 0), (fita(corte(pula, 0, 0.18), 1.5), 0.8, 0)),
                   mix((puf(0.1, 220, 1700), 0.6, 0), (fita(corte(pula, 0, 0.16), 1.62), 0.8, 0))]}),
        'coelho': dict(nome='Morceguinho', porte='pequeno', baque='pano', derrota='puf_pequeno', momentos={
            'chamado': [morc, fita(morc, 1.06), fita(morc, 0.95)],
            'susto': [pio(2300, 2900, 0.08), pio(2450, 3100, 0.07)],
            'contente': [juntar([corte(morc, 0, 0.3), pio(2300, 2700, 0.07), pio(2500, 2900, 0.07)], 0.03),
                         juntar([pio(2200, 2600, 0.07), pio(2400, 2900, 0.07), corte(morc, 0, 0.25)], 0.03)],
            'ai': [pio(2600, 2000, 0.07), pio(2700, 2100, 0.06)]}),
        'peixe': dict(nome='Peixinho do laguinho', porte='pequeno', baque='agua', derrota='plop', momentos={
            'chamado': [juntar([bolha(420 + 60 * k + 80 * i, None, 0.07) for i in range(3)], 0.05) for k in range(3)],
            'susto': [bolha(1150 - 80 * k, 560, 0.06) for k in range(2)],
            'contente': [juntar([bolha(600 + 50 * k, None, 0.06), bolha(760 + 50 * k, None, 0.06), bolha(980 + 50 * k, None, 0.08)], 0.04)
                         for k in range(2)],
            'ai': [bolha(360 + 40 * k, 300, 0.07) for k in range(2)]}),
        'espectro': dict(nome='Fantasminha', porte='medio', baque='pano', derrota='puf_medio', momentos={
            'chamado': [fantasma_uu(0), fantasma_uu(1)],
            'susto': [falar([S('i', 0.12, 7 + k, 3)], f_base=520, escala=1.3, sopro=0.08, vib=(6, 0.1)) for k in range(2)],
            'contente': [risa, fita(risa, 1.06)],
            'ai': [falar([S('u', 0.06, 0, 0), S('i', 0.11, 4 + k, -2)], f_base=480, escala=1.28, sopro=0.08) for k in range(2)]}),
        'raposa': dict(nome='Sapinho de chapeuzinho', porte='pequeno', baque='gelatina', derrota='puf_pequeno', momentos={
            'chamado': [coaxinho(k) for k in range(3)],
            'susto': [coaxinho(k, alto=6, curto=0.6) for k in range(2)],
            'contente': [coaxinho(k, alto=2, n=2, curto=0.8) for k in range(2)],
            'ai': [coaxinho(k, alto=4, curto=0.5) for k in range(2)]}),
    }


# ------------------------------------------------------------------ os moradores (o balbucio da 019 com o sabor da festa)
MO.TEMAS[TEMA] = dict(cons=['', 'l', 'b', 'd', 'm', 'n'], vog=['a', 'i', 'o', 'e', 'u'], sabor='festa',
                      F=dict(f_base=355, escala=1.22, sopro=0.07), M=dict(f_base=214, escala=1.06, sopro=0.06))


def morador_festa(sexo, momento, k):
    """Como moradores.morador, com o sabor da festa: o cumprimento cantado subindo no fim, como quem chama para brincar."""
    cfg = MO.TEMAS[TEMA]
    p = dict(cfg[sexo])
    molde = MO.MOLDES[momento][k]
    for tentativa in range(60):
        r = np.random.default_rng(zlib.crc32(f'{TEMA}{sexo}{momento}{k}{tentativa or ""}'.encode()))
        sil = MO.sorteia(cfg['cons'], cfg['vog'], len(molde), r)
        txt = ''.join(c + v for c, v in sil)
        if not any(w in txt for w in MO.PROIBIDAS + ['medo', 'mau', 'mal', 'bu', 'boo', 'lobo', 'lua', 'noite', 'dodo', 'dona', 'dono', 'nada']
                   if len(w) >= 2):
            break
    if momento == 'obrigado':
        sil = [(c, v if j < 2 else ('a' if v in 'iu' else v)) for j, (c, v) in enumerate(sil)]
    ss = [dict(c=c, v=v, dur=dur, nota=nota, gl=gl) for (c, v), (dur, nota, gl) in zip(sil, molde)]
    if momento == 'cumprimento':
        ss[-1]['gl'] += 2
    vib = (5.6, 0.22) if momento != 'obrigado' else (5.8, 0.42)
    y = falar(ss, f_base=p['f_base'], escala=p['escala'], sopro=p['sopro'], vib=vib, legato=0.03)
    y = coro(y, cents=7, atraso=0.011, m_=0.28)
    y = banda(y, 120 if sexo == 'F' else 90, 7000)
    return y, [s['c'] + s['v'] for s in ss]


# ------------------------------------------------------------------ fecha e grava
FIM = {'chamado': (0.006, 0.08), 'susto': (0.003, 0.06), 'contente': (0.03, 0.12), 'ai': (0.003, 0.05)}


def agudo(x):
    sp = np.abs(np.fft.rfft(x)) ** 2
    fr = np.fft.rfftfreq(len(x), 1 / SR)
    return float(sp[fr > 4000].sum() / (sp.sum() + 1e-12))


def fechar(x, momento='chamado', alvo=-23.0, mol=0.10, macio=True):
    """O fechar da 019: brilho acima de 4 kHz no máximo 20% (nada estridente para criança pequena), régua de RMS."""
    ent, sai = FIM.get(momento, FIM['chamado'])
    if momento in ('ai', 'susto'):
        x = filtro(x, 'low', 6500)
    for _ in range(3):
        if not macio or agudo(x) <= 0.2:
            break
        x = pico_eq(x, 6000, -6, 0.7)
        x = filtro(x, 'low', 6000)
    return finalizar(x, ent, sai, mol=mol, sala_dur=0.12, alvo=alvo)


os.makedirs(saida, exist_ok=True)
arquivos, est = {}, {'criaturas': {}, 'moradores': {}, 'festa': {}, 'ambiente': {}}


def gravar(cid, x, fontes, alvo=-23.0, momento='chamado', macio=True, extra=None):
    y = fechar(x, momento, alvo, macio=macio)
    salvar(os.path.join(saida, cid + '.wav'), y)
    arquivos[cid] = dict(fontes=fontes, seg=round(len(y) / SR, 3), rmsWav=round(float(rms_ativo(y)), 2), **(extra or {}))
    return cid


for slot, b in bichos().items():
    e = dict(nome=b['nome'], porte=b['porte'], baque=b['baque'], derrota=b['derrota'], momentos={})
    for m, lista in b['momentos'].items():
        e['momentos'][m] = [gravar(f'bicho.{slot}.{m}.{k}', x, ['sintese'], momento=m) for k, x in enumerate(lista)]
    est['criaturas'][slot] = e
for gen, sx in (('feminino', 'F'), ('masculino', 'M')):
    est['moradores'][gen] = {}
    for m in ('cumprimento', 'contente', 'obrigado', 'surpresa'):
        ids = []
        for k in range(2):
            y, sil = morador_festa(sx, m, k)
            ids.append(gravar(f'morador.{gen}.{m}.{k}', y, ['sintese-formantes'], momento='contente', extra={'silabas': sil}))
        est['moradores'][gen][m] = ids

camp, lant, risa, miau, apito, pula = (APR[n] for n in ('campainha', 'lanterna-acende', 'risadinha-fantasminha', 'miado-tufinho',
                                                        'apito-trem', 'abobora-pula'))
FESTA = {
    # (as campainhas de cada casinha em dois tons: a mesma "dim-dom" e uma terça acima)
    'campainha': [camp, fita(camp, 2 ** (4 / 12))],
    'lanterna': [lant, fita(lant, 2 ** (2 / 12))],
    'risadinha': [risa, fita(risa, 1.06), fita(risa, 0.96)],
    'miau': [miau, fita(miau, 1.08), fita(miau, 0.94)],
    'ronrono': [ronrono(0), ronrono(1)],
    'abraco': [abraco(0), abraco(1)],
    'varinha': [varinha(0), varinha(1)],
    'confete': [confete(0), confete(1)],
    'abobora': [fita(pula, 0.78), fita(pula, 0.84)],
    'apito': [apito],
}
for chave, lista in FESTA.items():
    # (os sons aprovados não passam pelo amaciador: o dono aprovou como estão)
    est['festa'][chave] = [gravar(f'festa.{chave}.{k}', x, ['sintese'], macio=chave not in ('campainha', 'lanterna', 'apito'))
                           for k, x in enumerate(lista)]
AMBIENTE = {
    'sininhos': [sininhos(k) for k in range(3)],
    'campainhaLonge': [sala(filtro(camp, 'low', 1800), 0.5, 0.35), sala(filtro(fita(camp, 2 ** (4 / 12)), 'low', 1800), 0.5, 0.35)],
    'risadinhaLonge': [sala(filtro(risa, 'low', 2200), 0.5, 0.35), sala(filtro(fita(risa, 1.06), 'low', 2200), 0.5, 0.35)],
    'grilo': [grilo(0), grilo(1)],
    'corujinha': [corujinha(0), corujinha(1)],
    'regador': [regador(0), regador(1)],
    'abobora': [filtro(fita(pula, 0.9), 'low', 2000), filtro(fita(pula, 0.96), 'low', 2000)],
}
for chave, lista in AMBIENTE.items():
    est['ambiente'][chave] = [gravar(f'ambiente.{chave}.{k}', x, ['sintese'], alvo=-27.0, macio=chave != 'grilo') for k, x in enumerate(lista)]

json.dump(dict(estrutura=est, arquivos=arquivos), open(receitas_p, 'w'), ensure_ascii=False, indent=1)
print('arquivos', len(arquivos), 'segundos', round(sum(a['seg'] for a in arquivos.values()), 1))
