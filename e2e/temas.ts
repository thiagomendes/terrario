/**
 * A lista única dos temas para os testes de tela (spec 013, lição 8): id e nome, na ordem dos
 * cartões (a do registro em `src/temas/index.ts`). Um teste de unidade
 * (`tests/temas/listaE2e.test.ts`) confere que ela é igual ao registro, então um tema novo que
 * não entrar aqui quebra o teste em vez de ficar de fora das capturas.
 */
export const TEMAS_E2E = [
  ['vila-neon', 'Vila Neon'],
  ['noite-das-fantasias', 'Noite das Fantasias'],
  ['cidade-grande', 'Cidade Grande'],
  ['rancho-alegre', 'Rancho Alegre'],
  ['doce-reino', 'Doce Reino'],
  ['exploracao-lunar', 'Exploração Lunar'],
] as const;

export type IdTemaE2e = (typeof TEMAS_E2E)[number][0];

/** Só os ids, na ordem dos cartões. */
export const IDS_TEMAS: readonly IdTemaE2e[] = TEMAS_E2E.map(([id]) => id);

/** O tema padrão (o primeiro cartão; spec 034: a Vila Neon). */
export const TEMA_PADRAO_E2E: IdTemaE2e = 'vila-neon';

/**
 * Spec 034: todos os temas são "outros" (nenhum é mais a base do Bruma e Luz, que saiu do
 * jogo): em todos vale conferir que não sobrou nome dele.
 */
export const OUTROS_TEMAS = TEMAS_E2E;

/** Filtra pela variável de ambiente (`<id>,<id>`); vazia ou "1" devolve todos. */
export function temasPedidos(pedido: string | undefined): IdTemaE2e[] {
  if (!pedido || pedido === '1') return [...IDS_TEMAS];
  const ids = pedido.split(',');
  return IDS_TEMAS.filter((id) => ids.includes(id));
}
