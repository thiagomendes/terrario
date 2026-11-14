/**
 * Esboço da spec 023 "Alma do jogo" (rodada 2, o modelo do dono de 13 nov 2026): os números
 * propostos. Só dados, sem Babylon nem DOM: é o que o núcleo levaria na implementação de
 * verdade (uma regra só para prever e conferir).
 *
 * - **Da criança, em todo mundo:** a carteira de moedinhas, o nível (sobe com tudo o que ela
 *   faz, em qualquer mundo, e cada nível dá um presentinho), as 5 habilidades e as fantasias.
 * - **De cada mundo:** as missões e os prêmios especiais delas, e a banca do mundo (itens do
 *   tema, pagos com as moedinhas da carteira).
 * - **Lojinha premium (universal):** coisas que o jogo nunca dá, só se compram com moedinhas.
 *
 * Regras (ver `.sdd/cuidados-legais.md`): prêmio e preço sempre conhecidos antes, nada
 * sorteado; nada expira, sem oferta por tempo, sem "só restam N", sem estoque que gira; a
 * moedinha não passa a outro jogador e não vira dinheiro.
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

export type IdHabilidade = 'construtor' | 'explorador' | 'bichos' | 'fazendeiro' | 'cozinheiro';

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
    habilidade: 'cozinheiro',
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
    habilidade: 'cozinheiro',
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

/** XP de cada missão feita (fora as ações soltas, em `XP_DE_EVENTO`). */
export const XP_MISSAO = 20;

// ------------------------------------------------------------------ habilidades (universais)
export interface Habilidade {
  id: IdHabilidade;
  /** Desenho do distintivo (arte.ts). */
  desenho: string;
  cor: string;
  nome: string;
  /** Os mundos que fazem esta habilidade subir (o desenho de cada um aparece no distintivo). */
  mundos: readonly MundoAlma[];
  conta: string;
}

/** Pontos para cada estrela (nível 1 a 5) de qualquer habilidade. */
export const ESTRELAS_HABILIDADE = [5, 15, 30, 50, 80] as const;
/** Pontos de habilidade ganhos com cada missão feita. */
export const PONTOS_POR_MISSAO = 3;

export const HABILIDADES: readonly Habilidade[] = [
  { id: 'construtor', desenho: 'construtor', cor: '#f28b2c', nome: 'Construtor', mundos: ['cidade-grande', 'rancho-alegre'], conta: 'blocos postos na obra (cidade) e construções (rancho)' },
  { id: 'explorador', desenho: 'explorador', cor: '#3f9ad8', nome: 'Explorador', mundos: ['cidade-grande', 'rancho-alegre'], conta: 'lugares novos (lojas, praça, açude, morro)' },
  { id: 'bichos', desenho: 'bichos', cor: '#e05a7a', nome: 'Amigo dos bichos', mundos: ['rancho-alegre'], conta: 'bicho alimentado ou criado (até 5 por dia de jogo)' },
  { id: 'fazendeiro', desenho: 'fazendeiro', cor: '#5cbf4f', nome: 'Fazendeiro', mundos: ['rancho-alegre'], conta: 'plantar e colher maduro' },
  { id: 'cozinheiro', desenho: 'cozinheiro', cor: '#c9772a', nome: 'Cozinheiro', mundos: ['cidade-grande', 'rancho-alegre'], conta: 'comida feita (pão, pipoca) e pão da padeira' },
];

export function estrelasDe(pontos: number): { estrelas: number; fracao: number } {
  let n = 0;
  while (n < 5 && pontos >= ESTRELAS_HABILIDADE[n]) n++;
  if (n >= 5) return { estrelas: 5, fracao: 1 };
  const de = n === 0 ? 0 : ESTRELAS_HABILIDADE[n - 1];
  return { estrelas: n, fracao: (pontos - de) / (ESTRELAS_HABILIDADE[n] - de) };
}

// ------------------------------------------------------------------ nível da criança
/** XP total para chegar a cada nível (o nível 1 é o começo). */
export const XP_DO_NIVEL = [0, 40, 100, 180, 280, 400, 540, 700, 880, 1080] as const;
export const NIVEL_MAXIMO_ESBOCO = XP_DO_NIVEL.length;

export interface PresenteNivel {
  nivel: number;
  /** Desenho do presente (arte.ts). */
  desenho: string;
  nome: string;
  moedas: number;
}

/**
 * O presentinho de cada nível: pequeno, visível, nunca premium (o premium só se compra).
 * Todos conhecidos antes (o caminho dos níveis mostra os próximos).
 */
export const PRESENTES_NIVEL: readonly PresenteNivel[] = [
  { nivel: 2, desenho: 'etiqueta', nome: 'Etiqueta do nome colorida', moedas: 2 },
  { nivel: 3, desenho: 'gestoEstrela', nome: 'Gesto novo: pulo de estrela', moedas: 2 },
  { nivel: 4, desenho: 'tinta', nome: 'Cor nova para as fantasias: lilás', moedas: 2 },
  { nivel: 5, desenho: 'moldura', nome: 'Moldura de foto de flores', moedas: 3 },
  { nivel: 6, desenho: 'balao', nome: 'Balão de fala com estrelinha', moedas: 3 },
  { nivel: 7, desenho: 'etiquetaEstrela', nome: 'Etiqueta do nome com estrela', moedas: 3 },
  { nivel: 8, desenho: 'gestoReverencia', nome: 'Gesto novo: reverência', moedas: 3 },
  { nivel: 9, desenho: 'tintaMenta', nome: 'Cor nova para as fantasias: menta', moedas: 3 },
  { nivel: 10, desenho: 'trofeu', nome: 'Troféu do nível 10 no álbum', moedas: 5 },
];

export function nivelDoXp(xp: number): { nivel: number; fracao: number; falta: number } {
  let n = 1;
  while (n < XP_DO_NIVEL.length && xp >= XP_DO_NIVEL[n]) n++;
  if (n >= XP_DO_NIVEL.length) return { nivel: n, fracao: 1, falta: 0 };
  const de = XP_DO_NIVEL[n - 1];
  const ate = XP_DO_NIVEL[n];
  return { nivel: n, fracao: (xp - de) / (ate - de), falta: ate - xp };
}

// ------------------------------------------------------------------ banca do mundo
/** Item da banca: só do tema do mundo, pago com as moedinhas da carteira, preço fixo. */
export interface ItemBanca {
  id: string;
  mundo: MundoAlma;
  nome: string;
  preco: number;
  /** 'item:<id>' (ícone do jogo) ou um desenho de arte.ts. */
  desenho: string;
  qtd: number;
}

export const BANCA: readonly ItemBanca[] = [
  { id: 'flores', mundo: 'cidade-grande', nome: 'Flores para a praça', preco: 3, desenho: 'item:bloco:9', qtd: 6 },
  { id: 'toldo-verde', mundo: 'cidade-grande', nome: 'Toldo verde', preco: 4, desenho: 'toldoVerde', qtd: 8 },
  { id: 'toldo-vermelho', mundo: 'cidade-grande', nome: 'Toldo vermelho', preco: 4, desenho: 'toldoVermelho', qtd: 8 },
  { id: 'poste', mundo: 'cidade-grande', nome: 'Poste de luz', preco: 5, desenho: 'item:bloco:97', qtd: 4 },
  { id: 'janela-acesa', mundo: 'cidade-grande', nome: 'Janela acesa', preco: 5, desenho: 'item:bloco:94', qtd: 6 },
  { id: 'feno', mundo: 'rancho-alegre', nome: 'Fardos de feno', preco: 3, desenho: 'item:bloco:81', qtd: 4 },
  { id: 'sementes-abobora', mundo: 'rancho-alegre', nome: 'Sementes de abóbora', preco: 3, desenho: 'item:semente_abobora', qtd: 6 },
  { id: 'lampiao', mundo: 'rancho-alegre', nome: 'Lampião de abóbora', preco: 4, desenho: 'item:bloco:66', qtd: 2 },
  { id: 'porteira', mundo: 'rancho-alegre', nome: 'Porteira', preco: 4, desenho: 'item:bloco:82', qtd: 2 },
  { id: 'cerca', mundo: 'rancho-alegre', nome: 'Cerca do curral', preco: 4, desenho: 'cerca', qtd: 12 },
  // a galinha já existe no jogo (bicho do Rancho): vem criada para o galinheiro
  { id: 'galinha', mundo: 'rancho-alegre', nome: 'Galinha para o galinheiro', preco: 6, desenho: 'galinha', qtd: 1 },
];

export function bancaDoMundo(mundo: MundoAlma): ItemBanca[] {
  return BANCA.filter((i) => i.mundo === mundo);
}

// ------------------------------------------------------------------ lojinha premium (universal)
export type CategoriaPremium = 'roupa' | 'costas' | 'fantasia' | 'bicho';

export interface ItemPremium {
  id: string;
  categoria: CategoriaPremium;
  nome: string;
  preco: number;
  /** O efeito que o faz premium (movimento, luz, acabamento). */
  efeito: string;
  /** Desenho do cartão (arte.ts). */
  desenho: string;
  /** Feito em 3D neste esboço (dá para experimentar no provador). */
  feito?: boolean;
}

/**
 * Coisas que o jogo nunca dá: nenhuma missão, nível ou habilidade libera. Preço fixo, sempre o
 * mesmo, sempre à venda (nada some, nada gira, nada acaba). Exclusivo pela qualidade.
 */
export const PREMIUM: readonly ItemPremium[] = [
  { id: 'camiseta-arco-iris', categoria: 'roupa', nome: 'Camiseta arco-íris', preco: 15, efeito: 'as listras correm devagar pela camiseta', desenho: 'pCamiseta' },
  { id: 'tenis-cometa', categoria: 'roupa', nome: 'Tênis-cometa', preco: 20, efeito: 'faixa de luz arco-íris; pegadas de luz e estrelinhas a cada passo', desenho: 'pTenis', feito: true },
  { id: 'visor-estelar', categoria: 'roupa', nome: 'Visor estelar', preco: 25, efeito: 'visor que brilha e reflete um céu de estrelas', desenho: 'pVisor' },
  { id: 'capa-estrelas', categoria: 'costas', nome: 'Capa de estrelas', preco: 30, efeito: 'balança com o vento e as estrelas piscam', desenho: 'pCapa' },
  { id: 'asas-borboleta', categoria: 'costas', nome: 'Asas de borboleta', preco: 40, efeito: 'batem devagar e brilham nas bordas', desenho: 'pBorboleta' },
  { id: 'mochila-foguete', categoria: 'costas', nome: 'Mochila-foguete', preco: 45, efeito: 'soltam baforadas de fumacinha colorida ao pular', desenho: 'pFoguete' },
  { id: 'dragao', categoria: 'fantasia', nome: 'Dragãozinho', preco: 55, efeito: 'asas que batem (mais forte correndo e no ar), chifres que brilham', desenho: 'pDragao', feito: true },
  { id: 'pinguim', categoria: 'bicho', nome: 'Pinguinzinho', preco: 60, efeito: 'segue gingando e escorrega de barriga nas descidas', desenho: 'pPinguim' },
  { id: 'panda', categoria: 'bicho', nome: 'Pandinha', preco: 65, efeito: 'segue rolando, senta e come bambu quando você para', desenho: 'pPanda' },
  { id: 'cao-robo', categoria: 'bicho', nome: 'Cãozinho-robô', preco: 70, efeito: 'olhos de luz, rabo-antena e pulinhos com faísca', desenho: 'pRobo' },
  { id: 'unicornio', categoria: 'bicho', nome: 'Unicórnio-pônei', preco: 80, efeito: 'trota atrás de você, pula junto, chifre que solta brilho e coraçõezinhos', desenho: 'pUnicornio', feito: true },
];

// ------------------------------------------------------------------ moedinhas: o ritmo
/** O que uma sessão de 15 minutos costuma render (para a conta de equilíbrio). */
export const SESSAO = { minutos: 15, missoes: 3, moedasPorMissao: 3.6 } as const;

export function moedasDoMundo(mundo: MundoAlma): number {
  return missoesDoMundo(mundo).reduce((s, m) => s + m.moedas, 0);
}
