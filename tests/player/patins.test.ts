import { describe, expect, it } from 'vitest';
import {
  DESLIZE_PATINS,
  VEL_ANDAR,
  criarJogador,
  passoFisica,
  type ComandoMovimento,
  type Solido,
} from '../../src/player/fisica';

/**
 * Spec 026: os patins da Vila Neon (experiência medida): a velocidade máxima é a de andar; ao
 * soltar o controle na pista, desliza 0,5 ± 0,1 s; fora da pista para na hora; nunca cai.
 */
const chao: Solido = (_x, y) => y < 0;
const parado: ComandoMovimento = { frente: 0, direita: 0, pular: false, correr: false, yaw: 0 };
const naPista = { pista: () => true };
const foraDaPista = { pista: () => false };
const DT = 1 / 60;

/** Anda 1 s para a frente e solta: quanto tempo ainda se mexe, e quanto andou. */
function soltar(patins?: ComandoMovimento['patins'], correr = false) {
  const j = criarJogador(0.5, 0, 0.5);
  j.noChao = true;
  for (let i = 0; i < 60; i++) passoFisica(j, { ...parado, frente: 1, correr, patins }, DT, chao);
  const zAndou = j.z;
  let mexendo = 0;
  for (let i = 0; i < 120; i++) {
    const antes = j.z;
    passoFisica(j, { ...parado, patins }, DT, chao);
    if (j.z - antes > 1e-6) mexendo += DT;
  }
  return { zAndou, mexendo, j };
}

describe('os patins (spec 026)', () => {
  it('a velocidade máxima é a de andar, mesmo correndo', () => {
    const { zAndou } = soltar(naPista, true);
    expect(zAndou - 0.5).toBeCloseTo(VEL_ANDAR, 1);
  });

  it('na pista, desliza 0,5 ± 0,1 s ao soltar', () => {
    const { mexendo } = soltar(naPista);
    expect(DESLIZE_PATINS).toBe(0.5);
    expect(mexendo).toBeGreaterThanOrEqual(0.4);
    expect(mexendo).toBeLessThanOrEqual(0.6);
  });

  it('fora da pista (e sem patins) para na hora', () => {
    expect(soltar(foraDaPista).mexendo).toBe(0);
    expect(soltar(undefined).mexendo).toBe(0);
  });

  it('virar é direto: o embalo novo segue o controle, sem escorregar de lado', () => {
    const j = criarJogador(0.5, 0, 0.5);
    j.noChao = true;
    for (let i = 0; i < 30; i++)
      passoFisica(j, { ...parado, frente: 1, patins: naPista }, DT, chao);
    const x0 = j.x;
    // vira 90° e anda: o x muda, o z quase nada
    const z0 = j.z;
    for (let i = 0; i < 30; i++)
      passoFisica(j, { ...parado, frente: 1, yaw: Math.PI / 2, patins: naPista }, DT, chao);
    expect(j.x - x0).toBeGreaterThan(1);
    expect(Math.abs(j.z - z0)).toBeLessThan(1e-6);
  });

  it('nunca cai: no chão o tempo todo', () => {
    const { j } = soltar(naPista);
    expect(j.noChao).toBe(true);
    expect(j.y).toBe(0);
  });
});
