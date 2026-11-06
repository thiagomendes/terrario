import { describe, expect, it } from 'vitest';
import {
  criarJogador,
  passoFisica,
  type ComandoMovimento,
  type Solido,
} from '../../src/player/fisica';

// Lago: fundo sólido em y <= 59, água de 60 a 62 (superfície em 63) para x < 5.
// Margem de areia em x >= 5, sólida até y = 63 (topo em 64): um bloco acima da água.
function lago(): Solido {
  const solido = ((x: number, y: number) => y <= 59 || (x >= 5 && y <= 63)) as Solido;
  solido.liquido = (x, y) => x < 5 && y >= 60 && y <= 62;
  return solido;
}

const paraMargem: ComandoMovimento = {
  frente: 1,
  direita: 0,
  pular: true,
  correr: false,
  yaw: Math.PI / 2, // +x
};

describe('nado', () => {
  it('nadando contra a margem e pulando, sai da água para o bloco de cima', () => {
    const s = lago();
    const j = criarJogador(3.5, 61.2, 0.5);
    for (let i = 0; i < 240; i++) passoFisica(j, paraMargem, 1 / 60, s);
    expect(j.x).toBeGreaterThan(5);
    expect(j.y).toBeGreaterThanOrEqual(64 - 0.01);
    expect(j.naAgua).toBe(false);
  });

  it('em água aberta (sem parede) o nado continua limitado e não "voa"', () => {
    const s = lago();
    const j = criarJogador(1.5, 60.2, 0.5);
    let maxY = j.y;
    for (let i = 0; i < 240; i++) {
      passoFisica(j, { ...paraMargem, frente: 0 }, 1 / 60, s);
      maxY = Math.max(maxY, j.y);
    }
    // flutua na superfície (~63) sem saltar acima dela
    expect(maxY).toBeLessThan(63.6);
  });

  it('em terra firme, andando e pulando, sobe um degrau de um bloco', () => {
    const s = ((x: number, y: number) => y <= 59 || (x >= 5 && y <= 60)) as Solido;
    const j = criarJogador(3.5, 60, 0.5);
    passoFisica(j, { ...paraMargem, pular: false }, 1 / 60, s);
    for (let i = 0; i < 120; i++) passoFisica(j, paraMargem, 1 / 60, s);
    expect(j.x).toBeGreaterThan(5);
    expect(j.y).toBeGreaterThanOrEqual(61 - 0.01);
  });
});
