/**
 * Régua do encaixe (spec 017, T01): mede, no plano do boneco (sem 3D), a distância entre cada
 * enfeite (peça com `apoio`) e a parte do corpo onde ele se apoia, se ele cobre o rosto e se o
 * cabelo atravessa um chapéu. Serve para os acessórios de hoje e para as fantasias da 017:
 * basta marcar as peças novas com `apoio`.
 *
 * Como mede: cada peça vira uma "distância até a superfície" (negativa dentro dela), igual à
 * malha que o render/boneco.ts monta (caixa de cantos redondos, esfera esticada, cilindro de
 * dois raios e anel). A distância entre duas peças é o menor valor dessa conta nos pontos da
 * superfície de uma, olhando da outra também (os dois lados).
 */
import {
  rotacoesDaPose,
  type Junta,
  type Peca,
  type PlanoBoneco,
} from '../../src/personagem/boneco';
import { GESTOS, aplicarGesto } from '../../src/personagem/gestos';
import { calcularPose, type EntradaPose, type Pose } from '../../src/personagem/poses';
import { AMPLITUDE_ANDAR, AMPLITUDE_CORRER } from '../../src/personagem/vida';

type V3 = [number, number, number];

/**
 * Folga máxima entre um enfeite e o apoio, em medidas do plano (antes da escala 1,15).
 * 0,015 é menos que a espessura da aba mais fina (0,04) e cerca de 2% da largura da cabeça
 * (0,72): na câmera do jogo e nas fotos do editor isso fica abaixo de um pixel ou dois; os
 * vãos que o dono viu eram de 0,04 em diante.
 */
export const FOLGA_MAXIMA = 0.015;

/** Peças do cabelo (o que um chapéu precisa cobrir sem ser atravessado). */
export const EH_CABELO = /^(cabelo|nuca|topete|franja|lado|costas|cacho|rabo|coque|tranca|chanel)/;
/** Peças do rosto que nenhum enfeite pode tapar. */
export const EH_ROSTO = /^(olho|brilho|cilio|boca|bochecha)/;

/** Peças que servem de apoio para cada tipo de enfeite. */
const JUNTAS_APOIO: Record<NonNullable<Peca['apoio']>, Junta[]> = {
  cabeca: ['cabeca', 'topete'],
  tronco: ['tronco'],
  mao: ['maoE', 'maoD'],
  braco: ['bracoE', 'bracoD', 'maoE', 'maoD'],
  perna: ['pernaE', 'pernaD'],
};

/** Giro de cada junta numa pose (rad, x/y/z); sem nada, o boneco parado. */
export type GirosJuntas = Partial<Record<Junta, V3>>;
/** Escala de cada junta numa pose (a saia abre, spec 017); sem nada, 1. */
export type EscalasJuntas = Partial<Record<Junta, V3>>;

/** Passos da peça até o corpo: cada um põe o ponto no espaço do pai (escala, gira e desloca). */
function cadeia(
  plano: PlanoBoneco,
  p: Peca,
  giros: GirosJuntas,
  escalas: EscalasJuntas = {},
): Array<{ pos: V3; rot?: V3; esc?: V3 }> {
  const passos: Array<{ pos: V3; rot?: V3; esc?: V3 }> = [{ pos: p.pos, rot: p.rot }];
  for (let j: Junta | null = p.junta; j; j = plano.juntas[j].pai)
    passos.push({ pos: plano.juntas[j].pos, rot: giros[j], esc: escalas[j] });
  return passos;
}

/** Rotação como no Babylon (z, depois x, depois y). */
function girar(v: V3, r: V3 | undefined, inversa: boolean): V3 {
  if (!r) return v;
  const [rx, ry, rz] = r;
  const rotZ = (p: V3, a: number): V3 => [
    p[0] * Math.cos(a) - p[1] * Math.sin(a),
    p[0] * Math.sin(a) + p[1] * Math.cos(a),
    p[2],
  ];
  const rotX = (p: V3, a: number): V3 => [
    p[0],
    p[1] * Math.cos(a) - p[2] * Math.sin(a),
    p[1] * Math.sin(a) + p[2] * Math.cos(a),
  ];
  const rotY = (p: V3, a: number): V3 => [
    p[0] * Math.cos(a) + p[2] * Math.sin(a),
    p[1],
    -p[0] * Math.sin(a) + p[2] * Math.cos(a),
  ];
  if (!inversa) return rotY(rotX(rotZ(v, rz), rx), ry);
  return rotZ(rotX(rotY(v, -ry), -rx), -rz);
}

const comp = (x: number, y: number) => Math.hypot(x, y);

/** Distância (com sinal) de um ponto local até a superfície da peça. */
function distanciaLocal(p: Peca, q: V3): number {
  const [x, y, z] = q;
  if (p.forma === 'malha') {
    // spec 027: o pano fino (a gola, a cúpula, o sino): a distância até o triângulo mais perto,
    // menos meia espessura de pano (nunca "dentro": é uma casca)
    const P = p.malha?.pos ?? [];
    const I = p.malha?.ind ?? [];
    let d = Infinity;
    for (let i = 0; i < I.length; i += 3) {
      const a: V3 = [P[I[i] * 3], P[I[i] * 3 + 1], P[I[i] * 3 + 2]];
      const b: V3 = [P[I[i + 1] * 3], P[I[i + 1] * 3 + 1], P[I[i + 1] * 3 + 2]];
      const c: V3 = [P[I[i + 2] * 3], P[I[i + 2] * 3 + 1], P[I[i + 2] * 3 + 2]];
      d = Math.min(d, distanciaTriangulo(q, a, b, c));
    }
    return d - 0.008;
  }
  if (p.forma === 'caixa') {
    const meio = [p.tamanho[0] / 2, p.tamanho[1] / 2, p.tamanho[2] / 2];
    const r = Math.max(0, Math.min(p.raio ?? 0.05, ...meio));
    const d = [Math.abs(x) - meio[0] + r, Math.abs(y) - meio[1] + r, Math.abs(z) - meio[2] + r];
    const fora = Math.hypot(Math.max(d[0], 0), Math.max(d[1], 0), Math.max(d[2], 0));
    return fora + Math.min(Math.max(d[0], d[1], d[2]), 0) - r;
  }
  if (p.forma === 'esfera') {
    const [a, b, c] = p.tamanho;
    const k0 = Math.hypot(x / a, y / b, z / c);
    const k1 = Math.hypot(x / (a * a), y / (b * b), z / (c * c));
    return k1 === 0 ? -Math.min(a, b, c) : (k0 * (k0 - 1)) / k1;
  }
  if (p.forma === 'cilindro') {
    // cone cortado (iq): altura, raio de baixo, raio de cima
    const h = p.tamanho[0] / 2;
    const r1 = p.tamanho[1];
    const r2 = p.tamanho[2];
    const qx = comp(x, z);
    const qy = y;
    const k2x = r2 - r1;
    const k2y = 2 * h;
    const cax = qx - Math.min(qx, qy < 0 ? r1 : r2);
    const cay = Math.abs(qy) - h;
    const t = Math.max(
      0,
      Math.min(1, ((r2 - qx) * k2x + (h - qy) * k2y) / (k2x * k2x + k2y * k2y)),
    );
    const cbx = qx - r2 + k2x * t;
    const cby = qy - h + k2y * t;
    const s = cbx < 0 && cay < 0 ? -1 : 1;
    return s * Math.sqrt(Math.min(cax * cax + cay * cay, cbx * cbx + cby * cby));
  }
  if (p.forma === 'placa') {
    const d2 = distanciaPoligono(p.perfil ?? [], x, y);
    const dz = Math.abs(z) - p.tamanho[2] / 2;
    return Math.min(Math.max(d2, dz), 0) + Math.hypot(Math.max(d2, 0), Math.max(dz, 0));
  }
  // anel deitado no plano xz (como o CreateTorus); com arco, só a parte centrada em +z
  const R = p.tamanho[0] / 2;
  const r = p.tamanho[1] / 2;
  const arco = p.tamanho[2];
  if (arco > 0 && arco < Math.PI * 2) {
    const a = Math.atan2(z, x);
    let dif = a - Math.PI / 2;
    dif = Math.atan2(Math.sin(dif), Math.cos(dif));
    if (Math.abs(dif) > arco / 2) {
      // fora do arco: a distância até a ponta mais perto (o tubo termina reto)
      let d = Infinity;
      for (const s of [-1, 1]) {
        const t = Math.PI / 2 + (s * arco) / 2;
        d = Math.min(d, Math.hypot(x - R * Math.cos(t), y, z - R * Math.sin(t)) - r);
      }
      return d;
    }
  }
  return comp(comp(x, z) - R, y) - r;
}

/** Distância de um ponto até um triângulo (o ponto mais perto dele, pelas regiões de Voronoi). */
function distanciaTriangulo(p: V3, a: V3, b: V3, c: V3): number {
  const sub = (u: V3, v: V3): V3 => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
  const dot = (u: V3, v: V3) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const ab = sub(b, a);
  const ac = sub(c, a);
  const ap = sub(p, a);
  const d1 = dot(ab, ap);
  const d2 = dot(ac, ap);
  const em = (q: V3) => Math.hypot(...sub(p, q));
  if (d1 <= 0 && d2 <= 0) return em(a);
  const bp = sub(p, b);
  const d3 = dot(ab, bp);
  const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return em(b);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    return em([a[0] + ab[0] * v, a[1] + ab[1] * v, a[2] + ab[2] * v]);
  }
  const cp = sub(p, c);
  const d5 = dot(ab, cp);
  const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return em(c);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    return em([a[0] + ac[0] * w, a[1] + ac[1] * w, a[2] + ac[2] * w]);
  }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    return em([b[0] + (c[0] - b[0]) * w, b[1] + (c[1] - b[1]) * w, b[2] + (c[2] - b[2]) * w]);
  }
  const den = 1 / (va + vb + vc);
  const v = vb * den;
  const w = vc * den;
  return em([a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w]);
}

/** Distância (com sinal) de um ponto do plano até o contorno (negativa dentro). */
function distanciaPoligono(pts: Array<[number, number]>, x: number, y: number): number {
  const n = pts.length;
  if (!n) return Infinity;
  let d = (x - pts[0][0]) ** 2 + (y - pts[0][1]) ** 2;
  let s = 1;
  for (let i = 0, j = n - 1; i < n; j = i, i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    const ex = xj - xi;
    const ey = yj - yi;
    const wx = x - xi;
    const wy = y - yi;
    const t = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey || 1)));
    const bx = wx - ex * t;
    const by = wy - ey * t;
    d = Math.min(d, bx * bx + by * by);
    const c1 = y >= yi;
    const c2 = y < yj;
    const c3 = ex * wy > ey * wx;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
  }
  return s * Math.sqrt(d);
}

/** O ponto está dentro do contorno? */
export function dentroDoPerfil(pts: Array<[number, number]>, x: number, y: number): boolean {
  return distanciaPoligono(pts, x, y) < 0;
}

/** Pontos na superfície da peça (no próprio espaço dela). */
function pontosLocais(p: Peca, n = 10): V3[] {
  const pts: V3[] = [];
  if (p.forma === 'malha') {
    // spec 027: os vértices do pano (um de cada dois, para não pesar)
    const P = p.malha?.pos ?? [];
    for (let i = 0; i < P.length; i += 6) pts.push([P[i], P[i + 1], P[i + 2]]);
    return pts;
  }
  if (p.forma === 'caixa') {
    const meio: V3 = [p.tamanho[0] / 2, p.tamanho[1] / 2, p.tamanho[2] / 2];
    const r = Math.max(0, Math.min(p.raio ?? 0.05, ...meio));
    const dentro = meio.map((m) => m - r);
    for (let eixo = 0; eixo < 3; eixo++)
      for (const s of [-1, 1])
        for (let i = 0; i <= n; i++)
          for (let j = 0; j <= n; j++) {
            const u = (eixo + 1) % 3;
            const v = (eixo + 2) % 3;
            const c: V3 = [0, 0, 0];
            c[eixo] = s * meio[eixo];
            c[u] = (i / n) * 2 * meio[u] - meio[u];
            c[v] = (j / n) * 2 * meio[v] - meio[v];
            const q = c.map((x, k) => Math.max(-dentro[k], Math.min(dentro[k], x))) as V3;
            const d: V3 = [c[0] - q[0], c[1] - q[1], c[2] - q[2]];
            const l = Math.hypot(...d);
            pts.push(
              l < 1e-9 ? c : [q[0] + (d[0] / l) * r, q[1] + (d[1] / l) * r, q[2] + (d[2] / l) * r],
            );
          }
    return pts;
  }
  if (p.forma === 'esfera') {
    const [a, b, c] = p.tamanho;
    for (let i = 0; i <= n; i++) {
      const fi = (i / n) * Math.PI - Math.PI / 2;
      for (let j = 0; j < 2 * n; j++) {
        const te = (j / (2 * n)) * Math.PI * 2;
        pts.push([
          a * Math.cos(fi) * Math.cos(te),
          b * Math.sin(fi),
          c * Math.cos(fi) * Math.sin(te),
        ]);
      }
    }
    return pts;
  }
  if (p.forma === 'cilindro') {
    const h = p.tamanho[0] / 2;
    const [, r1, r2] = p.tamanho;
    for (let j = 0; j < 2 * n; j++) {
      const te = (j / (2 * n)) * Math.PI * 2;
      const cx = Math.cos(te);
      const cz = Math.sin(te);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const r = r1 + (r2 - r1) * t;
        pts.push([r * cx, -h + 2 * h * t, r * cz]);
        pts.push([r1 * t * cx, -h, r1 * t * cz]);
        pts.push([r2 * t * cx, h, r2 * t * cz]);
      }
    }
    return pts;
  }
  if (p.forma === 'placa') {
    const per = p.perfil ?? [];
    const h = p.tamanho[2] / 2;
    // a borda (nas duas faces e no meio) e uma grade dentro das faces
    for (let i = 0; i < per.length; i++) {
      const [x0, y0] = per[i];
      const [x1, y1] = per[(i + 1) % per.length];
      const passos = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.03));
      for (let k = 0; k < passos; k++) {
        const t = k / passos;
        for (const z of [-h, 0, h]) pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z]);
      }
    }
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const [x, y] of per) {
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
    for (let i = 0; i <= n; i++)
      for (let j = 0; j <= n; j++) {
        const x = x0 + ((x1 - x0) * i) / n;
        const y = y0 + ((y1 - y0) * j) / n;
        if (dentroDoPerfil(per, x, y)) for (const z of [-h, h]) pts.push([x, y, z]);
      }
    return pts;
  }
  const R = p.tamanho[0] / 2;
  const r = p.tamanho[1] / 2;
  const arco = p.tamanho[2] > 0 && p.tamanho[2] < Math.PI * 2 ? p.tamanho[2] : 0;
  for (let j = 0; j < 2 * n; j++) {
    const te = arco
      ? Math.PI / 2 - arco / 2 + (j / (2 * n - 1)) * arco
      : (j / (2 * n)) * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const fi = (i / n) * Math.PI * 2;
      const rr = R + r * Math.cos(fi);
      pts.push([rr * Math.cos(te), r * Math.sin(fi), rr * Math.sin(te)]);
    }
  }
  return pts;
}

/** Uma peça pronta para medir: onde está no boneco parado e seus pontos de superfície. */
export interface PecaMedida {
  peca: Peca;
  centro: V3;
  pontos: V3[];
  min: V3;
  max: V3;
  distancia(q: V3): number;
  /** Ponto do espaço da peça para o boneco. */
  paraFora(q: V3): V3;
  /** Ponto do boneco para o espaço da peça. */
  paraDentro(q: V3): V3;
}

export function medirPeca(
  plano: PlanoBoneco,
  p: Peca,
  giros: GirosJuntas = {},
  n = 10,
  escalas: EscalasJuntas = {},
): PecaMedida {
  const passos = cadeia(plano, p, giros, escalas);
  // como no Babylon: o filho é escalado, girado e deslocado no espaço do pai
  const paraFora = (q: V3): V3 => {
    let g = q;
    for (const s of passos) {
      if (s.esc) g = [g[0] * s.esc[0], g[1] * s.esc[1], g[2] * s.esc[2]];
      g = girar(g, s.rot, false);
      g = [g[0] + s.pos[0], g[1] + s.pos[1], g[2] + s.pos[2]];
    }
    return g;
  };
  const paraDentro = (q: V3): V3 => {
    let g = q;
    for (let i = passos.length - 1; i >= 0; i--) {
      const s = passos[i];
      g = girar([g[0] - s.pos[0], g[1] - s.pos[1], g[2] - s.pos[2]], s.rot, true);
      if (s.esc) g = [g[0] / s.esc[0], g[1] / s.esc[1], g[2] / s.esc[2]];
    }
    return g;
  };
  const centro = paraFora([0, 0, 0]);
  const pontos = pontosLocais(p, n).map(paraFora);
  const min: V3 = [Infinity, Infinity, Infinity];
  const max: V3 = [-Infinity, -Infinity, -Infinity];
  for (const q of pontos)
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], q[k]);
      max[k] = Math.max(max[k], q[k]);
    }
  return {
    peca: p,
    centro,
    pontos,
    min,
    max,
    distancia: (q) => distanciaLocal(p, paraDentro(q)),
    paraFora,
    paraDentro,
  };
}

/** Distância entre duas peças (negativa quando uma entra na outra). */
export function distanciaEntre(a: PecaMedida, b: PecaMedida, limite = Infinity): number {
  // as caixas envolventes já separadas por mais que o limite: nem precisa olhar ponto a ponto
  let vao = 0;
  for (let k = 0; k < 3; k++) vao = Math.max(vao, a.min[k] - b.max[k], b.min[k] - a.max[k]);
  if (vao > limite) return vao;
  let d = Infinity;
  for (const q of a.pontos) d = Math.min(d, b.distancia(q));
  for (const q of b.pontos) d = Math.min(d, a.distancia(q));
  return d;
}

export interface ProblemaEncaixe {
  tipo: 'solto' | 'escondido' | 'rosto' | 'cabelo';
  peca: string;
  /** solto: a folga; escondido: 0; rosto: peça do rosto tapada; cabelo: quanto sai do chapéu. */
  medida: number;
  outra?: string;
}

/**
 * Confere os enfeites do plano:
 * - solto: cada enfeite encosta (folga ≤ FOLGA_MAXIMA) no apoio ou noutra peça do mesmo enfeite
 *   que já está presa (a copa na aba, a aba no cabelo);
 * - escondido: o enfeite não pode sumir inteiro dentro do apoio (afundado demais);
 * - rosto: nenhum enfeite da cabeça tapa olhos, cílios, boca ou bochechas;
 * - cabelo: nenhum fio de cabelo fica por cima de um enfeite da cabeça (atravessando o chapéu,
 *   o capacete ou o capuz).
 */
export function conferirEncaixe(plano: PlanoBoneco, folgaMaxima = FOLGA_MAXIMA): ProblemaEncaixe[] {
  const problemas: ProblemaEncaixe[] = [];
  const medidas = plano.pecas.map((p) => medirPeca(plano, p));
  const enfeites = medidas.filter((m) => m.peca.apoio);
  for (const tipo of ['cabeca', 'tronco', 'mao'] as const) {
    const meus = enfeites.filter((m) => m.peca.apoio === tipo);
    if (!meus.length) continue;
    const apoio = medidas.filter((m) => !m.peca.apoio && JUNTAS_APOIO[tipo].includes(m.peca.junta));
    // presos: começa pelo que encosta no apoio e vai puxando o que encosta nos presos
    const folga = new Map<PecaMedida, number>();
    for (const e of meus) {
      let d = Infinity;
      for (const s of apoio) d = Math.min(d, distanciaEntre(e, s, Math.min(d, 0.2)));
      folga.set(e, d);
    }
    const presos = new Set(meus.filter((e) => folga.get(e)! <= folgaMaxima));
    let mudou = true;
    while (mudou) {
      mudou = false;
      for (const e of meus) {
        if (presos.has(e)) continue;
        for (const p of presos) {
          const d = distanciaEntre(e, p, 0.2);
          folga.set(e, Math.min(folga.get(e)!, d));
          if (d <= folgaMaxima) {
            presos.add(e);
            mudou = true;
            break;
          }
        }
      }
    }
    for (const e of meus) {
      if (!presos.has(e))
        problemas.push({ tipo: 'solto', peca: e.peca.nome, medida: folga.get(e)! });
      // escondido: todo ponto dele fica dentro do apoio
      const visivel = e.pontos.some((q) => apoio.every((s) => s.distancia(q) > -0.002));
      if (!visivel) problemas.push({ tipo: 'escondido', peca: e.peca.nome, medida: 0 });
    }
    if (tipo !== 'cabeca') continue;
    for (const r of medidas.filter((m) => EH_ROSTO.test(m.peca.nome)))
      for (const e of meus) {
        // vidro (a bolha do capacete): o rosto aparece através dele
        if ((e.peca.alfa ?? 1) < 1) continue;
        const dentro = r.pontos.filter((q) => e.distancia(q) < -0.002).length;
        if (dentro > r.pontos.length * 0.1)
          problemas.push({ tipo: 'rosto', peca: e.peca.nome, medida: dentro, outra: r.peca.nome });
      }
    // cabelo atravessando: a peça de cabelo entra num enfeite que cobre a cabeça (passa do
    // alto dela: chapéu, capacete, capuz, coroa) e sai por cima dele (um ponto dela fora dos
    // enfeites, com o enfeite logo abaixo). Cabelo por cima do que não cobre a cabeça (a
    // franja acima dos óculos, o cabelo caindo sobre um lenço ou uma gola) não conta.
    const pele = medidas.find((m) => m.peca.nome === 'cabeca' && m.peca.junta === 'cabeca');
    const topoCabeca = pele ? pele.max[1] : -Infinity;
    for (const c of medidas.filter((m) => !m.peca.apoio && EH_CABELO.test(m.peca.nome))) {
      const cruzados = meus.filter(
        (e) => e.max[1] > topoCabeca && c.pontos.some((q) => e.distancia(q) < -0.002),
      );
      if (!cruzados.length) continue;
      let pior = 0;
      for (const q of c.pontos) {
        if (meus.some((e) => e.distancia(q) < 0)) continue;
        for (const e of cruzados) {
          if (q[1] < e.min[1] || q[1] > e.max[1] + 0.3) continue;
          // desce até 0,3 procurando o enfeite por baixo do fio
          for (let dy = 0.01; dy <= 0.3; dy += 0.01)
            if (e.distancia([q[0], q[1] - dy, q[2]]) < 0) {
              pior = Math.max(pior, dy);
              break;
            }
        }
      }
      if (pior > folgaMaxima) problemas.push({ tipo: 'cabelo', peca: c.peca.nome, medida: pior });
    }
  }
  return problemas;
}

export interface ProblemaMembro {
  tipo: 'membro' | 'quadril';
  /** A junta que se soltou (bracoD, pernaE, cabeca...). */
  junta: Junta;
  /** O vão medido. */
  medida: number;
}

/** Peças de cada membro (as que se mexem com ele) e a peça do tronco onde ele encaixa. */
const MEMBROS: Array<{ junta: Junta; pecas: RegExp }> = [
  { junta: 'bracoE', pecas: /^bracoE-(manga|ombro)$/ },
  { junta: 'bracoD', pecas: /^bracoD-(manga|ombro)$/ },
  { junta: 'pernaE', pecas: /^pernaE-perna$/ },
  { junta: 'pernaD', pecas: /^pernaD-perna$/ },
  { junta: 'cabeca', pecas: /^cabeca$/ },
];
const NO_TRONCO = /^(peito|quadril)$/;

/**
 * Braços, pernas e cabeça presos no tronco numa pose (spec 017, T01, pedido do dono: nada de
 * membro solto, nem no jogador, nem nos amigos, nem nos moradores):
 * - membro: o braço (com o ombro), a perna e a cabeça encostam no tronco (vão ≤ folga);
 * - quadril: a boca de cima da perna fica escondida no quadril (nenhum ponto da tampa de cima
 *   da perna aparece fora do tronco), para não abrir uma fresta quando a perna balança.
 */
export function conferirMembros(
  plano: PlanoBoneco,
  giros: GirosJuntas,
  folgaMaxima = FOLGA_MAXIMA,
): ProblemaMembro[] {
  const problemas: ProblemaMembro[] = [];
  const tronco = plano.pecas
    .filter((p) => p.junta === 'tronco' && NO_TRONCO.test(p.nome))
    .map((p) => medirPeca(plano, p, giros, 8));
  for (const m of MEMBROS) {
    const pecas = plano.pecas
      .filter((p) => m.pecas.test(p.nome))
      .map((p) => medirPeca(plano, p, giros, 8));
    if (!pecas.length) continue;
    let vao = Infinity;
    for (const a of pecas) for (const b of tronco) vao = Math.min(vao, distanciaEntre(a, b, vao));
    if (vao > folgaMaxima) problemas.push({ tipo: 'membro', junta: m.junta, medida: vao });
    if (!m.junta.startsWith('perna')) continue;
    const perna = pecas[0];
    const [w, h, d] = perna.peca.tamanho;
    let pior = 0;
    // a tampa de cima, um pouco para dentro dos cantos redondos (o que dá para ver de fora)
    const r = Math.min(perna.peca.raio ?? 0.05, w / 2, d / 2);
    for (let i = 0; i <= 6; i++)
      for (let k = 0; k <= 6; k++) {
        const q = perna.paraFora([(i / 6 - 0.5) * (w - r), h / 2, (k / 6 - 0.5) * (d - r)]);
        const dist = Math.min(...tronco.map((t) => t.distancia(q)));
        pior = Math.max(pior, dist);
      }
    if (pior > folgaMaxima) problemas.push({ tipo: 'quadril', junta: m.junta, medida: pior });
  }
  return problemas;
}

export interface ProblemaBalanco {
  tipo: 'saia' | 'capa' | 'rabo';
  /** A peça do boneco que entrou (perna, braço, tronco, cabelo). */
  peca: string;
  /** A peça que balança (pano da capa, sino da saia, bola do rabo). */
  outra: string;
  /** Quanto entrou. */
  medida: number;
}

/** Pernas (com sapato e bota), braços (com a mão) e o tronco: o que a capa não pode cortar. */
const EH_PERNA = /^perna[ED]-(perna|sapato|bota)/;
const EH_BRACO = /^braco[ED]-(manga|ombro|punho|mao|bufante|dragona|xadrez)/;

/**
 * Capa, saia e rabo balançando sem atravessar o boneco (spec 017, pedido do dono), numa pose:
 * - saia: nenhum ponto da perna (nem do sapato) sai pela parede da saia; sair pela barra pode
 *   (as pernas balançam por dentro e aparecem embaixo);
 * - capa: nenhum ponto das pernas, dos braços, do tronco (e das peças dele) nem do cabelo fica
 *   atrás da frente do pano da capa (a capa nunca corta o corpo, de nenhum lado);
 * - rabo: as bolas do rabo de dino não entram nas pernas.
 */
export function conferirBalanco(
  plano: PlanoBoneco,
  giros: GirosJuntas,
  escalas: EscalasJuntas,
  comCabelo = true,
): ProblemaBalanco[] {
  const problemas: ProblemaBalanco[] = [];
  const medir = (p: Peca) => medirPeca(plano, p, giros, 6, escalas);
  const pernas = plano.pecas.filter((p) => EH_PERNA.test(p.nome)).map(medir);
  const saia = plano.pecas
    .filter((p) => p.junta === 'saia' && p.forma === 'cilindro')
    .map((p) => medirPeca(plano, p, giros, 6, escalas));
  if (saia.length) {
    let pior: { medida: number; peca: string; outra: string } | null = null;
    for (const perna of pernas)
      for (const q of perna.pontos) {
        // na altura da saia (entre a barra e a cintura de alguma camada)
        const naFaixa = saia.some((s) => {
          const l = s.paraDentro(q);
          return Math.abs(l[1]) <= s.peca.tamanho[0] / 2;
        });
        if (!naFaixa) continue;
        let d = Infinity;
        let qual = '';
        for (const s of saia) {
          const v = s.distancia(q);
          if (v < d) {
            d = v;
            qual = s.peca.nome;
          }
        }
        if (d > 0.004 && (!pior || d > pior.medida))
          pior = { medida: d, peca: perna.peca.nome, outra: qual };
      }
    if (pior) problemas.push({ tipo: 'saia', ...pior });
  }
  const panos = plano.pecas
    .filter((p) => p.junta === 'capa' && p.forma === 'placa')
    .map((p) => medirPeca(plano, p, giros, 6, escalas));
  if (panos.length) {
    const corpo = plano.pecas
      .filter(
        (p) =>
          p.junta !== 'capa' &&
          (EH_PERNA.test(p.nome) ||
            EH_BRACO.test(p.nome) ||
            (p.junta === 'tronco' && !/^(dino-rabo)/.test(p.nome)) ||
            (comCabelo && p.junta === 'cabeca' && !p.apoio && EH_CABELO.test(p.nome))),
      )
      .map(medir);
    let pior: { medida: number; peca: string; outra: string } | null = null;
    const longe = (a: PecaMedida, b: PecaMedida) =>
      [0, 1, 2].some((k) => a.min[k] > b.max[k] + 0.01 || b.min[k] > a.max[k] + 0.01);
    for (const c of corpo)
      for (const pano of panos) {
        if (longe(c, pano)) continue;
        for (const q of c.pontos) {
          const l = pano.paraDentro(q);
          if (!dentroDoPerfil(pano.peca.perfil ?? [], l[0], l[1])) continue;
          // a frente do pano é o lado +z (o do corpo): nada pode ficar atrás dela
          // o cabelo pode cair por cima da capa (atrás dela), só não pode cortar o pano
          const cabelo = c.peca.junta === 'cabeca';
          const meia = pano.peca.tamanho[2] / 2;
          const entrou = cabelo ? meia - Math.abs(l[2]) : meia - l[2];
          if (entrou > 0.003 && (!pior || entrou > pior.medida))
            pior = { medida: entrou, peca: c.peca.nome, outra: pano.peca.nome };
        }
      }
    if (pior) problemas.push({ tipo: 'capa', ...pior });
  }
  const rabo = plano.pecas.filter((p) => p.junta === 'rabo').map(medir);
  for (const r of rabo)
    for (const perna of pernas) {
      const d = distanciaEntre(r, perna, 0.05);
      if (d < -0.003)
        problemas.push({ tipo: 'rabo', peca: perna.peca.nome, outra: r.peca.nome, medida: -d });
    }
  return problemas;
}

/** Poses de teste: parado, a passada inteira andando e correndo, pulo, voo, golpe, comer e os 8 gestos. */
export function posesDeTeste(): Array<{
  nome: string;
  pose: Pose;
  olhar: number;
  segurando: boolean;
}> {
  const lista: Array<{ nome: string; pose: Pose; olhar: number; segurando: boolean }> = [];
  const entrada = (e: Partial<EntradaPose>): EntradaPose => ({
    andando: false,
    correndo: false,
    noAr: false,
    minerando: false,
    colocando: false,
    tempo: 0,
    ...e,
  });
  const por = (nome: string, e: Partial<EntradaPose>, olhar = 0, segurando = false) =>
    lista.push({ nome, pose: calcularPose(entrada(e)), olhar, segurando });
  por('parado', {});
  for (let i = 0; i < 12; i++) {
    const fase = (i / 12) * Math.PI * 2;
    por(`andar ${i}`, { andando: true, passo: { fase, amplitude: AMPLITUDE_ANDAR } });
    por(`correr ${i}`, {
      andando: true,
      correndo: true,
      passo: { fase, amplitude: AMPLITUDE_CORRER },
      inclina: 0.22,
      roll: i % 2 ? 0.2 : -0.2,
    });
  }
  por('pulo', { noAr: true, passo: { fase: 0, amplitude: 0 } });
  por('pulo antigo', { noAr: true });
  por('agachar', { agacha: 1, afundar: 1 });
  for (let t = 0; t < 4; t += 0.5) por(`voar ${t}`, { voando: true, tempo: t });
  for (const olhar of [-0.9, 0, 0.9])
    for (let i = 0; i < 10; i++)
      por(`minerar ${olhar} ${i}`, { minerando: true, tempo: i * 0.025 }, olhar, true);
  por('colocar', { colocando: true, progressoColocar: 0.5 }, 0, true);
  for (const c of [0.3, 0.6]) por(`comer ${c}`, { comendo: c, tempo: c }, 0, true);
  for (const g of GESTOS) {
    const dur = Number.isFinite(g.duracao) ? g.duracao : 1.5;
    for (let f = 0.2; f <= dur; f += 0.1) {
      const base = calcularPose(entrada({ tempo: f }));
      lista.push({
        nome: `${g.id} ${f.toFixed(1)}`,
        pose: aplicarGesto(base, g.id, f),
        olhar: 0,
        segurando: false,
      });
    }
  }
  return lista;
}

export function girosDaPose(p: { pose: Pose; olhar: number; segurando: boolean }): GirosJuntas {
  const r = rotacoesDaPose(p.pose, p.olhar, p.segurando);
  return {
    corpo: r.corpo,
    tronco: r.tronco,
    cabeca: r.cabeca,
    topete: r.topete,
    bracoD: r.bracoD,
    bracoE: r.bracoE,
    pernaD: r.pernaD,
    pernaE: r.pernaE,
    capa: r.capa,
    saia: r.saia,
    rabo: r.rabo,
  };
}

/** Escala das juntas numa pose (a saia abre e achata). */
export function escalasDaPose(p: { pose: Pose; olhar: number; segurando: boolean }): EscalasJuntas {
  return { saia: rotacoesDaPose(p.pose, p.olhar, p.segurando).saiaEscala };
}
