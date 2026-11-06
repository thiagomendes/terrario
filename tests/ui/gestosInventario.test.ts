import { describe, expect, it } from 'vitest';
import {
  FOLGA_TOQUE_INV,
  JANELA_TOQUE_DUPLO,
  TEMPO_TOQUE_LONGO,
  acoesDeArrastar,
  acoesDoGesto,
  classificarToqueInventario,
} from '../../src/ui/gestosInventario';

const base = { duracaoMs: 90, deslocamentoPx: 2, desdeUltimoMs: Infinity, mesmoSlot: false };

describe('gestos de toque no inventário', () => {
  it('toque rápido e parado é clique simples', () => {
    expect(classificarToqueInventario(base)).toBe('simples');
  });
  it('segurar parado vira botão direito (metade ou um)', () => {
    expect(classificarToqueInventario({ ...base, duracaoMs: TEMPO_TOQUE_LONGO })).toBe('longo');
    expect(acoesDoGesto('longo')).toEqual([{ botao: 'direito', shift: false }]);
  });
  it('dois toques rápidos no mesmo slot viram Shift (desfaz o primeiro antes)', () => {
    const d = { ...base, desdeUltimoMs: JANELA_TOQUE_DUPLO - 50, mesmoSlot: true };
    expect(classificarToqueInventario(d)).toBe('duplo');
    expect(acoesDoGesto('duplo')).toEqual([
      { botao: 'esquerdo', shift: false },
      { botao: 'esquerdo', shift: true },
    ]);
    // no resultado da criação não desfaz (fabricaria de novo)
    expect(acoesDoGesto('duplo', true)).toEqual([{ botao: 'esquerdo', shift: true }]);
  });
  it('dois toques em slots diferentes ou devagar são simples', () => {
    expect(classificarToqueInventario({ ...base, desdeUltimoMs: 100, mesmoSlot: false })).toBe(
      'simples',
    );
    expect(
      classificarToqueInventario({
        ...base,
        desdeUltimoMs: JANELA_TOQUE_DUPLO + 1,
        mesmoSlot: true,
      }),
    ).toBe('simples');
  });
  it('mexer o dedo além da folga é arrastar (mesmo demorado)', () => {
    expect(classificarToqueInventario({ ...base, deslocamentoPx: FOLGA_TOQUE_INV + 1 })).toBe(
      'arrastar',
    );
    expect(
      classificarToqueInventario({ ...base, duracaoMs: 900, deslocamentoPx: FOLGA_TOQUE_INV + 1 }),
    ).toBe('arrastar');
  });
  it('arrastar com cursor vazio pega da origem e solta no destino', () => {
    expect(acoesDeArrastar(true, false)).toEqual(['origem', 'destino']);
    // já pegou a metade com o toque longo, ou já havia item no cursor: só solta
    expect(acoesDeArrastar(true, true)).toEqual(['destino']);
    expect(acoesDeArrastar(false, false)).toEqual(['destino']);
  });
});
