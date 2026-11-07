import { describe, expect, it } from 'vitest';
import { dadosCaixaArredondada } from '../../src/render/formas';

describe('caixa arredondada de brinquedo', () => {
  it('cabe exatamente na caixa pedida e tem os cantos redondos', () => {
    const v = dadosCaixaArredondada(0.6, 0.4, 0.2, 0.08, 4);
    const p = v.positions as number[];
    let mx = 0,
      my = 0,
      mz = 0;
    for (let i = 0; i < p.length; i += 3) {
      mx = Math.max(mx, Math.abs(p[i]));
      my = Math.max(my, Math.abs(p[i + 1]));
      mz = Math.max(mz, Math.abs(p[i + 2]));
    }
    expect(mx).toBeCloseTo(0.3, 6);
    expect(my).toBeCloseTo(0.2, 6);
    expect(mz).toBeCloseTo(0.1, 6);
    // no canto, nenhum vértice chega à quina viva (seria 0.3, 0.2, 0.1 ao mesmo tempo)
    for (let i = 0; i < p.length; i += 3)
      expect(
        Math.abs(p[i]) > 0.299 && Math.abs(p[i + 1]) > 0.199 && Math.abs(p[i + 2]) > 0.099,
      ).toBe(false);
  });
  it('normais unitárias e triângulos virados para fora (regra do Babylon)', () => {
    const v = dadosCaixaArredondada(1, 1, 1, 0.2, 3);
    const p = v.positions as number[];
    const n = v.normals as number[];
    const ix = v.indices as number[];
    for (let i = 0; i < n.length; i += 3)
      expect(Math.hypot(n[i], n[i + 1], n[i + 2])).toBeCloseTo(1, 5);
    let fora = 0;
    for (let t = 0; t < ix.length; t += 3) {
      const [a, b, c] = [ix[t], ix[t + 1], ix[t + 2]];
      const u = [p[b * 3] - p[a * 3], p[b * 3 + 1] - p[a * 3 + 1], p[b * 3 + 2] - p[a * 3 + 2]];
      const w = [p[c * 3] - p[a * 3], p[c * 3 + 1] - p[a * 3 + 1], p[c * 3 + 2] - p[a * 3 + 2]];
      const cr = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      const area = Math.hypot(cr[0], cr[1], cr[2]);
      if (area < 1e-12) continue; // triângulos degenerados no canto
      const cx = (p[a * 3] + p[b * 3] + p[c * 3]) / 3;
      const cy = (p[a * 3 + 1] + p[b * 3 + 1] + p[c * 3 + 1]) / 3;
      const cz = (p[a * 3 + 2] + p[b * 3 + 2] + p[c * 3 + 2]) / 3;
      if (cr[0] * cx + cr[1] * cy + cr[2] * cz < 0) fora++;
    }
    expect(fora).toBeGreaterThan(0);
    expect(fora).toBe(ix.length / 3 - contarDegenerados(p, ix));
  });
});

function contarDegenerados(p: number[], ix: number[]): number {
  let d = 0;
  for (let t = 0; t < ix.length; t += 3) {
    const [a, b, c] = [ix[t], ix[t + 1], ix[t + 2]];
    const u = [p[b * 3] - p[a * 3], p[b * 3 + 1] - p[a * 3 + 1], p[b * 3 + 2] - p[a * 3 + 2]];
    const w = [p[c * 3] - p[a * 3], p[c * 3 + 1] - p[a * 3 + 1], p[c * 3 + 2] - p[a * 3 + 2]];
    const cr = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    if (Math.hypot(cr[0], cr[1], cr[2]) < 1e-12) d++;
  }
  return d;
}
