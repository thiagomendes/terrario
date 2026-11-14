import { describe, expect, it } from 'vitest';
import { marcarQuadroVisto, quadroJaVisto, CHAVE_QUADRO_VISTO } from '../../src/ui/alma';
import { missaoDoCartao } from '../../src/ui/alma/hud';

function loja() {
  const d = new Map<string, string>();
  return {
    d,
    getItem: (k: string) => d.get(k) ?? null,
    setItem: (k: string, v: string) => void d.set(k, v),
  } as unknown as Storage & { d: Map<string, string> };
}

describe('HUD da alma (spec 023, T06)', () => {
  it('o quadro abre sozinho só na primeira visita a cada mundo', () => {
    const l = loja();
    expect(quadroJaVisto(l, 'm1')).toBe(false);
    marcarQuadroVisto(l, 'm1');
    expect(quadroJaVisto(l, 'm1')).toBe(true);
    expect(quadroJaVisto(l, 'sala:ABCD')).toBe(false);
    // lixo guardado não quebra
    l.setItem(CHAVE_QUADRO_VISTO, '{');
    expect(quadroJaVisto(l, 'm1')).toBe(false);
    marcarQuadroVisto(l, 'm2');
    expect(quadroJaVisto(l, 'm2')).toBe(true);
    // sem armazenamento: sempre abre (e não quebra)
    expect(quadroJaVisto(null, 'm1')).toBe(false);
    marcarQuadroVisto(null, 'm1');
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
