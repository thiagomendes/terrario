"""Emenda o pacote de vozes da cidade e põe a Cidade Grande em public/sons/indice.json (spec 014, T09). Só biblioteca padrão.
Rodar tudo de novo: ver rodar.sh. Este passo:
  python3 -I empacotar.py <trabalho> <meta_commons.json> <repo>
<trabalho>: final/musica_tema.json + final/cidade-grande-musica.mp3 (musica_finalizar.py) e vozes/{receitas.json, medidas.json, mp3/}
(vozes_cidade.py e vozes_codificar.py). <meta_commons.json>: o meta.json que o commons_baixar.py da 019 gravou.
Escreve: public/sons/pacotes/cidade-grande-{musica,vozes}.mp3, a entrada temas['cidade-grande'] do índice (música, vozes, obra,
ambiente), 'cidade-grande' no fim de ordem, os dois pacotes em tamanhos, as fontes novas em creditos (as que já estavam só
somam os usos), totalGeralVozes; e, na pasta da spec, medidas-pacote.json e a seção "pacote" de creditos.json.
Pode rodar de novo: se o tema já está no índice, primeiro desfaz o que ele somou (usos, totais) e tira a entrada.
O índice continua numa linha só (separadores compactos, sem ASCII forçado), e os outros temas não mudam nenhum byte.
"""
import sys, os, json, shutil

trab, meta_p, repo = sys.argv[1:4]
TEMA = 'cidade-grande'
SRD = 22050
IDX = os.path.join(repo, 'public/sons/indice.json')
PAC = os.path.join(repo, 'public/sons/pacotes')
SPEC = os.path.join(repo, '.sdd/specs/014-cidade-grande/referencia/fontes')

texto = open(IDX, encoding='utf-8').read()
ind = json.loads(texto)
assert json.dumps(ind, ensure_ascii=False, separators=(',', ':')) == texto, 'o índice não está no formato compacto esperado'
meta = json.load(open(meta_p, encoding='utf-8'))
mus = json.load(open(os.path.join(trab, 'final/musica_tema.json'), encoding='utf-8'))
rec = json.load(open(os.path.join(trab, 'vozes/receitas.json'), encoding='utf-8'))
med = json.load(open(os.path.join(trab, 'vozes/medidas.json'), encoding='utf-8'))


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


# ---------------------------------------------------------------- desfaz uma rodada anterior
if TEMA in ind['temas']:
    velho = ind['temas'][TEMA]
    for c in clips_de({k: velho[k] for k in ('vozes', 'obra', 'ambiente') if k in velho}):
        for f in c.get('f', []):
            if f in ind['creditos']:
                ind['creditos'][f]['usos'] -= 1
                if ind['creditos'][f]['usos'] <= 0:
                    del ind['creditos'][f]
    t = velho.get('vozes', {}).get('totais')
    if t:
        g = ind['totalGeralVozes']
        g['arquivos'] -= t['arquivos']; g['kb'] = round(g['kb'] - t['kb'], 1); g['segundos'] = round(g['segundos'] - t['segundos'], 1)
        g['decodificadoMB22k'] = round(g['segundos'] * SRD * 4 / 1048576, 2)
    del ind['temas'][TEMA]
    ind['ordem'] = [x for x in ind['ordem'] if x != TEMA]
    for k in (f'{TEMA}-musica.mp3', f'{TEMA}-vozes.mp3'):
        ind['tamanhos'].pop(k, None)

# ---------------------------------------------------------------- pacote das vozes
buf = bytearray()
usos = {}
seg_tot, n_tot = 0.0, 0
por_secao = {}


def ent(cid, secao, extra=None):
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
    d = {'o': o, 's': m['seg'], 'f': f}
    if extra:
        d.update(extra)
    return d


est = rec['estrutura']
criaturas = []
for slot in ('cervo', 'coelho', 'peixe', 'espectro', 'raposa'):
    e = est['criaturas'][slot]
    c = {'slot': slot, 'nome': e['nome'], 'porte': e['porte'],
         'momentos': {m: [ent(x, 'bichos') for x in e['momentos'][m]] for m in ('chamado', 'susto', 'contente', 'ai')},
         'baque': f"{e['baque']}.{e['porte']}", 'derrota': e['derrota']}
    assert c['baque'] in ind['comum']['baque'] and c['derrota'] in ind['comum']['derrota'], (slot, c['baque'], c['derrota'])
    if 'filhote' in e:
        c['filhote'] = {'nome': e['filhote']['nome'], 'momentos': {m: [ent(x, 'bichos') for x in e['filhote']['momentos'][m]] for m in ('chamado', 'susto', 'contente', 'ai')}}
    criaturas.append(c)
moradores = {}
for gen in ('feminino', 'masculino'):
    moradores[gen] = {m: [ent(x, 'moradores', {'sil': rec['arquivos'][x]['silabas']}) for x in est['moradores'][gen][m]]
                      for m in ('cumprimento', 'contente', 'obrigado', 'surpresa')}
moradores['sabor'] = 'urbano'
moradores['nota'] = ('feminino/masculino = sintetizador de formantes nosso (o mesmo da 019) com o sabor da cidade: um tico mais ligeiro e claro, '
                     'o cumprimento subindo no fim. Sem o conjunto B gravado.')
obra = {k: [ent(x, 'obra') for x in est['obra'][k]] for k in ('plim', 'acorde', 'tada', 'tadaGrande', 'hum', 'coreto', 'colher')}
ambiente = {k: [ent(x, 'ambiente') for x in est['ambiente'][k]] for k in ('pardal', 'buzininha', 'grilo')}
assert len(obra['plim']) == 11
kb_tot = round(len(buf) / 1024, 1)
totais = {'arquivos': n_tot, 'kb': kb_tot, 'segundos': round(seg_tot, 1), 'decodificadoMB22k': round(seg_tot * SRD * 4 / 1048576, 2),
          'porSecao': {k: {'arquivos': v['arquivos'], 'kb': round(v['bytes'] / 1024, 1), 'segundos': round(v['segundos'], 1),
                           'decodificadoMB22k': round(v['segundos'] * SRD * 4 / 1048576, 2)} for k, v in por_secao.items()}}

# ---------------------------------------------------------------- entrada do tema, tamanhos, ordem
tema = dict(mus['tema'])
tema['vozes'] = {'criaturas': criaturas, 'moradores': moradores, 'totais': totais}
tema['obra'] = obra
tema['ambiente'] = ambiente
ind['temas'][TEMA] = tema
ind['ordem'].append(TEMA)
musica_mp3 = os.path.join(trab, 'final', f'{TEMA}-musica.mp3')
ind['tamanhos'][f'{TEMA}-musica.mp3'] = os.path.getsize(musica_mp3)
ind['tamanhos'][f'{TEMA}-vozes.mp3'] = len(buf)
assert os.path.getsize(musica_mp3) == mus['bytesPacote']

# ---------------------------------------------------------------- créditos
NOVOS = {
    'FluidR3_GM': {'titulo': 'FluidR3_GM.sf2 (banco de instrumentos; celesta, piano e caixinha de música da obra)', 'autor': 'Frank Wen e colaboradores',
                   'url': 'https://packages.debian.org/bookworm/fluid-soundfont-gm', 'licenca': 'MIT (pacote Debian fluid-soundfont-gm 3.1)',
                   'conferido': 'arquivo de cópia do pacote Debian (/usr/share/doc/fluid-soundfont-gm/copyright)'},
}
for f, n in sorted(usos.items()):
    if f in ind['creditos']:
        ind['creditos'][f]['usos'] += n
    elif f in NOVOS:
        ind['creditos'][f] = dict(NOVOS[f], usos=n)
    elif f.startswith('commons/'):
        mm = meta[f.split('/')[1].rsplit('.', 1)[0]]
        assert mm['codigo'] in ('cc0', 'pd'), f
        ind['creditos'][f] = {'titulo': mm['titulo'], 'autor': mm['autor'], 'acervo': 'Wikimedia Commons', 'pagina': mm['pagina'], 'licenca': mm['licenca'],
                              'codigoLicenca': mm['codigo'], 'conferido': 'API do Commons (extmetadata LicenseShortName/License) no download; só CC0/PD aceitos', 'usos': n}
    else:
        raise SystemExit(f'fonte sem crédito: {f}')
ind['creditos'] = dict(sorted(ind['creditos'].items()))

g = ind['totalGeralVozes']
g['arquivos'] += n_tot; g['kb'] = round(g['kb'] + kb_tot, 1); g['segundos'] = round(g['segundos'] + seg_tot, 1)
g['decodificadoMB22k'] = round(g['segundos'] * SRD * 4 / 1048576, 2)

# ---------------------------------------------------------------- grava
novo = json.dumps(ind, ensure_ascii=False, separators=(',', ':'))
antes = json.loads(texto)
for t in antes['temas']:
    if t != TEMA:
        assert json.dumps(antes['temas'][t], ensure_ascii=False, separators=(',', ':')) == json.dumps(ind['temas'][t], ensure_ascii=False, separators=(',', ':')), t
open(IDX, 'w', encoding='utf-8').write(novo)
shutil.copyfile(musica_mp3, os.path.join(PAC, f'{TEMA}-musica.mp3'))
open(os.path.join(PAC, f'{TEMA}-vozes.mp3'), 'wb').write(buf)

medidas = {
    'musica': {'pacoteBytes': mus['bytesPacote'], 'pacoteKB': tema['totalKB'], 'segundosDecodificados': tema['segundosDecodificados'],
               'memoriaMB24k': tema['memoriaMB24k'], 'memoriaMBTaxaDoArquivo': tema['memoriaMBTaxaDoArquivo'], 'memoriaMB48k': tema['memoriaMB48k'],
               'metas': {'downloadMenorQue2MB': mus['bytesPacote'] < 2 * 1048576, 'memoria24kMenorQue15MB': tema['memoriaMB24k'] < 15},
               'andamento': tema['tempo'], 'compassos': tema['compassos'], 'segundosVolta': tema['segundosVolta'],
               'ganhosDb': mus['ganhosDb'], 'mixes': tema['mixes'], 'clips': mus['medidasClips']},
    'vozes': {'pacoteBytes': len(buf), 'totais': totais,
              'regua': 'RMS "enquanto soa" (janelas de 50 ms acima de -60 dBFS) no MP3 decodificado; alvo -23 dB (coreto -26, buzininha -31); pico <= -1 dBFS',
              'arquivos': {k: {kk: v[kk] for kk in ('seg', 'alvoDb', 'rmsDb', 'picoDb', 'bytes', 'cortes', 'centroideHz', 'acima4k')} for k, v in med.items()}},
    'indice': {'bytes': len(novo.encode('utf-8')), 'totalGeralVozes': g},
}
json.dump(medidas, open(os.path.join(SPEC, 'medidas-pacote.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# seção "pacote" do creditos.json da spec (o resto do arquivo fica como está)
cp = os.path.join(SPEC, 'creditos.json')
ct = open(cp, encoding='utf-8').read()
marca = ',\n "pacote": '
if marca in ct:
    ct = ct[:ct.index(marca)] + '\n}\n'
ct = ct.rstrip()
assert ct.endswith('}')
fontes = []
for f, n in sorted(usos.items()):
    c = ind['creditos'][f]
    fontes.append({'arquivo': f, 'titulo': c.get('titulo'), 'autor': c.get('autor'), 'acervo': c.get('acervo'), 'url': c.get('pagina') or c.get('url'),
                   'licenca': c['licenca'], 'usosNoPacote': n})
pacote = {'onde': 'public/sons/pacotes/cidade-grande-musica.mp3 e cidade-grande-vozes.mp3, entrada temas["cidade-grande"] de public/sons/indice.json',
          'scripts': 'scripts-pacote/ (rodar.sh refaz tudo)', 'medidas': 'medidas-pacote.json',
          'musica': 'partitura aprovada (compor_cidade.py) em 16 compassos de 4/4 a 126; FluidR3_GM (MIT) pelo FluidSynth; estalo de dedos de síntese nossa',
          'fontes': fontes}
ct = ct[:-1].rstrip() + marca + json.dumps(pacote, ensure_ascii=False, indent=1).replace('\n', '\n ') + '\n}\n'
json.loads(ct)
open(cp, 'w', encoding='utf-8').write(ct)
print('índice', len(novo.encode('utf-8')), 'bytes; vozes', len(buf), 'bytes,', n_tot, 'arquivos,', round(seg_tot, 1), 's; música', mus['bytesPacote'], 'bytes')
print('créditos usados:', usos)
