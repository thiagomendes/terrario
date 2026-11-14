/**
 * Spec 023 "Alma do jogo": as regras puras numa peça só (sem DOM, sem Babylon). O núcleo
 * (servidor local e nuvem) confere e decide todo ganho com elas; o cliente prevê e aplica no
 * perfil da criança só o que o núcleo mandou (lição 5 da 014).
 *
 * - **Da criança (universal, no aparelho até a 024):** a carteira de moedinhas, o XP e o nível,
 *   as 5 habilidades, as fantasias ganhas nas missões e os premium (`PerfilAlma`).
 * - **De cada mundo, de cada jogador (no núcleo, `extras.alma[id]`):** as missões feitas, a
 *   fixada, o progresso, o bis, os lugares já vistos, o baú da banca e o livro-razão
 *   (`AlmaMundo`).
 * - **Lojinha premium (universal):** só os 6 de lançamento (decisão do dono): nunca saem de
 *   missão, nível ou habilidade.
 *
 * Cuidados (`.sdd/cuidados-legais.md`): prêmio e preço sempre conhecidos antes, nada sorteado,
 * nada expira, sem limite por dia, sem oferta por tempo; a moedinha não passa a outro jogador.
 */

export type MundoAlma = 'cidade-grande' | 'rancho-alegre' | 'era-dos-dinos' | 'doce-reino';
export const MUNDOS_ALMA: readonly MundoAlma[] = [
  'cidade-grande',
  'rancho-alegre',
  'era-dos-dinos',
  'doce-reino',
];

/**
 * O mundo da alma pela planta dos povoados (o núcleo só conhece o estilo do mundo): a cidade é
 * a Cidade Grande, o sítio é o Rancho Alegre.
 */
export function mundoAlmaDaPlanta(planta: string | undefined): MundoAlma | null {
  return planta === 'cidade' ? 'cidade-grande' : planta === 'sitio' ? 'rancho-alegre' : null;
}

/**
 * Spec 031: o mundo da alma pelo estilo do mundo, a única coisa de tema que o núcleo conhece.
 * A Cidade e o Rancho pela planta; a Era dos Dinos e o Doce Reino pela estrutura rara, que só
 * eles usam (o ninho e a casinha). Não precisa de campo novo no estilo: os mundos já salvos na
 * nuvem (com o estilo de antes) ganham as missões sem mudar nada, e a rede fica igual.
 */
export function mundoAlmaDoEstilo(
  estilo: { estrutura?: string; povoado?: { planta?: string } } | null | undefined,
): MundoAlma | null {
  const pela = mundoAlmaDaPlanta(estilo?.povoado?.planta);
  if (pela) return pela;
  if (estilo?.estrutura === 'ninho') return 'era-dos-dinos';
  if (estilo?.estrutura === 'casinha') return 'doce-reino';
  return null;
}

export type IdHabilidade = 'construtor' | 'explorador' | 'bichos' | 'fazendeiro' | 'cozinheiro';
export const IDS_HABILIDADE: readonly IdHabilidade[] = [
  'construtor',
  'explorador',
  'bichos',
  'fazendeiro',
  'cozinheiro',
];

/** Como a missão conta: a obra do canteiro, um evento do núcleo (chave) ou lugares da cidade. */
export type ContaMissao =
  | { tipo: 'obra'; canteiro: number }
  | { tipo: 'evento'; chave: string; meta: number }
  | { tipo: 'lugares'; usos: readonly string[] };

/** O desenho da missão (o que fazer), sem texto: o HUD desenha a partir disto. */
export type DesenhoMissao =
  | { tipo: 'obra'; canteiro: number }
  | { tipo: 'item'; item: string; acao?: 'colher' | 'plantar' | 'dar' | 'fazer' | 'pegar' }
  | { tipo: 'bicho'; bicho: 'galinha' | 'vaca'; item: string }
  | { tipo: 'lugares'; usos: readonly string[] }
  /**
   * Spec 031: desenhos próprios (de `arte.ts`). `principal` e `selo` à esquerda do cartão (o
   * que fazer); `resultado` à direita (como fica depois: nunca o mesmo desenho da esquerda);
   * `bolinha` em cada bolinha do progresso; `placa` na placa do lugar e no selinho.
   */
  | {
      tipo: 'arte';
      principal: string;
      selo: string;
      resultado: string;
      bolinha: string;
      placa: string;
    };

export interface Missao {
  id: string;
  mundo: MundoAlma;
  /** Nome curto, só para os pais (a criança vê o desenho). */
  nome: string;
  desenho: DesenhoMissao;
  conta: ContaMissao;
  /** Moedinhas do prêmio (fixas, mostradas antes). */
  moedas: number;
  /** Fantasia de prêmio (só desta missão, deste mundo). */
  fantasia?: string;
  habilidade: IdHabilidade;
  /** Minutos para uma criança de 4 anos (um toque a cada ~6 s). */
  minutos: readonly [number, number];
  /** Corre por baixo das outras (espera a natureza): conta sempre, nunca falha. */
  devagar?: boolean;
}

/** Missões abertas de cada vez (como os dois canteiros abertos da 014). */
export const MISSOES_ABERTAS = 2;
/** Bis (depois da lista): 2 moedinhas, metade do XP, sem fantasia, sem prazo. */
export const MOEDAS_BIS = 2;
/** XP de cada missão feita. */
export const XP_MISSAO = 20;
/** Pontos da habilidade da missão a cada missão feita. */
export const PONTOS_POR_MISSAO = 3;

export const MISSOES: readonly Missao[] = [
  // ------------------------------------------------------------ Cidade Grande (8, 30 moedinhas)
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
  // ------------------------------------------------------------ Rancho Alegre (7, 25 moedinhas)
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
    nome: 'Milho para 2 galinhas',
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
    nome: 'Trigo para 2 vacas',
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
    nome: '2 ovos do galinheiro',
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
  // ------------------------------------------------------------ Era dos Dinos (3, 15 moedinhas)
  // spec 031: tudo mora no canto das missões, perto de onde a criança nasce
  {
    id: 'd1',
    mundo: 'era-dos-dinos',
    nome: 'Ovinhos do ninho',
    desenho: {
      tipo: 'arte',
      principal: 'ninhoOvos',
      selo: 'pegar',
      resultado: 'mochilaOvos',
      bolinha: 'ovoDino',
      placa: 'ovoDino',
    },
    conta: { tipo: 'evento', chave: 'coletou:ovo:ninho', meta: 3 },
    moedas: 4,
    habilidade: 'bichos',
    minutos: [1, 2],
  },
  {
    id: 'd2',
    mundo: 'era-dos-dinos',
    nome: 'Capim para 2 pescoçudos',
    desenho: {
      tipo: 'arte',
      principal: 'pescocudo',
      selo: 'capimDourado',
      resultado: 'pescocudoCoracao',
      bolinha: 'pescocudo',
      placa: 'pescocudo',
    },
    conta: { tipo: 'evento', chave: 'criou:cervo', meta: 2 },
    moedas: 5,
    habilidade: 'bichos',
    minutos: [1, 2],
  },
  {
    id: 'd3',
    mundo: 'era-dos-dinos',
    nome: 'Fósseis na areia',
    desenho: {
      tipo: 'arte',
      principal: 'rochaOsso',
      selo: 'pincel',
      resultado: 'ossoAchado',
      bolinha: 'osso',
      placa: 'rochaOsso',
    },
    conta: { tipo: 'evento', chave: 'escavou:fossil', meta: 3 },
    moedas: 6,
    habilidade: 'explorador',
    minutos: [1, 2],
  },
  // ------------------------------------------------------------ Doce Reino (2, 15 moedinhas)
  {
    id: 'e1',
    mundo: 'doce-reino',
    nome: 'Bolo de aniversário',
    desenho: {
      tipo: 'arte',
      principal: 'boloFantasma',
      selo: 'construtor',
      resultado: 'boloAceso',
      bolinha: 'boloAceso',
      placa: 'boloAceso',
    },
    conta: { tipo: 'evento', chave: 'bolo:feito', meta: 1 },
    moedas: 8,
    habilidade: 'construtor',
    minutos: [1, 2],
  },
  {
    id: 'e2',
    mundo: 'doce-reino',
    nome: 'Broto-doce para 2 ovelhas',
    desenho: {
      tipo: 'arte',
      principal: 'ovelha',
      selo: 'brotoDoce',
      resultado: 'ovelhaCoracao',
      bolinha: 'ovelha',
      placa: 'ovelha',
    },
    conta: { tipo: 'evento', chave: 'criou:cervo', meta: 2 },
    moedas: 7,
    habilidade: 'bichos',
    minutos: [1, 2],
  },
];

const POR_ID: ReadonlyMap<string, Missao> = new Map(MISSOES.map((m) => [m.id, m]));
export const missaoPorId = (id: string): Missao | undefined => POR_ID.get(id);
export function missoesDoMundo(mundo: MundoAlma | null): Missao[] {
  return mundo ? MISSOES.filter((m) => m.mundo === mundo) : [];
}
export function moedasDoMundo(mundo: MundoAlma): number {
  return missoesDoMundo(mundo).reduce((s, m) => s + m.moedas, 0);
}
/** Quanto a missão pede (a obra tem a conta dela no núcleo: aqui vale 1). */
export function metaDa(m: Missao): number {
  return m.conta.tipo === 'evento'
    ? m.conta.meta
    : m.conta.tipo === 'lugares'
      ? m.conta.usos.length
      : 1;
}
/** As missões que podem voltar no bis (as de ação; obra e passeio só acontecem uma vez). */
export function missoesDeBis(mundo: MundoAlma | null): Missao[] {
  return missoesDoMundo(mundo).filter((m) => m.conta.tipo === 'evento');
}

// ------------------------------------------------------------------ ganhos das ações soltas
/**
 * XP e pontos de habilidade de cada ação que o núcleo decide (as chaves do diário). Spec: obra
 * 1 por bloco; colher maduro 2; plantar 1; dar comida a um bicho 4; pão 5; lugar novo 5; troca
 * com morador 3; pôr bloco 0,2.
 */
export const GANHO_DE_EVENTO: Readonly<
  Record<string, { xp: number; hab?: readonly [IdHabilidade, number] }>
> = {
  'obra:bloco': { xp: 1, hab: ['construtor', 0.2] },
  colocou: { xp: 0.2, hab: ['construtor', 0.1] },
  'visitou:lugar': { xp: 5, hab: ['explorador', 1] },
  'criou:coelho': { xp: 4, hab: ['bichos', 1] },
  'criou:cervo': { xp: 4, hab: ['bichos', 1] },
  colheu: { xp: 2, hab: ['fazendeiro', 0.5] },
  // a planta que o próprio jogador plantou vem junto com 'colheu' (conta só a missão r7)
  'colheu:minha': { xp: 0 },
  plantou: { xp: 1, hab: ['fazendeiro', 0.25] },
  'coletou:ovo': { xp: 3, hab: ['bichos', 0.5] },
  // spec 031: o ovinho do ninho do canto, a rocha de osso escavada e o bloco do bolo
  'coletou:ovo:ninho': { xp: 3, hab: ['bichos', 0.5] },
  'escavou:fossil': { xp: 2, hab: ['explorador', 0.5] },
  'bolo:bloco': { xp: 1, hab: ['construtor', 0.2] },
  // receita de comida (o pão e as outras): o núcleo manda a chave 'cozinhou' para o ganho
  cozinhou: { xp: 5, hab: ['cozinheiro', 1] },
  // receita que não é comida (ferramenta, bloco): pouco, e conta para o cozinheiro (pedido
  // do dono: fazer coisas na bancada também é cozinhar um pouquinho)
  fabricou: { xp: 1, hab: ['cozinheiro', 0.25] },
  'fundiu:pipoca': { xp: 4, hab: ['cozinheiro', 1] },
  'trocou:cozinheiro': { xp: 3, hab: ['cozinheiro', 1] },
  'trocou:ferreiro': { xp: 3 },
  'trocou:construtor': { xp: 3, hab: ['construtor', 0.5] },
};
/**
 * O ganho de uma chave (pedido do dono: o nível e as habilidades sobem em qualquer mundo): a
 * chave exata, ou a família dela ('criou:dino' vale como dar comida a qualquer bicho; a comida
 * tirada da fornalha vale como a pipoca).
 */
export function ganhoDaChave(
  chave: string,
): { xp: number; hab?: readonly [IdHabilidade, number] } | undefined {
  const g = GANHO_DE_EVENTO[chave];
  if (g) return g;
  if (chave.startsWith('criou:')) return GANHO_DE_EVENTO['criou:coelho'];
  if (chave.startsWith('fundiu:')) return GANHO_DE_EVENTO['fundiu:pipoca'];
  if (chave.startsWith('trocou:')) return GANHO_DE_EVENTO['trocou:ferreiro'];
  return undefined;
}
/** Segundos em que o mesmo bicho alimentado de novo não conta (sem limite por dia). */
export const ESPERA_MESMO_BICHO = 60;

// ------------------------------------------------------------------ habilidades
export interface Habilidade {
  id: IdHabilidade;
  desenho: string;
  cor: string;
  nome: string;
  mundos: readonly MundoAlma[];
  conta: string;
}
/** Pontos para cada estrela (1 a 5) de qualquer habilidade. */
export const ESTRELAS_HABILIDADE = [5, 15, 30, 50, 80] as const;
export const HABILIDADES: readonly Habilidade[] = [
  {
    id: 'construtor',
    desenho: 'construtor',
    cor: '#f28b2c',
    nome: 'Construtor',
    mundos: ['cidade-grande', 'rancho-alegre', 'doce-reino'],
    conta: 'blocos na obra, construções, trocas com o construtor',
  },
  {
    id: 'explorador',
    desenho: 'explorador',
    cor: '#3f9ad8',
    nome: 'Explorador',
    mundos: ['cidade-grande', 'rancho-alegre', 'era-dos-dinos'],
    conta: 'lugares novos, fósseis escavados',
  },
  {
    id: 'bichos',
    desenho: 'bichos',
    cor: '#e05a7a',
    nome: 'Amigo dos bichos',
    mundos: ['rancho-alegre', 'era-dos-dinos', 'doce-reino'],
    conta:
      'bicho alimentado ou criado, ovos (o mesmo bicho não conta de novo em menos de 1 minuto)',
  },
  {
    id: 'fazendeiro',
    desenho: 'fazendeiro',
    cor: '#5cbf4f',
    nome: 'Fazendeiro',
    mundos: ['rancho-alegre'],
    conta: 'plantar e colher maduro',
  },
  {
    id: 'cozinheiro',
    desenho: 'cozinheiro',
    cor: '#c9772a',
    nome: 'Cozinheiro',
    mundos: ['cidade-grande', 'rancho-alegre'],
    conta: 'pão, pipoca, pão da padeira',
  },
];
export function estrelasDe(pontos: number): { estrelas: number; fracao: number } {
  let n = 0;
  while (n < 5 && pontos >= ESTRELAS_HABILIDADE[n]) n++;
  if (n >= 5) return { estrelas: 5, fracao: 1 };
  const de = n === 0 ? 0 : ESTRELAS_HABILIDADE[n - 1];
  return { estrelas: n, fracao: (pontos - de) / (ESTRELAS_HABILIDADE[n] - de) };
}

// ------------------------------------------------------------------ nível da criança
/** XP total para chegar aos níveis 1 a 10 (depois do 10: +200 por nível). */
export const XP_DO_NIVEL = [0, 40, 100, 180, 280, 400, 540, 700, 880, 1080] as const;
export const XP_POR_NIVEL_DEPOIS_DO_10 = 200;
/** XP total para chegar ao nível `n` (n >= 1). */
export function xpParaNivel(n: number): number {
  if (n <= 1) return 0;
  if (n <= XP_DO_NIVEL.length) return XP_DO_NIVEL[n - 1];
  return XP_DO_NIVEL[XP_DO_NIVEL.length - 1] + (n - XP_DO_NIVEL.length) * XP_POR_NIVEL_DEPOIS_DO_10;
}
export function nivelDoXp(xp: number): { nivel: number; fracao: number; falta: number } {
  let n = 1;
  while (xp >= xpParaNivel(n + 1)) n++;
  const de = xpParaNivel(n);
  const ate = xpParaNivel(n + 1);
  return { nivel: n, fracao: (xp - de) / (ate - de), falta: Math.max(0, ate - xp) };
}

export interface PresenteNivel {
  nivel: number;
  desenho: string;
  nome: string;
  moedas: number;
}
/** O presentinho de cada nível: pequeno, visível, nunca premium; todos à vista antes. */
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

// ------------------------------------------------------------------ banca do mundo
/** Item da banca: só do tema do mundo, preço fixo, entregue de verdade pelo núcleo. */
export interface ItemBanca {
  id: string;
  mundo: MundoAlma;
  nome: string;
  preco: number;
  /** O item do jogo que vai para a mochila (a galinha não: vem criada no galinheiro). */
  item: string | null;
  qtd: number;
  desenho: string;
}
export const BANCA: readonly ItemBanca[] = [
  {
    id: 'flores',
    mundo: 'cidade-grande',
    nome: 'Flores para a praça',
    preco: 3,
    item: 'bloco:9',
    qtd: 6,
    desenho: 'item:bloco:9',
  },
  {
    id: 'toldo-verde',
    mundo: 'cidade-grande',
    nome: 'Toldo verde',
    preco: 4,
    item: 'bloco:100',
    qtd: 8,
    desenho: 'item:bloco:100',
  },
  {
    id: 'toldo-vermelho',
    mundo: 'cidade-grande',
    nome: 'Toldo vermelho',
    preco: 4,
    item: 'bloco:99',
    qtd: 8,
    desenho: 'item:bloco:99',
  },
  {
    id: 'poste',
    mundo: 'cidade-grande',
    nome: 'Poste de luz',
    preco: 5,
    item: 'bloco:97',
    qtd: 4,
    desenho: 'item:bloco:97',
  },
  {
    id: 'janela-acesa',
    mundo: 'cidade-grande',
    nome: 'Janela acesa',
    preco: 5,
    item: 'bloco:94',
    qtd: 6,
    desenho: 'item:bloco:94',
  },
  {
    id: 'feno',
    mundo: 'rancho-alegre',
    nome: 'Fardos de feno',
    preco: 3,
    item: 'bloco:81',
    qtd: 4,
    desenho: 'item:bloco:81',
  },
  {
    id: 'sementes-abobora',
    mundo: 'rancho-alegre',
    nome: 'Sementes de abóbora',
    preco: 3,
    item: 'semente_abobora',
    qtd: 6,
    desenho: 'item:semente_abobora',
  },
  {
    id: 'lampiao',
    mundo: 'rancho-alegre',
    nome: 'Lampião de abóbora',
    preco: 4,
    item: 'bloco:66',
    qtd: 2,
    desenho: 'item:bloco:66',
  },
  {
    id: 'porteira',
    mundo: 'rancho-alegre',
    nome: 'Porteira',
    preco: 4,
    item: 'bloco:82',
    qtd: 2,
    desenho: 'item:bloco:82',
  },
  {
    id: 'cerca',
    mundo: 'rancho-alegre',
    nome: 'Cerca do curral',
    preco: 4,
    item: 'bloco:61',
    qtd: 12,
    desenho: 'item:bloco:61',
  },
  {
    id: 'galinha',
    mundo: 'rancho-alegre',
    nome: 'Galinha para o galinheiro',
    preco: 6,
    item: null,
    qtd: 1,
    desenho: 'galinha',
  },
  // spec 031: só blocos do tema, preço fixo (nada de fondant de várias cores junto)
  {
    id: 'magnolias',
    mundo: 'era-dos-dinos',
    nome: 'Magnólias',
    preco: 3,
    item: 'bloco:9',
    qtd: 6,
    desenho: 'item:bloco:9',
  },
  {
    id: 'tochas-resina',
    mundo: 'era-dos-dinos',
    nome: 'Tochas de resina',
    preco: 3,
    item: 'bloco:37',
    qtd: 6,
    desenho: 'item:bloco:37',
  },
  {
    id: 'ginkgo',
    mundo: 'era-dos-dinos',
    nome: 'Leque de ginkgo',
    preco: 4,
    item: 'bloco:55',
    qtd: 8,
    desenho: 'item:bloco:55',
  },
  {
    id: 'ninho-folhas',
    mundo: 'era-dos-dinos',
    nome: 'Ninho de folhas',
    preco: 4,
    item: 'bloco:56',
    qtd: 1,
    desenho: 'item:bloco:56',
  },
  {
    id: 'ambar',
    mundo: 'era-dos-dinos',
    nome: 'Âmbar que brilha',
    preco: 5,
    item: 'bloco:39',
    qtd: 4,
    desenho: 'item:bloco:39',
  },
  {
    id: 'flor-confeito',
    mundo: 'doce-reino',
    nome: 'Flor de confeito',
    preco: 3,
    item: 'bloco:9',
    qtd: 6,
    desenho: 'item:bloco:9',
  },
  {
    id: 'velas',
    mundo: 'doce-reino',
    nome: 'Velas de aniversário',
    preco: 3,
    item: 'bloco:37',
    qtd: 4,
    desenho: 'item:bloco:37',
  },
  {
    id: 'bolo-chantilly',
    mundo: 'doce-reino',
    nome: 'Bolo com chantilly',
    preco: 4,
    item: 'bloco:20',
    qtd: 8,
    desenho: 'item:bloco:20',
  },
  {
    id: 'balinhas',
    mundo: 'doce-reino',
    nome: 'Arbusto de balinhas',
    preco: 4,
    item: 'bloco:54',
    qtd: 4,
    desenho: 'item:bloco:54',
  },
  {
    id: 'geleia',
    mundo: 'doce-reino',
    nome: 'Pote de geleia que brilha',
    preco: 5,
    item: 'bloco:38',
    qtd: 4,
    desenho: 'item:bloco:38',
  },
];
export function bancaDoMundo(mundo: MundoAlma): ItemBanca[] {
  return BANCA.filter((i) => i.mundo === mundo);
}
/** O item da banca, só se for do tema deste mundo. */
export function itemDaBanca(mundo: MundoAlma | null, id: string): ItemBanca | undefined {
  return mundo ? BANCA.find((i) => i.id === id && i.mundo === mundo) : undefined;
}
/** Segundos entre duas compras na banca, por jogador. */
export const ESPERA_BANCA = 2;
/** Compras na banca por jogador numa sessão da sala (o núcleo aberto). */
export const COMPRAS_POR_SESSAO = 30;
/** Pilhas no baú da banca (o que não coube na mochila espera aqui). */
export const MAX_BAU_BANCA = 12;

export type RecusaBanca = 'tema' | 'saldo' | 'espera' | 'limite' | 'cheio' | 'galinha';

/** A conta da banca: o que o núcleo confere antes de entregar (fora a mochila e a galinha). */
export function conferirBanca(
  mundo: MundoAlma | null,
  id: string,
  saldo: number,
  compras: number,
  segundosDesdeUltima: number,
): { ok: true; item: ItemBanca } | { ok: false; motivo: RecusaBanca } {
  const item = itemDaBanca(mundo, id);
  if (!item) return { ok: false, motivo: 'tema' };
  if (!(saldo >= item.preco)) return { ok: false, motivo: 'saldo' };
  if (segundosDesdeUltima < ESPERA_BANCA - 1e-9) return { ok: false, motivo: 'espera' };
  if (compras >= COMPRAS_POR_SESSAO) return { ok: false, motivo: 'limite' };
  return { ok: true, item };
}

// ------------------------------------------------------------------ lojinha premium
export type CategoriaPremium = 'roupa' | 'costas' | 'fantasia' | 'bicho';
export const CATEGORIAS_PREMIUM: readonly CategoriaPremium[] = [
  'roupa',
  'costas',
  'fantasia',
  'bicho',
];
export interface ItemPremium {
  id: string;
  categoria: CategoriaPremium;
  nome: string;
  preco: number;
  efeito: string;
  desenho: string;
}
/**
 * Catálogo de lançamento (decisão do dono: só o que está pronto). Preço fixo, sempre à venda,
 * nada some. Nenhuma missão, nível ou habilidade dá estes itens.
 */
export const PREMIUM: readonly ItemPremium[] = [
  {
    id: 'camiseta-aquario',
    categoria: 'roupa',
    nome: 'Camiseta aquário',
    preco: 15,
    efeito: 'peixinhos nadando em volta do corpo e bolhas subindo; brilho de pérola nas bordas',
    desenho: 'premium:camiseta-aquario',
  },
  {
    id: 'tenis-cometa',
    categoria: 'roupa',
    nome: 'Tênis-cometa',
    preco: 20,
    efeito: 'faixa de luz de ouro e azul; pegadas de luz e estrelinhas a cada passo',
    desenho: 'premium:tenis-cometa',
  },
  {
    id: 'capa-estrelas',
    categoria: 'costas',
    nome: 'Capa de estrelas',
    preco: 30,
    efeito: 'balança com o andar e o vento; estrelas que piscam',
    desenho: 'premium:capa-estrelas',
  },
  {
    id: 'dragao',
    categoria: 'fantasia',
    nome: 'Dragãozinho',
    preco: 55,
    efeito: 'capuz de dragão e asas que batem',
    desenho: 'premium:dragao',
  },
  {
    id: 'pinguim',
    categoria: 'bicho',
    nome: 'Pinguinzinho',
    preco: 60,
    efeito: 'segue gingando e escorrega de barriga',
    desenho: 'premium:pinguim',
  },
  {
    id: 'unicornio',
    categoria: 'bicho',
    nome: 'Unicórnio-pônei',
    preco: 80,
    efeito: 'trota atrás, pula junto, chifre que brilha e coraçõezinhos',
    desenho: 'premium:unicornio',
  },
];
export const premiumPorId = (id: string): ItemPremium | undefined =>
  PREMIUM.find((p) => p.id === id);

/**
 * Premium que trocaram de nome depois de o site já estar no ar (o id antigo pode estar guardado
 * no aparelho da criança ou chegar de um amigo com o jogo de antes). Quem lê id de fora passa
 * por `idPremiumAtual`: a criança continua com o que comprou e vestiu.
 *
 * - `camiseta-arco-iris` → `camiseta-aquario` (decisão do dono: nada de arco-íris nos premium;
 *   o mesmo lugar no catálogo e o mesmo preço).
 */
export const PREMIUM_RENOMEADOS: Readonly<Record<string, string>> = {
  'camiseta-arco-iris': 'camiseta-aquario',
};
export const idPremiumAtual = (id: string): string =>
  Object.hasOwn(PREMIUM_RENOMEADOS, id) ? PREMIUM_RENOMEADOS[id] : id;

/**
 * Categorias que dividem o mesmo lugar no boneco: as asas do dragãozinho (fantasia) ficam nas
 * costas, onde vai a capa. Vestir uma tira a outra (às claras, na lojinha), nunca as duas
 * vestidas com uma escondida.
 */
export const LUGAR_DIVIDIDO: Readonly<Partial<Record<CategoriaPremium, CategoriaPremium>>> = {
  fantasia: 'costas',
  costas: 'fantasia',
};

/** O que sai do boneco ao vestir `id`: o da mesma categoria e o que divide o lugar com ele. */
export function saiAoVestir(
  vestidos: Readonly<Partial<Record<CategoriaPremium, string>>>,
  id: string,
): string[] {
  const p = premiumPorId(id);
  if (!p) return [];
  const out: string[] = [];
  for (const cat of [p.categoria, LUGAR_DIVIDIDO[p.categoria]])
    if (cat && vestidos[cat] && vestidos[cat] !== id) out.push(vestidos[cat]!);
  return out;
}

// ------------------------------------------------------------------ ritmo
/** O que uma sessão de 15 minutos costuma render (a conta de equilíbrio da spec). */
export const SESSAO = { minutos: 15, missoes: 3, moedasPorMissao: 3.6 } as const;

// ------------------------------------------------------------------ util
const r2 = (v: number) => Math.round(v * 100) / 100;
const objeto = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const numero = (v: unknown, max = 1e7) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0;
};

export interface Ganho {
  moedas: number;
  xp: number;
  pontos: Partial<Record<IdHabilidade, number>>;
}
export const ganhoVazio = (): Ganho => ({ moedas: 0, xp: 0, pontos: {} });
export function somarGanho(a: Ganho, b: Ganho): Ganho {
  a.moedas += b.moedas;
  a.xp = r2(a.xp + b.xp);
  for (const [k, v] of Object.entries(b.pontos) as [IdHabilidade, number][])
    a.pontos[k] = r2((a.pontos[k] ?? 0) + v);
  return a;
}
export const ganhoTemAlgo = (g: Ganho) =>
  g.moedas > 0 || g.xp > 0 || Object.values(g.pontos).some((v) => (v ?? 0) > 0);

// ------------------------------------------------------------------ estado do mundo (núcleo)
/** Livro-razão do jogador neste mundo (para a migração da 024 e para auditoria). */
export interface LivroAlma {
  /** Ganho aqui (moedinhas das missões; o presente de nível o aparelho soma do XP). */
  moedas: number;
  xp: number;
  pontos: Partial<Record<IdHabilidade, number>>;
  /** Moedinhas gastas na banca deste mundo e quantas compras de cada item. */
  gasto: number;
  compras: Record<string, number>;
}
export interface PilhaBau {
  item: string;
  qtd: number;
}
/** O que é de cada jogador neste mundo (`extras.alma[id]`). */
export interface AlmaMundo {
  feitas: string[];
  /** Obras feitas por outros antes desta criança ajudar: passam, sem prêmio. */
  puladas: string[];
  fixada: string | null;
  progresso: Record<string, number>;
  /** Missões de bis feitas (a próxima é a seguinte da roda). */
  bis: number;
  /** Lugares já vistos (usos dos lotes: 'padaria', 'sitio:curral'...). */
  lugares: string[];
  /** O que não coube na mochila numa compra da banca (entra sozinho quando couber). */
  bau: PilhaBau[];
  livro: LivroAlma;
}
export const livroVazio = (): LivroAlma => ({
  moedas: 0,
  xp: 0,
  pontos: {},
  gasto: 0,
  compras: {},
});
export function almaMundoVazia(): AlmaMundo {
  return {
    feitas: [],
    puladas: [],
    fixada: null,
    progresso: {},
    bis: 0,
    lugares: [],
    bau: [],
    livro: livroVazio(),
  };
}

const MAX_LUGARES = 64;
/** Passa a limpo o estado de um jogador num mundo (salvo, ou vindo de outro aparelho). */
export function normalizarAlmaMundo(v: unknown, mundo: MundoAlma | null): AlmaMundo {
  const e = almaMundoVazia();
  if (!objeto(v)) return e;
  const ids = new Set(missoesDoMundo(mundo).map((m) => m.id));
  const lista = (x: unknown) =>
    Array.isArray(x)
      ? [...new Set(x.filter((id): id is string => typeof id === 'string' && ids.has(id)))]
      : [];
  e.feitas = lista(v.feitas);
  e.puladas = lista(v.puladas).filter((id) => !e.feitas.includes(id));
  e.fixada = typeof v.fixada === 'string' && ids.has(v.fixada) ? v.fixada : null;
  if (objeto(v.progresso))
    for (const [k, n] of Object.entries(v.progresso)) {
      const m = missaoPorId(k);
      if (m && ids.has(k)) e.progresso[k] = Math.min(metaDa(m), numero(n));
    }
  e.bis = Math.floor(numero(v.bis, 1e6));
  e.lugares = Array.isArray(v.lugares)
    ? [
        ...new Set(v.lugares.filter((l): l is string => typeof l === 'string' && l.length <= 32)),
      ].slice(0, MAX_LUGARES)
    : [];
  if (Array.isArray(v.bau))
    for (const p of v.bau.slice(0, MAX_BAU_BANCA))
      if (
        objeto(p) &&
        typeof p.item === 'string' &&
        p.item.length <= 64 &&
        BANCA.some((b) => b.item === p.item)
      ) {
        const qtd = Math.floor(numero(p.qtd, 64));
        if (qtd > 0) e.bau.push({ item: p.item, qtd });
      }
  if (objeto(v.livro)) {
    const l = v.livro;
    e.livro.moedas = Math.floor(numero(l.moedas));
    e.livro.xp = r2(numero(l.xp));
    e.livro.gasto = Math.floor(numero(l.gasto));
    if (objeto(l.pontos))
      for (const h of IDS_HABILIDADE)
        if (l.pontos[h] !== undefined) e.livro.pontos[h] = r2(numero(l.pontos[h]));
    if (objeto(l.compras))
      for (const b of BANCA)
        if (l.compras[b.id] !== undefined)
          e.livro.compras[b.id] = Math.floor(numero(l.compras[b.id]));
  }
  return e;
}

/** Ids que o saneamento aceita em `extras.alma` (os mesmos do servidor). */
const ID_JOGADOR = /^[A-Za-z0-9_-]{1,64}$/;
export const MAX_JOGADORES_ALMA = 256;
/** `extras.alma` inteiro passado a limpo: { [jogadorId]: AlmaMundo }. */
export function normalizarAlmaDoMundo(
  v: unknown,
  mundo: MundoAlma | null,
): Record<string, AlmaMundo> {
  const out: Record<string, AlmaMundo> = {};
  if (!objeto(v)) return out;
  let n = 0;
  for (const [id, e] of Object.entries(v)) {
    if (n >= MAX_JOGADORES_ALMA) break;
    if (!ID_JOGADOR.test(id)) continue;
    out[id] = normalizarAlmaMundo(e, mundo);
    n++;
  }
  return out;
}

const resolvida = (e: AlmaMundo, id: string) => e.feitas.includes(id) || e.puladas.includes(id);
/** A lista toda já foi (feitas ou puladas): agora é bis. */
export const listaAcabou = (e: AlmaMundo, mundo: MundoAlma | null) =>
  missoesDoMundo(mundo).every((m) => resolvida(e, m.id));

/** A missão de bis da vez (as de ação, em roda), ou null se a lista não acabou. */
export function missaoDeBis(e: AlmaMundo, mundo: MundoAlma | null): Missao | null {
  if (!listaAcabou(e, mundo)) return null;
  const roda = missoesDeBis(mundo);
  return roda.length ? roda[e.bis % roda.length] : null;
}

/**
 * As missões abertas: as primeiras não resolvidas (MISSOES_ABERTAS) e as "devagar" já
 * começadas; acabada a lista, a de bis da vez.
 */
export function abertas(e: AlmaMundo, mundo: MundoAlma | null): Missao[] {
  const bis = missaoDeBis(e, mundo);
  if (bis) return [bis];
  const faltam = missoesDoMundo(mundo).filter((m) => !resolvida(e, m.id));
  const primeiras = faltam.slice(0, MISSOES_ABERTAS);
  const devagar = faltam.filter(
    (m) => m.devagar && !primeiras.includes(m) && (e.progresso[m.id] ?? 0) > 0,
  );
  return [...primeiras, ...devagar];
}
/** As que contam agora: as abertas e as "devagar" ainda não feitas (correm por baixo). */
function contando(e: AlmaMundo, mundo: MundoAlma | null): Missao[] {
  const lista = abertas(e, mundo);
  if (!listaAcabou(e, mundo))
    for (const m of missoesDoMundo(mundo))
      if (m.devagar && !resolvida(e, m.id) && !lista.includes(m)) lista.push(m);
  return lista;
}

export function missaoDoHud(e: AlmaMundo, mundo: MundoAlma): Missao | null {
  const lista = abertas(e, mundo);
  return lista.find((m) => m.id === e.fixada) ?? lista[0] ?? null;
}

/** Fixa a missão do HUD (só uma aberta; null volta à primeira). Devolve se mudou. */
export function fixar(e: AlmaMundo, mundo: MundoAlma, id: string | null): boolean {
  const novo = id !== null && abertas(e, mundo).some((m) => m.id === id) ? id : null;
  if (id !== null && novo === null) return false;
  if (e.fixada === novo) return false;
  e.fixada = novo;
  return true;
}

// ------------------------------------------------------------------ o que o núcleo decide
/** Uma missão que andou ou terminou (vai no evento `alma`). */
export interface MissaoMovida {
  id: string;
  /** Quanto já foi feito e quanto pede (a obra: células cheias e o total). */
  feito: number;
  meta: number;
  /**
   * O passeio (missão de lugares): quais lugares dela já foram vistos, para cada bolinha
   * acender no seu lugar (a sorveteria primeiro acende a da sorveteria, não a primeira).
   */
  usos?: string[];
  concluiu?: true;
  bis?: true;
  /** Passou sem prêmio (a obra que os outros fizeram antes). */
  pulou?: true;
  fantasia?: string;
}
export interface ResultadoAlma {
  ganho: Ganho;
  missoes: MissaoMovida[];
  /** As abertas mudaram (o quadro e o cartão do HUD mudam). */
  mudouLista: boolean;
}
const resultadoVazio = (): ResultadoAlma => ({
  ganho: ganhoVazio(),
  missoes: [],
  mudouLista: false,
});

function anotar(e: AlmaMundo, g: Ganho): void {
  e.livro.moedas += g.moedas;
  e.livro.xp = r2(e.livro.xp + g.xp);
  for (const [k, v] of Object.entries(g.pontos) as [IdHabilidade, number][])
    e.livro.pontos[k] = r2((e.livro.pontos[k] ?? 0) + v);
}

function concluir(
  e: AlmaMundo,
  mundo: MundoAlma | null,
  m: Missao,
  r: ResultadoAlma,
  feito: number,
): void {
  const g = ganhoVazio();
  if (listaAcabou(e, mundo)) {
    // bis: 2 moedinhas e metade do XP, sem fantasia (os pontos da habilidade também)
    e.bis++;
    delete e.progresso[m.id];
    g.moedas = MOEDAS_BIS;
    g.xp = XP_MISSAO / 2;
    g.pontos[m.habilidade] = PONTOS_POR_MISSAO;
    r.missoes.push({ id: m.id, feito, meta: feito, concluiu: true, bis: true });
  } else {
    e.feitas.push(m.id);
    delete e.progresso[m.id];
    if (e.fixada === m.id) e.fixada = null;
    g.moedas = m.moedas;
    g.xp = XP_MISSAO;
    g.pontos[m.habilidade] = PONTOS_POR_MISSAO;
    r.missoes.push({
      id: m.id,
      feito,
      meta: feito,
      concluiu: true,
      ...(m.fantasia ? { fantasia: m.fantasia } : {}),
    });
  }
  anotar(e, g);
  somarGanho(r.ganho, g);
  r.mudouLista = true;
}

/**
 * Um evento do jogo deste jogador: conta nas missões (abertas e devagar), no XP e nas
 * habilidades. Muda `e`; devolve o ganho e as missões que andaram. Num mundo sem missões
 * (`mundo` null) só dá o XP e os pontos da ação. `chaveGanho`: o ganho de outra chave (a
 * receita de comida conta a missão pela receita e ganha como 'cozinhou').
 */
export function registrarEvento(
  e: AlmaMundo,
  mundo: MundoAlma | null,
  chave: string,
  qtd = 1,
  chaveGanho = chave,
): ResultadoAlma {
  const r = resultadoVazio();
  if (!(qtd > 0)) return r;
  for (const m of contando(e, mundo)) {
    if (m.conta.tipo !== 'evento' || m.conta.chave !== chave) continue;
    const antes = abertas(e, mundo)
      .map((x) => x.id)
      .join();
    const feito = Math.min(m.conta.meta, (e.progresso[m.id] ?? 0) + qtd);
    e.progresso[m.id] = feito;
    if (feito >= m.conta.meta) concluir(e, mundo, m, r, m.conta.meta);
    else {
      r.missoes.push({ id: m.id, feito, meta: m.conta.meta });
      // a devagar começou: entra nas abertas
      if (
        abertas(e, mundo)
          .map((x) => x.id)
          .join() !== antes
      )
        r.mudouLista = true;
    }
  }
  const g = ganhoDaChave(chaveGanho);
  if (g && g.xp > 0) {
    const solto: Ganho = {
      moedas: 0,
      xp: r2(g.xp * qtd),
      pontos: g.hab ? { [g.hab[0]]: r2(g.hab[1] * qtd) } : {},
    };
    anotar(e, solto);
    somarGanho(r.ganho, solto);
  }
  return r;
}

/** Os lugares do passeio `m` que este jogador já viu (na ordem da missão); nada se não é passeio. */
export function lugaresVistos(e: Pick<AlmaMundo, 'lugares'>, m: Missao): string[] | undefined {
  if (m.conta.tipo !== 'lugares') return undefined;
  return m.conta.usos.filter((u) => e.lugares.includes(u));
}

/** Um lugar novo (uso do lote): XP do explorador e o passeio da cidade. */
export function visitarLugar(e: AlmaMundo, mundo: MundoAlma | null, uso: string): ResultadoAlma {
  if (e.lugares.includes(uso) || e.lugares.length >= MAX_LUGARES) return resultadoVazio();
  e.lugares.push(uso);
  const r = registrarEvento(e, mundo, 'visitou:lugar');
  for (const m of contando(e, mundo)) {
    if (m.conta.tipo !== 'lugares' || !m.conta.usos.includes(uso)) continue;
    const usos = lugaresVistos(e, m);
    const feito = usos?.length ?? 0;
    e.progresso[m.id] = feito;
    if (feito >= m.conta.usos.length) concluir(e, mundo, m, r, feito);
    else r.missoes.push({ id: m.id, feito, meta: m.conta.usos.length, usos });
  }
  return r;
}

/** Progresso da obra `canteiro` (células cheias de `total`) para quem tem a missão aberta. */
export function progressoObra(
  e: AlmaMundo,
  mundo: MundoAlma,
  canteiro: number,
  cheias: number,
  total: number,
): MissaoMovida | null {
  const m = abertas(e, mundo).find((x) => x.conta.tipo === 'obra' && x.conta.canteiro === canteiro);
  return m ? { id: m.id, feito: cheias, meta: total } : null;
}

/**
 * Confere as missões de obra abertas com as obras feitas do mundo: a que já está feita
 * conclui (com prêmio) para quem ajudou e passa sem prêmio para quem não ajudou. Repete até
 * parar (concluir abre a próxima, que pode já estar feita). Rodar ao entrar e a cada obra feita.
 */
export function conferirObrasFeitas(
  e: AlmaMundo,
  mundo: MundoAlma,
  feita: (canteiro: number) => boolean,
  ajudou: (canteiro: number) => boolean,
  total: (canteiro: number) => number,
): ResultadoAlma {
  const r = resultadoVazio();
  for (let volta = 0; volta < 16; volta++) {
    const m = abertas(e, mundo).find((x) => x.conta.tipo === 'obra' && feita(x.conta.canteiro));
    if (!m || m.conta.tipo !== 'obra') break;
    const t = total(m.conta.canteiro);
    if (ajudou(m.conta.canteiro)) concluir(e, mundo, m, r, t);
    else {
      e.puladas.push(m.id);
      delete e.progresso[m.id];
      if (e.fixada === m.id) e.fixada = null;
      r.missoes.push({ id: m.id, feito: t, meta: t, pulou: true });
      r.mudouLista = true;
    }
  }
  return r;
}

/** Junta dois resultados (o segundo no primeiro). */
export function juntarResultado(a: ResultadoAlma, b: ResultadoAlma): ResultadoAlma {
  somarGanho(a.ganho, b.ganho);
  for (const m of b.missoes) {
    const i = a.missoes.findIndex((x) => x.id === m.id && !x.concluiu);
    if (i >= 0) a.missoes[i] = m;
    else a.missoes.push(m);
  }
  a.mudouLista ||= b.mudouLista;
  return a;
}

/** O quadro de missões deste jogador neste mundo, como o cliente desenha (vai no evento). */
export interface VistaAlmaMundo {
  mundo: MundoAlma;
  feitas: string[];
  puladas: string[];
  /** `usos`: no passeio, os lugares já vistos (cada bolinha no seu lugar). */
  abertas: { id: string; feito: number; meta: number; usos?: string[]; bis?: true }[];
  fixada: string | null;
  bis: number;
  /** O que espera no baú da banca. */
  bau: PilhaBau[];
}
export function vistaAlmaMundo(
  e: AlmaMundo,
  mundo: MundoAlma,
  obra: (canteiro: number) => { cheias: number; total: number } | null,
): VistaAlmaMundo {
  const bis = listaAcabou(e, mundo);
  return {
    mundo,
    feitas: [...e.feitas],
    puladas: [...e.puladas],
    abertas: abertas(e, mundo).map((m) => {
      if (m.conta.tipo === 'obra') {
        const o = obra(m.conta.canteiro);
        return { id: m.id, feito: o?.cheias ?? 0, meta: o?.total ?? 1 };
      }
      const usos = lugaresVistos(e, m);
      return {
        id: m.id,
        feito: e.progresso[m.id] ?? 0,
        meta: metaDa(m),
        ...(usos ? { usos } : {}),
        ...(bis ? { bis: true as const } : {}),
      };
    }),
    fixada: e.fixada,
    bis: e.bis,
    bau: e.bau.map((p) => ({ ...p })),
  };
}

// ------------------------------------------------------------------ o perfil da criança
/** Versão do formato do perfil (a 024 lê esta para migrar à conta da família). */
export const VERSAO_PERFIL_ALMA = 1;
export interface PerfilAlma {
  versao: number;
  moedas: number;
  xp: number;
  pontos: Partial<Record<IdHabilidade, number>>;
  /** Premium comprados (ids do catálogo) e o vestido de cada categoria. */
  premium: string[];
  vestidos: Partial<Record<CategoriaPremium, string>>;
  /** Fantasias ganhas nas missões. */
  fantasias: string[];
  /** Totais (auditoria e migração 024): tudo o que veio do núcleo e tudo o que foi gasto. */
  ganhou: number;
  gastou: number;
}
export function perfilAlmaVazio(): PerfilAlma {
  return {
    versao: VERSAO_PERFIL_ALMA,
    moedas: 0,
    xp: 0,
    pontos: {},
    premium: [],
    vestidos: {},
    fantasias: [],
    ganhou: 0,
    gastou: 0,
  };
}
export const MAX_MOEDAS = 99_999;
export const MAX_FANTASIAS_ALMA = 32;
/** Lê o perfil guardado (ou de outro aparelho), jogando fora o que não conhece. */
export function normalizarPerfilAlma(v: unknown): PerfilAlma {
  const c = perfilAlmaVazio();
  if (!objeto(v)) return c;
  c.moedas = Math.floor(numero(v.moedas, MAX_MOEDAS));
  c.xp = r2(numero(v.xp));
  if (objeto(v.pontos))
    for (const h of IDS_HABILIDADE)
      if (v.pontos[h] !== undefined) c.pontos[h] = r2(numero(v.pontos[h]));
  // os ids que trocaram de nome viram o de agora (o guardado de antes continua valendo)
  c.premium = Array.isArray(v.premium)
    ? [
        ...new Set(
          v.premium
            .filter((p): p is string => typeof p === 'string')
            .map(idPremiumAtual)
            .filter((p) => !!premiumPorId(p)),
        ),
      ]
    : [];
  if (objeto(v.vestidos))
    for (const [cat, bruto] of Object.entries(v.vestidos)) {
      if (typeof bruto !== 'string') continue;
      const id = idPremiumAtual(bruto);
      if (c.premium.includes(id) && premiumPorId(id)?.categoria === cat)
        c.vestidos[cat as CategoriaPremium] = id;
    }
  // guardado de antes da regra do lugar dividido: a fantasia (as asas) fica, a capa sai
  if (c.vestidos.fantasia) delete c.vestidos.costas;
  c.fantasias = Array.isArray(v.fantasias)
    ? [
        ...new Set(v.fantasias.filter((f): f is string => typeof f === 'string' && f.length <= 40)),
      ].slice(0, MAX_FANTASIAS_ALMA)
    : [];
  c.ganhou = Math.floor(numero(v.ganhou, 1e9));
  c.gastou = Math.floor(numero(v.gastou, 1e9));
  return c;
}

/** O que mudou no perfil ao aplicar um ganho (as festas do cliente saem daqui). */
export interface MudancaPerfil {
  /** Níveis novos, em ordem, com o presente de cada um. */
  niveis: { nivel: number; presente?: PresenteNivel }[];
  /** Estrelas novas das habilidades. */
  estrelas: { habilidade: IdHabilidade; estrelas: number }[];
  /** Moedinhas que entraram (as do núcleo e as dos presentes de nível). */
  moedas: number;
  fantasias: string[];
}

/**
 * Aplica no perfil o ganho que o núcleo mandou (e as fantasias das missões concluídas). Os
 * presentes de nível são consequência do XP que o núcleo deu (a mesma conta em todo
 * aparelho): o cliente nunca soma um ganho que não veio do núcleo. Muda `c`.
 */
export function aplicarGanho(
  c: PerfilAlma,
  g: Ganho,
  fantasias: readonly string[] = [],
): MudancaPerfil {
  const out: MudancaPerfil = { niveis: [], estrelas: [], moedas: 0, fantasias: [] };
  const moedas = Math.max(0, Math.floor(Number(g.moedas) || 0));
  const xp = Math.max(0, Number(g.xp) || 0);
  const antes = nivelDoXp(c.xp).nivel;
  c.xp = r2(c.xp + xp);
  const depois = nivelDoXp(c.xp).nivel;
  let entrou = moedas;
  for (let n = antes + 1; n <= depois; n++) {
    const presente = PRESENTES_NIVEL.find((p) => p.nivel === n);
    if (presente) entrou += presente.moedas;
    out.niveis.push(presente ? { nivel: n, presente } : { nivel: n });
  }
  c.moedas = Math.min(MAX_MOEDAS, c.moedas + entrou);
  c.ganhou += entrou;
  out.moedas = entrou;
  for (const h of IDS_HABILIDADE) {
    const p = Math.max(0, Number(g.pontos?.[h]) || 0);
    if (!p) continue;
    const e0 = estrelasDe(c.pontos[h] ?? 0).estrelas;
    c.pontos[h] = r2((c.pontos[h] ?? 0) + p);
    const e1 = estrelasDe(c.pontos[h]!).estrelas;
    for (let n = e0 + 1; n <= e1; n++) out.estrelas.push({ habilidade: h, estrelas: n });
  }
  for (const f of fantasias)
    if (
      typeof f === 'string' &&
      !c.fantasias.includes(f) &&
      c.fantasias.length < MAX_FANTASIAS_ALMA
    ) {
      c.fantasias.push(f);
      out.fantasias.push(f);
    }
  return out;
}

/** Desconta o preço que o núcleo confirmou (a banca); nunca fica negativo. */
export function descontar(c: PerfilAlma, preco: number): void {
  const p = Math.max(0, Math.floor(Number(preco) || 0));
  const tirado = Math.min(c.moedas, p);
  c.moedas -= tirado;
  c.gastou += tirado;
}

export type RecusaPremium = 'nao-existe' | 'ja-tem' | 'faltam-moedas';
/** Premium: preço fixo, um de cada, só com a carteira; comprou, já veste. Muda `c`. */
export function comprarPremium(
  c: PerfilAlma,
  bruto: string,
): { ok: true } | { ok: false; motivo: RecusaPremium } {
  const id = idPremiumAtual(bruto);
  const p = premiumPorId(id);
  if (!p) return { ok: false, motivo: 'nao-existe' };
  if (c.premium.includes(id)) return { ok: false, motivo: 'ja-tem' };
  if (c.moedas < p.preco) return { ok: false, motivo: 'faltam-moedas' };
  c.moedas -= p.preco;
  c.gastou += p.preco;
  c.premium.push(id);
  vestirPeca(c, p);
  return { ok: true };
}
function vestirPeca(c: PerfilAlma, p: ItemPremium): void {
  const outra = LUGAR_DIVIDIDO[p.categoria];
  if (outra) delete c.vestidos[outra];
  c.vestidos[p.categoria] = p.id;
}
/** Veste ou tira um premium já comprado (um por categoria). */
export function vestirPremium(c: PerfilAlma, bruto: string, vestir: boolean): boolean {
  const id = idPremiumAtual(bruto);
  const p = premiumPorId(id);
  if (!p || !c.premium.includes(id)) return false;
  if (vestir) vestirPeca(c, p);
  else if (c.vestidos[p.categoria] === id) delete c.vestidos[p.categoria];
  return true;
}
