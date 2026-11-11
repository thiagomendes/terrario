import { describe, expect, it } from 'vitest';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { encontrarNascimento, alturaTerreno } from '../../src/world/chunk';
import { RAIO_ATRACAO, TEMPO_DONO_RECOLHER, criarMundoDeItens } from '../../src/jogo/drops';
import type { Comando, Telemetria } from '../../src/nucleo/protocolo';

/**
 * Dar um item a um amigo, como no Minecraft: jogar no chão (Q, a área "Soltar no chão" do
 * inventário) e o amigo pega. Quem jogou só pega de volta depois de um tempinho.
 */
const SEMENTE = 1337;
const p0 = encontrarNascimento(SEMENTE);
const X = Math.floor(p0.x);
const Z = Math.floor(p0.z);

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

function nucleo(nuvem: boolean, modo: 'criativo' | 'sobrevivencia' = 'sobrevivencia'): Nucleo {
  const n = criarNucleo({
    semente: SEMENTE,
    modo,
    versaoMundo: 2,
    confiarNoCliente: !nuvem,
    depuracao: true,
  });
  n.conectar('ana', { perfil: { apelido: 'Ana', aparencia: {} } });
  n.comando('ana', tel(X + 0.5, Z + 0.5));
  return n;
}
const inv = (n: Nucleo, id: string) => n.estado.jogadores.get(id)!.inventario;
const passos = (n: Nucleo, s: number) => {
  for (let i = 0; i < Math.round(s * 20); i++) n.passo();
};

describe('jogar um item no chão para um amigo', () => {
  it('sai para a frente do boneco; quem jogou só pega de volta depois do tempo', () => {
    const n = nucleo(true);
    inv(n, 'ana').definir(0, { item: 'maca', qtd: 3 });
    // olhando para +x (yaw = π/2)
    n.comando('ana', {
      t: 'soltar',
      itens: [{ item: 'maca', qtd: 1 }],
      x: 0,
      y: 0,
      z: 0,
      jogar: { yaw: Math.PI / 2 },
    });
    expect(inv(n, 'ana').contar('maca')).toBe(2);
    const it = n.estado.mundoItens.itens.find((i) => i.item === 'maca')!;
    expect(it.vx).toBeGreaterThan(2);
    expect(Math.abs(it.vz)).toBeLessThan(0.01);
    // logo depois de jogar, cai na frente e fica no chão (ela está ali do lado)
    passos(n, 0.8);
    const noChao = n.estado.mundoItens.itens.find((i) => i.item === 'maca')!;
    expect(noChao.x).toBeGreaterThan(X + 0.5 + 0.6);
    // Ana anda para cima do item: antes do tempo, nada
    n.comando('ana', tel(noChao.x, noChao.z));
    passos(n, 0.6);
    expect(inv(n, 'ana').contar('maca')).toBe(2);
    // passado o tempo, ela pega de volta
    passos(n, TEMPO_DONO_RECOLHER);
    expect(inv(n, 'ana').contar('maca')).toBe(3);
  });

  it('parado no lugar, quem jogou não puxa de volta (cai fora do raio que puxa)', () => {
    const n = nucleo(true);
    inv(n, 'ana').definir(0, { item: 'maca', qtd: 3 });
    n.comando('ana', {
      t: 'soltar',
      itens: [{ item: 'maca', qtd: 1 }],
      x: 0,
      y: 0,
      z: 0,
      jogar: { yaw: Math.PI / 2 },
    });
    passos(n, TEMPO_DONO_RECOLHER + 2);
    expect(inv(n, 'ana').contar('maca')).toBe(2);
    const it = n.estado.mundoItens.itens.find((i) => i.item === 'maca')!;
    expect(Math.hypot(it.x - (X + 0.5), it.z - (Z + 0.5))).toBeGreaterThan(RAIO_ATRACAO);
  });

  it('na nuvem, Q tira do espaço da mão (não de outro com o mesmo item)', () => {
    const n = nucleo(true);
    inv(n, 'ana').definir(0, { item: 'maca', qtd: 3 });
    inv(n, 'ana').definir(4, { item: 'maca', qtd: 5 });
    n.comando('ana', {
      t: 'soltar',
      itens: [{ item: 'maca', qtd: 1 }],
      x: 0,
      y: 0,
      z: 0,
      jogar: { yaw: 0, slot: 4 },
    });
    expect(inv(n, 'ana').obter(0)).toEqual({ item: 'maca', qtd: 3 });
    expect(inv(n, 'ana').obter(4)).toEqual({ item: 'maca', qtd: 4 });
  });

  it('o amigo pega logo, mesmo com quem jogou mais perto', () => {
    const n = nucleo(true);
    n.conectar('bia', { perfil: { apelido: 'Bia', aparencia: {} } });
    inv(n, 'ana').definir(0, { item: 'picareta_ferro', qtd: 1, dur: 37 });
    n.comando('bia', tel(X + 1.6, Z + 0.5));
    n.comando('ana', {
      t: 'soltar',
      itens: [{ item: 'picareta_ferro', qtd: 1 }],
      x: 0,
      y: 0,
      z: 0,
      jogar: { yaw: Math.PI / 2 },
    });
    expect(inv(n, 'ana').contar('picareta_ferro')).toBe(0);
    passos(n, 1.2);
    // a durabilidade vai junto
    const p = inv(n, 'bia').slots.find((s) => s?.item === 'picareta_ferro');
    expect(p).toEqual({ item: 'picareta_ferro', qtd: 1, dur: 37 });
    expect(inv(n, 'ana').contar('picareta_ferro')).toBe(0);
  });

  it('na nuvem só sai o que o jogador tem (e nada nasce)', () => {
    const n = nucleo(true);
    inv(n, 'ana').definir(0, { item: 'maca', qtd: 2 });
    const antes = n.estado.mundoItens.itens.length;
    n.comando('ana', {
      t: 'soltar',
      itens: [
        { item: 'maca', qtd: 5 },
        { item: 'lingote_ouro', qtd: 10 },
      ],
      x: 0,
      y: 0,
      z: 0,
      jogar: { yaw: 0 },
    });
    const soltos = n.estado.mundoItens.itens.slice(antes);
    expect(soltos.map((i) => [i.item, i.qtd])).toEqual([['maca', 2]]);
    expect(inv(n, 'ana').contar('maca')).toBe(0);
  });

  it('na nuvem, yaw fora do formato é recusado', () => {
    const n = nucleo(true);
    inv(n, 'ana').definir(0, { item: 'maca', qtd: 2 });
    n.comando('ana', {
      t: 'soltar',
      itens: [{ item: 'maca', qtd: 1 }],
      x: 0,
      y: 0,
      z: 0,
      jogar: { yaw: Number.NaN },
    });
    expect(inv(n, 'ana').contar('maca')).toBe(2);
  });

  it('no criativo funciona igual', () => {
    const n = nucleo(true, 'criativo');
    inv(n, 'ana').definir(0, { item: 'maca', qtd: 2 });
    n.comando('ana', {
      t: 'soltar',
      itens: [{ item: 'maca', qtd: 1 }],
      x: 0,
      y: 0,
      z: 0,
      jogar: { yaw: 0 },
    });
    expect(inv(n, 'ana').contar('maca')).toBe(1);
    expect(n.estado.mundoItens.itens.some((i) => i.item === 'maca' && i.de === 'ana')).toBe(true);
  });

  it('no aparelho (o cliente já tirou), o item sai jogado do mesmo jeito', () => {
    const n = nucleo(false);
    n.comando('ana', {
      t: 'soltar',
      itens: [{ item: 'maca', qtd: 1 }],
      x: 0,
      y: 0,
      z: 0,
      jogar: { yaw: 0 },
    });
    const it = n.estado.mundoItens.itens.find((i) => i.item === 'maca')!;
    expect(it.de).toBe('ana');
    expect(it.vz).toBeGreaterThan(2);
  });

  it('o mundo de itens: o atraso vale só para quem jogou', () => {
    const m = criarMundoDeItens((_x, y) => y < 0);
    m.soltar('maca', 1, 0, 0.2, 0, () => 0.5, undefined, { de: 'ana', vx: 0, vy: 0, vz: 0 });
    const perto = { x: 0, y: 0, z: 0 };
    let r: ReturnType<typeof m.atualizar> = [];
    for (let i = 0; i < 20; i++) r.push(...m.atualizar(0.05, [{ ...perto, id: 'ana' }], () => 0));
    expect(r).toEqual([]);
    r = m.atualizar(
      0.05,
      [
        { ...perto, id: 'ana' },
        { ...perto, id: 'bia' },
      ],
      () => 0,
    );
    expect(r).toEqual([{ item: 'maca', qtd: 1, quem: 1 }]);
  });
});
