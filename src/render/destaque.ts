import type { Cor } from './atmosfera';

export type Ponto = readonly [number, number, number];
export type Aresta = readonly [Ponto, Ponto];

/** Âmbar claro do contorno do bloco apontado. */
export const COR_DESTAQUE: Cor = [1, 0.8, 0.35];

export const MARGEM_DESTAQUE = 0.004;

/** Caixa local do bloco (x0, y0, z0, x1, y1, z1) em 0..1; padrão: o cubo inteiro. */
export type CaixaLocal = readonly [number, number, number, number, number, number];
export const CUBO: CaixaLocal = [0, 0, 0, 1, 1, 1];

/**
 * As 12 arestas da caixa do bloco (x, y, z) — o cubo ou a forma real (laje, tocha,
 * planta) — expandida por `margem` para evitar z-fighting.
 */
export function arestasDoBloco(
  x: number,
  y: number,
  z: number,
  margem = MARGEM_DESTAQUE,
  caixa: CaixaLocal = CUBO,
): Aresta[] {
  const x0 = x + caixa[0] - margem;
  const x1 = x + caixa[3] + margem;
  const y0 = y + caixa[1] - margem;
  const y1 = y + caixa[4] + margem;
  const z0 = z + caixa[2] - margem;
  const z1 = z + caixa[5] + margem;
  return [
    [
      [x0, y0, z0],
      [x1, y0, z0],
    ],
    [
      [x0, y1, z0],
      [x1, y1, z0],
    ],
    [
      [x0, y0, z1],
      [x1, y0, z1],
    ],
    [
      [x0, y1, z1],
      [x1, y1, z1],
    ],
    [
      [x0, y0, z0],
      [x0, y1, z0],
    ],
    [
      [x1, y0, z0],
      [x1, y1, z0],
    ],
    [
      [x0, y0, z1],
      [x0, y1, z1],
    ],
    [
      [x1, y0, z1],
      [x1, y1, z1],
    ],
    [
      [x0, y0, z0],
      [x0, y0, z1],
    ],
    [
      [x1, y0, z0],
      [x1, y0, z1],
    ],
    [
      [x0, y1, z0],
      [x0, y1, z1],
    ],
    [
      [x1, y1, z0],
      [x1, y1, z1],
    ],
  ];
}

export interface EstadoDestaque {
  visivel: boolean;
  chave: string;
  arestas: Aresta[];
}

/** Decide se o contorno aparece e onde, a partir do alvo (ou null). */
export function estadoDestaque(
  alvo: { x: number; y: number; z: number } | null,
  caixa: CaixaLocal = CUBO,
): EstadoDestaque {
  if (!alvo) return { visivel: false, chave: '', arestas: [] };
  return {
    visivel: true,
    chave: `${alvo.x},${alvo.y},${alvo.z}:${caixa.join(',')}`,
    arestas: arestasDoBloco(alvo.x, alvo.y, alvo.z, MARGEM_DESTAQUE, caixa),
  };
}

function luminanciaLinear(c: Cor): number {
  const lin = c.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

export function razaoContraste(a: Cor, b: Cor): number {
  const la = luminanciaLinear(a);
  const lb = luminanciaLinear(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
