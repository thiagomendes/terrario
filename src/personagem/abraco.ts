/**
 * Spec 027 (T11): o abraço do Bento, a animação de dois corpos. Só dados e contas (como os
 * gestos): o desenho põe a camada do abraço no animador do Bento e no da criança, e o Bento
 * chega até a frente dela.
 * - **O Bento** se abaixa um pouco (o tronco para a frente, o corpo desce), os braços vêm para a
 *   frente e se fecham em volta das costas da criança, a cabeça olha para ela.
 * - **A criança** levanta os braços para a frente e envolve a barriga peluda dele, a cabeça
 *   deita de ladinho.
 * - Os dois balançam juntos de um lado para o outro (1,2 s) e soltam.
 * - Nada prende: a criança que anda, pula ou trabalha solta na hora (a camada sai em 0,15 s).
 */
import { ABRACO, DURACAO_ABRACO } from '../jogo/baile';
import { aplicarJuntas, estadoDaCamada, interrompeGesto, type Juntas } from './gestos';
import type { CamadaPose } from './poses';
import type { Aparencia } from './aparencia';
import { fantasiaPorId } from './fantasias';

export type PapelAbraco = 'bento' | 'crianca';

/**
 * Entre o meio da criança e o meio do Bento no abraço (blocos): ele do lado dela, as cabeças
 * encostadas (medido com os bonecos de verdade, `abracoEncaixe.test.ts`: nada entra no outro).
 */
export const DISTANCIA_ABRACO = 1.12;
/**
 * Com chapéu de aba (a bruxinha, o de palha, o de vaqueiro...) a aba chega no rosto dele: ele
 * para um tico mais longe.
 */
export const DISTANCIA_ABRACO_CHAPEU = 1.28;

/** O lençol de capuz cobre a cabeça inteira: ele para mais um tico longe. */
export const DISTANCIA_ABRACO_CAPUZ = 1.25;
/** A gola alta e o capuz de monstro sobem em volta da cabeça dela: o mais longe. */
export const DISTANCIA_ABRACO_GOLA = 1.64;

/** Os acessórios de aba larga ou altos na cabeça. */
const NA_CABECA = new Set(['chapeu', 'chapeu-explorador', 'chapeu-palha', 'coroa-flores', 'touca-chef', 'capacete']);
/** As peças de fantasia que crescem em volta da cabeça. */
const EM_VOLTA = new Set(['gola-alta', 'capuz-monstro', 'capuz-dragao']);

/** A distância do abraço para quem a criança é (o que ela tem na cabeça afasta um pouco). */
export function distanciaDoAbraco(a?: Pick<Aparencia, 'fantasia' | 'acessorio' | 'corpo' | 'premium'> | null): number {
  if (!a) return DISTANCIA_ABRACO;
  if (a.premium?.fantasia) return DISTANCIA_ABRACO_GOLA;
  if (a.fantasia) {
    const def = fantasiaPorId(a.fantasia.id);
    const v = def?.visual[a.corpo ?? 'feminino'];
    if (v?.pecas.some((p) => EM_VOLTA.has(p.tipo))) return DISTANCIA_ABRACO_GOLA;
    if (v?.cabeca === 'capuz') return DISTANCIA_ABRACO_CAPUZ;
    return v?.cabeca === 'chapeu' || v?.cabeca === 'capacete' ? DISTANCIA_ABRACO_CHAPEU : DISTANCIA_ABRACO;
  }
  return a.acessorio && NA_CABECA.has(a.acessorio) ? DISTANCIA_ABRACO_CHAPEU : DISTANCIA_ABRACO;
}
/** Quanto a camada leva para sair quando a criança solta (s). */
export const SAIDA_ABRACO = 0.15;

const suave = (t: number) => {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
};

/** O peso do abraço (0..1): entra, fica e sai. */
export function pesoDoAbraco(f: number): number {
  if (!(f >= 0) || f > DURACAO_ABRACO) return 0;
  return suave(f / ABRACO.entra) * suave((DURACAO_ABRACO - f) / ABRACO.sai);
}

/** O balanço junto (rad no tronco), nos 1,2 s do meio: de um lado ao outro, duas vezes. */
export function balancoDoAbraco(f: number): number {
  const t = (f - ABRACO.entra) / ABRACO.balanca;
  if (t <= 0 || t >= 1) return 0;
  return Math.sin(t * Math.PI * 2) * 0.11 * Math.sin(t * Math.PI);
}

/** As juntas de cada um no abraço (no referencial dos gestos). */
export function juntasDoAbraco(papel: PapelAbraco, f: number): Juntas {
  const b = balancoDoAbraco(f);
  if (papel === 'bento')
    // ele fica do lado dela, meio virado para ela, curvado por cima; o braço de trás passa
    // pelas costas dela até o outro ombro e o da frente fecha na frente; a cabeça deita na
    // cabeça dela
    return { ...POSE_BENTO, troncoZ: POSE_BENTO.troncoZ + b, cabZ: POSE_BENTO.cabZ - b * 0.4 };
  // a criança: um braço em volta da cintura dele, o outro na barriga peluda; a cabeça deita na
  // bochecha dele
  return { ...POSE_CRIANCA, troncoZ: POSE_CRIANCA.troncoZ + b * 0.6 };
}

const POSE_BENTO = {
  troncoX: 0.156,
  troncoZ: -0.2,
  troncoY: -0.071,
  cabZ: -0.256,
  cabX: -0.076,
  bdX: -1.981,
  beX: -1.756,
  bdZ: 1.1,
  beZ: 0.988,
} as const;
const POSE_CRIANCA = {
  troncoZ: -0.208,
  cabZ: -0.241,
  cabX: -0.203,
  // o braço de perto dele vai para o lado dele; o de longe cruza a frente dela até ele
  bdX: -1.4,
  beX: -1.5,
  bdZ: -0.75,
  beZ: -0.45,
} as const;

/**
 * Onde o Bento fica no abraço, no corpo dela (x: para a direita dela, z: para a frente; em
 * blocos, na distância de sempre), e os giros: o dele a partir de "de frente para ela", o dela
 * a partir de "de frente para o posto dele".
 */
const LUGAR_ABRACO = { x: -1.072, z: -0.187, giroBento: -2.124, giroCrianca: -0.3 } as const;

/** A camada do abraço no animador (o Bento e a criança), com o jeito de soltar. */
export interface CamadaAbraco extends CamadaPose {
  readonly papel: PapelAbraco;
  /** Solta agora (o núcleo disse que a criança mexeu, ou ela andou): sai em 0,15 s. */
  soltar(): void;
  /** Segundos desde o começo. */
  readonly tempo: number;
  /** Ainda abraçando (antes de soltar e de acabar). */
  readonly ativa: boolean;
}

/**
 * O abraço como camada do animador (`Animador.definirCamada`), igual para quem abraça, para quem
 * vê e para o morador. `desde`: segundos já passados (quem vê o abraço chegar atrasado pela rede
 * entra no mesmo ponto).
 */
export function camadaDeAbraco(papel: PapelAbraco, desde = 0): CamadaAbraco {
  let f = Math.max(0, desde);
  let saindo = -1;
  let pesoAoSoltar = 0;
  let fAoSoltar = 0;
  const camada = ((base, info) => {
    const dt = info.dt > 0 && Number.isFinite(info.dt) ? info.dt : 0;
    // a criança que anda, pula ou trabalha solta na hora
    if (saindo < 0 && papel === 'crianca' && interrompeGesto(estadoDaCamada(info))) soltar();
    if (saindo >= 0) {
      saindo += dt;
      const k = 1 - saindo / SAIDA_ABRACO;
      if (k <= 0) return null;
      return aplicarJuntas(base, juntasDoAbraco(papel, fAoSoltar), pesoAoSoltar * k);
    }
    f += dt;
    if (f > DURACAO_ABRACO) return null;
    return aplicarJuntas(base, juntasDoAbraco(papel, f), pesoDoAbraco(f));
  }) as CamadaPose;
  function soltar(): void {
    if (saindo >= 0) return;
    saindo = 0;
    pesoAoSoltar = pesoDoAbraco(f);
    fAoSoltar = f;
  }
  // (os getters de verdade: o Object.assign copiaria só o valor de agora)
  return Object.defineProperties(camada, {
    papel: { value: papel },
    soltar: { value: soltar },
    tempo: { get: () => f },
    ativa: { get: () => saindo < 0 && f <= DURACAO_ABRACO },
  }) as CamadaAbraco;
}

/**
 * Onde o Bento fica no abraço: na frente da criança, a `distancia` dela, na linha entre os dois
 * (ele vem de onde está), olhando para ela; `peso` 0 é onde ele estava, 1 é colado.
 */
export function lugarDoBentoNoAbraco(
  crianca: { x: number; z: number },
  bento: { x: number; z: number },
  peso: number,
  distancia = DISTANCIA_ABRACO,
): { x: number; z: number; yaw: number } {
  let dx = bento.x - crianca.x;
  let dz = bento.z - crianca.z;
  const d = Math.hypot(dx, dz);
  if (d < 1e-3) {
    dx = 0;
    dz = 1;
  } else {
    dx /= d;
    dz /= d;
  }
  // o lugar dele no corpo dela (ela de frente para o posto dele): a direita dela é (dz, −dx)
  const k = distancia / Math.hypot(LUGAR_ABRACO.x, LUGAR_ABRACO.z);
  const colado = {
    x: crianca.x + (dz * LUGAR_ABRACO.x + dx * LUGAR_ABRACO.z) * k,
    z: crianca.z + (-dx * LUGAR_ABRACO.x + dz * LUGAR_ABRACO.z) * k,
  };
  const p = Math.max(0, Math.min(1, peso));
  const deFrente = Math.atan2(-dx, -dz);
  return {
    x: bento.x + (colado.x - bento.x) * p,
    z: bento.z + (colado.z - bento.z) * p,
    // de longe ele vem de frente para ela; colado, meio de lado
    yaw: deFrente + LUGAR_ABRACO.giroBento * p,
  };
}

/** Para onde a criança olha no abraço (de frente para o posto do Bento, um tico virada). */
export function yawDaCriancaNoAbraco(crianca: { x: number; z: number }, bento: { x: number; z: number }): number {
  return Math.atan2(bento.x - crianca.x, bento.z - crianca.z) + LUGAR_ABRACO.giroCrianca;
}
