import type { EdicoesExportadas } from '../world/edicoes';

export type ModoJogo = 'criativo' | 'sobrevivencia';

export interface MetaMundo {
  id: string;
  nome: string;
  semente: number;
  modo: ModoJogo;
  criadoEm: number;
  jogadoEm: number;
  /** Miniatura JPEG (data URL) da última vez que o mundo foi salvo. */
  miniatura?: string;
  /** Tema visual do mundo (mundos antigos não têm: são Bruma e Luz). */
  tema?: string;
  /** Versão do mundo: 2 = criado já com povoados (mundos antigos não têm). */
  versao?: number;
  /** Levado para a nuvem: o código da sala (abrir o mundo leva até ela). */
  nuvem?: string;
}

export interface JogadorSalvo {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

export interface DadosMundo {
  versao: 1;
  edicoes: EdicoesExportadas;
  jogador: JogadorSalvo | null;
  hora: number;
  /** Estado de sistemas que chegam depois (inventário, vida, mapa...). */
  extras: Record<string, unknown>;
}

/** Armazém assíncrono de chave e valor (IndexedDB no navegador, memória nos testes). */
export interface ArmazemChaveValor {
  obter(chave: string): Promise<unknown>;
  gravar(chave: string, valor: unknown): Promise<void>;
  remover(chave: string): Promise<void>;
}

export const TAMANHO_MAXIMO_NOME_MUNDO = 32;
export const SEMENTE_PADRAO_MUNDO = 1337;
const CHAVE_INDICE = 'mundos';
const chaveDados = (id: string) => `mundo:${id}`;

export function armazemMemoria(): ArmazemChaveValor & { dados: Map<string, unknown> } {
  const dados = new Map<string, unknown>();
  return {
    dados,
    obter: async (k) => structuredClone(dados.get(k)),
    gravar: async (k, v) => {
      dados.set(k, structuredClone(v));
    },
    remover: async (k) => {
      dados.delete(k);
    },
  };
}

/** Semente a partir do texto digitado: número inteiro vira ele mesmo, texto vira hash. */
export function sementeDeTexto(texto: string, reserva: () => number): number {
  const t = texto.trim();
  if (t === '') return Math.floor(reserva() * 2147483647);
  if (/^-?\d+$/.test(t)) return Number(t) | 0;
  let h = 2166136261;
  for (const c of t) {
    h ^= c.codePointAt(0)!;
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}

export function limparNomeMundo(nome: unknown, padrao = 'Novo mundo'): string {
  if (typeof nome !== 'string') return padrao;
  const n = nome.trim().replace(/\s+/g, ' ').slice(0, TAMANHO_MAXIMO_NOME_MUNDO).trim();
  return n || padrao;
}

export function dadosVazios(): DadosMundo {
  return { versao: 1, edicoes: {}, jogador: null, hora: -1, extras: {} };
}

/** Normaliza dados lidos do armazém: tolera versões antigas e lixo. */
export function normalizarDados(bruto: unknown): DadosMundo {
  const base = dadosVazios();
  if (!bruto || typeof bruto !== 'object') return base;
  const o = bruto as Record<string, unknown>;
  const edicoes =
    o.edicoes && typeof o.edicoes === 'object' ? (o.edicoes as EdicoesExportadas) : {};
  const j = o.jogador as Record<string, unknown> | null | undefined;
  const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  const jogador =
    j && ['x', 'y', 'z', 'yaw', 'pitch'].every((k) => num(j[k]))
      ? {
          x: j.x as number,
          y: j.y as number,
          z: j.z as number,
          yaw: j.yaw as number,
          pitch: j.pitch as number,
        }
      : null;
  return {
    versao: 1,
    edicoes,
    jogador,
    hora: num(o.hora) ? (o.hora as number) : -1,
    extras: o.extras && typeof o.extras === 'object' ? (o.extras as Record<string, unknown>) : {},
  };
}

export interface RepositorioMundos {
  listar(): Promise<MetaMundo[]>;
  obter(id: string): Promise<MetaMundo | null>;
  criar(nome: string, semente: number, modo: ModoJogo, tema?: string): Promise<MetaMundo>;
  carregar(id: string): Promise<DadosMundo>;
  salvar(id: string, dados: DadosMundo, miniatura?: string): Promise<void>;
  renomear(id: string, nome: string): Promise<void>;
  excluir(id: string): Promise<void>;
  /** Mundo jogado mais recentemente, ou null. */
  ultimo(): Promise<MetaMundo | null>;
  /** O mundo foi para a nuvem (ou o código mudou). */
  marcarNuvem(id: string, codigo: string): Promise<void>;
}

export function criarRepositorioMundos(
  armazem: ArmazemChaveValor,
  agora: () => number = () => Date.now(),
): RepositorioMundos {
  async function indice(): Promise<MetaMundo[]> {
    const v = await armazem.obter(CHAVE_INDICE);
    return Array.isArray(v) ? (v as MetaMundo[]).filter((m) => m && typeof m.id === 'string') : [];
  }
  async function gravarIndice(lista: MetaMundo[]): Promise<void> {
    await armazem.gravar(CHAVE_INDICE, lista);
  }
  async function atualizar(id: string, f: (m: MetaMundo) => void): Promise<void> {
    const lista = await indice();
    const m = lista.find((x) => x.id === id);
    if (!m) return;
    f(m);
    await gravarIndice(lista);
  }
  let contador = 0;
  const repo: RepositorioMundos = {
    async listar() {
      return (await indice()).sort((a, b) => b.jogadoEm - a.jogadoEm);
    },
    async obter(id) {
      return (await indice()).find((m) => m.id === id) ?? null;
    },
    async criar(nome, semente, modo, tema) {
      const lista = await indice();
      const t = agora();
      const id = `${t.toString(36)}${(contador++).toString(36)}${lista.length.toString(36)}`;
      const meta: MetaMundo = {
        id,
        nome: limparNomeMundo(nome),
        semente: semente | 0,
        modo: modo === 'sobrevivencia' ? 'sobrevivencia' : 'criativo',
        criadoEm: t,
        jogadoEm: t,
        versao: 2,
      };
      if (tema) meta.tema = tema;
      lista.push(meta);
      await gravarIndice(lista);
      await armazem.gravar(chaveDados(id), dadosVazios());
      return meta;
    },
    async carregar(id) {
      return normalizarDados(await armazem.obter(chaveDados(id)));
    },
    async salvar(id, dados, miniatura) {
      await armazem.gravar(chaveDados(id), dados);
      await atualizar(id, (m) => {
        m.jogadoEm = agora();
        if (miniatura) m.miniatura = miniatura;
      });
    },
    async renomear(id, nome) {
      await atualizar(id, (m) => {
        m.nome = limparNomeMundo(nome, m.nome);
      });
    },
    async excluir(id) {
      await gravarIndice((await indice()).filter((m) => m.id !== id));
      await armazem.remover(chaveDados(id));
    },
    async ultimo() {
      return (await repo.listar())[0] ?? null;
    },
    async marcarNuvem(id, codigo) {
      await atualizar(id, (m) => {
        m.nuvem = codigo;
        m.jogadoEm = agora();
      });
    },
  };
  return repo;
}
