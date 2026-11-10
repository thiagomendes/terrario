/**
 * Gestos do boneco (spec 015, T04): os 8 do esboço aprovado
 * (`.sdd/specs/015-terceira-pessoa/referencia/camera-e-gestos.html`), quanto dura cada um,
 * a pose de cada instante e o que interrompe. Só dados e contas: o núcleo usa a lista e os
 * raios (comando `gesto`), o desenho usa as poses (jogador, amigos e moradores), tudo com as
 * mesmas regras.
 */
import type { Pose } from './poses';
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
 * O núcleo aceita um gesto por jogador a cada tanto (um pouco menos que o cliente: a rede
 * pode juntar dois envios; o que passar disso é descartado sem aviso).
 */
export const INTERVALO_GESTO_NUCLEO = 1.0;
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
      return { beZ: -2.7, bdZ: 2.7, beX: 0, bdX: 0, corpoY: Math.abs(Math.sin(f * 7.5)) * 0.35 };
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
  // braços: o boneco usa "abre" (z = -0,06 - abre no direito, 0,06 + abre no esquerdo)
  if (j.bdX !== undefined) pose.bracoDireito = mistura(pose.bracoDireito, j.bdX, p);
  if (j.beX !== undefined) pose.bracoEsquerdo = mistura(pose.bracoEsquerdo, j.beX, p);
  if (j.bdZ !== undefined)
    pose.bracoDireitoAbre = mistura(pose.bracoDireitoAbre ?? 0, -j.bdZ - 0.06, p);
  if (j.beZ !== undefined)
    pose.bracoEsquerdoAbre = mistura(pose.bracoEsquerdoAbre ?? 0, j.beZ - 0.06, p);
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

/** O estado do boneco a partir do que o animador recebe (o mesmo para todos os bonecos). */
export function estadoParaGesto(
  mov: { velocidadeHoriz: number; noChao: boolean; voando?: boolean },
  vista: { golpe: number | null; colocar: number | null; comer: number | null },
): EstadoGesto {
  return {
    // o mesmo limite do passo do animador (VELOCIDADE_MINIMA_PASSO)
    andando: mov.velocidadeHoriz > 0.1,
    noAr: !mov.noChao && !mov.voando,
    ocupado: vista.golpe !== null || vista.colocar !== null || vista.comer !== null,
  };
}

/** Animador que também faz gestos: a mesma pose de sempre, com o gesto por cima. */
export interface AnimadorComGestos extends Animador {
  /** Começa um gesto (null: para o que estiver tocando). */
  gesto(id: IdGesto | null): void;
  readonly gestoAtual: IdGesto | null;
}

/**
 * Embrulha um animador (jogador, amigo ou morador): `atualizar` devolve a pose com o gesto em
 * curso, interrompido pelas mesmas regras em todos os bonecos. Um embrulho só na criação do
 * animador; o resto do código não muda.
 */
export function comGestos(a: Animador): AnimadorComGestos {
  const tocador = criarTocadorGesto();
  let ultima: Pose | null = null;
  return {
    evento: (nome) => a.evento(nome),
    atualizar(dt, movimento) {
      const pose = a.atualizar(dt, movimento);
      ultima = tocador.atual
        ? tocador.aplicar(pose, dt, estadoParaGesto(movimento, a.vista()))
        : pose;
      return ultima;
    },
    pose: () => ultima ?? a.pose(),
    vista: () => a.vista(),
    gesto(id) {
      if (id) tocador.iniciar(id);
      else tocador.parar();
    },
    get gestoAtual() {
      return tocador.atual;
    },
  };
}
