import {
  T,
  VAZIO,
  aneisDe,
  escurece,
  fbmT,
  hex,
  ladoComTopo,
  rampa,
  ruidoT,
  terraAradaDe,
  trigoDe,
  milhoDe,
  aboboreiraDe,
  fenoLadoDe,
  fenoTopoDe,
} from '../../art/atlas';
import { hash2 } from '../../world/noise';
import type { Pintor, Px } from '../tipos';

/**
 * Pintores da Era dos Dinos: basalto em colunas, terra vulcânica com escória,
 * frondes de samambaia, fósseis e âmbar nos minérios, penugem no lugar da lã.
 */

const mod = (a: number, n: number) => ((a % n) + n) % n;
const cor = (c: string, x: number, y: number, s: number): Px => rampa([c], 0, x, y, s);
const borda = (x: number, y: number) => x === 0 || y === 0 || x === T - 1 || y === T - 1;
/** Mistura duas cores de pixel. */
const mistura = (a: Px, b: Px, t: number): Px => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
  255,
];
const clareia = (p: Px, f: number): Px => mistura(p, [255, 240, 210, 255], f);

// --- paletas ----------------------------------------------------------------
const RELVA = ['#2c5524', '#35632a', '#3f7230', '#4a8036', '#578e3d'];
const FRONDE_CLARA = '#7fb24c';
const TERRA = ['#3a2a24', '#45322a', '#503a30', '#5c4436'];
const BASALTO = ['#3c3f47', '#454851', '#4e525b', '#585c66', '#626670'];
const ESCORIA = '#8a3e24';
const CINZA = ['#b9b2aa', '#c3bcb3', '#ccc6be', '#d6d0c8'];
const AREIA_CONCHA = ['#d8c09a', '#dfc8a3', '#e6d0ac', '#ecd8b6'];
const ARENITO = ['#b8552e', '#c46236', '#cf7040', '#d97e4a'];
const AREIA_VERMELHA = ['#c86a38', '#d27642', '#db834c', '#e39158'];
const LODO = ['#4a5426', '#55602b', '#606c30', '#6b7836'];
const LAMA = ['#4a3424', '#553d2a', '#604630', '#6b4f36'];
const AMBAR = ['#b85e0c', '#d27a12', '#ec9a22', '#ffbe48'];

// --- chão -------------------------------------------------------------------
/** Terra vulcânica: marrom-carvão com grãos de escória vermelha e pretinha. */
const terra: Pintor = (x, y, s) => {
  const r = hash2(x, y, s + 3);
  if (r > 0.95) return cor(ESCORIA, x, y, s);
  if (r < 0.06) return cor('#1f1714', x, y, s);
  if (r > 0.9) return cor('#6e5646', x, y, s);
  return rampa(TERRA, fbmT(x, y, 4, s) * 0.5 + hash2(x, y, s) * 0.5, x, y, s);
};

/** Frondezinhas de samambaia vistas de cima (chevrons claros em células de 8). */
function fronde(x: number, y: number, s: number): number {
  const cx = x >> 3;
  const cy = y >> 3;
  const vira = hash2(cx, cy, s + 40) > 0.5;
  const lx = x & 7;
  const ly = vira ? 7 - (y & 7) : y & 7;
  if (hash2(cx, cy, s + 41) < 0.3) return 0;
  // nervura na diagonal e folíolos curtos saindo dos dois lados, alternados
  if (lx === ly && lx > 0 && lx < 7) return 2;
  if (lx - ly === 1 && lx % 2 === 0 && ly > 0 && lx < 7) return 1;
  if (ly - lx === 1 && ly % 2 === 1 && lx > 0 && ly < 7) return 1;
  return 0;
}

const relvaTopo: Pintor = (x, y, s) => {
  const f = fronde(x, y, s);
  if (f === 2) return rampa([FRONDE_CLARA, '#8cbf55'], hash2(x, y, s), x, y, s);
  if (f === 1) return rampa(['#669c40', '#70a646'], hash2(x, y, s), x, y, s);
  const t = fbmT(x, y, 4, s) * 0.55 + hash2(x, y, s) * 0.45;
  if (hash2(x, y, s + 5) > 0.96) return cor('#a6b85a', x, y, s);
  return rampa(RELVA, t, x, y, s);
};

const relvaLado: Pintor = (x, y, s) => {
  let b = 2 + Math.floor(hash2(x, 0, s + 17) * 3);
  if (hash2(x, 1, s + 17) > 0.7) b += 3;
  if (y < b) {
    // pontas de fronde caindo pela borda
    if (y === b - 1 && x % 3 === 0) return cor(FRONDE_CLARA, x, y, s);
    return rampa(RELVA, 0.2 + hash2(x, y, s) * 0.8, x, y, s);
  }
  if (y === b) return cor('#1f3a18', x, y, s);
  return terra(x, y, s);
};

/** Basalto em colunas: faixas verticais de 4 pixels com juntas e bolhinhas de gás. */
export const basalto: Pintor = (x, y, s) => {
  const col = x >> 2;
  const lx = x & 3;
  const tom = 0.86 + hash2(col, 0, s) * 0.26;
  const j = Math.floor(hash2(col, 1, s) * 16);
  if (lx === 0) return cor('#2a2c32', x, y, s);
  if (y === j || (y === mod(j + 7, 16) && hash2(col, 2, s) > 0.4))
    return lx === 3 ? cor('#2e3036', x, y, s) : cor('#30333a', x, y, s);
  if (hash2(x, y, s + 4) > 0.965) return cor('#24262b', x, y, s);
  const p = rampa(BASALTO, fbmT(x, y, 4, s) * 0.5 + hash2(x, y, s) * 0.5, x, y, s);
  return escurece(lx === 1 ? clareia(p, 0.08) : p, tom);
};

const areiaConchas: Pintor = (x, y, s) => {
  // conchinhas: pontinhos claros com um pixel rosado ao lado
  const r = hash2(x >> 1, y >> 1, s + 2);
  if (r > 0.93 && (x + y) % 2 === 0) return cor('#fbf2e4', x, y, s);
  if (r > 0.93) return cor('#e8a99a', x, y, s);
  if (hash2(x, y, s + 6) > 0.95) return cor('#a99478', x, y, s);
  return rampa(AREIA_CONCHA, fbmT(x, y, 4, s) * 0.5 + hash2(x, y, s) * 0.5, x, y, s);
};

// --- madeira de samambaia (tronco fibroso com cicatrizes em losango) --------
function troncoEscamas(cores: string[], cicatriz: string, fibra: string, passo = 4): Pintor {
  return (x, y, s) => {
    const fila = Math.floor(y / passo);
    const lx = mod(x + (fila % 2 ? passo / 2 : 0), passo);
    const ly = y % passo;
    const d = Math.abs(lx - passo / 2 + 0.5) + Math.abs(ly - passo / 2 + 0.5);
    const p = rampa(cores, ruidoT(x, y, 8, 2, s) * 0.5 + hash2(x, y, s) * 0.5, x, y, s);
    if (d < 1) return cor(cicatriz, x, y, s);
    if (d > passo / 2 + 0.4) return escurece(p, 0.72);
    if (hash2(x, y >> 1, s + 3) > 0.88) return cor(fibra, x, y, s);
    return p;
  };
}

/** Toras amarradas: colunas arredondadas com duas faixas de cipó. */
function torasDe(cores: string[], cipo: string, largura = 4): Pintor {
  return (x, y, s) => {
    const tora = Math.floor(x / largura);
    const lx = x % largura;
    if (y === 3 || y === 12) return rampa([cipo, escuroHex(cipo)], hash2(x, y, s) * 0.99, x, y, s);
    if (y === 2 || y === 13) return escurece(rampa(cores, 0.5, x, y, s), 0.7);
    const curva = 1 - Math.abs(lx - (largura - 1) / 2) / largura;
    const veio = ruidoT(x, y, 2, 8, s + tora) * 0.5 + hash2(x, y, s) * 0.3 + curva * 0.3;
    const p = rampa(cores, veio, x, y, s);
    const tom = 0.9 + hash2(tora, 0, s) * 0.2;
    if (lx === 0) return escurece(p, 0.6);
    return escurece(p, tom);
  };
}
function escuroHex(c: string): string {
  const [r, g, b] = hex(c);
  const h = (v: number) =>
    Math.round(v * 0.7)
      .toString(16)
      .padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

const tabuasSamambaia = torasDe(['#6a4a2e', '#7a5634', '#8a623b', '#986e43'], '#6b7a36');
const tabuasAraucaria = torasDe(['#9a8670', '#a8937b', '#b5a086', '#c2ad92'], '#5a6e3a', 5);
const tabuasPinheiro = torasDe(['#6e3a26', '#7c442c', '#8a4e33', '#965a3b'], '#8a7a4a', 3);

/** Frondes: folíolos em espinha de peixe, com recortes. */
function frondesDe(cores: string[], buracos = 0.16, pinta?: string): Pintor {
  return (x, y, s) => {
    const ly = (y + Math.floor(hash2(x >> 2, 0, s) * 4)) & 3;
    const lx = x & 3;
    const espinha = lx === 0;
    const foliolo = ly === lx || ly === lx - 1;
    const t = fbmT(x, y, 4, s) * 0.5 + hash2(x, y, s) * 0.5;
    if (!espinha && !foliolo && hash2(x, y, s + 21) < buracos + 0.25) return VAZIO;
    if (pinta && hash2(x >> 1, y >> 1, s + 33) > 0.9) return cor(pinta, x, y, s);
    if (espinha) return escurece(rampa(cores, t, x, y, s), 0.78);
    return rampa(cores, foliolo ? t * 0.5 + 0.5 : t * 0.6, x, y, s);
  };
}

// --- plantas em cruz --------------------------------------------------------
/** Samambainha: três frondes com folíolos saindo de uma base. */
const samambainha: Pintor = (x, y, s) => {
  for (const [bx, inc, alt] of [
    [7.5, 0, 13],
    [4, -0.35, 10],
    [11, 0.35, 10],
  ]) {
    const topo = 15 - alt + Math.floor(hash2(bx, 1, s) * 2);
    if (y < topo) continue;
    const cx = bx + (y - 15) * inc * -1;
    const dx = x - cx;
    const prog = (y - topo) / alt;
    const larg = 0.6 + Math.sin(prog * Math.PI) * 2.6;
    if (Math.abs(dx) < 0.6) return rampa(['#3d6b28', '#4a7a30'], hash2(x, y, s), x, y, s);
    if (Math.abs(dx) < larg && (y + Math.round(Math.abs(dx))) % 2 === 0)
      return rampa(['#5a9a3a', '#6aaa44', '#7ab84e'], 1 - prog + hash2(x, y, s) * 0.3, x, y, s);
  }
  return VAZIO;
};

/** Magnólia: flor grande branca-rosada com miolo amarelo. */
const magnolia: Pintor = (x, y, s) => {
  const dx = x - 7.5;
  const dy = y - 5.5;
  const a = Math.atan2(dy, dx);
  const r = Math.hypot(dx, dy);
  const petala = 3.2 + Math.cos(a * 3) * 1.6;
  if (r < 1.3) return cor('#ffd84a', x, y, s);
  if (r < petala) {
    const t = r / petala;
    if (t > 0.82) return cor('#c45a8a', x, y, s);
    return rampa(['#fff6f0', '#ffe2ea', '#f6b8cf'], t + hash2(x, y, s) * 0.15, x, y, s);
  }
  if ((x === 7 || x === 8) && y >= 9) return rampa(['#4a3a28', '#5a4630'], hash2(x, y, s), x, y, s);
  const folha = y >= 10 && y <= 12 && Math.abs(Math.abs(dx) - 2.5 - (12 - y) * 0.5) < 1.3;
  if (folha) return rampa(['#3f7a2e', '#4e8c36'], hash2(x, y, s), x, y, s);
  return VAZIO;
};

/** Cogumelo-brasa: chapéu laranja quente com pintas amarelas e pé creme. */
const cogumeloBrasa: Pintor = (x, y, s) => {
  for (const [cx, cy, rx, ry, pe] of [
    [6, 6.5, 5.6, 3.4, 4],
    [12, 10.5, 2.8, 2, 2],
  ]) {
    const dx = x - cx;
    const dy = y - cy;
    if (y <= cy && (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) < 1) {
      if (hash2(x >> 1, y >> 1, s + 1) > 0.78 && y < cy - 1) return cor('#ffe27a', x, y, s);
      return rampa(['#d8461a', '#f0661e', '#ff8c2e'], 1 - (cy - y) / ry, x, y, s);
    }
    if (y === Math.ceil(cy) && Math.abs(dx) < rx - 0.5) return cor('#9a3a14', x, y, s);
    if (y > cy && Math.abs(dx) < pe / 2 && y <= 15)
      return rampa(['#e8d6b8', '#f2e4ca'], hash2(x, y, s), x, y, s);
  }
  return VAZIO;
};

/** Cavalinha: hastes verdes em gomos com anéis escuros e raminhos finos. */
const cavalinha: Pintor = (x, y, s) => {
  for (const h of [3, 8, 12]) {
    const topo = 1 + Math.floor(hash2(h, 0, s) * 4);
    if (y < topo) continue;
    const cx = h + (y - 15) * 0.04;
    const dx = x - cx;
    if (y === topo && Math.abs(dx) < 1) return cor('#a07a3a', x, y, s);
    if (Math.abs(dx) < 0.9) {
      if ((y - topo) % 3 === 2) return cor('#24401a', x, y, s);
      return rampa(['#5a8a2e', '#6a9a36', '#7aaa40'], hash2(x, y, s), x, y, s);
    }
    if ((y - topo) % 3 === 2 && Math.abs(dx) < 2.6 && y > topo + 2) return cor('#4a7a28', x, y, s);
  }
  return VAZIO;
};

/** Samambaia seca: báculos enrolados (espirais marrons). */
const samambaiaSeca: Pintor = (x, y, s) => {
  for (const [cx, cy, base] of [
    [5, 5, 4],
    [11, 7, 11],
  ]) {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.hypot(dx, dy);
    if (r < 3.2) {
      const a = Math.atan2(dy, dx) / (Math.PI * 2) + 0.5;
      if (Math.abs(r - (0.8 + a * 2.4)) < 0.55)
        return rampa(['#7a5530', '#8f6638', '#a37a47'], hash2(x, y, s), x, y, s);
      continue;
    }
    // haste do báculo até o chão
    const hx = cx + 3 - (y - cy) * ((cx + 3 - base) / (15 - cy));
    if (y > cy && Math.abs(x - hx) < 0.7)
      return rampa(['#6b4a2a', '#7a5530'], hash2(x, y, s), x, y, s);
  }
  return VAZIO;
};

/** Moita de bagas: folhinhas de samambaia com bagas roxas e laranja. */
const moitaBagas: Pintor = (x, y, s) => {
  if (y < 3 || x < 1 || x > 14) return VAZIO;
  const f = frondesDe(['#2f6a26', '#3a7a2e', '#468a36'], 0.2)(x, y, s);
  if (f[3] === 0) return VAZIO;
  const k = hash2(x >> 1, y >> 1, s + 4);
  if (k > 0.8 && (x + y) % 2 === 0)
    return k > 0.9
      ? rampa(['#ff8a2a', '#ffa64a'], hash2(x, y, s), x, y, s)
      : rampa(['#7a2a8a', '#9a3aa8'], hash2(x, y, s), x, y, s);
  return f;
};

// --- fósseis e âmbar nos minérios ---------------------------------------------
/** Pedra com achados desenhados em até 3 posições sorteadas pela semente. */
function comAchados(
  achado: (dx: number, dy: number, x: number, y: number, s: number, k: number) => Px | null,
  n = 3,
): Pintor {
  return (x, y, s) => {
    for (let k = 0; k < n; k++) {
      const cx = 2.5 + Math.floor(hash2(k, 11, s) * 11);
      const cy = 2.5 + ((Math.floor(hash2(k, 12, s) * 4) + k * 5) % 11);
      const p = achado(x - cx, y - cy, x, y, s, k);
      if (p) return p;
    }
    return basalto(x, y, s);
  };
}

const minAmonite = comAchados((dx, dy, x, y, s) => {
  const r = Math.hypot(dx, dy);
  if (r > 3.7) return null;
  if (r > 3.15) return cor('#2a2420', x, y, s);
  const a = Math.atan2(dy, dx) / (Math.PI * 2) + 0.5;
  const sulco = mod(r * 0.9 - a, 1) < 0.35;
  return sulco
    ? rampa(['#a8642e', '#b8703a'], hash2(x, y, s), x, y, s)
    : rampa(['#e4ac6a', '#f0c288', '#f8d8a8'], 1 - r / 3.6, x, y, s);
}, 2);

const minOsso = comAchados((dx, dy, x, y, s, k) => {
  // osso em diagonal com nós nas pontas
  const v = k % 2 ? 1 : -1;
  const u = (dx + dy * v) / 2;
  const w = (dx - dy * v) / 2;
  const ponta = Math.min(Math.hypot(u - 2.2, w), Math.hypot(u + 2.2, w));
  const dentro = (Math.abs(u) < 2.3 && Math.abs(w) < 0.55) || ponta < 1.15;
  const contorno = (Math.abs(u) < 2.6 && Math.abs(w) < 1.05) || ponta < 1.65;
  if (dentro) return rampa(['#d8caa4', '#e8dcbc', '#f6eed8'], hash2(x, y, s) * 0.5 + 0.4, x, y, s);
  if (contorno) return cor('#2a2622', x, y, s);
  return null;
}, 2);

const minPirita = comAchados((dx, dy, x, y, s) => {
  // cubinhos dourados com brilho no canto
  if (dx < -1.5 || dx > 1.5 || dy < -1.5 || dy > 1.5) return null;
  if (dx < -1 && dy < -1) return cor('#fff3a8', x, y, s);
  if (dx > 1 || dy > 1) return cor('#9a7414', x, y, s);
  return rampa(['#d6a62a', '#e8be3e', '#f2d058'], hash2(x, y, s), x, y, s);
}, 3);

const minAmbar = comAchados((dx, dy, x, y, s, k) => {
  const r = Math.hypot(dx * 0.9, dy * 1.1);
  if (r > 2.7) return null;
  if (k === 0 && Math.abs(dx) < 0.6 && Math.abs(dy) < 0.6) return cor('#4a2a10', x, y, s);
  if (dx < -0.6 && dy < -0.6 && r < 2) return cor('#fff0b8', x, y, s);
  return rampa(AMBAR, 1 - r / 2.7 + hash2(x, y, s) * 0.15, x, y, s);
}, 2);

/** Carvão fóssil: faixas pretas onduladas com marca de folha. */
const minCarvao: Pintor = (x, y, s) => {
  const onda = Math.sin((x / T) * Math.PI * 2 + hash2(0, 0, s) * 6) * 1.5;
  for (const c of [4, 11]) {
    const d = y - c - onda;
    if (Math.abs(d) < 1.8) {
      const folha = (x + Math.round(d)) % 3 === 0 && Math.abs(d) < 1.2;
      if (folha) return cor('#6a6258', x, y, s);
      return rampa(['#141212', '#1c1918', '#262220'], hash2(x, y, s), x, y, s);
    }
  }
  return basalto(x, y, s);
};

/** Cristal vulcânico: facetas rubi e coral, com brilho quente. */
const cristalVulcanico: Pintor = (x, y, s) => {
  const faceta = (((x * 3 + y * 2) % 11) + ((x - y + 32) % 7)) / 18;
  const t = faceta * 0.6 + fbmT(x, y, 2, s) * 0.4;
  if ((x * 2 + y) % 9 === 0 && !borda(x, y)) return cor('#ffc0b0', x, y, s);
  const p = rampa(['#8a1e34', '#b02a44', '#d84054', '#f2705a'], t, x, y, s);
  return borda(x, y) ? escurece(p, 0.62) : p;
};

/** Âmbar polido: mel translúcido com um insetinho preso no meio. */
const blocoAmbar: Pintor = (x, y, s) => {
  const inseto =
    (y === 7 && x >= 6 && x <= 9) ||
    (y === 8 && (x === 7 || x === 8)) ||
    ((y === 6 || y === 9) && (x === 5 || x === 10));
  if (inseto) return cor('#4a2a10', x, y, s);
  if ((y === 5 || y === 6) && (x === 7 || x === 8)) return cor('#f8e0a0', x, y, s);
  const d = Math.hypot(x - 7.5, y - 7.5) / 10.6;
  const p = rampa(AMBAR, 1 - d + fbmT(x, y, 2, s) * 0.3 - 0.15, x, y, s);
  if (borda(x, y)) return escurece(p, 0.66);
  if (x + y === 5 || x + y === 6) return cor('#ffe8a8', x, y, s);
  return p;
};

/** Penugem: escamas de pena sobrepostas (chevrons) na cor dada. */
function penugemDe(c: string, ponta?: string): Pintor {
  const base = hex(c);
  const pt = ponta ? hex(ponta) : null;
  return (x, y, s) => {
    const fila = y >> 2;
    const lx = mod(x + (fila % 2 ? 2 : 0), 4);
    const ly = y & 3;
    const curva = Math.abs(lx - 1.5) * 0.5 + ly * 0.12;
    let f = 1.08 - curva * 0.3 + (hash2(x, y, s) - 0.5) * 0.08;
    if (ly === 3 && lx !== 0 && lx !== 3) f *= 0.78;
    if (pt && ly === 2 && (lx === 1 || lx === 2)) return [pt[0] * f, pt[1] * f, pt[2] * f, 255];
    return [base[0] * f, base[1] * f, base[2] * f, 255];
  };
}

// --- construções -------------------------------------------------------------
const pedregulhoBasalto: Pintor = (x, y, s) => {
  let d1 = 99;
  let d2 = 99;
  let id = 0;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const cx = Math.floor(x / 5) + i;
      const cy = Math.floor(y / 4) + j;
      const ix = mod(cx, 4);
      const iy = mod(cy, 4);
      const px = cx * 4 + hash2(ix, iy, s) * 4;
      const py = cy * 4 + hash2(ix, iy, s + 1) * 4;
      const d = Math.hypot((x + 0.5 - px) * 0.9, y + 0.5 - py);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        id = ix * 7 + iy;
      } else if (d < d2) d2 = d;
    }
  if (d2 - d1 < 0.9) return cor('#1e1d22', x, y, s);
  if (hash2(id, 9, s) > 0.86) return rampa(['#7a3a26', '#8a4430'], hash2(x, y, s), x, y, s);
  const tom = 0.85 + hash2(id, 3, s) * 0.3;
  return escurece(rampa(BASALTO, hash2(x, y, s) * 0.5 + 0.55 - d1 * 0.1, x, y, s), tom);
};

const blocosBasalto: Pintor = (x, y, s) => {
  // blocos lavrados de 8x8 com bisel claro em cima
  const bx = (x + (y >> 3) * 4) & 7;
  const by = y & 7;
  if (bx === 0 || by === 7) return cor('#26272c', x, y, s);
  if (by === 0) return cor('#6a6e78', x, y, s);
  if (bx === 7) return cor('#383b42', x, y, s);
  const tom = 0.92 + hash2((x + (y >> 3) * 4) >> 3, y >> 3, s) * 0.16;
  return escurece(rampa(BASALTO, hash2(x, y, s) * 0.5 + fbmT(x, y, 4, s) * 0.5, x, y, s), tom);
};

const basaltoPolido: Pintor = (x, y, s) => {
  if (x === 0 || y === 0) return cor('#7a7e88', x, y, s);
  if (x === T - 1 || y === T - 1) return cor('#2c2e34', x, y, s);
  if (x + y === 8 || x + y === 9) return cor('#686c76', x, y, s);
  return rampa(
    ['#4a4d56', '#50545d', '#565a63'],
    hash2(x, y, s) * 0.4 + fbmT(x, y, 2, s) * 0.6,
    x,
    y,
    s,
  );
};

const tijolosArgila: Pintor = (x, y, s) => {
  const fila = y >> 2;
  const desl = fila % 2 ? 3 : 0;
  const lx = mod(x + desl, 6);
  if (y % 4 === 3 || lx === 0) return rampa(['#5a4434', '#644c3a'], hash2(x, y, s), x, y, s);
  if (hash2(x, y, s + 7) > 0.9) return cor('#d8b86a', x, y, s); // palhinha
  const tom = 0.9 + hash2(Math.floor((x + desl) / 6), fila, s) * 0.2;
  return escurece(
    rampa(
      ['#a8603a', '#b46a42', '#c0764a', '#c98252'],
      hash2(x, y, s) * 0.6 + fbmT(x, y, 4, s) * 0.4,
      x,
      y,
      s,
    ),
    tom,
  );
};

const cipoMadeira = ['#6a4a2e', '#7a5634', '#8a623b'];
function molduraCipo(miolo: Pintor): Pintor {
  return (x, y, s) => {
    if (x <= 1 || y <= 1 || x >= T - 2 || y >= T - 2) {
      const p = rampa(cipoMadeira, hash2(x, y, s), x, y, s);
      if ((x <= 1 || x >= T - 2) && (y <= 1 || y >= T - 2)) return cor('#7a8a3a', x, y, s);
      return borda(x, y) ? escurece(p, 0.68) : p;
    }
    return miolo(x, y, s);
  };
}

const osso = (x: number, y: number, s: number) =>
  rampa(['#e2d6b6', '#efe6cc', '#f8f2e0'], hash2(x, y, s), x, y, s);

const mesaTopo: Pintor = molduraCipo((x, y, s) => {
  // um osso fóssil em cima da bancada e um pincel
  const u = x - 7.5;
  const v = y - 6;
  if (Math.abs(v) < 0.8 && Math.abs(u) < 3.5) return osso(x, y, s);
  if (Math.abs(v) < 1.6 && Math.abs(Math.abs(u) - 3.6) < 1.2) return osso(x, y, s);
  if (x >= 4 && x <= 11 && y === 11) return cor('#8a5a2e', x, y, s);
  if (x >= 11 && x <= 12 && y >= 10 && y <= 12) return cor('#e8c060', x, y, s);
  return tabuasSamambaia(x, y, s);
});
const mesaLado: Pintor = (x, y, s) => {
  if (y < 3) return rampa(cipoMadeira, hash2(x, y, s), x, y, s);
  // mapa de expedição pregado na lateral, com uma trilha de pegadas
  if (x >= 3 && x <= 12 && y >= 5 && y <= 12) {
    if (x === 3 || x === 12 || y === 5 || y === 12) return cor('#b8945a', x, y, s);
    if ((x + y) % 3 === 0 && Math.abs(x - 4 - (y - 6) * 1.2) < 1.2) return cor('#8a4a2a', x, y, s);
    if (x === 10 && y === 7) return cor('#c43a32', x, y, s);
    return rampa(['#e8d6a8', '#f0e0b6'], hash2(x, y, s), x, y, s);
  }
  return escurece(tabuasSamambaia(x, y, s), 0.9);
};
const mesaFrente: Pintor = (x, y, s) => {
  if (y < 3) return rampa(cipoMadeira, hash2(x, y, s), x, y, s);
  // martelinho de geólogo
  if (x >= 2 && x <= 6 && y >= 5 && y <= 6) return cor('#8a8e98', x, y, s);
  if (x === 4 && y >= 7 && y <= 12) return cor('#6b4423', x, y, s);
  // pincel
  if (x === 9 && y >= 5 && y <= 10) return cor('#7a4a26', x, y, s);
  if (x >= 8 && x <= 10 && y >= 11 && y <= 13) return cor('#e8c060', x, y, s);
  // lupa
  const r = Math.hypot(x - 12.5, y - 6.5);
  if (r < 1.2) return cor('#bfe6f0', x, y, s);
  if (r < 2) return cor('#3a3a40', x, y, s);
  if (x === 13 && y >= 9 && y <= 12) return cor('#3a3a40', x, y, s);
  return tabuasSamambaia(x, y, s);
};

const fornoLado: Pintor = (x, y, s) => escurece(pedregulhoBasalto(x, y, s), 0.96);
function bocaForno(acesa: boolean): Pintor {
  return (x, y, s) => {
    // boca em arco
    const dx = x - 7.5;
    const arco =
      y >= 7 && y <= 13 && Math.abs(dx) <= 4 && !(y < 9 && Math.abs(dx) > 4 - (9 - y) * 1.5);
    if (arco) {
      const contorno =
        y === 13 || Math.abs(dx) > 3.4 || (y < 9 && Math.abs(dx) > 3.4 - (9 - y) * 1.5) || y === 7;
      if (contorno) return cor('#1c1c20', x, y, s);
      if (!acesa) return rampa(['#141416', '#1c1c20'], hash2(x, y, s), x, y, s);
      const f = (13 - y) / 5 + hash2(x, y, s) * 0.4;
      return rampa(['#c23a0a', '#e86a12', '#ffa52a', '#ffd25a'], f, x, y, s);
    }
    if (y === 14 && Math.abs(dx) <= 5) return cor('#6a6e78', x, y, s);
    return fornoLado(x, y, s);
  };
}

const caixaMadeira = (x: number, y: number, s: number) =>
  rampa(
    ['#8a6038', '#966a3e', '#a27446'],
    ruidoT(x, y, 2, 8, s) * 0.7 + hash2(x, y, s) * 0.3,
    x,
    y,
    s,
  );
const bauLado: Pintor = molduraCipo((x, y, s) =>
  y === 6 || y === 7 ? cor('#6b7a36', x, y, s) : caixaMadeira(x, y, s),
);
const bauTopo: Pintor = molduraCipo((x, y, s) => {
  if (x === 7 || x === 8) return cor('#6b7a36', x, y, s);
  return caixaMadeira(y, x, s);
});
const bauFrente: Pintor = (x, y, s) => {
  // emblema de osso cruzado no meio (fecho)
  const u = x - 7.5;
  const v = y - 7.5;
  if (Math.abs(u - v) < 0.8 && Math.abs(u) < 3) return osso(x, y, s);
  if (Math.abs(u + v) < 0.8 && Math.abs(u) < 3) return osso(x, y, s);
  return bauLado(x, y, s);
};

const vidroAreia: Pintor = (x, y, s) => {
  if (borda(x, y)) return rampa(['#c8a878', '#d6b888'], hash2(x, y, s), x, y, s);
  if ((x === 1 || y === 1) && hash2(x, y, s) > 0.5) return [240, 214, 170, 200];
  if ((x === y + 3 || x === y + 4) && x > 3 && x < 10) return [255, 246, 220, 255];
  if (x === y - 4 && x > 7 && x < 12) return [255, 246, 220, 255];
  return VAZIO;
};

const tochaResina: Pintor = (x, y, s) => {
  if (x >= 7 && x <= 8 && y >= 8) return rampa(['#5a3a20', '#6b4423'], hash2(x, y, s), x, y, s);
  if (x >= 6 && x <= 9 && y >= 5 && y <= 7)
    return rampa(['#c8781a', '#e09426'], hash2(x, y, s), x, y, s);
  if (x >= 6 && x <= 9 && y >= 1 && y <= 4) {
    const f = (4 - y) / 3 + hash2(x, y, s) * 0.3;
    return rampa(['#e8541a', '#ff8a2e', '#ffc44a', '#fff0a8'], f, x, y, s);
  }
  if (x >= 7 && x <= 8 && y === 0) return cor('#ffb43a', x, y, s);
  return VAZIO;
};

/** Lamparina de concha: moldura de concha creme com sulcos e luz quente dentro. */
const lamparina: Pintor = (x, y, s) => {
  const fora = x <= 1 || x >= T - 2 || y <= 1 || y >= T - 2;
  if (fora) {
    const sulco = (x + y) % 3 === 0;
    return sulco ? cor('#b88a6a', x, y, s) : rampa(['#ecd6b8', '#f4e4cc'], hash2(x, y, s), x, y, s);
  }
  const d = Math.hypot(x - 7.5, y - 8.5) / 6.5;
  if (y >= 11) return rampa(['#d8b090', '#e8c8a4'], hash2(x, y, s), x, y, s);
  return rampa(['#ff9a2a', '#ffbe4a', '#ffe08a'], 1 - d + hash2(x, y, s) * 0.2, x, y, s);
};

const ninhoTopo: Pintor = (x, y, s) => {
  const r = Math.hypot(x - 7.5, y - 7.5);
  if (r > 5.2) {
    // gravetos trançados
    const tranca = (x + y * 2) % 4 < 2;
    return rampa(tranca ? ['#7a5530', '#8a6038'] : ['#5a3c22', '#664428'], hash2(x, y, s), x, y, s);
  }
  // forro macio de penugem e folhas
  if (hash2(x >> 1, y >> 1, s + 5) > 0.82) return cor('#7aa846', x, y, s);
  return rampa(
    ['#efe2c8', '#f6ead6', '#fff6e8'],
    hash2(x, y, s) * 0.5 + (1 - r / 5) * 0.5,
    x,
    y,
    s,
  );
};
const ninhoLado: Pintor = (x, y, s) => {
  if (y < 3) return rampa(['#efe2c8', '#f6ead6'], hash2(x, y, s), x, y, s);
  const tranca = (x + y * 2) % 5 < 2 !== y % 4 < 2;
  return rampa(tranca ? ['#7a5530', '#8a6038'] : ['#5a3c22', '#664428'], hash2(x, y, s), x, y, s);
};

const porta: Pintor = (x, y, s) => {
  const janela = x >= 4 && x <= 11 && y >= 2 && y <= 6 && x !== 7 && x !== 8;
  if (janela) return VAZIO;
  if (x === 12 && (y === 8 || y === 9)) return osso(x, y, s);
  const p = tabuasSamambaia(x, y, s);
  return borda(x, y) ? escurece(p, 0.7) : p;
};

// --- cabaça ------------------------------------------------------------------
const cabacaLado: Pintor = (x, y, s) => {
  const gomo = x % 5 === 0;
  const listra = (x + Math.floor(ruidoT(x, y, 2, 4, s) * 3)) % 5 === 2;
  if (gomo) return rampa(['#6a7a2a', '#728230'], hash2(x, y, s), x, y, s);
  if (listra) return rampa(['#c8c460', '#d4d06a'], hash2(x, y, s), x, y, s);
  return rampa(
    ['#8aa03a', '#98ae42', '#a6ba4c'],
    hash2(x, y, s) * 0.5 + ruidoT(x, y, 4, 1, s) * 0.5,
    x,
    y,
    s,
  );
};
const cabacaTopo: Pintor = (x, y, s) => {
  if (Math.abs(x - 7.5) < 1.5 && Math.abs(y - 7.5) < 1.5)
    return rampa(['#5a3e22', '#6b4a2a'], hash2(x, y, s), x, y, s);
  const r = Math.hypot(x - 7.5, y - 7.5);
  const a = Math.atan2(y - 7.5, x - 7.5);
  if (Math.abs(Math.sin(a * 3)) < 0.18 && r > 2) return cor('#6a7a2a', x, y, s);
  return rampa(['#8aa03a', '#98ae42', '#a6ba4c'], hash2(x, y, s) * 0.5 + r / 20, x, y, s);
};
const cabacaRosto: Pintor = (x, y, s) => {
  // carinha sorridente que brilha
  const olho = y >= 4 && y <= 6 && ((x >= 3 && x <= 5) || (x >= 10 && x <= 12));
  const sorriso = Math.abs(Math.hypot(x - 7.5, y - 6) - 5) < 0.9 && y >= 9 && x >= 3 && x <= 12;
  if (olho || sorriso) return rampa(['#ffc44a', '#ffe08a'], hash2(x, y, s), x, y, s);
  return cabacaLado(x, y, s);
};

// --- pintores por tile ---------------------------------------------------------
export const PINTORES_DINOS: Record<string, Pintor> = {
  grama_topo: relvaTopo,
  grama_lado: relvaLado,
  terra,
  pedra: basalto,
  areia: areiaConchas,
  tronco: troncoEscamas(['#4a3322', '#563c27', '#62452c', '#6e4e33'], '#2a1c12', '#8a6a42'),
  tronco_topo: aneisDe(
    ['#3a2a1c', '#4a3322'],
    [
      ['#8a6a3e', '#94723f'],
      ['#6e5030', '#765834'],
    ],
  ),
  folhas: frondesDe(['#2e6a22', '#387a28', '#438a2e', '#509a36', '#5eaa3e']),
  cristal: cristalVulcanico,
  tabuas: tabuasSamambaia,
  grama_alta: samambainha,
  flor: magnolia,
  cogumelo: cogumeloBrasa,
  pedregulho: pedregulhoBasalto,
  cascalho: (x, y, s) => {
    // pedrisco de escória: grãos avermelhados e pretos com furinhos
    const v = hash2(x >> 1, y >> 1, s);
    if (hash2(x, y, s + 5) > 0.9) return cor('#141214', x, y, s);
    const paleta = v > 0.6 ? ['#6a3426', '#7a3e2c', '#8a4832'] : ['#3e3836', '#4a4340', '#56504c'];
    return rampa(paleta, hash2(x, y, s) * 0.6 + v * 0.4, x, y, s);
  },
  rocha_matriz: (x, y, s) => {
    // rocha preta com fendas de magma (as fendas brilham)
    const fenda = Math.abs(ruidoT(x, y, 4, 4, s + 5) - 0.5) < 0.05;
    if (fenda) return rampa(['#e8501a', '#ff7a2a'], hash2(x, y, s), x, y, s);
    const p = rampa(
      ['#141216', '#1c1a1e', '#262428', '#323036'],
      fbmT(x, y, 8, s) * 0.6 + hash2(x, y, s) * 0.4,
      x,
      y,
      s,
    );
    return Math.abs(ruidoT(x, y, 4, 4, s + 5) - 0.5) < 0.1
      ? mistura(p, [120, 40, 20, 255], 0.5)
      : p;
  },
  min_carvao: minCarvao,
  min_cobre: minAmonite,
  min_ferro: minOsso,
  min_ouro: minPirita,
  min_luzita: minAmbar,
  neve: (x, y, s) => {
    // cinza vulcânica: cinza-claro morno com pontinhos escuros
    if (hash2(x, y, s + 3) > 0.93) return cor('#7a7470', x, y, s);
    return rampa(CINZA, fbmT(x, y, 4, s) * 0.4 + hash2(x, y, s) * 0.6, x, y, s);
  },
  neve_lado: ladoComTopo((x, y, s) => rampa(CINZA, hash2(x, y, s), x, y, s), terra, '#8a827a', 3),
  gelo: (x, y, s) => {
    // obsidiana: vidro preto-arroxeado com reflexos em lasca
    const lasca = Math.abs(((x + y * 2) % 13) - 6) < 0.6 && hash2(x >> 2, y >> 2, s) > 0.35;
    if (lasca) return cor('#9a8ab8', x, y, s);
    const curva = Math.abs(Math.hypot(x - 4, y - 12) - 7) < 0.5;
    if (curva) return cor('#4e4466', x, y, s);
    return rampa(
      ['#141220', '#1c1a2a', '#262236', '#302a42'],
      fbmT(x, y, 2, s) * 0.7 + hash2(x, y, s) * 0.3,
      x,
      y,
      s,
    );
  },
  arenito_lado: (x, y, s) => {
    // camadas vermelhas e creme, com uma conchinha fóssil de vez em quando
    const camada = Math.floor((y + Math.sin(x * 0.4 + s) * 0.8) / 3) % 3;
    const paleta = camada === 2 ? ['#e2b48a', '#e8bf96'] : ARENITO;
    const p = rampa(paleta, hash2(x, y, s) * 0.6 + fbmT(x, y, 4, s) * 0.4, x, y, s);
    if (y % 3 === 2 && hash2(x, y, s + 9) > 0.5) return escurece(p, 0.86);
    return p;
  },
  arenito_topo: (x, y, s) => {
    const r = Math.hypot(x - 7.5, y - 7.5);
    const p = rampa(ARENITO, hash2(x, y, s) * 0.5 + fbmT(x, y, 4, s) * 0.5, x, y, s);
    return Math.floor(r) % 4 === 3 ? escurece(p, 0.88) : p;
  },
  areia_deserto: (x, y, s) => {
    const onda = Math.sin((y * 1.2 + x * 0.3 + fbmT(x, y, 2, s) * 4) * 0.9) * 0.5 + 0.5;
    if (hash2(x, y, s + 4) > 0.96) return cor('#8a3a1e', x, y, s);
    return rampa(AREIA_VERMELHA, onda * 0.55 + hash2(x, y, s) * 0.45, x, y, s);
  },
  cacto_lado: (x, y, s) => {
    // planta-espinho: tronco de cica com escamas e espinhos claros
    if (x === 0 || x === T - 1) return (y + 2) % 4 === 0 ? cor('#efe6b8', x, y, s) : VAZIO;
    const fila = y >> 2;
    const lx = mod(x + (fila % 2 ? 2 : 0), 4);
    const ly = y & 3;
    if (lx === 0 && ly === 0) return cor('#efe6b8', x, y, s);
    const p = rampa(
      ['#4a7a30', '#548a36', '#5e983c'],
      hash2(x, y, s) * 0.5 + (3 - ly) * 0.15,
      x,
      y,
      s,
    );
    return ly === 3 ? escurece(p, 0.7) : p;
  },
  cacto_topo: (x, y, s) => {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    if (d > 6.6) return VAZIO;
    const a = Math.atan2(y - 7.5, x - 7.5);
    if (Math.abs(Math.sin(a * 4)) < 0.2) return cor('#86c05a', x, y, s);
    return rampa(d < 2 ? ['#a8d070'] : ['#4a7a30', '#548a36'], hash2(x, y, s), x, y, s);
  },
  arbusto_seco: samambaiaSeca,
  betula: (x, y, s) => {
    // araucária: casca em placas horizontais acinzentadas
    const fila = y >> 1;
    const desl = Math.floor(hash2(fila, 0, s) * 5);
    const lx = mod(x + desl, 5);
    const p = rampa(
      ['#7a6a5a', '#867664', '#92826e', '#9e8e78'],
      hash2(x, y, s) * 0.6 + fbmT(x, y, 2, s) * 0.4,
      x,
      y,
      s,
    );
    if (y % 2 === 1) return escurece(p, 0.72);
    if (lx === 0) return escurece(p, 0.82);
    return p;
  },
  betula_topo: aneisDe(
    ['#6a5a4a', '#7a6a5a'],
    [
      ['#d8b878', '#e0c080'],
      ['#c8a464', '#d0ac6c'],
    ],
  ),
  folhas_betula: (x, y, s) => {
    // ramos de araucária: tufos espinhentos verde-azulados
    const lx = x & 3;
    const ly = y & 3;
    const tufo = hash2(x >> 2, y >> 2, s + 7);
    if ((lx === 0 || ly === 0) && hash2(x, y, s + 21) < 0.45) return VAZIO;
    if (lx === ly || lx + ly === 3) return rampa(['#5a9a72', '#68a87e'], tufo, x, y, s);
    return rampa(
      ['#1e4a36', '#245640', '#2c624a', '#346e52'],
      tufo * 0.5 + hash2(x, y, s) * 0.5,
      x,
      y,
      s,
    );
  },
  pinho: (x, y, s) => {
    // pinheiro antigo: casca avermelhada com sulcos verticais fundos
    const sulco = mod(x + Math.floor(ruidoT(x, y, 2, 4, s) * 3), 4) === 0;
    const p = rampa(
      ['#5a2e20', '#683626', '#763e2c', '#844832'],
      ruidoT(x, y, 8, 2, s) * 0.6 + hash2(x, y, s) * 0.4,
      x,
      y,
      s,
    );
    return sulco ? escurece(p, 0.55) : p;
  },
  pinho_topo: aneisDe(
    ['#4a2418', '#5a2e20'],
    [
      ['#b07a4a', '#b8824e'],
      ['#9a6a3e', '#a07042'],
    ],
  ),
  folhas_pinho: (x, y, s) => {
    // agulhas compridas em feixes verticais, verde-escuro
    const feixe = (x + Math.floor(hash2(x >> 2, y >> 3, s) * 3)) % 3;
    if (feixe === 0 && hash2(x, y, s + 21) < 0.4) return VAZIO;
    if (feixe === 1) return rampa(['#3a7a4a', '#448654'], hash2(x, y, s), x, y, s);
    return rampa(['#173a26', '#1d4630', '#235238'], hash2(x, y >> 1, s), x, y, s);
  },
  pantano_topo: (x, y, s) => {
    // lodo com algas e bolhinhas
    const b = Math.hypot((x & 7) - 3.5, (y & 7) - 3.5);
    const tem = hash2(x >> 3, y >> 3, s + 8) > 0.45;
    if (tem && Math.abs(b - 1.6) < 0.5) return cor('#a8b86a', x, y, s);
    if (tem && b < 1.1) return cor('#3a4420', x, y, s);
    if (hash2(x, y, s + 3) > 0.9) return cor('#7aa040', x, y, s);
    return rampa(LODO, fbmT(x, y, 4, s) * 0.6 + hash2(x, y, s) * 0.4, x, y, s);
  },
  pantano_lado: ladoComTopo(
    (x, y, s) => rampa(LODO, hash2(x, y, s), x, y, s),
    (x, y, s) => rampa(LAMA, hash2(x, y, s) * 0.6 + fbmT(x, y, 4, s) * 0.4, x, y, s),
    '#2e3418',
  ),
  lama: (x, y, s) => {
    // lama quentinha com bolhas
    const cx = (x & 7) - 3.5 + (hash2(x >> 3, y >> 3, s) - 0.5) * 2;
    const cy = (y & 7) - 3.5;
    const r = Math.hypot(cx, cy);
    const bolha = hash2(x >> 3, y >> 3, s + 2) > 0.3;
    if (bolha && Math.abs(r - 1.5) < 0.45) return cor('#8a6a4a', x, y, s);
    if (bolha && r < 1) return cor('#3a281a', x, y, s);
    return rampa(LAMA, hash2(x, y, s) * 0.6 + fbmT(x, y, 4, s) * 0.4, x, y, s);
  },
  junco: cavalinha,
  tronco_lanterna: troncoEscamas(
    ['#5a5030', '#665a36', '#72643c', '#7e6e42'],
    '#c87a2a',
    '#9a8a52',
    4,
  ),
  tronco_lanterna_topo: aneisDe(
    ['#4a4228', '#5a5030'],
    [
      ['#c8a868', '#d0b070'],
      ['#a88a50', '#b09256'],
    ],
  ),
  folhas_lanterna: (x, y, s) => {
    // folhas duras de cica com cones laranja que brilham
    const cone = Math.hypot((x & 7) - 3.5, ((y & 7) - 3.5) * 0.7) < 2;
    if (cone && hash2(x >> 3, y >> 3, s + 9) > 0.5)
      return (x + y) % 2 ? cor('#ff9a2a', x, y, s) : cor('#ffc24a', x, y, s);
    return frondesDe(['#1e5a2a', '#246632', '#2c723a', '#347e42'], 0.12)(x, y, s);
  },
  vidro: vidroAreia,
  tocha: tochaResina,
  lanterna: lamparina,
  bloco_luzita: blocoAmbar,
  mesa_topo: mesaTopo,
  mesa_lado: mesaLado,
  mesa_frente: mesaFrente,
  fornalha_lado: fornoLado,
  fornalha_topo: (x, y, s) => {
    const r = Math.hypot(x - 7.5, y - 7.5);
    if (r < 2.5) return cor('#141214', x, y, s);
    if (r < 3.3) return cor('#6a6e78', x, y, s);
    return escurece(pedregulhoBasalto(x, y, s), 0.9);
  },
  fornalha_frente: bocaForno(false),
  fornalha_acesa: bocaForno(true),
  bau_lado: bauLado,
  bau_topo: bauTopo,
  bau_frente: bauFrente,
  tijolos: tijolosArgila,
  tijolos_pedra: blocosBasalto,
  pedra_lisa: basaltoPolido,
  la_branca: penugemDe('#efe8dc', '#fffaf0'),
  la_vermelha: penugemDe('#c43a32', '#e86a4a'),
  la_laranja: penugemDe('#e8822a', '#ffb050'),
  la_amarela: penugemDe('#e8c43a', '#fff07a'),
  la_verde: penugemDe('#4e9a3a', '#8ad060'),
  la_azul: penugemDe('#2a7ab0', '#5ac0e0'),
  la_roxa: penugemDe('#7a42a8', '#b080d8'),
  la_preta: penugemDe('#2c2a30', '#56525e'),
  frutinhas: moitaBagas,
  folhas_outono: (x, y, s) => {
    // leques de ginkgo dourados
    const cx = (x & 3) - 1.5;
    const cy = (y & 3) - 0.5;
    const leque = cy >= -0.6 && Math.abs(cx) <= cy + 1.2;
    if (!leque && hash2(x, y, s + 21) < 0.55) return VAZIO;
    const t = fbmT(x, y, 4, s) * 0.5 + hash2(x, y, s) * 0.5;
    if (!leque) return rampa(['#8a7a1a', '#9a8a22'], t, x, y, s);
    return rampa(['#d8a018', '#e8b424', '#f4c834', '#ffd84a'], t, x, y, s);
  },
  cama_topo: ninhoTopo,
  cama_lado: ninhoLado,
  porta,
  tabuas_betula: tabuasAraucaria,
  tabuas_pinho: tabuasPinheiro,
  abobora_lado: cabacaLado,
  abobora_topo: cabacaTopo,
  abobora_rosto: cabacaRosto,

  // spec 013: terra vulcânica arada, capim-dourado, milho-gigante, cabaça gigante e fardo
  // de capim-dourado amarrado com cipó
  terra_arada: terraAradaDe(terra, 0.42, 0.26),
  trigo: trigoDe(['#3a6a22', '#467a28', '#528a30'], ['#d49a1c', '#e8b42c', '#f6cc44'], '#ffe488'),
  milho: milhoDe(
    ['#2e6a22', '#387a28', '#438a2e', '#509a36'],
    ['#d8801c', '#ec9a2c', '#f8b844'],
    '#d8c070',
  ),
  aboboreira: aboboreiraDe(
    ['#2e6a22', '#387a28', '#438a2e', '#509a36'],
    ['#7a922e', '#8aa03a', '#98ae42', '#a6ba4c'],
    '#6a4a22',
  ),
  feno_lado: fenoLadoDe(['#b88a24', '#c89a32', '#d6aa42', '#e2ba54'], '#2e5a1c'),
  feno_topo: fenoTopoDe(['#bc8e28', '#cc9e36', '#daae46', '#e6be58'], '#2e5a1c'),
};
