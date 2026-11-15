"""Põe a Vila Neon em public/sons/indice.json e copia os dois pacotes (spec 026, T18). Só biblioteca padrão.
Rodar tudo de novo: ver rodar.sh. Este passo:  python3 -I empacotar.py <trabalho> <repo>
<trabalho>: final/{musica_tema.json, vila-neon-musica.mp3} (musica_finalizar.py) e final/{show_tema.json, vila-neon-show.mp3}
(show_pacote.py).
Escreve: public/sons/pacotes/vila-neon-{musica,show}.mp3; a entrada temas['vila-neon'] do índice (a trilha do bairro e a
seção "show" com o show, o acorde final, o aplauso e os brinquedos); os dois pacotes em tamanhos; e, na pasta da spec,
medidas-pacote.json. A Vila Neon não tem pacote de vozes: os bichos e os moradores do bairro usam a voz sintetizada do
tema (src/temas/vila-neon/vozes.ts), então ela não entra em `ordem` (a lista dos temas com vozes gravadas) nem em
totalGeralVozes, e não soma créditos (tudo é FluidR3_GM, já creditado, ou síntese nossa).
Pode rodar de novo: se o tema já está no índice, a entrada é trocada. Os outros temas não mudam nenhum byte.
"""
import sys, os, json, shutil

trab, repo = sys.argv[1:3]
TEMA = 'vila-neon'
IDX = os.path.join(repo, 'public/sons/indice.json')
PAC = os.path.join(repo, 'public/sons/pacotes')
SPEC = os.path.join(repo, '.sdd/specs/026-mundo-anos-80/referencia/fontes')

texto = open(IDX, encoding='utf-8').read()
ind = json.loads(texto)
assert json.dumps(ind, ensure_ascii=False, separators=(',', ':')) == texto, 'o índice não está no formato compacto esperado'
mus = json.load(open(os.path.join(trab, 'final/musica_tema.json'), encoding='utf-8'))
sh = json.load(open(os.path.join(trab, 'final/show_tema.json'), encoding='utf-8'))
musica_mp3 = os.path.join(trab, 'final', f'{TEMA}-musica.mp3')
show_mp3 = os.path.join(trab, 'final', f'{TEMA}-show.mp3')
assert os.path.getsize(musica_mp3) == mus['bytesPacote']
assert TEMA not in ind['ordem']

tema = dict(mus['tema'])
tema['show'] = sh['show']
ind['temas'][TEMA] = tema
ind['tamanhos'][f'{TEMA}-musica.mp3'] = os.path.getsize(musica_mp3)
ind['tamanhos'][f'{TEMA}-show.mp3'] = os.path.getsize(show_mp3)

novo = json.dumps(ind, ensure_ascii=False, separators=(',', ':'))
antes = json.loads(texto)
for t in antes['temas']:
    if t != TEMA:
        assert json.dumps(antes['temas'][t], ensure_ascii=False) == json.dumps(ind['temas'][t], ensure_ascii=False), t
for k in ('creditos', 'comum', 'ordem', 'totalGeralVozes', 'musica', 'vozes'):
    assert json.dumps(antes.get(k), ensure_ascii=False) == json.dumps(ind.get(k), ensure_ascii=False), k
open(IDX, 'w', encoding='utf-8').write(novo)
shutil.copyfile(musica_mp3, os.path.join(PAC, f'{TEMA}-musica.mp3'))
shutil.copyfile(show_mp3, os.path.join(PAC, f'{TEMA}-show.mp3'))

medidas = {
    'musica': {'pacoteBytes': mus['bytesPacote'], 'pacoteKB': tema['totalKB'], 'segundosDecodificados': tema['segundosDecodificados'],
               'memoriaMB24k': tema['memoriaMB24k'], 'memoriaMBTaxaDoArquivo': tema['memoriaMBTaxaDoArquivo'], 'memoriaMB48k': tema['memoriaMB48k'],
               'metas': {'downloadMenorQue2MB': mus['bytesPacote'] < 2 * 1048576, 'memoria24kMenorQue15MB': tema['memoriaMB24k'] < 15},
               'andamento': tema['tempo'], 'compassos': tema['compassos'], 'segundosVolta': tema['segundosVolta'],
               'ganhosDb': mus['ganhosDb'], 'mixes': tema['mixes'], 'clips': mus['medidasClips']},
    'show': {'pacoteBytes': os.path.getsize(show_mp3), 'pacoteKB': sh['show']['totalKB'], 'segundosDecodificados': sh['show']['segundosDecodificados'],
             'memoriaMB22kTudoAberto': sh['show']['memoriaMB22k'], 'mix': sh['mixShow'], 'clips': sh['medidas'],
             'regua': 'RMS no MP3 decodificado; "ativo" = janelas de 50 ms acima de -40 dB do pico; pico <= -1 dBFS'},
    'indice': {'bytes': len(novo.encode('utf-8'))},
}
mp = os.path.join(SPEC, 'medidas-pacote.json')
if os.path.exists(mp):
    velho = json.load(open(mp, encoding='utf-8'))
    if 'nivel' in velho:
        medidas['nivel'] = velho['nivel']
json.dump(medidas, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('índice', len(novo.encode('utf-8')), 'bytes; música', mus['bytesPacote'], 'bytes; show', os.path.getsize(show_mp3), 'bytes')
