/**
 * As missões do parque e os toques da Rua anos 80 (spec 026, parte 2, etapa B). Puro: os ids, as
 * chaves, os lugares e os alcances que o núcleo confere e a tela usa (a mesma conta nos dois).
 *
 * - **f5 Bilhete do parque:** um bilhete com três carimbos (a roda-gigante, o carrossel e o
 *   bate-bate). Cada passeio inteiro carimba o dele (as chaves `andou:*` que o núcleo já contava).
 * - **f6 Balões fugidos:** três balões da Dona Flor presos no parque (no pé da roda-gigante, numa
 *   árvore e na barra do toldo do carrossel). Um toque de perto, de baixo, e o balão desce até a
 *   mão. Devolvidos os três, ela dá um balão para a criança levar (fica com ela neste mundo).
 * - **f7 Lanche das lhamas:** pegar feno no fardo e pôr no cocho da fazendinha, duas vezes (uma
 *   braçada para cada lhama). Elas vêm comer e pulam de alegria.
 * - **f8 Prenda para a vovó:** a argola e a pescaria (sempre acerta), a lhama de pelúcia de
 *   prenda e a entrega à vovó, que espera no portãozinho da Casa anos 80.
 *
 * Sem pressa e sem jeito de errar: nada de tempo, nada de ordem, nada que se perde.
 */
import type { PontosParque } from '../world/vilaParque';
import { VOLTA_CARROSSEL } from './parque';
import { FENO } from './exclusivos';

export const F_BILHETE = 'f5';
export const F_BALOES = 'f6';
export const F_LANCHE = 'f7';
export const F_PRENDA = 'f8';

/** Os três carimbos do bilhete, na ordem das bolinhas (os "lugares" da missão). */
export const CARIMBOS = ['bilhete:roda', 'bilhete:carrossel', 'bilhete:bate'] as const;
/** O carimbo de cada passeio (a chave que o núcleo conta quando o passeio acaba). */
export function carimboDoPasseio(chave: string): string | null {
  if (chave === 'andou:roda') return CARIMBOS[0];
  if (chave === 'andou:carrossel') return CARIMBOS[1];
  if (chave === 'andou:bate') return CARIMBOS[2];
  return null;
}

/** Os três passos da prenda, na ordem das bolinhas: a argola, a pescaria e a vovó. */
export const PRENDAS = ['prenda:argola', 'prenda:pescaria', 'prenda:vovo'] as const;

/**
 * Parte 3B: o feno é um item só da Vila (`FENO`); o feixe de trigo que a f2 e a f7 davam antes
 * (um mundo salvo com ele na mochila) ainda vale para as duas missões: a lhama segue os dois e o
 * cocho aceita os dois. Quanto feno (de qualquer um dos dois) a criança tem.
 */
export const FENO_ANTIGO = 'trigo';
export const fenoNaMochila = (contar: (item: string) => number): number =>
  contar(FENO) + contar(FENO_ANTIGO);

/** As chaves que o núcleo conta. */
export const CHAVE_BALAO = 'pegou:balao';
export const CHAVE_LANCHE = 'lanche:feno';

/** Quantos balões fugiram. */
export const N_BALOES = 3;
/** Até onde (blocos, no chão) o toque no balão vale: de perto, de baixo. */
export const ALCANCE_BALAO = 8;
/** Até onde o toque no fardo e no cocho vale. */
export const ALCANCE_FARDO = 4.5;
export const ALCANCE_COCHO = 5;
/** Até onde o toque na barraca de prendas vale (o mesmo dos brinquedos de tocar). */
export const ALCANCE_BARRACA = 8;
/** Perto da vovó (blocos): a prenda é entregue. */
export const PERTO_DA_VOVO = 3.4;
/** Até onde o toque na parede de fitas da locadora e no balcão da lanchonete vale. */
export const ALCANCE_LOJA = 6.5;
/** Quantas vitaminas e fitas a criança leva de cada vez (o toque não enche a mochila). */
export const MAX_VITAMINAS = 2;
export const MAX_FITAS = 1;

type P3 = [number, number, number];

/** Um balão fugido: onde flutua agora (o meio do balão). */
export interface BalaoFugido {
  x: number;
  y: number;
  z: number;
}

/**
 * A que distância do meio do carrossel o balão fica preso e a que altura: embaixo da barra do
 * toldo (a barra vai de 5,45 a 5,75 do meio e começa a 4,93 do chão; o balão, de 0,52 do meio
 * dele até o alto, encosta nela por baixo, como balão que subiu e parou ali).
 */
const RAIO_NO_TOLDO = 5.6;
const ALTURA_NO_TOLDO = 4.4;
/** Onde, na volta do toldo, o balão está preso (rad): entre duas lâmpadas da barra. */
const ANGULO_NO_TOLDO = 0.8727;
/**
 * O balão do pé da roda-gigante: encostado por baixo na perna azul do cavalete da frente (a
 * perna sobe inclinada de 4,7 do meio, no chão, até o eixo), entre duas lâmpadas, no vão da
 * grade: do meio da roda para o lado, acima do chão e para a frente.
 */
const NO_PE_DA_RODA = { x: 1.86, y: 4.39, z: 2.3 } as const;

/**
 * Onde está o balão fugido `i` no instante `t` (o relógio do núcleo): 0 no pé da roda-gigante,
 * do lado de onde a criança chega; 1 na copa da árvore entre o carrossel e as barracas; 2 na
 * barra do toldo do carrossel (gira com ele, devagar: o toque acompanha).
 */
export function lugarDoBalao(pq: PontosParque, chao: number, i: number, t: number): BalaoFugido {
  if (i === 0)
    return {
      x: pq.roda.x + NO_PE_DA_RODA.x,
      y: chao + NO_PE_DA_RODA.y,
      z: pq.roda.z + NO_PE_DA_RODA.z,
    };
  if (i === 1) {
    const [x, y, z] = pq.arvoreDoBalao;
    return { x, y, z };
  }
  const giro = (Math.PI * 2 * t) / VOLTA_CARROSSEL + ANGULO_NO_TOLDO;
  return {
    x: pq.carrossel.x + Math.sin(giro) * RAIO_NO_TOLDO,
    y: chao + ALTURA_NO_TOLDO,
    z: pq.carrossel.z + Math.cos(giro) * RAIO_NO_TOLDO,
  };
}

/**
 * Onde a trilha do guia leva para cada balão (os pés no chão, do lado de fora da grade da roda,
 * ao lado da árvore, na beira do calçamento do carrossel).
 */
export function chaoDoBalao(pq: PontosParque, chao: number, i: number): P3 {
  // (do pé da roda, um pouco mais para fora: de perto, a câmera ficava presa embaixo da roda)
  if (i === 0) return [pq.roda.x + 3.0, chao, pq.roda.z + 7.4];
  if (i === 1) {
    // (a uns três blocos e meio: embaixo do balão ele ficava em cima da cabeça, fora da tela)
    const [x, , z] = pq.arvoreDoBalao;
    return [x + 2.1, chao, z + 2.9];
  }
  return [pq.carrossel.x + 5.2, chao, pq.carrossel.z + 6.4];
}

/** A criança (no chão, em x e z) alcança o balão `i` agora? */
export function alcancaOBalao(
  pq: PontosParque,
  chao: number,
  i: number,
  t: number,
  x: number,
  z: number,
): boolean {
  // o do carrossel gira com o toldo: vale de qualquer lugar da volta do carrossel (ela não
  // precisa correr atrás dele; o balão passa por ela a cada volta)
  if (i === 2)
    return (
      Math.hypot(pq.carrossel.x - x, pq.carrossel.z - z) <= pq.carrossel.beira + ALCANCE_BALAO - 2
    );
  const b = lugarDoBalao(pq, chao, i, t);
  return Math.hypot(b.x - x, b.z - z) <= ALCANCE_BALAO;
}

/** Perto do ponto (no chão)? */
export const pertoDe = (p: readonly number[], x: number, z: number, alcance: number): boolean =>
  Math.hypot(p[0] - x, p[2] - z) <= alcance;

/** As seis falas da voz boba do orelhão (só o número: a tela e o som sorteiam a mesma). */
export const FALAS_DO_ORELHAO = 6;
