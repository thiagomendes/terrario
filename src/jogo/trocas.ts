import type { Inventario } from './inventario';
import { idDoBloco } from './itens';
import { Bloco } from '../world/blocks';
import type { Profissao } from '../world/povoado';
import type { EstiloMundo } from '../temas/tipos';
import { COLHER_PEDREIRO, trocaNoMundo } from './exclusivos';

/**
 * Trocas dos moradores (spec 008): fixas por profissão, iguais em todo tema, sem
 * moeda e sem itens raros de graça. Cada troca pode ser repetida à vontade.
 */
export interface ItemTroca {
  item: string;
  qtd: number;
}
export interface Troca {
  id: string;
  dar: ItemTroca[];
  receber: ItemTroca;
  /**
   * Spec 014: a troca só existe nos mundos desta planta (a do pedreiro da cidade: tijolo,
   * escada e toldo para o canteiro). Sem o campo, em todo tema (menos o exclusivo de outro).
   */
  planta?: 'cidade' | 'bairro';
  /** Spec 014: a troca da roça que o pedreiro da cidade não faz (a lista dele cabe em 8). */
  foraDaCidade?: true;
}

const b = idDoBloco;

export const TROCAS: Record<Profissao, readonly Troca[]> = {
  ferreiro: [
    {
      id: 'picareta',
      dar: [{ item: b(Bloco.PEDREGULHO), qtd: 6 }],
      receber: { item: 'picareta_pedra', qtd: 1 },
    },
    {
      id: 'machado',
      dar: [{ item: b(Bloco.PEDREGULHO), qtd: 6 }],
      receber: { item: 'machado_pedra', qtd: 1 },
    },
    {
      id: 'pa',
      dar: [{ item: b(Bloco.PEDREGULHO), qtd: 4 }],
      receber: { item: 'pa_pedra', qtd: 1 },
    },
    {
      id: 'tochas',
      dar: [
        { item: 'carvao', qtd: 2 },
        { item: 'graveto', qtd: 2 },
      ],
      receber: { item: b(Bloco.TOCHA), qtd: 8 },
    },
    {
      id: 'ferro',
      dar: [
        { item: 'ferro_bruto', qtd: 3 },
        { item: 'carvao', qtd: 3 },
      ],
      receber: { item: 'lingote_ferro', qtd: 3 },
    },
  ],
  cozinheiro: [
    {
      id: 'peixe',
      dar: [{ item: 'peixe_cru', qtd: 3 }],
      receber: { item: 'peixe_assado', qtd: 3 },
    },
    {
      id: 'carne',
      dar: [{ item: 'carne_crua', qtd: 3 }],
      receber: { item: 'carne_assada', qtd: 3 },
    },
    {
      id: 'ensopado',
      dar: [{ item: b(Bloco.COGUMELO_BRILHANTE), qtd: 3 }],
      receber: { item: 'ensopado', qtd: 1 },
    },
    {
      id: 'torta',
      dar: [
        { item: b(Bloco.ABOBORA), qtd: 1 },
        { item: 'frutinhas', qtd: 2 },
      ],
      receber: { item: 'torta_abobora', qtd: 1 },
    },
    { id: 'macas', dar: [{ item: 'frutinhas', qtd: 8 }], receber: { item: 'maca', qtd: 2 } },
    // spec 013: a roça (as sementes de trigo também saem da grama alta)
    {
      id: 'sementes',
      dar: [{ item: 'frutinhas', qtd: 3 }],
      receber: { item: 'semente_milho', qtd: 3 },
    },
    { id: 'pao', dar: [{ item: 'trigo', qtd: 5 }], receber: { item: 'pao', qtd: 2 } },
  ],
  construtor: [
    // spec 014 (T07): o pedreiro da cidade. A colher vem de graça (quem perdeu ganha outra)
    // e os blocos das obras saem de coisas fáceis de juntar
    { id: 'colher', dar: [], receber: { item: COLHER_PEDREIRO, qtd: 1 }, planta: 'cidade' },
    {
      id: 'tijolo',
      dar: [{ item: b(Bloco.TERRA), qtd: 4 }],
      receber: { item: b(Bloco.TIJOLOS), qtd: 8 },
      planta: 'cidade',
    },
    {
      id: 'escada',
      dar: [{ item: b(Bloco.TABUAS), qtd: 6 }],
      receber: { item: b(Bloco.ESCADA), qtd: 4 },
      planta: 'cidade',
    },
    {
      id: 'toldo-vermelho',
      dar: [{ item: b(Bloco.LA_VERMELHA), qtd: 1 }],
      receber: { item: b(Bloco.TOLDO_VERMELHO), qtd: 6 },
      planta: 'cidade',
    },
    {
      id: 'toldo-verde',
      dar: [{ item: b(Bloco.LA_VERDE), qtd: 1 }],
      receber: { item: b(Bloco.TOLDO_VERDE), qtd: 6 },
      planta: 'cidade',
    },
    {
      id: 'tabuas',
      dar: [{ item: b(Bloco.MADEIRA_RETORCIDA), qtd: 4 }],
      receber: { item: b(Bloco.TABUAS), qtd: 18 },
    },
    {
      id: 'tijolos',
      foraDaCidade: true,
      dar: [{ item: b(Bloco.PEDREGULHO), qtd: 10 }],
      receber: { item: b(Bloco.TIJOLOS_PEDRA), qtd: 8 },
    },
    {
      id: 'vidro',
      dar: [{ item: b(Bloco.AREIA_BRUMA), qtd: 6 }],
      receber: { item: b(Bloco.VIDRO), qtd: 4 },
    },
    {
      id: 'cama',
      foraDaCidade: true,
      dar: [{ item: b(Bloco.LA_BRANCA), qtd: 4 }],
      receber: { item: b(Bloco.CAMA), qtd: 1 },
    },
    {
      id: 'porta',
      dar: [{ item: b(Bloco.TABUAS), qtd: 6 }],
      receber: { item: b(Bloco.PORTA), qtd: 2 },
    },
    // spec 013: curral e celeiro
    {
      id: 'cercas',
      foraDaCidade: true,
      dar: [{ item: b(Bloco.TABUAS), qtd: 4 }],
      receber: { item: b(Bloco.CERCA), qtd: 4 },
    },
    {
      id: 'feno',
      foraDaCidade: true,
      dar: [{ item: 'trigo', qtd: 10 }],
      receber: { item: b(Bloco.FENO), qtd: 1 },
    },
    {
      id: 'porteira',
      foraDaCidade: true,
      dar: [{ item: b(Bloco.TABUAS), qtd: 4 }],
      receber: { item: b(Bloco.PORTEIRA), qtd: 1 },
    },
  ],
};

/**
 * Spec 014: as trocas da profissão neste mundo (as que pedem ou dão algo só de outro tema
 * não existem aqui). O núcleo confere com esta mesma lista.
 */
export function trocasDoMundo(p: Profissao, estilo: EstiloMundo): readonly Troca[] {
  return (TROCAS[p] ?? []).filter((t) => trocaNoMundo(t, estilo));
}

/** Tem tudo o que a troca pede? */
export function podeTrocar(inv: Inventario, t: Troca): boolean {
  return t.dar.every((d) => inv.contar(d.item) >= d.qtd);
}

/**
 * Faz a troca: tira tudo o que ela pede e dá o item. Nada muda se faltar algo. O que
 * não couber no inventário vai para `soltar` (cai no chão perto do jogador).
 */
export function fazerTroca(
  inv: Inventario,
  t: Troca,
  soltar: (item: string, qtd: number) => void,
): boolean {
  if (!podeTrocar(inv, t)) return false;
  for (const d of t.dar) inv.consumir(d.item, d.qtd);
  const resto = inv.adicionar(t.receber.item, t.receber.qtd);
  if (resto > 0) soltar(t.receber.item, resto);
  return true;
}
