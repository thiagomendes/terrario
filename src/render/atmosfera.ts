export type Cor = readonly [number, number, number];

export interface PaletaAtmosfera {
  ceuZenite: Cor;
  ceuMeio: Cor;
  ceuHorizonte: Cor;
  nevoa: Cor;
  sol: Cor;
  sombra: Cor;
}

/** Fim de tarde dourado (paleta de referência). Componentes entre 0 e 1. */
export const PALETA: PaletaAtmosfera = {
  ceuZenite: [0.2, 0.38, 0.72],
  ceuMeio: [0.45, 0.62, 0.86],
  ceuHorizonte: [0.96, 0.78, 0.6],
  nevoa: [0.96, 0.78, 0.6],
  sol: [1, 0.82, 0.6],
  sombra: [0.2, 0.26, 0.4],
};

/** Direção em que a luz do sol viaja na paleta de referência. */
export const DIRECAO_SOL: Cor = [-0.55, -0.45, -0.7];

export const DENSIDADE_NEVOA = 0.0075;

export const NUM_CASCATAS = 2;

export const INTENSIDADE_GLOW = 0.5;

/** Luz hemisférica de preenchimento azulada (céu), sem luz dinâmica extra. */
export const LUZ_PREENCHIMENTO = {
  cor: [0.55, 0.66, 0.9] as Cor,
  intensidade: 0.45,
};

function luminancia(c: Cor): number {
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** Razão de contraste entre a cor do sol e a da sombra. */
export function razaoContraste(sol: Cor, sombra: Cor): number {
  return (luminancia(sol) + 0.05) / (luminancia(sombra) + 0.05);
}

// ---------------------------------------------------------------------------
// Ciclo de dia e noite (lógica pura).
// hora: fração do dia em [0, 1): 0 meia-noite, 0.25 nascer, 0.5 meio-dia, 0.75 pôr.

/** Duração de um dia completo, em segundos. */
export const DURACAO_DIA = 20 * 60;
/** Começa numa manhã dourada. */
export const HORA_INICIAL = 0.32;

export interface EstadoAtmosfera {
  hora: number;
  ceuZenite: Cor;
  ceuMeio: Cor;
  ceuHorizonte: Cor;
  nevoa: Cor;
  /** Cor e intensidade da luz direcional (sol de dia, lua à noite). */
  luz: Cor;
  intensidadeLuz: number;
  /** Direção em que a luz direcional viaja (normalizada, y < 0). */
  direcaoLuz: Cor;
  /** Direção para o sol, normalizada (pode estar abaixo do horizonte). */
  paraSol: Cor;
  /** Direção para a lua, normalizada. */
  paraLua: Cor;
  ceuLuz: Cor;
  chaoLuz: Cor;
  intensidadeCeu: number;
  ambiente: Cor;
  densidadeNevoa: number;
  /** 0 de dia, 1 em plena noite. */
  noite: number;
  /** Força do brilho alaranjado de nascer/pôr (0 a 1). */
  crepusculo: number;
}

interface Quadro {
  h: number;
  zen: Cor;
  meio: Cor;
  hor: Cor;
  luz: Cor;
  il: number;
  ceu: Cor;
  chao: Cor;
  ic: number;
  amb: Cor;
  dens: number;
}

const QUADROS: Quadro[] = [
  {
    h: 0,
    zen: [0.01, 0.015, 0.05],
    meio: [0.03, 0.045, 0.11],
    hor: [0.07, 0.09, 0.17],
    luz: [0.55, 0.65, 1],
    il: 0.26,
    ceu: [0.26, 0.32, 0.58],
    chao: [0.05, 0.05, 0.08],
    ic: 0.22,
    amb: [0.05, 0.06, 0.11],
    dens: 0.011,
  },
  {
    h: 0.21,
    zen: [0.02, 0.03, 0.08],
    meio: [0.07, 0.08, 0.18],
    hor: [0.22, 0.17, 0.25],
    luz: [0.55, 0.62, 0.95],
    il: 0.22,
    ceu: [0.28, 0.3, 0.5],
    chao: [0.06, 0.06, 0.08],
    ic: 0.22,
    amb: [0.06, 0.06, 0.11],
    dens: 0.011,
  },
  {
    h: 0.26,
    zen: [0.14, 0.24, 0.5],
    meio: [0.5, 0.48, 0.66],
    hor: [1, 0.6, 0.4],
    luz: [1, 0.62, 0.38],
    il: 0.9,
    ceu: [0.55, 0.55, 0.75],
    chao: [0.2, 0.15, 0.14],
    ic: 0.4,
    amb: [0.14, 0.12, 0.16],
    dens: 0.009,
  },
  {
    h: 0.32,
    zen: [0.2, 0.38, 0.72],
    meio: [0.45, 0.62, 0.86],
    hor: [0.96, 0.8, 0.64],
    luz: [1, 0.84, 0.64],
    il: 1.6,
    ceu: [0.55, 0.66, 0.9],
    chao: [0.28, 0.24, 0.2],
    ic: 0.45,
    amb: [0.18, 0.2, 0.26],
    dens: 0.0075,
  },
  {
    h: 0.5,
    zen: [0.16, 0.36, 0.78],
    meio: [0.4, 0.6, 0.9],
    hor: [0.72, 0.84, 0.95],
    luz: [1, 0.96, 0.88],
    il: 2,
    ceu: [0.58, 0.7, 0.95],
    chao: [0.32, 0.3, 0.26],
    ic: 0.5,
    amb: [0.2, 0.22, 0.28],
    dens: 0.006,
  },
  {
    h: 0.68,
    zen: [0.2, 0.36, 0.72],
    meio: [0.48, 0.6, 0.84],
    hor: [0.98, 0.78, 0.58],
    luz: [1, 0.8, 0.58],
    il: 1.6,
    ceu: [0.56, 0.64, 0.86],
    chao: [0.3, 0.24, 0.2],
    ic: 0.45,
    amb: [0.18, 0.18, 0.24],
    dens: 0.0075,
  },
  {
    h: 0.74,
    zen: [0.16, 0.2, 0.46],
    meio: [0.62, 0.42, 0.6],
    hor: [1, 0.5, 0.3],
    luz: [1, 0.55, 0.32],
    il: 0.9,
    ceu: [0.55, 0.5, 0.7],
    chao: [0.22, 0.14, 0.13],
    ic: 0.4,
    amb: [0.14, 0.11, 0.15],
    dens: 0.009,
  },
  {
    h: 0.79,
    zen: [0.02, 0.03, 0.09],
    meio: [0.08, 0.08, 0.19],
    hor: [0.25, 0.15, 0.24],
    luz: [0.55, 0.62, 0.95],
    il: 0.22,
    ceu: [0.28, 0.3, 0.5],
    chao: [0.06, 0.06, 0.08],
    ic: 0.22,
    amb: [0.06, 0.06, 0.11],
    dens: 0.011,
  },
  {
    h: 1,
    zen: [0.01, 0.015, 0.05],
    meio: [0.03, 0.045, 0.11],
    hor: [0.07, 0.09, 0.17],
    luz: [0.55, 0.65, 1],
    il: 0.26,
    ceu: [0.26, 0.32, 0.58],
    chao: [0.05, 0.05, 0.08],
    ic: 0.22,
    amb: [0.05, 0.06, 0.11],
    dens: 0.011,
  },
];

function mix(a: Cor, b: Cor, t: number): Cor {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function normalizar(v: Cor): Cor {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
}

/** Normaliza qualquer número para [0, 1). */
export function normalizarHora(hora: number): number {
  return ((hora % 1) + 1) % 1;
}

/** Direção para o sol na hora dada (arco inclinado, nasce em +x e se põe em -x). */
export function direcaoParaSol(hora: number): Cor {
  const a = (normalizarHora(hora) - 0.25) * Math.PI * 2;
  return normalizar([Math.cos(a), Math.sin(a), -0.38]);
}

export function atmosferaNaHora(horaBruta: number): EstadoAtmosfera {
  const hora = normalizarHora(horaBruta);
  let i = 0;
  while (i < QUADROS.length - 2 && QUADROS[i + 1].h <= hora) i++;
  const a = QUADROS[i];
  const b = QUADROS[i + 1];
  const tBruto = (hora - a.h) / (b.h - a.h);
  const t = tBruto * tBruto * (3 - 2 * tBruto);

  const paraSol = direcaoParaSol(hora);
  const paraLua: Cor = [-paraSol[0], -paraSol[1], -paraSol[2]];
  const diaLuz = paraSol[1] > -0.02;
  const fonte = diaLuz ? paraSol : paraLua;
  // a luz direcional nunca fica rasante demais (sombras infinitas)
  const elev = Math.max(fonte[1], 0.22);
  const dirLuz = normalizar([-fonte[0], -elev, -fonte[2]]);

  const hor = mix(a.hor, b.hor, t);
  const noite = Math.min(1, Math.max(0, (-paraSol[1] - 0.02) / 0.2));
  const crepusculo = Math.max(0, 1 - Math.abs(paraSol[1]) / 0.3);
  return {
    hora,
    ceuZenite: mix(a.zen, b.zen, t),
    ceuMeio: mix(a.meio, b.meio, t),
    ceuHorizonte: hor,
    nevoa: hor,
    luz: mix(a.luz, b.luz, t),
    intensidadeLuz: lerp(a.il, b.il, t),
    direcaoLuz: dirLuz,
    paraSol,
    paraLua,
    ceuLuz: mix(a.ceu, b.ceu, t),
    chaoLuz: mix(a.chao, b.chao, t),
    intensidadeCeu: lerp(a.ic, b.ic, t),
    ambiente: mix(a.amb, b.amb, t),
    densidadeNevoa: lerp(a.dens, b.dens, t),
    noite,
    crepusculo,
  };
}
