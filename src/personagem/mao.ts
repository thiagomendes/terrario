import { SLOTS } from '../player/hotbar';
import type { Pose } from './poses';

export const CAMPO_VISAO_VERTICAL = 0.8;
export const DISTANCIA_BRACO = 0.7;
/** Posição alvo do braço em coordenadas normalizadas da tela (-1 a 1). */
export const BRACO_NDC_X = 0.65;
export const BRACO_NDC_Y = -0.7;
export const TAMANHO_MINIATURA = 0.08;
export const MINIATURA_NDC_X = 0.78;
export const MINIATURA_NDC_Y = -0.5;
/** Quanto cada radiano de pose desloca o braço, em unidades do mundo. */
export const ESCALA_BALANCO = 0.03;

export interface TamanhoTela {
  largura: number;
  altura: number;
}

export interface PosicaoBraco {
  /** Posição local na câmera de visão (x direita, y cima, z frente). */
  x: number;
  y: number;
  z: number;
  /** Projeção em pixels (y para baixo). */
  tela: { x: number; y: number };
  /** Posição local da miniatura do bloco, na mesma profundidade do braço. */
  miniatura: { x: number; y: number; z: number };
  /** Retângulo do conjunto braço mais miniatura em coordenadas normalizadas. */
  extensao: { minX: number; maxX: number; minY: number; maxY: number };
}

export function blocoNaMao(slot: number): number | null {
  if (!Number.isInteger(slot) || slot < 0 || slot >= SLOTS.length) return null;
  return SLOTS[slot].bloco;
}

export function posicaoBraco(pose: Pose, tamanhoTela: TamanhoTela): PosicaoBraco {
  const aspecto = tamanhoTela.largura / tamanhoTela.altura;
  const metade = Math.tan(CAMPO_VISAO_VERTICAL / 2);
  const z = DISTANCIA_BRACO;
  const baseX = BRACO_NDC_X * z * metade * aspecto;
  const baseY = BRACO_NDC_Y * z * metade;
  const y = baseY - pose.bracoDireito * ESCALA_BALANCO + pose.tronco;
  const ndcX = baseX / (z * metade * aspecto);
  const ndcY = y / (z * metade);
  const mx = MINIATURA_NDC_X * z * metade * aspecto;
  const my = y + (MINIATURA_NDC_Y - BRACO_NDC_Y) * z * metade;
  const meiaX = (TAMANHO_MINIATURA * 0.87) / (z * metade * aspecto);
  const meiaY = (TAMANHO_MINIATURA * 0.87) / (z * metade);
  const miniNdcY = my / (z * metade);
  return {
    x: baseX,
    y,
    z,
    miniatura: { x: mx, y: my, z },
    extensao: {
      minX: Math.min(ndcX, MINIATURA_NDC_X - meiaX),
      maxX: Math.max(ndcX, MINIATURA_NDC_X + meiaX),
      minY: Math.min(ndcY, miniNdcY - meiaY),
      maxY: Math.max(ndcY, miniNdcY + meiaY),
    },
    tela: {
      x: ((ndcX + 1) / 2) * tamanhoTela.largura,
      y: ((1 - ndcY) / 2) * tamanhoTela.altura,
    },
  };
}
