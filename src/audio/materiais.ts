import { Bloco } from '../world/blocks';

export type GrupoMaterial = 'terra' | 'pedra' | 'areia' | 'madeira' | 'folhagem' | 'cristal';

export const GRUPOS_MATERIAL: readonly GrupoMaterial[] = [
  'terra',
  'pedra',
  'areia',
  'madeira',
  'folhagem',
  'cristal',
];

const GRUPO_POR_BLOCO: Record<number, GrupoMaterial> = {
  [Bloco.TERRA_MUSGOSA]: 'terra',
  [Bloco.PEDRA_RACHADA]: 'pedra',
  [Bloco.AREIA_BRUMA]: 'areia',
  [Bloco.MADEIRA_RETORCIDA]: 'madeira',
  [Bloco.TABUAS]: 'madeira',
  [Bloco.FOLHAGEM]: 'folhagem',
  [Bloco.GRAMA_ALTA]: 'folhagem',
  [Bloco.FLOR]: 'folhagem',
  [Bloco.COGUMELO_BRILHANTE]: 'folhagem',
  [Bloco.CRISTAL_LUZ]: 'cristal',
};

export function grupoDoBloco(id: number): GrupoMaterial | null {
  return GRUPO_POR_BLOCO[id] ?? null;
}
