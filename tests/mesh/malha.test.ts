import { describe, expect, it } from 'vitest';
import { gerarMalha, type Buffers } from '../../src/mesh/malha';
import { Bloco } from '../../src/world/blocks';
import { ALTURA, TAM_X, TAM_Z, gerarChunk, indice } from '../../src/world/chunk';

function vazio(): Uint8Array {
  return new Uint8Array(TAM_X * ALTURA * TAM_Z);
}

/**
 * Faces de bloco na malha: com as quinas de brinquedo cada face vira uma grade, então
 * conta os pares (bloco, direção) dos vértices de miolo reto (normal no eixo).
 */
function faces(b: Buffers): number {
  const vistas = new Set<string>();
  for (let t = 0; t < b.indices.length; t += 3) {
    const vs = [b.indices[t], b.indices[t + 1], b.indices[t + 2]];
    const n = [0, 1, 2].map((k) => b.normais[vs[0] * 3 + k]);
    // triângulos do miolo reto (os três vértices com a normal no eixo)
    const reto = vs.every(
      (v) => Math.max(...[0, 1, 2].map((k) => Math.abs(b.normais[v * 3 + k]))) > 0.9999,
    );
    if (!reto) continue;
    const p = [0, 1, 2].map((k) =>
      Math.floor(vs.reduce((s, v) => s + b.posicoes[v * 3 + k], 0) / 3 - n[k] * 0.5),
    );
    vistas.add(`${n.map(Math.round).join(',')}|${p.join(',')}`);
  }
  return vistas.size;
}
/** Quads de um buffer (plantas: sempre quads simples). */
const quads = (b: Buffers) => b.indices.length / 6;

describe('malha de chunk', () => {
  it('bloco isolado gera 6 faces e adjacentes omitem a face comum', () => {
    const c = vazio();
    c[indice(5, 5, 5)] = Bloco.PEDRA_RACHADA;
    expect(faces(gerarMalha(c).solido)).toBe(6);
    c[indice(6, 5, 5)] = Bloco.PEDRA_RACHADA;
    expect(faces(gerarMalha(c).solido)).toBe(10);
  });

  it('quinas à mostra se arredondam e o chão contínuo fica num quad só', () => {
    const c = vazio();
    c[indice(5, 5, 5)] = Bloco.PEDRA_RACHADA;
    const isolado = gerarMalha(c).solido;
    let inclinadas = 0;
    for (let v = 0; v < isolado.normais.length / 3; v++) {
      const n = [0, 1, 2].map((k) => Math.abs(isolado.normais[v * 3 + k]));
      if (Math.max(...n) < 0.99) inclinadas++;
    }
    expect(inclinadas).toBeGreaterThan(0);
    // nada sai da caixa do bloco
    for (let i = 0; i < isolado.posicoes.length; i++) {
      expect(isolado.posicoes[i]).toBeGreaterThanOrEqual(5 - 1e-6);
      expect(isolado.posicoes[i]).toBeLessThanOrEqual(6 + 1e-6);
    }
    // chão 3x3: o topo do bloco do meio não tem aresta à mostra
    const chao = vazio();
    for (let x = 4; x <= 6; x++)
      for (let z = 4; z <= 6; z++) chao[indice(x, 5, z)] = Bloco.PEDRA_RACHADA;
    const m = gerarMalha(chao).solido;
    let doMeio = 0;
    for (let v = 0; v < m.posicoes.length / 3; v++) {
      const [x, y, z] = [m.posicoes[v * 3], m.posicoes[v * 3 + 1], m.posicoes[v * 3 + 2]];
      if (y > 5.999 && x >= 5 && x <= 6 && z >= 5 && z <= 6 && x > 5.2 && x < 5.8) doMeio++;
    }
    expect(doMeio).toBe(0);
  });

  it('borda consulta vizinhos', () => {
    const c = vazio();
    c[indice(15, 5, 5)] = Bloco.PEDRA_RACHADA;
    const viz = vazio();
    viz[indice(0, 5, 5)] = Bloco.PEDRA_RACHADA;
    expect(faces(gerarMalha(c).solido)).toBe(6);
    expect(faces(gerarMalha(c, { xPos: viz }).solido)).toBe(5);
    const viz2 = vazio();
    viz2[indice(15, 5, 5)] = Bloco.PEDRA_RACHADA;
    const c2 = vazio();
    c2[indice(0, 5, 5)] = Bloco.PEDRA_RACHADA;
    expect(faces(gerarMalha(c2, { xNeg: viz2 }).solido)).toBe(5);
  });

  it('AO vale 1 em área aberta e menos em canto côncavo', () => {
    const c = vazio();
    c[indice(5, 5, 5)] = Bloco.PEDRA_RACHADA;
    const aberto = gerarMalha(c).solido.cores;
    for (let i = 0; i < aberto.length; i += 4) expect(aberto[i]).toBe(1);

    c[indice(6, 6, 5)] = Bloco.PEDRA_RACHADA;
    const m = gerarMalha(c).solido;
    let min = 1;
    for (let i = 0; i < m.cores.length; i += 4) min = Math.min(min, m.cores[i]);
    expect(min).toBeLessThan(1);
  });

  it('plantas vão para o buffer de plantas (de brinquedo ou cruzadas)', () => {
    const c = vazio();
    c[indice(3, 3, 3)] = Bloco.GRAMA_ALTA;
    const m = gerarMalha(c);
    // o capim vira um tufo de folhinhas 3D, todas no tile branco com a cor nos vértices
    expect(quads(m.plantas)).toBeGreaterThan(2);
    expect(m.solido.indices.length).toBe(0);
  });

  it('buffers consistentes e sem Babylon', () => {
    const m = gerarMalha(gerarChunk(0, 0));
    for (const b of [m.solido, m.plantas]) {
      const n = b.posicoes.length / 3;
      expect(b.normais.length).toBe(n * 3);
      expect(b.uvs.length).toBe(n * 2);
      expect(b.cores.length).toBe(n * 4);
      for (const i of b.indices) expect(i).toBeLessThan(n);
    }
    const fontes = import.meta.glob('../../src/mesh/*.ts', {
      eager: true,
      query: '?raw',
      import: 'default',
    }) as Record<string, string>;
    expect(Object.keys(fontes).length).toBeGreaterThan(0);
    for (const texto of Object.values(fontes)) {
      expect(texto).not.toContain('@babylonjs');
    }
  });
});
