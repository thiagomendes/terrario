"""Codifica cada WAV das vozes da festa em MP3 mono 22 050 Hz 48 kbps CBR, sem metadados e sem quadro Xing (como a 019 e a 014,
014/scripts-pacote/vozes_codificar.py), decodifica e mede. Se o RMS "enquanto soa" do MP3 sair do alvo por mais de 0,4 dB, regrava
com o ganho corrigido; o pico nunca passa de -1 dBFS. Alvo: -23 dB; o ambiente -27.
Mede também, de cada MP3, a maior sonoridade momentânea (ebur128 do ffmpeg, janela de 400 ms): a régua da spec 027 é nenhum
som acima de -12 LUFS momentâneo no arquivo.
Rodar tudo de novo: ver rodar.sh. Este passo: python3 -I vozes_codificar.py <wav> <mp3> <medidas.json>
"""
import sys, os, re, json, subprocess, glob
import numpy as np
SR = 22050
TETO_LUFS_M = -12.0
wavd, mp3d, medp = sys.argv[1:4]


def alvo(cid):
    return -27.0 if cid.startswith('ambiente.') else -23.0


def dec(p):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(r, dtype=np.float32).astype(np.float64)


def rms_ativo(x):
    w = int(0.05 * SR); n = len(x) // w
    if n == 0:
        return float(20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12))
    r = np.sqrt(np.mean(x[:n * w].reshape(n, w) ** 2, axis=1)); r = r[r > 0.001]
    return float(20 * np.log10(np.sqrt(np.mean(r ** 2)))) if len(r) else -99.0


def lufs_m_max(mp3):
    # (com 0,5 s de silêncio antes e depois: o som curto cabe inteiro numa janela de 400 ms)
    r = subprocess.run(['ffmpeg', '-nostats', '-hide_banner', '-f', 'lavfi', '-i', 'anullsrc=r=22050:cl=mono:d=0.5', '-i', mp3,
                        '-f', 'lavfi', '-i', 'anullsrc=r=22050:cl=mono:d=0.5', '-filter_complex', '[0][1][2]concat=n=3:v=0:a=1,ebur128=framelog=info',
                        '-f', 'null', '-'], capture_output=True, text=True).stderr
    return max((float(m) for m in re.findall(r' M:\s*(-?[\d.]+)', r)), default=-99.0)


def cod(w, m, ganho_db=0.0):
    af = ['-af', f'volume={ganho_db:.2f}dB'] if abs(ganho_db) > 0.01 else []
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', w] + af + ['-c:a', 'libmp3lame', '-b:a', '48k', '-ar', str(SR), '-ac', '1', '-map_metadata', '-1',
                    '-id3v2_version', '0', '-write_xing', '0', m], check=True)


os.makedirs(mp3d, exist_ok=True)
med = {}
for w in sorted(glob.glob(os.path.join(wavd, '*.wav'))):
    cid = os.path.basename(w)[:-4]
    m = os.path.join(mp3d, cid + '.mp3')
    g, A = 0.0, alvo(cid)
    for _ in range(6):
        cod(w, m, g); x = dec(m); r = rms_ativo(x); pk = 20 * np.log10(np.abs(x).max() + 1e-12)
        corr = A - r
        if pk + corr > -1.0:
            corr = -1.0 - pk
        if abs(corr) <= 0.4 and pk <= -1.0:
            break
        g += corr
    sp = np.abs(np.fft.rfft(x)); fr = np.fft.rfftfreq(len(x), 1 / SR)
    med[cid] = {'seg': round(len(x) / SR, 3), 'alvoDb': A, 'rmsDb': round(r, 1), 'picoDb': round(float(pk), 1), 'bytes': os.path.getsize(m),
                'ganhoExtraDb': round(g, 2), 'cortes': int((np.abs(x) >= 0.999).sum()), 'lufsMomentaneoMax': round(lufs_m_max(m), 1),
                'centroideHz': round(float((sp * fr).sum() / (sp.sum() + 1e-12))),
                'acima4k': round(float((sp[fr > 4000] ** 2).sum() / ((sp ** 2).sum() + 1e-12)), 3)}
json.dump(med, open(medp, 'w'), indent=1)
rr = np.array([v['rmsDb'] - v['alvoDb'] for v in med.values()]); pp = np.array([v['picoDb'] for v in med.values()])
mm = max(v['lufsMomentaneoMax'] for v in med.values())
print('arquivos', len(med), 'kb', round(sum(v['bytes'] for v in med.values()) / 1024, 1), 'seg', round(sum(v['seg'] for v in med.values()), 1),
      'rms-alvo min/max', rr.min(), rr.max(), 'pico max', pp.max(), 'cortes', sum(v['cortes'] for v in med.values()), 'LUFS M máx', mm)
for k, v in med.items():
    if abs(v['rmsDb'] - v['alvoDb']) > 0.4:
        print('fora do alvo (o pico mandou):', k, v['rmsDb'], v['picoDb'])
assert mm <= TETO_LUFS_M, f'som acima de {TETO_LUFS_M} LUFS momentâneo: {mm}'
