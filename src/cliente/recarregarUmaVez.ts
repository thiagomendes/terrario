/**
 * Spec 035: depois das 2 ressincronizações, a página recarrega uma vez. Uma marca no
 * `sessionStorage`, por código de sala, impede um segundo recarregar em 10 min. Sem o
 * `sessionStorage` (ou com ele dando erro) não recarrega: sem a marca, não há como garantir que
 * não vira laço. Sem DOM, para ter teste de unidade.
 */
export const MARCA_RECARREGOU = 'terrario:recarregou:';
export const ESPERA_RECARREGAR_MS = 10 * 60_000;

/** Pode recarregar agora? Se pode, já deixa a marca. */
export function podeRecarregar(
  armazem: () => Pick<Storage, 'getItem' | 'setItem'> | null | undefined,
  codigo: string,
  agora: number,
): boolean {
  try {
    const s = armazem();
    if (!s) return false;
    const chave = MARCA_RECARREGOU + codigo;
    const antes = Number(s.getItem(chave));
    if (s.getItem(chave) !== null && Number.isFinite(antes) && agora - antes < ESPERA_RECARREGAR_MS)
      return false;
    s.setItem(chave, String(agora));
    // a marca tem de ter ficado: senão, o próximo recarregar não a veria
    return s.getItem(chave) === String(agora);
  } catch {
    return false;
  }
}

/** O mesmo endereço, direto no mundo (quem entrou pelo link não vê o cartão de novo). */
export function enderecoDireto(href: string): string {
  const url = new URL(href);
  url.searchParams.set('direto', '1');
  return url.toString();
}
