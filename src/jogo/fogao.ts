/**
 * Spec 039b: o fogão e a geladeira, os contêineres dos móveis (puro: o núcleo e a tela leem).
 *
 * - **O fogão** cozinha as receitas de comida da `FUNDICAO` (carne e peixe crus viram assados,
 *   o milho vira pipoca, o ovo vira ovo cozido), sem carvão (decisão do dono, 27 nov): tem só a
 *   entrada e a saída, e a saída não aceita item posto. O tempo é o da fornalha.
 * - **A geladeira** guarda 9 lugares, só de comida.
 */
import type { Pilha, Slot } from './inventario';
import { obterItem } from './itens';
import { FUNDICAO, TEMPO_FUNDIR } from './receitas';

/** Lugares da geladeira. */
export const TAMANHO_GELADEIRA = 9;

export interface EstadoFogao {
  entrada: Slot;
  saida: Slot;
  /** Progresso 0..1 da comida que está no fogo. */
  progresso: number;
}

/** O item é comida (o que a geladeira guarda)? */
export function ehComida(item: string): boolean {
  return !!obterItem(item)?.comida;
}

/** O que o fogão faz com o item (a comida pronta), ou undefined: ele não cozinha isso. */
export function noFogao(item: string): string | undefined {
  const pronto = FUNDICAO[item];
  return pronto && ehComida(pronto) ? pronto : undefined;
}

export function novoFogao(): EstadoFogao {
  return { entrada: null, saida: null, progresso: 0 };
}

/** O que sai da entrada agora (a saída tem lugar para ela), ou null. */
function oQueCozinha(f: EstadoFogao): string | null {
  const alvo = f.entrada ? noFogao(f.entrada.item) : undefined;
  if (!alvo) return null;
  const max = obterItem(alvo)?.pilha ?? 64;
  if (f.saida && (f.saida.item !== alvo || f.saida.qtd >= max)) return null;
  return alvo;
}

/** O fogão está cozinhando (tem o que cozinhar e lugar na saída)? */
export function cozinhando(f: EstadoFogao): boolean {
  return oQueCozinha(f) !== null;
}

/** Avança o fogão; devolve se algo mudou nos lugares. */
export function passoFogao(f: EstadoFogao, dt: number): boolean {
  const alvo = oQueCozinha(f);
  if (!alvo) {
    f.progresso = 0;
    return false;
  }
  f.progresso += dt / TEMPO_FUNDIR;
  if (f.progresso < 1) return false;
  f.progresso = 0;
  const e = f.entrada as Pilha;
  f.entrada = e.qtd > 1 ? { ...e, qtd: e.qtd - 1 } : null;
  f.saida = f.saida ? { ...f.saida, qtd: f.saida.qtd + 1 } : { item: alvo, qtd: 1 };
  return true;
}

const lugar = (s: unknown): Slot =>
  s && typeof s === 'object' && typeof (s as Pilha).item === 'string' && (s as Pilha).qtd > 0
    ? { ...(s as Pilha) }
    : null;

export function normalizarFogao(v: unknown): EstadoFogao {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<EstadoFogao>;
  const p = Number(o.progresso);
  return {
    entrada: lugar(o.entrada),
    saida: lugar(o.saida),
    progresso: Number.isFinite(p) && p > 0 && p < 1 ? p : 0,
  };
}

/** A geladeira salva com os 9 lugares (o que não é lugar vira vazio). */
export function normalizarGeladeira(v: unknown): Slot[] {
  const lista = Array.isArray(v) ? v : [];
  return Array.from({ length: TAMANHO_GELADEIRA }, (_, i) => lugar(lista[i]));
}

/**
 * A mudança de um lugar do fogão ou da geladeira que a regra aceita (`i`: o lugar; o resto vale
 * para todo item que entra): a geladeira só guarda comida; a entrada do fogão só aceita o que
 * ele cozinha; a saída do fogão não aceita item posto (só tirar).
 */
export function mudancaAceita(onde: 'gel' | 'fog', i: number, antes: Slot, depois: Slot): boolean {
  if (!depois) return true;
  if (onde === 'gel') return ehComida(depois.item);
  if (i === 0) return noFogao(depois.item) !== undefined;
  // a saída: só pode diminuir (tirar), nunca ganhar item nem trocar
  return !!antes && antes.item === depois.item && depois.qtd <= antes.qtd;
}
