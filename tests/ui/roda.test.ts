import { describe, expect, it } from 'vitest';
import { teclaDaRoda } from '../../src/ui/roda';
import { GESTOS, gestosLiberados } from '../../src/personagem/gestos';
import { FUNCOES_JOGO } from '../../src/ui/atalhos';
import { SEGURAR_GESTOS, itensDoMenu, teclaDoGesto } from '../../src/ui/menuRoda';

/**
 * O menu da spec 015 (as listas e as teclas). Spec 033: quem mostra é a roleta de baixo
 * (tests/ui/roleta.test.ts); a roda em volta do boneco saiu.
 */
describe('menu de botões (spec 015)', () => {
  it('teclas: G alterna; aberto, Esc fecha e 1 a 8 escolhem; fechado, os números são da barra', () => {
    expect(teclaDaRoda('KeyG', false, 8)).toEqual({ acao: 'alternar' });
    expect(teclaDaRoda('KeyG', true, 8)).toEqual({ acao: 'alternar' });
    expect(teclaDaRoda('Digit1', false, 8)).toBeNull();
    expect(teclaDaRoda('Escape', false, 8)).toBeNull();
    expect(teclaDaRoda('Escape', true, 8)).toEqual({ acao: 'fechar' });
    expect(teclaDaRoda('Digit1', true, 8)).toEqual({ acao: 'escolher', i: 0 });
    expect(teclaDaRoda('Digit8', true, 8)).toEqual({ acao: 'escolher', i: 7 });
    expect(teclaDaRoda('Numpad3', true, 8)).toEqual({ acao: 'escolher', i: 2 });
    expect(teclaDaRoda('Digit9', true, 8)).toBeNull();
    // spec 023: com os 10 gestos, o 9 e o 0 (o décimo)
    expect(teclaDaRoda('Digit9', true, 10)).toEqual({ acao: 'escolher', i: 8 });
    expect(teclaDaRoda('Digit0', true, 10)).toEqual({ acao: 'escolher', i: 9 });
    expect(teclaDaRoda('Digit0', true, 8)).toBeNull();
    expect(teclaDaRoda('KeyW', true, 8)).toBeNull();
  });

  it('o selinho de cada gesto é a tecla que o escolhe, e o 11º fica sem (spec 034)', () => {
    const vila = gestosLiberados(10, 'vila-neon');
    expect(vila).toHaveLength(11);
    const selos = vila.map((_, i) => teclaDoGesto(i));
    expect(selos).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', undefined]);
    // nenhum selinho repetido, e cada um escolhe o seu gesto
    expect(new Set(selos.filter(Boolean)).size).toBe(10);
    selos.forEach((s, i) => {
      if (s) expect(teclaDaRoda(`Digit${s}`, true, vila.length)).toEqual({ acao: 'escolher', i });
    });
  });

  it('os gestos têm os 8 (e os 2 de presente) e a barra do computador tem a carinha', () => {
    // spec 026: o "roqueiro" é o 11º, mas só entra nos gestos da Vila Neon
    expect(GESTOS).toHaveLength(11);
    expect(gestosLiberados(10)).toHaveLength(10);
    expect(gestosLiberados(10, 'vila-neon').map((x) => x.id)).toContain('roqueiro');
    expect(gestosLiberados(1, 'vila-neon').map((x) => x.id)).toContain('roqueiro');
    const g = FUNCOES_JOGO.filter((f) => f.codigo === 'KeyG');
    expect(g).toEqual([{ codigo: 'KeyG', tecla: 'G', nome: 'Gestos', icone: 'carinha' }]);
  });

  it('menu da opção C: os itens do esboço, cada um com a tecla de sempre', () => {
    expect(itensDoMenu(true).map((i) => [i.id, i.tecla ?? null])).toEqual([
      ['mapa', 'Tab'],
      ['diario', 'J'],
      ['personagem', 'C'],
      ['foto', 'P'],
      ['gestos', 'G'],
      ['casa', null],
      ['tela', null],
      ['pausa', 'Esc'],
    ]);
    // sem tela cheia (iPhone, por exemplo), o item some
    expect(itensDoMenu(false).some((i) => i.id === 'tela')).toBe(false);
    // a mochila fica fora do menu (um toque, embaixo do minimapa)
    expect(itensDoMenu(true).some((i) => (i.id as string) === 'mochila')).toBe(false);
    expect(SEGURAR_GESTOS).toBeGreaterThanOrEqual(350);
    expect(SEGURAR_GESTOS).toBeLessThanOrEqual(600);
  });

  it('com o menu aberto (sem gestos) os números não escolhem nada', () => {
    expect(teclaDaRoda('Digit1', true, 0)).toBeNull();
    expect(teclaDaRoda('Escape', true, 0)).toEqual({ acao: 'fechar' });
  });
});
