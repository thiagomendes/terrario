/**
 * O `public/sons/indice.json` (spec 019) é um só para a música e as vozes: baixa e lê uma vez
 * por endereço, com prioridade baixa (nunca disputa a rede com o mundo). Falhou, esquece, para
 * a próxima tentativa buscar de novo.
 */

const lidos = new Map<string, Promise<unknown>>();

/** O JSON do índice (null se não deu: sem rede, sem o arquivo ou inválido). */
export function lerIndiceSons(url: string): Promise<unknown> {
  let p = lidos.get(url);
  if (!p) {
    p = fetch(url, { priority: 'low' } as RequestInit)
      .then((r) => (r.ok ? (r.json() as Promise<unknown>) : null))
      .catch(() => null)
      .then((j) => {
        if (j === null || j === undefined) {
          if (lidos.get(url) === p) lidos.delete(url);
          return null;
        }
        return j;
      });
    lidos.set(url, p);
  }
  return p;
}

/** Para os testes: esquece o índice já lido. */
export function esquecerIndiceSons(): void {
  lidos.clear();
}
