import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { conexaoNuvem, type ConexaoNuvem } from '../../src/cliente/conexaoNuvem';
import { criarEstadoCliente } from '../../src/cliente/estado';
import { criarInventario } from '../../src/jogo/inventario';
import { estadoInicial } from '../../src/jogo/sobrevivencia';
import type { Mensagem } from '../../src/nucleo/protocolo';

/**
 * Spec 035, seção 1 (substitui o teste de texto da 034): entre o bem-vindo e a cena, a página
 * pode esperar o que for (`await`, `.then`, `setTimeout`) sem perder os quadros que chegam
 * nesse meio. A conexão guarda o que chega enquanto ninguém ouve e entrega tudo, em ordem, logo
 * depois do primeiro `aoReceber`. Falha até a T02 (hoje o que chega antes se perde).
 */

/** WebSocket de mentira (o de `conexaoNuvem.test.ts`): o teste abre, manda mensagens e fecha. */
class FalsoWS {
  static OPEN = 1;
  readyState = 0;
  enviadas: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  send(t: string) {
    this.enviadas.push(t);
  }
  codigoFechamento: number | undefined;
  close(codigo?: number) {
    this.codigoFechamento = codigo;
    this.readyState = 3;
    this.onclose?.();
  }
  abriu() {
    this.readyState = 1;
    this.onopen?.();
  }
  chega(m: unknown) {
    this.onmessage?.({ data: JSON.stringify(m) });
  }
}

const bemvindo = {
  t: 'bemvindo',
  mundo: {},
  sala: { codigo: 'LUA-SOL-01' },
  voce: 'ana',
  instancia: 'i1',
  edicoes: {},
  donos: [],
  semPovoado: [],
  pos: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 },
};

const ambiente = {
  hora: 0.3,
  dia: 0,
  pausado: false,
  clima: { tipo: 'limpo', nuvens: 0, chuva: 0, neblina: 0, raios: 0, arco: 0 },
};
const quadro = (n: number, primeiro = false) => ({
  t: 'quadro',
  n,
  ack: 0,
  ambiente,
  ...(primeiro ? { primeiro: true } : {}),
});

/** Uma tarefa inteira (as microtarefas da entrega já correram). */
const tarefa = () => new Promise<void>((r) => setTimeout(r, 0));

/** Abre a conexão e faz chegar o bem-vindo, o `primeiro` (n=10) e mais `extras` quadros. */
function abrirComQuadros(extras = 4): { c: ConexaoNuvem; ws: FalsoWS } {
  const abertos: FalsoWS[] = [];
  const c = conexaoNuvem({
    url: 'wss://x',
    jogador: { id: 'ana', chave: 'k', apelido: 'Ana', aparencia: {} } as never,
    codigo: 'LUA-SOL-01',
    abrir: () => {
      const w = new FalsoWS();
      abertos.push(w);
      return w as unknown as WebSocket;
    },
  });
  const ws = abertos[0];
  ws.abriu();
  ws.chega(bemvindo);
  ws.chega(quadro(10, true));
  for (let i = 1; i <= extras; i++) ws.chega(quadro(10 + i));
  return { c, ws };
}

const numeros = (ms: Mensagem[]) => ms.map((m) => (m.t === 'quadro' ? m.n : -1));

describe('a entrada na nuvem: nada se perde antes de alguém ouvir', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', FalsoWS);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const esperas: Array<[string, () => Promise<void>]> = [
    ['await', async () => {
      await Promise.resolve();
    }],
    ['.then', () => Promise.resolve().then(() => undefined)],
    ['setTimeout', () => new Promise<void>((r) => setTimeout(r, 30))],
  ];
  for (const [nome, esperar] of esperas) {
    it(`o estado liga depois de um ${nome}: aplica todos os quadros, em ordem, a partir do primeiro`, async () => {
      const { c } = abrirComQuadros(4);
      await c.pronta;
      await esperar();
      const aplicados: number[] = [];
      criarEstadoCliente({
        conexao: c,
        inventario: criarInventario(),
        aplicarBloco: () => false,
        aoQuadro: (q) => aplicados.push(q.n),
        clima: ambiente.clima as never,
        dia: 0,
        hora: 0.3,
        sobrevivencia: estadoInicial(),
      });
      await tarefa();
      expect(aplicados).toEqual([10, 11, 12, 13, 14]);
      c.encerrar();
    });
  }

  it('nada é entregue dentro do aoReceber, só logo depois que ele volta', async () => {
    const { c } = abrirComQuadros(2);
    let dentro = true;
    const recebidas: Mensagem[] = [];
    let entregueDentro = false;
    c.aoReceber((m) => {
      if (dentro) entregueDentro = true;
      recebidas.push(m);
    });
    dentro = false;
    expect(entregueDentro).toBe(false);
    await tarefa();
    expect(numeros(recebidas)).toEqual([10, 11, 12]);
    c.encerrar();
  });

  it('o que chega no meio da entrega da fila vai para o fim: a ordem não troca', async () => {
    const { c, ws } = abrirComQuadros(4);
    const recebidas: Mensagem[] = [];
    c.aoReceber((m) => {
      recebidas.push(m);
      if (m.t === 'quadro' && m.n === 11) ws.chega(quadro(15));
    });
    await tarefa();
    expect(numeros(recebidas)).toEqual([10, 11, 12, 13, 14, 15]);
    c.encerrar();
  });

  it('um ouvinte que lança erro numa mensagem não para as seguintes', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { c } = abrirComQuadros(2);
    const recebidas: Mensagem[] = [];
    c.aoReceber((m) => {
      recebidas.push(m);
      if (m.t === 'quadro' && m.n === 11) throw new Error('quadro estragado');
    });
    await tarefa();
    expect(numeros(recebidas)).toEqual([10, 11, 12]);
    expect(erro).toHaveBeenCalled();
    c.encerrar();
  });

  it('um encerrar() no meio da entrega para o laço, sem erro', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { c } = abrirComQuadros(4);
    const recebidas: Mensagem[] = [];
    c.aoReceber((m) => {
      recebidas.push(m);
      if (m.t === 'quadro' && m.n === 11) c.encerrar();
    });
    await tarefa();
    expect(numeros(recebidas)).toEqual([10, 11]);
    expect(erro).not.toHaveBeenCalled();
  });

  it('o teto da fila é de 200 mensagens: passando disso, sai a mais antiga', async () => {
    const { c } = abrirComQuadros(249);
    const recebidas: Mensagem[] = [];
    c.aoReceber((m) => recebidas.push(m));
    await tarefa();
    const ns = numeros(recebidas);
    expect(ns).toHaveLength(200);
    expect(ns[0]).toBe(60);
    expect(ns[199]).toBe(259);
    c.encerrar();
  });

  it('o encerrar() esvazia a fila e fecha com 1000: quem ouve depois não recebe nada', async () => {
    const { c, ws } = abrirComQuadros(4);
    c.encerrar();
    // 1000: saiu normalmente (o registro do servidor deixa de mostrar uma queda 1005)
    expect(ws.codigoFechamento).toBe(1000);
    const recebidas: Mensagem[] = [];
    c.aoReceber((m) => recebidas.push(m));
    await tarefa();
    expect(recebidas).toEqual([]);
  });
});
