/**
 * As missões da Casa anos 80 e da rampa de skate (spec 026, parte 3, etapa B). Puro: os ids, os
 * passos (os "lugares" de cada missão), os alcances e a conta que o núcleo confere e a tela usa.
 *
 * - **f9 Sessão de cinema:** a fita da locadora, a fita no videocassete da sala e o filme visto
 *   no sofá, do lado da vovó. Vale quem se sentou no sofá durante o filme e ainda está na casa
 *   quando ele acaba (a regra macia: quem levanta no meio e senta de novo, ou só levanta no fim,
 *   também ganha; quem não sentou põe a fita de novo, que continua na mochila).
 * - **f10 Arrumar o quarto:** o ioiô (no quintal), o pião (na sala) e o cubo (no canto do quarto)
 *   estão espalhados, só para quem tem a missão aberta. Um toque pega; o toque no baú guarda.
 * - **f11 Volta na rampa:** três idas e voltas inteiras na rampa de skate (o trilho inteiro, a
 *   chave `andou:rampa` que o núcleo já contava), cada uma um carimbo.
 * - **f12 Bolo da vovó:** a vitamina da lanchonete para a vovó; ela agradece e dá uma fatia de
 *   bolo de fubá da mesinha do lado dela (comida, como as outras).
 *
 * Sem pressa e sem jeito de errar: nada de tempo, nada de ordem que se perde, nada de falhar.
 */
import type { PontosCasa } from '../world/vilaCasa';
import { CUBO_CORES, IOIO, PIAO } from './exclusivos';

export const F_CINEMA = 'f9';
export const F_QUARTO = 'f10';
export const F_RAMPA = 'f11';
export const F_BOLO = 'f12';

/** Os três passos do cinema, na ordem das bolinhas: a fita, o videocassete e o sofá. */
export const CINEMA = ['cinema:fita', 'cinema:tv', 'cinema:sofa'] as const;
/** Os três brinquedos guardados no baú, na ordem das bolinhas (e dos espalhados). */
export const QUARTO = ['quarto:ioio', 'quarto:piao', 'quarto:cubo'] as const;
/** Os dois passos do bolo: a vitamina na mochila e a vovó (que dá a fatia). */
export const BOLO = ['bolo:vitamina', 'bolo:vovo'] as const;
/** As idas e voltas na rampa (a meta da f11). */
export const VOLTAS_NA_RAMPA = 3;

/** Os brinquedos espalhados (os itens), na ordem de `QUARTO`. */
export const ESPALHADOS = [IOIO, PIAO, CUBO_CORES] as const;
/** Até onde (blocos, no chão) o toque no brinquedo espalhado vale. */
export const ALCANCE_ESPALHADO = 4.6;
/**
 * Na frente da vovó (blocos, do ponto entre o sofá e o tapete): ela recebe a vitamina. Só de
 * frente: chegando pela porta, por trás do sofá, ela dava o bolo de costas para a criança.
 */
export const PERTO_DA_VOVO_BOLO = 2;

/** O passo do cinema de cada um: quem está sentado num assento do sofá (não o da vovó)? */
export function sentadoNoSofa(c: PontosCasa, x: number, y: number, z: number): boolean {
  return c.sofa.assentos.some(
    (a, i) => i > 0 && Math.hypot(a.x - x, a.z - z) < 0.6 && Math.abs(a.y - y) < 0.4,
  );
}

/** Alcança o brinquedo espalhado `i` (no chão, perto dele)? */
export function alcancaOEspalhado(c: PontosCasa, i: number, x: number, y: number, z: number): boolean {
  const q = c.espalhados[i];
  return !!q && Math.hypot(q[0] - x, q[2] - z) <= ALCANCE_ESPALHADO && Math.abs(q[1] - y) < 2.5;
}

/** Na frente da vovó, dentro da casa (a vitamina chega até ela)? */
export function pertoDaVovo(c: PontosCasa, x: number, y: number, z: number): boolean {
  const f = c.vovo;
  return Math.hypot(f[0] - x, f[2] - z) <= PERTO_DA_VOVO_BOLO && Math.abs(c.y - y) < 2;
}
