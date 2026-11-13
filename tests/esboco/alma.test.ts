import { describe, expect, it } from 'vitest';
import {
  HABILIDADES,
  LOJA,
  MISSOES,
  lojaDoMundo,
  missoesDoMundo,
  moedasDoMundo,
  type MundoAlma,
} from '../../src/esboco/alma/dados';
import {
  abertas,
  comprar,
  definirProgresso,
  estadoVazio,
  normalizarEstado,
  registrar,
  concluirBis,
} from '../../src/esboco/alma/estado';

const MUNDOS: MundoAlma[] = ['cidade-grande', 'rancho-alegre'];

describe('esboço 023: os números', () => {
  it('5 a 8 missões por mundo, de poucos minutos, com prêmio fixo', () => {
    for (const mundo of MUNDOS) {
      const lista = missoesDoMundo(mundo);
      expect(lista.length).toBeGreaterThanOrEqual(5);
      expect(lista.length).toBeLessThanOrEqual(8);
      for (const m of lista) {
        expect(m.moedas).toBeGreaterThan(0);
        expect(m.minutos[1]).toBeLessThanOrEqual(m.devagar ? 10 : 8);
      }
      // a primeira missão é curta e dá fantasia (como a casinha do cachorro, que prendeu)
      expect(lista[0].minutos[1]).toBeLessThanOrEqual(3);
      expect(lista[0].fantasia).toBeTruthy();
    }
    expect(new Set(MISSOES.map((m) => m.id)).size).toBe(MISSOES.length);
  });

  it('o que cada nível libera existe na lojinha do mesmo mundo (nada vaza de tema)', () => {
    for (const mundo of MUNDOS) {
      const ids = new Set(lojaDoMundo(mundo).map((i) => i.id));
      for (const h of HABILIDADES[mundo])
        for (const n of h.niveis.slice(0, 2)) expect(ids.has(n.libera), `${mundo} ${n.libera}`).toBe(true);
    }
  });

  it('com as missões dá para comprar uma boa parte da lojinha (e o mais barato logo)', () => {
    for (const mundo of MUNDOS) {
      const venda = lojaDoMundo(mundo).filter((i) => !i.presente);
      const barato = Math.min(...venda.map((i) => i.preco));
      const m = missoesDoMundo(mundo);
      expect(m[0].moedas + m[1].moedas).toBeGreaterThanOrEqual(barato);
      expect(moedasDoMundo(mundo)).toBeGreaterThanOrEqual(25);
    }
    expect(LOJA.every((i) => Number.isInteger(i.preco) && i.preco >= 0)).toBe(true);
  });
});

describe('esboço 023: o estado', () => {
  it('missão por evento: progresso, prêmio igual ao mostrado e nível', () => {
    const e = estadoVazio();
    let ev = registrar(e, 'rancho-alegre', 'colheu', 4);
    expect(ev.some((x) => x.tipo === 'progresso')).toBe(true);
    ev = registrar(e, 'rancho-alegre', 'colheu');
    const fim = ev.find((x) => x.tipo === 'concluiu');
    expect(fim).toMatchObject({ moedas: 3, fantasia: 'caipira' });
    expect(e.moedas).toBe(3);
    expect(e.fantasias).toEqual(['caipira']);
  });

  it('toda missão aberta conta, fixada ou não', () => {
    const e = estadoVazio();
    e.fixada = 'c2';
    definirProgresso(e, 'cidade-grande', 'c1', 0.5);
    expect(e.progresso.c1).toBe(0.5);
    expect(abertas(e, 'cidade-grande').map((m) => m.id)).toEqual(['c1', 'c2']);
  });

  it('lojinha: preço fixo, item trancado, sem moedas, uma fantasia só', () => {
    const e = estadoVazio();
    expect(comprar(e, 'cidade-grande', 'turista')).toEqual({ ok: false, motivo: 'trancado' });
    expect(comprar(e, 'cidade-grande', 'poste')).toEqual({ ok: false, motivo: 'faltam-moedas' });
    e.moedas = 5;
    expect(comprar(e, 'cidade-grande', 'poste')).toEqual({ ok: true });
    expect(e.moedas).toBe(0);
    expect(comprar(e, 'cidade-grande', 'capacete-dourado')).toEqual({ ok: false, motivo: 'presente' });
    // item de outro mundo não existe aqui
    e.moedas = 50;
    expect(comprar(e, 'cidade-grande', 'feno')).toEqual({ ok: false, motivo: 'nao-existe' });
  });

  it('presente de nível chega sozinho; bis só depois da lista toda', () => {
    const e = estadoVazio();
    registrar(e, 'rancho-alegre', 'fabricou:pao', 2);
    expect(e.meus).toContain('pipoca');
    expect(concluirBis(e, 'rancho-alegre', 'r1')).toEqual([]);
  });

  it('o guardado estranho é limpo', () => {
    const e = normalizarEstado({ moedas: -4, feitas: ['c1', 'r1', 'x'], meus: ['feno', 'poste'] }, 'cidade-grande');
    expect(e.moedas).toBe(0);
    expect(e.feitas).toEqual(['c1']);
    expect(e.meus).toEqual(['poste']);
  });
});
