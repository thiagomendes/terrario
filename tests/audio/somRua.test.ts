import { describe, expect, it } from 'vitest';
import { criarMotorAudio } from '../../src/audio/motor';
import { ALVO_RMS_DB, PICO_MAXIMO, emDb, picoDe, rmsSoando } from '../../src/audio/realejo';
import {
  AMOSTRAS_RUA,
  FALAS_DO_ORELHAO,
  FALA_ORELHAO_EM,
  GANHO_RUA,
  MAX_VOZES_RUA,
  TAXA_RUA,
  criarSomRua,
  orelhao,
  orelhaoAosPoucos,
  type ToqueRua,
} from '../../src/audio/somRua';
import { FALAS, duracaoDaFala, falaDoOrelhao } from '../../src/audio/vozBoba';

const TAXA = TAXA_RUA;
const media = (x: Float32Array) => x.reduce((s, v) => s + v, 0) / x.length;

/** As durações esperadas (s) de cada amostra (±0,05). */
const DURACOES: Record<keyof typeof AMOSTRAS_RUA, number> = {
  campainha: 0.5,
  fita: 0.3,
  liquidificador: 1,
  revista: 0.3,
  revistaFecha: 0.3,
  letreiro: 0.4,
  balaoDesce: 0.9,
  balaoPresente: 0.8,
  carimbo: 0.35,
  feno: 0.4,
  cocho: 0.5,
  lhamaFeliz: 0.72,
  prenda: 0.8,
  vovo: 1.05,
};

/** Na régua, sem NaN, sem estalo nas bordas, sem desvio, pico até 0,9. */
function naRegua(x: Float32Array): void {
  expect(x.every(Number.isFinite)).toBe(true);
  expect(Math.abs(x[0])).toBeLessThan(1e-3);
  expect(Math.abs(x[x.length - 1])).toBeLessThan(1e-3);
  expect(Math.abs(media(x))).toBeLessThan(2e-3);
  expect(picoDe(x)).toBeLessThanOrEqual(PICO_MAXIMO);
  expect(picoDe(x)).toBeGreaterThan(0.05);
  expect(Math.abs(emDb(rmsSoando(x, TAXA)) - ALVO_RMS_DB)).toBeLessThan(1.5);
}

/** O contorno de volume (janelas de 20 ms), esticado para `n` pontos e com o pico em 1. */
function contorno(x: Float32Array, n = 40): number[] {
  const w = Math.round(0.02 * TAXA);
  const env: number[] = [];
  for (let i = 0; i < x.length; i += w) {
    let s = 0;
    const fim = Math.min(x.length, i + w);
    for (let j = i; j < fim; j++) s += x[j] * x[j];
    env.push(Math.sqrt(s / (fim - i)));
  }
  const max = Math.max(...env);
  return Array.from({ length: n }, (_, k) => env[Math.floor((k / n) * env.length)] / max);
}

describe('as amostras da rua', () => {
  it.each(Object.entries(AMOSTRAS_RUA))('%s: duração, na régua, o mesmo toda vez', (nome, f) => {
    const x = f(TAXA);
    expect(x.length / TAXA).toBeCloseTo(DURACOES[nome as keyof typeof DURACOES], 1);
    naRegua(x);
    expect(f(TAXA)).toEqual(x);
  });

  it('noutra taxa (44,1 kHz) também fica na régua', () => {
    const x = AMOSTRAS_RUA.prenda(44100);
    expect(x.length).toBe(Math.round(0.8 * 44100));
    expect(Math.abs(emDb(rmsSoando(x, 44100)) - ALVO_RMS_DB)).toBeLessThan(1.5);
  });

  it('todo toque da rua tem ganho, e nenhum passa do floreio do parque (-7 dB)', () => {
    for (const q of [...Object.keys(AMOSTRAS_RUA), 'orelhao'])
      expect(GANHO_RUA[q as ToqueRua]).toBeLessThanOrEqual(-7);
  });
});

describe('o orelhão e o bonequinho do telefone', () => {
  it('são 6 falas, cada uma de 0,7 a 1,4 s, na régua, sempre iguais', () => {
    expect(FALAS_DO_ORELHAO).toBe(6);
    expect(FALAS).toHaveLength(6);
    for (let k = 0; k < 6; k++) {
      const v = falaDoOrelhao(k, TAXA);
      expect(v.length / TAXA, `fala ${k}`).toBeGreaterThanOrEqual(0.7);
      expect(v.length / TAXA, `fala ${k}`).toBeLessThanOrEqual(1.4);
      expect(v.length).toBe(Math.round(duracaoDaFala(FALAS[k]) * TAXA));
      naRegua(v);
      expect(falaDoOrelhao(k, TAXA)).toEqual(v);
    }
  });

  it('o orelhão: trrim-trrim, o respiro e a fala; na régua; o feito aos poucos é igual', () => {
    for (let k = 0; k < 6; k++) {
      const x = orelhao(k, TAXA);
      const fala = duracaoDaFala(FALAS[k]);
      expect(x.length / TAXA).toBeCloseTo(FALA_ORELHAO_EM + fala, 2);
      naRegua(x);
      // o respiro entre o toque e a fala (0,9 a 1,15 s) é quase silêncio
      const resp = x.subarray(Math.round(0.95 * TAXA), Math.round(1.1 * TAXA));
      expect(picoDe(resp)).toBeLessThan(picoDe(x) * 0.05);
    }
    const g = orelhaoAosPoucos(4, TAXA);
    let passos = 0;
    let r = g.next();
    while (!r.done) {
      passos++;
      r = g.next();
    }
    expect(passos).toBeGreaterThan(3);
    expect(r.value).toEqual(orelhao(4, TAXA));
    // a variante dá a volta
    expect(orelhao(7, TAXA)).toEqual(orelhao(1, TAXA));
  });

  it('cada fala tem o seu desenho: a pergunta sobe, o bocejo desce, nada de voz grossa', () => {
    const alturas = FALAS.map((f) => f.silabas.flatMap((s) => s.f0));
    for (const a of alturas)
      for (const f of a) {
        expect(f).toBeGreaterThanOrEqual(300);
        expect(f).toBeLessThanOrEqual(800);
      }
    // 0: "alô-ô?" termina bem mais alto do que a última sílaba começa
    const ult0 = FALAS[0].silabas[FALAS[0].silabas.length - 1].f0;
    expect(ult0[ult0.length - 1]).toBeGreaterThan(ult0[0] * 1.5);
    // 1: a risadinha é de "hi" curtinhos, vários
    expect(FALAS[1].silabas.length).toBeGreaterThanOrEqual(4);
    expect(FALAS[1].silabas.every((s) => s.de === 'i' && s.dur <= 0.12)).toBe(true);
    // 2: três notas cantadas, a última a mais alta e a mais longa
    const notas = FALAS[2].silabas.map((s) => s.f0[0]);
    expect(new Set(notas).size).toBe(3);
    expect(Math.max(...notas)).toBe(notas[2]);
    // 3: a surpresa sobe e desce numa vogal só
    const s3 = FALAS[3].silabas[0].f0;
    expect(FALAS[3].silabas).toHaveLength(1);
    expect(Math.max(...s3)).toBeGreaterThan(s3[0] * 1.4);
    expect(s3[s3.length - 1]).toBeLessThan(Math.max(...s3) * 0.7);
    // 4: o falatório ligeiro acaba no beijo
    expect(FALAS[4].silabas.length).toBeGreaterThanOrEqual(5);
    expect(FALAS[4].estalo).toBeDefined();
    // 5: o bocejo é o mais longo e acaba mais baixo do que começa
    const s5 = FALAS[5].silabas[0].f0;
    expect(s5[s5.length - 1]).toBeLessThan(s5[0]);
    const durs = FALAS.map(duracaoDaFala);
    expect(Math.max(...durs)).toBe(durs[5]);
  });

  it('as 6 falas soam diferentes umas das outras (o contorno de volume não se repete)', () => {
    const cs = Array.from({ length: 6 }, (_, k) => contorno(falaDoOrelhao(k, TAXA)));
    for (let a = 0; a < 6; a++)
      for (let b = a + 1; b < 6; b++) {
        let d = 0;
        for (let i = 0; i < cs[a].length; i++) d += (cs[a][i] - cs[b][i]) ** 2;
        expect(Math.sqrt(d / cs[a].length), `falas ${a} e ${b}`).toBeGreaterThan(0.12);
      }
  });
});

// ------------------------------------------------------------------ o tocador

class Param {
  value = 1;
  setValueAtTime() {}
  linearRampToValueAtTime() {}
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

const dbLin = (db: number) => Math.pow(10, db / 20);
const ganhoDe = (f: Fonte) => (f.ligados[0] as No).gain.value;

/** A rua no (0, 0); o parque 50 blocos a leste. */
const PONTOS = [
  { x: 0, z: 0 },
  { x: 50, z: 0 },
];

async function montar(o: { ativar?: boolean; pontos?: { x: number; z: number }[] } = {}) {
  const ctx = new Ctx();
  const motor = criarMotorAudio(() => ctx as never, { maxVozes: 40 });
  if (o.ativar !== false) await motor.ativar();
  ctx.fontes.length = 0;
  ctx.buffers.length = 0;
  const tocados: string[] = [];
  const som = criarSomRua({
    motor,
    pontos: o.pontos ?? PONTOS,
    aoTocar: (id) => tocados.push(id),
  });
  const passo = (t: number, ouv: { x: number; z: number }) => {
    ctx.currentTime = t;
    som.quadro(ouv);
  };
  /** Chega perto até tudo ficar pronto; devolve quantos quadros levou. */
  const preparar = (ouv = { x: 3, z: 0 }) => {
    let q = 0;
    while (!som.info().pronto && q < 3000) passo(++q / 60, ouv);
    return q;
  };
  return { ctx, motor, som, tocados, passo, preparar };
}

describe('o tocador da rua (contexto falso)', () => {
  it('não faz nada sem o som ligado (nem amostras, nem toques)', async () => {
    const { som, ctx, passo } = await montar({ ativar: false });
    passo(1, { x: 0, z: 0 });
    expect(som.info().prontos).toBe(0);
    expect(som.tocar('campainha')).toBe(false);
    expect(som.tocar('orelhao', undefined, 2)).toBe(false);
    expect(ctx.fontes).toHaveLength(0);
  });

  it('as amostras só são feitas perto da rua ou do parque, aos poucos', async () => {
    const { som, passo, preparar, ctx } = await montar();
    passo(0.1, { x: -200, z: 0 });
    passo(0.2, { x: -75, z: 0 });
    expect(som.info().acordado).toBe(false);
    expect(som.info().prontos).toBe(0);
    passo(0.3, { x: -69, z: 0 });
    expect(som.info().acordado).toBe(true);
    const primeiro = som.info().prontos;
    expect(primeiro).toBeGreaterThan(0);
    expect(primeiro).toBeLessThan(som.info().total);
    const quadros = preparar({ x: -69, z: 0 });
    expect(quadros).toBeGreaterThan(1);
    expect(som.info().pronto).toBe(true);
    expect(som.info().total).toBe(Object.keys(AMOSTRAS_RUA).length + FALAS_DO_ORELHAO);
    for (const b of ctx.buffers) {
      expect(b.sampleRate).toBe(TAXA);
      expect(b.dados?.length).toBe(b.length);
    }
    // perto do parque também acorda
    const outro = await montar();
    outro.passo(0.1, { x: 110, z: 0 });
    expect(outro.som.info().acordado).toBe(true);
  });

  it('um toque antes de chegar perto acorda o tocador (e não toca nada ainda)', async () => {
    const { som, passo } = await montar();
    passo(0.1, { x: 500, z: 0 });
    expect(som.tocar('feno')).toBe(false);
    expect(som.info().acordado).toBe(true);
  });

  it('os toques: no grupo dos efeitos, régua por som, mais baixo longe, mudo além de 28 blocos', async () => {
    const { som, preparar, passo, ctx, tocados } = await montar();
    preparar({ x: 0, z: 0 });
    passo(50, { x: 0, z: 0 });
    expect(som.tocar('campainha', { x: 2, z: 0 })).toBe(true);
    passo(51, { x: 0, z: 0 });
    expect(som.tocar('campainha', { x: 17, z: 0 })).toBe(true);
    passo(52, { x: 0, z: 0 });
    expect(som.tocar('campainha', { x: 30, z: 0 })).toBe(false);
    const [perto, meio] = ctx.fontes;
    expect(ganhoDe(perto)).toBeCloseTo(dbLin(GANHO_RUA.campainha), 6);
    expect(ganhoDe(meio)).toBeGreaterThan(0);
    expect(ganhoDe(meio)).toBeLessThan(ganhoDe(perto) / 2);
    expect(perto.loop).toBe(false);
    expect(tocados).toEqual(['campainha', 'campainha']);
    // sem lugar: cheio
    passo(53, { x: 0, z: 0 });
    expect(som.tocar('prenda')).toBe(true);
    expect(ganhoDe(ctx.fontes[2])).toBeCloseTo(dbLin(GANHO_RUA.prenda), 6);
  });

  it('o orelhão: a variante escolhe a fala, sem ela roda; não toca por cima dele mesmo', async () => {
    const { som, preparar, passo, ctx, tocados } = await montar();
    preparar({ x: 0, z: 0 });
    passo(50, { x: 0, z: 0 });
    expect(som.tocar('orelhao', { x: 1, z: 1 }, 3)).toBe(true);
    expect(som.info().tocando).toEqual(['orelhao']);
    passo(51, { x: 0, z: 0 });
    expect(som.tocar('orelhao', undefined, 1)).toBe(false);
    passo(52.7, { x: 0, z: 0 });
    expect(som.tocar('orelhao', undefined, 1)).toBe(true);
    passo(56, { x: 0, z: 0 });
    expect(som.tocar('orelhao')).toBe(true);
    passo(59, { x: 0, z: 0 });
    expect(som.tocar('orelhao')).toBe(true);
    expect(tocados).toEqual(['orelhao3', 'orelhao1', 'orelhao2', 'orelhao3']);
    // a fala 3 tocou duas vezes: o mesmo buffer
    expect(ctx.fontes[0].buffer).toBe(ctx.fontes[3].buffer);
    expect(ctx.fontes[0].buffer).not.toBe(ctx.fontes[1].buffer);
  });

  it('intervalo mínimo por som e no máximo 6 vozes juntas', async () => {
    const { som, preparar, passo, ctx } = await montar();
    preparar({ x: 0, z: 0 });
    passo(50, { x: 0, z: 0 });
    expect(som.tocar('fita')).toBe(true);
    expect(som.tocar('fita')).toBe(false);
    ctx.currentTime = 50.06;
    expect(som.tocar('fita')).toBe(false);
    ctx.currentTime = 50.14;
    expect(som.tocar('fita')).toBe(true);
    expect(som.tocar('liquidificador')).toBe(true);
    ctx.currentTime = 50.8;
    expect(som.tocar('liquidificador')).toBe(false);
    ctx.currentTime = 51.2;
    expect(som.tocar('liquidificador')).toBe(true);
    passo(60, { x: 0, z: 0 });
    const lista: ToqueRua[] = [
      'vovo',
      'prenda',
      'balaoDesce',
      'balaoPresente',
      'lhamaFeliz',
      'liquidificador',
      'cocho',
    ];
    const ok = lista.map((q) => som.tocar(q));
    expect(ok.filter(Boolean)).toHaveLength(MAX_VOZES_RUA);
    expect(ok[ok.length - 1]).toBe(false);
    expect(som.info().tocando).toHaveLength(MAX_VOZES_RUA);
    // um pouco depois, acabaram: cabe de novo
    passo(62, { x: 0, z: 0 });
    expect(som.tocar('cocho')).toBe(true);
  });

  it('liberar() para tudo e solta as amostras', async () => {
    const { som, preparar, passo, ctx } = await montar();
    preparar({ x: 0, z: 0 });
    passo(50, { x: 0, z: 0 });
    som.tocar('vovo');
    som.tocar('orelhao', undefined, 0);
    expect(som.info().tocando).toEqual(['vovo', 'orelhao']);
    som.liberar();
    for (const f of ctx.fontes) expect(f.paradaEm, 'fonte parada').not.toBeNull();
    expect(som.info().tocando).toEqual([]);
    expect(som.info().prontos).toBe(0);
    expect(som.tocar('vovo')).toBe(false);
  });
});
