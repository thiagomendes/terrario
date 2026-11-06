import { describe, expect, it } from 'vitest';
import {
  criarJogador,
  passoFisica,
  type ComandoMovimento,
  type Solido,
} from '../../src/player/fisica';

const frenteX: ComandoMovimento = {
  frente: 1,
  direita: 0,
  pular: false,
  correr: false,
  yaw: Math.PI / 2,
};

/** Chão em y<=59 e uma cerca (poste fino no meio, 1,5 de altura na colisão) em x=5, y=60. */
function comCerca(): Solido {
  const s = ((x: number, y: number) => y <= 59 || (x === 5 && y === 60)) as Solido;
  s.caixas = (x, y) => (x === 5 && y === 60 ? [[0.375, 0, 0.375, 0.625, 1.5, 0.625]] : null);
  return s;
}

describe('colisão com blocos parciais', () => {
  it('encostar na cerca não dá trancos para trás', () => {
    const s = comCerca();
    const j = criarJogador(4.5, 60, 5.5);
    passoFisica(j, { ...frenteX }, 1 / 60, s);
    const xs: number[] = [];
    for (let i = 0; i < 90; i++) {
      passoFisica(j, frenteX, 1 / 60, s);
      xs.push(j.x);
    }
    // para encostado no poste (0.375 - 0.3 de meia largura) e não oscila
    const fim = xs.slice(-30);
    expect(Math.max(...fim) - Math.min(...fim)).toBeLessThan(0.01);
    expect(j.x).toBeGreaterThan(5.0);
    expect(j.x).toBeLessThan(5.375 - 0.29);
  });

  it('não dá para pular a cerca (1,5 na colisão)', () => {
    const s = comCerca();
    const j = criarJogador(4.5, 60, 5.5);
    passoFisica(j, frenteX, 1 / 60, s);
    for (let i = 0; i < 120; i++) passoFisica(j, { ...frenteX, pular: true }, 1 / 60, s);
    expect(j.x).toBeLessThan(5.375);
  });

  it('queda muito rápida (FPS baixo) pousa em cima do bloco, sem entrar nele', () => {
    const s = ((_x: number, y: number) => y <= 59) as Solido;
    const j = criarJogador(0.5, 75, 0.5);
    j.vy = -40;
    for (let i = 0; i < 10; i++) passoFisica(j, { ...frenteX, frente: 0 }, 0.05, s);
    expect(j.y).toBeCloseTo(60, 2);
    expect(j.noChao).toBe(true);
  });
});
