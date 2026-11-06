import type { Pilha, Slot } from './inventario';
import { COMBUSTIVEL, FUNDICAO, TEMPO_FUNDIR } from './receitas';

export interface EstadoFornalha {
  entrada: Slot;
  combustivel: Slot;
  saida: Slot;
  /** Segundos de queima restantes do combustível atual. */
  queima: number;
  queimaTotal: number;
  /** Progresso 0..1 do item atual. */
  progresso: number;
}

export function novaFornalha(): EstadoFornalha {
  return { entrada: null, combustivel: null, saida: null, queima: 0, queimaTotal: 0, progresso: 0 };
}

function podeFundir(f: EstadoFornalha): string | null {
  const alvo = f.entrada ? FUNDICAO[f.entrada.item] : undefined;
  if (!alvo) return null;
  if (f.saida && (f.saida.item !== alvo || f.saida.qtd >= 64)) return null;
  return alvo;
}

/** Avança a fornalha; devolve se está acesa e se algo mudou nos slots. */
export function passoFornalha(f: EstadoFornalha, dt: number): { acesa: boolean; mudou: boolean } {
  let mudou = false;
  let alvo = podeFundir(f);
  if (f.queima <= 0 && alvo && f.combustivel && COMBUSTIVEL[f.combustivel.item]) {
    f.queima = f.queimaTotal = COMBUSTIVEL[f.combustivel.item];
    f.combustivel = f.combustivel.qtd > 1 ? { ...f.combustivel, qtd: f.combustivel.qtd - 1 } : null;
    mudou = true;
  }
  if (f.queima > 0) {
    f.queima = Math.max(0, f.queima - dt);
    if (alvo) {
      f.progresso += dt / TEMPO_FUNDIR;
      if (f.progresso >= 1) {
        f.progresso = 0;
        const e = f.entrada as Pilha;
        f.entrada = e.qtd > 1 ? { ...e, qtd: e.qtd - 1 } : null;
        f.saida = f.saida ? { ...f.saida, qtd: f.saida.qtd + 1 } : { item: alvo, qtd: 1 };
        mudou = true;
        alvo = podeFundir(f);
      }
    } else {
      f.progresso = 0;
    }
  } else {
    f.progresso = Math.max(0, f.progresso - dt / TEMPO_FUNDIR);
  }
  return { acesa: f.queima > 0, mudou };
}

export function normalizarFornalha(v: unknown): EstadoFornalha {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<EstadoFornalha>;
  const slot = (s: unknown): Slot =>
    s && typeof s === 'object' && typeof (s as Pilha).item === 'string' && (s as Pilha).qtd > 0
      ? { ...(s as Pilha) }
      : null;
  return {
    entrada: slot(o.entrada),
    combustivel: slot(o.combustivel),
    saida: slot(o.saida),
    queima: Number(o.queima) || 0,
    queimaTotal: Number(o.queimaTotal) || 0,
    progresso: Number(o.progresso) || 0,
  };
}
