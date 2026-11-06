import { temaBase } from '../bruma-e-luz';
import type { Tema } from '../tipos';

/** Mata Encantada: ESBOÇO — o pacote completo substitui este arquivo. */
export function construirMataEncantada(): Tema {
  return { ...temaBase(), id: 'mata-encantada', nome: 'Mata Encantada' };
}
