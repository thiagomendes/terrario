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
