import { Bloco } from '../world/blocks';
import { fbm2, hash2 } from '../world/noise';

export const TAM_TILE = 32;
export const PADDING = 2;
export const CELULA = TAM_TILE + PADDING * 2;
export const COLUNAS = 4;
export const LINHAS = 3;
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
}

type Cor = [number, number, number];

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

function mistura(a: Cor, b: Cor, t: number): Cor {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Pixel RGBA de um tile, com (x, y) em [0, 32). */
type Pintor = (x: number, y: number, s: number) => [number, number, number, number];

function sombreia(c: Cor, f: number): Cor {
  return [c[0] * f, c[1] * f, c[2] * f];
}

function pintorBase(a: Cor, b: Cor, escala: number, grao: number): Pintor {
  return (x, y, s) => {
    const t = fbm2(x / escala, y / escala, s);
    const g = (hash2(x, y, s + 7) - 0.5) * grao;
    const c = sombreia(mistura(a, b, t), 1 + g);
    return [c[0], c[1], c[2], 255];
  };
}

function pintorPorBloco(bloco: number): Pintor {
  switch (bloco) {
    case Bloco.TERRA_MUSGOSA: {
      const base = pintorBase([70, 52, 48], [52, 96, 78], 5, 0.25);
      return (x, y, s) => {
        const p = base(x, y, s);
        const musgo = fbm2(x / 3, y / 3, s + 31) > 0.55 && y < 14;
        return musgo ? [40 + p[0] * 0.2, 110 + hash2(x, y, s) * 30, 90, 255] : p;
      };
    }
    case Bloco.PEDRA_RACHADA: {
      const base = pintorBase([92, 96, 112], [138, 140, 158], 4, 0.2);
      return (x, y, s) => {
        const p = base(x, y, s);
        const fenda = Math.abs(fbm2(x / 6, y / 6, s + 5) - 0.5) < 0.025;
        return fenda ? [30, 32, 48, 255] : p;
      };
    }
    case Bloco.AREIA_BRUMA:
      return pintorBase([206, 190, 178], [232, 214, 200], 6, 0.14);
    case Bloco.MADEIRA_RETORCIDA: {
      return (x, y, s) => {
        const veio = fbm2((x + fbm2(x / 8, y / 8, s) * 6) / 2, y / 12, s + 3);
        const c = sombreia(
          mistura([78, 48, 52], [128, 84, 76], veio),
          1 + (hash2(x, y, s) - 0.5) * 0.12,
        );
        return [c[0], c[1], c[2], 255];
      };
    }
    case Bloco.FOLHAGEM:
      return pintorBase([32, 86, 82], [76, 150, 112], 3, 0.3);
    case Bloco.CRISTAL_LUZ:
      return (x, y, s) => {
        const t = fbm2(x / 4, y / 4, s + 9);
        const facetas = ((x + y) % 11 < 2 ? 0.25 : 0) + t * 0.6;
        const c = mistura([150, 210, 255], [235, 250, 255], Math.min(1, facetas));
        return [c[0], c[1], c[2], 255];
      };
    case Bloco.TABUAS:
      return (x, y, s) => {
        const tabua = Math.floor(y / 8);
        const junta = y % 8 === 0;
        const tom = 0.85 + hash2(tabua, 0, s) * 0.3;
        const veio = fbm2(x / 10, y / 2, s + tabua);
        const c = sombreia(mistura([150, 104, 82], [184, 134, 98], veio), tom * (junta ? 0.6 : 1));
        return [c[0], c[1], c[2], 255];
      };
    default:
      return pintorPlanta(bloco);
  }
}

function pintorPlanta(bloco: number): Pintor {
  return (x, y, s) => {
    const vazio: [number, number, number, number] = [0, 0, 0, 0];
    const cx = 15.5;
    const ruidoCor = (hash2(x, y, s) - 0.5) * 0.3;
    if (bloco === Bloco.GRAMA_ALTA) {
      const lamina = Math.floor(x / 4);
      const altura = 10 + hash2(lamina, 1, s) * 20;
      if (31 - y > altura) return vazio;
      const c = sombreia(mistura([40, 110, 90], [120, 190, 120], (31 - y) / 32), 1 + ruidoCor);
      return x % 4 === 3 ? vazio : [c[0], c[1], c[2], 255];
    }
    if (bloco === Bloco.FLOR) {
      const dx = x - cx;
      const dy = y - 9;
      if (dx * dx + dy * dy < 49) {
        const c = sombreia(mistura([220, 90, 200], [255, 170, 230], hash2(x, y, s)), 1 + ruidoCor);
        return [c[0], c[1], c[2], 255];
      }
      if (Math.abs(dx) < 1.5 && y >= 16) return [50 + ruidoCor * 50, 130, 100, 255];
      return vazio;
    }
    const dx = x - cx;
    const dy = y - 15;
    if (dy < 0 && (dx * dx) / 144 + (dy * dy) / 100 < 1) {
      const c = sombreia(mistura([60, 200, 190], [170, 255, 220], hash2(x, y, s)), 1 + ruidoCor);
      return [c[0], c[1], c[2], 255];
    }
    if (Math.abs(dx) < 2.5 && y >= 15 && y < 30) return [200, 210, 190 + ruidoCor * 40, 255];
    return vazio;
  };
}

function limita(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

export function gerarAtlas(semente = 1337): Atlas {
  const pixels = new Uint8ClampedArray(LARGURA_ATLAS * ALTURA_ATLAS * 4);
  const tiles: TileAtlas[] = [];
  NOMES.forEach(([bloco, nome], indice) => {
    const ox = (indice % COLUNAS) * CELULA;
    const oy = Math.floor(indice / COLUNAS) * CELULA;
    const pinta = pintorPorBloco(bloco);
    const s = semente + bloco * 977;
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
    tiles.push({
      bloco,
      nome,
      indice,
      uv: {
        u0: (ox + PADDING) / LARGURA_ATLAS,
        v0: (oy + PADDING) / ALTURA_ATLAS,
        u1: (ox + PADDING + TAM_TILE) / LARGURA_ATLAS,
        v1: (oy + PADDING + TAM_TILE) / ALTURA_ATLAS,
      },
    });
  });
  return {
    largura: LARGURA_ATLAS,
    altura: ALTURA_ATLAS,
    pixels,
    tiles,
    uvDoBloco: (bloco) => tiles.find((t) => t.bloco === bloco)?.uv,
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
