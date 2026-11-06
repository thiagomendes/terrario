import { definirEstiloMundo } from '../world/chunk';
import { definirTemaAtivo } from './ativo';
import { obterTema } from './index';
import { aplicarTextos } from './originais';
import type { Tema } from './tipos';

/**
 * Ativa o tema do mundo antes de criar a cena: aparência (atlas, céu, água, criaturas),
 * nomes nos registros e estilo do terreno. Uma vez por carga de página.
 */
export function ativarTema(id: string | undefined | null): Tema {
  const t = obterTema(id);
  definirTemaAtivo(t);
  aplicarTextos(t.textos);
  definirEstiloMundo(t.mundo);
  document.documentElement.dataset.tema = t.id;
  document.documentElement.style.setProperty('--acento-tema', t.cores.acento);
  return t;
}
