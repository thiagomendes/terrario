/**
 * Acesso do núcleo aos blocos: terreno gerado pela semente (com cache), edições por
 * cima e as consultas que as criaturas usam (luz aproximada, céu aberto, superfície).
 * Puro: roda igual no Web Worker do servidor local e no Node do servidor da nuvem.
 */
import { ALTURA, TAM_X, TAM_Z, gerarChunk, indice, biomaEm, NIVEL_MAR } from '../world/chunk';
import { Bloco, obterBloco, luzDoBloco } from '../world/blocks';
import type { Edicoes } from '../world/edicoes';
import { criarMundoSolido } from '../world/solido';
import type { MundoPopulacao } from '../jogo/populacao';
import { povoadosPerto } from '../jogo/povoados';
import type { Solido } from '../player/fisica';

/** Chunks de terreno guardados (cada um tem 32 KB). */
const LIMITE_TERRENO = 400;

export interface AcessoMundo {
  readonly semente: number;
  /** Bloco atual (edição ou terreno). */
  bloco(x: number, y: number, z: number): number;
  /** Bloco do terreno gerado, sem edições (distingue baú de ruína de baú posto). */
  gerado(x: number, y: number, z: number): number;
  solido: Solido;
  /** Mundo como as criaturas o veem. */
  readonly criaturas: MundoPopulacao;
  /** Avança o relógio dos caches de luz e céu. */
  avancar(dt: number): void;
}

export function criarAcessoMundo(semente: number, edicoes: Edicoes): AcessoMundo {
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
  const solido = criarMundoSolido(semente, (cx, cz) => base(cx, cz), edicoes);

  // as mesmas aproximações que a cena usava (luz de fontes num raio e topo opaco da coluna)
  let relogio = 0;
  const cacheLuz = new Map<string, { v: number; t: number }>();
  const cacheCeu = new Map<string, { topo: number; t: number }>();
  function luzAprox(xr: number, yr: number, zr: number): number {
    // célula de 2x2x2: criaturas andando não forçam uma varredura nova a cada bloco
    const x = xr & ~1;
    const y = yr & ~1;
    const z = zr & ~1;
    const k = `${x},${y},${z}`;
    const c = cacheLuz.get(k);
    if (c && relogio - c.t < 2) return c.v;
    let melhor = 0;
    for (let dy = -4; dy <= 4; dy++)
      for (let dz = -7; dz <= 7; dz++)
        for (let dx = -7; dx <= 7; dx++) {
          const l = luzDoBloco(bloco(x + dx, y + dy, z + dz));
          if (l > 0) melhor = Math.max(melhor, l - Math.abs(dx) - Math.abs(dy) - Math.abs(dz));
        }
    cacheLuz.set(k, { v: melhor, t: relogio });
    if (cacheLuz.size > 4000) cacheLuz.clear();
    return melhor;
  }
  function ceuAberto(x: number, y: number, z: number): boolean {
    const k = `${x},${z}`;
    const c = cacheCeu.get(k);
    if (c && relogio - c.t < 3) return y > c.topo;
    let topo = -1;
    for (let yy = ALTURA - 1; yy >= 0; yy--)
      if (obterBloco(bloco(x, yy, z))?.opaco) {
        topo = yy;
        break;
      }
    cacheCeu.set(k, { topo, t: relogio });
    if (cacheCeu.size > 4000) cacheCeu.clear();
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
      for (let y = ALTURA - 2; y > 0; y--) {
        const d = obterBloco(bloco(x, y, z));
        if (d?.solido && !d.folhas && !d.planta) return y + 1;
      }
      return null;
    },
    nivelMar: NIVEL_MAR,
    povoados: (x, z, raio) => povoadosPerto(x, z, raio, semente),
  };
  return {
    semente,
    bloco,
    gerado,
    solido,
    criaturas,
    avancar(dt) {
      relogio += dt;
    },
  };
}
