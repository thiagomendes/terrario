"""Confere os pacotes da cidade pelo índice e grava amostras para ouvir (spec 014, T09).
Rodar tudo de novo: ver rodar.sh. Este passo: python3 -I amostras.py <repo> <saida_amostras> <conferencia.json>
Confere: cada fatia `o` de cidade-grande-musica.mp3 e cidade-grande-vozes.mp3 decodifica (ffmpeg) e dura o que o índice diz
(`amostrasArquivo` na música, `s` nas vozes, obra e ambiente). As amostras são montadas só com as fatias do pacote, sem mexer no volume
(a música como o jogo mistura: base + frases da hora, noite com base 0,65, correndo + amigos).
"""
import sys, os, json, subprocess
import numpy as np

repo, saida, conf_p = sys.argv[1:4]
SR = 22050
TEMA = 'cidade-grande'
ind = json.load(open(os.path.join(repo, 'public/sons/indice.json'), encoding='utf-8'))
t = ind['temas'][TEMA]
pm = open(os.path.join(repo, f'public/sons/pacotes/{TEMA}-musica.mp3'), 'rb').read()
pv = open(os.path.join(repo, f'public/sons/pacotes/{TEMA}-vozes.mp3'), 'rb').read()
assert len(pm) == ind['tamanhos'][f'{TEMA}-musica.mp3'] and len(pv) == ind['tamanhos'][f'{TEMA}-vozes.mp3']
os.makedirs(saida, exist_ok=True)


TMP = os.path.join(os.path.dirname(os.path.abspath(conf_p)), '_fatia.mp3')


def dec_bytes(b):
    """Decodifica a fatia como um arquivo (o ffmpeg só lê o quadro Info/LAME e tira o atraso quando pode ler o arquivo, não por pipe)."""
    open(TMP, 'wb').write(b)
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', TMP, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, np.float32).astype(np.float64)


def fatia(pac, o):
    return dec_bytes(pac[o[0]:o[0] + o[1]])


def gravar(nome, x, kbps=48, fade=0.0):
    x = x.copy()
    if fade:
        n = int(fade * SR)
        x[-n:] *= np.linspace(1, 0, n) ** 1.5
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', f'{kbps}k',
                    '-map_metadata', '-1', os.path.join(saida, nome + '.mp3')], input=np.clip(x, -1, 1).astype('<f4').tobytes(), check=True)


conf = {'musica': {}, 'vozes': {}, 'problemas': []}
# ---------------------------------------------------------------- música
dec = {}
for c in t['clips']:
    y = fatia(pm, c['o'])
    conf['musica'][c['id']] = dict(amostras=len(y), indice=c['amostrasArquivo'], ok=abs(len(y) - c['amostrasArquivo']) <= 1)
    if not conf['musica'][c['id']]['ok']:
        conf['problemas'].append(f"música {c['id']}: {len(y)} amostras, índice diz {c['amostrasArquivo']}")
    P = c['folgaAntes']
    dec[c['id']] = y[P:P + c['amostrasLaco']] if c['tipo'] == 'camada' else y[P:P + c['amostrasNominais'] + c['amostrasCauda']]
L, cps = t['amostrasVolta'], t['amostrasCompasso']
til = lambda v, n: np.tile(v, n // len(v) + 1)[:n]


def frases(ctx, voltas):
    out = np.zeros(L * voltas + SR)
    for v in range(voltas):
        for f in t['forma']:
            pref = 'dia_' if ctx == 'dia' else 'tarde_'
            vers = sorted([c for c in t['clips'] if c['tipo'] == 'frase' and c['frase'] == f['frase'] and c['id'].startswith(pref)], key=lambda c: c['variante'])
            c = vers[v % len(vers)]
            x = dec[c['id']]
            i = v * L + f['compassoInicio'] * cps
            out[i:i + len(x)] += x[:len(out) - i]
    return out[:L * voltas]


N = int(25 * SR)
b2 = til(dec['base'], 2 * L)
dia, tarde = frases('dia', 2), frases('entardecer', 2)
mix = {'musica-dia': b2 + dia, 'musica-entardecer': b2 + tarde, 'musica-noite': 0.65 * b2 + til(dec['noite'], 2 * L),
       'musica-amigos-correndo': b2 + dia + til(dec['mov'], 2 * L) + til(dec['amigos'], 2 * L)}
conf['mixesAmostra'] = {}
for k, x in mix.items():
    x = x[:N]
    conf['mixesAmostra'][k] = dict(rmsDb=round(20 * np.log10(np.sqrt(np.mean(x ** 2))), 2), picoDb=round(20 * np.log10(np.abs(x).max()), 2), segundos=25)
    gravar(k, x, 64, fade=2.0)

# ---------------------------------------------------------------- vozes, obra, ambiente
def conferir(nome, c):
    y = fatia(pv, c['o'])
    d = len(y) / SR
    ok = abs(d - c['s']) <= 0.03
    conf['vozes'][nome] = dict(segundos=round(d, 3), indice=c['s'], ok=ok)
    if not ok:
        conf['problemas'].append(f'{nome}: {d:.3f} s, índice diz {c["s"]}')
    return y


def seguidos(partes, gap=0.35):
    out = []
    for p in partes:
        out += [p, np.zeros(int(gap * SR))]
    return np.concatenate(out)


v = t['vozes']
for cr in v['criaturas']:
    partes = []
    for m, lst in cr['momentos'].items():
        partes += [conferir(f"{cr['slot']}.{m}.{i + 1}", c) for i, c in enumerate(lst)]
    if 'filhote' in cr:
        partes.append(np.zeros(int(0.5 * SR)))
        for m, lst in cr['filhote']['momentos'].items():
            partes += [conferir(f"{cr['slot']}.filhote.{m}.{i + 1}", c) for i, c in enumerate(lst)]
    nome = cr['nome'].lower().replace(' ', '-').replace('ç', 'c').replace('á', 'a')
    gravar(f"bicho-{cr['slot']}-{nome}", seguidos(partes))
for gen in ('feminino', 'masculino'):
    partes = [conferir(f'{gen}.{m}.{i + 1}', c) for m, lst in v['moradores'][gen].items() for i, c in enumerate(lst)]
    gravar(f'morador-{gen}', seguidos(partes, 0.5))
o = t['obra']
gravar('obra-plim-escala', seguidos([conferir(f'obra.plim.{i + 1}', c) for i, c in enumerate(o['plim'])], 0.25))
for k, arq in (('acorde', 'obra-acorde'), ('tada', 'obra-tada'), ('tadaGrande', 'obra-tada-grande'), ('hum', 'obra-hum'), ('coreto', 'obra-coreto'), ('colher', 'obra-colher')):
    gravar(arq, seguidos([conferir(f'obra.{k}.{i + 1}', c) for i, c in enumerate(o[k])], 0.8))
for k, lst in t['ambiente'].items():
    gravar(f'ambiente-{k}', seguidos([conferir(f'ambiente.{k}.{i + 1}', c) for i, c in enumerate(lst)], 0.8))
conf['resumo'] = dict(musicaClips=len(conf['musica']), vozesClips=len(conf['vozes']), problemas=len(conf['problemas']),
                      duracaoMaxima={k: max(c['s'] for c in lst) for k, lst in {**o, **t['ambiente']}.items()})
os.remove(TMP)
json.dump(conf, open(conf_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps(conf['resumo'], ensure_ascii=False), json.dumps(conf['mixesAmostra']), conf['problemas'][:10])
