# Régua da rua (spec 014, T15): RMS robusto de cada regua-*.pcm (estéreo 16 bits 44,1 kHz) gravado pelo e2e/veiculos.spec.ts.
# Uso: docker run --rm -v <pasta dos pcm>:/d:ro -v <esta pasta>:/s:ro -w /d som014:local python3 -I /s/regua_rua.py regua-*.pcm
import sys, numpy as np
# RMS robusto: janelas de 100 ms; mediana (dB) e média de potência sem as 5% mais altas (as vozes de bichos e moradores, que
# não são da rua nem da trilha) e sem as caladas (< -65 dB: nada tocando)
for f in sys.argv[1:]:
    x=np.fromfile(f,dtype='<i2').reshape(-1,2).astype(float)/32768
    w=4410; n=len(x)//w
    p=np.array([np.mean(x[i*w:(i+1)*w]**2) for i in range(n)])
    d=10*np.log10(p+1e-18)
    ativo=d[d>-65]
    if len(ativo)==0: print(f,'mudo'); continue
    corte=np.percentile(ativo,95)
    q=ativo[ativo<=corte]
    print(f"{f:28s} mediana {np.median(ativo):6.1f}  media-sem-picos {10*np.log10(np.mean(10**(q/10))):6.1f}  ativo {len(ativo)/n*100:4.0f}%  p95 {corte:6.1f}")
