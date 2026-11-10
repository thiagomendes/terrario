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
  /** Voando no criativo: pernas juntas, levemente para trás, balançando devagar. */
  voando?: boolean;
  /** Progresso 0..1 de levar a comida à boca e mastigar (opcional). */
  comendo?: number;
}

const suave = (x: number) => x * x * (3 - 2 * x);
/**
 * Golpe com preparo (esboço de movimento): 0..1 → ângulo do braço. Vai para trás devagar,
 * desce rápido e volta acompanhando.
 */
export function curvaGolpe(f: number): number {
  if (f < 0.35) return -1.1 * suave(f / 0.35);
  if (f < 0.5) return -1.1 + 2.6 * suave((f - 0.35) / 0.15);
  return 1.5 * (1 - suave((f - 0.5) / 0.5));
}

export interface Pose {
  bracoDireito: number;
  bracoEsquerdo: number;
  pernaDireita: number;
  pernaEsquerda: number;
  tronco: number;
  cabeca: number;
  // movimentos do boneco de brinquedo (spec 012); o personagem antigo ignora
  /** Altura do corpo (sobe e desce a cada passo, afunda no pulo). */
  corpoY?: number;
  /** Achatar (< 1) ou esticar (> 1) o corpo: a mola do pulo e da queda. */
  escala?: number;
  /** Inclinação do tronco para a frente (correr, golpe), giro e balanço de lado. */
  troncoX?: number;
  troncoY?: number;
  troncoZ?: number;
  /** A cabeça olha em volta e inclina de lado. */
  cabecaGiro?: number;
  cabecaLado?: number;
  /** Braços abertos para o lado (pulo, voo). */
  bracoDireitoAbre?: number;
  bracoEsquerdoAbre?: number;
  /** Topete e acessórios balançando atrasados. */
  topete?: number;
  piscar?: boolean;
  /** Boca abrindo (mastigar). */
  boca?: number;
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
  if (entrada.voando) {
    // flutuando: pernas juntas, um pouco para trás, com um balanço lento e pequeno
    const flutua = Math.sin(tempo * 1.8) * 0.06;
    pernaDireita = 0.22 + flutua;
    pernaEsquerda = 0.22 + flutua;
  } else if (noAr) {
    pernaDireita = 0.3;
    pernaEsquerda = -0.3;
  }
  // ---- movimentos de brinquedo (campos extras) ----
  const afundar = entrada.afundar ?? 0;
  const passo = andando || correndo;
  const ritmo = correndo ? FREQUENCIA_CORRER : FREQUENCIA_ANDAR;
  const fasePasso = tempo * ritmo * Math.PI * 2;
  let corpoY = passo ? Math.abs(Math.cos(fasePasso)) * (correndo ? 0.06 : 0.035) : 0;
  corpoY -= afundar * AFUNDAR_MAXIMO;
  let escala = 1 - afundar * 0.16;
  let troncoX = correndo ? 0.22 : andando ? 0.06 : 0;
  let troncoY = passo ? Math.sin(fasePasso) * 0.12 : 0;
  let troncoZ = 0;
  let cabecaGiro = passo ? -Math.sin(fasePasso) * 0.1 : 0;
  let cabecaLado = 0;
  let bracoDireitoAbre = 0;
  let bracoEsquerdoAbre = 0;
  let boca = 0;
  const parado = !passo && !noAr && !minerando && !colocando && !entrada.voando;
  if (parado) {
    // respira e, de vez em quando, olha em volta
    escala *= 1 + Math.sin(tempo * 2.2) * 0.012;
    cabecaGiro = Math.sin(tempo * 0.6) * 0.5 * suave(Math.max(0, Math.sin(tempo * 0.3)));
    cabeca = Math.sin(tempo * 0.9) * 0.05;
    bracoEsquerdoAbre = 0.03 + Math.sin(tempo * 2.2) * 0.03;
    bracoDireitoAbre = bracoEsquerdoAbre;
  }
  if (noAr && !entrada.voando) {
    // no ar: estica um pouco e abre os braços
    escala = Math.max(escala, 1.06);
    bracoDireitoAbre = 0.9;
    bracoEsquerdoAbre = 0.9;
  }
  if (entrada.voando) {
    corpoY += Math.sin(tempo * 1.8) * 0.03;
    bracoDireitoAbre = 0.35;
    bracoEsquerdoAbre = 0.35;
    troncoX = 0.12;
  }
  if (minerando) {
    const f = (((tempo / PERIODO_MINERAR) % 1) + 1) % 1;
    const g = curvaGolpe(f);
    bracoDireito = -1.6 + g * 0.9;
    cabeca = 0.25;
    troncoX = 0.1 + Math.max(0, g) * 0.18;
    troncoY = -0.2 + g * 0.08;
  } else if (colocando) {
    const p = Math.min(1, Math.max(0, entrada.progressoColocar ?? 0));
    bracoDireito = -Math.sin(p * Math.PI) * 0.9;
    troncoX += Math.sin(p * Math.PI) * 0.08;
  }
  if (entrada.comendo !== undefined && entrada.comendo > 0) {
    // leva até a boca (30% do tempo), mastiga e abaixa no fim
    const leva =
      suave(Math.min(1, entrada.comendo / 0.3)) *
      (1 - suave(Math.max(0, (entrada.comendo - 0.85) / 0.15)));
    bracoDireito = -2.0 * leva + Math.sin(tempo * 14) * 0.08 * leva;
    bracoDireitoAbre = -0.35 * leva;
    cabeca = 0.12 + Math.sin(tempo * 14) * 0.05;
    boca = Math.abs(Math.sin(tempo * 14)) * leva;
  }
  // piscar a cada ~3,3 s
  const piscar = tempo % 3.3 < 0.12;
  // o topete vem atrasado: mexe ao contrário do corpo
  const topete = -corpoY * 2.5 - troncoX * 0.8 + Math.sin(tempo * 3) * 0.05;
  if (!Number.isFinite(tronco)) tronco = 0;
  return {
    bracoDireito,
    bracoEsquerdo,
    pernaDireita,
    pernaEsquerda,
    tronco,
    cabeca,
    corpoY,
    escala,
    troncoX,
    troncoY,
    troncoZ,
    cabecaGiro,
    cabecaLado,
    bracoDireitoAbre,
    bracoEsquerdoAbre,
    topete,
    piscar,
    boca,
  };
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
