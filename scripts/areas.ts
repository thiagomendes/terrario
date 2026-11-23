/**
 * O mapa das áreas da conferência (e2e/areas.json) e a escolha do que rodar pelo que mudou
 * no ramo. Lógica pura sobre o disco, sem rodar nada: quem roda é o scripts/conferir.ts;
 * quem confere o mapa é o tests/e2e-areas.test.ts.
 *
 * Sem dependências além do Node (o conferir.ts roda com `node`, que tira os tipos sozinho).
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

export interface Area {
  nome: string;
  gatilhos: string[];
  suites: string[];
}

export interface ItemDeTeste {
  suite: string;
  /** Pedaço do título (literal); sem ele, a suíte inteira. */
  titulo?: string;
  porque?: string;
  motivo?: string;
  nota?: string;
}

export interface Mapa {
  areas: Record<string, Area>;
  comuns: string[];
  tudo: string[];
  paridade: { suite: string; gatilhos: string[]; fechoDoNucleo: boolean };
  fumaca: ItemDeTeste[];
  quarentena: ItemDeTeste[];
}

export function lerMapa(raiz: string): Mapa {
  return JSON.parse(readFileSync(join(raiz, 'e2e/areas.json'), 'utf8')) as Mapa;
}

/** O gatilho pega o arquivo: pasta (termina em /) pelo começo, arquivo pelo nome inteiro. */
export function casa(gatilho: string, arquivo: string): boolean {
  return gatilho.endsWith('/') ? arquivo.startsWith(gatilho) : arquivo === gatilho;
}

/** Todos os arquivos de uma pasta (caminhos relativos à raiz, com /). */
export function arquivosDe(raiz: string, pasta: string): string[] {
  const fora: string[] = [];
  const andar = (p: string) => {
    for (const nome of readdirSync(join(raiz, p))) {
      const r = `${p}/${nome}`;
      if (statSync(join(raiz, r)).isDirectory()) andar(r);
      else fora.push(r);
    }
  };
  if (existsSync(join(raiz, pasta))) andar(pasta);
  return fora.sort();
}

const IMPORT = /(?:import|export)\s[^'"`;]*?from\s+['"](\.{1,2}\/[^'"]+)['"]|import\(\s*['"](\.{1,2}\/[^'"]+)['"]|import\s+['"](\.{1,2}\/[^'"]+)['"]|new URL\(\s*['"](\.{1,2}\/[^'"]+)['"]/g;

/** Os arquivos que `arquivo` importa (só os relativos, já resolvidos para o .ts). */
export function importsDe(raiz: string, arquivo: string): string[] {
  const texto = readFileSync(join(raiz, arquivo), 'utf8');
  const fora: string[] = [];
  for (const m of texto.matchAll(IMPORT)) {
    const alvo = resolve(raiz, dirname(arquivo), m[1] ?? m[2] ?? m[3] ?? m[4]);
    for (const c of [alvo, `${alvo}.ts`, alvo.replace(/\.(m?js)$/, '.ts'), join(alvo, 'index.ts')])
      if (existsSync(c) && statSync(c).isFile()) {
        fora.push(relative(raiz, c).split('\\').join('/'));
        break;
      }
  }
  return fora;
}

/** O fecho dos imports: os arquivos de `inicio` e tudo o que eles importam, direto ou não. */
export function fechoDeImports(raiz: string, inicio: string[]): Set<string> {
  const vistos = new Set<string>();
  const fila = [...inicio];
  while (fila.length) {
    const f = fila.pop()!;
    if (vistos.has(f)) continue;
    vistos.add(f);
    fila.push(...importsDe(raiz, f));
  }
  return vistos;
}

/** O que o núcleo roda: src/nucleo/ e servidor/src/, com tudo o que importam. */
export function fechoDoNucleo(raiz: string): Set<string> {
  const ts = (p: string) => arquivosDe(raiz, p).filter((f) => f.endsWith('.ts'));
  return fechoDeImports(raiz, [...ts('src/nucleo'), ...ts('servidor/src')]);
}

export const ehSuite = (f: string) => /^e2e\/[^/]+\.spec\.ts$/.test(f);
const nomeDaSuite = (f: string) => f.slice('e2e/'.length);

/** A área de cada suíte (a paridade fica fora). */
export function areaDaSuite(mapa: Mapa): Map<string, string> {
  const fora = new Map<string, string>();
  for (const [id, a] of Object.entries(mapa.areas)) for (const s of a.suites) fora.set(s, id);
  return fora;
}

export interface Plano {
  tudo: boolean;
  /** Por que o regime antigo (o arquivo que pediu), se for o caso. */
  porqueTudo: string | null;
  areas: string[];
  /** Para cada área escolhida, os arquivos que a dispararam. */
  porque: Record<string, string[]>;
  /** Suítes de fora das áreas escolhidas que rodam porque o teste delas mudou. */
  suitesAvulsas: string[];
  porqueAvulsas: Record<string, string[]>;
  paridade: boolean;
  porqueParidade: string[];
  /** Arquivos mudados que não disparam nada além da fumaça. */
  soFumaca: string[];
}

/**
 * O que rodar para estes arquivos mudados. `forcadas` entram sempre (--areas); `tudo` liga o
 * regime antigo (--tudo).
 */
export function planejar(
  raiz: string,
  mapa: Mapa,
  mudados: string[],
  op: { forcadas?: string[]; tudo?: boolean } = {},
): Plano {
  const porque: Record<string, string[]> = {};
  const marcar = (area: string, por: string) => {
    const l = (porque[area] ??= []);
    if (!l.includes(por)) l.push(por);
  };
  const daSuite = areaDaSuite(mapa);
  const fecho = mapa.paridade.fechoDoNucleo ? fechoDoNucleo(raiz) : new Set<string>();
  const porqueParidade: string[] = [];
  const soFumaca: string[] = [];
  let porqueTudo: string | null = op.tudo ? '--tudo' : null;

  // as suítes que importam cada ajudante do e2e (direto ou não)
  const suites = arquivosDe(raiz, 'e2e').filter(ehSuite);
  const fechoDaSuite = new Map(suites.map((s) => [s, fechoDeImports(raiz, [s])]));

  // o teste mudado roda ele mesmo (a suíte, ou as suítes que usam o ajudante mudado), sem
  // puxar a área inteira: quem escolhe as áreas é o código do jogo
  const avulsas = new Map<string, string[]>();
  const avulsa = (suite: string, por: string) => {
    const l = avulsas.get(suite) ?? [];
    if (!l.includes(por)) l.push(por);
    avulsas.set(suite, l);
  };
  for (const f of mudados) {
    let algum = false;
    if (!porqueTudo && mapa.tudo.some((g) => casa(g, f))) porqueTudo = f;
    if (mapa.paridade.gatilhos.some((g) => casa(g, f)) || fecho.has(f)) porqueParidade.push(f);
    if (ehSuite(f) && existsSync(join(raiz, f))) {
      const nome = nomeDaSuite(f);
      if (nome === mapa.paridade.suite) porqueParidade.push(f);
      else {
        avulsa(nome, f);
        algum = true;
      }
    } else if (f.startsWith('e2e/') && f.endsWith('.ts')) {
      for (const [s, fs] of fechoDaSuite)
        if (s !== f && fs.has(f) && nomeDaSuite(s) !== mapa.paridade.suite) {
          avulsa(nomeDaSuite(s), f);
          algum = true;
        }
    }
    for (const [id, a] of Object.entries(mapa.areas))
      if (a.gatilhos.some((g) => casa(g, f))) {
        marcar(id, f);
        algum = true;
      }
    if (!algum) soFumaca.push(f);
  }
  for (const a of op.forcadas ?? []) {
    if (!mapa.areas[a]) throw new Error(`área desconhecida: ${a} (as áreas: ${Object.keys(mapa.areas).join(', ')})`);
    marcar(a, '--areas');
  }
  const tudo = !!porqueTudo;
  const areas = tudo ? Object.keys(mapa.areas) : Object.keys(mapa.areas).filter((a) => porque[a]);
  return {
    tudo,
    porqueTudo,
    areas,
    porque,
    // as que a área escolhida já roda não entram de novo
    suitesAvulsas: [...avulsas.keys()].filter((s) => !areas.includes(daSuite.get(s) ?? '')).sort(),
    porqueAvulsas: Object.fromEntries(avulsas),
    paridade: tudo || porqueParidade.length > 0,
    porqueParidade: [...new Set(porqueParidade)],
    soFumaca: [...new Set(soFumaca)],
  };
}

/** Escapa o texto para uma expressão regular (o grep do Playwright). */
export const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A expressão do grep do Playwright para estes itens. O Playwright confere o grep contra
 * "arquivo título-do-describe título-do-teste", separados por espaço.
 */
export function grepDosItens(itens: ItemDeTeste[]): string {
  return itens
    .map((i) => `(^|[ /])${escapar(i.suite)}${i.titulo ? ` .*${escapar(i.titulo)}` : ''}`)
    .join('|');
}
