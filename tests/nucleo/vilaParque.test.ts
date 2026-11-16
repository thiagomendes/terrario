import { afterAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { definirEstiloMundo, ESTILO_PADRAO, vilaDoMundo } from '../../src/world/chunk';
import { limparPovoados } from '../../src/world/povoado';
import { sanear } from '../../src/nucleo/saneamento';
import { PASSO, type Comando, type EventoNucleo } from '../../src/nucleo/protocolo';
import {
  CADEIRAS,
  VOLTA_RODA,
  anguloDaRoda,
  impulsoDaVista,
  lugarDaCadeira,
  sentadoNaVista,
  type ParqueVista,
} from '../../src/jogo/parque';
import {
  N0_PILOTOS,
  N_CARRINHOS,
  N_MORADORES_BATE,
  RAIO_CARRINHO,
  carrosDaVista,
} from '../../src/jogo/bate';
import {
  MOCO_DO_BATE,
  MORADORES_PARQUE,
  PIPOQUEIRO,
  POVOADO_VILA,
  VENDEDORA_DE_BALOES,
} from '../../src/nucleo/vila';
import { caixasDaPeca, indiceDaVila } from '../../src/world/vilaSolidos';
import { VERSAO_REDE } from '../../src/rede/protocolo';

/**
 * Spec 026 (parte 2): o Parque de diversões no núcleo. O núcleo é dono das cadeiras: senta quem
 * alcança o brinquedo, cada cadeira tem um dono, a roda-gigante devolve a criança ao chão depois
 * da volta inteira, o carrossel e o bate-bate só quando ela pede; quem some solta a cadeira.
 */
const VILA = obterTema('vila-neon').mundo;
const SEMENTE = 4242;
afterAll(() => {
  definirEstiloMundo(ESTILO_PADRAO);
  limparPovoados();
});

function tel(x: number, y: number, z: number): Comando {
  return {
    t: 'jogador',
    x,
    y,
    z,
    yaw: 0,
    pitch: 0,
    olhos: y + 1.62,
    noChao: true,
    voando: false,
    vel: 0,
    correndo: false,
    submerso: false,
    quedas: [],
    pulos: 0,
    golpes: 0,
    slot: 0,
  };
}
function abrir(quem: string[] = ['ana'], confiar = true) {
  definirEstiloMundo(VILA);
  limparPovoados();
  const n = criarNucleo({
    semente: SEMENTE,
    modo: 'criativo',
    versaoMundo: 2,
    confiarNoCliente: confiar,
    depuracao: true,
    dono: quem[0],
  });
  for (const q of quem) n.conectar(q, { perfil: { apelido: q, aparencia: {} } });
  return n;
}
type Ev = EventoNucleo;
/** Anda `k` passos; quem está sentado manda o lugar da cadeira, como o aparelho faz. */
function passos(n: Nucleo, k = 1, quem = 'ana'): Ev[] {
  const pq = vilaDoMundo(SEMENTE)!.pontos.parque;
  const r: Ev[] = [];
  for (let i = 0; i < k; i++) {
    const v = n.estado.vila!.vista().parque!;
    const t = n.estado.vila!.vista().t;
    for (const id of Object.keys(v.s)) {
      const s = sentadoNaVista(v, id)!;
      const l = lugarDaCadeira(pq, s.b, s.i, t, impulsoDaVista(v), n.estado.vila!.parque.carros());
      n.comando(id, tel(l.x, l.y, l.z));
    }
    n.passo();
    for (const [q, f] of n.quadros()) {
      if (q === quem) r.push(...(f.eventos ?? []));
      if (f.bate) ultimoBate.set(q, f.bate);
      else ultimoBate.delete(q);
    }
  }
  return r;
}
/** Os carrinhos do bate-bate no último quadro de cada jogador (sem a chave: não vieram). */
const ultimoBate = new Map<string, number[]>();
function ir(n: Nucleo, quem: string, x: number, y: number, z: number): void {
  n.estado.jogadores.get(quem)!.saltoPermitido = true;
  n.comando(quem, tel(x, y, z));
}
const parque = (n: Nucleo): ParqueVista => n.estado.vila!.vista().parque!;
const plano = () => vilaDoMundo(SEMENTE)!;
const Y = () => plano().h + 1;
const sentar = (n: Nucleo, quem: string, b: number) =>
  n.comando(quem, { t: 'vila', a: 'sentar', b });

describe('spec 026 (parte 2): o parque no núcleo', () => {
  it('a versão da rede subiu e o comando do parque passa a limpo (o resto não entra)', () => {
    expect(VERSAO_REDE).toBe(12);
    expect(sanear({ t: 'vila', a: 'sentar', b: 2, lixo: 1 })).toEqual({
      t: 'vila',
      a: 'sentar',
      b: 2,
    });
    expect(sanear({ t: 'vila', a: 'sentar', b: 3 })).toBeNull();
    expect(sanear({ t: 'vila', a: 'sentar', b: 'roda' })).toBeNull();
    for (const a of ['sair', 'roda'])
      expect(sanear({ t: 'vila', a, x: 9 })).toEqual({ t: 'vila', a });
    expect(sanear({ t: 'vila', a: 'voar' })).toBeNull();
    // o "tum" de tocar não existe mais (a batida é de verdade); o controle do carrinho passa a
    // limpo: inteiros de -100 a 100 e o número dele
    expect(sanear({ t: 'vila', a: 'tum' })).toBeNull();
    expect(sanear({ t: 'vila', a: 'guiar', x: 100, z: -37, n: 5, lixo: 1 })).toEqual({
      t: 'vila',
      a: 'guiar',
      x: 100,
      z: -37,
      n: 5,
    });
    for (const ruim of [
      { x: 101, z: 0, n: 1 },
      { x: 0.5, z: 0, n: 1 },
      { x: 0, z: 0, n: 0 },
      { x: 0, z: 0, n: 1.5 },
      { x: '1', z: 0, n: 1 },
      { x: 0, z: NaN, n: 1 },
      { x: 0, z: 0 },
    ])
      expect(sanear({ t: 'vila', a: 'guiar', ...ruim })).toBeNull();
  });

  it('roda-gigante: senta na cadeirinha de baixo, dá a volta inteira e desce sozinha no chão', () => {
    const n = abrir();
    const pq = plano().pontos.parque;
    ir(n, 'ana', pq.roda.saida[0], Y(), pq.roda.saida[2]);
    passos(n, 2);
    sentar(n, 'ana', 0);
    const evs = passos(n, 3);
    expect(evs.some((e) => e.e === 'parqueSentou' && e.quem === 'ana' && e.b === 0)).toBe(true);
    const s = sentadoNaVista(parque(n), 'ana')!;
    expect(s.b).toBe('roda');
    // a cadeirinha estava embaixo (a até meia cadeira do ponto mais baixo)
    const l0 = lugarDaCadeira(pq, 'roda', s.i, s.desde);
    expect(l0.y).toBeLessThan(Y() + 1.6);
    // meia volta depois ela está lá no alto, e continua sentada
    passos(n, Math.round(VOLTA_RODA / 2 / PASSO));
    expect(sentadoNaVista(parque(n), 'ana')).not.toBeNull();
    const t = n.estado.vila!.vista().t;
    expect(lugarDaCadeira(pq, 'roda', s.i, t).y).toBeGreaterThan(Y() + 13);
    // a volta inteira (uns 25 s): desce sozinha, na frente da roda, e conta a chave da volta
    let desceu: Ev | undefined;
    for (let i = 0; i < (VOLTA_RODA / 2 + 4) / PASSO && !desceu; i++)
      desceu = passos(n, 1).find((e) => e.e === 'parqueDesceu');
    expect(desceu).toMatchObject({ quem: 'ana', b: 0, fim: true });
    if (desceu?.e !== 'parqueDesceu') throw new Error('sem evento');
    expect([desceu.x, desceu.y, desceu.z]).toEqual(pq.roda.saida);
    expect(sentadoNaVista(parque(n), 'ana')).toBeNull();
    const dur = n.estado.vila!.vista().t - s.desde;
    expect(dur).toBeGreaterThan(VOLTA_RODA * 0.9);
    expect(dur).toBeLessThan(VOLTA_RODA * 1.12);
  });

  it('carrossel: fica até pedir para sair; desce do lado de fora; de longe não senta', () => {
    const n = abrir();
    const pq = plano().pontos.parque;
    const c = pq.carrossel;
    // do outro lado do parque não alcança
    ir(n, 'ana', c.x + 30, Y(), c.z);
    passos(n, 2);
    sentar(n, 'ana', 1);
    passos(n, 2);
    expect(sentadoNaVista(parque(n), 'ana')).toBeNull();
    ir(n, 'ana', c.x + c.beira + 2, Y(), c.z);
    passos(n, 2);
    sentar(n, 'ana', 1);
    passos(n, 2);
    const s = sentadoNaVista(parque(n), 'ana')!;
    expect(s.b).toBe('carrossel');
    // sentar de novo (ou em outro brinquedo) não troca de cadeira
    sentar(n, 'ana', 2);
    passos(n, 2);
    expect(sentadoNaVista(parque(n), 'ana')).toEqual(s);
    // um minuto depois continua lá (nada a tira do cavalinho)
    passos(n, Math.round(60 / PASSO));
    expect(sentadoNaVista(parque(n), 'ana')).toEqual(s);
    n.comando('ana', { t: 'vila', a: 'sair' });
    const evs = passos(n, 2);
    const desceu = evs.find((e) => e.e === 'parqueDesceu');
    if (desceu?.e !== 'parqueDesceu') throw new Error('sem evento');
    expect(desceu.fim).toBeUndefined();
    expect(Math.hypot(desceu.x - c.x, desceu.z - c.z)).toBeCloseTo(c.beira + 1.1, 1);
    expect(desceu.y).toBe(Y());
    // onde ela pisa não tem peça nem bloco do parque
    const bate = indiceDaVila(plano()).caixas.filter(
      (b) =>
        desceu.x + 0.3 > b[0] &&
        desceu.x - 0.3 < b[3] &&
        desceu.z + 0.3 > b[2] &&
        desceu.z - 0.3 < b[5],
    );
    expect(bate).toHaveLength(0);
    expect(sentadoNaVista(parque(n), 'ana')).toBeNull();
  });

  it('bate-bate: dois amigos, cada um no seu carrinho, guiam de verdade e batem um no outro; o quadro leva os carrinhos; quem sai do mundo solta o dele', () => {
    const n = abrir(['ana', 'leo']);
    const pq = plano().pontos.parque;
    const B = pq.bate;
    const [sx, , sz] = B.saida;
    ir(n, 'ana', sx - 3, Y(), sz);
    ir(n, 'leo', sx + 3, Y(), sz);
    passos(n, 2);
    sentar(n, 'ana', 2);
    sentar(n, 'leo', 2);
    passos(n, 2);
    const a = sentadoNaVista(parque(n), 'ana')!;
    const l = sentadoNaVista(parque(n), 'leo')!;
    expect(a.b).toBe('bate');
    expect(l.b).toBe('bate');
    // cada um num carrinho das crianças (os quatro primeiros são dos moradores)
    expect(a.i).not.toBe(l.i);
    expect(a.i).toBeGreaterThanOrEqual(N_MORADORES_BATE);
    expect(l.i).toBeGreaterThanOrEqual(N_MORADORES_BATE);
    const carros = () => n.estado.vila!.parque.carros();
    const onde = carros().map((c) => ({ x: c.x, z: c.z }));
    // a Ana guia para cima do carrinho do Léo (que fica parado) até os dois baterem
    let seq = 0;
    let tum: Ev | undefined;
    let menor = Infinity;
    for (let k = 0; k < 300 && !tum; k++) {
      const eu = carros()[a.i];
      const ele = carros()[l.i];
      const d = Math.hypot(ele.x - eu.x, ele.z - eu.z);
      menor = Math.min(menor, d);
      n.comando('ana', {
        t: 'vila',
        a: 'guiar',
        x: Math.round(((ele.x - eu.x) / d) * 100),
        z: Math.round(((ele.z - eu.z) / d) * 100),
        n: ++seq,
      });
      tum = passos(n, 1, 'leo').find(
        (e) => e.e === 'parqueTum' && [e.de, e.alvo].includes(a.i) && [e.de, e.alvo].includes(l.i),
      );
      // o quadro de quem guia leva os oito carrinhos e o número do controle que o núcleo já usou
      const q = carrosDaVista(ultimoBate.get('ana'))!;
      expect(q.carros).toHaveLength(N_CARRINHOS);
      expect(q.ack).toBe(seq);
      expect(q.carros[a.i].x).toBeCloseTo(carros()[a.i].x, 2);
    }
    if (tum?.e !== 'parqueTum') throw new Error('não bateram');
    // bateu de verdade: os para-choques se tocaram, o do Léo saiu do lugar e a batida tem força
    expect(['ana', 'leo']).toContain(tum.quem);
    expect(tum.f).toBeGreaterThan(1.2);
    expect(menor).toBeGreaterThanOrEqual(2 * RAIO_CARRINHO - 0.01);
    expect(menor).toBeLessThan(2 * RAIO_CARRINHO + 0.4);
    passos(n, 6);
    expect(Math.hypot(carros()[l.i].x - onde[l.i].x, carros()[l.i].z - onde[l.i].z)).toBeGreaterThan(
      0.15,
    );
    // ninguém saiu da pista (nem os dos moradores, que andam sozinhos)
    for (const c of carros()) {
      expect(c.x).toBeGreaterThanOrEqual(B.x0 + RAIO_CARRINHO - 1e-6);
      expect(c.x).toBeLessThanOrEqual(B.x1 - RAIO_CARRINHO + 1e-6);
      expect(c.z).toBeGreaterThanOrEqual(B.z0 + RAIO_CARRINHO - 1e-6);
      expect(c.z).toBeLessThanOrEqual(B.z1 - RAIO_CARRINHO + 1e-6);
    }
    // em pé, o controle não é de ninguém (o carrinho do Léo, vazio, volta sozinho para a vaga)
    n.comando('leo', { t: 'vila', a: 'sair' });
    const desceu = passos(n, 2, 'leo').find((e) => e.e === 'parqueDesceu');
    if (desceu?.e !== 'parqueDesceu') throw new Error('sem evento');
    // desceu do lado de fora da mureta, pertinho de onde o carrinho estava
    const fora =
      desceu.x < B.x0 - 1 || desceu.x > B.x1 + 1 || desceu.z < B.z0 - 1 || desceu.z > B.z1 + 1;
    expect(fora).toBe(true);
    for (let k = 0; k < 400; k++) {
      n.comando('leo', { t: 'vila', a: 'guiar', x: 100, z: 0, n: 1000 + k });
      passos(n, 1);
    }
    const vaga = B.vagas[l.i];
    expect(Math.hypot(carros()[l.i].x - vaga[0], carros()[l.i].z - vaga[1])).toBeLessThan(0.3);
    // a Ana sai do mundo: o carrinho dela fica livre
    n.desconectar('ana');
    for (let i = 0; i < 6; i++) n.passo();
    expect(Object.keys(parque(n).s)).toHaveLength(0);
  });

  it('bate-bate no modo nuvem: guiar pela pista e bater na mureta nunca vira "volta para onde estava"', () => {
    const n = abrir(['ana'], false);
    const B = plano().pontos.parque.bate;
    ir(n, 'ana', B.vagas[5][0], Y(), B.z1 + 2);
    passos(n, 2);
    sentar(n, 'ana', 2);
    passos(n, 12);
    const s = sentadoNaVista(parque(n), 'ana')!;
    expect(s.b).toBe('bate');
    const evs: Ev[] = [];
    // dez segundos com o controle todo empurrado, mudando de rumo (e batendo na mureta do norte)
    for (let k = 1; k <= 200; k++) {
      const a = k < 60 ? Math.PI : Math.PI + (k - 60) * 0.04;
      n.comando('ana', {
        t: 'vila',
        a: 'guiar',
        x: Math.round(Math.sin(a) * 100),
        z: Math.round(Math.cos(a) * 100),
        n: k,
      });
      evs.push(...passos(n, 1));
    }
    expect(evs.some((e) => e.e === 'teleporte')).toBe(false);
    expect(evs.some((e) => e.e === 'parqueTum')).toBe(true);
    expect(sentadoNaVista(parque(n), 'ana')).toEqual(s);
    const c = n.estado.vila!.parque.carros()[s.i];
    expect(Math.hypot(c.x - B.vagas[5][0], c.z - B.vagas[5][1])).toBeGreaterThan(2);
  });

  it('bate-bate: os moradores guiam os quatro primeiros carrinhos, sentados neles; longe da pista o quadro não leva carrinho nenhum', () => {
    const n = abrir();
    const pq = plano().pontos.parque;
    const [sx, , sz] = pq.bate.saida;
    ir(n, 'ana', sx, Y(), sz);
    passos(n, 80);
    const carros = n.estado.vila!.parque.carros();
    const pilotos = n.estado.populacao.lista.filter(
      (q) =>
        q.morador?.povoado === POVOADO_VILA &&
        q.morador.n >= N0_PILOTOS &&
        q.morador.n < N0_PILOTOS + N_MORADORES_BATE,
    );
    expect(pilotos).toHaveLength(N_MORADORES_BATE);
    for (const m of pilotos) {
      const c = carros[m.morador!.n - N0_PILOTOS];
      expect(m.x).toBeCloseTo(c.x, 6);
      expect(m.z).toBeCloseTo(c.z, 6);
      expect(m.y).toBeCloseTo(pq.bate.y, 6);
      expect(m.yaw).toBeCloseTo(c.yaw, 6);
    }
    // eles andam (a pista está viva) e quem só olha recebe os carrinhos passo sim, passo não
    const antes = carros.map((c) => ({ x: c.x, z: c.z }));
    let vieram = 0;
    for (let k = 0; k < 40; k++) {
      passos(n, 1);
      if (ultimoBate.has('ana')) vieram++;
    }
    expect(vieram).toBe(20);
    const andou = carros
      .slice(0, N_MORADORES_BATE)
      .filter((c, i) => Math.hypot(c.x - antes[i].x, c.z - antes[i].z) > 1);
    expect(andou.length).toBeGreaterThanOrEqual(3);
    // do outro lado do bairro a pista descansa: nenhum carrinho no quadro, nenhum passo
    ir(n, 'ana', pq.bate.x - 200, Y(), pq.bate.z);
    passos(n, 12);
    const parado = carros.map((c) => ({ x: c.x, z: c.z }));
    passos(n, 20);
    expect(ultimoBate.has('ana')).toBe(false);
    carros.forEach((c, i) => expect([c.x, c.z]).toEqual([parado[i].x, parado[i].z]));
  });

  it('as cadeiras acabam: com as oito ocupadas o nono não senta (e nada quebra)', () => {
    const nomes = Array.from({ length: CADEIRAS.carrossel }, (_, i) => `j${i}`);
    const n = abrir(nomes);
    const c = plano().pontos.parque.carrossel;
    nomes.forEach((q, i) => {
      const a = (i / nomes.length) * Math.PI * 2;
      ir(n, q, c.x + Math.sin(a) * (c.beira + 2), Y(), c.z + Math.cos(a) * (c.beira + 2));
    });
    passos(n, 2, 'j0');
    for (const q of nomes) sentar(n, q, 1);
    passos(n, 2, 'j0');
    const v = parque(n);
    const cadeiras = nomes.map((q) => sentadoNaVista(v, q)!.i);
    expect(new Set(cadeiras).size).toBe(CADEIRAS.carrossel);
  });

  it('o toque na roda dá o empurrãozinho para todos (um por vez); de longe, nada', () => {
    const n = abrir();
    const pq = plano().pontos.parque;
    ir(n, 'ana', pq.roda.x + 60, Y(), pq.roda.z);
    passos(n, 2);
    n.comando('ana', { t: 'vila', a: 'roda' });
    expect(passos(n, 2).some((e) => e.e === 'parqueRoda')).toBe(false);
    ir(n, 'ana', pq.roda.saida[0], Y(), pq.roda.saida[2] + 3);
    passos(n, 2);
    n.comando('ana', { t: 'vila', a: 'roda' });
    expect(passos(n, 2).some((e) => e.e === 'parqueRoda')).toBe(true);
    const imp = impulsoDaVista(parque(n));
    const t = n.estado.vila!.vista().t;
    expect(anguloDaRoda(t + 10, imp)).toBeGreaterThan(anguloDaRoda(t + 10) + 0.3);
    // logo em seguida, outro toque ainda é o mesmo empurrão
    passos(n, 22);
    n.comando('ana', { t: 'vila', a: 'roda' });
    expect(passos(n, 2).some((e) => e.e === 'parqueRoda')).toBe(false);
  });

  it('quem vai para longe por outro caminho solta a cadeira; no modo nuvem o lugar de descer vale', () => {
    const n = abrir(['ana'], false);
    const pq = plano().pontos.parque;
    const [sx, , sz] = pq.bate.saida;
    ir(n, 'ana', sx, Y(), sz);
    passos(n, 2);
    sentar(n, 'ana', 2);
    passos(n, 40);
    expect(sentadoNaVista(parque(n), 'ana')).not.toBeNull();
    n.comando('ana', { t: 'vila', a: 'sair' });
    const evs = passos(n, 1);
    expect(evs.some((e) => e.e === 'parqueDesceu')).toBe(true);
    // o lugar de descer chega e vale (nenhum "volta para onde estava")
    n.comando('ana', tel(sx, Y(), sz));
    expect(passos(n, 2).some((e) => e.e === 'teleporte')).toBe(false);
    // senta de novo e some para longe sem pedir: a cadeira fica livre sozinha
    sentar(n, 'ana', 2);
    passos(n, 3);
    expect(sentadoNaVista(parque(n), 'ana')).not.toBeNull();
    for (let i = 0; i < 80; i++) {
      n.estado.jogadores.get('ana')!.saltoPermitido = true;
      n.comando('ana', tel(sx + 40, Y(), sz));
      n.passo();
    }
    expect(sentadoNaVista(parque(n), 'ana')).toBeNull();
  });

  it('os moradores do parque e as lhamas da fazendinha aparecem no lugar deles; a f2 fica onde estava', () => {
    const n = abrir();
    const P = plano().pontos;
    const c = P.parque.carrossel;
    ir(n, 'ana', c.x, Y(), c.z + c.beira + 3);
    for (let i = 0; i < 60; i++) n.passo();
    const moradores = n.estado.populacao.lista.filter((q) => q.morador?.povoado === POVOADO_VILA);
    for (const [num, posto] of [
      [PIPOQUEIRO, 'pipoqueiro'],
      [MOCO_DO_BATE, 'bate'],
      [VENDEDORA_DE_BALOES, 'baloes'],
    ] as const) {
      const m = moradores.find((q) => q.morador!.n === num)!;
      expect(m, posto).toBeTruthy();
      expect(Math.hypot(m.x - P.postos[posto][0], m.z - P.postos[posto][2])).toBeLessThan(2.5);
    }
    expect(MORADORES_PARQUE).toHaveLength(3);
    const lh = n.estado.vila!.lhamas();
    expect(lh.fazendinha).toHaveLength(2);
    const f = P.parque.fazendinha;
    for (const id of lh.fazendinha) {
      const q = n.estado.populacao.lista.find((x) => x.id === id)!;
      expect(q.x).toBeGreaterThanOrEqual(f.x0 - 0.5);
      expect(q.x).toBeLessThanOrEqual(f.x1 + 1.5);
      expect(q.z).toBeGreaterThanOrEqual(f.z0 - 0.5);
      expect(q.z).toBeLessThanOrEqual(f.z1 + 1.5);
    }
    // as da f2 continuam no cercadinho da beira do campo do festival
    expect(lh.todas.every((id) => !lh.fazendinha.includes(id))).toBe(true);
  });

  it('as caixas dos brinquedos: o carrossel é inteiro de segurar e a saída de cada um fica livre', () => {
    const p = plano();
    const pq = p.pontos.parque;
    const car = p.pecas.find((q) => q.tipo === 'carrossel')!;
    const cx = caixasDaPeca(car);
    expect(cx.length).toBeGreaterThan(0);
    for (const b of cx) {
      // nunca passa da beira do pedestal
      for (const [x, z] of [
        [b[0], b[2]],
        [b[3], b[2]],
        [b[0], b[5]],
        [b[3], b[5]],
      ])
        expect(Math.hypot(x - pq.carrossel.x, z - pq.carrossel.z)).toBeLessThanOrEqual(
          pq.carrossel.beira + 0.05,
        );
    }
    const idx = indiceDaVila(p);
    for (const [nome, q] of [
      ['roda', pq.roda.saida],
      ['bate', pq.bate.saida],
    ] as const) {
      const bate = idx.caixas.filter(
        (b) => q[0] + 0.3 > b[0] && q[0] - 0.3 < b[3] && q[2] + 0.3 > b[2] && q[2] - 0.3 < b[5],
      );
      expect(bate, nome).toHaveLength(0);
    }
  });
});
