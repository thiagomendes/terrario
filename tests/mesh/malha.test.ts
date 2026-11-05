import { describe, expect, it } from 'vitest';
import { gerarMalha, type Buffers } from '../../src/mesh/malha';
import { Bloco } from '../../src/world/blocks';
import { ALTURA, TAM_X, TAM_Z, gerarChunk, indice } from '../../src/world/chunk';

function vazio(): Uint8Array {
  return new Uint8Array(TAM_X * ALTURA * TAM_Z);
}

function faces(b: Buffers): number {
  return b.indices.length / 6;
}

describe('malha de chunk', () => {
  it('bloco isolado gera 6 faces e adjacentes omitem a face comum', () => {
    const c = vazio();
    c[indice(5, 5, 5)] = Bloco.PEDRA_RACHADA;
    expect(faces(gerarMalha(c).solido)).toBe(6);
    c[indice(6, 5, 5)] = Bloco.PEDRA_RACHADA;
    expect(faces(gerarMalha(c).solido)).toBe(10);
  });

  it('borda consulta vizinhos', () => {
    const c = vazio();
    c[indice(15, 5, 5)] = Bloco.PEDRA_RACHADA;
    const viz = vazio();
    viz[indice(0, 5, 5)] = Bloco.PEDRA_RACHADA;
    expect(faces(gerarMalha(c).solido)).toBe(6);
    expect(faces(gerarMalha(c, { xPos: viz }).solido)).toBe(5);
    const viz2 = vazio();
    viz2[indice(15, 5, 5)] = Bloco.PEDRA_RACHADA;
    const c2 = vazio();
    c2[indice(0, 5, 5)] = Bloco.PEDRA_RACHADA;
    expect(faces(gerarMalha(c2, { xNeg: viz2 }).solido)).toBe(5);
  });

  it('AO vale 1 em área aberta e menos em canto côncavo', () => {
    const c = vazio();
    c[indice(5, 5, 5)] = Bloco.PEDRA_RACHADA;
    const aberto = gerarMalha(c).solido.cores;
    for (let i = 0; i < aberto.length; i += 4) expect(aberto[i]).toBe(1);

    c[indice(6, 6, 5)] = Bloco.PEDRA_RACHADA;
    const m = gerarMalha(c).solido;
    let min = 1;
    for (let i = 0; i < m.cores.length; i += 4) min = Math.min(min, m.cores[i]);
    expect(min).toBeLessThan(1);
  });

  it('plantas geram 2 quads em buffer separado', () => {
    const c = vazio();
    c[indice(3, 3, 3)] = Bloco.GRAMA_ALTA;
    const m = gerarMalha(c);
    expect(faces(m.plantas)).toBe(2);
    expect(m.solido.indices.length).toBe(0);
  });

  it('buffers consistentes e sem Babylon', () => {
    const m = gerarMalha(gerarChunk(0, 0));
    for (const b of [m.solido, m.plantas]) {
      const n = b.posicoes.length / 3;
      expect(b.normais.length).toBe(n * 3);
      expect(b.uvs.length).toBe(n * 2);
      expect(b.cores.length).toBe(n * 4);
      for (const i of b.indices) expect(i).toBeLessThan(n);
    }
    const fontes = import.meta.glob('../../src/mesh/*.ts', {
      eager: true,
      query: '?raw',
      import: 'default',
    }) as Record<string, string>;
    expect(Object.keys(fontes).length).toBeGreaterThan(0);
    for (const texto of Object.values(fontes)) {
      expect(texto).not.toContain('@babylonjs');
    }
  });
});
