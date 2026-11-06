export const PERIODO_MINERAR = 0.25;
export const DURACAO_COLOCAR = 0.2;
export const DURACAO_PULO = 0.25;
export const DURACAO_ATERRISSAGEM = 0.25;

const FREQUENCIA_ANDAR = 1.6;
const FREQUENCIA_CORRER = 2.4;
const AMPLITUDE_ANDAR = 0.6;
const AMPLITUDE_CORRER = 1.0;
const AFUNDAR_MAXIMO = 0.08;

export interface EntradaPose {
  andando: boolean;
  correndo: boolean;
  noAr: boolean;
  minerando: boolean;
  colocando: boolean;
  tempo: number;
  /** Progresso 0..1 do empurrão de colocar (opcional). */
  progressoColocar?: number;
  /** Afundar do tronco 0..1 (pulo ou aterrissagem, opcional). */
  afundar?: number;
}

export interface Pose {
  bracoDireito: number;
  bracoEsquerdo: number;
  pernaDireita: number;
  pernaEsquerda: number;
  tronco: number;
  cabeca: number;
}

export function calcularPose(entrada: EntradaPose): Pose {
  const { andando, correndo, noAr, minerando, colocando, tempo } = entrada;
  let balanco = 0;
  if (andando || correndo) {
    const freq = correndo ? FREQUENCIA_CORRER : FREQUENCIA_ANDAR;
    const amp = correndo ? AMPLITUDE_CORRER : AMPLITUDE_ANDAR;
    balanco = Math.sin(tempo * freq * Math.PI * 2) * amp;
  }
  let bracoDireito = 0 - balanco;
  const bracoEsquerdo = balanco;
  let pernaDireita = balanco;
  let pernaEsquerda = 0 - balanco;
  let tronco = 0 - (entrada.afundar ?? 0) * AFUNDAR_MAXIMO;
  let cabeca = 0;
  if (noAr) {
    pernaDireita = 0.3;
    pernaEsquerda = -0.3;
  }
  if (minerando) {
    const fase = (tempo / PERIODO_MINERAR) * Math.PI * 2;
    bracoDireito = -1.2 + Math.sin(fase) * 0.8;
    cabeca = 0.1;
  } else if (colocando) {
    const p = Math.min(1, Math.max(0, entrada.progressoColocar ?? 0));
    bracoDireito = -Math.sin(p * Math.PI) * 0.9;
  }
  if (!Number.isFinite(tronco)) tronco = 0;
  return { bracoDireito, bracoEsquerdo, pernaDireita, pernaEsquerda, tronco, cabeca };
}

export type AcaoCurta = 'colocacao' | 'pulo' | 'aterrissagem';

export interface EstadoAcoes {
  colocando: boolean;
  progressoColocar: number;
  afundar: number;
}

export interface Acoes {
  disparar(acao: AcaoCurta): void;
  avancar(dt: number): void;
  estado(): EstadoAcoes;
}

export function criarAcoes(): Acoes {
  const decorrido: Record<AcaoCurta, number> = {
    colocacao: Infinity,
    pulo: Infinity,
    aterrissagem: Infinity,
  };
  const duracao: Record<AcaoCurta, number> = {
    colocacao: DURACAO_COLOCAR,
    pulo: DURACAO_PULO,
    aterrissagem: DURACAO_ATERRISSAGEM,
  };
  const ativa = (a: AcaoCurta) => decorrido[a] < duracao[a];
  const prog = (a: AcaoCurta) => (ativa(a) ? decorrido[a] / duracao[a] : 0);
  return {
    disparar(acao) {
      decorrido[acao] = 0;
    },
    avancar(dt) {
      if (!(dt > 0)) return;
      for (const a of Object.keys(decorrido) as AcaoCurta[]) {
        if (decorrido[a] < duracao[a]) decorrido[a] += dt;
      }
    },
    estado() {
      const afundarDe = (a: AcaoCurta) => (ativa(a) ? Math.sin(prog(a) * Math.PI) : 0);
      return {
        colocando: ativa('colocacao'),
        progressoColocar: prog('colocacao'),
        afundar: Math.max(afundarDe('pulo'), afundarDe('aterrissagem')),
      };
    },
  };
}
