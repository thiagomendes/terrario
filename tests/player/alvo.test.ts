import { describe, expect, it } from 'vitest';
import { colocacaoBloqueada, posicaoColocacao, raycastVoxel } from '../../src/player/alvo';

const bloco = (bx: number, by: number, bz: number) => (x: number, y: number, z: number) =>
  x === bx && y === by && z === bz;

describe('raycastVoxel', () => {
  it('acerta alinhado ao eixo com distancia e normal', () => {
    const r = raycastVoxel({ x: 0.5, y: 0.5, z: 0.5 }, { x: 1, y: 0, z: 0 }, 5, bloco(3, 0, 0));
    expect(r).toMatchObject({ x: 3, y: 0, z: 0, normal: { x: -1, y: 0, z: 0 } });
    expect(r!.distancia).toBeCloseTo(2.5);
  });

  it('retorna null além do alcance ou sem bloco', () => {
    expect(
      raycastVoxel({ x: 0.5, y: 0.5, z: 0.5 }, { x: 1, y: 0, z: 0 }, 5, bloco(7, 0, 0)),
    ).toBeNull();
    expect(
      raycastVoxel({ x: 0.5, y: 0.5, z: 0.5 }, { x: 0, y: 1, z: 0 }, 5, () => false),
    ).toBeNull();
  });

  it('funciona em diagonal e em coordenadas negativas', () => {
    const r = raycastVoxel(
      { x: -0.5, y: 0.5, z: -0.5 },
      { x: -1, y: 0, z: -1 },
      5,
      bloco(-3, 0, -3),
    );
    expect(r).toMatchObject({ x: -3, y: 0, z: -3 });
    const c = raycastVoxel({ x: 0.5, y: 5.5, z: 0.5 }, { x: 0, y: -1, z: 0 }, 5, bloco(0, 1, 0));
    expect(c).toMatchObject({ y: 1, normal: { x: 0, y: 1, z: 0 } });
  });
});

describe('colocação', () => {
  it('posicaoColocacao é o vizinho na face', () => {
    expect(posicaoColocacao({ x: 2, y: 3, z: -1, normal: { x: 0, y: 1, z: 0 } })).toEqual({
      x: 2,
      y: 4,
      z: -1,
    });
  });

  it('colocacaoBloqueada considera pés e cabeça', () => {
    const j = { x: 0.5, y: 10, z: 0.5 };
    expect(colocacaoBloqueada({ x: 0, y: 10, z: 0 }, j)).toBe(true);
    expect(colocacaoBloqueada({ x: 0, y: 11, z: 0 }, j)).toBe(true);
    expect(colocacaoBloqueada({ x: 0, y: 9, z: 0 }, j)).toBe(false);
    expect(colocacaoBloqueada({ x: 0, y: 12, z: 0 }, j)).toBe(false);
    expect(colocacaoBloqueada({ x: 2, y: 10, z: 0 }, j)).toBe(false);
  });
});
