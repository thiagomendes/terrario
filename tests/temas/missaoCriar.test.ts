import { describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema, temasDisponiveis } from '../../src/temas';
import { textosOriginais } from '../../src/temas/originais';
import { MISSOES } from '../../src/jogo/diario';
import { COMIDA_DOS_BICHOS } from '../../src/jogo/criacao';

/**
 * Auditoria 013: o diário do Rancho mandava dar "milho" à galinha, mas ela só come
 * sementes (o milho de verdade ela recusa). Em todo tema, a missão de criar cita o nome que
 * o tema dá à comida do papel cervo e ao de uma das comidas do papel coelho.
 */
const minusculo = (s: string) => s.toLocaleLowerCase('pt-BR');
/** "Feixe de arroz" é citado como "arroz"; "Semente de ..." pode vir como "sementes". */
function cita(texto: string, nome: string): boolean {
  const t = minusculo(texto);
  const n = minusculo(nome);
  if (t.includes(n)) return true;
  if (n.startsWith('feixe de ') && t.includes(n.slice('feixe de '.length))) return true;
  return n.startsWith('semente') && t.includes('semente');
}

describe('missão de criar bicho: a comida certa em cada tema', () => {
  const base = MISSOES.find((m) => m.id === 'criar')!;
  for (const id of temasDisponiveis()) {
    it(id, () => {
      const t = obterTema(id);
      const itens = { ...textosOriginais().itens, ...t.textos.itens };
      const descricao = t.textos.missoes?.criar?.descricao ?? base.descricao;
      const doCervo = COMIDA_DOS_BICHOS.cervo!.map((i) => itens[i]);
      const doCoelho = COMIDA_DOS_BICHOS.coelho!.map((i) => itens[i]);
      expect(
        doCervo.some((n) => cita(descricao, n)),
        `${descricao} / ${doCervo}`,
      ).toBe(true);
      expect(
        doCoelho.some((n) => cita(descricao, n)),
        `${descricao} / ${doCoelho}`,
      ).toBe(true);
    });
  }
});
