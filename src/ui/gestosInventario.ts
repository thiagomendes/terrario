/** Gestos de toque nos slots do inventário (lógica pura, sem DOM). */

/** Segurar parado por este tempo equivale ao botão direito (metade ou um). */
export const TEMPO_TOQUE_LONGO = 350;
/** Dois toques no mesmo slot dentro deste intervalo equivalem a Shift+clique (mover rápido). */
export const JANELA_TOQUE_DUPLO = 300;
/** Deslocamento máximo do dedo para ainda contar como toque (px). */
export const FOLGA_TOQUE_INV = 10;

export type GestoInventario = 'simples' | 'duplo' | 'longo' | 'arrastar';

export interface DadosToqueInv {
  /** Tempo entre pointerdown e pointerup (ms). */
  duracaoMs: number;
  /** Distância percorrida pelo dedo (px). */
  deslocamentoPx: number;
  /** Tempo desde o toque simples anterior (ms); Infinity se não houve. */
  desdeUltimoMs: number;
  /** O toque anterior foi no mesmo slot. */
  mesmoSlot: boolean;
}

export function classificarToqueInventario(d: DadosToqueInv): GestoInventario {
  if (d.deslocamentoPx > FOLGA_TOQUE_INV) return 'arrastar';
  if (d.duracaoMs >= TEMPO_TOQUE_LONGO) return 'longo';
  if (d.mesmoSlot && d.desdeUltimoMs <= JANELA_TOQUE_DUPLO) return 'duplo';
  return 'simples';
}

export type AcaoSlot = { botao: 'esquerdo' | 'direito'; shift: boolean };

/**
 * Ações de clique equivalentes a cada gesto de toque.
 * O toque simples já pegou/soltou (clique esquerdo); no duplo, o segundo toque desfaz
 * o primeiro (outro clique esquerdo) e faz o Shift+clique. No slot de resultado da
 * criação não há como desfazer (fabricaria de novo): vai direto ao Shift+clique.
 */
export function acoesDoGesto(g: GestoInventario, semDesfazer = false): AcaoSlot[] {
  const esq: AcaoSlot = { botao: 'esquerdo', shift: false };
  if (g === 'simples') return [esq];
  if (g === 'longo') return [{ botao: 'direito', shift: false }];
  if (g === 'duplo')
    return semDesfazer ? [{ ...esq, shift: true }] : [esq, { ...esq, shift: true }];
  return [];
}

/**
 * Arrastar e soltar: o que fazer ao soltar sobre outro slot.
 * Se o cursor estava vazio no início, primeiro pega do slot de origem e depois solta no destino.
 */
export function acoesDeArrastar(
  cursorVazioNoInicio: boolean,
  origemJaAgiu: boolean,
): ('origem' | 'destino')[] {
  return cursorVazioNoInicio && !origemJaAgiu ? ['origem', 'destino'] : ['destino'];
}
