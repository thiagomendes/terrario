/**
 * O apelido passado a limpo (spec 010): o aparelho limpa ao escrever e o servidor e o núcleo
 * limpam de novo o que chega (vai para os avisos dos outros e para o Storage).
 */

/** Tamanho máximo do apelido (cabe "Exploradora da Cidade"). */
export const MAX_APELIDO = 22;

/** Apelido: até 22 letras, sem nada estranho. */
export function limparApelido(texto: string): string {
  return texto
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_APELIDO);
}
