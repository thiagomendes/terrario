/**
 * Relógio do mundo (lógica pura, sem tema): o núcleo e o cliente usam as mesmas contas.
 * hora: fração do dia em [0, 1): 0 meia-noite, 0.25 nascer, 0.5 meio-dia, 0.75 pôr.
 */
export type Cor = [number, number, number];

/** Duração de um dia completo, em segundos. */
export const DURACAO_DIA = 20 * 60;
/** Começa numa manhã dourada. */
export const HORA_INICIAL = 0.32;

/** Normaliza qualquer número para [0, 1). */
export function normalizarHora(hora: number): number {
  return ((hora % 1) + 1) % 1;
}

function normalizar(v: Cor): Cor {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
}

/** Direção para o sol na hora dada (arco inclinado, nasce em +x e se põe em -x). */
export function direcaoParaSol(hora: number): Cor {
  const a = (normalizarHora(hora) - 0.25) * Math.PI * 2;
  return normalizar([Math.cos(a), Math.sin(a), -0.38]);
}

/** Quanto é noite (0 de dia, 1 noite fechada): depende só do sol, igual em todo tema. */
export function noiteNaHora(hora: number): number {
  const paraSol = direcaoParaSol(hora);
  return Math.min(1, Math.max(0, (-paraSol[1] - 0.02) / 0.2));
}
