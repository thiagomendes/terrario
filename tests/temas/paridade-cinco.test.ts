import { describe, expect, it, vi } from 'vitest';

/**
 * Spec 034 (T00): a prova de que os cinco mundos que ficam não mudam quando os quatro saem.
 * Hashes tirados no código de antes da 034 (o commit-pai deste arquivo), e que precisam
 * continuar iguais até o fim da spec:
 *
 * - **atlas:** os pixels do atlas do tema como o jogo gera (os pintores do tema por cima dos de
 *   base, com o acabamento de brinquedo), a lista dos tiles que brilham e o mapa emissivo
 *   (com as máscaras de brilho do tema), como a cena monta;
 * - **terreno com os povoados ligados**, em 3 sementes: o nascimento e o olhar, os planos dos
 *   povoados das 9 × 9 regiões em volta do nascer e os blocos de 7 × 7 chunks em volta do
 *   nascer, mais todos os chunks da área plana da cidade ou do bairro e do povoado (ou sítio)
 *   mais perto do nascer;
 * - **dados do tema:** o JSON (com as chaves em ordem) de `criaturas`, `movimento`, `vozes`,
 *   `povoado`, `ceu`, `quadrosCeu` e `mundo`;
 * - **o canto do Doce Reino:** os lugares do canto (`candidatosDoCanto`, que chama
 *   `planejarCantos('doce', ...)` com o terreno do jogo) e os chunks da caixa do canto
 *   escolhido, em 3 sementes.
 *
 * Cada tema é carregado do zero (`vi.resetModules`), como numa página do jogo: as memórias da
 * geração (nascimento, planos dos povoados) guardam por semente, não por tema.
 */

const SEMENTES = [1337, 42, 7] as const;
/** Raio (em chunks) da área em volta do nascer. */
const RAIO = 3;
/** Raio (em regiões de povoado) da busca pelos povoados em volta do nascer. */
const REGIOES = 4;

const CINCO = [
  'vila-neon',
  'cidade-grande',
  'rancho-alegre',
  'doce-reino',
  'exploracao-lunar',
] as const;
type Id = (typeof CINCO)[number];

interface Hashes {
  atlas: string;
  emissivos: string;
  mapaEmissivo: string;
  terreno: [string, string, string];
  criaturas: string;
  movimento: string;
  vozes: string;
  povoado: string;
  ceu: string;
  quadrosCeu: string;
  mundo: string;
}

const ESPERADO: Record<Id, Hashes> = {
  'vila-neon': {
    atlas: '13acfa8e991f83f5',
    emissivos: 'c505831f068db2c5',
    mapaEmissivo: '80e0275fe82b66f0',
    terreno: ['ccb8b0657b17ace4', '7b165fd5a5a78184', 'b5f1d5270f08344b'],
    criaturas: 'a409326e859035e9',
    movimento: 'a8ac12f5a1cb09a4',
    vozes: '471fc47ed4b120c0',
    povoado: '6da2e5910dc7e573',
    ceu: 'ff569563531ed96f',
    quadrosCeu: 'd6e9057778dcc118',
    mundo: '9b0a36e4a763314a',
  },
  'cidade-grande': {
    atlas: 'b537276ea011f90a',
    emissivos: '78cb9703a7c6fc08',
    mapaEmissivo: '5e3ec88724d11d41',
    terreno: ['7d1cfc60b828532f', 'ed75a4bf6181fe7b', 'af2fd7130173dc47'],
    criaturas: 'e47cfbb8c9c2d984',
    movimento: '94323f1ba615535d',
    vozes: 'f4f8405fae239ae8',
    povoado: '5c224131ec6ffe8e',
    ceu: 'ff0df45d5a9e655b',
    quadrosCeu: 'c9d3e6697af71986',
    mundo: '85d86060163d8de9',
  },
  'rancho-alegre': {
    atlas: '09e1e6f3cabac84b',
    emissivos: 'ed7e226f7c9ab3ca',
    mapaEmissivo: '260ad22d32be7daa',
    terreno: ['470567cc62d4e52e', '53da1926a130b50d', '8046e97251f310dc'],
    criaturas: 'ffe75501b668e003',
    movimento: 'ecf31e61218ef0eb',
    vozes: '4be67bc6b597972f',
    povoado: '6c9ccf605f93e435',
    ceu: '14b865e3e1750616',
    quadrosCeu: '71219b8460bacda5',
    mundo: '178a7ab93d8e7fd0',
  },
  'doce-reino': {
    atlas: '5d8b67fd98c0e82e',
    emissivos: '2a48dd4f2946ef28',
    mapaEmissivo: '9e2efa78f4a13f88',
    terreno: ['05d901f1bec4f3e0', 'f572b5adfc8dd326', '1e76727229b9d2dd'],
    criaturas: 'cdff6aaacf1aa290',
    movimento: '751c23bc33aaccfe',
    vozes: 'f07597c53cf23967',
    povoado: '1452e248ab234f8a',
    ceu: 'e9f34610468fa1c6',
    quadrosCeu: '2c9bf41aa0e6c34a',
    mundo: 'f0383aeaf7a98325',
  },
  'exploracao-lunar': {
    atlas: '11a679fb8d8dea71',
    emissivos: '57e50da08c57eb22',
    mapaEmissivo: '2e4360fdfb0c0c69',
    terreno: ['fa6bccd24b0e1141', '38ed59e046ebe2cb', '7b48e4731cfda503'],
    criaturas: '0b47cafa6b750b67',
    movimento: 'ad84e02a8567f7ba',
    vozes: '33ce3a2598c097b7',
    povoado: 'f118b0bf7a5d265d',
    ceu: 'b7d4093bd58b19e0',
    quadrosCeu: '45705c0572e213f4',
    mundo: '438bb0460c3e4000',
  },
};

/** O canto do Doce Reino, por semente (na ordem de `SEMENTES`). */
const ESPERADO_CANTO: [string, string, string] = [
  '405b486ea34c9d29',
  'b6020c859f632b4e',
  '80a95fcf8ef43533',
];

async function sha(partes: (Uint8Array | Uint8ClampedArray | string)[]): Promise<string> {
  const pedacos = partes.map((p) =>
    typeof p === 'string'
      ? new TextEncoder().encode(p)
      : new Uint8Array(p.buffer, p.byteOffset, p.byteLength),
  );
  const total = new Uint8Array(pedacos.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of pedacos) {
    total.set(p, o);
    o += p.length;
  }
  const d = await crypto.subtle.digest('SHA-256', total);
  return [...new Uint8Array(d)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

/** JSON com as chaves em ordem (a ordem de escrita no código não conta; a dos arrays conta). */
function jsonEstavel(v: unknown): string {
  return JSON.stringify(v, (_k, x) => {
    if (x instanceof Map) return [...x.entries()];
    if (ArrayBuffer.isView(x)) return Array.from(x as Uint8Array);
    if (x && typeof x === 'object' && !Array.isArray(x)) {
      const o: Record<string, unknown> = {};
      for (const k of Object.keys(x).sort()) o[k] = (x as Record<string, unknown>)[k];
      return o;
    }
    return x;
  });
}

/** O jogo do zero com o tema ativo (como uma página nova). */
async function carregar(id: Id) {
  vi.resetModules();
  const chunk = await import('../../src/world/chunk');
  const povoado = await import('../../src/world/povoado');
  await import('../../src/temas/todos');
  const { obterTema } = await import('../../src/temas');
  const { ativarTemaPuro } = await import('../../src/temas/ativarPuro');
  const { gerarAtlas } = await import('../../src/art/atlas');
  const { construirMapaEmissivo } = await import('../../src/render/emissivo');
  const { Bloco } = await import('../../src/world/blocks');
  const t = obterTema(id);
  expect(t.id).toBe(id);
  ativarTemaPuro(t);
  chunk.definirPovoados(true);
  return { chunk, povoado, t, gerarAtlas, construirMapaEmissivo, Bloco };
}

type Jogo = Awaited<ReturnType<typeof carregar>>;

/** Os chunks de uma caixa de colunas (inclusiva), na chave "cx,cz". */
function chunksDaCaixa(x0: number, z0: number, x1: number, z1: number, em: Set<string>): void {
  for (let cx = Math.floor(x0 / 16); cx <= Math.floor(x1 / 16); cx++)
    for (let cz = Math.floor(z0 / 16); cz <= Math.floor(z1 / 16); cz++) em.add(`${cx},${cz}`);
}

function emOrdem(chaves: Set<string>): [number, number][] {
  return [...chaves]
    .map((k) => k.split(',').map(Number) as [number, number])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

async function hashTerreno(j: Jogo, semente: number): Promise<string> {
  const { chunk, povoado } = j;
  const partes: (Uint8Array | string)[] = [];
  const n = chunk.encontrarNascimento(semente);
  partes.push(jsonEstavel({ n, olhar: chunk.olharDoNascimento(semente) ?? null }));
  const chaves = new Set<string>();
  const ncx = Math.floor(n.x / 16);
  const ncz = Math.floor(n.z / 16);
  for (let cx = ncx - RAIO; cx <= ncx + RAIO; cx++)
    for (let cz = ncz - RAIO; cz <= ncz + RAIO; cz++) chaves.add(`${cx},${cz}`);
  // a cidade ou o bairro inteiro
  const urbano = chunk.cidadeDoMundo(semente) ?? chunk.vilaDoMundo(semente);
  if (urbano) {
    const { x0, z0, x1, z1 } = urbano.plana;
    chunksDaCaixa(x0, z0, x1, z1, chaves);
  }
  // os povoados (ou sítios) das regiões em volta do nascer (no Doce e na Lua o mais perto
  // pode estar a umas 3 regiões); o mais perto entra inteiro
  const R = povoado.REGIAO_POVOADO;
  const rx = Math.floor(n.x / R);
  const rz = Math.floor(n.z / R);
  let perto: { p: { minX: number; maxX: number; minZ: number; maxZ: number }; d: number } | null =
    null;
  for (let i = rx - REGIOES; i <= rx + REGIOES; i++)
    for (let k = rz - REGIOES; k <= rz + REGIOES; k++) {
      const p = povoado.planoDaRegiao(i, k, semente, chunk.TERRENO_NATURAL);
      if (!p) continue;
      partes.push(jsonEstavel(p));
      const d = Math.hypot(p.cx - n.x, p.cz - n.z);
      if (!perto || d < perto.d) perto = { p, d };
    }
  if (perto) chunksDaCaixa(perto.p.minX, perto.p.minZ, perto.p.maxX, perto.p.maxZ, chaves);
  // na Cidade, na Vila e no Rancho o nascer é no meio (ou ao lado) do lugar: tem que haver um
  expect(!!urbano || !!perto, 'sem bairro, cidade nem povoado perto do nascer').toBe(true);
  for (const [cx, cz] of emOrdem(chaves))
    partes.push(`${cx},${cz};`, chunk.gerarChunk(cx, cz, semente));
  return sha(partes);
}

async function calcular(id: Id): Promise<Hashes> {
  const j = await carregar(id);
  const { t } = j;
  const atlas = j.gerarAtlas(j.chunk.SEMENTE_PADRAO);
  const emissivos = atlas.tiles
    .filter((x) => x.emissivo)
    .map((x) => x.nome)
    .join(',');
  const mapa = j.construirMapaEmissivo(atlas, [j.Bloco.CRISTAL_LUZ, j.Bloco.COGUMELO_BRILHANTE]);
  const terreno: string[] = [];
  for (const s of SEMENTES) terreno.push(await hashTerreno(j, s));
  return {
    atlas: await sha([atlas.pixels]),
    emissivos: await sha([emissivos]),
    mapaEmissivo: await sha([mapa]),
    terreno: terreno as [string, string, string],
    criaturas: await sha([jsonEstavel(t.criaturas)]),
    movimento: await sha([jsonEstavel(t.movimento)]),
    vozes: await sha([jsonEstavel(t.vozes)]),
    povoado: await sha([jsonEstavel(t.povoado ?? null)]),
    ceu: await sha([jsonEstavel(t.ceu)]),
    quadrosCeu: await sha([jsonEstavel(t.quadrosCeu)]),
    mundo: await sha([jsonEstavel(t.mundo)]),
  };
}

describe('spec 034: os cinco mundos que ficam são os mesmos de antes', () => {
  for (const id of CINCO)
    it(`${id}: atlas, terreno com povoados em 3 sementes e dados do tema`, async () => {
      const obtido = await calcular(id);
      expect(obtido).toEqual(ESPERADO[id]);
    }, 120_000);

  it('o canto do Doce Reino: os lugares e os chunks da caixa, em 3 sementes', async () => {
    const j = await carregar('doce-reino');
    const { chunk } = j;
    const obtido: string[] = [];
    for (const s of SEMENTES) {
      const lugares = chunk.candidatosDoCanto(s);
      expect(lugares.length).toBeGreaterThan(0);
      expect(lugares.every((p) => p.tema === 'doce')).toBe(true);
      const canto = chunk.cantoDoMundo(s)!;
      expect(canto).toBe(lugares[0]);
      const chaves = new Set<string>();
      // a geração mexe no mato até 4 blocos fora da caixa
      chunksDaCaixa(canto.x0 - 4, canto.z0 - 4, canto.x1 + 4, canto.z1 + 4, chaves);
      const partes: (Uint8Array | string)[] = [jsonEstavel(lugares)];
      for (const [cx, cz] of emOrdem(chaves))
        partes.push(`${cx},${cz};`, chunk.gerarChunk(cx, cz, s));
      obtido.push(await sha(partes));
    }
    expect(obtido).toEqual(ESPERADO_CANTO);
  }, 120_000);
});
