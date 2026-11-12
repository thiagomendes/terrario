/**
 * Sons do canteiro de obras (spec 014, T06): curtos, macios e nunca em laço, abaixo da trilha
 * e das vozes (a régua da 019). Sintetizados aqui até a T09 trazer as vozes gravadas do
 * pedreiro ("hum?" e "ta-dá").
 */
import type { MotorAudio } from './motor';
import { tocarNotas, type NotaCurta } from './sons';

/** A escala que a obra toca, bloco a bloco (pentatônica de dó, subindo). */
export const ESCALA_OBRA = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093];

/** A nota do bloco: sobe conforme a obra avança (o primeiro é o dó, o último o dó agudo). */
export function notaDaObra(cheias: number, total: number): number {
  const k = total <= 1 ? 0 : Math.round(((cheias - 1) / (total - 1)) * (ESCALA_OBRA.length - 1));
  return ESCALA_OBRA[Math.max(0, Math.min(ESCALA_OBRA.length - 1, k))];
}

/** "Plim" de cada bloco posto, com um sopro de poeirinha. */
export function plimDaObra(motor: MotorAudio, cheias: number, total: number, volume = 1): void {
  const f = notaDaObra(cheias, total);
  tocarNotas(
    motor,
    [
      { t: 0, f, pico: 0.5, queda: 0.35 },
      { t: 0, f: f * 2, pico: 0.12, queda: 0.2 },
      { t: 0, f: 700, tipo: 'ruido', pico: 0.18, queda: 0.08 },
    ],
    0.2 * volume,
  );
}

/** Acorde curto de piano ao fechar uma camada. */
export function acordeDaCamada(motor: MotorAudio, volume = 1): void {
  const notas: NotaCurta[] = [];
  [262, 330, 392, 523].forEach((f, i) => {
    notas.push({ t: i * 0.025, f, tipo: 'triangle', pico: 0.4, queda: 0.7 });
    notas.push({ t: i * 0.025, f: f * 2, pico: 0.1, queda: 0.5 });
  });
  tocarNotas(motor, notas, 0.16 * volume);
}

/** O "ta-dá" da obra feita: piano subindo e a buzininha de brinquedo. */
export function taDa(motor: MotorAudio, grande = false, volume = 1): void {
  const notas: NotaCurta[] = [];
  [392, 523, 659, 784].forEach((f, i) =>
    notas.push({ t: i * 0.09, f, tipo: 'triangle', pico: 0.45, queda: 0.4 }),
  );
  notas.push({ t: 0.36, f: 1047, tipo: 'triangle', pico: 0.5, queda: 0.9 });
  notas.push({ t: 0.36, f: 523, pico: 0.25, queda: 0.9 });
  // "fom-fom" de brinquedo
  notas.push({ t: 0.75, f: 330, f1: 320, tipo: 'square', pico: 0.12, queda: 0.12 });
  notas.push({ t: 0.92, f: 392, f1: 380, tipo: 'square', pico: 0.12, queda: 0.16 });
  if (grande)
    // festa maior das seis: fogos de brinquedo (estrelinhas que sobem)
    for (let i = 0; i < 6; i++)
      notas.push({
        t: 1.2 + i * 0.12,
        f: 900 + i * 180,
        f1: 1800 + i * 200,
        pico: 0.15,
        queda: 0.25,
      });
  tocarNotas(motor, notas, 0.2 * volume);
}

/** O "hum?" curto do pedreiro (bloco errado: nada de som de erro). */
export function humDoPedreiro(motor: MotorAudio, volume = 1): void {
  tocarNotas(
    motor,
    [
      { t: 0, f: 200, f1: 190, tipo: 'triangle', pico: 0.45, queda: 0.16 },
      { t: 0.17, f: 210, f1: 290, tipo: 'triangle', pico: 0.45, queda: 0.22 },
    ],
    0.2 * volume,
  );
}

/** A musiquinha do coreto (caixinha de música, nossa): toca quando alguém entra nele. */
export function musiquinhaDoCoreto(motor: MotorAudio, volume = 1): void {
  const frase = [784, 659, 784, 880, 784, 659, 587, 659, 523];
  tocarNotas(
    motor,
    frase.map((f, i) => ({ t: i * 0.22, f: f * 1.5, pico: 0.35, queda: 0.35 })),
    0.12 * volume,
  );
}

/** O brilho da colher que chega na mão. */
export function plimDaColher(motor: MotorAudio): void {
  tocarNotas(
    motor,
    [
      { t: 0, f: 1319, pico: 0.4, queda: 0.4 },
      { t: 0.08, f: 1760, pico: 0.3, queda: 0.5 },
    ],
    0.18,
  );
}
