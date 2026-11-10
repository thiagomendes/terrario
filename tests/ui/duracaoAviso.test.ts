import { describe, expect, it } from 'vitest';
import { duracaoDoAviso } from '../../src/ui/interface';

describe('tempo dos avisos', () => {
  it('frase curta fica o mínimo, frase longa fica mais tempo, sem passar de 6 s', () => {
    expect(duracaoDoAviso('Pronto!')).toBe(2.6);
    const longa = duracaoDoAviso('A semente precisa de terra arada. Use a enxada na grama.');
    expect(longa).toBeGreaterThanOrEqual(4.5);
    expect(duracaoDoAviso('x'.repeat(300))).toBe(6);
  });
});
