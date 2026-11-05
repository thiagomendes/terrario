import { obterBloco } from '../world/blocks';
import { TILE_TOPO } from '../art/atlas';
import { ALTURA, TAM_X, TAM_Z, indice } from '../world/chunk';

export const COLUNAS_ATLAS = 4;
export const LINHAS_ATLAS = 3;
const INSET_UV = 0.002;

export interface Buffers {
  posicoes: Float32Array;
  normais: Float32Array;
  uvs: Float32Array;
  cores: Float32Array;
  indices: Uint32Array;
}

export interface MalhaChunk {
  solido: Buffers;
  plantas: Buffers;
}

export interface Vizinhos {
  xNeg?: Uint8Array;
  xPos?: Uint8Array;
  zNeg?: Uint8Array;
  zPos?: Uint8Array;
}

type Vec = [number, number, number];

interface Face {
  n: Vec;
  t1: Vec;
  t2: Vec;
}

const FACES: Face[] = [
  { n: [1, 0, 0], t1: [0, 1, 0], t2: [0, 0, 1] },
  { n: [-1, 0, 0], t1: [0, 0, 1], t2: [0, 1, 0] },
  { n: [0, 1, 0], t1: [0, 0, 1], t2: [1, 0, 0] },
  { n: [0, -1, 0], t1: [1, 0, 0], t2: [0, 0, 1] },
  { n: [0, 0, 1], t1: [1, 0, 0], t2: [0, 1, 0] },
  { n: [0, 0, -1], t1: [0, 1, 0], t2: [1, 0, 0] },
];

/** Índice do tile no atlas para um bloco (blocos 1..10 usam tiles 0..9). */
export function tileDoBloco(id: number): number {
  return id - 1;
}

/** Hash determinístico da posição, em [0, 1). */
export function hashPosicao(x: number, y: number, z: number, sal: number): number {
  let h = Math.imul(x + 101, 374761393) ^ Math.imul(y + 211, 668265263);
  h ^= Math.imul(z + 307, 2147483647) ^ Math.imul(sal + 1, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

class Acumulador {
  posicoes: number[] = [];
  normais: number[] = [];
  uvs: number[] = [];
  cores: number[] = [];
  indices: number[] = [];

  get vertices(): number {
    return this.posicoes.length / 3;
  }

  finalizar(): Buffers {
    return {
      posicoes: new Float32Array(this.posicoes),
      normais: new Float32Array(this.normais),
      uvs: new Float32Array(this.uvs),
      cores: new Float32Array(this.cores),
      indices: new Uint32Array(this.indices),
    };
  }
}

const CANTOS: [number, number][] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

function uvDoCanto(tile: number, s1: number, s2: number): [number, number] {
  const col = tile % COLUNAS_ATLAS;
  const lin = Math.floor(tile / COLUNAS_ATLAS);
  const u0 = col / COLUNAS_ATLAS;
  const v0 = lin / LINHAS_ATLAS;
  const du = 1 / COLUNAS_ATLAS;
  const dv = 1 / LINHAS_ATLAS;
  return [
    u0 + du * (INSET_UV + s1 * (1 - 2 * INSET_UV)),
    v0 + dv * (INSET_UV + s2 * (1 - 2 * INSET_UV)),
  ];
}

export function gerarMalha(blocos: Uint8Array, vizinhos: Vizinhos = {}): MalhaChunk {
  const solido = new Acumulador();
  const plantas = new Acumulador();

  function ler(x: number, y: number, z: number): number {
    if (y < 0 || y >= ALTURA) return 0;
    if (x >= 0 && x < TAM_X && z >= 0 && z < TAM_Z) return blocos[indice(x, y, z)];
    let viz: Uint8Array | undefined;
    let lx = x;
    let lz = z;
    if (x < 0) {
      viz = vizinhos.xNeg;
      lx = x + TAM_X;
    } else if (x >= TAM_X) {
      viz = vizinhos.xPos;
      lx = x - TAM_X;
    } else if (z < 0) {
      viz = vizinhos.zNeg;
      lz = z + TAM_Z;
    } else {
      viz = vizinhos.zPos;
      lz = z - TAM_Z;
    }
    if (!viz) return 0;
    if (lx < 0 || lx >= TAM_X || lz < 0 || lz >= TAM_Z) return 0;
    return viz[indice(lx, y, lz)];
  }

  function opaco(x: number, y: number, z: number): number {
    return obterBloco(ler(x, y, z))?.opaco ? 1 : 0;
  }

  function adicionarFace(id: number, x: number, y: number, z: number, f: Face): void {
    const tile = f.n[1] > 0 && TILE_TOPO[id] !== undefined ? TILE_TOPO[id] : tileDoBloco(id);
    const base = solido.vertices;
    const ao: number[] = [];
    const fx = x + f.n[0];
    const fy = y + f.n[1];
    const fz = z + f.n[2];
    for (const [s1, s2] of CANTOS) {
      const a = s1 ? 1 : -1;
      const b = s2 ? 1 : -1;
      const l1 = opaco(fx + a * f.t1[0], fy + a * f.t1[1], fz + a * f.t1[2]);
      const l2 = opaco(fx + b * f.t2[0], fy + b * f.t2[1], fz + b * f.t2[2]);
      const c = opaco(
        fx + a * f.t1[0] + b * f.t2[0],
        fy + a * f.t1[1] + b * f.t2[1],
        fz + a * f.t1[2] + b * f.t2[2],
      );
      const oclusao = l1 && l2 ? 3 : l1 + l2 + c;
      const valor = 1 - 0.25 * oclusao;
      ao.push(valor);
      const deslocar = f.n[0] + f.n[1] + f.n[2] > 0 ? 1 : 0;
      solido.posicoes.push(
        x + deslocar * Math.abs(f.n[0]) + s1 * f.t1[0] + s2 * f.t2[0],
        y + deslocar * Math.abs(f.n[1]) + s1 * f.t1[1] + s2 * f.t2[1],
        z + deslocar * Math.abs(f.n[2]) + s1 * f.t1[2] + s2 * f.t2[2],
      );
      solido.normais.push(f.n[0], f.n[1], f.n[2]);
      solido.uvs.push(...uvDoCanto(tile, s1, s2));
      solido.cores.push(valor, valor, valor, 1);
    }
    if (ao[0] + ao[2] > ao[1] + ao[3]) {
      solido.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    } else {
      solido.indices.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
    }
  }

  function adicionarPlanta(id: number, x: number, y: number, z: number): void {
    const tile = tileDoBloco(id);
    const altura = 0.8 + 0.4 * hashPosicao(x, y, z, 1);
    const escala = 0.8 + 0.4 * hashPosicao(x, y, z, 2);
    const tom = 0.75 + 0.25 * hashPosicao(x, y, z, 3);
    const a = 0.5 - 0.5 * escala;
    const b = 0.5 + 0.5 * escala;
    const planos: [Vec, Vec][] = [
      [
        [x + a, y, z + a],
        [x + b, y, z + b],
      ],
      [
        [x + b, y, z + a],
        [x + a, y, z + b],
      ],
    ];
    for (const [p, q] of planos) {
      const base = plantas.vertices;
      const dx = q[0] - p[0];
      const dz = q[2] - p[2];
      const comp = Math.hypot(dx, dz);
      const nx = -dz / comp;
      const nz = dx / comp;
      const pts: Vec[] = [
        [p[0], y, p[2]],
        [q[0], y, q[2]],
        [q[0], y + altura, q[2]],
        [p[0], y + altura, p[2]],
      ];
      CANTOS.forEach(([s1, s2], i) => {
        plantas.posicoes.push(...pts[i]);
        plantas.normais.push(nx, 0, nz);
        plantas.uvs.push(...uvDoCanto(tile, s1, s2));
        const topo = s2 ? 1 : 0;
        const t = tom * (0.9 + 0.1 * topo);
        plantas.cores.push(t, t * (0.95 + 0.05 * topo), tom, topo);
      });
      plantas.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }

  for (let y = 0; y < ALTURA; y++) {
    for (let z = 0; z < TAM_Z; z++) {
      for (let x = 0; x < TAM_X; x++) {
        const id = blocos[indice(x, y, z)];
        if (id === 0) continue;
        const def = obterBloco(id);
        if (!def) continue;
        if (def.planta) {
          adicionarPlanta(id, x, y, z);
          continue;
        }
        for (const f of FACES) {
          const viz = ler(x + f.n[0], y + f.n[1], z + f.n[2]);
          const dv = obterBloco(viz);
          if (dv?.opaco) continue;
          if (viz === id && !def.opaco) continue;
          adicionarFace(id, x, y, z, f);
        }
      }
    }
  }

  return { solido: solido.finalizar(), plantas: plantas.finalizar() };
}
