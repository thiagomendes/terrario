import { describe, expect, it } from 'vitest';
import {
  dePe,
  espalharEstrelas,
  maisPertoDoCaminho,
  procurarCaminho,
  type LeitorCaminho,
} from '../../src/jogo/caminho';
import { Bloco } from '../../src/world/blocks';
import { cronometrar, melhorDe } from '../tempo';

/** Um mundo de mentirinha: chão de pedra em y = 9 (pés em 10) e o que o teste puser. */
function mundo(extra: Record<string, number> = {}, conhecido = (_x: number, _z: number) => true) {
  const m = new Map(Object.entries(extra));
  const leitor: LeitorCaminho = {
    bloco(x, y, z) {
      const k = `${x},${y},${z}`;
      if (m.has(k)) return m.get(k)!;
      return y <= 9 ? Bloco.PEDRA_RACHADA : Bloco.AR;
    },
    conhecido,
  };
  return {
    leitor,
    por(x: number, y: number, z: number, b: number) {
      m.set(`${x},${y},${z}`, b);
    },
  };
}

const passaPor = (pts: readonly [number, number, number][], x: number, z: number) =>
  pts.some((p) => Math.floor(p[0]) === x && Math.floor(p[2]) === z);

describe('caminho a pé (trilha de estrelinhas)', () => {
  it('no plano vai reto até o amigo', () => {
    const { leitor } = mundo();
    const c = procurarCaminho(leitor, [0.5, 10, 0.5], [20.5, 10, 0.5]);
    expect(c.completo).toBe(true);
    expect(c.pts.length).toBeGreaterThanOrEqual(19);
    expect(c.pts.length).toBeLessThanOrEqual(22);
    expect(c.pts.every((p) => p[1] === 10)).toBe(true);
  });

  it('contorna uma parede alta', () => {
    const w = mundo();
    for (let z = -6; z <= 6; z++) for (let y = 10; y <= 13; y++) w.por(10, y, z, Bloco.PEDRA_RACHADA);
    const c = procurarCaminho(w.leitor, [0.5, 10, 0.5], [20.5, 10, 0.5]);
    expect(c.completo).toBe(true);
    // não atravessa a parede
    for (let z = -6; z <= 6; z++) expect(passaPor(c.pts, 10, z)).toBe(false);
  });

  it('contorna a água e o buraco fundo', () => {
    const w = mundo();
    for (let z = -4; z <= 4; z++) {
      w.por(8, 9, z, Bloco.AGUA);
      // buraco de 6 blocos
      for (let y = 4; y <= 9; y++) w.por(12, y, z, Bloco.AR);
    }
    const c = procurarCaminho(w.leitor, [0.5, 10, 0.5], [20.5, 10, 0.5]);
    expect(c.completo).toBe(true);
    for (let z = -4; z <= 4; z++) {
      expect(passaPor(c.pts, 8, z)).toBe(false);
      expect(passaPor(c.pts, 12, z)).toBe(false);
    }
  });

  it('sobe 1 bloco, mas não 2; desce até 3', () => {
    // degrau de 1: atravessa por cima
    const um = mundo();
    for (let z = -30; z <= 30; z++) for (let x = 10; x <= 30; x++) um.por(x, 10, z, Bloco.PEDRA_RACHADA);
    const c1 = procurarCaminho(um.leitor, [0.5, 10, 0.5], [20.5, 11, 0.5]);
    expect(c1.completo).toBe(true);
    expect(c1.pts.at(-1)![1]).toBe(11);
    // degrau de 2 em volta do amigo: não chega, vai até o ponto mais perto
    const dois = mundo();
    for (let z = -40; z <= 40; z++)
      for (let x = 10; x <= 40; x++) {
        dois.por(x, 10, z, Bloco.PEDRA_RACHADA);
        dois.por(x, 11, z, Bloco.PEDRA_RACHADA);
      }
    const c2 = procurarCaminho(dois.leitor, [0.5, 10, 0.5], [20.5, 12, 0.5]);
    expect(c2.completo).toBe(false);
    expect(c2.pts.length).toBeGreaterThan(0);
    expect(Math.floor(c2.pts.at(-1)![0])).toBe(9);
    // descer 3 de uma vez vale (o amigo num fosso raso)
    const fosso = mundo();
    for (let z = -30; z <= 30; z++) for (let x = 10; x <= 30; x++) for (let y = 7; y <= 9; y++) fosso.por(x, y, z, Bloco.AR);
    const c3 = procurarCaminho(fosso.leitor, [0.5, 10, 0.5], [20.5, 7, 0.5]);
    expect(c3.completo).toBe(true);
  });

  it('sem nada aonde ir: vazio', () => {
    const w = mundo();
    // cercado por parede alta
    for (let d = -2; d <= 2; d++)
      for (let y = 10; y <= 13; y++) {
        w.por(d, y, -2, Bloco.PEDRA_RACHADA);
        w.por(d, y, 2, Bloco.PEDRA_RACHADA);
        w.por(-2, y, d, Bloco.PEDRA_RACHADA);
        w.por(2, y, d, Bloco.PEDRA_RACHADA);
      }
    for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) if (x || z) for (let y = 10; y <= 13; y++) w.por(x, y, z, Bloco.PEDRA_RACHADA);
    const c = procurarCaminho(w.leitor, [0.5, 10, 0.5], [20.5, 10, 0.5]);
    expect(c.pts).toEqual([]);
    expect(c.completo).toBe(false);
  });

  it('onde o aparelho não tem os blocos, segue reto', () => {
    const w = mundo({}, (x) => x < 10);
    // atrás do que se conhece há um muro, mas o aparelho não sabe: passa reto
    for (let z = -20; z <= 20; z++) for (let y = 10; y <= 14; y++) w.por(15, y, z, Bloco.PEDRA_RACHADA);
    const c = procurarCaminho(w.leitor, [0.5, 10, 0.5], [30.5, 10, 0.5]);
    expect(c.completo).toBe(true);
    expect(passaPor(c.pts, 15, 0)).toBe(true);
  });

  it('de pé: chão firme e duas células livres, nunca na copa da árvore', () => {
    const w = mundo();
    expect(dePe(w.leitor.bloco, 0, 10, 0)).toBe(true);
    w.por(0, 11, 0, Bloco.PEDRA_RACHADA);
    expect(dePe(w.leitor.bloco, 0, 10, 0)).toBe(false);
    w.por(3, 10, 3, Bloco.FOLHAGEM);
    expect(dePe(w.leitor.bloco, 3, 11, 3)).toBe(false);
  });

  // protege: a busca a 150 blocos cabe num quadro (a trilha de estrelinhas não trava o jogo).
  // Spec 034 (T14): o melhor de 5 buscas, e não a média (a máquina ocupada só soma tempo)
  it('a 150 blocos procura em menos de 15 ms (a melhor de 5)', () => {
    const w = mundo();
    // um morro no meio para dar trabalho
    for (let x = 60; x <= 90; x++) for (let z = -30; z <= 30; z++) for (let y = 10; y <= 12; y++) w.por(x, y, z, Bloco.PEDRA_RACHADA);
    procurarCaminho(w.leitor, [0.5, 10, 0.5], [150.5, 10, 20.5]);
    const ms = melhorDe(5, () =>
      cronometrar(() => procurarCaminho(w.leitor, [0.5, 10, 0.5], [150.5, 10, 20.5])),
    );
    console.log(`caminho de 150 blocos: ${ms.toFixed(1)} ms`);
    expect(ms).toBeLessThan(15);
  });

  it('estrelinhas a cada 0,8 bloco, no máximo 300; o ponto mais perto', () => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 400; i++) pts.push([i + 0.5, 10, 0.5]);
    const e = espalharEstrelas(pts);
    expect(e.length).toBe(300);
    expect(Math.abs(e[1][0] - e[0][0] - 0.8)).toBeLessThan(1e-6);
    expect(maisPertoDoCaminho(pts, 20.4, 3).i).toBe(20);
  });
});
