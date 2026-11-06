import { describe, expect, it } from 'vitest';
import { registrarCatalogo } from '../../src/jogo/catalogo';
import { obterItem } from '../../src/jogo/itens';
import { pegarSaida, trocar } from '../../src/ui/conteiner';

registrarCatalogo();
const ITEM = 'graveto';
const max = () => obterItem(ITEM)?.pilha ?? 64;

describe('contêiner respeita o máximo da pilha', () => {
  it('botão direito não passa do máximo', () => {
    const cheio = { item: ITEM, qtd: max() };
    const [alvo, cursor] = trocar(cheio, { item: ITEM, qtd: 5 }, 'direito');
    expect(alvo).toEqual(cheio);
    expect(cursor).toEqual({ item: ITEM, qtd: 5 });
  });
  it('botão direito com espaço põe um', () => {
    const [alvo, cursor] = trocar({ item: ITEM, qtd: 3 }, { item: ITEM, qtd: 2 }, 'direito');
    expect(alvo?.qtd).toBe(4);
    expect(cursor?.qtd).toBe(1);
  });
  it('saída da fornalha pega só o que cabe e deixa o resto', () => {
    const r = pegarSaida({ item: ITEM, qtd: max() - 2 }, { item: ITEM, qtd: 5 });
    expect(r.pego).toBe(2);
    expect(r.cursor?.qtd).toBe(max());
    expect(r.saida).toEqual({ item: ITEM, qtd: 3 });
  });
  it('cursor cheio ou de outro item não pega nada', () => {
    const saida = { item: ITEM, qtd: 5 };
    expect(pegarSaida({ item: ITEM, qtd: max() }, saida).pego).toBe(0);
    expect(pegarSaida({ item: 'outro', qtd: 1 }, saida).pego).toBe(0);
  });
  it('cursor vazio pega a saída toda', () => {
    const r = pegarSaida(null, { item: ITEM, qtd: 4 });
    expect(r).toEqual({ cursor: { item: ITEM, qtd: 4 }, saida: null, pego: 4 });
  });
});
