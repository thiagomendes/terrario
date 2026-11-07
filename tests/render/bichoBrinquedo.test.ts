import { describe, expect, it } from 'vitest';
import { BRILHO_MAXIMO, CABECA_MAIOR, bichoDeBrinquedo } from '../../src/render/bichoBrinquedo';
import { obterTema, temasDisponiveis } from '../../src/temas';
import type { PecaCriatura } from '../../src/temas/tipos';

const raposa: PecaCriatura[] = [
  { t: [0.4, 0.3, 0.6], p: [0, 0.45, 0], cor: '#e07a3a' },
  { t: [0.1, 0.3, 0.1], p: [0.12, 0.15, 0.2], cor: '#e07a3a', papel: 'perna0' },
  { t: [0.32, 0.3, 0.3], p: [0, 0.7, 0.35], cor: '#e07a3a', papel: 'cabeca' },
  { t: [0.06, 0.06, 0.02], p: [0.08, 0.75, 0.5], cor: '#1a1420', papel: 'cabeca' },
  { t: [0.3, 0.12, 0.1], p: [0, 0.5, -0.35], cor: '#ffffff', papel: 'cauda', alfa: 0.6, brilho: 1 },
];

describe('bichos de brinquedo', () => {
  const b = bichoDeBrinquedo(raposa);
  it('a cabeça cresce em volta do próprio centro', () => {
    const cab = b.find((p) => p.papel === 'cabeca' && p.forma === 'caixa')!;
    expect(cab.t[0]).toBeCloseTo(0.32 * CABECA_MAIOR, 5);
  });
  it('o olho vira bolinha com brilho branco e bochecha', () => {
    const bolas = b.filter((p) => p.papel === 'cabeca' && p.forma === 'bola');
    expect(bolas.length).toBe(3);
    expect(bolas.some((p) => p.cor === '#ffffff')).toBe(true);
  });
  it('patas e rabo de cápsula; nada translúcido; brilho com teto', () => {
    expect(b.find((p) => p.papel === 'perna0')!.forma).toBe('capsula');
    expect(b.find((p) => p.papel === 'cauda')!.forma).toBe('capsula');
    for (const p of b) {
      expect(p.alfa).toBeUndefined();
      expect(p.brilho ?? 0).toBeLessThanOrEqual(BRILHO_MAXIMO);
    }
  });
  it('vale para todos os bichos dos seis temas', () => {
    for (const id of temasDisponiveis()) {
      const t = obterTema(id);
      for (const [tipo, pecas] of Object.entries(t.criaturas)) {
        const r = bichoDeBrinquedo(pecas as PecaCriatura[]);
        expect(r.length, `${id}/${tipo}`).toBeGreaterThanOrEqual((pecas as PecaCriatura[]).length);
        for (const p of r) for (const v of [...p.t, ...p.p]) expect(Number.isFinite(v)).toBe(true);
      }
    }
  });
});
