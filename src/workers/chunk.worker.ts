import { gerarMalha } from '../mesh/malha';
import type { Buffers } from '../mesh/malha';
import { blocoDe, criarEdicoes, metasDoChunk, type Edicoes } from '../world/edicoes';
import { gerarChunk } from '../world/chunk';

/** Cache dos chunks gerados (antes das edições): evita regerar vizinhos. */
const cache = new Map<string, Uint8Array>();
const LIMITE_CACHE = 400;
function base(cx: number, cz: number, semente: number): Uint8Array {
  const k = `${cx},${cz},${semente}`;
  let b = cache.get(k);
  if (b) {
    cache.delete(k);
    cache.set(k, b);
    return b;
  }
  b = gerarChunk(cx, cz, semente);
  cache.set(k, b);
  if (cache.size > LIMITE_CACHE) cache.delete(cache.keys().next().value as string);
  return b;
}
function gerarChunkEditado(cx: number, cz: number, semente: number, edicoes: Edicoes): Uint8Array {
  const lista = edicoes.doChunk(cx, cz);
  const b = base(cx, cz, semente);
  if (lista.length === 0) return b;
  const copia = b.slice();
  for (const [i, v] of lista) copia[i] = blocoDe(v);
  return copia;
}
import type { EdicoesExportadas } from '../world/edicoes';

export interface PedidoChunk {
  cx: number;
  cz: number;
  semente: number;
  versao: number;
  /** Edições do chunk e dos 4 vizinhos, por chave "cx,cz". */
  edicoes: EdicoesExportadas;
}

export interface RespostaChunk {
  cx: number;
  cz: number;
  versao: number;
  solido: Buffers;
  plantas: Buffers;
  agua: Buffers;
}

function buffersTransferiveis(b: Buffers): ArrayBuffer[] {
  return [
    b.posicoes.buffer,
    b.normais.buffer,
    b.uvs.buffer,
    b.cores.buffer,
    b.luz.buffer,
    b.indices.buffer,
  ] as ArrayBuffer[];
}

self.onmessage = (ev: MessageEvent<PedidoChunk>) => {
  const { cx, cz, semente, versao, edicoes: dados } = ev.data;
  const edicoes = criarEdicoes();
  edicoes.importar(dados ?? {});
  const blocos = gerarChunkEditado(cx, cz, semente, edicoes);
  const malha = gerarMalha(
    blocos,
    {
      xNeg: gerarChunkEditado(cx - 1, cz, semente, edicoes),
      xPos: gerarChunkEditado(cx + 1, cz, semente, edicoes),
      zNeg: gerarChunkEditado(cx, cz - 1, semente, edicoes),
      zPos: gerarChunkEditado(cx, cz + 1, semente, edicoes),
    },
    metasDoChunk(cx, cz, edicoes),
  );
  const resposta: RespostaChunk = {
    cx,
    cz,
    versao,
    solido: malha.solido,
    plantas: malha.plantas,
    agua: malha.agua,
  };
  (self as unknown as Worker).postMessage(resposta, [
    ...buffersTransferiveis(malha.solido),
    ...buffersTransferiveis(malha.plantas),
    ...buffersTransferiveis(malha.agua),
  ]);
};
