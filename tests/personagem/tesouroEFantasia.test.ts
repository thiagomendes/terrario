import { describe, expect, it } from 'vitest';
import { aparenciaPadrao, vestirFantasia, type Aparencia } from '../../src/personagem/aparencia';
import { FANTASIAS, temVarinha, type TipoPeca } from '../../src/personagem/fantasias';
import {
  PECAS_DA_CABECA,
  acessorioEscondido,
  aoVestirTesouro,
  oQueSai,
  semOsQueSaem,
  tesourosQueSaem,
  tirarDaFantasia,
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

const comSem = (id: string, sem: TipoPeca[]): Aparencia => {
  const a = comFantasia(id);
  return { ...a, fantasia: { ...a.fantasia!, sem } };
};

describe('036: a cabeça e a mão (a última escolha ganha, com uma peça só à vista)', () => {
  it('toda fantasia que cobre a cabeça tem a peça da cabeça na lista única', () => {
    for (const f of FANTASIAS)
      for (const corpo of ['feminino', 'masculino'] as const) {
        const v = f.visual[corpo];
        if (v.cabeca === 'livre') continue;
        expect(
          v.pecas.some((p) => PECAS_DA_CABECA.includes(p.tipo)),
          `${f.id} ${corpo}`,
        ).toBe(true);
      }
  });

  it('o boné tira só a peça de cabeça que sai sozinha; a que não sai leva a fantasia inteira', () => {
    // o chapéu de palha da fazendeira é opcional: sai só ele
    expect(oQueSai(comFantasia('fazendeira'), {}, { premium: 'bone-helice' })).toEqual([
      { tipo: 'peca', fantasia: 'fazendeira', peca: 'chapeu-palha' },
    ]);
    const a = aoVestirTesouro(comFantasia('fazendeira'), 'bone-helice');
    expect(a.fantasia?.id).toBe('fazendeira');
    expect(a.fantasia?.sem).toEqual(['chapeu-palha']);
    // e aí fantasia e boné ficam juntos sem briga
    expect(tesourosQueSaem(a, { chapeu: 'bone-helice' })).toEqual([]);
    // o capuz do monstrinho não sai sozinho: sai a fantasia
    expect(oQueSai(comFantasia('monstrinho-peludo'), {}, { premium: 'bone-helice' })).toEqual([
      { tipo: 'fantasia', id: 'monstrinho-peludo' },
    ]);
    expect(aoVestirTesouro(comFantasia('monstrinho-peludo'), 'bone-helice').fantasia).toBeUndefined();
    // a coroa do príncipe sai sozinha
    const principe = { ...comFantasia('realeza-estrelas'), corpo: 'masculino' as const };
    expect(oQueSai(principe, {}, { premium: 'bone-helice' })).toEqual([
      { tipo: 'peca', fantasia: 'realeza-estrelas', peca: 'coroa' },
    ]);
    // a fantasia sem nada na cabeça (o herói, de máscara) fica inteira
    const heroi = comFantasia('heroi-estrela');
    expect(oQueSai(heroi, {}, { premium: 'bone-helice' })).toEqual([]);
    expect(aoVestirTesouro(heroi, 'bone-helice')).toBe(heroi);
  });

  it('vestir uma fantasia de cabeça tira o boné; sem a peça da cabeça, o boné fica', () => {
    const v = { chapeu: 'bone-helice', bicho: 'passarinho-ombro', andar: 'patinete-luz' };
    expect(tesourosQueSaem(comFantasia('astronauta'), v)).toEqual(['bone-helice']);
    expect(tesourosQueSaem(comSem('astronauta', ['capacete-bolha']), v)).toEqual([]);
    expect(tesourosQueSaem(comFantasia('patinadora'), v)).toEqual(['bone-helice']);
    expect(tesourosQueSaem(comFantasia('danca-neon'), v)).toEqual([]);
  });

  it('o premium da mão e a varinha ou o cetro da fantasia: vale a última escolha', () => {
    for (const id of ['varinha-bolhas', 'guarda-chuva-gotinhas', 'pipa-lacinhos']) {
      // a varinha da princesa sai sozinha (a fantasia fica; o look padrão é de menino)
      const princesa = aoVestirTesouro(
        { ...comFantasia('realeza-flores'), corpo: 'feminino' },
        id,
      );
      expect(princesa.fantasia?.id).toBe('realeza-flores');
      expect(princesa.fantasia?.sem).toEqual(['varinha']);
      // o cetro do príncipe também
      const principe = { ...comFantasia('realeza-flores'), corpo: 'masculino' as const };
      expect(oQueSai(principe, undefined, { premium: id })).toEqual([
        { tipo: 'peca', fantasia: 'realeza-flores', peca: 'cetro' },
      ]);
      // sem varinha, nada muda
      const vaqueira = comFantasia('vaqueira');
      expect(aoVestirTesouro(vaqueira, id)).toBe(vaqueira);
    }
    // a bruxinha da 027: a varinha sai, e com ela as florzinhas do baile (temVarinha)
    const bruxa = comFantasia('bruxinha-festa');
    expect(temVarinha(bruxa)).toBe(true);
    const comPipa = aoVestirTesouro(bruxa, 'pipa-lacinhos');
    expect(comPipa.fantasia?.id).toBe('bruxinha-festa');
    expect(temVarinha(comPipa)).toBe(false);
    // e o contrário: pôr a varinha de volta (ou vestir a fantasia) tira o premium da mão
    const v = { mao: 'pipa-lacinhos', costas: 'asas-borboleta' };
    expect(tesourosQueSaem(bruxa, v)).toEqual(['pipa-lacinhos', 'asas-borboleta']);
    expect(tesourosQueSaem(comPipa, v)).toEqual(['asas-borboleta']);
  });

  it('a varinha de bolhas não é a varinha da fantasia: nada de florzinhas do baile', () => {
    expect(temVarinha({ ...base(), premium: { mao: 'varinha-bolhas' } })).toBe(false);
  });

  it('as costas novas seguem a capa; o bichinho e os brinquedos de andar ficam com tudo', () => {
    for (const id of ['asas-borboleta', 'mochila-foguete']) {
      expect(aoVestirTesouro(comFantasia('astronauta'), id).fantasia).toBeUndefined();
      const heroi = aoVestirTesouro(comFantasia('heroi-coracao'), id);
      expect(heroi.fantasia?.sem).toEqual(['capa']);
    }
    for (const id of ['passarinho-ombro', 'patinete-luz', 'carrinho-pedal', 'bicicletinha', 'nuvem-fofa']) {
      for (const f of ['astronauta', 'monstrinho-peludo', 'realeza-flores', 'bruxinha-festa'])
        expect(oQueSai(comFantasia(f), {}, { premium: id }), `${id} ${f}`).toEqual([]);
    }
    expect(
      tesourosQueSaem(comFantasia('monstrinho-peludo'), {
        bicho: 'passarinho-ombro',
        andar: 'nuvem-fofa',
      }),
    ).toEqual([]);
    // o pijama é roupa: tira qualquer fantasia
    expect(oQueSai(comFantasia('danca-neon'), {}, { premium: 'pijama-nuvem' })).toEqual([
      { tipo: 'fantasia', id: 'danca-neon' },
    ]);
  });

  it('uma regra só de "o que sai": o tesouro que divide o lugar e a fantasia, nessa ordem', () => {
    const a = comFantasia('fazendeira');
    expect(
      oQueSai(a, { fantasia: 'dragao', mao: 'pipa-lacinhos' }, { premium: 'bone-helice' }),
    ).toEqual([
      { tipo: 'premium', id: 'dragao' },
      { tipo: 'peca', fantasia: 'fazendeira', peca: 'chapeu-palha' },
    ]);
    // sem fantasia: só os tesouros (a mesma lista do saiAoVestir)
    expect(oQueSai(base(), { costas: 'capa-estrelas' }, { premium: 'dragao' })).toEqual([
      { tipo: 'premium', id: 'capa-estrelas' },
    ]);
    expect(oQueSai(base(), {}, { premium: 'nao-existe' })).toEqual([]);
    // a fantasia escolhida: os tesouros que brigam com ela (a fantasia de antes não entra)
    expect(
      oQueSai(a, { roupa: 'tenis-cometa', bicho: 'pinguim' }, { fantasia: { id: 'astronauta', cor: 0 } }),
    ).toEqual([{ tipo: 'premium', id: 'tenis-cometa' }]);
    // aplicar a lista: as peças entram em "sem" sem repetir; a fantasia inteira sai
    const so = tirarDaFantasia(comSem('fazendeira', ['chapeu-palha']), [
      { tipo: 'peca', fantasia: 'fazendeira', peca: 'chapeu-palha' },
    ]);
    expect(so.fantasia?.sem).toEqual(['chapeu-palha']);
    expect(tirarDaFantasia(a, [{ tipo: 'fantasia', id: 'fazendeira' }]).fantasia).toBeUndefined();
    // a peça de outra fantasia não mexe nesta
    expect(
      tirarDaFantasia(a, [{ tipo: 'peca', fantasia: 'vaqueira', peca: 'chapeu-vaqueiro' }]),
    ).toBe(a);
  });

  it('o enfeite do look some debaixo do tesouro do mesmo lugar', () => {
    const look = (acessorio: Aparencia['acessorio'], premium: Aparencia['premium']) =>
      acessorioEscondido({ acessorio, premium });
    expect(look('chapeu', { chapeu: 'bone-helice' })).toBe(true);
    expect(look('capuz', { chapeu: 'bone-helice' })).toBe(true);
    expect(look('oculos', { chapeu: 'bone-helice' })).toBe(false);
    expect(look('lanterna', { mao: 'pipa-lacinhos' })).toBe(true);
    expect(look('lanterna', { chapeu: 'bone-helice' })).toBe(false);
    expect(look('mochila', { costas: 'mochila-foguete' })).toBe(true);
    expect(look('mochila', { mao: 'varinha-bolhas' })).toBe(false);
    expect(look('chapeu', undefined)).toBe(false);
  });
});
