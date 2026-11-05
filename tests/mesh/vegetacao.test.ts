import { describe, expect, it } from 'vitest';
import { gerarMalha } from '../../src/mesh/malha';
import { obterBloco } from '../../src/world/blocks';
import { ALTURA, TAM_X, TAM_Z, indice } from '../../src/world/chunk';

function chunkComPlantas(): Uint8Array {
  let planta = 0;
  for (let id = 1; id < 40; id++) {
    if (obterBloco(id)?.planta) {
      planta = id;
      break;
    }
  }
  const blocos = new Uint8Array(TAM_X * ALTURA * TAM_Z);
  for (let x = 0; x < 8; x++) {
    for (let z = 0; z < 8; z++) blocos[indice(x, 10, z)] = planta;
  }
  return blocos;
}

describe('vegetação refinada', () => {
  const blocos = chunkComPlantas();
  const a = gerarMalha(blocos).plantas;

  it('altura varia entre 0.8 e 1.2 e a malha é determinística', () => {
    const b = gerarMalha(blocos).plantas;
    expect(Array.from(b.posicoes)).toEqual(Array.from(a.posicoes));
    const alturas = new Set<number>();
    for (let v = 0; v < a.posicoes.length / 3; v += 4) {
      const h = a.posicoes[(v + 3) * 3 + 1] - a.posicoes[v * 3 + 1];
      expect(h).toBeGreaterThanOrEqual(0.8 - 1e-6);
      expect(h).toBeLessThanOrEqual(1.2 + 1e-6);
      alturas.add(Math.round(h * 1000));
    }
    expect(alturas.size).toBeGreaterThan(5);
  });

  it('escala dos quads fica entre 0.8 e 1.2 e varia; demais buffers são determinísticos', () => {
    const b = gerarMalha(blocos).plantas;
    expect(Array.from(b.normais)).toEqual(Array.from(a.normais));
    expect(Array.from(b.uvs)).toEqual(Array.from(a.uvs));
    expect(Array.from(b.cores)).toEqual(Array.from(a.cores));
    expect(Array.from(b.indices)).toEqual(Array.from(a.indices));
    const escalas = new Set<number>();
    for (let v = 0; v < a.posicoes.length / 3; v += 4) {
      const dx = a.posicoes[(v + 1) * 3] - a.posicoes[v * 3];
      const dz = a.posicoes[(v + 1) * 3 + 2] - a.posicoes[v * 3 + 2];
      const e = Math.hypot(dx, dz) / Math.SQRT2;
      expect(e).toBeGreaterThanOrEqual(0.8 - 1e-4);
      expect(e).toBeLessThanOrEqual(1.2 + 1e-4);
      escalas.add(Math.round(e * 1000));
    }
    expect(escalas.size).toBeGreaterThan(5);
  });

  it('tom varia entre posições e fica em 0..1', () => {
    const tons = new Set<number>();
    for (let i = 0; i < a.cores.length; i++) {
      expect(a.cores[i]).toBeGreaterThanOrEqual(0);
      expect(a.cores[i]).toBeLessThanOrEqual(1);
    }
    for (let i = 0; i < a.cores.length; i += 16) tons.add(Math.round(a.cores[i] * 1000));
    expect(tons.size).toBeGreaterThan(5);
  });

  it('alfa é 0 na base e 1 no topo', () => {
    for (let v = 0; v < a.posicoes.length / 3; v += 4) {
      expect(a.cores[v * 4 + 3]).toBe(0);
      expect(a.cores[(v + 1) * 4 + 3]).toBe(0);
      expect(a.cores[(v + 2) * 4 + 3]).toBe(1);
      expect(a.cores[(v + 3) * 4 + 3]).toBe(1);
    }
  });
});
