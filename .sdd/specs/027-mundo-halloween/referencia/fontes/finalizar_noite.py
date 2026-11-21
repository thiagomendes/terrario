"""Nivela, fecha e codifica a amostra de música e a folha de sons da Noite das Fantasias (esboço da spec 027).

Música (render do FluidSynth, 44,1 kHz estéreo): corta o silêncio do começo, entrada suave de 0,25 s, guarda 1,1 s de cauda
depois da última nota e fecha com um esmaecimento de 0,7 s; leva a -16 LUFS integrado (BS.1770-4, a conta do filtro K com as
duas portas) e segura o pico verdadeiro (sobreamostragem de 4x) em -2 dBTP com um limitador macio de antecipação (5 ms de
antecipação, 80 ms de soltura): só as batidas mais fortes do xilofone passam por ele, e a redução máxima fica anotada nas
medidas. MP3 estéreo, 44,1 kHz, 160 kbps (como a amostra da 026).
Sons: o volume de um som curto é medido pela maior sonoridade momentânea (janela de 400 ms, com o som completado com
silêncio), alvo -17 LUFS, com o mesmo limitador segurando o pico verdadeiro em -3,5 dBTP. MP3 mono, 44,1 kHz, 128 kbps.
Depois de codificar, mede cada MP3 de novo com o ffmpeg (ebur128 com pico verdadeiro e volumedetect) e grava tudo em
<medidas.json>.
Uso: python3 -I finalizar_noite.py <musica.wav> <musica.json> <pasta_sons_wav> <pasta_saida_mp3> <trabalho> <medidas.json>
  (<musica.json> é o que o compor_noite.py escreve junto do MIDI: onde termina a última nota)
"""
import sys
import os
import re
import json
import struct
import subprocess
import numpy as np
from scipy.signal import lfilter, resample_poly
from scipy.ndimage import minimum_filter1d

ALVO_MUSICA, TETO_MUSICA = -16.0, -2.0
ALVO_SOM, TETO_SOM = -17.0, -3.5


def ler(c):
    b = open(c, 'rb').read()
    i, fmt = 12, None
    while i < len(b):
        cid, n = b[i:i + 4], struct.unpack('<I', b[i + 4:i + 8])[0]
        if cid == b'fmt ':
            fmt = struct.unpack('<HHIIHH', b[i + 8:i + 24])
        if cid == b'data':
            dados = b[i + 8:i + 8 + n]
            break
        i += 8 + n + (n & 1)
    tag, ch, sr, _, _, bits = fmt
    x = np.frombuffer(dados, '<f4') if (tag == 3 or bits == 32) else np.frombuffer(dados, '<i2').astype(np.float32) / 32768
    return x.reshape(-1, ch).astype(np.float64), sr


def gravar(c, x, sr):
    x = np.atleast_2d(x.T).T if x.ndim == 1 else x
    ch = x.shape[1]
    raw = x.astype('<f4').tobytes()
    with open(c, 'wb') as f:
        f.write(b'RIFF' + struct.pack('<I', 36 + len(raw)) + b'WAVEfmt '
                + struct.pack('<IHHIIHH', 16, 3, ch, sr, sr * 4 * ch, 4 * ch, 32) + b'data' + struct.pack('<I', len(raw)) + raw)


def filtro_k(x, sr):
    G, Qs, fc = 3.99984385397, 0.7071752369554193, 1681.9744509555319
    A = 10 ** (G / 40)
    w0 = 2 * np.pi * fc / sr
    al = np.sin(w0) / (2 * Qs)
    c = np.cos(w0)
    b = [A * ((A + 1) + (A - 1) * c + 2 * np.sqrt(A) * al), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - 2 * np.sqrt(A) * al)]
    a = [(A + 1) - (A - 1) * c + 2 * np.sqrt(A) * al, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - 2 * np.sqrt(A) * al]
    y = lfilter(b, a, x, axis=0)
    fh, Qh = 38.13547087613982, 0.5003270373253953
    w0 = 2 * np.pi * fh / sr
    al = np.sin(w0) / (2 * Qh)
    c = np.cos(w0)
    return lfilter([(1 + c) / 2, -(1 + c), (1 + c) / 2], [1 + al, -2 * c, 1 - al], y, axis=0)


def blocos(x, sr):
    y = filtro_k(x, sr)
    blk, passo = int(0.4 * sr), int(0.1 * sr)
    if len(y) < blk:
        y = np.concatenate([y, np.zeros((blk - len(y), y.shape[1]))])
    return np.array([np.sum(np.mean(y[i:i + blk] ** 2, axis=0)) for i in range(0, len(y) - blk + 1, passo)])


def lufs_integrado(x, sr):
    z = blocos(x, sr)
    lz = -0.691 + 10 * np.log10(z + 1e-20)
    z1 = z[lz > -70]
    rel = -0.691 + 10 * np.log10(np.mean(z1)) - 10
    z2 = z1[(-0.691 + 10 * np.log10(z1)) > rel]
    return float(-0.691 + 10 * np.log10(np.mean(z2)))


def lufs_momentaneo_max(x, sr):
    # completa com silêncio dos dois lados: um som curto cabe inteiro em alguma janela
    pad = np.zeros((int(0.4 * sr), x.shape[1]))
    z = blocos(np.concatenate([pad, x, pad]), sr)
    return float(-0.691 + 10 * np.log10(np.max(z) + 1e-20))


def pico_verdadeiro(x):
    return float(20 * np.log10(np.max(np.abs(resample_poly(x, 4, 1, axis=0))) + 1e-20))


def limitar(x, sr, teto_db, antecipa=0.005, solta=0.08):
    """Limitador macio: o ganho necessário em cada amostra (pelo pico sobreamostrado), mínimo numa janela de 2x a
    antecipação, soltura exponencial e alisamento: o ganho já está descendo quando a batida chega, sem estalo."""
    teto = 10 ** (teto_db / 20)
    p = np.max(np.abs(resample_poly(x, 4, 1, axis=0)), axis=1)
    p = np.max(p[:len(x) * 4].reshape(-1, 4), axis=1)
    p = np.concatenate([p, np.zeros(len(x) - len(p))])
    req = np.minimum(1.0, teto / np.maximum(p, 1e-12))
    L = max(1, int(antecipa * sr))
    g = minimum_filter1d(req, size=2 * L + 1, mode='nearest')
    k = 1 - np.exp(-1 / (solta * sr))
    if np.any(g < 1):
        g = g.copy()
        for i in range(1, len(g)):
            if g[i] > g[i - 1]:
                g[i] = g[i - 1] + (g[i] - g[i - 1]) * k
    g = np.convolve(np.pad(g, (L, L), mode='edge'), np.ones(L) / L, mode='same')[L:-L]
    g = np.minimum(g, minimum_filter1d(req, size=L // 2 * 2 + 1, mode='nearest'))
    return x * g[:, None], (float(20 * np.log10(np.min(g))), float(np.mean(g < 10 ** (-1 / 20))), float(np.mean(g < 10 ** (-3 / 20))))


def nivelar(x, sr, medir, alvo, teto):
    g, y, red = alvo - medir(x, sr), x, (0.0, 0.0, 0.0)
    for _ in range(4):
        y, red = limitar(x * 10 ** (g / 20), sr, teto)
        erro = alvo - medir(y, sr)
        if abs(erro) < 0.05:
            break
        g += erro
    return y, g, red


def ffmpeg_medidas(mp3):
    r = subprocess.run(['ffmpeg', '-nostats', '-hide_banner', '-i', mp3, '-af', 'ebur128=peak=true:framelog=info,volumedetect',
                       '-f', 'null', '-'], capture_output=True, text=True).stderr
    mmax = max((float(m) for m in re.findall(r' M:\s*(-?[\d.]+)', r)), default=None)
    resumo = r[r.rfind('Summary:'):]
    g = lambda pad, txt: float(re.search(pad, txt).group(1))
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3],
                               capture_output=True, text=True).stdout)
    return dict(segundos=round(dur, 3), lufsIntegrado=g(r'I:\s*(-?[\d.]+) LUFS', resumo), lraLU=g(r'LRA:\s*(-?[\d.]+) LU', resumo),
                picoVerdadeiroDbtp=g(r'Peak:\s*(-?[\d.]+) dBFS', resumo), momentaneoMaxLufs=mmax,
                volumeMedioDb=g(r'mean_volume:\s*(-?[\d.]+) dB', r), volumeMaxDb=g(r'max_volume:\s*(-?[\d.]+) dB', r))


musica_wav, musica_json, sons_dir, saida, trab, medidas_json = sys.argv[1:7]
os.makedirs(saida, exist_ok=True)
os.makedirs(trab, exist_ok=True)
medidas = {}

# ------------------------------------------------------------------ a música
x, sr = ler(musica_wav)
env = np.max(np.abs(x), axis=1)
ativo = np.where(env > 10 ** (-60 / 20))[0]
ini = max(0, ativo[0] - int(0.01 * sr))
fim_nota = json.load(open(musica_json))['fimUltimaNotaS']
fim = min(len(x), ini + int((fim_nota + 1.1) * sr))
x = x[ini:fim].copy()
t = np.arange(len(x)) / sr
x *= np.minimum(1, t / 0.25)[:, None]
x *= np.clip((t[-1] - t) / 0.7, 0, 1)[:, None] ** 1.5
x, g, red = nivelar(x, sr, lufs_integrado, ALVO_MUSICA, TETO_MUSICA)
w = os.path.join(trab, 'noite-das-fantasias-demo.wav')
mp3 = os.path.join(saida, 'noite-das-fantasias-demo.mp3')
for _ in range(2):
    # o MP3 muda um pouquinho a medida (alguns décimos): uma correção pela medida do próprio MP3
    gravar(w, x, sr)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', w, '-c:a', 'libmp3lame', '-b:a', '160k', '-ar', '44100', '-ac', '2',
                    '-map_metadata', '-1', mp3], check=True)
    m = ffmpeg_medidas(mp3)
    corr = min(ALVO_MUSICA - m['lufsIntegrado'], TETO_MUSICA + 0.5 - m['picoVerdadeiroDbtp'])
    if abs(corr) < 0.15:
        break
    x *= 10 ** (corr / 20)
    g += corr
medidas['noite-das-fantasias-demo'] = dict(wav=dict(lufsIntegrado=round(lufs_integrado(x, sr), 2), picoVerdadeiroDbtp=round(pico_verdadeiro(x), 2),
                                                    ganhoDb=round(g, 2), limitadorMaxDb=round(red[0], 2),
                    limitadorTempoAcima1dB=round(red[1], 4), limitadorTempoAcima3dB=round(red[2], 4)), mp3=ffmpeg_medidas(mp3))

# ------------------------------------------------------------------ os sons
for arq in sorted(os.listdir(sons_dir)):
    if not arq.endswith('.wav'):
        continue
    nome = arq[:-4]
    y, sr = ler(os.path.join(sons_dir, arq))
    y = y[:, :1]
    # corta a cauda abaixo de -60 dB e fecha com 30 ms
    a = np.where(np.abs(y[:, 0]) > 10 ** (-60 / 20) * np.max(np.abs(y)))[0]
    y = y[:a[-1] + int(0.03 * sr)].copy()
    tt = np.arange(len(y)) / sr
    y *= np.clip((tt[-1] - tt) / 0.03, 0, 1)[:, None]
    y, g, red = nivelar(y, sr, lufs_momentaneo_max, ALVO_SOM, TETO_SOM)
    w = os.path.join(trab, arq)
    gravar(w, y, sr)
    mp3 = os.path.join(saida, nome + '.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', w, '-c:a', 'libmp3lame', '-b:a', '128k', '-ar', '44100', '-ac', '1',
                    '-map_metadata', '-1', mp3], check=True)
    medidas[nome] = dict(wav=dict(momentaneoMaxLufs=round(lufs_momentaneo_max(y, sr), 2), picoVerdadeiroDbtp=round(pico_verdadeiro(y), 2),
                                  ganhoDb=round(g, 2), limitadorMaxDb=round(red[0], 2),
                    limitadorTempoAcima1dB=round(red[1], 4), limitadorTempoAcima3dB=round(red[2], 4)), mp3=ffmpeg_medidas(mp3))

json.dump(medidas, open(medidas_json, 'w'), ensure_ascii=False, indent=1)
for k, v in medidas.items():
    m = v['mp3']
    print(f"{k:28s} {m['segundos']:6.2f} s  I {m['lufsIntegrado']:6.1f}  Mmax {m['momentaneoMaxLufs']}  TP {m['picoVerdadeiroDbtp']:5.1f}  "
          f"média {m['volumeMedioDb']:6.1f}  máx {m['volumeMaxDb']:5.1f}  (ganho {v['wav']['ganhoDb']:+.1f} dB, limitador {v['wav']['limitadorMaxDb']:+.1f} dB, "
          f"{100 * v['wav']['limitadorTempoAcima1dB']:.1f}% do tempo acima de 1 dB)")
