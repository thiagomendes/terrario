import { describe, expect, it } from 'vitest';
import { REGISTRO_BLOCOS } from '../../src/world/blocks';
import { idDoBloco, obterItem, nomeBonito, registrarBlocos } from '../../src/jogo/itens';
import { registrarCatalogo } from '../../src/jogo/catalogo';

describe('nomes de item dos blocos', () => {
  it('todo item de bloco tem o nome do bloco com inicial maiúscula', () => {
    registrarBlocos();
    registrarCatalogo();
    const diferentes: string[] = [];
    for (const b of REGISTRO_BLOCOS) {
      const i = obterItem(idDoBloco(b.id));
      if (i && i.nome !== nomeBonito(b.nome)) diferentes.push(`${b.id}: ${i.nome} / ${b.nome}`);
    }
    expect(diferentes).toEqual([]);
  });
});
