import { Bloco, obterBloco } from './blocks';

/** Caixa em coordenadas locais do bloco: [x0, y0, z0, x1, y1, z1], de 0 a 1. */
export type Caixa = [number, number, number, number, number, number];

/** Direção da frente (bits 0-1 do metadado): 0 +z, 1 +x, 2 -z, 3 -x. */
export function direcaoDoMeta(meta: number): number {
  return meta & 3;
}

/** Direção para onde o jogador olha (yaw), arredondada aos 4 eixos. */
export function direcaoDoYaw(yaw: number): number {
  const sx = Math.sin(yaw);
  const sz = Math.cos(yaw);
  if (Math.abs(sz) >= Math.abs(sx)) return sz >= 0 ? 0 : 2;
  return sx >= 0 ? 1 : 3;
}

/** Vetor (dx, dz) de uma direção. */
export function vetorDirecao(d: number): [number, number] {
  return (
    [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ] as const
  )[d & 3] as [number, number];
}

function girar(c: Caixa, d: number): Caixa {
  const pts = [
    [c[0], c[2]],
    [c[3], c[5]],
  ].map(([x, z]) => {
    switch (d & 3) {
      case 1:
        return [z, 1 - x];
      case 2:
        return [1 - x, 1 - z];
      case 3:
        return [1 - z, x];
      default:
        return [x, z];
    }
  });
  return [
    Math.min(pts[0][0], pts[1][0]),
    c[1],
    Math.min(pts[0][1], pts[1][1]),
    Math.max(pts[0][0], pts[1][0]),
    c[4],
    Math.max(pts[0][1], pts[1][1]),
  ];
}

const P = 1 / 16;

/**
 * Caixas que formam o bloco (malha e colisão). `conecta(d)` diz se a cerca
 * liga na direção d. Devolve null para cubo inteiro.
 */
export function caixasDoBloco(
  id: number,
  meta: number,
  conecta?: (d: number) => boolean,
): Caixa[] | null {
  const forma = obterBloco(id)?.forma;
  const d = direcaoDoMeta(meta);
  switch (forma) {
    case 'laje':
      return [[0, 0, 0, 1, 0.5, 1]];
    case 'escada':
      // degrau de cima fica do lado para onde se sobe (direção d)
      return [[0, 0, 0, 1, 0.5, 1], girar([0, 0.5, 0.5, 1, 1, 1], d)];
    case 'cama':
      return [[0, 0, 0, 1, 9 * P, 1]];
    case 'tocha':
      return [[7 * P, 0, 7 * P, 9 * P, 10 * P, 9 * P]];
    case 'porta': {
      // fechada: painel no lado de trás (oposto à frente); aberta: gira 90 graus
      const aberta = id === Bloco.PORTA_ABERTA;
      const base: Caixa = [0, 0, 0, 1, 1, 3 * P];
      return [girar(base, aberta ? d + 1 : d)];
    }
    case 'cerca': {
      const cx: Caixa[] = [[6 * P, 0, 6 * P, 10 * P, 1, 10 * P]];
      for (let k = 0; k < 4; k++) {
        if (!conecta?.(k)) continue;
        cx.push(girar([7 * P, 6 * P, 10 * P, 9 * P, 9 * P, 1], k));
        cx.push(girar([7 * P, 12 * P, 10 * P, 9 * P, 15 * P, 1], k));
      }
      return cx;
    }
    default:
      return null;
  }
}

/** A cerca liga a outra cerca ou a um bloco opaco. */
export function cercaConecta(vizinho: number): boolean {
  if (vizinho === Bloco.CERCA) return true;
  return !!obterBloco(vizinho)?.opaco;
}

/** Bloco com forma parcial (não é cubo nem cruz). */
export function temFormaParcial(id: number): boolean {
  const f = obterBloco(id)?.forma;
  return (
    f === 'laje' ||
    f === 'escada' ||
    f === 'cama' ||
    f === 'tocha' ||
    f === 'porta' ||
    f === 'cerca'
  );
}
