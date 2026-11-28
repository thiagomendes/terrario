/**
 * Spec 039b (T04): a musiquinha do aparelho de som, feita em código (nossa, nota por nota), e quem
 * toca perto da criança.
 *
 * - **A musiquinha:** uns 20 s, mansa, uma caixinha de música em Fá maior, 84 por minuto (a
 *   melodia em sino macio, o baixo em dois tempos e um chocalhinho bem baixo). Toca uma vez só e
 *   para (o núcleo diz quando começou: todos perto ouvem o mesmo ponto).
 * - **Quem toca:** só os dois sons mais perto (os outros ficam calados), cheios até 5 blocos e
 *   sumindo até 24. Com a musiquinha perto, a trilha do mundo cala (uma música por vez, 019).
 * - **A régua (019):** -23 dBFS "enquanto soa", e o ganho em dB vale como o do disco da Casa.
 */
import type { ContextoAudio, MotorAudio, NoAudio } from './motor';
import { ALVO_RMS_DB, TAXA_PARQUE, rmsSoando } from './realejo';
import { RelogioVila, volumeNaDistancia } from './somVila';
import { DURA_MUSICA } from '../jogo/ligados';

export const TAXA_MOVEIS = TAXA_PARQUE;
/** O ganho da musiquinha sobre a régua (dB), o mesmo do disco da Casa anos 80. */
export const GANHO_MUSICA_DB = -15;
/** Cheia até tantos blocos, some até tantos. */
export const MUSICA_CHEIA = 5;
export const MUSICA_SOME = 24;
/** Quantos sons (e quantas TVs, no desenho) tocam de cada vez: os mais perto. */
export const TOCAM_DE_CADA_VEZ = 2;

const DUAS_PI = Math.PI * 2;
const dbLin = (db: number) => Math.pow(10, db / 20);
const freq = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/** Os `n` mais perto do ouvinte (do tipo pedido), na ordem da distância. */
export function maisPertos<T extends { tipo: string; x: number; z: number }>(
  lista: readonly T[],
  tipo: string,
  ouvinte: { x: number; z: number },
  n = TOCAM_DE_CADA_VEZ,
): T[] {
  return lista
    .filter((e) => e.tipo === tipo)
    .map((e) => ({ e, d: Math.hypot(e.x + 0.5 - ouvinte.x, e.z + 0.5 - ouvinte.z) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.e);
}

/** Uma nota de caixinha de música (o sino macio) ou do baixo, somada em `x`. */
function somar(
  x: Float32Array,
  ini: number,
  f: number,
  dur: number,
  amp: number,
  timbre: 'sino' | 'baixo',
  taxa: number,
): void {
  const i0 = Math.round(ini * taxa);
  const n = Math.round(dur * taxa);
  for (let j = 0; j < n && i0 + j < x.length; j++) {
    const t = j / taxa;
    const ataque = Math.min(1, t / 0.006);
    const fim = Math.min(1, (n - j) / (0.03 * taxa));
    if (timbre === 'sino') {
      const env = ataque * fim * Math.exp(-t / 0.45);
      x[i0 + j] +=
        amp *
        env *
        (Math.sin(DUAS_PI * f * t) +
          0.25 * Math.sin(DUAS_PI * 2 * f * t) * Math.exp(-t / 0.12) +
          0.08 * Math.sin(DUAS_PI * 3 * f * t) * Math.exp(-t / 0.06));
    } else {
      const env = ataque * fim * Math.exp(-t / 0.6);
      x[i0 + j] += amp * env * (Math.sin(DUAS_PI * f * t) + 0.3 * Math.sin(DUAS_PI * 2 * f * t));
    }
  }
}

/** Um sorteio com semente (o chocalhinho sempre igual). */
function sorteio(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A melodia, em tempos: [início, nota MIDI, duração]. Quatro frases de 8 tempos (28 compassos de
 * 84 por minuto dão 20 s): a pergunta, a resposta, a subidinha e a volta para casa.
 */
const MELODIA: readonly [number, number, number][] = [
  // 1. a pergunta (Fá, Lá, Dó, Lá, Sol, Fá, Sol)
  [0, 77, 1], [1, 81, 1], [2, 84, 1.5], [3.5, 81, 0.5], [4, 79, 1], [5, 77, 1], [6, 79, 2],
  // 2. a resposta
  [8, 77, 1], [9, 81, 1], [10, 84, 1], [11, 86, 1], [12, 84, 1.5], [13.5, 81, 0.5], [14, 77, 2],
  // 3. a subidinha
  [16, 81, 1], [17, 82, 1], [18, 84, 1], [19, 86, 1], [20, 88, 1.5], [21.5, 86, 0.5], [22, 84, 2],
  // 4. a volta para casa (e a nota longa do fim)
  [24, 82, 1], [25, 81, 1], [26, 79, 1], [27, 76, 1], [28, 77, 4],
];
/** O baixo: a fundamental de cada compasso de dois tempos (Fá, Ré menor, Si bemol, Dó). */
const BAIXO: readonly [number, number][] = [
  [0, 53], [2, 53], [4, 48], [6, 48], [8, 53], [10, 50], [12, 46], [14, 53],
  [16, 50], [18, 50], [20, 46], [22, 48], [24, 46], [26, 48], [28, 53], [30, 53],
];
const BPM = 84;
/** Quantos tempos tem a musiquinha (20 s a 84 por minuto, mais o fim que se apaga). */
export const TEMPOS_MUSICA = Math.round((DURA_MUSICA * BPM) / 60);

/**
 * A musiquinha do som: uns 20 s, na régua (-23 dBFS enquanto soa), com as bordas macias. Pura:
 * a mesma taxa dá sempre as mesmas amostras.
 */
export function musicaDoSom(taxa = TAXA_MOVEIS): Float32Array {
  const b = 60 / BPM;
  const x = new Float32Array(Math.round(DURA_MUSICA * taxa));
  for (const [ini, n, dur] of MELODIA) somar(x, ini * b, freq(n), dur * b * 0.95, 0.55, 'sino', taxa);
  for (const [ini, n] of BAIXO) somar(x, ini * b, freq(n), 1.9 * b, 0.35, 'baixo', taxa);
  // o chocalhinho nos contratempos, bem baixinho
  const rnd = sorteio(39);
  for (let k = 0; k < TEMPOS_MUSICA; k++) {
    const i0 = Math.round((k + 0.5) * b * taxa);
    const n = Math.round(0.05 * taxa);
    for (let j = 0; j < n && i0 + j < x.length; j++)
      x[i0 + j] += 0.05 * (rnd() * 2 - 1) * Math.exp(-j / (0.012 * taxa));
  }
  // a régua, e o fim que se apaga em 1,5 s (nada de corte seco)
  const r = rmsSoando(x, taxa);
  const alvo = dbLin(ALVO_RMS_DB);
  if (r > 0) for (let i = 0; i < x.length; i++) x[i] = Math.tanh((x[i] * alvo) / r / 0.9) * 0.9;
  const ini = Math.round(0.01 * taxa);
  const fim = Math.round(1.5 * taxa);
  for (let i = 0; i < ini; i++) x[i] *= i / ini;
  for (let i = 0; i < fim; i++) x[x.length - 1 - i] *= i / fim;
  return x;
}

type Buffer = { duration?: number };
type Fonte = {
  buffer: unknown;
  connect(n: unknown): void;
  start(t: number, offset?: number): void;
  stop(t?: number): void;
  onended: (() => void) | null;
};
type Ganho = {
  gain: {
    value: number;
    setTargetAtTime?(v: number, t: number, k: number): void;
    cancelScheduledValues?(t: number): void;
    setValueAtTime?(v: number, t: number): void;
    linearRampToValueAtTime?(v: number, t: number): void;
  };
  connect(n: unknown): void;
  disconnect(): void;
};
type Ctx = {
  currentTime: number;
  createBuffer(c: number, n: number, taxa: number): {
    copyToChannel?(d: Float32Array, c: number): void;
    getChannelData?(c: number): Float32Array;
    duration?: number;
  };
  createBufferSource(): Fonte;
  createGain(): Ganho;
};

interface Tocando {
  chave: string;
  fonte: Fonte;
  ganho: Ganho;
  parado: boolean;
}

export interface OpcoesSomMoveis {
  motor: MotorAudio;
  /** O volume da "Música" (0 a 1). */
  musica?: () => number;
  /** 0..1: quanto a trilha do mundo cala (com a musiquinha perto). */
  aoCalarTrilha?: (f: number) => void;
}

/** Um som ligado como o quadro diz (a âncora e quando a musiquinha começou). */
export interface SomLigado {
  tipo: string;
  x: number;
  z: number;
  desde: number;
}

export function criarSomMoveis(op: OpcoesSomMoveis) {
  const { motor } = op;
  const relogio = new RelogioVila();
  let buffer: unknown = null;
  const tocando = new Map<string, Tocando>();
  let calou = 0;
  const podeTocar = () => motor.estado === 'ativo' && !motor.mudo && !!motor.contexto;

  function oBuffer(ctx: Ctx): unknown {
    if (buffer) return buffer;
    try {
      const x = musicaDoSom(TAXA_MOVEIS);
      const b = ctx.createBuffer(1, x.length, TAXA_MOVEIS);
      if (b.copyToChannel) b.copyToChannel(x, 0);
      else b.getChannelData?.(0).set(x);
      buffer = b;
    } catch {
      buffer = null;
    }
    return buffer;
  }

  function parar(x: Tocando, t: number): void {
    if (x.parado) return;
    x.parado = true;
    const g = x.ganho.gain;
    g.cancelScheduledValues?.(t);
    g.setValueAtTime?.(g.value, t);
    if (g.linearRampToValueAtTime) g.linearRampToValueAtTime(0, t + 0.25);
    else g.value = 0;
    try {
      x.fonte.stop(t + 0.3);
    } catch {
      // já parada
    }
  }

  function iniciar(ctx: Ctx, chave: string, offset: number, ganho: number): Tocando | null {
    const b = oBuffer(ctx);
    if (!b) return null;
    let res: Tocando | null = null;
    const t = ctx.currentTime + 0.03;
    const ok = motor.tocar(
      (ctxBase: ContextoAudio, destino: NoAudio) => {
        const c = ctxBase as unknown as Ctx;
        const f = c.createBufferSource();
        f.buffer = b;
        const g = c.createGain();
        f.connect(g);
        g.connect(destino);
        g.gain.value = 0;
        g.gain.setValueAtTime?.(0, t);
        if (g.gain.setTargetAtTime) g.gain.setTargetAtTime(ganho, t, 0.12);
        else g.gain.value = ganho;
        f.start(t, offset);
        res = { chave, fonte: f, ganho: g, parado: false };
        return f as never;
      },
      { grupo: 'ambiente', prioridade: 'alta' },
    );
    if (!ok || !res) return null;
    const x = res as Tocando;
    const doMotor = x.fonte.onended;
    x.fonte.onended = () => {
      doMotor?.();
      x.parado = true;
      try {
        x.ganho.disconnect();
      } catch {
        // já desligado
      }
    };
    return x;
  }

  return {
    /**
     * Cada quadro: os dois sons mais perto tocam a musiquinha do ponto em que estão (o relógio do
     * núcleo); os outros, e os que pararam, calam.
     */
    quadro(ouvinte: { x: number; z: number }, tNucleo: number, lista: readonly SomLigado[]): void {
      const ctx = motor.contexto as Ctx | null;
      if (!ctx) return;
      relogio.medir(ctx.currentTime, tNucleo);
      const ag = ctx.currentTime;
      const vivos = new Set<string>();
      let maior = 0;
      if (podeTocar())
        for (const e of maisPertos(lista, 'som', ouvinte)) {
          const chave = `${e.x},${e.z}@${e.desde}`;
          const passou = relogio.nucleo(ag) - e.desde;
          const d = Math.hypot(e.x + 0.5 - ouvinte.x, e.z + 0.5 - ouvinte.z);
          const v = volumeNaDistancia(d, MUSICA_CHEIA, MUSICA_SOME);
          if (v <= 0.001 || passou >= DURA_MUSICA - 0.2) continue;
          vivos.add(chave);
          maior = Math.max(maior, v);
          const alvo = dbLin(GANHO_MUSICA_DB) * v * (op.musica?.() ?? 0.6) * 1.4;
          const x = tocando.get(chave);
          if (!x || x.parado) {
            const novo = iniciar(ctx, chave, Math.max(0, passou), alvo);
            if (novo) tocando.set(chave, novo);
          } else {
            const g = x.ganho.gain;
            if (g.setTargetAtTime) {
              g.cancelScheduledValues?.(ag);
              g.setTargetAtTime(alvo, ag, 0.2);
            } else g.value = alvo;
          }
        }
      for (const [k, x] of tocando)
        if (!vivos.has(k) || x.parado) {
          parar(x, ag);
          tocando.delete(k);
        }
      const calar = maior * 0.85;
      if (Math.abs(calar - calou) > 0.01) {
        calou = calar;
        op.aoCalarTrilha?.(calar);
      }
    },
    info() {
      return { tocando: [...tocando.keys()], pronto: !!buffer };
    },
    liberar(): void {
      const ag = motor.contexto?.currentTime ?? 0;
      for (const x of tocando.values()) parar(x, ag);
      tocando.clear();
      buffer = null;
      if (calou) op.aoCalarTrilha?.(0);
      calou = 0;
    },
  };
}
