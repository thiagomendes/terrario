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

export interface Animador {
  evento(nome: EventoAnimacao): void;
  atualizar(dt: number, movimento: MovimentoAnimacao): Pose;
  pose(): Pose;
}

export function criarAnimador(): Animador {
  const acoes = criarAcoes();
  let tempo = 0;
  let desdeGolpe = Infinity;
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
      if (nome === 'golpe') desdeGolpe = 0;
      else acoes.disparar(nome);
    },
    atualizar(dt, movimento) {
      const passo = dt > 0 && Number.isFinite(dt) ? dt : 0;
      tempo += passo;
      desdeGolpe += passo;
      acoes.avancar(passo);
      const a = acoes.estado();
      const moveu = movimento.noChao && movimento.velocidadeHoriz > VELOCIDADE_MINIMA_PASSO;
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
  };
}
