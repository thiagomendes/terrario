import type { ContextoMusicalTema, PaletaMusicalTema, Tema } from '../tipos';

/**
 * Trilha da Era dos Dinos: pads quentes em ré dórico, melodia na pentatônica menor
 * e um tambor grave de aventura. P (0) é pausa no tambor, para o pulso ter ritmo
 * em vez de batida contínua.
 */
const P = 0;

const PALETAS: Partial<Record<ContextoMusicalTema, PaletaMusicalTema>> = {
  dia: {
    acordes: [
      [50, 57, 60, 65],
      [43, 50, 59, 62],
      [45, 52, 60, 64],
      [48, 55, 64, 67],
    ],
    melodia: [74, 77, 79, 81, 84, 86],
    intervalo: 8,
    chanceNota: 0.55,
    pulso: [38, P, 45, P, 38, 38, P, P, 41, P, 45, P, 38, P, P, P],
  },
  noite: {
    acordes: [
      [38, 45, 53, 64],
      [40, 47, 55, 62],
      [41, 48, 57, 64],
      [36, 43, 52, 60],
    ],
    melodia: [69, 72, 74, 76, 79],
    intervalo: 11,
    chanceNota: 0.35,
  },
  deserto: {
    acordes: [
      [50, 57, 62],
      [48, 55, 60],
      [46, 53, 58, 62],
      [45, 52, 57, 64],
    ],
    melodia: [74, 76, 77, 81, 82, 86],
    intervalo: 9,
    chanceNota: 0.5,
    pulso: [38, P, P, 38, P, P, 45, P, 38, P, P, 43, P, P, P, P],
  },
  taiga: {
    acordes: [
      [40, 47, 54, 59],
      [43, 50, 57, 62],
      [38, 45, 52, 57],
      [36, 43, 50, 55],
    ],
    melodia: [76, 79, 81, 83, 86],
    intervalo: 12,
    chanceNota: 0.3,
  },
  pantano: {
    acordes: [
      [43, 50, 53, 58],
      [48, 52, 55, 62],
      [45, 52, 55, 60],
      [41, 48, 53, 57],
    ],
    melodia: [67, 70, 72, 74, 77, 79],
    intervalo: 10,
    chanceNota: 0.45,
    pulso: [31, P, P, P, 38, P, P, P],
  },
  caverna: {
    acordes: [
      [31, 38],
      [33, 40],
      [29, 36],
      [34, 41],
    ],
    melodia: [62, 65, 67, 69, 72],
    intervalo: 14,
    chanceNota: 0.2,
    gotas: true,
  },
  perigo: {
    acordes: [
      [45, 48, 52, 57],
      [46, 49, 53, 58],
    ],
    melodia: [69, 72, 74, 75],
    intervalo: 6,
    chanceNota: 0.25,
    pulso: [33, 33, P, 40, 33, P, 31, 33],
  },
};

export const MUSICA_DINOS: Tema['musica'] = {
  timbre: { onda: 'triangle', brilho: 0.8, sustentacao: 1.25, coro: 7, sino: 'triangle' },
  transporte: -2,
  paletas: PALETAS,
};
