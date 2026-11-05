import { construirMapaEmissivo } from './emissivo';
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
import type { LinesMesh } from '@babylonjs/core/Meshes/linesMesh';
import { COR_DESTAQUE, estadoDestaque } from './destaque';
import { criarControle } from '../player/controle';
import { gerarAtlas } from '../art/atlas';
import { Bloco } from '../world/blocks';
import {
  DENSIDADE_NEVOA,
  DIRECAO_SOL,
  INTENSIDADE_GLOW,
  LUZ_PREENCHIMENTO,
  NUM_CASCATAS,
  PALETA,
} from './atmosfera';
import { PluginBalanco } from './balanco';
import { SEMENTE_PADRAO, TAM_X, TAM_Z } from '../world/chunk';
import type { Buffers } from '../mesh/malha';
import type { RespostaChunk, PedidoChunk } from '../workers/chunk.worker';
import { criarEdicoes } from '../world/edicoes';
import { ALTURA, gerarChunk, indice } from '../world/chunk';
import { posicaoColocacao, raycastVoxel, type Vec3 } from '../player/alvo';
import { criarBarramento, type Barramento } from '../player/eventos';
import { criarMinerador } from '../player/minerador';
import { colocacaoPermitida, type AlvoMineracao } from '../player/mineracao';
import { criarHotbar, type Hotbar } from '../player/hotbar';
import {
  acaoParaBotao,
  executarInteracao,
  tratarMenuContexto,
  type AcaoInteracao,
} from '../player/interacao';
import type { EdicoesExportadas } from '../world/edicoes';
import { chunksAfetados } from './remalha';
import { criarFilaRemalha, MAX_REMALHAS_POR_QUADRO } from './fila';
import { ajustarEscala, escalaBase } from './resolucao';

/** Limite do dt (s) que alimenta minerador e efeitos: quadros lentos não os atropelam. */
const DT_MAXIMO_QUADRO = 1 / 30;
import { criarPoolParticulas, LIMITE_PARTICULAS } from '../fx/particulas';
import { ESTAGIOS_RACHADURA, gerarTexturaRachadura, TAM_RACHADURA } from '../fx/rachadura';
import {
  DURACAO_PULSO,
  escalaPulso,
  estadoRachadura,
  FOLGA_RACHADURA,
  opacidadePulso,
  planejarEfeito,
} from './efeitos';
import { criarGerador } from '../audio/variacao';
import { criarMotorAudio, type ContextoAudio } from '../audio/motor';
import { ativarNoPrimeiroGesto, ligarAudio, teclaParaMudo } from '../audio/ligador';
import { grupoDoBloco } from '../audio/materiais';
import { iniciarAmbiente, tocarSom, type Ambiente } from '../audio/sons';
import { blocoSobPes, criarDetectorMovimento } from '../player/movimento';
import { VEL_ANDAR, VEL_CORRER } from '../player/fisica';
import { chave, chunksDesejados, planejar, respostaObsoleta } from './gerenciador';

const RAIO_INICIAL = 3;
const RAIO_SOMBRA = 1;
const ALCANCE = 5;

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

export interface EstadoDepuracao {
  ready: boolean;
  chunksCarregados: number;
  fps: number;
  escalaResolucao: number;
  posicao?: number[];
  rotacao?: number[];
  interagir?: (acao: AcaoInteracao) => boolean;
  selecionarSlot?: (i: number) => void;
  apontar?: (yaw: number, pitch: number) => void;
  bloco?: (x: number, y: number, z: number) => number;
  slotAtivo?: number;
  destaqueVisivel?: boolean;
  malhasAtivas?: number;
  remalhasConcluidas?: number;
  remalhaMs?: number;
  aplicadasNoUltimoQuadro?: number;
  alvo?: { x: number; y: number; z: number; normal: Vec3 } | null;
  barramento?: Barramento;
  minerar?: (
    segundos: number,
    segurando?: boolean,
  ) => { quebrou: boolean; progresso: number; estagio: number };
  mineracao?: { segurando: boolean; progresso: number; estagio: number };
  rachadura?: { visivel: boolean; estagio: number };
  fx?: { particulas: number };
  audio?: { estado: string; vozes: number; mudo: boolean; ambiente?: boolean };
}

declare global {
  interface Window {
    __brumaluz?: EstadoDepuracao;
  }
}

export function criarCena(canvas: HTMLCanvasElement, hotbar: Hotbar = criarHotbar()) {
  const estado: EstadoDepuracao = {
    ready: false,
    chunksCarregados: 0,
    fps: 0,
    escalaResolucao: 1,
    destaqueVisivel: false,
    malhasAtivas: 0,
    remalhasConcluidas: 0,
    remalhaMs: 0,
    aplicadasNoUltimoQuadro: 0,
  };
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
  const edicoes = criarEdicoes();
  const controle = criarControle(canvas, camera, SEMENTE_PADRAO, edicoes);
  controle.atualizar(0);

  const luz = new HemisphericLight('luz', new Vector3(0.3, 1, 0.2), scene);
  luz.diffuse = new Color3(...LUZ_PREENCHIMENTO.cor);
  luz.groundColor = new Color3(...PALETA.sombra);
  luz.intensity = LUZ_PREENCHIMENTO.intensidade;

  const sol = new DirectionalLight('sol', new Vector3(...DIRECAO_SOL), scene);
  sol.diffuse = new Color3(...PALETA.sol);
  sol.specular = Color3.Black();
  sol.intensity = 1.1;
  sol.position = new Vector3(60, 90, 60);
  sol.autoUpdateExtends = true;

  const sombras = new CascadedShadowGenerator(1024, sol);
  sombras.numCascades = NUM_CASCATAS;
  sombras.lambda = 0.7;
  sombras.shadowMaxZ = 80;
  sombras.bias = 0.01;
  sombras.normalBias = 0.02;
  sombras.setDarkness(0.35);
  sombras.filteringQuality = ShadowGenerator.QUALITY_LOW;
  sombras.usePercentageCloserFiltering = true;

  const glow = new GlowLayer('glow', scene, { blurKernelSize: 24 });
  glow.intensity = INTENSIDADE_GLOW;

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
  const pxEmissivo = new Uint8Array(
    construirMapaEmissivo(atlas, [Bloco.CRISTAL_LUZ, Bloco.COGUMELO_BRILHANTE]),
  );
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
  const fila = criarFilaRemalha<RespostaChunk>();
  const pedidos = new Set<string>();
  const prioritarios = new Set<string>();
  const versoesPedidas = new Map<string, number>();
  const worker = new Worker(new URL('../workers/chunk.worker.ts', import.meta.url), {
    type: 'module',
  });
  worker.onmessage = (ev: MessageEvent<RespostaChunk>) => {
    const r = ev.data;
    fila.adicionar({
      cx: r.cx,
      cz: r.cz,
      editado: prioritarios.has(chave(r.cx, r.cz)),
      dados: r,
    });
  };

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
    malhas.get(k)?.forEach((m) => {
      if (comSombra.has(m)) sombras.removeShadowCaster(m);
      comSombra.delete(m);
      m.dispose();
    });
    const lista: Mesh[] = [];
    const s = criarMalha(`chunk-${k}`, r.solido, matSolido, r.cx, r.cz);
    if (s) lista.push(s);
    const p = criarMalha(`plantas-${k}`, r.plantas, matPlanta, r.cx, r.cz);
    if (p) lista.push(p);
    malhas.set(k, lista);
  }

  function solicitar(cx: number, cz: number): void {
    const k = chave(cx, cz);
    const versao = (versoesPedidas.get(k) ?? 0) + 1;
    versoesPedidas.set(k, versao);
    const edicoesPedido: EdicoesExportadas = {};
    for (const [dx, dz] of [
      [0, 0],
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const lista = edicoes.doChunk(cx + dx, cz + dz);
      if (lista.length > 0) edicoesPedido[chave(cx + dx, cz + dz)] = lista;
    }
    const pedido: PedidoChunk = { cx, cz, semente: SEMENTE_PADRAO, versao, edicoes: edicoesPedido };
    worker.postMessage(pedido);
  }

  function editarBloco(x: number, y: number, z: number, bloco: number): boolean {
    if (!edicoes.definir(x, y, z, bloco)) return false;
    for (const c of chunksAfetados(x, z)) {
      const k = chave(c.cx, c.cz);
      if (!malhas.has(k) && !pedidos.has(k)) continue;
      prioritarios.add(k);
      pedidos.add(k);
      solicitar(c.cx, c.cz);
    }
    return true;
  }

  const cacheBlocos = new Map<string, { versao: number; blocos: Uint8Array }>();
  function blocoEm(x: number, y: number, z: number): number {
    if (y < 0 || y >= ALTURA) return Bloco.AR;
    const editado = edicoes.obter(x, y, z);
    if (editado !== undefined) return editado;
    const cx = Math.floor(x / TAM_X);
    const cz = Math.floor(z / TAM_Z);
    const k = chave(cx, cz);
    let entrada = cacheBlocos.get(k);
    if (!entrada) {
      entrada = { versao: 0, blocos: gerarChunk(cx, cz, SEMENTE_PADRAO) };
      cacheBlocos.set(k, entrada);
    }
    return entrada.blocos[indice(x - cx * TAM_X, y, z - cz * TAM_Z)];
  }

  function calcularAlvo() {
    const yaw = camera.rotation.y;
    const pitch = camera.rotation.x;
    const direcao = {
      x: Math.sin(yaw) * Math.cos(pitch),
      y: -Math.sin(pitch),
      z: Math.cos(yaw) * Math.cos(pitch),
    };
    const a = raycastVoxel(
      { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      direcao,
      ALCANCE,
      (x, y, z) => blocoEm(x, y, z) !== Bloco.AR,
    );
    return a ? { x: a.x, y: a.y, z: a.z, normal: a.normal } : null;
  }

  function interagir(acao: AcaoInteracao): boolean {
    return executarInteracao(acao, {
      alvo: calcularAlvo(),
      edicoes,
      blocoAtivo: hotbar.blocoAtivo(),
      jogador: controle.jogador,
      editar: editarBloco,
    });
  }

  const barramento = criarBarramento();
  estado.barramento = barramento;

  function alvoMineracao(): AlvoMineracao | null {
    const a = calcularAlvo();
    return a ? { x: a.x, y: a.y, z: a.z, bloco: blocoEm(a.x, a.y, a.z) } : null;
  }

  function interagirComEventos(acao: AcaoInteracao): boolean {
    const a = calcularAlvo();
    if (!a) return false;
    const bloco = acao === 'quebrar' ? blocoEm(a.x, a.y, a.z) : hotbar.blocoAtivo();
    const pos = acao === 'quebrar' ? a : posicaoColocacao(a);
    const ok = interagir(acao);
    if (ok) {
      barramento.emitir(acao === 'quebrar' ? 'quebra' : 'colocacao', {
        x: pos.x,
        y: pos.y,
        z: pos.z,
        bloco,
      });
    } else {
      barramento.emitir('recusa', { motivo: acao });
    }
    return ok;
  }

  const minerador = criarMinerador({
    barramento,
    quebrar: (a) =>
      executarInteracao('quebrar', {
        alvo: { x: a.x, y: a.y, z: a.z, normal: { x: 0, y: 1, z: 0 } },
        edicoes,
        blocoAtivo: hotbar.blocoAtivo(),
        jogador: controle.jogador,
        editar: editarBloco,
      }),
  });

  let ultimaColocacao: number | null = null;
  canvas.addEventListener('mousedown', (e) => {
    const acao = acaoParaBotao(e.button, document.pointerLockElement === canvas);
    if (acao === 'quebrar') {
      minerador.pressionar();
    } else if (acao === 'colocar') {
      const agora = performance.now() / 1000;
      if (!colocacaoPermitida(agora, ultimaColocacao)) return;
      ultimaColocacao = agora;
      interagirComEventos('colocar');
    }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) minerador.soltar();
  });
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== canvas) minerador.perderBloqueio();
  });
  let slotConhecido = hotbar.ativo;
  function verificarSlot(): void {
    if (hotbar.ativo === slotConhecido) return;
    slotConhecido = hotbar.ativo;
    minerador.trocarSlot(slotConhecido);
  }
  canvas.addEventListener('contextmenu', tratarMenuContexto);

  estado.minerar = (segundos, segurando = true) => {
    verificarSlot();
    const estavaSegurando = minerador.segurando;
    if (segurando) minerador.pressionar();
    else minerador.soltar();
    let quebrou = false;
    const quadros = Math.round(segundos * 60);
    for (let i = 0; i < quadros; i++) {
      if (minerador.atualizar(1 / 60, alvoMineracao()).quebrou) quebrou = true;
    }
    if (!estavaSegurando && segurando) minerador.soltar();
    return { quebrou, progresso: minerador.progresso, estagio: minerador.estagio };
  };
  Object.defineProperty(estado, 'mineracao', {
    get: () => ({
      segurando: minerador.segurando,
      progresso: minerador.progresso,
      estagio: minerador.estagio,
    }),
    enumerable: true,
  });

  estado.interagir = interagirComEventos;
  estado.selecionarSlot = (i: number) => {
    hotbar.selecionar(i);
    verificarSlot();
  };
  estado.apontar = (yaw, pitch) => controle.apontar(yaw, pitch);
  estado.bloco = blocoEm;
  Object.defineProperty(estado, 'slotAtivo', { get: () => hotbar.ativo, enumerable: true });
  Object.defineProperty(estado, 'alvo', { get: calcularAlvo, enumerable: true });

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
      prioritarios.delete(k);
    }
    for (const c of plano.carregar) {
      pedidos.add(chave(c.cx, c.cz));
      solicitar(c.cx, c.cz);
    }
    const queridos = new Set(desejados.map((c) => chave(c.cx, c.cz)));
    let aplicadas = 0;
    for (const item of fila.retirar(MAX_REMALHAS_POR_QUADRO)) {
      const r = item.dados;
      const k = chave(r.cx, r.cz);
      const atual = versoesPedidas.get(k) ?? 0;
      if (respostaObsoleta(r.versao, atual, !queridos.has(k))) {
        if (!queridos.has(k)) pedidos.delete(k);
        continue;
      }
      const foiEditado = prioritarios.delete(k);
      const inicio = performance.now();
      aplicar(r);
      aplicadas++;
      if (foiEditado) {
        estado.remalhasConcluidas = (estado.remalhasConcluidas ?? 0) + 1;
        estado.remalhaMs = performance.now() - inicio;
      }
    }
    estado.aplicadasNoUltimoQuadro = aplicadas;
    let ativas = 0;
    for (const lista of malhas.values()) ativas += lista.length;
    estado.malhasAtivas = ativas;
    atualizarSombras();
    estado.chunksCarregados = malhas.size;
    if (!estado.ready && pedidos.size === 0 && fila.tamanho === 0 && malhas.size > 0) {
      estado.ready = true;
    }
  }

  // Efeitos: nunca emissivos, fora do glow e não selecionáveis.
  function prepararEfeito(m: Mesh): void {
    m.isPickable = false;
    m.receiveShadows = false;
    glow.addExcludedMesh(m);
  }

  const rngFx = criarGerador(7);
  const pool = criarPoolParticulas(LIMITE_PARTICULAS);
  const cubosParticulas: Mesh[] = [];
  const matsParticulas: StandardMaterial[] = [];
  for (let i = 0; i < pool.capacidade; i++) {
    const cubo = MeshBuilder.CreateBox(`particula-${i}`, { size: 0.12 }, scene);
    const mat = new StandardMaterial(`particula-mat-${i}`, scene);
    mat.specularColor = Color3.Black();
    mat.emissiveColor = Color3.Black();
    cubo.material = mat;
    cubo.setEnabled(false);
    prepararEfeito(cubo);
    cubosParticulas.push(cubo);
    matsParticulas.push(mat);
  }

  const texRachaduras: StandardMaterial[] = [];
  for (let e = 1; e <= ESTAGIOS_RACHADURA; e++) {
    const pixels = new Uint8Array(gerarTexturaRachadura(e, SEMENTE_PADRAO).buffer);
    const tex = RawTexture.CreateRGBATexture(
      pixels,
      TAM_RACHADURA,
      TAM_RACHADURA,
      scene,
      false,
      false,
      Texture.NEAREST_SAMPLINGMODE,
    );
    tex.hasAlpha = true;
    const mat = new StandardMaterial(`rachadura-${e}`, scene);
    mat.diffuseTexture = tex;
    mat.useAlphaFromDiffuseTexture = true;
    mat.emissiveColor = Color3.Black();
    mat.specularColor = Color3.Black();
    mat.backFaceCulling = true;
    texRachaduras.push(mat);
  }
  const caixaRachadura = MeshBuilder.CreateBox(
    'rachadura',
    { size: 1 + FOLGA_RACHADURA * 2 },
    scene,
  );
  caixaRachadura.setEnabled(false);
  prepararEfeito(caixaRachadura);
  let estagioRachaduraAtual = 0;

  const matPulso = new StandardMaterial('pulso', scene);
  matPulso.diffuseColor = new Color3(0.8, 0.8, 0.85);
  matPulso.emissiveColor = Color3.Black();
  matPulso.specularColor = Color3.Black();
  const caixaPulso = MeshBuilder.CreateBox('pulso', { size: 1 }, scene);
  caixaPulso.material = matPulso;
  caixaPulso.setEnabled(false);
  prepararEfeito(caixaPulso);
  let tempoPulso = DURACAO_PULSO;

  function aplicarPlano<K extends 'golpe' | 'quebra' | 'colocacao'>(
    nome: K,
    dados: { x: number; y: number; z: number; bloco: number },
  ): void {
    const plano = planejarEfeito(nome, dados as never, rngFx);
    const lista = plano.particulas.map((p) => ({
      ...p,
      cor: p.cor.map((c) => c / 255) as [number, number, number],
    }));
    pool.emitir(lista);
    if (plano.pulso) {
      caixaPulso.position.set(dados.x + 0.5, dados.y + 0.5, dados.z + 0.5);
      tempoPulso = 0;
    }
  }
  barramento.ouvir('golpe', (d) => aplicarPlano('golpe', d));
  barramento.ouvir('quebra', (d) => aplicarPlano('quebra', d));
  barramento.ouvir('colocacao', (d) => aplicarPlano('colocacao', d));

  function atualizarEfeitos(dt: number): void {
    pool.atualizar(dt);
    const vivas = pool.vivas();
    for (let i = 0; i < cubosParticulas.length; i++) {
      const cubo = cubosParticulas[i];
      if (i >= vivas) {
        cubo.setEnabled(false);
        continue;
      }
      cubo.setEnabled(true);
      cubo.position.set(pool.posicoes[i * 3], pool.posicoes[i * 3 + 1], pool.posicoes[i * 3 + 2]);
      matsParticulas[i].diffuseColor.set(
        pool.cores[i * 3],
        pool.cores[i * 3 + 1],
        pool.cores[i * 3 + 2],
      );
    }
    estado.fx = { particulas: vivas };

    const est = minerador.estado;
    const r = estadoRachadura(est.chaveAtual, minerador.progresso);
    if (r.visivel && est.chaveAtual) {
      const [x, y, z] = est.chaveAtual.split(',').map(Number);
      caixaRachadura.position.set(x + 0.5, y + 0.5, z + 0.5);
      if (r.estagio !== estagioRachaduraAtual) {
        caixaRachadura.material = texRachaduras[r.estagio - 1];
      }
    }
    estagioRachaduraAtual = r.estagio;
    caixaRachadura.setEnabled(r.visivel);
    estado.rachadura = r;

    tempoPulso += dt;
    const ativo = tempoPulso < DURACAO_PULSO;
    caixaPulso.setEnabled(ativo);
    if (ativo) {
      caixaPulso.scaling.setAll(escalaPulso(tempoPulso));
      matPulso.alpha = opacidadePulso(tempoPulso) * 0.35;
    }
  }
  estado.fx = { particulas: 0 };
  estado.rachadura = { visivel: false, estagio: 0 };

  let contorno: LinesMesh | null = null;
  let chaveContorno = '';
  function atualizarDestaque(): void {
    const alvo = calcularAlvo();
    const d = estadoDestaque(alvo);
    if (d.chave !== chaveContorno) {
      contorno?.dispose();
      contorno = null;
      chaveContorno = d.chave;
      if (d.visivel) {
        const linhas = d.arestas.map(([a, b]) => [new Vector3(...a), new Vector3(...b)]);
        const l = MeshBuilder.CreateLineSystem('destaque', { lines: linhas }, scene);
        l.color = new Color3(...COR_DESTAQUE);
        l.isPickable = false;
        l.receiveShadows = false;
        l.renderingGroupId = 1;
        glow.addExcludedMesh(l);
        contorno = l;
      }
    }
    estado.destaqueVisivel = contorno !== null;
  }

  // Áudio: o contexto só nasce no primeiro gesto do jogador.
  const motorAudio = criarMotorAudio(() => new AudioContext() as unknown as ContextoAudio);
  ligarAudio(barramento, motorAudio);
  const detector = criarDetectorMovimento();
  let ambiente: Ambiente | null = null;
  ativarNoPrimeiroGesto(document, {
    ativar: async () => {
      await motorAudio.ativar();
      if (motorAudio.estado !== 'ativo') return;
      tocarSom(motorAudio, 'entrada');
      ambiente = iniciarAmbiente(motorAudio);
    },
  });
  window.addEventListener('keydown', (e) => {
    if (teclaParaMudo(e.code) && !e.repeat) motorAudio.alternarMudo();
  });
  Object.defineProperty(estado, 'audio', {
    get: () => ({
      estado: motorAudio.estado,
      vozes: motorAudio.vozes,
      mudo: motorAudio.mudo,
      ambiente: ambiente !== null,
    }),
    enumerable: true,
  });
  let ultimoX = controle.jogador.x;
  let ultimoZ = controle.jogador.z;
  function atualizarSomMovimento(dt: number): void {
    const j = controle.jogador;
    const vel = dt > 0 ? Math.hypot(j.x - ultimoX, j.z - ultimoZ) / dt : 0;
    ultimoX = j.x;
    ultimoZ = j.z;
    const eventos = detector.atualizar(dt, {
      noChao: j.noChao,
      velocidadeHoriz: vel,
      correndo: vel > (VEL_ANDAR + VEL_CORRER) / 2,
    });
    if (eventos.length === 0) return;
    const grupo = grupoDoBloco(blocoSobPes(j, blocoEm)) ?? 'terra';
    for (const ev of eventos) {
      tocarSom(motorAudio, ev, grupo);
    }
  }

  engine.runRenderLoop(() => {
    const dtBruto = engine.getDeltaTime() / 1000;
    const dtQuadro = Math.min(dtBruto, DT_MAXIMO_QUADRO);
    controle.atualizar(dtBruto);
    atualizarSomMovimento(Math.min(dtBruto, 0.05));
    verificarSlot();
    minerador.atualizar(dtQuadro, alvoMineracao());
    atualizarChunks();
    atualizarDestaque();
    atualizarEfeitos(dtQuadro);
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

  return { engine, scene, camera, editarBloco, edicoes };
}
