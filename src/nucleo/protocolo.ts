/**
 * Protocolo entre o cliente (desenho, som, controles) e o núcleo (o mundo e as regras).
 *
 * Tudo aqui é dado puro e serializável: as mesmas mensagens passam por um Web Worker
 * (servidor local, spec 009) ou por um WebSocket (servidor na nuvem, spec 010).
 * O cliente nunca altera o mundo direto: manda comandos; o núcleo aplica as regras e
 * devolve o que mudou num "quadro" a cada passo (20 por segundo).
 */
import type { Pilha, Slot } from '../jogo/inventario';
import type { EstadoClima, TipoClima } from '../jogo/clima';
import type { EstadoSobrevivencia, CausaDano } from '../jogo/sobrevivencia';
import type { EstadoFornalha } from '../jogo/fornalha';
import type { DadosMundo, ModoJogo } from '../jogo/mundos';
import type { EstiloMundo } from '../temas/tipos';
import type { TipoSer } from '../jogo/criaturas';
import type { Profissao } from '../world/povoado';

/** Sobe quando uma mensagem muda de formato (cliente e servidor precisam concordar). */
export const VERSAO_PROTOCOLO = 1;
/** Passo fixo da simulação, em segundos (20 passos por segundo). */
export const PASSO = 0.05;

export interface Pos {
  x: number;
  y: number;
  z: number;
}

/** Bloco que mudou: valor empacotado (bloco | meta << 8), como nas edições. */
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
  | { t: 'soltar'; itens: Pilha[]; x: number; y: number; z: number }
  | { t: 'atacar'; criatura: number; slot: number }
  | { t: 'domar'; criatura: number; slot: number }
  /** Falar com um morador: ele vira para o jogador. */
  | { t: 'falar'; criatura: number }
  | { t: 'trocar'; criatura: number; profissao: Profissao; troca: string }
  | { t: 'comer'; slot: number }
  | { t: 'renascer' }
  | { t: 'salvar'; pedido: number }
  /** Depois de uma queda: o valor oficial destas células (as previsões que ficaram). */
  | { t: 'conferir'; id: number; celulas: Pos[] }
  /** Servidor local: a aba sumiu (ou voltou); o mundo para junto, como antes. */
  | { t: 'pausar'; pausar: boolean }
  | { t: 'depurar'; d: Depuracao };

/** Atalhos de teste e captura (o servidor da nuvem só aceita em ambiente de testes). */
export type Depuracao =
  | { f: 'invocar'; tipo: TipoSer; x: number; y: number; z: number }
  | { f: 'clima'; tipo: TipoClima }
  | { f: 'dia'; dia: number }
  | { f: 'hora'; hora: number }
  | { f: 'pausarDia'; pausar: boolean }
  | { f: 'soltarItem'; item: string; qtd: number; x: number; y: number; z: number; dur?: number }
  | { f: 'spawn'; x: number; z: number }
  | { f: 'dano'; qtd: number; causa: CausaDano }
  /** Põe o kit de blocos na barra (os testes que constroem; o jogo começa com ela vazia). */
  | { f: 'kit' };

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
  | { e: 'quebra'; x: number; y: number; z: number; bloco: number; meu: boolean }
  | { e: 'colocacao'; x: number; y: number; z: number; bloco: number; meu: boolean }
  | { e: 'recusa'; comando: number; motivo: string }
  | { e: 'porta'; x: number; y: number; z: number }
  | { e: 'coletou'; item: string; qtd: number }
  | { e: 'ferramentaQuebrou'; item: string }
  | { e: 'criaturaFerida'; id: number; tipo: TipoSer }
  | { e: 'criaturaMorreu'; id: number; tipo: TipoSer; drops: boolean }
  | { e: 'criaturaSom'; id: number; tipo: TipoSer }
  /** Uma criatura acertou este jogador (o cliente dá o empurrão). */
  | { e: 'ataque'; dano: number }
  | { e: 'domou'; id: number; tipo: TipoSer }
  | { e: 'comeu'; item: string }
  | { e: 'dano'; causa: CausaDano; qtd: number }
  | { e: 'morte'; causa: CausaDano }
  /** Levar o jogador a (x, z); y indefinido = topo livre do terreno. */
  | { e: 'teleporte'; x: number; z: number; y?: number }
  | { e: 'relampago'; atrasoTrovao: number }
  | { e: 'sono'; dormiu: boolean }
  | { e: 'acordou' }
  | { e: 'trocou'; profissao: Profissao; troca: string }
  | { e: 'entrou'; id: string; apelido: string }
  | { e: 'saiu'; id: string; apelido: string }
  /** Deitou, mas a noite só passa quando todos deitarem. */
  | { e: 'sonoEspera'; faltam: number }
  | { e: 'trocaRecusada'; motivo: string };

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
