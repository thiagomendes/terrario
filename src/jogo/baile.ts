/**
 * Spec 027: as regras puras da Noite das Fantasias (sem tela, sem núcleo), lidas pelo núcleo
 * (`src/nucleo/baile.ts`), pela tela e pelo tema.
 */

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
