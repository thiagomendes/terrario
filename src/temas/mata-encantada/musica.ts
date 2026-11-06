import type { ContextoMusicalTema, PaletaMusicalTema, TimbreMusica } from '../tipos';

/** Violão: triângulo com brilho, notas mais curtas (dedilhado), melodia de triângulo. */
export const TIMBRE_MATA: TimbreMusica = {
  onda: 'triangle',
  brilho: 1.6,
  sustentacao: 0.75,
  coro: 3,
  sino: 'triangle',
};

/**
 * Acordes brasileiros (maj7, 9ª, 6ª, 13ª): bossa de dia, choro manso à noite, baião
 * com a escala nordestina na caatinga, modinha no planalto e um brejo sonhador.
 */
export const PALETAS_MATA: Partial<Record<ContextoMusicalTema, PaletaMusicalTema>> = {
  dia: {
    acordes: [
      [48, 52, 55, 59, 62], // Cmaj7(9)
      [45, 52, 55, 59], // Am7(9)
      [50, 53, 57, 60, 64], // Dm7(9)
      [43, 53, 59, 64], // G7(13)
      [48, 52, 57, 62], // C6/9
    ],
    melodia: [72, 74, 76, 79, 81, 83, 84],
    intervalo: 6,
    chanceNota: 0.6,
  },
  noite: {
    acordes: [
      [45, 52, 55, 59], // Am7(9)
      [41, 48, 52, 55], // Fmaj7(9)
      [50, 53, 57, 59], // Dm6
      [40, 50, 56, 59], // E7
    ],
    melodia: [69, 71, 72, 76, 79, 81],
    intervalo: 10,
    chanceNota: 0.35,
  },
  deserto: {
    acordes: [
      [43, 50, 53, 59], // G7
      [43, 53, 57, 60], // F/G
      [43, 53, 59, 61], // G7(#11)
      [50, 53, 57, 60], // Dm7
    ],
    melodia: [67, 69, 71, 73, 74, 76, 77, 79],
    intervalo: 7,
    chanceNota: 0.5,
  },
  taiga: {
    acordes: [
      [38, 50, 54, 59, 64], // D6/9
      [47, 52, 57, 62], // Bm7(11)
      [43, 50, 54, 61], // Gmaj7(#11)
      [45, 50, 55, 59], // A7sus4(9)
    ],
    melodia: [78, 81, 83, 85, 86, 90],
    intervalo: 11,
    chanceNota: 0.3,
  },
  pantano: {
    acordes: [
      [39, 46, 50, 57], // Ebmaj7(#11)
      [49, 53, 56, 60], // Dbmaj7
      [48, 51, 55, 58, 62], // Cm9
      [44, 51, 55, 60], // Abmaj7
    ],
    melodia: [70, 72, 74, 75, 77, 79, 82],
    intervalo: 9,
    chanceNota: 0.45,
  },
  caverna: {
    acordes: [
      [33, 40, 47],
      [31, 38, 45],
      [36, 43, 50],
      [29, 36, 43],
    ],
    melodia: [64, 67, 69, 71, 76],
    intervalo: 13,
    chanceNota: 0.2,
    gotas: true,
  },
  perigo: {
    acordes: [
      [45, 48, 51, 54],
      [44, 47, 50, 53],
    ],
    melodia: [69, 70, 72, 75],
    intervalo: 5,
    chanceNota: 0.25,
    // marcação de zabumba no grave
    pulso: [38, 38, 41, 38, 36, 38],
  },
};
