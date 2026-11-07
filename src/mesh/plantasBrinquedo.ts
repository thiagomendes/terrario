/**
 * Plantas de brinquedo (spec 012): no lugar dos dois quadros cruzados com pixels, cada
 * planta do chão vira uma pecinha 3D — tufo baixo de capim, flor de bolinha, cogumelo de
 * cúpula, arbusto redondo com frutinhas, galhos secos e junco. O cenário não pode ficar
 * poluído: o capim é baixo e na cor do chão, e as flores são o destaque.
 *
 * Puro (roda no worker): as cores vêm de uma tabela por bloco, montada na thread principal a
 * partir do atlas do tema (`coresDasPlantas`), e a textura é o tile branco do atlas (a cor
 * vai nos vértices).
 */
import { Bloco } from '../world/blocks';
import type { Atlas } from '../art/atlas';
import { TAM_TILE } from '../art/atlas';

export type Rgb01 = [number, number, number];
export interface CoresPlanta {
  folha: Rgb01;
  destaque: Rgb01;
}

/** Destino dos vértices (o acumulador da malha de plantas). */
export interface AlvoPlanta {
  posicoes: number[];
  normais: number[];
  uvs: number[];
  cores: number[];
  luz: number[];
  indices: number[];
  readonly vertices: number;
}

/** Plantas desenhadas como peça (as outras seguem nos quadros cruzados). */
export const PLANTAS_BRINQUEDO: readonly number[] = [
  Bloco.GRAMA_ALTA,
  Bloco.FLOR,
  Bloco.COGUMELO_BRILHANTE,
  Bloco.ARBUSTO_FRUTINHAS,
  Bloco.ARBUSTO_SECO,
  Bloco.JUNCO,
];

const PADRAO: CoresPlanta = { folha: [0.42, 0.7, 0.32], destaque: [0.93, 0.36, 0.55] };
let tabela: Record<number, CoresPlanta> = {};

/** Cores das plantas do tema (mensagem de estilo do worker). */
export function definirCoresPlantas(t: Record<number, CoresPlanta> | undefined): void {
  tabela = t ?? {};
}

/**
 * Lê no atlas as duas cores de cada planta: a folhagem (média dos tons esverdeados, ou de
 * tudo se não houver) e o destaque (os tons que mais se afastam dela: pétala, chapéu, fruta).
 */
export function coresDasPlantas(atlas: Atlas): Record<number, CoresPlanta> {
  const saida: Record<number, CoresPlanta> = {};
  for (const id of PLANTAS_BRINQUEDO) {
    const uv = atlas.uvDaFace(id, 'lado');
    if (!uv) continue;
    const ox = Math.round(uv.u0 * atlas.largura);
    const oy = Math.round(uv.v0 * atlas.altura);
    const px: Rgb01[] = [];
    for (let y = 0; y < TAM_TILE; y++)
      for (let x = 0; x < TAM_TILE; x++) {
        const i = ((oy + y) * atlas.largura + ox + x) * 4;
        if (atlas.pixels[i + 3] < 128) continue;
        px.push([atlas.pixels[i] / 255, atlas.pixels[i + 1] / 255, atlas.pixels[i + 2] / 255]);
      }
    if (px.length === 0) continue;
    const media = (l: Rgb01[]): Rgb01 => {
      const s: Rgb01 = [0, 0, 0];
      for (const p of l) for (let k = 0; k < 3; k++) s[k] += p[k] / l.length;
      return s;
    };
    const verdes = px.filter((p) => p[1] >= p[0] && p[1] >= p[2]);
    const folha = media(verdes.length >= px.length * 0.2 ? verdes : px);
    const dist = (p: Rgb01) => Math.hypot(p[0] - folha[0], p[1] - folha[1], p[2] - folha[2]);
    const longe = [...px].sort((a, b) => dist(b) - dist(a));
    const destaque = media(longe.slice(0, Math.max(1, Math.ceil(px.length * 0.2))));
    saida[id] = { folha, destaque };
  }
  return saida;
}

const mistura = (a: Rgb01, b: Rgb01, t: number): Rgb01 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const BRANCO: Rgb01 = [1, 1, 1];
const MIOLO: Rgb01 = [1, 0.84, 0.35];

/**
 * Monta a planta `id` na célula (x, y, z). Devolve false se ela não tem forma de brinquedo
 * (quem chama desenha os quadros cruzados de sempre).
 */
export function plantaDeBrinquedo(
  id: number,
  x: number,
  y: number,
  z: number,
  alvo: AlvoPlanta,
  uvBranco: readonly [number, number],
  luz: readonly [number, number],
  sorte: (sal: number) => number,
  balanca: boolean,
): boolean {
  if (!PLANTAS_BRINQUEDO.includes(id)) return false;
  const cores = tabela[id] ?? PADRAO;
  const peso = balanca ? 1 : 0;

  const vertice = (
    px: number,
    py: number,
    pz: number,
    nx: number,
    ny: number,
    nz: number,
    cor: Rgb01,
  ) => {
    alvo.posicoes.push(px, py, pz);
    alvo.normais.push(nx, ny, nz);
    alvo.uvs.push(uvBranco[0], uvBranco[1]);
    // alfa: quanto o vértice balança ao vento (de baixo para cima)
    alvo.cores.push(cor[0], cor[1], cor[2], Math.min(1, Math.max(0, py - y)) * peso);
    alvo.luz.push(luz[0], luz[1]);
  };

  /** Bolinha (esfera achatada à vontade) centrada em c, raios r. */
  const bola = (
    cx: number,
    cy: number,
    cz: number,
    rx: number,
    ry: number,
    rz: number,
    cor: Rgb01,
    an = 7,
    ae = 4,
  ) => {
    const base = alvo.vertices;
    for (let i = 0; i <= ae; i++) {
      const fi = (i / ae) * Math.PI;
      for (let j = 0; j <= an; j++) {
        const te = (j / an) * Math.PI * 2;
        const nx = Math.sin(fi) * Math.cos(te);
        const ny = Math.cos(fi);
        const nz = Math.sin(fi) * Math.sin(te);
        // topo mais claro, base mais escura (luz de brinquedo)
        const k = 0.86 + 0.14 * (ny * 0.5 + 0.5);
        vertice(cx + nx * rx, cy + ny * ry, cz + nz * rz, nx, ny, nz, [
          cor[0] * k,
          cor[1] * k,
          cor[2] * k,
        ]);
      }
    }
    for (let i = 0; i < ae; i++)
      for (let j = 0; j < an; j++) {
        const a = base + i * (an + 1) + j;
        const b = a + an + 1;
        alvo.indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
  };

  /** Haste afinando de a (raio r0) até b (raio r1), com `lados` faces. */
  const haste = (
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    r0: number,
    r1: number,
    cor0: Rgb01,
    cor1: Rgb01,
    lados = 5,
  ) => {
    const base = alvo.vertices;
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    const len = Math.hypot(dx, dy, dz) || 1;
    const d = [dx / len, dy / len, dz / len];
    // dois eixos perpendiculares à haste
    const ref = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let u = [
      d[1] * ref[2] - d[2] * ref[1],
      d[2] * ref[0] - d[0] * ref[2],
      d[0] * ref[1] - d[1] * ref[0],
    ];
    const lu = Math.hypot(u[0], u[1], u[2]);
    u = u.map((v) => v / lu);
    const w = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]];
    for (let j = 0; j <= lados; j++) {
      const t = (j / lados) * Math.PI * 2;
      const c = Math.cos(t);
      const s = Math.sin(t);
      const n = [u[0] * c + w[0] * s, u[1] * c + w[1] * s, u[2] * c + w[2] * s];
      vertice(ax + n[0] * r0, ay + n[1] * r0, az + n[2] * r0, n[0], n[1], n[2], cor0);
      vertice(bx + n[0] * r1, by + n[1] * r1, bz + n[2] * r1, n[0], n[1], n[2], cor1);
    }
    for (let j = 0; j < lados; j++) {
      const a = base + j * 2;
      alvo.indices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
    }
  };

  const cx = x + 0.5 + (sorte(11) - 0.5) * 0.3;
  const cz = z + 0.5 + (sorte(12) - 0.5) * 0.3;
  const tom = 0.9 + 0.15 * sorte(13);
  // folhagem nunca fica escura demais (plástico colorido, não sombra)
  const lum = cores.folha[0] * 0.3 + cores.folha[1] * 0.59 + cores.folha[2] * 0.11;
  const clareia = lum < 0.5 ? Math.min(2.4, 0.5 / Math.max(lum, 0.05)) : 1;
  const folha: Rgb01 = [
    Math.min(1, cores.folha[0] * tom * clareia),
    Math.min(1, cores.folha[1] * tom * clareia),
    Math.min(1, cores.folha[2] * tom * clareia),
  ];
  const ponta = mistura(folha, BRANCO, 0.18);
  const sombra: Rgb01 = [folha[0] * 0.72, folha[1] * 0.72, folha[2] * 0.72];

  switch (id) {
    case Bloco.GRAMA_ALTA: {
      // tufo baixo: 3 a 4 folhinhas grossas e arredondadas, quase da cor do chão
      const n = 3 + Math.floor(sorte(14) * 2);
      const giro = sorte(15) * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const a = giro + (i / n) * Math.PI * 2;
        const h = 0.26 + 0.14 * sorte(20 + i);
        const ox = Math.cos(a) * 0.07;
        const oz = Math.sin(a) * 0.07;
        haste(
          cx + ox,
          y,
          cz + oz,
          cx + ox * 2.6,
          y + h,
          cz + oz * 2.6,
          0.05,
          0.012,
          sombra,
          ponta,
          4,
        );
      }
      break;
    }
    case Bloco.FLOR: {
      const h = 0.36 + 0.08 * sorte(14);
      const topo = y + h;
      haste(cx, y, cz, cx, topo, cz, 0.026, 0.022, sombra, folha, 5);
      // folhinha no caule
      bola(cx + 0.06, y + h * 0.4, cz, 0.07, 0.025, 0.04, folha, 6, 3);
      const giro = sorte(15) * Math.PI * 2;
      const petala = mistura(cores.destaque, BRANCO, 0.08);
      for (let i = 0; i < 5; i++) {
        const a = giro + (i / 5) * Math.PI * 2;
        bola(
          cx + Math.cos(a) * 0.1,
          topo,
          cz + Math.sin(a) * 0.1,
          0.085,
          0.05,
          0.085,
          petala,
          6,
          3,
        );
      }
      bola(cx, topo + 0.02, cz, 0.06, 0.045, 0.06, MIOLO, 6, 3);
      break;
    }
    case Bloco.COGUMELO_BRILHANTE: {
      const h = 0.2 + 0.08 * sorte(14);
      const pe = mistura(folha, BRANCO, 0.55);
      haste(cx, y, cz, cx, y + h, cz, 0.065, 0.05, pe, pe, 6);
      const chapeu = cores.destaque;
      bola(cx, y + h, cz, 0.2, 0.13, 0.2, chapeu, 8, 4);
      for (let i = 0; i < 3; i++) {
        const a = sorte(16 + i) * Math.PI * 2;
        bola(
          cx + Math.cos(a) * 0.11,
          y + h + 0.085,
          cz + Math.sin(a) * 0.11,
          0.03,
          0.02,
          0.03,
          BRANCO,
          5,
          2,
        );
      }
      break;
    }
    case Bloco.ARBUSTO_FRUTINHAS: {
      bola(x + 0.5, y + 0.3, z + 0.5, 0.36, 0.3, 0.36, folha, 8, 5);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + sorte(14) * 2;
        const alt = 0.15 + 0.25 * sorte(20 + i);
        const r = Math.sqrt(Math.max(0, 1 - ((alt - 0.3) / 0.3) ** 2));
        bola(
          x + 0.5 + Math.cos(a) * 0.36 * r,
          y + alt + 0.05,
          z + 0.5 + Math.sin(a) * 0.36 * r,
          0.05,
          0.05,
          0.05,
          cores.destaque,
          5,
          3,
        );
      }
      break;
    }
    case Bloco.ARBUSTO_SECO: {
      const galho = mistura(cores.folha, cores.destaque, 0.3);
      const n = 4;
      for (let i = 0; i < n; i++) {
        const a = sorte(14) * 6 + (i / n) * Math.PI * 2;
        const h = 0.3 + 0.15 * sorte(20 + i);
        haste(
          cx,
          y,
          cz,
          cx + Math.cos(a) * 0.22,
          y + h,
          cz + Math.sin(a) * 0.22,
          0.025,
          0.01,
          galho,
          galho,
          4,
        );
      }
      break;
    }
    case Bloco.JUNCO: {
      for (let i = 0; i < 3; i++) {
        const a = sorte(14) * 6 + (i / 3) * Math.PI * 2;
        const h = 0.65 + 0.25 * sorte(20 + i);
        const bx = cx + Math.cos(a) * 0.1;
        const bz = cz + Math.sin(a) * 0.1;
        haste(cx, y, cz, bx, y + h, bz, 0.03, 0.012, sombra, ponta, 4);
        if (i === 0) {
          // a espiga do junco
          haste(
            cx + (bx - cx) * 0.7,
            y + h * 0.66,
            cz + (bz - cz) * 0.7,
            cx + (bx - cx) * 0.9,
            y + h * 0.88,
            cz + (bz - cz) * 0.9,
            0.045,
            0.04,
            cores.destaque,
            cores.destaque,
            6,
          );
        }
      }
      break;
    }
  }
  return true;
}
