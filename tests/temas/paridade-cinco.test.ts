import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type { TextosTema } from '../../src/temas/tipos';
import type { Profissao } from '../../src/world/povoado';

/**
 * Spec 034 (T00): a prova de que os cinco mundos que ficam não mudam quando os quatro saem.
 * Hashes tirados no código de antes da remoção dos temas (o da T00, antes da T02), e que
 * precisam continuar iguais até o fim da spec:
 *
 * - **atlas:** os pixels do atlas do tema como o jogo gera (os pintores do tema por cima dos de
 *   base, com o acabamento de brinquedo), a lista dos tiles que brilham e o mapa emissivo
 *   (com as máscaras de brilho do tema), como a cena monta;
 * - **terreno com os povoados ligados**, em 3 sementes: o nascimento e o olhar, os planos dos
 *   povoados das 9 × 9 regiões em volta do nascer e os blocos de 7 × 7 chunks em volta do
 *   nascer, mais todos os chunks da área plana da cidade ou do bairro e do povoado (ou sítio)
 *   mais perto do nascer. Na Cidade e na Vila, também o plano inteiro (moradores, pistas,
 *   zonas, pontos, peças...) e os metadados que a geração dá a cada chunk (a direção dos
 *   degraus, portas, bancos e placas). O estilo do mundo passado a limpo para a nuvem
 *   (`estiloSeguro`) é o mesmo do tema: o servidor gera o mesmo terreno;
 * - **dados do tema:** o JSON (com as chaves em ordem) de `criaturas`, `movimento`, `vozes`,
 *   `povoado`, `ceu`, `quadrosCeu` e `mundo`;
 * - **sons:** a entrada do tema e a comum no índice dos sons, as regras de `musica` (sem os
 *   créditos, que a 034 enxuga) e de `vozes` do índice, os tamanhos e o conteúdo dos pacotes do
 *   tema e do comum, os ajustes de volume da trilha e das vozes do tema, e a música, a natureza
 *   e os materiais do tema;
 * - **nomes dos moradores:** cada nome do povoado do tema com o gênero (`generoDoNome`), e
 *   `nomeDoMorador` e `generoDoMorador` de n = 0 a 8 em cada profissão (e de cada morador do
 *   plano) nos povoados que o hash do terreno encontra, mais a cidade ou o bairro. A 034 tira de
 *   `NOMES_GENERO` os nomes só dos quatro: um nome dos cinco que saísse por engano mudaria o
 *   nome e o corpo dos moradores;
 * - **os textos aplicados:** os textos do tema por cima dos de base (como `aplicarTextos` faz),
 *   menos as chaves de `TEXTOS_FORA`;
 * - **o resto do tema:** todo o tema menos os textos (água, bruma, partículas, clima, cores,
 *   personagem, primeiro capítulo, exclusivos, nome, lema, convite...);
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

/** Textos com "bruma" ou com os nomes dos quatro que saem (o que a 034 troca nos textos). */
const DOS_QUATRO = /bruma|planeta vivo|mata encantada|era dos dinos|dino/i;

/**
 * As chaves dos textos aplicados que a 034 pode trocar nos cinco ("seção.chave", ou só a
 * chave nos textos soltos como `boasVindas`): os textos de base com "bruma" ou com os nomes
 * dos quatro que algum dos cinco mostra por não ter texto próprio.
 *
 * A busca no código de antes (20 nov 2026) não achou nenhuma: os cinco têm texto próprio para
 * todos os textos de base com "bruma" (`blocos.3` "areia-bruma", `criaturas.coelho`
 * "Coelho-bruma", `criaturas.espectro` "Espectro da bruma", `missoes.espectro` "Caçador da
 * bruma", `missoes.pantano`, `missoes.criar`, `boasVindas` e `legendas.criaturaNoturna`). Então
 * nenhuma chave fica de fora, e o teste confere que a busca continua sem achar nada fora desta
 * lista.
 */
const TEXTOS_FORA: readonly string[] = [];

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
  sons: string;
  nomes: string;
  textos: string;
  resto: string;
}

const ESPERADO: Record<Id, Hashes> = {
  'vila-neon': {
    atlas: '13acfa8e991f83f5',
    emissivos: 'c505831f068db2c5',
    mapaEmissivo: '80e0275fe82b66f0',
    terreno: ['5b3eb709c4ce77fa', 'a0d3de4f58c5e69a', '568fd3dc111b5072'],
    criaturas: 'a409326e859035e9',
    movimento: 'a8ac12f5a1cb09a4',
    vozes: '471fc47ed4b120c0',
    povoado: '6da2e5910dc7e573',
    ceu: 'ff569563531ed96f',
    quadrosCeu: 'd6e9057778dcc118',
    mundo: '9b0a36e4a763314a',
    sons: '197c8ccbebf6c557',
    nomes: 'e978e64aab09049c',
    textos: '74ce53ea4cbc1be2',
    resto: 'e38910e236134e60',
  },
  'cidade-grande': {
    atlas: 'b537276ea011f90a',
    emissivos: '78cb9703a7c6fc08',
    mapaEmissivo: '5e3ec88724d11d41',
    terreno: ['0ffd672eb7c509b8', 'a080aeb40a60e8c2', '080dfb5e4c2d3bab'],
    criaturas: 'e47cfbb8c9c2d984',
    movimento: '94323f1ba615535d',
    vozes: 'f4f8405fae239ae8',
    povoado: '5c224131ec6ffe8e',
    ceu: 'ff0df45d5a9e655b',
    quadrosCeu: 'c9d3e6697af71986',
    mundo: '85d86060163d8de9',
    sons: '2516821a20392a1e',
    nomes: 'ff02674eb56dc547',
    textos: 'df67db26786de5de',
    resto: '69d32e59ff4493a7',
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
    sons: '4f6db08825459c9f',
    nomes: '9fd6bc7f6c6c006a',
    textos: '8b8bd4caee52e65c',
    resto: '2cad26f68ce0b221',
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
    sons: '9d9a70b5d144c046',
    nomes: '5e5595e03f49538f',
    textos: '56e4d1cac60b1f74',
    resto: 'b6ff84c0cd6494ba',
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
    sons: '14007d30fc1ff96c',
    nomes: '35f93f1f05349085',
    textos: 'f56358d5afe605cb',
    resto: 'b13b5fb3b924c0d9',
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
  const { estiloSeguro } = await import('../../src/world/estiloSeguro');
  const { NIVEL_TRILHA } = await import('../../src/audio/trilha');
  const { NIVEL_VOZES } = await import('../../src/audio/vozesGravadas');
  const nomes = await import('../../src/temas/nomes');
  const { povoadoDoTema } = await import('../../src/temas/ativo');
  const { textosOriginais } = await import('../../src/temas/originais');
  const t = obterTema(id);
  expect(t.id).toBe(id);
  ativarTemaPuro(t);
  chunk.definirPovoados(true);
  return {
    chunk,
    povoado,
    t,
    gerarAtlas,
    construirMapaEmissivo,
    Bloco,
    estiloSeguro,
    NIVEL_TRILHA,
    NIVEL_VOZES,
    nomes,
    povoadoDoTema,
    textosOriginais,
  };
}

/** Os sons do tema: o índice, os pacotes (tamanho e conteúdo) e os ajustes de volume. */
async function hashSons(j: Jogo, id: Id): Promise<string> {
  const indice = JSON.parse(readFileSync('public/sons/indice.json', 'utf8'));
  const pasta = 'public/sons/pacotes';
  const arquivos = readdirSync(pasta)
    .filter((a) => a === 'comum-vozes.mp3' || (a.startsWith(`${id}-`) && a.endsWith('.mp3')))
    .sort();
  expect(arquivos.some((a) => a.startsWith(`${id}-`))).toBe(true);
  const partes: (Uint8Array | string)[] = [
    jsonEstavel({
      tema: indice.temas[id] ?? null,
      comum: indice.comum ?? null,
      // as regras do índice (taxa, laço, volume, formato), sem os créditos
      indiceMusica: { ...indice.musica, creditos: undefined },
      indiceVozes: indice.vozes ?? null,
      tamanhos: arquivos.map((a) => [a, indice.tamanhos?.[a] ?? null]),
      trilha: j.NIVEL_TRILHA[id] ?? null,
      vozes: j.NIVEL_VOZES[id] ?? null,
      musica: j.t.musica,
      natureza: j.t.natureza,
      materiais: j.t.materiais,
    }),
  ];
  // o conteúdo de cada pacote (em base64: os tipos do Node do projeto só leem texto)
  for (const a of arquivos) partes.push(`${a};`, readFileSync(`${pasta}/${a}`, 'base64'));
  return sha(partes);
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

/** Os moradores dos planos achados: id do povoado (como o núcleo dá) -> [n, profissão]. */
type Moradores = Map<string, [number, Profissao][]>;

async function hashTerreno(j: Jogo, semente: number, moradores: Moradores): Promise<string> {
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
    // o plano inteiro: moradores, pistas, metrô, vaga, cruzamentos, postes; zonas, pontos, peças
    partes.push(jsonEstavel(urbano));
    // o núcleo chama os moradores da cidade de 'cidade' e os do bairro de 'vila'
    const chave = 'moradores' in urbano ? 'cidade' : 'vila';
    const lista = moradores.get(chave) ?? [];
    if ('moradores' in urbano) for (const mo of urbano.moradores) lista.push([mo.n, mo.profissao]);
    moradores.set(chave, lista);
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
      moradores.set(
        p.id,
        p.moradores.map((mo) => [mo.n, mo.profissao]),
      );
      const d = Math.hypot(p.cx - n.x, p.cz - n.z);
      if (!perto || d < perto.d) perto = { p, d };
    }
  if (perto) chunksDaCaixa(perto.p.minX, perto.p.minZ, perto.p.maxX, perto.p.maxZ, chaves);
  // na Cidade, na Vila e no Rancho o nascer é no meio (ou ao lado) do lugar: tem que haver um
  expect(!!urbano || !!perto, 'sem bairro, cidade nem povoado perto do nascer').toBe(true);
  for (const [cx, cz] of emOrdem(chaves)) {
    partes.push(`${cx},${cz};`, chunk.gerarChunk(cx, cz, semente));
    // a direção dos degraus, portas, bancos e placas (só a Cidade e a Vila têm)
    const metas = [...chunk.metasGeradasDoChunk(cx, cz, semente)].sort((a, b) => a[0] - b[0]);
    if (metas.length) partes.push(JSON.stringify(metas));
  }
  return sha(partes);
}

/**
 * Os nomes dos moradores: cada nome do povoado com o gênero, e o nome e o gênero de n = 0 a 8
 * em cada profissão (e de cada morador dos planos) em cada povoado achado.
 */
async function hashNomes(j: Jogo, moradores: Moradores): Promise<string> {
  const { nomeDoMorador, generoDoMorador, generoDoNome } = j.nomes;
  const generos = j.povoadoDoTema().nomes.map((nome) => [nome, generoDoNome(nome)]);
  expect(generos.length).toBeGreaterThan(0);
  expect(moradores.size).toBeGreaterThan(0);
  const porPovoado: [string, [number, Profissao, string, string][]][] = [];
  for (const id of [...moradores.keys()].sort()) {
    const casos = new Map<string, [number, Profissao]>();
    for (let n = 0; n <= 8; n++)
      for (const prof of j.povoado.PROFISSOES) casos.set(`${n}:${prof}`, [n, prof]);
    for (const [n, prof] of moradores.get(id)!) casos.set(`${n}:${prof}`, [n, prof]);
    const lista = [...casos.values()]
      .sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]))
      .map(([n, prof]) => [n, prof, nomeDoMorador(id, n, prof), generoDoMorador(id, n, prof)]);
    porPovoado.push([id, lista as [number, Profissao, string, string][]]);
  }
  return sha([jsonEstavel({ generos, porPovoado })]);
}

/** Os textos do tema por cima dos de base, como `aplicarTextos` aplica (e o jogo lê). */
function textosAplicados(t: TextosTema, o: TextosTema): Record<string, string> {
  const r: Record<string, string> = {};
  for (const sec of [
    'blocos',
    'itens',
    'criaturas',
    'biomas',
    'estacoes',
    'climas',
    'missoes',
    'capitulos',
    'legendas',
  ] as const) {
    const base = o[sec] as Record<string, unknown>;
    const doTema = t[sec] as Record<string, unknown>;
    for (const k of new Set([...Object.keys(base), ...Object.keys(doTema)]))
      r[`${sec}.${k}`] = jsonEstavel(doTema[k] ?? base[k]);
  }
  for (const k of ['diario', 'boasVindas', 'morte'] as const) r[k] = t[k] ?? o[k];
  return r;
}

async function hashTextos(j: Jogo): Promise<string> {
  const aplicados = textosAplicados(j.t.textos, j.textosOriginais());
  // a busca: fora de `TEXTOS_FORA`, nenhum texto aplicado com "bruma" ou os nomes dos quatro
  const achados = Object.keys(aplicados).filter((k) => DOS_QUATRO.test(aplicados[k]));
  expect(achados.filter((k) => !TEXTOS_FORA.includes(k))).toEqual([]);
  const r: Record<string, string> = {};
  for (const k of Object.keys(aplicados)) if (!TEXTOS_FORA.includes(k)) r[k] = aplicados[k];
  return sha([jsonEstavel(r)]);
}

async function calcular(id: Id): Promise<Hashes> {
  const j = await carregar(id);
  const { t } = j;
  // a nuvem gera o terreno com o estilo passado a limpo: tem que ser o mesmo do tema
  expect(jsonEstavel(j.estiloSeguro(t.mundo))).toBe(jsonEstavel(t.mundo));
  const atlas = j.gerarAtlas(j.chunk.SEMENTE_PADRAO);
  const emissivos = atlas.tiles
    .filter((x) => x.emissivo)
    .map((x) => x.nome)
    .join(',');
  const mapa = j.construirMapaEmissivo(atlas, [j.Bloco.CRISTAL_LUZ, j.Bloco.COGUMELO_BRILHANTE]);
  const terreno: string[] = [];
  const moradores: Moradores = new Map();
  for (const s of SEMENTES) terreno.push(await hashTerreno(j, s, moradores));
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
    sons: await hashSons(j, id),
    nomes: await hashNomes(j, moradores),
    textos: await hashTextos(j),
    // os textos ficam de fora (têm o hash próprio, sem as chaves que a 034 pode trocar)
    resto: await sha([jsonEstavel({ ...t, textos: undefined })]),
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
