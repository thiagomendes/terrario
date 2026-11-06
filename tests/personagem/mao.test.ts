import { describe, expect, it } from 'vitest';
import { blocoNaMao, posicaoBraco } from '../../src/personagem/mao';
import { calcularPose } from '../../src/personagem/poses';
import { SLOTS } from '../../src/player/hotbar';
import { Bloco } from '../../src/world/blocks';

const neutra = calcularPose({
  andando: false,
  correndo: false,
  noAr: false,
  minerando: false,
  colocando: false,
  tempo: 0,
});

describe('blocoNaMao', () => {
  it('devolve o bloco real de cada um dos 6 slots', () => {
    expect(SLOTS).toHaveLength(6);
    SLOTS.forEach((s, i) => expect(blocoNaMao(i)).toBe(s.bloco));
    expect(blocoNaMao(5)).toBe(Bloco.CRISTAL_LUZ);
    expect(blocoNaMao(0)).toBe(Bloco.TERRA_MUSGOSA);
  });

  it('devolve null fora de 0 a 5', () => {
    for (const i of [-1, 6, 1.5, NaN]) expect(blocoNaMao(i)).toBeNull();
  });
});

describe('posicaoBraco', () => {
  const tamanhos = [
    { largura: 390, altura: 844 },
    { largura: 768, altura: 1024 },
    { largura: 1280, altura: 720 },
  ];
  const mineracao = calcularPose({
    andando: false,
    correndo: false,
    noAr: false,
    minerando: true,
    colocando: false,
    tempo: 0.06,
  });

  for (const t of tamanhos) {
    for (const [nome, pose] of [
      ['neutra', neutra],
      ['minerando', mineracao],
    ] as const) {
      it(`fica no canto inferior direito fora da mira em ${t.largura}x${t.altura} (${nome})`, () => {
        const p = posicaoBraco(pose, t);
        expect(p.tela.x).toBeGreaterThan(t.largura * 0.65);
        expect(p.tela.x).toBeLessThan(t.largura);
        expect(p.tela.y).toBeGreaterThan(t.altura * 0.6);
        expect(p.tela.y).toBeLessThan(t.altura);
        expect(Math.abs(p.tela.x - t.largura / 2)).toBeGreaterThan(t.largura * 0.15);
        expect(p.extensao.minX).toBeGreaterThan(0.12);
        expect(p.extensao.maxY).toBeLessThan(-0.12);
        expect(p.x).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(0);
      });
    }
  }
});
