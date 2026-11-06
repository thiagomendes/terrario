import { describe, expect, it } from 'vitest';
import { anguloRelativo, corDaColuna, topoDaColuna } from '../../src/jogo/mapa';
import { Bloco } from '../../src/world/blocks';

describe('mapa', () => {
  it('topo ignora ar e plantas e conta a água por cima', () => {
    const col = (y: number) =>
      y < 50 ? Bloco.AREIA_BRUMA : y < 55 ? Bloco.AGUA : y === 55 ? Bloco.GRAMA_ALTA : 0;
    expect(topoDaColuna(col)).toEqual({ bloco: Bloco.AREIA_BRUMA, y: 49, agua: 5 });
  });

  it('relevo clareia encostas voltadas para a luz e a água azula', () => {
    const base: [number, number, number] = [100, 100, 100];
    expect(corDaColuna(base, 70, 68, 0)[0]).toBeGreaterThan(100);
    expect(corDaColuna(base, 68, 70, 0)[0]).toBeLessThan(100);
    const agua = corDaColuna(base, 60, 60, 6);
    expect(agua[2]).toBeGreaterThan(agua[0] + 30);
  });

  it('ângulo relativo: em frente 0, à direita positivo', () => {
    expect(anguloRelativo(0, 0, 0, 0, 10)).toBeCloseTo(0);
    expect(anguloRelativo(0, 0, 0, 10, 0)).toBeCloseTo(Math.PI / 2);
    expect(Math.abs(anguloRelativo(0, 0, 0, 0, -10))).toBeCloseTo(Math.PI);
  });
});
