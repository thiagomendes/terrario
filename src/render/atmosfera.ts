export type Cor = readonly [number, number, number];

export interface PaletaAtmosfera {
  ceuZenite: Cor;
  ceuMeio: Cor;
  ceuHorizonte: Cor;
  nevoa: Cor;
  sol: Cor;
  sombra: Cor;
}

/** Crepúsculo âmbar e violeta, sombras azul-petróleo. Componentes entre 0 e 1. */
export const PALETA: PaletaAtmosfera = {
  ceuZenite: [0.16, 0.12, 0.3],
  ceuMeio: [0.42, 0.26, 0.48],
  ceuHorizonte: [0.93, 0.6, 0.38],
  nevoa: [0.93, 0.6, 0.38],
  sol: [1, 0.78, 0.55],
  sombra: [0.12, 0.28, 0.34],
};

/** Direção em que a luz do sol viaja (baixa, perto do horizonte). */
export const DIRECAO_SOL: Cor = [-0.55, -0.45, -0.7];

export const DENSIDADE_NEVOA = 0.011;

export const NUM_CASCATAS = 2;

export const INTENSIDADE_GLOW = 0.85;

/** Luz hemisférica de preenchimento azul-petróleo (sem luz dinâmica extra). */
export const LUZ_PREENCHIMENTO = {
  cor: [0.2, 0.42, 0.5] as Cor,
  intensidade: 0.4,
};

function luminancia(c: Cor): number {
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** Razão de contraste entre a cor do sol e a da sombra. */
export function razaoContraste(sol: Cor, sombra: Cor): number {
  return (luminancia(sol) + 0.05) / (luminancia(sombra) + 0.05);
}
