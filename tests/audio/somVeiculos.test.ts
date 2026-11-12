import { describe, expect, it } from 'vitest';
import {
  ESTADO_MOTOR_INICIAL,
  FRASE_MAX_S,
  FRASE_MIN_S,
  PERFIS_MOTOR,
  ladoDoSom,
  lacoDoTipo,
  nivelMotor,
  passoMotor,
  passoSorvete,
  perfilDoTipo,
  volumeDistancia,
  type EstadoMotor,
  type EstadoSorvete,
} from '../../src/audio/somVeiculos';
import { ACELERACAO, FREADA, VEL_RETA } from '../../src/jogo/veiculos';
import { criarGerador } from '../../src/audio/variacao';

/** Simula o motor numa sequência de trechos (aceleração constante) e devolve a curva. */
function rodar(perfil = PERFIS_MOTOR.carro, trechos: [number, number][]) {
  let e: EstadoMotor = { ...ESTADO_MOTOR_INICIAL };
  let v = 0;
  const dt = 1 / 60;
  const curva: { t: number; v: number; rpm: number; carga: number; marcha: number }[] = [];
  let t = 0;
  for (const [dur, a] of trechos) {
    for (let k = 0; k < dur / dt; k++) {
      v = Math.max(0, Math.min(VEL_RETA, v + a * dt));
      const aEf = (a > 0 && v >= VEL_RETA) || (a < 0 && v <= 0) ? 0 : a;
      e = passoMotor(e, perfil, v, aEf, dt);
      t += dt;
      curva.push({ t, v, rpm: e.rpm, carga: e.carga, marcha: e.marcha });
    }
  }
  return curva;
}

describe('motor dos veículos (curva de rotação com marchas, do esboço)', () => {
  it('arranca, troca duas marchas (a rotação cai e volta a subir), roda, solta, reduz e para', () => {
    const c = rodar(PERFIS_MOTOR.carro, [
      [1, 0], // marcha lenta
      [VEL_RETA / ACELERACAO + 0.1, ACELERACAO], // arranca até 3
      [3, 0], // roda
      [VEL_RETA / FREADA + 0.5, -FREADA], // freia até parar
      [2, 0],
    ]);
    // marcha lenta perto de 1
    expect(Math.abs(c[50].rpm - 1)).toBeLessThan(0.03);
    // trocas para cima: a marcha sobe duas vezes e a rotação cai em cada uma
    const subidas = c.filter((p, i) => i > 0 && p.marcha > c[i - 1].marcha);
    expect(subidas.length).toBe(2);
    for (const s of subidas) {
      const i = c.indexOf(s);
      const antes = c[i - 1].rpm;
      const depois = Math.min(...c.slice(i, i + 20).map((p) => p.rpm));
      expect(antes - depois).toBeGreaterThan(0.25);
      // alívio no pedal na troca
      expect(Math.min(...c.slice(i, i + 12).map((p) => p.carga))).toBeLessThan(0.3);
    }
    // o pico da primeira marcha (perto de 2,35 do esboço)
    const pico = Math.max(...c.filter((p) => p.marcha === 0 && p.t < 3).map((p) => p.rpm));
    expect(pico).toBeGreaterThan(2.1);
    expect(pico).toBeLessThan(2.45);
    // rodando: ~1,95 com o pedal em ~0,32
    const rodando = c.find((p) => p.t > 6)!;
    expect(rodando.rpm).toBeGreaterThan(1.85);
    expect(rodando.rpm).toBeLessThan(2.05);
    expect(rodando.carga).toBeCloseTo(0.32, 1);
    // soltando o pedal: carga zero e uma redução com a rotação pulando para cima
    const freando = c.filter((p) => p.t > 7.2 && p.t < 7.2 + VEL_RETA / FREADA);
    expect(
      Math.max(
        ...freando
          .slice(10)
          .filter((p) => p.v > 0.4)
          .map((p) => p.carga),
      ),
    ).toBeLessThan(0.05);
    const reducoes = freando.filter(
      (p, i) => i > 0 && p.marcha < freando[i - 1].marcha && p.v > 0.3,
    );
    expect(reducoes.length).toBeGreaterThanOrEqual(1);
    const ir = c.indexOf(reducoes[0]);
    expect(Math.max(...c.slice(ir, ir + 20).map((p) => p.rpm))).toBeGreaterThan(
      c[ir - 1].rpm + 0.1,
    );
    // parado de novo: marcha lenta
    expect(Math.abs(c[c.length - 1].rpm - 1)).toBeLessThan(0.03);
    expect(c[c.length - 1].carga).toBeCloseTo(PERFIS_MOTOR.carro.lenta, 2);
  });

  it('o ônibus gira mais baixo que o carro e a polícia puxa um tiquinho mais', () => {
    const plano: [number, number][] = [
      [VEL_RETA / ACELERACAO + 0.1, ACELERACAO],
      [2, 0],
    ];
    const max = (p: typeof PERFIS_MOTOR.carro) => Math.max(...rodar(p, plano).map((x) => x.rpm));
    expect(max(PERFIS_MOTOR.onibus)).toBeLessThan(1.8);
    expect(max(PERFIS_MOTOR.policia)).toBeGreaterThan(max(PERFIS_MOTOR.carro));
    expect(max(PERFIS_MOTOR.sorvete)).toBeLessThan(1.65);
  });

  it('cada tipo tem o seu laço e o seu perfil', () => {
    expect(lacoDoTipo('onibusVerde')).toBe('lacoOnibus');
    expect(lacoDoTipo('policia')).toBe('lacoCarro');
    expect(lacoDoTipo('sorvete')).toBe('lacoSorvete');
    expect(perfilDoTipo('taxi')).toBe(PERFIS_MOTOR.carro);
    expect(perfilDoTipo('onibusAzul')).toBe(PERFIS_MOTOR.onibus);
  });

  it('o nível sobe acelerando (o pedal e a rotação), como no esboço', () => {
    expect(nivelMotor(1, 0.12)).toBeCloseTo(0.56, 2);
    expect(nivelMotor(2.35, 0.9)).toBeGreaterThan(2 * nivelMotor(1, 0.12));
  });
});

describe('distância e lado', () => {
  it('cheio até 4 blocos, some até 16', () => {
    expect(volumeDistancia(0)).toBe(1);
    expect(volumeDistancia(4)).toBe(1);
    expect(volumeDistancia(10)).toBeGreaterThan(0);
    expect(volumeDistancia(10)).toBeLessThan(0.5);
    expect(volumeDistancia(16)).toBe(0);
    expect(volumeDistancia(30)).toBe(0);
  });
  it('à direita da câmera soa à direita; em cima, no meio', () => {
    expect(ladoDoSom(5, 0, 1, 0)).toBeGreaterThan(0.7);
    expect(ladoDoSom(-5, 0, 1, 0)).toBeLessThan(-0.7);
    expect(Math.abs(ladoDoSom(0, 5, 1, 0))).toBeLessThan(0.01);
    expect(Math.abs(ladoDoSom(0.2, 0, 1, 0))).toBeLessThan(0.15);
  });
});

describe('musiquinha do sorvete', () => {
  const rng = criarGerador(1);
  const passo = (
    e: EstadoSorvete,
    agora: number,
    o: Partial<{ chegou: boolean; naVaga: boolean; criancaPerto: boolean }> = {},
  ) =>
    passoSorvete(
      e,
      { agora, chegou: false, naVaga: true, criancaPerto: true, duracaoInteira: 24, ...o },
      rng,
    );

  it('inteira ao chegar; depois uma frase a cada 90 a 120 s, só com criança perto', () => {
    let e: EstadoSorvete = { proxima: null };
    let r = passo(e, 0, { chegou: true });
    expect(r.tocar).toBe('inteira');
    e = r.estado;
    expect(e.proxima! - 24).toBeGreaterThanOrEqual(FRASE_MIN_S);
    expect(e.proxima! - 24).toBeLessThanOrEqual(FRASE_MAX_S);
    const tocou: number[] = [];
    for (let t = 0.1; t < 600; t += 0.1) {
      // de 300 a 400 s a criança foi para longe
      r = passo(e, t, { criancaPerto: t < 300 || t > 400 });
      e = r.estado;
      if (r.tocar) {
        expect(r.tocar).toBe('frase');
        tocou.push(t);
      }
    }
    expect(tocou.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < tocou.length; i++)
      expect(tocou[i] - tocou[i - 1]).toBeGreaterThanOrEqual(FRASE_MIN_S - 0.2);
    expect(tocou.some((t) => t > 300 && t <= 400)).toBe(false);
  });

  it('andando (fora da vaga), nada', () => {
    let e: EstadoSorvete = { proxima: 0 };
    for (let t = 0; t < 400; t += 1) {
      const r = passo(e, t, { naVaga: false });
      expect(r.tocar).toBeNull();
      e = r.estado;
    }
  });
});
