/** Escala de resolução: nível de hardware scaling (1 = nativa, maior = menos pixels). */
export const ESCALA_MIN = 1;
export const ESCALA_MAX = 2.5;
export const PASSO_ESCALA = 0.25;
export const FPS_BAIXO = 30;
export const FPS_ALTO = 58;
/**
 * Correção da 017 ("névoa" no celular): o celular desenhava em pixels de CSS (390 de largura
 * num iPhone de densidade 3, um terço da tela) e a imagem esticada parecia um véu em cima do
 * cenário e do boneco. Com folga, ele desenha até a densidade 2 (nível 0,5); abaixo do nível 1
 * a nitidez é um extra: cai de volta assim que os quadros passam abaixo deste limite.
 */
export const FPS_NITIDEZ = 50;
/** O nível mais fino no celular (densidade 2). */
export const ESCALA_MIN_TOQUE = 0.5;
/** Em que nível o celular começa (densidade 1,33); sobe para o melhor se sobrar folga. */
export const ESCALA_INICIO_TOQUE = 0.75;

/**
 * O melhor nível para a tela. No celular (toque e tela estreita) segue a densidade da tela
 * até 2, em passos de PASSO_ESCALA; no computador e no tablet, pela largura.
 */
export function escalaBase(larguraTela: number, densidade = 1, toque = false): number {
  if (toque && larguraTela < 1000 && densidade > 1) {
    const nivel = 1 / Math.min(densidade, 2);
    return Math.max(ESCALA_MIN_TOQUE, Math.ceil(nivel / PASSO_ESCALA - 1e-6) * PASSO_ESCALA);
  }
  if (larguraTela >= 1600) return 1.5;
  if (larguraTela >= 1000) return 1.25;
  return 1;
}

function limitar(v: number, base: number): number {
  return Math.min(ESCALA_MAX, Math.max(Math.min(ESCALA_MIN, base), v));
}

/**
 * Sobe a escala (menos pixels) abaixo de FPS_BAIXO e desce acima de FPS_ALTO.
 * Entre os dois limites mantém a atual (histerese). Abaixo do nível 1 (nitidez extra do
 * celular), sobe já abaixo de FPS_NITIDEZ.
 */
export function ajustarEscala(atual: number, fps: number, base: number): number {
  if (fps <= 0) return limitar(atual, base);
  if (fps < FPS_BAIXO || (atual < ESCALA_MIN && fps < FPS_NITIDEZ))
    return limitar(atual + PASSO_ESCALA, base);
  if (fps > FPS_ALTO) return limitar(Math.max(base, atual - PASSO_ESCALA), base);
  return limitar(atual, base);
}
