import { describe, expect, it } from 'vitest';
import { gerarMalha, type Buffers } from '../../src/mesh/malha';
import { Bloco } from '../../src/world/blocks';
import { ALTURA, TAM_X, TAM_Z, indice } from '../../src/world/chunk';
import { uvDaCelula } from '../../src/art/atlas';
import { TILE_PORTA_CIMA, indiceDoTile } from '../../src/art/tiles';

/** Uma porta de dois blocos (fechada ou aberta) em (5, 10..11, 5). */
function porta(b: number): Buffers {
  const c = new Uint8Array(TAM_X * ALTURA * TAM_Z);
  c[indice(5, 10, 5)] = b;
  c[indice(5, 11, 5)] = b;
  return gerarMalha(c).solido;
}

/** Vértices com a altura entre y0 e y1, e as UVs e alfas deles. */
function vertices(m: Buffers, y0: number, y1: number) {
  const out: { y: number; ny: number; u: number; v: number; a: number }[] = [];
  for (let i = 0; i < m.posicoes.length / 3; i++) {
    const y = m.posicoes[i * 3 + 1];
    if (y < y0 || y > y1) continue;
    out.push({
      y,
      ny: m.normais[i * 3 + 1],
      u: m.uvs[i * 2],
      v: m.uvs[i * 2 + 1],
      a: m.cores[i * 4 + 3],
    });
  }
  return out;
}

const dentro = (t: number, u: number, v: number) => {
  const r = uvDaCelula(t);
  return u >= r.u0 - 1e-6 && u <= r.u1 + 1e-6 && v >= r.v0 - 1e-6 && v <= r.v1 + 1e-6;
};

describe('porta de dois blocos: uma peça só', () => {
  it.each([Bloco.PORTA, Bloco.PORTA_ABERTA])('bloco %i: metade de cima com o tile dela', (b) => {
    const m = porta(b);
    const cima = indiceDoTile(TILE_PORTA_CIMA);
    expect(cima).toBeGreaterThanOrEqual(0);
    // faces em pé da metade de cima (y entre 11 e 12, sem tocar a emenda): tile de cima
    const emPeCima = vertices(m, 11.01, 12).filter((p) => p.ny === 0);
    expect(emPeCima.length).toBeGreaterThan(0);
    for (const p of emPeCima) expect(dentro(cima, p.u, p.v)).toBe(true);
    // metade de baixo: nunca o tile de cima
    const emPeBaixo = vertices(m, 10, 10.99).filter((p) => p.ny === 0);
    for (const p of emPeBaixo) expect(dentro(cima, p.u, p.v)).toBe(false);
  });

  it('sem face deitada na emenda e marcada para o material não desenhar junta', () => {
    const m = porta(Bloco.PORTA);
    const naEmenda = vertices(m, 10.999, 11.001).filter((p) => p.ny !== 0);
    expect(naEmenda).toHaveLength(0);
    const alfas = new Set(
      vertices(m, 10, 12)
        .filter((p) => p.ny === 0)
        .map((p) => p.a),
    );
    expect([...alfas].map((a) => a.toFixed(3)).sort()).toEqual(['0.993', '0.996']);
  });

  it('meia porta sozinha continua como antes (sem marca)', () => {
    const c = new Uint8Array(TAM_X * ALTURA * TAM_Z);
    c[indice(5, 10, 5)] = Bloco.PORTA;
    const m = gerarMalha(c).solido;
    for (let i = 0; i < m.cores.length / 4; i++) expect(m.cores[i * 4 + 3]).toBe(1);
  });
});

describe('portas empilhadas e metades diferentes (auditoria 013)', () => {
  function coluna(bs: number[]): Buffers {
    const c = new Uint8Array(TAM_X * ALTURA * TAM_Z);
    bs.forEach((b, i) => (c[indice(5, 10 + i, 5)] = b));
    return gerarMalha(c).solido;
  }
  const cima = indiceDoTile(TILE_PORTA_CIMA);
  /** As faces em pé de cada bloco da coluna usam o tile de cima? */
  /** Faces em pé (4 vértices cada) pelo bloco em que começam. */
  const tilesDeCima = (m: Buffers, n: number) =>
    Array.from({ length: n }, (_, k) => {
      let faces = 0;
      let deCima = 0;
      for (let f = 0; f < m.posicoes.length / 12; f++) {
        const ys = [0, 1, 2, 3].map((q) => m.posicoes[(f * 4 + q) * 3 + 1]);
        if (m.normais[f * 12 + 1] !== 0 || Math.min(...ys) !== 10 + k) continue;
        faces++;
        if (
          [0, 1, 2, 3].every((q) =>
            dentro(cima, m.uvs[(f * 4 + q) * 2], m.uvs[(f * 4 + q) * 2 + 1]),
          )
        )
          deCima++;
      }
      return faces > 0 && deCima === faces;
    });

  it('duas portas uma em cima da outra são duas portas (baixo, cima, baixo, cima)', () => {
    const m = coluna([Bloco.PORTA, Bloco.PORTA, Bloco.PORTA, Bloco.PORTA]);
    expect(tilesDeCima(m, 4)).toEqual([false, true, false, true]);
    // entre as duas portas (y = 12) há o topo de uma e o fundo da outra; nas emendas, nada
    const deitadas = (y: number) =>
      vertices(m, y - 0.001, y + 0.001).filter((p) => p.ny !== 0).length;
    expect(deitadas(11)).toBe(0);
    expect(deitadas(13)).toBe(0);
    expect(deitadas(12)).toBeGreaterThan(0);
  });

  it('uma metade aberta e a outra fechada: sem buraco (as faces da emenda ficam) e sem marca', () => {
    const m = coluna([Bloco.PORTA, Bloco.PORTA_ABERTA]);
    expect(tilesDeCima(m, 2)).toEqual([false, true]);
    const emenda = vertices(m, 10.999, 11.001).filter((p) => p.ny !== 0);
    expect(emenda.length).toBeGreaterThan(0);
    for (const p of vertices(m, 10, 12)) expect(p.a).toBe(1);
  });
});
