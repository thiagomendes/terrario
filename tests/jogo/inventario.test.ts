import { describe, expect, it } from 'vitest';
import { criarInventario, TAMANHO_BARRA } from '../../src/jogo/inventario';
import { idDoBloco, obterItem, registrarItem, todosItens } from '../../src/jogo/itens';
import { Bloco } from '../../src/world/blocks';
import { criarMundoDeItens, dropsDoBloco } from '../../src/jogo/drops';
import { criarGerador } from '../../src/audio/variacao';

const PEDRA = idDoBloco(Bloco.PEDRA_RACHADA);
const TERRA = idDoBloco(Bloco.TERRA_MUSGOSA);
registrarItem({
  id: 'teste:espada',
  nome: 'Espada',
  tipo: 'ferramenta',
  pilha: 1,
  durabilidade: 50,
});

describe('itens', () => {
  it('cada bloco do registro vira item de pilha 64, menos o ar', () => {
    expect(obterItem(PEDRA)).toMatchObject({
      tipo: 'bloco',
      pilha: 64,
      bloco: Bloco.PEDRA_RACHADA,
    });
    expect(obterItem(idDoBloco(Bloco.AR))).toBeUndefined();
    expect(todosItens().filter((i) => i.tipo === 'bloco').length).toBeGreaterThanOrEqual(10);
  });
});

describe('inventário', () => {
  it('adiciona juntando pilhas e respeita o máximo', () => {
    const inv = criarInventario();
    expect(inv.adicionar(PEDRA, 100)).toBe(0);
    expect(inv.obter(0)).toEqual({ item: PEDRA, qtd: 64 });
    expect(inv.obter(1)).toEqual({ item: PEDRA, qtd: 36 });
    inv.adicionar(PEDRA, 10);
    expect(inv.obter(1)!.qtd).toBe(46);
    expect(inv.contar(PEDRA)).toBe(110);
  });

  it('devolve o que não coube com o inventário cheio', () => {
    const inv = criarInventario(2);
    expect(inv.adicionar(PEDRA, 200)).toBe(72);
    expect(inv.adicionar('item:inexistente', 3)).toBe(3);
  });

  it('ferramentas não empilham e guardam durabilidade', () => {
    const inv = criarInventario();
    inv.adicionar('teste:espada', 1, 50);
    inv.adicionar('teste:espada', 1, 20);
    expect(inv.obter(0)).toEqual({ item: 'teste:espada', qtd: 1, dur: 50 });
    expect(inv.obter(1)).toEqual({ item: 'teste:espada', qtd: 1, dur: 20 });
  });

  it('consumir é tudo ou nada', () => {
    const inv = criarInventario();
    inv.adicionar(TERRA, 5);
    expect(inv.consumir(TERRA, 6)).toBe(false);
    expect(inv.contar(TERRA)).toBe(5);
    expect(inv.consumir(TERRA, 5)).toBe(true);
    expect(inv.obter(0)).toBeNull();
  });

  it('clique esquerdo pega, troca e junta; direito divide e solta um', () => {
    const inv = criarInventario();
    inv.adicionar(PEDRA, 10);
    inv.definir(1, { item: TERRA, qtd: 3 });
    let cursor = inv.clicar(0, null, 'esquerdo');
    expect(cursor).toEqual({ item: PEDRA, qtd: 10 });
    expect(inv.obter(0)).toBeNull();
    cursor = inv.clicar(1, cursor, 'esquerdo');
    expect(cursor).toEqual({ item: TERRA, qtd: 3 });
    expect(inv.obter(1)).toEqual({ item: PEDRA, qtd: 10 });
    cursor = inv.clicar(2, cursor, 'direito');
    expect(inv.obter(2)).toEqual({ item: TERRA, qtd: 1 });
    expect(cursor!.qtd).toBe(2);
    cursor = inv.clicar(2, cursor, 'esquerdo');
    expect(cursor).toBeNull();
    expect(inv.obter(2)!.qtd).toBe(3);
    cursor = inv.clicar(1, null, 'direito');
    expect(cursor).toEqual({ item: PEDRA, qtd: 5 });
    expect(inv.obter(1)!.qtd).toBe(5);
  });

  it('Shift+clique move entre barra e mochila', () => {
    const inv = criarInventario();
    inv.definir(0, { item: PEDRA, qtd: 5 });
    inv.moverRapido(0);
    expect(inv.obter(0)).toBeNull();
    expect(inv.obter(TAMANHO_BARRA)).toEqual({ item: PEDRA, qtd: 5 });
    inv.moverRapido(TAMANHO_BARRA);
    expect(inv.obter(0)).toEqual({ item: PEDRA, qtd: 5 });
  });

  it('salva e carrega descartando lixo', () => {
    const inv = criarInventario();
    inv.adicionar(PEDRA, 3);
    const outro = criarInventario();
    outro.carregar(JSON.parse(JSON.stringify(inv.salvar())));
    expect(outro.obter(0)).toEqual({ item: PEDRA, qtd: 3 });
    outro.carregar({
      slots: [
        { item: 'x', qtd: 2 },
        { item: PEDRA, qtd: 999 },
      ],
    });
    expect(outro.obter(0)).toBeNull();
    expect(outro.obter(1)!.qtd).toBe(64);
  });

  it('avisa os ouvintes a cada mudança', () => {
    const inv = criarInventario();
    let n = 0;
    inv.ouvir(() => n++);
    inv.adicionar(PEDRA, 1);
    inv.remover(0, 1);
    expect(n).toBe(2);
  });
});

describe('drops', () => {
  const rng = criarGerador(3);
  it('blocos soltam a si mesmos e grama alta não solta nada', () => {
    expect(dropsDoBloco(Bloco.PEDRA_RACHADA, rng)).toEqual([{ item: PEDRA, qtd: 1 }]);
    expect(dropsDoBloco(Bloco.GRAMA_ALTA, rng)).toEqual([]);
  });

  it('item cai no chão, é atraído e coletado depois de um instante', () => {
    const chao = (_x: number, y: number) => y < 10;
    const m = criarMundoDeItens(chao);
    m.soltar(PEDRA, 2, 0.5, 11, 0.5, criarGerador(1));
    const longe = { x: 50, y: 10, z: 50 };
    for (let i = 0; i < 120; i++) m.atualizar(1 / 60, longe, () => 0);
    expect(m.itens[0].y).toBeCloseTo(10.125, 3);
    const perto = { x: m.itens[0].x + 1.5, y: 10, z: m.itens[0].z };
    let coletado = 0;
    for (let i = 0; i < 120 && m.itens.length > 0; i++) {
      m.atualizar(1 / 60, perto, (_item, qtd) => {
        coletado += qtd;
        return 0;
      });
    }
    expect(coletado).toBe(2);
    expect(m.itens).toHaveLength(0);
  });

  it('itens iguais próximos se juntam e o que não cabe fica no chão', () => {
    const m = criarMundoDeItens((_x, y) => y < 10);
    m.soltar(PEDRA, 1, 0.5, 10.2, 0.5, () => 0);
    m.soltar(PEDRA, 1, 0.5, 10.2, 0.5, () => 0);
    m.atualizar(1 / 60, { x: 99, y: 0, z: 99 }, () => 0);
    expect(m.itens).toHaveLength(1);
    expect(m.itens[0].qtd).toBe(2);
  });
});
