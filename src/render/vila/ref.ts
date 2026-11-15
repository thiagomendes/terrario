/**
 * O referencial e as ferramentas do desenho das peças da Vila Neon que não são bloco (spec
 * 026; os desenhos moram em `pecas.ts` e `pecasFestival.ts`). Cada peça monta pedaços no
 * corpo (plástico, a cor nos vértices), nas luzes (acesas: neon, lâmpadas, telas) ou num
 * quadro pintado (letreiro com nome, mural). O chunk inteiro vira uma malha de corpo e uma de
 * luzes (`index.ts`).
 *
 * Regras (identidade visual do jogo): peças quadradas de brinquedo, como os carrinhos da
 * cidade e o ninho da 031; liso redondo só onde o jogo já usa (rodas, lâmpadas pequenas). Nada
 * de arco-íris em ordem, nada de marca nem logotipo de verdade, nada que assuste.
 *
 * Coordenadas locais de cada peça: x para a direita de quem olha a frente, y para cima (0 é o
 * chão, onde a peça pisa), z para a frente (a frente olha para `dir`).
 */
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { CreateCylinderVertexData } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { caixa as caixaSolida, orientar, Pecas, solido, type Item, type V3 } from '../solidos';
import { dadosPlaca } from '../formas';
import type { PecaVila } from '../../world/vilaNeon';

export interface QuadroDesenhado {
  /** Mundo: o meio do quadro e o giro em y (a face que se lê olha para -z local do quadro). */
  x: number;
  y: number;
  z: number;
  giro: number;
  /** Tamanho no mundo. */
  w: number;
  h: number;
  /** Tamanho da textura (px). */
  largura: number;
  altura: number;
  /** Aceso (neon, de noite e de dia) ou pintado (com a luz da cena). */
  aceso: boolean;
  pintar(g: CanvasRenderingContext2D): void;
}

export interface Desenho {
  corpo: Pecas;
  luz: Pecas;
  /** Luzes que só acendem de noite (os faróis e as lanternas dos carros parados). */
  noite: Pecas;
  /** Vidro de verdade (meio transparente): as janelas dos carros, com o interior à vista. */
  vidro: Pecas;
  quadros: QuadroDesenhado[];
  /**
   * O chão do chunk (mundo): a peça comprida (o varal de lâmpadas, as bandeirolas) é desenhada
   * por todos os chunks que ela atravessa, e cada um só faz o pedaço que fica em cima dele
   * (nada passa por cima de um chunk sem malha).
   */
  recorte: { x0: number; z0: number; x1: number; z1: number };
  /** Canto do chunk (as malhas ficam nele). */
  ox: number;
  oz: number;
  /** Altura dos pés no bairro (o chão plano): os postes das peças altas descem até aqui. */
  chao: number;
}

/** O referencial de uma peça (local → posição na malha do chunk). */
export class Ref {
  private readonly c: number;
  private readonly s: number;
  constructor(
    readonly d: Desenho,
    readonly p: PecaVila,
    /** Escala da peça (a bateria e as máquinas são maiores que o natural: brinquedo). */
    readonly escala = 1,
  ) {
    const a = (p.dir & 3) * (Math.PI / 2);
    this.c = Math.cos(a);
    this.s = Math.sin(a);
  }
  /** Giro da peça em y (radianos). */
  get giro(): number {
    return (this.p.dir & 3) * (Math.PI / 2);
  }
  /** Ponto local para o da malha do chunk. */
  ponto(x: number, y: number, z: number): V3 {
    const k = this.escala;
    return [
      this.p.x - this.d.ox + (x * this.c + z * this.s) * k,
      this.p.y + y * k,
      this.p.z - this.d.oz + (-x * this.s + z * this.c) * k,
    ];
  }
  /** Ponto local para o mundo. */
  mundo(x: number, y: number, z: number): V3 {
    const [a, b, c] = this.ponto(x, y, z);
    return [a + this.d.ox, b, c + this.d.oz];
  }
  /** O ponto local fica em cima do chão deste chunk? */
  dentro(x: number, y: number, z: number): boolean {
    const [a, , c] = this.mundo(x, y, z);
    const q = this.d.recorte;
    return a >= q.x0 && a < q.x1 && c >= q.z0 && c < q.z1;
  }
  /**
   * O pedaço do segmento local (a, b) que fica em cima do chão deste chunk (null se nenhum).
   */
  recortar(a: V3, b: V3): [V3, V3] | null {
    const A = this.mundo(a[0], a[1], a[2]);
    const B = this.mundo(b[0], b[1], b[2]);
    const q = this.d.recorte;
    let t0 = 0;
    let t1 = 1;
    for (const [p0, p1, lo, hi] of [
      [A[0], B[0], q.x0, q.x1],
      [A[2], B[2], q.z0, q.z1],
    ]) {
      const d = p1 - p0;
      if (Math.abs(d) < 1e-9) {
        if (p0 < lo || p0 >= hi) return null;
        continue;
      }
      const ta = (lo - p0) / d;
      const tb = (hi - p0) / d;
      t0 = Math.max(t0, Math.min(ta, tb));
      t1 = Math.min(t1, Math.max(ta, tb));
    }
    if (t1 - t0 < 1e-4) return null;
    const em = (t: number): V3 => [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
    ];
    return [em(t0), em(t1)];
  }
  /** Leva a peça feita em coordenadas locais para a malha do chunk. */
  por(vd: VertexData, luz = false, cor?: string): void {
    this.levar(vd, luz ? this.d.luz : this.d.corpo, cor);
  }
  /** Leva a peça local para uma das malhas do chunk (corpo, luzes, luzes da noite, vidro). */
  levar(vd: VertexData, destino: Pecas, cor?: string): void {
    const P = vd.positions as number[] | Float32Array;
    const N = vd.normals as number[] | Float32Array;
    for (let i = 0; i < P.length; i += 3) {
      const [x, y, z] = [P[i], P[i + 1], P[i + 2]];
      const q = this.ponto(x, y, z);
      P[i] = q[0];
      P[i + 1] = q[1];
      P[i + 2] = q[2];
      if (N) {
        const [a, b, c] = [N[i], N[i + 1], N[i + 2]];
        N[i] = a * this.c + c * this.s;
        N[i + 1] = b;
        N[i + 2] = -a * this.s + c * this.c;
      }
    }
    destino.add(vd, cor);
  }
  /** Caixa w × h × d com a base no meio (x, y, z), bisel `b` (quinas de brinquedo). */
  caixa(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    cor: string,
    b = 0.03,
    luz = false,
  ): void {
    const vd = caixaSolida(
      x - w / 2,
      x + w / 2,
      y,
      y + h,
      z - d / 2,
      z + d / 2,
      Math.min(b, w / 3, h / 3),
      Math.min(b, d / 3),
      cor,
      1,
    );
    this.por(vd, luz);
  }
  /** Barra quadrada de a até b (postes, grades, treliças: nada de tubo redondo). */
  barra(a: V3, b: V3, lado: number, cor: string, luz = false): void {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const dz = b[2] - a[2];
    const L = Math.hypot(dx, dy, dz) || 1e-6;
    const vd = caixaSolida(-lado / 2, lado / 2, 0, L, -lado / 2, lado / 2, 0, 0, cor, 1);
    // gira o eixo y da barra para a direção (a, b)
    const ux = dx / L;
    const uy = dy / L;
    const uz = dz / L;
    // base ortonormal: y = u; x = qualquer perpendicular
    let px = 1;
    let py = 0;
    let pz = 0;
    if (Math.abs(ux) > 0.9) [px, py, pz] = [0, 0, 1];
    const dot = px * ux + py * uy + pz * uz;
    px -= dot * ux;
    py -= dot * uy;
    pz -= dot * uz;
    const lp = Math.hypot(px, py, pz);
    px /= lp;
    py /= lp;
    pz /= lp;
    const qx = uy * pz - uz * py;
    const qy = uz * px - ux * pz;
    const qz = ux * py - uy * px;
    const P = vd.positions as number[];
    const N = vd.normals as number[];
    for (let i = 0; i < P.length; i += 3) {
      const [x, y, z] = [P[i], P[i + 1], P[i + 2]];
      P[i] = a[0] + x * px + y * ux + z * qx;
      P[i + 1] = a[1] + x * py + y * uy + z * qy;
      P[i + 2] = a[2] + x * pz + y * uz + z * qz;
      const [n0, n1, n2] = [N[i], N[i + 1], N[i + 2]];
      N[i] = n0 * px + n1 * ux + n2 * qx;
      N[i + 1] = n0 * py + n1 * uy + n2 * qy;
      N[i + 2] = n0 * pz + n1 * uz + n2 * qz;
    }
    this.por(vd, luz);
  }
  /** Roda (cilindro deitado no eixo x local, ou no z): o jogo já usa rodas redondas. */
  roda(
    r: number,
    larg: number,
    x: number,
    y: number,
    z: number,
    cor: string,
    eixo: 'x' | 'z' = 'x',
  ): void {
    const vd = CreateCylinderVertexData({ height: larg, diameter: r * 2, tessellation: 12 });
    const P = vd.positions as number[];
    const N = vd.normals as number[];
    for (let i = 0; i < P.length; i += 3) {
      const [a, b, c] = [P[i], P[i + 1], P[i + 2]];
      const [n0, n1, n2] = [N[i], N[i + 1], N[i + 2]];
      if (eixo === 'x') {
        P[i] = b + x;
        P[i + 1] = -a + y;
        P[i + 2] = c + z;
        N[i] = n1;
        N[i + 1] = -n0;
        N[i + 2] = n2;
      } else {
        P[i] = a + x;
        P[i + 1] = -c + y;
        P[i + 2] = b + z;
        N[i] = n0;
        N[i + 1] = -n2;
        N[i + 2] = n1;
      }
    }
    vd.uvs = null;
    this.por(vd, false, cor);
  }
  /**
   * Prisma de `n` lados com as faces planas (tambor, alto-falante, carretel: facetado, de
   * brinquedo, nunca um cilindro liso). O eixo em x, y ou z local; o meio em (x, y, z).
   */
  prisma(
    n: number,
    r: number,
    larg: number,
    x: number,
    y: number,
    z: number,
    cor: string,
    eixo: 'x' | 'y' | 'z' = 'z',
    luz = false,
  ): void {
    const P: number[] = [];
    const N: number[] = [];
    const I: number[] = [];
    const h = larg / 2;
    // (a, b) no plano da roda, c ao longo do eixo
    const pt = (a: number, b: number, c: number): V3 =>
      eixo === 'z' ? [a, b, c] : eixo === 'x' ? [c, b, a] : [a, c, b];
    const f = Math.PI / n;
    for (let i = 0; i < n; i++) {
      const a0 = (i * 2 * Math.PI) / n + f;
      const a1 = ((i + 1) * 2 * Math.PI) / n + f;
      const am = (a0 + a1) / 2;
      const base = P.length / 3;
      const nn = pt(Math.cos(am), Math.sin(am), 0);
      for (const [a, c] of [
        [a0, -h],
        [a1, -h],
        [a1, h],
        [a0, h],
      ]) {
        P.push(...pt(Math.cos(a) * r, Math.sin(a) * r, c));
        N.push(...nn);
      }
      I.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    for (const s of [-1, 1]) {
      const base = P.length / 3;
      const nn = pt(0, 0, s);
      P.push(...pt(0, 0, s * h));
      N.push(...nn);
      for (let i = 0; i <= n; i++) {
        const a = (i * 2 * Math.PI) / n + f;
        P.push(...pt(Math.cos(a) * r, Math.sin(a) * r, s * h));
        N.push(...nn);
      }
      for (let i = 0; i < n; i++) I.push(base, base + 1 + i, base + 2 + i);
    }
    const vd = new VertexData();
    vd.positions = P.map((v, i) => v + (i % 3 === 0 ? x : i % 3 === 1 ? y : z));
    vd.normals = N;
    vd.indices = I;
    this.por(orientar(vd), luz, cor);
  }
  /**
   * Peça de contorno de lado: o contorno no plano (z para a frente, y para cima), puxado na
   * largura (x de x0 a x1), com bisel nas quinas. Aceita caixas de roda (carros).
   */
  perfil(pts: Item[], x0: number, x1: number, bisel: number, cor: string, luz = false): void {
    const vd = solido({ perfil: pts, z0: x0, z1: x1, bisel, segBisel: bisel > 0 ? 1 : 0, cor });
    const P = vd.positions as number[];
    const N = vd.normals as number[];
    for (let i = 0; i < P.length; i += 3) {
      [P[i], P[i + 2]] = [P[i + 2], P[i]];
      [N[i], N[i + 2]] = [N[i + 2], N[i]];
    }
    this.por(orientar(vd), luz);
  }
  /** Caixa acesa (lâmpada, tubo de neon, tela), sem bisel. */
  luz(w: number, h: number, d: number, x: number, y: number, z: number, cor: string): void {
    this.caixa(w, h, d, x, y, z, cor, 0, true);
  }
  /** Outro referencial preso nesta peça: a origem em (x, y, z) e a frente girada em quartos. */
  sub(x: number, y: number, z: number, quartos = 0): Ref {
    const [mx, my, mz] = this.mundo(x, y, z);
    return new Ref(
      this.d,
      { ...this.p, x: mx, y: my, z: mz, dir: (this.p.dir + quartos) & 3 },
      this.escala,
    );
  }
  /** Altura da peça acima do chão do bairro (o varal no alto, o holofote na grade). */
  get altura(): number {
    return this.p.y - this.d.chao;
  }
  /** Placa de contorno (estrela, raio) em pé, de frente para +z, centrada em (x, y, z). */
  placa(
    perfil: Array<[number, number]>,
    esp: number,
    x: number,
    y: number,
    z: number,
    cor: string,
    luz = false,
  ): void {
    const vd = dadosPlaca(perfil, esp);
    const P = vd.positions as number[];
    for (let i = 0; i < P.length; i += 3) {
      P[i] += x;
      P[i + 1] += y;
      P[i + 2] += z;
    }
    vd.uvs = null;
    this.por(vd, luz, cor);
  }
  /** Quadro pintado, de frente para +z local, com o meio em (x, y, z). */
  quadro(
    w: number,
    h: number,
    x: number,
    y: number,
    z: number,
    pintar: (g: CanvasRenderingContext2D, largura: number, altura: number) => void,
    aceso = false,
    px = 256,
    verso = false,
  ): void {
    if (verso) return this.sub(0, 0, 0, 2).quadro(w, h, -x, y, -z, pintar, aceso, px);
    const [mx, my, mz] = this.mundo(x, y, z);
    w *= this.escala;
    h *= this.escala;
    const largura = px;
    const altura = Math.max(16, Math.round((px * h) / w));
    this.d.quadros.push({
      x: mx - this.d.ox,
      y: my,
      z: mz - this.d.oz,
      // o quadro se lê olhando para -z dele: a frente da peça (+z local) vira a frente dele
      giro: this.giro + Math.PI,
      w,
      h,
      largura,
      altura,
      aceso,
      pintar: (g) => pintar(g, largura, altura),
    });
  }
}

// ------------------------------------------------------------------ cores da Vila Neon

export const COR = {
  grafite: '#2e2d36',
  grafite2: '#3a3944',
  cromo: '#d4d8e2',
  vermelho: '#e8302a',
  azul: '#2f8cff',
  amarelo: '#ffe14a',
  creme: '#f4ecdc',
  madeira: '#a8703c',
  verde: '#2f8a4a',
  rosa: '#ff6fb4',
  turquesa: '#22c2b0',
  laranja: '#ff8a2a',
  branco: '#f6f4ee',
  preto: '#24232a',
} as const;

/** Raio (logo do festival): contorno no plano xy, altura ~1. */
export function perfilRaio(k = 1): Array<[number, number]> {
  return (
    [
      [0.1, 0.5],
      [0.42, 0.5],
      [0.12, 0.06],
      [0.36, 0.06],
      [-0.16, -0.5],
      [0.02, -0.08],
      [-0.24, -0.08],
    ] as Array<[number, number]>
  ).map(([x, y]) => [x * k, y * k]);
}

/** Estrela de cinco pontas: contorno no plano xy. */
export function perfilEstrela(r: number): Array<[number, number]> {
  const p: Array<[number, number]> = [];
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    p.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  return p;
}

/** As lâmpadas dos varais e das fileiras: brancas mornas, com uma de cor de vez em quando. */
export const LAMPADAS = ['#fff1c4', '#ffd76a', '#fff1c4', '#ff9a6a', '#fff1c4', '#8fd8ff'];
