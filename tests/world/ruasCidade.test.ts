import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { cidadeDoMundo, definirEstiloMundo, ESTILO_PADRAO } from '../../src/world/chunk';
import {
  Solo,
  limparCidades,
  soloDaCidade,
  type LoteCidade,
  type PlanoCidade,
} from '../../src/world/cidade';
import { roteiroDoMorador, type LugarCidade } from '../../src/world/ruasCidade';

/**
 * Spec 014 (T08): os moradores da cidade andam só pelas calçadas e atravessam na faixa.
 * Cada caminho (casa, loja e praça, nos dois sentidos) é conferido de quarto em quarto de
 * bloco: nunca pisa no asfalto, na faixa amarela, na vaga do sorvete nem no lago, e só entra
 * no lote de onde sai e no de onde chega.
 */
beforeAll(() => {
  definirEstiloMundo(obterTema('cidade-grande').mundo);
  limparCidades();
});
afterAll(() => {
  definirEstiloMundo(ESTILO_PADRAO);
  limparCidades();
});

const noLote = (l: LoteCidade, x: number, z: number) =>
  x >= l.x0 && x < l.x0 + l.largura && z >= l.z0 && z < l.z0 + l.profundidade;

function conferir(
  p: PlanoCidade,
  pts: [number, number, number][],
  lotes: LoteCidade[],
  rotulo: string,
): void {
  const v = p.vaga;
  for (let k = 0; k + 1 < pts.length; k++) {
    const [ax, , az] = pts[k];
    const [bx, , bz] = pts[k + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) * 4));
    for (let i = 0; i <= n; i++) {
      const x = ax + ((bx - ax) * i) / n;
      const z = az + ((bz - az) * i) / n;
      const cx = Math.floor(x);
      const cz = Math.floor(z);
      const s = soloDaCidade(p, cx, cz);
      const pertoDaVaga =
        cx >= v.x0 - 1 && cx <= v.x1 + 1 && cz >= v.z0 && cz <= v.z1 + 1 && s === Solo.GRAMA;
      const ok =
        s === Solo.CALCADA ||
        s === Solo.ZEBRA ||
        pertoDaVaga ||
        (s === Solo.LOTE && lotes.some((l) => noLote(l, cx, cz)));
      expect(ok, `${rotulo}: (${x.toFixed(2)}, ${z.toFixed(2)}) solo ${s}`).toBe(true);
    }
  }
}

describe('caminhos a pé da cidade', () => {
  for (const semente of [1337, 7, 4242]) {
    it(`semente ${semente}: só calçada e faixa de pedestre`, () => {
      const p = cidadeDoMundo(semente)!;
      expect(p.moradores.length).toBeGreaterThanOrEqual(6);
      const praca = p.lotes.find((l) => l.uso === 'praca')!;
      for (const mo of p.moradores) {
        const r = roteiroDoMorador(p, mo)!;
        expect(r, `morador ${mo.n}`).not.toBeNull();
        const casa = p.lotes[mo.casa];
        const loja = p.lotes[mo.oficina];
        const viagens: [LugarCidade, LugarCidade, LoteCidade[]][] = [
          [r.casa, r.loja, [casa, loja]],
          [r.loja, r.pracas[0], [loja, praca]],
          [r.pracas[mo.n % r.pracas.length], r.casa, [praca, casa]],
          [r.casa, r.pracas[3], [casa, praca]],
        ];
        for (const [de, para, lotes] of viagens) {
          const pts = r.rota(de, [0, 0], para);
          expect(pts.length).toBeGreaterThan(2);
          // começa na saída do lugar de agora e acaba no destino
          const fim = para.passos[para.passos.length - 1];
          expect(pts[pts.length - 1]).toEqual(fim);
          conferir(p, pts, lotes, `${semente} morador ${mo.n}`);
        }
      }
    });
  }

  it('a mesma semente dá os mesmos caminhos (servidor e aparelho)', () => {
    const p = cidadeDoMundo(1337)!;
    const a = roteiroDoMorador(p, p.moradores[1])!;
    const b = roteiroDoMorador(p, p.moradores[1])!;
    expect(a.rota(a.casa, [0, 0], a.loja)).toEqual(b.rota(b.casa, [0, 0], b.loja));
  });
});
