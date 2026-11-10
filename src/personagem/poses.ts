export const PERIODO_MINERAR = 0.25;
export const DURACAO_COLOCAR = 0.2;
export const DURACAO_PULO = 0.25;
export const DURACAO_ATERRISSAGEM = 0.25;

const FREQUENCIA_ANDAR = 1.6;
const FREQUENCIA_CORRER = 2.4;
const AMPLITUDE_ANDAR = 0.6;
const AMPLITUDE_CORRER = 1.0;
const AFUNDAR_MAXIMO = 0.08;
/** Agachadinha do pulo (como no esboço: 0,12 do corpo). */
const AGACHA_MAXIMO = 0.12;

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
  /**
   * Movimento com vida (spec 015): fase e amplitude da passada pela velocidade (no lugar
   * do balanço fixo por tempo), agachadinha do pulo, inclinação e giro da cabeça.
   */
  passo?: { fase: number; amplitude: number };
  /** Agachadinha do pulo e amortecida da aterrissagem (0..1). */
  agacha?: number;
  /** Corpo inteiro inclinado para a frente e de lado na curva (rad). */
  inclina?: number;
  roll?: number;
  /** A cabeça vira um pouco para a câmera (rad, relativo ao corpo). */
  cabecaGiro?: number;
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
  /** Corpo inteiro (a partir dos pés): inclinado para a frente e de lado (rad). */
  corpoX?: number;
  corpoZ?: number;
  /** Giro do braço no próprio eixo (apontar, gestos). */
  bracoDireitoGiro?: number;
  bracoEsquerdoGiro?: number;
}

/**
 * Camada por cima da pose base (gestos, spec 015 T04): recebe a pose do quadro e devolve
 * a pose com o gesto aplicado, ou null quando o gesto acabou (o animador tira a camada).
 */
export interface InfoCamada {
  dt: number;
  /** Tempo do animador (s). */
  tempo: number;
  /** Andando (ou voando para algum lado) neste quadro: andar interrompe o gesto. */
  andando: boolean;
  noChao: boolean;
  /** Voando no criativo (parado no ar não conta como pulo). */
  voando: boolean;
  /** Minerando, colocando um bloco ou comendo neste quadro. */
  ocupado: boolean;
}
export type CamadaPose = (base: Pose, info: InfoCamada) => Pose | null;

export function calcularPose(entrada: EntradaPose): Pose {
  const { andando, correndo, noAr, minerando, colocando, tempo } = entrada;
  const vivo = entrada.passo;
  let balanco = 0;
  if (vivo) balanco = Math.sin(vivo.fase) * vivo.amplitude;
  else if (andando || correndo) {
    const freq = correndo ? FREQUENCIA_CORRER : FREQUENCIA_ANDAR;
    const amp = correndo ? AMPLITUDE_CORRER : AMPLITUDE_ANDAR;
    balanco = Math.sin(tempo * freq * Math.PI * 2) * amp;
  }
  // braços um pouco menos que as pernas (como no esboço)
  const bracos = vivo ? 0.9 : 1;
  let bracoDireito = 0 - balanco * bracos;
  const bracoEsquerdo = balanco * bracos;
  let pernaDireita = balanco;
  let pernaEsquerda = 0 - balanco;
  const agacha = entrada.agacha ?? 0;
  let tronco = 0 - (entrada.afundar ?? 0) * AFUNDAR_MAXIMO - agacha * AGACHA_MAXIMO;
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
  const passo = vivo ? vivo.amplitude > 0.02 : andando || correndo;
  const ritmo = correndo ? FREQUENCIA_CORRER : FREQUENCIA_ANDAR;
  const fasePasso = vivo ? vivo.fase : tempo * ritmo * Math.PI * 2;
  const forca = vivo ? Math.min(1, vivo.amplitude / AMPLITUDE_ANDAR) : 1;
  let corpoY = vivo
    ? Math.abs(Math.sin(fasePasso)) * 0.05 * vivo.amplitude
    : passo
      ? Math.abs(Math.cos(fasePasso)) * (correndo ? 0.06 : 0.035)
      : 0;
  corpoY -= afundar * AFUNDAR_MAXIMO + agacha * AGACHA_MAXIMO;
  if (noAr && vivo && !entrada.voando) corpoY += 0.04;
  let escala = 1 - afundar * 0.16 - agacha * 0.08;
  let troncoX = vivo ? 0 : correndo ? 0.22 : andando ? 0.06 : 0;
  let troncoY = passo ? Math.sin(fasePasso) * 0.12 * forca : 0;
  const troncoZ = 0;
  let cabecaGiro = passo ? -Math.sin(fasePasso) * 0.1 * forca : 0;
  const cabecaLado = 0;
  let bracoDireitoAbre = 0;
  let bracoEsquerdoAbre = 0;
  let boca = 0;
  const parado = !passo && !noAr && !minerando && !colocando && !entrada.voando;
  if (parado) {
    // respira e, de vez em quando, olha em volta (com a câmera por perto, a cabeça
    // acompanha a câmera: só um leve balanço)
    escala *= 1 + Math.sin(tempo * 2.2) * 0.012;
    cabecaGiro =
      entrada.cabecaGiro !== undefined
        ? 0
        : Math.sin(tempo * 0.6) * 0.5 * suave(Math.max(0, Math.sin(tempo * 0.3)));
    cabeca = Math.sin(tempo * 0.9) * 0.05;
    bracoEsquerdoAbre = 0.03 + Math.sin(tempo * 2.2) * 0.03;
    bracoDireitoAbre = bracoEsquerdoAbre;
  }
  if (noAr && !entrada.voando) {
    // no ar: estica um pouco e abre os braços
    escala = Math.max(escala, vivo ? 1.05 : 1.06);
    bracoDireitoAbre = vivo ? 0.5 : 0.9;
    bracoEsquerdoAbre = bracoDireitoAbre;
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
  // a cabeça acompanha um pouco a câmera (ou o olhar do amigo)
  if (entrada.cabecaGiro !== undefined) cabecaGiro += entrada.cabecaGiro;
  // piscar a cada ~3,3 s
  const piscar = tempo % 3.3 < 0.12;
  // o topete vem atrasado: mexe ao contrário do corpo
  const topete =
    -corpoY * 2.5 - troncoX * 0.8 - (entrada.inclina ?? 0) * 0.8 + Math.sin(tempo * 3) * 0.05;
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
    corpoX: entrada.inclina ?? 0,
    corpoZ: entrada.roll ?? 0,
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
