/**
 * Plantas de brinquedo (spec 012): no lugar dos dois quadros cruzados com pixels, cada
 * planta do chão vira uma pecinha 3D — tufo baixo de capim, flor de bolinha, cogumelo de
 * cúpula, arbusto redondo com frutinhas, galhos secos e junco. O cenário não pode ficar
 * poluído: o capim é baixo e na cor do chão, e as flores são o destaque.
 *
 * Puro (roda no worker): as cores vêm de uma tabela por bloco, montada na thread principal a
 * partir do atlas do tema (`coresDasPlantas`), e a textura é o tile branco do atlas (a cor
 * vai nos vértices).
 */
import { Bloco, REGISTRO_BLOCOS } from '../world/blocks';
import type { Atlas } from '../art/atlas';
import { TAM_TILE } from '../art/atlas';

export type Rgb01 = [number, number, number];
export interface CoresPlanta {
  folha: Rgb01;
  destaque: Rgb01;
}

/** Destino dos vértices (o acumulador da malha de plantas). */
export interface AlvoPlanta {
  posicoes: number[];
  normais: number[];
  uvs: number[];
  cores: number[];
  luz: number[];
  indices: number[];
  readonly vertices: number;
}

/** Plantas desenhadas como peça (as outras seguem nos quadros cruzados). */
export const PLANTAS_BRINQUEDO: readonly number[] = [
  Bloco.GRAMA_ALTA,
  Bloco.FLOR,
  Bloco.COGUMELO_BRILHANTE,
  Bloco.ARBUSTO_FRUTINHAS,
  Bloco.ARBUSTO_SECO,
  Bloco.JUNCO,
  Bloco.TOCHA,
  // spec 013: a lavoura nos 4 estágios (a forma de cada estágio sai daqui; a cor, do tile)
  Bloco.TRIGO_0,
  Bloco.TRIGO_1,
  Bloco.TRIGO_2,
  Bloco.TRIGO_3,
  Bloco.MILHO_0,
  Bloco.MILHO_1,
  Bloco.MILHO_2,
  Bloco.MILHO_3,
  Bloco.ABOBOREIRA_0,
  Bloco.ABOBOREIRA_1,
  Bloco.ABOBOREIRA_2,
  Bloco.ABOBOREIRA_3,
];

/** Planta da lavoura e estágio (0 a 3) de um bloco, ou null se não é lavoura. */
export function estagioDaLavoura(
  id: number,
): { planta: 'trigo' | 'milho' | 'aboboreira'; estagio: number } | null {
  if (id >= Bloco.TRIGO_0 && id <= Bloco.TRIGO_3)
    return { planta: 'trigo', estagio: id - Bloco.TRIGO_0 };
  if (id >= Bloco.MILHO_0 && id <= Bloco.MILHO_3)
    return { planta: 'milho', estagio: id - Bloco.MILHO_0 };
  if (id >= Bloco.ABOBOREIRA_0 && id <= Bloco.ABOBOREIRA_3)
    return { planta: 'aboboreira', estagio: id - Bloco.ABOBOREIRA_0 };
  return null;
}

const PADRAO: CoresPlanta = { folha: [0.42, 0.7, 0.32], destaque: [0.93, 0.36, 0.55] };
let tabela: Record<number, CoresPlanta> = {};
/** Celular: bolinhas com menos gomos (qualidade automática). */
let gomos = 1;
export function definirDetalhePlantas(d: 'alto' | 'baixo'): void {
  gomos = d === 'baixo' ? 0.65 : 1;
}

/** Cor da copa de bolas pelo bloco de folha (do atlas do tema; verde se não houver). */
export function corDaCopa(id: number): Rgb01 {
  const c = tabela[id];
  if (!c) return [0.36, 0.66, 0.3];
  // copa de brinquedo: um pouco mais clara que a média do tile
  return [
    Math.min(1, c.folha[0] * 1.12 + 0.03),
    Math.min(1, c.folha[1] * 1.12 + 0.03),
    Math.min(1, c.folha[2] * 1.12 + 0.03),
  ];
}

/** Cores das plantas do tema (mensagem de estilo do worker). */
export function definirCoresPlantas(t: Record<number, CoresPlanta> | undefined): void {
  tabela = t ?? {};
}

/**
 * Lê no atlas as duas cores de cada planta: a folhagem (média dos tons esverdeados, ou de
 * tudo se não houver) e o destaque (os tons que mais se afastam dela: pétala, chapéu, fruta).
 */
export function coresDasPlantas(atlas: Atlas): Record<number, CoresPlanta> {
  const saida: Record<number, CoresPlanta> = {};
  // as folhas de todo bloco de copa entram também (cor da copa de bolas)
  const folhas = REGISTRO_BLOCOS.filter((b) => b?.folhas).map((b) => b.id);
  for (const id of [...PLANTAS_BRINQUEDO, ...folhas]) {
    const uv = atlas.uvDaFace(id, 'lado');
    if (!uv) continue;
    const ox = Math.round(uv.u0 * atlas.largura);
    const oy = Math.round(uv.v0 * atlas.altura);
    const px: Rgb01[] = [];
    for (let y = 0; y < TAM_TILE; y++)
      for (let x = 0; x < TAM_TILE; x++) {
        const i = ((oy + y) * atlas.largura + ox + x) * 4;
        if (atlas.pixels[i + 3] < 128) continue;
        px.push([atlas.pixels[i] / 255, atlas.pixels[i + 1] / 255, atlas.pixels[i + 2] / 255]);
      }
    if (px.length === 0) continue;
    const media = (l: Rgb01[]): Rgb01 => {
      const s: Rgb01 = [0, 0, 0];
      for (const p of l) for (let k = 0; k < 3; k++) s[k] += p[k] / l.length;
      return s;
    };
    const verdes = px.filter((p) => p[1] >= p[0] && p[1] >= p[2]);
    const folha = media(verdes.length >= px.length * 0.2 ? verdes : px);
    const dist = (p: Rgb01) => Math.hypot(p[0] - folha[0], p[1] - folha[1], p[2] - folha[2]);
    const longe = [...px].sort((a, b) => dist(b) - dist(a));
    const destaque = media(longe.slice(0, Math.max(1, Math.ceil(px.length * 0.2))));
    saida[id] = { folha, destaque };
  }
  return saida;
}

const mistura = (a: Rgb01, b: Rgb01, t: number): Rgb01 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const BRANCO: Rgb01 = [1, 1, 1];
const MIOLO: Rgb01 = [1, 0.84, 0.35];

/**
 * Monta a planta `id` na célula (x, y, z). Devolve false se ela não tem forma de brinquedo
 * (quem chama desenha os quadros cruzados de sempre).
 */
export function plantaDeBrinquedo(
  id: number,
  x: number,
  y: number,
  z: number,
  alvo: AlvoPlanta,
  uvBranco: readonly [number, number],
  luz: readonly [number, number],
  sorte: (sal: number) => number,
  balanca: boolean,
  /** Tile de brilho da planta (pétala, chapéu): cor e brilho noturno vêm dele. */
  uvBrilho?: readonly [number, number],
): boolean {
  if (!PLANTAS_BRINQUEDO.includes(id)) return false;
  const cores = tabela[id] ?? PADRAO;
  /** Enquanto ligado, as peças usam o tile de brilho (a cor vem dele; o vértice fica claro). */
  let brilhando = false;
  const comBrilho = (f: () => void) => {
    if (!uvBrilho) return f();
    brilhando = true;
    f();
    brilhando = false;
  };
  const tingir = (c: Rgb01): Rgb01 => (uvBrilho ? [1, 1, 1] : c);
  let peso = balanca ? 1 : 0;

  const vertice = (
    px: number,
    py: number,
    pz: number,
    nx: number,
    ny: number,
    nz: number,
    cor: Rgb01,
  ) => {
    alvo.posicoes.push(px, py, pz);
    alvo.normais.push(nx, ny, nz);
    const uv = brilhando && uvBrilho ? uvBrilho : uvBranco;
    alvo.uvs.push(uv[0], uv[1]);
    // alfa: quanto o vértice balança ao vento (de baixo para cima)
    alvo.cores.push(cor[0], cor[1], cor[2], Math.min(1, Math.max(0, py - y)) * peso);
    alvo.luz.push(luz[0], luz[1]);
  };

  /** Bolinha (esfera achatada à vontade) centrada em c, raios r. */
  const bola = (
    cx: number,
    cy: number,
    cz: number,
    rx: number,
    ry: number,
    rz: number,
    cor: Rgb01,
    an = 7,
    ae = 4,
  ) => {
    an = Math.max(4, Math.round(an * gomos));
    ae = Math.max(2, Math.round(ae * gomos));
    const base = alvo.vertices;
    for (let i = 0; i <= ae; i++) {
      const fi = (i / ae) * Math.PI;
      for (let j = 0; j <= an; j++) {
        const te = (j / an) * Math.PI * 2;
        const nx = Math.sin(fi) * Math.cos(te);
        const ny = Math.cos(fi);
        const nz = Math.sin(fi) * Math.sin(te);
        // topo mais claro, base mais escura (luz de brinquedo)
        const k = 0.86 + 0.14 * (ny * 0.5 + 0.5);
        vertice(cx + nx * rx, cy + ny * ry, cz + nz * rz, nx, ny, nz, [
          cor[0] * k,
          cor[1] * k,
          cor[2] * k,
        ]);
      }
    }
    for (let i = 0; i < ae; i++)
      for (let j = 0; j < an; j++) {
        const a = base + i * (an + 1) + j;
        const b = a + an + 1;
        alvo.indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
  };

  /** Haste afinando de a (raio r0) até b (raio r1), com `lados` faces. */
  const haste = (
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    r0: number,
    r1: number,
    cor0: Rgb01,
    cor1: Rgb01,
    lados = 5,
  ) => {
    const base = alvo.vertices;
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    const len = Math.hypot(dx, dy, dz) || 1;
    const d = [dx / len, dy / len, dz / len];
    // dois eixos perpendiculares à haste
    const ref = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let u = [
      d[1] * ref[2] - d[2] * ref[1],
      d[2] * ref[0] - d[0] * ref[2],
      d[0] * ref[1] - d[1] * ref[0],
    ];
    const lu = Math.hypot(u[0], u[1], u[2]);
    u = u.map((v) => v / lu);
    const w = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]];
    for (let j = 0; j <= lados; j++) {
      const t = (j / lados) * Math.PI * 2;
      const c = Math.cos(t);
      const s = Math.sin(t);
      const n = [u[0] * c + w[0] * s, u[1] * c + w[1] * s, u[2] * c + w[2] * s];
      vertice(ax + n[0] * r0, ay + n[1] * r0, az + n[2] * r0, n[0], n[1], n[2], cor0);
      vertice(bx + n[0] * r1, by + n[1] * r1, bz + n[2] * r1, n[0], n[1], n[2], cor1);
    }
    for (let j = 0; j < lados; j++) {
      const a = base + j * 2;
      alvo.indices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
    }
  };

  const cx = x + 0.5 + (sorte(11) - 0.5) * 0.3;
  const cz = z + 0.5 + (sorte(12) - 0.5) * 0.3;
  const tom = 0.9 + 0.15 * sorte(13);
  // folhagem nunca fica escura demais (plástico colorido, não sombra)
  const lum = cores.folha[0] * 0.3 + cores.folha[1] * 0.59 + cores.folha[2] * 0.11;
  const clareia = lum < 0.5 ? Math.min(2.4, 0.5 / Math.max(lum, 0.05)) : 1;
  const folha: Rgb01 = [
    Math.min(1, cores.folha[0] * tom * clareia),
    Math.min(1, cores.folha[1] * tom * clareia),
    Math.min(1, cores.folha[2] * tom * clareia),
  ];
  const ponta = mistura(folha, BRANCO, 0.18);
  const sombra: Rgb01 = [folha[0] * 0.72, folha[1] * 0.72, folha[2] * 0.72];

  const lavoura = estagioDaLavoura(id);
  if (lavoura) {
    const { planta, estagio: e } = lavoura;
    const verde: Rgb01 = folha;
    // no meio da célula, sem o desvio das plantas soltas: a lavoura fica em fileiras
    const mx = x + 0.5;
    const mz = z + 0.5;
    /** Broto: a hastezinha verde com duas folhinhas redondas (o estágio 0 das três). */
    const broto = (bx: number, bz: number, h: number) => {
      haste(bx, y, bz, bx, y + h, bz, 0.022, 0.016, sombra, verde, 4);
      bola(bx - 0.035, y + h, bz, 0.04, 0.016, 0.026, ponta, 5, 2);
      bola(bx + 0.035, y + h, bz, 0.04, 0.016, 0.026, ponta, 5, 2);
    };
    if (e === 0) {
      // o canteiro recém-plantado: brotinhos em quadrado, com o grão (na cor do fruto) ao pé
      const semente = mistura(cores.destaque, [0.35, 0.25, 0.15], 0.25);
      for (const [dx, dz] of [
        [-0.2, -0.2],
        [0.2, -0.2],
        [-0.2, 0.2],
        [0.2, 0.2],
      ] as const) {
        broto(mx + dx, mz + dz, 0.09 + 0.03 * sorte(30 + dx * 10 + dz));
        bola(mx + dx + 0.05, y + 0.015, mz + dz + 0.03, 0.035, 0.022, 0.03, semente, 5, 2);
      }
      return true;
    }
    if (planta === 'trigo') {
      // tufos: 4 no estágio 1, 5 no 2 e 9 (em grade) maduro; a espiga engorda e doura
      const pontos: Array<[number, number]> =
        e === 1
          ? [
              [-0.2, -0.2],
              [0.2, -0.2],
              [-0.2, 0.2],
              [0.2, 0.2],
            ]
          : e === 2
            ? [
                [-0.24, -0.24],
                [0.24, -0.24],
                [0, 0],
                [-0.24, 0.24],
                [0.24, 0.24],
              ]
            : [-0.28, 0, 0.28].flatMap((a) =>
                [-0.28, 0, 0.28].map((b): [number, number] => [a, b]),
              );
      const alturas = [0, 0.24, 0.48, 0.74];
      const caule: Rgb01 =
        e === 3
          ? mistura(verde, cores.destaque, 0.62)
          : e === 2
            ? mistura(verde, BRANCO, 0.05)
            : verde;
      const espiga: Rgb01 =
        e === 3 ? mistura(cores.destaque, BRANCO, 0.12) : mistura(verde, cores.destaque, 0.4);
      pontos.forEach(([dx, dz], i) => {
        const bx = mx + dx;
        const bz = mz + dz;
        const h = alturas[e] * (0.88 + 0.24 * sorte(40 + i));
        // pende um pouquinho para fora
        const tx = bx + dx * 0.15 + (sorte(50 + i) - 0.5) * 0.06;
        const tz = bz + dz * 0.15 + (sorte(60 + i) - 0.5) * 0.06;
        if (e === 1) {
          // folhinhas finas em leque
          for (let k = 0; k < 3; k++) {
            const a = sorte(70 + i) * 6 + (k / 3) * Math.PI * 2;
            haste(
              bx,
              y,
              bz,
              bx + Math.cos(a) * 0.07,
              y + h,
              bz + Math.sin(a) * 0.07,
              0.026,
              0.008,
              sombra,
              ponta,
              4,
            );
          }
          return;
        }
        haste(bx, y, bz, tx, y + h, tz, 0.02, 0.016, mistura(caule, [0, 0, 0], 0.2), caule, 4);
        if (e === 3) bola(tx, y + h + 0.08, tz, 0.05, 0.12, 0.05, espiga, 5, 4);
        else bola(tx, y + h + 0.04, tz, 0.032, 0.07, 0.032, espiga, 5, 3);
        // uma folha comprida saindo do meio da haste
        if (i % 2 === 0) {
          const a = sorte(80 + i) * Math.PI * 2;
          haste(
            bx,
            y + h * 0.3,
            bz,
            bx + Math.cos(a) * 0.14,
            y + h * 0.55,
            bz + Math.sin(a) * 0.14,
            0.022,
            0.006,
            caule,
            ponta,
            4,
          );
        }
      });
      return true;
    }
    if (planta === 'milho') {
      const h = [0, 0.32, 0.7, 1.08][e];
      const r0 = [0, 0.035, 0.05, 0.06][e];
      haste(mx, y, mz, mx, y + h, mz, r0, r0 * 0.7, sombra, verde, 5);
      // folhas compridas: sobem para fora e caem na ponta, em lados alternados
      const nFolhas = [0, 2, 4, 5][e];
      const giro = sorte(90) * Math.PI * 2;
      for (let i = 0; i < nFolhas; i++) {
        const a = giro + i * 2.4;
        const fy = y + h * (0.18 + (0.7 * i) / Math.max(1, nFolhas));
        const c = Math.cos(a);
        const sn = Math.sin(a);
        const L = [0, 0.18, 0.3, 0.36][e];
        const meioX = mx + c * L * 0.55;
        const meioZ = mz + sn * L * 0.55;
        haste(mx, fy, mz, meioX, fy + L * 0.4, meioZ, 0.03, 0.022, verde, ponta, 4);
        haste(
          meioX,
          fy + L * 0.4,
          meioZ,
          mx + c * L,
          fy + L * 0.15,
          mz + sn * L,
          0.022,
          0.006,
          ponta,
          ponta,
          4,
        );
      }
      if (e === 3) {
        // pendão no alto e duas espigas amarelas com a palha verde em volta
        const pendao = mistura(cores.destaque, BRANCO, 0.45);
        for (let k = 0; k < 3; k++) {
          const a = giro + (k / 3) * Math.PI * 2;
          haste(
            mx,
            y + h,
            mz,
            mx + Math.cos(a) * 0.09,
            y + h + 0.14,
            mz + Math.sin(a) * 0.09,
            0.016,
            0.008,
            pendao,
            pendao,
            4,
          );
        }
        const espiga = mistura(cores.destaque, BRANCO, 0.08);
        for (const [k, alt] of [
          [0, 0.42],
          [1, 0.6],
        ] as const) {
          const a = giro + 1.2 + k * Math.PI;
          const ex = mx + Math.cos(a) * 0.1;
          const ez = mz + Math.sin(a) * 0.1;
          bola(ex, y + alt, ez, 0.065, 0.14, 0.065, espiga, 6, 4);
          // a palha: folhas verdes abraçando a base da espiga
          bola(ex, y + alt - 0.09, ez, 0.072, 0.08, 0.072, verde, 6, 3);
        }
      }
      return true;
    }
    // aboboreira: folhas redondas na rama, a florzinha amarela e, madura, a abóbora
    const nFolhas = [0, 3, 5, 5][e];
    const raio = [0, 0.1, 0.15, 0.16][e];
    const longe = [0, 0.13, 0.27, 0.3][e];
    const giro = sorte(90) * Math.PI * 2;
    for (let i = 0; i < nFolhas; i++) {
      const a = giro + (i / nFolhas) * Math.PI * 2;
      const fx = mx + Math.cos(a) * longe;
      const fz = mz + Math.sin(a) * longe;
      const fy = y + 0.1 + 0.08 * sorte(100 + i) + (e === 1 ? 0.04 : 0);
      haste(mx, y, mz, fx, fy, fz, 0.02, 0.014, sombra, verde, 4);
      bola(fx, fy, fz, raio, raio * 0.28, raio, i % 2 ? verde : mistura(verde, BRANCO, 0.1), 7, 3);
    }
    if (e === 2) bola(mx, y + 0.2, mz, 0.06, 0.05, 0.06, [1, 0.85, 0.3], 6, 3);
    if (e === 3) {
      // a abóbora não balança ao vento
      peso = 0;
      const fruto = cores.destaque;
      const ax = mx + Math.cos(giro + 0.6) * 0.04;
      const az = mz + Math.sin(giro + 0.6) * 0.04;
      bola(ax, y + 0.2, az, 0.28, 0.2, 0.28, mistura(fruto, [0, 0, 0], 0.12), 9, 5);
      // gomos
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        bola(
          ax + Math.cos(a) * 0.13,
          y + 0.21,
          az + Math.sin(a) * 0.13,
          0.17,
          0.195,
          0.17,
          i % 2 ? fruto : mistura(fruto, BRANCO, 0.1),
          7,
          4,
        );
      }
      haste(
        ax,
        y + 0.36,
        az,
        ax + 0.03,
        y + 0.48,
        az,
        0.035,
        0.028,
        [0.42, 0.36, 0.18],
        [0.5, 0.44, 0.22],
        5,
      );
    }
    return true;
  }

  switch (id) {
    case Bloco.GRAMA_ALTA: {
      // tufo baixo: 3 a 4 folhinhas grossas e arredondadas, quase da cor do chão
      const n = 3 + Math.floor(sorte(14) * 2);
      const giro = sorte(15) * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const a = giro + (i / n) * Math.PI * 2;
        const h = 0.26 + 0.14 * sorte(20 + i);
        const ox = Math.cos(a) * 0.07;
        const oz = Math.sin(a) * 0.07;
        haste(
          cx + ox,
          y,
          cz + oz,
          cx + ox * 2.6,
          y + h,
          cz + oz * 2.6,
          0.05,
          0.012,
          sombra,
          ponta,
          4,
        );
      }
      break;
    }
    case Bloco.FLOR: {
      const h = 0.36 + 0.08 * sorte(14);
      const topo = y + h;
      haste(cx, y, cz, cx, topo, cz, 0.026, 0.022, sombra, folha, 5);
      // folhinha no caule
      bola(cx + 0.06, y + h * 0.4, cz, 0.07, 0.025, 0.04, folha, 6, 3);
      const giro = sorte(15) * Math.PI * 2;
      const petala = tingir(mistura(cores.destaque, BRANCO, 0.08));
      comBrilho(() => {
        for (let i = 0; i < 5; i++) {
          const a = giro + (i / 5) * Math.PI * 2;
          bola(
            cx + Math.cos(a) * 0.1,
            topo,
            cz + Math.sin(a) * 0.1,
            0.085,
            0.05,
            0.085,
            petala,
            6,
            3,
          );
        }
      });
      bola(cx, topo + 0.02, cz, 0.06, 0.045, 0.06, MIOLO, 6, 3);
      break;
    }
    case Bloco.COGUMELO_BRILHANTE: {
      const h = 0.2 + 0.08 * sorte(14);
      const pe = mistura(folha, BRANCO, 0.55);
      haste(cx, y, cz, cx, y + h, cz, 0.065, 0.05, pe, pe, 6);
      const chapeu = cores.destaque;
      comBrilho(() => bola(cx, y + h, cz, 0.2, 0.13, 0.2, tingir(chapeu), 8, 4));
      for (let i = 0; i < 3; i++) {
        const a = sorte(16 + i) * Math.PI * 2;
        bola(
          cx + Math.cos(a) * 0.11,
          y + h + 0.085,
          cz + Math.sin(a) * 0.11,
          0.03,
          0.02,
          0.03,
          BRANCO,
          5,
          2,
        );
      }
      break;
    }
    case Bloco.ARBUSTO_FRUTINHAS: {
      bola(x + 0.5, y + 0.3, z + 0.5, 0.36, 0.3, 0.36, folha, 8, 5);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + sorte(14) * 2;
        const alt = 0.15 + 0.25 * sorte(20 + i);
        const r = Math.sqrt(Math.max(0, 1 - ((alt - 0.3) / 0.3) ** 2));
        bola(
          x + 0.5 + Math.cos(a) * 0.36 * r,
          y + alt + 0.05,
          z + 0.5 + Math.sin(a) * 0.36 * r,
          0.05,
          0.05,
          0.05,
          cores.destaque,
          5,
          3,
        );
      }
      break;
    }
    case Bloco.ARBUSTO_SECO: {
      const galho = mistura(cores.folha, cores.destaque, 0.3);
      const n = 4;
      for (let i = 0; i < n; i++) {
        const a = sorte(14) * 6 + (i / n) * Math.PI * 2;
        const h = 0.3 + 0.15 * sorte(20 + i);
        haste(
          cx,
          y,
          cz,
          cx + Math.cos(a) * 0.22,
          y + h,
          cz + Math.sin(a) * 0.22,
          0.025,
          0.01,
          galho,
          galho,
          4,
        );
      }
      break;
    }
    case Bloco.TOCHA: {
      // tocha de brinquedo: cabinho de madeira e uma bolinha de chama que brilha
      const cabo: Rgb01 = [0.55, 0.36, 0.22];
      const cxT = x + 0.5;
      const czT = z + 0.5;
      haste(cxT, y, czT, cxT, y + 0.5, czT, 0.055, 0.05, mistura(cabo, [0, 0, 0], 0.15), cabo, 6);
      bola(cxT, y + 0.52, czT, 0.075, 0.03, 0.075, mistura(cabo, [0, 0, 0], 0.3), 6, 2);
      // a chama já é clareada pela luz da própria tocha: base mais baixa para não estourar
      const chama: Rgb01 = uvBrilho ? [0.62, 0.5, 0.42] : [1, 0.72, 0.25];
      comBrilho(() => {
        bola(cxT, y + 0.62, czT, 0.1, 0.13, 0.1, chama, 7, 4);
        bola(cxT, y + 0.75, czT, 0.05, 0.07, 0.05, chama, 5, 3);
      });
      break;
    }
    case Bloco.JUNCO: {
      for (let i = 0; i < 3; i++) {
        const a = sorte(14) * 6 + (i / 3) * Math.PI * 2;
        const h = 0.65 + 0.25 * sorte(20 + i);
        const bx = cx + Math.cos(a) * 0.1;
        const bz = cz + Math.sin(a) * 0.1;
        haste(cx, y, cz, bx, y + h, bz, 0.03, 0.012, sombra, ponta, 4);
        if (i === 0) {
          // a espiga do junco
          haste(
            cx + (bx - cx) * 0.7,
            y + h * 0.66,
            cz + (bz - cz) * 0.7,
            cx + (bx - cx) * 0.9,
            y + h * 0.88,
            cz + (bz - cz) * 0.9,
            0.045,
            0.04,
            cores.destaque,
            cores.destaque,
            6,
          );
        }
      }
      break;
    }
  }
  return true;
}
