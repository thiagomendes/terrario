import cenaTexto from '../../src/render/cena.ts?raw';
import { describe, expect, it } from 'vitest';
import {
  DENSIDADE_NEVOA,
  DIRECAO_SOL,
  INTENSIDADE_GLOW,
  LUZ_PREENCHIMENTO,
  NUM_CASCATAS,
  PALETA,
  atmosferaNaHora,
  razaoContraste,
} from '../../src/render/atmosfera';

describe('refino de iluminação', () => {
  it('névoa de referência rala, na faixa', () => {
    expect(DENSIDADE_NEVOA).toBeGreaterThanOrEqual(0.005);
    expect(DENSIDADE_NEVOA).toBeLessThanOrEqual(0.012);
  });

  it('preenchimento azulado do céu com intensidade na faixa', () => {
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
    expect(INTENSIDADE_GLOW).toBeGreaterThanOrEqual(0.4);
    expect(INTENSIDADE_GLOW).toBeLessThanOrEqual(0.6);
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

describe('ciclo de dia e noite', () => {
  it('meio-dia é claro e meia-noite é escura', () => {
    const dia = atmosferaNaHora(0.5);
    const noite = atmosferaNaHora(0);
    expect(dia.noite).toBe(0);
    expect(noite.noite).toBe(1);
    expect(dia.intensidadeLuz).toBeGreaterThan(noite.intensidadeLuz * 4);
    expect(dia.paraSol[1]).toBeGreaterThan(0.8);
    expect(noite.paraSol[1]).toBeLessThan(-0.8);
  });

  it('a luz direcional sempre desce e a névoa tem a cor do horizonte', () => {
    for (let h = 0; h < 1; h += 0.05) {
      const a = atmosferaNaHora(h);
      expect(a.direcaoLuz[1]).toBeLessThan(-0.2);
      expect(a.nevoa).toEqual(a.ceuHorizonte);
      for (const c of [...a.ceuZenite, ...a.ceuHorizonte, ...a.luz]) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
    }
  });

  it('nascer e pôr do sol têm crepúsculo forte e horizonte quente', () => {
    for (const h of [0.26, 0.74]) {
      const a = atmosferaNaHora(h);
      expect(a.crepusculo).toBeGreaterThan(0.6);
      expect(a.ceuHorizonte[0]).toBeGreaterThan(a.ceuHorizonte[2] + 0.3);
    }
  });

  it('é contínuo e periódico', () => {
    expect(atmosferaNaHora(1.25)).toEqual(atmosferaNaHora(0.25));
    const a = atmosferaNaHora(0.4999);
    const b = atmosferaNaHora(0.5001);
    expect(Math.abs(a.intensidadeLuz - b.intensidadeLuz)).toBeLessThan(0.01);
  });
});
