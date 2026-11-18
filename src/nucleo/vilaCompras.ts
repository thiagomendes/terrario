/**
 * Spec 032: comprar nas barracas da Vila Neon, no núcleo. Puro (sem tela): vale igual no
 * aparelho e na nuvem.
 *
 * - O toque num lanche (o índice em `balcoesDaVila`) de quem o alcança começa a entrega: todos
 *   veem (`vilaCompra`: a fichinha, o preparo, a vendedora entrega) e o lanche entra na barrinha
 *   de quem comprou quando ele chega na mão (`CHEGA_NA_MAO` depois).
 * - Uma compra por vez por criança (`ESPERA_COMPRA`); no máximo `MAX_POR_LANCHE` de cada lanche.
 * - Barrinha cheia: nada é comprado e nada sai da mão (`vilaCompra` com `cheia`, para a tela
 *   mostrar com carinho).
 * - O pagamento é o passo `pagar` de `src/jogo/compra.ts` (hoje, a fichinha de graça).
 */
import {
  alcancaOBalcao,
  CHEGA_NA_MAO,
  ESPERA_COMPRA,
  MAX_POR_LANCHE,
  pagar,
  type Balcao,
} from '../jogo/compra';

export interface JogadorCompra {
  id: string;
  x: number;
  y: number;
  z: number;
  morto: boolean;
  contar(item: string): number;
  /** Põe na mochila; devolve o que não coube. */
  dar(item: string, qtd: number): number;
  /** Cabe na barrinha (a pilha dele, a mão vazia ou um espaço vazio)? */
  cabeNaBarra?(item: string): boolean;
  /** Põe um na barrinha (e avisa a tela); falso se não coube. */
  porNaBarra?(item: string): boolean;
}

export type EventoCompras =
  /** `quem` comprou o lanche `i` (ou tentou, com a barrinha `cheia`). */
  { e: 'vilaCompra'; i: number; quem: string; cheia?: true };

export type ComandoCompras = { a: 'comprar'; i: number };

export interface CtxCompras {
  balcoes: readonly Balcao[];
  agora(): number;
  jogador(id: string): JogadorCompra | undefined;
  espalhar(e: EventoCompras): void;
}

export function criarComprasDaVila(ctx: CtxCompras) {
  /** Quando cada criança tocou para comprar pela última vez. */
  const ultima = new Map<string, number>();
  /** Os lanches a caminho da mão: quem, qual e quando chegam. */
  let aCaminho: { id: string; i: number; t: number }[] = [];

  function comprar(id: string, i: number): void {
    const b = ctx.balcoes[i];
    const j = ctx.jogador(id);
    if (!b || !j || j.morto) return;
    if (!alcancaOBalcao(b, j.x, j.z) || Math.abs(j.y - b.p[1]) > 4) return;
    const t = ctx.agora();
    if (t - (ultima.get(id) ?? -Infinity) < ESPERA_COMPRA) return;
    if (aCaminho.some((q) => q.id === id)) return;
    if (j.contar(b.item) >= MAX_POR_LANCHE) return;
    ultima.set(id, t);
    if (ultima.size > 256) ultima.delete(ultima.keys().next().value as string);
    if (j.cabeNaBarra && !j.cabeNaBarra(b.item)) {
      ctx.espalhar({ e: 'vilaCompra', i, quem: id, cheia: true });
      return;
    }
    if (!pagar(id, b.lanche)) return;
    aCaminho.push({ id, i, t: t + CHEGA_NA_MAO });
    ctx.espalhar({ e: 'vilaCompra', i, quem: id });
  }

  /** O lanche chegou na mão: entra na barrinha (se ela encheu no meio, vai para a mochila). */
  function entregar(): void {
    if (!aCaminho.length) return;
    const t = ctx.agora();
    const fica: typeof aCaminho = [];
    for (const q of aCaminho) {
      if (t < q.t) {
        fica.push(q);
        continue;
      }
      const b = ctx.balcoes[q.i];
      const j = ctx.jogador(q.id);
      if (!b || !j || j.morto) continue;
      if (!j.porNaBarra?.(b.item)) j.dar(b.item, 1);
    }
    aCaminho = fica;
  }

  return {
    comando(id: string, c: ComandoCompras): void {
      comprar(id, c.i);
    },
    passo(): void {
      entregar();
    },
    /** Testes: os lanches a caminho. */
    aCaminho: () => aCaminho.map((q) => ({ ...q })),
  };
}

export type ComprasDaVila = ReturnType<typeof criarComprasDaVila>;
