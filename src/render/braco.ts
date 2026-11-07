/**
 * Braço da primeira pessoa (spec 012, esboço de movimento): a manga comprida entra pela
 * borda de baixo da tela (o braço nunca parece solto), depois o punho e a mãozinha redonda
 * segurando o item de brinquedo pelo ponto de pega. Os movimentos são os mesmos da
 * terceira pessoa: balanço ao andar, golpe com preparo, empurrão ao colocar e a comida
 * levada à boca.
 *
 * Não usa as luzes da cena (o sol por trás deixaria a mão escura): o sombreado de plástico
 * é feito por vértice, a cada quadro, a partir da direção de cada superfície vista da
 * câmera, e o brilho geral segue a luz do lugar.
 */
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera';
import type { Scene } from '@babylonjs/core/scene';
import type { Aparencia } from '../personagem/aparencia';
import { planoBoneco } from '../personagem/boneco';
import { blocoNaMao } from '../personagem/mao';
import { curvaGolpe, type Pose } from '../personagem/poses';
import type { Vista } from '../player/animacao';
import { caixaArredondada, esfera, type Plasticos } from './formas';
import { modeloNaMao, type ModeloItem } from './itensBrinquedo';

export const MAXIMO_MALHAS_BRACO = 24;
const GRUPO_BRACO = 1;

export interface Braco {
  definirSlot(slot: number): void;
  /** Bloco na mão (null = mão vazia). */
  definirBloco(bloco: number | null): void;
  /** Item (ferramenta, comida) na mão, pelo id; null esconde. */
  definirItem(item: string | null): void;
  aplicarPose(pose: Pose): void;
  /** Anima o braço: repouso, balanço, golpe, colocação, comer e troca de item. */
  atualizarVista(dt: number, vista: Vista): void;
  definirBalanco(ativo: boolean): void;
  /** Fator de luz do ambiente (1 ao ar livre, baixo em cavernas). */
  definirLuz(f: number): void;
  aplicarAparencia(aparencia: Aparencia): void;
  definirVisivel(visivel: boolean): void;
  contarMalhas(): number;
  descartar(): void;
}

/** Campo de visão vertical em que o braço foi desenhado (o do esboço). */
const FOV_VISTA = (55 * Math.PI) / 180;
/** Onde fica a mão, no espaço da câmera (x direita, y cima, z frente), e de onde vem o braço. */
const MAO = new Vector3(0.27, -0.24, 0.9);
// mais em pé: a manga sai logo pela borda de baixo e só a ponta do braço aparece
const DIRECAO = new Vector3(-0.32, 0.85, 1);
const ESCALA = 0.6;
/** Luz do braço, no espaço da câmera: de cima, da esquerda e um pouco da frente. */
const LUZ = new Vector3(-0.45, 0.8, -0.4).normalize();
const PARA_CAMERA = new Vector3(0, 0, -1);
const MEIO = LUZ.add(PARA_CAMERA).normalize();

export function criarBraco(scene: Scene, camera: TargetCamera, aparencia: Aparencia): Braco {
  scene.setRenderingAutoClearDepthStencil(GRUPO_BRACO, true, true, false);
  const raiz = new TransformNode('braco-raiz', scene);
  raiz.parent = camera;
  const grupo = new TransformNode('braco-pivo', scene);
  grupo.parent = raiz;
  const segura = new TransformNode('braco-segura', scene);
  segura.parent = grupo;
  segura.position.set(0, -0.13, 0);

  // materiais sem luz da cena: a cor de cada vértice é o sombreado (calculado abaixo)
  const materiais = new Map<string, StandardMaterial>();
  const corDe = new Map<StandardMaterial, Color3>();
  const mats: Plasticos = {
    cor(hex) {
      const ja = materiais.get(hex);
      if (ja) return ja;
      const m = new StandardMaterial(`braco-material-${hex}`, scene);
      m.disableLighting = true;
      m.specularColor = Color3.Black();
      m.diffuseColor = Color3.Black();
      m.emissiveColor = new Color3(1, 1, 1);
      materiais.set(hex, m);
      corDe.set(m, Color3.FromHexString(hex));
      return m;
    },
    definirLuz() {},
    descartar() {
      for (const m of materiais.values()) m.dispose();
      materiais.clear();
    },
  };

  let corpo: Mesh[] = [];
  let modelo: ModeloItem | null = null;
  let visivel = true;
  let luz = 1;
  let blocoAtual: number | null = null;
  let itemAtual: string | null = null;

  const preparar = (m: Mesh) => {
    m.isPickable = false;
    m.receiveShadows = false;
    m.renderingGroupId = GRUPO_BRACO;
    m.alwaysSelectAsActiveMesh = true;
    m.setEnabled(visivel);
    const n = m.getVerticesData(VertexBuffer.NormalKind);
    if (n) m.setVerticesData(VertexBuffer.ColorKind, new Float32Array((n.length / 3) * 4), true);
  };

  function aplicarAparencia(a: Aparencia): void {
    for (const m of corpo) m.dispose();
    const c = planoBoneco(a).cores;
    // manga comprida: a ponta de trás sempre fica fora da tela
    const manga = caixaArredondada('braco-manga', scene, 0.2, 1.4, 0.2, 0.08, mats.cor(c.roupa), 3);
    manga.position.y = 0.67;
    const punho = caixaArredondada(
      'braco-punho',
      scene,
      0.23,
      0.07,
      0.23,
      0.03,
      mats.cor(c.punho),
      3,
    );
    punho.position.y = -0.02;
    const mao = esfera('braco-mao', scene, 0.135, mats.cor(c.pele));
    mao.position.y = -0.13;
    corpo = [manga, punho, mao];
    sujo = true;
    for (const m of corpo) {
      m.parent = grupo;
      preparar(m);
    }
  }

  function trocarItem(): void {
    if (modelo) {
      for (const m of modelo.malhas) m.dispose();
      modelo.no.dispose();
    }
    modelo = modeloNaMao(scene, mats, blocoAtual, itemAtual, 'braco-item');
    troca = 0;
    if (!modelo) return;
    modelo.no.parent = segura;
    if (modelo.ferramenta) modelo.no.rotation.set(1.9, 0, -0.35);
    else {
      // na vista o bloco e as peças vêm maiores (perto da mão, na medida do esboço)
      modelo.no.position.set(0, -0.03, 0.13);
      // em pé na vista: desfaz a inclinação de repouso do braço e mostra o topo de quina
      const base = Quaternion.FromUnitVectorsToRef(
        new Vector3(0, -1, 0),
        DIRECAO.clone().normalize(),
        new Quaternion(),
      );
      modelo.no.rotationQuaternion = Quaternion.Inverse(base).multiply(
        Quaternion.FromEulerAngles(0.45, 0.65, 0),
      );
      modelo.no.scaling.setAll(1.2);
    }
    for (const m of modelo.malhas) preparar(m);
    sujo = true;
  }

  // ---------- sombreado de plástico por vértice ----------
  const mundoVista = new Matrix();
  const n = new Vector3();
  const nv = new Vector3();
  /** Por malha: normais e cores guardadas (nada de alocar a cada quadro). */
  const cache = new Map<Mesh, { normais: Float32Array; cores: Float32Array }>();
  function sombrear(m: Mesh): void {
    const mat = m.material as StandardMaterial | null;
    const base = mat ? corDe.get(mat) : undefined;
    if (!base) return;
    let c = cache.get(m);
    if (!c) {
      const dados = m.getVerticesData(VertexBuffer.NormalKind);
      if (!dados) return;
      const normais = Float32Array.from(dados);
      c = { normais, cores: new Float32Array((normais.length / 3) * 4) };
      cache.set(m, c);
      m.onDisposeObservable.addOnce(() => cache.delete(m));
    }
    const { normais, cores } = c;
    m.computeWorldMatrix(true).multiplyToRef(camera.getViewMatrix(), mundoVista);
    const e = mundoVista.m;
    for (let i = 0, j = 0; i < normais.length; i += 3, j += 4) {
      const x = normais[i];
      const y = normais[i + 1];
      const z = normais[i + 2];
      let nx = x * e[0] + y * e[4] + z * e[8];
      let ny = x * e[1] + y * e[5] + z * e[9];
      let nz = x * e[2] + y * e[6] + z * e[10];
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l;
      ny /= l;
      nz /= l;
      const difusa = Math.max(0, nx * LUZ.x + ny * LUZ.y + nz * LUZ.z);
      const brilho = Math.pow(Math.max(0, nx * MEIO.x + ny * MEIO.y + nz * MEIO.z), 24) * 0.35;
      const k = (0.5 + 0.55 * difusa) * luz;
      cores[j] = Math.min(1, base.r * k + brilho * luz);
      cores[j + 1] = Math.min(1, base.g * k + brilho * luz);
      cores[j + 2] = Math.min(1, base.b * k + brilho * luz);
      cores[j + 3] = 1;
    }
    m.updateVerticesData(VertexBuffer.ColorKind, cores);
  }
  /** O sombreado só muda quando o braço gira (ou a luz muda): a posição não mexe nele. */
  const ultimoGiro = new Quaternion(NaN, 0, 0, 1);
  let ultimaLuz = NaN;
  let sujo = true;

  // ---------- movimento ----------
  let ultYaw = camera.rotation.y;
  let ultPitch = camera.rotation.x;
  let balX = 0;
  let balY = 0;
  let troca = 1;
  let balancoAtivo = true;
  const dir = new Vector3();
  const q = new Quaternion();
  const PARA_BAIXO = new Vector3(0, -1, 0);

  /** Tela estreita (celular em pé): o braço encolhe um pouco (1 na tela deitada). */
  let escalaTela = 1;
  function posicionar(mao: Vector3, d: Vector3): void {
    dir.copyFrom(d).normalize();
    Quaternion.FromUnitVectorsToRef(PARA_BAIXO, dir, q);
    if (grupo.rotationQuaternion) grupo.rotationQuaternion.copyFrom(q);
    else grupo.rotationQuaternion = q.clone();
    grupo.scaling.setAll(ESCALA * escalaTela);
    // a mão (0, -0.13, 0 no braço) fica no ponto pedido
    grupo.position.set(
      mao.x - dir.x * 0.13 * ESCALA,
      mao.y - dir.y * 0.13 * ESCALA,
      mao.z - dir.z * 0.13 * ESCALA,
    );
  }

  const suave = (x: number) => x * x * (3 - 2 * x);
  const maoAlvo = new Vector3();
  const dirAlvo = new Vector3();
  function atualizarVista(dt: number, v: Vista): void {
    const passo = dt > 0 && Number.isFinite(dt) ? Math.min(dt, 0.1) : 0;
    const fov = camera.fov > 0.1 ? camera.fov : FOV_VISTA;
    raiz.scaling.set(1, 1, Math.tan(FOV_VISTA / 2) / Math.tan(fov / 2));
    // atraso suave ao girar a câmera
    let dYaw = camera.rotation.y - ultYaw;
    if (dYaw > Math.PI) dYaw -= Math.PI * 2;
    if (dYaw < -Math.PI) dYaw += Math.PI * 2;
    const dPitch = camera.rotation.x - ultPitch;
    ultYaw = camera.rotation.y;
    ultPitch = camera.rotation.x;
    const k = 1 - Math.exp(-passo * 9);
    const alvoX = passo > 0 ? Math.max(-0.04, Math.min(0.04, (-dYaw / passo) * 0.01)) : 0;
    const alvoY = passo > 0 ? Math.max(-0.03, Math.min(0.03, (dPitch / passo) * 0.008)) : 0;
    balX += (alvoX - balX) * k;
    balY += (alvoY - balY) * k;
    troca = Math.min(1, troca + passo / 0.25);

    const fase = v.tempo * (v.passada > 1.2 ? 2.4 : 1.6) * Math.PI;
    const amp = Math.min(v.passada, 1.5) * (balancoAtivo ? 1 : 0.15);
    const bal = Math.sin(fase) * 0.03 * amp;
    const g = v.golpe !== null ? curvaGolpe(v.golpe) : 0;
    const col = v.colocar !== null ? Math.sin(v.colocar * Math.PI) : 0;
    const c =
      v.comer !== null
        ? suave(Math.min(1, v.comer / 0.3)) * (1 - suave(Math.max(0, (v.comer - 0.85) / 0.15)))
        : 0;
    const e = 1 - (1 - troca) * (1 - troca);
    // o campo de visão vertical é fixo: em tela estreita a largura visível encolhe e a mão
    // (que fica à direita) saía da tela com o item. A mão vem para dentro da largura visível.
    const aspecto = scene.getEngine().getAspectRatio(camera) || 16 / 9;
    const meiaLarg = Math.tan(FOV_VISTA / 2) * aspecto * MAO.z;
    escalaTela = Math.max(0.72, Math.min(1, aspecto / 1.25));
    // celular em pé: a mão sobe (os botões de toque ocupam a parte de baixo) e vem para o meio
    const emPe = Math.max(0, Math.min(1, (1.3 - aspecto) / 0.85));
    const maoX = Math.min(MAO.x, meiaLarg * (0.6 - 0.12 * emPe));
    const maoY = MAO.y + emPe * 0.12;
    // e a ferramenta aponta mais para o meio (a cabeça não sai pela direita)
    if (modelo?.ferramenta) modelo.no.rotation.z = 0.35 * -1 + emPe * 0.75;
    const mao = maoAlvo.set(
      maoX + bal + balX - c * 0.16,
      maoY +
        Math.abs(bal) * 0.5 +
        balY +
        g * 0.06 -
        c * 0.06 +
        v.noAr * 0.02 +
        Math.sin(v.tempo * 1.4) * 0.004 -
        (1 - e) * 0.25,
      MAO.z - c * 0.3 + col * 0.08,
    );
    const d = dirAlvo.set(
      DIRECAO.x + c * 0.25 - emPe * 0.35,
      DIRECAO.y - g * 0.5 + c * 0.9 - col * 0.2,
      DIRECAO.z,
    );
    posicionar(mao, d);
    const giro = grupo.rotationQuaternion!;
    const girou =
      Math.abs(giro.x - ultimoGiro.x) +
        Math.abs(giro.y - ultimoGiro.y) +
        Math.abs(giro.z - ultimoGiro.z) +
        Math.abs(giro.w - ultimoGiro.w) >
        0.003 || Number.isNaN(ultimoGiro.x);
    if (visivel && (sujo || girou || luz !== ultimaLuz)) {
      for (const m of corpo) sombrear(m);
      if (modelo) for (const m of modelo.malhas) sombrear(m);
      ultimoGiro.copyFrom(giro);
      ultimaLuz = luz;
      sujo = false;
    }
  }

  aplicarAparencia(aparencia);
  posicionar(MAO, DIRECAO);

  return {
    definirSlot(slot) {
      blocoAtual = blocoNaMao(slot);
      trocarItem();
    },
    definirBloco(bloco) {
      if (bloco === blocoAtual) return;
      blocoAtual = bloco;
      trocarItem();
    },
    definirItem(item) {
      if (item === itemAtual) return;
      itemAtual = item;
      trocarItem();
    },
    aplicarPose() {
      // o braço da vista anda pela Vista (atualizarVista)
    },
    atualizarVista,
    definirBalanco(a) {
      balancoAtivo = a;
    },
    definirLuz(f) {
      luz = Math.max(0.08, Math.min(1.1, f));
    },
    aplicarAparencia,
    definirVisivel(v) {
      visivel = v;
      for (const m of corpo) m.setEnabled(v);
      if (modelo) for (const m of modelo.malhas) m.setEnabled(v);
    },
    contarMalhas: () => corpo.length + (modelo?.malhas.length ?? 0),
    descartar() {
      for (const m of corpo) m.dispose();
      if (modelo) {
        for (const m of modelo.malhas) m.dispose();
        modelo.no.dispose();
      }
      mats.descartar();
      segura.dispose();
      grupo.dispose();
      raiz.dispose();
    },
  };
}
