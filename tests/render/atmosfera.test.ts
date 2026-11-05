import cenaTexto from '../../src/render/cena.ts?raw';
import { describe, expect, it } from 'vitest';
import {
  DENSIDADE_NEVOA,
  DIRECAO_SOL,
  INTENSIDADE_GLOW,
  LUZ_PREENCHIMENTO,
  NUM_CASCATAS,
  PALETA,
  razaoContraste,
} from '../../src/render/atmosfera';

describe('refino de iluminação', () => {
  it('névoa mais rala que a anterior (0.014), na faixa', () => {
    expect(DENSIDADE_NEVOA).toBeGreaterThanOrEqual(0.009);
    expect(DENSIDADE_NEVOA).toBeLessThanOrEqual(0.012);
  });

  it('preenchimento azul-petróleo com intensidade na faixa', () => {
    const [r, g, b] = LUZ_PREENCHIMENTO.cor;
    expect(b).toBeGreaterThan(r);
    expect(g).toBeGreaterThan(r);
    expect(LUZ_PREENCHIMENTO.intensidade).toBeGreaterThanOrEqual(0.25);
    expect(LUZ_PREENCHIMENTO.intensidade).toBeLessThanOrEqual(0.5);
  });

  it('contraste sol/sombra entre 2.5 e 5', () => {
    const r = razaoContraste(PALETA.sol, PALETA.sombra);
    expect(r).toBeGreaterThanOrEqual(2.5);
    expect(r).toBeLessThanOrEqual(5);
  });

  it('glow na faixa e 2 cascatas', () => {
    expect(INTENSIDADE_GLOW).toBeGreaterThanOrEqual(0.6);
    expect(INTENSIDADE_GLOW).toBeLessThanOrEqual(1);
    expect(NUM_CASCATAS).toBe(2);
  });

  it('cena.ts não cria luz pontual nem spot e usa as constantes', () => {
    const texto: string = cenaTexto;
    expect(texto).not.toMatch(/PointLight|SpotLight/);
    expect(texto).toContain('LUZ_PREENCHIMENTO.intensidade');
    expect(texto).toContain('INTENSIDADE_GLOW');
  });
});

describe('atmosfera', () => {
  it('todas as cores da paleta ficam entre 0 e 1', () => {
    for (const cor of Object.values(PALETA)) {
      expect(cor).toHaveLength(3);
      for (const c of cor) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
    }
  });

  it('a névoa tem a cor do horizonte', () => {
    expect(PALETA.nevoa).toEqual(PALETA.ceuHorizonte);
  });

  it('o sol aponta para baixo', () => {
    expect(DIRECAO_SOL[1]).toBeLessThan(0);
  });
});
