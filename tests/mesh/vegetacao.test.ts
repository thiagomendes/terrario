import { describe, expect, it } from 'vitest';
import { gerarMalha } from '../../src/mesh/malha';
import { obterBloco } from '../../src/world/blocks';
import { ALTURA, TAM_X, TAM_Z, indice } from '../../src/world/chunk';

function chunkComPlantas(): Uint8Array {
  let planta = 0;
  for (let id = 1; id < 40; id++) {
    if (obterBloco(id)?.planta) {
      planta = id;
      break;
    }
  }
  const blocos = new Uint8Array(TAM_X * ALTURA * TAM_Z);
  for (let x = 0; x < 8; x++) {
    for (let z = 0; z < 8; z++) blocos[indice(x, 10, z)] = planta;
  }
  return blocos;
}

describe('vegetação de brinquedo', () => {
  const blocos = chunkComPlantas();
  const a = gerarMalha(blocos).plantas;
  const n = a.posicoes.length / 3;

  it('é determinística', () => {
    const b = gerarMalha(blocos).plantas;
    expect(Array.from(b.posicoes)).toEqual(Array.from(a.posicoes));
    expect(Array.from(b.cores)).toEqual(Array.from(a.cores));
    expect(Array.from(b.indices)).toEqual(Array.from(a.indices));
  });

  it('cada planta fica baixa e dentro da sua célula, e as alturas variam', () => {
    const topos = new Map<string, number>();
    for (let v = 0; v < n; v++) {
      const [x, y, z] = [a.posicoes[v * 3], a.posicoes[v * 3 + 1], a.posicoes[v * 3 + 2]];
      expect(y).toBeGreaterThanOrEqual(10 - 0.06);
      // capim baixo: nada passa de meio bloco (o cenário não fica poluído)
      expect(y).toBeLessThanOrEqual(10.5);
      expect(x).toBeGreaterThan(-0.05);
      expect(x).toBeLessThan(8.05);
      expect(z).toBeGreaterThan(-0.05);
      expect(z).toBeLessThan(8.05);
      const k = `${Math.floor(x)},${Math.floor(z)}`;
      topos.set(k, Math.max(topos.get(k) ?? 0, y));
    }
    expect(new Set([...topos.values()].map((h) => Math.round(h * 100))).size).toBeGreaterThan(5);
  });

  it('tom varia, fica em 0..1, e só balança o que sobe do chão', () => {
    const tons = new Set<number>();
    for (let i = 0; i < a.cores.length; i++) {
      expect(a.cores[i]).toBeGreaterThanOrEqual(0);
      expect(a.cores[i]).toBeLessThanOrEqual(1);
    }
    for (let i = 0; i < a.cores.length; i += 4) tons.add(Math.round(a.cores[i] * 1000));
    expect(tons.size).toBeGreaterThan(5);
    for (let v = 0; v < n; v++) {
      const altura = a.posicoes[v * 3 + 1] - 10;
      // o balanço cresce com a altura: rente ao chão quase não mexe
      expect(a.cores[v * 4 + 3]).toBeLessThanOrEqual(Math.max(0, altura) + 1e-6);
      if (altura > 0.2) expect(a.cores[v * 4 + 3]).toBeGreaterThan(0);
    }
  });
});
