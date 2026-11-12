"""Sons da cidade para o esboço da 014 (mesma biblioteca e mesma régua das vozes da 019: RMS "enquanto soa" -23 dB, pico <= -1 dBFS).
Fontes (baixadas com commons_baixar.py, que recusa tudo que não for CC0/domínio público; BigSoundBank CC0):
  commons/pomba.ogg (Dove cooing, mary905, PD), commons/gato_pede.oga (Meow of a pleading cat, Heismark, PD),
  commons/gata_jovem.ogg (Maullido de gata hembra joven, George Miquilena, CC0), commons/cobaia_chilreio.ogg
  (Guinea Pig Chirping, PD), commons/pardal_sardin.oga (Passer domesticus tschilp, Joseph Sardin, CC0),
  bsb/2954.mp3 (Barking Dog #2, Joseph SARDIN, BigSoundBank, CC0). A buzininha é síntese própria.
Uso: BAIXADOS=/b python3 -I sons_cidade.py <pasta_saida> <medidas.json>
"""
import sys, os, json, subprocess
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import (ler, tom, filtro, banda, finalizar, salvar, juntar, mix, eco, sala, osc, adsr, glide, vibrato, bordas,
                 rms_ativo, limitar, SR, aparar)

saida, medp = sys.argv[1:3]
os.makedirs(saida, exist_ok=True)
C, B = 'commons/', 'bsb/'
sons = {}

# pombo: o "ruuu-cuu" da rolinha, mais grave e redondinho (pombo de praça)
p = ler(C + 'pomba.ogg')
sons['pombo-chamado'] = (finalizar(tom(p[int(1.0 * SR):int(2.8 * SR)], -3)), [C + 'pomba.ogg'])
sons['pombo-contente'] = (finalizar(tom(juntar([p[int(3.25 * SR):int(3.55 * SR)], p[int(5.5 * SR):int(5.82 * SR)]], 0.05), -1)), [C + 'pomba.ogg'])

# gato de rua: miau pedindo e miau de gatinha
g = ler(C + 'gato_pede.oga')
sons['gato-chamado'] = (finalizar(g[int(3.6 * SR):int(4.8 * SR)]), [C + 'gato_pede.oga'])
gj = ler(C + 'gata_jovem.ogg')
sons['gato-contente'] = (finalizar(tom(aparar(gj), 1)), [C + 'gata_jovem.ogg'])

# cachorro grande: "au-au" grave e amigo (o latido desce 3 semitons e perde o agudo)
d = ler(B + '2954.mp3')
au = juntar([d[int(0.08 * SR):int(0.32 * SR)], d[int(0.43 * SR):int(0.66 * SR)]], 0.1)
sons['cachorro-chamado'] = (finalizar(filtro(tom(au, -3), 'low', 4200, 2)), [B + '2954.mp3'])

# guaxinim travesso: não achamos gravação livre de guaxinim; é o chilreio de porquinho-da-índia mais grave e
# picadinho (o "trrr-trrr" de guaxinim) + um trinado nosso
c = ler(C + 'cobaia_chilreio.ogg')
pedacos = [c[int(a * SR):int(b * SR)] for a, b in [(0.87, 1.0), (1.07, 1.19), (1.29, 1.43), (1.5, 1.59)]]
trr = tom(juntar(pedacos, 0.03), -7)
n = int(0.32 * SR)
t = np.arange(n) / SR
trinado = osc(vibrato(glide(0.32, [(0, 900), (0.5, 1100), (1, 800)]), 28, 1.2)) * adsr(n, 0.01, 0.08) * (0.5 + 0.5 * np.sin(2 * np.pi * 22 * t)) ** 2
sons['guaxinim-chamado'] = (finalizar(juntar([trr, trinado * 0.35], 0.06)), [C + 'cobaia_chilreio.ogg', 'sintese'])

# passarinho de praça (pardal)
pa = ler(C + 'pardal_sardin.oga')
sons['pardal'] = (finalizar(juntar([pa[int(0.08 * SR):int(0.38 * SR)], pa[int(0.7 * SR):int(1.0 * SR)]], 0.12)), [C + 'pardal_sardin.oga'])


# buzininha de brinquedo ao longe: "fom-fom" de buzina de bulbo, síntese própria
def fom(dur, f0):
    n = int(dur * SR)
    f = glide(dur, [(0, f0 * 0.94), (0.15, f0), (1, f0 * 0.985)])
    y = osc(f, 'saw') * 0.6 + osc(f * 2, 'sine') * 0.25
    y = banda(y, 300, 2600)
    return y * adsr(n, 0.015, 0.06)


bz = juntar([fom(0.16, 466), fom(0.26, 466)], 0.07)
perto = finalizar(bz, mol=0.12)
sons['buzininha-perto'] = (perto, ['sintese'])
longe = filtro(eco(sala(bz, 0.35, 0.5, 2200), 0.21, 0.22, 2, 1800), 'low', 2300, 2)
sons['buzininha-longe'] = (finalizar(longe, alvo=-31, mol=0.2, sala_dur=0.3), ['sintese'])

med = {}
for nome, (x, fontes) in sons.items():
    w = os.path.join(saida, nome + '.wav')
    salvar(w, x)
    m = os.path.join(saida, nome + '.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', w, '-ac', '1', '-ar', '22050', '-c:a', 'libmp3lame', '-b:a', '48k', '-map_metadata', '-1', m], check=True)
    os.remove(w)
    y = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', m, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout, np.float32).astype(np.float64)
    med[nome] = dict(segundos=round(len(y) / SR, 2), rmsDb=round(rms_ativo(y), 1), picoDb=round(20 * np.log10(np.max(np.abs(y)) + 1e-12), 1),
                     kb=round(os.path.getsize(m) / 1024, 1), fontes=fontes)
json.dump(med, open(medp, 'w'), ensure_ascii=False, indent=1)
for k, v in med.items():
    print(k, v)
