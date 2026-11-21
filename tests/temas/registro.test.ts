import { describe, expect, it, vi } from 'vitest';

/** Spec 034 (T03): os cinco temas, a Vila Neon como padrão e a base como reserva. */
describe('registro dos temas', () => {
  it('sem os temas registrados (scripts, testes, servidor), tudo cai na base', async () => {
    vi.resetModules();
    const { obterTema, temasDisponiveis, temaExiste } = await import('../../src/temas');
    expect(temasDisponiveis()).toEqual([]);
    for (const id of [undefined, null, '', 'vila-neon', 'tema-estranho']) {
      const t = obterTema(id);
      expect(t.id).toBe('base');
      expect(t.nome).toBe('Base');
    }
    expect(temaExiste('vila-neon')).toBe(false);
  });

  it('com todos registrados: os seis cartões em ordem, e o desconhecido cai na Vila Neon', async () => {
    vi.resetModules();
    await import('../../src/temas/todos');
    const { obterTema, temasDisponiveis, TEMA_PADRAO, temaExiste } = await import(
      '../../src/temas'
    );
    expect(TEMA_PADRAO).toBe('vila-neon');
    // spec 027: a Noite das Fantasias logo depois da Vila (a novidade sem rolar no celular)
    expect(temasDisponiveis()).toEqual([
      'vila-neon',
      'noite-das-fantasias',
      'cidade-grande',
      'rancho-alegre',
      'doce-reino',
      'exploracao-lunar',
    ]);
    for (const id of temasDisponiveis()) expect(obterTema(id).id).toBe(id);
    for (const id of [undefined, null, '', 'tema-estranho']) {
      expect(obterTema(id).id).toBe('vila-neon');
      expect(temaExiste(id)).toBe(false);
    }
    // a base não se escolhe
    expect(temaExiste('base')).toBe(false);
    expect(obterTema('base').id).toBe('vila-neon');
  });
});
