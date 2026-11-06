import { describe, expect, it } from 'vitest';
import { IDS_MODELOS, PALETAS, aparenciaPadrao } from '../../src/personagem/aparencia';
import { montarPartes } from '../../src/personagem/modelo';
import {
  ORDEM_FACES,
  PX_POR_BLOCO,
  gerarTexturaParte,
  type FaceCaixa,
  type TexturaParte,
} from '../../src/personagem/textura';
import { TETO_LUMINANCIA_EMISSIVA, luminancia } from '../../src/render/emissivo';

describe('montarPartes', () => {
  it('o corpo mede 1,8 em todos os modelos (cabelo e acessórios podem passar)', () => {
    for (const id of IDS_MODELOS) {
      for (const acessorio of ['nenhum', 'capuz', 'lanterna'] as const) {
        for (const cabeloEstilo of [0, 1, 2]) {
          const partes = montarPartes({ ...aparenciaPadrao(id), acessorio, cabeloEstilo }).filter(
            (p) => !['cabelo', 'penteado', 'acessorio', 'saia'].includes(p.nome),
          );
          const topo = Math.max(...partes.map((p) => p.posicao[1] + p.tamanho[1] / 2));
          const base = Math.min(...partes.map((p) => p.posicao[1] - p.tamanho[1] / 2));
          expect(base).toBeCloseTo(0, 5);
          expect(topo).toBeCloseTo(1.8, 5);
        }
      }
    }
  });

  it('modelos têm proporções diferentes e partes completas', () => {
    const chaves = new Set<string>();
    for (const id of IDS_MODELOS) {
      const partes = montarPartes(aparenciaPadrao(id));
      const tronco = partes.find((p) => p.nome === 'tronco')!;
      const perna = partes.find((p) => p.nome === 'pernaEsquerda')!;
      chaves.add(`${tronco.tamanho[0]}|${perna.tamanho[1]}`);
      for (const p of partes) {
        expect(p.tamanho.every((v) => v > 0)).toBe(true);
        expect(p.pivo).toHaveLength(3);
      }
    }
    expect(chaves.size).toBe(IDS_MODELOS.length);
  });

  it('acessório nenhum não gera parte; capuz e lanterna geram', () => {
    const base = aparenciaPadrao('andarilho');
    const tem = (a: typeof base) => montarPartes(a).some((p) => p.nome === 'acessorio');
    expect(tem({ ...base, acessorio: 'nenhum' })).toBe(false);
    expect(tem({ ...base, acessorio: 'capuz' })).toBe(true);
    expect(tem({ ...base, acessorio: 'lanterna' })).toBe(true);
    expect(montarPartes({ ...base, acessorio: 'nenhum' })).toHaveLength(7);
  });
});

describe('gerarTexturaParte', () => {
  const ap = aparenciaPadrao('andarilho');
  const partes = montarPartes(ap);
  const parte = (nome: string) => partes.find((p) => p.nome === nome)!;

  function cores(t: TexturaParte, face: FaceCaixa): Map<string, number> {
    const r = t.faces[ORDEM_FACES.indexOf(face)];
    const m = new Map<string, number>();
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        const i = (y * t.largura + x) * 4;
        const c = `${t.pixels[i]},${t.pixels[i + 1]},${t.pixels[i + 2]}`;
        m.set(c, (m.get(c) ?? 0) + 1);
      }
    }
    return m;
  }
  const rgb = (h: string) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  function perto(t: TexturaParte, face: FaceCaixa, cor: string, tolerancia = 30): number {
    const [r, g, b] = rgb(cor);
    let n = 0;
    let total = 0;
    for (const [c, q] of cores(t, face)) {
      const [cr, cg, cb] = c.split(',').map(Number);
      total += q;
      if (Math.abs(cr - r) + Math.abs(cg - g) + Math.abs(cb - b) <= tolerancia) n += q;
    }
    return n / total;
  }

  it('faces têm pixels quadrados e a frente da cabeça tem rosto', () => {
    const t = gerarTexturaParte(ap, parte('cabeca'));
    expect(t.faces).toHaveLength(6);
    expect(t.faces[0].w).toBe(Math.round(0.4 * PX_POR_BLOCO));
    expect(t.pixels.length).toBe(t.largura * t.altura * 4);
    // a frente é na maior parte pele, mas tem olhos e cabelo; as costas não têm pele dominante
    expect(perto(t, 'frente', PALETAS.pele[ap.pele])).toBeGreaterThan(0.5);
    expect(cores(t, 'frente').size).toBeGreaterThan(cores(t, 'topo').size);
    expect(perto(t, 'tras', PALETAS.pele[ap.pele])).toBeLessThan(0.4);
    expect(perto(t, 'topo', PALETAS.cabelo[ap.cabeloCor])).toBeGreaterThan(0.8);
  });

  it('roupa e calça usam as cores da paleta', () => {
    expect(
      perto(gerarTexturaParte(ap, parte('tronco')), 'tras', PALETAS.roupa[ap.roupaCor]),
    ).toBeGreaterThan(0.6);
    expect(
      perto(gerarTexturaParte(ap, parte('pernaDireita')), 'frente', PALETAS.calca[ap.calcaCor]),
    ).toBeGreaterThan(0.5);
  });

  it('trocar a roupa muda o tronco e não a cabeça nem a mão', () => {
    const outra = { ...ap, roupaCor: (ap.roupaCor + 1) % PALETAS.roupa.length };
    expect(gerarTexturaParte(ap, parte('tronco')).pixels).not.toEqual(
      gerarTexturaParte(outra, parte('tronco')).pixels,
    );
    expect(gerarTexturaParte(ap, parte('cabeca')).pixels).toEqual(
      gerarTexturaParte(outra, parte('cabeca')).pixels,
    );
    const a = gerarTexturaParte(ap, parte('bracoDireito'));
    const b = gerarTexturaParte(outra, parte('bracoDireito'));
    expect(cores(a, 'base')).toEqual(cores(b, 'base'));
  });

  it('cores da lanterna e do capuz respeitam o teto emissivo', () => {
    for (const acessorio of ['lanterna', 'capuz'] as const) {
      const a = { ...ap, acessorio };
      const t = gerarTexturaParte(a, montarPartes(a).find((p) => p.nome === 'acessorio')!);
      for (let i = 0; i < t.pixels.length; i += 4) {
        expect(luminancia(t.pixels[i], t.pixels[i + 1], t.pixels[i + 2])).toBeLessThanOrEqual(
          TETO_LUMINANCIA_EMISSIVA,
        );
      }
    }
  });

  it('é determinística', () => {
    expect(gerarTexturaParte(ap, parte('tronco'))).toEqual(
      gerarTexturaParte({ ...ap }, parte('tronco')),
    );
  });
});
