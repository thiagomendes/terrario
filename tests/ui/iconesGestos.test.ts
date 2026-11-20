import { describe, expect, it } from 'vitest';
import { IDS_GESTOS } from '../../src/personagem/gestos';
import {
  ICONE_CARINHA,
  ICONES_GESTOS,
  svgDoBalao,
  svgDoBalaoEstrela,
  svgDoIcone,
} from '../../src/ui/iconesGestos';

/** As grossuras dos contornos de grossura fixa na tela. */
const grossuras = (svg: string) =>
  [...svg.matchAll(/stroke-width="([\d.]+)"[^>]*?vector-effect="non-scaling-stroke"/g)].map((m) =>
    Number(m[1]),
  );

describe('spec 034: os ícones dos gestos (a direção A reforçada)', () => {
  it('os 11 gestos e a carinha são o boneco desenhado, cada um diferente, sem texto', () => {
    expect(Object.keys(ICONES_GESTOS).sort()).toEqual([...IDS_GESTOS].sort());
    const todos = [...IDS_GESTOS.map((id) => ICONES_GESTOS[id]), ICONE_CARINHA];
    expect(new Set(todos).size).toBe(todos.length);
    for (const miolo of todos) {
      // o rosto do boneco (olhos com brilho) e o cabelo com o topete
      expect(miolo).toContain('fill="#231a28"');
      // (de frente em x 0,1; de lado em 0,16)
      expect(miolo).toMatch(/<ellipse cx="0\.16?" cy="1\.43"/);
      expect(miolo).not.toMatch(/<text|NaN|undefined/);
    }
    // o aperto de mão tem o amigo (as cores de outro boneco pronto do jogo)
    expect(ICONES_GESTOS.cumprimentar.match(/<ellipse cx="0.1" cy="1.43"/g)).toHaveLength(2);
  });

  it('o ícone vai num viewBox de 64, com os contornos de grossura fixa na tela', () => {
    const svg = svgDoIcone(ICONES_GESTOS.acenar);
    expect(svg).toMatch(/^<svg class="icone-gesto" viewBox="0 0 64 64"/);
    expect(Math.max(...grossuras(svg))).toBeLessThan(5);
  });

  it('o balão (textura de 256) engrossa os contornos para ler como a 72 px', () => {
    for (const id of IDS_GESTOS) {
      const icone = grossuras(ICONES_GESTOS[id]);
      for (const balao of [svgDoBalao(id), svgDoBalaoEstrela(id)]) {
        const g = grossuras(balao);
        expect(g).toHaveLength(icone.length);
        g.forEach((w, i) => expect(w).toBeCloseTo((icone[i] * 256) / 72, 1));
      }
    }
    expect(svgDoBalao('acenar')).toContain('width="256"');
  });
});
