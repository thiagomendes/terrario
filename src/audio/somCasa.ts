/**
 * Os sons da Casa anos 80 e da pista de skate (spec 026, parte 3), feitos em código: o pacote de
 * sons não cresce nada. Tudo composto aqui, nota por nota (nenhuma música de ninguém).
 *
 * - **Os laços da sala** (no relógio do núcleo: quem está na sala ouve o mesmo ponto): a musiquinha
 *   de cada um dos quatro desenhos da TV, a do filme da fita (20 s) e a do disco. Saem de onde a TV
 *   e o toca-discos estão e, **do lado de fora da casa, abafados** (um passa-baixa fecha e o volume
 *   cai), como o som de uma casa com a porta aberta.
 * - **Os toques:** a troca de canal (o "tic" do botão e o chiado), a fita entrando no
 *   videocassete, a agulha no disco, o baú, o sofá, o ioiô ("zíí-úúp"), o pião (o zumbido que
 *   desce), o cubo ("trec"), o robô (os passinhos de lata e o bipe), a bola ("boing"), o skate
 *   pegado e guardado e o "clac" da prancha na borda da rampa. O telefone usa o orelhão da rua.
 * - **A régua (019):** tudo em -23 dBFS "enquanto soa" (`acabarRua`); os ganhos em dB valem como os
 *   da rua.
 */
import type { ContextoAudio, FonteAudio, MotorAudio, NoAudio } from './motor';
import { TAXA_PARQUE, rmsSoando } from './realejo';
import { RelogioVila, posicaoNoLaco, volumeNaDistancia } from './somVila';
import { acabarRua, passaBanda, sorteioRua, vazioRua } from './vozBoba';
import { DURA_FILME } from '../jogo/casa';

export const TAXA_CASA = TAXA_PARQUE;
const DUAS_PI = Math.PI * 2;
const dbLin = (db: number) => Math.pow(10, db / 20);
const nota = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export type ToqueCasa =
  | 'canal'
  | 'fita'
  | 'agulha'
  | 'bau'
  | 'sofa'
  | 'ioio'
  | 'piao'
  | 'cubo'
  | 'robo'
  | 'bola'
  | 'skate'
  | 'guardarSkate'
  | 'clac';

export const GANHO_CASA: Readonly<Record<ToqueCasa, number>> = {
  canal: -15,
  fita: -13,
  agulha: -16,
  bau: -13,
  sofa: -15,
  ioio: -12,
  piao: -13,
  cubo: -13,
  robo: -12,
  bola: -12,
  skate: -12,
  guardarSkate: -15,
  clac: -9,
};
/** Os laços: a TV (os quatro canais e o filme) e o disco (dB sobre a régua). */
export const GANHO_TV_DB = -16;
export const GANHO_DISCO_DB = -15;
/** Os laços: cheios até tantos blocos, somem até tantos; e do lado de fora, abafados. */
export const CASA_CHEIO = 5;
export const CASA_SOME = 24;
export const ABAFADO_HZ = 650;
export const ABAFADO_DB = -7;
/** As amostras começam a ser feitas com a criança a tantos blocos da casa ou da pista. */
export const ACORDA_CASA = 60;
const ORCAMENTO_MS = 3;
const MAX_VOZES = 6;

// ------------------------------------------------------------------ as peças

/** Uma nota que dá a volta no laço (o fim dela cai no começo: o laço fecha sem emenda). */
function somarNotaLaco(
  x: Float32Array,
  ini: number,
  f: number,
  dur: number,
  amp: number,
  timbre: 'xilo' | 'quadrado' | 'baixo' | 'sopro' | 'sino',
  taxa: number,
): void {
  const i0 = Math.round(ini * taxa);
  const n = Math.round((dur + (timbre === 'xilo' || timbre === 'sino' ? 0.5 : 0.06)) * taxa);
  for (let j = 0; j < n; j++) {
    const t = j / taxa;
    let s = 0;
    let env = 1;
    if (timbre === 'xilo') {
      env = Math.min(1, t / 0.002) * Math.exp(-t / 0.22);
      s = Math.sin(DUAS_PI * f * t) + 0.2 * Math.sin(DUAS_PI * f * 4 * t) * Math.exp(-t / 0.04);
    } else if (timbre === 'sino') {
      env = Math.min(1, t / 0.002) * Math.exp(-t / 0.4);
      s = Math.sin(DUAS_PI * f * t) + 0.3 * Math.sin(DUAS_PI * f * 2.76 * t) * Math.exp(-t / 0.08);
    } else {
      const resta = dur - t;
      env = Math.min(1, t / 0.012) * Math.min(1, Math.max(0, resta + 0.06) / 0.06);
      if (timbre === 'quadrado')
        s =
          Math.sin(DUAS_PI * f * t) +
          Math.sin(DUAS_PI * 3 * f * t) / 3 +
          Math.sin(DUAS_PI * 5 * f * t) / 6;
      else if (timbre === 'baixo') {
        env *= Math.exp(-t / 0.35);
        s = Math.sin(DUAS_PI * f * t) + 0.35 * Math.sin(DUAS_PI * 2 * f * t);
      } else s = Math.sin(DUAS_PI * f * t + 0.6 * Math.sin(DUAS_PI * 5.5 * t));
    }
    const k = (i0 + j) % x.length;
    x[k] += amp * env * s;
  }
}

/** Um laço: as notas (início em tempos, nota MIDI, duração em tempos, timbre, volume). */
type Nota = [number, number, number, 'xilo' | 'quadrado' | 'baixo' | 'sopro' | 'sino', number];
function laco(notas: readonly Nota[], bpm: number, tempos: number, taxa: number): Float32Array {
  const b = 60 / bpm;
  const x = vazioRua(tempos * b, taxa);
  for (const [ini, n, dur, timbre, amp] of notas)
    somarNotaLaco(x, ini * b, nota(n), dur * b * 0.92, amp, timbre, taxa);
  // na régua, sem bordas (o laço continua): só a medida
  const r = rmsSoando(x, taxa);
  const alvo = dbLin(-23);
  if (r > 0) for (let i = 0; i < x.length; i++) x[i] = Math.tanh((x[i] * alvo) / r / 0.9) * 0.9;
  return x;
}

/** Uma melodia em tempos: [início, nota] com a mesma duração. */
const mel = (lista: readonly [number, number][], dur: number, t: Nota[3], amp: number): Nota[] =>
  lista.map(([i, n]) => [i, n, dur, t, amp]);
const baixo = (lista: readonly [number, number][], dur = 0.9): Nota[] =>
  mel(lista, dur, 'baixo', 0.55);

// ------------------------------------------------------------------ os quatro desenhos da TV

/** Canal 1, o sol saltitante: xilofone saltitante em Dó (8 tempos, 150 por minuto). */
export function musicaSol(taxa = TAXA_CASA): Float32Array {
  return laco(
    [
      ...mel(
        [
          [0, 72],
          [0.5, 76],
          [1, 79],
          [1.5, 76],
          [2, 84],
          [3, 79],
          [4, 74],
          [4.5, 77],
          [5, 81],
          [5.5, 77],
          [6, 83],
          [7, 79],
        ],
        0.45,
        'xilo',
        0.8,
      ),
      ...baixo([
        [0, 48],
        [2, 55],
        [4, 50],
        [6, 55],
      ]),
    ],
    150,
    8,
    taxa,
  );
}

/** Canal 2, o peixinho: a flautinha que ondula e as bolhas (sininhos), em Fá (8 tempos, 100). */
export function musicaPeixe(taxa = TAXA_CASA): Float32Array {
  const bolhas: Nota[] = [1.5, 3.25, 5.5, 7.25].map((i, k) => [i, 89 + (k % 2) * 3, 0.2, 'sino', 0.3]);
  return laco(
    [
      ...mel(
        [
          [0, 65],
          [1, 69],
          [2, 72],
          [3, 70],
          [4, 69],
          [5, 67],
          [6, 65],
          [7, 60],
        ],
        0.95,
        'sopro',
        0.7,
      ),
      ...bolhas,
      ...baixo(
        [
          [0, 41],
          [4, 46],
        ],
        3.8,
      ),
    ],
    100,
    8,
    taxa,
  );
}

/** Canal 3, o foguete: o sininho espacial que sobe e desce, em Lá menor (8 tempos, 112). */
export function musicaFoguete(taxa = TAXA_CASA): Float32Array {
  return laco(
    [
      ...mel(
        [
          [0, 69],
          [0.75, 72],
          [1.5, 76],
          [2, 81],
          [3, 79],
          [4, 76],
          [4.75, 74],
          [5.5, 72],
          [6, 69],
          [7, 64],
        ],
        0.6,
        'sino',
        0.6,
      ),
      ...mel(
        [
          [0, 57],
          [2, 60],
          [4, 55],
          [6, 52],
        ],
        1.9,
        'sopro',
        0.35,
      ),
    ],
    112,
    8,
    taxa,
  );
}

/** Canal 4, o carrinho: a buzininha e a corridinha, em Sol (8 tempos, 168). */
export function musicaCarrinho(taxa = TAXA_CASA): Float32Array {
  return laco(
    [
      ...mel(
        [
          [0, 67],
          [0.5, 71],
          [1, 74],
          [1.5, 79],
          [2, 78],
          [2.5, 74],
          [3, 71],
          [4, 67],
          [4.5, 69],
          [5, 71],
          [5.5, 74],
        ],
        0.42,
        'quadrado',
        0.45,
      ),
      [6, 79, 0.3, 'quadrado', 0.55],
      [6.5, 79, 0.3, 'quadrado', 0.55],
      ...baixo([
        [0, 43],
        [1, 50],
        [2, 43],
        [3, 50],
        [4, 45],
        [5, 52],
        [6, 43],
        [7, 50],
      ], 0.6),
    ],
    168,
    8,
    taxa,
  );
}

/** O filme da fita: uma valsinha de caixinha de música (20 s exatos, o filme inteiro). */
export function musicaFilme(taxa = TAXA_CASA): Float32Array {
  const bpm = 138;
  const tempos = Math.round((DURA_FILME * bpm) / 60);
  const frase: [number, number][] = [
    [0, 76],
    [1, 79],
    [2, 84],
    [3, 83],
    [5, 79],
    [6, 77],
    [7, 76],
    [8, 74],
    [9, 72],
    [10, 74],
    [11, 76],
  ];
  const notas: Nota[] = [];
  for (let rep = 0; rep * 12 < tempos - 3; rep++) {
    for (const [i, n] of frase) notas.push([rep * 12 + i, n + (rep % 2 ? -5 : 0), 0.9, 'sino', 0.6]);
    for (let c = 0; c < 4; c++) {
      const b = rep * 12 + c * 3;
      notas.push([b, 48 + (c % 2 ? 7 : 0), 0.9, 'baixo', 0.45]);
      notas.push([b + 1, 64, 0.5, 'xilo', 0.25], [b + 2, 67, 0.5, 'xilo', 0.25]);
    }
  }
  const x = laco(notas, bpm, tempos, taxa);
  // o filme não volta ao começo: o fim desce suave
  const fim = Math.round(1.2 * taxa);
  for (let i = 0; i < fim && i < x.length; i++) x[x.length - 1 - i] *= i / fim;
  return x;
}

/** O disco: uma musiquinha pop da época (nossa), com baixo, acordes e a melodia (16 tempos, 116). */
export function musicaDisco(taxa = TAXA_CASA): Float32Array {
  const acordes: [number, number[]][] = [
    [0, [60, 64, 67]],
    [4, [57, 60, 64]],
    [8, [53, 57, 60]],
    [12, [55, 59, 62]],
  ];
  const notas: Nota[] = [];
  for (const [i, ac] of acordes) {
    for (const k of [0, 1.5, 2, 3.5]) for (const n of ac) notas.push([i + k, n, 0.45, 'quadrado', 0.12]);
    notas.push([i, ac[0] - 24, 1.4, 'baixo', 0.6], [i + 2, ac[0] - 12, 1.4, 'baixo', 0.5]);
  }
  notas.push(
    ...mel(
      [
        [0, 76],
        [1, 79],
        [1.5, 76],
        [2, 72],
        [4, 76],
        [5, 77],
        [6, 76],
        [7, 72],
        [8, 69],
        [9, 72],
        [10, 77],
        [11, 76],
        [12, 74],
        [13, 71],
        [14, 74],
      ],
      0.7,
      'xilo',
      0.75,
    ),
  );
  return laco(notas, 116, 16, taxa);
}

// ------------------------------------------------------------------ os toques curtos

/** Um estalo seco (o botão da TV, a fita, o cubo, a borda da rampa). */
function estalo(x: Float32Array, ini: number, amp: number, fc: number, tom: number, taxa: number, semente: number) {
  const rnd = sorteioRua(semente);
  const bp = passaBanda(taxa, fc, 1.4);
  const i0 = Math.round(ini * taxa);
  const n = Math.round(0.09 * taxa);
  for (let j = 0; j < n && i0 + j < x.length; j++) {
    const t = j / taxa;
    x[i0 + j] +=
      amp *
      (3 * bp.passo(rnd() * 2 - 1) * Math.exp(-t / 0.008) +
        0.7 * Math.sin(DUAS_PI * tom * t) * Math.exp(-t / 0.03));
  }
}
/** Um deslize de tom (o ioiô, o pião). */
function deslize(
  x: Float32Array,
  ini: number,
  dur: number,
  f0: number,
  f1: number,
  amp: number,
  taxa: number,
) {
  const i0 = Math.round(ini * taxa);
  const n = Math.round(dur * taxa);
  let fase = 0;
  for (let j = 0; j < n && i0 + j < x.length; j++) {
    const u = j / n;
    const f = f0 * Math.pow(f1 / f0, u);
    fase += (DUAS_PI * f) / taxa;
    const env = Math.min(1, u * 12) * Math.min(1, (1 - u) * 8);
    x[i0 + j] += amp * env * (Math.sin(fase) + 0.25 * Math.sin(fase * 2));
  }
}

export function canal(taxa = TAXA_CASA): Float32Array {
  const x = vazioRua(0.4, taxa);
  estalo(x, 0, 1, 2600, 900, taxa, 11);
  const rnd = sorteioRua(5);
  const bp = passaBanda(taxa, 3000, 0.6);
  for (let j = Math.round(0.03 * taxa); j < x.length; j++) {
    const u = j / x.length;
    x[j] += 0.5 * bp.passo(rnd() * 2 - 1) * Math.sin(Math.PI * u);
  }
  return acabarRua(x, taxa);
}
export function fita(taxa = TAXA_CASA): Float32Array {
  const x = vazioRua(0.9, taxa);
  estalo(x, 0, 1, 900, 220, taxa, 3);
  deslize(x, 0.12, 0.6, 180, 240, 0.35, taxa);
  estalo(x, 0.74, 0.8, 1500, 300, taxa, 4);
  return acabarRua(x, taxa);
}
export function agulha(taxa = TAXA_CASA): Float32Array {
  const x = vazioRua(0.7, taxa);
  estalo(x, 0, 0.7, 1800, 400, taxa, 8);
  const rnd = sorteioRua(19);
  for (let j = 0; j < x.length; j++) if (rnd() < 0.004) x[j] += (rnd() - 0.5) * 1.4;
  return acabarRua(x, taxa);
}
export function bau(taxa = TAXA_CASA): Float32Array {
  const x = vazioRua(0.7, taxa);
  deslize(x, 0, 0.3, 320, 260, 0.25, taxa);
  estalo(x, 0.32, 1, 700, 180, taxa, 21);
  somarNotaLaco(x, 0.4, nota(84), 0.2, 0.5, 'sino', taxa);
  somarNotaLaco(x, 0.48, nota(88), 0.2, 0.5, 'sino', taxa);
  return acabarRua(x, taxa);
}
export function sofa(taxa = TAXA_CASA): Float32Array {
  const x = vazioRua(0.45, taxa);
  const rnd = sorteioRua(31);
  const bp = passaBanda(taxa, 420, 0.8);
  for (let j = 0; j < x.length; j++) {
    const t = j / taxa;
    x[j] += 2 * bp.passo(rnd() * 2 - 1) * Math.min(1, t / 0.01) * Math.exp(-t / 0.09);
    x[j] += 0.4 * Math.sin(DUAS_PI * 90 * t) * Math.exp(-t / 0.06);
  }
  return acabarRua(x, taxa);
}
export function ioio(taxa = TAXA_CASA): Float32Array {
  const x = vazioRua(2.6, taxa);
  for (const ini of [0, 1.3]) {
    deslize(x, ini, 0.55, 900, 420, 0.6, taxa);
    deslize(x, ini + 0.75, 0.55, 420, 900, 0.6, taxa);
  }
  return acabarRua(x, taxa);
}
export function piao(taxa = TAXA_CASA): Float32Array {
  const x = vazioRua(4.4, taxa);
  const n = x.length;
  let fase = 0;
  for (let j = 0; j < n; j++) {
    const u = j / n;
    const f = 520 - 300 * u;
    fase += (DUAS_PI * f) / taxa;
    const bamba = 0.75 + 0.25 * Math.sin(j / taxa * 30 * (1 - u * 0.6));
    const env = Math.min(1, u * 30) * Math.min(1, (1 - u) * 5);
    x[j] += env * bamba * (Math.sin(fase) + 0.4 * Math.sin(fase * 2.01));
  }
  estalo(x, 4.2, 0.8, 1200, 260, taxa, 41);
  return acabarRua(x, taxa);
}
export function cubo(taxa = TAXA_CASA): Float32Array {
  const x = vazioRua(0.35, taxa);
  estalo(x, 0, 0.8, 3200, 1400, taxa, 51);
  estalo(x, 0.16, 1, 2600, 1100, taxa, 52);
  return acabarRua(x, taxa);
}
export function robo(taxa = TAXA_CASA): Float32Array {
  const x = vazioRua(1.9, taxa);
  for (let k = 0; k < 4; k++) estalo(x, 0.35 + k * 0.36, 0.9, 1800 + (k % 2) * 400, 520, taxa, 60 + k);
  // o bipe de quem chegou
  for (const [ini, n] of [
    [1.6, 84],
    [1.72, 91],
  ] as const) {
    const i0 = Math.round(ini * taxa);
    for (let j = 0; j < Math.round(0.1 * taxa) && i0 + j < x.length; j++) {
      const t = j / taxa;
      x[i0 + j] += 0.35 * Math.sign(Math.sin(DUAS_PI * nota(n) * t)) * Math.min(1, (0.1 - t) / 0.01);
    }
  }
  return acabarRua(x, taxa);
}
export function bola(taxa = TAXA_CASA): Float32Array {
  const x = vazioRua(1.7, taxa);
  for (let k = 0; k < 3; k++) {
    const ini = (k * 1.7) / 3 + 0.28 - k * 0.02;
    const amp = Math.pow(0.6, k);
    deslize(x, ini, 0.22, 260, 130, amp, taxa);
    estalo(x, ini, amp * 0.5, 500, 160, taxa, 70 + k);
  }
  return acabarRua(x, taxa);
}
export function skate(taxa = TAXA_CASA): Float32Array {
  const x = vazioRua(0.7, taxa);
  const rnd = sorteioRua(81);
  const bp = passaBanda(taxa, 1600, 1.2);
  for (let j = 0; j < x.length; j++) {
    const u = j / x.length;
    const rodinha = 0.6 + 0.4 * Math.sin((j / taxa) * DUAS_PI * 26);
    x[j] += 1.6 * bp.passo(rnd() * 2 - 1) * rodinha * Math.sin(Math.PI * u);
  }
  estalo(x, 0.55, 0.9, 1400, 300, taxa, 82);
  return acabarRua(x, taxa);
}
export function guardarSkate(taxa = TAXA_CASA): Float32Array {
  const x = vazioRua(0.3, taxa);
  estalo(x, 0, 1, 1000, 250, taxa, 91);
  return acabarRua(x, taxa);
}
/** O "clac": a prancha batendo na borda de cromo lá em cima (madeira e metal). */
export function clac(taxa = TAXA_CASA): Float32Array {
  const x = vazioRua(0.3, taxa);
  estalo(x, 0, 1, 2200, 680, taxa, 101);
  estalo(x, 0.012, 0.6, 3800, 1750, taxa, 102);
  return acabarRua(x, taxa);
}

export const AMOSTRAS_CASA: Readonly<Record<ToqueCasa, (taxa?: number) => Float32Array>> = {
  canal,
  fita,
  agulha,
  bau,
  sofa,
  ioio,
  piao,
  cubo,
  robo,
  bola,
  skate,
  guardarSkate,
  clac,
};
/** Os laços da sala: os quatro canais, o filme e o disco. */
export const LACOS_CASA = {
  canal0: musicaSol,
  canal1: musicaPeixe,
  canal2: musicaFoguete,
  canal3: musicaCarrinho,
  filme: musicaFilme,
  disco: musicaDisco,
} as const;
type IdLaco = keyof typeof LACOS_CASA;

// ------------------------------------------------------------------ o tocador

interface Param {
  value: number;
  setValueAtTime?(v: number, t: number): void;
  setTargetAtTime?(v: number, t: number, tau: number): void;
  cancelScheduledValues?(t: number): void;
  linearRampToValueAtTime?(v: number, t: number): void;
}
interface Ganho extends NoAudio {
  gain: Param;
}
interface Filtro extends NoAudio {
  type: string;
  frequency: Param;
}
interface Fonte extends FonteAudio {
  buffer: unknown;
  loop: boolean;
  start(quando?: number, offset?: number): void;
}
interface Buffer {
  copyToChannel?(dados: Float32Array, canal: number): void;
  getChannelData?(canal: number): Float32Array;
  duration?: number;
}
interface Ctx extends ContextoAudio {
  createBuffer(canais: number, tamanho: number, taxa: number): Buffer;
  createBufferSource(): Fonte;
  createGain(): Ganho;
  createBiquadFilter?(): Filtro;
}

interface Tocando {
  id: string;
  fonte: Fonte;
  ganho: Ganho;
  filtro: Filtro | null;
  fim: number;
  parado: boolean;
}

export interface OpcoesSomCasa {
  motor: MotorAudio;
  /** Onde ficam a TV e o toca-discos (os laços saem de lá) e a pista (acordar). */
  tv: { x: number; z: number };
  discos: { x: number; z: number };
  pista: { x: number; z: number };
  /** O volume da "Música" (0 a 1). */
  musica?: () => number;
  /** 0..1: quanto a trilha do bairro cala (com a TV ou o disco perto). */
  aoCalarTrilha?: (f: number) => void;
  aoTocar?: (id: string) => void;
}

function* uma(f: () => Float32Array): Generator<void, Float32Array, void> {
  return f();
}

const RECEITAS: [string, () => Generator<void, Float32Array, void>][] = [
  ...(Object.keys(AMOSTRAS_CASA) as ToqueCasa[]).map(
    (id): [string, () => Generator<void, Float32Array, void>] => [
      id,
      () => uma(() => AMOSTRAS_CASA[id](TAXA_CASA)),
    ],
  ),
  ...(Object.keys(LACOS_CASA) as IdLaco[]).map(
    (id): [string, () => Generator<void, Float32Array, void>] => [
      id,
      () => uma(() => LACOS_CASA[id](TAXA_CASA)),
    ],
  ),
];

export type SomCasa = ReturnType<typeof criarSomCasa>;

/** O que a sala toca agora: o laço da TV (o canal ou o filme) e o do disco. */
export interface SalaNoSom {
  /** `canal0`..`canal3` ou `filme`, e de quando ele conta (s do núcleo). */
  tv: { id: IdLaco; desde: number };
  /** Desde quando o disco toca (null: parado). */
  disco: number | null;
}

export function criarSomCasa(op: OpcoesSomCasa) {
  const { motor } = op;
  const agoraMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const relogio = new RelogioVila();
  let acordado = false;
  let fila: { id: string; gen: Generator<void, Float32Array, void> }[] = [];
  const buffers = new Map<string, unknown>();
  let ouvinte: { x: number; z: number } | null = null;
  const vozes: Tocando[] = [];
  const ultimo = new Map<ToqueCasa, number>();
  const lacos: { tv: Tocando | null; disco: Tocando | null } = { tv: null, disco: null };
  const chaveLaco: { tv: string; disco: string } = { tv: '', disco: '' };
  const podeTocar = () => motor.estado === 'ativo' && !motor.mudo && !!motor.contexto;

  function acordar(): void {
    if (acordado) return;
    acordado = true;
    fila = RECEITAS.filter(([id]) => !buffers.has(id)).map(([id, f]) => ({ id, gen: f() }));
  }

  function fazerUmPouco(ctx: Ctx): void {
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
        const b = ctx.createBuffer(1, r.value.length, TAXA_CASA);
        if (b.copyToChannel) b.copyToChannel(r.value, 0);
        else b.getChannelData?.(0).set(r.value);
        buffers.set(job.id, b);
      } catch {
        // sem buffer: esse som fica mudo
      }
    }
  }

  function iniciar(
    id: string,
    b: unknown,
    o: { ganho: number; t: number; laco?: boolean; offset?: number; filtro?: number },
  ): Tocando | null {
    let res: Tocando | null = null;
    const ok = motor.tocar(
      (ctxBase, destino) => {
        const c = ctxBase as Ctx;
        const f = c.createBufferSource();
        f.buffer = b;
        if (o.laco) f.loop = true;
        const g = c.createGain();
        let filtro: Filtro | null = null;
        if (o.filtro !== undefined && c.createBiquadFilter) {
          filtro = c.createBiquadFilter();
          filtro.type = 'lowpass';
          filtro.frequency.value = o.filtro;
          f.connect(filtro);
          filtro.connect(g);
        } else f.connect(g);
        g.connect(destino);
        g.gain.value = o.laco ? 0 : o.ganho;
        if (o.laco) {
          g.gain.setValueAtTime?.(0, o.t);
          if (g.gain.setTargetAtTime) g.gain.setTargetAtTime(o.ganho, o.t, 0.15);
          else g.gain.value = o.ganho;
        }
        f.start(o.t, o.offset ?? 0);
        const dur = ((b as Buffer).duration ?? 1) || 1;
        res = { id, fonte: f, ganho: g, filtro, fim: o.laco ? Infinity : o.t + dur + 0.05, parado: false };
        return f;
      },
      { grupo: o.laco ? 'ambiente' : 'efeitos', prioridade: o.laco ? 'alta' : 'normal' },
    );
    if (!ok || !res) return null;
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
    return x;
  }

  function parar(x: Tocando | null, t: number, desce = 0.12): void {
    if (!x || x.parado) return;
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

  /** Um laço da sala: começa na fase do relógio do núcleo, segue o volume e o abafado. */
  function quadroLaco(
    qual: 'tv' | 'disco',
    id: IdLaco | null,
    desde: number,
    onde: { x: number; z: number },
    dentro: boolean,
    ag: number,
  ): number {
    const chave = id ? `${id}@${desde}` : '';
    if (lacos[qual]?.parado) lacos[qual] = null;
    if (chave !== chaveLaco[qual]) {
      parar(lacos[qual], ag);
      lacos[qual] = null;
      chaveLaco[qual] = '';
    }
    if (!id || !ouvinte) return 0;
    const d = Math.hypot(onde.x - ouvinte.x, onde.z - ouvinte.z);
    const v = volumeNaDistancia(d, CASA_CHEIO, CASA_SOME);
    const ganhoDb = (qual === 'tv' ? GANHO_TV_DB : GANHO_DISCO_DB) + (dentro ? 0 : ABAFADO_DB);
    const alvo = dbLin(ganhoDb) * v * (op.musica?.() ?? 0.6) * 1.4;
    const corte = dentro ? 18000 : ABAFADO_HZ;
    if (!lacos[qual]) {
      const b = buffers.get(id);
      if (!b || v <= 0.001 || !podeTocar()) return v;
      const t = ag + 0.05;
      const dur = ((b as Buffer).duration ?? 1) || 1;
      const passou = relogio.nucleo(t) - desde;
      // o filme não volta: se já acabou, não toca
      if (id === 'filme' && passou >= dur) return v;
      lacos[qual] = iniciar(id, b, {
        ganho: alvo,
        t,
        laco: id !== 'filme',
        offset: id === 'filme' ? Math.max(0, passou) : posicaoNoLaco(relogio.nucleo(t), desde, dur),
        filtro: corte,
      });
      chaveLaco[qual] = chave;
      return v;
    }
    const x = lacos[qual]!;
    const g = x.ganho.gain;
    if (g.setTargetAtTime) {
      g.cancelScheduledValues?.(ag);
      g.setTargetAtTime(alvo, ag, 0.2);
    } else g.value = alvo;
    if (x.filtro) {
      const f = x.filtro.frequency;
      if (f.setTargetAtTime) {
        f.cancelScheduledValues?.(ag);
        f.setTargetAtTime(corte, ag, 0.25);
      } else f.value = corte;
    }
    return v;
  }

  return {
    /** Cada quadro (só na Vila Neon): acorda perto, faz amostras aos poucos e cuida dos laços. */
    quadro(ouv: { x: number; z: number }, tNucleo: number, sala: SalaNoSom | null, dentro: boolean) {
      const ctx = motor.contexto as Ctx | null;
      if (!ctx) return;
      const ag = ctx.currentTime;
      relogio.medir(ag, tNucleo);
      ouvinte = { x: ouv.x, z: ouv.z };
      if (
        !acordado &&
        [op.tv, op.pista].some((p) => Math.hypot(ouv.x - p.x, ouv.z - p.z) <= ACORDA_CASA)
      )
        acordar();
      if (fila.length) fazerUmPouco(ctx);
      for (let i = vozes.length - 1; i >= 0; i--)
        if (vozes[i].parado || ag >= vozes[i].fim) vozes.splice(i, 1);
      const vTv = quadroLaco('tv', sala ? sala.tv.id : null, sala?.tv.desde ?? 0, op.tv, dentro, ag);
      const vDisco = quadroLaco(
        'disco',
        sala && sala.disco !== null ? 'disco' : null,
        sala?.disco ?? 0,
        op.discos,
        dentro,
        ag,
      );
      // uma música por vez: dentro da casa, com a TV ou o disco perto, a trilha do bairro cala
      op.aoCalarTrilha?.(dentro ? Math.max(vTv, vDisco) * 0.85 : 0);
    },
    tocar(qual: ToqueCasa, onde?: { x: number; z: number }): boolean {
      const ctx = motor.contexto;
      if (!ctx || !podeTocar() || !(qual in GANHO_CASA)) return false;
      acordar();
      const ag = ctx.currentTime;
      if (ag - (ultimo.get(qual) ?? -Infinity) < 0.12) return false;
      const b = buffers.get(qual);
      if (!b) return false;
      const v =
        onde && ouvinte
          ? volumeNaDistancia(Math.hypot(onde.x - ouvinte.x, onde.z - ouvinte.z), 6, 28)
          : 1;
      if (v <= 0.001) return false;
      if (vozes.length >= MAX_VOZES) return false;
      const x = iniciar(qual, b, { ganho: dbLin(GANHO_CASA[qual]) * v, t: ag + 0.01 });
      if (!x) return false;
      ultimo.set(qual, ag);
      vozes.push(x);
      return true;
    },
    acordar,
    info() {
      return {
        acordado,
        pronto: acordado && fila.length === 0 && buffers.size === RECEITAS.length,
        prontos: buffers.size,
        total: RECEITAS.length,
        tocando: [
          ...vozes.filter((x) => !x.parado).map((x) => x.id),
          ...(lacos.tv && !lacos.tv.parado ? [lacos.tv.id] : []),
          ...(lacos.disco && !lacos.disco.parado ? [lacos.disco.id] : []),
        ],
      };
    },
    liberar(): void {
      const ag = motor.contexto?.currentTime ?? 0;
      for (const x of vozes) parar(x, ag);
      parar(lacos.tv, ag);
      parar(lacos.disco, ag);
      lacos.tv = lacos.disco = null;
      chaveLaco.tv = chaveLaco.disco = '';
      vozes.length = 0;
      fila = [];
      buffers.clear();
      acordado = false;
      ouvinte = null;
    },
  };
}
