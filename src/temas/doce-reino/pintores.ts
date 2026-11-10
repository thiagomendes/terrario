/**
 * Doce Reino: pintores dos tiles. Tudo é doce — bolo com glacê e granulado, massa de
 * chocolate, caramelo brilhante, biscoitos com furinhos, algodão-doce, fondant
 * acolchoado, bengalas listradas e tijolos de pão de mel com glacê branco.
 *
 * Os pintores rodam 16x16 por tile: só contas simples por pixel (nada de laço grande).
 */
import { hash2 } from '../../world/noise';
import {
  T,
  VAZIO,
  metadesDaPorta,
  bordaDaPorta,
  escurece,
  fbmT,
  hex,
  rampa,
  ruidoT,
  terraAradaDe,
  trigoDe,
  milhoDe,
  aboboreiraDe,
  fenoLadoDe,
  fenoTopoDe,
} from '../../art/atlas';
import type { Pintor, Px } from '../tipos';

const mod = (a: number, n: number) => ((a % n) + n) % n;
const PI2 = Math.PI * 2;

/** Um tom só, com o leve tremor da pixel-art. */
const cor = (c: string, x: number, y: number, s: number): Px => rampa([c], 0, x, y, s);

/** Mistura um pixel com uma cor (0 = pixel, 1 = cor). */
function mistura(p: Px, c: string, t: number): Px {
  const k = hex(c);
  return [p[0] + (k[0] - p[0]) * t, p[1] + (k[1] - p[1]) * t, p[2] + (k[2] - p[2]) * t, p[3]];
}

/** Tira a saturação (para a matriz do minério que brilha não brilhar junto). */
function apaga(p: Px, f: number): Px {
  const l = p[0] * 0.3 + p[1] * 0.55 + p[2] * 0.15;
  return [p[0] + (l - p[0]) * f, p[1] + (l - p[1]) * f, p[2] + (l - p[2]) * f, p[3]];
}

const borda = (x: number, y: number, n = 0) => x <= n || y <= n || x >= T - 1 - n || y >= T - 1 - n;

// --- paletas -----------------------------------------------------------------
const GLACE = ['#d94d86', '#e35d93', '#ec6fa1', '#f483b0', '#fa98c0'];
const GLACE_BRILHO = '#ffc6dc';
const CONFEITOS = ['#fff3a0', '#7fd6ff', '#a4f08c', '#ffffff', '#c792ff', '#ff9a5c'];
const MASSA = ['#4a2a1b', '#55311f', '#613924', '#6c412a'];
const CARAMELO = ['#b5651d', '#c27326', '#cf8331', '#da933f', '#e4a550'];
const BISCOITO = ['#c4863f', '#cf954d', '#d9a35b', '#e2b16a'];
const CHOCOLATE = ['#3c2116', '#47281a', '#53301f', '#5e3925'];
const AO_LEITE = ['#6a3b22', '#764428', '#824d2e', '#8e5734'];
const CHANTILLY = ['#efe0d2', '#f6ebe0', '#fbf4ec', '#fffbf6'];

// --- peças reutilizáveis -----------------------------------------------------

/** Granulado: um palitinho de 2 px por célula 4x4 (horizontal ou em pé). */
function granulado(
  x: number,
  y: number,
  s: number,
  chance: number,
  cores: readonly string[],
): Px | null {
  const cx = x >> 2;
  const cy = y >> 2;
  if (hash2(cx, cy, s + 500) > chance) return null;
  const px = (cx << 2) + Math.floor(hash2(cx, cy, s + 501) * 3);
  const py = (cy << 2) + Math.floor(hash2(cx, cy, s + 502) * 3);
  const emPe = hash2(cx, cy, s + 503) > 0.5;
  const liga = emPe
    ? x === px && (y === py || y === py + 1)
    : y === py && (x === px || x === px + 1);
  if (!liga) return null;
  return cor(cores[Math.floor(hash2(cx, cy, s + 504) * cores.length)], x, y, s);
}

/** Bolinhas (gotas, jujubas, confeitos) em células 8x8 com brilho no alto. */
function bolinha(
  x: number,
  y: number,
  s: number,
  raio: number,
  cel = 8,
): { d: number; id: number; dx: number; dy: number } | null {
  const n = T / cel;
  let melhor: { d: number; id: number; dx: number; dy: number } | null = null;
  // a célula do pixel e as vizinhas à direita/abaixo (as bolinhas cabem em 1 célula + raio)
  for (let j = -1; j <= 0; j++)
    for (let i = -1; i <= 0; i++) {
      const cx = mod(Math.floor(x / cel) + i, n);
      const cy = mod(Math.floor(y / cel) + j, n);
      const bx = cx * cel + 2 + hash2(cx, cy, s + 41) * (cel - 3);
      const by = cy * cel + 2 + hash2(cx, cy, s + 42) * (cel - 3);
      // distância com a volta do tile (sem costura)
      let dx = x + 0.5 - bx;
      let dy = y + 0.5 - by;
      if (dx > T / 2) dx -= T;
      if (dx < -T / 2) dx += T;
      if (dy > T / 2) dy -= T;
      if (dy < -T / 2) dy += T;
      const d = Math.hypot(dx, dy) / (raio * (0.8 + hash2(cx, cy, s + 43) * 0.4));
      if (d < 1 && (!melhor || d < melhor.d)) melhor = { d, id: cx * 7 + cy, dx, dy };
    }
  return melhor;
}

/** Glacê escorrendo: altura da calda em cada coluna (gotas arredondadas). */
function escorrido(x: number, s: number, base: number): number {
  const g = x >> 2;
  const comp = base + Math.floor(hash2(g, 0, s + 31) * 5);
  const lado = x % 4 === 0 || x % 4 === 3 ? 1 : 0;
  return Math.max(base - 1, comp - lado * (1 + Math.floor(hash2(g, 1, s + 31) * 2)));
}

/** Lado de bloco coberto (glacê, chantilly, brigadeiro) escorrendo sobre outro pintor. */
function cobertura(topo: Pintor, sombra: string, base: number, embaixo: Pintor): Pintor {
  return (x, y, s) => {
    const h = escorrido(x, s, base);
    if (y < h) return topo(x, y, s);
    if (y === h) return cor(sombra, x, y, s);
    return embaixo(x, y, s);
  };
}

// --- chão --------------------------------------------------------------------

/** Glacê de morango com granulado colorido. */
const glaceTopo: Pintor = (x, y, s) => {
  const g = granulado(x, y, s, 0.62, CONFEITOS);
  if (g) return g;
  const onda = Math.sin(((x + y * 2) * PI2) / 16 + fbmT(x, y, 2, s) * 5) * 0.5 + 0.5;
  if (onda > 0.93) return cor(GLACE_BRILHO, x, y, s);
  return rampa(GLACE, onda * 0.55 + fbmT(x, y, 4, s) * 0.45, x, y, s);
};

/** Massa de chocolate fofa com furinhos de bolo. */
const massa: Pintor = (x, y, s) => {
  const b = bolinha(x, y, s + 5, 1.3, 4);
  if (b && hash2(b.id, 7, s) > 0.55) {
    if (b.dy > 0.4) return cor('#7e5034', x, y, s);
    return cor('#2c180f', x, y, s);
  }
  if (hash2(x, y, s + 3) > 0.95) return cor('#87593a', x, y, s);
  return rampa(MASSA, fbmT(x, y, 4, s) * 0.5 + hash2(x, y, s) * 0.5, x, y, s);
};

/** Lado do bolo: glacê escorrendo, massa e uma camada de recheio cremoso. */
const glaceLado: Pintor = (x, y, s) => {
  const h = escorrido(x, s, 3);
  if (y < h) {
    if (y === 0 && hash2(x, 0, s + 2) > 0.6) return cor(GLACE_BRILHO, x, y, s);
    return rampa(GLACE, 0.3 + hash2(x, y, s) * 0.6, x, y, s);
  }
  if (y === h) return cor('#b13a6a', x, y, s);
  if (y === 11 || y === 12) return rampa(['#f6dcc8', '#fbe6d6'], hash2(x, y, s), x, y, s);
  if (y === 13) return cor('#3a2015', x, y, s);
  return massa(x, y, s);
};

/** Caramelo duro: âmbar brilhante com redemoinhos e bolhinhas de ar. */
const caramelo: Pintor = (x, y, s) => {
  const f = fbmT(x, y, 2, s + 9);
  const onda = Math.sin(((x + y) * PI2) / 8 + f * 6) * 0.5 + 0.5;
  if (onda > 0.94) return cor('#f5c97c', x, y, s);
  if (hash2(x, y, s + 4) > 0.965) return cor('#fbe2a8', x, y, s);
  const p = rampa(CARAMELO, onda * 0.45 + fbmT(x, y, 4, s) * 0.35 + hash2(x, y, s) * 0.2, x, y, s);
  return onda < 0.12 ? escurece(p, 0.84) : p;
};

/** Açúcar da praia: cristaizinhos cúbicos claros com brilho. */
const acucar: Pintor = (x, y, s) => {
  const tom = hash2(x >> 1, y >> 1, s);
  if (hash2(x, y, s + 7) > 0.93) return cor('#ffffff', x, y, s);
  const k = hash2(x >> 1, y >> 1, s + 12);
  if (k > 0.9) return cor(k > 0.95 ? '#ffb0d0' : '#b8e4ff', x, y, s);
  const p = rampa(['#ecd3d6', '#f2dcdf', '#f7e6e7', '#fbf0ef'], tom * 0.8 + 0.1, x, y, s);
  if (x % 2 === 1 && y % 2 === 1) return escurece(p, 0.9);
  if (x % 2 === 0 && y % 2 === 0) return mistura(p, '#ffffff', 0.3);
  return p;
};

// --- biscoitos e troncos -------------------------------------------------------

/** Tronco de biscoito: casca assada com furinhos de bolacha e frisos. */
const biscoitoTronco: Pintor = (x, y, s) => {
  if (x % 4 === 1 && y % 4 === 1) return cor('#7a4a1e', x, y, s);
  if (x % 4 === 1 && y % 4 === 2) return cor('#e8c288', x, y, s);
  const p = rampa(BISCOITO, ruidoT(x, y, 8, 2, s) * 0.5 + hash2(x, y, s) * 0.5, x, y, s);
  if (x % 8 === 7) return escurece(p, 0.72);
  if (x % 8 === 0) return mistura(p, '#f0cc90', 0.35);
  return p;
};

/** Furinhos e bordas de uma placa de biscoito (para as tábuas). */
function placas(cores: string[], escuro: string, alt = 4, larg = 8, furos = true): Pintor {
  return (x, y, s) => {
    const fila = Math.floor(y / alt);
    const desl = fila % 2 ? larg / 2 : 0;
    const col = Math.floor((x + desl) / larg);
    const lx = mod(x + desl, larg);
    const ly = y % alt;
    if (ly === alt - 1 || lx === 0) return cor(escuro, x, y, s);
    if (furos && ly === 1 && (lx === 2 || lx === larg - 2)) return cor(escuro, x, y, s);
    const tom = 0.92 + hash2(col, fila, s) * 0.14;
    const p = rampa(cores, hash2(x, y, s) * 0.5 + fbmT(x, y, 4, s) * 0.5, x, y, s);
    return ly === 0 ? mistura(escurece(p, tom), '#ffffff', 0.18) : escurece(p, tom);
  };
}

const placasBrancas = placas(['#f6eee8', '#faf4f0', '#ffffff'], '#c8a8a8', 4, 8, false);
const tabuasBiscoito = placas(['#cf954d', '#d9a35b', '#e2b16a', '#e9bd78'], '#8a5626');

/** Rocambole: biscoito enrolado com creme (topo do tronco de biscoito). */
const rocambole: Pintor = (x, y, s) => {
  const dx = x - 7.5;
  const dy = y - 7.5;
  const r = Math.hypot(dx, dy);
  if (r > 7.2) return rampa(['#9a6230', '#a86c36'], hash2(x, y, s), x, y, s);
  const a = Math.atan2(dy, dx) / PI2;
  const espiral = mod(r * 0.42 - a, 1);
  if (espiral < 0.4) return rampa(['#f8e8d4', '#fdf2e4'], hash2(x, y, s), x, y, s);
  return rampa(BISCOITO, hash2(x, y, s) * 0.6 + 0.2, x, y, s);
};

/** Algodão-doce em duas cores, fofinho, com furinhos. */
function algodao(c1: string[], c2: string[], buracos = 0.08): Pintor {
  return (x, y, s) => {
    const f = fbmT(x, y, 4, s + 3);
    const t = fbmT(x, y, 8, s) * 0.6 + hash2(x, y, s) * 0.4;
    if (hash2(x, y, s + 21) < buracos && t < 0.5) return VAZIO;
    const p = rampa(f > 0.5 ? c1 : c2, t, x, y, s);
    return hash2(x, y, s + 8) > 0.95 ? mistura(p, '#ffffff', 0.6) : p;
  };
}

/** Bala de goma: gotinhas brilhantes açucaradas com espaços entre elas. */
function goma(cores: string[], brilho: string, buracos = true): Pintor {
  return (x, y, s) => {
    const b = bolinha(x, y, s, 2.6, 4);
    if (!b) {
      if (buracos && hash2(x, y, s + 9) < 0.55) return VAZIO;
      return escurece(rampa(cores, 0.1, x, y, s), 0.7);
    }
    if (b.dx < -0.3 && b.dy < -0.3 && b.d > 0.35 && b.d < 0.75) return cor(brilho, x, y, s);
    if (hash2(x, y, s + 4) > 0.9) return cor('#ffffff', x, y, s);
    return rampa(cores, 1 - b.d * 0.9 + hash2(b.id, 2, s) * 0.2, x, y, s);
  };
}

// --- minérios no caramelo ------------------------------------------------------

/** Doce engastado no caramelo (gotas, jujubas, coco, favos, balas-estrela). */
function noCaramelo(pinta: (x: number, y: number, s: number) => Px | null, apagar = 0): Pintor {
  return (x, y, s) => {
    const p = pinta(x, y, s);
    if (p) return p;
    const c = caramelo(x, y, s);
    return apagar ? apaga(escurece(c, 0.8), apagar) : c;
  };
}

/** Gota de chocolate: corpo escuro, ponta e brilho. */
const gotas = noCaramelo((x, y, s) => {
  const b = bolinha(x, y, s + 70, 2.4);
  if (!b) return null;
  if (b.d > 0.82) return cor('#24130b', x, y, s);
  if (b.dx < 0 && b.dy < -0.4 && b.d < 0.6) return cor('#8a5a40', x, y, s);
  return rampa(['#2e190f', '#3a2015', '#46281a'], 1 - b.d, x, y, s);
});

/** Jujubas de laranja e de limão, açucaradas. */
const jujubas = noCaramelo((x, y, s) => {
  const b = bolinha(x, y, s + 71, 2.5);
  if (!b) return null;
  const limao = hash2(b.id, 9, s) > 0.6;
  if (hash2(x, y, s + 5) > 0.82) return cor('#fff6e0', x, y, s);
  if (b.dx < 0 && b.dy < -0.3 && b.d < 0.6) return cor(limao ? '#d8ffb0' : '#ffd0a0', x, y, s);
  if (b.d > 0.85) return cor(limao ? '#2e8a2a' : '#c0420e', x, y, s);
  return rampa(limao ? ['#4cbf3a', '#62d44a'] : ['#f0641a', '#ff7f2a'], 1 - b.d, x, y, s);
});

/** Lascas de coco: tirinhas brancas espalhadas. */
const coco = noCaramelo((x, y, s) => {
  const cx = x >> 2;
  const cy = y >> 2;
  if (hash2(cx, cy, s + 72) > 0.7) return null;
  const ox = Math.floor(hash2(cx, cy, s + 73) * 2);
  const oy = Math.floor(hash2(cx, cy, s + 74) * 2);
  const lx = (x & 3) - ox;
  const ly = (y & 3) - oy;
  const deitada = hash2(cx, cy, s + 75) > 0.5;
  const dentro = deitada ? ly === 1 && lx >= 0 && lx <= 2 : lx === 1 && ly >= 0 && ly <= 2;
  if (dentro) return rampa(['#f4ece0', '#fffaf2', '#ffffff'], hash2(x, y, s), x, y, s);
  const sombra = deitada ? ly === 2 && lx >= 0 && lx <= 2 : lx === 2 && ly >= 0 && ly <= 2;
  return sombra ? cor('#8a4a14', x, y, s) : null;
});

/** Favos de mel: hexágonos dourados. */
const favo = noCaramelo((x, y, s) => {
  const b = bolinha(x, y, s + 76, 3);
  if (!b) return null;
  // contorno hexagonal (máximo das três direções)
  const h = Math.max(
    Math.abs(b.dx),
    Math.abs(b.dx * 0.5 + b.dy * 0.87),
    Math.abs(b.dx * 0.5 - b.dy * 0.87),
  );
  if (h > 2.4) return null;
  if (h > 1.6) return cor('#9a6a08', x, y, s);
  if (b.dx < 0 && b.dy < 0) return cor('#fff2a0', x, y, s);
  return rampa(['#f0b818', '#ffcc2a', '#ffdf5a'], 1 - h / 2, x, y, s);
});

/** Bala-estrela: estrelinhas cor-de-rosa que brilham (a matriz fica sem cor para não brilhar). */
function estrela(x: number, y: number, s: number, cel: number): Px | null {
  const n = T / cel;
  const cx = Math.floor(x / cel);
  const cy = Math.floor(y / cel);
  const ex =
    cx * cel + Math.floor(cel / 2) + (hash2(mod(cx, n), mod(cy, n), s + 81) > 0.5 ? 0 : -1);
  const ey =
    cy * cel + Math.floor(cel / 2) + (hash2(mod(cx, n), mod(cy, n), s + 82) > 0.5 ? 0 : -1);
  const dx = Math.abs(x - ex);
  const dy = Math.abs(y - ey);
  if (dx === 0 && dy === 0) return cor('#fff0fc', x, y, s);
  if ((dx === 0 && dy <= 2) || (dy === 0 && dx <= 2))
    return cor(dx + dy === 1 ? '#ff7ae0' : '#e83cc4', x, y, s);
  if (dx === 1 && dy === 1) return cor('#ff4fd2', x, y, s);
  return null;
}
const balaEstrela = noCaramelo((x, y, s) => estrela(x, y, s, 8), 0.75);

// --- outros blocos -------------------------------------------------------------

/** Torrões de caramelo (Voronoi) com chocolate entre eles. */
const torroes: Pintor = (x, y, s) => {
  let d1 = 99;
  let d2 = 99;
  let id = 0;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const cx = Math.floor(x / 4) + i;
      const cy = Math.floor(y / 4) + j;
      const px = cx * 4 + hash2(mod(cx, 4), mod(cy, 4), s) * 4;
      const py = cy * 4 + hash2(mod(cx, 4), mod(cy, 4), s + 1) * 4;
      const d = Math.hypot(x + 0.5 - px, y + 0.5 - py);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        id = mod(cx, 4) * 7 + mod(cy, 4);
      } else if (d < d2) d2 = d;
    }
  if (d2 - d1 < 0.9) return rampa(['#3a1f12', '#44261a'], hash2(x, y, s), x, y, s);
  const claro = hash2(id, 5, s) > 0.5;
  const p = rampa(
    claro ? ['#d08a34', '#dc9a44', '#e8ad58'] : ['#a85a1a', '#b86a24', '#c47a30'],
    0.9 - d1 * 0.22 + hash2(x, y, s) * 0.2,
    x,
    y,
    s,
  );
  return d1 < 0.9 ? mistura(p, '#ffe0a0', 0.4) : p;
};

/** Granulado colorido aos montes sobre chocolate. */
const granuladoColorido: Pintor = (x, y, s) => {
  const g =
    granulado(x, y, s, 0.95, [
      '#ff6aa8',
      '#ffe066',
      '#7fd6ff',
      '#a4f08c',
      '#ffffff',
      '#ff9a5c',
      '#c792ff',
    ]) ??
    granulado(mod(x + 2, T), mod(y + 2, T), s + 9, 0.9, [
      '#ff4f6a',
      '#6ac8ff',
      '#ffd23a',
      '#9af07a',
    ]);
  if (g) return g;
  const g3 = granulado(mod(x + 1, T), mod(y + 3, T), s + 17, 0.9, [
    '#ffffff',
    '#ff8ac0',
    '#ffe066',
  ]);
  if (g3) return g3;
  return rampa(CHOCOLATE, hash2(x, y, s), x, y, s);
};

/** Fundo da forma de bolo: metal escuro escovado, com farelinho queimado. */
const forma: Pintor = (x, y, s) => {
  const risco = mod(x * 3 + y, 16);
  const p = rampa(
    ['#24242c', '#2e2e38', '#383844', '#444452'],
    fbmT(x, y, 2, s) * 0.5 + (risco < 2 ? 0.45 : 0) + hash2(x, y, s) * 0.15,
    x,
    y,
    s,
  );
  if (hash2(x, y, s + 6) > 0.95) return cor('#4a2a18', x, y, s);
  if ((x === 3 || x === 12) && (y === 3 || y === 12)) return cor('#6a6a7a', x, y, s);
  return p;
};

/** Chantilly: rosinhas de confeitar em espiral. */
const chantilly: Pintor = (x, y, s) => {
  const cx = (x >> 3) * 8 + 4;
  const cy = (y >> 3) * 8 + 4;
  const dx = x + 0.5 - cx;
  const dy = y + 0.5 - cy;
  const r = Math.hypot(dx, dy);
  const a = Math.atan2(dy, dx) / PI2;
  const sulco = mod(r * 0.55 + a + hash2(x >> 3, y >> 3, s) * 0.5, 1);
  const t = 0.85 - r * 0.07 + hash2(x, y, s) * 0.12;
  const p = rampa(CHANTILLY, t, x, y, s);
  if (sulco < 0.26) return cor(r > 3 ? '#d6bea8' : '#e2cdbb', x, y, s);
  if (r > 4.2) return escurece(p, 0.9);
  return p;
};

/** Bala de menta: verde-água com listras brancas em diagonal. */
const balaMenta: Pintor = (x, y, s) => {
  const faixa = mod(x + y, 8);
  if (faixa < 2) return rampa(['#f4fffb', '#ffffff'], hash2(x, y, s), x, y, s);
  if (faixa === 2) return cor('#c8f2e4', x, y, s);
  const p = rampa(
    ['#3fc7a0', '#4fd4ad', '#62ddb8', '#78e6c4'],
    fbmT(x, y, 2, s) * 0.6 + hash2(x, y, s) * 0.4,
    x,
    y,
    s,
  );
  return x === 3 && y < 6 ? mistura(p, '#ffffff', 0.5) : p;
};

/** Paçoca: amendoim moído e prensado, cheio de farelos. */
const pacocaLado: Pintor = (x, y, s) => {
  const r = hash2(x, y, s + 3);
  if (r > 0.9) return cor('#f0d4a0', x, y, s);
  if (r < 0.08) return cor('#8a5a2e', x, y, s);
  const p = rampa(
    ['#c39257', '#cc9d63', '#d6a96f', '#dfb47c'],
    fbmT(x, y, 8, s) * 0.6 + hash2(x, y, s) * 0.4,
    x,
    y,
    s,
  );
  return y % 8 === 7 ? escurece(p, 0.8) : y % 8 === 0 ? mistura(p, '#f4dcae', 0.3) : p;
};
const pacocaTopo: Pintor = (x, y, s) => {
  if (borda(x, y)) return cor(x === 0 || y === 0 ? '#e8c890' : '#9a6a38', x, y, s);
  return pacocaLado(x, y + 3, s);
};

/** Açúcar mascavo: grãos úmidos e dunas onduladas. */
const mascavo: Pintor = (x, y, s) => {
  const onda = Math.sin(((y + fbmT(x, y, 2, s) * 4) * PI2) / 8) * 0.5 + 0.5;
  const torrao = fbmT(x, y, 4, s + 2) > 0.66;
  if (hash2(x, y, s + 9) > 0.94) return cor('#e0a868', x, y, s);
  const p = rampa(
    ['#8e4e22', '#9a5828', '#a6632e', '#b27036'],
    onda * 0.55 + hash2(x, y, s) * 0.45,
    x,
    y,
    s,
  );
  return torrao ? escurece(p, 0.82) : p;
};

/** Cacto de bala de goma verde, coberto de açúcar. */
const cactoLado: Pintor = (x, y, s) => {
  if (x === 0 || x === T - 1) return VAZIO;
  if (hash2(x, y, s + 3) > 0.86) return cor('#f4fff0', x, y, s);
  const sulco = x % 5 === 2;
  if (x === 3 && hash2(x, y >> 2, s) > 0.3) return cor('#b8f5a0', x, y, s);
  return rampa(
    sulco ? ['#1f8a3a', '#25963f'] : ['#36b04c', '#44c058', '#52cc64'],
    hash2(x, y, s),
    x,
    y,
    s,
  );
};
const cactoTopo: Pintor = (x, y, s) => {
  const d = Math.hypot(x - 7.5, y - 7.5);
  if (d > 7) return VAZIO;
  if (hash2(x, y, s + 3) > 0.84) return cor('#f4fff0', x, y, s);
  return rampa(d < 2.5 ? ['#8be27a', '#9cef88'] : ['#36b04c', '#44c058'], hash2(x, y, s), x, y, s);
};

/** Raminhos de alcaçuz vermelho (o arbusto do deserto). */
const alcacuzVermelho: Pintor = (x, y, s) => {
  const galho =
    (Math.abs(x - 7.5 - (y - 15) * 0.12) < 0.9 && y > 4) ||
    (Math.abs(x - 7.5 + (y - 11) * 0.95) < 0.8 && y > 3 && y < 11) ||
    (Math.abs(x - 7.5 - (y - 12) * 0.85) < 0.8 && y > 5 && y < 12);
  if (!galho) return VAZIO;
  const listra = mod(x + y, 3) === 0;
  return rampa(listra ? ['#8a1424'] : ['#d42a3c', '#e8404e', '#f45a66'], hash2(x, y, s), x, y, s);
};

/** Bengala doce: branca com listras vermelhas em diagonal. */
const bengala: Pintor = (x, y, s) => {
  const f = mod(x + y, 8);
  if (f < 3) {
    const p = rampa(['#d61f3a', '#e42c45', '#ee3c52'], hash2(x, y, s), x, y, s);
    return x === 4 || x === 5 ? mistura(p, '#ffffff', 0.35) : p;
  }
  if (f === 3) return cor('#f6b0b8', x, y, s);
  const p = rampa(['#f2ece8', '#f8f4f0', '#ffffff'], hash2(x, y, s) * 0.7 + 0.2, x, y, s);
  return x >= 12 ? escurece(p, 0.92) : p;
};
/** Topo da bengala: o rodamoinho vermelho e branco. */
const bengalaTopo: Pintor = (x, y, s) => {
  const dx = x - 7.5;
  const dy = y - 7.5;
  const r = Math.hypot(dx, dy);
  if (r > 7.3) return cor('#f0e8e4', x, y, s);
  const a = Math.atan2(dy, dx) / PI2;
  const giro = mod(a * 4 + r * 0.12, 1);
  return giro < 0.5
    ? rampa(['#d61f3a', '#e42c45'], hash2(x, y, s), x, y, s)
    : rampa(['#f8f4f0', '#ffffff'], hash2(x, y, s), x, y, s);
};

/** Tronco de chocolate: canudo de chocolate com frisos em pé. */
const troncoChocolate: Pintor = (x, y, s) => {
  const friso = x % 3;
  const p = rampa(CHOCOLATE, ruidoT(x, y, 8, 2, s) * 0.5 + hash2(x, y, s) * 0.5, x, y, s);
  if (friso === 0) return escurece(p, 0.7);
  if (friso === 1) return mistura(p, '#8a5a3c', 0.35);
  return hash2(x, y >> 2, s + 2) > 0.9 ? cor('#9a6a48', x, y, s) : p;
};
/** Topo do canudo: chocolate enrolado em espiral. */
const canudoTopo: Pintor = (x, y, s) => {
  const dx = x - 7.5;
  const dy = y - 7.5;
  const r = Math.hypot(dx, dy);
  if (r > 7.3) return cor('#2c180e', x, y, s);
  const a = Math.atan2(dy, dx) / PI2;
  const espiral = mod(r * 0.45 - a, 1);
  if (r < 1.4) return cor('#1e100a', x, y, s);
  return espiral < 0.35
    ? rampa(['#9a6a46', '#a87650'], hash2(x, y, s), x, y, s)
    : rampa(['#4c2a1a', '#583220'], hash2(x, y, s), x, y, s);
};

/** Copa de menta: pinheirinho de bala de hortelã com açúcar. */
const copaMenta: Pintor = (x, y, s) => {
  const t = fbmT(x, y, 4, s) * 0.5 + hash2(x, y, s) * 0.5;
  if (hash2(x, y, s + 21) < 0.08 && t < 0.5) return VAZIO;
  if (hash2(x, y, s + 33) > 0.93) return cor('#ffffff', x, y, s);
  if (hash2(x >> 1, y >> 1, s + 35) > 0.95) return cor('#ff4a6a', x, y, s);
  const faixa = mod(y * 2 + (x >> 2), 8) < 2;
  return rampa(
    faixa ? ['#2fa47c', '#3ab48a'] : ['#16664a', '#1c7656', '#228662', '#2a966e'],
    t,
    x,
    y,
    s,
  );
};

/** Brigadeiro: chocolate com granulado de chocolate e uma perolinha dourada aqui e ali. */
const brigadeiroTopo: Pintor = (x, y, s) => {
  if (hash2(x, y, s + 8) > 0.985) return cor('#ffd65a', x, y, s);
  const g =
    granulado(x, y, s, 0.95, ['#22100a', '#2a140c', '#7a4428']) ??
    granulado(mod(x + 2, T), mod(y + 2, T), s + 5, 0.85, ['#1a0c06', '#6a3a22']);
  if (g) return g;
  return rampa(['#4a2618', '#552d1c', '#603420'], hash2(x, y, s), x, y, s);
};
/** Massa de brigadeiro: lisa, brilhante, com redemoinhos de colher. */
const brigadeiroMassa: Pintor = (x, y, s) => {
  const onda = Math.sin(((x * 2 + y) * PI2) / 16 + fbmT(x, y, 2, s) * 5) * 0.5 + 0.5;
  if (onda > 0.9) return cor('#8a5638', x, y, s);
  return rampa(
    ['#3a1d12', '#452416', '#502b1b', '#5a3220'],
    onda * 0.6 + hash2(x, y, s) * 0.4,
    x,
    y,
    s,
  );
};

/** Canudinhos listrados (com dobrinha) no lugar dos juncos. */
const canudinhos: Pintor = (x, y, s) => {
  const hastes: [number, string][] = [
    [3, '#ff5a9a'],
    [8, '#4ab8ff'],
    [12, '#ffb02a'],
  ];
  for (const [h, c] of hastes) {
    const topo = 1 + Math.floor(hash2(h, 0, s) * 5);
    if (y < topo) continue;
    const dobra = y < topo + 2;
    const cx = dobra ? h + (y - topo === 0 ? 2 : 1) : h;
    if (x === cx || x === cx + 1) {
      if (dobra) return cor('#ffffff', x, y, s);
      return mod(y + x, 4) < 2 ? cor(c, x, y, s) : cor('#fff8fc', x, y, s);
    }
  }
  return VAZIO;
};

/** Alcaçuz preto torcido (tronco do brejo). */
const alcacuzPreto: Pintor = (x, y, s) => {
  const giro = mod(x - y * 2, 8);
  const p = rampa(['#1c1216', '#24181d', '#2e2026'], hash2(x, y, s), x, y, s);
  if (giro < 1) return cor('#5a3c4c', x, y, s);
  if (giro < 2) return mistura(p, '#3e2a34', 0.5);
  return p;
};
/** Rodela de alcaçuz sortido: anéis pretos e miolo cor-de-rosa. */
const alcacuzTopo: Pintor = (x, y, s) => {
  const r = Math.hypot(x - 7.5, y - 7.5);
  if (r < 2.4) return rampa(['#ff6aa8', '#ff86ba'], hash2(x, y, s), x, y, s);
  if (r < 3.2) return cor('#f6eef0', x, y, s);
  return Math.floor(r) % 2 ? cor('#2a1c22', x, y, s) : cor('#1a1014', x, y, s);
};

/** Copa de geleia: balinhas de goma brilhantes (laranja, amarela e rosa). */
const copaGeleia: Pintor = (x, y, s) => {
  const b = bolinha(x, y, s, 2.4, 4);
  if (!b) return hash2(x, y, s + 9) < 0.5 ? VAZIO : cor('#6a2a1a', x, y, s);
  const k = Math.floor(hash2(b.id, 3, s) * 3);
  const cores = [
    ['#ff7a1a', '#ff9a30', '#ffba50'],
    ['#ffc21a', '#ffd640', '#ffe880'],
    ['#ff3a7a', '#ff5a96', '#ff86b4'],
  ][k];
  if (b.dx < -0.3 && b.dy < -0.3 && b.d > 0.3 && b.d < 0.7) return cor('#fff6e0', x, y, s);
  return rampa(cores, 1 - b.d, x, y, s);
};

/** Fondant acolchoado: losangos com perolinhas nos cruzamentos. */
function fondant(c: string, linha = 0.86): Pintor {
  const k = hex(c);
  return (x, y, s) => {
    const a = mod(x + y, 8);
    const b = mod(x - y, 8);
    if (a === 0 && b === 0) return cor('#fffaf4', x, y, s);
    const f = (a === 0 || b === 0 ? linha : 1) * (0.97 + hash2(x, y, s) * 0.06);
    const brilho = a === 1 || b === 1 ? 1.06 : 1;
    return [k[0] * f * brilho, k[1] * f * brilho, k[2] * f * brilho, 255];
  };
}

/** Lata de biscoitos azul com faixa dourada. */
const lataLado: Pintor = (x, y, s) => {
  if (y <= 2 || y >= 13) {
    if (y === 0 || y === 15) return cor('#8a6a18', x, y, s);
    return rampa(
      ['#e0b030', '#ecc240', '#f6d460'],
      hash2(x, y, s) * 0.4 + (y === 1 || y === 14 ? 0.6 : 0.1),
      x,
      y,
      s,
    );
  }
  // florzinhas brancas pintadas na lata
  const fx = mod(x - 4, 8);
  const fy = mod(y - 7, 8);
  if ((fx === 0 && Math.abs(fy) <= 1) || (fy === 0 && fx <= 1) || (fy === 0 && fx === 7))
    return cor('#f4f6ff', x, y, s);
  if (fx === 0 && fy === 7) return cor('#f4f6ff', x, y, s);
  return rampa(
    ['#1f4a9a', '#2856a8', '#3262b6'],
    hash2(x, y, s) * 0.5 + fbmT(x, y, 2, s) * 0.5,
    x,
    y,
    s,
  );
};
const lataTopo: Pintor = (x, y, s) => {
  const r = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
  if (r > 6.5) return cor(r > 7 ? '#8a6a18' : '#ecc240', x, y, s);
  const d = Math.hypot(x - 7.5, y - 7.5);
  // um biscoito pintado na tampa
  if (d < 3.6) {
    if (d > 2.8) return cor('#a8682a', x, y, s);
    if ((x + y) % 3 === 0 && d < 2.4) return cor('#6a3a14', x, y, s);
    return rampa(BISCOITO, hash2(x, y, s), x, y, s);
  }
  return rampa(['#1f4a9a', '#2856a8', '#3262b6'], hash2(x, y, s), x, y, s);
};
const lataFrente: Pintor = (x, y, s) => {
  if (y === 4) return cor('#16346e', x, y, s);
  if (x >= 6 && x <= 9 && y >= 3 && y <= 6)
    return rampa(['#f6d460', '#ffe680'], x === 6 || y === 3 ? 0.9 : 0.2, x, y, s);
  return lataLado(x, y, s);
};

/** Tijolos de wafer: camadas de biscoito e recheio de morango, rejunte de chocolate. */
const wafer: Pintor = (x, y, s) => {
  const fila = y >> 2;
  const desl = fila % 2 ? 4 : 0;
  const lx = mod(x + desl, 8);
  const ly = y & 3;
  if (ly === 3 || lx === 0) return rampa(['#5a3220', '#643a26'], hash2(x, y, s), x, y, s);
  if (ly === 1) return rampa(['#f2849e', '#f894ac'], hash2(x, y, s), x, y, s);
  const p = rampa(['#e2a868', '#eab474', '#f0c080'], hash2(x, y, s), x, y, s);
  return lx % 2 === 0 ? escurece(p, 0.9) : p;
};

/** Tijolos de pão de mel com glacê branco no rejunte e confeitos nos cantos. */
const paoDeMel: Pintor = (x, y, s) => {
  const fila = y >> 2;
  const desl = fila % 2 ? 4 : 0;
  const lx = mod(x + desl, 8);
  const ly = y & 3;
  if (ly === 3 || lx === 0) {
    if (ly === 3 && lx === 0) {
      const c = CONFEITOS[Math.floor(hash2(x, y, s + 3) * 3) * 2];
      return hash2(x >> 2, y >> 2, s + 4) > 0.5 ? cor(c, x, y, s) : cor('#fffaf4', x, y, s);
    }
    return rampa(['#fff6ee', '#fffaf6'], hash2(x, y, s), x, y, s);
  }
  const tom = 0.92 + hash2(x >> 3, fila, s) * 0.14;
  const p = rampa(
    ['#8a4622', '#985228', '#a65d2e', '#b06834'],
    hash2(x, y, s) * 0.6 + fbmT(x, y, 4, s) * 0.4,
    x,
    y,
    s,
  );
  return escurece(ly === 0 ? mistura(p, '#c88050', 0.3) : p, tom);
};

/** Tablete de caramelo polido, com bisel e um reflexo. */
const tablete: Pintor = (x, y, s) => {
  if (x === 0 || y === 0) return cor('#f0b868', x, y, s);
  if (x === T - 1 || y === T - 1) return cor('#8a4a14', x, y, s);
  if (x === 1 || y === 1) return cor('#e09a48', x, y, s);
  if (x === T - 2 || y === T - 2) return cor('#a65e20', x, y, s);
  const brilho = mod(x - y, 16);
  if (brilho >= 4 && brilho <= 5) return cor('#f8d090', x, y, s);
  return rampa(
    ['#c47426', '#cc7e2e', '#d48836'],
    hash2(x, y, s) * 0.4 + fbmT(x, y, 2, s) * 0.6,
    x,
    y,
    s,
  );
};

/** Toalha xadrez de confeitaria (rosa e branco). */
const xadrez = (x: number, y: number, s: number): Px => {
  const a = (x >> 1) % 2;
  const b = (y >> 1) % 2;
  if (a && b) return cor('#e84a7a', x, y, s);
  if (a || b) return cor('#f6a0bc', x, y, s);
  return cor('#fff6f8', x, y, s);
};

const bancadaTopo: Pintor = (x, y, s) => {
  if (borda(x, y, 1)) return rampa(['#b07a3c', '#bc8646'], hash2(x, y, s), x, y, s);
  // rolo de massa por cima da toalha
  if (y >= 9 && y <= 11 && x >= 3 && x <= 12) {
    if (x <= 4 || x >= 11) return cor('#c8955a', x, y, s);
    return rampa(['#f0d8b0', '#f8e6c4'], y === 9 ? 0.9 : 0.2, x, y, s);
  }
  return xadrez(x, y, s);
};
const bancadaLado: Pintor = (x, y, s) => {
  if (y < 3) return xadrez(x, y, s);
  if (y === 3) return x % 2 ? cor('#e84a7a', x, y, s) : tabuasBiscoito(x, y, s);
  return tabuasBiscoito(x, y, s);
};
const bancadaFrente: Pintor = (x, y, s) => {
  if (y < 3) return xadrez(x, y, s);
  // batedor de arame e colher pendurados
  const dxB = x - 4.5;
  if (
    y >= 5 &&
    y <= 9 &&
    Math.abs(dxB) <= 2 - (y - 5) * 0.3 &&
    (Math.abs(dxB) > 1.2 || x === 4 || x === 5)
  )
    return cor('#d8dce8', x, y, s);
  if ((x === 4 || x === 5) && y >= 10 && y <= 13) return cor('#e84a7a', x, y, s);
  if (x >= 10 && x <= 12 && y >= 5 && y <= 7)
    return rampa(['#c8955a', '#d8a466'], hash2(x, y, s), x, y, s);
  if (x === 11 && y >= 8 && y <= 13) return cor('#b07a3c', x, y, s);
  return tabuasBiscoito(x, y, s);
};

/** Forninho esmaltado creme com frisos cor-de-rosa. */
const fornoLado: Pintor = (x, y, s) => {
  if (y <= 1 || y >= 14) return rampa(['#e85a8a', '#f070a0'], hash2(x, y, s), x, y, s);
  if (x === 0 || x === T - 1) return cor('#c8b4a4', x, y, s);
  const p = rampa(
    ['#efe2d6', '#f5eadf', '#faf2ea'],
    hash2(x, y, s) * 0.5 + fbmT(x, y, 2, s) * 0.5,
    x,
    y,
    s,
  );
  return x === 2 ? mistura(p, '#ffffff', 0.5) : p;
};
const fornoTopo: Pintor = (x, y, s) => {
  if (borda(x, y)) return cor('#e85a8a', x, y, s);
  for (const [cx, cy] of [
    [4.5, 4.5],
    [11, 11],
  ]) {
    const d = Math.hypot(x - cx, y - cy);
    if (d < 3)
      return d > 2
        ? cor('#3a3a44', x, y, s)
        : d < 1
          ? cor('#5a5a66', x, y, s)
          : cor('#2a2a32', x, y, s);
  }
  return rampa(['#efe2d6', '#f5eadf'], hash2(x, y, s), x, y, s);
};
function fornoFrente(aceso: boolean): Pintor {
  return (x, y, s) => {
    // botões
    if (y === 2 && (x === 3 || x === 6 || x === 9 || x === 12))
      return cor(aceso ? '#ff5a8a' : '#a8949a', x, y, s);
    if (y === 6 && x >= 4 && x <= 11) return cor('#9a9aa8', x, y, s);
    if (x >= 3 && x <= 12 && y >= 8 && y <= 13) {
      if (x === 3 || x === 12 || y === 8 || y === 13) return cor('#6a6a78', x, y, s);
      if (!aceso)
        return rampa(['#2a2430', '#342c3a'], hash2(x, y, s) + (y === 9 ? 0.5 : 0), x, y, s);
      // bolinho crescendo no forno quente
      const dx = x - 7.5;
      if (y >= 10 && Math.abs(dx) <= (y === 10 ? 1.5 : 2.5))
        return cor(y === 10 ? '#d88a3a' : '#b86a28', x, y, s);
      const f = (13 - y) / 4 + hash2(x, y, s) * 0.3;
      return rampa(['#ff6a1a', '#ff8a2a', '#ffb040', '#ffd870'], f, x, y, s);
    }
    return fornoLado(x, y, s);
  };
}

/** Cama de marshmallow: travesseiro fofo e cobertor rosa de bolinhas. */
const camaTopo: Pintor = (x, y, s) => {
  if (y < 5)
    return rampa(
      ['#f4ecec', '#faf4f4', '#ffffff'],
      y === 0 || y === 4 ? 0.1 : 0.7 + hash2(x, y, s) * 0.3,
      x,
      y,
      s,
    );
  if (mod(x, 4) === 1 && mod(y, 4) === 2) return cor('#ffffff', x, y, s);
  return rampa(['#f06a9a', '#f47aa6', '#f88ab2'], hash2(x, y, s), x, y, s);
};
const camaLado: Pintor = (x, y, s) => {
  if (y < 6)
    return mod(x, 4) === 1 && y === 3
      ? cor('#ffffff', x, y, s)
      : rampa(['#f06a9a', '#f47aa6'], hash2(x, y, s), x, y, s);
  if (y < 9) return rampa(['#f4ecec', '#ffffff'], hash2(x, y, s), x, y, s);
  return tabuasBiscoito(x, y, s);
};

/** Porta de biscoito inteira: glacê em volta, janelinha de coração em cima, confeitos embaixo. */
const portas = metadesDaPorta((x, yy, s) => {
  const hx = (x - 7.5) / 3.6;
  const hy = (7 - yy) / 3.2;
  const q = hx * hx + hy * hy - 1;
  if (q * q * q - hx * hx * hy * hy * hy < 0) return VAZIO;
  if (bordaDaPorta(x, yy)) return cor('#fff6ee', x, yy, s);
  if (x === 12 && (yy === 18 || yy === 19)) return cor('#ff4a7a', x, yy, s);
  if (bordaDaPorta(x, yy, 1)) return cor('#8a4a1e', x, yy, s);
  if ((yy === 22 || yy === 27) && x > 2 && x < 13 && x % 2 === 0) return cor('#fff6ee', x, yy, s);
  const y = yy & (T - 1);
  return rampa(
    ['#a65d2e', '#b06834', '#ba733a'],
    hash2(x, yy, s) * 0.5 + fbmT(x, y, 4, s) * 0.5,
    x,
    yy,
    s,
  );
});

/** Abóbora cristalizada: gomos laranja cobertos de açúcar. */
const aboboraLado: Pintor = (x, y, s) => {
  if (hash2(x, y, s + 6) > 0.9) return cor('#fff4dc', x, y, s);
  const gomo = x % 4 === 0;
  return rampa(
    gomo ? ['#c8561a', '#d0601e'] : ['#ec7a22', '#f48a2a', '#fa9a38'],
    hash2(x, y, s) * 0.6 + ruidoT(x, y, 4, 1, s) * 0.4,
    x,
    y,
    s,
  );
};
const aboboraTopo: Pintor = (x, y, s) => {
  const d = Math.hypot(x - 7.5, y - 7.5);
  if (d < 1.6) return rampa(['#7a4a22', '#8a5628'], hash2(x, y, s), x, y, s);
  // folhinha de bala de goma verde
  if (y >= 5 && y <= 7 && x >= 9 && x <= 12) return cor(y === 6 ? '#4cc05a' : '#36a048', x, y, s);
  if (hash2(x, y, s + 6) > 0.9) return cor('#fff4dc', x, y, s);
  return rampa(['#ec7a22', '#f48a2a', '#fa9a38'], hash2(x, y, s) * 0.5 + (d / 12) * 0.5, x, y, s);
};
/** Abóbora risonha: olhinhos fechados de alegria e um sorrisão iluminado. */
const aboboraRosto: Pintor = (x, y, s) => {
  const luz = (): Px => rampa(['#ffd050', '#ffe48a'], hash2(x, y, s), x, y, s);
  // olhinhos em arco (^ ^)
  for (const cx of [4.5, 11]) {
    const dx = Math.abs(x - cx);
    if (
      (y === 4 && dx < 0.6) ||
      (y === 5 && dx >= 0.6 && dx < 1.6) ||
      (y === 6 && dx >= 1.6 && dx < 2.6)
    )
      return luz();
  }
  // bochechas
  if (y === 8 && (x === 2 || x === 13)) return cor('#ff6a8a', x, y, s);
  // sorriso
  const dx = x - 7.5;
  const curva = 9 + (dx * dx) / 14;
  if (
    Math.abs(dx) < 5 &&
    y >= Math.floor(curva) &&
    y <= Math.floor(curva) + 1 + (Math.abs(dx) < 3 ? 1 : 0)
  )
    return luz();
  return aboboraLado(x, y, s);
};

// --- plantas e luzes -----------------------------------------------------------

/** Fitas azedinhas: tiras de bala onduladas, verde-limão e amarelas, com açúcar. */
const fitas: Pintor = (x, y, s) => {
  for (const [base, c1, c2] of [
    [3, '#7ee03a', '#ffe23a'],
    [8, '#ffe23a', '#ff8a2a'],
    [12, '#7ee03a', '#ff5a8a'],
  ] as const) {
    const alt = 7 + Math.floor(hash2(base, 4, s) * 8);
    if (T - 1 - y >= alt) continue;
    const cx = base + Math.round(Math.sin(y * 0.7 + base) * 1);
    if (x === cx || x === cx + 1) {
      if (hash2(x, y, s + 2) > 0.85) return cor('#ffffff', x, y, s);
      return cor(x === cx ? c1 : c2, x, y, s);
    }
  }
  return VAZIO;
};

/** Flor de confeito: cinco pétalas azul-bebê, miolo amarelo e folhinhas de menta. */
const florConfeito: Pintor = (x, y, s) => {
  const cx = 7.5;
  const cy = 5.5;
  const dx = x - cx;
  const dy = y - cy;
  if (Math.hypot(dx, dy) < 1.3) return cor('#ffd23a', x, y, s);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * PI2 - Math.PI / 2;
    const px = cx + Math.cos(a) * 2.9;
    const py = cy + Math.sin(a) * 2.9;
    const d = Math.hypot(x - px, y - py);
    if (d < 1.9)
      return d > 1.3
        ? cor('#4a9ae8', x, y, s)
        : rampa(['#8ccaff', '#b0dcff'], hash2(x, y, s), x, y, s);
  }
  if ((x === 7 || x === 8) && y >= 10) return cor('#2fa86a', x, y, s);
  if (y === 12 && (x === 5 || x === 6 || x === 9 || x === 10)) return cor('#4fc48a', x, y, s);
  if (y === 11 && (x === 5 || x === 10)) return cor('#4fc48a', x, y, s);
  return VAZIO;
};

/** Cogumelo de suspiro: chapéu de merengue com bico e pintinhas rosa. */
const suspiro: Pintor = (x, y, s) => {
  const dx = Math.abs(x - 7.5);
  // três voltas de merengue (larga, média, bico) e um cabinho curto
  const camadas: [number, number, number][] = [
    [6, 8, 6.6],
    [3, 5, 4.6],
    [1, 2, 2.4],
  ];
  for (const [y0, y1, raio] of camadas) {
    if (y < y0 || y > y1) continue;
    const r = raio - (y - y0) * 0.3;
    if (dx > r) break;
    if (hash2(x, y, s + 1) > 0.86) return cor('#ff5ab0', x, y, s);
    if (y === y1) return cor('#e6d2dc', x, y, s);
    return rampa(['#f4e8ee', '#fbf2f6', '#ffffff'], 1 - dx / r + 0.2, x, y, s);
  }
  if (y === 0 && dx < 0.6) return cor('#ffffff', x, y, s);
  if (y >= 9 && y <= 15 && dx < 1.6 + (y > 13 ? 0.6 : 0))
    return rampa(['#e8d6c4', '#f6eadc'], x < 7 ? 0 : 0.8, x, y, s);
  return VAZIO;
};

/** Arbusto de balinhas: folhas de goma e balinhas redondas de frutas. */
const arbustoBalinhas: Pintor = (x, y, s) => {
  if (y < 3 || x < 1 || x > 14) return VAZIO;
  const b = bolinha(x, y, s + 90, 1.5, 4);
  if (b && hash2(b.id, 1, s) > 0.45) {
    const c = ['#ff3a5a', '#ff9a1a', '#ffd21a', '#c84aff'][Math.floor(hash2(b.id, 2, s) * 4)];
    if (b.dx < 0 && b.dy < 0 && b.d > 0.3) return cor('#ffffff', x, y, s);
    return cor(c, x, y, s);
  }
  const t = fbmT(x, y, 4, s) * 0.5 + hash2(x, y, s) * 0.5;
  if (hash2(x, y, s + 21) < 0.35 && t < 0.55) return VAZIO;
  return rampa(['#2e9a4a', '#3aac56', '#48bc62'], t, x, y, s);
};

/** Vela de aniversário listrada com chama. */
const vela: Pintor = (x, y, s) => {
  if (x >= 7 && x <= 8 && y >= 6)
    return mod(y + x, 4) < 2 ? cor('#ff5a9a', x, y, s) : cor('#fff6fa', x, y, s);
  if (x >= 7 && x <= 8 && y === 5) return cor('#3a2a2a', x, y, s);
  if (x >= 6 && x <= 9 && y >= 2 && y <= 4) {
    if ((x === 6 || x === 9) && y === 2) return VAZIO;
    const f = (4 - y) / 3 + hash2(x, y, s) * 0.3;
    return rampa(['#ff7a1a', '#ffa82e', '#ffd85a', '#fff4b0'], f, x, y, s);
  }
  if (x >= 7 && x <= 8 && y === 1) return cor('#ffe88a', x, y, s);
  return VAZIO;
};

/** Pote de geleia brilhante com tampinha de pano xadrez. */
const poteGeleia: Pintor = (x, y, s) => {
  if (y <= 2) {
    if (y === 2) return cor('#fff6f8', x, y, s);
    return (x >> 1) % 2 === y % 2 ? cor('#e8384a', x, y, s) : cor('#ffffff', x, y, s);
  }
  if (y === 3) return cor('#b8b0b0', x, y, s);
  if (x <= 1 || x >= T - 2 || y >= T - 2)
    return rampa(['#f0e8f0', '#fff6ff'], hash2(x, y, s), x, y, s);
  if (x === 3 && y >= 5 && y <= 10) return cor('#fff8f0', x, y, s);
  const d = Math.hypot(x - 7.5, y - 9) / 7;
  if (hash2(x, y, s + 4) > 0.92) return cor('#fff4c0', x, y, s);
  return rampa(['#ff5a3a', '#ff7a3a', '#ffa040', '#ffc860'], 1 - d + hash2(x, y, s) * 0.2, x, y, s);
};

/** Bloco de bala-estrela: rosa-choque facetado com estrelinhas em relevo. */
const blocoEstrela: Pintor = (x, y, s) => {
  const e = estrela(mod(x + 4, T), mod(y + 4, T), s, 8);
  if (e) return mistura(e, '#ffffff', 0.35);
  const t = (mod(x + y, 6) / 6) * 0.5 + fbmT(x, y, 2, s) * 0.5;
  const p = rampa(['#b8209e', '#cc2cb0', '#de3cc2', '#ee56d2'], t, x, y, s);
  return borda(x, y) ? escurece(p, 0.7) : p;
};

/** Cristal de açúcar (pirulito de cristal): cubinhos lilás empilhados. */
const cristalAcucar: Pintor = (x, y, s) => {
  const cx = x >> 2;
  const cy = y >> 2;
  const lx = x & 3;
  const ly = y & 3;
  const tom = hash2(cx, cy, s);
  if (lx === 0 || ly === 0) return cor(tom > 0.5 ? '#fbe4ff' : '#f0c8ff', x, y, s);
  if (lx === 3 || ly === 3) return cor('#9a48d8', x, y, s);
  return rampa(
    ['#b462ec', '#c47af4', '#d494fa', '#e2b0ff'],
    tom * 0.7 + hash2(x, y, s) * 0.3,
    x,
    y,
    s,
  );
};

/** Vidro de açúcar: borda âmbar clara e trincas finas. */
const vidroAcucar: Pintor = (x, y, s) => {
  if (borda(x, y)) return rampa(['#f6d8c0', '#fae6d4'], hash2(x, y, s), x, y, s);
  if ((x === y + 3 || x === y + 4) && x > 3 && x < 10) return [255, 250, 240, 255];
  if (x === 11 && y >= 9 && y <= 12) return [255, 236, 220, 200];
  return VAZIO;
};

/** Topo do bolo coberto de chantilly e do brigadeiro, para os lados escorridos. */
const chantillyLisa: Pintor = (x, y, s) => rampa(CHANTILLY, 0.5 + hash2(x, y, s) * 0.5, x, y, s);
const brigadeiroFaixa: Pintor = (x, y, s) => brigadeiroTopo(x, y, s);

/** Pintores do Doce Reino por nome do tile (todos os tiles do atlas). */
export const PINTORES_DOCE: Record<string, Pintor> = {
  grama_topo: glaceTopo,
  grama_lado: glaceLado,
  terra: massa,
  pedra: caramelo,
  areia: acucar,
  tronco: biscoitoTronco,
  tronco_topo: rocambole,
  folhas: algodao(
    ['#ee5aa6', '#f272b4', '#f68cc4', '#faa8d4'],
    ['#4aa6ec', '#62b6f2', '#7cc6f6', '#98d4fa'],
  ),
  cristal: cristalAcucar,
  tabuas: tabuasBiscoito,
  grama_alta: fitas,
  flor: florConfeito,
  cogumelo: suspiro,
  pedregulho: torroes,
  cascalho: granuladoColorido,
  rocha_matriz: forma,
  min_carvao: gotas,
  min_cobre: jujubas,
  min_ferro: coco,
  min_ouro: favo,
  min_luzita: balaEstrela,
  neve_lado: cobertura(chantillyLisa, '#d8c4b4', 3, massa),
  neve: chantilly,
  gelo: balaMenta,
  arenito_lado: pacocaLado,
  arenito_topo: pacocaTopo,
  areia_deserto: mascavo,
  cacto_lado: cactoLado,
  cacto_topo: cactoTopo,
  arbusto_seco: alcacuzVermelho,
  betula: bengala,
  betula_topo: bengalaTopo,
  folhas_betula: goma(['#5ac83a', '#72d848', '#8ce45a', '#a8ee74'], '#e8ffc8'),
  pinho: troncoChocolate,
  pinho_topo: canudoTopo,
  folhas_pinho: copaMenta,
  pantano_lado: cobertura(brigadeiroFaixa, '#1a0c06', 3, brigadeiroMassa),
  pantano_topo: brigadeiroTopo,
  lama: brigadeiroMassa,
  junco: canudinhos,
  tronco_lanterna: alcacuzPreto,
  tronco_lanterna_topo: alcacuzTopo,
  folhas_lanterna: copaGeleia,
  vidro: vidroAcucar,
  tocha: vela,
  lanterna: poteGeleia,
  bloco_luzita: blocoEstrela,
  mesa_lado: bancadaLado,
  mesa_topo: bancadaTopo,
  mesa_frente: bancadaFrente,
  fornalha_lado: fornoLado,
  fornalha_topo: fornoTopo,
  fornalha_frente: fornoFrente(false),
  bau_lado: lataLado,
  bau_topo: lataTopo,
  bau_frente: lataFrente,
  tijolos: wafer,
  tijolos_pedra: paoDeMel,
  pedra_lisa: tablete,
  la_branca: fondant('#f8f0ea'),
  la_vermelha: fondant('#e84a5e'),
  la_laranja: fondant('#ff9446'),
  la_amarela: fondant('#ffdc5a'),
  la_verde: fondant('#6cd07a'),
  la_azul: fondant('#5e9cf4'),
  la_roxa: fondant('#ac74e4'),
  la_preta: fondant('#3c2c36', 0.7),
  frutinhas: arbustoBalinhas,
  folhas_outono: algodao(
    ['#f08a1a', '#f49a2a', '#f8ac3c', '#fbbe54'],
    ['#e86a14', '#f07a1e', '#f48a2a', '#f8a03a'],
    0.12,
  ),
  cama_lado: camaLado,
  cama_topo: camaTopo,
  ...portas,
  fornalha_acesa: fornoFrente(true),
  tabuas_betula: (x, y, s) => {
    const p = placasBrancas(x, y, s);
    if (y % 4 === 3 || mod(x + (y % 4 === 3 ? 0 : 4 * ((y >> 2) % 2)), 8) === 0) return p;
    return mod(x + y, 6) < 2 ? mistura(p, '#ee4a72', 0.85) : p;
  },
  tabuas_pinho: placas(AO_LEITE, '#3e2214', 4, 4, false),
  abobora_lado: aboboraLado,
  abobora_topo: aboboraTopo,
  abobora_rosto: aboboraRosto,

  // spec 013: canteiro de chocolate (com granulado), broto-doce, milho-caramelo,
  // aboboreira doce e fardo de broto-doce amarrado com fita
  terra_arada: (x, y, s) => {
    if (y % 4 === 0) {
      const g = granulado(x, y, s + 9, 0.5, CONFEITOS);
      if (g) return g;
    }
    return terraAradaDe(massa, 0.45, 0.24)(x, y, s);
  },
  trigo: trigoDe(['#4ec084', '#5ed096', '#70e0a8'], ['#e8609c', '#f47cb2', '#ff9ccc'], '#ffffff'),
  milho: milhoDe(
    ['#46b47c', '#54c48a', '#64d49a', '#78e2ac'],
    ['#c0701c', '#dc922e', '#f0b450'],
    '#fff0c0',
  ),
  aboboreira: aboboreiraDe(
    ['#3ea86c', '#4cba7a', '#5ccc8a', '#6edc9c'],
    ['#ec6a2e', '#fa8444', '#ff9c5c', '#ffb678'],
    '#c04a7a',
  ),
  feno_lado: fenoLadoDe(['#d89a48', '#e4ac58', '#eebe6a', '#f6ce7e'], '#e8468a'),
  feno_topo: fenoTopoDe(['#dc9e4c', '#e8b05c', '#f0c06e', '#f8d082'], '#e8468a'),
};
