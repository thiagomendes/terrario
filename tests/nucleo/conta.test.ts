import { describe, expect, it } from 'vitest';
import { contaFecha } from '../../src/nucleo/conta';
import { registrarCatalogo } from '../../src/jogo/catalogo';
import { idDoBloco } from '../../src/jogo/itens';
import { Bloco } from '../../src/world/blocks';
import type { MudancaSlot } from '../../src/nucleo/protocolo';

registrarCatalogo();
const TABUAS = idDoBloco(Bloco.TABUAS);
const TRONCO = idDoBloco(Bloco.MADEIRA_RETORCIDA);
const TABUAS_PINHO = idDoBloco(Bloco.TABUAS_PINHO);
const m = (
  onde: MudancaSlot['onde'],
  i: number,
  antes: MudancaSlot['antes'],
  depois: MudancaSlot['depois'],
): MudancaSlot => ({ onde, i, antes, depois });

describe('conta dos itens numa transação', () => {
  it('mover itens entre slots e baú fecha', () => {
    expect(
      contaFecha([
        m('inv', 0, { item: 'carvao', qtd: 10 }, { item: 'carvao', qtd: 4 }),
        m('bau', 3, null, { item: 'carvao', qtd: 6 }),
      ]),
    ).toBe(true);
  });

  it('item que nasce do nada ou some não fecha', () => {
    expect(contaFecha([m('inv', 0, null, { item: 'lingote_ouro', qtd: 5 })])).toBe(false);
    expect(contaFecha([m('inv', 0, { item: 'carvao', qtd: 5 }, null)])).toBe(false);
    expect(
      contaFecha([
        m('inv', 0, { item: 'carvao', qtd: 5 }, null),
        m('tr', 0, null, { item: 'carvao', qtd: 6 }),
      ]),
    ).toBe(false);
  });

  it('receita feita: os ingredientes viram o resultado', () => {
    // 1 tronco na grade → 4 tábuas no cursor
    expect(
      contaFecha(
        [m('tr', 1, { item: TRONCO, qtd: 1 }, null), m('tr', 0, null, { item: TABUAS, qtd: 4 })],
        [{ receita: 'tabuas', vezes: 1 }],
      ),
    ).toBe(true);
    // a mesma receita sem dizer que fabricou não fecha
    expect(
      contaFecha([
        m('tr', 1, { item: TRONCO, qtd: 1 }, null),
        m('tr', 0, null, { item: TABUAS, qtd: 4 }),
      ]),
    ).toBe(false);
    // receita que não existe ou vezes absurdas
    expect(contaFecha([], [{ receita: 'nada', vezes: 1 }])).toBe(false);
    expect(contaFecha([], [{ receita: 'tabuas', vezes: 0 }])).toBe(false);
  });

  it('etiqueta da receita aceita qualquer tábua, mas não outra coisa', () => {
    // 2 tábuas de pinho (etiqueta #tabuas) → 4 gravetos
    expect(
      contaFecha(
        [
          m('tr', 1, { item: TABUAS_PINHO, qtd: 2 }, null),
          m('inv', 5, null, { item: 'graveto', qtd: 4 }),
        ],
        [{ receita: 'graveto', vezes: 1 }],
      ),
    ).toBe(true);
    expect(
      contaFecha(
        [
          m('tr', 1, { item: 'carvao', qtd: 2 }, null),
          m('inv', 5, null, { item: 'graveto', qtd: 4 }),
        ],
        [{ receita: 'graveto', vezes: 1 }],
      ),
    ).toBe(false);
  });
});
