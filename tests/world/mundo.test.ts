import { describe, expect, it } from 'vitest';
import { Bloco, REGISTRO_BLOCOS } from '../../src/world/blocks';
import { ALTURA, TAM_X, TAM_Z, gerarChunk } from '../../src/world/chunk';

describe('registro', () => {
  it('tem 7 blocos, 3 plantas e cristal emissivo', () => {
    expect(REGISTRO_BLOCOS.filter((b) => b.id > 0 && !b.planta)).toHaveLength(7);
    expect(REGISTRO_BLOCOS.filter((b) => b.planta)).toHaveLength(3);
    expect(REGISTRO_BLOCOS[Bloco.CRISTAL_LUZ].emissivo).toBe(true);
  });
});

describe('gerarChunk', () => {
  it('é determinístico e varia com a semente', () => {
    expect(gerarChunk(2, 3, 5)).toEqual(gerarChunk(2, 3, 5));
    expect(gerarChunk(2, 3, 5)).not.toEqual(gerarChunk(2, 3, 6));
  });

  it('tem 16x16x64 e só blocos do registro', () => {
    const c = gerarChunk(0, 0);
    expect(c.length).toBe(TAM_X * ALTURA * TAM_Z);
    expect(c.every((b) => b < REGISTRO_BLOCOS.length)).toBe(true);
  });

  it('5x5 chunks têm areia, árvores, vegetação e cristal', () => {
    const contagem = new Map<number, number>();
    for (let cz = -2; cz <= 2; cz++) {
      for (let cx = -2; cx <= 2; cx++) {
        for (const b of gerarChunk(cx, cz)) contagem.set(b, (contagem.get(b) ?? 0) + 1);
      }
    }
    for (const id of [
      Bloco.AREIA_BRUMA,
      Bloco.MADEIRA_RETORCIDA,
      Bloco.FOLHAGEM,
      Bloco.GRAMA_ALTA,
      Bloco.FLOR,
      Bloco.CRISTAL_LUZ,
    ]) {
      expect(contagem.get(id) ?? 0).toBeGreaterThan(0);
    }
  });
});
