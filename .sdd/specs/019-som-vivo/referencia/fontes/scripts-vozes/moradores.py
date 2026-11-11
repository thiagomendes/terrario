"""Moradores dos 7 povoados: balbucio de brinquedo (sem palavras de verdade) com o nosso sintetizador de formantes (lib.falar).
Uso: python3 -I moradores.py  -> /t/wav/<tema>/morador(a).<momento>.<n>.wav e /t/receitas_moradores.json"""
import sys, json, zlib; sys.path.insert(0, '/s')
from lib import *

PENTA = [0, 2, 4, 7, 9, 12, 14, 16]
PROIBIDAS = ['cu', 'pu', 'bunda', 'caca', 'coco', 'cocô', 'pipi', 'xixi', 'teta', 'pica', 'pau', 'rola', 'mama', 'papa', 'babaca', 'boba', 'bobo', 'feio', 'feia',
             'tetê', 'pinto', 'peido', 'puta', 'merda', 'bosta', 'porra', 'gay', 'nana', 'nenê', 'tchau', 'oi', 'olá', 'não', 'sim', 'mãe', 'pai', 'bebe', 'bebé', 'dodói', 'ai', 'benito', 'bonito', 'tonico', 'dedo', 'dado', 'bala', 'bola', 'lula', 'nada', 'nado', 'bebo', 'beba', 'lado', 'lata', 'pato', 'pata', 'bota', 'tatu', 'pena', 'bulo', 'bolo', 'mula', 'lama', 'medo', 'dedé', 'dodo', 'bebê', 'nenen', 'pepe', 'tete', 'mimi', 'lili', 'lele', 'nunu', 'rato', 'rata', 'mole', 'pelo', 'pele', 'pote', 'tapa', 'topa', 'gogo', 'bugo', 'gula', 'mudo', 'muda', 'leite', 'pipa', 'tuba', 'ruim', 'bobão']

TEMAS = {
 # sabor: consoantes e vogais preferidas, e ajustes do sintetizador
 'rancho-alegre': dict(cons=['', 'b', 'd', 'l', 'r', 'n', 'm'], vog=['ô', 'a', 'i', 'ó', 'e'], sabor='caipira',
                       F=dict(f_base=330, escala=1.2, sopro=0.08, nasal=0.18), M=dict(f_base=200, escala=1.04, sopro=0.06, nasal=0.2)),
 'exploracao-lunar': dict(cons=['', 'b', 'd', 'p', 't', 'n', 'l'], vog=['i', 'o', 'e', 'a', 'u'], sabor='robo',
                          F=dict(f_base=350, escala=1.18, sopro=0.05), M=dict(f_base=215, escala=1.05, sopro=0.04)),
 'doce-reino': dict(cons=['', 'l', 'm', 'n', 'b', 'nh'], vog=['a', 'i', 'u', 'é', 'o'], sabor='cantado',
                    F=dict(f_base=370, escala=1.28, sopro=0.07), M=dict(f_base=230, escala=1.1, sopro=0.06)),
 'era-dos-dinos': dict(cons=['', 'b', 'g', 'd', 'm', 'r'], vog=['u', 'o', 'a', 'ó'], sabor='pulado',
                       F=dict(f_base=300, escala=1.1, sopro=0.08), M=dict(f_base=180, escala=0.98, sopro=0.07)),
 'mata-encantada': dict(cons=['', 'l', 'b', 't', 'nh', 'r'], vog=['i', 'u', 'a', 'e'], sabor='passarinho',
                        F=dict(f_base=345, escala=1.2, sopro=0.15), M=dict(f_base=210, escala=1.05, sopro=0.12)),
 'planeta-vivo': dict(cons=['', 'bl', 'b', 'l', 'm', 'g'], vog=['u', 'o', 'ó', 'i', 'a'], sabor='gelatina',
                      F=dict(f_base=340, escala=1.16, sopro=0.07), M=dict(f_base=205, escala=1.03, sopro=0.06)),
 'bruma-e-luz': dict(cons=['', 'l', 'm', 'n', 'b', 'd'], vog=['a', 'e', 'o', 'u', 'i'], sabor='nevoa',
                     F=dict(f_base=335, escala=1.17, sopro=0.14), M=dict(f_base=200, escala=1.03, sopro=0.11)),
}

# moldes: (duração, nota, glissando); a sílaba é sorteada pelo sabor
MOLDES = {
 'cumprimento': [[(.12, 0, 2), (.09, 4, 0), (.2, 7, -3)], [(.08, 2, 0), (.08, 5, 0), (.09, 9, 0), (.19, 4, -2)]],
 'contente': [[(.07, 5, 0), (.07, 9, 0), (.07, 5, 0), (.07, 10, 0), (.17, 12, -2)], [(.08, 7, 0), (.07, 4, 0), (.07, 9, 0), (.07, 5, 0), (.18, 12, 2)]],
 'obrigado': [[(.15, 7, 0), (.15, 4, 0), (.38, 0, 0)], [(.14, 4, 0), (.14, 7, 0), (.38, 12, 0)]],
 'surpresa': [[(.09, 0, 0), (.28, 3, 9)], [(.08, 2, 0), (.07, 0, 0), (.26, 5, 8)]],
}


def sorteia(cons, vog, n, r):
    for _ in range(200):
        s = [(cons[r.integers(len(cons))], vog[r.integers(len(vog))]) for _ in range(n)]
        txt = ''.join(c + v for c, v in s).replace('ô', 'o')
        pares = [s[i][0] + s[i][1] for i in range(n)]
        if any(p in txt for p in PROIBIDAS if len(p) > 3) or any(txt[i:i+4] in PROIBIDAS for i in range(len(txt))) or any(p in PROIBIDAS for p in pares) or len(set(pares)) < max(2, n - 2):
            continue
        return s
    return s


def carrier_robo(f0):
    g = glote(f0, sopro=0.03, jitter=0.0015)
    sq = osc(f0, 'square') * 0.18
    return g + np.diff(sq, prepend=0) * 8


def morador(tema, sexo, momento, k):
    cfg = TEMAS[tema]; p = dict(cfg[sexo]); sabor = cfg['sabor']
    r = np.random.default_rng(zlib.crc32(f'{tema}{sexo}{momento}{k}'.encode()))
    molde = MOLDES[momento][k]
    sil = sorteia(cfg['cons'], cfg['vog'], len(molde), r)
    if momento == 'obrigado':  # vogais abertas, cantáveis
        sil = [(c, {'i': 'i', 'u': 'u'}.get(v, v) if j < 2 else ('a' if v in 'iu' else v)) for j, (c, v) in enumerate(sil)]
    ss = []
    for (c, v), (dur, nota, gl) in zip(sil, molde):
        if v == 'ô': v = 'o'
        ss.append(dict(c=c, v=v, dur=dur, nota=nota, gl=gl))
    kw = dict(f_base=p['f_base'], escala=p['escala'], sopro=p['sopro'], nasal=p.get('nasal', 0))
    vib = (5.5, 0.22); legato = 0.03; degraus = False; f3 = None; carrier = None
    if momento == 'obrigado': vib = (5.8, 0.45)
    if sabor == 'caipira':
        f3 = 1900 * p['escala']
        for s in ss:
            if s['c'] == 'r' or r.random() < 0.3: s['caipira'] = True
        ult = ss[-1]
        if momento != 'obrigado':  # o "sotaque": a última sobe e cai, puxada
            ult['gl'] = ult['gl'] + 2; ss.append(dict(c='', v=ult['v'], dur=0.09, nota=ult['nota'] - 2, gl=-2))
    elif sabor == 'robo':
        degraus = momento != 'obrigado'; carrier = carrier_robo; vib = (7, 0.12)
    elif sabor == 'cantado':
        for s in ss:
            s['nota'] = min(PENTA, key=lambda q: abs(q - s['nota'])); s['dur'] *= 1.22
        vib = (6.2, 0.5); legato = 0.05
    elif sabor == 'pulado':
        for s in ss: s['dur'] *= 0.9
        vib = (5, 0.2)
    elif sabor == 'passarinho':
        ss[-1]['gl'] += 4 if momento != 'obrigado' else 0; vib = (6.5, 0.3)
    elif sabor == 'gelatina':
        vib = (8.5, 0.75)
    elif sabor == 'nevoa':
        legato = 0.05; vib = (5, 0.28)
        for s in ss: s['dur'] *= 1.1
    y = falar(ss, vib=vib, legato=legato, degraus=degraus, f3_r=f3, carrier=carrier, **kw)
    if sabor == 'pulado':  # quiquezinho: pequenas pausas entre sílabas
        pass
    # timbre: coro leve sempre; efeitos por sabor
    if sabor == 'robo':
        t = np.arange(len(y)) / SR; y = y * (1 + 0.12 * np.sin(2 * np.pi * 32 * t))
        y = coro(y, cents=6, atraso=0.008, m_=0.3)
        y = mix((y, 1, 0), (bip(2093 if k == 0 else 2349, 0.06, 'sine', lp=8000) * 0.10 * np.max(np.abs(y)), 1, len(y) / SR - 0.02))
        mol, sd = 0.12, 0.14
    elif sabor == 'nevoa':
        y = coro(y, cents=11, atraso=0.016, m_=0.45); mol, sd = 0.22, 0.25
    elif sabor == 'gelatina':
        y = coro(y, cents=12, atraso=0.01, m_=0.35); mol, sd = 0.14, 0.14
    else:
        y = coro(y, cents=8, atraso=0.012, m_=0.3); mol, sd = 0.12, 0.12
    y = banda(y, 120 if sexo == 'F' else 90, 7000)
    y = finalizar(y, 0.004, 0.07, mol=mol, sala_dur=sd)
    return y, {'silabas': [s['c'] + s['v'] for s in ss], 'notas': [round(s['nota'], 1) for s in ss], 'baseHz': p['f_base'], 'sabor': sabor}


if __name__ == '__main__':
    rec = {}
    so = sys.argv[1:] or list(TEMAS)
    for tema in so:
        for sexo, nome in (('F', 'moradora'), ('M', 'morador')):
            for momento in MOLDES:
                for k in range(2):
                    y, info = morador(tema, sexo, momento, k)
                    cid = f'{tema}/{nome}.{momento}.{k + 1}'
                    salvar(f'/t/wav/{cid}.wav', y)
                    info.update(fonte='sintese-formantes', seg=round(len(y) / SR, 3), rmsAtivoDb=round(rms_ativo(y), 1), picoDb=round(20 * np.log10(np.abs(y).max()), 1))
                    rec[cid] = info
                    print(cid, info['silabas'], info['seg'], info['rmsAtivoDb'], info['picoDb'])
    old = {}
    try: old = json.load(open('/t/receitas_moradores.json'))
    except Exception: pass
    old.update(rec); json.dump(old, open('/t/receitas_moradores.json', 'w'), ensure_ascii=False, indent=1)
