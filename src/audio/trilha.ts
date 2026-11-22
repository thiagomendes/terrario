/**
 * Trilha gravada (spec 019, T03): o motor de música em camadas e frases que segue o mundo.
 *
 * O que vem do índice (`public/sons/indice.json`) e do pacote do tema
 * (`public/sons/pacotes/<tema>-musica.mp3`):
 * - **camadas** (base, noite, pingos, movimento, amigos e perigo) que tocam em laço, todas
 *   começando juntas no compasso 0. Cada arquivo tem P amostras de folga antes e depois do
 *   laço; o laço é a janela [P, P + L] (loopStart e loopEnd), que é periódica no arquivo e
 *   não depende do atraso do codificador;
 * - **frases** (A, A', B, R... de 2 a 4 compassos) do dia e do entardecer, com versões, que
 *   entram em sequência pela `forma` do tema, cada uma no seu compasso;
 * - as **receitas de contexto** (`alvoMix`): quanto de cada camada, o passa-baixa e o eco.
 *
 * Trocas de contexto sempre no começo do compasso seguinte, nunca na hora: a camada que sobe
 * leva 1 compasso e a que desce, 1,5 (como na moda aprovada no esboço).
 *
 * Memória: os clipes são decodificados a 22 050 Hz, mono (a taxa dos arquivos), num
 * OfflineAudioContext: metade do que ocuparia a 48 kHz. Só abre o que a mistura de agora
 * pede (e o próximo provável: começar a andar, a próxima hora do dia); o que ficou muito tempo
 * sem tocar é solto, e tudo é solto ao sair do mundo.
 */

import { esquecerIndiceSons, lerIndiceSons } from './indiceSons';

/** Taxa dos arquivos gravados (e da decodificação). */
export const TAXA_TRILHA = 22050;

/** Onde a cena guarda, na sessão, a medida da trilha ao sair do mundo (só nos testes de tela). */
export const CHAVE_TRILHA_SAIDA = 'terrario:trilha-saida';

/**
 * Ganho único da trilha gravada sobre a mesma cadeia da trilha de hoje (busMusica 0,6 ×
 * "Música" × mestre do ambiente 0,5 × grupo ambiente 0,7). Ajustado pela régua de volume
 * (e2e/trilha-regua.spec.ts, RMS de 40 s renderizados offline, Música 60%): com ganho 1, a
 * mistura "dia" gravada dava −42,6 dBFS em todo tema, e a de hoje ia de −40,3 (Lua) a −45,5
 * (Rancho, o mais baixo). O dono pediu que ela nunca fique mais alta que a de hoje: 0,7
 * (−3,1 dB) deixa o Rancho em −0,3 dB e os outros de 2,6 a 5,3 dB abaixo. A T05 acerta cada
 * tema e contexto com `NIVEL_TRILHA`.
 */
export const GANHO_TRILHA_GRAVADA = 0.7;

/** O contexto que escolhe o ajuste de volume de cada tema (`NIVEL_TRILHA`). */
export type ContextoNivel = 'dia' | 'tarde' | 'noite' | 'caverna' | 'perigo';

export function contextoNivel(e: EstadoTrilha, temPerigo: boolean): ContextoNivel {
  if (e.perigo && temPerigo) return 'perigo';
  if (e.caverna) return 'caverna';
  return e.hora;
}

/**
 * Ajuste de volume (dB) por tema e contexto, por cima de `GANHO_TRILHA_GRAVADA` (spec 019,
 * T05). Medido na régua (e2e/trilha-regua.spec.ts): cada tema fica de 0 a 1 dB abaixo da trilha
 * de hoje no mesmo contexto, nunca acima (o dono: "o mesmo volume percebido da de hoje").
 * Contexto que falta usa o do dia; tema que falta, 0.
 */
export const NIVEL_TRILHA: Readonly<Record<string, Partial<Record<ContextoNivel, number>>>> = {
  'doce-reino': { dia: 3.6, tarde: 3.8, noite: 7.2, caverna: 6.5, perigo: 5.9 },
  'exploracao-lunar': { dia: 4.8, tarde: 5.2, noite: 7.2, caverna: 6.9, perigo: 5.6 },
  'rancho-alegre': { dia: 0, tarde: 0.2, noite: 2.5, caverna: 3.0 },
  // spec 014: no volume do Rancho gravado (o som da cidade antes da T09) e de 0 a 1,5 dB
  // abaixo da reserva sintetizada da cidade
  'cidade-grande': { dia: 0, tarde: 0.2, noite: 2.6, caverna: 2.9 },
  // spec 026 (T18): o volume percebido (LUFS, BS.1770) de cada mistura do bairro igual à média do
  // Rancho e da Cidade com o ajuste deles (026/referencia/fontes/medidas-pacote.json, "nivel"): o
  // synth-pop tem mais grave que a viola e o jazz, e a noite (pad sem bateria) é a mais baixa
  'vila-neon': { dia: 0.7, tarde: 0.4, noite: 4.6, caverna: 4.9 },
  // spec 027 (T21): o mesmo jeito da Vila Neon (027/referencia/fontes/medidas-pacote.json,
  // "musica.lufs"): a festa tem o xilofone e a flauta brilhando (gravada 0,6 dB abaixo para o dia
  // ficar em 0); a noite (harpa e celesta, sem percussão) é a que mais sobe
  'noite-das-fantasias': { dia: 0, tarde: 0.3, noite: 2.9, caverna: 2.7 },
};

/** O ajuste do tema no contexto, em ganho linear. */
export function nivelTrilha(temaId: string, c: ContextoNivel): number {
  const t = NIVEL_TRILHA[temaId];
  const db = t?.[c] ?? t?.dia ?? 0;
  return Math.pow(10, db / 20);
}

/** Quanto tempo uma camada ou frase fica aberta sem tocar antes de ser solta. */
export const SOLTAR_APOS_S = 45;

/** A cada tantas voltas, as frases respiram uma volta inteira (só as camadas tocam). */
export const VOLTAS_POR_RESPIRO = 4;

export const CAMADAS = [
  'base',
  'fdia',
  'ftarde',
  'noite',
  'pingos',
  'mov',
  'amigos',
  'perigo',
] as const;
export type Camada = (typeof CAMADAS)[number];
/** As camadas que tocam em laço (as outras duas são os barramentos das frases). */
export const LACOS: readonly Camada[] = ['base', 'noite', 'pingos', 'mov', 'amigos', 'perigo'];

export type HoraTrilha = 'dia' | 'tarde' | 'noite';
export type BiomaTrilha = 'normal' | 'deserto' | 'taiga' | 'pantano';

/** O que a trilha precisa saber do mundo (vem de `sinaisTrilha.ts`). */
export interface EstadoTrilha {
  hora: HoraTrilha;
  /** Intensidade da chuva de verdade, em degraus (0, 0,5 ou 1). */
  chuva: number;
  caverna: boolean;
  perigo: boolean;
  amigos: boolean;
  lavoura: boolean;
  /** 0 parado, 1 andando, 2 correndo. */
  mov: 0 | 1 | 2;
  bioma: BiomaTrilha;
}

export const ESTADO_TRILHA_INICIAL: Readonly<EstadoTrilha> = {
  hora: 'dia',
  chuva: 0,
  caverna: false,
  perigo: false,
  amigos: false,
  lavoura: false,
  mov: 0,
  bioma: 'normal',
};

export function mesmoEstado(a: EstadoTrilha, b: EstadoTrilha): boolean {
  return (
    a.hora === b.hora &&
    a.chuva === b.chuva &&
    a.caverna === b.caverna &&
    a.perigo === b.perigo &&
    a.amigos === b.amigos &&
    a.lavoura === b.lavoura &&
    a.mov === b.mov &&
    a.bioma === b.bioma
  );
}

export interface EfeitosTrilha {
  /** Passa-baixa do motor (Hz). */
  lp: number;
  /** Envio para o eco. */
  eco: number;
  /** Tempo do eco (s). */
  ecoT: number;
  /** Realimentação do eco. */
  realim: number;
}

export interface Mistura {
  g: Record<Camada, number>;
  fx: EfeitosTrilha;
}

/**
 * A receita do índice (`contextos`) virada em ganho por camada e no filtro e eco do motor.
 * Porte do `alvoMix` do esboço, com as correções da T03:
 * - a hora vale em todo bioma (de noite no deserto, na taiga ou no pântano é noite);
 * - a chuva entra pela intensidade (garoa põe metade dos pingos);
 * - o perigo substitui tudo, menos no Rancho (que não tem a camada).
 */
export function alvoMix(e: EstadoTrilha, temPerigo: boolean, rancho: boolean): Mistura {
  const g: Record<Camada, number> = {
    base: 0,
    fdia: 0,
    ftarde: 0,
    noite: 0,
    pingos: 0,
    mov: 0,
    amigos: 0,
    perigo: 0,
  };
  const fx: EfeitosTrilha = { lp: 20000, eco: 0, ecoT: 0.3, realim: 0.25 };
  const chuva = Math.max(0, Math.min(1, e.chuva));
  if (chuva > 0 && !e.caverna) fx.lp = 2400;
  if (e.bioma === 'deserto' && !e.caverna) {
    fx.lp = Math.min(fx.lp, 5000);
    fx.eco = 0.16;
    fx.ecoT = 0.32;
    fx.realim = 0.28;
  }
  if (e.caverna) {
    fx.lp = 1100;
    fx.eco = 0.3;
    fx.ecoT = 0.43;
    fx.realim = 0.38;
  }
  if (e.perigo && temPerigo) {
    g.perigo = 1;
    return { g, fx };
  }
  if (e.caverna) {
    g.base = 0.6;
    g.noite = 1;
    g.pingos = 1;
  } else {
    if (e.hora === 'dia') {
      g.base = 1;
      g.fdia = 1;
    } else if (e.hora === 'tarde') {
      g.base = 1;
      g.ftarde = 1;
    } else {
      g.base = 0.65;
      g.noite = 1;
    }
    if (e.bioma === 'taiga') {
      if (e.hora === 'dia') {
        g.fdia = 0;
        g.ftarde = 1;
      }
      g.pingos = Math.max(g.pingos, 0.5);
    }
    if (e.bioma === 'pantano' && e.hora !== 'noite') {
      g.base = 0.8;
      g.noite = 0.6;
      if (e.hora === 'dia') g.fdia = 0.7;
      else g.ftarde = 0.7;
    }
    if (chuva > 0) g.pingos = Math.max(g.pingos, chuva);
  }
  if (e.mov === 1) g.mov = 0.6;
  if (e.mov === 2) g.mov = 1;
  if (rancho && e.lavoura) g.mov = Math.max(g.mov, 0.4);
  if (e.amigos) g.amigos = 1;
  return { g, fx };
}

// ------------------------------------------------------------------ índice

export interface FormaFrase {
  frase: string;
  compassoInicio: number;
  compassos: number;
}

export interface ClipTrilha {
  id: string;
  tipo: 'camada' | 'frase';
  frase?: string;
  variante: number;
  compassos: number;
  /** Camadas: amostras do laço (L). */
  amostrasLaco?: number;
  /** Frases: duração nominal (a próxima entra aqui; a cauda soma por cima). */
  amostrasNominais?: number;
  /** Folga antes (P): o som começa em P / taxa. */
  folgaAntes: number;
  /** Bytes no pacote: [início, tamanho]. */
  o: readonly [number, number];
}

export interface TemaTrilha {
  id: string;
  amostrasCompasso: number;
  amostrasVolta: number;
  compassos: number;
  forma: FormaFrase[];
  clips: ClipTrilha[];
  /** Tamanho esperado do pacote (bytes), se o índice disser. */
  bytesPacote: number | null;
}

export interface IndiceTrilha {
  taxa: number;
  temas: Record<string, TemaTrilha>;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Lê a parte da música do índice, conferindo o que o motor usa. Devolve null se não servir. */
export function lerIndiceTrilha(json: unknown): IndiceTrilha | null {
  if (!json || typeof json !== 'object') return null;
  const raiz = json as Record<string, unknown>;
  const musica = raiz.musica as Record<string, unknown> | undefined;
  const temas = raiz.temas as Record<string, Record<string, unknown>> | undefined;
  const tamanhos = (raiz.tamanhos ?? {}) as Record<string, unknown>;
  const taxa = num(musica?.taxa) ?? TAXA_TRILHA;
  if (!temas || typeof temas !== 'object') return null;
  const saida: Record<string, TemaTrilha> = {};
  for (const [id, t] of Object.entries(temas)) {
    const amostrasCompasso = num(t.amostrasCompasso);
    const amostrasVolta = num(t.amostrasVolta);
    const compassos = num(t.compassos);
    if (!amostrasCompasso || !amostrasVolta || !compassos) continue;
    if (!Array.isArray(t.forma) || !Array.isArray(t.clips)) continue;
    const forma: FormaFrase[] = [];
    for (const f of t.forma as Record<string, unknown>[]) {
      const ci = num(f.compassoInicio);
      const c = num(f.compassos);
      if (typeof f.frase !== 'string' || ci === null || !c) continue;
      forma.push({ frase: f.frase, compassoInicio: ci, compassos: c });
    }
    const clips: ClipTrilha[] = [];
    for (const c of t.clips as Record<string, unknown>[]) {
      const o = c.o as unknown[];
      if (typeof c.id !== 'string' || (c.tipo !== 'camada' && c.tipo !== 'frase')) continue;
      if (!Array.isArray(o) || num(o[0]) === null || !num(o[1])) continue;
      clips.push({
        id: c.id,
        tipo: c.tipo,
        frase: typeof c.frase === 'string' ? c.frase : undefined,
        variante: num(c.variante) ?? 1,
        compassos: num(c.compassos) ?? 1,
        amostrasLaco: num(c.amostrasLaco) ?? undefined,
        amostrasNominais: num(c.amostrasNominais) ?? undefined,
        folgaAntes: num(c.folgaAntes) ?? 0,
        o: [o[0] as number, o[1] as number],
      });
    }
    if (!forma.length || !clips.some((c) => c.id === 'base')) continue;
    saida[id] = {
      id,
      amostrasCompasso,
      amostrasVolta,
      compassos,
      forma,
      clips,
      bytesPacote: num(tamanhos[`${id}-musica.mp3`]),
    };
  }
  return Object.keys(saida).length ? { taxa, temas: saida } : null;
}

/** Os bytes de um clipe dentro do pacote (cópia: o decodificador consome o que recebe). */
export function fatiarClipe(pacote: ArrayBuffer, clip: ClipTrilha): ArrayBuffer | null {
  const [ini, tam] = clip.o;
  if (ini < 0 || tam <= 0 || ini + tam > pacote.byteLength) return null;
  return pacote.slice(ini, ini + tam);
}

/** Em que camada (ou barramento de frase) o clipe toca. */
export function camadaDoClip(c: ClipTrilha): Camada | null {
  if (c.tipo === 'camada')
    return (LACOS as readonly string[]).includes(c.id) ? (c.id as Camada) : null;
  if (c.id.startsWith('dia_')) return 'fdia';
  if (c.id.startsWith('tarde_')) return 'ftarde';
  return null;
}

/** Os clipes que uma mistura faz tocar. */
export function clipsDaMistura(t: TemaTrilha, g: Record<Camada, number>): Set<string> {
  const s = new Set<string>();
  for (const c of t.clips) {
    const k = camadaDoClip(c);
    if (k && g[k] > 0) s.add(c.id);
  }
  return s;
}

const PROXIMA_HORA: Record<HoraTrilha, HoraTrilha> = { dia: 'tarde', tarde: 'noite', noite: 'dia' };

/**
 * Os clipes de agora e dos próximos prováveis (começar a andar e a próxima hora do dia), para
 * a troca no compasso seguinte já achar a camada aberta. No sobrevivência, à noite, o perigo
 * também é provável (as criaturas da noite caçam): a camada fica aberta a noite toda, e não é
 * solta logo depois de uma perseguição.
 */
export function clipsProvaveis(
  t: TemaTrilha,
  e: EstadoTrilha,
  temPerigo: boolean,
  rancho: boolean,
  sobrevivencia = false,
): Set<string> {
  const s = clipsDaMistura(t, alvoMix(e, temPerigo, rancho).g);
  const vizinhos: EstadoTrilha[] = [
    { ...e, mov: e.mov === 0 ? 1 : e.mov },
    { ...e, hora: PROXIMA_HORA[e.hora] },
  ];
  if (sobrevivencia && temPerigo && !rancho && e.hora === 'noite')
    vizinhos.push({ ...e, perigo: true });
  for (const v of vizinhos)
    for (const id of clipsDaMistura(t, alvoMix(v, temPerigo, rancho).g)) s.add(id);
  return s;
}

// ------------------------------------------------------------------ tempo

export function duracaoCompasso(t: TemaTrilha, taxa = TAXA_TRILHA): number {
  return t.amostrasCompasso / taxa;
}

/** Quando começa a frase i da volta (s), contando do compasso 0 em t0. */
export function inicioFrase(
  t0: number,
  t: TemaTrilha,
  volta: number,
  i: number,
  taxa = TAXA_TRILHA,
): number {
  return t0 + (volta * t.amostrasVolta + t.forma[i].compassoInicio * t.amostrasCompasso) / taxa;
}

/** O começo do próximo compasso depois de agora (com uma folga para agendar). */
export function proximoCompasso(t0: number, compasso: number, agora: number, folga = 0.06): number {
  return t0 + Math.max(0, Math.ceil((agora + folga - t0) / compasso)) * compasso;
}

/** A volta em que as frases respiram (só as camadas tocam). */
export function voltaDeRespiro(volta: number): boolean {
  return volta % VOLTAS_POR_RESPIRO === VOLTAS_POR_RESPIRO - 1;
}

/** Onde, dentro do laço, a camada está no instante t (para entrar atrasada e no compasso). */
export function posicaoNoLaco(
  t0: number,
  t: number,
  amostrasLaco: number,
  folga: number,
  taxa = TAXA_TRILHA,
): number {
  const laco = amostrasLaco / taxa;
  const dentro = (((t - t0) % laco) + laco) % laco;
  return folga / taxa + dentro;
}

/** Sorteio que nunca repete a mesma versão duas vezes seguidas (quando há mais de uma). */
export class SorteioSemRepetir {
  private ultimo = new Map<string, number>();
  constructor(private rng: () => number = Math.random) {}
  escolher(n: number, chave: string): number {
    if (n <= 1) {
      this.ultimo.set(chave, 0);
      return 0;
    }
    const antes = this.ultimo.get(chave);
    let i = Math.floor(this.rng() * n);
    if (i >= n) i = n - 1;
    if (i === antes) i = (i + 1 + Math.floor(this.rng() * (n - 1))) % n;
    if (i === antes) i = (i + 1) % n;
    this.ultimo.set(chave, i);
    return i;
  }
}

/** Valor de uma curva por pontos [t, v] com rampas lineares (igual à automação do Web Audio). */
export function interpolar(pts: readonly (readonly [number, number])[], t: number): number {
  if (!pts.length) return 0;
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [t1, v1] = pts[i];
    if (t < t1) {
      const [t0, v0] = pts[i - 1];
      return t1 === t0 ? v1 : v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
    }
  }
  return pts[pts.length - 1][1];
}

// ------------------------------------------------------------------ carregador

type Resposta = {
  ok: boolean;
  status?: number;
  arrayBuffer(): Promise<ArrayBuffer>;
  json(): Promise<unknown>;
};
export type Buscar = (url: string) => Promise<Resposta>;
export type Decodificar = (bytes: ArrayBuffer) => Promise<AudioBuffer>;

export interface MedidasTrilha {
  tema: string | null;
  /** Bytes do pacote baixado (o índice é comum a todos e não conta). */
  bytesBaixados: number;
  bytesDecodificados: number;
  picoDecodificados: number;
  abertos: number;
  total: number;
  ids: string[];
}

function baseDoSite(): string {
  try {
    const b = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL;
    return b && b.endsWith('/') ? b : `${b ?? ''}/`;
  } catch {
    return '/';
  }
}

const buscarPadrao: Buscar = (url) =>
  // baixa sem disputar com o mundo; o cache do navegador guarda para a próxima vez
  fetch(url, { priority: 'low' } as RequestInit) as unknown as Promise<Resposta>;

let decodificadorOffline: BaseAudioContext | null | undefined;

function decodificarCom(dc: BaseAudioContext, bytes: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((ok, erro) => {
    let feito = false;
    const sim = (b: AudioBuffer) => {
      if (!feito) {
        feito = true;
        ok(b);
      }
    };
    const nao = (e?: unknown) => {
      if (!feito) {
        feito = true;
        erro(e ?? new Error('decodeAudioData falhou'));
      }
    };
    try {
      const p = dc.decodeAudioData(bytes, sim, nao);
      if (p && typeof p.then === 'function') p.then(sim, nao);
    } catch (e) {
      nao(e);
    }
  });
}

/**
 * Decodifica a 22 050 Hz num OfflineAudioContext (cada amostra mono são 4 bytes: metade da
 * memória de 48 kHz). Sem OfflineAudioContext, usa o contexto do jogo (`reserva`).
 */
export function criarDecodificador(reserva: () => BaseAudioContext | null): Decodificar {
  return async (bytes) => {
    if (decodificadorOffline === undefined) {
      const g = globalThis as unknown as {
        OfflineAudioContext?: typeof OfflineAudioContext;
        webkitOfflineAudioContext?: typeof OfflineAudioContext;
      };
      const OAC = g.OfflineAudioContext ?? g.webkitOfflineAudioContext;
      try {
        decodificadorOffline = OAC ? new OAC(1, 1, TAXA_TRILHA) : null;
      } catch {
        decodificadorOffline = null;
      }
    }
    if (decodificadorOffline) {
      try {
        return await decodificarCom(decodificadorOffline, bytes.slice(0));
      } catch (e) {
        if (!reserva()) throw e;
        decodificadorOffline = null;
      }
    }
    const r = reserva();
    if (!r) throw new Error('sem contexto para decodificar');
    return decodificarCom(r, bytes);
  };
}

let indicePromessa: Promise<IndiceTrilha | null> | null = null;

/** Para os testes: esquece o índice já lido. */
export function esquecerIndiceTrilha(): void {
  indicePromessa = null;
  esquecerIndiceSons();
}

export function bytesDoBuffer(b: Pick<AudioBuffer, 'length' | 'numberOfChannels'>): number {
  return b.length * b.numberOfChannels * 4;
}

/**
 * Baixa o pacote de música de um tema e decodifica cada clipe quando alguém pede, um por vez
 * (no celular, decodificar tudo junto travava o quadro). Nunca lança: falhou, a trilha de hoje
 * (sintetizada) continua.
 */
export class CarregadorTrilha {
  tema: TemaTrilha | null = null;
  falhou = false;
  private pacote: ArrayBuffer | null = null;
  private bytesBaixados = 0;
  private abertos = new Map<string, AudioBuffer>();
  private abrindo = new Map<string, Promise<AudioBuffer | null>>();
  private fila: Promise<unknown> = Promise.resolve();
  private bytesDec = 0;
  private pico = 0;
  private geracao = 0;
  /** Sobe a cada `soltarAbertos`: o que estava na fila de abrir não abre depois. */
  private geracaoAbertos = 0;
  private baixando: Promise<boolean> | null = null;
  private readonly buscar: Buscar;
  /** O JSON do índice: o mesmo das vozes (`lerIndiceSons`), menos com `buscar` de teste. */
  private readonly lerIndice: (url: string) => Promise<unknown>;
  private readonly decodificar: Decodificar;
  private readonly base: string;

  constructor(op: { buscar?: Buscar; decodificar?: Decodificar; base?: string } = {}) {
    const buscar = op.buscar;
    this.buscar = buscar ?? buscarPadrao;
    this.lerIndice = buscar
      ? (url) =>
          buscar(url)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
      : lerIndiceSons;
    this.decodificar = op.decodificar ?? criarDecodificador(() => null);
    this.base = op.base ?? baseDoSite();
  }

  get pronto(): boolean {
    return !!this.tema && !!this.pacote;
  }

  /** Baixa o índice (comum) e o pacote do tema. Devolve se deu certo. */
  baixar(temaId: string): Promise<boolean> {
    if (this.baixando) return this.baixando;
    const geracao = this.geracao;
    this.baixando = (async () => {
      try {
        if (!indicePromessa) {
          indicePromessa = this.lerIndice(`${this.base}sons/indice.json`)
            .then((j) => lerIndiceTrilha(j))
            .catch(() => null);
        }
        const indice = await indicePromessa;
        if (!indice) indicePromessa = null;
        const tema = indice?.temas[temaId];
        if (!tema) {
          this.falhou = true;
          return false;
        }
        const r = await this.buscar(`${this.base}sons/pacotes/${temaId}-musica.mp3`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const pacote = await r.arrayBuffer();
        if (geracao !== this.geracao) return false;
        this.tema = tema;
        this.pacote = pacote;
        this.bytesBaixados = pacote.byteLength;
        return true;
      } catch {
        this.falhou = true;
        this.baixando = null;
        return false;
      }
    })();
    return this.baixando;
  }

  buffer(id: string): AudioBuffer | null {
    return this.abertos.get(id) ?? null;
  }

  aberto(id: string): boolean {
    return this.abertos.has(id);
  }

  /** Abre (decodifica) um clipe; os pedidos entram numa fila e saem um por vez. */
  abrir(id: string): Promise<AudioBuffer | null> {
    const ja = this.abertos.get(id);
    if (ja) return Promise.resolve(ja);
    const pend = this.abrindo.get(id);
    if (pend) return pend;
    const tema = this.tema;
    const clip = tema?.clips.find((c) => c.id === id);
    if (!tema || !clip || !this.pacote) return Promise.resolve(null);
    const geracao = this.geracao;
    const gAbertos = this.geracaoAbertos;
    const valendo = () => geracao === this.geracao && gAbertos === this.geracaoAbertos;
    const p = this.fila
      .then(async () => {
        if (!valendo() || !this.pacote) return null;
        const bytes = fatiarClipe(this.pacote, clip);
        if (!bytes) return null;
        const b = await this.decodificar(bytes);
        if (!valendo()) return null;
        this.abertos.set(id, b);
        this.bytesDec += bytesDoBuffer(b);
        this.pico = Math.max(this.pico, this.bytesDec);
        return b;
      })
      .catch(() => null)
      .finally(() => {
        if (this.abrindo.get(id) === p) this.abrindo.delete(id);
      });
    this.abrindo.set(id, p);
    this.fila = p;
    return p;
  }

  /** Solta um clipe aberto (quem ainda toca com ele continua até o fim). */
  soltar(id: string): void {
    const b = this.abertos.get(id);
    if (!b) return;
    this.abertos.delete(id);
    this.bytesDec = Math.max(0, this.bytesDec - bytesDoBuffer(b));
  }

  /** Solta os clipes abertos e os pedidos na fila; o pacote baixado fica. */
  soltarAbertos(): void {
    this.geracaoAbertos++;
    this.abertos.clear();
    this.abrindo.clear();
    this.bytesDec = 0;
  }

  /** Solta tudo: clipes abertos, os pedidos na fila e o pacote baixado. */
  soltarTudo(): void {
    this.geracao++;
    this.abertos.clear();
    this.abrindo.clear();
    this.bytesDec = 0;
    this.pacote = null;
    this.tema = null;
    this.baixando = null;
    this.bytesBaixados = 0;
  }

  medidas(): MedidasTrilha {
    return {
      tema: this.tema?.id ?? null,
      bytesBaixados: this.bytesBaixados,
      bytesDecodificados: this.bytesDec,
      picoDecodificados: this.pico,
      abertos: this.abertos.size,
      total: this.tema?.clips.length ?? 0,
      ids: [...this.abertos.keys()],
    };
  }
}

// ------------------------------------------------------------------ motor

interface Frase {
  t: number;
  fim: number;
  i: number;
  volta: number;
  fontes: Partial<Record<Camada, string>>;
}

export interface InfoTrilhaGravada {
  t0: number;
  compasso: number;
  camadas: Record<Camada, number>;
  alvo: Record<Camada, number>;
  lp: number;
  eco: number;
  fontes: number;
  frase: string | null;
  /** A última troca pedida: quando foi pedida e o compasso em que entra. */
  troca: { pedida: number; compasso: number } | null;
}

export interface OpcoesTrilhaGravada {
  temPerigo: boolean;
  rancho: boolean;
  /** Modo sobrevivência: à noite, a camada de perigo fica aberta de antemão. */
  sobrevivencia?: boolean;
  rng?: () => number;
  /** Segundos que a trilha leva para entrar (em cruz com a de hoje). */
  entrada?: number;
  /** Sem o ajuste de volume do tema (só a régua, para medir o que falta ajustar). */
  semNivel?: boolean;
}

/**
 * Reprograma um parâmetro descrito por pontos [t, v]: segue a curva de agora até o compasso
 * `tb` e de lá vai a `v1` em `dur` segundos. Devolve a curva nova. Uma rampa que ainda andava
 * é cortada em `tb` no valor dela (nunca volta ao começo, como faria um cancel no meio dela).
 */
function rampaNoCompasso(
  p: AudioParam,
  pts: [number, number][],
  agora: number,
  tb: number,
  v1: number,
  dur: number,
): [number, number][] {
  const vb = interpolar(pts, tb);
  const novos: [number, number][] = pts.filter((q) => q[0] < tb && q[0] > agora - 30);
  const antes = pts.filter((q) => q[0] <= agora).pop();
  if (antes && !novos.includes(antes)) novos.unshift(antes);
  novos.push([tb, vb], [tb + dur, v1]);
  p.cancelScheduledValues(agora);
  p.setValueAtTime(interpolar(novos, agora), agora);
  for (const [t, v] of novos) if (t > agora) p.linearRampToValueAtTime(v, t);
  return novos;
}

/**
 * O motor da trilha gravada sobre um contexto do Web Audio (o do jogo ou um offline, na
 * régua de volume). Quem o dirige chama `agendar()` umas 5 vezes por segundo.
 */
export class TrilhaGravada {
  readonly compasso: number;
  t0 = 0;
  private parado = false;
  private estado: EstadoTrilha = { ...ESTADO_TRILHA_INICIAL };
  private alvo: Mistura;
  private ganhos = {} as Record<Camada, GainNode>;
  private mod = {} as Record<Camada, [number, number][]>;
  private lacos = new Map<Camada, AudioBufferSourceNode>();
  private ocioso = new Map<string, number>();
  private ociosoLaco = new Map<Camada, number>();
  private limpar = new Map<AudioBufferSourceNode, () => void>();
  private emUso = new Map<string, number>();
  private fontes = new Set<AudioBufferSourceNode>();
  private frases: Frase[] = [];
  private prox = { volta: 0, i: 0 };
  private sorteio: SorteioSemRepetir;
  private saida!: GainNode;
  /** O ajuste de volume do tema no contexto de agora (`nivelTrilha`). */
  private nivel!: GainNode;
  /** A curva do ajuste de volume, em pontos [t, v] (como `mod`), para trocar sem degrau. */
  private nivelPts: [number, number][] = [];
  private filtro!: BiquadFilterNode;
  private envio!: GainNode;
  private atraso!: DelayNode;
  private realim!: GainNode;
  private nos: AudioNode[] = [];
  private ultimaManutencao = -Infinity;
  private troca: { pedida: number; compasso: number } | null = null;

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly destino: AudioNode,
    private readonly tema: TemaTrilha,
    private readonly car: CarregadorTrilha,
    private readonly op: OpcoesTrilhaGravada,
  ) {
    this.compasso = duracaoCompasso(tema);
    this.sorteio = new SorteioSemRepetir(op.rng);
    this.alvo = alvoMix(this.estado, op.temPerigo, op.rancho);
  }

  private no<T extends AudioNode>(n: T): T {
    this.nos.push(n);
    return n;
  }

  get ativo(): boolean {
    return !this.parado;
  }

  /** Começa no compasso 0 daqui a pouco, subindo devagar (a trilha de hoje sai em cruz). */
  iniciar(e: EstadoTrilha, quando = this.ctx.currentTime + 0.3): void {
    const c = this.ctx;
    this.estado = { ...e };
    const t0 = quando;
    this.t0 = t0;
    this.saida = this.no(c.createGain());
    const entrada = this.op.entrada ?? 2 * this.compasso;
    this.saida.gain.setValueAtTime(0, c.currentTime);
    this.saida.gain.setValueAtTime(0, t0);
    this.saida.gain.linearRampToValueAtTime(1, t0 + entrada);
    this.filtro = this.no(c.createBiquadFilter());
    this.filtro.type = 'lowpass';
    this.filtro.Q.value = 0.5;
    this.envio = this.no(c.createGain());
    this.atraso = this.no(c.createDelay(1));
    this.realim = this.no(c.createGain());
    this.filtro.connect(this.saida);
    this.filtro.connect(this.envio);
    this.envio.connect(this.atraso);
    this.atraso.connect(this.realim);
    this.realim.connect(this.atraso);
    this.atraso.connect(this.saida);
    this.nivel = this.no(c.createGain());
    const nv0 = this.nivelDe(e);
    this.nivel.gain.value = nv0;
    this.nivelPts = [[c.currentTime, nv0]];
    this.saida.connect(this.nivel);
    this.nivel.connect(this.destino);
    const alv = alvoMix(e, this.op.temPerigo, this.op.rancho);
    this.alvo = alv;
    this.filtro.frequency.value = alv.fx.lp;
    this.envio.gain.value = alv.fx.eco;
    this.atraso.delayTime.value = alv.fx.ecoT;
    this.realim.gain.value = alv.fx.realim;
    for (const k of CAMADAS) {
      const g = this.no(c.createGain());
      g.gain.value = alv.g[k];
      g.gain.setValueAtTime(alv.g[k], t0);
      g.connect(this.filtro);
      this.ganhos[k] = g;
      this.mod[k] = [[t0, alv.g[k]]];
    }
    this.prox = { volta: 0, i: 0 };
    this.agendar();
  }

  private nivelDe(e: EstadoTrilha): number {
    return this.op.semNivel ? 1 : nivelTrilha(this.tema.id, contextoNivel(e, this.op.temPerigo));
  }

  /** O ajuste de volume que vale agora (ganho linear). */
  get ganhoNivel(): number {
    return this.nivel ? interpolar(this.nivelPts, this.ctx.currentTime) : 1;
  }

  valor(k: Camada, t = this.ctx.currentTime): number {
    return interpolar(this.mod[k] ?? [], t);
  }

  private fonte(
    buf: AudioBuffer,
    id: string,
    dest: AudioNode,
    t: number,
    offset: number,
    laco?: number,
  ): AudioBufferSourceNode {
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    if (laco) {
      s.loop = true;
      s.loopStart = this.tema.clips.find((c) => c.id === id)!.folgaAntes / TAXA_TRILHA;
      s.loopEnd = s.loopStart + laco / TAXA_TRILHA;
    }
    s.connect(dest);
    this.fontes.add(s);
    this.emUso.set(id, (this.emUso.get(id) ?? 0) + 1);
    const fim = () => {
      if (!this.limpar.delete(s)) return;
      this.fontes.delete(s);
      this.emUso.set(id, Math.max(0, (this.emUso.get(id) ?? 1) - 1));
      try {
        s.disconnect();
      } catch {
        // já desligada
      }
    };
    this.limpar.set(s, fim);
    s.onended = fim;
    s.start(t, offset);
    return s;
  }

  /** Agenda as frases que começam logo e liga as camadas que acabaram de abrir. */
  agendar(): void {
    if (this.parado) return;
    const agora = this.ctx.currentTime;
    const lim = agora + 1;
    for (;;) {
      const t = inicioFrase(this.t0, this.tema, this.prox.volta, this.prox.i);
      if (t > lim) break;
      this.frase(t, this.prox.i, this.prox.volta);
      if (++this.prox.i >= this.tema.forma.length) {
        this.prox.i = 0;
        this.prox.volta++;
      }
    }
    this.frases = this.frases.filter((f) => f.fim > agora - 0.5);
    this.ligarLacos(agora);
    if (agora - this.ultimaManutencao > 2) {
      this.ultimaManutencao = agora;
      this.manter(agora);
    }
  }

  private querTocar(k: Camada, t: number): boolean {
    return this.alvo.g[k] > 0 || this.valor(k, t) > 0.001;
  }

  private ligarLacos(agora: number): void {
    for (const k of LACOS) {
      if (this.lacos.has(k) || !this.querTocar(k, agora + 1)) continue;
      const clip = this.tema.clips.find((c) => c.id === k);
      if (!clip?.amostrasLaco) continue;
      const b = this.car.buffer(k);
      if (!b) {
        void this.car.abrir(k);
        continue;
      }
      const t = Math.max(this.t0, agora + 0.05);
      const off = posicaoNoLaco(this.t0, t, clip.amostrasLaco, clip.folgaAntes);
      this.lacos.set(k, this.fonte(b, k, this.ganhos[k], t, off, clip.amostrasLaco));
    }
  }

  private versoes(frase: string, k: Camada): ClipTrilha[] {
    const pref = k === 'fdia' ? 'dia_' : 'tarde_';
    return this.tema.clips
      .filter((c) => c.tipo === 'frase' && c.frase === frase && c.id.startsWith(pref))
      .sort((x, y) => x.variante - y.variante);
  }

  private escolher(frase: string, k: Camada): ClipTrilha | null {
    const lista = this.versoes(frase, k);
    if (!lista.length) return null;
    const i = this.sorteio.escolher(lista.length, `${k}|${frase}`);
    const quer = lista[i];
    if (this.car.aberto(quer.id)) return quer;
    for (const c of lista) void this.car.abrir(c.id);
    return lista.find((c) => this.car.aberto(c.id)) ?? null;
  }

  private frase(t: number, i: number, volta: number): void {
    const f = this.tema.forma[i];
    const r: Frase = { t, fim: t + f.compassos * this.compasso, i, volta, fontes: {} };
    // o relógio atrasou (aba em segundo plano, quadro travado): a frase entra no meio, no
    // compasso certo; se já quase acabou, fica para a próxima
    const atraso = Math.max(0, this.ctx.currentTime + 0.02 - t);
    if (!voltaDeRespiro(volta) && r.fim - (t + atraso) > this.compasso) {
      for (const k of ['fdia', 'ftarde'] as const) {
        if (!this.querTocar(k, t)) continue;
        const c = this.escolher(f.frase, k);
        if (!c) continue;
        const off = c.folgaAntes / TAXA_TRILHA + atraso;
        this.fonte(this.car.buffer(c.id)!, c.id, this.ganhos[k], t + atraso, off);
        r.fontes[k] = c.id;
      }
    }
    this.frases.push(r);
  }

  /** Muda o contexto: as camadas mudam no começo do próximo compasso. Devolve esse instante. */
  mudar(e: EstadoTrilha): number | null {
    if (this.parado) return null;
    this.estado = { ...e };
    const agora = this.ctx.currentTime;
    const tb = proximoCompasso(this.t0, this.compasso, agora);
    const alv = alvoMix(e, this.op.temPerigo, this.op.rancho);
    let mudou = false;
    for (const k of CAMADAS) {
      const v1 = alv.g[k];
      const pts = this.mod[k];
      const fim = pts[pts.length - 1][1];
      if (Math.abs(v1 - fim) < 1e-6) continue;
      mudou = true;
      const vb = this.valor(k, tb);
      const dur = (v1 > vb ? 1 : 1.5) * this.compasso;
      this.mod[k] = rampaNoCompasso(this.ganhos[k].gain, pts, agora, tb, v1, dur);
    }
    // o ajuste de volume do contexto novo acompanha as camadas, em 1,5 compasso (uma troca no
    // meio da rampa de antes segue do valor de agora, sem degrau)
    const nv = this.nivelDe(e);
    const np = this.nivelPts;
    if (Math.abs(np[np.length - 1][1] - nv) > 1e-4)
      this.nivelPts = rampaNoCompasso(this.nivel.gain, np, agora, tb, nv, 1.5 * this.compasso);
    const fx = alv.fx;
    const tc = this.compasso / 3;
    const params: [AudioParam, number][] = [
      [this.filtro.frequency, fx.lp],
      [this.envio.gain, fx.eco],
      [this.atraso.delayTime, fx.ecoT],
      [this.realim.gain, fx.realim],
    ];
    for (const [p, v] of params) {
      p.cancelScheduledValues(tb);
      p.setTargetAtTime(v, tb, tc);
    }
    if (fx.lp !== this.alvo.fx.lp || fx.eco !== this.alvo.fx.eco) mudou = true;
    const antes = this.alvo;
    this.alvo = alv;
    // a frase do barramento que acabou de ligar entra no meio, no compasso certo
    for (const k of ['fdia', 'ftarde'] as const) {
      if (antes.g[k] > 0 || alv.g[k] <= 0) continue;
      const r = this.frases.find((f) => f.t <= tb && tb < f.fim);
      if (!r || r.fontes[k] || voltaDeRespiro(r.volta) || r.fim - tb < this.compasso) continue;
      const c = this.escolher(this.tema.forma[r.i].frase, k);
      if (!c) continue;
      this.fonte(
        this.car.buffer(c.id)!,
        c.id,
        this.ganhos[k],
        tb,
        c.folgaAntes / TAXA_TRILHA + (tb - r.t),
      );
      r.fontes[k] = c.id;
    }
    this.ligarLacos(agora);
    if (!mudou) return null;
    this.troca = { pedida: agora, compasso: tb };
    this.ultimaManutencao = -Infinity;
    return tb;
  }

  /** Abre o que a mistura de agora e a próxima provável pedem; solta o que ficou sem tocar. */
  private manter(agora: number): void {
    const precisa = clipsProvaveis(
      this.tema,
      this.estado,
      this.op.temPerigo,
      this.op.rancho,
      this.op.sobrevivencia,
    );
    for (const id of precisa) if (!this.car.aberto(id)) void this.car.abrir(id);
    for (const k of LACOS) {
      const s = this.lacos.get(k);
      if (!s || this.querTocar(k, agora) || precisa.has(k)) {
        this.ociosoLaco.delete(k);
        continue;
      }
      const desde = this.ociosoLaco.get(k) ?? agora;
      this.ociosoLaco.set(k, desde);
      if (agora - desde < SOLTAR_APOS_S) continue;
      this.lacos.delete(k);
      this.ociosoLaco.delete(k);
      try {
        s.stop();
      } catch {
        // já parada
      }
      this.limpar.get(s)?.();
    }
    for (const id of this.car.medidas().ids) {
      if (precisa.has(id) || (this.emUso.get(id) ?? 0) > 0) {
        this.ocioso.delete(id);
        continue;
      }
      const desde = this.ocioso.get(id) ?? agora;
      this.ocioso.set(id, desde);
      if (agora - desde >= SOLTAR_APOS_S) {
        this.car.soltar(id);
        this.ocioso.delete(id);
      }
    }
  }

  fraseAgora(t = this.ctx.currentTime): Frase | null {
    return this.frases.find((f) => t >= f.t && t < f.fim) ?? null;
  }

  info(): InfoTrilhaGravada {
    const agora = this.ctx.currentTime;
    const camadas = {} as Record<Camada, number>;
    for (const k of CAMADAS) camadas[k] = Math.round(this.valor(k, agora) * 1000) / 1000;
    const f = this.fraseAgora(agora);
    return {
      t0: this.t0,
      compasso: this.compasso,
      camadas,
      alvo: { ...this.alvo.g },
      lp: this.alvo.fx.lp,
      eco: this.alvo.fx.eco,
      fontes: this.fontes.size,
      frase: f ? this.tema.forma[f.i].frase : null,
      troca: this.troca,
    };
  }

  /** Para tudo (desce em `descida` segundos) e solta os nós. */
  parar(descida = 0.08): void {
    if (this.parado) return;
    this.parado = true;
    const agora = this.ctx.currentTime;
    try {
      const g = this.saida.gain;
      g.cancelScheduledValues(agora);
      g.setValueAtTime(g.value, agora);
      g.linearRampToValueAtTime(0, agora + descida);
    } catch {
      // contexto fechado
    }
    for (const s of this.fontes) {
      try {
        s.stop(agora + descida + 0.02);
      } catch {
        // já parada
      }
    }
    const soltar = () => {
      for (const s of this.fontes) {
        try {
          s.disconnect();
        } catch {
          // já desligada
        }
      }
      this.fontes.clear();
      this.lacos.clear();
      for (const n of this.nos) {
        try {
          n.disconnect();
        } catch {
          // já desligado
        }
      }
      this.nos = [];
    };
    this.limpar.clear();
    setTimeout(soltar, (descida + 0.1) * 1000);
  }
}
