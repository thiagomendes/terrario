import { describe, expect, it } from 'vitest';
import { lugarNaBarra, noMundo, pagar, PAGAMENTO } from '../../src/jogo/compra';
import {
  bocaNaRefeicao,
  bracoNaRefeicao,
  DURACAO_REFEICAO,
  felizNaRefeicao,
  FIM_REFEICAO,
  jeitoDeComer,
  MORDIDAS,
  mordidasAte,
} from '../../src/jogo/refeicao';
import type { Slot } from '../../src/jogo/inventario';

/** Spec 032: as regras puras de comprar e de comer. */
describe('spec 032: comprar (puro)', () => {
  const vazia = (): Slot[] => Array.from({ length: 36 }, () => null);

  it('o lanche entra na pilha dele (a da mão primeiro), na mão vazia ou no primeiro espaço vazio', () => {
    const s = vazia();
    expect(lugarNaBarra(s, 'pipoca', 4)).toBe(4);
    s[4] = { item: 'graveto', qtd: 1 };
    expect(lugarNaBarra(s, 'pipoca', 4)).toBe(0);
    s[6] = { item: 'pipoca', qtd: 2 };
    expect(lugarNaBarra(s, 'pipoca', 4)).toBe(6);
    s[2] = { item: 'pipoca', qtd: 1 };
    expect(lugarNaBarra(s, 'pipoca', 2)).toBe(2);
    // a pilha cheia não conta
    s[6] = { item: 'pipoca', qtd: 16 };
    s[2] = null;
    expect(lugarNaBarra(s, 'pipoca', 4, 16)).toBe(0);
  });

  it('a barrinha cheia (os 9 de baixo ocupados por outras coisas): -1, mesmo com a mochila vazia', () => {
    const s = vazia();
    for (let i = 0; i < 9; i++) s[i] = { item: 'graveto', qtd: 1 };
    expect(lugarNaBarra(s, 'suco', 0)).toBe(-1);
    s[7] = { item: 'suco', qtd: 1 };
    expect(lugarNaBarra(s, 'suco', 0)).toBe(7);
  });

  it('o pagamento é a fichinha de mentirinha, de graça (nenhuma moedinha sai)', () => {
    expect(PAGAMENTO.preco).toBe(0);
    expect(pagar('ana', 'pipoca')).toBe(true);
  });

  it('o ponto da peça no mundo gira com a frente dela', () => {
    const q = { x: 10, y: 5, z: 20 };
    const r = (v: number[]) => v.map((n) => Math.round(n * 1000) / 1000);
    expect(r(noMundo({ ...q, dir: 0 }, 1, 0.5, 2))).toEqual([11, 5.5, 22]);
    expect(r(noMundo({ ...q, dir: 1 }, 0, 0, 2))).toEqual([12, 5, 20]);
    expect(r(noMundo({ ...q, dir: 2 }, 0, 0, 2))).toEqual([10, 5, 18]);
    expect(r(noMundo({ ...q, dir: 3 }, 0, 0, 2))).toEqual([8, 5, 20]);
  });
});

describe('spec 032: o momento de comer (puro)', () => {
  it('cada comida do seu jeito', () => {
    expect(jeitoDeComer('cachorro_quente')).toBe('mordida');
    expect(jeitoDeComer('maca')).toBe('mordida');
    expect(jeitoDeComer('pipoca')).toBe('pipoca');
    expect(jeitoDeComer('suco')).toBe('canudinho');
    expect(jeitoDeComer('vitamina')).toBe('canudinho');
    expect(jeitoDeComer('ensopado')).toBe('colherada');
    expect(jeitoDeComer('algodao_doce')).toBe('nuvem');
  });

  it('três mordidas, na ordem, dentro da refeição; a carinha feliz no fim', () => {
    expect(MORDIDAS.length).toBe(3);
    expect(mordidasAte(0)).toBe(0);
    expect(mordidasAte(MORDIDAS[0])).toBe(1);
    expect(mordidasAte(MORDIDAS[2] + 0.01)).toBe(3);
    expect(MORDIDAS[2]).toBeLessThan(DURACAO_REFEICAO);
    expect(FIM_REFEICAO).toBeGreaterThan(DURACAO_REFEICAO);
    expect(felizNaRefeicao(MORDIDAS[1])).toBe(0);
    expect(felizNaRefeicao(2.5)).toBeGreaterThan(0.9);
  });

  it('a boca abre antes de cada mordida e fecha nela; o braço está na boca nas três', () => {
    for (const m of MORDIDAS) {
      expect(bocaNaRefeicao(m - 0.06)).toBeGreaterThan(0.7);
      expect(bocaNaRefeicao(m + 0.07)).toBeLessThan(0.3);
      expect(bracoNaRefeicao(m)).toBe(1);
    }
    expect(bracoNaRefeicao(0)).toBe(0);
    expect(bracoNaRefeicao(DURACAO_REFEICAO)).toBe(0);
  });
});
