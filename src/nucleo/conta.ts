/**
 * Conta dos itens de uma transação (servidor da nuvem, spec 010): o que a tela mudou
 * nos slots só vale se nenhum item nasceu do nada nem sumiu. A única diferença
 * permitida entre antes e depois é a das receitas feitas (ingredientes viram resultado),
 * com as etiquetas das receitas (#tabuas aceita qualquer tábua) casadas item a item.
 */
import type { Slot } from '../jogo/inventario';
import { aceita, ingredientesDe, RECEITAS } from '../jogo/receitas';
import type { MudancaSlot } from './protocolo';

export interface Fabricacao {
  receita: string;
  vezes: number;
}

const somar = (m: Map<string, number>, p: Slot, sinal: number) => {
  if (!p || !(p.qtd > 0)) return;
  m.set(p.item, (m.get(p.item) ?? 0) + sinal * p.qtd);
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
    if (!r || !Number.isInteger(f.vezes) || f.vezes < 1 || f.vezes > 64) return false;
    saldo.set(r.resultado.item, (saldo.get(r.resultado.item) ?? 0) - r.resultado.qtd * f.vezes);
    for (let v = 0; v < f.vezes; v++) pedidos.push(...ingredientesDe(r));
  }
  // nenhum item a mais; os que faltam têm que ser exatamente os ingredientes
  const faltam: string[] = [];
  for (const [item, q] of saldo) {
    if (q > 0) return false;
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
