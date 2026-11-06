import type { Tema } from './tipos';
import { temaBase } from './bruma-e-luz';

/**
 * Tema ativo da página. Cada mundo abre numa carga de página própria, então o tema é
 * definido uma vez na inicialização (thread principal e worker) e lido por todos.
 */
let atual: Tema | null = null;

export function tema(): Tema {
  return atual ?? temaBase();
}

export function definirTemaAtivo(t: Tema): void {
  atual = t;
}
