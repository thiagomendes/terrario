"""Monta vozes.json a partir das receitas, das medidas dos MP3 e dos metadados de licença.
Uso: python3 -I manifesto.py <pasta_vozes>"""
import sys, json, os
V = sys.argv[1]; T = V + '/trabalho'; S = os.path.dirname(os.path.abspath(__file__))
med = json.load(open(T + '/medidas.json'))
bichos = json.load(open(T + '/receitas_bichos.json'))
mor = json.load(open(T + '/receitas_moradores.json'))
morb = json.load(open(T + '/receitas_moradores_b.json'))
banco = json.load(open(T + '/receitas_banco.json'))
meta = json.load(open(V + '/baixados/commons/meta.json'))
bsb = json.load(open(S + '/fontes_bsb.json'))
SRD = 22050

usos = {}


def arq(cid, fontes):
    m = med[cid]
    for f in fontes: usos.setdefault(f, []).append(cid)
    return {'arquivo': f'mp3/{cid}.mp3', 'seconds': m['seg'], 'rmsDb': m['rmsDb'], 'picoDb': m['picoDb'], 'kb': round(m['bytes'] / 1024, 1), 'fontes': fontes}


def lista(cids, rec):
    return [arq(c, rec[c].get('fontes', ['sintese'])) for c in cids]


TEMAS = list(bichos['estrutura'])
saida = {'formato': 'MP3 mono 22 050 Hz, 48 kbps (CBR), sem metadados',
         'volume': 'RMS "enquanto soa" (janelas de 50 ms acima de -60 dBFS) igualado a -23 dB, medido no MP3 decodificado; pico sempre <= -1 dBFS; sem cortes',
         'momentos': 'chamado, susto, contente, ai (golpe de desenho), mais filhote (bichos criados e domados), baque (porte x material, comum) e derrota ("puf" fofo, comum)',
         'temas': {}, 'comum': {}, 'creditos': {}}
# banco comum
comum = {'baque': {}, 'derrota': {}}
for cid, r in banco.items():
    nome = cid.split('/', 1)[1]
    if r['tipo'] == 'baque': comum['baque'].setdefault(f"{r['material']}.{r['porte']}", []).append(arq(cid, ['sintese']))
    else: comum['derrota'].setdefault(nome.split('.')[1], []).append(arq(cid, ['sintese']))
saida['comum'] = comum
for tema in TEMAS:
    est = bichos['estrutura'][tema]; cr = []
    for slot in ('cervo', 'coelho', 'peixe', 'espectro', 'raposa'):
        e = est[slot]; rec = bichos['arquivos']
        c = {'slot': slot, 'nome': e['nome'], 'porte': e['porte'], 'momentos': {m: lista(v, rec) for m, v in e['momentos'].items()}}
        if 'filhote' in e: c['filhote'] = {'nome': e['filhote']['nome'], 'momentos': {m: lista(v, rec) for m, v in e['filhote']['momentos'].items()}}
        if 'extra' in e: c['extra'] = {n: {m: lista(v, rec) for m, v in mm.items()} for n, mm in e['extra'].items()}
        c['baque'] = {'material': e['baque'], 'porte': e['porte'], 'arquivos': [x['arquivo'] for x in comum['baque'][f"{e['baque']}.{e['porte']}"]]}
        c['derrota'] = {'tipo': e['derrota'], 'arquivos': [x['arquivo'] for x in comum['derrota'][e['derrota']]]}
        cr.append(c)
    mo = {}
    for chave, pref, rec in (('feminino', 'moradora', mor), ('masculino', 'morador', mor), ('feminino_b', 'moradora-b', morb['arquivos']), ('masculino_b', 'morador-b', morb['arquivos'])):
        d = {}
        for momento in ('cumprimento', 'contente', 'obrigado', 'surpresa'):
            cids = [f'{tema}/{pref}.{momento}.{k}' for k in (1, 2)]
            d[momento] = [dict(arq(c, rec[c].get('fontes', ['sintese-formantes']) if 'fontes' in rec[c] else ['sintese-formantes']),
                               **({'silabas': rec[c]['silabas']} if 'silabas' in rec[c] else {})) for c in cids]
        mo[chave] = d
    mo['sabor'] = mor[f'{tema}/moradora.cumprimento.1']['sabor']
    mo['nota'] = 'feminino/masculino = sintetizador de formantes nosso (A, principal). *_b = balbucio de bebê gravado (domínio público) afinado nas mesmas notas (B, para comparar).'
    ids = [k for k in med if k.startswith(tema + '/')]
    kb = sum(med[k]['bytes'] for k in ids) / 1024; sg = sum(med[k]['seg'] for k in ids)
    idsA = [k for k in ids if '-b.' not in k]
    kbA = sum(med[k]['bytes'] for k in idsA) / 1024; sgA = sum(med[k]['seg'] for k in idsA)
    saida['temas'][tema] = {'criaturas': cr, 'moradores': mo,
                            'totais': {'arquivos': len(ids), 'kb': round(kb, 1), 'segundos': round(sg, 1), 'decodificadoMB22k': round(sg * SRD * 4 / 1048576, 2),
                                       'semAlternativaB': {'arquivos': len(idsA), 'kb': round(kbA, 1), 'decodificadoMB22k': round(sgA * SRD * 4 / 1048576, 2)}}}
idc = [k for k in med if k.startswith('comum/')]
saida['totaisComum'] = {'arquivos': len(idc), 'kb': round(sum(med[k]['bytes'] for k in idc) / 1024, 1), 'decodificadoMB22k': round(sum(med[k]['seg'] for k in idc) * SRD * 4 / 1048576, 2)}
saida['totalGeral'] = {'arquivos': len(med), 'kb': round(sum(v['bytes'] for v in med.values()) / 1024, 1), 'segundos': round(sum(v['seg'] for v in med.values()), 1),
                       'decodificadoMB22k': round(sum(v['seg'] for v in med.values()) * SRD * 4 / 1048576, 2)}
# créditos
for f, cids in sorted(usos.items()):
    if f in bsb:
        saida['creditos'][f] = dict(bsb[f], usos=len(cids))
    elif f.startswith('commons/'):
        k = f.split('/')[1].rsplit('.', 1)[0]
        mm = meta.get(k)
        if mm is None:
            continue
        saida['creditos'][f] = {'titulo': mm['titulo'], 'autor': mm['autor'], 'acervo': 'Wikimedia Commons', 'pagina': mm['pagina'],
                                'licenca': mm['licenca'], 'codigoLicenca': mm['codigo'], 'conferido': 'API do Commons (extmetadata LicenseShortName/License) no download; só CC0/PD aceitos', 'usos': len(cids)}
    else:
        saida['creditos'][f] = {'titulo': 'síntese própria (numpy/scipy, scripts deste esboço)', 'licenca': 'nossa; sem material de terceiros', 'usos': len(cids)}
for f in [k for k in list(saida['creditos']) if k.startswith('commons/') and k.split('/')[1].startswith('c_')]:
    pass
json.dump(saida, open(V + '/vozes.json', 'w'), ensure_ascii=False, indent=1)
print('temas', len(saida['temas']), 'créditos', len(saida['creditos']), 'total', saida['totalGeral'])
for t, v in saida['temas'].items(): print(t, v['totais'])
print('comum', saida['totaisComum'])
