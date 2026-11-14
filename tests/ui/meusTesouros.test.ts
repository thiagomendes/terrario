import { describe, expect, it } from 'vitest';
import { comPremium, tesourosDaCrianca, toqueNoTesouro } from '../../src/ui/meusTesouros';
import { aparenciaPadrao, aplicarModelo, personalizar } from '../../src/personagem/aparencia';
import { sortearAparencia } from '../../src/ui/personagem';

describe('"Meus tesouros" no editor (023)', () => {
  it('a aparência que se vê leva os tesouros vestidos; sem nada vestido, sem o campo', () => {
    const a = aparenciaPadrao();
    expect(comPremium(a, { roupa: 'camiseta-aquario', bicho: 'unicornio' }).premium).toEqual({
      roupa: 'camiseta-aquario',
      bicho: 'unicornio',
    });
    expect('premium' in comPremium({ ...a, premium: { roupa: 'camiseta-aquario' } }, {})).toBe(
      false,
    );
    expect('premium' in comPremium(a, undefined)).toBe(false);
    // id fora do catálogo não passa
    expect(comPremium(a, { roupa: 'nada' } as never).premium).toBeUndefined();
  });

  it('mexer no cabelo, na cor, no modelo e no dado nunca leva o tesouro junto', () => {
    const v = { roupa: 'camiseta-aquario', costas: 'capa-estrelas' } as const;
    const a = aparenciaPadrao();
    for (const outra of [
      personalizar(a, { cabeloEstilo: 3 }),
      personalizar(a, { roupaCor: 4 }),
      aplicarModelo(a, 'exploradora'),
      sortearAparencia(a, () => 0.4),
    ])
      expect(comPremium(outra, v).premium).toEqual(v);
  });

  it('só os comprados, na ordem da vitrine', () => {
    expect(
      tesourosDaCrianca({ premium: ['unicornio', 'camiseta-aquario', 'nao-existe'] }).map(
        (p) => p.id,
      ),
    ).toEqual(['camiseta-aquario', 'unicornio']);
    expect(tesourosDaCrianca({ premium: [] })).toEqual([]);
  });

  it('um toque veste (e diz o que sai do lugar), outro tira', () => {
    expect(toqueNoTesouro({}, 'capa-estrelas')).toEqual({ vestir: true, sai: [] });
    expect(toqueNoTesouro({ costas: 'capa-estrelas' }, 'capa-estrelas')).toEqual({
      vestir: false,
      sai: [],
    });
    // a capa e as asas do dragão dividem as costas
    expect(toqueNoTesouro({ costas: 'capa-estrelas' }, 'dragao')).toEqual({
      vestir: true,
      sai: ['capa-estrelas'],
    });
    expect(toqueNoTesouro({ fantasia: 'dragao', bicho: 'pinguim' }, 'unicornio')).toEqual({
      vestir: true,
      sai: ['pinguim'],
    });
  });
});

describe('miniaturas das escolhas cobertas por um tesouro', () => {
  it('a roupa e a fantasia aparecem sem a camiseta e o dragão; o resto fica', async () => {
    const { semTesouros } = await import('../../src/ui/meusTesouros');
    const a = comPremium(aparenciaPadrao(), {
      roupa: 'camiseta-aquario',
      fantasia: 'dragao',
      bicho: 'pinguim',
    });
    expect(semTesouros(a, ['roupa', 'fantasia']).premium).toEqual({ bicho: 'pinguim' });
    expect('premium' in semTesouros(comPremium(a, { roupa: 'camiseta-aquario' }), ['roupa'])).toBe(
      false,
    );
    const sem = aparenciaPadrao();
    expect(semTesouros(sem, ['roupa'])).toBe(sem);
  });
});
