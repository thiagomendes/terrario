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

  it('selecionar ignora índices fora de 0 a 8', () => {
    const h = criarHotbar();
    h.selecionar(3);
    h.selecionar(9);
    h.selecionar(-1);
    expect(h.ativo).toBe(3);
  });

  it('proximo e anterior dão a volta', () => {
    const h = criarHotbar();
    h.anterior();
    expect(h.ativo).toBe(8);
    h.proximo();
    expect(h.ativo).toBe(0);
  });

  it('a barra mostra o kit inicial e o bloco ativo vem do inventário', () => {
    const h = criarHotbar();
    expect(h.slots).toHaveLength(9);
    expect(h.slots.slice(0, 6).map((s) => s.bloco)).toEqual(SLOTS.map((s) => s.bloco));
    h.selecionar(1);
    expect(h.blocoAtivo()).toBe(SLOTS[1].bloco);
    h.inventario.definir(1, null);
    expect(h.blocoAtivo()).toBe(0);
  });

  it('mapeia teclas e roda', () => {
    expect(teclaParaSlot('Digit1')).toBe(0);
    expect(teclaParaSlot('Digit6')).toBe(5);
    expect(teclaParaSlot('Digit9')).toBe(8);
    expect(teclaParaSlot('Digit0')).toBeNull();
    expect(teclaParaSlot('KeyW')).toBeNull();
    expect(deltaRodaParaPasso(100)).toBe(1);
    expect(deltaRodaParaPasso(-3)).toBe(-1);
    expect(deltaRodaParaPasso(0)).toBe(0);
  });
});
