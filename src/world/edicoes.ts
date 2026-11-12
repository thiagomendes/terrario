import { Bloco } from './blocks';
import { ALTURA, TAM_X, TAM_Z, gerarChunk, indice, metaGerada, metasGeradasDoChunk } from './chunk';

export type EdicoesExportadas = Record<string, Array<[number, number]>>;

/** Pessoas diferentes que podem ter blocos num mundo (fora o dono, que é o 0). */
export const MAX_DONOS = 4095;

/**
 * Valor guardado: bloco nos 8 bits de baixo, metadado (direção, estado) nos 8 seguintes e,
 * da spec 016, o dono (quem colocou) do bit 16 em diante: 0 é o dono do mundo (e o que
 * ninguém colocou), 1 em diante é a posição + 1 na tabela de donos do mundo. Quem só lê
 * bloco e metadado (o desenho, a física, versões antigas) ignora os bits do dono.
 */
export const empacotar = (bloco: number, meta = 0, dono = 0) =>
  ((bloco & 255) | ((meta & 255) << 8) | ((dono & MAX_DONOS) << 16)) >>> 0;
export const blocoDe = (v: number) => v & 255;
export const metaDe = (v: number) => (v >> 8) & 255;
/** Índice do dono no valor (0: o dono do mundo). */
export const indiceDonoDe = (v: number) => (v >>> 16) & MAX_DONOS;
/** Bloco e metadado, sem o dono (como era antes da spec 016). */
export const semDono = (v: number) => v & 65535;
/** Maior valor empacotado válido (bloco, metadado e dono). */
export const VALOR_MAXIMO = 65535 | (MAX_DONOS << 16);

/** Tabela de donos como é gravada e enviada: [id, apelido] na ordem dos índices (1, 2, ...). */
export type DonosExportados = Array<[string, string]>;
/** Entradas novas ou renomeadas da tabela: [índice, id, apelido] (o quadro manda só elas). */
export type DonosMudados = Array<[number, string, string]>;

export interface Edicoes {
  /**
   * Muda a célula. `dono` é o índice na tabela (0: o dono do mundo); sem ele, a célula
   * fica com o dono que já tinha (a porta que abre, a planta que cresce). Ar não tem dono.
   */
  definir(x: number, y: number, z: number, bloco: number, meta?: number, dono?: number): boolean;
  obter(x: number, y: number, z: number): number | undefined;
  /** Valor empacotado inteiro (com o dono), ou undefined se a célula nunca foi editada. */
  obterValor(x: number, y: number, z: number): number | undefined;
  /** Índice do dono da célula (0: o dono do mundo, ou sem edição). */
  indiceDono(x: number, y: number, z: number): number;
  /** Tabela de donos do mundo (quem colocou blocos, fora o dono do mundo). */
  readonly donos: TabelaDonos;
  /** Metadado da posição (0 se não houver). */
  obterMeta(x: number, y: number, z: number): number;
  versaoDoChunk(cx: number, cz: number): number;
  /** Sobe a cada edição em qualquer chunk (invalida caches de leitura). */
  readonly versaoGeral: number;
  doChunk(cx: number, cz: number): Array<[number, number]>;
  /** As edições do chunk sem cópia (índice local → valor empacotado), só para ler. */
  mapaDoChunk?(cx: number, cz: number): ReadonlyMap<number, number> | undefined;
  exportar(): EdicoesExportadas;
  importar(dados: EdicoesExportadas): void;
  /**
   * Spec 014 (T05): tira a edição da célula (volta o que a geração pôs). A obra feita do
   * canteiro passa a ser da geração e as edições das células dela saem.
   */
  remover?(x: number, y: number, z: number): boolean;
  /**
   * Spec 014 (T05): a geração do chunk mudou (obra feita, canteiro que abriu): sobe a versão
   * dele e a geral, para as memórias que leem o chunk (física, câmera) relerem.
   */
  tocar?(cx: number, cz: number): void;
}

function chave(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

/** Quem colocou blocos no mundo: o índice 1 é a primeira pessoa da lista, e assim por diante. */
export interface TabelaDonos {
  /** Id da pessoa do índice (undefined: 0 ou índice que não existe). */
  id(indice: number): string | undefined;
  /** Índice da pessoa (põe na tabela se ainda não está; 0 se a tabela encheu). */
  indice(id: string, apelido?: string): number;
  /** Índice da pessoa, sem pôr na tabela (0: não está). */
  procurar(id: string): number;
  /** Apelido guardado da pessoa (para o aviso "Essa parede é da Ana", mesmo com ela fora). */
  apelido(id: string): string | undefined;
  /** Troca o apelido guardado de quem já está na tabela (devolve se mudou). */
  renomear(id: string, apelido: string): boolean;
  /** Sobe a cada mudança (quem manda a tabela sabe quando mandar de novo). */
  readonly versao: number;
  readonly tamanho: number;
  /** A tabela encheu (MAX_DONOS): quem não está nela não ganha índice. */
  readonly cheia: boolean;
  exportar(): DonosExportados;
  importar(lista: DonosExportados | undefined): void;
  /** O que entrou ou mudou depois da versão `v` (o quadro manda só isso a quem já tem). */
  mudadasDesde(v: number): DonosMudados;
  /** Aplica as entradas mudadas (o cliente, com o que o núcleo mandou). */
  aplicar(mudadas: DonosMudados): void;
}

export function criarTabelaDonos(): TabelaDonos {
  let lista: DonosExportados = [];
  let porId = new Map<string, number>();
  let versao = 0;
  /** Versão em que cada entrada mudou por último (o mesmo índice da lista). */
  let mudouEm: number[] = [];
  return {
    id: (i) => (i >= 1 ? lista[i - 1]?.[0] : undefined),
    indice(id, apelido) {
      const ja = porId.get(id);
      if (ja !== undefined) return ja;
      if (lista.length >= MAX_DONOS) return 0;
      lista.push([id, apelido ?? '']);
      porId.set(id, lista.length);
      mudouEm.push(++versao);
      return lista.length;
    },
    procurar: (id) => porId.get(id) ?? 0,
    apelido(id) {
      const i = porId.get(id);
      return i === undefined ? undefined : lista[i - 1][1] || undefined;
    },
    renomear(id, apelido) {
      const i = porId.get(id);
      if (i === undefined || lista[i - 1][1] === apelido) return false;
      lista[i - 1] = [id, apelido];
      mudouEm[i - 1] = ++versao;
      return true;
    },
    get versao() {
      return versao;
    },
    get tamanho() {
      return lista.length;
    },
    get cheia() {
      return lista.length >= MAX_DONOS;
    },
    mudadasDesde(v) {
      const out: DonosMudados = [];
      for (let i = 0; i < lista.length; i++)
        if (mudouEm[i] > v) out.push([i + 1, lista[i][0], lista[i][1]]);
      return out;
    },
    aplicar(mudadas) {
      for (const [i, id, a] of mudadas) {
        if (!Number.isInteger(i) || i < 1 || i > MAX_DONOS) continue;
        while (lista.length < i) {
          lista.push(['', '']);
          mudouEm.push(versao);
        }
        const antes = lista[i - 1][0];
        if (antes && porId.get(antes) === i) porId.delete(antes);
        lista[i - 1] = [id, a];
        if (id && !porId.has(id)) porId.set(id, i);
        mudouEm[i - 1] = versao + 1;
      }
      if (mudadas.length) versao++;
    },
    exportar: () => lista.map(([id, a]) => [id, a] as [string, string]),
    importar(l) {
      lista = (l ?? []).slice(0, MAX_DONOS).map(([id, a]) => [id, a] as [string, string]);
      porId = new Map();
      // id vazio é lugar guardado (entrada que não servia): o índice vale o dono do mundo
      lista.forEach(([id], i) => {
        if (id && !porId.has(id)) porId.set(id, i + 1);
      });
      versao++;
      mudouEm = lista.map(() => versao);
    },
  };
}

/**
 * `semente`: com ela, a célula sem edição dá o metadado que a geração pôs (spec 014: a
 * direção dos degraus, portas e placas da cidade). Sem ela, 0, como sempre.
 */
export function criarEdicoes(semente?: number): Edicoes {
  const chunks = new Map<string, Map<number, number>>();
  const versoes = new Map<string, number>();
  const donos = criarTabelaDonos();

  function localizar(x: number, y: number, z: number) {
    const cx = Math.floor(x / TAM_X);
    const cz = Math.floor(z / TAM_Z);
    const lx = x - cx * TAM_X;
    const lz = z - cz * TAM_Z;
    return { cx, cz, chave: chave(cx, cz), i: indice(lx, y, lz) };
  }

  function valido(x: number, y: number, z: number): boolean {
    return (
      Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(z) && y >= 0 && y < ALTURA
    );
  }

  let geral = 0;
  return {
    donos,
    definir(x, y, z, bloco, meta = 0, dono) {
      if (!valido(x, y, z)) return false;
      if (y === 0 && bloco === Bloco.AR) return false;
      const p = localizar(x, y, z);
      let mapa = chunks.get(p.chave);
      if (!mapa) {
        mapa = new Map();
        chunks.set(p.chave, mapa);
      }
      // ar não tem dono; sem dono dito, fica o que a célula já tinha
      const d = (bloco & 255) === Bloco.AR ? 0 : (dono ?? indiceDonoDe(mapa.get(p.i) ?? 0));
      mapa.set(p.i, empacotar(bloco, meta, d));
      versoes.set(p.chave, (versoes.get(p.chave) ?? 0) + 1);
      geral++;
      return true;
    },
    obter(x, y, z) {
      if (!valido(x, y, z)) return undefined;
      const p = localizar(x, y, z);
      const v = chunks.get(p.chave)?.get(p.i);
      return v === undefined ? undefined : blocoDe(v);
    },
    obterValor(x, y, z) {
      if (!valido(x, y, z)) return undefined;
      const p = localizar(x, y, z);
      return chunks.get(p.chave)?.get(p.i);
    },
    indiceDono(x, y, z) {
      if (!valido(x, y, z)) return 0;
      const p = localizar(x, y, z);
      return indiceDonoDe(chunks.get(p.chave)?.get(p.i) ?? 0);
    },
    obterMeta(x, y, z) {
      if (!valido(x, y, z)) return 0;
      const p = localizar(x, y, z);
      const v = chunks.get(p.chave)?.get(p.i);
      if (v !== undefined) return metaDe(v);
      return semente === undefined ? 0 : metaGerada(x, y, z, semente);
    },
    get versaoGeral() {
      return geral;
    },
    versaoDoChunk(cx, cz) {
      return versoes.get(chave(cx, cz)) ?? 0;
    },
    doChunk(cx, cz) {
      const mapa = chunks.get(chave(cx, cz));
      return mapa ? Array.from(mapa.entries()) : [];
    },
    mapaDoChunk(cx, cz) {
      return chunks.get(chave(cx, cz));
    },
    remover(x, y, z) {
      if (!valido(x, y, z)) return false;
      const p = localizar(x, y, z);
      const mapa = chunks.get(p.chave);
      if (!mapa?.delete(p.i)) return false;
      if (mapa.size === 0) chunks.delete(p.chave);
      versoes.set(p.chave, (versoes.get(p.chave) ?? 0) + 1);
      geral++;
      return true;
    },
    tocar(cx, cz) {
      const k = chave(cx, cz);
      versoes.set(k, (versoes.get(k) ?? 0) + 1);
      geral++;
    },
    exportar() {
      const saida: EdicoesExportadas = {};
      for (const [k, mapa] of chunks) saida[k] = Array.from(mapa.entries());
      return saida;
    },
    importar(dados) {
      chunks.clear();
      for (const k of Object.keys(dados)) {
        chunks.set(k, new Map(dados[k]));
        versoes.set(k, (versoes.get(k) ?? 0) + 1);
      }
      geral++;
    },
  };
}

/**
 * Spec 016: quem colocou o bloco da célula, como o núcleo e o cliente perguntam (a mesma
 * conta nos dois). null: terreno natural, ar ou célula sem edição. Edição sem dono na
 * tabela (índice 0) é do dono do mundo. A proteção do que o mundo construiu (povoados, sítios) é outra regra, conferida
 * antes desta.
 */
export function donoNaCelula(
  edicoes: Edicoes,
  x: number,
  y: number,
  z: number,
  donoDoMundo: string | null,
): string | null {
  const v = edicoes.obterValor(x, y, z);
  if (v === undefined || blocoDe(v) === Bloco.AR) return null;
  const k = indiceDonoDe(v);
  return (k ? edicoes.donos.id(k) : undefined) || donoDoMundo;
}

export function gerarChunkEditado(
  cx: number,
  cz: number,
  semente: number,
  edicoes: Edicoes,
): Uint8Array {
  const blocos = gerarChunk(cx, cz, semente);
  for (const [i, v] of edicoes.doChunk(cx, cz)) blocos[i] = blocoDe(v);
  return blocos;
}

/**
 * Metadados do chunk (índice local → metadado): os que a geração deu (com a semente, spec
 * 014) e, por cima, os das edições (a célula editada fica com o dela, mesmo se for 0).
 */
export function metasDoChunk(
  cx: number,
  cz: number,
  edicoes: Edicoes,
  semente?: number,
): Map<number, number> {
  const m = new Map<number, number>(
    semente === undefined ? [] : metasGeradasDoChunk(cx, cz, semente),
  );
  for (const [i, v] of edicoes.doChunk(cx, cz)) {
    if (metaDe(v)) m.set(i, metaDe(v));
    else m.delete(i);
  }
  return m;
}
