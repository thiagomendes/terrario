import { gerarMalha } from '../mesh/malha';
import type { Buffers } from '../mesh/malha';
import { criarEdicoes, gerarChunkEditado } from '../world/edicoes';
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
    b.indices.buffer,
  ] as ArrayBuffer[];
}

self.onmessage = (ev: MessageEvent<PedidoChunk>) => {
  const { cx, cz, semente, versao, edicoes: dados } = ev.data;
  const edicoes = criarEdicoes();
  edicoes.importar(dados ?? {});
  const blocos = gerarChunkEditado(cx, cz, semente, edicoes);
  const malha = gerarMalha(blocos, {
    xNeg: gerarChunkEditado(cx - 1, cz, semente, edicoes),
    xPos: gerarChunkEditado(cx + 1, cz, semente, edicoes),
    zNeg: gerarChunkEditado(cx, cz - 1, semente, edicoes),
    zPos: gerarChunkEditado(cx, cz + 1, semente, edicoes),
  });
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
