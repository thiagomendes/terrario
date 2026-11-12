"""Renders da cidade (44,1 kHz estéreo) -> mono 22,05 kHz no volume das trilhas do jogo, MP3 64 kbps (como a 019).
Também monta, do pacote do jogo, o "dia" do Rancho de hoje para comparar o volume lado a lado.
Uso: python3 -I processar_cidade.py <render> <pacotes> <indice.json> <saida> <medidas.json>
Régua: RMS do arquivo inteiro (a mesma conta de `medir` em 019/processar.py): dia -24,6 dBFS, noite -27,5 dBFS.
"""
import sys, os, json, subprocess
import numpy as np
from scipy.signal import resample_poly

SR = 22050
ALVO = {'cidade-dia': -24.6, 'cidade-noite': -27.5}
db = lambda v: float(round(20 * np.log10(v), 2)) if v > 0 else -999.0
rms = lambda x: float(np.sqrt(np.mean(x ** 2)))


def dec(caminho, sr=SR, ini=None, dur=None):
    cmd = ['ffmpeg', '-v', 'error']
    cmd += ['-i', caminho, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.float32).astype(np.float64)


def medir(x):
    return dict(rmsDb=db(rms(x)), picoDb=db(float(np.max(np.abs(x)))), segundos=round(len(x) / SR, 2))


def mp3(x, caminho, ganho_db=0.44):
    y = np.clip(x * 10 ** (ganho_db / 20), -1, 1)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '64k',
                    '-ar', str(SR), '-ac', '1', '-map_metadata', '-1', caminho], input=y.astype('<f4').tobytes(), check=True)


def esmaecer(x, ent=0.02, sai=2.5):
    n, m = int(ent * SR), int(sai * SR)
    x = x.copy()
    x[:n] *= np.linspace(0, 1, n)
    x[-m:] *= np.linspace(1, 0, m) ** 1.5
    return x


def aparar_silencio(x, rel=-60):
    a = np.abs(x)
    lim = 10 ** (rel / 20)
    idx = np.where(a > lim)[0]
    return x[: idx[-1] + int(0.05 * SR)] if len(idx) else x


if __name__ == '__main__':
    render, pac, indice, saida, medp = sys.argv[1:6]
    os.makedirs(saida, exist_ok=True)
    med = {}
    for nome, alvo in ALVO.items():
        x = dec(os.path.join(render, nome + '.wav'))
        x = aparar_silencio(x - np.mean(x))
        x = esmaecer(x, sai=3.0)
        for _ in range(4):
            x *= 10 ** ((alvo - db(rms(x))) / 20)
        mp3(x, os.path.join(saida, nome + '.mp3'))
        y = dec(os.path.join(saida, nome + '.mp3'))
        med[nome] = dict(alvoRmsDb=alvo, wav=medir(x), mp3Decodificado=medir(y), kb=round(os.path.getsize(os.path.join(saida, nome + '.mp3')) / 1024, 1))
    # Rancho de hoje, "dia" = base (ganho 1) + frases do dia em sequência, tirado do pacote do jogo
    ind = json.load(open(indice))
    t = ind['temas']['rancho-alegre']
    pacote = open(os.path.join(pac, 'rancho-alegre-musica.mp3'), 'rb').read()
    clips = {(c['id'], c.get('variante', 1)): c for c in t['clips']}
    tmp = '/tmp/clip.mp3'

    def clip(c):
        o, n = c['o']
        open(tmp, 'wb').write(pacote[o:o + n])
        return dec(tmp)

    base_c = clips[('base', 1)]
    base = clip(base_c)
    P = base_c.get('folgaAntes', 1323)
    L = base_c['amostrasLaco']
    laco = base[P:P + L]
    frases = [c for c in t['clips'] if c['tipo'] == 'frase' and c['id'].startswith('dia') and c.get('variante', 1) == 1]
    mix = np.zeros(L + SR * 2)
    mix[:L] += laco
    pos = 0
    for c in frases:
        f = clip(c)[P:]
        fim = min(len(mix), pos + len(f))
        mix[pos:fim] += f[: fim - pos]
        pos += c['amostrasNominais']
    mix = mix[:L]
    med['rancho-dia-hoje'] = dict(nota='base + frases do dia v1, tirado de public/sons/pacotes/rancho-alegre-musica.mp3; volume do jogo, sem mexer',
                                 frases=[c['id'] for c in frases], wav=medir(mix), indiceDiz=t['mixes']['dia'])
    trecho = esmaecer(mix[: int(24 * SR)], sai=2.0)
    mp3(trecho, os.path.join(saida, 'rancho-dia-hoje.mp3'), 0.0)
    med['rancho-dia-hoje']['trecho24s'] = medir(dec(os.path.join(saida, 'rancho-dia-hoje.mp3')))
    json.dump(med, open(medp, 'w'), ensure_ascii=False, indent=1)
    print(json.dumps(med, ensure_ascii=False, indent=1))
