import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Bloco } from '../../src/world/blocks';
import {
  alcancaRetangulo,
  alcancaveis,
  blocoDaPlanta,
  casaGeminada,
  chegaAoTerraco,
  comodoLivre,
  legendaDaGeminada,
  plantaEmTexto,
  por,
  LARGURA_GEMINADA,
  PROFUNDIDADE_GEMINADA,
  type ParametrosPredio,
  type Planta,
} from '../../src/world/plantas';

/**
 * Spec 014, T01: as plantas dos prédios em código. Cada modelo, em cada combinação de
 * parâmetros, tem porta para a rua, escada até o terraço, cômodos de pelo menos 5 × 5 com
 * 3 blocos livres e nada fora do lote. A casa geminada de 3 andares fica gravada em texto.
 */

function combinacoes(andares: readonly number[]): ParametrosPredio[] {
  const r: ParametrosPredio[] = [];
  for (const n of andares)
    for (const espelho of [false, true])
      for (const caixaDagua of [false, true])
        for (const corPorta of [0, 3])
          r.push({
            andares: n,
            espelho,
            caixaDagua,
            corPorta,
            corToldo: corPorta ? 'verde' : 'vermelho',
            loja: false,
            luzes: n * 7 + corPorta,
          });
  return r;
}

function conferirForma(p: Planta, lote: [number, number], nome: string): void {
  expect(p.largura, `${nome}: largura`).toBeLessThanOrEqual(lote[0]);
  expect(p.profundidade, `${nome}: profundidade`).toBeLessThanOrEqual(lote[1]);
  // porta de duas metades, de frente para a rua
  const [ps, pf, py] = p.porta;
  expect(blocoDaPlanta(p, ps, pf, py), `${nome}: porta`).toBe(Bloco.PORTA);
  expect(blocoDaPlanta(p, ps, pf, py + 1), `${nome}: metade de cima da porta`).toBe(Bloco.PORTA);
  const vistos = alcancaveis(p);
  // a soleira (dentro, logo atrás da porta) se alcança a pé da calçada
  expect(alcancaRetangulo(vistos, ps, pf + 1, ps, pf + 1, py), `${nome}: entra pela porta`).toBe(
    true,
  );
  expect(chegaAoTerraco(p), `${nome}: escada até o terraço`).toBe(true);
  expect(p.comodos.length, `${nome}: um cômodo por andar`).toBe(p.params.andares);
  for (const c of p.comodos) {
    expect(c.s1 - c.s0 + 1, `${nome}: largura do andar ${c.andar}`).toBeGreaterThanOrEqual(5);
    expect(c.f1 - c.f0 + 1, `${nome}: fundo do andar ${c.andar}`).toBeGreaterThanOrEqual(5);
    expect(comodoLivre(p, c), `${nome}: andar ${c.andar} livre (piso e 3 de altura)`).toBe(true);
    expect(
      alcancaRetangulo(vistos, c.s0, c.f0, c.s1, c.f1, c.pes),
      `${nome}: chega ao andar ${c.andar}`,
    ).toBe(true);
    if (c.cama) expect(blocoDaPlanta(p, c.cama[0], c.cama[1], c.pes)).toBe(Bloco.CAMA);
  }
}

describe('casa geminada de pedra marrom', () => {
  it.each(combinacoes([2, 3, 4]).map((c) => [JSON.stringify(c), c] as const))(
    'forma %s',
    (nome, params) => {
      const p = casaGeminada(params);
      conferirForma(p, [LARGURA_GEMINADA, PROFUNDIDADE_GEMINADA], nome);
      // a escada de incêndio sobe da calçada até o terraço sem entrar no prédio
      expect(chegaAoTerraco(p, { portasFechadas: true }), `${nome}: escada de incêndio`).toBe(true);
      // a escadinha de pedra leva à porta
      expect(blocoDaPlanta(p, p.porta[0], 0, 0)).not.toBe(255);
    },
  );

  it('nada sai do lote: pôr um bloco fora da planta é erro', () => {
    const p = casaGeminada(combinacoes([2])[0]);
    expect(() => por(p, p.largura, 0, 0, Bloco.TIJOLOS)).toThrow(/fora do lote/);
    expect(() => por(p, 0, p.profundidade, 0, Bloco.TIJOLOS)).toThrow(/fora do lote/);
  });

  it('o espelho troca o lado da porta e da escada de incêndio', () => {
    const a = casaGeminada({ ...combinacoes([3])[0], espelho: false });
    const b = casaGeminada({ ...combinacoes([3])[0], espelho: true });
    expect(a.porta[0]).toBe(LARGURA_GEMINADA - 1 - b.porta[0]);
  });

  it('a casa de 3 andares de referência continua igual (regressão)', () => {
    const params: ParametrosPredio = {
      andares: 3,
      corPorta: 0,
      corToldo: 'vermelho',
      espelho: false,
      caixaDagua: true,
      loja: false,
      luzes: 7,
    };
    const texto = plantaEmTexto(casaGeminada(params), legendaDaGeminada(0)).join('\n') + '\n';
    const arq = fileURLToPath(new URL('./plantas/geminada-3-andares.txt', import.meta.url));
    if (!existsSync(arq) || process.env.REGRAVAR_PLANTAS) writeFileSync(arq, texto);
    expect(texto).toBe(readFileSync(arq, 'utf8'));
  });
});
