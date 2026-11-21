import { describe, expect, it } from 'vitest';
import { enderecoDoMundo } from '../../src/pagina';

/**
 * Spec 035, seção 5: abrir um mundo do aparelho de dentro da nuvem tira `sala`, `novo`, `direto`
 * e `tema` do endereço e põe `mundo`. O resto (os parâmetros dos testes e das capturas) fica.
 * Falha até a T07: hoje só o `tema` sai, e o `sala` leva a criança de volta para a nuvem.
 */
const BASE = 'https://terrario.exemplo/';

function params(href: string): URLSearchParams {
  return new URL(href).searchParams;
}

describe('enderecoDoMundo', () => {
  it('?sala=X&direto=1: sai da sala e abre o mundo', () => {
    const p = params(enderecoDoMundo(`${BASE}?sala=LUA-SOL-01&direto=1`, 'm1'));
    expect(p.get('mundo')).toBe('m1');
    expect(p.has('sala')).toBe(false);
    expect(p.has('direto')).toBe(false);
  });

  it('?sala=X: sai da sala e abre o mundo', () => {
    const p = params(enderecoDoMundo(`${BASE}?sala=LUA-SOL-01`, 'm2'));
    expect(p.get('mundo')).toBe('m2');
    expect(p.has('sala')).toBe(false);
  });

  it('?sala=X&novo=1&direto=1: sai da sala, do novo e do direto', () => {
    const p = params(enderecoDoMundo(`${BASE}?sala=LUA-SOL-01&novo=1&direto=1`, 'm3'));
    expect(p.get('mundo')).toBe('m3');
    expect(p.has('sala')).toBe(false);
    expect(p.has('novo')).toBe(false);
    expect(p.has('direto')).toBe(false);
  });

  it('?tema=…: a prévia de tema sai', () => {
    const p = params(enderecoDoMundo(`${BASE}?tema=vila-neon`, 'm4'));
    expect(p.get('mundo')).toBe('m4');
    expect(p.has('tema')).toBe(false);
  });

  it('um parâmetro de teste fica, e o mundo de antes é trocado', () => {
    const p = params(
      enderecoDoMundo(`${BASE}?mundo=velho&sala=LUA-SOL-01&semNuvem=1&captura=dia`, 'm5'),
    );
    expect(p.get('mundo')).toBe('m5');
    expect(p.get('semNuvem')).toBe('1');
    expect(p.get('captura')).toBe('dia');
    expect(p.has('sala')).toBe(false);
  });
});
