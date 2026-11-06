import { temaBase } from '../bruma-e-luz';
import type { Tema } from '../tipos';

/** Era dos Dinos: ESBOÇO — o pacote completo substitui este arquivo. */
export function construirEraDosDinos(): Tema {
  return { ...temaBase(), id: 'era-dos-dinos', nome: 'Era dos Dinos' };
}
