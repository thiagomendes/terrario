/**
 * Esboço da spec 027 (Noite das Fantasias), parte 3: os dois "além dos cubos" que mais pesam na
 * decisão do dono, num roteiro (a física de verdade fica para a spec):
 *
 * - **A vassoura-patinete** (dono, 20 nov): o cabo de madeira em pé é o guidão (pegadores
 *   roxos), a palha de vassoura deitada é o deque curto onde vai um pé, a ponta da palha abre
 *   atrás, as rodinhas ficam escondidas debaixo da palha (só um friso escuro aparece) e ela anda
 *   rente ao chão, sem voar, deixando um rastro de estrelinhas douradas e lilases. Quem anda é
 *   uma criança de bruxinha, com o boneco de verdade do jogo: um pé no deque, o outro levantado
 *   atrás (dando impulso) e as mãos no guidão. Passa pela Rua das Casinhas Tortas.
 * - **O Trem das Risadas** (dono, 20 nov): ao ar livre, num trilho em volta do gramado ao sul da
 *   praça, com um túnel curto e claro (arcos de tábuas roxas e laranja, aberto, com lanterninhas
 *   acesas dentro) onde fantasminhas sorridentes aparecem nas janelinhas e acenam. A locomotiva
 *   é uma abóbora de brinquedo (a do jogo, com a carinha acesa) com chaminezinha e fumacinha
 *   clara; atrás, três vagõezinhos abertos (roxo, laranja e musgo) com bancos e três bonecos
 *   de verdade sentados, de braços para cima no "uiii".
 *
 * Tudo PROVISÓRIO (o palco do esboço): na implementação, viram brinquedos do tema.
 */
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh';
import '@babylonjs/core/Meshes/instancedMesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { CreateCylinderVertexData } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateSphereVertexData } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import type { PecaCriatura } from '../temas/tipos';
import { bicho } from '../temas/rancho-alegre/criaturas';
import { aparenciaPadrao, type Aparencia, type ModeloId } from '../personagem/aparencia';
import { ajeitarCabeloDebaixo, type PlanoBoneco } from '../personagem/boneco';
import { perfilEstrela } from '../personagem/bonecoFantasia';
import { aplicarJuntas, type Juntas } from '../personagem/gestos';
import type { Pose } from '../personagem/poses';
import { criarBoneco } from '../render/boneco';
import type { Personagem } from '../render/personagem';
import { dadosAnel, dadosPlaca, type Plasticos } from '../render/formas';
import { modeloDeBloco } from '../render/blocosBrinquedo';
import { caixa as caixaSolida, Pecas } from '../render/solidos';
import { dadosRoda } from '../render/veiculosModelos';
import { Bloco } from '../world/blocks';
import {
  COR,
  alfaiate,
  emPe,
  medir,
  noDaJunta,
  pintarRoupa,
  roupaLisa,
  sombrinha,
  vestirBento,
  type CtxPalco,
} from './fantasiasGente';
import { montarBicho, type Bicho } from './fantasiasBichos';

type V3 = [number, number, number];

/** O que o palco dá aos passeios (o de sempre e o plástico das peças). */
export interface CtxPasseios extends CtxPalco {
  pl: Plasticos;
}

// ------------------------------------------------------------------ o trilho (conta pura)

/**
 * O trilho do trem (local ao palco): um oval de duas retas e duas curvas no gramado ao sul da
 * praça. A reta de cima (z = cz − R) corre para +x, a de baixo (z = cz + R, a do túnel) para −x.
 */
export const TRILHO = { cx: 53.5, cz: 67, Lh: 12, R: 7 } as const;
const { cx: TCX, cz: TCZ, Lh: TLH, R: TR } = TRILHO;
export const VOLTA = 4 * TLH + 2 * Math.PI * TR;
/** O túnel: na reta de baixo, de x = cx − 3,5 a cx + 3,5. */
export const TUNEL = { x0: TCX - 3.5, x1: TCX + 3.5, z: TCZ + TR } as const;

/** O ponto do trilho (local) na distância s e a direção para onde o trem anda ali. */
export function pontoDoTrilho(s: number): { x: number; z: number; dx: number; dz: number } {
  const L1 = 2 * TLH;
  const L2 = L1 + Math.PI * TR;
  const L3 = L2 + 2 * TLH;
  const u = ((s % VOLTA) + VOLTA) % VOLTA;
  if (u < L1) return { x: TCX - TLH + u, z: TCZ - TR, dx: 1, dz: 0 };
  if (u < L2) {
    const f = (u - L1) / TR;
    return { x: TCX + TLH + TR * Math.sin(f), z: TCZ - TR * Math.cos(f), dx: Math.cos(f), dz: Math.sin(f) };
  }
  if (u < L3) return { x: TCX + TLH - (u - L2), z: TCZ + TR, dx: -1, dz: 0 };
  const f = (u - L3) / TR;
  return { x: TCX - TLH - TR * Math.sin(f), z: TCZ + TR * Math.cos(f), dx: -Math.cos(f), dz: -Math.sin(f) };
}

/** A distância (no chão) de um ponto local até o meio do trilho. */
export function distanciaAoTrilho(x: number, z: number): number {
  const ax = Math.abs(x - TCX);
  if (ax <= TLH) return Math.abs(Math.abs(z - TCZ) - TR);
  return Math.abs(Math.hypot(ax - TLH, z - TCZ) - TR);
}

/** Onde a vassoura-patinete passa (local): a rua, de oeste para leste, num S bem leve. */
const RUA = { x0: 8.5, z: 25.25, v: 4.1 } as const;
function pontoDaVassoura(t: number): { x: number; z: number; dx: number; dz: number } {
  const x = RUA.x0 + RUA.v * t;
  const z = RUA.z + 0.3 * Math.sin(x / 3.2);
  const dz = (0.3 / 3.2) * Math.cos(x / 3.2);
  const l = Math.hypot(1, dz);
  return { x, z, dx: 1 / l, dz: dz / l };
}

/** A velocidade do trem (blocos por segundo). */
export const V_TREM = 3.5;

// ------------------------------------------------------------------ o kit de peças

/** Giro (x, y, z) e lugar de uma peça, no jeito das peças do boneco. */
const mat = (c: V3, rot: V3 = [0, 0, 0], esc: V3 = [1, 1, 1]) =>
  Matrix.Compose(
    new Vector3(...esc),
    Quaternion.RotationYawPitchRoll(rot[1], rot[0], rot[2]),
    new Vector3(...c),
  );

/** Um punhado de peças de brinquedo (caixas de quina redonda, cilindros e bolas) numa malha. */
class Kit {
  readonly p = new Pecas();
  caixa(t: V3, c: V3, cor: string, b = 0.03, rot?: V3) {
    const [w, h, d] = t;
    const vd = caixaSolida(-w / 2, w / 2, -h / 2, h / 2, -d / 2, d / 2, Math.min(b, w / 3, h / 3), Math.min(b, d / 3), cor, 1);
    vd.transform(mat(c, rot));
    this.p.add(vd);
  }
  cil(h: number, rb: number, rt: number, c: V3, cor: string, rot?: V3, lados = 14) {
    const vd = CreateCylinderVertexData({ height: h, diameterBottom: rb * 2, diameterTop: rt * 2, tessellation: lados });
    vd.transform(mat(c, rot));
    this.p.add(vd, cor);
  }
  bola(r: number, c: V3, cor: string, esc: V3 = [1, 1, 1], rot?: V3, seg = 10) {
    const vd = CreateSphereVertexData({ diameter: r * 2, segments: seg });
    vd.transform(mat(c, rot, esc));
    this.p.add(vd, cor);
  }
  anel(diam: number, esp: number, c: V3, cor: string, rot?: V3) {
    const vd = dadosAnel(diam, esp);
    vd.transform(mat(c, rot));
    this.p.add(vd, cor);
  }
  placa(perfil: Array<[number, number]>, esp: number, c: V3, cor: string, rot?: V3) {
    const vd = dadosPlaca(perfil, esp);
    vd.uvs = null;
    vd.transform(mat(c, rot));
    this.p.add(vd, cor);
  }
  dados(vd: VertexData, m: Matrix, cor?: string) {
    vd.transform(m);
    this.p.add(vd, cor);
  }
  get vazio() {
    return this.p.partes.length === 0;
  }
}

// ------------------------------------------------------------------ as fantasias das crianças

/** O chapéu de bruxinha (aba mole e ponta caída, como o da Vovó, menor) com a estrelinha. */
function chapeuBruxinha(p: PlanoBoneco, cor: string, fita: string) {
  const m = medir(p);
  const a = alfaiate(p.pecas);
  const { baseChapeu, zRosto } = m;
  a.cilindro('chapeu-aba', 'cabeca', 0.045, 0.6, 0.53, [0, baseChapeu + 0.07, 0], cor, { rot: [0.06, 0, -0.04] });
  a.cilindro('chapeu-fita', 'cabeca', 0.07, 0.37, 0.355, [0, baseChapeu + 0.13, 0], fita);
  const gomos: Array<[number, number, number, number]> = [
    [0.18, 0.36, 0.28, 0],
    [0.15, 0.28, 0.2, -0.14],
    [0.13, 0.2, 0.13, -0.45],
    [0.1, 0.13, 0.07, -0.9],
  ];
  let base: V3 = [0, baseChapeu + 0.09, 0];
  gomos.forEach(([h, rb, rc, g], i) => {
    const d: V3 = [-Math.sin(g), Math.cos(g), 0];
    const c: V3 = [base[0] + (d[0] * h) / 2, base[1] + (d[1] * h) / 2, base[2]];
    a.cilindro(`chapeu-copa${i}`, 'cabeca', h, rb, rc, c, cor, { rot: [0, 0, g] });
    base = [base[0] + d[0] * h * 0.92, base[1] + d[1] * h * 0.92, base[2]];
    if (i > 0) a.bola(`chapeu-dobra${i}`, 'cabeca', rb * 0.98, [c[0] - (d[0] * h) / 2, c[1] - (d[1] * h) / 2, 0], cor);
  });
  a.bola('chapeu-ponta', 'cabeca', 0.055, base, COR.ouro, [1, 1, 1], { brilho: 0.4 });
  a.placa('chapeu-estrela', 'cabeca', perfilEstrela(0.075), 0.03, [0.1, baseChapeu + 0.13, zRosto - 0.0], COR.ouro, {
    brilho: 0.45,
  });
  ajeitarCabeloDebaixo(p.pecas, 'chapeu', m.topoTampa, m.cab);
}

/** A criança de bruxinha (a da vassoura): chapéu roxo, roupa roxa de estrelinhas, gola laranja. */
function vestirBruxinha(p: PlanoBoneco): void {
  roupaLisa(p);
  pintarRoupa(p, { camisa: COR.roxo, calca: '#3a2c50', sapato: COR.laranja });
  const m = medir(p);
  const a = alfaiate(p.pecas);
  const { troncoH, frente, prof } = m;
  // a golinha laranja de pontas (no pescoço, por cima da camisa)
  for (const s of [-1, 0, 1])
    a.bola(`gola${s}`, 'tronco', 0.06, [s * 0.1, troncoH - 0.03, frente - 0.03 + (s ? -0.01 : 0)], COR.laranja, [1.2, 0.5, 0.9]);
  // as estrelinhas douradas na frente da roupa
  for (const [x, y] of [
    [-0.11, troncoH * 0.62],
    [0.1, troncoH * 0.4],
    [-0.04, troncoH * 0.2],
  ])
    a.placa(`estrela${x}`, 'tronco', perfilEstrela(0.045), 0.02, [x, y, frente + 0.006], COR.ouro, { brilho: 0.4 });
  // a faixa laranja na cintura
  a.caixa('faixa', 'tronco', [m.larg + 0.02, 0.06, prof + 0.02], [0, 0.04, 0], COR.laranjaEscuro, 0.025);
  chapeuBruxinha(p, '#5e3488', COR.laranja);
}

/** A criança de abóbora: a barriga redonda de gomos, a golinha de folhas e o gorro de cabinho. */
function vestirAbobrinha(p: PlanoBoneco): void {
  roupaLisa(p);
  pintarRoupa(p, { camisa: COR.laranja, calca: COR.musgoEscuro, sapato: COR.musgo });
  const m = medir(p);
  const a = alfaiate(p.pecas);
  const { troncoH, frente, baseChapeu, topoTampa, cab } = m;
  // a barriga de abóbora (mais larga que o peito, sem passar dos ombros)
  a.bola('abobora', 'tronco', 0.27, [0, troncoH * 0.42, 0.015], COR.laranja, [1, 0.82, 0.78]);
  for (const x of [-0.13, 0, 0.13])
    a.caixa(`gomo${x}`, 'tronco', [0.03, 0.3, 0.02], [x, troncoH * 0.42, frente + 0.058 - Math.abs(x) * 0.35], COR.laranjaEscuro, 0.01);
  // a golinha de folhas verdes
  for (const s of [-1, 1])
    a.bola(`folha${s}`, 'tronco', 0.075, [s * 0.09, troncoH - 0.01, frente - 0.05], COR.musgoClaro, [1.3, 0.45, 0.9], {
      rot: [0, 0, s * 0.35],
    });
  // o gorro verde de cabinho e folhinha
  a.cilindro('gorro', 'cabeca', 0.16, 0.37, 0.3, [0, baseChapeu + 0.05, -0.01], COR.musgo);
  a.bola('gorro-topo', 'cabeca', 0.3, [0, baseChapeu + 0.13, -0.01], COR.musgo, [1, 0.42, 1]);
  a.cilindro('cabinho', 'cabeca', 0.14, 0.045, 0.035, [0.02, baseChapeu + 0.25, 0], '#7a4e2a', { rot: [0, 0, -0.25] });
  a.bola('folhinha', 'cabeca', 0.08, [0.12, baseChapeu + 0.23, 0.02], COR.musgoClaro, [1.2, 0.35, 0.7], { rot: [0, 0.4, -0.5] });
  ajeitarCabeloDebaixo(p.pecas, 'chapeu', topoTampa, cab);
}

// ------------------------------------------------------------------ os bonecos

interface Gente {
  boneco: Personagem;
  pose: Pose;
  prefixo: string;
  /** A altura do quadril no plano e a escala do boneco (o assento e o deque contam com elas). */
  quadril: number;
  escala: number;
}

function criarGente(
  ctx: CtxPasseios,
  id: string,
  modelo: ModeloId,
  aparencia: Partial<Aparencia>,
  vestir: (p: PlanoBoneco) => void,
  juntas: Juntas & { corpoX?: number },
): Gente {
  const ap: Aparencia = { ...aparenciaPadrao(modelo), ...aparencia, nome: id };
  const prefixo = `esboco-passeio-${id}`;
  let quadril = 0.34;
  let escala = 1;
  const boneco = criarBoneco(
    ctx.scene,
    ap,
    prefixo,
    (pl) => {
      vestir(pl);
      quadril = pl.juntas.tronco.pos[1];
      escala = pl.escala;
      return pl;
    },
    true,
  );
  const pose = emPe();
  aplicarJuntas(pose, juntas, 1);
  if (juntas.corpoX) pose.corpoX = juntas.corpoX;
  boneco.aplicarPose(pose);
  for (const mm of boneco.raiz.getChildMeshes()) {
    if (mm instanceof Mesh) ctx.semBrilho(mm);
    mm.isPickable = false;
  }
  return { boneco, pose, prefixo, quadril, escala };
}

/** A posição de uma junta em relação à raiz do boneco (a raiz no zero, sem giro). */
function ondeEsta(g: Gente, junta: 'maoD' | 'maoE'): V3 {
  const no = noDaJunta(g.boneco, g.prefixo, junta);
  if (!no) return [0, 0, 0];
  const cadeia: TransformNode[] = [];
  for (let n: TransformNode | null = no; n; n = n.parent as TransformNode | null) cadeia.unshift(n);
  for (const n of cadeia) n.computeWorldMatrix(true);
  const p = no.getAbsolutePosition();
  const r = g.boneco.raiz.position;
  return [p.x - r.x, p.y - r.y, p.z - r.z];
}

// ------------------------------------------------------------------ as fantasminhas que acenam

/** A fantasminha do bosque (`fantasiasBichos.ts`) com os bracinhos soltos para acenar. */
function fantasminhaAcenando(): PecaCriatura[] {
  const corpo = '#f4f0ff';
  const barra = '#e4dafa';
  const b = bicho(1);
  b.bola(0.3, corpo, [1, 1.02, 0.95], [0, 0.58, 0], { brilho: 0.3 });
  b.bola(0.27, corpo, [1, 0.9, 0.92], [0, 0.38, 0], { brilho: 0.3 });
  for (let i = 0; i < 6; i++) {
    const t = (i / 6) * Math.PI * 2 + 0.3;
    b.bola(0.1, barra, [1, 0.9, 1], [Math.sin(t) * 0.19, 0.17, Math.cos(t) * 0.18], { brilho: 0.3 });
  }
  // (os bracinhos são malhas à parte, presas no ombro: `bracinhos`, para acenar de verdade)
  for (const s of [-1, 1]) {
    b.bola(0.05, '#2a2240', [0.85, 1.1, 0.45], [s * 0.1, 0.62, 0.27]);
    b.bola(0.017, '#ffffff', [1, 1, 0.5], [s * 0.1 + 0.016, 0.645, 0.29], { brilho: 0.3 });
    b.bola(0.04, '#ffb0c4', [1.4, 0.75, 0.3], [s * 0.19, 0.53, 0.25]);
  }
  // o sorriso aberto (o "oi!")
  for (let i = 0; i <= 6; i++) {
    const u = -1 + i / 3;
    b.bola(0.018, '#5a3a7a', [1.2, 1, 0.5], [u * 0.075, 0.525 - 0.03 * (1 - u * u), 0.285]);
  }
  return b.fim().pecas;
}

// ------------------------------------------------------------------ a montagem

export interface Passeios {
  /** O relógio do roteiro (s): põe no instante e liga ou para. */
  relogio(t: number, rodando: boolean): void;
  agora(): number;
  /** Mostra (ou esconde) a vassoura e o trem. */
  mostrar(sim: boolean): void;
  hora(noite: boolean): void;
  /** A câmera do roteiro no instante de agora ('vassoura', 'trem', 'bordo', 'bosque'...). */
  camera(qual: string, tipo: 'deitado' | 'empe'): { pos: V3; alvo: V3; fov: number } | null;
}

export function montarPasseios(ctx: CtxPasseios): Passeios {
  const { scene, O, pl } = ctx;
  const { ox, oz } = O;
  const Y = O.y + 1;
  const plastico = pl.corVertice(0.3) ?? pl.cor('#ffffff', 0.3);
  const raizes: TransformNode[] = [];
  const malha = (k: Kit, nome: string, pai: TransformNode | null) => {
    const m = new Mesh(nome, scene);
    k.p.juntar().applyToMesh(m);
    m.material = plastico;
    m.isPickable = false;
    m.receiveShadows = true;
    if (pai) m.parent = pai;
    ctx.semBrilho(m);
    return m;
  };
  /** As peças acesas (luz própria), uma malha por cor. */
  const luzes = (k: Map<string, Kit>, nome: string, pai: TransformNode | null) => {
    for (const [cor, kit] of k) {
      const m = new Mesh(`${nome}-${cor}`, scene);
      kit.p.juntar().applyToMesh(m);
      m.material = ctx.acesa(cor);
      m.isPickable = false;
      if (pai) m.parent = pai;
    }
  };
  const kitDeLuz = (k: Map<string, Kit>, cor: string) => {
    let kk = k.get(cor);
    if (!kk) k.set(cor, (kk = new Kit()));
    return kk;
  };
  /** O halo morno das lanterninhas (só de noite), como o das lanternas do palco. */
  const texHalo = new DynamicTexture('esboco-passeio-halo', { width: 64, height: 64 }, scene, false);
  {
    const g = texHalo.getContext();
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,214,120,0.8)');
    gr.addColorStop(0.35, 'rgba(255,190,90,0.28)');
    gr.addColorStop(1, 'rgba(255,170,60,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    texHalo.update();
    texHalo.hasAlpha = true;
  }
  const matHalo = new StandardMaterial('esboco-passeio-halo', scene);
  matHalo.disableLighting = true;
  matHalo.emissiveTexture = texHalo;
  matHalo.opacityTexture = texHalo;
  matHalo.diffuseColor = Color3.Black();
  matHalo.specularColor = Color3.Black();
  matHalo.alphaMode = 1;
  matHalo.backFaceCulling = false;
  const halos: Mesh[] = [];
  const halo = (p: V3, tam: number, pai: TransformNode | null) => {
    const m = MeshBuilder.CreatePlane(`esboco-passeio-halo${halos.length}`, { size: tam }, scene);
    m.material = matHalo;
    m.billboardMode = Mesh.BILLBOARDMODE_ALL;
    if (pai) m.parent = pai;
    m.position.set(...p);
    m.isPickable = false;
    ctx.foraDoBrilho(m);
    halos.push(m);
    return m;
  };
  /**
   * A abóbora de brinquedo do jogo (o modelo de gomos, `blocosBrinquedo.ts`) com o rosto da
   * família da abóbora gigante da praça: olhos redondos castanhos com o brilhinho, bochechas
   * rosadas e o sorriso aceso. Nada de olho triangular de lampião: é a carinha doce da festa.
   * A raiz fica no meio da abóbora (a base a 0,4 × lado abaixo); o rosto olha para +z.
   */
  const aboboraSorridente = (nome: string, lado: number, pai: TransformNode | null): TransformNode => {
    const raiz = new TransformNode(nome, scene);
    if (pai) raiz.parent = pai;
    for (const m of modeloDeBloco(scene, pl, Bloco.ABOBORA, `${nome}-modelo`, lado) ?? []) {
      m.parent = raiz;
      m.receiveShadows = true;
      m.isPickable = false;
      ctx.semBrilho(m);
    }
    const L = lado;
    const k = new Kit();
    const luz = new Map<string, Kit>();
    // (a casca: o gomo da frente chega a ~0,57 no meio, a beirada dos olhos a ~0,5)
    for (const s of [-1, 1]) {
      k.bola(0.085 * L, [s * 0.155 * L, 0.08 * L, 0.505 * L], '#3a1a0c', [1, 1.18, 0.5]);
      k.bola(0.027 * L, [(s * 0.155 - 0.03) * L, 0.12 * L, 0.545 * L], '#fff4e6', [1, 1, 0.5]);
      k.bola(0.06 * L, [s * 0.285 * L, -0.04 * L, 0.47 * L], '#f4a27a', [1, 0.7, 0.4], [0, s * 0.55, 0]);
    }
    for (let i = 0; i <= 12; i++) {
      const u = -1 + i / 6;
      kitDeLuz(luz, '#ffcf4a').bola(
        0.034 * L,
        [u * 0.17 * L, (-0.1 - 0.07 * (1 - u * u)) * L, (0.565 - 0.08 * u * u) * L],
        '#ffcf4a',
      );
    }
    malha(k, `${nome}-rosto`, raiz);
    luzes(luz, `${nome}-sorriso`, raiz);
    return raiz;
  };

  // ================================================================ a vassoura-patinete
  const bruxinha = criarGente(
    ctx,
    'bruxinha',
    'tecela',
    // (o cabelo escuro e a pele clara: de longe, o rosto se lê dentro do chapéu)
    // (revisor: o rosto 2 tem sardas, que pareciam pintinhas escuras; o 1 tem cílios inclinados
    // que liam como sobrancelha brava; o 0 é o clássico, de bochecha rosada lisa. O cabelo
    // aparece debaixo do chapéu, até o ombro)
    { corpo: 'feminino', pele: 7, rosto: 0, cabeloEstilo: 7, cabeloCor: 0, roupaEstilo: 0, acessorio: 'nenhum' },
    vestirBruxinha,
    // um pé no deque, o outro levantado atrás, as mãos no guidão e o corpo um tico para a frente
    { bdX: -1.32, beX: -1.32, bdZ: 0.1, beZ: -0.1, corpoY: 0.15, pernaD: 0.02, pernaE: 1.3, cabX: -0.04, corpoX: 0.06 },
  );
  raizes.push(bruxinha.boneco.raiz);
  const DECK = 0.15 * bruxinha.escala;
  bruxinha.boneco.posicionar(0, 0, 0, 0);
  const maoD = ondeEsta(bruxinha, 'maoD');
  const maoE = ondeEsta(bruxinha, 'maoE');
  {
    const k = new Kit();
    const palha = '#e6bd52';
    const palhaEsc = '#cf9f38';
    const madeira = '#9a6a3a';
    const roxo = COR.roxo;
    // o friso escuro das rodinhas escondidas (rente ao chão, quase todo debaixo da palha)
    k.caixa([0.3, 0.05, 0.6], [0, 0.04, 0.02], '#2e2a36', 0.02);
    for (const z of [-0.2, 0.24]) for (const x of [-0.12, 0.12]) k.cil(0.05, 0.034, 0.034, [x, 0.035, z], '#3a3644', [0, 0, Math.PI / 2], 10);
    // o deque: a palha deitada e achatada (onde vai o pé), com os fiapos em relevo dos lados
    const topo = DECK;
    const hDeque = topo - 0.055;
    k.caixa([0.36, hDeque, 0.64], [0, 0.055 + hDeque / 2, 0.02], palha, 0.035);
    for (const s of [-1, 1])
      for (let i = 0; i < 3; i++)
        k.caixa([0.012, 0.012, 0.6], [s * 0.181, 0.075 + i * 0.026, 0.02], palhaEsc, 0.004);
    // a ponta da palha abre atrás, em tufos (um tico levantada: não arrasta no chão)
    for (let i = 0; i < 7; i++) {
      const f = (i - 3) / 3;
      // (os de fora abrem para fora: o giro leva a ponta de trás para o lado de cada um)
      const giro = -f * 0.32;
      const comp = 0.34 - Math.abs(f) * 0.06;
      const z = -0.3 - (comp / 2) * Math.cos(giro);
      const x = f * 0.12 - (comp / 2) * Math.sin(giro);
      k.caixa([0.075, 0.075, comp], [x, 0.095 + Math.abs(f) * 0.01, z], i % 2 ? palhaEsc : palha, 0.03, [0.12, giro, 0]);
    }
    // as amarras roxas da palha (uma atrás do pé, uma na frente) e o pescoço da vassoura
    k.caixa([0.39, hDeque + 0.03, 0.05], [0, 0.055 + hDeque / 2, -0.27], roxo, 0.02);
    k.caixa([0.39, hDeque + 0.03, 0.05], [0, 0.055 + hDeque / 2, 0.28], roxo, 0.02);
    // na frente, a palha afina no pescoço (como numa vassoura) e o cabo sai dele
    k.cil(0.14, 0.13, 0.06, [0, 0.1, 0.39], palha, [Math.PI / 2, 0, 0]);
    k.cil(0.04, 0.072, 0.072, [0, 0.1, 0.44], roxo, [Math.PI / 2, 0, 0]);
    // o cabo de madeira em pé (o guidão): sai do pescoço, dobra para cima e inclina para quem anda
    const yBar = (maoD[1] + maoE[1]) / 2;
    const zBar = (maoD[2] + maoE[2]) / 2;
    const base: V3 = [0, 0.1, 0.5];
    k.cil(0.08, 0.04, 0.04, [0, 0.1, 0.48], madeira, [Math.PI / 2, 0, 0]);
    k.bola(0.045, base, madeira);
    const dz = zBar - base[2];
    const dy = yBar - base[1];
    const L = Math.hypot(dz, dy);
    k.cil(L, 0.04, 0.036, [0, (yBar + base[1]) / 2, (zBar + base[2]) / 2], madeira, [Math.atan2(dz, dy), 0, 0]);
    // o lacinho laranja no meio do cabo
    const meio: V3 = [0, base[1] + dy * 0.55, base[2] + dz * 0.55];
    for (const s of [-1, 1])
      k.bola(0.05, [s * 0.05, meio[1], meio[2] + 0.03], COR.laranja, [1.2, 0.8, 0.5], [0, 0, s * 0.35]);
    k.bola(0.026, [0, meio[1], meio[2] + 0.045], COR.laranjaEscuro);
    // a barra do guidão e os pegadores roxos (onde as mãos estão)
    const xm = Math.max(Math.abs(maoD[0]), Math.abs(maoE[0]));
    k.cil(2 * xm + 0.12, 0.034, 0.034, [0, yBar, zBar], madeira, [0, 0, Math.PI / 2]);
    k.bola(0.045, [0, yBar, zBar], madeira);
    for (const s of [-1, 1]) {
      // (a pega é curta e fina, toda dentro da mãozinha; só a ponta lilás aparece do lado de fora)
      k.cil(0.12, 0.04, 0.04, [s * (xm + 0.02), yBar, zBar], '#5e3488', [0, 0, Math.PI / 2]);
      k.bola(0.042, [s * (xm + 0.1), yBar, zBar], COR.lilas, [0.7, 1, 1]);
    }
    malha(k, 'esboco-passeio-vassoura', bruxinha.boneco.raiz);
  }
  const sombraVassoura = sombrinha(ctx, 'esboco-passeio-vassoura-sombra', 0.5);
  sombraVassoura.scaling.set(0.9, 1, 1.5);

  // o rastro de estrelinhas: um punhado de estrelas acesas que nascem na ponta da palha, sobem
  // devagar e encolhem até sumir
  const estrelas: { m: InstancedMesh; vida: number; v: V3; giro: number; tam: number }[] = [];
  {
    for (const [i, cor] of ['#ffd45a', '#c9a8ff', '#ffe9a0'].entries()) {
      const base = new Mesh(`esboco-passeio-estrela${i}`, scene);
      const vd = dadosPlaca(perfilEstrela(0.07), 0.02);
      vd.uvs = null;
      vd.applyToMesh(base);
      base.material = ctx.acesa(cor);
      base.isPickable = false;
      base.isVisible = false;
      raizes.push(base);
      for (let j = 0; j < 22; j++) {
        const m = base.createInstance(`esboco-passeio-estrela${i}-${j}`);
        m.billboardMode = Mesh.BILLBOARDMODE_ALL;
        m.isPickable = false;
        m.setEnabled(false);
        estrelas.push({ m, vida: -1, v: [0, 0, 0], giro: 0, tam: 1 });
      }
    }
  }
  let proxEstrela = 0;
  let sorteio = 1;
  const acaso = () => {
    sorteio = (sorteio * 16807) % 2147483647;
    return sorteio / 2147483647;
  };

  const poseVassoura = (t: number) => {
    // o impulso: a perna de trás desce e volta a subir a cada 1,2 s, e o corpo vai junto
    const c = (t / 1.2) % 1;
    const desce = c < 0.32 ? Math.sin((c / 0.32) * Math.PI) : 0;
    const p = bruxinha.pose;
    // (o pé de trás nunca desce até a palha: o impulso é um balanço curto no ar)
    p.pernaEsquerda = 1.3 - desce * 0.45;
    p.corpoX = 0.06 + desce * 0.04;
    p.corpoY = 0.15 + Math.sin(t * 9) * 0.004;
    p.cabecaLado = Math.sin(t * 1.3) * 0.05;
    bruxinha.boneco.aplicarPose(p);
  };
  const ondeVassoura = (t: number) => {
    const q = pontoDaVassoura(t);
    return { x: ox + q.x, z: oz + q.z, yaw: Math.atan2(q.dx, q.dz) };
  };
  let tAnterior = -1;
  const quadroVassoura = (t: number) => {
    const v = ondeVassoura(t);
    bruxinha.boneco.posicionar(v.x, Y, v.z, v.yaw);
    sombraVassoura.position.set(v.x, Y + 0.02, v.z);
    sombraVassoura.rotation.y = v.yaw;
    poseVassoura(t);
    // as estrelinhas: o rastro conta do instante (nas fotos, paradas, o rastro já está lá)
    const dt = tAnterior < 0 || t < tAnterior || t - tAnterior > 0.5 ? -1 : t - tAnterior;
    tAnterior = t;
    const tras = (d: number, h: number, lado: number): V3 => {
      const sx = Math.sin(v.yaw);
      const cz = Math.cos(v.yaw);
      return [v.x - sx * d + cz * lado, Y + h, v.z - cz * d - sx * lado];
    };
    /** Nasce uma estrela na ponta da palha (`idade` s atrás: a vassoura já andou isso). */
    const nascer = (idade: number) => {
      const e = estrelas[proxEstrela++ % estrelas.length];
      e.vida = idade;
      e.v = [(acaso() - 0.5) * 0.2, 0.18 + acaso() * 0.25, (acaso() - 0.5) * 0.2];
      e.giro = (acaso() - 0.5) * 3;
      e.tam = 0.7 + acaso() * 0.6;
      // (a estrela fica onde nasceu: a vassoura vai embora e o rastro fica para trás)
      const p = tras(0.66 + idade * RUA.v, 0.12 + acaso() * 0.2, (acaso() - 0.5) * 0.28);
      e.m.position.set(p[0] + e.v[0] * idade, p[1] + e.v[1] * idade, p[2] + e.v[2] * idade);
      e.m.setEnabled(true);
    };
    if (dt < 0) {
      // sem passado (o começo e as fotos): um rastro já feito, do mais novo ao mais velho
      for (const e of estrelas) {
        e.vida = -1;
        e.m.setEnabled(false);
      }
      for (let i = 0; i < 26; i++) nascer(i * 0.045);
    } else {
      for (let n = Math.floor((t * 22) | 0) - Math.floor(((t - dt) * 22) | 0); n > 0; n--) nascer(0);
    }
    for (const e of estrelas) {
      if (e.vida < 0) continue;
      if (dt > 0) {
        e.vida += dt;
        e.m.position.x += e.v[0] * dt;
        e.m.position.y += e.v[1] * dt;
        e.m.position.z += e.v[2] * dt;
      }
      const VIDA = 1.15;
      if (e.vida > VIDA) {
        e.vida = -1;
        e.m.setEnabled(false);
        continue;
      }
      const f = e.vida / VIDA;
      const s = e.tam * Math.min(1, f * 6) * (1 - f * f);
      e.m.scaling.setAll(Math.max(0.001, s));
      e.m.rotation.z = e.giro * e.vida;
    }
  };

  // ================================================================ o trem das risadas
  // ---------------------------------------------------------------- o trilho
  {
    const k = new Kit();
    const madeira = '#8a5a32';
    const madeiraEsc = '#734a28';
    // os dormentes de madeira a cada meio bloco
    for (let s = 0, i = 0; s < VOLTA - 0.1; s += 0.5, i++) {
      const q = pontoDoTrilho(s);
      const yaw = Math.atan2(q.dx, q.dz);
      k.caixa([1.25, 0.07, 0.2], [ox + q.x, Y + 0.035, oz + q.z], i % 3 ? madeira : madeiraEsc, 0.025, [0, yaw, 0]);
    }
    // os trilhos de metal escuro (arredondados), em pedacinhos que acompanham a curva
    const PASSO = 0.4;
    for (let s = 0; s < VOLTA - 1e-6; s += PASSO) {
      const a = pontoDoTrilho(s);
      const b = pontoDoTrilho(s + PASSO);
      for (const lado of [-0.45, 0.45]) {
        const ax = a.x + a.dz * lado;
        const az = a.z - a.dx * lado;
        const bx = b.x + b.dz * lado;
        const bz = b.z - b.dx * lado;
        const yaw = Math.atan2(bx - ax, bz - az);
        const L = Math.hypot(bx - ax, bz - az) + 0.03;
        k.caixa([0.085, 0.075, L], [ox + (ax + bx) / 2, Y + 0.07 + 0.0375, oz + (az + bz) / 2], '#3e3a48', 0.03, [0, yaw, 0]);
      }
    }
    const m = malha(k, 'esboco-passeio-trilho', null);
    m.receiveShadows = true;
  }

  // ---------------------------------------------------------------- o túnel curto e claro
  const luzTunel = new Map<string, Kit>();
  const fantasminhas: {
    b: Bicho;
    x: number;
    y: number;
    z: number;
    giro: number;
    f: number;
    ombros: TransformNode[];
  }[] = [];
  /**
   * Os bracinhos de pano da fantasminha: uma bolinha comprida presa num ombro (o nó gira em z:
   * 0 aponta para cima), no mesmo plástico e na mesma cor do corpo dela.
   */
  const bracinhos = (b: Bicho, i: number): TransformNode[] =>
    [1, -1].map((s) => {
      const ombro = new TransformNode(`esboco-passeio-fantasminha${i}-ombro${s}`, scene);
      ombro.parent = b.raiz;
      // (a raiz desce o pé até o chão: o ombro conta do mesmo zero do desenho)
      ombro.position.set(s * 0.25, 0.45 - 0, 0.05);
      const m = MeshBuilder.CreateSphere(`esboco-passeio-fantasminha${i}-braco${s}`, { diameter: 0.16, segments: 8 }, scene);
      m.parent = ombro;
      m.scaling.set(0.8, 1.55, 0.8);
      m.position.set(0, 0.1, 0);
      const cor = Color3.FromHexString('#f4f0ff');
      const n = m.getTotalVertices();
      const cores = new Float32Array(n * 4);
      for (let k = 0; k < n; k++) cores.set([cor.r, cor.g, cor.b, 1], k * 4);
      m.setVerticesData(VertexBuffer.ColorKind, cores);
      m.material = b.materiais[1];
      m.isPickable = false;
      ctx.semBrilho(m);
      return ombro;
    });
  {
    const k = new Kit();
    const roxo = '#7a4aae';
    const laranja = COR.laranja;
    const creme = COR.creme;
    const zc = oz + TUNEL.z;
    const x0 = ox + TUNEL.x0;
    const x1 = ox + TUNEL.x1;
    // (dono, 20 nov: o túnel era baixo e a cabeça dos passageiros atravessava a cobertura;
    // medido no teste, o chapéu da bruxinha chega a 3,06 do chão e o Bento novo, de tufos
    // espetados, a 3,5: o teto fica a 4,25 no meio, e a 0,6 do meio ainda a 4,12, mais de meio
    // bloco de folga sobre todos)
    const RA = 1.45; // o raio do arco
    const HP = 2.8; // a altura das paredes (onde o arco começa)
    // as paredes de tábuas em pé (roxo e laranja, uma sim, uma não), com duas janelinhas redondas
    // de cada lado; a tábua que cruza a janela fica em dois pedaços (debaixo e em cima dela)
    const janelas = [-1.7, 1.7];
    const JR = 0.46;
    const JY = 1.25;
    const TAB = 0.5;
    const n = Math.round((x1 - x0) / TAB);
    for (const lado of [-1, 1]) {
      const z = zc + lado * RA;
      for (let i = 0; i < n; i++) {
        const xm = x0 + (i + 0.5) * TAB;
        // (as paredes em dois roxos; o laranja fica no teto e nas bocas: nada de listra de circo)
        const cor = i % 2 ? roxo : '#6a3e9c';
        const lx = xm - (ox + TCX);
        const jan = janelas.find((j) => Math.abs(lx - j) < JR + 0.01);
        if (jan === undefined) {
          k.caixa([TAB - 0.04, HP, 0.12], [xm, Y + HP / 2, z], cor, 0.04);
          continue;
        }
        // (a meia altura da janela na beira da tábua mais perto do meio dela)
        const meia = Math.sqrt(Math.max(0, JR * JR - Math.max(0, Math.abs(lx - jan) - TAB / 2) ** 2));
        const y0 = JY - meia;
        const y1 = JY + meia;
        k.caixa([TAB - 0.04, y0, 0.12], [xm, Y + y0 / 2, z], cor, 0.04);
        k.caixa([TAB - 0.04, HP - y1, 0.12], [xm, Y + (y1 + HP) / 2, z], cor, 0.04);
      }
      // a moldura creme de cada janelinha
      for (const j of janelas)
        k.anel(JR * 2 + 0.06, 0.08, [ox + TCX + j, Y + JY, z + lado * 0.03], creme, [Math.PI / 2, 0, 0]);
      // a viga de cima das paredes
      k.caixa([x1 - x0 + 0.1, 0.12, 0.2], [(x0 + x1) / 2, Y + HP + 0.02, z], creme, 0.04);
    }
    // o teto em arco: ripas ao comprido (roxo e laranja), com frestas abertas para o céu
    const RIPAS = 15;
    for (let i = 0; i < RIPAS; i++) {
      const a = ((i + 0.5) / RIPAS) * Math.PI;
      const y = Y + HP + Math.sin(a) * RA;
      const z = zc + Math.cos(a) * RA;
      k.caixa([x1 - x0, 0.1, 0.29], [(x0 + x1) / 2, y, z], i % 2 ? COR.laranjaEscuro : laranja, 0.04, [-(a - Math.PI / 2), 0, 0]);
    }
    // as duas bocas: um arco grosso de tábuas, com os pés de madeira e as luzinhas em volta
    for (const xb of [x0 - 0.05, x1 + 0.05]) {
      for (const lado of [-1, 1]) k.caixa([0.3, HP + 0.05, 0.34], [xb, Y + (HP + 0.05) / 2, zc + lado * RA], creme, 0.05);
      const SEG = 9;
      for (let i = 0; i < SEG; i++) {
        const a0 = (i / SEG) * Math.PI;
        const a1 = ((i + 1) / SEG) * Math.PI;
        const am = (a0 + a1) / 2;
        const rr = RA + 0.1;
        const comp = 2 * rr * Math.sin((a1 - a0) / 2) + 0.03;
        k.caixa([0.32, 0.26, comp], [xb, Y + HP + Math.sin(am) * rr, zc + Math.cos(am) * rr], i % 2 ? laranja : roxo, 0.05, [
          Math.PI / 2 - am,
          0,
          0,
        ]);
        // a luzinha (amarela e lilás) na beira de dentro do arco
        const rl = RA - 0.08;
        const cor = i % 2 ? '#ffd36a' : '#e6d4ff';
        kitDeLuz(luzTunel, cor).bola(0.055, [xb, Y + HP + Math.sin(am) * rl, zc + Math.cos(am) * rl], cor);
      }
    }
    // as lanterninhas acesas penduradas no teto, por dentro (o túnel nunca fica escuro)
    // (de um lado e do outro, perto das paredes: o meio fica livre para o trem e a chaminé)
    for (const [lx, lz] of [
      [-2.3, -1.0],
      [0, 1.0],
      [2.3, -1.0],
    ]) {
      const x = ox + TCX + lx;
      const z = zc + lz;
      const yTeto = Y + HP + Math.sqrt(RA * RA - lz * lz) - 0.06;
      k.cil(0.32, 0.012, 0.012, [x, yTeto - 0.16, z], '#3a2c50');
      k.caixa([0.22, 0.05, 0.22], [x, yTeto - 0.34, z], '#5a3a22', 0.02);
      k.caixa([0.2, 0.04, 0.2], [x, yTeto - 0.62, z], '#5a3a22', 0.02);
      kitDeLuz(luzTunel, '#ffd36a').caixa([0.16, 0.24, 0.16], [x, yTeto - 0.48, z], '#ffd36a', 0.03);
      halo([x, yTeto - 0.48, z], 1.6, null);
    }
    // a placa de cima da boca da entrada: uma abóbora sorridente (sem letreiro)
    malha(k, 'esboco-passeio-tunel', null);
    luzes(luzTunel, 'esboco-passeio-tunel-luz', null);
    // a abóbora de rosto redondo em cima da boca de entrada, olhando para +x (de onde o trem vem)
    const topo = aboboraSorridente('esboco-passeio-tunel-abobora', 0.75, null);
    topo.position.set(x1 + 0.0, Y + HP + RA + 0.22 + 0.4 * 0.75, zc);
    topo.rotation.y = Math.PI / 2;
    // as fantasminhas: duas nas janelinhas de fora (de frente para quem olha do gramado), uma em
    // cada boca, espiando do lado (de frente para o trem que chega e para o que sai)
    const pos: Array<[number, number, number, number]> = [
      [TCX + 1.7, JY - 0.42, TUNEL.z + RA + 0.1, 0],
      [TCX - 1.7, JY - 0.42, TUNEL.z + RA + 0.1, 0.2],
      [TCX + 3.95, 0.25, TUNEL.z - RA - 0.25, Math.PI / 2 + 0.5],
      [TCX - 3.95, 0.3, TUNEL.z + RA + 0.3, -Math.PI / 2 + 0.35],
      // (a da janelinha de dentro olha para dentro do túnel: quem vai no trem vê o rosto)
      [TCX - 1.7, JY - 0.42, TUNEL.z - RA + 0.02, 0],
    ];
    pos.forEach(([x, y, z, giro], i) => {
      const b = montarBicho(ctx, `passeio-fantasminha${i}`, fantasminhaAcenando());
      b.raiz.scaling.setAll(i < 2 || i === 4 ? 0.82 : 0.95);
      fantasminhas.push({ b, x: ox + x, y: Y + y, z: oz + z, giro, f: i * 1.3, ombros: bracinhos(b, i) });
    });
  }

  // ---------------------------------------------------------------- a locomotiva e os vagões
  interface Carro {
    no: TransformNode;
    /** Quanto atrás da frente da locomotiva fica o meio do carro (blocos de trilho). */
    atras: number;
    sombra: Mesh;
  }
  const carros: Carro[] = [];
  const RT = 0.145; // o topo do trilho
  /** A chaminé na locomotiva (local): um tico para o lado e na frente da abóbora. */
  const XCH = 0.2;
  const ZCH = 0.56;
  const RODA = 0.2;
  const rodas = (k: Kit, zs: number[], aro: string) => {
    for (const z of zs)
      for (const s of [-1, 1]) {
        const vd = dadosRoda();
        k.dados(vd, Matrix.Scaling(RODA, RODA, RODA * 0.75).multiply(Matrix.RotationY(Math.PI / 2)).multiply(Matrix.Translation(s * 0.47, RT + RODA, z)));
        k.cil(0.03, 0.08, 0.08, [s * 0.53, RT + RODA, z], aro, [0, 0, Math.PI / 2]);
      }
  };
  // a locomotiva-abóbora
  {
    const no = new TransformNode('esboco-passeio-locomotiva', scene);
    const k = new Kit();
    const luz = new Map<string, Kit>();
    const roxoEsc = COR.roxoEscuro;
    // o chassi e a saia laranja
    k.caixa([0.82, 0.24, 2.3], [0, RT + 0.34, 0], roxoEsc, 0.06);
    k.caixa([0.9, 0.08, 2.2], [0, RT + 0.28, 0], COR.laranja, 0.03);
    rodas(k, [-0.75, 0, 0.75], COR.laranja);
    // a biela creme ligando as rodas de cada lado
    for (const s of [-1, 1]) k.caixa([0.04, 0.05, 1.6], [s * 0.565, RT + RODA + 0.06, 0], COR.creme, 0.02);
    // o para-choque da frente, o limpa-trilho em cunha e o farolzinho
    k.caixa([0.95, 0.14, 0.12], [0, RT + 0.3, 1.18], COR.laranja, 0.05);
    for (let i = 0; i < 4; i++) k.caixa([0.8 - i * 0.16, 0.06, 0.08], [0, RT + 0.16 - i * 0.03, 1.27 + i * 0.03], roxoEsc, 0.02);
    kitDeLuz(luz, '#fff1b0').bola(0.07, [0, RT + 0.5, 1.2], '#fff1b0');
    k.cil(0.06, 0.1, 0.1, [0, RT + 0.5, 1.15], COR.creme, [Math.PI / 2, 0, 0]);
    // a cabine de trás (roxa, janelas creme, telhado musgo de beira redonda)
    const zc = -0.62;
    k.caixa([0.92, 0.12, 0.92], [0, RT + 0.52, zc], roxoEsc, 0.04);
    for (const s of [-1, 1]) {
      k.caixa([0.09, 0.78, 0.86], [s * 0.42, RT + 0.97, zc], COR.roxo, 0.04);
      k.caixa([0.1, 0.32, 0.4], [s * 0.43, RT + 1.08, zc + 0.02], COR.creme, 0.05);
      k.caixa([0.11, 0.24, 0.32], [s * 0.43, RT + 1.08, zc + 0.02], '#d9c8f2', 0.04);
    }
    k.caixa([0.92, 0.78, 0.09], [0, RT + 0.97, zc - 0.42], COR.roxo, 0.04);
    k.caixa([0.92, 0.36, 0.09], [0, RT + 0.76, zc + 0.42], COR.roxo, 0.04);
    for (const s of [-1, 1]) k.caixa([0.1, 0.44, 0.09], [s * 0.41, RT + 1.15, zc + 0.42], COR.roxo, 0.04);
    k.caixa([1.12, 0.1, 1.12], [0, RT + 1.41, zc], COR.musgo, 0.05);
    k.caixa([0.96, 0.08, 0.96], [0, RT + 1.49, zc], COR.musgoClaro, 0.04);
    // a chaminezinha (em cima da frente da abóbora), de boca larga creme
    // (o pé dela entra na casca: de lado não aparece vão entre a chaminé e a abóbora)
    // (um tico para o lado, fora do eixo: a câmera de bordo vê o trilho pelo meio)
    const yb = RT + 0.46 + 0.5;
    k.cil(0.58, 0.1, 0.12, [XCH, yb + 0.29, ZCH], '#3a2c50');
    k.cil(0.1, 0.17, 0.15, [XCH, yb + 0.6, ZCH], COR.creme);
    malha(k, 'esboco-passeio-locomotiva-corpo', no);
    luzes(luz, 'esboco-passeio-locomotiva-luz', no);
    // a caldeira: a abóbora de brinquedo de rosto redondo e doce (a família da gigante), com o
    // sorriso aceso, para a frente
    const cald = aboboraSorridente('esboco-passeio-caldeira', 1.08, no);
    cald.position.set(0, RT + 0.46 + 0.4 * 1.08, 0.42);
    const sombra = sombrinha(ctx, 'esboco-passeio-locomotiva-sombra', 0.5);
    sombra.scaling.set(2.0, 1, 5.0);
    carros.push({ no, atras: 0, sombra });
    raizes.push(no);
  }
  // os três vagõezinhos abertos (roxo, laranja e musgo) com o banco
  const CORES_VAGAO = [COR.roxo, COR.laranja, COR.musgo];
  const VAGAO = 1.6;
  CORES_VAGAO.forEach((cor, i) => {
    const no = new TransformNode(`esboco-passeio-vagao${i}`, scene);
    const k = new Kit();
    const borda = i === 1 ? COR.roxo : COR.creme;
    k.caixa([0.82, 0.12, VAGAO], [0, RT + 0.42, 0], COR.roxoEscuro, 0.04);
    rodas(k, [-0.48, 0.48], i === 1 ? COR.roxo : COR.laranja);
    // a banheira aberta: o fundo e as quatro paredes, com a beirada redonda por cima
    const yF = RT + 0.5;
    const H = 0.46;
    k.caixa([0.98, 0.08, VAGAO - 0.04], [0, yF, 0], cor, 0.03);
    for (const s of [-1, 1]) {
      k.caixa([0.08, H, VAGAO - 0.04], [s * 0.45, yF + H / 2, 0], cor, 0.035);
      k.caixa([0.98, H, 0.08], [0, yF + H / 2, s * (VAGAO / 2 - 0.06)], cor, 0.035);
    }
    for (const s of [-1, 1]) {
      k.caixa([0.12, 0.07, VAGAO], [s * 0.45, yF + H, 0], borda, 0.03);
      k.caixa([1.02, 0.07, 0.12], [0, yF + H, s * (VAGAO / 2 - 0.06)], borda, 0.03);
    }
    // o enfeite de cada lado: uma bolinha de abóbora (laranja no roxo e no musgo, roxa no laranja)
    for (const s of [-1, 1]) {
      const c2 = i === 1 ? COR.roxo : COR.laranja;
      k.bola(0.09, [s * 0.5, yF + H * 0.5, 0], c2, [0.4, 0.85, 1]);
      k.bola(0.03, [s * 0.5, yF + H * 0.5 + 0.09, 0], COR.musgo, [0.6, 1, 0.6]);
    }
    // o banco de madeira (assento e encosto), na metade de trás; os pés vão para a frente
    const yA = RT + 0.66;
    k.caixa([0.82, 0.1, 0.36], [0, yA - 0.05, -0.42], '#9a6a3a', 0.03);
    k.caixa([0.82, 0.12, 0.3], [0, yA - 0.16, -0.42], '#7a4e2a', 0.03);
    k.caixa([0.82, 0.34, 0.08], [0, yA + 0.17, -0.62], '#9a6a3a', 0.03);
    // o engate escuro na frente
    k.caixa([0.1, 0.08, 0.3], [0, RT + 0.38, VAGAO / 2 + 0.1], '#3a3644', 0.03);
    malha(k, `esboco-passeio-vagao${i}-corpo`, no);
    const sombra = sombrinha(ctx, `esboco-passeio-vagao${i}-sombra`, 0.5);
    sombra.scaling.set(1.9, 1, 3.4);
    carros.push({ no, atras: 1.15 + 0.3 + VAGAO / 2 + i * (VAGAO + 0.28), sombra });
    raizes.push(no);
  });
  // a fumacinha clara da chaminé: bolinhas que sobem, crescem e somem
  const matFumaca = new StandardMaterial('esboco-passeio-fumaca', scene);
  matFumaca.diffuseColor = new Color3(0.93, 0.91, 0.97);
  matFumaca.emissiveColor = new Color3(0.55, 0.53, 0.6);
  matFumaca.specularColor = Color3.Black();
  matFumaca.alpha = 0.9;
  // (cada bolinha é uma nuvenzinha de quatro bolas, de brinquedo, não uma bola lisa)
  const nuvem = new Kit();
  nuvem.bola(0.32, [0, 0, 0], '#ffffff', [1, 0.9, 1], undefined, 10);
  nuvem.bola(0.22, [0.26, -0.06, 0.05], '#ffffff', [1, 0.9, 1], undefined, 8);
  nuvem.bola(0.22, [-0.25, -0.04, -0.06], '#ffffff', [1, 0.9, 1], undefined, 8);
  nuvem.bola(0.2, [0.04, 0.2, -0.04], '#ffffff', [1, 0.9, 1], undefined, 8);
  const baseFumaca = new Mesh('esboco-passeio-fumaca', scene);
  nuvem.p.juntar().applyToMesh(baseFumaca);
  baseFumaca.material = matFumaca;
  baseFumaca.isVisible = false;
  baseFumaca.isPickable = false;
  raizes.push(baseFumaca);
  ctx.semBrilho(baseFumaca);
  const fumacas: InstancedMesh[] = [];
  for (let i = 0; i < 11; i++) {
    const m = baseFumaca.createInstance(`esboco-passeio-fumaca${i}`);
    m.isPickable = false;
    fumacas.push(m);
  }

  // os passageiros sentados, de braços para cima no "uiii"
  // (os braços abertos em V, bem para fora: com a cabeça grande do boneco, braço reto para cima
  // some atrás dela)
  const SENTADO: Juntas = { pernaD: -1.45, pernaE: -1.45, corpoY: -0.24, bdX: -0.2, beX: -0.2, bdZ: 2.35, beZ: -2.35, cabX: -0.12 };
  const passageiros: { g: Gente; carro: number; f: number }[] = [];
  const bento = criarGente(
    ctx,
    'bento-trem',
    'ferreiro',
    { corpo: 'masculino', pele: 3, rosto: 0, cabeloEstilo: 0, cabeloCor: 1, roupaEstilo: 0, acessorio: 'nenhum' },
    (p) => {
      vestirBento(p);
      // (no trem, sem o bumbo: as mãos estão para cima)
      for (let i = p.pecas.length - 1; i >= 0; i--)
        if (/^(bumbo|maceta)/.test(p.pecas[i].nome)) p.pecas.splice(i, 1);
    },
    SENTADO,
  );
  const menina = criarGente(
    ctx,
    'bruxinha-trem',
    'tecela',
    { corpo: 'feminino', pele: 6, rosto: 0, cabeloEstilo: 5, cabeloCor: 0, roupaEstilo: 0, acessorio: 'nenhum' },
    vestirBruxinha,
    SENTADO,
  );
  const menino = criarGente(
    ctx,
    'abobrinha-trem',
    'andarilho',
    { corpo: 'masculino', pele: 1, rosto: 0, cabeloEstilo: 1, cabeloCor: 3, roupaEstilo: 0, acessorio: 'nenhum' },
    vestirAbobrinha,
    SENTADO,
  );
  passageiros.push({ g: bento, carro: 1, f: 0 }, { g: menina, carro: 2, f: 1.1 }, { g: menino, carro: 3, f: 2.3 });
  for (const q of passageiros) raizes.push(q.g.boneco.raiz);

  const ondeCarro = (sFrente: number, c: Carro) => {
    const q = pontoDoTrilho(sFrente - c.atras);
    return { x: ox + q.x, z: oz + q.z, yaw: Math.atan2(q.dx, q.dz), dx: q.dx, dz: q.dz };
  };
  const sDoTrem = (t: number) => 42.5 + V_TREM * t;
  /** A câmera de agora é a de bordo? (a fumacinha se ajeita a ela) */
  let aBordoAgora = false;
  const quadroTrem = (t: number) => {
    const s = sDoTrem(t);
    for (const c of carros) {
      const p = ondeCarro(s, c);
      c.no.position.set(p.x, Y, p.z);
      c.no.rotation.y = p.yaw;
      c.sombra.position.set(p.x, Y + 0.03, p.z);
      c.sombra.rotation.y = p.yaw;
    }
    // os passageiros no banco de cada vagão (o assento a RT + 0,66), os braços balançando
    for (const q of passageiros) {
      const c = carros[q.carro];
      const p = ondeCarro(s, c);
      const g = q.g;
      // (o grandão um tico para a frente: as costas dele não entram no encosto)
      const atras = -0.36 + (g.escala - 1) * 0.3;
      const yA = RT + 0.66;
      // sentado (o corpo desce 0,24), o fundo da calça fica 0,12 abaixo do quadril: no assento
      const altura = Y + yA - g.escala * (g.quadril - 0.24 - 0.12);
      g.boneco.posicionar(p.x + p.dx * atras, altura, p.z + p.dz * atras, p.yaw);
      const pose = g.pose;
      const w = Math.sin(t * 5 + q.f);
      pose.bracoDireitoAbre = 2.35 - 0.06 + w * 0.16;
      pose.bracoEsquerdoAbre = 2.35 - 0.06 - w * 0.16;
      pose.cabecaLado = Math.sin(t * 2.2 + q.f) * 0.1;
      g.boneco.aplicarPose(pose);
    }
    // a fumacinha: bolinhas que saem da boca da chaminé, sobem um tico para trás, crescem e
    // somem ali perto (de brinquedo: nada de fiapos espalhados pelo caminho)
    const VIDA = 1.3;
    const pl0 = pontoDoTrilho(s);
    // dentro do túnel a chaminé descansa (nada de fumaça atravessando o teto)
    const noTunel = pl0.dx < -0.5 && pl0.x > TUNEL.x0 - 1.2 && pl0.x < TUNEL.x1 + 0.6;
    const bx = ox + pl0.x + pl0.dx * ZCH + pl0.dz * XCH;
    const bz = oz + pl0.z + pl0.dz * ZCH - pl0.dx * XCH;
    for (let i = 0; i < fumacas.length; i++) {
      const idade = (((t + (i * VIDA) / fumacas.length) % VIDA) + VIDA) % VIDA;
      const f = idade / VIDA;
      const atras = idade * 0.55;
      const x = bx - pl0.dx * atras;
      const z = bz - pl0.dz * atras;
      const r = 0.1 + f * 0.2;
      fumacas[i].position.set(x + Math.sin(i * 2.1) * 0.08 * f, Y + RT + 1.72 + f * 0.95, z + Math.cos(i * 1.7) * 0.08 * f);
      fumacas[i].rotation.y = i * 1.3 + f;
      // (com a câmera a bordo, sem fumacinha: o trem anda mais depressa do que ela sobe, e a
      // que ficava para trás passava enorme por cima da câmera)
      const aBordo = aBordoAgora;
      const some = noTunel || aBordo ? 0 : f > 0.7 ? 1 - (f - 0.7) / 0.3 : Math.min(1, f * 7);
      fumacas[i].scaling.setAll(Math.max(0.001, r * 1.6 * some));
    }
    // as fantasminhas acenam (o bracinho de fora para cima e para baixo) e flutuam
    for (const q of fantasminhas) {
      const b = q.b;
      b.raiz.position.set(q.x, q.y + Math.sin(t * 1.8 + q.f) * 0.06 - b.base * b.raiz.scaling.y, q.z);
      b.raiz.rotation.y = q.giro + Math.sin(t * 0.9 + q.f) * 0.12;
      const acena = Math.sin(t * 8 + q.f);
      // o direito no alto, balançando (o "oi!"); o esquerdo caído, mexendo um tiquinho
      q.ombros[0].rotation.z = -0.45 + acena * 0.38;
      q.ombros[1].rotation.z = 2.45 + Math.sin(t * 2 + q.f) * 0.08;
    }
  };

  // ================================================================ o relógio e as câmeras
  let t = 0;
  let rodando = false;
  const quadro = () => {
    quadroVassoura(t);
    quadroTrem(t);
  };
  scene.onBeforeRenderObservable.add(() => {
    if (!rodando) return;
    t += Math.min(0.1, scene.getEngine().getDeltaTime() / 1000);
    quadro();
  });
  let mostrando = false;
  const mostrar = (sim: boolean) => {
    mostrando = sim;
    for (const r of raizes) r.setEnabled(sim);
    sombraVassoura.setEnabled(sim);
    for (const c of carros) c.sombra.setEnabled(sim);
    for (const f of fumacas) f.setEnabled(sim);
  };
  // nas tomadas dos passeios, o Bento do palco sai (ele vai no trem: aparecia duas vezes, com a
  // abóbora gigante pousada na cabeça) e a Lulu também (de costas, ao fundo da rua, o capuz
  // dela sem rosto lia como um vulto)
  scene.onBeforeRenderObservable.add(() => {
    if (!mostrando) return;
    for (const m of scene.meshes)
      if ((m.name.startsWith('esboco-bento') || m.name.startsWith('esboco-lulu')) && m.isVisible) m.isVisible = false;
  });
  quadro();

  const api: Passeios = {
    relogio(tt, sim) {
      t = tt;
      tAnterior = -1;
      rodando = sim;
      quadro();
    },
    agora: () => t,
    mostrar,
    hora(noite) {
      const l = noite ? 0.8 : 1;
      for (const g of [bruxinha, bento, menina, menino]) g.boneco.definirLuz(l);
      for (const q of fantasminhas) {
        const [p, su, fo] = q.b.materiais;
        p.diffuseColor.set(l * 0.78, l * 0.78, l * 0.78);
        p.emissiveColor.set(l * 0.36, l * 0.36, l * 0.36);
        su.diffuseColor.set(l * 0.78, l * 0.78, l * 0.78);
        fo.diffuseColor.set(l * 0.78, l * 0.78, l * 0.78);
      }
      for (const h of halos) h.setEnabled(noite);
      matFumaca.emissiveColor.set(noite ? 0.62 : 0.55, noite ? 0.58 : 0.53, noite ? 0.72 : 0.6);
    },
    camera(qual, tipo) {
      aBordoAgora = qual === 'bordo';
      const em = tipo === 'empe';
      if (qual === 'vassoura' || qual === 'vassouraFrente') {
        const v = ondeVassoura(t);
        const sx = Math.sin(v.yaw);
        const cz = Math.cos(v.yaw);
        // de lado e à frente (do lado da praça, as casinhas atrás), por dentro da fila dos
        // postes (de mais longe, cada poste passava tapando tudo): vê o rosto, o guidão, o pé
        // levantado e o rastro
        const frente = qual === 'vassouraFrente' ? 4.2 : 3.4;
        const longe = em ? 1.3 : 1.15;
        // (revisor: o chapéu saía cortado no alto; a câmera sobe e mira mais alto)
        const pos: V3 = [v.x + sx * frente - cz * longe, Y + (em ? 1.5 : 1.4), v.z + cz * frente + sx * longe];
        const alvo: V3 = [v.x - sx * 0.5, Y + (em ? 1.1 : 1.05), v.z - cz * 0.5];
        return { pos, alvo, fov: em ? 68 : 55 };
      }
      if (qual === 'vassouraPerto') {
        const v = ondeVassoura(t);
        const sx = Math.sin(v.yaw);
        const cz = Math.cos(v.yaw);
        const longe = em ? 2.9 : 2.5;
        const pos: V3 = [v.x + sx * 2.0 - cz * longe, Y + 1.45, v.z + cz * 2.0 + sx * longe];
        const alvo: V3 = [v.x - sx * 0.2, Y + 1.05, v.z - cz * 0.2];
        return { pos, alvo, fov: em ? 68 : 55 };
      }
      if (qual === 'trem') {
        // do gramado ao sudoeste, de longe: o túnel inteiro e o trem inteiro, a locomotiva
        // sem cortar na beira
        const pos: V3 = [ox + TCX - (em ? 11 : 13), Y + (em ? 3.4 : 3.1), oz + TUNEL.z + (em ? 10.5 : 9)];
        const alvo: V3 = [ox + TCX - (em ? 6 : 5), Y + 0.9, oz + TUNEL.z - 0.8];
        return { pos, alvo, fov: em ? 66 : 50 };
      }
      if (qual === 'tremSegue') {
        // o vídeo de fora: a câmera anda no gramado ao sul do trilho, um pouco à frente da
        // locomotiva, e olha para ela (a carinha aparece chegando e saindo do túnel)
        const p = ondeCarro(sDoTrem(t), carros[0]);
        // (até cx + 8: mais para o leste, a árvore da beira passava na frente da câmera)
        const cx = Math.max(ox + TCX - 15, Math.min(ox + TCX + 8, p.x - 5));
        const pos: V3 = [cx, Y + 2.0, oz + TUNEL.z + 6.2];
        const alvo: V3 = [p.x + 1.2, Y + 1.0, p.z];
        return { pos, alvo, fov: em ? 66 : 52 };
      }
      if (qual === 'tremPerto') {
        // de frente para a boca de saída: a locomotiva-abóbora saindo do túnel, sorrindo
        // (olhando para o nordeste: a lua, baixa no leste, fica fora do quadro)
        const pos: V3 = [ox + TUNEL.x0 - 5.4, Y + 1.45, oz + TUNEL.z + (em ? 4.4 : 3.9)];
        const alvo: V3 = [ox + TUNEL.x0 + 0.3, Y + 1.2, oz + TUNEL.z - 0.1];
        return { pos, alvo, fov: em ? 70 : 52 };
      }
      if (qual === 'tunelDentro') {
        // da boca de entrada, olhando para dentro do túnel com o trem lá no meio: a folga entre o
        // alto dos passageiros (de costas, braços para cima) e o teto
        const pos: V3 = [ox + TUNEL.x1 + 1.7, Y + 1.75, oz + TUNEL.z + 0.55];
        const alvo: V3 = [ox + TUNEL.x1 - 3.5, Y + 2.3, oz + TUNEL.z];
        return { pos, alvo, fov: em ? 78 : 62 };
      }
      if (qual === 'bordo') {
        // a bordo, na cabine da locomotiva (o lugar do maquinista): por cima da abóbora, a
        // chaminé soltando fumacinha e o túnel chegando (de trás, a cabeça grande dos
        // passageiros tapava tudo)
        // (por cima da abóbora, na frente do telhado da cabine, que fica fora do quadro; um tico
        // para o lado contrário da chaminé, que sai do meio do quadro)
        const s = sDoTrem(t) - 0.6;
        const q = pontoDoTrilho(s);
        const a = pontoDoTrilho(s + 10);
        const lado = -0.2;
        const pos: V3 = [ox + q.x + q.dz * lado, Y + RT + 2.35, oz + q.z - q.dx * lado];
        const alvo: V3 = [ox + a.x, Y + 1.0, oz + a.z];
        return { pos, alvo, fov: em ? 80 : 66 };
      }
      if (qual === 'bosque') {
        // o passeio noturno pela trilha do bosque, para o norte (−z), devagar
        // (revisor: passava raspando nos postes; os postes ficam a 3 do meio, um de cada lado,
        // a cada 7 blocos: a câmera desvia para o lado contrário do poste que vem, ~4 dele)
        // (começa logo depois de um poste, que fica para trás: nada de lampião cortado no começo)
        const z = 62 - 2.0 * t;
        // (o desvio maior vem uns 3 blocos antes do poste, quando ele está entrando no quadro)
        const desvia = (zz: number) => -1.2 * Math.cos((Math.PI * (83 - (zz - 3))) / 7);
        const x = ctx.trilha(z) + 0.5 + desvia(z);
        const za = z - 9;
        const pos: V3 = [ox + x, Y + 1.55, oz + z];
        const alvo: V3 = [ox + ctx.trilha(za) + 0.5 + desvia(za) * 0.4, Y + 1.6, oz + za];
        // (mais fechada: o lampião que vem de lado não entra cortado na beira de cima)
        return { pos, alvo, fov: em ? 66 : 50 };
      }
      return null;
    },
  };
  mostrar(false);
  api.hora(false);
  return api;
}
