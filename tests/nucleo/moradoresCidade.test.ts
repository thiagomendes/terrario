import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { cidadeDoMundo, definirEstiloMundo, ESTILO_PADRAO } from '../../src/world/chunk';
import { limparCidades } from '../../src/world/cidade';
import { limparPovoados } from '../../src/world/povoado';
import { definirObrasFeitas, loteDoCanteiro, postoDoPedreiro } from '../../src/world/obras';
import type { Comando } from '../../src/nucleo/protocolo';
import type { Criatura } from '../../src/jogo/criaturas';

/**
 * Spec 014 (T08): o dia da cidade no núcleo. Os moradores aparecem na porta de casa,
 * passeiam entre a praça e a loja de dia e entram em casa à noite; o pedreiro fica no
 * canteiro enquanto tem criança perto e, sem ninguém, vai para casa (e volta quando alguém
 * chega); o cachorro vem morar na casinha da obra 1 quando ela fica pronta.
 */
const SEMENTE = 1337;
beforeAll(() => {
  definirEstiloMundo(obterTema('cidade-grande').mundo);
  limparCidades();
  limparPovoados();
});
afterAll(() => {
  definirObrasFeitas([]);
  definirEstiloMundo(ESTILO_PADRAO);
  limparCidades();
  limparPovoados();
});

function tel(x: number, y: number, z: number): Comando {
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
  };
}

function abrir(extras: Record<string, unknown> = {}): Nucleo {
  const n = criarNucleo({
    semente: SEMENTE,
    modo: 'criativo',
    versaoMundo: 2,
    confiarNoCliente: true,
    depuracao: true,
    dono: 'ana',
    dados: { versao: 1, edicoes: [], jogador: null, hora: 0.45, extras } as never,
  });
  n.conectar('ana', { perfil: { apelido: 'Ana', aparencia: {} } });
  n.passo();
  n.quadros();
  return n;
}

const p = () => cidadeDoMundo(SEMENTE)!;
const moradores = (n: Nucleo) =>
  n.estado.populacao.lista.filter((c) => c.morador?.povoado === 'cidade' && c.morador.n > 0);
const pedreiro = (n: Nucleo) =>
  n.estado.populacao.lista.find((c) => c.morador?.povoado === 'cidade' && c.morador.n === 0);

function rodar(n: Nucleo, segundos: number, onde: [number, number]): void {
  const y = p().h + 1;
  for (let i = 0; i < segundos * 20; i++) {
    if (i % 10 === 0) n.comando('ana', tel(onde[0], y, onde[1]));
    n.passo();
    if (i % 20 === 0) n.quadros();
  }
}
const hora = (n: Nucleo, h: number) => {
  n.comando('ana', { t: 'depurar', d: { f: 'hora', hora: h } } as Comando);
  n.comando('ana', { t: 'depurar', d: { f: 'pausarDia', pausar: true } } as Comando);
};

describe('o dia na cidade', () => {
  it('de dia passeiam, à noite entram em casa, e o pedreiro cuida do canteiro', () => {
    const n = abrir();
    hora(n, 0.45);
    const praca = p().lotes.find((l) => l.uso === 'praca')!;
    const centro: [number, number] = [praca.x0 + 4, praca.z0 - 2];
    rodar(n, 90, centro);
    const vivos = moradores(n);
    expect(vivos.length).toBeGreaterThanOrEqual(4);
    // de dia ninguém fica em casa, e todos andaram (saíram da porta)
    for (const c of vivos) expect(c.morador!.emCasa, `morador ${c.morador!.n}`).toBeFalsy();
    const ped = pedreiro(n)!;
    expect(ped.morador!.folga).toBeUndefined();
    const posto = postoDoPedreiro(p(), 1)!;
    expect(Math.hypot(ped.x - posto[0], ped.z - posto[2])).toBeLessThan(3);

    // à noite: todos em casa; o pedreiro fica (a criança está perto do canteiro)
    hora(n, 0.85);
    rodar(n, 150, centro);
    const emCasa = moradores(n).filter((c) => c.morador!.emCasa);
    expect(emCasa.length).toBeGreaterThanOrEqual(vivos.length - 1);
    expect(pedreiro(n)!.morador!.folga).toBeUndefined();
    const teleportes = moradores(n).reduce((s, c: Criatura) => s + (c.teleportes ?? 0), 0);
    expect(teleportes).toBeLessThanOrEqual(moradores(n).length);

    // a criança vai para o outro lado da praça (longe do canteiro): o pedreiro vai para casa
    const longe: [number, number] = [praca.x0 - 36, praca.z0 - 2];
    rodar(n, 150, longe);
    const ped2 = pedreiro(n)!;
    expect(ped2.morador!.folga).toBe('casa');
    expect(ped2.morador!.emCasa).toBe(true);
    // de manhã a criança volta: ele vem para o canteiro
    hora(n, 0.45);
    rodar(n, 120, centro);
    const ped3 = pedreiro(n)!;
    expect(ped3.morador!.folga).toBeUndefined();
    expect(Math.hypot(ped3.x - posto[0], ped3.z - posto[2])).toBeLessThan(2);
  });

  it('o cachorro mora no quintal da casinha da obra 1 pronta', () => {
    const n = abrir({ obras: { '1': { cheias: [], ajudantes: [['ana', 'Ana']], feita: true } } });
    hora(n, 0.45);
    const l = loteDoCanteiro(p(), 1)!;
    rodar(n, 30, [l.x0 + 4, l.z0 + 4]);
    const cachorros = n.estado.populacao.lista.filter((c) => c.lar === 1);
    expect(cachorros.length).toBe(1);
    const c = cachorros[0];
    expect(c.tipo).toBe('cervo');
    expect(c.x).toBeGreaterThanOrEqual(l.x0);
    expect(c.x).toBeLessThanOrEqual(l.x0 + l.largura);
    expect(c.z).toBeGreaterThanOrEqual(l.z0);
    expect(c.z).toBeLessThanOrEqual(l.z0 + l.profundidade);
    definirObrasFeitas([]);
  });
});
