"""Codifica cada WAV de /t/wav em MP3 mono 22050 Hz ~48 kbps (/o/<mesmo caminho>.mp3), decodifica e mede.
Se o RMS ativo do MP3 sair do alvo (-23 dB) por mais de 0,4 dB, regrava com ganho corrigido; nunca deixa o pico passar de -1 dBFS.
Uso: python3 -I codificar.py  -> /t/medidas.json"""
import sys, os, json, subprocess, glob, numpy as np
SR = 22050; ALVO = -23.0


def dec(p):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(r, dtype=np.float32).astype(np.float64)


def rms_ativo(x):
    w = int(0.05 * SR); n = len(x) // w
    if n == 0: return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
    r = np.sqrt(np.mean(x[:n * w].reshape(n, w) ** 2, axis=1)); r = r[r > 0.001]
    return float(20 * np.log10(np.sqrt(np.mean(r ** 2)))) if len(r) else -99.0


def f0s(x, passo=0.04, jan=0.04):
    out = []; n = int(jan * SR)
    for i in range(0, len(x) - n, int(passo * SR)):
        m = x[i:i + n]; m = m - m.mean()
        if np.sqrt(np.mean(m ** 2)) < 0.02: continue
        ac = np.correlate(m, m, 'full')[n - 1:]; lo, hi = SR // 1800, SR // 70
        k = lo + int(np.argmax(ac[lo:hi]))
        if ac[k] / ac[0] > 0.5: out.append(round(SR / k))
    return out


def cod(w, m, ganho_db=0.0):
    af = ['-af', f'volume={ganho_db:.2f}dB'] if abs(ganho_db) > 0.01 else []
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', w] + af + ['-c:a', 'libmp3lame', '-b:a', '48k', '-ar', str(SR), '-ac', '1', '-map_metadata', '-1', '-id3v2_version', '0', '-write_xing', '0', m], check=True)


med = {}
ws = sorted(glob.glob('/t/wav/**/*.wav', recursive=True))
for w in ws:
    cid = os.path.relpath(w, '/t/wav')[:-4]; m = f'/o/{cid}.mp3'; os.makedirs(os.path.dirname(m), exist_ok=True)
    g = 0.0
    for tent in range(5):
        cod(w, m, g); x = dec(m); r = rms_ativo(x); pk = 20 * np.log10(np.abs(x).max() + 1e-12)
        corr = ALVO - r
        if pk + corr > -1.0: corr = -1.0 - pk          # o pico manda
        if abs(corr) <= 0.4: break
        g += corr
    a = np.abs(x); sp = np.abs(np.fft.rfft(x)); fr = np.fft.rfftfreq(len(x), 1 / SR)
    alto = float((sp[fr > 4000] ** 2).sum() / ((sp ** 2).sum() + 1e-12))
    med[cid] = {'seg': round(len(x) / SR, 3), 'rmsDb': round(r, 1), 'picoDb': round(float(pk), 1), 'bytes': os.path.getsize(m), 'ganhoExtraDb': round(g, 2),
                'cortes': int((a >= 0.999).sum()), 'centroideHz': round(float((sp * fr).sum() / (sp.sum() + 1e-12))), 'acima4k': round(alto, 3), 'f0': f0s(x)[:20]}
json.dump(med, open('/t/medidas.json', 'w'), indent=1)
tot = sum(v['bytes'] for v in med.values()); seg = sum(v['seg'] for v in med.values())
print('arquivos', len(med), 'kb', round(tot / 1024), 'seg', round(seg, 1))
rr = np.array([v['rmsDb'] for v in med.values()]); pp = np.array([v['picoDb'] for v in med.values()])
print('rms min/med/max', rr.min(), np.median(rr), rr.max(), 'pico max', pp.max(), 'cortes', sum(v['cortes'] for v in med.values()))
