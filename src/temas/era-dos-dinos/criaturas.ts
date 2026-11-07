import type { TipoCriatura } from '../../jogo/criaturas';
import type { MovimentoCriatura, PecaCriatura, VozCriatura } from '../tipos';

type Papel = PecaCriatura['papel'];

/** Peça em bola (elipsoide do tamanho t). */
const bola = (
  t: PecaCriatura['t'],
  p: PecaCriatura['p'],
  cor: string,
  extra: Partial<PecaCriatura> = {},
): PecaCriatura => ({ t, p, cor, forma: 'bola', ...extra });

/** Peça em cápsula (pontas bem redondas: patas, pescoço, rabo). */
const capsula = (
  t: PecaCriatura['t'],
  p: PecaCriatura['p'],
  cor: string,
  extra: Partial<PecaCriatura> = {},
): PecaCriatura => ({ t, p, cor, forma: 'capsula', ...extra });

/** A peça e o seu espelho no outro lado (x trocado, inclinação em y e z trocada). */
const par = (peca: PecaCriatura, papelDoOutro: Papel = peca.papel): PecaCriatura[] => [
  peca,
  {
    ...peca,
    p: [-peca.p[0], peca.p[1], peca.p[2]],
    ...(peca.rot ? { rot: [peca.rot[0], -peca.rot[1], -peca.rot[2]] } : {}),
    ...(papelDoOutro ? { papel: papelDoOutro } : {}),
  },
];

/**
 * Rosto de brinquedo, igual ao do boneco: olhos de bolinha escuros com um pontinho branco de
 * brilho na frente-cima e bochechas rosadas. `x`, `y`, `z` são do olho do lado +x; `tam` é a
 * largura do olho; as bochechas ficam um pouco abaixo e para fora.
 */
const rosto = (
  x: number,
  y: number,
  z: number,
  tam: number,
  bochecha: [number, number, number],
  olho = '#231a28',
): PecaCriatura[] => [
  ...par(bola([tam, tam * 1.2, tam * 0.6], [x, y, z], olho, { papel: 'cabeca' })),
  ...par(
    bola(
      [tam * 0.36, tam * 0.36, tam * 0.24],
      [x + tam * 0.14, y + tam * 0.24, z + tam * 0.27],
      '#ffffff',
      { brilho: 0.55, papel: 'cabeca' },
    ),
  ),
  ...par(bola([tam * 0.75, tam * 0.45, tam * 0.35], bochecha, '#ff9db4', { papel: 'cabeca' })),
];

/**
 * Bichos da Era dos Dinos, filhotes de brinquedo desenhados à mão (spec 012): cabeção, olhos de
 * bolinha com brilho, bochechas rosadas, patas de cápsula curtas e grossas:
 * pescoçudo (saurópode verdinho com placas laranja), lagartixa-pula-pula (com gola
 * colorida), peixe-couraça (cabeça de bronze), morcegossauro (pterossauro pastel e medroso,
 * de olhinhos que brilham no escuro) e raptorzinho (de penugem azul e topete laranja).
 */
export const CRIATURAS_DINOS: Record<TipoCriatura, PecaCriatura[]> = {
  // pescoçudo: corpão de bola, pescoço curto e grosso de cápsula, cabeção de filhote
  cervo: [
    bola([0.82, 0.7, 1.1], [0, 0.77, -0.06], '#7cc35a'),
    bola([0.62, 0.48, 0.86], [0, 0.65, 0.12], '#f4e8b4'),
    // placas laranja nas costas
    bola([0.14, 0.3, 0.26], [0, 1.17, 0.14], '#ff9a30'),
    bola([0.14, 0.32, 0.28], [0, 1.17, -0.16], '#ff9a30'),
    bola([0.13, 0.26, 0.24], [0, 1.07, -0.44], '#ff9a30'),
    // manchinhas verde-escuras dos lados
    ...par(bola([0.1, 0.2, 0.26], [0.37, 0.85, -0.2], '#5ea844')),
    // pescoço e cabeça
    capsula([0.33, 0.8, 0.33], [0, 1.32, 0.5], '#7cc35a', { rot: [0.25, 0, 0] }),
    bola([0.62, 0.56, 0.6], [0, 1.82, 0.66], '#86cc64', { papel: 'cabeca' }),
    bola([0.1, 0.14, 0.14], [0, 2.1, 0.6], '#ff9a30', { papel: 'cabeca' }),
    bola([0.4, 0.3, 0.28], [0, 1.72, 0.88], '#9ad874', { papel: 'cabeca' }),
    ...par(bola([0.04, 0.03, 0.02], [0.07, 1.78, 1.02], '#3e7a2e', { papel: 'cabeca' })),
    ...rosto(0.15, 1.88, 0.9, 0.14, [0.23, 1.76, 0.84]),
    // patas grossas (as diagonais andam juntas)
    capsula([0.3, 0.64, 0.3], [0.2, 0.32, 0.3], '#5ea844', { papel: 'perna0' }),
    capsula([0.3, 0.64, 0.3], [-0.2, 0.32, 0.3], '#5ea844', { papel: 'perna1' }),
    capsula([0.3, 0.64, 0.3], [0.2, 0.32, -0.4], '#5ea844', { papel: 'perna1' }),
    capsula([0.3, 0.64, 0.3], [-0.2, 0.32, -0.4], '#5ea844', { papel: 'perna0' }),
    // cauda comprida e gordinha
    capsula([0.3, 0.3, 0.6], [0, 0.75, -0.78], '#7cc35a', { papel: 'cauda', rot: [0.2, 0, 0] }),
    bola([0.2, 0.2, 0.34], [0, 0.69, -1.1], '#86cc64', { papel: 'cauda' }),
  ],
  // lagartixa-pula-pula: cabeção com a gola aberta atrás, patas de trás fortes
  coelho: [
    bola([0.32, 0.28, 0.44], [0, 0.22, -0.03], '#3fc0aa'),
    bola([0.24, 0.18, 0.32], [0, 0.17, 0.02], '#fff0a0'),
    capsula([0.07, 0.05, 0.3], [0, 0.355, -0.08], '#ffd23a'),
    // gola colorida em volta da cabeça
    bola([0.56, 0.36, 0.05], [0, 0.38, 0.1], '#ff7a5a', { papel: 'cabeca' }),
    bola([0.44, 0.26, 0.06], [0, 0.38, 0.11], '#ffd23a', { papel: 'cabeca' }),
    bola([0.34, 0.3, 0.32], [0, 0.38, 0.22], '#4cd0b8', { papel: 'cabeca' }),
    bola([0.14, 0.09, 0.08], [0, 0.34, 0.36], '#7ae0c8', { papel: 'cabeca' }),
    ...rosto(0.075, 0.41, 0.355, 0.095, [0.115, 0.35, 0.33]),
    // rabo comprido com a ponta amarela
    capsula([0.1, 0.1, 0.42], [0, 0.18, -0.42], '#3fc0aa', { papel: 'cauda' }),
    bola([0.09, 0.09, 0.16], [0, 0.17, -0.66], '#ffd23a', { papel: 'cauda' }),
    // patas de trás fortes (pula-pula) e da frente pequenas
    capsula([0.12, 0.2, 0.18], [0.1, 0.1, -0.12], '#2ea890', { papel: 'perna0' }),
    capsula([0.12, 0.2, 0.18], [-0.1, 0.1, -0.12], '#2ea890', { papel: 'perna1' }),
    capsula([0.08, 0.15, 0.08], [0.08, 0.075, 0.09], '#2ea890', { papel: 'perna1' }),
    capsula([0.08, 0.15, 0.08], [-0.08, 0.075, 0.09], '#2ea890', { papel: 'perna0' }),
  ],
  // peixe-couraça: bolinha gorducha com capacete de bronze, barbatanas e rabo de dois lóbulos
  peixe: [
    bola([0.22, 0.26, 0.4], [0, 0.15, -0.04], '#4aa8d0'),
    bola([0.16, 0.12, 0.3], [0, 0.08, -0.01], '#f0f4e8'),
    bola([0.25, 0.27, 0.2], [0, 0.16, 0.14], '#e0a850'),
    capsula([0.04, 0.08, 0.24], [0, 0.29, -0.05], '#b07a36'),
    ...rosto(0.075, 0.19, 0.21, 0.065, [0.09, 0.12, 0.2]),
    bola([0.05, 0.035, 0.03], [0, 0.11, 0.235], '#c8506a'),
    ...par(bola([0.1, 0.03, 0.08], [0.12, 0.1, 0.02], '#ffa848', { rot: [0, 0, -0.5] })),
    bola([0.04, 0.15, 0.11], [0, 0.2, -0.27], '#ffa848', { papel: 'cauda', rot: [0.6, 0, 0] }),
    bola([0.04, 0.15, 0.11], [0, 0.1, -0.27], '#ffa848', { papel: 'cauda', rot: [-0.6, 0, 0] }),
  ],
  // morcegossauro: brinquedo pastel que brilha no escuro, cabeção, crista e asas de pele
  espectro: [
    bola([0.36, 0.4, 0.38], [0, 1.16, 0], '#d4bff6'),
    bola([0.26, 0.28, 0.2], [0, 1.13, 0.1], '#fff4e0'),
    bola([0.5, 0.46, 0.46], [0, 1.54, 0.06], '#dccaf9', { papel: 'cabeca' }),
    bola([0.07, 0.13, 0.44], [0, 1.76, -0.14], '#ffb894', { papel: 'cabeca', rot: [0.6, 0, 0] }),
    bola([0.08, 0.08, 0.08], [0, 1.89, -0.33], '#fff2a0', { papel: 'cabeca', brilho: 0.55 }),
    bola([0.16, 0.12, 0.24], [0, 1.46, 0.32], '#ffe08a', { papel: 'cabeca' }),
    ...rosto(0.11, 1.6, 0.26, 0.14, [0.17, 1.5, 0.22], '#3a2860'),
    // asas de pele (bolas achatadas) com o dedo comprido na borda da frente
    ...par(
      bola([0.7, 0.07, 0.42], [0.46, 1.3, -0.04], '#eedcfb', { papel: 'asa0', rot: [0, 0, 0.3] }),
      'asa1',
    ),
    ...par(
      bola([0.66, 0.07, 0.3], [0.44, 1.29, -0.18], '#eedcfb', { papel: 'asa0', rot: [0, 0, 0.3] }),
      'asa1',
    ),
    ...par(
      capsula([0.66, 0.08, 0.08], [0.44, 1.33, 0.16], '#c0a6ec', {
        papel: 'asa0',
        rot: [0, 0, 0.3],
      }),
      'asa1',
    ),
    // pezinhos pendurados e cauda com ponta de losango
    ...par(capsula([0.07, 0.11, 0.07], [0.08, 0.98, 0], '#ffe08a')),
    capsula([0.06, 0.06, 0.32], [0, 1.08, -0.3], '#d4bff6', { papel: 'cauda' }),
    {
      t: [0.12, 0.12, 0.04],
      p: [0, 1.08, -0.47],
      cor: '#ffb894',
      forma: 'caixa',
      raio: 0.02,
      rot: [0, 0, Math.PI / 4],
      papel: 'cauda',
    },
  ],
  // raptorzinho: anda em duas patas, cabeção redondo, topete e leque de penas no rabo
  raposa: [
    capsula([0.14, 0.34, 0.16], [0.1, 0.17, -0.02], '#2a88b0', { papel: 'perna0' }),
    capsula([0.14, 0.34, 0.16], [-0.1, 0.17, -0.02], '#2a88b0', { papel: 'perna1' }),
    bola([0.36, 0.4, 0.48], [0, 0.44, -0.02], '#3aaee0'),
    bola([0.26, 0.3, 0.32], [0, 0.42, 0.08], '#f6ead0'),
    // pescocinho que liga a cabeça ao corpo
    bola([0.22, 0.24, 0.22], [0, 0.62, 0.11], '#3aaee0'),
    bola([0.42, 0.38, 0.42], [0, 0.8, 0.16], '#48b8e8', { papel: 'cabeca' }),
    bola([0.26, 0.18, 0.2], [0, 0.73, 0.36], '#70cbf0', { papel: 'cabeca' }),
    ...rosto(0.1, 0.84, 0.34, 0.1, [0.15, 0.76, 0.3]),
    // topete de penas
    bola([0.08, 0.2, 0.16], [0, 1.0, 0.12], '#ff8a3a', { papel: 'cabeca', rot: [-0.3, 0, 0] }),
    bola([0.07, 0.14, 0.12], [0, 0.97, -0.0], '#ffd23a', { papel: 'cabeca', rot: [-0.5, 0, 0] }),
    // bracinhos com penugem
    ...par(capsula([0.07, 0.14, 0.07], [0.1, 0.5, 0.17], '#2a88b0', { rot: [0.5, 0, 0] })),
    ...par(bola([0.04, 0.1, 0.12], [0.13, 0.5, 0.11], '#ff8a3a')),
    // cauda com leque de penas
    capsula([0.18, 0.18, 0.4], [0, 0.5, -0.38], '#3aaee0', { papel: 'cauda' }),
    bola([0.26, 0.12, 0.24], [0, 0.52, -0.62], '#ff8a3a', { papel: 'cauda' }),
    bola([0.14, 0.08, 0.14], [0, 0.53, -0.76], '#ffd23a', { papel: 'cauda' }),
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
