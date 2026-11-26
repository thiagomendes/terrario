import { describe, expect, it } from 'vitest';
import { entradaNaCaixa, fantasmaNoRaio } from '../../src/jogo/miraObra';
import { OBRAS, celulasDaObra } from '../../src/world/obras';
import { criarGerador } from '../../src/audio/variacao';

/**
 * Spec 014, T06: nenhum toque perdido. Para as 6 plantas, toques espalhados em volta de cada
 * célula (a até meio bloco da caixa dela) sempre pegam um fantasma; o fantasma acertado em
 * cheio ganha do ímã; um bloco de verdade na frente tapa o fantasma de trás.
 */
const sempre = () => true;

describe('mira nos fantasmas da obra', () => {
  it('100% dos toques a até meio bloco de um fantasma enchem um fantasma (6 plantas)', () => {
    const rng = criarGerador(14);
    for (const o of OBRAS) {
      const cel = celulasDaObra(o).map((c) => ({ x: c.s, y: c.y, z: c.f }));
      // a criança na calçada da frente, os olhos a 1,6 do chão, um pouco de lado
      const olho = { x: 3.5, y: 1.62, z: -3 };
      let toques = 0;
      for (const c of cel)
        for (let k = 0; k < 12; k++) {
          // um ponto a até meio bloco da caixa da célula
          const p = {
            x: c.x - 0.5 + rng() * 2,
            y: c.y - 0.5 + rng() * 2,
            z: c.z - 0.5 + rng() * 2,
          };
          const d = { x: p.x - olho.x, y: p.y - olho.y, z: p.z - olho.z };
          const f = fantasmaNoRaio(olho, d, cel, {
            limite: 40,
            ima: 0.5,
            solido: Infinity,
            alcanca: sempre,
          });
          expect(f, `${o.id} ${c.x},${c.y},${c.z}`).not.toBeNull();
          toques++;
        }
      expect(toques).toBeGreaterThan(0);
    }
  });

  it('o acertado em cheio ganha do ímã, e o bloco da frente tapa', () => {
    const a = { x: 0, y: 0, z: 5 };
    const b = { x: 1, y: 0, z: 5 };
    const o = { x: 0.5, y: 0.5, z: 0 };
    const d = { x: 0, y: 0, z: 1 };
    expect(
      fantasmaNoRaio(o, d, [b, a], { limite: 40, ima: 0.5, solido: Infinity, alcanca: sempre }),
    ).toBe(a);
    expect(entradaNaCaixa(o, d, a)).toBeCloseTo(5);
    expect(
      fantasmaNoRaio(o, d, [a], { limite: 40, ima: 0.5, solido: 3, alcanca: sempre }),
    ).toBeNull();
    // fora do alcance das mãos, nada
    expect(
      fantasmaNoRaio(o, d, [a], { limite: 40, ima: 0.5, solido: Infinity, alcanca: () => false }),
    ).toBeNull();
  });

  it('spec 037: o apoiado só desempata no ímã; nunca passa na frente do tocado em cheio', () => {
    const baixo = { x: 0, y: 0, z: 5 };
    const cima = { x: 0, y: 1, z: 5 };
    const lado = { x: 1, y: 0, z: 5 };
    const d = { x: 0, y: 0, z: 1 };
    const op = { limite: 40, ima: 1.5, solido: Infinity, alcanca: sempre };
    const apoiado = (c: { y: number }) => c.y === 0;
    // o raio passa por cima dos dois: só o ímã pega, e o de cima (solto) está mais perto
    const porCima = { x: 0.5, y: 2.3, z: 0 };
    expect(fantasmaNoRaio(porCima, d, [cima, baixo], op)).toBe(cima);
    expect(fantasmaNoRaio(porCima, d, [cima, baixo], { ...op, apoiado })).toBe(baixo);
    // tocado em cheio, o solto ganha mesmo com o apoiado ao lado
    const emCheio = { x: 0.5, y: 1.5, z: 0 };
    expect(fantasmaNoRaio(emCheio, d, [baixo, cima], { ...op, apoiado })).toBe(cima);
    // entre dois apoiados, o mais perto do raio
    const entre = { x: 0.4, y: 1.6, z: 0 };
    expect(fantasmaNoRaio(entre, d, [lado, baixo], { ...op, apoiado: sempre })).toBe(baixo);
  });
});
