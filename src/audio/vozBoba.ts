/**
 * A "voz boba" da rua da Vila Neon (spec 026, parte 2, etapa B): o bonequinho do telefone que
 * atende o orelhão, o "ôôh!" da vovó e o "mééé" da lhama. Feita em código, nossa, e nunca imita
 * gente de verdade: é um personagem de desenho que fala "embromês".
 *
 * - **Como soa:** uma fonte de pulsos (harmônicos somados, só até onde a taxa deixa) passando por
 *   3 formantes (as ressonâncias que fazem o "a", o "ê", o "i", o "ô", o "ó", o "u"; o "m" e o "l"
 *   são as mesmas ressonâncias, mais fechadas). As vogais escorregam uma na outra, a altura desliza
 *   numa curva (a pergunta sobe, o bocejo desce). Os formantes vêm um tico acima dos de um adulto
 *   (`tamanho`): é uma criaturinha pequena.
 * - **O telefone:** a banda do orelhão (300 a 3400 Hz), como uma voz que vem pelo fio.
 * - **Nunca assusta:** a altura nunca desce de 280 Hz (nada de rosnado), as bordas são macias.
 * - **Puro:** sem WebAudio, sem sorteio solto (o chiado do "h" vem de um sorteio com semente): a
 *   mesma fala dá sempre as mesmas amostras. Aos poucos (`falarAosPoucos`): uma sílaba por passo.
 */
import { ALVO_RMS_DB, PICO_MAXIMO, TAXA_PARQUE, picoDe, rmsSoando } from './realejo';

const DUAS_PI = Math.PI * 2;
const dbLin = (db: number) => Math.pow(10, db / 20);

// ------------------------------------------------------------------ o acabamento (o mesmo do realejo)

/** Sorteio com semente (mulberry32): o mesmo som toda vez. */
export function sorteioRua(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const vazioRua = (seg: number, taxa: number) =>
  new Float32Array(Math.max(1, Math.round(seg * taxa)));

/** Põe o pico em `alvo` (para misturar partes já na mesma medida). */
export function picoEm(x: Float32Array, alvo = 1): Float32Array {
  const p = picoDe(x);
  if (p > 0) for (let i = 0; i < x.length; i++) x[i] *= alvo / p;
  return x;
}

/** Leva ao alvo da régua (-23 dBFS "enquanto soa"); pico acima de 0,9 é arredondado (tanh). */
function nivelar(x: Float32Array, taxa: number): void {
  const alvo = dbLin(ALVO_RMS_DB);
  for (let volta = 0; volta < 5; volta++) {
    const r = rmsSoando(x, taxa);
    if (r <= 0) return;
    for (let i = 0; i < x.length; i++) x[i] *= alvo / r;
    if (picoDe(x) <= PICO_MAXIMO) return;
    const L = PICO_MAXIMO * 0.98;
    for (let i = 0; i < x.length; i++) x[i] = L * Math.tanh(x[i] / L);
  }
  const p = picoDe(x);
  if (p > PICO_MAXIMO) for (let i = 0; i < x.length; i++) x[i] *= PICO_MAXIMO / p;
}

/** Um toque pronto: sem desvio de zero (filtro de 20 Hz), bordas no zero, na régua. */
export function acabarRua(x: Float32Array, taxa: number): Float32Array {
  const a = Math.exp((-DUAS_PI * 20) / taxa);
  let xa = 0;
  let ya = 0;
  for (let i = 0; i < x.length; i++) {
    const y = x[i] - xa + a * ya;
    xa = x[i];
    ya = y;
    x[i] = y;
  }
  const ini = Math.max(1, Math.round(0.002 * taxa));
  const fim = Math.max(1, Math.round(0.012 * taxa));
  for (let i = 0; i < ini && i < x.length; i++) x[i] *= i / ini;
  for (let i = 0; i < fim && i < x.length; i++) x[x.length - 1 - i] *= i / fim;
  nivelar(x, taxa);
  return x;
}

/**
 * Um passa-banda (o de dois polos do "livro de receitas" de áudio), que pode mudar de centro no
 * meio do som (o "fwip" da revista, o chiado do feno).
 */
export function passaBanda(taxa: number, fc: number, q: number) {
  let b0 = 0;
  let b2 = 0;
  let a1 = 0;
  let a2 = 0;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  const ajustar = (f: number, qq: number) => {
    const w = (DUAS_PI * Math.min(f, 0.45 * taxa)) / taxa;
    const al = Math.sin(w) / (2 * qq);
    const a0 = 1 + al;
    b0 = al / a0;
    b2 = -al / a0;
    a1 = (-2 * Math.cos(w)) / a0;
    a2 = (1 - al) / a0;
  };
  ajustar(fc, q);
  return {
    ajustar,
    passo(x: number): number {
      const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1;
      x1 = x;
      y2 = y1;
      y1 = y;
      return y;
    },
  };
}

// ------------------------------------------------------------------ as vogais

export type Vogal = 'a' | 'e' | 'i' | 'o' | 'ó' | 'u' | 'm' | 'l';

/** Os 3 formantes (Hz) de cada vogal, num adulto; a criaturinha multiplica por `tamanho`. */
export const FORMANTES: Readonly<Record<Vogal, readonly [number, number, number]>> = {
  a: [800, 1300, 2600],
  e: [450, 2000, 2700],
  i: [310, 2400, 3000],
  o: [470, 880, 2550],
  ó: [620, 1000, 2550],
  u: [330, 760, 2400],
  // o "m" (boca fechada, som pelo nariz) e o "l" (a língua no céu da boca): mais fechados e baixos
  m: [270, 1100, 2400],
  l: [360, 1250, 2600],
};
/** Quanto a boca deixa sair (o "m" quase calado, o "l" pela metade). */
const ABERTURA: Readonly<Record<Vogal, number>> = {
  a: 1,
  e: 1,
  i: 0.9,
  o: 1,
  ó: 1,
  u: 0.85,
  m: 0.3,
  l: 0.6,
};
/** Largura (Hz) e peso de cada formante: largos, de desenho (a voz fica redonda, nunca fina). */
const LARGURA = [150, 210, 280] as const;
const PESO = [1, 0.75, 0.38] as const;
const MAX_HARMONICOS = 40;

export interface Silaba {
  /** Começo (s, do começo da fala). */
  ini: number;
  /** Duração (s). */
  dur: number;
  /** A vogal do começo e, se tiver, a de chegada (escorrega em `glide` da sílaba). */
  de: Vogal;
  para?: Vogal;
  glide?: number;
  /** A curva da altura (Hz), pontos espalhados por igual na sílaba. */
  f0: readonly number[];
  amp?: number;
  /** O "h" de sopro no começo (s) e no fim (s). */
  sopro?: number;
  fimSopro?: number;
  /** O vibrato (fração da altura) e a sua velocidade (Hz). */
  vib?: number;
  vibHz?: number;
  /** O balido: o volume treme (0 a 1) na velocidade do vibrato. */
  tremolo?: number;
}

export interface Fala {
  silabas: readonly Silaba[];
  /** O estalinho do beijo (s), se tiver. */
  estalo?: number;
}

export interface OpcoesVoz {
  /** Os formantes multiplicados por isto (1,15: uma criaturinha pequena). */
  tamanho: number;
  /** A banda do telefone (300 a 3400 Hz). */
  telefone: boolean;
  semente: number;
}

/** O orelhão atende com uma destas 6 falas (`variante` 0 a 5). */
export const FALAS_DO_ORELHAO = 6;

/** As falas do bonequinho do telefone: cada uma com um desenho de altura bem dela. */
export const FALAS: readonly Fala[] = [
  // 0: "alô-ô?" — a pergunta que sobe no fim
  {
    silabas: [
      { ini: 0.02, dur: 0.17, de: 'a', f0: [400, 430], sopro: 0.03 },
      { ini: 0.18, dur: 0.24, de: 'l', para: 'o', glide: 0.35, f0: [430, 450, 400] },
      { ini: 0.48, dur: 0.38, de: 'o', f0: [360, 380, 520, 680], vib: 0.01 },
    ],
  },
  // 1: a risadinha "hi-hi-hi-hi-hi", cada "hi" com o sopro na frente, descendo devagar
  {
    silabas: [620, 700, 660, 600, 540].map((f, b) => ({
      ini: 0.03 + b * 0.15,
      dur: 0.1,
      de: 'i' as const,
      f0: [f, f * 1.06, f * 0.97],
      sopro: 0.03,
      amp: 1 - 0.08 * b,
    })),
  },
  // 2: o "la-la-láá" cantado (sol, mi, dó agudo, o último com vibrato)
  {
    silabas: [
      { ini: 0.02, dur: 0.2, de: 'l', para: 'a', glide: 0.3, f0: [392, 392] },
      { ini: 0.26, dur: 0.2, de: 'l', para: 'a', glide: 0.3, f0: [330, 330] },
      { ini: 0.5, dur: 0.55, de: 'l', para: 'a', glide: 0.15, f0: [523, 523], vib: 0.015 },
    ],
  },
  // 3: o "óóh!" de surpresa: sobe depressa, desce devagar, com o sopro no fim
  {
    silabas: [
      {
        ini: 0.02,
        dur: 0.64,
        de: 'ó',
        f0: [480, 720, 760, 620, 470],
        sopro: 0.06,
        fimSopro: 0.14,
      },
    ],
  },
  // 4: o "ba-di-bo-de-bu" ligeirinho, que acaba num beijo "mwah"
  {
    silabas: [
      ...(
        [
          ['a', 520],
          ['i', 600],
          ['o', 480],
          ['e', 640],
          ['u', 560],
        ] as const
      ).map(([v, f], b) => ({
        ini: 0.02 + b * 0.1,
        dur: 0.078,
        de: 'm' as const,
        para: v,
        glide: 0.3,
        f0: [f, f * 1.04],
      })),
      { ini: 0.6, dur: 0.3, de: 'm', para: 'a', glide: 0.55, f0: [470, 560, 520] },
    ],
    estalo: 0.93,
  },
  // 5: o bocejo "uaaah": abre a boca, sobe um tiquinho e desce sonolento, soprando no fim
  {
    silabas: [
      {
        ini: 0.02,
        dur: 1.2,
        de: 'u',
        para: 'a',
        glide: 0.35,
        f0: [480, 600, 560, 440, 340],
        sopro: 0.05,
        fimSopro: 0.4,
        vib: 0.006,
      },
    ],
  },
];

/** Quanto dura uma fala (s): até o fim da última sílaba (ou do estalinho), mais um respiro. */
export function duracaoDaFala(f: Fala): number {
  let fim = 0;
  for (const s of f.silabas) fim = Math.max(fim, s.ini + s.dur);
  if (f.estalo !== undefined) fim = Math.max(fim, f.estalo + 0.03);
  return fim + 0.05;
}

const suave = (u: number) => {
  const v = Math.max(0, Math.min(1, u));
  return v * v * (3 - 2 * v);
};

/** A altura na curva (pontos espalhados por igual), em `u` de 0 a 1. */
function naCurva(pts: readonly number[], u: number): number {
  if (pts.length === 1) return pts[0];
  const p = Math.max(0, Math.min(1, u)) * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(p));
  const r = p - i;
  // interpolação macia (cosseno) entre os pontos: a voz desliza, sem quina
  const w = 0.5 - 0.5 * Math.cos(Math.PI * r);
  return pts[i] + (pts[i + 1] - pts[i]) * w;
}

/** O peso de cada harmônico: os formantes, a inclinação da fonte e a banda (telefone ou macia). */
function amplitudes(
  f0: number,
  F: readonly number[],
  abertura: number,
  telefone: boolean,
  taxa: number,
  out: Float32Array,
): number {
  const teto = Math.min(0.45 * taxa, telefone ? 4200 : 5000);
  const K = Math.max(1, Math.min(MAX_HARMONICOS, Math.floor(teto / f0)));
  for (let k = 1; k <= K; k++) {
    const f = k * f0;
    let a = 0;
    for (let i = 0; i < 3; i++) {
      const d = (f - F[i]) / LARGURA[i];
      a += PESO[i] / (1 + d * d);
    }
    a *= Math.pow(k, -0.5);
    const banda = telefone
      ? 1 / Math.sqrt((1 + Math.pow(300 / f, 4)) * (1 + Math.pow(f / 3400, 4)))
      : 1 / Math.sqrt(1 + Math.pow(f / 3000, 4));
    out[k - 1] = a * abertura * banda;
  }
  return K;
}

/** Soma uma sílaba em `out`. */
function somarSilaba(
  out: Float32Array,
  s: Silaba,
  op: OpcoesVoz,
  taxa: number,
  rnd: () => number,
): void {
  const i0 = Math.round(s.ini * taxa);
  const m = Math.round(s.dur * taxa);
  const amps = new Float32Array(MAX_HARMONICOS);
  const A = FORMANTES[s.de];
  const B = FORMANTES[s.para ?? s.de];
  const abA = ABERTURA[s.de];
  const abB = ABERTURA[s.para ?? s.de];
  const glide = s.glide ?? 0.3;
  const vib = s.vib ?? 0;
  const vibHz = s.vibHz ?? 5.5;
  const sopro = s.sopro ?? 0;
  const fimSopro = s.fimSopro ?? 0;
  const amp = s.amp ?? 1;
  const ataque = Math.min(0.025, s.dur / 3);
  const soltura = Math.min(0.06, s.dur / 2);
  const comecaVoz = sopro * 0.6;
  // o "h": chiado no meio das ressonâncias (onde o sopro da boca soa)
  const h = passaBanda(taxa, 1900 * op.tamanho, 1.1);
  const F = [0, 0, 0];
  let K = 1;
  let ab = 1;
  let fase = 0;
  for (let j = 0; j < m && i0 + j < out.length; j++) {
    const t = j / taxa;
    const u = j / m;
    if (j % 32 === 0) {
      const w = s.para ? suave(u / glide) : 0;
      for (let i = 0; i < 3; i++) F[i] = (A[i] + (B[i] - A[i]) * w) * op.tamanho;
      ab = abA + (abB - abA) * w;
      K = amplitudes(naCurva(s.f0, u), F, ab, op.telefone, taxa, amps);
    }
    const f = Math.max(280, naCurva(s.f0, u) * (1 + vib * Math.sin(DUAS_PI * vibHz * t)));
    fase += (DUAS_PI * f) / taxa;
    if (fase > DUAS_PI) fase -= DUAS_PI;
    // os harmônicos pela recorrência sin((k+1)x) = 2cos(x)sin(kx) - sin((k-1)x)
    const c2 = 2 * Math.cos(fase);
    let sAnt = 0;
    let sAgora = Math.sin(fase);
    let v = 0;
    for (let k = 0; k < K; k++) {
      v += amps[k] * sAgora;
      const prox = c2 * sAgora - sAnt;
      sAnt = sAgora;
      sAgora = prox;
    }
    // o volume da voz: entra depois do sopro, sai macio
    let env = 1;
    const tv = t - comecaVoz;
    if (tv < 0) env = 0;
    else if (tv < ataque) env = 0.5 - 0.5 * Math.cos((Math.PI * tv) / ataque);
    const resta = s.dur - t;
    if (resta < soltura) env *= 0.5 - 0.5 * Math.cos((Math.PI * Math.max(0, resta)) / soltura);
    if (fimSopro > 0 && resta < fimSopro) env *= 0.35 + 0.65 * (resta / fimSopro);
    if (s.tremolo) env *= 1 - s.tremolo * (0.5 - 0.5 * Math.cos(DUAS_PI * vibHz * t));
    // o sopro: no começo (antes da voz) e no fim (a voz vira ar)
    let ar = 0;
    if (sopro > 0 && t < sopro) ar = Math.sin((Math.PI * t) / sopro);
    if (fimSopro > 0 && resta < fimSopro) ar = Math.max(ar, Math.sin((Math.PI * resta) / fimSopro));
    const chiado = 1.4 * ar * h.passo(rnd() * 2 - 1);
    out[i0 + j] += amp * (env * v + chiado);
  }
}

/** O estalinho do beijo: um "tchu" curtinho de lábios. */
function somarEstalo(out: Float32Array, ini: number, taxa: number, rnd: () => number): void {
  const i0 = Math.round(ini * taxa);
  const bp = passaBanda(taxa, 1500, 1.4);
  for (let j = 0; j < Math.round(0.03 * taxa) && i0 + j < out.length; j++) {
    const t = j / taxa;
    const a = Math.min(1, t / 0.0008);
    out[i0 + j] +=
      a *
      (2.5 * bp.passo(rnd() * 2 - 1) * Math.exp(-t / 0.004) +
        0.6 * Math.sin(DUAS_PI * 1100 * t) * Math.exp(-t / 0.01));
  }
}

/**
 * Uma fala aos poucos (uma sílaba por passo). O valor final é a fala crua (pico em 1, ainda fora
 * da régua): quem chama mistura e acaba (`acabarRua`).
 */
export function* falarAosPoucos(
  fala: Fala,
  op: OpcoesVoz,
  taxa = TAXA_PARQUE,
): Generator<void, Float32Array, void> {
  const out = vazioRua(duracaoDaFala(fala), taxa);
  const rnd = sorteioRua(op.semente);
  for (const s of fala.silabas) {
    somarSilaba(out, s, op, taxa, rnd);
    yield;
  }
  if (fala.estalo !== undefined) somarEstalo(out, fala.estalo, taxa, rnd);
  return picoEm(out);
}

/** A fala inteira de uma vez (crua, pico em 1). */
export function falar(fala: Fala, op: OpcoesVoz, taxa = TAXA_PARQUE): Float32Array {
  const g = falarAosPoucos(fala, op, taxa);
  for (;;) {
    const r = g.next();
    if (r.done) return r.value;
  }
}

/** A voz do telefone: a criaturinha pequena, na banda do fio. */
export const VOZ_DO_TELEFONE: Readonly<Omit<OpcoesVoz, 'semente'>> = {
  tamanho: 1.15,
  telefone: true,
};

/** Só a fala `n` do bonequinho do telefone (0 a 5), pronta e na régua. */
export function falaDoOrelhao(n: number, taxa = TAXA_PARQUE): Float32Array {
  const k = ((Math.floor(n) % FALAS_DO_ORELHAO) + FALAS_DO_ORELHAO) % FALAS_DO_ORELHAO;
  return acabarRua(falar(FALAS[k], { ...VOZ_DO_TELEFONE, semente: 600 + k }, taxa), taxa);
}
