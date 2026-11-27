/**
 * Spec 039b (T01b): a TV e o aparelho de som postos, ligados e desligados pelo toque (puro: o
 * núcleo decide; a tela lê o `moveisLigados` do quadro e desenha). A esperinha entre dois toques
 * é a da Casa anos 80 (`jogo/casa.ts`).
 */
import { ESPERA_CANAL, ESPERA_DISCO } from './casa';

/** Os desenhos da TV de rack (quatro, nossos e mansos); o quinto toque desliga. */
export const DESENHOS_TV = 4;
/** A TV desliga sozinha depois disso sem ninguém perto (s). */
export const TV_SOZINHA = 180;
/** Quem está até aqui (blocos, no chão) conta como perto da TV. */
export const PERTO_DA_TV = 9.5;
/** A musiquinha do som toca uma vez, por isso (s), e para. */
export const DURA_MUSICA = 20;
/** Até onde o quadro leva os móveis ligados (a distância de desenho dos móveis) e quantos. */
export const ALCANCE_LIGADOS = 32;
export const MAX_LIGADOS = 16;

/** A TV ou o som ligado (no núcleo; não vai salvo). */
export interface Ligado {
  /** O desenho da TV (0 a 3) ou a música do som (0). */
  programa: number;
  /** Quando o programa começou (s do núcleo). */
  desde: number;
  /** O último toque aceito (a esperinha). */
  tocou: number;
}

/**
 * O toque na TV: liga no primeiro desenho, passa para o próximo e, no quinto, desliga (null).
 * `undefined`: na esperinha, nada muda.
 */
export function tocarTv(e: Ligado | null, t: number): Ligado | null | undefined {
  if (e && t - e.tocou < ESPERA_CANAL) return undefined;
  if (!e) return { programa: 0, desde: t, tocou: t };
  if (e.programa + 1 >= DESENHOS_TV) return null;
  return { programa: e.programa + 1, desde: t, tocou: t };
}

/** O toque no som: toca a musiquinha, ou para antes. `undefined`: na esperinha. */
export function tocarSom(e: Ligado | null, t: number): Ligado | null | undefined {
  if (e && t - e.tocou < ESPERA_DISCO) return undefined;
  return e ? null : { programa: 0, desde: t, tocou: t };
}

/** A musiquinha já acabou (o som para sozinho)? */
export const musicaAcabou = (e: Ligado, t: number): boolean => t - e.desde >= DURA_MUSICA;
