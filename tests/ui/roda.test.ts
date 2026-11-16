import { describe, expect, it } from 'vitest';
import {
  BOTAO_MINIMO,
  ROTULO_RODA,
  VAO_NOME,
  caixasDaRoda,
  desenharRoda,
  estimarRotulo,
  focoDaSeta,
  posicoesDaRoda,
  raioDaRoda,
  rodaEncosta,
  teclaDaRoda,
  type DesenhoRoda,
} from '../../src/ui/roda';
import { GESTOS, gestosLiberados } from '../../src/personagem/gestos';
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
    // spec 023: com os 10 gestos, o 9 e o 0 (o décimo)
    expect(teclaDaRoda('Digit9', true, 10)).toEqual({ acao: 'escolher', i: 8 });
    expect(teclaDaRoda('Digit0', true, 10)).toEqual({ acao: 'escolher', i: 9 });
    expect(teclaDaRoda('Digit0', true, 8)).toBeNull();
    expect(teclaDaRoda('KeyW', true, 8)).toBeNull();
  });

  it('a roda de gestos tem os 8 (e os 2 de presente) e a barra do computador tem a carinha', () => {
    // spec 026: o "roqueiro" é o 11º, mas só entra na roda da Vila Neon
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
    // a mochila fica fora da roda (um toque, embaixo do minimapa)
    expect(itensDoMenu(true).some((i) => (i.id as string) === 'mochila')).toBe(false);
    expect(SEGURAR_GESTOS).toBeGreaterThanOrEqual(350);
    expect(SEGURAR_GESTOS).toBeLessThanOrEqual(600);
  });

  it('com a roda de menu aberta (sem gestos) os números não escolhem nada', () => {
    expect(teclaDaRoda('Digit1', true, 0)).toBeNull();
    expect(teclaDaRoda('Escape', true, 0)).toEqual({ acao: 'fechar' });
  });

  it('setas movem o foco entre os itens, dando a volta', () => {
    expect(focoDaSeta('ArrowRight', 0, 8)).toBe(1);
    expect(focoDaSeta('ArrowDown', 7, 8)).toBe(0);
    expect(focoDaSeta('ArrowLeft', 0, 8)).toBe(7);
    expect(focoDaSeta('ArrowUp', 3, 8)).toBe(2);
    expect(focoDaSeta('Home', 5, 8)).toBe(0);
    expect(focoDaSeta('End', 0, 9)).toBe(8);
    expect(focoDaSeta('KeyW', 0, 8)).toBeNull();
    expect(focoDaSeta('ArrowRight', 0, 0)).toBeNull();
  });
});

/**
 * Spec 026 (dono, 16 nov 2026: "na Vila Neon os ícones e os nomes da roda ficam um em cima do
 * outro"): a roda mede os nomes e abre até nada encostar em nada, em toda tela.
 */
describe('a roda sem encosto (spec 026)', () => {
  /** Como a roda faz ao abrir: os nomes folgados e, se não couber, apertados. */
  function desenhar(nomes: string[], l: number, a: number, base: number) {
    const r0 = raioDaRoda(l, a) * (nomes.length > 8 ? 1.15 : 1);
    let modo: keyof typeof ROTULO_RODA = 'normal';
    let rot = nomes.map((n) => estimarRotulo(n, ROTULO_RODA.normal.fonte, ROTULO_RODA.normal.maximo));
    let d: DesenhoRoda = desenharRoda(l, a, base, rot, r0);
    if (!d.livre) {
      modo = 'aperto';
      rot = nomes.map((n) => estimarRotulo(n, ROTULO_RODA.aperto.fonte, ROTULO_RODA.aperto.maximo));
      d = desenharRoda(l, a, base, rot, r0);
    }
    return { d, rot, modo };
  }
  const TELAS: [string, number, number, number][] = [
    ['celular pequeno em pé', 320, 568, 64],
    ['celular em pé', 360, 640, 64],
    ['iPhone em pé', 390, 844, 64],
    ['celular pequeno deitado', 568, 320, 64],
    ['celular deitado', 667, 375, 64],
    ['iPhone deitado', 844, 390, 64],
    ['tablet', 1024, 768, 64],
    ['computador', 1280, 720, 60],
    ['computador grande', 1920, 1080, 60],
  ];
  const MENU = itensDoMenu(true).map((i) => i.nome);
  const k = MENU.indexOf('Personagem') + 1;
  // o menu mais cheio que existe: missões, baú, lojinha e, de patins, "Tirar patins"
  const MENU_CHEIO = [...MENU.slice(0, k), 'Missões', 'Baú', 'Lojinha', 'Tirar patins', ...MENU.slice(k)];
  const GESTOS_VILA = gestosLiberados(10, 'vila-neon').map((g) => g.nome);
  const LISTAS: [string, string[]][] = [
    ['o menu de sempre', MENU],
    ['o menu mais cheio (12)', MENU_CHEIO],
    ['os gestos de sempre (8)', gestosLiberados(1).map((g) => g.nome)],
    ['os gestos da Vila Neon com os presentes (11)', GESTOS_VILA],
    // folga para o que vier: 13 e 14 itens, com nomes compridos
    ['13 itens', [...MENU_CHEIO, 'Pulo de estrela']],
    ['14 itens', [...MENU_CHEIO, 'Pulo de estrela', 'Cumprimentar']],
  ];

  it('a roda mais cheia tem 12 itens no menu e 11 nos gestos', () => {
    expect(MENU_CHEIO).toHaveLength(12);
    expect(GESTOS_VILA).toHaveLength(11);
  });

  for (const [tela, l, a, base] of TELAS)
    for (const [qual, nomes] of LISTAS)
      it(`${tela} (${l}×${a}), ${qual}: nada encosta e nada sai da tela`, () => {
        const { d, rot } = desenhar(nomes, l, a, base);
        expect(d.livre).toBe(true);
        const caixas = caixasDaRoda(d.pos, d.botao, rot);
        expect(rodaEncosta(caixas)).toBe(false);
        for (const par of caixas)
          for (const [x0, y0, x1, y1] of par) {
            expect(x0).toBeGreaterThanOrEqual(-l / 2);
            expect(x1).toBeLessThanOrEqual(l / 2);
            expect(y0).toBeGreaterThanOrEqual(-a / 2);
            expect(y1).toBeLessThanOrEqual(a / 2);
          }
        // o botão nunca fica pequeno demais para o dedo
        expect(d.botao).toBeGreaterThanOrEqual(BOTAO_MINIMO);
      });

  it('com poucos itens a roda é a de sempre (o raio e o botão não mudam)', () => {
    const nomes = gestosLiberados(1).map((g) => g.nome);
    const { d, modo } = desenhar(nomes, 1280, 720, 60);
    expect(modo).toBe('normal');
    expect(d.botao).toBe(60);
    expect(d.rx).toBe(d.ry);
    expect(d.rx).toBeLessThanOrEqual(raioDaRoda(1280, 720) + 12);
  });

  it('em pé a roda cheia fica oval (mais alta que larga); deitada, mais larga que alta', () => {
    const pe = desenhar(MENU_CHEIO, 360, 640, 64).d;
    expect(pe.ry).toBeGreaterThan(pe.rx);
    const deitado = desenhar(MENU_CHEIO, 667, 375, 64).d;
    expect(deitado.rx).toBeGreaterThan(deitado.ry);
  });

  it('o nome comprido quebra em duas linhas nas palavras (nunca no meio de uma)', () => {
    const { fonte, maximo } = ROTULO_RODA.aperto;
    const duas = estimarRotulo('Pulo de estrela', fonte, maximo);
    const uma = estimarRotulo('Mapa', fonte, maximo);
    expect(duas.h).toBeCloseTo(uma.h * 2, 5);
    expect(duas.w).toBeLessThanOrEqual(maximo);
    // uma palavra só não quebra
    expect(estimarRotulo('Cumprimentar', fonte, maximo).h).toBeCloseTo(uma.h, 5);
    expect(VAO_NOME).toBeGreaterThan(0);
  });
});
