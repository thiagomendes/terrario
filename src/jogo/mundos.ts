import type { EdicoesExportadas } from '../world/edicoes';
import { TEMA_PADRAO } from '../temas';
import { TEMAS_QUE_SAIRAM } from '../temas/tipos';

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
  /**
   * Tema visual do mundo. Spec 034: todo mundo novo nasce com ele gravado; os antigos sem tema
   * eram do Bruma e Luz, que saiu do jogo (e são apagados ao abrir: `apagarTemasQueSairam`).
   */
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
/**
 * Formato dos mundos do aparelho. 2: spec 016 (o dono de cada bloco). Decisão do dono (11 nov
 * 2026): os mundos de antes não abrem mais e são apagados uma vez; o personagem e as
 * preferências (fora daqui, no localStorage) ficam.
 */
export const FORMATO_MUNDOS = 2;
const CHAVE_FORMATO = 'formato';
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
  /** O mundo voltou da nuvem para o aparelho (spec 011): deixa de ter código. */
  desmarcarNuvem(id: string): Promise<void>;
  /**
   * Spec 016: apaga os mundos de um formato antigo (só os mundos) e marca o formato de agora.
   * Devolve quantos mundos foram apagados (0 na maioria das vezes). Chamar antes de listar.
   */
  prepararFormato(): Promise<number>;
  /**
   * Spec 034: apaga os mundos dos quatro temas que saíram e os sem tema (que abriam como Bruma
   * e Luz), inclusive as entradas que apontam para a nuvem; tirados do índice primeiro, depois
   * os dados. Um tema desconhecido (nem dos quatro, nem dos cinco) fica. Não muda o formato.
   * Devolve os ids apagados. Chamar logo depois de `prepararFormato`.
   */
  apagarTemasQueSairam(): Promise<string[]>;
}

/**
 * O mundo que abre quando nenhum foi pedido (ou o pedido não existe mais, como o de um tema
 * que saiu): o mais recente do aparelho, ou o "Meu primeiro mundo", que nasce na Vila Neon.
 */
export async function mundoParaAbrir(repo: RepositorioMundos): Promise<MetaMundo> {
  const lista = await repo.listar();
  return (
    lista.find((m) => !m.nuvem) ??
    (await repo.criar('Meu primeiro mundo', SEMENTE_PADRAO_MUNDO, 'criativo', TEMA_PADRAO))
  );
}

/** Spec 034: o mundo é de um tema que saiu do jogo (ou não tem tema, e abria como Bruma). */
export function mundoDeTemaQueSaiu(m: Pick<MetaMundo, 'tema'>): boolean {
  return typeof m.tema !== 'string' || m.tema === '' || TEMAS_QUE_SAIRAM.includes(m.tema);
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
  /**
   * Spec 034 (T14): quem lê o índice para regravar entra numa fila, um por vez. Sem ela, o
   * salvar automático do mundo aberto (que lê o índice, espera e regrava) podia passar por
   * cima do mundo que a criança acabava de criar: o índice voltava sem ele, e a página nova,
   * sem achar o mundo pedido, abria o "Meu primeiro mundo" (era o que caía, às vezes, nos
   * testes de criar mundo; num aparelho lento pode acontecer de verdade).
   */
  let fila: Promise<unknown> = Promise.resolve();
  function emFila<T>(f: () => Promise<T>): Promise<T> {
    const p = fila.then(f, f);
    fila = p.catch(() => undefined);
    return p;
  }
  function atualizar(id: string, f: (m: MetaMundo) => void): Promise<void> {
    return emFila(async () => {
      const lista = await indice();
      const m = lista.find((x) => x.id === id);
      if (!m) return;
      f(m);
      await gravarIndice(lista);
    });
  }
  let contador = 0;
  const repo: RepositorioMundos = {
    async listar() {
      return (await indice()).sort((a, b) => b.jogadoEm - a.jogadoEm);
    },
    async obter(id) {
      return (await indice()).find((m) => m.id === id) ?? null;
    },
    criar: (nome, semente, modo, tema) =>
      emFila(async () => {
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
          // spec 034: todo mundo novo com o tema gravado (sem pedido, o padrão)
          tema: tema || TEMA_PADRAO,
        };
        lista.push(meta);
        // o primeiro mundo de um aparelho novo já nasce no formato de agora
        if ((await armazem.obter(CHAVE_FORMATO)) !== FORMATO_MUNDOS)
          await armazem.gravar(CHAVE_FORMATO, FORMATO_MUNDOS);
        await gravarIndice(lista);
        await armazem.gravar(chaveDados(id), dadosVazios());
        return meta;
      }),
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
      await emFila(async () => gravarIndice((await indice()).filter((m) => m.id !== id)));
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
    async desmarcarNuvem(id) {
      await atualizar(id, (m) => {
        delete m.nuvem;
        m.jogadoEm = agora();
      });
    },
    prepararFormato: () =>
      emFila(async () => {
        const formato = await armazem.obter(CHAVE_FORMATO);
        if (formato === FORMATO_MUNDOS) return 0;
        // índice inteiro, mesmo com lixo: cada mundo listado sai com os dados dele
        const bruto = await armazem.obter(CHAVE_INDICE);
        const lista = Array.isArray(bruto) ? (bruto as Partial<MetaMundo>[]) : [];
        let apagados = 0;
        for (const m of lista) {
          if (!m || typeof m.id !== 'string') continue;
          await armazem.remover(chaveDados(m.id));
          apagados++;
        }
        await armazem.remover(CHAVE_INDICE);
        await armazem.gravar(CHAVE_FORMATO, FORMATO_MUNDOS);
        return apagados;
      }),
    apagarTemasQueSairam: () =>
      emFila(async () => {
        const lista = await indice();
        const saem = lista.filter(mundoDeTemaQueSaiu).map((m) => m.id);
        if (!saem.length) return [];
        // o índice primeiro: se a página fechar no meio, nenhum mundo fica listado sem dados
        await gravarIndice(lista.filter((m) => !saem.includes(m.id)));
        for (const id of saem) await armazem.remover(chaveDados(id));
        return saem;
      }),
  };
  return repo;
}
