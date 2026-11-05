import { describe, expect, it } from 'vitest';

import { criarHotbar, deltaRodaParaPasso, SLOTS, teclaParaSlot } from '../../src/player/hotbar';

describe('hotbar', () => {
  it('define 6 slots na ordem', () => {
    expect(SLOTS.map((s) => s.nome)).toEqual([
      'terra musgosa',
      'pedra rachada',
      'areia-bruma',
      'madeira retorcida',
      'tábuas',
      'cristal-luz',
    ]);
  });

  it('selecionar ignora índices fora de 0 a 5', () => {
    const h = criarHotbar();
    h.selecionar(3);
    h.selecionar(6);
    h.selecionar(-1);
    expect(h.ativo).toBe(3);
  });

  it('proximo e anterior dão a volta', () => {
    const h = criarHotbar();
    h.anterior();
    expect(h.ativo).toBe(5);
    h.proximo();
    expect(h.ativo).toBe(0);
  });

  it('mapeia teclas e roda', () => {
    expect(teclaParaSlot('Digit1')).toBe(0);
    expect(teclaParaSlot('Digit6')).toBe(5);
    expect(teclaParaSlot('Digit7')).toBeNull();
    expect(teclaParaSlot('KeyW')).toBeNull();
    expect(deltaRodaParaPasso(100)).toBe(1);
    expect(deltaRodaParaPasso(-3)).toBe(-1);
    expect(deltaRodaParaPasso(0)).toBe(0);
  });
});
