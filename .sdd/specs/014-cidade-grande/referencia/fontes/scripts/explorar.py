import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import ler, eventos, SR
for n in sys.argv[1:]:
    x = ler(n)
    ev = eventos(x)
    print(n, round(len(x)/SR,2), 's', len(ev), 'eventos')
    for e in ev[:25]: print('   %.2f-%.2f %.1fdB f0=%s' % e)
