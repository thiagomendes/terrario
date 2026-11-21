import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarEstadoCliente } from '../../src/cliente/estado';
import { criarInventario } from '../../src/jogo/inventario';
import { estadoInicial } from '../../src/jogo/sobrevivencia';
import type { Mensagem } from '../../src/nucleo/protocolo';
import {
  ESPERA_RECARREGAR_MS,
  MARCA_RECARREGOU,
  enderecoDireto,
  podeRecarregar,
} from '../../src/cliente/recarregarUmaVez';

/**
 * Spec 035, seção 2: a rede de segurança do estado do cliente, com o relógio trocado (os
 * temporizadores e o `Date` de mentira do Vitest andam juntos).
 */
const ambiente = {
  hora: 0.3,
  dia: 0,
  pausado: false,
  clima: { tipo: 'limpo', nuvens: 0, chuva: 0, neblina: 0, raios: 0, arco: 0 },
};
const quadro = (n: number, primeiro = false) =>
  ({ t: 'quadro', n, ack: 0, ambiente, ...(primeiro ? { primeiro: true } : {}) }) as Mensagem;

function montar(op: { sabe?: boolean; visivel?: () => boolean } = {}) {
  const ouvintes: ((m: Mensagem) => void)[] = [];
  let ressinc = 0;
  const conexao = {
    estado: 'conectado' as string,
    enviar: () => undefined,
    aoReceber: (f: (m: Mensagem) => void) => {
      ouvintes.push(f);
    },
    encerrar: () => undefined,
    ...(op.sabe === false ? {} : { ressincronizar: () => void ressinc++ }),
  };
  let desistiu = 0;
  const aplicados: number[] = [];
  const estado = criarEstadoCliente({
    conexao,
    inventario: criarInventario(),
    aplicarBloco: () => false,
    aoQuadro: (q) => aplicados.push(q.n),
    clima: ambiente.clima as never,
    dia: 0,
    hora: 0.3,
    sobrevivencia: estadoInicial(),
    agora: () => Date.now(),
    visivel: op.visivel ?? (() => true),
    aoDesistir: () => void desistiu++,
  });
  const chega = (m: Mensagem) => {
    for (const f of ouvintes) f(m);
  };
  return {
    conexao,
    estado,
    aplicados,
    chega,
    ressinc: () => ressinc,
    desistiu: () => desistiu,
  };
}

/** Quadros chegando a cada 50 ms (o ritmo do servidor), a partir de `n`, por `ms`. */
function chegando(m: ReturnType<typeof montar>, n: number, ms: number, pular?: number): number {
  for (let t = 0; t < ms; t += 50) {
    if (n !== pular) m.chega(quadro(n));
    n++;
    vi.advanceTimersByTime(50);
  }
  return n;
}

/** Trava a página: quadros sem o `primeiro` (como o primeiro perdido) por 1,2 s. */
function travar(m: ReturnType<typeof montar>, n: number): number {
  return chegando(m, n, 1200);
}

/** Um `primeiro` e quadros andando por `ms` (a página destrava). */
function andar(m: ReturnType<typeof montar>, n: number, ms: number): number {
  m.chega(quadro(n, true));
  vi.advanceTimersByTime(50);
  return chegando(m, n + 1, ms);
}

describe('a rede de segurança do estado (spec 035)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });
  afterEach(() => vi.useRealTimers());

  it('quadros sem o primeiro por 1 s, com 10 ou mais esperando: ressincroniza uma vez', () => {
    const m = montar();
    chegando(m, 100, 900);
    expect(m.ressinc(), 'antes de 1 s').toBe(0);
    chegando(m, 118, 400);
    expect(m.ressinc()).toBe(1);
    expect(m.estado.ressincronizacoes).toBe(1);
    expect(m.aplicados).toEqual([]);
  });

  it('um buraco na sequência depois do primeiro: também ressincroniza', () => {
    const m = montar();
    m.chega(quadro(0, true));
    chegando(m, 1, 1500, 6);
    expect(m.aplicados).toEqual([0, 1, 2, 3, 4, 5]);
    expect(m.ressinc()).toBe(1);
  });

  it('quadros parados por 5 s e depois todos de uma vez, em ordem: o travamento não ressincroniza', () => {
    // (a página escondida isola o travamento: o silêncio tem o teste dele)
    const m = montar({ visivel: () => false });
    let n = andar(m, 0, 500);
    vi.advanceTimersByTime(5000);
    for (let i = 0; i < 100; i++) m.chega(quadro(n++));
    expect(m.ressinc()).toBe(0);
    expect(m.aplicados).toHaveLength(n);
  });

  it('um primeiro apaga os adiantados de número menor', () => {
    const m = montar({ visivel: () => false });
    // sobras sem primeiro (menos de 1 s: não trava)
    chegando(m, 100, 600);
    // o primeiro chega e a sequência anda
    andar(m, 200, 300);
    vi.advanceTimersByTime(1100);
    // um quadro adiantado só: com as sobras presas no mapa, seriam 13 esperando
    m.chega(quadro(300));
    expect(m.ressinc()).toBe(0);
  });

  it('silêncio de 4 s com a página visível: ressincroniza; escondida, não; voltou a ficar visível, conta do zero', () => {
    let vis = true;
    const m = montar({ visivel: () => vis });
    andar(m, 0, 200);
    vi.advanceTimersByTime(3000);
    expect(m.ressinc(), 'com 3 s').toBe(0);
    // o vigia confere a cada 1 s: dispara entre 4 e 5 s de silêncio
    vi.advanceTimersByTime(2000);
    expect(m.ressinc(), 'com 4 a 5 s').toBe(1);

    const e = montar({ visivel: () => vis });
    andar(e, 0, 200);
    vis = false;
    vi.advanceTimersByTime(10_000);
    expect(e.ressinc(), 'escondida').toBe(0);
    vis = true;
    vi.advanceTimersByTime(3000);
    expect(e.ressinc(), 'voltou há 3 s').toBe(0);
    vi.advanceTimersByTime(2000);
    expect(e.ressinc(), 'voltou há 4 a 5 s').toBe(1);
  });

  it('o silêncio não dispara durante "ressincronizando", nem antes do primeiro quadro aplicado', () => {
    const m = montar();
    vi.advanceTimersByTime(10_000);
    expect(m.ressinc(), 'antes do primeiro quadro aplicado').toBe(0);
    andar(m, 0, 200);
    m.conexao.estado = 'ressincronizando';
    vi.advanceTimersByTime(10_000);
    expect(m.ressinc(), 'durante a ressincronização').toBe(0);
    m.conexao.estado = 'reconectando';
    vi.advanceTimersByTime(10_000);
    expect(m.ressinc(), 'durante a reconexão').toBe(0);
    // de pé de novo: conta do zero
    m.conexao.estado = 'conectado';
    vi.advanceTimersByTime(3000);
    expect(m.ressinc()).toBe(0);
    vi.advanceTimersByTime(2000);
    expect(m.ressinc()).toBe(1);
  });

  it('mais de 2 s entre duas voltas do vigia (a página ocupada): a contagem recomeça', () => {
    const m = montar();
    andar(m, 0, 200);
    vi.advanceTimersByTime(2000);
    // a página fica ocupada 3 s (o relógio anda, o vigia não)
    vi.setSystemTime(Date.now() + 3000);
    vi.advanceTimersByTime(1000);
    expect(m.ressinc(), 'o silêncio da página ocupada não conta').toBe(0);
    vi.advanceTimersByTime(3000);
    expect(m.ressinc()).toBe(0);
    vi.advanceTimersByTime(1500);
    expect(m.ressinc()).toBe(1);
  });

  it('dois silêncios seguidos não recarregam nem gastam a conta do travamento; o segundo só depois de 30 s', () => {
    const m = montar();
    let n = andar(m, 0, 200);
    vi.advanceTimersByTime(5000);
    expect(m.ressinc()).toBe(1);
    // continua calado: o segundo espera os 30 s
    vi.advanceTimersByTime(20_000);
    expect(m.ressinc()).toBe(1);
    vi.advanceTimersByTime(10_000);
    expect(m.ressinc()).toBe(2);
    expect(m.desistiu()).toBe(0);
    // as 2 do travamento continuam inteiras
    n = travar(m, n + 50);
    expect(m.ressinc()).toBe(3);
    vi.advanceTimersByTime(3000);
    travar(m, n + 50);
    expect(m.ressinc()).toBe(4);
    expect(m.desistiu()).toBe(0);
  });

  it('travou de novo antes de 3 s: espera; depois de 3 s: a segunda; depois da segunda, desiste uma vez', () => {
    const m = montar({ visivel: () => false });
    let n = travar(m, 100);
    expect(m.ressinc()).toBe(1);
    // trava de novo logo: espera os 3 s
    n = travar(m, n);
    expect(m.ressinc()).toBe(1);
    // passados os 3 s da primeira, ainda travada: a segunda
    n = chegando(m, n, 2000);
    expect(m.ressinc()).toBe(2);
    expect(m.desistiu()).toBe(0);
    // e de novo: a página guarda e recarrega (uma vez só)
    vi.advanceTimersByTime(3000);
    n = travar(m, n);
    expect(m.desistiu()).toBe(1);
    expect(m.ressinc()).toBe(2);
    vi.advanceTimersByTime(3000);
    travar(m, n);
    expect(m.desistiu()).toBe(1);
    expect(m.ressinc()).toBe(2);
  });

  it('60 s com os quadros andando: a conta do travamento volta a zero', () => {
    const m = montar({ visivel: () => false });
    let n = travar(m, 100);
    vi.advanceTimersByTime(3000);
    n = travar(m, n);
    expect(m.ressinc()).toBe(2);
    n = andar(m, n, 61_000);
    n = travar(m, n + 50);
    expect(m.ressinc(), 'a conta zerou: ressincroniza de novo').toBe(3);
    expect(m.desistiu()).toBe(0);
  });

  it('o reconferir (a volta de uma queda de verdade) zera a conta', () => {
    const m = montar({ visivel: () => false });
    let n = travar(m, 100);
    vi.advanceTimersByTime(3000);
    n = travar(m, n);
    expect(m.ressinc()).toBe(2);
    m.estado.reconferir();
    vi.advanceTimersByTime(3000);
    travar(m, n);
    expect(m.ressinc()).toBe(3);
    expect(m.desistiu()).toBe(0);
  });

  it('com uma conexão que não sabe ressincronizar (a local, o canal dos testes): nunca mede nem dispara', () => {
    const m = montar({ sabe: false });
    let n = travar(m, 100);
    vi.advanceTimersByTime(3000);
    n = travar(m, n);
    m.chega(quadro(n + 100, true));
    vi.advanceTimersByTime(60_000);
    expect(m.estado.ressincronizacoes).toBe(0);
    expect(m.desistiu()).toBe(0);
  });
});

describe('o recarregar uma vez (spec 035)', () => {
  function armazem() {
    const dados = new Map<string, string>();
    return {
      dados,
      getItem: (k: string) => dados.get(k) ?? null,
      setItem: (k: string, v: string) => void dados.set(k, v),
    };
  }

  it('a primeira vez pode, e deixa a marca do mundo; com a marca de pé, não; depois de 10 min, pode de novo', () => {
    const s = armazem();
    // a marca é pelo id do mundo da nuvem (o dono pode trocar o código da sala no meio)
    expect(podeRecarregar(() => s, 'mundo-a1', 1000)).toBe(true);
    expect(s.dados.get(MARCA_RECARREGOU + 'mundo-a1')).toBe('1000');
    expect([...s.dados.keys()]).toEqual([MARCA_RECARREGOU + 'mundo-a1']);
    expect(podeRecarregar(() => s, 'mundo-a1', 1000 + 60_000)).toBe(false);
    // outro mundo tem a marca dele
    expect(podeRecarregar(() => s, 'mundo-b2', 2000)).toBe(true);
    expect(podeRecarregar(() => s, 'mundo-a1', 1000 + ESPERA_RECARREGAR_MS)).toBe(true);
  });

  it('sem sessionStorage, ou com ele dando erro, não recarrega', () => {
    expect(podeRecarregar(() => null, 'mundo-a1', 1000)).toBe(false);
    expect(
      podeRecarregar(
        () => {
          throw new Error('bloqueado');
        },
        'mundo-a1',
        1000,
      ),
    ).toBe(false);
    const quebrado = {
      getItem: () => null,
      setItem: () => {
        throw new Error('cheio');
      },
    };
    expect(podeRecarregar(() => quebrado, 'mundo-a1', 1000)).toBe(false);
    // a marca que não fica (o navegador ignora a escrita) também não deixa
    const mudo = { getItem: () => null, setItem: () => undefined };
    expect(podeRecarregar(() => mudo, 'mundo-a1', 1000)).toBe(false);
  });

  it('recarrega direto no mesmo mundo (com direto=1, o resto do endereço fica)', () => {
    const u = new URL(enderecoDireto('https://t.exemplo/?sala=LUA-SOL-01&captura=1'));
    expect(u.searchParams.get('sala')).toBe('LUA-SOL-01');
    expect(u.searchParams.get('direto')).toBe('1');
    expect(u.searchParams.get('captura')).toBe('1');
  });
});
