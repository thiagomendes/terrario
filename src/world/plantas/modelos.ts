/**
 * Os modelos de prédio que o planejador da cidade escolhe por lote (spec 014). A T04 traz os
 * cinco; até lá, os lotes de 16 são duas geminadas lado a lado.
 */
import { casaGeminada } from './geminada';
import { plantaVazia, type ParametrosPredio, type Planta } from './formato';

export type ModeloPredio = 'geminada' | 'tijolo' | 'deco' | 'escola' | 'alto';

export function construirModelo(
  modelo: ModeloPredio,
  params: ParametrosPredio,
  largura: number,
): Planta {
  void modelo;
  const a = casaGeminada({ ...params, andares: Math.min(4, params.andares) });
  if (largura === a.largura) return a;
  // dois lado a lado (o de lá espelhado)
  const b = casaGeminada({
    ...params,
    andares: Math.min(4, params.andares),
    espelho: !params.espelho,
  });
  const p = plantaVazia(a.modelo, largura, a.profundidade, Math.max(a.altura, b.altura), params);
  for (const [q, ds] of [
    [a, 0],
    [b, a.largura],
  ] as const)
    for (let y = 0; y < q.altura; y++)
      for (let f = 0; f < q.profundidade; f++)
        for (let s = 0; s < q.largura; s++) {
          const i = (y * q.profundidade + f) * q.largura + s;
          const j = (y * p.profundidade + f) * p.largura + s + ds;
          p.blocos[j] = q.blocos[i];
          p.metas[j] = q.metas[i];
        }
  p.porta = a.porta;
  p.terraco = a.terraco;
  p.comodos = a.comodos;
  return p;
}
