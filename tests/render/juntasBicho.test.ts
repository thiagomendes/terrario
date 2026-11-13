import { describe, expect, it } from 'vitest';
import {
  aberturaDoPasso,
  alturaDoQuadril,
  juntasDoBicho,
  passoSemDeslizar,
  ritmoMaximo,
} from '../../src/render/juntasBicho';
import { bichoDeBrinquedo } from '../../src/render/bichoBrinquedo';
import { CRIATURAS_CIDADE } from '../../src/temas/cidade-grande/criaturas';
import { CRIATURAS_RANCHO } from '../../src/temas/rancho-alegre/criaturas';
import '../../src/temas/todos';
import { obterTema, temasDisponiveis } from '../../src/temas/index';

/** 014c: os bichos da cidade andam nas patas, com as juntas inteiras. */
describe('juntas dos bichos', () => {
  const juntas = (pecas: Parameters<typeof bichoDeBrinquedo>[0]) =>
    juntasDoBicho(bichoDeBrinquedo(pecas));

  it('cada pata é uma junta só: a perna e o pezinho giram juntos do quadril', () => {
    for (const [nome, pecas, patas] of [
      ['cachorro grande', CRIATURAS_CIDADE.cervo, 4],
      ['gato', CRIATURAS_CIDADE.raposa, 4],
      ['guaxinim', CRIATURAS_CIDADE.espectro, 4],
      ['pombo', CRIATURAS_CIDADE.coelho, 2],
      ['vaca', CRIATURAS_RANCHO.cervo, 4],
      ['galinha', CRIATURAS_RANCHO.coelho, 2],
    ] as const) {
      const j = juntas(pecas);
      const pernas = j.filter((g) => g.papel?.startsWith('perna'));
      expect(pernas.length, nome).toBe(patas);
      const quadril = alturaDoQuadril(j);
      for (const g of pernas) {
        // o pivô é o topo da peça mais alta da pata
        const topo = Math.max(...g.pecas.map((p) => p.p[1] + p.t[1] / 2));
        expect(g.pivo[1], nome).toBeCloseTo(topo, 6);
        expect(g.pivo[1], nome).toBeGreaterThan(quadril * 0.9);
        // a pata chega no chão
        expect(Math.min(...g.pecas.map((p) => p.p[1] - p.t[1] / 2)), nome).toBeLessThan(0.01);
      }
    }
  });

  it('o rabo abana inteiro, da base encostada no corpo', () => {
    for (const [nome, pecas] of [
      ['cachorro grande', CRIATURAS_CIDADE.cervo],
      ['gato', CRIATURAS_CIDADE.raposa],
      ['guaxinim', CRIATURAS_CIDADE.espectro],
    ] as const) {
      const rabos = juntas(pecas).filter((g) => g.papel === 'cauda');
      expect(rabos.length, nome).toBe(1);
      const r = rabos[0];
      // a base é a ponta do rabo mais perto do corpo (a da frente)
      const frente = Math.max(...r.pecas.map((p) => p.p[2] + p.t[2] / 2));
      expect(r.pivo[2], nome).toBeCloseTo(frente, 6);
    }
  });

  it('o pombo tem asas (batem quando ele pula ou foge)', () => {
    const j = juntas(CRIATURAS_CIDADE.coelho);
    expect(j.filter((g) => g.papel === 'asa0').length).toBe(1);
    expect(j.filter((g) => g.papel === 'asa1').length).toBe(1);
  });

  it('nenhum bicho de nenhum tema perde peça nem ganha junta', () => {
    for (const id of temasDisponiveis())
      for (const pecas of Object.values(obterTema(id).criaturas)) {
        const ps = bichoDeBrinquedo(pecas);
        const j = juntasDoBicho(ps);
        expect(j.reduce((n, g) => n + g.pecas.length, 0)).toBe(ps.length);
        // nunca mais grupos que peças
        expect(j.length).toBeLessThanOrEqual(ps.length);
      }
  });
});

describe('passo sem deslizar', () => {
  it('o pé de apoio anda para trás na rapidez do chão', () => {
    for (const [perna, v] of [
      [0.39, 1.3],
      [0.225, 1.7],
      [0.19, 1.5],
      [0.13, 0.9],
    ]) {
      const a = aberturaDoPasso(v);
      const p = passoSemDeslizar(v, perna, a);
      // em meia volta do passo (π / ritmo) o pé percorre 2·perna·sen(abertura)
      const vPe = (2 * perna * Math.sin(p.abertura)) / (Math.PI / p.ritmo);
      expect(vPe / v).toBeGreaterThan(0.97);
      expect(vPe / v).toBeLessThan(1.03);
      expect(p.ritmo).toBeLessThanOrEqual(ritmoMaximo(perna) + 1e-9);
    }
  });

  it('correndo muito, o ritmo tem teto e o passo abre (galope), sem passar de 0,8 rad', () => {
    const p = passoSemDeslizar(4.2, 0.225, aberturaDoPasso(4.2));
    expect(p.ritmo).toBeCloseTo(ritmoMaximo(0.225), 6);
    expect(p.abertura).toBeLessThanOrEqual(0.8);
    expect(p.abertura).toBeGreaterThan(aberturaDoPasso(4.2));
  });

  it('parado não dá passo; bicho sem pernas usa o ritmo de antes', () => {
    expect(aberturaDoPasso(0)).toBe(0);
    expect(passoSemDeslizar(2, 0, 0.3).ritmo).toBeCloseTo(6.4, 6);
  });
});
