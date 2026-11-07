import { Bloco, REGISTRO_BLOCOS } from '../world/blocks';

export const TILE_BRANCO = 'branco';
/**
 * Tiles lisos na cor de destaque das plantas que brilham (pétala da flor, chapéu do cogumelo):
 * as peças de brinquedo usam esse tile e brilham de noite na cor certa (spec 012).
 */
export const TILES_BRILHO: Readonly<Record<number, string>> = {
  [Bloco.FLOR]: 'brilho_flor',
  [Bloco.COGUMELO_BRILHANTE]: 'brilho_cogumelo',
};
/** Tiles que não são de bloco: os das peças de brinquedo (branco e brilhos). */
export const TILES_PECAS: readonly string[] = [TILE_BRANCO, ...Object.values(TILES_BRILHO)];

/** Nomes de todos os tiles usados pelos blocos, na ordem das células do atlas. */
export const NOMES_TILES: readonly string[] = (() => {
  const nomes: string[] = [];
  for (const b of REGISTRO_BLOCOS) {
    for (const n of [b.tiles.lado, b.tiles.topo, b.tiles.base, b.tiles.frente]) {
      if (n && n !== 'vazio' && !nomes.includes(n)) nomes.push(n);
    }
  }
  // tile branco: as peças de brinquedo (plantas) levam a cor nos vértices
  nomes.push(...TILES_PECAS);
  return nomes;
})();

export function indiceDoTile(nome: string): number {
  return NOMES_TILES.indexOf(nome);
}

/** Por bloco: índices dos tiles [topo, lado, base, frente] (frente = lado se não houver). */
export const FACES_TILE: Int16Array = (() => {
  const a = new Int16Array(REGISTRO_BLOCOS.length * 4).fill(-1);
  for (const b of REGISTRO_BLOCOS) {
    if (b.tiles.lado === 'vazio') continue;
    const lado = indiceDoTile(b.tiles.lado);
    a[b.id * 4] = indiceDoTile(b.tiles.topo);
    a[b.id * 4 + 1] = lado;
    a[b.id * 4 + 2] = indiceDoTile(b.tiles.base);
    a[b.id * 4 + 3] = b.tiles.frente ? indiceDoTile(b.tiles.frente) : lado;
  }
  return a;
})();
