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

  it('prévia do mundo: nome, tema, dono e quem está lá (sem id nem chave)', async () => {
    const { g, codigo } = await criarSala();
    const b = canal('5.6.7.8');
    await g.receber(
      b,
      JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident('bia'), codigo }),
    );
    const p = await g.previa(codigo.toLowerCase(), '9.9.9.9');
    expect(p).toMatchObject({
      codigo,
      nome: 'Mundo da família',
      tema: 'bruma-e-luz',
      dono: 'ana',
      fechado: false,
      cheio: false,
    });
    expect(p!.presentes.sort()).toEqual(['ana', 'bia']);
    expect(JSON.stringify(p)).not.toContain('chave');
    expect(await g.previa('NADA-DISSO-00', '9.9.9.9')).toBeNull();
  });

  it('parar de jogar com amigos: o dono recebe o mundo inteiro, os outros saem e o código morre', async () => {
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
    await g.receber(a, JSON.stringify({ t: 'quebrar', id: 1, x, y, z, slot: 0, seq: 1 }));
    await avancar(200);
    // a Bia não manda no mundo
    await g.receber(b, JSON.stringify({ t: 'dono', acao: 'devolver' }));
    expect(g.ativas.has(codigo)).toBe(true);
    await g.receber(a, JSON.stringify({ t: 'dono', acao: 'devolver' }));
    const dev = a.recebidas.find((m) => m.t === 'devolvido') as Extract<
      RespostaServidor,
      { t: 'devolvido' }
    >;
    expect(dev).toBeTruthy();
    expect(dev.dados.versao).toBe(1);
    expect(Object.keys(dev.dados.edicoes).length).toBeGreaterThan(0);
    expect(dev.dados.extras['inventario']).toBeTruthy();
    expect(dev.dados.jogador).toBeTruthy();
    expect(b.recebidas.some((m) => m.t === 'encerrada')).toBe(true);
    expect(b.fechado()).toBe(true);
    expect(a.fechado()).toBe(true);
    expect(g.ativas.has(codigo)).toBe(false);
    // o código deixa de valer
    const c = canal('7.7.7.7');
    await g.receber(
      c,
      JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident('caio'), codigo }),
    );
    expect(c.recebidas.some((m) => m.t === 'recusado')).toBe(true);
    // a dona que caiu no meio volta pelo código e recebe o mundo de novo (só ela)
    const a2 = canal();
    await g.receber(
      a2,
      JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident('ana'), codigo }),
    );
    expect(a2.recebidas.some((m) => m.t === 'devolvido')).toBe(true);
    expect(await g.previa(codigo, '9.9.9.8')).toBeNull();
    // nenhuma gravação atrasada traz a sala de volta
    await avancar(70_000);
    expect(g.ativas.has(codigo)).toBe(false);
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
          jogador: ident('xis'),
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
        jogador: ident('xis'),
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

describe('o servidor aguenta mensagem de quem quer estragar', () => {
  const entrar = (jogador: unknown, extra: object) =>
    JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador, ...extra });

  it('estilo malformado não derruba: a sala anda com o estilo padrão', async () => {
    const s = servidor();
    const a = canal();
    await s.g.receber(
      a,
      entrar(ident('ana'), { criar: { ...criarMundo, estilo: { crateras: 0 } } }),
    );
    expect(a.recebidas.some((m) => m.t === 'bemvindo')).toBe(true);
    await s.avancar(500);
    expect(quadros(a).length).toBeGreaterThan(5);
  });

  it('levar para a nuvem: as construções do aparelho sobrevivem à sala dormir', async () => {
    const s = servidor();
    const a = canal();
    const dados = {
      versao: 1,
      edicoes: { '0,0': [[5, 1]], '100,100': [[7, 3]] },
      jogador: null,
      hora: 0.3,
      extras: {},
    };
    await s.g.receber(a, entrar(ident('ana'), { criar: { ...criarMundo, dados } }));
    const bv = a.recebidas.find((m) => m.t === 'bemvindo') as Extract<
      RespostaServidor,
      { t: 'bemvindo' }
    >;
    s.g.caiu(a);
    await s.avancar(100_000);
    expect(s.g.ativas.size).toBe(0);
    const b = canal();
    await s.g.receber(b, entrar(ident('ana'), { codigo: bv.sala.codigo }));
    const bv2 = b.recebidas.find((m) => m.t === 'bemvindo') as Extract<
      RespostaServidor,
      { t: 'bemvindo' }
    >;
    expect(Object.keys(bv2.edicoes).sort()).toEqual(['0,0', '100,100']);
  });

  it('rajada de "entrar" na mesma conexão cria uma sala só, e não deixa fantasmas', async () => {
    const s = servidor();
    const a = canal();
    await Promise.all(
      Array.from({ length: 5 }, () => s.g.receber(a, entrar(ident('ana'), { criar: criarMundo }))),
    );
    expect(s.g.ativas.size).toBe(1);
    s.g.caiu(a);
    await s.avancar(100_000);
    expect(s.g.ativas.size).toBe(0);
  });

  it('rajada de palpites conta todos, e id fora do formato é recusado', async () => {
    const s = servidor();
    const a = canal('9.9.9.9');
    await Promise.all(
      Array.from({ length: 40 }, (_, i) =>
        s.g.receber(
          canal('9.9.9.9'),
          entrar(ident(`chute${i}`), { codigo: `NADA-NADA-${10 + i}` }),
        ),
      ),
    );
    await s.g.receber(a, entrar(ident('ana'), { codigo: 'NADA-NADA-99' }));
    expect(a.recebidas.at(-1)).toEqual({ t: 'recusado', motivo: 'limite' });
    const c = canal('7.7.7.7');
    await s.g.receber(c, entrar({ ...ident('x'), id: '../regioes/0,0' }, { criar: criarMundo }));
    expect(c.recebidas.at(-1)).toEqual({ t: 'recusado', motivo: 'identidade' });
  });

  it('ninguém toma o lugar de quem acabou de entrar, nem os poderes do dono', async () => {
    const { g, a, codigo } = await criarSala();
    const ladrao = canal('6.6.6.6');
    await g.receber(
      ladrao,
      entrar({ ...ident('ana'), chave: 'outra-chave-qualquer-0000' }, { codigo }),
    );
    expect(ladrao.recebidas.at(-1)).toEqual({ t: 'recusado', motivo: 'identidade' });
    expect(a.fechado()).toBe(false);
  });

  it('o dono troca o código: quem estava volta pelo antigo, quem não estava não', async () => {
    const { g, a, codigo, avancar } = await criarSala();
    const b = canal('5.6.7.8');
    await g.receber(b, entrar(ident('bia'), { codigo }));
    g.caiu(b);
    await g.receber(a, JSON.stringify({ t: 'dono', acao: 'trocarCodigo' }));
    await avancar(1000);
    const b2 = canal('5.6.7.8');
    await g.receber(b2, entrar(ident('bia'), { codigo }));
    const bv = b2.recebidas.find((m) => m.t === 'bemvindo') as Extract<
      RespostaServidor,
      { t: 'bemvindo' }
    >;
    expect(bv.sala.codigo).not.toBe(codigo);
    const c = canal('8.8.8.8');
    await g.receber(c, entrar(ident('caio'), { codigo }));
    expect(c.recebidas.at(-1)).toEqual({ t: 'recusado', motivo: 'codigo' });
  });

  it('uma mensagem perdida na ordem não deixa o jogador parado para sempre', async () => {
    const { g, a, avancar } = await criarSala();
    await avancar(200);
    // a mensagem 1 nunca chega; as próximas 201 chegam
    for (let seq = 2; seq <= 202; seq++)
      await g.receber(
        a,
        JSON.stringify({
          t: 'colocar',
          id: seq,
          x: 0,
          y: 90,
          z: seq,
          bloco: 7,
          meta: 0,
          slot: 0,
          seq,
        }),
      );
    await avancar(200);
    const colocados = quadros(a).flatMap((q) => q.blocos ?? []);
    expect(colocados.length).toBeGreaterThan(100);
  });
});
