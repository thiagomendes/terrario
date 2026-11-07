/**
 * Mensagens entre o navegador e o servidor da nuvem (spec 010), por fora das do núcleo:
 * entrar num mundo pelo código, criar um mundo na nuvem, o painel do dono e as recusas.
 * Depois do "bem-vindo", o que passa são os comandos e quadros do núcleo de sempre.
 */
import type { DadosMundo, ModoJogo } from '../jogo/mundos';
import type { EstiloMundo } from '../temas/tipos';
import type { Comando, Mensagem } from '../nucleo/protocolo';

/** Sobe quando estas mensagens mudam de formato. */
export const VERSAO_REDE = 1;
/** Jogadores por mundo. */
export const MAX_JOGADORES = 8;

/** Quem joga: identidade anônima do aparelho (a chave nunca sai do navegador, só o pedido). */
export interface Identidade {
  id: string;
  chave: string;
  apelido: string;
  aparencia: Record<string, unknown>;
}

/** O que define um mundo na nuvem. */
export interface MundoNuvem {
  id: string;
  nome: string;
  semente: number;
  tema: string;
  modo: ModoJogo;
  versaoMundo: number;
  estilo: EstiloMundo;
}

export type PedidoCliente =
  | {
      t: 'entrar';
      versao: number;
      jogador: Identidade;
      /** Entrar num mundo que já existe. */
      codigo?: string;
      /** Ou criar um (com os dados de um mundo local, para levar para a nuvem). */
      criar?: Omit<MundoNuvem, 'id'> & { dados?: DadosMundo };
    }
  | { t: 'dono'; acao: 'expulsar'; id: string }
  | { t: 'dono'; acao: 'trocarCodigo' }
  | { t: 'dono'; acao: 'fechar'; fechado: boolean }
  | { t: 'dono'; acao: 'construir'; pode: boolean }
  /** Diário e mapa do jogador (guardados com os dados dele neste mundo). */
  | { t: 'guardar'; dados: unknown }
  | Comando;

export type MotivoRecusa =
  | 'codigo'
  | 'cheio'
  | 'fechado'
  | 'expulso'
  | 'versao'
  | 'limite'
  | 'identidade'
  | 'erro';

/** Estado da sala que o dono controla (todos recebem). */
export interface EstadoSala {
  codigo: string;
  fechado: boolean;
  constroem: boolean;
  dono: string;
}

export type RespostaServidor =
  | {
      t: 'bemvindo';
      mundo: MundoNuvem;
      sala: EstadoSala;
      voce: string;
      /** Muda quando a sala é aberta de novo (servidor recomeçou): o navegador recarrega. */
      instancia?: string;
      /** Diário e mapa deste jogador neste mundo. */
      guardado?: unknown;
      /** Edições de blocos do mundo e regiões sem povoado (o navegador monta o terreno igual). */
      edicoes: Record<string, Array<[number, number]>>;
      semPovoado: string[];
      /** Onde este jogador estava (ou o nascimento). */
      pos: { x: number; y: number; z: number; yaw: number; pitch: number };
    }
  | { t: 'recusado'; motivo: MotivoRecusa }
  | { t: 'sala'; sala: EstadoSala }
  | { t: 'expulso' }
  | Mensagem;
