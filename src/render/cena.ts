import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Material } from '@babylonjs/core/Materials/material';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { gerarAtlas } from '../art/atlas';
import { SEMENTE_PADRAO, TAM_X, TAM_Z } from '../world/chunk';
import type { Buffers } from '../mesh/malha';
import type { RespostaChunk } from '../workers/chunk.worker';
import { aplicarPorQuadro, chave, chunksDesejados, planejar } from './gerenciador';

const RAIO_INICIAL = 3;
const MAX_POR_QUADRO = 2;

export interface EstadoDepuracao {
  ready: boolean;
  chunksCarregados: number;
  fps: number;
  escalaResolucao: number;
}

declare global {
  interface Window {
    __brumaluz?: EstadoDepuracao;
  }
}

export function criarCena(canvas: HTMLCanvasElement) {
  const estado: EstadoDepuracao = { ready: false, chunksCarregados: 0, fps: 0, escalaResolucao: 1 };
  window.__brumaluz = estado;

  const engine = new Engine(canvas, false, { preserveDrawingBuffer: true });
  const scene = new Scene(engine);
  const cor = new Color3(0.42, 0.3, 0.45);
  scene.clearColor = new Color4(cor.r, cor.g, cor.b, 1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogColor = cor;
  scene.fogDensity = 0.012;

  const camera = new UniversalCamera('camera', new Vector3(8, 45, 8), scene);
  camera.setTarget(new Vector3(24, 30, 24));
  camera.minZ = 0.1;
  camera.maxZ = 300;
  camera.attachControl(canvas, true);

  const luz = new HemisphericLight('luz', new Vector3(0.3, 1, 0.2), scene);
  luz.diffuse = new Color3(1, 0.85, 0.7);
  luz.groundColor = new Color3(0.25, 0.3, 0.4);

  const atlas = gerarAtlas(SEMENTE_PADRAO);
  const textura = RawTexture.CreateRGBATexture(
    new Uint8Array(atlas.pixels.buffer),
    atlas.largura,
    atlas.altura,
    scene,
    false,
    false,
    Texture.NEAREST_SAMPLINGMODE,
  );
  textura.hasAlpha = true;

  const matSolido = new StandardMaterial('atlas', scene);
  matSolido.diffuseTexture = textura;
  matSolido.specularColor = Color3.Black();
  matSolido.backFaceCulling = false;

  const matPlanta = new StandardMaterial('atlas-plantas', scene);
  matPlanta.diffuseTexture = textura;
  matPlanta.specularColor = Color3.Black();
  matPlanta.backFaceCulling = false;
  matPlanta.transparencyMode = Material.MATERIAL_ALPHATEST;
  matPlanta.alphaCutOff = 0.5;

  const malhas = new Map<string, Mesh[]>();
  const fila: RespostaChunk[] = [];
  const pedidos = new Set<string>();

  const worker = new Worker(new URL('../workers/chunk.worker.ts', import.meta.url), {
    type: 'module',
  });
  worker.onmessage = (ev: MessageEvent<RespostaChunk>) => fila.push(ev.data);

  function criarMalha(nome: string, b: Buffers, mat: StandardMaterial, cx: number, cz: number) {
    if (b.indices.length === 0) return null;
    const m = new Mesh(nome, scene);
    const dados = new VertexData();
    dados.positions = b.posicoes;
    dados.normals = b.normais;
    dados.uvs = b.uvs;
    dados.colors = b.cores;
    dados.indices = b.indices;
    dados.applyToMesh(m);
    m.material = mat;
    m.position.set(cx * TAM_X, 0, cz * TAM_Z);
    m.freezeWorldMatrix();
    return m;
  }

  function aplicar(r: RespostaChunk): void {
    const k = chave(r.cx, r.cz);
    pedidos.delete(k);
    const lista: Mesh[] = [];
    const s = criarMalha(`chunk-${k}`, r.solido, matSolido, r.cx, r.cz);
    if (s) lista.push(s);
    const p = criarMalha(`plantas-${k}`, r.plantas, matPlanta, r.cx, r.cz);
    if (p) lista.push(p);
    malhas.set(k, lista);
  }

  function atualizarChunks(): void {
    const cx = Math.floor(camera.position.x / TAM_X);
    const cz = Math.floor(camera.position.z / TAM_Z);
    const desejados = chunksDesejados(cx, cz, RAIO_INICIAL);
    const plano = planejar([...malhas.keys(), ...pedidos], desejados);
    for (const k of plano.descartar) {
      malhas.get(k)?.forEach((m) => m.dispose());
      malhas.delete(k);
      pedidos.delete(k);
    }
    for (const c of plano.carregar) {
      pedidos.add(chave(c.cx, c.cz));
      worker.postMessage({ cx: c.cx, cz: c.cz, semente: SEMENTE_PADRAO });
    }
    for (const r of aplicarPorQuadro(fila, MAX_POR_QUADRO)) {
      if (planejar([], desejados).carregar.some((c) => c.cx === r.cx && c.cz === r.cz)) {
        aplicar(r);
      } else {
        pedidos.delete(chave(r.cx, r.cz));
      }
    }
    estado.chunksCarregados = malhas.size;
    if (!estado.ready && pedidos.size === 0 && fila.length === 0 && malhas.size > 0) {
      estado.ready = true;
    }
  }

  engine.runRenderLoop(() => {
    atualizarChunks();
    estado.fps = engine.getFps();
    scene.render();
  });
  window.addEventListener('resize', () => engine.resize());

  return { engine, scene, camera };
}
