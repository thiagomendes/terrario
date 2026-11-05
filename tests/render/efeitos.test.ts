import { describe, expect, it } from 'vitest';
import {
  DURACAO_PULSO,
  escalaPulso,
  estadoRachadura,
  opacidadePulso,
  planejarEfeito,
} from '../../src/render/efeitos';
import { corMediaDoBloco } from '../../src/fx/cores';
import { criarPoolParticulas, LIMITE_PARTICULAS } from '../../src/fx/particulas';
import { Bloco } from '../../src/world/blocks';

const pos = { x: 3, y: 10, z: 4 };

describe('planejarEfeito', () => {
  it('quebra solta 10 partículas com a cor do bloco', () => {
    const p = planejarEfeito('quebra', { ...pos, bloco: Bloco.PEDRA_RACHADA });
    expect(p.particulas).toHaveLength(10);
    const cor = corMediaDoBloco(Bloco.PEDRA_RACHADA);
    expect(cor).toBeDefined();
    for (const q of p.particulas) expect(q.cor).toEqual(cor);
    expect(p.pulso).toBe(false);
  });

  it('golpe solta 2', () => {
    expect(planejarEfeito('golpe', { ...pos, bloco: Bloco.TERRA_MUSGOSA }).particulas).toHaveLength(
      2,
    );
  });

  it('colocação solta 4 de poeira e pulso', () => {
    const p = planejarEfeito('colocacao', { ...pos, bloco: Bloco.TABUAS });
    expect(p.particulas).toHaveLength(4);
    expect(p.pulso).toBe(true);
  });

  it('recusa e slot não soltam nada', () => {
    for (const p of [
      planejarEfeito('recusa', { motivo: 'x' }),
      planejarEfeito('slot', { indice: 1 }),
    ]) {
      expect(p.particulas).toHaveLength(0);
      expect(p.pulso).toBe(false);
    }
  });

  it('é determinístico com a mesma semente e respeita o limite do pool', () => {
    const a = planejarEfeito('quebra', { ...pos, bloco: Bloco.AREIA_BRUMA });
    const b = planejarEfeito('quebra', { ...pos, bloco: Bloco.AREIA_BRUMA });
    expect(a).toEqual(b);
    const pool = criarPoolParticulas();
    for (let i = 0; i < 20; i++) pool.emitir(a.particulas);
    expect(pool.vivas()).toBe(LIMITE_PARTICULAS);
  });
});

describe('pulso de colocação', () => {
  it('escala sobe e desce, volta ao repouso em até 0,2 s', () => {
    expect(DURACAO_PULSO).toBeLessThanOrEqual(0.2);
    expect(escalaPulso(0)).toBe(1);
    expect(escalaPulso(DURACAO_PULSO)).toBe(1);
    const meio = escalaPulso(DURACAO_PULSO / 2);
    expect(meio).toBeGreaterThan(1);
    let anterior = 1;
    for (let t = 0; t <= DURACAO_PULSO / 2; t += 0.005) {
      const e = escalaPulso(t);
      expect(e).toBeGreaterThanOrEqual(anterior);
      anterior = e;
    }
    anterior = meio;
    for (let t = DURACAO_PULSO / 2; t <= DURACAO_PULSO; t += 0.005) {
      const e = escalaPulso(t);
      expect(e).toBeLessThanOrEqual(anterior + 1e-12);
      anterior = e;
    }
  });

  it('opacidade decresce monotonicamente até 0', () => {
    let anterior = opacidadePulso(0);
    for (let t = 0.01; t <= DURACAO_PULSO; t += 0.01) {
      const o = opacidadePulso(t);
      expect(o).toBeLessThanOrEqual(anterior);
      anterior = o;
    }
    expect(opacidadePulso(DURACAO_PULSO)).toBe(0);
  });
});

describe('estadoRachadura', () => {
  it('visível só com bloco minerado e dano', () => {
    expect(estadoRachadura('1,2,3', 0.5)).toEqual({ visivel: true, estagio: 3 });
    expect(estadoRachadura('1,2,3', 1).estagio).toBe(5);
    expect(estadoRachadura(null, 0.5)).toEqual({ visivel: false, estagio: 0 });
    expect(estadoRachadura('1,2,3', 0)).toEqual({ visivel: false, estagio: 0 });
  });
});
