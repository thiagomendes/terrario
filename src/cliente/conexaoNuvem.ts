/**
 * Conexão com o servidor da nuvem (spec 010): o mesmo contrato da conexão local, por
 * WebSocket. Entra (ou cria) o mundo, renumera os comandos a cada conexão, guarda o que
 * o jogador fez enquanto a internet caiu e reconecta sozinha, voltando ao mesmo lugar.
 */
import type { Comando, Mensagem } from '../nucleo/protocolo';
import {
  VERSAO_REDE,
  type EstadoSala,
  type Identidade,
  type MotivoRecusa,
  type PedidoCliente,
  type RespostaServidor,
} from '../rede/protocolo';
import type { Conexao } from './conexao';

export type EstadoConexao = 'conectando' | 'conectado' | 'reconectando' | 'recusado' | 'expulso';

export type BemVindo = Omit<Extract<RespostaServidor, { t: 'bemvindo' }>, 't'>;

export interface ConexaoNuvem extends Conexao {
  /** Primeiro "bem-vindo" (o mundo a abrir). */
  readonly pronta: Promise<BemVindo>;
  readonly estado: EstadoConexao;
  aoEstado(f: (e: EstadoConexao, motivo?: MotivoRecusa) => void): void;
  aoSala(f: (s: EstadoSala) => void): void;
  /** Painel do dono e o diário/mapa do jogador. */
  pedir(p: PedidoCliente): void;
}

export interface OpcoesNuvem {
  url: string;
  jogador: Identidade;
  codigo?: string;
  criar?: Extract<PedidoCliente, { t: 'entrar' }>['criar'];
  /** Para testes: cria o WebSocket. */
  abrir?: (url: string) => WebSocket;
}

/** Espera entre tentativas de reconexão (cresce até 8 s). */
const ESPERAS = [500, 1000, 2000, 4000, 8000];

export function conexaoNuvem(op: OpcoesNuvem): ConexaoNuvem {
  const ouvintes: ((m: Mensagem) => void)[] = [];
  const ouvintesEstado: ((e: EstadoConexao, motivo?: MotivoRecusa) => void)[] = [];
  const ouvintesSala: ((s: EstadoSala) => void)[] = [];
  let ws: WebSocket | null = null;
  let estado: EstadoConexao = 'conectando';
  let codigo = op.codigo;
  let criar = op.criar;
  let tentativa = 0;
  let encerrada = false;
  /** Número dos comandos nesta conexão (o servidor espera do 1, em ordem). */
  let seq = 0;
  /** Feito enquanto a internet caiu: vai assim que voltar (a telemetria não precisa). */
  const guardados: Comando[] = [];
  let resolver!: (b: BemVindo) => void;
  let rejeitar!: (e: Error) => void;
  const pronta = new Promise<BemVindo>((res, rej) => {
    resolver = res;
    rejeitar = rej;
  });

  const mudar = (e: EstadoConexao, motivo?: MotivoRecusa) => {
    estado = e;
    for (const f of ouvintesEstado) f(e, motivo);
  };

  function mandar(c: Comando | PedidoCliente): void {
    if (!ws || ws.readyState !== WebSocket.OPEN || estado !== 'conectado') {
      if (
        't' in c &&
        c.t !== 'jogador' &&
        c.t !== 'dono' &&
        c.t !== 'guardar' &&
        guardados.length < 500
      )
        guardados.push(c as Comando);
      return;
    }
    const comSeq = 'seq' in (c as Comando) ? { ...(c as Comando), seq: ++seq } : c;
    ws.send(JSON.stringify(comSeq));
  }

  function abrir(): void {
    if (encerrada) return;
    const s = op.abrir ? op.abrir(op.url) : new WebSocket(op.url);
    ws = s;
    seq = 0;
    s.onopen = () => {
      s.send(
        JSON.stringify({
          t: 'entrar',
          versao: VERSAO_REDE,
          jogador: op.jogador,
          codigo,
          criar,
        } satisfies PedidoCliente),
      );
    };
    s.onmessage = (ev: MessageEvent<string>) => {
      let m: RespostaServidor;
      try {
        m = JSON.parse(ev.data) as RespostaServidor;
      } catch {
        return;
      }
      if (m.t === 'bemvindo') {
        // criado uma vez: daqui em diante, reconectar é entrar pelo código
        criar = undefined;
        codigo = m.sala.codigo;
        tentativa = 0;
        mudar('conectado');
        const { t: _t, ...bv } = m;
        void _t;
        resolver(bv);
        for (const c of guardados.splice(0)) mandar(c);
        for (const f of ouvintesSala) f(m.sala);
      } else if (m.t === 'recusado') {
        encerrada = true;
        mudar('recusado', m.motivo);
        rejeitar(new Error(m.motivo));
      } else if (m.t === 'expulso') {
        encerrada = true;
        mudar('expulso');
      } else if (m.t === 'sala') {
        codigo = m.sala.codigo;
        for (const f of ouvintesSala) f(m.sala);
      } else for (const f of ouvintes) f(m);
    };
    s.onclose = () => {
      if (ws !== s) return;
      ws = null;
      if (encerrada) return;
      // caiu: tenta de novo, cada vez esperando um pouco mais
      mudar('reconectando');
      const espera = ESPERAS[Math.min(tentativa++, ESPERAS.length - 1)];
      setTimeout(abrir, espera);
    };
  }
  abrir();

  return {
    pronta,
    get estado() {
      return estado;
    },
    enviar: (c) => mandar(c),
    pedir: (p) => mandar(p),
    aoReceber: (f) => {
      ouvintes.push(f);
    },
    aoEstado: (f) => {
      ouvintesEstado.push(f);
    },
    aoSala: (f) => {
      ouvintesSala.push(f);
    },
    encerrar() {
      encerrada = true;
      ws?.close();
    },
  };
}
