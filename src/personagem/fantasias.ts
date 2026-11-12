/**
 * Spec 017 (T02): o catálogo das fantasias prontas. Só dados (nada de Babylon): o boneco
 * (T03) lê as peças daqui e a aba Fantasias (T04) lê os grupos, nomes e cores.
 *
 * A fantasia é uma camada por cima do look da criança: corpo, pele, rosto, cabelo e nome
 * continuam os dela, e a roupa, a calça e o enfeite de baixo ficam guardados intactos.
 * "Tirar fantasia" só tira a camada, e o look de antes volta igualzinho.
 */
import type { Corpo, IdDesbloqueio } from './aparencia';
import type { IdTema } from '../temas/tipos';

export type GrupoFantasia = 'realeza' | 'herois' | 'temas';
/** Abas sempre nesta ordem (a criança aprende o lugar das coisas). */
export const GRUPOS_FANTASIA: readonly GrupoFantasia[] = ['realeza', 'herois', 'temas'];
export const ROTULOS_GRUPOS: Record<GrupoFantasia, string> = {
  realeza: 'Realeza',
  herois: 'Heróis',
  temas: 'Dos temas',
};

/** Tipos de peça nova que o boneco sabe montar (T03). */
export type TipoPeca =
  // realeza
  | 'saia-camadas'
  | 'mangas-bufantes'
  | 'coroa'
  | 'tiara'
  | 'enfeite-cabeca'
  | 'varinha'
  | 'casaco-faixa'
  | 'capa-curta'
  | 'cetro'
  // heróis
  | 'capa'
  | 'mascara'
  | 'emblema'
  | 'cinto'
  | 'botas'
  | 'luvas'
  // dos temas
  | 'camisa-xadrez'
  | 'macacao'
  | 'chapeu-palha'
  | 'colete-lenco'
  | 'chapeu-vaqueiro'
  | 'traje-espacial'
  | 'capacete-bolha'
  | 'capuz-dino'
  | 'avental-doce'
  | 'touca-chef'
  | 'jaleco'
  | 'oculos'
  | 'coroa-folhas'
  | 'capa-folhas'
  | 'capuz-lanterneira'
  | 'lanterna'
  // spec 014: prêmios do canteiro da cidade
  | 'capacete-obra'
  | 'colete-obra';

/** Símbolos próprios (nada de letra no peito, teia ou morcego). */
export type Simbolo = 'flor' | 'estrela' | 'concha' | 'floco' | 'raio' | 'coracao' | 'folha';

/**
 * Cor de uma peça: um papel ligado à cor principal escolhida ('principal', 'clara' e
 * 'escura'), a cor do emblema da fantasia ('emblema') ou uma cor fixa em "#rrggbb".
 */
export type CorPeca = 'principal' | 'clara' | 'escura' | 'emblema' | `#${string}`;

export interface PecaFantasia {
  tipo: TipoPeca;
  cor: CorPeca;
  simbolo?: Simbolo;
  /** Dá para tirar só esta peça e continuar fantasiado (capa, varinha, máscara...). */
  opcional?: boolean;
}

/** A roupa de baixo que a fantasia pinta no boneco (no lugar da roupa e da calça da criança). */
export interface RoupaDeBaixo {
  camisa: CorPeca;
  manga?: CorPeca;
  calca: CorPeca;
  sapato?: CorPeca;
}

/**
 * Como o cabelo fica por baixo do que vai na cabeça: 'livre' (tiara, máscara: nada muda),
 * 'chapeu' (assenta por cima, como os chapéus de hoje), 'capuz' (cobre o topo; as mechas
 * saem por baixo) e 'capacete' (bolha: o cabelo volumoso é achatado ou vira coque).
 */
export type Cabeca = 'livre' | 'chapeu' | 'capuz' | 'capacete';

export interface Visual {
  roupa: RoupaDeBaixo;
  pecas: readonly PecaFantasia[];
  cabeca: Cabeca;
}

export interface FantasiaDef {
  id: string;
  grupo: GrupoFantasia;
  /** Só nas fantasias dos temas (elas servem em qualquer mundo; o tema só ordena e sugere). */
  tema?: IdTema;
  /** Nome pelo corpo escolhido: "Heroína Relâmpago" / "Herói Relâmpago". */
  nomes: Record<Corpo, string>;
  /** Opções da cor principal; a primeira é a padrão. */
  cores: readonly string[];
  corEmblema: string;
  /** O que veste em cada corpo (na Realeza o masculino vira príncipe, sem saia). */
  visual: Record<Corpo, Visual>;
  /**
   * Spec 014: só se veste depois de ganhar (no canteiro da cidade). Antes disso a aba mostra a
   * silhueta com cadeado e a sugestão do tema nunca oferece.
   */
  desbloqueio?: IdDesbloqueio;
}

/** Fantasia vestida: o id do catálogo e o índice da cor principal. */
export interface FantasiaVestida {
  id: string;
  cor: number;
  /** Peças opcionais que a criança tirou ("personalizar peça por peça"). */
  sem?: TipoPeca[];
}

const OURO = '#ffd45a';
const BRANCO = '#ffffff';

function mesmo(v: Visual): Record<Corpo, Visual> {
  return { feminino: v, masculino: v };
}

// ---------------------------------------------------------------------------
// Realeza: princesa no corpo feminino, príncipe no masculino (mesmas cores e símbolo).

function princesa(enfeite: 'coroa' | 'tiara' | 'enfeite-cabeca', simbolo: Simbolo): Visual {
  return {
    roupa: { camisa: 'principal', manga: 'clara', calca: 'clara', sapato: BRANCO },
    cabeca: 'livre',
    pecas: [
      { tipo: 'saia-camadas', cor: 'principal' },
      { tipo: 'mangas-bufantes', cor: 'clara' },
      { tipo: enfeite, cor: OURO, simbolo, opcional: true },
      { tipo: 'varinha', cor: BRANCO, simbolo, opcional: true },
    ],
  };
}

function principe(simbolo: Simbolo): Visual {
  return {
    roupa: { camisa: 'escura', manga: 'escura', calca: 'escura', sapato: '#3b2a1e' },
    cabeca: 'chapeu',
    pecas: [
      { tipo: 'casaco-faixa', cor: 'escura', simbolo },
      { tipo: 'botas', cor: '#3b2a1e' },
      { tipo: 'luvas', cor: BRANCO },
      { tipo: 'capa-curta', cor: 'clara', opcional: true },
      { tipo: 'coroa', cor: OURO, simbolo, opcional: true },
      { tipo: 'cetro', cor: OURO, simbolo, opcional: true },
    ],
  };
}

function realeza(
  id: string,
  sufixo: string,
  cores: string[],
  enfeite: 'coroa' | 'tiara' | 'enfeite-cabeca',
  simbolo: Simbolo,
): FantasiaDef {
  return {
    id,
    grupo: 'realeza',
    nomes: { feminino: `Princesa ${sufixo}`, masculino: `Príncipe ${sufixo}` },
    cores,
    corEmblema: OURO,
    visual: { feminino: princesa(enfeite, simbolo), masculino: principe(simbolo) },
  };
}

// ---------------------------------------------------------------------------
// Heróis: macacão inteiro, capa, máscara, emblema próprio, cinto, luvas e botas.

function heroi(
  id: string,
  sufixo: string,
  cores: string[],
  corEmblema: string,
  simbolo: Simbolo,
): FantasiaDef {
  return {
    id,
    grupo: 'herois',
    nomes: { feminino: `Heroína ${sufixo}`, masculino: `Herói ${sufixo}` },
    cores,
    corEmblema,
    visual: mesmo({
      roupa: { camisa: 'principal', calca: 'principal' },
      cabeca: 'livre',
      pecas: [
        { tipo: 'emblema', cor: 'emblema', simbolo },
        { tipo: 'cinto', cor: 'emblema' },
        { tipo: 'luvas', cor: 'escura' },
        { tipo: 'botas', cor: 'escura' },
        { tipo: 'capa', cor: 'escura', opcional: true },
        { tipo: 'mascara', cor: 'escura', opcional: true },
      ],
    }),
  };
}

// ---------------------------------------------------------------------------

export const FANTASIAS: readonly FantasiaDef[] = [
  realeza(
    'realeza-flores',
    'das Flores',
    ['#ff8fc8', '#ffd45a', '#b89cff', '#7cc6ff', '#ff9b6b'],
    'tiara',
    'flor',
  ),
  realeza(
    'realeza-estrelas',
    'das Estrelas',
    ['#6f78ff', '#2f3a8a', '#ff8fc8', '#3fb8a8'],
    'coroa',
    'estrela',
  ),
  realeza(
    'realeza-mar',
    'do Mar',
    ['#3fc4d8', '#7cc6ff', '#5ad8a8', '#b89cff'],
    'enfeite-cabeca',
    'concha',
  ),
  realeza(
    'realeza-neve',
    'da Neve',
    ['#dff4ff', '#cfd8ff', '#ffe4f2', '#e8ffe8'],
    'enfeite-cabeca',
    'floco',
  ),

  heroi(
    'heroi-relampago',
    'Relâmpago',
    ['#2f6fd8', '#7a3ad8', '#1aa88a', '#e8462e'],
    '#ffd45a',
    'raio',
  ),
  heroi(
    'heroi-estrela',
    'Estrela',
    ['#ff6a9a', '#8a4ab8', '#ffb000', '#3fb8a8'],
    '#ffffff',
    'estrela',
  ),
  heroi(
    'heroi-coracao',
    'Coração',
    ['#3fae5a', '#2f6fd8', '#ff8a3d', '#8a4ab8'],
    '#ff5a6a',
    'coracao',
  ),
  heroi('heroi-mata', 'da Mata', ['#4caa3a', '#2f8a7a', '#c9a03a', '#5a7a2a'], '#d6ff8a', 'folha'),

  {
    id: 'fazendeira',
    grupo: 'temas',
    tema: 'rancho-alegre',
    nomes: { feminino: 'Fazendeira', masculino: 'Fazendeiro' },
    cores: ['#3f6fb8', '#5a4a6e', '#3f8a5a'],
    corEmblema: '#d9483b',
    visual: mesmo({
      roupa: { camisa: '#d9483b', manga: '#d9483b', calca: 'principal', sapato: '#5a3a26' },
      cabeca: 'chapeu',
      pecas: [
        { tipo: 'camisa-xadrez', cor: BRANCO },
        { tipo: 'macacao', cor: 'principal' },
        { tipo: 'chapeu-palha', cor: '#f0cf6a', opcional: true },
      ],
    }),
  },
  {
    id: 'vaqueira',
    grupo: 'temas',
    tema: 'rancho-alegre',
    nomes: { feminino: 'Vaqueira', masculino: 'Vaqueiro' },
    cores: ['#a8733f', '#7a4826', '#c9a03a'],
    corEmblema: '#d9483b',
    visual: mesmo({
      roupa: { camisa: '#f2e6c8', manga: '#f2e6c8', calca: '#3f6fb8' },
      cabeca: 'chapeu',
      pecas: [
        { tipo: 'colete-lenco', cor: 'principal' },
        { tipo: 'botas', cor: 'principal' },
        { tipo: 'chapeu-vaqueiro', cor: 'escura', opcional: true },
      ],
    }),
  },
  {
    id: 'astronauta',
    grupo: 'temas',
    tema: 'exploracao-lunar',
    nomes: { feminino: 'Astronauta', masculino: 'Astronauta' },
    cores: ['#f2f4f8', '#ffd45a', '#ff8fb3'],
    corEmblema: '#3b4250',
    visual: mesmo({
      roupa: { camisa: 'principal', calca: 'principal' },
      cabeca: 'capacete',
      pecas: [
        { tipo: 'traje-espacial', cor: 'principal' },
        { tipo: 'luvas', cor: '#b9c0c8' },
        { tipo: 'botas', cor: '#b9c0c8' },
        { tipo: 'capacete-bolha', cor: '#cfe8ff', opcional: true },
      ],
    }),
  },
  {
    id: 'dino',
    grupo: 'temas',
    tema: 'era-dos-dinos',
    nomes: { feminino: 'Fantasia de Dino', masculino: 'Fantasia de Dino' },
    cores: ['#5fbf4a', '#ff8a3d', '#8a6aff', '#3fb8d8'],
    corEmblema: '#fff3c8',
    visual: mesmo({
      roupa: { camisa: 'principal', calca: 'principal' },
      cabeca: 'capuz',
      pecas: [
        { tipo: 'capuz-dino', cor: 'principal' },
        { tipo: 'luvas', cor: 'clara' },
        { tipo: 'botas', cor: 'escura' },
      ],
    }),
  },
  {
    id: 'confeiteira',
    grupo: 'temas',
    tema: 'doce-reino',
    nomes: { feminino: 'Confeiteira', masculino: 'Confeiteiro' },
    cores: ['#ff9ac8', '#9ad8ff', '#ffe08a'],
    corEmblema: '#e8202a',
    visual: mesmo({
      roupa: { camisa: BRANCO, calca: 'principal' },
      cabeca: 'chapeu',
      pecas: [
        { tipo: 'avental-doce', cor: 'principal' },
        { tipo: 'touca-chef', cor: BRANCO, opcional: true },
      ],
    }),
  },
  {
    id: 'cientista',
    grupo: 'temas',
    tema: 'planeta-vivo',
    nomes: { feminino: 'Cientista', masculino: 'Cientista' },
    cores: ['#f6f6f6', '#cfe8ff', '#e8ffe0'],
    corEmblema: '#2f6fd8',
    visual: mesmo({
      roupa: { camisa: 'principal', calca: '#3f6fb8' },
      cabeca: 'livre',
      pecas: [
        { tipo: 'jaleco', cor: 'principal' },
        { tipo: 'oculos', cor: '#3b4250', opcional: true },
      ],
    }),
  },
  {
    id: 'guardia-mata',
    grupo: 'temas',
    tema: 'mata-encantada',
    nomes: { feminino: 'Guardiã da Mata', masculino: 'Guardião da Mata' },
    cores: ['#4caa3a', '#2f8a5a', '#a8c83a'],
    corEmblema: '#ff8fc8',
    visual: mesmo({
      roupa: { camisa: 'principal', calca: 'escura' },
      cabeca: 'livre',
      pecas: [
        { tipo: 'coroa-folhas', cor: '#3f8a2c', simbolo: 'flor', opcional: true },
        { tipo: 'capa-folhas', cor: 'principal', simbolo: 'folha', opcional: true },
      ],
    }),
  },
  {
    id: 'lanterneira',
    grupo: 'temas',
    tema: 'bruma-e-luz',
    nomes: { feminino: 'Lanterneira', masculino: 'Lanterneiro' },
    cores: ['#6a5ab8', '#2f6f8f', '#8a4a6a'],
    corEmblema: '#ffe58a',
    visual: mesmo({
      roupa: { camisa: 'principal', calca: '#2d3a4f' },
      cabeca: 'capuz',
      pecas: [
        { tipo: 'capuz-lanterneira', cor: 'principal' },
        { tipo: 'lanterna', cor: '#ffe58a', opcional: true },
      ],
    }),
  },
  // spec 014: os prêmios do canteiro da Cidade Grande (ganhos uma vez, vestidos em qualquer
  // mundo). A cor principal é a da camisa; o capacete e o colete têm a cor de obra de sempre.
  {
    id: 'capacete-obra',
    grupo: 'temas',
    tema: 'cidade-grande',
    desbloqueio: 'capacete-obra',
    nomes: { feminino: 'Pedreira', masculino: 'Pedreiro' },
    cores: ['#3f6fb8', '#5a8a4a', '#a8733f', '#8a5a9a'],
    corEmblema: '#ffc61a',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: 'principal', calca: '#36507a', sapato: '#6a4426' },
      cabeca: 'chapeu',
      pecas: [
        { tipo: 'capacete-obra', cor: '#ffc61a' },
        { tipo: 'botas', cor: '#7a4826' },
      ],
    }),
  },
  {
    id: 'colete-obra',
    grupo: 'temas',
    tema: 'cidade-grande',
    desbloqueio: 'colete-obra',
    nomes: { feminino: 'Mestra de obras', masculino: 'Mestre de obras' },
    cores: ['#3f6fb8', '#f2f4f8', '#5a8a4a', '#8a5a9a'],
    corEmblema: '#ffc61a',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: 'principal', calca: '#36507a', sapato: '#6a4426' },
      cabeca: 'chapeu',
      pecas: [
        { tipo: 'colete-obra', cor: '#ff7a1a' },
        { tipo: 'botas', cor: '#7a4826' },
        { tipo: 'capacete-obra', cor: '#ffc61a', opcional: true },
      ],
    }),
  },
];

const POR_ID = new Map(FANTASIAS.map((f) => [f.id, f]));

export function fantasiaPorId(id: unknown): FantasiaDef | undefined {
  return typeof id === 'string' ? POR_ID.get(id) : undefined;
}

/** Nome pelo corpo: "Princesa das Estrelas" / "Príncipe das Estrelas". */
export function rotuloDaFantasia(
  fantasia: FantasiaDef | FantasiaVestida | string,
  corpo: Corpo,
): string {
  const def =
    typeof fantasia === 'string'
      ? fantasiaPorId(fantasia)
      : 'nomes' in fantasia
        ? fantasia
        : fantasiaPorId(fantasia.id);
  return def ? def.nomes[corpo] : '';
}

/** As fantasias de uma aba. Em "Dos temas", as do tema do mundo aberto vêm primeiro. */
export function fantasiasDoGrupo(grupo: GrupoFantasia, temaDoMundo?: string): FantasiaDef[] {
  const lista = FANTASIAS.filter((f) => f.grupo === grupo);
  if (grupo !== 'temas' || !temaDoMundo) return lista;
  return [
    ...lista.filter((f) => f.tema === temaDoMundo),
    ...lista.filter((f) => f.tema !== temaDoMundo),
  ];
}

/** Os temas de "Dos temas" na ordem da tela (o do mundo aberto primeiro, sem repetir). */
export function temasDasFantasias(temaDoMundo?: string): IdTema[] {
  const temas: IdTema[] = [];
  for (const f of fantasiasDoGrupo('temas', temaDoMundo))
    if (f.tema && !temas.includes(f.tema)) temas.push(f.tema);
  return temas;
}

/** Spec 014: a criança pode vestir esta fantasia (é livre, ou ela já ganhou a peça)? */
export function fantasiaLiberada(
  def: Pick<FantasiaDef, 'desbloqueio'>,
  desbloqueios: readonly string[] = [],
): boolean {
  return !def.desbloqueio || desbloqueios.includes(def.desbloqueio);
}

/**
 * A fantasia sugerida ao criar um mundo daquele tema (a primeira dele que a criança pode
 * vestir), se houver: as que ainda não foram ganhas nunca são sugeridas.
 */
export function fantasiaDoTema(
  tema: string,
  desbloqueios: readonly string[] = [],
): FantasiaDef | undefined {
  return FANTASIAS.find(
    (f) => f.grupo === 'temas' && f.tema === tema && fantasiaLiberada(f, desbloqueios),
  );
}

/**
 * Fantasia válida ou nenhuma: id desconhecido vira "sem fantasia", cor fora da paleta vira a
 * padrão e só ficam em `sem` peças opcionais daquela fantasia naquele corpo.
 */
export function normalizarFantasia(entrada: unknown, corpo: Corpo): FantasiaVestida | undefined {
  if (typeof entrada !== 'object' || entrada === null || Array.isArray(entrada)) return undefined;
  const obj = entrada as Record<string, unknown>;
  const def = fantasiaPorId(obj.id);
  if (!def) return undefined;
  const cor =
    typeof obj.cor === 'number' &&
    Number.isInteger(obj.cor) &&
    obj.cor >= 0 &&
    obj.cor < def.cores.length
      ? obj.cor
      : 0;
  const saida: FantasiaVestida = { id: def.id, cor };
  if (Array.isArray(obj.sem)) {
    const opcionais = def.visual[corpo].pecas.filter((p) => p.opcional).map((p) => p.tipo);
    const sem = opcionais.filter((t) => (obj.sem as unknown[]).includes(t));
    if (sem.length) saida.sem = sem;
  }
  return saida;
}

/** As peças que o boneco monta agora (sem as opcionais que a criança tirou). */
export function pecasVestidas(f: FantasiaVestida, corpo: Corpo): PecaFantasia[] {
  const def = fantasiaPorId(f.id);
  if (!def) return [];
  return def.visual[corpo].pecas.filter((p) => !f.sem?.includes(p.tipo));
}

// ---------------------------------------------------------------------------
// Cores: os papéis 'clara' e 'escura' saem da cor principal, como no esboço.

function paraRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function paraHex([r, g, b]: number[]): string {
  return (
    '#' +
    [r, g, b]
      .map((c) =>
        Math.round(Math.min(255, Math.max(0, c)))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}
/** Mistura com branco (k de 0 a 1). */
export function clarear(hex: string, k: number): string {
  return paraHex(paraRgb(hex).map((c) => c + (255 - c) * k));
}
/** Escurece (k de 0 a 1). */
export function escurecer(hex: string, k: number): string {
  return paraHex(paraRgb(hex).map((c) => c * (1 - k)));
}

/** A cor "#rrggbb" de um papel na fantasia vestida. */
export function corDaPeca(f: FantasiaVestida, cor: CorPeca): string {
  const def = fantasiaPorId(f.id);
  const principal = def?.cores[f.cor] ?? def?.cores[0] ?? '#888888';
  switch (cor) {
    case 'principal':
      return principal;
    case 'clara':
      return clarear(principal, 0.3);
    case 'escura':
      return escurecer(principal, 0.3);
    case 'emblema':
      return def?.corEmblema ?? BRANCO;
    default:
      return cor;
  }
}
