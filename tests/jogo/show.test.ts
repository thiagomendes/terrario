import { describe, expect, it } from 'vitest';
import {
  ACORDES_SHOW,
  APLAUSO,
  CHAMADO,
  COMPASSO,
  CONTAGEM,
  ESPERA_FINAL,
  OITAVO,
  encaixarToque,
  faltaParaOFinal,
  faseDoShow,
  finalSozinho,
  momentoFinalSozinho,
} from '../../src/jogo/show';

describe('o Show da Vila: o tempo da música (spec 026)', () => {
  const s = { inicio: 100, final: null };

  it('dura uma volta de ~40 s e chama o acorde final no fim', () => {
    expect(CHAMADO + ESPERA_FINAL).toBeCloseTo(40, 5);
    expect(faseDoShow(s, 100)).toBe('tocando');
    expect(faseDoShow(s, 100 + CHAMADO - 0.01)).toBe('tocando');
    expect(faseDoShow(s, 100 + CHAMADO)).toBe('chamando');
  });

  it('todo toque encaixa no próximo oitavo, no máximo 1/8 de compasso depois', () => {
    for (let t = 100 + CONTAGEM; t < 100 + CHAMADO; t += 0.037) {
      const { quando } = encaixarToque(s, t);
      expect(quando).toBeGreaterThanOrEqual(t - 1e-9);
      expect(quando - t).toBeLessThanOrEqual(OITAVO + 1e-9);
      expect(COMPASSO / 8).toBeCloseTo(OITAVO, 9);
      // cai certinho na grade dos oitavos
      const k = (quando - 100 - CONTAGEM) / OITAVO;
      expect(Math.abs(k - Math.round(k))).toBeLessThan(1e-6);
    }
  });

  it('o acorde é sempre o do compasso (nunca desafina) e anda em laço', () => {
    const vistos = new Set<number>();
    for (let c = 0; c < 8; c++) {
      const t = 100 + CONTAGEM + c * COMPASSO + 0.5;
      const { acorde } = encaixarToque(s, t);
      expect(acorde).toBe(c % ACORDES_SHOW.length);
      vistos.add(acorde);
    }
    expect(vistos.size).toBe(ACORDES_SHOW.length);
  });

  it('na contagem, o toque cai no primeiro tempo', () => {
    expect(encaixarToque(s, 100.3).quando).toBeCloseTo(100 + CONTAGEM, 9);
  });

  it('sem toque, o acorde final vem sozinho em 4 s do chamado', () => {
    expect(finalSozinho(s, 100 + CHAMADO + ESPERA_FINAL - 0.05)).toBe(false);
    expect(finalSozinho(s, 100 + CHAMADO + ESPERA_FINAL)).toBe(true);
    expect(momentoFinalSozinho(s)).toBeCloseTo(100 + CHAMADO + 4, 9);
    expect(faltaParaOFinal(s, 100 + CHAMADO + 1)).toBeCloseTo(3, 9);
    expect(faltaParaOFinal(s, 100 + 5)).toBeNull();
  });

  it('depois do acorde final vem o aplauso, e o show acaba', () => {
    const f = { inicio: 100, final: 137 };
    expect(faseDoShow(f, 137.1)).toBe('final');
    expect(faseDoShow(f, 137 + APLAUSO)).toBe('acabou');
  });
});
