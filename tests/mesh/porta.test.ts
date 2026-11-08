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
    const alfas = new Set(vertices(m, 10, 12).filter((p) => p.ny === 0).map((p) => p.a));
    expect([...alfas].map((a) => a.toFixed(3)).sort()).toEqual(['0.993', '0.996']);
  });

  it('meia porta sozinha continua como antes (sem marca)', () => {
    const c = new Uint8Array(TAM_X * ALTURA * TAM_Z);
    c[indice(5, 10, 5)] = Bloco.PORTA;
    const m = gerarMalha(c).solido;
    for (let i = 0; i < m.cores.length / 4; i++) expect(m.cores[i * 4 + 3]).toBe(1);
  });
});
