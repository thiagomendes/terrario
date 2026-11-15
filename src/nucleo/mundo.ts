/**
 * Acesso do núcleo aos blocos: terreno gerado pela semente (com cache), edições por
 * cima e as consultas que as criaturas usam (luz aproximada, céu aberto, superfície).
 * Puro: roda igual no Web Worker do servidor local e no Node do servidor da nuvem.
 */
import {
  ALTURA,
  TAM_X,
  TAM_Z,
  gerarChunk,
  indice,
  biomaEm,
  NIVEL_MAR,
  cidadeDoMundo,
} from '../world/chunk';
import { Solo, soloDaCidade } from '../world/cidade';
import { Bloco, obterBloco, luzDoBloco } from '../world/blocks';
import type { Edicoes } from '../world/edicoes';
import { criarMundoSolido } from '../world/solido';
import { comPecasDaVila } from '../world/vilaSolidos';
import type { MundoPopulacao } from '../jogo/populacao';
import { povoadosPerto } from '../jogo/povoados';
import type { Solido } from '../player/fisica';

/** Chunks de terreno guardados (cada um tem 32 KB). */
const LIMITE_TERRENO = 400;
/** Entradas por geração dos caches de luz e céu (até o dobro guardado). */
const LIMITE_CACHE = 16384;

/**
 * Cache que esquece aos poucos: cheia a geração atual, ela vira a anterior (a mais velha
 * sai inteira) e o que for lido da anterior volta para a atual. Uma lavoura grande não
 * faz o cache inteiro sumir de uma vez (antes, passou de 4000, ele era apagado todo).
 */
export function criarCacheGeracional<V>(limite: number) {
  let atual = new Map<string, V>();
  let anterior = new Map<string, V>();
  return {
    obter(k: string): V | undefined {
      const v = atual.get(k);
      if (v !== undefined) return v;
      const velho = anterior.get(k);
      if (velho !== undefined) {
        anterior.delete(k);
        this.guardar(k, velho);
      }
      return velho;
    },
    guardar(k: string, v: V): void {
      atual.set(k, v);
      if (atual.size >= limite) {
        anterior = atual;
        atual = new Map();
      }
    },
    apagar(k: string): void {
      atual.delete(k);
      anterior.delete(k);
    },
    get tamanho(): number {
      return atual.size + anterior.size;
    },
  };
}

export interface AcessoMundo {
  readonly semente: number;
  /** Bloco atual (edição ou terreno). */
  bloco(x: number, y: number, z: number): number;
  /** Bloco do terreno gerado, sem edições (distingue baú de ruína de baú posto). */
  gerado(x: number, y: number, z: number): number;
  solido: Solido;
  /** Mundo como as criaturas o veem. */
  readonly criaturas: MundoPopulacao;
  /** Luz de fontes na célula 2x2x2, sem cache (a lavoura guarda a dela à parte). */
  luzDaCelula(x: number, y: number, z: number): number;
  /** Avança o relógio dos caches de luz e céu. */
  avancar(dt: number): void;
  /** Spec 014 (T05): a geração do chunk mudou (obra feita): o terreno dele é gerado de novo. */
  esquecer(cx: number, cz: number): void;
}

export function criarAcessoMundo(
  semente: number,
  edicoes: Edicoes,
  /** Chunk carregado por algum cliente? (superfície para nascer criaturas) */
  carregado: (cx: number, cz: number) => boolean = () => true,
): AcessoMundo {
  const terreno = new Map<string, Uint8Array>();
  function base(cx: number, cz: number): Uint8Array {
    const k = `${cx},${cz}`;
    let c = terreno.get(k);
    if (c) {
      // mais usado por último: sai por último
      terreno.delete(k);
      terreno.set(k, c);
      return c;
    }
    c = gerarChunk(cx, cz, semente);
    terreno.set(k, c);
    if (terreno.size > LIMITE_TERRENO) terreno.delete(terreno.keys().next().value as string);
    return c;
  }
  function gerado(x: number, y: number, z: number): number {
    if (y < 0 || y >= ALTURA) return Bloco.AR;
    const cx = Math.floor(x / TAM_X);
    const cz = Math.floor(z / TAM_Z);
    return base(cx, cz)[indice(x - cx * TAM_X, y, z - cz * TAM_Z)];
  }
  function bloco(x: number, y: number, z: number): number {
    if (y < 0 || y >= ALTURA) return Bloco.AR;
    const e = edicoes.obter(x, y, z);
    return e !== undefined ? e : gerado(x, y, z);
  }
  // spec 026: as peças da Vila Neon (carros, rádio, bancos...) seguram as criaturas também
  const solido = comPecasDaVila(
    criarMundoSolido(semente, (cx, cz) => base(cx, cz), edicoes),
    semente,
  );

  // as mesmas aproximações que a cena usava (luz de fontes num raio e topo opaco da coluna)
  let relogio = 0;
  const cacheLuz = criarCacheGeracional<{ v: number; t: number }>(LIMITE_CACHE);
  const cacheCeu = criarCacheGeracional<{ topo: number; t: number }>(LIMITE_CACHE);
  /**
   * Luz de fontes (tocha, lanterna...) na célula 2x2x2 de (x, y, z), sem cache: a melhor
   * fonte num raio de 7 (4 na altura), menos a distância. Lê os blocos direto do terreno e
   * das edições de cada chunk (são 2025 blocos por célula).
   */
  function luzDaCelula(xr: number, yr: number, zr: number): number {
    const x = xr & ~1;
    const y = yr & ~1;
    const z = zr & ~1;
    let melhor = 0;
    const y0 = Math.max(0, y - 4);
    const y1 = Math.min(ALTURA - 1, y + 4);
    for (let dz = -7; dz <= 7; dz++) {
      const zz = z + dz;
      const cz = Math.floor(zz / TAM_Z);
      const lz = zz - cz * TAM_Z;
      let cxAtual = NaN;
      let terrenoC: Uint8Array | null = null;
      let edC: ReadonlyMap<number, number> | undefined;
      for (let dx = -7; dx <= 7; dx++) {
        const xx = x + dx;
        const cx = Math.floor(xx / TAM_X);
        if (cx !== cxAtual) {
          cxAtual = cx;
          terrenoC = base(cx, cz);
          edC = edicoes.mapaDoChunk ? edicoes.mapaDoChunk(cx, cz) : undefined;
        }
        const lx = xx - cx * TAM_X;
        const parcial = Math.abs(dx) + Math.abs(dz);
        for (let yy = y0; yy <= y1; yy++) {
          const i = indice(lx, yy, lz);
          const ev = edC?.get(i);
          const b = edicoes.mapaDoChunk
            ? ev !== undefined
              ? ev & 255
              : terrenoC![i]
            : bloco(xx, yy, zz);
          const l = luzDoBloco(b);
          if (l > 0) melhor = Math.max(melhor, l - parcial - Math.abs(yy - y));
        }
      }
    }
    return melhor;
  }
  function luzAprox(xr: number, yr: number, zr: number): number {
    // célula de 2x2x2: criaturas andando não forçam uma varredura nova a cada bloco
    const x = xr & ~1;
    const y = yr & ~1;
    const z = zr & ~1;
    const k = `${x},${y},${z}`;
    const c = cacheLuz.obter(k);
    if (c && relogio - c.t < 2) return c.v;
    const melhor = luzDaCelula(x, y, z);
    cacheLuz.guardar(k, { v: melhor, t: relogio });
    return melhor;
  }
  function ceuAberto(x: number, y: number, z: number): boolean {
    const k = `${x},${z}`;
    const c = cacheCeu.obter(k);
    if (c && relogio - c.t < 3) return y > c.topo;
    let topo = -1;
    for (let yy = ALTURA - 1; yy >= 0; yy--)
      if (obterBloco(bloco(x, yy, z))?.opaco) {
        topo = yy;
        break;
      }
    cacheCeu.guardar(k, { topo, t: relogio });
    return y > topo;
  }
  const criaturas: MundoPopulacao = {
    solido,
    agua: (x, y, z) => bloco(x, y, z) === Bloco.AGUA,
    luzBloco: luzAprox,
    ceuAberto,
    bioma: (x, z) => biomaEm(x, z, semente),
    // chão de verdade: ignora copas e plantas
    superficie: (x, z) => {
      if (!carregado(Math.floor(x / TAM_X), Math.floor(z / TAM_Z))) return null;
      for (let y = ALTURA - 2; y > 0; y--) {
        const d = obterBloco(bloco(x, y, z));
        if (d?.solido && !d.folhas && !d.planta) return y + 1;
      }
      return null;
    },
    nivelMar: NIVEL_MAR,
    povoados: (x, z, raio) => povoadosPerto(x, z, raio, semente),
    // spec 014 (T08): o chão da Cidade Grande, para os bichos nascerem na calçada e no parque
    chaoDaCidade: (x, z) => {
      const c = cidadeDoMundo(semente);
      if (!c) return null;
      const s = soloDaCidade(c, x, z);
      if (s === Solo.NADA) return null;
      const chao =
        s === Solo.CALCADA
          ? 'calcada'
          : s === Solo.GRAMA || s === Solo.CAMINHO
            ? 'parque'
            : s === Solo.LOTE
              ? 'lote'
              : s === Solo.LAGO
                ? 'lago'
                : 'rua';
      return { chao, y: c.h + 1 };
    },
  };
  return {
    semente,
    bloco,
    gerado,
    solido,
    criaturas,
    luzDaCelula,
    avancar(dt) {
      relogio += dt;
    },
    esquecer(cx, cz) {
      terreno.delete(`${cx},${cz}`);
      edicoes.tocar?.(cx, cz);
    },
  };
}
