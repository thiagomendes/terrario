/**
 * Os cinco modelos de prédio que o planejador da cidade escolhe por lote (spec 014): a casa
 * geminada de pedra marrom e o prédio de tijolo com loja (lotes de 8), a esquina art déco, o
 * prédio alto do centro e a escola (lotes de 16).
 */
import { casaGeminada } from './geminada';
import { predioDeTijolo } from './tijolo';
import { predioLargo } from './largo';
import type { ParametrosPredio, Planta } from './formato';

export type ModeloPredio = 'geminada' | 'tijolo' | 'deco' | 'escola' | 'alto';

/** Largura do lote de cada modelo. */
export const LARGURA_DO_MODELO: Record<ModeloPredio, number> = {
  geminada: 8,
  tijolo: 8,
  deco: 16,
  alto: 16,
  escola: 16,
};

export function construirModelo(modelo: ModeloPredio, params: ParametrosPredio): Planta {
  switch (modelo) {
    case 'geminada':
      return casaGeminada(params);
    case 'tijolo':
      return predioDeTijolo(params);
    default:
      return predioLargo(modelo, params);
  }
}
