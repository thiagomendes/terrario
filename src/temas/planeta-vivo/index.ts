import { temaBase } from '../bruma-e-luz';
import type { Tema } from '../tipos';

/** Planeta Vivo: ESBOÇO — o pacote completo substitui este arquivo. */
export function construirPlanetaVivo(): Tema {
  return { ...temaBase(), id: 'planeta-vivo', nome: 'Planeta Vivo' };
}
