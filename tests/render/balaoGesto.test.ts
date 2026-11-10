import { describe, expect, it } from 'vitest';
import { medidaBalao, PERTO_MAXIMO, SOME_FIM, SOME_INICIO } from '../../src/render/balaoGesto';

/** Tamanho aparente na tela (proporcional a tamanho / distância). */
const naTela = (d: number) => medidaBalao(d, d).tamanho / d;

describe('balão do gesto (spec 015)', () => {
  it('na distância de sempre fica igual (0,75 bloco até 12, depois cresce)', () => {
    expect(medidaBalao(3.8, 3.8)).toEqual({ tamanho: 0.75, opacidade: 1 });
    expect(medidaBalao(PERTO_MAXIMO, 2.5)).toEqual({ tamanho: 0.75, opacidade: 1 });
    expect(medidaBalao(24, 24).tamanho).toBeCloseTo(1.5);
  });

  it('nunca fica enorme: perto da câmera, na tela não passa do tamanho da aproximação máxima', () => {
    const maximo = naTela(PERTO_MAXIMO);
    for (const d of [0.2, 0.5, 0.9, 1.2, 2, 2.4])
      expect(naTela(d)).toBeLessThanOrEqual(maximo + 1e-9);
  });

  it('colado na câmera ou atrás dela, some', () => {
    expect(medidaBalao(SOME_FIM, SOME_FIM).opacidade).toBe(0);
    expect(medidaBalao(1.1, 1.1).opacidade).toBeGreaterThan(0);
    expect(medidaBalao(1.1, 1.1).opacidade).toBeLessThan(1);
    expect(medidaBalao(SOME_INICIO, SOME_INICIO).opacidade).toBe(1);
    // atrás da câmera (ou de lado, colado no plano de perto)
    expect(medidaBalao(3, -1).opacidade).toBe(0);
    expect(medidaBalao(2, 0.1).opacidade).toBe(0);
  });
});
