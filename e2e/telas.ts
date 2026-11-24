/**
 * As telas de um teste (dono, 22 nov 2026): as três (celular em pé 390 × 844, deitado
 * 844 × 390 e computador 1280 × 720) só nos testes de leiaute, os que conferem posição,
 * tamanho ou corte da interface. O teste de fluxo (andar, tocar, comprar, a missão de ponta a
 * ponta) roda numa tela só, a principal: o celular em pé, que é o aparelho das crianças.
 *
 * `E2E_TELAS=todas` devolve todas, como antes (`scripts/conferir.mjs --tudo`).
 * O teste de leiaute não usa isto: repete as telas dele sempre.
 *
 * Não é um teste.
 */
declare const process: { env: Record<string, string | undefined> };

/** Com `E2E_TELAS=todas`, o regime de antes: todas as telas em todo teste. */
export const TODAS_AS_TELAS = process.env.E2E_TELAS === 'todas';

/** A tela principal pelo nome: `empe` (os palcos) ou `celular` (os testes mais antigos). */
const PELO_NOME = (t: unknown) => t === 'empe' || t === 'celular';

/**
 * As telas de um teste de fluxo: só a principal (a primeira que `principal` aceita; sem
 * nenhuma, a primeira da lista), ou todas com `E2E_TELAS=todas`.
 */
export function telasDoFluxo<T>(todas: readonly T[], principal: (t: T) => boolean = PELO_NOME): T[] {
  if (TODAS_AS_TELAS || todas.length < 2) return [...todas];
  return [todas.find(principal) ?? todas[0]];
}
