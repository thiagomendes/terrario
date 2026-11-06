import { describe, expect, it } from 'vitest';
import { GLIFOS, pixelsDoTexto } from '../../src/ui/titulo';

describe('logo do título', () => {
  it('tem glifo 5x7 para cada letra de BRUMALUZ', () => {
    for (const ch of 'BRUMALUZ') {
      const g = GLIFOS[ch];
      expect(g, ch).toHaveLength(7);
      expect(g.every((l) => l.length === 5)).toBe(true);
    }
  });

  it('espaça as letras com uma coluna vazia', () => {
    const pts = pixelsDoTexto('BRUMALUZ');
    expect(Math.max(...pts.map((p) => p.x))).toBe(8 * 6 - 2);
    expect(pts.some((p) => p.x % 6 === 5)).toBe(false);
  });
});
