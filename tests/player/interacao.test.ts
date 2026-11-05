import { describe, expect, it, vi } from 'vitest';
import { Bloco } from '../../src/world/blocks';
import { SEMENTE_PADRAO, alturaTerreno } from '../../src/world/chunk';
import { criarEdicoes } from '../../src/world/edicoes';
import { criarMundoSolido } from '../../src/player/controle';
import { acaoParaBotao, executarInteracao, tratarMenuContexto } from '../../src/player/interacao';

const longe = { x: 100, y: 60, z: 100 };

describe('executarInteracao', () => {
  it('quebrar torna o alvo ar no mundo real', () => {
    const edicoes = criarEdicoes();
    const solido = criarMundoSolido(SEMENTE_PADRAO, undefined, edicoes);
    const y = alturaTerreno(3, 3, SEMENTE_PADRAO);
    expect(solido(3, y, 3)).toBe(true);
    const alvo = { x: 3, y, z: 3, normal: { x: 0, y: 1, z: 0 } };
    expect(
      executarInteracao('quebrar', { alvo, edicoes, blocoAtivo: Bloco.TABUAS, jogador: longe }),
    ).toBe(true);
    expect(solido(3, y, 3)).toBe(false);
  });

  it('colocar grava na face e recusa colisão com o jogador', () => {
    const edicoes = criarEdicoes();
    const alvo = { x: 3, y: 20, z: 3, normal: { x: 0, y: 1, z: 0 } };
    const base = { alvo, edicoes, blocoAtivo: Bloco.TABUAS };
    expect(executarInteracao('colocar', { ...base, jogador: { x: 3.5, y: 21, z: 3.5 } })).toBe(
      false,
    );
    expect(executarInteracao('colocar', { ...base, jogador: longe })).toBe(true);
    expect(edicoes.obter(3, 21, 3)).toBe(Bloco.TABUAS);
  });

  it('quebrar recusa y=0 e sem alvo', () => {
    const edicoes = criarEdicoes();
    const alvo = { x: 1, y: 0, z: 1, normal: { x: 0, y: 1, z: 0 } };
    const ctx = { alvo, edicoes, blocoAtivo: Bloco.TABUAS, jogador: longe };
    expect(executarInteracao('quebrar', ctx)).toBe(false);
    expect(executarInteracao('quebrar', { ...ctx, alvo: null })).toBe(false);
  });
});

describe('botões e menu', () => {
  it('acaoParaBotao', () => {
    expect(acaoParaBotao(0, true)).toBe('quebrar');
    expect(acaoParaBotao(2, true)).toBe('colocar');
    expect(acaoParaBotao(1, true)).toBeNull();
    expect(acaoParaBotao(0, false)).toBeNull();
    expect(acaoParaBotao(2, false)).toBeNull();
  });

  it('tratarMenuContexto chama preventDefault', () => {
    const preventDefault = vi.fn();
    tratarMenuContexto({ preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
  });
});
