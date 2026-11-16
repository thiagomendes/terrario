import { describe, expect, it } from 'vitest';
import {
  ALVO_RMS_DB,
  FLOREIO,
  PICO_MAXIMO,
  REALEJO,
  TAXA_PARQUE,
  agua,
  algodao,
  argola,
  balao,
  emDb,
  estouro,
  floreio,
  picoDe,
  renderizarRealejo,
  renderizarRealejoAosPoucos,
  risada,
  rmsSoando,
  roda,
  sininho,
  tum,
  zumbido,
} from '../../src/audio/realejo';

const TAXA = TAXA_PARQUE;
const REAL = renderizarRealejo(TAXA);

/** O maior salto entre duas amostras seguidas (dentro do som). */
function maiorSalto(x: Float32Array): number {
  let m = 0;
  for (let i = 1; i < x.length; i++) m = Math.max(m, Math.abs(x[i] - x[i - 1]));
  return m;
}

const media = (x: Float32Array) => x.reduce((s, v) => s + v, 0) / x.length;

const CURTOS: [string, () => Float32Array, number][] = [
  ['tum', () => tum(TAXA), 0.25],
  ['risada 0', () => risada(0, TAXA), 0.62],
  ['risada 1', () => risada(1, TAXA), 0.62],
  ['sininho', () => sininho(TAXA), 0.5],
  ['estouro 0', () => estouro(0, TAXA), 0.7],
  ['estouro 1', () => estouro(1, TAXA), 0.7],
  ['estouro 2', () => estouro(2, TAXA), 0.7],
  ['balao', () => balao(TAXA), 0.35],
  ['argola', () => argola(TAXA), 0.4],
  ['agua', () => agua(TAXA), 0.25],
  ['algodao', () => algodao(TAXA), 1.2],
  ['roda', () => roda(TAXA), 0.9],
  ['floreio', () => floreio(TAXA), 2.82],
];

describe('a partitura do realejo', () => {
  it('valsa de 16 compassos de 3/4, de 20 a 26 s; cada compasso da melodia soma 3 batidas', () => {
    expect(REALEJO.compassos).toBe(16);
    expect(REALEJO.duracao).toBeCloseTo((16 * 3 * 60) / REALEJO.bpm, 9);
    expect(REALEJO.duracao).toBeGreaterThanOrEqual(20);
    expect(REALEJO.duracao).toBeLessThanOrEqual(26);
    const mel = REALEJO.notas.filter((n) => n.voz === 'melodia');
    for (let c = 0; c < 16; c++) {
      const soma = mel.filter((n) => n.t >= c * 3 && n.t < c * 3 + 3).reduce((s, n) => s + n.d, 0);
      expect(soma, `compasso ${c + 1}`).toBeCloseTo(3, 9);
    }
    // o pum-pá-pá: o baixo no 1, o acorde no 2 e no 3 de todo compasso
    for (let c = 0; c < 16; c++) {
      expect(REALEJO.notas.some((n) => n.voz === 'baixo' && n.t === c * 3)).toBe(true);
      for (const b of [1, 2])
        expect(REALEJO.notas.filter((n) => n.voz === 'acorde' && n.t === c * 3 + b)).toHaveLength(
          3,
        );
    }
    // nada passa do fim (o que soa depois é só a cauda, que volta no começo)
    for (const n of REALEJO.notas) expect(n.t + n.d).toBeLessThanOrEqual(48 + 1e-9);
    expect(FLOREIO.notas.every((n) => n.t + n.d <= FLOREIO.compassos * 3)).toBe(true);
  });
});

describe('o laço do realejo', () => {
  it('dura exatamente a música, sem NaN, sem desvio de zero, pico até 0,9, na régua de -23 dB', () => {
    expect(REAL.length).toBe(Math.round(REALEJO.duracao * TAXA));
    expect(REAL.every(Number.isFinite)).toBe(true);
    expect(Math.abs(media(REAL))).toBeLessThan(1e-4);
    expect(picoDe(REAL)).toBeLessThanOrEqual(PICO_MAXIMO);
    expect(Math.abs(emDb(rmsSoando(REAL, TAXA)) - ALVO_RMS_DB)).toBeLessThan(1.5);
  });

  it('a emenda do laço é contínua (nenhum salto maior que os de dentro, nada de estalo)', () => {
    const emenda = Math.abs(REAL[REAL.length - 1] - REAL[0]);
    expect(emenda).toBeLessThan(0.05);
    expect(emenda).toBeLessThanOrEqual(maiorSalto(REAL));
    // e os primeiros e últimos 5 ms não têm degrau maior que o resto da música
    const borda = Math.round(0.005 * TAXA);
    const ini = maiorSalto(REAL.subarray(0, borda));
    const fim = maiorSalto(REAL.subarray(REAL.length - borda));
    expect(Math.max(ini, fim)).toBeLessThanOrEqual(maiorSalto(REAL));
  });

  it('o mesmo laço toda vez, e o feito aos poucos é igual ao feito de uma vez', () => {
    expect(renderizarRealejo(TAXA)).toEqual(REAL);
    const g = renderizarRealejoAosPoucos(TAXA, 4);
    let passos = 0;
    let r = g.next();
    while (!r.done) {
      passos++;
      r = g.next();
    }
    expect(passos).toBeGreaterThan(20);
    expect(r.value).toEqual(REAL);
  });
});

describe('os toques curtos', () => {
  it.each(CURTOS)(
    '%s: duração, sem NaN, sem estalo, sem desvio, pico até 0,9, na régua',
    (_, f, dur) => {
      const x = f();
      expect(x.length / TAXA).toBeCloseTo(dur, 1);
      expect(x.every(Number.isFinite)).toBe(true);
      expect(Math.abs(x[0])).toBeLessThan(1e-3);
      expect(Math.abs(x[x.length - 1])).toBeLessThan(1e-3);
      expect(Math.abs(media(x))).toBeLessThan(2e-3);
      expect(picoDe(x)).toBeLessThanOrEqual(PICO_MAXIMO);
      expect(Math.abs(emDb(rmsSoando(x, TAXA)) - ALVO_RMS_DB)).toBeLessThan(1.5);
      // o mesmo som toda vez
      expect(f()).toEqual(x);
    },
  );

  it('as duas risadas e os estouros de sementes diferentes não são iguais', () => {
    expect(risada(0, TAXA)).not.toEqual(risada(1, TAXA));
    expect(estouro(0, TAXA)).not.toEqual(estouro(1, TAXA));
  });

  it('o zumbido: laço de 2 s sem emenda, baixinho no pico, na régua', () => {
    const z = zumbido(TAXA);
    expect(z.length).toBe(2 * TAXA);
    expect(z.every(Number.isFinite)).toBe(true);
    expect(Math.abs(media(z))).toBeLessThan(1e-4);
    expect(picoDe(z)).toBeLessThanOrEqual(PICO_MAXIMO);
    expect(Math.abs(emDb(rmsSoando(z, TAXA)) - ALVO_RMS_DB)).toBeLessThan(1.5);
    const emenda = Math.abs(z[z.length - 1] - z[0]);
    expect(emenda).toBeLessThanOrEqual(maiorSalto(z));
    // a emenda é como um passo qualquer do meio (o laço "continua" sem degrau)
    const meio = z.length / 2;
    expect(emenda).toBeLessThan(Math.abs(z[meio] - z[meio - 1]) + 0.02);
    expect(zumbido(TAXA)).toEqual(z);
  });

  it('noutra taxa (44,1 kHz) também fica na régua', () => {
    const x = sininho(44100);
    expect(x.length).toBe(Math.round(0.5 * 44100));
    expect(Math.abs(emDb(rmsSoando(x, 44100)) - ALVO_RMS_DB)).toBeLessThan(1.5);
  });
});
