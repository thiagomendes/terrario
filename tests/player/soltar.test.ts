import { describe, expect, it } from 'vitest';
import {
  SOLTAR_CIMA,
  criarJogador,
  passoFisica,
  soltarDoBloco,
  type Solido,
} from '../../src/player/fisica';

/**
 * Spec 037 (T02): quem começa o passo dentro de um bloco sai para o lugar livre mais perto,
 * primeiro na mesma altura (a até 1 bloco), depois subindo (até 6). Antes, a física não andava
 * nem pulava começando dentro de um sólido: a criança ficava presa.
 */

/** Chão em y < 10 e os blocos postos (as chaves "x,y,z"). */
function mundo(postos: string[]): Solido {
  const s = new Set(postos);
  return ((x: number, y: number, z: number) => y < 10 || s.has(`${x},${y},${z}`)) as Solido;
}
const andar = { frente: 1, direita: 0, pular: false, correr: false, yaw: 0.3 };

describe('o soltar', () => {
  it('sem o soltar, dentro do bloco ela não anda nem pula (o defeito da queixa)', () => {
    const s = mundo(['0,10,0', '0,11,0']);
    const j = criarJogador(0.5, 10, 0.5);
    j.noChao = true;
    for (let i = 0; i < 120; i++) passoFisica(j, { ...andar, pular: i % 10 === 0 }, 1 / 60, s);
    expect([j.x, j.y, j.z]).toEqual([0.5, 10, 0.5]);
  });

  it('o bloco posto em cima: sai de lado na mesma altura, a no máximo 1 bloco', () => {
    const s = mundo(['0,10,0', '0,11,0']);
    const j = criarJogador(0.5, 10, 0.5);
    expect(soltarDoBloco(j, s)).toBe(true);
    expect(j.y).toBe(10);
    expect(Math.hypot(j.x - 0.5, j.z - 0.5)).toBeLessThanOrEqual(1);
    expect(soltarDoBloco(j, s), 'livre: nada muda').toBe(false);
    // e anda de novo
    const x0 = j.x;
    const z0 = j.z;
    for (let i = 0; i < 30; i++) passoFisica(j, andar, 1 / 60, s);
    expect(Math.hypot(j.x - x0, j.z - z0)).toBeGreaterThan(0.5);
  });

  it('o lugar livre mais perto: o lado aberto, sem atravessar para longe', () => {
    // dentro de um bloco com parede dos dois lados em x; o lado aberto é z+
    const s = mundo([
      '0,10,0',
      '0,11,0',
      '1,10,0',
      '1,11,0',
      '-1,10,0',
      '-1,11,0',
      '0,10,-1',
      '0,11,-1',
      '1,10,-1',
      '1,11,-1',
      '-1,10,-1',
      '-1,11,-1',
    ]);
    const j = criarJogador(0.5, 10, 0.5);
    expect(soltarDoBloco(j, s)).toBe(true);
    expect(j.y).toBe(10);
    expect(j.z).toBeGreaterThan(0.5);
    expect(j.x).toBeCloseTo(0.5, 6);
  });

  it('no fundo de um poço tapado dos lados: sobe até o primeiro lugar livre, em cima do bloco', () => {
    const postos: string[] = [];
    for (let dx = -2; dx <= 2; dx++)
      for (let dz = -2; dz <= 2; dz++)
        for (const y of [10, 11, 12]) postos.push(`${dx},${y},${dz}`);
    const s = mundo(postos);
    const j = criarJogador(0.5, 10, 0.5);
    j.vy = -5;
    j.topoQueda = 30;
    expect(soltarDoBloco(j, s)).toBe(true);
    expect([j.x, j.y, j.z]).toEqual([0.5, 13, 0.5]);
    // sem queda herdada (nada de dano por ter sido solta)
    expect(j.vy).toBe(0);
    expect(j.topoQueda).toBeUndefined();
  });

  it('mais fundo que 6 blocos, sem lugar: fica onde está (nada de pulo enorme)', () => {
    const postos: string[] = [];
    for (let dx = -2; dx <= 2; dx++)
      for (let dz = -2; dz <= 2; dz++)
        for (let y = 10; y < 10 + SOLTAR_CIMA + 3; y++) postos.push(`${dx},${y},${dz}`);
    const j = criarJogador(0.5, 10, 0.5);
    expect(soltarDoBloco(j, mundo(postos))).toBe(false);
    expect([j.x, j.y, j.z]).toEqual([0.5, 10, 0.5]);
  });

  it('a laje: sai no meio bloco de cima, não um bloco inteiro acima', () => {
    // um bloco parcial de meia altura (caixa 0..0,5) nos pés, com parede em volta
    const postos: string[] = [];
    for (let dx = -2; dx <= 2; dx++)
      for (let dz = -2; dz <= 2; dz++)
        if (dx !== 0 || dz !== 0) for (const y of [10, 11, 12]) postos.push(`${dx},${y},${dz}`);
    const base = mundo(postos);
    const s = ((x: number, y: number, z: number) =>
      base(x, y, z) || (x === 0 && y === 10 && z === 0)) as Solido;
    s.caixas = (x, y, z) => (x === 0 && y === 10 && z === 0 ? [[0, 0, 0, 1, 0.5, 1]] : null);
    const j = criarJogador(0.5, 10.2, 0.5);
    expect(soltarDoBloco(j, s)).toBe(true);
    expect(j.y).toBe(10.5);
  });
});
