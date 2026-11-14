import { describe, expect, it } from 'vitest';
import { bolinhasCheias, missaoDoCartao, missaoFixada } from '../../src/ui/alma/hud';
import { missaoPorId } from '../../src/jogo/alma';

describe('HUD da alma (spec 023, T06)', () => {
  it('030: o selinho é só da missão escolhida (a fixada, se aberta)', () => {
    expect(missaoFixada(null)).toBeNull();
    const v = {
      mundo: 'rancho-alegre' as const,
      feitas: [],
      puladas: [],
      abertas: [{ id: 'r1', feito: 2, meta: 5 }],
      fixada: null as string | null,
      bis: 0,
      bau: [],
    };
    expect(missaoFixada(v)).toBeNull();
    v.fixada = 'r2';
    expect(missaoFixada(v)).toBeNull();
    v.fixada = 'r1';
    expect(missaoFixada(v)?.m.id).toBe('r1');
  });

  it('o cartão mostra a fixada (se aberta) ou a primeira aberta; sem quadro, nada', () => {
    expect(missaoDoCartao(null)).toBeNull();
    const v = {
      mundo: 'rancho-alegre' as const,
      feitas: [],
      puladas: [],
      abertas: [
        { id: 'r1', feito: 2, meta: 5 },
        { id: 'r2', feito: 0, meta: 2 },
      ],
      fixada: 'r2',
      bis: 0,
      bau: [],
    };
    expect(missaoDoCartao(v)).toMatchObject({ m: { id: 'r2' }, feito: 0, meta: 2 });
    expect(missaoDoCartao({ ...v, fixada: 'r7' })).toMatchObject({ m: { id: 'r1' }, feito: 2 });
  });

  it('passeio da c3: cada bolinha acende pelo lugar visto, não pela ordem', () => {
    const c3 = missaoPorId('c3')!;
    // padaria, escola e sorveteria: a sorveteria primeiro acende a terceira
    expect(bolinhasCheias(c3, 1, 3, ['sorveteria'])).toEqual([false, false, true]);
    expect(bolinhasCheias(c3, 2, 3, ['padaria', 'sorveteria'])).toEqual([true, false, true]);
    // lixo de fora não acende nada a mais
    expect(bolinhasCheias(c3, 1, 3, [7, 'praca', 'sorveteria'])).toEqual([false, false, true]);
    // núcleo antigo (sem os lugares): pela conta, como antes
    expect(bolinhasCheias(c3, 1, 3)).toEqual([true, false, false]);
    // as outras missões: pela conta
    expect(bolinhasCheias(missaoPorId('r2')!, 1, 2, ['x'])).toEqual([true, false]);
    // o cartão passa os lugares adiante
    const v = {
      mundo: 'cidade-grande' as const,
      feitas: ['c1', 'c2'],
      puladas: [],
      abertas: [{ id: 'c3', feito: 1, meta: 3, usos: ['sorveteria'] }],
      fixada: null,
      bis: 0,
      bau: [],
    };
    expect(missaoDoCartao(v)?.usos).toEqual(['sorveteria']);
  });
});

describe('baú da alma (spec 023, T07)', () => {
  it('toda recusa da banca tem desenho (sem texto)', async () => {
    const { DESENHO_RECUSA } = await import('../../src/ui/alma/bau');
    const { ARTE } = await import('../../src/ui/alma/arte');
    for (const d of Object.values(DESENHO_RECUSA)) expect(ARTE[d], d).toBeTruthy();
    expect(Object.keys(DESENHO_RECUSA).sort()).toEqual(
      ['cheio', 'espera', 'galinha', 'limite', 'saldo', 'tema'].sort(),
    );
  });
});
