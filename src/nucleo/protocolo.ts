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

export type Comando =
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
  /** Usar um bloco: porta, baú, fornalha, cama. */
  | { t: 'usar'; x: number; y: number; z: number }
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
  | { f: 'dano'; qtd: number; causa: CausaDano };

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

export type ConteinerVisto =
  | { tipo: 'bau'; x: number; y: number; z: number; slots: Slot[] }
  | { tipo: 'fornalha'; x: number; y: number; z: number; fornalha: EstadoFornalha };

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
  | { e: 'trocaRecusada'; motivo: string };

/** O que o núcleo manda a cada passo (só os campos que mudaram, menos o ambiente). */
export interface Quadro {
  t: 'quadro';
  n: number;
  /** Último comando com id que o núcleo já processou (confirma as previsões do cliente). */
  ack: number;
  ambiente: Ambiente;
  blocos?: BlocoMudado[];
  criaturas?: CriaturaVista[];
  itens?: ItemVisto[];
  /** Inventário inteiro quando muda (36 slots), com a última transação já aplicada. */
  inventario?: { slots: Slot[]; ackTransacao: number };
  /** Contêiner aberto (null: fechou). */
  conteiner?: ConteinerVisto | null;
  sobrevivencia?: EstadoSobrevivencia;
  eventos?: EventoNucleo[];
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
