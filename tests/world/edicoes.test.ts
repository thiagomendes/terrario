import { ALTURA } from '../../src/world/chunk';
import { describe, expect, it } from 'vitest';
import { Bloco } from '../../src/world/blocks';
import { gerarChunk, indice } from '../../src/world/chunk';
import { criarEdicoes, gerarChunkEditado } from '../../src/world/edicoes';

describe('edicoes', () => {
  it('mapeia coordenadas negativas', () => {
    const e = criarEdicoes();
    expect(e.definir(-1, 5, -17, Bloco.PEDRA_RACHADA)).toBe(true);
    expect(e.obter(-1, 5, -17)).toBe(Bloco.PEDRA_RACHADA);
    expect(e.doChunk(-1, -2)).toEqual([[indice(15, 5, 15), Bloco.PEDRA_RACHADA]]);
  });

  it('recusa y fora da faixa e ar em y=0', () => {
    const e = criarEdicoes();
    expect(e.definir(0, -1, 0, Bloco.PEDRA_RACHADA)).toBe(false);
    expect(e.definir(0, ALTURA, 0, Bloco.PEDRA_RACHADA)).toBe(false);
    expect(e.definir(0, 0, 0, Bloco.AR)).toBe(false);
    expect(e.obter(0, 0, 0)).toBeUndefined();
    expect(e.versaoDoChunk(0, 0)).toBe(0);
  });

  it('incrementa versão', () => {
    const e = criarEdicoes();
    e.definir(1, 3, 1, Bloco.AR);
    e.definir(2, 3, 1, Bloco.AR);
    expect(e.versaoDoChunk(0, 0)).toBe(2);
  });

  it('exporta e importa', () => {
    const e = criarEdicoes();
    e.definir(3, 10, -4, Bloco.AR);
    const dados = JSON.parse(JSON.stringify(e.exportar()));
    const f = criarEdicoes();
    f.importar(dados);
    expect(f.exportar()).toEqual(e.exportar());
    expect(f.obter(3, 10, -4)).toBe(Bloco.AR);
  });

  it('gera chunk editado sem alterar gerarChunk', () => {
    const e = criarEdicoes();
    const base = gerarChunk(0, 0, 1337);
    e.definir(4, 30, 4, Bloco.CRISTAL_LUZ);
    const editado = gerarChunkEditado(0, 0, 1337, e);
    expect(editado[indice(4, 30, 4)]).toBe(Bloco.CRISTAL_LUZ);
    expect(gerarChunk(0, 0, 1337)).toEqual(base);
  });
});
