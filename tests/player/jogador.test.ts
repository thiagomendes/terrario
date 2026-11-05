import { describe, expect, it } from 'vitest';
import {
  ALTURA_JOGADOR,
  VEL_ANDAR,
  VEL_CORRER,
  VEL_PULO,
  criarJogador,
  passoFisica,
  posicaoInicial,
  type ComandoMovimento,
  type Solido,
} from '../../src/player/fisica';
import { acaoDaTecla, aplicarMouse, eixos, LIMITE_PITCH } from '../../src/player/entrada';
import { ALTURA, TAM_X, TAM_Z, alturaTerreno, gerarChunk, indice } from '../../src/world/chunk';
import { Bloco } from '../../src/world/blocks';
import { criarEdicoes } from '../../src/world/edicoes';
import { criarMundoSolido } from '../../src/player/controle';

const chao: Solido = (_x, y) => y < 0;
const parado: ComandoMovimento = { frente: 0, direita: 0, pular: false, correr: false, yaw: 0 };

describe('física do jogador', () => {
  it('anda e corre com velocidade previsível', () => {
    const a = criarJogador(0.5, 0, 0.5);
    a.noChao = true;
    passoFisica(a, { ...parado, frente: 1 }, 0.1, chao);
    expect(a.z).toBeCloseTo(0.5 + VEL_ANDAR * 0.1, 5);
    const c = criarJogador(0.5, 0, 0.5);
    passoFisica(c, { ...parado, frente: 1, correr: true }, 0.1, chao);
    expect(c.z).toBeCloseTo(0.5 + VEL_CORRER * 0.1, 5);
    expect(c.z).toBeGreaterThan(a.z);
  });

  it('pula só no chão e cai de volta', () => {
    const j = criarJogador(0.5, 0, 0.5);
    passoFisica(j, parado, 0.016, chao);
    expect(j.noChao).toBe(true);
    passoFisica(j, { ...parado, pular: true }, 0.016, chao);
    expect(j.vy).toBeGreaterThan(VEL_PULO - 1);
    expect(j.y).toBeGreaterThan(0);
    const vy = j.vy;
    passoFisica(j, { ...parado, pular: true }, 0.016, chao);
    expect(j.vy).toBeLessThan(vy);
    for (let i = 0; i < 100; i++) passoFisica(j, parado, 0.016, chao);
    expect(j.noChao).toBe(true);
    expect(j.y).toBe(0);
  });

  it('não pula no ar', () => {
    const j = criarJogador(0.5, 10, 0.5);
    passoFisica(j, { ...parado, pular: true }, 0.016, chao);
    expect(j.vy).toBeLessThan(0);
  });

  it('bloqueia parede, teto e planta não bloqueia', () => {
    const parede: Solido = (x, y, z) => y < 0 || (x === 2 && y >= 0 && y < 3 && z === 0);
    const j = criarJogador(1.5, 0, 0.5);
    for (let i = 0; i < 60; i++)
      passoFisica(j, { ...parado, frente: 1, yaw: Math.PI / 2 }, 0.05, parede);
    expect(j.x).toBeLessThan(2);

    const teto: Solido = (_x, y) => y < 0 || y === 3;
    const t = criarJogador(0.5, 0, 0.5);
    passoFisica(t, parado, 0.016, teto);
    passoFisica(t, { ...parado, pular: true }, 0.016, teto);
    for (let i = 0; i < 60; i++) passoFisica(t, parado, 0.016, teto);
    expect(t.y + ALTURA_JOGADOR).toBeLessThanOrEqual(3.0001);

    const planta: Solido = (x, y) => y < 0 && x !== 99;
    const p = criarJogador(0.5, 0, 0.5);
    for (let i = 0; i < 10; i++) passoFisica(p, { ...parado, frente: 1 }, 0.05, planta);
    expect(p.z).toBeGreaterThan(1.5);
  });

  it('nasce sobre a superfície do terreno', () => {
    const j = posicaoInicial(8.5, 8.5, (x, z) => alturaTerreno(x, z, 1337));
    expect(j.y).toBe(alturaTerreno(8, 8, 1337) + 1);
  });
});

describe('criarMundoSolido com blocos reais', () => {
  const chunk = new Uint8Array(TAM_X * ALTURA * TAM_Z);
  for (let x = 0; x < TAM_X; x++) chunk[indice(x, 0, 0)] = Bloco.TERRA_MUSGOSA;
  chunk[indice(1, 1, 0)] = Bloco.PEDRA_RACHADA;
  chunk[indice(2, 1, 0)] = Bloco.GRAMA_ALTA;
  chunk[indice(3, 1, 0)] = Bloco.FLOR;
  chunk[indice(4, 1, 0)] = Bloco.COGUMELO_BRILHANTE;
  chunk[indice(7, 1, 0)] = Bloco.PEDRA_RACHADA;
  const mundo = criarMundoSolido(1, () => chunk);

  it('classifica blocos, abaixo e acima do mundo', () => {
    expect(mundo(0, 0, 0)).toBe(true);
    expect(mundo(1, 1, 0)).toBe(true);
    expect(mundo(2, 1, 0)).toBe(false);
    expect(mundo(3, 1, 0)).toBe(false);
    expect(mundo(4, 1, 0)).toBe(false);
    expect(mundo(5, 1, 0)).toBe(false);
    expect(mundo(0, -1, 0)).toBe(true);
    expect(mundo(0, ALTURA, 0)).toBe(false);
  });

  it('jogador atravessa a célula de planta mas não a de pedra', () => {
    const p = criarJogador(2.1, 1, 0.5);
    for (let i = 0; i < 15; i++)
      passoFisica(p, { ...parado, frente: 1, yaw: Math.PI / 2 }, 0.05, mundo);
    expect(p.x).toBeGreaterThan(4.5);
    expect(p.x).toBeLessThan(7);
    for (let i = 0; i < 40; i++)
      passoFisica(p, { ...parado, frente: 1, yaw: Math.PI / 2 }, 0.05, mundo);
    expect(p.x).toBeLessThan(7);
  });

  it('toda planta de um chunk real é não sólida', () => {
    const real = gerarChunk(0, 0, 1337);
    const m = criarMundoSolido(1337);
    for (let y = 0; y < ALTURA; y++)
      for (let z = 0; z < TAM_Z; z++)
        for (let x = 0; x < TAM_X; x++) {
          const b = real[indice(x, y, z)];
          if (b >= Bloco.GRAMA_ALTA) expect(m(x, y, z)).toBe(false);
        }
  });
});

describe('criarMundoSolido com edições no mundo real', () => {
  const SEMENTE = 1337;

  it('quebrar o bloco sob o jogador o faz cair e y=0 é recusado', () => {
    const edicoes = criarEdicoes();
    const mundo = criarMundoSolido(SEMENTE, gerarChunk, edicoes);
    const topo = alturaTerreno(8, 8, SEMENTE);
    expect(mundo(8, topo, 8)).toBe(true);
    const j = criarJogador(8.5, topo + 1, 8.5);
    passoFisica(j, parado, 0.016, mundo);
    expect(j.noChao).toBe(true);
    expect(edicoes.definir(8, topo, 8, Bloco.AR)).toBe(true);
    expect(mundo(8, topo, 8)).toBe(false);
    for (let i = 0; i < 20; i++) passoFisica(j, parado, 0.016, mundo);
    expect(j.y).toBeLessThan(topo + 1);
    expect(edicoes.definir(8, 0, 8, Bloco.AR)).toBe(false);
    expect(mundo(8, 0, 8)).toBe(true);
  });

  it('colocar um bloco em posição de ar torna a posição sólida', () => {
    const edicoes = criarEdicoes();
    const mundo = criarMundoSolido(SEMENTE, gerarChunk, edicoes);
    const y = alturaTerreno(20, -5, SEMENTE) + 10;
    expect(mundo(20, y, -5)).toBe(false);
    expect(edicoes.definir(20, y, -5, Bloco.TABUAS)).toBe(true);
    expect(mundo(20, y, -5)).toBe(true);
  });
});

describe('entrada', () => {
  it('mapeia teclas', () => {
    expect(acaoDaTecla('KeyW')).toBe('frente');
    expect(acaoDaTecla('KeyA')).toBe('esquerda');
    expect(acaoDaTecla('KeyS')).toBe('tras');
    expect(acaoDaTecla('KeyD')).toBe('direita');
    expect(acaoDaTecla('Space')).toBe('pular');
    expect(acaoDaTecla('ShiftLeft')).toBe('correr');
    expect(acaoDaTecla('KeyQ')).toBeNull();
    expect(eixos({ frente: true, esquerda: true })).toEqual({ frente: 1, direita: -1 });
  });

  it('limita o pitch a 89 graus', () => {
    expect(aplicarMouse(0, 0, 0, 1e6).pitch).toBeCloseTo(LIMITE_PITCH, 8);
    expect(aplicarMouse(0, 0, 0, -1e6).pitch).toBeCloseTo(-LIMITE_PITCH, 8);
    expect(LIMITE_PITCH * (180 / Math.PI)).toBeCloseTo(89, 8);
    expect(aplicarMouse(0, 0, 100, 0).yaw).toBeGreaterThan(0);
  });
});
