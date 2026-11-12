import { describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema, temasDisponiveis } from '../../src/temas';
import { moradorDeBrinquedo } from '../../src/render/moradorBoneco';
import { planoBoneco } from '../../src/personagem/boneco';
import { PALETAS } from '../../src/personagem/aparencia';
import { generoDoMorador } from '../../src/temas/nomes';
import type { Profissao } from '../../src/world/povoado';
import type { PecaCriatura } from '../../src/temas/tipos';

/**
 * Spec 014 (T11): a pele do morador é sempre a pele do tema, nunca uma cor de roupa. O mecânico
 * da cidade saía com o rosto azul: o modelo de braços de fora pinta a manga com a pele, e a
 * troca "manga -> roupa do tema" pintava a pele junto.
 */
const volume = (p: PecaCriatura) => p.t[0] * p.t[1] * p.t[2];

describe('pele dos moradores', () => {
  it('em todo tema, profissão e morador, a cabeça e as mãos têm a pele do tema', () => {
    const falhas: string[] = [];
    let conferidos = 0;
    for (const id of temasDisponiveis()) {
      const pov = obterTema(id).povoado ?? obterTema('bruma-e-luz').povoado!;
      for (const prof of Object.keys(pov.moradores) as Profissao[]) {
        const pecas = pov.moradores[prof];
        const cabeca = pecas
          .filter((p) => p.papel === 'cabeca')
          .sort((a, b) => volume(b) - volume(a))[0];
        const pele = cabeca.cor.toLowerCase();
        // as cores de roupa: as do tema (fora a pele) e as paletas de roupa e calça do boneco
        const roupas = new Set(
          [
            ...pecas.filter((p) => !p.papel && p.cor.toLowerCase() !== pele).map((p) => p.cor),
            ...PALETAS.roupa,
            ...PALETAS.calca,
          ].map((c) => c.toLowerCase()),
        );
        roupas.delete(pele);
        for (let n = 0; n < 24; n++) {
          const m = moradorDeBrinquedo(
            pecas,
            n,
            generoDoMorador('p', n, prof),
            pov.acessorios?.[prof],
            pov.fantasias?.[prof],
          );
          const plano = m.ajustar(planoBoneco(m.aparencia));
          for (const nome of ['cabeca', 'bracoE-mao', 'bracoD-mao']) {
            const p = plano.pecas.find((q) => q.nome === nome);
            if (!p) continue;
            conferidos++;
            const cor = p.cor.toLowerCase();
            if (cor !== pele || roupas.has(cor)) falhas.push(`${id} ${prof} ${n} ${nome}: ${cor}`);
          }
        }
      }
    }
    expect(conferidos).toBeGreaterThan(500);
    expect(falhas).toEqual([]);
  });
});
