import { describe, expect, it } from 'vitest';
import { gerarMalha } from '../../src/mesh/malha';
import { Bloco } from '../../src/world/blocks';
import { ALTURA, TAM_X, TAM_Z, indice } from '../../src/world/chunk';

/**
 * Telhado em degrau (013, pedido do dono): dois blocos que se encostam só pela aresta não
 * podem arredondar essa aresta, senão sobra uma fresta entre eles por onde se vê o céu.
 */
function pontos(blocos: [number, number, number][]): number[][] {
  const c = new Uint8Array(TAM_X * ALTURA * TAM_Z);
  for (const [x, y, z] of blocos) c[indice(x, y, z)] = Bloco.TIJOLOS;
  const { posicoes } = gerarMalha(c).solido;
  const r: number[][] = [];
  for (let i = 0; i < posicoes.length; i += 3)
    r.push([posicoes[i], posicoes[i + 1], posicoes[i + 2]]);
  return r;
}

describe('frestas na diagonal', () => {
  it('a aresta encostada na diagonal fica reta e os dois blocos se tocam nela', () => {
    // A em (5,5,5) e B em (6,6,5): a aresta comum é x = 6, y = 6, no meio do z
    const p = pontos([
      [5, 5, 5],
      [6, 6, 5],
    ]);
    const naAresta = p.filter(
      ([x, y, z]) => Math.abs(x - 6) < 1e-6 && Math.abs(y - 6) < 1e-6 && z >= 5 - 1e-6 && z <= 6 + 1e-6,
    );
    // os dois blocos têm vértices exatamente na aresta comum (antes ficavam recolhidos)
    expect(naAresta.length).toBeGreaterThanOrEqual(2);
  });

  it('sem vizinho na diagonal, a aresta à mostra continua arredondada', () => {
    const p = pontos([[5, 5, 5]]);
    const naQuina = p.filter(
      ([x, y, z]) => Math.abs(x - 6) < 1e-6 && Math.abs(y - 6) < 1e-6 && z >= 5 - 1e-6 && z <= 6 + 1e-6,
    );
    expect(naQuina.length).toBe(0);
  });
});
