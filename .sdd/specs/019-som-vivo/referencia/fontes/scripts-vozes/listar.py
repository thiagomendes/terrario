"""Lista eventos de cada arquivo (ini fim dB f0/conf). Uso: python3 -I listar.py arq1 arq2 ... (relativos a /b)"""
import sys, json; sys.path.insert(0, '/s')
from lib import *
out = {}
for a in sys.argv[1:]:
    x = ler(a); ev = eventos(x)
    out[a] = ev
    print(f'== {a} {len(x)/SR:.1f}s n={len(ev)}')
    print('   ' + ' '.join(f'[{i}]{s:.2f}-{e:.2f}/{db:.0f}/{f[0]}:{f[1]}' for i, (s, e, db, f) in enumerate(ev[:40])))
json.dump(out, open('/t/eventos.json', 'w'))
