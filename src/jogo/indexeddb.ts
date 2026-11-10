import { armazemMemoria, type ArmazemChaveValor } from './mundos';

/**
 * Defeito conhecido do WebKit (Safari e Chrome do iPhone): depois de uma recarga, o pedido de
 * abrir o banco às vezes fica pendurado para sempre, sem sucesso nem erro, e o jogo ficava na
 * tela azul-escura até dar refresh. Pedir a lista de bancos de tempos em tempos até ela
 * responder "acorda" o IndexedDB; depois disso o pedido de abrir volta a funcionar.
 */
async function acordarIndexedDB(): Promise<void> {
  const idb = indexedDB as IDBFactory & { databases?: () => Promise<unknown> };
  if (typeof idb.databases !== 'function') return;
  await new Promise<void>((pronto) => {
    let feito = false;
    const fim = () => {
      if (feito) return;
      feito = true;
      clearInterval(t);
      pronto();
    };
    const tentar = () => {
      try {
        idb.databases!().then(fim, fim);
      } catch {
        fim();
      }
    };
    const t = setInterval(tentar, 100);
    tentar();
    // não espera para sempre: segue para o pedido de abrir
    setTimeout(fim, 3000);
  });
}

/** Um pedido de abrir, com tempo-limite (null se pendurou, recusou ou bloqueou). */
function pedirAbertura(nome: string, limite: number): Promise<IDBDatabase | null | 'demorou'> {
  return new Promise((resolve) => {
    let desistiu = false;
    const t = setTimeout(() => {
      desistiu = true;
      resolve('demorou');
    }, limite);
    try {
      const req = indexedDB.open(nome, 1);
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => {
        clearTimeout(t);
        // chegou depois do prazo (já há outro pedido no lugar dele): não fica uma conexão sobrando
        if (desistiu) req.result.close?.();
        else resolve(req.result);
      };
      req.onerror = () => {
        clearTimeout(t);
        resolve(null);
      };
      // bloqueado por outra aba (ou pela página anterior, guardada pelo navegador): espera ela
      // soltar; se demorar, o prazo tenta de novo. Antes caía para a memória, e o mundo
      // aberto aparecia vazio e sem salvar
      req.onblocked = () => undefined;
    } catch {
      clearTimeout(t);
      resolve(null);
    }
  });
}

/** Abre o banco acordando-o antes e tentando de novo se o pedido pendurar. */
async function abrirComPersistencia(nome: string): Promise<IDBDatabase | null> {
  await acordarIndexedDB();
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const r = await pedirAbertura(nome, 2500 + tentativa * 1500);
    if (r !== 'demorou') return r;
    await acordarIndexedDB();
  }
  return null;
}

class SemBanco extends Error {}

/** Armazém sobre IndexedDB; se o navegador recusar abrir, cai para memória sem lançar. */
export function armazemIndexedDB(nome = 'brumaluz'): ArmazemChaveValor {
  const reserva = armazemMemoria();
  let falhou = false;
  const abrir = abrirComPersistencia(nome);
  /** Uma transação com prazo: no iPhone ela às vezes pendura sem erro nenhum. */
  async function transacao<T>(
    modo: IDBTransactionMode,
    f: (s: IDBObjectStore) => IDBRequest<T>,
    prazo = 8000,
  ): Promise<T | undefined> {
    const db = await abrir;
    if (!db || falhou) throw new SemBanco();
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('demorou')), prazo);
      try {
        const tx = db.transaction('kv', modo);
        const req = f(tx.objectStore('kv'));
        tx.oncomplete = () => {
          clearTimeout(t);
          resolve(req.result);
        };
        tx.onerror = () => {
          clearTimeout(t);
          reject(tx.error);
        };
        tx.onabort = () => {
          clearTimeout(t);
          reject(tx.error);
        };
      } catch (e) {
        clearTimeout(t);
        reject(e);
      }
    });
  }
  /**
   * Sem banco (o navegador recusou abrir): vai para a memória, como antes. Erro numa operação
   * (pendurou, estourou): tenta de novo e, se falhar outra vez, avisa quem pediu. Antes um erro
   * só jogava tudo para a memória em silêncio, e o mundo trazido da nuvem sumia ao recarregar.
   */
  async function tentar<T>(f: () => Promise<T>, r: () => Promise<T>): Promise<T> {
    try {
      return await f();
    } catch (e) {
      if (e instanceof SemBanco) return r();
      await acordarIndexedDB();
      return f();
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
