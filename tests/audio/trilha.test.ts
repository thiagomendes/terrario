import { lerArrayBuffer, lerBytes, lerTexto } from './arquivos';
import { describe, expect, it } from 'vitest';
import {
  CAMADAS,
  CarregadorTrilha,
  ESTADO_TRILHA_INICIAL,
  LACOS,
  SorteioSemRepetir,
  TAXA_TRILHA,
  TrilhaGravada,
  VOLTAS_POR_RESPIRO,
  alvoMix,
  camadaDoClip,
  clipsDaMistura,
  clipsProvaveis,
  duracaoCompasso,
  esquecerIndiceTrilha,
  fatiarClipe,
  inicioFrase,
  interpolar,
  lerIndiceTrilha,
  nivelTrilha,
  posicaoNoLaco,
  proximoCompasso,
  voltaDeRespiro,
  type EstadoTrilha,
  type IndiceTrilha,
  type TemaTrilha,
} from '../../src/audio/trilha';

const JSON_INDICE = JSON.parse(lerTexto('public/sons/indice.json')) as Record<string, unknown>;
const INDICE = lerIndiceTrilha(JSON_INDICE) as IndiceTrilha;
const TEMAS = Object.keys(INDICE.temas);
const e = (p: Partial<EstadoTrilha> = {}): EstadoTrilha => ({ ...ESTADO_TRILHA_INICIAL, ...p });
const ativas = (g: Record<string, number>) =>
  Object.fromEntries(Object.entries(g).filter(([, v]) => v > 0));

describe('receita de contexto (alvoMix)', () => {
  it('dia, entardecer e noite seguem o índice', () => {
    expect(ativas(alvoMix(e(), true, false).g)).toEqual({ base: 1, fdia: 1 });
    expect(ativas(alvoMix(e({ hora: 'tarde' }), true, false).g)).toEqual({ base: 1, ftarde: 1 });
    expect(ativas(alvoMix(e({ hora: 'noite' }), true, false).g)).toEqual({ base: 0.65, noite: 1 });
    expect(alvoMix(e(), true, false).fx.lp).toBe(20000);
  });

  it('noite no deserto, na taiga e no pântano é noite (achado 9 do inventário)', () => {
    const noite = alvoMix(e({ hora: 'noite' }), true, false).g;
    const deserto = alvoMix(e({ hora: 'noite', bioma: 'deserto' }), true, false);
    expect(deserto.g).toEqual(noite);
    expect(deserto.fx.lp).toBe(5000);
    expect(deserto.fx.eco).toBeGreaterThan(0);
    expect(alvoMix(e({ hora: 'noite', bioma: 'pantano' }), true, false).g).toEqual(noite);
    const taiga = alvoMix(e({ hora: 'noite', bioma: 'taiga' }), true, false).g;
    expect(ativas(taiga)).toEqual({ base: 0.65, noite: 1, pingos: 0.5 });
  });

  it('bioma de dia: taiga com frases do entardecer, pântano com noite por baixo', () => {
    expect(ativas(alvoMix(e({ bioma: 'taiga' }), true, false).g)).toEqual({
      base: 1,
      ftarde: 1,
      pingos: 0.5,
    });
    expect(ativas(alvoMix(e({ bioma: 'pantano' }), true, false).g)).toEqual({
      base: 0.8,
      noite: 0.6,
      fdia: 0.7,
    });
  });

  it('chuva: pingos pela intensidade e passa-baixa de 2,4 kHz', () => {
    const garoa = alvoMix(e({ chuva: 0.5 }), true, false);
    expect(garoa.g.pingos).toBe(0.5);
    expect(garoa.fx.lp).toBe(2400);
    expect(alvoMix(e({ chuva: 1, hora: 'noite' }), true, false).g.pingos).toBe(1);
  });

  it('caverna: base baixa, noite e pingos, sem frases, filtro e eco', () => {
    const c = alvoMix(e({ caverna: true, chuva: 1, hora: 'tarde' }), true, false);
    expect(ativas(c.g)).toEqual({ base: 0.6, noite: 1, pingos: 1 });
    expect(c.fx).toEqual({ lp: 1100, eco: 0.3, ecoT: 0.43, realim: 0.38 });
  });

  it('perigo substitui todas as outras; no Rancho (sem a camada) nunca', () => {
    const p = alvoMix(e({ perigo: true, mov: 2, amigos: true }), true, false);
    expect(ativas(p.g)).toEqual({ perigo: 1 });
    const r = alvoMix(e({ perigo: true }), false, true);
    expect(r.g.perigo).toBe(0);
    expect(ativas(r.g)).toEqual({ base: 1, fdia: 1 });
  });

  it('andar, correr, amigos e a lavoura (só no Rancho)', () => {
    expect(alvoMix(e({ mov: 1 }), true, false).g.mov).toBe(0.6);
    expect(alvoMix(e({ mov: 2 }), true, false).g.mov).toBe(1);
    expect(alvoMix(e({ amigos: true }), true, false).g.amigos).toBe(1);
    expect(alvoMix(e({ lavoura: true }), true, true).g.mov).toBe(0.4);
    expect(alvoMix(e({ lavoura: true }), true, false).g.mov).toBe(0);
    expect(alvoMix(e({ lavoura: true, mov: 2 }), true, true).g.mov).toBe(1);
  });
});

describe('índice e pacotes', () => {
  it('os 6 temas têm música; só o Rancho, a Cidade, a Vila Neon e a Noite das Fantasias não têm perigo (a noite lá é mansa)', () => {
    expect(TEMAS.sort()).toEqual(
      [
        'doce-reino',
        'exploracao-lunar',
        'rancho-alegre',
        'cidade-grande',
        'vila-neon',
        'noite-das-fantasias',
      ].sort(),
    );
    const mansas = ['rancho-alegre', 'cidade-grande', 'vila-neon', 'noite-das-fantasias'];
    for (const id of TEMAS) {
      const tem = INDICE.temas[id].clips.some((c) => c.id === 'perigo');
      expect(tem, id).toBe(!mansas.includes(id));
    }
    expect(INDICE.taxa).toBe(TAXA_TRILHA);
  });

  it('as fatias cobrem o pacote sem buraco nem sobreposição e começam num MP3', () => {
    for (const id of TEMAS) {
      const t = INDICE.temas[id];
      const pacote = lerBytes(`public/sons/pacotes/${id}-musica.mp3`);
      const ab = lerArrayBuffer(`public/sons/pacotes/${id}-musica.mp3`);
      expect(t.bytesPacote).toBe(pacote.byteLength);
      const ordem = [...t.clips].sort((a, b) => a.o[0] - b.o[0]);
      let fim = 0;
      for (const c of ordem) {
        expect(c.o[0], `${id}/${c.id}`).toBe(fim);
        fim = c.o[0] + c.o[1];
        const f = new Uint8Array(fatiarClipe(ab, c)!);
        expect(f.byteLength).toBe(c.o[1]);
        const id3 = f[0] === 0x49 && f[1] === 0x44 && f[2] === 0x33;
        const sync = f[0] === 0xff && (f[1] & 0xe0) === 0xe0;
        expect(id3 || sync, `${id}/${c.id}`).toBe(true);
      }
      expect(fim).toBe(pacote.byteLength);
    }
  });

  it('fatia fora do pacote não sai', () => {
    const c = INDICE.temas['rancho-alegre'].clips[0];
    expect(fatiarClipe(new ArrayBuffer(10), c)).toBeNull();
  });

  it('metas por tema: baixa < 2 MB e, tudo aberto a 22 050 Hz mono, < 15 MB', () => {
    const temas = JSON_INDICE.temas as Record<string, { clips: { amostrasArquivo: number }[] }>;
    for (const id of TEMAS) {
      const bytes = INDICE.temas[id].bytesPacote!;
      expect(bytes, id).toBeLessThan(2 * 1024 * 1024);
      const amostras = temas[id].clips.reduce((s, c) => s + c.amostrasArquivo, 0);
      expect((amostras * 4) / 1048576, id).toBeLessThan(15);
    }
  });

  it('cada clipe toca numa camada; as camadas em laço têm laço', () => {
    for (const id of TEMAS)
      for (const c of INDICE.temas[id].clips) {
        expect(camadaDoClip(c), `${id}/${c.id}`).not.toBeNull();
        if (c.tipo === 'camada') expect(c.amostrasLaco, `${id}/${c.id}`).toBeGreaterThan(0);
      }
  });

  it('só abre o que a mistura toca, mais o próximo provável', () => {
    const t = INDICE.temas['doce-reino'];
    const dia = clipsDaMistura(t, alvoMix(e(), true, false).g);
    expect([...dia].every((id) => id === 'base' || id.startsWith('dia_'))).toBe(true);
    expect(dia.has('noite')).toBe(false);
    const prov = clipsProvaveis(t, e(), true, false);
    expect(prov.has('mov')).toBe(true);
    expect([...prov].some((id) => id.startsWith('tarde_'))).toBe(true);
    expect(prov.has('perigo')).toBe(false);
    expect(prov.has('amigos')).toBe(false);
    expect(prov.size).toBeLessThan(t.clips.length);
  });

  it('no sobrevivência, à noite, o perigo já fica aberto (menos no Rancho e de dia)', () => {
    const t = INDICE.temas['doce-reino'];
    const noite = e({ hora: 'noite' });
    expect(clipsProvaveis(t, noite, true, false).has('perigo')).toBe(false);
    expect(clipsProvaveis(t, noite, true, false, true).has('perigo')).toBe(true);
    // depois da perseguição, a noite segue: continua aberto
    expect(clipsProvaveis(t, { ...noite, perigo: false }, true, false, true).has('perigo')).toBe(
      true,
    );
    expect(clipsProvaveis(t, e(), true, false, true).has('perigo')).toBe(false);
    expect(clipsProvaveis(t, noite, false, true, true).has('perigo')).toBe(false);
  });
});

describe('tempo da música', () => {
  const t = INDICE.temas['rancho-alegre'];
  const bar = duracaoCompasso(t);

  it('a troca cai sempre no começo de um compasso, depois de agora', () => {
    for (const agora of [0, 0.01, 0.5, bar - 0.01, bar, 3.3 * bar, 17.99]) {
      const tb = proximoCompasso(10, bar, 10 + agora);
      const n = (tb - 10) / bar;
      expect(Math.abs(n - Math.round(n))).toBeLessThan(1e-9);
      expect(tb).toBeGreaterThan(10 + agora);
      expect(tb - (10 + agora)).toBeLessThanOrEqual(bar + 0.06);
    }
  });

  it('as frases seguem a forma do tema, volta a volta', () => {
    expect(inicioFrase(2, t, 0, 0)).toBe(2);
    expect(inicioFrase(2, t, 0, 2)).toBeCloseTo(2 + 8 * bar, 9);
    expect(inicioFrase(2, t, 1, 0)).toBeCloseTo(2 + t.amostrasVolta / TAXA_TRILHA, 9);
  });

  it('a camada que entra atrasada entra no ponto certo do laço', () => {
    const L = 31500;
    expect(posicaoNoLaco(5, 5, L, 1323)).toBeCloseTo(1323 / TAXA_TRILHA, 9);
    expect(posicaoNoLaco(5, 5 + L / TAXA_TRILHA + 0.25, L, 1323)).toBeCloseTo(
      1323 / TAXA_TRILHA + 0.25,
      6,
    );
  });

  it('uma volta em cada VOLTAS_POR_RESPIRO respira', () => {
    const resp = Array.from({ length: 12 }, (_, v) => voltaDeRespiro(v));
    expect(resp.filter(Boolean).length).toBe(12 / VOLTAS_POR_RESPIRO);
    expect(resp[0]).toBe(false);
  });

  it('o sorteio nunca repete a mesma versão seguida', () => {
    let s = 1;
    const rng = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const so = new SorteioSemRepetir(rng);
    for (const n of [2, 3]) {
      let antes = -1;
      for (let i = 0; i < 200; i++) {
        const k = so.escolher(n, `x${n}`);
        expect(k).not.toBe(antes);
        expect(k).toBeGreaterThanOrEqual(0);
        expect(k).toBeLessThan(n);
        antes = k;
      }
    }
    expect(so.escolher(1, 'um')).toBe(0);
    expect(so.escolher(1, 'um')).toBe(0);
  });

  it('interpolar segue as rampas lineares', () => {
    const pts: [number, number][] = [
      [0, 1],
      [2, 1],
      [4, 0],
    ];
    expect(interpolar(pts, -1)).toBe(1);
    expect(interpolar(pts, 3)).toBeCloseTo(0.5);
    expect(interpolar(pts, 9)).toBe(0);
  });
});

// ------------------------------------------------------------------ Web Audio falso

class Param {
  value: number;
  chamadas: [string, number, number][] = [];
  constructor(v = 1) {
    this.value = v;
  }
  setValueAtTime(v: number, t: number) {
    this.chamadas.push(['set', v, t]);
  }
  linearRampToValueAtTime(v: number, t: number) {
    this.chamadas.push(['rampa', v, t]);
  }
  setTargetAtTime(v: number, t: number) {
    this.chamadas.push(['alvo', v, t]);
  }
  cancelScheduledValues(t: number) {
    this.chamadas.push(['cancelar', 0, t]);
  }
}

class No {
  saidas: unknown[] = [];
  connect(d: unknown) {
    this.saidas.push(d);
    return d;
  }
  disconnect() {
    this.saidas = [];
  }
}

class Fonte extends No {
  buffer: { id: string } | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  onended: (() => void) | null = null;
  inicio: [number, number] | null = null;
  parada = false;
  start(t: number, off: number) {
    this.inicio = [t, off];
  }
  stop() {
    this.parada = true;
  }
}

class Ctx {
  currentTime = 0;
  fontes: Fonte[] = [];
  createGain() {
    return Object.assign(new No(), { gain: new Param(1) });
  }
  createBiquadFilter() {
    return Object.assign(new No(), { type: '', frequency: new Param(20000), Q: new Param(1) });
  }
  createDelay() {
    return Object.assign(new No(), { delayTime: new Param(0) });
  }
  createBufferSource() {
    const f = new Fonte();
    this.fontes.push(f);
    return f;
  }
}

function buscarDoDisco(falhar = false) {
  const pedidos: string[] = [];
  const buscar = async (url: string) => {
    pedidos.push(url);
    if (falhar) throw new Error('sem rede');
    const caminho = url.replace(/^\//, 'public/');
    const ab = lerArrayBuffer(caminho);
    return {
      ok: true,
      arrayBuffer: async () => ab,
      json: async () => JSON.parse(lerTexto(caminho)),
    };
  };
  return { buscar, pedidos };
}

/** "Decodifica" achando o clipe pelos bytes: o buffer leva o tamanho em amostras do índice. */
function decodificarFalso(tema: TemaTrilha) {
  const pacote = lerBytes(`public/sons/pacotes/${tema.id}-musica.mp3`);
  const chave = (b: Uint8Array) => {
    const m = b.byteLength >> 1;
    return `${b.byteLength}:${Array.from(b.subarray(m, m + 24)).join(',')}`;
  };
  const porChave = new Map(
    tema.clips.map((c) => [chave(pacote.subarray(c.o[0], c.o[0] + c.o[1])), c]),
  );
  return async (bytes: ArrayBuffer) => {
    const c = porChave.get(chave(new Uint8Array(bytes)))!;
    const amostras = (c.amostrasLaco ?? c.amostrasNominais ?? 0) + c.folgaAntes * 2;
    return {
      id: c.id,
      length: amostras,
      numberOfChannels: 1,
      duration: amostras / TAXA_TRILHA,
    } as unknown as AudioBuffer;
  };
}

async function montar(temaId = 'doce-reino') {
  esquecerIndiceTrilha();
  const tema = INDICE.temas[temaId];
  const { buscar, pedidos } = buscarDoDisco();
  const car = new CarregadorTrilha({ buscar, decodificar: decodificarFalso(tema), base: '/' });
  expect(await car.baixar(temaId)).toBe(true);
  const ctx = new Ctx();
  const destino = new No();
  const m = new TrilhaGravada(
    ctx as unknown as BaseAudioContext,
    destino as unknown as AudioNode,
    car.tema!,
    car,
    { temPerigo: temaId !== 'rancho-alegre', rancho: temaId === 'rancho-alegre', rng: () => 0.3 },
  );
  return { ctx, car, m, tema, pedidos };
}

describe('carregador da trilha', () => {
  it('baixa o índice e o pacote do tema pelo endereço do site', async () => {
    const { car, pedidos } = await montar('rancho-alegre');
    expect(pedidos).toEqual(['/sons/indice.json', '/sons/pacotes/rancho-alegre-musica.mp3']);
    expect(car.medidas().bytesBaixados).toBe(INDICE.temas['rancho-alegre'].bytesPacote);
    expect(car.medidas().abertos).toBe(0);
  });

  it('abre um por vez, conta a memória e solta', async () => {
    const { car, tema } = await montar('rancho-alegre');
    const [a, b] = await Promise.all([car.abrir('base'), car.abrir('noite'), car.abrir('base')]);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    const m = car.medidas();
    expect(m.abertos).toBe(2);
    const base = tema.clips.find((c) => c.id === 'base')!;
    expect(m.bytesDecodificados).toBe(2 * (base.amostrasLaco! + 2 * base.folgaAntes) * 4);
    car.soltar('noite');
    expect(car.medidas().abertos).toBe(1);
    car.soltarTudo();
    expect(car.medidas()).toMatchObject({ abertos: 0, bytesDecodificados: 0, bytesBaixados: 0 });
    expect(await car.abrir('base')).toBeNull();
  });

  it('o que estava na fila ao sair não abre depois', async () => {
    const { car } = await montar();
    const p = car.abrir('noite');
    car.soltarTudo();
    expect(await p).toBeNull();
    expect(car.medidas().abertos).toBe(0);
  });

  it('sem rede: falha em silêncio (a trilha de hoje continua)', async () => {
    esquecerIndiceTrilha();
    const { buscar } = buscarDoDisco(true);
    const car = new CarregadorTrilha({ buscar, decodificar: async () => ({}) as AudioBuffer });
    expect(await car.baixar('doce-reino')).toBe(false);
    expect(car.falhou).toBe(true);
    expect(car.pronto).toBe(false);
  });
});

describe('motor da trilha gravada', () => {
  it('passa pelo ajuste de volume do tema e troca o ajuste junto com o contexto', async () => {
    const { ctx, m } = await montar('exploracao-lunar');
    m.iniciar(e(), 0.3);
    expect(m.ganhoNivel).toBeCloseTo(nivelTrilha('exploracao-lunar', 'dia'), 9);
    ctx.currentTime = 1;
    const tb = m.mudar(e({ hora: 'noite' }))!;
    const nivel = (m as unknown as { nivel: { gain: Param } }).nivel.gain;
    const rampa = nivel.chamadas.filter((c) => c[0] === 'rampa').pop()!;
    expect(rampa[1]).toBeCloseTo(nivelTrilha('exploracao-lunar', 'noite'), 9);
    expect(rampa[2]).toBeCloseTo(tb + 1.5 * m.compasso, 9);
    expect(nivelTrilha('exploracao-lunar', 'noite')).toBeGreaterThan(
      nivelTrilha('exploracao-lunar', 'dia'),
    );
  });

  it('troca de contexto no meio da rampa do ajuste de volume: segue de onde está, sem degrau', async () => {
    const { ctx, m } = await montar('exploracao-lunar');
    m.iniciar(e(), 0.3);
    const dia = nivelTrilha('exploracao-lunar', 'dia');
    const noite = nivelTrilha('exploracao-lunar', 'noite');
    ctx.currentTime = 1;
    const tb = m.mudar(e({ hora: 'noite' }))!;
    // no meio da rampa dia → noite, volta o dia
    ctx.currentTime = tb + 0.75 * m.compasso;
    const meio = m.ganhoNivel;
    expect(meio).toBeGreaterThan(dia + 1e-4);
    expect(meio).toBeLessThan(noite - 1e-4);
    const tb2 = m.mudar(e())!;
    const nivel = (m as unknown as { nivel: { gain: Param } }).nivel.gain;
    const ultimas = nivel.chamadas.slice(-4);
    // cancela só daqui para a frente e prende o valor de agora (o do meio da rampa)
    expect(ultimas[0]).toEqual(['cancelar', 0, ctx.currentTime]);
    expect(ultimas[1][0]).toBe('set');
    expect(ultimas[1][1]).toBeCloseTo(meio, 9);
    // segue subindo até o compasso da troca e de lá desce de volta ao dia
    expect(m.ganhoNivel).toBeCloseTo(meio, 9);
    ctx.currentTime = tb2 + 1.5 * m.compasso + 0.01;
    expect(m.ganhoNivel).toBeCloseTo(dia, 9);
  });

  it('começa com as camadas do contexto no compasso 0 e a frase A', async () => {
    const { ctx, car, m } = await montar();
    await car.abrir('base');
    for (const id of clipsDaMistura(car.tema!, alvoMix(e(), true, false).g)) await car.abrir(id);
    m.iniciar(e(), 0.3);
    const base = ctx.fontes.find((f) => f.buffer?.id === 'base')!;
    expect(base.loop).toBe(true);
    expect(base.inicio).toEqual([0.3, 1323 / TAXA_TRILHA]);
    expect(base.loopStart).toBeCloseTo(1323 / TAXA_TRILHA, 9);
    expect(base.loopEnd - base.loopStart).toBeCloseTo(car.tema!.amostrasVolta / TAXA_TRILHA, 6);
    const frase = ctx.fontes.find((f) => f.buffer?.id.startsWith('dia_a_'))!;
    expect(frase.inicio).toEqual([0.3, 1323 / TAXA_TRILHA]);
    // a noite não toca de dia: nem abre
    expect(ctx.fontes.some((f) => f.buffer?.id === 'noite')).toBe(false);
  });

  it('troca de contexto no próximo compasso: sobe em 1 e desce em 1,5', async () => {
    const { ctx, car, m } = await montar();
    for (const id of clipsDaMistura(car.tema!, alvoMix(e(), true, false).g)) await car.abrir(id);
    await car.abrir('noite');
    await car.abrir('pingos');
    m.iniciar(e(), 0.3);
    const bar = m.compasso;
    ctx.currentTime = 0.3 + 2.4 * bar;
    const tb = m.mudar(e({ caverna: true }))!;
    expect(tb).toBeCloseTo(0.3 + 3 * bar, 9);
    // antes do compasso nada mudou
    expect(m.valor('noite', tb - 0.01)).toBe(0);
    expect(m.valor('fdia', tb - 0.01)).toBe(1);
    expect(m.valor('noite', tb + bar)).toBeCloseTo(1, 9);
    expect(m.valor('fdia', tb + bar)).toBeGreaterThan(0);
    expect(m.valor('fdia', tb + 1.5 * bar)).toBeCloseTo(0, 9);
    expect(m.valor('base', tb + 1.5 * bar)).toBeCloseTo(0.6, 9);
    // a camada da noite liga já (em silêncio até o compasso), no ponto certo do laço
    const noite = ctx.fontes.find((f) => f.buffer?.id === 'noite')!;
    expect(noite.inicio![0]).toBeCloseTo(ctx.currentTime + 0.05, 9);
    expect(noite.inicio![1]).toBeCloseTo(1323 / TAXA_TRILHA + (ctx.currentTime + 0.05 - 0.3), 6);
    // sem mudança, sem troca
    expect(m.mudar(e({ caverna: true }))).toBeNull();
    expect(m.info().troca).toEqual({ pedida: ctx.currentTime, compasso: tb });
  });

  it('as frases entram no compasso da forma, sem repetir a versão e respirando', async () => {
    const { ctx, car, m } = await montar();
    for (const c of car.tema!.clips) await car.abrir(c.id);
    m.iniciar(e(), 0.3);
    const t = car.tema!;
    const volta = t.amostrasVolta / TAXA_TRILHA;
    for (let s = 0; s <= VOLTAS_POR_RESPIRO * volta + 1; s += 0.2) {
      ctx.currentTime = 0.3 + s;
      m.agendar();
    }
    const frases = ctx.fontes.filter((f) => f.buffer?.id.startsWith('dia_'));
    // cada frase começa num compasso da forma
    for (const f of frases) {
      const n = ((f.inicio![0] - 0.3) * TAXA_TRILHA) / t.amostrasCompasso;
      expect(Math.abs(n - Math.round(n))).toBeLessThan(1e-6);
    }
    // a frase A com duas versões alterna de uma volta para a outra
    const a = frases.filter((f) => /^dia_a_\d$/.test(f.buffer!.id)).map((f) => f.buffer!.id);
    // voltas 0, 1 e 2, a 3 respira, e a 4 começa dentro da janela
    expect(a.length).toBe(VOLTAS_POR_RESPIRO);
    for (let i = 1; i < a.length; i++) expect(a[i]).not.toBe(a[i - 1]);
    // a volta de respiro não tem frase
    const ini = (VOLTAS_POR_RESPIRO - 1) * volta + 0.3;
    expect(
      frases.some((f) => f.inicio![0] >= ini - 1e-6 && f.inicio![0] < ini + volta - 1e-6),
    ).toBe(false);
    // e o entardecer, que não toca de dia, nem foi agendado
    expect(ctx.fontes.some((f) => f.buffer?.id.startsWith('tarde_'))).toBe(false);
  });

  it('a camada que parou de tocar é solta depois de um tempo; parar solta os nós', async () => {
    const { ctx, car, m } = await montar();
    for (const c of car.tema!.clips) await car.abrir(c.id);
    m.iniciar(e({ amigos: true }), 0.3);
    expect(ctx.fontes.some((f) => f.buffer?.id === 'amigos')).toBe(true);
    ctx.currentTime = 1;
    m.mudar(e());
    for (let s = 1; s < 120; s += 0.5) {
      ctx.currentTime = s;
      m.agendar();
    }
    const amigos = ctx.fontes.find((f) => f.buffer?.id === 'amigos')!;
    expect(amigos.parada).toBe(true);
    expect(car.aberto('amigos')).toBe(false);
    expect(car.aberto('perigo')).toBe(false);
    expect(car.aberto('base')).toBe(true);
    m.parar();
    expect(m.ativo).toBe(false);
    expect(m.mudar(e({ hora: 'noite' }))).toBeNull();
  });

  it('relógio atrasado (aba em segundo plano): a frase entra no meio, no compasso certo', async () => {
    const { ctx, car, m } = await montar();
    for (const c of car.tema!.clips) await car.abrir(c.id);
    m.iniciar(e(), 0.3);
    const t = car.tema!;
    const ia = inicioFrase(0.3, t, 0, 2);
    ctx.currentTime = ia + 0.5;
    m.agendar();
    const b = ctx.fontes.find((f) => f.buffer?.id.startsWith('dia_b_'))!;
    expect(b.inicio![0]).toBeCloseTo(ia + 0.52, 9);
    expect(b.inicio![1]).toBeCloseTo(1323 / TAXA_TRILHA + 0.52, 9);
  });

  it('todas as camadas e só elas', () => {
    expect(CAMADAS.filter((k) => !LACOS.includes(k))).toEqual(['fdia', 'ftarde']);
  });
});
