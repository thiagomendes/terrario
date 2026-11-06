import { describe, expect, it } from 'vitest';
import { registrarCatalogo } from '../../src/jogo/catalogo';
import { obterItem } from '../../src/jogo/itens';
import { extrudarGrade, gradeDoItem, LADO_GRADE } from '../../src/personagem/itemVoxel';

registrarCatalogo();

describe('item em pixels 3D', () => {
  it('lê o desenho da picareta numa grade 16x16', () => {
    const def = obterItem('picareta_ferro')!;
    const g = gradeDoItem(def);
    expect(g).toHaveLength(LADO_GRADE);
    expect(g.every((l) => l.length === LADO_GRADE)).toBe(true);
    expect(g.flat().filter(Boolean).length).toBeGreaterThan(20);
  });

  it('troca o contorno preto por um tom escuro do vizinho', () => {
    const def = obterItem('picareta_ferro')!;
    const cru = gradeDoItem(def);
    const suave = gradeDoItem(def, { suavizarContorno: true });
    // mesmo formato (o contorno ainda existe), cores do contorno mais claras que o preto
    const pretos = (g: typeof cru) => g.flat().filter((c) => c && c[0] + c[1] + c[2] < 0.3).length;
    expect(pretos(suave)).toBeLessThan(pretos(cru));
  });

  it('extruda frente, verso e só as bordas expostas', () => {
    const g = gradeDoItem({ id: 'x', nome: 'x', tipo: 'material', pilha: 1, cor: '#ff0000' });
    const cheios = g.flat().filter(Boolean).length; // quadrado 8x8
    expect(cheios).toBe(64);
    const m = extrudarGrade(g, 0.1, 0.1);
    // 2 faces por pixel + 4 lados de 8 pixels de borda
    const quads = m.indices.length / 6;
    expect(quads).toBe(64 * 2 + 4 * 8);
    expect(m.posicoes.length / 3).toBe(quads * 4);
    expect(m.cores.length / 4).toBe(quads * 4);
    const xs = m.posicoes.filter((_, i) => i % 3 === 0);
    expect(Math.min(...xs)).toBeCloseTo(-0.4);
    expect(Math.max(...xs)).toBeCloseTo(0.4);
  });
});
