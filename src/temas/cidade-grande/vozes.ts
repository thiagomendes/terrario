import type { TipoCriatura } from '../../jogo/criaturas';
import type { VozCriatura } from '../tipos';
import { pio } from '../rancho-alegre/vozes';

/**
 * Vozes sintetizadas dos bichos da cidade (spec 014, T08). São a reserva: enquanto o pacote
 * de vozes gravadas da cidade não chegou (ou se falhar), toca isto. Tudo macio e curto.
 */
export const VOZES_CIDADE: Record<TipoCriatura, VozCriatura> = {
  // cachorro grande: "au-au" grave e amigo, um ganido curto de susto e "uf-uf" contente
  cervo: {
    chamado: pio('triangle', 420, 300, 0.12, 2, 0.16, { ruido: 0.18, ganho: 0.8 }),
    susto: pio('triangle', 900, 560, 0.2, 1, 0, { vibrato: 8, ruido: 0.1, ganho: 0.7 }),
    contente: pio('triangle', 520, 700, 0.08, 3, 0.09, { vibrato: 5, ruido: 0.1, ganho: 0.7 }),
  },
  // pombo: "ruuu-cuu" redondinho, um bater de asas e um "rru" baixinho
  coelho: {
    chamado: pio('sine', 330, 290, 0.32, 2, 0.12, { vibrato: 9, ganho: 0.6 }),
    susto: pio('triangle', 700, 900, 0.05, 4, 0.03, { ruido: 0.4, ganho: 0.55 }),
    contente: pio('sine', 310, 280, 0.25, 1, 0, { vibrato: 8, ganho: 0.55 }),
  },
  // carpa: bolhinhas do lago
  peixe: {
    chamado: pio('sine', 360, 1000, 0.05, 3, 0.08, { ganho: 0.45 }),
    susto: pio('sine', 1200, 560, 0.05, 3, 0.04, { ganho: 0.55 }),
    contente: pio('sine', 620, 950, 0.06, 2, 0.1, { ganho: 0.45 }),
  },
  // guaxinim: o "trrr" travesso (trinado), um "ii!" de susto e um "trr" contente
  espectro: {
    chamado: pio('triangle', 760, 900, 0.05, 5, 0.025, { vibrato: 28, ganho: 0.5 }),
    susto: pio('triangle', 1100, 1400, 0.09, 2, 0.05, { vibrato: 10, ganho: 0.55 }),
    contente: pio('triangle', 820, 760, 0.05, 3, 0.03, { vibrato: 24, ganho: 0.45 }),
  },
  // gato de rua: "miau" pedindo, um "fff" curtinho de susto e o ronronar contente
  raposa: {
    chamado: pio('triangle', 620, 820, 0.38, 1, 0, { vibrato: 6, ganho: 0.65 }),
    susto: pio('sawtooth', 900, 700, 0.14, 1, 0, { ruido: 0.5, ganho: 0.4 }),
    contente: pio('sawtooth', 70, 72, 0.08, 6, 0.02, { ruido: 0.2, ganho: 0.35 }),
  },
};
