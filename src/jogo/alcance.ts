/**
 * Alcance das mãos: uma regra só para o cliente prever e o núcleo conferir. O núcleo aceita
 * quebrar, colocar e usar um bloco cujo centro está a até ALCANCE_REGRAS dos olhos; a mira do
 * cliente mede até o ponto onde o raio bate (no máximo meia diagonal do centro) e deixa uma
 * folga para o boneco que anda entre o toque e a conferência.
 */
interface Ponto {
  x: number;
  y: number;
  z: number;
}

/** Distância máxima (dos olhos ao centro do bloco) que o núcleo aceita. */
export const ALCANCE_REGRAS = 8;
/** Mira do centro (mouse, teclado, controle): dos olhos até o ponto atingido. */
export const ALCANCE_MIRA = 5;
/**
 * Mira pelo dedo: mais generosa, para o que a criança vê perto do boneco com a câmera de
 * trás (medido no celular em pé e deitado: e2e/mira-toque.spec.ts).
 */
export const ALCANCE_TOQUE = 6.5;
/** Do ponto atingido ao centro do bloco, no máximo (meia diagonal do cubo). */
export const MEIA_DIAGONAL = Math.sqrt(3) / 2;
/** Folga para o boneco andar entre o cliente prever e o núcleo conferir. */
export const FOLGA_MOVIMENTO = 0.5;

/** O centro do bloco (x, y, z) está a até `raio` dos olhos? (a conta do núcleo) */
export function alcancaDosOlhos(
  olhos: Ponto,
  x: number,
  y: number,
  z: number,
  raio = ALCANCE_REGRAS,
): boolean {
  return Math.hypot(x + 0.5 - olhos.x, y + 0.5 - olhos.y, z + 0.5 - olhos.z) <= raio;
}

/**
 * O cliente só prevê o que o núcleo vai aceitar: o centro do bloco mirado com folga para
 * andar dentro do alcance das regras.
 */
export function clienteAlcanca(olhos: Ponto, x: number, y: number, z: number): boolean {
  return alcancaDosOlhos(olhos, x, y, z, ALCANCE_REGRAS - FOLGA_MOVIMENTO);
}
