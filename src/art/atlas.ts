import { Bloco, REGISTRO_BLOCOS } from '../world/blocks';
import { hash2 } from '../world/noise';
import { NOMES_TILES, TILE_BRANCO, TILES_BRILHO, indiceDoTile } from './tiles';

/** Tiles de 16x16 em pixel-art, com borda larga para mipmaps sem sangrar. */
export const TAM_TILE = 16;
export const PADDING = 8;
export const CELULA = TAM_TILE + PADDING * 2;
export const COLUNAS = 16;
export const LINHAS = 8;
export const LARGURA_ATLAS = COLUNAS * CELULA;
export const ALTURA_ATLAS = LINHAS * CELULA;

export interface RetanguloUV {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

export interface TileAtlas {
  /** Primeiro bloco que usa o tile como lado (-1 se nenhum). */
  bloco: number;
  nome: string;
  indice: number;
  uv: RetanguloUV;
  emissivo: boolean;
}

export type FaceBloco = 'topo' | 'lado' | 'base' | 'frente';

export interface Atlas {
  largura: number;
  altura: number;
  pixels: Uint8ClampedArray;
  tiles: TileAtlas[];
  uvDoBloco(bloco: number): RetanguloUV | undefined;
  uvDaFace(bloco: number, face: FaceBloco): RetanguloUV | undefined;
  uvDoTile(nome: string): RetanguloUV | undefined;
}

/** Tiles cujos pixels saturados brilham (mapa emissivo). */
export const TILES_EMISSIVOS: ReadonlySet<string> = new Set([
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
  // spec 014: a Cidade Grande
  'janela_acesa',
  'poste',
]);

import type { Pintor, Px } from '../temas/tipos';
import { tema } from '../temas/ativo';

export function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const T = TAM_TILE;
const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Ruído de valor que se repete a cada tile (sem costura entre blocos). */
export function ruidoT(x: number, y: number, celX: number, celY: number, s: number): number {
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

export function fbmT(x: number, y: number, cel: number, s: number, oitavas = 3): number {
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
export function rampa(cores: string[], t: number, x: number, y: number, s: number): Px {
  const i = Math.max(0, Math.min(cores.length - 1, Math.floor(t * cores.length)));
  const c = hex(cores[i]);
  const j = (hash2(x, y, s + 999) - 0.5) * 8;
  return [c[0] + j, c[1] + j, c[2] + j, 255];
}

export function escurece(p: Px, f: number): Px {
  return [p[0] * f, p[1] * f, p[2] * f, p[3]];
}

/** Pixel transparente (plantas, recortes). */
export const VAZIO: Px = [0, 0, 0, 0];

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

const PEDRA = ['#626268', '#6e6e74', '#7a7a80', '#87878d', '#95959b'];

export function pedraBase(x: number, y: number, s: number): Px {
  const mancha = fbmT(x, y, 4, s + 8);
  const p = rampa(PEDRA, fbmT(x, y, 4, s) * 0.55 + hash2(x, y, s) * 0.45, x, y, s);
  if (mancha < 0.32) return escurece(p, 0.82);
  if (hash2(x, y, s + 4) > 0.95) return rampa(['#a6a6ac'], 0, x, y, s);
  return p;
}

/** Pedra com veios de minério (manchas de 2 a 3 pixels). */
export function minerio(cores: string[], brilho?: string): Pintor {
  return (x, y, s) => {
    const n = fbmT(x, y, 4, s + 77);
    const v = hash2(x, y, s + 13);
    if (n > 0.62 && v > 0.25) {
      if (brilho && v > 0.85) return rampa([brilho], 0, x, y, s);
      return rampa(cores, (n - 0.62) * 2.6, x, y, s);
    }
    if (n > 0.58) return escurece(pedraBase(x, y, s), 0.75);
    return pedraBase(x, y, s);
  };
}

export function ruidoPaleta(cores: string[], cel = 4, mistura = 0.5): Pintor {
  return (x, y, s) =>
    rampa(cores, fbmT(x, y, cel, s) * (1 - mistura) + hash2(x, y, s) * mistura, x, y, s);
}

export function folhasDe(cores: string[], buracos = 0.14, flores?: string): Pintor {
  return (x, y, s) => {
    const t = fbmT(x, y, 4, s) * 0.5 + hash2(x, y, s) * 0.5;
    if (hash2(x, y, s + 21) < buracos && t < 0.55) return VAZIO;
    if (flores && hash2(x, y, s + 33) > 0.96) return rampa([flores], 0, x, y, s);
    return rampa(cores, t, x, y, s);
  };
}

export function troncoDe(cores: string[], listra?: string): Pintor {
  return (x, y, s) => {
    const veio = ruidoT(x, y, 8, 2, s) * 0.6 + hash2(x, y >> 2, s) * 0.4;
    const p = rampa(cores, veio, x, y, s);
    if (listra && hash2(x >> 1, y >> 1, s + 9) > 0.86) return rampa([listra], 0, x, y, s);
    return x % 4 === 0 && hash2(x, y >> 1, s + 3) > 0.4 ? escurece(p, 0.8) : p;
  };
}

export function aneisDe(casca: string[], miolo: [string[], string[]]): Pintor {
  return (x, y, s) => {
    if (x === 0 || y === 0 || x === T - 1 || y === T - 1)
      return rampa(casca, hash2(x, y, s), x, y, s);
    const r = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)) + ruidoT(x, y, 4, 4, s) * 1.2;
    return rampa(Math.floor(r * 0.9) % 2 ? miolo[0] : miolo[1], hash2(x, y, s), x, y, s);
  };
}

export function tabuasDe(cores: string[]): Pintor {
  return (x, y, s) => {
    const tabua = y >> 2;
    const junta = (tabua * 5 + 3) % T;
    const tom = 0.9 + hash2(tabua, 0, s) * 0.2;
    const veio = ruidoT(x, y, 2, 8, s + tabua) * 0.6 + hash2(x, y, s) * 0.4;
    const p = rampa(cores, veio, x, y, s);
    if (y % 4 === 3 || x === junta) return escurece(p, 0.62);
    return escurece(p, tom);
  };
}

/**
 * Porta de dois blocos pintada como uma peça só (spec 013). `inteira(x, yy, s)` vai de yy 0
 * (o alto da porta) a 31 (o pé): a metade de cima é yy 0 a 15 e a de baixo, 16 a 31. As duas
 * usam a mesma semente e os veios das tábuas se repetem a cada 16, então a madeira continua de
 * uma metade para a outra, sem emenda.
 */
export function metadesDaPorta(inteira: Pintor): { porta: Pintor; porta_cima: Pintor } {
  const S = 5309;
  return { porta: (x, y) => inteira(x, y + T, S), porta_cima: (x, y) => inteira(x, y, S) };
}

/** Moldura da porta inteira: os lados, o alto e o pé (nada no meio, onde as metades se encostam). */
export function bordaDaPorta(x: number, yy: number, n = 0): boolean {
  return x <= n || x >= T - 1 - n || yy <= n || yy >= 2 * T - 1 - n;
}

export function ladoComTopo(topo: Pintor, base: Pintor, sombra: string, prof = 2): Pintor {
  return (x, y, s) => {
    let borda = prof + Math.floor(hash2(x, 0, s + 17) * 3);
    if (hash2(x, 1, s + 17) > 0.75) borda += 2;
    if (y < borda) return topo(x, y, s);
    if (y === borda) return rampa([sombra], 0, x, y, s);
    return base(x, y, s);
  };
}

export function tijolosDe(cores: string[], argamassa: string, altura = 4, largura = 8): Pintor {
  return (x, y, s) => {
    const fila = Math.floor(y / altura);
    const desloc = fila % 2 ? largura / 2 : 0;
    const col = Math.floor((x + desloc) / largura);
    if (y % altura === altura - 1 || (x + desloc) % largura === 0)
      return rampa([argamassa], hash2(x, y, s) * 0.99, x, y, s);
    const tom = 0.9 + hash2(col, fila, s) * 0.2;
    return escurece(rampa(cores, hash2(x, y, s) * 0.6 + fbmT(x, y, 4, s) * 0.4, x, y, s), tom);
  };
}

export function laDe(cor: string): Pintor {
  const c = hex(cor);
  return (x, y, s) => {
    const fio = ((x + y) % 4 === 0 ? 0.88 : 1) * (0.94 + hash2(x, y, s) * 0.12);
    return [c[0] * fio, c[1] * fio, c[2] * fio, 255];
  };
}

/** Moldura de madeira com miolo próprio (mesa, baú). */
export function moldura(
  miolo: Pintor,
  madeira: string[] = ['#7a5432', '#86603a', '#93693f'],
): Pintor {
  return (x, y, s) => {
    if (x <= 1 || y <= 1 || x >= T - 2 || y >= T - 2) {
      const p = rampa(madeira, hash2(x, y, s), x, y, s);
      return x === 0 || y === 0 || x === T - 1 || y === T - 1 ? escurece(p, 0.7) : p;
    }
    return miolo(x, y, s);
  };
}

const tabuasCarvalho = tabuasDe(['#9a7148', '#a77b4f', '#b38657', '#bf925f']);
const pedregulho: Pintor = (x, y, s) => {
  // pedras arredondadas: distância à semente mais próxima (Voronoi tileável)
  let d1 = 99;
  let d2 = 99;
  let id = 0;
  for (let j = -1; j <= 1; j++) {
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
  }
  if (d2 - d1 < 0.9) return rampa(['#3f3f45'], 0, x, y, s);
  const tom = 0.85 + hash2(id, 3, s) * 0.3;
  return escurece(rampa(PEDRA, hash2(x, y, s) * 0.5 + 0.4 - d1 * 0.08, x, y, s), tom);
};
const fornalhaLado: Pintor = (x, y, s) => escurece(pedregulho(x, y, s), 0.95);
function bocaFornalha(acesa: boolean): Pintor {
  return (x, y, s) => {
    if (x >= 4 && x <= 11 && y >= 8 && y <= 13) {
      if (x === 4 || x === 11 || y === 8 || y === 13) return rampa(['#2a2a2e'], 0, x, y, s);
      if (!acesa) return rampa(['#141416', '#1c1c20'], hash2(x, y, s), x, y, s);
      const f = (13 - y) / 5 + hash2(x, y, s) * 0.4;
      return rampa(['#c23a0a', '#e86a12', '#ffa52a', '#ffd25a'], f, x, y, s);
    }
    if (y === 3 && x >= 3 && x <= 12) return rampa(['#4a4a50'], 0, x, y, s);
    return fornalhaLado(x, y, s);
  };
}

/** Pintores do tema base (Bruma e Luz), por nome do tile. */
const TABUAS_PORTA = tabuasDe(['#8a603a', '#966a40', '#a27446']);

export const PINTORES: Record<string, Pintor> = {
  grama_topo: pintorGramaTopo(),
  grama_lado: pintorGramaLado(),
  terra: pintorTerra(),
  pedra: pedraBase,
  areia: (x, y, s) => {
    if (hash2(x, y, s + 2) > 0.92) return rampa(['#c4b07e'], 0, x, y, s);
    return rampa(
      ['#d6c491', '#ddcb99', '#e3d2a2', '#e9daab'],
      fbmT(x, y, 4, s) * 0.5 + hash2(x, y, s) * 0.5,
      x,
      y,
      s,
    );
  },
  tronco: troncoDe(['#3f2c1d', '#4c3624', '#59412b', '#664c33']),
  tronco_topo: aneisDe(
    ['#3f2c1d', '#4c3624'],
    [
      ['#a07a4c', '#a8824f'],
      ['#b8915c', '#c19a63'],
    ],
  ),
  folhas: folhasDe(['#24561d', '#2d6624', '#37762b', '#428633', '#50963c']),
  cristal: (x, y, s) => {
    const borda = x === 0 || y === 0 || x === T - 1 || y === T - 1;
    const faceta = ((x + 2 * y) % 9) / 9;
    const t = faceta * 0.6 + fbmT(x, y, 2, s) * 0.4;
    if ((x + y) % 7 === 0 && !borda) return rampa(['#7cc6ef'], 0, x, y, s);
    const p = rampa(['#1d4f9c', '#2668b8', '#3184cf', '#4aa3e0'], t, x, y, s);
    return borda ? escurece(p, 0.75) : p;
  },
  tabuas: tabuasCarvalho,
  grama_alta: pintorPlanta(Bloco.GRAMA_ALTA),
  flor: pintorPlanta(Bloco.FLOR),
  cogumelo: pintorPlanta(Bloco.COGUMELO_BRILHANTE),
  pedregulho,
  cascalho: (x, y, s) => {
    const v = hash2(x >> 1, y >> 1, s);
    const base = rampa(
      ['#6b625c', '#7d736b', '#8f857c', '#a0968c'],
      v * 0.7 + hash2(x, y, s) * 0.3,
      x,
      y,
      s,
    );
    return hash2(x, y, s + 5) > 0.9 ? escurece(base, 0.6) : base;
  },
  rocha_matriz: (x, y, s) => {
    const v = fbmT(x, y, 8, s);
    return rampa(
      ['#1a1a1e', '#2a2a30', '#3a3a42', '#55555e'],
      v * 0.6 + hash2(x, y, s) * 0.4,
      x,
      y,
      s,
    );
  },
  min_carvao: minerio(['#1b1b1f', '#26262c', '#33333a']),
  min_cobre: minerio(['#a5552a', '#c46e3a', '#d98c55'], '#5fbf9a'),
  min_ferro: minerio(['#b8937a', '#cfab90', '#e2c4a8']),
  min_ouro: minerio(['#d4a01c', '#efc33a', '#ffe070'], '#fff3b0'),
  min_luzita: minerio(['#1fa8a0', '#2cc8bd', '#55e6d6'], '#9ff6ea'),
  neve: ruidoPaleta(['#e8eef6', '#eef3fa', '#f4f8fd', '#ffffff'], 4, 0.6),
  neve_lado: ladoComTopo(ruidoPaleta(['#e8eef6', '#f4f8fd']), pintorTerra(), '#b9c2cf', 3),
  gelo: (x, y, s) => {
    const risco = Math.abs(((x * 2 + y) % 11) - 5) < 0.6 && hash2(x, y, s) > 0.4;
    if (risco) return rampa(['#e6f6ff'], 0, x, y, s);
    return rampa(
      ['#7fb6e6', '#8cc2ee', '#9bcdf3', '#a9d6f6'],
      fbmT(x, y, 2, s) * 0.7 + hash2(x, y, s) * 0.3,
      x,
      y,
      s,
    );
  },
  arenito_lado: (x, y, s) => {
    const faixa = Math.floor(y / 4) % 2;
    const p = rampa(
      ['#d1b07a', '#d9b984', '#e1c48f'],
      hash2(x, y, s) * 0.6 + fbmT(x, y, 4, s) * 0.4,
      x,
      y,
      s,
    );
    if (y % 4 === 3) return escurece(p, 0.88);
    return faixa ? escurece(p, 0.96) : p;
  },
  arenito_topo: ruidoPaleta(['#d6b67f', '#dfc18b', '#e7cb97'], 4, 0.5),
  areia_deserto: (x, y, s) => {
    const onda = Math.sin((y + fbmT(x, y, 2, s) * 4) * 0.9) * 0.5 + 0.5;
    return rampa(
      ['#d9b56e', '#e2c07b', '#eacb88', '#f0d595'],
      onda * 0.5 + hash2(x, y, s) * 0.5,
      x,
      y,
      s,
    );
  },
  cacto_lado: (x, y, s) => {
    if (x === 0 || x === T - 1) return VAZIO;
    const listra = x % 4 === 2;
    if ((x === 1 || x === T - 2) && hash2(x, y, s) > 0.8) return rampa(['#e8e2b0'], 0, x, y, s);
    return rampa(
      listra ? ['#2f6b2a', '#357530'] : ['#3f8a35', '#4a9a3e', '#55a646'],
      hash2(x, y, s),
      x,
      y,
      s,
    );
  },
  cacto_topo: (x, y, s) => {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    if (d > 6.6) return VAZIO;
    return rampa(d < 2 ? ['#6abf55'] : ['#3f8a35', '#4a9a3e'], hash2(x, y, s), x, y, s);
  },
  arbusto_seco: (x, y, s) => {
    const galho =
      (Math.abs(x - 7.5 - (y - 15) * 0.15) < 0.8 && y > 5) ||
      (Math.abs(x - 7.5 + (y - 10) * 0.9) < 0.7 && y > 4 && y < 11) ||
      (Math.abs(x - 7.5 - (y - 12) * 0.8) < 0.7 && y > 6 && y < 13);
    return galho ? rampa(['#7a5530', '#8f6638', '#a37a47'], hash2(x, y, s), x, y, s) : VAZIO;
  },
  betula: (x, y, s) => {
    const p = rampa(
      ['#e3ded2', '#ece8dd', '#f4f1e8'],
      hash2(x, y, s) * 0.6 + fbmT(x, y, 2, s) * 0.4,
      x,
      y,
      s,
    );
    const marca = hash2(x >> 2, y, s + 3) > 0.82 && hash2(x, y >> 1, s + 1) > 0.3;
    return marca ? rampa(['#2b2826', '#3a3633'], hash2(x, y, s), x, y, s) : p;
  },
  betula_topo: aneisDe(
    ['#e3ded2', '#c8c2b4'],
    [
      ['#c9a874', '#d1b07c'],
      ['#dbbb88', '#e2c392'],
    ],
  ),
  folhas_betula: folhasDe(['#4f7d26', '#5c8c2d', '#6a9b35', '#79a93e', '#89b74a'], 0.16),
  pinho: troncoDe(['#2e1f15', '#3a281b', '#463121', '#523a27']),
  pinho_topo: aneisDe(
    ['#2e1f15', '#3a281b'],
    [
      ['#8f6a3e', '#977143'],
      ['#a77d4b', '#ae8551'],
    ],
  ),
  folhas_pinho: folhasDe(['#16392a', '#1b4531', '#215139', '#285d41', '#2f6a49'], 0.1),
  pantano_topo: (x, y, s) => {
    const p = rampa(
      ['#3b5a2a', '#46682f', '#517535', '#5d833c'],
      fbmT(x, y, 4, s) * 0.6 + hash2(x, y, s) * 0.4,
      x,
      y,
      s,
    );
    return hash2(x, y, s + 8) > 0.97 ? rampa(['#8ff0c8'], 0, x, y, s) : p;
  },
  pantano_lado: ladoComTopo(
    (x, y, s) => rampa(['#3b5a2a', '#46682f', '#517535'], hash2(x, y, s), x, y, s),
    (x, y, s) =>
      rampa(
        ['#3a2f26', '#433629', '#4c3e2f'],
        hash2(x, y, s) * 0.6 + fbmT(x, y, 4, s) * 0.4,
        x,
        y,
        s,
      ),
    '#2b3a1e',
  ),
  lama: (x, y, s) => {
    const p = rampa(
      ['#3a2f26', '#433629', '#4c3e2f', '#56462f'],
      hash2(x, y, s) * 0.6 + fbmT(x, y, 4, s) * 0.4,
      x,
      y,
      s,
    );
    return hash2(x, y, s + 1) > 0.94 ? escurece(p, 0.7) : p;
  },
  junco: (x, y, s) => {
    const hastes = [3, 7, 12];
    for (const h of hastes) {
      const topo = 2 + Math.floor(hash2(h, 0, s) * 5);
      if (Math.abs(x - h - (y - 15) * 0.05) < 0.8 && y >= topo) {
        if (y < topo + 4 && h === 7) return rampa(['#6b4423', '#7a4f29'], hash2(x, y, s), x, y, s);
        return rampa(['#4f7d2e', '#5c8c35', '#699a3c'], hash2(x, y, s), x, y, s);
      }
    }
    return VAZIO;
  },
  tronco_lanterna: troncoDe(['#2b2233', '#352a3e', '#40324a', '#4b3a56'], '#6fe3c8'),
  tronco_lanterna_topo: aneisDe(
    ['#2b2233', '#352a3e'],
    [
      ['#5b4a6a', '#635273'],
      ['#6f5d80', '#77658a'],
    ],
  ),
  folhas_lanterna: folhasDe(
    ['#174a46', '#1c5a52', '#226a5f', '#2a7a6c', '#338a78'],
    0.18,
    '#ffd36a',
  ),
  vidro: (x, y, s) => {
    const borda = x === 0 || y === 0 || x === T - 1 || y === T - 1;
    if (borda) return rampa(['#b8d4e0', '#c8e0ea'], hash2(x, y, s), x, y, s);
    if ((x === y + 3 || x === y + 4) && x > 3 && x < 10) return [235, 248, 255, 255];
    return VAZIO;
  },
  tocha: (x, y, s) => {
    if (x >= 7 && x <= 8 && y >= 6) return rampa(['#6b4423', '#7d5229'], hash2(x, y, s), x, y, s);
    if (x >= 6 && x <= 9 && y >= 2 && y <= 5) {
      const f = (5 - y) / 3 + hash2(x, y, s) * 0.3;
      return rampa(['#e8641a', '#ffa22e', '#ffd45a', '#fff0a8'], f, x, y, s);
    }
    if (x >= 7 && x <= 8 && y === 1) return rampa(['#ffb43a'], 0, x, y, s);
    return VAZIO;
  },
  lanterna: (x, y, s) => {
    const borda = x <= 1 || x >= T - 2 || y <= 1 || y >= T - 2;
    if (borda) return rampa(['#2d2a2e', '#3a363b'], hash2(x, y, s), x, y, s);
    if (x === 7 || x === 8 || y === 7 || y === 8) return rampa(['#3a363b'], 0, x, y, s);
    const d = Math.hypot(x - 7.5, y - 7.5) / 7;
    return rampa(['#ffb43a', '#ffcd5c', '#ffe08a'], 1 - d + hash2(x, y, s) * 0.2, x, y, s);
  },
  bloco_luzita: (x, y, s) => {
    const borda = x === 0 || y === 0 || x === T - 1 || y === T - 1;
    const t = (((x + y) % 6) / 6) * 0.5 + fbmT(x, y, 2, s) * 0.5;
    const p = rampa(['#168f88', '#1fa8a0', '#2cc0b5', '#4ad6c9'], t, x, y, s);
    return borda ? escurece(p, 0.7) : p;
  },
  mesa_topo: moldura((x, y, s) => {
    if (x === 7 || y === 7) return rampa(['#5a3d22'], 0, x, y, s);
    return tabuasCarvalho(x, y, s);
  }),
  mesa_lado: (x, y, s) =>
    y < 3 ? rampa(['#7a5432', '#86603a'], hash2(x, y, s), x, y, s) : tabuasCarvalho(x, y, s),
  mesa_frente: (x, y, s) => {
    if (y < 3) return rampa(['#7a5432', '#86603a'], hash2(x, y, s), x, y, s);
    // ferramentas penduradas
    if (x >= 3 && x <= 5 && y >= 5 && y <= 12)
      return rampa(x === 4 ? ['#6b4423'] : ['#8a8a92'], 0, x, y, s);
    if (x >= 9 && x <= 12 && y >= 5 && y <= 7)
      return rampa(['#9a9aa2', '#b0b0b8'], hash2(x, y, s), x, y, s);
    if (x === 11 && y >= 7 && y <= 12) return rampa(['#6b4423'], 0, x, y, s);
    return tabuasCarvalho(x, y, s);
  },
  fornalha_lado: fornalhaLado,
  fornalha_topo: (x, y, s) => escurece(pedraBase(x, y, s), 0.92),
  fornalha_frente: bocaFornalha(false),
  fornalha_acesa: bocaFornalha(true),
  bau_lado: moldura((x, y, s) =>
    y === 6
      ? rampa(['#4a3018'], 0, x, y, s)
      : rampa(['#a0723e', '#ac7c44', '#b8874c'], ruidoT(x, y, 2, 8, s), x, y, s),
  ),
  bau_topo: moldura((x, y, s) =>
    rampa(['#a0723e', '#ac7c44', '#b8874c'], ruidoT(x, y, 8, 2, s), x, y, s),
  ),
  bau_frente: (x, y, s) => {
    if (x >= 7 && x <= 8 && y >= 5 && y <= 8)
      return rampa(['#d8c070', '#e8d080'], hash2(x, y, s), x, y, s);
    return moldura((x2, y2, s2) =>
      y2 === 6
        ? rampa(['#4a3018'], 0, x2, y2, s2)
        : rampa(['#a0723e', '#ac7c44', '#b8874c'], ruidoT(x2, y2, 2, 8, s2), x2, y2, s2),
    )(x, y, s);
  },
  tijolos: tijolosDe(['#9c4a3a', '#a85444', '#b45e4c', '#bd6a56'], '#cdbfae'),
  tijolos_pedra: tijolosDe(['#6e6e74', '#7a7a80', '#85858b'], '#4c4c52', 8, 16),
  pedra_lisa: (x, y, s) => {
    if (x === 0 || y === 0 || x === T - 1 || y === T - 1) return rampa(['#77777d'], 0, x, y, s);
    return rampa(
      ['#8d8d93', '#93939a', '#9a9aa0'],
      hash2(x, y, s) * 0.5 + fbmT(x, y, 2, s) * 0.5,
      x,
      y,
      s,
    );
  },
  la_branca: laDe('#e9e6e0'),
  la_vermelha: laDe('#b8322e'),
  la_laranja: laDe('#e07a24'),
  la_amarela: laDe('#e8c62e'),
  la_verde: laDe('#5a9a2e'),
  la_azul: laDe('#2e56b8'),
  la_roxa: laDe('#7a3aaa'),
  la_preta: laDe('#26242a'),
  frutinhas: (x, y, s) => {
    const folha = folhasDe(['#2d6624', '#37762b', '#428633'], 0.35)(x, y, s);
    if (folha[3] === 0) return VAZIO;
    if (y < 4 || x < 1 || x > 14) return VAZIO;
    if (hash2(x >> 1, y >> 1, s + 4) > 0.82 && (x + y) % 2 === 0)
      return rampa(['#c2183a', '#e02a4e'], hash2(x, y, s), x, y, s);
    return folha;
  },
  folhas_outono: folhasDe(['#9a3a14', '#b54a18', '#cf621e', '#e07a24', '#e89a34'], 0.16),
  cama_topo: (x, y, s) => {
    if (y < 5) return rampa(['#efece6', '#f6f4ef'], hash2(x, y, s), x, y, s);
    return rampa(
      ['#a8302c', '#b83a34', '#c4443c'],
      hash2(x, y, s) * 0.5 + ((x + y) % 4 === 0 ? 0.5 : 0),
      x,
      y,
      s,
    );
  },
  cama_lado: (x, y, s) => {
    if (y < 6) return rampa(['#a8302c', '#b83a34'], hash2(x, y, s), x, y, s);
    if (y < 9) return rampa(['#efece6'], 0, x, y, s);
    return tabuasCarvalho(x, y, s);
  },
  // porta inteira: janela com caixilho em cruz em cima, almofadas e maçaneta embaixo
  ...metadesDaPorta((x, yy, s) => {
    const janela = x >= 3 && x <= 12 && yy >= 3 && yy <= 11 && x !== 7 && x !== 8 && yy !== 7;
    if (janela) return VAZIO;
    if (x === 12 && (yy === 18 || yy === 19)) return rampa(['#d8c070'], 0, x, yy, s);
    const p = TABUAS_PORTA(yy & (T - 1), x, s);
    if (bordaDaPorta(x, yy)) return escurece(p, 0.75);
    const almofada = yy >= 21 && yy <= 28 && ((x >= 3 && x <= 6) || (x >= 9 && x <= 12));
    if (!almofada) return p;
    const aro = yy === 21 || yy === 28 || x === 3 || x === 6 || x === 9 || x === 12;
    return escurece(p, aro ? 0.7 : 0.88);
  }),
  tabuas_betula: tabuasDe(['#cdb48a', '#d6bd92', '#dec69b', '#e5cea3']),
  tabuas_pinho: tabuasDe(['#6b4a2c', '#765232', '#815a38', '#8b623e']),
  abobora_lado: (x, y, s) => {
    const gomo = x % 4 === 0;
    return rampa(
      gomo ? ['#b8601a', '#c26a1e'] : ['#d87a22', '#e48828', '#ec9630'],
      hash2(x, y, s) * 0.6 + ruidoT(x, y, 4, 1, s) * 0.4,
      x,
      y,
      s,
    );
  },
  abobora_topo: (x, y, s) => {
    if (Math.abs(x - 7.5) < 1.5 && Math.abs(y - 7.5) < 1.5)
      return rampa(['#5a6b28', '#6b7d30'], hash2(x, y, s), x, y, s);
    return rampa(
      ['#d87a22', '#e48828', '#ec9630'],
      hash2(x, y, s) * 0.5 + (Math.hypot(x - 7.5, y - 7.5) / 12) * 0.5,
      x,
      y,
      s,
    );
  },
  abobora_rosto: (x, y, s) => {
    const olho = y >= 4 && y <= 6 && ((x >= 3 && x <= 5) || (x >= 10 && x <= 12));
    const boca =
      y >= 9 &&
      y <= 11 &&
      x >= 3 &&
      x <= 12 &&
      !(y === 9 && (x === 5 || x === 9)) &&
      !(y === 11 && (x === 7 || x === 11));
    if (olho || boca) return rampa(['#ffd060', '#ffe08a'], hash2(x, y, s), x, y, s);
    return PINTORES.abobora_lado(x, y, s);
  },
  // spec 013: plantio
  terra_arada: terraAradaDe(pintorTerra()),
  trigo: trigoDe(['#4f8a2c', '#5e9c36', '#6eae40'], ['#c8922a', '#dcab3c', '#f0c858'], '#f6dc8a'),
  milho: milhoDe(
    ['#3d8a2e', '#4a9c38', '#5aae44', '#6cbe50'],
    ['#e8a818', '#f6c430', '#ffdc58'],
    '#efe0a0',
  ),
  aboboreira: aboboreiraDe(
    ['#3d7a2c', '#4a8c34', '#5a9e3e', '#6ab04a'],
    ['#c8601a', '#dc7422', '#ec8c2c', '#f6a03a'],
  ),
  feno_lado: fenoLadoDe(['#c49a38', '#d2aa44', '#dfba54', '#eaca66'], '#6e4220'),
  feno_topo: fenoTopoDe(['#c9a03c', '#d8b04a', '#e4c05c', '#eed070'], '#6e4220'),
  // spec 014: a Cidade Grande (só aparecem no tema da cidade; este é o desenho de verdade)
  ...pintoresDaCidade(),
  // spec 026: a Vila Neon (só aparecem no tema do bairro; este é o desenho de verdade)
  ...pintoresDaVila(),
};

/** Tiles da Cidade Grande (spec 014), no jeito do atlas: tons de rampa e o tremor de pixel. */
function pintoresDaCidade(): Record<string, Pintor> {
  const asfalto: Pintor = (x, y, s) => {
    const t = hash2(x, y, s) * 0.55 + fbmT(x, y, 4, s) * 0.45;
    if (hash2(x, y, s + 3) > 0.95) return rampa(['#55575e'], 0, x, y, s);
    return rampa(['#35373d', '#3b3d43', '#414349', '#46484e'], t, x, y, s);
  };
  const cor = (c: string) => (x: number, y: number, s: number) => rampa([c], 0, x, y, s);
  /** Placa de brinquedo: tábua clara com moldura azul; `desenho` pinta o miolo (ou null). */
  const placa =
    (desenho: (x: number, y: number) => string | null): Pintor =>
    (x, y, s) => {
      if (x <= 0 || y <= 0 || x >= T - 1 || y >= T - 1) return cor('#24508a')(x, y, s);
      if (x === 1 || y === 1 || x === T - 2 || y === T - 2) return cor('#2f6fb0')(x, y, s);
      const d = desenho(x, y);
      return d ? cor(d)(x, y, s) : rampa(['#f3ecd8', '#f7f1e2'], hash2(x, y, s), x, y, s);
    };
  const molduraJanela = (x: number, y: number) =>
    x <= 1 || y <= 1 || x >= T - 2 || y >= T - 2 || x === 7 || x === 8 || y === 7 || y === 8;
  const listras =
    (a: string, b: string): Pintor =>
    (x, y, s) =>
      (x >> 2) % 2 === 0
        ? rampa([a], hash2(x, y, s), x, y, s)
        : rampa([b], hash2(x, y, s), x, y, s);
  return {
    asfalto,
    // traço amarelo na borda +x (a malha gira o topo nas ruas que correm em x)
    faixa_rua: (x, y, s) =>
      x >= T - 3 ? rampa(['#f0bf2c', '#f4c93c'], hash2(x, y, s), x, y, s) : asfalto(x, y, s),
    // zebra: listras de 4 no sentido dos carros
    faixa_pedestre: (x, y, s) =>
      (x >> 2) % 2 === 0
        ? rampa(['#eeece6', '#f4f2ec'], hash2(x, y, s), x, y, s)
        : asfalto(x, y, s),
    // calçada de placas quadradas (duas por duas) com rejunte
    calcada: (x, y, s) => {
      if (x % 8 === 7 || y % 8 === 7) return cor('#a8a397')(x, y, s);
      const tom = 0.95 + hash2(x >> 3, y >> 3, s) * 0.08;
      return escurece(rampa(['#d3cfc4', '#d9d5ca', '#dfdbd0'], hash2(x, y, s), x, y, s), tom);
    },
    // lado da calçada: o meio-fio (a borda clara em cima, o concreto embaixo)
    calcada_lado: (x, y, s) =>
      y <= 3
        ? rampa(['#d9d5ca', '#dfdbd0'], hash2(x, y, s), x, y, s)
        : rampa(['#9d9a92', '#a6a39b', '#aeaba3'], fbmT(x, y, 2, s), x, y, s),
    concreto: (x, y, s) => {
      if (y === T - 1 || x === T - 1) return cor('#9a9b98')(x, y, s);
      return rampa(
        ['#adaeab', '#b3b4b1', '#babbb8'],
        hash2(x, y, s) * 0.4 + fbmT(x, y, 2, s) * 0.6,
        x,
        y,
        s,
      );
    },
    pedra_marrom: tijolosDe(['#7a4632', '#834d37', '#8b543c'], '#5a3424', 8, 16),
    pedra_creme: tijolosDe(['#e1d0ad', '#e7d8b8', '#ecdfc2'], '#c7b18a', 8, 16),
    // friso dourado do art déco: chevron entre dois filetes escuros
    friso_dourado: (x, y, s) => {
      if (y === 0 || y === T - 1) return cor('#8f6a1e')(x, y, s);
      return (Math.abs(x - 7.5) + y) % 6 < 2
        ? rampa(['#b8892c'], 0, x, y, s)
        : rampa(['#d8a843', '#e0b24c'], hash2(x, y, s), x, y, s);
    },
    // janela grande: moldura creme em cruz e o vidro azul-claro com dois reflexos (como no
    // esboço aprovado: não se vê através, mas a luz do dia entra)
    janela: (x, y, s) => {
      if (molduraJanela(x, y)) return rampa(['#ece2cc', '#f1e8d4'], hash2(x, y, s), x, y, s);
      const d = (x % 8) + (y % 8);
      if (d === 5 || d === 6) return rampa(['#e4f4fb'], 0, x, y, s);
      return rampa(['#8fc3e0', '#9dcce6', '#acd6ec'], ((x % 8) + (y % 8)) / 14, x, y, s);
    },
    // janela acesa: a mesma moldura e a luz morna de dentro, com cortina dos lados
    janela_acesa: (x, y, s) => {
      if (molduraJanela(x, y)) return rampa(['#e0d3b6', '#e6dabf'], hash2(x, y, s), x, y, s);
      const lx = x % 8;
      if (lx === 2 || lx === 6) return rampa(['#e08c3c', '#e89a48'], hash2(x, y, s), x, y, s);
      const d = Math.hypot((x % 8) - 4, (y % 8) - 4) / 3;
      return rampa(['#ffe9a6', '#ffdd84', '#ffcf62'], d + hash2(x, y, s) * 0.2, x, y, s);
    },
    // grade de ferro (haste, parapeito, corrimão): ferro escuro com brilho de tinta
    grade: (x, y, s) =>
      x % 5 === 1
        ? rampa(['#4b505a'], 0, x, y, s)
        : rampa(['#2a2d33', '#30333a', '#363a41'], hash2(x, y, s), x, y, s),
    // laje de grade (patamar da escada de incêndio): barras em grade com vão escuro
    laje_grade: (x, y, s) =>
      x % 4 === 0 || y % 4 === 0
        ? rampa(['#6a707c', '#727885'], hash2(x, y, s), x, y, s)
        : rampa(['#30333a', '#363940'], hash2(x, y, s), x, y, s),
    // poste: o globo creme em cima da haste de ferro (a cor do globo é o brilho da peça)
    poste: (x, y, s) =>
      Math.hypot(x - 7.5, y - 5) < 4.2
        ? rampa(['#fff1c4', '#fff6d8'], hash2(x, y, s), x, y, s)
        : rampa(['#2a2d33', '#33363d'], hash2(x, y, s), x, y, s),
    placa_lado: (x, y, s) => escurece(tabuasCarvalho(x, y, s), 0.85),
    // placas: só desenho, nenhuma letra (a de rua, a da padaria, a da oficina...)
    placa: placa((x, y) => {
      // casinha (a placa de quem põe à mão)
      if (y >= 8 && y <= 12 && x >= 5 && x <= 10) return x === 7 && y >= 10 ? '#7a5432' : '#c8603e';
      if (y >= 4 && y < 8 && Math.abs(x - 7.5) <= y - 3.5) return '#3b3f46';
      return null;
    }),
    placa_pao: placa((x, y) => {
      const d = ((x - 7.5) / 5) ** 2 + ((y - 8.5) / 3.2) ** 2;
      if (d > 1) return null;
      if (d < 0.9 && (x === 5 || x === 8 || x === 11) && y <= 8) return '#e9b46a';
      return d > 0.7 ? '#a8692c' : '#c98a3e';
    }),
    placa_chave: placa((x, y) => {
      // chave inglesa na diagonal
      const u = (x - y) / Math.SQRT2;
      const v = (x + y - 15) / Math.SQRT2;
      if (Math.abs(u) <= 0.9 && Math.abs(v) <= 4.5) return '#8d9098';
      if (Math.hypot(x - 11, y - 4) < 2.6 && !(x >= 11 && y <= 4)) return '#a4a7ae';
      if (Math.hypot(x - 4, y - 11) < 2.6 && !(x <= 4 && y >= 11)) return '#a4a7ae';
      return null;
    }),
    placa_tijolo: placa((x, y) => {
      if (x < 3 || x > 12 || y < 5 || y > 11) return null;
      if (y === 8 || (y < 8 ? x === 7 : x === 5 || x === 10)) return '#e8dcc8';
      return '#c2533a';
    }),
    placa_sorvete: placa((x, y) => {
      if (y >= 8 && y <= 13 && Math.abs(x - 7.5) <= (13.5 - y) * 0.55)
        return (x + y) % 3 === 0 ? '#b77a3a' : '#d9a35a';
      if (Math.hypot(x - 7.5, y - 6) < 3.4) return y < 5 ? '#f7b6cf' : '#f08cb4';
      return null;
    }),
    toldo_vermelho: listras('#d8433a', '#f5f1e6'),
    toldo_verde: listras('#3f8f5a', '#f5f1e6'),
    // tapume do canteiro: listras laranja e branca na diagonal
    tapume: (x, y, s) =>
      ((x + y) >> 2) % 2 === 0
        ? rampa(['#e8742a', '#ee8236'], hash2(x, y, s), x, y, s)
        : rampa(['#f4f1ea', '#f8f6f0'], hash2(x, y, s), x, y, s),
  };
}

/**
 * Desenho em letras (16 linhas de 16): cada letra é uma cor da paleta, '.' é o fundo. Para os
 * desenhos pequenos que não saem bem de conta (o raio do letreiro, os pôsteres).
 */
function desenhoDe(linhas: readonly string[]): (x: number, y: number) => string {
  return (x, y) => linhas[y]?.[x] ?? '.';
}

/** O raio da logo do Festival Trovão, em tubo de neon: miolo amarelo, contorno vermelho. */
const RAIO_NEON = desenhoDe([
  '................',
  '........kkkkk...',
  '.......kYYYYk...',
  '......kYYYYk....',
  '.....kYYYYk.....',
  '....kYYYYkkkk...',
  '...kYYYYYYYYk...',
  '...kkkkYYYYk....',
  '......kYYYk.....',
  '.....kYYYk......',
  '....kYYYk.......',
  '...kYYk.........',
  '...kYk..........',
  '...kk...........',
  '................',
  '................',
]);

/**
 * Pôsteres inventados (spec 026): o raio no vermelho, a estrela no azul e a guitarra-raio no
 * amarelo, com a borda branca. Nenhuma letra, nenhuma banda de verdade.
 */
const POSTERES = desenhoDe([
  '................',
  '.wwwwww.........',
  '.wrrrrw..wwwwww.',
  '.wrryrw..wbbbbw.',
  '.wryyrw..wbybbw.',
  '.wryyyw..wyyyyw.',
  '.wrryrw..wbyybw.',
  '.wryrrw..wybbyw.',
  '.wwwwww..wwwwww.',
  '................',
  '..wwwwwwwwwwww..',
  '..wyyyyyyyyyyw..',
  '..wyrrryyyyyyw..',
  '..wyrrrkkkkkkw..',
  '..wyrrryyyyyyw..',
  '..wwwwwwwwwwww..',
]);

/** Tiles da Vila Neon (spec 026), no jeito do atlas: tons de rampa e o tremor de pixel. */
function pintoresDaVila(): Record<string, Pintor> {
  const cor = (c: string) => (x: number, y: number, s: number) => rampa([c], 0, x, y, s);
  const GRAFITE = ['#34333d', '#3a3944', '#403f4a'];
  const CROMO = ['#aeb3be', '#c2c7d2', '#d4d8e2', '#e6e9f0'];
  /** Reboco pastel: liso, com as marcas largas da desempenadeira. */
  const reboco =
    (cores: string[]): Pintor =>
    (x, y, s) => {
      const f = fbmT(x, y, 2, s);
      const arco = Math.sin((x + y * 0.55) * 0.8 + f * 5);
      const t = f * 0.5 + hash2(x, y, s) * 0.2 + (arco > 0.82 ? 0.3 : 0);
      return rampa(cores, t, x, y, s);
    };
  return {
    // piso de palco: tábuas grafite, juntas desencontradas e as marcas de fita no chão
    piso_palco: (x, y, s) => {
      const fila = y >> 2;
      if ((y & 3) === 3 || x === (fila * 5 + 3) % T) return cor('#25242c')(x, y, s);
      if (y === 6 && x >= 2 && x <= 6) return cor('#ffe14a')(x, y, s);
      if ((x === 11 || x === 13) && (y === 9 || y === 11)) return cor('#f2f0ea')(x, y, s);
      if (x === 12 && y === 10) return cor('#f2f0ea')(x, y, s);
      return rampa(GRAFITE, hash2(x >> 2, fila, s) * 0.5 + hash2(x, y, s) * 0.5, x, y, s);
    },
    // caixa de som: caixa grafite, o cone grande na frente e os cantos de cromo
    caixa_som: (x, y, s) => {
      const canto = (x <= 1 || x >= T - 2) && (y <= 1 || y >= T - 2);
      if (canto) return rampa(CROMO, (x + y) / 30, x, y, s);
      if (x === 0 || y === 0 || x === T - 1 || y === T - 1) return cor('#1f1e25')(x, y, s);
      const d = Math.hypot(x - 7.5, y - 7.5);
      if (d < 1.6) return rampa(['#7a7984', '#8a8994'], hash2(x, y, s), x, y, s);
      if (d < 5.2) {
        // o cone: mais claro de um lado, como a luz batendo
        const t = 0.3 + (x - y) / 24 + (d / 5.2) * 0.2;
        return rampa(['#3e3d48', '#484752', '#53525d', '#5e5d68'], t, x, y, s);
      }
      if (d < 6.3) return cor('#18171d')(x, y, s);
      return rampa(GRAFITE, hash2(x, y, s), x, y, s);
    },
    // treliça cromada: o quadro e a diagonal de tubo, o resto vazado
    trelica: (x, y, s) => {
      const quadro = x <= 1 || y <= 1 || x >= T - 2 || y >= T - 2;
      const diagonal = Math.abs(x - y) <= 1;
      if (!quadro && !diagonal) return VAZIO;
      // brilho do tubo: a beira de cima/esquerda mais clara
      const t = quadro
        ? x === 0 || y === 0 || x === T - 2 || y === T - 2
          ? 0.8
          : 0.35
        : x > y
          ? 0.3
          : 0.75;
      return rampa(CROMO, t + hash2(x, y, s) * 0.2, x, y, s);
    },
    // pista quadriculada: rosa e grafite em quadrados de 8, com o rejunte escuro
    pista_neon: (x, y, s) => {
      if ((x & 7) === 7 || (y & 7) === 7) return cor('#24232b')(x, y, s);
      return ((x >> 3) + (y >> 3)) % 2 === 0
        ? rampa(['#ff5fa8', '#ff6fb4', '#ff80be'], hash2(x, y, s), x, y, s)
        : rampa(GRAFITE, hash2(x, y, s), x, y, s);
    },
    // letreiro de neon: o raio em tubo de neon numa placa escura com a moldura de cromo
    letreiro_neon: (x, y, s) => {
      if (x === 0 || y === 0 || x === T - 1 || y === T - 1) return rampa(CROMO, 0.4, x, y, s);
      const c = RAIO_NEON(x, y);
      if (c === 'Y') return rampa(['#ffe14a', '#fff07a'], hash2(x, y, s), x, y, s);
      if (c === 'k') return rampa(['#e8302a', '#f04a3a'], hash2(x, y, s), x, y, s);
      return rampa(['#1e1d25', '#24232b', '#2a2932'], hash2(x, y, s), x, y, s);
    },
    // parede de pôster: a parede grafite com três pôsteres colados
    parede_poster: (x, y, s) => {
      const c = POSTERES(x, y);
      const cores: Record<string, string> = {
        w: '#f4f1ea',
        r: '#e8302a',
        y: '#ffe14a',
        b: '#2f8cff',
        k: '#2e2d36',
      };
      if (c !== '.') return rampa([cores[c]], 0, x, y, s);
      return rampa(['#4a4954', '#504f5a', '#565560'], fbmT(x, y, 4, s), x, y, s);
    },
    reboco_rosa: reboco(['#eeaabd', '#f2b4c6', '#f5bfcd', '#f8c9d6']),
    reboco_azul: reboco(['#9ec0e8', '#a8c8ec', '#b2d0f0', '#bcd8f4']),
    reboco_amarelo: reboco(['#f2d878', '#f5df88', '#f8e698', '#faeca6']),
    reboco_menta: reboco(['#9cd8ba', '#a8e0c4', '#b2e6cc', '#bcecd4']),
    // telha colonial: fileiras de canudos de barro, a sombra de uma fileira sobre a outra
    telha_colonial: (x, y, s) => {
      const fila = y >> 2;
      const ly = y & 3;
      const cx = (x + (fila & 1) * 2) & 3;
      if (ly === 3) return cor('#8a3a1c')(x, y, s);
      const t = cx === 0 ? 0.05 : cx === 3 ? 0.35 : 0.7 + hash2(x, y, s) * 0.3;
      return rampa(['#b8542a', '#c8622e', '#d67238', '#e08444'], t - ly * 0.08, x, y, s);
    },
    // grade da plateia: aço galvanizado com as barras em pé
    grade_plateia: (x, y, s) =>
      x % 4 === 1
        ? rampa(['#d8dce4', '#e2e6ee'], hash2(x, y, s), x, y, s)
        : rampa(['#8e949e', '#9aa0aa', '#a6acb6'], hash2(x, y, s), x, y, s),
    // faixa de neon: a faixa grafite da fachada com um tubo turquesa e um rosa
    faixa_neon: (x, y, s) => {
      if (y === 0 || y === T - 1) return rampa(CROMO, 0.5, x, y, s);
      if (x >= 1 && x <= T - 2) {
        if (y === 4 || y === 5) return rampa(['#2ee0d0', '#5af0e2'], y === 4 ? 0.7 : 0.2, x, y, s);
        if (y === 10 || y === 11)
          return rampa(['#ff5fa8', '#ff8cc4'], y === 10 ? 0.7 : 0.2, x, y, s);
      }
      if ((x === 3 || x === 12) && (y === 6 || y === 9)) return cor('#9aa0aa')(x, y, s);
      return rampa(['#2a2932', '#2e2d36', '#33323c'], hash2(x, y, s), x, y, s);
    },
    // alambrado: a tela de arame em losangos (vazada) e o arame galvanizado
    alambrado: (x, y, s) => {
      const arame = (x + y) % 4 === 0 || (x - y + 16) % 4 === 0;
      if (!arame) return VAZIO;
      return rampa(['#8c929c', '#a2a8b2', '#b8bec8'], hash2(x, y, s), x, y, s);
    },
  };
}

// ---------- spec 013: lavoura e feno (fábricas que os temas reaproveitam com as cores deles) ----------

/**
 * Terra arada de brinquedo: a terra do tema com 4 leiras (crista clara, sulco escuro), que
 * se reconhecem de longe. `sulco` e `crista` dizem o quanto escurece e clareia.
 */
export function terraAradaDe(base: Pintor, sulco = 0.45, crista = 0.24): Pintor {
  return (x, y, s) => {
    const p = base(x, y, s);
    const f = y % 4;
    if (f === 3) return escurece(p, sulco);
    if (f === 2) return escurece(p, 0.75);
    if (f === 0)
      return [
        p[0] + (255 - p[0]) * crista,
        p[1] + (255 - p[1]) * crista,
        p[2] + (255 - p[2]) * crista,
        p[3],
      ];
    return p;
  };
}

/**
 * Trigo (a cor das peças de brinquedo e o desenho em cruz de reserva): quatro hastes verdes
 * com espigas grandes e granuladas no alto e uma folhinha em cada.
 */
export function trigoDe(caule: string[], espiga: string[], barba?: string): Pintor {
  const HASTES: Array<[number, number]> = [
    [2, 3],
    [6, 1],
    [10, 4],
    [13, 2],
  ];
  return (x, y, s) => {
    for (const [hx, topo] of HASTES) {
      const fim = topo + 6;
      if (y >= topo && y < fim && (x === hx || x === hx + 1)) {
        const grao = (y - topo + x - hx) % 2 === 0;
        return rampa(espiga, grao ? 0.85 : 0.35, x, y, s);
      }
      if (barba && y === topo - 1 && x === hx + ((topo + hx) % 2))
        return rampa([barba], 0, x, y, s);
      if (y >= fim && x === hx) return rampa(caule, 0.2 + (y - fim) / 12, x, y, s);
      // folhinha saindo da haste, para o lado de fora
      const lado = hx < 8 ? -1 : 1;
      if (y === fim + 3 && x === hx + lado) return rampa(caule, 0.8, x, y, s);
      if (y === fim + 2 && x === hx + 2 * lado) return rampa(caule, 0.9, x, y, s);
    }
    return VAZIO;
  };
}

/** Milho: um pé alto com folhas compridas, o pendão no alto e uma espiga amarela de lado. */
export function milhoDe(folha: string[], espiga: string[], palha: string): Pintor {
  return (x, y, s) => {
    // espiga: grãos em xadrez, com a palha verde em volta embaixo
    if (x >= 9 && x <= 11 && y >= 5 && y <= 10) {
      if (y === 10 || (y >= 9 && x === 11)) return rampa(folha, 0.7, x, y, s);
      return rampa(espiga, (x + y) % 2 === 0 ? 0.85 : 0.4, x, y, s);
    }
    // pendão
    if (
      y <= 2 &&
      (x === 7 || (y === 1 && (x === 6 || x === 8)) || (y === 0 && (x === 5 || x === 9)))
    )
      return rampa([palha], 0, x, y, s);
    // caule
    if ((x === 7 || x === 8) && y >= 2) return rampa(folha, 0.25 + y / 30, x, y, s);
    // folhas compridas em diagonal, caindo para fora
    const dx = x < 7 ? 7 - x : x - 8;
    for (const [y0, lado] of [
      [4, -1],
      [7, 1],
      [9, -1],
      [12, 1],
    ] as const) {
      if ((lado < 0 ? x < 7 : x > 8) && dx <= 6 && y === y0 + Math.floor(dx / 2) - (dx > 4 ? 0 : 0))
        if (!(lado > 0 && x >= 9 && x <= 11 && y >= 5 && y <= 10))
          return rampa(folha, 0.55 + dx / 14, x, y, s);
    }
    return VAZIO;
  };
}

/** Aboboreira: duas folhas redondas na rama e uma abóbora gorda com gomos embaixo. */
export function aboboreiraDe(folha: string[], fruto: string[], cabo = '#6b7d30'): Pintor {
  return (x, y, s) => {
    // abóbora: elipse embaixo, com gomos mais escuros
    const ax = (x - 8) / 5.6;
    const ay = (y - 12.2) / 3.4;
    if (ax * ax + ay * ay <= 1) {
      const gomo = Math.abs(x - 8) === 2 || Math.abs(x - 8) === 5;
      return rampa(fruto, gomo ? 0.1 : 0.5 + (1 - (y - 9) / 7) * 0.5, x, y, s);
    }
    if ((x === 8 || x === 9) && y === 8) return rampa([cabo], 0, x, y, s);
    // folhas redondas, com a nervura mais escura
    for (const [fx, fy, r] of [
      [4, 5, 3.4],
      [11.5, 4, 3.2],
    ] as const) {
      const d = Math.hypot(x - fx, y - fy);
      if (d <= r) {
        const nervura = x === Math.round(fx) || y === Math.round(fy);
        return rampa(folha, nervura ? 0.1 : 0.45 + (1 - d / r) * 0.5, x, y, s);
      }
    }
    // rama ligando as folhas à abóbora
    if (y === 8 && x >= 4 && x <= 12) return rampa(folha, 0.2, x, y, s);
    return VAZIO;
  };
}

/** Lado do fardo de feno: palha em fiapos deitados e duas cordas em pé. */
export function fenoLadoDe(palha: string[], corda: string): Pintor {
  return (x, y, s) => {
    if (x === 3 || x === 4 || x === 11 || x === 12) return rampa([corda], 0, x, y, s);
    if (y === 0 || y === T - 1) return escurece(rampa(palha, 0.4, x, y, s), 0.82);
    // fiapos: cada linha tem trechos de tom diferente, compridos na horizontal
    const t = hash2(Math.floor((x + hash2(0, y, s) * 8) / 4), y, s + 7);
    return rampa(palha, t, x, y, s);
  };
}

/** Topo do fardo: as pontas da palha (pintinhas) e as mesmas duas cordas. */
export function fenoTopoDe(palha: string[], corda: string): Pintor {
  return (x, y, s) => {
    if (x === 3 || x === 4 || x === 11 || x === 12) return rampa([corda], 0, x, y, s);
    const h = hash2(x, y, s + 3);
    if (h > 0.8) return escurece(rampa(palha, 0.3, x, y, s), 0.72);
    return rampa(palha, fbmT(x, y, 4, s) * 0.5 + h * 0.5, x, y, s);
  };
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

/**
 * Cores limpas de brinquedo (spec 012): o chuvisco de pixels some e ficam os desenhos que
 * dão identidade ao bloco (o verde em cima da terra, as listras da tábua, os pontinhos do
 * minério). Cada pixel se aproxima da média da vizinhança, a não ser que destoe muito dela.
 */
export function deBrinquedo(tile: Float32Array, raio = 2, tapar = false): Float32Array {
  const n = TAM_TILE;
  if (tapar) tile = taparFuros(tile);
  const saida = new Float32Array(tile.length);
  const lum = (i: number) => tile[i] * 0.3 + tile[i + 1] * 0.59 + tile[i + 2] * 0.11;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4;
      saida[i + 3] = tile[i + 3];
      if (tile[i + 3] < 128) {
        saida[i] = tile[i];
        saida[i + 1] = tile[i + 1];
        saida[i + 2] = tile[i + 2];
        continue;
      }
      let r = 0;
      let g = 0;
      let b = 0;
      let c = 0;
      for (let dy = -raio; dy <= raio; dy++) {
        for (let dx = -raio; dx <= raio; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue;
          const j = (yy * n + xx) * 4;
          if (tile[j + 3] < 128) continue;
          r += tile[j];
          g += tile[j + 1];
          b += tile[j + 2];
          c++;
        }
      }
      r /= c;
      g /= c;
      b /= c;
      const d = Math.abs(lum(i) - (r * 0.3 + g * 0.59 + b * 0.11)) / 255;
      const t = Math.min(1, Math.max(0, (d - 0.1) / 0.14));
      const k = 0.12 + 0.88 * t * t * (3 - 2 * t);
      // e um pouco mais claro: plástico colorido, não terra molhada
      saida[i] = (r + (tile[i] - r) * k) * 0.86 + 26;
      saida[i + 1] = (g + (tile[i + 1] - g) * k) * 0.86 + 26;
      saida[i + 2] = (b + (tile[i + 2] - b) * k) * 0.86 + 26;
    }
  }
  return saida;
}

/** Copa de brinquedo: os furos das folhas viram folha (média das vizinhas opacas). */
function taparFuros(tile: Float32Array): Float32Array {
  const n = TAM_TILE;
  const t = tile.slice();
  const opacos: number[] = [];
  for (let i = 0; i < n * n; i++) if (tile[i * 4 + 3] >= 128) opacos.push(i);
  if (opacos.length === 0) return t;
  for (let i = 0; i < n * n; i++) {
    if (tile[i * 4 + 3] >= 128) continue;
    const x = i % n;
    const y = Math.floor(i / n);
    let r = 0;
    let g = 0;
    let b = 0;
    let c = 0;
    for (let raio = 1; c === 0 && raio < n; raio++)
      for (let dy = -raio; dy <= raio; dy++)
        for (let dx = -raio; dx <= raio; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue;
          const j = (yy * n + xx) * 4;
          if (tile[j + 3] < 128) continue;
          r += tile[j];
          g += tile[j + 1];
          b += tile[j + 2];
          c++;
        }
    t.set([r / c, g / c, b / c, 255], i * 4);
  }
  return t;
}

/** Cor de destaque de um tile: média dos 20% de pixels que mais se afastam dos tons verdes. */
function destaqueDoTile(pixels: Uint8ClampedArray, indice: number): [number, number, number] {
  const { ox, oy } = celulaDe(indice);
  const px: number[][] = [];
  for (let y = 0; y < TAM_TILE; y++)
    for (let x = 0; x < TAM_TILE; x++) {
      const i = ((oy + PADDING + y) * LARGURA_ATLAS + ox + PADDING + x) * 4;
      if (pixels[i + 3] >= 128) px.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
    }
  if (!px.length) return [255, 255, 255];
  const verdes = px.filter((p) => p[1] >= p[0] && p[1] >= p[2]);
  const base = (verdes.length ? verdes : px).reduce(
    (s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]],
    [0, 0, 0],
  );
  const n = verdes.length || px.length;
  const f = [base[0] / n, base[1] / n, base[2] / n];
  const d = (p: number[]) => Math.hypot(p[0] - f[0], p[1] - f[1], p[2] - f[2]);
  const longe = [...px]
    .sort((a, b) => d(b) - d(a))
    .slice(0, Math.max(1, Math.ceil(px.length * 0.2)));
  const m = longe.reduce((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]);
  return [m[0] / longe.length, m[1] / longe.length, m[2] / longe.length].map(Math.round) as [
    number,
    number,
    number,
  ];
}

function limita(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

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

function sementeDoNome(nome: string): number {
  let h = 7;
  for (const c of nome) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0;
  return Math.abs(h) % 100000;
}

/** `brinquedo: false` desliga as cores limpas de brinquedo (a pintura crua de cada tile). */
export function gerarAtlas(semente = 1337, opcoes: { brinquedo?: boolean } = {}): Atlas {
  const brinquedo = opcoes.brinquedo ?? true;
  const pixels = new Uint8ClampedArray(LARGURA_ATLAS * ALTURA_ATLAS * 4);
  const tiles: TileAtlas[] = [];
  NOMES_TILES.forEach((nome, indice) => {
    // o tema pode repintar qualquer tile; o que ele não repinta usa o pintor base
    const pinta =
      nome === TILE_BRANCO || nome.startsWith('brilho_')
        ? (): Px => [255, 255, 255, 255]
        : (tema().pintores[nome] ?? PINTORES[nome]);
    if (!pinta) throw new Error(`tile sem pintor: ${nome}`);
    const { ox, oy } = celulaDe(indice);
    const s = semente + sementeDoNome(nome) * 977;
    const tile = new Float32Array(TAM_TILE * TAM_TILE * 4);
    for (let y = 0; y < TAM_TILE; y++)
      for (let x = 0; x < TAM_TILE; x++) tile.set(pinta(x, y, s), (y * TAM_TILE + x) * 4);
    const ehFolha = REGISTRO_BLOCOS.some(
      (b) => b.folhas && (b.tiles.lado === nome || b.tiles.topo === nome || b.tiles.base === nome),
    );
    const limpo =
      brinquedo && nome !== TILE_BRANCO && !nome.startsWith('brilho_')
        ? deBrinquedo(tile, 2, ehFolha)
        : tile;
    for (let py = 0; py < CELULA; py++) {
      for (let px = 0; px < CELULA; px++) {
        const x = Math.min(TAM_TILE - 1, Math.max(0, px - PADDING));
        const y = Math.min(TAM_TILE - 1, Math.max(0, py - PADDING));
        const j = (y * TAM_TILE + x) * 4;
        const i = ((oy + py) * LARGURA_ATLAS + ox + px) * 4;
        pixels[i] = limita(limpo[j]);
        pixels[i + 1] = limita(limpo[j + 1]);
        pixels[i + 2] = limita(limpo[j + 2]);
        pixels[i + 3] = limita(limpo[j + 3]);
      }
    }
    const dono = REGISTRO_BLOCOS.find((b) => b.tiles.lado === nome);
    tiles.push({
      bloco: dono?.id ?? -1,
      nome,
      indice,
      uv: uvDaCelula(indice),
      emissivo: tema().emissivos.includes(nome) || nome.startsWith('brilho_'),
    });
  });
  // tiles de brilho: a cor de destaque da planta (o que mais se afasta do verde no tile dela)
  for (const [bloco, nome] of Object.entries(TILES_BRILHO)) {
    const def = REGISTRO_BLOCOS[Number(bloco)];
    const fonte = def ? indiceDoTile(def.tiles.lado) : -1;
    const alvo = indiceDoTile(nome);
    if (fonte < 0 || alvo < 0) continue;
    const cor = destaqueDoTile(pixels, fonte);
    const { ox, oy } = celulaDe(alvo);
    for (let py = 0; py < CELULA; py++)
      for (let px = 0; px < CELULA; px++) {
        const i = ((oy + py) * LARGURA_ATLAS + ox + px) * 4;
        pixels[i] = cor[0];
        pixels[i + 1] = cor[1];
        pixels[i + 2] = cor[2];
        pixels[i + 3] = 255;
      }
  }
  const uvDoTile = (nome: string) => {
    const i = indiceDoTile(nome);
    return i >= 0 ? uvDaCelula(i) : undefined;
  };
  return {
    largura: LARGURA_ATLAS,
    altura: ALTURA_ATLAS,
    pixels,
    tiles,
    uvDoTile,
    uvDoBloco: (bloco) => {
      const b = REGISTRO_BLOCOS[bloco];
      return b && b.tiles.lado !== 'vazio' ? uvDoTile(b.tiles.lado) : undefined;
    },
    uvDaFace: (bloco, face) => {
      const b = REGISTRO_BLOCOS[bloco];
      if (!b || b.tiles.lado === 'vazio') return undefined;
      const nome = face === 'frente' ? (b.tiles.frente ?? b.tiles.lado) : b.tiles[face];
      return uvDoTile(nome);
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
