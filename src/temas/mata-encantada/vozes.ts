import type { TipoCriatura } from '../../jogo/criaturas';
import type { MovimentoCriatura, VozCriatura } from '../tipos';

/** Capivara gingando devagar, sapo aos pulos, Saci pulando num pé só, guará elegante. */
export const MOVIMENTO_MATA: Record<TipoCriatura, MovimentoCriatura> = {
  cervo: { saltita: 0, flutua: 0, ginga: 0.08 },
  coelho: { saltita: 0.3, flutua: 0, ginga: 0 },
  peixe: { saltita: 0, flutua: 0, ginga: 0.12 },
  espectro: { saltita: 0.26, flutua: 0, ginga: 0.18 },
  raposa: { saltita: 0, flutua: 0, ginga: 0.04 },
};

/**
 * Vozes: a capivara estala e assobia baixinho, o sapo coaxa, o lambari faz bolhas,
 * o Saci assobia e dá risadinhas, e o lobo-guará solta seu "uó" rouco.
 */
export const VOZES_MATA: Record<TipoCriatura, VozCriatura> = {
  cervo: {
    chamado: {
      onda: 'triangle',
      de: 760,
      ate: 640,
      dur: 0.05,
      repeticoes: 4,
      intervalo: 0.07,
      ruido: 0.2,
      ganho: 0.6,
    },
    susto: {
      onda: 'triangle',
      de: 320,
      ate: 220,
      dur: 0.14,
      repeticoes: 2,
      intervalo: 0.08,
      ruido: 0.45,
    },
    contente: {
      onda: 'triangle',
      de: 150,
      ate: 165,
      dur: 0.5,
      repeticoes: 1,
      intervalo: 0,
      vibrato: 18,
      ruido: 0.25,
      ganho: 0.7,
    },
  },
  coelho: {
    chamado: {
      onda: 'square',
      de: 230,
      ate: 180,
      dur: 0.08,
      repeticoes: 3,
      intervalo: 0.07,
      ruido: 0.15,
      ganho: 0.4,
    },
    susto: {
      onda: 'square',
      de: 420,
      ate: 260,
      dur: 0.1,
      repeticoes: 1,
      intervalo: 0,
      ganho: 0.45,
    },
    contente: {
      onda: 'triangle',
      de: 280,
      ate: 330,
      dur: 0.09,
      repeticoes: 2,
      intervalo: 0.1,
      vibrato: 12,
      ganho: 0.6,
    },
  },
  peixe: {
    chamado: {
      onda: 'sine',
      de: 700,
      ate: 1500,
      dur: 0.04,
      repeticoes: 3,
      intervalo: 0.08,
      ganho: 0.45,
    },
    susto: {
      onda: 'sine',
      de: 1100,
      ate: 2000,
      dur: 0.05,
      repeticoes: 4,
      intervalo: 0.04,
      ganho: 0.55,
    },
    contente: {
      onda: 'sine',
      de: 500,
      ate: 1000,
      dur: 0.06,
      repeticoes: 2,
      intervalo: 0.12,
      ganho: 0.45,
    },
  },
  espectro: {
    // o assobio do Saci: sobe e desce, duas vezes
    chamado: {
      onda: 'sine',
      de: 1400,
      ate: 2100,
      dur: 0.32,
      repeticoes: 2,
      intervalo: 0.14,
      vibrato: 6,
      ruido: 0.1,
      ganho: 0.55,
    },
    // "ui!" assustado
    susto: {
      onda: 'triangle',
      de: 900,
      ate: 1600,
      dur: 0.14,
      repeticoes: 1,
      intervalo: 0,
      ganho: 0.7,
    },
    // risadinha "hi-hi-hi-hi"
    contente: {
      onda: 'triangle',
      de: 820,
      ate: 980,
      dur: 0.07,
      repeticoes: 4,
      intervalo: 0.06,
      ganho: 0.6,
    },
  },
  raposa: {
    chamado: {
      onda: 'triangle',
      de: 400,
      ate: 300,
      dur: 0.22,
      repeticoes: 2,
      intervalo: 0.3,
      ruido: 0.3,
    },
    susto: {
      onda: 'triangle',
      de: 640,
      ate: 420,
      dur: 0.12,
      repeticoes: 1,
      intervalo: 0,
      ruido: 0.25,
    },
    contente: {
      onda: 'sine',
      de: 520,
      ate: 700,
      dur: 0.1,
      repeticoes: 2,
      intervalo: 0.1,
      vibrato: 6,
      ganho: 0.7,
    },
  },
};
