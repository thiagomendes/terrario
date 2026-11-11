import { describe, expect, it, vi } from 'vitest';
import { conexaoNuvem, type EstadoConexao } from '../../src/cliente/conexaoNuvem';

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
  close() {
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
