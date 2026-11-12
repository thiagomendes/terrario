import {
  CarregadorTrilha,
  ESTADO_TRILHA_INICIAL,
  TrilhaGravada,
  alvoMix,
  clipsDaMistura,
  criarDecodificador,
  mesmoEstado,
  type EstadoTrilha,
  type InfoTrilhaGravada,
  type MedidasTrilha,
} from './trilha';

/**
 * A trilha gravada de um mundo (spec 019, T03): baixa o pacote do tema sem o mundo esperar,
 * abre as camadas que tocam quando o som liga, entra em cruz com a trilha sintetizada de hoje
 * e segue o estado do mundo. Falhou (sem rede, navegador sem MP3), a de hoje continua tocando,
 * em silêncio para o console.
 */

/** O pedaço do ambiente que a trilha usa (src/audio/sons.ts). */
export interface AmbienteTrilha {
  saidaTrilha(): { contexto: unknown; destino: unknown } | null;
  definirSintetizada(v: number, segundos: number): void;
}

export interface InfoTrilha {
  tema: string;
  /** 'esperando' (nada baixado), 'baixando', 'pronta' (baixada), 'tocando', 'falhou', 'solta'. */
  fase: 'esperando' | 'baixando' | 'pronta' | 'tocando' | 'falhou' | 'solta';
  gravada: boolean;
  estado: EstadoTrilha;
  forcado: Partial<EstadoTrilha> | null;
  medidas: MedidasTrilha;
  motor: InfoTrilhaGravada | null;
  agora: number;
  /** Ganho do barramento da gravada (0,6 × "Música" × ganho único), null antes do som. */
  volume: number | null;
}

export interface TrilhaMundo {
  /** Começa a baixar o pacote do tema (em segundo plano). */
  baixar(): void;
  /** O som ligou: a trilha passa a tocar por este ambiente. */
  ligar(amb: AmbienteTrilha): void;
  /** O estado do mundo de agora (chamar a cada quadro; só muda a música quando muda). */
  definirEstado(e: EstadoTrilha): void;
  /** Testes: força parte do estado por cima do mundo (null volta ao mundo). */
  forcar(p: Partial<EstadoTrilha> | null): void;
  /** Testes: abre todos os clipes do tema (para medir a memória do pior caso). */
  abrirTudo(): Promise<void>;
  /** Sai do mundo: para a música e solta tudo o que o tema abriu. */
  soltar(): void;
  info(): InfoTrilha;
}

export interface OpcoesTrilhaMundo {
  carregador?: CarregadorTrilha;
  /** O tema tem a camada de perigo (o Rancho não tem: a noite lá é mansa). */
  rancho?: boolean;
  intervaloMs?: number;
}

/** Quanto a trilha de hoje leva para sair quando a gravada entra (s). */
export const TROCA_EM_CRUZ_S = 4;

export function criarTrilhaMundo(temaId: string, op: OpcoesTrilhaMundo = {}): TrilhaMundo {
  let ambiente: AmbienteTrilha | null = null;
  let contexto: BaseAudioContext | null = null;
  const carregador =
    op.carregador ?? new CarregadorTrilha({ decodificar: criarDecodificador(() => contexto) });
  const rancho = op.rancho ?? temaId === 'rancho-alegre';
  let fase: InfoTrilha['fase'] = 'esperando';
  let motor: TrilhaGravada | null = null;
  let mundo: EstadoTrilha = { ...ESTADO_TRILHA_INICIAL };
  let forcado: Partial<EstadoTrilha> | null = null;
  let aplicado: EstadoTrilha | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let solta = false;

  const estado = (): EstadoTrilha => (forcado ? { ...mundo, ...forcado } : mundo);
  const temPerigo = () => !!carregador.tema?.clips.some((c) => c.id === 'perigo');

  function baixar(): void {
    if (solta || fase !== 'esperando') return;
    fase = 'baixando';
    void carregador.baixar(temaId).then((ok) => {
      if (solta) return;
      fase = ok ? 'pronta' : 'falhou';
      if (ok) passo();
    });
  }

  /** A mistura de agora tem a base e as camadas que tocam abertas? */
  function prontaParaEntrar(e: EstadoTrilha): boolean {
    const t = carregador.tema;
    if (!t) return false;
    const precisa = clipsDaMistura(t, alvoMix(e, temPerigo(), rancho).g);
    let ok = carregador.aberto('base');
    for (const id of precisa) {
      if (!carregador.aberto(id)) {
        void carregador.abrir(id);
        // só as camadas em laço seguram a entrada; uma frase que não abriu entra na próxima
        if (!id.includes('_')) ok = false;
      }
    }
    return ok;
  }

  function passo(): void {
    if (solta || !ambiente || !carregador.pronto) return;
    try {
      const e = estado();
      if (!motor) {
        if (!prontaParaEntrar(e)) return;
        const saida = ambiente.saidaTrilha();
        if (!saida) return;
        const tema = carregador.tema!;
        motor = new TrilhaGravada(
          saida.contexto as BaseAudioContext,
          saida.destino as AudioNode,
          tema,
          carregador,
          { temPerigo: temPerigo(), rancho },
        );
        motor.iniciar(e);
        aplicado = { ...e };
        ambiente.definirSintetizada(0, TROCA_EM_CRUZ_S);
        fase = 'tocando';
        return;
      }
      if (!aplicado || !mesmoEstado(aplicado, e)) {
        motor.mudar(e);
        aplicado = { ...e };
      }
      motor.agendar();
    } catch {
      // a trilha gravada nunca derruba o jogo: volta a de hoje
      falhar();
    }
  }

  function falhar(): void {
    motor?.parar(0.5);
    motor = null;
    fase = 'falhou';
    ambiente?.definirSintetizada(1, 2);
  }

  return {
    baixar,
    ligar(amb) {
      if (solta || ambiente) return;
      ambiente = amb;
      contexto = (amb.saidaTrilha()?.contexto as BaseAudioContext | undefined) ?? null;
      baixar();
      timer = setInterval(passo, op.intervaloMs ?? 200);
      passo();
    },
    definirEstado(e) {
      mundo = e;
    },
    forcar(p) {
      forcado = p ? { ...p } : null;
      passo();
    },
    async abrirTudo() {
      if (!carregador.pronto) await carregador.baixar(temaId);
      const t = carregador.tema;
      if (!t) return;
      await Promise.all(t.clips.map((c) => carregador.abrir(c.id)));
    },
    soltar() {
      if (solta) return;
      solta = true;
      if (timer) clearInterval(timer);
      timer = null;
      motor?.parar(0.08);
      motor = null;
      carregador.soltarTudo();
      fase = 'solta';
    },
    info() {
      const saida = ambiente?.saidaTrilha();
      const ctx = saida?.contexto as BaseAudioContext | undefined;
      const destino = saida?.destino as { gain?: { value: number } } | undefined;
      return {
        tema: temaId,
        fase,
        gravada: !!motor,
        estado: estado(),
        forcado,
        medidas: carregador.medidas(),
        motor: motor?.info() ?? null,
        agora: ctx?.currentTime ?? 0,
        volume: destino?.gain?.value ?? null,
      };
    },
  };
}
