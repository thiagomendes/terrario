import { temaBase } from './base';
import { construirBrumaELuz } from './bruma-e-luz';
import type { IdTema, Tema } from './tipos';

/** Construtores dos temas (cada pacote monta o seu na primeira vez). */
const CONSTRUTORES: Partial<Record<IdTema, () => Tema>> = {
  'bruma-e-luz': construirBrumaELuz,
};

/** Registra um tema (cada pacote chama ao ser importado em `todos.ts`). */
export function registrarTema(id: IdTema, construir: () => Tema): void {
  CONSTRUTORES[id] = construir;
}

export const TEMA_PADRAO: IdTema = 'bruma-e-luz';

export function temasDisponiveis(): IdTema[] {
  return Object.keys(CONSTRUTORES) as IdTema[];
}

const prontos = new Map<IdTema, Tema>();

/**
 * Tema pelo id; desconhecido cai no padrão (o chamador pode avisar o jogador) e, sem o padrão
 * registrado, na base.
 */
export function obterTema(id: string | undefined | null): Tema {
  const chave = (id && CONSTRUTORES[id as IdTema] ? id : TEMA_PADRAO) as IdTema;
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
