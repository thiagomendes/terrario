import { Vector4 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera';
import type { Scene } from '@babylonjs/core/scene';
import type { Aparencia } from '../personagem/aparencia';
import { blocoNaMao } from '../personagem/mao';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { criarItemNaMao, tonsFaces } from './itemNaMao';
import type { Vista } from '../player/animacao';
import type { Pose } from '../personagem/poses';
import { gerarTexturaParte } from '../personagem/textura';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';

export const MAXIMO_MALHAS_BRACO = 3;
const GRUPO_BRACO = 1;

export interface Braco {
  definirSlot(slot: number): void;
  /** Bloco na mão (null = mão vazia). */
  definirBloco(bloco: number | null): void;
  /** Item (ferramenta, comida) na mão, em pixels 3D, pelo id; null esconde. */
  definirItem(item: string | null): void;
  aplicarPose(pose: Pose): void;
  /** Anima o braço (viewmodel): repouso discreto, golpe, colocação, balanço e troca. */
  atualizarVista(dt: number, vista: Vista): void;
  definirBalanco(ativo: boolean): void;
  /** Fator de luz do ambiente (1 ao ar livre, baixo em cavernas). */
  definirLuz(f: number): void;
  aplicarAparencia(aparencia: Aparencia): void;
  definirVisivel(visivel: boolean): void;
  contarMalhas(): number;
  descartar(): void;
}

export function criarBraco(scene: Scene, camera: TargetCamera, aparencia: Aparencia): Braco {
  scene.setRenderingAutoClearDepthStencil(GRUPO_BRACO, true, true, false);

  // Proporções do viewmodel: braço fino, bloco na mão com o dobro da largura do braço e
  // ferramentas em pixels 3D. Tudo pendurado num nó "mão" na ponta do braço.
  const TAM_BRACO: [number, number, number] = [0.088, 0.46, 0.088];
  /** Campo de visão vertical em que o viewmodel foi desenhado (independe do FOV do jogo). */
  const FOV_VISTA = (70 * Math.PI) / 180;
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

  // O viewmodel não usa as luzes da cena (o sol por trás deixaria tudo escuro): cada face
  // tem um tom fixo nas cores dos vértices e o brilho segue a luz do lugar (definirLuz).
  const semLuz = (nome: string) => {
    const m = new StandardMaterial(nome, scene);
    m.disableLighting = true;
    m.specularColor = Color3.Black();
    m.emissiveColor = new Color3(1, 1, 1);
    return m;
  };
  const matBraco = semLuz('braco-material');
  matBraco.diffuseTexture = texPele;
  const tons = tonsFaces;

  const faceUV = molde.faces.map(
    (f) =>
      new Vector4(
        f.x / molde.largura,
        (f.y + f.h) / molde.altura,
        (f.x + f.w) / molde.largura,
        f.y / molde.altura,
      ),
  );
  // raiz: corrige a perspectiva para o viewmodel ter o mesmo tamanho em qualquer FOV
  const raiz = new TransformNode('braco-raiz', scene);
  raiz.parent = camera;
  // pivô no ombro; o braço (caixa em pé deitada para a frente) vai do ombro até a mão (+z)
  const pivoBraco = new TransformNode('braco-pivo', scene);
  pivoBraco.parent = raiz;
  const braco: Mesh = MeshBuilder.CreateBox(
    'braco-direito',
    {
      width: TAM_BRACO[0],
      height: TAM_BRACO[1],
      depth: TAM_BRACO[2],
      faceUV,
      wrap: true,
      faceColors: tons([0.78, 0.9, 0.66, 0.94, 0.86, 0.6]),
    },
    scene,
  );
  braco.parent = pivoBraco;
  braco.rotation.x = -Math.PI / 2;
  braco.position.set(0, 0, TAM_BRACO[1] / 2);
  const mao = new TransformNode('braco-mao', scene);
  mao.parent = pivoBraco;
  mao.position.set(0, 0, TAM_BRACO[1]);

  const naMao = criarItemNaMao(scene, mao, {
    nome: 'braco',
    tamanhoBloco: 0.15,
    pixel: 0.019,
    iluminado: false,
    grupo: GRUPO_BRACO,
    // bloco apoiado sobre o punho, girado para mostrar duas faces e o topo
    posBloco: [-0.03, 0.075, 0.05],
    rotBloco: [0.7, Math.PI / 4 + 0.1, 0.05],
    // ferramenta com a cabeça apontando para a mira
    posItem: [0, 0.01, -0.01],
    rotItem: [0.1, -2.05, 0.3],
  });
  braco.isPickable = false;
  braco.receiveShadows = false;
  braco.renderingGroupId = GRUPO_BRACO;
  braco.alwaysSelectAsActiveMesh = true;
  braco.material = matBraco;
  let blocoAtual: number | null = null;
  let itemAtual: string | null = null;
  let visivel = true;

  // Estado do viewmodel.
  let ultYaw = camera.rotation.y;
  let ultPitch = camera.rotation.x;
  let balX = 0;
  let balY = 0;
  let troca = 1;
  let balancoAtivo = true;
  /** 0 mão vazia, 1 segurando algo (suavizado): com item, o braço desce um pouco. */
  let segurando = 1;

  // Pose de repouso: ombro fora da tela, embaixo à direita; punho por volta de (0.45, -0.6) da tela.
  const OMBRO = { x: 0.42, y: -0.4, z: 0.13 };
  const REPOUSO = { rx: -0.42, ry: -0.27, rz: 0.12 };

  function posicionar(
    px: number,
    py: number,
    pz: number,
    rx: number,
    ry: number,
    rz: number,
  ): void {
    pivoBraco.position.set(OMBRO.x + px, OMBRO.y + py, OMBRO.z + pz);
    pivoBraco.rotation.set(rx, ry, rz);
  }

  function aplicarPose(pose: Pose): void {
    posicionar(0, pose.tronco, 0, REPOUSO.rx, REPOUSO.ry, REPOUSO.rz);
  }

  function atualizarVista(dt: number, v: Vista): void {
    const passo = dt > 0 && Number.isFinite(dt) ? Math.min(dt, 0.1) : 0;
    // mesmo tamanho na tela em qualquer FOV: comprime a profundidade do viewmodel
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
    const alvoSeg = naMao.segurando() ? 1 : 0;
    segurando += (alvoSeg - segurando) * (1 - Math.exp(-passo * 10));

    const fase = v.tempo * (v.passada > 1.2 ? 2.4 : 1.6) * Math.PI;
    const amp = Math.min(v.passada, 1.5) * (balancoAtivo ? 1 : 0.15);
    let px = Math.sin(fase) * 0.01 * amp + balX;
    let py = -Math.abs(Math.cos(fase)) * 0.014 * amp + balY;
    let pz = 0;
    py += Math.sin(v.tempo * 1.4) * 0.003 * (1 - Math.min(1, amp));
    py += v.noAr * 0.02;
    // com item: braço um pouco mais baixo e recolhido, o item domina o quadro
    py -= 0.02 * segurando;
    let rx = REPOUSO.rx;
    let ry = REPOUSO.ry;
    let rz = REPOUSO.rz;
    if (v.golpe !== null) {
      // golpe: o braço sobe, avança em direção à mira e volta num arco
      const s = Math.sin(v.golpe * Math.PI);
      const s2 = Math.sin(v.golpe * Math.PI * 2);
      ry -= 0.36 * s;
      rx -= 0.22 * s2 - 0.12 * s;
      rz += 0.3 * s;
      pz += 0.06 * s;
      px -= 0.05 * s;
      py += 0.02 * s2;
    }
    if (v.colocar !== null) {
      const s = Math.sin(v.colocar * Math.PI);
      pz += 0.1 * s;
      ry -= 0.14 * s;
      rx -= 0.1 * s;
    }
    const e = 1 - (1 - troca) * (1 - troca);
    py -= (1 - e) * 0.25;
    rx += (1 - e) * 0.5;
    posicionar(px, py, pz, rx, ry, rz);
  }

  function aplicarAparencia(nova: Aparencia): void {
    const t = gerarTexturaParte(nova, { nome: 'bracoDireito', tamanho: TAM_BRACO });
    texPele.update(new Uint8Array(t.pixels.buffer));
  }

  function definirSlot(slot: number): void {
    definirBloco(blocoNaMao(slot));
  }

  function definirItem(item: string | null): void {
    if (item !== itemAtual) troca = 0;
    itemAtual = item;
    naMao.definir(blocoAtual, itemAtual);
  }

  function definirBloco(bloco: number | null): void {
    blocoAtual = bloco;
    troca = 0;
    naMao.definir(blocoAtual, itemAtual);
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
    definirBloco,
    definirItem,
    aplicarPose,
    atualizarVista,
    definirBalanco(a) {
      balancoAtivo = a;
    },
    definirLuz(f) {
      const v = Math.max(0.08, Math.min(1.1, f));
      matBraco.emissiveColor.set(v, v * 0.97, v * 0.95);
      naMao.definirLuz(f);
    },
    aplicarAparencia,
    definirVisivel(v) {
      visivel = v;
      braco.setEnabled(visivel);
      naMao.definirVisivel(visivel);
    },
    contarMalhas: () => 1 + naMao.contarMalhas(),
    descartar() {
      braco.dispose();
      naMao.descartar();
      raiz.dispose();
      matBraco.dispose();
      texPele.dispose();
    },
  };
}
