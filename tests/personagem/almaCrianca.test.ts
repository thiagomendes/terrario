import { describe, expect, it } from 'vitest';
import {
  CHAVE_ALMA_CRIANCA,
  carregarPerfilAlma,
  criarPerfilCrianca,
  salvarPerfilAlma,
  type AvisoPerfil,
} from '../../src/personagem/almaCrianca';
import { CHAVE_APARENCIA, carregarAparencia } from '../../src/personagem/persistencia';
import { perfilAlmaVazio, VERSAO_PERFIL_ALMA } from '../../src/jogo/alma';

function memoria() {
  const m = new Map<string, string>();
  return {
    m,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  };
}

describe('perfil da criança no aparelho (023, T02)', () => {
  it('chave ao lado da aparência; vazio sem nada guardado ou com lixo', () => {
    expect(CHAVE_ALMA_CRIANCA).toBe('terrario:alma-crianca');
    expect(CHAVE_APARENCIA).toBe('terrario:aparencia');
    const a = memoria();
    expect(carregarPerfilAlma(a)).toEqual(perfilAlmaVazio());
    a.m.set(CHAVE_ALMA_CRIANCA, '{quebrado');
    expect(carregarPerfilAlma(a)).toEqual(perfilAlmaVazio());
    expect(carregarPerfilAlma(null)).toEqual(perfilAlmaVazio());
  });
  it('guarda com versão (pronto para a migração da 024) e relê igual', () => {
    const a = memoria();
    const p = perfilAlmaVazio();
    p.moedas = 12;
    p.xp = 41.2;
    salvarPerfilAlma(a, p);
    const lido = JSON.parse(a.m.get(CHAVE_ALMA_CRIANCA)!);
    expect(lido.versao).toBe(VERSAO_PERFIL_ALMA);
    expect(carregarPerfilAlma(a)).toEqual(p);
  });
  it('aplica só o ganho do núcleo, com os presentes de nível, e avisa', () => {
    const a = memoria();
    const pc = criarPerfilCrianca(a);
    const avisos: AvisoPerfil[] = [];
    pc.ouvir((_p, av) => avisos.push(av));
    const m = pc.aplicarGanho({ moedas: 3, xp: 47.6, pontos: { construtor: 7.6 } }, ['capacete-obra']);
    expect(m.niveis.map((n) => n.nivel)).toEqual([2]);
    expect(pc.perfil.moedas).toBe(5);
    expect(pc.perfil.fantasias).toEqual(['capacete-obra']);
    expect(avisos[0].tipo).toBe('ganho');
    // guardado: outra página lê o mesmo
    expect(criarPerfilCrianca(a).perfil.moedas).toBe(5);
  });
  it('banca: desconta o preço confirmado; lojinha: compra, veste e tira', () => {
    const a = memoria();
    const pc = criarPerfilCrianca(a);
    pc.aplicarGanho({ moedas: 30, xp: 0, pontos: {} });
    pc.descontarBanca('feno', 3);
    expect(pc.perfil.moedas).toBe(27);
    expect(pc.comprarPremium('unicornio')).toEqual({ ok: false, motivo: 'faltam-moedas' });
    expect(pc.comprarPremium('tenis-cometa')).toEqual({ ok: true });
    expect(pc.perfil.vestidos).toEqual({ roupa: 'tenis-cometa' });
    expect(pc.vestirPremium('tenis-cometa', false)).toBe(true);
    expect(pc.perfil.vestidos).toEqual({});
    expect(pc.perfil.gastou).toBe(23);
  });
  it('duas abas: cada mudança relê o guardado (nada se perde)', () => {
    const a = memoria();
    const aba1 = criarPerfilCrianca(a);
    const aba2 = criarPerfilCrianca(a);
    aba1.aplicarGanho({ moedas: 3, xp: 0, pontos: {} });
    aba2.aplicarGanho({ moedas: 4, xp: 0, pontos: {} });
    expect(aba1.perfil.moedas).toBe(7);
  });
  it('sem armazenamento, vive na página', () => {
    const pc = criarPerfilCrianca(null);
    pc.aplicarGanho({ moedas: 2, xp: 0, pontos: {} });
    expect(pc.perfil.moedas).toBe(2);
  });
});

describe('a camiseta arco-íris virou a camiseta aquário (o site já vendia a de antes)', () => {
  it('o guardado de antes continua com a camiseta comprada e vestida, com o nome novo', () => {
    const a = memoria();
    // o perfil como o site de antes guardava (comprou a camiseta e o unicórnio, veste os dois)
    a.m.set(
      CHAVE_ALMA_CRIANCA,
      JSON.stringify({
        versao: 1,
        moedas: 3,
        xp: 120,
        pontos: {},
        premium: ['camiseta-arco-iris', 'unicornio'],
        vestidos: { roupa: 'camiseta-arco-iris', bicho: 'unicornio' },
        fantasias: [],
        ganhou: 98,
        gastou: 95,
      }),
    );
    const p = carregarPerfilAlma(a);
    expect(p.premium).toEqual(['camiseta-aquario', 'unicornio']);
    expect(p.vestidos).toEqual({ roupa: 'camiseta-aquario', bicho: 'unicornio' });
    expect(p.moedas).toBe(3);
    // a criança não paga de novo, e tirar e vestir pelo id de antes também vale
    const pc = criarPerfilCrianca(a);
    expect(pc.comprarPremium('camiseta-aquario')).toEqual({ ok: false, motivo: 'ja-tem' });
    expect(pc.comprarPremium('camiseta-arco-iris')).toEqual({ ok: false, motivo: 'ja-tem' });
    expect(pc.vestirPremium('camiseta-arco-iris', false)).toBe(true);
    expect(pc.perfil.vestidos.roupa).toBeUndefined();
    expect(pc.vestirPremium('camiseta-aquario', true)).toBe(true);
    // relido do aparelho, já sai com o id novo (o antigo não volta)
    const guardado = a.m.get(CHAVE_ALMA_CRIANCA)!;
    expect(guardado).not.toContain('arco-iris');
    expect(JSON.parse(guardado).vestidos.roupa).toBe('camiseta-aquario');
    // as duas no guardado (não deveria acontecer, mas não vira duas camisetas)
    a.m.set(
      CHAVE_ALMA_CRIANCA,
      JSON.stringify({ ...JSON.parse(guardado), premium: ['camiseta-arco-iris', 'camiseta-aquario'] }),
    );
    expect(carregarPerfilAlma(a).premium).toEqual(['camiseta-aquario']);
  });
  it('a aparência guardada de antes (vestindo a de antes) veste a nova', () => {
    const a = memoria();
    a.m.set(
      CHAVE_APARENCIA,
      JSON.stringify({ versao: 1, aparencia: { premium: { roupa: 'camiseta-arco-iris', bicho: 'pinguim' } } }),
    );
    expect(carregarAparencia(a).premium).toEqual({ roupa: 'camiseta-aquario', bicho: 'pinguim' });
  });
});
