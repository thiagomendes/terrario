import type { TipoCriatura } from '../../jogo/criaturas';
import type { MovimentoCriatura, PecaCriatura } from '../tipos';

/**
 * Criaturas da Lua, desenhadas à mão como brinquedo (spec 012): plástico branco de traje,
 * acentos fortes (laranja, azul-Terra, amarelo) e luzinhas ciano, para lerem bem contra o
 * chão cinza e o céu negro. Robôs ganham tela de rosto com olhos que brilham suave e
 * bochechas; os bichos, olhos de bolinha escuros com ponto de brilho.
 * Pés em y = 0, frente para +z; toda peça diz a forma (o modelo é usado como está).
 */
export const CRIATURAS_LUNARES: Record<TipoCriatura, PecaCriatura[]> = {
  // rover-pastor: carrinho branco gordinho em quatro rodas de bola, cabeção de tela com
  // carinha, fones laranja, antena de luz vermelha e painel solar azul nas costas
  cervo: [
    // chassi e faixa do traje
    { t: [0.66, 0.36, 0.9], p: [0, 0.48, 0], cor: '#eef0f4', forma: 'caixa', raio: 0.16 },
    { t: [0.7, 0.1, 0.94], p: [0, 0.36, 0], cor: '#f07a2a', forma: 'caixa', raio: 0.05 },
    // pescoço
    { t: [0.14, 0.28, 0.14], p: [0, 0.76, 0.3], cor: '#a8aeb8', forma: 'capsula' },
    // cabeção de tela
    {
      t: [0.62, 0.54, 0.46],
      p: [0, 1.12, 0.32],
      cor: '#f6f7fa',
      forma: 'caixa',
      raio: 0.2,
      papel: 'cabeca',
    },
    {
      t: [0.5, 0.38, 0.06],
      p: [0, 1.12, 0.55],
      cor: '#18243c',
      forma: 'caixa',
      raio: 0.12,
      papel: 'cabeca',
    },
    ...par({ t: [0.13, 0.16, 0.05], p: [0.12, 1.15, 0.585], cor: '#6ff0ff', brilho: 0.5 }),
    ...par({ t: [0.045, 0.045, 0.03], p: [0.09, 1.19, 0.61], cor: '#ffffff', brilho: 0.55 }),
    ...par({ t: [0.08, 0.045, 0.03], p: [0.2, 1.04, 0.585], cor: '#ff8ab8', brilho: 0.35 }),
    {
      t: [0.09, 0.03, 0.03],
      p: [0, 1.02, 0.585],
      cor: '#6ff0ff',
      brilho: 0.45,
      forma: 'capsula',
      papel: 'cabeca',
    },
    // fones laranja dos lados (as "orelhas")
    ...par({ t: [0.09, 0.2, 0.2], p: [0.33, 1.12, 0.32], cor: '#f07a2a' }),
    // antena com luz vermelha
    {
      t: [0.04, 0.3, 0.04],
      p: [0.17, 1.52, 0.28],
      cor: '#c8ccd4',
      forma: 'capsula',
      papel: 'antena',
    },
    {
      t: [0.11, 0.11, 0.11],
      p: [0.17, 1.69, 0.28],
      cor: '#ff4a4a',
      brilho: 0.5,
      forma: 'bola',
      papel: 'antena',
    },
    // painel solar inclinado nas costas, num mastro
    { t: [0.09, 0.24, 0.09], p: [0, 0.76, -0.24], cor: '#a8aeb8', forma: 'capsula' },
    {
      t: [0.76, 0.05, 0.46],
      p: [0, 0.9, -0.26],
      cor: '#2f6ae0',
      brilho: 0.2,
      forma: 'caixa',
      raio: 0.025,
      rot: [0.35, 0, 0],
      papel: 'cauda',
    },
    {
      t: [0.035, 0.065, 0.47],
      p: [0, 0.905, -0.26],
      cor: '#d8e2ff',
      forma: 'caixa',
      raio: 0.015,
      rot: [0.35, 0, 0],
      papel: 'cauda',
    },
    // rodas gordinhas e calotas amarelas
    ...[0.3, -0.3].flatMap((z) =>
      [0.37, -0.37].flatMap((x): PecaCriatura[] => [
        { t: [0.18, 0.34, 0.34], p: [x, 0.17, z], cor: '#3a3e4a', forma: 'bola', papel: 'roda' },
        {
          t: [0.06, 0.15, 0.15],
          p: [x * 1.24, 0.17, z],
          cor: '#ffcf3a',
          forma: 'bola',
          papel: 'roda',
        },
      ]),
    ),
  ],
  // coelho-lunar: branquinho de traje, mochila laranja e gola azul de capacete, orelhonas
  coelho: [
    { t: [0.32, 0.28, 0.36], p: [0, 0.2, -0.02], cor: '#f4f5fa', forma: 'bola' },
    {
      t: [0.2, 0.16, 0.1],
      p: [0, 0.25, -0.18],
      cor: '#f07a2a',
      forma: 'caixa',
      raio: 0.045,
    },
    { t: [0.3, 0.07, 0.28], p: [0, 0.33, 0.1], cor: '#5aa8ff', forma: 'bola' },
    { t: [0.34, 0.3, 0.3], p: [0, 0.47, 0.14], cor: '#f8f8fc', forma: 'bola', papel: 'cabeca' },
    // orelhas (por fora) e o rosa de dentro
    ...par(
      { t: [0.085, 0.28, 0.05], p: [0.07, 0.7, 0.1], cor: '#f8f8fc', rot: [-0.15, 0, -0.2] },
      'capsula',
    ),
    ...par(
      { t: [0.045, 0.2, 0.02], p: [0.072, 0.7, 0.124], cor: '#ffa8c8', rot: [-0.15, 0, -0.2] },
      'capsula',
    ),
    ...par({ t: [0.075, 0.09, 0.05], p: [0.075, 0.49, 0.28], cor: '#1a1a24' }),
    ...par({ t: [0.028, 0.028, 0.02], p: [0.062, 0.515, 0.305], cor: '#ffffff' }),
    ...par({ t: [0.06, 0.035, 0.025], p: [0.12, 0.44, 0.255], cor: '#ff9ab8' }),
    {
      t: [0.1, 0.06, 0.05],
      p: [0, 0.44, 0.285],
      cor: '#ffffff',
      forma: 'bola',
      papel: 'cabeca',
    },
    {
      t: [0.04, 0.03, 0.025],
      p: [0, 0.46, 0.31],
      cor: '#ff7aa8',
      forma: 'bola',
      papel: 'cabeca',
    },
    { t: [0.12, 0.12, 0.1], p: [0, 0.14, -0.19], cor: '#ffffff', forma: 'bola', papel: 'cauda' },
    // patas: traseiras grandes, dianteiras curtinhas (diagonais alternam)
    {
      t: [0.1, 0.14, 0.18],
      p: [0.1, 0.07, -0.06],
      cor: '#e2e6ee',
      forma: 'capsula',
      papel: 'perna0',
    },
    {
      t: [0.1, 0.14, 0.18],
      p: [-0.1, 0.07, -0.06],
      cor: '#e2e6ee',
      forma: 'capsula',
      papel: 'perna1',
    },
    {
      t: [0.075, 0.16, 0.075],
      p: [0.075, 0.08, 0.08],
      cor: '#e2e6ee',
      forma: 'capsula',
      papel: 'perna1',
    },
    {
      t: [0.075, 0.16, 0.075],
      p: [-0.075, 0.08, 0.08],
      cor: '#e2e6ee',
      forma: 'capsula',
      papel: 'perna0',
    },
  ],
  // peixe de gelo: bolotinha azul-gelo de barriga branca, olhões dos lados e rabo em V
  peixe: [
    { t: [0.2, 0.24, 0.38], p: [0, 0.15, 0], cor: '#56c2ff', forma: 'bola' },
    { t: [0.15, 0.13, 0.28], p: [0, 0.1, 0.03], cor: '#eafcff', forma: 'bola' },
    {
      t: [0.04, 0.16, 0.08],
      p: [0, 0.21, -0.24],
      cor: '#2f7fe8',
      forma: 'capsula',
      rot: [-0.6, 0, 0],
      papel: 'cauda',
    },
    {
      t: [0.04, 0.16, 0.08],
      p: [0, 0.1, -0.24],
      cor: '#2f7fe8',
      forma: 'capsula',
      rot: [0.6, 0, 0],
      papel: 'cauda',
    },
    {
      t: [0.03, 0.1, 0.13],
      p: [0, 0.28, -0.03],
      cor: '#2f7fe8',
      forma: 'bola',
      rot: [-0.3, 0, 0],
    },
    ...par(
      { t: [0.1, 0.03, 0.07], p: [0.11, 0.1, 0.04], cor: '#2f7fe8', rot: [0, 0, 0.4] },
      'bola',
      '',
    ),
    ...par({ t: [0.04, 0.08, 0.08], p: [0.085, 0.19, 0.1], cor: '#141826' }, 'bola', ''),
    ...par({ t: [0.02, 0.025, 0.025], p: [0.105, 0.205, 0.118], cor: '#ffffff' }, 'bola', ''),
    ...par({ t: [0.02, 0.03, 0.04], p: [0.078, 0.12, 0.14], cor: '#ff9ab8' }, 'bola', ''),
    { t: [0.05, 0.035, 0.03], p: [0, 0.14, 0.19], cor: '#ff8ab0', forma: 'bola' },
  ],
  // eco-sombra: bolota lilás de plástico que brilha no escuro, cabeção, olhinhos de menta
  // acesos, bochechas coradas e uma estrelinha amarela na antena
  espectro: [
    // barra da "saia" com bolinhas (balança devagar)
    {
      t: [0.6, 0.34, 0.54],
      p: [0, 0.42, 0],
      cor: '#b49cf8',
      forma: 'bola',
      papel: 'cauda',
    },
    ...[
      [0.18, 0.1],
      [-0.18, 0.1],
      [0, -0.16],
    ].map(
      ([x, z]): PecaCriatura => ({
        t: [0.22, 0.18, 0.22],
        p: [x, 0.3, z],
        cor: '#b49cf8',
        forma: 'bola',
        papel: 'cauda',
      }),
    ),
    { t: [0.66, 0.7, 0.6], p: [0, 0.8, 0], cor: '#9f80f2', forma: 'bola' },
    { t: [0.34, 0.36, 0.1], p: [0, 0.78, 0.26], cor: '#ffd6ee', forma: 'bola' },
    {
      t: [0.9, 0.8, 0.8],
      p: [0, 1.5, 0.04],
      cor: '#ae92f7',
      forma: 'bola',
      papel: 'cabeca',
    },
    ...par({ t: [0.2, 0.24, 0.08], p: [0.17, 1.54, 0.41], cor: '#8ff7e6', brilho: 0.55 }),
    ...par({ t: [0.13, 0.16, 0.04], p: [0.17, 1.53, 0.45], cor: '#2c2160' }),
    ...par({ t: [0.05, 0.05, 0.03], p: [0.13, 1.58, 0.47], cor: '#ffffff', brilho: 0.55 }),
    ...par({ t: [0.12, 0.06, 0.04], p: [0.3, 1.4, 0.33], cor: '#ffa8d0' }),
    { t: [0.08, 0.05, 0.03], p: [0, 1.37, 0.43], cor: '#8a5aa8', forma: 'bola', papel: 'cabeca' },
    {
      t: [0.05, 0.24, 0.05],
      p: [0, 2.0, 0.02],
      cor: '#9a7cf0',
      forma: 'capsula',
      papel: 'antena',
    },
    {
      t: [0.14, 0.14, 0.14],
      p: [0, 2.17, 0.02],
      cor: '#ffe28a',
      brilho: 0.55,
      forma: 'bola',
      papel: 'antena',
    },
    // bracinhos (balançam como pernas)
    {
      t: [0.14, 0.3, 0.14],
      p: [0.35, 0.86, 0.06],
      cor: '#9f80f2',
      forma: 'capsula',
      rot: [0, 0, 0.5],
      papel: 'perna0',
    },
    {
      t: [0.14, 0.3, 0.14],
      p: [-0.35, 0.86, 0.06],
      cor: '#9f80f2',
      forma: 'capsula',
      rot: [0, 0, -0.5],
      papel: 'perna1',
    },
  ],
  // robô-companheiro: cãozinho branco de tela no rosto (olhos ciano e sorriso), orelhas
  // laranja, antena de luz amarela e rabinho com luz ciano
  raposa: [
    { t: [0.36, 0.3, 0.5], p: [0, 0.4, -0.04], cor: '#f2f4f7', forma: 'caixa', raio: 0.14 },
    { t: [0.38, 0.07, 0.52], p: [0, 0.31, -0.04], cor: '#f07a2a', forma: 'caixa', raio: 0.035 },
    {
      t: [0.46, 0.38, 0.36],
      p: [0, 0.7, 0.26],
      cor: '#f6f7fa',
      forma: 'caixa',
      raio: 0.16,
      papel: 'cabeca',
    },
    {
      t: [0.36, 0.26, 0.05],
      p: [0, 0.7, 0.44],
      cor: '#1a2230',
      forma: 'caixa',
      raio: 0.09,
      papel: 'cabeca',
    },
    ...par({ t: [0.1, 0.12, 0.04], p: [0.08, 0.72, 0.47], cor: '#6ff0ff', brilho: 0.5 }),
    ...par({ t: [0.035, 0.035, 0.02], p: [0.058, 0.755, 0.49], cor: '#ffffff', brilho: 0.55 }),
    ...par({ t: [0.06, 0.035, 0.02], p: [0.14, 0.645, 0.47], cor: '#ff8ab8', brilho: 0.35 }),
    {
      t: [0.07, 0.024, 0.02],
      p: [0, 0.63, 0.47],
      cor: '#6ff0ff',
      brilho: 0.45,
      forma: 'capsula',
      papel: 'cabeca',
    },
    ...par(
      { t: [0.1, 0.17, 0.07], p: [0.17, 0.9, 0.24], cor: '#f07a2a', rot: [0, 0, -0.35] },
      'capsula',
    ),
    {
      t: [0.035, 0.16, 0.035],
      p: [0, 0.96, 0.24],
      cor: '#c8ccd4',
      forma: 'capsula',
      papel: 'antena',
    },
    {
      t: [0.085, 0.085, 0.085],
      p: [0, 1.05, 0.24],
      cor: '#ffcf3a',
      brilho: 0.5,
      forma: 'bola',
      papel: 'antena',
    },
    {
      t: [0.065, 0.065, 0.24],
      p: [0, 0.58, -0.32],
      cor: '#a8aeb8',
      forma: 'capsula',
      rot: [0.6, 0, 0],
      papel: 'cauda',
    },
    {
      t: [0.1, 0.1, 0.1],
      p: [0, 0.66, -0.43],
      cor: '#6ff0ff',
      brilho: 0.5,
      forma: 'bola',
      papel: 'cauda',
    },
    // patas curtas e grossas (diagonais alternam)
    {
      t: [0.15, 0.32, 0.15],
      p: [0.11, 0.16, 0.12],
      cor: '#a8aeb8',
      forma: 'capsula',
      papel: 'perna0',
    },
    {
      t: [0.15, 0.32, 0.15],
      p: [-0.11, 0.16, 0.12],
      cor: '#a8aeb8',
      forma: 'capsula',
      papel: 'perna1',
    },
    {
      t: [0.15, 0.32, 0.15],
      p: [0.11, 0.16, -0.18],
      cor: '#a8aeb8',
      forma: 'capsula',
      papel: 'perna1',
    },
    {
      t: [0.15, 0.32, 0.15],
      p: [-0.11, 0.16, -0.18],
      cor: '#a8aeb8',
      forma: 'capsula',
      papel: 'perna0',
    },
  ],
};

/**
 * Par espelhado de peças (olhos, bochechas, orelhas): a peça dada fica em +x e a cópia em
 * −x, com a inclinação em y e z invertida. Por padrão é bola de papel 'cabeca'
 * (papel '' = sem papel).
 */
function par(
  peca: Omit<PecaCriatura, 'forma' | 'papel'>,
  forma: PecaCriatura['forma'] = 'bola',
  papel: PecaCriatura['papel'] | '' = 'cabeca',
): PecaCriatura[] {
  const base: PecaCriatura = { ...peca, forma, ...(papel ? { papel } : {}) };
  const [x, y, z] = peca.p;
  const espelho: PecaCriatura = { ...base, p: [-x, y, z] };
  if (peca.rot) espelho.rot = [peca.rot[0], -peca.rot[1], -peca.rot[2]];
  return [base, espelho];
}

/** Jeito de andar: rover sacoleja, coelho dá pulos altos e lentos, eco-sombra flutua. */
export const MOVIMENTO_LUNAR: Record<TipoCriatura, MovimentoCriatura> = {
  cervo: { saltita: 0.03, flutua: 0, ginga: 0.05 },
  coelho: { saltita: 0.34, flutua: 0, ginga: 0 },
  peixe: { saltita: 0, flutua: 0.03, ginga: 0.12 },
  espectro: { saltita: 0, flutua: 0.18, ginga: 0.14 },
  raposa: { saltita: 0.04, flutua: 0, ginga: 0.08 },
};
