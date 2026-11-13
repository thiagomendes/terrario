import {
  EVENTOS_MATERIAL,
  VARIACOES_AMOSTRA,
  sintetizarAmostra,
  type EventoMaterial,
} from './amostras';
import { criarGerador, criarVariador, jitter, type Gerador } from './variacao';
import type { ContextoAudio, Desenho, FonteAudio, GrupoAudio, MotorAudio, NoAudio } from './motor';
import type { GrupoMaterial } from './materiais';
import { povoadoDoTema, tema } from '../temas/ativo';
import type { NaturezaTema, PioCriatura, VozCriatura } from '../temas/tipos';
import type { TipoSer } from '../jogo/criaturas';
import { GANHO_TRILHA_GRAVADA } from './trilha';

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
  | 'dano'
  | 'comer'
  | 'espectro'
  | 'trovao'
  | 'nhac'
  | 'agua'
  | 'nado'
  | 'pipoca'
  | 'estalo'
  | 'palmas'
  | 'aceno'
  | 'brilho'
  | 'assobio'
  | 'danca'
  | 'apontar'
  | 'sentar'
  | 'rodaAbrir'
  | 'rodaFechar'
  | 'mochila'
  | 'criar'
  | 'conquista'
  | 'festa'
  | 'toc';

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
  'comer',
  'espectro',
  'trovao',
  'nhac',
  'agua',
  'nado',
  'pipoca',
  'estalo',
  'palmas',
  'aceno',
  'brilho',
  'assobio',
  'danca',
  'apontar',
  'sentar',
  'rodaAbrir',
  'rodaFechar',
  'mochila',
  'criar',
  'conquista',
  'festa',
  'toc',
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
  trovao: { ganho: 0.9, duracao: 1.9, ruido: 1, escalaTom: 1, grupoAudio: 'efeitos' },
  espectro: { ganho: 0.35, duracao: 1.2, ruido: 0.5, escalaTom: 1, grupoAudio: 'efeitos' },
  comer: { ganho: 0.4, duracao: 0.3, ruido: 0.8, escalaTom: 1, grupoAudio: 'efeitos' },
  dano: { ganho: 0.6, duracao: 0.25, ruido: 0.6, escalaTom: 1, grupoAudio: 'efeitos' },
  coleta: { ganho: 0.28, duracao: 0.09, ruido: 0, escalaTom: 1, grupoAudio: 'efeitos' },
  // spec 019 (T05): ações, mundo e interface. Curtos e macios: nenhum passa do golpe de bloco.
  nhac: { ganho: 0.32, duracao: 0.12, ruido: 0.8, escalaTom: 1, grupoAudio: 'efeitos' },
  agua: { ganho: 0.42, duracao: 0.45, ruido: 0.9, escalaTom: 1, grupoAudio: 'efeitos' },
  nado: { ganho: 0.2, duracao: 0.35, ruido: 0.9, escalaTom: 1, grupoAudio: 'passos' },
  pipoca: { ganho: 0.42, duracao: 1.1, ruido: 0.8, escalaTom: 1, grupoAudio: 'efeitos' },
  estalo: { ganho: 0.22, duracao: 0.7, ruido: 0.9, escalaTom: 1, grupoAudio: 'efeitos' },
  palmas: { ganho: 0.3, duracao: 1.4, ruido: 0.9, escalaTom: 1, grupoAudio: 'efeitos' },
  aceno: { ganho: 0.16, duracao: 0.6, ruido: 0, escalaTom: 1, grupoAudio: 'efeitos' },
  brilho: { ganho: 0.16, duracao: 0.6, ruido: 0, escalaTom: 1, grupoAudio: 'efeitos' },
  assobio: { ganho: 0.13, duracao: 0.6, ruido: 0, escalaTom: 1, grupoAudio: 'efeitos' },
  danca: { ganho: 0.14, duracao: 1.2, ruido: 0, escalaTom: 1, grupoAudio: 'efeitos' },
  apontar: { ganho: 0.12, duracao: 0.08, ruido: 0, escalaTom: 1, grupoAudio: 'efeitos' },
  sentar: { ganho: 0.2, duracao: 0.16, ruido: 0.6, escalaTom: 1, grupoAudio: 'efeitos' },
  rodaAbrir: { ganho: 0.18, duracao: 0.09, ruido: 0, escalaTom: 1, grupoAudio: 'efeitos' },
  rodaFechar: { ganho: 0.14, duracao: 0.09, ruido: 0, escalaTom: 1, grupoAudio: 'efeitos' },
  mochila: { ganho: 0.2, duracao: 0.16, ruido: 0.8, escalaTom: 1, grupoAudio: 'efeitos' },
  criar: { ganho: 0.2, duracao: 0.4, ruido: 0, escalaTom: 1, grupoAudio: 'efeitos' },
  conquista: { ganho: 0.22, duracao: 0.9, ruido: 0, escalaTom: 1, grupoAudio: 'efeitos' },
  festa: { ganho: 0.16, duracao: 0.8, ruido: 0.2, escalaTom: 1, grupoAudio: 'efeitos' },
  toc: { ganho: 0.28, duracao: 0.07, ruido: 0.4, escalaTom: 1, grupoAudio: 'efeitos' },
};

const FIXOS: Partial<Record<EventoSom, BaseMaterial>> = {
  troca: { frequencia: 880, filtroHz: 3000 },
  recusa: { frequencia: 130, filtroHz: 700 },
  entrada: { frequencia: 392, filtroHz: 2400 },
  coleta: { frequencia: 740, filtroHz: 3000 },
  dano: { frequencia: 190, filtroHz: 900 },
  comer: { frequencia: 300, filtroHz: 1800 },
  espectro: { frequencia: 210, filtroHz: 700 },
  trovao: { frequencia: 45, filtroHz: 160 },
  nhac: { frequencia: 240, filtroHz: 1700 },
  agua: { frequencia: 520, filtroHz: 1400 },
  nado: { frequencia: 420, filtroHz: 750 },
  pipoca: { frequencia: 700, filtroHz: 1800 },
  estalo: { frequencia: 300, filtroHz: 2600 },
  palmas: { frequencia: 300, filtroHz: 1500 },
  aceno: { frequencia: 880, filtroHz: 4000 },
  brilho: { frequencia: 1175, filtroHz: 5000 },
  assobio: { frequencia: 1400, filtroHz: 4000 },
  danca: { frequencia: 587, filtroHz: 3000 },
  apontar: { frequencia: 1250, filtroHz: 3000 },
  sentar: { frequencia: 150, filtroHz: 450 },
  rodaAbrir: { frequencia: 520, filtroHz: 3000 },
  rodaFechar: { frequencia: 820, filtroHz: 3000 },
  mochila: { frequencia: 200, filtroHz: 2600 },
  criar: { frequencia: 587, filtroHz: 3000 },
  conquista: { frequencia: 587, filtroHz: 3000 },
  festa: { frequencia: 1500, filtroHz: 4000 },
  toc: { frequencia: 520, filtroHz: 1200 },
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
  /** Ganho do filtro de pico (dB). */
  gain?: ParamEnvelope;
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

/**
 * Começa a fonte e já agenda o fim. Nenhum som fica preso: com hora inválida (NaN) a fonte
 * nem começa, e se o navegador recusar o "parar" agendado, ela é desligada na hora (um som
 * sem fim virava um "grilo contínuo" que só parava fechando o jogo).
 */
export function comecarEParar(
  fonte: FonteAudio & { start(t?: number): void; stop(t?: number): void },
  t0: number,
  fim: number,
): void {
  if (!Number.isFinite(t0) || !Number.isFinite(fim) || fim < t0) {
    try {
      fonte.disconnect();
    } catch {
      // nada a fazer
    }
    return;
  }
  fonte.start(t0);
  try {
    fonte.stop(fim);
  } catch {
    try {
      fonte.stop();
    } catch {
      // já parada
    }
    try {
      fonte.disconnect();
    } catch {
      // já desconectada
    }
  }
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
  comecarEParar(f, t0, fim);
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
  comecarEParar(o, t0, fim);
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

/** Amostras PCM por contexto (geradas uma vez, na primeira vez que tocam). */
const amostrasPorContexto = new WeakMap<object, Map<string, BufferSom>>();
function bufferDaAmostra(
  ctx: ContextoSintese,
  ev: EventoMaterial,
  grupo: GrupoMaterial,
  variacao: number,
): BufferSom {
  let mapa = amostrasPorContexto.get(ctx);
  if (!mapa) {
    mapa = new Map();
    amostrasPorContexto.set(ctx, mapa);
  }
  const k = `${ev}|${grupo}|${variacao}`;
  let buf = mapa.get(k);
  if (!buf) {
    const taxa = ctx.sampleRate || 44100;
    const dados = sintetizarAmostra(ev, grupo, variacao, taxa);
    buf = ctx.createBuffer(1, dados.length, taxa);
    buf.getChannelData(0).set(dados);
    mapa.set(k, buf);
  }
  return buf;
}

/**
 * Gera as amostras com antecedência, uma por vez em momentos ociosos (cada uma custa
 * alguns ms): o primeiro golpe em cada material não engasga o quadro.
 */
export function aquecerAmostras(motor: MotorAudio, grupos: readonly GrupoMaterial[]): void {
  const ctx = motor.contexto as ContextoSintese | null;
  if (!ctx) return;
  // primeiro os mais comuns (passos e golpes), depois o resto
  const ordem: EventoMaterial[] = ['passo', 'golpe', 'quebra', 'colocar', 'aterrissagem', 'pulo'];
  const fila: [EventoMaterial, GrupoMaterial, number][] = [];
  for (let v = 0; v < VARIACOES_AMOSTRA; v++)
    for (const ev of ordem) for (const g of grupos) fila.push([ev, g, v]);
  const ocioso = (f: () => void) => {
    const ric = (globalThis as { requestIdleCallback?: (cb: () => void, o?: unknown) => void })
      .requestIdleCallback;
    if (ric) ric(f, { timeout: 500 });
    else setTimeout(f, 40);
  };
  const proximo = () => {
    const item = fila.shift();
    if (!item) return;
    bufferDaAmostra(ctx, item[0], item[1], item[2]);
    ocioso(proximo);
  };
  ocioso(proximo);
}

/**
 * Sons de material (quebrar, golpear, pisar, colocar...) tocam amostras sintetizadas
 * do material — cascalho, lascas, farfalhar — com leve variação de tom e volume.
 */
function desenharAmostra(par: ParametrosSom, evento: EventoMaterial, grupo: GrupoMaterial) {
  return (ctxBase: ContextoAudio, destino: NoAudio): FonteAudio => {
    const ctx = ctxBase as ContextoSintese;
    const t0 = ctx.currentTime;
    const out = ctx.createGain() as GanhoSom;
    out.gain.value = par.ganho;
    out.connect(destino);
    const f = ctx.createBufferSource();
    // o tema pode trocar a receita (biscoito soa como madeira seca) e o tom do material
    const ajuste = tema().materiais[grupo];
    const receita = ajuste?.base ?? grupo;
    f.buffer = bufferDaAmostra(ctx, evento, receita, par.variacao % VARIACOES_AMOSTRA);
    f.loop = false;
    // tom levemente diferente a cada vez (o perfil já sorteia a frequência)
    const base = perfilDoSom(evento, grupo).frequencia;
    const taxa = Math.max(0.82, Math.min(1.18, par.frequencia / base));
    const tom = Math.max(0.5, Math.min(2, ajuste?.tom ?? 1));
    if (f.playbackRate) f.playbackRate.value = taxa * tom;
    f.connect(out);
    f.start(t0);
    return f;
  };
}

function desenharSom(par: ParametrosSom, evento: EventoSom, grupo: GrupoMaterial) {
  if ((EVENTOS_MATERIAL as readonly string[]).includes(evento)) {
    return desenharAmostra(par, evento as EventoMaterial, grupo);
  }
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
      case 'trovao':
        pecas.push(ruido(ctx, out, t0, 'lowpass', par.filtroHz, 0.7, 1, 1.8, 0.08));
        pecas.push(ruido(ctx, out, t0 + 0.25, 'lowpass', par.filtroHz * 0.7, 0.7, 0.8, 1.5, 0.2));
        pecas.push(tom(ctx, out, t0, 'sine', par.frequencia, par.frequencia * 0.6, 0.6, 1.4, 0.05));
        break;
      case 'espectro':
        pecas.push(
          tom(ctx, out, t0, 'sine', par.frequencia * 1.2, par.frequencia * 0.6, 0.35, 1.1, 0.25),
        );
        pecas.push(
          tom(
            ctx,
            out,
            t0 + 0.05,
            'triangle',
            par.frequencia * 1.5,
            par.frequencia * 0.75,
            0.12,
            1.0,
            0.3,
          ),
        );
        pecas.push(ruido(ctx, out, t0, 'bandpass', par.filtroHz, 3, 0.3, 1.0, 0.4));
        break;
      case 'comer':
        for (let i = 0; i < 3; i++) {
          pecas.push(
            ruido(
              ctx,
              out,
              t0 + i * 0.11,
              'bandpass',
              par.filtroHz * (1 + i * 0.1),
              1.4,
              0.6,
              0.07,
              0.004,
            ),
          );
        }
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
      default:
        desenharNovo(ctx, out, t0, evento, par, pecas);
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

/**
 * Spec 019 (T05): os sons novos de ações, mundo e interface. Todos curtos e macios, feitos de
 * tons e de ruído filtrado, sem nada agudo e cortante.
 */
function desenharNovo(
  ctx: ContextoSintese,
  out: NoAudio,
  t0: number,
  evento: EventoSom,
  par: ParametrosSom,
  pecas: Peca[],
): void {
  const f = par.frequencia;
  // um sorteio fixo pela versão (as 4 versões soam diferentes, cada uma sempre igual)
  const sorte = criarGerador(0x0190 + par.variacao * 7919);
  switch (evento) {
    case 'nhac':
      // a mordida final: um "nhac" só (o mastigar é o 'comer')
      pecas.push(ruido(ctx, out, t0, 'bandpass', par.filtroHz, 1.3, 0.7, 0.06, 0.004));
      pecas.push(tom(ctx, out, t0 + 0.01, 'triangle', f, f * 0.7, 0.35, 0.08));
      break;
    case 'agua':
      // chuá: o corpo d'água (grave), o espirro (médio) e três bolhinhas que sobem
      pecas.push(ruido(ctx, out, t0, 'lowpass', par.filtroHz, 0.7, 0.8, 0.32, 0.012));
      pecas.push(ruido(ctx, out, t0 + 0.02, 'bandpass', par.filtroHz * 2.2, 1, 0.35, 0.18, 0.01));
      for (let i = 0; i < 3; i++) {
        const b = f * (1 + sorte() * 0.6);
        pecas.push(tom(ctx, out, t0 + 0.12 + i * 0.07, 'sine', b, b * 2, 0.22, 0.05));
      }
      break;
    case 'nado':
      // braçada: um "fuuu" de água que sobe devagar e uma bolha
      pecas.push(ruido(ctx, out, t0, 'bandpass', par.filtroHz, 0.9, 0.7, 0.22, 0.09));
      pecas.push(tom(ctx, out, t0 + 0.2, 'sine', f, f * 1.8, 0.15, 0.05));
      break;
    case 'pipoca':
      // o "trovão" do Doce Reino: pipoca estourando, sem estrondo
      for (let i = 0, t = t0; i < 9; i++) {
        const k = 0.8 + sorte() * 0.5;
        pecas.push(ruido(ctx, out, t, 'bandpass', par.filtroHz * k, 2, 0.6, 0.03, 0.002));
        pecas.push(tom(ctx, out, t, 'sine', f * k, f * k * 0.5, 0.35, 0.05));
        t += 0.05 + sorte() * 0.11;
      }
      break;
    case 'estalo':
      // a tempestade solar na Lua: chiadinho de rádio do capacete (no vácuo não há trovão)
      for (let i = 0; i < 6; i++)
        pecas.push(
          ruido(ctx, out, t0 + sorte() * 0.5, 'bandpass', par.filtroHz, 3, 0.5, 0.02, 0.002),
        );
      pecas.push(ruido(ctx, out, t0, 'bandpass', par.filtroHz * 0.6, 4, 0.18, 0.5, 0.05));
      break;
    case 'palmas':
      // palminhas: 6 batidas no ritmo do gesto (1,8 s)
      for (let i = 0; i < 6; i++) {
        const t = t0 + i * 0.22 + sorte() * 0.02;
        pecas.push(
          ruido(
            ctx,
            out,
            t,
            'bandpass',
            par.filtroHz * (0.9 + sorte() * 0.3),
            1.6,
            0.8,
            0.045,
            0.002,
          ),
        );
      }
      break;
    case 'aceno':
      // "plim" suave de sino
      pecas.push(tom(ctx, out, t0, 'sine', f, f, 0.5, 0.5, 0.005));
      pecas.push(tom(ctx, out, t0 + 0.09, 'sine', f * 1.5, f * 1.5, 0.35, 0.45, 0.005));
      break;
    case 'brilho':
      // estrelinhas que sobem (comemorar)
      [1, 1.122, 1.26, 1.498, 1.682].forEach((m, i) =>
        pecas.push(tom(ctx, out, t0 + i * 0.06, 'sine', f * m, f * m, 0.4, 0.28, 0.004)),
      );
      break;
    case 'assobio':
      // "fiu-fiu" de chamar
      pecas.push(tom(ctx, out, t0, 'sine', f, f * 1.5, 0.6, 0.16, 0.03));
      pecas.push(tom(ctx, out, t0 + 0.24, 'sine', f * 1.05, f * 1.6, 0.6, 0.22, 0.03));
      break;
    case 'danca':
      // musiquinha de 6 notas (ré, mi, fá#, lá, fá#, ré agudo)
      [1, 1.122, 1.26, 1.498, 1.26, 2].forEach((m, i) => {
        pecas.push(tom(ctx, out, t0 + i * 0.16, 'triangle', f * m, f * m, 0.5, 0.18, 0.005));
        pecas.push(tom(ctx, out, t0 + i * 0.16, 'sine', f * m * 2, f * m * 2, 0.12, 0.12, 0.005));
      });
      break;
    case 'apontar':
      pecas.push(tom(ctx, out, t0, 'sine', f, f * 1.1, 0.5, 0.05, 0.003));
      break;
    case 'sentar':
      // "puf" de sentar no chão
      pecas.push(ruido(ctx, out, t0, 'lowpass', par.filtroHz, 0.7, 0.6, 0.12, 0.006));
      pecas.push(tom(ctx, out, t0, 'sine', f, f * 0.6, 0.5, 0.12));
      break;
    case 'rodaAbrir':
      // "plop" que sobe
      pecas.push(tom(ctx, out, t0, 'sine', f, f * 1.7, 0.6, 0.08, 0.004));
      break;
    case 'rodaFechar':
      pecas.push(tom(ctx, out, t0, 'sine', f, f * 0.55, 0.6, 0.08, 0.004));
      break;
    case 'mochila':
      // abrir a bolsa: dois "zz" de zíper e o pano
      pecas.push(ruido(ctx, out, t0, 'bandpass', par.filtroHz, 3, 0.45, 0.05, 0.01));
      pecas.push(ruido(ctx, out, t0 + 0.06, 'bandpass', par.filtroHz * 1.35, 3, 0.4, 0.06, 0.01));
      pecas.push(ruido(ctx, out, t0 + 0.04, 'lowpass', 500, 0.7, 0.3, 0.1, 0.01));
      pecas.push(tom(ctx, out, t0, 'sine', f, f * 0.8, 0.25, 0.1));
      break;
    case 'criar':
      // "tchanam": duas notas, a segunda mais alta e mais longa
      pecas.push(tom(ctx, out, t0, 'triangle', f, f, 0.45, 0.12, 0.004));
      pecas.push(tom(ctx, out, t0 + 0.12, 'triangle', f * 1.498, f * 1.498, 0.5, 0.32, 0.004));
      pecas.push(tom(ctx, out, t0 + 0.12, 'sine', f * 2.996, f * 2.996, 0.12, 0.25, 0.004));
      break;
    case 'conquista':
      // arpejo de conquista (ré, fá#, lá, ré) com brilho no fim
      [1, 1.26, 1.498, 2].forEach((m, i) => {
        pecas.push(tom(ctx, out, t0 + i * 0.1, 'sine', f * m, f * m, 0.45, 0.5, 0.005));
        pecas.push(
          tom(ctx, out, t0 + i * 0.1, 'triangle', f * m * 0.5, f * m * 0.5, 0.15, 0.35, 0.005),
        );
      });
      pecas.push(tom(ctx, out, t0 + 0.42, 'sine', f * 4, f * 4, 0.12, 0.4, 0.005));
      break;
    case 'festa':
      // confete: um "pof" macio e estrelinhas soltas
      pecas.push(ruido(ctx, out, t0, 'bandpass', 900, 1, 0.4, 0.06, 0.004));
      for (let i = 0; i < 8; i++) {
        const k = 1 + sorte() * 1.2;
        pecas.push(
          tom(ctx, out, t0 + 0.05 + sorte() * 0.5, 'sine', f * k, f * k, 0.3, 0.12, 0.003),
        );
      }
      break;
    case 'toc':
      // cadeado: "toc" de madeira, baixinho e sem bronca
      pecas.push(tom(ctx, out, t0, 'sine', f, f * 0.9, 0.6, 0.05, 0.002));
      pecas.push(ruido(ctx, out, t0, 'bandpass', par.filtroHz, 3, 0.3, 0.025, 0.002));
      break;
    default:
      pecas.push(tom(ctx, out, t0, 'sine', f, f, 0.3, 0.05));
  }
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

/** Os sons novos da spec 019 (T05): ações, mundo, gestos e interface. */
export const SONS_NOVOS_019: readonly EventoSom[] = [
  'nhac',
  'agua',
  'nado',
  'pipoca',
  'estalo',
  'palmas',
  'aceno',
  'brilho',
  'assobio',
  'danca',
  'apontar',
  'sentar',
  'rodaAbrir',
  'rodaFechar',
  'mochila',
  'criar',
  'conquista',
  'festa',
  'toc',
];

let observador: ((evento: EventoSom) => void) | null = null;
/** Só os testes de tela: avisa cada som que tocou (null desliga). */
export function observarSons(f: ((evento: EventoSom) => void) | null): void {
  observador = f;
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
  if (ok) observador?.(evento);
  return ok ? par : null;
}

/**
 * Voz de criatura do tema: varreduras de tom repetidas, com vibrato e sopro opcionais.
 * `volume` 0..1 (distância) e variação leve de tom a cada vez.
 */
export function desenharVoz(pio: PioCriatura, volume: number, variacao: number): Desenho {
  return (ctxBase, destino) => {
    const ctx = ctxBase as ContextoSintese;
    const t0 = ctx.currentTime;
    const out = ctx.createGain() as GanhoSom;
    out.gain.value = 0.22 * volume * (pio.ganho ?? 1);
    out.connect(destino);
    const k = 1 + (variacao - 0.5) * 0.08;
    // ondas ricas soam mais alto: compensa
    const g = pio.onda === 'sine' ? 1 : pio.onda === 'triangle' ? 0.85 : 0.4;
    const pecas: Peca[] = [];
    for (let r = 0; r < Math.max(1, pio.repeticoes); r++) {
      const t = t0 + r * (pio.dur + pio.intervalo);
      const o = ctx.createOscillator();
      o.type = pio.onda;
      definir(o.frequency, pio.de * k, t);
      if (pio.vibrato && pio.vibrato > 0) {
        // vibrato em degraus de rampa (funciona em qualquer contexto)
        const passos = Math.max(2, Math.floor(pio.dur * pio.vibrato * 2));
        for (let j = 1; j <= passos; j++) {
          const u = j / passos;
          const f = (pio.de + (pio.ate - pio.de) * u) * k * (1 + (j % 2 ? 0.025 : -0.025));
          rampa(o.frequency, f, t + u * pio.dur);
        }
      } else rampaExp(o.frequency, pio.ate * k, t + pio.dur);
      const ge = ctx.createGain() as GanhoSom;
      ge.gain.value = 0;
      definir(ge.gain, 0.0001, t);
      rampa(ge.gain, g, t + Math.min(0.02, pio.dur * 0.2));
      rampa(ge.gain, g * 0.7, t + pio.dur * 0.7);
      rampa(ge.gain, 0.0001, t + pio.dur);
      o.connect(ge);
      ge.connect(out);
      o.start(t);
      o.stop(t + pio.dur + 0.03);
      pecas.push({ fonte: o, fim: t + pio.dur + 0.03 });
      if (pio.ruido && pio.ruido > 0)
        pecas.push(
          ruido(
            ctx,
            out,
            t,
            'bandpass',
            (pio.de + pio.ate) * 0.5 * k,
            1.2,
            pio.ruido * 0.8,
            pio.dur * 0.9,
            0.01,
          ),
        );
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

/** O som da tempestade no tema (spec 019): trovão, pipoca (Doce) ou estalo de rádio (Lua). */
export function somDoTrovao(n: Pick<NaturezaTema, 'trovao'>): EventoSom {
  return n.trovao ?? 'trovao';
}

/** Quanto chiado de chuva toca (0 a 1): neve é um quarto e no vácuo não há chiado. */
export function chuvaAudivel(
  n: Pick<NaturezaTema, 'chuvaMuda'>,
  chuva: number,
  nevando: boolean,
): number {
  if (n.chuvaMuda) return 0;
  return nevando ? chuva * 0.25 : chuva;
}

/** Toca a voz de uma criatura do tema ativo (chamado, susto ou contente). */
export function tocarVoz(
  motor: MotorAudio,
  tipo: TipoSer,
  momento: keyof VozCriatura | 'obrigado',
  volume = 1,
): boolean {
  if (motor.estado !== 'ativo' || volume <= 0.02) return false;
  const pio =
    tipo === 'morador'
      ? povoadoDoTema().vozes[momento]
      : momento === 'obrigado'
        ? undefined
        : tema().vozes[tipo]?.[momento];
  if (!pio) return false;
  return motor.tocar(desenharVoz(pio, Math.min(1, volume), rngSom()), { grupo: 'vozes' });
}

export interface Ambiente {
  parar(): void;
  /** 0 de dia (pássaros), 1 de noite (grilos); muda a mistura. */
  definirNoite(noite: number): void;
  /** Hora do dia (0 a 1): os sons do campo têm hora (galo ao amanhecer, cigarra de tarde). */
  definirHora(hora: number): void;
  /** Volumes relativos (0 a 1) da trilha e da natureza. */
  definirVolumes(musica: number, natureza: number): void;
  /** Intensidade da chuva (0 a 1): chiado contínuo e menos pássaros. */
  definirChuva(i: number): void;
  /** Troca a paleta da trilha (bioma, noite, caverna, perigo). */
  definirContexto(c: ContextoMusical): void;
  readonly contexto: ContextoMusical;
  /**
   * Spec 019: onde a trilha gravada se liga, na mesma cadeia da trilha de hoje (busMusica 0,6
   * × "Música" × mestre do ambiente × grupo ambiente), sem o reverb (as camadas trazem o eco
   * delas). Null antes de o som ligar.
   */
  saidaTrilha(): { contexto: ContextoSintese; destino: NoAudio } | null;
  /**
   * Volume da trilha sintetizada (0 a 1), em rampa de `segundos`: a gravada entra em cruz.
   * Em 0, a sintetizada para de agendar notas (só os bichos e o vento seguem).
   */
  definirSintetizada(v: number, segundos: number): void;
  /**
   * Spec 014 (T09): quem toca os sons gravados da rua (pardal, buzininha ao longe, grilo de
   * jardim) com o volume da natureza; devolve false se o gravado não está pronto (aí a
   * buzininha sai sintetizada e os outros ficam para a próxima). Null: só sintetizados.
   */
  definirSonsDaRua(f: ((som: SomDaRua, volume: number) => boolean) | null): void;
  /**
   * Spec 014 (T15): abaixa a trilha (gravada e sintetizada) enquanto um carrinho anda perto,
   * para o motor se ouvir: `f` de 0 (nada) a 1 (`ABAIXAR_TRILHA_DB` e o vale de `VALE_TRILHA_DB`
   * nos graves-médios, onde o motor soa), em rampa macia de ~1 s.
   */
  definirAbaixar(f: number): void;
}

/** Spec 014 (T15): quanto a trilha abaixa com um carrinho andando perto (dB). */
export const ABAIXAR_TRILHA_DB = 4;
/** E o vale nos graves-médios da trilha nessa hora (dB, pico em 180 Hz). */
export const VALE_TRILHA_DB = 3;
/** Constante de tempo da rampa (s): ~1 s até chegar. */
const TAU_ABAIXAR = 0.33;

/** Spec 014: os sons gravados do ambiente da cidade (`ambiente` no índice de sons). */
export type SomDaRua = 'pardal' | 'buzininha' | 'grilo';

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

/** Nota pelo número MIDI. */
const nota = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const acorde = (...ms: number[]) => ms.map(nota);

export type ContextoMusical =
  | 'dia'
  | 'noite'
  | 'deserto'
  | 'taiga'
  | 'pantano'
  | 'caverna'
  | 'perigo';

interface PaletaMusical {
  acordes: number[][];
  melodia: number[];
  /** Segundos entre acordes. */
  intervalo: number;
  /** Chance de tocar uma nota da melodia a cada oportunidade. */
  chanceNota: number;
  /** Pulso grave (perigo); 0 = pausa. */
  pulso?: number[];
  ganhoPulso?: number;
  /** Gotas d'água (cavernas). */
  gotas?: boolean;
}

/** Paletas da trilha generativa por contexto (bioma, noite, caverna, perigo). */
export const PALETAS_MUSICAIS: Record<ContextoMusical, PaletaMusical> = {
  dia: {
    acordes: [
      acorde(50, 57, 64, 66),
      acorde(47, 54, 62, 69),
      acorde(43, 50, 59, 64),
      acorde(45, 52, 61, 64),
    ],
    melodia: [74, 76, 78, 81, 83, 86].map(nota),
    intervalo: 8,
    chanceNota: 0.55,
  },
  noite: {
    acordes: [
      acorde(45, 52, 60, 64, 71),
      acorde(41, 48, 57, 64),
      acorde(43, 50, 59, 62),
      acorde(40, 47, 55, 62),
    ],
    melodia: [69, 72, 74, 76, 79].map(nota),
    intervalo: 11,
    chanceNota: 0.35,
  },
  deserto: {
    acordes: [
      acorde(50, 57, 62, 66),
      acorde(51, 55, 58, 63),
      acorde(50, 54, 57, 62),
      acorde(48, 55, 60, 63),
    ],
    melodia: [74, 75, 78, 79, 81, 82, 84].map(nota),
    intervalo: 9,
    chanceNota: 0.5,
  },
  taiga: {
    acordes: [
      acorde(40, 47, 55, 62),
      acorde(36, 43, 52, 59),
      acorde(38, 45, 54, 62),
      acorde(43, 50, 59, 66),
    ],
    melodia: [83, 86, 88, 91, 95].map(nota),
    intervalo: 12,
    chanceNota: 0.3,
  },
  pantano: {
    acordes: [
      acorde(48, 52, 56, 62),
      acorde(50, 54, 58, 64),
      acorde(46, 50, 54, 60),
      acorde(44, 48, 54, 58),
    ],
    melodia: [72, 74, 76, 78, 80, 82].map(nota),
    intervalo: 10,
    chanceNota: 0.45,
  },
  caverna: {
    acordes: [acorde(33, 40), acorde(31, 38), acorde(34, 41), acorde(29, 36)],
    melodia: [64, 67, 69, 71, 74].map(nota),
    intervalo: 14,
    chanceNota: 0.2,
    gotas: true,
  },
  perigo: {
    acordes: [acorde(45, 48, 51, 57), acorde(44, 47, 50, 56)],
    melodia: [69, 70, 72, 75].map(nota),
    intervalo: 6,
    chanceNota: 0.25,
    pulso: acorde(33, 33, 36, 33, 31, 33),
  },
};

function timbre() {
  return tema().musica.timbre;
}

const paletasConvertidas = new Map<string, PaletaMusical>();
/** Paleta do contexto no tema ativo (notas MIDI do tema, transposição aplicada). */
function paletaDoTema(c: ContextoMusical): PaletaMusical {
  const t = tema();
  const chave = `${t.id}|${c}`;
  let p = paletasConvertidas.get(chave);
  if (p) return p;
  const k = Math.pow(2, t.musica.transporte / 12);
  const doTema = t.musica.paletas?.[c];
  const base = PALETAS_MUSICAIS[c];
  p = doTema
    ? {
        acordes: doTema.acordes.map((a) => a.map((m) => nota(m) * k)),
        melodia: doTema.melodia.map((m) => nota(m) * k),
        intervalo: doTema.intervalo,
        chanceNota: doTema.chanceNota,
        pulso: doTema.pulso?.map((m) => (m > 0 ? nota(m) * k : 0)),
        ganhoPulso: doTema.ganhoPulso,
        gotas: doTema.gotas,
      }
    : {
        ...base,
        acordes: base.acordes.map((a) => a.map((f) => f * k)),
        melodia: base.melodia.map((f) => f * k),
        pulso: base.pulso?.map((f) => f * k),
      };
  paletasConvertidas.set(chave, p);
  return p;
}

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
  let chuva = 0;
  let contexto: ContextoMusical = 'dia';
  let proximoPulso = 0;
  let proximaGota = 0;
  let passoPulso = 0;
  let gChuva: GanhoSom | null = null;
  let volNatureza = 1;
  let ctxA: ContextoSintese | null = null;
  let busNatureza: GanhoSom | null = null;
  let busMusica: GanhoSom | null = null;
  /** A trilha sintetizada passa por aqui antes do busMusica (a troca em cruz da spec 019). */
  let busSintetizada: GanhoSom | null = null;
  /** A trilha gravada (spec 019): mesmo volume de "Música", sem reverb. */
  let busGravada: GanhoSom | null = null;
  /** Spec 014 (T15): a trilha abaixada quando um carrinho anda perto (ganho e vale). */
  let abaixar: GanhoSom | null = null;
  let vale: FiltroSom | null = null;
  let fAbaixar = 0;
  let sintetizada = 1;
  /** Até quando a sintetizada ainda soa (a rampa para 0 acaba aqui). */
  let sintetizadaAte = Infinity;
  let proximoAcorde = 0;
  let proximaNota = 0;
  let proximoBicho = 0;
  let indiceAcorde = 0;
  const rng = criarGerador(2026);
  // sons do campo (Rancho Alegre): sorteio próprio, para não mudar o ambiente dos outros temas
  const rngRoca = criarGerador(1313);
  let hora = 0.5;
  let proximaRoca = 0;
  // sons da rua (Cidade Grande): sorteio próprio também
  const rngRua = criarGerador(1414);
  let proximaRua = 0;
  let proximaBuzininha = 0;
  let sonsDaRua: ((som: SomDaRua, volume: number) => boolean) | null = null;

  /** Quando cada som do ambiente deveria acabar (o vigia corta quem passar muito disso). */
  const fins = new Map<FonteAudio, number>();
  function registrar(p: Peca): void {
    vivas.add(p.fonte);
    fins.set(p.fonte, p.fim);
    p.fonte.onended = () => {
      vivas.delete(p.fonte);
      fins.delete(p.fonte);
      try {
        p.fonte.disconnect();
      } catch {
        // já desconectado
      }
    };
  }

  function tocarNota(t: number, f: number, ganho: number, ataque: number, dur: number): void {
    const ctx = ctxA!;
    const tm = timbre();
    for (const desvio of [-5 - tm.coro, 5 + tm.coro]) {
      const o = ctx.createOscillator();
      o.type = tm.onda;
      o.frequency.value = f;
      if (o.detune) o.detune.value = desvio;
      const filtro = ctx.createBiquadFilter();
      filtro.type = 'lowpass';
      filtro.frequency.value = 1400 * tm.brilho;
      filtro.Q.value = 0.3;
      const g = ctx.createGain() as GanhoSom;
      g.gain.value = 0;
      definir(g.gain, 0, t);
      rampa(g.gain, ganho, t + ataque);
      rampa(g.gain, ganho * 0.7, t + dur * 0.6);
      rampa(g.gain, 0, t + dur);
      o.connect(filtro);
      filtro.connect(g);
      g.connect(busSintetizada!);
      o.start(t);
      o.stop(t + dur + 0.05);
      registrar({ fonte: o, fim: t + dur });
    }
  }

  function sino(t: number, f: number, ganho: number): void {
    const tm = timbre();
    const onda = tm.sino ?? 'sine';
    // ondas ricas (quadrada, dente de serra) soam mais alto: compensa o volume
    const k = onda === 'sine' ? 1 : onda === 'triangle' ? 0.8 : 0.35;
    registrar(tom(ctxA!, busSintetizada!, t, onda, f, f, ganho * k, 2.2 * tm.sustentacao, 0.004));
    registrar(
      tom(
        ctxA!,
        busSintetizada!,
        t,
        'sine',
        f * 3,
        f * 3,
        ganho * 0.12,
        0.8 * tm.sustentacao,
        0.004,
      ),
    );
  }

  function passaro(t: number): void {
    const base = (2200 + rng() * 1800) * tema().natureza.tom;
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

  /** Bipes de rádio distantes (base lunar): no lugar de pássaros. */
  function bipe(t: number): void {
    const f = 1800 + Math.floor(rng() * 3) * 400;
    for (let i = 0; i < 2; i++)
      registrar(tom(ctxA!, busNatureza!, t + i * 0.16, 'sine', f, f, 0.03, 0.07, 0.003));
  }

  function grilo(t: number): void {
    const f = (4300 + rng() * 600) * tema().natureza.tom;
    for (let i = 0; i < 4; i++) {
      registrar(tom(ctxA!, busNatureza!, t + i * 0.055, 'sine', f, f, 0.035, 0.03, 0.004));
    }
  }

  /**
   * Sons curtos do campo, cada um na sua hora. Todos são tons com fim marcado (nunca em laço)
   * e passam pelo vigia como os grilos.
   */
  function galo(t: number): void {
    const partes: [number, number, number, number][] = [
      [0, 620, 760, 0.1],
      [0.15, 760, 700, 0.1],
      [0.3, 820, 920, 0.12],
      [0.47, 920, 640, 0.5],
    ];
    for (const [dt, de, ate, dur] of partes) {
      registrar(tom(ctxA!, busNatureza!, t + dt, 'sawtooth', de, ate, 0.018, dur, 0.02));
      registrar(tom(ctxA!, busNatureza!, t + dt, 'triangle', de * 2, ate * 2, 0.012, dur, 0.02));
    }
  }

  function mugido(t: number): void {
    registrar(tom(ctxA!, busNatureza!, t, 'sawtooth', 165, 118, 0.022, 1.1, 0.22));
    registrar(tom(ctxA!, busNatureza!, t, 'triangle', 330, 236, 0.012, 1.0, 0.22));
  }

  function cigarra(t: number): void {
    const f = 4400 + rngRoca() * 600;
    for (let i = 0; i < 18; i++) {
      // cresce e some (o "zzziiii" da tarde)
      const k = Math.sin((i / 17) * Math.PI);
      registrar(
        tom(ctxA!, busNatureza!, t + i * 0.06, 'square', f, f * 0.97, 0.006 + 0.01 * k, 0.04),
      );
    }
  }

  function sapo(t: number): void {
    const n = 2 + Math.floor(rngRoca() * 2);
    for (let i = 0; i < n; i++)
      registrar(tom(ctxA!, busNatureza!, t + i * 0.2, 'square', 200, 140, 0.02, 0.1, 0.01));
  }

  function somDaRoca(t: number, roca: NonNullable<NaturezaTema['roca']>): void {
    const sorte = () => rngRoca();
    if ((roca.galo ?? 0) > 0 && hora > 0.22 && hora < 0.34 && sorte() < 0.5 * roca.galo!) galo(t);
    else if ((roca.sapo ?? 0) > 0 && noite > 0.5 && sorte() < 0.45 * roca.sapo!) sapo(t);
    else if (
      (roca.cigarra ?? 0) > 0 &&
      hora > 0.52 &&
      hora < 0.72 &&
      chuva < 0.3 &&
      sorte() < 0.4 * roca.cigarra!
    )
      cigarra(t);
    else if ((roca.mugido ?? 0) > 0 && noite < 0.5 && sorte() < 0.2 * roca.mugido!) mugido(t);
  }

  /** A buzininha de brinquedo ao longe, sintetizada (a reserva da gravada): "fom-fom". */
  function buzininha(t: number): void {
    registrar(tom(ctxA!, busNatureza!, t, 'square', 330, 322, 0.008, 0.12, 0.01));
    registrar(tom(ctxA!, busNatureza!, t + 0.18, 'square', 392, 384, 0.008, 0.16, 0.01));
  }

  /**
   * Sons da rua (Cidade Grande), cada um na sua hora: pardal de dia, grilo de jardim à noite
   * (de 8 a 20 s) e a buzininha de brinquedo ao longe, rara (uma a cada 40 a 90 s), menos na
   * madrugada. Todos curtos, nunca em laço.
   */
  function somDaRua(t: number, agora: number, rua: NonNullable<NaturezaTema['cidade']>): void {
    const vol = volNatureza;
    if (proximaRua < t) {
      if (noite > 0.5) sonsDaRua?.('grilo', vol);
      else if (chuva < 0.3) sonsDaRua?.('pardal', vol);
      proximaRua = t + 8 + rngRua() * 12;
    }
    if ((rua.buzininha ?? 0) > 0 && proximaBuzininha < t) {
      if (proximaBuzininha > 0 && noite < 0.8 && rngRua() < rua.buzininha!) {
        if (!sonsDaRua?.('buzininha', vol)) buzininha(Math.max(t, agora + 0.05));
      }
      proximaBuzininha = t + 40 + rngRua() * 50;
    }
  }

  /** Vigia: nota, grilo ou bipe que passou 3 s da hora de acabar é cortado e desligado. */
  function vigiar(agora: number): void {
    for (const [fonte, fim] of fins) {
      if (agora < fim + 3) continue;
      fins.delete(fonte);
      vivas.delete(fonte);
      try {
        (fonte as FonteAudio & { stop(t?: number): void }).stop();
      } catch {
        // já parada
      }
      try {
        fonte.disconnect();
      } catch {
        // já desconectada
      }
    }
  }

  function agendar(): void {
    if (!ctxA || !busMusica) return;
    const agora = ctxA.currentTime;
    vigiar(agora);
    const ate = agora + 0.6;
    const p = paletaDoTema(contexto);
    // a gravada já tomou o lugar: a sintetizada não agenda mais notas (nem CPU gasta). As
    // gotas da caverna seguem: são ambiente (barramento da natureza, régua "Ambiente"), não
    // música, e a camada 'pingos' da gravada não substitui o pingar de perto
    const calada = sintetizada <= 0 && agora >= sintetizadaAte;
    if (calada) {
      proximoAcorde = proximaNota = proximoPulso = ate;
    }
    while (proximoAcorde < ate) {
      const t = Math.max(proximoAcorde, agora + 0.05);
      const ac = p.acordes[indiceAcorde % p.acordes.length];
      for (const f of ac)
        tocarNota(t, f, contexto === 'caverna' ? 0.07 : 0.05, 2.5, p.intervalo + 1);
      indiceAcorde++;
      proximoAcorde = t + p.intervalo;
    }
    while (proximaNota < ate) {
      const t = Math.max(proximaNota, agora + 0.05);
      if (rng() < p.chanceNota) {
        const f = p.melodia[Math.floor(rng() * p.melodia.length)];
        sino(t, f, 0.06);
        sino(t + 0.375, f, 0.025);
      }
      proximaNota = t + 1.5 + rng() * 2.5;
    }
    if (p.pulso) {
      while (proximoPulso < ate) {
        const t = Math.max(proximoPulso, agora + 0.05);
        const f = p.pulso[passoPulso++ % p.pulso.length];
        // 0 é pausa: o tambor respira
        if (f > 0)
          registrar(
            tom(
              ctxA,
              busSintetizada!,
              t,
              'triangle',
              f,
              f * 0.98,
              0.1 * (p.ganhoPulso ?? 1),
              0.22,
              0.01,
            ),
          );
        proximoPulso = t + 0.3;
      }
    } else proximoPulso = agora;
    if (p.gotas) {
      while (proximaGota < ate) {
        const t = Math.max(proximaGota, agora + 0.05);
        const f = 1400 + rng() * 1600;
        registrar(tom(ctxA, busNatureza!, t, 'sine', f, f * 0.55, 0.05, 0.12, 0.002));
        proximaGota = t + 0.8 + rng() * 3;
      }
    } else proximaGota = agora;
    while (proximoBicho < ate) {
      const t = Math.max(proximoBicho, agora + 0.05);
      const nat = tema().natureza;
      if (rng() < noite) {
        // grilos = 1 não sorteia nada a mais (o ambiente do tema base fica igual)
        if (nat.grilos >= 1 || rng() < nat.grilos) grilo(t);
        else if (nat.bipes && rng() < 0.03) bipe(t);
        proximoBicho = t + 0.35 + rng() * 0.5;
      } else {
        if (rng() < 0.6 * (1 - chuva) * nat.passaros) passaro(t);
        else if (nat.bipes && rng() < 0.1) bipe(t);
        proximoBicho = t + 1.2 + rng() * 3;
      }
    }
    const rua = tema().natureza.cidade;
    if (rua) somDaRua(ate, agora, rua);
    const roca = tema().natureza.roca;
    if (roca) {
      while (proximaRoca < ate) {
        const t = Math.max(proximaRoca, agora + 0.05);
        somDaRoca(t, roca);
        proximaRoca = t + 7 + rngRoca() * 10;
      }
    } else proximaRoca = agora;
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
        // a trilha passa pelo abaixar (ganho) e pelo vale dos graves-médios antes do mestre
        abaixar = ctx.createGain() as GanhoSom;
        abaixar.gain.value = Math.pow(10, (-ABAIXAR_TRILHA_DB * fAbaixar) / 20);
        vale = ctx.createBiquadFilter();
        vale.type = 'peaking';
        vale.frequency.value = 180;
        vale.Q.value = 0.9;
        if (vale.gain) vale.gain.value = -VALE_TRILHA_DB * fAbaixar;
        abaixar.connect(vale);
        vale.connect(mestre);
        busMusica.connect(abaixar);
        busSintetizada = ctx.createGain() as GanhoSom;
        busSintetizada.gain.value = sintetizada;
        busSintetizada.connect(busMusica);
        busGravada = ctx.createGain() as GanhoSom;
        busGravada.gain.value = 0.6 * volMusica * GANHO_TRILHA_GRAVADA;
        busGravada.connect(abaixar);
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
        // o vento do tema (a Lua não tem ar: 0)
        gVento.gain.value = 0.35 * (tema().natureza.vento ?? 1);
        vento.connect(filtro);
        filtro.connect(gVento);
        gVento.connect(busNatureza);
        // chuva: ruído chiado, começa em silêncio
        const fChuva = ctx.createBufferSource();
        fChuva.buffer = bufferDeRuido(ctx);
        fChuva.loop = true;
        const passaAlta = ctx.createBiquadFilter();
        passaAlta.type = 'highpass';
        passaAlta.frequency.value = 900;
        passaAlta.Q.value = 0.4;
        gChuva = ctx.createGain() as GanhoSom;
        gChuva.gain.value = chuva * 0.55;
        fChuva.connect(passaAlta);
        passaAlta.connect(gChuva);
        gChuva.connect(busNatureza);
        const t = ctx.currentTime;
        fChuva.start(t);
        vivas.add(fChuva);
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
    definirHora(h) {
      if (Number.isFinite(h)) hora = ((h % 1) + 1) % 1;
    },
    get contexto() {
      return contexto;
    },
    definirContexto(c) {
      if (c === contexto) return;
      contexto = c;
      // o próximo acorde entra logo para a mudança ser sentida
      if (ctxA) proximoAcorde = Math.min(proximoAcorde, ctxA.currentTime + 1.5);
    },
    definirChuva(i) {
      chuva = Math.max(0, Math.min(1, i));
      if (gChuva) gChuva.gain.value = chuva * 0.55;
    },
    saidaTrilha() {
      return ctxA && busGravada ? { contexto: ctxA, destino: busGravada } : null;
    },
    definirSintetizada(v, segundos) {
      const alvo = Math.max(0, Math.min(1, v));
      sintetizada = alvo;
      if (!ctxA || !busSintetizada) {
        sintetizadaAte = alvo > 0 ? Infinity : -Infinity;
        return;
      }
      const t = ctxA.currentTime;
      const g = busSintetizada.gain;
      const dur = Math.max(0.05, segundos);
      if (g.setValueAtTime && g.linearRampToValueAtTime) {
        (g as { cancelScheduledValues?: (t: number) => void }).cancelScheduledValues?.(t);
        g.setValueAtTime(g.value, t);
        g.linearRampToValueAtTime(alvo, t + dur);
      } else g.value = alvo;
      // as notas longas (acordes de até 15 s) somem na rampa; depois dela, nada mais é agendado
      sintetizadaAte = alvo > 0 ? Infinity : t + dur;
      if (alvo > 0) {
        proximoAcorde = Math.min(proximoAcorde, t + 0.3);
        proximaNota = Math.min(proximaNota, t + 1);
      }
    },
    definirSonsDaRua(f) {
      sonsDaRua = f;
    },
    definirAbaixar(f) {
      const alvo = Math.max(0, Math.min(1, f));
      if (Math.abs(alvo - fAbaixar) < 0.01) return;
      fAbaixar = alvo;
      if (!ctxA || !abaixar) return;
      const t = ctxA.currentTime;
      const g = Math.pow(10, (-ABAIXAR_TRILHA_DB * alvo) / 20);
      const ga = abaixar.gain as ParamEnvelope & {
        setTargetAtTime?(v: number, t: number, k: number): void;
      };
      if (ga.setTargetAtTime) ga.setTargetAtTime(g, t, TAU_ABAIXAR);
      else ga.value = g;
      const gv = vale?.gain as
        | (ParamEnvelope & { setTargetAtTime?(v: number, t: number, k: number): void })
        | undefined;
      if (gv?.setTargetAtTime) gv.setTargetAtTime(-VALE_TRILHA_DB * alvo, t, TAU_ABAIXAR);
      else if (gv) gv.value = -VALE_TRILHA_DB * alvo;
    },
    definirVolumes(musica, natureza) {
      volMusica = musica;
      volNatureza = natureza;
      if (busGravada) busGravada.gain.value = 0.6 * musica * GANHO_TRILHA_GRAVADA;
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

/** Spec 014 (T06): uma nota de uma frase curta (segundos desde o começo, Hz, onda, volume). */
export interface NotaCurta {
  t: number;
  f: number;
  /** 'sine', 'triangle' ou 'square'; 'ruido' é um sopro (f é o filtro). */
  tipo?: string;
  pico?: number;
  queda?: number;
  /** Frequência no fim (deslize); sem ela, a nota fica parada. */
  f1?: number;
}

/**
 * Spec 014 (T06): toca uma frase curta de notas sintetizadas (o "plim" da obra, o acorde da
 * camada, o "ta-dá", o "hum?" do pedreiro, a musiquinha do coreto). Sempre curta, nunca em
 * laço, no grupo dos efeitos.
 */
export function tocarNotas(
  motor: MotorAudio,
  notas: readonly NotaCurta[],
  ganho = 0.22,
  grupo: GrupoAudio = 'efeitos',
): boolean {
  if (motor.estado !== 'ativo' || notas.length === 0) return false;
  return motor.tocar(
    (ctxBase, destino) => {
      const ctx = ctxBase as ContextoSintese;
      const t0 = ctx.currentTime;
      const out = ctx.createGain() as GanhoSom;
      out.gain.value = ganho;
      out.connect(destino);
      const pecas: Peca[] = notas.map((n) =>
        n.tipo === 'ruido'
          ? ruido(ctx, out, t0 + n.t, 'bandpass', n.f, 1.2, n.pico ?? 0.4, n.queda ?? 0.1, 0.004)
          : tom(
              ctx,
              out,
              t0 + n.t,
              n.tipo ?? 'sine',
              n.f,
              n.f1 ?? n.f,
              n.pico ?? 0.45,
              n.queda ?? 0.3,
              0.004,
            ),
      );
      const ultima = pecas.reduce((a, b) => (b.fim > a.fim ? b : a));
      for (const p of pecas)
        if (p !== ultima)
          p.fonte.onended = () => {
            try {
              p.fonte.disconnect();
            } catch {
              // já desconectado
            }
          };
      return ultima.fonte;
    },
    { grupo },
  );
}
