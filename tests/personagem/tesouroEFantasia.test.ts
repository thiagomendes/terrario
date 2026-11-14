import { describe, expect, it } from 'vitest';
import { aparenciaPadrao, vestirFantasia, type Aparencia } from '../../src/personagem/aparencia';
import { FANTASIAS } from '../../src/personagem/fantasias';
import {
  aoVestirTesouro,
  semOsQueSaem,
  tesourosQueSaem,
} from '../../src/personagem/tesouroEFantasia';

const base = (): Aparencia => aparenciaPadrao();
const comFantasia = (id: string): Aparencia => vestirFantasia(base(), id);

describe('fantasia e tesouro: a última escolha ganha (023)', () => {
  it('escolher qualquer fantasia tira a camiseta, o tênis e o dragão; o bichinho fica', () => {
    for (const f of FANTASIAS) {
      const a = comFantasia(f.id);
      expect(tesourosQueSaem(a, { roupa: 'camiseta-aquario', bicho: 'unicornio' })).toEqual([
        'camiseta-aquario',
      ]);
      expect(tesourosQueSaem(a, { roupa: 'tenis-cometa' })).toEqual(['tenis-cometa']);
      expect(tesourosQueSaem(a, { fantasia: 'dragao', bicho: 'pinguim' })).toEqual(['dragao']);
    }
  });

  it('sem fantasia, nada sai', () => {
    expect(tesourosQueSaem(base(), { roupa: 'camiseta-aquario', costas: 'capa-estrelas' })).toEqual(
      [],
    );
  });

  it('a capa de estrelas só sai com fantasia que usa as costas', () => {
    const v = { costas: 'capa-estrelas' } as const;
    expect(tesourosQueSaem(comFantasia('astronauta'), v)).toEqual(['capa-estrelas']);
    const heroi = FANTASIAS.find((f) => f.grupo === 'herois')!;
    expect(tesourosQueSaem(comFantasia(heroi.id), v)).toEqual(['capa-estrelas']);
    // a capa do herói tirada: as costas estão livres
    const semCapa = comFantasia(heroi.id);
    semCapa.fantasia = { ...semCapa.fantasia!, sem: ['capa'] };
    expect(tesourosQueSaem(semCapa, v)).toEqual([]);
    expect(tesourosQueSaem(comFantasia('fazendeira'), v)).toEqual([]);
  });

  it('vestir camiseta, tênis ou dragão por cima tira a fantasia inteira', () => {
    for (const id of ['camiseta-aquario', 'tenis-cometa', 'dragao']) {
      const a = aoVestirTesouro(comFantasia('astronauta'), id);
      expect(a.fantasia).toBeUndefined();
    }
  });

  it('o bichinho não mexe na fantasia (o mesmo objeto)', () => {
    const a = comFantasia('astronauta');
    expect(aoVestirTesouro(a, 'unicornio')).toBe(a);
    expect(aoVestirTesouro(base(), 'camiseta-aquario').fantasia).toBeUndefined();
  });

  it('a capa de estrelas tira só a capa da fantasia; a mochila do astronauta tira tudo', () => {
    const heroi = FANTASIAS.find((f) => f.grupo === 'herois')!;
    const a = aoVestirTesouro(comFantasia(heroi.id), 'capa-estrelas');
    expect(a.fantasia?.id).toBe(heroi.id);
    expect(a.fantasia?.sem).toContain('capa');
    // e aí a fantasia e a capa ficam juntas sem briga
    expect(tesourosQueSaem(a, { costas: 'capa-estrelas' })).toEqual([]);
    expect(aoVestirTesouro(comFantasia('astronauta'), 'capa-estrelas').fantasia).toBeUndefined();
    const fazenda = comFantasia('fazendeira');
    expect(aoVestirTesouro(fazenda, 'capa-estrelas')).toBe(fazenda);
  });

  it('a miniatura da fantasia mostra só os tesouros que ficam com ela', () => {
    const a = {
      ...comFantasia('astronauta'),
      premium: { roupa: 'camiseta-aquario', costas: 'capa-estrelas', bicho: 'pinguim' },
    } as Aparencia;
    expect(semOsQueSaem(a).premium).toEqual({ bicho: 'pinguim' });
    const so = {
      ...comFantasia('astronauta'),
      premium: { roupa: 'camiseta-aquario' },
    } as Aparencia;
    expect('premium' in semOsQueSaem(so)).toBe(false);
  });
});
