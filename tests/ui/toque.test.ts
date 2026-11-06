import { describe, expect, it } from 'vitest';
import { FOLGA_TOQUE, TEMPO_SEGURAR, classificarGesto } from '../../src/ui/toque';

describe('gestos na tela de toque', () => {
  it('toque rápido e parado coloca/usa', () => {
    expect(classificarGesto(120, 3)).toBe('toque');
  });
  it('segurar parado quebra', () => {
    expect(classificarGesto(TEMPO_SEGURAR + 50, 4)).toBe('segurar');
  });
  it('mexer o dedo além da folga vira olhar (nunca coloca nem quebra)', () => {
    expect(classificarGesto(80, FOLGA_TOQUE + 1)).toBe('arrastar');
    expect(classificarGesto(900, FOLGA_TOQUE + 30)).toBe('arrastar');
  });
});
