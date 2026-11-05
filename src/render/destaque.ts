import type { Cor } from './atmosfera';

export type Ponto = readonly [number, number, number];
export type Aresta = readonly [Ponto, Ponto];

/** Âmbar claro do contorno do bloco apontado. */
export const COR_DESTAQUE: Cor = [1, 0.8, 0.35];

export const MARGEM_DESTAQUE = 0.004;

/** As 12 arestas do cubo do bloco (x, y, z), expandido por `margem` para evitar z-fighting. */
export function arestasDoBloco(
  x: number,
  y: number,
  z: number,
  margem = MARGEM_DESTAQUE,
): Aresta[] {
  const x0 = x - margem;
  const x1 = x + 1 + margem;
  const y0 = y - margem;
  const y1 = y + 1 + margem;
  const z0 = z - margem;
  const z1 = z + 1 + margem;
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
export function estadoDestaque(alvo: { x: number; y: number; z: number } | null): EstadoDestaque {
  if (!alvo) return { visivel: false, chave: '', arestas: [] };
  return {
    visivel: true,
    chave: `${alvo.x},${alvo.y},${alvo.z}`,
    arestas: arestasDoBloco(alvo.x, alvo.y, alvo.z),
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
