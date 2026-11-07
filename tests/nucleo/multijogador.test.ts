import { describe, expect, it } from 'vitest';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { encontrarNascimento, alturaTerreno } from '../../src/world/chunk';
import { Bloco } from '../../src/world/blocks';
import { idDoBloco } from '../../src/jogo/itens';
import type { Comando, Telemetria } from '../../src/nucleo/protocolo';

/** Spec 010: o mesmo núcleo com vários jogadores e sem confiar no cliente (nuvem). */
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

function nuvem(modo: 'criativo' | 'sobrevivencia' = 'sobrevivencia'): Nucleo {
  const n = criarNucleo({
    semente: SEMENTE,
    modo,
    versaoMundo: 2,
    confiarNoCliente: false,
    depuracao: true,
  });
  n.conectar('ana', { perfil: { apelido: 'Ana', aparencia: {} } });
  n.conectar('bia', { perfil: { apelido: 'Bia', aparencia: {} } });
  n.comando('ana', tel(X + 0.5, Z + 0.5));
  n.comando('bia', tel(X + 2.5, Z + 0.5));
  return n;
}
const inv = (n: Nucleo, id: string) => n.estado.jogadores.get(id)!.inventario;

describe('núcleo com vários jogadores', () => {
  it('o que um quebra, o outro vê; os dois sabem um do outro', () => {
    const n = nuvem('criativo');
    n.quadros();
    n.comando('ana', { t: 'quebrar', id: 1, x: X + 1, y: Y - 1, z: Z, slot: 0 });
    n.passo();
    const q = n.quadros();
    for (const id of ['ana', 'bia'])
      expect(q.get(id)!.blocos).toContainEqual({ x: X + 1, y: Y - 1, z: Z, v: Bloco.AR });
    expect(q.get('ana')!.jogadores?.map((j) => j.id)).toEqual(['bia']);
    expect(q.get('bia')!.jogadores?.map((j) => j.id)).toEqual(['ana']);
    expect(q.get('ana')!.eventos?.find((e) => e.e === 'quebra')).toMatchObject({ meu: true });
    expect(q.get('bia')!.eventos?.find((e) => e.e === 'quebra')).toMatchObject({ meu: false });
  });

  it('o amigo vê os movimentos: golpe, colocar bloco e comer sobem os contadores', () => {
    const n = nuvem();
    const acoesDaAna = () =>
      n
        .quadros()
        .get('bia')!
        .jogadores?.find((j) => j.id === 'ana')?.acoes;
    expect(acoesDaAna()).toEqual([0, 0, 0]);
    // golpes vêm na telemetria
    n.comando('ana', tel(X + 0.5, Z + 0.5, { golpes: 3 }));
    n.passo();
    expect(acoesDaAna()).toEqual([3, 0, 0]);
    // colocar um bloco que ela tem
    inv(n, 'ana').definir(0, { item: idDoBloco(Bloco.TABUAS), qtd: 4 });
    n.comando('ana', {
      t: 'colocar',
      id: 7,
      x: X + 1,
      y: Y,
      z: Z + 1,
      bloco: Bloco.TABUAS,
      meta: 0,
      slot: 0,
    });
    n.passo();
    expect(acoesDaAna()?.[1]).toBe(1);
    // comer com fome
    const ana = n.estado.jogadores.get('ana')!;
    // cansa até dar fome (pular correndo gasta)
    for (let i = 0; i < 4000 && ana.sobrevivencia.estado.fome >= 18; i++)
      ana.sobrevivencia.pulo(true);
    expect(ana.sobrevivencia.estado.fome).toBeLessThan(20);
    inv(n, 'ana').definir(1, { item: 'maca', qtd: 2 });
    n.comando('ana', { t: 'comer', slot: 1 });
    n.passo();
    expect(acoesDaAna()?.[2]).toBe(1);
    // e a Bia não aparece para ela mesma
    expect(
      n
        .quadros()
        .get('ana')!
        .jogadores?.map((j) => j.id),
    ).toEqual(['bia']);
  });

  it('dois querem o mesmo item no chão: só um pega, e o total se conserva', () => {
    const n = nuvem();
    n.comando('ana', {
      t: 'depurar',
      d: { f: 'soltarItem', item: 'carvao', qtd: 5, x: X + 1.5, y: Y + 0.5, z: Z + 0.5 },
    });
    // os dois em cima do item
    n.comando('ana', tel(X + 1.5, Z + 0.5));
    n.comando('bia', tel(X + 1.5, Z + 0.6));
    for (let i = 0; i < 60; i++) n.passo();
    const total = inv(n, 'ana').contar('carvao') + inv(n, 'bia').contar('carvao');
    expect(total).toBe(5);
    expect(inv(n, 'ana').contar('carvao') === 5 || inv(n, 'bia').contar('carvao') === 5).toBe(true);
  });

  it('na nuvem, item que nasce do nada é recusado e tudo volta', () => {
    const n = nuvem();
    n.quadros();
    n.comando('ana', {
      t: 'transacao',
      id: 1,
      mudancas: [{ onde: 'inv', i: 0, antes: null, depois: { item: 'lingote_ouro', qtd: 64 } }],
    });
    expect(inv(n, 'ana').contar('lingote_ouro')).toBe(0);
    const q = n.quadros().get('ana')!;
    expect(q.inventario?.transito).toBeDefined();
    // mover o que tem, sim
    n.comando('ana', {
      t: 'depurar',
      d: { f: 'soltarItem', item: 'carvao', qtd: 3, x: X + 0.5, y: Y + 0.5, z: Z + 0.5 },
    });
    for (let i = 0; i < 40; i++) n.passo();
    const slot = inv(n, 'ana').slots.findIndex((s) => s?.item === 'carvao');
    expect(slot).toBeGreaterThanOrEqual(0);
    n.comando('ana', {
      t: 'transacao',
      id: 2,
      mudancas: [
        { onde: 'inv', i: slot, antes: { item: 'carvao', qtd: 3 }, depois: null },
        { onde: 'inv', i: 20, antes: null, depois: { item: 'carvao', qtd: 3 } },
      ],
    });
    expect(inv(n, 'ana').obter(20)).toEqual({ item: 'carvao', qtd: 3 });
  });

  it('jogar fora só sai o que o jogador tem', () => {
    const n = nuvem();
    const antes = n.estado.mundoItens.itens.length;
    n.comando('ana', { t: 'soltar', itens: [{ item: 'lingote_ouro', qtd: 10 }], x: X, y: Y, z: Z });
    expect(n.estado.mundoItens.itens.length).toBe(antes);
  });

  it('visitante que só passeia não quebra nem abre baú', () => {
    const n = nuvem('criativo');
    n.definirConstrucao('bia', false);
    n.comando('bia', { t: 'quebrar', id: 1, x: X + 2, y: Y - 1, z: Z, slot: 0 });
    expect(n.estado.mundo.bloco(X + 2, Y - 1, Z)).not.toBe(Bloco.AR);
    n.comando('ana', {
      t: 'colocar',
      id: 1,
      x: X + 4,
      y: Y,
      z: Z,
      bloco: Bloco.BAU,
      meta: 0,
      slot: 0,
    });
    n.comando('bia', { t: 'usar', id: 2, x: X + 4, y: Y, z: Z });
    expect(n.estado.jogadores.get('bia')!.conteiner).toBeNull();
  });

  it('a noite só passa quando todos deitam', () => {
    const n = nuvem();
    n.comando('ana', { t: 'depurar', d: { f: 'hora', hora: 0.9 } });
    n.comando('ana', {
      t: 'colocar',
      id: 1,
      x: X + 1,
      y: Y,
      z: Z + 2,
      bloco: Bloco.CAMA,
      meta: 0,
      slot: 0,
    });
    // sem a cama no inventário, o bloco não sai na sobrevivência: põe pelo atalho
    n.comando('ana', { t: 'depurar', d: { f: 'hora', hora: 0.9 } });
    const edicoes = n.estado.edicoes;
    edicoes.definir(X + 1, Y, Z + 2, Bloco.CAMA);
    n.comando('ana', { t: 'usar', x: X + 1, y: Y, z: Z + 2 });
    for (let i = 0; i < 60; i++) n.passo();
    expect(n.estado.hora).toBeGreaterThan(0.85);
    n.comando('bia', { t: 'usar', x: X + 1, y: Y, z: Z + 2 });
    for (let i = 0; i < 60; i++) n.passo();
    expect(n.estado.hora).toBeLessThan(0.3);
  });

  it('quem sai leva os dados; quem volta recebe os mesmos', () => {
    const n = nuvem();
    n.comando('bia', {
      t: 'depurar',
      d: { f: 'soltarItem', item: 'maca', qtd: 2, x: X + 2.5, y: Y + 0.5, z: Z + 0.5 },
    });
    for (let i = 0; i < 40; i++) n.passo();
    expect(inv(n, 'bia').contar('maca')).toBe(2);
    const d = n.desconectar('bia')!;
    expect(n.quantos).toBe(1);
    expect(
      n
        .quadros()
        .get('ana')!
        .eventos?.some((e) => e.e === 'saiu'),
    ).toBe(true);
    n.conectar('bia', { salvo: d, perfil: { apelido: 'Bia', aparencia: {} } });
    expect(inv(n, 'bia').contar('maca')).toBe(2);
    expect(n.estado.jogadores.get('bia')!.tel.x).toBeCloseTo(X + 2.5, 1);
  });

  it('criaturas e itens com dois jogadores não quebram nada em 2 minutos', () => {
    const n = nuvem();
    for (let i = 0; i < 2400; i++) {
      if (i === 600) n.comando('bia', tel(X + 40.5, Z + 0.5));
      n.passo();
      n.quadros();
    }
    expect(n.estado.populacao.lista.length).toBeGreaterThan(0);
  });
});

describe('posição plausível na nuvem', () => {
  it('teletransporte de um cliente adulterado é recusado e o jogador volta', () => {
    const n = criarNucleo({
      semente: SEMENTE,
      modo: 'sobrevivencia',
      versaoMundo: 2,
      confiarNoCliente: false,
    });
    n.conectar('ana', { perfil: { apelido: 'Ana', aparencia: {} } });
    n.comando('ana', tel(X + 0.5, Z + 0.5));
    n.passo();
    n.quadros();
    // anda um pouco: vale
    n.comando('ana', tel(X + 1.0, Z + 0.5));
    expect(n.estado.jogadores.get('ana')!.tel.x).toBeCloseTo(X + 1, 5);
    // 200 blocos num passo: não
    n.comando('ana', tel(X + 200.5, Z + 0.5));
    expect(n.estado.jogadores.get('ana')!.tel.x).toBeCloseTo(X + 1, 5);
    const ev = n.quadros().get('ana')!.eventos ?? [];
    expect(ev.some((e) => e.e === 'teleporte')).toBe(true);
  });
});

describe('mensagens absurdas na nuvem', () => {
  it('coordenadas gigantes, milhões de golpes e slots repetidos não travam nem duplicam', () => {
    const n = criarNucleo({
      semente: SEMENTE,
      modo: 'sobrevivencia',
      versaoMundo: 2,
      confiarNoCliente: false,
    });
    n.conectar('ana', { perfil: { apelido: 'Ana', aparencia: {} } });
    const t0 = performance.now();
    n.comando('ana', { ...tel(X + 0.5, Z + 0.5), x: 1e300 } as Comando);
    n.comando('ana', { ...tel(X + 0.5, Z + 0.5), golpes: 1e10, pulos: 1e10 } as Comando);
    n.comando('ana', tel(X + 3e7, Z + 0.5));
    for (let i = 0; i < 20; i++) n.passo();
    expect(performance.now() - t0).toBeLessThan(3000);
    expect(Math.abs(n.estado.jogadores.get('ana')!.tel.x - X)).toBeLessThan(10);
    // slot repetido na mesma transação
    n.comando('ana', { t: 'depurar', d: { f: 'dano', qtd: 0, causa: 'outro' } });
    const inv = n.estado.jogadores.get('ana')!.inventario;
    inv.definir(0, { item: 'carvao', qtd: 10 });
    n.comando('ana', {
      t: 'transacao',
      id: 1,
      mudancas: [
        { onde: 'inv', i: 0, antes: { item: 'carvao', qtd: 10 }, depois: null },
        { onde: 'inv', i: 1, antes: null, depois: { item: 'carvao', qtd: 10 } },
        {
          onde: 'inv',
          i: 0,
          antes: { item: 'carvao', qtd: 10 },
          depois: { item: 'carvao', qtd: 10 },
        },
      ],
    });
    expect(inv.contar('carvao')).toBe(10);
    // quantidade quebrada e durabilidade inventada
    n.comando('ana', {
      t: 'transacao',
      id: 2,
      mudancas: [
        {
          onde: 'inv',
          i: 0,
          antes: { item: 'carvao', qtd: 10 },
          depois: { item: 'carvao', qtd: 9.5 },
        },
      ],
    });
    expect(inv.obter(0)).toEqual({ item: 'carvao', qtd: 10 });
    inv.definir(2, { item: 'picareta_ferro', qtd: 1, dur: 2 });
    n.comando('ana', {
      t: 'transacao',
      id: 3,
      mudancas: [
        { onde: 'inv', i: 2, antes: { item: 'picareta_ferro', qtd: 1, dur: 2 }, depois: null },
        { onde: 'inv', i: 3, antes: null, depois: { item: 'picareta_ferro', qtd: 1, dur: 250 } },
      ],
    });
    expect(inv.obter(2)).toEqual({ item: 'picareta_ferro', qtd: 1, dur: 2 });
    // renascer sem ter desmaiado não cura nem teletransporta
    n.comando('ana', { t: 'depurar', d: { f: 'dano', qtd: 5, causa: 'outro' } });
    const vida = n.estado.jogadores.get('ana')!.sobrevivencia.estado.vida;
    n.comando('ana', { t: 'renascer' });
    expect(n.estado.jogadores.get('ana')!.sobrevivencia.estado.vida).toBe(vida);
  });
});
