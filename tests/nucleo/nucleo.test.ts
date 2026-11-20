import { describe, expect, it } from 'vitest';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { encontrarNascimento, alturaTerreno } from '../../src/world/chunk';
import { Bloco } from '../../src/world/blocks';
import { idDoBloco } from '../../src/jogo/itens';
import type { Comando, Telemetria } from '../../src/nucleo/protocolo';

const SEMENTE = 1337;

function telemetria(x: number, y: number, z: number, extra: Partial<Telemetria> = {}): Comando {
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

function novo(modo: 'criativo' | 'sobrevivencia' = 'sobrevivencia'): {
  n: Nucleo;
  x: number;
  y: number;
  z: number;
} {
  // como o servidor local: o jogador local é o dono do mundo (spec 016)
  const n = criarNucleo({
    semente: SEMENTE,
    modo,
    versaoMundo: 2,
    confiarNoCliente: true,
    dono: 'local',
  });
  n.conectar('local');
  const p = encontrarNascimento(SEMENTE);
  const x = Math.floor(p.x);
  const z = Math.floor(p.z);
  const y = alturaTerreno(x, z, SEMENTE) + 1;
  n.comando('local', telemetria(x + 0.5, y, z + 0.5));
  return { n, x, y, z };
}

/** Bloco atual visto pelo núcleo. */
const bloco = (n: Nucleo, x: number, y: number, z: number) => n.estado.mundo.bloco(x, y, z);

describe('núcleo', () => {
  it('na sobrevivência, colocar sem o item é recusado e o bloco volta', () => {
    const { n, x, y, z } = novo();
    n.comando('local', {
      t: 'colocar',
      id: 1,
      x: x + 2,
      y,
      z,
      bloco: Bloco.TABUAS,
      meta: 0,
      slot: 0,
    });
    expect(bloco(n, x + 2, y, z)).not.toBe(Bloco.TABUAS);
    const q = n.quadros().get('local')!;
    expect(q.ack).toBe(1);
    expect(q.eventos?.some((e) => e.e === 'recusa')).toBe(true);
    // a correção leva o valor certo da célula para o cliente desfazer a previsão
    expect(q.blocos?.some((b) => b.x === x + 2 && b.y === y && b.z === z)).toBe(true);
  });

  it('com o item, coloca, gasta do inventário e todos veem o bloco', () => {
    const { n, x, y, z } = novo();
    const tabuas = { item: idDoBloco(Bloco.TABUAS), qtd: 3 };
    n.comando('local', {
      t: 'transacao',
      id: 1,
      mudancas: [{ onde: 'inv', i: 0, antes: null, depois: tabuas }],
    });
    n.comando('local', {
      t: 'colocar',
      id: 2,
      x: x + 2,
      y,
      z,
      bloco: Bloco.TABUAS,
      meta: 0,
      slot: 0,
    });
    expect(bloco(n, x + 2, y, z)).toBe(Bloco.TABUAS);
    const q = n.quadros().get('local')!;
    expect(q.blocos).toContainEqual({ x: x + 2, y, z, v: Bloco.TABUAS });
    expect(q.inventario?.slots[0]).toEqual({ item: tabuas.item, qtd: 2 });
    expect(q.eventos?.some((e) => e.e === 'colocacao' && e.meu)).toBe(true);
  });

  it('não coloca bloco sólido dentro do jogador', () => {
    const { n, x, y, z } = novo('criativo');
    n.comando('local', { t: 'colocar', id: 1, x, y, z, bloco: Bloco.TABUAS, meta: 0, slot: 0 });
    expect(bloco(n, x, y, z)).not.toBe(Bloco.TABUAS);
  });

  it('quebrar na sobrevivência solta o item, e o jogador perto coleta', () => {
    const { n, x, y, z } = novo();
    const by = y - 1;
    const antes = bloco(n, x + 1, by, z);
    expect(antes).not.toBe(Bloco.AR);
    n.comando('local', { t: 'quebrar', id: 1, x: x + 1, y: by, z, slot: 0 });
    expect(bloco(n, x + 1, by, z)).toBe(Bloco.AR);
    n.quadros();
    for (let i = 0; i < 20; i++) n.passo();
    expect(n.estado.mundoItens.itens.length).toBeGreaterThan(0);
    // anda até o item
    const it0 = n.estado.mundoItens.itens[0];
    n.comando('local', telemetria(it0.x, it0.y - 0.7, it0.z));
    const eventos = [];
    for (let i = 0; i < 40; i++) {
      n.passo();
      eventos.push(...(n.quadros().get('local')!.eventos ?? []));
    }
    expect(eventos.some((e) => e.e === 'coletou')).toBe(true);
    expect(n.estado.jogadores.get('local')!.inventario.slots.some((s) => !!s)).toBe(true);
  });

  it('a mesma sequência de comandos dá o mesmo mundo (determinismo)', () => {
    const rodar = () => {
      const { n, x, y, z } = novo();
      const hashes: string[] = [];
      for (let i = 0; i < 600; i++) {
        if (i === 10) n.comando('local', { t: 'quebrar', id: 1, x: x + 1, y: y - 1, z, slot: 0 });
        if (i === 200) n.comando('local', telemetria(x + 6.5, y + 2, z + 0.5, { vel: 3 }));
        n.passo();
        n.quadros();
        if (i % 100 === 0)
          hashes.push(
            JSON.stringify({
              c: n.estado.populacao.lista.map((c) => [c.tipo, c.x.toFixed(4), c.z.toFixed(4)]),
              i: n.estado.mundoItens.itens.map((t) => [t.item, t.x.toFixed(4), t.y.toFixed(4)]),
              s: n.salvar(),
            }),
          );
      }
      return hashes;
    };
    expect(rodar()).toEqual(rodar());
  });

  it('o relógio cansa na sobrevivência; o atalho da paridade desliga só esse cansaço', () => {
    // spec 034: correndo, 0,25 de exaustão por segundo; 20 s (400 passos) passam de 4 e a
    // saturação cai 1
    const sat = (n: Nucleo) => n.dadosJogador('local')!.sobrevivencia.saturacao;
    const comRelogio = novo();
    comRelogio.n.comando(
      'local',
      telemetria(comRelogio.x + 0.5, comRelogio.y, comRelogio.z + 0.5, { correndo: true }),
    );
    const s0 = sat(comRelogio.n);
    for (let i = 0; i < 400; i++) comRelogio.n.passo();
    expect(sat(comRelogio.n)).toBe(s0 - 1);

    const semRelogio = novo();
    const { x, y, z } = semRelogio;
    semRelogio.n.comando('local', { t: 'depurar', d: { f: 'relogioCansa', ligado: false } });
    semRelogio.n.comando('local', telemetria(x + 0.5, y, z + 0.5, { correndo: true }));
    for (let i = 0; i < 400; i++) semRelogio.n.passo();
    expect(sat(semRelogio.n)).toBe(s0);
    // os pulos continuam cansando: 6 correndo = 4,8 de exaustão
    semRelogio.n.comando('local', telemetria(x + 0.5, y, z + 0.5, { correndo: true, pulos: 6 }));
    semRelogio.n.passo();
    expect(sat(semRelogio.n)).toBe(s0 - 1);
    // e religado, o relógio volta a cansar
    semRelogio.n.comando('local', { t: 'depurar', d: { f: 'relogioCansa', ligado: true } });
    for (let i = 0; i < 400; i++) semRelogio.n.passo();
    expect(sat(semRelogio.n)).toBe(s0 - 2);
  });

  it('como no servidor da nuvem (sem os atalhos de depuração), o atalho não tira o cansaço', () => {
    const n = criarNucleo({ semente: SEMENTE, modo: 'sobrevivencia', versaoMundo: 2 });
    n.conectar('a');
    const p = encontrarNascimento(SEMENTE);
    const x = Math.floor(p.x) + 0.5;
    const z = Math.floor(p.z) + 0.5;
    const y = alturaTerreno(Math.floor(p.x), Math.floor(p.z), SEMENTE) + 1;
    const sat = () => n.dadosJogador('a')!.sobrevivencia.saturacao;
    n.comando('a', telemetria(x, y, z));
    const s0 = sat();
    n.comando('a', { t: 'depurar', d: { f: 'relogioCansa', ligado: false } });
    n.comando('a', telemetria(x, y, z, { correndo: true }));
    for (let i = 0; i < 400; i++) n.passo();
    expect(sat()).toBe(s0 - 1);
  });

  it('salvar e reabrir dá o mesmo estado do mundo', () => {
    const { n, x, y, z } = novo();
    n.comando('local', { t: 'quebrar', id: 1, x: x + 1, y: y - 1, z, slot: 0 });
    for (let i = 0; i < 50; i++) n.passo();
    const salvo = n.salvar();
    const m = criarNucleo({
      semente: SEMENTE,
      modo: 'sobrevivencia',
      versaoMundo: 2,
      confiarNoCliente: true,
      dados: {
        versao: 1,
        edicoes: salvo.edicoes,
        hora: salvo.hora,
        extras: salvo.extras,
        jogador: null,
      },
    });
    m.conectar('local');
    const outro = m.salvar();
    expect(outro.edicoes).toEqual(salvo.edicoes);
    expect(outro.extras['inventario']).toEqual(salvo.extras['inventario']);
    expect(outro.extras['conteineres']).toEqual(salvo.extras['conteineres']);
    expect(outro.extras['dia']).toEqual(salvo.extras['dia']);
    expect(outro.hora).toBeCloseTo(salvo.hora, 10);
  });

  it('a porta abre e fecha as duas metades', () => {
    const { n, x, y, z } = novo('criativo');
    n.comando('local', {
      t: 'colocar',
      id: 1,
      x: x + 2,
      y,
      z,
      bloco: Bloco.PORTA,
      meta: 0,
      slot: 0,
      extras: [{ x: x + 2, y: y + 1, z }],
    });
    expect(bloco(n, x + 2, y + 1, z)).toBe(Bloco.PORTA);
    n.comando('local', { t: 'usar', x: x + 2, y, z });
    expect(bloco(n, x + 2, y, z)).toBe(Bloco.PORTA_ABERTA);
    expect(bloco(n, x + 2, y + 1, z)).toBe(Bloco.PORTA_ABERTA);
  });

  it('fornalha acesa funde com o painel fechado e a chama acende o bloco', () => {
    const { n, x, y, z } = novo('criativo');
    n.comando('local', {
      t: 'colocar',
      id: 1,
      x: x + 2,
      y,
      z,
      bloco: Bloco.FORNALHA,
      meta: 0,
      slot: 0,
    });
    n.comando('local', { t: 'usar', x: x + 2, y, z });
    n.comando('local', {
      t: 'transacao',
      id: 2,
      mudancas: [
        { onde: 'forn', i: 0, antes: null, depois: { item: 'ferro_bruto', qtd: 2 } },
        { onde: 'forn', i: 1, antes: null, depois: { item: 'carvao', qtd: 2 } },
      ],
    });
    n.comando('local', { t: 'fecharConteiner' });
    for (let i = 0; i < 20 * 30; i++) n.passo();
    const f = n.estado.conteineres.fornalha(x + 2, y, z);
    expect(f.saida?.item).toBe('lingote_ferro');
    expect(f.saida?.qtd).toBe(2);
  });
});
