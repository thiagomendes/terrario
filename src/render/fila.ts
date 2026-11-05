export const MAX_REMALHAS_POR_QUADRO = 2;

export interface ItemFila<T> {
  cx: number;
  cz: number;
  editado: boolean;
  dados: T;
}

export interface FilaRemalha<T = unknown> {
  adicionar(item: ItemFila<T>): void;
  retirar(n: number): ItemFila<T>[];
  readonly tamanho: number;
}

/** Fila que junta pedidos do mesmo chunk (o mais novo vence) e serve os editados primeiro. */
export function criarFilaRemalha<T = unknown>(): FilaRemalha<T> {
  const itens = new Map<string, ItemFila<T>>();
  return {
    adicionar(item) {
      const k = `${item.cx},${item.cz}`;
      const anterior = itens.get(k);
      itens.delete(k);
      itens.set(k, { ...item, editado: item.editado || (anterior?.editado ?? false) });
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
