import {
  T,
  VAZIO,
  aneisDe,
  escurece,
  fbmT,
  hex,
  ladoComTopo,
  rampa,
  ruidoPaleta,
  ruidoT,
  tabuasDe,
  tijolosDe,
  terraAradaDe,
  trigoDe,
  milhoDe,
  aboboreiraDe,
  fenoLadoDe,
  fenoTopoDe,
} from '../../art/atlas';
import { hash2 as H } from '../../world/noise';
import type { Pintor, Px } from '../tipos';

/**
 * Pintores da Mata Encantada: chão de mata com serapilheira sobre terra roxa, granito
 * com faixas de gnaisse, pedras preciosas em cristais facetados, ipês floridos,
 * araucárias, samambaias e bromélias, chita colorida, cesto de taquara e forno de barro.
 */

const mod = (a: number, n: number) => ((a % n) + n) % n;
const cor = (c: string, x: number, y: number, s: number): Px => rampa([c], 0, x, y, s);
const clareia = (p: Px, f: number): Px => [
  p[0] + (255 - p[0]) * f,
  p[1] + (255 - p[1]) * f,
  p[2] + (255 - p[2]) * f,
  p[3],
];

/** Distância de (px, py) ao segmento a-b. */
function distSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax;
  const vy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(px - ax - vx * t, py - ay - vy * t);
}

/** Pedras arredondadas (Voronoi que se repete): devolve distâncias e id da pedra. */
function voronoi(x: number, y: number, s: number, cel: number) {
  const n = T / cel;
  let d1 = 99;
  let d2 = 99;
  let id = 0;
  let ox = 0;
  let oy = 0;
  const gx = Math.floor(x / cel);
  const gy = Math.floor(y / cel);
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const cx = gx + i;
      const cy = gy + j;
      const kx = mod(cx, n);
      const ky = mod(cy, n);
      const px = (cx + 0.2 + H(kx, ky, s) * 0.6) * cel;
      const py = (cy + 0.2 + H(kx, ky, s + 1) * 0.6) * cel;
      const d = Math.hypot(x + 0.5 - px, y + 0.5 - py);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        id = kx * 7 + ky;
        ox = x + 0.5 - px;
        oy = y + 0.5 - py;
      } else if (d < d2) d2 = d;
    }
  return { d1, d2, id, ox, oy };
}

// --- chão ------------------------------------------------------------------------

const VERDE_MATA = ['#1f5a24', '#27682a', '#2f7630', '#398538', '#469442'];
const TERRA_ROXA = ['#4c221b', '#5a2920', '#683125', '#76392a'];

const chaoTopo: Pintor = (x, y, s) => {
  const r = H(x, y, s + 5);
  if (r > 0.978) return cor('#f2c230', x, y, s); // pétala de ipê caída
  if (r > 0.958) return cor(H(x, y, s + 6) > 0.5 ? '#9a5a2a' : '#7a4a24', x, y, s); // folha seca
  const t = fbmT(x, y, 4, s) * 0.55 + H(x, y, s) * 0.45;
  const p = rampa(VERDE_MATA, t, x, y, s);
  // tufos: risquinhos diagonais mais escuros
  if (mod(x + y * 3 + Math.floor(H(x >> 2, y >> 2, s + 3) * 4), 6) === 0) return escurece(p, 0.8);
  if (H(x, y, s + 7) > 0.93) return clareia(p, 0.18);
  return p;
};

const terraRoxa: Pintor = (x, y, s) => {
  const r = H(x, y, s + 3);
  if (r > 0.955) return cor('#a5543a', x, y, s);
  if (r < 0.04) return cor('#2c130f', x, y, s);
  if (H(x >> 1, y, s + 11) > 0.94) return cor('#8a6e60', x, y, s); // pedrinha
  return rampa(TERRA_ROXA, fbmT(x, y, 4, s) * 0.5 + H(x, y, s) * 0.5, x, y, s);
};

const chaoLado: Pintor = (x, y, s) => {
  let borda = 2 + Math.floor(H(x, 0, s + 17) * 2);
  // raizinhas e folhas que descem pela terra
  if (H(x, 1, s + 17) > 0.7) borda += 1 + Math.floor(H(x, 2, s + 17) * 3);
  if (y < borda) return rampa(VERDE_MATA, 0.25 + H(x, y, s) * 0.75, x, y, s);
  if (y === borda) return cor('#1a3a18', x, y, s);
  if (y === borda + 1 && H(x, 3, s) > 0.6) return cor('#3a1a14', x, y, s);
  return terraRoxa(x, y, s);
};

// --- pedras ----------------------------------------------------------------------

const GRANITO = ['#5b5d64', '#66686f', '#72747a', '#7e8086', '#8b8d92'];

/** Granito com faixas onduladas de gnaisse, feldspato rosado e pontinhos de mica. */
export const granito: Pintor = (x, y, s) => {
  const faixa = Math.sin(((y * 2 + x) / 16) * Math.PI * 2 + fbmT(x, y, 2, s + 4) * 3);
  const t = fbmT(x, y, 4, s) * 0.45 + H(x, y, s) * 0.35 + (faixa * 0.5 + 0.5) * 0.2;
  let p = rampa(GRANITO, t, x, y, s);
  if (faixa > 0.75) p = escurece(p, 0.8);
  else if (faixa < -0.85) p = clareia(p, 0.1);
  const r = H(x, y, s + 4);
  if (r > 0.955) return cor('#c4a49c', x, y, s);
  if (r < 0.035) return cor('#2a2a30', x, y, s);
  return p;
};

/** Pedra preciosa: cristais facetados com contorno escuro sobre o granito. */
function gema(faces: [string, string, string], brilho: string, nucleo?: string, n = 4): Pintor {
  return (x, y, s) => {
    for (let k = 0; k < n; k++) {
      const cx = 2.5 + H(k, 1, s + 50) * 11;
      const cy = 2.5 + H(k, 2, s + 50) * 11;
      const r = 1.9 + H(k, 3, s + 50) * 1.1;
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.abs(dx) * 1.2 + Math.abs(dy) * 0.75;
      if (d < r) {
        if (Math.abs(dx) < 0.6 && dy < -r * 0.25) return cor(brilho, x, y, s);
        if (nucleo && d < r * 0.5) return cor(nucleo, x, y, s);
        const face = dx < 0 ? (dy < 0 ? 2 : 1) : dy < 0 ? 1 : 0;
        return cor(faces[face], x, y, s);
      }
      if (d < r + 0.9) return escurece(granito(x, y, s), 0.5);
    }
    return granito(x, y, s);
  };
}

const veioCarvao: Pintor = (x, y, s) => {
  const n = fbmT(x, y, 4, s + 77);
  const v = H(x, y, s + 13);
  if (n > 0.6 && v > 0.15) {
    if (v > 0.9) return cor('#5c5c68', x, y, s);
    return rampa(['#121214', '#1b1b20', '#25252c'], (n - 0.6) * 3, x, y, s);
  }
  if (n > 0.56) return escurece(granito(x, y, s), 0.7);
  return granito(x, y, s);
};

const pedraDeRio: Pintor = (x, y, s) => {
  const v = voronoi(x, y, s, 4);
  if (v.d2 - v.d1 < 0.85) return cor('#2c2826', x, y, s);
  const tons = ['#7d7064', '#6b717a', '#8c7c6a', '#62686e', '#857a70'];
  const base = tons[v.id % tons.length];
  // luz vinda de cima à esquerda: pedra roliça
  const luz = -(v.ox + v.oy) * 0.12 - v.d1 * 0.06;
  const p = rampa([base], 0, x, y, s);
  return luz > 0 ? clareia(p, Math.min(0.35, luz)) : escurece(p, Math.max(0.7, 1 + luz));
};

const seixos: Pintor = (x, y, s) => {
  const bx = x >> 1;
  const by = y >> 1;
  if (H(bx, by, s + 9) < 0.2) return rampa(['#3a302a', '#433830'], H(x, y, s), x, y, s);
  const tons = ['#cbbca4', '#a35c3c', '#7c7c84', '#ddd3c2', '#5e4c42', '#b8a27c'];
  const p = cor(tons[Math.floor(H(bx, by, s) * tons.length)], x, y, s);
  // cada seixo tem um brilho no canto de cima
  if ((x & 1) === 0 && (y & 1) === 0) return clareia(p, 0.2);
  if ((x & 1) === 1 && (y & 1) === 1) return escurece(p, 0.82);
  return p;
};

const rochaFundo: Pintor = (x, y, s) => {
  // colunas de basalto com juntas desencontradas
  const col = x >> 2;
  if ((x & 3) === 0) return cor('#141218', x, y, s);
  if (mod(y + col * 5, 8) === 0) return cor('#18161c', x, y, s);
  const p = rampa(
    ['#24222a', '#2e2b34', '#38343f', '#433e4a'],
    H(x, y, s) * 0.5 + H(col, (y + col * 5) >> 3, s + 2) * 0.5,
    x,
    y,
    s,
  );
  return (x & 3) === 1 ? clareia(p, 0.08) : p;
};

// --- areias e sertão -------------------------------------------------------------

const areiaRestinga: Pintor = (x, y, s) => {
  const r = H(x, y, s + 2);
  if (r > 0.975) return cor('#f2a8a0', x, y, s); // conchinha rosada
  if (r > 0.94) return cor('#c8bb9c', x, y, s);
  return rampa(
    ['#e6dcc0', '#ece4cc', '#f2ebd8', '#f7f2e4'],
    fbmT(x, y, 4, s) * 0.4 + H(x, y, s) * 0.6,
    x,
    y,
    s,
  );
};

const areiaSertao: Pintor = (x, y, s) => {
  if (H(x, y, s + 4) > 0.975) return cor('#6a4a2a', x, y, s); // gravetinho
  const onda = Math.sin(((y * 3 + x) / 16) * Math.PI * 2 + fbmT(x, y, 2, s) * 2.5) * 0.5 + 0.5;
  return rampa(
    ['#c08446', '#ca9050', '#d49c5c', '#dea868'],
    onda * 0.5 + H(x, y, s) * 0.5,
    x,
    y,
    s,
  );
};

const ARENITO = ['#9e4a2c', '#b45e36', '#c87442', '#d88a50'];
const arenitoLado: Pintor = (x, y, s) => {
  const ondula = Math.sin((x / 16) * Math.PI * 2) * 1.2;
  const camada = Math.floor((y + ondula + 16) / 3);
  const t = (mod(camada * 3, 4) + H(x, y, s) * 0.9) / 4;
  const p = rampa(ARENITO, t, x, y, s);
  if (mod(Math.floor(y + ondula + 16), 3) === 0) return escurece(p, 0.85);
  return p;
};

const arenitoTopo: Pintor = (x, y, s) => {
  const p = ruidoPaleta(['#b05a34', '#bd673c', '#c97444', '#d4804c'], 4, 0.5)(x, y, s);
  const rachado = Math.abs(ruidoT(x, y, 4, 4, s + 9) - 0.5) < 0.035;
  return rachado ? escurece(p, 0.7) : p;
};

const mandacaruLado: Pintor = (x, y, s) => {
  if (x === 0 || x === T - 1) return VAZIO;
  const k = x & 3;
  // aréolas com espinhos brancos nas costelas, de 4 em 4
  if (k === 1 && mod(y + (x >> 2) * 2, 4) === 0) return cor('#f2ecd8', x, y, s);
  if (k === 1 && mod(y + (x >> 2) * 2, 4) === 1) return cor('#cbb878', x, y, s);
  if (k === 3) return rampa(['#1f4a3c', '#245442'], H(x, y, s), x, y, s);
  return rampa(
    k === 1 ? ['#4a9474', '#55a07e'] : ['#2f6a54', '#367560', '#3f806a'],
    H(x, y, s),
    x,
    y,
    s,
  );
};

const mandacaruTopo: Pintor = (x, y, s) => {
  const dx = x - 7.5;
  const dy = y - 7.5;
  const d = Math.hypot(dx, dy);
  if (d > 7.2) return VAZIO;
  if (d < 1.6) return cor('#7ab890', x, y, s);
  const a = (Math.atan2(dy, dx) / (Math.PI * 2) + 1) * 8;
  const costela = Math.abs((a % 1) - 0.5) < 0.18;
  if (costela && Math.round(d) % 2 === 0) return cor('#f2ecd8', x, y, s);
  return rampa(costela ? ['#4a9474'] : ['#2f6a54', '#367560'], H(x, y, s), x, y, s);
};

const arbustoCaatinga: Pintor = (x, y, s) => {
  const px = x + 0.5;
  const py = y + 0.5;
  const galhos: [number, number, number, number][] = [
    [8, 16, 7.5, 9],
    [7.5, 9, 3, 3],
    [7.5, 10, 12.5, 4],
    [7.5, 9, 8.5, 2],
    [5, 6, 2, 6.5],
    [10.5, 6, 14, 7.5],
  ];
  for (let i = 0; i < galhos.length; i++) {
    const [ax, ay, bx, by] = galhos[i];
    const d = distSeg(px, py, ax, ay, bx, by);
    if (d < (i === 0 ? 0.95 : 0.6))
      return rampa(['#8a8278', '#a49c90', '#bcb4a8'], H(x, y, s), x, y, s);
  }
  // folhinhas miúdas e uma flor amarela de vez em quando nas pontas
  for (const [fx, fy] of [
    [3, 3],
    [12.5, 4],
    [8.5, 2],
    [2, 6.5],
    [14, 7.5],
  ]) {
    const d = Math.hypot(px - fx, py - fy);
    if (d < 1.3) return cor(H(fx, fy, s) > 0.6 ? '#f2c230' : '#7a9a3a', x, y, s);
  }
  return VAZIO;
};

// --- geada e gelo ----------------------------------------------------------------

const geada: Pintor = (x, y, s) => {
  const p = rampa(
    ['#dde8f1', '#e7eff6', '#f0f5fa', '#fafcff'],
    fbmT(x, y, 4, s) * 0.5 + H(x, y, s) * 0.5,
    x,
    y,
    s,
  );
  const risco = (mod(x + y, 8) === 0 || mod(x - y, 8) === 0) && H(x, y, s + 3) > 0.4;
  if (risco) return cor('#bcd2e6', x, y, s);
  if (H(x, y, s + 5) > 0.97) return cor('#ffffff', x, y, s);
  return p;
};

const geloRiacho: Pintor = (x, y, s) => {
  for (let k = 0; k < 3; k++) {
    const cx = 2 + H(k, 1, s + 30) * 12;
    const cy = 2 + H(k, 2, s + 30) * 12;
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    const r = 1 + H(k, 3, s + 30) * 1.2;
    if (Math.abs(d - r) < 0.5) return cor('#eefcff', x, y, s); // bolha presa no gelo
  }
  const risco = Math.abs(ruidoT(x, y, 2, 2, s + 4) - 0.5) < 0.03;
  if (risco) return cor('#dff4f8', x, y, s);
  return rampa(
    ['#86c4cf', '#94cfd8', '#a3d9e1', '#b4e2e9'],
    fbmT(x, y, 2, s) * 0.7 + H(x, y, s) * 0.3,
    x,
    y,
    s,
  );
};

// --- madeiras --------------------------------------------------------------------

const CASCA_JEQ = ['#45372e', '#524238', '#5f4e42', '#6c5a4c'];
const troncoJequitiba: Pintor = (x, y, s) => {
  const p = rampa(CASCA_JEQ, ruidoT(x, y, 8, 2, s) * 0.6 + H(x, y >> 2, s) * 0.4, x, y, s);
  const fissura = mod(x + Math.floor(ruidoT(x, y, 2, 4, s + 5) * 3), 4) === 0;
  if (fissura) return escurece(p, 0.55);
  if (H(x >> 1, y >> 1, s + 7) > 0.92) return cor('#9aa284', x, y, s); // líquen claro
  return p;
};

const CASCA_IPE = ['#6c5e4a', '#786952', '#84745b', '#907f64'];
const troncoIpe: Pintor = (x, y, s) => {
  // placas de casca em escama, desencontradas por coluna, com fendas irregulares
  const col = x >> 2;
  const yy = mod(y + Math.floor(H(col, 9, s) * 4) + col * 2, 16);
  const fendaV = (x & 3) === 0 && H(x, y >> 1, s + 2) > 0.25;
  const fendaH = (yy & 3) === 0 && H(col, yy >> 2, s + 3) > 0.35;
  if (fendaV || fendaH) return rampa(['#3e3428', '#463b2e'], H(x, y, s), x, y, s);
  const p = rampa(CASCA_IPE, H(col, yy >> 2, s) * 0.6 + H(x, y, s) * 0.4, x, y, s);
  return (yy & 3) === 1 ? clareia(p, 0.12) : p;
};

const CASCA_ARAU = ['#5a2c1e', '#683524', '#773f2a', '#844830'];
const troncoAraucaria: Pintor = (x, y, s) => {
  const ond = Math.floor(ruidoT(x, y, 4, 1, s + 3) * 2);
  const p = rampa(CASCA_ARAU, H(x >> 2, (y + ond) >> 1, s) * 0.6 + H(x, y, s) * 0.4, x, y, s);
  if (mod(y + ond, 3) === 0) return escurece(p, 0.68);
  if (H(x, y, s + 8) > 0.94) return cor('#a46a48', x, y, s);
  return p;
};

const CASCA_FIG = ['#868074', '#918b7e', '#9c9688', '#a7a192'];
const troncoFigueira: Pintor = (x, y, s) => {
  // raízes aéreas descendo pelo tronco claro
  const w = Math.floor(ruidoT(x, y, 2, 4, s + 2) * 3);
  const k = mod(x + w, 5);
  if (k === 0) return cor('#c0baaa', x, y, s);
  if (k === 1) return cor('#6a6458', x, y, s);
  return rampa(CASCA_FIG, H(x, y, s) * 0.5 + fbmT(x, y, 2, s) * 0.5, x, y, s);
};

const tabuasJequitiba = tabuasDe(['#86452c', '#934e33', '#a0583a', '#ab6242']);
const MADEIRA_JEQ = ['#6e3622', '#7a3e28', '#86462e'];

// --- copas -----------------------------------------------------------------------

/** Copa com folhas largas (manchas de 2x2), buracos e flores opcionais. */
function copa(cores: string[], buracos: number, verde?: string[], fVerde = 0): Pintor {
  return (x, y, s) => {
    const bx = x >> 1;
    const by = y >> 1;
    const t = fbmT(x, y, 4, s) * 0.45 + H(x, y, s) * 0.3 + H(bx, by, s + 40) * 0.25;
    if (H(bx, by, s + 21) < buracos && t < 0.55) return VAZIO;
    if (verde && fbmT(x, y, 2, s + 60) < fVerde)
      return rampa(verde, H(x, y, s) * 0.6 + t * 0.4, x, y, s);
    const p = rampa(cores, t, x, y, s);
    // brilho de cima em cada folha/cacho
    if ((x & 1) === 0 && (y & 1) === 0 && H(bx, by, s + 3) > 0.5) return clareia(p, 0.12);
    return p;
  };
}

const copaJequitiba = copa(['#1c4a1e', '#245a24', '#2d6a2a', '#377a31', '#428a38'], 0.13);
const copaIpeAmarelo = copa(
  ['#c88a14', '#e0a41c', '#f0bc2a', '#fcd242', '#fff07a'],
  0.14,
  ['#4a6a24', '#587a2a'],
  0.32,
);
const copaIpeRosa = copa(
  ['#9a2a64', '#b83a82', '#d4589e', '#e87ab8', '#f6a6d2'],
  0.14,
  ['#4a6a2a', '#56782e'],
  0.3,
);

const grimpa: Pintor = (x, y, s) => {
  // tufos de agulhas em leque (grimpa da araucária)
  const t = fbmT(x, y, 4, s) * 0.5 + H(x, y, s) * 0.5;
  if (H(x >> 1, y >> 1, s + 21) < 0.1 && t < 0.5) return VAZIO;
  const agulha = mod(x * 2 + y, 4) === 0 || mod(x - y * 2, 5) === 0;
  const p = rampa(['#11382c', '#164434', '#1c503c', '#235c45', '#2a684e'], t, x, y, s);
  return agulha ? clareia(p, 0.16) : p;
};

const copaPirilampos: Pintor = (x, y, s) => {
  const p = copa(['#143c28', '#1a4830', '#205438', '#276040', '#2e6c48'], 0.16)(x, y, s);
  if (p[3] === 0) return p;
  // pirilampos pousados nas folhas (brilham)
  if (H(x, y, s + 33) > 0.955) return cor('#e4ff5a', x, y, s);
  return p;
};

// --- plantas em cruz -------------------------------------------------------------

const samambaia: Pintor = (x, y, s) => {
  const px = x + 0.5;
  const py = y + 0.5;
  const frondes = [
    { a: -0.42, b: -0.6, topo: 2 + Math.floor(H(1, 0, s) * 3) },
    { a: 0.05, b: 0.1, topo: 1 + Math.floor(H(2, 0, s) * 2) },
    { a: 0.45, b: 0.55, topo: 3 + Math.floor(H(3, 0, s) * 3) },
  ];
  for (let f = 0; f < frondes.length; f++) {
    const { a, b, topo } = frondes[f];
    if (py < topo) continue;
    const h = 16 - py; // altura a partir do chão
    const eixo = 8 + a * h + (b * h * h) / 14;
    const dx = px - eixo;
    const ao = (py - topo) / (16 - topo); // 0 na ponta, 1 na base
    if (Math.abs(dx) < 0.55) return rampa(['#2f6a24', '#367a2a'], H(x, y, s), x, y, s);
    // folíolos alternados, maiores no meio da fronde
    const larg = 3.2 * Math.sin(Math.min(1, ao * 1.25) * Math.PI) * (ao < 0.85 ? 1 : 0);
    if (Math.abs(dx) < larg && mod(y + f + (dx < 0 ? 0 : 1), 2) === 0)
      return rampa(['#3f8a30', '#4ca03a', '#5eb446', '#76c856'], 1 - Math.abs(dx) / 3.5, x, y, s);
  }
  return VAZIO;
};

const bromelia: Pintor = (x, y, s) => {
  const dx = x + 0.5 - 8;
  const up = 16 - (y + 0.5);
  // bráctea vermelha em espiga no centro, com florzinhas amarelas no alto
  if (up > 5 && up < 13) {
    const w = 2.3 - Math.abs(up - 8.5) * 0.4;
    if (Math.abs(dx) < w) {
      if (up > 11.2) return cor('#ffd84a', x, y, s);
      const escama = mod(Math.floor(up) + (dx < 0 ? 0 : 1), 2);
      return rampa(['#b81c34', '#d8263a', '#f04a48'], escama * 0.5 + H(x, y, s) * 0.4, x, y, s);
    }
  }
  // roseta de folhas largas e arqueadas
  for (const a of [-1.3, -0.85, -0.4, 0.4, 0.85, 1.3]) {
    const sa = Math.sin(a);
    const ca = Math.cos(a);
    const ao = dx * sa + up * ca;
    const lado = dx * ca - up * sa;
    const len = 10.5 - Math.abs(a) * 2.4;
    if (ao > 0 && ao < len && Math.abs(lado) < 2.1 * (1 - ao / len) + 0.4) {
      if (ao > len * 0.78) return cor('#b8404a', x, y, s);
      return rampa(['#3a7a2c', '#4a8e36', '#62a646'], lado > 0 ? 0.2 : 0.8, x, y, s);
    }
  }
  return VAZIO;
};

const florDeCoco: Pintor = (x, y, s) => {
  // cachinho de cogumelos que brilham em verde (fungo luminoso da mata)
  const chapeus: [number, number, number][] = [
    [4.5, 9, 2.6],
    [10.5, 6.5, 3.2],
    [7.5, 12, 2.2],
  ];
  for (const [cx, cy, r] of chapeus) {
    const dx = x + 0.5 - cx;
    const dy = y + 0.5 - cy;
    if (dy <= 0.6 && (dx * dx) / (r * r) + (dy * dy) / (r * r * 0.45) < 1) {
      if (dy > 0) return cor('#4a9a2a', x, y, s); // lamelas embaixo
      if (dy < -r * 0.45 && Math.abs(dx) < r * 0.35) return cor('#eaffb0', x, y, s);
      return rampa(['#7ad83a', '#96ec4a', '#b8fa6a'], 1 + dy / r + H(x, y, s) * 0.3, x, y, s);
    }
  }
  for (const [cx, cy] of chapeus)
    if (Math.abs(x + 0.5 - cx) < 0.8 && y + 0.5 > cy && y < 16)
      return rampa(['#d0e0b8', '#dce8c8'], H(x, y, s), x, y, s);
  return VAZIO;
};

const taboa: Pintor = (x, y, s) => {
  const px = x + 0.5;
  for (const h of [3.5, 7.5, 12.5]) {
    const topo = 1 + Math.floor(H(h, 0, s) * 4);
    const eixo = h + (y - 15) * 0.04;
    if (Math.abs(px - eixo) < 0.6 && y === topo) return cor('#8a9a5a', x, y, s); // pontinha
    if (Math.abs(px - eixo) < 1.1 && y > topo && y <= topo + 4)
      return rampa(['#5e321a', '#6e3e20', '#7c4a28'], px < eixo ? 0.9 : 0.2, x, y, s); // charuto
    if (Math.abs(px - eixo) < 0.55 && y > topo) return cor('#5a8a36', x, y, s);
  }
  // folhas finas e compridas
  for (const [h, inc] of [
    [5.5, -0.3],
    [10, 0.28],
    [14, 0.12],
  ]) {
    const eixo = h + (15 - y) * inc;
    if (Math.abs(x + 0.5 - eixo) < 0.6 && y > 3 + h / 4)
      return rampa(['#4f8a32', '#62a03e'], H(x, y, s), x, y, s);
  }
  return VAZIO;
};

const pePitanga: Pintor = (x, y, s) => {
  const dx = (x + 0.5 - 8) / 7.6;
  const dy = (y + 0.5 - 9.5) / 6.6;
  if (dx * dx + dy * dy > 1) return VAZIO;
  // pitangas vermelhas de gomos
  const fx = x >> 1;
  const fy = y >> 1;
  if (H(fx, fy, s + 4) > 0.8 && fy > 2) {
    if ((x & 1) === 0 && (y & 1) === 0) return cor('#ff8a5a', x, y, s);
    return rampa(['#c8240e', '#e0401a'], H(x, y, s), x, y, s);
  }
  const t = fbmT(x, y, 4, s) * 0.5 + H(x, y, s) * 0.5;
  if (H(x, y, s + 21) < 0.2 && t < 0.5) return VAZIO;
  return rampa(['#1f5a22', '#2a6a2a', '#357a32', '#4a8e3e'], t, x, y, s);
};

// --- brejo -----------------------------------------------------------------------

const CAPIM_BREJO = ['#3c6a32', '#467838', '#51863f', '#5c9348'];
const capimBrejo: Pintor = (x, y, s) => {
  if (fbmT(x, y, 4, s + 6) < 0.3) return rampa(['#284a46', '#305652'], H(x, y, s), x, y, s); // poça
  if (H(x, y, s + 8) > 0.975) return cor('#f2f0d0', x, y, s); // florzinha do brejo
  const p = rampa(CAPIM_BREJO, fbmT(x, y, 4, s) * 0.6 + H(x, y, s) * 0.4, x, y, s);
  return mod(x * 2 + y, 5) === 0 ? escurece(p, 0.82) : p;
};

const LAMA = ['#38322e', '#423b35', '#4c443c', '#564d42'];
const lama: Pintor = (x, y, s) => {
  if (fbmT(x, y, 4, s + 2) < 0.28) return cor('#2a2826', x, y, s);
  if (H(x, y, s + 1) > 0.965) return cor('#7c766a', x, y, s); // brilho molhado
  return rampa(LAMA, H(x, y, s) * 0.6 + fbmT(x, y, 4, s) * 0.4, x, y, s);
};

// --- luzes -----------------------------------------------------------------------

const tochaBambu: Pintor = (x, y, s) => {
  if (x >= 7 && x <= 8 && y >= 6) {
    if (y === 9 || y === 13) return cor('#6a6a2e', x, y, s); // nó do bambu
    return rampa(['#9a9a48', '#b4ae58'], x === 7 ? 0.9 : 0.1, x, y, s);
  }
  const dx = x + 0.5 - 8;
  const dy = y + 0.5 - 4;
  const d = Math.hypot(dx * 1.1, dy * (dy < 0 ? 0.7 : 1.3));
  if (d < 2.6 && y <= 6) {
    return rampa(['#e05a14', '#ff8a24', '#ffc44a', '#fff2a8'], 1 - d / 2.6, x, y, s);
  }
  return VAZIO;
};

const lamparina: Pintor = (x, y, s) => {
  const borda = x <= 1 || x >= T - 2 || y <= 1 || y >= T - 2;
  if (borda) {
    const p = rampa(['#7a3a20', '#8a4626', '#9a522e'], H(x, y, s), x, y, s);
    return x === 0 || y === 0 || x === T - 1 || y === T - 1 ? escurece(p, 0.7) : p;
  }
  if (x === 5 || x === 10) return cor('#5a2a18', x, y, s);
  const dx = x + 0.5 - 8;
  const dy = y + 0.5 - 8.5;
  // chama de pavio no meio
  if (Math.abs(dx) < 1.2 - (dy + 3) * 0.12 && dy > -3.5 && dy < 1.5) return cor('#fff6c8', x, y, s);
  const d = Math.hypot(dx, dy) / 7;
  return rampa(['#e07a2a', '#f8a23a', '#ffc85a', '#ffe08a'], 1 - d + H(x, y, s) * 0.15, x, y, s);
};

const cristalQuartzo: Pintor = (x, y, s) => {
  // prismas rosados de ponta afiada saindo da drusa, inclinados para os lados
  const px = x + 0.5;
  for (const [c0, inc, alt, w] of [
    [8, 0, 13, 2.4],
    [3.5, -0.25, 9, 1.8],
    [12.5, 0.28, 10, 1.9],
  ]) {
    const h = 16 - (y + 0.5);
    const cx = c0 + inc * h;
    const dx = px - cx;
    const ponta = alt - 2.6;
    const larg = h > ponta ? w * (1 - (h - ponta) / 2.6) : w;
    if (h < alt && Math.abs(dx) < larg) {
      if (dx < -larg * 0.45) return cor('#ffe4ee', x, y, s);
      if (dx > larg * 0.5) return cor('#c0607e', x, y, s);
      return rampa(['#e88aa8', '#f2a2bc', '#f8bcd0'], H(x, y, s) * 0.4 + h / 16, x, y, s);
    }
  }
  if (H(x, y, s + 3) > 0.9) return cor('#d87a9a', x, y, s); // cristaizinhos do fundo
  return rampa(
    ['#5a2a3a', '#6a3446', '#7a4052'],
    fbmT(x, y, 4, s) * 0.6 + H(x, y, s) * 0.4,
    x,
    y,
    s,
  );
};

const blocoAmetista: Pintor = (x, y, s) => {
  if (x === 0 || y === 0 || x === T - 1 || y === T - 1) return cor('#3a1a5c', x, y, s);
  const facA = (x + y) >> 2;
  const facB = mod(x - y, 16) >> 2;
  const t = ((facA + facB) % 4) / 4 + H(x, y, s) * 0.15;
  if (mod(x - y, 4) === 0) return cor('#c8a0f0', x, y, s);
  return rampa(['#4e2478', '#6a3298', '#8648b8', '#a466d4'], t, x, y, s);
};

// --- móveis e construção ---------------------------------------------------------

function molduraDe(miolo: Pintor, madeira: string[]): Pintor {
  return (x, y, s) => {
    if (x <= 1 || y <= 1 || x >= T - 2 || y >= T - 2) {
      const p = rampa(madeira, H(x, y, s), x, y, s);
      return x === 0 || y === 0 || x === T - 1 || y === T - 1 ? escurece(p, 0.7) : p;
    }
    return miolo(x, y, s);
  };
}

const bancadaTopo = molduraDe((x, y, s) => {
  if (x === 7) return cor('#4a2414', x, y, s);
  // marcas de serrote e uma régua amarela
  if (y === 4 && x >= 9 && x <= 13) return cor('#e8c24a', x, y, s);
  return tabuasJequitiba(x, y, s);
}, MADEIRA_JEQ);

const bancadaLado: Pintor = (x, y, s) => {
  if (y < 3) return rampa(MADEIRA_JEQ, H(x, y, s), x, y, s);
  // pés grossos nos cantos e uma gaveta com puxador
  if (x <= 2 || x >= T - 3) return rampa(['#5a2a18', '#66321e'], H(x, y, s), x, y, s);
  if (y >= 4 && y <= 8) {
    if (y === 4 || y === 8 || x === 3 || x === T - 4) return cor('#4a2414', x, y, s);
    if (y === 6 && x >= 7 && x <= 8) return cor('#e8c24a', x, y, s);
    return rampa(['#b46a46', '#c0744e'], H(x, y, s), x, y, s);
  }
  return escurece(tabuasJequitiba(x, y, s), 0.8);
};

const bancadaFrente: Pintor = (x, y, s) => {
  if (y < 3) return rampa(MADEIRA_JEQ, H(x, y, s), x, y, s);
  // serrote pendurado
  if (x >= 2 && x <= 7 && y >= 5 && y <= 9 && x - 2 <= (9 - y) * 1.3 + 1) {
    if (y === 9 && x % 2 === 0) return tabuasJequitiba(x, y, s);
    return rampa(['#9aa0a8', '#b4bac2'], H(x, y, s), x, y, s);
  }
  if (x >= 6 && x <= 8 && y >= 4 && y <= 6) return cor('#e0b030', x, y, s); // cabo do serrote
  // martelo
  if (x >= 10 && x <= 13 && y >= 5 && y <= 6)
    return rampa(['#6a6e74', '#7e828a'], H(x, y, s), x, y, s);
  if (x === 12 && y >= 7 && y <= 12) return cor('#c08040', x, y, s);
  return tabuasJequitiba(x, y, s);
};

const BARRO = ['#a45c38', '#b0663e', '#bc7246', '#c67e4e'];
const barro: Pintor = (x, y, s) => {
  const p = rampa(BARRO, fbmT(x, y, 4, s) * 0.6 + H(x, y, s) * 0.4, x, y, s);
  if (Math.abs(ruidoT(x, y, 4, 4, s + 9) - 0.5) < 0.03) return escurece(p, 0.7); // trinca
  if (H(x, y, s + 2) > 0.95) return clareia(p, 0.2); // palha no barro
  return p;
};

const fornoTopo: Pintor = (x, y, s) => {
  const d = Math.hypot(x + 0.5 - 8, y + 0.5 - 8);
  if (d < 3) return rampa(['#2a1a14', '#3a2418'], H(x, y, s), x, y, s); // chaminé com fuligem
  if (d < 4) return escurece(barro(x, y, s), 0.7);
  return barro(x, y, s);
};

function bocaForno(acesa: boolean): Pintor {
  return (x, y, s) => {
    const dx = x + 0.5 - 8;
    const dentro =
      y >= 7 && y <= 13 && Math.abs(dx) < 4.2 && (y >= 10 || Math.hypot(dx, y - 10) < 4.2);
    const contorno =
      y >= 6 && y <= 14 && Math.abs(dx) < 5.2 && (y >= 10 || Math.hypot(dx, y - 10) < 5.2);
    if (dentro) {
      if (!acesa) return rampa(['#160e0a', '#20140e'], H(x, y, s), x, y, s);
      const f = (13.5 - y) / 6 + H(x, y, s) * 0.35;
      // brasa embaixo e lenha cruzada
      if (y === 13 && (x === 6 || x === 9)) return cor('#5a2a14', x, y, s);
      return rampa(['#b8320a', '#e06414', '#ffa02a', '#ffd862'], 1 - f, x, y, s);
    }
    if (contorno) return rampa(['#7a3a22', '#86442a'], H(x, y, s), x, y, s);
    return barro(x, y, s);
  };
}

/** Trançado de taquara (por cima e por baixo, faixas de 4 pixels). */
const TAQUARA = ['#a8783c', '#b8884a', '#c89a58', '#d6aa66'];
const trancado: Pintor = (x, y, s) => {
  const cx = x >> 2;
  const cy = y >> 2;
  const horizontal = (cx + cy) % 2 === 0;
  const k = horizontal ? y & 3 : x & 3;
  const tom = H(horizontal ? cy : cx, horizontal ? 1 : 2, s) * 0.4;
  const p = rampa(TAQUARA, tom + (k === 1 ? 0.5 : k === 2 ? 0.35 : 0.1), x, y, s);
  if (k === 0 || k === 3) return escurece(p, 0.72);
  return p;
};

const cestoLado = molduraDe(
  (x, y, s) => (y === 5 ? cor('#5a3a1a', x, y, s) : trancado(x, y, s)),
  ['#7a5428', '#86602e'],
);
const cestoTopo = molduraDe(trancado, ['#7a5428', '#86602e']);
const cestoFrente: Pintor = (x, y, s) => {
  // tramela de madeira e cordinha
  if (x >= 7 && x <= 8 && y >= 4 && y <= 8)
    return rampa(['#5a3418', '#6a3e1e'], H(x, y, s), x, y, s);
  if (y === 6 && (x === 6 || x === 9)) return cor('#e8dcc0', x, y, s);
  return cestoLado(x, y, s);
};

const tijolosBarro = tijolosDe(['#a8542c', '#b65e34', '#c26a3c', '#cc7444'], '#e2cca2', 4, 16);

const muroPedra: Pintor = (x, y, s) => {
  const v = voronoi(x, y, s + 5, 8);
  if (v.d2 - v.d1 < 1.1) return rampa(['#b8b0a0', '#c4bcac'], H(x, y, s), x, y, s);
  const tons = ['#6e7076', '#7c7a78', '#686c72', '#86827c'];
  const p = rampa([tons[v.id % tons.length]], 0, x, y, s);
  if (H(x, y, s + 4) > 0.95) return cor('#c4a49c', x, y, s);
  return v.oy < -2 ? clareia(p, 0.1) : v.oy > 2 ? escurece(p, 0.88) : p;
};

const pedraPolida: Pintor = (x, y, s) => {
  if (x === 0 || y === 0) return cor('#c0c2c6', x, y, s);
  if (x === T - 1 || y === T - 1) return cor('#6e7076', x, y, s);
  const r = H(x, y, s + 4);
  if (r > 0.93) return cor('#c8a8a2', x, y, s);
  if (r < 0.07) return cor('#3a3a40', x, y, s);
  return rampa(
    ['#98999f', '#a2a4a9', '#acaeb3'],
    H(x, y, s) * 0.5 + fbmT(x, y, 2, s) * 0.5,
    x,
    y,
    s,
  );
};

const vidraca: Pintor = (x, y, s) => {
  const borda = x === 0 || y === 0 || x === T - 1 || y === T - 1;
  if (borda) {
    if ((x === 0 || x === T - 1) && y % 5 === 0) return cor('#7a7a34', x, y, s); // nó do bambu
    return rampa(['#b0aa5a', '#c4be6a'], H(x, y, s), x, y, s);
  }
  if (x === 7 || y === 7) return rampa(['#a8a254', '#bcb664'], H(x, y, s), x, y, s);
  if ((x === y + 2 || x === y + 3) && x > 2 && x < 6) return [236, 250, 244, 255];
  if ((x === y + 2 || x === y + 3) && x > 10 && x < 14) return [236, 250, 244, 255];
  return VAZIO;
};

/** Chita: tecido com florzinhas em grade (fundo, flor, miolo). */
function chita(fundo: string, flor: string, miolo: string): Pintor {
  const c = hex(fundo);
  return (x, y, s) => {
    const gx = mod(x + ((y >> 3) & 1) * 4, 8);
    const gy = y & 7;
    const dx = gx - 3;
    const dy = gy - 3;
    if (dx === 0 && dy === 0) return cor(miolo, x, y, s);
    if (Math.abs(dx) + Math.abs(dy) === 1) return cor(flor, x, y, s);
    if (gx === 5 && gy === 5) return cor('#3a8a3a', x, y, s);
    const fio = ((x + y) % 2 === 0 ? 0.93 : 1) * (0.95 + H(x, y, s) * 0.1);
    return [c[0] * fio, c[1] * fio, c[2] * fio, 255];
  };
}

const LISTRAS_REDE = ['#d8364a', '#f2c230', '#2f8a4a', '#2f6ab8', '#f4ecdc'];
const redeTopo: Pintor = (x, y, s) => {
  if (y < 3) return rampa(['#f4ecdc', '#ece2cc'], H(x, y, s), x, y, s); // punho da rede
  const c = LISTRAS_REDE[Math.floor(x / 3) % LISTRAS_REDE.length];
  const p = rampa([c], 0, x, y, s);
  return (y + x) % 2 === 0 ? escurece(p, 0.92) : p;
};
const redeLado: Pintor = (x, y, s) => {
  if (y < 5) {
    const c = LISTRAS_REDE[Math.floor(y / 1) % LISTRAS_REDE.length];
    return rampa([c], 0, x, y, s);
  }
  if (y < 8) return x % 2 === 0 ? cor('#f4ecdc', x, y, s) : cor('#d8c8a8', x, y, s); // franja
  return tabuasJequitiba(x, y, s);
};

const tabuasPortaIpe = tabuasDe(['#6e5a38', '#7a6440', '#866e48']);
const portaIpe: Pintor = (x, y, s) => {
  const janela = x >= 3 && x <= 12 && y >= 2 && y <= 6;
  if (janela && x !== 7 && x !== 8 && y !== 4) return VAZIO;
  if (x >= 11 && x <= 12 && y >= 8 && y <= 9) return cor('#3a2a18', x, y, s); // tramela
  const p = tabuasPortaIpe(y, x, s);
  return x <= 0 || x >= T - 1 || y <= 0 || y >= T - 1 ? escurece(p, 0.72) : p;
};

const tabuasIpe = tabuasDe(['#948048', '#9e8a50', '#a89458', '#b29e60']);
const tabuasAraucariaBase = tabuasDe(['#bc8662', '#c4906a', '#cc9a72', '#d4a47a']);
const tabuasAraucaria: Pintor = (x, y, s) => {
  if (H(x >> 1, y >> 1, s + 70) > 0.95 && y % 4 !== 3) return cor('#7a4a2e', x, y, s); // nó
  return tabuasAraucariaBase(x, y, s);
};

// --- jerimum ---------------------------------------------------------------------

const jerimumLado: Pintor = (x, y, s) => {
  // gomos fundos; manchas verdes perto do cabinho
  if (x % 4 === 0) return rampa(['#8e3e12', '#9a4616'], H(x, y, s), x, y, s);
  if (y < 4 && fbmT(x, y, 4, s + 3) > 0.5 + y * 0.06)
    return rampa(['#5a6a2a', '#6a7a30'], H(x, y, s), x, y, s);
  if (H(x, y, s + 6) > 0.93) return cor('#f4c88a', x, y, s); // pintinha clara
  return rampa(
    ['#c4561e', '#d26626', '#de7630', '#e8863a'],
    H(x, y, s) * 0.5 + ruidoT(x, y, 4, 1, s) * 0.3 + (x % 4 === 2 ? 0.2 : 0),
    x,
    y,
    s,
  );
};

const jerimumTopo: Pintor = (x, y, s) => {
  const dx = x + 0.5 - 8;
  const dy = y + 0.5 - 8;
  const d = Math.hypot(dx, dy);
  if (d < 1.6) return rampa(['#5a4a22', '#6a5828'], H(x, y, s), x, y, s); // cabinho
  const a = (Math.atan2(dy, dx) / (Math.PI * 2) + 1) * 8;
  if (Math.abs((a % 1) - 0.5) < 0.12) return cor('#8e3e12', x, y, s);
  if (d < 4 && H(x, y, s + 2) > 0.4) return rampa(['#5a6a2a', '#6a7a30'], H(x, y, s), x, y, s);
  return rampa(['#c4561e', '#d26626', '#de7630'], H(x, y, s) * 0.5 + d / 16, x, y, s);
};

const jerimumRosto: Pintor = (x, y, s) => {
  // carinha sorridente
  const olho =
    Math.hypot(x + 0.5 - 4.5, y + 0.5 - 5.5) < 1.6 ||
    Math.hypot(x + 0.5 - 11.5, y + 0.5 - 5.5) < 1.6;
  const r = Math.hypot(x + 0.5 - 8, y + 0.5 - 7);
  const boca = y >= 9 && r > 3.6 && r < 5.4 && Math.abs(x + 0.5 - 8) < 4.6;
  if (olho || boca) return rampa(['#ffc850', '#ffe08a'], H(x, y, s), x, y, s);
  return jerimumLado(x, y, s);
};

// --- tabela ----------------------------------------------------------------------

export const PINTORES_MATA: Record<string, Pintor> = {
  grama_topo: chaoTopo,
  grama_lado: chaoLado,
  terra: terraRoxa,
  pedra: granito,
  areia: areiaRestinga,
  tronco: troncoJequitiba,
  tronco_topo: aneisDe(CASCA_JEQ.slice(0, 2), [
    ['#a8583a', '#b0603e'],
    ['#c4764a', '#cc7e50'],
  ]),
  folhas: copaJequitiba,
  cristal: cristalQuartzo,
  tabuas: tabuasJequitiba,
  grama_alta: samambaia,
  flor: bromelia,
  cogumelo: florDeCoco,
  pedregulho: pedraDeRio,
  cascalho: seixos,
  rocha_matriz: rochaFundo,
  min_carvao: veioCarvao,
  min_cobre: gema(['#2a7a3a', '#38944a', '#4cb05c'], '#d8ffe0', '#e8508c'),
  min_ferro: gema(['#b0581a', '#d87e26', '#f8a83c'], '#fff0c0'),
  min_ouro: gema(['#2e86a8', '#4cb4d0', '#8ee0ee'], '#f0ffff'),
  min_luzita: gema(['#5a2a8e', '#7c3cbc', '#a86ae4'], '#f4e0ff', undefined, 5),
  neve_lado: ladoComTopo(geada, terraRoxa, '#a8b8c8', 2),
  neve: geada,
  gelo: geloRiacho,
  arenito_lado: arenitoLado,
  arenito_topo: arenitoTopo,
  areia_deserto: areiaSertao,
  cacto_lado: mandacaruLado,
  cacto_topo: mandacaruTopo,
  arbusto_seco: arbustoCaatinga,
  betula: troncoIpe,
  betula_topo: aneisDe(CASCA_IPE.slice(0, 2), [
    ['#8a7a3e', '#928244'],
    ['#a4944e', '#ac9c56'],
  ]),
  folhas_betula: copaIpeAmarelo,
  pinho: troncoAraucaria,
  pinho_topo: aneisDe(CASCA_ARAU.slice(0, 2), [
    ['#c49668', '#cc9e6e'],
    ['#d8ac7a', '#e0b482'],
  ]),
  folhas_pinho: grimpa,
  pantano_lado: ladoComTopo((x, y, s) => rampa(CAPIM_BREJO, H(x, y, s), x, y, s), lama, '#24341e'),
  pantano_topo: capimBrejo,
  lama,
  junco: taboa,
  tronco_lanterna: troncoFigueira,
  tronco_lanterna_topo: aneisDe(CASCA_FIG.slice(0, 2), [
    ['#c4b48c', '#ccbc94'],
    ['#d8c8a0', '#e0d0a8'],
  ]),
  folhas_lanterna: copaPirilampos,
  vidro: vidraca,
  tocha: tochaBambu,
  lanterna: lamparina,
  bloco_luzita: blocoAmetista,
  mesa_lado: bancadaLado,
  mesa_topo: bancadaTopo,
  mesa_frente: bancadaFrente,
  fornalha_lado: barro,
  fornalha_topo: fornoTopo,
  fornalha_frente: bocaForno(false),
  bau_lado: cestoLado,
  bau_topo: cestoTopo,
  bau_frente: cestoFrente,
  tijolos: tijolosBarro,
  tijolos_pedra: muroPedra,
  pedra_lisa: pedraPolida,
  la_branca: chita('#efe8da', '#d8364a', '#f2c230'),
  la_vermelha: chita('#c0302e', '#f6efe0', '#f2c230'),
  la_laranja: chita('#e27a26', '#fff0c0', '#c0302e'),
  la_amarela: chita('#eac232', '#d8364a', '#ffffff'),
  la_verde: chita('#4a9432', '#ffd23f', '#c0302e'),
  la_azul: chita('#2f58b4', '#ffffff', '#ffd23f'),
  la_roxa: chita('#7a3aa8', '#ffb0d8', '#ffd23f'),
  la_preta: chita('#25232a', '#e04a6a', '#ffd23f'),
  frutinhas: pePitanga,
  folhas_outono: copaIpeRosa,
  cama_lado: redeLado,
  cama_topo: redeTopo,
  porta: portaIpe,
  fornalha_acesa: bocaForno(true),
  tabuas_betula: tabuasIpe,
  tabuas_pinho: tabuasAraucaria,
  abobora_lado: jerimumLado,
  abobora_topo: jerimumTopo,
  abobora_rosto: jerimumRosto,

  // spec 013: leira de terra roxa, arrozal, milho crioulo, pé de jerimum e fardo de palha
  terra_arada: terraAradaDe(terraRoxa, 0.45, 0.26),
  trigo: trigoDe(['#3f7a2a', '#4c8a32', '#5a9a3a'], ['#d2ae52', '#e2c262', '#f0d47a'], '#fff0b0'),
  milho: milhoDe(
    ['#2f7a2a', '#3a8c32', '#48a03c', '#56b046'],
    ['#c8402a', '#e8a228', '#f6cc48'],
    '#e8c890',
  ),
  aboboreira: aboboreiraDe(
    ['#2e6e26', '#3a822e', '#489638', '#56a842'],
    ['#b8501a', '#cc6420', '#de7a2a', '#ea9036'],
    '#5a6a2a',
  ),
  feno_lado: fenoLadoDe(['#b89a4c', '#c6a85a', '#d4b868', '#e0c678'], '#4a3018'),
  feno_topo: fenoTopoDe(['#bea050', '#ccb060', '#d8be70', '#e4cc80'], '#4a3018'),
};

/** Tiles que brilham: quartzo, cogumelo luminoso, ametista, pirilampos, fogo e luzes. */
export const EMISSIVOS_MATA = [
  'cristal',
  'cogumelo',
  'min_luzita',
  'folhas_lanterna',
  'tocha',
  'lanterna',
  'bloco_luzita',
  'fornalha_acesa',
  'abobora_rosto',
] as const;
