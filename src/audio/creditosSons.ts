/**
 * Créditos dos sons (spec 019, T05): o que aparece em Configurações → Áudio → "Créditos dos
 * sons". Texto curto, sem links (é um jogo para crianças). A lista de autores sai dos créditos
 * de `public/sons/indice.json`; um teste de unidade confere que as duas batem.
 */
export interface GrupoCreditos {
  titulo: string;
  texto: string;
  /** Autores das gravações (só nas vozes). */
  autores?: readonly string[];
}

/** Autores das gravações de bichos, por acervo (a pessoa que publicou cada som). */
export const AUTORES_GRAVACOES: Readonly<Record<string, readonly string[]>> = {
  'Wikimedia Commons': [
    '*ngoomie',
    'A.-K. D.',
    'Crunchysaviour',
    'earthcalling',
    'Eviatar Bach',
    'Flame, not lame',
    'Gasybeaugosse2020',
    'Joseph Sardin',
    'kessir',
    'Knites',
    'lmbubec',
    'mary905',
    'Md. Tahmid Hossain',
    'Mysid',
    'PSsoundproject',
    'Rabe19',
    'Retron',
    'sagetyrtle',
    'stephan',
    'stilgar',
    'Tiago Lubiana',
    'TwoWings',
    'U.S. Fish and Wildlife Service',
    'W0lfie',
    'WrS.tm.pl',
    'தகவலுழவன்',
  ],
  BigSoundBank: ['DenisChardonnet', 'Joseph SARDIN'],
  PDSounds: ['alys'],
};

export const CREDITOS_SONS: readonly GrupoCreditos[] = [
  {
    titulo: 'Música',
    texto:
      'Composta para o Terrário e gravada com o banco de instrumentos FluidR3_GM (Frank Wen e colaboradores, licença MIT).',
  },
  {
    titulo: 'Vozes dos bichos',
    texto:
      'Feitas a partir de gravações livres (domínio público e CC0) da Wikimedia Commons, do BigSoundBank e do PDSounds. Obrigado a:',
    autores: Object.entries(AUTORES_GRAVACOES).flatMap(([acervo, nomes]) =>
      nomes.map((n) => `${n} (${acervo})`),
    ),
  },
  {
    titulo: 'Moradores, golpes, passos e o resto',
    texto:
      'Sons feitos por nós: os moradores e os golpes, gravados de síntese própria; passos, blocos, gestos e menus, gerados na hora pelo jogo.',
  },
];

/**
 * O nome do autor como aparece nos créditos, a partir do campo `autor` do índice: sem os
 * comentários entre parênteses ("trabalho próprio", "via PDSounds"...). Devolve null quando o
 * autor não deu nome ("myself" no Commons).
 */
export function nomeDoAutor(autor: string): string | null {
  const n = autor
    .replace(/\s*\((trabalho próprio|Diskussion)\)/g, '')
    .replace(/\s*\(via PDSounds[^)]*\)/g, '')
    .replace(/ at English Wikipedia$/, '')
    .trim();
  return n && n !== 'myself' ? n : null;
}

/** O acervo do crédito (o que veio do PDSounds pelo Commons conta como PDSounds). */
export function acervoDoCredito(c: { autor?: string; acervo?: string }): string | null {
  if (!c.acervo) return null;
  return c.autor?.includes('PDSounds') ? 'PDSounds' : c.acervo;
}
