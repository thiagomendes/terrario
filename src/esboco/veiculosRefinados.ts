/**
 * Esboço 014c: táxi, ônibus e sorvete refinados, cada um com a carroceria esculpida numa peça
 * só (`escultura.ts`): para-lamas em arco por cima das rodas, capô, para-brisa e teto numa
 * curva contínua, janelas que seguem a lataria, e a carinha de sempre (os olhinhos são os
 * faróis, a boquinha sorri, as bochechas). Mesmas rodas (lugar e raio), mesma caixa e a mesma
 * escala do jogo (`MEDIDAS`): só o desenho muda. Nada disto entra no jogo ainda.
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix } from '@babylonjs/core/Maths/math.vector';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { CreateSphereVertexData } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { CreateCylinderVertexData } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { dadosAnel, dadosCaixaArredondada } from '../render/formas';
import { MEDIDAS, MODELO_DO_TIPO } from '../jogo/veiculos';
import type { Luz, Roda } from '../render/veiculosModelos';
import {
  Pecas,
  carroceria,
  chaoComArcos,
  curva,
  decalque,
  emCima,
  naPonta,
  noLado,
  normalEm,
  suave,
  tubo,
  type Forma,
  type V3,
} from './escultura';

export type TipoRefinado = 'taxi' | 'onibusAzul' | 'sorvete' | 'ambulancia' | 'bombeiros' | 'civil';
/** Com carinha (olhos, boca, bochechas) ou de brinquedo limpo (faróis, grade, para-choque). */
export type Frente = 'limpa' | 'cara';

export interface ModeloRefinado {
  corpo: VertexData;
  luzes: Luz[];
  rodas: Roda[];
  triangulos: number;
  /** Entre-eixos (já na escala): a conta do esterço das rodas da frente. */
  entreEixos: number;
}

const VIDRO = '#9fd6ef';
const VIDRO_ESCURO = '#7fbfe0';
const BOCHECHA = '#ff9aa8';
const BOCA = '#6a3a4a';

interface Obra {
  f: Forma;
  p: Pecas;
  luzes: Luz[];
  rodas: Roda[];
}

const tri = (vd: VertexData) => vd.indices!.length / 3;

/** Esfera colorida (pupila, brilho, bola de sorvete). */
function bola(p: Pecas, r: number, cor: string, c: V3, esc: V3 = [1, 1, 1], seg = 6) {
  const vd = CreateSphereVertexData({ diameter: 2 * r, segments: seg });
  vd.transform(Matrix.Scaling(...esc).multiply(Matrix.Translation(...c)));
  p.add(vd, cor);
}

/**
 * Olhinho-farol: o branco é a luz (acende de noite), afundado na lataria; a pupila e o
 * brilho vão na carroceria, um pouco para fora, olhando para a frente.
 */
function olho(o: Obra, y: number, z: number, r: number) {
  const s = naPonta(o.f, y, z, 1)!;
  const n = normalEm(o.f, s);
  const c: V3 = [s[0] - n[0] * r * 0.25, y, z];
  o.luzes.push({ tipo: 'farol', pos: c, raio: [r * 0.62, r, r] });
  bola(o.p, r * 0.46, '#2a2a3a', [c[0] + r * 0.42, y - r * 0.06, z], [0.5, 1, 1], 6);
  bola(o.p, r * 0.17, '#ffffff', [c[0] + r * 0.6, y + r * 0.24, z + r * 0.14], [0.5, 1, 1], 3);
}

/** A boquinha: um arco sorrindo, colado na frente. */
function boca(o: Obra, y: number, larg: number, fundo: number, raio = 0.045) {
  const pts: V3[] = [];
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const t = -1 + (2 * i) / n;
    const z = t * larg * 0.5;
    const yy = y - (1 - t * t) * fundo;
    const s = naPonta(o.f, yy, z, 1);
    if (!s) continue;
    const nn = normalEm(o.f, s);
    pts.push([s[0] + nn[0] * raio * 0.4, yy + nn[1] * raio * 0.4, z + nn[2] * raio * 0.4]);
  }
  o.p.add(tubo(pts, raio, BOCA, 6));
}

/** Bochechas: decalques ovais na frente. */
function bochechas(o: Obra, y: number, z: number, w: number, h: number) {
  for (const s of [-1, 1]) {
    const d = decalque(
      o.f,
      { u0: s * z - w / 2, u1: s * z + w / 2, v0: y - h / 2, v1: y + h / 2, r: Math.max(w, h) },
      (u, v) => naPonta(o.f, v, u, 1),
      BOCHECHA,
      5,
      3,
      0.01,
    );
    if (d) o.p.add(d);
  }
}

/**
 * A frente de brinquedo limpo (014c, o dono: "não precisa ter rostinho para ser um brinquedo"):
 * dois faróis redondos com aro cromado, a grade escura com frisos e o para-choque claro,
 * tudo colado na lataria.
 */
function frenteLimpa(
  o: Obra,
  y: number,
  zFarol: number,
  rFarol: number,
  grade: { y0: number; y1: number; z: number },
  choque: { y0: number; y1: number; z: number },
) {
  for (const z of [-zFarol, zFarol]) {
    // aro cromado e o farol (a luz acende de noite)
    const aro = decalque(
      o.f,
      { u0: z - rFarol * 1.25, u1: z + rFarol * 1.25, v0: y - rFarol * 1.25, v1: y + rFarol * 1.25, r: rFarol * 1.25 },
      (u, v) => naPonta(o.f, v, u, 1),
      '#dfe3ea',
      6,
      6,
      0.01,
    );
    if (aro) o.p.add(aro);
    const s = naPonta(o.f, y, z, 1)!;
    o.luzes.push({ tipo: 'farol', pos: [s[0] - 0.01, y, z], raio: [rFarol * 0.45, rFarol, rFarol] });
  }
  const g = decalque(
    o.f,
    { u0: -grade.z, u1: grade.z, v0: grade.y0, v1: grade.y1, r: 0.06 },
    (u, v) => naPonta(o.f, v, u, 1),
    '#34363f',
    6,
    3,
    0.012,
  );
  if (g) o.p.add(g);
  const n = 3;
  for (let k = 1; k <= n; k++) {
    const yy = grade.y0 + ((grade.y1 - grade.y0) * k) / (n + 1);
    const friso = decalque(
      o.f,
      { u0: -grade.z * 0.9, u1: grade.z * 0.9, v0: yy - 0.012, v1: yy + 0.012, r: 0.01 },
      (u, v) => naPonta(o.f, v, u, 1),
      '#c9ced8',
      5,
      1,
      0.018,
    );
    if (friso) o.p.add(friso);
  }
  const c = decalque(
    o.f,
    { u0: -choque.z, u1: choque.z, v0: choque.y0, v1: choque.y1, r: 0.06 },
    (u, v) => naPonta(o.f, v, u, 1),
    '#eceef2',
    8,
    2,
    0.012,
  );
  if (c) o.p.add(c);
}

/** Luzinha no teto (giroflex macio): base branca e a luz (instância que pisca). */
function giroflex(o: Obra, x: number, y: number, larg: number, cores: Luz['tipo'][]) {
  const base = dadosCaixaArredondada(0.34, 0.1, larg, 0.05, 2);
  base.transform(Matrix.Translation(x, y + 0.05, 0));
  o.p.add(base, '#f4f5f8');
  cores.forEach((t, i) => {
    const z = (i - (cores.length - 1) / 2) * (larg / cores.length);
    o.luzes.push({ tipo: t, pos: [x, y + 0.16, z], raio: [0.12, 0.08, (larg / cores.length) * 0.42] });
  });
}

/** Janela do lado (os dois lados), com o alto seguindo o teto (`teto(x)`). */
function janelaLado(
  o: Obra,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  r: number,
  teto: (x: number) => number,
  cor = VIDRO,
  lados: number[] = [-1, 1],
  nu = 6,
) {
  for (const lado of lados) {
    const d = decalque(
      o.f,
      { u0: x0, u1: x1, v0: y0, v1: y1, r },
      (u, v) => noLado(o.f, u, Math.min(v, teto(u)), lado),
      cor,
      nu,
      3,
    );
    if (d) o.p.add(d);
  }
}

function fechar(o: Obra, tipo: 'taxi' | 'civil' | 'onibusAzul' | 'sorvete', entreEixos: number): ModeloRefinado {
  const e = MEDIDAS[MODELO_DO_TIPO[tipo]].escala;
  const corpo = o.p.juntar();
  corpo.transform(Matrix.Scaling(e, e, e));
  return {
    corpo,
    luzes: o.luzes.map((l) => ({
      tipo: l.tipo,
      pos: [l.pos[0] * e, l.pos[1] * e, l.pos[2] * e],
      raio: [l.raio[0] * e, l.raio[1] * e, l.raio[2] * e],
    })),
    rodas: o.rodas.map((r) => ({ x: r.x * e, z: r.z * e, raio: r.raio * e })),
    triangulos: tri(corpo),
    entreEixos: entreEixos * e,
  };
}

// ------------------------------------------------------------------ táxi

function taxi(frente: Frente, cor = '#ffc21a', ehTaxi = true): ModeloRefinado {
  const AMARELO = cor;
  const topo = curva([
    [-1.5, 1.26],
    [-1.28, 1.36],
    [-0.9, 2.02],
    [-0.7, 2.08],
    [0.0, 2.08],
    [0.58, 1.44],
    [1.2, 1.36],
    [1.55, 1.2],
  ]);
  const f: Forma = {
    x0: -1.5,
    x1: 1.55,
    baixo: chaoComArcos(0.3, [
      { x: -0.9, y: 0.12, r: 0.6 },
      { x: 0.9, y: 0.12, r: 0.6 },
    ]),
    pocos: [
      { x: -0.9, y: 0.47, r: 0.6, dentro: 0.48 },
      { x: 0.9, y: 0.47, r: 0.6, dentro: 0.48 },
    ],
    topo,
    meia: (_x, y) => 0.86 * (1 - 0.2 * suave(1.35, 2.08, y)),
    ponta: 4.2,
    n: 3,
  };
  const o: Obra = { f, p: new Pecas(), luzes: [], rodas: [] };
  // mais anéis na altura das rodas: a borda da caixa de roda fica lisa
  o.p.add(
    carroceria(f, 52, [
      { ate: 1.1, passos: 10, cor: AMARELO },
      { ate: null, passos: 7, cor: AMARELO },
    ]),
  );
  // janelas: a de trás e a da frente de cada lado (a coluna do meio fica amarela)
  const teto = (x: number) => topo(x) - 0.13;
  janelaLado(o, -1.02, -0.3, 1.5, 1.95, 0.12, teto);
  janelaLado(o, -0.18, 0.62, 1.5, 1.95, 0.12, teto);
  // para-brisa e vidro de trás, na curva do teto
  for (const [a, b] of [
    [0.1, 0.56],
    [-1.22, -0.86],
  ]) {
    const d = decalque(
      f,
      { u0: a, u1: b, v0: -0.52, v1: 0.52, r: 0.12 },
      (u, v) => emCima(f, u, v),
      VIDRO_ESCURO,
      5,
      6,
    );
    if (d) o.p.add(d);
  }
  // faixa xadrez do táxi
  if (ehTaxi) for (const lado of [-1, 1])
    for (let k = 0; k < 8; k++) {
      const x0 = -0.72 + k * 0.16;
      const d = decalque(
        f,
        { u0: x0, u1: x0 + 0.16, v0: 1.2, v1: 1.32, r: 0 },
        (u, v) => noLado(f, u, v, lado),
        k % 2 ? '#24252c' : '#fbf8ee',
        1,
        1,
        0.014,
      );
      if (d) o.p.add(d);
    }
  // a placa de táxi no teto
  if (ehTaxi) taxiPlaca(o);
  if (frente === 'cara') {
    for (const z of [-0.42, 0.42]) olho(o, 1.06, z, 0.21);
    boca(o, 0.74, 0.86, 0.12);
    bochechas(o, 0.8, 0.66, 0.2, 0.12);
  } else
    frenteLimpa(o, 1.04, 0.5, 0.13, { y0: 0.66, y1: 0.9, z: 0.3 }, { y0: 0.44, y1: 0.58, z: 0.66 });
  for (const z of [-0.54, 0.54]) {
    const s = naPonta(f, 1.12, z, -1)!;
    o.luzes.push({ tipo: 'lanterna', pos: [s[0] + 0.03, 1.12, z], raio: [0.06, 0.11, 0.11] });
  }
  for (const x of [-0.9, 0.9]) for (const z of [-0.66, 0.66]) o.rodas.push({ x, z, raio: 0.47 });
  return fechar(o, ehTaxi ? 'taxi' : 'civil', 1.8);
}

function taxiPlaca(o: Obra) {
  const placa = dadosCaixaArredondada(0.56, 0.24, 0.36, 0.11, 3);
  placa.transform(Matrix.Translation(-0.35, 2.17, 0));
  o.p.add(placa, '#fff7d6');
  const faixaPlaca = dadosCaixaArredondada(0.58, 0.07, 0.38, 0.03, 1);
  faixaPlaca.transform(Matrix.Translation(-0.35, 2.12, 0));
  o.p.add(faixaPlaca, '#24252c');
}

// ------------------------------------------------------------------ ônibus

function onibus(frente: Frente): ModeloRefinado {
  const AZUL = '#2f7fd8';
  const BRANCO = '#f7f5ef';
  const topo = curva([
    [-2.82, 3.8],
    [-2.45, 4.0],
    [2.45, 4.0],
    [2.86, 3.8],
  ]);
  const f: Forma = {
    x0: -2.82,
    x1: 2.86,
    baixo: chaoComArcos(0.32, [
      { x: -1.75, y: 0.12, r: 0.66 },
      { x: 1.75, y: 0.12, r: 0.66 },
    ]),
    pocos: [
      { x: -1.75, y: 0.52, r: 0.66, dentro: 0.6 },
      { x: 1.75, y: 0.52, r: 0.66, dentro: 0.6 },
    ],
    topo,
    meia: (_x, y) => 0.98 * (1 - 0.06 * suave(3.2, 4.0, y)),
    ponta: 7,
    n: 4.2,
  };
  const o: Obra = { f, p: new Pecas(), luzes: [], rodas: [] };
  // duas cores com a linha cortada na malha: azul embaixo, branco, a faixa azul entre os andares
  o.p.add(
    carroceria(
      f,
      40,
      [
        { ate: 1.32, passos: 4, cor: AZUL },
        { ate: 2.6, passos: 5, cor: BRANCO },
        { ate: 2.82, passos: 1, cor: AZUL },
        { ate: null, passos: 5, cor: BRANCO },
      ],
      [-2.5, -2.3, -1.0, -0.95, 0.95, 1.0, 2.3, 2.5],
    ),
  );
  const teto = () => 9;
  // janelas dos dois andares (a porta fica do lado direito, o da calçada)
  const colunas: [number, number][] = [
    [-2.4, -1.45],
    [-1.3, -0.35],
    [-0.2, 0.75],
    [0.9, 1.85],
  ];
  for (const [y0, y1] of [
    [1.62, 2.28],
    [3.08, 3.72],
  ])
    for (const [a, b] of colunas) {
      const temPorta = y0 < 2 && a > 0.5;
      janelaLado(o, a, b, y0, y1, 0.14, teto, VIDRO, temPorta ? [1] : [-1, 1], 5);
    }
  // a porta (do lado direito, z < 0), de vidro, com a moldura branca
  janelaLado(o, 1.0, 1.75, 0.5, 2.3, 0.12, teto, '#cfe8f5', [-1], 4);
  // para-brisas da frente (dois andares) e a janela de trás
  for (const [y0, y1, lado] of [
    [1.6, 2.36, 1],
    [3.05, 3.74, 1],
    [3.1, 3.66, -1],
  ]) {
    const d = decalque(
      f,
      { u0: -0.78, u1: 0.78, v0: y0, v1: y1, r: 0.16 },
      (u, v) => naPonta(f, v, u, lado),
      VIDRO_ESCURO,
      6,
      3,
    );
    if (d) o.p.add(d);
  }
  if (frente === 'cara') {
    for (const z of [-0.6, 0.6]) olho(o, 1.06, z, 0.23);
    boca(o, 0.74, 1.05, 0.14, 0.05);
    bochechas(o, 0.86, 0.86, 0.22, 0.14);
  } else
    frenteLimpa(o, 1.08, 0.66, 0.15, { y0: 0.7, y1: 1.0, z: 0.36 }, { y0: 0.42, y1: 0.58, z: 0.86 });
  for (const z of [-0.66, 0.66]) {
    const s = naPonta(f, 1.0, z, -1)!;
    o.luzes.push({ tipo: 'lanterna', pos: [s[0] + 0.03, 1.0, z], raio: [0.06, 0.12, 0.12] });
  }
  for (const x of [-1.75, 1.75]) for (const z of [-0.8, 0.8]) o.rodas.push({ x, z, raio: 0.52 });
  return fechar(o, 'onibusAzul', 3.5);
}

// ------------------------------------------------------------------ sorvete

function sorvete(frente: Frente): ModeloRefinado {
  const ROSA = '#ffd1e0';
  const ROSA_FORTE = '#ff9ec4';
  const topo = curva([
    [-1.72, 1.74],
    [-1.45, 1.94],
    [0.5, 1.94],
    [0.92, 1.36],
    [1.4, 1.26],
    [1.85, 1.08],
  ]);
  const f: Forma = {
    x0: -1.72,
    x1: 1.85,
    baixo: chaoComArcos(0.28, [
      { x: -1.05, y: 0.1, r: 0.55 },
      { x: 1.1, y: 0.1, r: 0.55 },
    ]),
    pocos: [
      { x: -1.05, y: 0.42, r: 0.55, dentro: 0.5 },
      { x: 1.1, y: 0.42, r: 0.55, dentro: 0.5 },
    ],
    topo,
    meia: (_x, y) => 0.85 * (1 - 0.1 * suave(1.4, 1.94, y)),
    ponta: 4.5,
    n: 3.2,
  };
  const o: Obra = { f, p: new Pecas(), luzes: [], rodas: [] };
  o.p.add(
    carroceria(f, 44, [
      { ate: 0.74, passos: 3, cor: ROSA_FORTE },
      { ate: null, passos: 11, cor: ROSA },
    ]),
  );
  // a cabine: para-brisa e janelinhas do motorista
  const d = decalque(
    f,
    { u0: 0.56, u1: 0.9, v0: -0.5, v1: 0.5, r: 0.1 },
    (u, v) => emCima(f, u, v),
    VIDRO_ESCURO,
    4,
    6,
  );
  if (d) o.p.add(d);
  janelaLado(o, 0.32, 0.86, 1.32, 1.82, 0.1, (x) => topo(x) - 0.12);
  // o balcão do sorvete (lado direito, o da calçada): a janelinha creme e o toldo listrado
  janelaLado(o, -1.25, 0.12, 1.02, 1.62, 0.12, () => 9, '#fff6e0', [-1], 6);
  const listras = 8;
  for (let k = 0; k < listras; k++) {
    const x0 = -1.38 + (k * 1.64) / listras;
    const x1 = x0 + 1.64 / listras;
    // um pedaço do toldo: sai da parede em 1,86 e desce para fora até 1,66, curvinho
    const P: number[] = [];
    const I: number[] = [];
    const nu = 2;
    const nv = 4;
    for (let j = 0; j <= nv; j++) {
      const v = j / nv;
      for (let i = 0; i <= nu; i++) {
        const x = x0 + ((x1 - x0) * i) / nu;
        const parede = noLado(f, x, 1.86, -1)!;
        const fora = 0.42 * v;
        const y = 1.86 - 0.22 * Math.sin((v * Math.PI) / 2) - 0.03 * Math.sin(((x - x0) / (x1 - x0)) * Math.PI);
        P.push(x, y, parede[2] - fora);
      }
    }
    for (let j = 0; j < nv; j++)
      for (let i = 0; i < nu; i++) {
        const a = j * (nu + 1) + i;
        const b = a + 1;
        const c = a + nu + 1;
        const dd = c + 1;
        // as duas faces (o toldo é fininho)
        I.push(a, b, c, b, dd, c, a, c, b, b, c, dd);
      }
    const N: number[] = [];
    VertexData.ComputeNormals(P, I, N);
    const vd = new VertexData();
    vd.positions = P;
    vd.indices = I;
    vd.normals = N;
    o.p.add(vd, k % 2 ? '#ffffff' : '#ff6fa8');
  }
  // a casquinha em cima, num pratinho, com duas bolas e a cereja
  const prato = CreateCylinderVertexData({ height: 0.1, diameter: 0.86, tessellation: 14 });
  prato.transform(Matrix.Translation(-0.4, 1.98, 0));
  o.p.add(prato, '#ffffff');
  const cone = CreateCylinderVertexData({
    height: 0.95,
    diameterTop: 0.66,
    diameterBottom: 0.06,
    tessellation: 12,
  });
  cone.transform(Matrix.Translation(-0.4, 2.5, 0));
  o.p.add(cone, '#e0a75e');
  bola(o.p, 0.36, '#ff9ec4', [-0.4, 3.04, 0], [1, 0.9, 1], 8);
  bola(o.p, 0.28, '#fff2c2', [-0.4, 3.42, 0], [1, 0.9, 1], 8);
  bola(o.p, 0.085, '#e8473f', [-0.4, 3.72, 0], [1, 1, 1], 4);
  if (frente === 'cara') {
    for (const z of [-0.42, 0.42]) olho(o, 0.98, z, 0.18);
    boca(o, 0.66, 0.66, 0.1, 0.04);
    bochechas(o, 0.74, 0.6, 0.18, 0.11);
  } else
    frenteLimpa(o, 0.96, 0.5, 0.12, { y0: 0.62, y1: 0.84, z: 0.28 }, { y0: 0.4, y1: 0.54, z: 0.66 });
  for (const z of [-0.5, 0.5]) {
    const s = naPonta(f, 1.0, z, -1)!;
    o.luzes.push({ tipo: 'lanterna', pos: [s[0] + 0.03, 1.0, z], raio: [0.05, 0.1, 0.1] });
  }
  for (const x of [-1.05, 1.1]) for (const z of [-0.7, 0.7]) o.rodas.push({ x, z, raio: 0.42 });
  return fechar(o, 'sorvete', 2.15);
}

const feitos = new Map<string, ModeloRefinado>();
export function modeloRefinado(tipo: TipoRefinado, frente: Frente = 'limpa'): ModeloRefinado {
  const k = `${tipo}|${frente}`;
  let m = feitos.get(k);
  if (!m) {
    m =
      tipo === 'taxi'
        ? taxi(frente)
        : tipo === 'civil'
          ? taxi(frente, '#3f7fe0', false)
          : tipo === 'onibusAzul'
            ? onibus(frente)
            : tipo === 'sorvete'
              ? sorvete(frente)
              : tipo === 'ambulancia'
                ? ambulancia()
                : bombeiros();
    feitos.set(k, m);
  }
  return m;
}

// ------------------------------------------------------------------ ambulância (014c)

/**
 * A ambulância de brinquedo: van branca (a forma do sorvete, sem a casquinha), faixa vermelha
 * dos lados, a cruz vermelha nas portas e no teto, a barra de luzinhas (vermelha e branca, piscam
 * macio). Nada de machucado nem susto: é o carrinho que cuida.
 */
function ambulancia(): ModeloRefinado {
  const BRANCO = '#f8f8fb';
  const VERMELHO = '#e8473f';
  const topo = curva([
    [-1.72, 1.76],
    [-1.45, 1.96],
    [0.5, 1.96],
    [0.92, 1.38],
    [1.4, 1.28],
    [1.85, 1.1],
  ]);
  const f: Forma = {
    x0: -1.72,
    x1: 1.85,
    baixo: chaoComArcos(0.28, [
      { x: -1.05, y: 0.1, r: 0.55 },
      { x: 1.1, y: 0.1, r: 0.55 },
    ]),
    pocos: [
      { x: -1.05, y: 0.42, r: 0.55, dentro: 0.5 },
      { x: 1.1, y: 0.42, r: 0.55, dentro: 0.5 },
    ],
    topo,
    meia: (_x, y) => 0.85 * (1 - 0.1 * suave(1.4, 1.96, y)),
    ponta: 4.5,
    n: 3.2,
  };
  const o: Obra = { f, p: new Pecas(), luzes: [], rodas: [] };
  // a faixa vermelha cortada na malha (linha limpa), o resto branco
  o.p.add(
    carroceria(f, 44, [
      { ate: 0.98, passos: 4, cor: BRANCO },
      { ate: 1.2, passos: 2, cor: VERMELHO },
      { ate: null, passos: 8, cor: BRANCO },
    ]),
  );
  const d = decalque(f, { u0: 0.56, u1: 0.9, v0: -0.5, v1: 0.5, r: 0.1 }, (u, v) => emCima(f, u, v), VIDRO_ESCURO, 4, 6);
  if (d) o.p.add(d);
  janelaLado(o, 0.32, 0.86, 1.36, 1.84, 0.1, (x) => topo(x) - 0.12);
  // janelinhas de trás (portas traseiras)
  for (const z of [-0.3, 0.3]) {
    const j = decalque(f, { u0: z - 0.22, u1: z + 0.22, v0: 1.32, v1: 1.72, r: 0.08 }, (u, v) => naPonta(f, v, u, -1), VIDRO, 3, 3);
    if (j) o.p.add(j);
  }
  // a cruz dos lados (duas barrinhas) e no teto
  for (const lado of [-1, 1])
    for (const [w, h] of [
      [0.4, 0.13],
      [0.13, 0.4],
    ]) {
      const c = decalque(
        f,
        { u0: -0.55 - w / 2, u1: -0.55 + w / 2, v0: 1.55 - h / 2, v1: 1.55 + h / 2, r: 0.02 },
        (u, v) => noLado(f, u, v, lado),
        VERMELHO,
        2,
        2,
        0.014,
      );
      if (c) o.p.add(c);
    }
  for (const [w, h] of [
    [0.5, 0.16],
    [0.16, 0.5],
  ]) {
    const c = decalque(f, { u0: -0.9 - w / 2, u1: -0.9 + w / 2, v0: -h / 2, v1: h / 2, r: 0.02 }, (u, v) => emCima(f, u, v), VERMELHO, 2, 2, 0.014);
    if (c) o.p.add(c);
  }
  giroflex(o, 0.32, topo(0.32) - 0.02, 0.9, ['lanterna', 'giroBranco', 'lanterna']);
  frenteLimpa(o, 0.98, 0.5, 0.12, { y0: 0.62, y1: 0.84, z: 0.28 }, { y0: 0.4, y1: 0.54, z: 0.66 });
  for (const z of [-0.5, 0.5]) {
    const s = naPonta(f, 1.0, z, -1)!;
    o.luzes.push({ tipo: 'lanterna', pos: [s[0] + 0.03, 1.0, z], raio: [0.05, 0.1, 0.1] });
  }
  for (const x of [-1.05, 1.1]) for (const z of [-0.7, 0.7]) o.rodas.push({ x, z, raio: 0.42 });
  return fechar(o, 'sorvete', 2.15);
}

// ------------------------------------------------------------------ bombeiros (014c)

/**
 * O caminhão de bombeiros de brinquedo, do tamanho do ônibus (as medidas e as curvas do ônibus
 * da opção C, só curvas à direita): vermelho, cabine curta na frente, as portinhas dos
 * compartimentos dos lados, a faixa branca, a escada em cima e a barra de luzinhas. Nada de fogo
 * nem perigo: é o caminhão que ajuda (a escada que alcança o gatinho na árvore).
 */
function bombeiros(): ModeloRefinado {
  const VERMELHO = '#e2392f';
  const BRANCO = '#f7f5ef';
  // cabine na frente (mais alta), a caixa dos equipamentos atrás, mais baixa, com a escada
  const topo = curva([
    [-2.82, 2.2],
    [-2.6, 2.36],
    [1.0, 2.36],
    [1.45, 2.95],
    [2.35, 2.95],
    [2.86, 2.6],
  ]);
  const f: Forma = {
    x0: -2.82,
    x1: 2.86,
    baixo: chaoComArcos(0.32, [
      { x: -1.75, y: 0.12, r: 0.66 },
      { x: 1.75, y: 0.12, r: 0.66 },
    ]),
    pocos: [
      { x: -1.75, y: 0.52, r: 0.66, dentro: 0.6 },
      { x: 1.75, y: 0.52, r: 0.66, dentro: 0.6 },
    ],
    topo,
    meia: (_x, y) => 0.98 * (1 - 0.06 * suave(2.2, 2.95, y)),
    ponta: 6,
    n: 4,
  };
  const o: Obra = { f, p: new Pecas(), luzes: [], rodas: [] };
  o.p.add(
    carroceria(
      f,
      40,
      [
        { ate: 1.18, passos: 4, cor: VERMELHO },
        { ate: 1.34, passos: 1, cor: BRANCO },
        { ate: null, passos: 9, cor: VERMELHO },
      ],
      [-2.5, -2.3, -1.0, -0.95, 0.95, 1.0, 2.3, 2.5],
    ),
  );
  // cabine: para-brisa e janelas
  const pb = decalque(f, { u0: -0.82, u1: 0.82, v0: 1.95, v1: 2.72, r: 0.16 }, (u, v) => naPonta(f, v, u, 1), VIDRO_ESCURO, 6, 3);
  if (pb) o.p.add(pb);
  janelaLado(o, 1.55, 2.35, 1.95, 2.7, 0.12, () => 9, VIDRO, [-1, 1], 4);
  // portinhas dos compartimentos (cinza claro, como as de enrolar)
  for (const [a, b] of [
    [-2.45, -1.55],
    [-1.4, -0.5],
    [-0.35, 0.55],
  ])
    for (const [y0, y1] of [
      [1.42, 2.18],
    ])
      janelaLado(o, a, b, y0, y1, 0.08, () => 9, '#d9dce3', [-1, 1], 3);
  // a escada em cima: dois trilhos e os degraus (prata), deitada no teto da caixa
  const yEsc = topo(-0.8) + 0.08;
  for (const z of [-0.36, 0.36]) {
    const trilho = dadosCaixaArredondada(4.2, 0.09, 0.09, 0.04, 2);
    trilho.transform(Matrix.Translation(-0.75, yEsc + 0.06, z));
    o.p.add(trilho, '#dfe3ea');
  }
  for (let k = 0; k < 11; k++) {
    const degrau = CreateCylinderVertexData({ height: 0.72, diameter: 0.05, tessellation: 6 });
    degrau.transform(Matrix.RotationX(Math.PI / 2).multiply(Matrix.Translation(-2.7 + k * 0.39, yEsc + 0.06, 0)));
    o.p.add(degrau, '#c9ced8');
  }
  // apoios da escada
  for (const x of [-2.4, 0.9]) {
    const apoio = dadosCaixaArredondada(0.16, 0.12, 0.8, 0.04, 2);
    apoio.transform(Matrix.Translation(x, yEsc - 0.02, 0));
    o.p.add(apoio, '#9aa0ab');
  }
  giroflex(o, 1.85, topo(1.85) - 0.02, 1.1, ['lanterna', 'giroBranco', 'lanterna']);
  frenteLimpa(o, 1.05, 0.68, 0.15, { y0: 0.66, y1: 1.02, z: 0.42 }, { y0: 0.4, y1: 0.56, z: 0.88 });
  for (const z of [-0.66, 0.66]) {
    const s = naPonta(f, 1.0, z, -1)!;
    o.luzes.push({ tipo: 'lanterna', pos: [s[0] + 0.03, 1.0, z], raio: [0.06, 0.12, 0.12] });
  }
  for (const x of [-1.75, 1.75]) for (const z of [-0.8, 0.8]) o.rodas.push({ x, z, raio: 0.52 });
  return fechar(o, 'onibusAzul', 3.5);
}

/**
 * A roda refinada (raio 1, eixo z): pneu gordinho e bem redondo, a calota abaulada branca e
 * o parafusinho rosa fora do meio (dá para ver girar).
 */
export function dadosRodaRefinada(): VertexData {
  const esp = 0.6;
  const partes = new Pecas();
  const deitar = Matrix.RotationX(Math.PI / 2);
  const pneu = dadosAnel(2 - esp, esp, 0, 18, 8);
  pneu.transform(Matrix.Scaling(1, 1.15, 1).multiply(deitar));
  partes.add(pneu, '#2a2b33');
  const miolo = CreateCylinderVertexData({ height: esp * 0.95, diameter: (2 - esp) * 1.02, tessellation: 14 });
  miolo.transform(deitar);
  partes.add(miolo, '#34353e');
  for (const lado of [-1, 1]) {
    const calota = CreateSphereVertexData({ diameter: 1.0, segments: 6 });
    calota.transform(Matrix.Scaling(1, 1, 0.32).multiply(Matrix.Translation(0, 0, lado * esp * 0.42)));
    partes.add(calota, '#eef0f4');
    const parafuso = CreateSphereVertexData({ diameter: 0.18, segments: 3 });
    parafuso.transform(Matrix.Translation(0.24, 0.1, lado * esp * 0.58));
    partes.add(parafuso, '#ff6fa8');
  }
  return partes.juntar();
}

/** Cor do triângulo (testes): quantas cores diferentes a carroceria tem. */
export function coresDe(vd: VertexData): number {
  const c = vd.colors!;
  const s = new Set<string>();
  for (let i = 0; i < c.length; i += 4) s.add(`${c[i].toFixed(3)},${c[i + 1].toFixed(3)},${c[i + 2].toFixed(3)}`);
  return s.size;
}
void Color3;
