import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector4 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Camera } from '@babylonjs/core/Cameras/camera';
import type { Scene } from '@babylonjs/core/scene';
import { gerarAtlas, type FaceBloco } from '../art/atlas';
import type { Aparencia } from '../personagem/aparencia';
import { TAMANHO_MINIATURA, blocoNaMao, posicaoBraco } from '../personagem/mao';
import type { Pose } from '../personagem/poses';
import { ALTURA_TEXTURA, LARGURA_TEXTURA, REGIOES, gerarTextura } from '../personagem/textura';

export const MAXIMO_MALHAS_BRACO = 3;
const GRUPO_BRACO = 1;

export interface Braco {
  definirSlot(slot: number): void;
  aplicarPose(pose: Pose): void;
  aplicarAparencia(aparencia: Aparencia): void;
  definirVisivel(visivel: boolean): void;
  contarMalhas(): number;
  descartar(): void;
}

export function criarBraco(scene: Scene, camera: Camera, aparencia: Aparencia): Braco {
  scene.setRenderingAutoClearDepthStencil(GRUPO_BRACO, true, true, false);

  const texPele = RawTexture.CreateRGBATexture(
    new Uint8Array(LARGURA_TEXTURA * ALTURA_TEXTURA * 4),
    LARGURA_TEXTURA,
    ALTURA_TEXTURA,
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

  const matBloco = new StandardMaterial('braco-bloco-material', scene);
  matBloco.diffuseTexture = texAtlas;
  matBloco.emissiveColor = Color3.Black();
  matBloco.specularColor = Color3.Black();

  const r = REGIOES.bracoDireito;
  const u0 = r.x / LARGURA_TEXTURA;
  const u1 = (r.x + r.w) / LARGURA_TEXTURA;
  const v0 = 1 - (r.y + r.h) / ALTURA_TEXTURA;
  const v1 = 1 - r.y / ALTURA_TEXTURA;
  const braco: Mesh = MeshBuilder.CreateBox(
    'braco-direito',
    {
      width: 0.12,
      height: 0.12,
      depth: 0.55,
      faceUV: Array.from({ length: 6 }, () => new Vector4(u0, v0, u1, v1)),
    },
    scene,
  );
  const miniatura: Mesh = MeshBuilder.CreateBox('braco-bloco', { size: TAMANHO_MINIATURA }, scene);

  const malhas = [braco, miniatura];
  for (const m of malhas) {
    m.parent = camera;
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

  function aplicarPose(pose: Pose): void {
    const p = posicaoBraco(pose, tamanhoTela());
    braco.position.set(p.x - 0.02, p.y, p.z + 0.1);
    braco.rotation.set(-0.35 + pose.bracoDireito * 0.25, -0.25, 0);
    miniatura.position.set(p.miniatura.x, p.miniatura.y, p.miniatura.z);
    miniatura.rotation.set(0.3, 0.6, 0);
  }

  function aplicarAparencia(nova: Aparencia): void {
    texPele.update(new Uint8Array(gerarTextura(nova)));
  }

  function definirSlot(slot: number): void {
    const bloco = blocoNaMao(slot);
    temBloco = bloco !== null;
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
    aplicarAparencia,
    definirVisivel(v) {
      visivel = v;
      atualizarVisibilidade();
    },
    contarMalhas: () => malhas.length,
    descartar() {
      for (const m of malhas) m.dispose();
      matBraco.dispose();
      matBloco.dispose();
      texPele.dispose();
      texAtlas.dispose();
    },
  };
}
