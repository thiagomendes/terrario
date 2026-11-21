import { describe, expect, it } from 'vitest';
import { diferencaDasEdicoes } from '../../src/cliente/diferencaEdicoes';
import { criarEdicoes, empacotar } from '../../src/world/edicoes';
import { Bloco } from '../../src/world/blocks';

/** Spec 035, seção 3: a diferença das edições a cada bem-vindo da volta. */
function mundo(f: (e: ReturnType<typeof criarEdicoes>) => void) {
  const e = criarEdicoes(7);
  f(e);
  return e;
}

describe('a diferença das edições da volta', () => {
  it('a mesma lista: nenhuma célula muda', () => {
    const aqui = mundo((e) => {
      e.definir(1, 10, 1, Bloco.TABUAS);
      e.definir(-20, 30, 40, Bloco.AR);
    });
    expect(diferencaDasEdicoes(aqui.exportar(), aqui.exportar())).toEqual([]);
  });

  it('célula mudada e célula nova recebem o valor de lá (com o dono)', () => {
    const aqui = mundo((e) => e.definir(1, 10, 1, Bloco.TABUAS));
    const la = mundo((e) => {
      e.definir(1, 10, 1, Bloco.TIJOLOS_PEDRA, 0, 3);
      e.definir(-17, 5, 33, Bloco.TABUAS, 0, 2);
    });
    const d = diferencaDasEdicoes(aqui.exportar(), la.exportar());
    expect(d).toHaveLength(2);
    expect(d).toContainEqual({ x: 1, y: 10, z: 1, valor: empacotar(Bloco.TIJOLOS_PEDRA, 0, 3) });
    expect(d).toContainEqual({ x: -17, y: 5, z: 33, valor: empacotar(Bloco.TABUAS, 0, 2) });
  });

  it('a edição que saiu do mundo: a célula perde a edição (volta ao terreno gerado)', () => {
    const aqui = mundo((e) => {
      e.definir(1, 10, 1, Bloco.TABUAS);
      e.definir(100, 64, -100, Bloco.TABUAS);
    });
    const la = mundo((e) => e.definir(1, 10, 1, Bloco.TABUAS));
    expect(diferencaDasEdicoes(aqui.exportar(), la.exportar())).toEqual([
      { x: 100, y: 64, z: -100, valor: undefined },
    ]);
  });

  it('célula com previsão local ainda não confirmada fica como está', () => {
    const aqui = mundo((e) => e.definir(1, 10, 1, Bloco.TABUAS));
    const la = mundo((e) => e.definir(2, 10, 1, Bloco.TABUAS));
    const previsto = (x: number, y: number, z: number) => x === 1 && y === 10 && z === 1;
    expect(diferencaDasEdicoes(aqui.exportar(), la.exportar(), previsto)).toEqual([
      { x: 2, y: 10, z: 1, valor: empacotar(Bloco.TABUAS) },
    ]);
  });

  it('só o dono mudou: a célula entra (os blocos apontam para a tabela de donos)', () => {
    const aqui = mundo((e) => e.definir(1, 10, 1, Bloco.TABUAS, 0, 1));
    const la = mundo((e) => e.definir(1, 10, 1, Bloco.TABUAS, 0, 2));
    expect(diferencaDasEdicoes(aqui.exportar(), la.exportar())).toEqual([
      { x: 1, y: 10, z: 1, valor: empacotar(Bloco.TABUAS, 0, 2) },
    ]);
  });

  it('o tempo num mundo com muitas edições (escrito na Situação)', () => {
    // 200 mil edições espalhadas em 400 chunks, 50 mudadas, 50 novas e 50 que saíram
    const aqui = criarEdicoes(7);
    const la = criarEdicoes(7);
    let n = 0;
    for (let cx = 0; cx < 20; cx++)
      for (let cz = 0; cz < 20; cz++)
        for (let i = 0; i < 500; i++) {
          const x = cx * 16 + (i % 16);
          const z = cz * 16 + Math.floor(i / 16);
          const y = 20 + (i % 7);
          aqui.definir(x, y, z, Bloco.TABUAS);
          if (n % 4000 === 0) la.definir(x, y, z, Bloco.TIJOLOS_PEDRA);
          else if (n % 4000 !== 1) la.definir(x, y, z, Bloco.TABUAS);
          n++;
        }
    for (let i = 0; i < 50; i++) la.definir(1000 + i, 30, 1000, Bloco.TABUAS);
    const t0 = performance.now();
    const d = diferencaDasEdicoes(aqui.exportar(), la.exportar());
    const ms = performance.now() - t0;
    console.log(`a diferença de ${n} edições: ${ms.toFixed(1)} ms, ${d.length} células`);
    expect(d).toHaveLength(150);
    expect(ms).toBeLessThan(2000);
  });
});
