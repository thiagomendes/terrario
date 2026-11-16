/**
 * Os sons da Vila Neon (spec 026, T18 e T19): o Show da Vila no tempo do núcleo, os brinquedos de
 * tocar e o ambiente das zonas do bairro. O pacote (`public/sons/pacotes/vila-neon-show.mp3`, seção
 * `temas['vila-neon'].show` do índice) só existe neste mundo e desce em segundo plano depois de o
 * mundo abrir; sem ele, o bairro fica só com a trilha (nada vai para o console).
 *
 * - **O show** (o roteiro em `src/jogo/show.ts`, uns 6 min): a abertura (`abertura`) em `show.inicio`,
 *   a entrada da banda (`entrada`), e as três músicas da `setlist` do índice, cada uma com a contagem
 *   dela e as partes no compasso dela (a parte em laço toca a parte inteira; a que não é laço se
 *   repete a cada `c` compassos), a torcida nas pausas; tudo encadeado no relógio do núcleo
 *   convertido para o do AudioContext. Todo mundo ouve o mesmo compasso. O toque no palco
 *   (`vilaAcorde`) toca o acorde da música de agora exatamente em `quando`; o acorde final
 *   (`vilaFinal`) entra em até 100 ms, ou na hora certa quando vem sozinho (agendado de antemão), corta
 *   as músicas e chama o aplauso, a torcida e os fogos.
 * - **As caixas fora do show:** cada caixa acesa toca o verso da camada dela em laço (é o "ligar o
 *   som" da f3 e, depois do show, o brinquedo livre), no compasso do relógio do núcleo, só com a
 *   criança perto do palco. É o ambiente da zona do festival.
 * - **Uma música por vez (019):** com o show ou as caixas tocando perto, a trilha do bairro é calada
 *   (`aoCalarTrilha`), em rampa; no show, os passarinhos, os grilos e o vento também baixam
 *   (`aoCalarNatureza`) e voltam devagar depois do aplauso. O show é a música mais alta do jogo
 *   (`REFORCO_SHOW_DB` acima das caixas soltas), cheio em toda a plateia. No máximo um ambiente de zona por vez (o zumbido do neon na rua de
 *   noite ou a batida do rinque), em cruz de ~1,5 s ao trocar de zona; com o vento de sempre, dois.
 *   Nada mais fica em laço: o rádio toca a batida por 8 compassos e para sozinho.
 * - **Toques:** `tocarBrinquedo('fliperama', i)` (três musiquinhas de 8 bits nossas), 'radio' (liga e
 *   desliga a batida), 'fita' ("zzzzip"), 'ladrilho' ("plim" subindo a escala), 'rodinhas', 'orelhao',
 *   'campainha'; os eventos tocam o "plim" do estojo, o "tum" da caixa e o "bé" da lhama.
 */
import { lerIndiceSons } from './indiceSons';
import type { ContextoAudio, FonteAudio, GrupoAudio, MotorAudio, NoAudio } from './motor';
import { GANHO_TRILHA_GRAVADA, nivelTrilha } from './trilha';
import {
  ACORDES_SHOW,
  APLAUSO,
  CHAMADO,
  COMPASSO,
  ESPERA_FINAL,
  INTRO,
  OITAVO,
  ROTEIRO,
  SETLIST,
  acordeDoToque,
  faseDoShow,
  momentoFinalSozinho,
} from '../jogo/show';
import type { EventoVila, VilaVista } from '../nucleo/vila';
import { zonaDaVila, type PlanoVila } from '../world/vilaNeon';

// ------------------------------------------------------------------ o índice

export interface ClipShow {
  o: [number, number];
  /** Amostras do som (sem a folga). */
  n: number;
  /** Amostras do arquivo decodificado (com a folga). */
  arquivo: number;
  /** Laço: o tamanho do laço (amostras), na janela [folga, folga + laco]. */
  laco?: number;
  /** Compassos da música (o pedaço que não é laço se repete a cada `c` compassos na parte). */
  c?: number;
}

/** Uma música da setlist no índice: os pedaços de cada parte, a contagem, os acordes do toque. */
export interface MusicaIndice {
  id: string;
  contagem: string | null;
  partes: Record<string, string[]>;
  acordes: string[];
  final: string | null;
}

export interface PedacoForma {
  pedaco: string;
  compassoInicio: number;
  compassos: number;
}

export interface IndiceShow {
  pacote: string;
  taxa: number;
  folga: number;
  amostrasCompasso: number;
  tempo: number;
  compassos: number;
  forma: PedacoForma[];
  camadas: string[];
  acordes: string[];
  fliperama: string[];
  clips: Record<string, ClipShow>;
  /** As músicas do show, na ordem da `SETLIST`. */
  setlist: MusicaIndice[];
  /** A abertura, a entrada da banda, a torcida (laço) e os fogos do fim. */
  abertura: string | null;
  entrada: string | null;
  torcida: string | null;
  fogos: string | null;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** A seção `temas['vila-neon'].show` do índice, conferida (null se faltar algo). */
export function lerIndiceShow(json: unknown): IndiceShow | null {
  const s = (json as { temas?: Record<string, { show?: Record<string, unknown> }> } | null)
    ?.temas?.['vila-neon']?.show;
  if (!s || typeof s !== 'object') return null;
  const taxa = num(s.taxa);
  const folga = num(s.folga);
  const amostrasCompasso = num(s.amostrasCompasso);
  if (!taxa || folga === null || !amostrasCompasso || typeof s.pacote !== 'string') return null;
  const clipsJ = s.clips as Record<string, Record<string, unknown>> | undefined;
  if (!clipsJ || typeof clipsJ !== 'object') return null;
  const clips: Record<string, ClipShow> = {};
  for (const [id, c] of Object.entries(clipsJ)) {
    const o = c.o as unknown[];
    const n = num(c.n);
    if (!Array.isArray(o) || num(o[0]) === null || !num(o[1]) || !n) continue;
    clips[id] = {
      o: [o[0] as number, o[1] as number],
      n,
      arquivo: num(c.arquivo) ?? n + folga,
      laco: num(c.laco) ?? undefined,
      c: num(c.c) ?? undefined,
    };
  }
  const lista = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x in clips) : [];
  const forma: PedacoForma[] = [];
  for (const f of (Array.isArray(s.forma) ? s.forma : []) as Record<string, unknown>[]) {
    const ci = num(f.compassoInicio);
    const c = num(f.compassos);
    if (typeof f.pedaco === 'string' && ci !== null && c)
      forma.push({ pedaco: f.pedaco, compassoInicio: ci, compassos: c });
  }
  const camadas = Array.isArray(s.camadas)
    ? s.camadas.filter((x): x is string => typeof x === 'string')
    : [];
  if (camadas.length !== 3 || !forma.length) return null;
  const clip = (v: unknown) => (typeof v === 'string' && v in clips ? v : null);
  const setlist: MusicaIndice[] = [];
  for (const m of (Array.isArray(s.setlist) ? s.setlist : []) as Record<string, unknown>[]) {
    if (!m || typeof m !== 'object' || typeof m.id !== 'string') continue;
    const partes: Record<string, string[]> = {};
    for (const [k, v] of Object.entries((m.partes ?? {}) as Record<string, unknown>)) {
      const l = lista(v);
      if (l.length) partes[k] = l;
    }
    setlist.push({
      id: m.id,
      contagem: clip(m.contagem),
      partes,
      acordes: lista(m.acordes),
      final: clip(m.final),
    });
  }
  // o índice de antes da setlist: a primeira música com as camadas que ele tem
  if (!setlist.length) {
    const partes: Record<string, string[]> = {};
    for (const p of ['verso', 'refrao', 'subida']) {
      const l = camadas.map((c) => `${c}_${p}`).filter((id) => id in clips);
      if (l.length) partes[p] = l;
    }
    setlist.push({
      id: 'm1',
      contagem: clip('contagem'),
      partes,
      acordes: lista(s.acordes).slice(0, 3),
      final: null,
    });
  }
  return {
    pacote: s.pacote,
    taxa,
    folga,
    amostrasCompasso,
    tempo: num(s.tempo) ?? 120,
    compassos: num(s.compassos) ?? 20,
    forma,
    camadas,
    acordes: lista(s.acordes),
    fliperama: lista(s.fliperama),
    clips,
    setlist,
    abertura: clip(s.abertura),
    entrada: clip(s.entrada),
    torcida: clip(s.torcida),
    fogos: clip(s.fogos),
  };
}

// ------------------------------------------------------------------ o tempo (puro)

/**
 * O relógio do núcleo no relógio do AudioContext: `audio(t) = t + dif`, com `dif` medido a cada
 * quadro (o AudioContext anda aos saltos de alguns ms; a média segue devagar, e um salto grande, como
 * o da aba que voltou do segundo plano, é aceito na hora).
 */
export class RelogioVila {
  dif: number | null = null;
  medir(agoraAudio: number, agoraNucleo: number): void {
    const d = agoraAudio - agoraNucleo;
    if (this.dif === null || Math.abs(d - this.dif) > 0.08) this.dif = d;
    else this.dif += (d - this.dif) * 0.05;
  }
  /** Tempo do núcleo -> tempo do AudioContext. */
  audio(tNucleo: number): number {
    return tNucleo + (this.dif ?? 0);
  }
  /** Tempo do AudioContext -> tempo do núcleo. */
  nucleo(tAudio: number): number {
    return tAudio - (this.dif ?? 0);
  }
}

/** Um pedaço do show no relógio do núcleo (`camada`: a das caixas, ou -1). */
export interface SegmentoShow {
  camada: number;
  clip: string;
  ini: number;
  fim: number;
  laco: boolean;
}

/** O aplauso entra este tanto depois do acorde final (s), com o acorde ainda soando. */
export const ATRASO_APLAUSO = 1;
/** A torcida das pausas entra um pouco antes do fim da música e sai sobre a contagem (s). */
const TORCIDA_ANTES = 0.4;
const TORCIDA_DEPOIS = 0.6;

/** Onde as músicas param: no acorde final (o tocado ou o que vem sozinho). */
export function corteDoShow(inicio: number, final: number | null): number {
  return final ?? inicio + CHAMADO + ESPERA_FINAL;
}

/** O acorde final do show (o da última música, ou o de antes). */
export function clipeFinal(ind: Pick<IndiceShow, 'setlist'>): string {
  return ind.setlist[ind.setlist.length - 1]?.final ?? 'final';
}

/**
 * Os pedaços do show (tempo do núcleo): a abertura em `inicio`, a entrada, e cada música do
 * `ROTEIRO` (a contagem dela e as partes, com os pedaços da `setlist` do índice), a torcida nas
 * pausas; tudo o que é música cortado no acorde final.
 */
export function segmentosDoShow(
  ind: Pick<
    IndiceShow,
    'taxa' | 'camadas' | 'clips' | 'setlist' | 'abertura' | 'entrada' | 'torcida'
  >,
  inicio: number,
  final: number | null,
): SegmentoShow[] {
  const corte = corteDoShow(inicio, final);
  const out: SegmentoShow[] = [];
  const dur = (id: string) => ind.clips[id].n / ind.taxa;
  const camada = (id: string) => ind.camadas.findIndex((c) => id.startsWith(`${c}_`));
  const solto = (id: string | null, ini: number) => {
    if (!id || !ind.clips[id] || ini >= corte) return;
    out.push({ camada: -1, clip: id, ini, fim: Math.min(corte, ini + dur(id)), laco: false });
  };
  solto(ind.abertura, inicio);
  solto(ind.entrada, inicio + INTRO);
  ROTEIRO.forEach((r, k) => {
    const m = ind.setlist[k];
    if (!m) return;
    solto(m.contagem, inicio + r.contagem);
    for (const p of r.partes) {
      const ini = inicio + p.ini;
      const fimParte = ini + p.compassos * r.compasso;
      for (const id of m.partes[p.pedaco] ?? []) {
        const c = ind.clips[id];
        if (!c) continue;
        if (c.laco) {
          if (ini < corte)
            out.push({
              camada: camada(id),
              clip: id,
              ini,
              fim: Math.min(fimParte, corte),
              laco: true,
            });
          continue;
        }
        // o pedaço que não é laço se repete a cada `c` compassos dentro da parte
        const passo = (c.c ?? p.compassos) * r.compasso;
        for (let t = ini; t < fimParte - 1e-6 && t < corte; t += passo)
          out.push({
            camada: camada(id),
            clip: id,
            ini: t,
            fim: Math.min(corte, t + dur(id)),
            laco: false,
          });
      }
    }
    // a pausa depois da música: a torcida (em laço) até a contagem da próxima
    const prox = ROTEIRO[k + 1];
    const tc = ind.torcida ? ind.clips[ind.torcida] : null;
    if (prox && tc && ind.torcida) {
      const a = inicio + r.fim - TORCIDA_ANTES;
      const b = Math.min(corte, inicio + prox.contagem + TORCIDA_DEPOIS);
      if (a < b) out.push({ camada: -1, clip: ind.torcida, ini: a, fim: b, laco: !!tc.laco });
    }
  });
  return out.sort((a, b) => a.ini - b.ini);
}

/** A grade do toque da música `k` (o primeiro tempo, no relógio do núcleo) e o oitavo dela. */
export function gradeDaMusica(inicio: number, k: number): { t0: number; oitavo: number } {
  const r = ROTEIRO[Math.max(0, Math.min(ROTEIRO.length - 1, k))];
  return { t0: inicio + r.inicio, oitavo: r.compasso / 8 };
}

/**
 * Quando o acorde do toque soa (relógio do AudioContext): em `quando`, que o núcleo já encaixou no
 * oitavo de compasso; se o evento chegou atrasado, no próximo oitavo da grade do show (nunca fora do
 * tempo).
 */
export function momentoDoAcorde(
  quandoAudio: number,
  agoraAudio: number,
  gradeAudio: number,
  oitavo = OITAVO,
): number {
  const minimo = agoraAudio + 0.01;
  if (quandoAudio >= minimo) return quandoAudio;
  return gradeAudio + Math.ceil((minimo - gradeAudio) / oitavo - 1e-9) * oitavo;
}

/**
 * Quando o acorde final soa (relógio do AudioContext): o toque que disparou já passou (o evento vem
 * pela rede), então soa agora, em 10 ms; o que vem sozinho, agendado, soa na hora dele.
 */
export function momentoDoFinal(quandoAudio: number, agoraAudio: number): number {
  return Math.max(quandoAudio, agoraAudio + 0.01);
}

/** A posição (s) no laço de `periodo` s de um relógio que começou em `ancora`. */
export function posicaoNoLaco(t: number, ancora: number, periodo: number): number {
  return (((t - ancora) % periodo) + periodo) % periodo;
}

/** O próximo tempo (meio compasso de 2/4: 0,5 s) da grade que começa em `ancora`. */
export function proximoTempo(t: number, ancora: number, passo = OITAVO * 2): number {
  return ancora + Math.ceil((t - ancora) / passo - 1e-9) * passo;
}

/** Cheio até `cheio` blocos, some até `some` (curva macia). */
export function volumeNaDistancia(d: number, cheio: number, some: number): number {
  if (d <= cheio) return 1;
  if (d >= some) return 0;
  const x = (d - cheio) / (some - cheio);
  return (1 - x) * (1 - x);
}

/**
 * O show e as caixas: cheio em toda a área da plateia, da grade (12 blocos do meio do palco) até
 * o portão do festival (40), e some até 72 (fora do alambrado, já na avenida).
 */
export const PALCO_CHEIO = 42;
export const PALCO_SOME = 72;

/**
 * As caixas tocando soltas (fora do show): o mesmo caminho da trilha gravada (mestre do ambiente
 * 0,5 × música 0,6 × `GANHO_TRILHA_GRAVADA`), no nível do dia do bairro. As camadas foram gravadas
 * com o refrão em -23,6 dBFS (1 dB acima da mistura "dia" da trilha): são o ambiente da zona.
 */
export const GANHO_CAIXAS = 0.5 * 0.6 * GANHO_TRILHA_GRAVADA;
/**
 * Quanto o show soa acima das caixas soltas (dB). O dono (15 nov 2026): "ficou bem baixinha a
 * música da banda, até o passarinho tá saindo mais alto". O show é a música mais alta do jogo
 * enquanto toca: medido na grade da plateia (ebur128), de 6 a 9 dB acima da trilha e da natureza
 * nos níveis de sempre, que baixam enquanto ele toca (`CALAR_TRILHA_DB`, `CALAR_NATUREZA_DB`).
 */
export const REFORCO_SHOW_DB = 12;
/** O barramento do palco no show (as caixas soltas tocam nele com `GANHO_CAIXAS / GANHO_SHOW`). */
export const GANHO_SHOW = GANHO_CAIXAS * Math.pow(10, REFORCO_SHOW_DB / 20);
/** O acorde final e o aplauso por cima do show (dB): o pico da música. */
export const REFORCO_FINAL_DB = 2;
/**
 * A passagem de som (de dia, sem show) e o acorde do aquecimento (a noite chegou), no barramento
 * do palco: baixinhos, abaixo de uma caixa solta (que vai a GANHO_CAIXAS / GANHO_SHOW, ~0,25).
 */
export const GANHO_PASSAGEM = 0.13;
export const GANHO_AQUECER = 0.22;
/** O acorde de cada caixa que acende de noite (relativo ao show). */
export const GANHO_ACENDE = 0.4;
export const REFORCO_APLAUSO_DB = 4;

/**
 * Ganho (dB) de cada toque (sobre o clipe gravado em -23 dB "enquanto soa", como as vozes da 019),
 * na régua dos sons extras da cidade (o "plim" do canteiro em -7,9 dB): o estojo achado mais alto,
 * o que se repete muito (ladrilho, rodinhas) bem baixinho. A batida e o neon são em laço (grupo do
 * ambiente). Os mesmos números de `026/referencia/fontes/scripts-pacote/ganhos_toque.json`.
 */
export const GANHO_BRINQUEDO: Readonly<Record<string, number>> = {
  fliperama: -12,
  radio: -10,
  batida: -4,
  fita: -10,
  ladrilho: -12,
  rodinhas: -16,
  estojo: -6,
  tum: -8,
  lhama: -8,
  campainha: -16,
  orelhao: -12,
  neon: -6,
};

const dbLin = (db: number) => Math.pow(10, db / 20);

/** A escala do ladrilho (pentatônica): cada passo um "plim" mais alto, e volta. */
export const ESCALA_LADRILHO = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 5 / 3, 3 / 2, 5 / 4, 9 / 8];

/** O rádio toca a batida por estes compassos e para sozinho (nada em laço sem fim). */
export const COMPASSOS_RADIO = 8;
/** Depois do aplauso, as caixas descansam este tanto antes de voltar a tocar (s). */
export const DESCANSO_DEPOIS_DO_SHOW = 2 * COMPASSO;
/** A cruz do ambiente ao trocar de zona (constante de tempo, s): ~1,5 s até trocar. */
export const TAU_ZONA = 0.5;

export type AmbienteZona = 'neon' | 'batida' | null;

/** O ambiente da zona onde a criança está (um só por vez). */
export function ambienteDaZona(zona: string | null, noite: number): AmbienteZona {
  if (zona === 'rinque') return 'batida';
  if ((zona === 'rua' || zona === 'pracinha' || zona === 'casa80') && noite >= 0.5) return 'neon';
  return null;
}

export type BrinquedoVila =
  | 'fliperama'
  | 'radio'
  | 'fita'
  | 'ladrilho'
  | 'rodinhas'
  | 'orelhao'
  | 'campainha'
  | 'estojo'
  | 'tum'
  | 'lhama';

/** Intervalo mínimo entre dois toques do mesmo brinquedo (s): nada vira metralhadora. */
const ESPERA_TOQUE: Partial<Record<BrinquedoVila, number>> = {
  ladrilho: 0.15,
  rodinhas: 0.3,
  fita: 0.6,
  orelhao: 1.2,
  campainha: 0.8,
  radio: 0.3,
};

// ------------------------------------------------------------------ o tocador

interface ParamVila {
  value: number;
  setValueAtTime?(v: number, t: number): void;
  setTargetAtTime?(v: number, t: number, tau: number): void;
  cancelScheduledValues?(t: number): void;
  linearRampToValueAtTime?(v: number, t: number): void;
}
interface GanhoVila extends NoAudio {
  gain: ParamVila;
}
interface FonteVila extends FonteAudio {
  buffer: unknown;
  loop: boolean;
  loopStart: number;
  loopEnd: number;
  playbackRate: ParamVila;
  start(quando?: number, offset?: number): void;
}
interface CtxVila extends ContextoAudio {
  createBufferSource(): FonteVila;
  createGain(): GanhoVila;
}
export interface BufferVila {
  readonly duration: number;
}

export interface OuvinteVila {
  x: number;
  z: number;
}

export interface OpcoesSomVila {
  motor: MotorAudio;
  plano: PlanoVila;
  base?: string;
  baixar?: (url: string) => Promise<ArrayBuffer>;
  carregarIndice?: (url: string) => Promise<unknown>;
  decodificar?: (bytes: ArrayBuffer) => Promise<BufferVila>;
  /** Os volumes de agora ("Música" e "Natureza", de 0 a 1). */
  volumes?: () => { musica: number; natureza: number };
  /** A trilha do bairro cala (0 a 1) com o show ou as caixas tocando perto. */
  aoCalarTrilha?: (f: number) => void;
  /** Os passarinhos, os grilos e o vento baixam (0 a 1) com o show tocando perto. */
  aoCalarNatureza?: (f: number) => void;
  /** A grade da trilha do bairro (relógio do AudioContext), para a batida entrar no compasso dela. */
  gradeTrilha?: () => { t0: number; compasso: number } | null;
  /** Testes de tela: o que tocou. */
  aoTocar?: (id: string) => void;
  /** Sorteio (testes). */
  rng?: () => number;
}

interface Tocando {
  id: string;
  fonte: FonteVila;
  ganho: GanhoVila;
  /** Relógio do AudioContext. */
  ini: number;
  fim: number;
  parado: boolean;
}

export type SomVila = ReturnType<typeof criarSomVila>;

export function criarSomVila(op: OpcoesSomVila) {
  const { motor, plano } = op;
  const base = op.base ?? '/';
  const rng = op.rng ?? Math.random;
  const baixar =
    op.baixar ??
    (async (url: string) => {
      const r = await fetch(url, { priority: 'low' } as RequestInit);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.arrayBuffer();
    });
  const carregarIndice = op.carregarIndice ?? lerIndiceSons;
  const palco = plano.pontos.palco;
  const meioPalco = { x: (palco.x0 + palco.x1) / 2, z: (palco.z0 + palco.z1) / 2 };
  const relogio = new RelogioVila();

  let ind: IndiceShow | null = null;
  let pacote: ArrayBuffer | null = null;
  let carregando = false;
  let pronto = false;
  let falhou = false;
  let geracao = 0;
  const buffers = new Map<string, Promise<BufferVila | null>>();
  const prontos = new Map<string, BufferVila>();
  const usado = new Map<string, number>();

  /** O show que está tocando (pelo `inicio` do núcleo). */
  let showAtual: { inicio: number; final: number | null } | null = null;
  /** Os pedaços do show já começados (null: passou sem tocar), por `clip@ini`. */
  const agendados = new Map<string, Tocando | null>();
  let finalAgendado: { t: number; fontes: Tocando[]; sozinho: boolean } | null = null;
  const acordes: { acorde: number; quando: number }[] = [];
  /** O laço livre de cada caixa (fora do show). */
  const livres: (Tocando | null)[] = [null, null, null];
  let descansoAte = -Infinity;
  /** Fim do show, do aplauso e das caixas tocando: até quando a trilha fica calada. */
  let caladoAte = -Infinity;
  let calar = 0;
  /** Fim do aplauso do show: até quando a natureza fica baixinha. */
  let showAte = -Infinity;
  let calarNat = 0;
  let gFestival = 0;
  let zonaAgora: string | null = null;
  let amb: { id: Exclude<AmbienteZona, null>; t: Tocando } | null = null;
  let radio: Tocando | null = null;
  let proximaCampainha = -Infinity;
  let passoLadrilho = 0;
  const ultimoToque = new Map<string, number>();
  let fliperama: Tocando | null = null;
  let busShow: GanhoVila | null = null;
  let ganhoBus = 0;
  let ganhoAmb = 0;
  let destinoAmbiente: NoAudio | null = null;
  let vistaAgora: VilaVista | null = null;
  let manutencao = 0;

  function decodificar(bytes: ArrayBuffer): Promise<BufferVila> {
    if (op.decodificar) return op.decodificar(bytes);
    type Dec = { decodeAudioData(b: ArrayBuffer): Promise<BufferVila> };
    const g = globalThis as unknown as {
      OfflineAudioContext?: new (c: number, n: number, t: number) => Dec;
    };
    let dc: Dec | null = null;
    try {
      dc = g.OfflineAudioContext ? new g.OfflineAudioContext(1, 1, 22050) : null;
    } catch {
      dc = null;
    }
    dc ??= motor.contexto as unknown as Dec | null;
    if (!dc) return Promise.reject(new Error('sem decodificador'));
    return dc.decodeAudioData(bytes);
  }

  /** Abre (decodifica) um clipe do pacote; o que já abriu fica guardado. */
  function abrir(id: string): Promise<BufferVila | null> {
    let p = buffers.get(id);
    if (p) return p;
    const c = ind?.clips[id];
    if (!c || !pacote) return Promise.resolve(null);
    const minha = geracao;
    p = decodificar(pacote.slice(c.o[0], c.o[0] + c.o[1])).then(
      (b) => {
        if (minha !== geracao) return null;
        prontos.set(id, b);
        return b;
      },
      () => {
        buffers.delete(id);
        return null;
      },
    );
    buffers.set(id, p);
    return p;
  }

  function carregar(): void {
    if (carregando) return;
    carregando = true;
    const minha = geracao;
    void (async () => {
      try {
        const j = await carregarIndice(`${base}sons/indice.json`);
        if (minha !== geracao) return;
        const s = lerIndiceShow(j);
        if (!s) throw new Error('sem o show no índice');
        const pac = await baixar(`${base}sons/pacotes/${s.pacote}`);
        if (minha !== geracao) return;
        ind = s;
        pacote = pac;
        pronto = true;
        // os toques curtos já: o primeiro "plim" não espera
        for (const k of ['estojo', 'tum', 'lhama']) void abrir(k);
      } catch {
        // sem rede ou sem o pacote: o bairro fica só com a trilha
        if (minha === geracao) falhou = true;
      }
    })();
  }

  const podeTocar = () => motor.estado === 'ativo' && !motor.mudo && !!motor.contexto;
  const agora = () => motor.contexto?.currentTime ?? 0;
  const volumes = () => op.volumes?.() ?? { musica: 1, natureza: 1 };

  /** O barramento do show (no grupo do ambiente, com o "Música" e a distância do palco). */
  function ganhoDoBus(): number {
    return GANHO_SHOW * volumes().musica * nivelTrilha('vila-neon', 'dia') * gFestival;
  }

  /**
   * Toca um clipe: `t` (AudioContext), `dentro` s já passados do som (para entrar no meio), laço
   * opcional. Barramento: 'show' (o do palco), 'ambiente' ou 'efeitos'.
   */
  function tocar(
    id: string,
    t: number,
    o: {
      ganho: number;
      bus: 'show' | GrupoAudio;
      dentro?: number;
      laco?: boolean;
      fim?: number;
      taxa?: number;
      entrada?: number;
    },
  ): Tocando | null {
    const c = ind?.clips[id];
    const b = prontos.get(id);
    if (!c || !b || !ind || !podeTocar()) {
      if (c && !b) void abrir(id);
      return null;
    }
    usado.set(id, agora());
    const P = ind.folga / ind.taxa;
    const dur = c.n / ind.taxa;
    let res: Tocando | null = null;
    const grupo: GrupoAudio = o.bus === 'show' ? 'ambiente' : o.bus;
    const ok = motor.tocar(
      (ctxBase, destino) => {
        const ctx = ctxBase as CtxVila;
        const f = ctx.createBufferSource();
        f.buffer = b;
        const g = ctx.createGain();
        f.connect(g);
        if (o.bus === 'show') {
          if (!busShow) {
            busShow = ctx.createGain();
            ganhoBus = ganhoDoBus();
            busShow.gain.value = ganhoBus;
            busShow.connect(destino);
            destinoAmbiente = destino;
          }
          g.connect(busShow);
        } else g.connect(destino);
        if (o.taxa && o.taxa !== 1) f.playbackRate.value = o.taxa;
        let off = o.dentro ?? 0;
        if (o.laco && c.laco) {
          f.loop = true;
          f.loopStart = P;
          f.loopEnd = P + c.laco / ind!.taxa;
          off = off % (c.laco / ind!.taxa);
        }
        if (o.entrada) {
          g.gain.value = 0;
          g.gain.setValueAtTime?.(0, t);
          g.gain.setTargetAtTime?.(o.ganho, t, o.entrada / 3);
          if (!g.gain.setTargetAtTime) g.gain.value = o.ganho;
        } else g.gain.value = o.ganho;
        f.start(t, P + off);
        const fim = o.fim ?? (o.laco ? Infinity : t + dur - off + 0.05);
        if (Number.isFinite(fim) && o.fim !== undefined) f.stop(fim + 0.06);
        res = { id, fonte: f, ganho: g, ini: t, fim, parado: false };
        if (o.fim !== undefined && Number.isFinite(o.fim)) {
          // um corte (o laço que acaba, o acorde final): desce em 50 ms, sem estalo
          g.gain.setValueAtTime?.(o.ganho, Math.max(t, o.fim - 0.05));
          g.gain.linearRampToValueAtTime?.(0, o.fim);
        }
        return f;
      },
      { grupo, prioridade: o.laco || dur > 4 ? 'alta' : 'normal' },
    );
    if (!ok || !res) return null;
    const r = res as Tocando;
    const doMotor = r.fonte.onended;
    r.fonte.onended = () => {
      doMotor?.();
      r.parado = true;
      try {
        r.ganho.disconnect();
      } catch {
        // já desligado
      }
    };
    op.aoTocar?.(id);
    return r;
  }

  /** Para um som em `t` (AudioContext), descendo em `desce` s. */
  function parar(x: Tocando | null, t = agora(), desce = 0.08): void {
    if (!x || x.parado) return;
    const g = x.ganho.gain;
    g.cancelScheduledValues?.(t);
    g.setValueAtTime?.(g.value, t);
    if (g.linearRampToValueAtTime) g.linearRampToValueAtTime(0, t + desce);
    else g.value = 0;
    x.fim = Math.min(x.fim, t + desce);
    try {
      x.fonte.stop(Math.max(t, x.ini) + desce + 0.02);
    } catch {
      // já parada
    }
  }

  // ------------------------------------------------------------------ o show
  function tocarSegmento(s: SegmentoShow, ag: number): Tocando | null {
    const tIni = relogio.audio(s.ini);
    const tFim = relogio.audio(s.fim);
    if (tFim <= ag + 0.05) return null;
    const t = Math.max(tIni, ag + 0.03);
    const cortado = s.laco || tFim < tIni + ind!.clips[s.clip].n / ind!.taxa - 0.01;
    return tocar(s.clip, t, {
      ganho: 1,
      bus: 'show',
      dentro: t - tIni,
      laco: s.laco,
      fim: cortado ? tFim : undefined,
      entrada: t > tIni + 0.02 ? 0.05 : undefined,
    });
  }

  function agendarShow(ag: number): void {
    // longe do palco não se ouve: nada começa (quem chega no meio entra no compasso certo)
    if (!showAtual || !ind || gFestival <= 0) return;
    const segs = segmentosDoShow(ind, showAtual.inicio, showAtual.final);
    for (const s of segs) {
      const chave = `${s.clip}@${s.ini}`;
      if (agendados.has(chave)) continue;
      if (relogio.audio(s.ini) > ag + 0.8) {
        // logo vem: deixa aberto antes
        if (relogio.audio(s.ini) < ag + 6) void abrir(s.clip);
        continue;
      }
      const x = tocarSegmento(s, ag);
      if (x) agendados.set(chave, x);
      else if (relogio.audio(s.fim) <= ag + 0.05) agendados.set(chave, null);
    }
    // os acordes do toque de cada música abrem antes da contagem dela (o primeiro toque já soa)
    ROTEIRO.forEach((r, k) => {
      const ini = relogio.audio(showAtual!.inicio + r.contagem);
      const fim = relogio.audio(showAtual!.inicio + r.fim);
      if (ini < ag + 8 && fim > ag) for (const id of ind!.setlist[k]?.acordes ?? []) void abrir(id);
    });
    // o acorde final (e o que vem com ele) abre antes do chamado: o toque pode chegar a qualquer hora
    const tChamado = relogio.audio(showAtual.inicio + CHAMADO);
    if (tChamado < ag + 8)
      for (const k of [clipeFinal(ind), 'aplauso', ind.torcida, ind.fogos]) if (k) void abrir(k);
    // o acorde final que vem sozinho: agendado de antemão, na hora certa
    if (showAtual.final === null && !finalAgendado) {
      const tAuto = relogio.audio(momentoFinalSozinho({ inicio: showAtual.inicio, final: null }));
      if (tAuto < ag + 0.6) agendarFinal(Math.max(tAuto, ag + 0.01), true);
    }
  }

  function cortarCamadas(t: number): void {
    for (const x of agendados.values()) if (x && !x.parado && x.fim > t) parar(x, t, 0.1);
  }

  /** O acorde final e o que vem com ele: o aplauso, a torcida até a banda sair e os fogos. */
  function somDoFinal(t: number): Tocando[] {
    if (!ind) return [];
    const fontes: Tocando[] = [];
    const f = tocar(clipeFinal(ind), t, { ganho: dbLin(REFORCO_FINAL_DB), bus: 'show' });
    if (f) fontes.push(f);
    const a = tocar('aplauso', t + ATRASO_APLAUSO, {
      ganho: dbLin(REFORCO_APLAUSO_DB),
      bus: 'show',
    });
    if (a) fontes.push(a);
    const tc = ind.torcida;
    if (tc && ind.clips[tc]) {
      // a torcida segue enquanto a banda faz a reverência e sai, e some devagar no fim
      const x = tocar(tc, t + ATRASO_APLAUSO + 1.5, {
        ganho: dbLin(REFORCO_APLAUSO_DB - 2),
        bus: 'show',
        laco: !!ind.clips[tc].laco,
        fim: t + APLAUSO - 0.5,
        entrada: 1.2,
      });
      if (x) {
        const g = x.ganho.gain;
        g.setValueAtTime?.(dbLin(REFORCO_APLAUSO_DB - 2), t + APLAUSO - 5);
        g.linearRampToValueAtTime?.(0.0001, t + APLAUSO - 0.5);
        fontes.push(x);
      }
    }
    if (ind.fogos)
      for (const q of [0.15, 1.6]) {
        const x = tocar(ind.fogos, t + q, { ganho: dbLin(REFORCO_APLAUSO_DB - 3), bus: 'show' });
        if (x) fontes.push(x);
      }
    return fontes;
  }

  function agendarFinal(t: number, sozinho: boolean): void {
    if (finalAgendado) {
      for (const x of finalAgendado.fontes) parar(x, agora(), 0.02);
    }
    cortarCamadas(t);
    const fontes = somDoFinal(t);
    finalAgendado = { t, fontes, sozinho };
    caladoAte = Math.max(caladoAte, t + APLAUSO);
    showAte = t + APLAUSO;
    if (showAtual) showAtual.final = relogio.nucleo(t);
  }

  function comecarShow(inicio: number, final: number | null, ag: number): void {
    acabarShow(ag);
    showAtual = { inicio, final };
    finalAgendado = null;
    // as caixas tocando soltas param na contagem
    const tIni = Math.max(ag, relogio.audio(inicio));
    for (let i = 0; i < 3; i++) {
      parar(livres[i], tIni, 0.15);
      livres[i] = null;
    }
    if (ind) {
      // o que vem logo (o resto abre uns segundos antes de tocar, em agendarShow)
      for (const k of [ind.abertura, ind.entrada, ind.torcida, 'aplauso']) if (k) void abrir(k);
    }
  }

  function acabarShow(ag: number): void {
    if (!showAtual) return;
    for (const x of agendados.values()) if (x && x.fim > ag + 0.2) parar(x, ag, 0.2);
    agendados.clear();
    acordes.length = 0;
    showAtual = null;
  }

  // ------------------------------------------------------------------ as caixas fora do show
  function quadroLivre(vista: VilaVista | null, ag: number): void {
    const quer = (i: number) =>
      !!vista?.cx[i] && gFestival > 0.001 && !showAtual && ag >= descansoAte && pronto;
    // com caixa acesa perto, a contagem e os versos ficam abertos: o show pode começar já
    if (ind && gFestival > 0.001 && vista?.cx.some(Boolean)) {
      void abrir('contagem');
      if (ind.abertura) void abrir(ind.abertura);
      for (const cam of ind.camadas) void abrir(`${cam}_verso`);
    }
    for (let i = 0; i < 3; i++) {
      const x = livres[i];
      if (x && x.parado) livres[i] = null;
      if (quer(i) && !livres[i] && ind) {
        const id = `${ind.camadas[i]}_verso`;
        const c = ind.clips[id];
        if (!c?.laco) continue;
        if (!prontos.has(id)) {
          void abrir(id);
          continue;
        }
        // entra no próximo tempo da grade do núcleo, na fase do relógio (todos ouvem o mesmo compasso)
        const tN = proximoTempo(relogio.nucleo(ag + 0.05), 0);
        const t = relogio.audio(tN);
        livres[i] = tocar(id, t, {
          ganho: GANHO_CAIXAS / GANHO_SHOW,
          bus: 'show',
          laco: true,
          dentro: posicaoNoLaco(tN, 0, c.laco / ind.taxa),
          entrada: 0.05,
        });
      } else if (!quer(i) && livres[i]) {
        parar(livres[i], ag, 0.3);
        livres[i] = null;
      }
    }
  }

  // ------------------------------------------------------------------ a passagem de som
  /**
   * Sem show (o show é só de noite, decisão do dono): de vez em quando, baixinho, a banda passa o
   * som do palco (um toque de bateria, uma batida de guitarra), do próprio material do show e no
   * barramento do palco (some com a distância). Quando a noite chega, o palco aquece: um acorde
   * que cresce devagar, macio (o aviso, sem texto nem relógio).
   */
  let proximaPassagem = -Infinity;
  let noiteAntes: boolean | null = null;
  let passagens = 0;
  let aquecimentosSom = 0;
  function quadroPassagem(vista: VilaVista | null, noiteShow: boolean, ag: number): void {
    if (!ind) return;
    const quieto = !showAtual && !vista?.show && !vista?.cx.some(Boolean) && ag >= descansoAte;
    if (noiteAntes === false && noiteShow && quieto && gFestival > 0.01) {
      const id = ind.acordes[0];
      if (id && tocar(id, ag + 0.05, { ganho: GANHO_AQUECER, bus: 'show', entrada: 1.4 }))
        aquecimentosSom++;
      proximaPassagem = ag + 14;
    }
    noiteAntes = noiteShow;
    if (!quieto || gFestival <= 0.01) {
      if (gFestival <= 0.01) proximaPassagem = -Infinity;
      return;
    }
    if (proximaPassagem === -Infinity) {
      proximaPassagem = ag + 6 + rng() * 8;
      for (const k of ['tum', ...ind.acordes]) void abrir(k);
      return;
    }
    if (ag < proximaPassagem) return;
    proximaPassagem = ag + 11 + rng() * 9;
    passagens++;
    if (rng() < 0.5) {
      // "tum... tum": a bateria testando o bumbo
      tocar('tum', ag + 0.02, { ganho: GANHO_PASSAGEM, bus: 'show', taxa: 0.92 });
      tocar('tum', ag + 0.62, { ganho: GANHO_PASSAGEM * 0.8, bus: 'show', taxa: 0.92 });
    } else {
      // uma batida de guitarra (um acorde do show), solta
      const id = ind.acordes[Math.floor(rng() * Math.min(2, ind.acordes.length))];
      if (id) tocar(id, ag + 0.02, { ganho: GANHO_PASSAGEM * 0.8, bus: 'show' });
    }
  }

  // ------------------------------------------------------------------ o ambiente da zona
  /** A grade para a batida: a da trilha do bairro (mesmo andamento) ou a do núcleo. */
  function gradeBatida(): number {
    if (gFestival > 0.001) return relogio.audio(0);
    const g = op.gradeTrilha?.();
    if (g && Math.abs(g.compasso - COMPASSO) < 0.01) return g.t0;
    return relogio.audio(0);
  }

  function quadroAmbiente(ouvinte: OuvinteVila, noite: number, ag: number): void {
    const z = zonaDaVila(plano, ouvinte.x, ouvinte.z);
    if (z !== zonaAgora && pronto && z) for (const id of DA_ZONA[z] ?? []) void abrir(id);
    zonaAgora = z;
    const quer = pronto ? ambienteDaZona(zonaAgora, noite) : null;
    const v = volumes();
    const alvo = (id: Exclude<AmbienteZona, null>) =>
      dbLin(GANHO_BRINQUEDO[id]) * (id === 'neon' ? v.natureza : v.musica);
    if (amb && (amb.id !== quer || amb.t.parado)) {
      const g = amb.t.ganho.gain;
      g.cancelScheduledValues?.(ag);
      if (g.setTargetAtTime) g.setTargetAtTime(0, ag, TAU_ZONA);
      else g.value = 0;
      try {
        amb.t.fonte.stop(ag + TAU_ZONA * 5);
      } catch {
        // já parada
      }
      amb = null;
    }
    if (quer && !amb) {
      const c = ind?.clips[quer];
      if (c?.laco && ind) {
        const t = ag + 0.05;
        const ancora = gradeBatida();
        const x = tocar(quer, t, {
          ganho: alvo(quer),
          bus: 'ambiente',
          laco: true,
          dentro: posicaoNoLaco(t, ancora, c.laco / ind.taxa),
          entrada: TAU_ZONA * 3,
        });
        if (x) {
          amb = { id: quer, t: x };
          ganhoAmb = alvo(quer);
        }
      }
    } else if (amb) {
      const a = alvo(amb.id);
      if (Math.abs(a - ganhoAmb) > 0.01 * Math.max(a, ganhoAmb, 1e-4)) {
        ganhoAmb = a;
        const g = amb.t.ganho.gain;
        if (g.setTargetAtTime) g.setTargetAtTime(a, ag, TAU_ZONA);
      }
    }
    // a campainha de bicicleta de vez em quando, na rua de dia
    const naRua = zonaAgora === 'rua' || zonaAgora === 'pracinha';
    if (!naRua || noite >= 0.5) proximaCampainha = -Infinity;
    else if (proximaCampainha === -Infinity) proximaCampainha = ag + 12 + rng() * 20;
    else if (ag >= proximaCampainha && pronto) {
      tocar('campainha', ag + 0.02, {
        ganho: dbLin(GANHO_BRINQUEDO.campainha) * v.natureza,
        bus: 'ambiente',
        taxa: 0.96 + rng() * 0.08,
      });
      proximaCampainha = ag + 25 + rng() * 30;
    }
  }

  // ------------------------------------------------------------------ cada quadro
  function quadro(
    vista: VilaVista | null,
    tNucleo: number,
    ouvinte: OuvinteVila,
    noite: number,
    noiteShow?: boolean,
  ): void {
    if (!motor.contexto) return;
    const ag = agora();
    relogio.medir(ag, tNucleo);
    const noiteAgora = noiteShow ?? noite > 0.5;
    vistaAgora = vista;
    gFestival = volumeNaDistancia(
      Math.hypot(ouvinte.x - meioPalco.x, ouvinte.z - meioPalco.z),
      PALCO_CHEIO,
      PALCO_SOME,
    );
    const show = vista?.show ?? null;
    if (pronto && ind && podeTocar()) {
      const fase = show ? faseDoShow(show, tNucleo) : null;
      if (show && fase !== 'acabou') {
        if (!showAtual || Math.abs(showAtual.inicio - show.inicio) > 1e-3)
          comecarShow(show.inicio, show.final, ag);
        // o acorde final que chegou sem o evento (entrou no mundo no fim do show)
        if (show.final !== null && !finalAgendado) {
          const t = relogio.audio(show.final);
          if (ag - t < 1) agendarFinal(momentoDoFinal(t, ag), false);
          else finalAgendado = { t, fontes: [], sozinho: false };
        }
        agendarShow(ag);
        const fim = relogio.audio(corteDoShow(show.inicio, show.final) + APLAUSO);
        caladoAte = Math.max(caladoAte, fim);
        showAte = fim;
      } else if (showAtual) {
        acabarShow(ag);
        descansoAte = ag + DESCANSO_DEPOIS_DO_SHOW;
      }
      quadroLivre(vista, ag);
      quadroPassagem(vista, noiteAgora, ag);
      // o acorde final agendado sem o som aberto (decodificação atrasou): entra assim que abrir
      if (
        finalAgendado &&
        !finalAgendado.fontes.length &&
        ag < finalAgendado.t + 0.3 &&
        ind &&
        prontos.has(clipeFinal(ind))
      ) {
        const t = Math.max(finalAgendado.t, ag + 0.01);
        finalAgendado.fontes = somDoFinal(t);
      }
    }
    if (busShow) {
      const alvo = ganhoDoBus();
      if (Math.abs(alvo - ganhoBus) > 0.01 * Math.max(alvo, ganhoBus, 1e-4)) {
        ganhoBus = alvo;
        const g = busShow.gain;
        if (g.setTargetAtTime) g.setTargetAtTime(alvo, ag, 0.15);
        else g.value = alvo;
      }
    }
    if (podeTocar()) quadroAmbiente(ouvinte, noite, ag);
    // uma música por vez: com o show ou as caixas acesas perto, a trilha do bairro cala (também
    // no descanso depois do aplauso, para ela não subir e descer de novo)
    const tocandoPalco = !!showAtual || ag < caladoAte || !!vista?.cx.some(Boolean);
    const f = tocandoPalco && pronto ? gFestival : 0;
    if (Math.abs(f - calar) > 0.02 || (f === 0 && calar !== 0)) {
      calar = f;
      op.aoCalarTrilha?.(f);
    }
    // e com o show tocando perto, os passarinhos, os grilos e o vento baixam (as caixas soltas
    // são o ambiente da zona: a natureza segue)
    const fn = (!!showAtual || ag < showAte) && pronto ? gFestival : 0;
    if (Math.abs(fn - calarNat) > 0.02 || (fn === 0 && calarNat !== 0)) {
      calarNat = fn;
      op.aoCalarNatureza?.(fn);
    }
    // o rádio para sozinho no fim dos compassos dele
    if (radio && (radio.parado || ag >= radio.fim)) radio = null;
    if (++manutencao % 300 === 0) soltarParados(ag);
  }

  /** Solta o que ficou muito tempo sem tocar (menos o que o show e as caixas podem pedir). */
  function soltarParados(ag: number): void {
    const emUso = new Set<string>();
    if (showAtual || vistaAgora?.cx.some(Boolean)) {
      for (const cam of ind?.camadas ?? []) emUso.add(`${cam}_verso`);
    }
    for (const [id, t] of usado) {
      if (emUso.has(id) || ['estojo', 'tum', 'lhama'].includes(id)) continue;
      if (ag - t > 60) {
        buffers.delete(id);
        prontos.delete(id);
        usado.delete(id);
      }
    }
  }

  // ------------------------------------------------------------------ os eventos do núcleo
  function evento(e: EventoVila, tNucleo: number): void {
    if (!motor.contexto) return;
    const ag = agora();
    relogio.medir(ag, tNucleo);
    switch (e.e) {
      case 'vilaAcorde': {
        if (!ind || !showAtual) return;
        // o acorde da música de agora (três por música)
        const { musica, acorde } = acordeDoToque(e.acorde);
        const lista = ind.setlist[musica]?.acordes.length
          ? ind.setlist[musica].acordes
          : ind.acordes;
        const id = lista[acorde % lista.length] ?? lista[0];
        if (!id) return;
        const g = gradeDaMusica(showAtual.inicio, musica);
        const t = momentoDoAcorde(relogio.audio(e.quando), ag, relogio.audio(g.t0), g.oitavo);
        if (finalAgendado && t >= finalAgendado.t) return;
        if (tocar(id, t, { ganho: 1, bus: 'show' })) {
          acordes.push({ acorde: e.acorde, quando: t });
          if (acordes.length > 40) acordes.splice(0, 20);
        }
        return;
      }
      case 'vilaFinal': {
        if (!ind) return;
        const q = relogio.audio(e.quando);
        if (!showAtual && vistaAgora?.show) comecarShow(vistaAgora.show.inicio, null, ag);
        if (finalAgendado) {
          // já soando, ou o mesmo (o que vem sozinho, agendado de antemão na hora certa): fica
          if (finalAgendado.t <= ag + 0.005 || q >= finalAgendado.t - 0.05) return;
        }
        agendarFinal(momentoDoFinal(q, ag), e.quem === 'auto');
        return;
      }
      case 'vilaEstojo':
        tocarBrinquedo('estojo');
        return;
      case 'vilaCaixa': {
        tocarToque('tum', { taxa: e.acesa ? 1 : 0.84, ganho: e.acesa ? 1 : 0.6 });
        // de noite, a caixa que acende (pela criança ou sozinha, antes do show) soa um acorde
        // do show: uma a uma, as três chamam a banda
        const id = ind?.acordes[e.i % ind.acordes.length];
        if (e.acesa && !e.dia && id && !showAtual)
          tocar(id, ag + 0.06, { ganho: GANHO_ACENDE, bus: 'show' });
        return;
      }
      case 'vilaLhama':
        tocarBrinquedo('lhama');
        return;
      default:
        return;
    }
  }

  // ------------------------------------------------------------------ os brinquedos
  /**
   * Um toque curto no grupo dos efeitos. Devolve se tocou (ou se vai tocar: o clipe ainda abrindo
   * entra assim que abrir, se for em até 0,3 s); `aoComecar` recebe o som quando ele começa.
   */
  function tocarToque(
    id: string,
    o: {
      taxa?: number;
      ganho?: number;
      chave?: string;
      aoComecar?: (x: Tocando) => void;
    } = {},
  ): boolean {
    if (!pronto || !podeTocar() || !ind?.clips[id]) return false;
    const chave = o.chave ?? id;
    const g = dbLin(GANHO_BRINQUEDO[chave] ?? -10) * (o.ganho ?? 1);
    const x = tocar(id, agora() + 0.01, { ganho: g, bus: 'efeitos', taxa: o.taxa });
    if (x) {
      o.aoComecar?.(x);
      return true;
    }
    const pedido = agora();
    void abrir(id).then((b) => {
      if (!b || agora() - pedido >= 0.3) return;
      const y = tocar(id, agora() + 0.01, { ganho: g, bus: 'efeitos', taxa: o.taxa });
      if (y) o.aoComecar?.(y);
    });
    return true;
  }

  /** Os sons de cada zona abrem quando a criança chega nela (o primeiro toque não espera). */
  const DA_ZONA: Record<string, readonly string[]> = {
    fliperama: ['fliperama_0', 'fliperama_1', 'fliperama_2'],
    rinque: ['ladrilho', 'rodinhas', 'batida'],
    festival: ['radio_liga', 'radio_desliga', 'batida', 'fita', 'contagem'],
    rua: ['orelhao', 'campainha', 'neon'],
    pracinha: ['campainha', 'neon'],
  };

  function ligarRadio(ag: number): boolean {
    const c = ind?.clips.batida;
    if (!ind || !c?.laco || !prontos.has('batida')) return false;
    const ancora = gradeBatida();
    const t = proximoTempo(ag + 0.15, ancora);
    radio = tocar('batida', t, {
      ganho: dbLin(GANHO_BRINQUEDO.batida) * volumes().musica,
      bus: 'efeitos',
      laco: true,
      dentro: posicaoNoLaco(t, ancora, c.laco / ind.taxa),
      fim: t + COMPASSOS_RADIO * COMPASSO,
    });
    return !!radio;
  }

  function tocarBrinquedo(qual: BrinquedoVila, i = 0): boolean {
    const ag = agora();
    const espera = ESPERA_TOQUE[qual] ?? 0;
    const ultimo = ultimoToque.get(qual) ?? -Infinity;
    if (ag - ultimo < espera) return false;
    ultimoToque.set(qual, ag);
    if (!pronto || !ind) return false;
    switch (qual) {
      case 'fliperama': {
        const lista = ind.fliperama;
        if (!lista.length) return false;
        const id = lista[((i % lista.length) + lista.length) % lista.length];
        // outra máquina (ou a mesma de novo): a musiquinha de antes sai, nunca duas juntas
        if (fliperama && !fliperama.parado) parar(fliperama, ag, 0.05);
        fliperama = null;
        return tocarToque(id, { chave: 'fliperama', aoComecar: (x) => (fliperama = x) });
      }
      case 'radio': {
        if (radio && !radio.parado && ag < radio.fim) {
          parar(radio, ag, 0.25);
          radio = null;
          tocarToque('radio_desliga', { chave: 'radio' });
          return true;
        }
        tocarToque('radio_liga', { chave: 'radio' });
        if (ligarRadio(ag)) return true;
        const pedido = ag;
        void abrir('batida').then((b) => {
          if (b && agora() - pedido < 0.3 && !radio) ligarRadio(agora());
        });
        return true;
      }
      case 'ladrilho': {
        const taxa = ESCALA_LADRILHO[passoLadrilho++ % ESCALA_LADRILHO.length];
        return tocarToque('ladrilho', { taxa });
      }
      case 'rodinhas':
        return tocarToque('rodinhas', { taxa: 0.94 + rng() * 0.12 });
      default:
        return tocarToque(qual);
    }
  }

  return {
    carregar,
    quadro,
    evento,
    tocarBrinquedo,
    /** Testes e depuração: o que está agendado e tocando. */
    info() {
      const ag = agora();
      return {
        pronto,
        falhou,
        relogio: relogio.dif,
        festival: Math.round(gFestival * 1000) / 1000,
        calar: Math.round(calar * 1000) / 1000,
        calarNatureza: Math.round(calarNat * 1000) / 1000,
        /** O ganho do barramento do palco agora (show, "Música" e distância). */
        ganhoShow: ganhoBus,
        zona: zonaAgora,
        ambiente: amb?.id ?? null,
        radio: !!radio && !radio.parado && ag < radio.fim,
        show: showAtual ? { inicio: showAtual.inicio, final: showAtual.final } : null,
        camadas: [0, 1, 2].map(
          (i) =>
            !!livres[i] ||
            [...agendados.values()].some(
              (x) => x && !x.parado && x.id.startsWith(`${ind?.camadas[i]}_`) && x.fim > ag,
            ),
        ),
        agendados: [...agendados.values()]
          .filter((x): x is Tocando => !!x)
          .map((x) => ({ id: x.id, ini: x.ini, fim: Number.isFinite(x.fim) ? x.fim : null })),
        acordes: acordes.slice(),
        final: finalAgendado ? { quando: finalAgendado.t, sozinho: finalAgendado.sozinho } : null,
        /** A passagem de som (sem show) e o aquecimento do palco (a noite chegou). */
        passagens,
        aquecimentos: aquecimentosSom,
        abertos: prontos.size,
        agora: ag,
        destino: !!destinoAmbiente,
      };
    },
    /** Sai do mundo: para tudo e solta o pacote. */
    liberar(): void {
      geracao++;
      const ag = agora();
      acabarShow(ag);
      for (let i = 0; i < 3; i++) {
        parar(livres[i], ag, 0.05);
        livres[i] = null;
      }
      parar(amb?.t ?? null, ag, 0.05);
      amb = null;
      parar(radio, ag, 0.05);
      radio = null;
      if (calar !== 0) op.aoCalarTrilha?.(0);
      calar = 0;
      if (calarNat !== 0) op.aoCalarNatureza?.(0);
      calarNat = 0;
      showAte = -Infinity;
      buffers.clear();
      prontos.clear();
      pacote = null;
      ind = null;
      pronto = false;
      carregando = false;
      busShow = null;
    },
  };
}

/** Os acordes do show (para os testes conferirem que o índice tem um por acorde). */
export const QUANTOS_ACORDES = ACORDES_SHOW.length;
/** As músicas do show (para os testes conferirem que o índice tem a setlist inteira). */
export const QUANTAS_MUSICAS = SETLIST.length;

/**
 * A interface (`src/ui/*`) não conhece o motor de som: pede o toque de um brinquedo da Vila Neon
 * por um evento da janela, e a cena toca (se o som estiver ligado e o pacote do bairro chegou).
 * Fora da Vila Neon, ou sem cena, o pedido não faz nada.
 */
export const EVENTO_BRINQUEDO_VILA = 'terrario:brinquedoVila';

export interface PedidoBrinquedoVila {
  qual: BrinquedoVila;
  /** Qual máquina do fliperama (0, 1, 2...). */
  i?: number;
}

/** Pede à cena o som de um brinquedo do bairro (ex.: `tocarBrinquedoVila('fliperama', 2)`). */
export function tocarBrinquedoVila(qual: BrinquedoVila, i?: number): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<PedidoBrinquedoVila>(EVENTO_BRINQUEDO_VILA, { detail: { qual, i } }),
  );
}

const BRINQUEDOS: readonly BrinquedoVila[] = [
  'fliperama',
  'radio',
  'fita',
  'ladrilho',
  'rodinhas',
  'orelhao',
  'campainha',
  'estojo',
  'tum',
  'lhama',
];

/** O pedido que veio pelo evento é de um brinquedo que existe? */
export function ehPedidoBrinquedoVila(v: unknown): v is PedidoBrinquedoVila {
  const p = v as PedidoBrinquedoVila | null;
  return (
    !!p &&
    typeof p === 'object' &&
    (BRINQUEDOS as readonly string[]).includes(p.qual) &&
    (p.i === undefined || (typeof p.i === 'number' && Number.isFinite(p.i)))
  );
}
