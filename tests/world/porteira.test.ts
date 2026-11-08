import { describe, expect, it } from 'vitest';
import { Bloco, obterBloco } from '../../src/world/blocks';
import { caixasDoBloco, cercaConecta, temFormaParcial } from '../../src/world/formas';
import { abreEFecha, alternado } from '../../src/world/portas';
import { criarMundoSolido } from '../../src/world/solido';
import { criarEdicoes } from '../../src/world/edicoes';
import {
  ALTURA,
  TAM_X,
  TAM_Z,
  indice,
  encontrarNascimento,
  alturaTerreno,
} from '../../src/world/chunk';
import { colideCorpo, criarJogador, passoFisica } from '../../src/player/fisica';
import { novaCriatura, passoCriatura, type Criatura, type Mundo } from '../../src/jogo/criaturas';
import { criarGerador } from '../../src/audio/variacao';
import { dropsDoBloco } from '../../src/jogo/drops';
import { encontrarReceita, type Grade } from '../../src/jogo/receitas';
import { registrarCatalogo } from '../../src/jogo/catalogo';
import { idDoBloco, obterItem } from '../../src/jogo/itens';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { sanear } from '../../src/nucleo/saneamento';
import type { Comando } from '../../src/nucleo/protocolo';
import { TROCAS } from '../../src/jogo/trocas';

registrarCatalogo();

/** Mundo plano: pedra até y = 9, ar em cima. */
function chao(): Uint8Array {
  const c = new Uint8Array(TAM_X * TAM_Z * ALTURA);
  for (let x = 0; x < TAM_X; x++)
    for (let z = 0; z < TAM_Z; z++)
      for (let y = 0; y < 10; y++) c[indice(x, y, z)] = Bloco.PEDRA_LISA;
  return c;
}

/** Cerca em z = 5 de x = -8 a 14, com a porteira em x = 3. */
function curral(porteira: number) {
  const e = criarEdicoes();
  for (let x = -8; x <= 14; x++) e.definir(x, 10, 5, x === 3 ? porteira : Bloco.CERCA);
  return criarMundoSolido(1, chao, e);
}

describe('porteira: forma e colisão', () => {
  it('ids acrescentados no fim; só a fechada vira item', () => {
    expect(Bloco.PORTEIRA).toBe(82);
    expect(Bloco.PORTEIRA_ABERTA).toBe(83);
    expect(obterBloco(Bloco.PORTEIRA)?.semItem).toBeFalsy();
    expect(obterBloco(Bloco.PORTEIRA_ABERTA)?.semItem).toBe(true);
    expect(obterItem(idDoBloco(Bloco.PORTEIRA))).toBeDefined();
    expect(obterBloco(Bloco.PORTEIRA)?.tiles.lado).toBe(obterBloco(Bloco.CERCA)?.tiles.lado);
  });

  it('é uma porteira de um bloco, não um cubo; aberta gira na dobradiça', () => {
    expect(temFormaParcial(Bloco.PORTEIRA)).toBe(true);
    const f = caixasDoBloco(Bloco.PORTEIRA, 0)!;
    const a = caixasDoBloco(Bloco.PORTEIRA_ABERTA, 0)!;
    expect(f.length).toBeGreaterThanOrEqual(8);
    for (const c of [...f, ...a]) {
      expect(c[4]).toBeLessThanOrEqual(1);
      for (const v of c) expect(v).toBeGreaterThanOrEqual(0);
      for (const v of [c[0], c[2], c[3], c[5]]) expect(v).toBeLessThanOrEqual(1);
    }
    // fechada atravessa a célula em x, fina em z; aberta fica encostada no lado x = 0
    expect(Math.min(...f.map((c) => c[0]))).toBe(0);
    expect(Math.max(...f.map((c) => c[3]))).toBe(1);
    expect(Math.max(...f.map((c) => c[5])) - Math.min(...f.map((c) => c[2]))).toBeLessThan(0.2);
    expect(Math.max(...a.map((c) => c[3]))).toBeLessThan(0.2);
    expect(Math.max(...a.map((c) => c[5])) - Math.min(...a.map((c) => c[2]))).toBeCloseTo(1, 5);
    // o metadado gira (frente em +x: corre em z)
    const girada = caixasDoBloco(Bloco.PORTEIRA, 1)!;
    expect(
      Math.max(...girada.map((c) => c[3])) - Math.min(...girada.map((c) => c[0])),
    ).toBeLessThan(0.2);
  });

  it('a cerca liga na porteira, aberta ou fechada', () => {
    expect(cercaConecta(Bloco.PORTEIRA)).toBe(true);
    expect(cercaConecta(Bloco.PORTEIRA_ABERTA)).toBe(true);
  });

  it('fechada segura como a cerca (1,5 de altura); aberta deixa passar', () => {
    const fechado = curral(Bloco.PORTEIRA);
    expect(fechado(3, 10, 5)).toBe(true);
    expect(fechado.caixas!(3, 10, 5)).toEqual([[0, 0, 6 / 16, 1, 1.5, 10 / 16]]);
    // em pé na frente da porteira, no meio da célula: bate (corpo e acima do topo de 1)
    expect(colideCorpo(fechado, 3.5, 10, 5.5, 0.3, 1.8)).toBe(true);
    expect(colideCorpo(fechado, 3.5, 11.2, 5.5, 0.3, 1.8)).toBe(true);
    const aberto = curral(Bloco.PORTEIRA_ABERTA);
    expect(aberto(3, 10, 5)).toBe(false);
    expect(colideCorpo(aberto, 3.5, 10, 5.5, 0.3, 1.8)).toBe(false);
  });

  it('o jogador não passa pela fechada, nem pulando; pela aberta passa', () => {
    for (const [porteira, passa] of [
      [Bloco.PORTEIRA, false],
      [Bloco.PORTEIRA_ABERTA, true],
    ] as const) {
      const s = curral(porteira);
      const j = criarJogador(3.5, 10, 3.5);
      for (let i = 0; i < 240; i++)
        passoFisica(
          j,
          { frente: 1, direita: 0, pular: i % 20 === 0, correr: false, yaw: 0 },
          1 / 60,
          s,
        );
      expect(j.z > 6, `porteira ${porteira}`).toBe(passa);
    }
  });
});

describe('porteira: os bichos', () => {
  function mundo(porteira: number): Mundo {
    return {
      solido: curral(porteira),
      agua: () => false,
      luzBloco: () => 0,
      ceuAberto: () => false,
    };
  }
  const longe = { x: 200, y: 10, z: 200, vivo: true, criativo: false };

  function andar(c: Criatura, m: Mundo, segundos: number) {
    const rng = criarGerador(3);
    let maxZ = c.z;
    for (let i = 0; i < segundos * 30; i++) {
      c.estado = 'vagar';
      c.tempoEstado = 1000;
      c.alvoX = 3.5;
      c.alvoZ = 9.5;
      passoCriatura(c, 1 / 30, m, longe, rng, [], 0);
      maxZ = Math.max(maxZ, c.z);
    }
    return maxZ;
  }

  it.each(['cervo', 'coelho', 'raposa'] as const)(
    '%s não passa pela fechada e passa pela aberta',
    (tipo) => {
      const fechada = mundo(Bloco.PORTEIRA);
      const c = novaCriatura(1, tipo, 3.5, 10, 2.5);
      c.noChao = true;
      expect(andar(c, fechada, 20)).toBeLessThan(5.4);
      // ninguém abre a porteira andando nela
      expect(fechada.solido(3, 10, 5)).toBe(true);
      const c2 = novaCriatura(2, tipo, 3.5, 10, 2.5);
      c2.noChao = true;
      expect(andar(c2, mundo(Bloco.PORTEIRA_ABERTA), 20)).toBeGreaterThan(6);
    },
  );
});

describe('porteira: itens', () => {
  it('a aberta quebrada solta a porteira (fechada)', () => {
    const rng = criarGerador(1);
    expect(dropsDoBloco(Bloco.PORTEIRA_ABERTA, rng)).toEqual([
      { item: idDoBloco(Bloco.PORTEIRA), qtd: 1 },
    ]);
    expect(dropsDoBloco(Bloco.PORTEIRA, rng)).toEqual([
      { item: idDoBloco(Bloco.PORTEIRA), qtd: 1 },
    ]);
  });

  it('receita na mesa: gravetos nas pontas e tábuas no meio dão uma porteira', () => {
    const T = { item: idDoBloco(Bloco.TABUAS), qtd: 1 };
    const G = { item: 'graveto', qtd: 1 };
    const grade: Grade = [G, T, G, G, T, G, null, null, null];
    const r = encontrarReceita(grade, 3);
    expect(r?.id).toBe('porteira');
    expect(r?.resultado).toEqual({ item: idDoBloco(Bloco.PORTEIRA), qtd: 1 });
    // a cerca continua sendo a cerca
    expect(encontrarReceita([T, G, T, T, G, T, null, null, null], 3)?.id).toBe('cerca');
  });

  it('o construtor troca tábuas por porteira', () => {
    const t = TROCAS.construtor.find((x) => x.id === 'porteira');
    expect(t?.receber.item).toBe(idDoBloco(Bloco.PORTEIRA));
  });
});

describe('porteira: abrir e fechar pelo núcleo', () => {
  const SEMENTE = 1337;
  const p0 = encontrarNascimento(SEMENTE);
  const X = Math.floor(p0.x);
  const Z = Math.floor(p0.z);
  const Y = alturaTerreno(X, Z, SEMENTE) + 1;
  const tel = (x: number, z: number): Comando => ({
    t: 'jogador',
    x,
    y: Y,
    z,
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

  function novo(confiar: boolean): Nucleo {
    const n = criarNucleo({
      semente: SEMENTE,
      modo: 'criativo',
      versaoMundo: 2,
      confiarNoCliente: confiar,
    });
    n.conectar('ana', { perfil: { apelido: 'Ana', aparencia: {} } });
    n.comando('ana', tel(X + 0.5, Z + 0.5));
    n.estado.edicoes.definir(X + 2, Y, Z, Bloco.PORTEIRA, 3);
    n.estado.edicoes.definir(X + 2, Y + 1, Z, Bloco.AR);
    return n;
  }

  it('o "usar" passa pelo saneamento', () => {
    expect(sanear({ t: 'usar', id: 4, x: 1, y: 60, z: 2 })).toEqual({
      t: 'usar',
      id: 4,
      x: 1,
      y: 60,
      z: 2,
    });
  });

  it.each([true, false])(
    'confiando no cliente = %s: abre e fecha, guarda a direção e só um bloco',
    (confiar) => {
      const n = novo(confiar);
      const b = () => n.estado.mundo.bloco(X + 2, Y, Z);
      n.comando('ana', { t: 'usar', id: 1, x: X + 2, y: Y, z: Z });
      expect(b()).toBe(Bloco.PORTEIRA_ABERTA);
      expect(n.estado.edicoes.obterMeta(X + 2, Y, Z)).toBe(3);
      expect(n.estado.mundo.bloco(X + 2, Y + 1, Z)).toBe(Bloco.AR);
      const ev = n.quadros().get('ana')!.eventos ?? [];
      expect(ev.some((e) => e.e === 'porta')).toBe(true);
      n.comando('ana', { t: 'usar', id: 2, x: X + 2, y: Y, z: Z });
      expect(b()).toBe(Bloco.PORTEIRA);
      expect(n.estado.edicoes.obterMeta(X + 2, Y, Z)).toBe(3);
    },
  );

  it('a previsão do cliente usa a mesma regra do núcleo', () => {
    expect(abreEFecha(Bloco.PORTEIRA)).toBe(true);
    expect(abreEFecha(Bloco.CERCA)).toBe(false);
    expect(alternado(Bloco.PORTEIRA)).toBe(Bloco.PORTEIRA_ABERTA);
    expect(alternado(Bloco.PORTEIRA_ABERTA)).toBe(Bloco.PORTEIRA);
  });

  it('na nuvem: longe não abre; visitante abre como a porta, mas não quebra', () => {
    const n = novo(false);
    n.conectar('bia', { perfil: { apelido: 'Bia', aparencia: {} } });
    n.comando('bia', tel(X + 40.5, Z + 0.5));
    n.comando('bia', { t: 'usar', id: 1, x: X + 2, y: Y, z: Z });
    expect(n.estado.mundo.bloco(X + 2, Y, Z)).toBe(Bloco.PORTEIRA);
    const v = novo(false);
    v.conectar('bia', { perfil: { apelido: 'Bia', aparencia: {} } });
    v.comando('bia', tel(X + 3.5, Z + 1.5));
    v.definirConstrucao('bia', false);
    const n2 = v;
    n2.comando('bia', { t: 'quebrar', id: 2, x: X + 2, y: Y, z: Z, slot: 0 });
    expect(n2.estado.mundo.bloco(X + 2, Y, Z)).toBe(Bloco.PORTEIRA);
    // a porta de casa também abre para quem só passeia: a porteira segue a mesma regra
    n2.comando('bia', { t: 'usar', id: 3, x: X + 2, y: Y, z: Z });
    expect(n2.estado.mundo.bloco(X + 2, Y, Z)).toBe(Bloco.PORTEIRA_ABERTA);
  });
});
