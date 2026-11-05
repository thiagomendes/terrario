import { Bloco } from '../world/blocks';

export interface SlotBarra {
  bloco: number;
  nome: string;
}

export const SLOTS: readonly SlotBarra[] = [
  { bloco: Bloco.TERRA_MUSGOSA, nome: 'terra musgosa' },
  { bloco: Bloco.PEDRA_RACHADA, nome: 'pedra rachada' },
  { bloco: Bloco.AREIA_BRUMA, nome: 'areia-bruma' },
  { bloco: Bloco.MADEIRA_RETORCIDA, nome: 'madeira retorcida' },
  { bloco: Bloco.TABUAS, nome: 'tábuas' },
  { bloco: Bloco.CRISTAL_LUZ, nome: 'cristal-luz' },
];

export interface Hotbar {
  readonly slots: readonly SlotBarra[];
  readonly ativo: number;
  blocoAtivo(): number;
  selecionar(i: number): void;
  proximo(): void;
  anterior(): void;
}

export function criarHotbar(): Hotbar {
  let ativo = 0;
  const total = SLOTS.length;
  return {
    slots: SLOTS,
    get ativo() {
      return ativo;
    },
    blocoAtivo: () => SLOTS[ativo].bloco,
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
  const m = /^Digit([1-6])$/.exec(codigo);
  return m ? Number(m[1]) - 1 : null;
}

/** Roda para baixo (deltaY positivo) avança; para cima volta. */
export function deltaRodaParaPasso(deltaY: number): number {
  if (deltaY > 0) return 1;
  if (deltaY < 0) return -1;
  return 0;
}
