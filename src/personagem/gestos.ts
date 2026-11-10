/**
 * Gestos do boneco (spec 015, T04): os 8 do esboço aprovado
 * (`.sdd/specs/015-terceira-pessoa/referencia/camera-e-gestos.html`), quanto dura cada um,
 * a pose de cada instante e o que interrompe. Só dados e contas: o núcleo usa a lista e os
 * raios (comando `gesto`), o desenho usa as poses (jogador, amigos e moradores), tudo com as
 * mesmas regras.
 */
import type { CamadaPose, InfoCamada, Pose } from './poses';
import type { Animador } from '../player/animacao';

export const IDS_GESTOS = [
  'acenar',
  'cumprimentar',
  'chamar',
  'comemorar',
  'aplaudir',
  'dancar',
  'apontar',
  'sentar',
] as const;

export type IdGesto = (typeof IDS_GESTOS)[number];

export interface DefGesto {
  id: IdGesto;
  /** Nome curto embaixo do botão da roda. */
  nome: string;
  /** Segundos (sentar: até andar). */
  duracao: number;
}

/** Na ordem da roda (o primeiro fica no alto; teclas 1 a 8 com a roda aberta). */
export const GESTOS: readonly DefGesto[] = [
  { id: 'acenar', nome: 'Acenar', duracao: 1.8 },
  { id: 'cumprimentar', nome: 'Cumprimentar', duracao: 1.4 },
  { id: 'chamar', nome: 'Chamar', duracao: 1.8 },
  { id: 'comemorar', nome: 'Comemorar', duracao: 1.6 },
  { id: 'aplaudir', nome: 'Aplaudir', duracao: 1.8 },
  { id: 'dancar', nome: 'Dançar', duracao: 3.2 },
  { id: 'apontar', nome: 'Apontar', duracao: 1.8 },
  { id: 'sentar', nome: 'Sentar', duracao: Infinity },
];

const DURACAO: Record<IdGesto, number> = Object.fromEntries(
  GESTOS.map((g) => [g.id, g.duracao]),
) as Record<IdGesto, number>;

export function ehGesto(v: unknown): v is IdGesto {
  return typeof v === 'string' && (IDS_GESTOS as readonly string[]).includes(v);
}

export function duracaoDoGesto(id: IdGesto): number {
  return DURACAO[id];
}

/** O cliente espera isto entre um gesto e outro (o botão não vira metralhadora). */
export const INTERVALO_GESTO = 1.2;
/**
 * O núcleo aceita um gesto por jogador a cada tanto: bem menos que o cliente, porque a rede
 * pode juntar dois envios (um atrasa, o outro chega na hora) e o cliente bem-comportado nunca
 * pode perder um gesto; o que passar disso (cliente que manda em rajada) é descartado.
 */
export const INTERVALO_GESTO_NUCLEO = 0.8;
/** Quem está até tantos blocos vê o gesto (o mesmo raio dos itens no chão). */
export const RAIO_VER_GESTO = 48;
/** O morador até tantos blocos acena de volta. */
export const RAIO_RESPOSTA_MORADOR = 7;
/** No máximo tantos moradores respondem ao mesmo aceno (sem coral de "oi"). */
export const MORADORES_QUE_RESPONDEM = 3;
/** O morador responde depois de um instante (segundos), como no esboço. */
export const ATRASO_RESPOSTA = 0.5;
/** "Chamar" traz a raposa domada e os bichos criados até tantos blocos. */
export const RAIO_CHAMAR = 16;
/** Quem foi chamado para a uns tantos blocos de onde a criança chamou. */
export const PARA_CHAMADO = 2;
/** Desiste de chegar depois de tantos segundos (preso atrás de uma cerca). */
export const TEMPO_CHAMADO = 10;
/** O balão com o ícone fica em cima da cabeça por tantos segundos. */
export const DURACAO_BALAO = 2;

/** Gestos que o morador perto responde acenando. */
export function moradorResponde(id: IdGesto): boolean {
  return id === 'acenar' || id === 'cumprimentar';
}

/** O que acontece com o boneco agora (o que interrompe o gesto). */
export interface EstadoGesto {
  /** Andando (ou voando para algum lado). */
  andando: boolean;
  /** Pulou ou caiu (no ar sem estar voando). */
  noAr: boolean;
  /** Minerando, colocando um bloco ou comendo. */
  ocupado: boolean;
}

/** Andar, pular, minerar, colocar e comer interrompem qualquer gesto (sentar também). */
export function interrompeGesto(e: EstadoGesto): boolean {
  return e.andando || e.noAr || e.ocupado;
}

/**
 * Juntas como no esboço: rotação de cada junta em radianos (braço direito = bracoD, do lado
 * +x; z positivo levanta o braço direito para o lado, negativo levanta o esquerdo; x negativo
 * leva o braço ou a perna para a frente).
 */
interface Juntas {
  bdX?: number;
  bdZ?: number;
  beX?: number;
  beZ?: number;
  troncoX?: number;
  troncoY?: number;
  troncoZ?: number;
  /** Soma na altura do corpo. */
  corpoY?: number;
  pernaD?: number;
  pernaE?: number;
  cabX?: number;
  cabY?: number;
  cabZ?: number;
}

/** Peso de entrada e saída do gesto (0..1): entra em 0,18 s e sai em 0,22 s. */
export function pesoDoGesto(id: IdGesto, f: number): number {
  const dur = DURACAO[id];
  if (!(f >= 0) || f > dur) return 0;
  return Math.min(1, f / 0.18) * Math.min(1, (dur - f) / 0.22);
}

function juntasDoGesto(id: IdGesto, f: number): Juntas {
  switch (id) {
    case 'acenar':
      // braço direito no alto, a mão balança; a cabeça acompanha de leve
      return { bdZ: 2.6 + Math.sin(f * 14) * 0.35, bdX: 0, cabZ: Math.sin(f * 7) * 0.06 };
    case 'cumprimentar': {
      // uma reverência: desce e volta em 0,7 s, braços um pouco à frente
      const r = 0.5 * Math.sin(Math.min(1, f / 0.7) * Math.PI);
      return { troncoX: r, cabX: 0, bdX: -0.3, beX: -0.3 };
    }
    case 'chamar':
      // braço à frente, a mão puxa ("vem cá"), a cabeça levanta um pouco
      return { bdX: -1.5 + Math.sin(f * 10) * 0.35, bdZ: 0, cabX: -0.1 };
    case 'comemorar':
      // os dois braços para o alto e pulinhos
      return { beZ: -2.85, bdZ: 2.85, beX: 0, bdX: 0, corpoY: Math.abs(Math.sin(f * 7.5)) * 0.35 };
    case 'aplaudir': {
      const c = Math.sin(f * 16) * 0.25;
      return { beX: -1.2, bdX: -1.2, beZ: 0.5 + c, bdZ: -0.5 - c };
    }
    case 'dancar': {
      const s = Math.sin(f * 6);
      return {
        troncoZ: s * 0.15,
        troncoY: Math.sin(f * 3) * 0.4,
        beZ: -1.2 - s * 0.9,
        bdZ: 1.2 - s * 0.9,
        beX: 0,
        bdX: 0,
        corpoY: Math.abs(s) * 0.08,
      };
    }
    case 'apontar':
      return { bdX: -1.55, bdZ: 0, cabY: 0.2 };
    case 'sentar': {
      // senta no chão: pernas para a frente, o corpo desce, mãos no colo
      const s = Math.min(1, f / 0.4);
      return {
        pernaD: -1.45 * s,
        pernaE: -1.45 * s,
        corpoY: -0.24 * s,
        beX: -0.3 * s,
        bdX: -0.3 * s,
      };
    }
  }
}

const mistura = (base: number, alvo: number, p: number) => base + (alvo - base) * p;

/**
 * Põe o gesto em cima da pose do animador (muda a pose e devolve ela). `f`: segundos desde o
 * começo do gesto. Devolve a pose sem mudar quando o gesto já acabou.
 */
export function aplicarGesto(pose: Pose, id: IdGesto, f: number): Pose {
  const p = pesoDoGesto(id, f);
  if (p <= 0) return pose;
  const j = juntasDoGesto(id, f);
  pose.pesoGesto = Math.max(pose.pesoGesto ?? 0, p);
  // braços: o boneco usa "abre" (z = 0,06 + abre no direito, −0,06 − abre no esquerdo)
  if (j.bdX !== undefined) pose.bracoDireito = mistura(pose.bracoDireito, j.bdX, p);
  if (j.beX !== undefined) pose.bracoEsquerdo = mistura(pose.bracoEsquerdo, j.beX, p);
  if (j.bdZ !== undefined)
    pose.bracoDireitoAbre = mistura(pose.bracoDireitoAbre ?? 0, j.bdZ - 0.06, p);
  if (j.beZ !== undefined)
    pose.bracoEsquerdoAbre = mistura(pose.bracoEsquerdoAbre ?? 0, -j.beZ - 0.06, p);
  if (j.troncoX !== undefined) pose.troncoX = mistura(pose.troncoX ?? 0, j.troncoX, p);
  if (j.troncoY !== undefined) pose.troncoY = mistura(pose.troncoY ?? 0, j.troncoY, p);
  if (j.troncoZ !== undefined) pose.troncoZ = mistura(pose.troncoZ ?? 0, j.troncoZ, p);
  if (j.pernaD !== undefined) pose.pernaDireita = mistura(pose.pernaDireita, j.pernaD, p);
  if (j.pernaE !== undefined) pose.pernaEsquerda = mistura(pose.pernaEsquerda, j.pernaE, p);
  if (j.corpoY !== undefined) pose.corpoY = (pose.corpoY ?? pose.tronco) + j.corpoY * p;
  // a cabeça vai junto com o tronco (o boneco compensa a inclinação do tronco na cabeça)
  if (j.cabX !== undefined || j.troncoX !== undefined)
    pose.cabeca = mistura(pose.cabeca, (j.cabX ?? 0) + (j.troncoX ?? 0), p);
  if (j.cabY !== undefined) pose.cabecaGiro = mistura(pose.cabecaGiro ?? 0, j.cabY, p);
  if (j.cabZ !== undefined) pose.cabecaLado = mistura(pose.cabecaLado ?? 0, j.cabZ, p);
  // durante o gesto o topete não balança como se andasse
  return pose;
}

/** Toca um gesto num boneco: guarda qual e há quanto tempo, e interrompe quando deve. */
export interface TocadorGesto {
  /** Gesto em curso (null: nenhum). */
  readonly atual: IdGesto | null;
  /** Segundos desde o começo do gesto em curso. */
  readonly tempo: number;
  iniciar(id: IdGesto): void;
  parar(): void;
  /**
   * Avança `dt`, interrompe se o boneco anda, pula ou trabalha, e põe o gesto na pose.
   * Sem gesto, devolve a pose como veio.
   */
  aplicar(pose: Pose, dt: number, estado: EstadoGesto): Pose;
}

export function criarTocadorGesto(): TocadorGesto {
  let atual: IdGesto | null = null;
  let tempo = 0;
  return {
    get atual() {
      return atual;
    },
    get tempo() {
      return tempo;
    },
    iniciar(id) {
      atual = id;
      tempo = 0;
    },
    parar() {
      atual = null;
      tempo = 0;
    },
    aplicar(pose, dt, estado) {
      if (!atual) return pose;
      if (interrompeGesto(estado)) {
        atual = null;
        return pose;
      }
      tempo += dt > 0 && Number.isFinite(dt) ? dt : 0;
      if (tempo > DURACAO[atual]) {
        atual = null;
        return pose;
      }
      return aplicarGesto(pose, atual, tempo);
    },
  };
}

/** O estado do boneco a partir do que o animador passa para a camada (o mesmo em todos). */
export function estadoDaCamada(info: InfoCamada): EstadoGesto {
  return {
    andando: info.andando,
    // voando parado no criativo pode gesticular; pular ou cair interrompe
    noAr: !info.noChao && !info.voando,
    ocupado: info.ocupado,
  };
}

/** A camada de um gesto no animador: a função de pose e qual gesto ela toca. */
export interface CamadaGesto extends CamadaPose {
  readonly gesto: IdGesto;
}

/**
 * O gesto como camada do animador (`Animador.definirCamada`): o mesmo caminho para o jogador,
 * os amigos e os moradores. A camada conta o próprio tempo e devolve null quando o gesto
 * acaba ou é interrompido (andar, pular, minerar, colocar, comer); aí o animador tira ela.
 */
export function camadaDeGesto(id: IdGesto): CamadaGesto {
  const tocador = criarTocadorGesto();
  tocador.iniciar(id);
  /** Interrompido: o gesto sai em SAIDA_GESTO s a partir do instante em que parou (sem tranco). */
  let saindo = -1;
  let parouEm = 0;
  const camada: CamadaPose = (base, info) => {
    if (saindo < 0) {
      const antes = tocador.tempo;
      const pose = tocador.aplicar(base, info.dt, estadoDaCamada(info));
      if (tocador.atual) return pose;
      // acabou sozinho: o peso já tinha chegado a zero
      if (!interrompeGesto(estadoDaCamada(info)) || pesoDoGesto(id, antes) <= 0) return null;
      saindo = 0;
      parouEm = antes;
    }
    saindo += info.dt > 0 && Number.isFinite(info.dt) ? info.dt : 0;
    const k = 1 - saindo / SAIDA_GESTO;
    if (k <= 0) return null;
    return misturarPoses(base, aplicarGesto({ ...base }, id, parouEm), k);
  };
  return Object.assign(camada, { gesto: id });
}

/** Quanto o gesto interrompido leva para sair (s). */
export const SAIDA_GESTO = 0.15;

/** Mistura duas poses (k = 0: a primeira, 1: a segunda) nos campos numéricos. */
function misturarPoses(a: Pose, b: Pose, k: number): Pose {
  const r: Pose = { ...a };
  const dst = r as unknown as Record<string, unknown>;
  const pb = b as unknown as Record<string, unknown>;
  for (const chave of Object.keys(pb)) {
    const vb = pb[chave];
    const va = dst[chave];
    if (typeof vb !== 'number') continue;
    dst[chave] = typeof va === 'number' ? va + (vb - va) * k : vb * k;
  }
  return r;
}

/** Põe o gesto no boneco (null tira o que estiver tocando). */
export function fazerGesto(a: Pick<Animador, 'definirCamada'>, id: IdGesto | null): void {
  a.definirCamada(id ? camadaDeGesto(id) : null);
}

/** O gesto que o boneco está fazendo agora (null: nenhum). */
export function gestoDoAnimador(a: Pick<Animador, 'camada'>): IdGesto | null {
  const c = a.camada() as Partial<CamadaGesto> | null;
  return c && ehGesto(c.gesto) ? c.gesto : null;
}
