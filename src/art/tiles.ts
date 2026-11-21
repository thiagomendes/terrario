import { Bloco, PRIMEIRO_BLOCO_027, REGISTRO_BLOCOS, type DefinicaoBloco } from '../world/blocks';

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

/**
 * Spec 027: a primeira célula dos tiles dos blocos 117 em diante (a primeira da 9ª linha do
 * atlas de 16 linhas). As 128 primeiras células ficam como estavam (os hashes da 034); a 127,
 * que sobrava vazia, continua vazia.
 */
export const PRIMEIRA_CELULA_027 = 128;

function tilesDe(blocos: readonly DefinicaoBloco[], nomes: string[], fora: readonly string[] = []) {
  for (const b of blocos) {
    for (const n of [
      b.tiles.lado,
      b.tiles.topo,
      b.tiles.base,
      b.tiles.frente,
      ...(b.tiles.frentes ?? []),
    ]) {
      if (n && n !== 'vazio' && !nomes.includes(n) && !fora.includes(n)) nomes.push(n);
    }
  }
}

/**
 * Os tiles de antes da spec 027 (os dos blocos até o 116, a metade de cima da porta e os das
 * peças), nas células 0 em diante, na ordem de sempre.
 */
const TILES_ANTES: readonly string[] = (() => {
  const nomes: string[] = [];
  tilesDe(
    REGISTRO_BLOCOS.filter((b) => b.id < PRIMEIRO_BLOCO_027),
    nomes,
  );
  nomes.push(TILE_PORTA_CIMA);
  // tile branco: as peças de brinquedo (plantas) levam a cor nos vértices
  nomes.push(...TILES_PECAS);
  if (nomes.length > PRIMEIRA_CELULA_027) throw new Error('os tiles de antes não cabem em 8 linhas');
  return nomes;
})();

/**
 * Spec 027: os tiles dos blocos 117 em diante, numa lista à parte depois de `TILES_PECAS`, a
 * partir da célula 128 (nunca na 127: as 8 primeiras linhas do atlas ficam iguais pixel a pixel).
 */
export const TILES_027: readonly string[] = (() => {
  const nomes: string[] = [];
  tilesDe(
    REGISTRO_BLOCOS.filter((b) => b.id >= PRIMEIRO_BLOCO_027),
    nomes,
    TILES_ANTES,
  );
  return nomes;
})();

/** Nomes de todos os tiles usados pelos blocos: os de antes e, depois, os da spec 027. */
export const NOMES_TILES: readonly string[] = [...TILES_ANTES, ...TILES_027];

/** A célula do atlas de cada tile (a de antes pela ordem; os da 027 a partir da 128). */
const CELULAS: ReadonlyMap<string, number> = new Map([
  ...TILES_ANTES.map((n, i) => [n, i] as const),
  ...TILES_027.map((n, i) => [n, PRIMEIRA_CELULA_027 + i] as const),
]);

/** A célula do atlas onde mora o tile (-1 se não existe). */
export function indiceDoTile(nome: string): number {
  return CELULAS.get(nome) ?? -1;
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
