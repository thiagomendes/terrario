import { afterAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { criarNucleo } from '../../src/nucleo/nucleo';
import { definirEstiloMundo, ESTILO_PADRAO } from '../../src/world/chunk';
import { limparPovoados } from '../../src/world/povoado';

/** Parte 3B: duas crianças na nuvem na Vila Neon se veem (o quadro leva a outra). */
afterAll(() => {
  definirEstiloMundo(ESTILO_PADRAO);
  limparPovoados();
});

describe('a Vila Neon na nuvem com duas crianças', () => {
  it('cada uma recebe a outra no quadro, passo após passo', () => {
    definirEstiloMundo(obterTema('vila-neon').mundo);
    limparPovoados();
    const n = criarNucleo({ semente: 4242, modo: 'criativo', versaoMundo: 2, confiarNoCliente: false });
    n.conectar('ana', { perfil: { apelido: 'Ana', aparencia: {} } });
    n.conectar('bia', { perfil: { apelido: 'Bia', aparencia: {} } });
    let viu = { ana: false, bia: false };
    for (let k = 0; k < 60; k++) {
      n.passo();
      for (const [q, f] of n.quadros()) {
        const outros = (f.jogadores ?? []).map((o) => o.id);
        if (q === 'ana' && outros.includes('bia')) viu.ana = true;
        if (q === 'bia' && outros.includes('ana')) viu.bia = true;
      }
    }
    expect(viu).toEqual({ ana: true, bia: true });
    viu = { ana: false, bia: false };
  });
});
