import { afterAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { definirEstiloMundo, ESTILO_PADRAO, vilaDoMundo } from '../../src/world/chunk';
import { limparPovoados } from '../../src/world/povoado';
import {
  BATIDAS_DO_PASSEIO,
  FILA_DE_GUIAR,
  GUIAR_POR_SEGUNDO,
  SEGUNDOS_DO_PASSEIO,
  criarParqueNucleo,
  type EventoParque,
  type JogadorParque,
} from '../../src/nucleo/parque';
import { N_MORADORES_BATE, PASSO_BATE, RAIO_CARRINHO, carrosDaVista } from '../../src/jogo/bate';
import { noTapete } from '../../src/jogo/parque';

/**
 * Spec 026 (parte 2): o bate-bate de guiar no núcleo, direto no módulo do parque (sem o resto do
 * jogo): o controle com limite e fila, o número que volta no quadro, o passeio que conta para a
 * missão e onde a criança desce.
 */
definirEstiloMundo(obterTema('vila-neon').mundo);
limparPovoados();
const plano = vilaDoMundo(4242)!;
const pq = plano.pontos.parque;
const B = pq.bate;
const CHAO = plano.h + 1;
afterAll(() => {
  definirEstiloMundo(ESTILO_PADRAO);
  limparPovoados();
});

function mundo(nomes: string[] = ['ana']) {
  let t = 0;
  const jogadores = new Map<string, JogadorParque>(
    nomes.map((id, k) => [id, { id, x: B.saida[0] + k * 5 - 3, y: CHAO, z: B.saida[2], morto: false }]),
  );
  const eventos: EventoParque[] = [];
  const chaves: string[] = [];
  const p = criarParqueNucleo({
    parque: pq,
    chao: CHAO,
    agora: () => t,
    jogadores: () => [...jogadores.values()],
    jogador: (id) => jogadores.get(id),
    soltar: () => undefined,
    evento: (id, chave) => chaves.push(`${id}:${chave}`),
    espalhar: (e) => eventos.push(e),
    sujar: () => undefined,
  });
  let n = 0;
  const passo = () => {
    n++;
    t = n * PASSO_BATE;
    p.passoDoBate();
    // (quem está no carrinho vai com ele, como o aparelho faz)
    for (const [id, s] of p.sentados())
      if (s.b === 'bate') {
        const j = jogadores.get(id)!;
        j.x = p.carros()[s.i].x;
        j.z = p.carros()[s.i].z;
      }
    if (n % 5 === 3) p.passo();
  };
  return { p, passo, eventos, chaves, jogadores, n: () => n };
}
const sentar = (m: ReturnType<typeof mundo>, id = 'ana') => {
  m.p.comando(id, { a: 'sentar', b: 2 });
  return m.p.sentados().get(id)!;
};

describe('spec 026 (parte 2): o bate-bate de guiar no núcleo', () => {
  it('a criança pega o carrinho livre mais perto; longe de todos, não sobe', () => {
    const m = mundo();
    m.passo();
    const s = sentar(m);
    expect(s.b).toBe('bate');
    expect(s.i).toBeGreaterThanOrEqual(N_MORADORES_BATE);
    const eu = m.p.carros()[s.i];
    for (let i = N_MORADORES_BATE; i < m.p.carros().length; i++) {
      const c = m.p.carros()[i];
      expect(Math.hypot(eu.x - m.jogadores.get('ana')!.x, eu.z - B.saida[2])).toBeLessThanOrEqual(
        Math.hypot(c.x - m.jogadores.get('ana')!.x, c.z - B.saida[2]) + 1e-9,
      );
    }
    // do lado de lá da pista (a mureta do norte) os carrinhos da beira do sul ficam longe
    const m2 = mundo();
    m2.jogadores.get('ana')!.x = B.x1 - 2;
    m2.jogadores.get('ana')!.z = B.z0 - 1.5;
    m2.passo();
    m2.p.comando('ana', { a: 'sentar', b: 2 });
    expect(m2.p.sentados().size).toBe(0);
  });

  it('o controle anda o carrinho um passo por controle, e o quadro devolve o número do último usado', () => {
    const m = mundo();
    m.passo();
    const s = sentar(m);
    const z0 = m.p.carros()[s.i].z;
    for (let k = 1; k <= 30; k++) {
      m.p.comando('ana', { a: 'guiar', x: 0, z: -100, n: k });
      m.passo();
      expect(carrosDaVista(m.p.bateDe('ana', m.n()))!.ack).toBe(k);
    }
    // andou para o norte (o rumo do controle), para dentro da pista
    expect(m.p.carros()[s.i].z).toBeLessThan(z0 - 2.5);
    // sem controle novo o carrinho segue com o último por um instante e depois para (a rede travou)
    for (let k = 0; k < 40; k++) m.passo();
    expect(m.p.carros()[s.i].v).toBe(0);
    expect(carrosDaVista(m.p.bateDe('ana', m.n()))!.ack).toBe(30);
  });

  it('o controle tem fila curta, número que só cresce e limite por segundo; em pé não vale', () => {
    const m = mundo(['ana', 'leo']);
    m.passo();
    const s = sentar(m);
    // em pé (o Léo não sentou): nada acontece
    m.p.comando('leo', { a: 'guiar', x: 100, z: 0, n: 1 });
    // uma rajada de 10 de uma vez: só os últimos da fila valem
    for (let k = 1; k <= 10; k++) m.p.comando('ana', { a: 'guiar', x: 0, z: -100, n: k });
    m.passo();
    expect(carrosDaVista(m.p.bateDe('ana', m.n()))!.ack).toBe(10 - FILA_DE_GUIAR + 1);
    for (let k = 0; k < FILA_DE_GUIAR; k++) m.passo();
    expect(carrosDaVista(m.p.bateDe('ana', m.n()))!.ack).toBe(10);
    // número repetido ou para trás não entra
    m.p.comando('ana', { a: 'guiar', x: 100, z: 0, n: 10 });
    m.p.comando('ana', { a: 'guiar', x: 100, z: 0, n: 3 });
    m.passo();
    expect(carrosDaVista(m.p.bateDe('ana', m.n()))!.ack).toBe(10);
    // mais que o limite num segundo: o resto do segundo é ignorado
    while (m.n() % 20 !== 0) m.passo();
    let maior = 0;
    for (let k = 0; k < GUIAR_POR_SEGUNDO + 30; k++) {
      m.p.comando('ana', { a: 'guiar', x: 0, z: -100, n: 100 + k });
      maior = 100 + k;
    }
    for (let k = 0; k < 8; k++) m.passo();
    expect(carrosDaVista(m.p.bateDe('ana', m.n()))!.ack).toBeLessThan(maior - 25);
    expect(m.p.sentados().get('ana')).toEqual(s);
  });

  it(`o passeio conta para a missão com ${BATIDAS_DO_PASSEIO} batidas em outro carrinho (uma vez por passeio)`, () => {
    const m = mundo();
    m.passo();
    const s = sentar(m);
    let seq = 0;
    let batidas = 0;
    for (let k = 0; k < 20 * 60 && batidas < BATIDAS_DO_PASSEIO + 2; k++) {
      // vai atrás do carrinho de morador mais perto
      const eu = m.p.carros()[s.i];
      let alvo = m.p.carros()[0];
      for (let i = 1; i < N_MORADORES_BATE; i++) {
        const c = m.p.carros()[i];
        if (Math.hypot(c.x - eu.x, c.z - eu.z) < Math.hypot(alvo.x - eu.x, alvo.z - eu.z)) alvo = c;
      }
      const d = Math.hypot(alvo.x - eu.x, alvo.z - eu.z) || 1;
      m.p.comando('ana', {
        a: 'guiar',
        x: Math.round(((alvo.x - eu.x) / d) * 100),
        z: Math.round(((alvo.z - eu.z) / d) * 100),
        n: ++seq,
      });
      const antes = m.eventos.length;
      m.passo();
      for (const e of m.eventos.slice(antes))
        if (e.e === 'parqueTum' && e.alvo >= 0 && (e.de === s.i || e.alvo === s.i)) {
          batidas++;
          expect(e.quem).toBe('ana');
          // a batida foi onde os dois se tocaram: a um raio do carrinho dela
          expect(Math.hypot(e.x - m.p.carros()[s.i].x, e.z - m.p.carros()[s.i].z)).toBeLessThan(
            RAIO_CARRINHO + 0.6,
          );
        }
      if (batidas < BATIDAS_DO_PASSEIO && m.n() * PASSO_BATE < SEGUNDOS_DO_PASSEIO - 1)
        expect(m.chaves).toEqual([]);
    }
    expect(batidas).toBeGreaterThanOrEqual(BATIDAS_DO_PASSEIO);
    expect(m.chaves).toEqual(['ana:andou:bate']);
  });

  it(`sem bater em ninguém, o passeio conta depois de ${SEGUNDOS_DO_PASSEIO} s guiando; parada, nunca`, () => {
    const m = mundo();
    m.passo();
    sentar(m);
    for (let k = 0; k < 40 / PASSO_BATE; k++) m.passo();
    expect(m.chaves).toEqual([]);
    // guia em roda pelo canto da pista (o rumo vira devagar), longe de todo mundo
    let seq = 0;
    for (let k = 0; k < (SEGUNDOS_DO_PASSEIO + 8) / PASSO_BATE && !m.chaves.length; k++) {
      const a = k * 0.06;
      m.p.comando('ana', {
        a: 'guiar',
        x: Math.round(Math.sin(a) * 60),
        z: Math.round(Math.cos(a) * 60),
        n: ++seq,
      });
      m.passo();
    }
    expect(m.chaves).toEqual(['ana:andou:bate']);
  });

  it('descer: no tapete verde, o caminho da frente; no resto da pista, a calçadinha mais perto; o carrinho volta para a vaga', () => {
    const m = mundo();
    m.passo();
    const s = sentar(m);
    const c = m.p.carros()[s.i];
    // (o carrinho posto no tapete da saída)
    c.x = (B.tapete.x0 + B.tapete.x1) / 2;
    c.z = (B.tapete.z0 + B.tapete.z1) / 2;
    expect(noTapete(B, c.x, c.z)).toBe(true);
    m.jogadores.get('ana')!.x = c.x;
    m.jogadores.get('ana')!.z = c.z;
    m.p.comando('ana', { a: 'sair' });
    const d1 = m.eventos.find((e) => e.e === 'parqueDesceu');
    if (d1?.e !== 'parqueDesceu') throw new Error('sem evento');
    expect([d1.x, d1.y, d1.z]).toEqual([B.saida[0], CHAO, Math.round(B.saida[2] * 100) / 100]);
    // de novo, agora no meio do lado do norte: desce na calçadinha do norte, bem ali
    m.eventos.length = 0;
    m.jogadores.get('ana')!.x = m.p.carros()[s.i].x;
    m.jogadores.get('ana')!.z = B.z1 + 1.5;
    const s2 = sentar(m);
    const c2 = m.p.carros()[s2.i];
    c2.x = B.x0 + 9;
    c2.z = B.z0 + 1.2;
    m.jogadores.get('ana')!.x = c2.x;
    m.jogadores.get('ana')!.z = c2.z;
    m.p.comando('ana', { a: 'sair' });
    const d2 = m.eventos.find((e) => e.e === 'parqueDesceu');
    if (d2?.e !== 'parqueDesceu') throw new Error('sem evento');
    expect(d2.x).toBeCloseTo(c2.x, 1);
    expect(d2.z).toBeCloseTo(B.z0 - 1.5, 1);
    // vazio, o carrinho volta sozinho para a vaga e fica de frente para a pista
    for (let k = 0; k < 30 / PASSO_BATE; k++) m.passo();
    const vaga = B.vagas[s2.i];
    expect(Math.hypot(c2.x - vaga[0], c2.z - vaga[1])).toBeLessThan(0.3);
    expect(Math.cos(c2.yaw - vaga[2])).toBeGreaterThan(0.98);
  });

  it('a pista do jogo: cabe todo mundo, as vagas ficam dentro e o tapete na beira do sul', () => {
    expect(B.x1 - B.x0).toBe(24);
    expect(B.z1 - B.z0).toBe(13);
    expect(B.vagas).toHaveLength(8);
    B.vagas.forEach((v, i) => {
      expect(v[0]).toBeGreaterThanOrEqual(B.x0 + RAIO_CARRINHO);
      expect(v[0]).toBeLessThanOrEqual(B.x1 - RAIO_CARRINHO);
      expect(v[1]).toBeGreaterThanOrEqual(B.z0 + RAIO_CARRINHO);
      expect(v[1]).toBeLessThanOrEqual(B.z1 - RAIO_CARRINHO);
      // nenhum carrinho começa em cima de outro, nem no tapete
      expect(noTapete(B, v[0], v[1])).toBe(false);
      B.vagas.forEach((o, j) => {
        if (j > i) expect(Math.hypot(v[0] - o[0], v[1] - o[1])).toBeGreaterThan(2 * RAIO_CARRINHO);
      });
    });
    expect(B.tapete.z1).toBe(B.z1);
    expect(B.saida[2]).toBeGreaterThan(B.z1 + 1);
  });
});
