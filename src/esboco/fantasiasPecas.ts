/**
 * Esboço da spec 027 (Noite das Fantasias): as peças de brinquedo que não são bloco, no
 * estilo das peças da Vila Neon (`render/vila/ref.ts`): caixas de quina de brinquedo, barras
 * quadradas, prismas facetados; nada de liso redondo. Coordenadas locais da Vila: x para a
 * direita de quem olha a frente, y para cima (0 é o chão da peça), z para a frente.
 *
 * Tudo PROVISÓRIO (o palco do esboço): na implementação, as peças viram tipos da Vila (o
 * desenho fundido por chunk, como `render/vila/index.ts`).
 */
import { dadosPlaca } from '../render/formas';
import type { V3 } from '../render/solidos';
import { perfilEstrela, type Ref } from '../render/vila/ref';

export const CORES = {
  roxo: '#6a3e9c',
  roxoEscuro: '#46305e',
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
  barbante: '#efe8f2',
  luz: '#ffd56a',
  luzMorna: '#ffc45a',
} as const;

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
  // as bandeirolas de frente para o lado do fio
  const ang = Math.atan2(b[0] - a[0], b[2] - a[2]) - Math.PI / 2;
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const q = Math.max(3, Math.round(L / 0.72));
  for (let i = 0; i < q; i++) {
    const t = (i + 0.5) / q;
    const f = Math.min(n - 0.001, t * n);
    const k = Math.floor(f);
    const u = f - k;
    const p: V3 = [0, 1, 2].map((j) => pts[k][j] + (pts[k + 1][j] - pts[k][j]) * u) as V3;
    const vd = dadosPlaca(
      [
        [-0.25, 0],
        [0.25, 0],
        [0, -0.5],
      ],
      0.035,
    );
    const P = vd.positions as number[];
    const N = vd.normals as number[];
    for (let j = 0; j < P.length; j += 3) {
      const [x, y, z] = [P[j], P[j + 1], P[j + 2]];
      P[j] = p[0] + x * c + z * s;
      P[j + 1] = p[1] - 0.03 + y;
      P[j + 2] = p[2] - x * s + z * c;
      const [nx, nz] = [N[j], N[j + 2]];
      N[j] = nx * c + nz * s;
      N[j + 2] = -nx * s + nz * c;
    }
    vd.uvs = null;
    r.por(vd, false, i % 2 ? CORES.roxo : CORES.laranja);
    // a lampadinha entre duas bandeirolas
    if (comLuz && i < q - 1) {
      const f2 = Math.min(n - 0.001, ((i + 1) / q) * n);
      const k2 = Math.floor(f2);
      const u2 = f2 - k2;
      const p2 = [0, 1, 2].map((j) => pts[k2][j] + (pts[k2 + 1][j] - pts[k2][j]) * u2);
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

// ------------------------------------------------------------------ barracas

/** Em cima do balcão da barraca do doce de abóbora: a bandeja de cubinhos e os potes. */
export function balcaoDoce(r: Ref): void {
  // a bandeja de doce em cubinhos
  r.caixa(1.6, 0.05, 0.62, -0.9, 0, 0, CORES.creme, 0.02);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 2; j++)
      r.caixa(
        0.24,
        0.16,
        0.24,
        -1.42 + i * 0.35,
        0.05,
        -0.14 + j * 0.3,
        j % 2 ? '#e8822a' : '#f09636',
        0.04,
      );
  // os potes de doce, de tampa roxa e laço laranja
  for (let i = 0; i < 3; i++) {
    const x = 0.45 + i * 0.42;
    r.caixa(0.32, 0.36, 0.32, x, 0, 0, '#f2dcc0', 0.05);
    r.caixa(0.27, 0.26, 0.27, x, 0.04, 0, '#ee8a2c', 0.04);
    r.caixa(0.36, 0.08, 0.36, x, 0.36, 0, CORES.roxo, 0.03);
    r.caixa(0.1, 0.08, 0.1, x, 0.44, 0, CORES.laranja, 0.03);
  }
  // o tacho de cobre no fundo (facetado)
  r.prisma(8, 0.36, 0.34, 1.75, 0.17, -0.05, '#b8642a', 'y');
  r.prisma(8, 0.33, 0.04, 1.75, 0.35, -0.05, '#f09030', 'y');
  r.barra([1.75, 0.3, -0.05], [1.9, 0.75, -0.2], 0.05, CORES.madeiraEscura);
}

/** Em cima do balcão da barraca da maçã do amor: o suporte com as maçãs no palito. */
export function balcaoMaca(r: Ref): void {
  r.caixa(2.6, 0.14, 0.5, -0.2, 0, 0, CORES.madeira, 0.04);
  r.caixa(2.5, 0.08, 0.42, -0.2, 0.14, 0, CORES.creme, 0.02);
  for (let i = 0; i < 5; i++)
    for (let j = 0; j < 2; j++) {
      const x = -1.2 + i * 0.5 + j * 0.25;
      const z = -0.1 + j * 0.2;
      const y = 0.22 + j * 0.02;
      // a maçã vermelha de calda brilhante, de quina redonda (brinquedo), e o palito
      r.caixa(0.3, 0.27, 0.3, x, y, z, j % 2 ? '#d42a2e' : '#e0343a', 0.11);
      r.caixa(0.14, 0.04, 0.14, x, y + 0.27, z, '#b82024', 0.02);
      r.barra([x, y + 0.27, z], [x, y + 0.62, z], 0.035, '#f0e2c0');
    }
  // as maçãs embrulhadas no saquinho com o laço roxo
  for (let i = 0; i < 2; i++) {
    const x = 1.55 + i * 0.32;
    r.caixa(0.3, 0.38, 0.3, x, 0, 0.05, '#f4eef8', 0.08);
    r.caixa(0.22, 0.2, 0.22, x, 0.06, 0.06, '#d42a2e', 0.08);
    r.caixa(0.2, 0.06, 0.2, x, 0.38, 0.05, CORES.roxo, 0.02);
  }
}

/**
 * A toalha de festa no balcão de blocos da barraca (o meio da frente do balcão em 0, 0, 0; o
 * balcão tem 1 de altura e 1 de fundo, para -z): o pano por cima e a barra de bicos na frente.
 */
export function toalhaBalcao(r: Ref, largura: number, bico: string): void {
  r.caixa(largura + 0.1, 0.06, 1.08, 0, 1.0, -0.5, CORES.creme, 0.02);
  r.caixa(largura + 0.1, 0.32, 0.05, 0, 0.72, 0.03, CORES.creme, 0.01);
  const n = Math.round(largura / 0.42);
  for (let i = 0; i < n; i++) {
    const x = -largura / 2 + (i + 0.5) * (largura / n);
    r.caixa(0.3, 0.16, 0.05, x, 0.6, 0.05, i % 2 ? bico : CORES.creme, 0.04);
    r.caixa(0.16, 0.08, 0.05, x, 0.53, 0.05, i % 2 ? bico : CORES.creme, 0.03);
  }
}

/** A plaquinha de desenho em cima do toldo (sem letra): o meio da base em 0, 0, 0. */
function plaquinha(r: Ref): void {
  r.caixa(1.3, 0.9, 0.1, 0, 0.06, 0, CORES.creme, 0.04);
  r.caixa(1.42, 0.08, 0.14, 0, 0.0, 0, CORES.madeiraEscura, 0.02);
  r.caixa(1.42, 0.08, 0.14, 0, 0.94, 0, CORES.madeiraEscura, 0.02);
  for (const s of [-1, 1]) r.caixa(0.08, 1.0, 0.14, s * 0.67, 0.0, 0, CORES.madeiraEscura, 0.02);
}
/** A plaquinha da barraca do doce: a abóbora desenhada (gomos facetados e o cabinho). */
export function placaDoce(r: Ref): void {
  plaquinha(r);
  r.prisma(8, 0.24, 0.06, -0.15, 0.48, 0.07, '#d8701c', 'z');
  r.prisma(8, 0.24, 0.06, 0.15, 0.48, 0.07, '#d8701c', 'z');
  r.prisma(8, 0.27, 0.07, 0, 0.48, 0.08, '#f08a24', 'z');
  r.caixa(0.07, 0.16, 0.05, 0, 0.72, 0.09, CORES.musgo, 0.02);
  r.caixa(0.16, 0.06, 0.05, 0.1, 0.8, 0.09, '#6a8a3a', 0.02);
}
/** A plaquinha da barraca da maçã do amor: a maçã vermelha no palito. */
export function placaMaca(r: Ref): void {
  plaquinha(r);
  r.barra([0, 0.14, 0.08], [0, 0.34, 0.08], 0.05, '#c89a5a');
  r.prisma(8, 0.27, 0.07, 0, 0.52, 0.08, '#d42a2e', 'z');
  r.caixa(0.06, 0.12, 0.05, 0, 0.78, 0.09, CORES.madeiraEscura, 0.02);
  r.caixa(0.16, 0.08, 0.05, 0.11, 0.8, 0.09, '#5a9a3a', 0.02);
  r.caixa(0.07, 0.07, 0.03, -0.1, 0.6, 0.12, '#ff8a8a', 0.02);
}

// ------------------------------------------------------------------ as casinhas

/**
 * A campainha da porta: o sininho dourado pendurado no suporte, com a cordinha roxa (a
 * criança reconhece o sino; tocar é só um toque). A peça encosta na parede (z = 0).
 */
export function campainha(r: Ref): void {
  r.caixa(0.2, 0.2, 0.06, 0, 0.32, 0.03, CORES.roxoEscuro, 0.02);
  r.barra([0, 0.42, 0.04], [0, 0.42, 0.34], 0.06, CORES.roxoEscuro);
  // o sino: a boca larga embaixo, o corpo e o cocuruto
  r.caixa(0.3, 0.07, 0.3, 0, 0.0, 0.34, CORES.dourado, 0.02);
  r.caixa(0.24, 0.16, 0.24, 0, 0.06, 0.34, '#f0c24a', 0.05);
  r.caixa(0.15, 0.1, 0.15, 0, 0.22, 0.34, '#f0c24a', 0.04);
  r.caixa(0.07, 0.1, 0.07, 0, 0.31, 0.34, CORES.dourado, 0.02);
  // o badalo e a cordinha de puxar
  r.caixa(0.08, 0.08, 0.08, 0, -0.07, 0.34, '#c8902a', 0.03);
  r.barra([0.1, 0.02, 0.36], [0.12, -0.42, 0.36], 0.03, CORES.roxo);
  r.caixa(0.08, 0.1, 0.08, 0.12, -0.52, 0.36, CORES.laranja, 0.03);
}

/**
 * Teia de barbante no canto: os fios grossos e fofos (de brinquedo), do canto (0, 0) para
 * baixo e para o lado `lado` (1 direita, -1 esquerda), no plano z = 0 da peça.
 */
export function teia(r: Ref, raio: number, lado: 1 | -1): void {
  const raios = 5;
  const pontaDo = (k: number, f: number): V3 => {
    const a = (k / (raios - 1)) * (Math.PI / 2);
    return [Math.cos(a) * raio * f * lado, -Math.sin(a) * raio * f, 0];
  };
  for (let k = 0; k < raios; k++) r.barra([0, 0, 0], pontaDo(k, 1), 0.05, CORES.barbante);
  for (const f of [0.38, 0.68, 0.96])
    for (let k = 0; k < raios - 1; k++) {
      const a = pontaDo(k, f);
      const b = pontaDo(k + 1, f);
      // o fio da volta cai um pouquinho para o canto (barbante solto)
      const m: V3 = [(a[0] + b[0]) * 0.47, (a[1] + b[1]) * 0.47, 0];
      r.barra(a, m, 0.045, CORES.barbante);
      r.barra(m, b, 0.045, CORES.barbante);
    }
}

/** O caldeirão da Vovó Zuleica na varanda: facetado, com o suco de uva borbulhando. */
export function caldeirao(r: Ref): void {
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.5;
    r.caixa(0.14, 0.16, 0.14, Math.cos(a) * 0.36, 0, Math.sin(a) * 0.36, '#2e2a36', 0.03);
  }
  // a barriga (mais larga no meio) e a boca com a beira grossa
  r.prisma(8, 0.5, 0.36, 0, 0.36, 0, '#4a4060', 'y');
  r.prisma(8, 0.42, 0.14, 0, 0.13, 0, '#3e3652', 'y');
  r.prisma(8, 0.46, 0.16, 0, 0.6, 0, '#443a5a', 'y');
  r.prisma(8, 0.52, 0.1, 0, 0.72, 0, '#5c5274', 'y');
  // o suco roxo (aceso de leve), acima da beira, e as bolhas
  r.prisma(8, 0.44, 0.06, 0, 0.78, 0, '#9a5ad6', 'y', true);
  for (const [x, z, t] of [
    [0.14, 0.06, 0.14],
    [-0.16, -0.1, 0.11],
    [0.02, -0.2, 0.09],
    [-0.06, 0.18, 0.08],
  ] as const)
    r.caixa(t, t, t, x, 0.8, z, '#c8a0f0', t / 3);
  // a colher de pau encostada na beira
  r.barra([0.2, 0.74, 0.12], [0.46, 1.42, 0.32], 0.06, CORES.madeira);
  r.caixa(0.14, 0.06, 0.12, 0.2, 0.74, 0.12, CORES.madeira, 0.02);
}

/** A lua crescente dourada e duas estrelinhas na fachada da Vovó (no plano z = 0). */
export function luaEstrelas(r: Ref): void {
  const p: Array<[number, number]> = [];
  for (let a = 50; a <= 310; a += 20) {
    const t = (a * Math.PI) / 180;
    p.push([Math.cos(t) * 0.5, Math.sin(t) * 0.5]);
  }
  for (let a = 310; a >= 50; a -= 20) {
    const t = (a * Math.PI) / 180;
    p.push([-0.2 + Math.cos(t) * 0.38, Math.sin(t) * 0.38]);
  }
  // acesas (a lua e as estrelas da Vovó brilham de noite)
  r.placa(p, 0.06, 0, 0, 0.03, '#ffd24a', true);
  r.placa(perfilEstrela(0.19), 0.05, 0.5, 0.3, 0.03, '#ffe07a', true);
  r.placa(perfilEstrela(0.13), 0.05, 0.42, -0.34, 0.03, '#ffe07a', true);
}

/** A vassoura encostada na parede (z = 0): o cabo e as palhas presas com a fita roxa. */
export function vassoura(r: Ref): void {
  const pe: V3 = [0, 0.04, 0.52];
  const topo: V3 = [0, 1.78, 0.06];
  const dx = topo[0] - pe[0];
  const dy = topo[1] - pe[1];
  const dz = topo[2] - pe[2];
  const L = Math.hypot(dx, dy, dz);
  const em = (t: number): V3 => [pe[0] + (dx * t) / L, pe[1] + (dy * t) / L, pe[2] + (dz * t) / L];
  r.barra(em(0.5), topo, 0.08, CORES.madeira);
  // as palhas: três feixes lado a lado, do pé até a amarração
  for (const x of [-0.15, 0, 0.15]) {
    const a = em(0);
    const b = em(0.6);
    r.barra([a[0] + x * 1.2, a[1], a[2]], [b[0] + x * 0.6, b[1], b[2]], 0.17, '#e8b850');
  }
  const f = em(0.52);
  r.barra([f[0] - 0.16, f[1], f[2]], [f[0] + 0.16, f[1], f[2]], 0.12, CORES.roxo);
}

// ------------------------------------------------------------------ o bosque

/** O telhadinho roxo em degraus por cima do bloco da lanterna (o meio em 0, 0, 0). */
export function capaLanterna(r: Ref): void {
  r.caixa(1.14, 0.1, 1.14, 0, 0, 0, CORES.roxoEscuro, 0.03);
  r.caixa(0.74, 0.12, 0.74, 0, 0.1, 0, CORES.roxo, 0.03);
  r.caixa(0.38, 0.12, 0.38, 0, 0.22, 0, CORES.roxo, 0.03);
  r.caixa(0.14, 0.14, 0.14, 0, 0.34, 0, CORES.laranja, 0.04);
}

// ------------------------------------------------------------------ a horta

/**
 * Abóbora de brinquedo de peças (o meio da base em x, y, z; `k` o tamanho, 1 = meio bloco):
 * os gomos são caixas de quina redonda em dois tons, o cabinho musgo.
 */
export function aboborinha(r: Ref, x: number, y: number, z: number, k: number): void {
  const a = '#f08a24';
  const b = '#d8701c';
  r.caixa(0.42 * k, 0.38 * k, 0.5 * k, x, y, z, a, 0.12 * k);
  r.caixa(0.28 * k, 0.34 * k, 0.44 * k, x - 0.2 * k, y + 0.01 * k, z, b, 0.1 * k);
  r.caixa(0.28 * k, 0.34 * k, 0.44 * k, x + 0.2 * k, y + 0.01 * k, z, b, 0.1 * k);
  r.caixa(0.5 * k, 0.36 * k, 0.3 * k, x, y + 0.01 * k, z, a, 0.1 * k);
  r.caixa(0.07 * k, 0.14 * k, 0.07 * k, x, y + 0.36 * k, z, '#5a7630', 0.02 * k);
  r.caixa(0.16 * k, 0.03 * k, 0.1 * k, x + 0.08 * k, y + 0.38 * k, z, '#6a8a3a', 0.01 * k);
}

export type Carinha = 'sorridente' | 'piscando' | 'surpresa';

/**
 * A carinha acesa na frente da abóbora de peças (`k` o tamanho da abóbora): olhos redondos e
 * boca de sorriso, piscando ou de "oh!" fofo. Nada de dente.
 */
export function carinha(r: Ref, x: number, y: number, z: number, k: number, tipo: Carinha): void {
  const f = z + 0.25 * k + 0.012;
  const cor = CORES.luz;
  const olho = 0.07 * k;
  const yo = y + 0.24 * k;
  if (tipo === 'piscando') {
    // o olho fechado: o risquinho curvo (dois traços em "u" deitado)
    r.luz(0.1 * k, 0.025 * k, 0.02, x - 0.1 * k, yo + 0.01 * k, f, cor);
    r.luz(0.03 * k, 0.03 * k, 0.02, x - 0.155 * k, yo + 0.03 * k, f, cor);
  } else r.luz(olho, olho * (tipo === 'surpresa' ? 1.3 : 1), 0.02, x - 0.1 * k, yo, f, cor);
  r.luz(olho, olho * (tipo === 'surpresa' ? 1.3 : 1), 0.02, x + 0.1 * k, yo, f, cor);
  const yb = y + 0.1 * k;
  if (tipo === 'surpresa') {
    // a boquinha de "oh!": um quadradinho
    r.luz(0.07 * k, 0.07 * k, 0.02, x, yb - 0.01 * k, f, cor);
    return;
  }
  // o sorriso em U: o fundo e as duas pontas subindo
  r.luz(0.16 * k, 0.035 * k, 0.02, x, yb, f, cor);
  r.luz(0.035 * k, 0.05 * k, 0.02, x - 0.095 * k, yb + 0.02 * k, f, cor);
  r.luz(0.035 * k, 0.05 * k, 0.02, x + 0.095 * k, yb + 0.02 * k, f, cor);
}

/**
 * A bancada do Seu Jerônimo: a mesa de tábuas e as três abóboras para escolher a carinha
 * (sorridente, piscando e surpresa), com o copinho de pincéis (pintar, não cortar).
 */
export function bancada(r: Ref): void {
  const H = 0.86;
  r.caixa(2.6, 0.1, 0.9, 0, H, 0, CORES.madeira, 0.03);
  r.caixa(2.5, 0.08, 0.8, 0, 0.26, 0, CORES.madeiraEscura, 0.02);
  for (const x of [-1.15, 1.15])
    for (const z of [-0.34, 0.34]) r.caixa(0.12, H, 0.12, x, 0, z, CORES.madeiraEscura, 0.03);
  const tipos: Carinha[] = ['sorridente', 'piscando', 'surpresa'];
  tipos.forEach((t, i) => {
    const x = -0.8 + i * 0.8;
    r.caixa(0.5, 0.04, 0.5, x, H + 0.1, 0.05, CORES.creme, 0.01);
    aboborinha(r, x, H + 0.14, 0.05, 1.15);
    carinha(r, x, H + 0.14, 0.05, 1.15, t);
  });
  // o copinho de pincéis
  r.caixa(0.18, 0.2, 0.18, 1.15, H + 0.1, -0.25, CORES.roxo, 0.03);
  r.barra([1.12, H + 0.25, -0.25], [1.08, H + 0.5, -0.27], 0.03, CORES.madeira);
  r.barra([1.18, H + 0.25, -0.24], [1.24, H + 0.48, -0.22], 0.03, CORES.madeira);
  r.caixa(0.05, 0.06, 0.05, 1.08, H + 0.5, -0.27, CORES.laranja, 0.01);
  r.caixa(0.05, 0.06, 0.05, 1.24, H + 0.48, -0.22, CORES.musgo, 0.01);
  // abóboras pequenas debaixo da mesa (para levar)
  aboborinha(r, -0.6, 0.34, 0, 0.8);
  aboborinha(r, 0.3, 0.34, 0.05, 0.7);
}
