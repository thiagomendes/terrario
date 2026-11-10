import {
  calcularPose,
  criarAcoes,
  PERIODO_MINERAR,
  type CamadaPose,
  type Pose,
} from '../personagem/poses';
import {
  AGACHA_ATERRISSAGEM,
  AGACHA_PULO,
  agachar,
  atualizarCorpo,
  criarCorpo,
  type SaidaCorpo,
} from '../personagem/vida';
import { VELOCIDADE_MINIMA_PASSO } from './movimento';

/** Tempo (s) em que o estado "minerando" persiste após cada golpe. */
export const JANELA_GOLPE = PERIODO_MINERAR * 1.4;

export type EventoAnimacao = 'golpe' | 'colocacao' | 'pulo' | 'aterrissagem' | 'comer';

/** Quanto dura levar a comida à boca e mastigar (s). */
export const DURACAO_COMER = 1.1;

export interface MovimentoAnimacao {
  velocidadeHoriz: number;
  correndo: boolean;
  noChao: boolean;
  /** Voando no criativo (pernas juntas em vez da pose de pulo). */
  voando?: boolean;
  /**
   * Movimento com vida (spec 015): velocidade em x e z (blocos/s). Sem isto, o corpo segue
   * o jeito antigo (balanço fixo por tempo, sem girar).
   */
  vx?: number;
  vz?: number;
  /** Minerando ou construindo: o corpo vira para este yaw (o bloco); senão null. */
  alvoYaw?: number | null;
  /** Para onde a câmera (ou o amigo) olha: a cabeça acompanha um pouco. */
  olharYaw?: number;
}

/** Estado contínuo do movimento (passada, golpe, colocar, ar, comer) para o boneco. */
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
  /** Progresso 0..1 de comer em curso, ou null. */
  comer: number | null;
}

export interface Animador {
  evento(nome: EventoAnimacao): void;
  atualizar(dt: number, movimento: MovimentoAnimacao): Pose;
  pose(): Pose;
  vista(): Vista;
  /** Para onde o corpo está virado (rad): o boneco é posicionado com este yaw. */
  yaw(): number;
  /** Vira o corpo na hora (nascer, teleporte, captura). */
  definirYaw(yaw: number): void;
  /** O último quadro do corpo vivo (inclinação, curva, passada), para testes. */
  corpo(): SaidaCorpo | null;
  /**
   * Gancho dos gestos (spec 015 T04): uma camada aplicada por cima da pose base em cada
   * quadro, até devolver null (aí sai sozinha). Uma camada nova substitui a anterior;
   * null tira a atual.
   */
  definirCamada(camada: CamadaPose | null): void;
  /** A camada em curso (null sem gesto). */
  camada(): CamadaPose | null;
}

export function criarAnimador(yawInicial = 0): Animador {
  const acoes = criarAcoes();
  const corpo = criarCorpo(yawInicial);
  let saidaCorpo: SaidaCorpo | null = null;
  let camada: CamadaPose | null = null;
  let tempo = 0;
  let desdeGolpe = Infinity;
  let desdeComer = Infinity;
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
      if (nome === 'comer') {
        desdeComer = 0;
        return;
      }
      if (nome === 'golpe') {
        if (desdeGolpe >= JANELA_GOLPE) inicioGolpes = tempo;
        desdeGolpe = 0;
      } else acoes.disparar(nome);
      // a agachadinha do pulo e a amortecida da aterrissagem (movimento com vida)
      if (nome === 'pulo') agachar(corpo, AGACHA_PULO);
      if (nome === 'aterrissagem') agachar(corpo, AGACHA_ATERRISSAGEM);
    },
    atualizar(dt, movimento) {
      const passo = dt > 0 && Number.isFinite(dt) ? dt : 0;
      tempo += passo;
      desdeGolpe += passo;
      desdeComer += passo;
      acoes.avancar(passo);
      const a = acoes.estado();
      const moveu = movimento.noChao && movimento.velocidadeHoriz > VELOCIDADE_MINIMA_PASSO;
      const alvoPassada = moveu ? (movimento.correndo ? 1.5 : 1) : 0;
      const k = 1 - Math.exp(-passo * 8);
      passada += (alvoPassada - passada) * k;
      noAr += ((movimento.noChao ? 0 : 1) - noAr) * k;
      colocarAtivo = a.colocando ? a.progressoColocar : null;
      const vivo = movimento.vx !== undefined && movimento.vz !== undefined;
      if (vivo) {
        saidaCorpo = atualizarCorpo(corpo, {
          dt: passo,
          vx: movimento.vx ?? 0,
          vz: movimento.vz ?? 0,
          correndo: movimento.correndo,
          noChao: movimento.noChao && !movimento.voando,
          alvoYaw: movimento.alvoYaw ?? null,
          olharYaw: movimento.olharYaw ?? corpo.yaw,
        });
      }
      const s = saidaCorpo;
      atual = calcularPose({
        andando: moveu && !movimento.correndo,
        correndo: moveu && movimento.correndo,
        noAr: !movimento.noChao,
        minerando: desdeGolpe < JANELA_GOLPE,
        colocando: a.colocando,
        tempo,
        progressoColocar: a.progressoColocar,
        // com vida, o pulo usa a agachadinha do corpo no lugar do afundar antigo
        afundar: vivo ? 0 : a.afundar,
        voando: movimento.voando,
        comendo: desdeComer < DURACAO_COMER ? desdeComer / DURACAO_COMER : undefined,
        ...(vivo && s
          ? {
              passo: { fase: s.fase, amplitude: s.amplitude },
              agacha: s.agacha,
              inclina: s.inclina,
              roll: s.roll,
              cabecaGiro: s.cabeca,
            }
          : {}),
      });
      if (camada) {
        const r = camada(atual, {
          dt: passo,
          tempo,
          // o mesmo limite da passada, também voando (andar no ar interrompe o gesto)
          andando: movimento.velocidadeHoriz > VELOCIDADE_MINIMA_PASSO,
          noChao: movimento.noChao,
          voando: !!movimento.voando,
          ocupado: desdeGolpe < JANELA_GOLPE || a.colocando || desdeComer < DURACAO_COMER,
        });
        if (r) atual = r;
        else camada = null;
      }
      return atual;
    },
    pose: () => atual,
    yaw: () => corpo.yaw,
    definirYaw(y) {
      if (Number.isFinite(y)) corpo.yaw = Math.atan2(Math.sin(y), Math.cos(y));
    },
    corpo: () => saidaCorpo,
    definirCamada(c) {
      camada = c;
    },
    camada: () => camada,
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
      comer: desdeComer < DURACAO_COMER ? desdeComer / DURACAO_COMER : null,
    }),
  };
}
