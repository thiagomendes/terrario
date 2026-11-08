import type { TipoCriatura } from '../../jogo/criaturas';
import type { PioCriatura, VozCriatura } from '../tipos';

export const pio = (
  onda: PioCriatura['onda'],
  de: number,
  ate: number,
  dur: number,
  repeticoes = 1,
  intervalo = 0,
  extra: Partial<PioCriatura> = {},
): PioCriatura => ({ onda, de, ate, dur, repeticoes, intervalo, ...extra });

/** Vozes do Rancho Alegre: os bichos do sítio, de brinquedo (nada de susto de verdade). */
export const VOZES_RANCHO: Record<TipoCriatura, VozCriatura> = {
  // vaca: um "muuu" grave e comprido, um "mu!" de susto e um "mmm" contente
  cervo: {
    chamado: pio('sawtooth', 165, 125, 0.95, 1, 0, { vibrato: 4, ruido: 0.1, ganho: 0.55 }),
    susto: pio('sawtooth', 230, 160, 0.28, 1, 0, { vibrato: 6, ruido: 0.1, ganho: 0.6 }),
    contente: pio('triangle', 150, 135, 0.5, 1, 0, { vibrato: 3, ganho: 0.6 }),
  },
  // galinha: "cocó-có", um cacarejo assustado e um "có" baixinho
  coelho: {
    chamado: pio('triangle', 720, 520, 0.08, 3, 0.07, { ruido: 0.12, ganho: 0.6 }),
    susto: pio('triangle', 1100, 700, 0.1, 4, 0.04, { ruido: 0.15, ganho: 0.7 }),
    contente: pio('triangle', 560, 480, 0.1, 2, 0.12, { ruido: 0.08, ganho: 0.55 }),
  },
  // tilápia: bolhinhas do açude
  peixe: {
    chamado: pio('sine', 380, 1100, 0.05, 3, 0.07, { ganho: 0.45 }),
    susto: pio('sine', 1300, 600, 0.05, 3, 0.04, { ganho: 0.55 }),
    contente: pio('sine', 650, 1000, 0.06, 2, 0.09, { ganho: 0.45 }),
  },
  // coruja curiosa: "uh-uuu" macio, um piado de susto e um "uh" contente
  espectro: {
    chamado: pio('sine', 420, 380, 0.32, 2, 0.16, { vibrato: 5, ganho: 0.6 }),
    susto: pio('sine', 900, 1300, 0.1, 2, 0.06, { vibrato: 8, ganho: 0.6 }),
    contente: pio('sine', 460, 520, 0.18, 1, 0, { vibrato: 4, ganho: 0.5 }),
  },
  // cachorro do sítio: "au au", chorinho e latidinhos felizes
  raposa: {
    chamado: pio('triangle', 640, 420, 0.1, 2, 0.14, { ruido: 0.18 }),
    susto: pio('triangle', 1200, 650, 0.22, 1, 0, { vibrato: 9, ruido: 0.1 }),
    contente: pio('triangle', 820, 1100, 0.07, 3, 0.08, { vibrato: 6, ruido: 0.08, ganho: 0.7 }),
  },
};
