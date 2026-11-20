/**
 * Esboço da spec 027 (Noite das Fantasias): as peças de brinquedo que não são bloco, no
 * estilo das peças da Vila Neon (`render/vila/ref.ts`): caixas de quina de brinquedo, barras
 * quadradas, prismas facetados; nada de liso redondo. Coordenadas locais da Vila: x para a
 * direita de quem olha a frente, y para cima (0 é o chão da peça), z para a frente.
 *
 * As abóboras pequenas (portas, horta, bancada, praça) não moram aqui: são o modelo de
 * brinquedo do jogo (`render/blocosBrinquedo.ts`), montado em `fantasias.ts`.
 *
 * Tudo PROVISÓRIO (o palco do esboço): na implementação, as peças viram tipos da Vila (o
 * desenho fundido por chunk, como `render/vila/index.ts`).
 */
import { CreateSphereVertexData } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { dadosPlaca } from '../render/formas';
import type { V3 } from '../render/solidos';
import { perfilEstrela, type Ref } from '../render/vila/ref';

export const CORES = {
  roxo: '#6a3e9c',
  roxoEscuro: '#46305e',
  ferro: '#3a2c4e',
  lilas: '#a88ad0',
  laranja: '#f0862a',
  laranjaEscuro: '#c8621a',
  musgo: '#5a7630',
  musgoEscuro: '#465e24',
  creme: '#f6ecd8',
  madeira: '#a8703c',
  madeiraEscura: '#7a4e2a',
  dourado: '#e8b23a',
  fio: '#5a4632',
  barbante: '#e4d8ee',
  luz: '#ffd56a',
  luzMorna: '#ffc45a',
} as const;

/** Uma placa (contorno no plano xy) deitada e girada: `incl` a partir de em pé, `giro` em y. */
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

// ------------------------------------------------------------------ bandeirolas

/**
 * Bandeirolas de festa num fio de (a) a (b), coordenadas locais da peça: triângulos laranja e
 * roxos (duas cores, nunca arco-íris) e, entre eles, uma lampadinha morna. O fio cai no meio
 * (`barriga`) como um varal de verdade.
 */
export function bandeirolas(r: Ref, a: V3, b: V3, barriga = 0.9, comLuz = true): void {
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
    if (comLuz && i < q - 1) {
      const p2 = noFio((i + 1) / q);
      r.caixa(0.06, 0.06, 0.06, p2[0], p2[1] - 0.1, p2[2], CORES.fio, 0);
      r.luz(0.13, 0.15, 0.13, p2[0], p2[1] - 0.25, p2[2], CORES.luz);
    }
  }
}

/** O mastro de madeira das bandeirolas (os pés no chão, a ponta no alto em `h`). */
export function mastro(r: Ref, h: number): void {
  r.caixa(0.5, 0.18, 0.5, 0, 0, 0, CORES.madeiraEscura, 0.05);
  r.caixa(0.2, h, 0.2, 0, 0.1, 0, CORES.madeira, 0.04);
  r.caixa(0.3, 0.1, 0.3, 0, h + 0.05, 0, CORES.roxo, 0.03);
  r.caixa(0.18, 0.18, 0.18, 0, h + 0.15, 0, CORES.laranja, 0.06);
}

// ------------------------------------------------------------------ a abóbora gigante

/** O talo curvo da abóbora gigante e a folha (a base do talo em 0, 0, 0). */
export function taloEFolha(r: Ref): void {
  const verde = '#5a7a2e';
  const pts: V3[] = [
    [0, -0.4, 0],
    [0.05, 0.9, 0],
    [0.45, 1.7, 0.05],
    [1.15, 2.15, 0.1],
  ];
  const lados = [0.95, 0.8, 0.62];
  for (let i = 0; i < 3; i++) r.barra(pts[i], pts[i + 1], lados[i], i % 2 ? '#668a34' : verde);
  r.caixa(0.6, 0.5, 0.6, 1.25, 1.95, 0.1, '#4e6a28', 0.18);
  // a folha larga, quase deitada, caindo para o lado
  const folha: Array<[number, number]> = [
    [0, 0],
    [0.7, 0.35],
    [1.2, 1.0],
    [1.0, 1.7],
    [0.5, 2.1],
    [0, 2.4],
    [-0.5, 2.1],
    [-1.0, 1.7],
    [-1.2, 1.0],
    [-0.7, 0.35],
  ];
  placaGirada(r, folha, 0.12, [-0.2, 0.75, 0.2], 1.25, -2.3, '#6e9a3a');
  placaGirada(r, [[0, 0], [0.08, 0], [0.08, 2.2], [0, 2.2]], 0.14, [-0.2, 0.8, 0.2], 1.25, -2.3, '#4e7028');
}

// ------------------------------------------------------------------ a praça

/** Banco de praça de brinquedo: o assento de tábuas, o encosto e os pés roxos. */
export function banco(r: Ref): void {
  for (const x of [-0.75, 0.75]) {
    r.caixa(0.14, 0.42, 0.5, x, 0, 0, CORES.ferro, 0.03);
    r.caixa(0.12, 0.62, 0.12, x, 0.42, -0.22, CORES.ferro, 0.03);
  }
  for (const z of [-0.14, 0.04, 0.22]) r.caixa(1.9, 0.08, 0.16, 0, 0.42, z, CORES.madeira, 0.03);
  for (const y of [0.7, 0.9]) r.caixa(1.9, 0.14, 0.07, 0, y, -0.24, CORES.madeira, 0.03);
}

/** Banquinho de madeira da varanda da Vovó (o assento a 0,45 do chão): o lugar do Tufinho. */
export function banquinho(r: Ref): void {
  for (const x of [-0.27, 0.27])
    for (const z of [-0.15, 0.15]) r.caixa(0.08, 0.38, 0.08, x, 0, z, CORES.madeiraEscura, 0.025);
  r.caixa(0.72, 0.07, 0.44, 0, 0.38, 0, CORES.madeira, 0.03);
  r.caixa(0.6, 0.05, 0.05, 0, 0.14, 0.15, CORES.madeiraEscura, 0.015);
  r.caixa(0.6, 0.05, 0.05, 0, 0.14, -0.15, CORES.madeiraEscura, 0.015);
  // a almofadinha roxa
  r.caixa(0.5, 0.05, 0.34, 0, 0.45, 0, CORES.roxo, 0.025);
}

/** O poleiro da coruja no bosque: um mourão de madeira com a travessa no alto (2,5 do chão). */
export function poleiro(r: Ref): void {
  r.caixa(0.36, 0.14, 0.36, 0, 0, 0, CORES.madeiraEscura, 0.04);
  r.caixa(0.18, 2.4, 0.18, 0, 0, 0, CORES.madeira, 0.04);
  r.caixa(0.8, 0.1, 0.16, 0, 2.4, 0, CORES.madeira, 0.04);
  for (const s of [-1, 1]) r.barra([s * 0.08, 2.0, 0], [s * 0.3, 2.4, 0], 0.06, CORES.madeiraEscura);
}

/** Mesinha de praça com guarda-sol em gomos laranja e roxo e dois banquinhos. */
export function mesinha(r: Ref): void {
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
  // o docinho e o copo em cima
  r.caixa(0.16, 0.1, 0.16, 0.15, 0.81, 0.1, '#f09636', 0.04);
  r.caixa(0.12, 0.2, 0.12, -0.18, 0.81, -0.08, '#c8a0f0', 0.03);
}

// ------------------------------------------------------------------ barracas

/** Bolinha de brinquedo (poucos gomos, como as do modelo de brinquedo do jogo). */
function bolinha(
  r: Ref,
  x: number,
  y: number,
  z: number,
  raio: number,
  cor: string,
  esc: V3 = [1, 1, 1],
  luz = false,
): void {
  const vd = CreateSphereVertexData({ diameter: raio * 2, segments: 8 });
  const P = vd.positions as number[];
  const N = vd.normals as number[];
  for (let i = 0; i < P.length; i += 3) {
    P[i] = x + P[i] * esc[0];
    P[i + 1] = y + P[i + 1] * esc[1];
    P[i + 2] = z + P[i + 2] * esc[2];
    const nx = N[i] / esc[0];
    const ny = N[i + 1] / esc[1];
    const nz = N[i + 2] / esc[2];
    const l = Math.hypot(nx, ny, nz) || 1;
    N[i] = nx / l;
    N[i + 1] = ny / l;
    N[i + 2] = nz / l;
  }
  vd.uvs = null;
  r.por(vd, luz, cor);
}

/**
 * A barraca de festa no desenho das barracas da Vila (a frente para +z, o meio do chão em 0, 0,
 * 0): os quatro postes, o balcão com a frente listrada e o tampo de madeira, a prateleira do
 * fundo e o toldo listrado de duas cores por cima, com a barra de bicos. `a` e `b`: as cores.
 */
export function barracaDeFesta(r: Ref, a: string, b: string): void {
  const W = 3.8;
  const zf = 0.85;
  const zt = -1.05;
  // os postes (os da frente mais baixos: o toldo cai para a frente)
  for (const x of [-W / 2, W / 2]) {
    r.caixa(0.16, 2.55, 0.16, x, 0, zf, CORES.madeiraEscura, 0.03);
    r.caixa(0.16, 2.85, 0.16, x, 0, zt, CORES.madeiraEscura, 0.03);
  }
  // o balcão: a frente em gomos de duas cores e o tampo de madeira
  const n = 8;
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + 0.1 + (i + 0.5) * ((W - 0.2) / n);
    r.caixa((W - 0.2) / n, 0.92, 0.08, x, 0, zf - 0.02, i % 2 ? b : a, 0.02);
  }
  r.caixa(W - 0.2, 0.9, 0.6, 0, 0, zf - 0.36, CORES.madeira, 0.03);
  r.caixa(W + 0.1, 0.09, 0.78, 0, 0.92, zf - 0.32, '#c08a52', 0.03);
  // a prateleira do fundo e o pano de fundo de duas cores
  r.caixa(W - 0.2, 0.08, 0.36, 0, 1.45, zt + 0.12, CORES.madeira, 0.02);
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + 0.1 + (i + 0.5) * ((W - 0.2) / n);
    r.caixa((W - 0.2) / n, 1.5, 0.05, x, 0.9, zt - 0.04, i % 2 ? CORES.creme : b, 0.01);
  }
  // o toldo: gomos de duas cores do fundo (alto) até a frente (baixo), em três degraus
  const m = 9;
  const lw = (W + 0.5) / m;
  const prof = zf - zt + 0.5;
  for (let i = 0; i < m; i++) {
    const x = -(W + 0.5) / 2 + (i + 0.5) * lw;
    const c = i % 2 ? b : a;
    for (let k = 0; k < 3; k++) {
      const z = zt - 0.1 + (k + 0.5) * (prof / 3);
      r.caixa(lw, 0.12, prof / 3 + 0.04, x, 2.85 - k * 0.12, z, c, 0.03);
    }
    // o bico pendurado na frente
    r.caixa(lw * 0.92, 0.24, 0.06, x, 2.42, zf + 0.42, c, 0.04);
    r.caixa(lw * 0.46, 0.1, 0.06, x, 2.34, zf + 0.42, c, 0.03);
  }
}

/** O doce de abóbora no balcão (o tampo em y = 0): potinhos de tampa roxa e a travessa. */
export function balcaoDoce(r: Ref): void {
  // a travessa redonda com os quadradinhos laranja (o doce de corte), em montinho
  r.caixa(1.2, 0.04, 0.72, -0.75, 0.0, 0, CORES.roxo, 0.02);
  r.caixa(1.1, 0.03, 0.64, -0.75, 0.04, 0, CORES.creme, 0.01);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 2; j++)
      r.caixa(0.3, 0.24, 0.3, -1.1 + i * 0.35, 0.07, -0.16 + j * 0.34, (i + j) % 2 ? '#e8782a' : '#f49a3a', 0.06);
  r.caixa(0.3, 0.24, 0.3, -0.92, 0.31, 0.01, '#f49a3a', 0.06);
  r.caixa(0.3, 0.24, 0.3, -0.58, 0.31, 0.01, '#e8782a', 0.06);
  // os potinhos de vidro com o doce laranja e a tampa roxa de laço
  for (let i = 0; i < 3; i++) {
    const x = 0.45 + i * 0.42;
    r.prisma(10, 0.15, 0.34, x, 0.17, 0, '#f6ecdc', 'y');
    r.prisma(10, 0.13, 0.24, x, 0.13, 0, '#ee8a2c', 'y');
    r.prisma(10, 0.17, 0.08, x, 0.38, 0, CORES.roxo, 'y');
    r.caixa(0.1, 0.07, 0.1, x, 0.42, 0, CORES.laranja, 0.03);
  }
}

/** A maçã do amor em pé: redonda, de calda vermelha brilhante, com o palito para cima. */
function macaDoAmor(r: Ref, x: number, y: number, z: number): void {
  bolinha(r, x, y + 0.2, z, 0.21, '#c81e26', [1, 0.92, 1]);
  // a calda que escorreu e virou o pezinho, e o brilho
  bolinha(r, x, y + 0.05, z, 0.17, '#a8141c', [1.1, 0.35, 1.1]);
  bolinha(r, x - 0.08, y + 0.29, z + 0.15, 0.05, '#ffe0e0');
  r.barra([x, y + 0.34, z], [x, y + 0.78, z], 0.045, '#f0e2c0');
}

/** As maçãs do amor no balcão (o tampo em y = 0), em pé numa travessa redonda. */
export function balcaoMaca(r: Ref): void {
  r.caixa(1.6, 0.04, 0.7, -0.17, 0.0, -0.05, CORES.roxo, 0.02);
  r.caixa(1.5, 0.03, 0.62, -0.17, 0.04, -0.05, CORES.creme, 0.01);
  for (const [x, z] of [
    [-0.7, -0.17],
    [-0.22, -0.17],
    [0.26, -0.17],
    [-0.46, 0.15],
    [0.02, 0.15],
    [0.5, 0.15],
  ] as const)
    macaDoAmor(r, x, 0.07, z);
}

/** A plaquinha de desenho em cima do toldo (sem letra): o meio da base em 0, 0, 0. */
function plaquinha(r: Ref, fundo: string): void {
  r.caixa(1.3, 0.96, 0.1, 0, 0.06, 0, fundo, 0.05);
  r.caixa(1.42, 0.08, 0.14, 0, 0.0, 0, CORES.madeiraEscura, 0.02);
  r.caixa(1.42, 0.08, 0.14, 0, 1.0, 0, CORES.madeiraEscura, 0.02);
  for (const s of [-1, 1]) r.caixa(0.08, 1.06, 0.14, s * 0.67, 0.0, 0, CORES.madeiraEscura, 0.02);
}
/** A plaquinha da barraca do doce: a abóbora redonda e três cubinhos de doce. */
export function placaDoce(r: Ref): void {
  plaquinha(r, '#dccaf0');
  r.placa(circulo(0.21, 16, -0.12, 0.6), 0.05, 0, 0, 0.07, '#d8701c');
  r.placa(circulo(0.21, 16, 0.12, 0.6), 0.05, 0, 0, 0.07, '#d8701c');
  r.placa(circulo(0.24, 16, 0, 0.6), 0.05, 0, 0, 0.09, '#f28c26');
  r.caixa(0.07, 0.14, 0.04, 0, 0.82, 0.1, CORES.musgo, 0.02);
  for (let i = 0; i < 3; i++) r.caixa(0.14, 0.14, 0.05, -0.2 + i * 0.2, 0.18, 0.08, '#e8782a', 0.03);
}
/** A plaquinha da barraca da maçã do amor: a maçã redonda com a folhinha e o brilho da calda. */
export function placaMaca(r: Ref): void {
  plaquinha(r, '#d6e8b4');
  r.placa(circulo(0.25, 18, -0.1, 0.52), 0.05, 0, 0, 0.07, '#d42a2e');
  r.placa(circulo(0.25, 18, 0.1, 0.52), 0.05, 0, 0, 0.07, '#d42a2e');
  r.placa(circulo(0.07, 10, -0.14, 0.62), 0.03, 0, 0, 0.1, '#ffc8c8');
  r.caixa(0.05, 0.14, 0.04, 0, 0.76, 0.1, CORES.madeiraEscura, 0.02);
  r.placa(
    [
      [0, 0],
      [0.1, 0.05],
      [0.2, 0.0],
      [0.1, -0.05],
    ],
    0.03,
    0.03,
    0.84,
    0.1,
    '#4e8a2e',
  );
  r.barra([0, 0.12, 0.08], [0, 0.3, 0.08], 0.05, '#c89a5a');
}

// ------------------------------------------------------------------ as casinhas

/** A porta de casinha (o vão de 1 x 2 blocos atrás; a frente da parede em z = 0). */
export function porta(r: Ref, cor: string): void {
  // o batente na parede e a folha um pouco para dentro
  r.caixa(1.16, 0.12, 0.08, 0, 2.0, 0.02, CORES.madeiraEscura, 0.02);
  for (const s of [-1, 1]) r.caixa(0.12, 2.06, 0.08, s * 0.53, 0, 0.02, CORES.madeiraEscura, 0.02);
  r.caixa(0.94, 1.96, 0.1, 0, 0.02, -0.12, cor, 0.03);
  // as duas almofadas da porta, um tom mais escuro
  for (const y of [0.25, 1.1]) r.caixa(0.62, 0.62, 0.04, 0, y, -0.05, escurecer(cor, 0.8), 0.04);
  r.caixa(0.1, 0.1, 0.06, 0.32, 0.95, -0.03, CORES.dourado, 0.03);
}

/** A porta da Vovó: roxa, grande e redonda em cima (o vão de 3 x 3 blocos atrás). */
export function portaVovo(r: Ref): void {
  // o fundo de tábua escura cobre o vão inteiro
  r.caixa(2.9, 2.96, 0.1, 0, 0.02, -0.14, '#4a3020', 0.02);
  const roxo = '#7a4aae';
  r.caixa(2.0, 2.0, 0.12, 0, 0.02, -0.06, roxo, 0.04);
  // o arco em degraus redondos
  const degraus: [number, number][] = [
    [1.9, 0.22],
    [1.65, 0.2],
    [1.25, 0.18],
    [0.7, 0.16],
  ];
  let y = 2.02;
  for (const [w, h] of degraus) {
    r.caixa(w, h, 0.12, 0, y, -0.06, roxo, 0.06);
    y += h;
  }
  // as tábuas (frisos), a janelinha redonda acesa e a maçaneta dourada
  for (const x of [-0.5, 0, 0.5]) r.caixa(0.04, 2.3, 0.04, x, 0.1, 0.01, '#5e3488', 0);
  r.placa(circulo(0.3, 16, 0, 2.15), 0.04, 0, 0, 0.03, '#4a2c6e');
  r.placa(circulo(0.22, 16, 0, 2.15), 0.04, 0, 0, 0.06, '#ffd56a', true);
  r.prisma(10, 0.09, 0.08, 0.72, 1.05, 0.04, CORES.dourado, 'z');
}

/** A janela redonda da Vovó (no plano da parede, z = 0): a moldura e o vidro aceso em cruz. */
export function janelaRedonda(r: Ref): void {
  r.placa(circulo(0.62, 18), 0.08, 0, 0, 0.04, '#4a3266');
  r.placa(circulo(0.5, 18), 0.06, 0, 0, 0.07, '#ffd87e', true);
  r.caixa(0.08, 1.0, 0.06, 0, -0.5, 0.1, '#4a3266', 0);
  r.caixa(1.0, 0.08, 0.06, 0, -0.04, 0.1, '#4a3266', 0);
}

/**
 * A campainha da porta: o botão redondo dourado numa plaquinha na parede (z = 0), na altura
 * da mão do boneco, com um sininho pequeno em cima.
 */
export function campainha(r: Ref): void {
  r.caixa(0.26, 0.36, 0.05, 0, 0, 0.025, CORES.roxoEscuro, 0.03);
  r.prisma(12, 0.08, 0.06, 0, 0.16, 0.08, CORES.dourado, 'z');
  r.prisma(12, 0.05, 0.04, 0, 0.16, 0.12, '#ffe07a', 'z');
  // o sininho em cima da plaquinha
  r.caixa(0.06, 0.06, 0.08, 0, 0.36, 0.05, CORES.roxoEscuro, 0);
  r.caixa(0.2, 0.05, 0.16, 0, 0.42, 0.06, CORES.dourado, 0.02);
  r.caixa(0.16, 0.12, 0.12, 0, 0.47, 0.06, '#f0c24a', 0.04);
  r.caixa(0.08, 0.06, 0.08, 0, 0.59, 0.06, CORES.dourado, 0.02);
}

/**
 * Teia de barbante no canto: poucos fios, finos e claros, do canto (0, 0) para baixo e para o
 * lado `lado` (1 direita, -1 esquerda), no plano z = 0 da peça; o vão fica vazio.
 */
export function teia(r: Ref, raio: number, lado: 1 | -1): void {
  const raios = 4;
  const ponta = (k: number, f: number): V3 => {
    const a = (k / (raios - 1)) * (Math.PI / 2);
    return [Math.cos(a) * raio * f * lado, -Math.sin(a) * raio * f, 0];
  };
  for (let k = 0; k < raios; k++) r.barra([0, 0, 0], ponta(k, 1), 0.035, CORES.barbante);
  for (const f of [0.45, 0.9])
    for (let k = 0; k < raios - 1; k++) {
      const a = ponta(k, f);
      const b = ponta(k + 1, f);
      const m: V3 = [(a[0] + b[0]) * 0.46, (a[1] + b[1]) * 0.46, 0];
      r.barra(a, m, 0.032, CORES.barbante);
      r.barra(m, b, 0.032, CORES.barbante);
    }
}

/** O caldeirão da Vovó Zuleica: facetado e grande, com o suco de uva borbulhando lilás. */
export function caldeirao(r: Ref): void {
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.5;
    r.caixa(0.16, 0.18, 0.16, Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42, '#2e2a36', 0.03);
  }
  r.prisma(10, 0.42, 0.14, 0, 0.16, 0, '#3e3652', 'y');
  r.prisma(10, 0.56, 0.36, 0, 0.4, 0, '#4a4060', 'y');
  r.prisma(10, 0.5, 0.16, 0, 0.66, 0, '#443a5a', 'y');
  r.prisma(10, 0.56, 0.1, 0, 0.78, 0, '#5c5274', 'y');
  // o suco roxo (aceso de leve), acima da beira, e as bolhas lilás
  r.prisma(10, 0.48, 0.06, 0, 0.84, 0, '#9a5ad6', 'y', true);
  for (const [x, z, t] of [
    [0.16, 0.06, 0.16],
    [-0.18, -0.12, 0.13],
    [0.02, -0.24, 0.1],
    [-0.08, 0.2, 0.11],
    [0.26, -0.18, 0.08],
  ] as const)
    bolinha(r, x, 0.86 + t * 0.35, z, t / 2, '#d8b8f8', [1, 0.8, 1]);
  // a colher de pau
  r.barra([0.24, 0.8, 0.14], [0.52, 1.5, 0.36], 0.06, CORES.madeira);
}

/** A fumacinha clara do caldeirão (bolinhas de vapor subindo, acesas de leve). */
export function vapor(r: Ref): void {
  for (const [x, y, z, t] of [
    [0.05, 1.05, 0, 0.2],
    [-0.12, 1.32, 0.05, 0.24],
    [0.1, 1.62, -0.04, 0.28],
    [-0.04, 1.95, 0.02, 0.22],
  ] as const)
    // (bolinhas redondas: as caixinhas de canto redondo pareciam hexágonos)
    bolinha(r, x, y + t * 0.4, z, t / 2, '#efe4fa', [1, 0.85, 1], true);
}

/** A vassoura encostada na parede (z = 0): o cabo e as palhas presas com a fita roxa. */
export function vassoura(r: Ref): void {
  const pe: V3 = [0, 0.04, 0.55];
  const topo: V3 = [0, 1.9, 0.06];
  const dx = topo[0] - pe[0];
  const dy = topo[1] - pe[1];
  const dz = topo[2] - pe[2];
  const L = Math.hypot(dx, dy, dz);
  const em = (t: number): V3 => [pe[0] + (dx * t) / L, pe[1] + (dy * t) / L, pe[2] + (dz * t) / L];
  r.barra(em(0.5), topo, 0.09, CORES.madeira);
  for (const x of [-0.18, 0, 0.18]) {
    const a = em(0);
    const b = em(0.62);
    r.barra([a[0] + x * 1.2, a[1], a[2]], [b[0] + x * 0.6, b[1], b[2]], 0.2, '#e8b850');
  }
  const f = em(0.55);
  r.barra([f[0] - 0.2, f[1], f[2]], [f[0] + 0.2, f[1], f[2]], 0.14, CORES.roxo);
}

/** A lua crescente dourada (gorda) e duas estrelinhas, acesas, no plano z = 0. */
export function luaEstrelas(r: Ref): void {
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

// ------------------------------------------------------------------ o bosque

/**
 * O poste de ferro de brinquedo (roxo-escuro) da lanterna de bloco: a base, a haste grossa e
 * o colar que segura a lanterna (o bloco fica em cima, de `alt` a `alt` + 1).
 */
export function posteFerro(r: Ref, alt: number): void {
  r.caixa(0.62, 0.18, 0.62, 0, 0, 0, CORES.ferro, 0.05);
  r.caixa(0.44, 0.2, 0.44, 0, 0.18, 0, '#46365c', 0.05);
  r.caixa(0.24, alt - 0.38, 0.24, 0, 0.38, 0, CORES.ferro, 0.04);
  r.caixa(0.5, 0.12, 0.5, 0, alt - 0.12, 0, '#46365c', 0.03);
  r.caixa(0.32, 0.12, 0.32, 0, 0.9, 0, '#46365c', 0.03);
}

/** O telhadinho roxo em degraus por cima do bloco da lanterna (o meio em 0, 0, 0). */
export function capaLanterna(r: Ref): void {
  r.caixa(1.1, 0.1, 1.1, 0, 0, 0, CORES.ferro, 0.03);
  r.caixa(0.66, 0.12, 0.66, 0, 0.1, 0, CORES.roxoEscuro, 0.03);
  r.caixa(0.3, 0.12, 0.3, 0, 0.22, 0, CORES.roxoEscuro, 0.03);
  r.caixa(0.14, 0.14, 0.14, 0, 0.34, 0, CORES.laranja, 0.04);
}

// ------------------------------------------------------------------ a horta

export type Carinha = 'sorridente' | 'piscando' | 'surpresa';

/**
 * A carinha acesa na frente de uma abóbora de raio `k` (a frente em z = k): olhos redondos e
 * a boca bem diferentes em cada uma (sorriso, piscadinha com língua, "oh!" de surpresa).
 */
export function carinha(r: Ref, x: number, y: number, k: number, tipo: Carinha): void {
  const f = k + 0.02;
  const cor = CORES.luz;
  const olho = (ox: number) =>
    r.placa(circulo(0.15 * k, 12, 0, 0), 0.04, x + ox, y + 0.24 * k, f, cor, true);
  if (tipo === 'piscando') {
    // o olho fechado: um arco (três traços em "^" deitado)
    r.barra([x - 0.3 * k, y + 0.22 * k, f], [x - 0.2 * k, y + 0.29 * k, f], 0.05 * k, cor, true);
    r.barra([x - 0.2 * k, y + 0.29 * k, f], [x - 0.1 * k, y + 0.22 * k, f], 0.05 * k, cor, true);
    olho(0.2 * k);
  } else if (tipo === 'surpresa') {
    // olhos maiores e as sobrancelhas levantadas
    r.placa(circulo(0.1 * k * 2, 12, 0, 0), 0.04, x - 0.2 * k, y + 0.26 * k, f, cor, true);
    r.placa(circulo(0.1 * k * 2, 12, 0, 0), 0.04, x + 0.2 * k, y + 0.26 * k, f, cor, true);
    r.caixa(0.16 * k, 0.04 * k, 0.03, x - 0.2 * k, y + 0.5 * k, f, '#7a3a10', 0.01);
    r.caixa(0.16 * k, 0.04 * k, 0.03, x + 0.2 * k, y + 0.5 * k, f, '#7a3a10', 0.01);
  } else {
    olho(-0.2 * k);
    olho(0.2 * k);
  }
  if (tipo === 'surpresa') {
    // a boca de "oh!": um anel redondinho
    r.placa(circulo(0.09 * k, 12, 0, 0), 0.04, x, y - 0.18 * k, f, cor, true);
    r.placa(circulo(0.045 * k, 10, 0, 0), 0.04, x, y - 0.18 * k, f + 0.01, '#8a4012');
    return;
  }
  // o sorriso em U (cinco gomos) e as bochechas
  const pts: [number, number][] = [
    [-0.3, 0.0],
    [-0.18, -0.15],
    [0, -0.2],
    [0.18, -0.15],
    [0.3, 0.0],
  ];
  for (let i = 0; i < pts.length - 1; i++)
    r.barra(
      [x + pts[i][0] * k, y + pts[i][1] * k - 0.05 * k, f],
      [x + pts[i + 1][0] * k, y + pts[i + 1][1] * k - 0.05 * k, f],
      0.07 * k,
      cor,
      true,
    );
  if (tipo === 'piscando')
    // a pontinha da língua
    r.placa(circulo(0.06 * k, 10, 0, 0), 0.04, x + 0.08 * k, y - 0.29 * k, f, '#ff8a8a');
  for (const s of [-1, 1])
    r.placa(circulo(0.07 * k, 10, 0, 0), 0.03, x + s * 0.36 * k, y + 0.02 * k, f - 0.01, '#ff9a6a');
}

/**
 * A bancada do Seu Jerônimo: a mesa de tábuas e o lugar das três abóboras (o modelo de
 * brinquedo vai por cima, em `fantasias.ts`); as três carinhas vão com elas.
 */
export function bancada(r: Ref): void {
  const H = 0.86;
  r.caixa(2.8, 0.1, 0.9, 0, H, 0, CORES.madeira, 0.03);
  r.caixa(2.7, 0.08, 0.8, 0, 0.26, 0, CORES.madeiraEscura, 0.02);
  for (const x of [-1.25, 1.25])
    for (const z of [-0.34, 0.34]) r.caixa(0.12, H, 0.12, x, 0, z, CORES.madeiraEscura, 0.03);
  for (let i = 0; i < 3; i++) r.caixa(0.6, 0.04, 0.6, -0.9 + i * 0.9, H + 0.1, 0.02, CORES.creme, 0.01);
}

/** O carrinho de mão de madeira, com a roda na frente (+z) e os cabos para trás. */
export function carrinhoDeMao(r: Ref): void {
  r.roda(0.26, 0.12, 0, 0.26, 0.95, '#3a2c2a');
  r.roda(0.12, 0.14, 0, 0.26, 0.95, CORES.dourado);
  // a caçamba de tábuas, larga em cima
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
}
