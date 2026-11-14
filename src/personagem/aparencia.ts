import { CATEGORIAS_PREMIUM, premiumPorId, type CategoriaPremium } from '../jogo/alma';
import {
  fantasiaPorId,
  normalizarFantasia,
  type FantasiaVestida,
  type TipoPeca,
} from './fantasias';

export type ModeloId =
  | 'andarilho'
  | 'herbolaria'
  | 'lanterneiro'
  | 'musgueira'
  | 'exploradora'
  | 'tecela'
  | 'ferreiro';
export type Acessorio =
  | 'nenhum'
  | 'capuz'
  | 'lanterna'
  | 'chapeu'
  | 'mochila'
  | 'cachecol'
  | 'oculos'
  | 'capacete'
  | 'chapeu-explorador'
  | 'avental'
  | 'touca-chef'
  | 'coroa-flores'
  | 'chapeu-palha';

/** Base do corpo: muda proporções, rosto e caimento de cabelo e roupa. */
export type Corpo = 'feminino' | 'masculino';
export const CORPOS: readonly Corpo[] = ['feminino', 'masculino'];

export interface Aparencia {
  nome: string;
  modelo: ModeloId;
  corpo: Corpo;
  pele: number;
  /** Traços do rosto (cílios e lábios, sardas, barba, bigode). */
  rosto: number;
  cabeloEstilo: number;
  cabeloCor: number;
  roupaEstilo: number;
  roupaCor: number;
  calcaCor: number;
  acessorio: Acessorio;
  /**
   * Spec 017: fantasia vestida por cima do look (camada). Roupa, calça e enfeite acima
   * continuam guardados como estavam: tirar a fantasia é só apagar este campo.
   */
  fantasia?: FantasiaVestida;
  /**
   * Spec 014: peças ganhas no canteiro da cidade (capacete, colete). Ficam com o personagem,
   * valem em qualquer mundo e nunca vão pela rede (ver `semDesbloqueios`). Sem nenhuma, o
   * campo não existe (as aparências de antes saem iguais).
   */
  desbloqueios?: IdDesbloqueio[];
  /**
   * Spec 023 (T10): os premium vestidos (uma peça por categoria, ids do catálogo da lojinha).
   * Vão pela rede como a fantasia: cada aparelho desenha o mesmo nos amigos. O que a criança
   * comprou mora no perfil dela (`terrario:alma-crianca`); aqui só o que está vestido. Sem
   * nenhum, o campo não existe (as aparências de antes saem iguais).
   */
  premium?: PremiumVestido;
  /**
   * Spec 023 (T09): presentes de nível que os amigos veem. A etiqueta do nome colorida (nível
   * 2) ou com estrela (nível 7) e o balão com estrelinha (nível 6). O aparelho põe quando a
   * criança chega ao nível; sem nenhum, os campos não existem.
   */
  etiqueta?: 'cor' | 'estrela';
  balao?: 'estrela';
}

/** Spec 023: o premium vestido de cada categoria (roupa, costas, fantasia e bicho). */
export type PremiumVestido = Partial<Record<CategoriaPremium, string>>;

/** Só ids do catálogo, cada um na categoria dele (um por categoria). Nenhum: undefined. */
export function normalizarPremium(valor: unknown): PremiumVestido | undefined {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return undefined;
  const v = valor as Record<string, unknown>;
  const out: PremiumVestido = {};
  for (const cat of CATEGORIAS_PREMIUM) {
    const id = v[cat];
    if (typeof id === 'string' && premiumPorId(id)?.categoria === cat) out[cat] = id;
  }
  return Object.keys(out).length ? out : undefined;
}

/** O premium vestido daquela categoria (ou undefined). */
export function premiumVestido(
  a: Pick<Aparencia, 'premium'>,
  cat: CategoriaPremium,
): string | undefined {
  return a.premium?.[cat];
}

/**
 * O que se ganha nas missões (ids das fantasias que liberam): o canteiro da cidade (spec 014)
 * e as missões do Rancho Alegre (spec 023: a Caipira da festa e o Peão campeão).
 */
export const DESBLOQUEIOS = ['capacete-obra', 'colete-obra', 'caipira', 'peao-campeao'] as const;
export type IdDesbloqueio = (typeof DESBLOQUEIOS)[number];
/** Teto da lista guardada (sobra espaço para os próximos prêmios; spec 023: 16 → 32). */
export const MAXIMO_DESBLOQUEIOS = 32;

export function ehDesbloqueio(valor: unknown): valor is IdDesbloqueio {
  return typeof valor === 'string' && (DESBLOQUEIOS as readonly string[]).includes(valor);
}

/** Só os ids conhecidos, sem repetir, até o teto. */
function limparDesbloqueios(valor: unknown): IdDesbloqueio[] {
  if (!Array.isArray(valor)) return [];
  const lista: IdDesbloqueio[] = [];
  for (const v of valor) {
    if (lista.length >= MAXIMO_DESBLOQUEIOS) break;
    if (ehDesbloqueio(v) && !lista.includes(v)) lista.push(v);
  }
  return lista;
}

export const TAMANHO_MAXIMO_NOME = 16;

/**
 * Paletas: cores novas entram sempre no fim (os índices salvos não mudam);
 * a interface ordena as amostras de pele por claridade.
 */
export const PALETAS = {
  pele: [
    '#f1c9a5',
    '#d9a679',
    '#b27b52',
    '#7d5236',
    '#4f3224',
    '#fbe0c8',
    '#e8bb92',
    '#c99064',
    '#9a6844',
    '#3a241a',
  ],
  cabelo: [
    '#1e1a22',
    '#4a3326',
    '#8a5a32',
    '#c9a45c',
    '#6d6f8f',
    '#9a4a5e',
    '#e8d8b0',
    '#b8b8c0',
    '#d06a28',
    '#2a4a7a',
    '#3d6b3a',
    '#6a3a8a',
  ],
  roupa: [
    '#3b4a7a',
    '#5c3d7a',
    '#2f6b5a',
    '#8a4a2f',
    '#7a2f4a',
    '#4a5560',
    '#c9a03a',
    '#d8d0c0',
    '#1e1e24',
    '#2f6f8f',
    '#a03a2a',
    '#5a7a2a',
  ],
  calca: ['#2a2d3f', '#3a2f26', '#26403a', '#47475c', '#5a4a3a', '#2e3a5a', '#6a6a72', '#1a1a1e'],
} as const;

export const ACESSORIOS: readonly Acessorio[] = [
  'nenhum',
  'capuz',
  'lanterna',
  'chapeu',
  'mochila',
  'cachecol',
  'oculos',
  'capacete',
  'chapeu-explorador',
  'avental',
  'touca-chef',
  'coroa-flores',
  'chapeu-palha',
];

/**
 * Curto, franja de lado, longo liso, raspado, cacheado volumoso, rabo de cavalo alto,
 * coque, tranças, chanel. Os longos são uma casca que cai pelos ombros.
 */
export const ESTILOS_CABELO = 9;
/** Cortes que descem abaixo da cabeça (casca com abertura para o rosto). */
export const CABELOS_LONGOS: Record<number, number> = { 2: 0.36, 4: 0.1, 7: 0.3, 8: 0.06 };
/** Clássico, cílios e lábios, sardas, cílios com sardas, barba, bigode. */
export const ESTILOS_ROSTO = 6;
/** Túnica, avental, jaqueta, listrada, colete, bandoleira, vestido, blusa e saia, vestido longo. */
export const ESTILOS_ROUPA = 9;
/** Comprimento da saia (fração da perna) dos estilos com saia. */
export const SAIAS: Record<number, number> = { 6: 0.5, 7: 0.45, 8: 0.86 };

export interface ModeloDef {
  id: ModeloId;
  /** Nome do modelo na forma do corpo padrão dele. */
  rotulo: string;
  /** Nome nas duas formas: acompanha o corpo escolhido (spec 012, A5). */
  rotulos: { feminino: string; masculino: string };
  larguraTronco: number;
  comprimentoPernas: number;
  opcoes: Omit<Aparencia, 'nome' | 'modelo'>;
}

export const MODELOS: Record<ModeloId, ModeloDef> = {
  andarilho: {
    id: 'andarilho',
    rotulo: 'Aventureiro',
    rotulos: { feminino: 'Aventureira', masculino: 'Aventureiro' },
    larguraTronco: 0.5,
    comprimentoPernas: 0.7,
    opcoes: {
      corpo: 'masculino',
      pele: 1,
      rosto: 0,
      cabeloEstilo: 0,
      cabeloCor: 1,
      roupaEstilo: 0,
      roupaCor: 0,
      calcaCor: 0,
      acessorio: 'nenhum',
    },
  },
  herbolaria: {
    id: 'herbolaria',
    rotulo: 'Jardineira',
    rotulos: { feminino: 'Jardineira', masculino: 'Jardineiro' },
    larguraTronco: 0.44,
    comprimentoPernas: 0.66,
    opcoes: {
      corpo: 'feminino',
      pele: 2,
      rosto: 0,
      cabeloEstilo: 2,
      cabeloCor: 3,
      roupaEstilo: 6,
      roupaCor: 2,
      calcaCor: 1,
      acessorio: 'nenhum',
    },
  },
  lanterneiro: {
    id: 'lanterneiro',
    rotulo: 'Inventor',
    rotulos: { feminino: 'Inventora', masculino: 'Inventor' },
    larguraTronco: 0.56,
    comprimentoPernas: 0.62,
    opcoes: {
      corpo: 'masculino',
      pele: 3,
      rosto: 4,
      cabeloEstilo: 1,
      cabeloCor: 0,
      roupaEstilo: 2,
      roupaCor: 3,
      calcaCor: 2,
      acessorio: 'lanterna',
    },
  },
  musgueira: {
    id: 'musgueira',
    rotulo: 'Cientista',
    rotulos: { feminino: 'Cientista', masculino: 'Cientista' },
    larguraTronco: 0.48,
    comprimentoPernas: 0.74,
    opcoes: {
      corpo: 'feminino',
      pele: 0,
      rosto: 2,
      cabeloEstilo: 7,
      cabeloCor: 5,
      roupaEstilo: 7,
      roupaCor: 4,
      calcaCor: 3,
      acessorio: 'nenhum',
    },
  },
  exploradora: {
    id: 'exploradora',
    rotulo: 'Exploradora',
    rotulos: { feminino: 'Exploradora', masculino: 'Explorador' },
    larguraTronco: 0.46,
    comprimentoPernas: 0.72,
    opcoes: {
      corpo: 'feminino',
      pele: 8,
      rosto: 0,
      cabeloEstilo: 5,
      cabeloCor: 8,
      roupaEstilo: 5,
      roupaCor: 6,
      calcaCor: 4,
      acessorio: 'mochila',
    },
  },
  tecela: {
    id: 'tecela',
    rotulo: 'Artista',
    rotulos: { feminino: 'Artista', masculino: 'Artista' },
    larguraTronco: 0.44,
    comprimentoPernas: 0.7,
    opcoes: {
      corpo: 'feminino',
      pele: 4,
      rosto: 0,
      cabeloEstilo: 6,
      cabeloCor: 0,
      roupaEstilo: 8,
      roupaCor: 10,
      calcaCor: 5,
      acessorio: 'cachecol',
    },
  },
  ferreiro: {
    id: 'ferreiro',
    rotulo: 'Construtor',
    rotulos: { feminino: 'Construtora', masculino: 'Construtor' },
    larguraTronco: 0.58,
    comprimentoPernas: 0.64,
    opcoes: {
      corpo: 'masculino',
      pele: 6,
      rosto: 5,
      cabeloEstilo: 3,
      cabeloCor: 7,
      roupaEstilo: 1,
      roupaCor: 8,
      calcaCor: 1,
      acessorio: 'oculos',
    },
  },
};

export const IDS_MODELOS = Object.keys(MODELOS) as ModeloId[];

export function ehModeloId(valor: unknown): valor is ModeloId {
  return typeof valor === 'string' && Object.prototype.hasOwnProperty.call(MODELOS, valor);
}

export function aparenciaPadrao(modelo: ModeloId = 'andarilho'): Aparencia {
  const id = ehModeloId(modelo) ? modelo : 'andarilho';
  return { nome: '', modelo: id, ...MODELOS[id].opcoes };
}

export function aplicarModelo(aparencia: Aparencia, modelo: ModeloId): Aparencia {
  const a: Aparencia = { ...aparenciaPadrao(modelo), nome: aparencia.nome };
  // outro modelo pronto é um look novo, mas o que a criança ganhou continua com ela
  if (aparencia.desbloqueios?.length) a.desbloqueios = [...aparencia.desbloqueios];
  if (aparencia.premium) a.premium = { ...aparencia.premium };
  if (aparencia.etiqueta) a.etiqueta = aparencia.etiqueta;
  if (aparencia.balao) a.balao = aparencia.balao;
  return a;
}

function limparNome(valor: unknown): string {
  if (typeof valor !== 'string') return '';
  return valor.trim().slice(0, TAMANHO_MAXIMO_NOME).trim();
}

function indice(valor: unknown, tamanho: number, padrao: number): number {
  const ok = typeof valor === 'number' && Number.isInteger(valor) && valor >= 0 && valor < tamanho;
  return ok ? valor : padrao;
}

export function normalizarAparencia(entrada: unknown): Aparencia {
  const obj: Record<string, unknown> =
    typeof entrada === 'object' && entrada !== null ? (entrada as Record<string, unknown>) : {};
  const base = aparenciaPadrao(ehModeloId(obj.modelo) ? obj.modelo : 'andarilho');
  const a: Aparencia = {
    nome: limparNome(obj.nome),
    modelo: base.modelo,
    pele: indice(obj.pele, PALETAS.pele.length, base.pele),
    corpo: CORPOS.includes(obj.corpo as Corpo) ? (obj.corpo as Corpo) : base.corpo,
    rosto: indice(obj.rosto, ESTILOS_ROSTO, base.rosto),
    cabeloEstilo: indice(obj.cabeloEstilo, ESTILOS_CABELO, base.cabeloEstilo),
    cabeloCor: indice(obj.cabeloCor, PALETAS.cabelo.length, base.cabeloCor),
    roupaEstilo: indice(obj.roupaEstilo, ESTILOS_ROUPA, base.roupaEstilo),
    roupaCor: indice(obj.roupaCor, PALETAS.roupa.length, base.roupaCor),
    calcaCor: indice(obj.calcaCor, PALETAS.calca.length, base.calcaCor),
    acessorio: ACESSORIOS.includes(obj.acessorio as Acessorio)
      ? (obj.acessorio as Acessorio)
      : base.acessorio,
  };
  // aparências antigas (sem fantasia) saem iguais: o campo só existe quando há fantasia
  const fantasia = normalizarFantasia(obj.fantasia, a.corpo);
  if (fantasia) a.fantasia = fantasia;
  // spec 014: idem para os desbloqueios (só existe com algum)
  const desbloqueios = limparDesbloqueios(obj.desbloqueios);
  if (desbloqueios.length) a.desbloqueios = desbloqueios;
  // spec 023: idem para os premium vestidos
  const premium = normalizarPremium(obj.premium);
  if (premium) a.premium = premium;
  // spec 023 (T09): os presentes de nível que os amigos veem
  if (obj.etiqueta === 'cor' || obj.etiqueta === 'estrela') a.etiqueta = obj.etiqueta;
  if (obj.balao === 'estrela') a.balao = 'estrela';
  return a;
}

/** Spec 014: a criança já ganhou esta peça? */
export function temDesbloqueio(a: Pick<Aparencia, 'desbloqueios'>, id: string): boolean {
  return !!a.desbloqueios?.includes(id as IdDesbloqueio);
}

/** Spec 014: a aparência com mais uma peça ganha (id desconhecido ou repetido: igual). */
export function desbloquear(a: Aparencia, id: string): Aparencia {
  if (!ehDesbloqueio(id) || temDesbloqueio(a, id)) return a;
  return normalizarAparencia({ ...a, desbloqueios: [...(a.desbloqueios ?? []), id] });
}

/**
 * Spec 014: a aparência que vai pela rede (só o que está vestido). A lista do que a criança
 * ganhou fica no aparelho: o servidor não confere e os amigos não precisam saber.
 */
export function semDesbloqueios<T extends { desbloqueios?: unknown }>(
  a: T,
): Omit<T, 'desbloqueios'> {
  if (!('desbloqueios' in a)) return a as Omit<T, 'desbloqueios'>;
  const copia = { ...a };
  delete copia.desbloqueios;
  return copia;
}

/**
 * Troca a base do corpo já com um visual coerente: no feminino, cabelo comprido,
 * vestido e rosto sem barba; no masculino, cabelo curto e roupa sem saia.
 * Cores e acessório são mantidos.
 */
export function aplicarCorpo(a: Aparencia, corpo: Corpo): Aparencia {
  if (a.corpo === corpo) return a;
  if (corpo === 'feminino') {
    return {
      ...a,
      corpo,
      cabeloEstilo: [0, 1, 3].includes(a.cabeloEstilo) ? 2 : a.cabeloEstilo,
      roupaEstilo: SAIAS[a.roupaEstilo] ? a.roupaEstilo : 6,
      rosto: a.rosto >= 4 ? 0 : a.rosto,
    };
  }
  return {
    ...a,
    corpo,
    cabeloEstilo: [2, 6, 7, 8].includes(a.cabeloEstilo) ? 0 : a.cabeloEstilo,
    roupaEstilo: SAIAS[a.roupaEstilo] ? 0 : a.roupaEstilo,
  };
}

/** Nome do modelo na forma do corpo escolhido (Aventureiro, Aventureira). */
export function rotuloDoModelo(a: Pick<Aparencia, 'modelo' | 'corpo'>): string {
  const m = MODELOS[a.modelo];
  return a.corpo === 'feminino' ? m.rotulos.feminino : m.rotulos.masculino;
}

// ---------------------------------------------------------------------------
// Spec 017: vestir, trocar a cor, personalizar e tirar a fantasia.

/** Veste a fantasia com a cor padrão (ou a pedida). O look de baixo fica intacto. */
export function vestirFantasia(a: Aparencia, id: string, cor = 0): Aparencia {
  const def = fantasiaPorId(id);
  if (!def) return tirarFantasia(a);
  return { ...a, fantasia: { id: def.id, cor: cor >= 0 && cor < def.cores.length ? cor : 0 } };
}

/** Troca a cor principal (mantém as peças que a criança tirou). */
export function trocarCorDaFantasia(a: Aparencia, cor: number): Aparencia {
  if (!a.fantasia) return a;
  return normalizarAparencia({ ...a, fantasia: { ...a.fantasia, cor } });
}

/** Tira ou recoloca uma peça opcional da fantasia (capa, varinha, máscara...). */
export function alternarPecaDaFantasia(a: Aparencia, peca: TipoPeca): Aparencia {
  if (!a.fantasia) return a;
  const sem = a.fantasia.sem ?? [];
  const novo = sem.includes(peca) ? sem.filter((p) => p !== peca) : [...sem, peca];
  return normalizarAparencia({ ...a, fantasia: { ...a.fantasia, sem: novo } });
}

/** "Tirar fantasia": volta exatamente ao look de antes (que nunca foi mexido). */
export function tirarFantasia(a: Aparencia): Aparencia {
  if (!a.fantasia) return a;
  const antes = { ...a };
  delete antes.fantasia;
  return antes;
}

/** Campos que a fantasia cobre: mexer neles tira a fantasia. */
export const CAMPOS_DEBAIXO_DA_FANTASIA = [
  'roupaEstilo',
  'roupaCor',
  'calcaCor',
  'acessorio',
] as const;

/**
 * Personalizar peça por peça com a fantasia vestida (regra da T02):
 * - quem a criança é (nome, corpo, pele, rosto, cabelo) muda e a fantasia continua;
 * - roupa, calça e enfeite estão debaixo da fantasia: escolher um deles tira a fantasia e a
 *   peça escolhida entra no look de antes (assim a mudança aparece na hora);
 * - as peças da própria fantasia (capa, varinha...) se tiram com alternarPecaDaFantasia.
 */
export function personalizar(
  a: Aparencia,
  mudanca: Partial<Omit<Aparencia, 'fantasia'>>,
): Aparencia {
  const cobre = CAMPOS_DEBAIXO_DA_FANTASIA.some((c) => mudanca[c] !== undefined);
  const base = cobre ? tirarFantasia(a) : a;
  return normalizarAparencia({ ...base, ...mudanca });
}
