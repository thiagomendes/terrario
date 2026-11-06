import { obterTema } from './index';
import { ativarTemaPuro } from './ativarPuro';
import type { Tema } from './tipos';
import './todos';

/**
 * Ativa o tema do mundo antes de criar a cena: aparência (atlas, céu, água, criaturas),
 * nomes nos registros e estilo do terreno. Uma vez por carga de página.
 */
export function ativarTema(id: string | undefined | null): Tema {
  const t = obterTema(id);
  ativarTemaPuro(t);
  document.documentElement.dataset.tema = t.id;
  document.documentElement.style.setProperty('--acento-tema', t.cores.acento);
  return t;
}
