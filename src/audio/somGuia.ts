/**
 * Spec 030: os sons do guia da missão, uma família só (sininhos macios de verde-água, sem
 * zumbido nem buzina): a **trilha** acendendo (a ondinha que sai dos pés: três notinhas
 * subindo), **chegou** no lugar (as mesmas notas, mais um sino em cima) e o **certo** (o ✓
 * do núcleo: tim-tim). Tocam pelo motor do jogo (seguem o volume dos efeitos e o mudo). A tela
 * pede pelo evento `terrario:somGuia` (ela não conhece o motor), como os sons de interface.
 */
import type { MotorAudio } from './motor';
import { tocarNotas, type NotaCurta } from './sons';

export type SomGuia = 'trilha' | 'chegou' | 'certo';
export const EVENTO_SOM_GUIA = 'terrario:somGuia';
const SONS: readonly SomGuia[] = ['trilha', 'chegou', 'certo'];
export const ehSomGuia = (v: unknown): v is SomGuia => SONS.includes(v as SomGuia);

/** Uma notinha de sino: a fundamental, a oitava bem baixinha e um triângulo junto. */
const sino = (t: number, f: number, pico = 0.42, queda = 0.4): NotaCurta[] => [
  { t, f, pico, queda },
  { t, f: f * 2, pico: pico * 0.16, queda: queda * 0.6 },
  { t, f: f * 1.003, tipo: 'triangle', pico: pico * 0.3, queda },
];

/** As notas de cada som (sol, ré, sol: a mesma escadinha nos três). */
export function notasDoGuia(som: SomGuia): NotaCurta[] {
  if (som === 'trilha') return [784, 1175, 1568].flatMap((f, i) => sino(i * 0.09, f, 0.36, 0.38));
  if (som === 'chegou')
    return [
      ...[784, 1175, 1568].flatMap((f, i) => sino(i * 0.07, f, 0.34, 0.32)),
      ...sino(0.24, 2349, 0.3, 0.6),
    ];
  return [...sino(0, 1046.5, 0.4, 0.4), ...sino(0.11, 1318.5, 0.45, 0.55)];
}

export function tocarSomGuia(motor: MotorAudio, som: SomGuia): boolean {
  return tocarNotas(motor, notasDoGuia(som), 0.2);
}

/** Pede um som do guia à cena. */
export function pedirSomGuia(som: SomGuia): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENTO_SOM_GUIA, { detail: som }));
}
