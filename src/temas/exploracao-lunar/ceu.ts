import type { CeuTema, QuadroCeu, Rgb } from '../tipos';

/**
 * Céu da Lua: negro o dia todo (sem ar não há céu azul), horizonte só levemente
 * acinzentado, luz do sol branca e dura de dia e luz da Terra, azulada, à noite.
 * Névoa quase nula: no vácuo se enxerga longe.
 */
const ZEN: Rgb = [0.004, 0.004, 0.01];
const MEIO: Rgb = [0.008, 0.008, 0.016];

function noite(h: number, hor: Rgb): QuadroCeu {
  return {
    h,
    zen: ZEN,
    meio: MEIO,
    hor,
    // luz da Terra (azulada) para a noite continuar jogável
    luz: [0.55, 0.65, 0.95],
    il: 0.24,
    ceu: [0.26, 0.3, 0.45],
    chao: [0.05, 0.05, 0.06],
    ic: 0.17,
    amb: [0.06, 0.065, 0.09],
    dens: 0.0035,
  };
}

function dia(h: number, il: number, hor: Rgb, amb: number, ic: number, dens: number): QuadroCeu {
  return {
    h,
    zen: [0.005, 0.005, 0.012],
    meio: [0.012, 0.012, 0.02],
    hor,
    luz: [1, 0.99, 0.97],
    il,
    ceu: [0.3, 0.3, 0.34],
    chao: [0.36, 0.35, 0.34],
    ic,
    amb: [amb, amb, amb * 1.06],
    dens,
  };
}

export const QUADROS_CEU_LUA: QuadroCeu[] = [
  noite(0, [0.03, 0.03, 0.04]),
  noite(0.21, [0.04, 0.04, 0.05]),
  dia(0.26, 1.1, [0.07, 0.07, 0.075], 0.1, 0.32, 0.003),
  dia(0.32, 1.9, [0.09, 0.09, 0.095], 0.13, 0.38, 0.0025),
  dia(0.5, 2.3, [0.1, 0.1, 0.105], 0.15, 0.42, 0.002),
  dia(0.68, 1.9, [0.09, 0.09, 0.095], 0.13, 0.38, 0.0025),
  dia(0.74, 1.1, [0.07, 0.07, 0.075], 0.1, 0.32, 0.003),
  noite(0.79, [0.04, 0.04, 0.05]),
  noite(1, [0.03, 0.03, 0.04]),
];

export const CEU_LUA: CeuTema = {
  estrelasDia: 1,
  corEstrelas: [0.95, 0.96, 1],
  densidadeEstrelas: 0.8,
  // o shader tinge o disco de amarelo; esta tinta devolve o branco puro
  corSol: [0.82, 0.96, 1.25],
  tamanhoSol: 0.7,
  haloSol: 0,
  corLua: [1, 1, 1],
  tamanhoLua: 0,
  planeta: {
    // a Terra, baixa sobre o horizonte, sempre no mesmo lugar
    direcao: [-0.35, 0.2, -1],
    raio: 0.075,
    cor: [0.14, 0.38, 0.85],
    corSecundaria: [0.3, 0.6, 0.3],
    mistura: 1,
    nuvens: 1,
  },
  corNuvens: [1, 1, 1],
  fatorNuvens: 0,
  faixaCrepusculo: 0,
};
