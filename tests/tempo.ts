/**
 * Spec 034 (T14): tempo medido de um jeito estável nos testes de desempenho. A máquina ocupada
 * (a suíte inteira em paralelo, a nuvem sem placa de vídeo) só soma tempo a uma rodada; o
 * melhor de algumas rodadas mede o código, e uma lentidão de verdade (conta a mais, cache que
 * não guarda) pesa em todas elas. Os tetos de cada teste têm folga medida em 20 rodadas da
 * suíte com a máquina cheia (o registro está na Situação da spec 034).
 */
export function melhorDe(rodadas: number, medir: () => number): number {
  let melhor = Infinity;
  for (let i = 0; i < rodadas; i++) melhor = Math.min(melhor, medir());
  return melhor;
}

/** Milissegundos de uma chamada (para `melhorDe`). */
export function cronometrar(f: () => void): number {
  const t0 = performance.now();
  f();
  return performance.now() - t0;
}
