/**
 * O desenho das peças do Parque de diversões da Vila Neon (spec 026, parte 2): as que ficam
 * paradas (o arco da entrada, os pés da roda-gigante, as prendas das barracas, o carrinho do
 * algodão-doce, o poste dos balões, o cocho) e os moldes das que mexem (a roda, a cadeirinha, o
 * carrossel, o cavalinho, o carrinho do bate-bate, os balões, a argola, o peixinho), que
 * `parque.ts` monta uma vez e anima.
 *
 * Regras (identidade visual do jogo): peças quadradas de brinquedo, facetadas, nunca lisas;
 * toldos e gomos em DUAS cores (nada de arco-íris, regra do dono); as cores do parque são as do
 * festival (vermelho, branco, azul e amarelo, nunca em ordem de arco-íris); nenhuma marca.
 *
 * Coordenadas locais: x para a direita de quem olha a frente, y para cima, z para a frente.
 */
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { LETREIROS, LETREIRO, type TipoPecaVila } from '../../world/vilaNeon';
import { PISTA_BATE } from '../../world/vilaParque';
import { CADEIRAS, PENDURA_RODA } from '../../jogo/parque';
import { COR, LAMPADAS, Ref, perfilEstrela } from './ref';
import { estrelaNeon, fundoPlaca, textoNeon } from './neon';

/** As medidas da roda-gigante (as mesmas do plano: `vilaParque.ts`). */
export const RODA = {
  raio: 7.5,
  /** A altura do eixo acima do chão. */
  eixo: 9.55,
  /** Os dois aros (de um lado e do outro das cadeirinhas). */
  aro: 1.25,
  /** Onde os pés pisam (para cada lado do meio) e a que distância do plano da roda. */
  pe: 4.7,
  cavalete: 1.95,
} as const;

/** As medidas do carrossel (do alto do pedestal de blocos para cima). */
export const CARROSSEL = {
  deque: 5.25,
  alturaDeque: 0.25,
  toldo: 4.35,
  cavalos: 3.7,
} as const;

const CREME = '#f6ecd8';
const VERMELHO2 = '#c8241f';
const MADEIRA2 = '#8a5a30';
const BORRACHA = '#2a2b33';

/** Desenha a peça parada do parque; devolve se era dele. */
export function desenharPecaParque(r: Ref, tipo: TipoPecaVila, n: number): boolean {
  switch (tipo) {
    // as peças grandes (mais largas que um pedaço de chão) são de `parque.ts`: só aparecem com
    // o chão de todos os pedaços onde pisam desenhado (a regra do campo de visão)
    case 'arco-parque':
      arcoParque(r);
      return true;
    case 'roda-gigante':
    case 'carrossel':
    case 'bate-bate':
      return true;
    case 'barraca-argola':
      barracaArgola(r);
      return true;
    case 'barraca-pesca':
      barracaPesca(r);
      return true;
    case 'algodao':
      carrinhoAlgodao(r);
      return true;
    case 'baloes':
      posteBaloes(r);
      return true;
    case 'cocho':
      cocho(r);
      return true;
    default:
      void n;
      return false;
  }
}

// ------------------------------------------------------------------ a entrada

/**
 * O arco de lâmpadas da entrada: dois postes de gomos vermelhos e brancos, o arco de cubos por
 * cima com as lâmpadas dos dois lados, a estrela no alto e a placa com o nome pendurada.
 */
export function arcoParque(r: Ref): void {
  const X = 2.75;
  const H = 4.2;
  for (const x of [-X, X]) {
    r.caixa(0.9, 0.3, 0.9, x, 0, 0, COR.grafite2, 0.05);
    for (let k = 0; k < 6; k++)
      r.caixa(0.62, 0.65, 0.62, x, 0.3 + k * 0.65, 0, k % 2 ? CREME : COR.vermelho, 0.05);
    r.caixa(0.8, 0.16, 0.8, x, H, 0, COR.amarelo, 0.04);
  }
  // o arco: nove gomos de cubo, alternando as duas cores
  const N = 9;
  const pt = (k: number): [number, number, number] => {
    const a = Math.PI * (1 - k / N);
    return [Math.cos(a) * X, H + 0.1 + Math.sin(a) * X * 0.86, 0];
  };
  for (let k = 0; k < N; k++) r.barra(pt(k), pt(k + 1), 0.56, k % 2 ? CREME : COR.vermelho);
  // as lâmpadas, dos dois lados do arco e subindo pelos postes
  for (const z of [0.34, -0.34]) {
    for (let k = 0; k <= 26; k++) {
      const a = Math.PI * (1 - k / 26);
      const x = Math.cos(a) * X;
      const y = H + 0.1 + Math.sin(a) * X * 0.86;
      r.luz(0.17, 0.17, 0.12, x, y - 0.08, z, LAMPADAS[k % 2 ? 1 : 0]);
    }
    for (const x of [-X, X])
      for (let k = 0; k < 6; k++) r.luz(0.15, 0.15, 0.1, x, 0.55 + k * 0.65, z, LAMPADAS[0]);
  }
  // a estrela do alto
  const topo = H + 0.1 + X * 0.86;
  r.caixa(0.16, 0.5, 0.16, 0, topo + 0.2, 0, COR.cromo, 0);
  r.placa(perfilEstrela(0.62), 0.16, 0, topo + 1.15, 0, COR.amarelo, true);
  // a placa pendurada, lida dos dois lados
  const w = 4.3;
  const h = 0.95;
  const y = H - 0.75;
  for (const x of [-1.7, 1.7]) r.caixa(0.08, 1.2, 0.08, x, y + h, 0, COR.cromo, 0);
  r.caixa(w + 0.16, h + 0.16, 0.3, 0, y, 0, COR.grafite, 0.04);
  const texto = LETREIROS[LETREIRO.parque] ?? '';
  const pintar = (g: CanvasRenderingContext2D, L: number, A: number) => {
    fundoPlaca(g, L, A, '#2a1430', '#ffe14a');
    textoNeon(g, texto, L / 2, A * 0.52, A * 0.3, ['#ffe14a', '#ff5a4a']);
    estrelaNeon(g, L * 0.045, A * 0.5, A * 0.15, '#fff1c4', A * 0.035);
    estrelaNeon(g, L * 0.955, A * 0.5, A * 0.15, '#fff1c4', A * 0.035);
  };
  r.quadro(w, h, 0, y + 0.08 + h / 2, 0.165, pintar, true, 512);
  r.quadro(w, h, 0, y + 0.08 + h / 2, -0.165, pintar, true, 512, true);
}

// ------------------------------------------------------------------ a roda-gigante

/** O que não gira: os dois cavaletes azuis (um de cada lado da roda), as sapatas e o eixo. */
export function pesDaRoda(r: Ref): void {
  const { eixo: E, pe: P, cavalete: Z } = RODA;
  // as duas sapatas compridas (uma de cada lado), de onde sobem as pernas dos cavaletes
  for (const s of [-1, 1]) r.caixa(1.1, 0.4, 5.0, s * P, 0, 0, COR.grafite2, 0.06);
  for (const z of [Z, -Z]) {
    for (const s of [-1, 1]) r.barra([s * P, 0.3, z], [0, E, z], 0.46, COR.azul);
    // as travessas do cavalete e as lâmpadas subindo pelas pernas
    for (const k of [0.3, 0.62]) {
      const x = P * (1 - k);
      r.barra([-x, E * k, z], [x, E * k, z], 0.26, CREME);
    }
    const f = z > 0 ? 0.28 : -0.28;
    for (const s of [-1, 1])
      for (let k = 1; k <= 7; k++) {
        const t = k / 8;
        r.luz(0.16, 0.16, 0.12, s * P * (1 - t), 0.3 + (E - 0.3) * t, z + f, LAMPADAS[k % 2]);
      }
    r.caixa(0.9, 0.9, 0.36, 0, E - 0.45, z, COR.amarelo, 0.08);
  }
  // o eixo, de cavalete a cavalete
  r.prisma(8, 0.3, Z * 2 + 0.5, 0, E, 0, COR.cromo, 'z');
  // o degrau de embarque, embaixo de onde a cadeirinha passa
  r.caixa(3.2, 0.14, 2.3, 0, 0, 0, COR.grafite2, 0.03);
  r.caixa(3.0, 0.05, 2.1, 0, 0.14, 0, COR.amarelo, 0);
}

/** A roda que gira (o meio dela em 0, 0, 0; o disco no plano x-y): aros, raios, miolo e travessas. */
export function rodaQueGira(r: Ref): void {
  const { raio: R, aro: A } = RODA;
  const N = 24;
  const no = (k: number, raio: number, n: number, z: number): [number, number, number] => {
    const a = (k / n) * Math.PI * 2;
    return [Math.sin(a) * raio, -Math.cos(a) * raio, z];
  };
  for (const z of [A, -A]) {
    // o aro de fora em gomos vermelhos e brancos, o de dentro azul
    for (let k = 0; k < N; k++)
      r.barra(no(k, R, N, z), no(k + 1, R, N, z), 0.5, k % 2 ? CREME : COR.vermelho);
    for (let k = 0; k < 16; k++) r.barra(no(k, 4.1, 16, z), no(k + 1, 4.1, 16, z), 0.3, COR.azul);
    // os oito raios (um para cada cadeirinha)
    for (let k = 0; k < 8; k++) r.barra([0, 0, z], no(k, R - 0.2, 8, z), 0.24, CREME);
    // o miolo: o disco amarelo e o botão vermelho
    r.prisma(8, 1.05, 0.34, 0, 0, z, COR.amarelo, 'z');
    r.prisma(8, 0.5, 0.2, 0, 0, z + Math.sign(z) * 0.24, COR.vermelho, 'z');
  }
  // as travessas de onde as cadeirinhas pendem
  for (let k = 0; k < CADEIRAS.roda; k++) r.barra(no(k, R, 8, -A), no(k, R, 8, A), 0.2, COR.cromo);
}

/** As lâmpadas da roda (giram com ela): nos aros, nos raios e a estrela do miolo. */
export function luzesDaRoda(r: Ref): void {
  const { raio: R, aro: A } = RODA;
  for (const z of [A + 0.3, -A - 0.3]) {
    for (let k = 0; k < 24; k++) {
      const a = ((k + 0.5) / 24) * Math.PI * 2;
      r.luz(0.2, 0.2, 0.14, Math.sin(a) * R, -Math.cos(a) * R - 0.1, z, LAMPADAS[k % 2]);
    }
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      for (const d of [2.2, 3.3, 5.2, 6.3])
        r.luz(0.16, 0.16, 0.12, Math.sin(a) * d, -Math.cos(a) * d - 0.08, z, '#ffd76a');
    }
    r.placa(perfilEstrela(0.4), 0.1, 0, 0, z + Math.sign(z) * 0.12, '#fff1c4', true);
  }
}

/**
 * A cadeirinha (o eixo dela, de onde pende, em 0, 0, 0; quem senta olha para +z): o toldinho de
 * duas cores, as hastes, a cuba e o banco. `v`: a cor (0 vermelha, 1 azul).
 */
export function cadeirinha(r: Ref, v: number): void {
  const cor = v ? COR.azul : COR.vermelho;
  const escura = v ? '#2068c8' : VERMELHO2;
  const A = PENDURA_RODA;
  // as alças do eixo até o toldo
  for (const x of [-0.62, 0.62]) r.barra([x, 0, 0], [x, -0.55, 0], 0.1, COR.cromo);
  // o toldinho em gomos (duas cores)
  for (let k = 0; k < 4; k++)
    r.caixa(0.42, 0.14, 1.24, -0.63 + k * 0.42, -0.62, 0, k % 2 ? CREME : cor, 0.03);
  for (const x of [-0.72, 0.72])
    for (const z of [-0.5, 0.5]) r.barra([x, -0.6, z], [x, -A - 0.1, z], 0.07, COR.cromo);
  // a cuba: o piso, as laterais, as costas altas e a frente baixa
  const piso = -A - 0.46;
  r.caixa(1.6, 0.12, 1.2, 0, piso, 0, escura, 0.04);
  for (const x of [-0.74, 0.74]) r.caixa(0.12, 0.62, 1.2, x, piso + 0.1, 0, cor, 0.04);
  r.caixa(1.6, 0.86, 0.12, 0, piso + 0.1, -0.54, cor, 0.04);
  r.caixa(1.6, 0.4, 0.12, 0, piso + 0.1, 0.54, cor, 0.04);
  r.caixa(1.62, 0.1, 0.14, 0, piso + 0.5, 0.54, CREME, 0.02);
  r.caixa(1.62, 0.1, 0.14, 0, piso + 0.96, -0.54, CREME, 0.02);
  // o banco (o assento fica em -PENDURA)
  r.caixa(1.34, 0.12, 0.5, 0, -A - 0.12, -0.24, CREME, 0.03);
  r.caixa(1.34, 0.34, 0.1, 0, -A - 0.46, -0.02, escura, 0);
  // a estrelinha na frente
  r.placa(perfilEstrela(0.17), 0.04, 0, piso + 0.3, 0.61, COR.amarelo);
}

// ------------------------------------------------------------------ o carrossel

/** Gomo de anel (de r0 a r1, de a0 a a1, de y0 a y1), facetado: o toldo e o deque em fatias. */
function gomo(
  r: Ref,
  r0: number,
  r1: number,
  y0: number,
  y1: number,
  yDentro: number,
  a0: number,
  a1: number,
  cor: string,
): void {
  const p = (raio: number, a: number, y: number): [number, number, number] => [
    Math.sin(a) * raio,
    y,
    Math.cos(a) * raio,
  ];
  // os oito cantos: embaixo (y0) e em cima (o de fora em y1, o de dentro em yDentro)
  const b0 = p(r0, a0, y0);
  const b1 = p(r1, a0, y0);
  const b2 = p(r1, a1, y0);
  const b3 = p(r0, a1, y0);
  const t0 = p(r0, a0, yDentro);
  const t1 = p(r1, a0, y1);
  const t2 = p(r1, a1, y1);
  const t3 = p(r0, a1, yDentro);
  const P: number[] = [];
  const N: number[] = [];
  const I: number[] = [];
  const face = (q: [number, number, number][]) => {
    const [a, b, c] = q;
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const vz = c[2] - a[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l;
    ny /= l;
    nz /= l;
    const base = P.length / 3;
    for (const v of q) {
      P.push(v[0], v[1], v[2]);
      N.push(nx, ny, nz);
    }
    for (let k = 1; k + 1 < q.length; k++) I.push(base, base + k, base + k + 1);
  };
  face([t0, t1, t2, t3]);
  face([b3, b2, b1, b0]);
  face([b1, b2, t2, t1]);
  face([b0, b1, t1, t0]);
  face([b2, b3, t3, t2]);
  if (r0 > 0.01) face([b3, b0, t0, t3]);
  const vd = new VertexData();
  vd.positions = P;
  vd.normals = N;
  vd.indices = I;
  // (as faces saem viradas para fora ou para dentro conforme o gomo: os dois lados contam)
  r.por(dobrar(vd), false, cor);
}

/** A mesma malha com as faces dos dois lados (peça fina de brinquedo, vista de cima e de baixo). */
function dobrar(vd: VertexData): VertexData {
  const P = vd.positions as number[];
  const N = vd.normals as number[];
  const I = vd.indices as number[];
  const n = P.length / 3;
  const out = new VertexData();
  out.positions = [...P, ...P];
  out.normals = [...N, ...N.map((v) => -v)];
  const J: number[] = [...I];
  for (let k = 0; k < I.length; k += 3) J.push(I[k] + n, I[k + 2] + n, I[k + 1] + n);
  out.indices = J;
  return out;
}

/**
 * A coluna do meio do carrossel (gira com ele): oito lados creme, as cintas vermelhas e os
 * espelhinhos. É uma malha à parte: some se a câmera da criança chegar colada nela (como as
 * paredes do jogo, em vez de tapar a tela).
 */
export function colunaDoCarrossel(r: Ref): void {
  const { alturaDeque: AD, toldo: T } = CARROSSEL;
  r.prisma(8, 1.0, T - AD, 0, AD + (T - AD) / 2, 0, CREME, 'y');
  for (const y of [AD + 0.2, 2.3, T - 0.5]) r.prisma(8, 1.12, 0.3, 0, y, 0, COR.vermelho, 'y');
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    r.caixa(0.34, 0.7, 0.06, Math.sin(a) * 0.98, 1.1, Math.cos(a) * 0.98, '#bfe6f6', 0.02);
  }
}

/** O carrossel que gira (o meio do alto do pedestal em 0, 0, 0): deque, toldo e mastros. */
export function carrosselQueGira(r: Ref): void {
  const { deque: D, alturaDeque: AD, toldo: T, cavalos: RC } = CARROSSEL;
  const N = 12;
  const passo = (Math.PI * 2) / N;
  // o deque em doze fatias creme, com a beira vermelha
  for (let k = 0; k < N; k++) {
    gomo(r, 0, D - 0.3, 0, AD, AD, k * passo, (k + 1) * passo, k % 2 ? '#efe2c6' : CREME);
    gomo(r, D - 0.3, D, 0, AD + 0.06, AD + 0.06, k * passo, (k + 1) * passo, COR.vermelho);
  }
  // o toldo de DUAS cores (vermelho e creme), em três degraus de gomos, e a barra pendurada
  for (let k = 0; k < N; k++) {
    const cor = k % 2 ? CREME : COR.vermelho;
    const a0 = k * passo;
    const a1 = (k + 1) * passo;
    gomo(r, 3.6, 5.7, T, T + 0.5, T + 1.05, a0, a1, cor);
    gomo(r, 1.6, 3.6, T + 0.55, T + 1.05, T + 1.65, a0, a1, cor);
    gomo(r, 0, 1.6, T + 1.15, T + 1.65, T + 2.15, a0, a1, cor);
    gomo(r, 5.45, 5.75, T - 0.42, T, T, a0 + 0.04, a1 - 0.04, k % 2 ? COR.vermelho : CREME);
  }
  // o pináculo: a bolinha amarela e a estrela
  r.prisma(8, 0.34, 0.5, 0, T + 2.35, 0, COR.amarelo, 'y');
  r.caixa(0.1, 0.5, 0.1, 0, T + 2.6, 0, COR.cromo, 0);
  r.placa(perfilEstrela(0.36), 0.1, 0, T + 3.4, 0, COR.amarelo);
  // os mastros dos cavalinhos (do deque ao toldo). Como no carrossel de verdade, o mastro passa
  // pelo pescoço do cavalinho, na frente da sela (dono, 16 nov 2026: "como se estivesse entrando
  // na cabeça dele"): a criança senta atrás dele e segura com as duas mãos
  for (let k = 0; k < CADEIRAS.carrossel; k++) {
    const a = (k / CADEIRAS.carrossel) * Math.PI * 2;
    // (o cavalinho olha ao longo da volta: a frente dele é (cos a, -sen a))
    const x = Math.sin(a) * RC + Math.cos(a) * FRENTE_DO_MASTRO;
    const z = Math.cos(a) * RC - Math.sin(a) * FRENTE_DO_MASTRO;
    r.barra([x, AD, z], [x, T + 0.2, z], 0.1, COR.amarelo);
  }
}

/** O mastro do cavalinho fica este tanto à frente do assento (blocos): no pescoço dele. */
export const FRENTE_DO_MASTRO = 0.8;
/** Quanto o cavalinho é mais comprido na frente (o pescoço e a cabeça vão depois do mastro). */
const FRENTE_DO_CAVALINHO = 0.58;
/** A alça da sela (onde as mãos seguram): quanto à frente do assento e a que altura. */
export const ALCA_DO_CAVALINHO = { z: 0.4, y: 0.3 } as const;

/** Uma lâmpada do carrossel: o ângulo e o raio em volta do meio, a altura, a cor e o tamanho. */
export interface LampadaDoCarrossel {
  a: number;
  raio: number;
  y: number;
  /** 0 ou 1: a cor (`LAMPADAS`). */
  v: number;
  /** O tamanho, em relação à lâmpada da barra do toldo. */
  tam: number;
}
/**
 * As lâmpadas do carrossel (giram com ele): a volta da barra do toldo e a coluna. Cada uma é uma
 * cópia solta de `lampadaDoToldo`: a que fica colada na câmera de quem anda no cavalinho encolhe
 * até sumir, em vez de virar uma bola amarela na frente da tela.
 */
export function luzesDoCarrossel(): LampadaDoCarrossel[] {
  const T = CARROSSEL.toldo;
  const l: LampadaDoCarrossel[] = [];
  for (let k = 0; k < 36; k++)
    l.push({ a: ((k + 0.5) / 36) * Math.PI * 2, raio: 5.86, y: T - 0.3, v: k % 2, tam: 1 });
  for (let k = 0; k < 8; k++)
    for (const y of [1.95, 2.75, 3.4])
      l.push({ a: (k / 8) * Math.PI * 2, raio: 1.12, y, v: 1, tam: 0.13 / 0.17 });
  return l;
}
/** Uma lâmpada do carrossel (a base em 0, 0, 0), numa das duas cores. */
export function lampadaDoToldo(r: Ref, v: number): void {
  r.luz(0.17, 0.17, 0.17, 0, 0, 0, LAMPADAS[v % 2]);
}

/**
 * O cavalinho (o assento em 0, 0, 0; olha para +z): de blocos, com a sela e a rédea coloridas.
 * `v`: 0 branco de sela vermelha, 1 caramelo de sela azul.
 */
export function cavalinho(r: Ref, v: number): void {
  const pelo = v ? '#e0a860' : '#f6f4ee';
  const crina = v ? '#6a4326' : '#ffd23d';
  const sela = v ? COR.azul : COR.vermelho;
  // (o cavalinho é comprido na frente: entre a sela e o pescoço fica o lugar do mastro, bem à
  // frente da cabeça e do cabelo de quem senta, por maior que seja)
  const F = FRENTE_DO_CAVALINHO;
  // o corpo, o pescoço e a cabeça
  r.caixa(0.46, 0.46, 1.12 + F, 0, -0.5, F / 2, pelo, 0.08);
  r.barra([0, -0.28, 0.42 + F], [0, 0.34, 0.7 + F], 0.34, pelo);
  r.caixa(0.3, 0.3, 0.56, 0, 0.2, 0.62 + F, pelo, 0.06);
  r.caixa(0.24, 0.2, 0.16, 0, 0.2, 0.92 + F, '#f0c8b0', 0.04);
  for (const x of [-0.1, 0.1]) {
    r.caixa(0.08, 0.16, 0.08, x, 0.48, 0.58 + F, pelo, 0.02);
    r.caixa(0.05, 0.07, 0.02, x * 1.5, 0.34, 0.9 + F, '#24232a', 0);
  }
  // a crina e o rabo
  r.barra([0, -0.02, 0.36 + F], [0, 0.52, 0.56 + F], 0.12, crina);
  r.barra([0, -0.14, -0.56], [0, -0.62, -0.78], 0.14, crina);
  // as pernas (as da frente dobradas, de galope)
  for (const x of [-0.15, 0.15]) {
    r.barra([x, -0.46, 0.4 + F], [x, -0.74, 0.62 + F], 0.13, pelo);
    r.barra([x, -0.74, 0.62 + F], [x, -0.9, 0.46 + F], 0.12, pelo);
    r.barra([x, -0.46, -0.4], [x, -0.92, -0.56], 0.13, pelo);
    r.caixa(0.14, 0.07, 0.14, x, -0.97, -0.58, '#3a2a20', 0);
  }
  // a sela, a manta e a rédea
  r.caixa(0.52, 0.09, 0.56, 0, -0.07, -0.06, sela, 0.03);
  r.caixa(0.5, 0.3, 0.44, 0, -0.34, -0.06, v ? '#f6f4ee' : '#ffd23d', 0.02);
  r.caixa(0.33, 0.06, 0.06, 0, 0.28, 0.8 + F, sela, 0);
  // a argola do mastro, no lombo, na frente da sela (o mastro passa por ali)
  r.caixa(0.18, 0.1, 0.18, 0, -0.06, FRENTE_DO_MASTRO, COR.amarelo, 0.03);
  // a alça da sela: é nela que a criança segura com as duas mãos (o mastro fica mais à frente,
  // longe do rosto, do boné e do cabelo: a cabeça do boneco é grande e o braço é curto)
  const A = ALCA_DO_CAVALINHO;
  r.barra([0, -0.06, A.z], [0, A.y, A.z], 0.07, COR.cromo);
  r.caixa(0.5, 0.08, 0.08, 0, A.y - 0.02, A.z, COR.amarelo, 0.03);
}

// ------------------------------------------------------------------ o bate-bate

/** As lâmpadas da barra do teto do bate-bate (penduradas por baixo da malha, na volta toda). */
export function luzesDoBate(r: Ref): void {
  // (a peça fica no meio de um bloco da pista; a barra do teto dá a volta um bloco para fora da
  // mureta)
  const { u0, u1, v0, v1, pu, pv } = PISTA_BATE;
  const y = 4.74;
  for (let u = u0 - 1; u <= u1 + 1; u++)
    for (const v of [v0 - 1, v1 + 1]) r.luz(0.22, 0.22, 0.22, u - pu, y, v - pv, LAMPADAS[u & 1]);
  for (let v = v0; v <= v1; v++)
    for (const u of [u0 - 1, u1 + 1])
      r.luz(0.22, 0.22, 0.22, u - pu, y, v - pv, LAMPADAS[(v + 1) & 1]);
  // as lampadinhas verdes da saída, em cima da mureta, na frente do tapete
  const t = TAPETE_LOCAL();
  for (let x = t.x0 + 0.5; x < t.x1; x += 1)
    r.luz(0.2, 0.1, 0.12, x, ALTURA_MURETA, t.z1 + 0.1, '#6dff9a');
}

/** A mureta de borracha: quanto entra no bloco da grade (da face da pista para fora) e a altura. */
const FUNDO_MURETA = 0.22;
const ALTURA_MURETA = 0.4;
/** A pista por dentro e o tapete da saída, nas medidas da peça (a origem no meio do bloco dela). */
const PISTA_LOCAL = () => {
  const { u0, u1, v0, v1, pu, pv } = PISTA_BATE;
  return { x0: u0 + 0.5 - pu, x1: u1 - 0.5 - pu, z0: v0 + 0.5 - pv, z1: v1 - 0.5 - pv };
};
const TAPETE_LOCAL = () => {
  const { v1, pu, pv } = PISTA_BATE;
  return { x0: 131 - 0.5 - pu, x1: 134 + 0.5 - pu, z1: v1 - 0.5 - pv };
};

/**
 * A mureta de borracha da pista do bate-bate: uma faixa baixa, de gomos vermelhos e brancos, na
 * volta toda, encostada por dentro na grade. É nela que o para-choque do carrinho bate (a face de
 * dentro é a beira da pista da conta); na frente do tapete da saída os gomos são verdes.
 */
export function muretaDoBate(r: Ref): void {
  const p = PISTA_LOCAL();
  const t = TAPETE_LOCAL();
  const F = FUNDO_MURETA;
  for (let x = p.x0; x < p.x1 - 1e-6; x += 1) {
    const gomo = Math.round(x - p.x0) & 1;
    const cor = gomo ? CREME : COR.vermelho;
    r.caixa(1, ALTURA_MURETA, F, x + 0.5, 0, p.z0 - F / 2, cor, 0.04);
    const saida = x + 0.5 > t.x0 && x + 0.5 < t.x1;
    r.caixa(1, ALTURA_MURETA, F, x + 0.5, 0, p.z1 + F / 2, saida ? (gomo ? CREME : '#35b85c') : cor, 0.04);
  }
  for (let z = p.z0; z < p.z1 - 1e-6; z += 1) {
    const cor = Math.round(z - p.z0) & 1 ? COR.vermelho : CREME;
    r.caixa(F, ALTURA_MURETA, 1, p.x0 - F / 2, 0, z + 0.5, cor, 0.04);
    r.caixa(F, ALTURA_MURETA, 1, p.x1 + F / 2, 0, z + 0.5, cor, 0.04);
  }
}

/** As cores dos carrinhos (o corpo e o friso): os quatro dos moradores e os quatro das crianças. */
export const CORES_CARRINHO: readonly [string, string][] = [
  [COR.turquesa, CREME],
  [COR.laranja, COR.azul],
  ['#f6f4ee', COR.vermelho],
  ['#8a5ad8', COR.amarelo],
  [COR.vermelho, CREME],
  [COR.azul, COR.amarelo],
  [COR.amarelo, COR.vermelho],
  [COR.rosa, CREME],
];

/**
 * O carrinho do bate-bate (o assento em 0, 0, 0; anda para +z): o para-choque de borracha, o
 * corpo de duas cores e o volante (a haste até o teto é à parte: `hasteDoCarrinho`).
 */
export function carrinho(r: Ref, v: number): void {
  const [cor, friso] = CORES_CARRINHO[v % CORES_CARRINHO.length];
  const y0 = -0.36;
  // o para-choque em volta e as rodinhas escondidas
  // (quase redondo, do tamanho da roda de borracha da conta: é ele que encosta nos outros)
  r.caixa(1.86, 0.3, 1.96, 0, y0, 0, BORRACHA, 0.36);
  // o corpo: o capô, as laterais e o encosto
  r.caixa(1.34, 0.42, 0.76, 0, y0 + 0.22, 0.56, cor, 0.1);
  for (const x of [-0.56, 0.56]) r.caixa(0.22, 0.46, 0.8, x, y0 + 0.22, -0.2, cor, 0.06);
  r.caixa(1.34, 0.74, 0.34, 0, y0 + 0.22, -0.78, cor, 0.08);
  r.caixa(1.36, 0.1, 2.0, 0, y0 + 0.2, 0, friso, 0.02);
  // o assento
  r.caixa(0.9, 0.1, 0.62, 0, -0.1, -0.24, '#3a3944', 0.02);
  r.caixa(0.9, 0.5, 0.1, 0, -0.02, -0.58, '#3a3944', 0.02);
  // o volante
  r.barra([0, 0.24, 0.3], [0, 0.42, 0.08], 0.07, COR.cromo);
  r.prisma(8, 0.2, 0.06, 0, 0.44, 0.06, '#24232a', 'z');
  // o número de estrela no capô e o farolzinho
  r.placa(perfilEstrela(0.2), 0.04, 0, 0.34, 0.6, friso);
}
/** Onde a haste sai do carrinho (para o lado direito e para trás do assento). */
export const HASTE_DO_CARRINHO = { x: 0.58, z: -0.86 } as const;

/**
 * A haste do carrinho até a malha do teto e a sapata (o pé dela em 0, 0, 0; `haste`: do assento
 * até o teto). É uma cópia solta, fora do carrinho: a do carrinho da criança que guia não é
 * desenhada, e a de um carrinho colado na câmera afina até sumir (nenhuma haste corta a tela).
 */
export function hasteDoCarrinho(r: Ref, haste: number): void {
  r.barra([0, 0.4, 0], [0, haste - 0.12, 0], 0.07, COR.cromo);
  r.caixa(0.34, 0.08, 0.14, 0, haste - 0.14, 0, COR.cromo, 0);
}

/** O farol do carrinho (aceso) e a ponta da haste. */
export function luzesDoCarrinho(r: Ref): void {
  for (const x of [-0.42, 0.42]) r.luz(0.2, 0.14, 0.06, x, -0.02, 0.96, '#fff1c4');
  r.luz(0.5, 0.08, 0.06, 0, 0.14, -0.97, '#ff4a3a');
}

// ------------------------------------------------------------------ as barracas de prendas

/** As três estacas da barraca das argolas (x de cada uma) e a altura da mesa. */
export const PINOS_ARGOLA = [-1.1, 0, 1.1] as const;
export const MESA_ARGOLA = { y: 0.92, z: -0.4, pino: 0.56 } as const;
/** O fundo da barraca por dentro (a prateleira encosta nele) e o tampo do balcão da frente. */
const FUNDO_BARRACA = -0.8;
export const BALCAO_BARRACA = { y: 1.0, z: 1.5 } as const;

/** A barraca das argolas por dentro: a mesa com os três pinos e a prateleira dos bichinhos. */
function barracaArgola(r: Ref): void {
  const { y, z, pino } = MESA_ARGOLA;
  const F = FUNDO_BARRACA;
  r.caixa(3.5, y, 1.0, 0, 0, z, COR.vermelho, 0.05);
  r.caixa(3.6, 0.08, 1.1, 0, y, z, CREME, 0.02);
  PINOS_ARGOLA.forEach((x, k) => {
    r.caixa(0.44, 0.08, 0.44, x, y + 0.08, z, [COR.azul, COR.amarelo, COR.azul][k], 0.02);
    r.caixa(0.13, pino, 0.13, x, y + 0.16, z, COR.madeira, 0.03);
    r.caixa(0.17, 0.08, 0.17, x, y + 0.16 + pino, z, COR.amarelo, 0.02);
  });
  // a prateleira das prendas, no fundo: três bichinhos de pelúcia (ursinho, coelho, patinho)
  r.caixa(3.5, 0.08, 0.4, 0, 2.0, F, MADEIRA2, 0.02);
  const bichos: [number, string, string][] = [
    [-1.1, '#c98a52', '#f0d2a8'],
    [0, '#f6f4ee', '#ffb0c8'],
    [1.1, '#ffd23d', '#ff8a2a'],
  ];
  bichos.forEach(([x, pelo, miolo], k) => {
    r.caixa(0.4, 0.42, 0.32, x, 2.08, F, pelo, 0.08);
    r.caixa(0.36, 0.34, 0.32, x, 2.48, F, pelo, 0.08);
    r.caixa(0.2, 0.2, 0.06, x, 2.14, F + 0.17, miolo, 0.03);
    r.caixa(0.16, 0.1, 0.08, x, 2.5, F + 0.19, miolo, 0.03);
    for (const s of [-1, 1]) {
      r.caixa(0.05, 0.05, 0.03, x + s * 0.09, 2.66, F + 0.165, '#24232a', 0);
      // orelhas: redondas no urso, compridas no coelho, nenhuma no patinho
      if (k === 0) r.caixa(0.13, 0.13, 0.1, x + s * 0.17, 2.78, F, pelo, 0.04);
      if (k === 1) r.caixa(0.1, 0.34, 0.08, x + s * 0.1, 2.8, F, pelo, 0.03);
      r.caixa(0.13, 0.26, 0.14, x + s * 0.26, 2.14, F + 0.05, pelo, 0.04);
    }
  });
  // as argolas de reserva, penduradas num gancho
  for (let k = 0; k < 3; k++)
    aro(r.sub(-1.45, 1.4 - k * 0.07, F - 0.1, 0), [COR.vermelho, COR.amarelo, COR.azul][k], true);
  r.luz(0.5, 0.06, 0.1, 0, 2.86, 0.3, '#ffe9a8');
}

/** Uma argola (deitada: o furo para cima, o meio em 0, 0, 0), em oito gomos. */
export function aro(r: Ref, cor: string, emPe = false): void {
  const R = 0.3;
  for (let k = 0; k < 8; k++) {
    const a0 = (k / 8) * Math.PI * 2;
    const a1 = ((k + 1) / 8) * Math.PI * 2;
    const p = (a: number): [number, number, number] =>
      emPe ? [Math.cos(a) * R, Math.sin(a) * R, 0] : [Math.cos(a) * R, 0, Math.sin(a) * R];
    r.barra(p(a0), p(a1), 0.09, cor);
  }
}

/** A tina da pescaria (o meio dela, em x e z) e a altura da água. */
export const TINA_PESCA = { y: 0.86, z: -0.15 } as const;

/** A barraca da pescaria por dentro: a tina azul de água, a varinha e as prendas no fundo. */
function barracaPesca(r: Ref): void {
  const { y, z } = TINA_PESCA;
  const F = FUNDO_BARRACA;
  r.caixa(3.5, y - 0.1, 1.5, 0, 0, z, COR.azul, 0.06);
  r.caixa(3.6, 0.12, 1.6, 0, y - 0.12, z, CREME, 0.03);
  r.caixa(3.2, 0.06, 1.2, 0, y - 0.04, z, '#4ac8ee', 0);
  r.caixa(1.1, 0.04, 0.4, -0.7, y, z + 0.2, '#8fe0f6', 0);
  r.caixa(0.8, 0.04, 0.3, 0.9, y, z - 0.3, '#8fe0f6', 0);
  // a varinha encostada, com a linha e a boia
  r.barra([1.62, 0.8, 0.5], [1.7, 2.3, -0.1], 0.07, COR.madeira);
  r.barra([1.7, 2.3, -0.1], [1.3, 1.02, -0.1], 0.03, '#f6f4ee');
  r.caixa(0.16, 0.1, 0.16, 1.3, 0.9, -0.1, COR.vermelho, 0.03);
  r.caixa(3.5, 0.08, 0.4, 0, 2.0, F, MADEIRA2, 0.02);
  // as prendas da prateleira: baldinho, bola e barquinho
  r.caixa(0.36, 0.34, 0.36, -1.1, 2.08, F, COR.amarelo, 0.05);
  r.caixa(0.4, 0.06, 0.4, -1.1, 2.42, F, COR.vermelho, 0.02);
  r.prisma(8, 0.24, 0.42, 0, 2.32, F, '#f6f4ee', 'y');
  r.prisma(8, 0.245, 0.14, 0, 2.32, F, COR.vermelho, 'y');
  r.caixa(0.62, 0.16, 0.26, 1.1, 2.08, F, COR.vermelho, 0.06);
  r.caixa(0.05, 0.42, 0.05, 1.1, 2.24, F, COR.madeira, 0);
  r.placa(
    [
      [0, 0.2],
      [0.26, -0.16],
      [0, -0.16],
    ],
    0.03,
    1.13,
    2.46,
    F,
    '#f6f4ee',
  );
  r.luz(0.5, 0.06, 0.1, 0, 2.86, 0.3, '#ffe9a8');
}

/**
 * Um peixinho da pescaria (o meio em 0, 0, 0; nada para +x): de blocos, com a argolinha no alto.
 * `v`: a cor (0 laranja, 1 amarelo, 2 vermelho).
 */
export function peixinho(r: Ref, v: number): void {
  const cor = [COR.laranja, COR.amarelo, COR.vermelho][v % 3];
  r.caixa(0.42, 0.24, 0.2, 0, -0.12, 0, cor, 0.06);
  r.placa(
    [
      [0, 0],
      [-0.2, 0.15],
      [-0.2, -0.15],
    ],
    0.08,
    -0.2,
    0,
    0,
    cor,
  );
  r.caixa(0.05, 0.05, 0.22, 0.12, 0.02, 0, '#24232a', 0);
  r.caixa(0.16, 0.08, 0.06, 0, 0.12, 0, '#f6f4ee', 0.02);
  // a argolinha de pescar
  r.barra([-0.06, 0.16, 0], [-0.06, 0.3, 0], 0.03, COR.cromo);
  r.barra([-0.06, 0.3, 0], [0.06, 0.3, 0], 0.03, COR.cromo);
  r.barra([0.06, 0.3, 0], [0.06, 0.16, 0], 0.03, COR.cromo);
}

// ------------------------------------------------------------------ o algodão-doce

/** A cuba do algodão-doce (o meio dela) no carrinho. */
export const CUBA_ALGODAO = { x: -0.42, y: 1.16, z: 0.05, raio: 0.5 } as const;

/** O carrinho do algodão-doce: a cuba de vidro, o toldinho de duas cores e os palitos prontos. */
function carrinhoAlgodao(r: Ref): void {
  const { x: cx, y: cy, z: cz, raio } = CUBA_ALGODAO;
  r.roda(0.3, 0.08, -0.86, 0.3, -0.25, BORRACHA);
  r.roda(0.3, 0.08, 0.86, 0.3, -0.25, BORRACHA);
  r.roda(0.16, 0.1, -0.86, 0.3, -0.25, CREME);
  r.roda(0.16, 0.1, 0.86, 0.3, -0.25, CREME);
  r.caixa(0.08, 0.5, 0.08, 0, 0, 0.42, COR.grafite2, 0);
  r.caixa(1.7, 0.56, 1.0, 0, 0.4, 0, COR.turquesa, 0.06);
  r.caixa(1.72, 0.1, 1.02, 0, 0.6, 0, CREME, 0);
  r.caixa(1.76, 0.07, 1.06, 0, 0.96, 0, CREME, 0.02);
  // a cuba de oito lados (a bacia de cromo; o miolo que gira é de `parque.ts`)
  r.prisma(8, raio + 0.06, 0.08, cx, 1.06, cz, COR.cromo, 'y');
  for (let k = 0; k < 8; k++) {
    const a0 = (k / 8) * Math.PI * 2 + Math.PI / 8;
    const a1 = ((k + 1) / 8) * Math.PI * 2 + Math.PI / 8;
    r.barra(
      [cx + Math.cos(a0) * raio, cy, cz + Math.sin(a0) * raio],
      [cx + Math.cos(a1) * raio, cy, cz + Math.sin(a1) * raio],
      0.07,
      COR.cromo,
    );
    r.caixa(
      0.05,
      0.14,
      0.05,
      cx + Math.cos(a0) * raio,
      1.04,
      cz + Math.sin(a0) * raio,
      COR.cromo,
      0,
    );
  }
  // os palitos de algodão prontos, num suporte (rosa e azul-claro: duas cores)
  r.caixa(0.6, 0.1, 0.4, 0.5, 1.03, 0, MADEIRA2, 0.02);
  const nuvens: [number, number, string][] = [
    [0.34, -0.1, '#ff9ecb'],
    [0.66, -0.1, '#a8e0ff'],
    [0.5, 0.12, '#ff9ecb'],
  ];
  for (const [x, z, cor] of nuvens) {
    r.caixa(0.04, 0.5, 0.04, x, 1.1, z, '#f6ecd8', 0);
    r.caixa(0.3, 0.3, 0.3, x, 1.5, z, cor, 0.1);
    r.caixa(0.22, 0.14, 0.22, x, 1.78, z, cor, 0.07);
    r.caixa(0.2, 0.1, 0.2, x, 1.42, z, cor, 0.06);
  }
  // os quatro esteios e o toldinho de gomos (turquesa e creme)
  for (const [x, z] of [
    [-0.8, -0.45],
    [0.8, -0.45],
    [-0.8, 0.45],
    [0.8, 0.45],
  ] as const)
    r.caixa(0.07, 1.34, 0.07, x, 1.02, z, COR.cromo, 0);
  for (let i = 0; i < 6; i++)
    r.caixa(0.31, 0.14, 1.3, -0.775 + i * 0.31, 2.34, 0, i % 2 ? CREME : COR.turquesa, 0.03);
  r.luz(0.5, 0.06, 0.1, 0, 2.26, 0.42, '#ffe9a8');
  // a alça
  r.barra([-0.6, 0.9, -0.5], [-0.6, 1.0, -0.86], 0.05, COR.cromo);
  r.barra([0.6, 0.9, -0.5], [0.6, 1.0, -0.86], 0.05, COR.cromo);
  r.caixa(1.26, 0.06, 0.06, 0, 0.98, -0.86, COR.cromo, 0);
}

/** O miolo da cuba (gira no toque): o tambor e as aletas, com o meio em 0, 0, 0. */
export function mioloAlgodao(r: Ref): void {
  r.prisma(8, 0.16, 0.14, 0, 0, 0, '#ffd23d', 'y');
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    r.barra([0, 0, 0], [Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4], 0.06, '#ff9ecb');
  }
}

/** A nuvem de algodão que cresce no palito (a base do palito em 0, 0, 0). */
export function nuvemAlgodao(r: Ref): void {
  r.caixa(0.04, 0.5, 0.04, 0, 0, 0, '#f6ecd8', 0);
  r.caixa(0.34, 0.32, 0.34, 0, 0.36, 0, '#ff9ecb', 0.11);
  r.caixa(0.24, 0.16, 0.24, 0, 0.66, 0, '#ff9ecb', 0.08);
  r.caixa(0.22, 0.12, 0.22, 0, 0.28, 0, '#ffb8da', 0.06);
}

// ------------------------------------------------------------------ os balões

/** De onde os balões saem (a ponta do poste, acima do chão). */
export const PONTA_BALOES = 1.5;

/** O poste dos balões: o peso de cubo listrado, a haste e o laço. */
function posteBaloes(r: Ref): void {
  r.caixa(0.6, 0.3, 0.6, 0, 0, 0, COR.vermelho, 0.06);
  r.caixa(0.62, 0.1, 0.62, 0, 0.1, 0, CREME, 0);
  r.caixa(0.1, PONTA_BALOES - 0.3, 0.1, 0, 0.3, 0, COR.cromo, 0);
  r.caixa(0.2, 0.12, 0.2, 0, PONTA_BALOES - 0.06, 0, COR.amarelo, 0.03);
}

/** Onde fica cada balão do maço (a partir da ponta do poste) e a cor (nunca em arco-íris). */
export const BALOES: readonly [number, number, number, string][] = [
  [-0.5, 1.55, 0.1, COR.vermelho],
  [0.45, 1.7, -0.15, COR.amarelo],
  [0, 2.1, 0.2, COR.azul],
  [-0.3, 2.45, -0.3, '#f6f4ee'],
  [0.55, 2.4, 0.3, COR.vermelho],
  [-0.75, 2.15, -0.1, COR.azul],
  [0.15, 2.85, -0.05, COR.amarelo],
];

/** O maço de balões (a ponta do poste em 0, 0, 0): os fios e os balões facetados. */
export function macoDeBaloes(r: Ref): void {
  for (const [x, y, z, cor] of BALOES) {
    r.barra([0, 0, 0], [x, y - 0.42, z], 0.025, '#f6f4ee');
    balao(r, x, y, z, cor);
  }
}

/** Um balão de brinquedo: três prismas de oito lados empilhados e o nozinho. */
export function balao(r: Ref, x: number, y: number, z: number, cor: string): void {
  r.prisma(8, 0.22, 0.2, x, y - 0.2, z, cor, 'y');
  r.prisma(8, 0.34, 0.34, x, y + 0.06, z, cor, 'y');
  r.prisma(8, 0.24, 0.18, x, y + 0.31, z, cor, 'y');
  r.caixa(0.1, 0.08, 0.1, x, y - 0.4, z, cor, 0.02);
  // o brilho de cubinho
  r.caixa(0.08, 0.12, 0.02, x - 0.12, y + 0.08, z + 0.32, '#ffffff', 0);
}

// ------------------------------------------------------------------ a fazendinha

/**
 * O cocho de madeira das lhamas: vazio, só com a palhinha do fundo (o feno é a criança quem
 * põe, na missão do lanche: os montes são de `missoesParque.ts`).
 */
function cocho(r: Ref): void {
  for (const x of [-0.7, 0.7]) {
    r.barra([x, 0, -0.26], [x, 0.62, 0.2], 0.1, MADEIRA2);
    r.barra([x, 0, 0.26], [x, 0.62, -0.2], 0.1, MADEIRA2);
  }
  r.caixa(1.8, 0.08, 0.56, 0, 0.42, 0, COR.madeira, 0.02);
  for (const z of [-0.3, 0.3]) r.caixa(1.8, 0.34, 0.08, 0, 0.42, z, COR.madeira, 0.02);
  for (const x of [-0.9, 0.9]) r.caixa(0.08, 0.34, 0.66, x, 0.42, 0, MADEIRA2, 0.02);
  r.caixa(1.6, 0.05, 0.46, 0, 0.5, 0, '#d9b75a', 0);
}
