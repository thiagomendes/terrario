import type { IdGesto } from '../personagem/gestos';
import type { EventoSom } from './sons';

/**
 * Spec 019 (T05): os sons da interface e dos gestos. A interface (`src/ui/*`) não conhece o
 * motor de som: ela pede o som por um evento da janela (`terrario:som`) e a cena toca, se o
 * som estiver ligado. Sem cena (título, testes de unidade), o pedido não faz nada.
 */
export type SomInterface = Extract<
  EventoSom,
  | 'rodaAbrir'
  | 'rodaFechar'
  | 'mochila'
  | 'criar'
  | 'conquista'
  | 'festa'
  | 'toc'
  | 'moeda'
  | 'plim'
  | 'nivel'
  | 'vitrine'
>;

export const EVENTO_SOM_INTERFACE = 'terrario:som';

export const SONS_INTERFACE: readonly SomInterface[] = [
  'rodaAbrir',
  'rodaFechar',
  'mochila',
  'criar',
  'conquista',
  'festa',
  'toc',
  // spec 023: a moedinha, a bolinha da missão, o nível e a vitrine premium
  'moeda',
  'plim',
  'nivel',
  'vitrine',
];

export function ehSomInterface(v: unknown): v is SomInterface {
  return typeof v === 'string' && (SONS_INTERFACE as readonly string[]).includes(v);
}

/** Pede um som de interface à cena. */
export function tocarSomInterface(som: SomInterface): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENTO_SOM_INTERFACE, { detail: som }));
}

/** O som de cada gesto do jogador (spec 015): curto e macio, nunca mais alto que um passo forte. */
export const SOM_DO_GESTO: Readonly<Record<IdGesto, EventoSom>> = {
  acenar: 'aceno',
  cumprimentar: 'aceno',
  chamar: 'assobio',
  comemorar: 'brilho',
  aplaudir: 'palmas',
  dancar: 'danca',
  apontar: 'apontar',
  sentar: 'sentar',
  // spec 023: os gestos dos presentes de nível (o brilho do pulo e o aceno da reverência)
  'pulo-estrela': 'brilho',
  reverencia: 'aceno',
  roqueiro: 'danca',
};
