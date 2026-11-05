import { gerarMalha } from '../mesh/malha';
import type { Buffers } from '../mesh/malha';
import { gerarChunk } from '../world/chunk';

export interface PedidoChunk {
  cx: number;
  cz: number;
  semente: number;
}

export interface RespostaChunk {
  cx: number;
  cz: number;
  solido: Buffers;
  plantas: Buffers;
}

function buffersTransferiveis(b: Buffers): ArrayBuffer[] {
  return [
    b.posicoes.buffer,
    b.normais.buffer,
    b.uvs.buffer,
    b.cores.buffer,
    b.indices.buffer,
  ] as ArrayBuffer[];
}

self.onmessage = (ev: MessageEvent<PedidoChunk>) => {
  const { cx, cz, semente } = ev.data;
  const blocos = gerarChunk(cx, cz, semente);
  const malha = gerarMalha(blocos, {
    xNeg: gerarChunk(cx - 1, cz, semente),
    xPos: gerarChunk(cx + 1, cz, semente),
    zNeg: gerarChunk(cx, cz - 1, semente),
    zPos: gerarChunk(cx, cz + 1, semente),
  });
  const resposta: RespostaChunk = { cx, cz, solido: malha.solido, plantas: malha.plantas };
  (self as unknown as Worker).postMessage(resposta, [
    ...buffersTransferiveis(malha.solido),
    ...buffersTransferiveis(malha.plantas),
  ]);
};
