import { Bloco, obterBloco } from '../world/blocks';
import { ALTURA, TAM_X, TAM_Z } from '../world/chunk';

export type Rgb = [number, number, number];

/** Topo visível de uma coluna: primeiro bloco não-ar de cima para baixo (plantas e cruz ignoradas). */
export function topoDaColuna(ler: (y: number) => number): {
  bloco: number;
  y: number;
  agua: number;
} {
  let agua = 0;
  for (let y = ALTURA - 1; y >= 0; y--) {
    const b = ler(y);
    if (b === Bloco.AR) continue;
    if (b === Bloco.AGUA) {
      agua++;
      continue;
    }
    const d = obterBloco(b);
    if (d?.planta) continue;
    return { bloco: b, y, agua };
  }
  return { bloco: Bloco.AR, y: 0, agua };
}

/** Cor da coluna no mapa: cor do bloco com relevo (luz do noroeste) e água por profundidade. */
export function corDaColuna(base: Rgb, y: number, yNoroeste: number, agua: number): Rgb {
  const relevo = Math.max(-0.25, Math.min(0.25, (y - yNoroeste) * 0.09));
  // cores de brinquedo: um pouco mais claras e limpas que as do bloco
  const claro = (v: number) => v * 0.86 + 34;
  let c: Rgb = [
    claro(base[0]) * (1 + relevo),
    claro(base[1]) * (1 + relevo),
    claro(base[2]) * (1 + relevo),
  ];
  if (agua > 0) {
    const f = Math.min(0.85, 0.5 + agua * 0.04);
    const azul: Rgb = [84, 160, 230];
    c = [c[0] + (azul[0] - c[0]) * f, c[1] + (azul[1] - c[1]) * f, c[2] + (azul[2] - c[2]) * f];
  }
  return [
    Math.round(Math.min(255, c[0])),
    Math.round(Math.min(255, c[1])),
    Math.round(Math.min(255, c[2])),
  ];
}

export interface Marcador {
  id: number;
  nome: string;
  x: number;
  z: number;
  cor: string;
}

export const CORES_MARCADOR = ['#ffd36a', '#7cf2e6', '#ff7a8a', '#9fe36a', '#c49aff', '#ffffff'];

/** Ângulo (rad) do jogador até o marcador, relativo ao olhar (0 = em frente). */
export function anguloRelativo(
  jx: number,
  jz: number,
  yaw: number,
  mx: number,
  mz: number,
): number {
  const a = Math.atan2(mx - jx, mz - jz) - yaw;
  return Math.atan2(Math.sin(a), Math.cos(a));
}

export const TAMANHO_CHUNK_MAPA = TAM_X * TAM_Z;
