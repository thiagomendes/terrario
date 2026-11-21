/**
 * Spec 032: o momento de comer, em todos os mundos (criativo e sobrevivência). Puro: os tempos e
 * o jeito de cada comida, iguais para o núcleo (uma refeição por vez), para o boneco da criança e
 * para o boneco do amigo.
 *
 * A refeição tem `DURACAO_REFEICAO` s: o braço leva a comida à boca (`LEVA`), três mordidas
 * (`MORDIDAS`: a boca abre antes, fecha na mordida, e a comida perde um pedaço), o braço desce
 * (`DESCE`) e a carinha fica feliz (`FELIZ`), com os coraçõezinhos.
 */

/** Cada comida do seu jeito (a mordida que se vê, as migalhas e o som). */
export type JeitoDeComer = 'mordida' | 'pipoca' | 'canudinho' | 'colherada' | 'nuvem' | 'caneca';

const JEITO: Readonly<Record<string, JeitoDeComer>> = {
  pipoca: 'pipoca',
  suco: 'canudinho',
  vitamina: 'canudinho',
  ensopado: 'colherada',
  algodao_doce: 'nuvem',
  // spec 027 (T15): os docinhos da forminha (um some a cada mordida, o jeito da pipoca), a poção
  // de canudinho e o chocolate quente no gole de caneca (a caneca inclina, o nível desce)
  brigadeiro: 'pipoca',
  beijinho: 'pipoca',
  cajuzinho: 'pipoca',
  surpresa_uva: 'pipoca',
  pocao_uva: 'canudinho',
  chocolate_quente: 'caneca',
};

/** O jeito de comer um item (o que não está na lista se morde). */
export function jeitoDeComer(item: string): JeitoDeComer {
  return JEITO[item] ?? 'mordida';
}

/** Quanto dura a refeição inteira (s): o núcleo não aceita outra antes disso. */
export const DURACAO_REFEICAO = 2.6;
/** O braço chega com a comida na boca (s). */
export const LEVA = 0.35;
/** Os instantes das três mordidas (s, do começo). */
export const MORDIDAS: readonly [number, number, number] = [0.6, 1.2, 1.85];
/** O braço começa a descer (s). */
export const DESCE = 2.15;
/** A carinha feliz (os olhos sorrindo e os corações), de quando a quando (s). */
export const FELIZ: readonly [number, number] = [1.95, 3.5];
/** O movimento inteiro no boneco (s): a refeição e a carinha feliz até o fim. */
export const FIM_REFEICAO = FELIZ[1];

/** Quantas mordidas já foram, no instante `t` da refeição (0 a 3). */
export function mordidasAte(t: number): number {
  let n = 0;
  for (const m of MORDIDAS) if (t >= m) n++;
  return n;
}

/**
 * A boca no instante `t` (0 fechada, 1 aberta): abre antes de cada mordida e fecha de uma vez
 * nela ("nhac"), e mastiga um pouquinho entre uma e outra.
 */
export function bocaNaRefeicao(t: number): number {
  if (t < LEVA - 0.1 || t > DESCE + 0.2) return 0;
  for (const m of MORDIDAS) {
    if (t >= m - 0.22 && t < m) return Math.min(1, (t - (m - 0.22)) / 0.16);
    if (t >= m && t < m + 0.06) return 1 - (t - m) / 0.06;
  }
  // mastigando entre as mordidas
  return Math.abs(Math.sin(t * 16)) * 0.25;
}

/** O "nhac" da cabeça (0 a 1): vai para a frente na mordida e volta. */
export function nhacNaRefeicao(t: number): number {
  for (const m of MORDIDAS) {
    const d = t - (m - 0.12);
    if (d >= 0 && d < 0.3) return Math.sin((d / 0.3) * Math.PI);
  }
  return 0;
}

/** O braço com a comida (0 abaixado, 1 na boca). */
export function bracoNaRefeicao(t: number): number {
  const suave = (x: number) => x * x * (3 - 2 * x);
  if (t <= 0) return 0;
  if (t < LEVA) return suave(t / LEVA);
  if (t < DESCE) return 1;
  const f = (t - DESCE) / (DURACAO_REFEICAO - DESCE);
  return f >= 1 ? 0 : 1 - suave(f);
}

/**
 * Entre uma mordida e outra a comida sai um tiquinho da boca (0 a 1: mastigando, a marca da
 * mordida aparece) e volta para a próxima; depois da última, fica longe.
 */
export function afastaNaRefeicao(t: number): number {
  const suave = (x: number) => {
    const c = Math.min(1, Math.max(0, x));
    return c * c * (3 - 2 * c);
  };
  for (let k = 0; k < MORDIDAS.length; k++) {
    const m = MORDIDAS[k];
    const prox = MORDIDAS[k + 1];
    if (t < m) continue;
    if (prox === undefined) return suave((t - m - 0.04) / 0.16);
    if (t < prox) return Math.min(suave((t - m - 0.04) / 0.16), suave((prox - 0.12 - t) / 0.16));
  }
  return 0;
}

/** A carinha feliz (0 a 1) no instante `t`. */
export function felizNaRefeicao(t: number): number {
  const [a, b] = FELIZ;
  if (t < a || t > b) return 0;
  return Math.min(1, (t - a) / 0.15, (b - t) / 0.25);
}
