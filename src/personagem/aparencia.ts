export type ModeloId = 'andarilho' | 'herbolaria' | 'lanterneiro' | 'musgueira';
export type Acessorio = 'nenhum' | 'capuz' | 'lanterna';

export interface Aparencia {
  nome: string;
  modelo: ModeloId;
  pele: number;
  cabeloEstilo: number;
  cabeloCor: number;
  roupaEstilo: number;
  roupaCor: number;
  calcaCor: number;
  acessorio: Acessorio;
}

export const TAMANHO_MAXIMO_NOME = 16;

export const PALETAS = {
  pele: ['#f1c9a5', '#d9a679', '#b27b52', '#7d5236', '#4f3224'],
  cabelo: ['#1e1a22', '#4a3326', '#8a5a32', '#c9a45c', '#6d6f8f', '#9a4a5e'],
  roupa: ['#3b4a7a', '#5c3d7a', '#2f6b5a', '#8a4a2f', '#7a2f4a', '#4a5560'],
  calca: ['#2a2d3f', '#3a2f26', '#26403a', '#47475c'],
} as const;

export const ACESSORIOS: readonly Acessorio[] = ['nenhum', 'capuz', 'lanterna'];

export const ESTILOS_CABELO = 3;
export const ESTILOS_ROUPA = 3;

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
      pele: 1,
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
      pele: 2,
      cabeloEstilo: 1,
      cabeloCor: 3,
      roupaEstilo: 1,
      roupaCor: 2,
      calcaCor: 1,
      acessorio: 'capuz',
    },
  },
  lanterneiro: {
    id: 'lanterneiro',
    rotulo: 'Lanterneiro',
    larguraTronco: 0.56,
    comprimentoPernas: 0.62,
    opcoes: {
      pele: 3,
      cabeloEstilo: 2,
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
      pele: 0,
      cabeloEstilo: 1,
      cabeloCor: 5,
      roupaEstilo: 0,
      roupaCor: 4,
      calcaCor: 3,
      acessorio: 'nenhum',
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
