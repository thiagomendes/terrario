import { afterEach, describe, expect, it, vi } from 'vitest';
import { blocoDe, criarEdicoes, indiceDonoDe, metaDe } from '../../src/world/edicoes';
import { diferencaDasEdicoes } from '../../src/cliente/diferencaEdicoes';
import { Bloco } from '../../src/world/blocks';
import type { BemVindo, ConexaoNuvem } from '../../src/cliente/conexaoNuvem';
import type { EventoNucleo } from '../../src/nucleo/protocolo';
import { criarNuvem, espera, ligarEstado } from './nuvemDeVerdade';

/**
 * Os blocos que somem na sala da nuvem (relato do dono, 23 nov 2026, Doce Reino, o filho criou e
 * o pai entrou): o pai constrói, olha para outro lado e, quando volta a olhar, parte dos blocos
 * sumiu. No registro do servidor, as duas conexões trocaram por uma nova no meio da partida, e a
 * velha só caiu 30 s depois (código 1006): estava morta sem ninguém saber.
 *
 * Aqui, com o servidor, a conexão e o estado de verdade, o "mundo na tela" de cada um é um
 * `Edicoes` feito como a cena faz (as previsões, os blocos dos quadros e a diferença do
 * bem-vindo da volta), ligado como `src/nuvem.ts` liga (o `reconferir` no "Voltamos!").
 */
const BLOCO = Bloco.TABUAS;

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
  return { tela, est, recusas };
}

type Como = 'conexão morta' | 'só a volta morta' | 'queda';

async function cenario(como: Como, ip: string) {
  const nuvem = criarNuvem(ip);
  try {
    const codigo = await nuvem.criarSala('filho', 'doce-reino');
    const c2 = nuvem.conectar('filho', { codigo });
    const filho = ligarTela(c2, await c2.pronta);
    const c3 = nuvem.conectar('pai', { codigo });
    const bv3 = await c3.pronta;
    const pai = ligarTela(c3, bv3);
    await ate(() => pai.est.quadrosRecebidos > 5, 3000, 'o pai receber quadros');

    const sala = nuvem.g.ativas.get(codigo)!;
    // o que o núcleo recebe do pai (o que foi de novo conta outra vez)
    const recebidos: Record<string, number> = {};
    const comando = sala.nucleo.comando.bind(sala.nucleo);
    sala.nucleo.comando = (id, c) => {
      if (id === 'pai') recebidos[c.t] = (recebidos[c.t] ?? 0) + 1;
      comando(id, c);
    };
    const noServidor = (p: { x: number; y: number; z: number }) =>
      sala.nucleo.estado.mundo.bloco(p.x, p.y, p.z);
    const x0 = Math.floor(bv3.pos.x);
    const y0 = Math.floor(bv3.pos.y) + 3;
    const z0 = Math.floor(bv3.pos.z);
    // duas fileiras de 6, em cima da cabeça (dentro do alcance, longe do corpo)
    const fileira = (dz: number) =>
      Array.from({ length: 6 }, (_, i) => ({ x: x0 - 3 + i, y: y0, z: z0 + dz }));
    const antes = fileira(2);
    const depois = fileira(3);
    for (const p of [...antes, ...depois]) expect(noServidor(p), 'a célula começa vazia').toBe(0);

    /** Como a cena põe um bloco: a previsão na tela e o comando com o mesmo id. */
    const por = (p: { x: number; y: number; z: number }) => {
      const id = pai.est.proximoId();
      pai.est.prever(id, p.x, p.y, p.z, BLOCO);
      pai.est.enviar({ t: 'colocar', id, ...p, bloco: BLOCO, meta: 0, slot: 0 });
    };

    // a primeira fileira, com a conexão boa: chega ao servidor e ao filho
    for (const p of antes) por(p);
    await ate(
      () => antes.every((p) => noServidor(p) === BLOCO && filho.tela.obter(p.x, p.y, p.z) === BLOCO),
      3000,
      'a primeira fileira chegar ao servidor e ao filho',
    );
    await espera(200);

    if (como !== 'queda') {
      // a conexão do pai morre sem ninguém saber, e ele continua construindo (com a volta
      // morta, o servidor recebe tudo e o pai não fica sabendo: ele também tira um bloco)
      nuvem.emudecer('pai', como === 'só a volta morta');
      await espera(300);
      for (const p of depois) por(p);
      if (como === 'só a volta morta') {
        const p = antes[0];
        const id = pai.est.proximoId();
        pai.est.prever(id, p.x, p.y, p.z, Bloco.AR);
        pai.est.enviar({ t: 'quebrar', id, ...p, slot: 0 });
      }
      // o vigia do silêncio (4 s sem quadro) troca a conexão por outra
      await ate(() => pai.est.ressincronizacoes >= 1, 8000, 'a rede de segurança ressincronizar');
    } else {
      // a internet do pai cai de vez; enquanto a conexão volta, ele continua construindo
      nuvem.segurar('pai');
      nuvem.derrubar('pai');
      await ate(() => c3.estado === 'reconectando', 2000, 'a conexão do pai cair');
      for (const p of depois) por(p);
      await espera(200);
      nuvem.soltar('pai');
    }
    await ate(() => c3.estado === 'conectado', 12_000, 'o pai voltar');
    await ate(
      () => [...antes, ...depois].every((p) => !pai.est.pendente(p.x, p.y, p.z)),
      5000,
      'o núcleo responder às previsões do pai',
    );
    await espera(500);

    const conta = (f: (p: { x: number; y: number; z: number }) => boolean) =>
      [...antes, ...depois].filter(f).length;
    const r = {
      servidor: conta((p) => noServidor(p) === BLOCO),
      telaDoPai: conta((p) => pai.tela.obter(p.x, p.y, p.z) === BLOCO),
      telaDoFilho: conta((p) => filho.tela.obter(p.x, p.y, p.z) === BLOCO),
      recusasDoPai: pai.recusas.length,
      recebidos,
      tirado: {
        servidor: noServidor(antes[0]),
        telaDoPai: pai.tela.obter(antes[0].x, antes[0].y, antes[0].z),
        telaDoFilho: filho.tela.obter(antes[0].x, antes[0].y, antes[0].z),
      },
    };
    c2.encerrar();
    c3.encerrar();
    return r;
  } finally {
    nuvem.parar();
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
    expect(r.tirado.telaDoPai ?? Bloco.AR, 'o tirado, na tela do pai').toBe(Bloco.AR);
    expect(r.tirado.telaDoFilho ?? Bloco.AR, 'o tirado, na tela do filho').toBe(Bloco.AR);
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
});
