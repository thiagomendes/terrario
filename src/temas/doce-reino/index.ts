import { temaBase } from '../bruma-e-luz';
import type { Tema } from '../tipos';

/** Doce Reino: ESBOÇO — o pacote completo substitui este arquivo. */
export function construirDoceReino(): Tema {
  return { ...temaBase(), id: 'doce-reino', nome: 'Doce Reino' };
}
