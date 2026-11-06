import { describe, expect, it } from 'vitest';
import { criarAnimador, JANELA_GOLPE } from '../../src/player/animacao';

const parado = { velocidadeHoriz: 0, correndo: false, noChao: true };

function amplitude(correndo: boolean): number {
  const a = criarAnimador();
  let max = 0;
  for (let i = 0; i < 120; i++) {
    const p = a.atualizar(1 / 60, { velocidadeHoriz: 5, correndo, noChao: true });
    max = Math.max(max, Math.abs(p.pernaDireita));
  }
  return max;
}

describe('animador de poses', () => {
  it('fica neutro parado', () => {
    const a = criarAnimador();
    const p = a.atualizar(0.5, parado);
    expect(p.bracoDireito).toBe(0);
    expect(p.pernaDireita).toBe(0);
    expect(p.tronco).toBe(0);
  });

  it('andar balança braços e pernas em oposição e correr tem mais amplitude', () => {
    const a = criarAnimador();
    const p = a.atualizar(0.1, { velocidadeHoriz: 4, correndo: false, noChao: true });
    expect(p.pernaDireita).not.toBe(0);
    expect(p.pernaDireita).toBeCloseTo(-p.pernaEsquerda);
    expect(p.bracoEsquerdo).toBeCloseTo(-p.bracoDireito);
    expect(a.pose().pernaDireita).toBe(p.pernaDireita);
    expect(amplitude(true)).toBeGreaterThan(amplitude(false));
  });

  it('golpe move o braço direito e some após a janela', () => {
    const a = criarAnimador();
    a.evento('golpe');
    const p = a.atualizar(0.05, parado);
    expect(p.bracoDireito).not.toBe(0);
    const depois = a.atualizar(JANELA_GOLPE + 0.1, parado);
    expect(depois.bracoDireito).toBe(0);
  });

  it('colocacao empurra o braço por cerca de 0,2 s', () => {
    const a = criarAnimador();
    a.evento('colocacao');
    expect(a.atualizar(0.1, parado).bracoDireito).toBeLessThan(0);
    expect(a.atualizar(0.3, parado).bracoDireito).toBe(0);
  });

  it('pulo e aterrissagem afundam o tronco', () => {
    for (const ev of ['pulo', 'aterrissagem'] as const) {
      const a = criarAnimador();
      a.evento(ev);
      expect(a.atualizar(0.125, parado).tronco).toBeLessThan(0);
      expect(a.atualizar(0.3, parado).tronco).toBe(0);
    }
  });

  it('no ar flexiona as pernas', () => {
    const a = criarAnimador();
    const p = a.atualizar(0.1, { velocidadeHoriz: 0, correndo: false, noChao: false });
    expect(p.pernaDireita).not.toBe(0);
  });
});
