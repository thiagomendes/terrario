/**
 * Spec 019 (T04): vozes gravadas dos bichos e dos moradores, o baque do golpe pelo porte e
 * pelo material de cada bicho e o "puf" da derrota.
 *
 * - O pacote do tema (`public/sons/pacotes/<tema>-vozes.mp3`) e o comum (`comum-vozes.mp3`)
 *   descem em segundo plano quando o mundo abre: o mundo nunca espera por eles.
 * - Cada som é uma fatia do pacote (`o: [início, tamanho]` em bytes, no `indice.json`). A
 *   fatia só é decodificada no primeiro toque (a 22 050 Hz, a taxa dos arquivos, num
 *   OfflineAudioContext: metade da memória de 48 kHz) e fica guardada até sair do mundo.
 * - Atraso do codificador: se a fatia decodificada sobra mais que 5 ms além da duração
 *   nominal, o começo pula até 1105 amostras (o atraso do LAME), como no esboço aprovado.
 * - A versão é sorteada sem repetir a última, com ±3% de tom.
 * - Teto de 8 vozes: a mais velha sai (esmaece em 30 ms) para a nova entrar.
 * - Reserva: enquanto o pacote não chegou ou se ele falhar, toca a voz sintetizada de hoje
 *   (nada fica mudo, nada vai para o console).
 */
import { lerIndiceSons } from './indiceSons';
import { desenharVoz } from './sons';
import { criarGerador, type Gerador } from './variacao';
import type { ContextoAudio, Desenho, FonteAudio, GrupoAudio, MotorAudio, NoAudio } from './motor';
import type { PioCriatura } from '../temas/tipos';
import type { TipoCriatura } from '../jogo/criaturas';

export type MomentoBicho = 'chamado' | 'susto' | 'contente' | 'ai';
export type MomentoMorador = 'cumprimento' | 'contente' | 'obrigado' | 'surpresa';
export type GeneroVoz = 'feminino' | 'masculino';

export interface ClipIndice {
  /** Início e tamanho da fatia no pacote, em bytes. */
  o: [number, number];
  /** Duração nominal (s). */
  s: number;
}

export interface CriaturaIndice {
  slot: TipoCriatura;
  nome: string;
  porte: 'pequeno' | 'medio' | 'grande';
  momentos: Record<MomentoBicho, ClipIndice[]>;
  /** Chave do baque no comum: `<material>.<porte>`. */
  baque: string;
  /** Chave da derrota no comum. */
  derrota: string;
  filhote?: { nome: string; momentos: Record<MomentoBicho, ClipIndice[]> };
}

export interface VozesTemaIndice {
  criaturas: CriaturaIndice[];
  /** Conjunto A (aprovado): `feminino` e `masculino`. As chaves `_b` ficam de fora. */
  moradores: Record<GeneroVoz, Record<MomentoMorador, ClipIndice[]>>;
}

export interface ComumIndice {
  baque: Record<string, ClipIndice[]>;
  derrota: Record<string, ClipIndice[]>;
}

/**
 * Spec 014 (T09): sons gravados do tema que não são vozes de bicho nem de morador, no mesmo
 * pacote de vozes: os do canteiro de obras (`obra`: plim da escala, acorde, ta-dá, "hum?"
 * do pedreiro, coreto, colher) e os do ambiente da rua (`ambiente`: pardal, buzininha ao
 * longe, grilo de jardim). Cada chave tem uma lista de fatias. Spec 027 (T21): os da Noite das
 * Fantasias (`festa`: a campainha, a lanterna, a risadinha, o Tufinho, o abraço, a varinha... e
 * `lugar`, o ambiente de cada lugar da festa; ver `somBaile.ts`).
 */
export type SecaoExtra = 'obra' | 'ambiente' | 'festa' | 'lugar';

/** O pedaço do `indice.json` que as vozes usam. */
export interface IndiceSons {
  temas: Record<
    string,
    {
      vozes?: VozesTemaIndice;
      obra?: Record<string, ClipIndice[]>;
      ambiente?: Record<string, ClipIndice[]>;
      festa?: Record<string, ClipIndice[]>;
      lugar?: Record<string, ClipIndice[]>;
    }
  >;
  comum: ComumIndice;
}

/** Taxa dos arquivos de voz. */
export const TAXA_VOZES = 22050;
/** Atraso do LAME, em segundos (1105 amostras a 22 050 Hz). */
export const ATRASO_CODIFICADOR = 1105 / TAXA_VOZES;
export const TETO_VOZES_GRAVADAS = 8;
/** Variação de tom de cada toque (±3%). */
export const VARIACAO_TOM = 0.03;
/**
 * Ganho das vozes gravadas de um tema fora de `NIVEL_VOZES` (a estimativa da T04). A régua da
 * T05 mostrou que, com ganho 1, as gravadas já soam de 1 a 9 dB acima das sintetizadas de hoje:
 * cada tema tem o seu ganho na tabela.
 */
export const GANHO_VOZ_GRAVADA = 1.25;
/** Baque e "puf": no nível do golpe de material de hoje. */
export const GANHO_BAQUE = 1;
/** Os grupos de som gravado com ganho próprio por tema (`NIVEL_VOZES`). */
export type GrupoNivelVoz = 'bichos' | 'moradores' | 'baque' | 'derrota';

/**
 * Ganho (dB) das vozes e dos golpes gravados por tema e grupo (spec 019, T05), medido na régua
 * de vozes (e2e/vozes-regua.spec.ts): o volume percebido de cada grupo gravado fica de 0 a 1 dB
 * abaixo do som de hoje no mesmo momento (a voz sintetizada, o baque de terra e o farfalhar da
 * derrota). Tema ou grupo que falta usa `GANHO_VOZ_GRAVADA` nas vozes e `GANHO_BAQUE` nos golpes.
 */
export const NIVEL_VOZES: Readonly<Record<string, Partial<Record<GrupoNivelVoz, number>>>> = {
  'doce-reino': { bichos: -3.5, moradores: -1.7, baque: 0.2, derrota: 0.5 },
  'exploracao-lunar': { bichos: -8.5, moradores: -9.8, baque: -3.8, derrota: -1.1 },
  'rancho-alegre': { bichos: -5.9, moradores: -3.0, baque: -1.3, derrota: 0.4 },
  'cidade-grande': { bichos: -7.7, moradores: -3.2, baque: -0.6, derrota: 0.45 },
  // spec 026: a Vila Neon não tem vozes gravadas (os bichos e os moradores do bairro usam a voz
  // sintetizada do tema, src/temas/vila-neon/vozes.ts): o carregador nem baixa pacote de vozes
  // spec 027 (T21): os bichos e os moradores da festa são síntese nossa na régua da 019 (-23 dB
  // "enquanto soa", como os outros pacotes); os bichos no meio dos do Rancho e da Cidade, o baque e
  // o "puf" no nível do Rancho. T23: os moradores tinham o ganho dos da Cidade (-3,2), e a régua
  // de vozes deu +1,42 dB acima da voz sintetizada de hoje (o sabor "festa" tem mais brilho):
  // -5,1 deixa ~0,5 dB abaixo, no meio da faixa da 019
  'noite-das-fantasias': { bichos: -6.8, moradores: -5.1, baque: -1.3, derrota: 0.4 },
};

/**
 * Spec 014 (T09): ganho (dB) de cada som extra gravado (`secao.chave`), medido na régua de
 * vozes (o canteiro contra o som sintetizado de antes, de 0 a 1,5 dB abaixo; o ambiente
 * contra os passarinhos e grilos sintetizados de hoje). Chave que falta: 0 dB.
 */
export const NIVEL_EXTRAS: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  'cidade-grande': {
    'obra.plim': -7.9,
    'obra.acorde': -9.4,
    'obra.tada': -10.0,
    'obra.tadaGrande': -11.8,
    'obra.hum': -11.2,
    'obra.coreto': -13.9,
    'obra.colher': -11.7,
    'ambiente.pardal': -18.6,
    'ambiente.buzininha': -30.2,
    'ambiente.grilo': -29.8,
  },
  // spec 027 (T21): os sons da festa na régua da 019 (-23 dB "enquanto soa"), no nível dos toques
  // da Vila Neon (`GANHO_RUA`, a mesma régua: a campainha a -11); o ambiente de cada lugar (`lugar`)
  // sai a -27 no arquivo e fica no nível do pardal e do grilo da Cidade. Conferidos na saída do jogo
  // (e2e/noite-fantasias-som.spec.ts): nenhum acima de -12 LUFS momentâneo a 2 blocos.
  'noite-das-fantasias': {
    'festa.campainha': -11,
    'festa.lanterna': -11,
    'festa.risadinha': -11,
    'festa.confete': -12,
    'festa.miau': -10,
    'festa.ronrono': -11,
    'festa.abraco': -11,
    'festa.varinha': -12,
    'festa.abobora': -12,
    'festa.apito': -11,
    'lugar.sininhos': -15,
    'lugar.campainhaLonge': -16,
    'lugar.risadinhaLonge': -16,
    'lugar.grilo': -22,
    'lugar.corujinha': -15,
    'lugar.regador': -17,
    'lugar.abobora': -15,
  },
};

/** O ganho (linear) de um som extra gravado do tema. */
export function ganhoExtra(temaId: string, secao: SecaoExtra, chave: string): number {
  const db = NIVEL_EXTRAS[temaId]?.[`${secao}.${chave}`] ?? 0;
  return Math.pow(10, db / 20);
}

/** O ganho (linear) do grupo gravado no tema. */
export function ganhoVozGravada(temaId: string, grupo: GrupoNivelVoz): number {
  const db = NIVEL_VOZES[temaId]?.[grupo];
  if (db !== undefined) return Math.pow(10, db / 20);
  return grupo === 'bichos' || grupo === 'moradores' ? GANHO_VOZ_GRAVADA : GANHO_BAQUE;
}

/** O golpe da própria criança nunca soa abaixo disto (o bicho pode estar a uns passos). */
export const VOLUME_MINIMO_MEU_GOLPE = 0.35;

/**
 * Volume do golpe e da derrota de um bicho. O núcleo avisa todo golpe e toda derrota do mundo
 * (de um amigo longe, o espectro que o sol desfaz, o bicho que caiu no vazio): esses soam pela
 * distância e, longe ou sem a criatura à vista, não soam (0). Só o golpe da própria criança tem
 * o piso, e soa mesmo se o bicho já sumiu da lista (a derrota chega depois).
 * `distancia`: o volume da distância (0 a 1), ou null sem a criatura.
 */
export function volumeDoGolpeNoBicho(distancia: number | null, meu: boolean): number {
  const v = distancia ?? 0;
  return meu ? Math.max(VOLUME_MINIMO_MEU_GOLPE, v) : Math.max(0, v);
}

/** O "ai" entra logo depois do baque (s), como no esboço. */
export const ATRASO_AI = 0.06;

/** Intervalo mínimo (ms) entre dois toques do mesmo momento do mesmo bicho ou morador. */
export const ESPERA_MOMENTO: Record<string, number> = {
  chamado: 2000,
  susto: 500,
  contente: 700,
  ai: 180,
  baque: 60,
  derrota: 150,
  cumprimento: 900,
  obrigado: 900,
  surpresa: 600,
};

// ------------------------------------------------------------------ contas puras

/** Sorteio sem repetir a última versão de cada lista (pela chave). */
export function criarSorteio(rng: Gerador): (n: number, chave: string) => number {
  const ultimo = new Map<string, number>();
  return (n, chave) => {
    if (n <= 1) {
      ultimo.set(chave, 0);
      return 0;
    }
    const antes = ultimo.get(chave);
    let i = Math.floor(rng() * n);
    if (i === antes) i = (i + 1 + Math.floor(rng() * (n - 1))) % n;
    ultimo.set(chave, i);
    return i;
  };
}

/** Quanto pular no começo da fatia decodificada (atraso do codificador), em segundos. */
export function inicioSemAtraso(duracaoDecodificada: number, nominal: number): number {
  const sobra = duracaoDecodificada - nominal;
  return sobra > 0.005 ? Math.min(sobra, ATRASO_CODIFICADOR) : 0;
}

/** Tom do toque: 1 ± 3%. */
export function tomVariado(rng: Gerador): number {
  return 1 - VARIACAO_TOM + rng() * VARIACAO_TOM * 2;
}

/** O bicho do tema no índice. */
export function criaturaDoIndice(
  vozes: VozesTemaIndice | undefined,
  slot: TipoCriatura,
): CriaturaIndice | undefined {
  const lista = vozes?.criaturas;
  return Array.isArray(lista) ? lista.find((c) => c?.slot === slot) : undefined;
}

/** Material e porte do baque e o "puf" da derrota de cada bicho, pelo índice do tema. */
export function somDoGolpe(
  vozes: VozesTemaIndice | undefined,
  slot: TipoCriatura,
): { material: string; porte: string; baque: string; derrota: string } | null {
  const c = criaturaDoIndice(vozes, slot);
  if (!c || typeof c.baque !== 'string') return null;
  const [material, porte] = c.baque.split('.');
  return { material, porte: porte ?? c.porte, baque: c.baque, derrota: c.derrota };
}

// ------------------------------------------------------------------ o tocador

/** O mínimo de um AudioBuffer que o tocador usa. */
export interface BufferVoz {
  readonly duration: number;
}

export interface ReservaVozes {
  /** A voz sintetizada de hoje para o bicho (o "ai" usa o susto). */
  bicho(slot: TipoCriatura, momento: MomentoBicho): PioCriatura | undefined;
  /** A voz sintetizada de hoje para o morador. */
  morador(momento: MomentoMorador): PioCriatura | undefined;
  /** O baque de hoje (amostra de material), sem o vidro: só quando o pacote não veio. */
  golpe(): void;
}

export interface OpcoesVozesGravadas {
  motor: MotorAudio;
  /** Id do tema do mundo (nome do pacote). */
  tema: string;
  reserva: ReservaVozes;
  /** Raiz do site (BASE_URL). */
  base?: string;
  baixar?: (url: string, sinal?: AbortSignal) => Promise<ArrayBuffer>;
  carregarIndice?: (url: string, sinal?: AbortSignal) => Promise<IndiceSons>;
  decodificar?: (bytes: ArrayBuffer) => Promise<BufferVoz>;
  rng?: Gerador;
  /** Relógio em ms (esperas entre momentos). */
  agora?: () => number;
  /** Testes de tela: o que tocou (`gravada:...` ou `sintese:...`). */
  aoTocar?: (id: string) => void;
}

export interface OpcoesToque {
  /** 0..1 (distância). */
  volume?: number;
  /** Quem fala (id da criatura): a espera entre momentos é por quem. */
  quem?: number | string;
  /** Multiplica o tom sorteado (recusa gentil um pouco mais grave). */
  tom?: number;
}

export interface OpcoesExtra {
  /** 0..1. */
  volume?: number;
  indice?: number;
  grupo?: GrupoAudio;
  /** Sem o gravado: o som de antes (devolve se tocou). */
  reserva?: () => boolean;
}

export interface VozesGravadas {
  /** Pacote e índice baixados (as fatias abrem no primeiro toque). */
  readonly pronto: boolean;
  readonly falhou: boolean;
  /** Fatias já decodificadas. */
  readonly decodificadas: number;
  /** Começa a baixar em segundo plano (pode chamar mais de uma vez). */
  carregar(): void;
  bicho(slot: TipoCriatura, momento: MomentoBicho, op?: OpcoesToque): void;
  /** Golpe no bicho: o baque do material e do porte dele e, logo depois, o "ai". */
  golpe(slot: TipoCriatura, op?: OpcoesToque): void;
  /** Bicho derrotado: "puf" fofo (ou "plop" do peixe, ou o robô). */
  derrota(slot: TipoCriatura, op?: OpcoesToque): void;
  morador(genero: GeneroVoz, momento: MomentoMorador, op?: OpcoesToque): void;
  /**
   * Spec 014 (T09): um som extra gravado do tema (`obra` ou `ambiente`), sem variar o tom (o
   * plim toca a escala). `indice` escolhe a fatia (o plim de cada nota); sem ele, sorteia sem
   * repetir. Sem o pacote (ou sem a chave), chama `reserva` (o som sintetizado de antes).
   */
  extra(secao: SecaoExtra, chave: string, op: OpcoesExtra): void;
  /** O tema tem este som extra gravado (o índice já chegou)? */
  temExtra(secao: SecaoExtra, chave: string): boolean;
  /** Sai do mundo: para as vozes e solta o pacote e as fatias (`carregar` baixa de novo). */
  liberar(): void;
}

interface Ativa {
  fonte: FonteAudio;
  saida: NoAudio & { gain: { value: number } };
  fimMs: number;
}

interface CtxVoz extends ContextoAudio {
  createBufferSource(): FonteAudio & {
    buffer: unknown;
    playbackRate: { value: number };
    start(quando?: number, offset?: number): void;
  };
}

type GanhoComRampa = NoAudio & {
  gain: {
    value: number;
    cancelScheduledValues?(t: number): void;
    setValueAtTime?(v: number, t: number): void;
    linearRampToValueAtTime?(v: number, t: number): void;
  };
};

async function baixarPadrao(url: string, sinal?: AbortSignal): Promise<ArrayBuffer> {
  // sem disputar a rede com o mundo; o cache do navegador guarda para a próxima vez
  const r = await fetch(url, { signal: sinal, priority: 'low' } as RequestInit);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.arrayBuffer();
}

/** O índice é o mesmo da música (`lerIndiceSons`): baixa e lê uma vez só. */
async function indicePadrao(url: string): Promise<IndiceSons> {
  const j = await lerIndiceSons(url);
  if (!j) throw new Error('sem índice');
  return j as IndiceSons;
}

/** Decodifica a 22 050 Hz num OfflineAudioContext; sem ele, no contexto do jogo. */
function criarDecodificador(motor: MotorAudio): (bytes: ArrayBuffer) => Promise<BufferVoz> {
  type Dec = {
    decodeAudioData(
      b: ArrayBuffer,
      ok?: (x: BufferVoz) => void,
      erro?: (e: unknown) => void,
    ): Promise<BufferVoz> | undefined;
  };
  let offline: Dec | null | undefined;
  const comContexto = (dc: Dec, bytes: ArrayBuffer) =>
    new Promise<BufferVoz>((ok, erro) => {
      let feito = false;
      const sim = (b: BufferVoz) => {
        if (!feito) {
          feito = true;
          ok(b);
        }
      };
      const nao = (e: unknown) => {
        if (!feito) {
          feito = true;
          erro(e instanceof Error ? e : new Error('decodeAudioData falhou'));
        }
      };
      try {
        const p = dc.decodeAudioData(bytes, sim, nao);
        if (p && typeof p.then === 'function') p.then(sim, nao);
      } catch (e) {
        nao(e);
      }
    });
  return async (bytes) => {
    if (offline === undefined) {
      const g = globalThis as unknown as {
        OfflineAudioContext?: new (c: number, n: number, t: number) => Dec;
        webkitOfflineAudioContext?: new (c: number, n: number, t: number) => Dec;
      };
      const OAC = g.OfflineAudioContext ?? g.webkitOfflineAudioContext;
      try {
        offline = OAC ? new OAC(1, 1, TAXA_VOZES) : null;
      } catch {
        offline = null;
      }
    }
    if (offline) {
      try {
        return await comContexto(offline, bytes.slice(0));
      } catch {
        offline = null;
      }
    }
    const ctx = motor.contexto as unknown as Dec | null;
    if (!ctx || typeof ctx.decodeAudioData !== 'function') throw new Error('sem decodificador');
    return comContexto(ctx, bytes.slice(0));
  };
}

export function criarVozesGravadas(op: OpcoesVozesGravadas): VozesGravadas {
  const { motor, reserva } = op;
  const base = op.base ?? '/';
  const baixar = op.baixar ?? baixarPadrao;
  const carregarIndice = op.carregarIndice ?? indicePadrao;
  const decodificar = op.decodificar ?? criarDecodificador(motor);
  const rng = op.rng ?? criarGerador(0x5019);
  const agora =
    op.agora ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  const sortear = criarSorteio(rng);

  let carregando: Promise<void> | null = null;
  let abortar: AbortController | null = null;
  let indiceTema: VozesTemaIndice | undefined;
  let extrasTema: Partial<Record<SecaoExtra, Record<string, ClipIndice[]>>> | undefined;
  let comum: ComumIndice | undefined;
  let pacoteTema: ArrayBuffer | null = null;
  let pacoteComum: ArrayBuffer | null = null;
  let pronto = false;
  let falhou = false;
  /** Sobe a cada `liberar`: o que chegar de antes é jogado fora. */
  let geracao = 0;
  /** Fatias decodificadas (ou decodificando), por pacote e posição. */
  const fatias = new Map<string, Promise<{ b: BufferVoz; ini: number } | null>>();
  let decodificadas = 0;
  const ativas: Ativa[] = [];
  const ultimoToque = new Map<string, number>();

  function carregar(): void {
    if (carregando) return;
    const minha = geracao;
    abortar = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const sinal = abortar?.signal;
    carregando = (async () => {
      try {
        // spec 026: o índice primeiro; tema sem vozes gravadas (a Vila Neon) nem baixa os pacotes
        const indice = await carregarIndice(`${base}sons/indice.json`, sinal);
        if (minha !== geracao) return;
        if (!indice.temas[op.tema]?.vozes) throw new Error('tema sem vozes no índice');
        const [tema, com] = await Promise.all([
          baixar(`${base}sons/pacotes/${op.tema}-vozes.mp3`, sinal),
          baixar(`${base}sons/pacotes/comum-vozes.mp3`, sinal),
        ]);
        if (minha !== geracao) return;
        indiceTema = indice.temas[op.tema]?.vozes;
        extrasTema = {
          obra: indice.temas[op.tema]?.obra,
          ambiente: indice.temas[op.tema]?.ambiente,
          festa: indice.temas[op.tema]?.festa,
          lugar: indice.temas[op.tema]?.lugar,
        };
        comum = indice.comum;
        if (!indiceTema || !comum) throw new Error('tema sem vozes no índice');
        pacoteTema = tema;
        pacoteComum = com;
        pronto = true;
      } catch {
        // sem rede, sem o arquivo ou saiu do mundo: fica a voz sintetizada (sem aviso)
        if (minha === geracao) falhou = true;
      }
    })();
  }

  /** A fatia decodificada (null se não deu: o toque vai para a reserva). */
  function fatia(qual: 'tema' | 'comum', clip: ClipIndice) {
    const chave = `${qual}:${clip.o[0]}`;
    let p = fatias.get(chave);
    if (!p) {
      const pacote = qual === 'tema' ? pacoteTema : pacoteComum;
      if (!pacote) return Promise.resolve(null);
      const minha = geracao;
      p = decodificar(pacote.slice(clip.o[0], clip.o[0] + clip.o[1])).then(
        (b) => {
          if (minha !== geracao) return null;
          decodificadas++;
          return { b, ini: inicioSemAtraso(b.duration, clip.s) };
        },
        () => {
          fatias.delete(chave);
          return null;
        },
      );
      fatias.set(chave, p);
    }
    return p;
  }

  function podeTocar(): boolean {
    return motor.estado === 'ativo' && !motor.mudo;
  }

  function esperou(chave: string, momento: string): boolean {
    const t = agora();
    const antes = ultimoToque.get(chave);
    if (antes !== undefined && t - antes < (ESPERA_MOMENTO[momento] ?? 300)) return false;
    ultimoToque.set(chave, t);
    return true;
  }

  function calar(a: Ativa): void {
    const ctx = motor.contexto;
    const t = ctx?.currentTime ?? 0;
    const g = a.saida as GanhoComRampa;
    try {
      if (g.gain.linearRampToValueAtTime && g.gain.setValueAtTime) {
        g.gain.cancelScheduledValues?.(t);
        g.gain.setValueAtTime(g.gain.value, t);
        g.gain.linearRampToValueAtTime(0, t + 0.03);
      } else g.gain.value = 0;
      a.fonte.stop(t + 0.04);
    } catch {
      // já parada
    }
  }

  /** Toca o desenho no grupo, dentro do teto de 8 (a mais velha sai). */
  function tocarNoTeto(
    grupo: GrupoAudio,
    duracao: number,
    montar: (ctx: ContextoAudio, saida: NoAudio) => FonteAudio,
    ganho: number,
  ): boolean {
    const t = agora();
    for (let i = ativas.length - 1; i >= 0; i--) if (ativas[i].fimMs <= t) ativas.splice(i, 1);
    while (ativas.length >= TETO_VOZES_GRAVADAS) calar(ativas.shift()!);
    let ativa: Ativa | null = null;
    const desenho: Desenho = (ctx, destino) => {
      const saida = ctx.createGain();
      saida.gain.value = ganho;
      saida.connect(destino);
      const fonte = montar(ctx, saida);
      ativa = { fonte, saida, fimMs: t + duracao * 1000 + 100 };
      return fonte;
    };
    if (!motor.tocar(desenho, { grupo }) || !ativa) return false;
    const a = ativa as Ativa;
    ativas.push(a);
    // o motor pôs o aviso de fim dele: o nosso vem junto
    const doMotor = a.fonte.onended;
    a.fonte.onended = () => {
      doMotor?.();
      const i = ativas.indexOf(a);
      if (i >= 0) ativas.splice(i, 1);
      try {
        a.saida.disconnect();
      } catch {
        // já desconectado
      }
    };
    return true;
  }

  function tocarBuffer(
    r: { b: BufferVoz; ini: number },
    grupo: GrupoAudio,
    ganho: number,
    tom: number,
    atraso = 0,
  ): boolean {
    const dur = (r.b.duration - r.ini) / tom + atraso;
    return tocarNoTeto(
      grupo,
      dur,
      (ctxBase, saida) => {
        const ctx = ctxBase as CtxVoz;
        const s = ctx.createBufferSource();
        s.buffer = r.b;
        s.playbackRate.value = tom;
        s.connect(saida);
        s.start(ctx.currentTime + atraso, r.ini);
        return s;
      },
      ganho,
    );
  }

  function tocarPio(pio: PioCriatura, volume: number, tom: number): boolean {
    const dur = Math.max(1, pio.repeticoes) * (pio.dur + pio.intervalo) + 0.05;
    const desenho = desenharVoz(pio, Math.min(1, volume), 0.5 + (tom - 1) / 0.08);
    return tocarNoTeto('vozes', dur, (ctx, saida) => desenho(ctx, saida), 1);
  }

  /** Toca um clipe gravado; se não der (pacote longe, falhou), chama a reserva. */
  function gravadaOuReserva(
    id: string,
    pegar: () => { qual: 'tema' | 'comum'; lista: ClipIndice[]; chave: string } | null,
    grupo: GrupoAudio,
    ganho: number,
    tom: number,
    reservaToque: () => boolean,
    atraso = 0,
  ): void {
    let alvo: ReturnType<typeof pegar> = null;
    try {
      alvo = pronto ? pegar() : null;
    } catch {
      // índice sem a seção (ou fora do formato): a voz sintetizada, nunca um erro no jogo
      alvo = null;
    }
    if (!alvo || !Array.isArray(alvo.lista) || alvo.lista.length === 0) {
      if (reservaToque()) op.aoTocar?.(`sintese:${id}`);
      return;
    }
    const clip = alvo.lista[sortear(alvo.lista.length, alvo.chave)];
    void fatia(alvo.qual, clip).then((r) => {
      if (!podeTocar()) return;
      if (r) {
        if (tocarBuffer(r, grupo, ganho, tom, atraso)) op.aoTocar?.(`gravada:${id}`);
      } else if (reservaToque()) op.aoTocar?.(`sintese:${id}`);
    });
  }

  const tom = (o?: OpcoesToque) => tomVariado(rng) * (o?.tom ?? 1);
  const vol = (o?: OpcoesToque) => Math.max(0, Math.min(1, o?.volume ?? 1));

  const ganho: Record<GrupoNivelVoz, number> = {
    bichos: ganhoVozGravada(op.tema, 'bichos'),
    moradores: ganhoVozGravada(op.tema, 'moradores'),
    baque: ganhoVozGravada(op.tema, 'baque'),
    derrota: ganhoVozGravada(op.tema, 'derrota'),
  };

  const vozes: VozesGravadas = {
    get pronto() {
      return pronto;
    },
    get falhou() {
      return falhou;
    },
    get decodificadas() {
      return decodificadas;
    },
    carregar,
    bicho(slot, momento, o) {
      const v = vol(o);
      if (!podeTocar() || v <= 0.02) return;
      if (!esperou(`${o?.quem ?? slot}:${momento}`, momento)) return;
      const t = tom(o);
      gravadaOuReserva(
        `${momento}:${slot}`,
        () => {
          const c = criaturaDoIndice(indiceTema, slot);
          return c
            ? { qual: 'tema', lista: c.momentos?.[momento] ?? [], chave: `${slot}:${momento}` }
            : null;
        },
        'vozes',
        ganho.bichos * v,
        t,
        () => {
          const pio = reserva.bicho(slot, momento);
          return !!pio && tocarPio(pio, v, t);
        },
      );
    },
    golpe(slot, o) {
      const v = vol(o);
      if (!podeTocar() || v <= 0.02) return;
      const quem = o?.quem ?? slot;
      if (esperou(`${quem}:baque`, 'baque')) {
        const g = somDoGolpe(indiceTema, slot);
        gravadaOuReserva(
          `baque:${g?.baque ?? slot}`,
          () => {
            const lista = g && comum?.baque?.[g.baque];
            return lista ? { qual: 'comum', lista, chave: `baque:${g.baque}` } : null;
          },
          'efeitos',
          ganho.baque * v,
          tom(),
          () => {
            reserva.golpe();
            return true;
          },
        );
      }
      if (!esperou(`${quem}:ai`, 'ai')) return;
      const t = tom(o);
      gravadaOuReserva(
        `ai:${slot}`,
        () => {
          const c = criaturaDoIndice(indiceTema, slot);
          return c ? { qual: 'tema', lista: c.momentos?.ai ?? [], chave: `${slot}:ai` } : null;
        },
        'vozes',
        ganho.bichos * v,
        t,
        () => {
          const pio = reserva.bicho(slot, 'ai');
          return !!pio && tocarPio(pio, v, t);
        },
        ATRASO_AI,
      );
    },
    derrota(slot, o) {
      const v = vol(o);
      if (!podeTocar() || v <= 0.02) return;
      if (!esperou(`${o?.quem ?? slot}:derrota`, 'derrota')) return;
      const g = somDoGolpe(indiceTema, slot);
      const t = tom(o);
      gravadaOuReserva(
        `derrota:${g?.derrota ?? slot}`,
        () => {
          const lista = g && comum?.derrota?.[g.derrota];
          return lista ? { qual: 'comum', lista, chave: `derrota:${g.derrota}` } : null;
        },
        'efeitos',
        ganho.derrota * v,
        t,
        () => {
          // sem o pacote: o susto sintetizado (nunca mais o farfalhar de arbusto)
          const pio = reserva.bicho(slot, 'susto');
          return !!pio && tocarPio(pio, v, t);
        },
      );
    },
    morador(genero, momento, o) {
      const v = vol(o);
      if (!podeTocar() || v <= 0.02) return;
      if (!esperou(`${o?.quem ?? 'morador'}:${momento}`, momento)) return;
      const t = tom(o);
      gravadaOuReserva(
        `morador:${genero}:${momento}`,
        () => {
          const lista = indiceTema?.moradores?.[genero]?.[momento];
          return lista ? { qual: 'tema', lista, chave: `${genero}:${momento}` } : null;
        },
        'vozes',
        ganho.moradores * v,
        t,
        () => {
          const pio = reserva.morador(momento);
          return !!pio && tocarPio(pio, v, t);
        },
      );
    },
    extra(secao, chave, o) {
      const v = Math.max(0, Math.min(1, o.volume ?? 1));
      if (!podeTocar() || v <= 0.02) return;
      gravadaOuReserva(
        `${secao}:${chave}`,
        () => {
          const lista = extrasTema?.[secao]?.[chave];
          if (!lista || lista.length === 0) return null;
          if (o.indice === undefined) return { qual: 'tema', lista, chave: `${secao}:${chave}` };
          const i = Math.max(0, Math.min(lista.length - 1, Math.round(o.indice)));
          return { qual: 'tema', lista: [lista[i]], chave: `${secao}:${chave}:${i}` };
        },
        o.grupo ?? 'efeitos',
        ganhoExtra(op.tema, secao, chave) * v,
        1,
        () => o.reserva?.() ?? false,
      );
    },
    temExtra(secao, chave) {
      return pronto && (extrasTema?.[secao]?.[chave]?.length ?? 0) > 0;
    },
    liberar() {
      geracao++;
      extrasTema = undefined;
      abortar?.abort();
      abortar = null;
      carregando = null;
      falhou = false;
      decodificadas = 0;
      for (const a of ativas.splice(0)) calar(a);
      fatias.clear();
      pacoteTema = pacoteComum = null;
      indiceTema = undefined;
      comum = undefined;
      pronto = false;
    },
  };
  return vozes;
}
