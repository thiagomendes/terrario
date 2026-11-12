/**
 * Cidade Grande: pintores dos tiles (spec 014, T08). A base é a do Rancho Alegre (madeira,
 * pedra e ferramentas de brinquedo), com o chão de cidade: grama de parque aparada (listras
 * de cortador), terra marrom-escura de canteiro e o paralelepípedo cinza.
 * Os blocos que só a cidade tem já têm o desenho próprio em `src/art/tiles.ts` (T02).
 */
import { hash2 } from '../../world/noise';
import { fbmT, ladoComTopo, rampa } from '../../art/atlas';
import type { Pintor } from '../tipos';
import { PINTORES_RANCHO } from '../rancho-alegre/pintores';

const GRAMA = ['#4a9a3e', '#55a646', '#60b14e', '#6cbb57'];
const TERRA = ['#5e4634', '#6a503c', '#765a44', '#82644c'];

/** Grama de parque aparada: listras largas, claras e escuras, como as do cortador. */
const gramaParque: Pintor = (x, y, s) => {
  const listra = ((y >> 2) & 1) === 0 ? 0.18 : 0;
  const r = hash2(x, y, s + 5);
  if (r > 0.988) return rampa(['#fff3c8'], 0, x, y, s);
  return rampa(GRAMA, listra + fbmT(x, y, 4, s) * 0.4 + hash2(x, y, s) * 0.4, x, y, s);
};

/** Terra marrom de canteiro de praça. */
const terraCanteiro: Pintor = (x, y, s) => {
  const r = hash2(x, y, s + 3);
  if (r > 0.95) return rampa(['#9a7a5a'], 0, x, y, s);
  return rampa(TERRA, fbmT(x, y, 4, s) * 0.45 + hash2(x, y, s) * 0.55, x, y, s);
};

const gramaLado = ladoComTopo(
  (x, y, s) => rampa(GRAMA, 0.3 + hash2(x, y, s) * 0.7, x, y, s),
  terraCanteiro,
  '#3e7e32',
  2,
);

/** Paralelepípedo: pedrinhas cinza em fileiras desencontradas. */
const paralelepipedo: Pintor = (x, y, s) => {
  const fila = y >> 2;
  const dx = (x + (fila & 1) * 2) & 3;
  const junta = (y & 3) === 3 || dx === 3;
  if (junta) return rampa(['#5c5a5e'], 0, x, y, s);
  const pedra = Math.floor((x + (fila & 1) * 2) / 4) + fila * 5;
  return rampa(
    ['#8a8890', '#96949c', '#a2a0a6', '#aeacb2'],
    hash2(pedra, fila, s + 11) * 0.6 + hash2(x, y, s) * 0.4,
    x,
    y,
    s,
  );
};

export const PINTORES_CIDADE: Record<string, Pintor> = {
  ...PINTORES_RANCHO,
  grama_topo: gramaParque,
  grama_lado: gramaLado,
  terra: terraCanteiro,
  pedregulho: paralelepipedo,
};
