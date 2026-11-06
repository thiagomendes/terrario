import { definirEstiloMundo } from '../world/chunk';
import { definirTemaAtivo } from './ativo';
import { aplicarTextos } from './originais';
import type { Tema } from './tipos';

/** Ativa o tema sem tocar na página (serve a testes e scripts). */
export function ativarTemaPuro(t: Tema): void {
  definirTemaAtivo(t);
  aplicarTextos(t.textos);
  definirEstiloMundo(t.mundo);
}
