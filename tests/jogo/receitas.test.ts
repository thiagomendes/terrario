import { describe, expect, it } from 'vitest';
import {
  RECEITAS,
  consumirGrade,
  encontrarReceita,
  podeFazer,
  type Grade,
} from '../../src/jogo/receitas';
import { registrarCatalogo } from '../../src/jogo/catalogo';
import { idDoBloco, obterItem } from '../../src/jogo/itens';
import { Bloco } from '../../src/world/blocks';

registrarCatalogo();
const p = (item: string, qtd = 1) => ({ item, qtd });
const TAB = idDoBloco(Bloco.TABUAS);
const BET = idDoBloco(Bloco.TABUAS_BETULA);

function grade(lado: number, celulas: Record<number, string>): Grade {
  return Array.from({ length: lado * lado }, (_, i) => (celulas[i] ? p(celulas[i]) : null));
}

describe('receitas', () => {
  it('todo resultado e ingrediente fixo existe como item', () => {
    for (const r of RECEITAS) {
      expect(obterItem(r.resultado.item), r.id).toBeDefined();
      const fixos = [...(r.ingredientes ?? []), ...Object.values(r.chaves ?? {})].filter(
        (c) => !c.startsWith('#'),
      );
      for (const f of fixos) expect(obterItem(f), `${r.id}: ${f}`).toBeDefined();
    }
  });

  it('tronco vira 4 tábuas em qualquer posição (sem forma)', () => {
    const r = encontrarReceita(grade(2, { 3: idDoBloco(Bloco.MADEIRA_RETORCIDA) }), 2);
    expect(r?.resultado).toEqual({ item: TAB, qtd: 4 });
  });

  it('forma em qualquer lugar da grade, com tags misturadas', () => {
    // gravetos: duas tábuas na vertical, na coluna da direita da mesa
    expect(encontrarReceita(grade(3, { 2: TAB, 5: BET }), 3)?.id).toBe('graveto');
    expect(encontrarReceita(grade(3, { 2: TAB, 4: BET }), 3)).toBeNull();
  });

  it('picareta exige mesa 3x3 e machado aceita espelho', () => {
    const pic = grade(3, { 0: TAB, 1: TAB, 2: TAB, 4: 'graveto', 7: 'graveto' });
    expect(encontrarReceita(pic, 3)?.resultado.item).toBe('picareta_madeira');
    const mach = grade(3, {
      1: 'lingote_ferro',
      2: 'lingote_ferro',
      4: 'graveto',
      5: 'lingote_ferro',
      7: 'graveto',
    });
    expect(encontrarReceita(mach, 3)?.resultado.item).toBe('machado_ferro');
  });

  it('consumir tira um de cada slot', () => {
    const g: Grade = [p(TAB, 3), null, p(TAB, 1), null];
    expect(consumirGrade(g)).toEqual([p(TAB, 2), null, null, null]);
  });

  it('podeFazer soma itens de uma tag', () => {
    const mesa = RECEITAS.find((r) => r.id === 'mesa')!;
    const inv = new Map([
      [TAB, 2],
      [BET, 2],
    ]);
    expect(podeFazer(mesa, (i) => inv.get(i) ?? 0)).toBe(true);
    inv.set(BET, 1);
    expect(podeFazer(mesa, (i) => inv.get(i) ?? 0)).toBe(false);
  });
});
