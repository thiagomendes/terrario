import { describe, expect, it } from 'vitest';
import { criarInventario } from '../../src/jogo/inventario';
import { registrarBlocos, obterItem } from '../../src/jogo/itens';
import { registrarCatalogo } from '../../src/jogo/catalogo';
import { fazerTroca, podeTrocar, TROCAS } from '../../src/jogo/trocas';
import { PROFISSOES } from '../../src/world/povoado';
import { FUNDICAO, RECEITAS, TAGS, ingredientesDe } from '../../src/jogo/receitas';

registrarBlocos();
registrarCatalogo();

describe('trocas dos moradores', () => {
  it('todas as profissões têm de 3 a 8 trocas com itens que existem', () => {
    for (const p of PROFISSOES) {
      expect(TROCAS[p].length).toBeGreaterThanOrEqual(3);
      expect(TROCAS[p].length).toBeLessThanOrEqual(8);
      for (const t of TROCAS[p]) {
        for (const d of [...t.dar, t.receber]) {
          expect(obterItem(d.item), `${p}/${t.id}: ${d.item}`).toBeTruthy();
          expect(d.qtd).toBeGreaterThan(0);
        }
      }
    }
  });

  it('nenhuma troca dá itens raros (cristal, ouro, luzita)', () => {
    for (const p of PROFISSOES)
      for (const t of TROCAS[p])
        expect(/cristal|ouro|luzita|bloco:39|bloco:19/.test(t.receber.item), t.id).toBe(false);
  });

  it('troca tira exatamente o que pede e dá o item', () => {
    const inv = criarInventario();
    const t = TROCAS.ferreiro.find((x) => x.id === 'tochas')!;
    inv.adicionar('carvao', 5);
    inv.adicionar('graveto', 2);
    expect(podeTrocar(inv, t)).toBe(true);
    expect(fazerTroca(inv, t, () => undefined)).toBe(true);
    expect(inv.contar('carvao')).toBe(3);
    expect(inv.contar('graveto')).toBe(0);
    expect(inv.contar('bloco:37')).toBe(8);
  });

  it('sem os itens, recusa e não muda nada', () => {
    const inv = criarInventario();
    const t = TROCAS.ferreiro.find((x) => x.id === 'tochas')!;
    inv.adicionar('carvao', 5);
    const antes = JSON.stringify(inv.salvar());
    expect(podeTrocar(inv, t)).toBe(false);
    expect(fazerTroca(inv, t, () => undefined)).toBe(false);
    expect(JSON.stringify(inv.salvar())).toBe(antes);
  });

  it('inventário cheio: o que não cabe vai para o chão, sem perder nem duplicar', () => {
    const inv = criarInventario();
    const t = TROCAS.construtor.find((x) => x.id === 'tabuas')!;
    // enche tudo com pedregulho e deixa só os troncos num slot
    for (let i = 0; i < inv.slots.length; i++) inv.definir(i, { item: 'bloco:12', qtd: 64 });
    inv.definir(0, { item: 'bloco:4', qtd: 4 });
    const chao: [string, number][] = [];
    expect(fazerTroca(inv, t, (item, qtd) => chao.push([item, qtd]))).toBe(true);
    const nasMaos = inv.contar('bloco:7');
    const noChao = chao.filter(([i]) => i === 'bloco:7').reduce((n, [, q]) => n + q, 0);
    expect(nasMaos + noChao).toBe(18);
    expect(inv.contar('bloco:4')).toBe(0);
  });
});

describe('nenhum ciclo troca ↔ receita dá item do nada (auditoria 013)', () => {
  /**
   * Toda troca, receita (tags abertas em cada opção) e fundição vira "setas" de cada item
   * que entra para o que sai, com a taxa (quanto sai por unidade que entra). Um ciclo cujo
   * produto das taxas passa de 1 é item de graça: dar a volta rende mais do que custou
   * (o caso achado: 8 trigos → 1 fardo na troca → 9 trigos na receita).
   */
  it('nenhum ciclo de trocas, receitas e fornalha rende mais do que custa', () => {
    const conversoes: { nome: string; dar: Map<string, number>; item: string; qtd: number }[] = [];
    for (const p of PROFISSOES)
      for (const t of TROCAS[p])
        conversoes.push({
          nome: `troca ${p}/${t.id}`,
          dar: new Map(t.dar.map((d) => [d.item, d.qtd])),
          item: t.receber.item,
          qtd: t.receber.qtd,
        });
    for (const r of RECEITAS) {
      const conta = new Map<string, number>();
      for (const c of ingredientesDe(r)) conta.set(c, (conta.get(c) ?? 0) + 1);
      for (const [c, n] of conta)
        for (const o of c.startsWith('#') ? (TAGS[c] ?? []) : [c]) {
          const dar = new Map([[o, n]]);
          conversoes.push({ nome: `receita ${r.id}`, dar, item: r.resultado.item, qtd: r.resultado.qtd });
        }
    }
    for (const [de, para] of Object.entries(FUNDICAO))
      conversoes.push({ nome: `fornalha ${de}`, dar: new Map([[de, 1]]), item: para, qtd: 1 });
    // melhor taxa de cada item para cada outro (em log), com o caminho
    const itens = [...new Set(conversoes.flatMap((c) => [c.item, ...c.dar.keys()]))];
    const ix = new Map(itens.map((v, i) => [v, i]));
    const N = itens.length;
    const melhor = Array.from({ length: N }, () => new Array<number>(N).fill(-Infinity));
    const via = Array.from({ length: N }, () => new Array<string>(N).fill(''));
    for (const c of conversoes)
      for (const [i, q] of c.dar) {
        const a = ix.get(i)!;
        const b = ix.get(c.item)!;
        const w = Math.log(c.qtd / q);
        if (w > melhor[a][b]) {
          melhor[a][b] = w;
          via[a][b] = c.nome;
        }
      }
    for (let k = 0; k < N; k++)
      for (let a = 0; a < N; a++) {
        if (melhor[a][k] === -Infinity) continue;
        for (let b = 0; b < N; b++) {
          const w = melhor[a][k] + melhor[k][b];
          if (w > melhor[a][b] + 1e-9) {
            melhor[a][b] = w;
            via[a][b] = `${via[a][k]} → ${via[k][b]}`;
          }
        }
      }
    const ganhos = itens
      .map((v, i) => ({ item: v, taxa: Math.exp(melhor[i][i]), caminho: via[i][i] }))
      .filter((g) => g.taxa > 1 + 1e-9);
    expect(ganhos).toEqual([]);
  });

  it('a troca do fardo de feno pede mais trigo do que a receita devolve', () => {
    const t = TROCAS.construtor.find((x) => x.id === 'feno')!;
    const volta = RECEITAS.find((r) => r.id === 'trigo_de_feno')!;
    const inv = criarInventario();
    inv.adicionar('trigo', 30);
    for (let i = 0; i < 3; i++) {
      expect(fazerTroca(inv, t, () => undefined)).toBe(true);
      inv.consumir(t.receber.item, 1);
      inv.adicionar('trigo', volta.resultado.qtd);
    }
    expect(inv.contar('trigo')).toBeLessThan(30);
  });
});
