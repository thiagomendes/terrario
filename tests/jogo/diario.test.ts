import { describe, expect, it } from 'vitest';
import { MISSOES, criarDiario } from '../../src/jogo/diario';

describe('diário', () => {
  it('conclui missões ao atingir a meta, uma vez só, e avança a atual', () => {
    const d = criarDiario();
    expect(d.atual()?.id).toBe('madeira');
    expect(d.registrar('quebrou:tronco', 3)).toEqual([]);
    expect(d.progresso(MISSOES[0])).toBeCloseTo(0.75);
    expect(d.registrar('quebrou:tronco').map((m) => m.id)).toEqual(['madeira']);
    expect(d.registrar('quebrou:tronco')).toEqual([]);
    expect(d.atual()?.id).toBe('tabuas');
  });

  it('salva e carrega', () => {
    const d = criarDiario();
    d.registrar('foto');
    const e = criarDiario(JSON.parse(JSON.stringify(d.salvar())));
    expect(e.concluida('foto')).toBe(true);
    expect(e.total).toBe(1);
  });

  it('ids únicos e metas positivas', () => {
    expect(new Set(MISSOES.map((m) => m.id)).size).toBe(MISSOES.length);
    for (const m of MISSOES) expect(m.meta).toBeGreaterThan(0);
  });
});
