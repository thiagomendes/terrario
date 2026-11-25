/**
 * Spec 035: o servidor de verdade (`criarGerenciador`, `armazemMemoria`) ligado à conexão e ao
 * estado reais do cliente por um WebSocket de mentira que entrega cada mensagem como uma tarefa
 * separada, como no navegador. Usado pela corrida e pelos blocos da volta (não é um teste).
 */
import { criarGerenciador, type Canal } from '../../servidor/src/salas';
import { armazemMemoria } from '../../servidor/src/armazem';
import { criarLimitador } from '../../servidor/src/limitador';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { conexaoNuvem, type ConexaoNuvem, type OpcoesNuvem } from '../../src/cliente/conexaoNuvem';
import { criarEstadoCliente, type OpcoesEstadoCliente } from '../../src/cliente/estado';
import { criarInventario } from '../../src/jogo/inventario';
import { estadoInicial } from '../../src/jogo/sobrevivencia';
import type { Identidade } from '../../src/rede/protocolo';

export const espera = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const ident = (id: string): Identidade => ({
  id,
  chave: `chave-secreta-de-${id}-123`,
  apelido: id,
  aparencia: {},
});

/** WebSocket de mentira do lado do navegador. */
export interface WsDeMentira {
  readyState: number;
  onopen: (() => void) | null;
  onmessage: ((ev: { data: string }) => void) | null;
  onclose: ((ev: { code: number }) => void) | null;
  send(t: string): void;
  close(code?: number): void;
}

/**
 * Uma sala de testes: o servidor andando a cada 50 ms (como no ar) e as conexões dos jogadores.
 * `ip` diferente por sala, para o limite de criações por endereço não pesar entre rodadas.
 */
export function criarNuvem(ip: string) {
  // a conexão confere `WebSocket.OPEN` (o Node antigo não tem o WebSocket global)
  const global = globalThis as { WebSocket?: unknown };
  if (global.WebSocket === undefined) global.WebSocket = { OPEN: 1 };
  const g = criarGerenciador({ armazem: armazemMemoria(), depuracao: true });
  const tic = setInterval(() => g.passo(), 50);
  /** Códigos com que o navegador fechou as conexões (4001: ressincronizar). */
  const fechamentos: number[] = [];
  /** Conexões abertas por jogador (a primeira de cada página e as que vieram depois). */
  const abertas = new Map<string, number>();
  /** Enquanto segurada, a conexão nova de um jogador espera para abrir (ele "está fora"). */
  const segurados = new Map<string, Array<() => void>>();

  function ponte(quem: string): WsDeMentira {
    abertas.set(quem, (abertas.get(quem) ?? 0) + 1);
    let caiuNoServidor = false;
    /**
     * A conexão morta que parece de pé (o wi-fi que trocou de antena, o roteador que travou):
     * nada passa em nenhum dos lados, o navegador continua vendo `OPEN` e o servidor não fica
     * sabendo (no ar, ele só percebe 30 s depois de tentar fechar).
     */
    let muda = false;
    /** Só a volta morreu: o servidor recebe tudo, o navegador não recebe nada. */
    let surda = false;
    const desligar = () => {
      if (caiuNoServidor) return;
      caiuNoServidor = true;
      g.caiu(canal);
    };
    // o limite de mensagens por segundo do servidor de verdade (`servidor/src/index.ts`)
    const limite = criarLimitador();
    const ws: WsDeMentira = {
      readyState: 0,
      onopen: null,
      onmessage: null,
      onclose: null,
      send: (t: string) => {
        if (muda || ws.readyState !== 1) return;
        const v = limite();
        if (v === 'fechar') {
          // o servidor fecha com 4008 ("devagar"): os dois lados veem a conexão cair
          fechadasPeloLimite.set(quem, (fechadasPeloLimite.get(quem) ?? 0) + 1);
          ws.readyState = 3;
          desligar();
          setTimeout(() => ws.onclose?.({ code: 4008 }), 0);
        }
        if (v !== 'passa') return;
        void g.receber(canal, t);
      },
      close: (code = 1005) => {
        if (ws.readyState === 3) return;
        ws.readyState = 3;
        fechamentos.push(code);
        // morta: o aviso de fechar não chega ao servidor
        if (!muda) desligar();
        setTimeout(() => ws.onclose?.({ code }), 0);
      },
    };
    emudecer.set(quem, (soAVolta: boolean) => {
      if (soAVolta) surda = true;
      else muda = true;
    });
    const canal: Canal = {
      ip,
      enviar: (t: string) =>
        setTimeout(() => {
          if (ws.readyState === 1 && !muda && !surda) ws.onmessage?.({ data: t });
        }, 0),
      fechar: () => {
        if (ws.readyState === 3) return;
        ws.readyState = 3;
        setTimeout(() => {
          desligar();
          ws.onclose?.({ code: 1000 });
        }, 0);
      },
    };
    const abrir = () =>
      setTimeout(() => {
        if (ws.readyState !== 0) return;
        ws.readyState = 1;
        ws.onopen?.();
      }, 0);
    const fila = segurados.get(quem);
    if (fila) fila.push(abrir);
    else abrir();
    // a queda de verdade (a antena, o roteador): o servidor e o navegador veem a conexão cair
    quedas.set(quem, () => {
      if (ws.readyState === 3) return;
      ws.readyState = 3;
      desligar();
      setTimeout(() => ws.onclose?.({ code: 1006 }), 0);
    });
    return ws;
  }
  const quedas = new Map<string, () => void>();
  const emudecer = new Map<string, (soAVolta: boolean) => void>();
  /** Conexões de cada um que o servidor fechou por mandar mensagens demais num segundo. */
  const fechadasPeloLimite = new Map<string, number>();

  function conectar(quem: string, extra: Omit<OpcoesNuvem, 'url' | 'jogador' | 'abrir'>) {
    return conexaoNuvem({
      url: 'wss://teste',
      jogador: ident(quem),
      abrir: () => ponte(quem) as unknown as WebSocket,
      ...extra,
    });
  }

  return {
    g,
    fechamentos,
    abertas,
    estilo: obterTema('vila-neon').mundo,
    conectar,
    fechadasPeloLimite,
    /** O dono cria a sala (a ida para a nuvem) e fecha essa conexão; devolve o código. */
    async criarSala(
      quem: string,
      tema = 'vila-neon',
      modo: 'criativo' | 'sobrevivencia' = 'criativo',
    ): Promise<string> {
      const c = conectar(quem, {
        criar: {
          nome: 'Vila',
          semente: 7,
          tema,
          modo,
          versaoMundo: 2,
          estilo: obterTema(tema).mundo,
        },
      });
      const bv = await c.pronta;
      c.encerrar();
      return bv.sala.codigo;
    },
    /** A internet de `quem` cai (a conexão de agora). */
    derrubar(quem: string): void {
      quedas.get(quem)?.();
    },
    /**
     * A conexão de agora de `quem` morre sem ninguém saber: continua `OPEN` no navegador, nada
     * passa e o servidor não é avisado. As conexões novas de `quem` nascem boas. `soAVolta`: o
     * servidor continua recebendo o que o navegador manda (só o caminho de volta morreu).
     */
    emudecer(quem: string, soAVolta = false): void {
      emudecer.get(quem)?.(soAVolta);
    },
    /** As conexões novas de `quem` esperam para abrir até `soltar`. */
    segurar(quem: string): void {
      if (!segurados.has(quem)) segurados.set(quem, []);
    },
    soltar(quem: string): void {
      const fila = segurados.get(quem) ?? [];
      segurados.delete(quem);
      for (const f of fila) f();
    },
    parar(): void {
      clearInterval(tic);
    },
  };
}

/** Liga o estado do cliente (com os campos que o teste não usa já preenchidos). */
export function ligarEstado(
  conexao: ConexaoNuvem,
  op: Partial<Omit<OpcoesEstadoCliente, 'conexao'>> = {},
) {
  return criarEstadoCliente({
    conexao,
    inventario: criarInventario(),
    aplicarBloco: () => false,
    clima: { tipo: 'limpo', nuvens: 0, chuva: 0, neblina: 0, raios: 0, arco: 0 } as never,
    dia: 0,
    hora: 0.3,
    sobrevivencia: estadoInicial(),
    ...op,
  });
}

/** Quantas vezes a rede de segurança pediu para ressincronizar (a T03 põe o método). */
export function contarRessincronizacoes(c: ConexaoNuvem): () => number {
  let n = 0;
  const comMetodo = c as ConexaoNuvem & { ressincronizar?: () => void };
  const original = comMetodo.ressincronizar;
  if (original) {
    comMetodo.ressincronizar = () => {
      n++;
      original.call(c);
    };
  }
  return () => n;
}
