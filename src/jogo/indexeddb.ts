import { armazemMemoria, type ArmazemChaveValor } from './mundos';

/** Armazém sobre IndexedDB; se o navegador recusar, cai para memória sem lançar. */
export function armazemIndexedDB(nome = 'brumaluz'): ArmazemChaveValor {
  const reserva = armazemMemoria();
  let falhou = false;
  const abrir = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const req = indexedDB.open(nome, 1);
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  async function transacao<T>(
    modo: IDBTransactionMode,
    f: (s: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T | undefined> {
    const db = await abrir;
    if (!db || falhou) throw new Error('sem banco');
    return new Promise((resolve, reject) => {
      const tx = db.transaction('kv', modo);
      const req = f(tx.objectStore('kv'));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
  async function tentar<T>(f: () => Promise<T>, r: () => Promise<T>): Promise<T> {
    try {
      return await f();
    } catch {
      falhou = true;
      return r();
    }
  }
  return {
    obter: (k) =>
      tentar(
        () => transacao('readonly', (s) => s.get(k)),
        () => reserva.obter(k),
      ),
    gravar: (k, v) =>
      tentar(
        async () => {
          await transacao('readwrite', (s) => s.put(v, k));
        },
        () => reserva.gravar(k, v),
      ),
    remover: (k) =>
      tentar(
        async () => {
          await transacao('readwrite', (s) => s.delete(k));
        },
        () => reserva.remover(k),
      ),
  };
}
