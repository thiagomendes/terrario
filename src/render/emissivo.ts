import type { Atlas } from '../art/atlas';
import { CELULA, COLUNAS, PADDING, TAM_TILE } from '../art/atlas';
import { tema } from '../temas/ativo';

export const TETO_LUMINANCIA_EMISSIVA = 0.45;

/** Luminância relativa (0 a 1) de canais de 0 a 255. */
export function luminancia(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Mapa emissivo RGBA: copia os pixels saturados dos tiles emissivos (ou dos
 * blocos listados), limitando a luminância ao teto e preservando o matiz.
 * O resto fica preto.
 */
export function construirMapaEmissivo(atlas: Atlas, emissivos: number[] = []): Uint8ClampedArray {
  const saida = new Uint8ClampedArray(atlas.pixels.length);
  for (let i = 3; i < saida.length; i += 4) saida[i] = 255;
  const mascaras = tema().mascarasBrilho ?? {};
  for (const tile of atlas.tiles) {
    if (!tile.emissivo && !emissivos.includes(tile.bloco)) continue;
    const mascara = mascaras[tile.nome];
    const ox = (tile.indice % COLUNAS) * CELULA;
    const oy = Math.floor(tile.indice / COLUNAS) * CELULA;
    for (let y = 0; y < CELULA; y++) {
      for (let x = 0; x < CELULA; x++) {
        const i = ((oy + y) * atlas.largura + ox + x) * 4;
        if (atlas.pixels[i + 3] === 0) continue;
        // máscara do tema: só a parte marcada brilha (o rosto da cabaça, não a casca)
        if (
          mascara &&
          !mascara(
            Math.min(TAM_TILE - 1, Math.max(0, x - PADDING)),
            Math.min(TAM_TILE - 1, Math.max(0, y - PADDING)),
          )
        )
          continue;
        const r = atlas.pixels[i];
        const g = atlas.pixels[i + 1];
        const b = atlas.pixels[i + 2];
        if (Math.max(r, g, b) - Math.min(r, g, b) < 50) continue;
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
