import { describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { REGISTRO_BLOCOS } from '../../src/world/blocks';
import { idDoBloco, obterItem, nomeBonito, todosItens } from '../../src/jogo/itens';
import { CRIATURAS } from '../../src/jogo/criaturas';
import { NOMES_BIOMA } from '../../src/world/chunk';
import { obterTema, temasDisponiveis, TEMA_PADRAO } from '../../src/temas';
import { ativarTemaPuro } from '../../src/temas/ativarPuro';
import { textosOriginais } from '../../src/temas/originais';

describe('renomear pelo tema', () => {
  it('cada tema renomeia blocos, itens de bloco, itens, criaturas e biomas', () => {
    for (const id of temasDisponiveis()) {
      const t = obterTema(id);
      ativarTemaPuro(t);
      for (const b of REGISTRO_BLOCOS) {
        if (!b.id) continue;
        expect(b.nome).toBe(t.textos.blocos[b.id]);
        const item = obterItem(idDoBloco(b.id));
        if (item) expect(item.nome).toBe(nomeBonito(t.textos.blocos[b.id]));
      }
      for (const i of todosItens())
        if (i.bloco === undefined) expect(i.nome).toBe(t.textos.itens[i.id]);
      expect(CRIATURAS.raposa.nome).toBe(t.textos.criaturas.raposa);
      expect(NOMES_BIOMA.pantano).toBe(t.textos.biomas.pantano);
    }
  });

  it('voltar ao tema base devolve exatamente os nomes de antes', () => {
    const orig = textosOriginais();
    for (const id of temasDisponiveis()) ativarTemaPuro(obterTema(id));
    ativarTemaPuro(obterTema(TEMA_PADRAO));
    for (const b of REGISTRO_BLOCOS) {
      if (!b.id) continue;
      expect(b.nome).toBe(orig.blocos[b.id]);
      const item = obterItem(idDoBloco(b.id));
      if (item) expect(item.nome).toBe(nomeBonito(orig.blocos[b.id]));
    }
    for (const i of todosItens()) if (i.bloco === undefined) expect(i.nome).toBe(orig.itens[i.id]);
    expect(CRIATURAS.raposa.nome).toBe('Raposa-lume');
    expect(NOMES_BIOMA.pantano).toBe('Pântano bioluminescente');
  });
});
