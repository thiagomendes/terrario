/**
 * Canteiro de obras da Cidade Grande (spec 014, T05): as seis plantas das obras, o que a
 * geração pinta em cada lote de canteiro e o estado do mundo que a geração lê (as obras já
 * feitas). Puro e determinístico, como o planejador: o núcleo (servidor na nuvem e modo
 * local), a cena e o trabalhador da malha acham as mesmas células.
 *
 * O lote do canteiro tem 8 × 9 (coordenadas do lote: `s` de lado, `f` da rua para o fundo,
 * `y` a partir da primeira célula acima da calçada). O tapume ocupa a borda (com a entrada
 * aberta em f = 0, s = 3 e 4); a obra fica no miolo (s de 1 a 6, f de 1 a 7).
 *
 * Situação de cada canteiro (só das obras feitas, então igual em todo lugar):
 * - 'feita': a obra é parte da cidade (pintada pela geração, sem tapume nem andaime);
 * - 'aberta': as duas primeiras não feitas, na ordem das plantas: tapume, placa e andaime;
 *   as células da planta são de obra (só aceitam o bloco da planta);
 * - 'fechada': as outras, só com o tapume e a placa (a obra espera a vez).
 */
import { Bloco } from './blocks';
import {
  NADA,
  SEM_DIR,
  indicePlanta,
  pintarCamadas,
  plantaVazia,
  type Camada,
  type Legenda,
  type ParametrosPredio,
  type Planta,
} from './plantas/formato';
import type { LoteCidade, PlanoCidade } from './cidade';

/** Quantas obras a cidade tem, e quantas ficam abertas ao mesmo tempo. */
export const NUM_OBRAS = 6;
export const OBRAS_ABERTAS = 2;
/** Miolo do canteiro (coordenadas do lote, inclusivo) e a altura das células de obra. */
export const MIOLO_CANTEIRO = { s0: 1, f0: 1, s1: 6, f1: 7 } as const;
export const ALTURA_OBRA = 6;
/**
 * Onde o pedreiro fica no canteiro aberto (célula do lote): na calçada, do lado de fora do
 * tapume, ao lado da entrada (esboço da 030: lá dentro ele ficava na frente dos blocos azuis e
 * o toque da criança abria as trocas dele).
 */
export const POSTO_PEDREIRO: readonly [number, number] = [6, -1];
/** Desenho da placa do canteiro (o tijolo) e da obra feita (a casinha). */
export const PLACA_CANTEIRO = 3;

export type SituacaoCanteiro = 'feita' | 'aberta' | 'fechada';

/** Uma obra: a planta (só os blocos da obra), onde fica no lote, o andaime e a "vida". */
export interface DefObra {
  n: number;
  id: string;
  nome: string;
  /** Canto da planta no lote. */
  s0: number;
  f0: number;
  planta: Planta;
  /** Andaime (só com a obra aberta): s, f, y do lote e o bloco. */
  andaime: readonly (readonly [number, number, number, number])[];
  /** O que a obra feita ganha ("a obra ganha vida"): s, f, y do lote, bloco e direção local. */
  vida: readonly (readonly [number, number, number, number, number?])[];
}

/** Célula de uma obra, nas coordenadas do lote (a ordem é a da obra: de baixo para cima). */
export interface CelulaObra {
  /** Índice na lista da obra. */
  i: number;
  s: number;
  f: number;
  y: number;
  bloco: number;
  /** Direção local (SEM_DIR: sem direção). */
  d: number;
}

const PARAMS: ParametrosPredio = {
  andares: 1,
  corPorta: 0,
  corToldo: 'vermelho',
  espelho: false,
  caixaDagua: false,
  loja: false,
  luzes: 0,
};

/** Letras das plantas das obras (o ponto é o vão de dentro: fica vazio). */
const LEGENDA: Legenda = {
  '.': { b: Bloco.AR },
  T: { b: Bloco.TABUAS },
  B: { b: Bloco.TABUAS_BETULA },
  R: { b: Bloco.TIJOLOS },
  V: { b: Bloco.VIDRO },
  L: { b: Bloco.LAJE },
  C: { b: Bloco.CERCA },
  P: { b: Bloco.PORTA, d: 2 },
  E: { b: Bloco.ESCADA, d: 0 },
  r: { b: Bloco.TOLDO_VERMELHO },
  g: { b: Bloco.TOLDO_VERDE },
};

function obra(
  n: number,
  id: string,
  nome: string,
  [s0, f0]: [number, number],
  [largura, profundidade]: [number, number],
  camadas: readonly Camada[],
  andaime: DefObra['andaime'],
  vida: DefObra['vida'],
): DefObra {
  const planta = plantaVazia(`obra-${id}`, largura, profundidade, camadas.length, PARAMS);
  pintarCamadas(planta, 0, camadas, LEGENDA);
  return { n, id, nome, s0, f0, planta, andaime, vida };
}

/** Plataforma de tábuas do andaime ao longo de `s` (de f0 a f1), com os dois postes. */
function andaimeLateral(s: number, f0: number, f1: number): DefObra['andaime'] {
  const r: [number, number, number, number][] = [];
  for (let f = f0; f <= f1; f++) r.push([s, f, 0, Bloco.TABUAS]);
  for (const f of [f0, f1]) for (const y of [1, 2]) r.push([s, f, y, Bloco.CERCA]);
  return r;
}

/**
 * As seis obras, da mais fácil para a maior (a tabela da spec). Cada camada é uma lista de
 * fileiras `f` (da frente, que olha para a rua, para o fundo), uma letra por `s`.
 */
export const OBRAS: readonly DefObra[] = [
  obra(
    1,
    'casinha-cachorro',
    'Casinha do cachorro',
    [2, 3],
    [3, 3],
    [
      ['T.T', 'T.T', 'TTT'],
      ['T.T', 'T.T', 'TTT'],
      ['RRR', 'RRR', 'RRR'],
    ],
    andaimeLateral(6, 3, 5),
    [],
  ),
  obra(
    2,
    'banca-frutas',
    'Banca de frutas',
    [2, 4],
    [3, 2],
    [
      ['TTT', 'TTT'],
      ['C.C', 'C.C'],
      ['rgr', 'grg'],
    ],
    andaimeLateral(6, 3, 6),
    // frutas no balcão: abóboras e um cestinho de frutinhas
    [
      [3, 4, 1, Bloco.ABOBORA],
      [3, 5, 1, Bloco.ABOBORA],
    ],
  ),
  obra(
    3,
    'ponto-onibus',
    'Ponto de ônibus',
    [2, 4],
    [4, 2],
    [
      ['....', 'CEEC'],
      ['....', 'CVVC'],
      ['....', 'CVVC'],
      ['LLLL', 'LLLL'],
    ],
    andaimeLateral(6, 3, 6),
    // a placa do ponto (desenho da casinha) num poste na frente
    [
      [5, 3, 0, Bloco.GRADE_FERRO],
      [5, 3, 1, Bloco.PLACA, 2],
    ],
  ),
  obra(
    4,
    'sorveteria',
    'Sorveteria',
    [2, 2],
    [4, 5],
    [
      ['BPBB', 'B..B', 'B..B', 'B..B', 'BBBB'],
      ['VPVB', 'B..V', 'B..B', 'B..V', 'BBBB'],
      ['rgrg', 'grgr', 'rgrg', 'grgr', 'rgrg'],
    ],
    andaimeLateral(6, 2, 6),
    // acende: a lanterna de dentro e a placa do sorvete em cima da porta
    [
      [4, 5, 0, Bloco.LANTERNA],
      [3, 2, 3, Bloco.PLACA, 2 | (4 << 2)],
    ],
  ),
  obra(
    5,
    'casinha',
    'Casinha',
    [1, 2],
    [5, 5],
    [
      ['RRPRR', 'R...R', 'R...R', 'R...R', 'RRRRR'],
      ['RVPVR', 'R...R', 'V...V', 'R...R', 'RRRRR'],
      ['RRRRR', 'R...R', 'R...R', 'R...R', 'RRRRR'],
      ['TTTTT', 'T...T', 'T...T', 'T...T', 'TTTTT'],
      ['.....', '.TTT.', '.TTT.', '.TTT.', '.....'],
    ],
    andaimeLateral(6, 2, 6),
    // a luz de dentro (acende à noite como toda lanterna)
    [[2, 5, 0, Bloco.LANTERNA]],
  ),
  obra(
    6,
    'coreto',
    'Coreto da praça',
    [1, 2],
    [6, 6],
    [
      ['C....C', 'C....C', 'C....C', 'C....C', 'C....C', 'CCCCCC'],
      ['C....C', '......', '......', '......', '......', 'C....C'],
      ['C....C', '......', '......', '......', '......', 'C....C'],
      ['C....C', '......', '......', '......', '......', 'C....C'],
      ['rgrgrg', 'grgrgr', 'rgrgrg', 'grgrgr', 'rgrgrg', 'grgrgr'],
    ],
    [
      [5, 1, 0, Bloco.TABUAS],
      [6, 1, 0, Bloco.TABUAS],
      [6, 1, 1, Bloco.CERCA],
    ],
    // um lampião no meio do coreto
    [[3, 4, 3, Bloco.LANTERNA]],
  ),
];

export function obraDoCanteiro(n: number): DefObra | undefined {
  return OBRAS[n - 1];
}

const celulasGuardadas = new Map<number, CelulaObra[]>();
/** As células da obra (blocos da planta, sem o vão), de baixo para cima. */
export function celulasDaObra(def: DefObra): readonly CelulaObra[] {
  let r = celulasGuardadas.get(def.n);
  if (r) return r;
  r = [];
  const p = def.planta;
  for (let y = 0; y < p.altura; y++)
    for (let f = 0; f < p.profundidade; f++)
      for (let s = 0; s < p.largura; s++) {
        const i = indicePlanta(p, s, f, y);
        const b = p.blocos[i];
        if (b === NADA || b === Bloco.AR) continue;
        r.push({ i: r.length, s: def.s0 + s, f: def.f0 + f, y, bloco: b, d: p.metas[i] });
      }
  celulasGuardadas.set(def.n, r);
  return r;
}

/** O bloco na célula conta como o da planta? (a porta aberta é a mesma porta) */
export function mesmoBlocoDaObra(atual: number, planta: number): boolean {
  if (atual === planta) return true;
  if (planta === Bloco.PORTA) return atual === Bloco.PORTA_ABERTA;
  return false;
}

// ------------------------------------------------------------------ o estado do mundo

let feitas: ReadonlySet<number> = new Set();
let versao = 0;

/**
 * As obras já feitas neste mundo (a geração pinta cada uma como parte da cidade). O núcleo
 * define ao abrir o mundo e quando uma obra termina; o servidor da nuvem põe de volta ao
 * trocar de sala, a cena e os trabalhadores da malha recebem o mesmo.
 */
export function definirObrasFeitas(ids: readonly number[]): void {
  const novas = new Set(ids.filter((n) => Number.isInteger(n) && n >= 1 && n <= NUM_OBRAS));
  if (novas.size === feitas.size && [...novas].every((n) => feitas.has(n))) return;
  feitas = novas;
  versao++;
}

/** As obras feitas (em ordem). */
export function obrasFeitas(): number[] {
  return [...feitas].sort((a, b) => a - b);
}

/** Muda sempre que as obras feitas mudam (para as memórias da geração e da proteção). */
export function versaoDasObras(): number {
  return versao;
}

/** Os canteiros abertos: os primeiros não feitos, na ordem das plantas. */
export function canteirosAbertos(f: ReadonlySet<number> = feitas): number[] {
  const r: number[] = [];
  for (let n = 1; n <= NUM_OBRAS && r.length < OBRAS_ABERTAS; n++) if (!f.has(n)) r.push(n);
  return r;
}

export function situacaoDoCanteiro(n: number): SituacaoCanteiro {
  if (feitas.has(n)) return 'feita';
  return canteirosAbertos().includes(n) ? 'aberta' : 'fechada';
}

// ------------------------------------------------------------------ no mundo

/** Célula (s, f) do lote no mundo (a mesma conta de `noLoteCidade`). */
export function noLoteObra(l: LoteCidade, s: number, f: number): [number, number] {
  return l.porta === 'n'
    ? [l.x0 + s, l.z0 + f]
    : [l.x0 + l.largura - 1 - s, l.z0 + l.profundidade - 1 - f];
}

/** Direção local para a do mundo (os bits de cima, o desenho da placa, passam iguais). */
export function dirObraNoMundo(l: LoteCidade, d: number): number {
  return l.porta === 'n' ? d : (d & ~3) | ((d + 2) & 3);
}

/** Uma célula planejada no mundo: de qual canteiro, o índice na obra, o bloco e o meta. */
export interface CelulaPlanejada {
  canteiro: number;
  i: number;
  x: number;
  y: number;
  z: number;
  bloco: number;
  meta: number;
  /** Camada da obra (0 é a de baixo). */
  camada: number;
}

interface ObrasDaCidade {
  porCanteiro: Map<number, CelulaPlanejada[]>;
  porCelula: Map<string, CelulaPlanejada>;
  lotes: Map<number, LoteCidade>;
}
const doPlano = new WeakMap<PlanoCidade, ObrasDaCidade>();

function obrasDaCidade(p: PlanoCidade): ObrasDaCidade {
  let o = doPlano.get(p);
  if (o) return o;
  o = { porCanteiro: new Map(), porCelula: new Map(), lotes: new Map() };
  const Y = p.h + 1;
  for (const l of p.lotes) {
    if (l.uso !== 'canteiro' || !l.canteiro) continue;
    const def = obraDoCanteiro(l.canteiro);
    if (!def) continue;
    o.lotes.set(l.canteiro, l);
    const lista: CelulaPlanejada[] = celulasDaObra(def).map((c) => {
      const [x, z] = noLoteObra(l, c.s, c.f);
      return {
        canteiro: def.n,
        i: c.i,
        x,
        y: Y + c.y,
        z,
        bloco: c.bloco,
        meta: c.d === SEM_DIR ? 0 : dirObraNoMundo(l, c.d),
        camada: c.y,
      };
    });
    o.porCanteiro.set(def.n, lista);
    for (const c of lista) o.porCelula.set(`${c.x},${c.y},${c.z}`, c);
  }
  doPlano.set(p, o);
  return o;
}

/** As células planejadas da obra do canteiro `n` (vazio se a cidade não tiver). */
export function celulasPlanejadas(p: PlanoCidade, n: number): readonly CelulaPlanejada[] {
  return obrasDaCidade(p).porCanteiro.get(n) ?? [];
}

/** A célula é de alguma obra (aberta, fechada ou feita)? */
export function planejadoNaCidade(
  p: PlanoCidade,
  x: number,
  y: number,
  z: number,
): CelulaPlanejada | null {
  return obrasDaCidade(p).porCelula.get(`${x},${y},${z}`) ?? null;
}

export function loteDoCanteiro(p: PlanoCidade, n: number): LoteCidade | undefined {
  return obrasDaCidade(p).lotes.get(n);
}

/** Onde o pedreiro fica no canteiro `n` (centro da célula, os pés em cima da calçada). */
export function postoDoPedreiro(p: PlanoCidade, n: number): [number, number, number] | null {
  const l = loteDoCanteiro(p, n);
  if (!l) return null;
  const [x, z] = noLoteObra(l, POSTO_PEDREIRO[0], POSTO_PEDREIRO[1]);
  return [x + 0.5, p.h + 1, z + 0.5];
}

/** Centro da obra no mundo (para distâncias: festa, fantasmas, barra de progresso). */
export function centroDaObra(p: PlanoCidade, n: number): [number, number, number] | null {
  const l = loteDoCanteiro(p, n);
  const def = obraDoCanteiro(n);
  if (!l || !def) return null;
  const [x, z] = noLoteObra(
    l,
    def.s0 + (def.planta.largura - 1) / 2,
    def.f0 + (def.planta.profundidade - 1) / 2,
  );
  return [x + 0.5, p.h + 1 + def.planta.altura / 2, z + 0.5];
}

/** O canteiro (não feito) cujo miolo tem a célula, ou null (a célula é de obra). */
export function canteiroDoMiolo(p: PlanoCidade, x: number, y: number, z: number): number | null {
  const dy = y - (p.h + 1);
  if (dy < 0 || dy >= ALTURA_OBRA) return null;
  for (const [n, l] of obrasDaCidade(p).lotes) {
    if (x < l.x0 || x >= l.x0 + l.largura || z < l.z0 || z >= l.z0 + l.profundidade) continue;
    const s = l.porta === 'n' ? x - l.x0 : l.x0 + l.largura - 1 - x;
    const f = l.porta === 'n' ? z - l.z0 : l.z0 + l.profundidade - 1 - z;
    const m = MIOLO_CANTEIRO;
    if (s >= m.s0 && s <= m.s1 && f >= m.f0 && f <= m.f1) return n;
    return null;
  }
  return null;
}

/** Chunks que o lote do canteiro alcança (com a borda de 1: a luz e a malha dos vizinhos). */
export function chunksDoCanteiro(p: PlanoCidade, n: number): [number, number][] {
  const l = loteDoCanteiro(p, n);
  if (!l) return [];
  const r: [number, number][] = [];
  const cx0 = Math.floor(l.x0 / 16);
  const cx1 = Math.floor((l.x0 + l.largura - 1) / 16);
  const cz0 = Math.floor(l.z0 / 16);
  const cz1 = Math.floor((l.z0 + l.profundidade - 1) / 16);
  for (let cx = cx0; cx <= cx1; cx++) for (let cz = cz0; cz <= cz1; cz++) r.push([cx, cz]);
  return r;
}

// ------------------------------------------------------------------ geração

/** Pincel do lote (s, f, y, bloco, direção local), como o do planejador. */
export type PincelLote = (s: number, f: number, y: number, id: number, d?: number) => void;

/**
 * Pinta o canteiro: aberto ou fechado, o tapume (com a entrada), a placa da obra e, se
 * aberto, o andaime; feito, a obra inteira com a vida dela, a placa num poste e nada de
 * tapume nem andaime.
 */
export function pintarCanteiro(l: LoteCidade, q: PincelLote, situacao: SituacaoCanteiro): void {
  const W = l.largura;
  const D = l.profundidade;
  const def = l.canteiro ? obraDoCanteiro(l.canteiro) : undefined;
  if (situacao === 'feita' && def) {
    for (const c of celulasDaObra(def))
      q(c.s, c.f, c.y, c.bloco, c.d === SEM_DIR ? undefined : c.d);
    for (const [s, f, y, b, d] of def.vida) q(s, f, y, b, d);
    // a placa da obra feita (casinha) fica num poste de grade
    q(5, 0, 0, Bloco.GRADE_FERRO);
    q(5, 0, 1, Bloco.PLACA, 2);
    return;
  }
  for (let s = 0; s < W; s++)
    for (let f = 0; f < D; f++) {
      const borda = s === 0 || s === W - 1 || f === 0 || f === D - 1;
      if (!borda) continue;
      if (f === 0 && (s === 3 || s === 4)) continue;
      q(s, f, 0, Bloco.TAPUME);
    }
  // placa da obra (desenho do tijolo) junto da entrada, de frente para a rua
  q(5, 0, 1, Bloco.PLACA, 2 | (PLACA_CANTEIRO << 2));
  if (situacao === 'aberta' && def) for (const [s, f, y, b] of def.andaime) q(s, f, y, b);
}
