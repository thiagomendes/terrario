/**
 * A volta no rinque (spec 026, a nova f4 da Vila Neon, escolhida pelo dono em 16 nov 2026): a
 * criança calça os patins (de graça, com um toque no suporte do rinque: é sempre uma escolha
 * dela) e passa por dentro dos três arcos de neon da pista. Puro: o núcleo conta (`rinque:arco`,
 * um por arco, só de patins), a tela acende o arco e o guia leva primeiro ao suporte e depois
 * aos arcos.
 *
 * Sem pressa nenhuma (nada de tempo, nada de ordem) e com arco largo: o vão tem uns 4 blocos.
 */

/** O toque no suporte dos patins: o dedo sobe a até tantos px de onde desceu, em até tanto tempo. */
export const TOQUE_SUPORTE_PX = 18;
export const TOQUE_SUPORTE_MS = 700;

/**
 * Foi um toque (o dedo desceu e subiu no mesmo lugar, rápido)? Arrastar o dedo para virar a
 * câmera ou deixar o dedo parado em cima do suporte não calça os patins.
 */
export function foiToque(dx: number, dy: number, ms: number): boolean {
  return Math.hypot(dx, dy) <= TOQUE_SUPORTE_PX && ms >= 0 && ms <= TOQUE_SUPORTE_MS;
}

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
