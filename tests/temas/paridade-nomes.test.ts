import { describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { REGISTRO_BLOCOS } from '../../src/world/blocks';
import { idDoBloco, obterItem, nomeBonito, todosItens } from '../../src/jogo/itens';
import { CRIATURAS } from '../../src/jogo/criaturas';
import { NOMES_BIOMA } from '../../src/world/chunk';
import { obterTema, temasDisponiveis } from '../../src/temas';
import { temaBase } from '../../src/temas/base';
import { ativarTemaPuro } from '../../src/temas/ativarPuro';
import { textosOriginais } from '../../src/temas/originais';
import {
  blocoExclusivo,
  EXCLUSIVOS_BAILE,
  EXCLUSIVOS_CIDADE,
  EXCLUSIVOS_VILA,
} from '../../src/jogo/exclusivos';

const exclusivo = (item: string) =>
  EXCLUSIVOS_CIDADE.itens.includes(item) ||
  EXCLUSIVOS_VILA.itens.includes(item) ||
  EXCLUSIVOS_BAILE.itens.includes(item);

describe('renomear pelo tema', () => {
  it('cada tema renomeia blocos, itens de bloco, itens, criaturas e biomas', () => {
    for (const id of temasDisponiveis()) {
      const t = obterTema(id);
      ativarTemaPuro(t);
      const orig = textosOriginais();
      for (const b of REGISTRO_BLOCOS) {
        if (!b.id) continue;
        // spec 014: o exclusivo de outro tema fica com o nome base (nunca aparece aqui)
        const nome =
          t.textos.blocos[b.id] ?? (blocoExclusivo(b.id) ? orig.blocos[b.id] : undefined);
        expect(b.nome).toBe(nome);
        const item = obterItem(idDoBloco(b.id));
        if (item) expect(item.nome).toBe(nomeBonito(nome!));
      }
      for (const i of todosItens())
        if (i.tipo !== 'bloco')
          expect(i.nome).toBe(
            t.textos.itens[i.id] ?? (exclusivo(i.id) ? orig.itens[i.id] : undefined),
          );
      expect(CRIATURAS.raposa.nome).toBe(t.textos.criaturas.raposa);
      expect(NOMES_BIOMA.pantano).toBe(t.textos.biomas.pantano);
    }
  });

  it('voltar ao tema base devolve exatamente os nomes de antes', () => {
    const orig = textosOriginais();
    for (const id of temasDisponiveis()) ativarTemaPuro(obterTema(id));
    ativarTemaPuro(temaBase());
    for (const b of REGISTRO_BLOCOS) {
      if (!b.id) continue;
      expect(b.nome).toBe(orig.blocos[b.id]);
      const item = obterItem(idDoBloco(b.id));
      if (item) expect(item.nome).toBe(nomeBonito(orig.blocos[b.id]));
    }
    for (const i of todosItens()) if (i.tipo !== 'bloco') expect(i.nome).toBe(orig.itens[i.id]);
    expect(CRIATURAS.raposa.nome).toBe('Raposa-lume');
    expect(NOMES_BIOMA.pantano).toBe('Pântano bioluminescente');
  });
});
