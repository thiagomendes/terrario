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

describe('diário na ordem do tema (spec 013)', () => {
  it('o Rancho Alegre guia primeiro pela Roça: arar, plantar, colher', async () => {
    await import('../../src/temas/todos');
    const { obterTema, temasDisponiveis } = await import('../../src/temas/index');
    const rancho = obterTema('rancho-alegre');
    const d = criarDiario(undefined, { primeiroCapitulo: rancho.primeiroCapitulo });
    expect(d.atual()?.id).toBe('arar');
    d.registrar('arou');
    expect(d.atual()?.id).toBe('plantar');
    d.registrar('plantou');
    expect(d.atual()?.id).toBe('colher');
    d.registrar('colheu');
    expect(d.atual()?.id).toBe('pao');
    d.registrar('fabricou:pao');
    d.registrar('criou');
    // acabou a roça: volta aos primeiros passos
    expect(d.atual()?.id).toBe('madeira');
    // todas as missões continuam lá, uma vez cada
    expect([...d.missoes].map((m) => m.id).sort()).toEqual(MISSOES.map((m) => m.id).sort());
    // os outros temas não mudam
    for (const id of temasDisponiveis()) {
      if (id === 'rancho-alegre') continue;
      const t = obterTema(id);
      expect(t.primeiroCapitulo, id).toBeUndefined();
      expect(criarDiario(undefined, { primeiroCapitulo: t.primeiroCapitulo }).missoes).toBe(
        MISSOES,
      );
    }
  });

  it('a ordem não muda a ordem das conquistas salvas', () => {
    const a = criarDiario();
    const b = criarDiario(undefined, { primeiroCapitulo: 'Roça' });
    for (const d of [a, b]) {
      d.registrar('quebrou:tronco', 4);
      d.registrar('arou');
    }
    expect(b.salvar()).toEqual(a.salvar());
  });

  it('capítulo que não existe deixa a ordem de sempre', () => {
    expect(criarDiario(undefined, { primeiroCapitulo: 'Nada' }).atual()?.id).toBe('madeira');
  });
});
