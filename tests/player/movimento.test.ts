import { describe, expect, it } from 'vitest';
import { blocoSobPes, criarDetectorMovimento } from '../../src/player/movimento';
import { Bloco, obterBloco } from '../../src/world/blocks';
import { ALTURA, SEMENTE_PADRAO, TAM_X, TAM_Z, gerarChunk, indice } from '../../src/world/chunk';

function simular(
  d: ReturnType<typeof criarDetectorMovimento>,
  tempo: number,
  estado: { noChao: boolean; velocidadeHoriz: number; correndo: boolean },
) {
  const dt = 0.01;
  const lista: string[] = [];
  for (let i = 0; i < Math.round(tempo / dt); i++) lista.push(...d.atualizar(dt, estado));
  return lista;
}

describe('detector de movimento', () => {
  it('passos andando e correndo', () => {
    const a = criarDetectorMovimento();
    expect(simular(a, 2.01, { noChao: true, velocidadeHoriz: 4, correndo: false })).toHaveLength(4);
    const c = criarDetectorMovimento();
    expect(simular(c, 1.99, { noChao: true, velocidadeHoriz: 6, correndo: true })).toHaveLength(6);
  });

  it('parado ou no ar não dá passo e parar reinicia o relógio', () => {
    const d = criarDetectorMovimento();
    expect(simular(d, 2, { noChao: true, velocidadeHoriz: 0.05, correndo: false })).toEqual([]);
    simular(d, 0.45, { noChao: true, velocidadeHoriz: 4, correndo: false });
    simular(d, 0.1, { noChao: true, velocidadeHoriz: 0, correndo: false });
    expect(simular(d, 0.3, { noChao: true, velocidadeHoriz: 4, correndo: false })).toEqual([]);
    const ar = criarDetectorMovimento();
    expect(simular(ar, 1, { noChao: false, velocidadeHoriz: 4, correndo: false })).not.toContain(
      'passo',
    );
  });

  it('pulo e aterrissagem', () => {
    const d = criarDetectorMovimento();
    expect(d.atualizar(0.016, { noChao: false, velocidadeHoriz: 0, correndo: false })).toEqual([
      'pulo',
    ]);
    simular(d, 0.3, { noChao: false, velocidadeHoriz: 0, correndo: false });
    expect(d.atualizar(0.016, { noChao: true, velocidadeHoriz: 0, correndo: false })).toEqual([
      'aterrissagem',
    ]);
  });

  it('oscilação de um quadro não aterrissa', () => {
    const d = criarDetectorMovimento();
    d.atualizar(0.016, { noChao: false, velocidadeHoriz: 0, correndo: false });
    const r = d.atualizar(0.016, { noChao: true, velocidadeHoriz: 0, correndo: false });
    expect(r).not.toContain('aterrissagem');
  });
});

describe('blocoSobPes com mundo real', () => {
  const dados = gerarChunk(0, 0, SEMENTE_PADRAO);
  const blocoEm = (x: number, y: number, z: number) =>
    x < 0 || x >= TAM_X || z < 0 || z >= TAM_Z || y < 0 || y >= ALTURA
      ? Bloco.AR
      : dados[indice(x, y, z)];

  function topo(x: number, z: number) {
    for (let y = ALTURA - 1; y >= 0; y--) if (blocoEm(x, y, z) !== Bloco.AR) return y;
    return -1;
  }

  it('acima do topo sólido devolve o bloco sólido do topo', () => {
    let achou = 0;
    for (let x = 0; x < TAM_X; x++) {
      for (let z = 0; z < TAM_Z; z++) {
        const y = topo(x, z);
        if (!obterBloco(blocoEm(x, y, z))?.solido) continue;
        achou++;
        expect(blocoSobPes({ x: x + 0.5, y: y + 1, z: z + 0.5 }, blocoEm)).toBe(blocoEm(x, y, z));
      }
    }
    expect(achou).toBeGreaterThan(0);
  });

  it('planta no topo é ignorada e devolve o sólido abaixo', () => {
    let achou = 0;
    for (let x = 0; x < TAM_X; x++) {
      for (let z = 0; z < TAM_Z; z++) {
        const y = topo(x, z);
        const planta = blocoEm(x, y, z);
        if (y < 1 || obterBloco(planta)?.solido) continue;
        const abaixo = blocoEm(x, y - 1, z);
        if (!obterBloco(abaixo)?.solido) continue;
        achou++;
        expect(planta).not.toBe(abaixo);
        expect(blocoSobPes({ x: x + 0.5, y: y + 1, z: z + 0.5 }, blocoEm)).toBe(abaixo);
      }
    }
    expect(achou).toBeGreaterThan(0);
  });
});

describe('blocoSobPes', () => {
  it('ignora ar e plantas até achar sólido', () => {
    const mundo = (x: number, y: number) =>
      y === 5 ? Bloco.PEDRA_RACHADA : y === 6 ? Bloco.GRAMA_ALTA : Bloco.AR;
    expect(blocoSobPes({ x: 1.5, y: 7, z: 2.5 }, (x, y) => mundo(x, y))).toBe(Bloco.PEDRA_RACHADA);
    expect(blocoSobPes({ x: 1.5, y: 6, z: 2.5 }, (x, y) => mundo(x, y))).toBe(Bloco.PEDRA_RACHADA);
  });
});
