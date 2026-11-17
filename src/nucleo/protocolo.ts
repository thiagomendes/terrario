/**
 * Protocolo entre o cliente (desenho, som, controles) e o núcleo (o mundo e as regras).
 *
 * Tudo aqui é dado puro e serializável: as mesmas mensagens passam por um Web Worker
 * (servidor local, spec 009) ou por um WebSocket (servidor na nuvem, spec 010).
 * O cliente nunca altera o mundo direto: manda comandos; o núcleo aplica as regras e
 * devolve o que mudou num "quadro" a cada passo (20 por segundo).
 */
import type { RecusaProtecao } from '../jogo/permissao';
import type { Pilha, Slot } from '../jogo/inventario';
import type { EstadoClima, TipoClima } from '../jogo/clima';
import type { EstadoSobrevivencia, CausaDano } from '../jogo/sobrevivencia';
import type { EstadoFornalha } from '../jogo/fornalha';
import type { DadosMundo, ModoJogo } from '../jogo/mundos';
import type { EstiloMundo } from '../temas/tipos';
import type { TipoSer } from '../jogo/criaturas';
import type { Profissao } from '../world/povoado';
import type { IdGesto } from '../personagem/gestos';
import type { DonosExportados, DonosMudados } from '../world/edicoes';
import type { PlanoVeiculo } from '../jogo/veiculos';
import type { OcorrenciaVeiculo } from '../jogo/transito';
import type { Ganho, MissaoMovida, RecusaBanca, VistaAlmaMundo } from '../jogo/alma';
import type { EventoVila, VilaVista } from './vila';
import type { BateVista } from '../jogo/bate';

/** Sobe quando uma mensagem muda de formato (cliente e servidor precisam concordar). */
export const VERSAO_PROTOCOLO = 1;
/** Passo fixo da simulação, em segundos (20 passos por segundo). */
export const PASSO = 0.05;
/** Segundos entre duas voltas para casa (spec 016: curto, só para não virar teletransporte). */
export const ESPERA_VOLTA_CASA = 8;

export interface Pos {
  x: number;
  y: number;
  z: number;
}

/**
 * Bloco que mudou: valor empacotado (bloco | meta << 8 | dono << 16), como nas edições. O
 * dono (spec 016) é o índice na tabela de donos do mundo (0: o dono do mundo); o cliente
 * nunca manda dono: o núcleo põe o de quem mandou o comando.
 */
export interface BlocoMudado {
  x: number;
  y: number;
  z: number;
  v: number;
}

/** O que o cliente sabe do próprio corpo (a física do jogador roda nele, para responder na hora). */
export interface Telemetria {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  /** Altura dos olhos (submerso, alcance). */
  olhos: number;
  noChao: boolean;
  voando: boolean;
  /** Velocidade horizontal (blocos por segundo). */
  vel: number;
  correndo: boolean;
  /** Olhos dentro da água. */
  submerso: boolean;
  /** Quedas desde a última telemetria (altura de cada aterrissagem). */
  quedas: number[];
  /** Pulos desde a última telemetria (cansam na sobrevivência). */
  pulos: number;
  /** Golpes desde a última telemetria (minerar e bater cansam). */
  golpes: number;
  /** Slot da barra na mão. */
  slot: number;
  /** Raio de chunks que o cliente tem carregados (criaturas só nascem onde ele vê). */
  raio?: number;
}

/** Lugar de um slot numa transação. */
export type LocalSlot = 'inv' | 'bau' | 'forn' | 'tr';

/** Uma mudança de slot vista pelo cliente: o núcleo só aceita se `antes` ainda é o atual. */
export interface MudancaSlot {
  onde: LocalSlot;
  i: number;
  antes: Slot;
  depois: Slot;
}

/** Comando numerado: o anfitrião aplica na ordem de `seq`, mesmo que cheguem trocados. */
export type Comando = ComandoSemSeq & { seq?: number };

type ComandoSemSeq =
  | ({ t: 'jogador' } & Telemetria)
  | { t: 'quebrar'; id: number; x: number; y: number; z: number; slot: number }
  /** Enxada (no slot) na grama ou na terra: vira terra arada (spec 013). */
  | { t: 'arar'; id: number; x: number; y: number; z: number; slot: number }
  | {
      t: 'colocar';
      id: number;
      x: number;
      y: number;
      z: number;
      bloco: number;
      meta: number;
      slot: number;
      /** Partes extras do mesmo bloco (metade de cima da porta). */
      extras?: Pos[];
    }
  /** Vários blocos de uma vez (ferramentas de construção, desfazer, espelho): só no criativo. */
  | { t: 'editar'; id: number; lote: BlocoMudado[] }
  /** Usar um bloco: porta, baú, fornalha, cama (id: a porta é prevista na tela). */
  | { t: 'usar'; id?: number; x: number; y: number; z: number }
  | { t: 'fecharConteiner' }
  | {
      t: 'transacao';
      id: number;
      mudancas: MudancaSlot[];
      /** Receitas feitas nesta transação (o núcleo confere a conta dos itens). */
      fabricou?: { receita: string; vezes: number }[];
    }
  /** Itens que saem das mãos do jogador para o chão (o que não coube, jogar fora). */
  | {
      t: 'soltar';
      itens: Pilha[];
      x: number;
      y: number;
      z: number;
      /**
       * Jogado de propósito (dar a um amigo): sai para a frente do boneco (yaw do corpo) e
       * quem jogou só pega de volta depois de um tempinho.
       */
      jogar?: { yaw: number; /** Slot da mochila de onde sai (Q: o da mão). */ slot?: number };
    }
  | { t: 'atacar'; criatura: number; slot: number }
  | { t: 'domar'; criatura: number; slot: number }
  /** Dar a comida da mão (slot) a um bicho: ele vira criado (spec 013). */
  | { t: 'alimentar'; criatura: number; slot: number }
  /** Falar com um morador: ele vira para o jogador. */
  | { t: 'falar'; criatura: number }
  | { t: 'trocar'; criatura: number; profissao: Profissao; troca: string }
  | { t: 'comer'; slot: number }
  | { t: 'renascer' }
  /**
   * Spec 016: "Voltar para casa" (a cama ou o ponto de nascer), para a criança que ficou
   * presa (cercada por blocos dos amigos, com o dono fora). O núcleo leva; tem um intervalo.
   */
  | { t: 'voltarCasa' }
  | { t: 'salvar'; pedido: number }
  /** Depois de uma queda: o valor oficial destas células (as previsões que ficaram). */
  | { t: 'conferir'; id: number; celulas: Pos[] }
  /** Servidor local: a aba sumiu (ou voltou); o mundo para junto, como antes. */
  | { t: 'pausar'; pausar: boolean }
  | { t: 'depurar'; d: Depuracao }
  /** O jogador trocou a aparência no meio do jogo: os amigos passam a ver a nova. */
  | { t: 'aparencia'; aparencia: Record<string, unknown> }
  /** Spec 015: um gesto da roda (os amigos veem; o morador perto responde; chamar traz bichos). */
  | { t: 'gesto'; id: number; gesto: IdGesto }
  /**
   * Spec 021: pular para perto do amigo `alvo` (o id dele). O núcleo confere o intervalo, o
   * combate e o lugar seguro (a proteção da 016) e leva; sem lugar, recusa 'pularPerto'.
   */
  | { t: 'pularPerto'; alvo: string }
  /** Spec 021: "vem cá!" para a sala toda (no máximo 1 a cada ESPERA_CHAMAR s). */
  | { t: 'chamarAmigos' }
  /** Spec 023: escolhe a missão do cartão do HUD (uma aberta; null: a primeira). */
  | { t: 'almaFixar'; missao: string | null }
  /**
   * Spec 023: comprar na banca do mundo. `saldo`: as moedinhas que o aparelho tem (a carteira
   * mora nele até a 024); o núcleo confere o tema, o saldo, o intervalo e o limite, entrega
   * e responde `almaCompra` (só então o aparelho desconta) ou `almaCompraRecusada`.
   */
  | { t: 'comprarBanca'; item: string; saldo: number }
  /**
   * Spec 026 (Vila Neon): tocar numa caixa do palco (`i`, 0 a 2), o brinquedo fora do show. O
   * núcleo confere o lugar, o show e o limite de toques por segundo.
   */
  | { t: 'vila'; a: 'caixa'; i: number }
  /**
   * Spec 026 (parte 2, o parque): sentar num brinquedo (`b`: 0 a roda-gigante, 1 o carrossel, 2 o
   * bate-bate; o núcleo escolhe a cadeira livre), sair dele e o empurrãozinho na roda-gigante. O
   * núcleo confere o alcance e o limite de toques por segundo.
   */
  | { t: 'vila'; a: 'sentar'; b: number }
  | { t: 'vila'; a: 'sair' | 'roda' }
  /**
   * Spec 026 (parte 2, o bate-bate de guiar): o controle do carrinho da criança, a cada passo
   * enquanto ela guia. `x` e `z` são o rumo no mundo (inteiros de -100 a 100: a força do
   * controle) e `n` o número do controle (só cresce; volta no quadro `bate`, para a tela acertar
   * a previsão). O núcleo confere que ela está num carrinho, o limite por segundo e a fila.
   */
  | { t: 'vila'; a: 'guiar'; x: number; z: number; n: number }
  /**
   * Spec 026 (parte 2, etapa B): as missões do parque e os toques da Rua anos 80. O toque num
   * balão fugido (`i`, 0 a 2), numa barraca de prendas (`i`: 0 a argola, 1 a pescaria), no fardo
   * de feno, no cocho da fazendinha, na parede de fitas da locadora e no balcão da lanchonete. O
   * núcleo confere a missão aberta, o alcance e o limite de toques por segundo.
   */
  | { t: 'vila'; a: 'balao' | 'prenda'; i: number }
  | { t: 'vila'; a: 'feno' | 'cocho' | 'fita' | 'vitamina' };

/** Atalhos de teste e captura (o servidor da nuvem só aceita em ambiente de testes). */
export type Depuracao =
  | {
      f: 'invocar';
      tipo: TipoSer;
      x: number;
      y: number;
      z: number;
      /** Spec 015 (testes): já nasce criado, ou domado (raposa). */
      criado?: boolean;
      domada?: boolean;
    }
  | { f: 'clima'; tipo: TipoClima }
  | { f: 'dia'; dia: number }
  | { f: 'hora'; hora: number }
  | { f: 'pausarDia'; pausar: boolean }
  | { f: 'soltarItem'; item: string; qtd: number; x: number; y: number; z: number; dur?: number }
  | { f: 'spawn'; x: number; z: number }
  | { f: 'dano'; qtd: number; causa: CausaDano }
  /** Põe o kit de blocos na barra (os testes que constroem; o jogo começa com ela vazia). */
  | { f: 'kit' }
  /** A lavoura avança como se tantos segundos tivessem passado (até 1 hora). */
  | { f: 'crescer'; segundos: number }
  /** Spec 026 (testes e vídeos): o show tocando pula para `s` s desde o começo dele. */
  | { f: 'pularShow'; s: number };

/** O que é de cada jogador num mundo de vários (salvo à parte do mundo). */
export interface DadosJogador {
  inventario: unknown;
  sobrevivencia: EstadoSobrevivencia;
  spawn: { x: number; z: number };
  pos?: { x: number; y: number; z: number; yaw: number; pitch: number };
}

/** Como os outros veem um jogador: apelido e aparência (o personagem). */
export interface PerfilJogador {
  apelido: string;
  aparencia: Record<string, unknown>;
}

/** Outro jogador no mundo, como o cliente o desenha. */
export interface JogadorVisto {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  vel: number;
  voando: boolean;
  noChao: boolean;
  correndo: boolean;
  /** Item na mão (o que ele segura e mostra). */
  mao: string | null;
  /**
   * Quantas vezes ele golpeou, colocou bloco e comeu desde que entrou (sempre sobe). Quem vê
   * o amigo dispara o movimento quando um número cresce.
   */
  acoes?: [number, number, number];
}

/** Criatura como o cliente a desenha. */
export interface CriaturaVista {
  id: number;
  tipo: TipoSer;
  x: number;
  y: number;
  z: number;
  yaw: number;
  estado: 'vagar' | 'parado' | 'fugir' | 'perseguir' | 'seguir' | 'morrendo';
  dissolver: number;
  noChao: boolean;
  ferida: number;
  domada: boolean;
  vida: number;
  /** Spec 013: bicho criado (ganhou comida; não some e é salvo). */
  criado?: boolean;
  /** Spec 016: id de quem criou ou domou (sem o campo: o dono do mundo). */
  dono?: string;
  /** Só moradores: povoado, número e profissão (nome e roupa saem disso). */
  morador?: { povoado: string; n: number; profissao: Profissao };
}

export interface ItemVisto {
  id: number;
  item: string;
  qtd: number;
  x: number;
  y: number;
  z: number;
}

export interface Ambiente {
  hora: number;
  dia: number;
  clima: EstadoClima;
  pausado: boolean;
}

/** Contêiner aberto; `abertura` é o id do comando que abriu (reabrir é outra abertura). */
export type ConteinerVisto =
  | { tipo: 'bau'; abertura: number; x: number; y: number; z: number; slots: Slot[] }
  | {
      tipo: 'fornalha';
      abertura: number;
      x: number;
      y: number;
      z: number;
      fornalha: EstadoFornalha;
    };

/** Fatos do mundo para som, efeitos, avisos e diário. */
export type EventoNucleo =
  /** Spec 026: o acorde no palco, o acorde final, o estojo achado, a caixa, a lhama, o pôster. */
  | EventoVila
  | { e: 'quebra'; x: number; y: number; z: number; bloco: number; meu: boolean }
  | { e: 'colocacao'; x: number; y: number; z: number; bloco: number; meu: boolean }
  /**
   * Motivos: 'quebrar', 'colocar', 'arar', 'semente' (semente fora da terra arada), 'usar',
   * 'editar', 'chamar', 'alimentar', 'visitante'. Spec 016: `protecao` diz de quem é (o
   * cliente mostra o aviso de criança).
   */
  | { e: 'recusa'; comando: number; motivo: string; protecao?: RecusaProtecao }
  /** Plantio (spec 013): som, efeito e diário. */
  | { e: 'arou'; x: number; y: number; z: number; meu: boolean }
  | { e: 'plantou'; x: number; y: number; z: number; bloco: number }
  | { e: 'colheu'; x: number; y: number; z: number; bloco: number; madura: boolean; meu: boolean }
  /** Uma planta perto deste jogador ficou madura (brilhinho e som curto). */
  | { e: 'amadureceu'; x: number; y: number; z: number; bloco: number }
  | { e: 'porta'; x: number; y: number; z: number }
  | { e: 'coletou'; item: string; qtd: number }
  | { e: 'ferramentaQuebrou'; item: string }
  | { e: 'criaturaFerida'; id: number; tipo: TipoSer }
  | { e: 'criaturaMorreu'; id: number; tipo: TipoSer; drops: boolean }
  | { e: 'criaturaSom'; id: number; tipo: TipoSer }
  /** Uma criatura acertou este jogador (o cliente dá o empurrão). */
  | { e: 'ataque'; dano: number }
  | { e: 'domou'; id: number; tipo: TipoSer }
  /** Criação (spec 013): alguém deu comida a um bicho (novo: virou criado agora). */
  | {
      e: 'alimentou';
      id: number;
      tipo: TipoSer;
      x: number;
      y: number;
      z: number;
      novo: boolean;
      meu: boolean;
    }
  | { e: 'criacaoRecusada'; motivo: 'limite'; aviso: string }
  | { e: 'botouOvo'; id: number; x: number; y: number; z: number }
  /** A criatura da noite mansa fugiu deste jogador (o diário conta como espantar). */
  | { e: 'espantou'; id: number; tipo: TipoSer }
  | { e: 'comeu'; item: string }
  | { e: 'dano'; causa: CausaDano; qtd: number }
  | { e: 'morte'; causa: CausaDano }
  /** Levar o jogador a (x, z); y indefinido = topo livre do terreno. */
  | {
      e: 'teleporte';
      x: number;
      z: number;
      y?: number;
      /** Spec 021: foi o pulo para perto deste amigo (o puf, virar para ele e acenar). */
      pulo?: string;
    }
  /** Spec 021: um amigo chamou ("vem cá!"); a carinha dele vem para a frente. */
  | { e: 'chamado'; de: string }
  | { e: 'relampago'; atrasoTrovao: number }
  | { e: 'sono'; dormiu: boolean }
  | { e: 'acordou' }
  | { e: 'trocou'; profissao: Profissao; troca: string }
  | { e: 'entrou'; id: string; apelido: string }
  | { e: 'saiu'; id: string; apelido: string }
  /** Deitou, mas a noite só passa quando todos deitarem. */
  | { e: 'sonoEspera'; faltam: number }
  | { e: 'trocaRecusada'; motivo: string }
  /**
   * Spec 015: alguém fez um gesto perto deste jogador: um amigo (`jogador`) ou um morador
   * respondendo (`criatura`; `voz`: este diz "oi"). Quem fez o gesto não recebe o dele.
   */
  | { e: 'gesto'; gesto: IdGesto; jogador?: string; criatura?: number; voz?: boolean }
  /**
   * Spec 014 (T05): a obra do canteiro andou. Cada bloco que entra (x, y, z: a célula; `meu`:
   * foi este jogador; `camada`: fechou uma camada) e, ao terminar (`feita`), os nomes da
   * placa (até 4); quem ajudou recebe `ajudou` e as peças de fantasia ganhas (`recompensa`).
   */
  | {
      e: 'obra';
      canteiro: number;
      cheias: number;
      total: number;
      x?: number;
      y?: number;
      z?: number;
      meu?: boolean;
      camada?: boolean;
      feita?: boolean;
      nomes?: string[];
      ajudou?: boolean;
      recompensa?: string[];
    }
  /** Spec 014 (T05): o pedreiro deu a colher (no slot): ela fica na mão. */
  | { e: 'colher'; slot: number }
  /**
   * Spec 014 (T13): um veículo da cidade buzinou (esperando criança), chegou ao ponto (freio a
   * ar e porta aberta), saiu dele, o sorvete chegou à vaga, a polícia fez "uí-uí" na praça ou
   * o veículo encalhado sumiu num sopro (x, z: onde).
   */
  | { e: 'veiculo'; id: number; o: OcorrenciaVeiculo; x: number; z: number }
  /**
   * Spec 023: a alma deste jogador neste mundo, só para ele. `ganho`: o que o núcleo decidiu
   * que ele ganhou neste quadro (o aparelho soma ao perfil da criança e faz a festa; os
   * presentes de nível saem do XP pela regra pura). `missoes`: as que andaram, terminaram
   * (`concluiu`, com a `fantasia` de prêmio) ou passaram sem prêmio (`pulou`). `quadro`: o
   * quadro de missões inteiro, ao entrar e quando as abertas, a fixada ou o baú mudam.
   */
  | { e: 'alma'; missoes: MissaoMovida[]; ganho: Ganho; quadro?: VistaAlmaMundo }
  /**
   * Spec 023: a compra da banca foi entregue (o aparelho desconta `preco` agora). `guardado`:
   * quanto não coube na mochila e espera no baú da banca (entra sozinho quando couber).
   */
  | { e: 'almaCompra'; item: string; preco: number; guardado?: number }
  /** Spec 023: a banca não vendeu (tema, saldo, espera, limite, cheio ou galinha). */
  | { e: 'almaCompraRecusada'; item: string; motivo: RecusaBanca };

/**
 * Spec 014 (T13): os veículos da cidade. Todo quadro da cidade leva o relógio deles (`t`); os
 * planos (`p`) vão inteiros no primeiro quadro de quem chega e, depois, só os que mudaram.
 */
export interface VeiculosQuadro {
  t: number;
  p?: PlanoVeiculo[];
}

/** O que o núcleo manda a cada passo (só os campos que mudaram, menos o ambiente). */
export interface Quadro {
  t: 'quadro';
  n: number;
  /** Primeiro quadro deste jogador: a sequência começa aqui. */
  primeiro?: boolean;
  /** Último comando com id que o núcleo já processou (confirma as previsões do cliente). */
  ack: number;
  ambiente: Ambiente;
  blocos?: BlocoMudado[];
  criaturas?: CriaturaVista[];
  itens?: ItemVisto[];
  /**
   * Inventário inteiro quando muda (36 slots), com a última transação já aplicada; se
   * uma transação foi recusada, vem também o que está nas mãos (cursor e grade).
   */
  inventario?: { slots: Slot[]; ackTransacao: number; transito?: Slot[] };
  /** Contêiner aberto (null: fechou). */
  conteiner?: ConteinerVisto | null;
  sobrevivencia?: EstadoSobrevivencia;
  eventos?: EventoNucleo[];
  /** Os outros jogadores (posição e item na mão), em todo quadro. */
  jogadores?: JogadorVisto[];
  /** Apelido e aparência de todos, quando alguém entra ou muda. */
  perfis?: Record<string, PerfilJogador>;
  /**
   * Spec 016: tabela de donos do mundo inteira ([id, apelido] na ordem dos índices dos blocos),
   * no primeiro quadro (se tiver alguém) e quando muda.
   */
  donos?: DonosExportados;
  /**
   * Spec 016: só o que entrou ou mudou na tabela de donos desde o último quadro (quem já
   * tem a tabela não recebe as 4095 entradas de novo a cada amigo novo ou apelido trocado).
   */
  donosNovos?: DonosMudados;
  /** Spec 014 (T13): o relógio e os planos dos veículos (só na Cidade Grande). */
  veiculos?: VeiculosQuadro;
  /** Spec 026: o estado da Vila Neon (o show, os instrumentos, as caixas, as lhamas). */
  vila?: VilaVista;
  /**
   * Spec 026 (parte 2): os carrinhos do bate-bate que o núcleo simula, só para quem está perto
   * da pista (quem guia, a cada passo; quem olha, passo sim, passo não). O primeiro número é o
   * último controle `guiar` deste jogador que o núcleo já usou.
   */
  bate?: BateVista;
}

/** Parte do salvamento que pertence ao núcleo (o cliente junta a câmera, o diário e o mapa). */
export interface SalvoNucleo {
  edicoes: DadosMundo['edicoes'];
  hora: number;
  extras: Record<string, unknown>;
}

export type Mensagem =
  | Quadro
  | { t: 'salvo'; pedido: number; dados: SalvoNucleo }
  | { t: 'erro'; mensagem: string };

/** Primeira mensagem do cliente para o servidor local: o mundo a abrir. */
export interface Inicio {
  t: 'inicio';
  versao: number;
  semente: number;
  modo: ModoJogo;
  versaoMundo: number;
  estilo: EstiloMundo;
  dados?: DadosMundo;
}
