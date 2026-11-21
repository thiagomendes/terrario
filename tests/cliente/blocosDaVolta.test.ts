import { afterEach, describe, expect, it, vi } from 'vitest';
import { criarEdicoes } from '../../src/world/edicoes';
import { Bloco } from '../../src/world/blocks';
import type { ConexaoNuvem } from '../../src/cliente/conexaoNuvem';
import { criarNuvem, espera, ligarEstado } from './nuvemDeVerdade';

/**
 * Spec 035, seção 3 (os blocos da volta), com o servidor de verdade: o pai põe um bloco e tira
 * outro enquanto o filho está fora; quando o filho volta, a tela dele tem o bloco posto (com o
 * dono certo) e não tem o tirado. Os quadros só trazem o que muda dali em diante: o que mudou
 * com ele fora vem no bem-vindo novo. Falha até a T05: o filho volta sem o bloco.
 *
 * O "mundo na tela" do filho é um `Edicoes` feito como a cena faz: as edições e os donos do
 * primeiro bem-vindo, e depois os blocos e os donos de cada quadro. A volta repete o que
 * `src/nuvem.ts` faz no `'conectado'` depois da queda (`reconferir`). A T05 liga aqui o
 * `aoBemVindo` da conexão à diferença das edições, como a cena.
 */
const SEMENTE = 7;
const BLOCO = Bloco.TABUAS;

async function ate(cond: () => boolean, ms: number, oQue: string): Promise<void> {
  const fim = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > fim) throw new Error(`esperou ${ms} ms e não: ${oQue}`);
    await espera(20);
  }
}

type ComoSai = 'queda' | 'ressincronização';

async function cenario(como: ComoSai, ip: string) {
  const nuvem = criarNuvem(ip);
  try {
    const codigo = await nuvem.criarSala('filho');
    // o filho entra (a página nova) e liga o estado na hora: aqui a corrida não interessa
    const c2 = nuvem.conectar('filho', { codigo });
    const bv2 = await c2.pronta;
    const tela = criarEdicoes(SEMENTE);
    tela.importar(bv2.edicoes);
    tela.donos.importar(bv2.donos);
    let viuPai = false;
    const filho = ligarEstado(c2, {
      aplicarBloco: (x, y, z, b, meta, dono) => tela.definir(x, y, z, b, meta, dono),
      aoQuadro: (q) => {
        if (q.donos) tela.donos.importar(q.donos);
        if (q.donosNovos) tela.donos.aplicar(q.donosNovos);
        if (q.jogadores?.some((o) => o.id === 'pai')) viuPai = true;
      },
    });
    // como src/nuvem.ts: voltou da queda, reconfere (recomeça a sequência dos quadros)
    let caiu = false;
    c2.aoEstado((e) => {
      if (e === 'reconectando') caiu = true;
      else if (e === 'conectado' && caiu) {
        caiu = false;
        filho.reconferir();
      }
    });

    // o pai entra pelo link (os amigos constroem: é o padrão da sala)
    const c3 = nuvem.conectar('pai', { codigo });
    const bv3 = await c3.pronta;
    const pai = ligarEstado(c3);
    await ate(() => viuPai, 3000, 'o filho ver o pai');

    const sala = nuvem.g.ativas.get(codigo)!;
    const noServidor = (x: number, y: number, z: number) => sala.nucleo.estado.mundo.bloco(x, y, z);
    const x = Math.floor(bv3.pos.x);
    const y = Math.floor(bv3.pos.y) + 3;
    const z = Math.floor(bv3.pos.z);
    const tirado = { x: x + 2, y, z };
    const posto = { x: x + 3, y, z };
    expect(noServidor(tirado.x, tirado.y, tirado.z), 'a célula do tirado começa vazia').toBe(0);
    expect(noServidor(posto.x, posto.y, posto.z), 'a célula do posto começa vazia').toBe(0);

    // com o filho dentro, o pai põe o bloco que depois vai tirar: o filho vê
    pai.enviar({ t: 'editar', id: pai.proximoId(), lote: [{ ...tirado, v: BLOCO }] });
    await ate(
      () => tela.obter(tirado.x, tirado.y, tirado.z) === BLOCO,
      3000,
      'o filho ver o primeiro bloco do pai',
    );

    // o filho sai: a conexão nova dele espera para abrir
    nuvem.segurar('filho');
    if (como === 'queda') {
      nuvem.derrubar('filho');
      await ate(() => c2.estado === 'reconectando', 2000, 'a conexão do filho cair');
    } else {
      const comRessinc = c2 as ConexaoNuvem & { ressincronizar?: () => void };
      expect(comRessinc.ressincronizar, 'a conexão sabe ressincronizar (T03)').toBeTypeOf(
        'function',
      );
      filho.reconferir();
      comRessinc.ressincronizar!();
    }

    // com o filho fora, o pai tira um bloco e põe outro
    pai.enviar({
      t: 'editar',
      id: pai.proximoId(),
      lote: [
        { ...tirado, v: Bloco.AR },
        { ...posto, v: BLOCO },
      ],
    });
    await ate(
      () => noServidor(posto.x, posto.y, posto.z) === BLOCO && noServidor(tirado.x, tirado.y, tirado.z) === 0,
      3000,
      'o servidor aplicar o lote do pai',
    );
    await espera(200);

    // o filho volta
    nuvem.soltar('filho');
    await ate(() => c2.estado === 'conectado', 12_000, 'o filho voltar');
    // a volta deu certo: o que o pai faz agora chega pelos quadros (só o de antes falta)
    const depois = { x: x + 4, y, z };
    pai.enviar({ t: 'editar', id: pai.proximoId(), lote: [{ ...depois, v: BLOCO }] });
    await ate(
      () => tela.obter(depois.x, depois.y, depois.z) === BLOCO,
      3000,
      'o filho ver o bloco que o pai pôs depois da volta',
    );
    await espera(300);

    const resultado = {
      posto: tela.obter(posto.x, posto.y, posto.z) ?? 0,
      donoDoPosto: tela.donos.id(tela.indiceDono(posto.x, posto.y, posto.z)),
      tirado: tela.obter(tirado.x, tirado.y, tirado.z) ?? 0,
    };
    c2.encerrar();
    c3.encerrar();
    return resultado;
  } finally {
    nuvem.parar();
  }
}

describe('os blocos da volta, com o servidor de verdade', () => {
  afterEach(() => vi.restoreAllMocks());

  it('o pai põe e tira um bloco com o filho fora (queda): o filho volta vendo os dois', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const r = await cenario('queda', '10.9.0.1');
    expect(r.posto, 'o bloco posto com o filho fora').toBe(BLOCO);
    expect(r.donoDoPosto, 'o dono do bloco posto').toBe('pai');
    expect(r.tirado, 'o bloco tirado com o filho fora').toBe(Bloco.AR);
  }, 30_000);

  it('o mesmo com uma ressincronização no lugar da queda', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const r = await cenario('ressincronização', '10.9.0.2');
    expect(r.posto, 'o bloco posto com o filho fora').toBe(BLOCO);
    expect(r.donoDoPosto, 'o dono do bloco posto').toBe('pai');
    expect(r.tirado, 'o bloco tirado com o filho fora').toBe(Bloco.AR);
  }, 30_000);
});
