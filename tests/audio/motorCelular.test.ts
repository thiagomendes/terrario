import { describe, expect, it } from 'vitest';
import {
  nivelMotor,
  PRESENCA_MOTOR,
  presencaNaDistancia,
  respostaDoMotor,
  respostaDoMotorAntes,
} from '../../src/audio/somVeiculos';
import { respostaDaTrilhaAbaixada } from '../../src/audio/sons';

/**
 * 014 (ajustes): no alto-falante do iPhone o motor quase sumia. O laço gravado tem a energia
 * em 150 a 300 Hz (a fundamental de uns 180 Hz), e o celular não toca quase nada abaixo de
 * 300 a 400 Hz. A camada de presença (uma faixa de 1 kHz do mesmo som, que segue a rotação)
 * sobe o motor onde o celular toca, e o motor inteiro desce o tanto que ela soma nos graves,
 * para o computador não ficar mais alto que o aprovado.
 */
const db = (x: number) => 20 * Math.log10(x);

describe('o motor no alto-falante do celular', () => {
  for (const carga of [0.12, 0.32, 0.9])
    it(`pedal ${carga}: nos graves (onde o computador ouve) não sobe; em 0,8 a 2 kHz, sobe`, () => {
      // graves e médios-graves: no máximo o que era (a compensação)
      for (const f of [100, 180])
        expect(db(respostaDoMotor(f, carga)) - db(respostaDoMotorAntes(f, carga))).toBeLessThan(
          0.3,
        );
      // presença: bem mais forte onde o celular toca
      for (const f of [800, 1000, 1500])
        expect(db(respostaDoMotor(f, carga)) - db(respostaDoMotorAntes(f, carga))).toBeGreaterThan(
          carga > 0.5 ? 1.5 : 4,
        );
    });

  it('a presença é constante (não depende do pedal) e fica numa faixa só', () => {
    expect(PRESENCA_MOTOR.hz).toBeGreaterThanOrEqual(800);
    expect(PRESENCA_MOTOR.hz).toBeLessThanOrEqual(1500);
    expect(PRESENCA_MOTOR.compensa).toBeLessThan(1);
    // o nível do esboço continua o mesmo
    expect(nivelMotor(1, 0.12)).toBeCloseTo(0.56, 2);
  });

  it('a trilha abaixada também abre um vale nos médios (onde o motor soa no celular)', () => {
    // 1 kHz: o vale novo; 180 Hz: o de antes; 5 kHz: só o abaixar
    expect(db(respostaDaTrilhaAbaixada(1000, 1))).toBeLessThan(
      db(respostaDaTrilhaAbaixada(5000, 1)) - 2,
    );
    expect(db(respostaDaTrilhaAbaixada(180, 1))).toBeLessThan(
      db(respostaDaTrilhaAbaixada(5000, 1)) - 2,
    );
    // sem carro perto, a trilha passa inteira
    for (const f of [180, 1000, 5000]) expect(db(respostaDaTrilhaAbaixada(f, 0))).toBeCloseTo(0, 3);
  });
});

describe('a presença pela distância', () => {
  it('inteira de perto, 35% de longe (a rua de longe não clareia)', () => {
    expect(presencaNaDistancia(3)).toBe(1);
    expect(presencaNaDistancia(11)).toBeCloseTo(0.675, 3);
    expect(presencaNaDistancia(30)).toBe(0.35);
  });
});
