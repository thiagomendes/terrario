import type { TipoCriatura } from '../../jogo/criaturas';
import type { PecaCriatura } from '../tipos';

type Papel = PecaCriatura['papel'];

/** Duas peças espelhadas no eixo x (olhos, orelhas, bochechas, pernas, chifres). */
function par(peca: PecaCriatura, papeis?: [Papel, Papel]): PecaCriatura[] {
  const [x, y, z] = peca.p;
  const espelho: PecaCriatura = { ...peca, p: [-x, y, z] };
  if (peca.rot) espelho.rot = [peca.rot[0], -peca.rot[1], -peca.rot[2]];
  if (papeis)
    return [
      { ...peca, papel: papeis[0] },
      { ...espelho, papel: papeis[1] },
    ];
  return [peca, espelho];
}

// pontinho de brilho dos olhos (o mesmo branco do boneco do jogador) e bochecha rosada
const BRILHO_OLHO = '#ffffff';
const BOCHECHA = '#ff9fb8';

/**
 * Modelos (pele) das criaturas no tema base, desenhados à mão como brinquedo (spec 012):
 * cabeção, olhos de bolinha com pontinho branco, bochechas rosadas e plástico gordinho.
 * São a reserva genérica (spec 034): o cervo de musgo com pontas de chifre que brilham, o
 * coelho lilás, a raposa laranja com a ponta do rabo acesa, o peixinho de água-marinha e o
 * espectro, um fantasminha pastel "que brilha no escuro".
 */
export const CRIATURAS_BASE: Record<TipoCriatura, PecaCriatura[]> = {
  // cervo filhote: musgo no lombo, focinho claro e chifrinhos com as pontas acesas
  cervo: [
    { forma: 'caixa', raio: 0.2, t: [0.58, 0.5, 0.88], p: [0, 0.66, 0], cor: '#ad5a26' },
    { forma: 'bola', t: [0.4, 0.26, 0.6], p: [0, 0.5, 0.04], cor: '#f1d9b4' },
    { forma: 'bola', t: [0.5, 0.2, 0.7], p: [0, 0.9, -0.05], cor: '#48b032' },
    { forma: 'bola', t: [0.09, 0.09, 0.09], p: [0.08, 0.99, 0.05], cor: '#b6fff2', brilho: 0.5 },
    // pescoço curto que entra no corpo e na cabeça
    {
      forma: 'capsula',
      t: [0.26, 0.4, 0.26],
      p: [0, 0.98, 0.34],
      cor: '#ad5a26',
      rot: [0.35, 0, 0],
    },
    // cabeça
    { forma: 'bola', t: [0.58, 0.52, 0.52], p: [0, 1.26, 0.5], cor: '#b8652e', papel: 'cabeca' },
    { forma: 'bola', t: [0.3, 0.22, 0.24], p: [0, 1.17, 0.72], cor: '#f1d9b4', papel: 'cabeca' },
    { forma: 'bola', t: [0.1, 0.08, 0.07], p: [0, 1.22, 0.83], cor: '#3a2418', papel: 'cabeca' },
    ...par({
      forma: 'bola',
      t: [0.13, 0.16, 0.08],
      p: [0.14, 1.33, 0.715],
      cor: '#1c1420',
      papel: 'cabeca',
    }),
    ...par({
      forma: 'bola',
      t: [0.05, 0.05, 0.03],
      p: [0.16, 1.37, 0.75],
      cor: BRILHO_OLHO,
      brilho: 0.55,
      papel: 'cabeca',
    }),
    ...par({
      forma: 'bola',
      t: [0.11, 0.065, 0.04],
      p: [0.19, 1.2, 0.69],
      cor: BOCHECHA,
      papel: 'cabeca',
    }),
    ...par({
      forma: 'bola',
      t: [0.24, 0.1, 0.14],
      p: [0.31, 1.38, 0.46],
      cor: '#b8652e',
      rot: [0, 0, 0.5],
      papel: 'cabeca',
    }),
    // chifrinhos de galho claro (a base entra na cabeça), com as pontas que brilham
    ...par({
      forma: 'capsula',
      t: [0.07, 0.32, 0.07],
      p: [0.12, 1.6, 0.45],
      cor: '#efe2c4',
      rot: [0, 0, -0.3],
      papel: 'cabeca',
    }),
    ...par({
      forma: 'capsula',
      t: [0.055, 0.18, 0.055],
      p: [0.197, 1.673, 0.45],
      cor: '#efe2c4',
      rot: [0, 0, -1.0],
      papel: 'cabeca',
    }),
    ...par({
      forma: 'bola',
      t: [0.11, 0.11, 0.11],
      p: [0.17, 1.76, 0.45],
      cor: '#6ff0de',
      brilho: 0.55,
      papel: 'cabeca',
    }),
    ...par({
      forma: 'bola',
      t: [0.08, 0.08, 0.08],
      p: [0.27, 1.72, 0.45],
      cor: '#6ff0de',
      brilho: 0.55,
      papel: 'cabeca',
    }),
    // patinhas gordas: o topo (pivô) fica dentro do corpo; as diagonais alternam
    ...par({ forma: 'capsula', t: [0.19, 0.54, 0.19], p: [0.15, 0.27, 0.26], cor: '#7a4220' }, [
      'perna0',
      'perna1',
    ]),
    ...par({ forma: 'capsula', t: [0.19, 0.54, 0.19], p: [0.15, 0.27, -0.26], cor: '#7a4220' }, [
      'perna1',
      'perna0',
    ]),
    { forma: 'bola', t: [0.16, 0.18, 0.14], p: [0, 0.84, -0.46], cor: '#fff8ee', papel: 'cauda' },
  ],
  // coelho lilás da neblina: bolinha de corpo, orelhonas rosadas e pompom de rabo
  coelho: [
    { forma: 'bola', t: [0.34, 0.3, 0.38], p: [0, 0.18, -0.02], cor: '#9278dc' },
    { forma: 'bola', t: [0.22, 0.2, 0.12], p: [0, 0.16, 0.13], cor: '#fbf7ff' },
    { forma: 'bola', t: [0.34, 0.3, 0.3], p: [0, 0.42, 0.12], cor: '#a08ae4', papel: 'cabeca' },
    {
      forma: 'bola',
      t: [0.12, 0.075, 0.06],
      p: [0, 0.385, 0.255],
      cor: '#fbf7ff',
      papel: 'cabeca',
    },
    {
      forma: 'bola',
      t: [0.045, 0.035, 0.03],
      p: [0, 0.41, 0.285],
      cor: '#ff7fa6',
      papel: 'cabeca',
    },
    ...par({
      forma: 'bola',
      t: [0.075, 0.09, 0.05],
      p: [0.08, 0.45, 0.25],
      cor: '#1c1420',
      papel: 'cabeca',
    }),
    ...par({
      forma: 'bola',
      t: [0.03, 0.03, 0.02],
      p: [0.09, 0.47, 0.275],
      cor: BRILHO_OLHO,
      brilho: 0.55,
      papel: 'cabeca',
    }),
    ...par({
      forma: 'bola',
      t: [0.06, 0.035, 0.025],
      p: [0.115, 0.4, 0.235],
      cor: BOCHECHA,
      papel: 'cabeca',
    }),
    ...par({
      forma: 'capsula',
      t: [0.09, 0.24, 0.05],
      p: [0.065, 0.63, 0.09],
      cor: '#a08ae4',
      rot: [-0.15, 0, -0.18],
      papel: 'cabeca',
    }),
    ...par({
      forma: 'capsula',
      t: [0.045, 0.16, 0.02],
      p: [0.066, 0.62, 0.115],
      cor: '#ffb6cc',
      rot: [-0.15, 0, -0.18],
      papel: 'cabeca',
    }),
    { forma: 'bola', t: [0.13, 0.13, 0.12], p: [0, 0.22, -0.2], cor: '#ffffff', papel: 'cauda' },
    ...par({ forma: 'capsula', t: [0.1, 0.11, 0.18], p: [0.11, 0.055, -0.05], cor: '#9078d0' }, [
      'perna0',
      'perna1',
    ]),
    ...par({ forma: 'bola', t: [0.08, 0.1, 0.08], p: [0.07, 0.05, 0.1], cor: '#9078d0' }),
  ],
  // peixinho de água-marinha: gordinho, barbatanas rosa e olhinho de bolinha
  peixe: [
    { forma: 'bola', t: [0.2, 0.24, 0.34], p: [0, 0.16, 0], cor: '#2fcfbd' },
    { forma: 'bola', t: [0.15, 0.13, 0.24], p: [0, 0.1, 0.03], cor: '#d2fff6' },
    { forma: 'bola', t: [0.04, 0.22, 0.14], p: [0, 0.16, -0.21], cor: '#ff78c0', papel: 'cauda' },
    { forma: 'bola', t: [0.03, 0.1, 0.15], p: [0, 0.285, -0.02], cor: '#ff78c0' },
    ...par({
      forma: 'bola',
      t: [0.08, 0.03, 0.06],
      p: [0.105, 0.11, 0.03],
      cor: '#ff78c0',
      rot: [0, 0, 0.45],
    }),
    ...par({ forma: 'bola', t: [0.04, 0.075, 0.07], p: [0.09, 0.19, 0.08], cor: '#1c1420' }),
    ...par({
      forma: 'bola',
      t: [0.02, 0.026, 0.026],
      p: [0.108, 0.207, 0.093],
      cor: BRILHO_OLHO,
      brilho: 0.55,
    }),
    ...par({ forma: 'bola', t: [0.02, 0.03, 0.04], p: [0.074, 0.125, 0.12], cor: BOCHECHA }),
    { forma: 'bola', t: [0.06, 0.03, 0.03], p: [0, 0.135, 0.165], cor: '#ff6fa0' },
    { forma: 'bola', t: [0.035, 0.035, 0.035], p: [0, 0.31, 0.06], cor: '#b6fff2', brilho: 0.5 },
  ],
  // o espectro: fantasminha de plástico pastel que brilha no escuro (assusta pouco, é brinquedo)
  espectro: [
    { forma: 'bola', t: [0.76, 0.68, 0.64], p: [0, 1.3, 0], cor: '#ded0ff', papel: 'cabeca' },
    { forma: 'bola', t: [0.56, 0.66, 0.5], p: [0, 0.76, 0], cor: '#cdbcff' },
    { forma: 'bola', t: [0.64, 0.24, 0.54], p: [0, 0.44, 0], cor: '#c8e4ff', papel: 'cauda' },
    { forma: 'bola', t: [0.2, 0.18, 0.2], p: [0.2, 0.32, 0.1], cor: '#bff0ea' },
    { forma: 'bola', t: [0.2, 0.18, 0.2], p: [0, 0.3, 0.14], cor: '#bff0ea' },
    { forma: 'bola', t: [0.2, 0.18, 0.2], p: [-0.2, 0.32, 0.1], cor: '#bff0ea' },
    // bracinhos: o topo entra no corpo, debaixo da cabeça
    ...par(
      {
        forma: 'capsula',
        t: [0.16, 0.3, 0.16],
        p: [0.3, 0.8, 0.06],
        cor: '#cdbcff',
        rot: [0, 0, 0.45],
      },
      ['perna0', 'perna1'],
    ),
    // olhões de bolinha: miolo azul que brilha e o pontinho branco
    ...par({
      forma: 'bola',
      t: [0.17, 0.21, 0.08],
      p: [0.15, 1.3, 0.29],
      cor: '#2a2266',
      papel: 'cabeca',
    }),
    ...par({
      forma: 'bola',
      t: [0.065, 0.065, 0.04],
      p: [0.13, 1.25, 0.33],
      cor: '#6fe8ff',
      brilho: 0.55,
      papel: 'cabeca',
    }),
    ...par({
      forma: 'bola',
      t: [0.06, 0.06, 0.03],
      p: [0.18, 1.355, 0.335],
      cor: BRILHO_OLHO,
      brilho: 0.55,
      papel: 'cabeca',
    }),
    ...par({
      forma: 'bola',
      t: [0.12, 0.07, 0.04],
      p: [0.25, 1.2, 0.215],
      cor: BOCHECHA,
      papel: 'cabeca',
    }),
    { forma: 'bola', t: [0.08, 0.045, 0.03], p: [0, 1.15, 0.29], cor: '#8a6ad0', papel: 'cabeca' },
    // a luzinha de vagalume no cocuruto
    {
      forma: 'capsula',
      t: [0.05, 0.16, 0.05],
      p: [0, 1.67, 0],
      cor: '#ded0ff',
      rot: [0.3, 0, 0],
      papel: 'cabeca',
    },
    {
      forma: 'bola',
      t: [0.13, 0.13, 0.13],
      p: [0, 1.76, 0.03],
      cor: '#9ff6ff',
      brilho: 0.55,
      papel: 'cabeca',
    },
  ],
  // raposa laranja: peito branco, focinho claro e a ponta do rabo acesa
  raposa: [
    { forma: 'caixa', raio: 0.15, t: [0.38, 0.34, 0.56], p: [0, 0.4, -0.02], cor: '#f05a12' },
    { forma: 'bola', t: [0.26, 0.26, 0.2], p: [0, 0.42, 0.2], cor: '#fff4e6' },
    { forma: 'bola', t: [0.42, 0.36, 0.36], p: [0, 0.68, 0.3], cor: '#f86818', papel: 'cabeca' },
    { forma: 'bola', t: [0.2, 0.14, 0.2], p: [0, 0.62, 0.46], cor: '#fff4e6', papel: 'cabeca' },
    { forma: 'bola', t: [0.065, 0.055, 0.05], p: [0, 0.65, 0.56], cor: '#2a1a14', papel: 'cabeca' },
    ...par({
      forma: 'bola',
      t: [0.085, 0.105, 0.05],
      p: [0.095, 0.71, 0.455],
      cor: '#1c1420',
      papel: 'cabeca',
    }),
    ...par({
      forma: 'bola',
      t: [0.032, 0.032, 0.02],
      p: [0.105, 0.735, 0.48],
      cor: BRILHO_OLHO,
      brilho: 0.55,
      papel: 'cabeca',
    }),
    ...par({
      forma: 'bola',
      t: [0.07, 0.04, 0.03],
      p: [0.145, 0.63, 0.425],
      cor: BOCHECHA,
      papel: 'cabeca',
    }),
    ...par({
      forma: 'bola',
      t: [0.16, 0.22, 0.07],
      p: [0.12, 0.87, 0.28],
      cor: '#f86818',
      rot: [0, 0, -0.3],
      papel: 'cabeca',
    }),
    ...par({
      forma: 'bola',
      t: [0.08, 0.13, 0.03],
      p: [0.12, 0.86, 0.31],
      cor: '#4a2c1e',
      rot: [0, 0, -0.3],
      papel: 'cabeca',
    }),
    // rabo fofo levantado (a base entra no corpo), com a ponta de luz
    {
      forma: 'bola',
      t: [0.26, 0.26, 0.44],
      p: [0, 0.48, -0.46],
      cor: '#f05a12',
      rot: [0.5, 0, 0],
      papel: 'cauda',
    },
    {
      forma: 'bola',
      t: [0.2, 0.2, 0.2],
      p: [0, 0.6, -0.66],
      cor: '#8ff5ea',
      brilho: 0.55,
      papel: 'cauda',
    },
    // patinhas: o topo (pivô) fica dentro do corpo; as diagonais alternam
    ...par({ forma: 'capsula', t: [0.13, 0.32, 0.13], p: [0.1, 0.16, 0.16], cor: '#4a2c1e' }, [
      'perna0',
      'perna1',
    ]),
    ...par({ forma: 'capsula', t: [0.13, 0.32, 0.13], p: [0.1, 0.16, -0.2], cor: '#4a2c1e' }, [
      'perna1',
      'perna0',
    ]),
  ],
};
