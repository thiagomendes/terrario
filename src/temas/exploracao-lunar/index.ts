import { temaBase } from '../bruma-e-luz';
import type { Tema } from '../tipos';

/** Exploração Lunar: ESBOÇO — o pacote completo substitui este arquivo. */
export function construirExploracaoLunar(): Tema {
  return { ...temaBase(), id: 'exploracao-lunar', nome: 'Exploração Lunar' };
}
