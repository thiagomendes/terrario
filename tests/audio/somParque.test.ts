import { describe, expect, it } from 'vitest';
import { criarMotorAudio } from '../../src/audio/motor';
import { REALEJO, TAXA_PARQUE } from '../../src/audio/realejo';
import {
  GANHO_PARQUE,
  GANHO_REALEJO_DB,
  GANHO_ZUMBIDO_DB,
  MAX_VOZES_PARQUE,
  criarSomParque,
  type ToqueParque,
} from '../../src/audio/somParque';
import { GANHO_SHOW, posicaoNoLaco } from '../../src/audio/somVila';
import { nivelTrilha } from '../../src/audio/trilha';
import type { PontosParque } from '../../src/world/vilaParque';

interface Ponto {
  t: string;
  v: number;
  em: number;
}
class Param {
  value = 1;
  pontos: Ponto[] = [];
  setValueAtTime(v: number, em: number) {
    this.pontos.push({ t: 'set', v, em });
  }
  setTargetAtTime(v: number, em: number) {
    this.pontos.push({ t: 'alvo', v, em });
  }
  linearRampToValueAtTime(v: number, em: number) {
    this.pontos.push({ t: 'rampa', v, em });
  }
  cancelScheduledValues() {}
}
class No {
  gain = new Param();
  ligados: No[] = [];
  connect(d: No) {
    this.ligados.push(d);
    return d;
  }
  disconnect() {}
}
class Buf {
  dados: Float32Array | null = null;
  constructor(
    public length: number,
    public sampleRate: number,
  ) {}
  get duration() {
    return this.length / this.sampleRate;
  }
  copyToChannel(d: Float32Array) {
    this.dados = d;
  }
}
class Fonte extends No {
  buffer: Buf | null = null;
  loop = false;
  onended: (() => void) | null = null;
  inicio: [number, number] | null = null;
  paradaEm: number | null = null;
  start(t = 0, off = 0) {
    this.inicio = [t, off];
  }
  stop(t = 0) {
    this.paradaEm = t;
  }
}
class Ctx {
  destination = {};
  currentTime = 0;
  state = 'running';
  fontes: Fonte[] = [];
  buffers: Buf[] = [];
  resume() {
    return Promise.resolve();
  }
  createGain() {
    return new No();
  }
  createDynamicsCompressor() {
    return new No();
  }
  createBuffer(_c: number, n: number, taxa: number) {
    const b = new Buf(n, taxa);
    this.buffers.push(b);
    return b;
  }
  createBufferSource() {
    const f = new Fonte();
    this.fontes.push(f);
    return f;
  }
}

/** O carrossel no (0, 0), a roda 20 blocos a leste e o bate-bate 20 a oeste. */
const PARQUE = {
  carrossel: { x: 0, y: 1, z: 0, raio: 4, beira: 5 },
  roda: { x: 20, y: 8, z: 0 },
  bate: { x: -20, y: 1, z: 0 },
} as unknown as PontosParque;

const dbLin = (db: number) => Math.pow(10, db / 20);

async function montar(
  o: { D?: number; ativar?: boolean; volumes?: () => { musica: number; natureza: number } } = {},
) {
  const ctx = new Ctx();
  const motor = criarMotorAudio(() => ctx as never, { maxVozes: 40 });
  if (o.ativar !== false) await motor.ativar();
  ctx.fontes.length = 0;
  ctx.buffers.length = 0;
  const calar: number[] = [];
  const tocados: string[] = [];
  const som = criarSomParque({
    motor,
    parque: PARQUE,
    volumes: o.volumes,
    aoCalarTrilha: (f) => calar.push(f),
    aoTocar: (id) => tocados.push(id),
  });
  /** Relógios: núcleo = AudioContext + D. */
  const D = o.D ?? 100;
  const passo = (t: number, ouv: { x: number; z: number }, noite = 0, calado = false) => {
    ctx.currentTime = t;
    som.quadro(ouv, t + D, noite, calado);
  };
  /** Anda o tempo de `de` até `ate` em quadros de 1/60 s, parado em `ouv`. */
  const andar = (
    de: number,
    ate: number,
    ouv: { x: number; z: number },
    noite = 0,
    calado = false,
  ) => {
    for (let t = de; t <= ate + 1e-9; t += 1 / 60) passo(t, ouv, noite, calado);
  };
  /** Chega perto do carrossel até tudo ficar pronto; devolve quantos quadros levou. */
  const preparar = (ouv = { x: 3, z: 0 }) => {
    let q = 0;
    while (!som.info().pronto && q < 2000) passo(++q / 60, ouv);
    return q;
  };
  const fontesDe = (id: string) =>
    ctx.fontes.filter((f) => f.inicio && tocadosPorFonte.get(f) === id);
  // a ordem das fontes criadas é a ordem dos `aoTocar`
  const tocadosPorFonte = new Map<Fonte, string>();
  const registrar = () => ctx.fontes.forEach((f, i) => tocadosPorFonte.set(f, tocados[i]));
  return { ctx, motor, som, calar, tocados, passo, andar, preparar, fontesDe, registrar, D };
}

const ganhoDe = (f: Fonte) => f.ligados[0] as No;
/** O último alvo pedido ao ganho (ou o valor, se nenhum). */
const alvoDe = (f: Fonte) => {
  const g = ganhoDe(f).gain;
  const a = g.pontos.filter((p) => p.t === 'alvo');
  return a.length ? a[a.length - 1].v : g.value;
};

describe('o tocador do parque (contexto falso)', () => {
  it('não faz nada sem o som ligado (nem amostras, nem toques)', async () => {
    const { som, ctx, passo, calar } = await montar({ ativar: false });
    passo(1, { x: 0, z: 0 }, 1);
    expect(som.info().prontos).toBe(0);
    expect(som.tocar('sininho')).toBe(false);
    expect(ctx.fontes).toHaveLength(0);
    expect(calar).toEqual([]);
  });

  it('as amostras só são feitas perto do carrossel, aos poucos (nunca tudo num quadro só)', async () => {
    const { som, passo, preparar, ctx } = await montar();
    passo(0.1, { x: 200, z: 0 });
    passo(0.2, { x: 75, z: 0 });
    expect(som.info().prontos).toBe(0);
    passo(0.3, { x: 69, z: 0 });
    const primeiro = som.info().prontos;
    expect(primeiro).toBeGreaterThan(0);
    expect(primeiro).toBeLessThan(15);
    const quadros = preparar({ x: 69, z: 0 });
    expect(quadros).toBeGreaterThan(1);
    expect(som.info().pronto).toBe(true);
    const real = ctx.buffers.find((b) => b.length === Math.round(REALEJO.duracao * TAXA_PARQUE));
    expect(real?.dados?.length).toBe(real?.length);
    expect(real?.sampleRate).toBe(TAXA_PARQUE);
  });

  it('o realejo cresce ao chegar perto do carrossel, some longe, e segue o "Música"', async () => {
    let musica = 1;
    const { som, preparar, andar, fontesDe, registrar, calar } = await montar({
      volumes: () => ({ musica, natureza: 1 }),
    });
    preparar({ x: 60, z: 0 });
    andar(40, 42, { x: 60, z: 0 });
    expect(som.info().realejo).toBe(0);
    expect(som.info().tocando).not.toContain('realejo');
    const niveis: number[] = [];
    let t = 42;
    for (const d of [30, 20, 12, 7, 2]) {
      andar(t, t + 2, { x: d, z: 0 });
      t += 2.1;
      niveis.push(som.info().realejo);
    }
    for (let i = 1; i < niveis.length; i++) expect(niveis[i]).toBeGreaterThan(niveis[i - 1] - 1e-9);
    expect(niveis[0]).toBeGreaterThan(0);
    expect(niveis[0]).toBeLessThan(0.2);
    expect(niveis[3]).toBe(1);
    registrar();
    const [f] = fontesDe('realejo');
    expect(f.loop).toBe(true);
    expect(alvoDe(f)).toBeCloseTo(dbLin(GANHO_REALEJO_DB), 6);
    // cheio perto, a trilha do bairro cala inteira
    expect(calar[calar.length - 1]).toBe(1);
    // o "Música" pela metade: o realejo também
    musica = 0.5;
    andar(t, t + 0.5, { x: 2, z: 0 });
    expect(alvoDe(f)).toBeCloseTo(dbLin(GANHO_REALEJO_DB) * 0.5, 6);
    // longe de novo: some, solta a trilha e a fonte para depois de um tempo calada
    andar(t + 0.6, t + 6, { x: 60, z: 0 });
    expect(som.info().realejo).toBe(0);
    expect(calar[calar.length - 1]).toBe(0);
    expect(f.paradaEm).not.toBeNull();
    expect(som.info().tocando).not.toContain('realejo');
  });

  it('o realejo cheio fica abaixo do show da Vila (o show é a música mais alta)', () => {
    expect(dbLin(GANHO_REALEJO_DB)).toBeLessThan(GANHO_SHOW * nivelTrilha('vila-neon', 'dia'));
    expect(GANHO_ZUMBIDO_DB).toBeLessThan(GANHO_REALEJO_DB);
  });

  it('dois jogadores no mesmo tempo do núcleo entram no mesmo compasso (relógios diferentes)', async () => {
    const a = await montar({ D: 100 });
    const b = await montar({ D: 7.3 });
    a.preparar({ x: 60, z: 0 });
    b.preparar({ x: 60, z: 0 });
    // o mesmo instante do núcleo (153,5 s) nos dois, cada um no relógio dele
    const tn = 153.5;
    a.passo(tn - a.D, { x: 2, z: 0 });
    b.passo(tn - b.D, { x: 2, z: 0 });
    a.registrar();
    b.registrar();
    const [fa] = a.fontesDe('realejo');
    const [fb] = b.fontesDe('realejo');
    expect(fa.inicio![1]).toBeCloseTo(fb.inicio![1], 6);
    // e na fase do relógio do núcleo
    expect(fa.inicio![1]).toBeCloseTo(posicaoNoLaco(fa.inicio![0] + a.D, 0, REALEJO.duracao), 6);
    // quem volta depois de parar entra de novo na fase certa
    a.andar(tn - a.D + 0.1, tn - a.D + 8, { x: 80, z: 0 });
    expect(fa.paradaEm).not.toBeNull();
    a.passo(tn - a.D + 30, { x: 2, z: 0 });
    a.registrar();
    const fa2 = a.fontesDe('realejo')[1];
    expect(fa2.inicio![1]).toBeCloseTo(posicaoNoLaco(fa2.inicio![0] + a.D, 0, REALEJO.duracao), 6);
  });

  it('com o show da Vila perto (calado) o realejo some em ~1 s e solta a trilha', async () => {
    const { som, preparar, andar, calar, fontesDe, registrar } = await montar();
    preparar({ x: 2, z: 0 });
    andar(40, 41, { x: 2, z: 0 });
    expect(som.info().realejo).toBe(1);
    expect(calar[calar.length - 1]).toBe(1);
    andar(41.02, 42.1, { x: 2, z: 0 }, 0, true);
    expect(som.info().realejo).toBeLessThan(0.05);
    expect(calar[calar.length - 1]).toBe(0);
    registrar();
    expect(alvoDe(fontesDe('realejo')[0])).toBe(0);
    // e volta quando o show acaba
    andar(42.2, 44, { x: 2, z: 0 });
    expect(som.info().realejo).toBe(1);
    expect(calar[calar.length - 1]).toBe(1);
  });

  it('os toques: régua por som, mais baixo longe, mudo além de 28 blocos', async () => {
    const { som, preparar, passo, fontesDe, registrar, tocados } = await montar();
    preparar({ x: 60, z: 0 });
    passo(50, { x: 60, z: 0 });
    expect(som.tocar('sininho', { x: 62, z: 0 })).toBe(true);
    passo(51, { x: 60, z: 0 });
    expect(som.tocar('sininho', { x: 77, z: 0 })).toBe(true);
    passo(52, { x: 60, z: 0 });
    expect(som.tocar('sininho', { x: 90, z: 0 })).toBe(false);
    registrar();
    const [perto, meio] = fontesDe('sininho');
    expect(ganhoDe(perto).gain.value).toBeCloseTo(dbLin(GANHO_PARQUE.sininho), 6);
    expect(ganhoDe(meio).gain.value).toBeGreaterThan(0);
    expect(ganhoDe(meio).gain.value).toBeLessThan(ganhoDe(perto).gain.value / 2);
    expect(perto.loop).toBe(false);
    expect(tocados.filter((x) => x === 'sininho')).toHaveLength(2);
    // sem lugar: cheio
    passo(53, { x: 60, z: 0 });
    expect(som.tocar('floreio')).toBe(true);
  });

  it('intervalo mínimo por som (a risada mais longo) e no máximo 6 vozes juntas', async () => {
    const { som, preparar, passo, ctx } = await montar();
    preparar({ x: 60, z: 0 });
    passo(50, { x: 60, z: 0 });
    expect(som.tocar('tum')).toBe(true);
    expect(som.tocar('tum')).toBe(false);
    ctx.currentTime = 50.06;
    expect(som.tocar('tum')).toBe(false);
    ctx.currentTime = 50.14;
    expect(som.tocar('tum')).toBe(true);
    expect(som.tocar('risada')).toBe(true);
    ctx.currentTime = 50.5;
    expect(som.tocar('risada')).toBe(false);
    ctx.currentTime = 50.8;
    expect(som.tocar('risada')).toBe(true);
    // 3 tocando (dois "tum" de 0,25 s já acabaram? o primeiro sim): enche até o teto
    passo(60, { x: 60, z: 0 });
    const lista: ToqueParque[] = [
      'algodao',
      'roda',
      'floreio',
      'estouro',
      'agua',
      'balao',
      'argola',
    ];
    const ok = lista.map((q) => som.tocar(q));
    expect(ok.filter(Boolean)).toHaveLength(MAX_VOZES_PARQUE);
    expect(ok[ok.length - 1]).toBe(false);
    expect(som.info().tocando).toHaveLength(MAX_VOZES_PARQUE);
    // um pouco depois, as curtas acabaram: cabe de novo
    passo(63.5, { x: 60, z: 0 });
    expect(som.tocar('argola')).toBe(true);
  });

  it('as variações: a risada alterna as duas, o estouro roda as três (ou a pedida em `n`)', async () => {
    const { som, preparar, passo, ctx } = await montar();
    preparar({ x: 60, z: 0 });
    const usados: unknown[] = [];
    for (let i = 0; i < 4; i++) {
      passo(50 + i, { x: 60, z: 0 });
      som.tocar('estouro');
      usados.push(ctx.fontes[ctx.fontes.length - 1].buffer);
    }
    expect(new Set(usados.slice(0, 3)).size).toBe(3);
    expect(usados[3]).toBe(usados[0]);
    passo(60, { x: 60, z: 0 });
    som.tocar('risada', undefined, 1);
    const r1 = ctx.fontes[ctx.fontes.length - 1].buffer;
    passo(61, { x: 60, z: 0 });
    som.tocar('risada', undefined, 0);
    expect(ctx.fontes[ctx.fontes.length - 1].buffer).not.toBe(r1);
  });

  it('o zumbido das lâmpadas: só de noite e dentro do parque, baixinho, no "Natureza"', async () => {
    let natureza = 1;
    const { som, preparar, andar, fontesDe, registrar } = await montar({
      volumes: () => ({ musica: 1, natureza }),
    });
    preparar({ x: 60, z: 0 });
    // de dia, dentro: nada
    andar(40, 42, { x: 10, z: 5 });
    expect(som.info().tocando).not.toContain('zumbido');
    // de noite, fora do parque (a 40 blocos da roda, o brinquedo mais perto): nada
    andar(42, 44, { x: 60, z: 0 }, 1);
    expect(som.info().tocando).not.toContain('zumbido');
    // de noite, dentro (perto do bate-bate, longe do carrossel): toca e cresce em ~1,5 s
    andar(44, 44.5, { x: -40, z: 0 }, 1);
    expect(som.info().tocando).toContain('zumbido');
    expect(som.info().zumbido).toBeGreaterThan(0.3);
    expect(som.info().zumbido).toBeLessThan(1);
    andar(44.5, 47, { x: -40, z: 0 }, 1);
    expect(som.info().zumbido).toBeGreaterThan(0.99);
    registrar();
    const [z] = fontesDe('zumbido');
    expect(z.loop).toBe(true);
    expect(alvoDe(z)).toBeCloseTo(dbLin(GANHO_ZUMBIDO_DB), 6);
    natureza = 0.5;
    andar(47, 47.5, { x: -40, z: 0 }, 1);
    expect(alvoDe(z)).toBeCloseTo(dbLin(GANHO_ZUMBIDO_DB) * 0.5, 6);
    // amanheceu: some e para
    andar(47.5, 52, { x: -40, z: 0 }, 0.2);
    expect(som.info().zumbido).toBe(0);
    expect(z.paradaEm).not.toBeNull();
  });

  it('liberar() para tudo e solta a trilha', async () => {
    const { som, preparar, andar, ctx, calar } = await montar();
    preparar({ x: 2, z: 0 });
    andar(40, 41, { x: 2, z: 0 }, 1);
    som.tocar('algodao');
    expect(som.info().tocando).toEqual(expect.arrayContaining(['algodao', 'realejo', 'zumbido']));
    som.liberar();
    for (const f of ctx.fontes) expect(f.paradaEm, 'fonte parada').not.toBeNull();
    expect(calar[calar.length - 1]).toBe(0);
    expect(som.info().tocando).toEqual([]);
    expect(som.info().prontos).toBe(0);
    expect(som.tocar('algodao')).toBe(false);
  });
});
