import { describe, expect, it } from 'vitest';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { encontrarNascimento, alturaTerreno } from '../../src/world/chunk';
import { Bloco } from '../../src/world/blocks';
import { Protecao } from '../../src/world/protecao';
import { sanear } from '../../src/nucleo/saneamento';
import { lugarDoPulo, podeCair, type MundoDoPulo } from '../../src/nucleo/lugarPulo';
import type { Comando, EventoNucleo, Telemetria } from '../../src/nucleo/protocolo';
import { COMBATE_PULO, ESPERA_CHAMAR, ESPERA_PULO } from '../../src/jogo/acharAmigo';

/** Spec 021: pular para perto e chamar, no núcleo (nuvem e local). */
const SEMENTE = 1337;
const p0 = encontrarNascimento(SEMENTE);
const X = Math.floor(p0.x);
const Z = Math.floor(p0.z);
const PASSOS_POR_S = 20;

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

interface Op {
  modo?: 'criativo' | 'sobrevivencia';
  confiar?: boolean;
  depuracao?: boolean;
  /** Onde a Bia está (deslocamento do nascimento). */
  bia?: [number, number];
  biaExtra?: Partial<Telemetria>;
}

function sala(op: Op = {}): Nucleo {
  const n = criarNucleo({
    semente: SEMENTE,
    modo: op.modo ?? 'sobrevivencia',
    versaoMundo: 2,
    confiarNoCliente: op.confiar ?? false,
    depuracao: op.depuracao ?? true,
    dono: 'ana',
  });
  n.conectar('ana', { perfil: { apelido: 'Ana', aparencia: {} } });
  n.conectar('bia', { perfil: { apelido: 'Bia', aparencia: {} } });
  n.conectar('caio', { perfil: { apelido: 'Caio', aparencia: {} } });
  const [bx, bz] = op.bia ?? [30, 10];
  n.comando('ana', tel(X + 0.5, Z + 0.5));
  n.comando('bia', tel(X + bx + 0.5, Z + bz + 0.5, op.biaExtra));
  n.comando('caio', tel(X + 3.5, Z + 0.5));
  n.passo();
  n.quadros();
  return n;
}

function eventos(n: Nucleo, id: string): EventoNucleo[] {
  n.passo();
  return n.quadros().get(id)?.eventos ?? [];
}
const passar = (n: Nucleo, s: number) => {
  for (let i = 0; i < s * PASSOS_POR_S; i++) n.passo();
  n.quadros();
};
const teleporte = (ev: EventoNucleo[]) => ev.find((e) => e.e === 'teleporte');
const recusa = (ev: EventoNucleo[]) => ev.find((e) => e.e === 'recusa' && e.motivo === 'pularPerto');

describe('pularPerto (spec 021)', () => {
  it('leva para o lado do amigo, num lugar de pé, e diz que foi pulo', () => {
    const n = sala();
    n.comando('ana', { t: 'pularPerto', alvo: 'bia' });
    const t = teleporte(eventos(n, 'ana'));
    expect(t).toMatchObject({ e: 'teleporte', pulo: 'bia' });
    if (t?.e !== 'teleporte') throw new Error();
    const bia = n.estado.jogadores.get('bia')!.tel;
    const d = Math.hypot(t.x - bia.x, t.z - bia.z);
    expect(d).toBeGreaterThanOrEqual(1.5);
    expect(d).toBeLessThanOrEqual(8.5);
    expect(Math.abs(t.y! - Math.floor(bia.y))).toBeLessThanOrEqual(1);
    // não leva itens nem cura
    const ana = n.estado.jogadores.get('ana')!;
    expect(ana.inventario.slots.every((s) => s === null)).toBe(true);
  });

  it('a posição nova vale na nuvem (sem depuração): a telemetria lá é aceita', () => {
    const n = sala({ depuracao: false, bia: [60, 20] });
    passar(n, 1);
    n.comando('ana', { t: 'pularPerto', alvo: 'bia' });
    const t = teleporte(eventos(n, 'ana'));
    if (t?.e !== 'teleporte') throw new Error('sem teleporte');
    n.comando('ana', tel(t.x, t.z, { y: t.y! }));
    const ev = eventos(n, 'ana');
    // nada de puxar de volta
    expect(teleporte(ev)).toBeUndefined();
    expect(n.estado.jogadores.get('ana')!.tel.x).toBeCloseTo(t.x);
  });

  it(`intervalo de ${ESPERA_PULO} s entre dois pulos`, () => {
    const n = sala();
    n.comando('ana', { t: 'pularPerto', alvo: 'bia' });
    expect(teleporte(eventos(n, 'ana'))).toBeTruthy();
    n.comando('ana', { t: 'pularPerto', alvo: 'caio' });
    const ev = eventos(n, 'ana');
    expect(teleporte(ev)).toBeUndefined();
    expect(recusa(ev)).toBeTruthy();
    passar(n, ESPERA_PULO);
    n.comando('ana', { t: 'pularPerto', alvo: 'caio' });
    expect(teleporte(eventos(n, 'ana'))).toBeTruthy();
  });

  it('alvo que não está na sala, ou a si mesmo: recusa', () => {
    const n = sala();
    n.comando('ana', { t: 'pularPerto', alvo: 'ninguem' });
    expect(recusa(eventos(n, 'ana'))).toBeTruthy();
    n.comando('ana', { t: 'pularPerto', alvo: 'ana' });
    expect(recusa(eventos(n, 'ana'))).toBeTruthy();
  });

  it('caído não pula', () => {
    const n = sala();
    n.comando('ana', { t: 'depurar', d: { f: 'dano', qtd: 100, causa: 'criatura' } });
    n.passo();
    n.quadros();
    passar(n, COMBATE_PULO + 1);
    n.comando('ana', { t: 'pularPerto', alvo: 'bia' });
    const ev = eventos(n, 'ana');
    expect(teleporte(ev)).toBeUndefined();
    expect(recusa(ev)).toBeTruthy();
  });

  it(`em combate (dano há menos de ${COMBATE_PULO} s) não pula; a fome não conta`, () => {
    const n = sala();
    n.comando('ana', { t: 'depurar', d: { f: 'dano', qtd: 2, causa: 'criatura' } });
    n.passo();
    n.quadros();
    n.comando('ana', { t: 'pularPerto', alvo: 'bia' });
    expect(recusa(eventos(n, 'ana'))).toBeTruthy();
    passar(n, COMBATE_PULO);
    n.comando('ana', { t: 'pularPerto', alvo: 'bia' });
    expect(teleporte(eventos(n, 'ana'))).toBeTruthy();
    // fome
    const m = sala();
    m.comando('ana', { t: 'depurar', d: { f: 'dano', qtd: 1, causa: 'fome' } });
    m.passo();
    m.quadros();
    m.comando('ana', { t: 'pularPerto', alvo: 'bia' });
    expect(teleporte(eventos(m, 'ana'))).toBeTruthy();
    // no criativo o combate não conta
    const c = sala({ modo: 'criativo' });
    c.comando('ana', { t: 'depurar', d: { f: 'dano', qtd: 2, causa: 'criatura' } });
    c.passo();
    c.quadros();
    c.comando('ana', { t: 'pularPerto', alvo: 'bia' });
    expect(teleporte(eventos(c, 'ana'))).toBeTruthy();
  });

  it('sem lugar seguro (amigo voando alto, sem chão perto): recusa', () => {
    const n = sala({ biaExtra: { y: 200, olhos: 201.6, voando: true, noChao: false } });
    n.comando('ana', { t: 'pularPerto', alvo: 'bia' });
    const ev = eventos(n, 'ana');
    expect(teleporte(ev)).toBeUndefined();
    expect(recusa(ev)).toBeTruthy();
  });

  it('paridade: o mesmo pulo no modo local (confiar) e na nuvem', () => {
    const r = [true, false].map((confiar) => {
      const n = sala({ confiar });
      n.comando('ana', { t: 'pularPerto', alvo: 'bia' });
      const a = teleporte(eventos(n, 'ana'));
      n.comando('ana', { t: 'pularPerto', alvo: 'bia' });
      const b = recusa(eventos(n, 'ana'));
      n.comando('bia', { t: 'chamarAmigos' });
      const c = eventos(n, 'ana').filter((e) => e.e === 'chamado');
      return { a, b, c };
    });
    expect(r[0]).toEqual(r[1]);
    expect(r[0].a).toBeTruthy();
  });
});

describe('chamarAmigos (spec 021)', () => {
  it('vai para a sala toda (mesmo longe), menos para quem chamou', () => {
    const n = sala({ bia: [400, 300] });
    n.comando('caio', { t: 'chamarAmigos' });
    n.passo();
    const q = n.quadros();
    expect(q.get('ana')!.eventos).toContainEqual({ e: 'chamado', de: 'caio' });
    expect(q.get('bia')!.eventos).toContainEqual({ e: 'chamado', de: 'caio' });
    expect((q.get('caio')!.eventos ?? []).filter((e) => e.e === 'chamado')).toEqual([]);
  });

  it(`no máximo 1 a cada ${ESPERA_CHAMAR} s por jogador`, () => {
    const n = sala();
    const chamados = () => eventos(n, 'ana').filter((e) => e.e === 'chamado').length;
    n.comando('caio', { t: 'chamarAmigos' });
    expect(chamados()).toBe(1);
    n.comando('caio', { t: 'chamarAmigos' });
    expect(chamados()).toBe(0);
    // outro jogador tem o próprio limite
    n.comando('bia', { t: 'chamarAmigos' });
    expect(chamados()).toBe(1);
    passar(n, ESPERA_CHAMAR);
    n.comando('caio', { t: 'chamarAmigos' });
    expect(chamados()).toBe(1);
  });

  it('saneamento: só o id em texto curto', () => {
    expect(sanear({ t: 'pularPerto', alvo: 'bia' })).toEqual({ t: 'pularPerto', alvo: 'bia' });
    expect(sanear({ t: 'pularPerto', alvo: 7 })).toBeNull();
    expect(sanear({ t: 'pularPerto', alvo: 'x'.repeat(500) })).toBeNull();
    expect(sanear({ t: 'chamarAmigos' })).toEqual({ t: 'chamarAmigos' });
  });
});

describe('lugar do pulo (proteção da 016)', () => {
  /** Chão de pedra em y = 9 (pés em 10); o que o teste puser por cima. */
  function mundo() {
    const blocos = new Map<string, number>();
    const prot = new Map<string, number>();
    const donos = new Map<string, string>();
    const k = (x: number, y: number, z: number) => `${x},${y},${z}`;
    const m: MundoDoPulo = {
      bloco: (x, y, z) => blocos.get(k(x, y, z)) ?? (y <= 9 ? Bloco.PEDRA_RACHADA : Bloco.AR),
      protecao: (x, y, z) => (prot.get(k(x, y, z)) ?? Protecao.LIVRE) as Protecao,
      dono: (x, y, z) => donos.get(k(x, y, z)) ?? null,
    };
    return {
      m,
      bloco: (x: number, y: number, z: number, b: number) => blocos.set(k(x, y, z), b),
      prot: (x: number, y: number, z: number, p: number) => prot.set(k(x, y, z), p),
      dono: (x: number, y: number, z: number, d: string) => donos.set(k(x, y, z), d),
    };
  }
  const alvo = { x: 0.5, y: 10, z: 0.5 };
  const de = { x: 30, z: 0.5 };

  it('no aberto: do lado de quem vem, perto do amigo', () => {
    const { m } = mundo();
    const l = lugarDoPulo(m, 'ana', de, alvo)!;
    expect(l).toEqual([2.5, 10, 0.5]);
  });

  it('não cai na água nem à beira de buraco', () => {
    const w = mundo();
    for (let x = -10; x <= 10; x++)
      for (let z = -10; z <= 10; z++) if (Math.hypot(x, z) >= 1.5 && Math.hypot(x, z) < 4) w.bloco(x, 9, z, Bloco.AGUA);
    const l = lugarDoPulo(w.m, 'ana', de, alvo)!;
    expect(Math.hypot(l[0] - 0.5, l[2] - 0.5)).toBeGreaterThanOrEqual(4);
    // buraco
    const b = mundo();
    for (let y = 3; y <= 9; y++) b.bloco(2, y, 0, Bloco.AR);
    const lb = lugarDoPulo(b.m, 'ana', de, alvo)!;
    expect(podeCair(b.m, 'ana', 3, 10, 0)).toBe(false);
    expect(Math.hypot(lb[0] - 2.5, lb[2] - 0.5)).toBeGreaterThan(1.5);
  });

  it('não cai dentro do que o mundo construiu (casa): vai para fora', () => {
    const w = mundo();
    // casa 9x9 em volta do amigo: telhado em y = 14, paredes protegidas
    for (let x = -4; x <= 4; x++)
      for (let z = -4; z <= 4; z++) {
        w.bloco(x, 14, z, Bloco.TABUAS);
        w.prot(x, 14, z, Protecao.ESTRUTURA);
      }
    const l = lugarDoPulo(w.m, 'ana', de, alvo)!;
    expect(l).not.toBeNull();
    expect(Math.max(Math.abs(Math.floor(l[0])), Math.abs(Math.floor(l[2])))).toBeGreaterThan(4);
  });

  it('não cai no chão de outra pessoa, nem debaixo do que ela construiu', () => {
    const w = mundo();
    for (let x = -3; x <= 3; x++)
      for (let z = -3; z <= 3; z++) w.dono(x, 9, z, 'caio');
    const l = lugarDoPulo(w.m, 'ana', de, alvo)!;
    expect(Math.max(Math.abs(Math.floor(l[0])), Math.abs(Math.floor(l[2])))).toBeGreaterThan(3);
    // o próprio chão vale
    expect(podeCair(w.m, 'caio', 2, 10, 0)).toBe(true);
    // teto de outra pessoa
    const t = mundo();
    t.bloco(2, 13, 0, Bloco.TABUAS);
    t.dono(2, 13, 0, 'caio');
    expect(podeCair(t.m, 'ana', 2, 10, 0)).toBe(false);
    expect(podeCair(t.m, 'caio', 2, 10, 0)).toBe(true);
  });

  it('a lavoura, a obra e a parede do mundo não são lugar de cair', () => {
    for (const p of [Protecao.LAVOURA, Protecao.OBRA, Protecao.ESTRUTURA]) {
      const w = mundo();
      w.prot(2, 10, 0, p);
      expect(podeCair(w.m, 'ana', 2, 10, 0)).toBe(false);
    }
    const w = mundo();
    w.prot(2, 9, 0, Protecao.CHAO);
    w.prot(2, 10, 0, Protecao.PASSAGEM);
    expect(podeCair(w.m, 'ana', 2, 10, 0)).toBe(true);
  });

  it('sem lugar nenhum: null', () => {
    const w = mundo();
    for (let x = -12; x <= 12; x++) for (let z = -12; z <= 12; z++) w.bloco(x, 9, z, Bloco.AGUA);
    expect(lugarDoPulo(w.m, 'ana', de, alvo)).toBeNull();
  });
});
