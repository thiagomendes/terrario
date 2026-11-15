/**
 * A lista única dos temas para os testes de tela (spec 013, lição 8): id e nome, na ordem dos
 * cartões (a do registro em `src/temas/todos.ts`). Um teste de unidade
 * (`tests/temas/listaE2e.test.ts`) confere que ela é igual ao registro, então um tema novo que
 * não entrar aqui quebra o teste em vez de ficar de fora das capturas.
 */
export const TEMAS_E2E = [
  ['bruma-e-luz', 'Bruma e Luz'],
  ['planeta-vivo', 'Planeta Vivo'],
  ['mata-encantada', 'Mata Encantada'],
  ['doce-reino', 'Doce Reino'],
  ['era-dos-dinos', 'Era dos Dinos'],
  ['exploracao-lunar', 'Exploração Lunar'],
  ['rancho-alegre', 'Rancho Alegre'],
  ['cidade-grande', 'Cidade Grande'],
  ['vila-neon', 'Vila Neon'],
] as const;

export type IdTemaE2e = (typeof TEMAS_E2E)[number][0];

/** Só os ids, na ordem dos cartões. */
export const IDS_TEMAS: readonly IdTemaE2e[] = TEMAS_E2E.map(([id]) => id);

/** O tema base (o primeiro cartão). */
export const TEMA_BASE: IdTemaE2e = 'bruma-e-luz';

/** Os temas que não são o base. */
export const OUTROS_TEMAS = TEMAS_E2E.filter(([id]) => id !== TEMA_BASE);

/** Filtra pela variável de ambiente (`<id>,<id>`); vazia ou "1" devolve todos. */
export function temasPedidos(pedido: string | undefined): IdTemaE2e[] {
  if (!pedido || pedido === '1') return [...IDS_TEMAS];
  const ids = pedido.split(',');
  return IDS_TEMAS.filter((id) => ids.includes(id));
}
