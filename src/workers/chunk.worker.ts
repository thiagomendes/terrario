import type { EstiloMundo } from '../temas/tipos';
import { definirDetalheMalha, gerarMalha } from '../mesh/malha';
import type { Buffers } from '../mesh/malha';
import { blocoDe, criarEdicoes, metasDoChunk, type Edicoes } from '../world/edicoes';
import { definirEstiloMundo, gerarChunk } from '../world/chunk';
import { definirRegioesSemPovoado } from '../world/povoado';
import {
  definirCoresPlantas,
  definirDetalhePlantas,
  type CoresPlanta,
} from '../mesh/plantasBrinquedo';

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
  /** Edições do chunk e dos 8 vizinhos, por chave "cx,cz". */
  edicoes: EdicoesExportadas;
  /** Blocos-base já conhecidos (chave "cx,cz"): evita regerar terreno no worker. */
  bases?: Record<string, Uint8Array>;
}

export interface RespostaChunk {
  cx: number;
  cz: number;
  versao: number;
  solido: Buffers;
  plantas: Buffers;
  agua: Buffers;
  /** Blocos-base do chunk (sem edições), para a thread principal não regerar. */
  base: Uint8Array;
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

/** Primeira mensagem do worker: o estilo do mundo do tema (antes de qualquer chunk). */
export interface PedidoEstilo {
  estilo: EstiloMundo;
  /** Regiões sem povoado (mundos de antes dos povoados com edições nelas). */
  semPovoado?: string[];
  /** Cores das plantas de brinquedo, lidas do atlas do tema. */
  coresPlantas?: Record<number, CoresPlanta>;
  /** Qualidade das peças de brinquedo: 'baixo' no celular. */
  detalhe?: 'alto' | 'baixo';
}

self.onmessage = (ev: MessageEvent<PedidoChunk | PedidoEstilo>) => {
  if ('estilo' in ev.data) {
    definirEstiloMundo(ev.data.estilo);
    definirRegioesSemPovoado(ev.data.semPovoado ?? []);
    definirCoresPlantas(ev.data.coresPlantas);
    definirDetalheMalha(ev.data.detalhe ?? 'alto');
    definirDetalhePlantas(ev.data.detalhe ?? 'alto');
    return;
  }
  const { cx, cz, semente, versao, edicoes: dados, bases } = ev.data as PedidoChunk;
  if (bases) {
    for (const [k, b] of Object.entries(bases)) {
      const [bx, bz] = k.split(',').map(Number);
      const ck = `${bx},${bz},${semente}`;
      if (!cache.has(ck)) {
        cache.set(ck, b);
        if (cache.size > LIMITE_CACHE) cache.delete(cache.keys().next().value as string);
      }
    }
  }
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
      xNegZNeg: gerarChunkEditado(cx - 1, cz - 1, semente, edicoes),
      xPosZNeg: gerarChunkEditado(cx + 1, cz - 1, semente, edicoes),
      xNegZPos: gerarChunkEditado(cx - 1, cz + 1, semente, edicoes),
      xPosZPos: gerarChunkEditado(cx + 1, cz + 1, semente, edicoes),
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
    base: base(cx, cz, semente).slice(),
  };
  (self as unknown as Worker).postMessage(resposta, [
    ...buffersTransferiveis(malha.solido),
    ...buffersTransferiveis(malha.plantas),
    ...buffersTransferiveis(malha.agua),
    resposta.base.buffer as ArrayBuffer,
  ]);
};
