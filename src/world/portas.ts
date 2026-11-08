import { Bloco } from './blocks';

/**
 * Portas e porteiras: o que abre e fecha com o "usar". A mesma regra serve à previsão do
 * cliente e ao núcleo (spec 013), para a porteira não piscar nem ser desfeita.
 */

/** Meia porta (fechada ou aberta). A porta tem duas metades; a porteira, uma só. */
export function ehPorta(b: number): boolean {
  return b === Bloco.PORTA || b === Bloco.PORTA_ABERTA;
}

/** Porteira do curral (fechada ou aberta). */
export function ehPorteira(b: number): boolean {
  return b === Bloco.PORTEIRA || b === Bloco.PORTEIRA_ABERTA;
}

/** Abre e fecha com o "usar" (clique direito ou toque). */
export function abreEFecha(b: number): boolean {
  return ehPorta(b) || ehPorteira(b);
}

/** O bloco depois de usar: fechada abre, aberta fecha. O metadado (a direção) fica igual. */
export function alternado(b: number): number {
  switch (b) {
    case Bloco.PORTA:
      return Bloco.PORTA_ABERTA;
    case Bloco.PORTA_ABERTA:
      return Bloco.PORTA;
    case Bloco.PORTEIRA:
      return Bloco.PORTEIRA_ABERTA;
    case Bloco.PORTEIRA_ABERTA:
      return Bloco.PORTEIRA;
    default:
      return b;
  }
}
