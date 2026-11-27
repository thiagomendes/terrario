export const MAX_REMALHAS_POR_QUADRO = 2;

export interface ItemFila<T> {
  cx: number;
  cz: number;
  editado: boolean;
  dados: T;
  /**
   * A versão do pedido. As respostas dos dois trabalhadores chegam fora de ordem (a do de edição,
   * rápido, pode passar a do carregamento): com ela, a resposta mais velha nunca substitui a
   * mais nova na fila.
   */
  versao?: number;
}

export interface FilaRemalha<T = unknown> {
  adicionar(item: ItemFila<T>): void;
  retirar(n: number): ItemFila<T>[];
  readonly tamanho: number;
}

/**
 * Fila que junta pedidos do mesmo chunk (o de versão maior vence; sem versão, o que chegou por
 * último) e serve os editados primeiro.
 */
export function criarFilaRemalha<T = unknown>(): FilaRemalha<T> {
  const itens = new Map<string, ItemFila<T>>();
  return {
    adicionar(item) {
      const k = `${item.cx},${item.cz}`;
      const anterior = itens.get(k);
      const editado = item.editado || (anterior?.editado ?? false);
      // a resposta mais velha que chega depois não troca a mais nova (fica a nova, com o
      // "editado" das duas)
      const maisVelha =
        anterior?.versao !== undefined &&
        item.versao !== undefined &&
        item.versao < anterior.versao;
      itens.delete(k);
      itens.set(k, { ...(maisVelha ? anterior : item), editado });
    },
    retirar(n) {
      const todos = [...itens.values()];
      const ordem = [...todos.filter((i) => i.editado), ...todos.filter((i) => !i.editado)];
      const saida = ordem.slice(0, Math.max(0, n));
      for (const i of saida) itens.delete(`${i.cx},${i.cz}`);
      return saida;
    },
    get tamanho() {
      return itens.size;
    },
  };
}
