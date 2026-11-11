"""Baixa arquivos do Wikimedia Commons só se a licença (LicenseShortName/License/UsageTerms) for CC0 ou domínio público.
Uso: python3 -I commons_baixar.py <lista.txt> <pasta_destino> <meta_saida.json>
lista.txt: linhas "chave<TAB>File:Titulo.ext". Recusa CC-BY*, SA, NC e qualquer outra."""
import json, sys, os, re, time, urllib.request, urllib.parse, urllib.error

API = 'https://commons.wikimedia.org/w/api.php'
UA = 'SoundSketchBot/1.0 (https://www.mediawiki.org/wiki/API:Etiquette) python-urllib'

def abrir(url, tent=6):
    for t in range(tent):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=120).read()
        except urllib.error.HTTPError as e:
            if e.code != 429: raise
            time.sleep(int(e.headers.get('Retry-After') or 10 * (t + 1)))
    raise SystemExit('429 persistente')

def limpa(s): return re.sub(r'<[^>]+>', '', s or '').strip()

lista, dest, meta_p = sys.argv[1:4]
os.makedirs(dest, exist_ok=True)
meta = json.load(open(meta_p)) if os.path.exists(meta_p) else {}
for ln in open(lista, encoding='utf-8'):
    ln = ln.rstrip('\n')
    if not ln.strip() or ln.startswith('#'): continue
    chave, titulo = ln.split('\t')
    if chave in meta and os.path.exists(os.path.join(dest, meta[chave]['arquivo'])): continue
    q = urllib.parse.urlencode({'action': 'query', 'titles': titulo, 'prop': 'imageinfo', 'iiprop': 'url|size|mime|extmetadata', 'format': 'json',
                                'iiextmetadatafilter': 'LicenseShortName|License|UsageTerms|Artist|Credit|ImageDescription|Copyrighted'})
    d = json.loads(abrir(API + '?' + q))
    p = list(d['query']['pages'].values())[0]; ii = (p.get('imageinfo') or [None])[0]
    if not ii: print('SEM ARQUIVO', chave, titulo); continue
    m = ii.get('extmetadata', {}); g = lambda k: limpa((m.get(k) or {}).get('value'))
    lic, code, termos = g('LicenseShortName'), g('License'), g('UsageTerms')
    ok = bool(re.search(r'^(cc0|public domain|pd)', lic, re.I) or re.match(r'^(cc0|pd)', code, re.I))
    ruim = bool(re.search(r'\bby\b|sa\b|nc\b|attribution|share', (lic + ' ' + code).lower().replace('cc0', ''))) and not re.search(r'public domain', lic, re.I)
    if not ok or ruim:
        print('RECUSADO', chave, titulo, '|', lic, code); continue
    ext = os.path.splitext(urllib.parse.urlparse(ii['url']).path)[1].lower()[:6]
    nome = chave + ext; dados = abrir(ii['url'])
    if len(dados) > 40_000_000: print('GRANDE DEMAIS', chave); continue
    open(os.path.join(dest, nome), 'wb').write(dados)
    meta[chave] = {'arquivo': nome, 'titulo': titulo, 'pagina': ii.get('descriptionurl'), 'url': ii['url'], 'licenca': lic, 'codigo': code, 'termos': termos,
                   'autor': g('Artist')[:200], 'credito': g('Credit')[:200], 'desc': g('ImageDescription')[:300], 'bytes': len(dados), 'mime': ii.get('mime')}
    print('ok', chave, lic, '|', meta[chave]['autor'][:50], len(dados))
    json.dump(meta, open(meta_p, 'w'), ensure_ascii=False, indent=1)
    time.sleep(4)
json.dump(meta, open(meta_p, 'w'), ensure_ascii=False, indent=1)
