/**
 * Sons do canteiro de obras (spec 014): curtos, macios e nunca em laço, abaixo da trilha e
 * das vozes (a régua da 019). T09: cada um tem a versão gravada no pacote de vozes da cidade
 * (`obra` no `indice.json`: plim de piano em cada nota da escala, acorde, ta-dá com a
 * buzininha e o "ta-dá!" do pedreiro, o "hum?" dele, a caixinha de música do coreto e o brilho
 * da colher), tocada por `gravada`; a sintetizada daqui fica de reserva (o pacote ainda não
 * chegou, ou falhou) e de régua (a gravada nunca soa mais alto que ela).
 */
import type { MotorAudio } from './motor';
import { tocarNotas, type NotaCurta } from './sons';

/**
 * Toca o som gravado da obra (`chave`, a fatia `indice`), ou chama `reserva` (a sintetizada)
 * se ele não estiver pronto.
 */
export type TocadorObra = (
  chave: string,
  volume: number,
  reserva: () => boolean,
  indice?: number,
) => void;

/** A escala que a obra toca, bloco a bloco (pentatônica de dó, subindo). */
export const ESCALA_OBRA = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093];

/** Qual nota da escala o bloco toca: sobe conforme a obra avança (do dó ao dó agudo). */
export function indiceDaNota(cheias: number, total: number): number {
  const k = total <= 1 ? 0 : Math.round(((cheias - 1) / (total - 1)) * (ESCALA_OBRA.length - 1));
  return Math.max(0, Math.min(ESCALA_OBRA.length - 1, k));
}

/** A nota do bloco: sobe conforme a obra avança (o primeiro é o dó, o último o dó agudo). */
export function notaDaObra(cheias: number, total: number): number {
  return ESCALA_OBRA[indiceDaNota(cheias, total)];
}

const tocar = (motor: MotorAudio, notas: NotaCurta[], ganho: number) => {
  tocarNotas(motor, notas, ganho);
  return true;
};

/** O "plim" sintetizado de uma nota (com o sopro de poeirinha). */
export function plimSintetizado(motor: MotorAudio, f: number, volume = 1): boolean {
  return tocar(
    motor,
    [
      { t: 0, f, pico: 0.5, queda: 0.35 },
      { t: 0, f: f * 2, pico: 0.12, queda: 0.2 },
      { t: 0, f: 700, tipo: 'ruido', pico: 0.18, queda: 0.08 },
    ],
    0.2 * volume,
  );
}

/** "Plim" de cada bloco posto, com um sopro de poeirinha. */
export function plimDaObra(
  motor: MotorAudio,
  cheias: number,
  total: number,
  volume = 1,
  gravada?: TocadorObra,
): void {
  const i = indiceDaNota(cheias, total);
  const reserva = () => plimSintetizado(motor, ESCALA_OBRA[i], volume);
  if (gravada) gravada('plim', volume, reserva, i);
  else reserva();
}

export function acordeSintetizado(motor: MotorAudio, volume = 1): boolean {
  const notas: NotaCurta[] = [];
  [262, 330, 392, 523].forEach((f, i) => {
    notas.push({ t: i * 0.025, f, tipo: 'triangle', pico: 0.4, queda: 0.7 });
    notas.push({ t: i * 0.025, f: f * 2, pico: 0.1, queda: 0.5 });
  });
  return tocar(motor, notas, 0.16 * volume);
}

/** Acorde curto de piano ao fechar uma camada. */
export function acordeDaCamada(motor: MotorAudio, volume = 1, gravada?: TocadorObra): void {
  const reserva = () => acordeSintetizado(motor, volume);
  if (gravada) gravada('acorde', volume, reserva);
  else reserva();
}

export function taDaSintetizado(motor: MotorAudio, grande = false, volume = 1): boolean {
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
  return tocar(motor, notas, 0.2 * volume);
}

/** O "ta-dá" da obra feita: piano subindo e a buzininha de brinquedo. */
export function taDa(motor: MotorAudio, grande = false, volume = 1, gravada?: TocadorObra): void {
  const reserva = () => taDaSintetizado(motor, grande, volume);
  if (gravada) gravada(grande ? 'tadaGrande' : 'tada', volume, reserva);
  else reserva();
}

export function humSintetizado(motor: MotorAudio, volume = 1): boolean {
  return tocar(
    motor,
    [
      { t: 0, f: 200, f1: 190, tipo: 'triangle', pico: 0.45, queda: 0.16 },
      { t: 0.17, f: 210, f1: 290, tipo: 'triangle', pico: 0.45, queda: 0.22 },
    ],
    0.2 * volume,
  );
}

/** O "hum?" curto do pedreiro (bloco errado: nada de som de erro). */
export function humDoPedreiro(motor: MotorAudio, volume = 1, gravada?: TocadorObra): void {
  const reserva = () => humSintetizado(motor, volume);
  if (gravada) gravada('hum', volume, reserva);
  else reserva();
}

export function coretoSintetizado(motor: MotorAudio, volume = 1): boolean {
  const frase = [784, 659, 784, 880, 784, 659, 587, 659, 523];
  return tocar(
    motor,
    frase.map((f, i) => ({ t: i * 0.22, f: f * 1.5, pico: 0.35, queda: 0.35 })),
    0.12 * volume,
  );
}

/** A musiquinha do coreto (caixinha de música, nossa): toca quando alguém entra nele. */
export function musiquinhaDoCoreto(motor: MotorAudio, volume = 1, gravada?: TocadorObra): void {
  const reserva = () => coretoSintetizado(motor, volume);
  if (gravada) gravada('coreto', volume, reserva);
  else reserva();
}

export function colherSintetizada(motor: MotorAudio): boolean {
  return tocar(
    motor,
    [
      { t: 0, f: 1319, pico: 0.4, queda: 0.4 },
      { t: 0.08, f: 1760, pico: 0.3, queda: 0.5 },
    ],
    0.18,
  );
}

/** O brilho da colher que chega na mão. */
export function plimDaColher(motor: MotorAudio, gravada?: TocadorObra): void {
  const reserva = () => colherSintetizada(motor);
  if (gravada) gravada('colher', 1, reserva);
  else reserva();
}

/** A reserva sintetizada de cada som gravado da obra (para a régua e para o tocador). */
export const SINTETIZADOS_OBRA: Readonly<
  Record<string, (motor: MotorAudio, indice: number) => boolean>
> = {
  plim: (m, i) => plimSintetizado(m, ESCALA_OBRA[i] ?? ESCALA_OBRA[0]),
  acorde: (m) => acordeSintetizado(m),
  tada: (m) => taDaSintetizado(m, false),
  tadaGrande: (m) => taDaSintetizado(m, true),
  hum: (m) => humSintetizado(m),
  coreto: (m) => coretoSintetizado(m),
  colher: (m) => colherSintetizada(m),
};
