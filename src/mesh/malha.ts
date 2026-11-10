import { Bloco, ehCruz, obterBloco } from '../world/blocks';
import { uvDaCelula } from '../art/atlas';
import {
  caixasDoBloco,
  cercaConecta,
  temFormaParcial,
  vetorDirecao,
  type Caixa,
} from '../world/formas';
import { LUZ_MAXIMA, calcularLuz } from '../world/luz';
import { FACES_TILE, TILE_BRANCO, TILE_PORTA_CIMA, TILES_BRILHO, indiceDoTile } from '../art/tiles';
import { ehPorta } from '../world/portas';
import { corDaCopa, plantaDeBrinquedo } from './plantasBrinquedo';

const TILE_TERRA = indiceDoTile('terra');
/** Tabela de opacidade por id (laço quente da malha). */
const OPACO_T = new Uint8Array(256);
for (let i = 0; i < 256; i++) OPACO_T[i] = obterBloco(i)?.opaco ? 1 : 0;
const FOLHAS_T = new Uint8Array(256);
for (let i = 0; i < 256; i++) FOLHAS_T[i] = obterBloco(i)?.folhas ? 1 : 0;
import { ALTURA, TAM_X, TAM_Z, indice } from '../world/chunk';

const INSET_UV = 0.001;

export interface Buffers {
  posicoes: Float32Array;
  normais: Float32Array;
  uvs: Float32Array;
  cores: Float32Array;
  /** Luz por vértice: (céu, bloco) em 0..1. */
  luz: Float32Array;
  indices: Uint32Array;
}

export interface MalhaChunk {
  solido: Buffers;
  plantas: Buffers;
  agua: Buffers;
}

export interface Vizinhos {
  xNeg?: Uint8Array;
  xPos?: Uint8Array;
  zNeg?: Uint8Array;
  zPos?: Uint8Array;
  /** Diagonais (cantos): sem eles, a luz e a sombra de canto vazam na divisa. */
  xNegZNeg?: Uint8Array;
  xPosZNeg?: Uint8Array;
  xNegZPos?: Uint8Array;
  xPosZPos?: Uint8Array;
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

const TILE_PORTA_CIMA_I = indiceDoTile(TILE_PORTA_CIMA);

/** Índice do tile do lado de um bloco no atlas. */
export function tileDoBloco(id: number): number {
  return FACES_TILE[id * 4 + 1];
}

const NORMAL_DA_DIRECAO: [number, number][] = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
];

/** Tile da face: topo (+y), base (-y), frente (na direção do metadado) ou lado. */
function tileDaFace(id: number, n: Vec, meta = 0): number {
  if (n[1] > 0) return FACES_TILE[id * 4];
  if (n[1] < 0) return FACES_TILE[id * 4 + 2];
  const [fx, fz] = NORMAL_DA_DIRECAO[meta & 3];
  if (n[0] === fx && n[2] === fz) return FACES_TILE[id * 4 + 3];
  return FACES_TILE[id * 4 + 1];
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
  luz: number[] = [];
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
      luz: new Float32Array(this.luz),
      indices: new Uint32Array(this.indices),
    };
  }
}

/** Centro do tile branco (cor das peças de brinquedo vai nos vértices). */
const UV_BRANCO: [number, number] = uvDoCanto(indiceDoTile(TILE_BRANCO), 0.5, 0.5);
const UV_BRILHO: Record<number, [number, number]> = Object.fromEntries(
  Object.entries(TILES_BRILHO).map(([b, nome]) => [b, uvDoCanto(indiceDoTile(nome), 0.5, 0.5)]),
);

/** Raio das quinas de brinquedo (fração do bloco). */
export const RAIO_QUINA = 0.13;
/**
 * Detalhe das quinas (qualidade automática, spec 012): 'alto' faz a curva em passos; 'baixo'
 * (celular) faz um chanfro só, com bem menos vértices e o mesmo jeito de peça.
 */
let detalheBaixo = false;
export function definirDetalheMalha(d: 'alto' | 'baixo'): void {
  detalheBaixo = d === 'baixo';
}
/** Quanto cada canto da copa anda para o meio das folhas em volta (copa lisa). */
const FORCA_COPA = 0.9;
/** Copa lisa (cantos puxados): desligada, as copas são bolas (copaDeBolas). */
let copaLisa = false;
/**
 * Copas de pirulito (cada grupo de folhas vira uma bola lisa): desligadas a pedido do dono — a
 * bola não batia com o bloco de verdade (o boneco afundava nela e quebrar ficava estranho).
 * As copas são blocos de folha de quinas redondas, como o resto do mundo de brinquedo.
 */
let copaDeBolas = false;
export function definirCopaDeBolas(v: boolean): void {
  copaDeBolas = v;
}
export function definirCopaLisa(v: boolean): void {
  copaLisa = v;
}
/** Raio das quinas das copas (folhas), bem mais redondas. */
export const RAIO_COPA = 0.2;

const CANTOS: [number, number][] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

/** UV do canto de um tile; (u, v) locais em [0, 1], v = 0 no topo da imagem. */
function uvDoCanto(tile: number, u: number, v: number): [number, number] {
  const r = uvDaCelula(tile);
  const du = r.u1 - r.u0;
  const dv = r.v1 - r.v0;
  return [
    r.u0 + du * (INSET_UV + u * (1 - 2 * INSET_UV)),
    r.v0 + dv * (INSET_UV + v * (1 - 2 * INSET_UV)),
  ];
}

/** Coordenadas locais da textura para um ponto (px, py, pz) em [0, 1] numa face. */
function uvLocal(n: Vec, px: number, py: number, pz: number): [number, number] {
  if (n[1] !== 0) return [px, n[1] > 0 ? pz : 1 - pz];
  if (n[0] !== 0) return [n[0] > 0 ? 1 - pz : pz, 1 - py];
  return [n[2] > 0 ? px : 1 - px, 1 - py];
}

export function gerarMalha(
  blocos: Uint8Array,
  vizinhos: Vizinhos = {},
  metas: Map<number, number> = new Map(),
): MalhaChunk {
  const mapaLuz = calcularLuz(blocos, vizinhos);
  /** Luz suavizada num canto de face: média das células claras em volta. */
  function luzCanto(cs: [number, number, number][], saida: number[]): void {
    let c = 0;
    let b = 0;
    let n = 0;
    for (const [x, y, z] of cs) {
      if (n > 0 && opaco(x, y, z)) continue;
      c += mapaLuz.ceu(x, y, z);
      b += mapaLuz.bloco(x, y, z);
      n++;
    }
    saida.push(c / (n * LUZ_MAXIMA), b / (n * LUZ_MAXIMA));
  }
  const solido = new Acumulador();
  const plantas = new Acumulador();
  const agua = new Acumulador();

  /** Faces da água viradas para o ar; o topo fica um pouco abaixo da borda do bloco. */
  /**
   * Para cada um dos 8 cantos do bloco de folha: o deslocamento até o meio das células
   * cheias em volta (folha ou bloco opaco) e a direção para fora (contra as cheias). Cantos
   * vizinhos são iguais nos dois blocos que os dividem: a copa fica inteira, sem frestas.
   */
  const cacheCopa = new Map<number, Float32Array>();
  function cantosDaCopa(x: number, y: number, z: number): Float32Array {
    const chave = indice(x, y, z);
    const ja = cacheCopa.get(chave);
    if (ja) return ja;
    const out = new Float32Array(48);
    for (let c = 0; c < 8; c++) {
      const cx = c & 1;
      const cy = (c >> 1) & 1;
      const cz = (c >> 2) & 1;
      let n = 0;
      let sx = 0;
      let sy = 0;
      let sz = 0;
      for (let i = 0; i < 8; i++) {
        const ox = (i & 1) - 1 + cx;
        const oy = ((i >> 1) & 1) - 1 + cy;
        const oz = ((i >> 2) & 1) - 1 + cz;
        const v = ler(x + ox, y + oy, z + oz);
        if (!FOLHAS_T[v] && !OPACO_T[v]) continue;
        n++;
        // centro da célula em relação ao canto
        sx += ox + 0.5 - cx;
        sy += oy + 0.5 - cy;
        sz += oz + 0.5 - cz;
      }
      if (n === 0 || n === 8) continue;
      out[c * 6] = (sx / n) * FORCA_COPA;
      out[c * 6 + 1] = (sy / n) * FORCA_COPA;
      out[c * 6 + 2] = (sz / n) * FORCA_COPA;
      out[c * 6 + 3] = -sx;
      out[c * 6 + 4] = -sy;
      out[c * 6 + 5] = -sz;
    }
    cacheCopa.set(chave, out);
    return out;
  }

  /**
   * Copas de pirulito (spec 012): as folhas à mostra se juntam em pedaços de 3x3x3 blocos e
   * cada pedaço vira uma bola lisa no meio das suas folhas, do tamanho da quantidade. Árvore
   * pequena vira uma bola só; grande, uma nuvem de bolas. Os blocos continuam no mundo.
   */
  const grupos = new Map<
    number,
    { sx: number; sy: number; sz: number; n: number; ids: Map<number, number> }
  >();
  function juntarFolha(id: number, x: number, y: number, z: number): void {
    const k = (Math.floor((x + 1) / 3) * 64 + Math.floor((z + 1) / 3)) * 256 + Math.floor(y / 3);
    let g = grupos.get(k);
    if (!g) {
      g = { sx: 0, sy: 0, sz: 0, n: 0, ids: new Map() };
      grupos.set(k, g);
    }
    g.sx += x + 0.5;
    g.sy += y + 0.5;
    g.sz += z + 0.5;
    g.n++;
    g.ids.set(id, (g.ids.get(id) ?? 0) + 1);
  }
  function desenharCopas(): void {
    for (const g of grupos.values()) {
      const cx = g.sx / g.n;
      const cy = g.sy / g.n;
      const cz = g.sz / g.n;
      let id = 0;
      let mais = 0;
      for (const [i, q] of g.ids)
        if (q > mais) {
          mais = q;
          id = i;
        }
      const sorte = hashPosicao(Math.floor(cx), Math.floor(cy), Math.floor(cz), 41);
      const raio = (g.n < 3 ? 0.62 : 0.9 + 0.4 * Math.cbrt(g.n)) * (0.95 + 0.1 * sorte);
      const cor = corDaCopa(id);
      const fx = Math.floor(cx);
      const fy = Math.floor(cy);
      const fz = Math.floor(cz);
      // a luz mais forte em volta da bola (o centro pode cair dentro do tronco, sem céu)
      const alcance = Math.ceil(raio);
      let ceuL = 0;
      let blocoL = 0;
      for (const [ox, oy, oz] of [
        [0, 0, 0],
        [0, alcance, 0],
        [alcance, 0, 0],
        [-alcance, 0, 0],
        [0, 0, alcance],
        [0, 0, -alcance],
        [0, alcance + 1, 0],
      ]) {
        ceuL = Math.max(ceuL, mapaLuz.ceu(fx + ox, fy + oy, fz + oz));
        blocoL = Math.max(blocoL, mapaLuz.bloco(fx + ox, fy + oy, fz + oz));
      }
      const luz: [number, number] = [ceuL / LUZ_MAXIMA, blocoL / LUZ_MAXIMA];
      const an = detalheBaixo ? 9 : 14;
      const ae = detalheBaixo ? 6 : 10;
      const base = solido.vertices;
      for (let i = 0; i <= ae; i++) {
        const fi = (i / ae) * Math.PI;
        for (let j = 0; j <= an; j++) {
          const te = (j / an) * Math.PI * 2;
          const nx = Math.sin(fi) * Math.cos(te);
          const ny = Math.cos(fi);
          const nz = Math.sin(fi) * Math.sin(te);
          solido.posicoes.push(cx + nx * raio, cy + ny * raio * 0.92, cz + nz * raio);
          solido.normais.push(nx, ny, nz);
          solido.uvs.push(UV_BRANCO[0], UV_BRANCO[1]);
          // embaixo um pouco mais escuro (a copa faz sombra em si mesma); alfa < 1: folhas
          const k = 0.82 + 0.18 * (ny * 0.5 + 0.5);
          solido.cores.push(cor[0] * k, cor[1] * k, cor[2] * k, 0.5);
          solido.luz.push(luz[0], luz[1]);
        }
      }
      for (let i = 0; i < ae; i++)
        for (let j = 0; j < an; j++) {
          const a = base + i * (an + 1) + j;
          const b = a + an + 1;
          solido.indices.push(a, a + 1, b, a + 1, b + 1, b);
        }
    }
  }

  /** Fundura (0..1, até 8 blocos) e beira (0..1) no canto (cx, cz) da superfície em y. */
  function fundoDoCanto(cx: number, y: number, cz: number): [number, number] {
    let soma = 0;
    let beira = 0;
    for (const dx of [-1, 0])
      for (const dz of [-1, 0]) {
        const x = cx + dx;
        const z = cz + dz;
        if (ler(x, y, z) !== Bloco.AGUA) {
          beira = 1;
          continue;
        }
        let n = 1;
        while (n < 8 && ler(x, y - n, z) === Bloco.AGUA) n++;
        soma += n;
      }
    return [soma / 4 / 8, beira];
  }

  function adicionarAgua(x: number, y: number, z: number): void {
    const acima = ler(x, y + 1, z);
    const topoBaixo = acima !== Bloco.AGUA ? 0.875 : 1;
    const luzAguaCeu = mapaLuz.ceu(x, y + 1, z) / LUZ_MAXIMA;
    const luzAguaBloco = Math.max(mapaLuz.bloco(x, y + 1, z), mapaLuz.bloco(x, y, z)) / LUZ_MAXIMA;
    for (const f of FACES) {
      const viz = ler(x + f.n[0], y + f.n[1], z + f.n[2]);
      if (viz === Bloco.AGUA) continue;
      const dv = obterBloco(viz);
      // nada de "parede" de água dentro de cercas, portas, vidro e lajes vizinhas
      if (dv?.opaco || dv?.solido || viz === Bloco.GELO) continue;
      const base = agua.vertices;
      const deslocar = f.n[0] + f.n[1] + f.n[2] > 0 ? 1 : 0;
      const topo = f.n[1] > 0;
      for (const [s1, s2] of CANTOS) {
        const lx = deslocar * Math.abs(f.n[0]) + s1 * f.t1[0] + s2 * f.t2[0];
        let ly = deslocar * Math.abs(f.n[1]) + s1 * f.t1[1] + s2 * f.t2[1];
        if (ly > 0.5) ly = topoBaixo;
        const lz = deslocar * Math.abs(f.n[2]) + s1 * f.t1[2] + s2 * f.t2[2];
        agua.posicoes.push(x + lx, y + ly, z + lz);
        agua.normais.push(f.n[0], f.n[1], f.n[2]);
        agua.uvs.push(lx, lz);
        // água de brinquedo (spec 012): no topo, r = fundura no canto (média das quatro
        // colunas em volta, até 8 blocos) e g = beira (o canto encosta em algo que não é água)
        if (topo) {
          const [fundo, beira] = fundoDoCanto(x + lx, y, z + lz);
          agua.cores.push(fundo, beira, 1, 1);
        } else agua.cores.push(0.6, 0, 1, 1);
        // luz do lugar (célula acima da superfície): água de caverna fica escura
        agua.luz.push(luzAguaCeu, luzAguaBloco);
      }
      agua.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    // beira em degrau (spec 012): onde a superfície encosta numa parede, uma faixinha de
    // espuma colada nela, na linha d'água (vista do chão a espuma do plano quase some)
    if (topoBaixo < 1) {
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const dv = obterBloco(ler(x + dx, y, z + dz));
        if (!dv?.opaco || !dv.solido || dv.liquido) continue;
        const base = agua.vertices;
        const px = x + 0.5 + dx * 0.49;
        const pz = z + 0.5 + dz * 0.49;
        const tx = dz !== 0 ? 0.5 : 0;
        const tz = dx !== 0 ? 0.5 : 0;
        for (const [s, h] of [
          [-1, topoBaixo - 0.05],
          [1, topoBaixo - 0.05],
          [1, topoBaixo + 0.07],
          [-1, topoBaixo + 0.07],
        ] as const) {
          const vx = px + tx * s;
          const vz = pz + tz * s;
          agua.posicoes.push(vx, y + h, vz);
          agua.normais.push(-dx, 0, -dz);
          agua.uvs.push(vx - x, vz - z);
          agua.cores.push(0, 1, 1, 1);
          agua.luz.push(luzAguaCeu, luzAguaBloco);
        }
        agua.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
        agua.indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
      }
    }
  }

  function ler(x: number, y: number, z: number): number {
    if (y < 0 || y >= ALTURA) return 0;
    if (x >= 0 && x < TAM_X && z >= 0 && z < TAM_Z) return blocos[indice(x, y, z)];
    let viz: Uint8Array | undefined;
    let lx = x;
    let lz = z;
    const foraX = x < 0 || x >= TAM_X;
    const foraZ = z < 0 || z >= TAM_Z;
    if (foraX && foraZ) {
      // canto: vizinho diagonal
      viz =
        x < 0
          ? z < 0
            ? vizinhos.xNegZNeg
            : vizinhos.xNegZPos
          : z < 0
            ? vizinhos.xPosZNeg
            : vizinhos.xPosZPos;
      lx = x < 0 ? x + TAM_X : x - TAM_X;
      lz = z < 0 ? z + TAM_Z : z - TAM_Z;
    } else if (x < 0) {
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
    return OPACO_T[ler(x, y, z)];
  }

  function adicionarFace(id: number, x: number, y: number, z: number, f: Face): void {
    let tile = tileDaFace(id, f.n, metas.get(indice(x, y, z)) ?? 0);
    const coberto = f.n[1] <= 0 && (f.n[1] < 0 || opaco(x, y + 1, z));
    if (coberto && (id === Bloco.TERRA_MUSGOSA || id === Bloco.TERRA_NEVADA)) tile = TILE_TERRA;
    if (coberto && id === Bloco.MUSGO_PANTANO) tile = FACES_TILE[Bloco.LAMA * 4 + 1];
    const fx = x + f.n[0];
    const fy = y + f.n[1];
    const fz = z + f.n[2];
    // oclusão e luz nos quatro cantos da face (o miolo interpola)
    const ao: number[] = [];
    const luzes: number[] = [];
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
      ao.push(1 - 0.25 * oclusao);
      luzCanto(
        [
          [fx, fy, fz],
          [fx + a * f.t1[0], fy + a * f.t1[1], fz + a * f.t1[2]],
          [fx + b * f.t2[0], fy + b * f.t2[1], fz + b * f.t2[2]],
          [
            fx + a * f.t1[0] + b * f.t2[0],
            fy + a * f.t1[1] + b * f.t2[1],
            fz + a * f.t1[2] + b * f.t2[2],
          ],
        ],
        luzes,
      );
    }
    // quinas de brinquedo (spec 012): só as arestas à mostra se arredondam; entre dois
    // blocos a face segue reta até a borda (a junta é desenhada no material)
    // as folhas viram copa macia: quina bem redonda onde não encostam em outra folha
    const ehFolha = FOLHAS_T[id] === 1;
    // com a copa lisa a forma das folhas vem do alisamento (faces simples, bem mais leves)
    const arredonda = OPACO_T[id] === 1 || (ehFolha && !copaLisa);
    const RAIO = ehFolha ? RAIO_COPA : RAIO_QUINA;
    const mostra = (dx: number, dy: number, dz: number) => {
      if (!arredonda) return 0;
      const v = ler(x + dx, y + dy, z + dz);
      return OPACO_T[v] || (ehFolha && FOLHAS_T[v]) ? 0 : 1;
    };
    const lo: Vec = [mostra(-1, 0, 0), mostra(0, -1, 0), mostra(0, 0, -1)];
    const hi: Vec = [mostra(1, 0, 0), mostra(0, 1, 0), mostra(0, 0, 1)];
    // aresta encostada num bloco da diagonal (telhado em degrau, xadrez): se as duas se
    // arredondassem, sobraria uma fresta entre elas por onde se vê o outro lado. Essa aresta
    // fica reta nos dois blocos. Índice: eixo a, lado de a (0 baixo, 1 cima), eixo b, lado de b.
    const reta = (a: number, sa: number, b: number, sb: number): boolean => {
      if (!arredonda || !(sa ? hi[a] : lo[a]) || !(sb ? hi[b] : lo[b])) return false;
      const d: Vec = [0, 0, 0];
      d[a] = sa ? 1 : -1;
      d[b] = sb ? 1 : -1;
      return !mostra(d[0], d[1], d[2]);
    };
    const retas: boolean[] = [];
    for (let a = 0; a < 3; a++)
      for (let b = a + 1; b < 3; b++)
        for (let sa = 0; sa < 2; sa++)
          for (let sb = 0; sb < 2; sb++) retas.push(reta(a, sa, b, sb));
    const algumaReta = retas.some(Boolean);
    const passos = (t: Vec): number[] => {
      const eixo = t[0] ? 0 : t[1] ? 1 : 2;
      const fr = detalheBaixo ? [0, 1] : [0, 0.45, 1];
      const r: number[] = lo[eixo] ? fr.map((f) => f * RAIO) : [0];
      // o lado de cima é o espelho do de baixo
      if (hi[eixo]) r.push(...fr.map((f) => 1 - f * RAIO).reverse());
      else r.push(1);
      return r;
    };
    const copa = ehFolha && copaLisa ? cantosDaCopa(x, y, z) : null;
    const p1 = passos(f.t1);
    const p2 = passos(f.t2);
    const base = solido.vertices;
    const deslocar = f.n[0] + f.n[1] + f.n[2] > 0 ? 1 : 0;
    const folha = FOLHAS_T[id] ? 0.5 : 1;
    for (const s2 of p2) {
      for (const s1 of p1) {
        const lx = deslocar * Math.abs(f.n[0]) + s1 * f.t1[0] + s2 * f.t2[0];
        const ly = deslocar * Math.abs(f.n[1]) + s1 * f.t1[1] + s2 * f.t2[1];
        const lz = deslocar * Math.abs(f.n[2]) + s1 * f.t1[2] + s2 * f.t2[2];
        let px = lx;
        let py = ly;
        let pz = lz;
        let nx = f.n[0];
        let ny = f.n[1];
        let nz = f.n[2];
        if (arredonda && (p1.length > 2 || p2.length > 2)) {
          // ponto do cubo levado para a caixa de dentro e empurrado pelo raio
          let ix = Math.min(Math.max(lx, lo[0] * RAIO), 1 - hi[0] * RAIO);
          let iy = Math.min(Math.max(ly, lo[1] * RAIO), 1 - hi[1] * RAIO);
          let iz = Math.min(Math.max(lz, lo[2] * RAIO), 1 - hi[2] * RAIO);
          if (algumaReta) {
            // perto de uma aresta que fica reta: nos dois eixos dela o ponto não se recolhe
            const l: Vec = [lx, ly, lz];
            const lado = (e: number) => (l[e] < RAIO - 1e-6 ? 0 : l[e] > 1 - RAIO + 1e-6 ? 1 : -1);
            const solto: Vec = [0, 0, 0];
            let k = 0;
            for (let a = 0; a < 3; a++)
              for (let b = a + 1; b < 3; b++)
                for (let sa = 0; sa < 2; sa++)
                  for (let sb = 0; sb < 2; sb++) {
                    if (retas[k++] && lado(a) === sa && lado(b) === sb) solto[a] = solto[b] = 1;
                  }
            if (solto[0]) ix = lx;
            if (solto[1]) iy = ly;
            if (solto[2]) iz = lz;
          }
          const dx = lx - ix;
          const dy = ly - iy;
          const dz = lz - iz;
          const len = Math.hypot(dx, dy, dz);
          if (len > 1e-6) {
            nx = dx / len;
            ny = dy / len;
            nz = dz / len;
            px = ix + nx * RAIO;
            py = iy + ny * RAIO;
            pz = iz + nz * RAIO;
          }
        }
        if (copa) {
          // copa lisa de pirulito: cada canto puxa para o meio das folhas em volta
          const w = [1 - px, px];
          const v = [1 - py, py];
          const u = [1 - pz, pz];
          let dx = 0;
          let dy = 0;
          let dz = 0;
          let gx = 0;
          let gy = 0;
          let gz = 0;
          for (let c = 0; c < 8; c++) {
            const k = w[c & 1] * v[(c >> 1) & 1] * u[(c >> 2) & 1];
            dx += copa[c * 6] * k;
            dy += copa[c * 6 + 1] * k;
            dz += copa[c * 6 + 2] * k;
            gx += copa[c * 6 + 3] * k;
            gy += copa[c * 6 + 4] * k;
            gz += copa[c * 6 + 5] * k;
          }
          px += dx;
          py += dy;
          pz += dz;
          const lg = Math.hypot(gx, gy, gz);
          if (lg > 1e-4) {
            nx = nx * 0.05 + (gx / lg) * 0.95;
            ny = ny * 0.05 + (gy / lg) * 0.95;
            nz = nz * 0.05 + (gz / lg) * 0.95;
            const ln = Math.hypot(nx, ny, nz) || 1;
            nx /= ln;
            ny /= ln;
            nz /= ln;
          }
        }
        solido.posicoes.push(x + px, y + py, z + pz);
        solido.normais.push(nx, ny, nz);
        solido.uvs.push(...uvDoCanto(tile, ...uvLocal(f.n, lx, ly, lz)));
        // bilinear entre os quatro cantos (ordem de CANTOS: 00, 10, 11, 01)
        const w00 = (1 - s1) * (1 - s2);
        const w10 = s1 * (1 - s2);
        const w11 = s1 * s2;
        const w01 = (1 - s1) * s2;
        const valor = ao[0] * w00 + ao[1] * w10 + ao[2] * w11 + ao[3] * w01;
        // alfa < 1 marca folhas (balançam ao vento no shader)
        solido.cores.push(valor, valor, valor, folha);
        solido.luz.push(
          luzes[0] * w00 + luzes[2] * w10 + luzes[4] * w11 + luzes[6] * w01,
          luzes[1] * w00 + luzes[3] * w10 + luzes[5] * w11 + luzes[7] * w01,
        );
      }
    }
    const n1 = p1.length;
    for (let j = 0; j + 1 < p2.length; j++) {
      for (let i = 0; i + 1 < n1; i++) {
        const a = base + j * n1 + i;
        const b = a + 1;
        const c = a + n1 + 1;
        const d = a + n1;
        // mesma diagonal da oclusão de antes (sem listras no degradê)
        const va = solido.cores[a * 4];
        const vb = solido.cores[b * 4];
        const vc = solido.cores[c * 4];
        const vd = solido.cores[d * 4];
        if (va + vc > vb + vd) solido.indices.push(a, b, c, a, c, d);
        else solido.indices.push(b, c, d, b, d, a);
      }
    }
  }

  /** Blocos parciais: cada caixa vira 6 faces, cortando as que encostam em opacos. */
  function adicionarCaixas(id: number, x: number, y: number, z: number, caixas: Caixa[]): void {
    // porta de dois blocos (spec 013): uma peça só. A metade de cima usa o tile dela nas faces
    // em pé; onde as metades se encostam não há face nem junta (o alfa do vértice avisa o
    // material: 0,996 = metade de cima, 0,993 = metade de baixo)
    const porta = ehPorta(id);
    const temEmbaixo = porta && ehPorta(ler(x, y - 1, z));
    const temEmCima = porta && ehPorta(ler(x, y + 1, z));
    const marca = temEmbaixo ? 0.996 : temEmCima ? 0.993 : 1;
    for (const c of caixas) {
      for (const f of FACES) {
        if ((temEmbaixo && f.n[1] < 0 && c[1] <= 0) || (temEmCima && f.n[1] > 0 && c[4] >= 1))
          continue;
        const naBorda =
          (f.n[0] > 0 && c[3] >= 1) ||
          (f.n[0] < 0 && c[0] <= 0) ||
          (f.n[1] > 0 && c[4] >= 1) ||
          (f.n[1] < 0 && c[1] <= 0) ||
          (f.n[2] > 0 && c[5] >= 1) ||
          (f.n[2] < 0 && c[2] <= 0);
        if (naBorda && opaco(x + f.n[0], y + f.n[1], z + f.n[2])) continue;
        const tile =
          temEmbaixo && f.n[1] === 0
            ? TILE_PORTA_CIMA_I
            : tileDaFace(id, f.n, metas.get(indice(x, y, z)) ?? 0);
        const base = solido.vertices;
        const lc = naBorda ? [x + f.n[0], y + f.n[1], z + f.n[2]] : [x, y, z];
        const lc2: [number, number, number] = [lc[0], lc[1], lc[2]];
        const luzC = mapaLuz.ceu(...lc2) / LUZ_MAXIMA;
        const luzB = Math.max(mapaLuz.bloco(...lc2), mapaLuz.bloco(x, y, z)) / LUZ_MAXIMA;
        const sombra = f.n[1] < 0 ? 0.6 : f.n[1] > 0 ? 1 : 0.85;
        for (const [s1, s2] of CANTOS) {
          // canto da face dentro da caixa
          const p: number[] = [0, 0, 0];
          for (let k = 0; k < 3; k++) {
            const lo = c[k];
            const hi = c[k + 3];
            if (f.n[k] !== 0) p[k] = f.n[k] > 0 ? hi : lo;
            else {
              const s = f.t1[k] ? s1 : s2;
              p[k] = s ? hi : lo;
            }
          }
          solido.posicoes.push(x + p[0], y + p[1], z + p[2]);
          solido.normais.push(f.n[0], f.n[1], f.n[2]);
          solido.uvs.push(...uvDoCanto(tile, ...uvLocal(f.n, p[0], p[1], p[2])));
          solido.cores.push(sombra, sombra, sombra, f.n[1] === 0 ? marca : 1);
          solido.luz.push(luzC, luzB);
        }
        solido.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    }
  }

  function adicionarPlanta(id: number, x: number, y: number, z: number): void {
    const tile = tileDoBloco(id);
    const defP = obterBloco(id);
    // plantas do chão de brinquedo (spec 012): pecinhas 3D na cor do tema
    if (
      plantaDeBrinquedo(
        id,
        x,
        y,
        z,
        plantas,
        UV_BRANCO,
        [mapaLuz.ceu(x, y, z) / LUZ_MAXIMA, mapaLuz.bloco(x, y, z) / LUZ_MAXIMA],
        (sal) => hashPosicao(x, y, z, sal),
        !!defP?.balanca,
        UV_BRILHO[id],
      )
    )
      return;
    const fixo = defP?.forma === 'tocha' || !defP?.balanca;
    const altura = fixo
      ? 1
      : id === Bloco.GRAMA_ALTA
        ? 0.5 + 0.35 * hashPosicao(x, y, z, 1)
        : 0.75 + 0.3 * hashPosicao(x, y, z, 1);
    const escala = fixo ? 1 : 0.8 + 0.4 * hashPosicao(x, y, z, 2);
    const tom = fixo ? 1 : 0.75 + 0.25 * hashPosicao(x, y, z, 3);
    const peso = defP?.balanca ? 1 : 0;
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
        plantas.uvs.push(...uvDoCanto(tile, s1, 1 - s2));
        const topo = s2 ? 1 : 0;
        const t = tom * (0.9 + 0.1 * topo);
        plantas.cores.push(t, t * (0.95 + 0.05 * topo), tom, topo * peso);
        plantas.luz.push(mapaLuz.ceu(x, y, z) / LUZ_MAXIMA, mapaLuz.bloco(x, y, z) / LUZ_MAXIMA);
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
        if (def.liquido) {
          adicionarAgua(x, y, z);
          continue;
        }
        // tocha de brinquedo: pecinha no buffer das plantas (spec 012)
        if (id === Bloco.TOCHA) {
          adicionarPlanta(id, x, y, z);
          continue;
        }
        if (temFormaParcial(id)) {
          const meta = metas.get(indice(x, y, z)) ?? 0;
          const caixas = caixasDoBloco(id, meta, (d) => {
            const [dx, dz] = vetorDirecao(d);
            return cercaConecta(ler(x + dx, y, z + dz));
          });
          if (caixas) {
            adicionarCaixas(id, x, y, z, caixas);
            continue;
          }
        }
        if (def.planta || ehCruz(id)) {
          adicionarPlanta(id, x, y, z);
          continue;
        }
        // copas de pirulito: as folhas viram bolas lisas (desenhadas depois, por grupo)
        if (def.folhas && copaDeBolas) {
          if (FACES.some((f) => !OPACO_T[ler(x + f.n[0], y + f.n[1], z + f.n[2])])) {
            juntarFolha(id, x, y, z);
          }
          continue;
        }
        for (const f of FACES) {
          const viz = ler(x + f.n[0], y + f.n[1], z + f.n[2]);
          const dv = obterBloco(viz);
          if (dv?.opaco) continue;
          if (viz === id && !def.opaco && !def.folhas) continue;
          // dentro da copa não há face: as folhas são uma peça só, sem furos
          if (def.folhas && FOLHAS_T[viz]) continue;
          adicionarFace(id, x, y, z, f);
        }
      }
    }
  }

  desenharCopas();
  return { solido: solido.finalizar(), plantas: plantas.finalizar(), agua: agua.finalizar() };
}
