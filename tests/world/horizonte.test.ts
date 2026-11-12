import { describe, expect, it } from 'vitest';
import {
  ALTURA_JANELAS,
  DISTANCIA_MINIMA_HORIZONTE,
  LARGURA_JANELAS,
  RAIO_HORIZONTE,
  centroDoAnel,
  geometriaDoHorizonte,
  presencaDoHorizonte,
  texturaDeJanelas,
} from '../../src/world/horizonte';

/** Spec 014 (T10): o horizonte de torres ao longe, barato e sempre longe. */
describe('horizonte da cidade', () => {
  it('uns 1.500 triângulos, num anel de 260 a 320 blocos, e o mesmo para a mesma semente', () => {
    const g = geometriaDoHorizonte(1337);
    expect(g.triangulos).toBeGreaterThan(1100);
    expect(g.triangulos).toBeLessThanOrEqual(1700);
    expect(g.indices.length).toBe(g.triangulos * 3);
    for (let i = 0; i < g.posicoes.length; i += 3) {
      const r = Math.hypot(g.posicoes[i], g.posicoes[i + 2]);
      expect(r).toBeGreaterThan(RAIO_HORIZONTE[0] - 16);
      expect(r).toBeLessThan(RAIO_HORIZONTE[1] + 16);
    }
    expect(geometriaDoHorizonte(1337).posicoes).toEqual(g.posicoes);
    expect(geometriaDoHorizonte(7).posicoes).not.toEqual(g.posicoes);
  });

  it('a textura das janelas tem 64 KB e o canto (0, 0) é parede', () => {
    const t = texturaDeJanelas(1337);
    expect(t.length).toBe(LARGURA_JANELAS * ALTURA_JANELAS * 4);
    expect(t.length).toBe(64 * 1024);
    expect(t[0]).toBe(0);
    let acesas = 0;
    for (let i = 0; i < t.length; i += 4) if (t[i] && t[i + 1]) acesas++;
    expect(acesas).toBeGreaterThan(0);
  });

  it('quem anda para fora nunca chega a menos de 120 blocos do anel', () => {
    const g = geometriaDoHorizonte(1337);
    for (const d of [0, 100, 140, 200, 400, 1000])
      for (const a of [0, 1.3, 2.9, 4.4]) {
        const px = Math.cos(a) * d;
        const pz = Math.sin(a) * d;
        const [cx, cz] = centroDoAnel(0, 0, px, pz);
        let perto = Infinity;
        for (let i = 0; i < g.posicoes.length; i += 3)
          perto = Math.min(perto, Math.hypot(g.posicoes[i] + cx - px, g.posicoes[i + 2] + cz - pz));
        expect(perto, `a ${d} do centro`).toBeGreaterThan(DISTANCIA_MINIMA_HORIZONTE - 16);
      }
  });

  it('perto da cidade aparece inteiro; bem longe some na névoa', () => {
    expect(presencaDoHorizonte(0)).toBe(1);
    expect(presencaDoHorizonte(300)).toBe(1);
    expect(presencaDoHorizonte(430)).toBeGreaterThan(0);
    expect(presencaDoHorizonte(430)).toBeLessThan(1);
    expect(presencaDoHorizonte(600)).toBe(0);
  });
});
