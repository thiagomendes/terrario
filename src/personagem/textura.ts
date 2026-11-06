import { PALETAS, type Aparencia } from './aparencia';
import type { NomeParte } from './modelo';

export const LARGURA_TEXTURA = 64;
export const ALTURA_TEXTURA = 32;

/** Cor saturada da lanterna, com luminância abaixo do teto emissivo (0.45). */
export const COR_LANTERNA = '#a85a00';
export const COR_CAPUZ_SOMBRA = '#2a2433';

export interface Regiao {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const REGIOES: Record<NomeParte, Regiao> = {
  cabeca: { x: 0, y: 0, w: 16, h: 16 },
  cabelo: { x: 16, y: 0, w: 16, h: 16 },
  acessorio: { x: 32, y: 0, w: 16, h: 16 },
  tronco: { x: 0, y: 16, w: 16, h: 16 },
  bracoEsquerdo: { x: 16, y: 16, w: 8, h: 16 },
  bracoDireito: { x: 24, y: 16, w: 8, h: 16 },
  pernaEsquerda: { x: 32, y: 16, w: 8, h: 16 },
  pernaDireita: { x: 40, y: 16, w: 8, h: 16 },
};

type Rgb = [number, number, number];

function hex(cor: string): Rgb {
  const n = parseInt(cor.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function preencher(pixels: Uint8ClampedArray, r: Regiao, cor: Rgb, linhas = r.h): void {
  for (let y = r.y; y < r.y + linhas; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      const i = (y * LARGURA_TEXTURA + x) * 4;
      pixels[i] = cor[0];
      pixels[i + 1] = cor[1];
      pixels[i + 2] = cor[2];
      pixels[i + 3] = 255;
    }
  }
}

export function gerarTextura(aparencia: Aparencia): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(LARGURA_TEXTURA * ALTURA_TEXTURA * 4);
  const pele = hex(PALETAS.pele[aparencia.pele] ?? PALETAS.pele[0]);
  const cabelo = hex(PALETAS.cabelo[aparencia.cabeloCor] ?? PALETAS.cabelo[0]);
  const roupa = hex(PALETAS.roupa[aparencia.roupaCor] ?? PALETAS.roupa[0]);
  const calca = hex(PALETAS.calca[aparencia.calcaCor] ?? PALETAS.calca[0]);

  preencher(pixels, REGIOES.cabeca, pele);
  preencher(pixels, REGIOES.cabelo, cabelo);
  preencher(pixels, REGIOES.tronco, roupa);
  // Manga cobre a parte de cima do braço; o resto é pele.
  for (const nome of ['bracoEsquerdo', 'bracoDireito'] as const) {
    preencher(pixels, REGIOES[nome], pele);
    preencher(pixels, REGIOES[nome], roupa, 10);
  }
  preencher(pixels, REGIOES.pernaEsquerda, calca);
  preencher(pixels, REGIOES.pernaDireita, calca);

  if (aparencia.acessorio === 'capuz') {
    preencher(pixels, REGIOES.acessorio, hex(COR_CAPUZ_SOMBRA));
  } else if (aparencia.acessorio === 'lanterna') {
    preencher(pixels, REGIOES.acessorio, hex(COR_LANTERNA));
  }
  return pixels;
}
