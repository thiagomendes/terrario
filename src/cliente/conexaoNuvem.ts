import type { DadosMundo } from '../jogo/mundos';
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

/** 'encerrada': o dono parou de jogar com amigos (a sala acabou). */
export type EstadoConexao =
  | 'conectando'
  | 'conectado'
  | 'reconectando'
  /**
   * Spec 035: a rede de segurança trocou a conexão por outra (o estado do cliente travou).
   * A internet não caiu: a página não mostra o aviso de queda nem o "Voltamos!".
   */
  | 'ressincronizando'
  | 'recusado'
  | 'expulso'
  | 'encerrada'
  /** O mesmo jogador abriu o mundo em outra aba ou aparelho. */
  | 'substituido';

export type BemVindo = Omit<Extract<RespostaServidor, { t: 'bemvindo' }>, 't'>;

export interface ConexaoNuvem extends Conexao {
  /** Primeiro "bem-vindo" (o mundo a abrir). */
  readonly pronta: Promise<BemVindo>;
  readonly estado: EstadoConexao;
  aoEstado(f: (e: EstadoConexao, motivo?: MotivoRecusa) => void): void;
  aoSala(f: (s: EstadoSala) => void): void;
  /** O mundo voltou para este aparelho (o dono parou de jogar com amigos). */
  aoDevolvido(f: (dados: DadosMundo) => void): void;
  /** O servidor recomeçou e abriu a sala de novo (o que está na tela pode estar à frente). */
  aoReaberta(f: () => void): void;
  /**
   * Spec 035: cada bem-vindo depois do primeiro (a volta de uma queda ou de uma
   * ressincronização), antes de qualquer quadro da conexão nova. A sala reaberta não conta.
   */
  aoBemVindo(f: (bv: BemVindo) => void): void;
  /** Painel do dono e o diário/mapa do jogador. */
  pedir(p: PedidoCliente): void;
  ressincronizar(): void;
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
/**
 * Spec 035: teto da fila do que chega antes de alguém ouvir (10 s de quadros). Protege as
 * conexões que nunca ouvem quadros (a de criar a sala, a de parar de jogar com amigos).
 */
const TETO_FILA = 200;
/** Spec 035: a ressincronização sem bem-vindo por este tempo vira uma queda de verdade. */
const PRAZO_RESSINCRONIZAR = 5000;
/** Código do fechamento da ressincronização (aparece no registro do servidor). */
const FECHA_RESSINCRONIZAR = 4001;

export function conexaoNuvem(op: OpcoesNuvem): ConexaoNuvem {
  const ouvintes: ((m: Mensagem) => void)[] = [];
  const ouvintesEstado: ((e: EstadoConexao, motivo?: MotivoRecusa) => void)[] = [];
  const ouvintesDevolvido: ((dados: DadosMundo) => void)[] = [];
  const ouvintesSala: ((s: EstadoSala) => void)[] = [];
  const ouvintesReaberta: (() => void)[] = [];
  const ouvintesBemVindo: ((bv: BemVindo) => void)[] = [];
  /** O prazo da ressincronização em andamento (5 s até o bem-vindo). */
  let prazoRessinc: ReturnType<typeof setTimeout> | undefined;
  let instancia: string | undefined;
  let primeira = true;
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

  /**
   * Spec 035: as mensagens do núcleo que chegam antes de alguém ouvir (o bem-vindo vem e o
   * `primeiro` quadro logo atrás, enquanto a página ainda monta a cena) esperam aqui, em vez de
   * sumir. O primeiro `aoReceber` recebe tudo, em ordem, logo depois que ele volta.
   */
  const fila: Mensagem[] = [];
  /** A fila foi entregue ao primeiro ouvinte e ainda não esvaziou: o que chega vai para o fim. */
  let entregando = false;

  function chegou(m: Mensagem): void {
    if (ouvintes.length === 0 || entregando) {
      fila.push(m);
      if (fila.length > TETO_FILA) fila.shift();
      return;
    }
    for (const f of ouvintes) f(m);
  }

  function esvaziarFila(): void {
    // relê o tamanho a cada volta: um `encerrar()` no meio esvazia a fila e para o laço
    while (fila.length > 0) {
      const m = fila.shift()!;
      try {
        for (const f of ouvintes) f(m);
      } catch (e) {
        console.error('conexão: erro ao entregar uma mensagem guardada', e);
      }
    }
    entregando = false;
  }

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
      // conexão velha (já trocada por outra): nada do que ela diz vale
      if (ws !== s) return;
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
        clearTimeout(prazoRessinc);
        mudar('conectado');
        const { t: _t, ...bv } = m;
        void _t;
        const volta = !primeira;
        const reaberta = volta && m.instancia !== undefined && m.instancia !== instancia;
        primeira = false;
        instancia = m.instancia;
        resolver(bv);
        if (reaberta) {
          for (const f of ouvintesReaberta) f();
          return;
        }
        for (const c of guardados.splice(0)) mandar(c);
        for (const f of ouvintesSala) f(m.sala);
        // a volta: a página acerta o que mudou no mundo com ela fora (os quadros vêm depois)
        if (volta) for (const f of ouvintesBemVindo) f(bv);
      } else if (m.t === 'recusado') {
        encerrada = true;
        mudar('recusado', m.motivo);
        rejeitar(new Error(m.motivo));
      } else if (m.t === 'expulso') {
        encerrada = true;
        mudar('expulso');
      } else if (m.t === 'encerrada') {
        encerrada = true;
        mudar('encerrada');
      } else if (m.t === 'substituido') {
        encerrada = true;
        mudar('substituido');
      } else if (m.t === 'devolvido') {
        encerrada = true;
        for (const f of ouvintesDevolvido) f(m.dados);
      } else if (m.t === 'sala') {
        codigo = m.sala.codigo;
        for (const f of ouvintesSala) f(m.sala);
      } else chegou(m);
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

  /** Spec 035: troca a conexão de pé por outra, na hora, sem o aviso de queda. */
  function ressincronizar(): void {
    if (encerrada || estado !== 'conectado') return;
    const velha = ws;
    // solta a velha antes de fechar: o `onclose` dela não agenda outra conexão, e o que ela
    // ainda disser não vale (`ws !== s`)
    ws = null;
    mudar('ressincronizando');
    velha?.close(FECHA_RESSINCRONIZAR);
    abrir();
    clearTimeout(prazoRessinc);
    prazoRessinc = setTimeout(() => {
      if (encerrada || estado !== 'ressincronizando') return;
      // 5 s sem bem-vindo: a internet caiu mesmo; o aviso e a reconexão de sempre
      const presa = ws;
      ws = null;
      presa?.close();
      mudar('reconectando');
      const espera = ESPERAS[Math.min(tentativa++, ESPERAS.length - 1)];
      setTimeout(abrir, espera);
    }, PRAZO_RESSINCRONIZAR);
  }

  return {
    pronta,
    get estado() {
      return estado;
    },
    enviar: (c) => mandar(c),
    pedir: (p) => mandar(p),
    aoReceber: (f) => {
      ouvintes.push(f);
      // o primeiro ouvinte leva a fila, logo depois de voltar (nunca dentro: a cena ainda
      // termina de montar o `cliente` quando liga o estado)
      if (ouvintes.length === 1 && fila.length > 0 && !entregando) {
        entregando = true;
        queueMicrotask(esvaziarFila);
      }
    },
    aoEstado: (f) => {
      ouvintesEstado.push(f);
    },
    aoSala: (f) => {
      ouvintesSala.push(f);
    },
    aoReaberta: (f) => {
      ouvintesReaberta.push(f);
    },
    aoDevolvido: (f) => {
      ouvintesDevolvido.push(f);
    },
    aoBemVindo: (f) => {
      ouvintesBemVindo.push(f);
    },
    ressincronizar,
    encerrar() {
      encerrada = true;
      clearTimeout(prazoRessinc);
      fila.length = 0;
      // 1000: saiu normalmente (o registro do servidor não conta como queda)
      ws?.close(1000);
    },
  };
}
