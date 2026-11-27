/**
 * Spec 039: a camada dos tapetes, rente ao chão (decisão do dono, 27 nov 2026: "sim, por
 * cima"). O tapete não é o bloco da célula: ele fica guardado à parte, pelo núcleo, com a
 * âncora (a célula da parte 0), a direção e o dono, e é salvo. Por cima dele vão o sofá, a
 * cadeira e os blocos, como numa sala de verdade. Ele não segura nada e não tem colisão.
 *
 * - **Pôr:** as 6 células (3 para a direita e 2 para a frente de quem põe) dentro do mundo,
 *   livres (ar ou planta baixa), com chão sólido embaixo, sem outro tapete, e com a proteção de
 *   colocar em cada uma. Ninguém fica preso: o tapete não ocupa espaço.
 * - **Tirar:** a criança quebra uma parte do tapete onde não há nada em cima; sai o tapete
 *   inteiro, para a mochila, com a proteção de quebrar (só quem pôs e o dono do mundo).
 *
 * O núcleo e a previsão do cliente usam as mesmas regras daqui (nada pisca).
 */
import { obterBloco } from '../world/blocks';
import { blocoApoia } from './construir';
import { substituivel } from './plantio';
import { podeMexer, recusaColocar, type MundoDaRegra, type RecusaProtecao } from './permissao';
import { FORMA_TAPETE, celulasDaForma, type Celula, type CelulaDoMovel } from './moveis';

/** Um tapete: a âncora (a parte 0), a direção (0 a 3) e o dono (índice na tabela, 0 o do mundo). */
export interface Tapete {
  x: number;
  y: number;
  z: number;
  d: number;
  dono: number;
}

/** O que muda na camada, como vai no quadro: um tapete posto, ou o da âncora que saiu. */
export type TapeteMudado = Tapete | { x: number; y: number; z: number; fora: true };

/** Como vai no salvamento: [x, y, z, d, dono]. */
export type TapeteSalvo = [number, number, number, number, number];

/** Tapetes por mundo, no máximo (cada um tem 6 células). */
export const MAX_TAPETES = 4096;

const chave = (x: number, y: number, z: number) => `${x},${y},${z}`;

/** As 6 células do tapete com a âncora em (x, y, z), olhando para `d` (a âncora primeiro). */
export function celulasDoTapete(x: number, y: number, z: number, d: number): CelulaDoMovel[] {
  return celulasDaForma(FORMA_TAPETE, x, y, z, d);
}

export interface CamadaTapetes {
  /** O tapete que cobre a célula (undefined: nenhum). */
  em(x: number, y: number, z: number): Tapete | undefined;
  /** Põe o tapete (false: alguma célula já tem outro, ou o mundo está cheio de tapetes). */
  por(t: Tapete): boolean;
  /** Tira o tapete da âncora (x, y, z); devolve o que saiu. */
  tirar(x: number, y: number, z: number): Tapete | undefined;
  /** O oficial manda: tira os que cobrem as células dele e põe (a réplica do cliente). */
  impor(t: Tapete): void;
  todos(): Tapete[];
  readonly tamanho: number;
  /** Sobe a cada mudança (quem desenha sabe quando refazer). */
  readonly versao: number;
  /** Troca tudo pela lista (o primeiro quadro, o salvamento). */
  trocar(lista: readonly Tapete[]): void;
  salvar(): TapeteSalvo[];
}

export function criarCamadaTapetes(): CamadaTapetes {
  /** âncora → tapete */
  const tapetes = new Map<string, Tapete>();
  /** célula → âncora */
  const celulas = new Map<string, string>();
  let versao = 0;

  function tirar(x: number, y: number, z: number): Tapete | undefined {
    const k = chave(x, y, z);
    const t = tapetes.get(k);
    if (!t) return undefined;
    tapetes.delete(k);
    for (const c of celulasDoTapete(t.x, t.y, t.z, t.d)) celulas.delete(chave(c.x, c.y, c.z));
    versao++;
    return t;
  }
  function por(t: Tapete): boolean {
    if (tapetes.size >= MAX_TAPETES) return false;
    const cs = celulasDoTapete(t.x, t.y, t.z, t.d);
    if (cs.some((c) => celulas.has(chave(c.x, c.y, c.z)))) return false;
    const k = chave(t.x, t.y, t.z);
    const novo: Tapete = { x: t.x, y: t.y, z: t.z, d: t.d & 3, dono: t.dono };
    tapetes.set(k, novo);
    for (const c of cs) celulas.set(chave(c.x, c.y, c.z), k);
    versao++;
    return true;
  }
  return {
    em(x, y, z) {
      const k = celulas.get(chave(x, y, z));
      return k === undefined ? undefined : tapetes.get(k);
    },
    por,
    tirar,
    impor(t) {
      for (const c of celulasDoTapete(t.x, t.y, t.z, t.d)) {
        const k = celulas.get(chave(c.x, c.y, c.z));
        const o = k === undefined ? undefined : tapetes.get(k);
        if (o) tirar(o.x, o.y, o.z);
      }
      por(t);
    },
    todos: () => [...tapetes.values()].map((t) => ({ ...t })),
    get tamanho() {
      return tapetes.size;
    },
    get versao() {
      return versao;
    },
    trocar(lista) {
      tapetes.clear();
      celulas.clear();
      versao++;
      for (const t of lista) por(t);
    },
    salvar: () => [...tapetes.values()].map((t) => [t.x, t.y, t.z, t.d, t.dono]),
  };
}

/** Por que o tapete não entra: não cabe ali, ou a proteção (o aviso de criança). */
export type RecusaTapete = { motivo: 'lugar' } | { protecao: RecusaProtecao };

/**
 * Pôr o tapete com a âncora em (x, y, z), olhando para `d`: null pode. Cada célula dentro do
 * mundo, livre (ar ou planta baixa; nada de água), com chão sólido embaixo, sem outro tapete e
 * com a proteção de colocar.
 */
export function recusaPorTapete(
  m: MundoDaRegra,
  camada: Pick<CamadaTapetes, 'em'>,
  quem: string,
  x: number,
  y: number,
  z: number,
  d: number,
  bloco: number,
  altura = 128,
): RecusaTapete | null {
  const cs = celulasDoTapete(x, y, z, d);
  for (const c of cs) {
    if (c.y < 1 || c.y >= altura) return { motivo: 'lugar' };
    const b = m.bloco(c.x, c.y, c.z);
    if (!substituivel(b) || obterBloco(b)?.liquido) return { motivo: 'lugar' };
    if (!blocoApoia(m.bloco(c.x, c.y - 1, c.z))) return { motivo: 'lugar' };
    if (camada.em(c.x, c.y, c.z)) return { motivo: 'lugar' };
  }
  for (const c of cs) {
    const r = recusaColocar(m, quem, c.x, c.y, c.z, bloco);
    if (r) return { protecao: r };
  }
  return null;
}

/**
 * Tirar o tapete que cobre (x, y, z): o tapete, se pode; 'nada' se não há tapete ali ou há
 * alguma coisa em cima (aí quem quebra é ela); senão, a recusa da proteção. `donoDe` diz o id de
 * quem pôs (null: o dono do mundo não é conhecido).
 */
export function tapeteParaTirar(
  m: MundoDaRegra,
  camada: Pick<CamadaTapetes, 'em'>,
  quem: string,
  c: Celula,
  donoDe: (t: Tapete) => string | null,
): Tapete | 'nada' | { protecao: RecusaProtecao } {
  const t = camada.em(c.x, c.y, c.z);
  const b = m.bloco(c.x, c.y, c.z);
  if (!t || (b !== 0 && !obterBloco(b)?.liquido)) return 'nada';
  const dono = donoDe(t);
  if (podeMexer(quem, dono, m.donoDoMundo)) return t;
  const apelido = dono ? m.apelido(dono) : undefined;
  return { protecao: apelido ? { motivo: 'amigo', dono: apelido } : { motivo: 'amigo' } };
}

/**
 * Mexer no chão (x, y, z) embaixo de um tapete: null pode; senão, o aviso "amigo". O chão do
 * tapete de quem a criança não pode mexer fica protegido (sem isso, quebrar o chão tirava o
 * tapete da amiga e ele caía aos pés de quem quebrou).
 */
export function recusaChaoDoTapete(
  m: MundoDaRegra,
  camada: Pick<CamadaTapetes, 'em'>,
  quem: string,
  x: number,
  y: number,
  z: number,
  donoDe: (t: Tapete) => string | null,
): RecusaProtecao | null {
  const t = camada.em(x, y + 1, z);
  if (!t) return null;
  const dono = donoDe(t);
  if (podeMexer(quem, dono, m.donoDoMundo)) return null;
  const apelido = dono ? m.apelido(dono) : undefined;
  return apelido ? { motivo: 'amigo', dono: apelido } : { motivo: 'amigo' };
}

/** As células de um tapete que ficaram sem chão firme embaixo. */
export function tapeteSemApoio(m: Pick<MundoDaRegra, 'bloco'>, t: Tapete): boolean {
  return celulasDoTapete(t.x, t.y, t.z, t.d).some((c) => !blocoApoia(m.bloco(c.x, c.y - 1, c.z)));
}

const inteiro = (v: unknown, min: number, max: number): v is number =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

/**
 * Os tapetes salvos passados a limpo: [x, y, z, d, dono] dentro do mundo, o dono dentro da
 * tabela (fora dela, o dono do mundo), no máximo MAX_TAPETES. O que não serve sai.
 */
export function sanearTapetes(v: unknown, xzMax: number, donos: number): TapeteSalvo[] {
  if (!Array.isArray(v)) return [];
  const out: TapeteSalvo[] = [];
  for (const e of v.slice(0, MAX_TAPETES)) {
    if (!Array.isArray(e) || e.length !== 5) continue;
    const [x, y, z, d, dono] = e as unknown[];
    if (!inteiro(x, -xzMax, xzMax) || !inteiro(z, -xzMax, xzMax) || !inteiro(y, 1, 127)) continue;
    if (!inteiro(d, 0, 3) || !inteiro(dono, 0, 4095)) continue;
    out.push([x, y, z, d, dono > donos ? 0 : dono]);
  }
  return out;
}

/** A lista do salvamento como tapetes. */
export function tapetesDoSalvo(lista: readonly TapeteSalvo[]): Tapete[] {
  return lista.map(([x, y, z, d, dono]) => ({ x, y, z, d, dono }));
}
