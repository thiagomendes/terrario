import { describe, expect, it } from 'vitest';
import {
  gerarAtlas,
  CELULA,
  COLUNAS,
  LINHAS,
  PADDING,
  TAM_TILE,
  LARGURA_ATLAS,
} from '../../src/art/atlas';
import { NOMES_TILES } from '../../src/art/tiles';
import { REGISTRO_BLOCOS } from '../../src/world/blocks';
import { Bloco } from '../../src/world/blocks';

const atlas = gerarAtlas(1);

function px(x: number, y: number): number[] {
  const i = (y * atlas.largura + x) * 4;
  return Array.from(atlas.pixels.slice(i, i + 4));
}

function origem(indice: number): [number, number] {
  return [(indice % COLUNAS) * CELULA + PADDING, Math.floor(indice / COLUNAS) * CELULA + PADDING];
}

function lum(p: number[]): number {
  return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
}

function interior(indice: number): number[][] {
  const [ox, oy] = origem(indice);
  const r: number[][] = [];
  for (let y = 0; y < TAM_TILE; y++) for (let x = 0; x < TAM_TILE; x++) r.push(px(ox + x, oy + y));
  return r;
}

describe('atlas', () => {
  it('um tile por nome, UVs válidos, sem sobreposição e todo bloco com faces', () => {
    expect(atlas.tiles).toHaveLength(NOMES_TILES.length);
    expect(NOMES_TILES.length).toBeLessThanOrEqual(COLUNAS * LINHAS);
    for (const t of atlas.tiles) {
      const { u0, v0, u1, v1 } = t.uv;
      expect(u0).toBeGreaterThanOrEqual(0);
      expect(v0).toBeGreaterThanOrEqual(0);
      expect(u1).toBeLessThanOrEqual(1);
      expect(v1).toBeLessThanOrEqual(1);
      expect(u1).toBeGreaterThan(u0);
    }
    for (let a = 0; a < atlas.tiles.length; a++) {
      for (let b = a + 1; b < atlas.tiles.length; b++) {
        const A = atlas.tiles[a].uv;
        const B = atlas.tiles[b].uv;
        const separa = A.u1 <= B.u0 || B.u1 <= A.u0 || A.v1 <= B.v0 || B.v1 <= A.v0;
        expect(separa).toBe(true);
      }
    }
    for (const b of REGISTRO_BLOCOS) {
      if (b.id === Bloco.AR || b.liquido) continue;
      for (const f of ['topo', 'lado', 'base', 'frente'] as const) {
        expect(atlas.uvDaFace(b.id, f), `${b.nome} ${f}`).toBeDefined();
      }
    }
  });

  it('é determinístico por semente', () => {
    expect(gerarAtlas(1).pixels).toEqual(atlas.pixels);
    expect(gerarAtlas(2).pixels).not.toEqual(atlas.pixels);
  });

  it('cada tile pintado tem variação de cor e luminância', () => {
    // a pintura crua; as cores limpas de brinquedo alisam de propósito (teste abaixo)
    const cru = gerarAtlas(1, { brinquedo: false });
    const lerCru = (x: number, y: number) => {
      const i = (y * cru.largura + x) * 4;
      return [cru.pixels[i], cru.pixels[i + 1], cru.pixels[i + 2], cru.pixels[i + 3]];
    };
    for (const t of cru.tiles) {
      const [ox, oy] = origem(t.indice);
      const visiveis: number[][] = [];
      for (let y = 0; y < TAM_TILE; y++)
        for (let x = 0; x < TAM_TILE; x++) visiveis.push(lerCru(ox + x, oy + y));
      const opacos = visiveis.filter((p) => p[3] > 0);
      const cores = new Set(opacos.map((p) => p.join(',')));
      expect(cores.size, t.nome).toBeGreaterThan(12);
      const ls = opacos.map(lum);
      const media = ls.reduce((a, b) => a + b, 0) / ls.length;
      const desvio = Math.sqrt(ls.reduce((a, b) => a + (b - media) ** 2, 0) / ls.length);
      expect(desvio).toBeGreaterThan(0);
    }
  });

  it('cores de brinquedo: o chuvisco some, os desenhos fortes ficam', () => {
    const cru = gerarAtlas(1, { brinquedo: false });
    const grama = atlas.tiles.find(
      (t) => t.nome === NOMES_TILES[t.indice] && t.bloco === Bloco.TERRA_MUSGOSA,
    )!;
    const [ox, oy] = origem(grama.indice);
    const desvio = (ler: (x: number, y: number) => number[]) => {
      const ls: number[] = [];
      for (let y = 0; y < TAM_TILE; y++)
        for (let x = 0; x < TAM_TILE; x++) ls.push(lum(ler(ox + x, oy + y)));
      const m = ls.reduce((a, b) => a + b, 0) / ls.length;
      return Math.sqrt(ls.reduce((a, b) => a + (b - m) ** 2, 0) / ls.length);
    };
    const lerCru = (x: number, y: number) => {
      const i = (y * cru.largura + x) * 4;
      return [cru.pixels[i], cru.pixels[i + 1], cru.pixels[i + 2], cru.pixels[i + 3]];
    };
    // o lado da grama (verde em cima, terra embaixo) continua com contraste, mas menos chuvisco
    expect(desvio(px)).toBeLessThan(desvio(lerCru));
    expect(desvio(px)).toBeGreaterThan(desvio(lerCru) * 0.3);
  });

  it('cristal é azul saturado e a haste do cogumelo não é quase branca', () => {
    const cristal = atlas.tiles.find((t) => t.bloco === Bloco.CRISTAL_LUZ)!;
    const ps = interior(cristal.indice);
    expect(ps.some((p) => p[0] > 230 && p[1] > 230 && p[2] > 230)).toBe(false);
    const med = (k: number) => ps.reduce((a, p) => a + p[k], 0) / ps.length;
    expect(med(2) - med(0)).toBeGreaterThanOrEqual(40);
    const cog = atlas.tiles.find((t) => t.bloco === Bloco.COGUMELO_BRILHANTE)!;
    const todos = interior(cog.indice);
    const haste: number[][] = [];
    for (let y = 8; y < TAM_TILE; y++) {
      for (let x = 0; x < TAM_TILE; x++) {
        if (Math.abs(x - 7.5) < 2.5 && todos[y * TAM_TILE + x][3] === 255) {
          haste.push(todos[y * TAM_TILE + x]);
        }
      }
    }
    expect(haste.length).toBeGreaterThan(12);
    expect(haste.some((p) => p[0] > 170 && p[1] > 170 && p[2] > 170)).toBe(false);
  });

  it('plantas têm áreas vazias e padding repete vizinhos', () => {
    for (const id of [Bloco.GRAMA_ALTA, Bloco.FLOR, Bloco.COGUMELO_BRILHANTE]) {
      const t = atlas.tiles.find((x) => x.bloco === id)!;
      expect(interior(t.indice).some((p) => p[3] === 0)).toBe(true);
    }
    for (const t of atlas.tiles) {
      const [ox, oy] = origem(t.indice);
      for (let k = 0; k < TAM_TILE; k++) {
        expect(px(ox - 1, oy + k)).toEqual(px(ox, oy + k));
        expect(px(ox - PADDING, oy + k)).toEqual(px(ox, oy + k));
        expect(px(ox + TAM_TILE, oy + k)).toEqual(px(ox + TAM_TILE - 1, oy + k));
        expect(px(ox + k, oy - 1)).toEqual(px(ox + k, oy));
        expect(px(ox + k, oy + TAM_TILE + 1)).toEqual(px(ox + k, oy + TAM_TILE - 1));
      }
    }
    expect(LARGURA_ATLAS).toBe(atlas.largura);
  });
});
