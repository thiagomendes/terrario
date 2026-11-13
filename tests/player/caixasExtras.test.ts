import { describe, expect, it } from 'vitest';
import {
  comCaixasExtras,
  criarJogador,
  dentroDaCaixa,
  passoFisica,
  type CaixaSolida,
  type ComandoMovimento,
  type Solido,
} from '../../src/player/fisica';

/**
 * Spec 014 (T14): os carrinhos são caixas sólidas fora dos blocos. O boneco esbarra de lado,
 * sobe em cima (como numa laje) e nunca fica preso dentro de uma.
 */
const chao = ((_x: number, y: number) => y <= 59) as Solido;
const frenteX: ComandoMovimento = {
  frente: 1,
  direita: 0,
  pular: false,
  correr: false,
  yaw: Math.PI / 2,
};
/** Um carrinho de 3 de comprido, 1,6 de largura e 1,3 de altura, de x=6 a 9. */
const carro: CaixaSolida = [6, 60, 4.7, 9, 61.3, 6.3];

describe('caixas sólidas dos veículos', () => {
  it('andando contra o carrinho, o boneco para encostado nele', () => {
    const s = comCaixasExtras(chao, () => [carro]);
    const j = criarJogador(3.5, 60, 5.5);
    for (let i = 0; i < 120; i++) passoFisica(j, { ...frenteX }, 1 / 60, s);
    expect(j.x).toBeLessThan(6);
    expect(j.x).toBeGreaterThan(5.5);
    expect(j.y).toBeCloseTo(60, 3);
  });

  it('dá para ficar em pé no teto', () => {
    const s = comCaixasExtras(chao, () => [carro]);
    const j = criarJogador(7.5, 62, 5.5);
    for (let i = 0; i < 90; i++)
      passoFisica(j, { frente: 0, direita: 0, pular: false, correr: false, yaw: 0 }, 1 / 60, s);
    expect(j.y).toBeCloseTo(61.3, 2);
    expect(j.noChao).toBe(true);
  });

  it('sem caixas, é o mundo de sempre; dentro de uma caixa, ela não conta (nunca prende)', () => {
    const s = comCaixasExtras(chao, () => []);
    expect(s(7, 60, 5)).toBe(false);
    expect(s(7, 59, 5)).toBe(true);
    expect(dentroDaCaixa(carro, { x: 7.5, y: 60, z: 5.5 })).toBe(true);
    expect(dentroDaCaixa(carro, { x: 7.5, y: 61.3, z: 5.5 })).toBe(false);
  });
});
