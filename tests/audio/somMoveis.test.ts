import { describe, expect, it } from 'vitest';
import {
  TAXA_MOVEIS,
  TOCAM_DE_CADA_VEZ,
  maisPertos,
  musicaDoSom,
} from '../../src/audio/somMoveis';
import { ALVO_RMS_DB, picoDe, rmsSoando } from '../../src/audio/realejo';
import { DURA_MUSICA } from '../../src/jogo/ligados';

describe('spec 039b (T04): a musiquinha do aparelho de som', () => {
  const x = musicaDoSom(TAXA_MOVEIS);

  it('tem uns 20 s, na régua da 019 (-23 dBFS enquanto soa), sem pico alto', () => {
    expect(x.length / TAXA_MOVEIS).toBeCloseTo(DURA_MUSICA, 1);
    const db = 20 * Math.log10(rmsSoando(x, TAXA_MOVEIS));
    expect(Math.abs(db - ALVO_RMS_DB)).toBeLessThan(1.5);
    expect(picoDe(x)).toBeLessThanOrEqual(0.9);
  });

  it('começa e acaba macia (nada de estalo), e é sempre a mesma', () => {
    expect(Math.abs(x[0])).toBeLessThan(0.01);
    expect(Math.abs(x[x.length - 1])).toBeLessThan(0.01);
    const y = musicaDoSom(TAXA_MOVEIS);
    expect(y.slice(0, 5000)).toEqual(x.slice(0, 5000));
  });

  it('só os dois sons mais perto tocam (os outros ficam calados)', () => {
    const lista = [
      { tipo: 'som', x: 30, z: 0 },
      { tipo: 'tv', x: 1, z: 0 },
      { tipo: 'som', x: 5, z: 0 },
      { tipo: 'som', x: 2, z: 0 },
      { tipo: 'som', x: 12, z: 0 },
    ];
    const r = maisPertos(lista, 'som', { x: 0, z: 0 });
    expect(TOCAM_DE_CADA_VEZ).toBe(2);
    expect(r.map((e) => e.x)).toEqual([2, 5]);
    expect(maisPertos(lista, 'tv', { x: 0, z: 0 }).map((e) => e.x)).toEqual([1]);
  });
});
