import { describe, expect, it } from 'vitest';
import { ZOOM_MAX, ZOOM_MIN, limitarZoom, zoomPorPinca } from '../../src/ui/mapa';
import { MARGEM_BORDA, tocouNaBorda } from '../../src/ui/toque';
import { overlayAoFechar } from '../../src/ui/mundos';

describe('zoom do mapa por pinça', () => {
  it('afastar os dedos aproxima na mesma proporção', () => {
    expect(zoomPorPinca(2, 100, 150)).toBeCloseTo(3);
    expect(zoomPorPinca(2, 100, 50)).toBeCloseTo(1);
  });
  it('respeita os limites e ignora distâncias inválidas', () => {
    expect(zoomPorPinca(8, 10, 1000)).toBe(ZOOM_MAX);
    expect(zoomPorPinca(1, 1000, 10)).toBe(ZOOM_MIN);
    expect(zoomPorPinca(3, 0, 50)).toBe(3);
    expect(limitarZoom(99)).toBe(ZOOM_MAX);
  });
});

describe('bordas do deslize de voltar', () => {
  it('só as faixas laterais contam', () => {
    expect(tocouNaBorda(MARGEM_BORDA - 1, 800)).toBe(true);
    expect(tocouNaBorda(800 - MARGEM_BORDA + 1, 800)).toBe(true);
    expect(tocouNaBorda(400, 800)).toBe(false);
  });
});

describe('overlay ao fechar um modal', () => {
  it('volta para a pausa quando foi aberto por ela', () => {
    expect(overlayAoFechar('pausa', true)).toBe('pausa');
  });
  it('não ressuscita a pausa se ela já fechou', () => {
    expect(overlayAoFechar('pausa', false)).toBeUndefined();
  });
  it('sem overlay anterior, limpa', () => {
    expect(overlayAoFechar(undefined, false)).toBeUndefined();
  });
});
