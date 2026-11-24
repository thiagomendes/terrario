import { describe, expect, it } from 'vitest';
import {
  ABAS_LOJA,
  CHAVE_LOJA_NOVIDADES,
  NOVOS_036,
  criarNovidadesLoja,
} from '../../src/ui/alma/lojaNovidades';
import { CATEGORIAS_PREMIUM, PREMIUM } from '../../src/jogo/alma';
import { CHAVE_ALMA_CRIANCA } from '../../src/personagem/almaCrianca';

/**
 * Spec 036 (T06): a lembrança da vitrine no aparelho, numa chave própria: a aba de andar na
 * primeira visita, depois a aba em que ela estava; a estrelinha de novo até abrir o detalhe.
 */
function memoria() {
  const m = new Map<string, string>();
  return { m, arm: { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } };
}

describe('spec 036 (T06): a vitrine lembra a aba e as novidades', () => {
  it('as abas cobrem todo lugar do catálogo, uma vez cada', () => {
    expect([...ABAS_LOJA].sort()).toEqual([...CATEGORIAS_PREMIUM].sort());
    for (const id of NOVOS_036) expect(PREMIUM.some((p) => p.id === id)).toBe(true);
    expect(NOVOS_036).toHaveLength(12);
  });

  it('a primeira visita abre na aba de andar; depois, na aba de onde ela saiu', () => {
    const { arm } = memoria();
    const n = criarNovidadesLoja(arm);
    expect(n.abrir()).toBe('andar');
    n.guardarAba('costas');
    expect(criarNovidadesLoja(arm).abrir()).toBe('costas');
  });

  it('a estrelinha fica até abrir o detalhe, e a aba perde a dela com o último', () => {
    const { arm } = memoria();
    const n = criarNovidadesLoja(arm);
    expect(n.novo('pipa-lacinhos')).toBe(true);
    expect(n.novo('capa-estrelas')).toBe(false);
    expect(n.abaComNovo('mao')).toBe(true);
    expect(n.abaComNovo('fantasia')).toBe(false);
    for (const id of ['varinha-bolhas', 'guarda-chuva-gotinhas']) expect(n.ver(id)).toBe(true);
    expect(n.abaComNovo('mao')).toBe(true);
    expect(n.ver('pipa-lacinhos')).toBe(true);
    expect(n.ver('pipa-lacinhos')).toBe(false);
    expect(n.abaComNovo('mao')).toBe(false);
    // outra página do mesmo aparelho lembra
    expect(criarNovidadesLoja(arm).novo('pipa-lacinhos')).toBe(false);
  });

  it('mora na chave própria (o perfil da criança não é tocado); guardado estragado começa de novo', () => {
    const { m, arm } = memoria();
    const n = criarNovidadesLoja(arm);
    n.abrir();
    n.ver('bicicletinha');
    expect([...m.keys()]).toEqual([CHAVE_LOJA_NOVIDADES]);
    expect(m.has(CHAVE_ALMA_CRIANCA)).toBe(false);
    m.set(CHAVE_LOJA_NOVIDADES, '{quebrado');
    const n2 = criarNovidadesLoja(arm);
    expect(n2.novo('bicicletinha')).toBe(true);
    expect(n2.abrir()).toBe('andar');
  });

  it('sem armazenamento, vale só nesta página', () => {
    const n = criarNovidadesLoja(null);
    expect(n.abrir()).toBe('andar');
    n.guardarAba('bicho');
    n.ver('passarinho-ombro');
    expect(n.novo('passarinho-ombro')).toBe(false);
    expect(n.abrir()).toBe('bicho');
  });
});
