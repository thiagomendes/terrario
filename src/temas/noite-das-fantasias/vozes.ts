import type { TipoCriatura } from '../../jogo/criaturas';
import type { VozCriatura } from '../tipos';
import { pio } from '../rancho-alegre/vozes';

/**
 * Vozes sintetizadas dos bichos da Noite das Fantasias (spec 027). São a reserva: enquanto o
 * pacote de vozes gravadas do mundo não chega (ou se falhar), toca isto. Tudo macio, curto e
 * engraçado, nunca de susto de verdade.
 */
export const VOZES_FANTASIAS: Record<TipoCriatura, VozCriatura> = {
  // abóbora saltitante: o "pof" fofo de quem pula, um "opa!" e o "pof-pof" contente
  cervo: {
    chamado: pio('sine', 260, 180, 0.09, 2, 0.12, { ruido: 0.15, ganho: 0.6 }),
    susto: pio('triangle', 520, 700, 0.1, 1, 0, { ganho: 0.55 }),
    contente: pio('sine', 300, 220, 0.07, 3, 0.09, { ruido: 0.12, ganho: 0.55 }),
  },
  // morceguinho: o "ii-ii" fininho e alegre
  coelho: {
    chamado: pio('sine', 2400, 2900, 0.05, 3, 0.06, { ganho: 0.4 }),
    susto: pio('triangle', 2800, 3400, 0.05, 2, 0.04, { ganho: 0.45 }),
    contente: pio('sine', 2200, 2600, 0.04, 4, 0.05, { ganho: 0.4 }),
  },
  // peixinho: as bolhinhas do laguinho
  peixe: {
    chamado: pio('sine', 420, 1050, 0.05, 3, 0.07, { ganho: 0.45 }),
    susto: pio('sine', 1150, 560, 0.05, 3, 0.04, { ganho: 0.55 }),
    contente: pio('sine', 640, 980, 0.06, 2, 0.1, { ganho: 0.45 }),
  },
  // fantasminha: o "uuu" cantado e manso (de brincadeira), um "ih!" e a risadinha
  espectro: {
    chamado: pio('sine', 520, 640, 0.42, 1, 0, { vibrato: 6, ganho: 0.45 }),
    susto: pio('sine', 900, 1200, 0.1, 1, 0, { ganho: 0.45 }),
    contente: pio('triangle', 880, 1040, 0.06, 4, 0.06, { ganho: 0.4 }),
  },
  // sapinho: o "croc" redondo, um "crec!" e o "croc-croc" contente
  raposa: {
    chamado: pio('triangle', 380, 300, 0.08, 2, 0.1, { ruido: 0.2, ganho: 0.6 }),
    susto: pio('triangle', 600, 760, 0.08, 1, 0, { ruido: 0.15, ganho: 0.55 }),
    contente: pio('triangle', 420, 340, 0.06, 3, 0.07, { ruido: 0.18, ganho: 0.55 }),
  },
};
