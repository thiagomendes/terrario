/**
 * Conexão do cliente com o núcleo. A cena só conhece esta interface: hoje ela fala com
 * o servidor local (Web Worker); na spec 010, com o servidor da nuvem (WebSocket).
 */
import { criarAnfitriao } from '../nucleo/anfitriao';
import type { Comando, Inicio, Mensagem } from '../nucleo/protocolo';

export interface Conexao {
  enviar(c: Comando): void;
  aoReceber(f: (m: Mensagem) => void): void;
  encerrar(): void;
  /**
   * Spec 035: fecha a conexão e abre outra na hora, com um bem-vindo e um `primeiro` novos.
   * Só a da nuvem sabe; sem ela (o servidor local, o canal dos testes), o estado não mede nada.
   */
  ressincronizar?(): void;
  /** Spec 035: como a conexão está ('conectado' é a de pé). Só a da nuvem diz. */
  readonly estado?: string;
}

/** Servidor local num Web Worker. */
export function conexaoLocal(inicio: Inicio): Conexao {
  const worker = new Worker(new URL('../nucleo/servidorLocal.worker.ts', import.meta.url), {
    type: 'module',
  });
  const ouvintes: ((m: Mensagem) => void)[] = [];
  worker.onmessage = (ev: MessageEvent<Mensagem>) => {
    for (const f of ouvintes) f(ev.data);
  };
  worker.postMessage(inicio);
  return {
    enviar: (c) => worker.postMessage(c),
    aoReceber: (f) => {
      ouvintes.push(f);
    },
    encerrar: () => worker.terminate(),
  };
}

export interface OpcoesCanal {
  /** Passa cada mensagem por JSON (como na rede). */
  serializar?: boolean;
  /** Atraso de entrega em ms, nos dois sentidos. */
  atrasoMs?: number;
  /** Embaralha a ordem de entrega dentro de cada janela de atraso (sorteio pela semente). */
  embaralhar?: number;
}

/**
 * Núcleo na mesma thread, com relógio manual: testes do protocolo (serialização, atraso
 * e ordem trocada) sem Worker nem navegador.
 */
export function conexaoNaMesmaThread(inicio: Inicio, op: OpcoesCanal = {}) {
  const ouvintes: ((m: Mensagem) => void)[] = [];
  let agora = 0;
  let semente = op.embaralhar ?? 0;
  const sorteio = () => {
    semente = (semente * 1664525 + 1013904223) >>> 0;
    return semente / 2 ** 32;
  };
  const fila: { quando: number; f: () => void }[] = [];
  const copiar = <T>(v: T): T => (op.serializar ? (JSON.parse(JSON.stringify(v)) as T) : v);
  const agendar = (f: () => void) => {
    const extra = op.embaralhar !== undefined ? sorteio() * (op.atrasoMs ?? 0) : 0;
    fila.push({ quando: agora + (op.atrasoMs ?? 0) + extra, f });
  };
  const anfitriao = criarAnfitriao(
    copiar(inicio),
    (m) => {
      const c = copiar(m);
      agendar(() => ouvintes.forEach((f) => f(c)));
    },
    { relogio: false },
  );
  function entregar(): void {
    fila.sort((a, b) => a.quando - b.quando);
    while (fila.length && fila[0].quando <= agora) fila.shift()!.f();
  }
  return {
    anfitriao,
    enviar(c: Comando) {
      const v = copiar(c);
      agendar(() => anfitriao.receber(v));
    },
    aoReceber(f: (m: Mensagem) => void) {
      ouvintes.push(f);
    },
    encerrar() {
      anfitriao.parar();
    },
    /** Avança o relógio do canal em ms e entrega o que chegou. */
    avancar(ms: number) {
      agora += ms;
      entregar();
    },
  };
}
