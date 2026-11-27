import { Bloco, obterBloco } from '../world/blocks';
import { idDoBloco, type DefItem } from './itens';
import type { Pilha } from './inventario';

const b = (id: number) => idDoBloco(id);

/** Grupos de itens aceitos onde a receita pede uma tag (#nome). */
export const TAGS: Record<string, string[]> = {
  '#tabuas': [b(Bloco.TABUAS), b(Bloco.TABUAS_BETULA), b(Bloco.TABUAS_PINHO)],
  '#troncos': [
    b(Bloco.MADEIRA_RETORCIDA),
    b(Bloco.TRONCO_BETULA),
    b(Bloco.TRONCO_PINHO),
    b(Bloco.TRONCO_LANTERNA),
  ],
  '#pedra': [b(Bloco.PEDREGULHO), b(Bloco.PEDRA_RACHADA)],
  '#areia': [b(Bloco.AREIA_BRUMA), b(Bloco.AREIA_DESERTO)],
};

export interface Receita {
  id: string;
  /** Linhas do desenho (até 3x3); espaço = vazio. Ausente = receita sem forma. */
  forma?: string[];
  /** Ingredientes: letra do desenho → item ou tag; sem forma: lista. */
  chaves?: Record<string, string>;
  ingredientes?: string[];
  resultado: { item: string; qtd: number };
  /** Só na mesa de trabalho (precisa de 3x3). */
  mesa?: boolean;
  categoria: CategoriaReceita;
}

/**
 * As categorias do livro de receitas, na ordem das abas (spec 039: a "casa", com os móveis e a
 * cama). As abas do catálogo do criativo são as mesmas, com o "tudo" na frente.
 */
export const CATEGORIAS_RECEITA = [
  'blocos',
  'casa',
  'comida',
  'ferramentas',
  'luz',
  'decoracao',
  'materiais',
] as const;
export type CategoriaReceita = (typeof CATEGORIAS_RECEITA)[number];

const MATERIAIS_FERRAMENTA: [string, string][] = [
  ['madeira', '#tabuas'],
  ['pedra', '#pedra'],
  ['cobre', 'lingote_cobre'],
  ['ferro', 'lingote_ferro'],
  ['cristal', 'luzita'],
];

function ferramentas(): Receita[] {
  const r: Receita[] = [];
  for (const [nivel, mat] of MATERIAIS_FERRAMENTA) {
    r.push(
      {
        id: `picareta_${nivel}`,
        forma: ['MMM', ' G ', ' G '],
        chaves: { M: mat, G: 'graveto' },
        resultado: { item: `picareta_${nivel}`, qtd: 1 },
        mesa: true,
        categoria: 'ferramentas',
      },
      {
        id: `machado_${nivel}`,
        forma: ['MM', 'MG', ' G'],
        chaves: { M: mat, G: 'graveto' },
        resultado: { item: `machado_${nivel}`, qtd: 1 },
        mesa: true,
        categoria: 'ferramentas',
      },
      {
        id: `pa_${nivel}`,
        forma: ['M', 'G', 'G'],
        chaves: { M: mat, G: 'graveto' },
        resultado: { item: `pa_${nivel}`, qtd: 1 },
        mesa: true,
        categoria: 'ferramentas',
      },
      {
        id: `espada_${nivel}`,
        forma: ['M', 'M', 'G'],
        chaves: { M: mat, G: 'graveto' },
        resultado: { item: `espada_${nivel}`, qtd: 1 },
        mesa: true,
        categoria: 'ferramentas',
      },
      {
        id: `enxada_${nivel}`,
        forma: ['MM', ' G', ' G'],
        chaves: { M: mat, G: 'graveto' },
        resultado: { item: `enxada_${nivel}`, qtd: 1 },
        mesa: true,
        categoria: 'ferramentas',
      },
    );
  }
  return r;
}

const LAS: [number, string][] = [
  [Bloco.LA_VERMELHA, 'frutinhas'],
  [Bloco.LA_LARANJA, b(Bloco.ABOBORA)],
  [Bloco.LA_AMARELA, b(Bloco.AREIA_DESERTO)],
  [Bloco.LA_VERDE, b(Bloco.CACTO)],
  [Bloco.LA_AZUL, 'luzita'],
  [Bloco.LA_ROXA, b(Bloco.FLOR)],
  [Bloco.LA_PRETA, 'carvao'],
];

export const RECEITAS: readonly Receita[] = [
  {
    id: 'tabuas',
    ingredientes: [b(Bloco.MADEIRA_RETORCIDA)],
    resultado: { item: b(Bloco.TABUAS), qtd: 4 },
    categoria: 'blocos',
  },
  {
    id: 'tabuas_lanterna',
    ingredientes: [b(Bloco.TRONCO_LANTERNA)],
    resultado: { item: b(Bloco.TABUAS), qtd: 4 },
    categoria: 'blocos',
  },
  {
    id: 'tabuas_betula',
    ingredientes: [b(Bloco.TRONCO_BETULA)],
    resultado: { item: b(Bloco.TABUAS_BETULA), qtd: 4 },
    categoria: 'blocos',
  },
  {
    id: 'tabuas_pinho',
    ingredientes: [b(Bloco.TRONCO_PINHO)],
    resultado: { item: b(Bloco.TABUAS_PINHO), qtd: 4 },
    categoria: 'blocos',
  },
  {
    id: 'graveto',
    forma: ['T', 'T'],
    chaves: { T: '#tabuas' },
    resultado: { item: 'graveto', qtd: 4 },
    categoria: 'materiais',
  },
  {
    id: 'mesa',
    forma: ['TT', 'TT'],
    chaves: { T: '#tabuas' },
    resultado: { item: b(Bloco.MESA_TRABALHO), qtd: 1 },
    categoria: 'blocos',
  },
  {
    id: 'tocha',
    forma: ['C', 'G'],
    chaves: { C: 'carvao', G: 'graveto' },
    resultado: { item: b(Bloco.TOCHA), qtd: 4 },
    categoria: 'luz',
  },
  {
    id: 'fornalha',
    forma: ['PPP', 'P P', 'PPP'],
    chaves: { P: '#pedra' },
    resultado: { item: b(Bloco.FORNALHA), qtd: 1 },
    mesa: true,
    categoria: 'blocos',
  },
  {
    id: 'bau',
    forma: ['TTT', 'T T', 'TTT'],
    chaves: { T: '#tabuas' },
    resultado: { item: b(Bloco.BAU), qtd: 1 },
    mesa: true,
    categoria: 'blocos',
  },
  {
    id: 'lanterna',
    forma: [' F ', 'VTV', ' F '],
    chaves: { F: 'lingote_ferro', V: b(Bloco.VIDRO), T: b(Bloco.TOCHA) },
    resultado: { item: b(Bloco.LANTERNA), qtd: 1 },
    mesa: true,
    categoria: 'luz',
  },
  {
    id: 'lampiao',
    forma: ['A', 'T'],
    chaves: { A: b(Bloco.ABOBORA), T: b(Bloco.TOCHA) },
    resultado: { item: b(Bloco.LAMPIAO_ABOBORA), qtd: 1 },
    categoria: 'luz',
  },
  {
    id: 'bloco_luzita',
    forma: ['LLL', 'LLL', 'LLL'],
    chaves: { L: 'luzita' },
    resultado: { item: b(Bloco.BLOCO_LUZITA), qtd: 1 },
    mesa: true,
    categoria: 'luz',
  },
  {
    id: 'luzita_de_bloco',
    ingredientes: [b(Bloco.BLOCO_LUZITA)],
    resultado: { item: 'luzita', qtd: 9 },
    categoria: 'materiais',
  },
  {
    id: 'tijolos_pedra',
    forma: ['PP', 'PP'],
    chaves: { P: b(Bloco.PEDRA_LISA) },
    resultado: { item: b(Bloco.TIJOLOS_PEDRA), qtd: 4 },
    categoria: 'blocos',
  },
  {
    id: 'tijolos',
    forma: ['TT', 'TT'],
    chaves: { T: 'tijolo' },
    resultado: { item: b(Bloco.TIJOLOS), qtd: 1 },
    categoria: 'blocos',
  },
  {
    id: 'arenito',
    forma: ['AA', 'AA'],
    chaves: { A: b(Bloco.AREIA_DESERTO) },
    resultado: { item: b(Bloco.ARENITO), qtd: 1 },
    categoria: 'blocos',
  },
  {
    id: 'la_branca',
    forma: ['FF', 'FF'],
    chaves: { F: 'fibra' },
    resultado: { item: b(Bloco.LA_BRANCA), qtd: 1 },
    categoria: 'decoracao',
  },
  ...LAS.map(
    ([id, corante]): Receita => ({
      id: `la_${id}`,
      ingredientes: [b(Bloco.LA_BRANCA), corante],
      resultado: { item: b(id), qtd: 1 },
      categoria: 'decoracao',
    }),
  ),
  {
    id: 'escada',
    forma: ['T  ', 'TT ', 'TTT'],
    chaves: { T: '#tabuas' },
    resultado: { item: b(Bloco.ESCADA), qtd: 4 },
    mesa: true,
    categoria: 'decoracao',
  },
  {
    id: 'laje',
    forma: ['PPP'],
    chaves: { P: b(Bloco.PEDRA_LISA) },
    resultado: { item: b(Bloco.LAJE), qtd: 6 },
    mesa: true,
    categoria: 'decoracao',
  },
  {
    id: 'cerca',
    forma: ['TGT', 'TGT'],
    chaves: { T: '#tabuas', G: 'graveto' },
    resultado: { item: b(Bloco.CERCA), qtd: 3 },
    mesa: true,
    categoria: 'decoracao',
  },
  {
    // spec 013: porteira do curral (gravetos nas pontas, tábuas no meio, como a cerca)
    id: 'porteira',
    forma: ['GTG', 'GTG'],
    chaves: { T: '#tabuas', G: 'graveto' },
    resultado: { item: b(Bloco.PORTEIRA), qtd: 1 },
    mesa: true,
    categoria: 'decoracao',
  },
  {
    id: 'porta',
    forma: ['TT', 'TT', 'TT'],
    chaves: { T: '#tabuas' },
    resultado: { item: b(Bloco.PORTA), qtd: 3 },
    mesa: true,
    categoria: 'decoracao',
  },
  // spec 039: os móveis da casa (as receitas do estudo, seção 8), todos na mesa de trabalho; a
  // forma da grade lembra o móvel. A cama mantém a de hoje e passa para a "casa"
  {
    id: 'cama',
    forma: ['LLL', 'TTT'],
    chaves: { L: '#la', T: '#tabuas' },
    resultado: { item: b(Bloco.CAMA), qtd: 1 },
    mesa: true,
    categoria: 'casa',
  },
  {
    // os braços e o assento de lã na base de madeira
    id: 'sofa',
    forma: ['L L', 'LLL', 'TTT'],
    chaves: { L: '#la', T: '#tabuas' },
    resultado: { item: b(Bloco.SOFA), qtd: 1 },
    mesa: true,
    categoria: 'casa',
  },
  {
    // a cadeira de lado: o encosto, o assento e os pés
    id: 'cadeira',
    forma: ['T  ', 'TTT', 'T T'],
    chaves: { T: '#tabuas' },
    resultado: { item: b(Bloco.CADEIRA), qtd: 1 },
    mesa: true,
    categoria: 'casa',
  },
  {
    // uma fileira de lã, rente como o tapete
    id: 'tapete',
    forma: ['LLL'],
    chaves: { L: '#la' },
    resultado: { item: b(Bloco.TAPETE), qtd: 1 },
    mesa: true,
    categoria: 'casa',
  },
  {
    // a cúpula de lã, a luz (a tocha) e o pé
    id: 'abajur',
    forma: ['L', 'A', 'T'],
    chaves: { L: '#la', A: b(Bloco.TOCHA), T: '#tabuas' },
    resultado: { item: b(Bloco.ABAJUR), qtd: 1 },
    mesa: true,
    categoria: 'casa',
  },
  {
    // um baú pequeno com o tampo
    id: 'criado_mudo',
    forma: ['T', 'B'],
    chaves: { T: '#tabuas', B: b(Bloco.BAU) },
    resultado: { item: b(Bloco.CRIADO_MUDO), qtd: 1 },
    mesa: true,
    categoria: 'casa',
  },
  {
    // dois baús em pé, as duas portas
    id: 'guarda_roupa',
    forma: ['TT', 'BB', 'TT'],
    chaves: { T: '#tabuas', B: b(Bloco.BAU) },
    resultado: { item: b(Bloco.GUARDA_ROUPA), qtd: 1 },
    mesa: true,
    categoria: 'casa',
  },
  {
    // a torneira de ferro (de verdade: só depois da primeira caverna) em cima da bancada de pedra
    id: 'pia',
    forma: [' F ', 'PPP'],
    chaves: { F: 'lingote_ferro', P: '#pedra' },
    resultado: { item: b(Bloco.PIA), qtd: 1 },
    mesa: true,
    categoria: 'casa',
  },
  // spec 039b: a parte 2 (o estudo, seção 8); a geladeira, o fogão, a TV e o som pedem ferro de
  // verdade (decisão do dono)
  {
    // o baú de guardar no ferro
    id: 'geladeira',
    forma: ['FF', 'FB', 'FF'],
    chaves: { F: 'lingote_ferro', B: b(Bloco.BAU) },
    resultado: { item: b(Bloco.GELADEIRA), qtd: 1 },
    mesa: true,
    categoria: 'casa',
  },
  {
    // a fornalha (que já cozinha) no ferro
    id: 'fogao',
    forma: ['FFF', 'FAF'],
    chaves: { F: 'lingote_ferro', A: b(Bloco.FORNALHA) },
    resultado: { item: b(Bloco.FOGAO), qtd: 1 },
    mesa: true,
    categoria: 'casa',
  },
  {
    // o tampo de tábua e os pés de graveto (a "mesa" é a de trabalho: esta é a da casa)
    id: 'mesa_casa',
    forma: ['TTT', 'G G'],
    chaves: { T: '#tabuas', G: 'graveto' },
    resultado: { item: b(Bloco.MESA), qtd: 1 },
    mesa: true,
    categoria: 'casa',
  },
  {
    // a tela de vidro com moldura no rack de madeira
    id: 'tv',
    forma: ['FVF', 'TTT'],
    chaves: { F: 'lingote_ferro', V: b(Bloco.VIDRO), T: '#tabuas' },
    resultado: { item: b(Bloco.TV), qtd: 1 },
    mesa: true,
    categoria: 'casa',
  },
  {
    // os dois alto-falantes de ferro na caixa de madeira
    id: 'som',
    forma: ['TFT', 'TFT'],
    chaves: { T: '#tabuas', F: 'lingote_ferro' },
    resultado: { item: b(Bloco.SOM), qtd: 1 },
    mesa: true,
    categoria: 'casa',
  },
  {
    id: 'ensopado',
    ingredientes: [b(Bloco.COGUMELO_BRILHANTE), b(Bloco.COGUMELO_BRILHANTE), '#tabuas'],
    resultado: { item: 'ensopado', qtd: 1 },
    categoria: 'comida',
  },
  {
    id: 'torta_abobora',
    ingredientes: [b(Bloco.ABOBORA), 'frutinhas', 'maca'],
    resultado: { item: 'torta_abobora', qtd: 1 },
    categoria: 'comida',
  },
  // spec 013: roça
  {
    id: 'pao',
    forma: ['TTT'],
    chaves: { T: 'trigo' },
    resultado: { item: 'pao', qtd: 1 },
    mesa: true,
    categoria: 'comida',
  },
  {
    id: 'feno',
    forma: ['TTT', 'TTT', 'TTT'],
    chaves: { T: 'trigo' },
    resultado: { item: b(Bloco.FENO), qtd: 1 },
    mesa: true,
    categoria: 'blocos',
  },
  {
    id: 'trigo_de_feno',
    ingredientes: [b(Bloco.FENO)],
    resultado: { item: 'trigo', qtd: 9 },
    categoria: 'materiais',
  },
  {
    id: 'sementes_abobora',
    ingredientes: [b(Bloco.ABOBORA)],
    resultado: { item: 'semente_abobora', qtd: 4 },
    categoria: 'materiais',
  },
  ...ferramentas(),
];

TAGS['#la'] = [
  b(Bloco.LA_BRANCA),
  b(Bloco.LA_VERMELHA),
  b(Bloco.LA_LARANJA),
  b(Bloco.LA_AMARELA),
  b(Bloco.LA_VERDE),
  b(Bloco.LA_AZUL),
  b(Bloco.LA_ROXA),
  b(Bloco.LA_PRETA),
];

/**
 * Spec 039: a categoria de um item, para as abas do catálogo do criativo (as mesmas do livro):
 * a da receita que o faz; o item sem receita vai para a do seu tipo, por esta tabela (o móvel na
 * "casa", o bloco que ilumina na "luz", a planta na "decoração").
 */
const CATEGORIA_DO_TIPO: Readonly<Record<DefItem['tipo'], CategoriaReceita>> = {
  bloco: 'blocos',
  ferramenta: 'ferramentas',
  comida: 'comida',
  material: 'materiais',
};
let categoriaDaReceita: Map<string, CategoriaReceita> | null = null;
export function categoriaDoItem(def: DefItem): CategoriaReceita {
  if (!categoriaDaReceita) {
    categoriaDaReceita = new Map();
    for (const r of RECEITAS)
      if (!categoriaDaReceita.has(r.resultado.item))
        categoriaDaReceita.set(r.resultado.item, r.categoria);
  }
  const daReceita = categoriaDaReceita.get(def.id);
  if (daReceita) return daReceita;
  if (def.bloco !== undefined) {
    const bl = obterBloco(def.bloco);
    if (bl?.forma === 'movel' || bl?.forma === 'cama') return 'casa';
    if ((bl?.luz ?? 0) > 0) return 'luz';
    if (bl?.planta) return 'decoracao';
  }
  return CATEGORIA_DO_TIPO[def.tipo] ?? 'materiais';
}

export function aceita(chave: string, item: string | undefined): boolean {
  if (!item) return false;
  if (chave.startsWith('#')) return TAGS[chave]?.includes(item) ?? false;
  return chave === item;
}

export type Grade = (Pilha | null)[];

/** Recorta a grade (lado x lado) no menor retângulo com itens. */
function recortar(
  grade: Grade,
  lado: number,
): { w: number; h: number; itens: (string | null)[] } | null {
  let x0 = lado;
  let y0 = lado;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < lado; y++)
    for (let x = 0; x < lado; x++)
      if (grade[y * lado + x]) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  if (x1 < 0) return null;
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const itens: (string | null)[] = [];
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) itens.push(grade[y * lado + x]?.item ?? null);
  return { w, h, itens };
}

function casaForma(
  r: Receita,
  rec: { w: number; h: number; itens: (string | null)[] },
  espelhar: boolean,
): boolean {
  const forma = r.forma!;
  const h = forma.length;
  const w = Math.max(...forma.map((l) => l.length));
  if (w !== rec.w || h !== rec.h) return false;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const ch = forma[y][espelhar ? w - 1 - x : x] ?? ' ';
      const item = rec.itens[y * w + x];
      if (ch === ' ') {
        if (item) return false;
      } else if (!aceita(r.chaves![ch], item ?? undefined)) return false;
    }
  return true;
}

function casaSemForma(r: Receita, grade: Grade): boolean {
  const itens = grade.filter((p): p is Pilha => !!p).map((p) => p.item);
  const pedidos = [...r.ingredientes!];
  if (itens.length !== pedidos.length) return false;
  for (const it of itens) {
    const i = pedidos.findIndex((c) => aceita(c, it));
    if (i < 0) return false;
    pedidos.splice(i, 1);
  }
  return true;
}

/** Receita que casa com a grade (2x2 no inventário ou 3x3 na mesa). */
export function encontrarReceita(grade: Grade, lado: 2 | 3): Receita | null {
  const rec = recortar(grade, lado);
  if (!rec) return null;
  for (const r of RECEITAS) {
    if (r.mesa && lado < 3) continue;
    if (r.forma) {
      if (casaForma(r, rec, false) || casaForma(r, rec, true)) return r;
    } else if (casaSemForma(r, grade)) return r;
  }
  return null;
}

/** Consome um de cada slot ocupado da grade (após pegar o resultado). */
export function consumirGrade(grade: Grade): Grade {
  return grade.map((p) => (p && p.qtd > 1 ? { ...p, qtd: p.qtd - 1 } : null));
}

/** Quantos de cada ingrediente a receita pede (tags resolvidas pelo que há no inventário). */
export function ingredientesDe(r: Receita): string[] {
  if (r.ingredientes) return [...r.ingredientes];
  const out: string[] = [];
  for (const linha of r.forma!) for (const ch of linha) if (ch !== ' ') out.push(r.chaves![ch]);
  return out;
}

/** Diz se o inventário tem o necessário para fazer a receita uma vez. */
export function podeFazer(r: Receita, contar: (item: string) => number): boolean {
  const precisa = new Map<string, number>();
  for (const c of ingredientesDe(r)) precisa.set(c, (precisa.get(c) ?? 0) + 1);
  for (const [c, n] of precisa) {
    const opcoes = c.startsWith('#') ? (TAGS[c] ?? []) : [c];
    const tem = opcoes.reduce((t, o) => t + contar(o), 0);
    if (tem < n) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Fornalha

export const FUNDICAO: Record<string, string> = {
  cobre_bruto: 'lingote_cobre',
  ferro_bruto: 'lingote_ferro',
  ouro_bruto: 'lingote_ouro',
  [b(Bloco.PEDREGULHO)]: b(Bloco.PEDRA_RACHADA),
  [b(Bloco.PEDRA_RACHADA)]: b(Bloco.PEDRA_LISA),
  [b(Bloco.AREIA_BRUMA)]: b(Bloco.VIDRO),
  [b(Bloco.AREIA_DESERTO)]: b(Bloco.VIDRO),
  [b(Bloco.LAMA)]: 'tijolo',
  [b(Bloco.MADEIRA_RETORCIDA)]: 'carvao',
  [b(Bloco.TRONCO_PINHO)]: 'carvao',
  [b(Bloco.TRONCO_BETULA)]: 'carvao',
  [b(Bloco.TRONCO_LANTERNA)]: 'carvao',
  carne_crua: 'carne_assada',
  peixe_cru: 'peixe_assado',
  milho: 'pipoca',
  ovo: 'ovo_cozido',
};

/** Segundos de queima de cada combustível. */
export const COMBUSTIVEL: Record<string, number> = {
  carvao: 80,
  [b(Bloco.BLOCO_LUZITA)]: 400,
  graveto: 5,
  [b(Bloco.TABUAS)]: 15,
  [b(Bloco.TABUAS_BETULA)]: 15,
  [b(Bloco.TABUAS_PINHO)]: 15,
  [b(Bloco.MADEIRA_RETORCIDA)]: 15,
  [b(Bloco.TRONCO_BETULA)]: 15,
  [b(Bloco.TRONCO_PINHO)]: 15,
  [b(Bloco.TRONCO_LANTERNA)]: 15,
};

export const TEMPO_FUNDIR = 8;
