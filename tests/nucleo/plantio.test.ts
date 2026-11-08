import { describe, expect, it } from 'vitest';
import { criarNucleo, type Nucleo, type OpcoesNucleo } from '../../src/nucleo/nucleo';
import { encontrarNascimento } from '../../src/world/chunk';
import { Bloco } from '../../src/world/blocks';
import { empacotar } from '../../src/world/edicoes';
import { idDoBloco } from '../../src/jogo/itens';
import { criarGerador } from '../../src/audio/variacao';
import { dropsDoBloco } from '../../src/jogo/drops';
import {
  SEGUNDOS_POR_ESTAGIO,
  colheita,
  podeArar,
  podePlantar,
  velocidadeCrescimento,
} from '../../src/jogo/plantio';
import type { DadosMundo } from '../../src/jogo/mundos';
import type { Comando, EventoNucleo, Telemetria } from '../../src/nucleo/protocolo';
import type { Slot } from '../../src/jogo/inventario';

/**
 * Spec 013, critério 1: plantio no núcleo. Arar, plantar, crescer (sol, chuva, escuro e
 * luz), colher (madura e verde), suporte da terra, recusas, salvar e reabrir, mundos
 * antigos e determinismo. Tudo numa plataforma no alto (céu aberto, sem árvore nem relevo).
 */
const SEMENTE = 1337;
const p0 = encontrarNascimento(SEMENTE);
const X = Math.floor(p0.x);
const Z = Math.floor(p0.z);
const Y = 110;
/** A terra da lavoura e a célula da planta. */
const F = { x: X + 2, y: Y, z: Z };
const C = { x: X + 2, y: Y + 1, z: Z };

function tel(x: number, y: number, z: number, extra: Partial<Telemetria> = {}): Comando {
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

let ids = 100;
const id = () => ++ids;

function lote(n: Nucleo, quem: string, celulas: [number, number, number, number][]): void {
  n.comando(quem, {
    t: 'editar',
    id: id(),
    lote: celulas.map(([x, y, z, b]) => ({ x, y, z, v: empacotar(b) })),
  });
}

/** Plataforma: pedra embaixo do jogador, grama (com grama alta em cima) na frente. */
function plataforma(n: Nucleo, quem = 'local'): void {
  const c: [number, number, number, number][] = [];
  for (let dx = -1; dx <= 4; dx++)
    for (let dz = -2; dz <= 2; dz++) c.push([X + dx, Y, Z + dz, Bloco.PEDRA_LISA]);
  c.push([F.x, F.y, F.z, Bloco.TERRA_MUSGOSA], [C.x, C.y, C.z, Bloco.GRAMA_ALTA]);
  lote(n, quem, c);
}

function novo(
  modo: 'criativo' | 'sobrevivencia' = 'sobrevivencia',
  op: Partial<OpcoesNucleo> = {},
) {
  const n = criarNucleo({ semente: SEMENTE, modo, versaoMundo: 2, confiarNoCliente: true, ...op });
  n.conectar('local');
  n.comando('local', tel(X + 0.5, Y + 1, Z + 0.5));
  if (!op.dados) plataforma(n);
  // de dia, céu limpo, relógio parado
  n.comando('local', { t: 'depurar', d: { f: 'hora', hora: 0.5 } });
  n.comando('local', { t: 'depurar', d: { f: 'pausarDia', pausar: true } });
  n.comando('local', { t: 'depurar', d: { f: 'clima', tipo: 'limpo' } });
  n.quadros();
  return n;
}

function dar(n: Nucleo, slot: number, p: Slot, quem = 'local'): void {
  const antes = n.estado.jogadores.get(quem)!.inventario.obter(slot);
  n.comando(quem, {
    t: 'transacao',
    id: id(),
    mudancas: [{ onde: 'inv', i: slot, antes, depois: p }],
  });
}

const bloco = (n: Nucleo, p: { x: number; y: number; z: number }) =>
  n.estado.mundo.bloco(p.x, p.y, p.z);

function eventos(n: Nucleo, quem = 'local'): EventoNucleo[] {
  return n.quadros().get(quem)?.eventos ?? [];
}

const arar = (n: Nucleo, slot = 0, alvo = F): Comando => ({ t: 'arar', id: id(), ...alvo, slot });
const plantar = (n: Nucleo, slot = 1, b: number = Bloco.TRIGO_0, alvo = C): Comando => ({
  t: 'colocar',
  id: id(),
  ...alvo,
  bloco: b,
  meta: 0,
  slot,
});

/** Arado e plantado com trigo (enxada no slot 0, sementes no 1). */
function lavoura(modo: 'criativo' | 'sobrevivencia' = 'sobrevivencia') {
  const n = novo(modo);
  dar(n, 0, { item: 'enxada_madeira', qtd: 1, dur: 60 });
  dar(n, 1, { item: 'semente_trigo', qtd: 5 });
  n.comando('local', arar(n));
  n.comando('local', plantar(n));
  expect(bloco(n, C)).toBe(Bloco.TRIGO_0);
  n.quadros();
  return n;
}

const crescer = (n: Nucleo, segundos: number) =>
  n.comando('local', { t: 'depurar', d: { f: 'crescer', segundos } });

/** Itens no chão somados por item. */
function noChao(n: Nucleo): Record<string, number> {
  const s: Record<string, number> = {};
  for (const i of n.estado.mundoItens.itens) s[i.item] = (s[i.item] ?? 0) + i.qtd;
  return s;
}

describe('regras puras do plantio', () => {
  it('ara grama e terra com ar ou planta baixa em cima; nada mais', () => {
    expect(podeArar(Bloco.TERRA_MUSGOSA, Bloco.AR)).toBe(true);
    expect(podeArar(Bloco.TERRA, Bloco.GRAMA_ALTA)).toBe(true);
    expect(podeArar(Bloco.TERRA, Bloco.FLOR)).toBe(true);
    expect(podeArar(Bloco.PEDRA_RACHADA, Bloco.AR)).toBe(false);
    expect(podeArar(Bloco.AREIA_DESERTO, Bloco.AR)).toBe(false);
    expect(podeArar(Bloco.TERRA, Bloco.TABUAS)).toBe(false);
    expect(podeArar(Bloco.TERRA, Bloco.TRIGO_0)).toBe(false);
    expect(podeArar(Bloco.TERRA_ARADA, Bloco.AR)).toBe(false);
  });

  it('planta só em cima da terra arada, em lugar livre', () => {
    expect(podePlantar(Bloco.TERRA_ARADA, Bloco.AR)).toBe(true);
    expect(podePlantar(Bloco.TERRA_MUSGOSA, Bloco.AR)).toBe(false);
    expect(podePlantar(Bloco.TERRA_ARADA, Bloco.MILHO_1)).toBe(false);
  });

  it('velocidade: sol 1, chuva 1,5, noite ou escuro 0,5, luz 9 como dia', () => {
    const luz = (l: number) => () => l;
    const v = (noite: number, ceuAberto: boolean, l: number, chuva = false) =>
      velocidadeCrescimento({ noite, ceuAberto, luz: luz(l), chuva });
    expect(v(0, true, 0)).toBe(1);
    expect(v(0, true, 0, true)).toBe(1.5);
    expect(v(1, true, 0)).toBe(0.5);
    expect(v(0, false, 0)).toBe(0.5);
    expect(v(0, false, 0, true)).toBe(0.5);
    expect(v(1, true, 9)).toBe(1);
    expect(v(0, false, 12)).toBe(1);
    expect(v(1, false, 8)).toBe(0.5);
  });

  it('colheita: madura dá produto e 1 a 2 sementes; verde devolve a semente', () => {
    const rng = criarGerador(5);
    for (let i = 0; i < 50; i++) {
      const [t, s] = colheita(Bloco.TRIGO_3, rng);
      expect(t.item).toBe('trigo');
      expect(t.qtd).toBeGreaterThanOrEqual(1);
      expect(t.qtd).toBeLessThanOrEqual(2);
      expect(s.item).toBe('semente_trigo');
      expect([1, 2]).toContain(s.qtd);
      const [m] = colheita(Bloco.MILHO_3, rng);
      expect(m.qtd).toBeGreaterThanOrEqual(1);
      expect(m.qtd).toBeLessThanOrEqual(3);
    }
    expect(colheita(Bloco.ABOBOREIRA_3, rng)[0]).toEqual({
      item: idDoBloco(Bloco.ABOBORA),
      qtd: 1,
    });
    expect(colheita(Bloco.MILHO_1, rng)).toEqual([{ item: 'semente_milho', qtd: 1 }]);
    expect(colheita(Bloco.TABUAS, rng)).toEqual([]);
  });
});

describe('plantio no núcleo', () => {
  it('a enxada ara a grama, tira a grama alta de cima e gasta', () => {
    const n = novo();
    dar(n, 0, { item: 'enxada_madeira', qtd: 1, dur: 60 });
    n.quadros();
    n.comando('local', arar(n));
    expect(bloco(n, F)).toBe(Bloco.TERRA_ARADA);
    expect(bloco(n, C)).toBe(Bloco.AR);
    expect(n.estado.jogadores.get('local')!.inventario.obter(0)).toEqual({
      item: 'enxada_madeira',
      qtd: 1,
      dur: 59,
    });
    const ev = eventos(n);
    expect(ev).toContainEqual({ e: 'arou', ...F, meu: true });
  });

  it('a enxada que acaba quebra (e avisa)', () => {
    const n = novo();
    dar(n, 0, { item: 'enxada_pedra', qtd: 1, dur: 1 });
    n.quadros();
    n.comando('local', arar(n));
    expect(n.estado.jogadores.get('local')!.inventario.obter(0)).toBeNull();
    expect(eventos(n).some((e) => e.e === 'ferramentaQuebrou')).toBe(true);
  });

  it('recusa arar sem enxada, na pedra, com bloco em cima e longe; a tela é corrigida', () => {
    const n = novo();
    dar(n, 0, { item: 'picareta_madeira', qtd: 1, dur: 60 });
    dar(n, 1, { item: 'enxada_madeira', qtd: 1, dur: 60 });
    n.quadros();
    const casos: Comando[] = [
      arar(n, 0),
      arar(n, 1, { x: X, y: Y, z: Z + 1 }),
      arar(n, 1, { x: X + 60, y: Y, z: Z }),
    ];
    for (const c of casos) {
      n.comando('local', c);
      const q = n.quadros().get('local')!;
      expect(q.eventos).toContainEqual({
        e: 'recusa',
        comando: (c as { id: number }).id,
        motivo: 'arar',
      });
      const k = c as { x: number; y: number; z: number };
      expect(q.blocos?.some((b) => b.x === k.x && b.y === k.y && b.z === k.z)).toBe(true);
    }
    lote(n, 'local', [[C.x, C.y, C.z, Bloco.TABUAS]]);
    n.comando('local', arar(n, 1));
    expect(bloco(n, F)).toBe(Bloco.TERRA_MUSGOSA);
    expect(bloco(n, C)).toBe(Bloco.TABUAS);
  });

  it('a semente vai na terra arada e sai do inventário', () => {
    const n = novo();
    dar(n, 0, { item: 'enxada_madeira', qtd: 1, dur: 60 });
    dar(n, 1, { item: 'semente_trigo', qtd: 5 });
    n.comando('local', arar(n));
    n.quadros();
    n.comando('local', plantar(n));
    expect(bloco(n, C)).toBe(Bloco.TRIGO_0);
    expect(n.estado.jogadores.get('local')!.inventario.obter(1)?.qtd).toBe(4);
    const ev = eventos(n);
    expect(ev).toContainEqual({ e: 'plantou', ...C, bloco: Bloco.TRIGO_0 });
    expect(ev.some((e) => e.e === 'colocacao' && e.meu)).toBe(true);
    expect(n.estado.lavoura.has(`${C.x},${C.y},${C.z}`)).toBe(true);
  });

  it('semente fora da terra arada é recusada com o motivo da semente', () => {
    const n = novo();
    dar(n, 1, { item: 'semente_milho', qtd: 5 });
    n.quadros();
    // em cima da grama, sem arar
    lote(n, 'local', [[C.x, C.y, C.z, Bloco.AR]]);
    n.quadros();
    const c = plantar(n, 1, Bloco.MILHO_0);
    n.comando('local', c);
    expect(bloco(n, C)).toBe(Bloco.AR);
    const q = n.quadros().get('local')!;
    expect(q.eventos).toContainEqual({
      e: 'recusa',
      comando: (c as { id: number }).id,
      motivo: 'semente',
    });
    expect(n.estado.jogadores.get('local')!.inventario.obter(1)?.qtd).toBe(5);
    // a semente de milho não planta o trigo (o item tem que ser o daquele bloco)
    const n2 = lavoura();
    n2.comando('local', { t: 'quebrar', id: id(), ...C, slot: 0 });
    n2.comando('local', plantar(n2, 1, Bloco.MILHO_0));
    expect(bloco(n2, C)).toBe(Bloco.AR);
  });

  it('colocar bloco em cima da lavoura é recusado: a planta fica', () => {
    const n = lavoura();
    dar(n, 2, { item: idDoBloco(Bloco.TABUAS), qtd: 4 });
    dar(n, 3, { item: 'semente_trigo', qtd: 4 });
    n.quadros();
    n.comando('local', plantar(n, 2, Bloco.TABUAS));
    expect(bloco(n, C)).toBe(Bloco.TRIGO_0);
    n.comando('local', plantar(n, 3, Bloco.TRIGO_0));
    expect(n.estado.jogadores.get('local')!.inventario.obter(3)?.qtd).toBe(4);
    const q = n.quadros().get('local')!;
    expect(q.eventos?.filter((e) => e.e === 'recusa')).toHaveLength(2);
    // no criativo também
    const k = lavoura('criativo');
    k.comando('local', plantar(k, 2, Bloco.PEDRA_LISA));
    expect(bloco(k, C)).toBe(Bloco.TRIGO_0);
  });

  it('cresce em 4 estágios ao sol, cerca de 2 minutos cada, e avisa quando amadurece', () => {
    const n = lavoura();
    const ev: EventoNucleo[] = [];
    const passos = (s: number) => {
      for (let i = 0; i < s * 20; i++) {
        n.passo();
        ev.push(...eventos(n));
      }
    };
    passos(SEGUNDOS_POR_ESTAGIO - 2);
    expect(bloco(n, C)).toBe(Bloco.TRIGO_0);
    passos(3);
    expect(bloco(n, C)).toBe(Bloco.TRIGO_1);
    // o resto anda pela depuração (mesma conta, sem esperar)
    crescer(n, SEGUNDOS_POR_ESTAGIO);
    expect(bloco(n, C)).toBe(Bloco.TRIGO_2);
    expect(ev.some((e) => e.e === 'amadureceu')).toBe(false);
    crescer(n, SEGUNDOS_POR_ESTAGIO);
    expect(bloco(n, C)).toBe(Bloco.TRIGO_3);
    expect(eventos(n)).toContainEqual({ e: 'amadureceu', ...C, bloco: Bloco.TRIGO_3 });
    // madura não cresce mais e sai da lista
    crescer(n, 1000);
    expect(bloco(n, C)).toBe(Bloco.TRIGO_3);
    expect(n.estado.lavoura.size).toBe(0);
  });

  it('chuva acelera, noite e escuro atrasam, tocha perto faz crescer como de dia', () => {
    const k = `${C.x},${C.y},${C.z}`;
    // chuva: 1,5×
    const chuva = lavoura();
    chuva.comando('local', { t: 'depurar', d: { f: 'clima', tipo: 'chuva' } });
    crescer(chuva, 100);
    expect(bloco(chuva, C)).toBe(Bloco.TRIGO_1);
    expect(chuva.estado.lavoura.get(k)!.p).toBeCloseTo(30, 5);
    // noite: metade
    const noite = lavoura();
    noite.comando('local', { t: 'depurar', d: { f: 'hora', hora: 0 } });
    crescer(noite, 200);
    expect(bloco(noite, C)).toBe(Bloco.TRIGO_0);
    crescer(noite, 50);
    expect(bloco(noite, C)).toBe(Bloco.TRIGO_1);
    // escuro (teto de pedra) de dia: metade; com tocha ao lado: como de dia
    const escuro = lavoura();
    lote(escuro, 'local', [[C.x, C.y + 2, C.z, Bloco.PEDRA_LISA]]);
    crescer(escuro, 200);
    expect(bloco(escuro, C)).toBe(Bloco.TRIGO_0);
    const tocha = lavoura();
    lote(tocha, 'local', [
      [C.x, C.y + 2, C.z, Bloco.PEDRA_LISA],
      [C.x + 1, C.y, C.z, Bloco.TOCHA],
    ]);
    crescer(tocha, 121);
    expect(bloco(tocha, C)).toBe(Bloco.TRIGO_1);
    // chuva com teto não molha: continua a metade
    const coberto = lavoura();
    lote(coberto, 'local', [[C.x, C.y + 2, C.z, Bloco.PEDRA_LISA]]);
    coberto.comando('local', { t: 'depurar', d: { f: 'clima', tipo: 'chuva' } });
    crescer(coberto, 200);
    expect(bloco(coberto, C)).toBe(Bloco.TRIGO_0);
  });

  it('colher madura solta o produto e sementes; verde devolve a semente', () => {
    const n = lavoura();
    crescer(n, SEGUNDOS_POR_ESTAGIO * 3);
    expect(bloco(n, C)).toBe(Bloco.TRIGO_3);
    n.quadros();
    n.comando('local', { t: 'quebrar', id: id(), ...C, slot: 1 });
    expect(bloco(n, C)).toBe(Bloco.AR);
    expect(bloco(n, F)).toBe(Bloco.TERRA_ARADA);
    const chao = noChao(n);
    expect(chao['trigo']).toBeGreaterThanOrEqual(1);
    expect(chao['trigo']).toBeLessThanOrEqual(2);
    expect(chao['semente_trigo']).toBeGreaterThanOrEqual(1);
    expect(chao['semente_trigo']).toBeLessThanOrEqual(2);
    expect(chao[idDoBloco(Bloco.TRIGO_3)]).toBeUndefined();
    expect(eventos(n)).toContainEqual({
      e: 'colheu',
      ...C,
      bloco: Bloco.TRIGO_3,
      madura: true,
      meu: true,
    });

    const verde = lavoura();
    crescer(verde, SEGUNDOS_POR_ESTAGIO);
    verde.comando('local', { t: 'quebrar', id: id(), ...C, slot: 1 });
    expect(noChao(verde)).toEqual({ semente_trigo: 1 });
    expect(eventos(verde).find((e) => e.e === 'colheu')).toMatchObject({ madura: false });
  });

  it('a abóbora madura dá uma abóbora de verdade (o bloco)', () => {
    const n = novo();
    dar(n, 0, { item: 'enxada_madeira', qtd: 1, dur: 60 });
    dar(n, 1, { item: 'semente_abobora', qtd: 1 });
    n.comando('local', arar(n));
    n.comando('local', plantar(n, 1, Bloco.ABOBOREIRA_0));
    crescer(n, SEGUNDOS_POR_ESTAGIO * 3);
    expect(bloco(n, C)).toBe(Bloco.ABOBOREIRA_3);
    n.comando('local', { t: 'quebrar', id: id(), ...C, slot: 1 });
    expect(noChao(n)[idDoBloco(Bloco.ABOBORA)]).toBe(1);
  });

  it('quebrar a terra arada solta a planta e a semente (nada flutua)', () => {
    const n = lavoura();
    n.quadros();
    n.comando('local', { t: 'quebrar', id: id(), ...F, slot: 1 });
    expect(bloco(n, F)).toBe(Bloco.AR);
    expect(bloco(n, C)).toBe(Bloco.AR);
    const chao = noChao(n);
    expect(chao['semente_trigo']).toBe(1);
    // a terra arada vira terra comum no chão (o estágio da lavoura não vira item)
    expect(chao[idDoBloco(Bloco.TERRA)]).toBe(1);
    expect(n.estado.lavoura.size).toBe(0);
    const q = n.quadros().get('local')!;
    expect(q.blocos).toContainEqual({ ...C, v: Bloco.AR });
    // trocar a terra por outro bloco (criativo) também solta a planta
    const k = lavoura('criativo');
    lote(k, 'local', [[F.x, F.y, F.z, Bloco.PEDRA_LISA]]);
    expect(bloco(k, C)).toBe(Bloco.AR);
  });

  it('salva o progresso e reabre do mesmo ponto', () => {
    const n = lavoura();
    crescer(n, 150);
    expect(bloco(n, C)).toBe(Bloco.TRIGO_1);
    const s = n.salvar();
    expect(s.extras['lavoura']).toEqual({ [`${C.x},${C.y},${C.z}`]: 30 });
    const dados: DadosMundo = {
      versao: 1,
      edicoes: JSON.parse(JSON.stringify(s.edicoes)),
      jogador: null,
      hora: s.hora,
      extras: JSON.parse(JSON.stringify(s.extras)),
    };
    const m = novo('sobrevivencia', { dados });
    expect(bloco(m, C)).toBe(Bloco.TRIGO_1);
    crescer(m, 89);
    expect(bloco(m, C)).toBe(Bloco.TRIGO_1);
    crescer(m, 2);
    expect(bloco(m, C)).toBe(Bloco.TRIGO_2);
  });

  it('mundo salvo sem extras.lavoura (ou com lixo) abre e a planta cresce do zero', () => {
    const n = lavoura();
    const s = n.salvar();
    for (const lixo of [undefined, 'lixo', [1, 2], { [`${C.x},${C.y},${C.z}`]: 'abc' }, null]) {
      const extras = { ...JSON.parse(JSON.stringify(s.extras)) };
      if (lixo === undefined) delete extras['lavoura'];
      else extras['lavoura'] = lixo;
      const m = novo('sobrevivencia', {
        dados: { versao: 1, edicoes: s.edicoes, jogador: null, hora: s.hora, extras },
      });
      expect(m.estado.lavoura.get(`${C.x},${C.y},${C.z}`)?.p).toBe(0);
      crescer(m, SEGUNDOS_POR_ESTAGIO);
      expect(bloco(m, C)).toBe(Bloco.TRIGO_1);
    }
  });

  it('determinístico: os mesmos comandos dão o mesmo mundo e a mesma colheita', () => {
    const rodar = () => {
      const n = lavoura();
      crescer(n, 400);
      n.comando('local', { t: 'quebrar', id: id(), ...C, slot: 1 });
      for (let i = 0; i < 40; i++) n.passo();
      const s = n.salvar();
      return { ed: s.edicoes, lav: s.extras['lavoura'], chao: noChao(n) };
    };
    expect(rodar()).toEqual(rodar());
  });

  it('a grama alta às vezes solta semente, sem mudar os sorteios de sempre', () => {
    const n = novo();
    // 30 de grama alta em cima da plataforma (6 x 5)
    const celulas: [number, number, number, number][] = [];
    for (let dx = -1; dx <= 4; dx++)
      for (let dz = -2; dz <= 2; dz++) celulas.push([X + dx, Y + 1, Z + dz, Bloco.GRAMA_ALTA]);
    lote(n, 'local', celulas);
    for (const [x, y, z] of celulas)
      n.comando('local', { t: 'quebrar', id: id(), x, y, z, slot: 5 });
    const chao = noChao(n);
    // as fibras são exatamente as que os drops de sempre dariam (o gerador 911 sozinho):
    // cada fibra nova gasta 2 números no arremesso; perto de outra, junta sem gastar
    const rng = criarGerador(911);
    const fibras: [number, number][] = [];
    let total = 0;
    for (const [x, , z] of celulas)
      for (const d of dropsDoBloco(Bloco.GRAMA_ALTA, rng)) {
        total += d.qtd;
        if (fibras.some(([fx, fz]) => Math.hypot(fx - x, fz - z) < 1.5)) continue;
        fibras.push([x, z]);
        rng();
        rng();
      }
    expect(chao['fibra'] ?? 0).toBe(total);
    expect(chao['semente_trigo'] ?? 0).toBeGreaterThan(0);
    expect(chao['semente_trigo']).toBeLessThan(15);
  });
});
