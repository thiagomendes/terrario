import type { CeuTema, QuadroCeu } from '../tipos';

/**
 * O céu da Noite das Fantasias (spec 027, aprovado no esboço de 20 nov 2026): o "dia" é um
 * entardecer laranja dourado que dura o dia inteiro (o mundo mora no fim de tarde), e a noite é
 * roxa, com a lua grande e as estrelas, nunca escura de verdade: o piso de luz da noite fica alto
 * e o chão continua legível (ao contrário da Vila Neon, que escurece o chão no festival).
 */

/** A noite roxa de brinquedo: a lua clareia o chão (nunca o escuro de verdade). */
const NOITE: Omit<QuadroCeu, 'h'> = {
  zen: [0.13, 0.06, 0.28],
  meio: [0.27, 0.13, 0.46],
  // o horizonte: um lilás claro (a névoa da noite fica leve, sem magenta forte)
  hor: [0.44, 0.34, 0.6],
  luz: [0.76, 0.72, 1],
  il: 0.46,
  // a luz do céu da noite é lilás: o gramado fica verde-oliva médio, nunca preto
  ceu: [0.5, 0.44, 0.76],
  chao: [0.16, 0.13, 0.2],
  ic: 0.5,
  amb: [0.17, 0.14, 0.24],
  dens: 0.0026,
};

/**
 * A tarde dourada que dura o "dia" inteiro: laranja dourado embaixo, pêssego no meio e lilás só
 * no alto.
 */
const TARDE: Omit<QuadroCeu, 'h'> = {
  zen: [0.58, 0.48, 0.78],
  meio: [1, 0.78, 0.58],
  hor: [1, 0.66, 0.3],
  luz: [1, 0.82, 0.56],
  il: 1.45,
  ceu: [0.84, 0.72, 0.72],
  chao: [0.34, 0.25, 0.18],
  ic: 0.54,
  amb: [0.24, 0.19, 0.18],
  dens: 0.0018,
};

export const QUADROS_FANTASIAS: QuadroCeu[] = [
  { h: 0, ...NOITE },
  {
    // fim da madrugada: o roxo clareando para o lilás
    h: 0.21,
    zen: [0.18, 0.1, 0.34],
    meio: [0.36, 0.2, 0.5],
    hor: [0.66, 0.4, 0.58],
    luz: [0.84, 0.74, 0.98],
    il: 0.7,
    ceu: [0.58, 0.48, 0.74],
    chao: [0.2, 0.16, 0.2],
    ic: 0.56,
    amb: [0.22, 0.18, 0.26],
    dens: 0.0065,
  },
  {
    // o amanhecer já dourado
    h: 0.27,
    zen: [0.34, 0.34, 0.66],
    meio: [0.94, 0.62, 0.52],
    hor: [1, 0.7, 0.42],
    luz: [1, 0.78, 0.52],
    il: 1.3,
    ceu: [0.84, 0.68, 0.66],
    chao: [0.32, 0.24, 0.17],
    ic: 0.5,
    amb: [0.22, 0.18, 0.17],
    dens: 0.006,
  },
  { h: 0.34, ...TARDE },
  { h: 0.66, ...TARDE },
  {
    // o pôr: laranja forte embaixo, violeta em cima
    h: 0.74,
    zen: [0.3, 0.2, 0.54],
    meio: [0.84, 0.46, 0.5],
    hor: [1, 0.58, 0.3],
    luz: [1, 0.66, 0.42],
    il: 1.15,
    ceu: [0.78, 0.56, 0.66],
    chao: [0.3, 0.2, 0.16],
    ic: 0.5,
    amb: [0.22, 0.16, 0.2],
    dens: 0.0065,
  },
  {
    // o roxo chegando, com o resto do laranja no horizonte
    h: 0.8,
    zen: [0.16, 0.09, 0.32],
    meio: [0.3, 0.18, 0.48],
    hor: [0.56, 0.38, 0.56],
    luz: [0.78, 0.72, 1],
    il: 0.5,
    ceu: [0.5, 0.42, 0.74],
    chao: [0.17, 0.13, 0.2],
    ic: 0.52,
    amb: [0.18, 0.14, 0.25],
    dens: 0.003,
  },
  { h: 1, ...NOITE },
];

export const CEU_FANTASIAS: CeuTema = {
  estrelasDia: 0,
  corEstrelas: [1, 0.95, 0.86],
  densidadeEstrelas: 0.5,
  corSol: [1, 0.86, 0.6],
  tamanhoSol: 1.3,
  haloSol: 1.5,
  // a lua grande e morna, de livro de história (creme claro: a conta do céu escurece a lua
  // para 0,86 com as crateras; aqui compensa)
  corLua: [1.3, 1.24, 1.06],
  tamanhoLua: 2.6,
  corNuvens: [1, 0.9, 0.9],
  // quase sem nuvem (de noite elas viravam manchas escuras, como fumaça; de dia, rastros)
  fatorNuvens: 0,
  faixaCrepusculo: 1.6,
  corCrepusculo: [1, 0.56, 0.3],
  // a noite baixa a luz do chão só um pouco (a Vila Neon desce a 0,3; aqui, nunca escuro)
  pisoNoite: 0.34,
  // o verde do gramado puxa um pouco para o lilás de noite, sem virar cinza-chumbo
  verdeNoite: 0.18,
};
