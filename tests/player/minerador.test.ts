import { describe, expect, it } from 'vitest';
import { criarBarramento } from '../../src/player/eventos';
import { criarMinerador } from '../../src/player/minerador';
import { Bloco } from '../../src/world/blocks';

const alvo = { x: 1, y: 5, z: 1, bloco: Bloco.PEDRA_RACHADA };

function montar() {
  const barramento = criarBarramento();
  const log: string[] = [];
  barramento.ouvir('golpe', () => log.push('golpe'));
  barramento.ouvir('quebra', (d) => log.push(`quebra:${d.bloco}`));
  let quebras = 0;
  const m = criarMinerador({
    barramento,
    quebrar: () => {
      quebras++;
      return true;
    },
  });
  return { m, log, quebras: () => quebras };
}

describe('barramento', () => {
  it('ouvinte que lança não impede os outros e cancelamento funciona', () => {
    const b = criarBarramento();
    let n = 0;
    b.ouvir('slot', () => {
      throw new Error('x');
    });
    const cancela = b.ouvir('slot', () => n++);
    b.emitir('slot', { indice: 1 });
    expect(n).toBe(1);
    cancela();
    b.emitir('slot', { indice: 1 });
    expect(n).toBe(1);
  });
});

describe('minerador', () => {
  it('quebra só ao completar a dureza e emite golpes periódicos', () => {
    const { m, log, quebras } = montar();
    m.pressionar();
    for (let i = 0; i < 90; i++) m.atualizar(1 / 60, alvo);
    expect(quebras()).toBe(0);
    const golpes = log.filter((l) => l === 'golpe').length;
    expect(golpes).toBeGreaterThanOrEqual(5);
    expect(golpes).toBeLessThanOrEqual(6);
    for (let i = 0; i < 10; i++) m.atualizar(1 / 60, alvo);
    expect(quebras()).toBe(1);
    expect(log).toContain(`quebra:${Bloco.PEDRA_RACHADA}`);
  });

  it('soltar e perderBloqueio interrompem; dano decai e retoma do valor decaído', () => {
    for (const parar of ['soltar', 'perderBloqueio'] as const) {
      const { m, quebras } = montar();
      m.pressionar();
      for (let i = 0; i < 60; i++) m.atualizar(1 / 60, alvo);
      m[parar]();
      for (let i = 0; i < 120; i++) m.atualizar(1 / 60, alvo);
      expect(quebras()).toBe(0);
      expect(m.progresso).toBe(0);
    }
    const { m } = montar();
    m.pressionar();
    for (let i = 0; i < 90; i++) m.atualizar(1 / 60, alvo);
    const antes = m.progresso;
    expect(antes).toBeGreaterThan(0.4);
    m.soltar();
    for (let i = 0; i < 30; i++) m.atualizar(1 / 60, alvo);
    const meio = m.progresso;
    expect(meio).toBe(0);
    m.pressionar();
    m.atualizar(1 / 60, alvo);
    expect(m.progresso).toBeGreaterThan(0.1);
    expect(m.progresso).toBeLessThan(antes);
  });

  it('recusa quando quebrar devolve false', () => {
    const barramento = criarBarramento();
    const motivos: string[] = [];
    barramento.ouvir('recusa', (d) => motivos.push(d.motivo));
    const m = criarMinerador({ barramento, quebrar: () => false });
    m.pressionar();
    for (let i = 0; i < 120; i++) m.atualizar(1 / 60, alvo);
    expect(motivos).toContain('quebra');
  });

  it('soltar e trocar de slot interrompem sem quebrar', () => {
    const { m, quebras } = montar();
    m.pressionar();
    for (let i = 0; i < 60; i++) m.atualizar(1 / 60, alvo);
    m.trocarSlot(2);
    for (let i = 0; i < 120; i++) m.atualizar(1 / 60, alvo);
    expect(quebras()).toBe(0);
    expect(m.progresso).toBe(0);
  });
});
