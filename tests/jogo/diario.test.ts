import { describe, expect, it } from 'vitest';
import {
  CAPITULO_OBRAS,
  MISSOES,
  MISSOES_OBRAS,
  criarDiario,
  temObras,
} from '../../src/jogo/diario';

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

  it('vale o nome do capítulo de antes de o tema renomear', async () => {
    await import('../../src/temas/todos');
    const { obterTema } = await import('../../src/temas/index');
    const { ativarTemaPuro } = await import('../../src/temas/ativarPuro');
    const { temaBase } = await import('../../src/temas/base');
    const rancho = obterTema('rancho-alegre');
    ativarTemaPuro(rancho);
    try {
      expect(MISSOES.find((m) => m.id === 'arar')!.capitulo).not.toBe('Roça');
      const d = criarDiario(undefined, { primeiroCapitulo: rancho.primeiroCapitulo });
      expect(d.atual()?.id).toBe('arar');
    } finally {
      ativarTemaPuro(temaBase());
    }
  });

  it('capítulo que não existe deixa a ordem de sempre', () => {
    expect(criarDiario(undefined, { primeiroCapitulo: 'Nada' }).atual()?.id).toBe('madeira');
  });
});

describe('diário: "Obras da cidade" (spec 014)', () => {
  it('seis figurinhas, uma por obra, na ordem das plantas', () => {
    expect(MISSOES_OBRAS.map((m) => m.id)).toEqual([
      'obra-1',
      'obra-2',
      'obra-3',
      'obra-4',
      'obra-5',
      'obra-6',
    ]);
    expect(MISSOES_OBRAS.map((m) => m.titulo)).toEqual([
      'Casinha do cachorro',
      'Banca de frutas',
      'Ponto de ônibus',
      'Sorveteria',
      'Casinha',
      'Coreto da praça',
    ]);
    for (const [i, m] of MISSOES_OBRAS.entries()) {
      expect(m.contador).toBe(`obra:${i + 1}`);
      expect(m.meta).toBe(1);
      expect(m.capitulo).toBe(CAPITULO_OBRAS);
    }
    // ids que não batem com as missões de sempre
    const ids = new Set(MISSOES.map((m) => m.id));
    for (const m of MISSOES_OBRAS) expect(ids.has(m.id)).toBe(false);
  });

  it('só a Cidade Grande tem o capítulo; os outros temas ficam iguaizinhos', async () => {
    await import('../../src/temas/todos');
    const { obterTema, temasDisponiveis } = await import('../../src/temas/index');
    expect(temObras(obterTema('cidade-grande'))).toBe(true);
    for (const id of temasDisponiveis()) {
      if (id === 'cidade-grande') continue;
      const t = obterTema(id);
      expect(temObras(t), id).toBe(false);
      const d = criarDiario(undefined, {
        primeiroCapitulo: t.primeiroCapitulo,
        obras: temObras(t),
      });
      expect(
        d.missoes.some((m) => m.capitulo === CAPITULO_OBRAS),
        id,
      ).toBe(false);
      expect(d.missoes.length, id).toBe(MISSOES.length);
      // a obra terminada não conta nada fora da cidade
      expect(d.registrar('obra:1')).toEqual([]);
      expect(d.total).toBe(0);
    }
    // sem obras, a mesma lista de antes (nem cópia)
    expect(criarDiario(undefined, { obras: false }).missoes).toBe(MISSOES);
  });

  it('na cidade: o capítulo vem primeiro e cada obra feita cola a figurinha', async () => {
    await import('../../src/temas/todos');
    const { obterTema } = await import('../../src/temas/index');
    const cidade = obterTema('cidade-grande');
    const d = criarDiario(undefined, {
      primeiroCapitulo: cidade.primeiroCapitulo,
      obras: temObras(cidade),
    });
    expect(d.missoes.length).toBe(MISSOES.length + 6);
    // a primeira missão da cidade é a casinha do cachorro, a obra do primeiro canteiro
    expect(d.missoes.slice(0, 6).map((m) => m.id)).toEqual(MISSOES_OBRAS.map((m) => m.id));
    expect(d.missoes.slice(6)).toEqual([...MISSOES]);
    expect(d.atual()?.id).toBe('obra-1');
    expect(d.registrar('obra:1').map((m) => m.id)).toEqual(['obra-1']);
    expect(d.atual()?.id).toBe('obra-2');
    expect(d.registrar('obra:1')).toEqual([]);
    expect(d.concluida('obra-1')).toBe(true);
    expect(d.registrar('obra:6').map((m) => m.id)).toEqual(['obra-6']);
    expect(d.total).toBe(2);
    // salva e volta com as figurinhas
    const e = criarDiario(JSON.parse(JSON.stringify(d.salvar())), { obras: true });
    expect(e.concluida('obra-6')).toBe(true);
    expect(e.progresso(MISSOES_OBRAS[1])).toBe(0);
  });
});
