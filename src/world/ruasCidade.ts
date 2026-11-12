/**
 * Caminhos a pé da Cidade Grande (spec 014, T08): por onde os moradores andam. Puro e
 * determinístico (o núcleo, no servidor e no aparelho, acha os mesmos caminhos).
 *
 * A rede é a das calçadas: as linhas do meio-fio de dentro das calçadas (nas avenidas, a
 * coluna junto dos lotes, longe dos postes e das árvores do meio-fio; nas ruas, a calçada de
 * 1) e as travessias pelas faixas de pedestre, que ficam exatamente nessas linhas. O miolo do
 * parque fica de fora (o lago, as árvores e o metrô), e a vaga do sorvete, na beira do
 * parque, é contornada pela calçadinha dela. Os moradores atravessam sempre na faixa.
 */
import { noLoteCidade, plantaDoLote, type LoteCidade, type PlanoCidade } from './cidade';
import { AVENIDAS, LARG_AVENIDA, LARG_RUA, PASSO_AVENIDA, PASSO_RUA, RUAS } from './cidade';

type P2 = [number, number];
type P3 = [number, number, number];

interface Rede {
  nos: P2[];
  /** Vizinhos de cada nó: [nó, comprimento]. */
  viz: [number, number][][];
  /** Trechos (pares de nós) para projetar um ponto qualquer. */
  trechos: [number, number][];
}

const redes = new WeakMap<PlanoCidade, Rede>();

function dentroDoParque(p: PlanoCidade, x: number, z: number): boolean {
  return x > p.parque.x0 && x < p.parque.x1 + 1 && z > p.parque.z0 && z < p.parque.z1 + 1;
}

function rede(p: PlanoCidade): Rede {
  const pronta = redes.get(p);
  if (pronta) return pronta;
  const xs: number[] = [];
  for (let i = 0; i < AVENIDAS; i++)
    xs.push(p.ox + PASSO_AVENIDA * i + 0.5, p.ox + PASSO_AVENIDA * i + LARG_AVENIDA - 0.5);
  const zs: number[] = [];
  for (let j = 0; j < RUAS; j++)
    zs.push(p.oz + PASSO_RUA * j + 0.5, p.oz + PASSO_RUA * j + LARG_RUA - 0.5);
  const nos: P2[] = [];
  const id = new Map<string, number>();
  for (const z of zs)
    for (const x of xs) {
      if (dentroDoParque(p, x, z)) continue;
      id.set(`${x},${z}`, nos.length);
      nos.push([x, z]);
    }
  const viz: [number, number][][] = nos.map(() => []);
  const trechos: [number, number][] = [];
  const ligar = (a: number | undefined, b: number | undefined) => {
    if (a === undefined || b === undefined) return;
    const [ax, az] = nos[a];
    const [bx, bz] = nos[b];
    if (dentroDoParque(p, (ax + bx) / 2, (az + bz) / 2)) return;
    const d = Math.hypot(bx - ax, bz - az);
    viz[a].push([b, d]);
    viz[b].push([a, d]);
    trechos.push([a, b]);
  };
  for (const z of zs)
    for (let k = 0; k + 1 < xs.length; k++)
      ligar(id.get(`${xs[k]},${z}`), id.get(`${xs[k + 1]},${z}`));
  for (const x of xs)
    for (let k = 0; k + 1 < zs.length; k++)
      ligar(id.get(`${x},${zs[k]}`), id.get(`${x},${zs[k + 1]}`));
  const r = { nos, viz, trechos };
  redes.set(p, r);
  return r;
}

/** O ponto mais perto da rede: o trecho, a posição nele (0 a 1) e a distância. */
function projetar(r: Rede, x: number, z: number): { t: number; k: number; d: number; q: P2 } {
  let melhor = { t: 0, k: 0, d: Infinity, q: [x, z] as P2 };
  r.trechos.forEach(([a, b], k) => {
    const [ax, az] = r.nos[a];
    const [bx, bz] = r.nos[b];
    const vx = bx - ax;
    const vz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz || 1)));
    const qx = ax + vx * t;
    const qz = az + vz * t;
    const d = Math.hypot(x - qx, z - qz);
    if (d < melhor.d - 1e-9) melhor = { t, k, d, q: [qx, qz] };
  });
  return melhor;
}

/**
 * O caminho pelas calçadas de (de) até (para): começa no ponto da rede mais perto de `de` e
 * acaba no mais perto de `para` (quem chama junta o resto: a saída do lugar e a entrada no
 * destino). Os dois em geral são as frentes de lotes, já em cima da calçada.
 */
export function rotaPelaCidade(p: PlanoCidade, de: P2, para: P2): P2[] {
  const r = rede(p);
  const a = projetar(r, de[0], de[1]);
  const b = projetar(r, para[0], para[1]);
  let pontos: P2[];
  if (a.k === b.k) pontos = [a.q, b.q];
  else {
    // Dijkstra com dois nós a mais (o começo e o fim, nos trechos deles)
    const n = r.nos.length;
    const INICIO = n;
    const FIM = n + 1;
    const extra = (no: number, pr: typeof a): [number, number][] => {
      const [u, v] = r.trechos[pr.k];
      void no;
      return [
        [u, Math.hypot(r.nos[u][0] - pr.q[0], r.nos[u][1] - pr.q[1])],
        [v, Math.hypot(r.nos[v][0] - pr.q[0], r.nos[v][1] - pr.q[1])],
      ];
    };
    const deInicio = extra(INICIO, a);
    const paraFim = new Map(extra(FIM, b));
    const dist = new Float64Array(n + 2).fill(Infinity);
    const ant = new Int32Array(n + 2).fill(-1);
    const feito = new Uint8Array(n + 2);
    dist[INICIO] = 0;
    for (;;) {
      let u = -1;
      for (let i = 0; i < n + 2; i++)
        if (!feito[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0 || u === FIM) break;
      feito[u] = 1;
      const lista: [number, number][] =
        u === INICIO
          ? deInicio
          : [...r.viz[u], ...(paraFim.has(u) ? [[FIM, paraFim.get(u)!] as [number, number]] : [])];
      for (const [v, w] of lista) {
        const nd = dist[u] + w;
        if (nd < dist[v] - 1e-9) {
          dist[v] = nd;
          ant[v] = u;
        }
      }
    }
    const ids: number[] = [];
    for (let v = FIM; v >= 0; v = ant[v]) {
      ids.push(v);
      if (v === INICIO) break;
    }
    ids.reverse();
    pontos = ids.map((v) => (v === INICIO ? a.q : v === FIM ? b.q : r.nos[v]));
  }
  return contornarVaga(p, semRepetidos(pontos));
}

function semRepetidos(pts: P2[]): P2[] {
  return pts.filter(
    (q, k) => k === 0 || Math.hypot(q[0] - pts[k - 1][0], q[1] - pts[k - 1][1]) > 0.05,
  );
}

/**
 * A vaga do sorvete corta a calçada da beira do parque: quem passa por ela dá a volta pela
 * calçadinha que a contorna (o carrinho de sorvete estaciona ali).
 */
function contornarVaga(p: PlanoCidade, pts: P2[]): P2[] {
  const v = p.vaga;
  const linha = v.z0 + 0.5;
  const fora = v.z1 + 1.5;
  const x0 = v.x0 - 0.5;
  const x1 = v.x1 + 1.5;
  const r: P2[] = [];
  for (let k = 0; k < pts.length; k++) {
    r.push(pts[k]);
    const q = pts[k + 1];
    if (!q) break;
    const a = pts[k];
    if (Math.abs(a[1] - linha) > 0.01 || Math.abs(q[1] - linha) > 0.01) continue;
    const lo = Math.min(a[0], q[0]);
    const hi = Math.max(a[0], q[0]);
    if (hi < x0 || lo > x1) continue;
    const ida = q[0] > a[0];
    const [e, s] = ida ? [x0, x1] : [x1, x0];
    if (Math.min(a[0], q[0]) < x0 && Math.max(a[0], q[0]) > x1)
      r.push([e, linha], [e, fora], [s, fora], [s, linha]);
  }
  return semRepetidos(r);
}

// ------------------------------------------------------------------ lugares

/** Um lugar da cidade a pé: a frente dele na calçada e os passos dali até o ponto de ficar. */
export interface LugarCidade {
  /** Na calçada, na frente do lote. */
  frente: P2;
  /** Da frente até o lugar (o último ponto é onde o morador fica); com a altura dos pés. */
  passos: P3[];
}

/** Centro da célula (s, f) do lote, com a altura dos pés `y`. */
function celula(l: LoteCidade, s: number, f: number, y: number): P3 {
  const [x, z] = noLoteCidade(l, s, f);
  return [x + 0.5, y, z + 0.5];
}

/**
 * A porta de casa do morador (térreo do prédio): `fora` é a célula na frente da porta (no
 * alto da escadinha da casa geminada), `dentro` o miolo do apartamento de baixo.
 */
export function portaDeCasa(
  p: PlanoCidade,
  l: LoteCidade,
): { lugar: LugarCidade; fora: P3; dentro: P3 } | null {
  const pl = plantaDoLote(l);
  if (!pl) return null;
  const Y = p.h + 1;
  const y0 = Y - 1 - pl.chao;
  const [s, f, y] = pl.porta;
  const pes = y0 + y;
  const fora = celula(l, s, f - 1, pes);
  const c = pl.comodos.find((k) => k.andar === 0) ?? pl.comodos[0];
  const dentro = c
    ? celula(l, Math.floor((c.s0 + c.s1) / 2), Math.floor((c.f0 + c.f1) / 2), y0 + c.pes)
    : celula(l, s, f + 1, pes);
  const fr = celula(l, s, -1, Y);
  const passos: P3[] = [];
  for (let k = 0; k < f - 1; k++) passos.push(celula(l, s, k, Y + Math.min(k + 1, pes - Y)));
  passos.push(fora);
  return { lugar: { frente: [fr[0], fr[2]], passos }, fora, dentro };
}

/** A frente da loja (na célula da porta para fora, debaixo do toldo). */
export function frenteDaLoja(p: PlanoCidade, l: LoteCidade): LugarCidade | null {
  const pl = plantaDoLote(l);
  if (!pl) return null;
  const Y = p.h + 1;
  const y0 = Y - 1 - pl.chao;
  const [s, f, y] = pl.porta;
  const fr = celula(l, s, -1, Y);
  const passos: P3[] = [];
  for (let k = 0; k < f; k++) passos.push(celula(l, s, k, y0 + y));
  if (passos.length === 0) passos.push(fr);
  return { frente: [fr[0], fr[2]], passos };
}

/** Pontos da praça pequena onde os moradores param (na frente da fonte, longe dos bancos). */
const PONTOS_PRACA: readonly P2[] = [
  [2, 1],
  [5, 1],
  [6, 1],
  [1, 2],
  [1, 3],
  [1, 5],
  [1, 6],
];

/** A praça do nascimento: a entrada (sem os bancos e as flores), os pontos e o centro da fonte. */
export function lugaresDaPraca(
  p: PlanoCidade,
  l: LoteCidade,
): { lugares: LugarCidade[]; centro: P2 } {
  const Y = p.h + 1;
  const fr = celula(l, 1, -1, Y);
  const frente: P2 = [fr[0], fr[2]];
  const entrada = [celula(l, 1, 0, Y), celula(l, 1, 1, Y)];
  const lugares = PONTOS_PRACA.map(([s, f]) => ({
    frente,
    passos: [...entrada, celula(l, s, f, Y)],
  }));
  const a = celula(l, 2, 2, Y);
  const b = celula(l, 5, 5, Y);
  return { lugares, centro: [(a[0] + b[0]) / 2, (a[2] + b[2]) / 2] };
}

/**
 * O caminho inteiro de um lugar a outro: sai do lugar de agora pelos passos ao contrário,
 * vai pelas calçadas e entra no destino pelos passos dele. Sem o lugar de agora (acabou de
 * aparecer, foi posto no lugar pelo anti-trava), parte de onde está.
 */
export function caminhoNaCidade(
  p: PlanoCidade,
  de: LugarCidade | null,
  aqui: P2,
  para: LugarCidade,
): P3[] {
  const Y = p.h + 1;
  const r: P3[] = [];
  if (de) for (let k = de.passos.length - 2; k >= 0; k--) r.push(de.passos[k]);
  const inicio: P2 = de ? de.frente : aqui;
  if (de) r.push([de.frente[0], Y, de.frente[1]]);
  for (const [x, z] of rotaPelaCidade(p, inicio, para.frente)) r.push([x, Y, z]);
  r.push([para.frente[0], Y, para.frente[1]], ...para.passos);
  return r.filter((q, k) => k === 0 || Math.hypot(q[0] - r[k - 1][0], q[2] - r[k - 1][2]) > 0.05);
}

// ------------------------------------------------------------------ o roteiro do morador

/**
 * O dia de um morador da cidade (spec 014, T08): a casa (um apartamento de baixo de uma casa
 * geminada), a loja onde trabalha e os pontos da praça. `rota` dá o caminho a pé entre dois
 * lugares (o de agora pode faltar: parte de onde está).
 */
export interface RoteiroCidade {
  casa: LugarCidade;
  fora: P3;
  dentro: P3;
  loja: LugarCidade;
  pracas: LugarCidade[];
  centro: P2;
  rota(de: LugarCidade | null, aqui: P2, para: LugarCidade): P3[];
}

export function roteiroDoMorador(
  p: PlanoCidade,
  mo: { casa: number; oficina: number },
): RoteiroCidade | null {
  const casa = p.lotes[mo.casa];
  const loja = p.lotes[mo.oficina];
  const praca = p.lotes.find((l) => l.uso === 'praca');
  if (!casa || !loja || !praca) return null;
  const porta = portaDeCasa(p, casa);
  const frente = frenteDaLoja(p, loja);
  if (!porta || !frente) return null;
  const { lugares, centro } = lugaresDaPraca(p, praca);
  return {
    casa: porta.lugar,
    fora: porta.fora,
    dentro: porta.dentro,
    loja: frente,
    pracas: lugares,
    centro,
    rota: (de, aqui, para) => caminhoNaCidade(p, de, aqui, para),
  };
}
