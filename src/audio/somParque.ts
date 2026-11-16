/**
 * Os sons do Parque de diversões da Vila Neon (spec 026b), feitos em código (`./realejo`): o
 * pacote de sons não cresce nada. Só existe na Vila Neon (a cena cria este tocador só lá).
 *
 * - **Acorda perto:** as amostras são feitas na primeira vez que a criança chega a ~70 blocos do
 *   carrossel (nunca ao abrir o mundo), aos poucos, uns ms por quadro: os toques curtos primeiro,
 *   o realejo (o grandão) por último, em fatias. A tela nunca engasga.
 * - **O realejo:** a valsinha em laço, no carrossel, no relógio do núcleo (todo mundo ouve o mesmo
 *   compasso). Cheio até 7 blocos do meio do carrossel, some até 34; segue o "Música"; cheio fica
 *   em -9 dB na régua (abaixo do show da Vila, que vai a ~-1 dB no mesmo grupo). Uma música por vez
 *   (019): tocando acima de 0,15, cala a trilha do bairro (`aoCalarTrilha`) na mesma medida. Com o
 *   show da Vila tocando perto (`calado`), some em ~1 s e solta a trilha.
 * - **O zumbido das lâmpadas:** de noite, dentro do parque, bem baixinho (-22 dB), no "Natureza",
 *   em cruz de ~1,5 s.
 * - **Os toques:** no grupo dos efeitos, com o ganho de `GANHO_PARQUE`, a distância de onde soam
 *   (cheio até 6 blocos, some até 28), um intervalo mínimo por som e no máximo 6 vozes juntas.
 * - Nada vai para o console; sem o som ligado (sem gesto ainda), tudo é um "não faz nada".
 */
import type { ContextoAudio, FonteAudio, MotorAudio, NoAudio } from './motor';
import {
  REALEJO,
  TAXA_PARQUE,
  agua,
  algodao,
  argola,
  balao,
  estouro,
  floreio,
  renderizarRealejoAosPoucos,
  risada,
  roda,
  sininho,
  tum,
  zumbido,
} from './realejo';
import { RelogioVila, posicaoNoLaco, volumeNaDistancia } from './somVila';
import type { PontosParque } from '../world/vilaParque';

export type ToqueParque =
  | 'tum'
  | 'risada'
  | 'sininho'
  | 'estouro'
  | 'balao'
  | 'argola'
  | 'agua'
  | 'algodao'
  | 'roda'
  | 'floreio';

/**
 * Ganho (dB) de cada toque sobre a régua (-23 dBFS "enquanto soa", a de `GANHO_BRINQUEDO`): o
 * floreio e o "tum" mais altos, o que se repete muito (pipoca, risada, água) mais baixinho.
 */
export const GANHO_PARQUE: Readonly<Record<ToqueParque, number>> = {
  tum: -8,
  risada: -12,
  sininho: -10,
  estouro: -12,
  balao: -12,
  argola: -9,
  agua: -12,
  algodao: -12,
  roda: -10,
  floreio: -7,
};
/** O realejo cheio (no grupo do ambiente, como as caixas e o show da Vila) e o zumbido. */
export const GANHO_REALEJO_DB = -9;
export const GANHO_ZUMBIDO_DB = -22;

/** O realejo: cheio até tantos blocos do meio do carrossel, some até tantos. */
export const REALEJO_CHEIO = 7;
export const REALEJO_SOME = 34;
/** Acima disso (0 a 1) o realejo cala a trilha do bairro. */
export const REALEJO_CALA_TRILHA = 0.15;
/** As amostras começam a ser feitas com a criança a tantos blocos do carrossel. */
export const ACORDA_PARQUE = 70;
/** O zumbido: dentro do parque (a tantos blocos do brinquedo mais perto). */
export const ZUMBIDO_DENTRO = 30;
/** Os toques: cheio até tantos blocos de onde soam, some até tantos. */
export const TOQUE_CHEIO = 6;
export const TOQUE_SOME = 28;
export const MAX_VOZES_PARQUE = 6;
/** Intervalo mínimo entre dois toques do mesmo som (s): apertar sem parar não empilha vozes. */
export const ESPERA_PARQUE: Readonly<Partial<Record<ToqueParque, number>>> = { risada: 0.6 };
export const ESPERA_PADRAO = 0.12;
/** Constantes de tempo das rampas (s): seguir a distância, calar (~1 s), a cruz do zumbido (~1,5 s). */
const TAU_REALEJO = 0.15;
const TAU_CALADO = 0.3;
const TAU_ZUMBIDO = 0.5;
/** Um laço calado há tanto tempo para de vez (volta na fase certa quando a criança voltar). */
const PARA_DEPOIS = 2.5;
/** Quanto tempo de conta por quadro, no máximo (ms), fazendo as amostras. */
const ORCAMENTO_MS = 3;

const dbLin = (db: number) => Math.pow(10, db / 20);

interface ParamParque {
  value: number;
  setValueAtTime?(v: number, t: number): void;
  setTargetAtTime?(v: number, t: number, tau: number): void;
  cancelScheduledValues?(t: number): void;
  linearRampToValueAtTime?(v: number, t: number): void;
}
interface GanhoParque extends NoAudio {
  gain: ParamParque;
}
interface FonteParque extends FonteAudio {
  buffer: unknown;
  loop: boolean;
  start(quando?: number, offset?: number): void;
}
interface BufferParque {
  copyToChannel?(dados: Float32Array, canal: number): void;
  getChannelData?(canal: number): Float32Array;
}
interface CtxParque extends ContextoAudio {
  createBuffer(canais: number, tamanho: number, taxa: number): BufferParque;
  createBufferSource(): FonteParque;
  createGain(): GanhoParque;
}

export interface OpcoesSomParque {
  motor: MotorAudio;
  /** `plano.pontos.parque`. */
  parque: PontosParque;
  /** Os volumes de agora ("Música" e "Natureza", de 0 a 1). */
  volumes?: () => { musica: number; natureza: number };
  /** 0..1: quanto a trilha do bairro cala (uma música por vez, regra da 019). */
  aoCalarTrilha?: (f: number) => void;
  /** Testes: o que tocou. */
  aoTocar?: (id: string) => void;
}

interface Tocando {
  id: string;
  fonte: FonteParque;
  ganho: GanhoParque;
  fim: number;
  parado: boolean;
}

/** As amostras do parque, na ordem em que são feitas (as variações têm o número no fim). */
const RECEITAS: [string, () => Generator<void, Float32Array, void>][] = [
  ['tum', () => uma(() => tum())],
  ['risada0', () => uma(() => risada(0))],
  ['risada1', () => uma(() => risada(1))],
  ['sininho', () => uma(() => sininho())],
  ['estouro0', () => uma(() => estouro(0))],
  ['estouro1', () => uma(() => estouro(1))],
  ['estouro2', () => uma(() => estouro(2))],
  ['balao', () => uma(() => balao())],
  ['argola', () => uma(() => argola())],
  ['agua', () => uma(() => agua())],
  ['algodao', () => uma(() => algodao())],
  ['roda', () => uma(() => roda())],
  ['floreio', () => uma(() => floreio())],
  ['zumbido', () => uma(() => zumbido())],
  ['realejo', () => renderizarRealejoAosPoucos(TAXA_PARQUE)],
];
/** Um toque curto é feito de uma vez só (é pequeno): um passo. */
function* uma(f: () => Float32Array): Generator<void, Float32Array, void> {
  return f();
}
const VARIACOES: Partial<Record<ToqueParque, number>> = { risada: 2, estouro: 3 };

export type SomParque = ReturnType<typeof criarSomParque>;

export function criarSomParque(op: OpcoesSomParque) {
  const { motor, parque } = op;
  const carrossel = { x: parque.carrossel.x, z: parque.carrossel.z };
  const brinquedos = [parque.roda, parque.carrossel, parque.bate].map((b) => ({ x: b.x, z: b.z }));
  const relogio = new RelogioVila();
  const agoraMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  let acordado = false;
  let fila: { id: string; gen: Generator<void, Float32Array, void> }[] = [];
  const buffers = new Map<string, unknown>();
  let ouvinte: { x: number; z: number } | null = null;
  let agAntes: number | null = null;

  let laco: Tocando | null = null;
  let nivel = 0;
  let ganhoLaco = -1;
  let caladoDesde: number | null = null;
  let calar = 0;

  let zumb: Tocando | null = null;
  let nivelZ = 0;
  let ganhoZumb = -1;
  let zumbCaladoDesde: number | null = null;

  const vozes: Tocando[] = [];
  const ultimo = new Map<ToqueParque, number>();
  const rodizio = new Map<ToqueParque, number>();

  const podeTocar = () => motor.estado === 'ativo' && !motor.mudo && !!motor.contexto;
  const volumes = () => op.volumes?.() ?? { musica: 1, natureza: 1 };

  /** Faz amostras por até `ORCAMENTO_MS` (pelo menos um passo) e as passa para o contexto. */
  function fazerUmPouco(ctx: CtxParque): void {
    const t0 = agoraMs();
    let passos = 0;
    while (fila.length && (passos === 0 || agoraMs() - t0 < ORCAMENTO_MS)) {
      passos++;
      const job = fila[0];
      let r: IteratorResult<void, Float32Array>;
      try {
        r = job.gen.next();
      } catch {
        fila.shift();
        continue;
      }
      if (!r.done) continue;
      fila.shift();
      try {
        if (typeof ctx.createBuffer !== 'function') continue;
        const b = ctx.createBuffer(1, r.value.length, TAXA_PARQUE);
        if (b.copyToChannel) b.copyToChannel(r.value, 0);
        else b.getChannelData?.(0).set(r.value);
        buffers.set(job.id, b);
      } catch {
        // sem buffer: esse som fica mudo
      }
    }
  }

  /** Começa um som (laço ou toque) pelo motor. */
  function iniciar(
    id: string,
    b: unknown,
    o: {
      grupo: 'ambiente' | 'efeitos';
      ganho: number;
      t: number;
      laco?: boolean;
      offset?: number;
      entrada?: number;
      dur: number;
    },
  ): Tocando | null {
    let res: Tocando | null = null;
    const ok = motor.tocar(
      (ctxBase, destino) => {
        const ctx = ctxBase as CtxParque;
        const f = ctx.createBufferSource();
        f.buffer = b;
        const g = ctx.createGain();
        f.connect(g);
        g.connect(destino);
        if (o.laco) f.loop = true;
        if (o.entrada) {
          g.gain.value = 0;
          g.gain.setValueAtTime?.(0, o.t);
          if (g.gain.setTargetAtTime) g.gain.setTargetAtTime(o.ganho, o.t, o.entrada);
          else g.gain.value = o.ganho;
        } else g.gain.value = o.ganho;
        f.start(o.t, o.offset ?? 0);
        res = {
          id,
          fonte: f,
          ganho: g,
          fim: o.laco ? Infinity : o.t + o.dur + 0.05,
          parado: false,
        };
        return f;
      },
      { grupo: o.grupo, prioridade: o.laco ? 'alta' : 'normal' },
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
    op.aoTocar?.(id);
    return x;
  }

  function parar(x: Tocando | null, t: number, desce = 0.08): void {
    if (!x || x.parado) return;
    const g = x.ganho.gain;
    g.cancelScheduledValues?.(t);
    g.setValueAtTime?.(g.value, t);
    if (g.linearRampToValueAtTime) g.linearRampToValueAtTime(0, t + desce);
    else g.value = 0;
    x.fim = Math.min(x.fim, t + desce);
    x.parado = true;
    try {
      x.fonte.stop(t + desce + 0.02);
    } catch {
      // já parada
    }
  }

  function seguir(x: Tocando, alvo: number, ag: number, tau: number): void {
    const g = x.ganho.gain;
    if (g.setTargetAtTime) {
      g.cancelScheduledValues?.(ag);
      g.setTargetAtTime(alvo, ag, tau);
    } else g.value = alvo;
  }

  // ------------------------------------------------------------------ o realejo
  function quadroRealejo(d: number, calado: boolean, dt: number, ag: number): void {
    const alvoNivel = calado ? 0 : volumeNaDistancia(d, REALEJO_CHEIO, REALEJO_SOME);
    const tau = calado ? TAU_CALADO : TAU_REALEJO;
    nivel += (alvoNivel - nivel) * (1 - Math.exp(-dt / tau));
    if (Math.abs(nivel - alvoNivel) < 1e-3) nivel = alvoNivel;
    if (laco?.parado) laco = null;
    const b = buffers.get('realejo');
    if (!b || !podeTocar()) return;
    const alvo = dbLin(GANHO_REALEJO_DB) * volumes().musica * alvoNivel;
    if (!laco && alvoNivel > 0.001) {
      // entra na fase do relógio do núcleo: todo mundo ouve o mesmo compasso
      const t = ag + 0.05;
      laco = iniciar('realejo', b, {
        grupo: 'ambiente',
        ganho: alvo,
        t,
        laco: true,
        offset: posicaoNoLaco(relogio.nucleo(t), 0, REALEJO.duracao),
        entrada: tau,
        dur: REALEJO.duracao,
      });
      ganhoLaco = alvo;
      caladoDesde = null;
      return;
    }
    if (!laco) return;
    if (Math.abs(alvo - ganhoLaco) > 0.01 * Math.max(alvo, ganhoLaco, 1e-4)) {
      ganhoLaco = alvo;
      seguir(laco, alvo, ag, tau);
    }
    if (alvoNivel === 0 && nivel === 0) {
      caladoDesde ??= ag;
      if (ag - caladoDesde > PARA_DEPOIS) {
        parar(laco, ag, 0.05);
        laco = null;
      }
    } else caladoDesde = null;
  }

  // ------------------------------------------------------------------ o zumbido das lâmpadas
  function quadroZumbido(dentro: boolean, noite: number, dt: number, ag: number): void {
    const alvoNivel = noite >= 0.5 && dentro ? 1 : 0;
    nivelZ += (alvoNivel - nivelZ) * (1 - Math.exp(-dt / TAU_ZUMBIDO));
    if (Math.abs(nivelZ - alvoNivel) < 1e-3) nivelZ = alvoNivel;
    if (zumb?.parado) zumb = null;
    const b = buffers.get('zumbido');
    if (!b || !podeTocar()) return;
    const alvo = dbLin(GANHO_ZUMBIDO_DB) * volumes().natureza * alvoNivel;
    if (!zumb && alvoNivel > 0) {
      const t = ag + 0.05;
      zumb = iniciar('zumbido', b, {
        grupo: 'ambiente',
        ganho: alvo,
        t,
        laco: true,
        offset: posicaoNoLaco(relogio.nucleo(t), 0, 2),
        entrada: TAU_ZUMBIDO,
        dur: 2,
      });
      ganhoZumb = alvo;
      zumbCaladoDesde = null;
      return;
    }
    if (!zumb) return;
    if (Math.abs(alvo - ganhoZumb) > 0.01 * Math.max(alvo, ganhoZumb, 1e-4)) {
      ganhoZumb = alvo;
      seguir(zumb, alvo, ag, TAU_ZUMBIDO);
    }
    if (alvoNivel === 0) {
      zumbCaladoDesde ??= ag;
      if (ag - zumbCaladoDesde > TAU_ZUMBIDO * 6) {
        parar(zumb, ag, 0.05);
        zumb = null;
      }
    } else zumbCaladoDesde = null;
  }

  // ------------------------------------------------------------------ cada quadro
  function quadro(
    ouv: { x: number; z: number },
    tNucleo: number,
    noite: number,
    calado = false,
  ): void {
    const ctx = motor.contexto as CtxParque | null;
    if (!ctx) return;
    const ag = ctx.currentTime;
    relogio.medir(ag, tNucleo);
    ouvinte = { x: ouv.x, z: ouv.z };
    const dt = agAntes === null ? 0 : Math.max(0, Math.min(0.5, ag - agAntes));
    agAntes = ag;
    const d = Math.hypot(ouv.x - carrossel.x, ouv.z - carrossel.z);
    if (!acordado && d <= ACORDA_PARQUE) {
      acordado = true;
      fila = RECEITAS.filter(([id]) => !buffers.has(id)).map(([id, f]) => ({ id, gen: f() }));
    }
    if (fila.length) fazerUmPouco(ctx);
    quadroRealejo(d, calado, dt, ag);
    let dMin = Infinity;
    for (const b of brinquedos) dMin = Math.min(dMin, Math.hypot(ouv.x - b.x, ouv.z - b.z));
    quadroZumbido(dMin <= ZUMBIDO_DENTRO, noite, dt, ag);
    // uma música por vez: o realejo tocando perto cala a trilha do bairro na mesma medida
    const f = laco && !laco.parado && nivel >= REALEJO_CALA_TRILHA ? nivel : 0;
    if (Math.abs(f - calar) > 0.02 || (f !== calar && (f === 0 || f === 1))) {
      calar = f;
      op.aoCalarTrilha?.(f);
    }
    for (let i = vozes.length - 1; i >= 0; i--)
      if (vozes[i].parado || ag >= vozes[i].fim) vozes.splice(i, 1);
  }

  // ------------------------------------------------------------------ os toques
  function tocar(qual: ToqueParque, onde?: { x: number; z: number }, n?: number): boolean {
    const ctx = motor.contexto;
    if (!ctx || !podeTocar() || !(qual in GANHO_PARQUE)) return false;
    const ag = ctx.currentTime;
    const espera = ESPERA_PARQUE[qual] ?? ESPERA_PADRAO;
    if (ag - (ultimo.get(qual) ?? -Infinity) < espera) return false;
    const variacoes = VARIACOES[qual];
    let id: string = qual;
    if (variacoes) {
      const k = n !== undefined && Number.isFinite(n) ? Math.floor(n) : (rodizio.get(qual) ?? 0);
      rodizio.set(qual, k + 1);
      id = `${qual}${((k % variacoes) + variacoes) % variacoes}`;
    }
    const b = buffers.get(id);
    if (!b) return false;
    const v =
      onde && ouvinte
        ? volumeNaDistancia(
            Math.hypot(onde.x - ouvinte.x, onde.z - ouvinte.z),
            TOQUE_CHEIO,
            TOQUE_SOME,
          )
        : 1;
    if (v <= 0.001) return false;
    for (let i = vozes.length - 1; i >= 0; i--)
      if (vozes[i].parado || ag >= vozes[i].fim) vozes.splice(i, 1);
    if (vozes.length >= MAX_VOZES_PARQUE) return false;
    const dur = ((b as { duration?: number }).duration ?? 1) || 1;
    const x = iniciar(qual, b, {
      grupo: 'efeitos',
      ganho: dbLin(GANHO_PARQUE[qual]) * v,
      t: ag + 0.01,
      dur,
    });
    if (!x) return false;
    ultimo.set(qual, ag);
    vozes.push(x);
    return true;
  }

  return {
    quadro,
    tocar,
    /** Testes e depuração. */
    info() {
      const ag = motor.contexto?.currentTime ?? 0;
      const tocando = vozes.filter((x) => !x.parado && ag < x.fim).map((x) => x.id);
      if (laco && !laco.parado) tocando.push('realejo');
      if (zumb && !zumb.parado) tocando.push('zumbido');
      return {
        pronto: acordado && fila.length === 0 && buffers.size === RECEITAS.length,
        /** O nível do realejo agora (0 a 1: a distância do carrossel e o `calado`). */
        realejo: Math.round(nivel * 1000) / 1000,
        /** O nível do zumbido agora (0 a 1). */
        zumbido: Math.round(nivelZ * 1000) / 1000,
        tocando,
        /** O quanto a trilha está calada pelo realejo. */
        calar,
        /** Quantas amostras já estão prontas. */
        prontos: buffers.size,
      };
    },
    /** Sai do mundo: para tudo, solta a trilha e as amostras. */
    liberar(): void {
      const ag = motor.contexto?.currentTime ?? 0;
      parar(laco, ag, 0.05);
      laco = null;
      parar(zumb, ag, 0.05);
      zumb = null;
      for (const x of vozes) parar(x, ag, 0.05);
      vozes.length = 0;
      if (calar !== 0) op.aoCalarTrilha?.(0);
      calar = 0;
      nivel = 0;
      nivelZ = 0;
      fila = [];
      buffers.clear();
      acordado = false;
      agAntes = null;
    },
  };
}
