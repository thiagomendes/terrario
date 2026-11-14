/**
 * Spec 021 "Achar o amigo" (T05): o caminho a pé nos blocos, para a trilha de estrelinhas,
 * e a regra de "dá para ficar de pé aqui", que o pulo para perto também usa (no núcleo).
 *
 * A* por colunas: de uma célula para as 8 vizinhas, subindo no máximo 1 bloco e descendo no
 * máximo 3 (mais que isso é buraco), sem cortar quina e sem entrar na água. Onde o aparelho
 * ainda não tem os blocos, o caminho segue reto (plano). Sem caminho inteiro (morro alto
 * demais, rio), vai até o ponto mais perto aonde dá para chegar e diz que não completou.
 */
import { Bloco, obterBloco } from '../world/blocks';

export type V3 = [number, number, number];

/** Lê os blocos (o núcleo e o cliente dão a sua cópia do mundo). */
export type LerBloco = (x: number, y: number, z: number) => number;

export function ehSolido(b: number): boolean {
  if (b === Bloco.AR) return false;
  const d = obterBloco(b);
  return !!d && d.solido && !d.liquido;
}
export function ehAgua(b: number): boolean {
  return !!obterBloco(b)?.liquido;
}
export function ehFolha(b: number): boolean {
  return !!obterBloco(b)?.folhas;
}

/**
 * Dá para ficar de pé com os pés na célula (x, y, z)? Chão firme embaixo (não a copa de uma
 * árvore), duas células livres (pés e cabeça) e nada de água.
 */
export function dePe(bloco: LerBloco, x: number, y: number, z: number): boolean {
  const chao = bloco(x, y - 1, z);
  if (!ehSolido(chao) || ehFolha(chao)) return false;
  const pes = bloco(x, y, z);
  if (ehSolido(pes) || ehAgua(pes)) return false;
  return !ehSolido(bloco(x, y + 1, z));
}

/** A altura em que dá para ficar de pé em (x, z), procurando de y0 até y1 (para baixo). */
export function chaoNaColuna(bloco: LerBloco, x: number, z: number, y0: number, y1: number): number | null {
  for (let y = Math.floor(y0); y >= Math.max(1, Math.floor(y1)); y--)
    if (dePe(bloco, x, y, z)) return y;
  return null;
}

export interface LeitorCaminho {
  bloco: LerBloco;
  /** O aparelho tem os blocos desta coluna? (sem eles, o caminho segue reto) */
  conhecido(x: number, z: number): boolean;
  /** Custo a mais de pisar na célula (spec 030: a roça e a beira da cerca no sítio). */
  custo?(x: number, y: number, z: number): number;
}

export interface Caminho {
  /** Centros das células do caminho, do começo ao fim (y: a célula dos pés). */
  pts: V3[];
  /** Chegou até o amigo (senão, termina no ponto mais perto aonde dá para chegar). */
  completo: boolean;
}

/** Folga em volta do retângulo entre os dois pontos (o caminho pode contornar por fora). */
const FOLGA = 24;
/** Teto de células do retângulo (uns 300 × 300) e de passos da busca. */
const MAX_CELULAS = 90_000;
const MAX_PASSOS = 60_000;

/** A busca inteira de uma vez (testes e o núcleo). */
export function procurarCaminho(m: LeitorCaminho, de: V3, ate: V3): Caminho {
  const it = buscarCaminho(m, de, ate);
  for (;;) {
    const r = it.next();
    if (r.done) return r.value;
  }
}

/** Passos da busca entre duas pausas (a tela não trava: a busca anda em fatias). */
const PASSOS_POR_FATIA = 1500;

/**
 * A busca em fatias: a cada PASSOS_POR_FATIA passos ela devolve o controle (yield), e quem
 * chama decide se continua agora ou no próximo quadro. No fim, devolve o caminho.
 */
export function* buscarCaminho(
  m: LeitorCaminho,
  de: V3,
  ate: V3,
): Generator<void, Caminho, void> {
  const x0 = Math.floor(de[0]);
  const z0 = Math.floor(de[2]);
  let x1 = Math.floor(ate[0]);
  let z1 = Math.floor(ate[2]);
  // longe demais para o retângulo: mira um ponto na direção do amigo (a trilha mostra o rumo)
  const span = Math.sqrt(MAX_CELULAS) - 2 * FOLGA - 2;
  const dist = Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0));
  const encurtou = dist > span;
  if (encurtou) {
    const k = span / dist;
    x1 = x0 + Math.round((x1 - x0) * k);
    z1 = z0 + Math.round((z1 - z0) * k);
  }
  const minX = Math.min(x0, x1) - FOLGA;
  const minZ = Math.min(z0, z1) - FOLGA;
  const W = Math.max(x0, x1) + FOLGA - minX + 1;
  const H = Math.max(z0, z1) + FOLGA - minZ + 1;
  const N = W * H;
  const g = new Float32Array(N).fill(Infinity);
  const f = new Float32Array(N).fill(Infinity);
  const alt = new Int16Array(N).fill(-1);
  const veio = new Int32Array(N).fill(-1);
  const fechado = new Uint8Array(N);
  // memória do último "onde fica o chão vindo da altura y" de cada célula
  const memoY = new Int16Array(N).fill(-32768);
  const memoR = new Int16Array(N);
  const conhecida = new Int8Array(N).fill(-1);
  const id = (x: number, z: number) => (z - minZ) * W + (x - minX);
  const yIni =
    chaoNaColuna(m.bloco, x0, z0, Math.floor(de[1]) + 1, Math.floor(de[1]) - 3) ??
    Math.floor(de[1]);
  const ini = id(x0, z0);
  const fim = id(x1, z1);
  const yFim = Math.floor(ate[1]);
  g[ini] = 0;
  alt[ini] = yIni;
  const h = (x: number, z: number) => {
    const dx = Math.abs(x - x1);
    const dz = Math.abs(z - z1);
    return dx + dz + (Math.SQRT2 - 2) * Math.min(dx, dz);
  };
  const heap: number[] = [];
  const push = (i: number) => {
    heap.push(i);
    let k = heap.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (f[heap[p]] <= f[heap[k]]) break;
      [heap[p], heap[k]] = [heap[k], heap[p]];
      k = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1;
        const r = l + 1;
        let mm = k;
        if (l < heap.length && f[heap[l]] < f[heap[mm]]) mm = l;
        if (r < heap.length && f[heap[r]] < f[heap[mm]]) mm = r;
        if (mm === k) break;
        [heap[mm], heap[k]] = [heap[k], heap[mm]];
        k = mm;
      }
    }
    return top;
  };
  f[ini] = h(x0, z0);
  push(ini);
  /** A célula dos pés em (x, z) vindo da altura y: sobe 1, desce até 3 (ou null). */
  const passoY = (x: number, z: number, y: number): number | null => {
    const i = id(x, z);
    if (conhecida[i] < 0) conhecida[i] = m.conhecido(x, z) ? 1 : 0;
    // sem os blocos: segue plano
    if (!conhecida[i]) return y;
    if (memoY[i] === y) return memoR[i] === -1 ? null : memoR[i];
    let r = -1;
    for (let yy = y + 1; yy >= y - 3; yy--)
      if (dePe(m.bloco, x, yy, z)) {
        r = yy;
        break;
      }
    memoY[i] = y;
    memoR[i] = r;
    return r === -1 ? null : r;
  };
  let achou = -1;
  let melhor = ini;
  let hMelhor = h(x0, z0);
  let passos = 0;
  while (heap.length && passos++ < MAX_PASSOS) {
    if (passos % PASSOS_POR_FATIA === 0) yield;
    const i = pop();
    if (fechado[i]) continue;
    fechado[i] = 1;
    const x = (i % W) + minX;
    const z = Math.floor(i / W) + minZ;
    const hi = h(x, z);
    if (hi < hMelhor) {
      hMelhor = hi;
      melhor = i;
    }
    if (
      i === fim ||
      (!encurtou && Math.abs(x - x1) <= 1 && Math.abs(z - z1) <= 1 && Math.abs(alt[i] - yFim) < 3)
    ) {
      achou = i;
      break;
    }
    const y = alt[i];
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        if (!dx && !dz) continue;
        const nx = x + dx;
        const nz = z + dz;
        if (nx < minX || nz < minZ || nx >= minX + W || nz >= minZ + H) continue;
        const j = id(nx, nz);
        if (fechado[j]) continue;
        const ny = passoY(nx, nz, y);
        if (ny === null) continue;
        // na diagonal, as duas laterais também têm que dar passagem (sem cortar quina)
        if (dx && dz && (passoY(x + dx, z, y) === null || passoY(x, z + dz, y) === null)) continue;
        const custo =
          (dx && dz ? Math.SQRT2 : 1) + (ny > y ? 0.6 : ny < y ? 0.2 : 0) + (m.custo?.(nx, ny, nz) ?? 0);
        const ng = g[i] + custo;
        if (ng < g[j]) {
          g[j] = ng;
          alt[j] = ny;
          veio[j] = i;
          f[j] = ng + h(nx, nz) * 1.15;
          push(j);
        }
      }
  }
  const completo = achou >= 0 && !encurtou;
  if (achou < 0) achou = melhor;
  if (achou === ini) return { pts: [], completo: false };
  const pts: V3[] = [];
  for (let i = achou; i >= 0; i = veio[i])
    pts.push([(i % W) + minX + 0.5, alt[i], Math.floor(i / W) + minZ + 0.5]);
  pts.reverse();
  return { pts, completo };
}

/** Pontos a cada `passo` blocos ao longo do caminho (as estrelinhas), no máximo `max`. */
export function espalharEstrelas(pts: readonly V3[], passo = 0.8, max = 300): V3[] {
  const out: V3[] = [];
  let sobra = 0.6;
  for (let i = 1; i < pts.length && out.length < max; i++) {
    const [ax, ay, az] = pts[i - 1];
    const [bx, by, bz] = pts[i];
    const d = Math.hypot(bx - ax, bz - az);
    let t = sobra;
    while (t < d && out.length < max) {
      const k = t / d;
      out.push([ax + (bx - ax) * k, ay + (by - ay) * k, az + (bz - az) * k]);
      t += passo;
    }
    sobra = t - d;
  }
  return out;
}

/** O ponto do caminho mais perto de (x, z) e a distância até ele (no chão). */
export function maisPertoDoCaminho(pts: readonly V3[], x: number, z: number): { i: number; d: number } {
  let i = -1;
  let d2 = Infinity;
  for (let k = 0; k < pts.length; k++) {
    const e = (pts[k][0] - x) ** 2 + (pts[k][2] - z) ** 2;
    if (e < d2) {
      d2 = e;
      i = k;
    }
  }
  return { i, d: Math.sqrt(d2) };
}
