import type { DadosMundo } from '../jogo/mundos';
/**
 * Conexão com o servidor da nuvem (spec 010): o mesmo contrato da conexão local, por
 * WebSocket. Entra (ou cria) o mundo, renumera os comandos a cada conexão, guarda o que
 * o jogador fez enquanto a internet caiu e reconecta sozinha, voltando ao mesmo lugar.
 */
import type { Comando, Mensagem, Quadro } from '../nucleo/protocolo';
import { substituivel } from '../jogo/plantio';
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
  readonly quedaNaRessincronizacao: boolean;
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
  /** Para testes: o relógio do prazo do reenvio, em ms. */
  agora?: () => number;
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
/**
 * Os comandos de bloco, que vão de novo na volta se o núcleo não confirmou: o núcleo confere
 * cada um outra vez (repetir o que já entrou é recusado e não muda nada).
 */
const REENVIAVEIS: ReadonlySet<string> = new Set(['colocar', 'quebrar', 'editar', 'arar']);
/** Teto dos que esperam confirmação (uns 5 s de construção sem parar). */
const MAX_SEM_CONFIRMACAO = 100;
/** Mais velho que isto não vai de novo (a criança já seguiu; o bloco de lá ficou para trás). */
const VALIDADE_REENVIO = 30_000;
/**
 * A rajada da volta (o reenvio e os guardados) sai em fatias, uma por segundo: o servidor
 * fecha a conexão de quem manda mais de 150 mensagens num segundo (`servidor/src/index.ts`),
 * contando o `entrar` e as 20 posições. Duas fatias que cheguem juntas, com as posições, ainda
 * ficam abaixo do limite.
 */
const FATIA = 50;
const INTERVALO_FATIA = 1000;

export function conexaoNuvem(op: OpcoesNuvem): ConexaoNuvem {
  const ouvintes: ((m: Mensagem) => void)[] = [];
  const ouvintesEstado: ((e: EstadoConexao, motivo?: MotivoRecusa) => void)[] = [];
  const ouvintesDevolvido: ((dados: DadosMundo) => void)[] = [];
  const ouvintesSala: ((s: EstadoSala) => void)[] = [];
  const ouvintesReaberta: (() => void)[] = [];
  const ouvintesBemVindo: ((bv: BemVindo) => void)[] = [];
  /** O prazo da ressincronização em andamento (5 s até o bem-vindo). */
  let prazoRessinc: ReturnType<typeof setTimeout> | undefined;
  /** A queda de agora veio do prazo da ressincronização (o estado não zera a conta por ela). */
  let quedaNaRessinc = false;
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
  /**
   * Os blocos postos e tirados que já saíram por uma conexão e que o núcleo ainda não confirmou
   * (o `ack` dos quadros). A conexão pode estar morta sem ninguém saber (o wi-fi que trocou de
   * antena): o navegador ainda vê `OPEN` e o que vai por ela some. Na volta, vão de novo, antes
   * dos guardados. Só os de bloco: o núcleo confere cada um outra vez (o que já entrou é
   * recusado sem mudar nada, e a recusa vem com o valor certo da célula), então repetir não dá
   * nada em dobro. `t`: quando saiu (o velho demais não vai de novo).
   */
  const semConfirmacao: { c: Comando; t: number }[] = [];
  /** Ids que foram de novo: a recusa deles (o que já tinha entrado) não toca o "não pode". */
  const reenviados = new Set<number>();
  /** A última posição mandada: na volta vai antes dos blocos (o alcance é conferido nela). */
  let ultimaTelemetria: Comando | null = null;
  /** A rajada da volta esperando a vez dela (em fatias); o que vem depois espera atrás. */
  const naVez: Comando[] = [];
  let proximaFatia: ReturnType<typeof setTimeout> | undefined;
  const relogio = op.agora ?? (() => Date.now());
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

  const aberta = () => !!ws && ws.readyState === WebSocket.OPEN && estado === 'conectado';

  function guardar(c: Comando | PedidoCliente): void {
    if (
      't' in c &&
      c.t !== 'jogador' &&
      c.t !== 'dono' &&
      c.t !== 'guardar' &&
      guardados.length < 500
    )
      guardados.push(c as Comando);
  }

  function mandar(c: Comando | PedidoCliente): void {
    if ('t' in c && c.t === 'jogador') ultimaTelemetria = c;
    if (!aberta()) return guardar(c);
    // a rajada da volta ainda saindo: o comando novo espera atrás dela (a ordem vale; a posição
    // e os pedidos ao servidor não esperam)
    if (naVez.length && 'seq' in c && c.t !== 'jogador') {
      naVez.push(c);
      return;
    }
    enviarJa(c);
  }

  function enviarJa(c: Comando | PedidoCliente): void {
    const comSeq = 'seq' in (c as Comando) ? { ...(c as Comando), seq: ++seq } : c;
    ws!.send(JSON.stringify(comSeq));
    if (reenviavel(c)) {
      semConfirmacao.push({ c, t: relogio() });
      if (semConfirmacao.length > MAX_SEM_CONFIRMACAO) semConfirmacao.shift();
    }
  }

  /**
   * Vai de novo na volta? Os comandos de bloco com id, menos o `colocar` de um bloco que dá
   * lugar a outro (a flor, a grama, a água): repetido, ele não é recusado (a célula da flor
   * aceita outra flor) e gastaria outra da mochila. Esses se perdem com a conexão, como antes.
   */
  function reenviavel(c: Comando | PedidoCliente): c is Comando {
    if (!('t' in c) || !REENVIAVEIS.has(c.t)) return false;
    if (typeof (c as { id?: unknown }).id !== 'number') return false;
    return !(c.t === 'colocar' && substituivel(c.bloco));
  }

  /** Uma fatia da rajada da volta; a seguinte daqui a um segundo. */
  function escoar(): void {
    clearTimeout(proximaFatia);
    proximaFatia = undefined;
    if (!aberta()) {
      // caiu no meio: o que não saiu fica guardado, na frente, para a próxima volta
      guardados.unshift(...naVez.splice(0));
      if (guardados.length > 500) guardados.length = 500;
      return;
    }
    for (const c of naVez.splice(0, FATIA)) enviarJa(c);
    if (naVez.length) proximaFatia = setTimeout(escoar, INTERVALO_FATIA);
  }

  const idDe = (c: Comando) => (c as { id: number }).id;

  /** O quadro diz até onde o núcleo já fez (`ack`): o que já entrou não precisa ir de novo. */
  function confirmar(q: Quadro): void {
    if (reenviados.size && q.eventos?.length) {
      // a recusa do que foi de novo e já tinha entrado (a célula ocupada pelo próprio bloco):
      // a correção da célula vem no quadro; o "não pode" ficaria sem motivo para a criança
      q.eventos = q.eventos.filter(
        (e) => !(e.e === 'recusa' && !e.protecao && reenviados.has(e.comando)),
      );
      if (!q.eventos.length) delete q.eventos;
    }
    for (let i = semConfirmacao.length - 1; i >= 0; i--)
      if (idDe(semConfirmacao[i].c) <= q.ack) semConfirmacao.splice(i, 1);
  }

  /**
   * A volta: os blocos que saíram pela conexão que morreu e não foram confirmados (e não são
   * velhos demais) vão de novo, em ordem, depois da última posição (o núcleo confere o alcance
   * nela). A posição vai sem as quedas, os pulos e os golpes: esses já contaram.
   */
  function paraReenviar(): Comando[] {
    const agora = relogio();
    const vivos = semConfirmacao.splice(0).filter((s) => agora - s.t <= VALIDADE_REENVIO);
    if (!vivos.length) return [];
    const lote: Comando[] = [];
    if (ultimaTelemetria)
      lote.push({ ...ultimaTelemetria, quedas: [], pulos: 0, golpes: 0 } as Comando);
    for (const { c } of vivos) {
      reenviados.add(idDe(c));
      lote.push(c);
    }
    // os ids não se repetem na página: os antigos só ocupam lugar
    for (const id of reenviados) {
      if (reenviados.size <= MAX_SEM_CONFIRMACAO) break;
      reenviados.delete(id);
    }
    return lote;
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
        const { t: _t, ...bv } = m;
        void _t;
        const volta = !primeira;
        const reaberta = volta && m.instancia !== undefined && m.instancia !== instancia;
        primeira = false;
        instancia = m.instancia;
        if (reaberta) {
          // o servidor recomeçou: a página abre o mundo de novo (nada vai de novo por aqui)
          semConfirmacao.length = 0;
          naVez.length = 0;
          clearTimeout(proximaFatia);
          mudar('conectado');
          resolver(bv);
          for (const f of ouvintesReaberta) f();
          return;
        }
        // de pé: primeiro o que se perdeu na conexão morta e o guardado com ela caída, e só
        // depois quem ouve o 'conectado'. O `reconferir` da volta (src/nuvem.ts) pede o valor
        // das células previstas: indo antes dos blocos guardados, a resposta chegava com a
        // célula ainda vazia e tirava da tela o bloco que o servidor pôs logo em seguida.
        // A rajada sai em fatias (`escoar`); o que vier depois, o `conferir` inclusive, espera
        // atrás dela.
        // A volta pode chegar antes da fatia seguinte (a ressincronização é rápida): o que
        // sobrou dela vai depois do reenvio (que já tinha saído antes) e antes dos guardados.
        estado = 'conectado';
        const resto = naVez.splice(0);
        naVez.push(...(volta ? paraReenviar() : []), ...resto, ...guardados.splice(0));
        escoar();
        mudar('conectado');
        resolver(bv);
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
      } else {
        if (m.t === 'quadro') confirmar(m);
        chegou(m);
      }
    };
    s.onclose = () => {
      if (ws !== s) return;
      ws = null;
      if (encerrada) return;
      // a conexão de pé caiu: é uma queda de verdade; a nova da ressincronização caiu antes do
      // bem-vindo: a queda nasceu dela (e as tentativas que falham depois continuam sendo ela)
      if (estado === 'conectado') quedaNaRessinc = false;
      else if (estado === 'ressincronizando') quedaNaRessinc = true;
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
    quedaNaRessinc = false;
    mudar('ressincronizando');
    velha?.close(FECHA_RESSINCRONIZAR);
    abrir();
    clearTimeout(prazoRessinc);
    prazoRessinc = setTimeout(() => {
      if (encerrada || estado !== 'ressincronizando') return;
      // 5 s sem bem-vindo: a internet caiu mesmo; o aviso e a reconexão de sempre
      const presa = ws;
      ws = null;
      // 4001 também aqui: no registro do servidor é a ressincronização, não um 1005
      presa?.close(FECHA_RESSINCRONIZAR);
      quedaNaRessinc = true;
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
    get quedaNaRessincronizacao() {
      return quedaNaRessinc;
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
      clearTimeout(proximaFatia);
      fila.length = 0;
      // 1000: saiu normalmente (o registro do servidor não conta como queda)
      ws?.close(1000);
    },
  };
}
