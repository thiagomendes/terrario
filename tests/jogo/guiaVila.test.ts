import { describe, expect, it } from 'vitest';
import { alvoDaMissao, chegouAoAlvo, type MundoDoGuia } from '../../src/jogo/guia';
import { missaoPorId } from '../../src/jogo/alma';
import { planoDaVila } from '../../src/world/vilaNeon';

/**
 * Spec 026: o guia da 030 na Vila Neon. f1: o estojo mais perto ainda no chão; f2: a lhama do
 * cercadinho e, com o feno na mão, a grade da plateia; f3: a escadinha e, no palco, a caixa
 * apagada mais perto (com o show, a ponta da passarela).
 */
const plano = planoDaVila(77, { altura: () => 70, nivelMar: 62 });
const p = plano.pontos;
function mundo(o: {
  ins?: boolean[];
  cx?: boolean[];
  show?: unknown;
  feno?: boolean;
  y?: number;
  bichos?: { id: number; tipo: string; x: number; y: number; z: number }[];
}): MundoDoGuia {
  return {
    cidade: null,
    sitios: [],
    bloco: () => 0,
    moradores: () => [],
    vila: plano,
    estadoVila: () => ({
      ins: o.ins ?? [false, false, false],
      cx: o.cx ?? [false, false, false],
      show: o.show ?? null,
      lhamas: [],
    }),
    comFeno: () => !!o.feno,
    pesY: () => o.y ?? plano.h + 1,
    bichos: () => o.bichos ?? [],
  } as unknown as MundoDoGuia;
}
const de = { x: plano.nascimento.x, z: plano.nascimento.z };

describe('o guia na Vila Neon (spec 026)', () => {
  it('f1: leva ao estojo mais perto ainda no chão e some quando os três foram achados', () => {
    const m = missaoPorId('f1')!;
    const a = alvoDaMissao(m, mundo({}), new Set(), de)!;
    const d = (q: readonly number[]) => Math.hypot(q[0] - de.x, q[2] - de.z);
    const perto = [...p.estojos].sort((x, y) => d(x) - d(y))[0];
    expect([a.x, a.z]).toEqual([perto[0], perto[2]]);
    expect(chegouAoAlvo(a, perto[0], perto[2])).toBe(true);
    const i = p.estojos.indexOf(perto);
    const ins = [false, false, false];
    ins[i] = true;
    const b = alvoDaMissao(m, mundo({ ins }), new Set(), de)!;
    expect(b.chave).not.toBe(a.chave);
    expect(alvoDaMissao(m, mundo({ ins: [true, true, true] }), new Set(), de)).toBeNull();
  });

  it('f2: a lhama do cercadinho; com o feno na mão, a grade da plateia', () => {
    const m = missaoPorId('f2')!;
    const c = p.cercado;
    const lhama = { id: 7, tipo: 'cervo', x: c.x0 + 2, y: plano.h + 1, z: c.z0 + 2 };
    const a = alvoDaMissao(m, mundo({ bichos: [lhama] }), new Set(), de)!;
    expect(a.morador).toBe(7);
    const g = alvoDaMissao(m, mundo({ bichos: [lhama], feno: true }), new Set(), de)!;
    expect(g.chave).toBe('grade');
    expect(g.z).toBeGreaterThanOrEqual(p.plateia.z0);
    expect(g.z).toBeLessThanOrEqual(p.plateia.z1 + 1);
  });

  it('f3: a escadinha; no palco, a caixa apagada mais perto; com tudo aceso, a passarela', () => {
    const m = missaoPorId('f3')!;
    const a = alvoDaMissao(m, mundo({}), new Set(), de)!;
    expect(a.chave).toBe('escadinha');
    const noPalco = { x: p.escadinha[0] - 4, z: p.escadinha[2] };
    const b = alvoDaMissao(m, mundo({ y: p.palco.y + 1 }), new Set(), noPalco)!;
    expect(b.chave.startsWith('caixa:')).toBe(true);
    const c = alvoDaMissao(
      m,
      mundo({ y: p.palco.y + 1, cx: [true, true, true] }),
      new Set(),
      noPalco,
    )!;
    expect(c.chave).toBe('passarela');
  });
});
