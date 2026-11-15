/**
 * Vila Neon: pintores dos tiles (spec 026). A base é a do Rancho Alegre (madeira, pedra e
 * ferramentas de brinquedo), com o chão do bairro: grama verde forte de gramado de quintal,
 * terra marrom de canteiro e o paralelepípedo da rua de trás. Os blocos que só o bairro tem
 * já têm o desenho próprio em `src/art/atlas.ts` (T02); dos blocos de rua que ele divide com a
 * Cidade Grande, repinta só o que pede a cara dos anos 80: os toldos listrados de duas cores
 * (vermelho e branco, azul e branco) e o globo do poste mais quentinho.
 */
import { hash2 } from '../../world/noise';
import { fbmT, ladoComTopo, rampa } from '../../art/atlas';
import type { Pintor } from '../tipos';
import { PINTORES_RANCHO } from '../rancho-alegre/pintores';

const GRAMA = ['#3c9a32', '#46a63a', '#50b142', '#5abd4a'];
const TERRA = ['#5a3e2c', '#664834', '#72523c', '#7e5c44'];

/** Gramado do bairro: verde forte e cheio, com um trevinho mais claro aqui e ali. */
const gramado: Pintor = (x, y, s) => {
  const r = hash2(x, y, s + 5);
  if (r > 0.99) return rampa(['#fff3c8'], 0, x, y, s);
  if (r > 0.95) return rampa(['#7acc5a'], 0, x, y, s);
  return rampa(GRAMA, fbmT(x, y, 4, s) * 0.5 + hash2(x, y, s) * 0.5, x, y, s);
};

/** Terra marrom de canteiro de quintal. */
const terraQuintal: Pintor = (x, y, s) => {
  const r = hash2(x, y, s + 3);
  if (r > 0.95) return rampa(['#9a7a5a'], 0, x, y, s);
  return rampa(TERRA, fbmT(x, y, 4, s) * 0.45 + hash2(x, y, s) * 0.55, x, y, s);
};

const gramadoLado = ladoComTopo(
  (x, y, s) => rampa(GRAMA, 0.3 + hash2(x, y, s) * 0.7, x, y, s),
  terraQuintal,
  '#2f7e28',
  2,
);

/** Paralelepípedo da rua de trás: pedrinhas cinza-quente em fileiras desencontradas. */
const paralelepipedo: Pintor = (x, y, s) => {
  const fila = y >> 2;
  const dx = (x + (fila & 1) * 2) & 3;
  if ((y & 3) === 3 || dx === 3) return rampa(['#5e5a58'], 0, x, y, s);
  const pedra = Math.floor((x + (fila & 1) * 2) / 4) + fila * 5;
  return rampa(
    ['#8e8a86', '#9a9692', '#a6a29e', '#b2aeaa'],
    hash2(pedra, fila, s + 11) * 0.6 + hash2(x, y, s) * 0.4,
    x,
    y,
    s,
  );
};

/** Toldo listrado de duas cores, listras largas de 4 (nunca mais de duas cores). */
const toldo =
  (a: string, b: string): Pintor =>
  (x, y, s) =>
    (x >> 2) % 2 === 0 ? rampa([a], hash2(x, y, s), x, y, s) : rampa([b], hash2(x, y, s), x, y, s);

/** Poste: o globo de luz quentinha (amarelo de lâmpada antiga) em cima da haste grafite. */
const poste: Pintor = (x, y, s) =>
  Math.hypot(x - 7.5, y - 5) < 4.2
    ? rampa(['#ffd77a', '#ffe08e'], hash2(x, y, s), x, y, s)
    : rampa(['#2e2d36', '#36353f'], hash2(x, y, s), x, y, s);

export const PINTORES_VILA: Record<string, Pintor> = {
  ...PINTORES_RANCHO,
  grama_topo: gramado,
  grama_lado: gramadoLado,
  terra: terraQuintal,
  pedregulho: paralelepipedo,
  toldo_vermelho: toldo('#e8302a', '#f6f4ee'),
  toldo_verde: toldo('#2f8cff', '#f6f4ee'),
  poste,
};

/** Só os quadrados rosa da pista acendem (o grafite fica apagado). */
export const MASCARAS_VILA: Record<string, (x: number, y: number) => boolean> = {
  pista_neon: (x, y) => (x & 7) !== 7 && (y & 7) !== 7 && ((x >> 3) + (y >> 3)) % 2 === 0,
};
