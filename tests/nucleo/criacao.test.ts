import { describe, expect, it } from 'vitest';
import { criarNucleo, type Nucleo, type OpcoesNucleo } from '../../src/nucleo/nucleo';
import { encontrarNascimento } from '../../src/world/chunk';
import { Bloco } from '../../src/world/blocks';
import { empacotar } from '../../src/world/edicoes';
import {
  AVISO_LIMITE,
  LIMITE_CRIADOS,
  RAIO_CASA,
  SEGUNDOS_OVO,
  comeEsse,
} from '../../src/jogo/criacao';
import { CRIATURAS, type Criatura, type TipoSer } from '../../src/jogo/criaturas';
import type { DadosMundo } from '../../src/jogo/mundos';
import type { Comando, EventoNucleo, Telemetria } from '../../src/nucleo/protocolo';
import type { Slot } from '../../src/jogo/inventario';

/**
 * Spec 013, critério 3: criar bichos no núcleo. Seguir quem segura a comida, dar comida,
 * casa, cerca, salvar e reabrir, mundos antigos, ovo, limite e determinismo. Tudo numa
 * plataforma de pedra no alto (sem relevo nem árvore), com a borda cercada.
 */
const SEMENTE = 1337;
const p0 = encontrarNascimento(SEMENTE);
const X = Math.floor(p0.x);
const Z = Math.floor(p0.z);
const Y = 110;
/** Meia largura da plataforma (blocos). */
const R = 14;

function tel(x: number, z: number, extra: Partial<Telemetria> = {}): Comando {
  return {
    t: 'jogador',
    x,
    y: Y + 1,
    z,
    yaw: 0,
    pitch: 0,
    olhos: Y + 2.62,
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

function lote(n: Nucleo, celulas: [number, number, number, number][], quem = 'local'): void {
  n.comando(quem, {
    t: 'editar',
    id: id(),
    lote: celulas.map(([x, y, z, b]) => ({ x, y, z, v: empacotar(b) })),
  });
}

/** Chão de pedra com cerca na borda (nada cai nem foge da plataforma). */
function plataforma(n: Nucleo): void {
  const c: [number, number, number, number][] = [];
  for (let dx = -R; dx <= R; dx++)
    for (let dz = -R; dz <= R; dz++) {
      c.push([X + dx, Y, Z + dz, Bloco.PEDRA_LISA]);
      if (Math.max(Math.abs(dx), Math.abs(dz)) === R) c.push([X + dx, Y + 1, Z + dz, Bloco.CERCA]);
    }
  lote(n, c);
}

function novo(
  modo: 'criativo' | 'sobrevivencia' = 'sobrevivencia',
  op: Partial<OpcoesNucleo> = {},
) {
  const n = criarNucleo({ semente: SEMENTE, modo, versaoMundo: 2, confiarNoCliente: true, ...op });
  n.conectar('local');
  n.comando('local', tel(X + 0.5, Z + 0.5));
  if (!op.dados) plataforma(n);
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

/** Põe um bicho na plataforma e devolve ele (o último da lista). */
function invocar(n: Nucleo, tipo: TipoSer, dx: number, dz: number): Criatura {
  n.comando('local', {
    t: 'depurar',
    d: { f: 'invocar', tipo, x: X + dx + 0.5, y: Y + 1, z: Z + dz + 0.5 },
  });
  const l = n.estado.populacao.lista;
  return l[l.length - 1];
}

function passos(n: Nucleo, segundos: number, cada?: () => void): void {
  for (let i = 0; i < segundos * 20; i++) {
    n.passo();
    cada?.();
  }
}

function eventos(n: Nucleo, quem = 'local'): EventoNucleo[] {
  return n.quadros().get(quem)?.eventos ?? [];
}

const distJ = (n: Nucleo, c: Criatura, quem = 'local') => {
  const j = n.estado.jogadores.get(quem)!.tel;
  return Math.hypot(c.x - j.x, c.z - j.z);
};
const alimentar = (c: Criatura, slot = 0): Comando => ({ t: 'alimentar', criatura: c.id, slot });
const qtd = (n: Nucleo, slot: number, quem = 'local') =>
  n.estado.jogadores.get(quem)!.inventario.obter(slot)?.qtd ?? 0;

/** Reabre o mundo salvo (como o jogo: JSON de ida e volta). */
function reabrir(n: Nucleo): Nucleo {
  const s = n.salvar();
  const dados: DadosMundo = {
    versao: 1,
    edicoes: JSON.parse(JSON.stringify(s.edicoes)),
    jogador: null,
    hora: s.hora,
    extras: JSON.parse(JSON.stringify(s.extras)),
  };
  return novo('sobrevivencia', { dados });
}

const criados = (n: Nucleo) => n.estado.populacao.lista.filter((c) => c.criado);

describe('comida de cada papel', () => {
  it('cervo come trigo, coelho qualquer semente, raposa frutinhas; os outros nada', () => {
    expect(comeEsse('cervo', 'trigo')).toBe(true);
    expect(comeEsse('cervo', 'semente_trigo')).toBe(false);
    for (const s of ['semente_trigo', 'semente_milho', 'semente_abobora'])
      expect(comeEsse('coelho', s)).toBe(true);
    expect(comeEsse('coelho', 'trigo')).toBe(false);
    expect(comeEsse('raposa', 'frutinhas')).toBe(true);
    for (const t of ['peixe', 'espectro', 'morador'] as TipoSer[])
      for (const i of ['trigo', 'semente_trigo', 'frutinhas']) expect(comeEsse(t, i)).toBe(false);
    expect(comeEsse('cervo', null)).toBe(false);
  });
});

describe('seguir quem segura a comida', () => {
  it('a até 8 blocos, o cervo vem e para a uns 2 blocos; sem a comida, para', () => {
    const n = novo();
    const c = invocar(n, 'cervo', 6, 0);
    dar(n, 0, { item: 'trigo', qtd: 5 });
    passos(n, 6);
    expect(c.estado).toBe('seguir');
    expect(distJ(n, c)).toBeLessThan(3);
    expect(distJ(n, c)).toBeGreaterThan(1.2);
    // anda para longe com o trigo: ele vem atrás
    for (let k = 1; k <= 6; k++) {
      n.comando('local', tel(X + 0.5 - k, Z + 0.5));
      passos(n, 1);
    }
    passos(n, 3);
    expect(distJ(n, c)).toBeLessThan(3.2);
    // soltou o trigo da mão (trocou de slot): para de seguir
    n.comando('local', tel(X + 0.5 - 6, Z + 0.5, { slot: 1 }));
    passos(n, 0.5);
    expect(c.estado).not.toBe('seguir');
  });

  it('sem comida na mão, ou com a comida errada, ou longe demais, não segue', () => {
    const n = novo();
    const a = invocar(n, 'cervo', 6, 0);
    const b = invocar(n, 'coelho', -6, 0);
    const longe = invocar(n, 'cervo', 0, 11);
    dar(n, 0, { item: 'semente_trigo', qtd: 5 });
    passos(n, 4, () => {
      expect(a.estado).not.toBe('seguir');
      expect(longe.estado).not.toBe('seguir');
    });
    // a galinha (coelho) segue a semente
    expect(b.estado).toBe('seguir');
    expect(distJ(n, b)).toBeLessThan(3);
  });

  it('o item da mão vem do inventário do núcleo, não do que o cliente diz', () => {
    const n = novo();
    const c = invocar(n, 'cervo', 6, 0);
    // trigo só no slot 3; a telemetria aponta o slot 0 (vazio)
    dar(n, 3, { item: 'trigo', qtd: 1 });
    passos(n, 3);
    expect(c.estado).not.toBe('seguir');
    n.comando('local', tel(X + 0.5, Z + 0.5, { slot: 3 }));
    passos(n, 1);
    expect(c.estado).toBe('seguir');
  });
});

describe('dar comida', () => {
  it('vira criado, gasta 1 trigo na sobrevivência e avisa (corações)', () => {
    const n = novo();
    const c = invocar(n, 'cervo', 2, 0);
    dar(n, 0, { item: 'trigo', qtd: 5 });
    n.quadros();
    n.comando('local', alimentar(c));
    expect(c.criado).toBe(true);
    expect(c.casa).toEqual([c.x, c.z]);
    expect(qtd(n, 0)).toBe(4);
    const ev = eventos(n).find((e) => e.e === 'alimentou');
    expect(ev).toMatchObject({ e: 'alimentou', id: c.id, tipo: 'cervo', novo: true, meu: true });
    // aparece na vista do cliente
    n.passo();
    const q = n.quadros().get('local')!;
    expect(q.criaturas!.find((v) => v.id === c.id)?.criado).toBe(true);
    // de novo (passado o intervalo de 1 s dos corações): só carinho, sem gastar, e a casa
    // vem para onde ele está
    for (let i = 0; i < 20; i++) n.passo();
    c.x += 1;
    n.comando('local', alimentar(c));
    expect(qtd(n, 0)).toBe(4);
    expect(c.casa![0]).toBeCloseTo(c.x);
    expect(eventos(n).find((e) => e.e === 'alimentou')).toMatchObject({ novo: false });
  });

  it('no criativo não gasta; a galinha come qualquer semente', () => {
    const n = novo('criativo');
    const g = invocar(n, 'coelho', 2, 0);
    dar(n, 0, { item: 'semente_abobora', qtd: 3 });
    n.comando('local', alimentar(g));
    expect(g.criado).toBe(true);
    expect(g.ovo).toBeGreaterThan(0);
    expect(qtd(n, 0)).toBe(3);
  });

  it('recusa longe, sem a comida, com a comida errada, peixe, raposa, morador e desmaiado', () => {
    const n = novo();
    const c = invocar(n, 'cervo', 9, 0);
    dar(n, 0, { item: 'trigo', qtd: 5 });
    dar(n, 1, { item: 'semente_trigo', qtd: 5 });
    n.comando('local', alimentar(c));
    expect(c.criado).toBeFalsy();
    const perto = invocar(n, 'cervo', 2, 0);
    n.comando('local', alimentar(perto, 1));
    n.comando('local', alimentar(perto, 5));
    expect(perto.criado).toBeFalsy();
    const r = invocar(n, 'raposa', 2, 1);
    dar(n, 2, { item: 'frutinhas', qtd: 5 });
    n.comando('local', alimentar(r, 2));
    expect(r.criado).toBeFalsy();
    expect(r.domada).toBe(false);
    const m = invocar(n, 'morador', 1, 2);
    n.comando('local', alimentar(m));
    expect(m.criado).toBeFalsy();
    expect(qtd(n, 0)).toBe(5);
    expect(qtd(n, 1)).toBe(5);
    n.comando('local', { t: 'depurar', d: { f: 'dano', qtd: 100, causa: 'queda' } });
    n.comando('local', alimentar(perto));
    expect(perto.criado).toBeFalsy();
  });

  it(`até ${LIMITE_CRIADOS} criados por mundo; o seguinte é recusado com o aviso`, () => {
    const n = novo('criativo');
    dar(n, 0, { item: 'trigo', qtd: 64 });
    const lista: Criatura[] = [];
    for (let i = 0; i < LIMITE_CRIADOS + 1; i++)
      lista.push(invocar(n, 'cervo', 1 + (i % 4), -3 + Math.floor(i / 4)));
    n.quadros();
    for (const c of lista.slice(0, LIMITE_CRIADOS)) {
      // perto do jogador (o alcance conta)
      c.x = X + 2.5;
      c.z = Z + 0.5;
      n.comando('local', alimentar(c));
    }
    expect(n.estado.populacao.criados).toBe(LIMITE_CRIADOS);
    eventos(n);
    const ultimo = lista[LIMITE_CRIADOS];
    ultimo.x = X + 2.5;
    ultimo.z = Z + 0.5;
    n.comando('local', alimentar(ultimo));
    expect(ultimo.criado).toBeFalsy();
    expect(eventos(n)).toContainEqual({
      e: 'criacaoRecusada',
      motivo: 'limite',
      aviso: AVISO_LIMITE,
    });
    expect(AVISO_LIMITE).toBe('Já tem bicho demais por aqui. Que tal um curral?');
  });
});

describe('o bicho criado', () => {
  it(`passeia a até ${RAIO_CASA} blocos da casa (5 minutos)`, () => {
    const n = novo();
    const c = invocar(n, 'cervo', 2, 0);
    dar(n, 0, { item: 'trigo', qtd: 5 });
    n.comando('local', alimentar(c));
    const [cx, cz] = c.casa!;
    // o jogador vai para o canto e fica parado de mão vazia
    n.comando('local', tel(X - R + 2.5, Z - R + 2.5, { slot: 4 }));
    let maior = 0;
    let andou = 0;
    let ax = c.x;
    let az = c.z;
    passos(n, 300, () => {
      maior = Math.max(maior, Math.hypot(c.x - cx, c.z - cz));
      andou += Math.hypot(c.x - ax, c.z - az);
      ax = c.x;
      az = c.z;
    });
    expect(maior).toBeLessThanOrEqual(RAIO_CASA + 1);
    // não fica parado o tempo todo: passeia
    expect(andou).toBeGreaterThan(10);
  });

  it('não some quando o jogador vai longe (o bicho de sempre some)', () => {
    const n = novo();
    const c = invocar(n, 'cervo', 2, 0);
    const solto = invocar(n, 'cervo', -2, 0);
    dar(n, 0, { item: 'trigo', qtd: 5 });
    n.comando('local', alimentar(c));
    n.comando('local', tel(X + 200.5, Z + 0.5));
    passos(n, 1);
    const l = n.estado.populacao.lista;
    expect(l).toContain(c);
    expect(l).not.toContain(solto);
    // volta: ele está onde ficou, ainda criado
    n.comando('local', tel(X + 0.5, Z + 0.5));
    passos(n, 1);
    expect(Math.hypot(c.x - c.casa![0], c.z - c.casa![1])).toBeLessThan(RAIO_CASA + 1);
  });

  it('levado com a comida, mora onde parou de seguir', () => {
    const n = novo();
    const c = invocar(n, 'cervo', 2, 0);
    dar(n, 0, { item: 'trigo', qtd: 5 });
    n.comando('local', alimentar(c));
    const casa0 = [...c.casa!];
    // leva o bicho 10 blocos para o lado
    for (let k = 1; k <= 10; k++) {
      n.comando('local', tel(X + 0.5, Z + 0.5 + k));
      passos(n, 0.8);
    }
    passos(n, 3);
    expect(c.estado).toBe('seguir');
    n.comando('local', tel(X + 0.5, Z + 10.5, { slot: 4 }));
    passos(n, 0.2);
    expect(c.casa![1]).toBeGreaterThan(casa0[1] + 6);
    expect(Math.hypot(c.casa![0] - c.x, c.casa![1] - c.z)).toBeLessThan(0.5);
  });

  it('a cerca segura: dentro de um cercado de 5×5, fica dentro (mesmo com o trigo do lado de fora)', () => {
    const n = novo();
    // anel de cerca 5×5 (miolo 3×3) a 8 blocos do jogador
    const ox = X + 6;
    const oz = Z - 2;
    const anel: [number, number, number, number][] = [];
    for (let dx = 0; dx < 5; dx++)
      for (let dz = 0; dz < 5; dz++)
        if (dx === 0 || dz === 0 || dx === 4 || dz === 4)
          anel.push([ox + dx, Y + 1, oz + dz, Bloco.CERCA]);
    lote(n, anel);
    const c = invocar(n, 'cervo', 8, 0);
    const g = invocar(n, 'coelho', 7, -1);
    dar(n, 0, { item: 'trigo', qtd: 5 });
    dar(n, 1, { item: 'semente_milho', qtd: 5 });
    n.comando('local', tel(X + 5.5, Z + 0.5));
    n.comando('local', alimentar(c));
    n.comando('local', alimentar(g, 1));
    expect(c.criado && g.criado).toBe(true);
    // do lado de dentro da linha dos postes (o corpo pode encostar na célula da cerca)
    const dentro = (b: Criatura) =>
      b.x > ox + 0.5 && b.x < ox + 4.5 && b.z > oz + 0.5 && b.z < oz + 4.5;
    // de mão vazia, 3 minutos; depois com o trigo e a semente encostados na cerca
    n.comando('local', tel(X + 0.5, Z + 0.5, { slot: 4 }));
    const ver = () =>
      expect(
        dentro(c) && dentro(g),
        `${c.x - ox},${c.z - oz},${c.estado} ${g.x - ox},${g.y},${g.z - oz},${g.estado}`,
      ).toBe(true);
    passos(n, 180, ver);
    for (const s of [0, 1]) {
      n.comando('local', tel(ox - 1.5, oz + 2.5, { slot: s }));
      passos(n, 30, ver);
    }
  });
});

describe('salvar e reabrir', () => {
  it('os criados voltam com tipo, casa, vida e relógio do ovo; ids sem repetir', () => {
    const n = novo();
    const c = invocar(n, 'cervo', 2, 0);
    const g = invocar(n, 'coelho', 2, 2);
    invocar(n, 'cervo', -3, 0); // solto: não é salvo
    dar(n, 0, { item: 'trigo', qtd: 5 });
    dar(n, 1, { item: 'semente_trigo', qtd: 5 });
    n.comando('local', alimentar(c));
    n.comando('local', alimentar(g, 1));
    passos(n, 2);
    const s = n.salvar();
    const salvo = s.extras['criaturas'] as {
      criados: Record<string, unknown>[];
      raposas: unknown[];
    };
    expect(salvo.raposas).toEqual([]);
    expect(salvo.criados).toHaveLength(2);
    expect(salvo.criados[0]).toMatchObject({ tipo: 'cervo', vida: CRIATURAS.cervo.vida });
    expect(salvo.criados[0].casa).toHaveLength(2);
    expect(salvo.criados[0].ovo).toBeUndefined();
    expect(salvo.criados[1]).toMatchObject({ tipo: 'coelho' });
    expect(salvo.criados[1].ovo).toBeGreaterThan(0);
    const m = reabrir(n);
    const de = criados(m);
    expect(de.map((b) => b.tipo).sort()).toEqual(['cervo', 'coelho']);
    const vc = de.find((b) => b.tipo === 'cervo')!;
    expect(vc.casa![0]).toBeCloseTo(c.casa![0], 1);
    expect(vc.casa![1]).toBeCloseTo(c.casa![1], 1);
    expect(de.find((b) => b.tipo === 'coelho')!.ovo).toBeCloseTo(g.ovo!, -1);
    // ids únicos, e os bichos que nascem depois não repetem
    invocar(m, 'cervo', 0, 3);
    const todos = m.estado.populacao.lista.map((b) => b.id);
    expect(new Set(todos).size).toBe(todos.length);
    // ainda é criado depois de reabrir: o limite conta, e a vista também
    expect(m.estado.populacao.criados).toBe(2);
  });

  it('mundo salvo sem criados (ou com lixo) abre, e a raposa domada continua', () => {
    const n = novo();
    const s = n.salvar();
    for (const cri of [
      undefined,
      { raposas: [{ x: X + 1, y: Y + 1, z: Z + 1, vida: 9 }] },
      { raposas: [], criados: 'lixo' },
      {
        raposas: [],
        criados: [null, 3, { tipo: 'espectro', x: 1, y: 2, z: 3 }, { tipo: 'cervo', x: 'a' }],
      },
    ]) {
      const extras = { ...JSON.parse(JSON.stringify(s.extras)) };
      if (cri === undefined) delete extras['criaturas'];
      else extras['criaturas'] = cri;
      const m = novo('sobrevivencia', {
        dados: { versao: 1, edicoes: s.edicoes, jogador: null, hora: s.hora, extras },
      });
      expect(criados(m)).toHaveLength(0);
      if (cri && 'raposas' in cri && cri.raposas.length)
        expect(m.estado.populacao.lista.filter((r) => r.domada)).toHaveLength(1);
      passos(m, 1);
    }
  });
});

describe('ovo', () => {
  it('a galinha criada bota um ovo perto de casa a cada 5 minutos; o relógio é salvo', () => {
    const n = novo();
    const g = invocar(n, 'coelho', 2, 0);
    dar(n, 0, { item: 'semente_trigo', qtd: 5 });
    n.comando('local', alimentar(g));
    const espera = g.ovo!;
    expect(espera).toBeGreaterThanOrEqual(SEGUNDOS_OVO * 0.8);
    expect(espera).toBeLessThanOrEqual(SEGUNDOS_OVO * 1.2);
    // o jogador longe (25 blocos, dentro da simulação) para não pegar o ovo
    n.comando('local', tel(X + 0.5, Z - 13 + 0.5, { slot: 4 }));
    const ovos = () => n.estado.mundoItens.itens.filter((i) => i.item === 'ovo');
    passos(n, espera - 2);
    expect(ovos()).toHaveLength(0);
    passos(n, 3);
    expect(ovos()).toHaveLength(1);
    const o = ovos()[0];
    expect(Math.hypot(o.x - g.casa![0], o.z - g.casa![1])).toBeLessThan(RAIO_CASA + 2);
    expect(g.ovo).toBeGreaterThan(SEGUNDOS_OVO - 2);
    // salva no meio do caminho e reabre: o próximo sai no tempo que faltava
    passos(n, 100);
    const m = reabrir(n);
    m.comando('local', tel(X + 0.5, Z - 13 + 0.5, { slot: 4 }));
    const g2 = criados(m)[0];
    const falta = g2.ovo!;
    expect(falta).toBeGreaterThan(SEGUNDOS_OVO - 103);
    expect(falta).toBeLessThan(SEGUNDOS_OVO - 98);
    const ovos2 = () => m.estado.mundoItens.itens.filter((i) => i.item === 'ovo');
    const antes = ovos2().reduce((s, i) => s + i.qtd, 0);
    passos(m, falta + 1);
    expect(ovos2().reduce((s, i) => s + i.qtd, 0)).toBe(antes + 1);
  });

  it('o cervo criado não bota ovo', () => {
    const n = novo('criativo');
    const c = invocar(n, 'cervo', 2, 0);
    dar(n, 0, { item: 'trigo', qtd: 5 });
    n.comando('local', alimentar(c));
    expect(c.ovo).toBeUndefined();
  });
});

describe('determinismo', () => {
  it('os mesmos comandos dão os mesmos bichos no mesmo lugar', () => {
    const rodar = () => {
      ids = 5000;
      const n = novo();
      const c = invocar(n, 'cervo', 4, 0);
      const g = invocar(n, 'coelho', -4, 0);
      dar(n, 0, { item: 'trigo', qtd: 5 });
      dar(n, 1, { item: 'semente_trigo', qtd: 5 });
      passos(n, 5);
      n.comando('local', alimentar(c));
      n.comando('local', tel(X + 0.5, Z + 0.5, { slot: 1 }));
      passos(n, 5);
      n.comando('local', alimentar(g, 1));
      n.comando('local', tel(X + 0.5, Z + 0.5, { slot: 4 }));
      passos(n, 60);
      return JSON.stringify(n.salvar().extras['criaturas']);
    };
    expect(rodar()).toBe(rodar());
  });
});

describe('criatura da noite mansa (T04)', () => {
  /** Noite, sobrevivência, a criatura da noite a 10 blocos do jogador. */
  function noite(estilo: 'mansa' | 'assusta' | undefined) {
    const n = novo('sobrevivencia', estilo ? { noite: estilo } : {});
    n.comando('local', { t: 'depurar', d: { f: 'hora', hora: 0 } });
    const e = invocar(n, 'espectro', 10, 0);
    n.quadros();
    return { n, e };
  }
  /** O jogador anda devagar até a criatura (e a persegue), juntando os eventos. */
  function chegarPerto(n: Nucleo, e: Criatura, segundos: number): EventoNucleo[] {
    const ev: EventoNucleo[] = [];
    let jx = X + 0.5;
    let jz = Z + 0.5;
    for (let i = 0; i < segundos * 20; i++) {
      const dx = e.x - jx;
      const dz = e.z - jz;
      const d = Math.hypot(dx, dz) || 1;
      if (d > 1) {
        jx += (dx / d) * 0.15;
        jz += (dz / d) * 0.15;
      }
      jx = Math.min(Math.max(jx, X - R + 1.5), X + R - 1.5);
      jz = Math.min(Math.max(jz, Z - R + 1.5), Z + R - 1.5);
      n.comando('local', tel(jx, jz));
      n.passo();
      ev.push(...eventos(n));
    }
    return ev;
  }

  it('mansa: chega curiosa, foge de quem chega perto, pia e nunca machuca', () => {
    const { n, e } = noite('mansa');
    expect(n.estado.noite).toBe('mansa');
    const vida0 = n.estado.jogadores.get('local')!.sobrevivencia.estado.vida;
    const ev = chegarPerto(n, e, 60);
    expect(ev.filter((x) => x.e === 'ataque' || x.e === 'dano')).toEqual([]);
    expect(n.estado.jogadores.get('local')!.sobrevivencia.estado.vida).toBe(vida0);
    expect(ev.some((x) => x.e === 'espantou' && x.tipo === 'espectro')).toBe(true);
    expect(ev.some((x) => x.e === 'criaturaSom' && x.tipo === 'espectro')).toBe(true);
    expect(e.estado).not.toBe('perseguir');
  });

  it('mansa: parado longe, ela chega a uns 7 blocos e fica olhando', () => {
    const { n, e } = noite('mansa');
    passos(n, 20);
    const d = distJ(n, e);
    expect(d).toBeGreaterThan(4);
    expect(d).toBeLessThan(9);
  });

  it('mansa: ainda vai embora ao amanhecer', () => {
    const { n, e } = noite('mansa');
    n.comando('local', { t: 'depurar', d: { f: 'hora', hora: 0.5 } });
    passos(n, 5);
    expect(
      n.estado.populacao.lista,
      `${e.estado} ${e.dissolver} ${e.x - X},${e.y},${e.z - Z} ${n.estado.hora}`,
    ).not.toContain(e);
  });

  it('a raposa domada não vai atrás da coruja mansa', () => {
    const { n, e } = noite('mansa');
    const r = invocar(n, 'raposa', 8, 1);
    r.domada = true;
    passos(n, 20);
    expect(e.vida).toBe(CRIATURAS.espectro.vida);
  });

  it('assusta (padrão): a de sempre persegue e machuca', () => {
    const { n, e } = noite(undefined);
    expect(n.estado.noite).toBe('assusta');
    const ev = chegarPerto(n, e, 20);
    expect(ev.some((x) => x.e === 'ataque')).toBe(true);
  });

  it('sem a opção, vale a noite do estilo do mundo (o servidor só sabe o estilo)', async () => {
    const { definirEstiloMundo, ESTILO_PADRAO } = await import('../../src/world/chunk');
    const { estiloSeguro } = await import('../../src/world/estiloSeguro');
    await import('../../src/temas/todos');
    const { obterTema } = await import('../../src/temas');
    const rancho = obterTema('rancho-alegre').mundo;
    expect(rancho.noite).toBe('mansa');
    expect(estiloSeguro(JSON.parse(JSON.stringify(rancho))).noite).toBe('mansa');
    definirEstiloMundo(estiloSeguro(JSON.parse(JSON.stringify(rancho))));
    try {
      const n = criarNucleo({ semente: SEMENTE, modo: 'sobrevivencia', versaoMundo: 2 });
      expect(n.estado.noite).toBe('mansa');
    } finally {
      definirEstiloMundo(ESTILO_PADRAO);
    }
    expect(
      criarNucleo({ semente: SEMENTE, modo: 'sobrevivencia', versaoMundo: 2 }).estado.noite,
    ).toBe('assusta');
  });
});
