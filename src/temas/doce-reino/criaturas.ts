import type { TipoCriatura } from '../../jogo/criaturas';
import type { MovimentoCriatura, PecaCriatura } from '../tipos';

/**
 * Criaturas do Doce Reino (mesmas caixas de colisão do jogo base):
 * ovelha de marshmallow, coelho de gelatina, peixe-bala, fantasminha de alcaçuz
 * (bobinho e assustadiço) e cãozinho de biscoito (o companheiro).
 */
export const CRIATURAS_DOCE: Record<TipoCriatura, PecaCriatura[]> = {
  // ovelha de marshmallow: corpo fofo de travesseiro, topo tostadinho, cara rosa de morango
  cervo: [
    { t: [0.66, 0.5, 0.92], p: [0, 0.66, 0], cor: '#fbf4ee' },
    { t: [0.52, 0.16, 0.74], p: [0, 0.97, -0.02], cor: '#f2cc92' },
    { t: [0.3, 0.26, 0.3], p: [0.2, 0.92, 0.3], cor: '#fffaf6' },
    { t: [0.3, 0.26, 0.3], p: [-0.2, 0.92, -0.28], cor: '#fffaf6' },
    { t: [0.34, 0.32, 0.3], p: [0, 0.9, 0.56], cor: '#f8a8c4', papel: 'cabeca' },
    { t: [0.36, 0.14, 0.2], p: [0, 1.1, 0.52], cor: '#fffaf6', papel: 'cabeca' },
    { t: [0.18, 0.08, 0.1], p: [0.25, 0.96, 0.5], cor: '#ec7aa4', papel: 'cabeca' },
    { t: [0.18, 0.08, 0.1], p: [-0.25, 0.96, 0.5], cor: '#ec7aa4', papel: 'cabeca' },
    { t: [0.07, 0.08, 0.04], p: [0.09, 0.94, 0.72], cor: '#2a1a22', papel: 'cabeca' },
    { t: [0.07, 0.08, 0.04], p: [-0.09, 0.94, 0.72], cor: '#2a1a22', papel: 'cabeca' },
    { t: [0.06, 0.04, 0.03], p: [0.13, 0.83, 0.715], cor: '#ff6a9a', papel: 'cabeca' },
    { t: [0.06, 0.04, 0.03], p: [-0.13, 0.83, 0.715], cor: '#ff6a9a', papel: 'cabeca' },
    { t: [0.13, 0.42, 0.13], p: [0.2, 0.21, 0.3], cor: '#6a3a22', papel: 'perna0' },
    { t: [0.13, 0.42, 0.13], p: [-0.2, 0.21, 0.3], cor: '#6a3a22', papel: 'perna1' },
    { t: [0.13, 0.42, 0.13], p: [0.2, 0.21, -0.3], cor: '#6a3a22', papel: 'perna1' },
    { t: [0.13, 0.42, 0.13], p: [-0.2, 0.21, -0.3], cor: '#6a3a22', papel: 'perna0' },
    { t: [0.18, 0.18, 0.14], p: [0, 0.8, -0.52], cor: '#f8a8c4', papel: 'cauda' },
  ],
  // coelho de gelatina de morango: translúcido, orelhas compridas e um chantilly de rabo
  coelho: [
    { t: [0.32, 0.28, 0.4], p: [0, 0.2, 0], cor: '#ff3a64', brilho: 0.25, alfa: 0.82 },
    {
      t: [0.26, 0.24, 0.26],
      p: [0, 0.4, 0.2],
      cor: '#ff4a72',
      brilho: 0.25,
      alfa: 0.85,
      papel: 'cabeca',
    },
    {
      t: [0.07, 0.28, 0.05],
      p: [0.07, 0.66, 0.16],
      cor: '#ff4a72',
      brilho: 0.25,
      alfa: 0.85,
      papel: 'cabeca',
    },
    {
      t: [0.07, 0.28, 0.05],
      p: [-0.07, 0.66, 0.16],
      cor: '#ff4a72',
      brilho: 0.25,
      alfa: 0.85,
      papel: 'cabeca',
    },
    { t: [0.03, 0.18, 0.02], p: [0.07, 0.66, 0.19], cor: '#ffd0dc', papel: 'cabeca' },
    { t: [0.03, 0.18, 0.02], p: [-0.07, 0.66, 0.19], cor: '#ffd0dc', papel: 'cabeca' },
    { t: [0.05, 0.05, 0.03], p: [0.07, 0.44, 0.33], cor: '#1a0c12', papel: 'cabeca' },
    { t: [0.05, 0.05, 0.03], p: [-0.07, 0.44, 0.33], cor: '#1a0c12', papel: 'cabeca' },
    { t: [0.04, 0.03, 0.03], p: [0, 0.38, 0.34], cor: '#ffffff', papel: 'cabeca' },
    { t: [0.08, 0.06, 0.06], p: [0.05, 0.25, 0.08], cor: '#ffb8c8', alfa: 0.9 },
    { t: [0.14, 0.12, 0.1], p: [0, 0.26, -0.24], cor: '#fffaf4', papel: 'cauda' },
    { t: [0.09, 0.1, 0.16], p: [0.1, 0.05, -0.06], cor: '#e8284e', alfa: 0.9, papel: 'perna0' },
    { t: [0.09, 0.1, 0.16], p: [-0.1, 0.05, -0.06], cor: '#e8284e', alfa: 0.9, papel: 'perna1' },
  ],
  // peixe-bala: bala de goma amarela com cauda e barbatana laranja e olho grande
  peixe: [
    { t: [0.13, 0.2, 0.36], p: [0, 0.15, 0], cor: '#ffd23a', brilho: 0.35 },
    { t: [0.14, 0.12, 0.08], p: [0, 0.15, 0.18], cor: '#ffe070', brilho: 0.35 },
    { t: [0.04, 0.2, 0.14], p: [0, 0.15, -0.24], cor: '#ff6a2a', brilho: 0.4, papel: 'cauda' },
    { t: [0.04, 0.07, 0.14], p: [0, 0.29, -0.02], cor: '#ff6a2a', brilho: 0.4 },
    { t: [0.15, 0.06, 0.06], p: [0, 0.19, 0.12], cor: '#ffffff' },
    { t: [0.16, 0.03, 0.03], p: [0, 0.19, 0.13], cor: '#1a1018' },
    { t: [0.14, 0.02, 0.1], p: [0, 0.09, 0.02], cor: '#ff8a3a' },
  ],
  // fantasminha de alcaçuz de uva: redondinho, olhos esbugalhados, boquinha de "oh"
  espectro: [
    { t: [0.62, 0.78, 0.5], p: [0, 0.9, 0], cor: '#6a3c8e', brilho: 0.35, alfa: 0.92 },
    {
      t: [0.7, 0.28, 0.56],
      p: [0, 0.42, 0],
      cor: '#7a4aa0',
      brilho: 0.35,
      alfa: 0.85,
      papel: 'cauda',
    },
    {
      t: [0.18, 0.14, 0.5],
      p: [-0.24, 0.22, 0],
      cor: '#7a4aa0',
      brilho: 0.35,
      alfa: 0.85,
      papel: 'cauda',
    },
    {
      t: [0.18, 0.14, 0.5],
      p: [0, 0.22, 0],
      cor: '#7a4aa0',
      brilho: 0.35,
      alfa: 0.85,
      papel: 'cauda',
    },
    {
      t: [0.18, 0.14, 0.5],
      p: [0.24, 0.22, 0],
      cor: '#7a4aa0',
      brilho: 0.35,
      alfa: 0.85,
      papel: 'cauda',
    },
    {
      t: [0.64, 0.54, 0.5],
      p: [0, 1.5, 0.02],
      cor: '#6a3c8e',
      brilho: 0.35,
      alfa: 0.95,
      papel: 'cabeca',
    },
    { t: [0.18, 0.18, 0.04], p: [0.13, 1.56, 0.27], cor: '#ffffff', brilho: 0.6, papel: 'cabeca' },
    { t: [0.18, 0.18, 0.04], p: [-0.13, 1.56, 0.27], cor: '#ffffff', brilho: 0.6, papel: 'cabeca' },
    { t: [0.08, 0.08, 0.03], p: [0.11, 1.53, 0.3], cor: '#1a1020', papel: 'cabeca' },
    { t: [0.08, 0.08, 0.03], p: [-0.15, 1.58, 0.3], cor: '#1a1020', papel: 'cabeca' },
    { t: [0.1, 0.1, 0.03], p: [0, 1.34, 0.27], cor: '#ff7ab4', brilho: 0.5, papel: 'cabeca' },
    { t: [0.1, 0.05, 0.03], p: [0.24, 1.4, 0.26], cor: '#ff9ac4', papel: 'cabeca' },
    { t: [0.1, 0.05, 0.03], p: [-0.24, 1.4, 0.26], cor: '#ff9ac4', papel: 'cabeca' },
    { t: [0.05, 0.22, 0.05], p: [0.06, 1.86, 0], cor: '#3a1e4c', papel: 'antena' },
    { t: [0.12, 0.12, 0.12], p: [0.06, 2.0, 0], cor: '#ff5ab0', brilho: 0.9, papel: 'antena' },
    {
      t: [0.12, 0.42, 0.12],
      p: [0.38, 1.0, 0.08],
      cor: '#6a3c8e',
      brilho: 0.35,
      alfa: 0.92,
      papel: 'perna0',
    },
    {
      t: [0.12, 0.42, 0.12],
      p: [-0.38, 1.0, 0.08],
      cor: '#6a3c8e',
      brilho: 0.35,
      alfa: 0.92,
      papel: 'perna1',
    },
  ],
  // cãozinho de biscoito: corpo de bolacha com furinhos, orelhas de chocolate e coleira de glacê
  raposa: [
    { t: [0.34, 0.3, 0.56], p: [0, 0.42, 0], cor: '#d9a35b' },
    { t: [0.04, 0.05, 0.05], p: [0.17, 0.46, 0.12], cor: '#7a4a1e' },
    { t: [0.04, 0.05, 0.05], p: [0.17, 0.4, -0.12], cor: '#7a4a1e' },
    { t: [0.04, 0.05, 0.05], p: [-0.17, 0.46, 0.12], cor: '#7a4a1e' },
    { t: [0.04, 0.05, 0.05], p: [-0.17, 0.4, -0.12], cor: '#7a4a1e' },
    { t: [0.32, 0.07, 0.08], p: [0, 0.58, 0.28], cor: '#ff6a9a' },
    { t: [0.32, 0.28, 0.28], p: [0, 0.68, 0.38], cor: '#e2b16a', papel: 'cabeca' },
    { t: [0.16, 0.1, 0.12], p: [0, 0.6, 0.56], cor: '#f4d8a8', papel: 'cabeca' },
    { t: [0.07, 0.05, 0.04], p: [0, 0.65, 0.63], cor: '#3a2014', papel: 'cabeca' },
    { t: [0.06, 0.03, 0.05], p: [0, 0.55, 0.6], cor: '#ff5a8a', papel: 'cabeca' },
    { t: [0.06, 0.18, 0.12], p: [0.18, 0.66, 0.36], cor: '#5a3220', papel: 'cabeca' },
    { t: [0.06, 0.18, 0.12], p: [-0.18, 0.66, 0.36], cor: '#5a3220', papel: 'cabeca' },
    { t: [0.06, 0.06, 0.03], p: [0.08, 0.73, 0.52], cor: '#1a1008', papel: 'cabeca' },
    { t: [0.06, 0.06, 0.03], p: [-0.08, 0.73, 0.52], cor: '#1a1008', papel: 'cabeca' },
    { t: [0.02, 0.02, 0.02], p: [0.07, 0.75, 0.54], cor: '#ffffff', papel: 'cabeca' },
    { t: [0.02, 0.02, 0.02], p: [-0.09, 0.75, 0.54], cor: '#ffffff', papel: 'cabeca' },
    { t: [0.1, 0.1, 0.3], p: [0, 0.52, -0.4], cor: '#d9a35b', papel: 'cauda' },
    { t: [0.12, 0.12, 0.08], p: [0, 0.54, -0.56], cor: '#fff6ee', papel: 'cauda' },
    { t: [0.1, 0.28, 0.1], p: [0.1, 0.14, 0.18], cor: '#c4863f', papel: 'perna0' },
    { t: [0.1, 0.28, 0.1], p: [-0.1, 0.14, 0.18], cor: '#c4863f', papel: 'perna1' },
    { t: [0.1, 0.28, 0.1], p: [0.1, 0.14, -0.18], cor: '#c4863f', papel: 'perna1' },
    { t: [0.1, 0.28, 0.1], p: [-0.1, 0.14, -0.18], cor: '#c4863f', papel: 'perna0' },
  ],
};

export const MOVIMENTO_DOCE: Record<TipoCriatura, MovimentoCriatura> = {
  // a ovelha de marshmallow balança fofinha
  cervo: { saltita: 0.03, flutua: 0, ginga: 0.1 },
  // o coelho de gelatina pula e treme de um lado a outro
  coelho: { saltita: 0.2, flutua: 0, ginga: 0.22 },
  peixe: { saltita: 0, flutua: 0, ginga: 0.12 },
  // o fantasminha boia e rebola, meio desajeitado
  espectro: { saltita: 0, flutua: 0.14, ginga: 0.18 },
  // o cãozinho trota com pulinhos alegres
  raposa: { saltita: 0.05, flutua: 0, ginga: 0.06 },
};
