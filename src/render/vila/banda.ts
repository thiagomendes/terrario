/**
 * Os gestos da banda no Show da Vila (spec 026, o show de verdade): a coreografia
 * (`src/jogo/coreografia.ts`) diz o que cada músico faz, e aqui vira pose no tempo da música de
 * agora (cada batida da música, no andamento dela):
 *
 * - **cantar:** o braço do microfone na boca, o outro marcando o tempo, a cabeça acompanhando;
 * - **braço no alto:** o microfone (ou o punho) para o céu, quicando nas batidas;
 * - **tocar / balançar / bater cabeça:** a guitarra (ou o baixo) no braço, a mão tocando nas
 *   batidas; balançando o corpo para a frente e para trás; a cabeça embaixo em cada batida;
 * - **solo:** o corpo para trás, os joelhos dobrados, a mão rápida, balançando;
 * - **palmas** no alto (o vocalista puxa o povo), **acenar**, **apontar** (o chamado), **pulo**
 *   e **reverência**;
 * - **o baterista** sentado no banquinho: as baquetas nas peças em cada colcheia, o prato na
 *   cabeça do compasso, a contagem com as baquetas no alto e os braços para o céu nas pausas.
 */
import { aplicarJuntas, juntasDe, type Juntas } from '../../personagem/gestos';
import type { Pose } from '../../personagem/poses';
import type { AcaoBanda, PapelBanda } from '../../jogo/coreografia';

const frac = (x: number) => x - Math.floor(x);

/** A batida de agora: o número de batidas (pode ser fracionário) e quanto dura uma (s). */
export interface Batida {
  batida: number;
  seg: number;
}

/** As pernas e o corpo de quem está sentado no banquinho da bateria. */
const SENTADO: Juntas = { pernaD: -1.35, pernaE: -1.35, corpoY: -0.12, troncoX: 0.08 };

function juntasDaAcao(papel: PapelBanda, acao: AcaoBanda, desde: number, b: Batida): Juntas | null {
  const fb = frac(b.batida);
  /** A cabeça embaixo em cada batida (0 a 1). */
  const bate = Math.pow(Math.max(0, Math.cos(fb * Math.PI * 2)), 2);
  /** O corpo descendo um tiquinho em cada batida. */
  const quica = -Math.abs(Math.sin(fb * Math.PI)) * 0.05;
  /** A mão que toca (a palheta): sobe e desce duas vezes por batida. */
  const toca = Math.sin(b.batida * Math.PI * 4);
  switch (acao) {
    case 'esperar':
      return null;
    case 'cantar': {
      // o microfone na boca (mão direita), a esquerda aberta marcando o tempo
      const marca = Math.sin(b.batida * Math.PI);
      return {
        bdX: -2.05,
        bdZ: 0.55,
        beX: -0.75 - 0.35 * marca,
        beZ: -0.55,
        cabX: -0.06 + bate * 0.12,
        troncoZ: Math.sin(b.batida * Math.PI * 0.5) * 0.06,
        corpoY: quica,
      };
    }
    case 'bracoAlto':
      // o microfone para o céu e o punho na frente, quicando
      return {
        bdZ: 2.75 + Math.sin(b.batida * Math.PI * 2) * 0.12,
        bdX: -0.15,
        beX: -1.15,
        beZ: -0.4,
        cabX: -0.18,
        corpoY: quica * 1.6,
      };
    case 'tocar':
    case 'balancar':
    case 'baterCabeca': {
      if (papel === 'vocalista') {
        // o vocalista bate cabeça com o microfone no alto
        return {
          bdZ: 2.2,
          bdX: -0.4,
          beX: -0.9,
          beZ: -0.5,
          cabX: 0.05 + bate * 0.45,
          troncoX: 0.1 + bate * 0.14,
          corpoY: quica,
        };
      }
      const cab = acao === 'baterCabeca' ? 0.05 + bate * 0.45 : 0.02 + bate * 0.14;
      const vai = acao === 'balancar' ? Math.sin(b.batida * Math.PI) * 0.16 : 0;
      return {
        // a mão esquerda no braço do instrumento, a direita tocando
        beX: -1.15,
        beZ: -0.55,
        bdX: -0.55 + toca * 0.24,
        bdZ: 0.35,
        cabX: cab,
        troncoX: (acao === 'baterCabeca' ? 0.08 + bate * 0.12 : 0.04) + vai,
        corpoY: quica,
        pernaD: -0.12,
        pernaE: 0.12,
      };
    }
    case 'solo': {
      // para trás, joelhos dobrados, a mão bem rápida, balançando devagar de um lado ao outro
      const lado = Math.sin(b.batida * Math.PI * 0.5);
      return {
        beX: -1.25,
        beZ: -0.7,
        bdX: -0.5 + Math.sin(b.batida * Math.PI * 8) * 0.2,
        bdZ: 0.4,
        troncoX: -0.22 + bate * 0.06,
        troncoZ: lado * 0.12,
        cabX: -0.32 + bate * 0.1,
        cabZ: lado * 0.1,
        corpoY: -0.1 + quica,
        pernaD: -0.32,
        pernaE: 0.3,
      };
    }
    case 'palmas': {
      // palmas no alto em cada batida (as mãos se encontram em cima da cabeça)
      const abre = Math.abs(Math.sin(fb * Math.PI));
      return {
        bdZ: 2.45 - abre * 0.55,
        beZ: -2.45 + abre * 0.55,
        bdX: -0.2,
        beX: -0.2,
        cabX: -0.12,
        corpoY: quica,
      };
    }
    case 'acenar':
      return juntasDe('acenar', 0.4 + (desde % 1.2));
    case 'apontar': {
      // o chamado: o braço aponta o povo e varre de um lado ao outro, o outro chama
      const varre = Math.sin(desde * 2.2) * 0.5;
      return {
        bdX: -1.6,
        bdZ: varre,
        beX: -1.3 + Math.sin(desde * 9) * 0.3,
        beZ: 0,
        cabY: varre * 0.4,
        cabX: -0.08,
      };
    }
    case 'pulo':
      return juntasDe('pulo-estrela', 0.05 + (desde % 1.6));
    case 'reverencia':
      return desde < 2.2 ? juntasDe('reverencia', desde) : null;
    case 'sentado':
      return { ...SENTADO, beX: -0.75, bdX: -0.75, cabX: bate * 0.08 };
    case 'bateria': {
      // as baquetas nas peças em cada colcheia, uma mão de cada vez; o prato na cabeça do
      // compasso (o braço direito sobe e cai)
      const col = b.batida * 2;
      const mao = Math.floor(col) % 2;
      const golpe = Math.pow(1 - frac(col), 3);
      const prato = frac(b.batida / 4) < 0.18;
      return {
        ...SENTADO,
        bdX: prato ? -2.0 + golpe * 0.6 : -0.9 - (mao ? 0 : golpe * 0.7),
        bdZ: prato ? 0.9 : 0.35,
        beX: -0.9 - (mao ? golpe * 0.7 : 0),
        beZ: -0.35,
        cabX: 0.05 + bate * 0.2,
        corpoY: (SENTADO.corpoY ?? 0) + quica * 0.6,
      };
    }
    case 'contagem': {
      // as baquetas no alto batendo uma na outra em cada batida
      const bat = Math.pow(1 - fb, 4);
      return {
        ...SENTADO,
        bdZ: 2.3 - bat * 0.35,
        beZ: -2.3 + bat * 0.35,
        bdX: -0.4,
        beX: -0.4,
        cabX: -0.12,
      };
    }
    case 'baquetasAlto':
      return {
        ...SENTADO,
        bdZ: 2.6 + Math.sin(desde * 6) * 0.15,
        beZ: -2.6 + Math.sin(desde * 6 + 1) * 0.15,
        bdX: 0,
        beX: 0,
        cabX: -0.2,
      };
  }
}

/**
 * A pose de um músico: a ação da coreografia em cima da pose do animador (o passo, quando anda).
 * A ação entra macia (um quarto de segundo); andando, só os braços (o passo fica do animador).
 */
export function poseDaBanda(
  papel: PapelBanda,
  acao: AcaoBanda,
  desde: number,
  andando: boolean,
  b: Batida,
  pose: Pose,
): Pose {
  const j = juntasDaAcao(papel, acao, desde, b);
  if (!j) return pose;
  if (andando) {
    // andando, as pernas e o corpo são do passo
    delete j.pernaD;
    delete j.pernaE;
    delete j.corpoY;
    delete j.troncoX;
  }
  const peso = Math.min(1, Math.max(0, desde) / 0.25 + (andando ? 1 : 0));
  return aplicarJuntas(pose, j, Math.max(0.0001, peso));
}
