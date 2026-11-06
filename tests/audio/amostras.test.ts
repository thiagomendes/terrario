import { describe, expect, it } from 'vitest';
import { EVENTOS_MATERIAL, VARIACOES_AMOSTRA, sintetizarAmostra } from '../../src/audio/amostras';
import { GRUPOS_MATERIAL } from '../../src/audio/materiais';

describe('amostras de material', () => {
  it('todas existem, têm som e ficam dentro de [-1, 1]', () => {
    for (const ev of EVENTOS_MATERIAL)
      for (const g of GRUPOS_MATERIAL) {
        const a = sintetizarAmostra(ev, g, 0, 8000);
        const pico = a.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
        expect(pico, `${ev}/${g}`).toBeGreaterThan(0.5);
        expect(pico).toBeLessThanOrEqual(1);
        expect(Math.abs(a[a.length - 1])).toBeLessThan(0.01); // termina sem clique
      }
  });

  it('variações são diferentes entre si e determinísticas', () => {
    const a = sintetizarAmostra('quebra', 'pedra', 0, 8000);
    const b = sintetizarAmostra('quebra', 'pedra', 1, 8000);
    const a2 = sintetizarAmostra('quebra', 'pedra', 0, 8000);
    expect(a.some((x, i) => x !== b[i])).toBe(true);
    expect(a.every((x, i) => x === a2[i])).toBe(true);
    expect(VARIACOES_AMOSTRA).toBeGreaterThan(1);
  });

  it('quebrar soa mais longo que pisar (o volume de cada evento vem depois)', () => {
    const duracao = (x: Float32Array) => {
      let ult = 0;
      for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > 0.05) ult = i;
      return ult;
    };
    for (const g of GRUPOS_MATERIAL) {
      expect(duracao(sintetizarAmostra('quebra', g, 0, 8000)), g).toBeGreaterThan(
        duracao(sintetizarAmostra('passo', g, 0, 8000)),
      );
    }
  });
});
