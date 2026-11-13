/**
 * Esboço da spec 023 "Alma do jogo": os números propostos (missões, moedinhas, preços,
 * habilidades e o que cada nível libera). Só dados, sem Babylon nem DOM: é o que o núcleo
 * levaria na implementação de verdade (uma regra só para prever e conferir).
 *
 * Regras que estes dados seguem (ver `.sdd/cuidados-legais.md`):
 * - todo prêmio é conhecido antes (nada sorteado);
 * - preço fixo, mostrado antes, e a moedinha não sai do mundo nem passa a outro jogador;
 * - nada expira e nada se perde por ficar sem jogar.
 */

export type MundoAlma = 'cidade-grande' | 'rancho-alegre';

/** Como a missão conta o progresso (o evento que o núcleo já manda hoje, ou um novo). */
export type ContaMissao =
  | { tipo: 'obra'; canteiro: number }
  | { tipo: 'evento'; chave: string; meta: number }
  | { tipo: 'lugares'; usos: readonly string[] };

/** O desenho da missão (o que fazer), sem texto. */
export type DesenhoMissao =
  | { tipo: 'obra'; canteiro: number }
  | { tipo: 'item'; item: string; acao?: 'colher' | 'plantar' | 'dar' | 'fazer' | 'pegar' }
  | { tipo: 'bicho'; bicho: 'galinha' | 'vaca'; item: string }
  | { tipo: 'lugares'; usos: readonly string[] };

export type IdHabilidade = 'construtor' | 'explorador' | 'bichos' | 'fazendeiro' | 'mundo';

export interface Missao {
  id: string;
  mundo: MundoAlma;
  /** Nome curto, só para os pais e para quem lê (a criança vê o desenho). */
  nome: string;
  desenho: DesenhoMissao;
  conta: ContaMissao;
  /** Moedinhas do prêmio (fixas). */
  moedas: number;
  /** Fantasia ganha junto (do catálogo da 017, ou das novas deste esboço). */
  fantasia?: string;
  /** A habilidade que a missão faz crescer (e quanto). */
  habilidade: IdHabilidade;
  /** Minutos para uma criança de 4 anos (um toque a cada ~6 s, com distrações). */
  minutos: [number, number];
  /** Missão que corre "por baixo" das outras (espera a natureza), sem pressa e sem prazo. */
  devagar?: boolean;
}

/** Quantas missões ficam abertas para escolher (como os dois canteiros abertos da 014). */
export const MISSOES_ABERTAS = 2;
/** Depois de tudo feito: missões "de bis" (as mesmas, de novo), sem prêmio de fantasia. */
export const MOEDAS_BIS = 2;

export const MISSOES: readonly Missao[] = [
  // ----------------------------------------------------------------- Cidade Grande (8)
  {
    id: 'c1',
    mundo: 'cidade-grande',
    nome: 'Casinha do cachorro',
    desenho: { tipo: 'obra', canteiro: 1 },
    conta: { tipo: 'obra', canteiro: 1 },
    moedas: 3,
    fantasia: 'capacete-obra',
    habilidade: 'construtor',
    minutos: [2, 3],
  },
  {
    id: 'c2',
    mundo: 'cidade-grande',
    nome: 'Banca de frutas',
    desenho: { tipo: 'obra', canteiro: 2 },
    conta: { tipo: 'obra', canteiro: 2 },
    moedas: 3,
    habilidade: 'construtor',
    minutos: [2, 3],
  },
  {
    id: 'c3',
    mundo: 'cidade-grande',
    nome: 'Passeio: padaria, escola e sorveteria',
    desenho: { tipo: 'lugares', usos: ['padaria', 'escola', 'sorveteria'] },
    conta: { tipo: 'lugares', usos: ['padaria', 'escola', 'sorveteria'] },
    moedas: 3,
    habilidade: 'explorador',
    minutos: [3, 4],
  },
  {
    id: 'c4',
    mundo: 'cidade-grande',
    nome: 'Ponto de ônibus',
    desenho: { tipo: 'obra', canteiro: 3 },
    conta: { tipo: 'obra', canteiro: 3 },
    moedas: 3,
    habilidade: 'construtor',
    minutos: [2, 3],
  },
  {
    id: 'c5',
    mundo: 'cidade-grande',
    nome: 'Pão da padeira',
    desenho: { tipo: 'item', item: 'pao', acao: 'pegar' },
    conta: { tipo: 'evento', chave: 'trocou:cozinheiro', meta: 1 },
    moedas: 3,
    habilidade: 'mundo',
    minutos: [2, 3],
  },
  {
    id: 'c6',
    mundo: 'cidade-grande',
    nome: 'Sorveteria',
    desenho: { tipo: 'obra', canteiro: 4 },
    conta: { tipo: 'obra', canteiro: 4 },
    moedas: 5,
    habilidade: 'construtor',
    minutos: [5, 7],
  },
  {
    id: 'c7',
    mundo: 'cidade-grande',
    nome: 'Casinha com porta e janela',
    desenho: { tipo: 'obra', canteiro: 5 },
    conta: { tipo: 'obra', canteiro: 5 },
    moedas: 5,
    habilidade: 'construtor',
    minutos: [6, 8],
  },
  {
    id: 'c8',
    mundo: 'cidade-grande',
    nome: 'Coreto da praça',
    desenho: { tipo: 'obra', canteiro: 6 },
    conta: { tipo: 'obra', canteiro: 6 },
    moedas: 5,
    fantasia: 'colete-obra',
    habilidade: 'construtor',
    minutos: [6, 8],
  },
  // ----------------------------------------------------------------- Rancho Alegre (7)
  {
    id: 'r1',
    mundo: 'rancho-alegre',
    nome: 'Colheita do sítio',
    desenho: { tipo: 'item', item: 'trigo', acao: 'colher' },
    conta: { tipo: 'evento', chave: 'colheu', meta: 5 },
    moedas: 3,
    fantasia: 'caipira',
    habilidade: 'fazendeiro',
    minutos: [2, 3],
  },
  {
    id: 'r2',
    mundo: 'rancho-alegre',
    nome: 'Milho para as galinhas',
    desenho: { tipo: 'bicho', bicho: 'galinha', item: 'semente_milho' },
    conta: { tipo: 'evento', chave: 'criou:coelho', meta: 2 },
    moedas: 3,
    habilidade: 'bichos',
    minutos: [2, 3],
  },
  {
    id: 'r3',
    mundo: 'rancho-alegre',
    nome: 'Roça nova',
    desenho: { tipo: 'item', item: 'semente_trigo', acao: 'plantar' },
    conta: { tipo: 'evento', chave: 'plantou', meta: 6 },
    moedas: 3,
    habilidade: 'fazendeiro',
    minutos: [3, 4],
  },
  {
    id: 'r4',
    mundo: 'rancho-alegre',
    nome: 'Trigo para a vaquinha',
    desenho: { tipo: 'bicho', bicho: 'vaca', item: 'trigo' },
    conta: { tipo: 'evento', chave: 'criou:cervo', meta: 2 },
    moedas: 3,
    habilidade: 'bichos',
    minutos: [2, 4],
  },
  {
    id: 'r5',
    mundo: 'rancho-alegre',
    nome: 'Pão caseiro',
    desenho: { tipo: 'item', item: 'pao', acao: 'fazer' },
    conta: { tipo: 'evento', chave: 'fabricou:pao', meta: 1 },
    moedas: 4,
    habilidade: 'mundo',
    minutos: [3, 4],
  },
  {
    id: 'r6',
    mundo: 'rancho-alegre',
    nome: 'Ovos do galinheiro',
    desenho: { tipo: 'item', item: 'ovo', acao: 'pegar' },
    conta: { tipo: 'evento', chave: 'coletou:ovo', meta: 2 },
    moedas: 4,
    habilidade: 'bichos',
    minutos: [6, 10],
    devagar: true,
  },
  {
    id: 'r7',
    mundo: 'rancho-alegre',
    nome: 'A sua roça cresceu',
    desenho: { tipo: 'item', item: 'bloco:65', acao: 'colher' },
    conta: { tipo: 'evento', chave: 'colheu:minha', meta: 6 },
    moedas: 5,
    fantasia: 'peao-campeao',
    habilidade: 'fazendeiro',
    minutos: [6, 10],
    devagar: true,
  },
];

export function missoesDoMundo(mundo: MundoAlma): Missao[] {
  return MISSOES.filter((m) => m.mundo === mundo);
}

/** Uma habilidade: o desenho e os 3 níveis (quantos pontos e o que cada nível libera). */
export interface NivelHabilidade {
  pontos: number;
  /** O que aparece: id de um item da lojinha (fica liberado) ou presente direto. */
  libera: string;
}
export interface Habilidade {
  id: IdHabilidade;
  /** Desenho do distintivo (arte.ts). */
  desenho: string;
  cor: string;
  nome: string;
  /** O que conta ponto (para os pais e para o núcleo). */
  conta: string;
  niveis: readonly [NivelHabilidade, NivelHabilidade, NivelHabilidade];
}

/** Pontos de habilidade ganhos com cada missão feita (fora as ações soltas). */
export const PONTOS_POR_MISSAO = 3;

/** O que o nível 3 libera: a medalha dourada da habilidade (vai para o álbum). */
export const MEDALHA = 'medalha';

export const HABILIDADES: Readonly<Record<MundoAlma, readonly Habilidade[]>> = {
  'cidade-grande': [
    hab('construtor', 'construtor', '#f28b2c', 'Construtor', '1 ponto a cada 5 blocos postos na obra; 3 por obra terminada', [6, 'toldo-verde'], [18, 'capacete-dourado'], 36),
    hab('explorador', 'explorador', '#3f9ad8', 'Explorador', '1 ponto por lugar novo (loja, terraço, parque, praça)', [3, 'bandeirinha-cidade'], [7, 'turista'], 12),
    hab('bichos', 'bichos', '#e05a7a', 'Amigo dos bichos', '1 ponto por carinho ou comida a um bicho (até 5 por dia de jogo)', [3, 'osso'], [8, 'gatinho'], 15),
    hab('fazendeiro', 'jardineiro', '#5cbf4f', 'Jardineiro', '1 ponto por flor ou arbusto plantado na praça ou no terraço', [4, 'flores'], [10, 'arbusto'], 20),
    hab('mundo', 'vizinho', '#8a5ad8', 'Vizinho', '1 ponto por troca ou ajuda a um morador', [3, 'pao-presente'], [8, 'bone-cidade'], 15),
  ],
  'rancho-alegre': [
    hab('construtor', 'construtor', '#f28b2c', 'Construtor', '1 ponto a cada 10 blocos postos', [5, 'porteira'], [15, 'cerca'], 30),
    hab('explorador', 'explorador', '#3f9ad8', 'Explorador', '1 ponto por lugar novo (açude, morro, pomar, outro sítio)', [3, 'lampiao'], [7, 'lanterna'], 12),
    hab('bichos', 'bichos', '#e05a7a', 'Amigo dos bichos', '1 ponto por bicho criado ou alimentado (até 5 por dia de jogo)', [4, 'galinha-nova'], [10, 'cavalinho'], 18),
    hab('fazendeiro', 'fazendeiro', '#5cbf4f', 'Fazendeiro', '1 ponto a cada 2 plantas colhidas maduras', [5, 'sementes-abobora'], [12, 'espantalho'], 24),
    hab('mundo', 'cozinheiro', '#c9772a', 'Cozinheiro da roça', '1 ponto por comida feita (pão, pipoca, doce de abóbora)', [2, 'pipoca'], [6, 'cozinheira-roca'], 12),
  ],
};

/** Nível 1 e 2 liberam um item (ou dão um presente); o nível 3 dá a medalha dourada. */
function hab(
  id: IdHabilidade,
  desenho: string,
  cor: string,
  nome: string,
  conta: string,
  n1: [number, string],
  n2: [number, string],
  n3: number,
): Habilidade {
  return {
    id,
    desenho,
    cor,
    nome,
    conta,
    niveis: [
      { pontos: n1[0], libera: n1[1] },
      { pontos: n2[0], libera: n2[1] },
      { pontos: n3, libera: MEDALHA },
    ],
  };
}

/** Nível (0 a 3) com tantos pontos, e a fração até o próximo. */
export function nivelDe(h: Habilidade, pontos: number): { nivel: number; fracao: number } {
  let nivel = 0;
  while (nivel < 3 && pontos >= h.niveis[nivel].pontos) nivel++;
  if (nivel >= 3) return { nivel, fracao: 1 };
  const de = nivel === 0 ? 0 : h.niveis[nivel - 1].pontos;
  return { nivel, fracao: (pontos - de) / (h.niveis[nivel].pontos - de) };
}

export type TipoLoja = 'fantasia' | 'enfeite' | 'item' | 'bicho';

/** Um item da lojinha: preço fixo e conhecido; o que é do mundo fica no mundo. */
export interface ItemLoja {
  id: string;
  mundo: MundoAlma;
  tipo: TipoLoja;
  nome: string;
  preco: number;
  /** Desenho: 'item:<id>' (ícone do jogo), 'fantasia:<id>' (foto do boneco) ou arte.ts. */
  desenho: string;
  /** Quantos vêm (blocos de enfeite). */
  qtd?: number;
  /** Só aparece na prateleira depois deste nível de habilidade (o cadeado mostra qual). */
  precisa?: { habilidade: IdHabilidade; nivel: 1 | 2 | 3 };
  /** Presente do nível (não é vendido: vai direto para a criança). */
  presente?: boolean;
}

export const LOJA: readonly ItemLoja[] = [
  // ---------------------------------------------------------------- Cidade Grande
  { id: 'flores', mundo: 'cidade-grande', tipo: 'enfeite', nome: 'Flores para a praça', preco: 3, desenho: 'item:bloco:9', qtd: 6, precisa: { habilidade: 'fazendeiro', nivel: 1 } },
  { id: 'toldo-verde', mundo: 'cidade-grande', tipo: 'enfeite', nome: 'Toldo verde', preco: 4, desenho: 'item:bloco:100', qtd: 8, precisa: { habilidade: 'construtor', nivel: 1 } },
  { id: 'poste', mundo: 'cidade-grande', tipo: 'enfeite', nome: 'Poste de luz', preco: 5, desenho: 'item:bloco:97', qtd: 4 },
  { id: 'bandeirinha-cidade', mundo: 'cidade-grande', tipo: 'enfeite', nome: 'Bandeirinhas da praça', preco: 4, desenho: 'bandeirinhas', precisa: { habilidade: 'explorador', nivel: 1 } },
  { id: 'osso', mundo: 'cidade-grande', tipo: 'item', nome: 'Ossinho para o cachorro', preco: 3, desenho: 'osso', precisa: { habilidade: 'bichos', nivel: 1 } },
  { id: 'arbusto', mundo: 'cidade-grande', tipo: 'enfeite', nome: 'Arbusto de frutinhas', preco: 5, desenho: 'item:bloco:54', qtd: 4, precisa: { habilidade: 'fazendeiro', nivel: 2 } },
  { id: 'bone-cidade', mundo: 'cidade-grande', tipo: 'fantasia', nome: 'Boné da cidade', preco: 6, desenho: 'fantasia:bone-cidade', precisa: { habilidade: 'mundo', nivel: 2 } },
  { id: 'turista', mundo: 'cidade-grande', tipo: 'fantasia', nome: 'Turista', preco: 8, desenho: 'fantasia:turista', precisa: { habilidade: 'explorador', nivel: 2 } },
  { id: 'gatinho', mundo: 'cidade-grande', tipo: 'bicho', nome: 'Gatinho da praça', preco: 10, desenho: 'gato', precisa: { habilidade: 'bichos', nivel: 2 } },
  // presentes de nível (não se compram)
  { id: 'capacete-dourado', mundo: 'cidade-grande', tipo: 'fantasia', nome: 'Capacete dourado', preco: 0, desenho: 'fantasia:capacete-dourado', presente: true, precisa: { habilidade: 'construtor', nivel: 2 } },
  { id: 'pao-presente', mundo: 'cidade-grande', tipo: 'item', nome: 'Pão de presente', preco: 0, desenho: 'item:pao', qtd: 3, presente: true, precisa: { habilidade: 'mundo', nivel: 1 } },
  // ---------------------------------------------------------------- Rancho Alegre
  { id: 'feno', mundo: 'rancho-alegre', tipo: 'enfeite', nome: 'Fardos de feno', preco: 3, desenho: 'item:bloco:81', qtd: 4 },
  { id: 'sementes-abobora', mundo: 'rancho-alegre', tipo: 'item', nome: 'Sementes de abóbora', preco: 3, desenho: 'item:semente_abobora', qtd: 6, precisa: { habilidade: 'fazendeiro', nivel: 1 } },
  { id: 'lampiao', mundo: 'rancho-alegre', tipo: 'enfeite', nome: 'Lampião de abóbora', preco: 4, desenho: 'item:bloco:66', qtd: 2, precisa: { habilidade: 'explorador', nivel: 1 } },
  { id: 'porteira', mundo: 'rancho-alegre', tipo: 'enfeite', nome: 'Porteira', preco: 4, desenho: 'item:bloco:82', qtd: 2, precisa: { habilidade: 'construtor', nivel: 1 } },
  { id: 'cerca', mundo: 'rancho-alegre', tipo: 'enfeite', nome: 'Cerca do curral', preco: 4, desenho: 'item:bloco:61', qtd: 12, precisa: { habilidade: 'construtor', nivel: 2 } },
  { id: 'lanterna', mundo: 'rancho-alegre', tipo: 'item', nome: 'Lanterna de explorar', preco: 5, desenho: 'item:bloco:38', qtd: 2, precisa: { habilidade: 'explorador', nivel: 2 } },
  { id: 'galinha-nova', mundo: 'rancho-alegre', tipo: 'bicho', nome: 'Galinha para o galinheiro', preco: 6, desenho: 'galinha', precisa: { habilidade: 'bichos', nivel: 1 } },
  { id: 'fazendeira-domingo', mundo: 'rancho-alegre', tipo: 'fantasia', nome: 'Roupa de domingo', preco: 8, desenho: 'fantasia:fazendeira-domingo' },
  { id: 'espantalho', mundo: 'rancho-alegre', tipo: 'enfeite', nome: 'Espantalho', preco: 8, desenho: 'espantalho', precisa: { habilidade: 'fazendeiro', nivel: 2 } },
  { id: 'cavalinho', mundo: 'rancho-alegre', tipo: 'bicho', nome: 'Cavalinho', preco: 12, desenho: 'cavalo', precisa: { habilidade: 'bichos', nivel: 2 } },
  { id: 'pipoca', mundo: 'rancho-alegre', tipo: 'item', nome: 'Pipoca de presente', preco: 0, desenho: 'item:pipoca', qtd: 3, presente: true, precisa: { habilidade: 'mundo', nivel: 1 } },
  { id: 'cozinheira-roca', mundo: 'rancho-alegre', tipo: 'fantasia', nome: 'Cozinheira da roça', preco: 0, desenho: 'fantasia:cozinheira-roca', presente: true, precisa: { habilidade: 'mundo', nivel: 2 } },
];

export function lojaDoMundo(mundo: MundoAlma): ItemLoja[] {
  return LOJA.filter((i) => i.mundo === mundo);
}

/** O total de moedinhas que as missões de um mundo dão (sem as de bis). */
export function moedasDoMundo(mundo: MundoAlma): number {
  return missoesDoMundo(mundo).reduce((s, m) => s + m.moedas, 0);
}
