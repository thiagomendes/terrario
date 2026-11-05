import { describe, expect, it } from 'vitest';
import { aplicarPorQuadro, chave, chunksDesejados, planejar } from '../../src/render/gerenciador';

describe('gerenciador de chunks', () => {
  it('calcula o conjunto desejado por raio, do mais próximo ao mais distante', () => {
    const d = chunksDesejados(0, 0, 2);
    expect(d[0]).toEqual({ cx: 0, cz: 0 });
    expect(d.length).toBe(13);
    expect(d.some((c) => c.cx === 2 && c.cz === 2)).toBe(false);
  });

  it('separa carregar e descartar', () => {
    const desejados = chunksDesejados(0, 0, 1);
    const plano = planejar([chave(0, 0), chave(9, 9)], desejados);
    expect(plano.descartar).toEqual(['9,9']);
    expect(plano.carregar.length).toBe(desejados.length - 1);
    expect(plano.carregar.some((c) => c.cx === 0 && c.cz === 0)).toBe(false);
  });

  it('limita os chunks aplicados por quadro', () => {
    const fila = [1, 2, 3, 4, 5];
    expect(aplicarPorQuadro(fila, 2)).toEqual([1, 2]);
    expect(fila).toEqual([3, 4, 5]);
  });
});
