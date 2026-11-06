import type { TipoCriatura } from '../../jogo/criaturas';
import type { MovimentoCriatura, PecaCriatura, VozCriatura } from '../tipos';

/**
 * Bichos da Era dos Dinos, todos filhotes e de olhos grandes:
 * pescoçudo (saurópode verdinho com placas laranja), lagartixa-pula-pula (com gola
 * colorida), peixe-couraça (cabeça de bronze), morcegossauro (pterossauro vesgo e
 * medroso) e raptorzinho (de penugem azul e topete laranja).
 */
export const CRIATURAS_DINOS: Record<TipoCriatura, PecaCriatura[]> = {
  cervo: [
    { t: [0.6, 0.5, 0.95], p: [0, 0.82, -0.05], cor: '#7ab05a' },
    { t: [0.5, 0.14, 0.8], p: [0, 0.56, -0.05], cor: '#e8dcae' },
    // placas nas costas
    { t: [0.12, 0.24, 0.18], p: [0, 1.16, 0.22], cor: '#f0a040' },
    { t: [0.12, 0.3, 0.2], p: [0, 1.18, -0.06], cor: '#f0a040' },
    { t: [0.12, 0.22, 0.18], p: [0, 1.14, -0.34], cor: '#f0a040' },
    // manchinhas
    { t: [0.62, 0.12, 0.14], p: [0, 0.92, 0.1], cor: '#5e9446' },
    { t: [0.62, 0.12, 0.14], p: [0, 0.88, -0.3], cor: '#5e9446' },
    // pescoço comprido
    { t: [0.26, 0.4, 0.26], p: [0, 1.14, 0.42], cor: '#7ab05a' },
    { t: [0.22, 0.4, 0.22], p: [0, 1.48, 0.56], cor: '#7ab05a' },
    { t: [0.2, 0.3, 0.2], p: [0, 1.78, 0.66], cor: '#7ab05a' },
    // cabeça
    { t: [0.3, 0.24, 0.36], p: [0, 2.02, 0.78], cor: '#86bc64', papel: 'cabeca' },
    { t: [0.22, 0.14, 0.14], p: [0, 1.96, 0.99], cor: '#a8d080', papel: 'cabeca' },
    { t: [0.06, 0.08, 0.08], p: [0.16, 2.08, 0.86], cor: '#ffffff', papel: 'cabeca' },
    { t: [0.06, 0.08, 0.08], p: [-0.16, 2.08, 0.86], cor: '#ffffff', papel: 'cabeca' },
    { t: [0.04, 0.05, 0.05], p: [0.18, 2.07, 0.89], cor: '#1a1410', papel: 'cabeca' },
    { t: [0.04, 0.05, 0.05], p: [-0.18, 2.07, 0.89], cor: '#1a1410', papel: 'cabeca' },
    { t: [0.04, 0.04, 0.08], p: [0.15, 1.96, 0.94], cor: '#f08a9a', papel: 'cabeca' },
    { t: [0.04, 0.04, 0.08], p: [-0.15, 1.96, 0.94], cor: '#f08a9a', papel: 'cabeca' },
    // pernas grossas
    { t: [0.2, 0.58, 0.2], p: [0.2, 0.29, 0.3], cor: '#5e9446', papel: 'perna0' },
    { t: [0.2, 0.58, 0.2], p: [-0.2, 0.29, 0.3], cor: '#5e9446', papel: 'perna1' },
    { t: [0.2, 0.58, 0.2], p: [0.2, 0.29, -0.36], cor: '#5e9446', papel: 'perna1' },
    { t: [0.2, 0.58, 0.2], p: [-0.2, 0.29, -0.36], cor: '#5e9446', papel: 'perna0' },
    // cauda comprida
    { t: [0.22, 0.22, 0.5], p: [0, 0.86, -0.7], cor: '#7ab05a', papel: 'cauda' },
    { t: [0.12, 0.12, 0.42], p: [0, 0.8, -1.12], cor: '#86bc64', papel: 'cauda' },
  ],
  coelho: [
    { t: [0.26, 0.2, 0.4], p: [0, 0.22, 0], cor: '#3fb0a0' },
    { t: [0.1, 0.04, 0.38], p: [0, 0.33, -0.01], cor: '#ffd23a' },
    { t: [0.22, 0.18, 0.22], p: [0, 0.34, 0.28], cor: '#4cc0ae', papel: 'cabeca' },
    // gola colorida em volta do pescoço
    { t: [0.44, 0.28, 0.04], p: [0, 0.38, 0.17], cor: '#ff7a5a', papel: 'cabeca' },
    { t: [0.3, 0.06, 0.05], p: [0, 0.5, 0.17], cor: '#ffd23a', papel: 'cabeca' },
    { t: [0.06, 0.07, 0.06], p: [0.09, 0.4, 0.37], cor: '#ffffff', papel: 'cabeca' },
    { t: [0.06, 0.07, 0.06], p: [-0.09, 0.4, 0.37], cor: '#ffffff', papel: 'cabeca' },
    { t: [0.04, 0.05, 0.03], p: [0.1, 0.4, 0.405], cor: '#111111', papel: 'cabeca' },
    { t: [0.04, 0.05, 0.03], p: [-0.1, 0.4, 0.405], cor: '#111111', papel: 'cabeca' },
    { t: [0.08, 0.08, 0.4], p: [0, 0.2, -0.38], cor: '#3fb0a0', papel: 'cauda' },
    { t: [0.05, 0.05, 0.2], p: [0, 0.18, -0.66], cor: '#ffd23a', papel: 'cauda' },
    // patas de trás fortes (pula-pula) e da frente pequenas
    { t: [0.1, 0.14, 0.2], p: [0.15, 0.07, -0.1], cor: '#2e9080', papel: 'perna0' },
    { t: [0.1, 0.14, 0.2], p: [-0.15, 0.07, -0.1], cor: '#2e9080', papel: 'perna1' },
    { t: [0.06, 0.12, 0.06], p: [0.12, 0.06, 0.14], cor: '#2e9080', papel: 'perna1' },
    { t: [0.06, 0.12, 0.06], p: [-0.12, 0.06, 0.14], cor: '#2e9080', papel: 'perna0' },
  ],
  peixe: [
    { t: [0.16, 0.22, 0.36], p: [0, 0.15, -0.03], cor: '#5f8a9a' },
    { t: [0.14, 0.06, 0.3], p: [0, 0.05, -0.02], cor: '#d8e4e0' },
    // couraça de bronze na cabeça e crista nas costas
    { t: [0.2, 0.26, 0.18], p: [0, 0.16, 0.2], cor: '#c0904a' },
    { t: [0.05, 0.07, 0.3], p: [0, 0.29, -0.02], cor: '#9a6e36' },
    { t: [0.04, 0.07, 0.07], p: [0.11, 0.2, 0.24], cor: '#ffffff' },
    { t: [0.04, 0.07, 0.07], p: [-0.11, 0.2, 0.24], cor: '#ffffff' },
    { t: [0.03, 0.04, 0.04], p: [0.125, 0.2, 0.255], cor: '#111111' },
    { t: [0.03, 0.04, 0.04], p: [-0.125, 0.2, 0.255], cor: '#111111' },
    { t: [0.28, 0.03, 0.1], p: [0, 0.09, 0.06], cor: '#ffa848' },
    { t: [0.04, 0.22, 0.16], p: [0, 0.15, -0.27], cor: '#ffa848', papel: 'cauda' },
  ],
  espectro: [
    { t: [0.3, 0.36, 0.34], p: [0, 1.2, 0], cor: '#8a6aa8' },
    { t: [0.22, 0.26, 0.06], p: [0, 1.18, 0.17], cor: '#ecdcc0' },
    // cabeça com crista, bico e olhos esbugalhados (meio vesgos)
    { t: [0.32, 0.28, 0.3], p: [0, 1.52, 0.08], cor: '#9a7ab8', papel: 'cabeca' },
    { t: [0.08, 0.24, 0.3], p: [0, 1.74, -0.12], cor: '#ff8a4a', papel: 'cabeca' },
    { t: [0.12, 0.08, 0.26], p: [0, 1.45, 0.34], cor: '#ffc44a', papel: 'cabeca' },
    {
      t: [0.13, 0.14, 0.06],
      p: [0.08, 1.6, 0.24],
      cor: '#ffffff',
      brilho: 0.5,
      papel: 'cabeca',
    },
    {
      t: [0.13, 0.14, 0.06],
      p: [-0.08, 1.6, 0.24],
      cor: '#ffffff',
      brilho: 0.5,
      papel: 'cabeca',
    },
    { t: [0.05, 0.06, 0.03], p: [0.05, 1.58, 0.28], cor: '#1a1410', papel: 'cabeca' },
    { t: [0.05, 0.06, 0.03], p: [-0.05, 1.58, 0.28], cor: '#1a1410', papel: 'cabeca' },
    { t: [0.05, 0.04, 0.03], p: [0.13, 1.47, 0.235], cor: '#f08aa0', papel: 'cabeca' },
    { t: [0.05, 0.04, 0.03], p: [-0.13, 1.47, 0.235], cor: '#f08aa0', papel: 'cabeca' },
    // asas de pele e o dedo comprido na borda
    { t: [0.62, 0.05, 0.42], p: [0.46, 1.3, -0.02], cor: '#c49ad8', alfa: 0.92, papel: 'asa0' },
    { t: [0.62, 0.05, 0.42], p: [-0.46, 1.3, -0.02], cor: '#c49ad8', alfa: 0.92, papel: 'asa1' },
    { t: [0.62, 0.07, 0.06], p: [0.46, 1.32, 0.19], cor: '#6a4a88', papel: 'asa0' },
    { t: [0.62, 0.07, 0.06], p: [-0.46, 1.32, 0.19], cor: '#6a4a88', papel: 'asa1' },
    // pezinhos pendurados e cauda com ponta de losango
    { t: [0.06, 0.1, 0.06], p: [0.08, 0.98, -0.02], cor: '#ffc44a' },
    { t: [0.06, 0.1, 0.06], p: [-0.08, 0.98, -0.02], cor: '#ffc44a' },
    { t: [0.05, 0.05, 0.3], p: [0, 1.1, -0.3], cor: '#8a6aa8', papel: 'cauda' },
    { t: [0.14, 0.14, 0.04], p: [0, 1.1, -0.46], cor: '#ff8a4a', papel: 'cauda' },
  ],
  raposa: [
    { t: [0.28, 0.28, 0.44], p: [0, 0.46, 0], cor: '#3aa0c8' },
    { t: [0.2, 0.14, 0.36], p: [0, 0.36, 0.05], cor: '#f3e6c8' },
    { t: [0.2, 0.03, 0.1], p: [0, 0.61, -0.06], cor: '#2a78a0' },
    { t: [0.16, 0.2, 0.14], p: [0, 0.62, 0.2], cor: '#3aa0c8' },
    // cabeça redondinha, focinho, olhos grandes e bochechas rosadas
    { t: [0.26, 0.24, 0.28], p: [0, 0.8, 0.3], cor: '#44acd4', papel: 'cabeca' },
    { t: [0.2, 0.13, 0.16], p: [0, 0.75, 0.5], cor: '#5cbce0', papel: 'cabeca' },
    { t: [0.12, 0.02, 0.02], p: [0, 0.705, 0.585], cor: '#1a3a4a', papel: 'cabeca' },
    { t: [0.08, 0.09, 0.06], p: [0.09, 0.86, 0.43], cor: '#ffffff', papel: 'cabeca' },
    { t: [0.08, 0.09, 0.06], p: [-0.09, 0.86, 0.43], cor: '#ffffff', papel: 'cabeca' },
    { t: [0.05, 0.07, 0.03], p: [0.09, 0.855, 0.465], cor: '#111111', papel: 'cabeca' },
    { t: [0.05, 0.07, 0.03], p: [-0.09, 0.855, 0.465], cor: '#111111', papel: 'cabeca' },
    { t: [0.05, 0.04, 0.03], p: [0.12, 0.77, 0.445], cor: '#ff9aaa', papel: 'cabeca' },
    { t: [0.05, 0.04, 0.03], p: [-0.12, 0.77, 0.445], cor: '#ff9aaa', papel: 'cabeca' },
    // topete de penas
    { t: [0.06, 0.16, 0.18], p: [0, 1.0, 0.26], cor: '#ff8a3a', papel: 'cabeca' },
    { t: [0.06, 0.12, 0.12], p: [0, 0.97, 0.12], cor: '#ffd23a', papel: 'cabeca' },
    // bracinhos com penugem
    { t: [0.05, 0.12, 0.06], p: [0.15, 0.5, 0.22], cor: '#2a88b0' },
    { t: [0.05, 0.12, 0.06], p: [-0.15, 0.5, 0.22], cor: '#2a88b0' },
    { t: [0.03, 0.1, 0.12], p: [0.175, 0.5, 0.15], cor: '#ff8a3a' },
    { t: [0.03, 0.1, 0.12], p: [-0.175, 0.5, 0.15], cor: '#ff8a3a' },
    // cauda com leque de penas
    { t: [0.16, 0.16, 0.4], p: [0, 0.52, -0.38], cor: '#3aa0c8', papel: 'cauda' },
    { t: [0.22, 0.18, 0.18], p: [0, 0.54, -0.64], cor: '#ff8a3a', papel: 'cauda' },
    { t: [0.12, 0.12, 0.1], p: [0, 0.55, -0.77], cor: '#ffd23a', papel: 'cauda' },
    // duas pernas (anda como passarinho)
    { t: [0.11, 0.34, 0.13], p: [0.1, 0.17, -0.02], cor: '#2a88b0', papel: 'perna0' },
    { t: [0.11, 0.34, 0.13], p: [-0.1, 0.17, -0.02], cor: '#2a88b0', papel: 'perna1' },
  ],
};

export const MOVIMENTO_DINOS: Record<TipoCriatura, MovimentoCriatura> = {
  cervo: { saltita: 0, flutua: 0, ginga: 0.08 },
  coelho: { saltita: 0.16, flutua: 0, ginga: 0.04 },
  peixe: { saltita: 0, flutua: 0, ginga: 0.14 },
  espectro: { saltita: 0, flutua: 0.14, ginga: 0.12 },
  raposa: { saltita: 0.05, flutua: 0, ginga: 0.14 },
};

/** Vozes: buzina grave do pescoçudo, cricris da lagartixa, guinchos do morcegossauro. */
export const VOZES_DINOS: Record<TipoCriatura, VozCriatura> = {
  cervo: {
    chamado: {
      onda: 'triangle',
      de: 200,
      ate: 150,
      dur: 0.7,
      repeticoes: 1,
      intervalo: 0,
      vibrato: 4,
      ruido: 0.2,
    },
    susto: {
      onda: 'triangle',
      de: 340,
      ate: 230,
      dur: 0.22,
      repeticoes: 2,
      intervalo: 0.1,
      ruido: 0.25,
    },
    contente: {
      onda: 'sine',
      de: 180,
      ate: 230,
      dur: 0.4,
      repeticoes: 2,
      intervalo: 0.15,
      vibrato: 5,
    },
  },
  coelho: {
    chamado: {
      onda: 'triangle',
      de: 1200,
      ate: 1600,
      dur: 0.05,
      repeticoes: 3,
      intervalo: 0.06,
      ganho: 0.5,
    },
    susto: {
      onda: 'triangle',
      de: 1900,
      ate: 1100,
      dur: 0.1,
      repeticoes: 1,
      intervalo: 0,
      ruido: 0.2,
      ganho: 0.7,
    },
    contente: {
      onda: 'sine',
      de: 1100,
      ate: 1400,
      dur: 0.05,
      repeticoes: 2,
      intervalo: 0.08,
      ganho: 0.5,
    },
  },
  peixe: {
    chamado: {
      onda: 'sine',
      de: 300,
      ate: 720,
      dur: 0.06,
      repeticoes: 2,
      intervalo: 0.12,
      ganho: 0.5,
    },
    susto: {
      onda: 'sine',
      de: 500,
      ate: 1000,
      dur: 0.05,
      repeticoes: 3,
      intervalo: 0.05,
      ganho: 0.6,
    },
    contente: {
      onda: 'sine',
      de: 360,
      ate: 600,
      dur: 0.07,
      repeticoes: 1,
      intervalo: 0,
      ganho: 0.5,
    },
  },
  espectro: {
    chamado: {
      onda: 'sine',
      de: 900,
      ate: 1300,
      dur: 0.12,
      repeticoes: 2,
      intervalo: 0.1,
      vibrato: 12,
      ganho: 0.6,
    },
    susto: {
      // "uiiii!": um guincho que despenca, de desenho animado
      onda: 'triangle',
      de: 1600,
      ate: 600,
      dur: 0.4,
      repeticoes: 1,
      intervalo: 0,
      vibrato: 14,
      ganho: 0.7,
    },
    contente: {
      onda: 'sine',
      de: 700,
      ate: 820,
      dur: 0.06,
      repeticoes: 3,
      intervalo: 0.05,
      vibrato: 8,
      ganho: 0.5,
    },
  },
  raposa: {
    chamado: {
      onda: 'sine',
      de: 1000,
      ate: 1500,
      dur: 0.07,
      repeticoes: 3,
      intervalo: 0.07,
      vibrato: 10,
      ganho: 0.7,
    },
    susto: {
      onda: 'triangle',
      de: 1600,
      ate: 900,
      dur: 0.14,
      repeticoes: 1,
      intervalo: 0,
      ruido: 0.15,
    },
    contente: {
      onda: 'sine',
      de: 800,
      ate: 1100,
      dur: 0.14,
      repeticoes: 2,
      intervalo: 0.1,
      vibrato: 9,
      ganho: 0.7,
    },
  },
};
