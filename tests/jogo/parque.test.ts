import { describe, expect, it } from 'vitest';
import {
  ALCANCE_SENTAR,
  CADEIRAS,
  DURA_EMPURRAO,
  EMPURRAO_RODA,
  PENDURA_RODA,
  SEM_IMPULSO,
  VEL_BATE,
  VOLTA_CARROSSEL,
  VOLTA_RODA,
  alcancaOBrinquedo,
  anguloDaCadeirinha,
  anguloDaRoda,
  cadeirinhaDeBaixo,
  carrinhoDaFrente,
  distanciaDoBrinquedo,
  empurrarRoda,
  escolherCadeira,
  fimDoPasseio,
  impulsoDaVista,
  lugarDaCadeira,
  progressoDoPasseio,
  saidaDaCadeira,
  sentadoNaVista,
  voltaDoBate,
  type ParqueVila,
} from '../../src/jogo/parque';

/** Spec 026 (parte 2): a conta de onde está cada cadeira dos brinquedos do parque. */
const P: ParqueVila = {
  roda: { x: 100, y: 80, z: 50, raio: 7.5, eixo: 'x', saida: [100, 70, 55] },
  carrossel: { x: 60, y: 72, z: 60, raio: 3.7, beira: 6.1 },
  bate: { x: 30, y: 70.4, z: 20, meia: 3.2, raio: 2.9, saida: [29, 70, 27] },
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

  it('os carrinhos andam devagar em volta da pista, sem pulo, cada um atrás do outro', () => {
    const volta = voltaDoBate(P.bate);
    for (let i = 0; i < CADEIRAS.bate; i++) {
      let antes = lugarDaCadeira(P, 'bate', i, 0);
      for (let t = 0.05; t < volta / VEL_BATE + 1; t += 0.05) {
        const l = lugarDaCadeira(P, 'bate', i, t);
        const d = Math.hypot(l.x - antes.x, l.z - antes.z);
        expect(d).toBeLessThan(VEL_BATE * 0.05 + 1e-6);
        expect(d).toBeGreaterThan(VEL_BATE * 0.05 * 0.6);
        // dentro da pista
        expect(Math.abs(l.x - P.bate.x)).toBeLessThanOrEqual(P.bate.meia + P.bate.raio + 1e-6);
        expect(Math.abs(l.z - P.bate.z)).toBeLessThanOrEqual(P.bate.raio + 1e-6);
        antes = l;
      }
      // o da frente está mesmo na frente (um sexto de volta adiante)
      const eu = lugarDaCadeira(P, 'bate', i, 3);
      const frente = lugarDaCadeira(P, 'bate', carrinhoDaFrente(i), 3);
      const depois = lugarDaCadeira(P, 'bate', i, 3 + volta / CADEIRAS.bate / VEL_BATE);
      expect(Math.hypot(frente.x - depois.x, frente.z - depois.z)).toBeLessThan(1e-6);
      expect(Math.hypot(frente.x - eu.x, frente.z - eu.z)).toBeGreaterThan(2.2);
    }
  });
});

describe('o parque: sentar e descer', () => {
  it('o alcance: perto do brinquedo sim, do outro lado do parque não', () => {
    expect(distanciaDoBrinquedo(P, 'carrossel', 60, 60)).toBe(0);
    expect(alcancaOBrinquedo(P, 'carrossel', 60 + 6.1 + ALCANCE_SENTAR - 0.1, 60)).toBe(true);
    expect(alcancaOBrinquedo(P, 'carrossel', 60 + 6.1 + ALCANCE_SENTAR + 0.5, 60)).toBe(false);
    expect(alcancaOBrinquedo(P, 'roda', 100, 55)).toBe(true);
    expect(alcancaOBrinquedo(P, 'roda', 100, 70)).toBe(false);
    expect(alcancaOBrinquedo(P, 'bate', 30, 27)).toBe(true);
    expect(alcancaOBrinquedo(P, 'bate', 30, 40)).toBe(false);
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
    expect(saidaDaCadeira(P, 'bate', 2, 9, 70)).toEqual([29, 70, 27]);
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
