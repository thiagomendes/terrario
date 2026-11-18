import { describe, expect, it } from 'vitest';
import {
  TAM_ROLETA,
  deslocamentoNaRoleta,
  escalaNaRoleta,
  modulo,
  opacidadeNaRoleta,
  pararRoleta,
  vizinhosVisiveis,
} from '../../src/ui/roleta';
import {
  ZOOM_MAXIMO,
  ZOOM_MINIMO,
  ZOOM_PADRAO_TOQUE,
  ZOOM_TOQUE_DEITADO,
  ZOOM_TOQUE_EM_PE,
  zoomInicialToque,
} from '../../src/player/camera';

describe('roleta do menu (spec 033)', () => {
  it('o do meio tem 96 px (o que o dono aprovou no esboço)', () => {
    expect(TAM_ROLETA).toBe(96);
  });

  it('dá a volta sem fim (o resto é sempre de 0 a n-1)', () => {
    expect(modulo(-1, 8)).toBe(7);
    expect(modulo(17, 8)).toBe(1);
    expect(modulo(-16, 8)).toBe(0);
  });

  it('o do meio é o maior e os vizinhos encolhem e somem para as pontas', () => {
    expect(escalaNaRoleta(0)).toBe(1);
    expect(escalaNaRoleta(1)).toBeCloseTo(0.78);
    expect(escalaNaRoleta(-1)).toBeCloseTo(0.78);
    expect(escalaNaRoleta(2)).toBeLessThan(escalaNaRoleta(1));
    expect(escalaNaRoleta(9)).toBeGreaterThanOrEqual(0.42);
    expect(opacidadeNaRoleta(0.9)).toBe(1);
    expect(opacidadeNaRoleta(2)).toBeLessThan(0.6);
    expect(opacidadeNaRoleta(2)).toBeGreaterThan(0.45);
    expect(opacidadeNaRoleta(3.3)).toBe(0);
  });

  it('nenhum botão encosta no vizinho (o vão nunca some)', () => {
    for (const tam of [80, 96, 112]) {
      for (let u = 0; u < 2.5; u += 0.25) {
        const a = deslocamentoNaRoleta(u, tam);
        const b = deslocamentoNaRoleta(u + 1, tam);
        const meiaA = (tam * escalaNaRoleta(u)) / 2;
        const meiaB = (tam * escalaNaRoleta(u + 1)) / 2;
        expect(b - a - meiaA - meiaB).toBeGreaterThan(4);
      }
      expect(deslocamentoNaRoleta(-1.5, tam)).toBeCloseTo(-deslocamentoNaRoleta(1.5, tam));
    }
  });

  it('mostra no máximo dois vizinhos de cada lado, sem repetir item', () => {
    expect(vizinhosVisiveis(1, 2)).toBe(0);
    expect(vizinhosVisiveis(2, 2)).toBe(0);
    expect(vizinhosVisiveis(3, 2)).toBe(1);
    expect(vizinhosVisiveis(5, 2)).toBe(2);
    expect(vizinhosVisiveis(30, 2)).toBe(2);
  });

  it('soltar perdoa: um quarto de passo já anda um item; o piparote anda até mais dois', () => {
    expect(pararRoleta(0, 0.1, 0)).toBe(0);
    expect(pararRoleta(0, 0.3, 0)).toBe(1);
    expect(pararRoleta(0, -0.3, 0)).toBe(-1);
    expect(pararRoleta(4, 4.7, 0)).toBe(5);
    expect(pararRoleta(0, 0.6, 12)).toBe(3);
    expect(pararRoleta(0, -0.6, -40)).toBe(-3);
  });

});

describe('câmera do celular (spec 033)', () => {
  it('começa mais afastada: deitado +8 % (4,75) e em pé +15 % (5,06)', () => {
    expect(zoomInicialToque(844, 390)).toBe(ZOOM_TOQUE_DEITADO);
    expect(zoomInicialToque(390, 844)).toBe(ZOOM_TOQUE_EM_PE);
    expect(ZOOM_TOQUE_DEITADO).toBe(4.75);
    expect(ZOOM_TOQUE_EM_PE).toBe(5.06);
    expect(ZOOM_TOQUE_DEITADO / ZOOM_PADRAO_TOQUE).toBeCloseTo(1.08, 2);
    expect(ZOOM_TOQUE_EM_PE / ZOOM_PADRAO_TOQUE).toBeCloseTo(1.15, 2);
  });
  it('dentro da pinça (a criança ainda aproxima e afasta)', () => {
    for (const d of [ZOOM_TOQUE_DEITADO, ZOOM_TOQUE_EM_PE]) {
      expect(d).toBeGreaterThan(ZOOM_MINIMO);
      expect(d).toBeLessThan(ZOOM_MAXIMO);
    }
  });
});
