import type { TipoCriatura } from '../../jogo/criaturas';
import type { VozCriatura } from '../tipos';
import { pio } from '../rancho-alegre/vozes';

/**
 * Vozes sintetizadas dos bichos da Vila Neon (spec 026). São a reserva: enquanto o pacote de
 * vozes gravadas do bairro não chegou (ou se falhar), toca isto. Tudo macio e curto.
 */
export const VOZES_VILA: Record<TipoCriatura, VozCriatura> = {
  // lhama: o "bé" cantado e manso, um "mé!" de susto e o "hmmm" contente
  cervo: {
    chamado: pio('triangle', 520, 430, 0.32, 1, 0, { vibrato: 9, ruido: 0.06, ganho: 0.6 }),
    susto: pio('triangle', 760, 560, 0.16, 1, 0, { vibrato: 12, ganho: 0.6 }),
    contente: pio('sine', 300, 340, 0.4, 1, 0, { vibrato: 5, ganho: 0.55 }),
  },
  // coelhinho: chiadinho fino, um "ii!" e o fungado contente
  coelho: {
    chamado: pio('sine', 1300, 1600, 0.05, 2, 0.08, { ganho: 0.45 }),
    susto: pio('triangle', 1700, 2100, 0.06, 2, 0.04, { ganho: 0.5 }),
    contente: pio('sine', 900, 1000, 0.03, 4, 0.04, { ruido: 0.25, ganho: 0.4 }),
  },
  // peixinho-dourado: bolhinhas do lago
  peixe: {
    chamado: pio('sine', 420, 1050, 0.05, 3, 0.07, { ganho: 0.45 }),
    susto: pio('sine', 1150, 560, 0.05, 3, 0.04, { ganho: 0.55 }),
    contente: pio('sine', 640, 980, 0.06, 2, 0.1, { ganho: 0.45 }),
  },
  // ouricinho: o "tsc-tsc" de chocalho, um "tsi!" de susto e o "tsc" contente
  espectro: {
    chamado: pio('triangle', 2400, 2200, 0.04, 4, 0.05, { ruido: 0.75, ganho: 0.4 }),
    susto: pio('triangle', 2800, 3200, 0.05, 2, 0.03, { ruido: 0.6, ganho: 0.45 }),
    contente: pio('triangle', 2000, 1900, 0.04, 2, 0.08, { ruido: 0.7, ganho: 0.35 }),
  },
  // cachorrinho: "au-au" fininho, um ganido curto e o "uf" contente
  raposa: {
    chamado: pio('triangle', 640, 480, 0.09, 2, 0.13, { ruido: 0.15, ganho: 0.7 }),
    susto: pio('triangle', 1100, 760, 0.16, 1, 0, { vibrato: 8, ruido: 0.1, ganho: 0.65 }),
    contente: pio('triangle', 700, 880, 0.07, 3, 0.08, { vibrato: 5, ruido: 0.1, ganho: 0.65 }),
  },
};
