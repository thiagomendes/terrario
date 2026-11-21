/**
 * As peças da Noite das Fantasias que não são bloco (spec 027), do esboço aprovado, no jeito das
 * peças da Vila Neon (`render/vila/ref.ts`): caixas de quina de brinquedo, barras quadradas,
 * prismas facetados e bolinhas de poucos gomos. Coordenadas locais da peça: x para a direita de
 * quem olha a frente, y para cima (0 é o chão da peça), z para a frente.
 *
 * A paleta fixa dos objetos coloridos: roxo, laranja, verde-oliva e dourado, sempre alternados em
 * duas cores, nunca na ordem do arco-íris. Nenhum letreiro com palavra: as barracas e a loja dizem
 * o que são pelo desenho.
 */
import { CreateSphereVertexData } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { dadosPlaca } from '../formas';
import type { Pecas, V3 } from '../solidos';
import { perfilEstrela, Ref, type Desenho } from '../vila/ref';
import type { PecaBaile } from '../../world/noiteFantasias';
import type { PecaVila } from '../../world/vilaNeon';

export const CORES = {
  // (o roxo, o roxo-escuro e o ferro de brinquedo um tom acima do esboço: a porta da loja e o
  // poste de perto, de noite, viravam mancha escura na tela)
  roxo: '#7a4cae',
  roxoEscuro: '#5a4280',
  ferro: '#6a54a0',
  lilas: '#a88ad0',
  laranja: '#f0862a',
  laranjaEscuro: '#c8621a',
  oliva: '#5a7630',
  olivaEscuro: '#465e24',
  creme: '#f6ecd8',
  madeira: '#a8703c',
  madeiraEscura: '#7a4e2a',
  dourado: '#e8b23a',
  fio: '#5a4632',
  barbante: '#e4d8ee',
  luz: '#ffd56a',
  luzMorna: '#ffc45a',
} as const;

/** O desenho de uma peça da festa: a malha de dia, a da noite (acende) e as luzes. */
export interface DesenhoBaile extends Desenho {
  /** O que só aparece de noite (o rosto aceso da abóbora gigante, as janelas acesas). */
  noite: Pecas;
  /** O que só aparece de dia (o rosto entalhado da abóbora gigante). */
  dia: Pecas;
}

/** O referencial de uma peça da festa (o `Ref` da Vila lê só tipo, posição, giro e variante). */
export function refDaPeca(d: Desenho, p: PecaBaile, escala = 1): Ref {
  return new Ref(d, p as unknown as PecaVila, escala);
}

function placaGirada(
  r: Ref,
  perfil: Array<[number, number]>,
  esp: number,
  p: V3,
  incl: number,
  giro: number,
  cor: string,
  luz = false,
): void {
  const vd = dadosPlaca(perfil, esp);
  const P = vd.positions as number[];
  const N = vd.normals as number[];
  const ci = Math.cos(incl);
  const si = Math.sin(incl);
  const cg = Math.cos(giro);
  const sg = Math.sin(giro);
  const gira = (x: number, y: number, z: number): V3 => {
    // inclina em volta de x (deita para a frente), depois gira em volta de y
    const y1 = y * ci - z * si;
    const z1 = y * si + z * ci;
    return [x * cg + z1 * sg, y1, -x * sg + z1 * cg];
  };
  for (let j = 0; j < P.length; j += 3) {
    const q = gira(P[j], P[j + 1], P[j + 2]);
    P[j] = p[0] + q[0];
    P[j + 1] = p[1] + q[1];
    P[j + 2] = p[2] + q[2];
    const n = gira(N[j], N[j + 1], N[j + 2]);
    N[j] = n[0];
    N[j + 1] = n[1];
    N[j + 2] = n[2];
  }
  vd.uvs = null;
  r.por(vd, luz, cor);
}

/** A cor um tom mais escura (`f` < 1). */
const escurecer = (hex: string, f: number): string =>
  '#' +
  [1, 3, 5]
    .map((i) =>
      Math.round(parseInt(hex.slice(i, i + 2), 16) * f)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');

/** Contorno de círculo (n lados) de raio `rr` com o meio em (cx, cy). */
const circulo = (rr: number, n = 16, cx = 0, cy = 0): Array<[number, number]> =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr] as [number, number];
  });

/** Bolinha de brinquedo (poucos gomos), na malha `destino` (o corpo, a de noite...). */
function bolinha(
  r: Ref,
  x: number,
  y: number,
  z: number,
  raio: number,
  cor: string,
  esc: V3 = [1, 1, 1],
  destino?: Pecas,
  giro = 0,
  gomos = 8,
): void {
  const vd: VertexData = CreateSphereVertexData({ diameter: raio * 2, segments: gomos });
  const P = vd.positions as number[];
  const N = vd.normals as number[];
  const c = Math.cos(giro);
  const s = Math.sin(giro);
  for (let i = 0; i < P.length; i += 3) {
    const lx = P[i] * esc[0];
    const lz = P[i + 2] * esc[2];
    P[i] = x + lx * c + lz * s;
    P[i + 1] = y + P[i + 1] * esc[1];
    P[i + 2] = z - lx * s + lz * c;
    const nx0 = N[i] / esc[0];
    const nz0 = N[i + 2] / esc[2];
    const nx = nx0 * c + nz0 * s;
    const ny = N[i + 1] / esc[1];
    const nz = -nx0 * s + nz0 * c;
    const l = Math.hypot(nx, ny, nz) || 1;
    N[i] = nx / l;
    N[i + 1] = ny / l;
    N[i + 2] = nz / l;
  }
  vd.uvs = null;
  if (destino) r.levar(vd, destino, cor);
  else r.por(vd, false, cor);
}

// ------------------------------------------------------------------ as abóboras

/**
 * A abóbora de brinquedo (o modelo da família da gigante): a bola achatada e os gomos em volta,
 * o cabinho e a folhinha. `L` é o lado (a abóbora inteira cabe num cubo de L); a base no chão.
 */
export function abobora(r: Ref, x: number, y: number, z: number, L: number, gomos = 10): void {
  const cy = y + 0.41 * L;
  bolinha(r, x, cy - 0.06 * L, z, 0.47 * L, '#e07c1e', [1.12, 0.8, 1.12], undefined, 0, 16);
  for (let i = 0; i < gomos; i++) {
    const a = (i / gomos) * Math.PI * 2;
    bolinha(
      r,
      x + Math.sin(a) * 0.2 * L,
      cy - 0.05 * L,
      z + Math.cos(a) * 0.2 * L,
      0.34 * L,
      i % 2 ? '#f28c26' : '#e4801f',
      [0.62, 0.98, 1],
      undefined,
      a,
      12,
    );
  }
  r.barra([x, cy + 0.26 * L, z], [x + 0.06 * L, cy + 0.42 * L, z], 0.08 * L, '#6b7a2e');
  bolinha(r, x - 0.12 * L, cy + 0.31 * L, z + 0.02 * L, 0.11 * L, '#5cbf63', [1.6, 0.25, 0.9]);
}

/**
 * A superfície da frente (+z) da abóbora de `abobora()`, em (px, py) locais: o maior z das bolas
 * do corpo (a carinha anda colada na casca, sem dobrar nos sulcos rasos).
 */
function frenteDaAbobora(L: number, gomos: number, px: number, py: number): number {
  const cy = 0.41 * L;
  let melhor = -Infinity;
  const bola = (ox: number, oy: number, oz: number, rx: number, ry: number, rz: number, a: number) => {
    // no referencial da bola (girada em y por `a`): ((x'/rx)² + (y'/ry)² + (z'/rz)² = 1)
    const dx = px - ox;
    const dy = py - oy;
    const c = Math.cos(a);
    const s = Math.sin(a);
    // x' = dx·c − dz·s ; z' = dx·s + dz·c (dz livre): a quadrática em dz
    const A = (s * s) / (rx * rx) + (c * c) / (rz * rz);
    const B = 2 * dx * (-c * s / (rx * rx) + (s * c) / (rz * rz));
    const C = (dx * dx * c * c) / (rx * rx) + (dx * dx * s * s) / (rz * rz) + (dy * dy) / (ry * ry) - 1;
    const disc = B * B - 4 * A * C;
    if (disc < 0) return;
    const dz = (-B + Math.sqrt(disc)) / (2 * A);
    melhor = Math.max(melhor, oz + dz);
  };
  bola(0, cy - 0.06 * L, 0, 0.47 * L * 1.12, 0.47 * L * 0.8, 0.47 * L * 1.12, 0);
  for (let i = 0; i < gomos; i++) {
    const a = (i / gomos) * Math.PI * 2;
    bola(Math.sin(a) * 0.2 * L, cy - 0.05 * L, Math.cos(a) * 0.2 * L, 0.34 * L * 0.62, 0.34 * L * 0.98, 0.34 * L, a);
  }
  return melhor;
}

/**
 * Uma película colada na frente da abóbora (o rosto): os pontos do contorno no plano da cara,
 * cada um empurrado até a casca (mais `desloca`), num leque a partir do meio.
 */
function pelicula(
  r: Ref,
  destino: Pecas,
  L: number,
  gomos: number,
  base: V3,
  contorno: Array<[number, number]>,
  meio: [number, number],
  cor: string,
  desloca: number,
  faixa = false,
): void {
  const pts: number[] = [];
  const idx: number[] = [];
  const empurra = (u: number, v: number) => {
    const z = frenteDaAbobora(L, gomos, u, v);
    pts.push(base[0] + u, base[1] + v, base[2] + (Number.isFinite(z) ? z : 0.5 * L) + desloca);
    return pts.length / 3 - 1;
  };
  const anel = contorno.map(([u, v]) => empurra(u, v));
  if (faixa) {
    // a faixa (o sorriso): o contorno é a beira de cima e, de volta, a de baixo; quadrinhos
    // entre as duas (a forma é côncava: o leque a partir do meio sairia dela)
    const n = anel.length / 2;
    for (let i = 0; i < n - 1; i++) {
      const [a, b, c, e] = [anel[i], anel[i + 1], anel[anel.length - 2 - i], anel[anel.length - 1 - i]];
      idx.push(a, b, c, a, c, e);
    }
  } else {
    // o disco em anéis do meio até a beira (os triângulos pequenos acompanham a casca curva: um
    // leque de triângulos grandes cortaria a casca e ela furaria a película)
    const m = empurra(meio[0], meio[1]);
    const A = 6;
    let antes: number[] = [];
    for (let a = 1; a <= A; a++) {
      const t = a / A;
      const ring =
        a === A
          ? anel
          : contorno.map(([u, v]) => empurra(meio[0] + (u - meio[0]) * t, meio[1] + (v - meio[1]) * t));
      for (let i = 0; i < ring.length; i++) {
        const j = (i + 1) % ring.length;
        if (a === 1) idx.push(m, ring[i], ring[j]);
        else idx.push(antes[i], ring[i], ring[j], antes[i], ring[j], antes[j]);
      }
      antes = ring;
    }
  }
  // os dois lados (a película é fina: de qualquer giro do contorno ela aparece de frente)
  const ida = idx.length;
  for (let i = 0; i < ida; i += 3) idx.push(idx[i], idx[i + 2], idx[i + 1]);
  const vd = new VertexData();
  vd.positions = pts;
  vd.indices = idx;
  const N: number[] = [];
  for (let i = 0; i < pts.length; i += 3) N.push(0, 0, 1);
  vd.normals = N;
  r.levar(vd, destino, cor);
}

/**
 * As carinhas das abóboras (todas de olhos redondos: nenhuma de olho triangular bravo). A
 * 'junina' é a carinha de festa junina do lampião do Rancho Alegre (os olhinhos quadrados e o
 * sorriso), que o Rancho mantém (spec 027, T06).
 */
export type Carinha = 'sorriso' | 'lingua' | 'piscadinha' | 'junina';

/**
 * O rosto de uma abóbora de lado L (o meio da base em `base`): os olhos redondos e o sorriso,
 * colados na casca. De dia, entalhado (marrom escuro, com o brilhinho no olho); de noite, aceso.
 */
export function rostoDaAbobora(
  r: Ref,
  d: Pick<DesenhoBaile, 'luz' | 'dia' | 'noite'>,
  base: V3,
  L: number,
  gomos: number,
  tipo: Carinha,
  aceso: 'dia' | 'noite' | 'sempre',
): void {
  const k = 0.6 * L;
  const cy = 0.36 * L;
  // a película afasta da casca na medida da abóbora (as facetas da bola grande saem mais)
  const folga = 0.015 + 0.006 * L;
  const olho = (ox: number, fechado: boolean): Array<[number, number]> =>
    tipo === 'junina'
      ? // os olhinhos quadrados de quina redonda (a carinha do Rancho)
        [
          [ox - 0.07 * k, cy + 0.1 * k],
          [ox + 0.07 * k, cy + 0.1 * k],
          [ox + 0.09 * k, cy + 0.12 * k],
          [ox + 0.09 * k, cy + 0.28 * k],
          [ox + 0.07 * k, cy + 0.3 * k],
          [ox - 0.07 * k, cy + 0.3 * k],
          [ox - 0.09 * k, cy + 0.28 * k],
          [ox - 0.09 * k, cy + 0.12 * k],
        ]
      : fechado
      ? // a piscadinha: um arquinho deitado
        Array.from({ length: 14 }, (_, i) => {
          const t = i / 13;
          const u = -1 + 2 * t;
          const topo = i < 7;
          return [ox + u * 0.14 * k, cy + 0.19 * k + (topo ? 0.05 : 0.0) * k * (1 - u * u)] as [number, number];
        })
      : circulo(0.15 * k, 18, ox, cy + 0.19 * k).map(([u, v]) => [u, cy + 0.19 * k + (v - cy - 0.19 * k) * 1.08] as [number, number]);
  // o sorriso em U, uma faixa grossa de pontas redondas
  const boca: Array<[number, number]> = [];
  const N = 20;
  for (let i = 0; i <= N; i++) {
    const u = -1 + (2 * i) / N;
    boca.push([0.31 * k * u, cy - 0.05 * k - 0.2 * k * (1 - u * u) + 0.055 * k]);
  }
  for (let i = N; i >= 0; i--) {
    const u = -1 + (2 * i) / N;
    boca.push([0.31 * k * u, cy - 0.05 * k - 0.2 * k * (1 - u * u) - 0.055 * k]);
  }
  const pintar = (destino: Pecas, cor: string, desloca: number) => {
    pelicula(r, destino, L, gomos, base, olho(-0.2 * k, false), [-0.2 * k, cy + 0.19 * k], cor, desloca);
    const direito = olho(0.2 * k, tipo === 'piscadinha');
    pelicula(r, destino, L, gomos, base, direito, [0.2 * k, cy + 0.19 * k + (tipo === 'piscadinha' ? 0.02 * k : 0)], cor, desloca);
    pelicula(r, destino, L, gomos, base, boca, [0, cy - 0.2 * k], cor, desloca, true);
    if (tipo === 'lingua')
      pelicula(r, destino, L, gomos, base, circulo(0.07 * k, 12, 0.06 * k, cy - 0.27 * k), [0.06 * k, cy - 0.27 * k], '#ff8a8a', desloca + 0.01);
  };
  if (aceso !== 'noite') {
    const destino = aceso === 'sempre' ? d.luz : d.dia;
    pintar(destino, aceso === 'sempre' ? CORES.luz : '#4a220e', folga);
    if (aceso === 'dia')
      for (const ox of [-0.24 * k, 0.16 * k])
        pelicula(r, d.dia, L, gomos, base, circulo(0.04 * k, 10, ox, cy + 0.24 * k), [ox, cy + 0.24 * k], '#fff4e6', folga + 0.01);
  }
  if (aceso === 'noite') pintar(d.noite, CORES.luz, folga + 0.01);
}

// ------------------------------------------------------------------ a praça

/**
 * A abóbora gigante sorridente (pedido do dono: arredondada, nada de cubos): o modelo da família
 * das abóboras do jogo, bem grande (lado `n` blocos), com os 10 gomos, o talo curvo, a folha
 * levantada e a carinha de olhos redondos rente à casca: entalhada de dia e acesa de noite.
 */
function aboboraGigante(r: Ref, d: DesenhoBaile, L: number): void {
  // a sombrinha de contato no chão (sem ela, a abóbora grande parecia flutuar na praça)
  // (em dois anéis, o de fora mais clarinho, para a borda não ficar dura como um tapete)
  for (const [raio, y, cor] of [
    [0.47, 0.012, '#5e4e80'],
    [0.41, 0.02, '#4c3e6a'],
  ] as const) {
    const sombra: Array<[number, number]> = [];
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      sombra.push([Math.cos(a) * raio * L, Math.sin(a) * raio * L]);
    }
    placaGirada(r, sombra, 0.01, [0, y, 0], Math.PI / 2, 0, cor);
  }
  abobora(r, 0, 0, 0, L, 10);
  // o talo curvo de brinquedo e a folha grande levantada, de lado
  const t: V3[] = [];
  for (let i = 0; i <= 6; i++) {
    const s = i / 6;
    t.push([0.16 * s * s * L, (0.6 + 0.26 * s - 0.06 * s * s) * L, 0.03 * s * L]);
  }
  for (let i = 0; i < 6; i++) r.barra(t[i], t[i + 1], (0.13 - 0.04 * (i / 6)) * L, i % 2 ? '#6b7a2e' : '#5f6e28');
  bolinha(r, t[6][0], t[6][1], t[6][2], 0.04 * L, '#6b7a2e');
  bolinha(r, -0.15 * L, 0.7 * L, 0, 0.13 * L, '#5cbf63', [1.7, 0.22, 1], undefined, 0.25);
  bolinha(r, 0.06 * L, 0.69 * L, -0.13 * L, 0.09 * L, '#5cbf63', [1.7, 0.22, 1], undefined, -1.2);
  rostoDaAbobora(r, d, [0, 0, 0], L, 10, 'sorriso', 'dia');
  rostoDaAbobora(r, d, [0, 0, 0], L, 10, 'sorriso', 'noite');
}

/** Banco de praça de brinquedo: o assento de tábuas, o encosto e os pés roxos. */
function banco(r: Ref): void {
  for (const x of [-0.75, 0.75]) {
    r.caixa(0.14, 0.42, 0.5, x, 0, 0, CORES.ferro, 0.03);
    r.caixa(0.12, 0.62, 0.12, x, 0.42, -0.22, CORES.ferro, 0.03);
  }
  for (const z of [-0.14, 0.04, 0.22]) r.caixa(1.9, 0.08, 0.16, 0, 0.42, z, CORES.madeira, 0.03);
  for (const y of [0.7, 0.9]) r.caixa(1.9, 0.14, 0.07, 0, y, -0.24, CORES.madeira, 0.03);
}

/** Mesinha de praça com guarda-sol em gomos laranja e roxo e dois banquinhos. */
function mesinha(r: Ref): void {
  r.caixa(0.44, 0.06, 0.44, 0, 0, 0, CORES.ferro, 0.02);
  r.caixa(0.09, 2.1, 0.09, 0, 0, 0, CORES.ferro, 0);
  r.prisma(8, 0.5, 0.07, 0, 0.74, 0, CORES.creme, 'y');
  r.prisma(8, 1.0, 0.1, 0, 2.0, 0, CORES.laranja, 'y');
  r.prisma(8, 0.62, 0.12, 0, 2.1, 0, CORES.roxo, 'y');
  r.prisma(8, 0.24, 0.12, 0, 2.2, 0, CORES.laranja, 'y');
  for (const s of [-1, 1]) {
    r.caixa(0.08, 0.44, 0.08, s * 0.85, 0, 0, CORES.ferro, 0);
    r.prisma(8, 0.22, 0.1, s * 0.85, 0.48, 0, CORES.roxo, 'y');
  }
  r.caixa(0.16, 0.1, 0.16, 0.15, 0.81, 0.1, '#f09636', 0.04);
  r.caixa(0.12, 0.2, 0.12, -0.18, 0.81, -0.08, '#c8a0f0', 0.03);
}

/** O mastro de madeira das bandeirolas (a ponta no alto em `h`). */
function mastro(r: Ref, h: number): void {
  r.caixa(0.5, 0.18, 0.5, 0, 0, 0, CORES.madeiraEscura, 0.05);
  r.caixa(0.2, h, 0.2, 0, 0.1, 0, CORES.madeira, 0.04);
  r.caixa(0.3, 0.1, 0.3, 0, h + 0.05, 0, CORES.roxo, 0.03);
  r.caixa(0.18, 0.18, 0.18, 0, h + 0.15, 0, CORES.laranja, 0.06);
}

/**
 * Bandeirolas de festa num fio de (a) a (b), coordenadas locais da peça: triângulos laranja e
 * roxos (duas cores, nunca arco-íris) e, entre eles, uma lampadinha morna. O fio cai no meio.
 */
function bandeirolas(r: Ref, a: V3, b: V3, barriga = 0.6): void {
  const L = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const n = Math.max(6, Math.round(L / 0.5));
  const pts: V3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t - barriga * 4 * t * (1 - t),
      a[2] + (b[2] - a[2]) * t,
    ]);
  }
  for (let i = 0; i < n; i++) r.barra(pts[i], pts[i + 1], 0.04, CORES.fio);
  const ang = Math.atan2(b[0] - a[0], b[2] - a[2]) - Math.PI / 2;
  const q = Math.max(3, Math.round(L / 0.72));
  const noFio = (t: number): V3 => {
    const f = Math.min(n - 0.001, t * n);
    const k = Math.floor(f);
    const u = f - k;
    return [0, 1, 2].map((j) => pts[k][j] + (pts[k + 1][j] - pts[k][j]) * u) as V3;
  };
  for (let i = 0; i < q; i++) {
    const p = noFio((i + 0.5) / q);
    if (!r.dentro(p[0], p[1], p[2])) continue;
    placaGirada(
      r,
      [
        [-0.25, 0],
        [0.25, 0],
        [0, -0.5],
      ],
      0.035,
      [p[0], p[1] - 0.03, p[2]],
      0,
      ang,
      i % 2 ? CORES.roxo : CORES.laranja,
    );
    if (i < q - 1) {
      const p2 = noFio((i + 1) / q);
      if (!r.dentro(p2[0], p2[1], p2[2])) continue;
      r.caixa(0.06, 0.06, 0.06, p2[0], p2[1] - 0.1, p2[2], CORES.fio, 0);
      r.luz(0.13, 0.15, 0.13, p2[0], p2[1] - 0.25, p2[2], CORES.luz);
    }
  }
}

// ------------------------------------------------------------------ as barracas

/**
 * A barraca de festa (a frente para +z, o meio do chão em 0, 0, 0): os quatro postes, o balcão
 * com a frente em gomos de duas cores e o tampo de madeira, a prateleira e o pano do fundo e o
 * **toldo de verdade**: o pano listrado inclinado que cobre o balcão inteiro, apoiado nos postes
 * da frente, com caimento, os bicos só na beirada da frente e o forro claro por baixo.
 */
function barracaDeFesta(r: Ref, a: string, b: string): void {
  const W = 3.8;
  const zf = 0.85;
  const zt = -1.05;
  for (const x of [-W / 2, W / 2]) {
    r.caixa(0.16, 2.4, 0.16, x, 0, zf, CORES.madeiraEscura, 0.03);
    r.caixa(0.16, 2.95, 0.16, x, 0, zt, CORES.madeiraEscura, 0.03);
  }
  const n = 8;
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + 0.1 + (i + 0.5) * ((W - 0.2) / n);
    r.caixa((W - 0.2) / n, 0.92, 0.08, x, 0, zf - 0.02, i % 2 ? b : a, 0.02);
  }
  r.caixa(W - 0.2, 0.9, 0.6, 0, 0, zf - 0.36, CORES.madeira, 0.03);
  r.caixa(W + 0.1, 0.09, 0.78, 0, 0.92, zf - 0.32, '#c08a52', 0.03);
  r.caixa(W - 0.2, 0.08, 0.36, 0, 1.45, zt + 0.12, CORES.madeira, 0.02);
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + 0.1 + (i + 0.5) * ((W - 0.2) / n);
    r.caixa((W - 0.2) / n, 1.6, 0.05, x, 0.9, zt - 0.04, i % 2 ? CORES.creme : b, 0.01);
  }
  // o toldo: do alto do fundo (y 2.95) até a frente (y 2.4), passando um palmo da frente
  const yAlto = 2.98;
  const yFrente = 2.32;
  const zA = zt - 0.25;
  const zB = zf + 0.5;
  const comp = Math.hypot(zB - zA, yAlto - yFrente);
  const incl = Math.atan2(yAlto - yFrente, zB - zA);
  const m = 9;
  const larg = W + 0.6;
  const lw = larg / m;
  for (let i = 0; i < m; i++) {
    const x = -larg / 2 + (i + 0.5) * lw;
    const cor = i % 2 ? b : a;
    // a faixa do pano (deitada na inclinação, de trás para a frente)
    placaGirada(
      r,
      [
        [-lw / 2, 0],
        [lw / 2, 0],
        [lw / 2, comp],
        [-lw / 2, comp],
      ],
      0.05,
      [x, yAlto, zA],
      // (deitada para a frente e descendo: o comprimento vai para +z e cai `incl`)
      Math.PI / 2 + incl,
      0,
      cor,
    );
    // o bico da beirada da frente (o pano que cai, arredondado embaixo)
    placaGirada(
      r,
      [
        [-lw / 2, 0],
        [lw / 2, 0],
        [lw / 2, -0.18],
        [lw * 0.25, -0.3],
        [0, -0.33],
        [-lw * 0.25, -0.3],
        [-lw / 2, -0.18],
      ],
      0.04,
      [x, yFrente + 0.02, zB + 0.01],
      0,
      0,
      cor,
    );
  }
  // o forro claro por baixo do pano (quem olha de baixo vê a cobertura)
  placaGirada(
    r,
    [
      [-larg / 2 + 0.05, 0.05],
      [larg / 2 - 0.05, 0.05],
      [larg / 2 - 0.05, comp - 0.05],
      [-larg / 2 + 0.05, comp - 0.05],
    ],
    0.02,
    [0, yAlto - 0.07, zA],
    Math.PI / 2 + incl,
    0,
    CORES.creme,
  );
  // a travessa da frente onde o pano se apoia
  r.caixa(W + 0.3, 0.1, 0.1, 0, 2.36, zf, CORES.madeiraEscura, 0.02);
}

/** A forminha de docinho com três (o brigadeiro, o beijinho ou o cajuzinho), no tampo. */
function forminha(r: Ref, x: number, y: number, z: number, doce: 'brigadeiro' | 'beijinho' | 'cajuzinho'): void {
  r.prisma(10, 0.22, 0.06, x, y, z, '#f6ecdc', 'y');
  const cor = doce === 'brigadeiro' ? '#5a3424' : doce === 'beijinho' ? '#fbf3e6' : '#e8a050';
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const bx = x + Math.cos(a) * 0.09;
    const bz = z + Math.sin(a) * 0.09;
    bolinha(r, bx, y + 0.1, bz, 0.07, cor);
    if (doce === 'cajuzinho') r.caixa(0.03, 0.05, 0.03, bx, y + 0.16, bz, '#7a4e2a', 0.01);
    if (doce === 'beijinho') r.caixa(0.035, 0.035, 0.035, bx, y + 0.16, bz, '#5a3424', 0.01);
    if (doce === 'brigadeiro') r.caixa(0.04, 0.02, 0.04, bx, y + 0.16, bz, CORES.laranja, 0.01);
  }
}

/** A caneca de chocolate quente (com a fumacinha) e o copo de poção de uva com canudinho. */
function caneca(r: Ref, x: number, y: number, z: number, cor: string): void {
  r.prisma(10, 0.1, 0.18, x, y + 0.09, z, cor, 'y');
  r.prisma(10, 0.085, 0.02, x, y + 0.18, z, '#6a3a22', 'y');
  r.barra([x + 0.1, y + 0.05, z], [x + 0.15, y + 0.13, z], 0.03, cor);
}
function copoPocao(r: Ref, x: number, y: number, z: number): void {
  r.prisma(10, 0.08, 0.24, x, y + 0.12, z, '#e8d8ff', 'y');
  r.prisma(10, 0.07, 0.18, x, y + 0.1, z, '#8a4ec8', 'y');
  r.barra([x + 0.02, y + 0.12, z], [x + 0.06, y + 0.38, z], 0.025, CORES.laranja);
}

/** O que a barraca vende, em cima do tampo (o tampo em y = 1.01; a frente em z ≈ 0.85). */
function balcao(r: Ref, qual: number): void {
  const y = 1.01;
  if (qual === 0) {
    const doces = ['brigadeiro', 'beijinho', 'cajuzinho'] as const;
    doces.forEach((d, i) => forminha(r, -1.1 + i * 1.1, y, 0.55, d));
    doces.forEach((d, i) => forminha(r, -0.55 + i * 1.1, 1.53, -0.93, d));
  } else {
    for (let i = 0; i < 3; i++) caneca(r, -1.2 + i * 0.4, y, 0.55, i % 2 ? CORES.creme : '#f2a24a');
    for (let i = 0; i < 3; i++) copoPocao(r, 0.4 + i * 0.4, y, 0.55);
    // a panela de chocolate no fundo, na prateleira
    r.prisma(10, 0.28, 0.3, -0.6, 1.53, -0.93, '#3e3652', 'y');
    r.prisma(10, 0.24, 0.02, -0.6, 1.83, -0.93, '#6a3a22', 'y');
    for (let i = 0; i < 2; i++) copoPocao(r, 0.6 + i * 0.35, 1.53, -0.93);
  }
}

/** A plaquinha de desenho em cima do toldo (sem letra): o docinho ou a caneca com fumacinha. */
function placaDaBarraca(r: Ref, qual: number): void {
  const y0 = 3.05;
  const z = -0.6;
  r.caixa(1.3, 0.96, 0.1, 0, y0 + 0.06, z, qual === 0 ? '#f3dcc0' : '#dccaf0', 0.05);
  r.caixa(1.42, 0.08, 0.14, 0, y0, z, CORES.madeiraEscura, 0.02);
  r.caixa(1.42, 0.08, 0.14, 0, y0 + 1.0, z, CORES.madeiraEscura, 0.02);
  for (const s of [-1, 1]) r.caixa(0.08, 1.06, 0.14, s * 0.67, y0, z, CORES.madeiraEscura, 0.02);
  for (const s of [-1, 1]) r.caixa(0.08, 0.5, 0.08, s * 0.5, y0 - 0.5, z, CORES.madeiraEscura, 0.02);
  if (qual === 0) {
    // o brigadeiro grande na forminha
    r.placa(circulo(0.3, 16, 0, y0 + 0.42), 0.04, 0, 0, z + 0.07, '#f6ecdc');
    r.placa(circulo(0.22, 16, 0, y0 + 0.56), 0.05, 0, 0, z + 0.1, '#5a3424');
    for (const [dx, dy] of [
      [-0.08, 0.62],
      [0.06, 0.66],
      [0.1, 0.52],
      [-0.04, 0.5],
    ])
      r.placa(circulo(0.03, 6, dx, y0 + dy), 0.02, 0, 0, z + 0.13, CORES.laranja);
  } else {
    // a caneca com a fumacinha
    r.placa(
      [
        [-0.22, y0 + 0.2],
        [0.22, y0 + 0.2],
        [0.22, y0 + 0.62],
        [-0.22, y0 + 0.62],
      ],
      0.05,
      0,
      0,
      z + 0.07,
      '#f2a24a',
    );
    r.placa(circulo(0.12, 12, 0.28, y0 + 0.42), 0.04, 0, 0, z + 0.07, '#f2a24a');
    r.placa(circulo(0.07, 12, 0.28, y0 + 0.42), 0.04, 0, 0, z + 0.09, '#dccaf0');
    for (const [dx, dy] of [
      [-0.06, 0.74],
      [0.04, 0.84],
    ])
      r.placa(circulo(0.06, 10, dx, y0 + dy), 0.03, 0, 0, z + 0.08, '#ffffff');
  }
}

// ------------------------------------------------------------------ a rua

/** A porta de casinha (o vão de 1 x 2 blocos atrás; a frente da parede em z = 0). */
function porta(r: Ref, cor: string): void {
  r.caixa(1.16, 0.12, 0.08, 0, 2.0, 0.02, CORES.madeiraEscura, 0.02);
  for (const s of [-1, 1]) r.caixa(0.12, 2.06, 0.08, s * 0.53, 0, 0.02, CORES.madeiraEscura, 0.02);
  r.caixa(0.94, 1.96, 0.1, 0, 0.02, -0.12, cor, 0.03);
  for (const y of [0.25, 1.1]) r.caixa(0.62, 0.62, 0.04, 0, y, -0.05, escurecer(cor, 0.8), 0.04);
  r.caixa(0.1, 0.1, 0.06, 0.32, 0.95, -0.03, CORES.dourado, 0.03);
}
// (os roxos das portas um tom acima do esboço: de noite, a porta de perto virava mancha escura)
const PORTAS = ['#7a4cae', '#d8701c', '#8656ba', '#7452ae'];

/** A porta da Vovó: roxa, grande e redonda em cima (o vão de 3 x 3 blocos atrás). */
function portaVovo(r: Ref): void {
  r.caixa(2.9, 2.96, 0.1, 0, 0.02, -0.14, '#4a3020', 0.02);
  const roxo = '#7a4aae';
  r.caixa(2.0, 2.0, 0.12, 0, 0.02, -0.06, roxo, 0.04);
  let y = 2.02;
  for (const [w, h] of [
    [1.9, 0.22],
    [1.65, 0.2],
    [1.25, 0.18],
    [0.7, 0.16],
  ]) {
    r.caixa(w, h, 0.12, 0, y, -0.06, roxo, 0.06);
    y += h;
  }
  for (const x of [-0.5, 0, 0.5]) r.caixa(0.04, 2.3, 0.04, x, 0.1, 0.01, '#5e3488', 0);
  r.placa(circulo(0.3, 16, 0, 2.15), 0.04, 0, 0, 0.03, '#4a2c6e');
  r.placa(circulo(0.22, 16, 0, 2.15), 0.04, 0, 0, 0.06, '#ffd56a', true);
  r.prisma(10, 0.09, 0.08, 0.72, 1.05, 0.04, CORES.dourado, 'z');
}

/** A janela redonda da Vovó (no plano da parede, z = 0): a moldura e o vidro aceso em cruz. */
function janelaRedonda(r: Ref): void {
  r.placa(circulo(0.62, 18), 0.08, 0, 0, 0.04, '#4a3266');
  r.placa(circulo(0.5, 18), 0.06, 0, 0, 0.07, '#ffd87e', true);
  r.caixa(0.08, 1.0, 0.06, 0, -0.5, 0.1, '#4a3266', 0);
  r.caixa(1.0, 0.08, 0.06, 0, -0.04, 0.1, '#4a3266', 0);
}

/** A campainha: o botão dourado numa plaquinha na parede, com o sininho em cima. */
function campainha(r: Ref): void {
  r.caixa(0.26, 0.36, 0.05, 0, 0, 0.025, CORES.roxoEscuro, 0.03);
  r.prisma(12, 0.08, 0.06, 0, 0.16, 0.08, CORES.dourado, 'z');
  r.prisma(12, 0.05, 0.04, 0, 0.16, 0.12, '#ffe07a', 'z');
  r.caixa(0.06, 0.06, 0.08, 0, 0.36, 0.05, CORES.roxoEscuro, 0);
  r.caixa(0.2, 0.05, 0.16, 0, 0.42, 0.06, CORES.dourado, 0.02);
  r.caixa(0.16, 0.12, 0.12, 0, 0.47, 0.06, '#f0c24a', 0.04);
  r.caixa(0.08, 0.06, 0.08, 0, 0.59, 0.06, CORES.dourado, 0.02);
}

/**
 * A teia de barbante colorido no canto (roxo, laranja e creme, sem aranha): os raios do canto
 * (0, 0) para baixo e para o lado `lado`, e os fios em volta, no plano z = 0 da peça.
 */
function teia(r: Ref, raio: number, lado: number): void {
  const raios = 4;
  const ponta = (k: number, f: number): V3 => {
    const a = (k / (raios - 1)) * (Math.PI / 2);
    return [Math.cos(a) * raio * f * lado, -Math.sin(a) * raio * f, 0.05];
  };
  for (let k = 0; k < raios; k++) r.barra([0, 0, 0.05], ponta(k, 1), 0.035, CORES.creme);
  const cores = [CORES.lilas, CORES.laranja];
  [0.45, 0.85].forEach((f, j) => {
    for (let k = 0; k < raios - 1; k++) {
      const a = ponta(k, f);
      const b = ponta(k + 1, f);
      const m: V3 = [(a[0] + b[0]) * 0.46, (a[1] + b[1]) * 0.46, 0.05];
      r.barra(a, m, 0.034, cores[j]);
      r.barra(m, b, 0.034, cores[j]);
    }
  });
}

/** As folhinhas da janela (a cor do tema e o fecho creme), dos dois lados. */
function janelinha(r: Ref, n: number): void {
  const cor = [CORES.oliva, CORES.roxo, CORES.laranjaEscuro][n % 3];
  for (const s of [-1, 1]) {
    r.caixa(0.26, 0.94, 0.06, s * 0.64, 0.03, 0.03, cor, 0.02);
    r.caixa(0.12, 0.12, 0.07, s * 0.64, 0.44, 0.04, CORES.creme, 0.02);
  }
}

/** O porta-vassouras da varanda: o suporte de madeira com duas vassouras de brinquedo. */
function portaVassouras(r: Ref): void {
  r.caixa(0.9, 0.12, 0.3, 0, 0, -0.3, CORES.madeiraEscura, 0.03);
  r.caixa(0.9, 0.14, 0.12, 0, 1.6, -0.42, CORES.madeira, 0.03);
  for (const s of [-1, 1]) r.caixa(0.1, 1.74, 0.1, s * 0.42, 0, -0.42, CORES.madeiraEscura, 0.02);
  for (const x of [-0.2, 0.2]) {
    r.barra([x, 0.6, -0.32], [x, 1.85, -0.36], 0.07, CORES.madeira);
    for (const dx of [-0.08, 0, 0.08]) r.barra([x + dx * 1.4, 0.05, -0.3], [x + dx * 0.6, 0.66, -0.32], 0.12, '#e8b850');
    r.barra([x - 0.13, 0.6, -0.32], [x + 0.13, 0.6, -0.32], 0.09, x < 0 ? CORES.roxo : CORES.laranja);
  }
}

/** Banquinho de madeira da varanda da Vovó: o lugar do Tufinho, com a almofadinha roxa. */
function banquinho(r: Ref): void {
  for (const x of [-0.27, 0.27])
    for (const z of [-0.15, 0.15]) r.caixa(0.08, 0.38, 0.08, x, 0, z, CORES.madeiraEscura, 0.025);
  r.caixa(0.72, 0.07, 0.44, 0, 0.38, 0, CORES.madeira, 0.03);
  r.caixa(0.6, 0.05, 0.05, 0, 0.14, 0.15, CORES.madeiraEscura, 0.015);
  r.caixa(0.6, 0.05, 0.05, 0, 0.14, -0.15, CORES.madeiraEscura, 0.015);
  r.caixa(0.5, 0.05, 0.34, 0, 0.45, 0, CORES.roxo, 0.025);
}

/** A lua crescente dourada e duas estrelinhas, acesas, no plano da parede. */
function luaEstrelas(r: Ref): void {
  const p: Array<[number, number]> = [];
  for (let a = 40; a <= 320; a += 14) {
    const t = (a * Math.PI) / 180;
    p.push([Math.cos(t) * 0.55, Math.sin(t) * 0.55]);
  }
  for (let a = 320; a >= 40; a -= 14) {
    const t = (a * Math.PI) / 180;
    p.push([0.2 + Math.cos(t) * 0.4, Math.sin(t) * 0.4]);
  }
  r.placa(p, 0.08, 0, 0, 0.04, '#ffd24a', true);
  r.placa(perfilEstrela(0.2), 0.06, 0.55, 0.36, 0.04, '#ffe07a', true);
  r.placa(perfilEstrela(0.14), 0.06, 0.5, -0.38, 0.04, '#ffe07a', true);
}

// ------------------------------------------------------------------ a loja e o castelinho

/** A porta da loja: dupla, verde-oliva e roxa, com a janelinha de cima e o cabide dourado. */
function portaLoja(r: Ref): void {
  r.caixa(3.0, 3.0, 0.1, 0, 0, -0.08, '#5e3e28', 0.02);
  for (const s of [-1, 1]) {
    r.caixa(1.3, 2.7, 0.12, s * 0.68, 0.05, 0.0, s < 0 ? CORES.roxo : CORES.oliva, 0.04);
    r.caixa(0.8, 0.7, 0.04, s * 0.68, 1.7, 0.07, '#e8d8ff', 0.03);
    r.caixa(0.08, 0.3, 0.06, s * 0.12, 1.2, 0.08, CORES.dourado, 0.02);
  }
  // o desenho do chapéu de bruxa em cima da porta (a loja diz o que é pelo desenho)
  r.placa(
    [
      [-0.55, 2.78],
      [0.55, 2.78],
      [0.18, 2.88],
      [0.05, 3.45],
      [-0.18, 2.88],
    ],
    0.06,
    0,
    0,
    0.12,
    CORES.roxoEscuro,
  );
  r.caixa(0.5, 0.08, 0.04, 0, 2.86, 0.16, CORES.laranja, 0.02);
}

/**
 * A vitrine da loja (atrás do vidro): só cabides e chapéus nos suportes, sem manequim. `n` 0: a
 * arara com a capa roxa, o lençol de fantasminha e a capinha laranja; 1: os chapéus no suporte
 * (o de bruxa, o de mágico e as orelhinhas de gatinho).
 */
function vitrine(r: Ref, n: number): void {
  r.caixa(2.6, 0.3, 1.0, 0, 0, 0, CORES.madeiraEscura, 0.03);
  if (n === 0) {
    for (const s of [-1, 1]) r.caixa(0.08, 2.2, 0.08, s * 1.1, 0.3, 0, CORES.dourado, 0.02);
    r.caixa(2.3, 0.08, 0.08, 0, 2.4, 0, CORES.dourado, 0.02);
    const roupas: [number, string, number][] = [
      [-0.7, CORES.roxo, 1.6],
      [0, '#f4f0ff', 1.5],
      [0.7, CORES.laranja, 1.3],
    ];
    for (const [x, cor, h] of roupas) {
      r.barra([x - 0.25, 2.25, 0], [x, 2.4, 0], 0.03, CORES.ferro);
      r.barra([x + 0.25, 2.25, 0], [x, 2.4, 0], 0.03, CORES.ferro);
      r.caixa(0.6, h, 0.12, x, 2.25 - h, 0, cor, 0.05);
    }
  } else {
    const chapeus: [number, number][] = [
      [-0.8, 0],
      [0, 1],
      [0.8, 2],
    ];
    for (const [x, k] of chapeus) {
      r.caixa(0.1, 1.2, 0.1, x, 0.3, 0, CORES.madeira, 0.02);
      r.prisma(10, 0.2, 0.06, x, 1.5, 0, CORES.madeiraEscura, 'y');
      if (k === 0) {
        r.prisma(12, 0.42, 0.06, x, 1.56, 0, CORES.roxoEscuro, 'y');
        r.prisma(10, 0.22, 0.3, x, 1.62, 0, CORES.roxoEscuro, 'y');
        r.prisma(10, 0.13, 0.3, x + 0.05, 1.9, 0, CORES.roxoEscuro, 'y');
        r.prisma(8, 0.06, 0.2, x + 0.14, 2.15, 0, CORES.roxoEscuro, 'y');
        r.prisma(10, 0.23, 0.06, x, 1.64, 0, CORES.laranja, 'y');
      } else if (k === 1) {
        r.prisma(12, 0.34, 0.05, x, 1.56, 0, '#2e2440', 'y');
        r.prisma(12, 0.2, 0.36, x, 1.6, 0, '#2e2440', 'y');
        r.prisma(12, 0.21, 0.06, x, 1.64, 0, CORES.dourado, 'y');
      } else {
        r.caixa(0.5, 0.08, 0.1, x, 1.6, 0, CORES.ferro, 0.03);
        for (const s of [-1, 1]) {
          placaGirada(r, [[-0.12, 0], [0.12, 0], [0, 0.26]], 0.05, [x + s * 0.18, 1.66, 0], 0, 0, '#2e2440');
          placaGirada(r, [[-0.06, 0.03], [0.06, 0.03], [0, 0.16]], 0.05, [x + s * 0.18, 1.66, 0.03], 0, 0, '#ffb3c1');
        }
      }
    }
  }
}

/** A porta do castelinho: grande, de tábuas roxas, com o arco em degraus e os cravos dourados. */
function portaCastelo(r: Ref): void {
  r.caixa(3.0, 3.1, 0.1, 0, 0, -0.06, '#4e3462', 0.02);
  const roxo = '#7450a4';
  for (let i = 0; i < 4; i++) r.caixa(0.62, 2.6 + (i === 1 || i === 2 ? 0.3 : 0.15), 0.12, -0.96 + i * 0.64, 0.02, 0.02, i % 2 ? roxo : '#8260b2', 0.03);
  for (const y of [0.5, 1.4, 2.2]) r.caixa(2.6, 0.1, 0.06, 0, y, 0.1, CORES.ferro, 0.02);
  for (const x of [-0.9, -0.3, 0.3, 0.9])
    for (const y of [0.55, 1.45, 2.25]) r.prisma(8, 0.05, 0.05, x, y, 0.14, CORES.dourado, 'z');
  r.prisma(10, 0.12, 0.08, 0.2, 1.2, 0.16, CORES.dourado, 'z');
}

/** A bandeirinha (n 0: a grande do alto da torre; 1: as pequenas das quinas). */
function bandeirinha(r: Ref, n: number): void {
  const h = n === 0 ? 2.2 : 1.4;
  r.caixa(0.1, h, 0.1, 0, 0, 0, CORES.ferro, 0.02);
  placaGirada(r, [[0, 0], [n === 0 ? 1.1 : 0.7, -0.25], [0, -0.5]], 0.04, [0.05, h - 0.05, 0], 0, 0, n === 0 ? CORES.laranja : CORES.roxo);
  bolinha(r, 0, h + 0.05, 0, 0.09, CORES.dourado);
}

// ------------------------------------------------------------------ as lanternas

/** O poste de ferro de brinquedo da lanterna de bloco (o bloco fica em cima, de 3 a 4). */
function posteLanterna(r: Ref): void {
  const alt = 2;
  r.caixa(0.62, 0.18, 0.62, 0, 0, 0, CORES.ferro, 0.05);
  r.caixa(0.44, 0.2, 0.44, 0, 0.18, 0, CORES.roxoEscuro, 0.05);
  r.caixa(0.24, alt - 0.38, 0.24, 0, 0.38, 0, CORES.ferro, 0.04);
  r.caixa(0.5, 0.12, 0.5, 0, alt - 0.12, 0, CORES.roxoEscuro, 0.03);
  r.caixa(0.32, 0.12, 0.32, 0, 0.9, 0, CORES.roxoEscuro, 0.03);
  // o telhadinho roxo em degraus por cima do bloco da lanterna
  const y = 3;
  r.caixa(1.1, 0.1, 1.1, 0, y, 0, CORES.ferro, 0.03);
  r.caixa(0.66, 0.12, 0.66, 0, y + 0.1, 0, CORES.roxoEscuro, 0.03);
  r.caixa(0.3, 0.12, 0.3, 0, y + 0.22, 0, CORES.roxoEscuro, 0.03);
  r.caixa(0.14, 0.14, 0.14, 0, y + 0.34, 0, CORES.laranja, 0.04);
}

/**
 * A lanterna de poste do caminho do bosque (n2): o poste de ferro roxo-escuro, a caixinha de
 * vidro e o telhadinho em degraus. Apagada, o vidro lilás-acinzentado com a vela; acesa (de
 * noite, e na n2 com o toque), a luz morna de vela (a malha da noite).
 */
function lanternaBosque(r: Ref, d: DesenhoBaile): void {
  r.caixa(0.62, 0.18, 0.62, 0, 0, 0, CORES.ferro, 0.05);
  r.caixa(0.24, 1.9, 0.24, 0, 0.18, 0, CORES.ferro, 0.04);
  r.caixa(0.5, 0.12, 0.5, 0, 2.08, 0, CORES.roxoEscuro, 0.03);
  // a caixinha: os quatro pilares e o vidro (apagado) por dentro
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) r.caixa(0.08, 0.7, 0.08, sx * 0.24, 2.2, sz * 0.24, CORES.ferro, 0.02);
  r.caixa(0.44, 0.66, 0.44, 0, 2.22, 0, '#8a88a4', 0.02);
  r.caixa(0.08, 0.2, 0.08, 0, 2.3, 0, '#efe4d0', 0.02);
  // a luz da vela (de noite): o vidro aceso um tico por fora do apagado
  const acesa = refDaPeca({ ...d, corpo: d.noite }, r.p as unknown as PecaBaile);
  acesa.caixa(0.46, 0.62, 0.46, 0, 2.24, 0, CORES.luzMorna, 0.02);
  r.caixa(0.7, 0.1, 0.7, 0, 2.9, 0, CORES.ferro, 0.03);
  r.caixa(0.44, 0.12, 0.44, 0, 3.0, 0, CORES.roxoEscuro, 0.03);
  r.caixa(0.2, 0.12, 0.2, 0, 3.12, 0, CORES.roxoEscuro, 0.03);
  r.caixa(0.12, 0.12, 0.12, 0, 3.24, 0, CORES.laranja, 0.04);
}

// ------------------------------------------------------------------ a horta e o bosque

/** A bancada do Seu Jerônimo com as três abóboras de carinha (sorriso, língua e piscadinha). */
function bancada(r: Ref, d: DesenhoBaile): void {
  const H = 0.86;
  r.caixa(2.8, 0.1, 0.9, 0, H, 0, CORES.madeira, 0.03);
  r.caixa(2.7, 0.08, 0.8, 0, 0.26, 0, CORES.madeiraEscura, 0.02);
  for (const x of [-1.25, 1.25])
    for (const z of [-0.34, 0.34]) r.caixa(0.12, H, 0.12, x, 0, z, CORES.madeiraEscura, 0.03);
  const tipos: Carinha[] = ['sorriso', 'lingua', 'piscadinha'];
  tipos.forEach((t, i) => {
    const x = -0.9 + i * 0.9;
    r.caixa(0.6, 0.04, 0.6, x, H + 0.1, 0.02, CORES.creme, 0.01);
    abobora(r, x, H + 0.14, 0.02, 0.62, 8);
    rostoDaAbobora(r, d, [x, H + 0.14, 0.02], 0.62, 8, t, 'sempre');
  });
}

/** A latada da parreirinha de uva: os mourões, as travessas e os cachos pendurados. */
function parreira(r: Ref): void {
  const W = 7.6;
  for (const x of [-W / 2, 0, W / 2])
    for (const z of [-0.7, 0.7]) r.caixa(0.16, 2.4, 0.16, x, 0, z, CORES.madeiraEscura, 0.03);
  for (const z of [-0.7, 0.7]) r.caixa(W + 0.3, 0.12, 0.12, 0, 2.4, z, CORES.madeira, 0.02);
  for (let i = 0; i <= 8; i++) r.caixa(0.1, 0.1, 1.7, -W / 2 + (i * W) / 8, 2.5, 0, CORES.madeira, 0.02);
  for (let i = 0; i < 7; i++) {
    const x = -W / 2 + 0.55 + (i * (W - 1.1)) / 6;
    bolinha(r, x, 2.38, 0.1, 0.4, i % 2 ? '#5f8a34' : '#6f9a3a', [1.3, 0.35, 1.6]);
    // o cachinho de uva roxa (bolinhas em triângulo)
    for (const [dx, dy] of [
      [0, 0],
      [-0.08, 0.12],
      [0.08, 0.12],
      [-0.12, 0.24],
      [0, 0.24],
      [0.12, 0.24],
    ])
      bolinha(r, x + dx, 2.05 - 0.2 + dy - 0.24, (i % 2 ? 0.3 : -0.25), 0.07, '#7a3ea8');
  }
}

/** O canteiro de hortelã: tufinhos de folha verde-clara em fileira. */
function hortela(r: Ref): void {
  for (let i = 0; i < 6; i++)
    for (let j = 0; j < 2; j++) {
      const x = -2.2 + i * 0.9 + (j ? 0.45 : 0);
      const z = -0.6 + j * 1.0;
      bolinha(r, x, 0.22, z, 0.28, i % 2 ? '#7fc65a' : '#8fd468', [1, 0.75, 1]);
      bolinha(r, x + 0.12, 0.42, z + 0.05, 0.14, '#a4e07a', [1, 0.7, 1]);
    }
}

/** O regador do Seu Jerônimo (laranja, com o bico comprido). */
function regador(r: Ref): void {
  r.prisma(10, 0.22, 0.4, 0, 0.2, 0, CORES.laranja, 'y');
  r.prisma(10, 0.23, 0.04, 0, 0.4, 0, CORES.laranjaEscuro, 'y');
  r.barra([0.18, 0.12, 0], [0.55, 0.48, 0], 0.06, CORES.laranja);
  r.prisma(8, 0.07, 0.05, 0.57, 0.5, 0, CORES.laranjaEscuro, 'x');
  r.barra([-0.1, 0.5, 0], [0.1, 0.5, 0], 0.05, CORES.roxo);
  r.barra([-0.12, 0.42, 0], [-0.1, 0.5, 0], 0.05, CORES.roxo);
  r.barra([0.12, 0.42, 0], [0.1, 0.5, 0], 0.05, CORES.roxo);
}

/** O carrinho de mão de madeira, com a roda na frente e duas abóboras dentro. */
function carrinho(r: Ref): void {
  r.roda(0.26, 0.12, 0, 0.26, 0.95, '#3a2c2a');
  r.roda(0.12, 0.14, 0, 0.26, 0.95, CORES.dourado);
  r.caixa(0.9, 0.08, 1.1, 0, 0.42, 0.1, CORES.madeiraEscura, 0.02);
  for (const s of [-1, 1]) r.caixa(0.08, 0.36, 1.1, s * 0.47, 0.46, 0.1, CORES.madeira, 0.02);
  r.caixa(0.94, 0.36, 0.08, 0, 0.46, 0.66, CORES.madeira, 0.02);
  r.caixa(0.94, 0.36, 0.08, 0, 0.46, -0.46, CORES.madeira, 0.02);
  for (const s of [-1, 1]) {
    r.barra([s * 0.4, 0.46, 0.6], [s * 0.36, 0.3, 0.95], 0.08, CORES.madeiraEscura);
    r.barra([s * 0.4, 0.5, -0.4], [s * 0.42, 0.62, -1.15], 0.08, CORES.madeiraEscura);
    r.caixa(0.08, 0.42, 0.08, s * 0.4, 0, -0.35, CORES.madeiraEscura, 0.02);
    r.caixa(0.12, 0.12, 0.2, s * 0.42, 0.56, -1.2, CORES.roxo, 0.04);
  }
  abobora(r, -0.18, 0.5, 0.25, 0.42, 8);
  abobora(r, 0.2, 0.5, -0.15, 0.36, 8);
}

/** O canteiro marcado da n4: a estaquinha com a plaquinha da abóbora desenhada. */
function canteiroMarcado(r: Ref): void {
  r.caixa(0.1, 1.0, 0.1, 0, 0, 0, CORES.madeira, 0.02);
  r.caixa(0.7, 0.5, 0.08, 0, 0.75, 0.05, CORES.creme, 0.03);
  r.placa(circulo(0.16, 14, 0, 1.0), 0.03, 0, 0, 0.11, CORES.laranja);
  r.caixa(0.04, 0.08, 0.03, 0, 1.15, 0.12, CORES.oliva, 0.01);
}

/** O poleiro da corujinha no bosque: o mourão com a travessa no alto (2,5 do chão). */
function poleiro(r: Ref): void {
  r.caixa(0.36, 0.14, 0.36, 0, 0, 0, CORES.madeiraEscura, 0.04);
  r.caixa(0.18, 2.4, 0.18, 0, 0, 0, CORES.madeira, 0.04);
  r.caixa(0.8, 0.1, 0.16, 0, 2.4, 0, CORES.madeira, 0.04);
  for (const s of [-1, 1]) r.barra([s * 0.08, 2.0, 0], [s * 0.3, 2.4, 0], 0.06, CORES.madeiraEscura);
}

// ------------------------------------------------------------------ o desenho de cada peça

/** Desenha a peça da festa nas malhas do chunk (o corpo, as luzes, a de noite e a de dia). */
export function desenharPecaBaile(p: PecaBaile, d: DesenhoBaile): void {
  const r = refDaPeca(d, p);
  const n = p.n ?? 0;
  switch (p.tipo) {
    case 'abobora-gigante':
      aboboraGigante(r, d, n || 12);
      return;
    case 'abobora':
      abobora(r, 0, 0, 0, (n || 8) / 10, 8);
      return;
    case 'barraca':
      barracaDeFesta(r, n === 0 ? CORES.laranja : CORES.roxo, CORES.creme);
      balcao(r, n);
      placaDaBarraca(r, n);
      return;
    case 'banco':
      banco(r);
      return;
    case 'mesinha':
      mesinha(r);
      return;
    case 'mastro':
      mastro(r, n / 10);
      return;
    case 'bandeirolas': {
      if (!p.ate) return;
      const a: V3 = [0, 0, 0];
      const b: V3 = [p.ate[0] - p.x, p.ate[1] - p.y, p.ate[2] - p.z];
      // (a peça não gira: as pontas já vêm no mundo)
      bandeirolas(r, a, b, n === 0 ? 0.35 : 0.6);
      return;
    }
    case 'poste-lanterna':
      posteLanterna(r);
      return;
    case 'lanterna-bosque':
      lanternaBosque(r, d);
      return;
    case 'porta':
      porta(r, PORTAS[n % PORTAS.length]);
      return;
    case 'campainha':
      campainha(r);
      return;
    case 'teia':
      teia(r, 1.0, n || 1);
      return;
    case 'janelinha':
      janelinha(r, n);
      return;
    case 'porta-vovo':
      portaVovo(r);
      return;
    case 'janela-redonda':
      janelaRedonda(r);
      return;
    case 'lua-estrelas':
      luaEstrelas(r);
      return;
    case 'porta-vassouras':
      portaVassouras(r);
      return;
    case 'banquinho':
      banquinho(r);
      return;
    case 'porta-loja':
      portaLoja(r);
      return;
    case 'vitrine':
      vitrine(r, n);
      return;
    case 'porta-castelo':
      portaCastelo(r);
      return;
    case 'bandeirinha':
      bandeirinha(r, n);
      return;
    case 'bancada':
      bancada(r, d);
      return;
    case 'parreira':
      parreira(r);
      return;
    case 'hortela':
      hortela(r);
      return;
    case 'regador':
      regador(r);
      return;
    case 'carrinho':
      carrinho(r);
      return;
    case 'canteiro-marcado':
      canteiroMarcado(r);
      return;
    case 'poleiro':
      poleiro(r);
      return;
  }
}
