import { describe, expect, it } from 'vitest';
import { TOQUE_SUPORTE_MS, TOQUE_SUPORTE_PX, foiToque } from '../../src/jogo/rinque';

/**
 * Spec 026 (dono, 16 nov 2026: "entrar no rinque calça os patins sozinho"): calçar é uma escolha.
 * Só o toque de verdade no suporte vale (o dedo desce e sobe no mesmo lugar, rápido); o dedo que
 * arrasta por cima do suporte para virar a câmera, ou que fica parado nele, não calça.
 */
describe('o toque no suporte dos patins (spec 026)', () => {
  it('o dedo que desce e sobe no mesmo lugar é um toque', () => {
    expect(foiToque(0, 0, 80)).toBe(true);
    expect(foiToque(6, -5, 240)).toBe(true);
    // a mãozinha de 3 anos treme e demora um pouco: ainda vale
    expect(foiToque(12, 10, 600)).toBe(true);
  });

  it('arrastar o dedo (virar a câmera) não é toque', () => {
    expect(foiToque(40, 0, 120)).toBe(false);
    expect(foiToque(0, -TOQUE_SUPORTE_PX - 1, 120)).toBe(false);
    expect(foiToque(15, 15, 120)).toBe(false);
  });

  it('o dedo parado em cima do suporte (segurando) não é toque', () => {
    expect(foiToque(0, 0, TOQUE_SUPORTE_MS + 1)).toBe(false);
    expect(foiToque(0, 0, 3000)).toBe(false);
  });

  it('as medidas: generoso para o dedo pequeno, curto para não pegar o arrastar', () => {
    expect(TOQUE_SUPORTE_PX).toBeGreaterThanOrEqual(12);
    expect(TOQUE_SUPORTE_PX).toBeLessThanOrEqual(24);
    expect(TOQUE_SUPORTE_MS).toBeGreaterThanOrEqual(500);
    expect(TOQUE_SUPORTE_MS).toBeLessThanOrEqual(900);
  });
});
