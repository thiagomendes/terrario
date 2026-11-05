export interface ChaveChunk {
  cx: number;
  cz: number;
}

export function chave(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

/** Chunks dentro do raio (em chunks) ao redor do centro, do mais próximo ao mais distante. */
export function chunksDesejados(cx: number, cz: number, raio: number): ChaveChunk[] {
  const lista: (ChaveChunk & { d: number })[] = [];
  for (let dz = -raio; dz <= raio; dz++) {
    for (let dx = -raio; dx <= raio; dx++) {
      const d = dx * dx + dz * dz;
      if (d <= raio * raio) lista.push({ cx: cx + dx, cz: cz + dz, d });
    }
  }
  lista.sort((a, b) => a.d - b.d);
  return lista.map(({ cx: x, cz: z }) => ({ cx: x, cz: z }));
}

export interface Plano {
  carregar: ChaveChunk[];
  descartar: string[];
}

/** Separa o que falta carregar (desejado e ausente) do que deve sair (presente e não desejado). */
export function planejar(presentes: Iterable<string>, desejados: ChaveChunk[]): Plano {
  const existentes = new Set(presentes);
  const queridos = new Set(desejados.map((c) => chave(c.cx, c.cz)));
  const carregar = desejados.filter((c) => !existentes.has(chave(c.cx, c.cz)));
  const descartar = [...existentes].filter((k) => !queridos.has(k));
  return { carregar, descartar };
}

/** Uma resposta é obsoleta se a versão ficou para trás ou o chunk já foi descartado. */
export function respostaObsoleta(
  versaoPedido: number,
  versaoAtual: number,
  descartado: boolean,
): boolean {
  return descartado || versaoPedido < versaoAtual;
}

/** Retira da fila no máximo `limite` itens para aplicar neste quadro. */
export function aplicarPorQuadro<T>(fila: T[], limite: number): T[] {
  return fila.splice(0, Math.max(0, limite));
}
