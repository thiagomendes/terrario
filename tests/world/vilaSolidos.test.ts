import { afterAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { desenharPeca } from '../../src/render/vila/pecas';
import { Pecas } from '../../src/render/solidos';
import type { Desenho } from '../../src/render/vila/ref';
import { definirEstiloMundo, ESTILO_PADRAO } from '../../src/world/chunk';
import { planoDaVila, type PecaVila, type TipoPecaVila } from '../../src/world/vilaNeon';
import {
  caixasDaPeca,
  celulaTomadaPelaVila,
  comPecasDaVila,
  indiceDaVila,
  indiceDoMundo,
  pecaSolida,
} from '../../src/world/vilaSolidos';
import type { CaixaSolida, Solido } from '../../src/player/fisica';
import { CRIATURAS } from '../../src/jogo/criaturas';

/**
 * Spec 026, o pedido do dono ("o personagem atravessando objetos"): as peças da Vila Neon que
 * não são bloco ganham caixas de colisão tiradas do plano (nunca da malha). Aqui: a caixa cobre
 * o desenho de cada peça sem sobrar ar, o que é fino fica de passagem, e nenhum lugar onde a
 * criança, um morador ou uma lhama precisa ficar caiu dentro de uma caixa.
 */
const plano = planoDaVila(77, { altura: () => 70, nivelMar: 62 });
afterAll(() => definirEstiloMundo(ESTILO_PADRAO));

/** O que fica de passagem de propósito (fino, no alto, ou já cercado de blocos). */
const DE_PASSAGEM: TipoPecaVila[] = [
  'posteres',
  'varal-lampadas',
  'bandeirolas',
  'pipa',
  'globo',
  'holofote',
  'flamula',
  'raio-portao',
  'raio-palco',
  'arco-lampadas',
  'pedestal',
  'toalha',
];

function desenho(p: PecaVila) {
  const d = {
    corpo: new Pecas(),
    luz: new Pecas(),
    noite: new Pecas(),
    vidro: new Pecas(),
    quadros: [],
    recorte: { x0: -1e9, z0: -1e9, x1: 1e9, z1: 1e9 },
    ox: 0,
    oz: 0,
    chao: p.y,
  } as unknown as Desenho;
  desenharPeca(p, d);
  return [d.corpo, d.luz, d.noite, d.vidro].flatMap((q) => q.partes);
}
const fora = (cx: readonly CaixaSolida[], q: readonly number[]) =>
  Math.min(
    ...cx.map((c) =>
      Math.max(c[0] - q[0], q[0] - c[3], c[1] - q[1], q[1] - c[4], c[2] - q[2], q[2] - c[5], 0),
    ),
  );

describe('as peças da Vila Neon seguram (spec 026)', () => {
  it('cada tipo é de segurar ou está na lista de passagem (nada novo fica sem decidir)', () => {
    const tipos = new Set(plano.pecas.map((p) => p.tipo));
    for (const t of tipos) {
      const q = plano.pecas.filter((p) => p.tipo === t);
      const algumaSolida = q.some(pecaSolida);
      if (DE_PASSAGEM.includes(t)) expect(algumaSolida, t).toBe(false);
      else if (!algumaSolida)
        // o letreiro alto, o balcão da banca e o das barracas (cercados de blocos)
        expect(['letreiro', 'balcao'], t).toContain(t);
    }
    // os que o dono viu atravessar
    for (const t of [
      'carro',
      'van',
      'picape',
      'pipoca',
      'radio-gigante',
      'fita-gigante',
      'maquina',
      'banco',
      'gangorra',
      'balanco',
      'escorregador',
      'mural',
      'orelhao',
      'suporte-patins',
      'bateria',
      'teclado',
      'mesa-som',
    ] as TipoPecaVila[])
      expect(
        plano.pecas.some((p) => p.tipo === t && pecaSolida(p)),
        t,
      ).toBe(true);
  });

  it('a caixa cobre o desenho (na altura do corpo) e não passa dele: nem entra, nem esbarra no ar', () => {
    // o que fica de fora de propósito: a roupa do varal, os copos e banquinhos da lanchonete,
    // o guarda-sol, os pratos da bateria e a bola da piscininha
    const solto: Partial<Record<TipoPecaVila, number>> = {
      'varal-roupa': 1.3,
      balcao: 0.8,
      mesinha: 0.9,
      bateria: 0.9,
      piscininha: 0.5,
      // a antena fina do hatch
      carro: 0.5,
      picape: 0.5,
    };
    const vistos = new Set<string>();
    for (const p of plano.pecas) {
      if (!pecaSolida(p)) continue;
      const k = `${p.tipo}:${p.n ?? 0}:${p.dir & 1}`;
      if (vistos.has(k)) continue;
      vistos.add(k);
      const cx = caixasDaPeca(p);
      const bb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
      let pior = 0;
      const ds: number[] = [];
      for (const vd of desenho(p)) {
        const P = vd.positions as number[];
        const I = vd.indices as number[];
        for (let i = 0; i < P.length; i += 3)
          for (let a = 0; a < 3; a++) {
            bb[a] = Math.min(bb[a], P[i + a]);
            bb[a + 3] = Math.max(bb[a + 3], P[i + a]);
          }
        for (let t = 0; t < I.length; t += 3)
          for (let u = 0; u <= 3; u++)
            for (let v = 0; u + v <= 3; v++) {
              const w = 3 - u - v;
              const q = [0, 1, 2].map(
                (a) =>
                  (P[I[t] * 3 + a] * u + P[I[t + 1] * 3 + a] * v + P[I[t + 2] * 3 + a] * w) / 3,
              );
              // só o que fica na altura do corpo do boneco (1,8)
              if (q[1] < p.y + 0.15 || q[1] > p.y + 1.75) continue;
              const f = fora(cx, q);
              ds.push(f);
              pior = Math.max(pior, f);
            }
      }
      ds.sort((a, b) => a - b);
      const p95 = ds[Math.floor(ds.length * 0.95)] ?? 0;
      expect(pior, `${k}: o desenho sai da caixa`).toBeLessThanOrEqual(solto[p.tipo] ?? 0.12);
      if (!solto[p.tipo]) expect(p95, `${k}: p95`).toBeLessThanOrEqual(0.06);
      // a caixa nunca vai além do desenho (ar que segura)
      for (const c of cx) {
        expect(bb[0] - c[0], `${k} x0`).toBeLessThanOrEqual(0.03);
        expect(c[3] - bb[3], `${k} x1`).toBeLessThanOrEqual(0.03);
        expect(bb[2] - c[2], `${k} z0`).toBeLessThanOrEqual(0.03);
        expect(c[5] - bb[5], `${k} z1`).toBeLessThanOrEqual(0.03);
        expect(c[4] - bb[4], `${k} topo`).toBeLessThanOrEqual(0.03);
      }
    }
  });

  it('nenhum lugar do jogo cai dentro de uma caixa: nascer, mural, estojos, patins, postos, lhamas', () => {
    const idx = indiceDaVila(plano);
    const P = plano.pontos;
    const c = P.cercado;
    const meio = [(c.x0 + c.x1 + 1) / 2, plano.h + 1, (c.z0 + c.z1 + 1) / 2];
    const lugares: [string, readonly number[], number][] = [
      ['nascimento', [plano.nascimento.x, plano.h + 1, plano.nascimento.z], 0.3],
      ['mural', P.mural, 0.3],
      ['patins', P.patins, 0.3],
      ['portão do cercado', P.portaoCercado, 0.3],
      ['escadinha', P.escadinha, 0.3],
      ['passarela', P.passarela, 0.3],
      ...P.estojos.map((e, i) => [`estojo ${i}`, e, 0.3] as [string, number[], number]),
      ...Object.entries(P.postos).map(
        ([k, q]) => [`posto ${k}`, q, CRIATURAS.morador.mw] as [string, number[], number],
      ),
      ['lhama 0', [meio[0] - 1.5, meio[1], meio[2]], CRIATURAS.cervo.mw],
      ['lhama 1', [meio[0] + 1.5, meio[1], meio[2]], CRIATURAS.cervo.mw],
    ];
    for (const [nome, q, r] of lugares) {
      const bate = idx.caixas.filter(
        (b) =>
          q[0] + r > b[0] &&
          q[0] - r < b[3] &&
          q[2] + r > b[2] &&
          q[2] - r < b[5] &&
          q[1] + 1.8 > b[1] &&
          q[1] < b[4],
      );
      expect(bate, nome).toHaveLength(0);
    }
    // o mural e o suporte dos patins: a criança chega pertinho para tocar (a menos de 1,2)
    const perto = (q: readonly number[]) =>
      Math.min(
        ...idx.caixas.map((b) => Math.max(b[0] - q[0], q[0] - b[3], b[2] - q[2], q[2] - b[5], 0)),
      );
    expect(perto(P.mural)).toBeLessThan(0.6);
    expect(perto(P.patins)).toBeLessThan(1.2);
  });

  it('o mundo sólido: a célula do carro segura com a caixa dele; fora da Vila Neon nada muda', () => {
    const carro = plano.pecas.find((p) => p.tipo === 'carro')!;
    const [c] = caixasDaPeca(carro);
    const ar = Object.assign(() => false, {}) as Solido;
    definirEstiloMundo(obterTema('vila-neon').mundo);
    // o plano do teste não é o do mundo (o relevo é outro): o índice do mundo é o da semente
    expect(indiceDoMundo(77)).not.toBeNull();
    definirEstiloMundo(ESTILO_PADRAO);
    expect(indiceDoMundo(77)).toBeNull();
    const s = comPecasDaVila(ar, 77);
    expect(s(Math.floor(c[0] + 0.5), Math.floor(c[1]), Math.floor(c[2] + 0.5))).toBe(false);
    // o índice do plano: a célula do meio do carro tem a caixa, relativa à célula
    const idx = indiceDaVila(plano);
    const x = Math.floor((c[0] + c[3]) / 2);
    const y = Math.floor(c[1]);
    const z = Math.floor((c[2] + c[5]) / 2);
    const l = idx.daCelula(x, y, z)!;
    expect(l.some((q) => q.abs.every((v, i) => v === c[i]))).toBe(true);
    expect(celulaTomadaPelaVila(plano, x, y, z)).toBe(true);
    expect(celulaTomadaPelaVila(plano, x, y + 3, z)).toBe(false);
    expect(celulaTomadaPelaVila(null, x, y, z)).toBe(false);
  });
});
