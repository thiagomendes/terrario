/**
 * Spec 029, etapa 1: as contas da página de medida (sem DOM, para os testes de unidade).
 * As medidas ficam no aparelho: viajam de uma rodada para a outra no fragmento do endereço
 * (#...), que o navegador nunca manda ao servidor.
 */

export type Rodada = 'webgl2' | 'webgpu' | 'snapshot';
export type Etapa = 'conferir' | Rodada;

export interface Resultado {
  ok: boolean;
  /** Por que não mediu (motor não abriu, cena não ficou pronta, a página caiu...). */
  erro?: string;
  /** Quadros por segundo na média da rodada. */
  fps?: number;
  /** Tempo entre quadros: mediana e percentil 95 (ms). */
  medianaMs?: number;
  p95Ms?: number;
  /** Processador por quadro (do começo ao fim do quadro do motor): média e mediana (ms). */
  cpuMs?: number;
  cpuMedianaMs?: number;
  quadros?: number;
  segundos?: number;
  /** Malhas ativas na média (o tamanho da cena). */
  ativas?: number;
  /** Erros que o Babylon registrou durante a rodada. */
  errosMotor?: number;
  /** Só no snapshot: quantas vezes a gravação recomeçou (a cena mudou). */
  recomecos?: number;
  /** Placa de vídeo que o motor viu. */
  placa?: string;
}

export interface Capacidade {
  webgpu: boolean;
  /** Sem WebGPU: o porquê, em palavras simples. */
  motivo?: string;
  /** O adaptador (fabricante, arquitetura), quando o navegador conta. */
  adaptador?: string;
}

/** O efeito escrito à mão e como ele foi no WebGPU. */
export type SituacaoEfeito = 'convertido' | 'desligado' | 'ausente' | 'fora';

export interface Sessao {
  v: 1;
  cap: Capacidade;
  /** Nível de resolução fixo das rodadas (o `?escala` do jogo). */
  escala: number;
  qualidade: string;
  segundos: number;
  /** Efeitos desligados nos dois modos porque não converteram. */
  desligados: string[];
  /** Erro de conversão de cada efeito (só os que falharam). */
  errosEfeito: Record<string, string>;
  /** Efeitos que apareceram e converteram. */
  convertidos: string[];
  res: Partial<Record<Rodada, Resultado>>;
  /** Etapa começada e não terminada (voltar a ela = a página caiu no meio). */
  andando?: Etapa;
}

/** Os efeitos escritos à mão em GLSL (a lista da spec). */
export const EFEITOS = [
  'materialMundo',
  'balanço',
  'formas',
  'água',
  'céu',
  'horizonte',
  'pós-processos',
  'fotoBoneco',
  'iconesBrinquedo',
  'modoFoto',
] as const;
export type Efeito = (typeof EFEITOS)[number];

/**
 * Os que não entram na cena medida: as carinhas (fotoBoneco) e os ícones (iconesBrinquedo)
 * têm motor WebGL próprio, fora da tela; o modo foto só liga quando a criança fotografa.
 */
export const EFEITOS_FORA: readonly Efeito[] = ['fotoBoneco', 'iconesBrinquedo', 'modoFoto'];

export function situacaoDoEfeito(s: Sessao, e: Efeito): SituacaoEfeito {
  if (EFEITOS_FORA.includes(e)) return 'fora';
  if (s.desligados.includes(e)) return 'desligado';
  if (s.convertidos.includes(e)) return 'convertido';
  return 'ausente';
}

/** As etapas na ordem: conferir a conversão, WebGL2, WebGPU e o snapshot (com WebGPU). */
export function etapas(cap: Capacidade): Etapa[] {
  return cap.webgpu ? ['conferir', 'webgl2', 'webgpu', 'snapshot'] : ['webgl2'];
}

/** A próxima etapa depois desta (null: acabou, mostrar o resultado). */
export function proximaEtapa(cap: Capacidade, atual: Etapa | null): Etapa | null {
  const lista = etapas(cap);
  if (atual === null) return lista[0];
  const i = lista.indexOf(atual);
  return i < 0 || i + 1 >= lista.length ? null : lista[i + 1];
}

const arred = (v: number, casas = 1) => Math.round(v * 10 ** casas) / 10 ** casas;

/** Valor no percentil p (0 a 1) de uma lista já ordenada. */
export function percentil(ordenados: readonly number[], p: number): number {
  if (!ordenados.length) return 0;
  const i = Math.min(ordenados.length - 1, Math.max(0, Math.ceil(p * ordenados.length) - 1));
  return ordenados[i];
}

/**
 * Resume a rodada: os intervalos entre quadros e o processador de cada quadro (ms), e o tempo
 * total medido (s).
 */
export function resumir(
  intervalos: readonly number[],
  cpu: readonly number[],
  segundos: number,
): Pick<
  Resultado,
  'fps' | 'medianaMs' | 'p95Ms' | 'cpuMs' | 'cpuMedianaMs' | 'quadros' | 'segundos'
> {
  const iv = [...intervalos].sort((a, b) => a - b);
  const c = [...cpu].sort((a, b) => a - b);
  const somaCpu = c.reduce((a, b) => a + b, 0);
  return {
    fps: segundos > 0 ? arred(intervalos.length / segundos) : 0,
    medianaMs: arred(percentil(iv, 0.5)),
    p95Ms: arred(percentil(iv, 0.95)),
    cpuMs: c.length ? arred(somaCpu / c.length, 2) : undefined,
    cpuMedianaMs: c.length ? arred(percentil(c, 0.5), 2) : undefined,
    quadros: intervalos.length,
    segundos: arred(segundos),
  };
}

/** Diferença em % de b sobre a (positivo: b maior). null sem os dois números. */
export function diferenca(a: number | undefined, b: number | undefined): number | null {
  if (a === undefined || b === undefined || !(a > 0)) return null;
  return Math.round(((b - a) / a) * 100);
}

/**
 * O critério da spec: o WebGPU ganha de forma clara com 15% ou mais de quadros, ou 15% ou
 * menos de processador por quadro (no celular a tela costuma travar em 60 quadros, e aí o
 * ganho aparece no processador).
 */
export function ganhouClaro(gl: Resultado | undefined, gpu: Resultado | undefined): boolean | null {
  if (!gl?.ok || !gpu?.ok) return null;
  const q = diferenca(gl.fps, gpu.fps);
  const c = diferenca(gl.cpuMs, gpu.cpuMs);
  if (q === null && c === null) return null;
  return (q !== null && q >= 15) || (c !== null && c <= -15);
}

export function novaSessao(
  cap: Capacidade,
  escala: number,
  qualidade: string,
  segundos: number,
): Sessao {
  return {
    v: 1,
    cap,
    escala,
    qualidade,
    segundos,
    desligados: [],
    errosEfeito: {},
    convertidos: [],
    res: {},
  };
}

/** A sessão para o fragmento do endereço. */
export function codificar(s: Sessao): string {
  return `m=${encodeURIComponent(JSON.stringify(s))}`;
}

/** A sessão do fragmento (null se não houver ou estiver estragada). */
export function decodificar(hash: string): Sessao | null {
  const h = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!h.startsWith('m=')) return null;
  try {
    const s = JSON.parse(decodeURIComponent(h.slice(2))) as Sessao;
    if (s?.v !== 1 || typeof s.cap?.webgpu !== 'boolean' || typeof s.res !== 'object') return null;
    s.desligados ??= [];
    s.errosEfeito ??= {};
    s.convertidos ??= [];
    return s;
  } catch {
    return null;
  }
}
