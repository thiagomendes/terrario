import { describe, expect, it } from 'vitest';
import {
  ALCANCE_SENTAR,
  CADEIRAS,
  DURA_EMPURRAO,
  EMPURRAO_RODA,
  PENDURA_RODA,
  SEM_IMPULSO,
  VOLTA_CARROSSEL,
  VOLTA_RODA,
  alcancaOBrinquedo,
  anguloDaCadeirinha,
  anguloDaRoda,
  cadeirinhaDeBaixo,
  carrinhoLivrePerto,
  distanciaDoBrinquedo,
  empurrarRoda,
  escolherCadeira,
  fimDoPasseio,
  impulsoDaVista,
  lugarDaCadeira,
  progressoDoPasseio,
  saidaDaCadeira,
  noTapete,
  saidaDoBate,
  sentadoNaVista,
  type ParqueVila,
} from '../../src/jogo/parque';

/** Spec 026 (parte 2): a conta de onde está cada cadeira dos brinquedos do parque. */
const P: ParqueVila = {
  roda: { x: 100, y: 80, z: 50, raio: 7.5, eixo: 'x', saida: [100, 70, 55] },
  carrossel: { x: 60, y: 72, z: 60, raio: 3.7, beira: 6.1 },
  bate: {
    x: 30,
    y: 70.4,
    z: 20,
    x0: 18,
    z0: 13.5,
    x1: 42,
    z1: 26.5,
    vagas: [
      [22, 16, 0],
      [30, 18, 0],
      [36, 16, 0],
      [38, 22, 0],
      [20, 25.4, Math.PI],
      [22.4, 25.4, Math.PI],
      [33, 25.4, Math.PI],
      [35.4, 25.4, Math.PI],
    ],
    tapete: { x0: 26, z0: 24.5, x1: 30, z1: 26.5 },
    saida: [29, 70, 28.5],
  },
};
const DUAS_PI = Math.PI * 2;

describe('o parque: a roda-gigante', () => {
  it('dá uma volta a cada 25 s e só anda para a frente', () => {
    expect(anguloDaRoda(VOLTA_RODA) - anguloDaRoda(0)).toBeCloseTo(DUAS_PI, 9);
    let antes = -Infinity;
    for (let t = 0; t < 60; t += 0.37) {
      const a = anguloDaRoda(t, { d: 0, ti: 20 });
      expect(a).toBeGreaterThan(antes);
      antes = a;
    }
  });

  it('as oito cadeirinhas ficam no aro, igualmente separadas, e o assento pende do eixo', () => {
    for (let t = 0; t < 30; t += 3.1)
      for (let i = 0; i < CADEIRAS.roda; i++) {
        const l = lugarDaCadeira(P, 'roda', i, t);
        expect(Math.hypot(l.x - P.roda.x, l.y + PENDURA_RODA - P.roda.y)).toBeCloseTo(7.5, 6);
        expect(l.z).toBe(P.roda.z);
      }
    const a = lugarDaCadeira(P, 'roda', 0, 0);
    const b = lugarDaCadeira(P, 'roda', 4, 0);
    // a de baixo e a de cima
    expect(b.y - a.y).toBeCloseTo(15, 6);
  });

  it('a cadeirinha de baixo é a que a criança pega; o passeio é uma volta inteira e acaba embaixo', () => {
    for (const t of [0, 3.3, 11.9, 24.2, 100.7]) {
      const i = cadeirinhaDeBaixo(t);
      const l = lugarDaCadeira(P, 'roda', i, t);
      // a até meia cadeira (22,5°) de baixo
      expect(l.y).toBeLessThan(P.roda.y - PENDURA_RODA - 7.5 * Math.cos(Math.PI / 8) + 1e-6);
      const fim = fimDoPasseio(i, t);
      const volta = (fim - anguloDaCadeirinha(i, t)) / DUAS_PI;
      expect(volta).toBeGreaterThan(0.93);
      expect(volta).toBeLessThan(1.07);
      // acaba com a cadeirinha embaixo
      expect(Math.cos(fim)).toBeCloseTo(1, 9);
      expect(progressoDoPasseio(i, fim, t)).toBeLessThan(0.08);
      expect(progressoDoPasseio(i, fim, t + VOLTA_RODA * volta)).toBeCloseTo(1, 6);
    }
  });

  it('o empurrãozinho adianta meia cadeira em 2,5 s, um por vez, e fica assentado', () => {
    const imp = empurrarRoda(SEM_IMPULSO, 10);
    expect(imp.ti).toBe(10);
    expect(anguloDaRoda(10, imp)).toBeCloseTo(anguloDaRoda(10), 9);
    expect(anguloDaRoda(10 + DURA_EMPURRAO, imp) - anguloDaRoda(10 + DURA_EMPURRAO)).toBeCloseTo(
      EMPURRAO_RODA,
      9,
    );
    // no meio do empurrão, outro toque não soma
    expect(empurrarRoda(imp, 11)).toBe(imp);
    // depois, o segundo soma por cima do primeiro, sem pulo no ângulo
    const dois = empurrarRoda(imp, 20);
    expect(anguloDaRoda(20, dois)).toBeCloseTo(anguloDaRoda(20, imp), 9);
    expect(anguloDaRoda(30, dois) - anguloDaRoda(30)).toBeCloseTo(2 * EMPURRAO_RODA, 9);
  });
});

describe('o parque: o carrossel e o bate-bate', () => {
  it('os cavalinhos giram na roda deles, sobem e descem, e olham para onde vão', () => {
    for (let i = 0; i < CADEIRAS.carrossel; i++) {
      const a = lugarDaCadeira(P, 'carrossel', i, 5);
      const b = lugarDaCadeira(P, 'carrossel', i, 5.05);
      expect(Math.hypot(a.x - P.carrossel.x, a.z - P.carrossel.z)).toBeCloseTo(3.7, 6);
      expect(a.y).toBeGreaterThanOrEqual(P.carrossel.y);
      expect(a.y).toBeLessThanOrEqual(P.carrossel.y + 0.33);
      // o rumo do corpo é o do movimento
      const d = Math.hypot(b.x - a.x, b.z - a.z);
      expect((b.x - a.x) / d).toBeCloseTo(Math.sin(a.yaw), 1);
      expect((b.z - a.z) / d).toBeCloseTo(Math.cos(a.yaw), 1);
    }
    const a = lugarDaCadeira(P, 'carrossel', 0, 0);
    const b = lugarDaCadeira(P, 'carrossel', 0, VOLTA_CARROSSEL);
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeLessThan(1e-6);
  });

  it('no bate-bate o lugar da cadeira é o do carrinho de agora (sem os carrinhos, a vaga dele)', () => {
    expect(CADEIRAS.bate).toBe(8);
    // o relógio não mexe o carrinho: quem guia é a criança (ou o morador), no núcleo
    expect(lugarDaCadeira(P, 'bate', 5, 0)).toEqual(lugarDaCadeira(P, 'bate', 5, 99));
    expect(lugarDaCadeira(P, 'bate', 5, 0)).toEqual({ x: 22.4, y: 70.4, z: 25.4, yaw: Math.PI });
    const carros = P.bate.vagas.map(([x, z, yaw]) => ({ x, z, yaw }));
    carros[5] = { x: 31, z: 19, yaw: 0.5 };
    expect(lugarDaCadeira(P, 'bate', 5, 0, SEM_IMPULSO, carros)).toEqual({
      x: 31,
      y: 70.4,
      z: 19,
      yaw: 0.5,
    });
  });
});

describe('o parque: sentar e descer', () => {
  it('o alcance: perto do brinquedo sim, do outro lado do parque não', () => {
    expect(distanciaDoBrinquedo(P, 'carrossel', 60, 60)).toBe(0);
    expect(alcancaOBrinquedo(P, 'carrossel', 60 + 6.1 + ALCANCE_SENTAR - 0.1, 60)).toBe(true);
    expect(alcancaOBrinquedo(P, 'carrossel', 60 + 6.1 + ALCANCE_SENTAR + 0.5, 60)).toBe(false);
    expect(alcancaOBrinquedo(P, 'roda', 100, 55)).toBe(true);
    expect(alcancaOBrinquedo(P, 'roda', 100, 70)).toBe(false);
    expect(alcancaOBrinquedo(P, 'bate', 30, 28)).toBe(true);
    expect(alcancaOBrinquedo(P, 'bate', 30, 40)).toBe(false);
    expect(distanciaDoBrinquedo(P, 'bate', 30, 20)).toBe(0);
    expect(distanciaDoBrinquedo(P, 'bate', 45, 20)).toBe(2);
  });

  it('no bate-bate a criança pega o carrinho livre das crianças mais perto dela, se o alcança', () => {
    const livre = () => false;
    // na ponta do caminho (o sul): o da beira mais perto; nunca um dos moradores (0 a 3)
    expect(carrinhoLivrePerto(P.bate, 24, 28, livre)).toBe(5);
    expect(carrinhoLivrePerto(P.bate, 24, 28, (i) => i === 5)).toBe(4);
    expect(carrinhoLivrePerto(P.bate, 30, 19, livre)).toBeGreaterThanOrEqual(4);
    // do outro lado da pista, longe dos carrinhos da beira: nenhum
    expect(carrinhoLivrePerto(P.bate, 30, 12, livre)).toBe(-1);
    // o carrinho livre andou até perto dela: agora alcança
    const carros = P.bate.vagas.map(([x, z, yaw]) => ({ x, z, yaw }));
    carros[7] = { x: 30, z: 15, yaw: 0 };
    expect(carrinhoLivrePerto(P.bate, 30, 12, livre, carros)).toBe(7);
    expect(escolherCadeira(P, 'bate', 30, 12, 0, livre, SEM_IMPULSO, carros)).toBe(7);
  });

  it('do bate-bate desce-se do lado de fora da mureta: no tapete, o caminho; no resto, a calçadinha mais perto', () => {
    expect(noTapete(P.bate, 28, 25.5)).toBe(true);
    expect(noTapete(P.bate, 31, 25.5)).toBe(false);
    expect(saidaDoBate(P.bate, 28, 25.5, 70)).toEqual([29, 70, 28.5]);
    expect(saidaDoBate(P.bate, 36, 25, 70)).toEqual([36, 70, 28]);
    expect(saidaDoBate(P.bate, 36, 15, 70)).toEqual([36, 70, 12]);
    expect(saidaDoBate(P.bate, 19.5, 20, 70)).toEqual([16.5, 70, 20]);
    expect(saidaDoBate(P.bate, 40.5, 20, 70)).toEqual([43.5, 70, 20]);
  });

  it('a cadeira livre: a mais perto no carrossel e no bate-bate; na roda, a de baixo ou a vizinha', () => {
    const livre = () => false;
    const i = escolherCadeira(P, 'carrossel', 70, 60, 0, livre);
    const l = lugarDaCadeira(P, 'carrossel', i, 0);
    for (let k = 0; k < CADEIRAS.carrossel; k++) {
      const q = lugarDaCadeira(P, 'carrossel', k, 0);
      expect(Math.hypot(l.x - 70, l.z - 60)).toBeLessThanOrEqual(
        Math.hypot(q.x - 70, q.z - 60) + 1e-9,
      );
    }
    // ocupada, vem a seguinte; tudo ocupado, nenhuma
    expect(escolherCadeira(P, 'carrossel', 70, 60, 0, (k) => k === i)).not.toBe(i);
    expect(escolherCadeira(P, 'bate', 30, 27, 0, () => true)).toBe(-1);
    const baixo = cadeirinhaDeBaixo(7);
    expect(escolherCadeira(P, 'roda', 100, 55, 7, livre)).toBe(baixo);
    const outra = escolherCadeira(P, 'roda', 100, 55, 7, (k) => k === baixo);
    expect([(baixo + 7) % 8, (baixo + 1) % 8]).toContain(outra);
  });

  it('desce no chão, do lado de fora: nunca dentro do brinquedo', () => {
    expect(saidaDaCadeira(P, 'roda', 3, 9, 70)).toEqual([100, 70, 55]);
    // (o carrinho 5 na vaga dele, na beira do sul: a calçadinha logo ali)
    expect(saidaDaCadeira(P, 'bate', 5, 9, 70)).toEqual([22.4, 70, 28]);
    for (let i = 0; i < CADEIRAS.carrossel; i++) {
      const [x, y, z] = saidaDaCadeira(P, 'carrossel', i, 4.2, 70);
      expect(y).toBe(70);
      expect(Math.hypot(x - 60, z - 60)).toBeCloseTo(6.1 + 1.1, 6);
    }
  });

  it('a vista: quem está sentado onde, e o empurrão da roda', () => {
    const v = {
      r: [0.4, 12] as [number, number],
      s: { ana: [0, 3, 5.5, 18.8], leo: [2, 1, 6, 0] },
    };
    expect(sentadoNaVista(v as never, 'ana')).toEqual({ b: 'roda', i: 3, desde: 5.5, fim: 18.8 });
    expect(sentadoNaVista(v as never, 'leo')).toEqual({ b: 'bate', i: 1, desde: 6 });
    expect(sentadoNaVista(v as never, 'bia')).toBeNull();
    expect(sentadoNaVista(null, 'ana')).toBeNull();
    expect(impulsoDaVista(v as never)).toEqual({ d: 0.4, ti: 12 });
    expect(anguloDaRoda(0)).toBeCloseTo(0, 9);
    expect(impulsoDaVista(null)).toBe(SEM_IMPULSO);
  });
});
