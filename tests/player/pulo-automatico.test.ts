import { describe, expect, it } from 'vitest';
import {
  criarJogador,
  passoFisica,
  type ComandoMovimento,
  type Solido,
} from '../../src/player/fisica';

/** Andando para +x com o pulo automático ligado (ou não). */
const andar = (puloAutomatico: boolean): ComandoMovimento => ({
  frente: 1,
  direita: 0,
  pular: false,
  correr: false,
  yaw: Math.PI / 2,
  puloAutomatico,
});

/** Chão em y<=59 e, a partir de x=6, uma coluna de `altura` blocos. */
function degrau(altura: number, teto?: number): Solido {
  return ((x: number, y: number) =>
    y <= 59 ||
    (x >= 6 && y >= 60 && y < 60 + altura) ||
    (teto !== undefined && y === teto)) as Solido;
}

function andarPor(s: Solido, cmd: ComandoMovimento, segundos: number) {
  const j = criarJogador(3.5, 60, 0.5);
  passoFisica(j, { ...cmd, frente: 0 }, 1 / 60, s); // assenta no chão
  for (let i = 0; i < segundos * 60; i++) passoFisica(j, cmd, 1 / 60, s);
  return j;
}

describe('pulo automático', () => {
  it('sobe um degrau de um bloco sozinho, sem apertar pular', () => {
    const j = andarPor(degrau(1), andar(true), 3);
    expect(j.x).toBeGreaterThan(6.5);
    expect(j.y).toBeCloseTo(61, 1);
  });

  it('desligado, para encostado no degrau como antes', () => {
    const j = andarPor(degrau(1), andar(false), 3);
    expect(j.x).toBeLessThan(6);
    expect(j.y).toBeCloseTo(60, 1);
  });

  it('não pula contra uma parede de dois blocos', () => {
    const s = degrau(2);
    const j = criarJogador(3.5, 60, 0.5);
    passoFisica(j, { ...andar(true), frente: 0 }, 1 / 60, s);
    let maior = j.y;
    for (let i = 0; i < 180; i++) {
      passoFisica(j, andar(true), 1 / 60, s);
      maior = Math.max(maior, j.y);
    }
    expect(maior).toBeLessThan(60.05);
    expect(j.x).toBeLessThan(6);
  });

  it('não pula se não há espaço para a cabeça em cima do degrau', () => {
    // teto baixo em y=62 sobre tudo: em cima do degrau o corpo não cabe
    const j = andarPor(degrau(1, 62), andar(true), 3);
    expect(j.x).toBeLessThan(6);
  });

  it('parado encostado no degrau não fica pulando', () => {
    const s = degrau(1);
    const j = andarPor(s, andar(false), 2);
    let maior = j.y;
    for (let i = 0; i < 120; i++) {
      passoFisica(j, { ...andar(true), frente: 0 }, 1 / 60, s);
      maior = Math.max(maior, j.y);
    }
    expect(maior).toBeLessThan(60.05);
  });
});
