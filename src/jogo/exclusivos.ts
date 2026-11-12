/**
 * Só na Cidade Grande (spec 014, decisão do dono de 12 nov 2026): o que um tema cria fica
 * nele. O tema diz o que é só dele (`Tema.exclusivos`); a regra mora aqui, pura, para o
 * núcleo (que só conhece o estilo do mundo) e o cliente decidirem igual:
 * - geração: só o planejador da cidade põe os blocos da cidade;
 * - trocas, criativo e receitas: um mundo que não é da cidade não mostra (nem aceita) nada
 *   que seja exclusivo da cidade.
 */
import { Bloco } from '../world/blocks';
import { idDoBloco } from './itens';
import type { EstiloMundo } from '../temas/tipos';
import type { Receita } from './receitas';
import type { Troca } from './trocas';

export interface Exclusivos {
  /** Blocos que só o tema usa (e o item de cada um). */
  blocos: readonly number[];
  /** Itens que não são blocos (ferramentas, peças). */
  itens: readonly string[];
}

/** Spec 014: a colher de pedreiro (ferramenta que não gasta). */
export const COLHER_PEDREIRO = 'colher_pedreiro';

/** Os blocos 84 em diante e a colher de pedreiro: só da Cidade Grande. */
export const EXCLUSIVOS_CIDADE: Exclusivos = {
  blocos: [
    Bloco.ASFALTO,
    Bloco.FAIXA_RUA,
    Bloco.FAIXA_PEDESTRE,
    Bloco.CALCADA,
    Bloco.CONCRETO,
    Bloco.PEDRA_MARROM,
    Bloco.ESCADINHA_PEDRA,
    Bloco.PEDRA_CREME,
    Bloco.FRISO_DOURADO,
    Bloco.JANELA,
    Bloco.JANELA_ACESA,
    Bloco.GRADE_FERRO,
    Bloco.LAJE_GRADE,
    Bloco.POSTE,
    Bloco.PLACA,
    Bloco.TOLDO_VERMELHO,
    Bloco.TOLDO_VERDE,
    Bloco.TAPUME,
    Bloco.ESCADA_GRADE,
  ],
  itens: [COLHER_PEDREIRO],
};

/**
 * Exclusivos por planta do povoado (o núcleo e o servidor só conhecem o estilo do mundo):
 * a planta 'cidade' é a Cidade Grande.
 */
const POR_PLANTA: Readonly<Record<string, Exclusivos>> = { cidade: EXCLUSIVOS_CIDADE };

/** Item -> planta do mundo dono dele. */
const DONO: ReadonlyMap<string, string> = (() => {
  const m = new Map<string, string>();
  for (const [planta, ex] of Object.entries(POR_PLANTA)) {
    for (const b of ex.blocos) m.set(idDoBloco(b), planta);
    for (const i of ex.itens) m.set(i, planta);
  }
  return m;
})();

/** Bloco exclusivo de algum tema? (ids 84 em diante, por enquanto só a cidade) */
export function blocoExclusivo(b: number): boolean {
  return DONO.has(idDoBloco(b));
}

/** O item existe neste mundo? Exclusivo só no mundo do tema dele. */
export function itemNoMundo(item: string, estilo: EstiloMundo): boolean {
  const dono = DONO.get(item);
  return dono === undefined || dono === (estilo.povoado?.planta ?? 'vila');
}

/** O bloco existe neste mundo? */
export function blocoNoMundo(b: number, estilo: EstiloMundo): boolean {
  return itemNoMundo(idDoBloco(b), estilo);
}

/** A troca existe neste mundo (nada do que ela pede ou dá é de outro tema)? */
export function trocaNoMundo(t: Troca, estilo: EstiloMundo): boolean {
  const planta = estilo.povoado?.planta ?? 'vila';
  if (t.planta !== undefined && t.planta !== planta) return false;
  if (t.foraDaCidade && planta === 'cidade') return false;
  return itemNoMundo(t.receber.item, estilo) && t.dar.every((d) => itemNoMundo(d.item, estilo));
}

/** A receita existe neste mundo (resultado e ingredientes)? */
export function receitaNoMundo(r: Receita, estilo: EstiloMundo): boolean {
  if (!itemNoMundo(r.resultado.item, estilo)) return false;
  const ingredientes = r.ingredientes ?? Object.values(r.chaves ?? {});
  return ingredientes.every((i) => i.startsWith('#') || itemNoMundo(i, estilo));
}
