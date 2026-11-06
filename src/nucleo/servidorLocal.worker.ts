/// <reference lib="webworker" />
/**
 * Servidor local: o núcleo do mundo num Web Worker, fora da linha que desenha.
 * A primeira mensagem é o `Inicio`; as seguintes são comandos.
 */
import { criarAnfitriao, type Anfitriao } from './anfitriao';
import type { Comando, Inicio, Mensagem } from './protocolo';

const escopo = self as unknown as DedicatedWorkerGlobalScope;
let anfitriao: Anfitriao | null = null;
const pendentes: Comando[] = [];

escopo.onmessage = (ev: MessageEvent<Inicio | Comando>) => {
  const m = ev.data;
  if (m.t === 'inicio') {
    try {
      anfitriao = criarAnfitriao(m, (msg: Mensagem) => escopo.postMessage(msg));
      for (const c of pendentes.splice(0)) anfitriao.receber(c);
    } catch (e) {
      escopo.postMessage({ t: 'erro', mensagem: String(e) } satisfies Mensagem);
    }
    return;
  }
  if (anfitriao) anfitriao.receber(m);
  else pendentes.push(m);
};
