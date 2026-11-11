import sys, time; sys.path.insert(0, '/s')
from lib import *
t=time.time()
s=[dict(c='',v='ó',dur=.12,nota=0,gl=2),dict(c='b',v='a',dur=.10,nota=4),dict(c='l',v='i',dur=.2,nota=7,gl=-3)]
y=falar(s,f_base=330,escala=1.2)
print('dur',len(y)/SR,'max',np.abs(y).max(),'nan',np.isnan(y).any(),'t',time.time()-t)
z=finalizar(coro(y),mol=.14); salvar('/t/teste/v1.wav',z)
print('f0', [f0(z[i:i+4096]) for i in range(2000,len(z)-4096,4000)])
