import { describe, expect, it } from 'vitest';
import { DIRECAO_SOL, PALETA } from '../../src/render/atmosfera';

describe('atmosfera', () => {
  it('todas as cores da paleta ficam entre 0 e 1', () => {
    for (const cor of Object.values(PALETA)) {
      expect(cor).toHaveLength(3);
      for (const c of cor) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
    }
  });

  it('a névoa tem a cor do horizonte', () => {
    expect(PALETA.nevoa).toEqual(PALETA.ceuHorizonte);
  });

  it('o sol aponta para baixo', () => {
    expect(DIRECAO_SOL[1]).toBeLessThan(0);
  });
});
