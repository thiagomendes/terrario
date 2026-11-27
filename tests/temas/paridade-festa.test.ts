import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

declare const process: { env: Record<string, string | undefined> };
import type { TextosTema } from '../../src/temas/tipos';
import type { RetanguloVila } from '../../src/world/vilaNeon';
import { CELULA } from '../../src/art/atlas';

/**
 * Spec 027 (T23): o hash da Noite das Fantasias ao fechar a parte 1, para a parte 2 não mudar a
 * parte 1 sem querer (a seção "Hash do mundo novo entre as partes" da spec).
 *
 * Ele vale **fora dos lotes que a parte 2 mexe**: o lote da Casa da Vovó, o da Loja, o do
 * Castelinho (o lado de dentro dos três e as portas que passam a abrir) e o do gramado da festa
 * (a parte 3 põe ali o trem, o carrossel e o balanço). Os lotes são as zonas do plano
 * (`plano.zonas.vovo`, `loja`, `castelo` e `gramado`, em blocos do mundo, com as bordas).
 *
 * O que entra, em 3 sementes, com os povoados ligados e o tema carregado do zero (como uma página):
 * - **terreno:** o nascimento e o olhar; os blocos de todos os chunks da área plana da vila e
 *   dos 7 × 7 em volta do nascer, com as colunas dos lotes apagadas; os metadados da geração
 *   (degraus, portas, bancos) fora dos lotes;
 * - **plano:** a área plana, as zonas, as entradas, o nascer, o laguinho e o canto do mapa; os
 *   pontos (moradores, portas, lanternas, esconderijos, horta...) e as peças fora dos lotes;
 * - **povoado:** os dados do povoado do tema (nomes, profissões, os moradores de posto com as
 *   roupas) e o nome e o gênero de cada morador de posto e de cada vizinho da rua;
 * - **tema:** as 142 células do atlas de hoje (as 128 de antes e os 14 tiles dos blocos 117 a
 *   127) e o mapa emissivo delas, os tiles que brilham, o céu, os quadros do céu, as criaturas,
 *   o movimento, as vozes, o estilo do mundo, os textos de hoje (só as chaves que já existem) e
 *   o resto do tema (sem os textos e sem os exclusivos).
 */

/**
 * O que muda **de propósito** na parte 2 (T25 a T31), e por isso fica fora do hash. Quem mexer
 * em algo que não está aqui e mudar o hash, mudou a parte 1 sem querer.
 */
export const MUDA_NA_PARTE_2: readonly { o_que: string; motivo: string }[] = [
  {
    o_que: 'os blocos, os metadados, as peças e os pontos dentro do lote da Casa da Vovó',
    motivo: 'T26: a sala por dentro (o sofá, o caldeirão grande, a vassoura, os potinhos), a porta que abre, a Vovó e o Tufinho na sala',
  },
  {
    o_que: 'os blocos, os metadados, as peças e os pontos dentro do lote da Loja de Fantasias',
    motivo: 'T27: os cabides por tipo, o provador, o espelho mágico e a porta que abre',
  },
  {
    o_que: 'os blocos, os metadados, as peças e os pontos dentro do lote do Castelinho',
    motivo: 'T28: o órgão, os quadros, a escada da torre e o escorregador em espiral por fora dela',
  },
  {
    o_que: 'os blocos, os metadados, as peças e os pontos dentro do lote do gramado da festa',
    motivo: 'parte 3 (T33 a T35): o laço do trem, a estação, o carrossel e o balanço (a parte 2 não mexe, mas o lote fica livre desde já)',
  },
  {
    o_que: 'os sons do mundo (o pacote de vozes, o índice e a trilha)',
    motivo: 'T31: os sons de dentro (o caldeirão, o órgão, o escorregador) e a banda da n8',
  },
  {
    o_que: 'as chaves novas dos textos (os itens, os blocos e as missões que a parte 2 traz)',
    motivo: 'T29: as frutas do caldeirão, o copo de poção, os instrumentos e as missões n6 a n8; as chaves de hoje continuam no hash',
  },
  {
    o_que: 'os exclusivos do mundo (`EXCLUSIVOS_BAILE`)',
    motivo: 'T26 a T29: os itens e os blocos novos que só este mundo tem',
  },
  {
    o_que: 'as células do atlas depois da 141',
    motivo: 'um bloco novo de dentro das casas ganharia tile depois dos 14 de hoje; as 142 de hoje continuam no hash',
  },
  {
    o_que: 'a alma (as missões n6 a n8, as moedinhas e as contas) e a `VERSAO_REDE` 20',
    motivo: 'T29: as missões novas e o protocolo da parte 2 (não entram em nenhum hash do tema)',
  },
];

const SEMENTES = [1337, 42, 7] as const;
/** Raio (em chunks) da área em volta do nascer. */
const RAIO = 3;
/** As células do atlas de hoje: as 128 de antes e os 14 tiles da festa (128 a 141). */
const CELULAS_PARTE_1 = 142;
const TILES_027_PARTE_1 = 14;
const LOTES = ['vovo', 'loja', 'castelo', 'gramado'] as const;

interface Hashes {
  terreno: [string, string, string];
  plano: [string, string, string];
  povoado: string;
  atlas: string;
  mapaEmissivo: string;
  emissivos: string;
  ceu: string;
  quadrosCeu: string;
  criaturas: string;
  movimento: string;
  vozes: string;
  mundo: string;
  textos: string;
  resto: string;
}

/** O hash gravado no fim da parte 1 (22 nov 2026, commit da T23). */
const ESPERADO: Hashes = {
  terreno: ['98983f687e233d45', '364f50455e26feb5', '682b256e126cfc06'],
  plano: ['81074c6bc78df083', '5db6326cb07e2dfe', '0ea0a889af736f2c'],
  // (regravado no portão da T24: a roupa da vizinha Celeste, de gatinha, de grafite para cinza
  // claro; nada mais do povoado mudou. Regravado de novo na rodada do revisor visual: o rosto
  // fixo, sem cílios, sardas nem barba, da Celeste, da Dalva, da Lulu e do Nestor, e a fantasia
  // do Nestor sem a faixa nos olhos, de orelhas pontudas e capinha de asa)
  povoado: '05ccdaeef0881e19',
  atlas: '6ed5a6453b4cacde',
  mapaEmissivo: '06cd38bd102431a9',
  emissivos: '98a32cdc9f6a5e29',
  ceu: '79fc1f280d7d24ab',
  quadrosCeu: 'cbf44b22558945de',
  // (regravado na rodada do revisor visual da T24: o sapinho de olhos de frente, com o brilho,
  // e a boca em curva de sorriso)
  criaturas: '0c7e1fb4eab334c9',
  movimento: 'dacd063760735de4',
  vozes: 'c3f0935da623a647',
  mundo: '7aee8a78a6d0dbfb',
  textos: '6e1454340067bc28',
  // (regravado no portão da T24, pela mesma roupa da Celeste, que o tema inteiro também leva; e
  // de novo na rodada do revisor visual, pelas mesmas mudanças do povoado e do sapinho)
  resto: '1d0c3dfd6247208f',
};

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

const dentro = (r: RetanguloVila, x: number, z: number) =>
  x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
const nosLotes = (lotes: RetanguloVila[], x: number, z: number) =>
  lotes.some((r) => dentro(r, Math.floor(x), Math.floor(z)));

const FORA = Symbol('no lote');

/**
 * Os pontos e as peças sem o que cai nos lotes: um ponto é `[x, y, z]`, `[x, z]` ou um objeto com
 * `x` e `z`; o que cai num lote sai da lista (ou do objeto), o resto fica como está.
 */
function semOsLotes(v: unknown, lotes: RetanguloVila[]): unknown {
  if (Array.isArray(v)) {
    if (v.length >= 2 && v.length <= 3 && v.every((n) => typeof n === 'number')) {
      const [x, z] = v.length === 3 ? [v[0], v[2]] : [v[0], v[1]];
      return nosLotes(lotes, x, z) ? FORA : v;
    }
    return v.map((e) => semOsLotes(e, lotes)).filter((e) => e !== FORA);
  }
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o.x === 'number' && typeof o.z === 'number' && nosLotes(lotes, o.x, o.z)) return FORA;
    const r: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(o)) {
      const y = semOsLotes(x, lotes);
      if (y !== FORA) r[k] = y;
    }
    return r;
  }
  return v;
}

/** O jogo do zero com a Noite das Fantasias ativa (como uma página nova). */
async function carregar() {
  vi.resetModules();
  const chunk = await import('../../src/world/chunk');
  await import('../../src/temas/todos');
  const { obterTema } = await import('../../src/temas');
  const { ativarTemaPuro } = await import('../../src/temas/ativarPuro');
  const { gerarAtlas } = await import('../../src/art/atlas');
  const { TILES_027, indiceDoTile } = await import('../../src/art/tiles');
  const { construirMapaEmissivo } = await import('../../src/render/emissivo');
  const { Bloco } = await import('../../src/world/blocks');
  const { estiloSeguro } = await import('../../src/world/estiloSeguro');
  const nomes = await import('../../src/temas/nomes');
  const { textosOriginais } = await import('../../src/temas/originais');
  const { MORADORES_BAILE, PROFISSOES_DA_RUA, POVOADO_BAILE } = await import('../../src/nucleo/baile');
  const { N_BAILE } = await import('../../src/jogo/baile');
  const t = obterTema('noite-das-fantasias');
  expect(t.id).toBe('noite-das-fantasias');
  ativarTemaPuro(t);
  chunk.definirPovoados(true);
  return {
    chunk,
    t,
    gerarAtlas,
    TILES_027,
    indiceDoTile,
    construirMapaEmissivo,
    Bloco,
    estiloSeguro,
    nomes,
    textosOriginais,
    MORADORES_BAILE,
    PROFISSOES_DA_RUA,
    POVOADO_BAILE,
    N_BAILE,
  };
}
type Jogo = Awaited<ReturnType<typeof carregar>>;

function emOrdem(chaves: Set<string>): [number, number][] {
  return [...chaves]
    .map((k) => k.split(',').map(Number) as [number, number])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

/** O terreno e o plano de uma semente, sem os lotes. */
async function hashSemente(j: Jogo, semente: number): Promise<[string, string]> {
  const { chunk } = j;
  const plano = chunk.baileDoMundo(semente);
  expect(plano, 'sem a vila da festa').not.toBeNull();
  const p = plano!;
  const lotes = LOTES.map((k) => p.zonas[k]);
  // o nascer fica fora dos lotes, e cada lote tem chão de verdade
  expect(nosLotes(lotes, p.nascimento.x, p.nascimento.z)).toBe(false);
  for (const r of lotes) expect(r.x1 - r.x0).toBeGreaterThan(5);

  const n = chunk.encontrarNascimento(semente);
  const terreno: (Uint8Array | string)[] = [
    jsonEstavel({ n, olhar: chunk.olharDoNascimento(semente) ?? null }),
  ];
  const chaves = new Set<string>();
  const ncx = Math.floor(n.x / 16);
  const ncz = Math.floor(n.z / 16);
  for (let cx = ncx - RAIO; cx <= ncx + RAIO; cx++)
    for (let cz = ncz - RAIO; cz <= ncz + RAIO; cz++) chaves.add(`${cx},${cz}`);
  for (let cx = Math.floor(p.plana.x0 / 16); cx <= Math.floor(p.plana.x1 / 16); cx++)
    for (let cz = Math.floor(p.plana.z0 / 16); cz <= Math.floor(p.plana.z1 / 16); cz++)
      chaves.add(`${cx},${cz}`);
  let apagadas = 0;
  for (const [cx, cz] of emOrdem(chaves)) {
    const blocos = new Uint8Array(chunk.gerarChunk(cx, cz, semente));
    // as colunas dos lotes apagadas (todas as alturas)
    const noLote: boolean[] = [];
    for (let z = 0; z < 16; z++)
      for (let x = 0; x < 16; x++) {
        const l = nosLotes(lotes, cx * 16 + x, cz * 16 + z);
        noLote[z * 16 + x] = l;
        if (!l) continue;
        apagadas++;
        for (let y = 0; y < chunk.ALTURA; y++) blocos[chunk.indice(x, y, z)] = 255;
      }
    terreno.push(`${cx},${cz};`, blocos);
    const metas = [...chunk.metasGeradasDoChunk(cx, cz, semente)]
      .filter(([i]) => !noLote[(Math.floor(i / 16) % 16) * 16 + (i % 16)])
      .sort((a, b) => a[0] - b[0]);
    if (metas.length) terreno.push(JSON.stringify(metas));
  }
  // os quatro lotes caem dentro da área medida
  expect(apagadas).toBe(
    lotes.reduce((s, r) => s + (r.x1 - r.x0 + 1) * (r.z1 - r.z0 + 1), 0),
  );

  const { pontos, pecas, ...resto } = p;
  const pecasFora = semOsLotes(pecas, lotes) as unknown[];
  expect(pecasFora.length).toBeLessThan(pecas.length);
  expect(pecasFora.length).toBeGreaterThan(pecas.length / 2);
  const planoFora = sha([
    jsonEstavel({ ...resto, pontos: semOsLotes(pontos, lotes), pecas: pecasFora }),
  ]);
  return [await sha(terreno), await planoFora];
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

/**
 * As chaves dos textos aplicados no fim da parte 1, guardadas em `paridade-festa-chaves.json`
 * (`GRAVAR_FESTA_027=1 npx vitest run tests/temas/paridade-festa.test.ts`, só ao fechar uma
 * parte). O hash dos textos lê só estas: as chaves que a parte 2 trouxer ficam de fora, e as de
 * hoje não podem mudar nem sumir.
 */
const ARQ_CHAVES = 'tests/temas/paridade-festa-chaves.json';
const GRAVAR = !!process.env.GRAVAR_FESTA_027;
const CHAVES_TEXTOS_PARTE_1 = 264;

async function calcular(): Promise<{ h: Hashes; chavesTextos: string[] }> {
  const j = await carregar();
  const { t } = j;
  // a nuvem gera o terreno com o estilo passado a limpo: tem que ser o mesmo do tema
  expect(jsonEstavel(j.estiloSeguro(t.mundo))).toBe(jsonEstavel(t.mundo));
  const terreno: string[] = [];
  const plano: string[] = [];
  for (const s of SEMENTES) {
    const [a, b] = await hashSemente(j, s);
    terreno.push(a);
    plano.push(b);
  }

  // o atlas: as 142 células de hoje, uma a uma (16 colunas)
  const atlas = j.gerarAtlas(j.chunk.SEMENTE_PADRAO);
  expect(atlas.altura).toBe(16 * CELULA);
  const colunas = atlas.largura / CELULA;
  expect(j.TILES_027.length).toBeGreaterThanOrEqual(TILES_027_PARTE_1);
  expect(j.indiceDoTile(j.TILES_027[TILES_027_PARTE_1 - 1])).toBe(CELULAS_PARTE_1 - 1);
  const mapa = j.construirMapaEmissivo(atlas, [j.Bloco.CRISTAL_LUZ, j.Bloco.COGUMELO_BRILHANTE]);
  const celulas = (px: Uint8Array | Uint8ClampedArray) => {
    const partes: Uint8Array[] = [];
    for (let c = 0; c < CELULAS_PARTE_1; c++) {
      const ox = (c % colunas) * CELULA;
      const oy = Math.floor(c / colunas) * CELULA;
      for (let y = 0; y < CELULA; y++) {
        const i = ((oy + y) * atlas.largura + ox) * 4;
        partes.push(new Uint8Array(px.buffer, px.byteOffset + i, CELULA * 4));
      }
    }
    return partes;
  };
  // (os tiles que a parte 2 trouxer ficam de fora)
  const novos = new Set(j.TILES_027.slice(TILES_027_PARTE_1));
  const emissivos = atlas.tiles
    .filter((x) => x.emissivo && !novos.has(x.nome))
    .map((x) => x.nome)
    .join(',');

  // o povoado: os dados do tema e o nome e o gênero de cada morador de posto e de cada vizinho
  const moradores: [number, string][] = [
    ...j.MORADORES_BAILE.map((m) => [m.n, m.profissao] as [number, string]),
    ...j.PROFISSOES_DA_RUA.map((prof, i) => [j.N_BAILE.rua + i, prof] as [number, string]),
  ];
  const quem = moradores.map(([n, prof]) => [
    n,
    prof,
    j.nomes.nomeDoMorador(j.POVOADO_BAILE, n, prof as never),
    j.nomes.generoDoMorador(j.POVOADO_BAILE, n, prof as never),
  ]);
  expect(quem.length).toBe(12);
  for (const [n, , nome] of quem) expect(Number.isInteger(n) && String(nome).length > 1, `${n}`).toBe(true);
  expect(quem.map((q) => q[2])).toContain('Vovó Zuleica');

  // os textos: só as chaves do fim da parte 1 (todas têm que continuar existindo)
  const todos = textosAplicados(t.textos, j.textosOriginais());
  if (GRAVAR) writeFileSync(ARQ_CHAVES, `${JSON.stringify(Object.keys(todos).sort(), null, 1)}\n`);
  const chavesTextos = JSON.parse(readFileSync(ARQ_CHAVES, 'utf8')) as string[];
  expect(chavesTextos.filter((k) => !(k in todos)), 'chaves da parte 1 que sumiram').toEqual([]);
  const textos: Record<string, string> = {};
  for (const k of chavesTextos) textos[k] = todos[k];

  return {
    chavesTextos,
    h: {
      terreno: terreno as [string, string, string],
      plano: plano as [string, string, string],
      povoado: await sha([jsonEstavel({ povoado: t.povoado ?? null, quem })]),
      atlas: await sha(celulas(atlas.pixels)),
      mapaEmissivo: await sha(celulas(mapa)),
      emissivos: await sha([emissivos]),
      ceu: await sha([jsonEstavel(t.ceu)]),
      quadrosCeu: await sha([jsonEstavel(t.quadrosCeu)]),
      criaturas: await sha([jsonEstavel(t.criaturas)]),
      movimento: await sha([jsonEstavel(t.movimento)]),
      vozes: await sha([jsonEstavel(t.vozes)]),
      mundo: await sha([jsonEstavel(t.mundo)]),
      textos: await sha([jsonEstavel(textos)]),
      resto: await sha([jsonEstavel({ ...t, textos: undefined, exclusivos: undefined })]),
    },
  };
}

describe('spec 027: a Noite das Fantasias da parte 1, fora dos lotes da parte 2', () => {
  it('terreno e plano em 3 sementes, povoado, atlas e dados do tema', async () => {
    const { h, chavesTextos } = await calcular();
    expect(chavesTextos.length).toBe(CHAVES_TEXTOS_PARTE_1);
    expect(h).toEqual(ESPERADO);
  }, 180_000);

  it('a lista do que muda de propósito na parte 2 tem os quatro lotes', () => {
    for (const lote of ['Casa da Vovó', 'Loja', 'Castelinho', 'gramado'])
      expect(MUDA_NA_PARTE_2.some((m) => m.o_que.includes(lote)), lote).toBe(true);
  });
});
