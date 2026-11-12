"""Codifica cada WAV dos veículos em MP3 mono 22 050 Hz CBR (48 kbps; 64 na musiquinha), sem metadados e sem quadro Xing (como
scripts-pacote/vozes_codificar.py), decodifica e mede. Se o RMS "enquanto soa" do MP3 sair do alvo (-23 dB) por mais de 0,4 dB,
regrava com o ganho corrigido; o pico nunca passa de -1 dBFS. O ganho é o único processamento aqui, então os laços continuam periódicos.
Mede também o volume integrado (LUFS, ebur128 do ffmpeg; fica null abaixo de 0,4 s, o bloco de medida do ebur128).
Rodar tudo de novo: ver rodar.sh. Este passo: python3 -I veiculos_codificar.py <wav> <mp3> <receitas.json> <medidas.json>
"""
import sys, os, json, subprocess
import numpy as np
SR = 22050
wavd, mp3d, rec_p, medp = sys.argv[1:5]
rec = json.load(open(rec_p, encoding='utf-8'))['arquivos']


def dec(p):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(r, dtype=np.float32).astype(np.float64)


def rms_ativo(x):
    w = int(0.05 * SR); n = len(x) // w
    if n == 0:
        return float(20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12))
    r = np.sqrt(np.mean(x[:n * w].reshape(n, w) ** 2, axis=1)); r = r[r > 0.001]
    return float(20 * np.log10(np.sqrt(np.mean(r ** 2)))) if len(r) else -99.0


def lufs(m):
    e = subprocess.run(['ffmpeg', '-nostats', '-i', m, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    li = [l for l in e.splitlines() if l.strip().startswith('I:')]
    return float(li[-1].split()[1]) if li else None


def cod(w, m, kbps, ganho_db=0.0):
    af = ['-af', f'volume={ganho_db:.2f}dB'] if abs(ganho_db) > 0.01 else []
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', w] + af + ['-c:a', 'libmp3lame', '-b:a', f'{kbps}k', '-ar', str(SR), '-ac', '1',
                    '-map_metadata', '-1', '-id3v2_version', '0', '-write_xing', '0', m], check=True)


os.makedirs(mp3d, exist_ok=True)
med = {}
for cid, r_ in rec.items():
    w = os.path.join(wavd, cid + '.wav')
    m = os.path.join(mp3d, cid + '.mp3')
    g, A = 0.0, r_['alvoDb']
    for _ in range(6):
        cod(w, m, r_['kbps'], g); x = dec(m); r = rms_ativo(x); pk = 20 * np.log10(np.abs(x).max() + 1e-12)
        corr = A - r
        if pk + corr > -1.0:
            corr = -1.0 - pk
        if abs(corr) <= 0.4 and pk <= -1.0:
            break
        g += corr
    med[cid] = {'seg': round(len(x) / SR, 3), 'segWav': round(r_['amostrasWav'] / r_['taxaWav'], 3), 'kbps': r_['kbps'], 'alvoDb': A,
                'rmsDb': round(r, 1), 'picoDb': round(float(pk), 1), 'lufs': lufs(m) if len(x) >= 0.4 * SR else None, 'bytes': os.path.getsize(m), 'ganhoExtraDb': round(g, 2),
                'cortes': int((np.abs(x) >= 0.999).sum())}
    print(cid, med[cid], flush=True)
json.dump(med, open(medp, 'w'), indent=1)
for k, v in med.items():
    if abs(v['rmsDb'] - v['alvoDb']) > 0.4:
        print('fora do alvo (o pico mandou):', k, v['rmsDb'], v['picoDb'])
