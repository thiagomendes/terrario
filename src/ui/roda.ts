/**
 * O menu de botões (spec 015): as listas (o menu da tela e os gestos), a interface de quem as
 * mostra e as teclas.
 *
 * Spec 033 (dono, 18 nov 2026): a roda em volta do boneco foi trocada pela roleta de baixo
 * (src/ui/roleta.ts), em todo mundo e aparelho. Ficam aqui as peças que as duas dividiam: o
 * item, a lista (com o pai, que vira a plaquinha "Voltar"), a interface `Roda` e as teclas.
 */

export interface ItemRoda {
  id: string;
  /** Nome curto (o do meio aparece embaixo dele; e o nome para leitores de tela). */
  nome: string;
  /** SVG do ícone (innerHTML). */
  icone: string;
  /** Tecla do computador, num selinho no botão (some no toque). */
  tecla?: string;
}

/** Uma lista que o menu mostra (troca de lista no mesmo lugar). */
export interface ListaRoda {
  itens: readonly ItemRoda[];
  aoEscolher(id: string): void;
  /** Volta para a lista de antes (a plaquinha "Voltar" e tocar fora). */
  aoVoltar?(): void;
  /** Escolher não fecha o menu (quem escolheu troca de lista). */
  manter?(id: string): boolean;
  /** O item de cima que abriu esta lista (a plaquinha "Voltar" mostra o ícone dele). */
  pai?: ItemRoda;
  /**
   * Spec 036 (T04): o item que fica no meio na primeira vez que esta lista abre (depois, ela
   * volta onde a criança deixou). Sem ele, o primeiro.
   */
  inicio?: string;
}

export interface OpcoesRoda {
  /** Nome do menu (leitores de tela). */
  rotulo: string;
  /** Abriu ou fechou (o botão que abre mostra o estado). */
  aoMudar?(aberta: boolean): void;
  /** Fecha sozinho depois de tantos segundos aberto (padrão 8). */
  fecharEm?: number;
}

export interface Roda {
  readonly elemento: HTMLElement;
  readonly aberta: boolean;
  /** A lista aberta agora. */
  readonly lista: ListaRoda | null;
  /**
   * Abre (ou troca, se já aberta) com esta lista. `focar`: aberta pelo teclado (Enter no
   * botão), o foco entra no item do meio e volta para quem tinha ao fechar.
   */
  abrir(lista: ListaRoda, focar?: boolean): void;
  /** Prepara uma lista antes (abrir não cria nada na hora). */
  preparar(lista: ListaRoda): void;
  fechar(): void;
  /** Escolhe o item da posição i da lista, como um toque. */
  escolher(i: number): void;
  descartar(): void;
}

export type AcaoTeclaRoda =
  | { acao: 'alternar' }
  | { acao: 'fechar' }
  | { acao: 'escolher'; i: number };

/**
 * O que uma tecla faz com o menu: `tecla` alterna; com ele aberto, Esc fecha e os números
 * escolhem (fechado, os números são da barra de itens e o menu não pega).
 */
export function teclaDaRoda(
  code: string,
  aberta: boolean,
  n: number,
  tecla = 'KeyG',
): AcaoTeclaRoda | null {
  if (code === tecla) return { acao: 'alternar' };
  if (!aberta) return null;
  if (code === 'Escape') return { acao: 'fechar' };
  const m = /^(?:Digit|Numpad)([0-9])$/.exec(code);
  // spec 023: com 10 gestos, o 0 é o décimo
  const i = m ? (Number(m[1]) === 0 ? 10 : Number(m[1])) : 0;
  if (m && i <= n) return { acao: 'escolher', i: i - 1 };
  return null;
}
