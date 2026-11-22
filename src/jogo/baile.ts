/**
 * Spec 027: as regras puras da Noite das Fantasias (sem tela, sem núcleo), lidas pelo núcleo
 * (`src/nucleo/baile.ts`), pela tela e pelo tema.
 */

import type { PecaBaile, PlanoBaile } from '../world/noiteFantasias';

/** Do espaço da peça (x para a direita de quem olha a frente, z para a frente) para o mundo. */
function noMundo(q: Pick<PecaBaile, 'x' | 'y' | 'z' | 'dir'>, lx: number, ly: number, lz: number): [number, number, number] {
  const a = (q.dir * Math.PI) / 2;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [q.x + lx * c + lz * s, q.y + ly, q.z - lx * s + lz * c];
}

/** O povoado dos moradores da festa (o nome que vai na criatura). */
export const POVOADO_BAILE = 'baile';

/** Os números dos moradores de posto (o `n` do morador no povoado `baile`). */
export const N_BAILE = {
  vovo: 0,
  dudu: 1,
  lulu: 2,
  bento: 3,
  jeronimo: 4,
  filo: 5,
  olavo: 6,
  /** Os vizinhos das cinco casinhas da rua, na ordem das portas (7 a 11). */
  rua: 7,
} as const;

/** Quantos vizinhos moram nas casinhas da rua (as portas sem a da Vovó). */
export const VIZINHOS_DA_RUA = 5;

/** O Bento é o grandão da turma (o monstrinho peludo que ama abraço). */
export const ESCALA_BENTO = 1.3;

/**
 * T11: o abraço do Bento. Um toque nele, de perto: os dois corpos se encontram (ele se abaixa e
 * envolve a criança), balançam de leve 1,2 s e soltam. Os tempos (s) e as distâncias (blocos).
 */
export const ABRACO = {
  /** O Bento chega e envolve. */
  entra: 0.4,
  /** O balanço junto. */
  balanca: 1.2,
  /** Solta. */
  sai: 0.4,
  /** Depois de um abraço, a próxima criança espera este tanto. */
  espera: 0.3,
  /** Até onde o toque no Bento vale (do centro dele aos pés da criança, no chão). */
  alcance: 2.8,
  /** A criança que anda mais que isto desde o começo solta o abraço (mexeu no controle). */
  solta: 0.35,
} as const;
/**
 * T16: a varinha de condão. Com ela na mão, o toque no chão a até `alcance` blocos faz brilhar
 * a estrela e nascer uma florzinha, que some sozinha em `flor` s (evento, sem estado salvo). Uma
 * por vez a cada `espera` s (o limite por segundo).
 */
export const VARINHA = { alcance: 5, flor: 4, espera: 0.6 } as const;

/** Quanto dura o abraço inteiro (s). */
export const DURACAO_ABRACO = ABRACO.entra + ABRACO.balanca + ABRACO.sai;

// ------------------------------------------------------------------ T18: as missões n1 a n5
/**
 * As missões da parte 1 (os ids da alma, `jogo/alma.ts`). A regra de cada uma está no núcleo
 * (`nucleo/baileMissoes.ts`); aqui ficam os números e as contas que a tela e o guia também leem.
 */
export const M_DOCES = 'n1';
export const M_LANTERNAS = 'n2';
export const M_LULU = 'n3';
export const M_ABOBORA = 'n4';
export const M_TUFINHO = 'n5';

/** n1: cada porta nova é a bolinha seguinte (em qualquer ordem; as seis portas da rua valem). */
export const USOS_DOCES = ['doces:porta1', 'doces:porta2', 'doces:porta3', 'doces:porta4', 'doces:porta5'] as const;
/** n2: a chave do evento que o núcleo manda uma vez por lanterna de cada criança. */
export const CHAVE_LANTERNA = 'acendeu:lanterna';
/** n3: os três esconderijos, nesta ordem (um de cada vez). */
export const USOS_LULU = ['lulu:abobora', 'lulu:casinha', 'lulu:bosque'] as const;
/** n4: plantar, regar e colher; a carinha; o lampião na porta da Vovó. */
export const USOS_ABOBORA = ['abobora:horta', 'abobora:carinha', 'abobora:porta'] as const;
/** n5: achar o Tufinho na horta; entregá-lo à Vovó. */
export const USOS_TUFINHO = ['tufinho:achou', 'tufinho:vovo'] as const;

/** As três carinhas da bancada (todas de olhos redondos). */
export const CARINHAS = ['sorriso', 'lingua', 'piscadinha'] as const;
export type Carinha = (typeof CARINHAS)[number];

/**
 * Os números das missões (blocos e segundos). Os alcances são um tico maiores que o do dedo na
 * tela (o toque generoso da Vila): o núcleo nunca recusa o que a tela deixou tocar.
 */
export const MISSOES_BAILE = {
  /** n1: da frente da porta (onde a criança fica) até os pés. */
  campainha: 6.5,
  /** n1: a porta fica aberta tanto tempo (s), para todos verem. */
  portaAberta: 2,
  /** n1: a "travessura" (o fantasminha do confete) é a terceira porta de cada criança. */
  travessura: 3,
  /** n2: da lanterna até os pés (no chão; a lanterna fica no alto do poste). */
  lanterna: 6.5,
  /** n3: do esconderijo da vez até os pés. */
  lulu: 4.5,
  /** n3: a risadinha começa a crescer a tantos blocos do esconderijo (na tela). */
  risadinha: 10,
  /** n4: do canteiro marcado, da bancada e da porta da Vovó até os pés. */
  canteiro: 4.5,
  bancada: 4.5,
  porta: 4.5,
  /** n4: quem também está no último passo a até tantos blocos da porta faz o passo junto. */
  portaAmigo: 4,
  /** n4: depois de regar, o broto vira abóbora em tantos segundos. */
  cresce: 5,
  /** n5: do Tufinho até os pés (na horta, ou atrás de quem ele segue). */
  tufinho: 4.5,
  /** n5: a entrega conta para quem tem a n5 aberta a até tantos blocos da Vovó. */
  entrega: 6,
  /** A parreirinha: do meio da latada até os pés; até tantas uvas na mochila. */
  parreira: 5,
  uvas: 8,
} as const;

/** Perto no chão: a distância de (x, z) até o ponto, e a altura dos pés perto da dele. */
export function pertoNoChao(
  p: readonly [number, number, number] | { x: number; y: number; z: number },
  x: number,
  y: number,
  z: number,
  r: number,
  dy = 4,
): boolean {
  const [px, py, pz] = Array.isArray(p) ? p : [(p as { x: number }).x, (p as { y: number }).y, (p as { z: number }).z];
  return Math.hypot(x - px, z - pz) <= r && Math.abs(y - py) <= dy;
}

/** n3: o esconderijo da vez (0 a 2), pelos lugares já vistos; 3 quando a Lulu já foi achada nos três. */
export function passoDaLulu(lugares: readonly string[]): number {
  const k = USOS_LULU.findIndex((u) => !lugares.includes(u));
  return k < 0 ? USOS_LULU.length : k;
}

/** O passo de uma missão de lugares em ordem (o primeiro uso ainda não visto). */
export function passoEmOrdem(usos: readonly string[], lugares: readonly string[]): number {
  const k = usos.findIndex((u) => !lugares.includes(u));
  return k < 0 ? usos.length : k;
}

/** No espaço da peça da bancada da horta: o meio de cada abóbora de carinha (x, y, z). */
export const CARINHAS_NA_BANCADA: readonly (readonly [number, number, number])[] = [
  [-1.4, 1.3, 0.02],
  [-0.6, 1.3, 0.02],
  [0.2, 1.3, 0.02],
];

/**
 * Onde se toca em cada coisa das missões (o mundo; a tela confere o dedo perto do ponto, e o
 * guia leva até ele): a campainha de cada porta, as lanternas, a Lulu de cada esconderijo, o
 * canteiro, as três carinhas da bancada, a porta da Vovó, o Tufinho na horta e a parreirinha.
 */
export function pontosDasMissoes(plano: PlanoBaile) {
  const pt = plano.pontos;
  const bancada = plano.pecas.find((q) => q.tipo === 'bancada');
  const parreira = plano.pecas.find((q) => q.tipo === 'parreira');
  const canteiro = plano.pecas.find((q) => q.tipo === 'canteiro-marcado');
  const vovo = pt.portas.find((q) => q.vovo) ?? pt.portas[pt.portas.length - 1];
  const p3 = (x: number, y: number, z: number): [number, number, number] => [x, y, z];
  return {
    /** A porta (o meio dela, um tico acima dos pés de quem toca). */
    portas: pt.portas.map((q) => p3(q.x, q.y + 1.1, q.z)),
    lanternas: pt.lanternas.map((l) => p3(l[0], l[1], l[2])),
    lulu: pt.esconderijos.map((q) => p3(q.x, q.y + 0.9, q.z)),
    canteiro: canteiro ? p3(canteiro.x, canteiro.y + 0.3, canteiro.z) : p3(pt.canteiro[0], pt.canteiro[1] + 0.3, pt.canteiro[2]),
    carinhas: CARINHAS_NA_BANCADA.map(([x, y, z]) => (bancada ? noMundo(bancada, x, y, z) : p3(pt.bancada[0], pt.bancada[1] + 1.2, pt.bancada[2]))),
    porta: p3(vovo.x, vovo.y + 1.1, vovo.z),
    tufinho: p3(pt.tufinhoHorta[0], pt.tufinhoHorta[1] + 0.4, pt.tufinhoHorta[2]),
    parreira: parreira ? p3(parreira.x, parreira.y + 2, parreira.z) : p3(pt.parreira[0], pt.parreira[1] + 2, pt.parreira[2]),
  };
}

/** n4: a plantinha do canteiro marcado de uma criança (só na tela dela). */
export type FaseHorta = 'broto' | 'regada';
/** n4: a abóbora já está pronta para colher? (`desde`: s desde que regou). */
export const prontaParaColher = (f: FaseHorta | null, desde: number) =>
  f === 'regada' && desde >= MISSOES_BAILE.cresce;

/** n5: onde está o Tufinho de verdade (`q`: quem ele segue). */
export interface TufinhoVista {
  o: 'casa' | 'horta' | 'segue';
  q?: string;
}

/**
 * O que a tela de uma criança sabe da festa (no quadro, quando muda; a cada segundo também). O
 * que é do mundo (as lanternas acesas, o lampião da porta, o Tufinho de verdade) e o que é só
 * dela (as portas, as lanternas contadas nesta rodada, a plantinha, a carinha, a cópia do
 * Tufinho). A Lulu escondida vem dos lugares da alma (`passoDaLulu`).
 */
export interface BaileVista {
  /** O relógio do núcleo (s). */
  t: number;
  /** n1: as portas que já deram doce a esta criança (índices de `pontos.portas`). */
  pt: number[];
  /** n2: as cinco lanternas do bosque, acesas ou não (do mundo, para todos). */
  ln: boolean[];
  /** n2: as lanternas que já contaram para esta criança nesta rodada. */
  lc: number[];
  /** n4: a plantinha desta criança (`r`: s desde que regou). */
  hv?: { f: FaseHorta; r: number };
  /** n4: a carinha que esta criança escolheu (índice de `CARINHAS`). */
  car?: number;
  /** n4: o lampião da porta da Vovó (a carinha; do mundo, o último posto fica). */
  lp?: number;
  /** n5: o Tufinho de verdade. */
  tf: TufinhoVista;
  /** n5: a cópia "fugida" do Tufinho, só na tela desta criança. */
  tc?: 'horta' | 'segue';
}
