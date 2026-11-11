import { describe, expect, it } from 'vitest';
import { gzipSync } from 'node:zlib';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { criarEstadoCliente } from '../../src/cliente/estado';
import type { Conexao } from '../../src/cliente/conexao';
import { criarInventario } from '../../src/jogo/inventario';
import { estadoInicial } from '../../src/jogo/sobrevivencia';
import { encontrarNascimento, alturaTerreno } from '../../src/world/chunk';
import { Bloco } from '../../src/world/blocks';
import {
  MAX_DONOS,
  criarEdicoes,
  donoNaCelula,
  empacotar,
  indiceDonoDe,
  semDono,
  type EdicoesExportadas,
} from '../../src/world/edicoes';
import { sanear, sanearDadosMundo } from '../../src/nucleo/saneamento';
import type { DadosMundo } from '../../src/jogo/mundos';
import type { Comando, Mensagem, Telemetria } from '../../src/nucleo/protocolo';

/**
 * Spec 016, T02: cada bloco guarda quem o colocou. O dono do mundo é o índice 0 (sem gravar
 * nada a mais); os amigos entram numa tabela pequena, e o índice vai nos bits de cima do
 * valor de cada edição.
 */
const SEMENTE = 1337;
const p0 = encontrarNascimento(SEMENTE);
const X = Math.floor(p0.x);
const Z = Math.floor(p0.z);
const Y = alturaTerreno(X, Z, SEMENTE) + 1;

function tel(x: number, z: number, extra: Partial<Telemetria> = {}): Comando {
  const y = alturaTerreno(Math.floor(x), Math.floor(z), SEMENTE) + 1;
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
    ...extra,
  };
}

/** Células livres perto dos dois (o terreno pode ter flor ou grama alta ali). */
const A = { x: X + 1, y: Y, z: Z + 1 };
const B = { x: X + 1, y: Y, z: Z - 1 };
const PORTA = { x: X - 1, y: Y, z: Z + 1 };

function limpar(n: Nucleo) {
  for (const c of [A, B, PORTA]) {
    n.estado.edicoes.definir(c.x, c.y, c.z, Bloco.AR);
    n.estado.edicoes.definir(c.x, c.y + 1, c.z, Bloco.AR);
    n.estado.edicoes.definir(c.x, c.y - 1, c.z, Bloco.PEDREGULHO);
  }
}

/** Sala na nuvem: a Ana é a dona; a Bia é amiga. */
function nuvem(dados?: DadosMundo, modo: 'criativo' | 'sobrevivencia' = 'criativo'): Nucleo {
  const n = criarNucleo({
    semente: SEMENTE,
    modo,
    versaoMundo: 2,
    dados,
    confiarNoCliente: false,
    depuracao: true,
    dono: 'ana',
  });
  n.conectar('ana', { perfil: { apelido: 'Ana', aparencia: {} } });
  n.conectar('bia', { perfil: { apelido: 'Bia', aparencia: {} } });
  n.comando('ana', tel(X + 0.5, Z + 0.5));
  n.comando('bia', tel(X + 2.5, Z + 0.5));
  if (!dados) limpar(n);
  return n;
}

/** Servidor local: um jogador só, dono de tudo. */
function local(dados?: DadosMundo): Nucleo {
  const n = criarNucleo({
    semente: SEMENTE,
    modo: 'criativo',
    versaoMundo: 2,
    dados,
    confiarNoCliente: true,
    dono: 'local',
  });
  n.conectar('local');
  n.comando('local', tel(X + 0.5, Z + 0.5));
  if (!dados) limpar(n);
  return n;
}

const colocar = (id: number, c: { x: number; y: number; z: number }, bloco = Bloco.TABUAS) =>
  ({ t: 'colocar', id, ...c, bloco, meta: 0, slot: 0 }) as Comando;
const quebrar = (id: number, c: { x: number; y: number; z: number }) =>
  ({ t: 'quebrar', id, ...c, slot: 0 }) as Comando;

/** O salvamento como o servidor local devolve para o aparelho. */
function comoSalvo(n: Nucleo): DadosMundo {
  const s = n.salvar();
  return { versao: 1, edicoes: s.edicoes, jogador: null, hora: s.hora, extras: s.extras };
}

describe('dono do bloco no núcleo (nuvem)', () => {
  it('cada bloco é de quem colocou; quebrar tira o dono; o natural não tem dono', () => {
    const n = nuvem();
    n.comando('ana', colocar(1, A));
    n.comando('bia', colocar(1, B));
    expect(n.donoDoBloco(A.x, A.y, A.z)).toBe('ana');
    expect(n.donoDoBloco(B.x, B.y, B.z)).toBe('bia');
    // terreno natural, ar e o que o mundo gerou
    expect(n.donoDoBloco(X + 5, Y - 3, Z + 5)).toBeNull();
    expect(n.donoDoBloco(X, Y + 20, Z)).toBeNull();
    // a dona não entra na tabela: só a Bia, com o apelido
    expect(n.estado.edicoes.donos.exportar()).toEqual([['bia', 'Bia']]);
    expect(indiceDonoDe(n.estado.edicoes.obterValor(A.x, A.y, A.z)!)).toBe(0);
    expect(indiceDonoDe(n.estado.edicoes.obterValor(B.x, B.y, B.z)!)).toBe(1);
    expect(n.apelidoDoDono('bia')).toBe('Bia');
    n.comando('ana', quebrar(2, B));
    expect(n.donoDoBloco(B.x, B.y, B.z)).toBeNull();
    expect(n.estado.edicoes.obterValor(B.x, B.y, B.z)).toBe(Bloco.AR);
  });

  it('porta que abre e fecha continua de quem colocou (as duas metades)', () => {
    const n = nuvem();
    n.comando('bia', {
      t: 'colocar',
      id: 1,
      ...PORTA,
      bloco: Bloco.PORTA,
      meta: 2,
      slot: 0,
      extras: [{ ...PORTA, y: PORTA.y + 1 }],
    });
    expect(n.donoDoBloco(PORTA.x, PORTA.y + 1, PORTA.z)).toBe('bia');
    n.comando('ana', { t: 'usar', id: 2, ...PORTA });
    expect(n.estado.mundo.bloco(PORTA.x, PORTA.y, PORTA.z)).toBe(Bloco.PORTA_ABERTA);
    expect(n.donoDoBloco(PORTA.x, PORTA.y, PORTA.z)).toBe('bia');
    expect(n.donoDoBloco(PORTA.x, PORTA.y + 1, PORTA.z)).toBe('bia');
    expect(n.estado.edicoes.obterMeta(PORTA.x, PORTA.y, PORTA.z)).toBe(2);
  });

  it('lavoura: a terra arada e o pé são de quem arou e plantou, e o pé que cresce segue dele', () => {
    const n = nuvem(undefined, 'sobrevivencia');
    n.estado.edicoes.definir(A.x, A.y - 1, A.z, Bloco.TERRA_MUSGOSA);
    const inv = n.estado.jogadores.get('bia')!.inventario;
    inv.definir(0, { item: 'enxada_madeira', qtd: 1, dur: 60 });
    inv.definir(1, { item: 'semente_trigo', qtd: 4 });
    n.comando('bia', { t: 'arar', id: 1, x: A.x, y: A.y - 1, z: A.z, slot: 0 });
    n.comando('bia', { t: 'colocar', id: 2, ...A, bloco: Bloco.TRIGO_0, meta: 0, slot: 1 });
    expect(n.donoDoBloco(A.x, A.y - 1, A.z)).toBe('bia');
    expect(n.donoDoBloco(A.x, A.y, A.z)).toBe('bia');
    n.comando('ana', { t: 'depurar', d: { f: 'crescer', segundos: 400 } });
    expect(n.estado.mundo.bloco(A.x, A.y, A.z)).toBe(Bloco.TRIGO_3);
    expect(n.donoDoBloco(A.x, A.y, A.z)).toBe('bia');
  });

  it('lote do criativo também carimba quem mandou', () => {
    const n = nuvem();
    n.comando('bia', {
      t: 'editar',
      id: 1,
      lote: [
        { ...A, v: Bloco.PEDREGULHO },
        { ...B, v: Bloco.AR },
      ],
    });
    expect(n.donoDoBloco(A.x, A.y, A.z)).toBe('bia');
    expect(n.donoDoBloco(B.x, B.y, B.z)).toBeNull();
  });

  it('o cliente nunca manda o dono: valor com bits de dono no lote é recusado no saneamento', () => {
    const ruim = { t: 'editar', id: 1, lote: [{ ...A, v: empacotar(Bloco.PEDREGULHO, 0, 1) }] };
    expect(sanear(ruim as unknown as Comando)).toBeNull();
    // colocar não tem campo de dono: um "dono" a mais não muda nada
    const n = nuvem();
    n.comando('bia', { ...colocar(1, A), dono: 'ana' } as unknown as Comando);
    expect(n.donoDoBloco(A.x, A.y, A.z)).toBe('bia');
  });

  it('os quadros levam o dono nos blocos e a tabela quando muda; quem chega recebe no começo', () => {
    const n = nuvem();
    n.quadros();
    n.comando('bia', colocar(1, A));
    n.passo();
    const q = n.quadros();
    for (const id of ['ana', 'bia']) {
      expect(q.get(id)!.blocos).toContainEqual({ ...A, v: empacotar(Bloco.TABUAS, 0, 1) });
      expect(q.get(id)!.donos).toEqual([['bia', 'Bia']]);
    }
    // a tabela não vai de novo sem mudar
    n.passo();
    expect(n.quadros().get('ana')!.donos).toBeUndefined();
    // quem chega depois recebe a tabela no primeiro quadro
    n.conectar('caio', { perfil: { apelido: 'Caio', aparencia: {} } });
    n.passo();
    const qc = n.quadros().get('caio')!;
    expect(qc.primeiro).toBe(true);
    expect(qc.donos).toEqual([['bia', 'Bia']]);
    // correção (quebra recusada) volta o valor inteiro, com o dono
    n.comando('caio', quebrar(1, { x: A.x + 40, y: A.y, z: A.z }));
    n.comando('bia', quebrar(2, { x: A.x, y: A.y + 50, z: A.z }));
    const qb = n.quadros().get('bia')!;
    expect(qb.blocos?.every((b) => b.v <= 65535 || indiceDonoDe(b.v) === 1)).toBe(true);
  });

  it('a amiga que sai continua dona; o apelido acompanha o de agora', () => {
    const n = nuvem();
    n.comando('bia', colocar(1, B));
    n.desconectar('bia');
    expect(n.donoDoBloco(B.x, B.y, B.z)).toBe('bia');
    expect(n.apelidoDoDono('bia')).toBe('Bia');
    n.conectar('bia', { perfil: { apelido: 'Bia Flor', aparencia: {} } });
    expect(n.estado.edicoes.donos.exportar()).toEqual([['bia', 'Bia Flor']]);
  });

  it('salva e abre de novo com os mesmos donos', () => {
    const n = nuvem();
    n.comando('ana', colocar(1, A));
    n.comando('bia', colocar(2, B));
    const d = comoSalvo(n);
    expect(d.extras.donos).toEqual([['bia', 'Bia']]);
    const json = JSON.parse(JSON.stringify(d)) as DadosMundo;
    const m = nuvem(json);
    expect(m.donoDoBloco(A.x, A.y, A.z)).toBe('ana');
    expect(m.donoDoBloco(B.x, B.y, B.z)).toBe('bia');
    expect(comoSalvo(m).edicoes).toEqual(d.edicoes);
  });
});

describe('dono do bloco jogando sozinho', () => {
  it('o jogador local é dono de tudo o que colocou, e o salvamento fica igual ao de antes', () => {
    const n = local();
    n.comando('local', colocar(1, A));
    expect(n.donoDoBloco(A.x, A.y, A.z)).toBe('local');
    const d = comoSalvo(n);
    // sem amigos: nenhum campo novo, nenhum bit a mais
    expect('donos' in d.extras).toBe(false);
    for (const lista of Object.values(d.edicoes))
      for (const [, v] of lista) expect(v).toBeLessThanOrEqual(65535);
  });
});

describe('levar para a nuvem e voltar para o aparelho', () => {
  it('mundo que voltou da nuvem guarda os amigos; levado de novo, segue igual', () => {
    const sala = nuvem();
    sala.comando('ana', colocar(1, A));
    sala.comando('bia', colocar(2, B));
    // voltou para o aparelho da Ana: lá ela é o jogador local
    const noAparelho = local(JSON.parse(JSON.stringify(comoSalvo(sala))) as DadosMundo);
    expect(noAparelho.donoDoBloco(A.x, A.y, A.z)).toBe('local');
    expect(noAparelho.donoDoBloco(B.x, B.y, B.z)).toBe('bia');
    // levado para a nuvem de novo (a Ana é a dona da sala nova)
    const deNovo = nuvem(sanearDadosMundo(JSON.parse(JSON.stringify(comoSalvo(noAparelho)))));
    expect(deNovo.donoDoBloco(A.x, A.y, A.z)).toBe('ana');
    expect(deNovo.donoDoBloco(B.x, B.y, B.z)).toBe('bia');
  });
});

describe('saneamento da tabela de donos (mundo que vem do aparelho)', () => {
  it('entrada ruim vira lugar vazio sem mudar a posição das outras; índice fora da tabela é do dono', () => {
    const d = sanearDadosMundo({
      versao: 1,
      edicoes: {
        '0,0': [
          [1, empacotar(Bloco.PEDREGULHO, 0, 1)],
          [2, empacotar(Bloco.PEDREGULHO, 0, 2)],
          [3, empacotar(Bloco.PEDREGULHO, 0, 3)],
          [4, empacotar(Bloco.PEDREGULHO, 0, 9)],
          [5, 2 ** 40],
        ],
      },
      jogador: null,
      hora: 0.5,
      extras: {
        donos: [['bia', 'Bia'], ['../x', 'mau'], ['caio', 'C'.repeat(500)], 'lixo', ['bia', 'dup']],
      },
    });
    expect(d.extras.donos).toEqual([
      ['bia', 'Bia'],
      ['', ''],
      ['caio', 'C'.repeat(22)],
      ['', ''],
      ['', ''],
    ]);
    // o valor absurdo sai; o índice 9 (fora da tabela de 5) vira o dono do mundo
    expect(d.edicoes['0,0'].map(([i, v]) => [i, indiceDonoDe(v)])).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 0],
    ]);
    const n = nuvem(d);
    const c = (i: number) => n.donoDoBloco(i, 0, 0);
    expect([c(1), c(2), c(3), c(4)]).toEqual(['bia', 'ana', 'caio', 'ana']);
  });

  it('a tabela tem teto', () => {
    const muitos = Array.from({ length: MAX_DONOS + 50 }, (_, i) => [`j${i}`, '']);
    const d = sanearDadosMundo({
      versao: 1,
      edicoes: {},
      jogador: null,
      hora: 0,
      extras: { donos: muitos },
    });
    expect((d.extras.donos as unknown[]).length).toBe(MAX_DONOS);
  });
});

describe('a cópia do cliente sabe o mesmo dono que o núcleo', () => {
  it('quadros por JSON: donoNaCelula na cópia = donoDoBloco no núcleo', () => {
    const n = nuvem();
    const ouvintes: ((m: Mensagem) => void)[] = [];
    const conexao: Conexao = {
      enviar: (c) => n.comando('bia', JSON.parse(JSON.stringify(c)) as Comando),
      aoReceber: (f) => void ouvintes.push(f),
      encerrar: () => undefined,
    };
    // a cópia da Bia começa como o "bem-vindo" manda (edições e tabela)
    const copia = criarEdicoes();
    copia.importar(n.estado.edicoes.exportar());
    copia.donos.importar(n.estado.edicoes.donos.exportar());
    const cliente = criarEstadoCliente({
      conexao,
      inventario: criarInventario(),
      aplicarBloco: (x, y, z, b, meta, dono) => copia.definir(x, y, z, b, meta, dono),
      aoQuadro: (q) => {
        if (q.donos) copia.donos.importar(q.donos);
      },
      hora: 0.3,
      dia: 0,
      clima: { tipo: 'limpo', nuvens: 0, chuva: 0, neblina: 0, raios: 0, arco: 0 } as never,
      sobrevivencia: estadoInicial(),
    });
    const entregar = () => {
      n.passo();
      const q = n.quadros().get('bia')!;
      for (const f of ouvintes) f(JSON.parse(JSON.stringify(q)) as Mensagem);
    };
    entregar();
    // a Bia prevê e manda; a Ana coloca direto no núcleo; a porta da Bia é aberta pela Ana
    cliente.prever(1, B.x, B.y, B.z, Bloco.TABUAS, 0);
    cliente.enviar(colocar(cliente.proximoId(), B));
    n.comando('ana', colocar(1, A));
    n.comando('bia', {
      t: 'colocar',
      id: cliente.proximoId(),
      ...PORTA,
      bloco: Bloco.PORTA,
      meta: 1,
      slot: 0,
      extras: [{ ...PORTA, y: PORTA.y + 1 }],
    });
    n.comando('ana', { t: 'usar', id: 2, ...PORTA });
    for (let i = 0; i < 3; i++) entregar();
    for (const c of [A, B, PORTA, { ...PORTA, y: PORTA.y + 1 }, { x: X, y: Y - 1, z: Z }])
      expect(donoNaCelula(copia, c.x, c.y, c.z, 'ana')).toBe(n.donoDoBloco(c.x, c.y, c.z));
    expect(copia.exportar()).toEqual(n.estado.edicoes.exportar());
  });
});

describe('tamanho do salvamento com donos', () => {
  /**
   * Mundo grande de teste: 400 chunks com 600 células editadas cada (240 mil edições). Cada
   * "ação" é cavar (ar) ou construir um trecho de 3 a 12 blocos de um tipo (60 tipos, alguns
   * com direção), em lugares espalhados; a cada 4 ações a pessoa que constrói pode mudar.
   * Mede o JSON e o gzip como o servidor grava as regiões (e o aparelho guarda as edições).
   */
  function mundo(parteDosAmigos: number): EdicoesExportadas {
    let s = 11;
    const r = () => (s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 2 ** 32;
    const ed = criarEdicoes();
    const amigos = ['bia', 'caio', 'duda', 'enzo'].map((id) => ed.donos.indice(id, id));
    for (let cx = 0; cx < 20; cx++)
      for (let cz = 0; cz < 20; cz++) {
        let dono = 0;
        let acoes = 0;
        while ((ed.mapaDoChunk?.(cx, cz)?.size ?? 0) < 600) {
          const cavar = r() < 0.3;
          if (acoes++ % 4 === 0) dono = r() < parteDosAmigos ? amigos[Math.floor(r() * 4)] : 0;
          const x0 = Math.floor(r() * 16);
          const z0 = Math.floor(r() * 16);
          const y0 = 55 + Math.floor(r() * 20);
          const n = 3 + Math.floor(r() * 10);
          const b = 1 + Math.floor(r() * 60);
          const meta = r() < 0.2 ? Math.floor(r() * 4) : 0;
          for (let t = 0; t < n; t++)
            ed.definir(
              cx * 16 + ((x0 + t) % 16),
              y0,
              cz * 16 + z0,
              cavar ? Bloco.AR : b,
              meta,
              dono,
            );
        }
      }
    return ed.exportar();
  }
  const medir = (e: EdicoesExportadas) => {
    const t = JSON.stringify(e);
    return { json: t.length, gzip: gzipSync(t).length };
  };

  it('dono do mundo: cresce zero; amigos: cresce pouco', () => {
    const tirarDono = (e: EdicoesExportadas) =>
      Object.fromEntries(
        Object.entries(e).map(([k, l]) => [k, l.map(([i, v]) => [i, semDono(v)])]),
      ) as EdicoesExportadas;
    const pct = (a: number, b: number) => Math.round(((b - a) / a) * 1000) / 10;
    const linhas: string[] = [];
    const soDono = mundo(0);
    expect(medir(tirarDono(soDono))).toEqual(medir(soDono));
    for (const parte of [0, 0.25, 0.5, 1]) {
      const com = mundo(parte);
      const antes = medir(tirarDono(com));
      const depois = medir(com);
      linhas.push(
        `${parte * 100}% dos amigos: ${antes.json}→${depois.json} B json (+${pct(antes.json, depois.json)}%), ` +
          `${antes.gzip}→${depois.gzip} B gzip (+${pct(antes.gzip, depois.gzip)}%)`,
      );
      expect(depois.gzip).toBeLessThan(antes.gzip * 1.1);
      expect(depois.json).toBeLessThan(antes.json * 1.3);
    }
    console.log(`[016 tamanho] 240 mil edições\n  ${linhas.join('\n  ')}`);
  });
});
