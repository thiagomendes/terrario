import { Bloco, REGISTRO_BLOCOS } from '../world/blocks';

export const TILE_BRANCO = 'branco';
/**
 * Tiles lisos na cor de destaque das plantas que brilham (pétala da flor, chapéu do cogumelo):
 * as peças de brinquedo usam esse tile e brilham de noite na cor certa (spec 012).
 */
export const TILES_BRILHO: Readonly<Record<number, string>> = {
  [Bloco.FLOR]: 'brilho_flor',
  [Bloco.COGUMELO_BRILHANTE]: 'brilho_cogumelo',
  [Bloco.TOCHA]: 'brilho_tocha',
  // spec 014: o globo do poste da cidade
  [Bloco.POSTE]: 'brilho_poste',
};
/** Tiles que não são de bloco: os das peças de brinquedo (branco e brilhos). */
export const TILES_PECAS: readonly string[] = [TILE_BRANCO, ...Object.values(TILES_BRILHO)];

/**
 * Metade de cima da porta (spec 013): a porta de dois blocos é uma peça só, com a janela em
 * cima e as almofadas e a maçaneta embaixo. O registro dá o tile `porta` (a metade de baixo);
 * a malha usa este nas faces em pé da metade que tem outra porta embaixo.
 */
export const TILE_PORTA_CIMA = 'porta_cima';

/** Nomes de todos os tiles usados pelos blocos, na ordem das células do atlas. */
export const NOMES_TILES: readonly string[] = (() => {
  const nomes: string[] = [];
  for (const b of REGISTRO_BLOCOS) {
    for (const n of [
      b.tiles.lado,
      b.tiles.topo,
      b.tiles.base,
      b.tiles.frente,
      ...(b.tiles.frentes ?? []),
    ]) {
      if (n && n !== 'vazio' && !nomes.includes(n)) nomes.push(n);
    }
  }
  nomes.push(TILE_PORTA_CIMA);
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

/**
 * Spec 014: desenhos da frente por metadado (bits 2 a 4), por bloco: os índices dos tiles de
 * `tiles.frentes` (a placa da padaria, da oficina...). Blocos sem variantes não aparecem.
 */
export const FRENTES_TILE: ReadonlyMap<number, Int16Array> = (() => {
  const m = new Map<number, Int16Array>();
  for (const b of REGISTRO_BLOCOS)
    if (b.tiles.frentes)
      m.set(
        b.id,
        Int16Array.from(b.tiles.frentes, (n) => indiceDoTile(n)),
      );
  return m;
})();
