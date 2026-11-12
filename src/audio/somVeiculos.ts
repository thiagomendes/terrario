/**
 * Os sons dos carrinhos e ônibus da Cidade Grande (spec 014, T14), do esboço aprovado na rodada
 * 2 ("agora ficou perfeito os sons"; o volume "no ponto, perfeito"):
 *
 * - **Motor de verdade:** a marcha lenta gravada (CC0) em laço, lida mais depressa quando o motor
 *   gira mais (`playbackRate` = rotação). A rotação sai de um modelo de marchas a partir da
 *   velocidade e da aceleração do veículo: arranca, sobe a rotação, troca de marcha (cai e volta
 *   a subir, com um alívio no pedal), roda, solta o pedal, reduz (a rotação pula) e para. É a
 *   mesma curva das passadas do esboço (`sons_veiculos_r2.py`), agora calculada ao vivo.
 * - **Carga:** a mesma gravação passa por dois caminhos, um abafado (passa-baixa de 900 Hz) e um
 *   claro (o som cheio + 0,7 de um passa-alta de 400 Hz); acelerando, o claro sobe e fica mais
 *   forte; soltando o pedal, fica o abafado. Nível: 0,5 + 0,5·carga + 0,25·(rotação − 1).
 * - **No máximo 3 motores** (os mais perto da criança), cheios até 4 blocos e sumindo até 16, com
 *   esquerda e direita pela câmera. Vão no grupo "ambiente", abaixo da trilha.
 * - **Toques:** freio a ar do ônibus no ponto, "fom-fom" (esperando criança ou quando ela esbarra),
 *   "toc" do esbarrão, "uí-uí" da polícia na praça (uma vez; o núcleo decide quando).
 * - **Musiquinha do sorvete:** inteira uma vez ao chegar na vaga; depois uma frase de uns 8 s de vez
 *   em quando (a cada 90 a 120 s no mínimo), só com criança a até 20 blocos, sempre abaixo da
 *   trilha (segue o controle "Música").
 *
 * O pacote (`public/sons/pacotes/cidade-grande-veiculos.mp3`) só existe na cidade e desce em
 * segundo plano; sem ele, os veículos ficam mudos (nada vai para o console).
 */
import { lerIndiceSons } from './indiceSons';
import { inicioSemAtraso } from './vozesGravadas';
import type { ContextoAudio, FonteAudio, GrupoAudio, MotorAudio, NoAudio } from './motor';
import { criarGerador, type Gerador } from './variacao';
import type { TipoVeiculo } from '../jogo/veiculos';

// ------------------------------------------------------------------ modelo de marchas (puro)

/** Uma marcha: de que velocidade a que velocidade (blocos/s) e a rotação nas duas pontas. */
export interface Marcha {
  v0: number;
  v1: number;
  r0: number;
  r1: number;
  /** Pedal acelerando nesta marcha. */
  carga: number;
}

export interface PerfilMotor {
  marchas: readonly Marcha[];
  /** Pedal rodando na velocidade de cruzeiro. */
  cruzeiro: number;
  /** Pedal parado (marcha lenta). */
  lenta: number;
}

/**
 * As curvas das passadas do esboço (rotação = taxa de leitura; 1 = marcha lenta da gravação),
 * nas velocidades do jogo (0 a 3 blocos/s, arrancada de 1,2 blocos/s²):
 * - carro: 1 → 2,35 | 1,55 → 2,15 | 1,6 → 1,95 (roda a ~1,92 com o pedal em 0,32);
 * - polícia: o mesmo motor puxando um tiquinho mais;
 * - ônibus: diesel grave, 1 → 1,75 | 1,3 → 1,65 | 1,35 → 1,55;
 * - sorvete: van, duas marchas, 1 → 1,6 | 1,25 → 1,45.
 */
export const PERFIS_MOTOR: Record<'carro' | 'policia' | 'onibus' | 'sorvete', PerfilMotor> = {
  carro: {
    marchas: [
      { v0: 0, v1: 1.0, r0: 1.0, r1: 2.35, carga: 0.9 },
      { v0: 1.0, v1: 2.0, r0: 1.55, r1: 2.15, carga: 0.75 },
      { v0: 2.0, v1: 3.0, r0: 1.6, r1: 1.95, carga: 0.55 },
    ],
    cruzeiro: 0.32,
    lenta: 0.12,
  },
  policia: {
    marchas: [
      { v0: 0, v1: 1.0, r0: 1.0, r1: 2.5, carga: 0.95 },
      { v0: 1.0, v1: 2.0, r0: 1.6, r1: 2.3, carga: 0.8 },
      { v0: 2.0, v1: 3.0, r0: 1.7, r1: 2.05, carga: 0.6 },
    ],
    cruzeiro: 0.35,
    lenta: 0.12,
  },
  onibus: {
    marchas: [
      { v0: 0, v1: 1.0, r0: 1.0, r1: 1.75, carga: 0.85 },
      { v0: 1.0, v1: 2.0, r0: 1.3, r1: 1.65, carga: 0.75 },
      { v0: 2.0, v1: 3.0, r0: 1.35, r1: 1.55, carga: 0.55 },
    ],
    cruzeiro: 0.45,
    lenta: 0.15,
  },
  sorvete: {
    marchas: [
      { v0: 0, v1: 1.3, r0: 1.0, r1: 1.6, carga: 0.7 },
      { v0: 1.3, v1: 3.0, r0: 1.25, r1: 1.45, carga: 0.5 },
    ],
    cruzeiro: 0.35,
    lenta: 0.12,
  },
};

export function perfilDoTipo(t: TipoVeiculo): PerfilMotor {
  if (t === 'policia') return PERFIS_MOTOR.policia;
  if (t === 'onibusAzul' || t === 'onibusVerde') return PERFIS_MOTOR.onibus;
  if (t === 'sorvete') return PERFIS_MOTOR.sorvete;
  return PERFIS_MOTOR.carro;
}

export interface EstadoMotor {
  marcha: number;
  rpm: number;
  carga: number;
  /** Segundos que ainda faltam do alívio no pedal da troca de marcha. */
  troca: number;
  /** Tempo corrido (a marcha lenta respira devagar). */
  t: number;
}

export const ESTADO_MOTOR_INICIAL: Readonly<EstadoMotor> = {
  marcha: 0,
  rpm: 1,
  carga: 0.12,
  troca: 0,
  t: 0,
};

/** Duração do alívio no pedal na troca de marcha (s). */
export const TEMPO_TROCA = 0.16;
/** Abaixo disso (blocos/s) a embreagem solta: marcha lenta. */
const V_EMBREAGEM = 0.3;
/** Constantes de tempo da rotação e do pedal (s). */
const TAU_RPM = 0.09;
const TAU_CARGA = 0.06;

/** Rotação na marcha `m` à velocidade `v` (segue a reta da marcha um pouco além das pontas). */
export function rotacaoNaMarcha(m: Marcha, v: number): number {
  const k = (m.r1 - m.r0) / (m.v1 - m.v0);
  return Math.max(1, m.r0 + k * (v - m.v0));
}

/**
 * Um passo do motor: a marcha, a rotação e o pedal a partir da velocidade `v` e da aceleração `a`
 * (blocos/s e blocos/s²) do veículo. Sobe de marcha acelerando quando passa do fim da marcha;
 * reduz soltando o pedal quando cai bem abaixo do começo dela (a rotação pula, como no esboço).
 */
export function passoMotor(
  e: EstadoMotor,
  p: PerfilMotor,
  v: number,
  a: number,
  dt: number,
): EstadoMotor {
  const ms = p.marchas;
  let marcha = Math.min(e.marcha, ms.length - 1);
  let troca = Math.max(0, e.troca - dt);
  let alvoRpm: number;
  let alvoCarga: number;
  if (v < V_EMBREAGEM && a <= 0.05) {
    // parado ou chegando: embreagem solta, marcha lenta respirando
    marcha = 0;
    alvoRpm = 1 + 0.015 * Math.sin((2 * Math.PI * e.t) / 3);
    alvoCarga = p.lenta;
  } else {
    if (a > 0.05) {
      // acelerando: sobe ao passar do fim da marcha; nunca numa marcha alta demais para a velocidade
      while (marcha < ms.length - 1 && v >= ms[marcha].v1) {
        marcha++;
        troca = TEMPO_TROCA;
      }
      while (marcha > 0 && v < ms[marcha].v0 - 0.05) marcha--;
    } else if (a < -0.05) {
      // soltando o pedal: reduz quando cai bem abaixo do começo da marcha
      while (marcha > 0 && v < ms[marcha].v0 - 0.35 * (ms[marcha].v1 - ms[marcha].v0)) marcha--;
    } else {
      // rodando: a marcha da velocidade
      while (marcha < ms.length - 1 && v >= ms[marcha].v1) marcha++;
      while (marcha > 0 && v < ms[marcha].v0 - 0.05) marcha--;
    }
    alvoRpm = rotacaoNaMarcha(ms[marcha], v);
    alvoCarga = a > 0.05 ? ms[marcha].carga : a < -0.05 ? 0 : p.cruzeiro;
    if (troca > 0) alvoCarga = 0.05;
  }
  const kr = 1 - Math.exp(-dt / TAU_RPM);
  const kc = 1 - Math.exp(-dt / TAU_CARGA);
  return {
    marcha,
    rpm: e.rpm + (alvoRpm - e.rpm) * kr,
    carga: e.carga + (alvoCarga - e.carga) * kc,
    troca,
    t: e.t + dt,
  };
}

/** Nível do motor pela rotação e pelo pedal (a conta do esboço). */
export function nivelMotor(rpm: number, carga: number): number {
  return 0.5 + 0.5 * carga + 0.25 * (rpm - 1);
}

// ------------------------------------------------------------------ distância e lado (puro)

/** Motores: cheios até 4 blocos, somem até 16. */
export const MOTOR_CHEIO = 4;
export const MOTOR_SOME = 16;
/** Toques (buzina, freio, uí-uí) e a musiquinha: cheios até 4, somem até 24. */
export const TOQUE_SOME = 24;
/** Quantos motores tocam ao mesmo tempo. */
export const MAX_MOTORES = 3;

/** Volume pela distância (0 a 1): cheio até `cheio`, cai macio até `some`. */
export function volumeDistancia(d: number, cheio = MOTOR_CHEIO, some = MOTOR_SOME): number {
  if (d <= cheio) return 1;
  if (d >= some) return 0;
  const u = 1 - (d - cheio) / (some - cheio);
  return u * u;
}

/**
 * Esquerda (−1) e direita (+1) do som: o lado do veículo visto pela câmera (`dx, dz` do ouvinte
 * ao veículo; `rx, rz` a direita da câmera no chão). Perto demais, vai para o meio.
 */
export function ladoDoSom(dx: number, dz: number, rx: number, rz: number): number {
  const d = Math.hypot(dx, dz);
  if (d < 1e-3) return 0;
  const rl = Math.hypot(rx, rz) || 1;
  const lado = (dx * rx + dz * rz) / (d * rl);
  return Math.max(-1, Math.min(1, lado * 0.8 * Math.min(1, d / 1.5)));
}

// ------------------------------------------------------------------ regra da musiquinha (pura)

export const FRASE_MIN_S = 90;
export const FRASE_MAX_S = 120;
export const SORVETE_PERTO = 20;

export interface EstadoSorvete {
  /** Quando a próxima frase pode tocar (s); null antes de chegar na vaga. */
  proxima: number | null;
}

/**
 * O que a musiquinha toca agora: `inteira` ao chegar à vaga (uma vez por chegada); parada na
 * vaga, uma `frase` quando o tempo de espera passou e há criança a até 20 blocos (a espera
 * seguinte é sorteada de 90 a 120 s depois da frase). Fora da vaga, nada.
 */
export function passoSorvete(
  e: EstadoSorvete,
  s: {
    agora: number;
    chegou: boolean;
    naVaga: boolean;
    criancaPerto: boolean;
    duracaoInteira: number;
  },
  rng: Gerador,
): { estado: EstadoSorvete; tocar: 'inteira' | 'frase' | null } {
  const espera = () => FRASE_MIN_S + rng() * (FRASE_MAX_S - FRASE_MIN_S);
  if (s.chegou) {
    return { estado: { proxima: s.agora + s.duracaoInteira + espera() }, tocar: 'inteira' };
  }
  if (!s.naVaga) return { estado: { proxima: null }, tocar: null };
  if (e.proxima === null) return { estado: { proxima: s.agora + espera() }, tocar: null };
  if (s.agora >= e.proxima && s.criancaPerto)
    return { estado: { proxima: s.agora + espera() }, tocar: 'frase' };
  return { estado: e, tocar: null };
}

// ------------------------------------------------------------------ volumes

/**
 * Ganho de cada som no pacote (todos gravados a −23 dB enquanto soam), para ficar onde o esboço
 * aprovado deixou contra a trilha da cidade (−24,6 dBFS no arquivo, que o jogo toca a 0,126 =
 * busMusica 0,6 × Música 60% × trilha gravada 0,7 × mestre do ambiente 0,5):
 * - motor perto, marcha lenta: 6,4 dB abaixo da trilha (−31 contra −24,6 no esboço); acelerando,
 *   uns 9 dB acima disso (o nível e a carga do esboço), de 1 a 3 dB abaixo da trilha;
 * - "uí-uí": −26 contra −24,6; freio a ar: no nível do motor do ônibus arrancando;
 * - musiquinha do sorvete: −30 contra −24,6 (5,4 dB abaixo da trilha);
 * - buzina e "toc" de perto: no grupo dos efeitos, no nível dos toques do canteiro.
 * A régua dos veículos (`reguaVeiculos.ts`, e2e) confere a rua contra a trilha sozinha.
 */
export const GANHO_SOM_VEICULO = {
  lacoCarro: 0.1,
  lacoOnibus: 0.13,
  lacoSorvete: 0.07,
  uiui: 0.09,
  freio: 0.08,
  sorvete: 0.056,
  buzina: 0.2,
  toc: 0.25,
} as const;

export type ChaveSomVeiculo =
  | 'lacoCarro'
  | 'lacoOnibus'
  | 'lacoSorvete'
  | 'freio'
  | 'uiui'
  | 'sorveteInteira'
  | 'sorveteFrase'
  | 'buzina'
  | 'toc';

export interface ClipVeiculo {
  o: [number, number];
  s: number;
  laco?: { P: number; L: number };
}

export function lacoDoTipo(t: TipoVeiculo): 'lacoCarro' | 'lacoOnibus' | 'lacoSorvete' {
  if (t === 'onibusAzul' || t === 'onibusVerde') return 'lacoOnibus';
  if (t === 'sorvete') return 'lacoSorvete';
  return 'lacoCarro';
}

// ------------------------------------------------------------------ o grafo de um motor

/** O mínimo da Web Audio que os sons dos veículos usam (o contexto do jogo ou um offline). */
export interface CtxVeiculo extends ContextoAudio {
  createBufferSource(): FonteAudio & {
    buffer: unknown;
    loop: boolean;
    loopStart: number;
    loopEnd: number;
    playbackRate: Param;
    start(quando?: number, offset?: number): void;
  };
  createBiquadFilter(): NoAudio & { type: string; frequency: Param; Q: Param };
  createGain(): NoAudio & { gain: Param };
  createStereoPanner?(): NoAudio & { pan: Param };
}

export interface Param {
  value: number;
  setTargetAtTime?(v: number, t: number, tau: number): void;
  cancelScheduledValues?(t: number): void;
  setValueAtTime?(v: number, t: number): void;
  linearRampToValueAtTime?(v: number, t: number): void;
}

export interface BufferVeiculo {
  readonly duration: number;
}

function alvo(p: Param, v: number, t: number, tau: number): void {
  if (p.setTargetAtTime) p.setTargetAtTime(v, t, tau);
  else p.value = v;
}

export interface VozMotor {
  readonly fonte: FonteAudio;
  /** Rotação, pedal, volume (já com a distância) e lado. */
  definir(rpm: number, carga: number, volume: number, pan: number): void;
  /** Esmaece e para. */
  parar(seg?: number): void;
}

/**
 * Monta um motor: o laço lido na taxa da rotação, os caminhos abafado e claro com a carga entre
 * eles, o nível e o lado. `ini`: o começo sem o atraso do codificador.
 */
export function montarMotor(
  ctx: CtxVeiculo,
  destino: NoAudio,
  buffer: BufferVeiculo,
  clip: ClipVeiculo,
  ganho: number,
  rng: Gerador,
): VozMotor {
  const ini = inicioSemAtraso(buffer.duration, clip.s);
  const P = clip.laco?.P ?? 0;
  const L = clip.laco?.L ?? Math.round(buffer.duration * 22050);
  const fonte = ctx.createBufferSource();
  fonte.buffer = buffer;
  fonte.loop = true;
  fonte.loopStart = ini + P / 22050;
  fonte.loopEnd = ini + (P + L) / 22050;
  // abafado: passa-baixa de 900 Hz (2ª ordem)
  const baixa = ctx.createBiquadFilter();
  baixa.type = 'lowpass';
  baixa.frequency.value = 900;
  baixa.Q.value = Math.SQRT1_2;
  const gEscuro = ctx.createGain();
  // claro: o som cheio + 0,7 de um passa-alta de 400 Hz
  const alta = ctx.createBiquadFilter();
  alta.type = 'highpass';
  alta.frequency.value = 400;
  alta.Q.value = Math.SQRT1_2;
  const gAlta = ctx.createGain();
  gAlta.gain.value = 0.7;
  const gClaro = ctx.createGain();
  const nivel = ctx.createGain();
  nivel.gain.value = 0;
  fonte.connect(baixa);
  baixa.connect(gEscuro);
  gEscuro.connect(nivel);
  fonte.connect(gClaro);
  fonte.connect(alta);
  alta.connect(gAlta);
  gAlta.connect(gClaro);
  gClaro.connect(nivel);
  const pan = ctx.createStereoPanner?.() ?? null;
  if (pan) {
    nivel.connect(pan);
    pan.connect(destino);
  } else nivel.connect(destino);
  const t0 = ctx.currentTime;
  fonte.start(t0, fonte.loopStart + rng() * (L / 22050));
  let parado = false;
  return {
    fonte,
    definir(rpm, carga, volume, lado) {
      if (parado) return;
      const t = ctx.currentTime;
      alvo(fonte.playbackRate, rpm, t, 0.04);
      alvo(gEscuro.gain, 1 - carga, t, 0.04);
      alvo(gClaro.gain, carga, t, 0.04);
      alvo(nivel.gain, ganho * nivelMotor(rpm, carga) * volume, t, 0.08);
      if (pan) alvo(pan.pan, lado, t, 0.08);
    },
    parar(seg = 0.25) {
      if (parado) return;
      parado = true;
      const t = ctx.currentTime;
      const g = nivel.gain;
      try {
        g.cancelScheduledValues?.(t);
        if (g.setValueAtTime && g.linearRampToValueAtTime) {
          g.setValueAtTime(g.value, t);
          g.linearRampToValueAtTime(0, t + seg);
        } else g.value = 0;
        fonte.stop(t + seg + 0.02);
      } catch {
        // já parada
      }
    },
  };
}

/** Um toque gravado (buffer inteiro) com volume e lado. */
export function montarToque(
  ctx: CtxVeiculo,
  destino: NoAudio,
  buffer: BufferVeiculo,
  clip: ClipVeiculo,
  ganho: number,
  lado: number,
  quando = 0,
): {
  fonte: FonteAudio;
  volume: NoAudio & { gain: Param };
  pan: (NoAudio & { pan: Param }) | null;
} {
  const ini = inicioSemAtraso(buffer.duration, clip.s);
  const fonte = ctx.createBufferSource();
  fonte.buffer = buffer;
  const g = ctx.createGain();
  g.gain.value = ganho;
  fonte.connect(g);
  const pan = ctx.createStereoPanner?.() ?? null;
  if (pan) {
    pan.pan.value = lado;
    g.connect(pan);
    pan.connect(destino);
  } else g.connect(destino);
  fonte.start(Math.max(ctx.currentTime, quando), ini);
  return { fonte, volume: g, pan };
}

// ------------------------------------------------------------------ o tocador do jogo

export interface VeiculoOuvido {
  id: number;
  tipo: TipoVeiculo;
  x: number;
  z: number;
  v: number;
  a: number;
  /** O que está fazendo ('vaga' é o sorvete parado servindo). */
  k?: string;
}

export interface Ouvinte {
  x: number;
  z: number;
  /** A direita da câmera no chão. */
  rx: number;
  rz: number;
}

export interface OpcoesSomVeiculos {
  motor: MotorAudio;
  base?: string;
  baixar?: (url: string) => Promise<ArrayBuffer>;
  carregarIndice?: (url: string) => Promise<unknown>;
  decodificar?: (bytes: ArrayBuffer) => Promise<BufferVeiculo>;
  rng?: Gerador;
  /** Testes de tela: o que tocou. */
  aoTocar?: (id: string) => void;
}

interface Vaga {
  veiculo: number;
  tipo: TipoVeiculo;
  voz: VozMotor;
  laco: ChaveSomVeiculo;
  estado: EstadoMotor;
}

interface Musiquinha {
  fonte: FonteAudio;
  volume: NoAudio & { gain: Param };
  pan: (NoAudio & { pan: Param }) | null;
  fim: number;
  qual: 'inteira' | 'frase';
}

const PACOTE = 'cidade-grande-veiculos.mp3';

export type SomVeiculos = ReturnType<typeof criarSomVeiculos>;

export function criarSomVeiculos(op: OpcoesSomVeiculos) {
  const { motor } = op;
  const base = op.base ?? '/';
  const rng = op.rng ?? criarGerador(0x5014);
  const baixar =
    op.baixar ??
    (async (url: string) => {
      const r = await fetch(url, { priority: 'low' } as RequestInit);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.arrayBuffer();
    });
  const carregarIndice = op.carregarIndice ?? lerIndiceSons;
  let clips: Partial<Record<ChaveSomVeiculo, ClipVeiculo>> = {};
  let pacote: ArrayBuffer | null = null;
  const buffers = new Map<ChaveSomVeiculo, Promise<BufferVeiculo | null>>();
  const prontos = new Map<ChaveSomVeiculo, BufferVeiculo>();
  let carregando = false;
  let pronto = false;
  let geracao = 0;
  const vagas: Vaga[] = [];
  const motores = new Map<number, EstadoMotor>();
  let sorvete: EstadoSorvete = { proxima: null };
  let musiquinha: Musiquinha | null = null;
  let chegouSorvete = false;
  let volumeMusica = 1;
  let volumeRua = 1;
  /** Testes (a régua da rua): os veículos calados. */
  let mudo = false;
  let ultimo = -1;
  const ultimaBuzina = new Map<number, number>();

  function decodificar(bytes: ArrayBuffer): Promise<BufferVeiculo> {
    if (op.decodificar) return op.decodificar(bytes);
    type Dec = { decodeAudioData(b: ArrayBuffer): Promise<BufferVeiculo> };
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

  function buffer(k: ChaveSomVeiculo): Promise<BufferVeiculo | null> {
    let p = buffers.get(k);
    if (p) return p;
    const c = clips[k];
    if (!c || !pacote) return Promise.resolve(null);
    const minha = geracao;
    p = decodificar(pacote.slice(c.o[0], c.o[0] + c.o[1])).then(
      (b) => {
        if (minha !== geracao) return null;
        prontos.set(k, b);
        return b;
      },
      () => {
        buffers.delete(k);
        return null;
      },
    );
    buffers.set(k, p);
    return p;
  }

  function carregar(): void {
    if (carregando) return;
    carregando = true;
    const minha = geracao;
    void (async () => {
      try {
        const [ind, pac] = await Promise.all([
          carregarIndice(`${base}sons/indice.json`),
          baixar(`${base}sons/pacotes/${PACOTE}`),
        ]);
        if (minha !== geracao) return;
        const v = (ind as { temas?: Record<string, { veiculos?: Record<string, ClipVeiculo> }> })
          ?.temas?.['cidade-grande']?.veiculos;
        if (!v) return;
        clips = v as typeof clips;
        pacote = pac;
        pronto = true;
        // os laços já: o primeiro motor não espera
        for (const k of ['lacoCarro', 'lacoOnibus', 'lacoSorvete', 'buzina', 'toc'] as const)
          void buffer(k);
      } catch {
        // sem rede ou sem o pacote: veículos mudos
      }
    })();
  }

  const podeTocar = () => motor.estado === 'ativo' && !motor.mudo && !!motor.contexto;

  /** Toca um toque no grupo; volume já com a distância. */
  function toque(
    k: ChaveSomVeiculo,
    ganho: number,
    lado: number,
    grupo: GrupoAudio,
    id: string,
  ): void {
    if (!podeTocar() || ganho <= 0.002) return;
    const c = clips[k];
    if (!c) return;
    void buffer(k).then((b) => {
      if (!b || !podeTocar()) return;
      const ok = motor.tocar(
        (ctx, destino) => montarToque(ctx as CtxVeiculo, destino, b, c, ganho, lado).fonte,
        { grupo },
      );
      if (ok) op.aoTocar?.(id);
    });
  }

  function tocarMusiquinha(qual: 'inteira' | 'frase', vol: number, lado: number): void {
    const k: ChaveSomVeiculo = qual === 'inteira' ? 'sorveteInteira' : 'sorveteFrase';
    const c = clips[k];
    if (!c || !podeTocar()) return;
    void buffer(k).then((b) => {
      if (!b || !podeTocar()) return;
      musiquinha?.fonte.stop();
      let m: Musiquinha | null = null;
      const ok = motor.tocar(
        (ctx, destino) => {
          const r = montarToque(
            ctx as CtxVeiculo,
            destino,
            b,
            c,
            GANHO_SOM_VEICULO.sorvete * vol * volumeMusica,
            lado,
          );
          m = { ...r, fim: ctx.currentTime + b.duration, qual };
          return r.fonte;
        },
        { grupo: 'ambiente', prioridade: 'alta' },
      );
      if (ok && m) {
        const mm = m as Musiquinha;
        musiquinha = mm;
        const doMotor = mm.fonte.onended;
        mm.fonte.onended = () => {
          doMotor?.();
          if (musiquinha === mm) musiquinha = null;
        };
        op.aoTocar?.(`sorvete:${qual}`);
      }
    });
  }

  function soltarVaga(i: number): void {
    vagas[i].voz.parar();
    vagas.splice(i, 1);
  }

  /**
   * Um quadro: o modelo de cada motor, os 3 motores mais perto, a musiquinha. `agora` em
   * segundos (relógio da página).
   */
  function quadro(lista: readonly VeiculoOuvido[], ouvinte: Ouvinte, agora: number): void {
    const dt = ultimo < 0 ? 0.05 : Math.min(0.25, Math.max(0, agora - ultimo));
    ultimo = agora;
    // o motor de cada veículo anda sempre (quando entra no som, já está na rotação certa)
    for (const ve of lista) {
      const e = motores.get(ve.id) ?? { ...ESTADO_MOTOR_INICIAL };
      motores.set(ve.id, passoMotor(e, perfilDoTipo(ve.tipo), ve.v, ve.a, dt));
    }
    const sorveteVe = lista.find((v) => v.tipo === 'sorvete');
    const dist = (v: VeiculoOuvido) => Math.hypot(v.x - ouvinte.x, v.z - ouvinte.z);
    // musiquinha do sorvete
    if (sorveteVe) {
      const d = dist(sorveteVe);
      const r = passoSorvete(
        sorvete,
        {
          agora,
          chegou: chegouSorvete,
          naVaga: sorveteVe.k === 'vaga',
          criancaPerto: d <= SORVETE_PERTO,
          duracaoInteira: clips.sorveteInteira?.s ?? 24,
        },
        rng,
      );
      chegouSorvete = false;
      sorvete = r.estado;
      const vol = volumeDistancia(d, MOTOR_CHEIO, TOQUE_SOME);
      const lado = ladoDoSom(
        sorveteVe.x - ouvinte.x,
        sorveteVe.z - ouvinte.z,
        ouvinte.rx,
        ouvinte.rz,
      );
      if (r.tocar && pronto && !mudo && vol > 0.01) tocarMusiquinha(r.tocar, vol, lado);
      if (musiquinha && motor.contexto) {
        const t = motor.contexto.currentTime;
        alvo(musiquinha.volume.gain, GANHO_SOM_VEICULO.sorvete * vol * volumeMusica, t, 0.15);
        if (musiquinha.pan) alvo(musiquinha.pan.pan, lado, t, 0.15);
      }
    }
    if (!pronto || !podeTocar() || mudo) {
      for (let i = vagas.length - 1; i >= 0; i--) soltarVaga(i);
      return;
    }
    // os mais perto, ouvíveis
    const perto = lista
      .map((v) => ({ v, d: dist(v) }))
      .filter((x) => x.d < MOTOR_SOME)
      .sort((a, b) => a.d - b.d)
      .slice(0, MAX_MOTORES);
    const querIds = new Set(perto.map((x) => x.v.id));
    for (let i = vagas.length - 1; i >= 0; i--) if (!querIds.has(vagas[i].veiculo)) soltarVaga(i);
    for (const { v, d } of perto) {
      let vg = vagas.find((x) => x.veiculo === v.id);
      if (!vg) {
        const k = lacoDoTipo(v.tipo);
        const b = prontos.get(k);
        const c = clips[k];
        if (!b || !c) {
          void buffer(k);
          continue;
        }
        let voz: VozMotor | null = null;
        const ganho = GANHO_SOM_VEICULO[k];
        const ok = motor.tocar(
          (ctx, destino) => {
            voz = montarMotor(ctx as CtxVeiculo, destino, b, c, ganho, rng);
            return voz.fonte;
          },
          { grupo: 'ambiente', prioridade: 'alta' },
        );
        if (!ok || !voz) continue;
        vg = { veiculo: v.id, tipo: v.tipo, voz, laco: k, estado: motores.get(v.id)! };
        vagas.push(vg);
        op.aoTocar?.(`motor:${v.tipo}`);
      }
      const e = motores.get(v.id)!;
      vg.estado = e;
      const lado = ladoDoSom(v.x - ouvinte.x, v.z - ouvinte.z, ouvinte.rx, ouvinte.rz);
      vg.voz.definir(e.rpm, e.carga, volumeDistancia(d) * volumeRua, lado);
    }
  }

  /** Um evento do núcleo (buzina, ponto, chegou, uí-uí). */
  function evento(o: string, ve: VeiculoOuvido | undefined, ouvinte: Ouvinte, agora: number): void {
    if (o === 'chegou' && ve?.tipo === 'sorvete') chegouSorvete = true;
    if (!ve || mudo) return;
    const dx = ve.x - ouvinte.x;
    const dz = ve.z - ouvinte.z;
    const vol = volumeDistancia(Math.hypot(dx, dz), MOTOR_CHEIO, TOQUE_SOME);
    const lado = ladoDoSom(dx, dz, ouvinte.rx, ouvinte.rz);
    if (o === 'buzina') buzina(ve, vol, lado, agora);
    else if (o === 'ponto')
      toque('freio', GANHO_SOM_VEICULO.freio * vol * volumeRua, lado, 'ambiente', 'freio');
    else if (o === 'uiui')
      toque('uiui', GANHO_SOM_VEICULO.uiui * vol * volumeRua, lado, 'ambiente', 'uiui');
  }

  function buzina(ve: VeiculoOuvido, vol: number, lado: number, agora: number): void {
    if (agora - (ultimaBuzina.get(ve.id) ?? -Infinity) < 3) return;
    ultimaBuzina.set(ve.id, agora);
    toque('buzina', GANHO_SOM_VEICULO.buzina * vol, lado, 'efeitos', 'buzina');
  }

  return {
    carregar,
    quadro,
    evento,
    /** A criança esbarrou no veículo: "toc" e um "fom" dele (uma vez a cada 3 s por veículo). */
    esbarrao(ve: VeiculoOuvido, ouvinte: Ouvinte, agora: number): void {
      if (agora - (ultimaBuzina.get(ve.id) ?? -Infinity) < 3) return;
      const lado = ladoDoSom(ve.x - ouvinte.x, ve.z - ouvinte.z, ouvinte.rx, ouvinte.rz);
      toque('toc', GANHO_SOM_VEICULO.toc, lado, 'efeitos', 'toc');
      buzina(ve, 1, lado, agora);
    },
    /** Controles "Música" (a musiquinha fica abaixo da trilha) e "Ambiente" (os motores). */
    definirVolumes(musica: number, ambiente: number): void {
      volumeMusica = Math.max(0, Math.min(1, musica / 0.6));
      volumeRua = Math.max(0, Math.min(1.25, ambiente / 0.8));
    },
    get pronto() {
      return pronto;
    },
    /** Testes: cala os veículos (para medir a rua sem eles). */
    definirMudo(m: boolean): void {
      mudo = m;
      if (m && musiquinha) {
        try {
          musiquinha.fonte.stop();
        } catch {
          // já parada
        }
      }
    },
    /** Testes: os motores que tocam agora e o estado da musiquinha. */
    info() {
      return {
        pronto,
        motores: vagas.map((v) => ({
          id: v.veiculo,
          tipo: v.tipo,
          marcha: v.estado.marcha,
          rpm: Math.round(v.estado.rpm * 1000) / 1000,
          carga: Math.round(v.estado.carga * 1000) / 1000,
        })),
        musiquinha: musiquinha?.qual ?? null,
        proximaFrase: sorvete.proxima,
      };
    },
    liberar(): void {
      geracao++;
      for (let i = vagas.length - 1; i >= 0; i--) soltarVaga(i);
      try {
        musiquinha?.fonte.stop();
      } catch {
        // já parada
      }
      musiquinha = null;
      buffers.clear();
      prontos.clear();
      pacote = null;
      pronto = false;
      carregando = false;
    },
  };
}
