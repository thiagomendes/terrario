import type { TipoCriatura } from '../../jogo/criaturas';
import type { PioCriatura, VozCriatura } from '../tipos';

const pio = (
  onda: PioCriatura['onda'],
  de: number,
  ate: number,
  dur: number,
  repeticoes = 1,
  intervalo = 0,
  extra: Partial<PioCriatura> = {},
): PioCriatura => ({ onda, de, ate, dur, repeticoes, intervalo, ...extra });

/** Vozes do Doce Reino: fofas, elásticas e engraçadas (nada de susto de verdade). */
export const VOZES_DOCE: Record<TipoCriatura, VozCriatura> = {
  // ovelha de marshmallow: um "mééé" macio e abafado
  cervo: {
    chamado: pio('triangle', 520, 430, 0.45, 1, 0, { vibrato: 8, ruido: 0.12, ganho: 0.8 }),
    susto: pio('triangle', 640, 900, 0.14, 2, 0.08, { vibrato: 10, ganho: 0.8 }),
    contente: pio('sine', 440, 520, 0.3, 1, 0, { vibrato: 6, ganho: 0.7 }),
  },
  // coelho de gelatina: "boing" que treme
  coelho: {
    chamado: pio('sine', 320, 760, 0.16, 2, 0.1, { vibrato: 16, ganho: 0.6 }),
    susto: pio('sine', 1100, 420, 0.18, 1, 0, { vibrato: 20, ganho: 0.7 }),
    contente: pio('sine', 600, 950, 0.08, 3, 0.07, { vibrato: 12, ganho: 0.5 }),
  },
  // peixe-bala: bolhinhas de refrigerante
  peixe: {
    chamado: pio('sine', 420, 1300, 0.05, 3, 0.06, { ganho: 0.5 }),
    susto: pio('sine', 1500, 700, 0.05, 3, 0.04, { ganho: 0.6 }),
    contente: pio('sine', 700, 1100, 0.06, 2, 0.08, { ganho: 0.5 }),
  },
  // fantasminha de alcaçuz: "uuu" bobinho, gritinho fino e risadinha
  espectro: {
    chamado: pio('sine', 330, 440, 0.6, 1, 0, { vibrato: 6, ganho: 0.55 }),
    susto: pio('triangle', 900, 1500, 0.12, 2, 0.06, { vibrato: 12, ganho: 0.7 }),
    contente: pio('sine', 720, 900, 0.06, 4, 0.05, { vibrato: 8, ganho: 0.5 }),
  },
  // cãozinho de biscoito: "au au" crocante, chorinho e latidinhos felizes
  raposa: {
    chamado: pio('triangle', 760, 520, 0.1, 2, 0.13, { ruido: 0.15 }),
    susto: pio('triangle', 1300, 700, 0.2, 1, 0, { vibrato: 9, ruido: 0.1 }),
    contente: pio('sine', 900, 1250, 0.07, 3, 0.08, { vibrato: 7, ganho: 0.7 }),
  },
};
