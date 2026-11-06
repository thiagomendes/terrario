import { calcularPose, criarAcoes, PERIODO_MINERAR, type Pose } from '../personagem/poses';
import { VELOCIDADE_MINIMA_PASSO } from './movimento';

/** Tempo (s) em que o estado "minerando" persiste após cada golpe. */
export const JANELA_GOLPE = PERIODO_MINERAR * 1.4;

export type EventoAnimacao = 'golpe' | 'colocacao' | 'pulo' | 'aterrissagem';

export interface MovimentoAnimacao {
  velocidadeHoriz: number;
  correndo: boolean;
  noChao: boolean;
}

/** Estado contínuo para o braço em primeira pessoa (viewmodel). */
export interface Vista {
  tempo: number;
  /** 0 parado, 1 andando, ~1.5 correndo (suavizado). */
  passada: number;
  /** Fase 0..1 do golpe em curso, ou null. */
  golpe: number | null;
  /** Progresso 0..1 da colocação em curso, ou null. */
  colocar: number | null;
  /** 0 no chão, 1 no ar (suavizado). */
  noAr: number;
}

export interface Animador {
  evento(nome: EventoAnimacao): void;
  atualizar(dt: number, movimento: MovimentoAnimacao): Pose;
  pose(): Pose;
  vista(): Vista;
}

export function criarAnimador(): Animador {
  const acoes = criarAcoes();
  let tempo = 0;
  let desdeGolpe = Infinity;
  let inicioGolpes = 0;
  let passada = 0;
  let noAr = 0;
  let colocarAtivo: number | null = null;
  let atual = calcularPose({
    andando: false,
    correndo: false,
    noAr: false,
    minerando: false,
    colocando: false,
    tempo: 0,
  });
  return {
    evento(nome) {
      if (nome === 'golpe') {
        if (desdeGolpe >= JANELA_GOLPE) inicioGolpes = tempo;
        desdeGolpe = 0;
      } else acoes.disparar(nome);
    },
    atualizar(dt, movimento) {
      const passo = dt > 0 && Number.isFinite(dt) ? dt : 0;
      tempo += passo;
      desdeGolpe += passo;
      acoes.avancar(passo);
      const a = acoes.estado();
      const moveu = movimento.noChao && movimento.velocidadeHoriz > VELOCIDADE_MINIMA_PASSO;
      const alvoPassada = moveu ? (movimento.correndo ? 1.5 : 1) : 0;
      const k = 1 - Math.exp(-passo * 8);
      passada += (alvoPassada - passada) * k;
      noAr += ((movimento.noChao ? 0 : 1) - noAr) * k;
      colocarAtivo = a.colocando ? a.progressoColocar : null;
      atual = calcularPose({
        andando: moveu && !movimento.correndo,
        correndo: moveu && movimento.correndo,
        noAr: !movimento.noChao,
        minerando: desdeGolpe < JANELA_GOLPE,
        colocando: a.colocando,
        tempo,
        progressoColocar: a.progressoColocar,
        afundar: a.afundar,
      });
      return atual;
    },
    pose: () => atual,
    vista: () => ({
      tempo,
      passada,
      golpe:
        desdeGolpe < JANELA_GOLPE
          ? ((((tempo - inicioGolpes) % PERIODO_MINERAR) + PERIODO_MINERAR) % PERIODO_MINERAR) /
            PERIODO_MINERAR
          : null,
      colocar: colocarAtivo,
      noAr,
    }),
  };
}
