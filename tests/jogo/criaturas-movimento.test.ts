import { describe, expect, it } from 'vitest';
import {
  assentarCriatura,
  ferir,
  novaCriatura,
  passoCriatura,
  type Criatura,
  type Mundo,
} from '../../src/jogo/criaturas';
import { criarPopulacao } from '../../src/jogo/populacao';
import { criarGerador } from '../../src/audio/variacao';
import type { Solido } from '../../src/player/fisica';

const DT = 1 / 30;
type Caixa = [number, number, number, number, number, number];

function mundoCom(
  solido: (x: number, y: number, z: number) => boolean,
  opcoes: {
    caixas?: (x: number, y: number, z: number) => Caixa[] | null;
    agua?: (x: number, y: number, z: number) => boolean;
  } = {},
): Mundo {
  const s = solido as Solido;
  if (opcoes.caixas) s.caixas = opcoes.caixas;
  return {
    solido: s,
    agua: opcoes.agua ?? (() => false),
    luzBloco: () => 0,
    ceuAberto: () => false,
  };
}
const longe = { x: 200, y: 10, z: 200, vivo: true, criativo: false };
const jog = (x: number, z: number, y = 10) => ({ x, y, z, vivo: true, criativo: false });

/** Cervo vagando rumo a um destino fixo, sem sortear outro no meio do teste. */
function vagando(c: Criatura, alvoX: number, alvoZ: number): void {
  c.estado = 'vagar';
  c.tempoEstado = 1000;
  c.alvoX = alvoX;
  c.alvoZ = alvoZ;
}

describe('criaturas: movimento', () => {
  it('pousa no topo da laje e fica parada sem tremer', () => {
    const m = mundoCom((_x, y) => y <= 10, {
      caixas: (_x, y) => (y === 10 ? [[0, 0, 0, 1, 0.5, 1]] : null),
    });
    const c = novaCriatura(1, 'cervo', 0.5, 10.9, 0.5);
    c.estado = 'parado';
    c.tempoEstado = 1000;
    const rng = criarGerador(1);
    for (let i = 0; i < 30; i++) passoCriatura(c, DT, m, longe, rng, [], 0);
    expect(c.y).toBeCloseTo(10.5, 3);
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < 90; i++) {
      passoCriatura(c, DT, m, longe, rng, [], 0);
      min = Math.min(min, c.y);
      max = Math.max(max, c.y);
    }
    expect(max - min).toBeLessThan(0.03);
    expect(c.noChao).toBe(true);
  });

  it('sobe numa laje andando, como degrau', () => {
    const m = mundoCom((x, y) => y < 10 || (y === 10 && x >= 3), {
      caixas: (x, y) => (y === 10 && x >= 3 ? [[0, 0, 0, 1, 0.5, 1]] : null),
    });
    const c = novaCriatura(1, 'cervo', 0.5, 10, 0.5);
    c.noChao = true;
    vagando(c, 8.5, 0.5);
    const rng = criarGerador(2);
    for (let i = 0; i < 120; i++) passoCriatura(c, DT, m, longe, rng, [], 0);
    expect(c.x).toBeGreaterThan(5);
    expect(c.y).toBeCloseTo(10.5, 2);
  });

  it('desiste de um destino atrás de um muro alto', () => {
    const m = mundoCom((x, y) => y < 10 || (x === 3 && y < 20));
    const c = novaCriatura(1, 'cervo', 0.5, 10, 0.5);
    vagando(c, 9.5, 0.5);
    const rng = criarGerador(3);
    for (let i = 0; i < 120; i++) passoCriatura(c, DT, m, longe, rng, [], 0);
    // não fica empurrando o muro: trocou o destino e saiu de lado
    expect(c.alvoX).not.toBe(9.5);
    expect(Math.abs(c.z - 0.5)).toBeGreaterThan(0.5);
  });

  it('espectro contorna o muro em vez de ficar preso perseguindo', () => {
    const m = mundoCom((x, y, z) => y < 10 || (x === 3 && z >= -1 && z <= 1 && y < 20));
    const e = novaCriatura(1, 'espectro', 0.5, 10, 0.5);
    const rng = criarGerador(4);
    let passou = false;
    for (let i = 0; i < 600 && !passou; i++) {
      passoCriatura(e, DT, m, jog(7.5, 0.5), rng, [], 1);
      passou = e.x > 4;
    }
    expect(passou).toBe(true);
  });

  it('sai da água pela margem da altura da superfície', () => {
    // lago com água na camada y = 9 para x < 3; margem com topo em y = 10 a partir de x = 3
    const m = mundoCom((x, y) => (x < 3 ? y < 9 : y < 10), {
      agua: (x, y) => x < 3 && y === 9,
    });
    const c = novaCriatura(1, 'cervo', 1.5, 9.4, 0.5);
    vagando(c, 8.5, 0.5);
    const rng = criarGerador(5);
    for (let i = 0; i < 150; i++) passoCriatura(c, DT, m, longe, rng, [], 0);
    expect(c.x).toBeGreaterThan(3.5);
    expect(c.y).toBeCloseTo(10, 2);
    expect(c.noChao).toBe(true);
  });

  it('boia estável na água funda, sem serrilhar', () => {
    const m = mundoCom((_x, y) => y < 5, { agua: (_x, y) => y >= 5 && y < 10 });
    const c = novaCriatura(1, 'coelho', 0.5, 8, 0.5);
    c.estado = 'parado';
    c.tempoEstado = 1000;
    const rng = criarGerador(6);
    for (let i = 0; i < 120; i++) passoCriatura(c, DT, m, longe, rng, [], 0);
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < 60; i++) {
      passoCriatura(c, DT, m, longe, rng, [], 0);
      min = Math.min(min, c.y);
      max = Math.max(max, c.y);
    }
    expect(max - min).toBeLessThan(0.05);
    expect(max).toBeLessThan(10);
    expect(min).toBeGreaterThan(9.3);
  });

  it('raposa domada tem histerese: não alterna entre seguir e parar no limiar', () => {
    const m = mundoCom((_x, y) => y < 10);
    const rng = criarGerador(7);
    const r = novaCriatura(1, 'raposa', 0.5, 10, 0.5);
    r.domada = true;
    r.noChao = true;
    r.estado = 'parado';
    passoCriatura(r, DT, m, jog(4.1, 0.5), rng, [], 0);
    expect(r.estado).toBe('parado');
    r.estado = 'seguir';
    passoCriatura(r, DT, m, jog(3.5, 0.5), rng, [], 0);
    expect(r.estado).toBe('seguir');
    // jogador parado: segue, para e não volta a oscilar
    let trocas = 0;
    let anterior = r.estado;
    for (let i = 0; i < 300; i++) {
      passoCriatura(r, DT, m, jog(10.5, 0.5), rng, [], 0);
      if (r.estado !== anterior) trocas++;
      anterior = r.estado;
    }
    expect(trocas).toBeLessThanOrEqual(1);
    expect(r.estado).toBe('parado');
  });

  it('raposa selvagem curiosa se aproxima e para a uma distância, sem vaivém', () => {
    const m = mundoCom((_x, y) => y < 10);
    const rng = criarGerador(8);
    const r = novaCriatura(1, 'raposa', 0.5, 10, 0.5);
    r.noChao = true;
    let trocas = 0;
    let anterior = r.estado;
    for (let i = 0; i < 300; i++) {
      passoCriatura(r, DT, m, jog(5.5, 0.5), rng, [], 0);
      if (r.estado !== anterior) trocas++;
      anterior = r.estado;
    }
    expect(trocas).toBeLessThanOrEqual(1);
    expect(r.estado).toBe('seguir');
    expect(Math.abs(Math.hypot(5.5 - r.x, 0.5 - r.z) - 2.75)).toBeLessThan(0.5);
  });

  it('o empurrão do golpe não é apagado no quadro seguinte', () => {
    const m = mundoCom((_x, y) => y < 10);
    const rng = criarGerador(9);
    const e = novaCriatura(1, 'espectro', 0.5, 10, 0.5);
    e.noChao = true;
    ferir(e, 1, rng, 0.5, -1);
    passoCriatura(e, DT, m, jog(0.5, 5), rng, [], 1);
    // o espectro perseguiria o jogador (+z); atordoado, ainda recua com o golpe
    expect(e.vz).toBeGreaterThan(4);
  });

  it('gira o corpo aos poucos', () => {
    const m = mundoCom((_x, y) => y < 10);
    const c = novaCriatura(1, 'cervo', 0.5, 10, 0.5);
    c.noChao = true;
    vagando(c, 0.5, -8);
    passoCriatura(c, DT, m, longe, criarGerador(10), [], 0);
    expect(Math.abs(c.yaw)).toBeLessThan(1);
    for (let i = 0; i < 60; i++) passoCriatura(c, DT, m, longe, criarGerador(10), [], 0);
    expect(Math.abs(Math.abs(c.yaw) - Math.PI)).toBeLessThan(0.05);
  });

  it('fora do raio de simulação cai até o chão em vez de congelar no ar', () => {
    const m = mundoCom((_x, y) => y < 10);
    const c = novaCriatura(1, 'cervo', 0.5, 14, 0.5);
    for (let i = 0; i < 60; i++) assentarCriatura(c, DT, m);
    expect(c.y).toBeCloseTo(10, 3);
    expect(c.noChao).toBe(true);
  });

  it('criaturas no mesmo lugar se afastam', () => {
    const m = {
      ...mundoCom((_x, y) => y < 10),
      bioma: () => 'oceano' as never,
      superficie: () => null,
      nivelMar: 0,
    };
    const p = criarPopulacao(criarGerador(11));
    const a = p.adicionar('cervo', 0.5, 10, 0.5);
    const b = p.adicionar('cervo', 0.5, 10, 0.5);
    for (const c of [a, b]) {
      c.estado = 'parado';
      c.tempoEstado = 1000;
    }
    for (let i = 0; i < 60; i++) p.atualizar(DT, m, jog(0.5, 20), 0);
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(0.6);
  });
});
