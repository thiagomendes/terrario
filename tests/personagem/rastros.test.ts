import { describe, expect, it } from 'vitest';
import {
  CHAVE_TRILHA_SAIDA,
  esquecerMundos,
  limparRastrosDosTemas,
} from '../../src/personagem/rastros';
import {
  CHAVE_APARENCIA,
  VERSAO_APARENCIA,
  carregarAparencia,
  salvarAparencia,
  type Armazenamento,
} from '../../src/personagem/persistencia';
import { aparenciaPadrao, vestirFantasia } from '../../src/personagem/aparencia';
import { CHAVE_ANTERIOR, CHAVE_BRILHOU, lerAnterior } from '../../src/ui/abaFantasias';
import {
  CHAVE_MUNDO_NOVO,
  CHAVE_SUGERIDAS,
  ehMundoNovo,
  jaSugerida,
} from '../../src/ui/sugestaoFantasia';
import { CHAVE_ALMA_CRIANCA, carregarPerfilAlma } from '../../src/personagem/almaCrianca';
import { normalizarAlmaMundo, normalizarPerfilAlma } from '../../src/jogo/alma';

/** Spec 034 (T05): sem rastro do que a criança ganhou nos quatro temas que saíram. */
function memoria(inicial: Record<string, string> = {}) {
  const dados = new Map(Object.entries(inicial));
  const loja: Armazenamento & { removeItem(k: string): void } = {
    getItem: (k) => dados.get(k) ?? null,
    setItem: (k, v) => void dados.set(k, v),
    removeItem: (k) => void dados.delete(k),
  };
  return { dados, loja };
}

/** O guardado como estava antes da 034: a aparência com uma fantasia que saiu. */
function aparenciaCom(fantasia: unknown): string {
  return JSON.stringify({
    versao: VERSAO_APARENCIA,
    aparencia: { ...aparenciaPadrao(), fantasia },
  });
}

describe('spec 034: os rastros dos quatro temas no aparelho', () => {
  it('a fantasia vestida que saiu vira "sem fantasia" e a aparência é regravada', () => {
    const { dados, loja } = memoria({
      [CHAVE_APARENCIA]: aparenciaCom({ id: 'dino', cor: 1 }),
    });
    // já ao carregar ela não veste (o catálogo não tem mais)
    expect(carregarAparencia(loja).fantasia).toBeUndefined();
    limparRastrosDosTemas(loja);
    const guardado = JSON.parse(dados.get(CHAVE_APARENCIA)!);
    expect(guardado.aparencia.fantasia).toBeUndefined();
    expect(dados.get(CHAVE_APARENCIA)).not.toContain('dino');
    expect(carregarAparencia(loja)).toEqual(carregarAparencia(memoria().loja));
  });

  it('a aparência de outro formato não é regravada (não zera a do jogador)', () => {
    const outro = JSON.stringify({
      versao: VERSAO_APARENCIA + 1,
      aparencia: { ...aparenciaPadrao(), fantasia: { id: 'dino', cor: 0 } },
    });
    const { dados, loja } = memoria({ [CHAVE_APARENCIA]: outro });
    limparRastrosDosTemas(loja);
    expect(dados.get(CHAVE_APARENCIA)).toBe(outro);
  });

  it('a aparência com uma fantasia que fica não muda', () => {
    const { dados, loja } = memoria();
    salvarAparencia(loja, vestirFantasia(aparenciaPadrao(), 'astronauta', 1));
    const antes = dados.get(CHAVE_APARENCIA);
    limparRastrosDosTemas(loja);
    expect(dados.get(CHAVE_APARENCIA)).toBe(antes);
    expect(carregarAparencia(loja).fantasia).toEqual({ id: 'astronauta', cor: 1 });
  });

  it('as fantasias que brilharam e a "vestir de novo" sem as que saíram', () => {
    const { dados, loja } = memoria({
      [CHAVE_BRILHOU]: JSON.stringify(['capacete-obra', 'lanterneira', 'caipira', 'cientista']),
      [CHAVE_ANTERIOR]: JSON.stringify({ id: 'guardia-mata', cor: 0 }),
    });
    limparRastrosDosTemas(loja);
    expect(JSON.parse(dados.get(CHAVE_BRILHOU)!)).toEqual(['capacete-obra', 'caipira']);
    expect(dados.has(CHAVE_ANTERIOR)).toBe(false);
    expect(lerAnterior(loja, 'feminino')).toBeUndefined();
    // a anterior que fica, fica
    loja.setItem(CHAVE_ANTERIOR, JSON.stringify({ id: 'fazendeira', cor: 2 }));
    limparRastrosDosTemas(loja);
    expect(lerAnterior(loja, 'feminino')).toEqual({ id: 'fazendeira', cor: 2 });
  });

  it('a medida da trilha (testes de tela) de um tema que saiu sai da sessão', () => {
    const sessao = memoria({ [CHAVE_TRILHA_SAIDA]: JSON.stringify({ tema: 'planeta-vivo' }) });
    limparRastrosDosTemas(null, sessao.loja);
    expect(sessao.dados.has(CHAVE_TRILHA_SAIDA)).toBe(false);
    const fica = memoria({ [CHAVE_TRILHA_SAIDA]: JSON.stringify({ tema: 'vila-neon' }) });
    limparRastrosDosTemas(null, fica.loja);
    expect(fica.dados.has(CHAVE_TRILHA_SAIDA)).toBe(true);
  });

  it('os mundos apagados saem da sugestão de fantasia e do "mundo novo"', () => {
    const { loja } = memoria({
      [CHAVE_SUGERIDAS]: JSON.stringify(['m1', 'm2', 'm3']),
      [CHAVE_MUNDO_NOVO]: 'm2',
    });
    esquecerMundos(loja, ['m2', 'm3']);
    expect(jaSugerida(loja, 'm1')).toBe(true);
    expect(jaSugerida(loja, 'm2')).toBe(false);
    expect(ehMundoNovo(loja, 'm2')).toBe(false);
    // um mundo novo que fica continua novo
    loja.setItem(CHAVE_MUNDO_NOVO, 'm1');
    esquecerMundos(loja, ['m3']);
    expect(ehMundoNovo(loja, 'm1')).toBe(true);
  });

  it('é idempotente e não quebra sem armazenamento', () => {
    expect(() => limparRastrosDosTemas(null, null)).not.toThrow();
    expect(() => esquecerMundos(null, ['m1'])).not.toThrow();
    const { dados, loja } = memoria({ [CHAVE_APARENCIA]: aparenciaCom({ id: 'dino', cor: 0 }) });
    limparRastrosDosTemas(loja);
    const uma = dados.get(CHAVE_APARENCIA);
    limparRastrosDosTemas(loja);
    expect(dados.get(CHAVE_APARENCIA)).toBe(uma);
  });

  it('as moedinhas, o XP, os pontos e o nível ficam com a criança', () => {
    const perfil = { ...normalizarPerfilAlma({}), moedas: 37, xp: 412.5, ganhou: 60 };
    perfil.pontos = { ...perfil.pontos, explorador: 9, bichos: 4 };
    const { loja } = memoria({
      [CHAVE_ALMA_CRIANCA]: JSON.stringify(perfil),
      [CHAVE_APARENCIA]: aparenciaCom({ id: 'dino', cor: 0 }),
    });
    limparRastrosDosTemas(loja);
    expect(carregarPerfilAlma(loja)).toEqual(normalizarPerfilAlma(perfil));
  });

  it('as missões e a banca da Era dos Dinos saem do baú e do livro de um mundo', () => {
    const e = normalizarAlmaMundo(
      {
        feitas: ['d1', 'd2', 'e1'],
        fixada: 'd3',
        progresso: { d3: 2, e2: 1 },
        bau: [
          { item: 'bloco:56', qtd: 1 },
          { item: 'bloco:61', qtd: 12 },
        ],
        livro: { moedas: 20, xp: 30, compras: { magnolias: 2, 'ninho-folhas': 1, flores: 1 } },
      },
      'doce-reino',
    );
    expect(e.feitas).toEqual(['e1']);
    expect(e.fixada).toBeNull();
    expect(e.progresso).toEqual({ e2: 1 });
    expect(e.bau.map((b) => b.item)).not.toContain('bloco:56');
    expect(Object.keys(e.livro.compras)).not.toContain('magnolias');
    expect(Object.keys(e.livro.compras)).not.toContain('ninho-folhas');
    // o livro (moedinhas e XP) fica
    expect(e.livro.moedas).toBe(20);
    expect(e.livro.xp).toBe(30);
  });
});
