/**
 * Spec 027 (T11): o abraço do Bento na tela, igual para quem abraça e para o amigo que vê.
 * O evento do núcleo (`baileAbraco`: quem, com qual morador, onde) põe a camada do abraço no
 * animador do Bento e no da criança, e o Bento chega até a frente dela (o lugar dele na tela é
 * puxado para perto dela e volta ao posto quando solta). Os coraçõezinhos sobem quando os dois
 * se encontram. `baileSolta` (a criança mexeu no controle) solta na hora.
 */
import type { Animador } from '../../player/animacao';
import { DURACAO_ABRACO } from '../../jogo/baile';
import type { EventoBaile } from '../../nucleo/baile';
import type { Aparencia } from '../../personagem/aparencia';
import {
  camadaDeAbraco,
  distanciaDoAbraco,
  lugarDoBentoNoAbraco,
  pesoDoAbraco,
  yawDaCriancaNoAbraco,
  type CamadaAbraco,
} from '../../personagem/abraco';

export interface OpcoesAbracoNaTela {
  /** O id de quem joga neste aparelho. */
  voce: string;
  /** O animador do boneco de quem joga aqui. */
  animadorLocal: Animador;
  /** Quem joga aqui (o chapéu de aba afasta o Bento um tico). */
  aparenciaLocal(): Aparencia;
  /** O animador e a aparência de um amigo à vista, ou null. */
  amigo(id: string): { animador: Animador; aparencia: Aparencia } | null;
  /** O animador do boneco de um morador à vista (null se ainda não tem boneco). */
  morador(criatura: number): { animador: Animador } | null;
  /** Onde a criatura está agora (o Bento no posto), ou null. */
  criatura(id: number): { x: number; y: number; z: number } | null;
  /** Os coraçõezinhos (x, y, z: de onde sobem). */
  coracoes(x: number, y: number, z: number, n: number): void;
}

/** Os corações saem quando os dois se encontram e de novo no meio do balanço (s). */
const CORACOES: readonly [number, number][] = [
  [0.4, 5],
  [1.05, 3],
];
/** Quando a criança solta, o Bento volta ao posto em tanto (s). */
const VOLTA = 0.35;

interface Abraco {
  quem: string;
  criatura: number;
  x: number;
  y: number;
  z: number;
  /** Do meio dela ao meio do Bento, colados (o chapéu de aba afasta um tico). */
  distancia: number;
  t: number;
  /** Quando soltou (s desde o começo), ou -1. */
  solto: number;
  bento: CamadaAbraco | null;
  crianca: CamadaAbraco | null;
  coracoes: number;
}

export function criarAbracoNaTela(op: OpcoesAbracoNaTela) {
  let atual: Abraco | null = null;

  const animadorDaCrianca = (quem: string): Animador | null =>
    quem === op.voce ? op.animadorLocal : (op.amigo(quem)?.animador ?? null);

  /** Põe as camadas que ainda faltam (o boneco do Bento ou do amigo pode chegar depois). */
  function vestir(a: Abraco): void {
    if (a.solto >= 0) return;
    if (!a.bento) {
      const b = op.morador(a.criatura);
      if (b) {
        a.bento = camadaDeAbraco('bento', a.t);
        b.animador.definirCamada(a.bento);
      }
    }
    if (!a.crianca) {
      const an = animadorDaCrianca(a.quem);
      if (an) {
        a.crianca = camadaDeAbraco('crianca', a.t);
        an.definirCamada(a.crianca);
      }
    }
  }

  function soltar(a: Abraco): void {
    if (a.solto >= 0) return;
    a.solto = a.t;
    a.bento?.soltar();
    a.crianca?.soltar();
  }

  /** O peso de agora (0: o Bento no posto; 1: colado na criança). */
  function peso(a: Abraco): number {
    if (a.solto < 0) return pesoDoAbraco(a.t);
    return pesoDoAbraco(a.solto) * Math.max(0, 1 - (a.t - a.solto) / VOLTA);
  }

  return {
    evento(e: EventoBaile): void {
      if (e.e === 'baileAbraco') {
        if (atual) soltar(atual);
        const ap = e.quem === op.voce ? op.aparenciaLocal() : (op.amigo(e.quem)?.aparencia ?? null);
        atual = {
          quem: e.quem,
          criatura: e.criatura,
          x: e.x,
          y: e.y,
          z: e.z,
          distancia: distanciaDoAbraco(ap),
          t: 0,
          solto: -1,
          bento: null,
          crianca: null,
          coracoes: 0,
        };
        vestir(atual);
      } else if (e.e === 'baileSolta' && atual && atual.quem === e.quem && atual.criatura === e.criatura)
        soltar(atual);
    },
    atualizar(dt: number): void {
      const a = atual;
      if (!a) return;
      a.t += dt > 0 && Number.isFinite(dt) ? dt : 0;
      // a criança daqui que andou (a camada dela soltou sozinha) solta o abraço na tela também
      if (a.solto < 0 && a.crianca && !a.crianca.ativa && a.t < DURACAO_ABRACO) soltar(a);
      vestir(a);
      // os coraçõezinhos sobem do meio dos dois, na altura das cabeças
      while (a.solto < 0 && a.coracoes < CORACOES.length && a.t >= CORACOES[a.coracoes][0]) {
        const b = op.criatura(a.criatura);
        const l = b ? lugarDoBentoNoAbraco(a, b, 1, a.distancia) : a;
        op.coracoes((a.x + l.x) / 2, a.y + 1.9, (a.z + l.z) / 2, CORACOES[a.coracoes][1]);
        a.coracoes++;
      }
      if (a.t > DURACAO_ABRACO || (a.solto >= 0 && a.t - a.solto > VOLTA)) atual = null;
    },
    /** Onde o Bento fica na tela agora (no abraço), ou null (no posto, onde o núcleo diz). */
    lugarDoBento(criatura: number): { x: number; y: number; z: number; yaw: number } | null {
      const a = atual;
      if (!a || a.criatura !== criatura) return null;
      const b = op.criatura(criatura);
      if (!b) return null;
      const l = lugarDoBentoNoAbraco(a, b, peso(a), a.distancia);
      return { x: l.x, y: b.y, z: l.z, yaw: l.yaw };
    },
    /** Para onde o corpo da criança `quem` olha no abraço (de frente para o Bento), ou null. */
    yawDe(quem: string): number | null {
      const a = atual;
      if (!a || a.quem !== quem || a.solto >= 0) return null;
      const b = op.criatura(a.criatura);
      return b ? yawDaCriancaNoAbraco(a, b) : null;
    },
    /** Testes: o abraço na tela agora. */
    estado(): {
      quem: string;
      criatura: number;
      t: number;
      solto: boolean;
      peso: number;
      /** Onde a criança e o Bento estão na tela (os pés). */
      crianca: [number, number, number];
      bento: [number, number, number] | null;
      /** Para onde cada um olha (rad, o giro no chão). */
      yawCrianca: number | null;
      yawBento: number | null;
    } | null {
      const a = atual;
      if (!a) return null;
      const b = op.criatura(a.criatura);
      const l = b ? lugarDoBentoNoAbraco(a, b, peso(a), a.distancia) : null;
      return {
        quem: a.quem,
        criatura: a.criatura,
        t: a.t,
        solto: a.solto >= 0,
        peso: peso(a),
        crianca: [a.x, a.y, a.z],
        bento: l && b ? [l.x, b.y, l.z] : null,
        yawCrianca: b ? yawDaCriancaNoAbraco(a, b) : null,
        yawBento: l ? l.yaw : null,
      };
    },
  };
}

export type AbracoNaTela = ReturnType<typeof criarAbracoNaTela>;
