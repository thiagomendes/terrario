import { describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema, temasDisponiveis } from '../../src/temas';
import { ativarTemaPuro } from '../../src/temas/ativarPuro';
import { temaBase } from '../../src/temas/base';
import { REGISTRO_BLOCOS } from '../../src/world/blocks';
import { NOMES_BIOMA } from '../../src/world/chunk';
import { CRIATURAS } from '../../src/jogo/criaturas';
import { NOMES_CLIMA, NOMES_ESTACAO } from '../../src/jogo/clima';
import { MISSOES as MISSOES_DIARIO } from '../../src/jogo/diario';
import { todosItens } from '../../src/jogo/itens';
import {
  BANCA,
  HABILIDADES,
  MISSOES as MISSOES_ALMA,
  PREMIUM,
  PRESENTES_NIVEL,
} from '../../src/jogo/alma';
import { FANTASIAS } from '../../src/personagem/fantasias';
import { NOMES_PECAS, NOMES_TEMAS } from '../../src/ui/abaFantasias';
import { nomeSugerido } from '../../src/cliente/identidade';

/**
 * Spec 034 (T05): nenhum texto que a criança vê nos cinco mundos com "bruma" nem com os nomes
 * dos quatro que saíram. Conferido com os textos aplicados (o tema ativo por cima dos de
 * base, como o jogo lê dos registros), o que o tema mostra (nome, lema, convite, boas-vindas,
 * povoado) e o que vale em todo mundo (missões e banca do mundo, fantasias, presentes).
 *
 * Exceções escritas: o nome interno `brumaluz` (banco, eventos) não é texto da tela, e o
 * modelo "Cientista" (`musgueira`) fica (spec 034, "Fora desta spec").
 */
const DOS_QUATRO =
  /bruma|planeta vivo|mata encantada|guardi[ãa]o? da mata|era dos dinos|\bdinos?\b|lanterneira/i;

function achados(textos: Record<string, string>): string[] {
  return Object.entries(textos)
    .filter(([, v]) => DOS_QUATRO.test(v))
    .map(([k, v]) => `${k}: ${v}`);
}

describe('spec 034: nenhum texto dos quatro que saíram nos cinco', () => {
  it('os cinco temas são os que se escolhem, e a busca acha o que procura', () => {
    expect(temasDisponiveis()).toHaveLength(5);
    expect(
      achados({
        a: 'Espectro da bruma',
        b: 'Planeta Vivo',
        c: 'Fantasia de Dino',
        d: 'Guardião da Mata',
        e: 'Era dos Dinos',
        f: 'Herói da Mata',
      }),
    ).toHaveLength(5);
  });

  for (const id of temasDisponiveis())
    it(`${id}: os textos aplicados e os do tema`, () => {
      const t = obterTema(id);
      ativarTemaPuro(t);
      try {
        const textos: Record<string, string> = {
          nome: t.nome,
          lema: t.lema,
          convite: t.convite,
          diario: t.textos.diario,
          boasVindas: t.textos.boasVindas,
          morte: t.textos.morte,
          trovao: t.textos.legendas.trovao,
          criaturaNoturna: t.textos.legendas.criaturaNoturna,
          apelido: nomeSugerido('Exploradora', id),
        };
        for (const b of REGISTRO_BLOCOS) if (b.id) textos[`bloco ${b.id}`] = b.nome;
        for (const i of todosItens()) textos[`item ${i.id}`] = i.nome;
        for (const [tipo, d] of Object.entries(CRIATURAS)) textos[`criatura ${tipo}`] = d.nome;
        for (const [k, v] of Object.entries(NOMES_BIOMA)) textos[`bioma ${k}`] = v;
        for (const [k, v] of Object.entries(NOMES_ESTACAO)) textos[`estação ${k}`] = v;
        for (const [k, v] of Object.entries(NOMES_CLIMA)) textos[`clima ${k}`] = v;
        for (const m of MISSOES_DIARIO) {
          textos[`missão ${m.id}`] = m.titulo;
          textos[`missão ${m.id} (descrição)`] = m.descricao;
          textos[`capítulo ${m.id}`] = m.capitulo;
        }
        const pv = t.povoado!;
        textos['povoado'] = pv.nome;
        for (const [k, v] of Object.entries(pv.profissoes)) textos[`profissão ${k}`] = v;
        for (const [k, v] of Object.entries(pv.textos)) textos[`povoado ${k}`] = v;
        for (const n of pv.nomes) textos[`morador ${n}`] = n;
        for (const [k, v] of Object.entries(pv.porMorador ?? {})) textos[`morador ${k}`] = v.nome;
        expect(achados(textos)).toEqual([]);
      } finally {
        ativarTemaPuro(temaBase());
      }
    });

  it('o que vale em todo mundo: missões, banca, habilidades, presentes, fantasias e peças', () => {
    const textos: Record<string, string> = {};
    for (const m of MISSOES_ALMA) textos[`missão ${m.id}`] = m.nome;
    for (const b of BANCA) textos[`banca ${b.id}`] = b.nome;
    for (const h of HABILIDADES) {
      textos[`habilidade ${h.id}`] = h.nome;
      textos[`habilidade ${h.id} (conta)`] = h.conta;
    }
    for (const p of PRESENTES_NIVEL) textos[`presente ${p.nivel}`] = p.nome;
    for (const p of PREMIUM) textos[`premium ${p.id}`] = p.nome;
    for (const f of FANTASIAS) {
      textos[`fantasia ${f.id} (f)`] = f.nomes.feminino;
      textos[`fantasia ${f.id} (m)`] = f.nomes.masculino;
    }
    for (const [k, v] of Object.entries(NOMES_PECAS)) textos[`peça ${k}`] = v!;
    for (const [k, v] of Object.entries(NOMES_TEMAS)) {
      textos[`tema ${k}`] = v.nome;
      textos[`tema ${k} (curto)`] = v.curto;
    }
    expect(Object.keys(textos).length).toBeGreaterThan(80);
    expect(achados(textos)).toEqual([]);
  });

  it('a base não se escolhe e tem nome e boas-vindas neutros', () => {
    const b = temaBase();
    expect(temasDisponiveis()).not.toContain(b.id);
    expect(achados({ nome: b.nome, lema: b.lema, boasVindas: b.textos.boasVindas })).toEqual([]);
  });
});
