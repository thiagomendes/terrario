import { describe, expect, it } from 'vitest';
import {
  CORRENDO,
  intervaloDoSom,
  quadroSomItens,
  sonsQueValem,
  type RelogiosSomItens,
  type SituacaoSomItens,
} from '../../src/audio/somItens';
import { perfilDoSom } from '../../src/audio/sons';

/**
 * Spec 036 (T07): os sons dos tesouros enquanto a criança brinca: cada um só quando faz sentido
 * (as rodinhas e o pedal montada e andando; a hélice correndo), espaçados e mais baixos que os
 * passos.
 */
const s = (extra: Partial<SituacaoSomItens> = {}): SituacaoSomItens => ({
  premium: {},
  montado: false,
  anda: 0,
  noChao: true,
  ativa: true,
  ...extra,
});

/** Quantas vezes cada som toca em `seg` segundos, a 60 quadros por segundo. */
function tocadas(sit: SituacaoSomItens, seg: number): Record<string, number> {
  const r: RelogiosSomItens = {};
  const n: Record<string, number> = {};
  for (let t = 0; t < seg; t += 1 / 60) for (const ev of quadroSomItens(r, sit, 1 / 60)) n[ev] = (n[ev] ?? 0) + 1;
  return n;
}

describe('spec 036 (T07): os sons dos tesouros', () => {
  it('as rodinhas e o pedal só montada e andando no chão', () => {
    const carrinho = { andar: 'carrinho-pedal' };
    expect(sonsQueValem(s({ premium: carrinho, montado: true, anda: 4 }))).toEqual(['rodinha', 'pedal']);
    expect(sonsQueValem(s({ premium: carrinho, montado: true, anda: 0 }))).toEqual([]);
    expect(sonsQueValem(s({ premium: carrinho, montado: false, anda: 4 }))).toEqual([]);
    expect(sonsQueValem(s({ premium: carrinho, montado: true, anda: 4, noChao: false }))).toEqual([]);
    expect(sonsQueValem(s({ premium: { andar: 'patinete-luz' }, montado: true, anda: 4 }))).toEqual(['rodinha']);
    expect(sonsQueValem(s({ premium: { andar: 'bicicletinha' }, montado: true, anda: 4 }))).toEqual(['pedal']);
    // a nuvem flutua calada
    expect(sonsQueValem(s({ premium: { andar: 'nuvem-fofa' }, montado: true, anda: 4 }))).toEqual([]);
  });

  it('a hélice só correndo; o foguete andando; a mão sempre', () => {
    expect(sonsQueValem(s({ premium: { chapeu: 'bone-helice' }, anda: 3 }))).toEqual([]);
    expect(sonsQueValem(s({ premium: { chapeu: 'bone-helice' }, anda: CORRENDO + 1 }))).toEqual(['helice']);
    expect(sonsQueValem(s({ premium: { costas: 'mochila-foguete' }, anda: 0 }))).toEqual([]);
    expect(sonsQueValem(s({ premium: { costas: 'mochila-foguete' }, anda: 3 }))).toEqual(['foguete']);
    for (const [mao, ev] of [
      ['varinha-bolhas', 'bolha'],
      ['guarda-chuva-gotinhas', 'gotinha'],
      ['pipa-lacinhos', 'pipa'],
    ])
      expect(sonsQueValem(s({ premium: { mao } }))).toEqual([ev]);
  });

  it('calados no modo foto ou com uma tela por cima', () => {
    expect(sonsQueValem(s({ premium: { mao: 'varinha-bolhas' }, ativa: false }))).toEqual([]);
  });

  it('espaçados: nunca mais de 2 por segundo, e o ritmo das rodinhas segue a velocidade', () => {
    const montada = s({ premium: { andar: 'carrinho-pedal', mao: 'varinha-bolhas', chapeu: 'bone-helice' }, montado: true, anda: 6 });
    for (const [ev, n] of Object.entries(tocadas(montada, 10))) expect(n / 10, ev).toBeLessThanOrEqual(2);
    expect(intervaloDoSom('rodinha', 2)).toBeGreaterThan(intervaloDoSom('rodinha', 6));
    // a varinha parada: umas 4 bolhas em 10 s
    expect(tocadas(s({ premium: { mao: 'varinha-bolhas' } }), 10).bolha).toBeGreaterThanOrEqual(3);
    expect(tocadas(s({ premium: { mao: 'varinha-bolhas' } }), 10).bolha).toBeLessThanOrEqual(5);
  });

  it('o som que volta a valer espera um pouco (não estoura na hora de começar a andar)', () => {
    const r: RelogiosSomItens = {};
    const andando = s({ premium: { andar: 'patinete-luz' }, montado: true, anda: 4 });
    expect(quadroSomItens(r, andando, 1 / 60)).toEqual([]);
    quadroSomItens(r, s({ premium: { andar: 'patinete-luz' }, montado: true, anda: 0 }), 1 / 60);
    expect(r.rodinha).toBeUndefined();
  });

  it('todos mais baixos que os passos', () => {
    const passo = perfilDoSom('passo', 'pedra').ganho;
    for (const ev of ['rodinha', 'pedal', 'helice', 'bolha', 'foguete', 'gotinha', 'pipa'] as const)
      expect(perfilDoSom(ev, 'pedra').ganho, ev).toBeLessThan(passo);
  });
});
