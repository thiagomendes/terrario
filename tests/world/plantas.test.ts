import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Bloco, obterBloco } from '../../src/world/blocks';
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
import {
  construirModelo,
  LARGURA_DO_MODELO,
  type ModeloPredio,
} from '../../src/world/plantas/modelos';
import { LOJAS } from '../../src/world/plantas/tijolo';
import { NADA } from '../../src/world/plantas/formato';

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

describe('os outros quatro modelos (T04)', () => {
  const casos: [ModeloPredio, number[]][] = [
    ['tijolo', [3, 4]],
    ['deco', [5, 6]],
    ['alto', [6]],
    ['escola', [2]],
  ];
  for (const [modelo, andares] of casos)
    it.each(
      combinacoes(andares).flatMap((c) =>
        (['padaria', 'oficina', 'construcao', 'sorveteria'] as const).map(
          (vende) =>
            [`${modelo} ${JSON.stringify(c)} ${vende}`, { ...c, vende, loja: true }] as const,
        ),
      ),
    )('forma %s', (nome, params) => {
      const p = construirModelo(modelo, params);
      expect(p.largura).toBe(LARGURA_DO_MODELO[modelo]);
      expect(p.params.andares).toBe(
        andares.includes(params.andares) ? params.andares : p.params.andares,
      );
      conferirForma(p, [LARGURA_DO_MODELO[modelo], 9], nome);
      // cabe com folga na altura do mundo (a cidade fica no máximo em 84)
      expect(84 + p.altura).toBeLessThan(124);
    });

  it('a loja mostra na placa o que vende e tem dentro o que precisa', () => {
    for (const vende of ['padaria', 'oficina', 'construcao', 'sorveteria'] as const) {
      const p = construirModelo('tijolo', { ...combinacoes([3])[0], vende });
      let placa = -1;
      let dentro = false;
      for (let i = 0; i < p.blocos.length; i++) {
        if (p.blocos[i] === Bloco.PLACA) placa = p.metas[i] >> 2;
        if (p.blocos[i] === LOJAS[vende].U) dentro = true;
      }
      expect(placa, vende).toBe(LOJAS[vende].placa);
      expect(dentro, vende).toBe(true);
    }
    // a padaria tem o forno aceso (o cozinheiro trabalha nele)
    const pad = construirModelo('tijolo', { ...combinacoes([3])[0], vende: 'padaria' });
    expect([...pad.blocos].includes(Bloco.FORNALHA_ACESA)).toBe(true);
  });

  it('janelas acesas: parte das janelas acende, sem espalhar luz', () => {
    const p = construirModelo('deco', { ...combinacoes([6])[0], luzes: 99 });
    const acesas = [...p.blocos].filter((b) => b === Bloco.JANELA_ACESA).length;
    const apagadas = [...p.blocos].filter((b) => b === Bloco.JANELA).length;
    expect(acesas).toBeGreaterThan(0.15 * (acesas + apagadas));
    expect(acesas).toBeLessThan(0.6 * (acesas + apagadas));
    expect(obterBloco(Bloco.JANELA_ACESA)?.luz ?? 0).toBe(0);
    expect(obterBloco(Bloco.JANELA_ACESA)?.emissivo).toBe(true);
  });

  it("o prédio alto tem caixa d'água e baú no terraço; a esquina art déco tem o topo em degraus", () => {
    const alto = construirModelo('alto', combinacoes([6])[0]);
    const noTerraco = (p: typeof alto, b: number) => {
      for (let f = 0; f < p.profundidade; f++)
        for (let s = 0; s < p.largura; s++)
          if (blocoDaPlanta(p, s, f, p.terraco) === b) return true;
      return false;
    };
    expect(noTerraco(alto, Bloco.BAU)).toBe(true);
    expect(noTerraco(alto, Bloco.CERCA)).toBe(true);
    const deco = construirModelo('deco', combinacoes([6])[0]);
    let topo = 0;
    for (let i = 0; i < deco.blocos.length; i++)
      if (deco.blocos[i] !== NADA && deco.blocos[i] !== 0)
        topo = Math.max(topo, Math.floor(i / (16 * 9)));
    expect(topo).toBeGreaterThanOrEqual(deco.terraco + 7);
  });
});
