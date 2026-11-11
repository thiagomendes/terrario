import { describe, expect, it } from 'vitest';
import {
  CHAVE_MUNDO_NOVO,
  ehMundoNovo,
  fantasiaParaSugerir,
  jaSugerida,
  marcarMundoNovo,
  marcarSugerida,
  perguntaDaSugestao,
} from '../../src/ui/sugestaoFantasia';
import { aparenciaPadrao, vestirFantasia } from '../../src/personagem/aparencia';
import type { Armazenamento } from '../../src/personagem/persistencia';

function loja(): Armazenamento {
  const dados = new Map<string, string>();
  return { getItem: (k) => dados.get(k) ?? null, setItem: (k, v) => void dados.set(k, v) };
}
const quebrada: Armazenamento = {
  getItem: () => {
    throw new Error('negado');
  },
  setItem: () => {
    throw new Error('negado');
  },
};

describe('sugestão de fantasia ao criar mundo', () => {
  it('pergunta pelo nome do tema, com o artigo certo', () => {
    expect(perguntaDaSugestao('rancho-alegre')).toBe('Quer vestir a fantasia do Rancho Alegre?');
    expect(perguntaDaSugestao('mata-encantada')).toBe('Quer vestir a fantasia da Mata Encantada?');
    expect(perguntaDaSugestao(undefined)).toBe('Quer vestir a fantasia de Bruma e Luz?');
  });

  it('o mundo criado fica marcado como novo até a sugestão aparecer', () => {
    const l = loja();
    expect(ehMundoNovo(l, 'm1')).toBe(false);
    marcarMundoNovo(l, 'm1');
    expect(ehMundoNovo(l, 'm1')).toBe(true);
    expect(ehMundoNovo(l, 'm2')).toBe(false);
    marcarSugerida(l, 'm1');
    expect(ehMundoNovo(l, 'm1')).toBe(false);
    expect(l.getItem(CHAVE_MUNDO_NOVO)).toBe('');
  });

  it('sugere a primeira fantasia do tema, uma vez por mundo', () => {
    const l = loja();
    const a = aparenciaPadrao();
    expect(fantasiaParaSugerir(l, 'm1', true, 'rancho-alegre', a)?.id).toBe('fazendeira');
    expect(fantasiaParaSugerir(l, 'm1', true, 'exploracao-lunar', a)?.id).toBe('astronauta');
    // mundo antigo, sem tema: Bruma e Luz
    expect(fantasiaParaSugerir(l, 'm1', true, undefined, a)?.id).toBe('lanterneira');
    marcarSugerida(l, 'm1');
    expect(jaSugerida(l, 'm1')).toBe(true);
    expect(fantasiaParaSugerir(l, 'm1', true, 'rancho-alegre', a)).toBeUndefined();
    expect(fantasiaParaSugerir(l, 'm2', true, 'rancho-alegre', a)?.id).toBe('fazendeira');
  });

  it('não sugere em mundo que não é novo nem para quem já está com a fantasia', () => {
    const l = loja();
    const a = aparenciaPadrao();
    expect(fantasiaParaSugerir(l, 'm1', false, 'rancho-alegre', a)).toBeUndefined();
    const vestida = vestirFantasia(a, 'fazendeira', 1);
    expect(fantasiaParaSugerir(l, 'm1', true, 'rancho-alegre', vestida)).toBeUndefined();
    // com outra fantasia vestida, ainda sugere
    const outra = vestirFantasia(a, 'heroi-mata');
    expect(fantasiaParaSugerir(l, 'm1', true, 'rancho-alegre', outra)?.id).toBe('fazendeira');
  });

  it('a lista de mundos lembrados não cresce sem fim', () => {
    const l = loja();
    for (let i = 0; i < 100; i++) marcarSugerida(l, `m${i}`);
    expect(jaSugerida(l, 'm99')).toBe(true);
    expect(jaSugerida(l, 'm0')).toBe(false);
  });

  it('sem armazenamento nada quebra', () => {
    expect(() => marcarMundoNovo(quebrada, 'm1')).not.toThrow();
    expect(ehMundoNovo(quebrada, 'm1')).toBe(false);
    expect(() => marcarSugerida(quebrada, 'm1')).not.toThrow();
    expect(jaSugerida(null, 'm1')).toBe(false);
  });
});
