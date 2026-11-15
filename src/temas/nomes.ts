import { povoadoDoTema } from './ativo';
import { hash2 } from '../world/noise';
import type { Profissao } from '../world/povoado';

export type Genero = 'f' | 'm' | 'n';

/**
 * Gênero dos nomes de gente dos temas (os nomes inventados, como Zib, Plim e Jujuba, servem
 * para qualquer um). O morador ganha um nome que combina com a profissão: "Ferreira" recebe
 * nome feminino, "Ferreiro" masculino, "Chef estelar" qualquer um.
 */
const NOMES_GENERO: Record<string, Genero> = {
  Lia: 'f',
  Mira: 'f',
  Nina: 'f',
  Bia: 'f',
  Luz: 'f',
  Dita: 'f',
  Lila: 'f',
  Rosa: 'f',
  Nena: 'f',
  Cida: 'f',
  Ana: 'f',
  Duda: 'f',
  Tati: 'f',
  Mel: 'f',
  Iris: 'f',
  Lara: 'f',
  Vega: 'f',
  Zara: 'f',
  Zefa: 'f',
  // spec 026: a turma da Vila Neon
  Kika: 'f',
  Lili: 'f',
  Teo: 'm',
  Davi: 'm',
  Caio: 'm',
  Rui: 'm',
  Ivo: 'm',
  Zé: 'm',
  Tonho: 'm',
  Chico: 'm',
  Bento: 'm',
  Juca: 'm',
  Tião: 'm',
  Leo: 'm',
  Gui: 'm',
  Beto: 'm',
  Otto: 'm',
  Nico: 'm',
  Tito: 'm',
  Rex: 'm',
  Kiko: 'm',
  Tunico: 'm',
  Dudu: 'm',
  Zeca: 'm',
};

export function generoDoNome(nome: string): Genero {
  return NOMES_GENERO[nome] ?? 'n';
}

/** Pela primeira palavra: Ferreira, Mecânica, Engenheira (f); Ferreiro, Confeiteiro (m). */
export function generoDaProfissao(rotulo: string): Genero {
  const p = rotulo.split(/[\s-]/)[0].toLowerCase();
  if (/(a|ã)$/.test(p)) return 'f';
  if (/(o|or|ês)$/.test(p)) return 'm';
  return 'n';
}

/** Nome do morador no tema: estável para o povoado e o número da casa, e no gênero da profissão. */
export function nomeDoMorador(povoado: string, n: number, profissao?: Profissao): string {
  const tema = povoadoDoTema();
  // spec 026: o morador de posto com nome próprio (a Vila Neon)
  const fixo = tema.porMorador?.[`${povoado}:${n}`];
  if (fixo) return fixo.nome;
  const genero = profissao ? generoDaProfissao(tema.profissoes[profissao]) : 'n';
  const todos = tema.nomes;
  const nomes =
    genero === 'n'
      ? todos
      : todos.filter((x) => generoDoNome(x) === genero || generoDoNome(x) === 'n');
  const lista = nomes.length > 0 ? nomes : todos;
  const [a, b] = povoado.split(',').map(Number);
  const base = Math.floor(hash2(a, b, 991) * lista.length);
  return lista[(base + n * 3) % lista.length];
}

/** Gênero do morador (do nome e da profissão): o boneco dele usa o corpo que combina. */
export function generoDoMorador(povoado: string, n: number, profissao: Profissao): 'f' | 'm' {
  const fixo = povoadoDoTema().porMorador?.[`${povoado}:${n}`];
  if (fixo) return fixo.genero;
  const g = generoDaProfissao(povoadoDoTema().profissoes[profissao]);
  if (g !== 'n') return g;
  const pelo = generoDoNome(nomeDoMorador(povoado, n, profissao));
  if (pelo !== 'n') return pelo;
  return hash2(n, profissao.length, 17) < 0.5 ? 'f' : 'm';
}
