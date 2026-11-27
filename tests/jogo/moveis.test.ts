import { describe, expect, it } from 'vitest';
import { Bloco, obterBloco } from '../../src/world/blocks';
import { caixasDoBloco } from '../../src/world/formas';
import { criarEdicoes } from '../../src/world/edicoes';
import { criarMundoSolido } from '../../src/world/solido';
import { colar, copiar } from '../../src/jogo/construcao';
import { recusaConstruir } from '../../src/jogo/construir';
import {
  FORMA_CAMA,
  FORMA_TAPETE,
  acesoOuApagado,
  celulasDoMovel,
  ehMovel,
  formaDoMovel,
  metaDoMovel,
  movelEm,
  parteDoMeta,
  pecaSolta,
  type LeitorMoveis,
} from '../../src/jogo/moveis';
import { gruposDoLote, type EntradaLote } from '../../src/jogo/loteMoveis';

/**
 * Spec 039 (T01): a tabela dos móveis de várias células, a âncora, a peça solta, a colisão e o
 * lote do criativo (o colar girado mantém os móveis inteiros). Tudo puro, sem núcleo.
 */

/** Um mundo de mentira: um mapa célula → [bloco, meta, dono], com chão de tábua em y = 0. */
function mundo() {
  const m = new Map<string, [number, number, number]>();
  const k = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const l: LeitorMoveis & {
    por(x: number, y: number, z: number, b: number, meta?: number, dono?: number): void;
    m: typeof m;
  } = {
    m,
    bloco: (x, y, z) => (y === 0 ? Bloco.TABUAS : (m.get(k(x, y, z))?.[0] ?? Bloco.AR)),
    meta: (x, y, z) => m.get(k(x, y, z))?.[1] ?? 0,
    dono: (x, y, z) => m.get(k(x, y, z))?.[2] ?? 0,
    por(x, y, z, b, meta = 0, dono = 0) {
      if (b === Bloco.AR) m.delete(k(x, y, z));
      else m.set(k(x, y, z), [b, meta, dono]);
    },
  };
  return l;
}

/** Põe o móvel inteiro, parte por parte (como o núcleo grava). */
function porMovel(l: ReturnType<typeof mundo>, b: number, x: number, y: number, z: number, d: number, dono = 0) {
  for (const c of celulasDoMovel(b, x, y, z, d)) l.por(c.x, c.y, c.z, b, metaDoMovel(d, c.parte), dono);
}

const pos = (cs: { x: number; y: number; z: number }[]) => cs.map(({ x, y, z }) => [x, y, z]);

describe('a tabela dos móveis', () => {
  it('cada móvel tem uma parte por célula, sem repetir, e a âncora é a 0 na origem', () => {
    const moveis = [
      Bloco.SOFA,
      Bloco.CADEIRA,
      Bloco.CRIADO_MUDO,
      Bloco.CRIADO_MUDO_ACESO,
      Bloco.ABAJUR,
      Bloco.ABAJUR_ACESO,
      Bloco.PIA,
      Bloco.GUARDA_ROUPA,
    ];
    const tamanhos: Record<number, [number, number, number]> = {
      [Bloco.SOFA]: [2, 1, 1],
      [Bloco.CADEIRA]: [1, 1, 1],
      [Bloco.CRIADO_MUDO]: [1, 1, 1],
      [Bloco.CRIADO_MUDO_ACESO]: [1, 1, 1],
      [Bloco.ABAJUR]: [1, 1, 2],
      [Bloco.ABAJUR_ACESO]: [1, 1, 2],
      [Bloco.PIA]: [1, 1, 2],
      [Bloco.GUARDA_ROUPA]: [2, 1, 2],
    };
    for (const b of moveis) {
      const f = formaDoMovel(b)!;
      expect(f, obterBloco(b)?.nome).toBeDefined();
      expect([f.largura, f.fundo, f.altura]).toEqual(tamanhos[b]);
      expect(f.partes.length).toBe(f.largura * f.fundo * f.altura);
      expect(f.caixas.length).toBe(f.partes.length);
      expect(f.partes[0]).toEqual([0, 0, 0]);
      expect(new Set(f.partes.map((p) => p.join())).size).toBe(f.partes.length);
      expect(obterBloco(b)?.forma).toBe('movel');
    }
    // o tapete é 3 × 2 rente ao chão, fora das células; a cama nova (T03) é 1 × 2 com a curtinha
    expect(FORMA_TAPETE.partes.length).toBe(6);
    expect(ehMovel(Bloco.TAPETE)).toBe(false);
    expect(FORMA_CAMA.partes.length).toBe(2);
    expect(FORMA_CAMA.curtinha).toBe(2);
    // a cama continua de uma célula até a T03 (as camas antigas não viram peça solta)
    expect(ehMovel(Bloco.CAMA)).toBe(false);
    // os ids novos vêm depois do 127 e não mudam os de antes
    expect(Bloco.CALDEIRAO).toBe(127);
    expect([
      Bloco.SOFA,
      Bloco.CADEIRA,
      Bloco.CRIADO_MUDO,
      Bloco.ABAJUR,
      Bloco.TAPETE,
      Bloco.PIA,
      Bloco.GUARDA_ROUPA,
      Bloco.ABAJUR_ACESO,
      Bloco.CRIADO_MUDO_ACESO,
    ]).toEqual([128, 129, 130, 131, 132, 133, 134, 135, 136]);
  });

  it('o metadado: a direção nos bits 0 e 1, a parte nos bits 2 a 4', () => {
    expect(metaDoMovel(3, 0)).toBe(3);
    expect(metaDoMovel(1, 1)).toBe(0b101);
    expect(metaDoMovel(2, 3)).toBe(0b1110);
    expect(parteDoMeta(0b1110)).toBe(3);
    expect(parteDoMeta(0b101) & 7).toBe(1);
  });

  it('o sofá cresce para a direita de quem põe; o abajur e a pia, para cima; o tapete, para a direita e a frente', () => {
    // olhando para +z, a direita é +x; para +x, é -z; para -z, -x; para -x, +z
    expect(pos(celulasDoMovel(Bloco.SOFA, 10, 5, 10, 0))).toEqual([[10, 5, 10], [11, 5, 10]]);
    expect(pos(celulasDoMovel(Bloco.SOFA, 10, 5, 10, 1))).toEqual([[10, 5, 10], [10, 5, 9]]);
    expect(pos(celulasDoMovel(Bloco.SOFA, 10, 5, 10, 2))).toEqual([[10, 5, 10], [9, 5, 10]]);
    expect(pos(celulasDoMovel(Bloco.SOFA, 10, 5, 10, 3))).toEqual([[10, 5, 10], [10, 5, 11]]);
    expect(pos(celulasDoMovel(Bloco.ABAJUR, 1, 2, 3, 2))).toEqual([[1, 2, 3], [1, 3, 3]]);
    expect(pos(celulasDoMovel(Bloco.PIA, 1, 2, 3, 1))).toEqual([[1, 2, 3], [1, 3, 3]]);
    expect(pos(celulasDoMovel(Bloco.GUARDA_ROUPA, 0, 1, 0, 0))).toEqual([
      [0, 1, 0],
      [1, 1, 0],
      [0, 2, 0],
      [1, 2, 0],
    ]);
    expect(pos(celulasDoMovel(Bloco.CADEIRA, 4, 4, 4, 3))).toEqual([[4, 4, 4]]);
    expect(celulasDoMovel(Bloco.TABUAS, 0, 0, 0, 0)).toEqual([]);
  });

  it('acende e apaga: o abajur e o criado-mudo trocam de id, e o aceso ilumina', () => {
    expect(acesoOuApagado(Bloco.ABAJUR)).toBe(Bloco.ABAJUR_ACESO);
    expect(acesoOuApagado(Bloco.ABAJUR_ACESO)).toBe(Bloco.ABAJUR);
    expect(acesoOuApagado(Bloco.CRIADO_MUDO)).toBe(Bloco.CRIADO_MUDO_ACESO);
    expect(acesoOuApagado(Bloco.CRIADO_MUDO_ACESO)).toBe(Bloco.CRIADO_MUDO);
    expect(acesoOuApagado(Bloco.SOFA)).toBeNull();
    expect(obterBloco(Bloco.ABAJUR_ACESO)?.luz).toBe(12);
    expect(obterBloco(Bloco.CRIADO_MUDO_ACESO)?.luz).toBe(7);
    expect(obterBloco(Bloco.ABAJUR)?.luz ?? 0).toBe(0);
    // o aceso não vira item (quebrado, devolve o apagado)
    expect(obterBloco(Bloco.ABAJUR_ACESO)?.semItem).toBe(true);
  });
});

describe('a âncora e a peça solta', () => {
  it('de qualquer parte acha o móvel inteiro, com a mesma âncora', () => {
    const l = mundo();
    porMovel(l, Bloco.GUARDA_ROUPA, 5, 1, 5, 1, 7);
    for (const c of celulasDoMovel(Bloco.GUARDA_ROUPA, 5, 1, 5, 1)) {
      const m = movelEm(l, c.x, c.y, c.z)!;
      expect(m, `${c.x},${c.y},${c.z}`).not.toBeNull();
      expect(m.ancora).toEqual({ x: 5, y: 1, z: 5 });
      expect(m.d).toBe(1);
      expect(m.celulas).toHaveLength(4);
      expect(pecaSolta(l, c.x, c.y, c.z)).toBe(false);
    }
  });

  it('outro dono, outra direção, a parte errada ou a parte que falta: peça solta', () => {
    const casos: [string, (l: ReturnType<typeof mundo>) => void][] = [
      ['outro dono na direita', (l) => l.por(6, 1, 5, Bloco.SOFA, metaDoMovel(0, 1), 9)],
      ['outra direção na direita', (l) => l.por(6, 1, 5, Bloco.SOFA, metaDoMovel(2, 1), 3)],
      ['a parte errada na direita', (l) => l.por(6, 1, 5, Bloco.SOFA, metaDoMovel(0, 0), 3)],
      ['outro bloco na direita', (l) => l.por(6, 1, 5, Bloco.CADEIRA, metaDoMovel(0, 1), 3)],
      ['a direita sumiu', (l) => l.por(6, 1, 5, Bloco.AR)],
      ['bit de cima ligado', (l) => l.por(6, 1, 5, Bloco.SOFA, metaDoMovel(0, 1) | 32, 3)],
    ];
    for (const [nome, estraga] of casos) {
      const l = mundo();
      porMovel(l, Bloco.SOFA, 5, 1, 5, 0, 3);
      estraga(l);
      expect(movelEm(l, 5, 1, 5), nome).toBeNull();
      expect(pecaSolta(l, 5, 1, 5), nome).toBe(true);
    }
    // a parte sozinha, sem a âncora
    const l = mundo();
    l.por(6, 1, 5, Bloco.SOFA, metaDoMovel(0, 1));
    expect(pecaSolta(l, 6, 1, 5)).toBe(true);
    // parte além das que o móvel tem
    l.por(9, 1, 9, Bloco.SOFA, metaDoMovel(0, 4));
    expect(pecaSolta(l, 9, 1, 9)).toBe(true);
    // o id do tapete numa célula (só por truque) também é peça solta
    l.por(1, 1, 1, Bloco.TAPETE);
    expect(pecaSolta(l, 1, 1, 1)).toBe(true);
    // bloco comum não é peça nenhuma
    l.por(2, 1, 2, Bloco.TABUAS);
    expect(pecaSolta(l, 2, 1, 2)).toBe(false);
  });
});

describe('a colisão por caixa', () => {
  it('o encosto do sofá fica do lado de trás e gira com a direção', () => {
    // olhando para +z (d = 0), a frente do sofá olha para a criança (-z): o encosto fica em +z
    const d0 = caixasDoBloco(Bloco.SOFA, metaDoMovel(0, 0))!;
    expect(d0.some((c) => c[4] === 1 && c[2] > 0.5)).toBe(true);
    // olhando para +x (d = 1), o encosto vai para +x
    const d1 = caixasDoBloco(Bloco.SOFA, metaDoMovel(1, 1))!;
    expect(d1.some((c) => c[4] === 1 && c[0] > 0.5)).toBe(true);
    // a colisão nunca passa de 1,0 (o encosto alto é só desenho)
    for (const b of [Bloco.SOFA, Bloco.CADEIRA, Bloco.ABAJUR, Bloco.PIA, Bloco.GUARDA_ROUPA])
      for (let p = 0; p < formaDoMovel(b)!.partes.length; p++)
        for (const c of caixasDoBloco(b, metaDoMovel(0, p))!) expect(c[4]).toBeLessThanOrEqual(1);
  });

  it('a peça solta não segura ninguém; o móvel inteiro, sim', () => {
    const vazio = () => new Uint8Array(16 * 16 * 128);
    const ed = criarEdicoes();
    const s = criarMundoSolido(1, vazio, ed);
    // o sofá inteiro (as duas partes do mesmo dono) e a direita de outro sofá, sozinha
    ed.definir(2, 5, 2, Bloco.SOFA, metaDoMovel(0, 0), 4);
    ed.definir(3, 5, 2, Bloco.SOFA, metaDoMovel(0, 1), 4);
    ed.definir(8, 5, 8, Bloco.SOFA, metaDoMovel(0, 1), 4);
    expect(s.caixas!(2, 5, 2)!.length).toBeGreaterThan(0);
    expect(s.caixas!(3, 5, 2)!.length).toBeGreaterThan(0);
    expect(s.caixas!(8, 5, 8)).toEqual([]);
  });

  it('o móvel fica de pé no chão: cada célula de baixo com chão sólido embaixo', () => {
    const ler = (x: number, y: number) => (y === 0 && x !== 1 ? Bloco.TABUAS : Bloco.AR);
    const pedido = (x: number) => ({
      bloco: Bloco.SOFA,
      celulas: celulasDoMovel(Bloco.SOFA, x, 1, 0, 0),
      ler: (xx: number, yy: number) => ler(xx, yy),
      corpos: [],
    });
    // as duas células com chão
    expect(recusaConstruir(pedido(2))).toBeNull();
    // a direita em cima do buraco (x = 1)
    expect(recusaConstruir(pedido(0))).toBe('apoio');
    // o guarda-roupa: só a fileira de baixo pede chão
    expect(
      recusaConstruir({
        bloco: Bloco.GUARDA_ROUPA,
        celulas: celulasDoMovel(Bloco.GUARDA_ROUPA, 2, 1, 0, 0),
        ler: (xx, yy) => ler(xx, yy),
        corpos: [],
      }),
    ).toBeNull();
  });
});

/** Aplica os grupos do lote num mundo de mentira (como o núcleo faria, sem a proteção). */
function aplicar(l: ReturnType<typeof mundo>, lote: EntradaLote[]) {
  for (const g of gruposDoLote(lote, l)) {
    if (g.naoCabe) continue;
    for (const e of g.celulas) l.por(e.x, e.y, e.z, e.v & 255, (e.v >> 8) & 255);
  }
}

/** Todas as células de móvel do mundo são de um móvel inteiro (nenhuma peça solta). */
function semPecaSolta(l: ReturnType<typeof mundo>): void {
  for (const k of l.m.keys()) {
    const [x, y, z] = k.split(',').map(Number);
    expect(pecaSolta(l, x, y, z), k).toBe(false);
  }
}

describe('o lote do criativo com os móveis', () => {
  it('só a âncora entra e vira o móvel inteiro; a parte sozinha e o tapete saem', () => {
    const l = mundo();
    const lote: EntradaLote[] = [
      { x: 0, y: 1, z: 0, v: Bloco.SOFA | (metaDoMovel(0, 0) << 8) },
      // a parte de outro sofá, sem a âncora, e o id do tapete
      { x: 5, y: 1, z: 5, v: Bloco.SOFA | (metaDoMovel(0, 1) << 8) },
      { x: 7, y: 1, z: 7, v: Bloco.TAPETE },
    ];
    aplicar(l, lote);
    expect(l.bloco(0, 1, 0)).toBe(Bloco.SOFA);
    expect(l.bloco(1, 1, 0)).toBe(Bloco.SOFA);
    expect(l.meta(1, 1, 0)).toBe(metaDoMovel(0, 1));
    expect(l.bloco(5, 1, 5)).toBe(Bloco.AR);
    expect(l.bloco(7, 1, 7)).toBe(Bloco.AR);
    semPecaSolta(l);
  });

  it('a âncora que não cabe fica de fora (e leva junto o que ia sair com ela)', () => {
    const l = mundo();
    l.por(1, 1, 0, Bloco.PEDRA_LISA);
    const g = gruposDoLote([{ x: 0, y: 1, z: 0, v: Bloco.SOFA }], l);
    expect(g).toHaveLength(1);
    expect(g[0].naoCabe).toBe(true);
    // a âncora em cima do mundo (a cúpula do abajur passaria do teto)
    expect(gruposDoLote([{ x: 0, y: 127, z: 0, v: Bloco.ABAJUR }], l)[0].naoCabe).toBe(true);
    // dois sofás do lote no mesmo lugar: o segundo fica de fora, o primeiro entra
    const dois = gruposDoLote(
      [
        { x: 0, y: 2, z: 0, v: Bloco.SOFA },
        { x: 1, y: 2, z: 0, v: Bloco.SOFA },
      ],
      l,
    );
    expect(dois.filter((x) => !x.naoCabe).flatMap((x) => x.celulas)).toHaveLength(2);
  });

  it('a âncora que o próprio lote troca depois (a última vale) não deixa a parte sozinha', () => {
    const l = mundo();
    aplicar(l, [
      { x: 0, y: 1, z: 0, v: Bloco.SOFA },
      { x: 0, y: 1, z: 0, v: Bloco.TABUAS },
    ]);
    expect(l.bloco(0, 1, 0)).toBe(Bloco.TABUAS);
    expect(l.bloco(1, 1, 0)).toBe(Bloco.AR);
    semPecaSolta(l);
  });

  it('trocar uma parte do móvel leva o móvel inteiro (nada vira peça solta)', () => {
    const l = mundo();
    porMovel(l, Bloco.GUARDA_ROUPA, 0, 1, 0, 0);
    // o "esvaziar" pega só a coluna da direita
    aplicar(l, [
      { x: 1, y: 1, z: 0, v: Bloco.AR },
      { x: 1, y: 2, z: 0, v: Bloco.AR },
    ]);
    for (const c of celulasDoMovel(Bloco.GUARDA_ROUPA, 0, 1, 0, 0))
      expect(l.bloco(c.x, c.y, c.z), `${c.x},${c.y}`).toBe(Bloco.AR);
    // uma tábua em cima da direita do sofá: sai o sofá, entra a tábua
    porMovel(l, Bloco.SOFA, 4, 1, 4, 0);
    aplicar(l, [{ x: 5, y: 1, z: 4, v: Bloco.TABUAS }]);
    expect(l.bloco(4, 1, 4)).toBe(Bloco.AR);
    expect(l.bloco(5, 1, 4)).toBe(Bloco.TABUAS);
    // o mesmo sofá colado no mesmo lugar não muda nada
    porMovel(l, Bloco.SOFA, 8, 1, 8, 2);
    const g = gruposDoLote([{ x: 8, y: 1, z: 8, v: Bloco.SOFA | (2 << 8) }], l);
    expect(g[0].celulas.every((e) => e.v === (l.bloco(e.x, e.y, e.z) | (l.meta(e.x, e.y, e.z) << 8)))).toBe(true);
    semPecaSolta(l);
  });

  it('o colar girado mantém o sofá, o abajur e o guarda-roupa inteiros, dentro da região', () => {
    // a sala copiada: 3 × 3 de chão, 2 de altura
    const sala = mundo();
    porMovel(sala, Bloco.SOFA, 0, 1, 0, 0);
    porMovel(sala, Bloco.GUARDA_ROUPA, 0, 1, 2, 0);
    porMovel(sala, Bloco.ABAJUR, 2, 1, 1, 3);
    // o tapete não é de célula: um id dele perdido no meio não vira nada
    sala.por(1, 1, 1, Bloco.TAPETE);
    const bp = copiar('sala', { x: 0, y: 1, z: 0 }, { x: 2, y: 2, z: 2 }, (x, y, z) =>
      sala.bloco(x, y, z) | (sala.meta(x, y, z) << 8),
    )!;
    for (const giro of [0, 1, 2, 3]) {
      const l = mundo();
      const o = { x: 20, y: 1, z: 30 };
      aplicar(
        l,
        colar(bp, o, giro).map((e) => ({ ...e.p, v: e.v })),
      );
      const cheias = [...l.m.keys()].map((k) => k.split(',').map(Number));
      // as 8 células dos três móveis, nenhuma fora da região girada (3 × 2 × 3)
      expect(cheias, `giro ${giro}`).toHaveLength(8);
      for (const [x, y, z] of cheias) {
        expect(x - o.x, `giro ${giro}`).toBeGreaterThanOrEqual(0);
        expect(x - o.x, `giro ${giro}`).toBeLessThan(3);
        expect(z - o.z, `giro ${giro}`).toBeGreaterThanOrEqual(0);
        expect(z - o.z, `giro ${giro}`).toBeLessThan(3);
        expect(y - o.y, `giro ${giro}`).toBeLessThan(2);
      }
      semPecaSolta(l);
      // cada móvel com a direção girada (o sofá olhava para +z: no giro 1, para -x)
      const ancoras = new Set(
        cheias.map(([x, y, z]) => JSON.stringify(movelEm(l, x, y, z)!.ancora)),
      );
      expect(ancoras.size, `giro ${giro}`).toBe(3);
      const sofa = cheias.find(([x, y, z]) => l.bloco(x, y, z) === Bloco.SOFA)!;
      expect(movelEm(l, sofa[0], sofa[1], sofa[2])!.d, `giro ${giro}`).toBe((4 - giro) % 4);
    }
  });
});
