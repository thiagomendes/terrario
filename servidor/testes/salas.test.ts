import { describe, expect, it } from 'vitest';
import { criarGerenciador, type Canal } from '../src/salas';
import { armazemMemoria } from '../src/armazem';
import { ESTILO_PADRAO, alturaTerreno } from '../../src/world/chunk';
import { VERSAO_REDE, type RespostaServidor } from '../../src/rede/protocolo';
import { VERSAO_PROTOCOLO, type Quadro } from '../../src/nucleo/protocolo';

/** Conexão de mentira: guarda o que o servidor mandou. */
function canal(ip = '1.2.3.4') {
  const recebidas: RespostaServidor[] = [];
  let fechado = false;
  const c: Canal & { recebidas: RespostaServidor[]; fechado: () => boolean } = {
    ip,
    enviar: (t) => recebidas.push(JSON.parse(t) as RespostaServidor),
    fechar: () => {
      fechado = true;
    },
    recebidas,
    fechado: () => fechado,
  };
  return c;
}
const ident = (id: string) => ({
  id,
  chave: `chave-secreta-de-${id}-123`,
  apelido: id,
  aparencia: {},
});
const criarMundo = {
  nome: 'Mundo da família',
  semente: 1337,
  tema: 'bruma-e-luz',
  modo: 'criativo' as const,
  versaoMundo: 2,
  estilo: ESTILO_PADRAO,
};

function servidor() {
  let t = 0;
  const armazem = armazemMemoria();
  const g = criarGerenciador({ armazem, agora: () => t, sorteio: Math.random, depuracao: true });
  const avancar = async (ms: number) => {
    for (let i = 0; i < ms; i += 50) {
      t += 50;
      g.passo();
      if (i % 1000 === 0) await g.manutencao();
    }
    await g.manutencao();
  };
  return { g, armazem, avancar, tempo: () => t };
}

async function criarSala() {
  const s = servidor();
  const a = canal();
  await s.g.receber(
    a,
    JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident('ana'), criar: criarMundo }),
  );
  const bv = a.recebidas.find((m) => m.t === 'bemvindo') as Extract<
    RespostaServidor,
    { t: 'bemvindo' }
  >;
  return { ...s, a, codigo: bv.sala.codigo, bv };
}

const quadros = (c: ReturnType<typeof canal>) =>
  c.recebidas.filter((m) => m.t === 'quadro') as Quadro[];

describe('salas do servidor', () => {
  it('cria um mundo com código no formato certo, e outro entra digitando do jeito dele', async () => {
    const { g, a, codigo, bv, avancar } = await criarSala();
    expect(codigo).toMatch(/^[A-Z]+-[A-Z]+-\d\d$/);
    expect(bv.sala.dono).toBe('ana');
    const b = canal('5.6.7.8');
    const digitado = codigo.toLowerCase().replace(/-/g, ' ');
    await g.receber(
      b,
      JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident('bia'), codigo: digitado }),
    );
    expect(b.recebidas[0]).toMatchObject({ t: 'bemvindo', voce: 'bia' });
    await avancar(500);
    // os dois recebem quadros e cada um vê o outro
    expect(
      quadros(a)
        .at(-1)!
        .jogadores?.map((j) => j.id),
    ).toEqual(['bia']);
    expect(
      quadros(b)
        .at(-1)!
        .jogadores?.map((j) => j.id),
    ).toEqual(['ana']);
    expect(quadros(b).find((q) => q.primeiro)).toBeTruthy();
    expect(quadros(a).some((q) => q.eventos?.some((e) => e.e === 'entrou'))).toBe(true);
  });

  it('o bloco que um quebra chega ao outro; comandos fora de ordem entram em ordem', async () => {
    const { g, a, codigo, avancar } = await criarSala();
    const b = canal('5.6.7.8');
    await g.receber(
      b,
      JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident('bia'), codigo }),
    );
    await avancar(300);
    const j = g.ativas.get(codigo)!.nucleo.estado.jogadores.get('ana')!;
    const x = Math.floor(j.tel.x) + 1;
    const z = Math.floor(j.tel.z);
    const y = alturaTerreno(x, z, 1337) - 1;
    const alto = alturaTerreno(x - 1, z, 1337);
    // onde ela está de verdade (o cliente manda a cada 50 ms)
    await g.receber(
      a,
      JSON.stringify({
        t: 'jogador',
        x: x - 0.5,
        y: alto,
        z: z + 0.5,
        yaw: 0,
        pitch: 0,
        olhos: alto + 1.62,
        noChao: true,
        voando: false,
        vel: 0,
        correndo: false,
        submerso: false,
        quedas: [],
        pulos: 0,
        golpes: 0,
        slot: 0,
      }),
    );
    // seq 2 chega antes do 1
    await g.receber(a, JSON.stringify({ t: 'quebrar', id: 2, x, y: y - 1, z, slot: 0, seq: 2 }));
    await g.receber(a, JSON.stringify({ t: 'quebrar', id: 1, x, y, z, slot: 0, seq: 1 }));
    await avancar(200);
    const blocos = quadros(b).flatMap((q) => q.blocos ?? []);
    expect(blocos.some((bl) => bl.x === x && bl.y === y && bl.z === z && bl.v === 0)).toBe(true);
    expect(blocos.some((bl) => bl.x === x && bl.y === y - 1 && bl.z === z && bl.v === 0)).toBe(
      true,
    );
  });

  it('código errado recusa, e chutar muitos códigos bloqueia o endereço', async () => {
    const { g } = await criarSala();
    for (let i = 0; i < 20; i++) {
      const c = canal('9.9.9.9');
      await g.receber(
        c,
        JSON.stringify({
          t: 'entrar',
          versao: VERSAO_REDE,
          jogador: ident('x'),
          codigo: 'LUA-SOL-01',
        }),
      );
      expect(c.recebidas[0]).toEqual({ t: 'recusado', motivo: 'codigo' });
    }
    const c = canal('9.9.9.9');
    await g.receber(
      c,
      JSON.stringify({
        t: 'entrar',
        versao: VERSAO_REDE,
        jogador: ident('x'),
        codigo: 'LUA-SOL-01',
      }),
    );
    expect(c.recebidas[0]).toEqual({ t: 'recusado', motivo: 'limite' });
  });

  it('caiu a internet e voltou: mesmo jogador, mesmo lugar, sequência recomeçada', async () => {
    const { g, a, codigo, avancar } = await criarSala();
    await avancar(300);
    g.caiu(a);
    await avancar(5000);
    expect(g.ativas.get(codigo)!.presentes.has('ana')).toBe(true);
    const a2 = canal();
    await g.receber(
      a2,
      JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident('ana'), codigo }),
    );
    await avancar(200);
    expect(quadros(a2)[0].primeiro).toBe(true);
    expect(quadros(a2)[0].inventario).toBeDefined();
  });

  it('o dono expulsa e troca o código; o antigo deixa de valer na hora', async () => {
    const { g, a, codigo, avancar } = await criarSala();
    const b = canal('5.6.7.8');
    await g.receber(
      b,
      JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident('bia'), codigo }),
    );
    await avancar(200);
    // quem não é dono não manda
    await g.receber(b, JSON.stringify({ t: 'dono', acao: 'expulsar', id: 'ana' }));
    expect(a.fechado()).toBe(false);
    await g.receber(a, JSON.stringify({ t: 'dono', acao: 'expulsar', id: 'bia' }));
    expect(b.recebidas.some((m) => m.t === 'expulso')).toBe(true);
    const b2 = canal('5.6.7.8');
    await g.receber(
      b2,
      JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident('bia'), codigo }),
    );
    expect(b2.recebidas[0]).toEqual({ t: 'recusado', motivo: 'expulso' });
    await g.receber(a, JSON.stringify({ t: 'dono', acao: 'trocarCodigo' }));
    const novo = (
      a.recebidas.filter((m) => m.t === 'sala').at(-1) as Extract<RespostaServidor, { t: 'sala' }>
    ).sala.codigo;
    expect(novo).not.toBe(codigo);
    const c = canal('7.7.7.7');
    await g.receber(
      c,
      JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident('caio'), codigo }),
    );
    expect(c.recebidas[0]).toEqual({ t: 'recusado', motivo: 'codigo' });
    const c2 = canal('7.7.7.7');
    await g.receber(
      c2,
      JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident('caio'), codigo: novo }),
    );
    expect(c2.recebidas[0]).toMatchObject({ t: 'bemvindo' });
  });

  it('sala vazia dorme e volta igual: blocos, inventário e posição', async () => {
    const { g, a, codigo, avancar } = await criarSala();
    await avancar(300);
    const j = g.ativas.get(codigo)!.nucleo.estado.jogadores.get('ana')!;
    const x = Math.floor(j.tel.x) + 2;
    const z = Math.floor(j.tel.z);
    const y = Math.floor(j.tel.y);
    await g.receber(
      a,
      JSON.stringify({ t: 'colocar', id: 1, x, y, z, bloco: 7, meta: 0, slot: 0, seq: 1 }),
    );
    await avancar(6000);
    g.caiu(a);
    // 30 s de tolerância + 60 s vazia
    await avancar(95_000);
    expect(g.ativas.has(codigo)).toBe(false);
    const a2 = canal();
    await g.receber(
      a2,
      JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident('ana'), codigo }),
    );
    await avancar(200);
    expect(g.ativas.get(codigo)!.nucleo.estado.mundo.bloco(x, y, z)).toBe(7);
  });

  it('ninguém entra com o id de outro, e a versão errada é recusada', async () => {
    const { g, a, codigo, avancar } = await criarSala();
    await avancar(6000);
    g.caiu(a);
    await avancar(40_000);
    const falso = canal('6.6.6.6');
    await g.receber(
      falso,
      JSON.stringify({
        t: 'entrar',
        versao: VERSAO_REDE,
        jogador: { ...ident('ana'), chave: 'outra-chave-qualquer-0000' },
        codigo,
      }),
    );
    expect(falso.recebidas[0]).toEqual({ t: 'recusado', motivo: 'identidade' });
    const velho = canal();
    await g.receber(
      velho,
      JSON.stringify({ t: 'entrar', versao: 99, jogador: ident('z'), codigo }),
    );
    expect(velho.recebidas[0]).toEqual({ t: 'recusado', motivo: 'versao' });
    expect(VERSAO_PROTOCOLO).toBe(1);
  });
});
