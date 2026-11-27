import { afterAll, describe, expect, it } from 'vitest';
import { criarGerenciador, type Canal } from '../src/salas';
import { armazemMemoria } from '../src/armazem';
import {
  ESTILO_PADRAO,
  alturaTerreno,
  cidadeDoMundo,
  definirEstiloMundo,
  indice,
} from '../../src/world/chunk';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { celulasPlanejadas, definirObrasFeitas } from '../../src/world/obras';
import { COLHER_PEDREIRO } from '../../src/jogo/exclusivos';
import { Bloco } from '../../src/world/blocks';
import { empacotar } from '../../src/world/edicoes';
import { soltarDoBloco } from '../../src/player/fisica';
import { gerarCodigo } from '../../src/jogo/codigos';
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
  tema: 'vila-neon',
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

  it('gesto (spec 015): a amiga vê, rajada vira um, inválido não entra, quem fez não recebe', async () => {
    const { g, a, codigo, avancar } = await criarSala();
    const b = canal('5.6.7.8');
    await g.receber(
      b,
      JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident('bia'), codigo }),
    );
    await avancar(300);
    const gestos = (c: ReturnType<typeof canal>) =>
      quadros(c).flatMap((q) => (q.eventos ?? []).filter((e) => e.e === 'gesto'));
    let seq = 0;
    const mandar = (gesto: unknown) =>
      g.receber(a, JSON.stringify({ t: 'gesto', id: 900 + seq, gesto, seq: ++seq }));
    await mandar('voar');
    for (let i = 0; i < 5; i++) await mandar('acenar');
    await avancar(300);
    expect(gestos(b)).toEqual([{ e: 'gesto', gesto: 'acenar', jogador: 'ana' }]);
    await avancar(900);
    await mandar('sentar');
    await avancar(200);
    expect(gestos(b).map((e) => e.gesto)).toEqual(['acenar', 'sentar']);
    expect(gestos(a)).toEqual([]);
  });

  it('premium na aparência (spec 023): a amiga vê o que a outra veste; o lixo não passa', async () => {
    const { g, a, codigo, avancar } = await criarSala();
    const b = canal('5.6.7.8');
    await g.receber(
      b,
      JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident('bia'), codigo }),
    );
    await avancar(300);
    const premiumDaAna = (c: ReturnType<typeof canal>) => {
      const q = quadros(c).filter((x) => x.perfis?.ana);
      return q.length ? (q[q.length - 1].perfis!.ana.aparencia as { premium?: unknown }).premium : null;
    };
    await g.receber(
      a,
      JSON.stringify({
        t: 'aparencia',
        aparencia: { modelo: 'andarilho', premium: { roupa: 'tenis-cometa', bicho: 'unicornio' } },
        seq: 1,
      }),
    );
    await avancar(300);
    expect(premiumDaAna(b)).toEqual({ roupa: 'tenis-cometa', bicho: 'unicornio' });
    await avancar(1200);
    await g.receber(
      a,
      JSON.stringify({
        t: 'aparencia',
        aparencia: { modelo: 'andarilho', premium: { roupa: 'unicornio', costas: { x: 1 } } },
        seq: 2,
      }),
    );
    await avancar(300);
    expect(premiumDaAna(b)).toBeUndefined();
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
      tema: 'vila-neon',
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

  it('o mesmo jogador abre em outra aba: a antiga recebe "substituido" e fecha (sem disputa)', async () => {
    const { g, a, codigo, avancar } = await criarSala();
    await avancar(300);
    const a2 = canal();
    await g.receber(
      a2,
      JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident('ana'), codigo }),
    );
    expect(a.recebidas.at(-1)).toEqual({ t: 'substituido' });
    expect(a.fechado()).toBe(true);
    expect(a2.fechado()).toBe(false);
    expect(a2.recebidas.some((m) => m.t === 'substituido')).toBe(false);
    expect(g.ativas.get(codigo)!.presentes.size).toBe(1);
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

  // spec 035, seção 4: falha até a T06 (hoje a sala fechada barra quem caiu e volta)
  it('a sala fechada não barra quem já estava nela e caiu (antes dos 30 s); quem chega de novo, sim', async () => {
    const { g, a, codigo, avancar } = await criarSala();
    const b = canal('5.6.7.8');
    await g.receber(
      b,
      JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident('bia'), codigo }),
    );
    expect(b.recebidas[0]).toMatchObject({ t: 'bemvindo', voce: 'bia' });
    await avancar(200);
    await g.receber(a, JSON.stringify({ t: 'dono', acao: 'fechar', fechado: true }));
    // a internet da Bia cai e volta antes da tolerância de 30 s
    g.caiu(b);
    await avancar(5000);
    const b2 = canal('5.6.7.8');
    await g.receber(
      b2,
      JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident('bia'), codigo }),
    );
    expect(b2.recebidas[0]).toMatchObject({ t: 'bemvindo', voce: 'bia' });
    // quem nunca entrou continua barrado
    const c = canal('7.7.7.7');
    await g.receber(
      c,
      JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident('caio'), codigo }),
    );
    expect(c.recebidas[0]).toEqual({ t: 'recusado', motivo: 'fechado' });
    // depois da tolerância de 30 s, quem caiu saiu da sala: com ela fechada, é barrado
    g.caiu(b2);
    await avancar(35_000);
    const b3 = canal('5.6.7.8');
    await g.receber(
      b3,
      JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident('bia'), codigo }),
    );
    expect(b3.recebidas[0]).toEqual({ t: 'recusado', motivo: 'fechado' });
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

  it('a lavoura cresce com alguém na sala, e a sala dorme e acorda igual (spec 013)', async () => {
    const { g, a, codigo, avancar } = await criarSala();
    await avancar(300);
    const nucleo = g.ativas.get(codigo)!.nucleo;
    const j = nucleo.estado.jogadores.get('ana')!;
    j.inventario.definir(0, { item: 'enxada_madeira', qtd: 1, dur: 60 });
    j.inventario.definir(1, { item: 'semente_milho', qtd: 4 });
    const x = Math.floor(j.tel.x) + 2;
    const z = Math.floor(j.tel.z);
    const y = Math.floor(j.tel.y) - 1;
    // grama e céu aberto em cima (no criativo a nuvem aceita o lote perto do jogador)
    const lote = [
      { x, y, z, v: 1 },
      ...Array.from({ length: 8 }, (_, i) => ({ x, y: y + 1 + i, z, v: 0 })),
    ];
    await g.receber(a, JSON.stringify({ t: 'editar', id: 1, lote, seq: 1 }));
    await g.receber(a, JSON.stringify({ t: 'arar', id: 2, x, y, z, slot: 0, seq: 2 }));
    await g.receber(
      a,
      JSON.stringify({ t: 'colocar', id: 3, x, y: y + 1, z, bloco: 73, meta: 0, slot: 1, seq: 3 }),
    );
    await avancar(200);
    expect(nucleo.estado.mundo.bloco(x, y, z)).toBe(68);
    expect(nucleo.estado.mundo.bloco(x, y + 1, z)).toBe(73);
    // dois minutos e pouco com a Ana na sala: passou de estágio (sol 1×, chuva 1,5×)
    await avancar(125_000);
    expect(nucleo.estado.mundo.bloco(x, y + 1, z)).toBe(74);
    g.caiu(a);
    await avancar(95_000);
    expect(g.ativas.has(codigo)).toBe(false);
    const k = `${x},${y + 1},${z}`;
    const antes = { b: nucleo.estado.mundo.bloco(x, y + 1, z), p: nucleo.estado.lavoura.get(k)?.p };
    expect(antes.p).toBeGreaterThan(0);
    const a2 = canal();
    await g.receber(
      a2,
      JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident('ana'), codigo }),
    );
    const novo = g.ativas.get(codigo)!.nucleo;
    expect(novo).not.toBe(nucleo);
    expect(novo.estado.mundo.bloco(x, y + 1, z)).toBe(antes.b);
    expect(novo.estado.lavoura.get(k)?.p).toBeCloseTo(antes.p!, 1);
    // e continua crescendo com ela de volta
    await avancar(130_000);
    expect(novo.estado.mundo.bloco(x, y + 1, z)).toBeGreaterThan(antes.b);
  });

  it('bichos criados dormem e acordam com a sala, e a noite mansa vem do estilo (spec 013)', async () => {
    const s = servidor();
    const { g, avancar } = s;
    const a = canal();
    await g.receber(
      a,
      JSON.stringify({
        t: 'entrar',
        versao: VERSAO_REDE,
        jogador: ident('ana'),
        criar: {
          ...criarMundo,
          modo: 'sobrevivencia',
          estilo: { ...ESTILO_PADRAO, noite: 'mansa' },
        },
      }),
    );
    const bv = a.recebidas.find((m) => m.t === 'bemvindo') as Extract<
      RespostaServidor,
      { t: 'bemvindo' }
    >;
    const codigo = bv.sala.codigo;
    await avancar(300);
    const nucleo = g.ativas.get(codigo)!.nucleo;
    expect(nucleo.estado.noite).toBe('mansa');
    const j = nucleo.estado.jogadores.get('ana')!;
    j.inventario.definir(0, { item: 'trigo', qtd: 3 });
    j.inventario.definir(1, { item: 'semente_trigo', qtd: 3 });
    const vaca = nucleo.estado.populacao.adicionar('cervo', j.tel.x + 2, j.tel.y, j.tel.z);
    const galinha = nucleo.estado.populacao.adicionar('coelho', j.tel.x - 2, j.tel.y, j.tel.z);
    await g.receber(a, JSON.stringify({ t: 'alimentar', criatura: vaca.id, slot: 0, seq: 1 }));
    await g.receber(a, JSON.stringify({ t: 'alimentar', criatura: galinha.id, slot: 1, seq: 2 }));
    await avancar(200);
    expect(nucleo.estado.populacao.criados).toBe(2);
    expect(j.inventario.contar('trigo')).toBe(2);
    g.caiu(a);
    await avancar(95_000);
    expect(g.ativas.has(codigo)).toBe(false);
    const a2 = canal();
    await g.receber(
      a2,
      JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident('ana'), codigo }),
    );
    const novo = g.ativas.get(codigo)!.nucleo;
    expect(novo).not.toBe(nucleo);
    expect(novo.estado.noite).toBe('mansa');
    const de = novo.estado.populacao.lista.filter((c) => c.criado);
    expect(de.map((c) => c.tipo).sort()).toEqual(['cervo', 'coelho']);
    expect(de.find((c) => c.tipo === 'coelho')!.ovo).toBeGreaterThan(0);
    // o cliente de volta vê os dois criados
    await avancar(200);
    const q = quadros(a2).at(-1)!;
    expect(q.criaturas!.filter((c) => c.criado)).toHaveLength(2);
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

  it('levar para a nuvem e devolver (spec 023): a alma do jogador local é da dona na nuvem e volta', async () => {
    const s = servidor();
    const a = canal();
    const dados = {
      versao: 1,
      edicoes: {},
      jogador: null,
      hora: 0.3,
      extras: { alma: { local: { feitas: ['r1'], progresso: { r2: 1 } } } },
    };
    await s.g.receber(
      a,
      entrar(ident('ana'), {
        criar: { ...criarMundo, tema: 'rancho-alegre', estilo: obterTema('rancho-alegre').mundo, dados },
      }),
    );
    await s.avancar(100);
    const bv = a.recebidas.find((m) => m.t === 'bemvindo') as Extract<
      RespostaServidor,
      { t: 'bemvindo' }
    >;
    const n = s.g.ativas.get(bv.sala.codigo)!.nucleo;
    expect(n.estado.almas.get('ana')).toMatchObject({ feitas: ['r1'], progresso: { r2: 1 } });
    expect(n.estado.almas.has('local')).toBe(false);
    await s.g.receber(a, JSON.stringify({ t: 'dono', acao: 'devolver' }));
    const dev = a.recebidas.find((m) => m.t === 'devolvido') as Extract<
      RespostaServidor,
      { t: 'devolvido' }
    >;
    const alma = dev.dados.extras.alma as Record<string, { feitas: string[] }>;
    expect(Object.keys(alma)).toEqual(['local']);
    expect(alma.local.feitas).toEqual(['r1']);
    definirEstiloMundo(ESTILO_PADRAO);
  });

  it('levar para a nuvem um mundo com lixo (bicho em x = 1e12): a sala anda rápido e manda quadros', async () => {
    const s = servidor();
    const a = canal();
    const longe = 1e12;
    const dados = {
      versao: 1,
      edicoes: { '0,0': [[5, 1]], '62500000000,0': [[7, 70]], lixo: 3 },
      jogador: { x: longe, y: 70, z: longe, yaw: 0, pitch: 0 },
      hora: 0.3,
      extras: {
        criaturas: {
          criados: Array.from({ length: 24 }, () => ({
            tipo: 'cervo',
            x: longe,
            y: 70,
            z: longe,
            vida: 10,
            casa: [longe, longe],
          })),
          raposas: [{ x: longe, y: 70, z: -longe, vida: 10 }],
        },
        itensSoltos: [{ item: 'trigo', qtd: 1, x: longe, y: 70, z: 0 }],
        lavoura: { [`${longe},70,0`]: 5 },
        conteineres: { baus: { [`${longe},70,0`]: [] } },
        spawn: { x: longe, z: longe },
      },
    };
    await s.g.receber(a, entrar(ident('ana'), { criar: { ...criarMundo, dados } }));
    expect(a.recebidas.some((m) => m.t === 'bemvindo')).toBe(true);
    const sala = [...s.g.ativas.values()][0];
    const t0 = performance.now();
    await s.avancar(1000);
    const ms = (performance.now() - t0) / 20;
    expect(ms).toBeLessThan(25);
    expect(quadros(a).length).toBeGreaterThan(15);
    const est = sala.nucleo.estado;
    expect(est.populacao.lista.every((c) => Math.abs(c.x) < 1e8 && Math.abs(c.z) < 1e8)).toBe(true);
    expect(est.mundoItens.itens.every((i) => Math.abs(i.x) < 1e8)).toBe(true);
    const ana = est.jogadores.get('ana')!;
    expect(Math.abs(ana.tel.x)).toBeLessThan(1e8);
    expect(Math.abs(ana.spawn.x)).toBeLessThan(1e8);
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

/** Spec 016, T02: quem colocou cada bloco, na sala da nuvem (e para o navegador de antes). */
describe('dono do bloco na nuvem', () => {
  const entrarComo = (id: string, extra: object) =>
    JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident(id), ...extra });
  const bemvindo = (c: ReturnType<typeof canal>) =>
    c.recebidas.find((m) => m.t === 'bemvindo') as Extract<RespostaServidor, { t: 'bemvindo' }>;
  const valores = (e: Record<string, Array<[number, number]>>) =>
    Object.values(e).flatMap((l) => l.map(([, v]) => v));

  /** Mundo do aparelho da Ana: um bloco dela (sem dono) e um do Caio (de uma sala antiga). */
  const doAparelho = {
    versao: 1,
    edicoes: {
      '0,0': [
        [indice(1, 70, 1), Bloco.TABUAS],
        [indice(2, 70, 1), empacotar(Bloco.TABUAS, 0, 1)],
      ],
    },
    jogador: null,
    hora: 0.4,
    extras: { donos: [['caio', 'Caio']] },
  };

  async function levada() {
    const s = servidor();
    const a = canal();
    await s.g.receber(a, entrarComo('ana', { criar: { ...criarMundo, dados: doAparelho } }));
    const codigo = bemvindo(a).sala.codigo;
    return { ...s, a, codigo, nucleo: () => s.g.ativas.get(codigo)!.nucleo };
  }

  it('levar para a nuvem: o que era do aparelho é da dona; o do amigo segue dele', async () => {
    const { a, nucleo } = await levada();
    expect(nucleo().donoDoBloco(1, 70, 1)).toBe('ana');
    expect(nucleo().donoDoBloco(2, 70, 1)).toBe('caio');
    const bv = bemvindo(a);
    expect(bv.donos).toEqual([['caio', 'Caio']]);
    expect(valores(bv.edicoes)).toContain(empacotar(Bloco.TABUAS, 0, 1));
  });

  it('a amiga coloca: as duas veem o dono no bloco e a tabela nova', async () => {
    const { g, a, codigo, nucleo, avancar } = await levada();
    const b = canal('5.6.7.8');
    await g.receber(b, entrarComo('bia', { codigo }));
    await avancar(300);
    const j = nucleo().estado.jogadores.get('bia')!;
    const x = Math.floor(j.tel.x) + 2;
    const z = Math.floor(j.tel.z);
    const y = Math.floor(j.tel.y);
    nucleo().estado.edicoes.definir(x, y, z, Bloco.AR);
    await g.receber(
      b,
      JSON.stringify({
        t: 'colocar',
        id: 1,
        x,
        y,
        z,
        bloco: Bloco.TABUAS,
        meta: 0,
        slot: 0,
        seq: 1,
      }),
    );
    await avancar(200);
    expect(nucleo().donoDoBloco(x, y, z)).toBe('bia');
    const daBia = empacotar(Bloco.TABUAS, 0, 2);
    const viu = (c: ReturnType<typeof canal>) =>
      quadros(c)
        .flatMap((q) => q.blocos ?? [])
        .find((bl) => bl.x === x && bl.y === y && bl.z === z);
    expect(viu(a)?.v).toBe(daBia);
    expect(viu(b)?.v).toBe(daBia);
    // o "bem-vindo" levou a tabela; os quadros, só a entrada nova (nem repetem a inteira)
    for (const c of [a, b]) {
      expect(bemvindo(c).donos).toContainEqual(['caio', 'Caio']);
      expect(quadros(c).some((q) => q.donos)).toBe(false);
      expect(quadros(c).flatMap((q) => q.donosNovos ?? [])).toContainEqual([2, 'bia', 'bia']);
    }
  });

  it('navegador de antes da 016 recebe "versão nova" (não quebra no formato novo)', async () => {
    const { g, codigo } = await levada();
    const velho = canal('7.7.7.7');
    await g.receber(
      velho,
      JSON.stringify({ t: 'entrar', versao: 2, jogador: ident('caio'), codigo }),
    );
    expect(velho.recebidas).toEqual([{ t: 'recusado', motivo: 'versao' }]);
    expect(velho.fechado()).toBe(true);
  });

  it('sala e mundo guardados antes da 016: o código não existe (e a prévia também não)', async () => {
    const s = servidor();
    const velhoCodigo = gerarCodigo(() => 0.3);
    await s.armazem.gravarSala({
      codigo: velhoCodigo,
      mundoId: 'velho',
      dono: 'ana',
      chaveDono: 'x',
      fechado: false,
      constroem: true,
      criadoEm: 0,
      acessadoEm: 0,
    });
    await s.armazem.gravarMundo('velho', {
      mundo: { id: 'velho', ...criarMundo },
      hora: 0.3,
      extras: {},
    });
    expect(await s.g.previa(velhoCodigo, '9.9.9.9')).toBeNull();
    const a = canal();
    await s.g.receber(a, entrarComo('ana', { codigo: velhoCodigo }));
    expect(a.recebidas).toEqual([{ t: 'recusado', motivo: 'codigo' }]);
    expect(s.g.ativas.size).toBe(0);
  });

  it('grava, dorme e acorda com os mesmos donos; devolver leva a tabela para o aparelho', async () => {
    const { g, a, codigo, armazem, nucleo, avancar } = await levada();
    const b = canal('5.6.7.8');
    await g.receber(b, entrarComo('bia', { codigo }));
    await avancar(300);
    const j = nucleo().estado.jogadores.get('bia')!;
    const x = Math.floor(j.tel.x) + 2;
    const z = Math.floor(j.tel.z);
    const y = Math.floor(j.tel.y);
    nucleo().estado.edicoes.definir(x, y, z, Bloco.AR);
    await g.receber(
      b,
      JSON.stringify({
        t: 'colocar',
        id: 1,
        x,
        y,
        z,
        bloco: Bloco.TABUAS,
        meta: 0,
        slot: 0,
        seq: 1,
      }),
    );
    await avancar(6000);
    const mundoId = g.ativas.get(codigo)!.mundo.id;
    expect((await armazem.lerMundo(mundoId))!.extras.donos).toEqual([
      ['caio', 'Caio'],
      ['bia', 'bia'],
    ]);
    g.caiu(a);
    g.caiu(b);
    await avancar(95_000);
    expect(g.ativas.has(codigo)).toBe(false);
    const a2 = canal();
    await g.receber(a2, entrarComo('ana', { codigo }));
    expect(nucleo().donoDoBloco(x, y, z)).toBe('bia');
    expect(nucleo().donoDoBloco(1, 70, 1)).toBe('ana');
    expect(nucleo().donoDoBloco(2, 70, 1)).toBe('caio');
    expect(bemvindo(a2).donos).toEqual([
      ['caio', 'Caio'],
      ['bia', 'bia'],
    ]);
    await avancar(200);
    await g.receber(a2, JSON.stringify({ t: 'dono', acao: 'devolver' }));
    const dev = a2.recebidas.find((m) => m.t === 'devolvido') as Extract<
      RespostaServidor,
      { t: 'devolvido' }
    >;
    expect(dev.dados.extras.donos).toEqual([
      ['caio', 'Caio'],
      ['bia', 'bia'],
    ]);
    expect(valores(dev.dados.edicoes)).toContain(empacotar(Bloco.TABUAS, 0, 2));
  });

  it('queda no meio da gravação: a tabela de donos já foi (as regiões vão na próxima)', async () => {
    const { g, codigo, armazem, nucleo, avancar } = await levada();
    const b = canal('5.6.7.8');
    await g.receber(b, entrarComo('bia', { codigo }));
    await avancar(300);
    const j = nucleo().estado.jogadores.get('bia')!;
    const x = Math.floor(j.tel.x) + 2;
    const z = Math.floor(j.tel.z);
    const y = Math.floor(j.tel.y);
    nucleo().estado.edicoes.definir(x, y, z, Bloco.AR);
    const gravarRegiao = armazem.gravarRegiao;
    let quedas = 0;
    armazem.gravarRegiao = async () => {
      quedas++;
      throw new Error('o Storage caiu');
    };
    await g.receber(
      b,
      JSON.stringify({
        t: 'colocar',
        id: 1,
        x,
        y,
        z,
        bloco: Bloco.TABUAS,
        meta: 0,
        slot: 0,
        seq: 1,
      }),
    );
    await avancar(6000);
    expect(quedas).toBeGreaterThan(0);
    const mundoId = g.ativas.get(codigo)!.mundo.id;
    expect((await armazem.lerMundo(mundoId))!.extras.donos).toContainEqual(['bia', 'bia']);
    // o Storage volta: a região do bloco da Bia vai, com o dono dela
    armazem.gravarRegiao = gravarRegiao;
    await avancar(6000);
    const regioes = await armazem.lerRegioes(mundoId);
    expect(valores(Object.assign({}, ...Object.values(regioes)))).toContain(
      empacotar(Bloco.TABUAS, 0, 2),
    );
  });

  it('dono malformado vindo do aparelho não derruba nem rouba: entra limpo', async () => {
    const s = servidor();
    const a = canal();
    const ruim = {
      ...doAparelho,
      edicoes: { '0,0': [[indice(3, 70, 1), empacotar(Bloco.TABUAS, 0, 77)]] },
      extras: { donos: 'lixo' },
    };
    await s.g.receber(a, entrarComo('ana', { criar: { ...criarMundo, dados: ruim } }));
    const n = s.g.ativas.get(bemvindo(a).sala.codigo)!.nucleo;
    expect(n.donoDoBloco(3, 70, 1)).toBe('ana');
    expect(bemvindo(a).donos).toEqual([]);
  });
});

describe('construções protegidas na sala (spec 016, três jogadores)', () => {
  const entrarComo = (id: string, extra: object) =>
    JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident(id), ...extra });
  const recusas = (c: ReturnType<typeof canal>) =>
    quadros(c).flatMap((q) =>
      (q.eventos ?? []).filter(
        (e): e is Extract<NonNullable<Quadro['eventos']>[number], { e: 'recusa' }> =>
          e.e === 'recusa',
      ),
    );

  async function trio() {
    const s = await criarSala();
    const b = canal('5.6.7.8');
    const c = canal('9.9.9.9');
    await s.g.receber(b, entrarComo('bia', { codigo: s.codigo }));
    await s.g.receber(c, entrarComo('caio', { codigo: s.codigo }));
    await s.avancar(300);
    const nucleo = () => s.g.ativas.get(s.codigo)!.nucleo;
    const seqs = new Map<object, number>();
    const mandar = (k: ReturnType<typeof canal>, m: object) => {
      const seq = (seqs.get(k) ?? 0) + 1;
      seqs.set(k, seq);
      return s.g.receber(k, JSON.stringify({ ...m, seq }));
    };
    // os três no mesmo lugar, perto de uma célula no ar (longe de povoado e ruína)
    const P = { x: 900, y: 100, z: 900 };
    for (const k of [s.a, b, c])
      await mandar(k, {
        t: 'jogador',
        x: P.x + 3.5,
        y: P.y,
        z: P.z + 0.5,
        yaw: 0,
        pitch: 0,
        olhos: P.y + 1.62,
        noChao: true,
        voando: true,
        vel: 0,
        correndo: false,
        submerso: false,
        quedas: [],
        pulos: 0,
        golpes: 0,
        slot: 0,
      });
    await s.avancar(100);
    // spec 037: o bloco novo precisa encostar num sólido; a célula do teste fica no céu, então
    // uma pedra solta embaixo dela dá o apoio (como num mundo salvo com bloco no ar)
    // (a célula P e a do baú, dois para o lado)
    for (const dz of [0, 2])
      nucleo().estado.edicoes.definir(P.x, P.y - 1, P.z + dz, Bloco.PEDRA_LISA);
    return { ...s, b, c, nucleo, mandar, P };
  }

  it('o Caio não quebra a parede da Bia (o servidor recusa e diz de quem é); a dona desfaz', async () => {
    const { a, b, c, nucleo, mandar, P, avancar } = await trio();
    await mandar(b, { t: 'colocar', id: 1, ...P, bloco: Bloco.TABUAS, meta: 0, slot: 0 });
    await avancar(100);
    expect(nucleo().donoDoBloco(P.x, P.y, P.z)).toBe('bia');
    await mandar(c, { t: 'quebrar', id: 1, ...P, slot: 0 });
    await avancar(100);
    expect(nucleo().estado.mundo.bloco(P.x, P.y, P.z)).toBe(Bloco.TABUAS);
    expect(recusas(c)).toContainEqual({
      e: 'recusa',
      comando: 1,
      motivo: 'quebrar',
      protecao: { motivo: 'amigo', dono: 'bia' },
    });
    // a tela do Caio volta ao bloco da Bia
    expect(
      quadros(c)
        .flatMap((q) => q.blocos ?? [])
        .filter((bl) => bl.x === P.x && bl.y === P.y && bl.z === P.z)
        .at(-1)?.v,
    ).toBe(empacotar(Bloco.TABUAS, 0, 1));
    // a dona desfaz: todos veem o ar
    await mandar(a, { t: 'quebrar', id: 1, ...P, slot: 0 });
    await avancar(100);
    expect(nucleo().estado.mundo.bloco(P.x, P.y, P.z)).toBe(Bloco.AR);
    for (const k of [a, b, c])
      expect(
        quadros(k)
          .flatMap((q) => q.blocos ?? [])
          .filter((bl) => bl.x === P.x && bl.y === P.y && bl.z === P.z)
          .at(-1)?.v,
      ).toBe(Bloco.AR);
  });

  it('o baú da Bia não abre para o Caio, nem por transação mandada direto; abre para a dona', async () => {
    const { a, b, c, nucleo, mandar, P, avancar } = await trio();
    const Q = { ...P, z: P.z + 2 };
    await mandar(b, { t: 'colocar', id: 1, ...Q, bloco: Bloco.BAU, meta: 0, slot: 0 });
    await avancar(100);
    nucleo().estado.conteineres.bau(Q.x, Q.y, Q.z, false)[0] = { item: 'trigo', qtd: 9 };
    await mandar(c, { t: 'usar', id: 1, ...Q });
    await mandar(c, {
      t: 'transacao',
      id: 2,
      mudancas: [
        { onde: 'bau', i: 0, antes: { item: 'trigo', qtd: 9 }, depois: null },
        { onde: 'inv', i: 3, antes: null, depois: { item: 'trigo', qtd: 9 } },
      ],
    });
    await avancar(100);
    expect(quadros(c).some((q) => q.conteiner)).toBe(false);
    expect(recusas(c)).toContainEqual(
      expect.objectContaining({ motivo: 'usar', protecao: { motivo: 'bau', dono: 'bia' } }),
    );
    expect(nucleo().estado.conteineres.bau(Q.x, Q.y, Q.z, false)[0]).toEqual({
      item: 'trigo',
      qtd: 9,
    });
    await mandar(a, { t: 'usar', id: 1, ...Q });
    await avancar(100);
    expect(quadros(a).some((q) => q.conteiner?.tipo === 'bau')).toBe(true);
  });

  it('a fornalha da Bia segue o baú: não abre para o Caio nem por transação; abre para a dona', async () => {
    const { a, b, c, nucleo, mandar, P, avancar } = await trio();
    const Q = { ...P, z: P.z + 2 };
    await mandar(b, { t: 'colocar', id: 1, ...Q, bloco: Bloco.FORNALHA, meta: 0, slot: 0 });
    await avancar(100);
    nucleo().estado.conteineres.fornalha(Q.x, Q.y, Q.z).saida = { item: 'trigo', qtd: 3 };
    await mandar(c, { t: 'usar', id: 1, ...Q });
    await mandar(c, {
      t: 'transacao',
      id: 2,
      mudancas: [
        { onde: 'forn', i: 2, antes: { item: 'trigo', qtd: 3 }, depois: null },
        { onde: 'inv', i: 3, antes: null, depois: { item: 'trigo', qtd: 3 } },
      ],
    });
    await avancar(100);
    expect(quadros(c).some((q) => q.conteiner)).toBe(false);
    expect(recusas(c)).toContainEqual(
      expect.objectContaining({ motivo: 'usar', protecao: { motivo: 'fornalha', dono: 'bia' } }),
    );
    expect(nucleo().estado.conteineres.fornalha(Q.x, Q.y, Q.z).saida).toEqual({
      item: 'trigo',
      qtd: 3,
    });
    for (const k of [b, a]) await mandar(k, { t: 'usar', id: 1, ...Q });
    await avancar(100);
    expect(quadros(b).some((q) => q.conteiner?.tipo === 'fornalha')).toBe(true);
    expect(quadros(a).some((q) => q.conteiner?.tipo === 'fornalha')).toBe(true);
  });

  it('com a dona fora, a sala que acorda diz o nome dela ("é da Ana"), passado a limpo', async () => {
    const s = servidor();
    const a = canal();
    const ana = { ...ident('ana'), apelido: '  Ana💥 ' };
    await s.g.receber(
      a,
      JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ana, criar: criarMundo }),
    );
    const bv = a.recebidas.find((m) => m.t === 'bemvindo') as Extract<
      RespostaServidor,
      { t: 'bemvindo' }
    >;
    const codigo = bv.sala.codigo;
    expect((await s.armazem.lerSala(codigo))?.apelidoDono).toBe('Ana');
    const P = { x: 900, y: 100, z: 900 };
    const tel = (seq: number) =>
      JSON.stringify({
        t: 'jogador',
        x: P.x + 3.5,
        y: P.y,
        z: P.z + 0.5,
        yaw: 0,
        pitch: 0,
        olhos: P.y + 1.62,
        noChao: true,
        voando: true,
        vel: 0,
        correndo: false,
        submerso: false,
        quedas: [],
        pulos: 0,
        golpes: 0,
        slot: 0,
        seq,
      });
    await s.avancar(300);
    await s.g.receber(a, tel(1));
    // spec 037: a pedra solta embaixo dá o apoio à célula no céu
    s.g.ativas.get(codigo)!.nucleo.estado.edicoes.definir(P.x, P.y - 1, P.z, Bloco.PEDRA_LISA);
    await s.g.receber(
      a,
      JSON.stringify({ t: 'colocar', id: 1, ...P, bloco: Bloco.TABUAS, meta: 0, slot: 0, seq: 2 }),
    );
    await s.avancar(6000);
    // a dona sai; a sala dorme (30 s de tolerância + 60 s vazia)
    s.g.caiu(a);
    await s.avancar(95_000);
    expect(s.g.ativas.has(codigo)).toBe(false);
    // a Bia chega sozinha e tenta quebrar a parede da Ana
    const b = canal('5.6.7.8');
    await s.g.receber(b, entrarComo('bia', { codigo }));
    await s.avancar(300);
    await s.g.receber(b, tel(1));
    await s.g.receber(b, JSON.stringify({ t: 'quebrar', id: 1, ...P, slot: 0, seq: 2 }));
    await s.avancar(100);
    const nucleo = s.g.ativas.get(codigo)!.nucleo;
    expect(nucleo.estado.jogadores.has('ana')).toBe(false);
    expect(nucleo.estado.mundo.bloco(P.x, P.y, P.z)).toBe(Bloco.TABUAS);
    expect(recusas(b)).toContainEqual(
      expect.objectContaining({ protecao: { motivo: 'amigo', dono: 'Ana' } }),
    );
    // o que vier estragado na sala guardada também entra limpo
    b.fechar();
    s.g.caiu(b);
    await s.avancar(95_000);
    const sala = (await s.armazem.lerSala(codigo))!;
    await s.armazem.gravarSala({ ...sala, apelidoDono: '<b>Ana</b>'.repeat(8) });
    const b2 = canal('5.6.7.8');
    await s.g.receber(b2, entrarComo('bia', { codigo }));
    await s.avancar(300);
    const apelido = s.g.ativas.get(codigo)!.nucleo.apelidoDoDono('ana')!;
    expect(apelido).toMatch(/^[\p{L}\p{N} _-]{1,22}$/u);
    expect(apelido.startsWith('bAnab')).toBe(true);
  });
});

describe('canteiro de obras na sala (spec 014)', () => {
  const CIDADE = obterTema('cidade-grande');
  afterAll(() => {
    definirObrasFeitas([]);
    definirEstiloMundo(ESTILO_PADRAO);
  });

  /** Em pé em cima da célula (como o canteiro.test.ts do núcleo). */
  function tel(c: { x: number; y: number; z: number }) {
    return {
      t: 'jogador' as const,
      x: c.x + 0.5,
      y: c.y + 2,
      z: c.z + 0.5,
      yaw: 0,
      pitch: 0,
      olhos: c.y + 3.62,
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

  it('a sala da cidade dorme e acorda com as mesmas obras: feitas, meio cheias e ajudantes', async () => {
    const s = servidor();
    const a = canal();
    await s.g.receber(
      a,
      JSON.stringify({
        t: 'entrar',
        versao: VERSAO_REDE,
        jogador: ident('ana'),
        criar: {
          ...criarMundo,
          tema: 'cidade-grande',
          modo: 'sobrevivencia',
          estilo: CIDADE.mundo,
        },
      }),
    );
    const bv = a.recebidas.find((m) => m.t === 'bemvindo') as Extract<
      RespostaServidor,
      { t: 'bemvindo' }
    >;
    const codigo = bv.sala.codigo;
    // outra sala, de outro tema, no mesmo servidor: as obras de uma não vão para a outra
    const b = canal('5.6.7.8');
    await s.g.receber(
      b,
      JSON.stringify({
        t: 'entrar',
        versao: VERSAO_REDE,
        jogador: ident('bia'),
        criar: criarMundo,
      }),
    );
    const outra = (
      b.recebidas.find((m) => m.t === 'bemvindo') as Extract<RespostaServidor, { t: 'bemvindo' }>
    ).sala.codigo;
    await s.avancar(300);
    const nucleo = s.g.ativas.get(codigo)!.nucleo;
    definirEstiloMundo(CIDADE.mundo);
    const plano = cidadeDoMundo(criarMundo.semente)!;
    expect(plano).not.toBeNull();
    const ana = nucleo.estado.jogadores.get('ana')!;
    ana.inventario.definir(0, { item: COLHER_PEDREIRO, qtd: 1 });
    let seq = 0;
    const por = async (c: { x: number; y: number; z: number; bloco: number }) => {
      ana.saltoPermitido = true;
      nucleo.comando('ana', { ...tel(c), slot: 0 } as never);
      await s.g.receber(
        a,
        JSON.stringify({ t: 'colocar', id: ++seq, ...c, meta: 0, slot: 0, seq }),
      );
      await s.avancar(50);
    };
    const obra1 = celulasPlanejadas(plano, 1);
    for (const c of obra1) await por(c);
    expect(nucleo.obrasFeitas).toEqual([1]);
    // spec 023: a missão c1 conclui para a ajudante, pelo servidor de verdade (só para ela)
    const almaDe = (c: ReturnType<typeof canal>) =>
      quadros(c).flatMap((q) => (q.eventos ?? []).filter((e) => e.e === 'alma'));
    const c1 = almaDe(a).flatMap((e) => (e.e === 'alma' ? e.missoes : [])).find((m) => m.concluiu);
    expect(c1).toMatchObject({ id: 'c1', fantasia: 'capacete-obra' });
    expect(almaDe(b)).toEqual([]);
    // fixar a missão do cartão pelo canal (o saneamento da nuvem deixa passar)
    await s.g.receber(a, JSON.stringify({ t: 'almaFixar', missao: 'c3', seq: ++seq }));
    await s.avancar(50);
    expect(nucleo.estado.almas.get('ana')!.fixada).toBe('c3');
    // a banca pelo canal: entrega e responde almaCompra só para quem comprou
    await s.g.receber(a, JSON.stringify({ t: 'comprarBanca', item: 'flores', saldo: 3, seq: ++seq }));
    await s.avancar(50);
    const compras = quadros(a).flatMap((q) => (q.eventos ?? []).filter((e) => e.e === 'almaCompra'));
    expect(compras).toEqual([{ e: 'almaCompra', item: 'flores', preco: 3 }]);
    expect(quadros(b).some((q) => (q.eventos ?? []).some((e) => e.e === 'almaCompra'))).toBe(false);
    // a obra 2 fica pela metade (três blocos)
    const obra2 = celulasPlanejadas(plano, 2);
    for (const c of obra2.slice(0, 3)) await por(c);
    const antes = nucleo.obras();
    const almaAntes = JSON.parse(JSON.stringify(nucleo.estado.almas.get('ana')));
    expect(almaAntes.feitas).toEqual(['c1']);
    expect(antes['1']).toMatchObject({ feita: true, ajudantes: [['ana', 'ana']] });
    expect(antes['2']?.cheias).toHaveLength(3);
    expect(s.g.ativas.get(outra)!.nucleo.obrasFeitas).toEqual([]);

    s.g.caiu(a);
    s.g.caiu(b);
    await s.avancar(95_000);
    expect(s.g.ativas.has(codigo)).toBe(false);
    const a2 = canal();
    await s.g.receber(
      a2,
      JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident('ana'), codigo }),
    );
    await s.avancar(200);
    const novo = s.g.ativas.get(codigo)!.nucleo;
    expect(novo).not.toBe(nucleo);
    expect(novo.obrasFeitas).toEqual([1]);
    expect(novo.obras()).toEqual(antes);
    // spec 023: a alma da Ana neste mundo acorda igual, e o quadro de missões vai para ela
    expect(JSON.parse(JSON.stringify(novo.estado.almas.get('ana')))).toEqual(almaAntes);
    const quadroAlma = quadros(a2)
      .flatMap((q) => q.eventos ?? [])
      .find((e) => e.e === 'alma' && e.quadro);
    expect(quadroAlma).toMatchObject({ quadro: { feitas: ['c1'], fixada: 'c3' } });
    for (const c of obra1) expect(novo.estado.mundo.bloco(c.x, c.y, c.z)).toBe(c.bloco);
    for (const c of obra2.slice(0, 3)) expect(novo.estado.mundo.bloco(c.x, c.y, c.z)).toBe(c.bloco);
    // o "bem-vindo" de quem volta já traz as obras (o cliente pinta igual)
    const bv2 = a2.recebidas.find((m) => m.t === 'bemvindo') as Extract<
      RespostaServidor,
      { t: 'bemvindo' }
    >;
    expect(JSON.stringify(bv2)).toContain('"obras"');
    // e a obra 2 continua de onde parou
    const ana2 = novo.estado.jogadores.get('ana')!;
    if (!ana2.inventario.contar(COLHER_PEDREIRO))
      ana2.inventario.definir(0, { item: COLHER_PEDREIRO, qtd: 1 });
    const slot = ana2.inventario.slots.findIndex((p) => p?.item === COLHER_PEDREIRO);
    const c = obra2[3];
    ana2.saltoPermitido = true;
    novo.comando('ana', { ...tel(c), slot } as never);
    await s.g.receber(a2, JSON.stringify({ t: 'colocar', id: 1, ...c, meta: 0, slot, seq: 1 }));
    await s.avancar(100);
    expect(novo.estado.mundo.bloco(c.x, c.y, c.z)).toBe(c.bloco);
    expect(novo.obras()['2']?.cheias).toHaveLength(4);
  });
});

describe('spec 034: os mundos dos quatro temas que saíram, na nuvem', () => {
  const entrarComo = (id: string, extra: object) =>
    JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident(id), ...extra });
  const QUATRO = ['bruma-e-luz', 'planeta-vivo', 'mata-encantada', 'era-dos-dinos'];
  // os temas que ficam (spec 027: a Noite das Fantasias é o sexto)
  const CINCO = [
    'vila-neon',
    'cidade-grande',
    'rancho-alegre',
    'doce-reino',
    'exploracao-lunar',
    'noite-das-fantasias',
  ];
  let n = 0;

  /** Grava direto no armazém um mundo (com sala, regiões e um jogador), como a nuvem tem hoje. */
  async function guardar(
    s: ReturnType<typeof servidor>,
    tema: unknown,
    op: { sala?: boolean; formato?: number | null } = {},
  ) {
    const id = `mundo-${++n}`;
    const codigo = gerarCodigo(() => (n * 0.137) % 1);
    if (op.sala !== false)
      await s.armazem.gravarSala({
        codigo,
        mundoId: id,
        dono: 'ana',
        chaveDono: 'x',
        fechado: false,
        constroem: true,
        criadoEm: 0,
        acessadoEm: 0,
      });
    await s.armazem.gravarMundo(id, {
      ...(op.formato === null ? {} : { formato: op.formato ?? 2 }),
      mundo: { ...criarMundo, id, nome: `Mundo secreto ${n}`, tema: tema as string },
      hora: 0.3,
      extras: {},
    });
    await s.armazem.gravarRegiao(id, '0,0', { '0,0': [[1, 7]] });
    await s.armazem.gravarJogador(id, 'ana', {
      chave: 'x',
      perfil: { apelido: 'Ana', aparencia: {} },
      dados: {} as never,
    });
    return { id, codigo };
  }
  const existe = async (s: ReturnType<typeof servidor>, id: string) =>
    (await s.armazem.listarMundos()).includes(id);

  it('saem os quatro temas, com as salas, as regiões e os jogadores; os cinco ficam inteiros', async () => {
    const logs: string[] = [];
    const armazem = armazemMemoria();
    const g = criarGerenciador({ armazem, sorteio: Math.random, log: (m) => logs.push(m) });
    const s = { g, armazem } as unknown as ReturnType<typeof servidor>;
    const saem = await Promise.all(QUATRO.map((t) => guardar(s, t)));
    const ficam = await Promise.all(CINCO.map((t) => guardar(s, t)));
    // um dos cinco sem sala (o dono levou de volta para o aparelho) também fica
    const semSala = await guardar(s, 'doce-reino', { sala: false });
    // um dos quatro sem sala também sai (a varredura percorre os mundos, não as salas)
    const semSalaQueSai = await guardar(s, 'era-dos-dinos', { sala: false });
    expect(await g.varrerTemasQueSairam()).toBe(5);
    for (const m of [...saem, semSalaQueSai]) {
      expect(await existe(s, m.id), m.id).toBe(false);
      expect(await armazem.lerMundo(m.id)).toBeNull();
      expect(await armazem.lerRegioes(m.id)).toEqual({});
      expect(await armazem.lerJogador(m.id, 'ana')).toBeNull();
    }
    for (const m of saem) expect(await armazem.lerSala(m.codigo)).toBeNull();
    for (const m of [...ficam, semSala]) {
      expect(await armazem.lerMundo(m.id), m.id).not.toBeNull();
      expect(Object.keys(await armazem.lerRegioes(m.id))).toEqual(['0,0']);
      expect(await armazem.lerJogador(m.id, 'ana')).not.toBeNull();
    }
    for (const m of ficam) expect(await armazem.lerSala(m.codigo)).not.toBeNull();
    // o log: código, id e tema de cada um, e o total; nunca o nome do mundo
    expect(logs.filter((l) => l.startsWith('mundo de tema que saiu apagado'))).toHaveLength(5);
    expect(logs.some((l) => l.includes(saem[0].codigo) && l.includes(saem[0].id))).toBe(true);
    expect(logs.some((l) => l.includes('bruma-e-luz'))).toBe(true);
    expect(logs.some((l) => /5 de \d+ mundos apagados/.test(l))).toBe(true);
    expect(logs.join('\n')).not.toContain('Mundo secreto');
  });

  it('tema vazio, estranho, de outro tipo, ou mundo de formato antigo: não é tocado', async () => {
    const s = servidor();
    const casos = [
      await guardar(s, ''),
      await guardar(s, undefined),
      await guardar(s, 'tema-que-nao-existe'),
      await guardar(s, 'Bruma-e-Luz'),
      await guardar(s, ['bruma-e-luz']),
      await guardar(s, 7),
      await guardar(s, 'bruma-e-luz', { formato: null }),
      await guardar(s, 'era-dos-dinos', { formato: 1 }),
    ];
    expect(await s.g.varrerTemasQueSairam()).toBe(0);
    for (const m of casos) {
      expect(await existe(s, m.id), m.id).toBe(true);
      expect(await s.armazem.lerSala(m.codigo)).not.toBeNull();
    }
  });

  it('rodar duas vezes não muda nada', async () => {
    const s = servidor();
    await guardar(s, 'planeta-vivo');
    const fica = await guardar(s, 'rancho-alegre');
    expect(await s.g.varrerTemasQueSairam()).toBe(1);
    const depois = JSON.stringify([
      await s.armazem.listarMundos(),
      await s.armazem.listarSalas(),
      await s.armazem.lerMundo(fica.id),
    ]);
    expect(await s.g.varrerTemasQueSairam()).toBe(0);
    expect(
      JSON.stringify([
        await s.armazem.listarMundos(),
        await s.armazem.listarSalas(),
        await s.armazem.lerMundo(fica.id),
      ]),
    ).toBe(depois);
  });

  it('o apagar falha uma vez no meio da pasta: o mundo continua sendo achado e a passada seguinte termina', async () => {
    const logs: string[] = [];
    const armazem = armazemMemoria();
    const g = criarGerenciador({ armazem, sorteio: Math.random, log: (m) => logs.push(m) });
    const s = { g, armazem } as unknown as ReturnType<typeof servidor>;
    const m = await guardar(s, 'bruma-e-luz');
    await armazem.gravarRegiao(m.id, '1,0', { '8,0': [[2, 7]] });
    const apagados: string[] = [];
    let falhou = false;
    armazem.falharAoApagar = (nome) => {
      // a segunda região falha (uma vez), depois de a primeira já ter saído
      if (!falhou && apagados.some((a) => a.includes('/regioes/')) && nome.includes('/regioes/')) {
        falhou = true;
        return true;
      }
      apagados.push(nome);
      return false;
    };
    expect(await g.varrerTemasQueSairam()).toBe(0);
    expect(falhou).toBe(true);
    // o arquivo do mundo nunca saiu antes do resto: a varredura acha e lê o mundo de novo
    expect(apagados).not.toContain(`${m.id}/mundo.json.gz`);
    expect(await existe(s, m.id)).toBe(true);
    expect(await armazem.lerMundo(m.id)).not.toBeNull();
    // o log diz só o tipo do erro, nunca a mensagem
    expect(logs.some((l) => l.includes(m.id) && l.includes('falhou (Error)'))).toBe(true);
    expect(logs.join('\n')).not.toContain('falha de teste');
    expect(await g.varrerTemasQueSairam()).toBe(1);
    expect(apagados.at(-1)).toBe(`${m.id}/mundo.json.gz`);
    expect(await existe(s, m.id)).toBe(false);
    expect(await armazem.lerMundo(m.id)).toBeNull();
    expect(await armazem.lerRegioes(m.id)).toEqual({});
    expect(await armazem.lerJogador(m.id, 'ana')).toBeNull();
    expect(await armazem.lerSala(m.codigo)).toBeNull();
  });

  it('a sala que mudou de mundo depois da lista da varredura não é apagada', async () => {
    const s = servidor();
    const m = await guardar(s, 'planeta-vivo');
    const outro = await guardar(s, 'vila-neon', { sala: false });
    const sala = (await s.armazem.lerSala(m.codigo))!;
    // a lista velha diz que a sala é do mundo que sai; no armazém ela já aponta para outro
    const lista = await s.armazem.listarSalas();
    await s.armazem.gravarSala({ ...sala, mundoId: outro.id });
    const listar = s.armazem.listarSalas;
    s.armazem.listarSalas = async () => lista;
    expect(await s.g.varrerTemasQueSairam()).toBe(1);
    s.armazem.listarSalas = listar;
    expect(await existe(s, m.id)).toBe(false);
    expect((await s.armazem.lerSala(m.codigo))?.mundoId).toBe(outro.id);
    expect(await s.armazem.lerMundo(outro.id)).not.toBeNull();
  });

  it('o mundo regravado depois da varredura (a réplica antiga ao sair) sai na leitura', async () => {
    const s = servidor();
    await s.g.varrerTemasQueSairam();
    const m = await guardar(s, 'mata-encantada');
    // a prévia não mostra e o código não abre: o mundo sai na hora
    expect(await s.g.previa(m.codigo, '9.9.9.9')).toBeNull();
    expect(await existe(s, m.id)).toBe(false);
    expect(await s.armazem.lerSala(m.codigo)).toBeNull();
    const m2 = await guardar(s, 'era-dos-dinos');
    const a = canal();
    await s.g.receber(a, entrarComo('ana', { codigo: m2.codigo }));
    expect(a.recebidas).toEqual([{ t: 'recusado', motivo: 'codigo' }]);
    expect(s.g.ativas.size).toBe(0);
    expect(await existe(s, m2.id)).toBe(false);
  });

  it('criar com um tema fora dos cinco é recusado por versão (o cliente antigo recarrega)', async () => {
    // a rede subiu para 17 com a 034 (o cliente de antes recebe "versão nova") e para 18 com a
    // Noite das Fantasias (027, parte 1: o tema novo em `IDS_TEMAS`); a 039 (os móveis) subiu
    // para 19 sem mexer nos temas
    expect(VERSAO_REDE).toBeGreaterThanOrEqual(18);
    const s = servidor();
    for (const tema of [...QUATRO, 'tema-que-nao-existe', '', undefined]) {
      const a = canal(`10.0.0.${QUATRO.indexOf(tema as string) + 2}`);
      await s.g.receber(a, entrarComo('ana', { criar: { ...criarMundo, tema } }));
      expect(a.recebidas, String(tema)).toEqual([{ t: 'recusado', motivo: 'versao' }]);
      expect(a.fechado()).toBe(true);
    }
    expect(s.g.ativas.size).toBe(0);
    expect(await s.armazem.listarMundos()).toEqual([]);
    for (const tema of CINCO) {
      const a = canal();
      await s.g.receber(a, entrarComo('ana', { criar: { ...criarMundo, tema } }));
      expect(a.recebidas[0]?.t, tema).toBe('bemvindo');
    }
  });
});

describe('spec 037 (T02): o soltar do cliente e o teleporte do servidor', () => {
  it('quem sai de dentro de um bloco (de lado ou subindo) não volta para dentro pelo teleporte', async () => {
    // como a sala de verdade: sem os atalhos de teste (o servidor confere cada posição)
    let t = 0;
    const g = criarGerenciador({ armazem: armazemMemoria(), agora: () => t, sorteio: Math.random });
    const avancar = async (ms: number) => {
      for (let i = 0; i < ms; i += 50) {
        t += 50;
        g.passo();
      }
      await g.manutencao();
    };
    const a = canal();
    await g.receber(
      a,
      JSON.stringify({
        t: 'entrar',
        versao: VERSAO_REDE,
        jogador: ident('ana'),
        criar: { ...criarMundo, tema: 'doce-reino', modo: 'sobrevivencia' },
      }),
    );
    const bv = a.recebidas.find((m) => m.t === 'bemvindo') as Extract<
      RespostaServidor,
      { t: 'bemvindo' }
    >;
    const nucleo = g.ativas.get(bv.sala.codigo)!.nucleo;
    let seq = 0;
    const posicao = (p: { x: number; y: number; z: number }) =>
      g.receber(
        a,
        JSON.stringify({
          t: 'jogador',
          ...p,
          yaw: 0,
          pitch: 0,
          olhos: p.y + 1.62,
          noChao: true,
          voando: false,
          vel: 0,
          correndo: false,
          submerso: false,
          quedas: [],
          pulos: 0,
          golpes: 0,
          slot: 0,
          seq: ++seq,
        }),
      );
    const teleportes = () =>
      quadros(a).flatMap((q) => (q.eventos ?? []).filter((e) => e.e === 'teleporte')).length;
    const tel = () => nucleo.estado.jogadores.get('ana')!.tel;
    await posicao(bv.pos!);
    await avancar(300);
    const antes = teleportes();
    // o caso 1: um bloco de 2 de altura nasce em cima dela (o andaime da obra seguinte, um mundo
    // salvo); o cliente a solta de lado, na mesma altura
    const p = tel();
    const [cx, cy, cz] = [Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)];
    for (const dy of [0, 1]) nucleo.estado.edicoes.definir(cx, cy + dy, cz, Bloco.PEDRA_LISA);
    const e = { x: p.x, y: p.y, z: p.z, vy: 0, noChao: true };
    expect(soltarDoBloco(e, nucleo.estado.mundo.solido)).toBe(true);
    expect(e.y).toBe(p.y);
    await posicao(e);
    await avancar(300);
    expect(teleportes(), 'de lado').toBe(antes);
    expect([tel().x, tel().y, tel().z]).toEqual([e.x, e.y, e.z]);
    // o caso 2: tapada dos lados (um poço de 5 de fundo): o cliente a solta subindo
    const q = tel();
    const [qx, qy, qz] = [Math.floor(q.x), Math.floor(q.y), Math.floor(q.z)];
    for (let dx = -2; dx <= 2; dx++)
      for (let dz = -2; dz <= 2; dz++)
        for (let dy = 0; dy < 5; dy++)
          nucleo.estado.edicoes.definir(qx + dx, qy + dy, qz + dz, Bloco.PEDRA_LISA);
    const f = { x: q.x, y: q.y, z: q.z, vy: 0, noChao: true };
    expect(soltarDoBloco(f, nucleo.estado.mundo.solido)).toBe(true);
    expect(f.y).toBe(qy + 5);
    await posicao(f);
    await avancar(300);
    expect(teleportes(), 'subindo').toBe(antes);
    expect(tel().y).toBe(qy + 5);
    // a conferência continua de pé: um salto de 20 blocos ainda volta
    await posicao({ x: f.x, y: f.y + 20, z: f.z });
    await avancar(300);
    expect(teleportes()).toBe(antes + 1);
    expect(tel().y).toBe(qy + 5);
  });
});
