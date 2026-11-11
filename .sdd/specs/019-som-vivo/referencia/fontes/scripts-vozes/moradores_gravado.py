"""Alternativa B dos moradores: balbucio de bebê gravado (domínio público, PDSounds/stephan) recortado em sílabas,
cada sílaba afinada numa nota e com as formantes baixadas (de bebê para gente pequena de brinquedo). Sem palavras.
Uso: python3 -I moradores_gravado.py -> /t/wav/<tema>/moradora-b.<momento>.<n>.wav, morador-b...; /t/receitas_moradores_b.json"""
import sys, json, zlib; sys.path.insert(0, '/s')
import lib
from lib import *
from moradores import MOLDES, TEMAS, PENTA

FONTES = ['commons/bebe_fala.ogg', 'commons/bebe_balbucio.ogg']


def banco():
    bs = []
    for fo in FONTES:
        x = ler(fo)
        for (s, e, db, (hz, conf)) in eventos(x, min_dur=0.08):
            d = e - s
            if 0.08 <= d <= 0.4 and conf >= 0.9 and 260 <= hz <= 560 and db > -24:
                seg = x[int(s * SR):int(e * SR)]
                # tom mediano estável: confere 3 janelas
                hs = [f0(seg[i:i + 2048]) for i in range(0, max(1, len(seg) - 2048), 1024)]
                hs = [h for h, c in hs if c > 0.8 and 220 < h < 650]
                if len(hs) >= 1 and (max(hs) / min(hs) < 1.35):
                    bs.append({'fonte': fo, 'ini': round(s, 2), 'fim': round(e, 2), 'hz': float(np.median(hs)), 'db': db})
    return bs


def silaba(b, alvo_hz, dur, phi):
    x = ler(b['fonte'], b['ini'] - 0.01, b['fim'] + 0.02)
    x = banda(x, 120, 7000); x = aparar(x, -30)
    P = alvo_hz / b['hz']
    y = fita(x, phi)
    s = max(0.6, min(1.8, P * dur / (len(x) / SR)))     # duração final ~ len*s/P
    y = esticar(y, s * 1.0 / phi * phi)
    y = fita(y, P / phi)
    return bordas(y, 0.008, 0.03)


def frase(bs, tema, sexo, momento, k):
    cfg = TEMAS[tema]; p = cfg[sexo]; sabor = cfg['sabor']
    r = np.random.default_rng(zlib.crc32(f'B{tema}{sexo}{momento}{k}'.encode()))
    phi = 0.88 if sexo == 'F' else 0.74
    fb = p['f_base'] * (1.0 if sexo == 'F' else 1.05)
    molde = [list(m) for m in MOLDES[momento][k]]
    if sabor == 'cantado':
        for m in molde: m[1] = min(PENTA, key=lambda q: abs(q - m[1]))
    partes = []
    escolha = r.choice(len(bs), size=len(molde), replace=False)
    for (dur, nota, gl), j in zip(molde, escolha):
        hz = fb * 2 ** ((nota + gl * 0.5) / 12)
        partes.append(silaba(bs[j], hz, dur * (1.15 if momento == 'obrigado' else 1.0), phi))
    if sabor == 'caipira' and momento != 'obrigado':
        partes.append(silaba(bs[escolha[-1]], fb * 2 ** ((molde[-1][1] - 2) / 12), 0.1, phi) * 0.8)
    y = juntar(partes, 0.0, ov=0.015)
    if momento == 'surpresa':   # o fim sobe (glissando de fita)
        n = len(y); a = int(n * 0.55); y = np.concatenate([y[:a], fita_curva(y[a:], [(0, 1.0), (1, 1.35)])])
    if sabor == 'robo':
        t = np.arange(len(y)) / SR; y = y * (1 + 0.12 * np.sin(2 * np.pi * 32 * t)); y = coro(y, 6, 0.008, 0.3)
        y = mix((y, 1, 0), (bip(2093 if k == 0 else 2349, 0.06, 'sine', lp=8000) * 0.10 * np.max(np.abs(y)), 1, len(y) / SR - 0.02)); mol, sd = 0.12, 0.14
    elif sabor == 'nevoa': y = coro(y, 11, 0.016, 0.45); mol, sd = 0.22, 0.25
    elif sabor == 'gelatina':
        t = np.arange(len(y)) / SR; y = fita_curva(y, [(u, 1 + 0.02 * np.sin(2 * np.pi * 8.5 * u * len(y) / SR)) for u in np.linspace(0, 1, 60)])
        y = coro(y, 12, 0.01, 0.35); mol, sd = 0.14, 0.14
    else: y = coro(y, 8, 0.012, 0.3); mol, sd = 0.12, 0.12
    y = banda(y, 120 if sexo == 'F' else 90, 7000)
    return finalizar(y, 0.004, 0.07, mol=mol, sala_dur=sd), [int(e) for e in escolha]


if __name__ == '__main__':
    bs = banco(); print('sílabas no banco', len(bs))
    rec = {}
    for tema in TEMAS:
        for sexo, nome in (('F', 'moradora-b'), ('M', 'morador-b')):
            for momento in MOLDES:
                for k in range(2):
                    y, esc = frase(bs, tema, sexo, momento, k)
                    cid = f'{tema}/{nome}.{momento}.{k + 1}'; salvar(f'/t/wav/{cid}.wav', y)
                    rec[cid] = {'fontes': sorted({bs[j]['fonte'] for j in esc}), 'trechos': [(bs[j]['fonte'].split('/')[-1], bs[j]['ini'], bs[j]['fim']) for j in esc],
                                'seg': round(len(y) / SR, 3), 'rmsAtivoDb': round(rms_ativo(y), 1)}
                    print(cid, rec[cid]['seg'], rec[cid]['rmsAtivoDb'], flush=True)
    json.dump({'banco': bs, 'arquivos': rec}, open('/t/receitas_moradores_b.json', 'w'), ensure_ascii=False, indent=1)
