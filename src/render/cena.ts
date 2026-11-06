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
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
import '@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderPipelineManagerSceneComponent';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';
import { ColorCurves } from '@babylonjs/core/Materials/colorCurves';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { LinesMesh } from '@babylonjs/core/Meshes/linesMesh';
import { COR_DESTAQUE, estadoDestaque } from './destaque';
import { criarControle } from '../player/controle';
import { gerarAtlas } from '../art/atlas';
import { Bloco, ehAlvo, obterBloco as obterBlocoDef } from '../world/blocks';
import {
  DENSIDADE_NEVOA,
  DIRECAO_SOL,
  DURACAO_DIA,
  HORA_INICIAL,
  INTENSIDADE_GLOW,
  LUZ_PREENCHIMENTO,
  NUM_CASCATAS,
  PALETA,
  ajustarPorClima,
  atmosferaNaHora,
  normalizarHora,
} from './atmosfera';
import { criarCeu } from './ceu';
import { criarAgua } from './agua';
import { criarSobrevivencia } from '../jogo/sobrevivencia';
import { criarVagalumes } from './vagalumes';
import { PluginMundo } from './materialMundo';
import { PluginBalanco } from './balanco';
import { SEMENTE_PADRAO, TAM_X, TAM_Z } from '../world/chunk';
import type { DadosMundo, MetaMundo, ModoJogo, RepositorioMundos } from '../jogo/mundos';
import { criarMundoDeItens, dropsDoBloco } from '../jogo/drops';
import { direcaoDoYaw } from '../world/formas';
import { podeColetar, velocidadeMineracao } from '../jogo/ferramentas';
import { obterItem } from '../jogo/itens';
import { criarRenderItens } from './itensSoltos';
import {
  criarClima,
  estacaoDoDia,
  NOMES_CLIMA,
  NOMES_ESTACAO,
  type TipoClima,
} from '../jogo/clima';
import { criarPrecipitacao } from './precipitacao';
import { criarVisualConstrucao } from './construcao';
import { corDaColuna, topoDaColuna, type Rgb } from '../jogo/mapa';
import { corMediaDoBloco } from '../fx/cores';
import {
  NOMES_FERRAMENTA,
  colar,
  copiar,
  criarHistorico,
  espelharX,
  pontosDaForma,
  type Blueprint,
  type Edicao,
  type Ferramenta,
  type Ponto,
} from '../jogo/construcao';
import { empacotar } from '../world/edicoes';
import { criarPopulacao } from '../jogo/populacao';
import { criaturaNaMira, type TipoCriatura } from '../jogo/criaturas';
import { criarRenderCriaturas } from './criaturas';
import { biomaEm, NIVEL_MAR } from '../world/chunk';
import { luzDoBloco } from '../world/blocks';
import { perfilDaQualidade, type Config, type GerenciadorConfig } from '../jogo/config';
import { iconeDoItem } from '../ui/icones';
import type { Buffers } from '../mesh/malha';
import type { RespostaChunk, PedidoChunk } from '../workers/chunk.worker';
import { criarEdicoes } from '../world/edicoes';
import { ALTURA, alturaTerreno, gerarChunk, indice } from '../world/chunk';
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
import {
  alternar as alternarCamera,
  criarEstadoCamera,
  definir as definirCamera,
  posicaoTerceiraPessoa,
  teclaParaCamera,
  visibilidadePorModo,
  type ModoCamera,
} from '../player/camera';
import { chave, chunksDesejados, planejar, respostaObsoleta } from './gerenciador';
import { criarAnimador } from '../player/animacao';
import { MODELOS, normalizarAparencia, type Aparencia } from '../personagem/aparencia';
import { carregarAparencia, type Armazenamento } from '../personagem/persistencia';
import type { Pose } from '../personagem/poses';
import { criarBraco } from './braco';
import { criarPersonagem } from './personagem';

const RAIO_INICIAL = 3;
/** Blocos que o clique direito usa em vez de colocar algo. */
const INTERATIVOS = new Set<number>([
  Bloco.MESA_TRABALHO,
  Bloco.FORNALHA,
  Bloco.FORNALHA_ACESA,
  Bloco.BAU,
  Bloco.PORTA,
  Bloco.PORTA_ABERTA,
  Bloco.CAMA,
]);
let raioChunks = RAIO_INICIAL;
let fatorNevoa = 1;
const RAIO_SOMBRA = 1;
const ALCANCE = 5;

export interface EstadoDepuracao {
  ready: boolean;
  chunksCarregados: number;
  fps: number;
  escalaResolucao: number;
  /** Hora do dia em [0, 1): 0 meia-noite, 0.5 meio-dia. Gravável nos testes. */
  /** Leva o jogador para o topo do terreno em (x, z) (testes e capturas). */
  teleportar?: (x: number, z: number, y?: number) => void;
  /** Pausa o relógio do dia (testes e capturas). */
  salvar?: (comMiniatura?: boolean) => Promise<boolean>;
  ultimoSalvamento?: number;
  mundo?: MetaMundo;
  pausarDia?: boolean;
  posicao?: number[];
  rotacao?: number[];
  interagir?: (acao: AcaoInteracao) => boolean;
  selecionarSlot?: (i: number) => void;
  apontar?: (yaw: number, pitch: number) => void;
  bloco?: (x: number, y: number, z: number) => number;
  meta?: (x: number, y: number, z: number) => number;
  hora?: number;
  definirBloco?: (x: number, y: number, z: number, b: number, meta?: number) => boolean;
  slotAtivo?: number;
  destaqueVisivel?: boolean;
  malhasAtivas?: number;
  remalhasConcluidas?: number;
  remalhaMs?: number;
  aplicadasNoUltimoQuadro?: number;
  atmosfera?: { noite: number; crepusculo: number };
  itensSoltos?: number;
  soltarItem?: (item: string, qtd: number, x: number, y: number, z: number) => void;
  modo?: ModoJogo;
  controleDireto?: {
    olhar: (dx: number, dy: number) => void;
    mover: (frente: number, direita: number) => void;
    tecla: (acao: 'pular' | 'correr' | 'rapido', ativo: boolean) => void;
    quebrar: (ativo: boolean) => void;
    usar: () => void;
  };
  musica?: string;
  precipitacao?: { chuva: number; neve: number; taxa: number };
  biomaAtual?: string;
  mapaChunk?: (cx: number, cz: number) => Uint8ClampedArray;
  modoFoto?: {
    ativo: () => boolean;
    alternar: () => boolean;
    filtro: (f: string) => void;
    desfoque: (v: number) => void;
    fov: (g: number) => void;
    capturar: () => string;
  };
  infoMundo?: string;
  definirClima?: (t: TipoClima) => void;
  definirDia?: (d: number) => void;
  criaturas?: () => {
    tipo: string;
    x: number;
    y: number;
    z: number;
    domada: boolean;
    vida: number;
  }[];
  invocar?: (tipo: TipoCriatura, x: number, y: number, z: number) => void;
  sobrevivencia?: import('../jogo/sobrevivencia').Sobrevivencia;
  renascer?: () => void;
  definirSpawn?: (x: number, z: number) => void;
  inventario?: import('../jogo/inventario').Inventario;
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
  camera?: {
    modo: () => ModoCamera;
    alternar: () => void;
    definir: (modo: ModoCamera) => void;
  };
  personagem?: {
    aparencia: () => Aparencia;
    definir: (parcial: Partial<Aparencia>) => void;
    visivel: () => { braco: boolean; corpo: boolean };
    malhas: () => number;
    pose: () => Pose;
    maoBloco: () => number | null;
    nomeExibido: () => string;
    girarCorpo?: (rad: number) => void;
  };
}

declare global {
  interface Window {
    __brumaluz?: EstadoDepuracao;
  }
}

export interface OpcoesCena {
  config?: GerenciadorConfig;
  mundo?: MetaMundo;
  dados?: DadosMundo;
  repo?: RepositorioMundos;
}

/** Sistema que guarda estado próprio no salvamento do mundo (inventário, vida, mapa...). */
export interface Salvavel {
  salvar(): unknown;
}

export function criarCena(
  canvas: HTMLCanvasElement,
  hotbar: Hotbar = criarHotbar(),
  opcoes: OpcoesCena = {},
) {
  const semente = opcoes.mundo?.semente ?? SEMENTE_PADRAO;
  const modo: ModoJogo = opcoes.mundo?.modo ?? 'criativo';
  document.body.dataset.modo = modo;
  const inventario = hotbar.inventario;
  const invSalvo = opcoes.dados?.extras?.['inventario'] as { ativo?: number } | undefined;
  if (invSalvo) {
    inventario.carregar(invSalvo);
    if (typeof invSalvo.ativo === 'number') hotbar.selecionar(invSalvo.ativo);
  } else if (modo === 'sobrevivencia') {
    for (let i = 0; i < inventario.slots.length; i++) inventario.definir(i, null);
  }
  const dadosIniciais = opcoes.dados;
  const salvaveis = new Map<string, Salvavel>();
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
  const cameraVisao = new UniversalCamera('camera-visao', camera.position.clone(), scene);
  cameraVisao.minZ = camera.minZ;
  cameraVisao.maxZ = camera.maxZ;
  cameraVisao.fov = camera.fov;
  cameraVisao.inputs.clear();
  scene.activeCamera = cameraVisao;
  let estadoCamera = criarEstadoCamera();
  const edicoes = criarEdicoes();
  if (dadosIniciais) edicoes.importar(dadosIniciais.edicoes);
  const controle = criarControle(canvas, camera, semente, edicoes);
  if (dadosIniciais?.jogador) {
    const j = controle.jogador;
    j.x = dadosIniciais.jogador.x;
    j.y = dadosIniciais.jogador.y;
    j.z = dadosIniciais.jogador.z;
    controle.apontar(dadosIniciais.jogador.yaw, dadosIniciais.jogador.pitch);
  }
  controle.atualizar(0);

  function armazenamentoLocal(): Armazenamento | null {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }
  let aparencia: Aparencia = carregarAparencia(armazenamentoLocal());
  const braco = criarBraco(scene, cameraVisao, aparencia);
  const personagem = criarPersonagem(scene, aparencia);
  const animador = criarAnimador();
  let velocidadeHoriz = 0;
  let corrida = false;

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

  const sombras = new CascadedShadowGenerator(2048, sol);
  sombras.numCascades = NUM_CASCATAS;
  sombras.lambda = 0.75;
  sombras.shadowMaxZ = 90;
  sombras.bias = 0.006;
  sombras.normalBias = 0.02;
  sombras.setDarkness(0.15);
  sombras.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
  sombras.usePercentageCloserFiltering = true;
  sombras.stabilizeCascades = true;

  /** Claridade do dia para o viewmodel (1 ao meio-dia, ~0.4 à noite). */
  let luzDia = 1;
  const glow = new GlowLayer('glow', scene, { blurKernelSize: 32 });
  glow.intensity = INTENSIDADE_GLOW;
  // o braço e o item na mão nunca brilham (inclui malhas de itens criadas depois)
  for (const m of scene.meshes)
    if (m.name.startsWith('braco-') || m.name.startsWith('personagem-mao'))
      glow.addExcludedMesh(m as Mesh);
  scene.onNewMeshAddedObservable.add((m) => {
    if (m.name.startsWith('braco-') || m.name.startsWith('personagem-mao'))
      glow.addExcludedMesh(m as Mesh);
  });

  const ceu = criarCeu(scene);
  const agua = criarAgua(scene);
  glow.addExcludedMesh(ceu.malha);
  const vagalumes = criarVagalumes(scene);

  // Pós-processamento: HDR, tonemapping ACES, bloom suave, vinheta e FXAA.
  const pipeline = new DefaultRenderingPipeline('pos', true, scene, [cameraVisao]);
  pipeline.fxaaEnabled = true;
  pipeline.bloomEnabled = true;
  pipeline.bloomThreshold = 0.85;
  pipeline.bloomWeight = 0.22;
  pipeline.bloomKernel = 48;
  pipeline.bloomScale = 0.5;
  pipeline.imageProcessingEnabled = true;
  const ip = pipeline.imageProcessing;
  ip.toneMappingEnabled = true;
  ip.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  ip.exposure = 1.1;
  ip.contrast = 1.12;
  ip.vignetteEnabled = true;
  ip.vignetteWeight = 1.6;
  ip.vignetteStretch = 0.4;
  ip.vignetteColor = new Color4(0.05, 0.03, 0.08, 0);
  ip.colorCurvesEnabled = true;
  const curvas = new ColorCurves();
  curvas.globalSaturation = 0;
  curvas.highlightsHue = 40;
  curvas.highlightsDensity = 12;
  curvas.highlightsSaturation = 20;
  curvas.shadowsHue = 230;
  curvas.shadowsDensity = 25;
  curvas.shadowsSaturation = 30;
  ip.colorCurves = curvas;

  let hora = dadosIniciais && dadosIniciais.hora >= 0 ? dadosIniciais.hora : HORA_INICIAL;
  Object.defineProperty(estado, 'hora', {
    get: () => hora,
    set: (v: number) => {
      hora = normalizarHora(v);
    },
    enumerable: true,
  });
  estado.pausarDia = false;

  const atlas = gerarAtlas(SEMENTE_PADRAO);
  const textura = RawTexture.CreateRGBATexture(
    new Uint8Array(atlas.pixels.buffer),
    atlas.largura,
    atlas.altura,
    scene,
    true,
    false,
    Texture.NEAREST_NEAREST_MIPLINEAR,
  );
  textura.hasAlpha = true;
  textura.anisotropicFilteringLevel = 8;

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
  matSolido.transparencyMode = Material.MATERIAL_ALPHATEST;
  matSolido.alphaCutOff = 0.5;
  const mundoSolido = new PluginMundo(matSolido);

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
  const mundoPlanta = new PluginMundo(matPlanta);

  // Clima e estações
  const clima = criarClima(criarGerador(semente + 31), dadosIniciais?.extras?.['clima']);
  let dia = Number(dadosIniciais?.extras?.['dia']) || 0;
  let horaAnterior = hora;
  let outonoAtual = 0;
  let invernoAtual = 0;
  let jogadorCoberto = false;
  let flash = 0;
  const precipitacao = criarPrecipitacao(scene);

  /** Aplica a atmosfera da hora e do clima a luzes, névoa, céu e água. */
  function aplicarAtmosfera(tempo: number, dt = 0): void {
    if (horaAnterior > 0.9 && hora < 0.1) dia++;
    horaAnterior = hora;
    const estacao = estacaoDoDia(dia);
    const baseHora = atmosferaNaHora(hora);
    const raio = clima.atualizar(dt, estacao, baseHora.noite < 0.5);
    if (raio) {
      flash = 1;
      setTimeout(() => {
        tocarSom(motorAudio, 'trovao');
        legenda('⚡ Trovão');
      }, raio.atrasoTrovao * 1000);
    }
    const a = ajustarPorClima(baseHora, clima.estado);
    const k = 1 - Math.exp(-dt / 20);
    outonoAtual += ((estacao === 'outono' ? 1 : 0) - outonoAtual) * k;
    invernoAtual += ((estacao === 'inverno' ? 1 : 0) - invernoAtual) * k;
    mundoSolido.ventoFolhas = 1 + clima.estado.chuva * 1.5 + clima.estado.raios;
    mundoSolido.tempoMundo = tempo;
    for (const m of [mundoSolido, mundoPlanta]) {
      m.outono = outonoAtual;
      m.inverno = invernoAtual * 0.9;
      m.molhado = clima.estado.chuva;
    }
    const pj = controle.jogador;
    const b = biomaEm(Math.floor(pj.x), Math.floor(pj.z), semente);
    const nevando = invernoAtual > 0.5 || b === 'taiga' || b === 'montanhas';
    estado.biomaAtual = b;
    // trilha adaptativa: perigo > caverna > bioma especial > noite > dia
    const contextoMusica = perigoPerto
      ? 'perigo'
      : jogadorCoberto
        ? 'caverna'
        : b === 'deserto' || b === 'taiga' || b === 'pantano'
          ? b
          : baseHora.noite > 0.6
            ? 'noite'
            : 'dia';
    ambiente?.definirContexto(contextoMusica);
    estado.musica = contextoMusica;
    estado.precipitacao = precipitacao.ativas();
    precipitacao.atualizar(cameraVisao.position, clima.estado.chuva, nevando, jogadorCoberto);
    const arborizado = b === 'floresta' || b === 'pantano' || b === 'taiga' || b === 'campos';
    precipitacao.folhas(cameraVisao.position, arborizado && !jogadorCoberto ? 1 : 0, outonoAtual);
    ambiente?.definirChuva(nevando ? clima.estado.chuva * 0.25 : clima.estado.chuva);
    flash = Math.max(0, flash - dt * 6);
    pipeline.imageProcessing.exposure = 1.1 + flash * 2.2;
    estado.infoMundo = `Dia ${dia + 1} · ${NOMES_ESTACAO[estacao]} · ${NOMES_CLIMA[clima.estado.tipo]}`;
    estado.atmosfera = { noite: a.noite, crepusculo: a.crepusculo };
    const olho = camera.position;
    const submersa =
      blocoEm(Math.floor(olho.x), Math.floor(olho.y), Math.floor(olho.z)) === Bloco.AGUA;
    if (submersa !== cameraSubmersa) {
      cameraSubmersa = submersa;
      motorAudio.definirAbafado(submersa);
      document.body.classList.toggle('submerso', submersa);
      if (submersa) window.dispatchEvent(new CustomEvent('brumaluz:mergulhou'));
    }
    if (submersa) {
      const l = 0.25 + 0.75 * (1 - a.noite);
      scene.fogColor.set(0.04 * l, 0.2 * l, 0.32 * l);
      scene.fogDensity = 0.09;
    } else {
      scene.fogColor.set(...a.nevoa);
      scene.fogDensity = a.densidadeNevoa * fatorNevoa;
    }
    scene.clearColor.set(a.nevoa[0], a.nevoa[1], a.nevoa[2], 1);
    scene.ambientColor.set(...a.ambiente);
    luz.diffuse.set(...a.ceuLuz);
    luz.groundColor.set(...a.chaoLuz);
    luz.intensity = a.intensidadeCeu;
    sol.diffuse.set(...a.luz);
    sol.direction.set(...a.direcaoLuz);
    sol.intensity = a.intensidadeLuz;
    const bruma: [number, number, number] = [
      a.nevoa[0] * 0.85 + 0.12,
      a.nevoa[1] * 0.85 + 0.12,
      a.nevoa[2] * 0.85 + 0.14,
    ];
    const forca = 0.35 + 0.35 * Math.max(a.crepusculo, a.noite);
    mundoSolido.definirBruma(bruma, forca);
    mundoSolido.luzBlocos = 0.8 + 0.4 * a.noite;
    luzDia = 0.38 + 0.62 * (1 - a.noite) * Math.min(1, a.intensidadeCeu + 0.4);
    mundoPlanta.luzBlocos = mundoSolido.luzBlocos;
    mundoPlanta.definirBruma(bruma, forca);
    ceu.atualizar(a, tempo);
    agua.atualizar(a, tempo, cameraVisao.position);
    vagalumes.atualizar(camera.position, a.noite);
    ambiente?.definirNoite(a.noite);
  }

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
    if (b.luz.length > 0) m.setVerticesData('luz', b.luz, false, 2);
    // no sólido o alfa do vértice marca folhas (vento), não transparência
    if (mat === matSolido) m.hasVertexAlpha = false;
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
    const w = criarMalha(
      `agua-${k}`,
      r.agua,
      agua.material as unknown as StandardMaterial,
      r.cx,
      r.cz,
    );
    if (w) {
      w.isPickable = false;
      glow.addExcludedMesh(w);
      lista.push(w);
    }
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
    const pedido: PedidoChunk = { cx, cz, semente, versao, edicoes: edicoesPedido };
    worker.postMessage(pedido);
  }

  function legenda(texto: string): void {
    window.dispatchEvent(new CustomEvent('brumaluz:legenda', { detail: texto }));
  }

  /** Remalhas agrupadas: várias edições no mesmo quadro viram um pedido por chunk. */
  const remalhaPendente = new Map<string, { cx: number; cz: number }>();
  function enviarRemalhas(): void {
    if (remalhaPendente.size === 0) return;
    for (const c of remalhaPendente.values()) solicitar(c.cx, c.cz);
    remalhaPendente.clear();
  }

  /** Construção assistida: histórico, espelho e lotes. */
  const historico = criarHistorico();
  let espelho: number | null = null;
  function valorEm(x: number, y: number, z: number): number {
    return empacotar(blocoEm(x, y, z), edicoes.obterMeta(x, y, z));
  }
  function editarRegistrando(x: number, y: number, z: number, b: number, meta = 0): boolean {
    const lote: Edicao[] = [];
    const um = (px: number, py: number, pz: number) => {
      const antes = valorEm(px, py, pz);
      if (editarBloco(px, py, pz, b, meta))
        lote.push({ x: px, y: py, z: pz, antes, depois: empacotar(b, meta) });
    };
    um(x, y, z);
    if (espelho !== null && modo === 'criativo') {
      const m = espelharX({ x, y, z }, espelho);
      if (m.x !== x) um(m.x, m.y, m.z);
    }
    historico.registrar(lote);
    return lote.length > 0;
  }
  function aplicarLote(lote: Edicao[], usar: 'antes' | 'depois'): void {
    for (const e of lote) editarBloco(e.x, e.y, e.z, e[usar] & 255, (e[usar] >> 8) & 255);
  }

  function editarBloco(x: number, y: number, z: number, bloco: number, meta = 0): boolean {
    if (!edicoes.definir(x, y, z, bloco, meta)) return false;
    const cxE = Math.floor(x / TAM_X);
    const czE = Math.floor(z / TAM_Z);
    // a luz muda até 15 blocos em volta: remalha o chunk e os 4 vizinhos
    const afetados = [
      { cx: cxE, cz: czE },
      ...chunksAfetados(x, z).filter((c) => c.cx !== cxE || c.cz !== czE),
      ...[
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].map(([dx, dz]) => ({ cx: cxE + dx, cz: czE + dz })),
    ].filter((c, i, arr) => arr.findIndex((o) => o.cx === c.cx && o.cz === c.cz) === i);
    for (const c of afetados) {
      const k = chave(c.cx, c.cz);
      if (!malhas.has(k) && !pedidos.has(k)) continue;
      prioritarios.add(k);
      pedidos.add(k);
      remalhaPendente.set(k, c);
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
      entrada = { versao: 0, blocos: gerarChunk(cx, cz, semente) };
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
      (x, y, z) => ehAlvo(blocoEm(x, y, z)),
    );
    return a ? { x: a.x, y: a.y, z: a.z, normal: a.normal } : null;
  }

  /** Metadado ao colocar: a frente olha para o jogador; escadas e portas seguem o olhar. */
  function metaColocacao(bloco: number): number {
    const d = direcaoDoYaw(camera.rotation.y);
    const forma = obterBlocoDef(bloco)?.forma;
    if (forma === 'escada' || forma === 'porta' || forma === 'cama') return d;
    return obterBlocoDef(bloco)?.tiles.frente ? (d + 2) & 3 : 0;
  }

  function interagir(acao: AcaoInteracao): boolean {
    return executarInteracao(acao, {
      alvo: calcularAlvo(),
      edicoes,
      blocoAtivo: hotbar.blocoAtivo(),
      jogador: controle.jogador,
      editar: (x, y, z, b) => {
        const meta = metaColocacao(b);
        const ok = editarRegistrando(x, y, z, b, meta);
        // porta ocupa dois blocos
        if (ok && b === Bloco.PORTA && blocoEm(x, y + 1, z) === Bloco.AR)
          editarBloco(x, y + 1, z, b, meta);
        return ok;
      },
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
    if (ok && acao === 'colocar' && modo === 'sobrevivencia') inventario.remover(hotbar.ativo, 1);
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
        editar: (x, y, z, b) => editarRegistrando(x, y, z, b, 0),
      }),
    velocidade: (bloco) => velocidadeMineracao(bloco, ferramentaNaMao(), modo === 'criativo'),
  });

  /** Ferramenta segurada (se houver). */
  function ferramentaNaMao() {
    const p = hotbar.pilhaAtiva();
    return p ? obterItem(p.item)?.ferramenta : undefined;
  }

  /** Clique direito: usa blocos interativos, come comida ou coloca bloco. */
  function usarOuColocar(shift: boolean): void {
    if (modoConstrucao >= 0 && modo === 'criativo') {
      usarConstrucao();
      return;
    }
    const a = calcularAlvo();
    const alvoBloco = a ? blocoEm(a.x, a.y, a.z) : Bloco.AR;
    if (a && !shift && INTERATIVOS.has(alvoBloco)) {
      if (alvoBloco === Bloco.PORTA || alvoBloco === Bloco.PORTA_ABERTA) {
        alternarPorta(a.x, a.y, a.z);
        return;
      }
      window.dispatchEvent(
        new CustomEvent('brumaluz:usar', { detail: { bloco: alvoBloco, x: a.x, y: a.y, z: a.z } }),
      );
      return;
    }
    const p = hotbar.pilhaAtiva();
    const def = p ? obterItem(p.item) : undefined;
    const naMira = criaturaApontada();
    if (naMira && naMira.tipo === 'raposa' && p?.item === 'frutinhas' && !naMira.domada) {
      if (modo === 'sobrevivencia') inventario.remover(hotbar.ativo, 1);
      tocarSom(motorAudio, 'comer');
      if (populacao.domar(naMira)) {
        tocarSom(motorAudio, 'entrada');
        window.dispatchEvent(
          new CustomEvent('brumaluz:toast', { detail: 'A raposa-lume confia em você! 🦊' }),
        );
        window.dispatchEvent(new CustomEvent('brumaluz:domou'));
      }
      return;
    }
    if (def?.comida && modo === 'sobrevivencia') {
      if (estado.sobrevivencia?.comer(def.comida.fome, def.comida.saturacao)) {
        inventario.remover(hotbar.ativo, 1);
        tocarSom(motorAudio, 'comer');
        animador.evento('colocacao');
        window.dispatchEvent(new CustomEvent('brumaluz:comeu'));
      }
      return;
    }
    interagirComEventos('colocar');
  }

  /** Abre ou fecha a porta (e a metade de cima/baixo, se houver). */
  function alternarPorta(x: number, y: number, z: number): void {
    const b = blocoEm(x, y, z);
    const novo = b === Bloco.PORTA ? Bloco.PORTA_ABERTA : Bloco.PORTA;
    editarBloco(x, y, z, novo, edicoes.obterMeta(x, y, z));
    for (const dy of [-1, 1]) {
      const v = blocoEm(x, y + dy, z);
      if (v === Bloco.PORTA || v === Bloco.PORTA_ABERTA)
        editarBloco(x, y + dy, z, novo, edicoes.obterMeta(x, y + dy, z));
    }
    tocarSom(motorAudio, 'colocar', 'madeira');
  }

  let ultimaColocacao: number | null = null;
  canvas.addEventListener('mousedown', (e) => {
    const acao = acaoParaBotao(e.button, document.pointerLockElement === canvas);
    if (acao === 'quebrar') {
      if (atacarNaMira()) return;
      minerador.pressionar();
    } else if (acao === 'colocar') {
      const agora = performance.now() / 1000;
      if (!colocacaoPermitida(agora, ultimaColocacao)) return;
      ultimaColocacao = agora;
      usarOuColocar(e.shiftKey);
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
  estado.teleportar = (x, z, yFixo) => {
    const j = controle.jogador;
    const livre = (yy: number) => !obterBlocoDef(blocoEm(Math.floor(x), yy, Math.floor(z)))?.solido;
    let y = yFixo ?? alturaTerreno(Math.floor(x), Math.floor(z), semente) + 1;
    while (yFixo === undefined && y < ALTURA - 2 && !(livre(y) && livre(y + 1))) y++;
    j.x = x;
    j.y = y;
    j.z = z;
    j.vy = 0;
  };
  estado.bloco = blocoEm;
  estado.meta = (x, y, z) => edicoes.obterMeta(x, y, z);
  estado.definirBloco = (x, y, z, b, meta) => editarBloco(x, y, z, b, meta);
  estado.camera = {
    modo: () => estadoCamera.modo,
    alternar: () => {
      estadoCamera = alternarCamera(estadoCamera);
    },
    definir: (modo) => {
      estadoCamera = definirCamera(estadoCamera, modo);
    },
  };
  window.addEventListener('keydown', (e) => {
    if (teclaParaCamera(e.code) && !e.repeat) estado.camera?.alternar();
  });
  function atualizarCameraVisao(): void {
    cameraVisao.rotation.copyFrom(camera.rotation);
    if (estado.modoFoto?.ativo()) {
      cameraVisao.position.copyFrom(fotoPosRef());
      braco.definirVisivel(false);
      return;
    }
    if (estadoCamera.modo === 'primeira') {
      cameraVisao.position.copyFrom(camera.position);
      return;
    }
    const p = posicaoTerceiraPessoa(
      { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      camera.rotation.y,
      camera.rotation.x,
      (x, y, z) => obterBlocoDef(blocoEm(x, y, z))?.solido === true,
    );
    cameraVisao.position.set(p.x, p.y, p.z);
  }
  Object.defineProperty(estado, 'slotAtivo', { get: () => hotbar.ativo, enumerable: true });
  barramento.ouvir('golpe', () => animador.evento('golpe'));
  barramento.ouvir('colocacao', () => animador.evento('colocacao'));
  let slotNaMao = -1;
  let blocoNaMaoAtual = -1;
  let itemNaMaoAtual = '';
  /** Giro extra do corpo em relação à câmera (só para capturas). */
  let giroCorpo = 0;
  let luzJogador = 1;
  function atualizarPersonagem(dt: number): void {
    const j = controle.jogador;
    const pose = animador.atualizar(dt, {
      velocidadeHoriz,
      correndo: corrida,
      noChao: j.noChao,
    });
    const foto = !!estado.modoFoto?.ativo();
    // no modo foto o corpo aparece quando a câmera livre se afasta dos olhos
    const longeDosOlhos = foto && Vector3.Distance(fotoPosRef(), camera.position) > 1.2;
    const vis = visibilidadePorModo(estadoCamera.modo);
    // no título o panorama mostra só o mundo (sem braço)
    const naTela = document.body.classList.contains('tela-titulo');
    braco.definirVisivel(vis.braco && !foto && !naTela);
    personagem.definirVisivel(foto ? longeDosOlhos : vis.corpo);
    const blocoMao = hotbar.blocoAtivo();
    const itemMao = hotbar.pilhaAtiva()?.item ?? '';
    if (hotbar.ativo !== slotNaMao || blocoMao !== blocoNaMaoAtual || itemMao !== itemNaMaoAtual) {
      itemNaMaoAtual = itemMao;
      slotNaMao = hotbar.ativo;
      blocoNaMaoAtual = blocoMao;
      braco.definirBloco(blocoMao || null);
      const pilhaMao = hotbar.pilhaAtiva();
      braco.definirItem(!blocoMao && pilhaMao ? pilhaMao.item : null);
      personagem.definirNaMao(blocoMao || null, !blocoMao && pilhaMao ? pilhaMao.item : null);
    }
    braco.atualizarVista(dt, animador.vista());
    personagem.aplicarPose(pose, {
      dt,
      olhar: camera.rotation.x,
      vista: animador.vista(),
    });
    personagem.posicionar(j.x, j.y, j.z, camera.rotation.y + giroCorpo);
    // estimativa de luz no jogador: teto opaco acima = caverna (escurece braço e corpo)
    const ex = Math.floor(camera.position.x);
    const ey = Math.floor(camera.position.y);
    const ez = Math.floor(camera.position.z);
    let coberto = false;
    for (let y = ey + 1; y < Math.min(ALTURA, ey + 48) && !coberto; y++) {
      if (obterBlocoDef(blocoEm(ex, y, ez))?.opaco) coberto = true;
    }
    jogadorCoberto = coberto && ey < 55;
    const alvoLuz = coberto ? (ey < 55 ? 0.22 : 0.55) : 1;
    luzJogador += (alvoLuz - luzJogador) * Math.min(1, dt * 3);
    braco.definirLuz(luzJogador * luzDia);
    personagem.definirLuz(luzJogador);
  }
  estado.personagem = {
    aparencia: () => ({ ...aparencia }),
    definir: (parcial) => {
      aparencia = normalizarAparencia({ ...aparencia, ...parcial });
      braco.aplicarAparencia(aparencia);
      personagem.aplicarAparencia(aparencia);
    },
    visivel: () => visibilidadePorModo(estadoCamera.modo),
    malhas: () => braco.contarMalhas() + personagem.contarMalhas(),
    pose: () => animador.pose(),
    maoBloco: () =>
      visibilidadePorModo(estadoCamera.modo).braco ? hotbar.blocoAtivo() || null : null,
    nomeExibido: () => aparencia.nome || MODELOS[aparencia.modelo].rotulo,
    girarCorpo: (rad: number) => {
      giroCorpo = rad;
    },
  };
  Object.defineProperty(estado, 'alvo', { get: calcularAlvo, enumerable: true });

  function atualizarChunks(): void {
    enviarRemalhas();
    const cx = Math.floor(camera.position.x / TAM_X);
    const cz = Math.floor(camera.position.z / TAM_Z);
    const desejados = chunksDesejados(cx, cz, raioChunks);
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
    mat.ambientColor = Color3.White();
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
  // quebrar meia porta leva a outra metade
  barramento.ouvir('quebra', (d) => {
    if (d.bloco !== Bloco.PORTA && d.bloco !== Bloco.PORTA_ABERTA) return;
    for (const dy of [-1, 1]) {
      const v = blocoEm(d.x, d.y + dy, d.z);
      if (v === Bloco.PORTA || v === Bloco.PORTA_ABERTA) editarBloco(d.x, d.y + dy, d.z, Bloco.AR);
    }
  });
  // Sobrevivência: o bloco quebrado vira item no chão.
  const rngDrops = criarGerador(911);
  const mundoItens = criarMundoDeItens((x, y, z) => {
    const b = blocoEm(x, y, z);
    return b !== Bloco.AR && !!obterBlocoDef(b)?.solido;
  });
  barramento.ouvir('quebra', (d) => {
    if (modo !== 'sobrevivencia') return;
    const ferramenta = ferramentaNaMao();
    // desgaste da ferramenta
    const p = hotbar.pilhaAtiva();
    if (ferramenta && p && p.dur !== undefined && (obterBlocoDef(d.bloco)?.dureza ?? 0) > 0) {
      const dur = p.dur - 1;
      if (dur <= 0) {
        inventario.definir(hotbar.ativo, null);
        tocarSom(motorAudio, 'recusa');
        window.dispatchEvent(
          new CustomEvent('brumaluz:toast', {
            detail: `${obterItem(p.item)?.nome ?? 'Ferramenta'} quebrou!`,
          }),
        );
      } else {
        inventario.definir(hotbar.ativo, { ...p, dur });
      }
    }
    for (const drop of dropsDoBloco(d.bloco, rngDrops, podeColetar(d.bloco, ferramenta))) {
      mundoItens.soltar(drop.item, drop.qtd, d.x + 0.5, d.y + 0.4, d.z + 0.5, rngDrops);
    }
  });
  const renderItens = criarRenderItens(scene, atlas, textura, iconeDoItem, (m) =>
    glow.addExcludedMesh(m),
  );
  let coletaAcumulada = new Map<string, number>();
  let timerColeta: ReturnType<typeof setTimeout> | null = null;
  function atualizarItens(dt: number, tempo: number): void {
    const j = controle.jogador;
    const coletados = mundoItens.atualizar(dt, j, (item, qtd, dur) =>
      inventario.adicionar(item, qtd, dur),
    );
    for (const c of coletados) {
      coletaAcumulada.set(c.item, (coletaAcumulada.get(c.item) ?? 0) + c.qtd);
      tocarSom(motorAudio, 'coleta');
      window.dispatchEvent(new CustomEvent('brumaluz:coletou', { detail: c }));
      if (timerColeta) clearTimeout(timerColeta);
      timerColeta = setTimeout(() => {
        for (const [item, qtd] of coletaAcumulada) {
          window.dispatchEvent(
            new CustomEvent('brumaluz:toast', {
              detail: `+${qtd} ${obterItem(item)?.nome ?? item}`,
            }),
          );
        }
        coletaAcumulada = new Map();
      }, 350);
    }
    renderItens.atualizar(mundoItens.itens, tempo);
    estado.itensSoltos = mundoItens.itens.length;
  }
  estado.soltarItem = (item, qtd, x, y, z) => mundoItens.soltar(item, qtd, x, y, z, rngDrops);
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
  let perigoPerto = false;
  let fotoPosRef: () => Vector3 = () => camera.position;
  let quadroFotoRef: ((dt: number) => void) | null = null;
  let quadroConstrucao: ((tempo: number) => void) | null = null;
  let quadroCriaturas: ((dt: number, tempo: number) => void) | null = null;
  let cameraSubmersa = false;
  let quadroSobrevivencia: ((dt: number) => void) | null = null;
  const sobrevivenciaMorto = () => !!estado.sobrevivencia?.estado.morto;
  let configAtual: Config | null = null;
  ativarNoPrimeiroGesto(document, {
    ativar: async () => {
      await motorAudio.ativar();
      if (motorAudio.estado !== 'ativo') return;
      tocarSom(motorAudio, 'entrada');
      ambiente = iniciarAmbiente(motorAudio);
      if (configAtual)
        ambiente.definirVolumes(configAtual.volumeMusica, configAtual.volumeAmbiente);
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
    velocidadeHoriz = vel;
    corrida = vel > (VEL_ANDAR + VEL_CORRER) / 2;
    ultimoX = j.x;
    ultimoZ = j.z;
    const eventos = detector.atualizar(dt, {
      noChao: j.noChao,
      velocidadeHoriz: vel,
      correndo: vel > (VEL_ANDAR + VEL_CORRER) / 2,
    });
    if (eventos.length === 0) return;
    for (const ev of eventos) {
      if (ev === 'pulo' || ev === 'aterrissagem') animador.evento(ev);
      if (ev === 'pulo' && modo === 'sobrevivencia') estado.sobrevivencia?.pulo(corrida);
    }
    const grupo = grupoDoBloco(blocoSobPes(j, blocoEm)) ?? 'terra';
    for (const ev of eventos) {
      tocarSom(motorAudio, ev, grupo);
    }
  }

  engine.runRenderLoop(() => {
    const dtBruto = engine.getDeltaTime() / 1000;
    const dtQuadro = Math.min(dtBruto, DT_MAXIMO_QUADRO);
    const fotoAtiva = !!estado.modoFoto?.ativo();
    if (!(modo === 'sobrevivencia' && sobrevivenciaMorto()))
      controle.atualizar(fotoAtiva ? 0 : dtBruto);
    quadroFotoRef?.(Math.min(dtBruto, 0.1));
    quadroSobrevivencia?.(Math.min(dtBruto, 0.1));
    atualizarSomMovimento(Math.min(dtBruto, 0.05));
    verificarSlot();
    minerador.atualizar(dtQuadro, alvoMineracao());
    atualizarChunks();
    atualizarDestaque();
    // partículas e pulsos seguem o tempo real (com teto), mesmo com poucos FPS
    atualizarEfeitos(Math.min(dtBruto, 0.25));
    atualizarCameraVisao();
    atualizarPersonagem(dtQuadro);
    estado.fps = engine.getFps();
    estado.posicao = [camera.position.x, camera.position.y, camera.position.z];
    estado.rotacao = [camera.rotation.x, camera.rotation.y];
    const tempo = performance.now() / 1000;
    if (!estado.pausarDia) hora = normalizarHora(hora + dtBruto / DURACAO_DIA);
    aplicarAtmosfera(tempo, dtBruto);
    atualizarItens(dtQuadro, tempo);
    quadroCriaturas?.(dtQuadro, tempo);
    quadroConstrucao?.(tempo);
    balanco.atualizar(tempo);
    scene.render();
  });
  let escalaMinima = 1;
  let base = Math.max(escalaBase(window.innerWidth), escalaMinima);
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
    base = Math.max(escalaBase(window.innerWidth), escalaMinima);
    if (base !== anterior) aplicarEscala(Math.max(base, estado.escalaResolucao));
    else engine.resize();
  });

  // Configurações do jogador (vídeo, áudio, controles).
  function aplicarConfig(c: Config): void {
    const fov = (c.fov * Math.PI) / 180;
    camera.fov = fov;
    cameraVisao.fov = fov;
    raioChunks = c.distancia;
    fatorNevoa = Math.sqrt(RAIO_INICIAL / Math.max(2, c.distancia - 1));
    const alcance = Math.max(300, (c.distancia + 2) * 16 * 1.6);
    camera.maxZ = alcance;
    cameraVisao.maxZ = alcance;
    const q = perfilDaQualidade(c.qualidade);
    sol.shadowEnabled = q.sombras;
    pipeline.bloomEnabled = q.bloom;
    pipeline.fxaaEnabled = q.fxaa;
    glow.isEnabled = q.glow;
    vagalumes.definirDensidade(q.vagalumes / 260);
    if (q.escalaMinima !== escalaMinima) {
      escalaMinima = q.escalaMinima;
      base = Math.max(escalaBase(window.innerWidth), escalaMinima);
      aplicarEscala(base);
    }
    motorAudio.definirVolume('geral', c.volumeGeral);
    motorAudio.definirVolume('efeitos', c.volumeEfeitos);
    motorAudio.definirVolume('passos', c.volumeEfeitos);
    configAtual = c;
    ambiente?.definirVolumes(c.volumeMusica, c.volumeAmbiente);
    controle.definirMouse(c.sensibilidade, c.inverterY);
    braco.definirBalanco(c.balanco);
  }
  opcoes.config?.ouvir(aplicarConfig);

  // Criaturas: animais, peixes, espectros e a raposa-lume companheira.
  const populacao = criarPopulacao(
    criarGerador(semente + 55),
    dadosIniciais?.extras?.['criaturas'],
  );
  salvaveis.set('criaturas', { salvar: () => populacao.salvar() });
  const cacheLuz = new Map<string, { v: number; t: number }>();
  const cacheCeu = new Map<string, { v: boolean; t: number }>();
  let relogioCache = 0;
  /** Luz aproximada de fontes num raio de 7 blocos (com cache de 2 s). */
  function luzAprox(x: number, y: number, z: number): number {
    const k = `${x},${y},${z}`;
    const c = cacheLuz.get(k);
    if (c && relogioCache - c.t < 2) return c.v;
    let melhor = 0;
    for (let dy = -4; dy <= 4; dy++)
      for (let dz = -7; dz <= 7; dz++)
        for (let dx = -7; dx <= 7; dx++) {
          const l = luzDoBloco(blocoEm(x + dx, y + dy, z + dz));
          if (l > 0) melhor = Math.max(melhor, l - Math.abs(dx) - Math.abs(dy) - Math.abs(dz));
        }
    cacheLuz.set(k, { v: melhor, t: relogioCache });
    if (cacheLuz.size > 4000) cacheLuz.clear();
    return melhor;
  }
  function ceuAberto(x: number, y: number, z: number): boolean {
    const k = `${x},${z}`;
    const c = cacheCeu.get(k);
    if (c && relogioCache - c.t < 3) return c.v && y >= 0;
    let livre = true;
    for (let yy = y; yy < ALTURA && livre; yy++)
      if (obterBlocoDef(blocoEm(x, yy, z))?.opaco) livre = false;
    cacheCeu.set(k, { v: livre, t: relogioCache });
    if (cacheCeu.size > 4000) cacheCeu.clear();
    return livre;
  }
  const mundoCriaturas = {
    solido: controle.solido,
    agua: (x: number, y: number, z: number) => blocoEm(x, y, z) === Bloco.AGUA,
    luzBloco: luzAprox,
    ceuAberto,
    bioma: (x: number, z: number) => biomaEm(x, z, semente),
    superficie: (x: number, z: number) => {
      for (let y = ALTURA - 2; y > 0; y--) {
        const d = obterBlocoDef(blocoEm(x, y, z));
        if (d?.solido) return y + 1;
      }
      return null;
    },
    nivelMar: NIVEL_MAR,
  };
  const renderCriaturas = criarRenderCriaturas(
    scene,
    (m) => glow.addExcludedMesh(m),
    () => undefined,
  );
  const rngCombate = criarGerador(semente + 77);
  function direcaoOlhar() {
    const yaw = camera.rotation.y;
    const pitch = camera.rotation.x;
    return {
      x: Math.sin(yaw) * Math.cos(pitch),
      y: -Math.sin(pitch),
      z: Math.cos(yaw) * Math.cos(pitch),
    };
  }
  function criaturaApontada() {
    const o = camera.position;
    const r = criaturaNaMira(populacao.lista, { x: o.x, y: o.y, z: o.z }, direcaoOlhar(), 3.6);
    if (!r) return null;
    const a = calcularAlvo();
    if (a) {
      const db = Math.hypot(a.x + 0.5 - o.x, a.y + 0.5 - o.y, a.z + 0.5 - o.z);
      if (db + 0.4 < r.distancia) return null;
    }
    return r.criatura;
  }
  /** Clique esquerdo numa criatura: ataca com a arma da mão. */
  function atacarNaMira(): boolean {
    const c = criaturaApontada();
    if (!c) return false;
    const f = ferramentaNaMao();
    const dano = f ? (f.tipo === 'espada' ? f.dano : Math.max(2, f.dano)) : 1;
    const ev = populacao.ferir(c, dano, camera.position.x, camera.position.z);
    animador.evento('golpe');
    tratarEventosCriaturas(ev);
    const p = hotbar.pilhaAtiva();
    if (modo === 'sobrevivencia' && f && p?.dur !== undefined) {
      const dur = p.dur - (f.tipo === 'espada' ? 1 : 2);
      inventario.definir(hotbar.ativo, dur > 0 ? { ...p, dur } : null);
    }
    return true;
  }
  function tratarEventosCriaturas(eventos: ReturnType<typeof populacao.atualizar>): void {
    for (const ev of eventos) {
      const c = ev.criatura;
      if (ev.tipo === 'ataque' && modo === 'sobrevivencia') {
        sobrevivencia.dano(ev.dano ?? 2, 'criatura');
        controle.jogador.vy = 4.5;
      } else if (ev.tipo === 'ferida') {
        tocarSom(motorAudio, 'golpe', c.tipo === 'espectro' ? 'cristal' : 'terra');
      } else if (ev.tipo === 'morte') {
        if (c.tipo === 'espectro') tocarSom(motorAudio, 'espectro');
        else tocarSom(motorAudio, 'quebra', 'folhagem');
        for (const d of ev.drops ?? [])
          mundoItens.soltar(d.item, d.qtd, c.x, c.y + 0.5, c.z, rngDrops);
        if (ev.drops)
          window.dispatchEvent(new CustomEvent('brumaluz:derrotou', { detail: c.tipo }));
      } else if (
        ev.tipo === 'som' &&
        Math.hypot(c.x - camera.position.x, c.z - camera.position.z) < 20
      ) {
        tocarSom(motorAudio, 'espectro');
        const a = Math.atan2(c.x - camera.position.x, c.z - camera.position.z) - camera.rotation.y;
        const rel = Math.atan2(Math.sin(a), Math.cos(a));
        const lado =
          Math.abs(rel) < 0.6
            ? 'à frente'
            : Math.abs(rel) > 2.4
              ? 'atrás'
              : rel > 0
                ? 'à direita'
                : 'à esquerda';
        legenda(`👻 Gemido de espectro ${lado}`);
      }
    }
  }
  quadroCriaturas = (dt: number, tempo: number) => {
    relogioCache += dt;
    const j = controle.jogador;
    const noite = estado.atmosfera?.noite ?? 0;
    const ev = populacao.atualizar(
      dt,
      mundoCriaturas,
      { x: j.x, y: j.y, z: j.z, vivo: !sobrevivencia.estado.morto, criativo: modo === 'criativo' },
      noite,
    );
    tratarEventosCriaturas(ev);
    perigoPerto =
      modo === 'sobrevivencia' &&
      populacao.lista.some(
        (c) =>
          c.tipo === 'espectro' &&
          c.estado === 'perseguir' &&
          Math.hypot(c.x - j.x, c.z - j.z) < 14,
      );
    renderCriaturas.atualizar(populacao.lista, dt, tempo, () => Math.max(0.25, luzJogador));
  };
  estado.criaturas = () =>
    populacao.lista.map((c) => ({
      tipo: c.tipo,
      x: c.x,
      y: c.y,
      z: c.z,
      domada: c.domada,
      vida: c.vida,
    }));
  estado.invocar = (tipo, x, y, z) => {
    populacao.adicionar(tipo, x, y, z);
  };

  // Modo construção (criativo): ferramentas de forma, copiar/colar e espelho.
  const visualConstrucao = criarVisualConstrucao(scene, atlas, textura, (m) =>
    glow.addExcludedMesh(m),
  );
  const FERRAMENTAS: (Ferramenta | 'copiar' | 'colar')[] = [
    'preencher',
    'parede',
    'linha',
    'esfera',
    'esvaziar',
    'copiar',
    'colar',
  ];
  const ROTULOS: Record<string, string> = {
    ...NOMES_FERRAMENTA,
    copiar: 'Copiar região',
    colar: 'Colar construção',
  };
  let modoConstrucao = -1;
  let pontoA: Ponto | null = null;
  let giro = 0;
  function blueprints(): Blueprint[] {
    try {
      return JSON.parse(localStorage.getItem('brumaluz:blueprints') ?? '[]') as Blueprint[];
    } catch {
      return [];
    }
  }
  let blueprintAtual: Blueprint | null = blueprints().at(-1) ?? null;
  function avisarConstrucao(): void {
    const f = modoConstrucao >= 0 ? FERRAMENTAS[modoConstrucao] : null;
    const detalhe = !f
      ? ''
      : f === 'colar'
        ? blueprintAtual
          ? `“${blueprintAtual.nome}” ${blueprintAtual.w}×${blueprintAtual.h}×${blueprintAtual.d} · R gira · clique direito cola`
          : 'Nenhuma construção copiada ainda'
        : pontoA
          ? 'Clique direito no ponto B'
          : 'Clique direito no ponto A';
    window.dispatchEvent(
      new CustomEvent('brumaluz:construcao', {
        detail: { ferramenta: f ? ROTULOS[f] : null, detalhe, espelho: espelho !== null },
      }),
    );
  }
  const toast = (t: string) =>
    window.dispatchEvent(new CustomEvent('brumaluz:toast', { detail: t }));
  function usarConstrucao(): void {
    const a = calcularAlvo();
    if (!a) return;
    const f = FERRAMENTAS[modoConstrucao];
    const noBloco = f === 'copiar' || f === 'esvaziar';
    const p = noBloco ? { x: a.x, y: a.y, z: a.z } : posicaoColocacao(a);
    if (f === 'colar') {
      if (!blueprintAtual) {
        toast('Copie uma região primeiro');
        return;
      }
      const lote: Edicao[] = [];
      for (const e of colar(blueprintAtual, p, giro)) {
        const antes = valorEm(e.p.x, e.p.y, e.p.z);
        if (editarBloco(e.p.x, e.p.y, e.p.z, e.v & 255, (e.v >> 8) & 255))
          lote.push({ ...e.p, antes, depois: e.v });
      }
      historico.registrar(lote);
      toast(`Construção colada (${lote.length} blocos)`);
      return;
    }
    if (!pontoA) {
      pontoA = p;
      avisarConstrucao();
      return;
    }
    const b = p;
    if (f === 'copiar') {
      const nome = `Construção ${blueprints().length + 1}`;
      const bp = copiar(nome, pontoA, b, valorEm);
      if (!bp) toast('Região grande demais');
      else {
        blueprintAtual = bp;
        try {
          localStorage.setItem(
            'brumaluz:blueprints',
            JSON.stringify([...blueprints(), bp].slice(-20)),
          );
        } catch {
          // sem armazenamento: fica só nesta sessão
        }
        toast(`“${nome}” copiada (${bp.w}×${bp.h}×${bp.d})`);
      }
    } else {
      const bloco = f === 'esvaziar' ? Bloco.AR : hotbar.blocoAtivo();
      if (!bloco && f !== 'esvaziar') {
        toast('Segure um bloco na mão');
      } else {
        const pts = pontosDaForma(f, pontoA, b);
        if (pts.length === 0) toast('Região grande demais');
        const lote: Edicao[] = [];
        for (const q of pts) {
          const antes = valorEm(q.x, q.y, q.z);
          if ((antes & 255) === bloco) continue;
          if (editarBloco(q.x, q.y, q.z, bloco)) lote.push({ ...q, antes, depois: bloco });
        }
        historico.registrar(lote);
        if (lote.length) toast(`${ROTULOS[f]}: ${lote.length} blocos`);
      }
    }
    pontoA = null;
    avisarConstrucao();
  }
  window.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement)?.closest?.('input, textarea') || e.repeat) return;
    if (document.querySelector('.entrada:not([hidden])')) return;
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && modo === 'criativo') {
      e.preventDefault();
      const l = e.shiftKey ? historico.refazer() : historico.desfazer();
      if (l) {
        aplicarLote(l, e.shiftKey ? 'depois' : 'antes');
        toast(`${e.shiftKey ? 'Refeito' : 'Desfeito'} (${l.length} blocos)`);
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY' && modo === 'criativo') {
      e.preventDefault();
      const l = historico.refazer();
      if (l) {
        aplicarLote(l, 'depois');
        toast(`Refeito (${l.length} blocos)`);
      }
      return;
    }
    if (modo !== 'criativo') return;
    if (e.code === 'KeyB') {
      modoConstrucao = modoConstrucao + 1 >= FERRAMENTAS.length ? -1 : modoConstrucao + 1;
      pontoA = null;
      avisarConstrucao();
    } else if (e.code === 'KeyN') {
      espelho = espelho === null ? Math.floor(camera.position.x) : null;
      toast(espelho === null ? 'Espelho desligado' : `Espelho no x = ${espelho}`);
      avisarConstrucao();
    } else if (e.code === 'KeyR' && modoConstrucao >= 0) {
      giro = (giro + 1) % 4;
      toast(`Giro: ${giro * 90}°`);
    }
  });
  quadroConstrucao = (tempo: number) => {
    const a = calcularAlvo();
    const f = modoConstrucao >= 0 ? FERRAMENTAS[modoConstrucao] : null;
    const bloco = hotbar.blocoAtivo();
    const def = obterBlocoDef(bloco);
    const colocar = a ? posicaoColocacao(a) : null;
    visualConstrucao.fantasma(
      f && f !== 'preencher' && f !== 'parede' && f !== 'linha' && f !== 'esfera' ? null : colocar,
      bloco && def && !def.planta ? bloco : null,
      tempo,
    );
    if (!f || !a) {
      visualConstrucao.caixa(null, null, Color3.White());
    } else if (f === 'colar' && blueprintAtual) {
      const p = colocar!;
      const w = giro % 2 ? blueprintAtual.d : blueprintAtual.w;
      const d = giro % 2 ? blueprintAtual.w : blueprintAtual.d;
      visualConstrucao.caixa(
        p,
        { x: p.x + w - 1, y: p.y + blueprintAtual.h - 1, z: p.z + d - 1 },
        new Color3(0.5, 0.9, 1),
      );
    } else {
      const atual = f === 'copiar' || f === 'esvaziar' ? { x: a.x, y: a.y, z: a.z } : colocar!;
      const cor =
        f === 'esvaziar'
          ? new Color3(1, 0.4, 0.35)
          : f === 'copiar'
            ? new Color3(0.5, 0.9, 1)
            : new Color3(1, 0.85, 0.4);
      visualConstrucao.caixa(pontoA ?? atual, atual, cor);
    }
  };

  // Modo foto: câmera livre, filtros, desfoque e captura.
  let modoFoto = false;
  const fotoPos = new Vector3();
  const curvasBase = ip.colorCurves;
  function definirFiltro(f: string): void {
    const c = new ColorCurves();
    c.globalSaturation = 0;
    switch (f) {
      case 'quente':
        c.globalHue = 30;
        c.globalDensity = 35;
        c.globalSaturation = 15;
        break;
      case 'frio':
        c.globalHue = 210;
        c.globalDensity = 35;
        break;
      case 'pb':
        c.globalSaturation = -100;
        break;
      case 'sepia':
        c.globalSaturation = -100;
        c.globalHue = 35;
        c.globalDensity = 55;
        break;
      case 'sonho':
        c.globalSaturation = 35;
        c.highlightsHue = 300;
        c.highlightsDensity = 30;
        break;
      default:
        ip.colorCurves = curvasBase;
        pipeline.bloomWeight = 0.22;
        return;
    }
    ip.colorCurves = c;
    pipeline.bloomWeight = f === 'sonho' ? 0.6 : 0.22;
  }
  estado.modoFoto = {
    ativo: () => modoFoto,
    alternar: () => {
      modoFoto = !modoFoto;
      if (modoFoto) {
        fotoPos.copyFrom(cameraVisao.position);
        estado.pausarDia = true;
      } else {
        estado.pausarDia = false;
        pipeline.depthOfFieldEnabled = false;
        definirFiltro('natural');
        cameraVisao.fov = camera.fov;
      }
      return modoFoto;
    },
    filtro: definirFiltro,
    desfoque: (v: number) => {
      pipeline.depthOfFieldEnabled = v > 0.01;
      if (v > 0.01) {
        const a = calcularAlvo();
        const dist = a
          ? Math.hypot(a.x + 0.5 - fotoPos.x, a.y + 0.5 - fotoPos.y, a.z + 0.5 - fotoPos.z)
          : 8;
        pipeline.depthOfField.focusDistance = dist * 1000;
        pipeline.depthOfField.fStop = 1.4 + (1 - v) * 8;
        pipeline.depthOfField.focalLength = 50 + v * 100;
      }
    },
    fov: (g: number) => {
      cameraVisao.fov = (g * Math.PI) / 180;
    },
    capturar: () => {
      scene.render();
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      const agora = new Date();
      a.download = `brumaluz-${agora.toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
      a.href = url;
      a.click();
      return url;
    },
  };
  function quadroFoto(dt: number): void {
    if (!modoFoto) return;
    const t = controle.teclas;
    const yaw = camera.rotation.y;
    const pitch = camera.rotation.x;
    const v = (t.correr ? 14 : 5) * dt;
    const f = (t.frente ? 1 : 0) - (t.tras ? 1 : 0);
    const d = (t.direita ? 1 : 0) - (t.esquerda ? 1 : 0);
    fotoPos.x += (Math.sin(yaw) * Math.cos(pitch) * f + Math.cos(yaw) * d) * v;
    fotoPos.z += (Math.cos(yaw) * Math.cos(pitch) * f - Math.sin(yaw) * d) * v;
    fotoPos.y += (-Math.sin(pitch) * f + (t.pular ? 1 : 0)) * v;
  }
  quadroFotoRef = quadroFoto;
  fotoPosRef = () => fotoPos;

  // Mapa: cores de um chunk visto de cima (relevo e água)
  estado.mapaChunk = (cx: number, cz: number) => {
    const out = new Uint8ClampedArray(TAM_X * TAM_Z * 4);
    const alturas = new Int32Array((TAM_X + 1) * (TAM_Z + 1));
    const topos: { bloco: number; y: number; agua: number }[] = [];
    for (let z = -1; z < TAM_Z; z++)
      for (let x = -1; x < TAM_X; x++) {
        const wx = cx * TAM_X + x;
        const wz = cz * TAM_Z + z;
        const t = topoDaColuna((y) => blocoEm(wx, y, wz));
        alturas[(z + 1) * (TAM_X + 1) + (x + 1)] = t.y;
        if (x >= 0 && z >= 0) topos.push(t);
      }
    let k = 0;
    for (let z = 0; z < TAM_Z; z++)
      for (let x = 0; x < TAM_X; x++, k++) {
        const t = topos[k];
        const base = (corMediaDoBloco(t.bloco) ?? [20, 22, 30]) as Rgb;
        const no = alturas[z * (TAM_X + 1) + x];
        const c = corDaColuna(base, t.y, no, t.agua);
        out.set([c[0], c[1], c[2], 255], k * 4);
      }
    return out;
  };

  // Controle direto (toque e gamepad): sem pointer lock
  estado.controleDireto = {
    olhar: (dx, dy) => controle.girar(dx, dy),
    mover: (frente, direita) => {
      const t = controle.teclas;
      t.frente = frente > 0.25;
      t.tras = frente < -0.25;
      t.direita = direita > 0.25;
      t.esquerda = direita < -0.25;
    },
    tecla: (acao, ativo) => {
      controle.teclas[acao] = ativo;
    },
    quebrar: (ativo) => {
      if (ativo) {
        if (!atacarNaMira()) minerador.pressionar();
      } else minerador.soltar();
    },
    usar: () => usarOuColocar(false),
  };

  // Nascimento: sem posição salva, garante que o jogador comece em ar livre.
  if (!dadosIniciais?.jogador) estado.teleportar?.(controle.jogador.x, controle.jogador.z);

  // Salvamento: edições, jogador, hora e o estado dos sistemas registrados.
  function coletarDados(): DadosMundo {
    const j = controle.jogador;
    const extras: Record<string, unknown> = { ...(dadosIniciais?.extras ?? {}) };
    for (const [k, s] of salvaveis) extras[k] = s.salvar();
    return {
      versao: 1,
      edicoes: edicoes.exportar(),
      jogador: { x: j.x, y: j.y, z: j.z, yaw: camera.rotation.y, pitch: camera.rotation.x },
      hora,
      extras,
    };
  }
  function miniatura(): string | undefined {
    try {
      const c = document.createElement('canvas');
      c.width = 320;
      c.height = 180;
      const ctx = c.getContext('2d');
      if (!ctx) return undefined;
      const escala = Math.max(320 / canvas.width, 180 / canvas.height);
      const w = canvas.width * escala;
      const h = canvas.height * escala;
      ctx.drawImage(canvas, (320 - w) / 2, (180 - h) / 2, w, h);
      return c.toDataURL('image/jpeg', 0.7);
    } catch {
      return undefined;
    }
  }
  let salvando: Promise<void> | null = null;
  async function salvar(comMiniatura = true): Promise<boolean> {
    const repo = opcoes.repo;
    const mundo = opcoes.mundo;
    if (!repo || !mundo || !estado.ready) return false;
    if (salvando) await salvando;
    salvando = repo.salvar(mundo.id, coletarDados(), comMiniatura ? miniatura() : undefined);
    try {
      await salvando;
      estado.ultimoSalvamento = Date.now();
      window.dispatchEvent(new CustomEvent('brumaluz:salvo'));
      return true;
    } catch {
      return false;
    } finally {
      salvando = null;
    }
  }
  // Modos: criativo voa; sobrevivência tem vida, fome, ar, queda e morte.
  const sobrevivencia = criarSobrevivencia(dadosIniciais?.extras?.['sobrevivencia']);
  controle.definirVoo(modo === 'criativo');
  const spawnSalvo = dadosIniciais?.extras?.['spawn'] as { x: number; z: number } | undefined;
  let spawn = spawnSalvo ?? { x: controle.jogador.x, z: controle.jogador.z };
  salvaveis.set('sobrevivencia', { salvar: () => sobrevivencia.salvar() });
  salvaveis.set('spawn', { salvar: () => spawn });
  estado.sobrevivencia = sobrevivencia;
  estado.definirSpawn = (x, z) => {
    spawn = { x, z };
  };
  sobrevivencia.ouvir((ev) => {
    if (ev.tipo === 'dano') {
      tocarSom(motorAudio, 'dano');
      legenda(
        ev.causa === 'queda' ? '💥 Queda' : ev.causa === 'afogamento' ? '🫧 Sem ar' : '💢 Dano',
      );
      window.dispatchEvent(new CustomEvent('brumaluz:dano', { detail: ev }));
    } else if (ev.tipo === 'morte') {
      // espalha o inventário no lugar da morte
      const j = controle.jogador;
      for (let i = 0; i < inventario.slots.length; i++) {
        const p = inventario.obter(i);
        if (!p) continue;
        mundoItens.soltar(p.item, p.qtd, j.x, j.y + 1, j.z, rngDrops, p.dur);
        inventario.definir(i, null);
      }
      window.dispatchEvent(new CustomEvent('brumaluz:morte', { detail: ev.causa }));
    }
  });
  barramento.ouvir('golpe', () => sobrevivencia.acao());
  estado.renascer = () => {
    sobrevivencia.renascer();
    estado.teleportar?.(spawn.x, spawn.z);
    controle.jogador.topoQueda = undefined;
  };
  function atualizarSobrevivencia(dt: number): void {
    if (modo !== 'sobrevivencia') return;
    const r = controle.resultado;
    if (r.aterrissou && r.queda > 0) sobrevivencia.queda(r.queda);
    const olhos = camera.position;
    const submerso =
      blocoEm(Math.floor(olhos.x), Math.floor(olhos.y), Math.floor(olhos.z)) === Bloco.AGUA;
    sobrevivencia.atualizar(dt, {
      correndo: corrida,
      andando: velocidadeHoriz > 0.5,
      submerso,
    });
    if (controle.jogador.y < -20) sobrevivencia.dano(100, 'queda', true);
  }
  quadroSobrevivencia = atualizarSobrevivencia;

  salvaveis.set('clima', { salvar: () => clima.salvar() });
  salvaveis.set('dia', { salvar: () => dia });
  estado.definirClima = (t) => clima.definir(t);
  estado.definirDia = (d) => {
    dia = Math.max(0, Math.floor(d));
    const e = estacaoDoDia(dia);
    outonoAtual = e === 'outono' ? 1 : 0;
    invernoAtual = e === 'inverno' ? 1 : 0;
  };

  estado.salvar = salvar;
  estado.modo = modo;
  estado.inventario = inventario;
  salvaveis.set('inventario', { salvar: () => ({ ...inventario.salvar(), ativo: hotbar.ativo }) });
  estado.mundo = opcoes.mundo ? { ...opcoes.mundo } : undefined;
  setInterval(() => void salvar(false), 30_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void salvar();
  });
  window.addEventListener('pagehide', () => void salvar(false));
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== canvas) void salvar();
  });

  return {
    engine,
    scene,
    camera,
    cameraVisao,
    editarBloco,
    edicoes,
    estado,
    controle,
    barramento,
    blocoEm,
    semente,
    salvar,
    registrarSalvavel(chave: string, s: Salvavel) {
      salvaveis.set(chave, s);
    },
    extrasSalvos: (chave: string): unknown => dadosIniciais?.extras?.[chave],
  };
}
