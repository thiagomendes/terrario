import { temaBase } from '../base';
import type { Tema } from '../tipos';

let bruma: Tema | null = null;

/** Bruma e Luz: a base com o nome dele (sai do jogo na spec 034). */
export function construirBrumaELuz(): Tema {
  if (bruma) return bruma;
  bruma = {
    ...temaBase(),
    id: 'bruma-e-luz',
    nome: 'Bruma e Luz',
    lema: 'Explore, construa e sobreviva num mundo de bruma e luz',
    convite: 'Florestas com bruma nos vales, pântanos que brilham e cristais de luz nas cavernas.',
  };
  return bruma;
}
