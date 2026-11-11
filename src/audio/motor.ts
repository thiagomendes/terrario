export type EstadoAudio = 'inativo' | 'ativo' | 'bloqueado';
/** Spec 019: as vozes dos bichos e dos moradores têm grupo próprio (antes iam nos efeitos). */
export type GrupoAudio = 'efeitos' | 'passos' | 'ambiente' | 'vozes';

export const MAX_VOZES = 12;

export interface NoAudio {
  connect(destino: unknown): unknown;
  disconnect(): void;
}

export interface FonteAudio extends NoAudio {
  onended: (() => void) | null;
  start(quando?: number): void;
  stop(quando?: number): void;
}

export interface ParametroAudio {
  value: number;
}

export interface ContextoAudio {
  readonly destination: unknown;
  readonly currentTime: number;
  /** 'running', 'suspended' ou 'interrupted' (iOS). */
  readonly state?: string;
  resume(): Promise<void>;
  createBuffer?(canais: number, tamanho: number, taxa: number): unknown;
  createBufferSource?(): FonteAudio & { buffer: unknown };
  createGain(): NoAudio & { gain: ParametroAudio };
  createDynamicsCompressor(): NoAudio;
}

export type FabricaContexto = () => ContextoAudio;

export interface OpcoesMotor {
  maxVozes?: number;
  ganhos?: Partial<Record<GrupoAudio, number>>;
  /** Relógio em ms (testes); padrão performance.now. */
  agora?: () => number;
}

/**
 * Nenhum efeito do jogo dura mais que uns 3 s: uma voz comum mais velha que isto ficou presa
 * (no iPhone o aviso de fim não chega quando o áudio é interrompido) e é encerrada na marra.
 * Sem isso as vagas presas se acumulavam e, depois de um tempo jogando, o som sumia.
 */
export const VIDA_MAXIMA_VOZ_MS = 5000;

export interface OpcoesTocar {
  grupo?: GrupoAudio;
  prioridade?: 'normal' | 'alta';
}

export type Desenho = (ctx: ContextoAudio, destino: NoAudio) => FonteAudio;

export interface MotorAudio {
  readonly estado: EstadoAudio;
  readonly mudo: boolean;
  readonly vozes: number;
  readonly contexto: ContextoAudio | null;
  ativar(): Promise<void>;
  /** Retoma o contexto suspenso (celular): chamar dentro de um gesto do usuário. */
  retomar(): void;
  tocar(desenho: Desenho, opcoes?: OpcoesTocar): boolean;
  alternarMudo(): boolean;
  /** Volume de 0 a 1 do mestre ou de um grupo. */
  definirVolume(alvo: GrupoAudio | 'geral', v: number): void;
  /** Som abafado (debaixo d'água). */
  definirAbafado(abafado: boolean): void;
}

const GANHOS_PADRAO: Record<GrupoAudio, number> = {
  efeitos: 1,
  passos: 0.6,
  ambiente: 0.7,
  // o mesmo ganho dos efeitos, onde as vozes iam até a spec 019: soam como antes
  vozes: 1,
};

interface Voz {
  fonte: FonteAudio;
  alta: boolean;
  /** Quando começou (ms do relógio do motor). */
  inicio: number;
}

export function criarMotorAudio(fabrica: FabricaContexto, opcoes: OpcoesMotor = {}): MotorAudio {
  const maxVozes = opcoes.maxVozes ?? MAX_VOZES;
  const agora =
    opcoes.agora ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  const ganhosGrupo = { ...GANHOS_PADRAO, ...opcoes.ganhos };
  let estado: EstadoAudio = 'inativo';
  let mudo = false;
  let ctx: ContextoAudio | null = null;
  let ativando: Promise<void> | null = null;
  let mestre: (NoAudio & { gain: ParametroAudio }) | null = null;
  let grupos: Record<GrupoAudio, NoAudio & { gain: ParametroAudio }> | null = null;
  let volumeGeral = 1;
  let filtroAbafado: { frequency: ParametroAudio } | null = null;
  const volumes: Record<GrupoAudio, number> = { efeitos: 1, passos: 1, ambiente: 1, vozes: 1 };
  const vozes: Voz[] = [];

  function montarBus(c: ContextoAudio) {
    const m = c.createGain();
    const compressor = c.createDynamicsCompressor();
    const cf = c as unknown as {
      createBiquadFilter?: () => NoAudio & { type: string; frequency: ParametroAudio };
    };
    if (cf.createBiquadFilter) {
      const f = cf.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 20000;
      m.connect(f);
      f.connect(compressor);
      filtroAbafado = f;
    } else {
      m.connect(compressor);
    }
    compressor.connect(c.destination);
    const criar = (g: GrupoAudio) => {
      const no = c.createGain();
      no.gain.value = ganhosGrupo[g] * volumes[g];
      no.connect(m);
      return no;
    };
    m.gain.value = volumeGeral;
    mestre = m;
    grupos = {
      efeitos: criar('efeitos'),
      passos: criar('passos'),
      ambiente: criar('ambiente'),
      vozes: criar('vozes'),
    };
  }

  function encerrar(voz: Voz) {
    const i = vozes.indexOf(voz);
    if (i >= 0) vozes.splice(i, 1);
    try {
      voz.fonte.disconnect();
    } catch {
      // nó já desconectado
    }
  }

  /** Safari só libera o som depois de tocar algo dentro do gesto: um buffer mudo basta. */
  function destravar(c: ContextoAudio) {
    try {
      const b = c.createBuffer?.(1, 1, 22050);
      const f = c.createBufferSource?.();
      if (b && f) {
        f.buffer = b;
        f.connect(c.destination);
        f.start(0);
        f.stop(c.currentTime + 0.02);
      }
    } catch {
      // sem suporte: segue
    }
  }

  async function iniciar() {
    try {
      // iOS: som de mídia (não segue a chave de silencioso)
      const sessao = (globalThis.navigator as { audioSession?: { type: string } } | undefined)
        ?.audioSession;
      if (sessao) sessao.type = 'playback';
      ctx = fabrica();
      montarBus(ctx);
      const pronto = ctx.resume();
      destravar(ctx);
      await pronto;
      estado = 'ativo';
    } catch {
      estado = 'bloqueado';
    }
  }

  const motor: MotorAudio = {
    get estado() {
      return estado;
    },
    get mudo() {
      return mudo;
    },
    get vozes() {
      return vozes.length;
    },
    get contexto() {
      return ctx;
    },
    retomar() {
      if (!ctx) return;
      if (ctx.state && ctx.state !== 'running') void ctx.resume().catch(() => undefined);
      destravar(ctx);
    },
    ativar() {
      if (estado !== 'inativo') return ativando ?? Promise.resolve();
      if (!ativando) ativando = iniciar();
      return ativando;
    },
    tocar(desenho, op = {}) {
      if (estado !== 'ativo' || mudo || !ctx || !grupos) return false;
      const alta = op.prioridade === 'alta';
      // vozes presas (o aviso de fim não chegou): libera as vagas
      const t = agora();
      for (let i = vozes.length - 1; i >= 0; i--) {
        const v = vozes[i];
        if (v.alta || t - v.inicio < VIDA_MAXIMA_VOZ_MS) continue;
        encerrar(v);
        try {
          v.fonte.stop();
        } catch {
          // já parada
        }
      }
      // o sistema suspendeu o áudio (iPhone): retoma junto com o som novo
      if (ctx.state && ctx.state !== 'running') void ctx.resume().catch(() => undefined);
      if (vozes.length >= maxVozes) {
        const antiga = vozes.findIndex((v) => !v.alta);
        if (antiga < 0) return false;
        const voz = vozes[antiga];
        encerrar(voz);
        try {
          voz.fonte.stop();
        } catch {
          // já parada
        }
      }
      const fonte = desenho(ctx, grupos[op.grupo ?? 'efeitos']);
      const voz: Voz = { fonte, alta, inicio: t };
      fonte.onended = () => encerrar(voz);
      vozes.push(voz);
      return true;
    },
    alternarMudo() {
      mudo = !mudo;
      if (mestre) mestre.gain.value = mudo ? 0 : volumeGeral;
      return mudo;
    },
    definirAbafado(abafado) {
      if (filtroAbafado) filtroAbafado.frequency.value = abafado ? 600 : 20000;
    },
    definirVolume(alvo, v) {
      const x = Math.max(0, Math.min(1, Number.isFinite(v) ? v : 1));
      if (alvo === 'geral') {
        volumeGeral = x;
        if (mestre) mestre.gain.value = mudo ? 0 : x;
        return;
      }
      volumes[alvo] = x;
      if (grupos) grupos[alvo].gain.value = ganhosGrupo[alvo] * x;
    },
  };
  return motor;
}
