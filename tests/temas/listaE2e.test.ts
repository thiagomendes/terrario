import { describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema, temasDisponiveis } from '../../src/temas';
import { TEMAS_E2E, temasPedidos } from '../../e2e/temas';

describe('lista de temas dos testes de tela', () => {
  it('é igual ao registro (mesmos ids, nomes e ordem dos cartões)', () => {
    expect(TEMAS_E2E.map(([id]) => id)).toEqual(temasDisponiveis());
    for (const [id, nome] of TEMAS_E2E) expect(obterTema(id).nome).toBe(nome);
  });
  it('filtra pelo pedido da variável de ambiente', () => {
    expect(temasPedidos(undefined)).toHaveLength(TEMAS_E2E.length);
    expect(temasPedidos('1')).toHaveLength(TEMAS_E2E.length);
    // na ordem dos cartões, não na do pedido
    expect(temasPedidos('doce-reino,rancho-alegre')).toEqual(['rancho-alegre', 'doce-reino']);
  });
});
