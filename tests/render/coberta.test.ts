import { describe, expect, it } from 'vitest';
import { COBERTAS, montarCoberta, type CaixaCorpo } from '../../src/render/moveis/coberta';
import { almofadaDeitada } from '../../src/render/moveis/pecas';

/**
 * Spec 039 (portão visual): a coberta macia cai por cima do corpo deitado e nada do corpo passa
 * dela; começa no pescoço (do lado da cabeça), a borda desce pelos lados, a ponta dos pés fica por
 * dentro da pezeira e a face de cima olha para cima.
 */
describe('a coberta macia (spec 039)', () => {
  // um corpo deitado na cama (a cabeça em -z, no travesseiro): o tronco, as pernas e os pés
  const corpo: CaixaCorpo[] = [
    [-0.3, 0.55, -0.3, 0.3, 0.9, 0.3],
    [-0.25, 0.55, 0.3, 0.25, 0.8, 0.7],
    [-0.15, 0.55, 0.68, 0.15, 0.95, 0.8],
  ];
  const cabeca: CaixaCorpo = [-0.3, 0.55, -0.85, 0.3, 1.0, -0.3];
  const vd = montarCoberta(COBERTAS.cama, corpo, cabeca);
  const P = vd.positions as number[];
  const pontos = () => {
    const r: Array<[number, number, number]> = [];
    for (let i = 0; i < P.length; i += 3) r.push([P[i], P[i + 1], P[i + 2]]);
    return r;
  };

  it('fica acima de cada pedaço do corpo que está embaixo dela', () => {
    const c = COBERTAS.cama;
    for (const b of corpo)
      for (const [x, y, z] of pontos()) {
        const dentro = x > b[0] && x < b[3] && z > b[2] && z < b[5];
        // (a borda que cai pelos lados e pelo pé e a beirada da dobra ficam de fora da conta)
        const naBorda = Math.abs(x - c.c0) < 1e-6 || Math.abs(x - c.c1) < 1e-6 || Math.abs(z - c.a1) < 1e-6 || y < c.base;
        if (dentro && !naBorda) expect(y).toBeGreaterThan(b[4]);
      }
  });

  it('começa no pescoço (não cobre a cabeça) e vai até dentro da pezeira', () => {
    const zs = pontos().map((p) => p[2]);
    expect(Math.min(...zs)).toBeGreaterThan(cabeca[5] - 0.06);
    expect(Math.min(...zs)).toBeLessThan(corpo[0][2]);
    expect(Math.max(...zs)).toBeCloseTo(COBERTAS.cama.a1, 5);
  });

  it('a borda cai até abaixo do colchão', () => {
    const baixo = Math.min(...pontos().map((p) => p[1]));
    expect(baixo).toBeLessThan(COBERTAS.cama.base);
  });

  it('a face de cima olha para cima e tem cor em cada ponto', () => {
    const N = vd.normals as number[];
    let ny = 0;
    for (let i = 1; i < N.length; i += 3) ny += N[i];
    expect(ny).toBeGreaterThan(0);
    expect((vd.colors as number[]).length / 4).toBe(P.length / 3);
  });

  it('no sofá, com a cabeça do lado de +x, a mantinha vai do pescoço até o braço do outro lado e cai na frente', () => {
    const s = COBERTAS.sofa;
    const m = montarCoberta(s, [[-0.6, 0.64, -0.05, 0.1, 0.95, 0.4]], [0.1, 0.64, -0.05, 0.55, 1.0, 0.4]);
    const Q = m.positions as number[];
    const xs = Q.filter((_, i) => i % 3 === 0);
    expect(Math.min(...xs)).toBeCloseTo(s.a0, 5);
    expect(Math.max(...xs)).toBeLessThan(0.2);
    const frente = Q.filter((_, i) => i % 3 === 1 && Math.abs(Q[i + 1] - s.c1) < 1e-6);
    expect(Math.min(...frente)).toBeCloseTo(s.base - s.cairFrente!, 5);
    // a almofadinha deitada entra na mesma malha da mantinha (uma chamada de desenho só)
    const n = (m.positions as number[]).length;
    m.merge(almofadaDeitada(0.4, 0.1, 0.5));
    expect((m.positions as number[]).length).toBeGreaterThan(n);
    expect((m.colors as number[]).length / 4).toBe((m.positions as number[]).length / 3);
  });
});
