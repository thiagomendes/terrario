import { describe, expect, it } from 'vitest';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { encontrarNascimento, alturaTerreno } from '../../src/world/chunk';
import { Bloco } from '../../src/world/blocks';
import { idDoBloco } from '../../src/jogo/itens';
import { aparenciaPadrao } from '../../src/personagem/aparencia';
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
    // como a sala na nuvem: a Ana criou o mundo (spec 016)
    dono: 'ana',
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

  it('gesto (spec 015): o amigo vê o gesto do outro, e só o dele', () => {
    const n = nuvem('criativo');
    n.quadros();
    n.comando('bia', { t: 'gesto', id: 7, gesto: 'comemorar' });
    n.passo();
    const q = n.quadros();
    expect(q.get('ana')!.eventos?.filter((e) => e.e === 'gesto')).toEqual([
      { e: 'gesto', gesto: 'comemorar', jogador: 'bia' },
    ]);
    expect(q.get('bia')!.eventos?.some((e) => e.e === 'gesto') ?? false).toBe(false);
    expect(q.get('bia')!.ack).toBeGreaterThanOrEqual(7);
  });

  it('o amigo troca a aparência no meio do jogo e o outro vê a nova', () => {
    const n = nuvem('criativo');
    n.quadros();
    n.comando('bia', { t: 'aparencia', aparencia: { modelo: 'musgueira', corRoupa: '#ffffff' } });
    n.passo();
    const q = n.quadros();
    // spec 017: a aparência chega passada a limpo (campo desconhecido sai, o resto é o modelo)
    expect(q.get('ana')!.perfis?.['bia']?.aparencia).toEqual(aparenciaPadrao('musgueira'));
    expect(q.get('ana')!.perfis?.['bia']?.apelido).toBe('Bia');
    // na nuvem, aparência que não é um objeto pequeno não entra
    n.comando('bia', { t: 'aparencia', aparencia: { x: 'a'.repeat(5000) } });
    n.passo();
    expect(n.estado.jogadores.get('bia')!.perfil.aparencia).toEqual(aparenciaPadrao('musgueira'));
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

/** Spec 013, critério 2: o plantio na nuvem (sem confiar no cliente). */
describe('plantio com vários jogadores, na nuvem', () => {
  // a terra da lavoura entre a Ana (X) e a Bia (X + 2)
  const F = { x: X + 1, y: Y - 1, z: Z + 1 };
  const C = { x: X + 1, y: Y, z: Z + 1 };
  function roca(modo: 'criativo' | 'sobrevivencia' = 'sobrevivencia') {
    const n = nuvem(modo);
    n.estado.edicoes.definir(F.x, F.y, F.z, Bloco.TERRA_MUSGOSA);
    n.estado.edicoes.definir(C.x, C.y, C.z, Bloco.AR);
    for (const id of ['ana', 'bia']) {
      inv(n, id).definir(0, { item: 'enxada_madeira', qtd: 1, dur: 60 });
      inv(n, id).definir(1, { item: 'semente_trigo', qtd: 4 });
    }
    n.quadros();
    return n;
  }
  const bloco = (n: Nucleo, p: { x: number; y: number; z: number }) =>
    n.estado.mundo.bloco(p.x, p.y, p.z);
  const plantar = (id: number) =>
    ({ t: 'colocar', id, ...C, bloco: Bloco.TRIGO_0, meta: 0, slot: 1 }) as Comando;

  it('arar, plantar, crescer e colher passam pelo saneamento', () => {
    const n = roca();
    n.comando('ana', { t: 'arar', id: 1, ...F, slot: 0 });
    expect(bloco(n, F)).toBe(Bloco.TERRA_ARADA);
    n.comando('ana', plantar(2));
    expect(bloco(n, C)).toBe(Bloco.TRIGO_0);
    expect(inv(n, 'ana').contar('semente_trigo')).toBe(3);
    // a Bia vê a lavoura nascer
    n.passo();
    const q = n.quadros().get('bia')!;
    expect(q.blocos).toContainEqual({ ...F, v: Bloco.TERRA_ARADA });
    expect(q.blocos).toContainEqual({ ...C, v: Bloco.TRIGO_0 });
    expect(q.eventos?.find((e) => e.e === 'arou')).toMatchObject({ meu: false });
    n.comando('ana', { t: 'depurar', d: { f: 'crescer', segundos: 400 } });
    expect(bloco(n, C)).toBe(Bloco.TRIGO_3);
    // spec 016: a horta é de quem plantou: a Bia não colhe a da Ana (o aviso diz de quem é)
    n.comando('bia', { t: 'quebrar', id: 1, ...C, slot: 0 });
    expect(bloco(n, C)).toBe(Bloco.TRIGO_3);
    n.passo();
    expect(n.quadros().get('bia')!.eventos).toContainEqual({
      e: 'recusa',
      comando: 1,
      motivo: 'quebrar',
      protecao: { motivo: 'amigo', dono: 'Ana' },
    });
    n.comando('ana', { t: 'quebrar', id: 3, ...C, slot: 0 });
    expect(bloco(n, C)).toBe(Bloco.AR);
    const trigo = n.estado.mundoItens.itens.filter((i) => i.item === 'trigo');
    expect(trigo.reduce((t, i) => t + i.qtd, 0)).toBeGreaterThanOrEqual(1);
  });

  it('comando de arar adulterado some no saneamento; longe ou sem enxada é recusado', () => {
    const n = roca();
    for (const ruim of [
      { t: 'arar', id: 1, x: F.x + 0.5, y: F.y, z: F.z, slot: 0 },
      { t: 'arar', id: 2, ...F, slot: 99 },
      { t: 'arar', id: 3, ...F },
      { t: 'arar', id: -4, ...F, slot: 0 },
    ])
      n.comando('ana', ruim as unknown as Comando);
    expect(bloco(n, F)).toBe(Bloco.TERRA_MUSGOSA);
    expect(n.quadros().get('ana')!.ack).toBe(0);
    // longe (a Bia está a 2 blocos daqui, a terra a 30)
    n.estado.edicoes.definir(X + 30, Y - 1, Z, Bloco.TERRA_MUSGOSA);
    n.comando('ana', { t: 'arar', id: 5, x: X + 30, y: Y - 1, z: Z, slot: 0 });
    // com as sementes na mão em vez da enxada
    n.comando('ana', { t: 'arar', id: 6, ...F, slot: 1 });
    expect(bloco(n, F)).toBe(Bloco.TERRA_MUSGOSA);
    const recusas = n
      .quadros()
      .get('ana')!
      .eventos?.filter((e) => e.e === 'recusa');
    expect(recusas?.map((e) => (e as { comando: number }).comando)).toEqual([5, 6]);
    // semente sem a semente no inventário (slot vazio)
    n.comando('ana', { t: 'arar', id: 7, ...F, slot: 0 });
    n.comando('ana', { ...plantar(8), slot: 5 } as Comando);
    expect(bloco(n, C)).toBe(Bloco.AR);
  });

  it('visitante que só passeia não ara, não planta e não colhe', () => {
    const n = roca();
    n.definirConstrucao('bia', false);
    n.comando('bia', { t: 'arar', id: 1, ...F, slot: 0 });
    expect(bloco(n, F)).toBe(Bloco.TERRA_MUSGOSA);
    n.comando('ana', { t: 'arar', id: 1, ...F, slot: 0 });
    n.comando('bia', plantar(2));
    expect(bloco(n, C)).toBe(Bloco.AR);
    n.comando('ana', plantar(2));
    n.comando('ana', { t: 'depurar', d: { f: 'crescer', segundos: 400 } });
    n.comando('bia', { t: 'quebrar', id: 3, ...C, slot: 0 });
    expect(bloco(n, C)).toBe(Bloco.TRIGO_3);
    expect(inv(n, 'bia').contar('semente_trigo')).toBe(4);
  });

  it('dois colhem a mesma planta no mesmo passo: só um leva', () => {
    const n = roca();
    n.comando('ana', { t: 'arar', id: 1, ...F, slot: 0 });
    n.comando('ana', plantar(2));
    n.comando('ana', { t: 'depurar', d: { f: 'crescer', segundos: 400 } });
    n.quadros();
    n.comando('ana', { t: 'quebrar', id: 3, ...C, slot: 0 });
    n.comando('bia', { t: 'quebrar', id: 1, ...C, slot: 0 });
    const q = n.quadros();
    const colheitas = ['ana', 'bia'].filter((id) =>
      q.get(id)!.eventos?.some((e) => e.e === 'colheu' && e.meu),
    );
    expect(colheitas).toEqual(['ana']);
    expect(q.get('bia')!.eventos?.some((e) => e.e === 'recusa')).toBe(true);
    const total = (item: string) =>
      n.estado.mundoItens.itens.filter((i) => i.item === item).reduce((t, i) => t + i.qtd, 0);
    expect(total('trigo')).toBeLessThanOrEqual(2);
    expect(total('semente_trigo')).toBeLessThanOrEqual(2);
    // e o total se conserva quando eles pegam (cada um o que chegou primeiro)
    for (let i = 0; i < 60; i++) n.passo();
    const pegou = ['ana', 'bia'].reduce((t, id) => t + inv(n, id).contar('trigo'), 0);
    expect(pegou + total('trigo')).toBeGreaterThanOrEqual(1);
    expect(pegou + total('trigo')).toBeLessThanOrEqual(2);
  });

  it('na nuvem a semente fora da terra arada e o bloco em cima da lavoura são recusados', () => {
    const n = roca();
    n.comando('ana', plantar(1));
    expect(bloco(n, C)).toBe(Bloco.AR);
    n.comando('ana', { t: 'arar', id: 2, ...F, slot: 0 });
    n.comando('ana', plantar(3));
    inv(n, 'bia').definir(2, { item: idDoBloco(Bloco.TABUAS), qtd: 4 });
    n.comando('bia', { t: 'colocar', id: 1, ...C, bloco: Bloco.TABUAS, meta: 0, slot: 2 });
    expect(bloco(n, C)).toBe(Bloco.TRIGO_0);
    expect(inv(n, 'bia').contar(idDoBloco(Bloco.TABUAS))).toBe(4);
  });
});

/** Spec 013, critério 3: a criação na nuvem (sem confiar no cliente). */
describe('criação com vários jogadores, na nuvem', () => {
  function sitio() {
    const n = nuvem();
    n.comando('ana', { t: 'depurar', d: { f: 'hora', hora: 0.5 } });
    n.comando('ana', { t: 'depurar', d: { f: 'pausarDia', pausar: true } });
    const invocar = (tipo: 'cervo' | 'coelho', dx: number) => {
      n.comando('ana', {
        t: 'depurar',
        d: { f: 'invocar', tipo, x: X + dx + 0.5, y: Y, z: Z + 2.5 },
      });
      const l = n.estado.populacao.lista;
      return l[l.length - 1];
    };
    n.quadros();
    return { n, invocar };
  }

  it('dar comida passa pelo saneamento e gasta do inventário do servidor', () => {
    const { n, invocar } = sitio();
    const vaca = invocar('cervo', 1);
    inv(n, 'ana').definir(0, { item: 'trigo', qtd: 3 });
    n.comando('ana', { t: 'alimentar', criatura: vaca.id, slot: 0 });
    expect(vaca.criado).toBe(true);
    expect(inv(n, 'ana').contar('trigo')).toBe(2);
    n.passo();
    const q = n.quadros();
    // a Bia vê os corações (não é dela) e o bicho criado
    expect(q.get('bia')!.eventos?.find((e) => e.e === 'alimentou')).toMatchObject({
      id: vaca.id,
      novo: true,
      meu: false,
    });
    expect(q.get('ana')!.eventos?.find((e) => e.e === 'alimentou')).toMatchObject({ meu: true });
    expect(q.get('bia')!.criaturas!.find((c) => c.id === vaca.id)?.criado).toBe(true);
  });

  it('o cliente não inventa comida: slot vazio, item de outro slot ou mensagem adulterada não valem', () => {
    const { n, invocar } = sitio();
    const vaca = invocar('cervo', 1);
    inv(n, 'ana').definir(4, { item: 'trigo', qtd: 3 });
    for (const ruim of [
      { t: 'alimentar', criatura: vaca.id, slot: 0 },
      { t: 'alimentar', criatura: vaca.id, slot: 99 },
      { t: 'alimentar', criatura: vaca.id },
      { t: 'alimentar', criatura: 'vaca', slot: 4 },
      { t: 'alimentar', criatura: vaca.id + 0.5, slot: 4 },
    ])
      n.comando('ana', ruim as unknown as Comando);
    expect(vaca.criado).toBeFalsy();
    expect(inv(n, 'ana').contar('trigo')).toBe(3);
    // a telemetria diz slot 4: agora o bicho segue (a mão vem do servidor)
    n.comando('ana', tel(X + 0.5, Z + 0.5, { slot: 4 }));
    for (let i = 0; i < 20; i++) n.passo();
    expect(vaca.estado).toBe('seguir');
  });

  it('dois dão comida ao mesmo bicho: vira criado uma vez só, e só o primeiro gasta', () => {
    const { n, invocar } = sitio();
    const g = invocar('coelho', 1);
    inv(n, 'ana').definir(0, { item: 'semente_trigo', qtd: 2 });
    inv(n, 'bia').definir(0, { item: 'semente_milho', qtd: 2 });
    n.comando('ana', { t: 'alimentar', criatura: g.id, slot: 0 });
    // a Bia logo depois (no mesmo segundo os corações não se repetem)
    for (let i = 0; i < 21; i++) n.passo();
    n.comando('bia', { t: 'alimentar', criatura: g.id, slot: 0 });
    expect(g.criado).toBe(true);
    expect(inv(n, 'ana').contar('semente_trigo')).toBe(1);
    expect(inv(n, 'bia').contar('semente_milho')).toBe(2);
    expect(n.estado.populacao.criados).toBe(1);
    const novos = [...n.quadros().values()]
      .flatMap((q) => q.eventos ?? [])
      .filter((e) => e.e === 'alimentou' && e.meu);
    expect(novos.map((e) => (e as { novo: boolean }).novo)).toEqual([true, false]);
  });

  it('cada bicho segue quem segura a comida dele, mesmo com outro jogador mais perto', () => {
    const { n, invocar } = sitio();
    // a vaca está do lado da Bia; a Ana, a 5 blocos, tem o trigo
    const vaca = invocar('cervo', 3);
    n.comando('ana', tel(X - 2.5, Z + 0.5));
    inv(n, 'ana').definir(0, { item: 'trigo', qtd: 3 });
    for (let i = 0; i < 100; i++) n.passo();
    const ana = n.estado.jogadores.get('ana')!.tel;
    expect(Math.hypot(vaca.x - ana.x, vaca.z - ana.z)).toBeLessThan(3);
  });
});
