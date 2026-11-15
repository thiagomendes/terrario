"""Codifica a trilha da Vila Neon em MP3 (mono, 22,05 kHz, 64 kbps CBR, +0,44 dB, sem ID3), decodifica de volta, mede,
emenda o pacote public/sons/pacotes/vila-neon-musica.mp3 e escreve a entrada do tema no formato do índice.
É o 014/scripts-pacote/musica_finalizar.py (o 019/scripts-musica/finalizar.py para um tema só) com os textos do bairro.
Rodar tudo de novo: ver rodar.sh. Este passo:
  python3 -I musica_finalizar.py <plano.json> <medidas_wav.json> <wav> <trabalho> <pacote.mp3> <tema.json>
"""
import sys, os, json, subprocess
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from musica_processar import ler, rms, db, medir, SR, P, Q  # noqa: E402

plano, med, wavd, trab, pacote, saida = sys.argv[1:7]
plano, med = json.load(open(plano)), json.load(open(med))
os.makedirs(os.path.join(trab, 'mp3'), exist_ok=True)
os.makedirs(os.path.join(trab, 'dec'), exist_ok=True)

CONTEXTO_CAMADA = {'base': 'sempre', 'noite': 'noite e caverna', 'amigos': 'amigos perto', 'mov': 'andando (0,6) e correndo (1)', 'pingos': 'chuva e caverna'}
INSTR = dict(base='baixo de sintetizador em colcheias + pad quente + bateria eletrônica bem baixinha (bumbo no 1 e no 3, caixa macia no 2 e no 4)',
             dia='sintetizador quadrado, calmo (versão 2: a celesta uma oitava acima e uma terça macia nas notas longas)',
             entardecer='guitarra limpa com eco (colcheia pontuada escrita na partitura)',
             noite='pad macio + piano elétrico em arpejo lento, sem bateria', amigos='palmas da bateria eletrônica + pandeirinho macio',
             mov='chimbal da bateria eletrônica em semicolcheias', pingos='caixinha de música, gotinhas de lá e mi',
             perigo='(não há: a noite do bairro é mansa)')
CHAVES = ('id', 'tipo', 'frase', 'variante', 'compassoInicio', 'compassos', 'amostrasNominais', 'amostrasCauda', 'amostrasLaco', 'folgaAntes',
          'folgaDepois', 'amostrasArquivo', 'rmsDb', 'kb', 'contexto')

for tid, it in plano.items():
    m = med[tid]
    clips, dec, medidas = [], {}, {}
    buf = bytearray()
    tot_am = 0
    ordem = [f"{tid}__{c['id']}" for c in it['camadas']] + [f"{tid}__{f['id']}" for f in it['frases']]
    for arq in ordem:
        a = m['arquivos'][arq]
        src = os.path.join(wavd, arq + '.wav')
        cid = arq.split('__')[1]
        mp3 = os.path.join(trab, 'mp3', cid + '.mp3')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', 'volume=0.44dB', '-c:a', 'libmp3lame', '-b:a', '64k', '-ar', str(SR), '-ac', '1',
                        '-map_metadata', '-1', '-id3v2_version', '0', mp3], check=True)
        dw = os.path.join(trab, 'dec', cid + '.wav')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp3, '-f', 'wav', '-c:a', 'pcm_f32le', dw], check=True)
        x = ler(src)[0][:, 0]
        y = ler(dw)[0][:, 0]
        n = min(len(x), len(y), SR * 4)
        best, lag = -1, 0
        for k in range(-1200, 1201):
            c = np.dot(x[:n - 1300], y[k:k + n - 1300]) if k >= 0 else np.dot(x[-k:-k + n - 1300], y[:n - 1300])
            if c > best:
                best, lag = c, k
        b = open(mp3, 'rb').read()
        assert b[0] == 0xFF and (b[1] & 0xE0) == 0xE0, mp3
        o = [len(buf), len(b)]
        buf += b
        tot_am += len(y)
        mm = medir(y)
        c = dict(id=cid, tipo=a['tipo'], amostrasArquivo=int(len(y)), kb=round(len(b) / 1024, 1))
        info = dict(picoDb=mm['picoDb'], cortes=mm['cortes'], desvioCodificador=int(lag), naEscala=a['naEscala'], centsMedio=a['centsMedio'], silencio=a['silencio'])
        if a['tipo'] == 'camada':
            L = a['amostrasLaco']
            s = P + lag
            lacod = y[s:s + L]
            c.update(variante=1, compassos=L // it['amostrasCompasso'], amostrasLaco=L, folgaAntes=P, folgaDepois=Q, rmsDb=db(rms(lacod)),
                     contexto=CONTEXTO_CAMADA[a['id']])
            ks = np.arange(-P + abs(lag) + 64, Q - abs(lag) - 64)
            erro = np.max(np.abs(y[s + L + ks] - y[s + ks]))
            info['emenda'] = dict(saltoDb=db(abs(float(y[s + L - 1] - y[s]))), passoTipicoDb=db(float(np.median(np.abs(np.diff(lacod))))),
                                  erroPeriodicoDb=db(float(erro)), saltoWav=a['saltoEmendaWav'])
            dec[a['id']] = lacod
        else:
            fr = next(f for f in it['frases'] if f['id'] == a['id'])
            nom = a['amostrasNominais']
            corpo = y[P + lag:P + lag + nom + a['amostrasCauda']]
            c.update(frase=fr['frase'], variante=fr['variante'], compassoInicio=fr['compassoInicio'], compassos=fr['compassos'], amostrasNominais=nom,
                     amostrasCauda=a['amostrasCauda'], folgaAntes=P, rmsDb=db(rms(corpo)), contexto=fr['contexto'])
            dec[a['id']] = corpo
        c['o'] = o
        clips.append({**{k: c[k] for k in CHAVES if k in c}, 'o': o})
        medidas[cid] = dict(segundos=round(len(y) / SR, 3), rmsDb=c['rmsDb'], kb=c['kb'], **info)
    open(pacote, 'wb').write(buf)
    L = it['amostrasVolta']
    cps = it['amostrasCompasso']

    def seqd(ctx):
        o = np.zeros(L)
        for f in it['frases']:
            if f['contexto'] == ctx and f['variante'] == 1:
                xx = dec[f['id']]
                np.add.at(o, (np.arange(len(xx)) + f['compassoInicio'] * cps) % L, xx)
        return o
    til = lambda v: np.tile(v, L // len(v) + 1)[:L]
    b, d, t = dec['base'], seqd('dia'), seqd('entardecer')
    am, mv, pg = til(dec['amigos']), til(dec['mov']), til(dec['pingos'])
    mix = {'dia': b + d, 'entardecer': b + t, 'noite': 0.65 * b + dec['noite'], 'chuva (dia, sem o filtro)': b + d + pg,
           'caverna (sem o filtro)': 0.6 * b + dec['noite'] + pg, 'andando': b + d + 0.6 * mv, 'correndo': b + d + mv,
           'amigos (parado)': b + d + am, 'correndo + amigos': b + d + mv + am, 'tudo ligado (pior caso)': b + d + t + dec['noite'] + mv + am + pg}
    mixes = {k: dict(medir(v), ganhos=m['mixes'][k]['ganhos']) for k, v in mix.items()}
    seg = tot_am / SR
    contextos = {
        'dia': 'base 1 + frases do dia em sequência (a a2 bx by), trocando a versão 1/2 a cada volta onde houver duas',
        'entardecer': 'base 1 + frases do entardecer',
        'noite': 'base 0,65 + noite 1, sem frases',
        'deserto': 'sem camada própria: a mistura da hora com passa-baixa leve (~5 kHz) e um pouco mais de eco',
        'taiga': 'sem camada própria: frases do entardecer também de dia + pingos 0,5 (flocos)',
        'pantano': 'sem camada própria: base 0,8 + noite 0,6 + frases do dia 0,7',
        'chuva': 'mistura da hora + pingos 1 (x intensidade) + passa-baixa ~2,4 kHz no motor',
        'caverna': 'base 0,6 + noite 1 + pingos 1, sem frases; passa-baixa ~1,1 kHz e eco de 0,43 s no motor',
        'perigo': 'não acontece na Vila Neon (a noite é mansa)',
        'andando': 'movimento 0,6', 'correndo': 'movimento 1', 'amigosPerto': 'amigos 1',
        'trocas': 'no começo do compasso; sobe em 1 compasso e desce em 1,5 (como na 019)',
    }
    tema = dict(
        nome=it['nome'], tom=it['tom'], tempo=it['q'], compasso=it['compasso'], amostrasCompasso=cps, compassos=it['compassos'],
        amostrasVolta=L, segundosVolta=round(L / SR, 3), carater=it['carater'], orquestra=it['orquestra'], instrumentos=INSTR,
        forma=[dict(frase=f['frase'], compassoInicio=f['compassoInicio'], compassos=f['compassos']) for f in it['frases'] if f['contexto'] == 'dia' and f['variante'] == 1],
        contextos=contextos, totalKB=round(len(buf) / 1024, 1), segundosDecodificados=round(seg, 1),
        memoriaMB24k=round(seg * 24000 * 4 / 1048576, 2), memoriaMBTaxaDoArquivo=round(tot_am * 4 / 1048576, 2), memoriaMB48k=round(seg * 48000 * 4 / 1048576, 2),
        mixes=mixes, clips=clips)
    json.dump(dict(tema=tema, bytesPacote=len(buf), medidasClips=medidas, ganhosDb=m['ganhos']), open(saida, 'w'), ensure_ascii=False, indent=1)
    print(f"{tid}: {len(buf) / 1024:.1f} KB, {seg:.1f} s, {tema['memoriaMB24k']} MB@24k; dia {mixes['dia']['rmsDb']} entardecer {mixes['entardecer']['rmsDb']} "
          f"noite {mixes['noite']['rmsDb']} corr+am {mixes['correndo + amigos']['rmsDb']} pior pico {mixes['tudo ligado (pior caso)']['picoDb']} "
          f"desvios {sorted({v['desvioCodificador'] for v in medidas.values()})} emendas {[v['emenda']['erroPeriodicoDb'] for v in medidas.values() if 'emenda' in v]}")
