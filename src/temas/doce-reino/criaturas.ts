import type { TipoCriatura } from '../../jogo/criaturas';
import type { MovimentoCriatura, PecaCriatura } from '../tipos';

type V3 = [number, number, number];

/** Par espelhado em x (olhos, orelhas, bochechas, patas): a inclinação também espelha. */
function par(x: number, peca: Omit<PecaCriatura, 'p'> & { p: [number, number] }): PecaCriatura[] {
  const [y, z] = peca.p;
  return [1, -1].map((s) => ({
    ...peca,
    p: [x * s, y, z] as V3,
    rot: peca.rot ? ([peca.rot[0], peca.rot[1] * s, peca.rot[2] * s] as V3) : undefined,
  }));
}

/**
 * Olho de bolinha de brinquedo: bolinha escura achatada e um pontinho branco de brilho na
 * frente-cima (sempre do mesmo lado, como a luz batendo), igual ao boneco do jogador.
 */
function olhos(
  x: number,
  y: number,
  z: number,
  tam: V3,
  opcoes: { cor?: string; brilho?: number; luz?: number; papel?: PecaCriatura['papel'] } = {},
): PecaCriatura[] {
  const papel = 'papel' in opcoes ? opcoes.papel : 'cabeca';
  const ponto = tam[0] * 0.36;
  return [1, -1].flatMap((s) => [
    {
      t: tam,
      p: [x * s, y, z] as V3,
      cor: opcoes.cor ?? '#2a1622',
      brilho: opcoes.brilho ?? 0.35,
      forma: 'bola' as const,
      papel,
    },
    {
      t: [ponto, ponto, ponto * 0.6] as V3,
      p: [x * s + tam[0] * 0.2, y + tam[1] * 0.24, z + tam[2] * 0.42] as V3,
      cor: '#ffffff',
      brilho: opcoes.luz ?? 0.25,
      forma: 'bola' as const,
      papel,
    },
  ]);
}

/**
 * Criaturas do Doce Reino (mesmas caixas de colisão do jogo base), desenhadas à mão como
 * brinquedo de plástico (spec 012): cabeção, olhos de bolinha com brilho, bochechas rosadas,
 * patinhas de cápsula. Ovelha de marshmallow, coelho de gelatina, peixe-bala, fantasminha de
 * alcaçuz (bobinho e assustadiço) e cãozinho de biscoito (o companheiro).
 */
export const CRIATURAS_DOCE: Record<TipoCriatura, PecaCriatura[]> = {
  // ovelha de marshmallow: corpo de travesseiro fofo com o topo tostadinho, carinha rosa de
  // morango, topete de marshmallow e patinhas de chocolate
  cervo: [
    { t: [0.7, 0.5, 0.82], p: [0, 0.62, -0.06], cor: '#fbf4ee', forma: 'caixa', raio: 0.22 },
    // tufos de cima tostadinhos (marshmallow na fogueira)
    ...par(0.14, { t: [0.3, 0.2, 0.32], p: [0.86, 0.08], cor: '#f3cf98', forma: 'bola' }),
    ...par(0.14, { t: [0.3, 0.2, 0.32], p: [0.85, -0.24], cor: '#f3cf98', forma: 'bola' }),
    // tufinhos de marshmallow nos lados
    ...par(0.33, { t: [0.16, 0.26, 0.3], p: [0.64, 0.12], cor: '#fffaf6', forma: 'bola' }),
    ...par(0.33, { t: [0.16, 0.24, 0.28], p: [0.62, -0.24], cor: '#fffaf6', forma: 'bola' }),
    // cabeção rosa de morango
    {
      t: [0.5, 0.46, 0.42],
      p: [0, 0.96, 0.44],
      cor: '#f592ba',
      forma: 'caixa',
      raio: 0.15,
      papel: 'cabeca',
    },
    {
      t: [0.38, 0.16, 0.3],
      p: [0, 1.19, 0.42],
      cor: '#fffaf6',
      forma: 'bola',
      papel: 'cabeca',
    },
    ...par(0.29, {
      t: [0.2, 0.09, 0.13],
      p: [1.02, 0.4],
      cor: '#ec7aa4',
      forma: 'bola',
      rot: [0, 0, -0.45],
      papel: 'cabeca',
    }),
    ...olhos(0.11, 0.99, 0.655, [0.1, 0.12, 0.05]),
    ...par(0.18, {
      t: [0.09, 0.05, 0.03],
      p: [0.9, 0.655],
      cor: '#ff5c95',
      forma: 'bola',
      papel: 'cabeca',
    }),
    { t: [0.2, 0.12, 0.08], p: [0, 0.87, 0.665], cor: '#fff0f4', forma: 'bola', papel: 'cabeca' },
    { t: [0.07, 0.045, 0.04], p: [0, 0.9, 0.705], cor: '#c0406a', forma: 'bola', papel: 'cabeca' },
    // patinhas de chocolate (diagonais alternam)
    {
      t: [0.16, 0.44, 0.16],
      p: [0.2, 0.22, 0.24],
      cor: '#4a2414',
      forma: 'capsula',
      papel: 'perna0',
    },
    {
      t: [0.16, 0.44, 0.16],
      p: [-0.2, 0.22, 0.24],
      cor: '#4a2414',
      forma: 'capsula',
      papel: 'perna1',
    },
    {
      t: [0.16, 0.44, 0.16],
      p: [0.2, 0.22, -0.32],
      cor: '#4a2414',
      forma: 'capsula',
      papel: 'perna1',
    },
    {
      t: [0.16, 0.44, 0.16],
      p: [-0.2, 0.22, -0.32],
      cor: '#4a2414',
      forma: 'capsula',
      papel: 'perna0',
    },
    { t: [0.2, 0.2, 0.16], p: [0, 0.74, -0.5], cor: '#f8a8c4', forma: 'bola', papel: 'cauda' },
  ],
  // coelho de gelatina de morango: vermelho brilhante (pontinho de brilho de gelatina na
  // barriga), orelhonas com o miolo rosa e um chantilly de rabo
  coelho: [
    { t: [0.34, 0.3, 0.36], p: [0, 0.2, -0.03], cor: '#ff3a64', forma: 'bola' },
    { t: [0.07, 0.05, 0.03], p: [0.1, 0.27, 0.12], cor: '#ffd6e0', forma: 'bola' },
    { t: [0.36, 0.32, 0.32], p: [0, 0.44, 0.12], cor: '#ff4a72', forma: 'bola', papel: 'cabeca' },
    ...par(0.075, {
      t: [0.09, 0.28, 0.06],
      p: [0.71, 0.08],
      cor: '#ff4a72',
      forma: 'capsula',
      rot: [-0.15, 0, -0.18],
      papel: 'cabeca',
    }),
    ...par(0.075, {
      t: [0.045, 0.18, 0.02],
      p: [0.7, 0.115],
      cor: '#ffc0d0',
      forma: 'capsula',
      rot: [-0.15, 0, -0.18],
      papel: 'cabeca',
    }),
    ...olhos(0.08, 0.465, 0.27, [0.08, 0.095, 0.04]),
    ...par(0.12, {
      t: [0.07, 0.04, 0.03],
      p: [0.4, 0.235],
      cor: '#ff9ab4',
      forma: 'bola',
      papel: 'cabeca',
    }),
    { t: [0.12, 0.08, 0.06], p: [0, 0.39, 0.26], cor: '#ffc4d2', forma: 'bola', papel: 'cabeca' },
    { t: [0.05, 0.035, 0.03], p: [0, 0.415, 0.29], cor: '#c4143c', forma: 'bola', papel: 'cabeca' },
    { t: [0.15, 0.14, 0.13], p: [0, 0.24, -0.21], cor: '#fffaf4', forma: 'bola', papel: 'cauda' },
    // pezões de trás e mãozinhas da frente (diagonais alternam)
    {
      t: [0.1, 0.1, 0.18],
      p: [0.1, 0.05, -0.06],
      cor: '#e8284e',
      forma: 'capsula',
      papel: 'perna0',
    },
    {
      t: [0.1, 0.1, 0.18],
      p: [-0.1, 0.05, -0.06],
      cor: '#e8284e',
      forma: 'capsula',
      papel: 'perna1',
    },
    {
      t: [0.08, 0.1, 0.08],
      p: [0.08, 0.05, 0.1],
      cor: '#e8284e',
      forma: 'capsula',
      papel: 'perna1',
    },
    {
      t: [0.08, 0.1, 0.08],
      p: [-0.08, 0.05, 0.1],
      cor: '#e8284e',
      forma: 'capsula',
      papel: 'perna0',
    },
  ],
  // peixe-bala: bala de goma amarela gordinha, barriga de limão, barbatanas e rabo laranja
  peixe: [
    { t: [0.2, 0.24, 0.36], p: [0, 0.16, 0], cor: '#ffd23a', forma: 'bola' },
    { t: [0.15, 0.12, 0.26], p: [0, 0.1, 0.02], cor: '#fff0a0', forma: 'bola' },
    { t: [0.05, 0.24, 0.16], p: [0, 0.16, -0.24], cor: '#ff6a2a', forma: 'bola', papel: 'cauda' },
    { t: [0.04, 0.1, 0.16], p: [0, 0.27, -0.03], cor: '#ff6a2a', forma: 'bola', rot: [-0.3, 0, 0] },
    ...par(0.1, {
      t: [0.03, 0.06, 0.1],
      p: [0.11, 0.03],
      cor: '#ff8a3a',
      forma: 'bola',
      rot: [0, 0.5, 0],
    }),
    ...olhos(0.085, 0.19, 0.095, [0.045, 0.09, 0.085], { papel: undefined }),
    ...par(0.075, { t: [0.02, 0.035, 0.05], p: [0.13, 0.12], cor: '#ff8a9a', forma: 'bola' }),
    { t: [0.05, 0.04, 0.03], p: [0, 0.14, 0.175], cor: '#ff6a2a', forma: 'bola' },
  ],
  // fantasminha de alcaçuz de uva: plástico lilás clarinho que brilha no escuro, cabeção
  // redondo, olhinhos brilhantes, boquinha de "oh", bracinhos e anteninha de bala
  espectro: [
    { t: [0.62, 0.78, 0.52], p: [0, 0.9, 0], cor: '#d6bcf6', forma: 'bola' },
    {
      t: [0.76, 0.3, 0.58],
      p: [0, 0.5, 0],
      cor: '#d6bcf6',
      forma: 'bola',
      papel: 'cauda',
    },
    ...[-0.22, 0, 0.22].map(
      (x): PecaCriatura => ({
        t: [0.27, 0.27, 0.48],
        p: [x, 0.36, 0],
        cor: x === 0 ? '#e6d4fd' : '#c4a2f2',
        forma: 'bola',
        papel: 'cauda',
      }),
    ),
    {
      t: [0.76, 0.68, 0.62],
      p: [0, 1.48, 0.02],
      cor: '#e2cffb',
      forma: 'bola',
      papel: 'cabeca',
    },
    ...olhos(0.15, 1.5, 0.29, [0.14, 0.18, 0.08], { cor: '#3a1f5c', brilho: 0.4, luz: 0.55 }),
    ...par(0.25, {
      t: [0.12, 0.06, 0.04],
      p: [1.39, 0.22],
      cor: '#ffa6cf',
      forma: 'bola',
      papel: 'cabeca',
    }),
    { t: [0.08, 0.1, 0.04], p: [0, 1.34, 0.3], cor: '#7a3a8e', forma: 'bola', papel: 'cabeca' },
    { t: [0.05, 0.2, 0.05], p: [0, 1.9, 0.02], cor: '#9a6ac8', forma: 'capsula', papel: 'antena' },
    {
      t: [0.13, 0.13, 0.13],
      p: [0, 2.03, 0.02],
      cor: '#ff8ad0',
      brilho: 0.55,
      forma: 'bola',
      papel: 'antena',
    },
    {
      t: [0.14, 0.28, 0.14],
      p: [0.33, 0.96, 0.06],
      cor: '#d6bcf6',
      forma: 'capsula',
      rot: [0, 0, 0.5],
      papel: 'perna0',
    },
    {
      t: [0.14, 0.28, 0.14],
      p: [-0.33, 0.96, 0.06],
      cor: '#d6bcf6',
      forma: 'capsula',
      rot: [0, 0, -0.5],
      papel: 'perna1',
    },
  ],
  // cãozinho de biscoito: corpo de bolacha com furinhos, orelhas caídas de chocolate,
  // focinho de creme e coleira de glacê com plaquinha
  raposa: [
    { t: [0.38, 0.3, 0.54], p: [0, 0.4, -0.04], cor: '#d9a35b', forma: 'caixa', raio: 0.12 },
    ...par(0.19, { t: [0.02, 0.045, 0.045], p: [0.43, 0.08], cor: '#9a6430', forma: 'bola' }),
    ...par(0.19, { t: [0.02, 0.045, 0.045], p: [0.4, -0.14], cor: '#9a6430', forma: 'bola' }),
    { t: [0.22, 0.05, 0.22], p: [0, 0.55, -0.1], cor: '#7a4a1e', forma: 'bola' },
    { t: [0.32, 0.08, 0.16], p: [0, 0.53, 0.2], cor: '#ff6a9a', forma: 'caixa', raio: 0.04 },
    { t: [0.07, 0.07, 0.03], p: [0, 0.48, 0.28], cor: '#ffe06a', forma: 'bola' },
    {
      t: [0.42, 0.36, 0.36],
      p: [0, 0.71, 0.33],
      cor: '#dba45c',
      forma: 'caixa',
      raio: 0.14,
      papel: 'cabeca',
    },
    ...par(0.23, {
      t: [0.1, 0.24, 0.15],
      p: [0.68, 0.3],
      cor: '#5a3220',
      forma: 'bola',
      rot: [0, 0, 0.3],
      papel: 'cabeca',
    }),
    ...olhos(0.095, 0.76, 0.51, [0.075, 0.085, 0.04]),
    ...par(0.15, {
      t: [0.07, 0.04, 0.03],
      p: [0.66, 0.49],
      cor: '#ff8aa0',
      forma: 'bola',
      papel: 'cabeca',
    }),
    { t: [0.2, 0.13, 0.12], p: [0, 0.64, 0.51], cor: '#f4d8a8', forma: 'bola', papel: 'cabeca' },
    { t: [0.08, 0.06, 0.05], p: [0, 0.68, 0.57], cor: '#3a2014', forma: 'bola', papel: 'cabeca' },
    { t: [0.05, 0.03, 0.04], p: [0, 0.59, 0.55], cor: '#ff5a8a', forma: 'bola', papel: 'cabeca' },
    {
      t: [0.09, 0.09, 0.26],
      p: [0, 0.53, -0.38],
      cor: '#d9a35b',
      forma: 'capsula',
      rot: [0.6, 0, 0],
      papel: 'cauda',
    },
    // patinhas de biscoito (diagonais alternam)
    {
      t: [0.13, 0.3, 0.13],
      p: [0.11, 0.15, 0.14],
      cor: '#c4863f',
      forma: 'capsula',
      papel: 'perna0',
    },
    {
      t: [0.13, 0.3, 0.13],
      p: [-0.11, 0.15, 0.14],
      cor: '#c4863f',
      forma: 'capsula',
      papel: 'perna1',
    },
    {
      t: [0.13, 0.3, 0.13],
      p: [0.11, 0.15, -0.2],
      cor: '#c4863f',
      forma: 'capsula',
      papel: 'perna1',
    },
    {
      t: [0.13, 0.3, 0.13],
      p: [-0.11, 0.15, -0.2],
      cor: '#c4863f',
      forma: 'capsula',
      papel: 'perna0',
    },
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
