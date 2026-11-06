import type { Tema } from '../tipos';

/**
 * Música espacial: senoides, pads lentos e longos, escalas lídias (a quarta aumentada
 * dá o ar de maravilhamento) e hexatônicas. Esparsa: muito silêncio entre as notas.
 */
export const MUSICA_LUA: Tema['musica'] = {
  timbre: { onda: 'sine', brilho: 0.8, sustentacao: 1.8, coro: 4, sino: 'sine' },
  transporte: 0,
  paletas: {
    // Fá lídio
    dia: {
      acordes: [
        [41, 48, 55, 57, 64],
        [43, 50, 59, 62, 69],
        [45, 52, 60, 64, 67],
        [41, 53, 57, 59, 64],
      ],
      melodia: [76, 77, 79, 81, 83, 84, 88],
      intervalo: 12,
      chanceNota: 0.35,
    },
    // Ré dórico, grave e calmo
    noite: {
      acordes: [
        [38, 45, 52, 57],
        [41, 48, 55, 60],
        [36, 43, 50, 55],
        [40, 47, 52, 59],
      ],
      melodia: [69, 71, 74, 76, 79, 81],
      intervalo: 14,
      chanceNota: 0.25,
    },
    // mar de basalto: Dó hexatônico (sem a quarta)
    deserto: {
      acordes: [
        [48, 55, 62, 64],
        [45, 52, 59, 62],
        [43, 50, 57, 59],
        [40, 47, 55, 59],
      ],
      melodia: [74, 76, 79, 81, 83, 86],
      intervalo: 11,
      chanceNota: 0.4,
    },
    // cratera gelada: Sol lídio, agudo e cristalino
    taiga: {
      acordes: [
        [43, 50, 57, 59, 66],
        [45, 52, 57, 61, 64],
        [47, 54, 59, 62, 66],
        [40, 47, 54, 57, 62],
      ],
      melodia: [83, 85, 86, 88, 90, 91, 95],
      intervalo: 13,
      chanceNota: 0.3,
    },
    // vale cintilante: Si bemol lídio
    pantano: {
      acordes: [
        [46, 53, 57, 60, 64],
        [48, 55, 60, 64, 67],
        [45, 52, 57, 60, 64],
        [43, 50, 57, 62],
      ],
      melodia: [74, 76, 77, 79, 81, 84],
      intervalo: 11,
      chanceNota: 0.4,
    },
    caverna: {
      acordes: [
        [29, 36],
        [31, 38],
        [28, 35],
        [26, 33],
      ],
      melodia: [64, 67, 69, 71, 76],
      intervalo: 15,
      chanceNota: 0.18,
      gotas: true,
    },
    perigo: {
      acordes: [
        [45, 48, 52, 59],
        [44, 47, 51, 58],
      ],
      melodia: [69, 71, 72, 75],
      intervalo: 7,
      chanceNota: 0.25,
      pulso: [33, 33, 40, 33, 31, 33],
    },
  },
};
