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
  | 'entrada';

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
];

export const VARIACOES_POR_EVENTO = 4;
export const DURACAO_MAXIMA_SOM = 2;
export const GANHO_MAXIMO_AMBIENTE = 0.08;

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
};

const FIXOS: Partial<Record<EventoSom, BaseMaterial>> = {
  troca: { frequencia: 880, filtroHz: 3000 },
  recusa: { frequencia: 130, filtroHz: 700 },
  entrada: { frequencia: 392, filtroHz: 2400 },
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
}

interface GanhoSom extends NoAudio {
  gain: ParamEnvelope;
}

interface OscilatorSom extends FonteAudio {
  type: string;
  frequency: ParamEnvelope;
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
}

export interface ContextoSintese extends ContextoAudio {
  readonly sampleRate: number;
  createOscillator(): OscilatorSom;
  createBiquadFilter(): FiltroSom;
  createBuffer(canais: number, tamanho: number, taxa: number): BufferSom;
  createBufferSource(): FonteBufferSom;
}

const bufferesRuido = new WeakMap<object, BufferSom>();

function bufferDeRuido(ctx: ContextoSintese): BufferSom {
  let buf = bufferesRuido.get(ctx);
  if (!buf) {
    const taxa = ctx.sampleRate || 44100;
    buf = ctx.createBuffer(1, Math.floor(taxa * 0.5), taxa);
    const dados = buf.getChannelData(0);
    const rng = criarGerador(7919);
    for (let i = 0; i < dados.length; i++) dados[i] = rng() * 2 - 1;
    bufferesRuido.set(ctx, buf);
  }
  return buf;
}

function envelope(ganho: GanhoSom, t0: number, pico: number, duracao: number) {
  const p = ganho.gain;
  p.value = 0;
  if (p.setValueAtTime && p.linearRampToValueAtTime) {
    p.setValueAtTime(0, t0);
    p.linearRampToValueAtTime(pico, t0 + 0.005);
    p.linearRampToValueAtTime(0, t0 + duracao);
  } else {
    p.value = pico;
  }
}

function desenharSom(par: ParametrosSom) {
  return (ctxBase: ContextoAudio, destino: NoAudio): FonteAudio => {
    const ctx = ctxBase as ContextoSintese;
    const t0 = ctx.currentTime;
    const fim = t0 + par.duracao;
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.frequency.value = par.filtroHz;
    filtro.Q.value = 1.2;
    const amp = ctx.createGain() as GanhoSom;
    envelope(amp, t0, par.ganho, par.duracao);
    filtro.connect(amp);
    amp.connect(destino);

    const ruido = ctx.createBufferSource();
    ruido.buffer = bufferDeRuido(ctx);
    ruido.loop = true;
    const gRuido = ctx.createGain() as GanhoSom;
    gRuido.gain.value = par.ruido;
    ruido.connect(gRuido);
    gRuido.connect(filtro);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = par.frequencia;
    const gOsc = ctx.createGain() as GanhoSom;
    gOsc.gain.value = 1 - par.ruido * 0.7;
    osc.connect(gOsc);
    gOsc.connect(filtro);

    osc.onended = () => {
      try {
        osc.disconnect();
      } catch {
        // já desconectado
      }
    };
    ruido.start(t0);
    osc.start(t0);
    ruido.stop(fim);
    osc.stop(fim);
    return ruido;
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
  const ok = motor.tocar(desenharSom(par), { grupo: perfil.grupoAudio });
  return ok ? par : null;
}

export interface Ambiente {
  parar(): void;
}

export function iniciarAmbiente(motor: MotorAudio): Ambiente {
  let fonte: FonteAudio | null = null;
  const ok = motor.estado === 'ativo' && !motor.mudo;
  if (ok) {
    motor.tocar(
      (ctxBase, destino) => {
        const ctx = ctxBase as ContextoSintese;
        const filtro = ctx.createBiquadFilter();
        filtro.type = 'lowpass';
        filtro.frequency.value = 400;
        const amp = ctx.createGain();
        amp.gain.value = GANHO_MAXIMO_AMBIENTE;
        const f = ctx.createBufferSource();
        f.buffer = bufferDeRuido(ctx);
        f.loop = true;
        f.connect(filtro);
        filtro.connect(amp);
        amp.connect(destino);
        f.start(ctx.currentTime);
        fonte = f;
        return f;
      },
      { grupo: 'ambiente', prioridade: 'alta' },
    );
  }
  return {
    parar() {
      if (!fonte) return;
      const f = fonte;
      fonte = null;
      try {
        f.stop();
      } catch {
        // já parada
      }
      f.onended?.();
    },
  };
}
