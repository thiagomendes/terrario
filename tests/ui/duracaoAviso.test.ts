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

describe('avisos de coleta vão para o alto', () => {
  it('reconhece "+N Nome" e deixa os outros avisos onde estavam', async () => {
    const { ehAvisoDeColeta } = await import('../../src/ui/interface');
    expect(ehAvisoDeColeta('+1 Espiga de milho')).toBe(true);
    expect(ehAvisoDeColeta('+12 Tábua')).toBe(true);
    expect(ehAvisoDeColeta('A semente precisa de terra arada')).toBe(false);
    expect(ehAvisoDeColeta('+ amigos')).toBe(false);
  });
});
