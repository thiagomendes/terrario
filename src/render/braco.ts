import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector4 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera';
import type { Scene } from '@babylonjs/core/scene';
import { gerarAtlas, type FaceBloco } from '../art/atlas';
import type { Aparencia } from '../personagem/aparencia';
import { TAMANHO_MINIATURA, blocoNaMao } from '../personagem/mao';
import type { Vista } from '../player/animacao';
import type { Pose } from '../personagem/poses';
import { gerarTexturaParte } from '../personagem/textura';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';

export const MAXIMO_MALHAS_BRACO = 3;
const GRUPO_BRACO = 1;

export interface Braco {
  definirSlot(slot: number): void;
  aplicarPose(pose: Pose): void;
  /** Anima o braço (viewmodel): repouso discreto, golpe, colocação, balanço e troca. */
  atualizarVista(dt: number, vista: Vista): void;
  aplicarAparencia(aparencia: Aparencia): void;
  definirVisivel(visivel: boolean): void;
  contarMalhas(): number;
  descartar(): void;
}

export function criarBraco(scene: Scene, camera: TargetCamera, aparencia: Aparencia): Braco {
  scene.setRenderingAutoClearDepthStencil(GRUPO_BRACO, true, true, false);

  const TAM_BRACO: [number, number, number] = [0.13, 0.6, 0.13];
  const molde = gerarTexturaParte(aparencia, { nome: 'bracoDireito', tamanho: TAM_BRACO });
  const texPele = RawTexture.CreateRGBATexture(
    new Uint8Array(molde.pixels.buffer),
    molde.largura,
    molde.altura,
    scene,
    false,
    false,
    Texture.NEAREST_SAMPLINGMODE,
  );
  texPele.wrapU = Texture.CLAMP_ADDRESSMODE;
  texPele.wrapV = Texture.CLAMP_ADDRESSMODE;

  const atlas = gerarAtlas();
  const texAtlas = RawTexture.CreateRGBATexture(
    new Uint8Array(atlas.pixels.buffer),
    atlas.largura,
    atlas.altura,
    scene,
    false,
    false,
    Texture.NEAREST_SAMPLINGMODE,
  );

  const matBraco = new StandardMaterial('braco-material', scene);
  matBraco.diffuseTexture = texPele;
  matBraco.emissiveColor = Color3.Black();
  matBraco.specularColor = Color3.Black();
  matBraco.ambientColor = Color3.White();
  matBraco.emissiveColor = new Color3(0.12, 0.11, 0.13);

  const matBloco = new StandardMaterial('braco-bloco-material', scene);
  matBloco.diffuseTexture = texAtlas;
  matBloco.emissiveColor = Color3.Black();
  matBloco.specularColor = Color3.Black();
  matBloco.ambientColor = Color3.White();
  matBloco.emissiveColor = new Color3(0.12, 0.11, 0.13);

  const faceUV = molde.faces.map(
    (f) =>
      new Vector4(
        f.x / molde.largura,
        (f.y + f.h) / molde.altura,
        (f.x + f.w) / molde.largura,
        f.y / molde.altura,
      ),
  );
  // O braço é uma caixa em pé (como no corpo) deitada para a frente: a mão aponta para +z.
  const pivoBraco = new TransformNode('braco-pivo', scene);
  pivoBraco.parent = camera;
  const braco: Mesh = MeshBuilder.CreateBox(
    'braco-direito',
    { width: TAM_BRACO[0], height: TAM_BRACO[1], depth: TAM_BRACO[2], faceUV, wrap: true },
    scene,
  );
  braco.rotation.x = -Math.PI / 2;
  // pivô no ombro: a caixa vai do ombro (z = 0) até a mão (z = comprimento)
  braco.position.set(0, 0, TAM_BRACO[1] / 2);
  const miniatura: Mesh = MeshBuilder.CreateBox('braco-bloco', { size: TAMANHO_MINIATURA }, scene);
  // bloco seguro na mão, um pouco acima da ponta do braço
  miniatura.position.set(0.0, 0.08, TAM_BRACO[1] - 0.03);
  miniatura.rotation.set(0.15, 0.75, 0.05);
  miniatura.scaling.setAll(1.35);

  const malhas = [braco, miniatura];
  for (const m of malhas) {
    m.parent = m === braco || m === miniatura ? pivoBraco : camera;
    m.isPickable = false;
    m.receiveShadows = false;
    m.renderingGroupId = GRUPO_BRACO;
    m.alwaysSelectAsActiveMesh = true;
  }
  braco.material = matBraco;
  miniatura.material = matBloco;

  let visivel = true;
  let temBloco = true;

  function tamanhoTela() {
    const motor = scene.getEngine();
    return {
      largura: motor.getRenderWidth() || 1280,
      altura: motor.getRenderHeight() || 720,
    };
  }

  function atualizarVisibilidade(): void {
    braco.setEnabled(visivel);
    miniatura.setEnabled(visivel && temBloco);
  }

  function aplicarFaces(bloco: number): void {
    const faces: FaceBloco[] = ['lado', 'lado', 'lado', 'lado', 'topo', 'base'];
    const faceUV = faces.map((f) => {
      const uv = atlas.uvDaFace(bloco, f) ?? atlas.uvDoBloco(bloco);
      return uv ? new Vector4(uv.u0, uv.v1, uv.u1, uv.v0) : new Vector4(0, 0, 1, 1);
    });
    const novo = MeshBuilder.CreateBox(
      'braco-bloco-tmp',
      { size: TAMANHO_MINIATURA, faceUV },
      scene,
    );
    const dados = novo.getVerticesData('uv');
    if (dados) miniatura.setVerticesData('uv', dados, true);
    novo.dispose();
  }

  // Estado do viewmodel.
  let ultYaw = camera.rotation.y;
  let ultPitch = camera.rotation.x;
  let balX = 0;
  let balY = 0;
  let troca = 1;

  function ombro() {
    const { largura, altura } = tamanhoTela();
    const aspecto = Math.max(0.4, Math.min(1, largura / altura / 1.78));
    return { x: 0.2 + 0.2 * aspecto, y: -0.4, z: 0.02 };
  }

  function posicionar(
    px: number,
    py: number,
    pz: number,
    rx: number,
    ry: number,
    rz: number,
  ): void {
    const o = ombro();
    pivoBraco.position.set(o.x + px, o.y + py, o.z + pz);
    pivoBraco.rotation.set(rx, ry, rz);
  }

  function aplicarPose(pose: Pose): void {
    posicionar(0, pose.tronco, 0, -0.42, -0.3, 0.1);
  }

  function atualizarVista(dt: number, v: Vista): void {
    const passo = dt > 0 && Number.isFinite(dt) ? Math.min(dt, 0.1) : 0;
    // atraso suave ao girar a câmera
    let dYaw = camera.rotation.y - ultYaw;
    if (dYaw > Math.PI) dYaw -= Math.PI * 2;
    if (dYaw < -Math.PI) dYaw += Math.PI * 2;
    const dPitch = camera.rotation.x - ultPitch;
    ultYaw = camera.rotation.y;
    ultPitch = camera.rotation.x;
    const k = 1 - Math.exp(-passo * 9);
    const alvoX = passo > 0 ? Math.max(-0.05, Math.min(0.05, (-dYaw / passo) * 0.012)) : 0;
    const alvoY = passo > 0 ? Math.max(-0.04, Math.min(0.04, (dPitch / passo) * 0.01)) : 0;
    balX += (alvoX - balX) * k;
    balY += (alvoY - balY) * k;
    troca = Math.min(1, troca + passo / 0.25);

    const fase = v.tempo * (v.passada > 1.2 ? 2.4 : 1.6) * Math.PI;
    const amp = Math.min(v.passada, 1.5);
    let px = Math.sin(fase) * 0.012 * amp + balX;
    let py = -Math.abs(Math.cos(fase)) * 0.018 * amp + balY;
    let pz = 0;
    py += Math.sin(v.tempo * 1.4) * 0.004 * (1 - Math.min(1, amp));
    py += v.noAr * 0.025;
    let rx = -0.42;
    let ry = -0.3;
    let rz = 0.1;
    if (v.golpe !== null) {
      // golpe curto: o braço avança em direção à mira e volta
      const s = Math.sin(v.golpe * Math.PI);
      ry -= 0.32 * s;
      rx += 0.12 * s - 0.1 * Math.sin(v.golpe * Math.PI * 2);
      rz += 0.25 * s;
      pz += 0.07 * s;
      px -= 0.03 * s;
    }
    if (v.colocar !== null) {
      const s = Math.sin(v.colocar * Math.PI);
      pz += 0.13 * s;
      ry -= 0.18 * s;
      rx -= 0.12 * s;
    }
    const e = 1 - (1 - troca) * (1 - troca);
    py -= (1 - e) * 0.3;
    posicionar(px, py, pz, rx, ry, rz);
  }

  function aplicarAparencia(nova: Aparencia): void {
    const t = gerarTexturaParte(nova, { nome: 'bracoDireito', tamanho: TAM_BRACO });
    texPele.update(new Uint8Array(t.pixels.buffer));
  }

  function definirSlot(slot: number): void {
    const bloco = blocoNaMao(slot);
    temBloco = bloco !== null;
    troca = 0;
    if (bloco !== null) aplicarFaces(bloco);
    atualizarVisibilidade();
  }

  aplicarAparencia(aparencia);
  definirSlot(0);
  aplicarPose({
    bracoDireito: 0,
    bracoEsquerdo: 0,
    pernaDireita: 0,
    pernaEsquerda: 0,
    tronco: 0,
    cabeca: 0,
  });

  return {
    definirSlot,
    aplicarPose,
    atualizarVista,
    aplicarAparencia,
    definirVisivel(v) {
      visivel = v;
      atualizarVisibilidade();
    },
    contarMalhas: () => malhas.length,
    descartar() {
      for (const m of malhas) m.dispose();
      pivoBraco.dispose();
      matBraco.dispose();
      matBloco.dispose();
      texPele.dispose();
      texAtlas.dispose();
    },
  };
}
