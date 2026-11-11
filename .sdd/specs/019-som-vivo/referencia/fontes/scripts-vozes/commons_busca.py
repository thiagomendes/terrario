"""Busca arquivos de áudio no Wikimedia Commons e lista só os de licença CC0 / domínio público.
Uso: python3 -I commons_busca.py <saida.json> <termo1> [termo2 ...]"""
import json, sys, urllib.request, urllib.error, urllib.parse, re, time

API = 'https://commons.wikimedia.org/w/api.php'
UA = 'SoundSketchBot/1.0 (https://www.mediawiki.org/wiki/API:Etiquette) python-urllib'

def get(params):
    params = dict(params, format='json')
    req = urllib.request.Request(API + '?' + urllib.parse.urlencode(params), headers={'User-Agent': UA})
    for t in range(6):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code != 429: raise
            time.sleep(int(e.headers.get('Retry-After') or 10 * (t + 1)))
    raise SystemExit('429 persistente')

def limpa(s):
    return re.sub(r'<[^>]+>', '', s or '').strip()

saida, termos = sys.argv[1], sys.argv[2:]
res = {}
for termo in termos:
    d = get({'action': 'query', 'generator': 'search', 'gsrnamespace': 6, 'gsrsearch': termo + ' filetype:audio', 'gsrlimit': 50,
             'prop': 'imageinfo', 'iiprop': 'url|size|mime|extmetadata', 'iiextmetadatafilter': 'LicenseShortName|Artist|UsageTerms|ImageDescription|License'})
    for p in (d.get('query', {}).get('pages', {}) or {}).values():
        ii = (p.get('imageinfo') or [{}])[0]; m = ii.get('extmetadata', {})
        lic = limpa(m.get('LicenseShortName', {}).get('value')); code = (m.get('License', {}) or {}).get('value', '')
        ok = bool(re.search(r'cc0|public domain|^pd', lic, re.I) or re.match(r'(cc0|pd)', code or '', re.I))
        res[p['title']] = {'termo': termo, 'licenca': lic, 'codigo': code, 'ok': ok, 'autor': limpa(m.get('Artist', {}).get('value'))[:120],
                           'desc': limpa(m.get('ImageDescription', {}).get('value'))[:200], 'url': ii.get('url'), 'pagina': ii.get('descriptionurl'), 'bytes': ii.get('size'), 'mime': ii.get('mime')}
    time.sleep(3)
json.dump(res, open(saida, 'w'), ensure_ascii=False, indent=1)
for t, v in res.items():
    if v['ok']:
        print(v['termo'], '|', t, '|', v['licenca'], '|', v['autor'][:40], '|', v['bytes'], '|', v['desc'][:90])
