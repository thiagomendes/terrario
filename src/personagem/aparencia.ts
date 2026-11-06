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
  | 'coroa-flores';

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
  rotulo: string;
  larguraTronco: number;
  comprimentoPernas: number;
  opcoes: Omit<Aparencia, 'nome' | 'modelo'>;
}

export const MODELOS: Record<ModeloId, ModeloDef> = {
  andarilho: {
    id: 'andarilho',
    rotulo: 'Andarilho',
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
    rotulo: 'Herbolária',
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
    rotulo: 'Lanterneiro',
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
    rotulo: 'Musgueira',
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
    rotulo: 'Tecelã',
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
    rotulo: 'Ferreiro',
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
  return { ...aparenciaPadrao(modelo), nome: aparencia.nome };
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
  return {
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
