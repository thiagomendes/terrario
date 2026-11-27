import { describe, expect, it } from 'vitest';
import { Bloco } from '../../src/world/blocks';
import { formaDoMovel, FORMA_TAPETE } from '../../src/jogo/moveis';
import { montarModeloMovel } from '../../src/render/moveis/pecas';

/**
 * Spec 039 (T05): os modelos dos móveis cabem nas células deles (o desenho pode passar da altura
 * de uma célula, como o encosto e a cabeceira, mas não da largura nem do fundo), têm as partes
 * que mexem e cabem no orçamento de triângulos.
 */
const MOVEIS = [
  Bloco.SOFA,
  Bloco.CADEIRA,
  Bloco.CRIADO_MUDO,
  Bloco.CRIADO_MUDO_ACESO,
  Bloco.ABAJUR,
  Bloco.ABAJUR_ACESO,
  Bloco.PIA,
  Bloco.GUARDA_ROUPA,
  Bloco.CAMA,
  Bloco.TAPETE,
];

function caixa(P: ArrayLike<number>) {
  const c = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, z0: Infinity, z1: -Infinity };
  for (let i = 0; i < P.length; i += 3) {
    c.x0 = Math.min(c.x0, P[i]);
    c.x1 = Math.max(c.x1, P[i]);
    c.y0 = Math.min(c.y0, P[i + 1]);
    c.y1 = Math.max(c.y1, P[i + 1]);
    c.z0 = Math.min(c.z0, P[i + 2]);
    c.z1 = Math.max(c.z1, P[i + 2]);
  }
  return c;
}

describe('os modelos dos móveis (spec 039, T05)', () => {
  for (const b of MOVEIS)
    it(`o bloco ${b} cabe nas células dele e no orçamento`, () => {
      const m = montarModeloMovel(b);
      expect(m.corpo).not.toBeNull();
      const f = b === Bloco.TAPETE ? FORMA_TAPETE : formaDoMovel(b)!;
      // a cama olha para o pé (o comprimento em z); os outros, para quem os pôs (a largura em x)
      const largura = b === Bloco.CAMA ? f.largura : f.largura;
      const fundo = f.fundo;
      const c = caixa(m.corpo!.positions!);
      expect(c.x1 - c.x0, 'a largura').toBeLessThanOrEqual(largura + 0.02);
      expect(c.z1 - c.z0, 'o fundo').toBeLessThanOrEqual(fundo + 0.02);
      expect(c.y0, 'no chão').toBeGreaterThanOrEqual(-0.001);
      // (o desenho passa da altura só um tico: o encosto, a cabeceira e a cúpula)
      expect(c.y1, 'a altura').toBeLessThanOrEqual(Math.max(1, f.altura) + 0.45);
      const tri = (m.corpo!.indices!.length + (m.luz?.indices?.length ?? 0)) / 3;
      expect(tri, 'triângulos').toBeLessThan(2600);
    });

  it('as partes que mexem: as portas, a água, o edredom e a manta', () => {
    expect(Object.keys(montarModeloMovel(Bloco.GUARDA_ROUPA).partes).sort()).toEqual(['portaD', 'portaE']);
    expect(Object.keys(montarModeloMovel(Bloco.PIA).partes).sort()).toEqual(['agua', 'bolhas']);
    expect(Object.keys(montarModeloMovel(Bloco.CAMA).partes).sort()).toEqual(['cobertor', 'edredom']);
    expect(Object.keys(montarModeloMovel(Bloco.CAMA, true).partes).sort()).toEqual(['cobertor', 'edredom']);
    expect(montarModeloMovel(Bloco.SOFA).partes.edredom?.topo).toBeGreaterThan(0);
  });

  it('a curtinha cabe numa célula', () => {
    const c = caixa(montarModeloMovel(Bloco.CAMA, true).corpo!.positions!);
    expect(c.x1 - c.x0).toBeLessThanOrEqual(1.01);
    expect(c.z1 - c.z0).toBeLessThanOrEqual(1.01);
  });

  it('o aceso tem a luz e o apagado não', () => {
    expect(montarModeloMovel(Bloco.ABAJUR_ACESO).luz).not.toBeNull();
    expect(montarModeloMovel(Bloco.ABAJUR).luz).toBeNull();
    expect(montarModeloMovel(Bloco.CRIADO_MUDO_ACESO).luz).not.toBeNull();
  });
});
