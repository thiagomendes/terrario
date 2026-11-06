import { describe, expect, it } from 'vitest';
import { GLIFOS, pixelsDoTexto } from '../../src/ui/titulo';

describe('logo do título', () => {
  it('tem glifo 5x7 para cada letra de TERRARIO e BRUMALUZ', () => {
    for (const ch of 'TERRARIOBRUMALUZ') {
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

  it('desenha o acento do Á acima da letra, sem invadir a vizinha', () => {
    const pts = pixelsDoTexto('TERRÁRIO');
    const acento = pts.filter((p) => p.y < 0);
    expect(acento.length).toBe(2);
    // o Á é a quinta letra (colunas 24 a 28)
    for (const p of acento) expect(p.x >= 24 && p.x <= 28).toBe(true);
    expect(Math.max(...pts.map((p) => p.x))).toBe(8 * 6 - 2);
  });
});
