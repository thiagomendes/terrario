"""Confere o pacote dos veículos pelo índice, como o jogo lê: corta cada fatia de public/sons/pacotes/cidade-grande-veiculos.mp3 pelos
bytes de temas['cidade-grande'].veiculos, decodifica (ffmpeg, 22 050 Hz), confere a duração com "s" e grava a amostra para ouvir.
Laços: acha o atraso real do decodificador (correlação com o WAV de origem), toca o laço 3 vezes seguidas pelos pontos do índice
(loopStart = ini + P/taxa, loopEnd = ini + (P+L)/taxa) e mede a costura: o salto de amostra na emenda, o agudo (>4 kHz) na emenda contra o p99 do resto (estalo) e a diferença entre o arquivo e ele
mesmo deslocado de L em volta da emenda, nos dois casos (ini = inicioSemAtraso() e o outro ini possível, 0 ou 1105 amostras, conforme o navegador tire ou não o atraso).
Escreve a seção "conferencia" de medidas-veiculos-pacote.json e um resumo em <conferencia.json>.
Uso (ver rodar.sh): python3 -I veiculos_conferir.py <repo> <wav> <amostras> <conferencia.json>
"""
import sys, os, json, subprocess, tempfile
import numpy as np
from scipy.signal import butter, sosfilt

repo, wavd, am, conf_p = sys.argv[1:5]
SR = 22050
ATRASO = 1105
os.makedirs(am, exist_ok=True)
ind = json.load(open(os.path.join(repo, 'public/sons/indice.json'), encoding='utf-8'))
veic = ind['temas']['cidade-grande']['veiculos']
pac = open(os.path.join(repo, 'public/sons/pacotes/cidade-grande-veiculos.mp3'), 'rb').read()
assert len(pac) == ind['tamanhos']['cidade-grande-veiculos.mp3']
NOMES = {'lacoCarro': 'laco-carro', 'lacoOnibus': 'laco-onibus', 'lacoSorvete': 'laco-sorvete', 'freio': 'freio-a-ar', 'uiui': 'policia-ui-ui',
         'sorveteInteira': 'sorvete-musiquinha-inteira', 'sorveteFrase': 'sorvete-frase-8s', 'buzina': 'buzina-fom-fom', 'toc': 'toc-de-plastico'}


def dec_bytes(b):
    with tempfile.NamedTemporaryFile(suffix='.mp3', dir=os.path.dirname(conf_p)) as t:
        t.write(b); t.flush()
        r = subprocess.run(['ffmpeg', '-v', 'error', '-i', t.name, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(r, np.float32).astype(np.float64)


def ler_wav(p):
    import wave
    with wave.open(p) as w:
        assert w.getframerate() == SR
        return np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float64) / 32767


def mp3(x, p, kbps=64):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f64le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', f'{kbps}k',
                    '-map_metadata', '-1', p], input=np.clip(x, -1, 1).astype('<f8').tobytes(), check=True)


def inicio_sem_atraso(dur, nominal):
    sobra = dur - nominal
    return min(sobra, ATRASO / SR) if sobra > 0.005 else 0.0


def costura(y, a, L):
    """y tocado em laço de a até a+L: salto na emenda e quanto o arquivo difere dele mesmo deslocado de L perto da emenda."""
    b = a + L
    dif = np.abs(np.diff(y[a:b]))
    salto = abs(y[a] - y[b - 1])
    natural = abs(y[b] - y[b - 1])          # o passo que o arquivo dá ali sem laço
    w = 441                                  # os 20 ms que tocam depois da emenda, contra o que o arquivo tocaria sem laço
    res = y[b:b + w] - y[a:a + w]
    rms = np.sqrt(np.mean(y[a:b] ** 2))
    # estalo: energia acima de 4 kHz em janelas de 5 ms nas emendas de 3 voltas, contra o p99 das janelas de todo o resto
    z = np.tile(y[a:b], 3)
    h = sosfilt(butter(4, 4000 / (SR / 2), 'high', output='sos'), z)
    k = 110
    e = np.sqrt(np.convolve(h ** 2, np.ones(k) / k, 'same'))
    na_emenda = max(e[s - k:s + k].max() for s in (L, 2 * L))
    return {'agudoNaEmendaSobreP99': round(float(na_emenda / np.percentile(e[k:-k], 99)), 2),'saltoNaEmenda': round(float(salto), 5), 'passoNaturalAli': round(float(natural), 5),
            'passoMedio': round(float(dif.mean()), 5), 'passoP99': round(float(np.percentile(dif, 99)), 5), 'passoMax': round(float(dif.max()), 5),
            'saltoSobreP99': round(float(salto / np.percentile(dif, 99)), 2),
            'diferenca20msDepoisDb': round(float(20 * np.log10(np.sqrt(np.mean(res ** 2)) / rms + 1e-12)), 1)}


out = {}
for k, c in veic.items():
    o, n = c['o']
    y = dec_bytes(pac[o:o + n])
    dur = len(y) / SR
    # um toque: "s" é a duração decodificada; laço: "s" é a do som de verdade e o decodificado tem o atraso (1105) e o enchimento a mais
    ok = (0.005 < dur - c['s'] < 0.075) if 'laco' in c else abs(dur - c['s']) < 0.002
    item = {'bytes': n, 'segundosDecodificados': round(dur, 3), 's': c['s'], 'confere': ok}
    assert item['confere'], (k, dur, c['s'])
    mp3(y, os.path.join(am, NOMES[k] + '.mp3'), 64 if dur > 5 else 48)
    if 'laco' in c:
        P, L = c['laco']['P'], c['laco']['L']
        w = ler_wav(os.path.join(wavd, k + '.wav'))
        # atraso real: onde o WAV de origem cai dentro do decodificado
        seg = w[P:P + 8820]
        cand = range(0, 2400)
        err = [np.mean((y[d + P:d + P + len(seg)] - seg) ** 2) for d in cand]
        d = int(np.argmin(err))
        snr = 10 * np.log10(np.mean(seg ** 2) / (err[d] + 1e-15))
        ini = int(round(inicio_sem_atraso(dur, c['s']) * SR))
        item.update({'P': P, 'L': L, 'segundosLaco': round(L / SR, 3), 'atrasoDecodificador': d, 'snrDoMp3Db': round(float(snr), 1),
                     'iniPeloJogo': ini, 'comIni': costura(y, ini + P, L), 'outroIni': costura(y, P + ATRASO if ini == 0 else P, L)})
        a = ini + P
        tres = np.tile(y[a:a + L], 3)
        item['segundosTresVoltas'] = round(len(tres) / SR, 2)
        mp3(tres, os.path.join(am, NOMES[k] + '-3-voltas.mp3'), 64)
    out[k] = item
    print(k, json.dumps(item, ensure_ascii=False), flush=True)

json.dump(out, open(conf_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
mp = os.path.join(repo, '.sdd/specs/014-cidade-grande/referencia/fontes/medidas-veiculos-pacote.json')
m = json.load(open(mp, encoding='utf-8'))
m['conferencia'] = {'como': 'fatias cortadas do pacote pelo índice, decodificadas pelo ffmpeg; laço tocado 3 vezes pelos pontos do índice',
                    'clips': out}
json.dump(m, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
