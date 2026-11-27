import { describe, expect, it } from 'vitest';
import { criarGerenciador, type Canal } from '../src/salas';
import { armazemMemoria } from '../src/armazem';
import { ESTILO_PADRAO, alturaTerreno } from '../../src/world/chunk';
import '../../src/temas/todos';
import { Bloco } from '../../src/world/blocks';
import { PARTE_CURTINHA, celulasDoMovel, metaDoMovel } from '../../src/jogo/moveis';
import { criarNucleo } from '../../src/nucleo/nucleo';
import { VERSAO_CAMAS } from '../../src/nucleo/camas';
import { celulasDoTapete } from '../../src/jogo/tapetes';
import { VERSAO_REDE, type RespostaServidor } from '../../src/rede/protocolo';
import type { Quadro } from '../../src/nucleo/protocolo';

/**
 * Spec 039 (T01): os móveis e os tapetes na sala da nuvem de verdade (o gerenciador, o
 * saneamento e a gravação): a amiga que entra no meio recebe a camada dos tapetes, quem cai e
 * volta também, e a sala que dorme acorda com o sofá, o abajur aceso e o tapete.
 */
function canal() {
  const recebidas: RespostaServidor[] = [];
  const c: Canal & { recebidas: RespostaServidor[] } = {
    ip: '1.2.3.4',
    enviar: (t) => recebidas.push(JSON.parse(t) as RespostaServidor),
    fechar: () => {},
    recebidas,
  };
  return c;
}
const ident = (id: string) => ({ id, chave: `chave-secreta-de-${id}-123`, apelido: id, aparencia: {} });
const quadros = (c: ReturnType<typeof canal>) =>
  c.recebidas.filter((m) => m.t === 'quadro') as Quadro[];

describe('as camas de antes na sala da nuvem (spec 039, T03)', () => {
  it('o mundo da main levado para a nuvem: as camas viram a nova ou a curtinha, uma vez só, e voltam assim', async () => {
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
    // o salvamento como a main grava: um chão de tábuas no alto, duas camas de uma célula (uma
    // com a frente livre, outra com uma parede na frente) e nada de `extras.camas`
    const X = 40;
    const Z = 40;
    const Y = alturaTerreno(X, Z, 1337) + 24;
    const base = criarNucleo({ semente: 1337, modo: 'criativo', versaoMundo: 2, dono: 'x' });
    const ed = base.estado.edicoes;
    for (let x = X - 1; x <= X + 4; x++)
      for (let z = Z - 1; z <= Z + 4; z++) ed.definir(x, Y - 1, z, Bloco.TABUAS);
    ed.definir(X, Y, Z, Bloco.CAMA, 0);
    ed.definir(X + 2, Y, Z, Bloco.CAMA, 0);
    ed.definir(X + 2, Y, Z + 1, Bloco.TABUAS);
    const s = base.salvar();
    const extras: Record<string, unknown> = { ...s.extras, spawn: { x: X + 0.5, z: Z + 0.5 } };
    delete extras['camas'];
    const dados = { versao: 1, edicoes: s.edicoes, jogador: null, hora: s.hora, extras };
    const a = canal();
    await g.receber(
      a,
      JSON.stringify({
        t: 'entrar',
        versao: VERSAO_REDE,
        jogador: ident('ana'),
        criar: {
          nome: 'Casa',
          semente: 1337,
          tema: 'rancho-alegre',
          modo: 'criativo',
          versaoMundo: 2,
          estilo: ESTILO_PADRAO,
          dados,
        },
      }),
    );
    const bv = a.recebidas.find((m) => m.t === 'bemvindo') as Extract<RespostaServidor, { t: 'bemvindo' }>;
    const codigo = bv.sala.codigo;
    await avancar(200);
    const nucleo = () => g.ativas.get(codigo)!.nucleo;
    const conferir = () => {
      const n = nucleo();
      expect(n.estado.mundo.bloco(X, Y, Z + 1)).toBe(Bloco.CAMA);
      expect(n.estado.edicoes.obterMeta(X, Y, Z + 1)).toBe(metaDoMovel(0, 1));
      expect(n.estado.mundo.bloco(X + 2, Y, Z)).toBe(Bloco.CAMA);
      expect(n.estado.edicoes.obterMeta(X + 2, Y, Z)).toBe(metaDoMovel(0, PARTE_CURTINHA));
      expect(n.estado.mundo.bloco(X + 2, Y, Z + 1)).toBe(Bloco.TABUAS);
    };
    conferir();
    // o "bem-vindo" já leva as camas convertidas (o navegador monta o mesmo terreno)
    const pe = bv.edicoes[`${Math.floor(X / 16)},${Math.floor((Z + 1) / 16)}`] ?? [];
    expect(pe.some(([, v]) => (v & 255) === Bloco.CAMA && ((v >> 8) & 255) === metaDoMovel(0, 1))).toBe(
      true,
    );
    // a sala dorme e acorda: a conversão não roda de novo, e as camas são as mesmas
    const antes = JSON.stringify(nucleo().estado.edicoes.exportar());
    g.caiu(a);
    await avancar(95_000);
    expect(g.ativas.has(codigo)).toBe(false);
    const a2 = canal();
    await g.receber(
      a2,
      JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident('ana'), codigo }),
    );
    await avancar(200);
    conferir();
    expect(JSON.stringify(nucleo().estado.edicoes.exportar())).toBe(antes);
    // parar de jogar com amigos: o mundo volta para o aparelho com a marca da conversão
    await g.receber(a2, JSON.stringify({ t: 'dono', acao: 'devolver' }));
    await avancar(200);
    const devolvido = a2.recebidas.find((m) => m.t === 'devolvido') as Extract<
      RespostaServidor,
      { t: 'devolvido' }
    >;
    expect(devolvido.dados.extras['camas']).toBe(VERSAO_CAMAS);
  });
});

describe('móveis e tapetes na sala da nuvem', () => {
  it('a amiga que entra no meio, quem cai e volta e a sala que dorme e acorda veem tudo igual', async () => {
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
    const a = canal();
    await g.receber(
      a,
      JSON.stringify({
        t: 'entrar',
        versao: VERSAO_REDE,
        jogador: ident('ana'),
        criar: {
          nome: 'Casa',
          semente: 1337,
          tema: 'rancho-alegre',
          modo: 'criativo',
          versaoMundo: 2,
          estilo: ESTILO_PADRAO,
        },
      }),
    );
    const codigo = (a.recebidas.find((m) => m.t === 'bemvindo') as Extract<RespostaServidor, { t: 'bemvindo' }>).sala.codigo;
    await avancar(300);
    // a sala: um chão de tábuas no alto, e a Ana em pé na beira dele
    const nucleo = () => g.ativas.get(codigo)!.nucleo;
    const ana = nucleo().estado.jogadores.get('ana')!;
    const X = Math.floor(ana.tel.x);
    const Z = Math.floor(ana.tel.z);
    const Y = alturaTerreno(X, Z, 1337) + 24;
    for (let x = X - 1; x <= X + 6; x++)
      for (let z = Z - 1; z <= Z + 6; z++) {
        nucleo().estado.edicoes.definir(x, Y - 1, z, Bloco.TABUAS);
        for (let y = Y; y <= Y + 2; y++) nucleo().estado.edicoes.definir(x, y, z, Bloco.AR);
      }
    let seq = 0;
    const mandar = (c: Record<string, unknown>) =>
      g.receber(a, JSON.stringify({ ...c, seq: ++seq }));
    ana.saltoPermitido = true;
    await mandar({
      t: 'jogador',
      x: X + 0.5,
      y: Y,
      z: Z - 0.5,
      yaw: 0,
      pitch: 0,
      olhos: Y + 1.62,
      noChao: true,
      voando: false,
      vel: 0,
      correndo: false,
      submerso: false,
      quedas: [],
      pulos: 0,
      golpes: 0,
      slot: 0,
    });
    const extras = (cs: { x: number; y: number; z: number }[]) =>
      cs.slice(1).map(({ x, y, z }) => ({ x, y, z }));
    await mandar({
      t: 'colocar',
      id: 1,
      x: X + 1,
      y: Y,
      z: Z + 1,
      bloco: Bloco.SOFA,
      meta: 0,
      slot: 0,
      extras: extras(celulasDoMovel(Bloco.SOFA, X + 1, Y, Z + 1, 0)),
    });
    await mandar({
      t: 'colocar',
      id: 2,
      x: X + 4,
      y: Y,
      z: Z + 1,
      bloco: Bloco.ABAJUR,
      meta: 0,
      slot: 0,
      extras: extras(celulasDoMovel(Bloco.ABAJUR, X + 4, Y, Z + 1, 0)),
    });
    await mandar({ t: 'usar', id: 3, x: X + 4, y: Y + 1, z: Z + 1 });
    await mandar({
      t: 'colocar',
      id: 4,
      x: X,
      y: Y,
      z: Z + 3,
      bloco: Bloco.TAPETE,
      meta: 0,
      slot: 0,
      extras: extras(celulasDoTapete(X, Y, Z + 3, 0)),
    });
    await avancar(200);
    const tapete = { x: X, y: Y, z: Z + 3, d: 0, dono: 0 };
    expect(nucleo().estado.tapetes.todos()).toEqual([tapete]);
    expect(nucleo().estado.mundo.bloco(X + 2, Y, Z + 1)).toBe(Bloco.SOFA);
    expect(nucleo().estado.mundo.bloco(X + 4, Y + 1, Z + 1)).toBe(Bloco.ABAJUR_ACESO);

    // a Bia entra no meio: o primeiro quadro dela traz a camada dos tapetes
    const b = canal();
    await g.receber(
      b,
      JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident('bia'), codigo }),
    );
    await avancar(200);
    const primeiroDaBia = quadros(b).find((q) => q.primeiro)!;
    expect(primeiroDaBia.tapetes).toEqual([tapete]);
    // e o "bem-vindo" dela já traz o sofá e o abajur aceso nas edições
    const bv = b.recebidas.find((m) => m.t === 'bemvindo') as Extract<RespostaServidor, { t: 'bemvindo' }>;
    expect(JSON.stringify(bv.edicoes)).toContain(String(Bloco.ABAJUR_ACESO));

    // a Ana cai e volta: a sequência recomeça com a camada inteira
    g.caiu(a);
    await avancar(2000);
    const a2 = canal();
    await g.receber(
      a2,
      JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident('ana'), codigo }),
    );
    await avancar(200);
    expect(quadros(a2).find((q) => q.primeiro)!.tapetes).toEqual([tapete]);

    // todos saem; a sala dorme e acorda com tudo
    g.caiu(a2);
    g.caiu(b);
    await avancar(95_000);
    expect(g.ativas.has(codigo)).toBe(false);
    const a3 = canal();
    await g.receber(
      a3,
      JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident('ana'), codigo }),
    );
    await avancar(200);
    expect(nucleo().estado.tapetes.todos()).toEqual([tapete]);
    expect(nucleo().estado.mundo.bloco(X + 1, Y, Z + 1)).toBe(Bloco.SOFA);
    expect(nucleo().estado.mundo.bloco(X + 2, Y, Z + 1)).toBe(Bloco.SOFA);
    expect(nucleo().estado.mundo.bloco(X + 4, Y, Z + 1)).toBe(Bloco.ABAJUR_ACESO);
    expect(quadros(a3).find((q) => q.primeiro)!.tapetes).toEqual([tapete]);
  });
});
