/**
 * Conta dos itens de uma transação (servidor da nuvem, spec 010): o que a tela mudou
 * nos slots só vale se nenhum item nasceu do nada nem sumiu. A única diferença
 * permitida entre antes e depois é a das receitas feitas (ingredientes viram resultado),
 * com as etiquetas das receitas (#tabuas aceita qualquer tábua) casadas item a item.
 */
import type { Slot } from '../jogo/inventario';
import { aceita, ingredientesDe, RECEITAS } from '../jogo/receitas';
import { obterItem } from '../jogo/itens';
import type { MudancaSlot } from './protocolo';
import { receitaNoMundo } from '../jogo/exclusivos';
import { estiloMundo } from '../world/chunk';

export interface Fabricacao {
  receita: string;
  vezes: number;
}

/**
 * Identidade de um item na conta: ferramenta com durabilidade diferente é outro item
 * (senão daria para trocar uma picareta gasta por uma nova "de graça").
 */
const chave = (item: string, dur?: number) => {
  const max = obterItem(item)?.durabilidade;
  return max ? `${item}#${dur ?? max}` : item;
};
const somar = (m: Map<string, number>, p: Slot, sinal: number) => {
  if (!p || !(p.qtd > 0)) return;
  const k = chave(p.item, p.dur);
  m.set(k, (m.get(k) ?? 0) + sinal * p.qtd);
};

/**
 * Diz se a conta fecha. `fabricou`: receitas feitas no meio (resultado entra,
 * ingredientes saem). Ferramentas novas nascem com a durabilidade cheia (não conferida).
 */
export function contaFecha(
  mudancas: readonly MudancaSlot[],
  fabricou: readonly Fabricacao[] = [],
): boolean {
  // saldo por item: depois - antes
  const saldo = new Map<string, number>();
  for (const m of mudancas) {
    somar(saldo, m.antes, -1);
    somar(saldo, m.depois, +1);
  }
  // ingredientes que as receitas pedem (uma entrada por unidade)
  const pedidos: string[] = [];
  for (const f of fabricou) {
    const r = RECEITAS.find((x) => x.id === f.receita);
    // spec 014: receita com algo só de outro tema não existe neste mundo
    if (
      !r ||
      !receitaNoMundo(r, estiloMundo()) ||
      !Number.isInteger(f.vezes) ||
      f.vezes < 1 ||
      f.vezes > 64
    )
      return false;
    const kr = chave(r.resultado.item);
    saldo.set(kr, (saldo.get(kr) ?? 0) - r.resultado.qtd * f.vezes);
    for (let v = 0; v < f.vezes; v++) pedidos.push(...ingredientesDe(r));
  }
  // nenhum item a mais; os que faltam têm que ser exatamente os ingredientes
  const faltam: string[] = [];
  for (const [k, q] of saldo) {
    // só inteiros (quantidade fracionada é truque) e nada a mais
    if (!Number.isInteger(q) || q > 0 || -q > 4096) return false;
    const item = k.split('#')[0];
    for (let i = 0; i < -q; i++) faltam.push(item);
  }
  if (faltam.length !== pedidos.length) return false;
  // casa cada unidade que sumiu com um ingrediente que a aceita (etiquetas primeiro
  // ficam por último: o específico casa antes do genérico)
  const livres = [...pedidos].sort((a, b) => Number(a.startsWith('#')) - Number(b.startsWith('#')));
  for (const item of faltam) {
    const k = livres.findIndex((c) => aceita(c, item));
    if (k < 0) return false;
    livres.splice(k, 1);
  }
  return true;
}
