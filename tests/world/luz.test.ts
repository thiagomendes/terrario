import { describe, expect, it } from 'vitest';
import { calcularLuz, LUZ_MAXIMA } from '../../src/world/luz';
import { ALTURA, TAM_X, TAM_Z, indice } from '../../src/world/chunk';
import { Bloco } from '../../src/world/blocks';
import { gerarMalha } from '../../src/mesh/malha';

function caverna(): Uint8Array {
  const c = new Uint8Array(TAM_X * ALTURA * TAM_Z).fill(Bloco.PEDRA_RACHADA);
  // sala fechada de 7x4x7 em y 20..23
  for (let y = 20; y < 24; y++)
    for (let z = 4; z < 11; z++) for (let x = 4; x < 11; x++) c[indice(x, y, z)] = Bloco.AR;
  return c;
}

describe('luz', () => {
  it('céu aberto vale 15 e uma sala fechada fica escura', () => {
    const vazio = new Uint8Array(TAM_X * ALTURA * TAM_Z);
    expect(calcularLuz(vazio).ceu(3, 10, 3)).toBe(LUZ_MAXIMA);
    const c = caverna();
    const viz = { xNeg: c, xPos: c, zNeg: c, zPos: c };
    const l = calcularLuz(c, viz);
    expect(l.ceu(7, 21, 7)).toBe(0);
    expect(l.bloco(7, 21, 7)).toBe(0);
  });

  it('a tocha ilumina a sala e cai 1 por bloco', () => {
    const c = caverna();
    c[indice(7, 20, 7)] = Bloco.TOCHA;
    const viz = { xNeg: c, xPos: c, zNeg: c, zPos: c };
    const l = calcularLuz(c, viz);
    expect(l.bloco(7, 20, 7)).toBe(14);
    expect(l.bloco(8, 20, 7)).toBe(13);
    expect(l.bloco(10, 20, 7)).toBe(11);
    expect(l.bloco(7, 30, 7)).toBe(0);
  });

  it('a malha leva a luz de blocos para os vértices', () => {
    const c = caverna();
    c[indice(7, 20, 7)] = Bloco.TOCHA;
    const viz = { xNeg: c, xPos: c, zNeg: c, zPos: c };
    const m = gerarMalha(c, viz).solido;
    let max = 0;
    for (let i = 1; i < m.luz.length; i += 2) max = Math.max(max, m.luz[i]);
    expect(max).toBeGreaterThan(0.7);
    expect(m.luz.length).toBe((m.posicoes.length / 3) * 2);
  });
});
