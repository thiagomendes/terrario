import { describe, expect, it } from 'vitest';
import { Bloco } from '../../src/world/blocks';
import { alvoDaEnxada, alvoDaSemente, podePlantar } from '../../src/jogo/plantio';

/** Um mundinho: terra arada em (0, 9, 0), grama em (1, 9, 0) com grama alta em cima. */
function mundo(extra: Record<string, number> = {}) {
  const m: Record<string, number> = {
    '0,9,0': Bloco.TERRA_ARADA,
    '1,9,0': Bloco.TERRA_MUSGOSA,
    '1,10,0': Bloco.GRAMA_ALTA,
    '2,9,0': Bloco.TERRA_ARADA,
    '2,10,0': Bloco.TRIGO_0,
    ...extra,
  };
  return (x: number, y: number, z: number) => m[`${x},${y},${z}`] ?? Bloco.AR;
}

describe('a semente vai no canteiro tocado', () => {
  it('tocando a terra arada por cima ou pela beirada: planta em cima dela', () => {
    const b = mundo();
    expect(alvoDaSemente({ x: 0, y: 9, z: 0 }, b)).toEqual({ x: 0, y: 10, z: 0 });
    const p = alvoDaSemente({ x: 0, y: 9, z: 0 }, b)!;
    expect(podePlantar(b(p.x, p.y - 1, p.z), b(p.x, p.y, p.z))).toBe(true);
  });

  it('grama alta em cima da terra arada: planta no lugar dela', () => {
    const b = mundo({ '0,10,0': Bloco.GRAMA_ALTA });
    expect(alvoDaSemente({ x: 0, y: 10, z: 0 }, b)).toEqual({ x: 0, y: 10, z: 0 });
  });

  it('fora do canteiro (grama, grama alta na grama, pedra): vale a regra comum', () => {
    const b = mundo();
    expect(alvoDaSemente({ x: 1, y: 9, z: 0 }, b)).toBeNull();
    expect(alvoDaSemente({ x: 1, y: 10, z: 0 }, b)).toBeNull();
  });

  it('a planta da lavoura não é canteiro livre (não planta por cima dela)', () => {
    const b = mundo();
    expect(alvoDaSemente({ x: 2, y: 10, z: 0 }, b)).toBeNull();
    // e a terra arada embaixo dela aponta a célula ocupada, que o podePlantar recusa
    const p = alvoDaSemente({ x: 2, y: 9, z: 0 }, b)!;
    expect(podePlantar(b(p.x, p.y - 1, p.z), b(p.x, p.y, p.z))).toBe(false);
  });

  it('a enxada na grama alta ara a grama de baixo (o toque na planta vale o chão)', () => {
    const b = mundo();
    expect(alvoDaEnxada({ x: 1, y: 10, z: 0 }, b)).toEqual({ x: 1, y: 9, z: 0 });
  });
});
