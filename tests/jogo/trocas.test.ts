import { describe, expect, it } from 'vitest';
import { criarInventario } from '../../src/jogo/inventario';
import { registrarBlocos, obterItem } from '../../src/jogo/itens';
import { registrarCatalogo } from '../../src/jogo/catalogo';
import { fazerTroca, podeTrocar, TROCAS } from '../../src/jogo/trocas';
import { PROFISSOES } from '../../src/world/povoado';

registrarBlocos();
registrarCatalogo();

describe('trocas dos moradores', () => {
  it('todas as profissões têm de 3 a 7 trocas com itens que existem', () => {
    for (const p of PROFISSOES) {
      expect(TROCAS[p].length).toBeGreaterThanOrEqual(3);
      expect(TROCAS[p].length).toBeLessThanOrEqual(7);
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
