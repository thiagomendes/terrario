import {
  T,
  VAZIO,
  metadesDaPorta,
  bordaDaPorta,
  escurece,
  fbmT,
  hex,
  ladoComTopo,
  moldura,
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
 * Exploração Lunar: tiles pintados para uma base na Lua. Mundo quase todo cinza, então
 * cada material se distingue por FORMA e BRILHO: regolito granulado com microcrateras,
 * rocha lunar em facetas com rachaduras, basalto colunar, brecha de cacos claros e
 * escuros, minérios em pepitas contornadas, colunas e pontas de cristal, placas de liga
 * rebitadas, tecido de traje em trama de reforço e cerâmica térmica no forno.
 */

const mod = (a: number, n: number) => ((a % n) + n) % n;
const um = (c: string, x: number, y: number, s: number): Px => rampa([c], 0, x, y, s);
const clareia = (p: Px, f: number): Px => [p[0] * f, p[1] * f, p[2] * f, p[3]];
const borda1 = (x: number, y: number) => x === 0 || y === 0 || x === T - 1 || y === T - 1;

/** Distância com volta (o tile se repete sem costura). */
function dv(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, T - d);
}

/** Ponto sorteado mais próximo (n pontos por tile, com volta). */
function maisProximo(x: number, y: number, s: number, n: number) {
  let melhor = 99;
  let k = 0;
  let ox = 0;
  let oy = 0;
  for (let i = 0; i < n; i++) {
    const cx = hash2(i, 7, s) * T;
    const cy = hash2(i, 8, s) * T;
    let dx = x + 0.5 - cx;
    let dy = y + 0.5 - cy;
    if (dx > T / 2) dx -= T;
    if (dx < -T / 2) dx += T;
    if (dy > T / 2) dy -= T;
    if (dy < -T / 2) dy += T;
    const d = Math.hypot(dx, dy);
    if (d < melhor) {
      melhor = d;
      k = i;
      ox = dx;
      oy = dy;
    }
  }
  return { d: melhor, k, dx: ox, dy: oy };
}

// --- regolito ----------------------------------------------------------------

const REGOLITO = ['#979691', '#a09f9a', '#a9a8a3', '#b2b1ac', '#bcbbb6'];
const REGOLITO_GROSSO = ['#54514c', '#5d5a54', '#66625c', '#6f6b64'];

/** Pó fino com grãos claros e escuros e microcrateras (luz vinda do alto à esquerda). */
function regolito(cores: string[], crateras: number, grao = '#c6c3bd', fundo = '#5e5b57'): Pintor {
  return (x, y, s) => {
    const p = rampa(cores, fbmT(x, y, 4, s) * 0.4 + hash2(x, y, s) * 0.6, x, y, s);
    if (crateras > 0) {
      const c = maisProximo(x, y, s + 300, crateras);
      const r = 1.7 + hash2(c.k, 9, s + 300) * 1.6;
      if (c.d < r) {
        // tigela: parede de cima à esquerda na sombra, de baixo à direita iluminada
        const lado = (c.dx + c.dy) / r;
        return escurece(p, 0.8 + lado * 0.14);
      }
      if (c.d < r + 0.9) return clareia(p, c.dx + c.dy < 0 ? 1.16 : 1.04);
    }
    const g = hash2(x, y, s + 3);
    if (g > 0.95) return um(grao, x, y, s);
    if (g < 0.04) return um(fundo, x, y, s);
    return p;
  };
}

const regolitoFino = regolito(REGOLITO, 3);

/** Regolito grosso: pó mais escuro com pedrinhas de dois pixels. */
const regolitoGrosso: Pintor = (x, y, s) => {
  const cx = x >> 1;
  const cy = y >> 1;
  if (hash2(cx, cy, s + 11) > 0.86) {
    // pedrinha: topo claro, base escura
    return um((y & 1) === 0 ? '#8e887f' : '#4a4640', x, y, s);
  }
  const g = hash2(x, y, s + 3);
  if (g > 0.95) return um('#8a857c', x, y, s);
  return rampa(REGOLITO_GROSSO, fbmT(x, y, 4, s) * 0.45 + hash2(x, y, s) * 0.55, x, y, s);
};

// --- rochas ------------------------------------------------------------------

const ROCHA = ['#5d616a', '#666a73', '#70747d', '#7a7e87', '#868a93'];

/** Rocha lunar: facetas planas (tons em degraus) e rachaduras finas. */
export function rochaLunar(x: number, y: number, s: number): Px {
  const f = Math.floor(fbmT(x, y, 2, s) * 5) / 5;
  const p = rampa(ROCHA, f * 0.75 + hash2(x, y, s) * 0.25, x, y, s);
  const r = ruidoT(x, y, 3, 3, s + 40);
  if (Math.abs(r - 0.5) < 0.04) return um('#42454c', x, y, s);
  if (Math.abs(r - 0.5) < 0.075 && r > 0.5) return clareia(p, 1.1);
  if (hash2(x, y, s + 4) > 0.965) return um('#9ea2aa', x, y, s);
  return p;
}

interface OpcoesVeio {
  n: number;
  raio: [number, number];
  cores: string[];
  brilho: string;
  contorno: string;
  /** Agulhas inclinadas (titânio) em vez de pepitas redondas. */
  agulha?: boolean;
}

/**
 * Minério: pepitas (ou agulhas) com contorno escuro e um ponto de brilho em cima à
 * esquerda — no mundo cinza a forma e o brilho é que fazem o minério saltar da rocha.
 */
function veio(o: OpcoesVeio): Pintor {
  return (x, y, s) => {
    const c = maisProximo(x, y, s + 500, o.n);
    const r = o.raio[0] + hash2(c.k, 9, s + 500) * (o.raio[1] - o.raio[0]);
    let d = c.d;
    if (o.agulha) {
      // distância alongada ao longo da diagonal
      const sinal = hash2(c.k, 10, s + 500) > 0.5 ? 1 : -1;
      const ao = (c.dx + c.dy * sinal) * 0.7071;
      const tr = (c.dx - c.dy * sinal) * 0.7071;
      d = Math.hypot(ao * 0.42, tr * 1.5);
    }
    if (d < r) {
      const realce = c.dx + c.dy < -r * 0.5 && d < r * 0.75;
      if (realce && hash2(x, y, s + 6) > 0.35) return um(o.brilho, x, y, s);
      return rampa(o.cores, 1 - d / r + hash2(x, y, s) * 0.25, x, y, s);
    }
    if (d < r + 0.85) return um(o.contorno, x, y, s);
    return rochaLunar(x, y, s);
  };
}

/** Basalto colunar visto de lado: colunas de 4 pixels com juntas desencontradas. */
const basaltoLado: Pintor = (x, y, s) => {
  const col = x >> 2;
  const junta = Math.floor(hash2(col, 0, s) * 16);
  const p = rampa(
    ['#43464e', '#4b4e57', '#53565f', '#5c5f68'],
    hash2(x, y, s) * 0.5 + (0.3 + hash2(col, 1, s) * 0.4) * 0.5,
    x,
    y,
    s,
  );
  if (x % 4 === 0) return um('#2c2e34', x, y, s);
  if (x % 4 === 1) return clareia(p, 1.12);
  if (y === junta || y === mod(junta + 9, 16)) return um('#2f3137', x, y, s);
  // vesículas (bolhas de gás no basalto)
  if (hash2(x, y, s + 7) > 0.95) return um('#30323a', x, y, s);
  return p;
};

/** Basalto visto de cima: favos de colunas (quase hexágonos). */
const basaltoTopo: Pintor = (x, y, s) => {
  const fila = y >> 2;
  const desloc = fila % 2 ? 2 : 0;
  const col = Math.floor((x + desloc) / 4);
  const ex = (x + desloc) % 4;
  const ey = y % 4;
  if (ey === 3 || ex === 0) return um('#2c2e34', x, y, s);
  const tom = 0.88 + hash2(mod(col, 4), fila, s) * 0.24;
  const p = rampa(['#4b4e57', '#53565f', '#5c5f68'], hash2(x, y, s), x, y, s);
  return escurece(ey === 0 || ex === 1 ? clareia(p, 1.1) : p, tom);
};

/** Brecha lunar: cacos angulosos claros e escuros colados numa matriz cinza. */
const brecha: Pintor = (x, y, s) => {
  let d1 = 99;
  let d2 = 99;
  let id = 0;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const cx = Math.floor(x / 4) + i;
      const cy = Math.floor(y / 4) + j;
      const px = cx * 4 + hash2(mod(cx, 4), mod(cy, 4), s) * 4;
      const py = cy * 4 + hash2(mod(cx, 4), mod(cy, 4), s + 1) * 4;
      // distância de Chebyshev: cacos angulosos, não seixos redondos
      const d = Math.max(Math.abs(x + 0.5 - px), Math.abs(y + 0.5 - py));
      if (d < d1) {
        d2 = d1;
        d1 = d;
        id = mod(cx, 4) * 7 + mod(cy, 4);
      } else if (d < d2) d2 = d;
    }
  if (d2 - d1 < 0.7) return rampa(['#5b5852', '#635f59'], hash2(x, y, s), x, y, s);
  const tipo = hash2(id, 3, s);
  const cores =
    tipo < 0.3
      ? ['#b8b5ad', '#c3c0b8', '#cdcac2']
      : tipo < 0.65
        ? ['#3f4148', '#474950', '#50525a']
        : ['#767880', '#80828a', '#8b8d95'];
  const p = rampa(cores, hash2(x, y, s) * 0.6 + 0.2, x, y, s);
  return d1 < 0.9 && tipo < 0.3 ? clareia(p, 1.06) : p;
};

/** Cascalho de impacto: pedaços de 2x2, com contas de vidro laranja e verde. */
const cascalhoImpacto: Pintor = (x, y, s) => {
  const v = hash2(x >> 1, y >> 1, s);
  const b = hash2(x, y, s + 9);
  if (b > 0.975) return um(hash2(x, y, s + 10) > 0.5 ? '#e0883a' : '#7fbf5a', x, y, s);
  const p = rampa(['#5f5c58', '#75716b', '#8c8780', '#a7a29a'], v * 0.75 + b * 0.25, x, y, s);
  return (x & 1) === 1 && (y & 1) === 1 ? escurece(p, 0.78) : p;
};

/** Manto lunar (fundo do mundo): quase preto, com veios violeta apagados. */
const manto: Pintor = (x, y, s) => {
  const veia = Math.abs(ruidoT(x, y, 2, 4, s + 2) - 0.5) < 0.05;
  if (veia) return um('#3c3352', x, y, s);
  return rampa(
    ['#141318', '#1b1a21', '#23222a', '#2e2c36'],
    fbmT(x, y, 8, s) * 0.6 + hash2(x, y, s) * 0.4,
    x,
    y,
    s,
  );
};

// --- cristais ----------------------------------------------------------------

/** Coluna de cristal vista de lado: facetas verticais com aresta clara. */
function colunaCristal(cores: string[], aresta: string, inclusao?: string): Pintor {
  return (x, y, s) => {
    // larguras de faceta 3 a 5, fixas por tile
    let x0 = 0;
    let k = 0;
    while (x0 + 3 + Math.floor(hash2(k, 0, s) * 3) <= x) {
      x0 += 3 + Math.floor(hash2(k, 0, s) * 3);
      k++;
    }
    if (x === x0) return um(aresta, x, y, s);
    const tom = hash2(k, 1, s);
    const p = rampa(cores, tom * 0.7 + ruidoT(x, y, 1, 4, s) * 0.3, x, y, s);
    if (inclusao && hash2(x, y >> 1, s + 5) > 0.93) return um(inclusao, x, y, s);
    return x === x0 + 1 ? clareia(p, 1.08) : p;
  };
}

/** Seção de uma coluna de cristal: hexágono com anéis de crescimento. */
function secaoCristal(fora: string[], aneis: [string[], string[]], centro: string): Pintor {
  return (x, y, s) => {
    const dx = Math.abs(x - 7.5);
    const dy = Math.abs(y - 7.5);
    const hx = Math.max(dx * 0.866 + dy * 0.5, dy);
    if (hx > 7.2) return rampa(fora, hash2(x, y, s), x, y, s);
    if (hx > 6.4) return um(fora[0], x, y, s);
    if (hx < 1.6) return um(centro, x, y, s);
    return rampa(Math.floor(hx * 0.8) % 2 ? aneis[0] : aneis[1], hash2(x, y, s), x, y, s);
  };
}

/** Pontas de cristal (as "folhas"): facetas diagonais, arestas claras e centelhas. */
function pontasCristal(cores: string[], buracos: number, centelha: string): Pintor {
  return (x, y, s) => {
    const cx = x >> 2;
    const cy = y >> 2;
    const vira = hash2(cx, cy, s + 2) > 0.5;
    const fase = ((vira ? x - y : x + y) + Math.floor(hash2(cx, cy, s) * 6)) % 6;
    const t = fase / 6;
    if (hash2(x, y, s + 21) < buracos && t > 0.5) return VAZIO;
    if (fase === 0) return clareia(rampa(cores, 0.9, x, y, s), 1.12);
    if (hash2(x, y, s + 33) > 0.975) return um(centelha, x, y, s);
    return rampa(cores, t * 0.75 + hash2(x, y, s) * 0.25, x, y, s);
  };
}

// --- metal e base -------------------------------------------------------------

/** Placas de liga rebitadas, escovadas na horizontal. */
function placasLiga(cores: string[], junta: string, rebite: string): Pintor {
  return (x, y, s) => {
    const fila = y >> 3;
    const desloc = fila % 2 ? 8 : 0;
    const px = (x + desloc) % 8;
    const py = y % 8;
    if (py === 7 || px === 7) return um(junta, x, y, s);
    if ((px === 1 || px === 5) && (py === 1 || py === 5) && (px + py) % 4 === 2)
      return um(rebite, x, y, s);
    const escova = ruidoT(x, y, 1, 16, s) * 0.6 + hash2(x, y, s) * 0.4;
    const p = rampa(cores, escova, x, y, s);
    return py === 0 || px === 0 ? clareia(p, 1.1) : p;
  };
}

/** Chapa antiderrapante: losangos em relevo. */
function chapaLosango(cores: string[], junta: string): Pintor {
  return (x, y, s) => {
    if (y === 0 || x === 0) return um(junta, x, y, s);
    const p = rampa(cores, ruidoT(x, y, 1, 8, s) * 0.5 + hash2(x, y, s) * 0.5, x, y, s);
    const lx = mod(x, 4);
    const ly = mod(y + (((x >> 2) & 1) << 1), 4);
    if ((lx === 1 && ly === 1) || (lx === 2 && ly === 2)) return clareia(p, 1.22);
    if (lx === 2 && ly === 1) return escurece(p, 0.8);
    return p;
  };
}

const AÇO = ['#8a8e96', '#93979f', '#9da1a9', '#a7abb3'];
const placaLiga = placasLiga(AÇO, '#5a5e66', '#d4d8e0');
const placaBranca = placasLiga(['#cdd0d5', '#d5d8dc', '#dddfe3', '#e6e7ea'], '#8d9199', '#f8f9fb');
const chapaAzul = chapaLosango(['#58708c', '#627b97', '#6d86a2', '#7891ad'], '#3c4c60');
const METAL_MOLDURA = ['#6c7079', '#767a83', '#80848d'];

/** Ladrilhos de cerâmica térmica (forno de fusão), escuros e alinhados. */
const ceramica: Pintor = (x, y, s) => {
  if (x % 4 === 3 || y % 4 === 3) return um('#45474d', x, y, s);
  const tom = 0.85 + hash2(x >> 2, y >> 2, s) * 0.3;
  const p = rampa(['#24252b', '#2b2c33', '#33343c'], hash2(x, y, s), x, y, s);
  return escurece(x % 4 === 0 && y % 4 === 0 ? clareia(p, 1.2) : p, tom);
};

function bocaForno(acesa: boolean): Pintor {
  return (x, y, s) => {
    if (x >= 3 && x <= 12 && y >= 6 && y <= 13) {
      if (x === 3 || x === 12 || y === 6 || y === 13) return um('#b8bcc4', x, y, s);
      if (!acesa) {
        if (x - y === -3 || x - y === -2) return um('#3a4458', x, y, s);
        return rampa(['#0e1016', '#151821'], hash2(x, y, s), x, y, s);
      }
      const f = (13 - y) / 7 + hash2(x, y, s) * 0.25 + (x === 7 || x === 8 ? 0.2 : 0);
      return rampa(['#d0401a', '#ff7a2a', '#ffb84a', '#fff0b0'], 1 - f * 0.8, x, y, s);
    }
    // painel com luzes de estado
    if (y === 3 && x >= 4 && x <= 11) return um('#3a3c44', x, y, s);
    if (y === 3 && (x === 5 || x === 7)) return um(acesa ? '#ff9a3a' : '#5a3a2a', x, y, s);
    if (y === 3 && x === 10) return um(acesa ? '#6aff9a' : '#2a4a34', x, y, s);
    return ceramica(x, y, s);
  };
}

/** Caixa de suprimentos: corpo branco, cantoneiras laranja. */
function caixa(miolo: Pintor): Pintor {
  return (x, y, s) => {
    if (x <= 1 || y <= 1 || x >= T - 2 || y >= T - 2) {
      const p = rampa(['#e0702a', '#e87a30', '#f08638'], hash2(x, y, s), x, y, s);
      return borda1(x, y) ? escurece(p, 0.7) : p;
    }
    return miolo(x, y, s);
  };
}
const corpoCaixa: Pintor = (x, y, s) =>
  rampa(
    ['#d8dadd', '#e0e2e5', '#e8e9eb'],
    ruidoT(x, y, 2, 8, s) * 0.5 + hash2(x, y, s) * 0.5,
    x,
    y,
    s,
  );

/** Tecido de traje: trama ripstop (fios de reforço a cada 4 pixels). */
function tecido(cor: string): Pintor {
  const c = hex(cor);
  return (x, y, s) => {
    const reforco = x % 4 === 0 || y % 4 === 0;
    const cruz = x % 4 === 0 && y % 4 === 0;
    const f = (cruz ? 1.14 : reforco ? 1.07 : 0.93) * (0.96 + hash2(x, y, s) * 0.06);
    return [c[0] * f, c[1] * f, c[2] * f, 255];
  };
}

/** Regolito impresso: blocos arredondados com as camadas finas da impressora. */
const regolitoImpresso: Pintor = (x, y, s) => {
  const fila = y >> 2;
  const desloc = fila % 2 ? 4 : 0;
  const col = Math.floor((x + desloc) / 8);
  const ex = (x + desloc) % 8;
  const ey = y % 4;
  if (ey === 3 || ex === 0) return um('#4c4843', x, y, s);
  // cantinhos arredondados
  if ((ex === 1 || ex === 7) && (ey === 0 || ey === 2)) return um('#6a655e', x, y, s);
  const tom = 0.9 + hash2(mod(col, 2), fila, s) * 0.2;
  const p = rampa(['#9b948a', '#a49d93', '#ada69c'], hash2(x, y, s) * 0.5 + 0.25, x, y, s);
  return escurece(ey === 1 ? escurece(p, 0.93) : p, tom);
};

/** Blocos de rocha lunar: lajes grandes com chanfro (luz de cima à esquerda). */
const blocosRocha: Pintor = (x, y, s) => {
  const fila = y >> 3;
  const desloc = fila % 2 ? 8 : 0;
  const ex = (x + desloc) % 16;
  const ey = y % 8;
  const p = rampa(
    ['#5c5f68', '#646770', '#6c6f78'],
    hash2(x, y, s) * 0.6 + fbmT(x, y, 4, s) * 0.4,
    x,
    y,
    s,
  );
  if (ey === 7 || ex === 15) return um('#33353b', x, y, s);
  if (ey === 0 || ex === 0) return clareia(p, 1.22);
  if (ey === 6 || ex === 14) return escurece(p, 0.78);
  return p;
};

const rochaPolida: Pintor = (x, y, s) => {
  if (borda1(x, y)) return um(x === 0 || y === 0 ? '#c4c6cb' : '#7e8187', x, y, s);
  const brilho = Math.abs(((x + y) % 14) - 4) < 1.2;
  const p = rampa(
    ['#a3a5ab', '#aaacb1', '#b1b3b8'],
    hash2(x, y, s) * 0.4 + fbmT(x, y, 2, s) * 0.6,
    x,
    y,
    s,
  );
  return brilho ? clareia(p, 1.1) : p;
};

// --- plantas e objetos em cruz -----------------------------------------------

/** Fios de cristal: agulhas finas e translúcidas com a ponta acesa. */
const fiosCristal: Pintor = (x, y, s) => {
  if (hash2(x, 3, s) < 0.5) return VAZIO;
  const altura = 4 + Math.floor(hash2(x, 4, s) * 10);
  const h = T - 1 - y;
  if (h >= altura) return VAZIO;
  if (h === altura - 1) return um('#f2fdff', x, y, s);
  const t = h / altura;
  return rampa(['#4f86a8', '#66a2c4', '#86c2de', '#b4e2f4'], t, x, y, s);
};

/** Flor-estrela: estrelinha de quatro pontas num caule fino. */
const florEstrela: Pintor = (x, y, s) => {
  const dx = Math.abs(x - 7.5);
  const dy = Math.abs(y - 5.5);
  if (dx + dy < 1.1) return um('#fffbe6', x, y, s);
  const braco = (dx < 0.6 && dy < 5) || (dy < 0.6 && dx < 5);
  if (dx + dy < 2.6 || braco)
    return rampa(['#ff9e2a', '#ffc23a', '#ffe070'], 1 - (dx + dy) / 5, x, y, s);
  if ((x === 7 || x === 8) && y >= 11)
    return rampa(['#6f8f96', '#7f9fa6'], hash2(x, y, s), x, y, s);
  if (y === 13 && (x === 5 || x === 10)) return um('#9fd8e8', x, y, s);
  if (y === 12 && (x === 6 || x === 9)) return um('#9fd8e8', x, y, s);
  return VAZIO;
};

/** Cogumelo de estufa: chapéu lilás com bolinhas e pé claro. */
const cogumeloEstufa: Pintor = (x, y, s) => {
  const dx = x - 7.5;
  const dy = y - 8;
  if (y <= 8 && (dx * dx) / 40 + (dy * dy) / 26 < 1) {
    if (y === 8) return um('#8a3aa0', x, y, s);
    const bolinha = (mod(x + (y >> 1) * 3, 5) === 0 && y % 3 === 1) || (x === 7 && y === 4);
    if (bolinha) return um('#fff2ff', x, y, s);
    return rampa(
      ['#b24ccc', '#c864dc', '#dc86ec', '#eaa8f4'],
      1 - y / 9 + hash2(x, y, s) * 0.2,
      x,
      y,
      s,
    );
  }
  if (x >= 6 && x <= 9 && y > 8)
    return rampa(['#cfc8da', '#dcd6e6', '#e8e4f0'], (9 - x) / 4, x, y, s);
  return VAZIO;
};

/** Sucata de antena: mastro torto com pratinho e luz vermelha na ponta. */
const sucataAntena: Pintor = (x, y, s) => {
  // ponta
  if (Math.hypot(x - 9.5, y - 2.5) < 1.6) return um(y < 2 ? '#ffb0a0' : '#ff3a3a', x, y, s);
  // mastro levemente inclinado
  const mx = 9.5 - (y - 4) * 0.12;
  if (y >= 4 && y <= 13 && Math.abs(x + 0.5 - mx) < 0.9)
    return um(x + 0.5 < mx ? '#d4d8de' : '#8e939b', x, y, s);
  // pratinho (parábola aberta para a esquerda)
  const py = y - 7.5;
  const curva = 6.5 - py * py * 0.35;
  if (Math.abs(py) <= 3 && Math.abs(x + 0.5 - curva) < 0.8) return um('#c2c7cf', x, y, s);
  if (y === 7 && x >= 6 && x <= 8) return um('#7a7f88', x, y, s);
  // tripé
  if (y >= 12 && y <= 15) {
    const d = y - 11;
    if (Math.abs(x + 0.5 - (9 - d * 1.2)) < 0.7 || Math.abs(x + 0.5 - (9.5 + d * 1.2)) < 0.7)
      return um('#6a6f78', x, y, s);
  }
  return VAZIO;
};

/** Caniço de cristal: três lascas finas e verdes, acesas na ponta. */
const canicoCristal: Pintor = (x, y, s) => {
  for (const [c, topo] of [
    [3.5, 3],
    [8, 0],
    [12.5, 5],
  ] as const) {
    const alt = T - topo;
    const t = (y - topo) / alt;
    if (y < topo) continue;
    const meia = 0.4 + t * 1.1;
    const pos = c + (y - 15) * 0.08 * (c < 8 ? -1 : c > 8 ? 1 : 0);
    if (Math.abs(x + 0.5 - pos) < meia) {
      if (y < topo + 2) return um('#e8fff4', x, y, s);
      return rampa(
        ['#1f9a74', '#2cb888', '#46d6a2', '#7af0c4'],
        1 - t + hash2(x, y, s) * 0.2,
        x,
        y,
        s,
      );
    }
  }
  return VAZIO;
};

/** Arbusto de bagas num vasinho de estufa. */
const arbustoBagas: Pintor = (x, y, s) => {
  // vasinho de metal
  if (y >= 12 && x >= 4 && x <= 11) {
    if (y === 12) return um('#c8ccd4', x, y, s);
    if (x === 4 || x === 11) return um('#6a6f78', x, y, s);
    return rampa(['#8a9099', '#9aa0a8'], hash2(x, y, s), x, y, s);
  }
  if (y >= 12) return VAZIO;
  const d = Math.hypot((x - 7.5) * 0.9, y - 6.5);
  if (d > 6.2 || y < 1) return VAZIO;
  if (hash2(x >> 1, y >> 1, s + 4) > 0.8 && (x + y) % 2 === 0)
    return rampa(['#6a5cff', '#9a88ff', '#c4b8ff'], hash2(x, y, s), x, y, s);
  if (hash2(x, y, s + 21) < 0.22) return VAZIO;
  return rampa(
    ['#2f8a5e', '#3c9e6c', '#4cb47c', '#62c88e'],
    1 - d / 6 + hash2(x, y, s) * 0.3,
    x,
    y,
    s,
  );
};

// --- o atlas do tema -----------------------------------------------------------

const PÓ_GELO = ['#d6e2ee', '#dfe9f3', '#e8f0f8', '#f2f7fc'];
const poGelo: Pintor = (x, y, s) => {
  // centelhas em cruz (cristaizinhos de gelo)
  const c = maisProximo(x, y, s + 70, 3);
  if (c.d < 0.6) return um('#ffffff', x, y, s);
  if (
    (Math.abs(c.dx) < 0.6 && Math.abs(c.dy) < 1.6) ||
    (Math.abs(c.dy) < 0.6 && Math.abs(c.dx) < 1.6)
  )
    return um('#f8fcff', x, y, s);
  const p = rampa(PÓ_GELO, fbmT(x, y, 4, s) * 0.6 + hash2(x, y, s) * 0.4, x, y, s);
  return hash2(x, y, s + 5) > 0.93 ? um('#b8cadc', x, y, s) : p;
};

const REG_CINTILANTE = ['#47435a', '#4f4b62', '#57536b', '#5f5b74'];
const regolitoCintilante = regolito(REG_CINTILANTE, 2, '#8a86a0', '#2f2c3c');
const lodo: Pintor = (x, y, s) => {
  const p = rampa(
    ['#2c313d', '#333845', '#3a3f4d', '#424856'],
    hash2(x, y, s) * 0.5 + fbmT(x, y, 4, s) * 0.5,
    x,
    y,
    s,
  );
  // reflexos molhados em risquinhos
  const r = ruidoT(x, y, 4, 2, s + 9);
  if (r > 0.78 && hash2(x, y, s + 1) > 0.3) return um('#7f98b4', x, y, s);
  return p;
};

export const PINTORES_LUNARES: Record<string, Pintor> = {
  // superfície
  grama_topo: regolitoFino,
  grama_lado: ladoComTopo(regolito(REGOLITO, 0), regolitoGrosso, '#4a4741', 2),
  terra: regolitoGrosso,
  pedra: rochaLunar,
  areia: (x, y, s) => {
    const g = hash2(x, y, s + 2);
    if (g > 0.94) return um('#fbfaf6', x, y, s);
    if (g < 0.035) return um('#8f8b82', x, y, s);
    return rampa(
      ['#d2d0c8', '#dad8d0', '#e1dfd8', '#e8e6e0'],
      fbmT(x, y, 4, s) * 0.5 + hash2(x, y, s) * 0.5,
      x,
      y,
      s,
    );
  },
  areia_deserto: (x, y, s) => {
    const b = hash2(x, y, s + 9);
    if (b > 0.972) return um(hash2(x, y, s + 10) > 0.4 ? '#e8903c' : '#86c860', x, y, s);
    const onda = Math.sin((x * 0.6 + y + fbmT(x, y, 2, s) * 3) * 1.1) * 0.5 + 0.5;
    return rampa(
      ['#393a40', '#414248', '#4a4b51', '#55565c'],
      onda * 0.55 + hash2(x, y, s) * 0.45,
      x,
      y,
      s,
    );
  },
  arenito_lado: basaltoLado,
  arenito_topo: basaltoTopo,
  pedregulho: brecha,
  cascalho: cascalhoImpacto,
  rocha_matriz: manto,

  // minérios: forma, contorno e brilho próprios
  min_carvao: veio({
    n: 5,
    raio: [1.5, 2.4],
    cores: ['#101014', '#18181e', '#24242c'],
    brilho: '#e8eef8',
    contorno: '#3a3c42',
  }),
  min_cobre: veio({
    n: 4,
    raio: [1.8, 2.6],
    cores: ['#4458b8', '#5f78d8', '#86a0f0'],
    brilho: '#e6eeff',
    contorno: '#262b4a',
    agulha: true,
  }),
  min_ferro: veio({
    n: 4,
    raio: [1.6, 2.4],
    cores: ['#9a4524', '#bc5f36', '#d88256'],
    brilho: '#ffd8b4',
    contorno: '#3e2418',
  }),
  min_ouro: veio({
    n: 7,
    raio: [1.1, 1.7],
    cores: ['#c88e18', '#e8b82c', '#ffd85a'],
    brilho: '#fff8c8',
    contorno: '#4a3410',
  }),
  min_luzita: veio({
    n: 5,
    raio: [1.5, 2.3],
    cores: ['#16a07a', '#2acc98', '#62fcca'],
    brilho: '#eafff6',
    contorno: '#0e3a30',
  }),

  // gelo
  neve: poGelo,
  neve_lado: ladoComTopo(poGelo, regolitoGrosso, '#9fb2c6', 3),
  gelo: (x, y, s) => {
    const fratura = Math.abs(((x - 2 * y) % 13) + (x - 2 * y < 0 ? 13 : 0) - 6) < 0.6;
    if (fratura && hash2(x, y, s) > 0.3) return um('#f0fbff', x, y, s);
    const c = maisProximo(x, y, s + 90, 4);
    if (c.d < 0.75) return um('#e4f6ff', x, y, s);
    if (c.d < 1.3 && c.dx + c.dy > 0) return um('#5a9ccc', x, y, s);
    return rampa(
      ['#5fa6d6', '#6eb4e0', '#7ec2ea', '#90d0f2'],
      fbmT(x, y, 2, s) * 0.7 + hash2(x, y, s) * 0.3,
      x,
      y,
      s,
    );
  },

  // formações de cristal (as "árvores")
  tronco: colunaCristal(['#6a6280', '#776e8e', '#857c9c', '#938aaa'], '#c6bee0', '#b8a8ff'),
  tronco_topo: secaoCristal(
    ['#4a445c', '#544e66'],
    [
      ['#8a80b0', '#9288b8'],
      ['#a89fd0', '#b0a8d8'],
    ],
    '#e2dcff',
  ),
  folhas: pontasCristal(['#6e5cb4', '#7e6cc6', '#9080d6', '#a596e4'], 0.08, '#ffffff'),
  folhas_outono: pontasCristal(['#b0601a', '#cc7a22', '#e0962e', '#f0b648'], 0.08, '#fff4c8'),
  betula: colunaCristal(['#d2d0dc', '#dcdae6', '#e6e4ee', '#efedf5'], '#ffffff', '#ffc8e8'),
  betula_topo: secaoCristal(
    ['#a8a6b4', '#b2b0be'],
    [
      ['#dedce8', '#e4e2ee'],
      ['#c6e8f0', '#cceef4'],
    ],
    '#ffffff',
  ),
  folhas_betula: pontasCristal(['#78c8c0', '#8cd8d0', '#a2e6de', '#bcf2ec'], 0.1, '#ffffff'),
  pinho: colunaCristal(['#6f98bc', '#7aa4c8', '#86b0d2', '#94bcdc'], '#e0f2ff', '#ffffff'),
  pinho_topo: secaoCristal(
    ['#4f7a9e', '#5884a8'],
    [
      ['#a8d0ee', '#b0d6f2'],
      ['#c8e4f8', '#d0eafa'],
    ],
    '#f4fbff',
  ),
  folhas_pinho: pontasCristal(['#4f8ec4', '#62a2d2', '#78b6de', '#96cceb'], 0.12, '#ffffff'),
  tronco_lanterna: colunaCristal(
    ['#3a2a5c', '#44326a', '#4f3a78', '#5a4386'],
    '#8a6ad0',
    '#3cd892',
  ),
  tronco_lanterna_topo: secaoCristal(
    ['#2a1f42', '#32264c'],
    [
      ['#5a4396', '#624aa0'],
      ['#2fa878', '#36b482'],
    ],
    '#b8ffe0',
  ),
  folhas_lanterna: pontasCristal(['#1c8a66', '#24a478', '#30c08e', '#4adcaa'], 0.14, '#f0ff9a'),

  // cristal lunar (luz) e bloco de hélio-3
  cristal: (x, y, s) => {
    const faceta = ((x + 2 * y) % 8) / 8;
    const raio = Math.abs(x - 7.5) + Math.abs(y - 7.5);
    if (raio < 1.5) return um('#ffffff', x, y, s);
    if ((x === 7 || x === 8 || y === 7 || y === 8) && raio < 5) return um('#e8fbff', x, y, s);
    const p = rampa(
      ['#4ab8de', '#66cae8', '#88daf2', '#b0eaf9'],
      faceta * 0.6 + fbmT(x, y, 2, s) * 0.4,
      x,
      y,
      s,
    );
    return borda1(x, y) ? um('#2a7898', x, y, s) : p;
  },
  bloco_luzita: (x, y, s) => {
    if (borda1(x, y) || x === 7 || x === 8 || y === 7 || y === 8) return um('#1c2a2a', x, y, s);
    const cx = x < 8 ? 3.5 : 11.5;
    const cy = y < 8 ? 3.5 : 11.5;
    const d = Math.max(Math.abs(x - cx), Math.abs(y - cy));
    if (d > 2.6) return um('#14805e', x, y, s);
    return rampa(
      ['#22b884', '#3ad8a0', '#78f6c8', '#d8fff0'],
      1 - d / 3 + hash2(x, y, s) * 0.15,
      x,
      y,
      s,
    );
  },

  // plantas e objetos em cruz
  grama_alta: fiosCristal,
  flor: florEstrela,
  cogumelo: cogumeloEstufa,
  arbusto_seco: sucataAntena,
  junco: canicoCristal,
  frutinhas: arbustoBagas,

  // espinheiro de cristal (o cacto)
  cacto_lado: (x, y, s) => {
    if (x === 0 || x === T - 1) return VAZIO;
    if ((x === 1 || x === T - 2) && hash2(x, y, s) > 0.78) return um('#dcf6ff', x, y, s);
    const aresta = x % 4 === 2;
    return rampa(
      aresta ? ['#4a8494', '#5592a2'] : ['#203a44', '#26444f', '#2d4e5a'],
      hash2(x, y, s) * 0.6 + ruidoT(x, y, 1, 4, s) * 0.4,
      x,
      y,
      s,
    );
  },
  cacto_topo: (x, y, s) => {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    if (d > 6.6) return VAZIO;
    const raio = Math.abs(x - 7.5) + Math.abs(y - 7.5);
    if (raio < 2) return um('#bff0ff', x, y, s);
    if (x === y || x === 15 - y) return um('#5592a2', x, y, s);
    return rampa(['#203a44', '#26444f', '#2d4e5a'], hash2(x, y, s), x, y, s);
  },

  // vale cintilante
  pantano_topo: (x, y, s) => {
    const g = hash2(x, y, s + 8);
    if (g > 0.965) return um(hash2(x, y, s + 12) > 0.5 ? '#6ff2ff' : '#b8ff7a', x, y, s);
    return regolitoCintilante(x, y, s);
  },
  pantano_lado: ladoComTopo(regolito(REG_CINTILANTE, 0, '#8a86a0', '#2f2c3c'), lodo, '#24222e'),
  lama: lodo,

  // materiais de construção
  tabuas: placaLiga,
  tabuas_betula: placaBranca,
  tabuas_pinho: chapaAzul,
  tijolos: regolitoImpresso,
  tijolos_pedra: blocosRocha,
  pedra_lisa: rochaPolida,
  la_branca: tecido('#e8eaee'),
  la_vermelha: tecido('#cc343c'),
  la_laranja: tecido('#f27222'),
  la_amarela: tecido('#f4cc2a'),
  la_verde: tecido('#3caa5a'),
  la_azul: tecido('#2c6cd8'),
  la_roxa: tecido('#8a48d2'),
  la_preta: tecido('#2a2c34'),

  // vidro de cúpula: aro de metal rebitado e reflexo em faixa
  vidro: (x, y, s) => {
    if (borda1(x, y)) {
      const rebite = (x === 0 || x === T - 1) && (y === 3 || y === 12);
      const rebite2 = (y === 0 || y === T - 1) && (x === 3 || x === 12);
      return um(rebite || rebite2 ? '#eef2f6' : '#8a929c', x, y, s);
    }
    if ((x === y + 2 || x === y + 3) && x > 3 && x < 11) return [236, 248, 255, 255];
    if (x === y + 6 && x > 8 && x < 13) return [214, 236, 250, 255];
    return VAZIO;
  },

  // bastão de luz (tocha) e holofote (lanterna)
  tocha: (x, y, s) => {
    if (x >= 7 && x <= 8 && y >= 10) {
      if (y === 10 || y === 13) return um('#9aa0a8', x, y, s);
      return um(x === 7 ? '#4a4e56' : '#3a3d44', x, y, s);
    }
    if (x >= 6 && x <= 9 && y >= 2 && y <= 9) {
      if ((x === 7 || x === 8) && y >= 3 && y <= 8) return um('#e8fff0', x, y, s);
      return rampa(['#2ee08a', '#5af0a6', '#8af8c4'], hash2(x, y, s) * 0.5 + (9 - y) / 14, x, y, s);
    }
    if (x >= 7 && x <= 8 && y === 1) return um('#9aa0a8', x, y, s);
    return VAZIO;
  },
  lanterna: (x, y, s) => {
    if (x <= 1 || x >= T - 2 || y <= 1 || y >= T - 2) {
      const parafuso = (x === 1 || x === T - 2) && (y === 1 || y === T - 2);
      return um(parafuso ? '#c8ccd4' : x === 0 || y === 0 ? '#5a5e66' : '#44474e', x, y, s);
    }
    const d = Math.hypot(x - 7.5, y - 7.5);
    if (d > 6) return um('#2a2c32', x, y, s);
    if (Math.abs(d - 4) < 0.5) return um('#a8c8f0', x, y, s);
    return rampa(
      ['#b4d4ff', '#d4e6ff', '#f4f9ff', '#ffffff'],
      1 - d / 6 + hash2(x, y, s) * 0.1,
      x,
      y,
      s,
    );
  },

  // bancada de montagem
  mesa_topo: moldura((x, y, s) => {
    // prancheta com a planta da base (grade azul e traços brancos)
    if (x === 7 || y === 7) return um('#e8f2ff', x, y, s);
    if (x % 3 === 0 || y % 3 === 0) return um('#3a68b0', x, y, s);
    if (y === 4 && x >= 3 && x <= 11) return um('#d8e8ff', x, y, s);
    return rampa(['#2a4f94', '#2f58a0'], hash2(x, y, s), x, y, s);
  }, METAL_MOLDURA),
  mesa_lado: (x, y, s) =>
    y < 3 ? rampa(METAL_MOLDURA, hash2(x, y, s), x, y, s) : placaLiga(x, y, s),
  mesa_frente: (x, y, s) => {
    if (y < 3) return rampa(METAL_MOLDURA, hash2(x, y, s), x, y, s);
    // chave inglesa
    if ((x === 4 && y >= 6 && y <= 13) || (y === 5 && x >= 3 && x <= 5 && x !== 4))
      return um('#d4d8e0', x, y, s);
    // chave de fenda com cabo laranja
    if (x === 8 && y >= 5 && y <= 8) return um('#c0c4cc', x, y, s);
    if (x >= 7 && x <= 9 && y >= 9 && y <= 12) return um('#f07a2a', x, y, s);
    // telinha verde
    if (x >= 11 && x <= 13 && y >= 5 && y <= 8)
      return um(y === 6 || (y === 7 && x === 12) ? '#9affb8' : '#1a3a2a', x, y, s);
    return escurece(placaLiga(x, y, s), 0.85);
  },

  // forno de fusão
  fornalha_lado: ceramica,
  fornalha_topo: (x, y, s) => {
    if (x >= 2 && x <= 13 && y >= 2 && y <= 13)
      return um(y % 2 === 0 ? '#16171c' : '#7a7e86', x, y, s);
    return ceramica(x, y, s);
  },
  fornalha_frente: bocaForno(false),
  fornalha_acesa: bocaForno(true),

  // caixa de suprimentos
  bau_lado: caixa((x, y, s) => (y === 7 ? um('#8a8e96', x, y, s) : corpoCaixa(x, y, s))),
  bau_topo: caixa((x, y, s) => {
    if (Math.abs(x - y) < 0.6 || Math.abs(x + y - 15) < 0.6) return um('#f08638', x, y, s);
    return corpoCaixa(x, y, s);
  }),
  bau_frente: caixa((x, y, s) => {
    if (x >= 6 && x <= 9 && y >= 5 && y <= 9) {
      if (x >= 7 && x <= 8 && y === 7) return um('#6aff9a', x, y, s);
      return um('#5a5e66', x, y, s);
    }
    if (y === 7) return um('#8a8e96', x, y, s);
    // faixa de identificação azul
    if (y >= 11 && y <= 12 && x >= 3 && x <= 12) return um('#2c6cd8', x, y, s);
    return corpoCaixa(x, y, s);
  }),

  // casulo de dormir
  cama_topo: (x, y, s) => {
    if (x === 0 || x === T - 1) return um('#80848d', x, y, s);
    if (y < 5) return rampa(['#eef0f4', '#f6f7fa'], hash2(x, y, s), x, y, s);
    const acolchoado = (x + y) % 4 === 0 || (x - y + 16) % 4 === 0;
    return rampa(acolchoado ? ['#2a58b0'] : ['#3468c8', '#3c72d2'], hash2(x, y, s), x, y, s);
  },
  cama_lado: (x, y, s) => {
    if (y < 6) return rampa(['#3468c8', '#3c72d2'], hash2(x, y, s), x, y, s);
    if (y < 8) return um('#eef0f4', x, y, s);
    if (y === 8) return um('#f07a2a', x, y, s);
    return escurece(placaLiga(x, y, s), 0.92);
  },

  // escotilha (porta) com janela redonda
  ...metadesDaPorta((x, yy, s) => {
    const d = Math.hypot(x - 7.5, yy - 7.5);
    if (d < 2.6) return VAZIO;
    if (d < 3.6) return um('#c8ccd4', x, yy, s);
    if (x === 12 && (yy === 18 || yy === 19)) return um('#f4cc2a', x, yy, s);
    if (yy >= 27 && yy <= 28) return um((x + yy) % 4 < 2 ? '#f4cc2a' : '#26282e', x, yy, s);
    const p = placaBranca(yy & (T - 1), x, s);
    return bordaDaPorta(x, yy) ? escurece(p, 0.7) : p;
  }),

  // abóbora lunar (verde-água) e abóbora-farol
  abobora_lado: (x, y, s) => {
    const gomo = x % 4 === 0;
    return rampa(
      gomo ? ['#1f706c', '#257a75'] : ['#2f938c', '#38a59d', '#44b6ad'],
      hash2(x, y, s) * 0.6 + ruidoT(x, y, 4, 1, s) * 0.4,
      x,
      y,
      s,
    );
  },
  abobora_topo: (x, y, s) => {
    if (Math.abs(x - 7.5) < 1.5 && Math.abs(y - 7.5) < 1.5)
      return rampa(['#8a8e96', '#a0a4ac'], hash2(x, y, s), x, y, s);
    return rampa(
      ['#2f938c', '#38a59d', '#44b6ad'],
      hash2(x, y, s) * 0.5 + (Math.hypot(x - 7.5, y - 7.5) / 12) * 0.5,
      x,
      y,
      s,
    );
  },
  abobora_rosto: (x, y, s) => {
    // rostinho sorridente aceso
    const olho = y >= 4 && y <= 6 && ((x >= 4 && x <= 5) || (x >= 10 && x <= 11));
    const boca =
      (y === 10 && x >= 5 && x <= 10) ||
      (y === 9 && (x === 4 || x === 11)) ||
      (y === 11 && x >= 6 && x <= 9);
    if (olho || boca) return rampa(['#7affd8', '#c8fff0'], hash2(x, y, s), x, y, s);
    return PINTORES_LUNARES.abobora_lado(x, y, s);
  },

  // spec 013: canteiro hidropônico (regolito em leiras com canais de água), trigo e milho
  // de estufa, aboboreira lunar e fardo de palha preso com cintas de metal
  terra_arada: (x, y, s) => {
    if (y % 4 === 3) return rampa(['#3a78c8', '#4a8ad8', '#5c9ce6'], hash2(x, y, s), x, y, s);
    if (x === 0 || x === T - 1) return rampa(['#8e98a6', '#a2acb8'], hash2(x, y, s), x, y, s);
    return terraAradaDe(regolitoGrosso, 0.6, 0.2)(x, y, s);
  },
  trigo: trigoDe(['#4a9a4a', '#58ac56', '#68be64'], ['#d8c47a', '#e6d48a', '#f4e4a4'], '#ffffff'),
  milho: milhoDe(
    ['#3c9a48', '#4aac54', '#5abe62', '#6ccc72'],
    ['#e8c040', '#f4d458', '#fde878'],
    '#f4f0d0',
  ),
  aboboreira: aboboreiraDe(
    ['#6aa83a', '#7aba44', '#8ac850', '#9cd660'],
    ['#1f706c', '#2f938c', '#38a59d', '#44b6ad'],
    '#8a8e96',
  ),
  feno_lado: fenoLadoDe(['#c4b276', '#d0c084', '#dccc94', '#e6d8a4'], '#667284'),
  feno_topo: fenoTopoDe(['#c8b67a', '#d4c488', '#e0d098', '#e8dca8'], '#667284'),
};

/** Tiles que brilham: além dos de luz, as centelhas do vale e as bagas de energia. */
export const EMISSIVOS_LUNARES: readonly string[] = [
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
  'pantano_topo',
  'junco',
  'frutinhas',
];
