import { obterItem } from './itens';

export const TAMANHO_BARRA = 9;
export const TAMANHO_INVENTARIO = 36;

export interface Pilha {
  item: string;
  qtd: number;
  /** Durabilidade restante (ferramentas). */
  dur?: number;
}

export type Slot = Pilha | null;

export interface InventarioSalvo {
  slots: Slot[];
  ativo: number;
}

function pilhaMax(item: string): number {
  return obterItem(item)?.pilha ?? 64;
}

function clonar(p: Slot): Slot {
  return p ? { ...p } : null;
}

export function mesmaPilha(a: Slot, b: Slot): boolean {
  return !!a && !!b && a.item === b.item && a.dur === undefined && b.dur === undefined;
}

export interface Inventario {
  readonly slots: readonly Slot[];
  readonly versao: number;
  obter(i: number): Slot;
  definir(i: number, p: Slot): void;
  /** Adiciona e devolve quanto sobrou (0 se coube tudo). Preenche pilhas, depois a barra, depois o resto. */
  adicionar(item: string, qtd: number, dur?: number): number;
  /** Remove até qtd do slot e devolve quanto removeu. */
  remover(i: number, qtd: number): number;
  contar(item: string): number;
  /** Consome qtd do item em qualquer slot; falso (sem mudar nada) se não houver o bastante. */
  consumir(item: string, qtd: number): boolean;
  /** Clique de "pegar e soltar": troca, junta ou divide com o que está no cursor. Devolve o novo cursor. */
  clicar(i: number, cursor: Slot, botao: 'esquerdo' | 'direito'): Slot;
  /** Move a pilha do slot entre barra e mochila (Shift+clique). */
  moverRapido(i: number): void;
  ouvir(f: () => void): () => void;
  salvar(): InventarioSalvo;
  carregar(dados: unknown): void;
}

export function criarInventario(tamanho = TAMANHO_INVENTARIO): Inventario {
  let slots: Slot[] = Array.from({ length: tamanho }, () => null);
  let versao = 0;
  const ouvintes = new Set<() => void>();
  const mudou = () => {
    versao++;
    for (const f of ouvintes) f();
  };
  const valido = (i: number) => Number.isInteger(i) && i >= 0 && i < tamanho;

  function adicionarEm(ordem: number[], item: string, qtd: number, dur?: number): number {
    const max = pilhaMax(item);
    let resto = qtd;
    if (dur === undefined) {
      for (const i of ordem) {
        const s = slots[i];
        if (resto <= 0) break;
        if (s && s.item === item && s.dur === undefined && s.qtd < max) {
          const n = Math.min(max - s.qtd, resto);
          s.qtd += n;
          resto -= n;
        }
      }
    }
    for (const i of ordem) {
      if (resto <= 0) break;
      if (slots[i] === null) {
        const n = Math.min(max, resto);
        slots[i] = dur === undefined ? { item, qtd: n } : { item, qtd: n, dur };
        resto -= n;
      }
    }
    return resto;
  }

  const inv: Inventario = {
    get slots() {
      return slots;
    },
    get versao() {
      return versao;
    },
    obter: (i) => (valido(i) ? slots[i] : null),
    definir(i, p) {
      if (!valido(i)) return;
      slots[i] = p && p.qtd > 0 ? { ...p } : null;
      mudou();
    },
    adicionar(item, qtd, dur) {
      if (!(qtd > 0) || !obterItem(item)) return qtd;
      const ordem = Array.from({ length: tamanho }, (_, i) => i);
      const resto = adicionarEm(ordem, item, Math.floor(qtd), dur);
      if (resto !== qtd) mudou();
      return resto;
    },
    remover(i, qtd) {
      const s = inv.obter(i);
      if (!s || !(qtd > 0)) return 0;
      const n = Math.min(s.qtd, Math.floor(qtd));
      s.qtd -= n;
      if (s.qtd <= 0) slots[i] = null;
      mudou();
      return n;
    },
    contar: (item) => slots.reduce((t, s) => t + (s && s.item === item ? s.qtd : 0), 0),
    consumir(item, qtd) {
      if (inv.contar(item) < qtd) return false;
      let resto = qtd;
      for (let i = tamanho - 1; i >= 0 && resto > 0; i--) {
        const s = slots[i];
        if (!s || s.item !== item) continue;
        const n = Math.min(s.qtd, resto);
        s.qtd -= n;
        resto -= n;
        if (s.qtd <= 0) slots[i] = null;
      }
      mudou();
      return true;
    },
    clicar(i, cursor, botao) {
      if (!valido(i)) return cursor;
      const s = slots[i];
      let novo: Slot = cursor;
      if (botao === 'esquerdo') {
        if (cursor && s && mesmaPilha(cursor, s)) {
          const max = pilhaMax(s.item);
          const n = Math.min(max - s.qtd, cursor.qtd);
          s.qtd += n;
          novo = cursor.qtd - n > 0 ? { ...cursor, qtd: cursor.qtd - n } : null;
        } else {
          slots[i] = clonar(cursor);
          novo = clonar(s);
        }
      } else if (!cursor && s) {
        // direito sem nada na mão: pega metade (arredondada para cima)
        const metade = Math.ceil(s.qtd / 2);
        novo = { ...s, qtd: metade };
        s.qtd -= metade;
        if (s.qtd <= 0) slots[i] = null;
      } else if (cursor) {
        // direito com algo na mão: solta uma unidade
        if (!s) {
          slots[i] = { ...cursor, qtd: 1 };
          novo = cursor.qtd > 1 ? { ...cursor, qtd: cursor.qtd - 1 } : null;
        } else if (mesmaPilha(cursor, s) && s.qtd < pilhaMax(s.item)) {
          s.qtd += 1;
          novo = cursor.qtd > 1 ? { ...cursor, qtd: cursor.qtd - 1 } : null;
        }
      }
      mudou();
      return novo;
    },
    moverRapido(i) {
      const s = inv.obter(i);
      if (!s) return;
      const naBarra = i < TAMANHO_BARRA;
      const destino = naBarra
        ? Array.from({ length: tamanho - TAMANHO_BARRA }, (_, k) => k + TAMANHO_BARRA)
        : Array.from({ length: TAMANHO_BARRA }, (_, k) => k);
      slots[i] = null;
      const resto = adicionarEm(destino, s.item, s.qtd, s.dur);
      if (resto > 0) slots[i] = { ...s, qtd: resto };
      mudou();
    },
    ouvir(f) {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    salvar: () => ({ slots: slots.map(clonar), ativo: 0 }),
    carregar(dados) {
      const d = dados as Partial<InventarioSalvo> | null;
      if (!d || !Array.isArray(d.slots)) return;
      slots = Array.from({ length: tamanho }, (_, i) => {
        const p = d.slots![i] as Slot | undefined;
        if (!p || typeof p.item !== 'string' || !(p.qtd > 0) || !obterItem(p.item)) return null;
        const max = pilhaMax(p.item);
        const q: Pilha = { item: p.item, qtd: Math.min(max, Math.floor(p.qtd)) };
        if (typeof p.dur === 'number') q.dur = p.dur;
        return q;
      });
      mudou();
    },
  };
  return inv;
}
