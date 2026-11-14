import { describe, expect, it } from 'vitest';
import {
  CHAVE_ANTERIOR,
  CHAVE_BRILHOU,
  TEXTO_TRANCADA,
  TEXTO_TRANCADA_RANCHO,
  ondeSeGanha,
  guardarAnterior,
  jaBrilhou,
  marcarBrilhou,
  podeVestirFantasia,
  guardarSubAba,
  lerAnterior,
  lerSubAba,
  NOMES_TEMAS,
  pecasOpcionais,
  secoesDaAba,
} from '../../src/ui/abaFantasias';
import { ABAS } from '../../src/ui/personagem';
import {
  aparenciaPadrao,
  aplicarCorpo,
  desbloquear,
  vestirFantasia,
} from '../../src/personagem/aparencia';
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

  it('spec 014: só deixa vestir a fantasia do canteiro depois de ganhar', () => {
    const a = aparenciaPadrao();
    for (const id of ['capacete-obra', 'colete-obra']) {
      expect(podeVestirFantasia(id, a)).toBe(false);
      expect(podeVestirFantasia(id, desbloquear(a, id))).toBe(true);
    }
    // ganhar o capacete não libera o colete
    expect(podeVestirFantasia('colete-obra', desbloquear(a, 'capacete-obra'))).toBe(false);
    // as de sempre são livres; id desconhecido não se veste
    for (const f of FANTASIAS.filter((x) => !x.desbloqueio))
      expect(podeVestirFantasia(f, a)).toBe(true);
    expect(podeVestirFantasia('sumiu', a)).toBe(false);
    expect(TEXTO_TRANCADA).toBe('Ganhe no canteiro da cidade');
    // spec 023: os prêmios do Rancho mostram a roça (onde se ganham)
    expect(ondeSeGanha({ tema: 'rancho-alegre' }).texto).toBe(TEXTO_TRANCADA_RANCHO);
    expect(ondeSeGanha({ tema: 'rancho-alegre' }).svg).toContain('<svg');
    expect(ondeSeGanha({ tema: 'cidade-grande' }).texto).toBe(TEXTO_TRANCADA);
    // na aba da cidade as duas aparecem (trancadas), primeiro as do mundo
    const [meu] = secoesDaAba('temas', 'cidade-grande');
    expect(meu.fantasias.map((f) => f.id)).toEqual(['capacete-obra', 'colete-obra']);
  });

  it('spec 014: o brilho da peça ganha é uma vez só (e aguenta sem armazenamento)', () => {
    const l = loja();
    expect(jaBrilhou(l, 'capacete-obra')).toBe(false);
    marcarBrilhou(l, 'capacete-obra');
    marcarBrilhou(l, 'capacete-obra');
    expect(jaBrilhou(l, 'capacete-obra')).toBe(true);
    expect(jaBrilhou(l, 'colete-obra')).toBe(false);
    expect(JSON.parse(l.dados.get(CHAVE_BRILHOU)!)).toEqual(['capacete-obra']);
    l.setItem(CHAVE_BRILHOU, '{quebrado');
    expect(jaBrilhou(l, 'capacete-obra')).toBe(false);
    expect(() => marcarBrilhou(quebrada, 'capacete-obra')).not.toThrow();
    expect(jaBrilhou(quebrada, 'capacete-obra')).toBe(false);
    expect(jaBrilhou(null, 'capacete-obra')).toBe(false);
  });
});
