import { describe, expect, it } from 'vitest';
import { colar, copiar, criarHistorico, espelharX, pontosDaForma } from '../../src/jogo/construcao';

describe('construção assistida', () => {
  it('desfaz e refaz por lote, e uma ação nova limpa o refazer', () => {
    const h = criarHistorico();
    h.registrar([{ x: 0, y: 0, z: 0, antes: 0, depois: 2 }]);
    h.registrar([
      { x: 1, y: 0, z: 0, antes: 0, depois: 2 },
      { x: 2, y: 0, z: 0, antes: 0, depois: 2 },
    ]);
    expect(h.desfazer()).toHaveLength(2);
    expect(h.refazer()).toHaveLength(2);
    h.desfazer();
    h.registrar([{ x: 5, y: 0, z: 0, antes: 0, depois: 1 }]);
    expect(h.refazer()).toBeNull();
    h.registrar([{ x: 9, y: 0, z: 0, antes: 3, depois: 3 }]);
    expect(h.tamanho).toBe(2);
  });

  it('formas: caixa, paredes ocas, linha e esfera', () => {
    const a = { x: 0, y: 0, z: 0 };
    const b = { x: 2, y: 1, z: 2 };
    expect(pontosDaForma('preencher', a, b)).toHaveLength(18);
    expect(pontosDaForma('parede', a, b)).toHaveLength(16);
    expect(pontosDaForma('linha', a, { x: 4, y: 0, z: 0 })).toHaveLength(5);
    const esf = pontosDaForma('esfera', { x: -3, y: -3, z: -3 }, { x: 3, y: 3, z: 3 });
    expect(esf.length).toBeGreaterThan(100);
    expect(esf.length).toBeLessThan(343);
    expect(pontosDaForma('preencher', a, { x: 100, y: 100, z: 100 })).toEqual([]);
  });

  it('espelho e blueprint com giro', () => {
    expect(espelharX({ x: 3, y: 1, z: 2 }, 5)).toEqual({ x: 7, y: 1, z: 2 });
    const mundo = new Map([
      ['0,0,0', 2],
      ['1,0,0', 3 | (1 << 8)],
    ]);
    const bp = copiar(
      't',
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      (x, y, z) => mundo.get(`${x},${y},${z}`) ?? 0,
    )!;
    expect(bp.w).toBe(2);
    const girado = colar(bp, { x: 10, y: 5, z: 10 }, 1);
    expect(girado.map((e) => e.p)).toEqual([
      { x: 10, y: 5, z: 10 },
      { x: 10, y: 5, z: 11 },
    ]);
    expect((girado[1].v >> 8) & 3).toBe(2);
  });
});
