"""Emenda o pacote dos veículos da cidade e põe temas['cidade-grande'].veiculos em public/sons/indice.json (spec 014). Só biblioteca padrão.
Rodar tudo de novo: ver rodar.sh. Este passo:  python3 -I veiculos_empacotar.py <trabalho> <repo>
<trabalho>: receitas.json (veiculos_sons.py), medidas.json e mp3/ (veiculos_codificar.py).
Escreve: public/sons/pacotes/cidade-grande-veiculos.mp3; no índice, temas['cidade-grande'].veiculos (um clipe {o, s, f} por chave, mais
laco {P, L} nos laços), o pacote em tamanhos e as fontes em creditos (as que já estavam só somam os usos); na pasta da spec,
medidas-veiculos-pacote.json.
Pode rodar de novo: se a entrada veiculos já está no índice, primeiro desfaz os usos que ela somou e a tira.
O índice continua numa linha só (separadores compactos, sem ASCII forçado). Confere que os outros temas, o resto da Cidade Grande, os
outros tamanhos e os outros créditos não mudam nenhum byte.
"""
import sys, os, json

trab, repo = sys.argv[1:3]
TEMA, CHAVE = 'cidade-grande', 'veiculos'
PACOTE = f'{TEMA}-veiculos.mp3'
IDX = os.path.join(repo, 'public/sons/indice.json')
PAC = os.path.join(repo, 'public/sons/pacotes')
SPEC = os.path.join(repo, '.sdd/specs/014-cidade-grande/referencia/fontes')
ORDEM = ['lacoCarro', 'lacoOnibus', 'lacoSorvete', 'freio', 'uiui', 'sorveteInteira', 'sorveteFrase', 'buzina', 'toc']


def cj(x):
    return json.dumps(x, ensure_ascii=False, separators=(',', ':'))


texto = open(IDX, encoding='utf-8').read()
ind = json.loads(texto)
assert cj(ind) == texto, 'o índice não está no formato compacto esperado'
rec = json.load(open(os.path.join(trab, 'receitas.json'), encoding='utf-8'))['arquivos']
med = json.load(open(os.path.join(trab, 'medidas.json'), encoding='utf-8'))
assert sorted(rec) == sorted(ORDEM) == sorted(med), (sorted(rec), sorted(med))

# ---------------------------------------------------------------- desfaz uma rodada anterior
tema = ind['temas'][TEMA]
if CHAVE in tema:
    for c in tema[CHAVE].values():
        for f in c.get('f', []):
            ind['creditos'][f]['usos'] -= 1
            if ind['creditos'][f]['usos'] <= 0:
                del ind['creditos'][f]
    del tema[CHAVE]
ind['tamanhos'].pop(PACOTE, None)
base = json.loads(cj(ind))  # o índice sem os veículos: o que não pode mudar

# ---------------------------------------------------------------- pacote
buf = bytearray()
veic, usos = {}, {}
for k in ORDEM:
    b = open(os.path.join(trab, 'mp3', k + '.mp3'), 'rb').read()
    assert b[0] == 0xFF and (b[1] & 0xE0) == 0xE0, k            # começa num quadro MP3 (sem ID3)
    assert b'Xing' not in b[:400] and b'Info' not in b[:400], k
    # "s": a duração do MP3 decodificado pelo ffmpeg (com o atraso de 1105 amostras), como as vozes da T09: nenhum navegador corta o
    # ataque. Nos laços, a duração do som de verdade (P + L + Q): assim inicioSemAtraso() pula o atraso onde ele vem junto e o laço fica
    # no meio da folga de P; onde o navegador já tirou o atraso, o pulo é só o enchimento do fim (bem menos que P).
    s = med[k]['segWav'] if 'laco' in rec[k] else med[k]['seg']
    c = {'o': [len(buf), len(b)], 's': s, 'f': rec[k]['fontes']}
    if 'laco' in rec[k]:
        c['laco'] = {'P': rec[k]['laco']['P'], 'L': rec[k]['laco']['L']}
    buf.extend(b)
    veic[k] = c
    for f in c['f']:
        usos[f] = usos.get(f, 0) + 1
tema[CHAVE] = veic
ind['tamanhos'][PACOTE] = len(buf)

# ---------------------------------------------------------------- créditos
BSB = {
    'bsb/0187.mp3': ('Car (Arrival, Stop, Departure)', 'https://bigsoundbank.com/car-arrival-stop-departure-s0187.html'),
    'bsb/0896.mp3': ('Ford Courier Engine', 'https://bigsoundbank.com/ford-courier-engine-s0896.html'),
    'bsb/1145.mp3': ('Truck engine', 'https://bigsoundbank.com/truck-engine-s1145.html'),
    'bsb/1490.mp3': ('Pneumatic brake released', 'https://bigsoundbank.com/pneumatic-brake-released-s1490.html'),
}
novos = []
for f, n in sorted(usos.items()):
    if f in ind['creditos']:
        ind['creditos'][f]['usos'] += n
    elif f in BSB:
        ind['creditos'][f] = {'titulo': BSB[f][0], 'autor': 'Joseph SARDIN', 'acervo': 'BigSoundBank', 'url': BSB[f][1], 'licenca': 'CC0 1.0 (domínio público)',
                              'conferido': 'acervo todo CC0 ("CC0 (public domain): Free and royalty-free"); conferido no esboço dos veículos (014, referencia/veiculos.html)',
                              'usos': n}
        novos.append(f)
    else:
        raise SystemExit(f'fonte sem crédito: {f}')
ind['creditos'] = dict(sorted(ind['creditos'].items()))

# ---------------------------------------------------------------- confere: nada mais mudou
antes = json.loads(texto)
for t in antes['temas']:
    if t != TEMA:
        assert cj(antes['temas'][t]) == cj(ind['temas'][t]), t
assert cj({k: v for k, v in base['temas'][TEMA].items()}) == cj({k: v for k, v in ind['temas'][TEMA].items() if k != CHAVE}), 'o resto da cidade mudou'
for k in base:
    if k not in ('temas', 'tamanhos', 'creditos'):
        assert cj(base[k]) == cj(ind[k]), k
assert cj(base['tamanhos']) == cj({k: v for k, v in ind['tamanhos'].items() if k != PACOTE})
for f, c in base['creditos'].items():
    if f not in usos:
        assert cj(c) == cj(ind['creditos'][f]), f
    else:
        assert cj({k: v for k, v in c.items() if k != 'usos'}) == cj({k: v for k, v in ind['creditos'][f].items() if k != 'usos'}), f
for k, c in veic.items():
    assert c['o'][0] + c['o'][1] <= len(buf)

# ---------------------------------------------------------------- grava
novo = cj(ind)
open(IDX, 'w', encoding='utf-8').write(novo)
open(os.path.join(PAC, PACOTE), 'wb').write(buf)

SR = 22050
medidas = {
    'onde': f'public/sons/pacotes/{PACOTE} e temas["{TEMA}"].{CHAVE} de public/sons/indice.json',
    'scripts': 'scripts-veiculos/ (rodar.sh refaz tudo)',
    'formato': 'quadros MP3 emendados, mono 22 050 Hz CBR (48 kbps; 64 na musiquinha), sem metadados e sem quadro Xing',
    'regua': 'RMS "enquanto soa" (janelas de 50 ms acima de -60 dBFS) no MP3 decodificado; alvo -23 dB; pico <= -1 dBFS; LUFS integrado do ebur128 do ffmpeg (null abaixo de 0,4 s)',
    'laco': ('arquivo = [P amostras do fim] + laço de L amostras + [Q = P amostras do começo]; loopStart = ini + P/22050 e loopEnd = ini + (P+L)/22050, '
             'ini = inicioSemAtraso() de src/audio/vozesGravadas.ts; com a folga de P (60 ms) o laço fecha com ou sem o atraso do codificador (1105)'),
    'segundos': ('"s" do índice = duração do MP3 decodificado pelo ffmpeg, com o atraso (como as vozes da T09), nos sons de um toque; '
                 'nos laços, a duração do som de verdade (segundosWav = (P+L+Q)/22050), para inicioSemAtraso() pular o atraso e o laço cair no meio da folga'),
    'pacoteBytes': len(buf), 'pacoteKB': round(len(buf) / 1024, 1),
    'segundosDecodificados': round(sum(m['seg'] for m in med.values()), 2),
    'segundosIndice': {k: veic[k]['s'] for k in ORDEM},
    'memoriaMB22k': round(sum(m['seg'] for m in med.values()) * SR * 4 / 1048576, 2),
    'indiceBytes': len(novo.encode('utf-8')),
    'creditosNovos': novos, 'usos': usos,
    'clips': {k: {'segundos': med[k]['seg'], 'segundosWav': med[k]['segWav'], 'rmsAtivoDb': med[k]['rmsDb'], 'picoDb': med[k]['picoDb'], 'lufs': med[k]['lufs'],
                  'bytes': med[k]['bytes'], 'kbps': med[k]['kbps'], 'ganhoExtraDb': med[k]['ganhoExtraDb'], 'cortes': med[k]['cortes'],
                  **({'laco': {'P': rec[k]['laco']['P'], 'L': rec[k]['laco']['L'], 'Q': rec[k]['laco']['Q'],
                               'segundosLaco': round(rec[k]['laco']['L'] / SR, 3)}} if 'laco' in rec[k] else {}),
                  'fontes': rec[k]['fontes'], 'nota': rec[k]['nota']} for k in ORDEM},
}
mp = os.path.join(SPEC, 'medidas-veiculos-pacote.json')
if os.path.exists(mp):  # a conferência (veiculos_conferir.py) fica até ela rodar de novo
    velho = json.load(open(mp, encoding='utf-8'))
    if 'conferencia' in velho:
        medidas['conferencia'] = velho['conferencia']
json.dump(medidas, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('pacote', len(buf), 'bytes; índice', len(novo.encode('utf-8')), 'bytes; créditos novos', novos, '; usos', usos)
