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
} as const;

export type Ferramenta = 'picareta' | 'machado' | 'pa' | 'espada';
export type GrupoSom = 'terra' | 'pedra' | 'areia' | 'madeira' | 'folhagem' | 'cristal';
export type Forma = 'cubo' | 'cruz' | 'laje' | 'escada' | 'cerca' | 'porta' | 'cama' | 'tocha';

export interface TilesBloco {
  topo: string;
  lado: string;
  base: string;
  /** Face da frente (fornalha, baú, mesa), mostrada em +z. */
  frente?: string;
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
}

type Opcoes = Partial<Omit<DefinicaoBloco, 'id' | 'nome' | 'tiles'>> & {
  tiles?: Partial<TilesBloco> | string;
};

function tiles(t: Opcoes['tiles'], padrao: string): TilesBloco {
  if (typeof t === 'string') return { topo: t, lado: t, base: t };
  const lado = t?.lado ?? padrao;
  return { topo: t?.topo ?? lado, lado, base: t?.base ?? t?.topo ?? lado, frente: t?.frente };
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
const la = (id: number, nome: string, t: string) =>
  def(id, `lã ${nome}`, t, { dureza: 0.6, som: 'folhagem' });

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
  planta(Bloco.FLOR, 'flor', 'flor', { emissivo: true, luz: 3 }),
  planta(Bloco.COGUMELO_BRILHANTE, 'cogumelo brilhante', 'cogumelo', { emissivo: true, luz: 7 }),
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
];

export function obterBloco(id: number): DefinicaoBloco | undefined {
  return REGISTRO_BLOCOS[id];
}

/** Luz emitida pelo bloco (0 a 15). */
export function luzDoBloco(id: number): number {
  return REGISTRO_BLOCOS[id]?.luz ?? 0;
}

/** Bloco que entra na malha de plantas (quads cruzados). */
export function ehCruz(id: number): boolean {
  const f = REGISTRO_BLOCOS[id]?.forma;
  return f === 'cruz' || f === 'tocha';
}
