import { REGISTRO_BLOCOS } from '../world/blocks';

/** Nomes de todos os tiles usados pelos blocos, na ordem das células do atlas. */
export const NOMES_TILES: readonly string[] = (() => {
  const nomes: string[] = [];
  for (const b of REGISTRO_BLOCOS) {
    for (const n of [b.tiles.lado, b.tiles.topo, b.tiles.base, b.tiles.frente]) {
      if (n && n !== 'vazio' && !nomes.includes(n)) nomes.push(n);
    }
  }
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
