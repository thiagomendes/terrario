import { describe, expect, it } from 'vitest';
import { estiloSeguro } from '../../src/world/estiloSeguro';
import { gerarChunk, definirEstiloMundo, ESTILO_PADRAO } from '../../src/world/chunk';
import '../../src/temas/todos';
import { obterTema, temasDisponiveis } from '../../src/temas';

describe('estilo de mundo vindo de fora', () => {
  it('os estilos dos seis temas passam iguais', () => {
    for (const id of temasDisponiveis()) {
      const m = obterTema(id).mundo;
      expect(estiloSeguro(m)).toEqual(m);
    }
  });
  it('lixo vira o padrão e a geração continua funcionando', () => {
    for (const lixo of [
      null,
      3,
      { crateras: 0 },
      { crateras: 'x', estrutura: 'castelo', arvores: { floresta: ['nada', 7] } },
      { povoado: { casa: 'x' } },
    ]) {
      const e = estiloSeguro(lixo);
      definirEstiloMundo(e);
      expect(() => gerarChunk(0, 0, 1337)).not.toThrow();
    }
    definirEstiloMundo(ESTILO_PADRAO);
  });
});
