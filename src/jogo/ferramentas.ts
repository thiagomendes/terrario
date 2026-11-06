import { obterBloco } from '../world/blocks';
import type { DefFerramenta } from './itens';

/** Penalidade quando falta a ferramenta exigida (mais lento e sem drop). */
export const PENALIDADE_SEM_FERRAMENTA = 1 / 3.3;

/** Multiplicador da velocidade de mineração do bloco com a ferramenta na mão. */
export function velocidadeMineracao(
  bloco: number,
  ferramenta: DefFerramenta | undefined,
  criativo: boolean,
): number {
  const def = obterBloco(bloco);
  if (!def) return 1;
  const certa = !!ferramenta && ferramenta.tipo === def.ferramenta;
  let v = certa ? ferramenta!.velocidade : 1;
  if (!criativo && def.nivelMinimo && (!certa || ferramenta!.nivel < def.nivelMinimo)) {
    v *= PENALIDADE_SEM_FERRAMENTA;
  }
  if (ferramenta?.tipo === 'espada' && def.folhas) v = 1.5;
  return v;
}

/** O bloco solta item com essa ferramenta? */
export function podeColetar(bloco: number, ferramenta: DefFerramenta | undefined): boolean {
  const def = obterBloco(bloco);
  if (!def?.nivelMinimo) return true;
  return !!ferramenta && ferramenta.tipo === def.ferramenta && ferramenta.nivel >= def.nivelMinimo;
}
