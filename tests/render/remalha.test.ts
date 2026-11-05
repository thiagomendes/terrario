import { describe, expect, it } from 'vitest';
import { chunksAfetados } from '../../src/render/remalha';
import { respostaObsoleta } from '../../src/render/gerenciador';

describe('chunksAfetados', () => {
  it('interior devolve só o chunk', () => {
    expect(chunksAfetados(5, 5)).toEqual([{ cx: 0, cz: 0 }]);
  });
  it('borda e canto incluem vizinhos', () => {
    expect(chunksAfetados(0, 5)).toContainEqual({ cx: -1, cz: 0 });
    expect(chunksAfetados(15, 15)).toHaveLength(3);
  });
  it('negativos', () => {
    expect(chunksAfetados(-1, -1)).toEqual([
      { cx: -1, cz: -1 },
      { cx: 0, cz: -1 },
      { cx: -1, cz: 0 },
    ]);
  });
});

describe('respostaObsoleta', () => {
  it('versão antiga ou descartado', () => {
    expect(respostaObsoleta(1, 2, false)).toBe(true);
    expect(respostaObsoleta(2, 2, true)).toBe(true);
    expect(respostaObsoleta(2, 2, false)).toBe(false);
  });
});
