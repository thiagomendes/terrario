/**
 * Anfitrião do servidor local: roda o núcleo num relógio fixo (PASSO) e troca mensagens
 * com um cliente só. O mesmo código serve ao Web Worker e aos testes na mesma thread.
 */
import { definirEstiloMundo } from '../world/chunk';
import { criarNucleo, type Nucleo } from './nucleo';
import { PASSO, VERSAO_PROTOCOLO, type Comando, type Inicio, type Mensagem } from './protocolo';

/** Mais passos atrasados que isto são descartados (aba parada, máquina lenta). */
const MAX_PASSOS_POR_VEZ = 5;
export const JOGADOR_LOCAL = 'local';

export interface Anfitriao {
  receber(c: Comando): void;
  /** Avança um passo e manda o quadro (testes controlam o relógio). */
  passo(): void;
  parar(): void;
  readonly nucleo: Nucleo;
}

export function criarAnfitriao(
  inicio: Inicio,
  enviar: (m: Mensagem) => void,
  opcoes: { relogio?: boolean } = {},
): Anfitriao {
  if (inicio.versao !== VERSAO_PROTOCOLO)
    enviar({ t: 'erro', mensagem: `protocolo ${inicio.versao} ≠ ${VERSAO_PROTOCOLO}` });
  // o terreno do tema (árvores, povoados) é o mesmo que o cliente desenha
  definirEstiloMundo(inicio.estilo);
  const nucleo = criarNucleo({
    semente: inicio.semente,
    modo: inicio.modo,
    versaoMundo: inicio.versaoMundo,
    dados: inicio.dados,
    confiarNoCliente: true,
    noite: inicio.estilo?.noite,
  });
  nucleo.conectar(JOGADOR_LOCAL);

  function passo(): void {
    nucleo.passo(PASSO);
    const q = nucleo.quadros().get(JOGADOR_LOCAL);
    if (q) enviar(q);
  }

  let timer: ReturnType<typeof setInterval> | null = null;
  // aba escondida: o mundo para junto (fome, ar, criaturas e relógio), como antes
  let pausado = false;
  let ultimo = performance.now();
  let acumulado = 0;
  if (opcoes.relogio !== false) {
    timer = setInterval(
      () => {
        const agora = performance.now();
        if (pausado) {
          ultimo = agora;
          return;
        }
        acumulado += (agora - ultimo) / 1000;
        ultimo = agora;
        let k = 0;
        while (acumulado >= PASSO && k < MAX_PASSOS_POR_VEZ) {
          acumulado -= PASSO;
          passo();
          k++;
        }
        if (k === MAX_PASSOS_POR_VEZ) acumulado = 0;
      },
      (PASSO * 1000) / 2,
    );
  }

  // comandos numerados entram em ordem (a rede pode entregar trocado)
  let esperado = 1;
  const adiantados = new Map<number, Comando>();
  function processar(c: Comando): void {
    try {
      if (c.t === 'salvar') {
        enviar({ t: 'salvo', pedido: c.pedido, dados: nucleo.salvar() });
        return;
      }
      if (c.t === 'pausar') {
        pausado = c.pausar;
        ultimo = performance.now();
        acumulado = 0;
        return;
      }
      nucleo.comando(JOGADOR_LOCAL, c);
    } catch (e) {
      enviar({ t: 'erro', mensagem: String(e) });
    }
  }

  return {
    nucleo,
    receber(c) {
      if (c.seq === undefined) {
        processar(c);
        return;
      }
      if (c.seq < esperado) return;
      adiantados.set(c.seq, c);
      while (adiantados.has(esperado)) {
        const atual = adiantados.get(esperado)!;
        adiantados.delete(esperado);
        esperado++;
        processar(atual);
      }
    },
    passo,
    parar() {
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}
