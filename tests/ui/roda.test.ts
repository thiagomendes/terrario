import { describe, expect, it } from 'vitest';
import { posicoesDaRoda, raioDaRoda, teclaDaRoda } from '../../src/ui/roda';
import { GESTOS } from '../../src/personagem/gestos';
import { FUNCOES_JOGO } from '../../src/ui/atalhos';
import { SEGURAR_GESTOS, itensDoMenu } from '../../src/ui/menuRoda';

describe('roda de botões (spec 015)', () => {
  it('o raio cabe na tela: de 92 px no celular deitado a 130 px no computador', () => {
    expect(raioDaRoda(1280, 720)).toBe(130);
    expect(raioDaRoda(390, 844)).toBe(117);
    expect(raioDaRoda(844, 390)).toBe(117);
    expect(raioDaRoda(320, 240)).toBe(92);
    // a roda inteira (raio + meio botão de 32 px + nome) não sai da tela do celular
    const r = raioDaRoda(390, 844);
    expect(r + 32).toBeLessThan(390 / 2);
  });

  it('o primeiro botão fica no alto e os outros seguem em sentido horário', () => {
    const p = posicoesDaRoda(8, 100);
    expect(p[0][0]).toBeCloseTo(0, 6);
    expect(p[0][1]).toBeCloseTo(-100, 6);
    expect(p[2][0]).toBeCloseTo(100, 6);
    expect(p[4][1]).toBeCloseTo(100, 6);
    expect(p[6][0]).toBeCloseTo(-100, 6);
    // todos no mesmo círculo, sem dois no mesmo lugar
    for (const [x, y] of p) expect(Math.hypot(x, y)).toBeCloseTo(100, 6);
    const vizinhos = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]);
    expect(vizinhos).toBeGreaterThan(70);
  });

  it('teclas: G alterna; aberta, Esc fecha e 1 a 8 escolhem; fechada, os números são da barra', () => {
    expect(teclaDaRoda('KeyG', false, 8)).toEqual({ acao: 'alternar' });
    expect(teclaDaRoda('KeyG', true, 8)).toEqual({ acao: 'alternar' });
    expect(teclaDaRoda('Digit1', false, 8)).toBeNull();
    expect(teclaDaRoda('Escape', false, 8)).toBeNull();
    expect(teclaDaRoda('Escape', true, 8)).toEqual({ acao: 'fechar' });
    expect(teclaDaRoda('Digit1', true, 8)).toEqual({ acao: 'escolher', i: 0 });
    expect(teclaDaRoda('Digit8', true, 8)).toEqual({ acao: 'escolher', i: 7 });
    expect(teclaDaRoda('Numpad3', true, 8)).toEqual({ acao: 'escolher', i: 2 });
    expect(teclaDaRoda('Digit9', true, 8)).toBeNull();
    expect(teclaDaRoda('KeyW', true, 8)).toBeNull();
  });

  it('a roda de gestos tem os 8 e a barra do computador tem a carinha (G, tecla livre)', () => {
    expect(GESTOS).toHaveLength(8);
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
      ['tela', null],
      ['pausa', 'Esc'],
    ]);
    // sem tela cheia (iPhone, por exemplo), o item some
    expect(itensDoMenu(false).some((i) => i.id === 'tela')).toBe(false);
    // a mochila fica fora da roda (um toque, embaixo do minimapa)
    expect(itensDoMenu(true).some((i) => (i.id as string) === 'mochila')).toBe(false);
    expect(SEGURAR_GESTOS).toBeGreaterThanOrEqual(350);
    expect(SEGURAR_GESTOS).toBeLessThanOrEqual(600);
  });

  it('com a roda de menu aberta (sem gestos) os números não escolhem nada', () => {
    expect(teclaDaRoda('Digit1', true, 0)).toBeNull();
    expect(teclaDaRoda('Escape', true, 0)).toEqual({ acao: 'fechar' });
  });
});
