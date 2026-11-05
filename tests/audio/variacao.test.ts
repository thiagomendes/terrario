import { describe, expect, it } from 'vitest';
import { criarGerador, criarVariador, jitter } from '../../src/audio/variacao';

function sequencia(semente: number, qtd: number, n = 4): number[] {
  const v = criarVariador(semente, n);
  return Array.from({ length: qtd }, () => v());
}

describe('criarVariador', () => {
  it('fica em 0..n-1 e nunca repete seguido', () => {
    const s = sequencia(7, 1000);
    s.forEach((x, i) => {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(4);
      expect(Number.isInteger(x)).toBe(true);
      if (i > 0) expect(x).not.toBe(s[i - 1]);
    });
    expect(new Set(s).size).toBe(4);
  });

  it('mesma semente repete, sementes diferentes divergem', () => {
    expect(sequencia(5, 50)).toEqual(sequencia(5, 50));
    expect(sequencia(5, 50)).not.toEqual(sequencia(6, 50));
  });
});

describe('jitter', () => {
  it('fica no intervalo com média perto do centro', () => {
    const rng = criarGerador(3);
    let soma = 0;
    for (let i = 0; i < 1000; i++) {
      const x = jitter(rng, 10, 2);
      expect(x).toBeGreaterThanOrEqual(8);
      expect(x).toBeLessThanOrEqual(12);
      soma += x;
    }
    expect(Math.abs(soma / 1000 - 10)).toBeLessThan(0.2);
  });
});
