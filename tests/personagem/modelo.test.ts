import { describe, expect, it } from 'vitest';
import { IDS_MODELOS, PALETAS, aparenciaPadrao } from '../../src/personagem/aparencia';
import { montarPartes } from '../../src/personagem/modelo';
import {
  ALTURA_TEXTURA,
  LARGURA_TEXTURA,
  REGIOES,
  gerarTextura,
  type Regiao,
} from '../../src/personagem/textura';
import { TETO_LUMINANCIA_EMISSIVA, luminancia } from '../../src/render/emissivo';

function pixel(buf: Uint8ClampedArray, x: number, y: number): string {
  const i = (y * LARGURA_TEXTURA + x) * 4;
  return `#${[buf[i], buf[i + 1], buf[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function cores(buf: Uint8ClampedArray, r: Regiao): Set<string> {
  const s = new Set<string>();
  for (let y = r.y; y < r.y + r.h; y++)
    for (let x = r.x; x < r.x + r.w; x++) s.add(pixel(buf, x, y));
  return s;
}

describe('montarPartes', () => {
  it('altura total é 1,8 nos 4 modelos', () => {
    for (const id of IDS_MODELOS) {
      for (const acessorio of ['nenhum', 'capuz', 'lanterna'] as const) {
        for (const cabeloEstilo of [0, 1, 2]) {
          const partes = montarPartes({ ...aparenciaPadrao(id), acessorio, cabeloEstilo });
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
    expect(chaves.size).toBe(4);
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

describe('gerarTextura', () => {
  const ap = aparenciaPadrao('andarilho');

  it('tem tamanho fixo e cores das regiões certas', () => {
    const t = gerarTextura(ap);
    expect(t.length).toBe(LARGURA_TEXTURA * ALTURA_TEXTURA * 4);
    expect([...cores(t, REGIOES.cabeca)]).toEqual([PALETAS.pele[ap.pele]]);
    expect([...cores(t, REGIOES.cabelo)]).toEqual([PALETAS.cabelo[ap.cabeloCor]]);
    expect([...cores(t, REGIOES.tronco)]).toEqual([PALETAS.roupa[ap.roupaCor]]);
    expect([...cores(t, REGIOES.pernaDireita)]).toEqual([PALETAS.calca[ap.calcaCor]]);
  });

  it('trocar a roupa muda a roupa e não a pele', () => {
    const a = gerarTextura(ap);
    const b = gerarTextura({ ...ap, roupaCor: (ap.roupaCor + 1) % PALETAS.roupa.length });
    expect(cores(a, REGIOES.tronco)).not.toEqual(cores(b, REGIOES.tronco));
    expect(cores(a, REGIOES.cabeca)).toEqual(cores(b, REGIOES.cabeca));
    expect(pixel(a, REGIOES.bracoDireito.x, REGIOES.bracoDireito.y + 15)).toBe(
      pixel(b, REGIOES.bracoDireito.x, REGIOES.bracoDireito.y + 15),
    );
  });

  it('cores da lanterna e do capuz respeitam o teto emissivo', () => {
    for (const acessorio of ['lanterna', 'capuz'] as const) {
      const t = gerarTextura({ ...ap, acessorio });
      for (const c of cores(t, REGIOES.acessorio)) {
        const n = parseInt(c.slice(1), 16);
        const l = luminancia((n >> 16) & 255, (n >> 8) & 255, n & 255);
        expect(l).toBeLessThanOrEqual(TETO_LUMINANCIA_EMISSIVA);
      }
    }
  });

  it('é determinística', () => {
    expect(gerarTextura(ap)).toEqual(gerarTextura({ ...ap }));
  });
});
