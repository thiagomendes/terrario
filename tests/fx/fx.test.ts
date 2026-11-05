import { describe, expect, it } from 'vitest';
import { corMediaDoBloco } from '../../src/fx/cores';
import { criarPoolParticulas, VIDA_PARTICULA } from '../../src/fx/particulas';
import { coberturaRachadura, gerarTexturaRachadura } from '../../src/fx/rachadura';
import { TETO_LUMINANCIA_EMISSIVA, luminancia } from '../../src/render/emissivo';
import { Bloco, REGISTRO_BLOCOS } from '../../src/world/blocks';

const part = (vy = 0) => ({
  x: 0,
  y: 0,
  z: 0,
  vx: 0,
  vy,
  vz: 0,
  cor: [1, 1, 1] as [number, number, number],
});

describe('pool de partículas', () => {
  it('limita a 64 e devolve só o que coube', () => {
    const pool = criarPoolParticulas(64);
    const buf = pool.posicoes.length;
    expect(pool.emitir(Array.from({ length: 50 }, () => part()))).toBe(50);
    expect(pool.emitir(Array.from({ length: 30 }, () => part()))).toBe(14);
    expect(pool.vivas()).toBe(64);
    expect(pool.emitir([part()])).toBe(0);
    expect(pool.posicoes.length).toBe(buf);
  });

  it('aplica gravidade, expira e libera espaço', () => {
    const pool = criarPoolParticulas(64);
    pool.emitir(Array.from({ length: 64 }, () => part()));
    pool.atualizar(0.1);
    expect(pool.posicoes[1]).toBeLessThan(0);
    pool.atualizar(VIDA_PARTICULA);
    expect(pool.vivas()).toBe(0);
    expect(pool.emitir([part(), part()])).toBe(2);
  });
});

describe('cor média', () => {
  it('existe para todo sólido ou planta', () => {
    for (const d of REGISTRO_BLOCOS) {
      const c = corMediaDoBloco(d.id);
      if (d.solido || d.planta) {
        expect(c).toBeDefined();
        c!.forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
      } else expect(c).toBeUndefined();
    }
  });

  it('terra, pedra e areia são distintas', () => {
    const [t, p, a] = [Bloco.TERRA_MUSGOSA, Bloco.PEDRA_RACHADA, Bloco.AREIA_BRUMA].map(
      (b) => corMediaDoBloco(b)!,
    );
    const dist = (x: number[], y: number[]) => Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
    expect(dist(t, p)).toBeGreaterThan(20);
    expect(dist(t, a)).toBeGreaterThan(20);
    expect(dist(p, a)).toBeGreaterThan(20);
  });

  it('cristal abaixo do teto e não quase branco', () => {
    const c = corMediaDoBloco(Bloco.CRISTAL_LUZ)!;
    expect(luminancia(c[0], c[1], c[2])).toBeLessThan(TETO_LUMINANCIA_EMISSIVA);
    expect(c.filter((v) => v < 235).length).toBeGreaterThan(1);
  });
});

describe('textura de rachadura', () => {
  it('é determinística e a cobertura cresce do estágio 1 ao 5', () => {
    const cob = [1, 2, 3, 4, 5].map((e) => coberturaRachadura(gerarTexturaRachadura(e, 7)));
    for (let i = 1; i < 5; i++) expect(cob[i]).toBeGreaterThan(cob[i - 1]);
    expect(cob[0]).toBeGreaterThan(0);
    expect(cob[4]).toBeLessThan(32 * 32);
    expect(gerarTexturaRachadura(3, 7)).toEqual(gerarTexturaRachadura(3, 7));
    expect(gerarTexturaRachadura(3, 7)).not.toEqual(gerarTexturaRachadura(3, 8));
  });

  it('é transparente fora das rachaduras', () => {
    const t = gerarTexturaRachadura(1, 7);
    let transparentes = 0;
    for (let i = 3; i < t.length; i += 4) if (t[i] === 0) transparentes++;
    expect(transparentes).toBeGreaterThan(32 * 32 * 0.8);
  });
});
