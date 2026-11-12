"""Mistura "praça de dia" (20 s): a trilha da cidade como sai no arquivo + pombos, pardal, cachorro e a buzininha ao longe,
cada um 6 a 10 dB abaixo do arquivo (como bicho a alguns blocos). Uso: python3 -I praca.py <final> <saida.mp3>"""
import sys, subprocess, numpy as np
SR = 22050
fin, out = sys.argv[1:3]
def dec(p): return np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',p,'-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True,check=True).stdout,np.float32).astype(np.float64)
m = dec(fin + '/cidade-dia.mp3')[:int(21 * SR)].copy()
for nome, t, g in [('sons/pombo-chamado', 1.5, -8), ('sons/pardal', 4.2, -10), ('sons/buzininha-longe', 7.0, -4), ('sons/pombo-contente', 9.8, -9),
                   ('sons/cachorro-chamado', 12.5, -12), ('sons/pardal', 15.0, -11), ('sons/buzininha-longe', 17.3, -6)]:
    s = dec(f'{fin}/{nome}.mp3') * 10 ** (g / 20); i = int(t * SR); m[i:i + len(s)] += s[:len(m) - i]
n = int(2.0 * SR); m[-n:] *= np.linspace(1, 0, n) ** 1.5
print('rms', round(20*np.log10(np.sqrt(np.mean(m**2))),2), 'pico', round(20*np.log10(np.max(np.abs(m))),2))
subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','1','-i','-','-c:a','libmp3lame','-b:a','64k','-map_metadata','-1',out],input=np.clip(m,-1,1).astype('<f4').tobytes(),check=True)
