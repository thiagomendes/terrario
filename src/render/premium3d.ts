/**
 * Spec 023: os três premium do esboço (rodada 2), guardados aqui para a fase C (T10 a T13),
 * que os liga à aparência e à rede e faz o acabamento pedido pelo dono. Ainda ninguém usa.
 * Tudo procedural, feito aqui (peças de plástico da 012, desenho das texturas em canvas):
 * Tudo procedural, feito aqui (peças de plástico da 012, desenho das texturas em canvas):
 *
 * - **Tênis-cometa:** tênis de brinquedo com a faixa de luz que corre o arco-íris e, andando,
 *   deixa pegadas de luz no chão e estrelinhas a cada passo; ao cair de um pulo, um anel de
 *   estrelinhas.
 * - **Dragãozinho:** a fantasia (capuz com espinhos da 017, nas cores do dragão) mais as asas
 *   que batem (devagar parado, rápido correndo, forte no ar), a placa de escamas que brilha na
 *   barriga e os chifrinhos de ouro.
 * - **Unicórnio-pônei:** um bichinho que não existe no jogo e segue a criança. Trota, respira,
 *   pisca, balança o rabo de arco-íris, faz charme com o chifre que solta brilho, pula junto
 *   quando ela pula e, quando ela para perto, olha para ela e solta coraçõezinhos.
 *
 * Os itens vão em qualquer boneco (o da criança e o dos amigos): o esboço acha as juntas pelo
 * nome. Na implementação de verdade, o que está vestido vai na aparência (já vai pela rede) e
 * cada aparelho desenha igual.
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import type { Scene } from '@babylonjs/core/scene';
import {
  caixaArredondada,
  cilindro,
  corViva,
  criarPlasticos,
  dadosPlaca,
  esfera,
  type Plasticos,
} from './formas';

export type ItemPremium3d = 'tenis-cometa' | 'dragao' | 'unicornio';

const ARCO = ['#ff5a6e', '#ffa53d', '#ffe14d', '#5fe07a', '#4dc3ff', '#9a7bff', '#ff7ad9'];

// ------------------------------------------------------------------ texturas (canvas)
function texturaBrilho(
  scene: Scene,
  nome: string,
  desenhar: (c: CanvasRenderingContext2D, t: number) => void,
): DynamicTexture {
  const t = new DynamicTexture(nome, { width: 128, height: 128 }, scene, true);
  const c = t.getContext() as unknown as CanvasRenderingContext2D;
  c.clearRect(0, 0, 128, 128);
  desenhar(c, 128);
  t.hasAlpha = true;
  t.update();
  return t;
}

function estrelaQuatro(c: CanvasRenderingContext2D, t: number): void {
  const m = t / 2;
  const g = c.createRadialGradient(m, m, 0, m, m, m);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, t, t);
  c.fillStyle = '#fff';
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const r = i % 2 ? t * 0.07 : t * 0.47;
    c.lineTo(m + Math.cos(a) * r, m + Math.sin(a) * r);
  }
  c.fill();
}

function coracao(c: CanvasRenderingContext2D, t: number): void {
  c.fillStyle = '#fff';
  c.beginPath();
  const s = t / 64;
  c.moveTo(32 * s, 56 * s);
  c.bezierCurveTo(6 * s, 40 * s, 4 * s, 22 * s, 16 * s, 14 * s);
  c.bezierCurveTo(24 * s, 9 * s, 30 * s, 14 * s, 32 * s, 20 * s);
  c.bezierCurveTo(34 * s, 14 * s, 40 * s, 9 * s, 48 * s, 14 * s);
  c.bezierCurveTo(60 * s, 22 * s, 58 * s, 40 * s, 32 * s, 56 * s);
  c.fill();
}

function pegada(c: CanvasRenderingContext2D, t: number): void {
  // a sola do tênis vista de cima, com o halo
  const g = c.createRadialGradient(t / 2, t / 2, 4, t / 2, t / 2, t / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, t, t);
  c.fillStyle = '#fff';
  c.beginPath();
  c.ellipse(t / 2, t * 0.36, t * 0.17, t * 0.2, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(t / 2, t * 0.7, t * 0.13, t * 0.14, 0, 0, Math.PI * 2);
  c.fill();
}

// ------------------------------------------------------------------ brilhos (pool de sprites)
interface Sprite {
  m: Mesh;
  vida: number;
  dura: number;
  v: Vector3;
  tam: number;
  gira: number;
  gravidade: number;
}

function criarBrilhos(scene: Scene, quantos = 70) {
  const texEstrela = texturaBrilho(scene, 'premium-estrela', estrelaQuatro);
  const texCoracao = texturaBrilho(scene, 'premium-coracao', coracao);
  const mats = new Map<string, StandardMaterial>();
  const mat = (cor: string, coracaoTex: boolean) => {
    const k = `${cor}|${coracaoTex}`;
    let m = mats.get(k);
    if (!m) {
      m = new StandardMaterial(`premium-brilho-${k}`, scene);
      const tex = coracaoTex ? texCoracao : texEstrela;
      m.diffuseTexture = tex;
      m.opacityTexture = tex;
      m.disableLighting = true;
      m.emissiveColor = Color3.FromHexString(cor);
      m.backFaceCulling = false;
      mats.set(k, m);
    }
    return m;
  };
  const livres: Sprite[] = [];
  const vivos: Sprite[] = [];
  for (let i = 0; i < quantos; i++) {
    const m = MeshBuilder.CreatePlane(`premium-brilho-${i}`, { size: 1 }, scene);
    m.billboardMode = Mesh.BILLBOARDMODE_ALL;
    m.isPickable = false;
    m.setEnabled(false);
    livres.push({ m, vida: 0, dura: 1, v: new Vector3(), tam: 0.2, gira: 0, gravidade: 0 });
  }
  return {
    soltar(
      p: Vector3,
      op: {
        cor?: string;
        v?: Vector3;
        tam?: number;
        dura?: number;
        coracao?: boolean;
        gravidade?: number;
      } = {},
    ) {
      const s = livres.pop() ?? vivos.shift();
      if (!s) return;
      s.m.material = mat(op.cor ?? ARCO[Math.floor(Math.random() * ARCO.length)], !!op.coracao);
      s.m.position.copyFrom(p);
      s.v.copyFrom(
        op.v ??
          new Vector3(
            (Math.random() - 0.5) * 0.6,
            0.6 + Math.random() * 0.6,
            (Math.random() - 0.5) * 0.6,
          ),
      );
      s.tam = op.tam ?? 0.16 + Math.random() * 0.1;
      s.dura = op.dura ?? 0.9 + Math.random() * 0.5;
      s.vida = 0;
      s.gira = (Math.random() - 0.5) * 6;
      s.gravidade = op.gravidade ?? -0.8;
      s.m.setEnabled(true);
      vivos.push(s);
    },
    quadro(dt: number) {
      for (let i = vivos.length - 1; i >= 0; i--) {
        const s = vivos[i];
        s.vida += dt;
        const f = s.vida / s.dura;
        if (f >= 1) {
          s.m.setEnabled(false);
          vivos.splice(i, 1);
          livres.push(s);
          continue;
        }
        s.v.y += s.gravidade * dt;
        s.m.position.addInPlace(s.v.scale(dt));
        // nasce crescendo, cintila e some
        const k =
          (f < 0.15 ? f / 0.15 : 1 - (f - 0.15) / 0.85) * (0.85 + 0.15 * Math.sin(s.vida * 30));
        s.m.scaling.setAll(Math.max(0.001, s.tam * k));
        s.m.rotation.z += s.gira * dt;
      }
    },
  };
}
type Brilhos = ReturnType<typeof criarBrilhos>;

// ------------------------------------------------------------------ pegadas de luz
function criarPegadas(scene: Scene, quantas = 14) {
  const tex = texturaBrilho(scene, 'premium-pegada', pegada);
  const mats = ARCO.map((cor, i) => {
    const m = new StandardMaterial(`premium-pegada-${i}`, scene);
    m.diffuseTexture = tex;
    m.opacityTexture = tex;
    m.disableLighting = true;
    m.emissiveColor = Color3.FromHexString(cor);
    m.backFaceCulling = false;
    m.zOffset = -2;
    return m;
  });
  const lista = Array.from({ length: quantas }, (_, i) => {
    const m = MeshBuilder.CreatePlane(`premium-pegada-${i}`, { size: 1 }, scene);
    m.rotation.x = Math.PI / 2;
    m.isPickable = false;
    m.setEnabled(false);
    return { m, vida: 99 };
  });
  let k = 0;
  let cor = 0;
  return {
    marcar(x: number, y: number, z: number, yaw: number) {
      const p = lista[k++ % lista.length];
      p.m.position.set(x, y + 0.02, z);
      p.m.rotation.y = yaw;
      p.m.scaling.set(0.34, 0.5, 1);
      p.m.material = mats[cor++ % mats.length];
      p.m.visibility = 1;
      p.vida = 0;
      p.m.setEnabled(true);
    },
    quadro(dt: number) {
      for (const p of lista) {
        if (p.vida > 2.4) continue;
        p.vida += dt;
        p.m.visibility = Math.max(0, 1 - p.vida / 2.4) * 0.95;
        if (p.vida > 2.4) p.m.setEnabled(false);
      }
    },
  };
}

// ------------------------------------------------------------------ peças auxiliares
function pintarDegrade(m: Mesh, cor: (x: number, y: number) => string): void {
  const pos = m.getVerticesData(VertexBuffer.PositionKind)!;
  const n = pos.length / 3;
  const cores = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const [r, g, b] = corViva(cor(pos[i * 3], pos[i * 3 + 1]));
    cores.set([r, g, b, 1], i * 4);
  }
  m.setVerticesData(VertexBuffer.ColorKind, cores, false, 4);
}

function misturar(a: string, b: string, t: number): string {
  const ca = Color3.FromHexString(a);
  const cb = Color3.FromHexString(b);
  return Color3.Lerp(ca, cb, Math.max(0, Math.min(1, t))).toHexString();
}

function luz(scene: Scene, nome: string, cor: string): StandardMaterial {
  const m = new StandardMaterial(nome, scene);
  m.disableLighting = true;
  m.emissiveColor = Color3.FromHexString(cor);
  return m;
}

// ------------------------------------------------------------------ tênis-cometa
function montarTenis(scene: Scene, mats: Plasticos, perna: TransformNode, lado: number) {
  const quadril = perna.position.y;
  const no = new TransformNode(`premium-tenis-${lado}`, scene);
  no.parent = perna;
  no.position.set(0, -quadril + 0.07, 0.035);
  const sola = caixaArredondada(
    'premium-tenis-sola',
    scene,
    0.26,
    0.065,
    0.35,
    0.03,
    mats.cor('#fbfbff', 0.5),
  );
  sola.parent = no;
  sola.position.y = -0.04;
  const cano = caixaArredondada(
    'premium-tenis-cano',
    scene,
    0.24,
    0.12,
    0.3,
    0.06,
    mats.cor('#6a4cff', 0.55),
  );
  cano.parent = no;
  cano.position.set(0, 0.06, -0.015);
  const bico = esfera('premium-tenis-bico', scene, 0.12, mats.cor('#fbfbff', 0.5), [1, 0.55, 0.75]);
  bico.parent = no;
  bico.position.set(0, 0.02, 0.12);
  const lingua = caixaArredondada(
    'premium-tenis-lingua',
    scene,
    0.12,
    0.08,
    0.05,
    0.02,
    mats.cor('#ff5aa8', 0.5),
  );
  lingua.parent = no;
  lingua.position.set(0, 0.125, -0.03);
  for (let i = 0; i < 3; i++) {
    const c = caixaArredondada(
      'premium-tenis-cadarco',
      scene,
      0.15,
      0.02,
      0.03,
      0.01,
      mats.cor('#ffffff', 0.3),
    );
    c.parent = no;
    c.position.set(0, 0.123 - i * 0.008, 0.02 + i * 0.045);
  }
  // a faixa de luz em volta da sola (a cor corre o arco-íris) e a estrela do lado
  const faixa = caixaArredondada(
    'premium-tenis-luz',
    scene,
    0.278,
    0.04,
    0.372,
    0.018,
    luz(scene, `premium-tenis-luz-${lado}`, '#ff5a6e'),
  );
  faixa.parent = no;
  faixa.position.y = -0.002;
  const pontas: Array<[number, number]> = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 0.022 : 0.05;
    pontas.push([Math.cos(a) * r, -Math.sin(a) * r]);
  }
  const estrelas: Mesh[] = [];
  for (const s of [-1, 1]) {
    const e = new Mesh('premium-tenis-estrela', scene);
    dadosPlaca(pontas, 0.012).applyToMesh(e);
    e.material = luz(scene, `premium-tenis-estrela-${lado}-${s}`, '#ffe14d');
    e.parent = no;
    e.rotation.y = Math.PI / 2;
    e.position.set(s * 0.123, 0.065, -0.03);
    e.isPickable = false;
    estrelas.push(e);
  }
  return { no, faixa: faixa.material as StandardMaterial, estrelas };
}

// ------------------------------------------------------------------ dragãozinho
/** A asa (a raiz no 0,0; a ponta para +x): o pulso, a ponta e os dois dedos, e o contorno. */
const PULSO: [number, number] = [0.3, 0.36];
const PONTAS: Array<[number, number]> = [
  [0.78, 0.52],
  [0.74, 0.16],
  [0.5, -0.04],
];
const RAIZ_BAIXO: [number, number] = [0.06, -0.12];

/** Contorno da membrana: do ombro ao pulso, às pontas (com o recorte entre elas) e de volta. */
function contornoAsa(): Array<[number, number]> {
  const pts: Array<[number, number]> = [[0, 0.06], PULSO, PONTAS[0]];
  const recorte = (a: [number, number], b: [number, number]) => {
    // o recorte entre duas pontas: uma curva para dentro (puxada para o pulso)
    for (let i = 1; i < 6; i++) {
      const t = i / 6;
      const x = a[0] + (b[0] - a[0]) * t;
      const y = a[1] + (b[1] - a[1]) * t;
      const k = Math.sin(t * Math.PI) * 0.28;
      pts.push([x + (PULSO[0] - x) * k, y + (PULSO[1] - y) * k]);
    }
    pts.push(b);
  };
  recorte(PONTAS[0], PONTAS[1]);
  recorte(PONTAS[1], PONTAS[2]);
  recorte(PONTAS[2], RAIZ_BAIXO);
  return pts;
}

/** Um osso arredondado de a até b (cilindro com bolinhas nas pontas). */
function osso(
  scene: Scene,
  pai: TransformNode,
  mat: StandardMaterial,
  a: [number, number],
  b: [number, number],
  r: number,
  s: number,
): void {
  const dx = (b[0] - a[0]) * s;
  const dy = b[1] - a[1];
  const comp = Math.hypot(dx, dy);
  const c = cilindro('premium-asa-osso', scene, comp, r, r * 0.8, mat);
  c.parent = pai;
  c.position.set(a[0] * s + dx / 2, a[1] + dy / 2, 0);
  c.rotation.z = -Math.atan2(dx, dy);
  for (const [px, py, rr] of [
    [a[0], a[1], r * 1.15],
    [b[0], b[1], r * 1.05],
  ] as const) {
    const bola = esfera('premium-asa-junta', scene, rr, mat);
    bola.parent = pai;
    bola.position.set(px * s, py, 0);
  }
}

function montarDragao(scene: Scene, mats: Plasticos, juntas: Record<string, TransformNode>) {
  const capa = juntas.capa ?? juntas.tronco;
  const asas: TransformNode[] = [];
  const contorno = contornoAsa();
  const ouro = mats.cor('#ffc93d', 0.85);
  for (const s of [-1, 1]) {
    const pivo = new TransformNode(`premium-asa-${s}`, scene);
    pivo.parent = capa;
    pivo.position.set(s * 0.06, 0.02, -0.04);
    pivo.scaling.setAll(1.35);
    const asa = new Mesh('premium-asa', scene);
    const perfil = contorno.map(([x, y]) => [x * s, y] as [number, number]);
    dadosPlaca(s < 0 ? [...perfil].reverse() : perfil, 0.016).applyToMesh(asa);
    // a membrana: verde-água perto do corpo, violeta no meio e rosa nas pontas
    pintarDegrade(asa, (x, y) => {
      const d = Math.hypot(x, y - 0.1) / 0.8;
      return d < 0.5
        ? misturar('#34d6b4', '#8a6aff', d / 0.5)
        : misturar('#8a6aff', '#ff86d6', (d - 0.5) / 0.5);
    });
    asa.material = mats.tinta(0.75);
    asa.parent = pivo;
    asa.isPickable = false;
    // os ossos de ouro: o braço até o pulso, e do pulso a cada ponta
    osso(scene, pivo, ouro, [0, 0.06], PULSO, 0.03, s);
    for (const p of PONTAS) osso(scene, pivo, ouro, PULSO, p, p === PONTAS[0] ? 0.022 : 0.016, s);
    asas.push(pivo);
  }
  // barriga clara com as dobrinhas de escama (macia, sem brilho: o brilho é das asas)
  const tronco = juntas.tronco;
  for (let i = 0; i < 3; i++) {
    const d = caixaArredondada(
      'premium-dragao-dobra',
      scene,
      0.2 - i * 0.03,
      0.016,
      0.02,
      0.008,
      mats.cor('#8fe0c6', 0.4),
    );
    d.parent = tronco;
    d.position.set(0, 0.29 - i * 0.07, 0.2);
  }
  const brilhoPlaca = luz(scene, 'premium-dragao-pontas', '#ffe27a');
  const cabeca = juntas.cabeca;
  for (const s of [-1, 1]) {
    const chifre = cilindro('premium-dragao-chifre', scene, 0.2, 0.055, 0.008, ouro);
    chifre.parent = cabeca;
    chifre.position.set(s * 0.21, 0.44, -0.06);
    chifre.rotation.set(-0.45, 0, -s * 0.4);
    // a pontinha do chifre brilha
    const ponta = esfera('premium-dragao-ponta', scene, 0.018, brilhoPlaca);
    ponta.parent = chifre;
    ponta.position.y = 0.1;
  }
  return { asas, brilhoPlaca };
}

// ------------------------------------------------------------------ unicórnio-pônei
function montarUnicornio(scene: Scene, mats: Plasticos) {
  const raiz = new TransformNode('premium-unicornio', scene);
  const corpo = new TransformNode('premium-unicornio-corpo', scene);
  corpo.parent = raiz;
  const branco = mats.cor('#fff8ff', 0.45);
  const lilas = mats.cor('#f1dcff', 0.4);
  const ouro = mats.cor('#ffc93d', 0.85);
  const tronco = caixaArredondada('premium-uni-tronco', scene, 0.44, 0.38, 0.58, 0.17, branco);
  tronco.parent = corpo;
  tronco.position.y = 0.44;
  const barriga = caixaArredondada('premium-uni-barriga', scene, 0.34, 0.08, 0.5, 0.04, lilas);
  barriga.parent = corpo;
  barriga.position.y = 0.27;
  // pernas (pivô no alto) com cascos de ouro
  const pernas: TransformNode[] = [];
  for (const [x, z] of [
    [-0.12, 0.2],
    [0.12, 0.2],
    [-0.12, -0.2],
    [0.12, -0.2],
  ] as const) {
    const p = new TransformNode('premium-uni-pivo-perna', scene);
    p.parent = corpo;
    p.position.set(x * 1.1, 0.34, z * 0.95);
    const perna = caixaArredondada('premium-uni-perna', scene, 0.13, 0.24, 0.13, 0.055, branco);
    perna.parent = p;
    perna.position.y = -0.14;
    const casco = caixaArredondada('premium-uni-casco', scene, 0.135, 0.07, 0.135, 0.03, ouro);
    casco.parent = p;
    casco.position.y = -0.3;
    pernas.push(p);
  }
  // pescoço e cabeça
  const pesco = new TransformNode('premium-uni-pescoco', scene);
  pesco.parent = corpo;
  pesco.position.set(0, 0.54, 0.22);
  const pescoco = caixaArredondada('premium-uni-pescoco-m', scene, 0.22, 0.28, 0.22, 0.09, branco);
  pescoco.parent = pesco;
  pescoco.position.set(0, 0.1, 0.03);
  pescoco.rotation.x = 0.35;
  const cab = new TransformNode('premium-uni-cabeca', scene);
  cab.parent = pesco;
  cab.position.set(0, 0.3, 0.12);
  const cabeca = caixaArredondada('premium-uni-cabeca-m', scene, 0.4, 0.37, 0.38, 0.16, branco);
  cabeca.parent = cab;
  const focinho = caixaArredondada(
    'premium-uni-focinho',
    scene,
    0.28,
    0.2,
    0.18,
    0.09,
    mats.cor('#ffd3e6', 0.4),
  );
  focinho.parent = cab;
  focinho.position.set(0, -0.09, 0.21);
  for (const s of [-1, 1]) {
    const narina = esfera('premium-uni-narina', scene, 0.018, mats.cor('#d97a9f', 0.2));
    narina.parent = cab;
    narina.position.set(s * 0.06, -0.06, 0.3);
  }
  // olhos grandes de bichinho, com brilho e cílios; bochechas rosadas
  const olhos: Mesh[] = [];
  for (const s of [-1, 1]) {
    const olho = esfera('premium-uni-olho', scene, 0.07, mats.cor('#2a1d3a', 0.9), [0.72, 1, 0.5]);
    olho.parent = cab;
    olho.position.set(s * 0.145, 0.04, 0.165);
    olhos.push(olho);
    const b1 = esfera(
      'premium-uni-brilho',
      scene,
      0.02,
      luz(scene, 'premium-uni-brilho', '#ffffff'),
    );
    b1.parent = olho;
    b1.position.set(s * 0.014, 0.028, 0.035);
    const cilio = caixaArredondada(
      'premium-uni-cilio',
      scene,
      0.06,
      0.012,
      0.012,
      0.005,
      mats.cor('#2a1d3a', 0.3),
    );
    cilio.parent = cab;
    cilio.position.set(s * 0.185, 0.11, 0.15);
    cilio.rotation.z = s * 0.5;
    const boch = esfera(
      'premium-uni-bochecha',
      scene,
      0.04,
      mats.cor('#ffa8c8', 0.2),
      [1, 0.6, 0.3],
    );
    boch.parent = cab;
    boch.position.set(s * 0.17, -0.07, 0.16);
  }
  const orelhas: Mesh[] = [];
  for (const s of [-1, 1]) {
    const o = caixaArredondada('premium-uni-orelha', scene, 0.07, 0.13, 0.05, 0.03, branco);
    o.parent = cab;
    o.position.set(s * 0.13, 0.23, -0.06);
    o.rotation.z = -s * 0.25;
    orelhas.push(o);
  }
  // o chifre em espiral de ouro (brilha)
  const chifre = cilindro('premium-uni-chifre', scene, 0.32, 0.055, 0.006, ouro);
  chifre.parent = cab;
  chifre.position.set(0, 0.32, 0.08);
  chifre.rotation.x = 0.35;
  const brilhoChifre = luz(scene, 'premium-uni-chifre-luz', '#fff1a8');
  for (let i = 0; i < 3; i++) {
    const anel = MeshBuilder.CreateTorus(
      'premium-uni-espiral',
      { diameter: 0.095 - i * 0.026, thickness: 0.014, tessellation: 18 },
      scene,
    );
    anel.material = brilhoChifre;
    anel.parent = chifre;
    anel.position.y = -0.09 + i * 0.07;
    anel.rotation.x = 0.25;
    anel.isPickable = false;
  }
  // a crina de arco-íris (do topete às costas) e o rabo em mechas
  const crina: Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const m = caixaArredondada(
      'premium-uni-crina',
      scene,
      0.09,
      0.15,
      0.1,
      0.045,
      mats.cor(ARCO[i], 0.45),
    );
    if (i === 0) {
      m.parent = cab;
      m.position.set(0, 0.2, 0.13);
      m.rotation.x = 0.6;
    } else {
      m.parent = pesco;
      m.position.set(0, 0.42 - i * 0.07, -0.08 - i * 0.02);
      m.rotation.x = -0.4;
    }
    crina.push(m);
  }
  const rabo: TransformNode[] = [];
  let pai: TransformNode = corpo;
  for (let i = 0; i < 4; i++) {
    const n = new TransformNode('premium-uni-rabo', scene);
    n.parent = pai;
    if (i === 0) n.position.set(0, 0.52, -0.3);
    else n.position.set(0, -0.11, -0.03);
    const mecha = caixaArredondada(
      'premium-uni-mecha',
      scene,
      0.12 - i * 0.012,
      0.14,
      0.1,
      0.05,
      mats.cor(ARCO[(i * 2) % ARCO.length], 0.45),
    );
    mecha.parent = n;
    mecha.position.y = -0.05;
    rabo.push(n);
    pai = n;
  }
  for (const m of raiz.getChildMeshes()) m.isPickable = false;
  return { raiz, corpo, pernas, pesco, cab, olhos, orelhas, rabo, brilhoChifre, chifre };
}

// ------------------------------------------------------------------ o gerente
interface Usuario {
  id: string;
  raiz: TransformNode;
  itens: Set<ItemPremium3d>;
  juntas: Record<string, TransformNode>;
  tenis?: ReturnType<typeof montarTenis>[];
  dragao?: ReturnType<typeof montarDragao>;
  pet?: ReturnType<typeof montarUnicornio> & {
    x: number;
    y: number;
    z: number;
    yaw: number;
    vy: number;
    noAr: boolean;
    fase: number;
  };
  anterior: Vector3;
  vel: number;
  vy: number;
  andado: number;
  pe: number;
  noAr: boolean;
  parado: number;
  proximaGraca: number;
  coracaoFeito: boolean;
}

const SOLIDO_NAO = new Set([
  0, 8, 9, 10, 33, 37, 54, 67, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
]);

export function criarPremium3d(scene: Scene) {
  const mats = criarPlasticos(scene, 'premium');
  const brilhos: Brilhos = criarBrilhos(scene);
  const pegadas = criarPegadas(scene);
  const usuarios = new Map<string, Usuario>();
  let t = 0;

  function juntasDe(raiz: TransformNode): Record<string, TransformNode> {
    const r: Record<string, TransformNode> = {};
    for (const n of raiz.getDescendants(false)) {
      const m = /-junta-(\w+)$/.exec(n.name);
      if (m) r[m[1]] = n as TransformNode;
    }
    return r;
  }

  function chao(x: number, y: number, z: number): number {
    const b = window.__brumaluz?.bloco;
    if (!b) return y;
    for (let yy = Math.floor(y + 2); yy > y - 8; yy--) {
      const id = b(Math.floor(x), yy, Math.floor(z));
      if (id !== undefined && id !== null && !SOLIDO_NAO.has(id)) return yy + 1;
    }
    return y;
  }

  function montar(u: Usuario): void {
    u.juntas = juntasDe(u.raiz);
    if (u.itens.has('tenis-cometa') && u.juntas.pernaE && u.juntas.pernaD)
      u.tenis = [
        montarTenis(scene, mats, u.juntas.pernaE, -1),
        montarTenis(scene, mats, u.juntas.pernaD, 1),
      ];
    if (u.itens.has('dragao') && u.juntas.tronco) u.dragao = montarDragao(scene, mats, u.juntas);
    if (u.itens.has('unicornio') && !u.pet) {
      const p = montarUnicornio(scene, mats);
      const r = u.raiz.position;
      u.pet = { ...p, x: r.x - 1.6, y: r.y, z: r.z - 1, yaw: 0, vy: 0, noAr: false, fase: 0 };
      p.raiz.position.set(u.pet.x, u.pet.y, u.pet.z);
      p.raiz.scaling.setAll(1.15);
    }
  }

  function desmontar(u: Usuario, tudo = false): void {
    for (const tn of u.tenis ?? []) tn.no.dispose(false, false);
    u.tenis = undefined;
    if (u.dragao) {
      for (const a of u.dragao.asas) a.dispose(false, false);
      // placa, escamas e chifres ficam presos nas juntas: some com elas
      for (const n of [u.juntas.tronco, u.juntas.cabeca])
        for (const m of n?.getChildMeshes(true) ?? [])
          if (m.name.startsWith('premium-')) m.dispose();
    }
    u.dragao = undefined;
    if (tudo && u.pet) {
      u.pet.raiz.dispose(false, false);
      u.pet = undefined;
    }
  }

  function vestir(id: string, raiz: TransformNode, itens: ItemPremium3d[]): void {
    let u = usuarios.get(id);
    if (u) desmontar(u, !itens.includes('unicornio'));
    else {
      u = {
        id,
        raiz,
        itens: new Set(),
        juntas: {},
        anterior: raiz.position.clone(),
        vel: 0,
        vy: 0,
        andado: 0,
        pe: 0,
        noAr: false,
        parado: 0,
        proximaGraca: 4,
        coracaoFeito: true,
      };
      usuarios.set(id, u);
    }
    u.raiz = raiz;
    u.itens = new Set(itens);
    montar(u);
  }

  function quadroUsuario(u: Usuario, dt: number): void {
    // o boneco remonta as juntas quando a aparência muda: monta de novo nas novas
    const j = u.juntas.pernaE ?? u.juntas.tronco;
    if (!j || j.isDisposed() || (u.tenis && u.tenis[0].no.isDisposed())) {
      desmontar(u);
      montar(u);
    }
    const r = u.raiz.getAbsolutePosition();
    const dx = r.x - u.anterior.x;
    const dz = r.z - u.anterior.z;
    const dy = r.y - u.anterior.y;
    u.anterior.copyFrom(r);
    if (dt <= 0) return;
    const vel = Math.hypot(dx, dz) / dt;
    if (vel > 30) return; // teleporte
    u.vel += (vel - u.vel) * Math.min(1, dt * 8);
    u.vy = dy / dt;
    const yaw = u.raiz.rotation.y;
    const chaoAqui = chao(r.x, r.y + 0.5, r.z);
    const noAr = r.y - chaoAqui > 0.25;
    const pousou = u.noAr && !noAr;
    u.noAr = noAr;
    u.parado = u.vel < 0.3 ? u.parado + dt : 0;

    // ---------------------------------------------------- tênis
    if (u.tenis) {
      const cor = Color3.FromHSV((t * 140) % 360, 0.55, 1);
      for (const tn of u.tenis) {
        tn.faixa.emissiveColor.copyFrom(cor.scale(u.vel > 0.5 ? 1.7 : 1.3 + 0.3 * Math.sin(t * 3)));
        for (const e of tn.estrelas) e.rotation.x = t * 3;
      }
      u.andado += Math.hypot(dx, dz);
      if (!noAr && u.andado > 0.62) {
        u.andado = 0;
        u.pe = 1 - u.pe;
        const p = u.tenis[u.pe].no.getAbsolutePosition();
        pegadas.marcar(p.x, chaoAqui, p.z, yaw);
        for (let i = 0; i < 3; i++)
          brilhos.soltar(new Vector3(p.x, chaoAqui + 0.1, p.z), {
            tam: 0.14 + Math.random() * 0.08,
            dura: 0.8,
          });
      }
      if (pousou)
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2;
          brilhos.soltar(new Vector3(r.x, chaoAqui + 0.08, r.z), {
            v: new Vector3(Math.cos(a) * 1.6, 0.6, Math.sin(a) * 1.6),
            dura: 0.7,
            tam: 0.18,
          });
        }
    }

    // ---------------------------------------------------- asas do dragão
    if (u.dragao) {
      const forte = noAr ? 1 : Math.min(1, u.vel / 4);
      const freq = 2 + forte * 6;
      const amp = 0.22 + forte * 0.55;
      const fase = t * freq * Math.PI * 2;
      u.dragao.asas.forEach((a, i) => {
        const s = i === 0 ? -1 : 1;
        // aberta para os lados, levemente para trás; o bater é a asa subindo e descendo
        a.rotation.y = s * (0.35 + Math.sin(fase + 0.9) * amp * 0.45);
        a.rotation.z = s * (0.12 + Math.sin(fase) * amp * 0.7);
        a.rotation.x = -0.15;
      });
      const pulso = 0.55 + 0.45 * Math.sin(t * 2.4);
      u.dragao.brilhoPlaca.emissiveColor.set(1 * pulso, 0.83 * pulso, 0.35 * pulso);
      if (noAr && Math.sin(fase) > 0.95)
        brilhos.soltar(new Vector3(r.x, r.y + 0.8, r.z), {
          cor: ARCO[(Math.random() * 3 + 3) | 0],
          v: new Vector3(0, -0.6, 0),
          tam: 0.12,
        });
    }

    // ---------------------------------------------------- unicórnio
    const pet = u.pet;
    if (pet) {
      // o lugar dele: atrás e ao lado da criança
      const lx = r.x - Math.sin(yaw) * 1.4 + Math.cos(yaw) * 1.1;
      const lz = r.z - Math.cos(yaw) * 1.4 - Math.sin(yaw) * 1.1;
      let ddx = lx - pet.x;
      let ddz = lz - pet.z;
      const dist = Math.hypot(ddx, ddz);
      if (dist > 14) {
        // ficou longe demais: aparece num puf de brilho
        pet.x = lx;
        pet.z = lz;
        for (let i = 0; i < 16; i++) brilhos.soltar(new Vector3(lx, r.y + 0.6, lz), { tam: 0.2 });
        ddx = ddz = 0;
      }
      const quer = dist > 0.4 ? Math.min(6.5, dist * 2.2) : 0;
      const vx = dist > 0.01 ? (ddx / Math.max(dist, 0.01)) * quer : 0;
      const vz = dist > 0.01 ? (ddz / Math.max(dist, 0.01)) * quer : 0;
      pet.x += vx * dt;
      pet.z += vz * dt;
      const andando = quer > 0.35;
      // vira para onde anda; parado, vira para a criança
      const alvoYaw = andando ? Math.atan2(vx, vz) : Math.atan2(r.x - pet.x, r.z - pet.z);
      let d = alvoYaw - pet.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      pet.yaw += d * Math.min(1, dt * 6);
      // chão e pulo (pula junto quando a criança pula)
      const piso = chao(pet.x, Math.max(pet.y, r.y) + 0.5, pet.z);
      if (u.vy > 3 && !pet.noAr && dist < 6) {
        pet.vy = 4.6;
        pet.noAr = true;
        for (let i = 0; i < 6; i++) brilhos.soltar(new Vector3(pet.x, pet.y + 0.2, pet.z));
      }
      if (pet.noAr || pet.y > piso + 0.01) {
        pet.vy -= 14 * dt;
        pet.y += pet.vy * dt;
        if (pet.y <= piso) {
          pet.y = piso;
          pet.vy = 0;
          pet.noAr = false;
        }
      } else pet.y += (piso - pet.y) * Math.min(1, dt * 10);
      pet.raiz.position.set(pet.x, pet.y, pet.z);
      pet.raiz.rotation.y = pet.yaw;
      // trote, respiração, cabeça, rabo, orelhas, piscar
      pet.fase += dt * (andando ? 2.2 + quer * 1.1 : 0);
      const passo = andando ? Math.sin(pet.fase * Math.PI * 2) : 0;
      pet.pernas.forEach((p, i) => (p.rotation.x = (i === 0 || i === 3 ? 1 : -1) * passo * 0.7));
      pet.corpo.position.y = andando ? Math.abs(Math.sin(pet.fase * Math.PI * 2)) * 0.06 : 0;
      const resp = 1 + Math.sin(t * 2.6) * 0.018;
      pet.corpo.scaling.set(resp, 1 / resp, resp);
      pet.pesco.rotation.x = andando
        ? Math.sin(pet.fase * Math.PI * 4) * 0.08
        : Math.sin(t * 1.3) * 0.05;
      pet.cab.rotation.z = andando ? 0 : Math.sin(t * 0.9) * 0.12;
      pet.rabo.forEach((n, i) => {
        n.rotation.y = Math.sin(t * (andando ? 7 : 3) - i * 0.6) * (0.25 + i * 0.08);
        n.rotation.x = 0.35 + (andando ? 0.5 : 0.1);
      });
      pet.orelhas.forEach(
        (o, i) => (o.rotation.x = Math.max(0, Math.sin(t * 1.7 + i * 2) - 0.85) * 3),
      );
      const pisca = t % 3.4 < 0.12 ? 0.15 : 1;
      for (const o of pet.olhos) o.scaling.y = pisca;
      const brilho = 0.75 + 0.25 * Math.sin(t * 4);
      pet.brilhoChifre.emissiveColor.set(brilho, brilho * 0.94, brilho * 0.66);
      // charme de tempos em tempos: joga a cabeça e o chifre solta brilho
      u.proximaGraca -= dt;
      if (u.proximaGraca <= 0 && !andando) {
        u.proximaGraca = 5 + Math.random() * 3;
        const c = pet.chifre.getAbsolutePosition();
        for (let i = 0; i < 9; i++)
          brilhos.soltar(c.add(new Vector3(0, 0.08, 0)), {
            v: new Vector3((Math.random() - 0.5) * 0.8, 0.9, (Math.random() - 0.5) * 0.8),
            tam: 0.13,
          });
      }
      // a criança parou pertinho: ele olha e solta coraçõezinhos (uma vez a cada parada)
      if (u.parado > 0.6 && dist < 3 && !u.coracaoFeito) {
        u.coracaoFeito = true;
        const c = pet.cab.getAbsolutePosition();
        for (let i = 0; i < 5; i++)
          setTimeout(
            () =>
              brilhos.soltar(c.add(new Vector3(0, 0.25, 0)), {
                coracao: true,
                cor: '#ff5a9a',
                v: new Vector3((Math.random() - 0.5) * 0.4, 0.7, (Math.random() - 0.5) * 0.4),
                gravidade: 0,
                dura: 1.4,
                tam: 0.2,
              }),
            i * 140,
          );
      }
      if (u.parado === 0) u.coracaoFeito = false;
    }
  }

  const obs = scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(0.05, scene.getEngine().getDeltaTime() / 1000);
    t += dt;
    for (const u of usuarios.values()) {
      if (u.raiz.isDisposed()) {
        desmontar(u, true);
        usuarios.delete(u.id);
        continue;
      }
      quadroUsuario(u, dt);
    }
    brilhos.quadro(dt);
    pegadas.quadro(dt);
  });

  return {
    vestir,
    tirar(id: string) {
      const u = usuarios.get(id);
      if (!u) return;
      desmontar(u, true);
      usuarios.delete(id);
    },
    usando(id: string): ItemPremium3d[] {
      return [...(usuarios.get(id)?.itens ?? [])];
    },
    /** Um puf de brilho no boneco (ao vestir). */
    festa(raiz: TransformNode) {
      const p = raiz.getAbsolutePosition();
      for (let i = 0; i < 22; i++)
        brilhos.soltar(new Vector3(p.x, p.y + 0.9, p.z), {
          v: new Vector3((Math.random() - 0.5) * 3, Math.random() * 2.2, (Math.random() - 0.5) * 3),
          tam: 0.2,
        });
    },
    descartar() {
      scene.onBeforeRenderObservable.remove(obs);
      for (const u of usuarios.values()) desmontar(u, true);
      usuarios.clear();
    },
  };
}
export type Premium3d = ReturnType<typeof criarPremium3d>;
