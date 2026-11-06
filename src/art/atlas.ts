import { Bloco } from '../world/blocks';
import { hash2 } from '../world/noise';

/** Tiles de 16x16 em pixel-art, com borda larga para mipmaps sem sangrar. */
export const TAM_TILE = 16;
export const PADDING = 8;
export const CELULA = TAM_TILE + PADDING * 2;
export const COLUNAS = 4;
export const LINHAS = 4;
export const LARGURA_ATLAS = COLUNAS * CELULA;
export const ALTURA_ATLAS = LINHAS * CELULA;

export interface RetanguloUV {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

export interface TileAtlas {
  bloco: number;
  nome: string;
  indice: number;
  uv: RetanguloUV;
}

export interface Atlas {
  largura: number;
  altura: number;
  pixels: Uint8ClampedArray;
  tiles: TileAtlas[];
  uvDoBloco(bloco: number): RetanguloUV | undefined;
  uvDaFace(bloco: number, face: FaceBloco): RetanguloUV | undefined;
}

/** Tile de topo (célula do atlas) para blocos com variação por face. */
export const TILE_TOPO: Record<number, number> = {
  [Bloco.TERRA_MUSGOSA]: 10,
  [Bloco.MADEIRA_RETORCIDA]: 11,
};

/** Terra sem grama: lados e base da terra musgosa enterrada. */
export const TILE_TERRA = 12;

type Px = [number, number, number, number];
/** Pixel RGBA de um tile, com (x, y) em [0, 16). */
type Pintor = (x: number, y: number, s: number) => Px;

const NOMES: [number, string][] = [
  [Bloco.TERRA_MUSGOSA, 'terra musgosa'],
  [Bloco.PEDRA_RACHADA, 'pedra rachada'],
  [Bloco.AREIA_BRUMA, 'areia-bruma'],
  [Bloco.MADEIRA_RETORCIDA, 'madeira retorcida'],
  [Bloco.FOLHAGEM, 'folhagem'],
  [Bloco.CRISTAL_LUZ, 'cristal-luz'],
  [Bloco.TABUAS, 'tábuas'],
  [Bloco.GRAMA_ALTA, 'grama alta'],
  [Bloco.FLOR, 'flor'],
  [Bloco.COGUMELO_BRILHANTE, 'cogumelo brilhante'],
];

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const T = TAM_TILE;
const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Ruído de valor que se repete a cada tile (sem costura entre blocos). */
function ruidoT(x: number, y: number, celX: number, celY: number, s: number): number {
  const fx = (x / T) * celX;
  const fy = (y / T) * celY;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const h = (i: number, j: number) => hash2(mod(i, celX), mod(j, celY), s);
  const a = h(x0, y0);
  const b = h(x0 + 1, y0);
  const c = h(x0, y0 + 1);
  const d = h(x0 + 1, y0 + 1);
  return a + (b - a) * sx + (c - a + (a - b - c + d) * sx) * sy;
}

function fbmT(x: number, y: number, cel: number, s: number, oitavas = 3): number {
  let soma = 0;
  let amp = 1;
  let total = 0;
  for (let i = 0; i < oitavas; i++) {
    const c = cel << i;
    soma += ruidoT(x, y, c, c, s + i * 131) * amp;
    total += amp;
    amp *= 0.5;
  }
  return soma / total;
}

/** Escolhe um tom da rampa e aplica um leve tremor (estilo pixel-art pintado). */
function rampa(cores: string[], t: number, x: number, y: number, s: number): Px {
  const i = Math.max(0, Math.min(cores.length - 1, Math.floor(t * cores.length)));
  const c = hex(cores[i]);
  const j = (hash2(x, y, s + 999) - 0.5) * 8;
  return [c[0] + j, c[1] + j, c[2] + j, 255];
}

function escurece(p: Px, f: number): Px {
  return [p[0] * f, p[1] * f, p[2] * f, p[3]];
}

const VAZIO: Px = [0, 0, 0, 0];

const GRAMA = ['#3d7a2c', '#468a32', '#509838', '#5ba63f', '#6ab64a'];
const TERRA = ['#5b3d2a', '#684730', '#755136', '#835c3e'];

function pintorGramaTopo(): Pintor {
  return (x, y, s) => {
    const t = fbmT(x, y, 4, s) * 0.55 + hash2(x, y, s) * 0.45;
    const p = rampa(GRAMA, t, x, y, s);
    if (hash2(x, y, s + 5) > 0.94) return rampa(['#7cc456'], 0, x, y, s);
    return p;
  };
}

function pintorTerra(): Pintor {
  return (x, y, s) => {
    const r = hash2(x, y, s + 3);
    if (r > 0.94) return rampa(['#9a7454'], 0, x, y, s);
    if (r < 0.05) return rampa(['#47301f'], 0, x, y, s);
    return rampa(TERRA, fbmT(x, y, 4, s) * 0.45 + hash2(x, y, s) * 0.55, x, y, s);
  };
}

function pintorGramaLado(): Pintor {
  const terra = pintorTerra();
  return (x, y, s) => {
    let borda = 2 + Math.floor(hash2(x, 0, s + 17) * 3);
    if (hash2(x, 1, s + 17) > 0.75) borda += 2;
    if (y < borda) {
      return rampa(GRAMA, 0.2 + hash2(x, y, s) * 0.8, x, y, s);
    }
    if (y === borda) return rampa(['#2f5e22'], 0, x, y, s);
    return terra(x, y, s);
  };
}

function pintorPorBloco(bloco: number): Pintor {
  switch (bloco) {
    case Bloco.TERRA_MUSGOSA:
      return pintorGramaLado();
    case Bloco.PEDRA_RACHADA:
      return (x, y, s) => {
        const mancha = fbmT(x, y, 4, s + 8);
        const p = rampa(
          ['#626268', '#6e6e74', '#7a7a80', '#87878d', '#95959b'],
          fbmT(x, y, 4, s) * 0.55 + hash2(x, y, s) * 0.45,
          x,
          y,
          s,
        );
        if (mancha < 0.32) return escurece(p, 0.82);
        if (hash2(x, y, s + 4) > 0.95) return rampa(['#a6a6ac'], 0, x, y, s);
        return p;
      };
    case Bloco.AREIA_BRUMA:
      return (x, y, s) => {
        if (hash2(x, y, s + 2) > 0.92) return rampa(['#c4b07e'], 0, x, y, s);
        return rampa(
          ['#d6c491', '#ddcb99', '#e3d2a2', '#e9daab'],
          fbmT(x, y, 4, s) * 0.5 + hash2(x, y, s) * 0.5,
          x,
          y,
          s,
        );
      };
    case Bloco.MADEIRA_RETORCIDA:
      return (x, y, s) => {
        const veio = ruidoT(x, y, 8, 2, s) * 0.6 + hash2(x, y >> 2, s) * 0.4;
        const p = rampa(['#3f2c1d', '#4c3624', '#59412b', '#664c33'], veio, x, y, s);
        return x % 4 === 0 && hash2(x, y >> 1, s + 3) > 0.4 ? escurece(p, 0.8) : p;
      };
    case Bloco.FOLHAGEM:
      return (x, y, s) => {
        const t = fbmT(x, y, 4, s) * 0.5 + hash2(x, y, s) * 0.5;
        if (hash2(x, y, s + 21) < 0.14 && t < 0.55) return VAZIO;
        return rampa(['#24561d', '#2d6624', '#37762b', '#428633', '#50963c'], t, x, y, s);
      };
    case Bloco.CRISTAL_LUZ:
      return (x, y, s) => {
        const borda = x === 0 || y === 0 || x === T - 1 || y === T - 1;
        const faceta = ((x + 2 * y) % 9) / 9;
        const t = faceta * 0.6 + fbmT(x, y, 2, s) * 0.4;
        if ((x + y) % 7 === 0 && !borda) return rampa(['#7cc6ef'], 0, x, y, s);
        const p = rampa(['#1d4f9c', '#2668b8', '#3184cf', '#4aa3e0'], t, x, y, s);
        return borda ? escurece(p, 0.75) : p;
      };
    case Bloco.TABUAS:
      return (x, y, s) => {
        const tabua = y >> 2;
        const junta = (tabua * 5 + 3) % T;
        const tom = 0.9 + hash2(tabua, 0, s) * 0.2;
        const veio = ruidoT(x, y, 2, 8, s + tabua) * 0.6 + hash2(x, y, s) * 0.4;
        const p = rampa(['#9a7148', '#a77b4f', '#b38657', '#bf925f'], veio, x, y, s);
        if (y % 4 === 3 || x === junta) return escurece(p, 0.62);
        return escurece(p, tom);
      };
    default:
      return pintorPlanta(bloco);
  }
}

function pintorPlanta(bloco: number): Pintor {
  return (x, y, s) => {
    if (bloco === Bloco.GRAMA_ALTA) {
      if (hash2(x, 3, s) < 0.35) return VAZIO;
      const altura = 5 + Math.floor(hash2(x, 4, s) * 10);
      if (T - 1 - y >= altura) return VAZIO;
      const t = 1 - (T - 1 - y) / altura;
      return escurece(rampa(GRAMA, 1 - t * 0.8, x, y, s), 0.85 + 0.15 * (1 - t));
    }
    if (bloco === Bloco.FLOR) {
      const dx = x - 7.5;
      const dy = y - 5;
      const d = Math.abs(dx) + Math.abs(dy);
      if (d < 1.5) return rampa(['#ffd75a'], 0, x, y, s);
      if (d < 4.2) return rampa(['#c94592', '#e05aa8', '#f07cc0'], hash2(x, y, s), x, y, s);
      if ((x === 7 || x === 8) && y >= 8)
        return rampa(['#3d7a2c', '#468a32'], hash2(x, y, s), x, y, s);
      if (y === 11 && (x === 5 || x === 6 || x === 9 || x === 10))
        return rampa(['#509838'], 0, x, y, s);
      return VAZIO;
    }
    // cogumelo brilhante
    const dx = x - 7.5;
    const dy = y - 7;
    if (y <= 7 && (dx * dx) / 42 + (dy * dy) / 20 < 1) {
      if (hash2(x, y, s + 1) > 0.85 && y < 6) return rampa(['#9ff3e2'], 0, x, y, s);
      return rampa(['#249e92', '#2fb8a8', '#45d0bc'], 1 - y / 8 + hash2(x, y, s) * 0.3, x, y, s);
    }
    if (x >= 6 && x <= 9 && y > 7)
      return rampa(['#6f8a7a', '#7a9684', '#86a08e'], hash2(x, y, s), x, y, s);
    return VAZIO;
  };
}

function limita(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

export type FaceBloco = 'topo' | 'lado' | 'base';

/** Células extras: topo da grama e da madeira e a terra pura. */
const EXTRAS: [number, number, () => Pintor][] = [
  [Bloco.TERRA_MUSGOSA, 10, pintorGramaTopo],
  [
    Bloco.MADEIRA_RETORCIDA,
    11,
    () => (x, y, s) => {
      if (x === 0 || y === 0 || x === T - 1 || y === T - 1) {
        return rampa(['#3f2c1d', '#4c3624'], hash2(x, y, s), x, y, s);
      }
      const r = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)) + ruidoT(x, y, 4, 4, s) * 1.2;
      const anel = Math.floor(r * 0.9) % 2;
      return rampa(anel ? ['#a07a4c', '#a8824f'] : ['#b8915c', '#c19a63'], hash2(x, y, s), x, y, s);
    },
  ],
  [0, TILE_TERRA, pintorTerra],
];

function celulaDe(indice: number): { ox: number; oy: number } {
  return { ox: (indice % COLUNAS) * CELULA, oy: Math.floor(indice / COLUNAS) * CELULA };
}

/** Retângulo UV do miolo de uma célula (sem a borda). Puro: serve ao worker. */
export function uvDaCelula(indice: number): RetanguloUV {
  const { ox, oy } = celulaDe(indice);
  return {
    u0: (ox + PADDING) / LARGURA_ATLAS,
    v0: (oy + PADDING) / ALTURA_ATLAS,
    u1: (ox + PADDING + TAM_TILE) / LARGURA_ATLAS,
    v1: (oy + PADDING + TAM_TILE) / ALTURA_ATLAS,
  };
}

export function gerarAtlas(semente = 1337): Atlas {
  const pixels = new Uint8ClampedArray(LARGURA_ATLAS * ALTURA_ATLAS * 4);
  const tiles: TileAtlas[] = [];
  const itens: [number, string, number, Pintor][] = NOMES.map(([b, n], i) => [
    b,
    n,
    i,
    pintorPorBloco(b),
  ]);
  const extras = EXTRAS.map(([b, i, p]) => [b, '', i, p()] as [number, string, number, Pintor]);
  [...itens, ...extras].forEach(([bloco, nome, indice, pinta]) => {
    const { ox, oy } = celulaDe(indice);
    const s = semente + (bloco || 50 + indice) * 977;
    for (let py = 0; py < CELULA; py++) {
      for (let px = 0; px < CELULA; px++) {
        const x = Math.min(TAM_TILE - 1, Math.max(0, px - PADDING));
        const y = Math.min(TAM_TILE - 1, Math.max(0, py - PADDING));
        const p = pinta(x, y, s);
        const i = ((oy + py) * LARGURA_ATLAS + ox + px) * 4;
        pixels[i] = limita(p[0]);
        pixels[i + 1] = limita(p[1]);
        pixels[i + 2] = limita(p[2]);
        pixels[i + 3] = limita(p[3]);
      }
    }
    if (indice < NOMES.length) {
      tiles.push({ bloco, nome, indice, uv: uvDaCelula(indice) });
    }
  });
  const uvDoBloco = (bloco: number) => tiles.find((t) => t.bloco === bloco)?.uv;
  return {
    largura: LARGURA_ATLAS,
    altura: ALTURA_ATLAS,
    pixels,
    tiles,
    uvDoBloco,
    uvDaFace: (bloco, face) => {
      const topo = TILE_TOPO[bloco];
      if (topo !== undefined && face === 'topo') return uvDaCelula(topo);
      if (bloco === Bloco.TERRA_MUSGOSA && face === 'base') return uvDaCelula(TILE_TERRA);
      return uvDoBloco(bloco);
    },
  };
}

/** Envoltório para o navegador: converte o buffer em canvas. */
export function atlasParaCanvas(atlas: Atlas): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = atlas.largura;
  canvas.height = atlas.altura;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponível');
  const dados = new ImageData(new Uint8ClampedArray(atlas.pixels), atlas.largura, atlas.altura);
  ctx.putImageData(dados, 0, 0);
  return canvas;
}
