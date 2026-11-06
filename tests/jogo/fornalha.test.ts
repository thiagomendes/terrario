import { describe, expect, it } from 'vitest';
import { novaFornalha, passoFornalha } from '../../src/jogo/fornalha';
import { TEMPO_FUNDIR } from '../../src/jogo/receitas';

describe('fornalha', () => {
  it('funde ferro bruto com carvão e acende', () => {
    const f = novaFornalha();
    f.entrada = { item: 'ferro_bruto', qtd: 2 };
    f.combustivel = { item: 'carvao', qtd: 1 };
    let r = passoFornalha(f, 0.1);
    expect(r.acesa).toBe(true);
    expect(f.combustivel).toBeNull();
    for (let t = 0; t < TEMPO_FUNDIR * 2 + 0.5; t += 0.1) r = passoFornalha(f, 0.1);
    expect(f.saida).toEqual({ item: 'lingote_ferro', qtd: 2 });
    expect(f.entrada).toBeNull();
  });

  it('sem combustível não faz nada e sem receita não gasta combustível', () => {
    const a = novaFornalha();
    a.entrada = { item: 'ferro_bruto', qtd: 1 };
    expect(passoFornalha(a, 1).acesa).toBe(false);
    const b = novaFornalha();
    b.entrada = { item: 'graveto', qtd: 1 };
    b.combustivel = { item: 'carvao', qtd: 3 };
    passoFornalha(b, 1);
    expect(b.combustivel?.qtd).toBe(3);
  });

  it('para quando a saída tem outro item', () => {
    const f = novaFornalha();
    f.entrada = { item: 'ferro_bruto', qtd: 1 };
    f.combustivel = { item: 'carvao', qtd: 1 };
    f.saida = { item: 'lingote_cobre', qtd: 1 };
    passoFornalha(f, 20);
    expect(f.entrada?.qtd).toBe(1);
  });
});
