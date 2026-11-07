import { describe, expect, it } from 'vitest';
import { obterTema, temasDisponiveis } from '../../src/temas';
import { definirTemaAtivo } from '../../src/temas/ativo';
import { generoDaProfissao, generoDoNome, nomeDoMorador } from '../../src/temas/nomes';
import { rotuloDoModelo, IDS_MODELOS } from '../../src/personagem/aparencia';
import type { Profissao } from '../../src/world/povoado';

describe('nomes no gênero certo', () => {
  it('o morador tem nome que combina com a profissão, nos seis temas', () => {
    for (const id of temasDisponiveis()) {
      definirTemaAtivo(obterTema(id));
      const t = obterTema(id).povoado!;
      for (const prof of Object.keys(t.profissoes) as Profissao[]) {
        const g = generoDaProfissao(t.profissoes[prof]);
        for (let n = 0; n < 12; n++) {
          const nome = nomeDoMorador('3,-7', n, prof);
          const gn = generoDoNome(nome);
          if (g !== 'n' && gn !== 'n') expect(gn, `${id} ${t.profissoes[prof]} ${nome}`).toBe(g);
        }
      }
    }
  });
  it('profissões: Ferreira e Engenheira femininas, Ferreiro masculina, Chef neutra', () => {
    expect(generoDaProfissao('Ferreira')).toBe('f');
    expect(generoDaProfissao('Engenheira')).toBe('f');
    expect(generoDaProfissao('Ferreiro')).toBe('m');
    expect(generoDaProfissao('Construtor de casinhas')).toBe('m');
    expect(generoDaProfissao('Chef estelar')).toBe('n');
  });
  it('o nome do modelo acompanha o corpo escolhido', () => {
    expect(rotuloDoModelo({ modelo: 'andarilho', corpo: 'feminino' })).toBe('Aventureira');
    expect(rotuloDoModelo({ modelo: 'andarilho', corpo: 'masculino' })).toBe('Aventureiro');
    for (const m of IDS_MODELOS) {
      expect(rotuloDoModelo({ modelo: m, corpo: 'feminino' }).length).toBeGreaterThan(2);
      expect(rotuloDoModelo({ modelo: m, corpo: 'masculino' }).length).toBeGreaterThan(2);
    }
  });
});
