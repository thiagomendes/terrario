/**
 * Os sons da rua da Vila Neon (spec 026, parte 2, etapa B), feitos em código: o pacote de sons não
 * cresce nada. O orelhão que toca e um bonequinho que atende (`./vozBoba`), a campainha da
 * bicicleta, a fita da locadora, o liquidificador da lanchonete, a revista da banca, o letreiro de
 * neon, o balão que desce com o presente, o carimbo, o feno e o cocho da lhama, a lhama contente, a
 * prenda da barraca e o "ôôh!" da vovó.
 *
 * - **Puro, em cima:** cada amostra é uma função (mono, na taxa pedida) que os testes chamam sem
 *   WebAudio; sempre as mesmas amostras (sorteio com semente). Tudo na régua do parque (-23 dBFS
 *   "enquanto soa", pico até 0,9, sem desvio, bordas no zero): os ganhos de `GANHO_RUA` valem como
 *   os de `GANHO_PARQUE`.
 * - **Acorda perto:** as amostras são feitas na primeira vez que a criança chega a `ACORDA_RUA`
 *   blocos de um dos `pontos` (a rua, o parque), nunca ao abrir o mundo, aos poucos, uns ms por
 *   quadro: os curtos primeiro, as 6 falas do orelhão por último, uma sílaba por passo.
 * - **Os toques:** no grupo dos efeitos, com a distância de onde soam (cheio até 6 blocos, some
 *   até 28), um intervalo mínimo por som (o orelhão não toca por cima dele mesmo) e no máximo 6
 *   vozes juntas.
 * - Nada vai para o console; sem o som ligado (sem gesto ainda), tudo é um "não faz nada".
 */
import type { ContextoAudio, FonteAudio, MotorAudio, NoAudio } from './motor';
import { TAXA_PARQUE, rmsSoando } from './realejo';
import { volumeNaDistancia } from './somVila';
import {
  FALAS,
  FALAS_DO_ORELHAO,
  VOZ_DO_TELEFONE,
  type Fala,
  acabarRua,
  falar,
  falarAosPoucos,
  passaBanda,
  picoEm,
  sorteioRua,
  vazioRua,
} from './vozBoba';

export { FALAS_DO_ORELHAO } from './vozBoba';

/** A taxa dos sons da rua (a mesma do parque). */
export const TAXA_RUA = TAXA_PARQUE;

const DUAS_PI = Math.PI * 2;
const dbLin = (db: number) => Math.pow(10, db / 20);

export type ToqueRua =
  | 'orelhao'
  | 'campainha'
  | 'fita'
  | 'liquidificador'
  | 'revista'
  | 'revistaFecha'
  | 'letreiro'
  | 'balaoDesce'
  | 'balaoPresente'
  | 'carimbo'
  | 'feno'
  | 'cocho'
  | 'lhamaFeliz'
  | 'prenda'
  | 'vovo';

/**
 * Ganho (dB) de cada toque sobre a régua (a mesma de `GANHO_PARQUE`): a prenda e o presente mais
 * altos (são festa), o letreiro e a revista fechando bem baixinhos.
 */
export const GANHO_RUA: Readonly<Record<ToqueRua, number>> = {
  orelhao: -10,
  campainha: -11,
  fita: -13,
  liquidificador: -14,
  revista: -15,
  revistaFecha: -18,
  letreiro: -19,
  balaoDesce: -11,
  balaoPresente: -9,
  carimbo: -11,
  feno: -14,
  cocho: -12,
  lhamaFeliz: -10,
  prenda: -8,
  vovo: -10,
};

/** As amostras começam a ser feitas com a criança a tantos blocos de um dos pontos. */
export const ACORDA_RUA = 70;
/** Os toques: cheio até tantos blocos de onde soam, some até tantos. */
export const RUA_CHEIO = 6;
export const RUA_SOME = 28;
export const MAX_VOZES_RUA = 6;
/** O trrim-trrim do orelhão (s) e quando o bonequinho atende (s, do começo). */
export const TOQUE_ORELHAO = 0.9;
export const FALA_ORELHAO_EM = 1.15;
/** Intervalo mínimo entre dois toques do mesmo som (s): apertar sem parar não empilha vozes. */
export const ESPERA_RUA: Readonly<Partial<Record<ToqueRua, number>>> = {
  orelhao: 2.6,
  liquidificador: 1,
  lhamaFeliz: 0.6,
  vovo: 0.8,
  balaoDesce: 0.6,
};
export const ESPERA_RUA_PADRAO = 0.12;
/** Quanto tempo de conta por quadro, no máximo (ms), fazendo as amostras. */
const ORCAMENTO_MS = 3;

// ------------------------------------------------------------------ peças das amostras

type Parcial = readonly [razao: number, ganho: number, tau: number];

/** Uma nota de metal (sino, metalofone): parciais que somem cada uma no seu tempo. */
function somarNota(
  x: Float32Array,
  ini: number,
  f: number,
  amp: number,
  parciais: readonly Parcial[],
  taxa: number,
  ataque = 0.002,
): void {
  const i0 = Math.round(ini * taxa);
  for (let j = 0; i0 + j < x.length; j++) {
    const t = j / taxa;
    const a = Math.min(1, t / ataque);
    let s = 0;
    for (const [r, g, tau] of parciais) {
      if (f * r > 0.45 * taxa) continue;
      s += g * Math.sin(DUAS_PI * f * r * t) * Math.exp(-t / tau);
    }
    x[i0 + j] += amp * a * s;
  }
}

/** O metalofone (glockenspiel): as barrinhas de metal, claras, com os parciais das barras. */
const GLOCK: readonly Parcial[] = [
  [1, 1, 0.32],
  [2.76, 0.22, 0.07],
  [5.4, 0.07, 0.03],
];
/** O sininho macio da vovó (quase só o fundamental). */
const CARRILHAO: readonly Parcial[] = [
  [1, 1, 0.22],
  [2, 0.18, 0.1],
  [3, 0.07, 0.05],
];

/** Um passa-baixa de um polo, no lugar. */
function abafar(x: Float32Array, fc: number, taxa: number, de = 0, ate = x.length): void {
  const a = Math.exp((-DUAS_PI * fc) / taxa);
  let y = 0;
  for (let i = de; i < ate; i++) {
    y = y * a + x[i] * (1 - a);
    x[i] = y;
  }
}

/** Mistura `parte` em `x` a partir de `ini` (s), com o ganho dado. */
function misturar(x: Float32Array, parte: Float32Array, ini: number, g: number, taxa: number) {
  const i0 = Math.round(ini * taxa);
  for (let j = 0; j < parte.length && i0 + j < x.length; j++) x[i0 + j] += g * parte[j];
}

/** Um estalinho seco (plástico, madeira, o "tic" do neon): chiado curto e um tom que some. */
function somarEstalo(
  x: Float32Array,
  ini: number,
  amp: number,
  o: { fc: number; tom: number; tauRuido: number; tauTom: number; rnd: () => number },
  taxa: number,
): void {
  const i0 = Math.round(ini * taxa);
  const bp = passaBanda(taxa, o.fc, 1.5);
  const n = Math.round((Math.max(o.tauRuido, o.tauTom) * 6 + 0.002) * taxa);
  for (let j = 0; j < n && i0 + j < x.length; j++) {
    const t = j / taxa;
    const a = Math.min(1, t / 0.0006);
    x[i0 + j] +=
      amp *
      a *
      (3 * bp.passo(o.rnd() * 2 - 1) * Math.exp(-t / o.tauRuido) +
        0.6 * Math.sin(DUAS_PI * o.tom * t) * Math.exp(-t / o.tauTom));
  }
}

/** O chiado do feno: palhinhas estalando (um chiado que pisca em grãos de ~4 ms). */
function somarFeno(
  x: Float32Array,
  ini: number,
  dur: number,
  amp: number,
  semente: number,
  taxa: number,
): void {
  const rnd = sorteioRua(semente);
  const alto = passaBanda(taxa, 3200, 0.8);
  const corpo = passaBanda(taxa, 900, 0.9);
  const i0 = Math.round(ini * taxa);
  const n = Math.round(dur * taxa);
  const grao = Math.max(1, Math.round(0.004 * taxa));
  let alvo = 0;
  let g = 0;
  for (let j = 0; j < n && i0 + j < x.length; j++) {
    if (j % grao === 0) alvo = Math.pow(rnd(), 3);
    g += (alvo - g) * 0.08;
    const u = j / n;
    const env = Math.pow(Math.sin(Math.PI * u), 0.8);
    const r = rnd() * 2 - 1;
    x[i0 + j] += amp * env * (3 * g * alto.passo(r) + 0.5 * corpo.passo(r));
  }
}

// ------------------------------------------------------------------ o orelhão

/** O trrim-trrim de brinquedo: dois sininhos batendo depressa, duas vezes (~0,9 s). */
export function trrim(taxa = TAXA_RUA): Float32Array {
  const x = vazioRua(TOQUE_ORELHAO, taxa);
  const dur = 0.36;
  for (const ini of [0.005, 0.5]) {
    const i0 = Math.round(ini * taxa);
    for (let j = 0; j < Math.round(dur * taxa) && i0 + j < x.length; j++) {
      const t = j / taxa;
      const resta = dur - t;
      const env = Math.min(1, t / 0.006) * Math.min(1, resta / 0.04);
      // o martelinho bate 24 vezes por segundo entre os dois sinos
      const batida = 0.55 + 0.45 * Math.cos(DUAS_PI * 24 * t);
      const s =
        Math.sin(DUAS_PI * 1320 * t) +
        0.6 * Math.sin(DUAS_PI * 1660 * t) +
        0.22 * Math.sin(DUAS_PI * 2640 * t) +
        0.12 * Math.sin(DUAS_PI * 3320 * t);
      x[i0 + j] += env * batida * s;
    }
  }
  return x;
}

/** O orelhão aos poucos: o trrim-trrim, um respiro e a fala `n` (uma sílaba por passo). */
export function* orelhaoAosPoucos(n: number, taxa = TAXA_RUA): Generator<void, Float32Array, void> {
  const k = ((Math.floor(n) % FALAS_DO_ORELHAO) + FALAS_DO_ORELHAO) % FALAS_DO_ORELHAO;
  const toque = trrim(taxa);
  yield;
  const voz = yield* falarAosPoucos(FALAS[k], { ...VOZ_DO_TELEFONE, semente: 600 + k }, taxa);
  const x = vazioRua(FALA_ORELHAO_EM + voz.length / taxa, taxa);
  // o toque um tico abaixo da voz (quem atende é a graça)
  const rv = rmsSoando(voz, taxa);
  const rt = rmsSoando(toque, taxa);
  misturar(x, toque, 0, rt > 0 ? (0.7 * rv) / rt : 0, taxa);
  misturar(x, voz, FALA_ORELHAO_EM, 1, taxa);
  return acabarRua(x, taxa);
}

/** O orelhão inteiro de uma vez: trrim-trrim e a fala `n` (0 a 5) do bonequinho do telefone. */
export function orelhao(n = 0, taxa = TAXA_RUA): Float32Array {
  const g = orelhaoAosPoucos(n, taxa);
  for (;;) {
    const r = g.next();
    if (r.done) return r.value;
  }
}

// ------------------------------------------------------------------ os toques curtos

/** A campainha da bicicleta: "trim-trim", dois "dins" claros, cada um com o martelinho em dobro. */
export function campainha(taxa = TAXA_RUA): Float32Array {
  const x = vazioRua(0.5, taxa);
  const parciais: readonly Parcial[] = [
    [1, 1, 0.12],
    [1.006, 0.7, 0.13],
    [1.48, 0.4, 0.07],
    [2.56, 0.25, 0.04],
    [3.9, 0.1, 0.025],
  ];
  for (const [ini, amp] of [
    [0, 1],
    [0.2, 0.85],
  ] as const) {
    somarNota(x, ini, 2350, amp, parciais, taxa, 0.001);
    somarNota(x, ini + 0.018, 2350, amp * 0.45, parciais, taxa, 0.001);
  }
  return acabarRua(x, taxa);
}

/** A fita de vídeo saindo da prateleira: o "clac" da caixinha de plástico e um chocalhinho. */
export function fita(taxa = TAXA_RUA): Float32Array {
  const x = vazioRua(0.3, taxa);
  const rnd = sorteioRua(301);
  somarEstalo(x, 0.003, 1, { fc: 2600, tom: 1700, tauRuido: 0.006, tauTom: 0.012, rnd }, taxa);
  // o corpo da caixinha (oco, de plástico)
  const i0 = Math.round(0.003 * taxa);
  for (let j = 0; j < Math.round(0.1 * taxa); j++) {
    const t = j / taxa;
    x[i0 + j] += 0.6 * Math.min(1, t / 0.001) * Math.sin(DUAS_PI * 420 * t) * Math.exp(-t / 0.02);
  }
  // a fita chacoalhando dentro da caixa
  [0.07, 0.1, 0.125, 0.15, 0.17, 0.19].forEach((ini, b) =>
    somarEstalo(
      x,
      ini,
      0.5 - 0.06 * b,
      { fc: 3500, tom: 2200, tauRuido: 0.002, tauTom: 0.004, rnd },
      taxa,
    ),
  );
  return acabarRua(x, taxa);
}

/** O liquidificador: o motor que sobe macio, para, e o "plop" da vitamina (~1 s). */
export function liquidificador(taxa = TAXA_RUA): Float32Array {
  const x = vazioRua(1, taxa);
  const rnd = sorteioRua(401);
  const fim = 0.78;
  const n = Math.round(fim * taxa);
  const aR = Math.exp((-DUAS_PI * 1200) / taxa);
  let fase = 0;
  let r = 0;
  for (let i = 0; i < n; i++) {
    const t = i / taxa;
    // a velocidade: sobe em 0,6 s, segura, e freia depressa no fim
    let vel = Math.min(1, t / 0.6);
    vel = vel * vel * (3 - 2 * vel);
    if (t > 0.68) vel *= Math.max(0, 1 - (t - 0.68) / (fim - 0.68));
    const f = 70 + 170 * vel;
    fase += (DUAS_PI * f) / taxa;
    let s = 0;
    for (let k = 1; k <= 8; k++) s += Math.sin(k * fase) / Math.pow(k, 1.2);
    r = r * aR + (rnd() * 2 - 1) * (1 - aR);
    const env = Math.min(1, t / 0.03) * Math.pow(vel, 0.7);
    x[i] = env * (0.5 * s + 6 * r * (0.6 + 0.4 * Math.sin(3 * fase)));
  }
  // macio, nunca áspero
  abafar(x, 1800, taxa, 0, n);
  // o "plop": a gotinha que sobe de altura
  const i0 = Math.round(0.84 * taxa);
  let fp = 0;
  for (let j = 0; i0 + j < x.length; j++) {
    const t = j / taxa;
    const f = 350 + 750 * (1 - Math.exp(-t / 0.025));
    fp += (DUAS_PI * f) / taxa;
    x[i0 + j] += 0.8 * Math.min(1, t / 0.002) * Math.sin(fp) * Math.exp(-t / 0.045);
  }
  return acabarRua(x, taxa);
}

/** Uma página virando: o chiado do papel que corre de uma altura para outra. */
function folha(
  taxa: number,
  de: number,
  ate: number,
  q: number,
  forma: number,
  semente: number,
): Float32Array {
  const x = vazioRua(0.3, taxa);
  const rnd = sorteioRua(semente);
  const bp = passaBanda(taxa, de, q);
  const n = Math.round(0.28 * taxa);
  for (let i = 0; i < n; i++) {
    const t = i / taxa;
    const u = i / n;
    if (i % 16 === 0) bp.ajustar(de * Math.pow(ate / de, u), q);
    const env = Math.pow(Math.sin(Math.PI * Math.pow(u, 0.8)), forma);
    // o papel tremula um pouquinho
    const tremula = 0.75 + 0.25 * Math.sin(DUAS_PI * 45 * t);
    x[i] = env * tremula * bp.passo(rnd() * 2 - 1);
  }
  return acabarRua(x, taxa);
}

/** A revista abrindo: o "fwip" que sobe. */
export function revista(taxa = TAXA_RUA): Float32Array {
  return folha(taxa, 1200, 4500, 1.5, 1.5, 501);
}

/** A revista fechando: o "fwip" ao contrário, mais abafado. */
export function revistaFecha(taxa = TAXA_RUA): Float32Array {
  return folha(taxa, 3500, 1000, 1, 2, 502);
}

/** O letreiro de neon: o "bzzt" da lâmpada acendendo (com uma piscada) e o "tic-tic". */
export function letreiro(taxa = TAXA_RUA): Float32Array {
  const x = vazioRua(0.4, taxa);
  const rnd = sorteioRua(601);
  const n = Math.round(0.18 * taxa);
  for (let i = 0; i < n; i++) {
    const t = i / taxa;
    const c = Math.sin(DUAS_PI * 120 * t);
    const chiado = Math.pow(Math.abs(c), 8) * (rnd() * 2 - 1);
    let env = Math.min(1, t / 0.005) * Math.min(1, (0.18 - t) / 0.02);
    // a piscada no meio do "bzzt"
    if (t > 0.06 && t < 0.08) env *= 0.15;
    x[i] = env * (Math.tanh(2 * c) + 0.3 * Math.sin(DUAS_PI * 240 * t) + 0.5 * chiado);
  }
  abafar(x, 2500, taxa, 0, n);
  for (const ini of [0.25, 0.33])
    somarEstalo(x, ini, 0.7, { fc: 4000, tom: 3000, tauRuido: 0.0015, tauTom: 0.003, rnd }, taxa);
  return acabarRua(x, taxa);
}

/** O balão que desce: um "nhéc" de borracha e o assobio macio que cai ("fiuuu"). */
export function balaoDesce(taxa = TAXA_RUA): Float32Array {
  const x = vazioRua(0.9, taxa);
  const rnd = sorteioRua(701);
  // o rangido da borracha
  const nR = Math.round(0.16 * taxa);
  let fr = 0;
  for (let i = 0; i < nR; i++) {
    const t = i / taxa;
    const u = i / nR;
    const f = 950 + 200 * u + 250 * Math.sin(DUAS_PI * 28 * t);
    fr += (DUAS_PI * f) / taxa;
    x[i] += 0.8 * Math.pow(Math.sin(Math.PI * u), 0.7) * (Math.sin(fr) + 0.3 * Math.sin(2 * fr));
  }
  // o assobio que desce
  const i0 = Math.round(0.14 * taxa);
  const dur = 0.74;
  const m = Math.round(dur * taxa);
  const aR = Math.exp((-DUAS_PI * 1500) / taxa);
  let fa = 0;
  let r = 0;
  for (let j = 0; j < m && i0 + j < x.length; j++) {
    const t = j / taxa;
    const u = j / m;
    const f =
      1500 * Math.pow(520 / 1500, Math.pow(u, 0.9)) * (1 + 0.015 * Math.sin(DUAS_PI * 6 * t));
    fa += (DUAS_PI * f) / taxa;
    r = r * aR + (rnd() * 2 - 1) * (1 - aR);
    let env = Math.min(1, t / 0.04);
    if (u > 0.7) env *= 0.5 + 0.5 * Math.cos((Math.PI * (u - 0.7)) / 0.3);
    x[i0 + j] += 0.8 * env * (Math.sin(fa) + 0.1 * Math.sin(2 * fa) + 1.5 * r);
  }
  return acabarRua(x, taxa);
}

/** O presente do balão: o metalofone sobe 4 notas, alegre (dó, mi, sol, dó). */
export function balaoPresente(taxa = TAXA_RUA): Float32Array {
  const x = vazioRua(0.8, taxa);
  [1047, 1319, 1568, 2093].forEach((f, i) =>
    somarNota(x, 0.005 + i * 0.11, f, i === 3 ? 1.1 : 0.9, GLOCK, taxa),
  );
  return acabarRua(x, taxa);
}

/** O carimbo: o "tchac" de borracha na mesa e um brilhinho logo depois. */
export function carimbo(taxa = TAXA_RUA): Float32Array {
  const x = vazioRua(0.35, taxa);
  const rnd = sorteioRua(801);
  const i0 = Math.round(0.01 * taxa);
  const lp = passaBanda(taxa, 1200, 0.7);
  const borracha = passaBanda(taxa, 900, 2);
  let fase = 0;
  for (let j = 0; j < Math.round(0.12 * taxa); j++) {
    const t = j / taxa;
    const a = Math.min(1, t / 0.001);
    fase += (DUAS_PI * (120 + 80 * Math.exp(-t / 0.01))) / taxa;
    const r = rnd() * 2 - 1;
    x[i0 + j] +=
      a *
      (Math.sin(fase) * Math.exp(-t / 0.035) +
        3 * lp.passo(r) * Math.exp(-t / 0.012) +
        1.5 * borracha.passo(r) * Math.exp(-t / 0.03));
  }
  const brilho: readonly Parcial[] = [
    [1, 1, 0.07],
    [1.5, 0.4, 0.04],
  ];
  somarNota(x, 0.13, 3136, 0.35, brilho, taxa);
  somarNota(x, 0.19, 3951, 0.2, [[1, 1, 0.05]], taxa);
  return acabarRua(x, taxa);
}

/** O feno: as palhinhas mexendo (~0,4 s). */
export function feno(taxa = TAXA_RUA): Float32Array {
  const x = vazioRua(0.4, taxa);
  somarFeno(x, 0.005, 0.38, 1, 901, taxa);
  return acabarRua(x, taxa);
}

/** O cocho: o feno caindo e o "toc" macio da madeira (com um quiquezinho). */
export function cocho(taxa = TAXA_RUA): Float32Array {
  const x = vazioRua(0.5, taxa);
  const rnd = sorteioRua(1001);
  somarFeno(x, 0.005, 0.3, 0.6, 1002, taxa);
  for (const [ini, amp] of [
    [0.16, 1.2],
    [0.27, 0.35],
  ] as const) {
    const i0 = Math.round(ini * taxa);
    for (let j = 0; i0 + j < x.length; j++) {
      const t = j / taxa;
      const a = Math.min(1, t / 0.001);
      x[i0 + j] +=
        amp *
        a *
        (Math.sin(DUAS_PI * 170 * t) * Math.exp(-t / 0.05) +
          0.6 * Math.sin(DUAS_PI * 410 * t) * Math.exp(-t / 0.025) +
          0.3 * Math.sin(DUAS_PI * 760 * t) * Math.exp(-t / 0.012) +
          0.4 * (rnd() * 2 - 1) * Math.exp(-t / 0.004));
    }
  }
  return acabarRua(x, taxa);
}

/**
 * O balido contente da lhama: "mééé-hé", que sobe, com o tremidinho de 9 Hz do "bé" da lhama da
 * Vila (`VOZES_VILA.cervo`), mas na voz boba (mais redondo, de brinquedo).
 */
export const FALA_DA_LHAMA: Fala = {
  silabas: [
    {
      ini: 0.02,
      dur: 0.42,
      de: 'm',
      para: 'e',
      glide: 0.2,
      f0: [430, 470, 530],
      tremolo: 0.35,
      vib: 0.03,
      vibHz: 9,
    },
    { ini: 0.5, dur: 0.17, de: 'e', sopro: 0.04, f0: [580, 660], vib: 0.02, vibHz: 9 },
  ],
};

export function lhamaFeliz(taxa = TAXA_RUA): Float32Array {
  const voz = falar(FALA_DA_LHAMA, { tamanho: 1.1, telefone: false, semente: 1101 }, taxa);
  return acabarRua(voz, taxa);
}

/** A prenda da barraca: 5 notas ligeiras do metalofone, subindo até o dó agudo. */
export function prenda(taxa = TAXA_RUA): Float32Array {
  const x = vazioRua(0.8, taxa);
  [1047, 1175, 1319, 1568, 2093].forEach((f, i) =>
    somarNota(x, 0.005 + i * 0.09, f, i === 4 ? 1.1 : 0.85, GLOCK, taxa),
  );
  return acabarRua(x, taxa);
}

/** O "ôôh!" contente da vovó: a mesma voz boba, mais baixa e macia (sem telefone). */
export const FALA_DA_VOVO: Fala = {
  silabas: [
    {
      ini: 0.02,
      dur: 0.5,
      de: 'o',
      f0: [300, 360, 340, 290],
      sopro: 0.05,
      fimSopro: 0.12,
      vib: 0.008,
    },
  ],
};

/** O "ôôh!" da vovó e dois sininhos macios (dó e mi). */
export function vovo(taxa = TAXA_RUA): Float32Array {
  const x = vazioRua(1.05, taxa);
  const voz = falar(FALA_DA_VOVO, { tamanho: 1, telefone: false, semente: 1201 }, taxa);
  misturar(x, voz, 0, 1, taxa);
  somarNota(x, 0.6, 1047, 0.4, CARRILHAO, taxa, 0.004);
  somarNota(x, 0.76, 1319, 0.4, CARRILHAO, taxa, 0.004);
  return acabarRua(x, taxa);
}

/** As amostras de um toque só (sem variações), pelo nome. */
export const AMOSTRAS_RUA: Readonly<
  Record<Exclude<ToqueRua, 'orelhao'>, (taxa?: number) => Float32Array>
> = {
  campainha,
  fita,
  liquidificador,
  revista,
  revistaFecha,
  letreiro,
  balaoDesce,
  balaoPresente,
  carimbo,
  feno,
  cocho,
  lhamaFeliz,
  prenda,
  vovo,
};

// ------------------------------------------------------------------ o tocador

interface GanhoRua extends NoAudio {
  gain: {
    value: number;
    setValueAtTime?(v: number, t: number): void;
    cancelScheduledValues?(t: number): void;
    linearRampToValueAtTime?(v: number, t: number): void;
  };
}
interface FonteRua extends FonteAudio {
  buffer: unknown;
  start(quando?: number, offset?: number): void;
}
interface BufferRua {
  copyToChannel?(dados: Float32Array, canal: number): void;
  getChannelData?(canal: number): Float32Array;
}
interface CtxRua extends ContextoAudio {
  createBuffer(canais: number, tamanho: number, taxa: number): BufferRua;
  createBufferSource(): FonteRua;
  createGain(): GanhoRua;
}

export interface OpcoesSomRua {
  motor: MotorAudio;
  /**
   * Onde ficam a rua e o parque: as amostras são feitas na primeira vez que a criança chega a
   * `ACORDA_RUA` blocos de um deles. Sem pontos, acorda no primeiro quadro (com o som ligado).
   */
  pontos?: readonly { x: number; z: number }[];
  /** Testes: o que tocou. */
  aoTocar?: (id: string) => void;
}

interface Tocando {
  id: string;
  fonte: FonteRua;
  ganho: GanhoRua;
  fim: number;
  parado: boolean;
}

/** Um toque curto é feito de uma vez só (é pequeno): um passo. */
function* uma(f: () => Float32Array): Generator<void, Float32Array, void> {
  return f();
}

/** As amostras da rua, na ordem em que são feitas: os curtos primeiro, as falas por último. */
const RECEITAS: [string, () => Generator<void, Float32Array, void>][] = [
  ...(Object.keys(AMOSTRAS_RUA) as (keyof typeof AMOSTRAS_RUA)[]).map(
    (id): [string, () => Generator<void, Float32Array, void>] => [
      id,
      () => uma(() => AMOSTRAS_RUA[id](TAXA_RUA)),
    ],
  ),
  ...Array.from(
    { length: FALAS_DO_ORELHAO },
    (_, k): [string, () => Generator<void, Float32Array, void>] => [
      `orelhao${k}`,
      () => orelhaoAosPoucos(k, TAXA_RUA),
    ],
  ),
];
const VARIACOES: Partial<Record<ToqueRua, number>> = { orelhao: FALAS_DO_ORELHAO };

export type SomRua = ReturnType<typeof criarSomRua>;

export function criarSomRua(op: OpcoesSomRua) {
  const { motor } = op;
  const pontos = (op.pontos ?? []).map((p) => ({ x: p.x, z: p.z }));
  const agoraMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  let acordado = false;
  let fila: { id: string; gen: Generator<void, Float32Array, void> }[] = [];
  const buffers = new Map<string, unknown>();
  let ouvinte: { x: number; z: number } | null = null;
  const vozes: Tocando[] = [];
  const ultimo = new Map<ToqueRua, number>();
  const rodizio = new Map<ToqueRua, number>();

  const podeTocar = () => motor.estado === 'ativo' && !motor.mudo && !!motor.contexto;

  function acordar(): void {
    if (acordado) return;
    acordado = true;
    fila = RECEITAS.filter(([id]) => !buffers.has(id)).map(([id, f]) => ({ id, gen: f() }));
  }

  /** Faz amostras por até `ORCAMENTO_MS` (pelo menos um passo) e as passa para o contexto. */
  function fazerUmPouco(ctx: CtxRua): void {
    const t0 = agoraMs();
    let passos = 0;
    while (fila.length && (passos === 0 || agoraMs() - t0 < ORCAMENTO_MS)) {
      passos++;
      const job = fila[0];
      let r: IteratorResult<void, Float32Array>;
      try {
        r = job.gen.next();
      } catch {
        fila.shift();
        continue;
      }
      if (!r.done) continue;
      fila.shift();
      try {
        if (typeof ctx.createBuffer !== 'function') continue;
        const b = ctx.createBuffer(1, r.value.length, TAXA_RUA);
        if (b.copyToChannel) b.copyToChannel(r.value, 0);
        else b.getChannelData?.(0).set(r.value);
        buffers.set(job.id, b);
      } catch {
        // sem buffer: esse som fica mudo
      }
    }
  }

  function limpar(ag: number): void {
    for (let i = vozes.length - 1; i >= 0; i--)
      if (vozes[i].parado || ag >= vozes[i].fim) vozes.splice(i, 1);
  }

  /** Cada quadro (só na Vila Neon): acorda perto da rua ou do parque e faz amostras aos poucos. */
  function quadro(ouv: { x: number; z: number }): void {
    const ctx = motor.contexto as CtxRua | null;
    if (!ctx) return;
    ouvinte = { x: ouv.x, z: ouv.z };
    if (
      !acordado &&
      (pontos.length === 0 ||
        pontos.some((p) => Math.hypot(ouv.x - p.x, ouv.z - p.z) <= ACORDA_RUA))
    )
      acordar();
    if (fila.length) fazerUmPouco(ctx);
    limpar(ctx.currentTime);
  }

  function parar(x: Tocando, t: number, desce = 0.05): void {
    if (x.parado) return;
    const g = x.ganho.gain;
    g.cancelScheduledValues?.(t);
    g.setValueAtTime?.(g.value, t);
    if (g.linearRampToValueAtTime) g.linearRampToValueAtTime(0, t + desce);
    else g.value = 0;
    x.parado = true;
    try {
      x.fonte.stop(t + desce + 0.02);
    } catch {
      // já parada
    }
  }

  /**
   * Toca um som da rua, de `onde` (sem lugar: cheio). `variante`: a fala do orelhão (0 a 5; sem
   * ela, roda uma de cada vez). Devolve se tocou.
   */
  function tocar(qual: ToqueRua, onde?: { x: number; z: number }, variante?: number): boolean {
    const ctx = motor.contexto;
    if (!ctx || !podeTocar() || !(qual in GANHO_RUA)) return false;
    // um toque antes de chegar perto já acorda (a amostra fica para os próximos)
    acordar();
    const ag = ctx.currentTime;
    const espera = ESPERA_RUA[qual] ?? ESPERA_RUA_PADRAO;
    if (ag - (ultimo.get(qual) ?? -Infinity) < espera) return false;
    const variacoes = VARIACOES[qual];
    let id: string = qual;
    let proxima: number | null = null;
    if (variacoes) {
      const k =
        variante !== undefined && Number.isFinite(variante)
          ? Math.floor(variante)
          : (rodizio.get(qual) ?? 0);
      proxima = k + 1;
      id = `${qual}${((k % variacoes) + variacoes) % variacoes}`;
    }
    const b = buffers.get(id);
    if (!b) return false;
    const v =
      onde && ouvinte
        ? volumeNaDistancia(Math.hypot(onde.x - ouvinte.x, onde.z - ouvinte.z), RUA_CHEIO, RUA_SOME)
        : 1;
    if (v <= 0.001) return false;
    limpar(ag);
    if (vozes.length >= MAX_VOZES_RUA) return false;
    const dur = ((b as { duration?: number }).duration ?? 1) || 1;
    const t = ag + 0.01;
    let res: Tocando | null = null;
    const ok = motor.tocar(
      (ctxBase, destino) => {
        const c = ctxBase as CtxRua;
        const f = c.createBufferSource();
        f.buffer = b;
        const g = c.createGain();
        f.connect(g);
        g.connect(destino);
        g.gain.value = dbLin(GANHO_RUA[qual]) * v;
        f.start(t, 0);
        res = { id: qual, fonte: f, ganho: g, fim: t + dur + 0.05, parado: false };
        return f;
      },
      { grupo: 'efeitos', prioridade: 'normal' },
    );
    if (!ok || !res) return false;
    const x = res as Tocando;
    const doMotor = x.fonte.onended;
    x.fonte.onended = () => {
      doMotor?.();
      x.parado = true;
      try {
        x.ganho.disconnect();
      } catch {
        // já desligado
      }
    };
    op.aoTocar?.(id);
    if (proxima !== null) rodizio.set(qual, proxima);
    ultimo.set(qual, ag);
    vozes.push(x);
    return true;
  }

  return {
    quadro,
    tocar,
    /** Começa a fazer as amostras já (sem esperar chegar perto). */
    acordar,
    /** Testes e depuração. */
    info() {
      const ag = motor.contexto?.currentTime ?? 0;
      return {
        acordado,
        pronto: acordado && fila.length === 0 && buffers.size === RECEITAS.length,
        /** Quantas amostras já estão prontas (de `total`). */
        prontos: buffers.size,
        total: RECEITAS.length,
        tocando: vozes.filter((x) => !x.parado && ag < x.fim).map((x) => x.id),
      };
    },
    /** Sai do mundo: para tudo e solta as amostras. */
    liberar(): void {
      const ag = motor.contexto?.currentTime ?? 0;
      for (const x of vozes) parar(x, ag);
      vozes.length = 0;
      fila = [];
      buffers.clear();
      acordado = false;
      ouvinte = null;
    },
  };
}
