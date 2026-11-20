/**
 * Spec 017 (T05): ao criar um mundo, o jogo sugere uma vez "Quer vestir a fantasia do Rancho
 * Alegre?" (Sim / Agora não). As fantasias dos temas são livres (servem em qualquer mundo):
 * a sugestão é só um convite, nunca se repete no mesmo mundo e não aparece se a criança já
 * estiver com aquela fantasia.
 */
import type { Aparencia } from '../personagem/aparencia';
import { fantasiaDoTema, type FantasiaDef } from '../personagem/fantasias';
import type { Armazenamento } from '../personagem/persistencia';
import type { IdTema } from '../temas/tipos';
import { TEMA_PADRAO } from '../temas';
import { NOMES_TEMAS } from './abaFantasias';

/** O mundo que a criança acabou de criar (a página dele abre logo depois). */
export const CHAVE_MUNDO_NOVO = 'terrario:mundo-novo';
/** Mundos em que a sugestão já apareceu (nunca repete). */
export const CHAVE_SUGERIDAS = 'terrario:fantasia-sugerida';
/** Os testes de tela só veem a sugestão quando pedem (os outros fluxos seguem iguais). */
export const CHAVE_TESTAR = 'terrario:testar-sugestao';
const MAXIMO_LEMBRADOS = 60;

/** Chamado ao criar o mundo, antes de abrir a página dele. */
export function marcarMundoNovo(loja: Armazenamento | null, id: string): void {
  try {
    loja?.setItem(CHAVE_MUNDO_NOVO, id);
  } catch {
    // sem armazenamento: o mundo abre sem sugestão
  }
}

/** Este mundo acabou de ser criado neste aparelho? */
export function ehMundoNovo(loja: Armazenamento | null, id: string): boolean {
  try {
    return !!id && loja?.getItem(CHAVE_MUNDO_NOVO) === id;
  } catch {
    return false;
  }
}

function lerSugeridas(loja: Armazenamento | null): string[] {
  try {
    const v: unknown = JSON.parse(loja?.getItem(CHAVE_SUGERIDAS) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function jaSugerida(loja: Armazenamento | null, id: string): boolean {
  return lerSugeridas(loja).includes(id);
}

/** A sugestão apareceu (ou não precisava): não volta mais neste mundo. */
export function marcarSugerida(loja: Armazenamento | null, id: string): void {
  try {
    const lista = lerSugeridas(loja).filter((x) => x !== id);
    lista.push(id);
    loja?.setItem(CHAVE_SUGERIDAS, JSON.stringify(lista.slice(-MAXIMO_LEMBRADOS)));
    if (loja?.getItem(CHAVE_MUNDO_NOVO) === id) loja.setItem(CHAVE_MUNDO_NOVO, '');
  } catch {
    // sem armazenamento: nada a lembrar
  }
}

/**
 * A fantasia a sugerir neste mundo, ou nada: só em mundo novo, uma vez por mundo, e não se
 * a criança já está vestida com ela.
 */
export function fantasiaParaSugerir(
  loja: Armazenamento | null,
  idMundo: string,
  novo: boolean,
  tema: string | undefined,
  aparencia: Aparencia,
): FantasiaDef | undefined {
  if (!novo || !idMundo || jaSugerida(loja, idMundo)) return undefined;
  const def = fantasiaDoTema(tema ?? TEMA_PADRAO, aparencia.desbloqueios);
  if (!def || aparencia.fantasia?.id === def.id) return undefined;
  return def;
}

/** "Quer vestir a fantasia do Rancho Alegre?" */
export function perguntaDaSugestao(tema: string | undefined): string {
  const t = NOMES_TEMAS[(tema ?? TEMA_PADRAO) as IdTema] ?? NOMES_TEMAS[TEMA_PADRAO];
  return `Quer vestir a fantasia ${t.de} ${t.nome}?`;
}
