import {
  EVENTOS_MATERIAL,
  VARIACOES_AMOSTRA,
  sintetizarAmostra,
  type EventoMaterial,
} from './amostras';
import { criarGerador, criarVariador, jitter, type Gerador } from './variacao';
import type { ContextoAudio, Desenho, FonteAudio, GrupoAudio, MotorAudio, NoAudio } from './motor';
import type { GrupoMaterial } from './materiais';
import { tema } from '../temas/ativo';
import type { PioCriatura, VozCriatura } from '../temas/tipos';
import type { TipoCriatura } from '../jogo/criaturas';

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
  | 'trovao';

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

/** Toca a voz de uma criatura do tema ativo (chamado, susto ou contente). */
export function tocarVoz(
  motor: MotorAudio,
  tipo: TipoCriatura,
  momento: keyof VozCriatura,
  volume = 1,
): boolean {
  if (motor.estado !== 'ativo' || volume <= 0.02) return false;
  const pio = tema().vozes[tipo]?.[momento];
  if (!pio) return false;
  return motor.tocar(desenharVoz(pio, Math.min(1, volume), rngSom()), { grupo: 'efeitos' });
}

export interface Ambiente {
  parar(): void;
  /** 0 de dia (pássaros), 1 de noite (grilos); muda a mistura. */
  definirNoite(noite: number): void;
  /** Volumes relativos (0 a 1) da trilha e da natureza. */
  definirVolumes(musica: number, natureza: number): void;
  /** Intensidade da chuva (0 a 1): chiado contínuo e menos pássaros. */
  definirChuva(i: number): void;
  /** Troca a paleta da trilha (bioma, noite, caverna, perigo). */
  definirContexto(c: ContextoMusical): void;
  readonly contexto: ContextoMusical;
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
  let proximoAcorde = 0;
  let proximaNota = 0;
  let proximoBicho = 0;
  let indiceAcorde = 0;
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
      g.connect(busMusica!);
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
    registrar(tom(ctxA!, busMusica!, t, onda, f, f, ganho * k, 2.2 * tm.sustentacao, 0.004));
    registrar(
      tom(ctxA!, busMusica!, t, 'sine', f * 3, f * 3, ganho * 0.12, 0.8 * tm.sustentacao, 0.004),
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

  function agendar(): void {
    if (!ctxA || !busMusica) return;
    const agora = ctxA.currentTime;
    const ate = agora + 0.6;
    const p = paletaDoTema(contexto);
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
            tom(ctxA, busMusica, t, 'triangle', f, f * 0.98, 0.1 * (p.ganhoPulso ?? 1), 0.22, 0.01),
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
        if (rng() < nat.grilos) grilo(t);
        else if (nat.bipes && rng() < 0.08) bipe(t);
        proximoBicho = t + 0.35 + rng() * 0.5;
      } else {
        if (rng() < 0.6 * (1 - chuva) * nat.passaros) passaro(t);
        else if (nat.bipes && rng() < 0.25) bipe(t);
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
