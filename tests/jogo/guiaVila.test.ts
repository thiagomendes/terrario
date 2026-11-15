import { afterAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import {
  ALTURA,
  definirEstiloMundo,
  ESTILO_PADRAO,
  gerarChunk,
  indice,
  TAM_X,
  TAM_Z,
  vilaDoMundo,
} from '../../src/world/chunk';
import { comPecas, procurarCaminho, type V3 as P3 } from '../../src/jogo/caminho';
import { celulaTomadaPelaVila } from '../../src/world/vilaSolidos';
import { alvoDaMissao, chegouAoAlvo, type MundoDoGuia } from '../../src/jogo/guia';
import { missaoPorId } from '../../src/jogo/alma';
import { planoDaVila } from '../../src/world/vilaNeon';

/**
 * Spec 026: o guia da 030 na Vila Neon. f1: o estojo mais perto ainda no chão; f2: a lhama do
 * cercadinho e, com o feno na mão, a grade da plateia; f3: a escadinha e, no palco, a caixa
 * apagada mais perto (com o show, a ponta da passarela).
 */
const plano = planoDaVila(77, { altura: () => 70, nivelMar: 62 });
const p = plano.pontos;
function mundo(o: {
  ins?: boolean[];
  cx?: boolean[];
  show?: unknown;
  feno?: boolean;
  y?: number;
  bichos?: { id: number; tipo: string; x: number; y: number; z: number }[];
  hora?: number;
}): MundoDoGuia {
  return {
    cidade: null,
    sitios: [],
    bloco: () => 0,
    moradores: () => [],
    vila: plano,
    estadoVila: () => ({
      ins: o.ins ?? [false, false, false],
      cx: o.cx ?? [false, false, false],
      show: o.show ?? null,
      lhamas: [],
    }),
    comFeno: () => !!o.feno,
    pesY: () => o.y ?? plano.h + 1,
    bichos: () => o.bichos ?? [],
    ...(o.hora === undefined ? {} : { hora: () => o.hora! }),
  } as unknown as MundoDoGuia;
}
const de = { x: plano.nascimento.x, z: plano.nascimento.z };

describe('o guia na Vila Neon (spec 026)', () => {
  it('f1: leva ao estojo mais perto ainda no chão e some quando os três foram achados', () => {
    const m = missaoPorId('f1')!;
    const a = alvoDaMissao(m, mundo({}), new Set(), de)!;
    const d = (q: readonly number[]) => Math.hypot(q[0] - de.x, q[2] - de.z);
    const perto = [...p.estojos].sort((x, y) => d(x) - d(y))[0];
    expect([a.x, a.z]).toEqual([perto[0], perto[2]]);
    expect(chegouAoAlvo(a, perto[0], perto[2])).toBe(true);
    const i = p.estojos.indexOf(perto);
    const ins = [false, false, false];
    ins[i] = true;
    const b = alvoDaMissao(m, mundo({ ins }), new Set(), de)!;
    expect(b.chave).not.toBe(a.chave);
    expect(alvoDaMissao(m, mundo({ ins: [true, true, true] }), new Set(), de)).toBeNull();
  });

  it('f2: a lhama do cercadinho; com o feno na mão, a grade da plateia', () => {
    const m = missaoPorId('f2')!;
    const c = p.cercado;
    const lhama = { id: 7, tipo: 'cervo', x: c.x0 + 2, y: plano.h + 1, z: c.z0 + 2 };
    const a = alvoDaMissao(m, mundo({ bichos: [lhama] }), new Set(), de)!;
    expect(a.morador).toBe(7);
    const g = alvoDaMissao(m, mundo({ bichos: [lhama], feno: true }), new Set(), de)!;
    expect(g.chave).toBe('grade');
    expect(g.z).toBeGreaterThanOrEqual(p.plateia.z0);
    expect(g.z).toBeLessThanOrEqual(p.plateia.z1 + 1);
  });

  it('f3: a escadinha; no palco, a caixa apagada mais perto; com tudo aceso, a passarela', () => {
    const m = missaoPorId('f3')!;
    const a = alvoDaMissao(m, mundo({}), new Set(), de)!;
    expect(a.chave).toBe('escadinha');
    const noPalco = { x: p.escadinha[0] - 4, z: p.escadinha[2] };
    const b = alvoDaMissao(m, mundo({ y: p.palco.y + 1 }), new Set(), noPalco)!;
    expect(b.chave.startsWith('caixa:')).toBe(true);
    const c = alvoDaMissao(
      m,
      mundo({ y: p.palco.y + 1, cx: [true, true, true] }),
      new Set(),
      noPalco,
    )!;
    expect(c.chave).toBe('passarela');
  });

  it('f3 de dia espera a noite (decisão do dono): a lua em cima do palco, sem trilha; de noite, a escadinha', () => {
    const m = missaoPorId('f3')!;
    const dia = alvoDaMissao(m, mundo({ hora: 0.42 }), new Set(), de)!;
    expect(dia.chave).toBe('noite');
    expect(dia.espera).toBe(true);
    expect(dia.figura).toBe('luaShow');
    // nunca "chega" (a espera não dá o ✓ nem some a placa por chegar)
    expect(chegouAoAlvo(dia, dia.x, dia.z)).toBe(false);
    // a lua fica em cima do palco
    expect(dia.placa[1]).toBeGreaterThan(p.palco.y + 3);
    // de noite: a trilha de sempre
    const noite = alvoDaMissao(m, mundo({ hora: 0.9 }), new Set(), de)!;
    expect(noite.chave).toBe('escadinha');
    expect(noite.espera).toBeUndefined();
    // o show que começou de noite e entrou no dia continua guiando (a passarela)
    const noPalco = { x: p.escadinha[0] - 4, z: p.escadinha[2] };
    const show = alvoDaMissao(
      m,
      mundo({ hora: 0.3, y: p.palco.y + 1, cx: [true, true, true], show: { inicio: 0, final: null } }),
      new Set(),
      noPalco,
    )!;
    expect(show.chave).toBe('passarela');
    // f1 e f2 não esperam nada
    expect(alvoDaMissao(missaoPorId('f1')!, mundo({ hora: 0.42 }), new Set(), de)!.espera).toBeUndefined();
    expect(alvoDaMissao(missaoPorId('f2')!, mundo({ hora: 0.42 }), new Set(), de)!.espera).toBeUndefined();
  });
});

describe('a trilha do guia dá a volta nas peças da Vila Neon (o dono: nada atravessa)', () => {
  afterAll(() => definirEstiloMundo(ESTILO_PADRAO));
  it('do nascimento a cada lugar das missões, nenhuma pegada cai numa peça', () => {
    definirEstiloMundo(obterTema('vila-neon').mundo);
    const semente = 4242;
    const vila = vilaDoMundo(semente)!;
    const chunks = new Map<string, Uint8Array>();
    const blocos = (x: number, y: number, z: number) => {
      if (y < 0 || y >= ALTURA) return 0;
      const cx = Math.floor(x / TAM_X);
      const cz = Math.floor(z / TAM_Z);
      const k = `${cx},${cz}`;
      let c = chunks.get(k);
      if (!c) chunks.set(k, (c = gerarChunk(cx, cz, semente)));
      return c[indice(x - cx * TAM_X, y, z - cz * TAM_Z)];
    };
    const tomada = (x: number, y: number, z: number) => celulaTomadaPelaVila(vila, x, y, z);
    const leitor = { bloco: comPecas(blocos, tomada), conhecido: () => true };
    const q = vila.pontos;
    const de: P3 = [vila.nascimento.x, vila.h + 1, vila.nascimento.z];
    const alvos: [string, readonly number[]][] = [
      ...q.estojos.map((e, i) => [`estojo ${i}`, e] as [string, number[]]),
      ['escadinha', q.escadinha],
      ['cercado', q.portaoCercado],
      ['patins', q.patins],
      ['mural', q.mural],
      // perto dos brinquedos de tocar (a trilha passa na frente deles)
      ['rádio', [q.radio[0] + 3, q.radio[1], q.radio[2]]],
      ['fita', [q.fita[0], q.fita[1], q.fita[2] - 2.5]],
    ];
    let pecasPerto = 0;
    for (const [nome, a] of alvos) {
      const c = procurarCaminho(leitor, de, [a[0], a[1], a[2]]);
      expect(c.completo, nome).toBe(true);
      for (const [x, y, z] of c.pts) {
        expect(
          tomada(Math.floor(x), Math.floor(y), Math.floor(z)),
          `${nome} em ${x},${y},${z}`,
        ).toBe(false);
        expect(tomada(Math.floor(x), Math.floor(y) + 1, Math.floor(z)), `${nome} cabeça`).toBe(
          false,
        );
        for (const [dx, dz] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ])
          if (tomada(Math.floor(x) + dx, Math.floor(y), Math.floor(z) + dz)) pecasPerto++;
      }
    }
    // a trilha passou rente a peças de verdade (a volta foi dada, não por sorte)
    expect(pecasPerto).toBeGreaterThan(0);
  });
});
