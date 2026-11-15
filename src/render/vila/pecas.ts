/**
 * O desenho de cada peça da Vila Neon que não é bloco (spec 026). Cada peça monta pedaços no
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
import { caixa as caixaSolida, Pecas, type V3 } from '../solidos';
import { dadosPlaca } from '../formas';
import { LETREIROS, type PecaVila } from '../../world/vilaNeon';

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
  quadros: QuadroDesenhado[];
  /** Canto do chunk (as malhas ficam nele). */
  ox: number;
  oz: number;
}

/** O referencial de uma peça (local → posição na malha do chunk). */
export class Ref {
  private readonly c: number;
  private readonly s: number;
  constructor(
    private readonly d: Desenho,
    readonly p: PecaVila,
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
    return [
      this.p.x - this.d.ox + x * this.c + z * this.s,
      this.p.y + y,
      this.p.z - this.d.oz - x * this.s + z * this.c,
    ];
  }
  /** Ponto local para o mundo. */
  mundo(x: number, y: number, z: number): V3 {
    const [a, b, c] = this.ponto(x, y, z);
    return [a + this.d.ox, b, c + this.d.oz];
  }
  /** Leva a peça feita em coordenadas locais para a malha do chunk. */
  por(vd: VertexData, luz = false, cor?: string): void {
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
    (luz ? this.d.luz : this.d.corpo).add(vd, cor);
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
  /** Roda (cilindro deitado no eixo x local): o jogo já usa rodas redondas. */
  roda(r: number, larg: number, x: number, y: number, z: number, cor: string): void {
    const vd = CreateCylinderVertexData({ height: larg, diameter: r * 2, tessellation: 14 });
    const P = vd.positions as number[];
    const N = vd.normals as number[];
    for (let i = 0; i < P.length; i += 3) {
      const [a, b, c] = [P[i], P[i + 1], P[i + 2]];
      P[i] = b + x;
      P[i + 1] = -a + y;
      P[i + 2] = c + z;
      const [n0, n1, n2] = [N[i], N[i + 1], N[i + 2]];
      N[i] = n1;
      N[i + 1] = -n0;
      N[i + 2] = n2;
    }
    vd.uvs = null;
    this.por(vd, false, cor);
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
  ): void {
    const [mx, my, mz] = this.mundo(x, y, z);
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

// ------------------------------------------------------------------ as peças

/** Desenha a peça (provisório: o desenho final vem na T05). */
export function desenharPeca(p: PecaVila, d: Desenho): void {
  const r = new Ref(d, p);
  switch (p.tipo) {
    case 'letreiro':
      letreiro(r, p.n ?? 0);
      break;
    case 'mural':
      r.caixa(0.15, 2.2, 0.15, -1.1, 0, 0, COR.madeira);
      r.caixa(0.15, 2.2, 0.15, 1.1, 0, 0, COR.madeira);
      r.caixa(2.4, 1.3, 0.12, 0, 0.8, 0, COR.madeira);
      r.quadro(2.2, 1.1, 0, 1.45, 0.07, (g, w, h) => {
        g.fillStyle = '#c99a62';
        g.fillRect(0, 0, w, h);
      });
      break;
    default:
      // marcador provisório (a T05 desenha cada uma)
      r.caixa(0.6, 0.6, 0.6, 0, 0, 0, COR.cromo);
      break;
  }
}

function letreiro(r: Ref, n: number): void {
  const texto = LETREIROS[n] ?? '';
  const w = Math.max(3, texto.length * 0.32);
  r.caixa(w + 0.2, 1.0, 0.12, 0, 0, -0.06, COR.grafite);
  r.quadro(
    w,
    0.8,
    0,
    0.5,
    0.01,
    (g, L, A) => {
      g.fillStyle = '#1d1a2a';
      g.fillRect(0, 0, L, A);
      g.fillStyle = '#ff6fb4';
      g.font = `bold ${Math.round(A * 0.6)}px system-ui, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(texto, L / 2, A / 2, L * 0.92);
    },
    true,
    512,
  );
}
