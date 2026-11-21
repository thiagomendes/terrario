import { describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { baileDoMundo, definirEstiloMundo, estiloMundo } from '../../src/world/chunk';
import { indiceDoMundo } from '../../src/world/vilaSolidos';
import { caixasDaPecaBaile } from '../../src/world/baileSolidos';

/**
 * Spec 027 (T05): as peças da Noite das Fantasias seguram (a abóbora gigante, as barracas, as
 * portas fechadas), do plano e nunca da malha, igual no aparelho e no núcleo; e nada segura onde a
 * criança nasce nem no meio dos caminhos.
 */
describe('spec 027: o que segura nas peças da festa', () => {
  it('a abóbora gigante, as barracas e as portas fechadas seguram; o nascer e o caminho, não', () => {
    const antes = estiloMundo();
    try {
      definirEstiloMundo(obterTema('noite-das-fantasias').mundo);
      const p = baileDoMundo(1337)!;
      const idx = indiceDoMundo(1337)!;
      expect(idx).not.toBeNull();
      const Y = p.h + 1;
      // a abóbora: o meio dela (no chão e no alto do corpo) é tomado
      const a = p.pontos.abobora;
      for (const y of [Y, Y + 3, Y + 6]) expect(idx.daCelula(Math.floor(a.x), y, Math.floor(a.z)), `abóbora y ${y}`).not.toBeNull();
      // as portas: a célula da porta (atrás da frente) é tomada até 2 blocos
      for (const q of p.pecas.filter((x) => x.tipo === 'porta' || x.tipo === 'porta-loja' || x.tipo === 'porta-castelo')) {
        const caixas = caixasDaPecaBaile(q);
        expect(caixas.length).toBeGreaterThan(0);
        expect(caixas[0][4] - caixas[0][1]).toBeGreaterThanOrEqual(2);
      }
      // as barracas: o balcão segura
      for (const b of p.pecas.filter((x) => x.tipo === 'barraca')) expect(caixasDaPecaBaile(b).length).toBe(2);
      // quem nasce fica livre, e a rua também
      const n = p.nascimento;
      expect(idx.daCelula(Math.floor(n.x), Y, Math.floor(n.z))).toBeNull();
      expect(idx.daCelula(Math.floor(n.x), Y + 1, Math.floor(n.z))).toBeNull();
      const [rx, rz] = p.entradas.rua;
      expect(idx.daCelula(rx, Y, rz)).toBeNull();
      // e na Vila Neon o índice continua o do bairro (nada da festa nele)
      definirEstiloMundo(obterTema('vila-neon').mundo);
      const vila = indiceDoMundo(1337)!;
      expect(vila.caixas.length).toBeGreaterThan(0);
      expect(vila).not.toBe(idx);
    } finally {
      definirEstiloMundo(antes);
    }
  });
});
