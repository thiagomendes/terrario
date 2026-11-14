import { describe, expect, it } from 'vitest';
import {
  BANCA,
  MISSOES,
  PREMIUM,
  PRESENTES_NIVEL,
  SESSAO,
  XP_DO_NIVEL,
  missoesDoMundo,
  nivelDoXp,
  type MundoAlma,
} from '../../src/esboco/alma/dados';
import {
  abertas,
  comprarBanca,
  comprarPremium,
  criancaVazia,
  definirProgresso,
  mundoVazio,
  normalizarCrianca,
  normalizarMundo,
  registrar,
  vestirPremium,
} from '../../src/esboco/alma/estado';

const MUNDOS: MundoAlma[] = ['cidade-grande', 'rancho-alegre'];

describe('esboço 023: os números', () => {
  it('5 a 8 missões por mundo; a primeira é curta e dá a fantasia especial do mundo', () => {
    for (const mundo of MUNDOS) {
      const lista = missoesDoMundo(mundo);
      expect(lista.length).toBeGreaterThanOrEqual(5);
      expect(lista.length).toBeLessThanOrEqual(8);
      expect(lista[0].minutos[1]).toBeLessThanOrEqual(3);
      expect(lista[0].fantasia).toBeTruthy();
      for (const m of lista) expect(m.moedas).toBeGreaterThanOrEqual(3);
    }
    expect(new Set(MISSOES.map((m) => m.id)).size).toBe(MISSOES.length);
  });

  it('premium: preço fixo, nunca dado por missão nem por nível', () => {
    const ids = new Set(PREMIUM.map((p) => p.id));
    for (const m of MISSOES) expect(ids.has(m.fantasia ?? '')).toBe(false);
    for (const p of PRESENTES_NIVEL) expect(ids.has(p.desenho)).toBe(false);
    expect(PREMIUM.length).toBeGreaterThanOrEqual(8);
    expect(PREMIUM.length).toBeLessThanOrEqual(12);
    expect(PREMIUM.every((p) => Number.isInteger(p.preco) && p.preco > 0)).toBe(true);
    expect(PREMIUM.filter((p) => p.feito).map((p) => p.categoria).sort()).toEqual(['bicho', 'fantasia', 'roupa']);
  });

  it('equilíbrio: o primeiro premium sai em umas 2 sessões; o mais caro leva várias', () => {
    const porSessao = SESSAO.missoes * SESSAO.moedasPorMissao;
    const precos = PREMIUM.map((p) => p.preco).sort((a, b) => a - b);
    const sessoesPrimeiro = precos[0] / porSessao;
    expect(sessoesPrimeiro).toBeGreaterThan(1);
    expect(sessoesPrimeiro).toBeLessThanOrEqual(2);
    expect(precos[precos.length - 1] / porSessao).toBeGreaterThanOrEqual(5);
  });

  it('banca: itens do tema de cada mundo; níveis crescem', () => {
    for (const mundo of MUNDOS) expect(BANCA.some((b) => b.mundo === mundo)).toBe(true);
    for (let i = 1; i < XP_DO_NIVEL.length; i++) expect(XP_DO_NIVEL[i]).toBeGreaterThan(XP_DO_NIVEL[i - 1]);
    expect(nivelDoXp(0).nivel).toBe(1);
    expect(nivelDoXp(40).nivel).toBe(2);
  });
});

describe('esboço 023: o estado', () => {
  it('missão: prêmio igual ao mostrado; carteira e XP são da criança', () => {
    const c = criancaVazia();
    const e = mundoVazio();
    registrar(c, e, 'rancho-alegre', 'colheu', 4);
    const ev = registrar(c, e, 'rancho-alegre', 'colheu');
    expect(ev.find((x) => x.tipo === 'concluiu')).toMatchObject({ moedas: 3, fantasia: 'caipira' });
    expect(c.moedas).toBeGreaterThanOrEqual(3);
    expect(c.fantasias).toEqual(['caipira']);
    expect(c.xp).toBeGreaterThan(20);
    // a mesma carteira serve no outro mundo; o progresso de lá é outro
    expect(abertas(mundoVazio(), 'cidade-grande').map((m) => m.id)).toEqual(['c1', 'c2']);
  });

  it('subir de nível dá o presentinho conhecido e moedinhas', () => {
    const c = criancaVazia();
    const e = mundoVazio();
    const ev = [...definirProgresso(c, e, 'cidade-grande', 'c1', 1), ...registrar(c, e, 'cidade-grande', 'visitou:lugar', 4)];
    const nivel = ev.find((x) => x.tipo === 'nivel');
    expect(nivel).toMatchObject({ nivel: 2, presente: { desenho: 'etiqueta', moedas: 2 } });
    expect(c.moedas).toBe(3 + 2);
  });

  it('lojinha premium: preço fixo, um de cada, veste ao comprar', () => {
    const c = criancaVazia();
    expect(comprarPremium(c, 'tenis-cometa')).toEqual({ ok: false, motivo: 'faltam-moedas' });
    c.moedas = 20;
    expect(comprarPremium(c, 'tenis-cometa')).toEqual({ ok: true });
    expect(c.moedas).toBe(0);
    expect(c.vestidos.roupa).toBe('tenis-cometa');
    c.moedas = 99;
    expect(comprarPremium(c, 'tenis-cometa')).toEqual({ ok: false, motivo: 'ja-tem' });
    expect(vestirPremium(c, 'tenis-cometa', false)).toBe(true);
    expect(c.vestidos.roupa).toBeUndefined();
    expect(vestirPremium(c, 'unicornio', true)).toBe(false);
  });

  it('banca: item de outro mundo não existe aqui', () => {
    const c = criancaVazia();
    c.moedas = 10;
    expect(comprarBanca(c, 'cidade-grande', 'feno')).toEqual({ ok: false, motivo: 'nao-existe' });
    expect(comprarBanca(c, 'rancho-alegre', 'feno')).toEqual({ ok: true });
    expect(c.moedas).toBe(7);
  });

  it('o guardado estranho é limpo', () => {
    const c = normalizarCrianca({ moedas: -4, premium: ['unicornio', 'x'], vestidos: { bicho: 'unicornio', roupa: 'x' } });
    expect(c.moedas).toBe(0);
    expect(c.premium).toEqual(['unicornio']);
    expect(c.vestidos).toEqual({ bicho: 'unicornio' });
    expect(normalizarMundo({ feitas: ['c1', 'r1'] }, 'cidade-grande').feitas).toEqual(['c1']);
  });
});
