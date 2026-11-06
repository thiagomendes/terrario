import { hash2 } from '../../world/noise';
import {
  T,
  VAZIO,
  escurece,
  fbmT,
  hex,
  rampa,
  ruidoT,
  tijolosDe,
  ladoComTopo,
} from '../../art/atlas';
import type { Pintor, Px } from '../tipos';

/*
 * Planeta Vivo: pintores dos tiles. Paleta-guia:
 *  - chão de líquen turquesa com rosetas e esporos coloridos sobre solo âmbar;
 *  - rocha violeta em estratos inclinados, com minerais em cristais de losango;
 *  - fungos gigantes (talo creme, chapéu magenta com pintas), copas de bolhas,
 *    cristais de gelo lilás e véus luminosos no brejo;
 *  - equipamento de pesquisa em metal claro, telas e luzes de energia.
 */

const mod = (a: number, n: number) => ((a % n) + n) % n;
const cor = (c: string, x: number, y: number, s: number): Px => rampa([c], 0, x, y, s);
const naBorda = (x: number, y: number) => x === 0 || y === 0 || x === T - 1 || y === T - 1;

interface Celula {
  d1: number;
  d2: number;
  id: number;
  ox: number;
  oy: number;
}

/** Voronoi que se repete a cada tile (tam divide 16). */
function voronoi(x: number, y: number, s: number, tam: number): Celula {
  const n = T / tam;
  let d1 = 99;
  let d2 = 99;
  let id = 0;
  let ox = 0;
  let oy = 0;
  const bx = Math.floor(x / tam);
  const by = Math.floor(y / tam);
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const cx = bx + i;
      const cy = by + j;
      const mx = mod(cx, n);
      const my = mod(cy, n);
      const px = cx * tam + 0.2 * tam + hash2(mx, my, s) * tam * 0.6;
      const py = cy * tam + 0.2 * tam + hash2(mx, my, s + 1) * tam * 0.6;
      const dx = x + 0.5 - px;
      const dy = y + 0.5 - py;
      const d = Math.hypot(dx, dy);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        id = mx * 7 + my * 13;
        ox = dx;
        oy = dy;
      } else if (d < d2) d2 = d;
    }
  return { d1, d2, id, ox, oy };
}

// ---------------------------------------------------------------- chão e solo

const LIQUEN = ['#1d8a80', '#239c90', '#2aae9f', '#34bfab', '#45cfb6'];
const SOLO = ['#8f4b2c', '#9d5632', '#ab6238', '#b86e40'];

/** Líquen turquesa: rosetas claras, frestas escuras e esporos coloridos. */
const liquenTopo: Pintor = (x, y, s) => {
  const v = voronoi(x, y, s, 4);
  const t = fbmT(x, y, 4, s) * 0.5 + hash2(x, y, s) * 0.3;
  if (v.d1 < 0.75 && hash2(v.id, 1, s) > 0.62)
    return cor(hash2(v.id, 2, s) > 0.5 ? '#ff7ad0' : '#ffd36e', x, y, s);
  if (v.d2 - v.d1 < 0.55) return escurece(rampa(LIQUEN, t * 0.5, x, y, s), 0.78);
  if (v.d1 > 1.1 && v.d1 < 1.7) return rampa(LIQUEN, 0.45 + t, x, y, s);
  return rampa(LIQUEN, 0.1 + t * 0.8, x, y, s);
};

/** Solo âmbar: estratos finos, grãos de cristal dourado e pedrinhas escuras. */
const soloAmbar: Pintor = (x, y, s) => {
  const r = hash2(x, y, s + 3);
  if (r > 0.955) return cor('#ffd36e', x, y, s);
  if (r < 0.05) return cor('#5e2e1c', x, y, s);
  const faixa = Math.sin((y + fbmT(x, y, 2, s) * 3) * 1.25) * 0.5 + 0.5;
  return rampa(SOLO, faixa * 0.4 + hash2(x, y, s) * 0.6, x, y, s);
};

/** Lado do líquen: franja que escorre em gotas sobre o solo âmbar. */
const liquenLado: Pintor = (x, y, s) => {
  let borda = 2 + Math.floor(hash2(x, 0, s + 17) * 3);
  if (hash2(x, 1, s + 17) > 0.78) borda += 3;
  if (y < borda) return rampa(LIQUEN, 0.25 + hash2(x, y, s) * 0.75, x, y, s);
  if (y === borda) return cor('#145e58', x, y, s);
  return soloAmbar(x, y, s);
};

// ---------------------------------------------------------------- rocha

const ROCHA = ['#4b3f63', '#56496e', '#615479', '#6c5f84', '#786b8f'];

/** Rocha violeta: estratos inclinados e faíscas claras. */
export const rochaVioleta: Pintor = (x, y, s) => {
  const banda = y + x * 0.35 + fbmT(x, y, 2, s + 8) * 4;
  const f = banda / 3.2 - Math.floor(banda / 3.2);
  const p = rampa(ROCHA, fbmT(x, y, 4, s) * 0.5 + hash2(x, y, s) * 0.5, x, y, s);
  if (f < 0.16) return escurece(p, 0.74);
  if (f < 0.3) return escurece(p, 1.1);
  if (hash2(x, y, s + 4) > 0.965) return cor('#c4b6e6', x, y, s);
  return p;
};

/** Minerais em cristais de losango (com sombra em volta) sobre a rocha violeta. */
function cristais(cores: string[], brilho: string, densidade = 0.42): Pintor {
  return (x, y, s) => {
    const v = voronoi(x, y, s + 77, 4);
    if (hash2(v.id, 5, s + 77) < densidade) {
      const r = 1.5 + hash2(v.id, 6, s) * 0.9;
      const d = Math.abs(v.ox) + Math.abs(v.oy) * 0.8;
      if (d < r) {
        if (v.ox < 0 && v.oy < 0 && d < r * 0.55) return cor(brilho, x, y, s);
        return rampa(cores, 1 - d / r + hash2(x, y, s) * 0.2, x, y, s);
      }
      if (d < r + 0.9) return escurece(rochaVioleta(x, y, s), 0.55);
    }
    return rochaVioleta(x, y, s);
  };
}

const seixos: Pintor = (x, y, s) => {
  const v = voronoi(x, y, s, 4);
  if (v.d2 - v.d1 < 0.8) return cor('#2b2540', x, y, s);
  const tom = 0.85 + hash2(v.id, 3, s) * 0.3;
  const luz = v.oy < -0.8 ? 0.25 : 0;
  return escurece(rampa(ROCHA, 0.35 + luz - v.d1 * 0.1 + hash2(x, y, s) * 0.3, x, y, s), tom);
};

const CASCALHO = ['#7a6a9a', '#4f8a86', '#a8705a', '#8a8ab0', '#b08aa8'];
const cascalho: Pintor = (x, y, s) => {
  const v = voronoi(x, y, s, 2);
  if (v.d2 - v.d1 < 0.45) return cor('#3a3048', x, y, s);
  const c = hex(CASCALHO[Math.floor(hash2(v.id, 2, s) * CASCALHO.length)]);
  const f = 0.9 + hash2(x, y, s) * 0.15 - v.d1 * 0.12;
  if (hash2(x, y, s + 9) > 0.96) return cor('#f0e8ff', x, y, s);
  return [c[0] * f, c[1] * f, c[2] * f, 255];
};

const nucleo: Pintor = (x, y, s) => {
  const v = voronoi(x, y, s + 3, 8);
  if (v.d2 - v.d1 < 0.6) return rampa(['#5a2470', '#6e2c86'], hash2(x, y, s), x, y, s);
  return rampa(
    ['#120e1c', '#1b1528', '#241d34', '#2e2640'],
    fbmT(x, y, 8, s) * 0.6 + hash2(x, y, s) * 0.4,
    x,
    y,
    s,
  );
};

// ---------------------------------------------------------------- areias

const areiaRosada: Pintor = (x, y, s) => {
  const r = hash2(x, y, s + 2);
  if (r > 0.95) return cor('#fff2f6', x, y, s);
  if (r < 0.04) return cor('#a8709a', x, y, s);
  return rampa(
    ['#e2a2b4', '#e7adbd', '#ecb8c6', '#f1c3cf'],
    fbmT(x, y, 4, s) * 0.5 + hash2(x, y, s) * 0.5,
    x,
    y,
    s,
  );
};

const poDuna: Pintor = (x, y, s) => {
  const onda = Math.sin((x * 0.45 + y + fbmT(x, y, 2, s) * 3) * 0.85) * 0.5 + 0.5;
  if (hash2(x, y, s + 5) > 0.97) return cor('#ffd8a8', x, y, s);
  return rampa(
    ['#d97a40', '#e2894c', '#eb995a', '#f2a96a'],
    onda * 0.55 + hash2(x, y, s) * 0.45,
    x,
    y,
    s,
  );
};

const FAIXAS = ['#d8743c', '#f0b07a', '#cc5a48', '#e8935a'];
const arenitoLado: Pintor = (x, y, s) => {
  const yy = y + fbmT(x, y, 2, s) * 2.2;
  const banda = Math.floor(yy / 3);
  const p = rampa([FAIXAS[mod(banda, 4)]], 0, x, y, s);
  const j = 0.92 + hash2(x, y, s) * 0.12;
  if (yy - banda * 3 < 0.5) return escurece(p, 0.78);
  return escurece(p, j);
};
const arenitoTopo: Pintor = (x, y, s) => {
  const r = Math.hypot(x - 7.5, y - 7.5) + fbmT(x, y, 2, s) * 2.5;
  return rampa(
    ['#d8743c', '#e8935a', '#f0b07a'],
    (Math.sin(r * 1.3) * 0.5 + 0.5) * 0.6 + hash2(x, y, s) * 0.4,
    x,
    y,
    s,
  );
};

// ---------------------------------------------------------------- fungos e plantas grandes

const TALO = ['#d9cbb6', '#e3d6c2', '#ecdfcc', '#f4e9d8'];

/** Talo de fungo: fibras verticais, sulcos e pintinhas lilás. */
const taloFungo: Pintor = (x, y, s) => {
  if (hash2(x, y, s + 6) > 0.965) return cor('#b49ad8', x, y, s);
  const t = hash2(x, 0, s) * 0.45 + ruidoT(x, y, 16, 2, s) * 0.3 + hash2(x, y, s) * 0.25;
  const p = rampa(TALO, t, x, y, s);
  if (x % 5 === 2 && hash2(x, y >> 2, s + 3) > 0.25) return escurece(p, 0.84);
  return p;
};

/** Corte do talo: casca, miolo esponjoso com poros e centro rosado. */
function corteRedondo(casca: string, miolo: string[], centro: string): Pintor {
  return (x, y, s) => {
    const r = Math.hypot(x - 7.5, y - 7.5);
    if (r > 6.6 || naBorda(x, y)) return escurece(cor(casca, x, y, s), r > 7.6 ? 0.75 : 1);
    if (r < 1.8) return cor(centro, x, y, s);
    if (hash2(x, y, s + 4) > 0.82) return escurece(rampa(miolo, 0, x, y, s), 0.82);
    return rampa(miolo, hash2(x, y, s) * 0.6 + (1 - r / 7) * 0.4, x, y, s);
  };
}

/** Chapéu de fungo: cor viva, pintas claras redondas e poucas frestas. */
function chapeu(cores: string[], pintas: string[], buracos = 0.05): Pintor {
  return (x, y, s) => {
    const v = voronoi(x, y, s + 5, 4);
    if (hash2(v.id, 3, s) < 0.45 && v.d1 < 1.1 + hash2(v.id, 4, s) * 0.7)
      return rampa(pintas, v.oy < 0 ? 1 : 0, x, y, s);
    const t = fbmT(x, y, 4, s) * 0.55 + hash2(x, y, s) * 0.45;
    if (hash2(x, y, s + 21) < buracos && t < 0.45) return VAZIO;
    return rampa(cores, t, x, y, s);
  };
}

/** Copa de bolhas: esferas translúcidas com reflexo e vãos entre elas. */
const copaBolhas: Pintor = (x, y, s) => {
  const v = voronoi(x, y, s + 2, 4);
  if (v.d2 - v.d1 < 0.5 && hash2(x, y, s + 7) < 0.6) return VAZIO;
  if (v.d1 > 1.9) return cor('#1f6f94', x, y, s);
  if (v.ox < -0.4 && v.oy < -0.4 && v.d1 < 1.3 && v.d1 > 0.5) return cor('#e6fbff', x, y, s);
  return rampa(['#2a8fb8', '#38a6cc', '#4bbcdc', '#66d0ea'], 1 - v.d1 / 2, x, y, s);
};

const taloListrado: Pintor = (x, y, s) => {
  const p = rampa(
    ['#ddd4ec', '#e6def2', '#eee8f7'],
    hash2(x, y, s) * 0.6 + fbmT(x, y, 2, s) * 0.4,
    x,
    y,
    s,
  );
  const anel = mod(y + Math.floor(hash2(x >> 2, 0, s) * 2), 5);
  if (anel === 0) return cor('#7a5ab0', x, y, s);
  if (anel === 1) return cor('#a68ad0', x, y, s);
  return p;
};

/** Haste de quartzo: facetas verticais claras, frias e lisas. */
const hasteQuartzo: Pintor = (x, y, s) => {
  const faceta = Math.floor((x + ((y >> 3) & 1) * 2) / 4);
  const tom = 0.88 + hash2(faceta, y >> 3, s) * 0.2;
  if ((x + ((y >> 3) & 1) * 2) % 4 === 0) return cor('#eef4ff', x, y, s);
  return escurece(
    rampa(['#9fb4d8', '#aec2e2', '#bdd0ea', '#cddcf2'], hash2(x, y, s) * 0.4 + y / 30, x, y, s),
    tom,
  );
};
const corteQuartzo: Pintor = (x, y, s) => {
  const dx = Math.abs(x - 7.5);
  const dy = Math.abs(y - 7.5);
  const r = Math.max(dx * 0.87 + dy * 0.5, dy);
  if (r > 7) return cor('#8296c0', x, y, s);
  const anel = Math.floor(r) % 3;
  return rampa(
    anel === 0 ? ['#eef4ff', '#dce6fa'] : ['#aec2e2', '#bdd0ea'],
    hash2(x, y, s),
    x,
    y,
    s,
  );
};

/** Agulhas de cristal: facetas diagonais lavanda, brilhos e poucas frestas. */
const agulhasCristal: Pintor = (x, y, s) => {
  if (hash2(x, y, s + 21) < 0.07) return VAZIO;
  const f = mod(x * 2 + y * 3 + Math.floor(fbmT(x, y, 2, s) * 4), 10);
  if (f === 0) return cor('#f4f0ff', x, y, s);
  return rampa(['#8e86d8', '#a29ae2', '#b8b0ec', '#d2ccf6'], f / 10, x, y, s);
};

const taloLampiao: Pintor = (x, y, s) => {
  if (y % 5 === 2 && x % 3 === 1) return cor('#7af0c8', x, y, s);
  const p = rampa(
    ['#2c2a4a', '#353256', '#3e3a62', '#47436e'],
    ruidoT(x, y, 8, 2, s) * 0.5 + hash2(x, y, s) * 0.5,
    x,
    y,
    s,
  );
  return x % 4 === 0 ? escurece(p, 0.8) : p;
};
const corteLampiao = corteRedondo('#2c2a4a', ['#3e3a62', '#4a4672', '#56527e'], '#7af0c8');

/** Véus luminosos: fios pendurados que terminam numa gotinha rosa. */
const veus: Pintor = (x, y, s) => {
  if (y < 3) return rampa(['#1c7a6a', '#24907c', '#30a88e'], hash2(x, y, s), x, y, s);
  if (hash2(x, 0, s + 1) < 0.3) return VAZIO;
  const fim = 7 + Math.floor(hash2(x, 2, s) * 9);
  if (y > fim) return VAZIO;
  if (y === fim) return cor('#ff9ad8', x, y, s);
  return rampa(['#24907c', '#30a88e', '#40c0a0', '#5ad8b4'], y / fim, x, y, s);
};

const tapeteTopo: Pintor = (x, y, s) => {
  const r = hash2(x, y, s + 8);
  if (r > 0.94) return cor(r > 0.97 ? '#8ff7d0' : '#c8a0ff', x, y, s);
  return rampa(
    ['#3a3462', '#433c6e', '#4c457a', '#564f86'],
    fbmT(x, y, 4, s) * 0.6 + hash2(x, y, s) * 0.4,
    x,
    y,
    s,
  );
};
const lodo: Pintor = (x, y, s) => {
  const v = voronoi(x, y, s + 9, 4);
  if (hash2(v.id, 2, s) < 0.35) {
    if (v.d1 > 0.8 && v.d1 < 1.35) return cor('#7a5a84', x, y, s);
    if (v.d1 < 0.5) return cor('#9a7aa4', x, y, s);
  }
  return rampa(
    ['#3c2840', '#47304b', '#523856', '#5c4060'],
    hash2(x, y, s) * 0.6 + fbmT(x, y, 4, s) * 0.4,
    x,
    y,
    s,
  );
};

// ---------------------------------------------------------------- plantas em cruz

/** Fios-antena: hastes finas com uma bolinha colorida na ponta, que se curva. */
const fiosAntena: Pintor = (x, y, s) => {
  for (const h of [2, 5, 8, 11, 13]) {
    const alt = 6 + Math.floor(hash2(h, 4, s) * 8);
    const topo = T - alt;
    const curva = y < topo + 3 ? (hash2(h, 6, s) > 0.5 ? 1 : -1) : 0;
    const hx = h + curva;
    if (y >= topo && y <= topo + 1 && (x === hx || x === hx + 1)) {
      const k = hash2(h, 9, s);
      return cor(k < 0.33 ? '#ffd36e' : k < 0.66 ? '#ff8ad0' : '#9af7ff', x, y, s);
    }
    if (y > topo + 1 && x === hx)
      return rampa(['#1a6e66', '#239c90', '#34bfab'], 1 - (y - topo) / alt, x, y, s);
  }
  return VAZIO;
};

/** Flor-estrela: cinco pontas ciano com miolo rosa. */
const florEstrela: Pintor = (x, y, s) => {
  const dx = x - 7.5;
  const dy = y - 5.5;
  const r = Math.hypot(dx, dy);
  const a = Math.atan2(dy, dx) + Math.PI / 2;
  const raio = 2 + 2.4 * Math.pow(Math.abs(Math.cos(a * 2.5)), 2);
  if (r < 1.3) return cor('#ff5fb0', x, y, s);
  if (r < raio) return rampa(['#c8fcff', '#8ff4ff', '#4fdcec'], r / raio, x, y, s);
  if ((x === 7 || x === 8) && y >= 9) return rampa(['#1f8a80', '#2aae9f'], hash2(x, y, s), x, y, s);
  if ((y === 12 && (x === 5 || x === 6)) || (y === 11 && (x === 9 || x === 10)))
    return cor('#34bfab', x, y, s);
  return VAZIO;
};

/** Bulbo luminoso: lâmpada viva amarelo-esverdeada num cabinho cinza. */
const bulbo: Pintor = (x, y, s) => {
  const d = Math.hypot(x - 7, y - 5.5);
  if (d < 4.2) {
    if (Math.hypot(x - 5.6, y - 4) < 1.1) return cor('#ffffe0', x, y, s);
    return rampa(['#e8ff8a', '#b8f060', '#7ad850'], d / 4.2, x, y, s);
  }
  const d2 = Math.hypot(x - 11.5, y - 10.5);
  if (d2 < 1.9) return rampa(['#f0ff9a', '#9ae060'], d2 / 1.9, x, y, s);
  if ((x === 7 || x === 8) && y >= 9) return rampa(['#8a8a96', '#9a9aa4'], hash2(x, y, s), x, y, s);
  if (x === 10 && y >= 12) return cor('#8a8a96', x, y, s);
  if (y === 12 && x === 9) return cor('#8a8a96', x, y, s);
  return VAZIO;
};

function pertoDoSegmento(
  x: number,
  y: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const vx = bx - ax;
  const vy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(x - ax - vx * t, y - ay - vy * t);
}
const RAMOS: [number, number, number, number][] = [
  [7.5, 15.5, 7.5, 8],
  [7.5, 10, 3.5, 5],
  [7.5, 9, 11.5, 4],
  [3.5, 5, 2.5, 2],
  [11.5, 4, 13, 1.5],
  [7.5, 8, 7, 2.5],
];
/** Galho-coral: ramos que se dividem e terminam em pontas redondas. */
const galhoCoral: Pintor = (x, y, s) => {
  const cx = x + 0.5;
  const cy = y + 0.5;
  for (const [, , bx, by] of RAMOS.slice(1))
    if (Math.hypot(cx - bx, cy - by) < 1.3) return cor('#ffc0a8', x, y, s);
  for (const [ax, ay, bx, by] of RAMOS)
    if (pertoDoSegmento(cx, cy, ax, ay, bx, by) < 0.8)
      return rampa(['#d8705a', '#e8806a', '#f0957a'], hash2(x, y, s), x, y, s);
  return VAZIO;
};

/** Tubos-flauta: tubos cinzentos com ponta brilhante rosa. */
const tubos: Pintor = (x, y, s) => {
  for (const h of [2, 6, 10, 13]) {
    if (x !== h && x !== h + 1) continue;
    const topo = 2 + Math.floor(hash2(h, 0, s) * 8);
    if (y < topo) continue;
    if (y === topo) return cor('#ffb0e0', x, y, s);
    if (y === topo + 1) return cor('#ff70c0', x, y, s);
    return rampa(['#6f8580', '#7d938e', '#8aa09a'], x === h ? 0 : 0.8, x, y, s);
  }
  return VAZIO;
};

/** Arbusto de pérolas: frondes turquesa com pérolas rosadas. */
const arbustoPerolas: Pintor = (x, y, s) => {
  if (y < 3 || x < 1 || x > 14) return VAZIO;
  const v = voronoi(x, y, s + 4, 4);
  if (hash2(v.id, 1, s) < 0.55 && v.d1 < 1.25) {
    if (v.ox < 0 && v.oy < 0 && v.d1 < 0.8) return cor('#ffffff', x, y, s);
    return rampa(['#f8e0f0', '#e8b8dc'], v.d1 / 1.25, x, y, s);
  }
  const t = fbmT(x, y, 4, s) * 0.5 + hash2(x, y, s) * 0.5;
  if (hash2(x, y, s + 21) < 0.35 && t < 0.6) return VAZIO;
  return rampa(['#1a7a6c', '#1f8a7a', '#28a08c', '#32b49e'], t, x, y, s);
};

// ---------------------------------------------------------------- frio

const GEADA = ['#dfe0f8', '#e6e8fb', '#eef0fd', '#f7f8ff'];
const geada: Pintor = (x, y, s) => {
  const v = voronoi(x, y, s + 3, 8);
  if (
    hash2(v.id, 1, s) < 0.7 &&
    ((Math.abs(v.ox) < 0.6 && Math.abs(v.oy) < 2.2) ||
      (Math.abs(v.oy) < 0.6 && Math.abs(v.ox) < 2.2))
  )
    return cor('#aab6f4', x, y, s);
  return rampa(GEADA, fbmT(x, y, 4, s) * 0.4 + hash2(x, y, s) * 0.6, x, y, s);
};
const geadaLado = ladoComTopo(
  (x, y, s) => rampa(GEADA, hash2(x, y, s), x, y, s),
  soloAmbar,
  '#a8acd8',
  3,
);
const geloLilas: Pintor = (x, y, s) => {
  const v = voronoi(x, y, s + 6, 8);
  if (v.d2 - v.d1 < 0.5) return cor('#eceeff', x, y, s);
  return rampa(
    ['#9a9ee8', '#a6aaee', '#b2b6f3', '#bfc2f6'],
    fbmT(x, y, 2, s) * 0.6 + hash2(x, y, s) * 0.2 + (v.oy < 0 ? 0.2 : 0),
    x,
    y,
    s,
  );
};

// ---------------------------------------------------------------- cacto-balão

const cactoLado: Pintor = (x, y, s) => {
  if (x === 0 || x === T - 1) return VAZIO;
  if ((x * 3 + y * 5) % 11 === 0 && x > 1 && x < T - 2) return cor('#fff4fc', x, y, s);
  const brilho = x >= 3 && x <= 4 ? 0.85 : 0;
  const p = rampa(
    ['#b85aa8', '#c868b6', '#d478c2', '#e092d0'],
    brilho + hash2(x, y, s) * 0.5,
    x,
    y,
    s,
  );
  if (y % 4 === 0) return escurece(p, 0.82);
  if (x === 1 || x === T - 2) return escurece(p, 0.8);
  return p;
};
const cactoTopo: Pintor = (x, y, s) => {
  const r = Math.hypot(x - 7.5, y - 7.5);
  if (r > 6.8) return VAZIO;
  const a = Math.atan2(y - 7.5, x - 7.5);
  if (r < 1.2 + Math.abs(Math.cos(a * 2.5)) * 1.6)
    return cor(r < 1 ? '#ff9a3a' : '#ffd36e', x, y, s);
  return rampa(['#b85aa8', '#c868b6', '#d478c2'], 1 - r / 7 + hash2(x, y, s) * 0.3, x, y, s);
};

// ---------------------------------------------------------------- cristais de energia

const cristalEnergia: Pintor = (x, y, s) => {
  if (naBorda(x, y)) return cor('#0e6a5c', x, y, s);
  if (mod(x - y, 8) === 0 || mod(x + y, 11) === 0) return cor('#d8fff4', x, y, s);
  const faceta = (Math.abs(x - 7.5) + y * 0.5) % 6;
  return rampa(
    ['#12a08a', '#1ec0a2', '#36dcb8', '#6af0d0'],
    (faceta / 6) * 0.6 + fbmT(x, y, 2, s) * 0.4,
    x,
    y,
    s,
  );
};

const blocoEnergita: Pintor = (x, y, s) => {
  if (naBorda(x, y)) return cor('#0a3a36', x, y, s);
  const lx = x % 8 === 3;
  const ly = y % 8 === 4;
  if (lx && ly) return cor('#e0fff6', x, y, s);
  if (lx || ly) return cor('#3ae8c0', x, y, s);
  return rampa(
    ['#0e5a52', '#12685e', '#167468'],
    hash2(x, y, s) * 0.5 + fbmT(x, y, 2, s) * 0.5,
    x,
    y,
    s,
  );
};

// ---------------------------------------------------------------- construções

const PLACA = ['#dccdb4', '#e4d6be', '#ebdfc8'];
/** Placas de talo: quatro painéis chanfrados com poros. */
const placasTalo: Pintor = (x, y, s) => {
  const px = x % 8;
  const py = y % 8;
  if (px === 0 || py === 0) return cor('#9a8a72', x, y, s);
  if (px === 1 || py === 1) return cor('#f6eedc', x, y, s);
  if (px === 7 || py === 7) return cor('#c4b49a', x, y, s);
  if (hash2(x, y, s + 3) > 0.88) return cor('#c8b89e', x, y, s);
  return rampa(PLACA, hash2(x, y, s), x, y, s);
};
const placasListradas: Pintor = (x, y, s) => {
  const tabua = y >> 2;
  if (y % 4 === 3) return cor('#8a76aa', x, y, s);
  if (y % 4 === 1 && (x + tabua * 3) % 3 === 0) return cor('#9a7ad0', x, y, s);
  return escurece(
    rampa(['#d8cce8', '#e0d6ee', '#e8e0f4'], hash2(x, y, s), x, y, s),
    0.92 + hash2(tabua, 0, s) * 0.1,
  );
};
const placasQuartzo: Pintor = (x, y, s) => {
  const tabua = y >> 2;
  if (y % 4 === 3) return cor('#6a7eaa', x, y, s);
  if (mod(x - y * 2, 13) < 2) return cor('#eef4ff', x, y, s);
  return escurece(
    rampa(['#9fb4d8', '#aec2e2', '#bdd0ea'], hash2(x, y, s), x, y, s),
    0.92 + hash2(tabua, 0, s) * 0.1,
  );
};

const vidroQuartzo: Pintor = (x, y, s) => {
  const canto = (x === 0 || x === T - 1) && (y === 0 || y === T - 1);
  if (canto) return VAZIO;
  if (naBorda(x, y)) return rampa(['#c8b8f0', '#d8ccf8'], hash2(x, y, s), x, y, s);
  const r = Math.hypot(x - 6, y - 6);
  if (r > 2.6 && r < 3.4 && x < 6 && y < 6) return [248, 244, 255, 255];
  if (x === 11 && y === 11) return [248, 244, 255, 255];
  return VAZIO;
};

const bastaoLuminoso: Pintor = (x, y, s) => {
  if (x >= 7 && x <= 8 && y >= 6) {
    if (y === 6 || y === 11) return cor('#a8a8b8', x, y, s);
    return rampa(['#4a4a5a', '#5a5a6a'], x === 7 ? 0 : 1, x, y, s);
  }
  if (x >= 6 && x <= 9 && y >= 1 && y <= 5) {
    if ((x === 6 || x === 9) && (y === 1 || y === 5)) return VAZIO;
    const d = Math.hypot(x - 7.5, y - 3) / 2.6;
    return rampa(['#e0fff8', '#9affe0', '#5affc8'], d, x, y, s);
  }
  return VAZIO;
};

const luminariaBolha: Pintor = (x, y, s) => {
  if (x <= 1 || x >= T - 2 || y <= 1 || y >= T - 2) {
    if ((x <= 1 || x >= T - 2) && (y <= 1 || y >= T - 2)) return cor('#9a8ac0', x, y, s);
    return rampa(['#4a4060', '#5a5070'], hash2(x, y, s), x, y, s);
  }
  const d = Math.hypot(x - 7.5, y - 7.5);
  if (d > 5.6) return cor('#3a3050', x, y, s);
  if (Math.hypot(x - 6, y - 5.5) < 1.2) return cor('#ffffff', x, y, s);
  return rampa(['#ffe0f4', '#ffa8e0', '#ff7ad0'], d / 5.6, x, y, s);
};

// bancada de pesquisa
const METAL = ['#b8b4c8', '#c0bcd0', '#c8c4d8'];
const bancadaTopo: Pintor = (x, y, s) => {
  if (naBorda(x, y)) return cor('#5a5070', x, y, s);
  if (x >= 2 && x <= 7 && y >= 2 && y <= 6) {
    if (x === 2 || x === 7 || y === 2 || y === 6) return cor('#2a2a3e', x, y, s);
    return cor(y === 4 && x > 2 && x < 7 ? '#5af0d0' : '#1e2440', x, y, s);
  }
  const f = Math.hypot(x - 11, y - 11);
  if (f < 2.2) return cor(f < 1.4 ? '#ff7ad0' : '#e8f0ff', x, y, s);
  if (x % 4 === 0 || y % 4 === 0) return cor('#9a96ae', x, y, s);
  return rampa(METAL, hash2(x, y, s), x, y, s);
};
const bancadaLado: Pintor = (x, y, s) => {
  if (y < 3) return rampa(['#5a5070', '#665c7c'], hash2(x, y, s), x, y, s);
  if (y > 4 && y < 14 && x % 4 === 2) return cor('#8a86a0', x, y, s);
  if (x === 0 || x === T - 1 || y === T - 1) return cor('#7a7690', x, y, s);
  return rampa(['#d4d0e0', '#dcd8e8', '#e4e0ee'], hash2(x, y, s), x, y, s);
};
const bancadaFrente: Pintor = (x, y, s) => {
  if (y < 3) return rampa(['#5a5070', '#665c7c'], hash2(x, y, s), x, y, s);
  if (x >= 3 && x <= 12 && y >= 4 && y <= 10) {
    if (x === 3 || x === 12 || y === 4 || y === 10) return cor('#2a2a3e', x, y, s);
    const linha = 8 - Math.round(Math.sin(x * 0.9) * 1.6 + 0.5);
    if (y === linha) return cor('#7af7a0', x, y, s);
    return cor('#162030', x, y, s);
  }
  if (y === 12 && (x === 4 || x === 7 || x === 10))
    return cor(x === 4 ? '#ff7a8a' : x === 7 ? '#ffd36e' : '#5af0d0', x, y, s);
  return bancadaLado(x, y, s);
};

// forno solar
const PAINEL = ['#c8d4dc', '#ced9e1', '#d4dee6'];
const fornoLado: Pintor = (x, y, s) => {
  const px = x % 8;
  const py = y % 8;
  if (px === 0 || py === 0) return cor('#8a96a0', x, y, s);
  if ((px === 1 || px === 7) && (py === 1 || py === 7)) return cor('#6a7480', x, y, s);
  return rampa(PAINEL, hash2(x, y, s) * 0.5 + (y % 8) / 16, x, y, s);
};
const fornoTopo: Pintor = (x, y, s) => {
  if (naBorda(x, y)) return cor('#8a96a0', x, y, s);
  if (x % 5 === 0 || y % 5 === 0) return cor('#9ab0d8', x, y, s);
  if (mod(x - y, 9) === 0) return cor('#6a8ae0', x, y, s);
  return rampa(['#2a4a9a', '#3054a6', '#3458b0'], hash2(x, y, s), x, y, s);
};
function fornoFrente(ligado: boolean): Pintor {
  return (x, y, s) => {
    const d = Math.hypot(x - 7.5, y - 9.5);
    if (d < 3.6) {
      if (!ligado)
        return rampa(['#141824', '#1a2030'], hash2(x, y, s) + (d < 1.5 ? 0.5 : 0), x, y, s);
      return rampa(
        ['#fff4b0', '#ffd070', '#ff9a4a', '#ff6a3a'],
        d / 3.6 + hash2(x, y, s) * 0.15,
        x,
        y,
        s,
      );
    }
    if (d < 4.6) return cor('#6a7480', x, y, s);
    if (y === 3 && x >= 4 && x <= 11 && x % 2 === 0) return cor('#4a5460', x, y, s);
    if (x === 13 && y === 3) return cor(ligado ? '#7af7a0' : '#ff7a8a', x, y, s);
    return fornoLado(x, y, s);
  };
}

// caixa de amostras
const CAIXA = ['#d8e4e6', '#dfeaec', '#e6f0f2'];
function caixa(miolo: Pintor): Pintor {
  return (x, y, s) => {
    if (x <= 1 || y <= 1 || x >= T - 2 || y >= T - 2) {
      if (naBorda(x, y)) return cor('#3a4a58', x, y, s);
      return rampa(['#4a5a68', '#566676'], hash2(x, y, s), x, y, s);
    }
    return miolo(x, y, s);
  };
}
const caixaLado = caixa((x, y, s) =>
  y === 6 || y === 7 ? cor('#ff9a4a', x, y, s) : rampa(CAIXA, hash2(x, y, s), x, y, s),
);
const caixaTopo = caixa((x, y, s) => {
  if (x === 4 || x === 11 || y === 4 || y === 11) return cor('#9aaab4', x, y, s);
  if (x > 4 && x < 11 && y > 4 && y < 11) return cor((x + y) % 2 ? '#ff9a4a' : '#ffb06a', x, y, s);
  return rampa(CAIXA, hash2(x, y, s), x, y, s);
});
const caixaFrente: Pintor = (x, y, s) => {
  if (x >= 6 && x <= 9 && y >= 5 && y <= 8) {
    if (x === 6 || x === 9 || y === 5 || y === 8) return cor('#3a4a58', x, y, s);
    return cor('#5af0d0', x, y, s);
  }
  return caixaLado(x, y, s);
};

const ladrilhos = tijolosDe(['#c8606e', '#d06c7a', '#d87886', '#e08492'], '#f0dce0', 4, 4);
const alvenaria = tijolosDe(['#625677', '#6c6082', '#766a8c'], '#2a2a44', 8, 8);
const rochaPolida: Pintor = (x, y, s) => {
  if (naBorda(x, y)) return cor('#5a4f72', x, y, s);
  if (x === 1 || y === 1) return cor('#b4a8d0', x, y, s);
  if (x === T - 2 || y === T - 2) return cor('#7a6e96', x, y, s);
  return rampa(
    ['#8e82aa', '#9488b0', '#9a8eb6'],
    hash2(x, y, s) * 0.3 + (Math.sin((x + y) * 0.4 + fbmT(x, y, 2, s) * 3) * 0.5 + 0.5) * 0.7,
    x,
    y,
    s,
  );
};

/** Pelúcia: tufos fofos redondinhos (claros no meio, escuros nas bordas). */
function pelucia(c: string): Pintor {
  const rgb = hex(c);
  return (x, y, s) => {
    const v = voronoi(x, y, s + 11, 4);
    // tufo: topo claro, base sombreada, fiozinhos e brilho no alto
    let f = 1.02 - Math.max(0, v.oy) * 0.07 - (v.d2 - v.d1 < 0.45 ? 0.08 : 0);
    if (v.ox < 0 && v.oy < 0 && v.d1 < 1.3) f += 0.1;
    if ((x * 2 + y) % 3 === 0) f -= 0.04;
    f += hash2(x, y, s) * 0.05;
    return [rgb[0] * f, rgb[1] * f, rgb[2] * f, 255];
  };
}

// cápsula de sono
const capsulaTopo: Pintor = (x, y, s) => {
  if (y < 5) {
    if (y === 4 || x === 0 || x === T - 1) return cor('#c8c0dc', x, y, s);
    return rampa(['#eee8f8', '#f6f2fc'], hash2(x, y, s), x, y, s);
  }
  if (x === 0 || x === T - 1) return cor('#2a2a6a', x, y, s);
  if (hash2(x, y, s + 4) > 0.93) return cor('#ffe27a', x, y, s);
  return rampa(['#3a3a8a', '#40409a', '#4646a4'], hash2(x, y, s), x, y, s);
};
const capsulaLado: Pintor = (x, y, s) => {
  if (y < 6) return capsulaTopo(x, y + 6, s);
  if (y < 8) return cor('#e8e8f4', x, y, s);
  if (y === 8) return cor('#40c8b0', x, y, s);
  if (y === T - 1) return cor('#5a6078', x, y, s);
  return rampa(['#8a90a8', '#949ab2'], hash2(x, y, s), x, y, s);
};

const escotilha: Pintor = (x, y, s) => {
  const d = Math.hypot(x - 7.5, y - 4.5);
  if (d < 2.9) return VAZIO;
  if (d < 4.1) return rampa(['#c8d0e0', '#dce2ee'], hash2(x, y, s), x, y, s);
  if (x >= 11 && x <= 12 && y >= 9 && y <= 10) return cor('#ffb040', x, y, s);
  const p = rampa(['#7a8aa0', '#8696ac', '#92a2b8'], hash2(x, y, s) * 0.4 + (x % 8) / 12, x, y, s);
  if ((x === 2 || x === 13) && y % 4 === 2) return cor('#c8d0e0', x, y, s);
  if (x === 7 && y > 8) return escurece(p, 0.75);
  return naBorda(x, y) ? escurece(p, 0.7) : p;
};

// cabaça-lua
const CABACA = ['#8ad0d8', '#9adae0', '#aae4e8'];
const cabacaLado: Pintor = (x, y, s) => {
  if (hash2(x, y, s + 3) > 0.95) return cor('#e8fbff', x, y, s);
  const gomo = x % 5 === 0;
  return rampa(
    gomo ? ['#5aa0b4', '#6ab0c0'] : CABACA,
    hash2(x, y, s) * 0.6 + ruidoT(x, y, 4, 1, s) * 0.4,
    x,
    y,
    s,
  );
};
const cabacaTopo: Pintor = (x, y, s) => {
  const r = Math.hypot(x - 7.5, y - 7.5);
  if (r < 1.6) return rampa(['#6a4a90', '#7a5aa0'], hash2(x, y, s), x, y, s);
  const a = Math.atan2(y - 7.5, x - 7.5);
  if (Math.abs(Math.sin(a * 2.5)) < 0.12) return cor('#5aa0b4', x, y, s);
  return rampa(CABACA, hash2(x, y, s) * 0.5 + (r / 11) * 0.5, x, y, s);
};
const cabacaRosto: Pintor = (x, y, s) => {
  const olho = Math.hypot(x - 4.5, y - 5) < 1.7 || Math.hypot(x - 10.5, y - 5) < 1.7;
  const dy = y - (8.5 + Math.pow((x - 7.5) / 4, 2) * -2);
  const boca = x >= 3 && x <= 12 && dy > 1 && dy < 3.2;
  if (olho || boca) return rampa(['#ffe0f4', '#ff8ad8'], hash2(x, y, s), x, y, s);
  return cabacaLado(x, y, s);
};

/** Pintores do Planeta Vivo, por nome do tile. */
export const PINTORES_PLANETA: Record<string, Pintor> = {
  grama_topo: liquenTopo,
  grama_lado: liquenLado,
  terra: soloAmbar,
  pedra: rochaVioleta,
  areia: areiaRosada,
  tronco: taloFungo,
  tronco_topo: corteRedondo('#c8b8a0', ['#e8dcc8', '#efe4d2', '#f4ecdc'], '#f0c8d0'),
  folhas: chapeu(['#a82a62', '#b8326e', '#c93c7c', '#d6488a', '#e25898'], ['#f0d8e4', '#fff4f8']),
  cristal: cristalEnergia,
  tabuas: placasTalo,
  grama_alta: fiosAntena,
  flor: florEstrela,
  cogumelo: bulbo,
  pedregulho: seixos,
  cascalho,
  rocha_matriz: nucleo,
  min_carvao: cristais(['#141018', '#211a28', '#2e2538'], '#e8e0ff'),
  min_cobre: cristais(['#b8243a', '#d83a4c', '#f25c62'], '#ffc0b8'),
  min_ferro: cristais(['#9aa6b8', '#bcc8d8', '#dfe8f2'], '#ffffff'),
  min_ouro: cristais(['#e09a12', '#f5c22a', '#ffe25a'], '#fff8c0'),
  min_luzita: cristais(['#18b89a', '#2ee0b8', '#7af7d8'], '#e0fff4'),
  neve: geada,
  neve_lado: geadaLado,
  gelo: geloLilas,
  arenito_lado: arenitoLado,
  arenito_topo: arenitoTopo,
  areia_deserto: poDuna,
  cacto_lado: cactoLado,
  cacto_topo: cactoTopo,
  arbusto_seco: galhoCoral,
  betula: taloListrado,
  betula_topo: corteRedondo('#7a5ab0', ['#e6def2', '#eee8f7'], '#a68ad0'),
  folhas_betula: copaBolhas,
  pinho: hasteQuartzo,
  pinho_topo: corteQuartzo,
  folhas_pinho: agulhasCristal,
  pantano_topo: tapeteTopo,
  pantano_lado: ladoComTopo(
    tapeteTopo,
    // raízes luminosas do tapete descendo pelo lodo
    (x, y, s) =>
      x % 5 === 2 && y < 6 + hash2(x, 3, s) * 8 ? cor('#5ad8b4', x, y, s) : lodo(x, y, s),
    '#262044',
    4,
  ),
  lama: lodo,
  junco: tubos,
  tronco_lanterna: taloLampiao,
  tronco_lanterna_topo: corteLampiao,
  folhas_lanterna: veus,
  vidro: vidroQuartzo,
  tocha: bastaoLuminoso,
  lanterna: luminariaBolha,
  bloco_luzita: blocoEnergita,
  mesa_topo: bancadaTopo,
  mesa_lado: bancadaLado,
  mesa_frente: bancadaFrente,
  fornalha_lado: fornoLado,
  fornalha_topo: fornoTopo,
  fornalha_frente: fornoFrente(false),
  fornalha_acesa: fornoFrente(true),
  bau_lado: caixaLado,
  bau_topo: caixaTopo,
  bau_frente: caixaFrente,
  tijolos: ladrilhos,
  tijolos_pedra: alvenaria,
  pedra_lisa: rochaPolida,
  la_branca: pelucia('#f0ecf4'),
  la_vermelha: pelucia('#d8344a'),
  la_laranja: pelucia('#f08a2a'),
  la_amarela: pelucia('#f4d03a'),
  la_verde: pelucia('#4cc070'),
  la_azul: pelucia('#3a6ae0'),
  la_roxa: pelucia('#9a4ad8'),
  la_preta: pelucia('#2a2634'),
  frutinhas: arbustoPerolas,
  folhas_outono: chapeu(
    ['#c85a30', '#d8693a', '#e47a42', '#ee8c4e', '#f59e5c'],
    ['#fff0d8', '#fffaf0'],
  ),
  cama_topo: capsulaTopo,
  cama_lado: capsulaLado,
  porta: escotilha,
  tabuas_betula: placasListradas,
  tabuas_pinho: placasQuartzo,
  abobora_lado: cabacaLado,
  abobora_topo: cabacaTopo,
  abobora_rosto: cabacaRosto,
};

/** Tiles que brilham: os do jogo base e as pontas dos tubos-flauta. */
export const EMISSIVOS_PLANETA = [
  'cristal',
  'flor',
  'cogumelo',
  'min_luzita',
  'folhas_lanterna',
  'tocha',
  'lanterna',
  'bloco_luzita',
  'fornalha_acesa',
  'abobora_rosto',
  'junco',
];
