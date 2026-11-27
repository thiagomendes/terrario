import { describe, expect, it } from 'vitest';
import { criarFilaRemalha, MAX_REMALHAS_POR_QUADRO } from '../../src/render/fila';
import { gerarChunkEditado, criarEdicoes } from '../../src/world/edicoes';
import { gerarMalha } from '../../src/mesh/malha';
import { cronometrar, melhorDe } from '../tempo';

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

  it('a resposta mais velha que chega depois não substitui a mais nova (spec 039)', () => {
    // o pedaço 0,0 foi pedido duas vezes (v1 no carregamento, v2 pela edição): a v2 chega antes
    const f = criarFilaRemalha<string>();
    f.adicionar({ cx: 0, cz: 0, editado: true, dados: 'v2', versao: 2 });
    f.adicionar({ cx: 0, cz: 0, editado: false, dados: 'v1', versao: 1 });
    expect(f.tamanho).toBe(1);
    const [item] = f.retirar(1);
    expect(item.dados).toBe('v2');
    expect(item.versao).toBe(2);
    // o "editado" da que ficou vale (os editados são servidos primeiro)
    expect(item.editado).toBe(true);
    // a mais nova que chega depois troca, como sempre
    f.adicionar({ cx: 0, cz: 0, editado: false, dados: 'v3', versao: 3 });
    f.adicionar({ cx: 0, cz: 0, editado: false, dados: 'v4', versao: 4 });
    expect(f.retirar(1)[0].dados).toBe('v4');
  });

  it('gerarMalha de chunk editado termina em menos de 500 ms', () => {
    const e = criarEdicoes();
    e.definir(3, 40, 3, 0);
    e.definir(4, 10, 4, 0);
    // o melhor de 3 (com a máquina ocupada por outros testes, uma rodada sozinha às vezes
    // passa do prazo; sozinha leva ~130 ms, e uma lentidão de verdade pesa nas três)
    const melhor = melhorDe(3, () =>
      cronometrar(() => gerarMalha(gerarChunkEditado(0, 0, 1337, e))),
    );
    expect(melhor).toBeLessThan(500);
  });
});
