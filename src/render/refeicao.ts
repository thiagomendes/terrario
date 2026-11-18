/**
 * Spec 032: o momento de comer na tela (o boneco da criança e o do amigo, em todos os mundos).
 *
 * A comida da mão vira a "comida mordida": o mesmo modelo de `itensBrinquedo.ts`, com quatro
 * estados (inteira e depois de cada uma das três mordidas), cada comida do seu jeito
 * (`jeitoDeComer`):
 * - **mordida:** o recorte de mordida na ponta (o arco de dentinhos), maior a cada vez, com o
 *   miolo de outra cor onde a mordida pegou (pão, cachorro-quente, maçã, carne, peixe, ovo; a
 *   fatia de bolo e a torta são recortadas no contorno, de cima);
 * - **pipoca:** as pipocas de cima somem, poucas por vez;
 * - **canudinho:** a bebida desce no copo transparente a cada gole (e a espuma vai junto);
 * - **colherada:** a sopa desce na tigela;
 * - **nuvem:** os tufos do algodão-doce somem, o palito fica.
 *
 * As formas mordidas são feitas uma vez por comida e guardadas (as próximas refeições só copiam
 * os números). A cada mordida saem migalhas (ou gotinhas, ou fiapos) da cor da comida, o som do
 * jeito dela, e no fim os coraçõezinhos; o que sobrou some com um brilhinho enquanto o braço
 * desce.
 */
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Scene } from '@babylonjs/core/scene';
import { modeloNaMao, type ModeloItem } from './itensBrinquedo';
import { esfera, type Plasticos } from './formas';
import {
  afastaNaRefeicao,
  bracoNaRefeicao,
  DESCE,
  DURACAO_REFEICAO,
  FIM_REFEICAO,
  jeitoDeComer,
  MORDIDAS,
  type JeitoDeComer,
} from '../jogo/refeicao';
import type { EventoSom } from '../audio/sons';

/** Quem come: o boneco (a mão, a boca, os plásticos e o nó do corpo). */
export interface DonoDaRefeicao {
  raiz: TransformNode;
  noDaMao(): TransformNode;
  /** A cabeça e a boca nela (+z é a frente do rosto). Sem ela, a comida fica na mão. */
  boca?(): { no: TransformNode; pos: [number, number, number] };
  ocuparMao(ocupada: boolean): void;
  plasticos(): Plasticos;
}

/**
 * Onde a comida fica na mão antes de subir e depois de descer (no nó da mão, como o item de
 * sempre).
 */
export const NA_MAO_COMENDO = {
  pos: [0, -0.05, 0.09] as [number, number, number],
  giro: [0, 0, 0] as [number, number, number],
};

/**
 * Na boca (no espaço da cabeça): a ponta que se morde encosta nos lábios, um tiquinho à frente
 * (nunca dentro do rosto). As comidas compridas (o cachorro-quente, o pão, o peixe, a carne)
 * ficam de través, a ponta de fora para o lado da mão e um pouco para baixo; as outras ficam em
 * pé, com o lado que se morde (o canudo, a beira do balde, a ponta da fatia) virado para a boca.
 */
export const NA_BOCA = {
  /** Folga dos lábios até a ponta (blocos, na frente do rosto). */
  folga: 0.012,
  /** Quanto a comida sai da boca entre as mordidas (blocos). */
  afasta: 0.1,
  /** Quanto ela vira de lado entre as mordidas (rad): a marca da mordida aparece. */
  giro: 1.0,
  /** A comida na boca, um pouco maior que na mão (lê de longe, na câmera de trás). */
  escala: 1.25,
  /** Para onde vai a ponta de fora das compridas (cabeça: x para o lado, y, z para a frente). */
  rumo: [0.62, -0.3, 1] as [number, number, number],
};

/** O ponto de cada comida que encosta na boca (no modelo; +x é o lado que se morde). */
const CONTATO: Readonly<Record<string, [number, number, number]>> = {
  suco: [0.045, 0.235, 0],
  vitamina: [0.075, 0.3, 0],
  pipoca: [0.075, 0.165, 0],
  algodao_doce: [0.08, 0.3, 0],
  ensopado: [0.095, 0.085, 0],
  fatia_bolo: [0.1, 0.11, 0],
  torta_abobora: [0.11, 0.08, 0],
  frutinhas: [0.08, 0.04, 0],
  maca: [0.09, 0.0, 0],
  ovo_cozido: [0.09, 0.04, 0],
};
/**
 * Um tiquinho para o lado da mão e para baixo (cabeça: x, y, z), nas redondas: bem na frente da
 * boca, a maçã parecia um nariz de palhaço.
 */
const DESLOCAR: Readonly<Record<string, [number, number, number]>> = {
  maca: [0.075, -0.05, 0],
  // (as em pé, um tiquinho para o lado da mão, que fica embaixo delas)
  suco: [0.03, 0, 0],
  vitamina: [0.03, 0, 0],
  pipoca: [0.035, 0, 0],
  algodao_doce: [0.035, 0, 0],
  ovo_cozido: [0.06, -0.04, 0],
  frutinhas: [0.06, -0.04, 0],
};
/** As compridas, que se comem de través pela ponta. */
const DE_TRAVES = new Set(['cachorro_quente', 'pao', 'peixe_cru', 'peixe_assado', 'carne_crua', 'carne_assada']);

type V3 = [number, number, number];

/** As comidas que se mordem: as peças mordidas (cor de fora e do miolo) e de que ponta. */
interface DefMordida {
  /** Peça (o nome no modelo) → [cor de fora, cor do miolo]. */
  partes: Record<string, [string, string]>;
  /** De que ponta do comprimento (x) a mordida começa. */
  ponta: 1 | -1;
  /** Peças pequenas que somem quando a mordida chega nelas (a mostarda, os cortes do pão). */
  enfeites?: string[];
  /** Peças que somem numa mordida certa (a folhinha da maçã na terceira). */
  somem?: Record<string, number>;
}

const MORDIDAS_DE: Readonly<Record<string, DefMordida>> = {
  cachorro_quente: {
    partes: { 'pao-cq': ['#e8b067', '#f8e2b0'], salsicha: ['#c8452c', '#ec9a82'] },
    ponta: 1,
    enfeites: ['mostarda'],
  },
  pao: { partes: { pao: ['#c8843a', '#f6e2b8'] }, ponta: 1, enfeites: ['corte'] },
  maca: { partes: { maca: ['#e84a4a', '#fff1d0'] }, ponta: 1, somem: { folha: 3 } },
  carne_crua: { partes: { carne: ['#e57a7a', '#f4a8a0'] }, ponta: -1 },
  carne_assada: { partes: { carne: ['#a0582e', '#d89a6a'] }, ponta: -1 },
  peixe_cru: { partes: { peixe: ['#7ab8e0', '#fff0e6'] }, ponta: 1 },
  peixe_assado: { partes: { peixe: ['#d9904a', '#fff0e0'] }, ponta: 1 },
  ovo_cozido: { partes: { clara: ['#fbf7ee', '#fffdf6'], gema: ['#ffc23a', '#ffd970'] }, ponta: 1 },
};

/** As cores das migalhas (ou gotinhas, ou fiapos) de cada comida. */
const MIGALHAS: Readonly<Record<string, string[]>> = {
  cachorro_quente: ['#f2c27a', '#e8b067', '#ffd23d'],
  pao: ['#e0a860', '#f6e2b8'],
  maca: ['#fff1d0', '#e84a4a'],
  carne_crua: ['#e57a7a'],
  carne_assada: ['#a0582e', '#c8804a'],
  peixe_cru: ['#fff0e6'],
  peixe_assado: ['#e0a060', '#fff0e0'],
  ovo_cozido: ['#fffdf6', '#ffd970'],
  fatia_bolo: ['#ffd866', '#d9902e'],
  torta_abobora: ['#e0a865', '#f08a2a'],
  frutinhas: ['#d8346a'],
  pipoca: ['#fff8e8', '#fff0c8'],
  suco: ['#ff9a40'],
  vitamina: ['#ffb0d2'],
  ensopado: ['#e0a84a'],
  algodao_doce: ['#ffd2e6', '#ffb0d2'],
};

/** O som de cada jeito. */
export const SOM_DO_JEITO: Readonly<Record<JeitoDeComer, EventoSom>> = {
  mordida: 'mordida',
  pipoca: 'crocante',
  canudinho: 'gole',
  colherada: 'gole',
  nuvem: 'fofo',
};

/** A comida mordida: o modelo e como fica depois de cada mordida. */
export interface ComidaMordida {
  modelo: ModeloItem;
  /** Mostra a comida depois de `k` mordidas (0 a 3). */
  estagio(k: number): void;
  /** Onde a mordida pega (no espaço do modelo): as migalhas saem dali. */
  pontoDaMordida(k: number): Vector3;
  /** O ponto que encosta na boca depois de `k` mordidas (no modelo). */
  contato(k: number): Vector3;
  /** Comprida (de través, pela ponta) ou em pé. */
  traves: boolean;
  /** De que ponta (x) se morde. */
  ponta: 1 | -1;
  descartar(): void;
}

// ------------------------------------------------------------------------ a forma mordida

interface ParteGuardada {
  nome: string;
  indices: number[];
  /** Os quatro estados: posições, normais e cores. */
  estados: { p: Float32Array; n: Float32Array; c: Float32Array }[];
}
interface Guardada {
  partes: ParteGuardada[];
  /** Os enfeites: o meio (no modelo) e em que mordida somem. */
  enfeites: Map<string, number>;
  /** Onde cada mordida pega (o modelo). */
  pontos: V3[];
  /** A ponta que encosta na boca depois de cada mordida (0 a 3), no modelo. */
  frentes: V3[];
}
/** As formas mordidas de cada comida (feitas uma vez). */
const guardadas = new Map<string, Guardada>();

/** A matriz da peça no espaço do modelo (posição, giro e escala dela). */
function matrizDaPeca(m: Mesh): Matrix {
  const q = m.rotationQuaternion ?? Quaternion.FromEulerAngles(m.rotation.x, m.rotation.y, m.rotation.z);
  return Matrix.Compose(m.scaling, q, m.position);
}

const rgba = (hex: string) => {
  const c = Color3.FromHexString(hex);
  return [c.r, c.g, c.b, 1] as const;
};

/** Uma mordida: três "dentinhos" (elipsoides em pé) lado a lado na largura da comida. */
interface Dente {
  c: V3;
  r: number;
  ry: number;
}

/**
 * Os dentinhos de cada mordida (cumulativos: a mordida `k` tem os da 1 até a `k`), da ponta para
 * o meio do comprimento: o recorte de arco que a criança reconhece.
 */
function dentesDasMordidas(
  min: V3,
  max: V3,
  ponta: 1 | -1,
): { dentes: Dente[][]; pontos: V3[] } {
  const L = max[0] - min[0];
  const H = max[1] - min[1];
  const D = max[2] - min[2];
  const cy = (min[1] + max[1]) / 2;
  const cz = (min[2] + max[2]) / 2;
  const r = Math.max(D * 0.42, Math.min(L * 0.2, D * 0.62));
  const passo = L * 0.2;
  const fim = ponta > 0 ? max[0] : min[0];
  const dentes: Dente[][] = [];
  const pontos: V3[] = [];
  for (let k = 0; k < 3; k++) {
    // a primeira mordida pega a ponta; as seguintes entram mais
    const x = fim + ponta * (r * 0.62 - k * passo);
    const lista: Dente[] = [];
    for (const dz of [-0.5, 0, 0.5]) lista.push({ c: [x, cy, cz + dz * D * 0.62], r: r * (dz ? 0.8 : 1), ry: H * 1.4 });
    dentes.push(lista);
    pontos.push([x - ponta * r * 0.7, cy + H * 0.25, cz]);
  }
  return { dentes, pontos };
}

/** Dentro do dentinho? */
const dentro = (d: Dente, x: number, y: number, z: number) => {
  const dx = (x - d.c[0]) / d.r;
  const dy = (y - d.c[1]) / d.ry;
  const dz = (z - d.c[2]) / d.r;
  return dx * dx + dy * dy + dz * dz < 1;
};

/**
 * Morde a malha (no espaço do modelo): cada vértice dentro de um dentinho anda no comprimento
 * (x) até a borda dele, e ganha a cor do miolo. A malha continua fechada (só os vértices andam):
 * a ponta vira a concha da mordida, com o arco dos dentinhos visto de cima.
 */
function morder(
  pos: Float32Array,
  ponta: 1 | -1,
  dentes: Dente[],
  cor: readonly number[],
  miolo: readonly number[],
): { p: Float32Array; c: Float32Array } {
  const p = pos.slice();
  const n = p.length / 3;
  const c = new Float32Array(n * 4);
  // da ponta para dentro: o vértice que sai de um dentinho e cai no de trás anda de novo
  const ordem = [...dentes].sort((a, b) => ponta * (b.c[0] - a.c[0]));
  for (let i = 0; i < n; i++) {
    let x = p[i * 3];
    const y = p[i * 3 + 1];
    const z = p[i * 3 + 2];
    const x0 = x;
    for (const d of ordem) {
      if (!dentro(d, x, y, z)) continue;
      const dy = (y - d.c[1]) / d.ry;
      const dz = (z - d.c[2]) / d.r;
      const resto = 1 - dy * dy - dz * dz;
      if (resto <= 0) continue;
      x = d.c[0] - ponta * d.r * Math.sqrt(resto);
    }
    p[i * 3] = x;
    const mordido = Math.abs(x - x0) > 0.002;
    c.set(mordido ? miolo : cor, i * 4);
  }
  return { p, c };
}

function guardarMordida(modelo: ModeloItem, prefixo: string, def: DefMordida): Guardada {
  const nome = (m: Mesh) => m.name.slice(prefixo.length + 1);
  const pecas = modelo.malhas.filter((m) => def.partes[nome(m)]);
  // a caixa das peças mordidas (no modelo): o comprimento é o x
  const min: V3 = [Infinity, Infinity, Infinity];
  const max: V3 = [-Infinity, -Infinity, -Infinity];
  const baked = pecas.map((m) => {
    const mat = matrizDaPeca(m);
    const p = Float32Array.from(m.getVerticesData(VertexBuffer.PositionKind) ?? []);
    const v = Vector3.Zero();
    for (let i = 0; i < p.length; i += 3) {
      Vector3.TransformCoordinatesFromFloatsToRef(p[i], p[i + 1], p[i + 2], mat, v);
      p[i] = v.x;
      p[i + 1] = v.y;
      p[i + 2] = v.z;
      min[0] = Math.min(min[0], v.x);
      min[1] = Math.min(min[1], v.y);
      min[2] = Math.min(min[2], v.z);
      max[0] = Math.max(max[0], v.x);
      max[1] = Math.max(max[1], v.y);
      max[2] = Math.max(max[2], v.z);
    }
    return { m, p, indices: Array.from(m.getIndices() ?? []) };
  });
  const { dentes, pontos } = dentesDasMordidas(min, max, def.ponta);
  const partes: ParteGuardada[] = baked.map(({ m, p, indices }) => {
    const [fora, dentro] = def.partes[nome(m)];
    const cor = rgba(fora);
    const miolo = rgba(dentro);
    const estados: ParteGuardada['estados'] = [];
    for (let k = 0; k <= 3; k++) {
      const r = morder(p, def.ponta, dentes.slice(0, k).flat(), cor, miolo);
      const n = new Float32Array(r.p.length);
      VertexData.ComputeNormals(r.p, indices, n);
      estados.push({ p: r.p, n, c: r.c });
    }
    return { nome: nome(m), indices, estados };
  });
  // os enfeites somem na primeira mordida que chega no meio deles
  const enfeites = new Map<string, number>();
  for (const m of modelo.malhas) {
    const nm = nome(m);
    if (def.somem?.[nm]) enfeites.set(nm, def.somem[nm]);
    if (!def.enfeites?.some((e) => nm.startsWith(e))) continue;
    const c = m.position;
    let k = 4;
    for (let j = 0; j < 3 && k > 3; j++)
      if (dentes[j].some((d) => dentro({ ...d, r: d.r * 1.15 }, c.x, c.y, c.z))) k = j + 1;
    if (k <= 3) enfeites.set(nm, k);
  }
  // a ponta de cada estado: o vértice mais de fora no comprimento, na altura e largura do meio
  const cy = (min[1] + max[1]) / 2;
  const cz = (min[2] + max[2]) / 2;
  const frentes: V3[] = [0, 1, 2, 3].map((k) => {
    let x = def.ponta > 0 ? -Infinity : Infinity;
    for (const pg of partes) {
      const p = pg.estados[k].p;
      for (let i = 0; i < p.length; i += 3)
        x = def.ponta > 0 ? Math.max(x, p[i]) : Math.min(x, p[i]);
    }
    return [x, cy, cz];
  });
  return { partes, enfeites, pontos, frentes };
}

/** Um prisma de contorno (planta x, z) de y0 a y1, com cor por vértice (o miolo nas mordidas). */
export function prisma(
  contorno: { x: number; z: number; mordido: boolean }[],
  y0: number,
  y1: number,
  cor: string,
  miolo: string,
): VertexData {
  const p: number[] = [];
  const c: number[] = [];
  const idx: number[] = [];
  const fora = rgba(cor);
  const dentro = rgba(miolo);
  const N = contorno.length;
  let mx = 0;
  let mz = 0;
  for (const q of contorno) {
    mx += q.x / N;
    mz += q.z / N;
  }
  // tampa de cima e de baixo (leque a partir do meio)
  for (const [y, sobe] of [
    [y1, true],
    [y0, false],
  ] as const) {
    const base = p.length / 3;
    p.push(mx, y, mz);
    c.push(...fora);
    for (const q of contorno) {
      p.push(q.x, y, q.z);
      c.push(...fora);
    }
    for (let i = 0; i < N; i++) {
      const a = base + 1 + i;
      const b = base + 1 + ((i + 1) % N);
      if (sobe) idx.push(base, b, a);
      else idx.push(base, a, b);
    }
  }
  // a lateral (cada aresta com os seus vértices: quina viva)
  for (let i = 0; i < N; i++) {
    const a = contorno[i];
    const b = contorno[(i + 1) % N];
    const base = p.length / 3;
    const k = a.mordido || b.mordido ? dentro : fora;
    p.push(a.x, y0, a.z, b.x, y0, b.z, b.x, y1, b.z, a.x, y1, a.z);
    for (let j = 0; j < 4; j++) c.push(...k);
    idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
  const vd = new VertexData();
  vd.positions = p;
  vd.indices = idx;
  vd.colors = c;
  const n: number[] = [];
  VertexData.ComputeNormals(p, idx, n);
  vd.normals = n;
  return vd;
}

/**
 * O contorno mordido de uma forma (planta): de um ponto de dentro, o raio até a borda em cada
 * direção, cortado pelo primeiro círculo de mordida que o raio encontra.
 */
function contornoMordido(
  borda: (ang: number) => number,
  meio: [number, number],
  mordidas: { x: number; z: number; r: number }[],
  n = 72,
): { x: number; z: number; mordido: boolean }[] {
  const out: { x: number; z: number; mordido: boolean }[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    let rho = borda(a);
    let mordido = false;
    for (const m of mordidas) {
      // a entrada do raio no círculo da mordida
      const ox = meio[0] - m.x;
      const oz = meio[1] - m.z;
      const b = ox * dx + oz * dz;
      const cc = ox * ox + oz * oz - m.r * m.r;
      const disc = b * b - cc;
      if (disc < 0) continue;
      const t = -b - Math.sqrt(disc);
      if (t > 0.002 && t < rho) {
        rho = t;
        mordido = true;
      }
    }
    out.push({ x: meio[0] + dx * rho, z: meio[1] + dz * rho, mordido });
  }
  return out;
}

/** A distância do ponto `o` até a borda de um polígono convexo (planta), na direção `a`. */
function raioAtePoligono(poli: [number, number][], o: [number, number], a: number): number {
  const dx = Math.cos(a);
  const dz = Math.sin(a);
  let melhor = Infinity;
  for (let i = 0; i < poli.length; i++) {
    const [x1, z1] = poli[i];
    const [x2, z2] = poli[(i + 1) % poli.length];
    const ex = x2 - x1;
    const ez = z2 - z1;
    const den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((x1 - o[0]) * ez - (z1 - o[1]) * ex) / den;
    const u = ((x1 - o[0]) * dz - (z1 - o[1]) * dx) / den;
    if (t > 0 && u >= 0 && u <= 1) melhor = Math.min(melhor, t);
  }
  return melhor === Infinity ? 0 : melhor;
}

// ------------------------------------------------------------------------ montar

/**
 * Monta a comida mordida de `item` (null: não é comida, ou não tem modelo). As formas mordidas
 * ficam guardadas para as próximas refeições.
 */
export function montarComidaMordida(
  scene: Scene,
  mats: Plasticos,
  item: string,
  prefixo: string,
): ComidaMordida | null {
  const modelo = modeloNaMao(scene, mats, null, item, prefixo);
  if (!modelo) return null;
  const jeito = jeitoDeComer(item);
  const nome = (m: Mesh) => m.name.slice(prefixo.length + 1);
  const peca = (n: string) => modelo.malhas.find((m) => nome(m) === n);
  const extras: Mesh[] = [];
  const matCv = mats.corVertice(0.4);
  let estagio: (k: number) => void = () => undefined;
  let ponto: (k: number) => Vector3 = () => new Vector3(0, 0.12, 0);
  const fixo = CONTATO[item] ?? [0.08, 0.06, 0];
  let contato: (k: number) => Vector3 = () => Vector3.FromArray(fixo);

  const def = MORDIDAS_DE[item];
  if (jeito === 'mordida' && def) {
    let g = guardadas.get(item);
    if (!g) {
      g = guardarMordida(modelo, prefixo, def);
      guardadas.set(item, g);
    }
    const gg = g;
    // as peças mordidas viram malhas próprias (no espaço do modelo, com a cor nos vértices)
    const trocadas = gg.partes.map((pg) => {
      const velha = peca(pg.nome);
      const m = new Mesh(`${prefixo}-${pg.nome}-mordida`, scene);
      const vd = new VertexData();
      vd.positions = pg.estados[0].p.slice();
      vd.normals = pg.estados[0].n.slice();
      vd.colors = pg.estados[0].c.slice();
      vd.indices = pg.indices;
      vd.applyToMesh(m, true);
      m.material = matCv ?? (velha?.material as StandardMaterial | null) ?? null;
      m.isPickable = false;
      m.parent = modelo.no;
      velha?.setEnabled(false);
      extras.push(m);
      return { m, pg };
    });
    estagio = (k) => {
      for (const { m, pg } of trocadas) {
        const e = pg.estados[Math.max(0, Math.min(3, k))];
        m.updateVerticesData(VertexBuffer.PositionKind, e.p);
        m.updateVerticesData(VertexBuffer.NormalKind, e.n);
        m.updateVerticesData(VertexBuffer.ColorKind, e.c);
        m.refreshBoundingInfo();
      }
      for (const [nm, ate] of gg.enfeites) peca(nm)?.setEnabled(k < ate);
    };
    ponto = (k) => Vector3.FromArray(gg.pontos[Math.max(0, Math.min(2, k - 1))]);
    contato = (k) => Vector3.FromArray(gg.frentes[Math.max(0, Math.min(3, k))]);
  } else if (item === 'fatia_bolo' || item === 'torta_abobora') {
    // recortadas no contorno, vistas de cima (a fatia pela ponta, a torta pela beira)
    const bolo = item === 'fatia_bolo';
    const L = 0.2;
    const W = 0.15;
    // (a cunha do modelo: ponta em +x, costas em -x; o meio dela a -L/6)
    const ox = -L / 6;
    const tri: [number, number][] = [
      [ox + (2 * L) / 3, 0],
      [ox - L / 3, W / 2],
      [ox - L / 3, -W / 2],
    ];
    const R = 0.11;
    const borda = bolo
      ? (a: number) => raioAtePoligono(tri, [ox - L / 6, 0], a)
      : () => R;
    const meio: [number, number] = bolo ? [ox - L / 6, 0] : [0, 0];
    const pontaX = bolo ? ox + (2 * L) / 3 : R;
    const circulos = (k: number) =>
      [0, 1, 2]
        .slice(0, k)
        .flatMap((j) =>
          [-1, 0, 1].map((s) => ({
            x: pontaX + (bolo ? 0.012 : 0.03) - j * (bolo ? 0.045 : 0.05),
            z: s * (bolo ? 0.028 : 0.04),
            r: bolo ? 0.034 : 0.045,
          })),
        );
    const camadas = bolo
      ? [
          { nome: 'fatia', y0: 0.014, y1: 0.014 + 0.095, cor: '#ffd866', miolo: '#ffe28a' },
          { nome: 'fatia-topo', y0: 0.109, y1: 0.123, cor: '#d9902e', miolo: '#e8a848' },
        ]
      : [
          { nome: 'torta', y0: 0, y1: 0.07, cor: '#e0a865', miolo: '#f0c890' },
          { nome: 'recheio', y0: 0.07, y1: 0.085, cor: '#f08a2a', miolo: '#f6a050' },
        ];
    const estados = [0, 1, 2, 3].map((k) =>
      camadas.map((cm) => {
        const r = cm.nome === 'recheio' ? 0.09 : R;
        const contorno = contornoMordido(bolo ? borda : () => r, meio, circulos(k));
        return prisma(contorno, cm.y0, cm.y1, cm.cor, cm.miolo);
      }),
    );
    const malhas = camadas.map((cm, i) => {
      peca(cm.nome)?.setEnabled(false);
      const m = new Mesh(`${prefixo}-${cm.nome}-mordida`, scene);
      estados[0][i].applyToMesh(m, true);
      m.material = matCv ?? mats.cor(cm.cor);
      m.isPickable = false;
      m.parent = modelo.no;
      extras.push(m);
      return m;
    });
    const enfeites = modelo.malhas.filter((m) => /^acucar/.test(nome(m)));
    estagio = (k) => {
      const kk = Math.max(0, Math.min(3, k));
      malhas.forEach((m, i) => {
        // (o número de vértices é sempre o mesmo: só os números mudam)
        const vd = estados[kk][i];
        m.updateVerticesData(VertexBuffer.PositionKind, vd.positions as number[]);
        m.updateVerticesData(VertexBuffer.NormalKind, vd.normals as number[]);
        m.updateVerticesData(VertexBuffer.ColorKind, vd.colors as number[]);
        m.refreshBoundingInfo();
      });
      for (const e of enfeites)
        e.setEnabled(!circulos(kk).some((c) => Math.hypot(c.x - e.position.x, c.z - e.position.z) < c.r * 1.2));
    };
    ponto = (k) => new Vector3(pontaX - Math.max(0, k - 1) * 0.045 - 0.03, 0.09, 0);
    // (a ponta que sobra depois de cada mordida encosta na boca)
    contato = (k) => new Vector3(pontaX - Math.max(0, Math.min(3, k)) * (bolo ? 0.045 : 0.05), bolo ? 0.11 : 0.08, 0);
  } else if (jeito === 'pipoca') {
    const pipocas = modelo.malhas
      .filter((m) => /^pipoca/.test(nome(m)))
      .sort((a, b) => b.position.y - a.position.y);
    const ate = [0, 3, 5, pipocas.length];
    estagio = (k) => pipocas.forEach((m, i) => m.setEnabled(i >= ate[Math.max(0, Math.min(3, k))]));
    ponto = () => new Vector3(0, 0.17, 0);
  } else if (jeito === 'canudinho') {
    const liquido = peca(item === 'vitamina' ? 'vitamina' : 'suco');
    const espumas = ['espuma', 'espuma2'].map(peca).filter((m): m is Mesh => !!m);
    const nivel = [1, 0.68, 0.38, 0.1];
    const base = liquido ? { y: liquido.position.y, h: liquido.getBoundingInfo().boundingBox.extendSize.y * 2 } : null;
    const espumaY = espumas.map((m) => m.position.y);
    estagio = (k) => {
      if (!liquido || !base) return;
      const f = nivel[Math.max(0, Math.min(3, k))];
      liquido.scaling.y = f;
      // (o fundo fica no lugar: o que desce é o alto)
      liquido.position.y = base.y - (base.h * (1 - f)) / 2;
      espumas.forEach((m, i) => {
        m.position.y = espumaY[i] - base.h * (1 - f);
        const s = k >= 3 ? 0.3 : 1 - k * 0.12;
        m.scaling.x = s;
        m.scaling.z = s;
        m.setEnabled(k < 3);
      });
    };
    ponto = () => new Vector3(0.03, 0.3, 0);
  } else if (jeito === 'colherada') {
    const sopa = peca('sopa');
    const y = sopa?.position.y ?? 0;
    estagio = (k) => {
      if (!sopa) return;
      const kk = Math.max(0, Math.min(3, k));
      sopa.position.y = y - kk * 0.011;
      sopa.scaling.x = 1 - kk * 0.09;
      sopa.scaling.z = 1 - kk * 0.09;
      sopa.setEnabled(kk < 3);
    };
    ponto = () => new Vector3(0, 0.08, 0);
  } else if (jeito === 'nuvem') {
    const tufos = modelo.malhas.filter((m) => /^nuvem/.test(nome(m)));
    const ate = [0, 3, 5, tufos.length];
    estagio = (k) => tufos.forEach((m, i) => m.setEnabled(i >= ate[Math.max(0, Math.min(3, k))]));
    ponto = (k) => new Vector3(0, 0.3 - k * 0.02, 0.04);
  } else if (item === 'frutinhas') {
    const frutas = modelo.malhas.filter((m) => /^fruta/.test(nome(m)));
    estagio = (k) => frutas.forEach((m, i) => m.setEnabled(i >= Math.max(0, Math.min(3, k))));
    ponto = () => new Vector3(0, 0.03, 0);
  } else {
    // (uma comida sem forma mordida: fica menor a cada mordida, e some na terceira)
    estagio = (k) => {
      const kk = Math.max(0, Math.min(3, k));
      modelo.no.scaling.setAll([1, 0.78, 0.55, 0][kk]);
    };
  }
  estagio(0);
  return {
    modelo,
    estagio,
    pontoDaMordida: ponto,
    contato,
    traves: DE_TRAVES.has(item),
    ponta: def?.ponta ?? 1,
    descartar() {
      for (const m of extras) m.dispose();
      for (const m of modelo.malhas) m.dispose();
      modelo.no.dispose();
    },
  };
}

/** Testes: as formas mordidas de uma comida (vértices de cada peça em cada estado). */
export function formasGuardadas(item: string): { nome: string; estados: Float32Array[] }[] | null {
  const g = guardadas.get(item);
  return g ? g.partes.map((p) => ({ nome: p.nome, estados: p.estados.map((e) => e.p) })) : null;
}

// ------------------------------------------------------------------------ a refeição

interface Migalha {
  m: Mesh;
  v: Vector3;
  vida: number;
  tam: number;
  /** Fiapo do algodão: cai devagar, balançando. */
  leve: boolean;
}

export interface OpcoesRefeicoes {
  /** O som de cada mordida (o jeito da comida), no lugar dela; `meu`: a criança deste aparelho. */
  som(ev: EventoSom, onde: Vector3, meu: boolean): void;
  /** Os coraçõezinhos em volta de (x, y, z). */
  coracoes(x: number, y: number, z: number, n: number): void;
  /** O brilhinho do que sobrou sumindo (a estrelinha do jogo). */
  brilho?(x: number, y: number, z: number): void;
  /** Cada malha nova (o brilho do mundo não pega nelas). */
  preparar?(m: Mesh): void;
}

interface Comendo {
  dono: DonoDaRefeicao;
  item: string;
  jeito: JeitoDeComer;
  comida: ComidaMordida | null;
  t: number;
  mordidas: number;
  meu: boolean;
  coracoes: boolean;
  sumiu: boolean;
}

export interface Refeicoes {
  /** O boneco `dono` come `item` (do começo; uma refeição por boneco). */
  comecar(dono: DonoDaRefeicao, item: string, meu: boolean): void;
  /** Para a refeição do boneco (ele sumiu, desmaiou). */
  parar(dono: DonoDaRefeicao): void;
  atualizar(dt: number): void;
  /** Deixa pronta a forma mordida de `item` (a primeira refeição não engasga). */
  preparar(item: string, mats: Plasticos): void;
  /** Testes: a refeição de um boneco (null sem refeição). */
  estado(dono: DonoDaRefeicao): { item: string; t: number; mordidas: number; jeito: JeitoDeComer } | null;
}

export function criarRefeicoes(scene: Scene, op: OpcoesRefeicoes): Refeicoes {
  const ativas = new Map<DonoDaRefeicao, Comendo>();
  const migalhas: Migalha[] = [];
  const MAX_MIGALHAS = 36;
  let n = 0;
  const mundo = new Vector3();

  function soltarMigalhas(c: Comendo): void {
    if (!c.comida) return;
    const no = c.comida.modelo.no;
    no.computeWorldMatrix(true);
    const p = c.comida.pontoDaMordida(c.mordidas);
    Vector3.TransformCoordinatesToRef(p, no.getWorldMatrix(), mundo);
    const cores = MIGALHAS[c.item] ?? ['#e0b080'];
    const leve = c.jeito === 'nuvem';
    const quantas = c.jeito === 'canudinho' ? 2 : c.jeito === 'colherada' ? 2 : leve ? 4 : 5;
    const mats = c.dono.plasticos();
    for (let i = 0; i < quantas; i++) {
      if (migalhas.length >= MAX_MIGALHAS) {
        const velha = migalhas.shift();
        velha?.m.dispose();
      }
      const cor = cores[(i + c.mordidas) % cores.length];
      const tam = c.jeito === 'pipoca' ? 0.028 : c.jeito === 'canudinho' ? 0.014 : leve ? 0.022 : 0.018;
      const m = esfera(`migalha-${n++}`, scene, tam, mats.cor(cor, 0.35), [1, 0.85, 1]);
      m.position.copyFrom(mundo);
      m.isPickable = false;
      op.preparar?.(m);
      const ang = Math.random() * Math.PI * 2;
      const v = leve
        ? new Vector3(Math.cos(ang) * 0.25, 0.15 + Math.random() * 0.2, Math.sin(ang) * 0.25)
        : new Vector3(Math.cos(ang) * (0.5 + Math.random() * 0.5), 0.6 + Math.random() * 0.8, Math.sin(ang) * (0.5 + Math.random() * 0.5));
      migalhas.push({ m, v, vida: leve ? 0.9 : 0.6, tam, leve });
    }
  }

  const mMao = new Matrix();
  const mBoca = new Matrix();
  const local = new Matrix();
  const giro = new Matrix();
  const sA = new Vector3();
  const sB = new Vector3();
  const pA = new Vector3();
  const pB = new Vector3();
  const qA = new Quaternion();
  const qB = new Quaternion();
  const naCabeca = new Vector3();
  /**
   * A comida entre a mão e a boca: na mão (como o item de sempre) quando o braço está embaixo, na
   * frente da boca (o ponto que se morde encostado nos lábios) quando ele está em cima, e o meio do
   * caminho no meio. Depois de cada mordida, a ponta que sobrou volta a encostar na boca.
   */
  function posicionar(c: Comendo): void {
    const comida = c.comida!;
    const no = comida.modelo.no;
    const mao = c.dono.noDaMao();
    mao.computeWorldMatrix(true);
    Matrix.ComposeToRef(
      Vector3.OneReadOnly,
      Quaternion.FromEulerAngles(...NA_MAO_COMENDO.giro),
      Vector3.FromArray(NA_MAO_COMENDO.pos),
      local,
    );
    local.multiplyToRef(mao.getWorldMatrix(), mMao);
    mMao.decompose(sA, qA, pA);
    const w = bracoNaRefeicao(c.t);
    const b = c.dono.boca?.();
    if (b && w > 0) {
      b.no.computeWorldMatrix(true);
      let q: Quaternion;
      if (comida.traves) {
        // de través: o comprimento (x) da ponta de fora para a boca
        const f = Vector3.FromArray(NA_BOCA.rumo).normalize();
        const x = f.scale(-comida.ponta);
        const z = Vector3.Cross(x, Vector3.UpReadOnly).normalize();
        const y = Vector3.Cross(z, x).normalize();
        Matrix.FromXYZAxesToRef(x, y, z, giro);
        q = Quaternion.FromRotationMatrix(giro);
      } else q = Quaternion.FromEulerAngles(0, Math.PI / 2, 0);
      // mastigando, a comida também vira um pouco de lado: a marca da mordida, que estava virada
      // para a boca, aparece para quem olha (de frente, de lado e de trás)
      // (no canudinho a criança não solta: o canudo fica na boca e o nível é que desce)
      const solta = c.jeito === 'canudinho' ? 0 : afastaNaRefeicao(c.t);
      const ag = solta * NA_BOCA.giro;
      if (ag) {
        Matrix.FromQuaternionToRef(q, giro);
        giro.multiplyToRef(Matrix.RotationY(ag), local);
        q = Quaternion.FromRotationMatrix(local);
      }
      // o ponto que se morde, girado, encosta na frente dos lábios
      Matrix.FromQuaternionToRef(q, giro);
      Vector3.TransformCoordinatesToRef(comida.contato(c.mordidas), giro, naCabeca);
      const [bx, by, bz] = b.pos;
      const [dx, dy, dz] = DESLOCAR[c.item] ?? [0, 0, 0];
      // mastigando, a comida sai um tiquinho da boca (para a frente e para baixo): a marca da
      // mordida aparece
      const af = solta * NA_BOCA.afasta;
      const pos = new Vector3(
        bx + dx - naCabeca.x,
        by + dy - naCabeca.y - af * 0.45,
        bz + dz + NA_BOCA.folga + af - naCabeca.z,
      );
      // (na boca a comida fica um pouco maior: de trás, a câmera do jogo ainda vê a comida)
      const e = NA_BOCA.escala;
      pos.subtractInPlace(naCabeca.scale(e - 1));
      Matrix.ComposeToRef(new Vector3(e, e, e), q, pos, local);
      local.multiplyToRef(b.no.getWorldMatrix(), mBoca);
      mBoca.decompose(sB, qB, pB);
      Vector3.LerpToRef(sA, sB, w, sA);
      Vector3.LerpToRef(pA, pB, w, pA);
      Quaternion.SlerpToRef(qA, qB, w, qA);
    }
    no.scaling.copyFrom(sA);
    no.position.copyFrom(pA);
    no.rotationQuaternion!.copyFrom(qA);
  }

  function fim(c: Comendo): void {
    c.comida?.descartar();
    c.comida = null;
    c.dono.ocuparMao(false);
  }

  return {
    comecar(dono, item, meu) {
      const antes = ativas.get(dono);
      if (antes) fim(antes);
      const comida = montarComidaMordida(scene, dono.plasticos(), item, `refeicao-${n++}`);
      if (comida) {
        comida.modelo.no.rotationQuaternion = new Quaternion();
        for (const m of comida.modelo.no.getChildMeshes()) {
          m.alwaysSelectAsActiveMesh = true;
          op.preparar?.(m as Mesh);
        }
        dono.ocuparMao(true);
      }
      ativas.set(dono, {
        dono,
        item,
        jeito: jeitoDeComer(item),
        comida,
        t: 0,
        mordidas: 0,
        meu,
        coracoes: false,
        sumiu: false,
      });
    },
    parar(dono) {
      const c = ativas.get(dono);
      if (!c) return;
      fim(c);
      ativas.delete(dono);
    },
    atualizar(dt) {
      const passo = Math.min(Math.max(dt, 0), 0.1);
      for (const [dono, c] of ativas) {
        c.t += passo;
        if (c.comida) posicionar(c);
        // as três mordidas
        while (c.mordidas < 3 && c.t >= MORDIDAS[c.mordidas]) {
          c.mordidas++;
          c.comida?.estagio(c.mordidas);
          soltarMigalhas(c);
          dono.raiz.computeWorldMatrix(true);
          op.som(SOM_DO_JEITO[c.jeito], dono.raiz.getAbsolutePosition(), c.meu);
        }
        // o que sobrou (o balde, o copo, o palito) some com um brilhinho quando o braço já desceu
        // (perto da mão: o brilhinho na frente do rosto parecia farelo nos olhos)
        if (!c.sumiu && c.t >= Math.max(DESCE + 0.1, DURACAO_REFEICAO - 0.05)) {
          c.sumiu = true;
          if (c.comida) {
            c.comida.modelo.no.computeWorldMatrix(true);
            const p = c.comida.modelo.no.getAbsolutePosition();
            op.brilho?.(p.x, p.y, p.z);
          }
          fim(c);
        }
        if (!c.coracoes && c.t >= DURACAO_REFEICAO - 0.5) {
          c.coracoes = true;
          const p = dono.raiz.getAbsolutePosition();
          // (pouco acima da cabeça: sobem à vista, sem sair da tela do celular)
          op.coracoes(p.x, p.y + 1.6, p.z, 3);
        }
        if (c.t >= FIM_REFEICAO) {
          fim(c);
          ativas.delete(dono);
        }
      }
      for (let i = migalhas.length - 1; i >= 0; i--) {
        const g = migalhas[i];
        g.vida -= passo;
        if (g.vida <= 0) {
          g.m.dispose();
          migalhas.splice(i, 1);
          continue;
        }
        g.v.y -= (g.leve ? 0.6 : 7) * passo;
        g.m.position.addInPlace(g.v.scale(passo));
        const s = Math.min(1, g.vida / 0.25);
        g.m.scaling.setAll(Math.max(0.05, s));
      }
    },
    preparar(item, mats) {
      if (guardadas.has(item) || !MORDIDAS_DE[item]) return;
      const c = montarComidaMordida(scene, mats, item, `refeicao-prep-${n++}`);
      c?.descartar();
    },
    estado(dono) {
      const c = ativas.get(dono);
      return c ? { item: c.item, t: c.t, mordidas: c.mordidas, jeito: c.jeito } : null;
    },
  };
}
