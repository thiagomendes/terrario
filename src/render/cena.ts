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
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { CascadedShadowGenerator } from '@babylonjs/core/Lights/Shadows/cascadedShadowGenerator';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import '@babylonjs/core/Layers/effectLayerSceneComponent';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { criarControle } from '../player/controle';
import { gerarAtlas } from '../art/atlas';
import { Bloco } from '../world/blocks';
import { DENSIDADE_NEVOA, DIRECAO_SOL, PALETA } from './atmosfera';
import { PluginBalanco } from './balanco';
import { SEMENTE_PADRAO, TAM_X, TAM_Z } from '../world/chunk';
import type { Buffers } from '../mesh/malha';
import type { RespostaChunk } from '../workers/chunk.worker';
import { ajustarEscala, escalaBase } from './resolucao';
import { aplicarPorQuadro, chave, chunksDesejados, planejar } from './gerenciador';

const RAIO_INICIAL = 3;
const RAIO_SOMBRA = 1;

function criarCeu(scene: Scene): void {
  const textura = new DynamicTexture('ceu-grad', { width: 4, height: 256 }, scene, false);
  const ctx = textura.getContext();
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  const css = (c: readonly number[]) => `rgb(${c.map((v) => Math.round(v * 255)).join(',')})`;
  grad.addColorStop(0, css(PALETA.ceuZenite));
  grad.addColorStop(0.45, css(PALETA.ceuMeio));
  grad.addColorStop(0.5, css(PALETA.ceuHorizonte));
  grad.addColorStop(1, css(PALETA.ceuHorizonte));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 256);
  textura.update();

  const mat = new StandardMaterial('ceu', scene);
  mat.backFaceCulling = false;
  mat.disableLighting = true;
  mat.fogEnabled = false;
  mat.diffuseColor = Color3.Black();
  mat.specularColor = Color3.Black();
  mat.emissiveTexture = textura;
  textura.wrapU = Texture.CLAMP_ADDRESSMODE;
  textura.wrapV = Texture.CLAMP_ADDRESSMODE;

  const domo = MeshBuilder.CreateSphere('ceu', { diameter: 500, segments: 16 }, scene);
  domo.material = mat;
  domo.infiniteDistance = true;
  domo.isPickable = false;
  domo.applyFog = false;
}
const MAX_POR_QUADRO = 2;

export interface EstadoDepuracao {
  ready: boolean;
  chunksCarregados: number;
  fps: number;
  escalaResolucao: number;
  posicao?: number[];
  rotacao?: number[];
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
  const cor = new Color3(...PALETA.nevoa);
  scene.clearColor = new Color4(cor.r, cor.g, cor.b, 1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogColor = cor;
  scene.fogDensity = DENSIDADE_NEVOA;
  scene.ambientColor = new Color3(...PALETA.sombra);

  const camera = new UniversalCamera('camera', new Vector3(8, 45, 8), scene);
  camera.minZ = 0.1;
  camera.maxZ = 300;
  const controle = criarControle(canvas, camera);
  controle.atualizar(0);

  const luz = new HemisphericLight('luz', new Vector3(0.3, 1, 0.2), scene);
  luz.diffuse = new Color3(0.75, 0.65, 0.7);
  luz.groundColor = new Color3(...PALETA.sombra);
  luz.intensity = 0.8;

  const sol = new DirectionalLight('sol', new Vector3(...DIRECAO_SOL), scene);
  sol.diffuse = new Color3(...PALETA.sol);
  sol.specular = Color3.Black();
  sol.intensity = 1.1;
  sol.position = new Vector3(60, 90, 60);
  sol.autoUpdateExtends = true;

  const sombras = new CascadedShadowGenerator(1024, sol);
  sombras.numCascades = 2;
  sombras.lambda = 0.7;
  sombras.shadowMaxZ = 80;
  sombras.bias = 0.01;
  sombras.normalBias = 0.02;
  sombras.setDarkness(0.35);
  sombras.filteringQuality = ShadowGenerator.QUALITY_LOW;
  sombras.usePercentageCloserFiltering = true;

  const glow = new GlowLayer('glow', scene, { blurKernelSize: 24 });
  glow.intensity = 0.9;

  criarCeu(scene);

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

  // Mapa emissivo: só os tiles de cristal e cogumelo mantêm cor, o resto fica preto.
  const emissivos = new Set<number>([Bloco.CRISTAL_LUZ, Bloco.COGUMELO_BRILHANTE]);
  const pxEmissivo = new Uint8Array(atlas.largura * atlas.altura * 4);
  for (const t of atlas.tiles) {
    if (!emissivos.has(t.bloco)) continue;
    const x0 = Math.round(t.uv.u0 * atlas.largura);
    const x1 = Math.round(t.uv.u1 * atlas.largura);
    const y0 = Math.round(t.uv.v0 * atlas.altura);
    const y1 = Math.round(t.uv.v1 * atlas.altura);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * atlas.largura + x) * 4;
        pxEmissivo[i] = atlas.pixels[i];
        pxEmissivo[i + 1] = atlas.pixels[i + 1];
        pxEmissivo[i + 2] = atlas.pixels[i + 2];
        pxEmissivo[i + 3] = 255;
      }
    }
  }
  const texEmissiva = RawTexture.CreateRGBATexture(
    pxEmissivo,
    atlas.largura,
    atlas.altura,
    scene,
    false,
    false,
    Texture.NEAREST_SAMPLINGMODE,
  );

  const matSolido = new StandardMaterial('atlas', scene);
  matSolido.diffuseTexture = textura;
  matSolido.emissiveTexture = texEmissiva;
  matSolido.emissiveColor = Color3.White();
  matSolido.specularColor = Color3.Black();
  matSolido.ambientColor = Color3.White();
  matSolido.backFaceCulling = false;

  const matPlanta = new StandardMaterial('atlas-plantas', scene);
  matPlanta.diffuseTexture = textura;
  matPlanta.emissiveTexture = texEmissiva;
  matPlanta.emissiveColor = Color3.White();
  const balanco = new PluginBalanco(matPlanta);
  matPlanta.specularColor = Color3.Black();
  matPlanta.ambientColor = Color3.White();
  matPlanta.backFaceCulling = false;
  matPlanta.useAlphaFromDiffuseTexture = true;
  matPlanta.transparencyMode = Material.MATERIAL_ALPHATESTANDBLEND;
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

  const comSombra = new Set<Mesh>();
  function atualizarSombras(): void {
    const ccx = Math.floor(camera.position.x / TAM_X);
    const ccz = Math.floor(camera.position.z / TAM_Z);
    for (const [k, lista] of malhas) {
      const [cx, cz] = k.split(',').map(Number);
      const perto = Math.abs(cx - ccx) <= RAIO_SOMBRA && Math.abs(cz - ccz) <= RAIO_SOMBRA;
      for (const m of lista) {
        if (perto && !comSombra.has(m)) {
          sombras.addShadowCaster(m);
          m.receiveShadows = true;
          comSombra.add(m);
        } else if (!perto && comSombra.has(m)) {
          sombras.removeShadowCaster(m);
          m.receiveShadows = false;
          comSombra.delete(m);
        }
      }
    }
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
      malhas.get(k)?.forEach((m) => {
        comSombra.delete(m);
        m.dispose();
      });
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
    atualizarSombras();
    estado.chunksCarregados = malhas.size;
    if (!estado.ready && pedidos.size === 0 && fila.length === 0 && malhas.size > 0) {
      estado.ready = true;
    }
  }

  engine.runRenderLoop(() => {
    controle.atualizar(engine.getDeltaTime() / 1000);
    atualizarChunks();
    estado.fps = engine.getFps();
    estado.posicao = [camera.position.x, camera.position.y, camera.position.z];
    estado.rotacao = [camera.rotation.x, camera.rotation.y];
    balanco.atualizar(performance.now() / 1000);
    scene.render();
  });
  let base = escalaBase(window.innerWidth);
  function aplicarEscala(valor: number): void {
    estado.escalaResolucao = valor;
    engine.setHardwareScalingLevel(valor);
    engine.resize();
  }
  aplicarEscala(base);
  setInterval(() => {
    if (!estado.ready) return;
    const nova = ajustarEscala(estado.escalaResolucao, estado.fps, base);
    if (nova !== estado.escalaResolucao) aplicarEscala(nova);
  }, 2000);
  window.addEventListener('resize', () => {
    const anterior = base;
    base = escalaBase(window.innerWidth);
    if (base !== anterior) aplicarEscala(Math.max(base, estado.escalaResolucao));
    else engine.resize();
  });

  return { engine, scene, camera };
}
