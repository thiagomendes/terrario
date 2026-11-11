"""Codifica em MP3 (mono, 22,05 kHz, 64 kbps), decodifica de volta, mede e escreve musica.json.
Uso: python3 -I finalizar.py <plano.json> <medidas_wav.json> <wav> <dec> <saida_final>
"""
import sys, os, json, subprocess
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from processar import ler, rms, db, medir, SR, P, Q  # noqa: E402

plano, med, wavd, decd, fin = sys.argv[1:6]
plano, med = json.load(open(plano)), json.load(open(med))
os.makedirs(decd, exist_ok=True)

CONTEXTO_CAMADA = {'base': 'sempre', 'noite': 'noite e caverna', 'amigos': 'amigos perto', 'mov': 'andando (0,6) e correndo (1)',
                   'pingos': 'chuva e caverna', 'perigo': 'perigo (substitui todas as outras)'}
INSTR = {
    'bruma-e-luz': dict(base='cordas lentas + harpa (baixo da valsa)', dia='celesta (versão 2: + harpa dobrando)', entardecer='cordas macias em sextas',
                        noite='harpa dedilhada', amigos='caixinha de música nos contratempos', mov='chocalho + bloco de madeira grave',
                        pingos='celesta aguda', perigo='cordas em trêmolo (ré menor) + harpa + "coração" de bumbo macio'),
    'mata-encantada': dict(base='harpa (baixo em 6/8) + kalimba nos contratempos', dia='flauta (versão 2: + kalimba uma oitava acima)', entardecer='flauta de pã em sextas',
                           noite='harpa dedilhada', amigos='glockenspiel (sininhos)', mov='blocos de madeira + chocalho', pingos='kalimba aguda',
                           perigo='cordas em trêmolo (si menor) + harpa + coração'),
    'era-dos-dinos': dict(base='marimba no tum-tá', dia='flauta grave (versão 2: + ocarina uma oitava acima)', entardecer='ocarina em sextas',
                          noite='marimba dedilhada', amigos='xilofone', mov='blocos de madeira + tom grave macio (passos)', pingos='marimba aguda',
                          perigo='cordas em trêmolo (lá menor) + marimba + coração'),
    'exploracao-lunar': dict(base='colchão macio (Warm Pad) + baixo acústico', dia='vibrafone (versão 2: + celesta uma oitava acima)', entardecer='celesta em sextas',
                             noite='vibrafone dedilhado', amigos='glockenspiel', mov='cabasa + triângulo abafado', pingos='sinos tubulares ao longe',
                             perigo='cordas em trêmolo (dó# menor) + vibrafone + coração'),
    'doce-reino': dict(base='marimba em valsa (um-dois-três)', dia='caixinha de música (versão 2: + glockenspiel uma oitava acima)', entardecer='marimba em sextas',
                       noite='caixinha de música dedilhada (ninar)', amigos='glockenspiel', mov='chocalho + pandeirola bem baixinha', pingos='caixinha aguda (granulado)',
                       perigo='cordas em trêmolo (sol menor) + marimba + coração'),
    'planeta-vivo': dict(base='colchão de sintetizador (New Age Pad) + kalimba em ostinato', dia='vibrafone lídio (versão 2: + kalimba uma oitava acima)', entardecer='vibrafone em sextas, oitava abaixo',
                         noite='kalimba dedilhada', amigos='tambor de aço (steel drum)', mov='congas + chocalho', pingos='vibrafone agudo',
                         perigo='cordas em trêmolo (fá# menor) + vibrafone + coração'),
    'rancho-alegre': dict(base='sanfona + baixo do violão de náilon', dia='violões de aço dobrados em terças (doze cordas; versão 2: apojaturas e sextas no B)',
                          entardecer='violões de aço em sextas, mais calmos', noite='dedilhado de náilon + aço', amigos='sanfona nos contratempos + triângulo',
                          mov='maracas + bumbo + surdo', pingos='violão de náilon agudo e curtinho', perigo='(não há: a coruja do Rancho é mansa)'),
}

out = dict(
    versao=1, taxa=SR, canais=1, formato='MP3 CBR 64 kbps, MPEG-2 Layer III, mono, 22 050 Hz (LAME pelo ffmpeg; +0,44 dB antes de codificar, que é o que o MP3 perde em RMS, medido)',
    creditos=dict(banco='FluidR3_GM.sf2 (Frank Wen e colaboradores), licença MIT (pacote Debian fluid-soundfont-gm 3.1)',
                  sintetizador='FluidSynth 2.3.1 (só para gravar; não vai junto)', partituras='originais desta spec (019); a do Rancho é a moda aprovada no esboço'),
    volume=dict(
        alvo='mistura "dia" (base + frases do dia) em -24,6 dBFS RMS, o mesmo nível medido para a "proposta dia" ao vivo no esboço; noite e caverna perto de -27,5; correndo + amigos em -22,8 (teto -22)',
        nota='os arquivos já saem equilibrados entre si com ganho 1; o jogo passa a soma pela mesma cadeia da trilha de hoje (busMusica 0,6 x controle Música 60% x mestre do ambiente 0,5 x grupo 0,7) e a T03 confere com a régua de RMS que não ficou mais alto que hoje'),
    laco=dict(
        regra='camada = [P amostras do fim] + laço de L amostras + [Q amostras do começo]: o arquivo é periódico, então loopStart = P/taxa e loopEnd = (P+L)/taxa servem com ou sem o atraso do codificador',
        P=P, Q=Q, atrasoLame=1105,
        frases='frase = P zeros + frase (amostrasNominais) + cauda (amostrasCauda, já esmaecida); tocar com offset P/taxa; a próxima frase entra em amostrasNominais e as caudas se somam',
        medidaFfmpeg='o ffmpeg tira o atraso pelo cabeçalho LAME (desvio medido abaixo); Chrome e Firefox também costumam tirar; se um navegador não tirar, as camadas e as frases andam juntas o mesmo tanto (todas têm a mesma folga P)'),
    temas={},
)
for tid, it in plano.items():
    m = med[tid]
    os.makedirs(os.path.join(fin, tid), exist_ok=True)
    clips, dec = [], {}
    tot_b, tot_am = 0, 0
    for arq, a in m['arquivos'].items():
        src = os.path.join(wavd, arq + '.wav')
        cid = arq.split('__')[1]
        mp3 = os.path.join(fin, tid, cid + '.mp3')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', 'volume=0.44dB', '-c:a', 'libmp3lame', '-b:a', '64k', '-ar', str(SR), '-ac', '1', mp3], check=True)
        dw = os.path.join(decd, arq + '.wav')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp3, '-f', 'wav', '-c:a', 'pcm_f32le', dw], check=True)
        x = ler(src)[0][:, 0]
        y = ler(dw)[0][:, 0]
        # desvio (atraso) entre original e decodificado
        n = min(len(x), len(y), SR * 4)
        best, lag = -1, 0
        for k in range(-1200, 1201, 1):
            if k >= 0:
                c = np.dot(x[:n - 1300], y[k:k + n - 1300])
            else:
                c = np.dot(x[-k:-k + n - 1300], y[:n - 1300])
            if c > best:
                best, lag = c, k
        tot_b += os.path.getsize(mp3)
        tot_am += len(y)
        mm = medir(y)
        c = dict(id=cid, tipo=a['tipo'], arquivo=f'{tid}/{cid}.mp3', amostrasArquivo=int(len(y)), segundos=round(len(y) / SR, 3),
                 rmsDb=None, picoDb=mm['picoDb'], cortes=mm['cortes'], kb=round(os.path.getsize(mp3) / 1024, 1), desvioCodificador=int(lag),
                 naEscala=a['naEscala'], centsMedio=a['centsMedio'], silencio=a['silencio'])
        if a['tipo'] == 'camada':
            L = a['amostrasLaco']
            s = P + lag
            lacod = y[s:s + L]
            c.update(contexto=CONTEXTO_CAMADA[a['id']], variante=1, amostrasLaco=L, folgaAntes=P, folgaDepois=Q, rmsDb=db(rms(lacod)),
                     compassos=L // it['amostrasCompasso'])
            ks = np.arange(-P + abs(lag) + 64, Q - abs(lag) - 64)
            erro = np.max(np.abs(y[s + L + ks] - y[s + ks]))
            c['emenda'] = dict(saltoDb=db(abs(float(y[s + L - 1] - y[s]))), passoTipicoDb=db(float(np.median(np.abs(np.diff(lacod))))),
                               erroPeriodicoDb=db(float(erro)), saltoWav=a['saltoEmendaWav'])
            dec[a['id']] = lacod
        else:
            fr = next(f for f in it['frases'] if f['id'] == a['id'])
            nom = a['amostrasNominais']
            corpo = y[P + lag:P + lag + nom + a['amostrasCauda']]
            c.update(contexto=fr['contexto'], variante=fr['variante'], frase=fr['frase'], compassoInicio=fr['compassoInicio'], compassos=fr['compassos'],
                     amostrasNominais=nom, amostrasCauda=a['amostrasCauda'], folgaAntes=P, rmsDb=db(rms(corpo)))
            dec[a['id']] = corpo
        clips.append(c)
    # misturas refeitas com o que saiu do MP3
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
    mix = {'dia': b + d, 'entardecer': b + t, 'noite': 0.65 * b + dec['noite'], 'chuva (dia, sem o filtro)': b + d + til(dec['pingos']),
           'caverna (sem o filtro)': 0.6 * b + dec['noite'] + til(dec['pingos']), 'andando': b + d + 0.6 * til(dec['mov']), 'correndo': b + d + til(dec['mov']),
           'amigos (parado)': b + d + dec['amigos'], 'correndo + amigos': b + d + til(dec['mov']) + dec['amigos'],
           'tudo ligado (pior caso)': b + d + t + dec['noite'] + til(dec['mov']) + dec['amigos'] + til(dec['pingos'])}
    if 'perigo' in dec:
        mix['perigo'] = dec['perigo']
    mixes = {k: dict(medir(v), ganhos=m['mixes'][k]['ganhos']) for k, v in mix.items()}
    seg = tot_am / SR
    perigo = 'perigo' in dec
    seqs = [f[0] for f in sorted({(f['id'].split('_')[1], f['compassoInicio']) for f in it['frases'] if f['contexto'] == 'dia'}, key=lambda z: z[1])]
    contextos = {
        'dia': 'base 1 + frases do dia em sequência (' + ' '.join(seqs) + '), trocando a versão 1/2 a cada volta onde houver duas',
        'entardecer': 'base 1 + frases do entardecer (no respiro, só a base)',
        'noite': 'base 0,65 + noite 1, sem frases',
        'deserto': 'sem camada própria: a mistura da hora com passa-baixa leve (~5 kHz) e um pouco mais de eco',
        'taiga': 'sem camada própria: frases do entardecer também de dia + pingos 0,5 (flocos)',
        'pantano': 'sem camada própria: base 0,8 + noite 0,6 + frases do dia 0,7',
        'chuva': 'mistura da hora + pingos 1 (x intensidade) + passa-baixa ~2,4 kHz no motor',
        'caverna': 'base 0,6 + noite 1 + pingos 1, sem frases; passa-baixa ~1,1 kHz e eco de 0,43 s no motor',
        'perigo': ('perigo 1, todas as outras vão a 0 (troca no começo do compasso; a camada tem 8 compassos e cabe na volta)' if perigo else 'não acontece no Rancho (coruja mansa)'),
        'andando': 'movimento 0,6', 'correndo': 'movimento 1', 'amigosPerto': 'amigos 1',
        'trocas': 'no começo do compasso; sobe em 1 compasso e desce em 1,5 (como na moda do esboço)',
    }
    if tid == 'rancho-alegre':
        contextos['lavoura'] = 'sem camada própria: movimento 0,4 (ritmo de trabalho)'
    out['temas'][tid] = dict(
        nome=it['nome'], tom=it['tom'], tempo=it['q'], compasso=it['compasso'], amostrasCompasso=cps, compassos=it['compassos'],
        amostrasVolta=L, segundosVolta=round(L / SR, 3), carater=it['carater'], orquestra=it['orquestra'], instrumentos=INSTR[tid],
        forma=[dict(frase=f['frase'], compassoInicio=f['compassoInicio'], compassos=f['compassos']) for f in it['frases'] if f['contexto'] == 'dia' and f['variante'] == 1],
        contextos=contextos, mixes=mixes, clips=clips,
        totalKB=round(tot_b / 1024, 1), segundosDecodificados=round(seg, 1),
        memoriaMB24k=round(seg * 24000 * 4 / 1048576, 2), memoriaMBTaxaDoArquivo=round(tot_am * 4 / 1048576, 2), memoriaMB48k=round(seg * 48000 * 4 / 1048576, 2))
    T = out['temas'][tid]
    print(f"{tid:18s} {T['totalKB']:7.1f} KB  {T['segundosDecodificados']:6.1f} s  {T['memoriaMB24k']:5.2f} MB@24k  dia {mixes['dia']['rmsDb']} noite {mixes['noite']['rmsDb']} corr+am {mixes['correndo + amigos']['rmsDb']} pior pico {mixes['tudo ligado (pior caso)']['picoDb']}  desvios {sorted({c['desvioCodificador'] for c in clips})}")
json.dump(out, open(os.path.join(fin, 'musica.json'), 'w'), indent=1, ensure_ascii=False)
