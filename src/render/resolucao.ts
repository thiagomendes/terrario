/** Escala de resolução: nível de hardware scaling (1 = nativa, maior = menos pixels). */
export const ESCALA_MIN = 1;
export const ESCALA_MAX = 2.5;
export const PASSO_ESCALA = 0.25;
export const FPS_BAIXO = 30;
export const FPS_ALTO = 58;

export function escalaBase(larguraTela: number): number {
  if (larguraTela >= 1600) return 1.5;
  if (larguraTela >= 1000) return 1.25;
  return 1;
}

function limitar(v: number): number {
  return Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, v));
}

/**
 * Sobe a escala (menos pixels) abaixo de FPS_BAIXO e desce acima de FPS_ALTO.
 * Entre os dois limites mantém a atual (histerese).
 */
export function ajustarEscala(atual: number, fps: number, base: number): number {
  if (fps <= 0) return limitar(atual);
  if (fps < FPS_BAIXO) return limitar(atual + PASSO_ESCALA);
  if (fps > FPS_ALTO) return limitar(Math.max(base, atual - PASSO_ESCALA));
  return limitar(atual);
}
