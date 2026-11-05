import { TAM_X, TAM_Z } from '../world/chunk';
import type { ChaveChunk } from './gerenciador';

/** Chunks a remalhar quando o bloco (x, z) muda: o dele e os vizinhos tocados pela borda. */
export function chunksAfetados(x: number, z: number): ChaveChunk[] {
  const cx = Math.floor(x / TAM_X);
  const cz = Math.floor(z / TAM_Z);
  const lx = x - cx * TAM_X;
  const lz = z - cz * TAM_Z;
  const lista: ChaveChunk[] = [{ cx, cz }];
  if (lx === 0) lista.push({ cx: cx - 1, cz });
  if (lx === TAM_X - 1) lista.push({ cx: cx + 1, cz });
  if (lz === 0) lista.push({ cx, cz: cz - 1 });
  if (lz === TAM_Z - 1) lista.push({ cx, cz: cz + 1 });
  return lista;
}
