/**
 * A volta no rinque (spec 026, a nova f4 da Vila Neon, escolhida pelo dono em 16 nov 2026): a
 * criança calça os patins (de graça no suporte do rinque, ou com a fantasia Patinadora) e passa
 * por dentro dos três arcos de neon da pista. Puro: o núcleo conta (`rinque:arco`, um por arco,
 * só de patins), a tela acende o arco e o guia leva primeiro ao suporte e depois aos arcos.
 *
 * Sem pressa nenhuma (nada de tempo, nada de ordem) e com arco largo: o vão tem uns 4 blocos.
 */

/** A missão nova (id novo: quem fez a f3 de antes, do show, faz esta também). */
export const F_RINQUE = 'f4';
/** A chave que o núcleo conta (um arco por vez). */
export const CHAVE_ARCO = 'rinque:arco';

/** Um arco do rinque (mundo): o meio no chão, para onde vão os postes e a meia largura. */
export interface ArcoRinque {
  x: number;
  /** Os pés no chão da pista. */
  y: number;
  z: number;
  /** O eixo dos dois postes ('x': os postes de um lado e do outro em x; passa-se andando em z). */
  eixo: 'x' | 'z';
  /** Do meio ao centro de cada poste (blocos). */
  meia: number;
}

/** O poste do arco: a grossura (blocos) e a altura da trave (os pés da criança até o alto). */
export const GROSSURA_POSTE = 0.8;
export const ALTURA_ARCO = 4.4;
/** Do meio do arco até onde ainda conta como "dentro", de lado (blocos). */
const FUNDO_DENTRO = 0.75;

/** Os pés (x, y, z) estão dentro do vão do arco (entre os postes, debaixo da trave)? */
export function dentroDoArco(a: ArcoRinque, x: number, y: number, z: number): boolean {
  const ao = a.eixo === 'x' ? x - a.x : z - a.z;
  const atravessa = a.eixo === 'x' ? z - a.z : x - a.x;
  const vao = a.meia - GROSSURA_POSTE / 2 - 0.05;
  return (
    Math.abs(ao) <= vao && Math.abs(atravessa) <= FUNDO_DENTRO && y >= a.y - 0.6 && y <= a.y + 2.5
  );
}
