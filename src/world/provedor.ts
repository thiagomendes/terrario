import { gerarChunk } from './chunk';

/**
 * Blocos-base dos chunks (sem edições) na thread principal, compartilhados por
 * física, alvo, luz aproximada e mapa. Chegam prontos do worker; só se gera aqui
 * quando um chunk é consultado antes de o worker entregá-lo. LRU limitado.
 */
export interface ProvedorBlocos {
  /** Blocos-base do chunk (não modificar: use .slice() para aplicar edições). */
  obter(cx: number, cz: number): Uint8Array;
  /** O chunk já está na memória (sem custo para ler)? */
  tem(cx: number, cz: number): boolean;
  registrar(cx: number, cz: number, blocos: Uint8Array): void;
  /** Spec 014 (T06): a geração do chunk mudou (obra feita): ele é gerado de novo. */
  esquecer(cx: number, cz: number): void;
  readonly tamanho: number;
}

export const LIMITE_PROVEDOR = 600;

const chaveNum = (cx: number, cz: number) => (cx + 32768) * 65536 + (cz + 32768);

export function criarProvedorBlocos(
  semente: number,
  gerar: (cx: number, cz: number, semente: number) => Uint8Array = gerarChunk,
  limite = LIMITE_PROVEDOR,
): ProvedorBlocos {
  const mapa = new Map<number, Uint8Array>();
  function guardar(k: number, b: Uint8Array): void {
    mapa.delete(k);
    mapa.set(k, b);
    if (mapa.size > limite) mapa.delete(mapa.keys().next().value as number);
  }
  return {
    obter(cx, cz) {
      const k = chaveNum(cx, cz);
      let b = mapa.get(k);
      if (!b) {
        b = gerar(cx, cz, semente);
        guardar(k, b);
      }
      return b;
    },
    tem: (cx, cz) => mapa.has(chaveNum(cx, cz)),
    registrar(cx, cz, blocos) {
      guardar(chaveNum(cx, cz), blocos);
    },
    esquecer(cx, cz) {
      mapa.delete(chaveNum(cx, cz));
    },
    get tamanho() {
      return mapa.size;
    },
  };
}
