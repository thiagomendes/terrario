"""O show inteiro (uns 6 min) montado fora do jogo, só com as fatias do pacote, para ouvir e medir (spec 026, o show de verdade).
Rodar tudo de novo: ver rodar.sh. Este passo:
  python3 -I show_previa.py <indice.json ou show_tema.json> <vila-neon-show.mp3> <src/jogo/show.ts> <saida> <trabalho>

Segue o roteiro de src/jogo/show.ts (INTRO, ENTRADA, PAUSA, APLAUSO e o SETLIST, lidos do arquivo) e as regras do jogo
(src/audio/somVila.ts, segmentosDoShow e somDoFinal): a abertura em 0, a entrada em INTRO, cada música com a contagem e as
partes da `setlist` do índice (o laço toca a parte toda e para no fim dela em 50 ms; a frase toca inteira, com a cauda, e
se repete a cada `c` compassos), a torcida em laço de 0,4 s antes do fim da música até 0,6 s depois da contagem seguinte,
o chamado até o acorde final sozinho (o fim do chamado), e depois o acorde final (+2 dB), o aplauso (+4 dB, 1 s depois), a
torcida (+2 dB, de 2,5 s até sumir no fim) e os fogos (+1 dB, em 0,15 e 1,6 s). Tudo no mesmo ganho (o barramento do
show); as amostras levam +6 dB para ouvir no fone, como as de amostras.py.

Grava em <saida>: show-completo.mp3, um pedaço de cada parte nova, toques.mp3 (acordes do toque por cima da m2 e da m3) e
medidas-show.json: LUFS (BS.1770) de cada parte como o jogo toca, o volume de 3 em 3 s do show inteiro e os maiores saltos,
e o ebur128 do ffmpeg (I e LRA) do show inteiro, do refrão da m1 (as três camadas) e de cada parte nova.
"""
import sys, os, re, json, subprocess
import numpy as np
from scipy.signal import lfilter

ind_p, pac_p, show_ts, saida, trab = sys.argv[1:6]
SR = 22050
os.makedirs(saida, exist_ok=True)
os.makedirs(trab, exist_ok=True)
j = json.load(open(ind_p, encoding='utf-8'))
sh = j['temas']['vila-neon']['show'] if 'temas' in j else j['show']
pac = open(pac_p, 'rb').read()
TMP = os.path.join(trab, '_previa.mp3')


def dec_bytes(b):
    open(TMP, 'wb').write(b)
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', TMP, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, np.float32).astype(np.float64)


PS = sh['folga']
cl = {}
for cid, c in sh['clips'].items():
    y = dec_bytes(pac[c['o'][0]:c['o'][0] + c['o'][1]])
    cl[cid] = y[PS:PS + c['n']]

# ------------------------------------------------------------------ o roteiro, lido de src/jogo/show.ts
ts = open(show_ts, encoding='utf-8').read()
const = {k: float(re.search(rf'export const {k} = ([0-9.]+);', ts).group(1)) for k in ('INTRO', 'ENTRADA', 'PAUSA', 'APLAUSO')}
corpo = ts[ts.index('export const SETLIST'):]
musicas = []
for bloco in re.split(r"\n  \{\n", corpo)[1:4]:
    mid = re.search(r"id: '(m\d)'", bloco).group(1)
    bpm = float(re.search(r'bpm: (\d+)', bloco).group(1))
    forma = [(p, int(n)) for p, n in re.findall(r"parte\('(\w+)', (\d+)\)", bloco)]
    musicas.append(dict(id=mid, bpm=bpm, forma=forma))
assert [m['id'] for m in musicas] == [m['id'] for m in sh['setlist']], 'o SETLIST de show.ts e a setlist do índice'
roteiro = []
t = const['INTRO'] + const['ENTRADA']
for i, m in enumerate(musicas):
    if i:
        t += const['PAUSA']
    comp = 240 / m['bpm']
    r = dict(m=m, contagem=t, inicio=t + comp, compasso=comp, partes=[])
    c0 = 0
    for p, n in m['forma']:
        r['partes'].append(dict(pedaco=p, ini=r['inicio'] + c0 * comp, compassos=n))
        c0 += n
    r['fim'] = r['inicio'] + c0 * comp
    roteiro.append(r)
    t = r['fim']
ult = roteiro[-1]['partes'][-1]
FINAL = ult['ini'] + ult['compassos'] * roteiro[-1]['compasso']     # sem toque: o acorde vem no fim do chamado
TOTAL = FINAL + const['APLAUSO']

# ------------------------------------------------------------------ a montagem
out = np.zeros(int((TOTAL + 2) * SR))
db_lin = lambda d: 10 ** (d / 20)


def por(x, t0, ganho=1.0, fim=None, laco=False, entrada=0.0):
    i0 = int(round(t0 * SR))
    if laco:
        n = int(round((fim - t0) * SR))
        x = np.tile(x, n // len(x) + 2)[:n]
    elif fim is not None:
        x = x[:max(0, int(round((fim - t0) * SR)))]
    x = x * ganho
    if fim is not None and len(x):
        k = min(len(x), int(0.05 * SR))
        x = x.copy()
        x[-k:] *= np.linspace(1, 0, k)
    if entrada:
        k = min(len(x), int(entrada * SR))
        x = x.copy()
        x[:k] *= 1 - np.exp(-np.arange(k) / (entrada / 3 * SR))
    out[i0:i0 + len(x)] += x[:max(0, len(out) - i0)]


linha = []   # (início, fim, o que) para o relatório
por(cl[sh['abertura']], 0)
linha.append((0, const['INTRO'], 'abertura'))
por(cl[sh['entrada']], const['INTRO'], fim=min(FINAL, const['INTRO'] + len(cl[sh['entrada']]) / SR))
linha.append((const['INTRO'], roteiro[0]['contagem'], 'entrada'))
partes_t = {}
for k, r in enumerate(roteiro):
    m = sh['setlist'][k]
    por(cl[m['contagem']], r['contagem'])
    linha.append((r['contagem'], r['inicio'], f"{m['id']} contagem"))
    for p in r['partes']:
        ini, fim_p = p['ini'], p['ini'] + p['compassos'] * r['compasso']
        partes_t.setdefault(f"{m['id']}_{p['pedaco']}", []).append((ini, fim_p))
        linha.append((ini, fim_p, f"{m['id']} {p['pedaco']}"))
        for cid in m['partes'][p['pedaco']]:
            c = sh['clips'][cid]
            if 'laco' in c:
                por(cl[cid], ini, fim=min(fim_p, FINAL), laco=True)
                continue
            passo = c.get('c', p['compassos']) * r['compasso']
            tt = ini
            while tt < fim_p - 1e-6 and tt < FINAL:
                por(cl[cid], tt, fim=FINAL if tt + len(cl[cid]) / SR > FINAL else None)
                tt += passo
    if k + 1 < len(roteiro):
        a, b = r['fim'] - 0.4, roteiro[k + 1]['contagem'] + 0.6
        por(cl[sh['torcida']], a, fim=b, laco=True)
        linha.append((r['fim'], roteiro[k + 1]['contagem'], 'pausa (torcida)'))
fin = sh['setlist'][-1].get('final', 'final')
por(cl[fin], FINAL, db_lin(2))
por(cl['aplauso'], FINAL + 1, db_lin(4))
x = np.tile(cl[sh['torcida']], 4)
tc0, tc1 = FINAL + 2.5, FINAL + const['APLAUSO'] - 0.5
n = int((tc1 - tc0) * SR)
x = np.tile(cl[sh['torcida']], n // len(cl[sh['torcida']]) + 2)[:n]
tt = np.arange(n) / SR + tc0
x = x * np.interp(tt, [tc0, FINAL + const['APLAUSO'] - 5, tc1], [1, 1, 0])
por(x, tc0, db_lin(2), entrada=1.2)
for q in (0.15, 1.6):
    por(cl[sh['fogos']], FINAL + q, db_lin(1))
linha.append((FINAL, TOTAL, 'acorde final, aplauso, torcida e fogos'))
out = out[:int(TOTAL * SR)]


# ------------------------------------------------------------------ medidas
def lufs(x):
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
    z = np.array([np.mean(y[i:i + blk] ** 2) for i in range(0, max(1, len(y) - blk), passo)])
    lz = -0.691 + 10 * np.log10(z + 1e-20)
    z1 = z[lz > -70]
    if not len(z1):
        return -99.0
    rel = -0.691 + 10 * np.log10(np.mean(z1)) - 10
    z2 = z1[(-0.691 + 10 * np.log10(z1)) > rel]
    return round(float(-0.691 + 10 * np.log10(np.mean(z2))), 2)


def curto(x, t0, d=3.0):
    return lufs(x[int(t0 * SR):int((t0 + d) * SR)])


def wav(nome, x):
    p_ = os.path.join(trab, nome + '.wav')
    raw = np.clip(x, -1, 1).astype('<f4').tobytes()
    import struct
    with open(p_, 'wb') as f:
        f.write(b'RIFF' + struct.pack('<I', 36 + len(raw)) + b'WAVEfmt ' + struct.pack('<IHHIIHH', 16, 3, 1, SR, SR * 4, 4, 32) + b'data' + struct.pack('<I', len(raw)) + raw)
    return p_


def ebur128(x, nome):
    p_ = wav(nome, x)
    r = subprocess.run(['ffmpeg', '-nostats', '-i', p_, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True)
    txt = r.stderr[r.stderr.rfind('Summary:'):]
    i_ = float(re.search(r'I:\s+(-?[0-9.]+) LUFS', txt).group(1))
    lra = float(re.search(r'LRA:\s+(-?[0-9.]+) LU', txt).group(1))
    os.remove(p_)
    return dict(I=i_, LRA=lra)


# o refrão da m1 com as três camadas juntas (8 compassos, como a régua do pacote)
CPS = sh['amostrasCompasso']
ref_x = np.zeros(8 * CPS + 2 * SR)
for cam in sh['camadas']:
    y = cl[f'{cam}_refrao']
    ref_x[:len(y)] += y
    ref_x[4 * CPS:4 * CPS + len(y)] += y
ref_x = ref_x[:8 * CPS]
med = {'refraoM1': dict(lufs=lufs(ref_x), ebur128=ebur128(ref_x, 'ref')), 'partes': {}}
REF = med['refraoM1']['ebur128']['I']
for nome, vezes in partes_t.items():
    seg = np.concatenate([out[int(a * SR):int(b * SR)] for a, b in vezes])
    e = ebur128(seg, nome)
    med['partes'][nome] = dict(lufs=lufs(seg), ebur128=e, relRefLU=round(e['I'] - REF, 1), vezes=len(vezes))
for nome, (a, b) in {'abertura': (0, const['INTRO']), 'estouro (18 a 21 s)': (18, 21), 'entrada': (const['INTRO'], roteiro[0]['contagem']),
                     'pausa m1-m2': (roteiro[0]['fim'], roteiro[1]['contagem']), 'pausa m2-m3': (roteiro[1]['fim'], roteiro[2]['contagem']),
                     'final (24 s)': (FINAL, TOTAL), 'acorde final (3 s)': (FINAL, FINAL + 3)}.items():
    seg = out[int(a * SR):int(b * SR)]
    e = ebur128(seg, 'x')
    med['partes'][nome] = dict(lufs=lufs(seg), ebur128=e, relRefLU=round(e['I'] - REF, 1))
med['showInteiro'] = ebur128(out, 'show')
curva = [(round(t0, 1), curto(out, t0)) for t0 in np.arange(0, TOTAL - 3, 1.0)]
saltos = sorted(((round(b[1] - a[1], 1), a[0]) for a, b in zip(curva[:-3], curva[3:]) if a[1] > -60 and b[1] > -60),
                key=lambda s: -abs(s[0]))[:12]
med['curva3s'] = curva
med['maioresSaltos3s'] = [dict(t=t0, deLU=s) for s, t0 in saltos]
med['linhaDoTempo'] = [dict(ini=round(a, 2), fim=round(b, 2), o=o) for a, b, o in linha]
med['duracao'] = round(TOTAL, 2)
med['picoDb'] = round(float(20 * np.log10(np.max(np.abs(out)))), 2)
json.dump(med, open(os.path.join(saida, 'medidas-show.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


# ------------------------------------------------------------------ amostras (+6 dB para o fone)
def mp3(nome, x, fade=0.0):
    x = x * db_lin(6)
    if fade:
        k = int(fade * SR)
        x = x.copy()
        x[-k:] *= np.linspace(1, 0, k) ** 1.5
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '96k',
                    '-map_metadata', '-1', os.path.join(saida, nome + '.mp3')], input=np.clip(x, -1, 1).astype('<f4').tobytes(), check=True)


def trecho(a, b):
    return out[int(a * SR):int(b * SR)]


mp3('show-completo', out)
R1, R2, R3 = roteiro
pi = {f"{r['m']['id']}_{p['pedaco']}_{i}": p['ini'] for r in roteiro for i, p in enumerate(r['partes'])}
amostras = {
    '01-abertura-e-entrada': (0, R1['inicio'] + 4),
    '02-m1-solo-subida-refrao': (pi['m1_solo_4'] - 3, pi['m1_refrao_6'] + 3),
    '03-m1-fim-pausa-m2-intro-verso': (pi['m1_fim_7'] - 2, pi['m2_verso_1'] + 8),
    '04-m2-verso-refrao': (pi['m2_refrao_2'] - 6, pi['m2_refrao_2'] + 14),
    '05-m2-ponte-refrao': (pi['m2_ponte_5'] - 2, pi['m2_refrao_6'] + 8),
    '06-m2-fim-pausa-m3-intro': (pi['m2_fim_7'] - 3, pi['m3_verso_1'] + 6),
    '07-m3-verso-refrao': (pi['m3_refrao_2'] - 8, pi['m3_refrao_2'] + 20),
    '08-m3-solo-chamado-final-fim': (pi['m3_solo_5'] - 3, TOTAL),
}
for nome, (a, b) in amostras.items():
    mp3(nome, trecho(a, b), fade=0.8)
# os toques: o acorde do compasso por cima do verso e do refrão da m2 e da m3, no oitavo de compasso
toq = []
for r, k, partes in ((R2, 1, ('verso', 'refrao')), (R3, 2, ('verso', 'refrao'))):
    m = sh['setlist'][k]
    giro = [0, 1, 2, 0] if m['id'] == 'm2' else [0, 1, 0, 2]
    for pn in partes:
        p = next(p for p in r['partes'] if p['pedaco'] == pn)
        x = trecho(p['ini'], p['ini'] + 8 * r['compasso']).copy()
        for oit in (0, 3, 9, 14, 19, 22, 28, 33, 36, 41, 47, 52, 57, 61):
            tq = oit * r['compasso'] / 8
            bar = int(tq // r['compasso'])
            y = cl[m['acordes'][giro[bar % 4]]]
            i = int(tq * SR)
            x[i:i + len(y)] += y[:len(x) - i]
        toq.append(x)
mp3('toques', np.concatenate(toq), fade=0.8)
os.remove(TMP)
print(json.dumps({k: med['partes'][k]['relRefLU'] for k in med['partes']}, ensure_ascii=False))
print('ref', med['refraoM1'], 'show', med['showInteiro'], 'dur', med['duracao'], 'pico', med['picoDb'])
print('saltos', med['maioresSaltos3s'])
