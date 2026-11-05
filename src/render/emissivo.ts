import type { Atlas } from '../art/atlas';
import { CELULA, COLUNAS } from '../art/atlas';

export const TETO_LUMINANCIA_EMISSIVA = 0.45;

/** Luminância relativa (0 a 1) de canais de 0 a 255. */
export function luminancia(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Mapa emissivo RGBA: copia só os tiles dos blocos emissivos, limitando a
 * luminância ao teto e preservando o matiz. O resto fica preto.
 */
export function construirMapaEmissivo(atlas: Atlas, emissivos: number[]): Uint8ClampedArray {
  const saida = new Uint8ClampedArray(atlas.pixels.length);
  for (let i = 3; i < saida.length; i += 4) saida[i] = 255;
  for (const tile of atlas.tiles) {
    if (!emissivos.includes(tile.bloco)) continue;
    const ox = (tile.indice % COLUNAS) * CELULA;
    const oy = Math.floor(tile.indice / COLUNAS) * CELULA;
    for (let y = 0; y < CELULA; y++) {
      for (let x = 0; x < CELULA; x++) {
        const i = ((oy + y) * atlas.largura + ox + x) * 4;
        if (atlas.pixels[i + 3] === 0) continue;
        const r = atlas.pixels[i];
        const g = atlas.pixels[i + 1];
        const b = atlas.pixels[i + 2];
        const l = luminancia(r, g, b);
        const f = l > TETO_LUMINANCIA_EMISSIVA ? TETO_LUMINANCIA_EMISSIVA / l : 1;
        saida[i] = Math.floor(r * f);
        saida[i + 1] = Math.floor(g * f);
        saida[i + 2] = Math.floor(b * f);
      }
    }
  }
  return saida;
}
