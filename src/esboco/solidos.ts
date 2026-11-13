/**
 * Esboço 014d (estética dos veículos, segunda passada): peças de "lataria firme", como carrinho
 * de metal fundido ou de madeira. Cada peça é um contorno de lado (x para a frente, y para
 * cima) puxado na largura (z), com:
 * - os cantos do contorno arredondados com o raio de cada um (ou vivos), as caixas de roda
 *   recortadas em arco (o fundo delas pintado de escuro, com a linha da cor limpa);
 * - as quinas da largura chanfradas/arredondadas com um bisel (raio e passos);
 * - as faces planas de verdade (normais exatas: painel liso, sem sombra "inflada").
 * A largura pode estreitar com a altura (a cabine que entra para dentro, "tumblehome"). Tudo
 * sai em VertexData com cor nos vértices, para juntar numa malha só por veículo.
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { triangular } from '../render/formas';

export type V2 = [number, number];
export type V3 = [number, number, number];

/** Canto do contorno: `r` > 0 arredonda (com `seg` passos); sem `r`, canto vivo. */
export interface Canto {
  x: number;
  y: number;
  r?: number;
  seg?: number;
  /** Ponto de uma curva amostrada: normal média das duas arestas (sem quina). */
  suave?: boolean;
}
/** Caixa de roda: arco de raio `R` em volta de (x, y), recortado a partir da linha `chao`. */
export interface ArcoRoda {
  roda: { x: number; y: number; R: number; chao: number; seg?: number; cor?: string };
}
export type Item = Canto | ArcoRoda;

/** Cor do fundo das caixas de roda. */
export const COR_POCO = '#33343d';

interface Bruto {
  p: V2;
  tipo: 'duro' | 'curva' | 'liso';
  r: number;
  seg: number;
  n?: V2;
  corA?: string;
  corB?: string;
}
interface Ponto {
  p: V2;
  n: V2;
  /** Para onde o ponto anda quando o contorno encolhe (o bisel). */
  off: V2;
  cor?: string;
}

const norm2 = (v: V2): V2 => {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
};
/** Normal para fora de uma aresta (contorno no sentido anti-horário). */
const normalAresta = (a: V2, b: V2): V2 => {
  const d = norm2([b[0] - a[0], b[1] - a[1]]);
  return [d[1], -d[0]];
};
const girar = (v: V2, a: number): V2 => [
  v[0] * Math.cos(a) - v[1] * Math.sin(a),
  v[0] * Math.sin(a) + v[1] * Math.cos(a),
];

function brutos(perfil: Item[]): Bruto[] {
  const out: Bruto[] = [];
  let temRoda = false;
  for (const it of perfil) {
    if ('roda' in it) {
      temRoda = true;
      const { x, y, R, chao, seg = 12, cor = COR_POCO } = it.roda;
      const s = Math.max(-0.999, Math.min(0.999, (chao - y) / R));
      const dx = R * Math.sqrt(1 - s * s);
      const a0 = Math.PI - Math.asin(s);
      const a1 = Math.asin(s);
      out.push({ p: [x - dx, chao], tipo: 'duro', r: 0, seg: 0, corB: cor });
      for (let k = 1; k < seg; k++) {
        const a = a0 + ((a1 - a0) * k) / seg;
        const c: V2 = [Math.cos(a), Math.sin(a)];
        out.push({ p: [x + c[0] * R, y + c[1] * R], tipo: 'liso', r: 0, seg: 0, n: [-c[0], -c[1]], corA: cor });
      }
      out.push({ p: [x + dx, chao], tipo: 'duro', r: 0, seg: 0, corA: cor });
    } else {
      out.push({ p: [it.x, it.y], tipo: it.suave ? 'liso' : it.r ? 'curva' : 'duro', r: it.r ?? 0, seg: it.seg ?? 3 });
    }
  }
  let area = 0;
  for (let i = 0; i < out.length; i++) {
    const a = out[i].p;
    const b = out[(i + 1) % out.length].p;
    area += a[0] * b[1] - b[0] * a[1];
  }
  if (area < 0) {
    if (temRoda) throw new Error('contorno com roda tem de ir no sentido anti-horário');
    out.reverse();
  }
  return out;
}

/** O contorno pronto: pontos com a normal exata e para onde encolhem; `bisel` limita os raios. */
function pontos(perfil: Item[], bisel: number): Ponto[] {
  const bs = brutos(perfil);
  const n = bs.length;
  const out: Ponto[] = [];
  for (let i = 0; i < n; i++) {
    const b = bs[i];
    const ant = bs[(i + n - 1) % n].p;
    const prox = bs[(i + 1) % n].p;
    const nIn = normalAresta(ant, b.p);
    const nOut = normalAresta(b.p, prox);
    if (b.tipo === 'liso') {
      const nm = b.n ?? norm2([nIn[0] + nOut[0], nIn[1] + nOut[1]]);
      const d = b.n ? 1 : 1 + nIn[0] * nOut[0] + nIn[1] * nOut[1];
      const off: V2 = b.n ? nm : [(nIn[0] + nOut[0]) / d, (nIn[1] + nOut[1]) / d];
      out.push({ p: b.p, n: nm, off, cor: b.corA });
      continue;
    }
    const u1 = norm2([b.p[0] - ant[0], b.p[1] - ant[1]]);
    const u2 = norm2([prox[0] - b.p[0], prox[1] - b.p[1]]);
    const cruz = u1[0] * u2[1] - u1[1] * u2[0];
    const pe = Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1]));
    const phi = Math.acos(pe);
    if (b.tipo === 'duro' || phi < 1e-3) {
      const d = 1 + nIn[0] * nOut[0] + nIn[1] * nOut[1];
      const m: V2 = d > 1e-3 ? [(nIn[0] + nOut[0]) / d, (nIn[1] + nOut[1]) / d] : nIn;
      out.push({ p: b.p, n: nIn, off: m, cor: b.corA });
      if (phi >= 1e-3) out.push({ p: b.p, n: nOut, off: m, cor: b.corB });
      continue;
    }
    // canto arredondado: o raio cabe nas arestas e, se for convexo, não é menor que o bisel
    const convexo = cruz > 0;
    const la = Math.hypot(b.p[0] - ant[0], b.p[1] - ant[1]);
    const lb = Math.hypot(prox[0] - b.p[0], prox[1] - b.p[1]);
    let r = convexo ? Math.max(b.r, bisel + 0.004) : b.r;
    const tg = Math.tan(phi / 2);
    const t = Math.min(r * tg, 0.48 * Math.min(la, lb));
    r = t / tg;
    const S: V2 = [b.p[0] - u1[0] * t, b.p[1] - u1[1] * t];
    const seg = Math.max(1, b.seg);
    const sentido = convexo ? 1 : -1;
    const C: V2 = convexo ? [S[0] - nIn[0] * r, S[1] - nIn[1] * r] : [S[0] + nIn[0] * r, S[1] + nIn[1] * r];
    for (let k = 0; k <= seg; k++) {
      const nk = girar(nIn, (sentido * phi * k) / seg);
      const p: V2 = convexo ? [C[0] + nk[0] * r, C[1] + nk[1] * r] : [C[0] - nk[0] * r, C[1] - nk[1] * r];
      out.push({ p, n: nk, off: nk, cor: b.corA });
    }
  }
  return out;
}

type Fz = number | ((y: number) => number);
const fz = (f: Fz) => (typeof f === 'number' ? () => f : f);
const deriv = (f: (y: number) => number, y: number) => (f(y + 1e-3) - f(y - 1e-3)) / 2e-3;

export interface OpcoesSolido {
  perfil: Item[];
  /** Lado direito (z menor) e esquerdo (z maior), podem variar com a altura. */
  z0: Fz;
  z1: Fz;
  /** Bisel das quinas da largura (0 = quina viva) e quantos passos ele tem. */
  bisel: number;
  segBisel: number;
  cor: string;
}

const cores = new Map<string, number[]>();
const rgb = (c: string) => {
  let v = cores.get(c);
  if (!v) cores.set(c, (v = Color3.FromHexString(c).asArray()));
  return v;
};

/** Põe os triângulos virados para fora (a regra do `pushTri` de formas.ts). */
export function orientar(vd: VertexData): VertexData {
  const P = vd.positions!;
  const N = vd.normals!;
  const I = vd.indices!;
  for (let k = 0; k < I.length; k += 3) {
    const a = I[k];
    const b = I[k + 1];
    const c = I[k + 2];
    const ux = P[b * 3] - P[a * 3];
    const uy = P[b * 3 + 1] - P[a * 3 + 1];
    const uz = P[b * 3 + 2] - P[a * 3 + 2];
    const vx = P[c * 3] - P[a * 3];
    const vy = P[c * 3 + 1] - P[a * 3 + 1];
    const vz = P[c * 3 + 2] - P[a * 3 + 2];
    const cx = uy * vz - uz * vy;
    const cy = uz * vx - ux * vz;
    const cz = ux * vy - uy * vx;
    const nx = N[a * 3] + N[b * 3] + N[c * 3];
    const ny = N[a * 3 + 1] + N[b * 3 + 1] + N[c * 3 + 1];
    const nz = N[a * 3 + 2] + N[b * 3 + 2] + N[c * 3 + 2];
    if (cx * nx + cy * ny + cz * nz > 0) {
      (I as number[])[k + 1] = c;
      (I as number[])[k + 2] = b;
    }
  }
  return vd;
}

/** A peça: contorno de lado puxado na largura, com bisel nas quinas. */
export function solido(o: OpcoesSolido): VertexData {
  const z0 = fz(o.z0);
  const z1 = fz(o.z1);
  const b = Math.max(0, o.bisel);
  const pts = pontos(o.perfil, b);
  const P = pts.length;
  const sb = b > 0 ? Math.max(1, o.segBisel) : 0;
  // os anéis: do lado direito (z0) de dentro da tampa para a quina, e depois o esquerdo
  // (com bisel, o anel da quina sai duas vezes: a faixa do contorno leva a cor de cada ponto, o
  // fundo da caixa de roda, e o bisel a cor da peça; a linha da cor fica limpa)
  const aneis: { s: number; th: number; corPonto: boolean; emenda?: boolean }[] = [];
  for (let j = sb; j >= 0; j--) aneis.push({ s: -1, th: sb ? ((Math.PI / 2) * j) / sb : 0, corPonto: !sb });
  if (sb) aneis.push({ s: -1, th: 0, corPonto: true, emenda: true });
  if (sb) aneis.push({ s: 1, th: 0, corPonto: true });
  for (let j = 0; j <= sb; j++) aneis.push({ s: 1, th: sb ? ((Math.PI / 2) * j) / sb : 0, corPonto: !sb, emenda: !!sb && j === 0 });
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const base = rgb(o.cor);
  for (const an of aneis) {
    const c = Math.cos(an.th);
    const s = Math.sin(an.th);
    const enc = b * (1 - c);
    for (const q of pts) {
      const x = q.p[0] - q.off[0] * enc;
      const y = q.p[1] - q.off[1] * enc;
      const z = an.s > 0 ? z1(y) - b * (1 - s) : z0(y) + b * (1 - s);
      let nx = q.n[0] * c;
      let ny = q.n[1] * c;
      const nz = an.s * s;
      ny += an.s > 0 ? -deriv(z1, y) * s : deriv(z0, y) * s;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l;
      pos.push(x, y, z);
      nor.push(nx, ny / l, nz / l);
      const cc = q.cor && an.corPonto ? rgb(q.cor) : base;
      col.push(cc[0], cc[1], cc[2], 1);
    }
  }
  for (let r = 0; r < aneis.length - 1; r++)
    for (let i = 0; i < P; i++) {
      if (aneis[r + 1].emenda) continue;
      const i2 = (i + 1) % P;
      const pa = pts[i].p;
      const pb = pts[i2].p;
      if (Math.abs(pa[0] - pb[0]) + Math.abs(pa[1] - pb[1]) < 1e-7) continue;
      const a = r * P + i;
      const bb = r * P + i2;
      const cc = (r + 1) * P + i;
      const d = (r + 1) * P + i2;
      idx.push(a, cc, bb, bb, cc, d);
    }
  // as tampas (os lados planos)
  for (const lado of [0, aneis.length - 1]) {
    const s = aneis[lado].s;
    const anel: V2[] = [];
    const quais: number[] = [];
    for (let i = 0; i < P; i++) {
      const k = lado * P + i;
      const q: V2 = [pos[k * 3], pos[k * 3 + 1]];
      const u = anel[anel.length - 1];
      if (u && Math.abs(u[0] - q[0]) + Math.abs(u[1] - q[1]) < 1e-6) continue;
      anel.push(q);
      quais.push(k);
    }
    const f = anel[0];
    const u = anel[anel.length - 1];
    if (Math.abs(u[0] - f[0]) + Math.abs(u[1] - f[1]) < 1e-6) {
      anel.pop();
      quais.pop();
    }
    const tri = triangular(anel);
    const ini = pos.length / 3;
    for (const k of quais) {
      const y = pos[k * 3 + 1];
      let ny = s > 0 ? -deriv(z1, y) : deriv(z0, y);
      const l = Math.hypot(ny, 1);
      ny /= l;
      pos.push(pos[k * 3], y, pos[k * 3 + 2]);
      nor.push(0, ny, s / l);
      col.push(base[0], base[1], base[2], 1);
    }
    for (const t of tri) idx.push(ini + t);
  }
  const vd = new VertexData();
  vd.positions = pos;
  vd.normals = nor;
  vd.colors = col;
  vd.indices = idx;
  return orientar(vd);
}

/** Retângulo de cantos arredondados (contorno). */
export function retangulo(x0: number, y0: number, x1: number, y1: number, r = 0, seg = 3): Canto[] {
  const rr = Math.min(r, (x1 - x0) / 2 - 1e-4, (y1 - y0) / 2 - 1e-4);
  return [
    { x: x0, y: y0, r: rr, seg },
    { x: x1, y: y0, r: rr, seg },
    { x: x1, y: y1, r: rr, seg },
    { x: x0, y: y1, r: rr, seg },
  ];
}

/** Caixa: retângulo de lado (x, y) com raio `r` puxado de z0 a z1 com bisel `b`. */
export function caixa(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  r: number,
  b: number,
  cor: string,
  seg = 2,
): VertexData {
  return solido({ perfil: retangulo(x0, y0, x1, y1, r, seg), z0, z1, bisel: b, segBisel: seg, cor });
}

/** Leva a peça feita no plano (x, y, z) local para o mundo: x→u, y→v, z→n, mais a origem. */
export function noPlano(vd: VertexData, o: V3, u: V3, v: V3, n: V3): VertexData {
  const P = vd.positions!;
  const N = vd.normals!;
  for (let i = 0; i < P.length; i += 3) {
    const [x, y, z] = [P[i], P[i + 1], P[i + 2]];
    const [a, b, c] = [N[i], N[i + 1], N[i + 2]];
    for (let k = 0; k < 3; k++) {
      (P as number[])[i + k] = o[k] + u[k] * x + v[k] * y + n[k] * z;
      (N as number[])[i + k] = u[k] * a + v[k] * b + n[k] * c;
    }
  }
  return orientar(vd);
}

/** Deita a peça: o contorno vira a planta (x, z) e a largura vira a altura (y de y0 a y1). */
export function deitada(perfilPlanta: Item[], y0: number, y1: number, b: number, cor: string, seg = 1): VertexData {
  const vd = solido({ perfil: perfilPlanta, z0: y0, z1: y1, bisel: b, segBisel: seg, cor });
  return noPlano(vd, [0, 0, 0], [1, 0, 0], [0, 0, 1], [0, 1, 0]);
}

/** Desloca (e escala) uma peça. */
export function mover(vd: VertexData, d: V3): VertexData {
  const P = vd.positions!;
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) (P as number[])[i + k] += d[k];
  return vd;
}
