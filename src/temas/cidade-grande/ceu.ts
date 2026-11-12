import type { CeuTema, QuadroCeu } from '../tipos';

/**
 * Céu da Cidade Grande (spec 014, T08): azul de verão limpo, um pouco mais leitoso no
 * horizonte (o ar da cidade), entardecer rosa e dourado atrás dos prédios e uma noite
 * azul-marinho com o horizonte quentinho (o brilho das janelas acesas ao longe) e poucas
 * estrelas, como no céu de cidade. Nada de escuro de dar medo: a noite é clara e azulada.
 */
const NOITE: Omit<QuadroCeu, 'h'> = {
  zen: [0.03, 0.04, 0.12],
  meio: [0.07, 0.08, 0.2],
  // o horizonte da noite: o brilho alaranjado das luzes da cidade
  hor: [0.3, 0.2, 0.26],
  luz: [0.62, 0.7, 1],
  il: 0.28,
  ceu: [0.32, 0.34, 0.58],
  chao: [0.08, 0.07, 0.08],
  ic: 0.24,
  amb: [0.09, 0.09, 0.15],
  dens: 0.009,
};

export const QUADROS_CIDADE: QuadroCeu[] = [
  { h: 0, ...NOITE },
  {
    // fim da madrugada: o azul clareando por trás dos prédios
    h: 0.21,
    zen: [0.05, 0.06, 0.16],
    meio: [0.16, 0.14, 0.3],
    hor: [0.5, 0.32, 0.38],
    luz: [0.66, 0.66, 0.95],
    il: 0.3,
    ceu: [0.38, 0.36, 0.58],
    chao: [0.09, 0.08, 0.09],
    ic: 0.26,
    amb: [0.09, 0.09, 0.14],
    dens: 0.009,
  },
  {
    // amanhecer cor de pêssego
    h: 0.26,
    zen: [0.32, 0.46, 0.76],
    meio: [0.86, 0.7, 0.68],
    hor: [1, 0.72, 0.52],
    luz: [1, 0.78, 0.56],
    il: 1,
    ceu: [0.74, 0.68, 0.7],
    chao: [0.26, 0.21, 0.16],
    ic: 0.44,
    amb: [0.18, 0.16, 0.15],
    dens: 0.008,
  },
  {
    h: 0.32,
    zen: [0.3, 0.52, 0.86],
    meio: [0.54, 0.72, 0.92],
    hor: [0.88, 0.88, 0.86],
    luz: [1, 0.93, 0.8],
    il: 1.7,
    ceu: [0.64, 0.76, 0.94],
    chao: [0.3, 0.3, 0.28],
    ic: 0.5,
    amb: [0.21, 0.22, 0.25],
    dens: 0.0058,
  },
  {
    // meio-dia de céu limpo, com o horizonte leitoso da cidade
    h: 0.5,
    zen: [0.24, 0.5, 0.9],
    meio: [0.5, 0.72, 0.96],
    hor: [0.82, 0.88, 0.95],
    luz: [1, 0.98, 0.92],
    il: 2.05,
    ceu: [0.66, 0.8, 0.97],
    chao: [0.34, 0.34, 0.32],
    ic: 0.55,
    amb: [0.23, 0.24, 0.27],
    dens: 0.005,
  },
  {
    h: 0.68,
    zen: [0.26, 0.48, 0.86],
    meio: [0.6, 0.7, 0.9],
    hor: [1, 0.82, 0.68],
    luz: [1, 0.87, 0.66],
    il: 1.7,
    ceu: [0.66, 0.7, 0.88],
    chao: [0.32, 0.28, 0.22],
    ic: 0.5,
    amb: [0.21, 0.2, 0.23],
    dens: 0.006,
  },
  {
    // entardecer rosa e dourado atrás dos prédios
    h: 0.74,
    zen: [0.24, 0.26, 0.56],
    meio: [0.84, 0.5, 0.6],
    hor: [1, 0.58, 0.4],
    luz: [1, 0.62, 0.4],
    il: 0.95,
    ceu: [0.66, 0.52, 0.66],
    chao: [0.25, 0.16, 0.13],
    ic: 0.42,
    amb: [0.16, 0.12, 0.14],
    dens: 0.008,
  },
  {
    h: 0.79,
    zen: [0.05, 0.06, 0.15],
    meio: [0.13, 0.11, 0.25],
    hor: [0.4, 0.24, 0.32],
    luz: [0.62, 0.68, 0.98],
    il: 0.3,
    ceu: [0.34, 0.34, 0.58],
    chao: [0.08, 0.07, 0.09],
    ic: 0.26,
    amb: [0.09, 0.09, 0.14],
    dens: 0.009,
  },
  { h: 1, ...NOITE },
];

export const CEU_CIDADE: CeuTema = {
  estrelasDia: 0,
  corEstrelas: [1, 0.95, 0.88],
  // céu de cidade: poucas estrelas (as luzes das janelas apagam as fraquinhas)
  densidadeEstrelas: 0.32,
  corSol: [1, 0.95, 0.82],
  tamanhoSol: 1.1,
  haloSol: 1.1,
  corLua: [1, 0.98, 0.92],
  tamanhoLua: 1.2,
  corNuvens: [1, 0.99, 0.97],
  fatorNuvens: 0.8,
  faixaCrepusculo: 1.35,
  corCrepusculo: [1, 0.55, 0.42],
};
