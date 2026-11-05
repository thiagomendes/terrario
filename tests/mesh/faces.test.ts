import { describe, expect, it } from 'vitest';
import { gerarAtlas } from '../../src/art/atlas';
import { gerarMalha } from '../../src/mesh/malha';
import { Bloco } from '../../src/world/blocks';
import { ALTURA, TAM_X, TAM_Z, indice } from '../../src/world/chunk';

function celula(atlas: ReturnType<typeof gerarAtlas>, uv: { u0: number; v0: number }) {
  const out: number[] = [];
  const x0 = Math.round(uv.u0 * atlas.largura);
  const y0 = Math.round(uv.v0 * atlas.altura);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const i = ((y0 + y) * atlas.largura + x0 + x) * 4;
      out.push(atlas.pixels[i], atlas.pixels[i + 1], atlas.pixels[i + 2]);
    }
  }
  return out;
}

describe('materiais por face', () => {
  const atlas = gerarAtlas(1337);

  it('uvDaFace igual a uvDoBloco sem variação', () => {
    for (const face of ['topo', 'lado', 'base'] as const) {
      expect(atlas.uvDaFace(Bloco.PEDRA_RACHADA, face)).toEqual(
        atlas.uvDoBloco(Bloco.PEDRA_RACHADA),
      );
    }
    expect(atlas.uvDaFace(Bloco.TERRA_MUSGOSA, 'lado')).toEqual(
      atlas.uvDoBloco(Bloco.TERRA_MUSGOSA),
    );
  });

  it('topo difere do lado em terra musgosa e madeira', () => {
    for (const b of [Bloco.TERRA_MUSGOSA, Bloco.MADEIRA_RETORCIDA]) {
      const topo = celula(atlas, atlas.uvDaFace(b, 'topo')!);
      const lado = celula(atlas, atlas.uvDaFace(b, 'lado')!);
      expect(topo).not.toEqual(lado);
    }
  });

  it('atlas determinístico', () => {
    expect(Array.from(gerarAtlas(1337).pixels)).toEqual(Array.from(atlas.pixels));
  });

  it('malha usa UV de topo em +Y e de lado nas laterais', () => {
    const c = new Uint8Array(TAM_X * ALTURA * TAM_Z);
    c[indice(5, 5, 5)] = Bloco.TERRA_MUSGOSA;
    const { uvs, normais } = gerarMalha(c).solido;
    const topo = atlas.uvDaFace(Bloco.TERRA_MUSGOSA, 'topo')!;
    const lado = atlas.uvDaFace(Bloco.TERRA_MUSGOSA, 'lado')!;
    const centro = (uv: { u0: number; u1: number; v0: number; v1: number }) => [
      (uv.u0 + uv.u1) / 2,
      (uv.v0 + uv.v1) / 2,
    ];
    let vistosTopo = 0;
    let vistosLado = 0;
    for (let v = 0; v < normais.length / 3; v++) {
      const ny = normais[v * 3 + 1];
      const alvo = ny > 0 ? topo : lado;
      if (ny < 0) continue;
      const [cu, cv] = centro(alvo);
      expect(Math.abs(uvs[v * 2] - cu)).toBeLessThan(0.25);
      expect(Math.abs(uvs[v * 2 + 1] - cv)).toBeLessThan(0.34);
      if (ny > 0) vistosTopo++;
      else vistosLado++;
    }
    expect(vistosTopo).toBe(4);
    expect(vistosLado).toBe(16);
  });
});
