export const Bloco = {
  AR: 0,
  TERRA_MUSGOSA: 1,
  PEDRA_RACHADA: 2,
  AREIA_BRUMA: 3,
  MADEIRA_RETORCIDA: 4,
  FOLHAGEM: 5,
  CRISTAL_LUZ: 6,
  TABUAS: 7,
  GRAMA_ALTA: 8,
  FLOR: 9,
  COGUMELO_BRILHANTE: 10,
  TERRA: 11,
  PEDREGULHO: 12,
  CASCALHO: 13,
  ROCHA_MATRIZ: 14,
  MINERIO_CARVAO: 15,
  MINERIO_COBRE: 16,
  MINERIO_FERRO: 17,
  MINERIO_OURO: 18,
  MINERIO_LUZITA: 19,
  TERRA_NEVADA: 20,
  NEVE: 21,
  GELO: 22,
  ARENITO: 23,
  AREIA_DESERTO: 24,
  CACTO: 25,
  ARBUSTO_SECO: 26,
  TRONCO_BETULA: 27,
  FOLHAS_BETULA: 28,
  TRONCO_PINHO: 29,
  FOLHAS_PINHO: 30,
  MUSGO_PANTANO: 31,
  LAMA: 32,
  JUNCO: 33,
  TRONCO_LANTERNA: 34,
  FOLHAS_LANTERNA: 35,
  VIDRO: 36,
  TOCHA: 37,
  LANTERNA: 38,
  BLOCO_LUZITA: 39,
  MESA_TRABALHO: 40,
  FORNALHA: 41,
  BAU: 42,
  TIJOLOS: 43,
  TIJOLOS_PEDRA: 44,
  PEDRA_LISA: 45,
  LA_BRANCA: 46,
  LA_VERMELHA: 47,
  LA_LARANJA: 48,
  LA_AMARELA: 49,
  LA_VERDE: 50,
  LA_AZUL: 51,
  LA_ROXA: 52,
  LA_PRETA: 53,
  ARBUSTO_FRUTINHAS: 54,
  FOLHAS_OUTONO: 55,
  CAMA: 56,
  PORTA: 57,
  PORTA_ABERTA: 58,
  ESCADA: 59,
  LAJE: 60,
  CERCA: 61,
  FORNALHA_ACESA: 62,
  TABUAS_BETULA: 63,
  TABUAS_PINHO: 64,
  ABOBORA: 65,
  LAMPIAO_ABOBORA: 66,
  AGUA: 67,
  // spec 013: plantio (todos os temas). Os estágios da lavoura vão de 0 (semente) a 3 (madura).
  TERRA_ARADA: 68,
  TRIGO_0: 69,
  TRIGO_1: 70,
  TRIGO_2: 71,
  TRIGO_3: 72,
  MILHO_0: 73,
  MILHO_1: 74,
  MILHO_2: 75,
  MILHO_3: 76,
  ABOBOREIRA_0: 77,
  ABOBOREIRA_1: 78,
  ABOBOREIRA_2: 79,
  ABOBOREIRA_3: 80,
  FENO: 81,
  // spec 013: porteira do curral (um bloco de altura; aberta troca o id e guarda a direção)
  PORTEIRA: 82,
  PORTEIRA_ABERTA: 83,
  // spec 014: a Cidade Grande (só existem no tema da cidade: `TemaDef.exclusivos`)
  ASFALTO: 84,
  FAIXA_RUA: 85,
  FAIXA_PEDESTRE: 86,
  CALCADA: 87,
  CONCRETO: 88,
  PEDRA_MARROM: 89,
  ESCADINHA_PEDRA: 90,
  PEDRA_CREME: 91,
  FRISO_DOURADO: 92,
  JANELA: 93,
  JANELA_ACESA: 94,
  GRADE_FERRO: 95,
  LAJE_GRADE: 96,
  POSTE: 97,
  PLACA: 98,
  TOLDO_VERMELHO: 99,
  TOLDO_VERDE: 100,
  TAPUME: 101,
  ESCADA_GRADE: 102,
  // spec 026: a Vila Neon (só existem no tema do bairro: `TemaDef.exclusivos`)
  PISO_PALCO: 103,
  CAIXA_SOM: 104,
  TRELICA: 105,
  PISTA_NEON: 106,
  LETREIRO_NEON: 107,
  PAREDE_POSTER: 108,
  REBOCO_ROSA: 109,
  REBOCO_AZUL: 110,
  REBOCO_AMARELO: 111,
  REBOCO_MENTA: 112,
  TELHA_COLONIAL: 113,
  GRADE_PLATEIA: 114,
  FAIXA_NEON: 115,
  ALAMBRADO: 116,
  // spec 027: a Noite das Fantasias (só existem no tema da festa: `Tema.exclusivos`). Os tiles
  // deles começam na célula 128 do atlas (`src/art/tiles.ts`): as 8 primeiras linhas não mudam
  TELHA_ROXA: 117,
  TIJOLO_TORTO: 118,
  TEIA_BARBANTE: 119,
  FOLHAS_LARANJA: 120,
  TABUA_MUSGO: 121,
  PEDRINHA_LILAS: 122,
  TABUA_ROXA: 123,
  JANELA_TORTA: 124,
  JANELA_TORTA_ACESA: 125,
  TOLDINHO: 126,
  CALDEIRAO: 127,
  // spec 039: os móveis da parte 1 (todos os mundos). Cada um ocupa as células da tabela de
  // `jogo/moveis.ts`: a âncora (a parte 0) e as outras partes, todas com o mesmo id, a direção
  // nos bits 0 e 1 do metadado e a parte nos bits 2 a 4. O tapete não fica em célula nenhuma:
  // ele mora na camada rente ao chão (`jogo/tapetes.ts`), e o id dele só serve ao item. O abajur
  // e o criado-mudo acesos são outro id (como a fornalha acesa): a luz é a mesma para todos
  SOFA: 128,
  CADEIRA: 129,
  CRIADO_MUDO: 130,
  ABAJUR: 131,
  TAPETE: 132,
  PIA: 133,
  GUARDA_ROUPA: 134,
  ABAJUR_ACESO: 135,
  CRIADO_MUDO_ACESO: 136,
  // spec 039b: os móveis da parte 2 (todos os mundos). O fogão e a geladeira são contêineres
  // do núcleo (pela âncora); o fogão cozinhando e a TV ligada não trocam o id (o estado vai no
  // quadro, em `moveisLigados`)
  FOGAO: 137,
  GELADEIRA: 138,
  MESA: 139,
  TV: 140,
  SOM: 141,
} as const;

/** Spec 027: o primeiro bloco da Noite das Fantasias (os tiles dele em diante vão na célula 128). */
export const PRIMEIRO_BLOCO_027 = Bloco.TELHA_ROXA;
/** Spec 039: o primeiro móvel (os ids de antes não mudam). */
export const PRIMEIRO_BLOCO_039 = Bloco.SOFA;

export type Ferramenta = 'picareta' | 'machado' | 'pa' | 'espada';
export type GrupoSom = 'terra' | 'pedra' | 'areia' | 'madeira' | 'folhagem' | 'cristal';
export type Forma =
  | 'cubo'
  | 'cruz'
  | 'laje'
  | 'escada'
  | 'cerca'
  | 'porta'
  | 'cama'
  | 'tocha'
  | 'porteira'
  /** Spec 014: placa de parede (uma tábua fina encostada atrás, o desenho na frente). */
  | 'placa'
  /**
   * Spec 039: móvel de várias células. A colisão de cada parte sai da tabela de
   * `jogo/moveis.ts`; a peça solta (sem a âncora certa) não tem colisão nem item.
   */
  | 'movel';

export interface TilesBloco {
  topo: string;
  lado: string;
  base: string;
  /** Face da frente (fornalha, baú, mesa), mostrada em +z. */
  frente?: string;
  /**
   * Spec 014: desenhos da frente escolhidos pelo metadado (bits 2 a 4): a placa da padaria,
   * da oficina, da loja de construção e da sorveteria. O 0 é a `frente` (o desenho de quem
   * coloca a placa à mão).
   */
  frentes?: readonly string[];
}

export interface DefinicaoBloco {
  id: number;
  nome: string;
  solido: boolean;
  opaco: boolean;
  emissivo: boolean;
  planta: boolean;
  /** Não vira item (ex.: ar). */
  semItem?: boolean;
  /** Forma da malha (cubo é o padrão). */
  forma?: Forma;
  /** Luz emitida, de 0 a 15. */
  luz?: number;
  /** Segundos para minerar à mão; ausente = inquebrável. */
  dureza?: number;
  /** Ferramenta que acelera (e às vezes é exigida). */
  ferramenta?: Ferramenta;
  /** Nível mínimo de ferramenta para soltar item (1 madeira ... 5 cristal). */
  nivelMinimo?: number;
  /** Folhas: mostram as faces internas e usam recorte. */
  folhas?: boolean;
  /** Bloco com pixels transparentes recortados (vidro, folhas). */
  recorte?: boolean;
  som?: GrupoSom;
  tiles: TilesBloco;
  /** Plantas que balançam ao vento. */
  balanca?: boolean;
  /** Líquido: não é alvo de mira, não colide, vai para a malha de água. */
  liquido?: boolean;
}

type Opcoes = Partial<Omit<DefinicaoBloco, 'id' | 'nome' | 'tiles'>> & {
  tiles?: Partial<TilesBloco> | string;
};

function tiles(t: Opcoes['tiles'], padrao: string): TilesBloco {
  if (typeof t === 'string') return { topo: t, lado: t, base: t };
  const lado = t?.lado ?? padrao;
  return {
    topo: t?.topo ?? lado,
    lado,
    base: t?.base ?? t?.topo ?? lado,
    frente: t?.frente,
    ...(t?.frentes ? { frentes: t.frentes } : {}),
  };
}

function def(id: number, nome: string, nomeTile: string, o: Opcoes = {}): DefinicaoBloco {
  const { tiles: t, ...resto } = o;
  return {
    id,
    nome,
    solido: true,
    opaco: true,
    emissivo: false,
    planta: false,
    dureza: 1,
    som: 'pedra',
    ...resto,
    tiles: tiles(t, nomeTile),
  };
}

function planta(id: number, nome: string, nomeTile: string, o: Opcoes = {}): DefinicaoBloco {
  return def(id, nome, nomeTile, {
    solido: false,
    opaco: false,
    planta: true,
    forma: 'cruz',
    dureza: 0,
    som: 'folhagem',
    balanca: true,
    ...o,
  });
}

const madeira = (o: Opcoes = {}): Opcoes => ({
  dureza: 1.1,
  ferramenta: 'machado',
  som: 'madeira',
  ...o,
});
const pedra = (o: Opcoes = {}): Opcoes => ({
  dureza: 1.6,
  ferramenta: 'picareta',
  nivelMinimo: 1,
  som: 'pedra',
  ...o,
});
const terra = (o: Opcoes = {}): Opcoes => ({ dureza: 0.5, ferramenta: 'pa', som: 'terra', ...o });
const folhas = (o: Opcoes = {}): Opcoes => ({
  opaco: false,
  folhas: true,
  recorte: true,
  dureza: 0.3,
  som: 'folhagem',
  ...o,
});
/** Spec 039: o que todo móvel tem (a forma de várias células e o vão que deixa ver em volta). */
const movel: Opcoes = { opaco: false, forma: 'movel' };
const la = (id: number, nome: string, t: string) =>
  def(id, `lã ${nome}`, t, { dureza: 0.6, som: 'folhagem' });

/**
 * Os 4 estágios de uma planta da lavoura (ids seguidos). Não viram item: a semente planta o
 * estágio 0 e a colheita solta o produto. Uma textura só por planta (a cor); a forma de cada
 * estágio sai da peça de brinquedo (`mesh/plantasBrinquedo.ts`).
 */
function lavoura(
  primeiro: number,
  nome: string,
  nomeTile: string,
  madura = `${nome} maduro`,
): DefinicaoBloco[] {
  return [0, 1, 2, 3].map((e) =>
    planta(primeiro + e, e === 3 ? madura : `${nome} (${e + 1} de 4)`, nomeTile, {
      semItem: true,
    }),
  );
}

export const REGISTRO_BLOCOS: readonly DefinicaoBloco[] = [
  def(Bloco.AR, 'ar', 'vazio', { solido: false, opaco: false, semItem: true, dureza: undefined }),
  def(
    Bloco.TERRA_MUSGOSA,
    'terra musgosa',
    'grama_lado',
    terra({ tiles: { topo: 'grama_topo', lado: 'grama_lado', base: 'terra' } }),
  ),
  def(Bloco.PEDRA_RACHADA, 'pedra rachada', 'pedra', pedra()),
  def(Bloco.AREIA_BRUMA, 'areia-bruma', 'areia', terra({ som: 'areia' })),
  def(
    Bloco.MADEIRA_RETORCIDA,
    'madeira retorcida',
    'tronco',
    madeira({ tiles: { topo: 'tronco_topo', lado: 'tronco' } }),
  ),
  def(Bloco.FOLHAGEM, 'folhagem', 'folhas', folhas()),
  def(Bloco.CRISTAL_LUZ, 'cristal-luz', 'cristal', {
    emissivo: true,
    luz: 12,
    dureza: 1.4,
    som: 'cristal',
  }),
  def(Bloco.TABUAS, 'tábuas', 'tabuas', madeira({ dureza: 0.9 })),
  planta(Bloco.GRAMA_ALTA, 'grama alta', 'grama_alta'),
  planta(Bloco.FLOR, 'flor', 'flor', { emissivo: true, luz: 1 }),
  planta(Bloco.COGUMELO_BRILHANTE, 'cogumelo brilhante', 'cogumelo', { emissivo: true, luz: 5 }),
  def(Bloco.TERRA, 'terra', 'terra', terra()),
  def(Bloco.PEDREGULHO, 'pedregulho', 'pedregulho', pedra({ dureza: 1.8 })),
  def(Bloco.CASCALHO, 'cascalho', 'cascalho', terra({ dureza: 0.6, som: 'areia' })),
  def(Bloco.ROCHA_MATRIZ, 'rocha-matriz', 'rocha_matriz', { dureza: undefined, semItem: true }),
  def(Bloco.MINERIO_CARVAO, 'minério de carvão', 'min_carvao', pedra({ dureza: 2.2 })),
  def(Bloco.MINERIO_COBRE, 'minério de cobre', 'min_cobre', pedra({ dureza: 2.4, nivelMinimo: 2 })),
  def(Bloco.MINERIO_FERRO, 'minério de ferro', 'min_ferro', pedra({ dureza: 2.6, nivelMinimo: 2 })),
  def(Bloco.MINERIO_OURO, 'minério de ouro', 'min_ouro', pedra({ dureza: 2.8, nivelMinimo: 4 })),
  def(
    Bloco.MINERIO_LUZITA,
    'minério de luzita',
    'min_luzita',
    pedra({ dureza: 3, nivelMinimo: 4, emissivo: true, luz: 6, som: 'cristal' }),
  ),
  def(
    Bloco.TERRA_NEVADA,
    'terra nevada',
    'neve_lado',
    terra({ tiles: { topo: 'neve', lado: 'neve_lado', base: 'terra' } }),
  ),
  def(Bloco.NEVE, 'neve', 'neve', terra({ dureza: 0.3, som: 'areia' })),
  def(Bloco.GELO, 'gelo', 'gelo', { dureza: 0.6, som: 'cristal' }),
  def(
    Bloco.ARENITO,
    'arenito',
    'arenito_lado',
    pedra({ dureza: 1.2, tiles: { topo: 'arenito_topo', lado: 'arenito_lado' } }),
  ),
  def(Bloco.AREIA_DESERTO, 'areia do deserto', 'areia_deserto', terra({ som: 'areia' })),
  def(Bloco.CACTO, 'cacto', 'cacto_lado', {
    dureza: 0.5,
    som: 'folhagem',
    tiles: { topo: 'cacto_topo', lado: 'cacto_lado' },
  }),
  planta(Bloco.ARBUSTO_SECO, 'arbusto seco', 'arbusto_seco'),
  def(
    Bloco.TRONCO_BETULA,
    'tronco de bétula',
    'betula',
    madeira({ tiles: { topo: 'betula_topo', lado: 'betula' } }),
  ),
  def(Bloco.FOLHAS_BETULA, 'folhas de bétula', 'folhas_betula', folhas()),
  def(
    Bloco.TRONCO_PINHO,
    'tronco de pinho',
    'pinho',
    madeira({ tiles: { topo: 'pinho_topo', lado: 'pinho' } }),
  ),
  def(Bloco.FOLHAS_PINHO, 'folhas de pinho', 'folhas_pinho', folhas()),
  def(
    Bloco.MUSGO_PANTANO,
    'musgo do pântano',
    'pantano_lado',
    terra({ tiles: { topo: 'pantano_topo', lado: 'pantano_lado', base: 'lama' } }),
  ),
  def(Bloco.LAMA, 'lama', 'lama', terra({ dureza: 0.5 })),
  planta(Bloco.JUNCO, 'junco', 'junco'),
  def(
    Bloco.TRONCO_LANTERNA,
    'tronco-lanterna',
    'tronco_lanterna',
    madeira({ tiles: { topo: 'tronco_lanterna_topo', lado: 'tronco_lanterna' } }),
  ),
  def(
    Bloco.FOLHAS_LANTERNA,
    'folhas-lanterna',
    'folhas_lanterna',
    folhas({ emissivo: true, luz: 9 }),
  ),
  def(Bloco.VIDRO, 'vidro', 'vidro', { opaco: false, recorte: true, dureza: 0.4, som: 'cristal' }),
  def(Bloco.TOCHA, 'tocha', 'tocha', {
    solido: false,
    opaco: false,
    forma: 'tocha',
    emissivo: true,
    luz: 14,
    dureza: 0,
    som: 'madeira',
  }),
  def(Bloco.LANTERNA, 'lanterna', 'lanterna', {
    opaco: false,
    recorte: true,
    emissivo: true,
    luz: 15,
    dureza: 0.6,
    som: 'pedra',
  }),
  def(Bloco.BLOCO_LUZITA, 'bloco de luzita', 'bloco_luzita', {
    emissivo: true,
    luz: 13,
    dureza: 1.4,
    som: 'cristal',
  }),
  def(
    Bloco.MESA_TRABALHO,
    'mesa de trabalho',
    'mesa_lado',
    madeira({
      tiles: { topo: 'mesa_topo', lado: 'mesa_lado', base: 'tabuas', frente: 'mesa_frente' },
    }),
  ),
  def(
    Bloco.FORNALHA,
    'fornalha',
    'fornalha_lado',
    pedra({
      dureza: 1.8,
      tiles: { topo: 'fornalha_topo', lado: 'fornalha_lado', frente: 'fornalha_frente' },
    }),
  ),
  def(
    Bloco.BAU,
    'baú',
    'bau_lado',
    madeira({ dureza: 1, tiles: { topo: 'bau_topo', lado: 'bau_lado', frente: 'bau_frente' } }),
  ),
  def(Bloco.TIJOLOS, 'tijolos', 'tijolos', pedra({ dureza: 1.8 })),
  def(Bloco.TIJOLOS_PEDRA, 'tijolos de pedra', 'tijolos_pedra', pedra({ dureza: 1.6 })),
  def(Bloco.PEDRA_LISA, 'pedra lisa', 'pedra_lisa', pedra({ dureza: 1.6 })),
  la(Bloco.LA_BRANCA, 'branca', 'la_branca'),
  la(Bloco.LA_VERMELHA, 'vermelha', 'la_vermelha'),
  la(Bloco.LA_LARANJA, 'laranja', 'la_laranja'),
  la(Bloco.LA_AMARELA, 'amarela', 'la_amarela'),
  la(Bloco.LA_VERDE, 'verde', 'la_verde'),
  la(Bloco.LA_AZUL, 'azul', 'la_azul'),
  la(Bloco.LA_ROXA, 'roxa', 'la_roxa'),
  la(Bloco.LA_PRETA, 'preta', 'la_preta'),
  planta(Bloco.ARBUSTO_FRUTINHAS, 'arbusto de frutinhas', 'frutinhas'),
  def(Bloco.FOLHAS_OUTONO, 'folhas de outono', 'folhas_outono', folhas()),
  def(Bloco.CAMA, 'cama', 'cama_lado', {
    opaco: false,
    forma: 'cama',
    dureza: 0.3,
    som: 'folhagem',
    tiles: { topo: 'cama_topo', lado: 'cama_lado', base: 'tabuas' },
  }),
  def(
    Bloco.PORTA,
    'porta',
    'porta',
    madeira({ opaco: false, forma: 'porta', recorte: true, dureza: 0.9 }),
  ),
  def(
    Bloco.PORTA_ABERTA,
    'porta aberta',
    'porta',
    madeira({
      solido: false,
      opaco: false,
      forma: 'porta',
      recorte: true,
      dureza: 0.9,
      semItem: true,
    }),
  ),
  def(
    Bloco.ESCADA,
    'escada de tábuas',
    'tabuas',
    madeira({ opaco: false, forma: 'escada', dureza: 0.9 }),
  ),
  def(Bloco.LAJE, 'laje de pedra', 'pedra_lisa', pedra({ opaco: false, forma: 'laje' })),
  def(Bloco.CERCA, 'cerca', 'tabuas', madeira({ opaco: false, forma: 'cerca', dureza: 0.9 })),
  def(
    Bloco.FORNALHA_ACESA,
    'fornalha acesa',
    'fornalha_lado',
    pedra({
      dureza: 1.8,
      luz: 13,
      emissivo: true,
      semItem: true,
      tiles: { topo: 'fornalha_topo', lado: 'fornalha_lado', frente: 'fornalha_acesa' },
    }),
  ),
  def(Bloco.TABUAS_BETULA, 'tábuas de bétula', 'tabuas_betula', madeira({ dureza: 0.9 })),
  def(Bloco.TABUAS_PINHO, 'tábuas de pinho', 'tabuas_pinho', madeira({ dureza: 0.9 })),
  def(Bloco.ABOBORA, 'abóbora', 'abobora_lado', {
    dureza: 0.8,
    som: 'madeira',
    tiles: { topo: 'abobora_topo', lado: 'abobora_lado' },
  }),
  def(Bloco.LAMPIAO_ABOBORA, 'lampião de abóbora', 'abobora_lado', {
    dureza: 0.8,
    som: 'madeira',
    luz: 14,
    emissivo: true,
    tiles: { topo: 'abobora_topo', lado: 'abobora_lado', frente: 'abobora_rosto' },
  }),
  def(Bloco.AGUA, 'água', 'vazio', {
    solido: false,
    opaco: false,
    liquido: true,
    semItem: true,
    dureza: undefined,
  }),
  def(
    Bloco.TERRA_ARADA,
    'terra arada',
    'terra',
    terra({ tiles: { topo: 'terra_arada', lado: 'terra', base: 'terra' } }),
  ),
  ...lavoura(Bloco.TRIGO_0, 'trigo', 'trigo'),
  ...lavoura(Bloco.MILHO_0, 'milho', 'milho'),
  ...lavoura(Bloco.ABOBOREIRA_0, 'aboboreira', 'aboboreira', 'aboboreira com abóbora'),
  def(Bloco.FENO, 'fardo de feno', 'feno_lado', {
    dureza: 0.5,
    som: 'folhagem',
    tiles: { topo: 'feno_topo', lado: 'feno_lado' },
  }),
  // porteira: a madeira da cerca; a aberta não segura ninguém e volta a ser porteira ao quebrar
  def(
    Bloco.PORTEIRA,
    'porteira',
    'tabuas',
    madeira({ opaco: false, forma: 'porteira', dureza: 0.9 }),
  ),
  def(
    Bloco.PORTEIRA_ABERTA,
    'porteira aberta',
    'tabuas',
    madeira({ solido: false, opaco: false, forma: 'porteira', dureza: 0.9, semItem: true }),
  ),
  // spec 014: a Cidade Grande. Chão da cidade (asfalto, faixas e calçada) é pedra de rua;
  // as paredes dos prédios, pedra; janela é bloco com recorte (vê-se o de dentro) e a
  // janela acesa brilha sem espalhar luz (luz 0: não pesa no cálculo da luz)
  def(Bloco.ASFALTO, 'asfalto', 'asfalto', pedra({ dureza: 1.4 })),
  def(
    Bloco.FAIXA_RUA,
    'faixa de rua',
    'asfalto',
    pedra({ dureza: 1.4, tiles: { topo: 'faixa_rua', lado: 'asfalto' } }),
  ),
  def(
    Bloco.FAIXA_PEDESTRE,
    'faixa de pedestre',
    'asfalto',
    pedra({ dureza: 1.4, tiles: { topo: 'faixa_pedestre', lado: 'asfalto' } }),
  ),
  def(
    Bloco.CALCADA,
    'calçada',
    'calcada_lado',
    pedra({ dureza: 1.4, tiles: { topo: 'calcada', lado: 'calcada_lado' } }),
  ),
  def(Bloco.CONCRETO, 'concreto', 'concreto', pedra({ dureza: 1.6 })),
  def(Bloco.PEDRA_MARROM, 'pedra marrom', 'pedra_marrom', pedra({ dureza: 1.6 })),
  def(
    Bloco.ESCADINHA_PEDRA,
    'escadinha de pedra',
    'pedra_marrom',
    pedra({ opaco: false, forma: 'escada', dureza: 1.6 }),
  ),
  def(Bloco.PEDRA_CREME, 'pedra creme', 'pedra_creme', pedra({ dureza: 1.6 })),
  def(Bloco.FRISO_DOURADO, 'friso dourado', 'friso_dourado', pedra({ dureza: 1.6 })),
  def(Bloco.JANELA, 'janela grande', 'janela', {
    opaco: false,
    recorte: true,
    dureza: 0.4,
    som: 'cristal',
  }),
  def(Bloco.JANELA_ACESA, 'janela acesa', 'janela_acesa', {
    emissivo: true,
    dureza: 0.4,
    som: 'cristal',
  }),
  def(
    Bloco.GRADE_FERRO,
    'grade de ferro',
    'grade',
    pedra({ opaco: false, forma: 'cerca', dureza: 1.2 }),
  ),
  def(
    Bloco.LAJE_GRADE,
    'laje de grade',
    'laje_grade',
    pedra({ opaco: false, forma: 'laje', dureza: 1.2 }),
  ),
  def(Bloco.POSTE, 'poste de luz', 'poste', {
    solido: false,
    opaco: false,
    forma: 'tocha',
    emissivo: true,
    luz: 14,
    dureza: 0.6,
    som: 'pedra',
  }),
  def(
    Bloco.PLACA,
    'placa',
    'placa_lado',
    madeira({
      solido: false,
      opaco: false,
      forma: 'placa',
      dureza: 0.6,
      tiles: {
        lado: 'placa_lado',
        frente: 'placa',
        frentes: ['placa', 'placa_pao', 'placa_chave', 'placa_tijolo', 'placa_sorvete'],
      },
    }),
  ),
  def(Bloco.TOLDO_VERMELHO, 'toldo vermelho', 'toldo_vermelho', {
    opaco: false,
    forma: 'laje',
    dureza: 0.4,
    som: 'folhagem',
  }),
  def(Bloco.TOLDO_VERDE, 'toldo verde', 'toldo_verde', {
    opaco: false,
    forma: 'laje',
    dureza: 0.4,
    som: 'folhagem',
  }),
  def(Bloco.TAPUME, 'tapume', 'tapume', madeira({ opaco: false, forma: 'cerca', dureza: 0.9 })),
  def(
    Bloco.ESCADA_GRADE,
    'escada de grade',
    'laje_grade',
    pedra({ opaco: false, forma: 'escada', dureza: 1.2 }),
  ),
  // spec 026: a Vila Neon. O palco e a caixa de som são de madeira pintada; a pista, o letreiro
  // e a faixa de neon brilham sem espalhar luz (luz 0, como a janela acesa: não pesam na conta
  // da luz); a treliça e o alambrado são recorte (vê-se através); a grade da plateia é cerca
  def(Bloco.PISO_PALCO, 'piso de palco', 'piso_palco', madeira({ dureza: 1 })),
  def(Bloco.CAIXA_SOM, 'caixa de som', 'caixa_som', madeira({ dureza: 1 })),
  def(
    Bloco.TRELICA,
    'treliça cromada',
    'trelica',
    pedra({ opaco: false, recorte: true, dureza: 1.2 }),
  ),
  def(Bloco.PISTA_NEON, 'pista quadriculada', 'pista_neon', {
    emissivo: true,
    dureza: 1,
    ferramenta: 'picareta',
    som: 'pedra',
  }),
  def(Bloco.LETREIRO_NEON, 'letreiro de neon', 'letreiro_neon', {
    emissivo: true,
    dureza: 0.6,
    som: 'cristal',
  }),
  def(Bloco.PAREDE_POSTER, 'parede de pôster', 'parede_poster', pedra({ dureza: 1.4 })),
  def(Bloco.REBOCO_ROSA, 'reboco rosa', 'reboco_rosa', pedra({ dureza: 1.4 })),
  def(Bloco.REBOCO_AZUL, 'reboco azul', 'reboco_azul', pedra({ dureza: 1.4 })),
  def(Bloco.REBOCO_AMARELO, 'reboco amarelo', 'reboco_amarelo', pedra({ dureza: 1.4 })),
  def(Bloco.REBOCO_MENTA, 'reboco menta', 'reboco_menta', pedra({ dureza: 1.4 })),
  def(Bloco.TELHA_COLONIAL, 'telha colonial', 'telha_colonial', pedra({ dureza: 1.2 })),
  def(
    Bloco.GRADE_PLATEIA,
    'grade da plateia',
    'grade_plateia',
    pedra({ opaco: false, forma: 'cerca', dureza: 1.2 }),
  ),
  def(Bloco.FAIXA_NEON, 'faixa de neon', 'faixa_neon', {
    emissivo: true,
    dureza: 0.6,
    som: 'cristal',
  }),
  def(
    Bloco.ALAMBRADO,
    'alambrado',
    'alambrado',
    pedra({ opaco: false, recorte: true, dureza: 1.2 }),
  ),
  // spec 027: a Noite das Fantasias. Os telhados tortos de telha roxa, as casinhas de tijolo
  // torto e de tábua verde-oliva, o palco e o castelinho de tábua roxa, o caminho de pedrinha
  // lilás (onde a vassoura desliza), a teia de barbante colorido (recorte, vê-se através, sem
  // aranha), as janelas tortas de cortina (a acesa brilha sem espalhar luz, como a janela da
  // cidade), o toldinho listrado e o caldeirão de brinquedo
  def(
    Bloco.TELHA_ROXA,
    'telha roxa',
    'telha_roxa',
    pedra({ dureza: 1.2, tiles: { topo: 'telha_roxa_topo', lado: 'telha_roxa' } }),
  ),
  def(Bloco.TIJOLO_TORTO, 'tijolo torto', 'tijolo_torto', pedra({ dureza: 1.6 })),
  def(Bloco.TEIA_BARBANTE, 'teia de barbante', 'teia_barbante', {
    opaco: false,
    recorte: true,
    dureza: 0.3,
    som: 'folhagem',
  }),
  def(Bloco.FOLHAS_LARANJA, 'folhas laranja', 'folhas_laranja', folhas()),
  def(Bloco.TABUA_MUSGO, 'tábua verde-oliva', 'tabua_musgo', madeira({ dureza: 0.9 })),
  def(Bloco.PEDRINHA_LILAS, 'pedrinha lilás', 'pedrinha_lilas', pedra({ dureza: 1.4 })),
  def(Bloco.TABUA_ROXA, 'tábua roxa', 'tabua_roxa', madeira({ dureza: 0.9 })),
  def(Bloco.JANELA_TORTA, 'janela torta', 'janela_torta', { dureza: 0.4, som: 'cristal' }),
  def(Bloco.JANELA_TORTA_ACESA, 'janela torta acesa', 'janela_torta_acesa', {
    emissivo: true,
    dureza: 0.4,
    som: 'cristal',
  }),
  def(Bloco.TOLDINHO, 'toldinho listrado', 'toldinho', {
    opaco: false,
    forma: 'laje',
    dureza: 0.4,
    som: 'folhagem',
    tiles: { topo: 'toldinho_topo', lado: 'toldinho' },
  }),
  def(Bloco.CALDEIRAO, 'caldeirão', 'caldeirao', {
    opaco: false,
    dureza: 0.8,
    som: 'pedra',
    tiles: { topo: 'caldeirao_topo', lado: 'caldeirao' },
  }),
  // spec 039: os móveis. Quebram à mão (nenhum pede ferramenta), cada um com o som do material.
  // Os tiles são os de blocos que já existem: o desenho de verdade é o modelo da T05
  def(Bloco.SOFA, 'sofá', 'la_vermelha', { ...movel, dureza: 0.6, som: 'folhagem' }),
  def(Bloco.CADEIRA, 'cadeira', 'tabuas', madeira({ ...movel, dureza: 0.6 })),
  def(Bloco.CRIADO_MUDO, 'criado-mudo', 'tabuas', madeira({ ...movel, dureza: 0.6 })),
  def(Bloco.ABAJUR, 'abajur', 'la_amarela', { ...movel, dureza: 0.4, som: 'madeira' }),
  // o tapete fica na camada rente ao chão: não ocupa célula, não segura nada nem ninguém
  def(Bloco.TAPETE, 'tapete', 'la_vermelha', {
    ...movel,
    solido: false,
    dureza: 0.3,
    som: 'folhagem',
  }),
  def(Bloco.PIA, 'pia', 'pedra_lisa', { ...movel, dureza: 0.8, som: 'pedra' }),
  def(Bloco.GUARDA_ROUPA, 'guarda-roupa', 'tabuas', madeira({ ...movel, dureza: 0.9 })),
  // acesos: brilham e iluminam (a lavoura cresce perto); quebrados, devolvem o móvel apagado
  def(Bloco.ABAJUR_ACESO, 'abajur aceso', 'la_amarela', {
    ...movel,
    dureza: 0.4,
    som: 'madeira',
    emissivo: true,
    luz: 12,
    semItem: true,
  }),
  // (a lua do criado-mudo alcança o quarto como o abajur alcança a sala: nunca escuro total)
  def(
    Bloco.CRIADO_MUDO_ACESO,
    'criado-mudo aceso',
    'tabuas',
    madeira({ ...movel, dureza: 0.6, emissivo: true, luz: 11, semItem: true }),
  ),
  // spec 039b: os móveis da parte 2. Quebram à mão; os de ferro (o fogão, a geladeira, a TV e o
  // som) têm o som de pedra. Os tiles são os de blocos que já existem: o desenho é o modelo
  def(Bloco.FOGAO, 'fogão', 'pedra_lisa', { ...movel, dureza: 1, som: 'pedra' }),
  def(Bloco.GELADEIRA, 'geladeira', 'la_branca', { ...movel, dureza: 1, som: 'pedra' }),
  def(Bloco.MESA, 'mesa', 'tabuas', madeira({ ...movel, dureza: 0.8 })),
  def(Bloco.TV, 'televisão', 'la_azul', { ...movel, dureza: 0.8, som: 'pedra' }),
  def(Bloco.SOM, 'aparelho de som', 'la_preta', { ...movel, dureza: 0.6, som: 'pedra' }),
];

export function obterBloco(id: number): DefinicaoBloco | undefined {
  return REGISTRO_BLOCOS[id];
}

/** Luz emitida pelo bloco (0 a 15). */
export function luzDoBloco(id: number): number {
  return REGISTRO_BLOCOS[id]?.luz ?? 0;
}

/** Bloco que a mira e as ações enxergam (não é ar nem líquido). */
export function ehAlvo(id: number): boolean {
  return id !== Bloco.AR && !REGISTRO_BLOCOS[id]?.liquido;
}

/** Bloco que entra na malha de plantas (quads cruzados). */
export function ehCruz(id: number): boolean {
  return REGISTRO_BLOCOS[id]?.forma === 'cruz';
}
