/**
 * Spec 036 (T02): o Unicórnio-pônei voa junto com a criança, liso.
 *
 * O defeito de antes: com a criança voando mais de uns 7 blocos acima do chão, a procura do chão
 * debaixo do bicho não achava nada e devolvia a própria altura de quem procurava; o bicho via um
 * "degrau" meio bloco acima a cada quadro, pulava e pousava nele, subindo aos trancos até passar
 * 8 blocos de diferença, quando era jogado de volta para perto num puf de brilho (e recomeçava).
 * Voando mais depressa do que ele trota (11 e 20 blocos por segundo contra 6,5), ficava para trás
 * e reaparecia num puf a cada um ou dois segundos.
 *
 * Agora, quando a criança está no alto, ele passa a voar: segue o lugar dele (atrás e do lado)
 * numa mola crítica (a conta exata, sem passar do ponto e sem depender do passo de tempo), com o
 * lugar adiantado pela velocidade da criança (em velocidade constante ele não fica para trás).
 * Ao descer, plana até o chão pela mesma mola.
 */

export interface Mola {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

/** A rigidez da mola do voo (rad/s): o bicho chega ao lugar em uns 0,4 s, sem balançar. */
export const RIGIDEZ_VOO = 6.5;
/** Acima disto (blocos entre os pés da criança e o chão debaixo dela), o bicho voa junto. */
export const ALTURA_VOAR = 2.2;
/** Abaixo disto, ele desce planando até o chão (a diferença evita o liga e desliga). */
export const ALTURA_POUSAR = 1.0;

/**
 * Um eixo da mola crítica, a conta exata para o passo `dt` (o alvo parado durante o passo):
 * devolve a posição e a velocidade novas. Estável com qualquer `dt`.
 */
function eixo(x: number, v: number, alvo: number, w: number, dt: number): [number, number] {
  const d = x - alvo;
  const e = Math.exp(-w * dt);
  const t = (v + w * d) * dt;
  return [alvo + (d + t) * e, (v - w * t) * e];
}

/** Anda a mola um passo até o alvo. */
export function passoMola(m: Mola, alvo: readonly [number, number, number], w: number, dt: number): void {
  if (dt <= 0) return;
  [m.x, m.vx] = eixo(m.x, m.vx, alvo[0], w, dt);
  [m.y, m.vy] = eixo(m.y, m.vy, alvo[1], w, dt);
  [m.z, m.vz] = eixo(m.z, m.vz, alvo[2], w, dt);
}

/**
 * Voar ou não: liga com a criança bem acima do chão (ou sem chão achado debaixo dela, `null`) e
 * desliga só quando ela chega perto dele. Um pulo comum (1,45 bloco) nunca liga o voo.
 */
export function querVoar(voando: boolean, alturaCrianca: number | null): boolean {
  if (alturaCrianca === null) return true;
  return voando ? alturaCrianca > ALTURA_POUSAR : alturaCrianca > ALTURA_VOAR;
}

/**
 * O adiantamento do lugar pela velocidade da criança: com a mola crítica de rigidez `w`, o bicho
 * fica 2v/w atrás de um alvo que anda a v; somar isso ao alvo o deixa no lugar dele.
 */
export const adiantar = (w: number): number => 2 / w;
