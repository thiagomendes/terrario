import { describe, expect, it } from 'vitest';
import { criarFilaRemalha, MAX_REMALHAS_POR_QUADRO } from '../../src/render/fila';
import { gerarChunkEditado, criarEdicoes } from '../../src/world/edicoes';
import { gerarMalha } from '../../src/mesh/malha';

describe('fila de remalha', () => {
  it('limite por quadro vale 2', () => {
    expect(MAX_REMALHAS_POR_QUADRO).toBe(2);
  });

  it('junta repetidos e entrega editados primeiro', () => {
    const f = criarFilaRemalha<number>();
    f.adicionar({ cx: 0, cz: 0, editado: false, dados: 1 });
    f.adicionar({ cx: 1, cz: 0, editado: false, dados: 2 });
    f.adicionar({ cx: 2, cz: 0, editado: true, dados: 3 });
    f.adicionar({ cx: 0, cz: 0, editado: false, dados: 4 });
    expect(f.tamanho).toBe(3);
    const a = f.retirar(2);
    expect(a.map((i) => i.cx)).toEqual([2, 1]);
    const b = f.retirar(5);
    expect(b).toHaveLength(1);
    expect(b[0].dados).toBe(4);
    expect(f.retirar(1)).toEqual([]);
  });

  it('gerarMalha de chunk editado termina em menos de 500 ms', () => {
    const e = criarEdicoes();
    e.definir(3, 40, 3, 0);
    e.definir(4, 10, 4, 0);
    const t = performance.now();
    gerarMalha(gerarChunkEditado(0, 0, 1337, e));
    expect(performance.now() - t).toBeLessThan(500);
  });
});
