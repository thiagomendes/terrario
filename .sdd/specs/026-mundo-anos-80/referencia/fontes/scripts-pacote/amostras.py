"""Confere os pacotes da Vila Neon pelo índice, mede o volume percebido e grava amostras para ouvir (spec 026, T18 e T19).
Rodar tudo de novo: ver rodar.sh. Este passo: python3 -I amostras.py <repo> <saida_amostras> <trabalho>

1. Conferência: cada fatia `o` de vila-neon-musica.mp3 e vila-neon-show.mp3 decodifica (ffmpeg, lendo de arquivo para tirar o
   atraso do codificador) e dura o que o índice diz.
2. Volume percebido (LUFS integrado, BS.1770: filtro K e as duas portas) das misturas da trilha do bairro, do Rancho e da
   Cidade, no mesmo jeito do jogo (caverna com o passa-baixa de 1,1 kHz do motor). O Rancho e a Cidade estão afinados na régua
   da 019/014 (NIVEL_TRILHA em src/audio/trilha.ts); o ajuste da Vila Neon em cada contexto é o que deixa o volume percebido
   dela igual à média dos dois: nivel = média(LUFS_ref + NIVEL_ref) - LUFS_vila. Grava em medidas-pacote.json ("nivel").
3. Amostras (MP3), só com as fatias dos pacotes, nos ganhos relativos do jogo (src/audio/somVila.ts), todas com o mesmo
   ganho de +6 dB para ouvir no fone: bairro-dia, bairro-entardecer, bairro-noite, show-completo (uma caixa, duas caixas, a
   terceira acende: a contagem, o show com toques no palco e o acorde final tocado no chamado, o aplauso), show-final-sozinho
   (o fim do show sem toque: o acorde vem sozinho) e brinquedos (cada som de toque, um depois do outro).
"""
import sys, os, json, subprocess
import numpy as np
from scipy.signal import lfilter

repo, saida, trab = sys.argv[1:4]
SR = 22050
ind = json.load(open(os.path.join(repo, 'public/sons/indice.json'), encoding='utf-8'))
os.makedirs(saida, exist_ok=True)
TMP = os.path.join(trab, '_fatia.mp3')
SPEC = os.path.join(repo, '.sdd/specs/026-mundo-anos-80/referencia/fontes')


def dec_bytes(b):
    open(TMP, 'wb').write(b)
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', TMP, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, np.float32).astype(np.float64)


problemas = []


def clips_musica(tema):
    t = ind['temas'][tema]
    pac = open(os.path.join(repo, f'public/sons/pacotes/{tema}-musica.mp3'), 'rb').read()
    assert len(pac) == ind['tamanhos'][f'{tema}-musica.mp3']
    dec = {}
    for c in t['clips']:
        y = dec_bytes(pac[c['o'][0]:c['o'][0] + c['o'][1]])
        if abs(len(y) - c['amostrasArquivo']) > 1:
            problemas.append(f"{tema} {c['id']}: {len(y)} amostras, índice diz {c['amostrasArquivo']}")
        P = c['folgaAntes']
        dec[c['id']] = y[P:P + c['amostrasLaco']] if c['tipo'] == 'camada' else y[P:P + c['amostrasNominais'] + c['amostrasCauda']]
    return t, dec


def misturas(t, dec, voltas=1):
    L, cps = t['amostrasVolta'], t['amostrasCompasso']
    til = lambda v: np.tile(v, (L * voltas) // len(v) + 1)[:L * voltas]

    def frases(ctx):
        out = np.zeros(L * voltas + SR * 2)
        pref = 'dia_' if ctx == 'dia' else 'tarde_'
        for v in range(voltas):
            for f in t['forma']:
                vers = sorted([c for c in t['clips'] if c['tipo'] == 'frase' and c['frase'] == f['frase'] and c['id'].startswith(pref)],
                              key=lambda c: c['variante'])
                x = dec[vers[v % len(vers)]['id']]
                i = v * L + f['compassoInicio'] * cps
                out[i:i + len(x)] += x[:len(out) - i]
        # a cauda da última frase cai no começo (é um laço)
        out[:SR * 2] += out[L * voltas:L * voltas + SR * 2]
        return out[:L * voltas]
    b = til(dec['base'])
    caverna = 0.6 * b + til(dec['noite']) + til(dec['pingos'])
    return {'dia': b + frases('dia'), 'tarde': b + frases('entardecer'), 'noite': 0.65 * b + til(dec['noite']),
            'caverna': biquad_lp(caverna, 1100)}


def biquad_lp(x, fc, q=0.7071):
    w0 = 2 * np.pi * fc / SR
    al = np.sin(w0) / (2 * q)
    c = np.cos(w0)
    b = [(1 - c) / 2, 1 - c, (1 - c) / 2]
    a = [1 + al, -2 * c, 1 - al]
    return lfilter(b, a, x)


def lufs(x):
    """LUFS integrado (BS.1770-4) de um sinal mono a 22 050 Hz: filtro K pelas fórmulas analógicas e as portas -70 e -10."""
    G, Qs, fc = 3.99984385397, 0.7071752369554193, 1681.9744509555319
    A = 10 ** (G / 40)
    w0 = 2 * np.pi * fc / SR
    al = np.sin(w0) / (2 * Qs)
    c = np.cos(w0)
    b = [A * ((A + 1) + (A - 1) * c + 2 * np.sqrt(A) * al), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - 2 * np.sqrt(A) * al)]
    a = [(A + 1) - (A - 1) * c + 2 * np.sqrt(A) * al, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - 2 * np.sqrt(A) * al]
    y = lfilter(b, a, x)
    fh, Qh = 38.13547087613982, 0.5003270373253953
    w0 = 2 * np.pi * fh / SR
    al = np.sin(w0) / (2 * Qh)
    c = np.cos(w0)
    y = lfilter([(1 + c) / 2, -(1 + c), (1 + c) / 2], [1 + al, -2 * c, 1 - al], y)
    blk, passo = int(0.4 * SR), int(0.1 * SR)
    z = np.array([np.mean(y[i:i + blk] ** 2) for i in range(0, len(y) - blk, passo)])
    lz = -0.691 + 10 * np.log10(z + 1e-20)
    z1 = z[lz > -70]
    rel = -0.691 + 10 * np.log10(np.mean(z1)) - 10
    z2 = z1[(-0.691 + 10 * np.log10(z1)) > rel]
    return round(float(-0.691 + 10 * np.log10(np.mean(z2))), 2)


# ------------------------------------------------------------------ 1 e 2: conferência e volume percebido
NIVEL_REF = {'rancho-alegre': {'dia': 0, 'tarde': 0.2, 'noite': 2.5, 'caverna': 3.0},
             'cidade-grande': {'dia': 0, 'tarde': 0.2, 'noite': 2.6, 'caverna': 2.9}}
medida_lufs = {}
dec_vila = None
for tema in ('rancho-alegre', 'cidade-grande', 'vila-neon'):
    t, dec = clips_musica(tema)
    mx = misturas(t, dec)
    medida_lufs[tema] = {k: lufs(v) for k, v in mx.items()}
    if tema == 'vila-neon':
        t_vila, dec_vila, mx_vila = t, dec, mx
nivel = {}
for ctx in ('dia', 'tarde', 'noite', 'caverna'):
    alvo = np.mean([medida_lufs[r][ctx] + NIVEL_REF[r][ctx] for r in NIVEL_REF])
    nivel[ctx] = round(float(alvo - medida_lufs['vila-neon'][ctx]), 1)

# o show (decodificado do pacote)
sh = ind['temas']['vila-neon']['show']
pac_show = open(os.path.join(repo, 'public/sons/pacotes/vila-neon-show.mp3'), 'rb').read()
assert len(pac_show) == ind['tamanhos']['vila-neon-show.mp3']
PS = sh['folga']
cl = {}
for cid, c in sh['clips'].items():
    y = dec_bytes(pac_show[c['o'][0]:c['o'][0] + c['o'][1]])
    if abs(len(y) - c['arquivo']) > 1:
        problemas.append(f"show {cid}: {len(y)} amostras, índice diz {c['arquivo']}")
    cl[cid] = y[PS:PS + c['n']]
CPS = sh['amostrasCompasso']


def seq_camada(cam):
    out = np.zeros(20 * CPS + 2 * SR)
    for f in sh['forma']:
        x = cl[f'{cam}_{f["pedaco"]}']
        if 'laco' in sh['clips'][f'{cam}_{f["pedaco"]}']:
            x = np.tile(x, f['compassos'] // 4)
        i = f['compassoInicio'] * CPS
        out[i:i + len(x)] += x[:len(out) - i]
    return out


show_mix = sum(seq_camada(c) for c in sh['camadas'])[:20 * CPS]
medida_lufs['show'] = {'inteiro': lufs(show_mix), 'refrao': lufs(show_mix[8 * CPS:16 * CPS]), 'verso': lufs(show_mix[:8 * CPS])}
mp = os.path.join(SPEC, 'medidas-pacote.json')
med = json.load(open(mp, encoding='utf-8'))
med['nivel'] = {'lufs': medida_lufs, 'nivelTrilhaVila': nivel,
                'como': 'nivel = média(LUFS_ref + NIVEL_TRILHA_ref) - LUFS_vila, com ref = Rancho e Cidade (afinados na régua da 019 e da 014)',
                'showAcimaDaTrilhaDiaDb': round(medida_lufs['show']['inteiro'] - medida_lufs['vila-neon']['dia'], 2)}
json.dump(med, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# ------------------------------------------------------------------ 3: amostras
GANHO_AMOSTRA = 10 ** (6 / 20)
# os ganhos dos brinquedos no jogo (dB), os mesmos de GANHO_BRINQUEDO em src/audio/somVila.ts
GANHO_TOQUE = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ganhos_toque.json'), encoding='utf-8'))


def g(k):
    return 10 ** (GANHO_TOQUE.get(k, 0) / 20)


def gravar(nome, x, fade=0.0):
    x = x * GANHO_AMOSTRA
    if fade:
        n = int(fade * SR)
        x[-n:] *= np.linspace(1, 0, n) ** 1.5
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '96k',
                    '-map_metadata', '-1', os.path.join(saida, nome + '.mp3')], input=np.clip(x, -1, 1).astype('<f4').tobytes(), check=True)


mx2 = misturas(t_vila, dec_vila, voltas=2)
nv = lambda ctx: 10 ** (nivel[ctx] / 20)
gravar('bairro-dia', mx2['dia'] * nv('dia'), fade=2.0)
gravar('bairro-entardecer', mx_vila['tarde'][:int(24 * SR)] * nv('tarde'), fade=2.0)
gravar('bairro-noite', mx_vila['noite'][:int(24 * SR)] * nv('noite'), fade=2.0)
# o show: os ganhos do show são os da trilha (nivel do dia), os acordes, o final e o aplauso a 0 dB por cima
GS = nv('dia')


def por(out, x, t0, ganho=1.0):
    i = int(round(t0 * SR))
    if i < 0:
        x, i = x[-i:], 0
    out[i:i + len(x)] += ganho * x[:max(0, len(out) - i)]


def show_amostra(toque_final):
    """Uma caixa (8 s), duas caixas (8 s), a terceira acende: o show. toque_final: s desde o início do show (None: sozinho)."""
    jam = 16.0
    ini = jam
    fim_total = ini + 2 + 40 + 7
    out = np.zeros(int(fim_total * SR))
    vb, vg = cl['bateria_verso'], cl['guitarra_verso']
    por(out, np.tile(vb, 2), 0, GS)
    por(out, np.tile(vg, 2)[int(8 * SR):int(16 * SR)], 8, GS)
    out[int(ini * SR):] = 0
    por(out, cl['tum'], 0.0, g('tum'))
    por(out, cl['tum'], 8.0, g('tum'))
    por(out, cl['tum'], ini - 0.05, g('tum'))
    por(out, cl['contagem'], ini, GS)
    final = ini + (toque_final if toque_final is not None else 40)
    camadas = np.zeros_like(out)
    for c in sh['camadas']:
        por(camadas, seq_camada(c), ini + 2, GS)
    i = int(final * SR)
    nf = int(0.12 * SR)
    camadas[i:i + nf] *= np.linspace(1, 0, nf)
    camadas[i + nf:] = 0
    out += camadas
    # toques no palco: no oitavo de compasso, com o acorde do compasso
    for tq in (3.0, 5.25, 9.0, 12.5, 17.0, 20.0, 21.5, 24.0, 28.0, 30.75):
        compasso = int(tq // 2)
        por(out, cl[sh['acordes'][compasso % 4]], ini + 2 + tq, GS)
    por(out, cl['final'], final, GS)
    por(out, cl['aplauso'], final + 1.0, GS)
    return out[:int((final + 6.5) * SR)]


gravar('show-completo', show_amostra(37.2), fade=1.0)
s2 = show_amostra(None)
gravar('show-final-sozinho', s2[int((16 + 32) * SR):], fade=1.0)
# os brinquedos, um depois do outro
partes = []


def junta(x, pausa=0.5):
    partes.extend([x, np.zeros(int(pausa * SR))])


for k in range(3):
    junta(cl[f'fliperama_{k}'] * g('fliperama'), 0.7)
radio = np.zeros(int(8.6 * SR))
por(radio, cl['radio_liga'], 0, g('radio'))
por(radio, np.tile(cl['batida'], 2), 0.25, g('batida'))
por(radio, cl['radio_desliga'], 8.3, g('radio'))
junta(radio)
junta(cl['fita'] * g('fita'))
for r in (1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2):
    x = cl['ladrilho']
    xi = np.interp(np.arange(0, len(x) - 1, r), np.arange(len(x)), x)
    junta(xi[:int(0.35 * SR)] * g('ladrilho'), 0.05)
junta(np.zeros(int(0.3 * SR)), 0)
for _ in range(4):
    junta(cl['rodinhas'] * g('rodinhas'), 0.08)
for k in ('estojo', 'tum', 'lhama', 'campainha', 'orelhao'):
    junta(cl[k] * g(k), 0.7)
junta(np.tile(cl['neon'], 2) * g('neon'), 0.5)
junta(cl['uhuu'] * GS, 0.5)
junta(cl['aplauso'] * GS, 0.3)
gravar('brinquedos', np.concatenate(partes))
os.remove(TMP)
print('níveis (LUFS):', json.dumps(medida_lufs), '\nNIVEL_TRILHA vila-neon:', nivel, '\nproblemas:', problemas)
