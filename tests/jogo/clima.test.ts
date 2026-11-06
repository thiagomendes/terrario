import { describe, expect, it } from 'vitest';
import { criarClima, estacaoDoDia } from '../../src/jogo/clima';
import { criarGerador } from '../../src/audio/variacao';

describe('clima e estações', () => {
  it('estações mudam a cada 3 dias e repetem', () => {
    expect(estacaoDoDia(0)).toBe('primavera');
    expect(estacaoDoDia(3)).toBe('verao');
    expect(estacaoDoDia(8)).toBe('outono');
    expect(estacaoDoDia(9)).toBe('inverno');
    expect(estacaoDoDia(12)).toBe('primavera');
  });

  it('chuva sobe aos poucos e a tempestade solta relâmpagos', () => {
    const c = criarClima(criarGerador(1));
    c.definir('tempestade', 1000);
    c.atualizar(1, 'verao', true);
    expect(c.estado.chuva).toBeGreaterThan(0);
    expect(c.estado.chuva).toBeLessThan(0.2);
    let raios = 0;
    for (let t = 0; t < 200; t++) if (c.atualizar(1, 'verao', true)) raios++;
    expect(c.estado.chuva).toBeGreaterThan(0.95);
    expect(raios).toBeGreaterThan(3);
  });

  it('arco-íris aparece quando a chuva acaba de dia', () => {
    const c = criarClima(criarGerador(5));
    c.definir('chuva', 0.5);
    let arco = 0;
    for (let i = 0; i < 400 && arco === 0; i++) {
      c.atualizar(1, 'verao', true);
      if (c.estado.tipo === 'chuva') c.definir('chuva', 0.5);
      arco = c.estado.arco;
      if (c.estado.tipo !== 'chuva' && c.estado.tipo !== 'tempestade' && arco === 0)
        c.definir('chuva', 0.5);
    }
    expect(arco).toBeGreaterThan(0);
  });

  it('é salvo e carregado', () => {
    const c = criarClima(criarGerador(2));
    c.definir('neblina', 99);
    const d = criarClima(criarGerador(2), JSON.parse(JSON.stringify(c.salvar())));
    expect(d.estado.tipo).toBe('neblina');
  });
});
