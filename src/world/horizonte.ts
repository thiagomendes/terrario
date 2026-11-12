/**
 * Horizonte da Cidade Grande (spec 014, T10): um anel de torres altas bem longe, que não dá
 * para alcançar, para a cidade parecer enorme sem pesar. Puro e determinístico pela semente
 * (só desenho: não entra na geração nem no núcleo).
 *
 * São caixas simples (4 lados e o topo, sem fundo) num anel de 260 a 320 blocos do centro da
 * cidade, algumas com um degrau no topo (o jeito art déco) e umas poucas com uma agulha. As
 * cores são claras e de cidade de brinquedo (creme, cinza-azulado, areia, tijolo desbotado),
 * e a névoa mistura tudo de longe. As janelas vêm de uma textura pequena repetida (256 × 64):
 * a coordenada `u` corre pela fachada (64 blocos por volta da textura) e `v` sobe (48 blocos).
 */
import { hash2 } from './noise';

export const RAIO_HORIZONTE: readonly [number, number] = [260, 320];
/** Quem anda para fora nunca chega a menos disto do anel (o anel se afasta junto). */
export const DISTANCIA_MINIMA_HORIZONTE = 120;
/** Blocos de fachada por volta da textura de janelas (u) e de altura (v). */
export const TEXTURA_U = 64;
export const TEXTURA_V = 48;
export const LARGURA_JANELAS = 256;
export const ALTURA_JANELAS = 64;

export interface GeometriaHorizonte {
  /** Posições em relação ao centro do anel (x, z) e ao chão da cidade (y). */
  posicoes: Float32Array;
  /** Cor por vértice (RGBA, 0 a 1), já com o sombreado de cada face. */
  cores: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
  torres: number;
  triangulos: number;
}

/** Cores das torres (claras: a névoa as mistura ao céu). */
const PALETA: readonly [number, number, number][] = [
  [0.91, 0.86, 0.77],
  [0.79, 0.81, 0.85],
  [0.66, 0.71, 0.79],
  [0.85, 0.79, 0.67],
  [0.79, 0.62, 0.53],
  [0.93, 0.88, 0.75],
  [0.72, 0.76, 0.74],
];

/** Sombreado de cada face: o topo mais claro, os lados conforme a direção. */
const SOMBRA = { topo: 1.06, xp: 0.9, xn: 0.78, zp: 0.84, zn: 0.96 };

export function geometriaDoHorizonte(semente: number, torres = 96): GeometriaHorizonte {
  const pos: number[] = [];
  const cor: number[] = [];
  const uv: number[] = [];
  const ind: number[] = [];
  const h = (i: number, k: number) => hash2(i, k, semente + 9300);
  const [r0, r1] = RAIO_HORIZONTE;

  /** Uma caixa sem fundo, de (x0, y0, z0) a (x1, y1, z1), com o deslocamento das janelas. */
  function caixa(
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    rgb: readonly [number, number, number],
    du: number,
  ): void {
    const face = (pts: [number, number, number][], s: number, us: number[], vs: number[]): void => {
      const base = pos.length / 3;
      for (let k = 0; k < 4; k++) {
        pos.push(...pts[k]);
        cor.push(rgb[0] * s, rgb[1] * s, rgb[2] * s, 1);
        uv.push(us[k], vs[k]);
      }
      ind.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };
    const v0 = y0 / TEXTURA_V;
    const v1 = y1 / TEXTURA_V;
    const lado = (a: number, b: number) => [(du + a) / TEXTURA_U, (du + b) / TEXTURA_U];
    // -z e +z (a ordem dos vértices deixa a frente para fora)
    let [ua, ub] = lado(0, x1 - x0);
    face(
      [
        [x0, y0, z0],
        [x0, y1, z0],
        [x1, y1, z0],
        [x1, y0, z0],
      ],
      SOMBRA.zn,
      [ua, ua, ub, ub],
      [v0, v1, v1, v0],
    );
    face(
      [
        [x1, y0, z1],
        [x1, y1, z1],
        [x0, y1, z1],
        [x0, y0, z1],
      ],
      SOMBRA.zp,
      [ua, ua, ub, ub],
      [v0, v1, v1, v0],
    );
    [ua, ub] = lado(7, 7 + z1 - z0);
    face(
      [
        [x0, y0, z1],
        [x0, y1, z1],
        [x0, y1, z0],
        [x0, y0, z0],
      ],
      SOMBRA.xn,
      [ua, ua, ub, ub],
      [v0, v1, v1, v0],
    );
    face(
      [
        [x1, y0, z0],
        [x1, y1, z0],
        [x1, y1, z1],
        [x1, y0, z1],
      ],
      SOMBRA.xp,
      [ua, ua, ub, ub],
      [v0, v1, v1, v0],
    );
    // o topo: um canto de parede da textura (sem janelas)
    face(
      [
        [x0, y1, z0],
        [x0, y1, z1],
        [x1, y1, z1],
        [x1, y1, z0],
      ],
      SOMBRA.topo,
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    );
  }

  for (let i = 0; i < torres; i++) {
    const a = ((i + (h(i, 1) - 0.5) * 0.7) / torres) * Math.PI * 2;
    const r = r0 + h(i, 2) * (r1 - r0);
    const cx = Math.cos(a) * r;
    const cz = Math.sin(a) * r;
    const w = 10 + Math.floor(h(i, 3) * 13);
    const d = 10 + Math.floor(h(i, 4) * 13);
    // as torres altas ficam mais para trás (o degradê de alturas dá profundidade)
    const alto = 30 + Math.floor(h(i, 5) * 42 + ((r - r0) / (r1 - r0)) * 22);
    const rgb = PALETA[Math.floor(h(i, 6) * PALETA.length)];
    const du = Math.floor(h(i, 7) * 32) * 2;
    // a base começa bem abaixo do chão (os morros em volta escondem o pé)
    const y0 = -24;
    caixa(cx - w / 2, y0, cz - d / 2, cx + w / 2, alto, cz + d / 2, rgb, du);
    if (h(i, 8) < 0.34) {
      // o degrau do topo (art déco): uma caixa menor em cima
      const w2 = Math.max(5, Math.round(w * 0.62));
      const d2 = Math.max(5, Math.round(d * 0.62));
      const alto2 = alto + 8 + Math.floor(h(i, 9) * 14);
      caixa(cx - w2 / 2, alto, cz - d2 / 2, cx + w2 / 2, alto2, cz + d2 / 2, rgb, du + 3);
      if (h(i, 10) < 0.4)
        // a agulha
        caixa(
          cx - 0.8,
          alto2,
          cz - 0.8,
          cx + 0.8,
          alto2 + 12 + Math.floor(h(i, 11) * 10),
          cz + 0.8,
          rgb,
          0,
        );
    }
  }
  return {
    posicoes: new Float32Array(pos),
    cores: new Float32Array(cor),
    uvs: new Float32Array(uv),
    indices: new Uint32Array(ind),
    torres,
    triangulos: ind.length / 3,
  };
}

/**
 * As janelas (256 × 64, RGBA): R = vidro, G = acesa de noite (umas sim, outras não), B = tom
 * da luz (mais quente ou mais branca). Cada janela ocupa 8 × 4 pixels (2 × 3 blocos de
 * fachada), com parede em volta; o pixel (0, 0) é parede (o topo das torres usa ele).
 */
export function texturaDeJanelas(semente: number): Uint8Array {
  const W = LARGURA_JANELAS;
  const H = ALTURA_JANELAS;
  const px = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const jx = x >> 3;
      const jy = y >> 2;
      const vidro = (x & 7) >= 1 && (x & 7) <= 6 && (y & 3) >= 1 && (y & 3) <= 2;
      const acesa = hash2(jx, jy, semente + 9310) < 0.36;
      px[i] = vidro ? 255 : 0;
      px[i + 1] = vidro && acesa ? 255 : 0;
      px[i + 2] = vidro ? Math.floor(hash2(jx, jy, semente + 9311) * 255) : 0;
      px[i + 3] = 255;
    }
  return px;
}

/**
 * Onde fica o centro do anel para quem está em (px, pz): o centro da cidade, ou, para quem
 * andou para fora, empurrado junto (o anel se afasta: nunca fica a menos de 120 blocos).
 */
export function centroDoAnel(
  cx: number,
  cz: number,
  px: number,
  pz: number,
  saida: [number, number] = [0, 0],
): [number, number] {
  const dx = px - cx;
  const dz = pz - cz;
  const d = Math.hypot(dx, dz);
  const folga = RAIO_HORIZONTE[0] - DISTANCIA_MINIMA_HORIZONTE;
  const empurra = d > folga ? (d - folga) / d : 0;
  saida[0] = cx + dx * empurra;
  saida[1] = cz + dz * empurra;
  return saida;
}

/** Longe da cidade o anel some na névoa (1 perto, 0 bem longe). */
export function presencaDoHorizonte(distanciaDoCentro: number): number {
  const t = Math.min(1, Math.max(0, (distanciaDoCentro - 320) / 220));
  return 1 - t * t * (3 - 2 * t);
}
