import { describe, expect, it } from 'vitest';
import { criarPoolParticulas } from '../../src/fx/particulas';

describe('partículas com o mundo', () => {
  it('caem e param no chão sem atravessar', () => {
    const pool = criarPoolParticulas(4);
    pool.emitir([{ x: 0.5, y: 1.5, z: 0.5, vx: 0, vy: 0, vz: 0, cor: [1, 1, 1] }]);
    const chao = (_x: number, y: number) => y < 1;
    for (let i = 0; i < 30; i++) pool.atualizar(0.016, chao);
    expect(pool.posicoes[1]).toBeGreaterThanOrEqual(1);
  });
  it('lascas que nascem dentro do bloco saem livres', () => {
    const pool = criarPoolParticulas(4);
    pool.emitir([{ x: 0.5, y: 0.5, z: 0.5, vx: 3, vy: 2, vz: 0, cor: [1, 1, 1] }]);
    const bloco = (x: number, y: number, z: number) => x === 0 && y === 0 && z === 0;
    for (let i = 0; i < 10; i++) pool.atualizar(0.016, bloco);
    expect(pool.posicoes[0]).toBeGreaterThan(0.7);
  });
});
