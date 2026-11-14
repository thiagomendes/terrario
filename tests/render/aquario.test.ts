import { describe, expect, it } from 'vitest';
import { contornoDaCaixa, dadosDaPeca } from '../../src/render/boneco';
import { planoBoneco } from '../../src/personagem/boneco';
import { aparenciaPadrao, IDS_MODELOS } from '../../src/personagem/aparencia';

/**
 * Spec 023 (a camiseta aquário, no lugar da arco-íris): a textura dá a volta no tronco com a
 * frente no meio, as mangas continuam o lado do tronco, e nenhum triângulo leva a textura
 * inteira espremida (o que cruza a costura ganha vértices do outro lado).
 */
describe('o aquário da camiseta veste a volta do corpo', () => {
  it('o caminho em volta da caixa: frente, lado direito, costas, lado esquerdo', () => {
    const a = 0.23;
    const b = 0.17;
    expect(contornoDaCaixa(0, b, a, b)).toBeCloseTo(0);
    expect(contornoDaCaixa(a, 0, a, b)).toBeCloseTo(a + b);
    expect(contornoDaCaixa(0, -b, a, b)).toBeCloseTo(2 * a + 2 * b);
    expect(contornoDaCaixa(-a, 0, a, b)).toBeCloseTo(3 * a + 3 * b);
    expect(contornoDaCaixa(a, b, a, b)).toBeCloseTo(a);
  });
  for (const modelo of IDS_MODELOS)
    for (const corpo of ['feminino', 'masculino'] as const)
      it(`${modelo} ${corpo}`, () => {
        const plano = planoBoneco({ ...aparenciaPadrao(), modelo, corpo, premium: { roupa: 'camiseta-aquario' } });
        const comTextura = plano.pecas.filter((p) => p.textura);
        expect(comTextura.map((p) => p.nome).sort()).toEqual(
          ['bracoD-manga', 'bracoD-ombro', 'bracoE-manga', 'bracoE-ombro', 'peito'].sort(),
        );
        for (const p of comTextura) {
          const vd = dadosDaPeca(p);
          const uv = vd.uvs!;
          const pos = vd.positions!;
          const ind = vd.indices!;
          expect(uv.length / 2).toBe(pos.length / 3);
          if (vd.normals) expect(vd.normals.length).toBe(pos.length);
          // nenhum triângulo do lado da peça atravessa a textura (a costura não aparece como uma
          // faixa espremida); a tampa de cima e a de baixo ficam sob o pescoço e o quadril
          let pior = 0;
          const nrm = vd.normals!;
          for (let k = 0; k < ind.length; k += 3) {
            const ny = [ind[k], ind[k + 1], ind[k + 2]].reduce((s, i) => s + Math.abs(nrm[i * 3 + 1]), 0) / 3;
            if (ny > 0.8) continue;
            const us = [ind[k], ind[k + 1], ind[k + 2]].map((i) => uv[i * 2]);
            pior = Math.max(pior, Math.max(...us) - Math.min(...us));
          }
          expect(pior, p.nome).toBeLessThan(0.35);
          // o que se vê fica dentro da altura da textura (a gola em cima, a barra embaixo)
          for (let i = 0; i < uv.length; i += 2) {
            expect(uv[i + 1]).toBeGreaterThan(-0.05);
            expect(uv[i + 1]).toBeLessThan(1.05);
          }
        }
        // o meio da frente do peito é o meio da textura; o lado de fora de cada manga, o lado
        // do tronco (0,75 no +x e 0,25 no -x)
        // (a média da face mais de fora naquele lado: os vértices dela são simétricos)
        const uDe = (nome: string, eixo: 0 | 2, sinal: 1 | -1) => {
          const p = comTextura.find((q) => q.nome === nome)!;
          const vd = dadosDaPeca(p);
          const pos = vd.positions!;
          const n = pos.length / 3;
          let max = -Infinity;
          for (let i = 0; i < n; i++) max = Math.max(max, sinal * pos[i * 3 + eixo]);
          const us: number[] = [];
          for (let i = 0; i < n; i++) if (sinal * pos[i * 3 + eixo] > max - 1e-4) us.push(vd.uvs![i * 2] % 1);
          return us.reduce((a, b) => a + b, 0) / us.length;
        };
        expect(uDe('peito', 2, 1)).toBeCloseTo(0.5, 2);
        expect(uDe('bracoD-manga', 0, 1)).toBeCloseTo(0.75, 2);
        expect(uDe('bracoE-manga', 0, -1)).toBeCloseTo(0.25, 2);
      });
});
