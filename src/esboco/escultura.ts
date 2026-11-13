/**
 * Esboço 014c (refino dos veículos): uma carroceria esculpida numa peça só. A forma é um
 * "pão" contínuo: em cada fatia ao longo do comprimento, uma superelipse entre o chão da
 * carroceria (que sobe em arco por cima de cada roda: os para-lamas) e o teto (capô, para-brisa,
 * teto e porta-malas numa curva só), arredondada nas pontas. As janelas, faixas, bochechas e a
 * boquinha são decalques que seguem a superfície (cantos redondos, bordas limpas), e a pintura
 * de duas cores corta a malha numa linha (sem borrão). Tudo vira um VertexData com cor nos
 * vértices, como os modelos de hoje (uma chamada de desenho por veículo).
 *
 * Eixos do modelo como os de hoje: x para a frente, y para cima, z para a esquerda; o chão em
 * y = 0; medidas no desenho (a escala do jogo vem depois).
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';

export type V3 = [number, number, number];

export interface Forma {
  x0: number;
  x1: number;
  /** Chão da carroceria em x (sobe por cima das rodas). */
  baixo(x: number): number;
  /** Teto em x (capô, para-brisa, teto, vidro de trás, porta-malas). */
  topo(x: number): number;
  /** Meia largura em x e na altura y (o teto estreita: a cabine). */
  meia(x: number, y: number): number;
  /** Expoente das pontas (frente e traseira; maior = mais rombudo). */
  ponta: number;
  /** Expoente da fatia (2 = elipse, 4 = quase caixa). */
  n: number;
  /**
   * Caixas de roda: dentro do círculo (x, y, r) a lateral entra até a meia largura `dentro` (a
   * roda fica num vão escuro da lataria, como num carrinho de verdade).
   */
  pocos?: { x: number; y: number; r: number; dentro: number }[];
}

/** O fundo da caixa de roda (cinza escuro). */
export const COR_POCO = '#3a3b45';
/** Quanto do poço vale em (x, y): 1 dentro, 0 fora, com a borda macia. */
export function noPoco(f: Forma, x: number, y: number): { t: number; dentro: number } {
  let melhor = { t: 0, dentro: 9 };
  for (const p of f.pocos ?? []) {
    const d = Math.hypot(x - p.x, y - p.y);
    const t = 1 - suave(p.r - 0.06, p.r, d);
    if (t > melhor.t) melhor = { t, dentro: p.dentro };
  }
  return melhor;
}

const sgn = (v: number) => (v < 0 ? -1 : 1);
const pw = (v: number, e: number) => sgn(v) * Math.pow(Math.abs(v), e);
export const suave = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Curva por pontos (x, y) com subida suave entre eles (patamares nos pontos). */
export function curva(pts: [number, number][]): (x: number) => number {
  return (x) => {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      const [xa, ya] = pts[i - 1];
      const [xb, yb] = pts[i];
      if (x <= xb) return ya + (yb - ya) * suave(xa, xb, x);
    }
    return pts[pts.length - 1][1];
  };
}

/** O chão da carroceria com os para-lamas: arco em volta de cada roda (centro e raio). */
export function chaoComArcos(
  base: number,
  arcos: { x: number; y: number; r: number }[],
): (x: number) => number {
  return (x) => {
    let y = base;
    for (const a of arcos) {
      const d = Math.abs(x - a.x);
      if (d < a.r) y = Math.max(y, a.y + Math.sqrt(a.r * a.r - d * d));
    }
    return y;
  };
}

interface Fatia {
  g: number;
  ym: number;
  hh: number;
}
function fatia(f: Forma, x: number): Fatia {
  const xc = (f.x0 + f.x1) / 2;
  const L = (f.x1 - f.x0) / 2;
  const q = Math.min(1, Math.abs(x - xc) / L);
  const g = Math.pow(Math.max(0, 1 - Math.pow(q, f.ponta)), 1 / f.ponta);
  const yb = f.baixo(x);
  const yt = f.topo(x);
  return { g, ym: (yb + yt) / 2, hh: (yt - yb) / 2 };
}

/** Ponto da superfície na fatia x, no ângulo φ (−π/2 embaixo, π/2 em cima) do lado `lado`. */
function pontoDaFatia(f: Forma, x: number, fa: Fatia, phi: number, lado: number): V3 {
  const s = Math.sin(phi);
  const c = Math.cos(phi);
  const ey = pw(s, 2 / f.n);
  const ez = Math.pow(Math.max(0, c), 2 / f.n);
  const y = fa.ym + fa.hh * fa.g * ey;
  let z = lado * f.meia(x, y) * fa.g * ez;
  const po = noPoco(f, x, y);
  if (po.t > 0 && Math.abs(z) > po.dentro) z = Math.sign(z) * (Math.abs(z) - (Math.abs(z) - po.dentro) * po.t);
  return [x, y, z];
}

/** A conta implícita: < 0 dentro, 0 na superfície. */
function campo(f: Forma, x: number, y: number, z: number): number {
  const fa = fatia(f, x);
  if (fa.g <= 1e-4 || fa.hh <= 1e-4) return 1;
  const ey = (y - fa.ym) / (fa.hh * fa.g);
  const ez = z / (f.meia(x, y) * fa.g);
  return Math.pow(Math.abs(ey), f.n) + Math.pow(Math.abs(ez), f.n) - 1;
}

/** Normal para fora (gradiente da conta). */
export function normalEm(f: Forma, p: V3): V3 {
  const h = 1e-3;
  const gx = campo(f, p[0] + h, p[1], p[2]) - campo(f, p[0] - h, p[1], p[2]);
  const gy = campo(f, p[0], p[1] + h, p[2]) - campo(f, p[0], p[1] - h, p[2]);
  const gz = campo(f, p[0], p[1], p[2] + h) - campo(f, p[0], p[1], p[2] - h);
  const n = Math.hypot(gx, gy, gz) || 1;
  return [gx / n, gy / n, gz / n];
}

/** Ponto do lado (x, y) → z na superfície (lado ±1); null fora da carroceria. */
export function noLado(f: Forma, x: number, y: number, lado: number): V3 | null {
  const fa = fatia(f, x);
  if (fa.g <= 1e-4) return null;
  const ey = (y - fa.ym) / (fa.hh * fa.g);
  if (Math.abs(ey) >= 1) return null;
  const ez = Math.pow(1 - Math.pow(Math.abs(ey), f.n), 1 / f.n);
  return [x, y, lado * f.meia(x, y) * fa.g * ez];
}

/** Ponto de cima (x, z) → y na superfície; null fora. */
export function emCima(f: Forma, x: number, z: number): V3 | null {
  const fa = fatia(f, x);
  if (fa.g <= 1e-4) return null;
  let y = fa.ym + fa.hh * fa.g;
  for (let k = 0; k < 6; k++) {
    const ez = Math.abs(z) / (f.meia(x, y) * fa.g);
    if (ez >= 1) return null;
    const ey = Math.pow(1 - Math.pow(ez, f.n), 1 / f.n);
    y = fa.ym + fa.hh * fa.g * ey;
  }
  return [x, y, z];
}

/** Ponto da frente (lado = 1) ou de trás (−1) em (y, z) → x na superfície; null fora. */
export function naPonta(f: Forma, y: number, z: number, lado: number): V3 | null {
  const xc = (f.x0 + f.x1) / 2;
  let a = xc;
  let b = lado > 0 ? f.x1 : f.x0;
  if (campo(f, a, y, z) > 0) return null;
  for (let k = 0; k < 30; k++) {
    const m = (a + b) / 2;
    if (campo(f, m, y, z) <= 0) a = m;
    else b = m;
  }
  return [(a + b) / 2, y, z];
}

/** Um pedaço de malha com cor (antes de juntar). */
export class Pecas {
  readonly partes: VertexData[] = [];
  add(vd: VertexData, cor?: string): this {
    vd.uvs = null;
    if (cor) {
      const n = vd.positions!.length / 3;
      const c = Color3.FromHexString(cor).asArray();
      const cores = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) cores.set([c[0], c[1], c[2], 1], i * 4);
      vd.colors = cores;
    }
    this.partes.push(vd);
    return this;
  }
  juntar(): VertexData {
    const [a, ...resto] = this.partes;
    return resto.length ? a.merge(resto, true) : a;
  }
}

/** Faixas de pintura: até a altura `ate` (ou o teto), com tantos passos e a cor. */
export interface Faixa {
  ate: number | null;
  passos: number;
  cor: string | ((x: number, y: number, z: number) => string);
}

/**
 * A carroceria: fatias nos `xs` (mais as pontas), e em cada lado da fatia as faixas de baixo
 * para cima (cada corte de faixa é uma linha da malha: a pintura muda ali, sem borrão). As
 * cores vão por triângulo (o centro dele) e a normal continua suave.
 */
export function carroceria(f: Forma, fatias: number, faixas: Faixa[], extrasX: number[] = []): VertexData {
  // fatias: metade espaçadas por igual, metade mais juntas nas pontas
  const xs: number[] = [];
  for (let i = 0; i <= fatias; i++) {
    const t = i / fatias;
    const u = 0.45 * t + 0.55 * (0.5 - 0.5 * Math.cos(Math.PI * t));
    xs.push(f.x0 + (f.x1 - f.x0) * u);
  }
  for (const x of extrasX) if (x > f.x0 && x < f.x1) xs.push(x);
  xs.sort((a, b) => a - b);
  const xsU = xs.filter((x, i) => i === 0 || x - xs[i - 1] > 1e-3);
  // anéis por lado: φ de −π/2 a π/2, com os cortes das faixas
  const porLado = faixas.reduce((n, fx) => n + fx.passos, 0);
  const anel = porLado * 2;
  const pos: number[] = [];
  const faixaDoAnel: number[] = [];
  for (const x of xsU) {
    const fa = fatia(f, x);
    // φ de cada corte nesta fatia
    const cortes: number[] = [-Math.PI / 2];
    for (const fx of faixas) {
      if (fx.ate === null) cortes.push(Math.PI / 2);
      else {
        const ey = fa.g > 1e-4 ? (fx.ate - fa.ym) / (fa.hh * fa.g) : 0;
        const e = Math.max(-0.999, Math.min(0.999, ey));
        cortes.push(Math.asin(pw(e, f.n / 2)));
      }
    }
    for (let k = 1; k < cortes.length; k++) cortes[k] = Math.max(cortes[k], cortes[k - 1] + 1e-4);
    const phis: number[] = [];
    const quais: number[] = [];
    faixas.forEach((fx, k) => {
      for (let p = 0; p < fx.passos; p++) {
        phis.push(cortes[k] + ((cortes[k + 1] - cortes[k]) * p) / fx.passos);
        quais.push(k);
      }
    });
    // direita (z < 0) de baixo para cima, esquerda de cima para baixo: o anel fecha
    const anelPts: V3[] = [];
    const anelFx: number[] = [];
    for (let p = 0; p < porLado; p++) {
      anelPts.push(pontoDaFatia(f, x, fa, phis[p], -1));
      anelFx.push(quais[p]);
    }
    for (let p = 0; p < porLado; p++) {
      const phi = p === 0 ? Math.PI / 2 : phis[porLado - p];
      anelPts.push(pontoDaFatia(f, x, fa, phi, 1));
      anelFx.push(p === 0 ? faixas.length - 1 : quais[porLado - p]);
    }
    for (const q of anelPts) pos.push(q[0], q[1], q[2]);
    faixaDoAnel.push(...anelFx);
  }
  const idx: number[] = [];
  for (let i = 0; i < xsU.length - 1; i++)
    for (let j = 0; j < anel; j++) {
      const a = i * anel + j;
      const b = i * anel + ((j + 1) % anel);
      const c = (i + 1) * anel + j;
      const d = (i + 1) * anel + ((j + 1) % anel);
      idx.push(a, c, b, b, c, d);
    }
  const normais: number[] = [];
  VertexData.ComputeNormals(pos, idx, normais);
  // para fora? confere num ponto do lado
  const meio = Math.floor(xsU.length / 2) * anel + Math.floor(porLado / 2);
  const nf = normalEm(f, [pos[meio * 3], pos[meio * 3 + 1], pos[meio * 3 + 2]]);
  if (normais[meio * 3] * nf[0] + normais[meio * 3 + 1] * nf[1] + normais[meio * 3 + 2] * nf[2] < 0) {
    for (let k = 0; k < idx.length; k += 3) [idx[k + 1], idx[k + 2]] = [idx[k + 2], idx[k + 1]];
    for (let k = 0; k < normais.length; k++) normais[k] = -normais[k];
  }
  // desfaz os índices: cada triângulo com a cor do seu centro (normais suaves copiadas)
  const P: number[] = [];
  const N: number[] = [];
  const C: number[] = [];
  const I: number[] = [];
  const cache = new Map<string, number[]>();
  const corDe = (c: string) => {
    let v = cache.get(c);
    if (!v) cache.set(c, (v = Color3.FromHexString(c).asArray()));
    return v;
  };
  for (let k = 0; k < idx.length; k += 3) {
    const [a, b, c] = [idx[k], idx[k + 1], idx[k + 2]];
    const cx = (pos[a * 3] + pos[b * 3] + pos[c * 3]) / 3;
    const cy = (pos[a * 3 + 1] + pos[b * 3 + 1] + pos[c * 3 + 1]) / 3;
    const cz = (pos[a * 3 + 2] + pos[b * 3 + 2] + pos[c * 3 + 2]) / 3;
    // a faixa do triângulo: a mais baixa entre os anéis dele (o corte é a linha de cima)
    const fx = Math.min(faixaDoAnel[a], faixaDoAnel[b], faixaDoAnel[c]);
    const fxMax = Math.max(faixaDoAnel[a], faixaDoAnel[b], faixaDoAnel[c]);
    const qual = fxMax - fx > 1 ? fxMax : fx;
    const tinta = faixas[qual].cor;
    const poco = noPoco(f, cx, cy).t > 0.5;
    const rgb = corDe(poco ? COR_POCO : typeof tinta === 'string' ? tinta : tinta(cx, cy, cz));
    for (const v of [a, b, c]) {
      I.push(P.length / 3);
      P.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
      N.push(normais[v * 3], normais[v * 3 + 1], normais[v * 3 + 2]);
      C.push(rgb[0], rgb[1], rgb[2], 1);
    }
  }
  const vd = new VertexData();
  vd.positions = P;
  vd.normals = N;
  vd.colors = C;
  vd.indices = I;
  return vd;
}

/** Retângulo de cantos redondos no espaço (u, v) do decalque. */
export interface Recorte {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
  /** Raio dos cantos (nas unidades de u e v). */
  r: number;
}

/**
 * Decalque na superfície: uma grade (nu × nv) dentro do recorte, cada ponto levado à
 * superfície por `onde(u, v)` e afastado um tiquinho para fora (sem brigar com a pintura).
 * Cantos redondos: cada linha da grade encolhe nas pontas.
 */
export function decalque(
  f: Forma,
  rc: Recorte,
  onde: (u: number, v: number) => V3 | null,
  cor: string,
  nu = 8,
  nv = 4,
  afasta = 0.012,
): VertexData | null {
  const P: number[] = [];
  const grade: (number | null)[][] = [];
  for (let j = 0; j <= nv; j++) {
    const v = rc.v0 + ((rc.v1 - rc.v0) * j) / nv;
    // encolhe a linha nos cantos
    const dv = Math.min(v - rc.v0, rc.v1 - v);
    const r = Math.min(rc.r, (rc.u1 - rc.u0) / 2, (rc.v1 - rc.v0) / 2);
    const enc = dv < r ? r - Math.sqrt(Math.max(0, r * r - (r - dv) * (r - dv))) : 0;
    const linha: (number | null)[] = [];
    for (let i = 0; i <= nu; i++) {
      const u = rc.u0 + enc + ((rc.u1 - rc.u0 - 2 * enc) * i) / nu;
      const p = onde(u, v);
      if (!p) {
        linha.push(null);
        continue;
      }
      const n = normalEm(f, p);
      linha.push(P.length / 3);
      P.push(p[0] + n[0] * afasta, p[1] + n[1] * afasta, p[2] + n[2] * afasta);
    }
    grade.push(linha);
  }
  const I: number[] = [];
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const a = grade[j][i];
      const b = grade[j][i + 1];
      const c = grade[j + 1][i];
      const d = grade[j + 1][i + 1];
      if (a === null || b === null || c === null || d === null) continue;
      I.push(a, c, b, b, c, d);
    }
  if (!I.length) return null;
  const N: number[] = [];
  VertexData.ComputeNormals(P, I, N);
  // virado para fora?
  const k0 = I[0];
  const nf = normalEm(f, [P[k0 * 3], P[k0 * 3 + 1], P[k0 * 3 + 2]]);
  if (N[k0 * 3] * nf[0] + N[k0 * 3 + 1] * nf[1] + N[k0 * 3 + 2] * nf[2] < 0) {
    for (let k = 0; k < I.length; k += 3) [I[k + 1], I[k + 2]] = [I[k + 2], I[k + 1]];
    for (let k = 0; k < N.length; k++) N[k] = -N[k];
  }
  const vd = new VertexData();
  vd.positions = P;
  vd.normals = N;
  vd.indices = I;
  const c = Color3.FromHexString(cor).asArray();
  vd.colors = Array.from({ length: P.length / 3 }, () => [c[0], c[1], c[2], 1]).flat();
  return vd;
}

/** Tubinho por uma linha de pontos (a boquinha), redondo, com as pontas fechadas. */
export function tubo(pts: V3[], raio: number, cor: string, lados = 6): VertexData {
  const P: number[] = [];
  const I: number[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    let t: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const lt = Math.hypot(...t) || 1;
    t = [t[0] / lt, t[1] / lt, t[2] / lt];
    // base perpendicular: com o "para a frente" (x) do modelo
    // perpendicular ao fio, de lado (o fio corre no plano da frente)
    let u: V3 = [0, t[2], -t[1]];
    const lu = Math.hypot(...u) || 1;
    u = [u[0] / lu, u[1] / lu, u[2] / lu];
    const w: V3 = [t[1] * u[2] - t[2] * u[1], t[2] * u[0] - t[0] * u[2], t[0] * u[1] - t[1] * u[0]];
    for (let k = 0; k < lados; k++) {
      const ang = (k / lados) * Math.PI * 2;
      const cs = Math.cos(ang) * raio;
      const sn = Math.sin(ang) * raio;
      P.push(
        pts[i][0] + u[0] * cs + w[0] * sn,
        pts[i][1] + u[1] * cs + w[1] * sn,
        pts[i][2] + u[2] * cs + w[2] * sn,
      );
    }
  }
  for (let i = 0; i < n - 1; i++)
    for (let k = 0; k < lados; k++) {
      const a = i * lados + k;
      const b = i * lados + ((k + 1) % lados);
      const c = (i + 1) * lados + k;
      const d = (i + 1) * lados + ((k + 1) % lados);
      I.push(a, b, c, b, d, c);
    }
  // tampinhas
  for (const [i, s] of [
    [0, 1],
    [n - 1, -1],
  ]) {
    const centro = P.length / 3;
    P.push(...pts[i]);
    for (let k = 0; k < lados; k++) {
      const a = i * lados + k;
      const b = i * lados + ((k + 1) % lados);
      if (s > 0) I.push(centro, b, a);
      else I.push(centro, a, b);
    }
  }
  const N: number[] = [];
  VertexData.ComputeNormals(P, I, N);
  const vd = new VertexData();
  vd.positions = P;
  vd.indices = I;
  vd.normals = N;
  const c = Color3.FromHexString(cor).asArray();
  vd.colors = Array.from({ length: P.length / 3 }, () => [c[0], c[1], c[2], 1]).flat();
  return vd;
}
