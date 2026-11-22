"""Emenda o pacote de vozes da Noite das Fantasias e monta a entrada dela no índice de sons (spec 027, T21). Só biblioteca padrão.
Rodar tudo de novo: ver rodar.sh. Este passo:  python3 -I empacotar.py <trabalho> <indice.json> <medidas-pacote.json>
<trabalho>: final/musica_tema.json + final/noite-das-fantasias-musica.mp3 (musica_finalizar.py) e vozes/{receitas.json, medidas.json,
mp3/} (vozes_noite.py e vozes_codificar.py). <indice.json>: o public/sons/indice.json de agora (só lido).
Escreve, no <trabalho>/final:
  - noite-das-fantasias-vozes.mp3 (o pacote emendado);
  - indice-novo.json, o índice inteiro com o tema novo (compacto, numa linha, como o do jogo), para conferir;
  - trechos.json, o que muda no índice: a entrada temas['noite-das-fantasias'] (música, vozes, festa e o ambiente de cada lugar,
    na seção "lugar"), os dois pacotes
    em tamanhos, o tema no fim de ordem, os usos de "sintese" e "sintese-formantes" em creditos e o totalGeralVozes.
Este script não mexe no repositório: o indice-novo.json é o arquivo gerado que o rodar.sh copia por cima do
public/sons/indice.json (como os pacotes MP3), e antes de gravar ele confere que os cinco temas de antes, o comum e as regras da
música e das vozes são os mesmos, byte a byte (o hash `sons` dos cinco não muda). E grava a medidas-pacote.json, com as medidas da
música e das vozes.
"""
import sys, os, json

trab, idx_p, medp = sys.argv[1:4]
TEMA = 'noite-das-fantasias'
SRD = 22050
texto = open(idx_p, encoding='utf-8').read()
ind = json.loads(texto)
assert json.dumps(ind, ensure_ascii=False, separators=(',', ':')) == texto, 'o índice não está no formato compacto esperado'


def clips_de(no):
    """Todos os clipes {o, s, f} debaixo de um pedaço do índice."""
    if isinstance(no, dict):
        if 'o' in no and 's' in no:
            yield no
        else:
            for v in no.values():
                yield from clips_de(v)
    elif isinstance(no, list):
        for v in no:
            yield from clips_de(v)


# ---------------------------------------------------------------- desfaz uma rodada anterior (pode rodar de novo)
if TEMA in ind['temas']:
    velho = ind['temas'][TEMA]
    for c in clips_de({k: velho[k] for k in ('vozes', 'festa', 'lugar', 'ambiente') if k in velho}):
        for f in c.get('f', []):
            ind['creditos'][f]['usos'] -= 1
    t = velho['vozes']['totais']
    g0 = ind['totalGeralVozes']
    g0['arquivos'] -= t['arquivos']; g0['kb'] = round(g0['kb'] - t['kb'], 1); g0['segundos'] = round(g0['segundos'] - t['segundos'], 1)
    if g0['segundos'] == int(g0['segundos']):
        g0['segundos'] = int(g0['segundos'])
    g0['decodificadoMB22k'] = round(g0['segundos'] * SRD * 4 / 1048576, 2)
    del ind['temas'][TEMA]
    ind['ordem'] = [x for x in ind['ordem'] if x != TEMA]
    for k in (f'{TEMA}-musica.mp3', f'{TEMA}-vozes.mp3'):
        ind['tamanhos'].pop(k, None)
    texto = json.dumps(ind, ensure_ascii=False, separators=(',', ':'))
assert TEMA not in ind['temas'] and TEMA not in ind['ordem']
mus = json.load(open(os.path.join(trab, 'final/musica_tema.json'), encoding='utf-8'))
rec = json.load(open(os.path.join(trab, 'vozes/receitas.json'), encoding='utf-8'))
med = json.load(open(os.path.join(trab, 'vozes/medidas.json'), encoding='utf-8'))

buf = bytearray()
usos = {}
seg_tot, n_tot = 0.0, 0
por_secao = {}


def ent(cid, secao):
    global seg_tot, n_tot
    b = open(os.path.join(trab, 'vozes/mp3', cid + '.mp3'), 'rb').read()
    assert b[0] == 0xFF and (b[1] & 0xE0) == 0xE0, cid
    o = [len(buf), len(b)]
    buf.extend(b)
    m = med[cid]
    f = rec['arquivos'][cid]['fontes']
    for x in f:
        usos[x] = usos.get(x, 0) + 1
    seg_tot += m['seg']; n_tot += 1
    ps = por_secao.setdefault(secao, dict(arquivos=0, bytes=0, segundos=0.0))
    ps['arquivos'] += 1; ps['bytes'] += len(b); ps['segundos'] += m['seg']
    return {'o': o, 's': m['seg'], 'f': f}


est = rec['estrutura']
criaturas = []
for slot in ('cervo', 'coelho', 'peixe', 'espectro', 'raposa'):
    e = est['criaturas'][slot]
    c = {'slot': slot, 'nome': e['nome'], 'porte': e['porte'],
         'momentos': {m: [ent(x, 'bichos') for x in e['momentos'][m]] for m in ('chamado', 'susto', 'contente', 'ai')},
         'baque': f"{e['baque']}.{e['porte']}", 'derrota': e['derrota']}
    assert c['baque'] in ind['comum']['baque'] and c['derrota'] in ind['comum']['derrota'], (slot, c['baque'], c['derrota'])
    criaturas.append(c)
moradores = {gen: {m: [ent(x, 'moradores') for x in est['moradores'][gen][m]] for m in ('cumprimento', 'contente', 'obrigado', 'surpresa')}
             for gen in ('feminino', 'masculino')}
moradores['sabor'] = 'festa'
moradores['nota'] = ('feminino/masculino = sintetizador de formantes nosso (o mesmo da 019) com o sabor da festa: o cumprimento cantado subindo no '
                     'fim. Sem o conjunto B gravado.')
festa = {k: [ent(x, 'festa') for x in v] for k, v in est['festa'].items()}
ambiente = {k: [ent(x, 'ambiente') for x in v] for k, v in est['ambiente'].items()}
kb_tot = round(len(buf) / 1024, 1)
totais = {'arquivos': n_tot, 'kb': kb_tot, 'segundos': round(seg_tot, 1), 'decodificadoMB22k': round(seg_tot * SRD * 4 / 1048576, 2),
          'porSecao': {k: {'arquivos': v['arquivos'], 'kb': round(v['bytes'] / 1024, 1), 'segundos': round(v['segundos'], 1),
                           'decodificadoMB22k': round(v['segundos'] * SRD * 4 / 1048576, 2)} for k, v in por_secao.items()}}

tema = dict(mus['tema'])
tema['vozes'] = {'criaturas': criaturas, 'moradores': moradores, 'totais': totais}
tema['festa'] = festa
# (a seção "lugar": o ambiente de cada lugar da festa; "ambiente" é a seção dos sons da rua da Cidade Grande)
tema['lugar'] = ambiente
musica_mp3 = os.path.join(trab, 'final', f'{TEMA}-musica.mp3')
assert os.path.getsize(musica_mp3) == mus['bytesPacote']

novo = json.loads(texto)
novo['temas'][TEMA] = tema
novo['ordem'].append(TEMA)
novo['tamanhos'][f'{TEMA}-musica.mp3'] = os.path.getsize(musica_mp3)
novo['tamanhos'][f'{TEMA}-vozes.mp3'] = len(buf)
for f, n in usos.items():
    assert f in novo['creditos'], f'fonte sem crédito: {f}'
    novo['creditos'][f]['usos'] += n
g = novo['totalGeralVozes']
g['arquivos'] += n_tot; g['kb'] = round(g['kb'] + kb_tot, 1); g['segundos'] = round(g['segundos'] + seg_tot, 1)
g['decodificadoMB22k'] = round(g['segundos'] * SRD * 4 / 1048576, 2)
for t in ind['temas']:
    assert json.dumps(ind['temas'][t], ensure_ascii=False) == json.dumps(novo['temas'][t], ensure_ascii=False), t
for k in ('comum', 'musica', 'vozes'):
    assert json.dumps(ind[k], ensure_ascii=False) == json.dumps(novo[k], ensure_ascii=False), k

C = dict(ensure_ascii=False, separators=(',', ':'))
os.makedirs(os.path.join(trab, 'final'), exist_ok=True)
open(os.path.join(trab, 'final', f'{TEMA}-vozes.mp3'), 'wb').write(buf)
open(os.path.join(trab, 'final', 'indice-novo.json'), 'w', encoding='utf-8').write(json.dumps(novo, **C))
trechos = {'tema': json.dumps(tema, **C), 'ordem': json.dumps(novo['ordem'], **C),
           'tamanhos': {k: novo['tamanhos'][k] for k in (f'{TEMA}-musica.mp3', f'{TEMA}-vozes.mp3')},
           'creditos': {f: {'antes': ind['creditos'][f]['usos'], 'depois': novo['creditos'][f]['usos']} for f in usos},
           'totalGeralVozes': {'antes': json.dumps(ind['totalGeralVozes'], **C), 'depois': json.dumps(g, **C)}}
json.dump(trechos, open(os.path.join(trab, 'final', 'trechos.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

medidas = {
    'musica': {'pacoteBytes': mus['bytesPacote'], 'pacoteKB': tema['totalKB'], 'segundosDecodificados': tema['segundosDecodificados'],
               'memoriaMB24k': tema['memoriaMB24k'], 'memoriaMBTaxaDoArquivo': tema['memoriaMBTaxaDoArquivo'], 'memoriaMB48k': tema['memoriaMB48k'],
               'metas': {'downloadMenorQue2MB': mus['bytesPacote'] < 2 * 1048576, 'memoria24kMenorQue15MB': tema['memoriaMB24k'] < 15},
               'andamento': tema['tempo'], 'compassos': tema['compassos'], 'segundosVolta': tema['segundosVolta'],
               'ganhosDb': mus['ganhosDb'], 'lufs': mus['lufs'], 'mixes': mus['mixesCompletas'], 'clips': mus['medidasClips']},
    'vozes': {'pacoteBytes': len(buf), 'totais': totais,
              'regua': 'RMS "enquanto soa" (janelas de 50 ms acima de -60 dBFS) no MP3 decodificado; alvo -23 dB (ambiente -27); pico <= -1 dBFS; '
                       'LUFS momentâneo máximo (ebur128) <= -12',
              'lufsMomentaneoMax': max(v['lufsMomentaneoMax'] for v in med.values()),
              'arquivos': {k: {kk: v[kk] for kk in ('seg', 'alvoDb', 'rmsDb', 'picoDb', 'lufsMomentaneoMax', 'bytes', 'cortes', 'centroideHz', 'acima4k')}
                           for k, v in med.items()}},
    'indice': {'bytes': len(json.dumps(novo, **C).encode('utf-8')), 'temaBytes': len(trechos['tema'].encode('utf-8')), 'totalGeralVozes': g},
}
json.dump(medidas, open(medp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('tema', len(trechos['tema']), 'bytes no índice; vozes', len(buf), 'bytes,', n_tot, 'arquivos,', round(seg_tot, 1), 's; música', mus['bytesPacote'],
      'bytes; usos', usos)
