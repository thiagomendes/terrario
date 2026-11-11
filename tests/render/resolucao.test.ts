import { describe, expect, it } from 'vitest';
import {
  ajustarEscala,
  escalaBase,
  ESCALA_MAX,
  ESCALA_MIN,
  PASSO_ESCALA,
} from '../../src/render/resolucao';

describe('resolução adaptativa', () => {
  it('escolhe a base pela largura', () => {
    expect(escalaBase(360)).toBe(1);
    expect(escalaBase(1280)).toBe(1.25);
    expect(escalaBase(1920)).toBe(1.5);
  });

  it('reduz a resolução com FPS baixo, em passos e com limite máximo', () => {
    expect(ajustarEscala(1, 20, 1)).toBe(1 + PASSO_ESCALA);
    expect(ajustarEscala(ESCALA_MAX, 10, 1)).toBe(ESCALA_MAX);
  });

  it('aumenta a resolução com FPS alto, sem passar da base nem do mínimo', () => {
    expect(ajustarEscala(2, 60, 1)).toBe(2 - PASSO_ESCALA);
    expect(ajustarEscala(1.25, 60, 1.25)).toBe(1.25);
    expect(ajustarEscala(ESCALA_MIN, 60, 1)).toBe(ESCALA_MIN);
  });

  it('mantém a escala na faixa de histerese', () => {
    expect(ajustarEscala(1.5, 45, 1)).toBe(1.5);
  });
});

describe('resolução no celular (correção da 017)', () => {
  it('segue a densidade da tela até 2, em passos', () => {
    expect(escalaBase(390, 3, true)).toBe(0.5);
    expect(escalaBase(390, 2, true)).toBe(0.5);
    expect(escalaBase(390, 1.5, true)).toBe(0.75);
    expect(escalaBase(390, 1, true)).toBe(1);
    // sem toque ou tela larga (tablet, computador): como antes
    expect(escalaBase(390, 3, false)).toBe(1);
    expect(escalaBase(1280, 2, true)).toBe(1.25);
  });

  it('a nitidez extra cai abaixo de 50 quadros e volta com folga', () => {
    expect(ajustarEscala(0.5, 45, 0.5)).toBe(0.75);
    expect(ajustarEscala(0.75, 45, 0.5)).toBe(1);
    // no nível 1, 45 quadros fica (como sempre foi)
    expect(ajustarEscala(1, 45, 0.5)).toBe(1);
    expect(ajustarEscala(0.75, 60, 0.5)).toBe(0.5);
    expect(ajustarEscala(0.5, 60, 0.5)).toBe(0.5);
  });
});
