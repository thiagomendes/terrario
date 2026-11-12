/**
 * Os modelos dos veículos da cidade (spec 014, T14): a família da versão 3 do esboço aprovado
 * (`src/esboco/veiculos.ts`, "com carinha"), agora em poucas malhas. Cada veículo vira:
 * - **carroceria**: todas as peças de plástico fundidas numa malha só, com a cor em cada
 *   vértice (material `corVertice`, desenhado igual ao das cores do esboço);
 * - **rodas**: um pneu redondo com calota, desenhado uma vez e repetido por instâncias;
 * - **luzes**: os olhinhos (faróis), as lanternas e o giroflex da polícia, uma esfera por
 *   instância com a cor de cada uma (acendem de noite).
 * Mais uma versão simples (uns 100 triângulos, com as rodas e os olhos) para longe.
 *
 * Eixos do modelo como no esboço: x para a frente, y para cima, z para a esquerda; o chão em
 * y = 0. Tudo já sai na escala do jogo (`MEDIDAS[...].escala`). A porta do ônibus e a janelinha
 * do sorvete ficam do lado direito (o da calçada).
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { CreateSphereVertexData } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { CreateCylinderVertexData } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { dadosAnel, dadosCaixaArredondada, dadosPlaca } from './formas';
import { MEDIDAS, MODELO_DO_TIPO, type TipoVeiculo } from '../jogo/veiculos';

export type TipoLuz = 'farol' | 'lanterna' | 'giroAzul' | 'giroBranco';

/** Uma luz (esfera achatada): centro, semieixos e de que tipo é. */
export interface Luz {
  tipo: TipoLuz;
  pos: [number, number, number];
  raio: [number, number, number];
}

export interface Roda {
  x: number;
  z: number;
  raio: number;
}

export interface ModeloVeiculo {
  corpo: VertexData;
  /** As peças que mexem (a porta do ônibus): vértices de `ini` a `fim` (exclusivo). */
  porta?: { ini: number; fim: number };
  luzes: Luz[];
  rodas: Roda[];
  simples: VertexData;
  triangulos: number;
}

const VIDRO = '#a6dcf3';
const CROMO = '#dfe3ea';
const BOCHECHA = '#ff9aa8';

/** Junta peças (cada uma com a sua cor e posição) numa malha só. */
class Montador {
  private partes: VertexData[] = [];
  private vertices = 0;
  constructor(private readonly escala: number) {}

  private por(
    vd: VertexData,
    cor: string,
    pos: [number, number, number],
    esc: [number, number, number] = [1, 1, 1],
    rot: [number, number, number] = [0, 0, 0],
  ): void {
    vd.uvs = null;
    const n = vd.positions!.length / 3;
    const [r, g, b] = Color3.FromHexString(cor).asArray();
    const cores = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) cores.set([r, g, b, 1], i * 4);
    vd.colors = cores;
    const e = this.escala;
    const m = Matrix.Compose(
      new Vector3(esc[0], esc[1], esc[2]),
      Quaternion.RotationYawPitchRoll(rot[1], rot[0], rot[2]),
      Vector3.Zero(),
    ).multiply(
      Matrix.Compose(
        new Vector3(e, e, e),
        Quaternion.Identity(),
        new Vector3(pos[0] * e, pos[1] * e, pos[2] * e),
      ),
    );
    vd.transform(m);
    this.partes.push(vd);
    this.vertices += n;
  }

  get marca(): number {
    return this.vertices;
  }

  caixa(
    w: number,
    h: number,
    d: number,
    r: number,
    cor: string,
    x: number,
    y: number,
    z: number,
    seg = 3,
    rot?: [number, number, number],
  ): void {
    const raio = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
    this.por(dadosCaixaArredondada(w, h, d, raio, seg), cor, [x, y, z], [1, 1, 1], rot);
  }

  bola(
    r: number,
    cor: string,
    x: number,
    y: number,
    z: number,
    esc: [number, number, number] = [1, 1, 1],
    seg = 5,
    rot?: [number, number, number],
  ): void {
    this.por(CreateSphereVertexData({ diameter: 2 * r, segments: seg }), cor, [x, y, z], esc, rot);
  }

  cone(
    h: number,
    rCima: number,
    rBaixo: number,
    cor: string,
    x: number,
    y: number,
    z: number,
  ): void {
    this.por(
      CreateCylinderVertexData({
        height: h,
        diameterTop: 2 * rCima,
        diameterBottom: 2 * rBaixo,
        tessellation: 10,
      }),
      cor,
      [x, y, z],
    );
  }

  /** Estrela de 5 pontas deitada na porta (a normal para o lado `lado`). */
  estrela(r: number, cor: string, x: number, y: number, z: number): void {
    const p: [number, number][] = [];
    for (let k = 0; k < 10; k++) {
      const a = Math.PI / 2 + (k * Math.PI) / 5;
      const rr = k % 2 ? r * 0.45 : r;
      p.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    this.por(dadosPlaca(p, 0.04), cor, [x, y, z]);
  }

  /** Sorriso cromado: pedacinhos de caixa ao longo do arco (como o tubinho do esboço). */
  sorriso(x: number, y: number, larg: number, cor = CROMO): void {
    const pts: [number, number][] = [];
    const n = 6;
    for (let i = 0; i <= n; i++) {
      const t = -1 + (2 * i) / n;
      pts.push([t * larg * 0.5, y - (1 - t * t) * larg * 0.28]);
    }
    for (let i = 0; i < n; i++) {
      const [z0, y0] = pts[i];
      const [z1, y1] = pts[i + 1];
      const l = Math.hypot(z1 - z0, y1 - y0);
      const ang = Math.atan2(y1 - y0, z1 - z0);
      // caixa comprida em z, girada em x para seguir o arco
      this.caixa(0.09, 0.09, l + 0.06, 0.04, cor, x, (y0 + y1) / 2, (z0 + z1) / 2, 1, [-ang, 0, 0]);
    }
  }

  pronto(): VertexData {
    const [a, ...resto] = this.partes;
    return resto.length ? a.merge(resto, true) : a;
  }
}

const triangulos = (vd: VertexData) => vd.indices!.length / 3;

interface Construcao {
  m: Montador;
  luzes: Luz[];
  rodas: Roda[];
  porta?: { ini: number; fim: number };
  e: number;
}

/** Olhinho: o branco é luz (farol), a pupila e o brilho vão na carroceria. */
function olho(c: Construcao, x: number, y: number, z: number, r: number): void {
  const e = c.e;
  c.luzes.push({ tipo: 'farol', pos: [x * e, y * e, z * e], raio: [r * 0.6 * e, r * e, r * e] });
  c.m.bola(r * 0.45, '#2a2a3a', x + r * 0.42, y - r * 0.05, z, [0.5, 1, 1], 4);
  c.m.bola(r * 0.16, '#ffffff', x + r * 0.55, y + r * 0.22, z + r * 0.12, [0.5, 1, 1], 2);
}
function lanterna(c: Construcao, x: number, y: number, z: number, r: number): void {
  const e = c.e;
  c.luzes.push({ tipo: 'lanterna', pos: [x * e, y * e, z * e], raio: [r * 0.5 * e, r * e, r * e] });
}
function roda(c: Construcao, x: number, z: number, r: number): void {
  c.rodas.push({ x: x * c.e, z: z * c.e, raio: r * c.e });
}

/** Janelas numa cúpula de elipsoide: laterais, para-brisa e traseira. */
function janelasDeCupula(m: Montador, cx: number, cy: number, e: [number, number, number]): void {
  const [a, b, c] = e;
  const y = cy + b * 0.32;
  const f = Math.sqrt(1 - 0.32 * 0.32);
  for (const lado of [-1, 1])
    m.bola(1, VIDRO, cx - a * 0.08, y, lado * c * f * 0.97, [a * 0.36, b * 0.3, 0.05], 4);
  m.bola(1, VIDRO, cx + a * f * 0.95, y, 0, [0.05, b * 0.32, c * 0.55], 4, [0, 0, -0.55]);
  m.bola(1, VIDRO, cx - a * f * 0.95, y, 0, [0.05, b * 0.28, c * 0.45], 4, [0, 0, 0.55]);
}

function carro(c: Construcao, tipo: 'taxi' | 'policia' | 'civil', cor: string): void {
  const { m } = c;
  // a polícia preta e branca (decisão do dono): carroceria preta, cabine branca
  const corpo = tipo === 'taxi' ? '#ffc21a' : tipo === 'policia' ? '#2b2d35' : cor;
  const cabine = tipo === 'policia' ? '#f7f8fb' : corpo;
  m.caixa(2.8, 0.86, 1.62, 0.42, corpo, 0, 0.84, 0, 4);
  m.bola(1.0, cabine, -0.25, 1.42, 0, [0.95, 0.62, 0.75], 8);
  janelasDeCupula(m, -0.25, 1.42, [0.95, 0.62, 0.75]);
  for (const z of [-0.45, 0.45]) olho(c, 1.38, 1.02, z, 0.2);
  m.sorriso(1.42, 0.66, 0.9);
  for (const z of [-0.62, 0.62]) m.bola(0.12, BOCHECHA, 1.32, 0.78, z * 1.18, [0.4, 0.7, 1], 4);
  for (const z of [-0.5, 0.5]) lanterna(c, -1.42, 0.92, z, 0.11);
  if (tipo === 'taxi') {
    m.caixa(0.55, 0.24, 0.32, 0.12, '#fff7d6', -0.25, 2.02, 0, 2);
    for (const lado of [-1, 1])
      for (let k = 0; k < 6; k++)
        m.caixa(
          0.2,
          0.13,
          0.05,
          0.02,
          k % 2 ? '#1f2026' : '#f6f4ee',
          -0.6 + k * 0.24,
          1.02,
          lado * 0.8,
          1,
        );
  }
  if (tipo === 'policia') {
    // faixa branca e estrelinha amarela na porta; giroflex macio em cima (nada de bravo)
    m.caixa(2.84, 0.2, 1.64, 0.1, '#f7f8fb', 0, 0.98, 0, 2);
    for (const lado of [-1, 1]) m.estrela(0.17, '#ffd23f', -0.15, 0.74, lado * 0.81);
    m.caixa(0.8, 0.12, 0.42, 0.06, '#f7f8fb', -0.25, 2.03, 0, 2);
    const e = c.e;
    c.luzes.push({
      tipo: 'giroAzul',
      pos: [-0.42 * e, 2.16 * e, 0],
      raio: [0.15 * e, 0.1 * e, 0.18 * e],
    });
    c.luzes.push({
      tipo: 'giroBranco',
      pos: [-0.08 * e, 2.16 * e, 0],
      raio: [0.15 * e, 0.1 * e, 0.18 * e],
    });
  }
  for (const x of [-0.9, 0.9]) for (const z of [-0.66, 0.66]) roda(c, x, z, 0.47);
}

/** Ônibus azul e branco (da versão 1, faixa longa de janelas) com a carinha da versão 3. */
function onibusAzul(c: Construcao): void {
  const { m } = c;
  m.caixa(5.4, 0.92, 1.95, 0.42, '#2f7fd8', 0, 0.9, 0, 4);
  m.caixa(5.3, 1.0, 1.82, 0.44, '#f7f5ef', 0, 1.82, 0, 4);
  m.caixa(4.3, 0.56, 1.98, 0.22, VIDRO, -0.35, 1.86, 0, 3);
  for (let k = 0; k < 3; k++)
    m.caixa(0.12, 0.6, 1.98, 0.05, '#f7f5ef', -1.4 + k * 1.05, 1.86, 0, 1);
  m.caixa(0.22, 0.6, 1.5, 0.12, VIDRO, 2.6, 1.9, 0, 2);
  m.caixa(4.9, 0.26, 1.7, 0.13, '#f7f5ef', 0, 2.42, 0, 3);
  const ini = m.marca;
  m.caixa(0.72, 1.32, 0.06, 0.05, '#cfe8f5', 1.7, 1.25, -0.97, 1);
  c.porta = { ini, fim: m.marca };
  for (const z of [-0.58, 0.58]) olho(c, 2.68, 1.08, z, 0.22);
  m.sorriso(2.73, 0.66, 1.1);
  for (const z of [-0.85, 0.85]) m.bola(0.13, BOCHECHA, 2.62, 0.82, z, [0.4, 0.7, 1], 4);
  for (const z of [-0.62, 0.62]) lanterna(c, -2.72, 0.98, z, 0.12);
  for (const x of [-1.75, 1.75]) for (const z of [-0.8, 0.8]) roda(c, x, z, 0.52);
}

/** Ônibus verde (versão 3). */
function onibusVerde(c: Construcao): void {
  const { m } = c;
  m.caixa(5.2, 0.95, 1.95, 0.46, '#45b56b', 0, 0.92, 0, 4);
  m.caixa(5.1, 1.05, 1.88, 0.5, '#f7f5ef', 0, 1.85, 0, 4);
  for (let k = 0; k < 4; k++) m.caixa(0.82, 0.6, 1.98, 0.28, VIDRO, -1.85 + k * 1.0, 1.9, 0, 2);
  m.bola(0.55, VIDRO, 2.35, 1.92, 0, [0.4, 0.7, 1.45], 6);
  for (const z of [-0.6, 0.6]) olho(c, 2.58, 1.05, z, 0.22);
  m.sorriso(2.62, 0.68, 1.1);
  const ini = m.marca;
  m.caixa(0.72, 1.3, 0.06, 0.05, '#cfe8f5', 1.55, 1.26, -0.97, 1);
  c.porta = { ini, fim: m.marca };
  for (const z of [-0.6, 0.6]) lanterna(c, -2.6, 1.0, z, 0.12);
  for (const x of [-1.7, 1.7]) for (const z of [-0.8, 0.8]) roda(c, x, z, 0.52);
}

/** O carrinho de sorvete: casquinha em cima, toldo listrado e a janelinha do lado da calçada. */
function sorvete(c: Construcao): void {
  const { m } = c;
  m.caixa(3.4, 1.5, 1.7, 0.5, '#ffd1e0', 0, 1.15, 0, 4);
  m.caixa(1.0, 0.8, 1.6, 0.38, '#ffffff', 1.25, 0.85, 0, 3);
  m.caixa(0.5, 0.5, 1.5, 0.22, VIDRO, 1.45, 1.42, 0, 2);
  m.caixa(1.5, 0.7, 0.06, 0.1, '#fff6e0', -0.3, 1.35, -0.85, 1);
  for (let k = 0; k < 6; k++)
    m.caixa(
      0.3,
      0.2,
      1.7,
      0.08,
      k % 2 ? '#ffffff' : '#ff6fa8',
      -1.2 + k * 0.32,
      2.0,
      0,
      1,
      [0, 0, 0.1],
    );
  m.cone(0.9, 0.31, 0.03, '#e0a75e', -0.4, 2.5, 0);
  m.bola(0.34, '#ff9ec4', -0.4, 3.05, 0, [1, 0.9, 1], 6);
  m.bola(0.27, '#fff2c2', -0.4, 3.42, 0, [1, 0.9, 1], 6);
  m.bola(0.08, '#e8473f', -0.4, 3.72, 0, [1, 1, 1], 3);
  for (const z of [-0.45, 0.45]) olho(c, 1.73, 1.0, z, 0.17);
  m.sorriso(1.77, 0.65, 0.7);
  for (const z of [-0.5, 0.5]) lanterna(c, -1.72, 0.92, z, 0.1);
  for (const x of [-1.05, 1.1]) for (const z of [-0.7, 0.7]) roda(c, x, z, 0.42);
}

/** A versão de longe: caixas lisas com as cores do modelo, rodas e olhos. */
function simples(tipo: TipoVeiculo, cor: string, e: number): VertexData {
  const m = new Montador(e);
  const preto = '#24252c';
  const carros = tipo === 'taxi' || tipo === 'civil' || tipo === 'policia';
  if (carros) {
    const c = tipo === 'taxi' ? '#ffc21a' : tipo === 'policia' ? '#2b2d35' : cor;
    m.caixa(2.8, 0.86, 1.62, 0.2, c, 0, 0.84, 0, 1);
    m.caixa(1.7, 0.6, 1.4, 0.2, tipo === 'policia' ? '#f7f8fb' : c, -0.25, 1.55, 0, 1);
    for (const x of [-0.9, 0.9]) m.caixa(0.8, 0.8, 1.5, 0.1, preto, x, 0.47, 0, 1);
    for (const z of [-0.45, 0.45]) m.caixa(0.1, 0.3, 0.3, 0.05, '#fffbe8', 1.42, 1.02, z, 1);
  } else if (tipo === 'sorvete') {
    m.caixa(3.4, 1.5, 1.7, 0.2, '#ffd1e0', 0, 1.15, 0, 1);
    m.caixa(1.0, 0.8, 1.6, 0.2, '#ffffff', 1.25, 0.85, 0, 1);
    m.caixa(1.9, 0.2, 1.7, 0.05, '#ff6fa8', -0.4, 2.0, 0, 1);
    m.caixa(0.6, 0.9, 0.6, 0.2, '#ff9ec4', -0.4, 2.8, 0, 1);
    for (const x of [-1.05, 1.1]) m.caixa(0.8, 0.8, 1.4, 0.1, preto, x, 0.42, 0, 1);
  } else {
    const c = tipo === 'onibusAzul' ? '#2f7fd8' : '#45b56b';
    m.caixa(5.3, 0.92, 1.95, 0.2, c, 0, 0.9, 0, 1);
    m.caixa(5.2, 1.0, 1.85, 0.2, '#f7f5ef', 0, 1.82, 0, 1);
    m.caixa(4.3, 0.5, 1.9, 0.1, VIDRO, -0.3, 1.86, 0, 1);
    for (const x of [-1.75, 1.75]) m.caixa(1.0, 1.0, 1.7, 0.1, preto, x, 0.52, 0, 1);
  }
  return m.pronto();
}

const guardados = new Map<string, ModeloVeiculo>();

/** O modelo do veículo (feito uma vez por tipo e cor; quem usa copia os dados). */
export function modeloDoVeiculo(tipo: TipoVeiculo, cor = '#ff7a6b'): ModeloVeiculo {
  const k = `${tipo}|${cor}`;
  let r = guardados.get(k);
  if (r) return r;
  const e = MEDIDAS[MODELO_DO_TIPO[tipo]].escala;
  const c: Construcao = { m: new Montador(e), luzes: [], rodas: [], e };
  if (tipo === 'taxi' || tipo === 'civil' || tipo === 'policia') carro(c, tipo, cor);
  else if (tipo === 'onibusAzul') onibusAzul(c);
  else if (tipo === 'onibusVerde') onibusVerde(c);
  else sorvete(c);
  const corpo = c.m.pronto();
  r = {
    corpo,
    porta: c.porta,
    luzes: c.luzes,
    rodas: c.rodas,
    simples: simples(tipo, cor, e),
    triangulos: triangulos(corpo),
  };
  guardados.set(k, r);
  return r;
}

/**
 * A roda de raio 1 (escala pela instância): pneu redondo (anel gordo), miolo, as duas calotas e
 * um parafusinho fora do centro de cada lado (para ver a roda girar). O eixo é z.
 */
export function dadosRoda(): VertexData {
  const m = new Montador(1);
  const esp = 0.62;
  const pneu = dadosAnel(2 - esp, esp, 0, 12, 5);
  // o anel deita no plano xz: gira para o plano xy (eixo z) e engorda um pouco de lado
  const partes: VertexData[] = [];
  const pinta = (vd: VertexData, cor: string, mat: Matrix) => {
    vd.uvs = null;
    const n = vd.positions!.length / 3;
    const [r, g, b] = Color3.FromHexString(cor).asArray();
    const cores = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) cores.set([r, g, b, 1], i * 4);
    vd.colors = cores;
    vd.transform(mat);
    partes.push(vd);
  };
  const deitar = Matrix.RotationX(Math.PI / 2);
  pinta(pneu, '#24252c', Matrix.Scaling(1, 1.1, 1).multiply(deitar));
  pinta(
    CreateCylinderVertexData({ height: esp * 0.9, diameter: (2 - esp) * 1.02, tessellation: 10 }),
    '#2f3038',
    deitar,
  );
  for (const lado of [-1, 1]) {
    // calota: um disco abaulado de cada lado, e um parafusinho fora do meio (a roda gira)
    pinta(
      CreateCylinderVertexData({
        height: 0.14,
        diameterTop: 0.62,
        diameterBottom: 0.84,
        tessellation: 10,
      }),
      '#d9dde3',
      Matrix.RotationX((lado * Math.PI) / 2).multiply(Matrix.Translation(0, 0, lado * esp * 0.5)),
    );
    const parafuso = dadosCaixaArredondada(0.16, 0.16, 0.08, 0.02, 1);
    pinta(parafuso, '#ff6fa8', Matrix.Translation(0.2, 0.1, lado * esp * 0.6));
  }
  void m;
  const [a, ...resto] = partes;
  return a.merge(resto, true);
}
