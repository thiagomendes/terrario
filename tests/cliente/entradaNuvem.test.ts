import { describe, expect, it } from 'vitest';
import MAIN from '../../src/main.ts?raw';

/**
 * Spec 034 (a 035 faz o conserto completo): entre o "bem-vindo" do servidor e a cena, que liga o
 * estado do cliente à conexão, a página não pode esperar nada (um `await`, como a leitura do
 * IndexedDB que havia ali). O primeiro quadro chega logo atrás do bem-vindo e a conexão só entrega a quem já
 * ouve: se ele chega nessa espera, se perde, e quem criou o mundo e o levou para a nuvem não vê
 * mais ninguém. Os `import()` dos esboços só correm com `?esboco=` e ficam de fora.
 */
describe('a entrada na nuvem em src/main.ts', () => {
  const inicio = MAIN.indexOf('const r = await pedido;');
  const fim = MAIN.indexOf('cena = criarCena(', inicio);
  // o ramo do mundo do aparelho (sem nuvem) e os ganchos da interface não correm nesse trecho
  const ramoDoAparelho = /\} else \{\n {4}const pedido = params\.get\('mundo'\);[\s\S]*?\n {2}\}\n/;
  const trecho = MAIN.slice(inicio + 'const r = await pedido;'.length, fim)
    .replace(ramoDoAparelho, '')
    .replace(/criarInterface\(app, hotbar, \{[\s\S]*?\n {2}\}\);/, '');

  it('o trecho existe', () => {
    expect(inicio).toBeGreaterThan(0);
    expect(fim).toBeGreaterThan(inicio);
    expect(trecho).toContain('nuvem.novo');
  });

  it('nada espera entre o bem-vindo e a cena (fora os esboços)', () => {
    const esperas = trecho
      .split('\n')
      .filter((l) => /\bawait\b/.test(l))
      .filter((l) => !/await import\('\.\/esboco\//.test(l));
    expect(esperas).toEqual([]);
  });

  it('a lista do aparelho de quem levou o mundo é lida antes de conectar', () => {
    const lida = MAIN.indexOf("const doAparelho = sala && params.get('novo') === '1'");
    expect(lida).toBeGreaterThan(0);
    expect(lida).toBeLessThan(MAIN.indexOf('entrarNaSala('));
  });
});
