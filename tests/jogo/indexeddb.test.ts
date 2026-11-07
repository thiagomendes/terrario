import { afterEach, describe, expect, it } from 'vitest';
import { armazemIndexedDB } from '../../src/jogo/indexeddb';

/**
 * IndexedDB de mentira, só o que o armazém usa: abrir, uma loja 'kv', get e put. O primeiro
 * pedido de abrir pode ficar pendurado para sempre, como no WebKit depois de uma recarga.
 */
function falsoIndexedDB(penduraPrimeiro: boolean) {
  const dados = new Map<string, unknown>();
  let pedidos = 0;
  let listas = 0;
  const db = {
    transaction() {
      const tx: Record<string, unknown> = {};
      const store = {
        get(k: string) {
          const req: Record<string, unknown> = { result: dados.get(k) };
          setTimeout(() => (tx.oncomplete as () => void)?.(), 0);
          return req;
        },
        put(v: unknown, k: string) {
          dados.set(k, v);
          setTimeout(() => (tx.oncomplete as () => void)?.(), 0);
          return {};
        },
        delete(k: string) {
          dados.delete(k);
          setTimeout(() => (tx.oncomplete as () => void)?.(), 0);
          return {};
        },
      };
      tx.objectStore = () => store;
      return tx;
    },
  };
  const fabrica = {
    open() {
      pedidos++;
      const req: Record<string, unknown> = {};
      if (!(penduraPrimeiro && pedidos === 1)) {
        req.result = db;
        setTimeout(() => (req.onsuccess as () => void)?.(), 5);
      }
      return req;
    },
    databases() {
      listas++;
      return Promise.resolve([]);
    },
  };
  return { fabrica, pedidos: () => pedidos, listas: () => listas };
}

const original = (globalThis as { indexedDB?: unknown }).indexedDB;
afterEach(() => {
  (globalThis as { indexedDB?: unknown }).indexedDB = original;
});

describe('armazém no IndexedDB', () => {
  it('grava e lê normalmente', async () => {
    const f = falsoIndexedDB(false);
    (globalThis as { indexedDB?: unknown }).indexedDB = f.fabrica;
    const a = armazemIndexedDB('teste');
    await a.gravar('mundo', { nome: 'Ana' });
    expect(await a.obter('mundo')).toEqual({ nome: 'Ana' });
    expect(f.pedidos()).toBe(1);
    // acordou o banco antes de abrir (correção do WebKit)
    expect(f.listas()).toBeGreaterThan(0);
  });

  it('se o pedido de abrir pendurar, tenta de novo e o mundo carrega', async () => {
    const f = falsoIndexedDB(true);
    (globalThis as { indexedDB?: unknown }).indexedDB = f.fabrica;
    const a = armazemIndexedDB('teste');
    await a.gravar('mundo', { nome: 'Bia' });
    expect(await a.obter('mundo')).toEqual({ nome: 'Bia' });
    expect(f.pedidos()).toBe(2);
  }, 10_000);
});
