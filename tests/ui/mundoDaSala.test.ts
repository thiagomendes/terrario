import { describe, expect, it } from 'vitest';
import { ehDaSalaAberta } from '../../src/ui/mundos';
import { normalizarCodigo } from '../../src/jogo/codigos';

/** Spec 035 (T07): na lista, "Continuar" para o mundo do aparelho que é o da sala aberta. */
describe('o mundo da sala aberta', () => {
  it('o mesmo código, escrito de outro jeito: é a sala aberta', () => {
    expect(normalizarCodigo('LUA-SOL-01')).not.toBeNull();
    expect(ehDaSalaAberta('LUA-SOL-01', 'LUA-SOL-01')).toBe(true);
    expect(ehDaSalaAberta('lua sol 1', 'LUA-SOL-01')).toBe(true);
    expect(ehDaSalaAberta('LUA-SOL-02', 'LUA-SOL-01')).toBe(false);
  });

  it('códigos inválidos nunca são a sala aberta (null e null não são iguais)', () => {
    expect(normalizarCodigo('xyz')).toBeNull();
    expect(ehDaSalaAberta('xyz', 'abc')).toBe(false);
    expect(ehDaSalaAberta('xyz', 'xyz')).toBe(false);
    expect(ehDaSalaAberta('LUA-SOL-01', 'xyz')).toBe(false);
    expect(ehDaSalaAberta('xyz', 'LUA-SOL-01')).toBe(false);
  });

  it('fora da nuvem, ou com o mundo só do aparelho: não', () => {
    expect(ehDaSalaAberta('LUA-SOL-01', undefined)).toBe(false);
    expect(ehDaSalaAberta('LUA-SOL-01', null)).toBe(false);
    expect(ehDaSalaAberta('LUA-SOL-01', '')).toBe(false);
    expect(ehDaSalaAberta(undefined, 'LUA-SOL-01')).toBe(false);
  });
});
