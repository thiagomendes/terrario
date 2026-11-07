/**
 * Blocos de brinquedo que parecem com o que são (spec 012): no inventário, na mão e no chão,
 * uma criança pequena precisa reconhecer o bloco sem ler o nome. Em vez do cubo liso de uma
 * cor só, cada bloco daqui ganha um modelinho de peças arredondadas: minério com pintas,
 * tronco com anéis, tábuas com frestas e pregos, tijolos com rejunte, fornalha com boca,
 * baú com fechadura, abóbora com gomos e assim por diante.
 *
 * Cada modelo tem a origem no centro e cabe num cubo de `lado`. As peças da mesma cor são
 * juntadas numa malha só no fim (poucas malhas por item, mesmo com muitos itens no chão).
 */
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Scene } from '@babylonjs/core/scene';
import { Bloco } from '../world/blocks';
import { coresDoBloco } from '../fx/cores';
import { caixaArredondada, type Plasticos } from './formas';

type RGB = [number, number, number];
/** Cor média de uma face do bloco (no tema do mundo); undefined = não tem. */
export type CorDoBloco = (bloco: number, face: 'topo' | 'lado') => readonly number[] | undefined;

const corPadrao: CorDoBloco = (bloco, face) => coresDoBloco(bloco)?.[face];

const hexDe = (c: readonly number[]) =>
  `#${c
    .slice(0, 3)
    .map((v) =>
      Math.round(Math.max(0, Math.min(255, v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
/** Clareia (k > 1) ou escurece (k < 1) uma cor. */
const tom = (c: readonly number[], k: number): RGB =>
  [c[0] * k, c[1] * k, c[2] * k].map((v) => (k > 1 ? v + (255 - v) * (k - 1) * 0.35 : v)) as RGB;
const doHex = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

/** As faces do cubo: eixo da normal, sentido e os dois eixos do plano (u, v). */
const FACES = {
  px: { n: 0, s: 1, u: 2, v: 1 },
  nx: { n: 0, s: -1, u: 2, v: 1 },
  py: { n: 1, s: 1, u: 0, v: 2 },
  pz: { n: 2, s: 1, u: 0, v: 1 },
  nz: { n: 2, s: -1, u: 0, v: 1 },
} as const;
type Face = keyof typeof FACES;
/** As três faces que aparecem no ícone (de quina, um pouco de cima): frente, direita e topo. */
const VISIVEIS: Face[] = ['nz', 'px', 'py'];
const LADOS: Face[] = ['nz', 'px', 'pz', 'nx'];

/** Pseudoaleatório fixo (o mesmo desenho sempre). */
function sorteio(semente: number): () => number {
  let s = semente >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Monta o modelo de brinquedo do bloco, ou null quando o bloco segue como o cubo de sempre.
 * `cor` dá as cores do tema (casca, tábua, pedra...); os detalhes (pintas, fogo, fechadura)
 * têm cor fixa, para serem reconhecidos em qualquer tema.
 */
export function modeloDeBloco(
  scene: Scene,
  mats: Plasticos,
  bloco: number,
  nome: string,
  lado: number,
  cor: CorDoBloco = corPadrao,
): Mesh[] | null {
  const L = lado;
  const h = L / 2;
  const pecas: Mesh[] = [];
  const nos: TransformNode[] = [];
  let k = 0;
  const mat = (c: string | readonly number[], brilho?: number): StandardMaterial =>
    mats.cor(typeof c === 'string' ? c : hexDe(c), brilho);
  const por = <M extends Mesh>(m: M, x: number, y: number, z: number, pai?: TransformNode): M => {
    m.position.set(x, y, z);
    if (pai) m.parent = pai;
    m.isPickable = false;
    pecas.push(m);
    return m;
  };
  /** Caixa arredondada (medidas em frações de L). */
  const caixa = (
    c: string | readonly number[],
    w: number,
    a: number,
    d: number,
    r: number,
    x: number,
    y: number,
    z: number,
    brilho?: number,
    pai?: TransformNode,
  ) =>
    por(
      caixaArredondada(`${nome}-p${k++}`, scene, w * L, a * L, d * L, r * L, mat(c, brilho), 3),
      x * L,
      y * L,
      z * L,
      pai,
    );
  const bola = (
    c: string | readonly number[],
    r: number,
    esc: [number, number, number],
    x: number,
    y: number,
    z: number,
    brilho?: number,
    pai?: TransformNode,
  ) => {
    // bolinhas pequenas (pregos, espinhos) com menos gomos: muitos itens no chão
    const m = MeshBuilder.CreateSphere(
      `${nome}-p${k++}`,
      { diameter: r * 2 * L, segments: r < 0.06 ? 4 : r < 0.15 ? 8 : 12 },
      scene,
    );
    m.scaling.set(esc[0], esc[1], esc[2]);
    m.material = mat(c, brilho);
    return por(m, x * L, y * L, z * L, pai);
  };
  /** Prisma (ou cone, se r2 = 0) de `lados` lados, em pé no eixo y. */
  const prisma = (
    c: string | readonly number[],
    alt: number,
    r1: number,
    r2: number,
    lados: number,
    x: number,
    y: number,
    z: number,
    brilho?: number,
    pai?: TransformNode,
  ) => {
    const m = MeshBuilder.CreateCylinder(
      `${nome}-p${k++}`,
      { height: alt * L, diameterBottom: r1 * 2 * L, diameterTop: r2 * 2 * L, tessellation: lados },
      scene,
    );
    m.material = mat(c, brilho);
    return por(m, x * L, y * L, z * L, pai);
  };
  /** Nó auxiliar (girar um grupo de peças); some depois de juntar as malhas. */
  const grupo = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
    const g = new TransformNode(`${nome}-g${k++}`, scene);
    g.position.set(x * L, y * L, z * L);
    g.rotation.set(rx, ry, rz);
    nos.push(g);
    return g;
  };
  /** Ponto na face (u, v de -1 a 1), `fora` além da superfície (em frações de L). */
  const naFace = (f: Face, u: number, v: number, fora: number): RGB => {
    const F = FACES[f];
    const p: RGB = [0, 0, 0];
    p[F.n] = F.s * (0.5 + fora);
    p[F.u] = u * 0.5;
    p[F.v] = v * 0.5;
    return p;
  };
  /** Escala achatada na direção da normal da face. */
  const achatada = (f: Face, plano: [number, number], fundo: number): [number, number, number] => {
    const F = FACES[f];
    const e: [number, number, number] = [1, 1, 1];
    e[F.n] = fundo;
    e[F.u] = plano[0];
    e[F.v] = plano[1];
    return e;
  };
  /** Gira a peça no plano da face (em volta da normal). */
  const girarNaFace = (m: Mesh, f: Face, ang: number) => {
    const n = FACES[f].n;
    if (n === 0) m.rotation.x = ang;
    else if (n === 1) m.rotation.y = ang;
    else m.rotation.z = ang;
  };
  /** Uma "pinta" saliente na face: elipsoide achatado. */
  const pinta = (
    f: Face,
    u: number,
    v: number,
    r: number,
    c: string | readonly number[],
    esc: [number, number] = [1, 1],
    ang = 0,
    brilho?: number,
  ) => {
    const [x, y, z] = naFace(f, u, v, -r * 0.12);
    const m = bola(c, r, achatada(f, esc, 0.5), x, y, z, brilho);
    if (ang) girarNaFace(m, f, ang);
    return m;
  };
  /** Barrinha deitada na face (comprida em u), girada no plano da face. */
  const barra = (
    f: Face,
    u: number,
    v: number,
    comp: number,
    esp: number,
    c: string | readonly number[],
    ang: number,
    brilho?: number,
  ) => {
    const F = FACES[f];
    const t: RGB = [esp, esp, esp];
    t[F.u] = comp;
    const [x, y, z] = naFace(f, u, v, 0);
    const m = caixa(c, t[0], t[1], t[2], esp * 0.4, x, y, z, brilho);
    // girar em z leva x para y (u para v); em x e em y o sentido é o contrário
    girarNaFace(m, f, F.n === 2 ? ang : -ang);
    return m;
  };
  const corpo = (c: string | readonly number[], r = 0.12) => caixa(c, 1, 1, 1, r, 0, 0, 0);
  const lado0 = cor(bloco, 'lado') ?? [160, 160, 168];
  const topo0 = cor(bloco, 'topo') ?? lado0;
  const pedra = cor(Bloco.PEDRA_RACHADA, 'lado') ?? [138, 138, 146];

  switch (bloco) {
    // ---------- minérios: pedra cinza com pintas na cor do minério ----------
    case Bloco.MINERIO_CARVAO:
    case Bloco.MINERIO_COBRE:
    case Bloco.MINERIO_FERRO:
    case Bloco.MINERIO_OURO:
    case Bloco.MINERIO_LUZITA: {
      const luzita = bloco === Bloco.MINERIO_LUZITA;
      corpo(luzita ? tom(pedra, 0.72) : pedra);
      const rnd = sorteio(bloco * 97);
      // cada minério com um jeito próprio: carvão em manchas grandes, cobre em veios,
      // ferro em bolinhas, ouro em pepitas brilhantes, luzita em cristaizinhos que brilham
      const pontos: Array<[number, number]> = [
        [-0.45, 0.42],
        [0.4, 0.5],
        [0.05, -0.05],
        [-0.42, -0.5],
        [0.48, -0.4],
      ];
      for (const f of [...VISIVEIS, 'pz', 'nx'] as Face[]) {
        const fundo = f === 'pz' || f === 'nx';
        const lista = fundo ? pontos.slice(0, 3) : pontos;
        for (const [i, [u0, v0]] of lista.entries()) {
          const u = u0 + (rnd() - 0.5) * 0.12;
          const v = v0 + (rnd() - 0.5) * 0.12;
          if (bloco === Bloco.MINERIO_CARVAO) {
            if (i === 2 && !fundo) {
              pinta(f, u, v, 0.15, '#1c1c22', [1.2, 0.9], 0.4, 0.1);
            } else pinta(f, u, v, 0.12, '#26262e', [1, 0.8], rnd() * 3, 0.1);
          } else if (bloco === Bloco.MINERIO_COBRE) {
            // veios: elipses compridas na diagonal, laranja e um tom esverdeado de cobre velho
            pinta(f, u, v, 0.11, i === 2 ? '#3fae8c' : '#f08436', [1.7, 0.6], 0.7, 0.4);
          } else if (bloco === Bloco.MINERIO_FERRO) {
            pinta(f, u, v, 0.11, '#efbfa2', [1, 1], 0, 0.35);
            if (!fundo && i < 2) pinta(f, u + 0.22, v - 0.24, 0.08, '#c98a6e', [1, 1], 0, 0.3);
          } else if (bloco === Bloco.MINERIO_OURO) {
            // pepitas: caixinhas giradas, amarelo vivo e brilhante
            const [x, y, z] = naFace(f, u, v, 0.01);
            const p = caixa('#ffcc1a', 0.17, 0.17, 0.17, 0.05, x, y, z, 0.9);
            p.rotation.set(rnd() * 0.6, 0.78, 0.6 + rnd() * 0.4);
          } else {
            // luzita: pontas de cristal saindo da pedra, amarelo-ciano brilhando
            const [x, y, z] = naFace(f, u, v, 0.02);
            const F = FACES[f];
            const g = grupo(x, y, z);
            if (F.n === 0) g.rotation.z = -F.s * (Math.PI / 2);
            else if (F.n === 2) g.rotation.x = F.s * (Math.PI / 2);
            const c = i % 2 ? '#b8fff0' : '#f6ff8a';
            prisma(c, 0.12, 0.09, 0.09, 6, 0, 0, 0, 1, g);
            prisma(c, 0.13, 0.09, 0, 6, 0, 0.125, 0, 1, g);
          }
        }
      }
      break;
    }

    // ---------- cristal-luz e bloco de luzita ----------
    case Bloco.CRISTAL_LUZ: {
      // aglomerado de três cristais de seis lados, pontudos, saindo de uma pedrinha
      bola(tom(pedra, 0.8), 0.34, [1.25, 0.32, 1.25], 0, -0.42, 0);
      // o do meio em pé; os dois menores abrindo para os lados (esquerda e direita de quem
      // olha o ícone de quina), para os três aparecerem
      const cristais: Array<[number, number, number, number, number, number]> = [
        // x, z, altura, raio, giro (para que lado abre), inclinação
        [0, 0, 0.6, 0.15, 0, 0],
        [-0.13, -0.13, 0.42, 0.12, (3 * Math.PI) / 4, 0.42],
        [0.13, 0.13, 0.36, 0.11, -Math.PI / 4, 0.5],
      ];
      for (const [i, [x, z, alt, r, giro, incl]] of cristais.entries()) {
        const g = grupo(x, -0.4, z, 0, giro, -incl);
        const c = i === 0 ? '#5fe4ff' : '#78c8ff';
        prisma(c, alt, r, r, 6, 0, alt / 2, 0, 1, g);
        prisma('#b4f6ff', r * 1.5, r, 0, 6, 0, alt + r * 0.75, 0, 1, g);
      }
      break;
    }
    case Bloco.BLOCO_LUZITA: {
      // cubo amarelo-claro lapidado: um losango mais claro em cada face e faíscas brancas
      corpo('#ffe27a', 0.1);
      for (const f of VISIVEIS) {
        const [x, y, z] = naFace(f, 0, 0, -0.02);
        const m = caixa('#fff0a0', 0.5, 0.5, 0.5, 0.06, x, y, z, 1);
        m.scaling.set(...achatada(f, [1, 1], 0.12));
        girarNaFace(m, f, Math.PI / 4);
      }
      for (const [f, u, v] of [
        ['nz', 0.55, 0.6],
        ['px', -0.55, -0.55],
        ['py', 0.6, -0.55],
      ] as const)
        for (const a of [0, Math.PI / 2]) barra(f, u, v, 0.22, 0.045, '#ffffff', a, 1);
      break;
    }

    // ---------- madeira: troncos com anéis, tábuas com frestas e pregos ----------
    case Bloco.MADEIRA_RETORCIDA:
    case Bloco.TRONCO_BETULA:
    case Bloco.TRONCO_PINHO:
    case Bloco.TRONCO_LANTERNA: {
      const betula = bloco === Bloco.TRONCO_BETULA;
      const casca = betula ? tom(lado0, 1.08) : lado0;
      const miolo = tom(topo0, 1.12);
      caixa(casca, 1, 0.94, 1, 0.12, 0, -0.03, 0);
      // topo claro com anéis
      caixa(miolo, 0.92, 0.06, 0.92, 0.03, 0, 0.45, 0);
      prisma(tom(topo0, 0.7), 0.012, 0.36, 0.36, 24, 0, 0.485, 0);
      prisma(miolo, 0.014, 0.3, 0.3, 24, 0, 0.487, 0);
      prisma(tom(topo0, 0.7), 0.016, 0.17, 0.17, 20, 0, 0.489, 0);
      prisma(miolo, 0.018, 0.11, 0.11, 20, 0, 0.491, 0);
      prisma(tom(topo0, 0.6), 0.02, 0.035, 0.035, 12, 0, 0.493, 0);
      if (betula) {
        // bétula: casca branca com manchinhas escuras
        const rnd = sorteio(31);
        for (const f of LADOS)
          for (const [u, v] of [
            [-0.4, 0.4],
            [0.3, -0.05],
            [-0.15, -0.55],
          ]) {
            barra(f, u + (rnd() - 0.5) * 0.2, v, 0.24, 0.07, '#3a3430', 0);
          }
      } else {
        // sulcos verticais da casca
        const sulco = tom(casca, 0.72);
        for (const f of LADOS)
          for (const u of [-0.42, 0.05, 0.5]) {
            const [x, , z] = naFace(f, u, 0, -0.005);
            const F = FACES[f];
            const w = F.n === 0 ? 0.04 : 0.07;
            const d = F.n === 0 ? 0.07 : 0.04;
            caixa(sulco, w, u === 0.05 ? 0.6 : 0.78, d, 0.02, x, -0.06 + (u > 0.3 ? 0.08 : 0), z);
          }
      }
      break;
    }
    case Bloco.TABUAS:
    case Bloco.TABUAS_BETULA:
    case Bloco.TABUAS_PINHO: {
      // três tábuas deitadas, com frestas escuras entre elas e pregos nas pontas
      caixa(tom(lado0, 0.45), 0.9, 0.96, 0.9, 0.08, 0, 0, 0);
      const alt = 0.3;
      const tons = [1.06, 0.92, 1];
      for (let i = 0; i < 3; i++) {
        const y = -0.5 + alt / 2 + i * (alt + 0.05);
        caixa(tom(lado0, tons[i]), 1, alt, 1, 0.07, 0, y, 0);
        for (const f of ['nz', 'px', 'pz', 'nx'] as Face[])
          for (const u of [-0.72, 0.72]) {
            const [x, , z] = naFace(f, u, 0, 0.0);
            bola('#5a5a64', 0.035, [1, 1, 1], x, y, z, 0.6);
          }
      }
      break;
    }

    // ---------- pedras ----------
    case Bloco.PEDREGULHO: {
      corpo(tom(lado0, 0.85));
      const tons = [tom(lado0, 0.7), tom(lado0, 1.1), tom(lado0, 1.3)];
      const rnd = sorteio(7);
      for (const f of [...VISIVEIS, 'pz', 'nx'] as Face[])
        for (const [i, [u, v]] of (
          [
            [-0.45, 0.45],
            [0.42, 0.38],
            [-0.3, -0.42],
            [0.45, -0.45],
            [0.05, 0],
          ] as const
        ).entries())
          pinta(f, u, v, 0.17 + rnd() * 0.05, tons[(i + k) % 3], [1.15, 0.95], rnd() * 3);
      break;
    }
    case Bloco.CASCALHO: {
      // um montinho de pedrinhas, não um cubo
      const tons = ['#8d8a86', '#a8a39c', '#6e6c6a', '#b9b2a6', '#7d7770'];
      const pedrinhas: Array<[number, number, number, number]> = [
        [-0.28, -0.32, -0.2, 0.2],
        [0.22, -0.33, -0.25, 0.19],
        [0.3, -0.32, 0.22, 0.2],
        [-0.25, -0.33, 0.25, 0.19],
        [0, -0.3, 0, 0.22],
        [-0.08, -0.08, -0.08, 0.18],
        [0.14, -0.1, 0.1, 0.17],
        [0.02, 0.1, 0.02, 0.15],
      ];
      for (const [i, [x, y, z, r]] of pedrinhas.entries())
        bola(
          tons[i % tons.length],
          r * 1.2,
          [1.15, 0.72, 1],
          x * 1.2,
          y * 1.2 + 0.08,
          z * 1.2,
          0.15,
        ).rotation.y = i;
      break;
    }
    case Bloco.PEDRA_RACHADA: {
      corpo(lado0);
      // rachadura em zigue-zague na frente, na direita e no topo
      const zigue: Array<[number, number]> = [
        [-0.62, 0.78],
        [-0.22, 0.4],
        [-0.42, 0.02],
        [0.08, -0.28],
        [-0.05, -0.55],
        [0.35, -0.85],
      ];
      for (const f of VISIVEIS)
        for (let i = 1; i < zigue.length; i++) {
          // cada pedaço liga um ponto ao próximo: a linha não se parte
          const [u0, v0] = zigue[i - 1];
          const [u1, v1] = zigue[i];
          const du = (u1 - u0) / 2;
          const dv = (v1 - v0) / 2;
          barra(
            f,
            (u0 + u1) / 2,
            (v0 + v1) / 2,
            Math.hypot(du, dv) + 0.05,
            0.06,
            '#2a2a30',
            Math.atan2(dv, du),
          );
        }
      break;
    }
    case Bloco.PEDRA_LISA: {
      // pedra clara e lisa, com uma moldura em relevo nas arestas
      caixa(tom(lado0, 1.08), 0.96, 0.96, 0.96, 0.06, 0, 0, 0);
      const e = 0.1;
      const meio = 0.5 - e / 2;
      const borda = tom(lado0, 1.3);
      for (const eixo of [0, 1, 2])
        for (const a of [-1, 1])
          for (const b of [-1, 1]) {
            const t: RGB = [e, e, e];
            t[eixo] = 1;
            const p: RGB = [0, 0, 0];
            const outros = [0, 1, 2].filter((x) => x !== eixo);
            p[outros[0]] = a * meio;
            p[outros[1]] = b * meio;
            caixa(borda, t[0], t[1], t[2], 0.05, p[0], p[1], p[2]);
          }
      break;
    }
    case Bloco.TIJOLOS:
    case Bloco.TIJOLOS_PEDRA: {
      // tijolos com rejunte claro: as fileiras se alternam (deitado na frente, de lado na
      // direita), e o rejunte aparece entre eles
      const vermelho = bloco === Bloco.TIJOLOS;
      const base = vermelho ? doHex('#c4553a') : tom(lado0, 1);
      caixa(vermelho ? '#efe2cc' : '#d9d9de', 0.94, 0.94, 0.94, 0.04, 0, 0, 0);
      const fil = 4;
      const a = 1 / fil;
      const g = 0.05;
      for (let i = 0; i < fil; i++) {
        const y = -0.5 + a / 2 + i * a;
        const c1 = tom(base, i % 2 ? 0.92 : 1.04);
        const c2 = tom(base, i % 2 ? 1.06 : 0.9);
        if (i % 2 === 0) {
          caixa(c1, 0.5 - g / 2, a - g, 1, 0.04, -0.25 - g / 4 + 0.0, y, 0);
          caixa(c2, 0.5 - g / 2, a - g, 1, 0.04, 0.25 + g / 4, y, 0);
        } else {
          caixa(c1, 1, a - g, 0.5 - g / 2, 0.04, 0, y, -0.25 - g / 4);
          caixa(c2, 1, a - g, 0.5 - g / 2, 0.04, 0, y, 0.25 + g / 4);
        }
      }
      break;
    }

    // ---------- blocos de uso ----------
    case Bloco.MESA_TRABALHO: {
      // mesa: corpo de madeira, tampo claro em 2×2 e um martelinho em cima
      const madeira = cor(Bloco.TABUAS, 'lado') ?? lado0;
      caixa(tom(madeira, 0.8), 0.94, 0.86, 0.94, 0.1, 0, -0.07, 0);
      caixa('#3a2a1e', 0.98, 0.1, 0.98, 0.03, 0, 0.38, 0);
      for (const x of [-1, 1])
        for (const z of [-1, 1])
          caixa(
            tom(madeira, x * z > 0 ? 1.3 : 1.15),
            0.44,
            0.12,
            0.44,
            0.04,
            x * 0.245,
            0.42,
            z * 0.245,
          );
      // pernas marcadas na frente e do lado (faixas escuras nas quinas)
      for (const [x, z] of [
        [-0.47, -0.47],
        [0.47, -0.47],
        [0.47, 0.47],
        [-0.47, 0.47],
      ])
        caixa(tom(madeira, 0.55), 0.1, 0.84, 0.1, 0.04, x, -0.08, z);
      // martelinho deitado no tampo
      const m = grupo(-0.05, 0.55, 0.02, 0, 0.75, 0);
      const cabo = prisma('#e0a060', 0.7, 0.05, 0.05, 10, -0.05, 0, 0, 0.3, m);
      cabo.rotation.z = Math.PI / 2;
      caixa('#7a808c', 0.17, 0.17, 0.4, 0.05, 0.3, 0.03, 0, 0.6, m);
      break;
    }
    case Bloco.FORNALHA:
    case Bloco.FORNALHA_ACESA: {
      // fornalha: pedra com uma boca escura na frente (acesa: fogo brilhando lá dentro)
      const acesa = bloco === Bloco.FORNALHA_ACESA;
      corpo(pedra);
      caixa(tom(pedra, 0.75), 0.98, 0.1, 0.98, 0.04, 0, 0.47, 0);
      caixa(tom(pedra, 1.25), 0.72, 0.5, 0.1, 0.06, 0, -0.14, -0.47);
      caixa(acesa ? '#3a1408' : '#16141a', 0.54, 0.34, 0.1, 0.06, 0, -0.18, -0.5);
      // grelha em cima da boca
      for (const x of [-0.18, 0, 0.18]) caixa('#4a4a52', 0.07, 0.12, 0.06, 0.02, x, 0.24, -0.51);
      if (acesa) {
        bola('#ff7a1a', 0.12, [1, 1.5, 0.5], -0.1, -0.2, -0.54, 1);
        bola('#ff9a2a', 0.1, [1, 1.6, 0.5], 0.12, -0.21, -0.54, 1);
        bola('#ffe04a', 0.08, [1, 1.4, 0.5], 0.01, -0.22, -0.57, 1);
      } else {
        // carvãozinho apagado no fundo
        bola('#3a3a40', 0.07, [1.2, 0.7, 0.6], -0.08, -0.3, -0.54);
        bola('#2c2c32', 0.06, [1.2, 0.7, 0.6], 0.09, -0.3, -0.54);
      }
      break;
    }
    case Bloco.BAU: {
      // baú: caixa e tampa de madeira, faixa na linha da tampa, cantoneiras e fechadura dourada
      const madeira = lado0;
      caixa(madeira, 1, 0.58, 0.86, 0.08, 0, -0.18, 0);
      caixa(tom(madeira, 1.12), 1, 0.3, 0.86, 0.1, 0, 0.27, 0);
      caixa('#4a3526', 1.03, 0.07, 0.89, 0.03, 0, 0.1, 0);
      for (const x of [-1, 1])
        for (const z of [-1, 1]) caixa('#3e3a40', 0.1, 0.9, 0.1, 0.04, x * 0.47, 0, z * 0.4);
      caixa('#f2c14e', 0.18, 0.2, 0.08, 0.04, 0, 0.08, -0.45, 0.9);
      caixa('#3a2a1a', 0.05, 0.08, 0.04, 0.02, 0, 0.05, -0.495);
      break;
    }
    case Bloco.LANTERNA: {
      // lanterna: base e tampa de metal, colunas nas quinas, miolo amarelo que brilha e alça
      const metal = '#4a4a58';
      caixa(metal, 0.74, 0.12, 0.74, 0.05, 0, -0.42, 0);
      caixa(metal, 0.6, 0.1, 0.6, 0.05, 0, 0.27, 0);
      caixa(metal, 0.34, 0.08, 0.34, 0.04, 0, 0.35, 0);
      caixa('#ffd84a', 0.5, 0.58, 0.5, 0.08, 0, -0.07, 0, 1);
      bola('#fff6c0', 0.12, [1, 1.4, 1], 0, -0.08, 0, 1);
      for (const x of [-1, 1])
        for (const z of [-1, 1]) caixa(metal, 0.08, 0.66, 0.08, 0.03, x * 0.27, -0.07, z * 0.27);
      const alca = MeshBuilder.CreateTorus(
        `${nome}-p${k++}`,
        { diameter: 0.34 * L, thickness: 0.06 * L, tessellation: 18 },
        scene,
      );
      alca.material = mat(metal);
      alca.rotation.x = Math.PI / 2;
      alca.rotation.y = -Math.PI / 4;
      por(alca, 0, 0.4 * L, 0);
      break;
    }

    // ---------- abóbora e lampião ----------
    case Bloco.ABOBORA:
    case Bloco.LAMPIAO_ABOBORA: {
      const laranja = doHex('#f08a24');
      const n = 8;
      bola(tom(laranja, 0.85), 0.44, [1.1, 0.8, 1.1], 0, -0.05, 0);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const g = bola(
          tom(laranja, i % 2 ? 0.92 : 1.06),
          0.34,
          [0.6, 1.05, 1],
          Math.sin(a) * 0.24,
          -0.06,
          Math.cos(a) * 0.24,
          0.35,
        );
        g.rotation.y = a;
      }
      const cab = prisma('#6b7a2e', 0.22, 0.06, 0.045, 8, 0.02, 0.36, 0);
      cab.rotation.z = -0.25;
      const folha = bola('#5cbf63', 0.11, [1.6, 0.3, 0.9], 0.15, 0.33, 0.02);
      folha.rotation.z = 0.35;
      if (bloco === Bloco.LAMPIAO_ABOBORA) {
        // rosto virado para quem olha, amarelo brilhando: no ícone a quina da frente; na
        // mão (modelo pequeno) a vista é quase de frente
        const rosto = grupo(0, 0, 0, 0, L < 0.5 ? -0.3 : -Math.PI / 4, 0);
        const luz = '#ffe04a';
        for (const s of [-1, 1]) {
          const olho = prisma(luz, 0.1, 0.12, 0.12, 3, s * 0.16, 0.08, -0.53, 1, rosto);
          olho.rotation.x = -Math.PI / 2;
          olho.rotation.y = Math.PI;
        }
        const boca = caixa(luz, 0.38, 0.08, 0.1, 0.04, 0, -0.17, -0.52, 1, rosto);
        boca.rotation.x = -0.15;
        for (const s of [-1, 1])
          caixa(luz, 0.08, 0.08, 0.1, 0.03, s * 0.17, -0.11, -0.52, 1, rosto);
      }
      break;
    }

    // ---------- cacto ----------
    case Bloco.CACTO: {
      const verde = lado0;
      caixa(verde, 0.84, 1, 0.84, 0.16, 0, 0, 0);
      const listra = tom(verde, 0.65);
      for (const f of LADOS) {
        const F = FACES[f];
        for (const u of [-0.42, 0.42]) {
          const p: RGB = [0, 0, 0];
          p[F.n] = F.s * 0.41;
          p[F.u] = u * 0.42 * 0.84 * 2 * 0.5;
          const w = F.n === 0 ? 0.04 : 0.08;
          const d = F.n === 0 ? 0.08 : 0.04;
          caixa(listra, w, 0.9, d, 0.02, p[0], 0, p[2]);
        }
        for (const [u, v] of [
          [0, 0.5],
          [0, -0.1],
          [0, -0.65],
          [-0.75, 0.2],
          [0.75, -0.35],
        ]) {
          const p: RGB = [0, 0, 0];
          p[F.n] = F.s * 0.43;
          p[F.u] = u * 0.42 * 0.84 * 2 * 0.5 * 1.1;
          p[F.v] = v * 0.45;
          bola('#fffbea', 0.03, [1, 1, 1], p[0], p[1], p[2]);
        }
      }
      // florzinha rosa em cima
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        bola('#ff7ab8', 0.07, [1, 0.5, 1], Math.sin(a) * 0.08, 0.52, Math.cos(a) * 0.08, 0.4);
      }
      bola('#ffe04a', 0.05, [1, 0.7, 1], 0, 0.55, 0, 0.4);
      break;
    }

    default: {
      // lã: um novelo fofo (bolinhas na cor da lã)
      if (bloco >= Bloco.LA_BRANCA && bloco <= Bloco.LA_PRETA) {
        // novelo: uma bola de lã com os fios enrolados em volta e a pontinha solta
        const fio = tom(
          lado0,
          bloco === Bloco.LA_PRETA ? 1.6 : bloco === Bloco.LA_BRANCA ? 0.82 : 1.15,
        );
        bola(tom(lado0, 0.9), 0.47, [1, 1, 1], 0, 0, 0, 0.05);
        const voltas: RGB[] = [
          [0.3, 0, 0.2],
          [1.2, 0.4, 0],
          [-0.9, 0.9, 0.3],
          [0.4, 1.9, 1.3],
          [1.7, -0.6, 0.8],
        ];
        for (const [rx, ry, rz] of voltas) {
          const t = MeshBuilder.CreateTorus(
            `${nome}-p${k++}`,
            { diameter: 0.92 * L, thickness: 0.07 * L, tessellation: 20 },
            scene,
          );
          t.material = mat(fio, 0.05);
          t.rotation.set(rx, ry, rz);
          por(t, 0, 0, 0);
        }
        // a ponta do fio solta, deitada no chão para o lado
        const ponta = grupo(0.22, -0.43, 0.22, 0, -Math.PI / 4, Math.PI / 2);
        prisma(fio, 0.34, 0.035, 0.035, 8, 0, 0, 0, 0.05, ponta);
        break;
      }
      // folhas: cubo com folhinhas pontudas em dois tons
      if (
        bloco === Bloco.FOLHAGEM ||
        bloco === Bloco.FOLHAS_BETULA ||
        bloco === Bloco.FOLHAS_PINHO ||
        bloco === Bloco.FOLHAS_OUTONO ||
        bloco === Bloco.FOLHAS_LANTERNA
      ) {
        const brilho = bloco === Bloco.FOLHAS_LANTERNA ? 0.8 : undefined;
        corpo(tom(lado0, 0.82), 0.16);
        const rnd = sorteio(bloco * 13);
        const tons = [tom(lado0, 1.12), tom(lado0, 0.95)];
        for (const f of VISIVEIS)
          for (const [i, [u, v]] of (
            [
              [-0.45, 0.45],
              [0.4, 0.4],
              [-0.4, -0.4],
              [0.45, -0.45],
              [0, 0],
            ] as const
          ).entries())
            pinta(f, u, v, 0.16, tons[i % 2], [1.7, 0.75], rnd() * Math.PI, brilho);
        break;
      }
      for (const n of nos) n.dispose();
      return null;
    }
  }
  return juntar(pecas, nos, nome);
}

/** Junta as peças da mesma cor numa malha só (já na posição certa) e some com os nós. */
function juntar(pecas: Mesh[], nos: TransformNode[], nome: string): Mesh[] {
  const porMaterial = new Map<unknown, Mesh[]>();
  for (const p of pecas) {
    const lista = porMaterial.get(p.material) ?? [];
    lista.push(p);
    porMaterial.set(p.material, lista);
  }
  // os nós de grupo ainda não calcularam a matriz: sem isso a junção ignora o giro deles
  for (const n of nos) n.computeWorldMatrix(true);
  const out: Mesh[] = [];
  let i = 0;
  for (const lista of porMaterial.values()) {
    const m =
      lista.length === 1 && !lista[0].parent
        ? lista[0]
        : Mesh.MergeMeshes(lista, true, true, undefined, false, false);
    if (!m) continue;
    if (m !== lista[0] || lista.length > 1) m.name = `${nome}-${i}`;
    m.isPickable = false;
    out.push(m);
    i++;
  }
  for (const n of nos) n.dispose();
  return out;
}
