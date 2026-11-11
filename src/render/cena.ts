import { CRIATURAS } from '../jogo/criaturas';
import { saindoPorConta } from '../pagina';
import { povoadosPerto } from '../jogo/povoados';
import { nomeDoMorador } from '../temas/nomes';
import { definirRegioesSemPovoado, regiaoDoChunk } from '../world/povoado';
import { encontrarNascimento } from '../world/chunk';
import { povoadoDoTema, tema } from '../temas/ativo';
import { tocarVoz } from '../audio/sons';
import { construirMapaEmissivo } from './emissivo';
import { criarTintaProtecao } from './tintaProtecao';
import {
  celulaDoLote,
  ehConteiner,
  outraMetadeDaPorta,
  podeLevarBicho,
  recusaConteiner,
  recusaColocar,
  recusaQuebrar,
  type MundoDaRegra,
  type RecusaProtecao,
} from '../jogo/permissao';
import { AVISO_ESPERA_CASA, AVISO_VOLTA_CASA, criarAvisosProtecao } from '../player/avisosProtecao';
import { criarCadeado } from '../ui/cadeado';
import {
  criarProtecaoMundo,
  NOMES_PROTECAO,
  nomeProtecao,
  Protecao,
  replantioDaLavoura,
  type ProtecaoMundo,
} from '../world/protecao';
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
import { Matrix, Vector3, Vector4 } from '@babylonjs/core/Maths/math.vector';
// necessário para scene.createPickingRay (mira pelo toque)
import '@babylonjs/core/Culling/ray';
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
import { COR_DESTAQUE, CUBO, estadoDestaque, type CaixaLocal } from './destaque';
import { criarControle } from '../player/controle';
import { gerarAtlas, type FaceBloco } from '../art/atlas';
import { Bloco, ehAlvo, obterBloco as obterBlocoDef } from '../world/blocks';
import {
  DENSIDADE_NEVOA,
  EXPOSICAO_CENA,
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
import { criarVagalumes } from './vagalumes';
import { coresDasPlantas, definirCoresPlantas } from '../mesh/plantasBrinquedo';
import { PluginMundo } from './materialMundo';
import { PluginBalanco } from './balanco';
import { SEMENTE_PADRAO, TAM_X, TAM_Z } from '../world/chunk';
import type { DadosMundo, MetaMundo, ModoJogo, RepositorioMundos } from '../jogo/mundos';
import { caixasDoBloco, cercaConecta, direcaoDoYaw, vetorDirecao } from '../world/formas';
import { abreEFecha, alternado, ehPorta, ehPorteira } from '../world/portas';
import { velocidadeMineracao } from '../jogo/ferramentas';
import { obterItem } from '../jogo/itens';
import {
  AVISO_SEMENTE,
  alvoDaEnxada,
  alvoDaSemente,
  ehEnxada,
  ehLavoura,
  lavouraDoBloco,
  madura,
  plantaBaixa,
  podePlantar,
  substituivel,
} from '../jogo/plantio';
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
import { criaturaNaMira, type Criatura, type TipoCriatura } from '../jogo/criaturas';
import { criarRenderCriaturas } from './criaturas';
import { criarCoracoes } from './coracoes';
import { AVISO_LIMITE, COMIDA_DOS_BICHOS, comeEsse, viraCriado } from '../jogo/criacao';
import { biomaEm, estiloMundo } from '../world/chunk';
import { perfilDaQualidade, type Config, type GerenciadorConfig } from '../jogo/config';
import { definirIconesBrinquedo, iconeDoItem } from '../ui/icones';
import { gerarIconesBrinquedo } from './iconesBrinquedo';
import type { Buffers } from '../mesh/malha';
import type { RespostaChunk, PedidoChunk } from '../workers/chunk.worker';
import { criarProvedorBlocos } from '../world/provedor';
import { criarEdicoes, donoNaCelula } from '../world/edicoes';
import { sanearDonos, sanearDonosMudados } from '../nucleo/saneamento';
import { JOGADOR_LOCAL } from '../nucleo/anfitriao';
import { ALTURA, alturaTerreno, indice } from '../world/chunk';
import { mirarDaCamera, posicaoColocacao, type Vec3 } from '../player/alvo';
import { ALCANCE_MIRA, ALCANCE_TOQUE, clienteAlcanca } from '../jogo/alcance';
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
import { ajustarEscala, ESCALA_INICIO_TOQUE, escalaBase } from './resolucao';

/** Limite do dt (s) que alimenta minerador e efeitos: quadros lentos não os atropelam. */
const DT_MAXIMO_QUADRO = 1 / 30;
/** Cor reutilizada (evita alocar Color3 por quadro). */
const BRANCO = new Color3(1, 1, 1);
/** Cantos diagonais que a luz de uma edição em (lx, lz) do chunk alcança. */
/** O navegador está nas mãos de um teste de tela (Playwright)? Só então os ganchos de teste. */
function ehTesteDeTela(): boolean {
  return typeof navigator !== 'undefined' && navigator.webdriver === true;
}

function diagonaisAlcancadas(lx: number, lz: number): [number, number][] {
  const out: [number, number][] = [];
  for (const dx of [-1, 1])
    for (const dz of [-1, 1]) {
      const ax = dx < 0 ? lx + 1 : TAM_X - lx;
      const az = dz < 0 ? lz + 1 : TAM_Z - lz;
      if (ax + az < 15) out.push([dx, dz]);
    }
  return out;
}
/** O chunk e seus 8 vizinhos (luz e sombra de canto atravessam as divisas). */
const VIZINHANCA: readonly [number, number][] = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];
import { CONFETE, GOTA, criarPoolParticulas, LIMITE_PARTICULAS, vidaDe } from '../fx/particulas';
import { caixaArredondada, cilindro, esfera } from './formas';
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
import {
  ativarNoPrimeiroGesto,
  ligarAudio,
  manterAudioDesbloqueado,
  contextoPreparado,
  teclaParaMudo,
} from '../audio/ligador';
import { grupoDoBloco, GRUPOS_MATERIAL } from '../audio/materiais';
import { iniciarAmbiente, tocarSom, type Ambiente, aquecerAmostras } from '../audio/sons';
import { blocoSobPes, criarDetectorMovimento } from '../player/movimento';
import { VEL_ANDAR, VEL_CORRER } from '../player/fisica';
import {
  ALTURA_PIVO_TOQUE,
  criarCameraOrbita,
  degrauOpacidade,
  LADO_OMBRO,
  ZOOM_PADRAO_TOQUE,
  direcaoOlhar as direcaoDoOlhar,
  pivoCamera,
  passoDaRoda,
  recentrar as recentrarCamera,
  type BloqueiaCamera,
} from '../player/camera';
import { chave, chunksDesejados, planejar, respostaObsoleta } from './gerenciador';
import { criarAnimador } from '../player/animacao';
import { normalizarAparencia, rotuloDoModelo, type Aparencia } from '../personagem/aparencia';
import { carregarAparencia, type Armazenamento } from '../personagem/persistencia';
import type { Pose } from '../personagem/poses';
import { criarPersonagem } from './personagem';
import { criarModoFoto } from './modoFoto';
import { criarOutrosJogadores } from './outrosJogadores';
// spec 015 (gestos): roda, previsão, comando e o que chega do núcleo
import { gestoDoAnimador } from '../personagem/gestos';
import { criarGestosJogo, type GestosJogo } from './gestosJogo';
import { amostrarMapaChunk } from './mapaChunk';
import { conexaoLocal, type Conexao } from '../cliente/conexao';
import { criarEstadoCliente } from '../cliente/estado';
import {
  ESPERA_VOLTA_CASA,
  PASSO,
  VERSAO_PROTOCOLO,
  type Comando,
  type EventoNucleo,
  type SalvoNucleo,
} from '../nucleo/protocolo';
import type { EstadoClima } from '../jogo/clima';
import type { Profissao } from '../world/povoado';
import type { Slot } from '../jogo/inventario';
import { estadoInicial, type EstadoSobrevivencia, type CausaDano } from '../jogo/sobrevivencia';

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
  Bloco.PORTEIRA,
  Bloco.PORTEIRA_ABERTA,
]);
let raioChunks = RAIO_INICIAL;
let fatorNevoa = 1;
/** Chunks em volta da câmera que projetam sombra (celular usa 1: menos geometria na passada). */
const RAIO_SOMBRA_DESKTOP = 2;
const RAIO_SOMBRA_CELULAR = 1;
/** Raio do toque que procura um bloco além do alcance (para avisar "longe demais"). */
const ALCANCE_VER_LONGE = 48;

export interface EstadoDepuracao {
  ready: boolean;
  /** Tema visual ativo nesta página. */
  tema?: string;
  /** Direção do astro fixo do tema (Terra, gigante gasoso), se houver. */
  astro?: number[];
  /** Povoados a até 900 blocos do jogador (centro da praça e altura do piso). */
  povoados?: () => {
    id: string;
    cx: number;
    cz: number;
    h: number;
    moradores: number;
    porteira?: [number, number];
    foraPorteira?: [number, number];
  }[];
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
  /**
   * Spec 016: quem colocou o bloco (null: natural, ar ou célula sem edição), com a mesma conta do
   * núcleo (`donoNaCelula`) na cópia do cliente.
   */
  donoDoBloco?: (x: number, y: number, z: number) => string | null;
  /** Spec 016: apelido guardado de quem colocou blocos (mesmo fora do mundo agora). */
  apelidoDoDono?: (id: string) => string | undefined;
  /** Spec 016: id deste jogador e do dono do mundo (no aparelho, os dois são o jogador local). */
  voce?: string;
  donoDoMundo?: string;
  /**
   * Spec 016: por que o bloco da mira não quebra (null: quebra), com a mesma regra do núcleo,
   * e se o cadeadinho está à vista (mira do centro ou dedo).
   */
  protecaoNaMira?: () => RecusaProtecao | null;
  cadeado?: { visivel: boolean; x: number; y: number };
  hora?: number;
  definirBloco?: (x: number, y: number, z: number, b: number, meta?: number) => boolean;
  slotAtivo?: number;
  destaqueVisivel?: boolean;
  malhasAtivas?: number;
  /** Medição de desempenho: chamadas de desenho somadas desde o início, malhas na cena. */
  desenho?: () => { chamadas: number; malhas: number; ativas: number };
  remalhasConcluidas?: number;
  /** Tempo da última edição até a malha do chunk aparecer (ms). */
  latenciaEdicaoMs?: number;
  remalhaMs?: number;
  aplicadasNoUltimoQuadro?: number;
  /** Os outros jogadores no mundo (com amigos). */
  outrosJogadores?: () => {
    id: string;
    apelido: string;
    x: number;
    y: number;
    z: number;
    golpeando?: boolean;
    acoes?: [number, number, number] | null;
    /** Para onde o boneco do amigo está virado e para onde ele olha (rad). */
    yawCorpo?: number;
    yawOlhar?: number;
  }[];
  /**
   * Testes (spec 017): amigos de mentirinha na tela, com a aparência dada (capturas das
   * fantasias e medida de desempenho com amigos fantasiados). Lista vazia tira todos.
   */
  amigosDeTeste?: (
    lista: Array<{
      id: string;
      aparencia: Record<string, unknown>;
      x: number;
      y: number;
      z: number;
      yaw?: number;
      vel?: number;
      correndo?: boolean;
    }>,
  ) => void;
  /** Tempo médio da lógica de cada quadro na linha principal, fora o desenho (ms). */
  logicaQuadroMs?: number;
  atmosfera?: { noite: number; crepusculo: number };
  itensSoltos?: number;
  blocoGerado?: (x: number, y: number, z: number) => number;
  /** Solta um item no chão (dur: durabilidade restante de ferramentas). */
  soltarItem?: (item: string, qtd: number, x: number, y: number, z: number, dur?: number) => void;
  /**
   * Joga um item no chão de propósito, para a frente do boneco (dar a um amigo). Quem jogou
   * só pega de volta depois de um tempinho. `slot`: de onde sai (Q tira do que está na mão).
   */
  jogarItem?: (item: string, qtd: number, dur?: number, slot?: number) => void;
  /** Itens no chão como esta tela vê (testes). */
  itensNoChao?: () => { item: string; qtd: number; x: number; y: number; z: number }[];
  modo?: ModoJogo;
  controleDireto?: {
    olhar: (dx: number, dy: number) => void;
    mover: (frente: number, direita: number) => void;
    tecla: (acao: 'pular' | 'correr' | 'rapido', ativo: boolean) => void;
    quebrar: (ativo: boolean) => void;
    usar: () => void;
    /** Toque: aponta para o ponto tocado (coordenadas CSS do canvas); null volta à mira central. */
    mirar: (x: number, y: number) => void;
    soltarMira: () => void;
    /** Pinça: multiplica a distância da câmera. */
    zoom: (fator: number) => void;
    /** Dedo arrastando a câmera. */
    arrastar: (ativo: boolean) => void;
    /** Toque rápido na tela: ataca a criatura tocada ou usa/coloca no ponto. */
    tocar: () => void;
    /**
     * O dedo aponta um bloco longe demais (e nada mais vale ali: nem bicho no caminho nem
     * comida na mão): o toque e o segurar não fariam nada.
     */
    dedoLonge: () => boolean;
    /** Aviso sem palavras de "longe demais": um som baixinho. */
    avisarLonge: () => void;
    voando: () => boolean;
  };
  musica?: string;
  precipitacao?: { chuva: number; neve: number; taxa: number };
  biomaAtual?: string;
  /** Cores do chunk para o mapa; null se o chunk ainda não chegou do worker. */
  mapaChunk?: (cx: number, cz: number) => Uint8ClampedArray | null;
  modoFoto?: {
    ativo: () => boolean;
    alternar: () => boolean;
    /** Avisa ao ligar e desligar (por qualquer caminho); devolve como parar de ouvir. */
    aoMudar: (f: (ativo: boolean) => void) => () => void;
    filtro: (f: string) => void;
    desfoque: (v: number) => void;
    fov: (g: number) => void;
    capturar: () => string;
    /** A câmera de frente para o boneco (selfie). */
    selfie: () => boolean;
  };
  infoMundo?: string;
  definirClima?: (t: TipoClima) => void;
  definirDia?: (d: number) => void;
  /** Dia atual (contado desde o início do mundo). */
  dia?: () => number;
  criaturas?: () => {
    id: number;
    profissao?: string;
    tipo: string;
    x: number;
    y: number;
    z: number;
    domada: boolean;
    vida: number;
    /** Spec 013: bicho criado. */
    criado?: boolean;
    estado?: string;
  }[];
  invocar?: (
    tipo: TipoCriatura,
    x: number,
    y: number,
    z: number,
    extra?: { criado?: boolean; domada?: boolean },
  ) => void;
  /** Testes que constroem: põe o kit de blocos na barra (o mundo novo começa vazio). */
  darKit?: () => void;
  /** Testes e capturas: a lavoura avança como se tantos segundos tivessem passado. */
  crescerLavoura?: (segundos: number) => void;
  /** Spec 013: corações na tela agora (testes da criação). */
  coracoes?: () => number;
  /** Spec 015 (testes): gestos do jogador, roda aberta e moradores acenando. */
  gestos?: {
    fazer: (g: import('../personagem/gestos').IdGesto) => boolean;
    roda: () => boolean;
    /** Qual lista a roda mostra: 'menu', 'gestos' ou null (fechada). */
    menu: () => 'menu' | 'gestos' | null;
    local: () => { gesto: string | null; balao: string | null };
    moradores: () => { id: number; gesto: string | null; balao: string | null }[];
  };
  /**
   * Spec 016 (só nos testes de tela): o que a proteção do mundo diz da célula, e a tinta
   * que pinta as células protegidas num raio em volta do jogador (0 apaga; devolve quantas).
   */
  protecao?: (x: number, y: number, z: number) => import('../world/protecao').NomeProtecao;
  tingirProtecao?: (raio?: number, so?: import('../world/protecao').NomeProtecao[]) => number;
  /** Vitrine dos testes: um bicho parado, sem cérebro, com o desenho do jogo. */
  estatua?: (
    tipo: TipoCriatura | 'morador',
    x: number,
    y: number,
    z: number,
    yaw: number,
    morador?: { profissao: import('../world/povoado').Profissao; n: number },
  ) => void;
  sobrevivencia?: SobrevivenciaCliente;
  /** Qualidade das peças de brinquedo escolhida (celular: 'baixo'). */
  detalhe?: 'alto' | 'baixo';
  /** Blocos quebrados que somem no desenho até a malha nova chegar (D1). */
  blocosOcultos?: () => number[][];
  /** Capturas: respingo de água num ponto (gotinhas e roda de ondinhas). */
  respingo?: (x: number, y: number, z: number, forca?: number) => void;
  /** Testes e capturas: dispara um movimento (golpe, comer, pulo, colocação). */
  animar?: (evento: import('../player/animacao').EventoAnimacao) => void;
  /** Testes: espera o núcleo processar o que já foi mandado. */
  sincronizar?: () => Promise<void>;
  renascer?: () => void;
  /** Spec 016: "Voltar para casa" (a cama ou o ponto de nascer). */
  voltarCasa?: () => void;
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
  /** A câmera de terceira pessoa (spec 015): o jogo só tem esta. */
  camera?: {
    /** Distância atual (com o desvio de paredes) e a pedida pelo zoom, em blocos. */
    distancia: () => number;
    zoom: () => number;
    /** Aproxima (negativo) ou afasta (positivo); devolve o zoom novo. */
    aproximar: (delta: number) => number;
    definirZoom: (d: number) => number;
    /** Opacidade do boneco do jogador (1 normal; < 1 com a câmera perto demais). */
    opacidadeBoneco: () => number;
    /** Desviando de uma parede (chegou perto por causa de um bloco). */
    desviando: () => boolean;
    posicao: () => [number, number, number];
    /** O ponto que a câmera olha (a mira do centro passa por ele). */
    pivo: () => [number, number, number];
    /** Yaw do corpo do boneco do jogador (solto da câmera). */
    yawCorpo: () => number;
    /** Dedo arrastando a câmera (ela nunca gira sozinha enquanto isso). */
    arrastar: (ativo: boolean) => void;
  };
  personagem?: {
    aparencia: () => Aparencia;
    definir: (parcial: Partial<Aparencia>) => void;
    visivel: () => { corpo: boolean };
    malhas: () => number;
    /** Peças do item que o boneco segura (0 com a mão vazia). */
    malhasMao: () => number;
    pose: () => Pose;
    /** Bloco que o boneco segura na mão (null: vazia ou item). */
    maoBloco: () => number | null;
    nomeExibido: () => string;
    girarCorpo?: (rad: number) => void;
    /** Inclinação, curva e passada do corpo vivo (testes). */
    corpo: () => import('../personagem/vida').SaidaCorpo | null;
    /**
     * Como o boneco está sendo desenhado (testes): quantas malhas vão na fila transparente e
     * a menor visibilidade.
     */
    desenho?: () => { malhas: number; transparentes: number; menorVisibilidade: number };
  };
  /**
   * Testes: o que o dedo pegaria no ponto da tela (coordenadas CSS do canvas): o bloco, a
   * distância dos olhos ao ponto atingido e se está no alcance do toque.
   */
  alvoDoDedo?: (
    x: number,
    y: number,
  ) => { x: number; y: number; z: number; distancia: number; alcanca: boolean } | null;
  /** Testes: o bloco que o destaque (contorno) marca agora, ou null. */
  destaque?: () => { x: number; y: number; z: number } | null;
  /** Testes: onde um ponto do mundo aparece na tela (coordenadas CSS), ou null atrás da câmera. */
  telaDoPonto?: (x: number, y: number, z: number) => { x: number; y: number } | null;
  /** Testes: vira o olhar para o centro da tela mirar este ponto do mundo. */
  mirarPonto?: (x: number, y: number, z: number) => void;
  /** Mira um bloco pelo centro da tela (testes): yaw e pitch para o raio da câmera passar no centro dele. */
  mirarBloco?: (x: number, y: number, z: number, normal?: Vec3) => boolean;
}

declare global {
  interface Window {
    __brumaluz?: EstadoDepuracao;
  }
}

/** O que a tela sabe da sobrevivência (o núcleo é o dono): estado e atalhos de teste. */
export interface SobrevivenciaCliente {
  readonly estado: EstadoSobrevivencia;
  dano(qtd: number, causa?: CausaDano): void;
  /** Testes: conta um pulo. */
  pulo(correndo?: boolean): void;
}

export interface OpcoesCena {
  config?: GerenciadorConfig;
  mundo?: MetaMundo;
  dados?: DadosMundo;
  repo?: RepositorioMundos;
  /** Conexão com o núcleo (padrão: servidor local num Web Worker). */
  conexao?: Conexao;
  /**
   * Spec 016, na nuvem: o id deste jogador e o do dono do mundo (para saber de quem é cada
   * bloco). Padrão: o jogador local, dono de tudo o que colocou.
   */
  identidade?: { voce: string; donoDoMundo: string };
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
  const temaAtual = tema();
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
  estado.tema = temaAtual.id;
  if (temaAtual.ceu.planeta) estado.astro = [...temaAtual.ceu.planeta.direcao];
  estado.povoados = () => {
    const j = controle.jogador;
    return povoadosPerto(j.x, j.z, 900, semente)
      .sort((a, b) => Math.hypot(a.cx - j.x, a.cz - j.z) - Math.hypot(b.cx - j.x, b.cz - j.z))
      .map((p) => ({
        id: p.id,
        cx: p.cx,
        cz: p.cz,
        h: p.h,
        moradores: p.moradores.length,
        // sítio: a porteira do primeiro cercado e a célula de fora (medição e capturas)
        ...(p.currais?.[0]
          ? { porteira: p.currais[0].portao, foraPorteira: p.currais[0].fora }
          : {}),
      }));
  };

  // Sem preserveDrawingBuffer: GPUs de celular descartam o buffer a cada quadro (menos banda).
  // Capturas e miniaturas renderizam um quadro e leem o canvas na mesma tarefa.
  const engine = new Engine(canvas, false, { preserveDrawingBuffer: false, stencil: true });
  const scene = new Scene(engine);
  // contador interno do Babylon (sem SceneInstrumentation ele só soma: a medição faz a conta)
  estado.desenho = () => ({
    chamadas: (engine as unknown as { _drawCalls?: { current: number } })._drawCalls?.current ?? 0,
    malhas: scene.meshes.length,
    ativas: scene.getActiveMeshes().length,
  });
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
  // o jogo não usa picking do Babylon no movimento do ponteiro
  scene.skipPointerMovePicking = true;
  // a câmera de terceira pessoa (spec 015): segue o boneco, desvia de blocos, zoom
  const toqueCamera = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const orbita = toqueCamera
    ? criarCameraOrbita(ZOOM_PADRAO_TOQUE, ALTURA_PIVO_TOQUE)
    : criarCameraOrbita();
  const edicoes = criarEdicoes();
  if (dadosIniciais) edicoes.importar(dadosIniciais.edicoes);
  // spec 016: quem colocou cada bloco (a tabela do núcleo; muda pelos quadros)
  edicoes.donos.importar(sanearDonos(dadosIniciais?.extras?.['donos']));
  const voce = opcoes.identidade?.voce ?? JOGADOR_LOCAL;
  const donoDoMundo = opcoes.identidade?.donoDoMundo ?? JOGADOR_LOCAL;
  /** Apelidos de quem já esteve no mundo nesta sessão (o dono não entra na tabela de donos). */
  const apelidosVistos = new Map<string, string>();
  // mundo de antes dos povoados: na primeira carga depois deles, congela a lista de
  // regiões sem povoado (as editadas e as em volta de onde o jogador está) e salva
  // com o mundo; nas cargas seguintes vale a lista salva, então nada some nem aparece
  const salvoPovoados = dadosIniciais?.extras?.['povoados'] as
    | { semPovoado?: string[] }
    | undefined;
  const semPovoado: string[] = salvoPovoados?.semPovoado
    ? [...salvoPovoados.semPovoado]
    : (opcoes.mundo?.versao ?? 1) < 2 && dadosIniciais
      ? (() => {
          const r = new Set<string>();
          for (const k of Object.keys(dadosIniciais.edicoes)) {
            const [cx, cz] = k.split(',').map(Number);
            r.add(regiaoDoChunk(cx, cz));
          }
          const j = dadosIniciais.jogador;
          const pontos = j ? [[j.x, j.z]] : [];
          const n = encontrarNascimento(semente);
          pontos.push([n.x, n.z]);
          for (const [x, z] of pontos) {
            const rx = Math.floor(x / 128);
            const rz = Math.floor(z / 128);
            for (let dx = -1; dx <= 1; dx++)
              for (let dz = -1; dz <= 1; dz++) r.add(`${rx + dx},${rz + dz}`);
          }
          return [...r];
        })()
      : [];
  definirRegioesSemPovoado(semPovoado);
  // blocos-base compartilhados (chegam do worker junto com a malha)
  const provedor = criarProvedorBlocos(semente);
  /**
   * Spec 016: o que o mundo construiu e quem pôs cada bloco, com a mesma regra do núcleo: o
   * cliente prevê a recusa (cadeado, rachadura que não começa e o aviso) e nada pisca.
   */
  const protecaoMundo = criarProtecaoMundo(semente);
  const regra: MundoDaRegra = {
    protecao: protecaoMundo,
    bloco: (x, y, z) => blocoEm(x, y, z),
    gerado: (x, y, z) => {
      if (y < 0 || y >= ALTURA) return Bloco.AR;
      const cx = Math.floor(x / TAM_X);
      const cz = Math.floor(z / TAM_Z);
      return provedor.obter(cx, cz)[indice(x - cx * TAM_X, y, z - cz * TAM_Z)];
    },
    dono: (x, y, z) =>
      // o primeiro bloco de quem ainda não está na tabela: é dele (sem cadeado piscando)
      meusSemTabela.size && edicoes.indiceDono(x, y, z) === 0 && meusSemTabela.has(`${x},${y},${z}`)
        ? voce
        : donoNaCelula(edicoes, x, y, z, donoDoMundo),
    apelido: (id) => apelidosVistos.get(id) ?? edicoes.donos.apelido(id),
    donoDoMundo,
  };
  /**
   * Spec 016: células que este jogador colocou antes de entrar na tabela de donos (o núcleo
   * ainda não mandou o índice dele). Somem quando a tabela chega com ele.
   */
  const meusSemTabela = new Set<string>();
  const avisosProtecao = criarAvisosProtecao({
    toast: (t) => window.dispatchEvent(new CustomEvent('brumaluz:toast', { detail: t })),
  });
  /**
   * Recusa prevista: o aviso na hora, sem mandar nada ao núcleo (o som de "não deu" sai de
   * quem chamou, uma vez só).
   */
  function recusarProtegido(r: RecusaProtecao): false {
    avisosProtecao.avisar(r);
    return false;
  }
  const controle = criarControle(canvas, camera, semente, edicoes, (cx, cz) =>
    provedor.obter(cx, cz),
  );
  if (dadosIniciais?.jogador) {
    const j = controle.jogador;
    j.x = dadosIniciais.jogador.x;
    j.y = dadosIniciais.jogador.y;
    j.z = dadosIniciais.jogador.z;
    controle.apontar(dadosIniciais.jogador.yaw, dadosIniciais.jogador.pitch);
  }
  controle.atualizar(0);

  // Núcleo: o mundo e as regras rodam no servidor local (Web Worker); a cena manda
  // comandos e aplica o que ele devolve a cada passo.
  const conexao =
    opcoes.conexao ??
    conexaoLocal({
      t: 'inicio',
      versao: VERSAO_PROTOCOLO,
      semente,
      modo,
      versaoMundo: opcoes.mundo?.versao ?? 1,
      estilo: estiloMundo(),
      dados: dadosIniciais,
    });
  // o que o cliente sabe do mundo (previsões, itens, criaturas, vida, dia e clima)
  const cliente = criarEstadoCliente({
    conexao,
    inventario,
    aplicarBloco: (x, y, z, b, meta, dono) => editarBloco(x, y, z, b, meta, dono),
    aoEvento: (e) => tratarEvento(e),
    aoConteiner: (c, novo) =>
      window.dispatchEvent(
        new CustomEvent('brumaluz:conteiner', { detail: { conteiner: c, novo } }),
      ),
    aoQuadro: (q) => {
      if (q.donos) edicoes.donos.importar(sanearDonos(q.donos));
      if (q.donosNovos) edicoes.donos.aplicar(sanearDonosMudados(q.donosNovos));
      if (meusSemTabela.size && meuIndiceDono() !== undefined) meusSemTabela.clear();
      if (q.perfis)
        for (const [id, p] of Object.entries(q.perfis)) apelidosVistos.set(id, p.apelido);
      if (q.perfis) outrosJogadores.definirPerfis(q.perfis);
      if (q.jogadores) {
        // quem aparece pela primeira vez chega com festa (brilho e som)
        const antes = new Set(outrosJogadores.lista.map((o) => o.id));
        outrosJogadores.receber(q.jogadores);
        for (const o of q.jogadores)
          if (!antes.has(o.id) && quadrosVistos > 1) chegouAmigo(o.x, o.y, o.z);
      }
      quadrosVistos++;
      const a = cliente.ambiente;
      dia = a.dia;
      hora = a.hora;
      diaPausado = a.pausado;
      estadoClima = a.clima;
    },
    hora: dadosIniciais && dadosIniciais.hora >= 0 ? dadosIniciais.hora : HORA_INICIAL,
    dia: Number(dadosIniciais?.extras?.['dia']) || 0,
    clima: criarClima(criarGerador(semente + 31), dadosIniciais?.extras?.['clima']).estado,
    sobrevivencia: {
      ...estadoInicial(),
      ...((dadosIniciais?.extras?.['sobrevivencia'] as Partial<EstadoSobrevivencia>) ?? {}),
    },
  });
  let quadrosVistos = 0;
  const enviar = (c: Comando) => {
    // o que as telas (ou os testes) mudaram nos itens vai antes da ação que depende disso
    if (c.t !== 'jogador' && c.t !== 'transacao') cliente.sincronia.verificar();
    cliente.enviar(c);
  };
  /** Última abertura de baú ou fornalha pedida (fechar antes de chegar cancela). */
  let ultimaAbertura = 0;
  function pedirUso(x: number, y: number, z: number, id = proximoId()): void {
    ultimaAbertura = id;
    enviarTelemetria(true);
    enviar({ t: 'usar', id, x, y, z });
  }
  const proximoId = () => cliente.proximoId();

  function armazenamentoLocal(): Armazenamento | null {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }
  let aparencia: Aparencia = carregarAparencia(armazenamentoLocal());
  const personagem = criarPersonagem(scene, aparencia);
  const animador = criarAnimador(camera.rotation.y);
  let gestos: GestosJogo | undefined;
  let velocidadeHoriz = 0;
  /** Velocidade do jogador em x e z (blocos/s): o boneco vira para onde anda. */
  let velX = 0;
  let velZ = 0;
  let corrida = false;

  const luz = new HemisphericLight('luz', new Vector3(0.3, 1, 0.2), scene);
  luz.diffuse = new Color3(...LUZ_PREENCHIMENTO.cor);
  luz.groundColor = new Color3(...PALETA.sombra);
  luz.intensity = LUZ_PREENCHIMENTO.intensidade;

  const sol = new DirectionalLight('sol', new Vector3(...DIRECAO_SOL), scene);
  sol.diffuse = new Color3(...PALETA.sol);
  // brilho suave de plástico (spec 012): o sol acende o reflexo dos blocos e bonecos
  sol.specular = new Color3(0.55, 0.52, 0.46);
  sol.intensity = 1.1;
  sol.position = new Vector3(60, 90, 60);
  sol.autoUpdateExtends = true;

  const sombras = new CascadedShadowGenerator(2048, sol);
  sombras.numCascades = NUM_CASCATAS;
  sombras.lambda = 0.75;
  const toqueGrosso = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  // o alcance da sombra acompanha o raio de quem a projeta (sem corte reto no meio do chão)
  const raioSombra = toqueGrosso ? RAIO_SOMBRA_CELULAR : RAIO_SOMBRA_DESKTOP;
  sombras.shadowMaxZ = (raioSombra + 0.5) * TAM_X;
  sombras.bias = 0.006;
  sombras.normalBias = 0.02;
  sombras.setDarkness(0.15);
  sombras.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
  sombras.usePercentageCloserFiltering = true;
  sombras.stabilizeCascades = true;

  /** Claridade do dia para o boneco (1 ao meio-dia, ~0.4 à noite). */
  let luzDia = 1;
  // celular: desfoque menor (halo mais justo e mais barato) na mesma meia resolução
  const glow = new GlowLayer('glow', scene, {
    blurKernelSize: toqueGrosso ? 16 : 32,
    mainTextureRatio: 0.5,
  });
  glow.intensity = INTENSIDADE_GLOW;
  // personagem e item na mão nunca brilham: o piso de luz deles é emissivo,
  // mas não é fonte de luz (inclui malhas criadas depois, como ao trocar a aparência)
  const semBrilho = (nome: string) => nome.startsWith('personagem');
  for (const m of scene.meshes) if (semBrilho(m.name)) glow.addExcludedMesh(m as Mesh);
  scene.onNewMeshAddedObservable.add((m) => {
    if (semBrilho(m.name)) glow.addExcludedMesh(m as Mesh);
  });

  // os outros jogadores (mundo com amigos): personagem, apelido e item na mão
  const outrosJogadores = criarOutrosJogadores(scene);
  const ceu = criarCeu(scene);
  const agua = criarAgua(scene);
  glow.addExcludedMesh(ceu.malha);
  const vagalumes = criarVagalumes(scene);

  // Pós-processamento: HDR, tonemapping ACES, bloom suave, vinheta e FXAA.
  const pipeline = new DefaultRenderingPipeline('pos', true, scene, [cameraVisao]);
  /** Exposição de base (o relâmpago soma por cima). */
  const tomCena = { exposicao: EXPOSICAO_CENA };
  pipeline.fxaaEnabled = true;
  pipeline.bloomEnabled = true;
  // só luz de verdade passa do limite: roupa branca e neve ao sol não estouram (no tablet o
  // bloom fica desligado, e o amigo de jaleco branco aparecia certo lá e estourado aqui)
  pipeline.bloomThreshold = 1.0;
  pipeline.bloomWeight = 0.22;
  pipeline.bloomKernel = toqueGrosso ? 32 : 48;
  pipeline.bloomScale = 0.5;
  pipeline.imageProcessingEnabled = true;
  const ip = pipeline.imageProcessing;
  ip.toneMappingEnabled = true;
  // correção da 017 ("névoa em cima do cenário e do personagem"): o ACES sobre as cores do
  // jogo levava o branco a 0,83 e escurecia o meio-tom; nada na tela passava de 0,86 e a
  // imagem inteira parecia ter um véu claro por cima. O neutro (Khronos PBR Neutral) deixa o
  // meio-tom como está e só dobra o alto, até quase 1: a mesma cor do mundo, sem o véu.
  ip.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_KHR_PBR_NEUTRAL;
  ip.exposure = EXPOSICAO_CENA;
  ip.contrast = 1.12;
  ip.vignetteEnabled = true;
  ip.vignetteWeight = 0.7;
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
  // a hora é do núcleo: mudar aqui (testes, modo foto, sono) também muda lá
  Object.defineProperty(estado, 'hora', {
    get: () => hora,
    set: (v: number) => {
      hora = normalizarHora(v);
      enviar({ t: 'depurar', d: { f: 'hora', hora } });
    },
    enumerable: true,
  });
  Object.defineProperty(estado, 'pausarDia', {
    get: () => diaPausado,
    set: (v: boolean) => {
      diaPausado = !!v;
      enviar({ t: 'depurar', d: { f: 'pausarDia', pausar: diaPausado } });
    },
    enumerable: true,
  });

  const atlas = gerarAtlas(SEMENTE_PADRAO);
  const textura = RawTexture.CreateRGBATexture(
    new Uint8Array(atlas.pixels.buffer),
    atlas.largura,
    atlas.altura,
    scene,
    true,
    false,
    // traço de brinquedo: o atlas limpo filtrado (sem degrau de pixel em nenhum bloco)
    Texture.TRILINEAR_SAMPLINGMODE,
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
  matSolido.specularColor = new Color3(0.2, 0.2, 0.2);
  matSolido.specularPower = 36;
  matSolido.ambientColor = Color3.White();
  matSolido.backFaceCulling = false;
  // o recorte usa o alfa da arte: sem isto, o miolo do vidro, os furos das folhas e as
  // janelinhas da porta saíam pretos em vez de vazados
  matSolido.useAlphaFromDiffuseTexture = true;
  matSolido.transparencyMode = Material.MATERIAL_ALPHATEST;
  matSolido.alphaCutOff = 0.5;
  const mundoSolido = new PluginMundo(matSolido, { juntas: true });

  const matPlanta = new StandardMaterial('atlas-plantas', scene);
  matPlanta.diffuseTexture = textura;
  matPlanta.emissiveTexture = texEmissiva;
  matPlanta.emissiveColor = Color3.White();
  const balanco = new PluginBalanco(matPlanta);
  matPlanta.specularColor = Color3.Black();
  matPlanta.ambientColor = Color3.White();
  matPlanta.backFaceCulling = false;
  matPlanta.useAlphaFromDiffuseTexture = true;
  // arte com alfa 0 ou 1: recorte puro (sem disputar ordenação com a água)
  matPlanta.transparencyMode = Material.MATERIAL_ALPHATEST;
  matPlanta.alphaCutOff = 0.5;
  const mundoPlanta = new PluginMundo(matPlanta, { plantas: true });

  // Clima e estações
  // dia e clima vêm do núcleo; até o primeiro quadro, vale o que estava salvo
  let estadoClima: EstadoClima = cliente.ambiente.clima;
  let dia = cliente.ambiente.dia;
  let diaPausado = false;
  let outonoAtual = 0;
  let invernoAtual = 0;
  let jogadorCoberto = false;
  /** 0 sob teto, 1 a céu aberto (suavizado; controla chuva, neve e folhas). */
  let ceuAbertoSuave = 1;
  let escuroSuave = 0;
  let submersoSuave = 0;
  let molhadoSuave = 0;
  let flash = 0;
  const precipitacao = criarPrecipitacao(scene);

  /** Aplica a atmosfera da hora e do clima a luzes, névoa, céu e água. */
  let biomaX = NaN;
  let biomaZ = NaN;
  let biomaCache = biomaEm(0, 0, semente);
  function aplicarAtmosfera(tempo: number, dt = 0): void {
    const estacao = estacaoDoDia(dia);
    const baseHora = atmosferaNaHora(hora);
    const clima = { estado: estadoClima };
    // nuvens do tema (a Lua não tem nenhuma): o clima continua o mesmo, só o céu muda
    const fatorNuvens = temaAtual.ceu.fatorNuvens;
    const a = ajustarPorClima(
      baseHora,
      fatorNuvens === 1
        ? clima.estado
        : { ...clima.estado, nuvens: clima.estado.nuvens * fatorNuvens },
    );
    if (!temaAtual.climaVisual.arcoIris) a.arco = 0;
    const k = 1 - Math.exp(-dt / 20);
    outonoAtual += ((estacao === 'outono' ? 1 : 0) - outonoAtual) * k;
    invernoAtual += ((estacao === 'inverno' ? 1 : 0) - invernoAtual) * k;
    // o chão molha e seca aos poucos
    molhadoSuave += (clima.estado.chuva - molhadoSuave) * Math.min(1, dt / 4);
    mundoSolido.ventoFolhas = 1 + clima.estado.chuva * 1.5 + clima.estado.raios;
    mundoSolido.tempoMundo = tempo;
    for (const m of [mundoSolido, mundoPlanta]) {
      m.outono = outonoAtual;
      m.inverno = temaAtual.climaVisual.neve ? invernoAtual * 0.9 : 0;
      m.molhado = molhadoSuave;
    }
    const pj = controle.jogador;
    // bioma (ruído) só quando o jogador muda de coluna
    const bx = Math.floor(pj.x);
    const bz = Math.floor(pj.z);
    if (bx !== biomaX || bz !== biomaZ) {
      biomaX = bx;
      biomaZ = bz;
      biomaCache = biomaEm(bx, bz, semente);
    }
    const b = biomaCache;
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
    // qualquer teto acima (casa, caverna, marquise) tira a chuva, com transição suave
    const alvoAberto = tetoCoberto || cameraSubmersa ? 0 : 1;
    ceuAbertoSuave += (alvoAberto - ceuAbertoSuave) * Math.min(1, dt / 0.35);
    const aberto = Math.round(ceuAbertoSuave * 50) / 50;
    precipitacao.atualizar(cameraVisao.position, clima.estado.chuva * aberto, nevando, false);
    // respingos da chuva no chão e rodinhas na água (só chuva de gota, não neve nem poeira)
    chuvaRespingos = nevando || tema().climaVisual.chuva !== 'gotas' ? 0 : clima.estado.chuva;
    precipitacao.definirLuz(0.25 + 0.75 * (1 - a.noite));
    const arborizado = b === 'floresta' || b === 'pantano' || b === 'taiga' || b === 'campos';
    precipitacao.folhas(cameraVisao.position, arborizado ? aberto : 0, outonoAtual);
    ambiente?.definirChuva(nevando ? clima.estado.chuva * 0.25 : clima.estado.chuva);
    // relâmpago suave de brinquedo: clareia a cena sem estourar em branco
    flash = Math.max(0, flash - dt * 3.2);
    pipeline.imageProcessing.exposure = tomCena.exposicao + flash * flash * 0.85;
    estado.infoMundo = `Dia ${dia + 1} · ${NOMES_ESTACAO[estacao]} · ${NOMES_CLIMA[clima.estado.tipo]}`;
    estado.atmosfera = { noite: a.noite, crepusculo: a.crepusculo };
    // a câmera que de fato desenha (em 3ª pessoa fica atrás do personagem); a superfície
    // visível da água fica em 0,875 do bloco quando não há água em cima
    const olho = cameraVisao.position;
    const ox = Math.floor(olho.x);
    const oy = Math.floor(olho.y);
    const oz = Math.floor(olho.z);
    const naAgua = blocoEm(ox, oy, oz) === Bloco.AGUA;
    const superficie = blocoEm(ox, oy + 1, oz) === Bloco.AGUA ? 1 : 0.875;
    const submersa = naAgua && olho.y - oy < superficie;
    if (submersa !== cameraSubmersa) {
      cameraSubmersa = submersa;
      motorAudio.definirAbafado(submersa);
      document.body.classList.toggle('submerso', submersa);
      if (submersa) window.dispatchEvent(new CustomEvent('brumaluz:mergulhou'));
    }
    // entrar e sair da água em ~0,25 s, sem salto de cor e densidade
    submersoSuave += ((submersa ? 1 : 0) - submersoSuave) * Math.min(1, dt / 0.25);
    const l = 0.25 + 0.75 * (1 - a.noite);
    const ns = submersoSuave;
    // debaixo d'água o fundo fica claro como piscina (a luz do céu tem um piso)
    mundoSolido.pisoCeu = 0.62 * ns * (0.4 + 0.6 * (1 - a.noite));
    mundoPlanta.pisoCeu = mundoSolido.pisoCeu;
    scene.fogColor.set(
      // debaixo d'água de brinquedo: azul-claro de piscina, nunca preto
      a.nevoa[0] + (0.28 * l - a.nevoa[0]) * ns,
      a.nevoa[1] + (0.62 * l - a.nevoa[1]) * ns,
      a.nevoa[2] + (0.82 * l - a.nevoa[2]) * ns,
    );
    // correção da 017: de dia o ar fica um quarto mais limpo (o fundo não some num leite
    // claro); ao entardecer e à noite a névoa volta à de antes
    const arDia = 0.75 + 0.25 * Math.max(a.noite, a.crepusculo);
    const densAr = a.densidadeNevoa * fatorNevoa * arDia;
    scene.fogDensity = densAr + (0.06 - densAr) * ns;
    scene.clearColor.set(a.nevoa[0], a.nevoa[1], a.nevoa[2], 1);
    scene.ambientColor.set(...a.ambiente);
    luz.diffuse.set(...a.ceuLuz);
    luz.groundColor.set(...a.chaoLuz);
    luz.intensity = a.intensidadeCeu;
    sol.diffuse.set(...a.luz);
    // o sol anda devagar: só move a luz (e refaz as sombras) quando o ângulo muda de fato
    const [dlx, dly, dlz] = a.direcaoLuz;
    if (
      Math.abs(dlx - sol.direction.x) +
        Math.abs(dly - sol.direction.y) +
        Math.abs(dlz - sol.direction.z) >
      0.004
    )
      sol.direction.set(dlx, dly, dlz);
    sol.intensity = a.intensidadeLuz;
    const tb = temaAtual.bruma;
    const bruma: [number, number, number] = [
      (a.nevoa[0] * 0.85 + 0.12) * tb.cor[0],
      (a.nevoa[1] * 0.85 + 0.12) * tb.cor[1],
      (a.nevoa[2] * 0.85 + 0.14) * tb.cor[2],
    ];
    // luz de brinquedo (spec 012): de dia o ar é limpo; a bruma dos vales volta ao entardecer
    const forca = (0.08 + 0.62 * Math.max(a.crepusculo, a.noite)) * tb.forca;
    mundoSolido.definirBruma(bruma, forca);
    mundoSolido.luzBlocos = 0.8 + 0.4 * a.noite;
    // flores, cogumelos e lanternas brilham de verdade ao entardecer e à noite; sob o sol, quase nada
    const escuroAlvo = jogadorCoberto ? 1 : Math.max(a.noite, a.crepusculo * 0.7);
    escuroSuave += (escuroAlvo - escuroSuave) * Math.min(1, dt / 0.5);
    glow.intensity = INTENSIDADE_GLOW * (0.15 + 0.85 * escuroSuave);
    luzDia = 0.38 + 0.62 * (1 - a.noite) * Math.min(1, a.intensidadeCeu + 0.4);
    mundoPlanta.luzBlocos = mundoSolido.luzBlocos;
    mundoPlanta.definirBruma(bruma, forca);
    ceu.atualizar(a, tempo);
    agua.atualizar(a, tempo, cameraVisao.position, {
      cor: scene.fogColor,
      densidade: scene.fogDensity,
    });
    vagalumes.atualizar(camera.position, a.noite, jogadorCoberto || cameraSubmersa ? 0 : 1);
    ambiente?.definirNoite(a.noite);
    ambiente?.definirHora(hora);
  }

  const malhas = new Map<string, Mesh[]>();
  const fila = criarFilaRemalha<RespostaChunk>();
  const pedidos = new Set<string>();
  const prioritarios = new Set<string>();
  const versoesPedidas = new Map<string, number>();
  const worker = new Worker(new URL('../workers/chunk.worker.ts', import.meta.url), {
    type: 'module',
  });
  // Edições têm um worker só delas: nunca esperam atrás do terreno que está carregando.
  const workerEdicao = new Worker(new URL('../workers/chunk.worker.ts', import.meta.url), {
    type: 'module',
  });
  // o estilo do mundo do tema vai antes de qualquer pedido de chunk
  const coresPlantas = coresDasPlantas(atlas);
  // as pecinhas na mão e no chão (itens) usam as mesmas cores do mundo
  definirCoresPlantas(coresPlantas);
  // qualidade automática (spec 012): no celular as quinas são chanfros e as bolinhas têm
  // menos gomos; ?detalhe=alto|baixo força para comparar
  const pedidoDetalhe = new URLSearchParams(location.search).get('detalhe');
  const detalhe: 'alto' | 'baixo' =
    pedidoDetalhe === 'alto' || pedidoDetalhe === 'baixo'
      ? pedidoDetalhe
      : toqueGrosso
        ? 'baixo'
        : 'alto';
  estado.detalhe = detalhe;
  worker.postMessage({ estilo: estiloMundo(), semPovoado, coresPlantas, detalhe });
  workerEdicao.postMessage({ estilo: estiloMundo(), semPovoado, coresPlantas, detalhe });
  /** Momento da edição por chunk (para medir quanto o bloco demora a aparecer). */
  const inicioEdicao = new Map<string, number>();
  const receber = (ev: MessageEvent<RespostaChunk>) => {
    const r = ev.data;
    if (r.base) provedor.registrar(r.cx, r.cz, r.base);
    const k = chave(r.cx, r.cz);
    // chunk editado: aplica na hora, sem esperar a fila do quadro
    if (prioritarios.has(k) && malhas.has(k)) {
      if (r.versao < (versoesPedidas.get(k) ?? 0)) return; // já há uma versão mais nova a caminho
      prioritarios.delete(k);
      aplicar(r);
      liberarOcultos(k);
      const t0 = inicioEdicao.get(k);
      if (t0 !== undefined) {
        estado.latenciaEdicaoMs = performance.now() - t0;
        inicioEdicao.delete(k);
      }
      estado.remalhasConcluidas = (estado.remalhasConcluidas ?? 0) + 1;
      return;
    }
    fila.adicionar({ cx: r.cx, cz: r.cz, editado: prioritarios.has(k), dados: r });
  };
  worker.onmessage = receber;
  workerEdicao.onmessage = receber;

  /** Blocos quebrados que somem já no desenho até a malha nova do chunk chegar (D1). */
  const ocultos: { x: number; y: number; z: number; k: string; t: number }[] = [];
  function gravarOcultos(): void {
    for (const p of [mundoSolido, mundoPlanta]) {
      p.ocultos.fill(0);
      ocultos.slice(-8).forEach((o, i) => p.ocultos.set([o.x, o.y, o.z, 1], i * 4));
    }
  }
  function ocultarAteRemalhar(x: number, y: number, z: number, k: string): void {
    ocultos.push({ x, y, z, k, t: performance.now() });
    while (ocultos.length > 8) ocultos.shift();
    gravarOcultos();
  }
  estado.blocosOcultos = () => ocultos.map((o) => [o.x, o.y, o.z]);
  function liberarOcultos(k: string): void {
    const antes = ocultos.length;
    const agora = performance.now();
    for (let i = ocultos.length - 1; i >= 0; i--)
      if (ocultos[i].k === k || agora - ocultos[i].t > 4000) ocultos.splice(i, 1);
    if (ocultos.length !== antes) gravarOcultos();
  }

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
    // o alvo usa DDA própria: o picking do Babylon nunca precisa olhar os chunks
    m.isPickable = false;
    m.doNotSyncBoundingInfo = true;
    return m;
  }

  const comSombra = new Set<Mesh>();
  let sombraChunk = '';
  let sombrasSujas = true;
  function atualizarSombras(): void {
    const ccx = Math.floor(camera.position.x / TAM_X);
    const ccz = Math.floor(camera.position.z / TAM_Z);
    // só refaz a lista quando a câmera troca de chunk ou chega malha nova
    const kc = chave(ccx, ccz);
    if (kc === sombraChunk && !sombrasSujas) return;
    sombraChunk = kc;
    sombrasSujas = false;
    for (const [k, lista] of malhas) {
      const [cx, cz] = k.split(',').map(Number);
      const perto = Math.abs(cx - ccx) <= raioSombra && Math.abs(cz - ccz) <= raioSombra;
      for (const m of lista) {
        // água transparente não projeta sombra (economiza a passada de sombra)
        if (m.name.startsWith('agua')) continue;
        // todos recebem; só os próximos projetam
        m.receiveShadows = true;
        if (perto && !comSombra.has(m)) {
          sombras.addShadowCaster(m);
          comSombra.add(m);
        } else if (!perto && comSombra.has(m)) {
          sombras.removeShadowCaster(m);
          comSombra.delete(m);
        }
      }
    }
  }

  function aplicar(r: RespostaChunk): void {
    const k = chave(r.cx, r.cz);
    for (const p of provisorios) if (p.k === k) p.pronto = true;
    sombrasSujas = true;
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

  function solicitar(cx: number, cz: number, urgente = false): void {
    const k = chave(cx, cz);
    const versao = (versoesPedidas.get(k) ?? 0) + 1;
    versoesPedidas.set(k, versao);
    const edicoesPedido: EdicoesExportadas = {};
    for (const [dx, dz] of VIZINHANCA) {
      const lista = edicoes.doChunk(cx + dx, cz + dz);
      if (lista.length > 0) edicoesPedido[chave(cx + dx, cz + dz)] = lista;
    }
    const pedido: PedidoChunk = { cx, cz, semente, versao, edicoes: edicoesPedido };
    if (urgente) {
      // leva o terreno que a thread principal já tem (o worker de edição não regera nada)
      const bases: Record<string, Uint8Array> = {};
      for (const [dx, dz] of VIZINHANCA) {
        if (provedor.tem(cx + dx, cz + dz))
          bases[chave(cx + dx, cz + dz)] = provedor.obter(cx + dx, cz + dz);
      }
      pedido.bases = bases;
    }
    (urgente ? workerEdicao : worker).postMessage(pedido);
  }

  function legenda(texto: string): void {
    window.dispatchEvent(new CustomEvent('brumaluz:legenda', { detail: texto }));
  }

  /** Remalhas agrupadas: várias edições no mesmo quadro viram um pedido por chunk. */
  const remalhaPendente = new Map<string, { cx: number; cz: number }>();
  let envioAgendado = false;
  function enviarRemalhas(): void {
    envioAgendado = false;
    if (remalhaPendente.size === 0) return;
    // ordem de inserção: o chunk editado primeiro, os vizinhos (só luz) depois
    for (const c of remalhaPendente.values()) solicitar(c.cx, c.cz, true);
    remalhaPendente.clear();
  }

  /** Construção assistida: histórico, espelho e lotes. */
  const historico = criarHistorico();
  let espelho: number | null = null;
  function valorEm(x: number, y: number, z: number): number {
    return empacotar(blocoEm(x, y, z), edicoes.obterMeta(x, y, z));
  }
  /** Prevê na hora um bloco que o núcleo ainda vai confirmar. */
  const prever = (id: number, x: number, y: number, z: number, b: number, meta = 0) => {
    const dono = b === Bloco.AR ? undefined : meuIndiceDono();
    if (b !== Bloco.AR && dono === undefined && meusSemTabela.size < 4096)
      meusSemTabela.add(`${x},${y},${z}`);
    return cliente.prever(id, x, y, z, b, meta, dono);
  };
  /**
   * Spec 016: índice do dono que este jogador recebe ao colocar (o dono do mundo é o 0; quem
   * ainda não está na tabela fica sem previsão de dono até o núcleo mandar).
   */
  function meuIndiceDono(): number | undefined {
    if (voce === donoDoMundo) return 0;
    return edicoes.donos.procurar(voce) || undefined;
  }
  /** Vários blocos de uma vez (construção, desfazer, espelho, testes): só no criativo. */
  function editarLote(lote: { x: number; y: number; z: number; v: number }[]): void {
    // spec 016: cada célula segue a regra do núcleo (o que sai e o que entra); a recusada
    // nem vai (o núcleo recusaria e ela piscaria)
    let primeira: RecusaProtecao | null = null;
    const vai: { x: number; y: number; z: number; v: number; manterDono: boolean }[] = [];
    for (const e of lote) {
      // a igual não vai (nem carimba o dono); a lavoura do mundo só se colhe
      const d = celulaDoLote(regra, voce, e.x, e.y, e.z, e.v, valorEm(e.x, e.y, e.z));
      if ('pula' in d) continue;
      if ('recusa' in d) primeira ??= d.recusa;
      else vai.push({ x: e.x, y: e.y, z: e.z, v: d.v, manterDono: d.manterDono });
    }
    if (primeira) avisosProtecao.avisar(primeira);
    if (!vai.length) return;
    lote = vai.map(({ x, y, z, v }) => ({ x, y, z, v }));
    const id = proximoId();
    // a colheita e o giro ficam com o dono que tinham (o núcleo faz igual)
    for (const e of vai)
      (e.manterDono ? cliente.prever : prever)(id, e.x, e.y, e.z, e.v & 255, (e.v >> 8) & 255);
    enviarTelemetria(true);
    enviar({ t: 'editar', id, lote });
  }
  function editarRegistrando(
    x: number,
    y: number,
    z: number,
    b: number,
    meta = 0,
    extras: { x: number; y: number; z: number }[] = [],
  ): boolean {
    const lote: Edicao[] = [];
    const antes = valorEm(x, y, z);
    const quebra = b === Bloco.AR;
    // spec 016: a mesma regra do núcleo (o que o mundo fez, o que é do amigo, a passagem)
    const protegido = quebra
      ? recusaQuebrar(regra, voce, x, y, z)
      : (recusaColocar(regra, voce, x, y, z, b) ??
        extras.reduce<RecusaProtecao | null>(
          (r, e) => r ?? recusaColocar(regra, voce, e.x, e.y, e.z, b),
          null,
        ));
    if (protegido) return recusarProtegido(protegido);
    // o dono do mundo desfaz a construção de um amigo: um aviso discreto
    const doAmigo = quebra ? regra.dono(x, y, z) : null;
    // a lavoura do mundo se replanta na hora (o estágio 0 da mesma planta, como o núcleo)
    if (quebra && ehLavoura(antes & 255) && protecaoMundo.em(x, y, z) === Protecao.LAVOURA)
      b = replantioDaLavoura(antes & 255) ?? Bloco.AR;
    // nada muda: nada a prever nem a pedir
    if (antes === empacotar(b, meta)) return false;
    if (doAmigo && doAmigo !== voce) {
      const apelido = regra.apelido(doAmigo);
      if (apelido) avisosProtecao.tirouDoAmigo(apelido);
    }
    // a outra metade da porta, conferida antes de a primeira sumir da previsão
    const outraMetade = quebra ? outraMetadeDaPorta(regra, voce, x, y, z) : null;
    const id = proximoId();
    // o replantio fica com o dono que a lavoura já tinha (o núcleo faz igual)
    if (quebra && b !== Bloco.AR) cliente.prever(id, x, y, z, b, meta);
    else prever(id, x, y, z, b, meta);
    lote.push({ x, y, z, antes, depois: empacotar(b, meta) });
    // a lavoura não flutua: quebrar a terra arada leva a planta de cima (o núcleo faz o mesmo)
    if ((antes & 255) === Bloco.TERRA_ARADA && b !== Bloco.TERRA_ARADA) {
      const cima = valorEm(x, y + 1, z);
      if (ehLavoura(cima & 255)) {
        prever(id, x, y + 1, z, Bloco.AR);
        lote.push({ x, y: y + 1, z, antes: cima, depois: Bloco.AR });
      }
    }
    // quebrar meia porta leva a outra metade do mesmo par, se puder (o núcleo faz o mesmo)
    if (outraMetade !== null) {
      const a = valorEm(x, outraMetade, z);
      prever(id, x, outraMetade, z, Bloco.AR);
      lote.push({ x, y: outraMetade, z, antes: a, depois: Bloco.AR });
    }
    const extrasFeitos: { x: number; y: number; z: number }[] = [];
    for (const e of extras) {
      const a = valorEm(e.x, e.y, e.z);
      if (prever(id, e.x, e.y, e.z, b, meta)) {
        lote.push({ ...e, antes: a, depois: empacotar(b, meta) });
        extrasFeitos.push(e);
      }
    }
    enviarTelemetria(true);
    const slot = hotbar.ativo;
    if (quebra) enviar({ t: 'quebrar', id, x, y, z, slot });
    // a outra parte só vai quando existe (a metade de cima da porta)
    else
      enviar({
        t: 'colocar',
        id,
        x,
        y,
        z,
        bloco: b,
        meta,
        slot,
        ...(extrasFeitos.length ? { extras: extrasFeitos } : {}),
      });
    if (espelho !== null && modo === 'criativo' && !(quebra && b !== Bloco.AR)) {
      const m = espelharX({ x, y, z }, espelho);
      if (m.x !== x) {
        const a = valorEm(m.x, m.y, m.z);
        lote.push({ ...m, antes: a, depois: empacotar(b, meta) });
        editarLote([{ ...m, v: empacotar(b, meta) }]);
      }
    }
    historico.registrar(lote);
    return true;
  }
  function aplicarLote(lote: Edicao[], usar: 'antes' | 'depois'): void {
    editarLote(lote.map((e) => ({ x: e.x, y: e.y, z: e.z, v: e[usar] })));
  }

  function editarBloco(
    x: number,
    y: number,
    z: number,
    bloco: number,
    meta = 0,
    dono?: number,
  ): boolean {
    if (!edicoes.definir(x, y, z, bloco, meta, dono)) return false;
    const cxE = Math.floor(x / TAM_X);
    const czE = Math.floor(z / TAM_Z);
    if (bloco === Bloco.AR) ocultarAteRemalhar(x, y, z, chave(cxE, czE));
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
      // diagonais: só se a luz (até 15 blocos, em distância de Manhattan) alcança o canto
      ...diagonaisAlcancadas(x - cxE * TAM_X, z - czE * TAM_Z).map(([dx, dz]) => ({
        cx: cxE + dx,
        cz: czE + dz,
      })),
    ].filter((c, i, arr) => arr.findIndex((o) => o.cx === c.cx && o.cz === c.cz) === i);
    for (const c of afetados) {
      const k = chave(c.cx, c.cz);
      if (!malhas.has(k) && !pedidos.has(k)) continue;
      prioritarios.add(k);
      pedidos.add(k);
      remalhaPendente.set(k, c);
    }
    if (!inicioEdicao.has(chave(cxE, czE))) inicioEdicao.set(chave(cxE, czE), performance.now());
    // envia ao fim desta tarefa (junta as edições do mesmo clique) sem esperar o próximo quadro
    if (!envioAgendado) {
      envioAgendado = true;
      queueMicrotask(enviarRemalhas);
    }
    return true;
  }

  function blocoEm(x: number, y: number, z: number): number {
    if (y < 0 || y >= ALTURA) return Bloco.AR;
    const editado = edicoes.obter(x, y, z);
    if (editado !== undefined) return editado;
    const cx = Math.floor(x / TAM_X);
    const cz = Math.floor(z / TAM_Z);
    return provedor.obter(cx, cz)[indice(x - cx * TAM_X, y, z - cz * TAM_Z)];
  }

  /** Célula que a câmera não atravessa: todo bloco, menos água, plantas e tochas. */
  const cacheBloqueia: (boolean | undefined)[] = [];
  // a marcha da câmera e o pivô leem as mesmas células várias vezes por quadro: guarda o
  // resultado até o quadro (ou o mundo) mudar
  const celulasCamera = new Map<number, boolean>();
  let celulasQuadro = -1;
  let celulasEdicoes = -1;
  const bloqueiaCamera: BloqueiaCamera = (x, y, z) => {
    if (celulasQuadro !== quadroAtual || celulasEdicoes !== edicoes.versaoGeral) {
      celulasCamera.clear();
      celulasQuadro = quadroAtual;
      celulasEdicoes = edicoes.versaoGeral;
    }
    const k = ((x + 131072) * 1024 + (y + 512)) * 262144 + (z + 131072);
    const ja = celulasCamera.get(k);
    if (ja !== undefined) return ja;
    const b = blocoEm(x, y, z);
    let v = false;
    if (b !== Bloco.AR) {
      const c = cacheBloqueia[b];
      if (c === undefined) {
        const d = obterBlocoDef(b);
        v = !!d && !d.liquido && !d.planta && d.forma !== 'tocha';
        cacheBloqueia[b] = v;
      } else v = c;
    }
    celulasCamera.set(k, v);
    return v;
  };

  /**
   * Mira em terceira pessoa (spec 015): o raio do centro da tela passa pelo pivô da câmera
   * (acima e ao lado da cabeça) na direção do olhar e começa ali, depois do boneco; o
   * alcance é medido dos olhos do boneco, como o núcleo confere. O pivô sai do ponto que a
   * câmera segue e do olhar de agora: apontar e mirar valem já, sem esperar o quadro.
   */
  function pivoMira(): Vec3 {
    const s = orbita.seguido() ?? {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    };
    return pivoCamera(
      s,
      camera.rotation.y,
      camera.rotation.x,
      bloqueiaCamera,
      LADO_OMBRO,
      orbita.alturaPivo(),
    );
  }

  /**
   * Mira pelo toque: no celular o jogador aponta com o dedo (toque coloca, segurar
   * quebra) em vez da mira do centro. Raio saindo da câmera de visão pelo ponto tocado:
   * o primeiro bloco que ele encontra é o que a criança vê (a câmera nunca está dentro
   * de um bloco).
   */
  let raioToque: { origem: Vec3; direcao: Vec3 } | null = null;
  /** Ponto tocado (o raio é refeito a cada quadro: o jogador pode andar segurando). */
  let pontoToque: { x: number; y: number } | null = null;
  function raioNaTela(xCss: number, yCss: number): { origem: Vec3; direcao: Vec3 } {
    const r = scene.createPickingRay(xCss, yCss, Matrix.Identity(), cameraVisao);
    return {
      origem: { x: r.origin.x, y: r.origin.y, z: r.origin.z },
      direcao: { x: r.direction.x, y: r.direction.y, z: r.direction.z },
    };
  }
  function mirarToque(xCss: number, yCss: number): void {
    raioToque = raioNaTela(xCss, yCss);
    alvoMemoQuadro = -1;
  }
  /**
   * O último bloco em que o dedo agiu e até quando o corpo vira para ele (a animação do
   * golpe ou da colocação dura um pouco mais que o toque, que já soltou a mira).
   */
  let alvoDoToque: {
    x: number;
    y: number;
    z: number;
    normal: Vec3;
    ate: number;
    /** Até quando a dica da mira fala deste bloco (sem dedo na tela). */
    ateDica: number;
  } | null = null;

  /**
   * O raio da mira do centro passa pelo pivô (o caminho da câmera até ele é livre: a câmera
   * desvia dos blocos marchando dali para trás), então sair do pivô é o mesmo que sair da
   * câmera, e vale já no quadro em que o olhar muda.
   */
  function raioMira(): { origem: Vec3; direcao: Vec3 } {
    if (raioToque) return raioToque;
    return {
      origem: pivoMira(),
      direcao: direcaoDoOlhar(camera.rotation.y, camera.rotation.x),
    };
  }

  /**
   * O primeiro bloco no raio, no alcance da mira: o do centro (mouse) ou o do dedo, mais
   * generoso, que também passa pela conta do núcleo (o cliente só prevê o que ele aceita).
   */
  function alvoNoRaio(r: { origem: Vec3; direcao: Vec3 }, toque: boolean) {
    const olhos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
    const a = mirarDaCamera(
      r.origem,
      r.direcao,
      olhos,
      toque ? ALCANCE_TOQUE : ALCANCE_MIRA,
      (x, y, z) => ehAlvo(blocoEm(x, y, z)),
    );
    if (a && toque && !clienteAlcanca(olhos, a.x, a.y, a.z)) return null;
    return a;
  }
  function alvoComDistancia() {
    return alvoNoRaio(raioMira(), raioToque !== null);
  }
  /** Fora do alcance, o raio do dedo bate num bloco que a criança vê? */
  function blocoLongeNoRaio(r: { origem: Vec3; direcao: Vec3 }): boolean {
    const olhos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
    return !!mirarDaCamera(r.origem, r.direcao, olhos, ALCANCE_VER_LONGE, (x, y, z) =>
      ehAlvo(blocoEm(x, y, z)),
    );
  }

  function calcularAlvo() {
    const a = alvoComDistancia();
    return a ? { x: a.x, y: a.y, z: a.z, normal: a.normal } : null;
  }

  /**
   * Alvo da mira calculado uma vez por quadro para quem só lê (destaque, mineração,
   * prévia de construção). Ações (quebrar, colocar) usam calcularAlvo() direto.
   */
  let quadroAtual = 0;
  let alvoMemoQuadro = -1;
  let alvoMemo: ReturnType<typeof calcularAlvo> = null;
  let alvoMemoEdicoes = -1;
  function alvoDoQuadro(): ReturnType<typeof calcularAlvo> {
    // recalcula num quadro novo ou se o mundo mudou (bloco colocado/quebrado no meio do quadro)
    if (alvoMemoQuadro !== quadroAtual || alvoMemoEdicoes !== edicoes.versaoGeral) {
      alvoMemo = calcularAlvo();
      alvoMemoQuadro = quadroAtual;
      alvoMemoEdicoes = edicoes.versaoGeral;
    }
    return alvoMemo;
  }

  /** Metadado ao colocar: a frente olha para o jogador; escadas e portas seguem o olhar. */
  function metaColocacao(bloco: number): number {
    const d = direcaoDoYaw(camera.rotation.y);
    const forma = obterBlocoDef(bloco)?.forma;
    if (forma === 'escada' || forma === 'porta' || forma === 'cama' || forma === 'porteira')
      return d;
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
        // porta ocupa dois blocos: as duas metades entram no mesmo passo do desfazer;
        // planta, neve ou água em cima dão lugar; bloco firme em cima: não cabe (nada de
        // meia porta)
        // semente: só na terra arada (a mesma regra do núcleo; nada é previsto à toa)
        if (lavouraDoBloco(b) && !podePlantar(blocoEm(x, y - 1, z), blocoEm(x, y, z))) {
          toast(AVISO_SEMENTE);
          return false;
        }
        if (b === Bloco.PORTA) {
          const cabe = substituivel(blocoEm(x, y + 1, z));
          if (!cabe || y + 1 >= ALTURA) {
            toast('A porta precisa de 2 blocos de altura');
            return false;
          }
          return editarRegistrando(x, y, z, b, meta, [{ x, y: y + 1, z }]);
        }
        return editarRegistrando(x, y, z, b, meta);
      },
      posicao: posicaoDeColocar,
      ocupa: (b) => !!obterBlocoDef(b)?.solido,
    });
  }

  const barramento = criarBarramento();
  estado.barramento = barramento;

  /**
   * Onde um bloco vai parar: plantas baixas (grama alta, flores) são substituídas no lugar;
   * a lavoura não (o bloco vai ao lado dela, e em cima dela não cabe).
   */
  function posicaoDeColocar(a: { x: number; y: number; z: number; normal: Vec3 }): Vec3 {
    // semente na mão: o canteiro mirado (pela beirada ou pela grama alta em cima dele)
    const canteiro = lavouraDoBloco(hotbar.blocoAtivo()) ? alvoDaSemente(a, blocoEm) : null;
    if (canteiro) return canteiro;
    return plantaBaixa(blocoEm(a.x, a.y, a.z)) ? { x: a.x, y: a.y, z: a.z } : posicaoColocacao(a);
  }

  /** Enxada na mão: ara a grama (ou a terra) na mira, prevendo com a regra do núcleo. */
  function ararNaMira(a: { x: number; y: number; z: number }): boolean {
    const alvo = alvoDaEnxada(a, blocoEm);
    if (!alvo) {
      barramento.emitir('recusa', { motivo: 'colocar' });
      return false;
    }
    const protegido =
      recusaQuebrar(regra, voce, alvo.x, alvo.y, alvo.z) ??
      (blocoEm(alvo.x, alvo.y + 1, alvo.z) !== Bloco.AR
        ? recusaQuebrar(regra, voce, alvo.x, alvo.y + 1, alvo.z)
        : null);
    if (protegido) {
      barramento.emitir('recusa', { motivo: 'colocar' });
      return recusarProtegido(protegido);
    }
    const id = proximoId();
    prever(id, alvo.x, alvo.y, alvo.z, Bloco.TERRA_ARADA);
    if (blocoEm(alvo.x, alvo.y + 1, alvo.z) !== Bloco.AR)
      prever(id, alvo.x, alvo.y + 1, alvo.z, Bloco.AR);
    enviarTelemetria(true);
    enviar({ t: 'arar', id, x: alvo.x, y: alvo.y, z: alvo.z, slot: hotbar.ativo });
    tocarSom(motorAudio, 'quebra', 'terra');
    animador.evento('golpe');
    aplicarPlano('golpe', { ...alvo, bloco: Bloco.TERRA_ARADA });
    return true;
  }

  function alvoMineracao(): AlvoMineracao | null {
    const a = alvoDoQuadro();
    if (!a) return null;
    // spec 016: no bloco protegido a rachadura nem começa; segurando, o aviso diz de quem é
    const r = protecaoNaMira();
    if (r) {
      if (minerador.segurando) avisosProtecao.avisar(r);
      return null;
    }
    return { x: a.x, y: a.y, z: a.z, bloco: blocoEm(a.x, a.y, a.z) };
  }

  /**
   * Spec 016: o bloco da mira quebra? (null: quebra; senão, o porquê). Uma conta por bloco
   * mirado e por versão do mundo (a mira parada não custa nada).
   */
  let chaveProtecaoMira = '';
  let protecaoMira: RecusaProtecao | null = null;
  function protecaoNaMira(): RecusaProtecao | null {
    const a = alvoDoQuadro();
    if (!a) return null;
    const k = `${a.x},${a.y},${a.z},${edicoes.versaoGeral},${edicoes.donos.versao}`;
    if (k !== chaveProtecaoMira) {
      chaveProtecaoMira = k;
      protecaoMira = recusaQuebrar(regra, voce, a.x, a.y, a.z);
    }
    return protecaoMira;
  }

  function interagirComEventos(acao: AcaoInteracao): boolean {
    const a = calcularAlvo();
    if (!a) return false;
    const bloco = acao === 'quebrar' ? blocoEm(a.x, a.y, a.z) : hotbar.blocoAtivo();
    const pos = acao === 'quebrar' ? a : posicaoDeColocar(a);
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
      if (abreEFecha(alvoBloco)) {
        alternarPorta(a.x, a.y, a.z);
        return;
      }
      if (alvoBloco === Bloco.MESA_TRABALHO) {
        window.dispatchEvent(
          new CustomEvent('brumaluz:usar', {
            detail: { bloco: alvoBloco, x: a.x, y: a.y, z: a.z },
          }),
        );
        return;
      }
      // spec 016: o baú e a fornalha que alguém pôs abrem só para ele e para o dono do mundo
      const fechado = recusaConteiner(regra, voce, a.x, a.y, a.z);
      if (fechado) {
        barramento.emitir('recusa', { motivo: 'colocar' });
        recusarProtegido(fechado);
        return;
      }
      // baú e fornalha abrem quando o núcleo manda o conteúdo; a cama decide o sono lá
      pedirUso(a.x, a.y, a.z);
      return;
    }
    const p = hotbar.pilhaAtiva();
    const def = p ? obterItem(p.item) : undefined;
    const naMira = criaturaApontada();
    if (naMira?.morador) {
      // morador: abre as trocas da profissão dele (e ele vira para o jogador)
      const m = naMira.morador;
      window.dispatchEvent(
        new CustomEvent('brumaluz:trocar', {
          detail: {
            profissao: m.profissao,
            nome: nomeDoMorador(m.povoado, m.n, m.profissao),
            povoado: m.povoado,
            criatura: naMira.id,
          },
        }),
      );
      enviarTelemetria(true);
      enviar({ t: 'falar', criatura: naMira.id });
      tocarVoz(motorAudio, 'morador', 'contente', 1);
      return;
    }
    if (naMira && viraCriado(naMira.tipo) && comeEsse(naMira.tipo, p?.item)) {
      // spec 013: a comida do bicho na mão: dá a comida (os corações vêm do núcleo)
      tocarSom(motorAudio, 'comer');
      enviarTelemetria(true);
      enviar({ t: 'alimentar', criatura: naMira.id, slot: hotbar.ativo });
      return;
    }
    if (naMira && naMira.tipo === 'raposa' && p?.item === 'frutinhas' && !naMira.domada) {
      tocarSom(motorAudio, 'comer');
      enviarTelemetria(true);
      enviar({ t: 'domar', criatura: naMira.id, slot: hotbar.ativo });
      return;
    }
    if (def?.comida && modo === 'sobrevivencia') {
      // fome cheia: nem tenta (o núcleo confere de novo)
      if (cliente.sobrevivencia.fome < 20) enviar({ t: 'comer', slot: hotbar.ativo });
      return;
    }
    if (a && ehEnxada(def?.ferramenta)) {
      ararNaMira(a);
      return;
    }
    interagirComEventos('colocar');
  }

  /** Abre ou fecha a porta (e a metade de cima/baixo, se houver). */
  function alternarPorta(x: number, y: number, z: number): void {
    // prevê as duas metades na hora; o som vem com a confirmação do núcleo
    const b = blocoEm(x, y, z);
    const novo = alternado(b);
    const id = proximoId();
    // a porta continua de quem a colocou (sem previsão de dono)
    cliente.prever(id, x, y, z, novo, edicoes.obterMeta(x, y, z));
    for (const dy of [-1, 1]) {
      if (!ehPorta(b)) break;
      const v = blocoEm(x, y + dy, z);
      if (v === Bloco.PORTA || v === Bloco.PORTA_ABERTA)
        cliente.prever(id, x, y + dy, z, novo, edicoes.obterMeta(x, y + dy, z));
    }
    enviarTelemetria(true);
    enviar({ t: 'usar', id, x, y, z });
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
    // sem dano de queda herdado do lugar de onde veio
    j.topoQueda = undefined;
    // a câmera vai junto, sem atravessar o caminho, e o boneco chega de costas para ela
    orbita.encaixar();
    animador.definirYaw(camera.rotation.y);
  };
  estado.bloco = blocoEm;
  estado.meta = (x, y, z) => edicoes.obterMeta(x, y, z);
  estado.donoDoBloco = (x, y, z) => donoNaCelula(edicoes, x, y, z, donoDoMundo);
  estado.apelidoDoDono = (id) => apelidosVistos.get(id) ?? edicoes.donos.apelido(id);
  estado.voce = voce;
  estado.donoDoMundo = donoDoMundo;
  estado.definirBloco = (x, y, z, b, meta) => {
    if (valorEm(x, y, z) === empacotar(b, meta ?? 0)) return false;
    editarLote([{ x, y, z, v: empacotar(b, meta ?? 0) }]);
    return true;
  };
  /** Bloco original do terreno gerado (sem edições): distingue baú de ruína de baú posto. */
  estado.blocoGerado = (x, y, z) => {
    if (y < 0 || y >= ALTURA) return Bloco.AR;
    const cx = Math.floor(x / TAM_X);
    const cz = Math.floor(z / TAM_Z);
    return provedor.obter(cx, cz)[indice(x - cx * TAM_X, y, z - cz * TAM_Z)];
  };
  /** Dedo arrastando a câmera no toque (ela nunca gira sozinha enquanto isso). */
  let arrastandoCamera = false;
  /** Opacidade do boneco aplicada (só muda as malhas quando o degrau muda). */
  let opacidadeAplicada = 1;
  const reduzirMovimento =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** Configuração "câmera volta para trás sozinha" (Balanço ao andar). */
  let recentrarLigado = true;
  estado.camera = {
    distancia: () => orbita.ultimo()?.distancia ?? orbita.zoom(),
    zoom: () => orbita.zoom(),
    aproximar: (d) => orbita.aproximar(d),
    definirZoom: (d) => orbita.definirZoom(d),
    opacidadeBoneco: () => personagem.opacidade(),
    desviando: () => orbita.ultimo()?.desviando ?? false,
    posicao: () => [cameraVisao.position.x, cameraVisao.position.y, cameraVisao.position.z],
    pivo: () => {
      const p = pivoMira();
      return [p.x, p.y, p.z];
    },
    yawCorpo: () => animador.yaw(),
    arrastar: (ativo) => {
      arrastandoCamera = ativo;
    },
  };
  estado.alvoDoDedo = (x, y) => {
    const r = raioNaTela(x, y);
    const olhos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
    const a = mirarDaCamera(r.origem, r.direcao, olhos, ALCANCE_VER_LONGE, (bx, by, bz) =>
      ehAlvo(blocoEm(bx, by, bz)),
    );
    if (!a) return null;
    const t = Math.hypot(r.direcao.x, r.direcao.y, r.direcao.z) || 1;
    const p = {
      x: r.origem.x + (r.direcao.x / t) * a.distancia,
      y: r.origem.y + (r.direcao.y / t) * a.distancia,
      z: r.origem.z + (r.direcao.z / t) * a.distancia,
    };
    const distancia = Math.hypot(p.x - olhos.x, p.y - olhos.y, p.z - olhos.z);
    return { x: a.x, y: a.y, z: a.z, distancia, alcanca: !!alvoNoRaio(r, true) };
  };
  estado.telaDoPonto = (x, y, z) => {
    const motor = scene.getEngine();
    const w = motor.getRenderWidth();
    const h = motor.getRenderHeight();
    const v = Vector3.Project(
      new Vector3(x, y, z),
      Matrix.IdentityReadOnly,
      scene.getTransformMatrix(),
      cameraVisao.viewport.toGlobal(w, h),
    );
    if (v.z < 0 || v.z > 1) return null;
    const r = canvas.getBoundingClientRect();
    return { x: r.left + (v.x / w) * r.width, y: r.top + (v.y / h) * r.height };
  };
  /** Vira o olhar para o raio do centro da tela passar pelo ponto (o pivô muda com o olhar). */
  estado.mirarPonto = (ax, ay, az) => {
    let yaw = camera.rotation.y;
    let pitch = camera.rotation.x;
    for (let i = 0; i < 6; i++) {
      const s = orbita.seguido() ?? camera.position;
      const p = pivoCamera(s, yaw, pitch, bloqueiaCamera, LADO_OMBRO, orbita.alturaPivo());
      const dx = ax - p.x;
      const dy = ay - p.y;
      const dz = az - p.z;
      yaw = Math.atan2(dx, dz);
      pitch = -Math.atan2(dy, Math.hypot(dx, dz));
    }
    controle.apontar(yaw, pitch);
    raioToque = null;
    alvoMemoQuadro = -1;
  };
  estado.mirarBloco = (x, y, z, normal) => {
    const n = normal ?? { x: 0, y: 0, z: 0 };
    estado.mirarPonto!(x + 0.5 + n.x * 0.45, y + 0.5 + n.y * 0.45, z + 0.5 + n.z * 0.45);
    const a = calcularAlvo();
    if (!a || a.x !== x || a.y !== y || a.z !== z) return false;
    return !normal || (a.normal.x === n.x && a.normal.y === n.y && a.normal.z === n.z);
  };
  // roda do mouse no jogo: aproxima e afasta (na barra, ou com Shift, troca o item)
  canvas.addEventListener(
    'wheel',
    (e) => {
      if (e.shiftKey || estado.modoFoto?.ativo()) return;
      if (e.deltaY === 0) return;
      e.preventDefault();
      orbita.aproximar(passoDaRoda(e.deltaY, e.deltaMode));
    },
    { passive: false },
  );
  function atualizarCameraVisao(dt: number): void {
    const agora = performance.now();
    cameraVisao.rotation.copyFrom(camera.rotation);
    if (estado.modoFoto?.ativo()) {
      cameraVisao.position.copyFrom(fotoPosRef());
      orbita.encaixar();
      // na foto o boneco aparece inteiro
      if (opacidadeAplicada !== 1) {
        opacidadeAplicada = 1;
        personagem.definirOpacidade(1);
      }
      return;
    }
    // andando sem mexer na câmera, ela volta devagar para trás do boneco (nunca enquanto a
    // criança arrasta, minera ou constrói, nem com movimento reduzido)
    const v = animador.vista();
    const yaw = recentrarCamera({
      dt,
      tempo: agora / 1000,
      mexeuEm: controle.mexeuEm,
      arrastando: arrastandoCamera,
      velocidade: velocidadeHoriz,
      yaw: camera.rotation.y,
      yawCorpo: animador.yaw(),
      permitido: recentrarLigado && !reduzirMovimento && v.golpe === null && v.colocar === null,
    });
    if (yaw !== camera.rotation.y) {
      controle.recentrar(yaw);
      cameraVisao.rotation.y = yaw;
    }
    const r = orbita.quadro({
      dt,
      olhos: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      yaw: camera.rotation.y,
      pitch: camera.rotation.x,
      bloqueia: bloqueiaCamera,
    });
    cameraVisao.position.set(r.posicao.x, r.posicao.y, r.posicao.z);
    // perto demais: o boneco fica meio transparente (só troca quando o degrau muda)
    const op = degrauOpacidade(r.opacidade);
    if (op !== opacidadeAplicada) {
      opacidadeAplicada = op;
      personagem.definirOpacidade(op);
    }
  }
  Object.defineProperty(estado, 'slotAtivo', { get: () => hotbar.ativo, enumerable: true });
  barramento.ouvir('golpe', () => animador.evento('golpe'));
  // testes e capturas: dispara um movimento do boneco
  estado.animar = (e) => animador.evento(e);
  barramento.ouvir('colocacao', () => animador.evento('colocacao'));
  let slotNaMao = -1;
  let blocoNaMaoAtual = -1;
  let itemNaMaoAtual = '';
  /** Giro extra do corpo (só para capturas). */
  let giroCorpo = 0;
  let luzJogador = 1;
  /** Para onde o corpo vira minerando ou construindo: o bloco da mira (ou o olhar). */
  function yawDaAcao(): number | null {
    const v = animador.vista();
    if (v.golpe === null && v.colocar === null) return null;
    const j = controle.jogador;
    // o toque já soltou a mira: o corpo vira para o bloco tocado, não para o do centro
    const recente = alvoDoToque && performance.now() < alvoDoToque.ate ? alvoDoToque : null;
    const a = recente ?? alvoDoQuadro();
    if (a) {
      const dx = a.x + 0.5 - j.x;
      const dz = a.z + 0.5 - j.z;
      if (Math.hypot(dx, dz) > 0.45) return Math.atan2(dx, dz);
    }
    return camera.rotation.y;
  }
  function atualizarPersonagem(dt: number): void {
    const j = controle.jogador;
    // na tela de título (o panorama gira a câmera), o boneco fica de costas para ela: ao
    // começar a jogar, ele já está olhando para onde a criança olha
    if (document.body.classList.contains('tela-titulo')) animador.definirYaw(camera.rotation.y);
    const pose = animador.atualizar(dt, {
      velocidadeHoriz,
      correndo: corrida,
      noChao: j.noChao,
      voando: !!j.voando,
      // movimento com vida (spec 015): o corpo vira para onde anda, solto da câmera
      vx: velX,
      vz: velZ,
      alvoYaw: yawDaAcao(),
      olharYaw: camera.rotation.y,
    });
    const foto = !!estado.modoFoto?.ativo();
    // no modo foto o corpo aparece quando a câmera livre se afasta dos olhos
    const longeDosOlhos = foto && Vector3.Distance(fotoPosRef(), camera.position) > 1.2;
    personagem.definirVisivel(foto ? longeDosOlhos : true);
    const blocoMao = hotbar.blocoAtivo();
    const itemMao = hotbar.pilhaAtiva()?.item ?? '';
    if (hotbar.ativo !== slotNaMao || blocoMao !== blocoNaMaoAtual || itemMao !== itemNaMaoAtual) {
      itemNaMaoAtual = itemMao;
      slotNaMao = hotbar.ativo;
      blocoNaMaoAtual = blocoMao;
      const pilhaMao = hotbar.pilhaAtiva();
      personagem.definirNaMao(blocoMao || null, !blocoMao && pilhaMao ? pilhaMao.item : null);
    }
    personagem.aplicarPose(pose, {
      dt,
      // a cabeça do próprio boneco acompanha só um pouco o sobe e desce da câmera
      olhar: camera.rotation.x * 0.5,
      vista: animador.vista(),
    });
    personagem.posicionar(j.x, j.y, j.z, animador.yaw() + giroCorpo);
    gestos?.atualizar(dt); // spec 015: balão do gesto
    // estimativa de luz no jogador: teto opaco acima = caverna (escurece braço e corpo)
    const ex = Math.floor(camera.position.x);
    const ey = Math.floor(camera.position.y);
    const ez = Math.floor(camera.position.z);
    // varre o teto só quando o jogador muda de bloco (ou a cada ~0,5 s, por edições)
    tetoContador++;
    if (ex !== tetoX || ey !== tetoY || ez !== tetoZ || tetoContador > 30) {
      tetoX = ex;
      tetoY = ey;
      tetoZ = ez;
      tetoContador = 0;
      tetoCoberto = false;
      for (let y = ey + 1; y < Math.min(ALTURA, ey + 48) && !tetoCoberto; y++) {
        if (obterBlocoDef(blocoEm(ex, y, ez))?.opaco) tetoCoberto = true;
      }
    }
    const coberto = tetoCoberto;
    jogadorCoberto = coberto && ey < 55;
    const alvoLuz = coberto ? (ey < 55 ? 0.22 : 0.55) : 1;
    luzJogador += (alvoLuz - luzJogador) * Math.min(1, dt * 3);
    personagem.definirLuz(luzJogador * (0.45 + 0.55 * luzDia));
  }
  let tetoX = NaN;
  let tetoY = NaN;
  let tetoZ = NaN;
  let tetoContador = 0;
  let tetoCoberto = false;
  estado.personagem = {
    aparencia: () => ({ ...aparencia }),
    definir: (parcial) => {
      aparencia = normalizarAparencia({ ...aparencia, ...parcial });
      personagem.aplicarAparencia(aparencia);
      // os amigos no mesmo mundo passam a ver a aparência nova
      enviar({ t: 'aparencia', aparencia: { ...aparencia } as Record<string, unknown> });
    },
    visivel: () => ({ corpo: personagem.raiz.isEnabled() && !estado.modoFoto?.ativo() }),
    malhas: () => personagem.contarMalhas(),
    malhasMao: () => personagem.contarMalhasMao(),
    pose: () => animador.pose(),
    maoBloco: () => hotbar.blocoAtivo() || null,
    corpo: () => animador.corpo(),
    nomeExibido: () => aparencia.nome || rotuloDoModelo(aparencia),
    girarCorpo: (rad: number) => {
      giroCorpo = rad;
    },
    desenho: () => {
      const ms = personagem.raiz.getChildMeshes(false).filter((m) => m.isEnabled());
      return {
        malhas: ms.length,
        transparentes: ms.filter((m) => m.material?.needAlphaBlendingForMesh(m)).length,
        menorVisibilidade: Math.min(1, ...ms.map((m) => m.visibility)),
      };
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
      liberarOcultos(k);
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
      // ícones de brinquedo desenhados dos modelos 3D, poucos por quadro
      if (!pararIcones) pararIcones = gerarIconesBrinquedo(atlas, definirIconesBrinquedo);
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
  // efeitos de brinquedo (spec 012): cada vaga tem uma pecinha de plástico com pino (lasca
  // do bloco) e um confete achatado; acende a que o tipo da partícula pede
  const pecasParticulas: { peca: Mesh; pino: Mesh; confete: Mesh; gota: Mesh }[] = [];
  const matsParticulas: StandardMaterial[] = [];
  for (let i = 0; i < pool.capacidade; i++) {
    const mat = new StandardMaterial(`particula-mat-${i}`, scene);
    mat.specularColor = new Color3(0.3, 0.3, 0.3);
    mat.specularPower = 40;
    mat.emissiveColor = Color3.Black();
    mat.ambientColor = Color3.White();
    const peca = caixaArredondada(`particula-${i}`, scene, 0.14, 0.09, 0.14, 0.03, mat, 2);
    const pino = cilindro(`particula-pino-${i}`, scene, 0.035, 0.035, 0.035, mat);
    pino.parent = peca;
    pino.position.y = 0.06;
    const confete = caixaArredondada(
      `particula-confete-${i}`,
      scene,
      0.1,
      0.012,
      0.065,
      0.005,
      mat,
      1,
    );
    // gotinha: bolinha de água (respingo e chuva)
    const gota = esfera(`particula-gota-${i}`, scene, 0.055, mat, [1, 1.25, 1]);
    for (const m of [peca, pino, confete, gota]) {
      m.setEnabled(false);
      prepararEfeito(m);
    }
    pecasParticulas.push({ peca, pino, confete, gota });
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
      true,
      false,
      Texture.TRILINEAR_SAMPLINGMODE,
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
  /** Para o gerador de ícones de brinquedo (se a cena fechar antes do fim). */
  let pararIcones: (() => void) | null = null;

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
  const coracoes = criarCoracoes(scene, prepararEfeito);
  estado.coracoes = () => coracoes.vivos;
  barramento.ouvir('golpe', (d) => aplicarPlano('golpe', d));
  barramento.ouvir('quebra', (d) => aplicarPlano('quebra', d));
  /** Confete de folhinhas (e grãos dourados) ao colher a planta madura. */
  function festaDaColheita(x: number, y: number, z: number): void {
    const cores: [number, number, number][] = [
      [0.42, 0.72, 0.25],
      [0.55, 0.82, 0.3],
      [0.3, 0.6, 0.2],
      [0.95, 0.8, 0.3],
    ];
    pool.emitir(
      Array.from({ length: 16 }, (_, i) => {
        const ang = (i / 16) * Math.PI * 2 + rngFx() * 0.5;
        const v = 1.2 + rngFx() * 1.4;
        return {
          x: x + 0.5,
          y: y + 0.5,
          z: z + 0.5,
          vx: Math.cos(ang) * v,
          vy: 2.5 + rngFx() * 2,
          vz: Math.sin(ang) * v,
          cor: cores[i % cores.length],
          tipo: CONFETE,
        };
      }),
    );
  }
  /** Brilhinho dourado subindo quando a planta fica madura perto do jogador. */
  /**
   * Muitos pés amadurecem no mesmo passo numa lavoura grande: um som de brilho a cada
   * 0,4 s no máximo (antes eram dezenas de sons por cima uns dos outros) e até 12 brilhos
   * nesse intervalo (cada pé o seu, até o teto).
   */
  const brilhosMadura = { janela: -Infinity, som: false, brilhos: 0 };
  function brilhoDeMadura(x: number, y: number, z: number): void {
    const d = Math.hypot(x + 0.5 - camera.position.x, z + 0.5 - camera.position.z);
    if (d > 24) return;
    const agora = performance.now();
    if (agora - brilhosMadura.janela >= 400) {
      brilhosMadura.janela = agora;
      brilhosMadura.som = false;
      brilhosMadura.brilhos = 0;
    }
    if (brilhosMadura.brilhos >= 12) return;
    brilhosMadura.brilhos++;
    pool.emitir(
      Array.from({ length: 8 }, () => ({
        x: x + 0.2 + rngFx() * 0.6,
        y: y + 0.6 + rngFx() * 0.4,
        z: z + 0.2 + rngFx() * 0.6,
        vx: (rngFx() - 0.5) * 0.4,
        vy: 1 + rngFx() * 0.8,
        vz: (rngFx() - 0.5) * 0.4,
        cor: [1, 0.88, 0.35] as [number, number, number],
        tipo: CONFETE,
      })),
    );
    if (d < 12 && !brilhosMadura.som) {
      brilhosMadura.som = true;
      tocarSom(motorAudio, 'coleta');
    }
  }
  barramento.ouvir('quebra', (d) => {
    // colher não continua cavando: segurar depois da planta não leva a terra arada junto
    if (ehLavoura(d.bloco)) minerador.soltar();
    if (madura(d.bloco)) {
      festaDaColheita(d.x, d.y, d.z);
      tocarSom(motorAudio, 'coleta');
    }
  });
  // quebrar meia porta leva a outra metade
  const replicaItens = cliente.itens;
  const renderItens = criarRenderItens(scene, atlas, textura, iconeDoItem, (m) =>
    glow.addExcludedMesh(m),
  );
  let coletaAcumulada = new Map<string, number>();
  let timerColeta: ReturnType<typeof setTimeout> | null = null;
  function coletou(item: string, qtd: number): void {
    coletaAcumulada.set(item, (coletaAcumulada.get(item) ?? 0) + qtd);
    tocarSom(motorAudio, 'coleta');
    window.dispatchEvent(new CustomEvent('brumaluz:coletou', { detail: { item, qtd } }));
    if (timerColeta) clearTimeout(timerColeta);
    timerColeta = setTimeout(() => {
      for (const [it, q] of coletaAcumulada) {
        window.dispatchEvent(
          new CustomEvent('brumaluz:toast', { detail: `+${q} ${obterItem(it)?.nome ?? it}` }),
        );
      }
      coletaAcumulada = new Map();
    }, 350);
  }
  function atualizarItens(dt: number, tempo: number): void {
    replicaItens.atualizar(dt);
    renderItens.atualizar(replicaItens.lista, tempo);
    estado.itensSoltos = replicaItens.lista.length;
  }
  estado.soltarItem = (item, qtd, x, y, z, dur) =>
    enviar({ t: 'soltar', itens: [{ item, qtd, dur }], x, y, z });
  estado.jogarItem = (item, qtd, dur, slot) => {
    if (!(qtd > 0)) return;
    const j = controle.jogador;
    enviar({
      t: 'soltar',
      itens: [{ item, qtd, ...(dur !== undefined ? { dur } : {}) }],
      x: j.x,
      y: j.y + 1.2,
      z: j.z,
      // para onde o boneco olha (na terceira pessoa o corpo é solto da câmera)
      jogar: { yaw: animador.yaw(), ...(slot !== undefined ? { slot } : {}) },
    });
    tocarSom(motorAudio, 'troca');
  };
  estado.itensNoChao = () =>
    replicaItens.lista.map((i) => ({ item: i.item, qtd: i.qtd, x: i.x, y: i.y, z: i.z }));
  barramento.ouvir('colocacao', (d) => aplicarPlano('colocacao', d));

  /**
   * Bloco provisório: aparece no mesmo quadro do clique (o worker leva alguns quadros
   * para refazer a malha). Usa o material do mundo, assenta de 85% a 100% e some quando
   * a malha definitiva do chunk chega.
   */
  const DURACAO_ASSENTAR = 0.14;
  const provisorios: { malha: Mesh; k: string; t: number; pronto: boolean }[] = [];
  const FACES_PROVISORIO: FaceBloco[] = ['frente', 'lado', 'lado', 'lado', 'topo', 'base'];
  const TONS_PROVISORIO = [0.85, 0.85, 0.85, 0.85, 1, 0.6];
  function blocoProvisorio(x: number, y: number, z: number, bloco: number): void {
    const def = obterBlocoDef(bloco);
    if (!def || def.planta || def.forma || def.liquido) return; // só cubos inteiros
    const faceUV = FACES_PROVISORIO.map((f) => {
      const uv = atlas.uvDaFace(bloco, f) ?? atlas.uvDoBloco(bloco);
      return uv ? new Vector4(uv.u0, uv.v1, uv.u1, uv.v0) : new Vector4(0, 0, 1, 1);
    });
    const m = MeshBuilder.CreateBox(
      'provisorio',
      {
        size: 1.002,
        faceUV,
        faceColors: TONS_PROVISORIO.map((t) => new Color4(t, t, t, 1)),
      },
      scene,
    );
    // luz estimada: céu aberto acima = dia pleno; coberto = penumbra (dura poucos quadros)
    const ceu = ceuAberto(x, y + 1, z) ? 1 : jogadorCoberto ? 0.15 : 0.55;
    const n = m.getTotalVertices();
    const luz = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) luz[i * 2] = ceu;
    m.setVerticesData('luz', luz, false, 2);
    m.hasVertexAlpha = false;
    m.material = matSolido;
    m.position.set(x + 0.5, y + 0.5, z + 0.5);
    m.scaling.setAll(0.85);
    m.isPickable = false;
    glow.addExcludedMesh(m);
    provisorios.push({
      malha: m,
      k: chave(Math.floor(x / TAM_X), Math.floor(z / TAM_Z)),
      t: 0,
      pronto: false,
    });
  }
  barramento.ouvir('colocacao', (d) => blocoProvisorio(d.x, d.y, d.z, d.bloco));
  function atualizarProvisorios(dt: number): void {
    for (let i = provisorios.length - 1; i >= 0; i--) {
      const p = provisorios[i];
      p.t += dt;
      const f = Math.min(1, p.t / DURACAO_ASSENTAR);
      // ease-out com leve passada do tamanho final
      const e = 1 - (1 - f) * (1 - f);
      p.malha.scaling.setAll(0.85 + 0.15 * e + Math.sin(f * Math.PI) * 0.03);
      if ((p.pronto && f >= 1) || p.t > 3) {
        p.malha.dispose();
        provisorios.splice(i, 1);
      }
    }
  }

  // rodinhas de onda na superfície (entrar na água, gota de chuva caindo)
  const matRoda = new StandardMaterial('roda-agua', scene);
  matRoda.disableLighting = true;
  matRoda.emissiveColor = new Color3(0.95, 0.98, 1);
  matRoda.alpha = 0.8;
  const rodas: { m: Mesh; t: number; tam: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const m = MeshBuilder.CreateTorus(
      `roda-agua-${i}`,
      { diameter: 1, thickness: 0.07, tessellation: 28 },
      scene,
    );
    m.material = matRoda.clone(`roda-agua-mat-${i}`);
    m.scaling.y = 0.25;
    m.setEnabled(false);
    prepararEfeito(m);
    rodas.push({ m, t: 1, tam: 1 });
  }
  let proximaRoda = 0;
  function soltarRoda(x: number, y: number, z: number, tam = 1): void {
    const r = rodas[proximaRoda++ % rodas.length];
    r.m.position.set(x, y + 0.02, z);
    r.t = 0;
    r.tam = tam;
    r.m.setEnabled(true);
  }
  /** Respingo de gotinhas redondas e uma roda de ondinhas onde o boneco cai na água. */
  function respingo(x: number, y: number, z: number, forca: number): void {
    const n = Math.round(6 + forca * 8);
    const lista = [];
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + rngFx() * 0.6;
      const v = 0.8 + rngFx() * 1.2 * forca;
      lista.push({
        x: x + Math.cos(ang) * 0.25,
        y: y + 0.05,
        z: z + Math.sin(ang) * 0.25,
        vx: Math.cos(ang) * v,
        vy: 2.4 + rngFx() * 2.2 * forca,
        vz: Math.sin(ang) * v,
        cor: [0.62, 0.86, 1] as [number, number, number],
        tipo: GOTA,
      });
    }
    pool.emitir(lista);
    soltarRoda(x, y, z, 1 + forca * 0.6);
    if (forca > 0.5) setTimeout(() => soltarRoda(x, y, z, 0.7), 180);
  }
  /** Intensidade da chuva que respinga agora (0 sem chuva). */
  let chuvaRespingos = 0;
  let acumuloRespingo = 0;
  function respingosDeChuva(dt: number): void {
    if (chuvaRespingos <= 0.02) return;
    acumuloRespingo += dt * chuvaRespingos * 28;
    const j = controle.jogador;
    while (acumuloRespingo >= 1) {
      acumuloRespingo -= 1;
      const x = j.x + (rngFx() - 0.5) * 18;
      const z = j.z + (rngFx() - 0.5) * 18;
      const fx = Math.floor(x);
      const fz = Math.floor(z);
      let y = Math.floor(j.y) + 12;
      const fim = Math.floor(j.y) - 10;
      while (y > fim && blocoEm(fx, y, fz) === Bloco.AR) y--;
      if (y <= fim) continue;
      const b = blocoEm(fx, y, fz);
      if (b === Bloco.AGUA) soltarRoda(x, y + 0.875, z, 0.38);
      else if (obterBlocoDef(b)?.solido)
        pool.emitir(
          [0, 1].map((k) => ({
            x,
            y: y + 1.02,
            z,
            vx: (k ? 1 : -1) * (0.3 + rngFx() * 0.4),
            vy: 1.4 + rngFx() * 0.6,
            vz: (rngFx() - 0.5) * 0.6,
            cor: [0.7, 0.86, 1] as [number, number, number],
            tipo: GOTA,
          })),
        );
    }
  }
  let pesNaAgua = false;
  let pingando = 0;
  function atualizarAguaDoBoneco(dt: number): void {
    const j = controle.jogador;
    const fx = Math.floor(j.x);
    const fz = Math.floor(j.z);
    const fy = Math.floor(j.y + 0.05);
    const agora = blocoEm(fx, fy, fz) === Bloco.AGUA;
    if (agora !== pesNaAgua) {
      // altura da superfície: sobe até achar o topo da água
      let sy = fy;
      while (sy < fy + 4 && blocoEm(fx, sy + 1, fz) === Bloco.AGUA) sy++;
      const superficie = sy + (blocoEm(fx, sy + 1, fz) === Bloco.AGUA ? 1 : 0.875);
      if (agora) respingo(j.x, superficie, j.z, Math.min(1, Math.abs(j.vy) / 10));
      else pingando = 0.9;
      pesNaAgua = agora;
    }
    // ao sair, o boneco pinga por um instante
    if (pingando > 0) {
      pingando -= dt;
      if (rngFx() < dt * 14)
        pool.emitir([
          {
            x: j.x + (rngFx() - 0.5) * 0.4,
            y: j.y + 0.6 + rngFx() * 0.6,
            z: j.z + (rngFx() - 0.5) * 0.4,
            vx: 0,
            vy: -0.5,
            vz: 0,
            cor: [0.62, 0.86, 1],
            tipo: GOTA,
          },
        ]);
    }
  }
  estado.respingo = (x, y, z, forca = 1) => respingo(x, y, z, forca);

  function atualizarEfeitos(dt: number): void {
    atualizarAguaDoBoneco(dt);
    respingosDeChuva(dt);
    for (const r of rodas) {
      if (r.t >= 1) continue;
      r.t = Math.min(1, r.t + dt / 0.9);
      const e = (0.25 + r.t * 1.35) * r.tam;
      r.m.scaling.set(e, 0.25, e);
      (r.m.material as StandardMaterial).alpha = 0.8 * (1 - r.t) * (1 - r.t);
      if (r.t >= 1) r.m.setEnabled(false);
    }
    pool.atualizar(dt, (x, y, z) => !!obterBlocoDef(blocoEm(x, y, z))?.solido);
    coracoes.atualizar(dt);
    const vivas = pool.vivas();
    for (let i = 0; i < pecasParticulas.length; i++) {
      const { peca, pino, confete, gota } = pecasParticulas[i];
      if (i >= vivas) {
        if (peca.isEnabled()) peca.setEnabled(false);
        if (confete.isEnabled()) confete.setEnabled(false);
        if (gota.isEnabled()) gota.setEnabled(false);
        continue;
      }
      const tipo = pool.tipos[i];
      const ehConfete = tipo === CONFETE;
      const ehGota = tipo === GOTA;
      const m = ehGota ? gota : ehConfete ? confete : peca;
      for (const outra of [peca, confete, gota])
        if (outra !== m && outra.isEnabled()) outra.setEnabled(false);
      if (!m.isEnabled()) m.setEnabled(true);
      if (!pino.isEnabled()) pino.setEnabled(true);
      matsParticulas[i].alpha = ehGota ? 0.75 : 1;
      m.position.set(pool.posicoes[i * 3], pool.posicoes[i * 3 + 1], pool.posicoes[i * 3 + 2]);
      const idade = pool.idades[i];
      const sem = pool.sementes[i] * Math.PI * 2;
      if (ehGota) {
        m.rotation.set(0, 0, 0);
      } else if (ehConfete) {
        // confete rodopia e balança enquanto plana
        m.rotation.set(
          Math.sin(idade * 9 + sem) * 1.3,
          idade * 4 + sem,
          Math.cos(idade * 7 + sem) * 1.1,
        );
      } else {
        // pecinha capota no ar e assenta
        m.rotation.set(sem + idade * (5 + sem), sem * 0.7, idade * 3);
      }
      // encolhe no fim da vida em vez de sumir de repente
      const vida = idade / vidaDe(pool.tipos[i]);
      m.scaling.setAll(vida < 0.6 ? 1 : Math.max(0.05, 1 - (vida - 0.6) / 0.4));
      // plástico colorido com piso de luz (como o boneco); escurece na caverna e à noite
      const lp = luzJogador * (0.45 + 0.55 * luzDia);
      const r = pool.cores[i * 3];
      const g = pool.cores[i * 3 + 1];
      const b = pool.cores[i * 3 + 2];
      matsParticulas[i].diffuseColor.set(r * lp * 0.78, g * lp * 0.78, b * lp * 0.78);
      matsParticulas[i].emissiveColor.set(r * lp * 0.36, g * lp * 0.36, b * lp * 0.36);
    }
    estado.fx = { particulas: vivas };

    const est = minerador.estado;
    const r = estadoRachadura(est.chaveAtual, minerador.progresso);
    if (r.visivel && est.chaveAtual) {
      const [x, y, z] = est.chaveAtual.split(',').map(Number);
      // a rachadura veste a forma real do bloco (laje, tocha, planta), não um cubo flutuando
      const c = caixaVisual(x, y, z);
      caixaRachadura.position.set(
        x + (c[0] + c[3]) / 2,
        y + (c[1] + c[4]) / 2,
        z + (c[2] + c[5]) / 2,
      );
      caixaRachadura.scaling.set(c[3] - c[0], c[4] - c[1], c[5] - c[2]);
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

  let contorno: Mesh | null = null;
  let chaveContorno = '';
  /** Caixa visível do bloco (união das caixas de laje, escada, tocha; planta mais estreita). */
  function caixaVisual(x: number, y: number, z: number): CaixaLocal {
    const b = blocoEm(x, y, z);
    const def = obterBlocoDef(b);
    if (!def) return CUBO;
    if (def.planta) return [0.18, 0, 0.18, 0.82, 0.85, 0.82];
    const caixas = caixasDoBloco(b, edicoes.obterMeta(x, y, z), (dd) => {
      const [dx, dz] = vetorDirecao(dd);
      return cercaConecta(blocoEm(x + dx, y, z + dz));
    });
    if (!caixas || caixas.length === 0) return CUBO;
    const u = [1, 1, 1, 0, 0, 0];
    for (const c of caixas) {
      for (let i = 0; i < 3; i++) u[i] = Math.min(u[i], c[i]);
      for (let i = 3; i < 6; i++) u[i] = Math.max(u[i], c[i]);
    }
    return u as unknown as CaixaLocal;
  }

  const matDestaque = new StandardMaterial('destaque-mat', scene);
  matDestaque.disableLighting = true;
  matDestaque.emissiveColor = new Color3(...COR_DESTAQUE)
    .scale(0.35)
    .add(new Color3(0.65, 0.65, 0.65));
  matDestaque.alpha = 0.17;
  matDestaque.backFaceCulling = true;
  /**
   * No toque o contorno só aparece com o dedo na tela: mais forte (o dobro) e mais claro,
   * para a criança pequena ver na hora qual peça o dedo pegou.
   */
  const matDestaqueDedo = new StandardMaterial('destaque-dedo-mat', scene);
  matDestaqueDedo.disableLighting = true;
  matDestaqueDedo.emissiveColor = new Color3(...COR_DESTAQUE)
    .scale(0.55)
    .add(new Color3(0.5, 0.5, 0.5));
  matDestaqueDedo.alpha = 0.36;
  matDestaqueDedo.backFaceCulling = true;
  /**
   * Spec 016: o bloco que não quebra ganha um contorno de mel (quente, nada de vermelho de
   * "erro") e o cadeadinho; a criança entende antes de bater.
   */
  const COR_TRANCADO = new Color3(1, 0.74, 0.3);
  const matTrancado = new StandardMaterial('destaque-trancado-mat', scene);
  matTrancado.disableLighting = true;
  matTrancado.emissiveColor = COR_TRANCADO.scale(0.75).add(new Color3(0.2, 0.2, 0.2));
  matTrancado.alpha = 0.22;
  matTrancado.backFaceCulling = true;
  const matTrancadoDedo = new StandardMaterial('destaque-dedo-trancado-mat', scene);
  matTrancadoDedo.disableLighting = true;
  matTrancadoDedo.emissiveColor = COR_TRANCADO.scale(0.85).add(new Color3(0.15, 0.15, 0.15));
  matTrancadoDedo.alpha = 0.4;
  matTrancadoDedo.backFaceCulling = true;
  const cadeado = criarCadeado();
  estado.cadeado = { visivel: false, x: 0, y: 0 };
  estado.protecaoNaMira = () => protecaoNaMira();
  /**
   * O cadeado aparece no que não quebra e também não se usa (a porta da vila abre: com
   * cadeado ela parecia trancada). O baú e a fornalha que não abrem ganham cadeado.
   */
  function trancadoNaMira(a: { x: number; y: number; z: number }): boolean {
    if (!protecaoNaMira()) return false;
    const b = blocoEm(a.x, a.y, a.z);
    if (ehConteiner(b)) return recusaConteiner(regra, voce, a.x, a.y, a.z) !== null;
    return !INTERATIVOS.has(b);
  }
  const pontoCadeado = new Vector3();
  /** Onde o cadeado vai na tela: ao lado da mira, ou em cima do bloco que o dedo pegou. */
  function posicionarCadeado(a: { x: number; y: number; z: number }, toque: boolean): void {
    let px: number;
    let py: number;
    if (toque) {
      const w = engine.getRenderWidth();
      const h = engine.getRenderHeight();
      pontoCadeado.set(a.x + 0.5, a.y + 1.2, a.z + 0.5);
      const p = Vector3.Project(
        pontoCadeado,
        Matrix.IdentityReadOnly,
        scene.getTransformMatrix(),
        cameraVisao.viewport.toGlobal(w, h),
      );
      const r = canvas.getBoundingClientRect();
      px = r.left + (p.x * r.width) / w;
      py = r.top + (p.y * r.height) / h;
    } else {
      px = window.innerWidth / 2 + 17;
      py = window.innerHeight / 2 - 15;
    }
    cadeado.mostrar(px, py);
    estado.cadeado = { visivel: true, x: px, y: py };
  }
  let alvoDestacado: { x: number; y: number; z: number } | null = null;
  const d0 = (a: { x: number; y: number; z: number } | null) =>
    a ? { x: a.x, y: a.y, z: a.z } : null;
  estado.destaque = () => alvoDestacado;
  function atualizarDestaque(): void {
    // no modo foto a mira não marca bloco (a foto sai limpa); no toque só o dedo marca: sem
    // dedo na tela, nada de contorno no bloco do centro (a criança toca onde quer, e o
    // contorno no meio fazia parecer que o toque ia para lá)
    const toqueAtivo = document.body.classList.contains('toque-ativo');
    const semMarca = !!estado.modoFoto?.ativo() || (pontoToque === null && toqueAtivo);
    const alvo = semMarca ? null : alvoDoQuadro();
    alvoDestacado = d0(alvo);
    const d = estadoDestaque(alvo, alvo ? caixaVisual(alvo.x, alvo.y, alvo.z) : CUBO);
    if (d.chave !== chaveContorno) {
      contorno?.dispose();
      contorno = null;
      chaveContorno = d.chave;
      if (d.visivel && alvo) {
        // contorno de brinquedo: uma casca arredondada clara e translúcida em volta do bloco
        // (como a peça escolhida brilhando), em vez das linhas finas de um pixel
        const c = caixaVisual(alvo.x, alvo.y, alvo.z);
        const folga = 0.035;
        const w = c[3] - c[0] + folga * 2;
        const h = c[4] - c[1] + folga * 2;
        const p = c[5] - c[2] + folga * 2;
        const l = caixaArredondada(
          'destaque',
          scene,
          w,
          h,
          p,
          Math.min(0.16, Math.min(w, h, p) * 0.3),
          toqueAtivo ? matDestaqueDedo : matDestaque,
          3,
        );
        l.position.set(
          alvo.x + (c[0] + c[3]) / 2,
          alvo.y + (c[1] + c[4]) / 2,
          alvo.z + (c[2] + c[5]) / 2,
        );
        l.isPickable = false;
        l.receiveShadows = false;
        l.renderingGroupId = 0;
        glow.addExcludedMesh(l);
        contorno = l;
      }
    }
    const trancado = !!alvo && contorno !== null && trancadoNaMira(alvo);
    if (contorno)
      contorno.material = toqueAtivo
        ? trancado
          ? matTrancadoDedo
          : matDestaqueDedo
        : trancado
          ? matTrancado
          : matDestaque;
    if (trancado) posicionarCadeado(alvo!, toqueAtivo);
    else if (cadeado.visivel) {
      cadeado.esconder();
      estado.cadeado = { visivel: false, x: 0, y: 0 };
    }
    estado.destaqueVisivel = contorno !== null;
  }

  // Áudio: o contexto só nasce no primeiro gesto do jogador.
  // o toque em "Entrar" (jogar com amigos) já preparou o som: o motor usa o mesmo contexto
  const motorAudio = criarMotorAudio(
    () => (contextoPreparado() ?? new AudioContext()) as unknown as ContextoAudio,
  );
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
  /** Renascer pedido e o teletransporte para a cama ainda não chegou (até 3 s). */
  let renascerPedidoEm = -1;
  let fisicaRodou = true;
  const esperandoRenascer = () =>
    renascerPedidoEm >= 0 && performance.now() - renascerPedidoEm < 3000;
  let configAtual: Config | null = null;
  manterAudioDesbloqueado(document, motorAudio);
  let somLigado = false;
  const ligarSom = {
    ativar: async () => {
      if (somLigado) return;
      await motorAudio.ativar();
      if (motorAudio.estado !== 'ativo' || somLigado) return;
      somLigado = true;
      tocarSom(motorAudio, 'entrada');
      aquecerAmostras(motorAudio, GRUPOS_MATERIAL);
      ambiente = iniciarAmbiente(motorAudio);
      if (configAtual)
        ambiente.definirVolumes(configAtual.volumeMusica, configAtual.volumeAmbiente);
    },
  };
  ativarNoPrimeiroGesto(document, ligarSom);
  // entrou por "Entrar" com o som já destravado: liga sem esperar outro toque
  if (contextoPreparado()) void ligarSom.ativar().catch(() => undefined);
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
    velX = dt > 0 ? (j.x - ultimoX) / dt : 0;
    velZ = dt > 0 ? (j.z - ultimoZ) / dt : 0;
    // teleporte não é andar
    if (vel > 40) velX = velZ = 0;
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
      if (ev === 'pulo') pulos++;
    }
    const grupo = grupoDoBloco(blocoSobPes(j, blocoEm)) ?? 'terra';
    for (const ev of eventos) {
      tocarSom(motorAudio, ev, grupo);
    }
  }

  // tempo da lógica do quadro na linha principal (fora o desenho), média móvel em ms
  let logicaMs = 0;
  Object.defineProperty(estado, 'logicaQuadroMs', { get: () => logicaMs, enumerable: true });
  engine.runRenderLoop(() => {
    const inicioQuadro = performance.now();
    quadroAtual++;
    const dtBruto = engine.getDeltaTime() / 1000;
    const dtQuadro = Math.min(dtBruto, DT_MAXIMO_QUADRO);
    const fotoAtiva = !!estado.modoFoto?.ativo();
    // desmaiado (ou esperando o teletransporte do renascer): o corpo não anda
    fisicaRodou = !(modo === 'sobrevivencia' && (sobrevivenciaMorto() || esperandoRenascer()));
    if (fisicaRodou) controle.atualizar(fotoAtiva ? 0 : dtBruto);
    quadroFotoRef?.(Math.min(dtBruto, 0.1));
    quadroSobrevivencia?.(Math.min(dtBruto, 0.1));
    atualizarSomMovimento(Math.min(dtBruto, 0.05));
    // a câmera segue o boneco antes da mira: o alvo do quadro é o que a criança vê
    atualizarCameraVisao(Math.min(dtBruto, 0.1));
    if (pontoToque) mirarToque(pontoToque.x, pontoToque.y);
    verificarSlot();
    // o que as telas mexeram nos itens vira transação para o núcleo
    sincronia.verificar();
    minerador.atualizar(dtQuadro, alvoMineracao());
    atualizarChunks();
    atualizarDestaque();
    // partículas e pulsos seguem o tempo real (com teto), mesmo com poucos FPS
    atualizarEfeitos(Math.min(dtBruto, 0.25));
    atualizarProvisorios(Math.min(dtBruto, 0.25));
    atualizarPersonagem(dtQuadro);
    estado.fps = engine.getFps();
    estado.posicao = [camera.position.x, camera.position.y, camera.position.z];
    estado.rotacao = [camera.rotation.x, camera.rotation.y];
    const tempo = performance.now() / 1000;
    if (!estado.pausarDia) hora = normalizarHora(hora + dtBruto / DURACAO_DIA);
    aplicarAtmosfera(tempo, dtBruto);
    atualizarItens(dtQuadro, tempo);
    quadroCriaturas?.(dtQuadro, tempo);
    outrosJogadores.atualizar(dtQuadro, Math.max(0.2, luzJogador * (0.45 + 0.55 * luzDia)));
    quadroConstrucao?.(tempo);
    balanco.atualizar(tempo);
    logicaMs += (performance.now() - inicioQuadro - logicaMs) * 0.05;
    scene.render();
  });
  let escalaMinima = 1;
  // celular: até a densidade da tela (correção da 017), na qualidade alta ou ultra; a nitidez
  // extra cai sozinha quando faltam quadros. Baixa e média seguem com menos pixels.
  const baseDaTela = () => {
    const b = escalaBase(window.innerWidth, window.devicePixelRatio || 1, toqueGrosso);
    return b < 1 && escalaMinima <= 1 ? b : Math.max(b, escalaMinima);
  };
  let base = baseDaTela();
  function aplicarEscala(valor: number): void {
    estado.escalaResolucao = valor;
    engine.setHardwareScalingLevel(valor);
    engine.resize();
  }
  aplicarEscala(Math.max(base, base < 1 ? ESCALA_INICIO_TOQUE : base));
  // Cada troca de escala recria os render targets (pós e glow) e dá uma travada:
  // só troca depois de duas leituras seguidas pedindo a mesma direção.
  let pedidoEscala = 0;
  setInterval(() => {
    if (!estado.ready) return;
    const nova = ajustarEscala(estado.escalaResolucao, estado.fps, base);
    const direcao = Math.sign(nova - estado.escalaResolucao);
    if (direcao === 0) {
      pedidoEscala = 0;
      return;
    }
    if (pedidoEscala === direcao) {
      pedidoEscala = 0;
      aplicarEscala(nova);
    } else pedidoEscala = direcao;
  }, 2000);
  window.addEventListener('resize', () => {
    const anterior = base;
    base = baseDaTela();
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
    // tamanho do mapa de sombras do perfil (celular usa no máximo 1024)
    const tamSombra = toqueGrosso ? Math.min(1024, q.tamanhoSombra) : q.tamanhoSombra;
    if (sombras.getShadowMap()?.getSize().width !== tamSombra) sombras.mapSize = tamSombra;
    pipeline.bloomEnabled = q.bloom;
    pipeline.fxaaEnabled = q.fxaa;
    glow.isEnabled = q.glow;
    vagalumes.definirDensidade(q.vagalumes / 260);
    if (q.escalaMinima !== escalaMinima) {
      escalaMinima = q.escalaMinima;
      base = baseDaTela();
      aplicarEscala(Math.max(base, base < 1 ? ESCALA_INICIO_TOQUE : base));
    }
    motorAudio.definirVolume('geral', c.volumeGeral);
    motorAudio.definirVolume('efeitos', c.volumeEfeitos);
    motorAudio.definirVolume('passos', c.volumeEfeitos);
    configAtual = c;
    ambiente?.definirVolumes(c.volumeMusica, c.volumeAmbiente);
    controle.definirMouse(c.sensibilidade, c.inverterY);
    controle.definirPuloAutomatico(c.puloAutomatico);
    // "Balanço ao andar": com ele desligado, a câmera não volta sozinha para trás do boneco
    recentrarLigado = c.balanco;
  }
  opcoes.config?.ouvir(aplicarConfig);

  // Criaturas: o núcleo simula; a cena desenha a cópia suavizada.
  const replicaCriaturas = cliente.criaturas;
  const cacheCeu = new Map<string, { topo: number; t: number }>();
  let relogioCache = 0;
  /**
   * Céu aberto acima de (x, y, z)? O cache guarda o bloco opaco mais alto da coluna,
   * então serve a qualquer altura (um espectro na caverna sob uma coluna já medida
   * na superfície não "vê o sol").
   */
  function ceuAberto(x: number, y: number, z: number): boolean {
    const k = `${x},${z}`;
    const c = cacheCeu.get(k);
    if (c && relogioCache - c.t < 3) return y > c.topo;
    let topo = -1;
    for (let yy = ALTURA - 1; yy >= 0; yy--)
      if (obterBlocoDef(blocoEm(x, yy, z))?.opaco) {
        topo = yy;
        break;
      }
    cacheCeu.set(k, { topo, t: relogioCache });
    if (cacheCeu.size > 4000) cacheCeu.clear();
    return y > topo;
  }
  const renderCriaturas = criarRenderCriaturas(
    scene,
    (m) => glow.addExcludedMesh(m),
    () => undefined,
  );
  // spec 016: a proteção do mundo à vista nas capturas (só nos testes de tela)
  if (ehTesteDeTela()) {
    const protecao = (): ProtecaoMundo => protecaoMundo;
    const tinta = criarTintaProtecao(scene, protecao);
    estado.protecao = (x, y, z) => nomeProtecao(protecao().em(x, y, z));
    estado.tingirProtecao = (raio = 24, so) => {
      const j = controle.jogador;
      const filtro = so?.map((n) => NOMES_PROTECAO.indexOf(n) as Protecao);
      return tinta.pintar(j.x, j.z, raio, filtro);
    };
  }
  // só nos testes de tela (auditoria 017: num jogo de verdade não há vitrine)
  if (ehTesteDeTela())
    estado.estatua = (tipo, x, y, z, yaw, morador) =>
      renderCriaturas.estatua(tipo, x, y, z, yaw, morador);
  // spec 015 (gestos): a roda, as teclas e o que os amigos e moradores fazem
  gestos = criarGestosJogo({
    scene,
    raiz: personagem.raiz,
    animador,
    enviar,
    proximoId,
    pode: () => {
      const b = document.body;
      return (
        !b.dataset.overlay &&
        !b.classList.contains('modo-foto') &&
        !b.classList.contains('tela-titulo') &&
        !sobrevivenciaMorto()
      );
    },
    podeGesto: () => {
      const j = controle.jogador;
      return (j.noChao || !!j.voando) && !j.naAgua;
    },
    gestoDoAmigo: (id, g) => outrosJogadores.gesto(id, g),
    gestoDoMorador: (id, g, voz) => {
      renderCriaturas.gesto(id, g);
      const c = criaturaPorId(id);
      if (voz && c) tocarVoz(motorAudio, 'morador', 'contente', volumeDaDistancia(c));
    },
  });
  estado.gestos = {
    fazer: (g) => gestos!.fazer(g),
    roda: () => gestos!.roda.aberta,
    menu: () => gestos!.menu.aberta,
    local: () => ({ gesto: gestoDoAnimador(animador), balao: gestos!.balao.gesto }),
    moradores: () => renderCriaturas.gestosMoradores(),
  };
  /** Até onde o bicho apontado vale, dos olhos (o núcleo confere 7 blocos no chão). */
  const ALCANCE_BICHO = 3.6;
  function criaturaApontada() {
    // o mesmo raio da mira (centro ou dedo); o alcance conta dos olhos, como nos blocos
    const m = raioMira();
    const olhos = camera.position;
    const folga = Math.hypot(m.origem.x - olhos.x, m.origem.y - olhos.y, m.origem.z - olhos.z);
    const r = criaturaNaMira(replicaCriaturas.lista, m.origem, m.direcao, ALCANCE_BICHO + folga);
    if (!r) return null;
    const t = Math.hypot(m.direcao.x, m.direcao.y, m.direcao.z) || 1;
    const px = m.origem.x + (m.direcao.x / t) * r.distancia;
    const py = m.origem.y + (m.direcao.y / t) * r.distancia;
    const pz = m.origem.z + (m.direcao.z / t) * r.distancia;
    if (Math.hypot(px - olhos.x, py - olhos.y, pz - olhos.z) > ALCANCE_BICHO) return null;
    // um bloco na frente esconde o bicho
    const a = alvoComDistancia();
    if (a && a.distancia + 0.4 < r.distancia) return null;
    return r.criatura;
  }
  /** Clique esquerdo numa criatura: ataca com a arma da mão. */
  function atacarNaMira(): boolean {
    const c = criaturaApontada();
    if (!c) return false;
    if (c.morador) {
      // morador não apanha: o golpe vira um "oi" (e ele vira para o jogador)
      enviarTelemetria(true);
      enviar({ t: 'falar', criatura: c.id });
      tocarVoz(motorAudio, 'morador', 'contente', 1);
      return true;
    }
    // spec 016: o bichinho criado ou domado do amigo não apanha (o núcleo confere igual)
    if ((c.criado || c.domada) && !podeLevarBicho(voce, c, donoDoMundo)) {
      const dono = c.dono ?? donoDoMundo;
      const apelido = regra.apelido(dono);
      avisosProtecao.avisar(apelido ? { motivo: 'bicho', dono: apelido } : { motivo: 'bicho' });
      return true;
    }
    animador.evento('golpe');
    enviarTelemetria(true);
    enviar({ t: 'atacar', criatura: c.id, slot: hotbar.ativo });
    return true;
  }
  /**
   * Morador, raposa com frutinhas na mão ou bicho com a comida dele na mão: o toque e o
   * segurar não batem neles (o toque dá a comida).
   */
  function amigoNaMira(): boolean {
    const c = criaturaApontada();
    if (!c) return false;
    if (c.morador) return true;
    const item = hotbar.pilhaAtiva()?.item;
    if (viraCriado(c.tipo) && comeEsse(c.tipo, item)) return true;
    return c.tipo === 'raposa' && !c.domada && item === 'frutinhas';
  }
  /** Comida na mão no modo sobrevivência. */
  function comidaNaMao(): boolean {
    const p = hotbar.pilhaAtiva();
    return modo === 'sobrevivencia' && !!(p && obterItem(p.item)?.comida);
  }
  // segurar para comer (toque): 1,1 s mastigando; soltar antes cancela
  let comerTimer = 0;
  function comecarAComer(): void {
    pararDeComer();
    if (cliente.sobrevivencia.fome >= 20) {
      toast('Você está sem fome');
      return;
    }
    tocarSom(motorAudio, 'comer');
    animador.evento('comer');
    comerTimer = window.setTimeout(() => {
      comerTimer = 0;
      enviar({ t: 'comer', slot: hotbar.ativo });
      // ainda segurando: continua comendo enquanto tiver fome e comida
      window.setTimeout(() => {
        if (gestoSegurando() && comidaNaMao() && cliente.sobrevivencia.fome < 20) comecarAComer();
      }, 250);
    }, 1100);
  }
  function pararDeComer(): void {
    if (comerTimer) clearTimeout(comerTimer);
    comerTimer = 0;
  }
  const gestoSegurando = () => pontoToque !== null;
  // dica perto da mira: como falar com o morador, domar a raposa, comer
  let esperaDica = 0;
  let dicaAtual = '';
  function atualizarDica(dt: number): void {
    esperaDica -= dt;
    if (esperaDica > 0) return;
    esperaDica = 0.25;
    const toque = document.body.classList.contains('toque-ativo');
    let t = '';
    // no toque sem dedo na tela, a mira do centro não vale (o contorno também some): a dica
    // fala do último bloco tocado, por um instante, ou só do que não depende de bloco
    const semDedo = toque && pontoToque === null;
    const recente = alvoDoToque && performance.now() < alvoDoToque.ateDica ? alvoDoToque : null;
    const alvo = semDedo ? recente : alvoDoQuadro();
    const c = semDedo ? null : criaturaApontada();
    const p = hotbar.pilhaAtiva();
    if (c?.morador) {
      const nome = nomeDoMorador(c.morador.povoado, c.morador.n, c.morador.profissao);
      t = toque ? `Toque em ${nome} para trocar` : `Clique direito (ou F): trocar com ${nome}`;
    } else if (c && viraCriado(c.tipo) && comeEsse(c.tipo, p?.item)) {
      const bicho = comArtigo(CRIATURAS[c.tipo].nome);
      const comida = minuscula(obterItem(p!.item)?.nome ?? p!.item);
      t = toque
        ? `Toque para dar ${comida} ${bicho.a}`
        : `Clique direito (ou F): dar ${comida} ${bicho.a}`;
    } else if (c && viraCriado(c.tipo) && c.estado !== 'morrendo') {
      const bicho = comArtigo(CRIATURAS[c.tipo].nome);
      const lista = COMIDA_DOS_BICHOS[c.tipo] ?? [];
      const comida =
        lista.length === 1 ? minuscula(obterItem(lista[0])?.nome ?? lista[0]) : 'uma semente';
      t = `Segure ${comida} para ${bicho.o} seguir você`;
    } else if (c && c.tipo === 'raposa' && !c.domada && p?.item === 'frutinhas') {
      t = toque ? 'Toque na raposa para dar frutinhas' : 'Clique direito (ou F): dar frutinhas';
    } else if (comidaNaMao() && cliente.sobrevivencia.fome < 20) {
      t = toque ? 'Segure o dedo na tela para comer' : 'Clique direito (ou F): comer';
    } else {
      t = dicaDoPlantio(alvo, toque, p?.item);
    }
    if (!t) t = dicaDaPorteira(alvo, toque);
    if (t === dicaAtual) return;
    dicaAtual = t;
    window.dispatchEvent(new CustomEvent('brumaluz:dicaMira', { detail: t }));
  }
  type AlvoDaDica = { x: number; y: number; z: number; normal: Vec3 } | null;
  const minuscula = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
  /**
   * Nome do bicho com artigo, no gênero da primeira palavra ("a vaca malhada", "o cervo-musgo"):
   * `o` é "a vaca", `a` é "à vaca" (dar à vaca, dar ao cervo).
   */
  function comArtigo(nome: string): { o: string; a: string } {
    const n = minuscula(nome);
    const fem = /a$/.test(n.split(/[\s-]/)[0]);
    return fem ? { o: `a ${n}`, a: `à ${n}` } : { o: `o ${n}`, a: `ao ${n}` };
  }
  /** Porteira na mira (de perto): como abrir e fechar. */
  function dicaDaPorteira(a: AlvoDaDica, toque: boolean): string {
    if (!a) return '';
    const b = blocoEm(a.x, a.y, a.z);
    if (!ehPorteira(b)) return '';
    const aberta = b === Bloco.PORTEIRA_ABERTA;
    if (toque) return aberta ? 'Toque para fechar a porteira' : 'Toque para abrir a porteira';
    return aberta ? 'Clique direito: fechar' : 'Clique direito: abrir';
  }
  /** Dicas da roça: arar com a enxada, plantar na terra arada, colher a madura. */
  function dicaDoPlantio(a: AlvoDaDica, toque: boolean, item: string | undefined): string {
    if (!a) return '';
    const b = blocoEm(a.x, a.y, a.z);
    const def = item ? obterItem(item) : undefined;
    if (ehEnxada(def?.ferramenta))
      return alvoDaEnxada(a, blocoEm)
        ? toque
          ? 'Toque na grama para arar'
          : 'Clique direito: arar'
        : '';
    if (madura(b)) return toque ? 'Segure para colher' : 'Clique para colher';
    if (lavouraDoBloco(def?.bloco ?? -1)) {
      const p = posicaoDeColocar(a);
      if (podePlantar(blocoEm(p.x, p.y - 1, p.z), blocoEm(p.x, p.y, p.z)))
        return toque ? 'Toque na terra arada para plantar' : 'Clique direito: plantar';
      return ehLavoura(b) ? '' : 'A semente vai na terra arada';
    }
    return '';
  }
  /** Volume da voz pela distância (some a 24 blocos). */
  const volumeDaDistancia = (c: { x: number; y: number; z: number }) => {
    const d = Math.hypot(c.x - camera.position.x, c.y - camera.position.y, c.z - camera.position.z);
    return Math.max(0, 1 - d / 24);
  };
  // chamados de vez em quando: no máximo um a cada poucos segundos, de um bicho por perto
  // obrigado do morador depois de uma troca
  window.addEventListener('brumaluz:trocou', () => tocarVoz(motorAudio, 'morador', 'obrigado', 1));
  // chegar perto de um povoado pela primeira vez nesta visita: aviso e diário
  const povoadosAvisados = new Set<string>();
  let esperaAvisoPovoado = 2;
  const avisarPovoado = (dt: number) => {
    esperaAvisoPovoado -= dt;
    if (esperaAvisoPovoado > 0) return;
    esperaAvisoPovoado = 2;
    const j = controle.jogador;
    for (const p of povoadosPerto(j.x, j.z, 26, semente)) {
      if (povoadosAvisados.has(p.id)) continue;
      povoadosAvisados.add(p.id);
      toast(povoadoDoTema().textos.chegou);
      window.dispatchEvent(new CustomEvent('brumaluz:povoado', { detail: p.id }));
    }
  };
  // gerador próprio: os chamados não mexem na sequência dos drops
  const rngVozes = criarGerador(4242);
  let esperaChamado = 4;
  // depois de conversar ou trocar, os moradores ficam quietos um tempo (não parecem falar sem
  // parar, como os bipes de rádio da Lua pareciam)
  let silencioMoradores = 0;
  window.addEventListener('brumaluz:trocar', () => (silencioMoradores = 20));
  let painelTrocas: HTMLElement | null = null;
  const chamadosCriaturas = (dt: number) => {
    esperaChamado -= dt;
    // o painel é criado uma vez: procura até achar e depois só olha se está aberto (sem
    // varrer a página a cada quadro)
    if (!painelTrocas?.isConnected)
      painelTrocas = document.querySelector<HTMLElement>('.painel-trocas');
    if (painelTrocas && !painelTrocas.hidden) silencioMoradores = 20;
    else silencioMoradores = Math.max(0, silencioMoradores - dt);
    if (esperaChamado > 0) return;
    esperaChamado = 5 + rngVozes() * 9;
    const perto = replicaCriaturas.lista.filter(
      (c) =>
        c.estado !== 'morrendo' &&
        c.tipo !== 'espectro' &&
        volumeDaDistancia(c) > 0.25 &&
        // moradores chamam bem menos que os bichos, e nunca logo depois de uma conversa
        (c.tipo !== 'morador' || (silencioMoradores <= 0 && rngVozes() < 0.35)),
    );
    if (perto.length === 0) return;
    const c = perto[Math.floor(rngVozes() * perto.length)];
    tocarVoz(motorAudio, c.tipo, c.domada ? 'contente' : 'chamado', volumeDaDistancia(c));
  };
  quadroCriaturas = (dt: number, tempo: number) => {
    relogioCache += dt;
    const j = controle.jogador;
    replicaCriaturas.atualizar(dt);
    chamadosCriaturas(dt);
    avisarPovoado(dt);
    atualizarDica(dt);
    perigoPerto =
      modo === 'sobrevivencia' &&
      replicaCriaturas.lista.some(
        (c) =>
          c.tipo === 'espectro' &&
          c.estado === 'perseguir' &&
          Math.hypot(c.x - j.x, c.z - j.z) < 14,
      );
    renderCriaturas.atualizar(replicaCriaturas.lista as unknown as Criatura[], dt, tempo, () =>
      Math.max(0.2, luzJogador * (0.45 + 0.55 * luzDia)),
    );
  };
  estado.criaturas = () =>
    replicaCriaturas.vistas.map((c) => ({
      id: c.id,
      profissao: c.morador?.profissao,
      tipo: c.tipo,
      x: c.x,
      y: c.y,
      z: c.z,
      domada: c.domada,
      vida: c.vida,
      criado: !!c.criado,
      estado: c.estado,
    }));
  estado.invocar = (tipo, x, y, z, extra) =>
    enviar({ t: 'depurar', d: { f: 'invocar', tipo, x, y, z, ...extra } });
  estado.darKit = () => enviar({ t: 'depurar', d: { f: 'kit' } });
  estado.crescerLavoura = (segundos) => enviar({ t: 'depurar', d: { f: 'crescer', segundos } });

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
        if (antes !== e.v) lote.push({ ...e.p, antes, depois: e.v });
      }
      aplicarLote(lote, 'depois');
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
          if ((antes & 255) === bloco || antes === bloco) continue;
          lote.push({ ...q, antes, depois: bloco });
        }
        aplicarLote(lote, 'depois');
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
    if (e.code === 'KeyF' && document.pointerLockElement && !document.body.dataset.overlay) {
      usarOuColocar(false);
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
    const a = alvoDoQuadro();
    const f = modoConstrucao >= 0 ? FERRAMENTAS[modoConstrucao] : null;
    const bloco = hotbar.blocoAtivo();
    const def = obterBlocoDef(bloco);
    const colocar = a ? posicaoDeColocar(a) : null;
    // fantasma só nas ferramentas que constroem várias peças (ou se a pessoa ligar a
    // prévia): no jogo normal basta o contorno no bloco mirado, como no Minecraft
    const ferramentaComFantasma =
      f === 'preencher' || f === 'parede' || f === 'linha' || f === 'esfera';
    const pontoFantasma =
      ferramentaComFantasma || (!f && configAtual?.previaColocar) ? colocar : null;
    // spec 016: na passagem (ou na casa do mundo) o fantasma fica de outra cor: ali não vai
    const proibido =
      !!pontoFantasma &&
      !!bloco &&
      recusaColocar(regra, voce, pontoFantasma.x, pontoFantasma.y, pontoFantasma.z, bloco) !== null;
    visualConstrucao.fantasma(
      pontoFantasma,
      bloco && def && !def.planta ? bloco : null,
      tempo,
      proibido,
    );
    if (!f || !a) {
      visualConstrucao.caixa(null, null, BRANCO);
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
  const modoFoto = criarModoFoto({
    scene,
    canvas,
    camera,
    cameraVisao,
    pipeline,
    teclas: controle.teclas,
    alvo: calcularAlvo,
    pausarDia: (p) => {
      estado.pausarDia = p;
    },
    boneco: () => ({
      x: controle.jogador.x,
      y: controle.jogador.y,
      z: controle.jogador.z,
      yaw: animador.yaw(),
    }),
    apontar: (y, p) => controle.apontar(y, p),
  });
  estado.modoFoto = modoFoto;
  quadroFotoRef = modoFoto.quadro;
  fotoPosRef = modoFoto.posicao;

  // Mapa: cores de um chunk visto de cima (relevo e água)
  estado.mapaChunk = (cx: number, cz: number) => amostrarMapaChunk(provedor, blocoEm, cx, cz);

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
      // pular passa pela detecção de toque duplo (voo no criativo)
      if (acao === 'pular') controle.pular(ativo);
      else controle.teclas[acao] = ativo;
    },
    quebrar: (ativo) => {
      if (ativo) {
        // no toque, segurar com comida na mão (sobrevivência) come em vez de quebrar
        if (comidaNaMao()) {
          comecarAComer();
          return;
        }
        if (amigoNaMira()) return;
        if (!atacarNaMira()) minerador.pressionar();
      } else {
        pararDeComer();
        minerador.soltar();
      }
    },
    usar: () => usarOuColocar(false),
    mirar: (x, y) => {
      pontoToque = { x, y };
      alvoDoToque = null;
      mirarToque(x, y);
    },
    soltarMira: () => {
      pontoToque = null;
      raioToque = null;
      alvoMemoQuadro = -1;
    },
    zoom: (fator) => {
      if (Number.isFinite(fator) && fator > 0) orbita.definirZoom(orbita.zoom() * fator);
    },
    arrastar: (ativo) => {
      arrastandoCamera = ativo;
    },
    tocar: () => {
      // o corpo vira para o bloco tocado durante a animação (a mira do dedo solta já)
      const a = raioToque ? calcularAlvo() : null;
      const agora = performance.now();
      if (a) alvoDoToque = { ...a, ate: agora + 900, ateDica: agora + 2500 };
      if (amigoNaMira() || !atacarNaMira()) usarOuColocar(false);
    },
    dedoLonge: () =>
      raioToque !== null &&
      !alvoComDistancia() &&
      !criaturaApontada() &&
      !comidaNaMao() &&
      blocoLongeNoRaio(raioToque),
    avisarLonge: () => tocarSom(motorAudio, 'recusa'),
    voando: () => !!controle.jogador.voando,
  };

  // Nascimento: sem posição salva, garante que o jogador comece em ar livre.
  if (!dadosIniciais?.jogador) estado.teleportar?.(controle.jogador.x, controle.jogador.z);

  // Salvamento: o núcleo devolve o mundo (blocos, baús, criaturas, inventário, vida,
  // dia, clima); a cena junta a câmera e o que é só do jogador (diário, mapa, barra).
  function pedirNucleo(): Promise<SalvoNucleo> {
    enviarTelemetria(true);
    return cliente.pedirSalvamento();
  }
  async function coletarDados(): Promise<DadosMundo> {
    const j = controle.jogador;
    const nucleo = await pedirNucleo();
    const extras: Record<string, unknown> = { ...(dadosIniciais?.extras ?? {}) };
    for (const [k, sv] of salvaveis) extras[k] = sv.salvar();
    Object.assign(extras, nucleo.extras);
    extras['inventario'] = {
      ...((nucleo.extras['inventario'] as object | undefined) ?? {}),
      ativo: hotbar.ativo,
    };
    return {
      versao: 1,
      edicoes: nucleo.edicoes,
      jogador: { x: j.x, y: j.y, z: j.z, yaw: camera.rotation.y, pitch: camera.rotation.x },
      hora: nucleo.hora,
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
      scene.render();
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
    // na nuvem o servidor grava sozinho a cada poucos segundos
    if (opcoes.conexao && !opcoes.repo && opcoes.mundo?.nuvem) return true;
    const repo = opcoes.repo;
    const mundo = opcoes.mundo;
    if (!repo || !mundo || !estado.ready) return false;
    if (salvando) await salvando;
    // a miniatura sai do quadro de agora; os dados chegam do núcleo logo depois
    const foto = comMiniatura ? miniatura() : undefined;
    salvando = coletarDados().then((d) => repo.salvar(mundo.id, d, foto));
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

  // Modos: criativo voa; sobrevivência tem vida, fome, ar, queda e morte (no núcleo).
  controle.definirVoo(modo === 'criativo');
  const sobrevivenciaCliente: SobrevivenciaCliente = {
    get estado() {
      return cliente.sobrevivencia;
    },
    dano: (qtd, causa = 'outro') => enviar({ t: 'depurar', d: { f: 'dano', qtd, causa } }),
    // testes: um pulo (correndo gasta mais fome), contado na próxima telemetria
    pulo: (correndo = false) => {
      pulos++;
      if (correndo) puloCorrendo = true;
      enviarTelemetria(true);
    },
  };
  estado.sobrevivencia = sobrevivenciaCliente;
  estado.definirSpawn = (x, z) => enviar({ t: 'depurar', d: { f: 'spawn', x, z } });
  estado.renascer = () => {
    quedas = [];
    renascerPedidoEm = performance.now();
    enviar({ t: 'renascer' });
  };
  /**
   * Spec 016: "Voltar para casa" (pausa e roda do menu). O núcleo leva (e confere o
   * intervalo); aqui só o aviso: saindo agora, ou "espera um pouquinho".
   */
  let voltouCasaEm = -Infinity;
  estado.voltarCasa = () => {
    if (sobrevivenciaCliente.estado.morto) return;
    const agora = performance.now() / 1000;
    if (agora - voltouCasaEm < ESPERA_VOLTA_CASA) {
      toast(AVISO_ESPERA_CASA);
      return;
    }
    voltouCasaEm = agora;
    toast(AVISO_VOLTA_CASA);
    enviarTelemetria(true);
    enviar({ t: 'voltarCasa' });
  };
  window.addEventListener('brumaluz:voltarCasa', () => estado.voltarCasa?.());

  // Telemetria: o corpo do jogador anda aqui (resposta imediata); o núcleo recebe
  // a posição e o que pesa na sobrevivência (quedas, pulos, golpes, água).
  let quedas: number[] = [];
  let pulos = 0;
  let puloCorrendo = false;
  let golpes = 0;
  let ultimaTelemetria = -1;
  barramento.ouvir('golpe', () => golpes++);
  function enviarTelemetria(forcar = false): void {
    const agora = performance.now() / 1000;
    if (!forcar && agora - ultimaTelemetria < PASSO) return;
    ultimaTelemetria = agora;
    const j = controle.jogador;
    const olhos = camera.position;
    enviar({
      t: 'jogador',
      x: j.x,
      y: j.y,
      z: j.z,
      yaw: camera.rotation.y,
      pitch: camera.rotation.x,
      olhos: olhos.y,
      noChao: j.noChao,
      voando: !!j.voando,
      vel: velocidadeHoriz,
      correndo: corrida || puloCorrendo,
      submerso:
        blocoEm(Math.floor(olhos.x), Math.floor(olhos.y), Math.floor(olhos.z)) === Bloco.AGUA,
      quedas,
      pulos,
      golpes,
      slot: hotbar.ativo,
      raio: raioChunks,
    });
    quedas = [];
    pulos = 0;
    puloCorrendo = false;
    golpes = 0;
  }
  // testes: espera o núcleo ter processado tudo o que foi mandado (e o quadro seguinte)
  estado.sincronizar = async () => {
    await cliente.pedirSalvamento();
    const n = cliente.quadrosRecebidos;
    const fim = performance.now() + 5000;
    while (cliente.quadrosRecebidos < n + 2 && performance.now() < fim)
      await new Promise((r) => setTimeout(r, 20));
  };
  quadroSobrevivencia = () => {
    const r = controle.resultado;
    // só a queda do passo que rodou agora (parado, o resultado é o do último passo: a
    // queda que desmaiou contaria de novo depois de renascer)
    if (fisicaRodou && r.aterrissou && r.queda > 0) quedas.push(r.queda);
    enviarTelemetria();
  };

  const sincronia = cliente.sincronia;
  const conteinerAberto = () => cliente.conteiner;

  const criaturaPorId = (id: number) => replicaCriaturas.lista.find((c) => c.id === id);
  function tratarEvento(e: EventoNucleo): void {
    switch (e.e) {
      case 'gesto': // spec 015: gesto de um amigo ou de um morador que respondeu
        gestos?.evento(e);
        break;
      case 'quebra':
      case 'colocacao':
        // o que os outros fazem (o próprio jogador já viu e ouviu na previsão)
        if (!e.meu) {
          aplicarPlano(e.e, e);
          // a festa da colheita dos outros sai no evento 'colheu'
          tocarSom(
            motorAudio,
            e.e === 'quebra' ? 'quebra' : 'colocar',
            grupoDoBloco(e.bloco) ?? 'terra',
          );
        }
        break;
      case 'porta':
        tocarSom(motorAudio, 'colocar', 'madeira');
        break;
      case 'coletou':
        coletou(e.item, e.qtd);
        break;
      case 'ferramentaQuebrou':
        tocarSom(motorAudio, 'recusa');
        toast(`${obterItem(e.item)?.nome ?? 'Ferramenta'} quebrou!`);
        break;
      case 'criaturaFerida': {
        const c = criaturaPorId(e.id);
        tocarSom(motorAudio, 'golpe', e.tipo === 'espectro' ? 'cristal' : 'terra');
        if (c) tocarVoz(motorAudio, e.tipo, 'susto', volumeDaDistancia(c));
        break;
      }
      case 'criaturaMorreu':
        if (e.tipo === 'espectro' && temaAtual.id === 'bruma-e-luz')
          tocarSom(motorAudio, 'espectro');
        else if (e.tipo === 'espectro') tocarVoz(motorAudio, 'espectro', 'susto', 1);
        else tocarSom(motorAudio, 'quebra', 'folhagem');
        if (e.drops) window.dispatchEvent(new CustomEvent('brumaluz:derrotou', { detail: e.tipo }));
        break;
      case 'criaturaSom': {
        const c = criaturaPorId(e.id);
        if (!c || Math.hypot(c.x - camera.position.x, c.z - camera.position.z) >= 20) break;
        // o gemido de sempre no Bruma e Luz; nos outros temas, a voz da noturna do tema
        if (temaAtual.id === 'bruma-e-luz') tocarSom(motorAudio, 'espectro');
        else tocarVoz(motorAudio, 'espectro', 'chamado', Math.max(0.4, volumeDaDistancia(c)));
        const ang =
          Math.atan2(c.x - camera.position.x, c.z - camera.position.z) - camera.rotation.y;
        const rel = Math.atan2(Math.sin(ang), Math.cos(ang));
        const lado =
          Math.abs(rel) < 0.6
            ? 'à frente'
            : Math.abs(rel) > 2.4
              ? 'atrás'
              : rel > 0
                ? 'à direita'
                : 'à esquerda';
        legenda(`${temaAtual.textos.legendas.criaturaNoturna} ${lado}`);
        break;
      }
      case 'ataque':
        // o empurrão do golpe (o dano já veio no estado da sobrevivência)
        controle.jogador.vy = 4.5;
        break;
      case 'domou':
        tocarSom(motorAudio, 'entrada');
        toast(`${CRIATURAS.raposa.nome} confia em você!`);
        window.dispatchEvent(new CustomEvent('brumaluz:domou'));
        tocarVoz(motorAudio, e.tipo, 'contente', 1);
        break;
      case 'alimentou': {
        // corações em quem ganhou comida (todos veem); o diário é de quem deu
        coracoes.soltar(e.x, e.y + CRIATURAS[e.tipo].alt + 0.2, e.z, e.novo ? 6 : 3);
        tocarVoz(motorAudio, e.tipo, 'contente', e.meu ? 1 : volumeDaDistancia(e));
        if (e.meu && e.novo) {
          tocarSom(motorAudio, 'coleta');
          toast(`${CRIATURAS[e.tipo].nome} virou seu bichinho!`);
          window.dispatchEvent(new CustomEvent('brumaluz:criou', { detail: e.tipo }));
        }
        break;
      }
      case 'criacaoRecusada':
        toast(e.aviso || AVISO_LIMITE);
        break;
      case 'botouOvo':
        if (volumeDaDistancia(e) > 0.2)
          tocarVoz(motorAudio, 'coelho', 'chamado', volumeDaDistancia(e));
        break;
      case 'espantou':
        window.dispatchEvent(new CustomEvent('brumaluz:espantou', { detail: e.tipo }));
        break;
      case 'comeu':
        tocarSom(motorAudio, 'comer');
        animador.evento('comer');
        window.dispatchEvent(new CustomEvent('brumaluz:comeu'));
        break;
      case 'dano':
        tocarSom(motorAudio, 'dano');
        legenda(e.causa === 'queda' ? 'Queda' : e.causa === 'afogamento' ? 'Sem ar' : 'Dano');
        window.dispatchEvent(
          new CustomEvent('brumaluz:dano', {
            detail: { tipo: 'dano', causa: e.causa, qtd: e.qtd },
          }),
        );
        break;
      case 'morte':
        window.dispatchEvent(new CustomEvent('brumaluz:morte', { detail: e.causa }));
        break;
      case 'teleporte':
        estado.teleportar?.(e.x, e.z, e.y);
        controle.jogador.topoQueda = undefined;
        renascerPedidoEm = -1;
        break;
      case 'relampago':
        if (!temaAtual.climaVisual.relampago) break;
        flash = 1;
        setTimeout(() => {
          tocarSom(motorAudio, 'trovao');
          legenda(temaAtual.textos.legendas.trovao);
        }, e.atrasoTrovao * 1000);
        break;
      case 'sono':
        window.dispatchEvent(new CustomEvent('brumaluz:sono', { detail: { dormiu: e.dormiu } }));
        break;
      case 'acordou': {
        // as estações não esperam a transição: o dia novo já amanhece com elas
        const est = estacaoDoDia(cliente.ambiente.dia);
        outonoAtual = est === 'outono' ? 1 : 0;
        invernoAtual = est === 'inverno' ? 1 : 0;
        window.dispatchEvent(new CustomEvent('brumaluz:acordou'));
        break;
      }
      case 'entrou':
        toast(`${e.apelido} chegou no mundo!`);
        tocarSom(motorAudio, 'entrada');
        window.dispatchEvent(new CustomEvent('brumaluz:entrou', { detail: e }));
        break;
      case 'saiu':
        toast(`${e.apelido} saiu do mundo`);
        window.dispatchEvent(new CustomEvent('brumaluz:saiu', { detail: e }));
        break;
      case 'sonoEspera':
        window.dispatchEvent(new CustomEvent('brumaluz:sonoEspera', { detail: e.faltam }));
        break;
      case 'trocou':
        window.dispatchEvent(
          new CustomEvent('brumaluz:trocou', {
            detail: { profissao: e.profissao, troca: e.troca },
          }),
        );
        break;
      case 'trocaRecusada':
        window.dispatchEvent(new CustomEvent('brumaluz:trocaRecusada', { detail: e.motivo }));
        break;
      case 'recusa':
        barramento.emitir('recusa', { motivo: e.motivo === 'quebrar' ? 'quebrar' : 'colocar' });
        if (e.motivo === 'semente') toast(AVISO_SEMENTE);
        if (e.motivo === 'voltarCasa') toast(AVISO_ESPERA_CASA);
        // spec 016: o núcleo disse de quem é (bicho do amigo, ou a previsão errou)
        if (e.protecao) avisosProtecao.avisar(e.protecao);
        break;
      case 'arou':
        if (e.meu) window.dispatchEvent(new CustomEvent('brumaluz:arou'));
        else tocarSom(motorAudio, 'quebra', 'terra');
        break;
      case 'plantou':
        window.dispatchEvent(new CustomEvent('brumaluz:plantou', { detail: e.bloco }));
        break;
      case 'colheu':
        // a festa de quem colhe já saiu na previsão; a dos outros sai aqui
        if (!e.meu && e.madura) festaDaColheita(e.x, e.y, e.z);
        if (e.meu)
          window.dispatchEvent(
            new CustomEvent('brumaluz:colheu', { detail: { bloco: e.bloco, madura: e.madura } }),
          );
        break;
      case 'amadureceu':
        brilhoDeMadura(e.x, e.y, e.z);
        break;
    }
  }

  /** Um amigo apareceu: brilho de cristal subindo no lugar. */
  function chegouAmigo(x: number, y: number, z: number): void {
    for (let k = 0; k < 3; k++)
      aplicarPlano('quebra', {
        x: Math.floor(x),
        y: Math.floor(y) + k,
        z: Math.floor(z),
        bloco: Bloco.CRISTAL_LUZ,
      });
  }
  estado.outrosJogadores = () => outrosJogadores.lista;
  let perfisDeTeste = '';
  // só nos testes de tela (auditoria 017: numa sessão de verdade trocaria os perfis dos amigos)
  if (ehTesteDeTela())
    estado.amigosDeTeste = (lista) => {
      const perfis: Record<string, { apelido: string; aparencia: Record<string, unknown> }> = {};
      for (const a of lista) perfis[a.id] = { apelido: a.id, aparencia: a.aparencia };
      // só remonta os bonecos quando a aparência muda (o teste move os amigos a cada quadro)
      const chave = JSON.stringify(perfis);
      if (chave !== perfisDeTeste) {
        perfisDeTeste = chave;
        outrosJogadores.definirPerfis(perfis);
      }
      outrosJogadores.receber(
        lista.map((a) => ({
          id: a.id,
          x: a.x,
          y: a.y,
          z: a.z,
          yaw: a.yaw ?? 0,
          pitch: 0,
          vel: a.vel ?? 0,
          voando: false,
          noChao: true,
          correndo: a.correndo ?? false,
          mao: null,
        })),
      );
    };
  estado.definirClima = (t) => enviar({ t: 'depurar', d: { f: 'clima', tipo: t } });
  estado.dia = () => dia;
  estado.definirDia = (d) => {
    dia = Math.max(0, Math.floor(d));
    enviar({ t: 'depurar', d: { f: 'dia', dia } });
    const e = estacaoDoDia(dia);
    outonoAtual = e === 'outono' ? 1 : 0;
    invernoAtual = e === 'inverno' ? 1 : 0;
  };

  estado.salvar = salvar;
  estado.modo = modo;
  estado.inventario = inventario;
  estado.mundo = opcoes.mundo ? { ...opcoes.mundo } : undefined;
  // a cada 30 s salva; a cada 2 min também tira a foto da miniatura (a lista de mundos mostra
  // o mundo como ele está agora, sem esperar pausar ou trocar de mundo)
  let salvamentos = 0;
  setInterval(() => void salvar(++salvamentos % 4 === 0), 30_000);
  // cópia recente do núcleo: ao fechar a aba não dá tempo de perguntar ao worker
  let copiaNucleo: SalvoNucleo | null = null;
  setInterval(() => {
    if (!estado.ready || !opcoes.repo) return;
    cliente
      .pedirSalvamento()
      .then((d) => {
        copiaNucleo = d;
      })
      .catch(() => undefined);
  }, 5_000);
  /** Salva já, sem esperar o worker: a cópia do núcleo mais o que o cliente sabe agora. */
  function salvarJa(): void {
    const repo = opcoes.repo;
    const mundo = opcoes.mundo;
    if (!repo || !mundo || !estado.ready || !copiaNucleo) return;
    const j = controle.jogador;
    const extras: Record<string, unknown> = { ...(dadosIniciais?.extras ?? {}) };
    for (const [k, sv] of salvaveis) extras[k] = sv.salvar();
    Object.assign(extras, copiaNucleo.extras);
    extras['inventario'] = { ...inventario.salvar(), ativo: hotbar.ativo };
    extras['sobrevivencia'] = cliente.sobrevivencia;
    extras['dia'] = cliente.ambiente.dia;
    void repo
      .salvar(mundo.id, {
        versao: 1,
        // as edições do cliente já têm tudo o que o núcleo confirmou (e as previsões)
        edicoes: edicoes.exportar(),
        jogador: { x: j.x, y: j.y, z: j.z, yaw: camera.rotation.y, pitch: camera.rotation.x },
        hora: cliente.ambiente.hora,
        extras,
      })
      .catch(() => undefined);
  }
  document.addEventListener('visibilitychange', () => {
    const escondida = document.visibilityState === 'hidden';
    // a aba sumiu: o mundo para junto (como antes, quando tudo rodava no quadro)
    enviar({ t: 'pausar', pausar: escondida });
    // (saindo pelo jogo, o mundo acabou de ser salvo: nada de outra gravação na troca)
    if (escondida && !saindoPorConta()) void salvar();
  });
  // saída pedida pelo jogo (trocar de mundo, ir para a sala): o mundo já foi salvo antes, e
  // uma gravação a mais no meio da troca de página pode segurar o banco da página nova no iPhone
  window.addEventListener('pagehide', () => {
    if (!saindoPorConta()) salvarJa();
  });
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== canvas && !saindoPorConta()) void salvar();
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
    /** O mundo como está agora (para levar para a nuvem). */
    dadosAtuais: () => coletarDados(),
    /** O que é só do jogador (diário, mapa): vai junto com ele na nuvem. */
    extrasDoCliente() {
      const out: Record<string, unknown> = {};
      for (const [k, sv] of salvaveis) out[k] = sv.salvar();
      return out;
    },
    /** Voltou de uma queda de internet: confere as previsões que ficaram. */
    reconferir: () => cliente.reconferir(),
    /** Usa um bloco pelo núcleo (porta, baú, fornalha, cama). */
    usarBloco(x: number, y: number, z: number) {
      pedirUso(x, y, z);
    },
    /** Fecha o baú ou a fornalha aberta (manda antes o que a tela mudou). */
    fecharConteiner() {
      // fecha o aberto e cancela o que ainda está chegando
      const havia = !!conteinerAberto() || ultimaAbertura > 0;
      sincronia.fechar(ultimaAbertura);
      ultimaAbertura = 0;
      if (havia) enviar({ t: 'fecharConteiner' });
    },
    /** Liga o cursor e a grade de criação às transações de itens. */
    definirTransito(f: {
      ler(i: number): Slot;
      gravar(i: number, p: Slot): void;
      tamanho: number;
    }) {
      sincronia.definirTransito(f);
    },
    /** A grade de criação fez uma receita (vai com a transação, para a nuvem conferir). */
    registrarFabricacao(receita: string) {
      sincronia.fabricou(receita);
    },
    /** Pede uma troca ao morador (o inventário novo chega do núcleo). */
    trocar(criatura: number, profissao: Profissao, troca: string) {
      sincronia.verificar();
      enviarTelemetria(true);
      enviar({ t: 'trocar', criatura, profissao, troca });
    },
    registrarSalvavel(chave: string, s: Salvavel) {
      salvaveis.set(chave, s);
    },
    extrasSalvos: (chave: string): unknown => dadosIniciais?.extras?.[chave],
  };
}
