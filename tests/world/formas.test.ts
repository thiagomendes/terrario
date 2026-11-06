import { describe, expect, it } from 'vitest';
import { caixasDoBloco, direcaoDoYaw, temFormaParcial } from '../../src/world/formas';
import { Bloco } from '../../src/world/blocks';
import { criarJogador, passoFisica, type Solido } from '../../src/player/fisica';
import { criarEdicoes, metasDoChunk } from '../../src/world/edicoes';

describe('formas', () => {
  it('laje é meio bloco e escada tem o degrau do lado da direção', () => {
    expect(caixasDoBloco(Bloco.LAJE, 0)).toEqual([[0, 0, 0, 1, 0.5, 1]]);
    const norte = caixasDoBloco(Bloco.ESCADA, 0)![1];
    const sul = caixasDoBloco(Bloco.ESCADA, 2)![1];
    expect(norte[2]).toBe(0.5);
    expect(sul[5]).toBe(0.5);
    expect(caixasDoBloco(Bloco.PEDRA_RACHADA, 0)).toBeNull();
    expect(temFormaParcial(Bloco.TOCHA)).toBe(true);
  });

  it('cerca ganha barras só onde conecta e porta aberta gira', () => {
    expect(caixasDoBloco(Bloco.CERCA, 0, () => false)).toHaveLength(1);
    expect(caixasDoBloco(Bloco.CERCA, 0, (d) => d === 1)).toHaveLength(3);
    expect(caixasDoBloco(Bloco.PORTA, 0)).not.toEqual(caixasDoBloco(Bloco.PORTA_ABERTA, 0));
  });

  it('direção do olhar nos 4 eixos', () => {
    expect(direcaoDoYaw(0)).toBe(0);
    expect(direcaoDoYaw(Math.PI / 2)).toBe(1);
    expect(direcaoDoYaw(Math.PI)).toBe(2);
    expect(direcaoDoYaw(-Math.PI / 2)).toBe(3);
  });

  it('metadado sobrevive nas edições', () => {
    const e = criarEdicoes();
    e.definir(3, 10, 4, Bloco.FORNALHA, 2);
    expect(e.obter(3, 10, 4)).toBe(Bloco.FORNALHA);
    expect(e.obterMeta(3, 10, 4)).toBe(2);
    expect([...metasDoChunk(0, 0, e).values()]).toEqual([2]);
  });
});

describe('colisão com blocos parciais', () => {
  // chão em y < 10, laje em (0..1, 10, 0..1) e (1, 10, 0)
  const lajes = new Set(['0,10,0', '1,10,0']);
  const s = ((x: number, y: number, z: number) => y < 10 || lajes.has(`${x},${y},${z}`)) as Solido;
  s.caixas = (x, y, z) => (lajes.has(`${x},${y},${z}`) ? caixasDoBloco(Bloco.LAJE, 0) : null);

  it('fica em pé em cima da laje (meia altura)', () => {
    const j = criarJogador(0.5, 12, 0.5);
    for (let i = 0; i < 120; i++)
      passoFisica(j, { frente: 0, direita: 0, pular: false, correr: false, yaw: 0 }, 1 / 60, s);
    expect(j.y).toBeCloseTo(10.5, 3);
  });

  it('sobe a laje andando, sem pular', () => {
    const j = criarJogador(0.5, 10, -1.5);
    for (let i = 0; i < 60; i++)
      passoFisica(j, { frente: 0, direita: 0, pular: false, correr: false, yaw: 0 }, 1 / 60, s);
    for (let i = 0; i < 40; i++)
      passoFisica(j, { frente: 1, direita: 0, pular: false, correr: false, yaw: 0 }, 1 / 60, s);
    expect(j.z).toBeGreaterThan(0.2);
    expect(j.y).toBeGreaterThan(10.4);
  });
});
