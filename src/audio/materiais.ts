import { Bloco, obterBloco } from '../world/blocks';

export type GrupoMaterial = 'terra' | 'pedra' | 'areia' | 'madeira' | 'folhagem' | 'cristal';

export const GRUPOS_MATERIAL: readonly GrupoMaterial[] = [
  'terra',
  'pedra',
  'areia',
  'madeira',
  'folhagem',
  'cristal',
];

export function grupoDoBloco(id: number): GrupoMaterial | null {
  if (id === Bloco.AR) return null;
  return obterBloco(id)?.som ?? null;
}
