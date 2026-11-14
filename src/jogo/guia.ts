/**
 * Spec 030 "Guia da missão", a parte pura (sem cena, sem tela): aonde a missão leva
 * (`alvoDaMissao`, na Cidade Grande e no sítio do Rancho), a trilha que sempre nasce nos pés
 * da criança, o alisamento da busca a pé da 021 no sítio (sem zigue-zague, sem pisar na roça,
 * sem raspar na cerca), as pegadinhas, a ondinha que corre dos pés para a frente e o relógio
 * do convite (~2 min brincando sem missão).
 */
import type { Missao } from './alma';
import type { V3 } from './caminho';
import { lavouraDoBloco, madura } from './plantio';
import { Bloco } from '../world/blocks';
import type { LoteCidade, PlanoCidade } from '../world/cidade';
import { frenteDaLoja, rotaPelaCidade, type LugarCidade } from '../world/ruasCidade';
import { loteDoCanteiro, noLoteObra } from '../world/obras';
import { frenteDaPorta, noLote, TAM_LOTE, type Lote, type PlanoPovoado } from '../world/povoado';

// ------------------------------------------------------------------ o alvo
/** Uma caixa no chão (inclusivo em x0/z0, exclusivo em x1/z1). */
export interface CaixaChao {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export interface AlvoGuia {
  /** Quem é (fica igual enquanto o alvo vale): 'canteiro:4', 'padaria', 'lavoura:<sítio>:<lote>'. */
  chave: string;
  tipo: 'obra' | 'lugar' | 'morador' | 'sitio';
  /** Aonde a trilha vai (os pés). */
  x: number;
  y: number;
  z: number;
  /** Onde a placa fica (o pé dela; ela flutua acima). */
  placa: V3;
  /** O desenho da placa (nome da arte, 'obra:n' ou 'passeio'). */
  figura: string;
  /** Na cidade: o lugar a pé (a trilha vai pelas calçadas e atravessa na faixa). */
  lugar?: LugarCidade;
  /** Chegou: dentro da caixa, ou a `raio` blocos do fim da trilha. */
  caixa?: CaixaChao;
  raio?: number;
  /** Morador que anda (c5): o id da criatura. */
  morador?: number;
}

export function chegouAoAlvo(a: AlvoGuia, x: number, z: number): boolean {
  const c = a.caixa;
  if (c && x >= c.x0 && x < c.x1 && z >= c.z0 && z < c.z1) return true;
  return a.raio !== undefined && Math.hypot(x - a.x, z - a.z) <= a.raio;
}

/** Um morador visto pelo aparelho (as criaturas da réplica). */
export interface MoradorVisto {
  id: number;
  profissao?: string;
  x: number;
  y: number;
  z: number;
}

/** O que o resolvedor lê do mundo (o aparelho dá a cópia dele). */
export interface MundoDoGuia {
  /** A Cidade Grande do mundo (null fora dela). */
  cidade: PlanoCidade | null;
  /** Os sítios perto (Rancho), do mais perto ao mais longe. */
  sitios: readonly PlanoPovoado[];
  bloco(x: number, y: number, z: number): number;
  moradores(): readonly MoradorVisto[];
}

const caixaDoLoteCidade = (l: LoteCidade): CaixaChao => ({
  x0: l.x0,
  z0: l.z0,
  x1: l.x0 + l.largura,
  z1: l.z0 + l.profundidade,
});

/** O comprimento de uma linha no chão. */
export function comprimento(pts: readonly (readonly number[])[]): number {
  let d = 0;
  for (let k = 1; k < pts.length; k++)
    d += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][2] - pts[k - 1][2]);
  return d;
}

/** O pé do último passo do lugar (onde a trilha acaba). */
function fimDoLugar(p: PlanoCidade, lugar: LugarCidade): V3 {
  const u = lugar.passos[lugar.passos.length - 1];
  return u ? [u[0], u[1], u[2]] : [lugar.frente[0], p.h + 1, lugar.frente[1]];
}

/** A entrada do canteiro como lugar da cidade (a frente na calçada, um passo para dentro). */
export function lugarDoCanteiro(p: PlanoCidade, l: LoteCidade): LugarCidade {
  const meio = (f: number): [number, number] => {
    const [ax, az] = noLoteObra(l, 3, f);
    const [bx, bz] = noLoteObra(l, 4, f);
    return [(ax + bx) / 2 + 0.5, (az + bz) / 2 + 0.5];
  };
  const fora = meio(-1);
  const dentro = meio(1);
  return { frente: fora, passos: [[dentro[0], p.h + 1, dentro[1]]] };
}

/** Quanto se anda pela calçada de (x, z) até a frente do lugar (a rota dos moradores). */
function andarNaCidade(p: PlanoCidade, de: { x: number; z: number }, lugar: LugarCidade): number {
  const rota = rotaPelaCidade(p, [de.x, de.z], lugar.frente);
  let d = 0;
  let ax = de.x;
  let az = de.z;
  for (const [x, z] of rota) {
    d += Math.hypot(x - ax, z - az);
    ax = x;
    az = z;
  }
  return d + Math.hypot(lugar.frente[0] - ax, lugar.frente[1] - az);
}

/** Até onde a criança chega perto da padeira (ela para e espera). */
export const PERTO_MORADOR = 3;

function alvoNaCidade(
  m: Missao,
  p: PlanoCidade,
  vistos: ReadonlySet<string>,
  de: { x: number; z: number },
  mundo: MundoDoGuia,
): AlvoGuia | null {
  const c = m.conta;
  if (c.tipo === 'obra') {
    const l = loteDoCanteiro(p, c.canteiro);
    if (!l) return null;
    const lugar = lugarDoCanteiro(p, l);
    const [x, y, z] = fimDoLugar(p, lugar);
    return {
      chave: `canteiro:${c.canteiro}`,
      tipo: 'obra',
      x,
      y,
      z,
      placa: [l.x0 + l.largura / 2, p.h + 1, l.z0 + l.profundidade / 2],
      figura: `obra:${c.canteiro}`,
      lugar,
      caixa: caixaDoLoteCidade(l),
    };
  }
  if (c.tipo === 'lugares') {
    let melhor: AlvoGuia | null = null;
    let dMelhor = Infinity;
    for (const uso of c.usos) {
      if (vistos.has(uso)) continue;
      const l = p.lotes.find((q) => q.uso === uso);
      const lugar = l ? frenteDaLoja(p, l) : null;
      if (!l || !lugar) continue;
      // pelo caminho a pé (as calçadas), não em linha reta
      const d = andarNaCidade(p, de, lugar);
      if (d >= dMelhor) continue;
      dMelhor = d;
      const [x, y, z] = fimDoLugar(p, lugar);
      melhor = {
        chave: uso,
        tipo: 'lugar',
        x,
        y,
        z,
        placa: [l.x0 + l.largura / 2, p.h + 1, l.z0 + l.profundidade / 2],
        figura: uso,
        lugar,
        caixa: caixaDoLoteCidade(l),
      };
    }
    return melhor;
  }
  // c5: a troca com a padeira (a cozinheira que anda pela cidade)
  if (c.tipo === 'evento' && c.chave.startsWith('trocou:')) {
    const prof = c.chave.slice('trocou:'.length);
    let melhor: MoradorVisto | null = null;
    for (const q of mundo.moradores())
      if (q.profissao === prof && (!melhor || dist(q, de) < dist(melhor, de))) melhor = q;
    if (!melhor) return null;
    return {
      chave: `morador:${melhor.id}`,
      tipo: 'morador',
      x: melhor.x,
      y: melhor.y,
      z: melhor.z,
      placa: [melhor.x, melhor.y + 1.6, melhor.z],
      figura: 'item:pao',
      raio: PERTO_MORADOR,
      morador: melhor.id,
    };
  }
  return null;
}
const dist = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.hypot(a.x - b.x, a.z - b.z);

// ------------------------------------------------------------------ o sítio (Rancho)
/** O que a lavoura tem agora (as 20 covas do lote, lidas dos blocos). */
export function contarLavoura(
  l: Lote,
  bloco: (x: number, y: number, z: number) => number,
): { maduras: number; livres: number } {
  let maduras = 0;
  let livres = 0;
  for (let f = 1; f <= 5; f++)
    for (const s of [1, 2, 4, 5]) {
      const [x, z] = noLote(l, s, f);
      const em = bloco(x, l.h + 1, z);
      if (bloco(x, l.h, z) !== Bloco.TERRA_ARADA) continue;
      if (madura(em)) maduras++;
      else if (em === Bloco.AR) livres++;
    }
  return { maduras, livres };
}

/** O lote inteiro com 1 bloco de folga (chegou na beira já vale). */
function caixaDoLoteSitio(l: Lote, folga = 1): CaixaChao {
  return { x0: l.x0 - folga, z0: l.z0 - folga, x1: l.x0 + TAM_LOTE + folga, z1: l.z0 + TAM_LOTE + folga };
}

/** O que cada missão do Rancho procura no sítio. */
type BuscaSitio = 'colher' | 'plantar' | 'lavoura' | 'galinheiro' | 'curral' | 'celeiro';
export function buscaDaMissao(m: Missao): BuscaSitio | null {
  const c = m.conta;
  if (c.tipo !== 'evento') return null;
  if (c.chave === 'colheu') return 'colher';
  if (c.chave === 'colheu:minha') return 'lavoura';
  if (c.chave === 'plantou') return 'plantar';
  if (c.chave === 'criou:coelho' || c.chave === 'coletou:ovo') return 'galinheiro';
  if (c.chave === 'criou:cervo') return 'curral';
  if (c.chave.startsWith('fabricou:')) return 'celeiro';
  return null;
}

/** O desenho da placa no sítio: o mesmo da missão (o trigo, a semente, a galinha, o pão). */
function figuraNoSitio(m: Missao): string {
  const d = m.desenho;
  if (d.tipo === 'bicho') return d.bicho;
  if (d.tipo === 'item') return `item:${d.item}`;
  return 'item:trigo';
}

/** A altura do primeiro bloco cheio de cima para baixo (para a placa ficar em cima do telhado). */
function topo(bloco: (x: number, y: number, z: number) => number, x: number, z: number, h: number): number {
  for (let y = h + 16; y > h; y--) if (bloco(x, y, z) !== Bloco.AR) return y + 1;
  return h + 1;
}

function alvoDoLote(
  m: Missao,
  sitio: PlanoPovoado,
  i: number,
  bloco: (x: number, y: number, z: number) => number,
): AlvoGuia {
  const l = sitio.lotes[i];
  const chave = `${l.uso}:${sitio.id}:${i}`;
  const figura = figuraNoSitio(m);
  const meio = noLote(l, 3, 3);
  const cx = meio[0] + 0.5;
  const cz = meio[1] + 0.5;
  if (l.uso === 'curral' || l.uso === 'galinheiro') {
    // do lado de fora da porteira (a criança abre e entra; a trilha não pula a cerca)
    const c = sitio.currais?.find((q) => q.lote === i);
    const [fx, fz] = c ? c.fora : frenteDaPorta(l);
    return {
      chave,
      tipo: 'sitio',
      x: fx + 0.5,
      y: l.h + 1,
      z: fz + 0.5,
      placa: [cx, topo(bloco, Math.floor(cx), Math.floor(cz), l.h), cz],
      figura,
      raio: 2.2,
      caixa: caixaDoLoteSitio(l, 0),
    };
  }
  if (l.uso === 'lavoura') {
    // no corredor do meio (s = 3), na beira da frente: nenhuma pegada em cima da roça
    const [ex, ez] = noLote(l, 3, 0);
    return {
      chave,
      tipo: 'sitio',
      x: ex + 0.5,
      y: l.h + 1,
      z: ez + 0.5,
      placa: [cx, l.h + 1, cz],
      figura,
      caixa: caixaDoLoteSitio(l),
    };
  }
  // o celeiro (a mesa de trabalho e o baú das sementes): na frente da porta
  const [fx, fz] = frenteDaPorta(l);
  return {
    chave,
    tipo: 'sitio',
    x: fx + 0.5,
    y: l.h + 1,
    z: fz + 0.5,
    placa: [cx, topo(bloco, Math.floor(cx), Math.floor(cz), l.h), cz],
    figura,
    raio: 2.2,
    caixa: caixaDoLoteSitio(l, 0),
  };
}

/** Os lotes que servem para a busca, com a "força" (maior primeiro; 0 não serve). */
function lotesQueServem(
  busca: BuscaSitio,
  sitio: PlanoPovoado,
  bloco: (x: number, y: number, z: number) => number,
): { i: number; forca: number }[] {
  const out: { i: number; forca: number }[] = [];
  sitio.lotes.forEach((l, i) => {
    if (busca === 'galinheiro' || busca === 'curral' || busca === 'celeiro') {
      if (l.uso === busca) out.push({ i, forca: 1 });
      return;
    }
    if (l.uso !== 'lavoura') return;
    if (busca === 'lavoura') return void out.push({ i, forca: 1 });
    const { maduras, livres } = contarLavoura(l, bloco);
    // colher: a com trigo maduro; sem maduro, o passo de antes (a terra arada livre)
    if (busca === 'colher') out.push({ i, forca: maduras > 0 ? 3 : livres > 0 ? 2 : 0 });
    else out.push({ i, forca: livres > 0 ? 3 : 1 });
  });
  return out.filter((x) => x.forca > 0);
}

/**
 * O alvo no sítio. Um por vez: o de agora (`atual`) fica enquanto servir do mesmo jeito; senão
 * vale o melhor (mais forte, depois o mais perto) dos sítios perto.
 */
function alvoNoSitio(
  m: Missao,
  mundo: MundoDoGuia,
  de: { x: number; z: number },
  atual: string | null,
): AlvoGuia | null {
  const busca = buscaDaMissao(m);
  if (!busca) return null;
  type Achado = { sitio: PlanoPovoado; i: number; forca: number; d: number };
  let melhor: Achado | null = null;
  let doAtual: Achado | null = null;
  for (const sitio of mundo.sitios)
    for (const x of lotesQueServem(busca, sitio, mundo.bloco)) {
      const l = sitio.lotes[x.i];
      const a: Achado = { sitio, i: x.i, forca: x.forca, d: Math.hypot(l.x0 + 3.5 - de.x, l.z0 + 3.5 - de.z) };
      if (`${l.uso}:${sitio.id}:${x.i}` === atual) doAtual = a;
      if (!melhor || a.forca > melhor.forca || (a.forca === melhor.forca && a.d < melhor.d)) melhor = a;
    }
  // o de agora fica enquanto servir tão bem quanto o melhor (nada de pular para um vizinho)
  const e = doAtual && (!melhor || doAtual.forca >= melhor.forca) ? doAtual : melhor;
  return e ? alvoDoLote(m, e.sitio, e.i, mundo.bloco) : null;
}

/**
 * O resolvedor de alvo (todas as missões dos dois mundos). `vistos`: os lugares do passeio já
 * vistos (o núcleo manda em `usos`); `atual`: a chave do alvo de agora (fica, se ainda servir).
 */
export function alvoDaMissao(
  m: Missao,
  mundo: MundoDoGuia,
  vistos: ReadonlySet<string>,
  de: { x: number; z: number },
  atual: string | null = null,
): AlvoGuia | null {
  if (mundo.cidade) {
    const a = alvoNaCidade(m, mundo.cidade, vistos, de, mundo);
    if (a) return a;
  }
  if (mundo.sitios.length) return alvoNoSitio(m, mundo, de, atual);
  return null;
}

// ------------------------------------------------------------------ a trilha
/** Distância entre duas pegadas e o afastamento do meio (pé esquerdo e direito). */
export const PASSO_PEGADA = 0.72;
export const LADO_PEGADA = 0.17;
export const MAX_PEGADAS = 420;

/** Uma pegada: [x, y, z, yaw, lado (1 direito, -1 esquerdo)]. */
export type Pegada = [number, number, number, number, number];

/** Pegadas a cada PASSO_PEGADA, esquerda e direita, viradas para a frente. */
export function espalharPegadas(pts: readonly V3[], primeira = 0.45): Pegada[] {
  const out: Pegada[] = [];
  let sobra = primeira;
  let lado = 1;
  for (let i = 1; i < pts.length && out.length < MAX_PEGADAS; i++) {
    const [ax, ay, az] = pts[i - 1];
    const [bx, by, bz] = pts[i];
    const d = Math.hypot(bx - ax, bz - az);
    if (d < 1e-4) continue;
    const yaw = Math.atan2(bx - ax, bz - az);
    const nx = (bz - az) / d;
    const nz = -(bx - ax) / d;
    let t = sobra;
    while (t < d && out.length < MAX_PEGADAS) {
      const k = t / d;
      // degrau: a pegada fica no chão de um ou do outro (nunca no ar no meio)
      const y = by > ay ? (k > 0.5 ? by : ay) : by < ay ? (k > 0.5 ? by : ay) : ay;
      out.push([
        ax + (bx - ax) * k + nx * LADO_PEGADA * lado,
        y,
        az + (bz - az) * k + nz * LADO_PEGADA * lado,
        yaw,
        lado,
      ]);
      lado = -lado;
      t += PASSO_PEGADA;
    }
    sobra = t - d;
  }
  return out;
}

/** Um ponto a cada bloco ao longo da linha (a rota das calçadas tem só as quinas). */
export function reamostrar(pts: readonly V3[]): V3[] {
  const out: V3[] = [];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay, az] = pts[i - 1];
    const [bx, by, bz] = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az)));
    for (let k = 0; k < n; k++)
      out.push([ax + ((bx - ax) * k) / n, k < n / 2 ? ay : by, az + ((bz - az) * k) / n]);
  }
  const u = pts[pts.length - 1];
  if (u) out.push([u[0], u[1], u[2]]);
  return out;
}

/** O ponto da linha mais perto de (x, z): o índice do segmento, a fração e a distância. */
export function pertoNaLinha(
  pts: readonly V3[],
  x: number,
  z: number,
): { i: number; k: number; d: number } {
  let melhor = { i: 0, k: 0, d: Infinity };
  if (pts.length === 1) return { i: 0, k: 0, d: Math.hypot(pts[0][0] - x, pts[0][2] - z) };
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const vx = b[0] - a[0];
    const vz = b[2] - a[2];
    const d2 = vx * vx + vz * vz;
    const k = d2 > 1e-9 ? Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[2]) * vz) / d2)) : 0;
    const d = Math.hypot(a[0] + vx * k - x, a[2] + vz * k - z);
    if (d < melhor.d) melhor = { i: i - 1, k, d };
  }
  return melhor;
}

/**
 * A trilha que a criança vê agora: **sempre nasce nos pés dela**. O que ficou para trás sai;
 * se ela saiu da rota, um trechinho reto liga os pés à rota (o mais perto dela, adiante).
 */
export function trilhaDosPes(rota: readonly V3[], pes: V3): V3[] {
  if (!rota.length) return [];
  const p = pertoNaLinha(rota, pes[0], pes[2]);
  const a = rota[p.i];
  const b = rota[Math.min(rota.length - 1, p.i + 1)];
  const ponto: V3 = [a[0] + (b[0] - a[0]) * p.k, p.k > 0.5 ? b[1] : a[1], a[2] + (b[2] - a[2]) * p.k];
  const out: V3[] = [[pes[0], pes[1], pes[2]]];
  if (p.d > 0.35) out.push(ponto);
  for (let i = p.i + 1; i < rota.length; i++) out.push([rota[i][0], rota[i][1], rota[i][2]]);
  return out;
}

/**
 * Alisa a busca em escada da 021 (no sítio): puxa o fio de cada ponto até o mais longe que dá
 * para ir reto sem passar por célula ruim (roça, cerca do lado, degrau de mais de 1). `pisa`
 * diz a altura dos pés em (x, z) vindo de y, ou null se não dá; `ruim` marca o que evitar.
 */
export function alisar(
  pts: readonly V3[],
  pisa: (x: number, z: number, y: number) => number | null,
  ruim: (x: number, y: number, z: number) => boolean,
): V3[] {
  if (pts.length < 3) return pts.map((q) => [q[0], q[1], q[2]] as V3);
  const reto = (a: V3, b: V3): boolean => {
    const d = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const n = Math.ceil(d / 0.25);
    let y = a[1];
    let cx = Math.floor(a[0]);
    let cz = Math.floor(a[2]);
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      // a faixa do corpo (0,3 de cada lado) também tem que passar
      for (const lado of [-0.3, 0, 0.3]) {
        const nx = d > 0 ? -(b[2] - a[2]) / d : 0;
        const nz = d > 0 ? (b[0] - a[0]) / d : 0;
        const x = Math.floor(a[0] + (b[0] - a[0]) * t + nx * lado);
        const z = Math.floor(a[2] + (b[2] - a[2]) * t + nz * lado);
        const yy = pisa(x, z, y);
        if (yy === null || Math.abs(yy - y) > 1 || ruim(x, yy, z)) return false;
        if (lado === 0 && (x !== cx || z !== cz)) {
          y = yy;
          cx = x;
          cz = z;
        }
      }
    }
    return Math.abs(y - b[1]) <= 1;
  };
  const out: V3[] = [[pts[0][0], pts[0][1], pts[0][2]]];
  let i = 0;
  while (i < pts.length - 1) {
    let j = Math.min(pts.length - 1, i + 1);
    for (let k = pts.length - 1; k > i + 1; k--)
      if (reto(pts[i], pts[k])) {
        j = k;
        break;
      }
    out.push([pts[j][0], pts[j][1], pts[j][2]]);
    i = j;
  }
  return out;
}

/** O que a trilha do sítio evita: a roça plantada (e a terra arada) e a beira da cerca. */
export function ruimNoSitio(bloco: (x: number, y: number, z: number) => number) {
  const cerca = (b: number) =>
    b === Bloco.CERCA || b === Bloco.PORTEIRA || b === Bloco.PORTEIRA_ABERTA;
  return (x: number, y: number, z: number): boolean => {
    if (lavouraDoBloco(bloco(x, y, z)) || bloco(x, y - 1, z) === Bloco.TERRA_ARADA) return true;
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ])
      if (cerca(bloco(x + dx, y, z + dz))) return true;
    return false;
  };
}

/** O custo a mais de cada célula na busca a pé no sítio (a roça custa muito, a cerca um pouco). */
export function custoNoSitio(bloco: (x: number, y: number, z: number) => number) {
  const ruim = ruimNoSitio(bloco);
  return (x: number, y: number, z: number): number => {
    if (lavouraDoBloco(bloco(x, y, z)) || bloco(x, y - 1, z) === Bloco.TERRA_ARADA) return 25;
    return ruim(x, y, z) ? 2 : 0;
  };
}

// ------------------------------------------------------------------ a ondinha
/** Pegadas por segundo que a ondinha anda, o intervalo entre ondinhas e a largura dela. */
const VEL_ONDA = 14;
const INTERVALO_ONDA = 2.6;

/**
 * Quanto a pegada i (contada dos pés) cresce agora: uma ondinha sai dos pés a cada
 * INTERVALO_ONDA e corre pela trilha; a de `forte` (o toque no selinho, a trilha que acendeu)
 * é maior. Devolve 0..1.
 */
export function ondaNaPegada(i: number, t: number, forteDesde = -Infinity): number {
  const fase = (t % INTERVALO_ONDA) * VEL_ONDA;
  const calma = Math.max(0, 1 - Math.abs(i - fase) / 2.2) ** 2 * Math.max(0, 1 - i / 40);
  const tf = t - forteDesde;
  const forte = tf >= 0 && tf < 4 ? Math.max(0, 1 - Math.abs(i - tf * VEL_ONDA * 1.3) / 3) ** 2 : 0;
  return Math.min(1, calma * 0.55 + forte);
}

// ------------------------------------------------------------------ o convite
/** Segundos brincando (com o jogo à vista) sem missão até o convite. */
export const CONVITE_S = 120;

/**
 * O relógio do convite: conta só com o jogo à vista e sem missão; com missão volta a zero (e
 * quando a missão acaba, recomeça do zero). `passo` devolve se o convite está à vista e se
 * acabou de aparecer (o brilho é uma vez só).
 */
export function criarRelogioConvite(limite = CONVITE_S) {
  let brincando = 0;
  let antes = false;
  return {
    passo(dt: number, op: { missao: boolean; noJogo: boolean }): { mostra: boolean; acendeu: boolean } {
      if (op.missao) brincando = 0;
      else if (op.noJogo) brincando += Math.max(0, Math.min(0.25, dt));
      const mostra = !op.missao && brincando >= limite;
      const acendeu = mostra && !antes;
      antes = mostra;
      return { mostra, acendeu };
    },
    zerar() {
      brincando = 0;
      antes = false;
    },
    get segundos() {
      return brincando;
    },
  };
}
