import type { TipoCriatura } from '../../jogo/criaturas';
import type { MovimentoCriatura, PecaCriatura, VozCriatura } from '../tipos';

/**
 * Criaturas do Planeta Vivo (mesmas caixas de colisão do jogo):
 *  - lesma-pastora: corpo baixo com concha espiral nas costas e olhos em antenas;
 *  - pulga-bola: bolinha fofa rosa de pernas de mola, que saltita alto;
 *  - água-viva lilás: sino translúcido com miolo de luz e tentáculos;
 *  - sombrinha curiosa: bolota azul-noite com chapeuzinho de guarda-chuva e olhões;
 *  - robô-cão: caixinha prateada com tela de rosto sorridente e antena.
 */
export const CRIATURAS_PLANETA: Record<TipoCriatura, PecaCriatura[]> = {
  cervo: [
    // pé de lesma (sola) e corpo
    { t: [0.54, 0.16, 1.2], p: [0, 0.16, 0], cor: '#4fb8a4' },
    { t: [0.48, 0.3, 1.06], p: [0, 0.35, 0], cor: '#6fd8c0' },
    // concha espiral
    { t: [0.46, 0.66, 0.66], p: [0, 0.8, -0.14], cor: '#ff9a6a' },
    { t: [0.5, 0.14, 0.7], p: [0, 0.74, -0.14], cor: '#b88cff' },
    { t: [0.5, 0.26, 0.26], p: [0, 0.86, -0.14], cor: '#ffd36e', brilho: 0.5 },
    { t: [0.52, 0.1, 0.1], p: [0, 0.86, -0.14], cor: '#c0503a' },
    // pescoço e cabeça
    { t: [0.34, 0.5, 0.3], p: [0, 0.62, 0.48], cor: '#6fd8c0' },
    { t: [0.38, 0.32, 0.36], p: [0, 0.98, 0.58], cor: '#7fe4cc', papel: 'cabeca' },
    { t: [0.16, 0.03, 0.02], p: [0, 0.9, 0.77], cor: '#1a3a40', papel: 'cabeca' },
    { t: [0.08, 0.05, 0.02], p: [0.13, 0.94, 0.77], cor: '#ff9ac0', papel: 'cabeca' },
    { t: [0.08, 0.05, 0.02], p: [-0.13, 0.94, 0.77], cor: '#ff9ac0', papel: 'cabeca' },
    // antenas com olhos na ponta
    { t: [0.06, 0.42, 0.06], p: [0.11, 1.35, 0.6], cor: '#6fd8c0', papel: 'antena' },
    { t: [0.06, 0.42, 0.06], p: [-0.11, 1.35, 0.6], cor: '#6fd8c0', papel: 'antena' },
    { t: [0.15, 0.15, 0.15], p: [0.11, 1.6, 0.6], cor: '#ffffff', papel: 'antena' },
    { t: [0.15, 0.15, 0.15], p: [-0.11, 1.6, 0.6], cor: '#ffffff', papel: 'antena' },
    { t: [0.07, 0.08, 0.03], p: [0.11, 1.6, 0.68], cor: '#151020', papel: 'antena' },
    { t: [0.07, 0.08, 0.03], p: [-0.11, 1.6, 0.68], cor: '#151020', papel: 'antena' },
    // pezinhos ondulantes da sola
    { t: [0.16, 0.08, 0.24], p: [0.2, 0.04, 0.34], cor: '#3a9a88', papel: 'perna0' },
    { t: [0.16, 0.08, 0.24], p: [-0.2, 0.04, 0.34], cor: '#3a9a88', papel: 'perna1' },
    { t: [0.16, 0.08, 0.24], p: [0.2, 0.04, -0.34], cor: '#3a9a88', papel: 'perna1' },
    { t: [0.16, 0.08, 0.24], p: [-0.2, 0.04, -0.34], cor: '#3a9a88', papel: 'perna0' },
  ],
  coelho: [
    { t: [0.4, 0.36, 0.4], p: [0, 0.34, -0.02], cor: '#ff8fc8' },
    { t: [0.3, 0.08, 0.3], p: [0, 0.55, -0.02], cor: '#ffb0dc' },
    { t: [0.32, 0.28, 0.12], p: [0, 0.36, 0.22], cor: '#ffc8e6', papel: 'cabeca' },
    { t: [0.11, 0.12, 0.03], p: [0.08, 0.41, 0.29], cor: '#ffffff', papel: 'cabeca' },
    { t: [0.11, 0.12, 0.03], p: [-0.08, 0.41, 0.29], cor: '#ffffff', papel: 'cabeca' },
    { t: [0.05, 0.06, 0.02], p: [0.08, 0.4, 0.31], cor: '#1a1020', papel: 'cabeca' },
    { t: [0.05, 0.06, 0.02], p: [-0.08, 0.4, 0.31], cor: '#1a1020', papel: 'cabeca' },
    { t: [0.08, 0.03, 0.02], p: [0, 0.31, 0.29], cor: '#c0407a', papel: 'cabeca' },
    { t: [0.03, 0.22, 0.03], p: [0.07, 0.68, 0.12], cor: '#ff8fc8', papel: 'antena' },
    { t: [0.03, 0.22, 0.03], p: [-0.07, 0.68, 0.12], cor: '#ff8fc8', papel: 'antena' },
    { t: [0.08, 0.08, 0.08], p: [0.07, 0.82, 0.12], cor: '#ffe27a', brilho: 0.8, papel: 'antena' },
    { t: [0.08, 0.08, 0.08], p: [-0.07, 0.82, 0.12], cor: '#ffe27a', brilho: 0.8, papel: 'antena' },
    // pernas de mola (coxa e pé)
    { t: [0.08, 0.16, 0.2], p: [0.17, 0.17, -0.06], cor: '#e070b0', papel: 'perna0' },
    { t: [0.1, 0.06, 0.2], p: [0.17, 0.03, 0.02], cor: '#b8508e', papel: 'perna0' },
    { t: [0.08, 0.16, 0.2], p: [-0.17, 0.17, -0.06], cor: '#e070b0', papel: 'perna1' },
    { t: [0.1, 0.06, 0.2], p: [-0.17, 0.03, 0.02], cor: '#b8508e', papel: 'perna1' },
  ],
  peixe: [
    { t: [0.42, 0.22, 0.42], p: [0, 0.33, 0], cor: '#c8a0ff', brilho: 0.6, alfa: 0.75 },
    { t: [0.3, 0.08, 0.3], p: [0, 0.48, 0], cor: '#e0c8ff', brilho: 0.6, alfa: 0.8 },
    { t: [0.14, 0.1, 0.14], p: [0, 0.31, 0], cor: '#7af7e0', brilho: 1.2 },
    { t: [0.05, 0.05, 0.02], p: [0.08, 0.34, 0.215], cor: '#1a1030' },
    { t: [0.05, 0.05, 0.02], p: [-0.08, 0.34, 0.215], cor: '#1a1030' },
    { t: [0.04, 0.2, 0.04], p: [0.1, 0.12, 0.1], cor: '#ff9ad8', brilho: 0.7, papel: 'cauda' },
    { t: [0.04, 0.2, 0.04], p: [-0.1, 0.12, 0.1], cor: '#ff9ad8', brilho: 0.7, papel: 'cauda' },
    { t: [0.04, 0.2, 0.04], p: [0.1, 0.12, -0.1], cor: '#ff9ad8', brilho: 0.7, papel: 'cauda' },
    { t: [0.04, 0.2, 0.04], p: [-0.1, 0.12, -0.1], cor: '#ff9ad8', brilho: 0.7, papel: 'cauda' },
  ],
  espectro: [
    // corpinho redondo e fofo, saia ondulada embaixo
    { t: [0.56, 0.5, 0.5], p: [0, 1.06, 0], cor: '#3e3478', brilho: 0.3, alfa: 0.92 },
    {
      t: [0.46, 0.18, 0.42],
      p: [0, 0.74, 0],
      cor: '#52469a',
      brilho: 0.3,
      alfa: 0.8,
      papel: 'cauda',
    },
    { t: [0.62, 0.44, 0.56], p: [0, 1.5, 0], cor: '#4a3e8a', brilho: 0.3, papel: 'cabeca' },
    // guarda-chuvinha em cúpula de três andares
    { t: [0.9, 0.08, 0.84], p: [0, 1.76, 0], cor: '#ff8ad0', brilho: 0.4, papel: 'cabeca' },
    { t: [0.66, 0.1, 0.62], p: [0, 1.85, 0], cor: '#ffb0e0', brilho: 0.4, papel: 'cabeca' },
    { t: [0.36, 0.1, 0.34], p: [0, 1.95, 0], cor: '#ff8ad0', brilho: 0.4, papel: 'cabeca' },
    { t: [0.08, 0.12, 0.08], p: [0, 2.06, 0], cor: '#ffe27a', brilho: 0.9, papel: 'cabeca' },
    // olhões curiosos (um olha para o lado) e boquinha de "oh!"
    { t: [0.2, 0.22, 0.03], p: [0.14, 1.52, 0.29], cor: '#ffffff', brilho: 0.8, papel: 'cabeca' },
    { t: [0.2, 0.22, 0.03], p: [-0.14, 1.52, 0.29], cor: '#ffffff', brilho: 0.8, papel: 'cabeca' },
    { t: [0.09, 0.11, 0.02], p: [0.12, 1.54, 0.31], cor: '#151020', papel: 'cabeca' },
    { t: [0.09, 0.11, 0.02], p: [-0.16, 1.54, 0.31], cor: '#151020', papel: 'cabeca' },
    { t: [0.08, 0.08, 0.02], p: [0, 1.34, 0.29], cor: '#ff9ac0', papel: 'cabeca' },
    // bracinhos
    {
      t: [0.12, 0.3, 0.12],
      p: [0.34, 1.06, 0.06],
      cor: '#3e3478',
      brilho: 0.3,
      alfa: 0.92,
      papel: 'perna0',
    },
    {
      t: [0.12, 0.3, 0.12],
      p: [-0.34, 1.06, 0.06],
      cor: '#3e3478',
      brilho: 0.3,
      alfa: 0.92,
      papel: 'perna1',
    },
  ],
  raposa: [
    { t: [0.34, 0.28, 0.56], p: [0, 0.4, 0], cor: '#c8d2e0' },
    { t: [0.2, 0.04, 0.36], p: [0, 0.555, -0.02], cor: '#5af0d0', brilho: 1 },
    { t: [0.36, 0.06, 0.6], p: [0, 0.28, 0], cor: '#8a96aa' },
    { t: [0.32, 0.28, 0.3], p: [0, 0.64, 0.36], cor: '#dfe6f0', papel: 'cabeca' },
    { t: [0.26, 0.18, 0.02], p: [0, 0.64, 0.515], cor: '#1a2440', papel: 'cabeca' },
    { t: [0.06, 0.07, 0.01], p: [0.07, 0.67, 0.527], cor: '#5af0ff', brilho: 1.2, papel: 'cabeca' },
    {
      t: [0.06, 0.07, 0.01],
      p: [-0.07, 0.67, 0.527],
      cor: '#5af0ff',
      brilho: 1.2,
      papel: 'cabeca',
    },
    { t: [0.1, 0.025, 0.01], p: [0, 0.59, 0.527], cor: '#5af0ff', brilho: 1.2, papel: 'cabeca' },
    { t: [0.06, 0.16, 0.12], p: [0.19, 0.7, 0.34], cor: '#ff9a4a', papel: 'cabeca' },
    { t: [0.06, 0.16, 0.12], p: [-0.19, 0.7, 0.34], cor: '#ff9a4a', papel: 'cabeca' },
    { t: [0.03, 0.16, 0.03], p: [0.08, 0.86, 0.32], cor: '#8a96aa', papel: 'antena' },
    { t: [0.07, 0.07, 0.07], p: [0.08, 0.96, 0.32], cor: '#ff5a7a', brilho: 1.1, papel: 'antena' },
    { t: [0.05, 0.05, 0.24], p: [0, 0.5, -0.38], cor: '#8a96aa', papel: 'cauda' },
    { t: [0.08, 0.08, 0.08], p: [0, 0.5, -0.52], cor: '#ff9a4a', brilho: 0.6, papel: 'cauda' },
    { t: [0.09, 0.26, 0.09], p: [0.11, 0.13, 0.18], cor: '#6a7488', papel: 'perna0' },
    { t: [0.09, 0.26, 0.09], p: [-0.11, 0.13, 0.18], cor: '#6a7488', papel: 'perna1' },
    { t: [0.09, 0.26, 0.09], p: [0.11, 0.13, -0.18], cor: '#6a7488', papel: 'perna1' },
    { t: [0.09, 0.26, 0.09], p: [-0.11, 0.13, -0.18], cor: '#6a7488', papel: 'perna0' },
  ],
};

export const MOVIMENTO_PLANETA: Record<TipoCriatura, MovimentoCriatura> = {
  // a lesma desliza gingando; a pulga pula alto; a sombrinha boia no ar
  cervo: { saltita: 0, flutua: 0, ginga: 0.12 },
  coelho: { saltita: 0.3, flutua: 0, ginga: 0 },
  peixe: { saltita: 0, flutua: 0.06, ginga: 0 },
  espectro: { saltita: 0, flutua: 0.16, ginga: 0.08 },
  raposa: { saltita: 0.03, flutua: 0, ginga: 0.04 },
};

/** Vozes: lesma faz "uuu?", pulga faz "boing", sombrinha dá risadinhas e o robô bipa. */
export const VOZES_PLANETA: Record<TipoCriatura, VozCriatura> = {
  cervo: {
    chamado: {
      onda: 'sine',
      de: 300,
      ate: 430,
      dur: 0.45,
      repeticoes: 1,
      intervalo: 0,
      vibrato: 5,
      ruido: 0.1,
    },
    susto: { onda: 'triangle', de: 520, ate: 720, dur: 0.16, repeticoes: 2, intervalo: 0.08 },
    contente: {
      onda: 'sine',
      de: 380,
      ate: 470,
      dur: 0.1,
      repeticoes: 3,
      intervalo: 0.06,
      ganho: 0.7,
    },
  },
  coelho: {
    chamado: {
      onda: 'triangle',
      de: 1300,
      ate: 2500,
      dur: 0.05,
      repeticoes: 3,
      intervalo: 0.07,
      ganho: 0.5,
    },
    susto: {
      onda: 'sine',
      de: 2400,
      ate: 1200,
      dur: 0.15,
      repeticoes: 1,
      intervalo: 0,
      ganho: 0.7,
    },
    contente: {
      onda: 'sine',
      de: 900,
      ate: 1800,
      dur: 0.08,
      repeticoes: 2,
      intervalo: 0.1,
      vibrato: 9,
      ganho: 0.5,
    },
  },
  peixe: {
    chamado: {
      onda: 'sine',
      de: 700,
      ate: 1100,
      dur: 0.2,
      repeticoes: 1,
      intervalo: 0,
      vibrato: 8,
      ganho: 0.4,
    },
    susto: {
      onda: 'sine',
      de: 1200,
      ate: 2000,
      dur: 0.06,
      repeticoes: 3,
      intervalo: 0.05,
      ganho: 0.5,
    },
    contente: {
      onda: 'sine',
      de: 500,
      ate: 800,
      dur: 0.25,
      repeticoes: 1,
      intervalo: 0,
      vibrato: 5,
      ganho: 0.4,
    },
  },
  espectro: {
    chamado: {
      onda: 'sine',
      de: 500,
      ate: 660,
      dur: 0.3,
      repeticoes: 2,
      intervalo: 0.12,
      vibrato: 6,
      ganho: 0.55,
    },
    susto: {
      onda: 'triangle',
      de: 700,
      ate: 1500,
      dur: 0.2,
      repeticoes: 1,
      intervalo: 0,
      vibrato: 14,
      ganho: 0.7,
    },
    contente: {
      onda: 'sine',
      de: 620,
      ate: 900,
      dur: 0.1,
      repeticoes: 4,
      intervalo: 0.06,
      ganho: 0.5,
    },
  },
  raposa: {
    chamado: {
      onda: 'square',
      de: 880,
      ate: 1320,
      dur: 0.07,
      repeticoes: 2,
      intervalo: 0.1,
      ganho: 0.35,
    },
    susto: {
      onda: 'square',
      de: 1500,
      ate: 600,
      dur: 0.18,
      repeticoes: 1,
      intervalo: 0,
      ruido: 0.1,
      ganho: 0.35,
    },
    contente: {
      onda: 'triangle',
      de: 1000,
      ate: 1500,
      dur: 0.06,
      repeticoes: 4,
      intervalo: 0.05,
      ganho: 0.6,
    },
  },
};
