import { ALTURA_JOGADOR, MEIA_LARGURA } from '../player/fisica';
import { Bloco, obterBloco } from '../world/blocks';
import { CRIATURAS, type TipoSer } from './criaturas';

/**
 * Spec 037: a regra de construir, a mesma no núcleo (servidor local e nuvem) e na previsão do
 * cliente, para nada piscar:
 * - **corpo:** bloco sólido nunca entra onde há um corpo (a criança, um amigo, um bicho, um
 *   morador ou um peixe);
 * - **apoio:** o bloco novo encosta (por uma face) num bloco sólido ou está na última camada do
 *   mundo; a porta pede chão sólido embaixo. A célula da planta (a obra aberta, o bolo) segue a
 *   própria planta, e o lote do criativo (colar, espelho) não tem a regra de apoio. O apoio só
 *   vale na hora de colocar: quebrar o apoio depois deixa o bloco onde está.
 */

/** Um corpo que o bloco não pode prender: os pés no centro de baixo da caixa. */
export interface Corpo {
  x: number;
  y: number;
  z: number;
  /** Meia largura da caixa. */
  mw: number;
  alt: number;
}

export interface Celula {
  x: number;
  y: number;
  z: number;
}

export type LerBloco = (x: number, y: number, z: number) => number;

/**
 * A folga do amigo: a posição dele chega atrasada (150 a 300 ms), então a caixa dele cresce na
 * horizontal com a velocidade que ele mesmo informa. Parado, nada (dá para construir uma parede
 * colada nele).
 */
export const FOLGA_POR_VELOCIDADE = 0.15;
export const FOLGA_MAXIMA = 0.6;

export function folgaDoAmigo(vel: number): number {
  if (!Number.isFinite(vel) || vel <= 0) return 0;
  return Math.min(FOLGA_MAXIMA, vel * FOLGA_POR_VELOCIDADE);
}

/** O corpo de um jogador (os pés em x, y, z); o do amigo leva a folga pela velocidade. */
export function corpoDeJogador(
  p: { x: number; y: number; z: number; vel?: number },
  amigo: boolean,
): Corpo {
  return {
    x: p.x,
    y: p.y,
    z: p.z,
    mw: MEIA_LARGURA + (amigo ? folgaDoAmigo(p.vel ?? 0) : 0),
    alt: ALTURA_JOGADOR,
  };
}

/** A célula (x, y, z) toca a caixa do corpo? (encostar na face não conta) */
export function corpoNaCelula(c: Celula, k: Corpo): boolean {
  return (
    c.x < k.x + k.mw &&
    c.x + 1 > k.x - k.mw &&
    c.y < k.y + k.alt &&
    c.y + 1 > k.y &&
    c.z < k.z + k.mw &&
    c.z + 1 > k.z - k.mw
  );
}

/** O bloco serve de apoio? (só o sólido: tocha, porta aberta, placa, poste e lavoura, não) */
export function blocoApoia(b: number): boolean {
  return b !== Bloco.AR && !!obterBloco(b)?.solido;
}

const VIZINHOS: readonly (readonly [number, number, number])[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

/** A célula encosta num bloco sólido (por uma face) ou está na última camada do mundo? */
export function temApoio(c: Celula, ler: LerBloco): boolean {
  if (c.y <= 0) return true;
  for (const [dx, dy, dz] of VIZINHOS)
    if (blocoApoia(ler(c.x + dx, c.y + dy, c.z + dz))) return true;
  return false;
}

/** O bloco ocupa espaço (prende quem estiver ali)? */
export function blocoOcupa(b: number): boolean {
  return b !== Bloco.AR && !!obterBloco(b)?.solido;
}

/** Algum dos corpos está numa das células? */
export function algumCorpo(celulas: readonly Celula[], corpos: Iterable<Corpo>): boolean {
  for (const k of corpos) for (const c of celulas) if (corpoNaCelula(c, k)) return true;
  return false;
}

export interface PedidoConstruir {
  bloco: number;
  /** A célula do bloco primeiro; a porta leva também a metade de cima. */
  celulas: readonly Celula[];
  /** A célula é da planta (obra aberta ou bolo) com o bloco certo: segue a planta, sem apoio. */
  planejada?: boolean;
  /** Lote do criativo (colar, espelho, ferramentas do computador): sem apoio, com corpo. */
  lote?: boolean;
  ler: LerBloco;
  corpos: Iterable<Corpo>;
}

export type RecusaConstruir = 'corpo' | 'apoio';

/** O bloco pode entrar? null: pode; senão, o porquê. */
export function recusaConstruir(p: PedidoConstruir): RecusaConstruir | null {
  if (blocoOcupa(p.bloco) && algumCorpo(p.celulas, p.corpos)) return 'corpo';
  if (p.lote || p.planejada) return null;
  const c = p.celulas[0];
  if (!c) return null;
  // a porta fica de pé no chão (a metade de cima encosta na de baixo)
  if (p.bloco === Bloco.PORTA)
    return c.y <= 0 || blocoApoia(p.ler(c.x, c.y - 1, c.z)) ? null : 'apoio';
  return temApoio(c, p.ler) ? null : 'apoio';
}

/**
 * Os corpos de um retrato: quem coloca (a caixa do corpo), os amigos (com a folga) e os bichos,
 * moradores e peixes (o que está morrendo, não). O núcleo monta com as posições que ele tem; o
 * cliente, com as do último retrato que o núcleo mandou (a mesma conta, para nada piscar).
 */
export function corposDoRetrato(
  eu: { x: number; y: number; z: number } | null,
  amigos: Iterable<{ x: number; y: number; z: number; vel?: number }>,
  bichos: Iterable<{ tipo: TipoSer; x: number; y: number; z: number; estado: string }>,
): Corpo[] {
  const r: Corpo[] = [];
  if (eu) r.push(corpoDeJogador(eu, false));
  for (const o of amigos) r.push(corpoDeJogador(o, true));
  for (const c of bichos) {
    if (c.estado === 'morrendo') continue;
    const d = CRIATURAS[c.tipo];
    if (d) r.push({ x: c.x, y: c.y, z: c.z, mw: d.mw, alt: d.alt });
  }
  return r;
}

/** Os corpos perto da célula (para não passar por todos os bichos do mundo a cada bloco). */
export function corposNaRegiao<T extends Corpo>(
  corpos: Iterable<T>,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
): T[] {
  const r: T[] = [];
  for (const k of corpos)
    if (
      k.x + k.mw > x0 &&
      k.x - k.mw < x1 + 1 &&
      k.y + k.alt > y0 &&
      k.y < y1 + 1 &&
      k.z + k.mw > z0 &&
      k.z - k.mw < z1 + 1
    )
      r.push(k);
  return r;
}
