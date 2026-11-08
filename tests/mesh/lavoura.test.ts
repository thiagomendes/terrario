import { describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import {
  PLANTAS_BRINQUEDO,
  estagioDaLavoura,
  plantaDeBrinquedo,
  type AlvoPlanta,
} from '../../src/mesh/plantasBrinquedo';
import { Bloco } from '../../src/world/blocks';
import { obterTema, temasDisponiveis } from '../../src/temas';

/** Monta a peça da planta numa célula na origem (sorte fixa) e devolve os vértices. */
function peca(id: number): AlvoPlanta {
  const alvo: AlvoPlanta = {
    posicoes: [],
    normais: [],
    uvs: [],
    cores: [],
    luz: [],
    indices: [],
    get vertices() {
      return this.posicoes.length / 3;
    },
  };
  expect(plantaDeBrinquedo(id, 0, 0, 0, alvo, [0, 0], [1, 0], () => 0.5, true)).toBe(true);
  return alvo;
}
const altura = (a: AlvoPlanta) => Math.max(...a.posicoes.filter((_, i) => i % 3 === 1));

const LAVOURAS = {
  trigo: [Bloco.TRIGO_0, Bloco.TRIGO_1, Bloco.TRIGO_2, Bloco.TRIGO_3],
  milho: [Bloco.MILHO_0, Bloco.MILHO_1, Bloco.MILHO_2, Bloco.MILHO_3],
  aboboreira: [Bloco.ABOBOREIRA_0, Bloco.ABOBOREIRA_1, Bloco.ABOBOREIRA_2, Bloco.ABOBOREIRA_3],
};

describe('lavoura de brinquedo (spec 013)', () => {
  it.each(Object.entries(LAVOURAS))('%s: os 4 estágios têm peça própria', (planta, ids) => {
    for (const [e, id] of ids.entries()) {
      expect(PLANTAS_BRINQUEDO).toContain(id);
      expect(estagioDaLavoura(id)).toEqual({ planta, estagio: e });
      expect(peca(id).vertices).toBeGreaterThan(0);
    }
    // cada estágio é diferente do anterior (forma ou tamanho), para ver crescer
    for (let e = 1; e < 4; e++)
      expect(peca(ids[e]).posicoes).not.toEqual(peca(ids[e - 1]).posicoes);
  });

  it.each(Object.entries(LAVOURAS))(
    '%s: cresce (cada estágio mais alto ou mais cheio)',
    (_p, ids) => {
      const pecas = ids.map(peca);
      for (let e = 1; e < 4; e++) {
        const maior = altura(pecas[e]) > altura(pecas[e - 1]) + 0.02;
        const cheio = pecas[e].vertices > pecas[e - 1].vertices * 1.2;
        expect(maior || cheio, `estágio ${e}`).toBe(true);
      }
      // o brotinho do plantio é baixo; o trigo e o milho maduros, bem altos
      expect(altura(pecas[0])).toBeLessThan(0.2);
      expect(altura(pecas[3])).toBeGreaterThan(0.45);
    },
  );

  it('o milho maduro passa da altura de um bloco (dá para ver de longe)', () => {
    expect(altura(peca(Bloco.MILHO_3))).toBeGreaterThan(1);
  });

  it('nada da lavoura vira não-lavoura', () => {
    expect(estagioDaLavoura(Bloco.FLOR)).toBeNull();
    expect(estagioDaLavoura(Bloco.TERRA_ARADA)).toBeNull();
    expect(estagioDaLavoura(Bloco.FENO)).toBeNull();
  });
});

describe('nomes da lavoura nos temas', () => {
  it.each(temasDisponiveis())('%s: estágios numerados com o mesmo nome de planta', (id) => {
    const t = obterTema(id);
    for (const ids of Object.values(LAVOURAS)) {
      const nomes = ids.map((b) => t.textos.blocos[b]);
      for (const n of nomes) expect(n, `bloco sem nome em ${id}`).toBeTruthy();
      const base = nomes[0].replace(/ \(1 de 4\)$/, '');
      expect(nomes[0]).toBe(`${base} (1 de 4)`);
      expect(nomes[1]).toBe(`${base} (2 de 4)`);
      expect(nomes[2]).toBe(`${base} (3 de 4)`);
      expect(nomes[3]).not.toMatch(/de 4\)/);
    }
  });
});
