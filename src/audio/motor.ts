export type EstadoAudio = 'inativo' | 'ativo' | 'bloqueado';
export type GrupoAudio = 'efeitos' | 'passos' | 'ambiente';

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
  resume(): Promise<void>;
  createGain(): NoAudio & { gain: ParametroAudio };
  createDynamicsCompressor(): NoAudio;
}

export type FabricaContexto = () => ContextoAudio;

export interface OpcoesMotor {
  maxVozes?: number;
  ganhos?: Partial<Record<GrupoAudio, number>>;
}

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
  tocar(desenho: Desenho, opcoes?: OpcoesTocar): boolean;
  alternarMudo(): boolean;
  /** Volume de 0 a 1 do mestre ou de um grupo. */
  definirVolume(alvo: GrupoAudio | 'geral', v: number): void;
}

const GANHOS_PADRAO: Record<GrupoAudio, number> = {
  efeitos: 1,
  passos: 0.6,
  ambiente: 0.7,
};

interface Voz {
  fonte: FonteAudio;
  alta: boolean;
}

export function criarMotorAudio(fabrica: FabricaContexto, opcoes: OpcoesMotor = {}): MotorAudio {
  const maxVozes = opcoes.maxVozes ?? MAX_VOZES;
  const ganhosGrupo = { ...GANHOS_PADRAO, ...opcoes.ganhos };
  let estado: EstadoAudio = 'inativo';
  let mudo = false;
  let ctx: ContextoAudio | null = null;
  let ativando: Promise<void> | null = null;
  let mestre: (NoAudio & { gain: ParametroAudio }) | null = null;
  let grupos: Record<GrupoAudio, NoAudio & { gain: ParametroAudio }> | null = null;
  let volumeGeral = 1;
  const volumes: Record<GrupoAudio, number> = { efeitos: 1, passos: 1, ambiente: 1 };
  const vozes: Voz[] = [];

  function montarBus(c: ContextoAudio) {
    const m = c.createGain();
    const compressor = c.createDynamicsCompressor();
    m.connect(compressor);
    compressor.connect(c.destination);
    const criar = (g: GrupoAudio) => {
      const no = c.createGain();
      no.gain.value = ganhosGrupo[g] * volumes[g];
      no.connect(m);
      return no;
    };
    m.gain.value = volumeGeral;
    mestre = m;
    grupos = { efeitos: criar('efeitos'), passos: criar('passos'), ambiente: criar('ambiente') };
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

  async function iniciar() {
    try {
      ctx = fabrica();
      montarBus(ctx);
      await ctx.resume();
      estado = 'ativo';
    } catch {
      estado = 'bloqueado';
    }
  }

  return {
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
    ativar() {
      if (estado !== 'inativo') return ativando ?? Promise.resolve();
      if (!ativando) ativando = iniciar();
      return ativando;
    },
    tocar(desenho, op = {}) {
      if (estado !== 'ativo' || mudo || !ctx || !grupos) return false;
      const alta = op.prioridade === 'alta';
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
      const voz: Voz = { fonte, alta };
      fonte.onended = () => encerrar(voz);
      vozes.push(voz);
      return true;
    },
    alternarMudo() {
      mudo = !mudo;
      if (mestre) mestre.gain.value = mudo ? 0 : volumeGeral;
      return mudo;
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
}
