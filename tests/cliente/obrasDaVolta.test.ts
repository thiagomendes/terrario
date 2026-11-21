import { describe, expect, it } from 'vitest';
import { obrasQueFicaramProntas } from '../../src/cliente/obrasDaVolta';

/** Spec 035, seção 3: as obras do canteiro que ficaram prontas com a criança fora. */
describe('as obras da volta', () => {
  const ajudantes = (...nomes: string[]) => nomes.map((n, i) => [`id-${n || i}`, n]);

  it('só as feitas lá e não aqui, em ordem, com os nomes da placa', () => {
    const aqui = new Map([
      [1, { feita: true }],
      [2, { feita: false }],
    ]);
    const la = {
      '4': { cheias: [], ajudantes: ajudantes('caio'), feita: true },
      '1': { cheias: [], ajudantes: ajudantes('ana'), feita: true },
      '2': { cheias: [0, 1], ajudantes: ajudantes('ana', '', 'bia'), feita: true },
      '3': { cheias: [0], ajudantes: ajudantes('bia') },
    };
    expect(obrasQueFicaramProntas(aqui, la)).toEqual([
      { canteiro: 2, nomes: ['ana', 'bia'] },
      { canteiro: 4, nomes: ['caio'] },
    ]);
  });

  it('a obra feita não desfaz, e o bem-vindo sem obras (ou estragado) não muda nada', () => {
    const aqui = new Map([[1, { feita: true }]]);
    expect(obrasQueFicaramProntas(aqui, {})).toEqual([]);
    expect(obrasQueFicaramProntas(aqui, undefined)).toEqual([]);
    expect(obrasQueFicaramProntas(aqui, { '9': { feita: true }, x: 1 })).toEqual([]);
    expect(obrasQueFicaramProntas(new Map(), 'lixo')).toEqual([]);
  });
});
