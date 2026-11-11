/**
 * Avisos da proteção (spec 016, T04): o aviso de criança ("Essa parede é da Ana.") não se
 * repete a cada clique nem a cada quadro segurando. Cada motivo com o seu dono (ou lugar)
 * fala uma vez a cada ESPERA_AVISO; a fila de avisos da 015 ainda junta os iguais à vista.
 */
import { avisoDaRecusa, avisoTirouDoAmigo, type RecusaProtecao } from '../jogo/permissao';

/** Spec 016: "Voltar para casa" (a saída de quem ficou cercado). */
export const AVISO_VOLTA_CASA = 'Voltando para casa!';
export const AVISO_ESPERA_CASA = 'Espera um pouquinho para voltar de novo.';

/** Segundos até o mesmo aviso (mesmo motivo e mesmo dono ou lugar) poder voltar. */
export const ESPERA_AVISO = 4;
/** Segundos entre dois "Você tirou um bloco do Léo" (discreto: o dono sabe o que fez). */
export const ESPERA_TIROU = 6;

export interface OpcoesAvisosProtecao {
  toast(texto: string): void;
  /** Relógio em segundos (testes). */
  agora?: () => number;
}

export function criarAvisosProtecao(op: OpcoesAvisosProtecao) {
  const agora = op.agora ?? (() => performance.now() / 1000);
  const ultimo = new Map<string, number>();
  function vez(chave: string, espera: number): boolean {
    const t = agora();
    const antes = ultimo.get(chave);
    if (antes !== undefined && t - antes < espera) return false;
    ultimo.set(chave, t);
    if (ultimo.size > 64) ultimo.delete(ultimo.keys().next().value as string);
    return true;
  }
  return {
    /** O aviso da recusa (devolve se falou agora). */
    avisar(r: RecusaProtecao): boolean {
      if (!vez(`${r.motivo}|${r.dono ?? r.lugar ?? ''}`, ESPERA_AVISO)) return false;
      op.toast(avisoDaRecusa(r));
      return true;
    },
    /** O dono do mundo tirou um bloco de um amigo. */
    tirouDoAmigo(apelido: string): boolean {
      if (!vez(`tirou|${apelido}`, ESPERA_TIROU)) return false;
      op.toast(avisoTirouDoAmigo(apelido));
      return true;
    },
  };
}
export type AvisosProtecao = ReturnType<typeof criarAvisosProtecao>;
