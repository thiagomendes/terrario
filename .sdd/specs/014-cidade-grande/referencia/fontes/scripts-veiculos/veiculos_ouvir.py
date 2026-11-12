# Conferência de ouvido por medida (spec 014, T14): o laço do pacote pelo caminho do jogo (marcha lenta) contra o laço do esboço aprovado
# (sons-r2), e o uí-uí e a musiquinha do pacote contra os do esboço. Uso: docker run --rm -v <esta pasta>:/s:ro -v <repo>:/r:ro som014:local python3 -I /s/veiculos_ouvir.py
import json, subprocess, sys
import numpy as np
from scipy.signal import butter, sosfilt
R='/r'; SR=22050
ind=json.load(open(R+'/public/sons/indice.json'))['temas']['cidade-grande']['veiculos']
pac=open(R+'/public/sons/pacotes/cidade-grande-veiculos.mp3','rb').read()
def dec_bytes(b):
    return np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i','-','-ac','1','-ar',str(SR),'-f','f32le','-'],input=b,capture_output=True,check=True).stdout,np.float32).astype(float)
def dec(p): return dec_bytes(open(p,'rb').read())
def rms(x): return 20*np.log10(np.sqrt(np.mean(x**2))+1e-12)
def cent(x):
    X=np.abs(np.fft.rfft(x*np.hanning(len(x)))); f=np.fft.rfftfreq(len(x),1/SR); return float((X*f).sum()/X.sum())
def bands(x):
    X=np.abs(np.fft.rfft(x))**2; f=np.fft.rfftfreq(len(x),1/SR); tot=X.sum()
    return [round(10*np.log10(X[(f>=a)&(f<b)].sum()/tot),1) for a,b in [(0,150),(150,400),(400,1000),(1000,3000),(3000,11025)]]
def low(x,fc): return sosfilt(butter(2,fc,'low',fs=SR,output='sos'),x)
def high(x,fc): return sosfilt(butter(2,fc,'high',fs=SR,output='sos'),x)
out={}
for k,ref in [('lacoCarro','carro-lenta'),('lacoOnibus','onibus-lenta')]:
    c=ind[k]; x=dec_bytes(pac[c['o'][0]:c['o'][0]+c['o'][1]])
    P=c['laco']['P']; L=c['laco']['L']; x=x[1105+P:1105+P+L]
    carga=0.12 if k=='lacoCarro' else 0.15
    y=low(x,900)*(1-carga)+(x+0.7*high(x,400))*carga   # o caminho do jogo, marcha lenta
    r=dec(R+'/.sdd/specs/014-cidade-grande/referencia/veiculos/sons-r2/'+ref+'.mp3')
    out[k]={'pacoteCru':{'rms':round(rms(x),1),'centroHz':round(cent(x)),'bandas':bands(x)},
            'jogoLenta':{'centroHz':round(cent(y)),'bandas':bands(y)},
            'esbocoLenta':{'rms':round(rms(r),1),'centroHz':round(cent(r)),'bandas':bands(r)}}
for k,ref in [('uiui','policia-ui-ui'),('sorveteInteira','sorvete-musiquinha')]:
    c=ind[k]; x=dec_bytes(pac[c['o'][0]:c['o'][0]+c['o'][1]])
    try: r=dec(R+'/.sdd/specs/014-cidade-grande/referencia/veiculos/sons-r2/'+ref+'.mp3')
    except Exception: r=None
    out[k]={'pacote':{'s':round(len(x)/SR,2),'centroHz':round(cent(x)),'bandas':bands(x)},'esboco':None if r is None else {'s':round(len(r)/SR,2),'centroHz':round(cent(r)),'bandas':bands(r)}}
print(json.dumps(out,indent=1))
