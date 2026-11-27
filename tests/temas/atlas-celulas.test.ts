import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

declare const process: { env: Record<string, string | undefined> };

/** gzip pela API da web (o projeto não instala os tipos do Node): bytes ↔ base64 do arquivo. */
async function passar(bytes: Uint8Array, t: CompressionStream | DecompressionStream) {
  const fluxo = new Blob([bytes as BlobPart]).stream().pipeThrough(t);
  return new Uint8Array(await new Response(fluxo).arrayBuffer());
}
const paraBase64 = (b: Uint8Array) => {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
};
const deBase64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function gravarGz(arq: string, bytes: Uint8Array) {
  writeFileSync(arq, paraBase64(await passar(bytes, new CompressionStream('gzip'))), 'base64');
}
async function lerGz(arq: string) {
  return passar(deBase64(readFileSync(arq, 'base64')), new DecompressionStream('gzip'));
}

/**
 * Spec 027 (T00 e T02): as 128 primeiras células do atlas de cada um dos cinco temas, pixel a
 * pixel, iguais às de antes da Noite das Fantasias. O atlas cresce para 16 linhas (os tiles dos
 * blocos 117 em diante começam na célula 128); nada das 8 primeiras linhas pode mudar, nem o
 * mapa emissivo delas.
 *
 * O atlas de antes foi guardado na T00 (`GRAVAR_ATLAS_027=1 npx vitest run` com o código de
 * antes da spec), em `tests/temas/atlas-antes/<tema>.atlas.gz` e `<tema>.emissivo.gz`: os bytes
 * RGBA das 8 linhas de células (512 × 256), comprimidos.
 */
const CINCO = [
  'vila-neon',
  'cidade-grande',
  'rancho-alegre',
  'doce-reino',
  'exploracao-lunar',
] as const;
type Id = (typeof CINCO)[number];

const PASTA = 'tests/temas/atlas-antes';
const GRAVAR = !!process.env.GRAVAR_ATLAS_027;
/** As células de antes: 16 colunas × 8 linhas. */
const CELULAS_ANTES = 128;
const COLUNAS = 16;
const CELULA = 32;
const LARGURA = COLUNAS * CELULA;
const ALTURA_ANTES = (CELULAS_ANTES / COLUNAS) * CELULA;

/**
 * A corrente de prova: o atlas e o mapa emissivo guardados são os da 034 (os hashes de
 * `paridade-cinco.test.ts`, tirados antes desta spec).
 */
const HASHES_034: Record<Id, [string, string]> = {
  'vila-neon': ['13acfa8e991f83f5', '80e0275fe82b66f0'],
  'cidade-grande': ['b537276ea011f90a', '5e3ec88724d11d41'],
  'rancho-alegre': ['09e1e6f3cabac84b', '260ad22d32be7daa'],
  'doce-reino': ['5d8b67fd98c0e82e', '9e2efa78f4a13f88'],
  'exploracao-lunar': ['11a679fb8d8dea71', '2e4360fdfb0c0c69'],
};

async function sha(b: Uint8Array): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', b as BufferSource);
  return [...new Uint8Array(d)]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

async function gerar(id: Id) {
  vi.resetModules();
  await import('../../src/temas/todos');
  const { obterTema } = await import('../../src/temas');
  const { ativarTemaPuro } = await import('../../src/temas/ativarPuro');
  const { gerarAtlas } = await import('../../src/art/atlas');
  const { construirMapaEmissivo } = await import('../../src/render/emissivo');
  const { Bloco } = await import('../../src/world/blocks');
  const { SEMENTE_PADRAO } = await import('../../src/world/chunk');
  const t = obterTema(id);
  expect(t.id).toBe(id);
  ativarTemaPuro(t);
  const atlas = gerarAtlas(SEMENTE_PADRAO);
  expect(atlas.largura).toBe(LARGURA);
  const mapa = construirMapaEmissivo(atlas, [Bloco.CRISTAL_LUZ, Bloco.COGUMELO_BRILHANTE]);
  const n = LARGURA * ALTURA_ANTES * 4;
  return { atlas: atlas.pixels.subarray(0, n), mapa: mapa.subarray(0, n) };
}

/** As células (índices) em que os dois buffers diferem, e o primeiro pixel diferente de cada. */
function celulasDiferentes(a: Uint8Array, b: Uint8Array): string[] {
  const fora: string[] = [];
  for (let c = 0; c < CELULAS_ANTES; c++) {
    const ox = (c % COLUNAS) * CELULA;
    const oy = Math.floor(c / COLUNAS) * CELULA;
    let achou = '';
    for (let y = 0; y < CELULA && !achou; y++)
      for (let x = 0; x < CELULA && !achou; x++) {
        const i = ((oy + y) * LARGURA + ox + x) * 4;
        for (let k = 0; k < 4; k++)
          if (a[i + k] !== b[i + k]) {
            achou = `célula ${c} (pixel ${x},${y}): ${a[i + k]} → ${b[i + k]}`;
            break;
          }
      }
    if (achou) fora.push(achou);
  }
  return fora;
}

describe('spec 027: os tiles dos blocos 117 em diante a partir da célula 128', () => {
  it('a 127 fica vazia, o primeiro tile novo cai na 128 e os de antes não mudam de célula', async () => {
    vi.resetModules();
    const { NOMES_TILES, TILES_027, PRIMEIRA_CELULA_027, indiceDoTile, TILE_PORTA_CIMA, TILES_PECAS } =
      await import('../../src/art/tiles');
    const { REGISTRO_BLOCOS, PRIMEIRO_BLOCO_027, PRIMEIRO_BLOCO_039 } =
      await import('../../src/world/blocks');
    expect(PRIMEIRA_CELULA_027).toBe(128);
    // os onze blocos novos e os 14 tiles deles, só daqui (spec 039: os móveis vêm depois, com
    // os tiles de blocos que já existem: nenhum tile novo)
    const da027 = (b: { id: number }) => b.id >= PRIMEIRO_BLOCO_027 && b.id < PRIMEIRO_BLOCO_039;
    expect(REGISTRO_BLOCOS.filter(da027).map((b) => b.id)).toEqual([
      117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127,
    ]);
    expect(TILES_027.length).toBe(14);
    expect(indiceDoTile(TILES_027[0])).toBe(128);
    TILES_027.forEach((n, i) => expect(indiceDoTile(n), n).toBe(128 + i));
    // os de antes: as 127 células de sempre (a metade de cima da porta e as peças no fim)
    const antes = NOMES_TILES.slice(0, NOMES_TILES.length - TILES_027.length);
    expect(antes.length).toBe(127);
    antes.forEach((n, i) => expect(indiceDoTile(n), n).toBe(i));
    expect(indiceDoTile(TILE_PORTA_CIMA)).toBe(127 - TILES_PECAS.length - 1);
    expect(antes.slice(-TILES_PECAS.length)).toEqual([...TILES_PECAS]);
    // nenhum tile mora na 127
    expect(NOMES_TILES.some((n) => indiceDoTile(n) === 127)).toBe(false);
  });

  it('no atlas de cada um dos seis, a célula 127 é toda vazia e as novas estão pintadas', async () => {
    for (const id of [...CINCO, 'noite-das-fantasias'] as const) {
      vi.resetModules();
      await import('../../src/temas/todos');
      const { obterTema } = await import('../../src/temas');
      const { ativarTemaPuro } = await import('../../src/temas/ativarPuro');
      const { gerarAtlas } = await import('../../src/art/atlas');
      const { TILES_027, indiceDoTile } = await import('../../src/art/tiles');
      ativarTemaPuro(obterTema(id));
      const a = gerarAtlas(1337);
      expect(a.altura, id).toBe(16 * CELULA);
      const opacos = (c: number) => {
        const ox = (c % COLUNAS) * CELULA;
        const oy = Math.floor(c / COLUNAS) * CELULA;
        let n = 0;
        for (let y = 0; y < CELULA; y++)
          for (let x = 0; x < CELULA; x++) if (a.pixels[((oy + y) * LARGURA + ox + x) * 4 + 3]) n++;
        return n;
      };
      expect(opacos(127), `${id}: célula 127`).toBe(0);
      for (const n of TILES_027) expect(opacos(indiceDoTile(n)), `${id}: ${n}`).toBeGreaterThan(0);
    }
  }, 60_000);
});

describe('spec 027: as 128 primeiras células do atlas dos cinco, iguais às de antes', () => {
  for (const id of CINCO)
    it(`${id}: atlas e mapa emissivo, célula a célula`, async () => {
      const { atlas, mapa } = await gerar(id);
      const arqAtlas = `${PASTA}/${id}.atlas.gz`;
      const arqMapa = `${PASTA}/${id}.emissivo.gz`;
      if (GRAVAR) {
        mkdirSync(PASTA, { recursive: true });
        await gravarGz(arqAtlas, new Uint8Array(atlas));
        await gravarGz(arqMapa, new Uint8Array(mapa));
      }
      expect(existsSync(arqAtlas), 'o atlas de antes (T00) não foi guardado').toBe(true);
      const antes = await lerGz(arqAtlas);
      const mapaAntes = await lerGz(arqMapa);
      expect([await sha(antes), await sha(mapaAntes)]).toEqual(HASHES_034[id]);
      expect(antes.length).toBe(atlas.length);
      expect(celulasDiferentes(antes, new Uint8Array(atlas))).toEqual([]);
      expect(celulasDiferentes(mapaAntes, new Uint8Array(mapa))).toEqual([]);
    }, 60_000);
});
