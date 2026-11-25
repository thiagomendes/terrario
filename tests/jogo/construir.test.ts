import { describe, expect, it } from 'vitest';
import {
  FOLGA_MAXIMA,
  blocoApoia,
  corpoDeJogador,
  corpoNaCelula,
  corposNaRegiao,
  folgaDoAmigo,
  recusaConstruir,
  temApoio,
  type Corpo,
  type LerBloco,
} from '../../src/jogo/construir';
import { Bloco } from '../../src/world/blocks';
import { OBRAS, celulasDaObra } from '../../src/world/obras';

/** Spec 037: a regra de construir (a função pura que o núcleo e o cliente usam). */

/** Um mundo de teste: chão sólido em y <= 9 e o que o teste põe. */
function mundo(blocos: Record<string, number> = {}): LerBloco {
  return (x, y, z) => blocos[`${x},${y},${z}`] ?? (y <= 9 ? Bloco.PEDREGULHO : Bloco.AR);
}
const parado = (x: number, y: number, z: number): Corpo =>
  corpoDeJogador({ x, y, z, vel: 0 }, true);

describe('a folga do amigo', () => {
  it('parado não tem folga; andando e correndo cresce até o teto', () => {
    expect(folgaDoAmigo(0)).toBe(0);
    expect(folgaDoAmigo(2)).toBeCloseTo(0.3, 6);
    // andar (4,3) e correr (7) passam do teto de 0,6
    expect(folgaDoAmigo(4.3)).toBe(FOLGA_MAXIMA);
    expect(folgaDoAmigo(7)).toBe(FOLGA_MAXIMA);
    // valor estranho do cliente não vira folga
    expect(folgaDoAmigo(Number.NaN)).toBe(0);
    expect(folgaDoAmigo(-5)).toBe(0);
  });

  it('a folga é só na horizontal e só do amigo (quem coloca vai com a caixa do corpo)', () => {
    const p = { x: 0.5, y: 10, z: 0.5, vel: 7 };
    expect(corpoDeJogador(p, false)).toMatchObject({ mw: 0.3, alt: 1.8 });
    expect(corpoDeJogador(p, true).mw).toBeCloseTo(0.9, 6);
    expect(corpoDeJogador(p, true).alt).toBe(1.8);
  });
});

describe('o corpo na célula', () => {
  it('a caixa de 0,6 × 1,8: as duas células do corpo sim, a de cima e a do lado não', () => {
    const k = parado(5.5, 10, 5.5);
    expect(corpoNaCelula({ x: 5, y: 10, z: 5 }, k)).toBe(true);
    expect(corpoNaCelula({ x: 5, y: 11, z: 5 }, k)).toBe(true);
    expect(corpoNaCelula({ x: 5, y: 12, z: 5 }, k)).toBe(false);
    expect(corpoNaCelula({ x: 6, y: 10, z: 5 }, k)).toBe(false);
    expect(corpoNaCelula({ x: 5, y: 9, z: 5 }, k)).toBe(false);
  });

  it('encostar na face não conta (os pés em cima do bloco, o corpo colado na parede)', () => {
    // em pé em cima da célula
    expect(corpoNaCelula({ x: 0, y: 9, z: 0 }, parado(0.5, 10, 0.5))).toBe(false);
    // colado na parede: o lado do corpo exatamente na face da célula
    expect(corpoNaCelula({ x: 1, y: 10, z: 0 }, parado(0.7, 10, 0.5))).toBe(false);
    expect(corpoNaCelula({ x: 1, y: 10, z: 0 }, parado(0.71, 10, 0.5))).toBe(true);
  });

  it('o amigo andando ocupa a célula do lado; parado, não', () => {
    const celula = { x: 1, y: 10, z: 0 };
    const amigo = (vel: number) => corpoDeJogador({ x: 0.5, y: 10, z: 0.5, vel }, true);
    expect(corpoNaCelula(celula, amigo(0))).toBe(false);
    expect(corpoNaCelula(celula, amigo(4.3))).toBe(true);
  });

  it('só os corpos perto da região entram na conta', () => {
    const perto = parado(3.5, 10, 3.5);
    const longe = parado(30.5, 10, 3.5);
    expect(corposNaRegiao([perto, longe], 3, 10, 3, 3, 10, 3)).toEqual([perto]);
  });
});

describe('o apoio', () => {
  it('no ar, sem nada em volta: sem apoio; qualquer face sólida dá apoio', () => {
    const ler = mundo();
    expect(temApoio({ x: 0, y: 14, z: 0 }, ler)).toBe(false);
    // em cima do chão
    expect(temApoio({ x: 0, y: 10, z: 0 }, ler)).toBe(true);
    // pendurado embaixo, ao lado e em cima de um bloco no ar
    for (const [dx, dy, dz] of [
      [0, 1, 0],
      [0, -1, 0],
      [1, 0, 0],
      [-1, 0, 0],
      [0, 0, 1],
      [0, 0, -1],
    ]) {
      const vizinho = mundo({ [`${dx},${14 + dy},${dz}`]: Bloco.TABUAS });
      expect(temApoio({ x: 0, y: 14, z: 0 }, vizinho)).toBe(true);
    }
  });

  it('a quina não dá apoio', () => {
    expect(temApoio({ x: 0, y: 14, z: 0 }, mundo({ '1,15,1': Bloco.TABUAS }))).toBe(false);
    expect(temApoio({ x: 0, y: 14, z: 0 }, mundo({ '1,13,0': Bloco.TABUAS }))).toBe(false);
  });

  it('a última camada do mundo tem apoio', () => {
    expect(temApoio({ x: 0, y: 0, z: 0 }, () => Bloco.AR)).toBe(true);
  });

  it('tocha, porta aberta, porteira aberta, placa, poste, flor e lavoura não dão apoio', () => {
    const naoSolidos = [
      Bloco.TOCHA,
      Bloco.PORTA_ABERTA,
      Bloco.PORTEIRA_ABERTA,
      Bloco.PLACA,
      Bloco.POSTE,
      Bloco.FLOR,
      Bloco.GRAMA_ALTA,
      Bloco.TRIGO_1,
      Bloco.AGUA,
      Bloco.AR,
    ];
    for (const b of naoSolidos) {
      expect(blocoApoia(b), `bloco ${b}`).toBe(false);
      expect(temApoio({ x: 0, y: 14, z: 0 }, mundo({ '0,13,0': b })), `bloco ${b}`).toBe(false);
    }
    for (const b of [Bloco.TABUAS, Bloco.FOLHAGEM, Bloco.PORTA, Bloco.CERCA, Bloco.VIDRO])
      expect(blocoApoia(b), `bloco ${b}`).toBe(true);
  });
});

describe('a regra inteira', () => {
  const ler = mundo();
  it('o corpo vem antes do apoio, e só bloco sólido prende', () => {
    const k = parado(0.5, 14, 0.5);
    expect(
      recusaConstruir({ bloco: Bloco.TABUAS, celulas: [{ x: 0, y: 14, z: 0 }], ler, corpos: [k] }),
    ).toBe('corpo');
    // a flor não prende ninguém, mas no ar também não fica
    expect(
      recusaConstruir({ bloco: Bloco.FLOR, celulas: [{ x: 0, y: 14, z: 0 }], ler, corpos: [k] }),
    ).toBe('apoio');
    expect(
      recusaConstruir({ bloco: Bloco.FLOR, celulas: [{ x: 0, y: 10, z: 0 }], ler, corpos: [k] }),
    ).toBeNull();
  });

  it('a planta (obra, bolo) e o lote do criativo não têm a regra de apoio, mas têm a do corpo', () => {
    const c = [{ x: 0, y: 14, z: 0 }];
    for (const extra of [{ planejada: true }, { lote: true }]) {
      const livre = recusaConstruir({ bloco: Bloco.TABUAS, celulas: c, ler, corpos: [], ...extra });
      expect(livre).toBeNull();
      expect(
        recusaConstruir({
          bloco: Bloco.TABUAS,
          celulas: c,
          ler,
          corpos: [parado(0.5, 14, 0.5)],
          ...extra,
        }),
      ).toBe('corpo');
    }
  });

  it('a porta pede chão sólido embaixo (parede do lado não basta) e confere as duas metades', () => {
    const porta = (lerP: LerBloco, corpos: Corpo[] = []) =>
      recusaConstruir({
        bloco: Bloco.PORTA,
        celulas: [
          { x: 0, y: 14, z: 0 },
          { x: 0, y: 15, z: 0 },
        ],
        ler: lerP,
        corpos,
      });
    expect(porta(mundo({ '1,14,0': Bloco.TABUAS }))).toBe('apoio');
    expect(porta(mundo({ '0,13,0': Bloco.TABUAS }))).toBeNull();
    expect(porta(mundo({ '0,13,0': Bloco.TOCHA }))).toBe('apoio');
    // alguém pulando por cima: a metade de cima o prende
    expect(porta(mundo({ '0,13,0': Bloco.TABUAS }), [parado(0.5, 15.3, 0.5)])).toBe('corpo');
  });

  it('bicho e peixe contam com o tamanho deles', () => {
    const peixe: Corpo = { x: 0.5, y: 10.2, z: 0.5, mw: 0.2, alt: 0.3 };
    const em = (x: number) =>
      recusaConstruir({ bloco: Bloco.TABUAS, celulas: [{ x, y: 10, z: 0 }], ler, corpos: [peixe] });
    expect(em(0)).toBe('corpo');
    expect(em(1)).toBeNull();
  });
});

describe('as plantas das obras e a regra de apoio', () => {
  it('só o miolo do telhado da casinha (obra 5) não se apoia de baixo para cima', () => {
    // de baixo para cima, cada célula se apoia no chão, no andaime ou numa célula já feita; o
    // que sobra só encosta pela quina e precisa da exceção da planta
    const sem: string[] = [];
    for (const o of OBRAS) {
      const cel = celulasDaObra(o);
      const k = (s: number, f: number, y: number) => `${s},${f},${y}`;
      const andaime = new Set(o.andaime.map(([s, f, y]) => k(s, f, y)));
      const feito = new Set<string>();
      for (let mudou = true; mudou; ) {
        mudou = false;
        for (const c of cel) {
          const ck = k(c.s, c.f, c.y);
          if (feito.has(ck)) continue;
          const viz = [
            [1, 0, 0],
            [-1, 0, 0],
            [0, 1, 0],
            [0, -1, 0],
            [0, 0, 1],
            [0, 0, -1],
          ].map(([ds, dy, df]) => k(c.s + ds, c.f + df, c.y + dy));
          if (c.y === 0 || viz.some((v) => feito.has(v) || andaime.has(v))) {
            feito.add(ck);
            mudou = true;
          }
        }
      }
      for (const c of cel)
        if (!feito.has(k(c.s, c.f, c.y))) sem.push(`${o.id}:${c.s},${c.f},${c.y}`);
    }
    expect(sem).toEqual([
      'casinha:2,3,4',
      'casinha:3,3,4',
      'casinha:4,3,4',
      'casinha:2,4,4',
      'casinha:3,4,4',
      'casinha:4,4,4',
      'casinha:2,5,4',
      'casinha:3,5,4',
      'casinha:4,5,4',
    ]);
  });
});
