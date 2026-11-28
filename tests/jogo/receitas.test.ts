import { describe, expect, it } from 'vitest';
import {
  CATEGORIAS_RECEITA,
  FUNDICAO,
  RECEITAS,
  TAGS,
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

  it('roça (spec 013): pão, fardo de feno e de volta, sementes de abóbora e a fornalha', () => {
    expect(
      encontrarReceita(grade(3, { 3: 'trigo', 4: 'trigo', 5: 'trigo' }), 3)?.resultado,
    ).toEqual({ item: 'pao', qtd: 1 });
    // o pão é na mesa
    expect(encontrarReceita(grade(2, { 0: 'trigo', 1: 'trigo' }), 2)).toBeNull();
    const nove = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [i, 'trigo']));
    expect(encontrarReceita(grade(3, nove), 3)?.resultado).toEqual({
      item: idDoBloco(Bloco.FENO),
      qtd: 1,
    });
    expect(encontrarReceita(grade(2, { 2: idDoBloco(Bloco.FENO) }), 2)?.resultado).toEqual({
      item: 'trigo',
      qtd: 9,
    });
    expect(encontrarReceita(grade(2, { 1: idDoBloco(Bloco.ABOBORA) }), 2)?.resultado).toEqual({
      item: 'semente_abobora',
      qtd: 4,
    });
    expect(FUNDICAO['milho']).toBe('pipoca');
    expect(FUNDICAO['ovo']).toBe('ovo_cozido');
  });

  it('enxada nos 5 materiais, sem trombar com o machado', () => {
    for (const [nivel, mat] of [
      ['madeira', TAB],
      ['pedra', idDoBloco(Bloco.PEDREGULHO)],
      ['cobre', 'lingote_cobre'],
      ['ferro', 'lingote_ferro'],
      ['cristal', 'luzita'],
    ]) {
      const g = grade(3, { 0: mat, 1: mat, 4: 'graveto', 7: 'graveto' });
      expect(encontrarReceita(g, 3)?.resultado.item).toBe(`enxada_${nivel}`);
      expect(obterItem(`enxada_${nivel}`)?.ferramenta?.tipo).toBe('enxada');
      // espelhada também
      expect(
        encontrarReceita(grade(3, { 1: mat, 2: mat, 4: 'graveto', 7: 'graveto' }), 3)?.id,
      ).toBe(`enxada_${nivel}`);
    }
  });

  it('consumir tira um de cada slot', () => {
    const g: Grade = [p(TAB, 3), null, p(TAB, 1), null];
    expect(consumirGrade(g)).toEqual([p(TAB, 2), null, null, null]);
  });

  it('spec 039: nenhuma grade repete outra (cada receita acha ela mesma, com qualquer item da tag)', () => {
    for (const r of RECEITAS) {
      if (!r.forma) continue;
      const maior = Math.max(r.forma.length, ...r.forma.map((l) => l.length));
      const lado = r.mesa || maior > 2 ? 3 : 2;
      // cada item de cada tag, um de cada vez (os outros com o primeiro da tag)
      const opcoes = Object.entries(r.chaves!).flatMap(([letra, chave]) =>
        (chave.startsWith('#') ? TAGS[chave] : [chave]).map((item) => ({ letra, item })),
      );
      for (const troca of [null, ...opcoes]) {
        const celulas: Record<number, string> = {};
        r.forma.forEach((linha, y) =>
          [...linha].forEach((ch, x) => {
            if (ch === ' ') return;
            const chave = r.chaves![ch];
            const item =
              troca?.letra === ch ? troca.item : chave.startsWith('#') ? TAGS[chave][0] : chave;
            celulas[y * lado + x] = item;
          }),
        );
        expect(
          encontrarReceita(grade(lado, celulas), lado)?.id,
          `${r.id} ${troca?.item ?? ''}`,
        ).toBe(r.id);
      }
    }
  });

  it('spec 039 e 039b: os treze móveis na categoria casa, na mesa, e o ferro de verdade onde pede', () => {
    const casa = RECEITAS.filter((r) => r.categoria === 'casa');
    const blocos = casa.map((r) => obterItem(r.resultado.item)?.bloco ?? -1);
    expect(new Set(blocos)).toEqual(
      new Set([
        Bloco.CAMA,
        Bloco.SOFA,
        Bloco.CADEIRA,
        Bloco.CRIADO_MUDO,
        Bloco.ABAJUR,
        Bloco.TAPETE,
        Bloco.PIA,
        Bloco.GUARDA_ROUPA,
        // spec 039b: a parte 2
        Bloco.FOGAO,
        Bloco.GELADEIRA,
        Bloco.MESA,
        Bloco.TV,
        Bloco.SOM,
      ]),
    );
    expect(casa).toHaveLength(13);
    for (const r of casa) expect(r.mesa, r.id).toBe(true);
    for (const id of ['pia', 'geladeira', 'fogao', 'tv', 'som'])
      expect(Object.values(RECEITAS.find((r) => r.id === id)!.chaves!), id).toContain(
        'lingote_ferro',
      );
    // a mesa da casa não tem ferro (tábuas e gravetos)
    expect(Object.values(RECEITAS.find((r) => r.id === 'mesa_casa')!.chaves!)).not.toContain(
      'lingote_ferro',
    );
    for (const r of RECEITAS) expect(CATEGORIAS_RECEITA, r.id).toContain(r.categoria);
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
