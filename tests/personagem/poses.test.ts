import { describe, expect, it } from 'vitest';
import { calcularPose, criarAcoes } from '../../src/personagem/poses';

const base = {
  andando: false,
  correndo: false,
  noAr: false,
  minerando: false,
  colocando: false,
  tempo: 0.3,
};

describe('calcularPose', () => {
  it('parado devolve balanço 0 e valores finitos', () => {
    const p = calcularPose(base);
    for (const v of Object.values(p))
      if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true);
    expect(p.bracoDireito).toBe(0);
    expect(p.bracoEsquerdo).toBe(0);
    expect(p.pernaDireita).toBe(0);
    expect(p.pernaEsquerda).toBe(0);
    expect(p.tronco).toBe(0);
    // parado, a cabeça só olha em volta de leve (spec 012)
    expect(Math.abs(p.cabeca)).toBeLessThan(0.06);
  });

  it('andar balança em oposição de fase e correr tem mais amplitude', () => {
    const a = calcularPose({ ...base, andando: true, tempo: 0.1 });
    expect(Math.abs(a.bracoEsquerdo)).toBeGreaterThan(0.1);
    expect(a.bracoDireito).toBeCloseTo(-a.bracoEsquerdo, 6);
    expect(a.pernaDireita).toBeCloseTo(-a.pernaEsquerda, 6);
    expect(a.bracoEsquerdo * a.pernaEsquerda).toBeLessThan(0);
    let maxA = 0;
    let maxC = 0;
    for (let t = 0; t < 1; t += 0.01) {
      maxA = Math.max(
        maxA,
        Math.abs(calcularPose({ ...base, andando: true, tempo: t }).pernaDireita),
      );
      maxC = Math.max(
        maxC,
        Math.abs(calcularPose({ ...base, andando: true, correndo: true, tempo: t }).pernaDireita),
      );
    }
    expect(maxC).toBeGreaterThan(maxA);
  });

  it('minerar repete a cada 0,25 s e varia dentro do período', () => {
    const m = { ...base, minerando: true };
    const p1 = calcularPose({ ...m, tempo: 0.37 });
    const p2 = calcularPose({ ...m, tempo: 0.62 });
    expect(p2.bracoDireito).toBeCloseTo(p1.bracoDireito, 6);
    const p3 = calcularPose({ ...m, tempo: 0.37 + 0.0625 });
    expect(Math.abs(p3.bracoDireito - p1.bracoDireito)).toBeGreaterThan(0.1);
  });
});

describe('criarAcoes', () => {
  it('colocar dura cerca de 0,2 s e volta ao neutro', () => {
    const a = criarAcoes();
    expect(a.estado().colocando).toBe(false);
    a.disparar('colocacao');
    a.avancar(0.1);
    expect(a.estado().colocando).toBe(true);
    a.avancar(0.11);
    expect(a.estado()).toEqual({ colocando: false, progressoColocar: 0, afundar: 0 });
  });

  it.each(['pulo', 'aterrissagem'] as const)('%s dura cerca de 0,25 s', (nome) => {
    const a = criarAcoes();
    a.disparar(nome);
    a.avancar(0.125);
    expect(a.estado().afundar).toBeGreaterThan(0.9);
    a.avancar(0.1);
    expect(a.estado().afundar).toBeGreaterThan(0);
    a.avancar(0.03);
    expect(a.estado().afundar).toBe(0);
  });

  it('afundar desloca o tronco na pose', () => {
    const a = criarAcoes();
    a.disparar('pulo');
    a.avancar(0.125);
    const p = calcularPose({ ...base, ...a.estado() });
    expect(p.tronco).toBeLessThan(-0.05);
  });
});

describe('pose de voo', () => {
  it('voando, as pernas ficam juntas (não na pose de pulo)', () => {
    for (const tempo of [0, 0.4, 1.3]) {
      const p = calcularPose({
        andando: false,
        correndo: false,
        noAr: true,
        minerando: false,
        colocando: false,
        tempo,
        voando: true,
      });
      expect(p.pernaDireita).toBeCloseTo(p.pernaEsquerda, 5);
      expect(p.pernaDireita).toBeGreaterThan(0);
    }
  });
});
