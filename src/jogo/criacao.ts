/**
 * Criação de bichos (spec 013): a comida de cada papel, quem segue quem e os números da
 * criação, iguais em todo tema (o tema só troca os nomes). O núcleo confere com estas
 * regras e o cliente usa as mesmas para as dicas e o toque (uma regra só).
 */
import type { TipoSer } from './criaturas';

/** Comida de cada papel. Peixe, criatura da noite e moradores não comem da mão. */
export const COMIDA_DOS_BICHOS: Partial<Record<TipoSer, readonly string[]>> = {
  cervo: ['trigo'],
  coelho: ['semente_trigo', 'semente_milho', 'semente_abobora'],
  // a raposa continua sendo domada com frutinhas (comando `domar`)
  raposa: ['frutinhas'],
};

/**
 * Spec 014: a comida que doma o papel raposa no mundo (o tema diz, `EstiloMundo.domar`): sem o
 * campo, frutinhas; na Cidade Grande, peixe (fresco ou assado). A mesma regra no núcleo e no
 * cliente (dica, toque e o bicho que segue quem segura a comida).
 */
export function comidaDeDomar(domar?: 'frutinhas' | 'peixe'): readonly string[] {
  return domar === 'peixe' ? COMIDA_DOMAR_PEIXE : COMIDA_DOMAR_FRUTINHAS;
}
const COMIDA_DOMAR_FRUTINHAS: readonly string[] = ['frutinhas'];
const COMIDA_DOMAR_PEIXE: readonly string[] = ['peixe_cru', 'peixe_assado'];

/** O item doma a raposa (o gato de rua na cidade) neste mundo? */
export function domaCom(
  domar: 'frutinhas' | 'peixe' | undefined,
  item: string | null | undefined,
): boolean {
  return !!item && comidaDeDomar(domar).includes(item);
}

/** Papéis que viram bicho criado ao ganhar comida (a raposa é domada, à parte). */
export const PAPEIS_CRIADOS: readonly TipoSer[] = ['cervo', 'coelho'];

/** Quem segura a comida a até tantos blocos é seguido. */
export const RAIO_ATRAIR = 8;
/** Já seguindo, o bicho só desiste além disto (andar rápido não o perde de vista). */
export const RAIO_SEGUIR = 12;
/** O bicho que segue para a uns tantos blocos de quem segura a comida. */
export const PARA_SEGUINDO = 2;
/** O bicho criado passeia até tantos blocos da casa dele. */
export const RAIO_CASA = 6;
/** Bichos criados por mundo (celular e servidor). */
export const LIMITE_CRIADOS = 24;
/** A galinha criada bota um ovo a cada tantos segundos, mais ou menos. */
export const SEGUNDOS_OVO = 300;

export const AVISO_LIMITE = 'Já tem bicho demais por aqui. Que tal um curral?';

/** O item serve de comida para este bicho? */
export function comeEsse(tipo: TipoSer, item: string | null | undefined): boolean {
  return !!item && !!COMIDA_DOS_BICHOS[tipo]?.includes(item);
}

/** Este bicho vira criado ao ganhar comida (vaca e galinha do Rancho, em todo tema)? */
export function viraCriado(tipo: TipoSer): boolean {
  return PAPEIS_CRIADOS.includes(tipo);
}

/** Este bicho bota ovo quando criado? */
export function botaOvo(tipo: TipoSer): boolean {
  return tipo === 'coelho';
}

/**
 * Primeira espera até o ovo: em volta de 5 minutos, diferente para cada bicho (sem sorteio:
 * sai do lugar da casa, para não mexer em nenhum gerador).
 */
export function primeiraEsperaOvo(casaX: number, casaZ: number): number {
  const h = Math.abs(
    Math.imul(Math.floor(casaX) | 0, 73856093) ^ Math.imul(Math.floor(casaZ) | 0, 19349663),
  );
  return SEGUNDOS_OVO * 0.8 + ((h % 1000) / 1000) * SEGUNDOS_OVO * 0.4;
}
