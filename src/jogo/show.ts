/**
 * O Show da Vila (spec 026): as regras puras do tempo da música, iguais no núcleo (aparelho e
 * nuvem) e na tela. Nada de DOM, Babylon ou áudio.
 *
 * - A música do show tem 120 batidas por minuto: um compasso de 4 tempos dura 2 s, e o show é
 *   uma volta de 20 compassos (40 s), com o chamado do fim no último par de compassos.
 * - **Nenhum toque perdido:** qualquer toque no palco toca o acorde do compasso em que cai,
 *   encaixado no próximo oitavo de compasso (no máximo 0,25 s depois), sempre na nota certa.
 * - **O acorde final:** a partir de `CHAMADO` o palco pisca chamando; o primeiro toque dispara o
 *   acorde final (em até 100 ms: não espera o encaixe); sem toque, ele vem sozinho em
 *   `ESPERA_FINAL` s (decisão do dono, 15 nov 2026). Depois vem o aplauso e o show acaba.
 * - Depois do show, as três caixas ficam como brinquedo livre (cada toque liga e desliga a
 *   camada dela), sem moedinha.
 */

export const BPM = 120;
/** Um compasso de 4 tempos (s). */
export const COMPASSO = (60 / BPM) * 4;
/** O encaixe do toque: um oitavo de compasso (s). */
export const OITAVO = COMPASSO / 8;
/** Compassos de uma volta da música. */
export const COMPASSOS_SHOW = 20;
/** O palco começa a piscar chamando o acorde final (s desde o começo). */
export const CHAMADO = COMPASSO * (COMPASSOS_SHOW - 2);
/** Sem toque, o acorde final vem sozinho depois do chamado (s). */
export const ESPERA_FINAL = 4;
/** O aplauso depois do acorde final (s); então o show acaba. */
export const APLAUSO = 5;
/** O chamado chega antes do primeiro tempo (s): a música tem uma contagem nas baquetas. */
export const CONTAGEM = COMPASSO;

/** A sequência de acordes do show (um por compasso, em laço): Mi, Dó, Ré, Mi (rock em Mi). */
export const ACORDES_SHOW: readonly (readonly number[])[] = [
  [40, 47, 52, 56, 59, 64],
  [36, 43, 48, 52, 55, 60],
  [38, 45, 50, 54, 57, 62],
  [40, 47, 52, 56, 59, 64],
];
/** O acorde final: Mi com a quinta em cima, bem cheio. */
export const ACORDE_FINAL: readonly number[] = [28, 40, 47, 52, 59, 64, 71];

export type FaseShow = 'tocando' | 'chamando' | 'final' | 'acabou';

/** O estado do show no núcleo: quando começou e quando veio o acorde final (tempo do mundo). */
export interface Show {
  inicio: number;
  final: number | null;
  /** Quem disparou o acorde final ('auto' se veio sozinho). */
  quem?: string;
}

/** A fase do show no tempo `t` (mesmo relógio de `inicio`). */
export function faseDoShow(s: Show, t: number): FaseShow {
  if (s.final !== null) return t - s.final >= APLAUSO ? 'acabou' : 'final';
  const d = t - s.inicio;
  return d >= CHAMADO ? 'chamando' : 'tocando';
}

/** O acorde final veio sozinho? (o chamado esperou ESPERA_FINAL sem toque) */
export function finalSozinho(s: Show, t: number): boolean {
  return s.final === null && t - s.inicio >= CHAMADO + ESPERA_FINAL;
}

/** O momento do acorde final se ele vier sozinho (para a tela e o som). */
export function momentoFinalSozinho(s: Show): number {
  return s.inicio + CHAMADO + ESPERA_FINAL;
}

/**
 * O toque no palco no tempo `t`: quando o acorde soa (o próximo oitavo, no máximo 0,25 s
 * depois) e qual acorde (o do compasso em que ele soa). Na contagem (antes do primeiro tempo),
 * o toque cai no primeiro tempo.
 */
export function encaixarToque(s: Show, t: number): { quando: number; acorde: number } {
  const d = Math.max(0, t - s.inicio - CONTAGEM);
  const k = Math.ceil(d / OITAVO - 1e-9);
  const quando = s.inicio + CONTAGEM + k * OITAVO;
  const compasso = Math.floor((quando - s.inicio - CONTAGEM) / COMPASSO + 1e-9);
  return {
    quando,
    acorde: ((compasso % ACORDES_SHOW.length) + ACORDES_SHOW.length) % ACORDES_SHOW.length,
  };
}

/** Quanto falta para o acorde final vir sozinho (0 a ESPERA_FINAL; null fora do chamado). */
export function faltaParaOFinal(s: Show, t: number): number | null {
  if (faseDoShow(s, t) !== 'chamando') return null;
  return Math.max(0, s.inicio + CHAMADO + ESPERA_FINAL - t);
}

// ------------------------------------------------------------------ o palco e as caixas

/** As três caixas do show: cada uma soma uma camada (bateria, baixo e guitarra, teclado). */
export const CAMADAS_CAIXAS = ['bateria', 'guitarra', 'teclado'] as const;
export type CamadaCaixa = (typeof CAMADAS_CAIXAS)[number];

/** Toques por segundo que o núcleo aceita de um jogador no palco (o resto é ignorado). */
export const TOQUES_POR_SEGUNDO = 6;
