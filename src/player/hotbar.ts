import { Bloco } from '../world/blocks';
import { criarInventario, TAMANHO_BARRA, type Inventario, type Pilha } from '../jogo/inventario';
import { blocoDoItem, idDoBloco, obterItem } from '../jogo/itens';

export interface SlotBarra {
  bloco: number;
  nome: string;
}

/** Kit inicial: os 6 blocos clássicos nos primeiros slots da barra. */
export const SLOTS: readonly SlotBarra[] = [
  { bloco: Bloco.TERRA_MUSGOSA, nome: 'terra musgosa' },
  { bloco: Bloco.PEDRA_RACHADA, nome: 'pedra rachada' },
  { bloco: Bloco.AREIA_BRUMA, nome: 'areia-bruma' },
  { bloco: Bloco.MADEIRA_RETORCIDA, nome: 'madeira retorcida' },
  { bloco: Bloco.TABUAS, nome: 'tábuas' },
  { bloco: Bloco.CRISTAL_LUZ, nome: 'cristal-luz' },
];

/** Extras do kit criativo, depois dos 6 clássicos. */
export const KIT_EXTRA: readonly number[] = [Bloco.FOLHAGEM, Bloco.FLOR, Bloco.COGUMELO_BRILHANTE];

export interface SlotVisivel {
  /** Bloco que o slot coloca, ou 0 (ar) se vazio ou não for bloco. */
  bloco: number;
  nome: string;
  pilha: Pilha | null;
}

export interface Hotbar {
  readonly slots: readonly SlotVisivel[];
  readonly ativo: number;
  readonly inventario: Inventario;
  blocoAtivo(): number;
  pilhaAtiva(): Pilha | null;
  selecionar(i: number): void;
  proximo(): void;
  anterior(): void;
}

export function preencherKit(inv: Inventario, blocos: readonly number[]): void {
  blocos.forEach((b, i) => inv.definir(i, { item: idDoBloco(b), qtd: 64 }));
}

export function criarHotbar(inventario?: Inventario): Hotbar {
  const inv = inventario ?? criarInventario();
  if (!inventario) preencherKit(inv, [...SLOTS.map((s) => s.bloco), ...KIT_EXTRA]);
  let ativo = 0;
  const total = TAMANHO_BARRA;
  const slotVisivel = (i: number): SlotVisivel => {
    const p = inv.obter(i);
    return {
      bloco: blocoDoItem(p?.item) ?? Bloco.AR,
      nome: p ? (obterItem(p.item)?.nome ?? p.item) : 'vazio',
      pilha: p,
    };
  };
  return {
    get slots() {
      return Array.from({ length: total }, (_, i) => slotVisivel(i));
    },
    get ativo() {
      return ativo;
    },
    inventario: inv,
    blocoAtivo: () => slotVisivel(ativo).bloco,
    pilhaAtiva: () => inv.obter(ativo),
    selecionar(i: number) {
      if (Number.isInteger(i) && i >= 0 && i < total) ativo = i;
    },
    proximo() {
      ativo = (ativo + 1) % total;
    },
    anterior() {
      ativo = (ativo + total - 1) % total;
    },
  };
}

export function teclaParaSlot(codigo: string): number | null {
  const m = /^Digit([1-9])$/.exec(codigo);
  return m ? Number(m[1]) - 1 : null;
}

/** Roda para baixo (deltaY positivo) avança; para cima volta. */
export function deltaRodaParaPasso(deltaY: number): number {
  if (deltaY > 0) return 1;
  if (deltaY < 0) return -1;
  return 0;
}
