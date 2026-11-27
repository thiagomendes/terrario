/**
 * Spec 039b (T01b): a mesa que junta para comer (puro: o núcleo e a previsão da tela leem).
 *
 * - **Os lugares em volta:** toda cadeira encostada num lado da mesa, no mesmo andar, em
 *   qualquer direção, e o lugar do sofá encostado. A ordem é fixa (pela célula do assento), para
 *   o núcleo e a tela escolherem igual quem come quando há mais de 4.
 * - **A cadeira posta colada à mesa** vira de frente para ela (só no `colocar`; no lote, no
 *   colar e no espelho a direção fica como veio).
 */
import { Bloco } from '../world/blocks';
import { movelEm, vetorDoMovel, type Celula, type LeitorMoveis, type MovelAchado } from './moveis';

/** Quantos comem juntos de uma comida posta na mesa. */
export const MAX_NA_MESA = 4;
/** Até onde (blocos, no chão, da beira da mesa) quem está em pé põe a comida. */
export const PERTO_DA_MESA = 2;

const LADOS: readonly (readonly [number, number])[] = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
];

/** A ordem fixa das células: x, depois z, depois y. */
export const ordemDasCelulas = (a: Celula, b: Celula): number =>
  a.x - b.x || a.z - b.z || a.y - b.y;

/**
 * Os lugares em volta da mesa: a célula de cada assento encostado (a cadeira inteira, ou a
 * célula do sofá inteiro que encosta), sem repetir, na ordem fixa.
 */
export function lugaresDaMesa(l: LeitorMoveis, mesa: MovelAchado): Celula[] {
  const dela = new Set(mesa.celulas.map((c) => `${c.x},${c.y},${c.z}`));
  const vistos = new Set<string>();
  const out: Celula[] = [];
  for (const c of mesa.celulas)
    for (const [dx, dz] of LADOS) {
      const x = c.x + dx;
      const z = c.z + dz;
      const k = `${x},${c.y},${z}`;
      if (dela.has(k) || vistos.has(k)) continue;
      const b = l.bloco(x, c.y, z);
      if (b !== Bloco.CADEIRA && b !== Bloco.SOFA) continue;
      // a peça solta não é assento
      if (!movelEm(l, x, c.y, z)) continue;
      vistos.add(k);
      out.push({ x, y: c.y, z });
    }
  return out.sort(ordemDasCelulas);
}

/**
 * A direção da cadeira posta em (x, y, z) colada a uma mesa (de frente para ela), ou null: não
 * há mesa inteira encostada. Com mesa em mais de um lado, vale o primeiro na ordem das direções.
 */
export function direcaoParaAMesa(l: LeitorMoveis, x: number, y: number, z: number): number | null {
  for (let d = 0; d < 4; d++) {
    const [dx, dz] = vetorDoMovel(d);
    if (l.bloco(x + dx, y, z + dz) !== Bloco.MESA) continue;
    if (movelEm(l, x + dx, y, z + dz)) return d;
  }
  return null;
}

/** Quem está em pé alcança a mesa (a distância no chão até a beira dela, no mesmo andar)? */
export function aoLadoDaMesa(mesa: MovelAchado, x: number, y: number, z: number): boolean {
  if (Math.abs(y - mesa.ancora.y) > 1.5) return false;
  return mesa.celulas.some((c) => {
    const dx = Math.max(c.x - x, 0, x - (c.x + 1));
    const dz = Math.max(c.z - z, 0, z - (c.z + 1));
    return Math.hypot(dx, dz) <= PERTO_DA_MESA;
  });
}

/**
 * Quem come da comida posta: os sentados em volta (só quem já chegou ao assento, sentado e não
 * deitado, e que não está no meio de outra refeição), até 4. Quem pôs come primeiro, se está em
 * volta; depois os outros, na ordem fixa das células dos assentos.
 */
export function quemComeNaMesa<T extends { id: string; lugar: Celula }>(
  lugares: readonly Celula[],
  sentados: readonly T[],
  quemPos: string,
): T[] {
  const k = (c: Celula) => `${c.x},${c.y},${c.z}`;
  const emVolta = new Set(lugares.map(k));
  const lista = sentados.filter((s) => emVolta.has(k(s.lugar)));
  lista.sort((a, b) =>
    a.id === quemPos ? -1 : b.id === quemPos ? 1 : ordemDasCelulas(a.lugar, b.lugar),
  );
  return lista.slice(0, MAX_NA_MESA);
}
