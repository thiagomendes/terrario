/**
 * Movimento com vida (spec 015, como no esboço aprovado): o corpo vira para onde anda em vez
 * de virar de uma vez, inclina ao correr e para dentro nas curvas, a passada acompanha a
 * velocidade (correr tem passada própria), o pulo tem agachadinha e a aterrissagem
 * amortece; parada, a cabeça acompanha um pouco a câmera (ou o olhar do amigo).
 *
 * É só desenho: a física do jogador não muda (a velocidade máxima que o servidor confere
 * continua a mesma). Puro e determinístico; vale para o boneco do jogador e dos amigos.
 */
import { angAlvo, difAngulo, fracao } from '../player/camera';

/** Velocidades da física (blocos/s) usadas como referência da passada. */
const VEL_ANDAR = 4.3;
const VEL_CORRER = 7;

/** Abaixo disto o corpo não gira para a direção do movimento (parado mantém a frente). */
export const VEL_GIRAR = 0.3;
/** Rapidez do giro do corpo (por segundo): andando e virando para o bloco. */
export const TAXA_GIRO = 10;
export const TAXA_GIRO_ALVO = 12;
/** Arranque e freada da passada (o boneco não sai nem para de uma vez). */
export const TAXA_ARRANQUE = 10;
export const TAXA_FREADA = 12;
/** Inclinação para a frente na velocidade de correr (rad). */
export const INCLINA_ANDAR = 0.1;
export const INCLINA_CORRER = 0.22;
/** Inclinação de lado nas curvas: ganho e teto (rad). */
export const GANHO_CURVA = 0.02;
export const CURVA_MAXIMA = 0.2;
/** Ritmo da passada (rad/s de fase) e amplitude das pernas. */
export const RITMO_ANDAR = 9.5;
export const RITMO_CORRER = 13;
export const AMPLITUDE_ANDAR = 0.7;
export const AMPLITUDE_CORRER = 0.95;
/** A cabeça acompanha a câmera até este ângulo, e só uma parte dele. */
export const LIMITE_CABECA = 0.5;
export const FRACAO_CABECA = 0.6;
/** Agachadinha do pulo e amortecida da aterrissagem (0..1), e quão rápido some. */
export const AGACHA_PULO = 1;
export const AGACHA_ATERRISSAGEM = 0.8;
export const TAXA_AGACHA = 6;

export interface EstadoCorpo {
  /** Para onde o corpo está virado (rad, mesma convenção do yaw da câmera). */
  yaw: number;
  /** Velocidade horizontal suavizada (arranque e freada). */
  vel: number;
  inclina: number;
  roll: number;
  /** Fase da passada (rad). */
  fase: number;
  agacha: number;
  cabeca: number;
}

export function criarCorpo(yaw = 0): EstadoCorpo {
  return { yaw, vel: 0, inclina: 0, roll: 0, fase: 0, agacha: 0, cabeca: 0 };
}

export interface EntradaCorpo {
  dt: number;
  /** Velocidade horizontal (blocos/s) em x e z. */
  vx: number;
  vz: number;
  correndo: boolean;
  noChao: boolean;
  /** Minerando ou colocando: o corpo vira para o bloco (yaw até ele), senão null. */
  alvoYaw: number | null;
  /** Para onde a câmera (ou o amigo) olha: a cabeça acompanha um pouco. */
  olharYaw: number;
}

export interface SaidaCorpo {
  yaw: number;
  /** Inclinação para a frente do corpo inteiro e de lado na curva (rad). */
  inclina: number;
  roll: number;
  fase: number;
  /** Amplitude da passada (0 parado). */
  amplitude: number;
  agacha: number;
  /** Giro da cabeça relativo ao corpo (rad). */
  cabeca: number;
}

/** Yaw de quem anda com velocidade (vx, vz): frente = (sen yaw, cos yaw). */
export const yawDoMovimento = (vx: number, vz: number): number => Math.atan2(vx, vz);

/** Um quadro do corpo vivo: atualiza o estado e devolve o que a pose usa. */
export function atualizarCorpo(c: EstadoCorpo, e: EntradaCorpo): SaidaCorpo {
  const dt = Number.isFinite(e.dt) && e.dt > 0 ? Math.min(e.dt, 0.1) : 0;
  const vel = Math.hypot(e.vx, e.vz);
  // arranque e freada suaves (só no desenho)
  c.vel += (vel - c.vel) * fracao(vel > c.vel ? TAXA_ARRANQUE : TAXA_FREADA, dt);
  const antes = c.yaw;
  if (e.alvoYaw !== null && Number.isFinite(e.alvoYaw))
    c.yaw = angAlvo(c.yaw, e.alvoYaw, dt * TAXA_GIRO_ALVO);
  else if (vel > VEL_GIRAR) c.yaw = angAlvo(c.yaw, yawDoMovimento(e.vx, e.vz), dt * TAXA_GIRO);
  // mantém o ângulo pequeno (sem acumular voltas)
  c.yaw = Math.atan2(Math.sin(c.yaw), Math.cos(c.yaw));
  const giro = difAngulo(antes, c.yaw);
  const vmax = e.correndo ? VEL_CORRER : VEL_ANDAR;
  const noChao = e.noChao;
  const alvoInclina = noChao
    ? (c.vel / VEL_CORRER) * (e.correndo ? INCLINA_CORRER : INCLINA_ANDAR)
    : 0;
  c.inclina += (alvoInclina - c.inclina) * fracao(6, dt);
  const alvoRoll =
    dt > 0 ? Math.max(-CURVA_MAXIMA, Math.min(CURVA_MAXIMA, (-giro / dt) * GANHO_CURVA)) : 0;
  c.roll += (alvoRoll * Math.min(1, c.vel / 2) - c.roll) * fracao(5, dt);
  const ritmo = e.correndo ? RITMO_CORRER : RITMO_ANDAR;
  if (noChao) c.fase = (c.fase + dt * ritmo * Math.min(1, c.vel / 3)) % (Math.PI * 200);
  const amplitude = noChao
    ? Math.min(1, c.vel / vmax) * (e.correndo ? AMPLITUDE_CORRER : AMPLITUDE_ANDAR)
    : 0;
  c.agacha = Math.max(0, c.agacha - dt * TAXA_AGACHA);
  const rel = difAngulo(c.yaw, e.olharYaw);
  const alvoCabeca = Math.max(-LIMITE_CABECA, Math.min(LIMITE_CABECA, rel)) * FRACAO_CABECA;
  c.cabeca += (alvoCabeca - c.cabeca) * fracao(4, dt);
  return {
    yaw: c.yaw,
    inclina: c.inclina,
    roll: c.roll,
    fase: c.fase,
    amplitude,
    agacha: c.agacha,
    cabeca: c.cabeca,
  };
}

/** Pulo e aterrissagem: a agachadinha. */
export function agachar(c: EstadoCorpo, quanto: number): void {
  c.agacha = Math.max(c.agacha, Math.min(1, quanto));
}
