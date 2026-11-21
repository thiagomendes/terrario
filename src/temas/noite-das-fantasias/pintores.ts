/**
 * Noite das Fantasias: pintores dos tiles (spec 027). A base é a do Rancho Alegre (madeira,
 * pedra e ferramentas de brinquedo, como a Vila Neon), com o chão e as copas da festa, do esboço
 * aprovado: o gramado verde-oliva com folhinhas laranja caídas, a terra marrom de canteiro, as
 * copas oliva, cobre e douradas do bosque, a lanterna de vidro morno e o lampião de abóbora de
 * olhos redondos e sorriso de festa (nunca o olho triangular de cara brava).
 *
 * Os blocos que só este mundo tem (117 em diante) têm o desenho na base (`src/art/atlas.ts`),
 * como os da Vila Neon: os outros temas não os mostram.
 */
import { hash2 } from '../../world/noise';
import { T, fbmT, folhasDe, ladoComTopo, rampa } from '../../art/atlas';
import type { Pintor } from '../tipos';
import { PINTORES_RANCHO } from '../rancho-alegre/pintores';

/** Gramado verde-oliva, com folhinhas laranja caídas aqui e ali. */
const OLIVA = ['#4c5428', '#545c2c', '#5c6430', '#646c34'];
const gramado: Pintor = (x, y, s) => {
  const r = hash2(x, y, s + 5);
  if (r > 0.988) return rampa(['#e8892c', '#f0a040'], hash2(x, y, s + 1), x, y, s);
  if (r > 0.965) return rampa(['#7c9a48'], 0, x, y, s);
  return rampa(OLIVA, fbmT(x, y, 4, s) * 0.45 + hash2(x, y, s) * 0.45 + 0.05, x, y, s);
};
const TERRA = ['#5a3e2c', '#664834', '#72523c', '#7e5c44'];
const terra: Pintor = (x, y, s) =>
  rampa(TERRA, fbmT(x, y, 4, s) * 0.45 + hash2(x, y, s) * 0.55, x, y, s);

/** A lanterna de vidro morno: a armação roxa-escura e a luz amarela de vela. */
const armacao = (x: number, y: number) =>
  x <= 1 || x >= T - 2 || y <= 1 || y >= T - 2 || x === 7 || x === 8;
const lanterna: Pintor = (x, y, s) => {
  if (armacao(x, y)) return rampa(['#3a2a4c', '#46345a'], hash2(x, y, s), x, y, s);
  const d = Math.hypot(x - 7.5, y - 8) / 7;
  return rampa(['#ffe9a0', '#ffd46a', '#ffbe48'], d + hash2(x, y, s) * 0.2, x, y, s);
};

/** O rosto do lampião de abóbora: olhos redondos e o sorriso de festa (nada de dente). */
export const olhoRosto = (x: number, y: number) =>
  y >= 4 &&
  y <= 6 &&
  ((x >= 3 && x <= 5) || (x >= 10 && x <= 12)) &&
  !(y === 4 && (x === 3 || x === 5 || x === 10 || x === 12));
export const bocaRosto = (x: number, y: number) =>
  (y === 9 && (x === 3 || x === 12)) || (y === 10 && x >= 4 && x <= 11) || (y === 11 && x >= 5 && x <= 10);
const casca: Pintor = (x, y, s) =>
  rampa(
    x % 4 === 1 ? ['#c8621a', '#d26c1e'] : ['#f08a24', '#f6962e', '#fca23a'],
    hash2(x, y, s) * 0.6 + fbmT(x, y, 2, s) * 0.4,
    x,
    y,
    s,
  );
const aboboraRosto: Pintor = (x, y, s) =>
  olhoRosto(x, y) || bocaRosto(x, y)
    ? rampa(['#ffd860', '#ffe58a'], hash2(x, y, s), x, y, s)
    : casca(x, y, s);

export const PINTORES_FANTASIAS: Record<string, Pintor> = {
  ...PINTORES_RANCHO,
  grama_topo: gramado,
  grama_lado: ladoComTopo(
    (x, y, s) => rampa(OLIVA, 0.3 + hash2(x, y, s) * 0.7, x, y, s),
    terra,
    '#3c5822',
    4,
  ),
  terra,
  // as copas: oliva na beira, cobre e douradas no bosque (claras o bastante para de noite não
  // virarem mancha escura); as folhas laranja (o bloco só daqui) ficam com o laranja vivo
  folhas: folhasDe(['#56762e', '#608234', '#6a8e3a', '#76983f', '#82a246'], 0.13),
  folhas_outono: folhasDe(['#9a3e1c', '#a8481e', '#b65424', '#c2602a', '#cc6e32'], 0.15),
  folhas_betula: folhasDe(['#b8782a', '#c48632', '#d0943a', '#daa244'], 0.15),
  lanterna,
  abobora_lado: casca,
  abobora_rosto: aboboraRosto,
};

/** Só o rosto do lampião acende (a casca não brilha). */
export const MASCARAS_FANTASIAS: Record<string, (x: number, y: number) => boolean> = {
  abobora_rosto: (x, y) => olhoRosto(x, y) || bocaRosto(x, y),
};
