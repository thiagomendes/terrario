import { describe, expect, it } from 'vitest';
import {
  arestasDoBloco,
  COR_DESTAQUE,
  estadoDestaque,
  razaoContraste,
} from '../../src/render/destaque';
import { PALETA } from '../../src/render/atmosfera';

describe('destaque', () => {
  it('devolve 12 arestas com extremos expandidos pela margem', () => {
    const m = 0.01;
    const arestas = arestasDoBloco(3, 10, -2, m);
    expect(arestas).toHaveLength(12);
    const pontos = arestas.flat();
    const xs = pontos.map((p) => p[0]);
    const ys = pontos.map((p) => p[1]);
    const zs = pontos.map((p) => p[2]);
    expect(Math.min(...xs)).toBeCloseTo(3 - m);
    expect(Math.max(...xs)).toBeCloseTo(4 + m);
    expect(Math.min(...ys)).toBeCloseTo(10 - m);
    expect(Math.max(...ys)).toBeCloseTo(11 + m);
    expect(Math.min(...zs)).toBeCloseTo(-2 - m);
    expect(Math.max(...zs)).toBeCloseTo(-1 + m);
  });

  it('estadoDestaque liga, posiciona e desliga conforme o alvo', () => {
    const off = estadoDestaque(null);
    expect(off.visivel).toBe(false);
    expect(off.arestas).toHaveLength(0);
    const a = estadoDestaque({ x: 1, y: 2, z: 3 });
    const b = estadoDestaque({ x: 1, y: 2, z: 4 });
    expect(a.visivel).toBe(true);
    expect(a.arestas).toHaveLength(12);
    expect(Math.min(...a.arestas.flat().map((p) => p[2]))).toBeLessThan(3);
    expect(a.chave).not.toBe(b.chave);
    expect(a.chave).not.toBe(off.chave);
  });

  it('cor âmbar claro com contraste de pelo menos 3 contra a sombra', () => {
    const [r, g, b] = COR_DESTAQUE;
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
    expect(razaoContraste(COR_DESTAQUE, PALETA.sombra)).toBeGreaterThanOrEqual(3);
  });
});
