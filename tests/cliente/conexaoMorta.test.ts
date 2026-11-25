import { afterEach, describe, expect, it, vi } from 'vitest';
import { blocoDe, criarEdicoes, indiceDonoDe, metaDe } from '../../src/world/edicoes';
import { diferencaDasEdicoes } from '../../src/cliente/diferencaEdicoes';
import { Bloco } from '../../src/world/blocks';
import { idDoBloco } from '../../src/jogo/itens';
import type { BemVindo, ConexaoNuvem } from '../../src/cliente/conexaoNuvem';
import type { Comando, EventoNucleo } from '../../src/nucleo/protocolo';
import { criarNuvem, espera, ligarEstado } from './nuvemDeVerdade';

/**
 * Os blocos que somem na sala da nuvem (relato do dono, 23 nov 2026, Doce Reino, o filho criou e
 * o pai entrou): o pai constrói, olha para outro lado e, quando volta a olhar, parte dos blocos
 * sumiu. No registro do servidor, as duas conexões trocaram por uma nova no meio da partida, e a
 * velha só caiu 30 s depois (código 1006): estava morta sem ninguém saber.
 *
 * Aqui, com o servidor, a conexão e o estado de verdade (e o limite de mensagens por segundo do
 * servidor), o "mundo na tela" de cada um é um `Edicoes` feito como a cena faz (as previsões, os
 * blocos dos quadros e a diferença do bem-vindo da volta), ligado como `src/nuvem.ts` liga (o
 * `reconferir` no "Voltamos!").
 */
const BLOCO = Bloco.TABUAS;
type P = { x: number; y: number; z: number };

async function ate(cond: () => boolean, ms: number, oQue: string): Promise<void> {
  const fim = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > fim) throw new Error(`esperou ${ms} ms e não: ${oQue}`);
    await espera(20);
  }
}

/** A tela de um jogador: previsões e quadros por cima do primeiro bem-vindo, a volta como a cena. */
function ligarTela(c: ConexaoNuvem, bv: BemVindo) {
  const tela = criarEdicoes(7);
  tela.importar(bv.edicoes);
  tela.donos.importar(bv.donos);
  const recusas: EventoNucleo[] = [];
  const est = ligarEstado(c, {
    aplicarBloco: (x, y, z, b, meta, dono) => tela.definir(x, y, z, b, meta, dono),
    aoQuadro: (q) => {
      if (q.donos) tela.donos.importar(q.donos);
      if (q.donosNovos) tela.donos.aplicar(q.donosNovos);
    },
    aoEvento: (e) => {
      if (e.e === 'recusa') recusas.push(e);
    },
  });
  c.aoBemVindo((b) => {
    tela.donos.importar(b.donos);
    for (const m of diferencaDasEdicoes(tela.exportar(), b.edicoes, (x, y, z) =>
      est.pendente(x, y, z),
    )) {
      if (m.valor === undefined) tela.remover?.(m.x, m.y, m.z);
      else tela.definir(m.x, m.y, m.z, blocoDe(m.valor), metaDe(m.valor), indiceDonoDe(m.valor));
    }
  });
  let caiu = false;
  c.aoEstado((e) => {
    if (e === 'reconectando') caiu = true;
    else if (e === 'conectado' && caiu) {
      caiu = false;
      est.reconferir();
    }
  });
  return { tela, est, recusas, bloco: (p: P) => tela.obter(p.x, p.y, p.z) ?? Bloco.AR };
}

/** O filho cria o mundo (a ida para a nuvem), o pai entra pelo código: os dois na sala. */
async function montar(
  ip: string,
  modo: 'criativo' | 'sobrevivencia' = 'criativo',
  relogioDoPai?: () => number,
) {
  const nuvem = criarNuvem(ip);
  const codigo = await nuvem.criarSala('filho', 'doce-reino', modo);
  const c2 = nuvem.conectar('filho', { codigo });
  const filho = ligarTela(c2, await c2.pronta);
  const c3 = nuvem.conectar('pai', { codigo, ...(relogioDoPai ? { agora: relogioDoPai } : {}) });
  const bv3 = await c3.pronta;
  const pai = ligarTela(c3, bv3);
  await ate(() => pai.est.quadrosRecebidos > 5, 3000, 'o pai receber quadros');
  const sala = nuvem.g.ativas.get(codigo)!;
  // o que o núcleo recebe do pai (o que foi de novo conta outra vez)
  const recebidos: Record<string, number> = {};
  const posicoes: Comando[] = [];
  const comando = sala.nucleo.comando.bind(sala.nucleo);
  sala.nucleo.comando = (id, c) => {
    if (id === 'pai') recebidos[c.t] = (recebidos[c.t] ?? 0) + 1;
    if (id === 'pai' && c.t === 'jogador') posicoes.push(c);
    comando(id, c);
  };
  const noServidor = (p: P) => sala.nucleo.estado.mundo.bloco(p.x, p.y, p.z);
  const o = { x: Math.floor(bv3.pos.x), y: Math.floor(bv3.pos.y), z: Math.floor(bv3.pos.z) };
  /**
   * Spec 037: o bloco novo precisa encostar num sólido. As células do teste ficam no ar (em
   * cima da cabeça, longe do corpo), então uma pedra solta embaixo de cada coluna dá o apoio,
   * no servidor e nas duas telas (como num mundo salvo com bloco no ar). A célula de cima se
   * apoia na de baixo, que vai antes.
   */
  const apoiar = (ps: P[]) => {
    const k = (p: P) => `${p.x},${p.y},${p.z}`;
    const delas = new Set(ps.map(k));
    for (const p of ps) {
      const b = { x: p.x, y: p.y - 1, z: p.z };
      if (delas.has(k(b)) || noServidor(b) !== Bloco.AR) continue;
      sala.nucleo.estado.edicoes.definir(b.x, b.y, b.z, Bloco.PEDRA_LISA);
      for (const t of [pai.tela, filho.tela]) t.definir(b.x, b.y, b.z, Bloco.PEDRA_LISA);
    }
  };
  /** Como a cena põe um bloco: a previsão na tela e o comando com o mesmo id. */
  const por = (p: P, bloco: number = BLOCO) => {
    const id = pai.est.proximoId();
    pai.est.prever(id, p.x, p.y, p.z, bloco);
    pai.est.enviar({ t: 'colocar', id, ...p, bloco, meta: 0, slot: 0 });
  };
  const tirar = (p: P) => {
    const id = pai.est.proximoId();
    pai.est.prever(id, p.x, p.y, p.z, Bloco.AR);
    pai.est.enviar({ t: 'quebrar', id, ...p, slot: 0 });
  };
  return {
    nuvem,
    c2,
    c3,
    pai,
    filho,
    sala,
    o,
    bv3,
    recebidos,
    posicoes,
    noServidor,
    apoiar,
    por,
    tirar,
    /** A mochila do pai no servidor (o teste põe o que precisa). */
    mochila: () => sala.nucleo.estado.jogadores.get('pai')!,
    /** O núcleo respondeu a todas as previsões do pai nestas células. */
    respondido: (ps: P[]) =>
      ate(() => ps.every((p) => !pai.est.pendente(p.x, p.y, p.z)), 15_000, 'o núcleo responder'),
    /** A conexão do pai foi trocada (pelo vigia do silêncio) e voltou. */
    async voltou() {
      await ate(() => pai.est.ressincronizacoes >= 1, 8000, 'a rede de segurança ressincronizar');
      await ate(() => c3.estado === 'conectado', 12_000, 'o pai voltar');
    },
    fim() {
      c2.encerrar();
      c3.encerrar();
      nuvem.parar();
    },
  };
}

/** Uma fileira de 6 em cima da cabeça (dentro do alcance, longe do corpo). */
const fileira = (o: P, dz: number) =>
  Array.from({ length: 6 }, (_, i) => ({ x: o.x - 3 + i, y: o.y + 3, z: o.z + dz }));

type Como = 'conexão morta' | 'só a volta morta' | 'queda';

async function cenario(como: Como, ip: string) {
  const m = await montar(ip);
  try {
    const { pai, filho, noServidor, por, tirar } = m;
    const antes = fileira(m.o, 2);
    const depois = fileira(m.o, 3);
    for (const p of [...antes, ...depois]) expect(noServidor(p), 'a célula começa vazia').toBe(0);
    m.apoiar([...antes, ...depois]);

    // a primeira fileira, com a conexão boa: chega ao servidor e ao filho
    for (const p of antes) por(p);
    await ate(
      () => antes.every((p) => noServidor(p) === BLOCO && filho.bloco(p) === BLOCO),
      3000,
      'a primeira fileira chegar ao servidor e ao filho',
    );
    await espera(200);

    if (como !== 'queda') {
      // a conexão do pai morre sem ninguém saber, e ele continua construindo (com a volta
      // morta, o servidor recebe tudo e o pai não fica sabendo: ele também tira um bloco)
      m.nuvem.emudecer('pai', como === 'só a volta morta');
      await espera(300);
      for (const p of depois) por(p);
      if (como === 'só a volta morta') tirar(antes[0]);
      // o vigia do silêncio (4 s sem quadro) troca a conexão por outra
      await m.voltou();
    } else {
      // a internet do pai cai de vez; enquanto a conexão volta, ele continua construindo
      m.nuvem.segurar('pai');
      m.nuvem.derrubar('pai');
      await ate(() => m.c3.estado === 'reconectando', 2000, 'a conexão do pai cair');
      for (const p of depois) por(p);
      await espera(200);
      m.nuvem.soltar('pai');
      await ate(() => m.c3.estado === 'conectado', 12_000, 'o pai voltar');
    }
    await m.respondido([...antes, ...depois]);
    await espera(500);

    const conta = (f: (p: P) => boolean) => [...antes, ...depois].filter(f).length;
    return {
      servidor: conta((p) => noServidor(p) === BLOCO),
      telaDoPai: conta((p) => pai.bloco(p) === BLOCO),
      telaDoFilho: conta((p) => filho.bloco(p) === BLOCO),
      recusasDoPai: pai.recusas.length,
      recebidos: m.recebidos,
      tirado: {
        servidor: noServidor(antes[0]),
        telaDoPai: pai.bloco(antes[0]),
        telaDoFilho: filho.bloco(antes[0]),
      },
    };
  } finally {
    m.fim();
  }
}

describe('os blocos que o pai pôs não somem quando a conexão dele morre ou cai', () => {
  afterEach(() => vi.restoreAllMocks());

  it('conexão morta sem ninguém saber: o que ele pôs nela chega ao servidor depois da troca', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const r = await cenario('conexão morta', '10.8.0.1');
    expect(r.servidor, 'os 12 blocos no servidor').toBe(12);
    expect(r.telaDoPai, 'os 12 blocos na tela do pai').toBe(12);
    expect(r.telaDoFilho, 'os 12 blocos na tela do filho').toBe(12);
    expect(r.recusasDoPai, 'nenhuma recusa (som de "não pode") para o pai').toBe(0);
    // a fileira da conexão morta foi de novo, uma vez
    expect(r.recebidos.colocar, 'os 6 de antes, e os 6 de depois só na conexão nova').toBe(12);
  }, 30_000);

  it('só a volta morta: o que já entrou vai de novo, o núcleo recusa calado e nada sai em dobro', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const r = await cenario('só a volta morta', '10.8.0.3');
    // o pai pôs 12 e tirou 1 dos primeiros: 11 em todo lugar
    expect(r.servidor, 'os 11 blocos no servidor').toBe(11);
    expect(r.telaDoPai, 'os 11 blocos na tela do pai').toBe(11);
    expect(r.telaDoFilho, 'os 11 blocos na tela do filho').toBe(11);
    expect(r.tirado.servidor, 'o tirado, no servidor').toBe(Bloco.AR);
    expect(r.tirado.telaDoPai, 'o tirado, na tela do pai').toBe(Bloco.AR);
    expect(r.tirado.telaDoFilho, 'o tirado, na tela do filho').toBe(Bloco.AR);
    // os 6 da conexão morta chegaram e foram de novo (o núcleo recusou: já estavam lá)
    expect(r.recebidos.colocar, '6 + 6 e os 6 que foram de novo').toBe(18);
    expect(r.recebidos.quebrar, 'o tirar, e ele de novo').toBe(2);
    expect(r.recusasDoPai, 'a recusa do que foi de novo não toca o "não pode"').toBe(0);
  }, 30_000);

  it('queda: o que ele pôs enquanto a conexão voltava fica na tela dele (o servidor tem)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const r = await cenario('queda', '10.8.0.2');
    expect(r.servidor, 'os 12 blocos no servidor').toBe(12);
    expect(r.telaDoPai, 'os 12 blocos na tela do pai').toBe(12);
    expect(r.telaDoFilho, 'os 12 blocos na tela do filho').toBe(12);
    expect(r.recusasDoPai, 'nenhuma recusa para o pai').toBe(0);
  }, 30_000);

  it('a volta com muito a mandar sai em fatias: o servidor não fecha a conexão por pressa', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const m = await montar('10.8.0.4');
    try {
      // 168 células em volta da cabeça (dos dois lados, quatro andares), todas no alcance
      const celulas: P[] = [];
      for (const dz of [-4, -3, -2, 2, 3, 4])
        for (let dy = 3; dy <= 6; dy++)
          for (let dx = -3; dx <= 3; dx++)
            celulas.push({ x: m.o.x + dx, y: m.o.y + dy, z: m.o.z + dz });
      for (const p of celulas) expect(m.noServidor(p), 'a célula começa vazia').toBe(0);
      m.apoiar(celulas);
      // a internet cai e ele constrói tudo enquanto ela volta: tudo fica guardado
      m.nuvem.segurar('pai');
      m.nuvem.derrubar('pai');
      await ate(() => m.c3.estado === 'reconectando', 2000, 'a conexão do pai cair');
      for (const p of celulas) m.por(p);
      m.nuvem.soltar('pai');
      await ate(() => m.c3.estado === 'conectado', 12_000, 'o pai voltar');
      await m.respondido(celulas);
      await espera(300);
      expect(m.nuvem.fechadasPeloLimite.get('pai') ?? 0, 'o servidor fechou por pressa').toBe(0);
      expect(m.c3.estado).toBe('conectado');
      expect(celulas.filter((p) => m.noServidor(p) === BLOCO).length, 'no servidor').toBe(168);
      expect(celulas.filter((p) => m.pai.bloco(p) === BLOCO).length, 'na tela do pai').toBe(168);
      expect(celulas.filter((p) => m.filho.bloco(p) === BLOCO).length, 'na tela do filho').toBe(
        168,
      );
    } finally {
      m.fim();
    }
  }, 40_000);

  it('na volta: a posição vai sem a queda e o pulo, e o que tem mais de 30 s não vai de novo', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let relogio = 0;
    const m = await montar('10.8.0.7', 'criativo', () => relogio);
    try {
      const velhos = fileira(m.o, 2);
      const novo = { x: m.o.x, y: m.o.y + 3, z: m.o.z + 3 };
      for (const p of [...velhos, novo]) expect(m.noServidor(p), 'a célula começa vazia').toBe(0);
      m.apoiar([...velhos, novo]);
      // uma posição com queda, pulo e golpe, que o servidor recebe e conta
      const pos = m.bv3.pos;
      m.pai.est.enviar({
        t: 'jogador',
        x: pos.x,
        y: pos.y,
        z: pos.z,
        yaw: 0,
        pitch: 0,
        olhos: pos.y + 1.62,
        noChao: true,
        voando: false,
        vel: 0,
        correndo: false,
        submerso: false,
        quedas: [8],
        pulos: 1,
        golpes: 2,
        slot: 0,
      });
      await ate(() => m.posicoes.length === 1, 2000, 'o servidor receber a posição');
      // a conexão morre; ele põe 6 agora e, 31 s depois, mais 1
      m.nuvem.emudecer('pai');
      await espera(300);
      for (const p of velhos) m.por(p);
      relogio = 31_000;
      m.por(novo);
      await m.voltou();
      await m.respondido([...velhos, novo]);
      await espera(500);
      expect(m.recebidos.colocar, 'só o novo foi de novo').toBe(1);
      expect(m.noServidor(novo), 'o novo no servidor').toBe(BLOCO);
      expect(velhos.filter((p) => m.noServidor(p) === BLOCO).length, 'os velhos').toBe(0);
      // a posição de antes foi de novo (o alcance é conferido nela), sem contar de novo nada
      expect(m.posicoes.length, 'a posição foi de novo').toBe(2);
      expect(m.posicoes[1]).toMatchObject({ x: pos.x, quedas: [], pulos: 0, golpes: 0 });
    } finally {
      m.fim();
    }
  }, 30_000);
});

describe('o que não vai de novo, ou vai sabendo o que acontece (sobrevivência)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('a flor posta com a volta morta não vai de novo: a mochila não perde outra', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const m = await montar('10.8.0.5', 'sobrevivencia');
    try {
      const flor = idDoBloco(Bloco.FLOR);
      const j = m.mochila();
      j.inventario.definir(0, { item: flor, qtd: 3 });
      j.inventarioSujo = true;
      const c = { x: m.o.x + 1, y: m.o.y + 3, z: m.o.z + 3 };
      expect(m.noServidor(c), 'a célula começa vazia').toBe(0);
      m.apoiar([c]);
      await espera(300);
      // a volta do pai morre; ele põe uma flor (o servidor recebe e põe)
      m.nuvem.emudecer('pai', true);
      await espera(300);
      m.por(c, Bloco.FLOR);
      await m.voltou();
      await m.respondido([c]);
      await espera(500);
      expect(m.noServidor(c), 'a flor no servidor').toBe(Bloco.FLOR);
      expect(m.pai.bloco(c), 'a flor na tela do pai').toBe(Bloco.FLOR);
      // repetida, a flor no lugar da flor entraria de novo e gastaria outra
      expect(m.recebidos.colocar, 'a flor foi uma vez só').toBe(1);
      expect(j.inventario.obter(0), 'gastou uma flor').toEqual({ item: flor, qtd: 2 });
    } finally {
      m.fim();
    }
  }, 30_000);

  /**
   * Risco conhecido (revisão do conserto, item 3): tirar e pôr na mesma célula, os dois já
   * feitos no servidor e sem a confirmação ter chegado. Na volta, o tirar vai de novo e tira o
   * bloco novo; o pôr de novo é recusado sem o bloco na mochila, e a célula fica vazia, calada.
   * Nada sai em dobro: os dois blocos viram itens no chão. Para não acontecer, o núcleo precisa
   * ignorar o comando repetido (fica para o backlog). Este teste registra o que acontece hoje.
   */
  it('tirar e pôr na mesma célula com a volta morta: o bloco vira item no chão (risco conhecido)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const m = await montar('10.8.0.6', 'sobrevivencia');
    try {
      const tabua = idDoBloco(BLOCO);
      const j = m.mochila();
      j.inventario.definir(0, { item: tabua, qtd: 1 });
      j.inventarioSujo = true;
      // longe do corpo (o item que cai não chega à mão de ninguém)
      const c = { x: m.o.x + 3, y: m.o.y + 3, z: m.o.z + 4 };
      expect(m.noServidor(c), 'a célula começa vazia').toBe(0);
      m.apoiar([c]);
      await espera(300);
      m.por(c);
      await ate(() => m.noServidor(c) === BLOCO, 3000, 'a tábua entrar');
      await m.respondido([c]);
      j.inventario.definir(0, { item: tabua, qtd: 1 });
      j.inventarioSujo = true;
      await espera(300);
      const noChao = () =>
        m.sala.nucleo.estado.mundoItens.itens
          .filter((i) => i.item === tabua)
          .reduce((s, i) => s + i.qtd, 0);
      const chaoAntes = noChao();
      // a volta do pai morre; ele tira a tábua e põe outra no lugar (o servidor faz os dois)
      m.nuvem.emudecer('pai', true);
      await espera(300);
      m.tirar(c);
      m.por(c);
      await m.voltou();
      await m.respondido([c]);
      await espera(500);
      expect(m.recebidos.quebrar, 'o tirar foi de novo').toBe(2);
      expect(m.recebidos.colocar, 'o pôr foi de novo').toBe(3);
      // hoje: a célula fica vazia nos dois lados (a tela concorda com o servidor)
      expect(m.noServidor(c), 'a célula, no servidor').toBe(Bloco.AR);
      expect(m.pai.bloco(c), 'a célula, na tela do pai').toBe(Bloco.AR);
      expect(m.pai.recusas.length, 'calado: sem o "não pode"').toBe(0);
      // nada em dobro e nada perdido: as duas tábuas no chão, a mochila sem nenhuma
      expect(noChao() - chaoAntes, 'as duas tábuas no chão').toBe(2);
      expect(j.inventario.obter(0), 'a mochila').toBeNull();
    } finally {
      m.fim();
    }
  }, 30_000);
});
