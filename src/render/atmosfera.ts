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

export const DENSIDADE_NEVOA = 0.014;
