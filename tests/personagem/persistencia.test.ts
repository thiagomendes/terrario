import { describe, expect, it } from 'vitest';
import { aparenciaPadrao, type Aparencia } from '../../src/personagem/aparencia';
import {
  CHAVE_APARENCIA,
  carregarAparencia,
  salvarAparencia,
  type Armazenamento,
} from '../../src/personagem/persistencia';

function falso(): Armazenamento & { dados: Map<string, string> } {
  const dados = new Map<string, string>();
  return {
    dados,
    getItem: (c) => dados.get(c) ?? null,
    setItem: (c, v) => {
      dados.set(c, v);
    },
  };
}

const lancador: Armazenamento = {
  getItem: () => {
    throw new Error('x');
  },
  setItem: () => {
    throw new Error('x');
  },
};

const custom: Aparencia = {
  nome: 'Ana',
  modelo: 'lanterneiro',
  pele: 4,
  cabeloEstilo: 1,
  cabeloCor: 5,
  roupaEstilo: 2,
  roupaCor: 1,
  calcaCor: 3,
  acessorio: 'capuz',
};

describe('persistência da aparência', () => {
  it('grava na chave com versão 1', () => {
    const a = falso();
    expect(salvarAparencia(a, custom)).toBe(true);
    expect(JSON.parse(a.dados.get(CHAVE_APARENCIA)!)).toEqual({ versao: 1, aparencia: custom });
    expect(CHAVE_APARENCIA).toBe('brumaluz:aparencia');
  });

  it('ciclo preserva todos os campos', () => {
    const a = falso();
    salvarAparencia(a, custom);
    expect(carregarAparencia(a)).toEqual(custom);
  });

  it('padrão para ausente, JSON inválido e versão desconhecida', () => {
    const a = falso();
    expect(carregarAparencia(a)).toEqual(aparenciaPadrao());
    a.dados.set(CHAVE_APARENCIA, '{nao json');
    expect(carregarAparencia(a)).toEqual(aparenciaPadrao());
    a.dados.set(CHAVE_APARENCIA, JSON.stringify({ versao: 2, aparencia: custom }));
    expect(carregarAparencia(a)).toEqual(aparenciaPadrao());
    a.dados.set(CHAVE_APARENCIA, 'null');
    expect(carregarAparencia(a)).toEqual(aparenciaPadrao());
  });

  it('normaliza campos inválidos', () => {
    const a = falso();
    a.dados.set(
      CHAVE_APARENCIA,
      JSON.stringify({ versao: 1, aparencia: { ...custom, pele: 99, acessorio: 'x' } }),
    );
    const r = carregarAparencia(a);
    expect(r.pele).toBe(aparenciaPadrao('lanterneiro').pele);
    expect(r.acessorio).toBe('lanterna');
    expect(r.nome).toBe('Ana');
  });

  it('tolera armazenamento nulo ou que lança', () => {
    expect(salvarAparencia(null, custom)).toBe(false);
    expect(carregarAparencia(null)).toEqual(aparenciaPadrao());
    expect(salvarAparencia(lancador, custom)).toBe(false);
    expect(carregarAparencia(lancador)).toEqual(aparenciaPadrao());
  });
});
