import type { CeuTema, QuadroCeu } from '../tipos';

/**
 * Céu da Vila Neon (spec 026): azul limpo de dia, entardecer magenta e laranja (o fim de tarde
 * do festival) e a noite roxa funda e estrelada. De noite o chão escurece de verdade
 * (`pisoNoite`): a luz vem do palco, do neon, das janelas e dos postes. Escuro de brinquedo,
 * nunca preto: o roxo da noite continua bonito para quem tem 3 anos.
 */
const NOITE: Omit<QuadroCeu, 'h'> = {
  zen: [0.07, 0.025, 0.17],
  meio: [0.17, 0.06, 0.32],
  // o horizonte da noite: um roxo mais aceso, com um fio de magenta
  hor: [0.36, 0.12, 0.44],
  luz: [0.56, 0.5, 1],
  il: 0.1,
  // a luz do céu da noite é roxa: o gramado fica roxo-escuro, não verde aceso
  ceu: [0.3, 0.19, 0.6],
  chao: [0.05, 0.03, 0.1],
  ic: 0.2,
  amb: [0.05, 0.03, 0.1],
  dens: 0.009,
};

export const QUADROS_VILA: QuadroCeu[] = [
  { h: 0, ...NOITE },
  {
    // fim da madrugada: o roxo clareando para o lilás
    h: 0.21,
    zen: [0.1, 0.05, 0.24],
    meio: [0.26, 0.12, 0.4],
    hor: [0.56, 0.26, 0.5],
    luz: [0.7, 0.6, 0.95],
    il: 0.26,
    ceu: [0.4, 0.3, 0.58],
    chao: [0.08, 0.06, 0.09],
    ic: 0.22,
    amb: [0.08, 0.06, 0.12],
    dens: 0.009,
  },
  {
    // amanhecer rosado
    h: 0.26,
    zen: [0.34, 0.42, 0.8],
    meio: [0.9, 0.62, 0.72],
    hor: [1, 0.66, 0.56],
    luz: [1, 0.76, 0.6],
    il: 1,
    ceu: [0.76, 0.64, 0.74],
    chao: [0.26, 0.2, 0.17],
    ic: 0.44,
    amb: [0.18, 0.15, 0.16],
    dens: 0.008,
  },
  {
    h: 0.32,
    zen: [0.22, 0.5, 0.92],
    meio: [0.5, 0.72, 0.96],
    hor: [0.84, 0.9, 0.96],
    luz: [1, 0.94, 0.82],
    il: 1.7,
    ceu: [0.62, 0.76, 0.96],
    chao: [0.3, 0.3, 0.28],
    ic: 0.5,
    amb: [0.21, 0.22, 0.25],
    dens: 0.0055,
  },
  {
    // meio-dia de azul limpo (sem o leitoso da cidade)
    h: 0.5,
    zen: [0.16, 0.46, 0.94],
    meio: [0.42, 0.7, 0.98],
    hor: [0.76, 0.88, 0.98],
    luz: [1, 0.98, 0.92],
    il: 2.05,
    ceu: [0.62, 0.78, 0.98],
    chao: [0.34, 0.34, 0.32],
    ic: 0.55,
    amb: [0.23, 0.24, 0.27],
    dens: 0.0048,
  },
  {
    h: 0.68,
    zen: [0.22, 0.44, 0.88],
    meio: [0.62, 0.66, 0.92],
    hor: [1, 0.76, 0.66],
    luz: [1, 0.86, 0.68],
    il: 1.7,
    ceu: [0.68, 0.68, 0.9],
    chao: [0.32, 0.27, 0.22],
    ic: 0.5,
    amb: [0.21, 0.19, 0.23],
    dens: 0.006,
  },
  {
    // entardecer do festival: magenta no alto e laranja no horizonte
    h: 0.74,
    zen: [0.3, 0.16, 0.5],
    meio: [0.86, 0.36, 0.6],
    hor: [1, 0.52, 0.3],
    luz: [1, 0.58, 0.42],
    il: 0.95,
    ceu: [0.72, 0.44, 0.66],
    chao: [0.25, 0.14, 0.14],
    ic: 0.4,
    amb: [0.16, 0.1, 0.15],
    dens: 0.008,
  },
  {
    // o roxo chegando, com o resto do magenta no horizonte
    h: 0.79,
    zen: [0.1, 0.04, 0.22],
    meio: [0.24, 0.09, 0.38],
    hor: [0.5, 0.18, 0.44],
    luz: [0.64, 0.56, 1],
    il: 0.24,
    ceu: [0.36, 0.26, 0.56],
    chao: [0.07, 0.05, 0.09],
    ic: 0.2,
    amb: [0.07, 0.05, 0.11],
    dens: 0.009,
  },
  { h: 1, ...NOITE },
];

export const CEU_VILA: CeuTema = {
  estrelasDia: 0,
  corEstrelas: [1, 0.94, 0.98],
  // noite de bairro aberto: bastante estrela no roxo
  densidadeEstrelas: 0.62,
  corSol: [1, 0.94, 0.8],
  tamanhoSol: 1.15,
  haloSol: 1.2,
  corLua: [1, 0.97, 0.94],
  tamanhoLua: 1.25,
  corNuvens: [1, 0.97, 0.99],
  fatorNuvens: 0.75,
  faixaCrepusculo: 1.5,
  // a faixa do pôr: magenta puxando para o laranja
  corCrepusculo: [1, 0.42, 0.5],
  // o chão escurece de verdade de noite (o festival brilha no escuro)
  pisoNoite: 0.09,
  // de noite o gramado apaga (roxo-escuro, não verde aceso): os feixes do palco pousam nele
  verdeNoite: 0.9,
};
