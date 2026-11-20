/**
 * Onde o servidor guarda as salas e os mundos.
 *
 * Um mundo vira algumas partes, cada uma comprimida:
 * - `mundo`: dados do mundo (semente, tema, modo, estilo) e o estado das coisas
 *   (dia, hora, clima, baús, fornalhas, criaturas, itens no chão);
 * - `regiao/<rx>,<rz>`: as edições de blocos de uma região de 8×8 chunks (só as que
 *   mudaram são regravadas);
 * - `jogador/<id>`: o que é de cada jogador neste mundo.
 * As salas (código → mundo, dono, permissões) ficam numa tabela.
 */
import type { MundoNuvem, EstadoSala } from '../../src/rede/protocolo';
import type { DadosJogador, PerfilJogador } from '../../src/nucleo/protocolo';

export interface Sala extends EstadoSala {
  mundoId: string;
  /** Resumo (hash) da chave do dono: só ele usa o painel. */
  chaveDono: string;
  criadoEm: number;
  acessadoEm: number;
  /** Expulsos pelo dono (não entram de novo). */
  expulsos?: string[];
  /**
   * Spec 016: o apelido do dono da última vez que ele entrou (com ele fora, os avisos da
   * sala dizem o nome dele, não "de um amigo").
   */
  apelidoDono?: string;
}

/**
 * Formato dos mundos guardados. Spec 016 (decisão do dono, 11 nov 2026): os mundos de antes
 * (sem dono nos blocos) não abrem mais; o Storage é limpo na publicação e o que sobrar é
 * ignorado.
 */
export const FORMATO_MUNDO = 2;

export interface MundoGuardado {
  /** Formato (FORMATO_MUNDO); os de antes da spec 016 não têm. */
  formato?: number;
  mundo: MundoNuvem;
  hora: number;
  extras: Record<string, unknown>;
}

export interface JogadorGuardado {
  /** Resumo (hash) da chave do aparelho: ninguém entra no lugar de outro. */
  chave: string;
  perfil: PerfilJogador;
  dados: DadosJogador;
  /** Diário e mapa (o núcleo não usa: vão e voltam com o cliente). */
  guardado?: unknown;
}

export interface Armazem {
  lerSala(codigo: string): Promise<Sala | null>;
  gravarSala(s: Sala): Promise<void>;
  apagarSala(codigo: string): Promise<void>;
  lerMundo(id: string): Promise<MundoGuardado | null>;
  gravarMundo(id: string, m: MundoGuardado): Promise<void>;
  /** Edições de blocos por região (chave "rx,rz" → edições exportadas dos chunks dela). */
  lerRegioes(id: string): Promise<Record<string, Record<string, Array<[number, number]>>>>;
  gravarRegiao(
    id: string,
    regiao: string,
    edicoes: Record<string, Array<[number, number]>>,
  ): Promise<void>;
  lerJogador(mundo: string, jogador: string): Promise<JogadorGuardado | null>;
  gravarJogador(mundo: string, jogador: string, j: JogadorGuardado): Promise<void>;
  /** Spec 034: os ids de todos os mundos guardados (as pastas `<id>/`). */
  listarMundos(): Promise<string[]>;
  /** Spec 034: todas as salas (código → mundo). */
  listarSalas(): Promise<Sala[]>;
  /** Spec 034: apaga a pasta inteira do mundo (mundo, regiões e jogadores); o que já não existe é ignorado. */
  apagarMundo(id: string): Promise<void>;
}

/** Armazém em memória (testes e servidor local de desenvolvimento). */
export function armazemMemoria(): Armazem & { gravacoes: number } {
  const salas = new Map<string, Sala>();
  const mundos = new Map<string, string>();
  const regioes = new Map<string, Map<string, string>>();
  const jogadores = new Map<string, string>();
  const copia = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
  const a = {
    gravacoes: 0,
    async lerSala(c: string) {
      return salas.has(c) ? copia(salas.get(c)!) : null;
    },
    async gravarSala(s: Sala) {
      salas.set(s.codigo, copia(s));
    },
    async apagarSala(c: string) {
      salas.delete(c);
    },
    async lerMundo(id: string) {
      const m = mundos.get(id);
      return m ? (JSON.parse(m) as MundoGuardado) : null;
    },
    async gravarMundo(id: string, m: MundoGuardado) {
      a.gravacoes++;
      mundos.set(id, JSON.stringify(m));
    },
    async lerRegioes(id: string) {
      const out: Record<string, Record<string, Array<[number, number]>>> = {};
      for (const [k, v] of regioes.get(id) ?? []) out[k] = JSON.parse(v);
      return out;
    },
    async gravarRegiao(id: string, r: string, e: Record<string, Array<[number, number]>>) {
      a.gravacoes++;
      let m = regioes.get(id);
      if (!m) regioes.set(id, (m = new Map()));
      m.set(r, JSON.stringify(e));
    },
    async lerJogador(mundo: string, j: string) {
      const v = jogadores.get(`${mundo}/${j}`);
      return v ? (JSON.parse(v) as JogadorGuardado) : null;
    },
    async gravarJogador(mundo: string, j: string, d: JogadorGuardado) {
      a.gravacoes++;
      jogadores.set(`${mundo}/${j}`, JSON.stringify(d));
    },
    async listarMundos() {
      const ids = new Set([...mundos.keys(), ...regioes.keys()]);
      for (const k of jogadores.keys()) ids.add(k.slice(0, k.indexOf('/')));
      return [...ids];
    },
    async listarSalas() {
      return [...salas.values()].map(copia);
    },
    async apagarMundo(id: string) {
      mundos.delete(id);
      regioes.delete(id);
      for (const k of [...jogadores.keys()]) if (k.startsWith(`${id}/`)) jogadores.delete(k);
    },
  };
  return a;
}

/** Região de 8×8 chunks de um chunk "cx,cz". */
export function regiaoDe(chaveChunk: string): string {
  const [cx, cz] = chaveChunk.split(',').map(Number);
  return `${Math.floor(cx / 8)},${Math.floor(cz / 8)}`;
}
