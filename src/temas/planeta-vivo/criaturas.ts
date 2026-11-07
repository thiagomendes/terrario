import type { TipoCriatura } from '../../jogo/criaturas';
import type { MovimentoCriatura, PecaCriatura, VozCriatura } from '../tipos';

/**
 * Criaturas do Planeta Vivo, desenhadas à mão como brinquedo (spec 012) — mesmas caixas de
 * colisão do jogo, pés em y=0 e frente para +z:
 *  - lesma-pastora (cervo): sola gordinha, concha espiral laranja e olhões de bolinha nas antenas;
 *  - pulga-bola (coelho): bolinha fofa rosa com topete, pernas de mola e anteninhas de luz;
 *  - água-viva lilás (peixe): sino de plástico com luzinha no topo, carinha e tentáculos de bala;
 *  - sombrinha curiosa (espectro): fantasminha pastel com chapéu de guarda-chuva e olhinhos que
 *    brilham no escuro (brinquedo de brilhar, nunca vulto);
 *  - robô-cão (raposa): caixinha branca com tela de rosto sorridente, orelhas laranja e antena.
 */

type V3 = [number, number, number];
type Extra = Pick<PecaCriatura, 'brilho' | 'papel' | 'raio' | 'rot'>;

const bola = (t: V3, p: V3, cor: string, extra: Extra = {}): PecaCriatura => ({
  t,
  p,
  cor,
  forma: 'bola',
  ...extra,
});
const capsula = (t: V3, p: V3, cor: string, extra: Extra = {}): PecaCriatura => ({
  t,
  p,
  cor,
  forma: 'capsula',
  ...extra,
});
const caixa = (t: V3, p: V3, cor: string, extra: Extra = {}): PecaCriatura => ({
  t,
  p,
  cor,
  forma: 'caixa',
  ...extra,
});

/** z da superfície da frente de uma bola (centro c, tamanho t) no ponto (x, y). */
const naFrente = (c: V3, t: V3, x: number, y: number) => {
  const nx = (2 * (x - c[0])) / t[0];
  const ny = (2 * (y - c[1])) / t[1];
  return c[2] + (t[2] / 2) * Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
};

/** Par de olhos de bolinha escuros, cada um com o pontinho branco de brilho na frente-cima. */
function olhos(
  x: number,
  y: number,
  z: number,
  larg: number,
  alt: number,
  extra: Extra = {},
  cor = '#231a28',
  brilhoPonto = 0.3,
): PecaCriatura[] {
  return [1, -1].flatMap((s) => [
    bola([larg, alt, larg * 0.6], [s * x, y, z], cor, extra),
    bola(
      [larg * 0.38, larg * 0.38, larg * 0.2],
      [s * x + larg * 0.18, y + alt * 0.22, z + larg * 0.26],
      '#ffffff',
      { ...extra, brilho: brilhoPonto },
    ),
  ]);
}

/** Par de bochechas rosadas (bolinhas achatadas). */
const bochechas = (
  x: number,
  y: number,
  z: number,
  tam: number,
  extra: Extra = {},
  cor = '#ff8fb0',
) => [1, -1].map((s) => bola([tam, tam * 0.6, tam * 0.35], [s * x, y, z], cor, extra));

// ---- medidas de apoio (cabeças em bola, para pôr a carinha bem na superfície) ----
const LESMA_CAB: V3 = [0.56, 0.52, 0.52];
const LESMA_CAB_P: V3 = [0, 0.82, 0.5];
const PULGA: V3 = [0.52, 0.5, 0.5];
const PULGA_P: V3 = [0, 0.42, -0.02];
const SINO: V3 = [0.48, 0.36, 0.46];
const SINO_P: V3 = [0, 0.37, 0];
const SOMBRA_CAB: V3 = [0.66, 0.56, 0.6];
const SOMBRA_CAB_P: V3 = [0, 1.44, 0];

const cab = { papel: 'cabeca' } as const;

export const CRIATURAS_PLANETA: Record<TipoCriatura, PecaCriatura[]> = {
  cervo: [
    // sola gordinha e corpo de lesma
    capsula([0.54, 0.16, 1.16], [0, 0.09, -0.02], '#2fb898'),
    bola([0.5, 0.4, 1.16], [0, 0.26, -0.04], '#4fd8b8'),
    // concha espiral: bola laranja com anéis amarelo e lilás saindo dos lados
    bola([0.5, 0.68, 0.72], [0, 0.76, -0.2], '#ff7a3a'),
    bola([0.56, 0.46, 0.5], [0, 0.78, -0.2], '#ffc23a'),
    bola([0.6, 0.2, 0.22], [0, 0.8, -0.2], '#a86cff'),
    // pescoço curto entrando no corpo e na cabeça, e o cabeção
    capsula([0.34, 0.38, 0.32], [0, 0.48, 0.4], '#4fd8b8'),
    bola(LESMA_CAB, LESMA_CAB_P, '#62e6c8', cab),
    ...bochechas(0.17, 0.76, naFrente(LESMA_CAB_P, LESMA_CAB, 0.17, 0.76) - 0.01, 0.11, cab),
    bola([0.06, 0.045, 0.04], [0, 0.8, naFrente(LESMA_CAB_P, LESMA_CAB, 0, 0.8)], '#1f8a72', cab),
    capsula(
      [0.1, 0.03, 0.03],
      [0, 0.73, naFrente(LESMA_CAB_P, LESMA_CAB, 0, 0.73)],
      '#b8305a',
      cab,
    ),
    // antenas (base dentro da cabeça) com olhões de bolinha na ponta
    ...[1, -1].map((s) =>
      capsula([0.07, 0.38, 0.07], [s * 0.12, 1.2, 0.52], '#4fd8b8', {
        papel: 'antena',
        rot: [0, 0, -s * 0.15],
      }),
    ),
    ...olhos(0.15, 1.42, 0.53, 0.16, 0.18, { papel: 'antena' }),
    // pezinhos ondulantes da sola (topo dentro da sola)
    capsula([0.18, 0.12, 0.26], [0.22, 0.06, 0.34], '#1f9a80', { papel: 'perna0' }),
    capsula([0.18, 0.12, 0.26], [-0.22, 0.06, 0.34], '#1f9a80', { papel: 'perna1' }),
    capsula([0.18, 0.12, 0.26], [0.22, 0.06, -0.34], '#1f9a80', { papel: 'perna1' }),
    capsula([0.18, 0.12, 0.26], [-0.22, 0.06, -0.34], '#1f9a80', { papel: 'perna0' }),
  ],
  coelho: [
    // a pulga é uma bola só (corpo e cara), com topete fofo em cima
    bola(PULGA, PULGA_P, '#ff6fb8'),
    bola([0.16, 0.11, 0.15], [0, 0.68, 0.02], '#ff9ad0'),
    bola([0.13, 0.09, 0.13], [0.08, 0.66, -0.07], '#ffc8e6'),
    bola([0.13, 0.09, 0.13], [-0.08, 0.66, -0.07], '#ffc8e6'),
    // carinha
    ...olhos(0.1, 0.47, naFrente(PULGA_P, PULGA, 0.1, 0.47) - 0.01, 0.12, 0.14, cab),
    ...bochechas(0.18, 0.37, naFrente(PULGA_P, PULGA, 0.18, 0.37) - 0.01, 0.1, cab, '#ff6fa0'),
    bola([0.07, 0.05, 0.05], [0, 0.39, naFrente(PULGA_P, PULGA, 0, 0.39)], '#c0407a', cab),
    capsula([0.07, 0.025, 0.02], [0, 0.335, naFrente(PULGA_P, PULGA, 0, 0.335)], '#7a2050', cab),
    // anteninhas com luz amarela na ponta
    ...[1, -1].flatMap((s) => [
      capsula([0.035, 0.24, 0.035], [s * 0.1, 0.76, 0.06], '#ff6fb8', {
        papel: 'antena',
        rot: [0, 0, -s * 0.25],
      }),
      bola([0.1, 0.1, 0.1], [s * 0.13, 0.89, 0.06], '#ffe27a', { brilho: 0.55, papel: 'antena' }),
    ]),
    // pernas de mola gordinhas e pompom de rabo
    capsula([0.15, 0.28, 0.19], [0.15, 0.14, 0.02], '#d8509e', { papel: 'perna0' }),
    capsula([0.15, 0.28, 0.19], [-0.15, 0.14, 0.02], '#d8509e', { papel: 'perna1' }),
    bola([0.13, 0.13, 0.13], [0, 0.44, -0.28], '#ffc8e6', { papel: 'cauda' }),
  ],
  peixe: [
    // sino de plástico lilás com saia clara e luzinha no topo
    bola(SINO, SINO_P, '#b07aff'),
    bola([0.5, 0.07, 0.48], [0, 0.23, 0], '#d58cff'),
    bola([0.14, 0.08, 0.14], [0, 0.54, 0], '#7af7e0', { brilho: 0.5 }),
    // carinha
    ...olhos(0.095, 0.38, naFrente(SINO_P, SINO, 0.095, 0.38) - 0.01, 0.1, 0.12),
    ...bochechas(0.16, 0.32, naFrente(SINO_P, SINO, 0.16, 0.32) - 0.01, 0.08),
    bola([0.05, 0.04, 0.03], [0, 0.3, naFrente(SINO_P, SINO, 0, 0.3)], '#c0407a'),
    // tentáculos de bala com pontinhas de luz
    ...[
      [0.13, 0.12],
      [-0.13, 0.12],
      [0.13, -0.12],
      [-0.13, -0.12],
    ].flatMap(([x, z]) => [
      capsula([0.08, 0.24, 0.08], [x, 0.13, z], '#ff5ab8', { papel: 'cauda' }),
      bola([0.09, 0.09, 0.09], [x, 0.045, z], '#5af0ff', { brilho: 0.5, papel: 'cauda' }),
    ]),
  ],
  espectro: [
    // corpinho pastel com saia ondulada (boia no ar)
    bola([0.5, 0.46, 0.46], [0, 1.0, 0], '#cfc6ff'),
    bola([0.56, 0.16, 0.5], [0, 0.8, 0], '#e2dbff', { papel: 'cauda' }),
    bola([0.16, 0.14, 0.16], [0.17, 0.73, 0.12], '#e2dbff', { papel: 'cauda' }),
    bola([0.16, 0.14, 0.16], [-0.17, 0.73, 0.12], '#e2dbff', { papel: 'cauda' }),
    bola([0.16, 0.14, 0.16], [0, 0.72, -0.18], '#e2dbff', { papel: 'cauda' }),
    // bracinhos
    capsula([0.13, 0.26, 0.13], [0.29, 1.02, 0.06], '#cfc6ff', {
      papel: 'perna0',
      rot: [0, 0, 0.5],
    }),
    capsula([0.13, 0.26, 0.13], [-0.29, 1.02, 0.06], '#cfc6ff', {
      papel: 'perna1',
      rot: [0, 0, -0.5],
    }),
    // cabeção com olhinhos que brilham no escuro, bochechas e boquinha de "oh!"
    bola(SOMBRA_CAB, SOMBRA_CAB_P, '#ddd6ff', cab),
    ...olhos(
      0.14,
      1.47,
      naFrente(SOMBRA_CAB_P, SOMBRA_CAB, 0.14, 1.47) - 0.01,
      0.15,
      0.19,
      { ...cab, brilho: 0.5 },
      '#4a3aa8',
      0.55,
    ),
    ...bochechas(0.22, 1.36, naFrente(SOMBRA_CAB_P, SOMBRA_CAB, 0.22, 1.36) - 0.01, 0.12, cab),
    bola(
      [0.07, 0.08, 0.04],
      [0, 1.31, naFrente(SOMBRA_CAB_P, SOMBRA_CAB, 0, 1.31)],
      '#ff7aa8',
      cab,
    ),
    // chapéu de guarda-chuva em cúpula, com bolinhas de luz e pontinha amarela
    bola([0.98, 0.08, 0.94], [0, 1.68, 0], '#ff6fc0', cab),
    bola([0.86, 0.38, 0.82], [0, 1.74, 0], '#ff9ad2', cab),
    bola([0.46, 0.24, 0.44], [0, 1.9, 0], '#ff6fc0', cab),
    capsula([0.035, 0.1, 0.035], [0, 2.03, 0], '#ff9ad6', cab),
    bola([0.1, 0.1, 0.1], [0, 2.1, 0], '#ffe27a', { ...cab, brilho: 0.55 }),
    bola([0.07, 0.05, 0.07], [0, 1.84, 0.34], '#fff2a0', { ...cab, brilho: 0.5 }),
    bola([0.07, 0.05, 0.07], [0.33, 1.82, 0.2], '#fff2a0', { ...cab, brilho: 0.5 }),
    bola([0.07, 0.05, 0.07], [-0.33, 1.82, 0.2], '#fff2a0', { ...cab, brilho: 0.5 }),
  ],
  raposa: [
    // corpo de caixinha branca com faixa de luz e coleira laranja
    caixa([0.42, 0.3, 0.6], [0, 0.38, -0.04], '#e8eef8', { raio: 0.12 }),
    capsula([0.2, 0.05, 0.36], [0, 0.53, -0.08], '#5af0d0', { brilho: 0.4 }),
    capsula([0.38, 0.08, 0.16], [0, 0.52, 0.2], '#ff9a4a'),
    // cabeça com tela de rosto sorridente
    caixa([0.46, 0.38, 0.38], [0, 0.7, 0.3], '#f2f5fb', { ...cab, raio: 0.13 }),
    caixa([0.36, 0.26, 0.05], [0, 0.7, 0.495], '#1f2a50', { ...cab, raio: 0.07 }),
    ...olhos(0.08, 0.72, 0.52, 0.09, 0.11, { ...cab, brilho: 0.55 }, '#5af0ff', 0.4),
    capsula([0.1, 0.025, 0.02], [0, 0.635, 0.525], '#5af0ff', { ...cab, brilho: 0.5 }),
    ...bochechas(0.135, 0.655, 0.522, 0.05, { ...cab, brilho: 0.4 }, '#ff8fc0'),
    // orelhas de plástico laranja
    ...[1, -1].map((s) =>
      capsula([0.09, 0.2, 0.13], [s * 0.21, 0.9, 0.28], '#ff9a4a', {
        ...cab,
        rot: [0, 0, -s * 0.35],
      }),
    ),
    // antena com luzinha
    capsula([0.035, 0.16, 0.035], [0.08, 0.96, 0.24], '#8fa4e8', { papel: 'antena' }),
    bola([0.09, 0.09, 0.09], [0.08, 1.06, 0.24], '#ff5a7a', { brilho: 0.55, papel: 'antena' }),
    // rabinho levantado com bolinha laranja
    capsula([0.08, 0.08, 0.24], [0, 0.52, -0.38], '#8fa4e8', { papel: 'cauda', rot: [0.5, 0, 0] }),
    bola([0.11, 0.11, 0.11], [0, 0.58, -0.5], '#ff9a4a', { brilho: 0.4, papel: 'cauda' }),
    // patinhas de cápsula (as diagonais alternam)
    capsula([0.13, 0.3, 0.13], [0.13, 0.15, 0.18], '#8fa4e8', { papel: 'perna0' }),
    capsula([0.13, 0.3, 0.13], [-0.13, 0.15, 0.18], '#8fa4e8', { papel: 'perna1' }),
    capsula([0.13, 0.3, 0.13], [0.13, 0.15, -0.18], '#8fa4e8', { papel: 'perna1' }),
    capsula([0.13, 0.3, 0.13], [-0.13, 0.15, -0.18], '#8fa4e8', { papel: 'perna0' }),
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
