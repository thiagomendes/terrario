import { TAM_TILE } from '../../src/art/atlas';
import { describe, expect, it } from 'vitest';
import { gerarAtlas } from '../../src/art/atlas';
import {
  TETO_LUMINANCIA_EMISSIVA,
  construirMapaEmissivo,
  luminancia,
} from '../../src/render/emissivo';
import { Bloco } from '../../src/world/blocks';

const atlas = gerarAtlas();
const emissivos: number[] = [Bloco.CRISTAL_LUZ, Bloco.COGUMELO_BRILHANTE];
const mapa = construirMapaEmissivo(atlas, emissivos);

describe('emissivo', () => {
  it('exporta teto e luminância com os pesos da spec', () => {
    expect(TETO_LUMINANCIA_EMISSIVA).toBe(0.45);
    expect(luminancia(255, 255, 255)).toBeCloseTo(1, 5);
    expect(luminancia(0, 255, 0)).toBeCloseTo(0.7152, 5);
  });

  it('nenhum pixel passa do teto', () => {
    expect(mapa.length).toBe(atlas.pixels.length);
    for (let i = 0; i < mapa.length; i += 4) {
      expect(luminancia(mapa[i], mapa[i + 1], mapa[i + 2])).toBeLessThanOrEqual(
        TETO_LUMINANCIA_EMISSIVA,
      );
    }
  });

  it('limita um tile claro e preserva o matiz', () => {
    const c = atlas.tiles.find((x) => x.bloco === Bloco.CRISTAL_LUZ)!;
    const w = atlas.largura;
    const ox = Math.round(c.uv.u0 * w);
    const oy = Math.round(c.uv.v0 * atlas.altura);
    let reduzidos = 0;
    for (let y = 0; y < TAM_TILE; y++) {
      for (let x = 0; x < TAM_TILE; x++) {
        const i = ((oy + y) * w + ox + x) * 4;
        const [r, g, b] = [atlas.pixels[i], atlas.pixels[i + 1], atlas.pixels[i + 2]];
        const [mr, mg, mb] = [mapa[i], mapa[i + 1], mapa[i + 2]];
        expect(luminancia(mr, mg, mb)).toBeLessThanOrEqual(TETO_LUMINANCIA_EMISSIVA);
        if (luminancia(r, g, b) > TETO_LUMINANCIA_EMISSIVA) {
          reduzidos++;
          expect(mb).toBeLessThan(b);
          expect(Math.abs(mg / mb - g / b)).toBeLessThan(0.05);
          expect(Math.abs(mr / mb - r / b)).toBeLessThan(0.05);
        }
      }
    }
    expect(reduzidos).toBeGreaterThan(0);
  });

  it('tiles não emissivos ficam pretos e o cristal continua azul', () => {
    for (const t of atlas.tiles) {
      if (t.emissivo || emissivos.includes(t.bloco)) continue;
      const w = atlas.largura;
      const ox = Math.round(t.uv.u0 * w);
      const oy = Math.round(t.uv.v0 * atlas.altura);
      for (let y = 0; y < TAM_TILE; y++) {
        for (let x = 0; x < TAM_TILE; x++) {
          const i = ((oy + y) * w + ox + x) * 4;
          expect([mapa[i], mapa[i + 1], mapa[i + 2]]).toEqual([0, 0, 0]);
        }
      }
    }
    const c = atlas.tiles.find((t) => t.bloco === Bloco.CRISTAL_LUZ)!;
    const w = atlas.largura;
    const ox = Math.round(c.uv.u0 * w);
    const oy = Math.round(c.uv.v0 * atlas.altura);
    let r = 0;
    let b = 0;
    for (let y = 0; y < TAM_TILE; y++) {
      for (let x = 0; x < TAM_TILE; x++) {
        const i = ((oy + y) * w + ox + x) * 4;
        r += mapa[i];
        b += mapa[i + 2];
      }
    }
    expect(b).toBeGreaterThan(r);
  });
});
