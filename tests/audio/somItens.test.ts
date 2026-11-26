import { describe, expect, it } from 'vitest';
import {
  CORRENDO,
  SOM_DO_BRINQUEDO,
  intervaloDoSom,
  quadroSomItens,
  sonsQueValem,
  type RelogiosSomItens,
  type SituacaoSomItens,
} from '../../src/audio/somItens';
import { perfilDoSom, SONS_NOVOS_019 } from '../../src/audio/sons';
import { IDS_ANDAR } from '../../src/personagem/brinquedoAndar';
import { ICONES_ANDAR, NOME_ANDAR } from '../../src/ui/iconesAndar';
import { PREMIUM } from '../../src/jogo/alma';

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

describe('spec 038 (T05): a motoquinha dourada ligada como os outros de andar', () => {
  it('todo brinquedo de andar tem nome, ícone e som de montar (os Record<string> não avisam a falta)', () => {
    const doCatalogo = PREMIUM.filter((p) => p.categoria === 'andar').map((p) => p.id);
    expect(doCatalogo).toContain('motoquinha-dourada');
    for (const id of IDS_ANDAR) {
      expect(NOME_ANDAR[id], id).toMatch(/^Andar /);
      expect(ICONES_ANDAR[id], id).toMatch(/^<svg viewBox="0 0 32 32"/);
      expect(SOM_DO_BRINQUEDO[id], id).toBeDefined();
      // o som de montar passa pela régua da 019 (somResto.test.ts: curto e abaixo do golpe)
      expect(SONS_NOVOS_019, id).toContain(SOM_DO_BRINQUEDO[id]);
    }
    // cada um com o seu som (nenhum repetido)
    expect(new Set(IDS_ANDAR.map((id) => SOM_DO_BRINQUEDO[id])).size).toBe(IDS_ANDAR.length);
  });

  it('o "vrum" é só ao montar, baixinho (abaixo da buzininha) e curto; andando, só as rodinhas', () => {
    expect(SOM_DO_BRINQUEDO['motoquinha-dourada']).toBe('vrum');
    const vrum = perfilDoSom('vrum', 'pedra');
    expect(vrum.ganho).toBeLessThanOrEqual(perfilDoSom('buzininha', 'pedra').ganho);
    expect(vrum.duracao).toBeLessThanOrEqual(0.5);
    const moto = { andar: 'motoquinha-dourada' };
    expect(sonsQueValem(s({ premium: moto, montado: true, anda: 4 }))).toEqual(['rodinha']);
    expect(sonsQueValem(s({ premium: moto, montado: true, anda: 0 }))).toEqual([]);
    expect(sonsQueValem(s({ premium: moto, montado: false, anda: 4 }))).toEqual([]);
    // nada de motor andando: em 10 s correndo, nenhum "vrum"
    expect(tocadas(s({ premium: moto, montado: true, anda: 6 }), 10).vrum).toBeUndefined();
  });
});
