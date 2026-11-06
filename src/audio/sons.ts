import { criarGerador, criarVariador, jitter, type Gerador } from './variacao';
import type { ContextoAudio, FonteAudio, GrupoAudio, MotorAudio, NoAudio } from './motor';
import type { GrupoMaterial } from './materiais';

export type EventoSom =
  | 'golpe'
  | 'quebra'
  | 'colocar'
  | 'passo'
  | 'pulo'
  | 'aterrissagem'
  | 'troca'
  | 'recusa'
  | 'entrada'
  | 'coleta'
  | 'dano';

export const EVENTOS_SOM: readonly EventoSom[] = [
  'golpe',
  'quebra',
  'colocar',
  'passo',
  'pulo',
  'aterrissagem',
  'troca',
  'recusa',
  'entrada',
  'coleta',
  'dano',
];

export const VARIACOES_POR_EVENTO = 4;
export const DURACAO_MAXIMA_SOM = 2;
/** Ganho mestre da paisagem sonora (vento, bichos e trilha). */
export const GANHO_MAXIMO_AMBIENTE = 0.5;

export interface PerfilSom {
  frequencia: number;
  filtroHz: number;
  ganho: number;
  duracao: number;
  ruido: number;
  grupoAudio: GrupoAudio;
}

export interface ParametrosSom {
  frequencia: number;
  filtroHz: number;
  ganho: number;
  duracao: number;
  ruido: number;
  variacao: number;
}

interface BaseMaterial {
  frequencia: number;
  filtroHz: number;
}

const BASE_MATERIAL: Record<GrupoMaterial, BaseMaterial> = {
  terra: { frequencia: 110, filtroHz: 600 },
  pedra: { frequencia: 220, filtroHz: 1800 },
  areia: { frequencia: 160, filtroHz: 3200 },
  madeira: { frequencia: 300, filtroHz: 1100 },
  folhagem: { frequencia: 420, filtroHz: 4500 },
  cristal: { frequencia: 1600, filtroHz: 6500 },
};

interface BaseEvento {
  ganho: number;
  duracao: number;
  ruido: number;
  escalaTom: number;
  grupoAudio: GrupoAudio;
}

const BASE_EVENTO: Record<EventoSom, BaseEvento> = {
  golpe: { ganho: 0.5, duracao: 0.14, ruido: 0.8, escalaTom: 1, grupoAudio: 'efeitos' },
  quebra: { ganho: 0.8, duracao: 0.4, ruido: 0.9, escalaTom: 0.8, grupoAudio: 'efeitos' },
  colocar: { ganho: 0.6, duracao: 0.18, ruido: 0.5, escalaTom: 1.2, grupoAudio: 'efeitos' },
  passo: { ganho: 0.25, duracao: 0.12, ruido: 0.9, escalaTom: 0.7, grupoAudio: 'passos' },
  pulo: { ganho: 0.3, duracao: 0.16, ruido: 0.6, escalaTom: 1.1, grupoAudio: 'passos' },
  aterrissagem: { ganho: 0.4, duracao: 0.22, ruido: 0.9, escalaTom: 0.6, grupoAudio: 'passos' },
  troca: { ganho: 0.3, duracao: 0.08, ruido: 0.1, escalaTom: 1, grupoAudio: 'efeitos' },
  recusa: { ganho: 0.35, duracao: 0.2, ruido: 0.1, escalaTom: 1, grupoAudio: 'efeitos' },
  entrada: { ganho: 0.4, duracao: 0.5, ruido: 0.05, escalaTom: 1, grupoAudio: 'efeitos' },
  dano: { ganho: 0.6, duracao: 0.25, ruido: 0.6, escalaTom: 1, grupoAudio: 'efeitos' },
  coleta: { ganho: 0.28, duracao: 0.09, ruido: 0, escalaTom: 1, grupoAudio: 'efeitos' },
};

const FIXOS: Partial<Record<EventoSom, BaseMaterial>> = {
  troca: { frequencia: 880, filtroHz: 3000 },
  recusa: { frequencia: 130, filtroHz: 700 },
  entrada: { frequencia: 392, filtroHz: 2400 },
  coleta: { frequencia: 740, filtroHz: 3000 },
  dano: { frequencia: 190, filtroHz: 900 },
};

export const AMPLITUDE_TOM = 0.12;
export const AMPLITUDE_FILTRO = 0.2;
export const AMPLITUDE_VOLUME = 0.15;

export function perfilDoSom(evento: EventoSom, grupo: GrupoMaterial): PerfilSom {
  const e = BASE_EVENTO[evento];
  const m = FIXOS[evento] ?? BASE_MATERIAL[grupo];
  const tom = FIXOS[evento] ? 1 : e.escalaTom;
  return {
    frequencia: m.frequencia * tom,
    filtroHz: m.filtroHz,
    ganho: e.ganho,
    duracao: e.duracao,
    ruido: e.ruido,
    grupoAudio: e.grupoAudio,
  };
}

export function parametrosVariados(
  perfil: PerfilSom,
  variacao: number,
  rng: Gerador,
): ParametrosSom {
  // a variação desloca o tom de forma determinística, o sorteio refina
  const passo = (variacao - (VARIACOES_POR_EVENTO - 1) / 2) / VARIACOES_POR_EVENTO;
  const frequencia =
    perfil.frequencia * (1 + passo * AMPLITUDE_TOM * 2) * jitter(rng, 1, AMPLITUDE_TOM / 4);
  const filtroHz = perfil.filtroHz * jitter(rng, 1, AMPLITUDE_FILTRO);
  const ganho = Math.min(1, Math.max(0, perfil.ganho * jitter(rng, 1, AMPLITUDE_VOLUME)));
  return {
    frequencia,
    filtroHz,
    ganho,
    duracao: Math.min(perfil.duracao, DURACAO_MAXIMA_SOM - 0.01),
    ruido: perfil.ruido,
    variacao,
  };
}

// Contexto estendido: o motor só exige o mínimo, a síntese usa estes nós.
interface ParamEnvelope {
  value: number;
  setValueAtTime?(v: number, t: number): void;
  linearRampToValueAtTime?(v: number, t: number): void;
  exponentialRampToValueAtTime?(v: number, t: number): void;
}

interface GanhoSom extends NoAudio {
  gain: ParamEnvelope;
}

interface OscilatorSom extends FonteAudio {
  type: string;
  frequency: ParamEnvelope;
  detune?: ParamEnvelope;
}

interface FiltroSom extends NoAudio {
  type: string;
  frequency: ParamEnvelope;
  Q: ParamEnvelope;
}

interface BufferSom {
  getChannelData(canal: number): Float32Array;
}

interface FonteBufferSom extends FonteAudio {
  buffer: unknown;
  loop: boolean;
  playbackRate?: ParamEnvelope;
}

interface ConvolverSom extends NoAudio {
  buffer: unknown;
}

export interface ContextoSintese extends ContextoAudio {
  readonly sampleRate: number;
  createOscillator(): OscilatorSom;
  createBiquadFilter(): FiltroSom;
  createBuffer(canais: number, tamanho: number, taxa: number): BufferSom;
  createBufferSource(): FonteBufferSom;
  createConvolver?(): ConvolverSom;
}

const bufferesRuido = new WeakMap<object, BufferSom>();

function bufferDeRuido(ctx: ContextoSintese): BufferSom {
  let buf = bufferesRuido.get(ctx);
  if (!buf) {
    const taxa = ctx.sampleRate || 44100;
    buf = ctx.createBuffer(1, Math.floor(taxa * 2), taxa);
    const dados = buf.getChannelData(0);
    const rng = criarGerador(7919);
    for (let i = 0; i < dados.length; i++) dados[i] = rng() * 2 - 1;
    bufferesRuido.set(ctx, buf);
  }
  return buf;
}

// --- utilitários de envelope (toleram contextos falsos sem automação) ---

function definir(p: ParamEnvelope, v: number, t: number): void {
  if (p.setValueAtTime) p.setValueAtTime(v, t);
  else p.value = v;
}

function rampa(p: ParamEnvelope, v: number, t: number): void {
  if (p.linearRampToValueAtTime) p.linearRampToValueAtTime(v, t);
  else p.value = v;
}

function rampaExp(p: ParamEnvelope, v: number, t: number): void {
  if (p.exponentialRampToValueAtTime) p.exponentialRampToValueAtTime(Math.max(v, 0.0001), t);
  else rampa(p, v, t);
}

/** Envelope percussivo: ataque curto e queda exponencial. */
function golpeEnv(g: GanhoSom, t0: number, pico: number, ataque: number, queda: number): void {
  g.gain.value = 0;
  definir(g.gain, 0.0001, t0);
  rampa(g.gain, pico, t0 + ataque);
  rampaExp(g.gain, 0.0001, t0 + ataque + queda);
}

interface Peca {
  fonte: FonteAudio;
  fim: number;
}

function ruido(
  ctx: ContextoSintese,
  destino: NoAudio,
  t0: number,
  tipo: string,
  freq: number,
  q: number,
  pico: number,
  queda: number,
  ataque = 0.003,
  taxa = 1,
): Peca {
  const f = ctx.createBufferSource();
  f.buffer = bufferDeRuido(ctx);
  f.loop = true;
  if (f.playbackRate) f.playbackRate.value = taxa;
  const filtro = ctx.createBiquadFilter();
  filtro.type = tipo;
  filtro.frequency.value = freq;
  filtro.Q.value = q;
  const g = ctx.createGain() as GanhoSom;
  golpeEnv(g, t0, pico, ataque, queda);
  f.connect(filtro);
  filtro.connect(g);
  g.connect(destino);
  const fim = t0 + ataque + queda + 0.02;
  f.start(t0);
  f.stop(fim);
  return { fonte: f, fim };
}

function tom(
  ctx: ContextoSintese,
  destino: NoAudio,
  t0: number,
  tipo: string,
  f0: number,
  f1: number,
  pico: number,
  queda: number,
  ataque = 0.002,
): Peca {
  const o = ctx.createOscillator();
  o.type = tipo;
  o.frequency.value = f0;
  definir(o.frequency, f0, t0);
  if (f1 !== f0 && o.frequency.exponentialRampToValueAtTime) {
    rampaExp(o.frequency, f1, t0 + ataque + queda * 0.6);
  }
  const g = ctx.createGain() as GanhoSom;
  golpeEnv(g, t0, pico, ataque, queda);
  o.connect(g);
  g.connect(destino);
  const fim = t0 + ataque + queda + 0.02;
  o.start(t0);
  o.stop(fim);
  return { fonte: o, fim };
}

/** Uma "batida" de material: a base de passos, golpes, quebras e colocações. */
function batidaMaterial(
  ctx: ContextoSintese,
  out: NoAudio,
  t0: number,
  grupo: GrupoMaterial,
  par: ParametrosSom,
  forca: number,
  pecas: Peca[],
): void {
  const f = par.frequencia;
  const fc = par.filtroHz;
  const d = par.duracao;
  switch (grupo) {
    case 'terra':
      pecas.push(ruido(ctx, out, t0, 'lowpass', fc * 1.3, 0.7, 0.9 * forca, d * 0.9));
      pecas.push(tom(ctx, out, t0, 'sine', f, f * 0.5, 0.55 * forca, d * 0.7));
      break;
    case 'pedra':
      pecas.push(ruido(ctx, out, t0, 'bandpass', fc, 2.2, 1.1 * forca, d * 0.45, 0.001));
      pecas.push(ruido(ctx, out, t0, 'highpass', fc * 1.8, 0.8, 0.35 * forca, d * 0.25, 0.001));
      pecas.push(tom(ctx, out, t0, 'triangle', f, f * 0.65, 0.35 * forca, d * 0.5));
      break;
    case 'areia':
      pecas.push(ruido(ctx, out, t0, 'bandpass', fc, 0.9, 0.55 * forca, d * 1.3, 0.02));
      pecas.push(ruido(ctx, out, t0 + d * 0.35, 'highpass', fc * 0.8, 0.7, 0.35 * forca, d));
      break;
    case 'madeira':
      pecas.push(tom(ctx, out, t0, 'triangle', f, f * 0.75, 0.7 * forca, d * 0.8, 0.001));
      pecas.push(tom(ctx, out, t0, 'sine', f * 2.7, f * 2.3, 0.3 * forca, d * 0.45, 0.001));
      pecas.push(ruido(ctx, out, t0, 'bandpass', fc, 1.5, 0.45 * forca, d * 0.35, 0.001));
      break;
    case 'folhagem':
      for (let i = 0; i < 3; i++) {
        pecas.push(
          ruido(
            ctx,
            out,
            t0 + i * d * 0.22,
            'highpass',
            fc * (0.8 + i * 0.15),
            0.6,
            0.4 * forca,
            d * 0.5,
            0.01,
          ),
        );
      }
      break;
    case 'cristal': {
      const parciais = [1, 2.76, 5.4];
      parciais.forEach((m, i) => {
        pecas.push(
          tom(ctx, out, t0, 'sine', f * m, f * m, (0.45 / (i + 1)) * forca, d * (3 - i), 0.001),
        );
      });
      pecas.push(ruido(ctx, out, t0, 'highpass', fc, 0.7, 0.25 * forca, d * 0.3, 0.001));
      break;
    }
  }
}

const PENTATONICA = [293.66, 329.63, 369.99, 440, 493.88]; // ré, mi, fá#, lá, si

function desenharSom(par: ParametrosSom, evento: EventoSom, grupo: GrupoMaterial) {
  return (ctxBase: ContextoAudio, destino: NoAudio): FonteAudio => {
    const ctx = ctxBase as ContextoSintese;
    const t0 = ctx.currentTime;
    const out = ctx.createGain() as GanhoSom;
    out.gain.value = par.ganho;
    out.connect(destino);
    const pecas: Peca[] = [];
    switch (evento) {
      case 'passo':
        batidaMaterial(ctx, out, t0, grupo, par, 0.8, pecas);
        break;
      case 'golpe':
        batidaMaterial(ctx, out, t0, grupo, par, 1, pecas);
        break;
      case 'aterrissagem':
        batidaMaterial(ctx, out, t0, grupo, par, 1.1, pecas);
        pecas.push(tom(ctx, out, t0, 'sine', 90, 45, 0.6, 0.18));
        break;
      case 'pulo':
        pecas.push(
          ruido(ctx, out, t0, 'bandpass', par.filtroHz * 0.8, 1.2, 0.35, par.duracao, 0.03),
        );
        batidaMaterial(ctx, out, t0, grupo, par, 0.5, pecas);
        break;
      case 'quebra':
        for (let i = 0; i < 4; i++) {
          batidaMaterial(ctx, out, t0 + i * 0.045, grupo, par, 1 - i * 0.18, pecas);
        }
        pecas.push(tom(ctx, out, t0, 'sine', 120, 50, 0.5, 0.22));
        break;
      case 'colocar':
        batidaMaterial(ctx, out, t0, grupo, par, 0.9, pecas);
        pecas.push(tom(ctx, out, t0, 'sine', 160, 80, 0.55, 0.12));
        break;
      case 'troca':
        pecas.push(tom(ctx, out, t0, 'sine', par.frequencia, par.frequencia * 1.25, 0.35, 0.05));
        pecas.push(
          tom(ctx, out, t0 + 0.035, 'sine', par.frequencia * 1.5, par.frequencia * 1.5, 0.2, 0.06),
        );
        break;
      case 'recusa':
        pecas.push(tom(ctx, out, t0, 'triangle', par.frequencia, par.frequencia * 0.97, 0.5, 0.09));
        pecas.push(
          tom(
            ctx,
            out,
            t0 + 0.1,
            'triangle',
            par.frequencia * 0.75,
            par.frequencia * 0.7,
            0.5,
            0.12,
          ),
        );
        break;
      case 'dano':
        pecas.push(ruido(ctx, out, t0, 'lowpass', par.filtroHz, 0.8, 0.9, 0.16, 0.002));
        pecas.push(tom(ctx, out, t0, 'triangle', par.frequencia, par.frequencia * 0.6, 0.7, 0.22));
        break;
      case 'coleta':
        pecas.push(tom(ctx, out, t0, 'sine', par.frequencia, par.frequencia * 1.6, 0.4, 0.07));
        pecas.push(
          tom(ctx, out, t0 + 0.04, 'triangle', par.frequencia * 2, par.frequencia * 2, 0.15, 0.08),
        );
        break;
      case 'entrada':
        PENTATONICA.forEach((f, i) => {
          pecas.push(tom(ctx, out, t0 + i * 0.09, 'sine', f * 2, f * 2, 0.4, 0.9));
          pecas.push(tom(ctx, out, t0 + i * 0.09, 'triangle', f, f, 0.12, 0.6));
        });
        break;
    }
    const ultima = pecas.reduce((a, b) => (b.fim > a.fim ? b : a));
    for (const p of pecas) {
      if (p === ultima) continue;
      p.fonte.onended = () => {
        try {
          p.fonte.disconnect();
        } catch {
          // já desconectado
        }
      };
    }
    return ultima.fonte;
  };
}

let variadores = new Map<string, () => number>();
let rngSom: Gerador = criarGerador(1234);
let sementeAtual = 1234;

export function reiniciarVariacao(semente = 1234) {
  sementeAtual = semente;
  rngSom = criarGerador(semente);
  variadores = new Map();
}

function variadorDe(evento: EventoSom, grupo: GrupoMaterial) {
  const chave = `${evento}:${grupo}`;
  let v = variadores.get(chave);
  if (!v) {
    let h = sementeAtual;
    for (const c of chave) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0;
    v = criarVariador(h, VARIACOES_POR_EVENTO);
    variadores.set(chave, v);
  }
  return v;
}

/** Toca o som; devolve os parâmetros usados ou null se nenhuma voz foi criada. */
export function tocarSom(
  motor: MotorAudio,
  evento: EventoSom,
  grupo: GrupoMaterial = 'pedra',
): ParametrosSom | null {
  if (motor.estado !== 'ativo') return null;
  const perfil = perfilDoSom(evento, grupo);
  const par = parametrosVariados(perfil, variadorDe(evento, grupo)(), rngSom);
  const ok = motor.tocar(desenharSom(par, evento, grupo), { grupo: perfil.grupoAudio });
  return ok ? par : null;
}

export interface Ambiente {
  parar(): void;
  /** 0 de dia (pássaros), 1 de noite (grilos); muda a mistura. */
  definirNoite(noite: number): void;
  /** Volumes relativos (0 a 1) da trilha e da natureza. */
  definirVolumes(musica: number, natureza: number): void;
}

interface RelogioAgenda {
  setInterval(f: () => void, ms: number): unknown;
  clearInterval(id: unknown): void;
}

const relogioPadrao: RelogioAgenda | null =
  typeof setInterval === 'function'
    ? {
        setInterval: (f, ms) => setInterval(f, ms),
        clearInterval: (id) => clearInterval(id as ReturnType<typeof setInterval>),
      }
    : null;

/** Acordes da trilha (frequências), num modo maior suave. */
const ACORDES: number[][] = [
  [146.83, 220, 329.63, 369.99],
  [123.47, 185, 293.66, 440],
  [98, 146.83, 246.94, 329.63],
  [110, 164.81, 277.18, 329.63],
];
const MELODIA = [587.33, 659.25, 739.99, 880, 987.77, 1174.66];

function respostaReverb(ctx: ContextoSintese, segundos: number): BufferSom {
  const taxa = ctx.sampleRate || 44100;
  const n = Math.floor(taxa * segundos);
  const buf = ctx.createBuffer(2, n, taxa);
  const rng = criarGerador(4242);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (rng() * 2 - 1) * Math.pow(1 - i / n, 3);
  }
  return buf;
}

/**
 * Paisagem sonora: vento contínuo, pássaros de dia, grilos de noite e uma
 * trilha generativa suave com reverb. Ocupa uma única voz de prioridade alta.
 */
export function iniciarAmbiente(
  motor: MotorAudio,
  relogio: RelogioAgenda | null = relogioPadrao,
): Ambiente {
  let principal: FonteAudio | null = null;
  const vivas = new Set<FonteAudio>();
  let timer: unknown = null;
  let noite = 0;
  let volMusica = 1;
  let volNatureza = 1;
  let ctxA: ContextoSintese | null = null;
  let busNatureza: GanhoSom | null = null;
  let busMusica: GanhoSom | null = null;
  let proximoAcorde = 0;
  let proximaNota = 0;
  let proximoBicho = 0;
  let acorde = 0;
  const rng = criarGerador(2026);

  function registrar(p: Peca): void {
    vivas.add(p.fonte);
    p.fonte.onended = () => {
      vivas.delete(p.fonte);
      try {
        p.fonte.disconnect();
      } catch {
        // já desconectado
      }
    };
  }

  function nota(t: number, f: number, ganho: number, ataque: number, dur: number): void {
    const ctx = ctxA!;
    for (const desvio of [-5, 5]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      if (o.detune) o.detune.value = desvio;
      const filtro = ctx.createBiquadFilter();
      filtro.type = 'lowpass';
      filtro.frequency.value = 1400;
      filtro.Q.value = 0.3;
      const g = ctx.createGain() as GanhoSom;
      g.gain.value = 0;
      definir(g.gain, 0, t);
      rampa(g.gain, ganho, t + ataque);
      rampa(g.gain, ganho * 0.7, t + dur * 0.6);
      rampa(g.gain, 0, t + dur);
      o.connect(filtro);
      filtro.connect(g);
      g.connect(busMusica!);
      o.start(t);
      o.stop(t + dur + 0.05);
      registrar({ fonte: o, fim: t + dur });
    }
  }

  function sino(t: number, f: number, ganho: number): void {
    registrar(tom(ctxA!, busMusica!, t, 'sine', f, f, ganho, 2.2, 0.004));
    registrar(tom(ctxA!, busMusica!, t, 'sine', f * 3, f * 3, ganho * 0.12, 0.8, 0.004));
  }

  function passaro(t: number): void {
    const base = 2200 + rng() * 1800;
    const n = 2 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) {
      const ti = t + i * (0.09 + rng() * 0.06);
      const sobe = rng() > 0.5;
      registrar(
        tom(
          ctxA!,
          busNatureza!,
          ti,
          'sine',
          base * (sobe ? 0.8 : 1.25),
          base * (sobe ? 1.3 : 0.85),
          0.11,
          0.07,
          0.006,
        ),
      );
    }
  }

  function grilo(t: number): void {
    const f = 4300 + rng() * 600;
    for (let i = 0; i < 4; i++) {
      registrar(tom(ctxA!, busNatureza!, t + i * 0.055, 'sine', f, f, 0.035, 0.03, 0.004));
    }
  }

  function agendar(): void {
    if (!ctxA || !busMusica) return;
    const agora = ctxA.currentTime;
    const ate = agora + 0.6;
    while (proximoAcorde < ate) {
      const t = Math.max(proximoAcorde, agora + 0.05);
      for (const f of ACORDES[acorde % ACORDES.length]) nota(t, f, 0.05, 2.5, 9);
      acorde++;
      proximoAcorde = t + 8;
    }
    while (proximaNota < ate) {
      const t = Math.max(proximaNota, agora + 0.05);
      if (rng() < 0.55) {
        const f = MELODIA[Math.floor(rng() * MELODIA.length)];
        sino(t, f, 0.06);
        sino(t + 0.375, f, 0.025);
      }
      proximaNota = t + 1.5 + rng() * 2.5;
    }
    while (proximoBicho < ate) {
      const t = Math.max(proximoBicho, agora + 0.05);
      if (rng() < noite) {
        grilo(t);
        proximoBicho = t + 0.35 + rng() * 0.5;
      } else {
        if (rng() < 0.6) passaro(t);
        proximoBicho = t + 1.2 + rng() * 3;
      }
    }
  }

  const ok = motor.estado === 'ativo' && !motor.mudo;
  if (ok) {
    motor.tocar(
      (ctxBase, destino) => {
        const ctx = ctxBase as ContextoSintese;
        ctxA = ctx;
        const mestre = ctx.createGain() as GanhoSom;
        mestre.gain.value = GANHO_MAXIMO_AMBIENTE;
        mestre.connect(destino);
        busNatureza = ctx.createGain() as GanhoSom;
        busNatureza.gain.value = 0.8 * volNatureza;
        busNatureza.connect(mestre);
        busMusica = ctx.createGain() as GanhoSom;
        busMusica.gain.value = 0.6 * volMusica;
        busMusica.connect(mestre);
        if (ctx.createConvolver) {
          const rev = ctx.createConvolver();
          rev.buffer = respostaReverb(ctx, 3.2);
          const envio = ctx.createGain();
          envio.gain.value = 0.55;
          busMusica.connect(envio);
          busNatureza.connect(envio);
          envio.connect(rev);
          rev.connect(mestre);
        }
        // vento: ruído grave com filtro que respira devagar
        const vento = ctx.createBufferSource();
        vento.buffer = bufferDeRuido(ctx);
        vento.loop = true;
        const filtro = ctx.createBiquadFilter();
        filtro.type = 'bandpass';
        filtro.frequency.value = 380;
        filtro.Q.value = 0.7;
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.07;
        const prof = ctx.createGain();
        prof.gain.value = 220;
        lfo.connect(prof);
        prof.connect(filtro.frequency);
        const gVento = ctx.createGain();
        gVento.gain.value = 0.35;
        vento.connect(filtro);
        filtro.connect(gVento);
        gVento.connect(busNatureza);
        const t = ctx.currentTime;
        vento.start(t);
        lfo.start(t);
        vivas.add(lfo);
        proximoAcorde = t + 0.5;
        proximaNota = t + 3;
        proximoBicho = t + 1;
        principal = vento;
        return vento;
      },
      { grupo: 'ambiente', prioridade: 'alta' },
    );
    if (relogio) timer = relogio.setInterval(agendar, 200);
  }
  return {
    definirNoite(n) {
      noite = Math.max(0, Math.min(1, n));
    },
    definirVolumes(musica, natureza) {
      volMusica = musica;
      volNatureza = natureza;
      if (busMusica) busMusica.gain.value = 0.6 * musica;
      if (busNatureza) busNatureza.gain.value = 0.8 * natureza;
    },
    parar() {
      if (timer !== null && relogio) relogio.clearInterval(timer);
      timer = null;
      for (const f of vivas) {
        try {
          f.stop();
        } catch {
          // já parada
        }
      }
      vivas.clear();
      if (!principal) return;
      const f = principal;
      principal = null;
      try {
        f.stop();
      } catch {
        // já parada
      }
      f.onended?.();
    },
  };
}
