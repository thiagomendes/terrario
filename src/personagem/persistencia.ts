import { aparenciaPadrao, normalizarAparencia, type Aparencia } from './aparencia';

export interface Armazenamento {
  getItem(chave: string): string | null;
  setItem(chave: string, valor: string): void;
}

export const CHAVE_APARENCIA = 'terrario:aparencia';
/** Chave de antes do jogo se chamar Terrário: lida se a nova ainda não existe. */
export const CHAVE_APARENCIA_ANTIGA = 'brumaluz:aparencia';
export const VERSAO_APARENCIA = 1;

export function salvarAparencia(
  armazenamento: Armazenamento | null,
  aparencia: Aparencia,
): boolean {
  if (!armazenamento) return false;
  try {
    const dado = { versao: VERSAO_APARENCIA, aparencia: normalizarAparencia(aparencia) };
    armazenamento.setItem(CHAVE_APARENCIA, JSON.stringify(dado));
    return true;
  } catch {
    return false;
  }
}

export function carregarAparencia(armazenamento: Armazenamento | null): Aparencia {
  if (!armazenamento) return aparenciaPadrao();
  try {
    const bruto =
      armazenamento.getItem(CHAVE_APARENCIA) ?? armazenamento.getItem(CHAVE_APARENCIA_ANTIGA);
    if (typeof bruto !== 'string') return aparenciaPadrao();
    const dado: unknown = JSON.parse(bruto);
    if (typeof dado !== 'object' || dado === null) return aparenciaPadrao();
    const obj = dado as Record<string, unknown>;
    if (obj.versao !== VERSAO_APARENCIA) return aparenciaPadrao();
    return normalizarAparencia(obj.aparencia);
  } catch {
    return aparenciaPadrao();
  }
}
