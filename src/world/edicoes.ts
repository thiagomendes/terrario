import { Bloco } from './blocks';
import { ALTURA, TAM_X, TAM_Z, gerarChunk, indice } from './chunk';

export type EdicoesExportadas = Record<string, Array<[number, number]>>;

export interface Edicoes {
  definir(x: number, y: number, z: number, bloco: number): boolean;
  obter(x: number, y: number, z: number): number | undefined;
  versaoDoChunk(cx: number, cz: number): number;
  doChunk(cx: number, cz: number): Array<[number, number]>;
  exportar(): EdicoesExportadas;
  importar(dados: EdicoesExportadas): void;
}

function chave(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

export function criarEdicoes(): Edicoes {
  const chunks = new Map<string, Map<number, number>>();
  const versoes = new Map<string, number>();

  function localizar(x: number, y: number, z: number) {
    const cx = Math.floor(x / TAM_X);
    const cz = Math.floor(z / TAM_Z);
    const lx = x - cx * TAM_X;
    const lz = z - cz * TAM_Z;
    return { cx, cz, chave: chave(cx, cz), i: indice(lx, y, lz) };
  }

  function valido(x: number, y: number, z: number): boolean {
    return (
      Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(z) && y >= 0 && y < ALTURA
    );
  }

  return {
    definir(x, y, z, bloco) {
      if (!valido(x, y, z)) return false;
      if (y === 0 && bloco === Bloco.AR) return false;
      const p = localizar(x, y, z);
      let mapa = chunks.get(p.chave);
      if (!mapa) {
        mapa = new Map();
        chunks.set(p.chave, mapa);
      }
      mapa.set(p.i, bloco);
      versoes.set(p.chave, (versoes.get(p.chave) ?? 0) + 1);
      return true;
    },
    obter(x, y, z) {
      if (!valido(x, y, z)) return undefined;
      const p = localizar(x, y, z);
      return chunks.get(p.chave)?.get(p.i);
    },
    versaoDoChunk(cx, cz) {
      return versoes.get(chave(cx, cz)) ?? 0;
    },
    doChunk(cx, cz) {
      const mapa = chunks.get(chave(cx, cz));
      return mapa ? Array.from(mapa.entries()) : [];
    },
    exportar() {
      const saida: EdicoesExportadas = {};
      for (const [k, mapa] of chunks) saida[k] = Array.from(mapa.entries());
      return saida;
    },
    importar(dados) {
      chunks.clear();
      for (const k of Object.keys(dados)) {
        chunks.set(k, new Map(dados[k]));
        versoes.set(k, (versoes.get(k) ?? 0) + 1);
      }
    },
  };
}

export function gerarChunkEditado(
  cx: number,
  cz: number,
  semente: number,
  edicoes: Edicoes,
): Uint8Array {
  const blocos = gerarChunk(cx, cz, semente);
  for (const [i, b] of edicoes.doChunk(cx, cz)) blocos[i] = b;
  return blocos;
}
