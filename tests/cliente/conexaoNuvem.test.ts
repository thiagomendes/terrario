import { afterEach, describe, expect, it, vi } from 'vitest';
import { conexaoNuvem, type EstadoConexao } from '../../src/cliente/conexaoNuvem';
import { criarAvisoConexao } from '../../src/ui/amigos';

/** WebSocket de mentira: o teste abre, manda mensagens e fecha. */
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
  semPovoado: [],
  pos: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 },
};

describe('conexão com a nuvem', () => {
  it('"substituido" (abriu em outra aba): para de vez, sem reconectar e derrubar a outra', () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', FalsoWS);
    const abertos: FalsoWS[] = [];
    const estados: EstadoConexao[] = [];
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
    c.aoEstado((e) => estados.push(e));
    abertos[0].abriu();
    abertos[0].chega(bemvindo);
    abertos[0].chega({ t: 'substituido' });
    abertos[0].close();
    vi.advanceTimersByTime(30_000);
    expect(abertos).toHaveLength(1);
    expect(estados).toEqual(['conectado', 'substituido']);
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('caiu a internet: reconecta sozinha (o "substituido" não muda isso)', () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', FalsoWS);
    const abertos: FalsoWS[] = [];
    conexaoNuvem({
      url: 'wss://x',
      jogador: { id: 'ana', chave: 'k', apelido: 'Ana', aparencia: {} } as never,
      codigo: 'LUA-SOL-01',
      abrir: () => {
        const w = new FalsoWS();
        abertos.push(w);
        return w as unknown as WebSocket;
      },
    });
    abertos[0].abriu();
    abertos[0].chega(bemvindo);
    abertos[0].close();
    vi.advanceTimersByTime(600);
    expect(abertos).toHaveLength(2);
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});

/** Spec 035, seção 2: a conexão troca por outra quando o estado do cliente trava. */
describe('a ressincronização da conexão', () => {
  function abrirConectada() {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', FalsoWS);
    const abertos: FalsoWS[] = [];
    const estados: EstadoConexao[] = [];
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
    c.aoEstado((e) => estados.push(e));
    abertos[0].abriu();
    abertos[0].chega(bemvindo);
    return { c, abertos, estados };
  }
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('fecha a velha com 4001, abre outra na hora e passa por "ressincronizando", sem "reconectando"', () => {
    const { c, abertos, estados } = abrirConectada();
    c.ressincronizar();
    expect(abertos[0].codigoFechamento).toBe(4001);
    expect(abertos).toHaveLength(2);
    expect(c.estado).toBe('ressincronizando');
    abertos[1].abriu();
    // entra pelo código de novo
    expect(JSON.parse(abertos[1].enviadas[0])).toMatchObject({ t: 'entrar', codigo: 'LUA-SOL-01' });
    abertos[1].chega(bemvindo);
    expect(estados).toEqual(['conectado', 'ressincronizando', 'conectado']);
    // o `onclose` da velha não agendou outra: exatamente 2 conexões abertas
    vi.advanceTimersByTime(30_000);
    expect(abertos).toHaveLength(2);
    expect(estados).not.toContain('reconectando');
  });

  it('o que chega pela conexão velha é ignorado', async () => {
    const { c, abertos } = abrirConectada();
    const recebidas: unknown[] = [];
    c.aoReceber((m) => recebidas.push(m));
    c.ressincronizar();
    // a velha ainda solta um quadro atrasado
    abertos[0].onmessage?.({ data: JSON.stringify({ t: 'quadro', n: 3, ack: 0 }) });
    await Promise.resolve();
    expect(recebidas).toEqual([]);
  });

  it('o aoBemVindo chega em cada bem-vindo depois do primeiro, antes dos quadros da conexão nova', async () => {
    const { c, abertos } = abrirConectada();
    const ordem: string[] = [];
    c.aoBemVindo(() => ordem.push('bemvindo'));
    c.aoReceber((m) => ordem.push(m.t === 'quadro' ? `quadro ${m.n}` : m.t));
    // o primeiro bem-vindo (já chegou) não conta
    expect(ordem).toEqual([]);
    c.ressincronizar();
    abertos[1].abriu();
    abertos[1].chega(bemvindo);
    abertos[1].chega({ t: 'quadro', n: 40, primeiro: true, ack: 0 });
    // e numa queda de verdade também
    abertos[1].close();
    vi.advanceTimersByTime(600);
    abertos[2].abriu();
    abertos[2].chega(bemvindo);
    abertos[2].chega({ t: 'quadro', n: 80, primeiro: true, ack: 0 });
    await Promise.resolve();
    expect(ordem).toEqual(['bemvindo', 'quadro 40', 'bemvindo', 'quadro 80']);
  });

  it('a sala reaberta (servidor recomeçou) não chama o aoBemVindo: a página recarrega', () => {
    const { c, abertos } = abrirConectada();
    let bemvindos = 0;
    let reaberta = 0;
    c.aoBemVindo(() => bemvindos++);
    c.aoReaberta(() => reaberta++);
    c.ressincronizar();
    abertos[1].abriu();
    abertos[1].chega({ ...bemvindo, instancia: 'i2' });
    expect(reaberta).toBe(1);
    expect(bemvindos).toBe(0);
  });

  it('os comandos do meio esperam e vão no bem-vindo da conexão nova', () => {
    const { c, abertos } = abrirConectada();
    c.ressincronizar();
    c.enviar({ t: 'quebrar', id: 1, x: 1, y: 2, z: 3, slot: 0 });
    abertos[1].abriu();
    expect(abertos[1].enviadas.map((t) => JSON.parse(t).t)).toEqual(['entrar']);
    abertos[1].chega(bemvindo);
    expect(abertos[1].enviadas.map((t) => JSON.parse(t).t)).toEqual(['entrar', 'quebrar']);
  });

  it('a conexão nova que nunca abre: em 5 s vira "reconectando", com o aviso de queda', () => {
    const { c, abertos } = abrirConectada();
    // o aviso de verdade (src/ui/amigos.ts), com um `document` de mentira só para ele
    const criados: Array<{ hidden: boolean; textContent: string }> = [];
    vi.stubGlobal('document', {
      createElement: () => {
        const el = {
          hidden: false,
          textContent: '',
          className: '',
          setAttribute: () => undefined,
          append: () => undefined,
        };
        criados.push(el);
        return el;
      },
    });
    const aviso = criarAvisoConexao({ appendChild: () => undefined } as unknown as HTMLElement);
    c.aoEstado((e) => aviso.mostrar(e));
    const caixa = criados[0];
    const texto = criados[2];
    c.ressincronizar();
    expect(caixa.hidden, 'a ressincronização não mostra o aviso').toBe(true);
    vi.advanceTimersByTime(4900);
    expect(c.estado).toBe('ressincronizando');
    vi.advanceTimersByTime(100);
    expect(c.estado).toBe('reconectando');
    expect(caixa.hidden).toBe(false);
    expect(texto.textContent).toBe('A internet caiu. Reconectando…');
    // e a reconexão de sempre segue
    vi.advanceTimersByTime(600);
    expect(abertos).toHaveLength(3);
    abertos[2].abriu();
    abertos[2].chega(bemvindo);
    expect(c.estado).toBe('conectado');
    expect(caixa.hidden).toBe(true);
  });

  it('o prazo de 5 s fecha a presa com 4001 e marca a queda como da ressincronização; a queda de verdade desmarca', () => {
    const { c, abertos } = abrirConectada();
    expect(c.quedaNaRessincronizacao).toBe(false);
    c.ressincronizar();
    vi.advanceTimersByTime(5000);
    expect(c.estado).toBe('reconectando');
    // no registro do servidor, 4001 (e não 1005, o fechamento sem código)
    expect(abertos[1].codigoFechamento).toBe(4001);
    expect(c.quedaNaRessincronizacao).toBe(true);
    // a tentativa seguinte também falha: continua sendo a mesma queda
    vi.advanceTimersByTime(600);
    abertos[2].close();
    expect(c.quedaNaRessincronizacao).toBe(true);
    vi.advanceTimersByTime(1100);
    abertos[3].abriu();
    abertos[3].chega(bemvindo);
    // de pé: a marca fica até a próxima (src/nuvem.ts chama o reconferir aqui)
    expect(c.estado).toBe('conectado');
    expect(c.quedaNaRessincronizacao).toBe(true);
    // a conexão de pé cai: queda de verdade
    abertos[3].close();
    expect(c.quedaNaRessincronizacao).toBe(false);
  });

  it('a conexão nova que cai antes do bem-vindo também marca a queda como da ressincronização', () => {
    const { c, abertos } = abrirConectada();
    c.ressincronizar();
    abertos[1].close();
    expect(c.estado).toBe('reconectando');
    expect(c.quedaNaRessincronizacao).toBe(true);
    // a próxima ressincronização começa sem a marca
    vi.advanceTimersByTime(600);
    abertos[2].abriu();
    abertos[2].chega(bemvindo);
    c.ressincronizar();
    expect(c.quedaNaRessincronizacao).toBe(false);
  });

  it('só ressincroniza com a conexão de pé', () => {
    const { c, abertos } = abrirConectada();
    abertos[0].close();
    expect(c.estado).toBe('reconectando');
    c.ressincronizar();
    expect(abertos).toHaveLength(1);
    expect(c.estado).toBe('reconectando');
  });
});
