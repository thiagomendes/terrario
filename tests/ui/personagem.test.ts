import { describe, expect, it } from 'vitest';
import { teclaParaPainel } from '../../src/ui/personagem';

describe('teclaParaPainel', () => {
  it('aceita só KeyC', () => {
    expect(teclaParaPainel('KeyC')).toBe(true);
    expect(teclaParaPainel('KeyV')).toBe(false);
    expect(teclaParaPainel('Digit1')).toBe(false);
  });
});
