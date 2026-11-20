import { temaBase } from './base';
import type { IdTema, IdTemaQueSai, Tema } from './tipos';

/** Construtores dos temas (cada pacote monta o seu na primeira vez). */
const CONSTRUTORES: Partial<Record<IdTema | IdTemaQueSai, () => Tema>> = {};

/**
 * Spec 034: os cartões dos temas, nesta ordem (a Vila Neon primeiro, marcada). Só o que
 * estiver registrado aparece.
 */
const ORDEM_TEMAS: readonly IdTema[] = [
  'vila-neon',
  'cidade-grande',
  'rancho-alegre',
  'doce-reino',
  'exploracao-lunar',
];

/** Registra um tema (cada pacote chama ao ser importado em `todos.ts`). */
export function registrarTema(id: IdTema | IdTemaQueSai, construir: () => Tema): void {
  CONSTRUTORES[id] = construir;
}

/** Spec 034 (decisão do dono, 19 nov 2026): a Vila Neon é o tema padrão. */
export const TEMA_PADRAO: IdTema = 'vila-neon';

/** Os temas que se escolhem, na ordem dos cartões. */
export function temasDisponiveis(): IdTema[] {
  return ORDEM_TEMAS.filter((id) => !!CONSTRUTORES[id]);
}

const prontos = new Map<string, Tema>();

/**
 * Tema pelo id; desconhecido cai no padrão (o chamador pode avisar o jogador) e, sem o padrão
 * registrado (quem não importa `todos.ts`: scripts, testes, servidor), na base.
 */
export function obterTema(id: string | undefined | null): Tema {
  const chave = id && CONSTRUTORES[id as IdTema] ? (id as IdTema) : TEMA_PADRAO;
  const construir = CONSTRUTORES[chave];
  if (!construir) return temaBase();
  let t = prontos.get(chave);
  if (!t) {
    t = construir();
    prontos.set(chave, t);
  }
  return t;
}

export function temaExiste(id: string | undefined | null): boolean {
  return !!id && !!CONSTRUTORES[id as IdTema];
}
