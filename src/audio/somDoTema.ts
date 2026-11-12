/**
 * De que tema vêm a trilha e as vozes gravadas de cada tema. A Cidade Grande (spec 014) usa
 * as do Rancho Alegre até ganhar as dela (T09), como no esboço aprovado.
 */
const PROVISORIO: Readonly<Record<string, string>> = { 'cidade-grande': 'rancho-alegre' };

export function temaDoSom(temaId: string): string {
  return PROVISORIO[temaId] ?? temaId;
}
