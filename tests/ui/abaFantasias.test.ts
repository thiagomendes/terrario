import { describe, expect, it } from 'vitest';
import {
  CHAVE_ANTERIOR,
  guardarAnterior,
  guardarSubAba,
  lerAnterior,
  lerSubAba,
  NOMES_TEMAS,
  pecasOpcionais,
  secoesDaAba,
} from '../../src/ui/abaFantasias';
import { ABAS } from '../../src/ui/personagem';
import { aparenciaPadrao, aplicarCorpo, vestirFantasia } from '../../src/personagem/aparencia';
import { FANTASIAS, fantasiasDoGrupo } from '../../src/personagem/fantasias';
import type { Armazenamento } from '../../src/personagem/persistencia';

function loja(): Armazenamento & { dados: Map<string, string> } {
  const dados = new Map<string, string>();
  return {
    dados,
    getItem: (k) => dados.get(k) ?? null,
    setItem: (k, v) => void dados.set(k, v),
  };
}
const quebrada: Armazenamento = {
  getItem: () => {
    throw new Error('negado');
  },
  setItem: () => {
    throw new Error('negado');
  },
};

describe('aba Fantasias no editor', () => {
  it('vem antes das peças, com o nome "Fantasias"', () => {
    expect(ABAS[0]).toMatchObject({ id: 'fantasias', titulo: 'Fantasias', icone: 'coroa' });
    expect(ABAS.map((a) => a.id)).toEqual([
      'fantasias',
      'corpo',
      'cabelo',
      'roupa',
      'calca',
      'extra',
    ]);
  });

  it('Realeza e Heróis numa lista só, sem título de seção', () => {
    for (const g of ['realeza', 'herois'] as const) {
      const s = secoesDaAba(g, 'rancho-alegre');
      expect(s).toHaveLength(1);
      expect(s[0].titulo).toBeUndefined();
      expect(s[0].fantasias).toEqual(fantasiasDoGrupo(g));
    }
  });

  it('em "Dos temas" o tema do mundo aberto vem primeiro, com o título dele', () => {
    const [meu, outros] = secoesDaAba('temas', 'exploracao-lunar');
    expect(meu.titulo).toBe('Do seu mundo · Exploração Lunar');
    expect(meu.fantasias.map((f) => f.id)).toEqual(['astronauta']);
    expect(outros.titulo).toBe('Dos outros temas');
    expect(outros.fantasias.every((f) => f.tema !== 'exploracao-lunar')).toBe(true);
    // ninguém some nem repete
    const todas = [...meu.fantasias, ...outros.fantasias].map((f) => f.id).sort();
    expect(todas).toEqual(
      FANTASIAS.filter((f) => f.grupo === 'temas')
        .map((f) => f.id)
        .sort(),
    );
  });

  it('sem mundo aberto, "Dos temas" fica na ordem do catálogo', () => {
    const s = secoesDaAba('temas');
    expect(s).toHaveLength(1);
    expect(s[0].fantasias).toEqual(fantasiasDoGrupo('temas'));
  });

  it('todo tema das fantasias tem nome para a tela', () => {
    for (const f of FANTASIAS) if (f.tema) expect(NOMES_TEMAS[f.tema]?.curto).toBeTruthy();
  });

  it('peças que saem e voltam seguem o corpo (príncipe tem capa curta e cetro)', () => {
    const menina = vestirFantasia(aparenciaPadrao('andarilho'), 'realeza-estrelas');
    const ela = aplicarCorpo(menina, 'feminino');
    const ele = aplicarCorpo(menina, 'masculino');
    expect(pecasOpcionais(ela).map((p) => p.nome)).toEqual(['Coroa', 'Varinha']);
    expect(pecasOpcionais(ele).map((p) => p.nome)).toEqual(['Capa', 'Coroa', 'Cetro']);
    expect(pecasOpcionais(aparenciaPadrao())).toEqual([]);
  });

  it('lembra a aba usada por último no aparelho (e aguenta sem armazenamento)', () => {
    const l = loja();
    expect(lerSubAba(l)).toBe('realeza');
    guardarSubAba(l, 'temas');
    expect(lerSubAba(l)).toBe('temas');
    l.setItem('terrario:fantasias-aba', 'outra');
    expect(lerSubAba(l)).toBe('realeza');
    expect(lerSubAba(quebrada)).toBe('realeza');
    expect(() => guardarSubAba(quebrada, 'herois')).not.toThrow();
    expect(lerSubAba(null)).toBe('realeza');
  });

  it('"Vestir de novo" lembra a última fantasia tirada, passada a limpo', () => {
    const l = loja();
    expect(lerAnterior(l, 'feminino')).toBeUndefined();
    guardarAnterior(l, { id: 'heroi-mata', cor: 2, sem: ['capa'] });
    expect(lerAnterior(l, 'feminino')).toEqual({ id: 'heroi-mata', cor: 2, sem: ['capa'] });
    l.setItem(CHAVE_ANTERIOR, JSON.stringify({ id: 'sumiu', cor: 0 }));
    expect(lerAnterior(l, 'feminino')).toBeUndefined();
    l.setItem(CHAVE_ANTERIOR, '{quebrado');
    expect(lerAnterior(l, 'feminino')).toBeUndefined();
    expect(lerAnterior(quebrada, 'feminino')).toBeUndefined();
  });
});
