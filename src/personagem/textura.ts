import { PALETAS, type Aparencia } from './aparencia';
import type { NomeParte, Parte } from './modelo';
import { hash2 } from '../world/noise';

/** Densidade de pixels: 40 pixels por bloco (cabeça de 16x16, pixels quadrados). */
export const PX_POR_BLOCO = 40;

/** Cor saturada da lanterna, com luminância abaixo do teto emissivo (0.45). */
export const COR_LANTERNA = '#a85a00';
export const COR_CAPUZ_SOMBRA = '#2a2433';

/** Ordem das faces de uma caixa no Babylon: +z, -z, +x, -x, +y, -y. */
export type FaceCaixa = 'frente' | 'tras' | 'direita' | 'esquerda' | 'topo' | 'base';
export const ORDEM_FACES: readonly FaceCaixa[] = [
  'frente',
  'tras',
  'direita',
  'esquerda',
  'topo',
  'base',
];

export interface Regiao {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TexturaParte {
  largura: number;
  altura: number;
  pixels: Uint8ClampedArray;
  /** Retângulo de cada face, na ordem de ORDEM_FACES (y = 0 no topo da imagem). */
  faces: Regiao[];
}

type Rgb = [number, number, number];

function hex(cor: string): Rgb {
  const n = parseInt(cor.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function tom(c: Rgb, f: number): Rgb {
  return [c[0] * f, c[1] * f, c[2] * f];
}

function mistura(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

interface Cores {
  pele: Rgb;
  cabelo: Rgb;
  roupa: Rgb;
  calca: Rgb;
  bota: Rgb;
  cinto: Rgb;
  olho: Rgb;
}

function coresDe(a: Aparencia): Cores {
  const cabelo = hex(PALETAS.cabelo[a.cabeloCor] ?? PALETAS.cabelo[0]);
  return {
    pele: hex(PALETAS.pele[a.pele] ?? PALETAS.pele[0]),
    cabelo,
    roupa: hex(PALETAS.roupa[a.roupaCor] ?? PALETAS.roupa[0]),
    calca: hex(PALETAS.calca[a.calcaCor] ?? PALETAS.calca[0]),
    bota: [62, 42, 32],
    cinto: [88, 58, 36],
    olho: [44, 70, 110],
  };
}

/** Ruído de tecido: leve variação por pixel, determinística. */
function grao(c: Rgb, x: number, y: number, s: number, forca = 0.07): Rgb {
  return tom(c, 1 + (hash2(x, y, s) - 0.5) * 2 * forca);
}

type Pintor = (face: FaceCaixa, x: number, y: number, w: number, h: number) => Rgb;

function pintorCabeca(a: Aparencia, c: Cores): Pintor {
  const longo = a.cabeloEstilo === 2;
  return (face, x, y, w, h) => {
    const pele = grao(c.pele, x, y, 11, 0.03);
    const cab = grao(c.cabelo, x, y, 13, 0.1);
    if (face === 'topo') return cab;
    if (face === 'base') return tom(c.pele, 0.8);
    if (face === 'tras') return y < (longo ? h : h * 0.7) ? cab : pele;
    if (face === 'direita' || face === 'esquerda') {
      const franja = y < 4 + (x % 3 === 0 ? 1 : 0);
      const costas = face === 'direita' ? x < w * 0.45 : x >= w * 0.55;
      if (franja || (costas && y < (longo ? h : h * 0.7))) return cab;
      const orelha = y >= 7 && y <= 9 && Math.abs(x - w / 2) < 1.2;
      return orelha ? tom(c.pele, 0.85) : pele;
    }
    // frente: rosto
    const franja = 3 + (a.cabeloEstilo === 1 ? (x < 6 ? 1 : 0) : x % 4 === 1 ? 1 : 0);
    if (y < franja) return cab;
    if ((x === 0 || x === w - 1) && y < 9) return cab;
    const ex = x === 3 || x === 4 ? 0 : x === w - 5 || x === w - 4 ? 1 : -1;
    if (y === 6 && ex >= 0) return tom(c.cabelo, 0.8);
    if ((y === 8 || y === 9) && ex >= 0) {
      const interno = ex === 0 ? x === 4 : x === w - 5;
      if (y === 8 && !interno) return [236, 236, 240];
      return interno ? c.olho : [236, 236, 240];
    }
    if (y === 10 && (x === 7 || x === 8)) return tom(c.pele, 0.85);
    if (y === 12 && x >= 6 && x <= 9) return mistura(c.pele, [120, 50, 50], 0.45);
    if (y === 11 && (x === 2 || x === w - 3)) return mistura(c.pele, [230, 120, 120], 0.25);
    return pele;
  };
}

function pintorCabelo(c: Cores): Pintor {
  return (face, x, y, _w, h) => {
    const base = grao(c.cabelo, x, y, 17, 0.12);
    if (face === 'topo') return x % 3 === 0 ? tom(base, 1.08) : base;
    return y === h - 1 ? tom(base, 0.82) : base;
  };
}

function pintorTronco(a: Aparencia, c: Cores): Pintor {
  return (face, x, y, w, h) => {
    let r = grao(c.roupa, x, y, 19);
    if (face === 'topo' || face === 'base') return tom(r, 0.9);
    const cintoY = h - 5;
    if (y >= cintoY && y < cintoY + 2) {
      if (face === 'frente' && Math.abs(x - (w - 1) / 2) < 1.5) return [196, 160, 80];
      return grao(c.cinto, x, y, 23);
    }
    if (y >= cintoY + 2) r = tom(r, 0.92);
    if (face === 'frente') {
      // gola em V
      const meio = (w - 1) / 2;
      if (y < 4 && Math.abs(x - meio) < 3 - y * 0.7) return c.pele;
      if (y < 5 && Math.abs(x - meio) < 4 - y * 0.6) return tom(c.roupa, 0.75);
      if (a.roupaEstilo === 1 && Math.abs(x - meio) < 2.5 && y < cintoY) {
        return tom(mistura(c.roupa, [235, 225, 205], 0.55), 1);
      }
      if (a.roupaEstilo === 2) {
        if (Math.abs(x - meio) < 0.6) return tom(c.roupa, 0.7);
        if (Math.abs(x - meio - 1.5) < 0.6 && y % 5 === 2 && y < cintoY) return [210, 190, 140];
      }
    }
    if (a.roupaEstilo === 2 && (x === 0 || x === w - 1)) return tom(r, 0.85);
    return r;
  };
}

function pintorBraco(c: Cores): Pintor {
  return (face, x, y, _w, h) => {
    if (face === 'topo') return grao(c.roupa, x, y, 29);
    if (face === 'base') return tom(c.pele, 0.9);
    const manga = Math.floor(h * 0.62);
    if (y < manga) return grao(c.roupa, x, y, 29);
    if (y === manga) return tom(c.roupa, 0.72);
    const pele = grao(c.pele, x, y, 31, 0.03);
    return y >= h - 2 ? tom(pele, 0.92) : pele;
  };
}

function pintorPerna(c: Cores): Pintor {
  return (face, x, y, _w, h) => {
    if (face === 'topo') return tom(c.calca, 0.9);
    if (face === 'base') return tom(c.bota, 0.8);
    const bota = h - 7;
    if (y >= bota) {
      if (y === bota) return tom(c.bota, 1.25);
      return y >= h - 2 ? tom(c.bota, 0.7) : grao(c.bota, x, y, 37);
    }
    const r = grao(c.calca, x, y, 41);
    return x === 0 ? tom(r, 0.85) : r;
  };
}

function pintorAcessorio(a: Aparencia): Pintor {
  if (a.acessorio === 'lanterna') {
    const ambar = hex(COR_LANTERNA);
    return (face, x, y, w, h) => {
      const moldura = x === 0 || x === w - 1 || y === 0 || y === h - 1 || y === 1;
      if (face === 'topo' || face === 'base' || moldura) return [52, 40, 36];
      return grao(ambar, x, y, 43, 0.08);
    };
  }
  const capuz = hex(COR_CAPUZ_SOMBRA);
  return (face, x, y, w, h) => {
    if (face === 'frente' && x > 2 && x < w - 3 && y > 3) return tom(capuz, 0.55);
    const borda = face !== 'topo' && y >= h - 2;
    return borda ? tom(capuz, 1.35) : grao(capuz, x, y, 47, 0.1);
  };
}

function pintorDe(nome: NomeParte, a: Aparencia, c: Cores): Pintor {
  switch (nome) {
    case 'cabeca':
      return pintorCabeca(a, c);
    case 'cabelo':
      return pintorCabelo(c);
    case 'tronco':
      return pintorTronco(a, c);
    case 'bracoEsquerdo':
    case 'bracoDireito':
      return pintorBraco(c);
    case 'pernaEsquerda':
    case 'pernaDireita':
      return pintorPerna(c);
    default:
      return pintorAcessorio(a);
  }
}

function px(v: number): number {
  return Math.max(2, Math.round(v * PX_POR_BLOCO));
}

/** Dimensões (w, h) de cada face, em pixels, na ordem de ORDEM_FACES. */
export function dimensoesFaces(tamanho: readonly [number, number, number]): [number, number][] {
  const [sx, sy, sz] = tamanho.map(px);
  return [
    [sx, sy],
    [sx, sy],
    [sz, sy],
    [sz, sy],
    [sx, sz],
    [sx, sz],
  ];
}

/** Textura de uma parte do corpo, com as 6 faces lado a lado. */
export function gerarTexturaParte(
  aparencia: Aparencia,
  parte: Pick<Parte, 'nome' | 'tamanho'>,
): TexturaParte {
  const dims = dimensoesFaces(parte.tamanho);
  const largura = dims.reduce((s, d) => s + d[0], 0);
  const altura = Math.max(...dims.map((d) => d[1]));
  const pixels = new Uint8ClampedArray(largura * altura * 4);
  const pinta = pintorDe(parte.nome, aparencia, coresDe(aparencia));
  const faces: Regiao[] = [];
  let ox = 0;
  dims.forEach(([w, h], i) => {
    const face = ORDEM_FACES[i];
    faces.push({ x: ox, y: 0, w, h });
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = pinta(face, x, y, w, h);
        const k = (y * largura + ox + x) * 4;
        pixels[k] = Math.max(0, Math.min(255, Math.round(c[0])));
        pixels[k + 1] = Math.max(0, Math.min(255, Math.round(c[1])));
        pixels[k + 2] = Math.max(0, Math.min(255, Math.round(c[2])));
        pixels[k + 3] = 255;
      }
    }
    ox += w;
  });
  return { largura, altura, pixels, faces };
}
