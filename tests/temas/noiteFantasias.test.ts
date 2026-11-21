import { describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema, temasDisponiveis } from '../../src/temas';
import { IDS_TEMAS } from '../../src/temas/tipos';
import { textosOriginais } from '../../src/temas/originais';
import { NOMES_TEMAS } from '../../src/ui/abaFantasias';
import { nomeSugerido } from '../../src/cliente/identidade';
import { estiloSeguro } from '../../src/world/estiloSeguro';

/**
 * Spec 027 (T01): a Noite das Fantasias registrada como o sexto mundo. Nenhuma palavra em
 * inglês na tela ("Halloween" nunca aparece: o mundo diz "festa à fantasia" ou "Noite das
 * Fantasias"), nada de susto nos nomes e o gato nunca é "Pretinho".
 */
const t = obterTema('noite-das-fantasias');

/** Palavras em inglês que um mundo de Dia das Bruxas puxaria (e o inglês comum). */
const INGLES =
  /\b(halloween|trick|treat|party|witch|ghost|pumpkin|candy|spooky|happy|boo|the|and|of|night|bat|monster|costume)\b/i;
/** Nada de susto nos nomes (a regra das crianças de 3 e 4 anos). */
const SUSTO = /caveira|esqueleto|sangue|osso|aranha|terror|medo|assombr|monstro feio|pretinho/i;

function todosOsTextos(): string[] {
  const o = textosOriginais();
  const tx = t.textos;
  const sec = (a: Record<string, unknown>) =>
    Object.values(a).flatMap((v) =>
      typeof v === 'string' ? [v] : Object.values(v as Record<string, string>),
    );
  const pv = t.povoado!;
  return [
    t.nome,
    t.lema,
    t.convite,
    ...sec(tx.blocos),
    ...sec(tx.itens),
    ...sec(tx.criaturas),
    ...sec(tx.biomas),
    ...sec(tx.estacoes),
    ...sec(tx.climas),
    ...sec(tx.missoes),
    ...sec(tx.capitulos),
    ...sec(tx.legendas),
    tx.diario,
    tx.boasVindas,
    tx.morte,
    pv.nome,
    ...Object.values(pv.profissoes),
    ...pv.nomes,
    // T10: os moradores de posto (o nome e o que fazem)
    ...Object.values(pv.porMorador ?? {}).flatMap((m) => [m.nome, m.titulo ?? '']),
    ...Object.values(pv.textos),
    // e o que vale de base sem texto próprio (o que a criança lê neste mundo)
    ...Object.keys(o.blocos)
      .filter((k) => !(k in tx.blocos))
      .map((k) => o.blocos[Number(k)]),
  ];
}

describe('spec 027: a Noite das Fantasias registrada', () => {
  it('é o sexto tema, logo depois da Vila Neon nos cartões, e o servidor conhece o id', () => {
    expect(t.id).toBe('noite-das-fantasias');
    expect(t.nome).toBe('Noite das Fantasias');
    expect(temasDisponiveis().slice(0, 2)).toEqual(['vila-neon', 'noite-das-fantasias']);
    expect(IDS_TEMAS).toContain('noite-das-fantasias');
    expect(NOMES_TEMAS['noite-das-fantasias'].nome).toBe('Noite das Fantasias');
  });

  it('nenhum texto em inglês, nenhum "Halloween", nada de susto nem travessão', () => {
    const textos = todosOsTextos();
    expect(textos.length).toBeGreaterThan(100);
    for (const s of textos) {
      expect(INGLES.test(s), `"${s}" tem inglês`).toBe(false);
      expect(SUSTO.test(s), `"${s}" pode assustar`).toBe(false);
      expect(s.includes('—'), `"${s}" tem travessão`).toBe(false);
    }
    expect(t.textos.boasVindas).toMatch(/Noite das Fantasias|festa à fantasia/);
  });

  it('o céu sem arco-íris, a noite mansa e a planta da vila da festa (também na nuvem)', () => {
    expect(t.climaVisual.arcoIris).toBe(false);
    expect(t.mundo.noite).toBe('mansa');
    expect(t.mundo.povoado?.planta).toBe('baile');
    expect(estiloSeguro(t.mundo)).toEqual(t.mundo);
    // a noite nunca escura de verdade: o piso de luz da noite bem acima do da Vila Neon (0,3)
    expect(t.ceu.pisoNoite ?? 1).toBeGreaterThan(0.3);
  });

  it('o nome sugerido termina com "da Festa"', () => {
    expect(nomeSugerido('Bruxinha', 'noite-das-fantasias')).toBe('Bruxinha da Festa');
  });
});
