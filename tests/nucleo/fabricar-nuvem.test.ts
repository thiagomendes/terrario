import { describe, expect, it } from 'vitest';
import { criarNucleo } from '../../src/nucleo/nucleo';
import { criarSincronizadorItens } from '../../src/cliente/replica';
import { criarInventario, type Slot } from '../../src/jogo/inventario';
import { idDoBloco } from '../../src/jogo/itens';
import { Bloco } from '../../src/world/blocks';
import type { Comando } from '../../src/nucleo/protocolo';

/**
 * Bicho achado pelo dono: num mundo com amigos (nuvem, sem confiar no cliente), o que se
 * fabricava na grade de criação sumia da mão logo depois de pegar o resultado. A tela não
 * dizia à nuvem qual receita fez; a conta dos itens não fechava e a nuvem desfazia tudo.
 */
const MADEIRA = idDoBloco(Bloco.MADEIRA_RETORCIDA);
const TABUAS = idDoBloco(Bloco.TABUAS);

function montar() {
  const n = criarNucleo({
    semente: 7,
    modo: 'sobrevivencia',
    versaoMundo: 2,
    confiarNoCliente: false,
    depuracao: true,
  });
  n.conectar('ana', { perfil: { apelido: 'Ana', aparencia: {} } });
  n.comando('ana', { t: 'depurar', d: { f: 'kit' } });
  n.passo();
  const inv = criarInventario();
  let id = 0;
  const enviados: Comando[] = [];
  const s = criarSincronizadorItens(
    inv,
    (c) => {
      enviados.push(c);
      n.comando('ana', c);
    },
    () => ++id,
  );
  const transito: Slot[] = Array.from({ length: 10 }, () => null);
  s.definirTransito({
    ler: (i) => transito[i] ?? null,
    gravar: (i, p) => (transito[i] = p),
    tamanho: 10,
  });
  /** Um quadro: o núcleo anda e o estado oficial volta para a cópia. */
  const quadro = () => {
    n.passo();
    const q = n.quadros().get('ana')!;
    if (q.inventario)
      s.inventario(q.inventario.slots, q.inventario.ackTransacao, q.inventario.transito);
  };
  quadro();
  return { n, s, inv, transito, quadro, enviados };
}

describe('fabricar num mundo com amigos', () => {
  it('pegar o resultado e soltar na mochila: as tábuas ficam', () => {
    const { s, inv, transito, quadro } = montar();
    const slotMadeira = inv.slots.findIndex((p) => p?.item === MADEIRA);
    expect(slotMadeira).toBeGreaterThanOrEqual(0);
    // madeira na grade (casa 1 do trânsito)
    inv.remover(slotMadeira, 1);
    transito[1] = { item: MADEIRA, qtd: 1 };
    s.verificar();
    quadro();
    // pega o resultado: a grade some, as tábuas vão para o cursor (casa 0)
    transito[1] = null;
    transito[0] = { item: TABUAS, qtd: 4 };
    s.fabricou('tabuas');
    s.verificar();
    quadro();
    quadro();
    expect(transito[0]).toEqual({ item: TABUAS, qtd: 4 });
    expect(transito[1]).toBeNull();
    // solta na mochila
    inv.definir(20, transito[0]);
    transito[0] = null;
    s.verificar();
    quadro();
    quadro();
    expect(inv.obter(20)).toEqual({ item: TABUAS, qtd: 4 });
    expect(transito.every((p) => p === null)).toBe(true);
  });

  it('sem dizer a receita, a nuvem desfaz (por isso a tela tem que dizer)', () => {
    const { s, inv, transito, quadro } = montar();
    const slotMadeira = inv.slots.findIndex((p) => p?.item === MADEIRA);
    inv.remover(slotMadeira, 1);
    transito[1] = { item: MADEIRA, qtd: 1 };
    s.verificar();
    quadro();
    transito[1] = null;
    transito[0] = { item: TABUAS, qtd: 4 };
    s.verificar();
    quadro();
    expect(transito[0]).toBeNull();
    expect(transito[1]).toEqual({ item: MADEIRA, qtd: 1 });
  });

  it('a receita vai na transação dos slots, uma vez só, e conta as vezes', () => {
    const { s, inv, transito, enviados } = montar();
    const slotMadeira = inv.slots.findIndex((p) => p?.item === MADEIRA);
    inv.remover(slotMadeira, 2);
    inv.adicionar(TABUAS, 8);
    s.fabricou('tabuas');
    s.fabricou('tabuas');
    s.verificar();
    transito[0] = { item: TABUAS, qtd: 1 };
    s.verificar();
    const tr = enviados.filter((c) => c.t === 'transacao');
    expect(tr.at(-2)).toMatchObject({ fabricou: [{ receita: 'tabuas', vezes: 2 }] });
    expect(tr.at(-1)).not.toHaveProperty('fabricou');
  });
});
