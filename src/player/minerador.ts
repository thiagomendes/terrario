import type { Barramento } from './eventos';
import {
  atualizarMineracao,
  chaveBloco,
  criarEstadoMineracao,
  estagioRachadura,
  type AlvoMineracao,
  type EstadoMineracao,
} from './mineracao';

export interface OpcoesMinerador {
  barramento: Barramento;
  /** Entrega a quebra ao `executarInteracao('quebrar')`; true se a edição valeu. */
  quebrar: (alvo: AlvoMineracao) => boolean;
}

export interface Minerador {
  pressionar(): void;
  soltar(): void;
  trocarSlot(indice?: number): void;
  perderBloqueio(): void;
  atualizar(dt: number, alvo: AlvoMineracao | null): { quebrou: boolean; progresso: number };
  readonly segurando: boolean;
  readonly progresso: number;
  readonly estagio: number;
  readonly estado: EstadoMineracao;
}

export function criarMinerador(opcoes: OpcoesMinerador): Minerador {
  let estado = criarEstadoMineracao();
  let segurando = false;
  let progresso = 0;

  function interromper(): void {
    segurando = false;
  }

  return {
    pressionar() {
      segurando = true;
    },
    soltar: interromper,
    perderBloqueio: interromper,
    trocarSlot(indice = 0) {
      interromper();
      opcoes.barramento.emitir('slot', { indice });
    },
    atualizar(dt, alvo) {
      const r = atualizarMineracao(estado, { dt, segurando, alvo });
      estado = r.estado;
      progresso = r.progresso;
      if (!alvo) return { quebrou: false, progresso };
      const { x, y, z, bloco } = alvo;
      if (r.golpe) opcoes.barramento.emitir('golpe', { x, y, z, bloco });
      if (r.quebrou) {
        if (opcoes.quebrar(alvo)) {
          opcoes.barramento.emitir('quebra', { x, y, z, bloco });
        } else {
          opcoes.barramento.emitir('recusa', { motivo: 'quebra' });
          return { quebrou: false, progresso: 0 };
        }
      }
      return { quebrou: r.quebrou, progresso };
    },
    get segurando() {
      return segurando;
    },
    get progresso() {
      return progresso;
    },
    get estagio() {
      return estagioRachadura(progresso);
    },
    get estado() {
      return estado;
    },
  };
}

export { chaveBloco };
