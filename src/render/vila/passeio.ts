/**
 * O passeio da criança nos brinquedos do parque (spec 026, parte 2), no aparelho: o "sentar e
 * ser levado". O núcleo é dono da cadeira (quem senta, em qual, quando desce); aqui fica o que a
 * criança vê e sente:
 *
 * - **sentar:** um pulinho do chão até a cadeira (0,45 s), e daí em diante o boneco fica onde a
 *   cadeira está (a conta é a do relógio do mundo, a mesma dos amigos);
 * - **a pose:** sentado, as mãos na barra (cadeirinha), no mastro (cavalinho) ou no volante;
 * - **descer:** um pulinho da cadeira até o chão do lado de fora (o lugar que o núcleo deu);
 * - **sair andando:** no carrossel e no bate-bate, empurrar o controle para andar por meio
 *   segundo também desce (além do "Sair" da roda do menu); na roda-gigante ela desce sozinha;
 * - **a câmera** continua da criança (arrastar gira como sempre). Na roda-gigante, ao sentar, ela
 *   se afasta e vira devagar para o bairro (a vista lá de cima); se a criança mexer, é dela.
 */
import {
  lugarDaCadeira,
  saidaDaCadeira,
  sentadoNaVista,
  impulsoDaVista,
  progressoDoPasseio,
  type Brinquedo,
  type Lugar,
  type ParqueVila,
  type ParqueVista,
  type Sentado,
} from '../../jogo/parque';
import { aplicarJuntas, type Juntas } from '../../personagem/gestos';
import type { Pose } from '../../personagem/poses';

/** O pulinho de sentar e o de descer (s). */
export const DURA_SENTAR = 0.45;
export const DURA_DESCER = 0.5;
/** Empurrar o controle por este tempo desce do carrossel e do bate-bate (s). */
export const SEGURAR_PARA_SAIR = 0.5;
/** Na roda-gigante: a câmera se afasta até aqui e leva este tempo para virar (s). */
export const ZOOM_NA_RODA = 5;
export const VIRA_NA_RODA = 1.6;
export const PITCH_NA_RODA = 0.32;

/** As juntas de quem está sentado em cada brinquedo (o referencial dos gestos). */
export const JUNTAS_SENTADO: Readonly<Record<Brinquedo, Juntas>> = {
  // na cadeirinha: as pernas para a frente, as mãos na borda
  roda: {
    pernaD: -1.45,
    pernaE: -1.45,
    corpoY: -0.24,
    bdX: -0.75,
    beX: -0.75,
    bdZ: 0.2,
    beZ: -0.2,
  },
  // no cavalinho: as pernas abertas para baixo, as mãos no mastro
  carrossel: {
    pernaD: -0.5,
    pernaE: -0.5,
    corpoY: -0.3,
    bdX: -1.25,
    beX: -1.25,
    bdZ: -0.12,
    beZ: 0.12,
  },
  // no carrinho: as pernas para a frente, as mãos no volante
  bate: {
    pernaD: -1.45,
    pernaE: -1.45,
    corpoY: -0.24,
    bdX: -1.05,
    beX: -1.05,
    bdZ: -0.1,
    beZ: 0.1,
  },
};

export interface DepsPasseio {
  parque: ParqueVila;
  /** Os pés no chão do bairro. */
  chao: number;
  voce: string;
  vista(): ParqueVista | null;
  tempoNucleo(): number;
  jogador: { x: number; y: number; z: number };
  /** O controle de andar está empurrado agora? */
  andando(): boolean;
  sair(): void;
  camera: {
    yaw(): number;
    pitch(): number;
    /** Aponta sem contar como a criança mexendo. */
    apontar(yaw: number, pitch: number): void;
    /** Quando a criança mexeu na câmera pela última vez (s, relógio da tela). */
    mexeuEm(): number;
    zoom(): number;
    definirZoom(d: number): void;
  };
  aoSentar?(s: Sentado): void;
  aoDescer?(s: Sentado): void;
}

const suave = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};
const dif = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export function criarPasseio(d: DepsPasseio) {
  let atual: Sentado | null = null;
  /** De onde a criança veio (o pulinho de sentar) e quando. */
  let de: [number, number, number] = [0, 0, 0];
  let sentouEm = 0;
  /** Descendo: de onde, para onde e quando (o pulinho de descer). */
  let descendo: { de: Lugar; ate: [number, number, number]; em: number } | null = null;
  /** O lugar que o núcleo deu para descer (chega no evento, junto do quadro). */
  let saidaDada: [number, number, number] | null = null;
  let ultimo: Lugar | null = null;
  let empurrando = 0;
  let soltouDepoisDeSentar = false;
  let zoomAntes: number | null = null;
  let viraDesde: { em: number; yaw: number; pitch: number } | null = null;
  let agora = 0;

  const lugarDaVez = (): Lugar | null => {
    if (atual) {
      const l = lugarDaCadeira(
        d.parque,
        atual.b,
        atual.i,
        d.tempoNucleo(),
        impulsoDaVista(d.vista()),
      );
      const k = suave((agora - sentouEm) / DURA_SENTAR);
      if (k >= 1) return l;
      return {
        x: de[0] + (l.x - de[0]) * k,
        y: de[1] + (l.y - de[1]) * k + Math.sin(k * Math.PI) * 0.7,
        z: de[2] + (l.z - de[2]) * k,
        yaw: l.yaw,
      };
    }
    if (descendo) {
      const k = suave((agora - descendo.em) / DURA_DESCER);
      const a = descendo.de;
      const b = descendo.ate;
      return {
        x: a.x + (b[0] - a.x) * k,
        y: a.y + (b[1] - a.y) * k + Math.sin(k * Math.PI) * 0.6,
        z: a.z + (b[2] - a.z) * k,
        yaw: a.yaw,
      };
    }
    return null;
  };

  return {
    /** Uma vez por quadro, antes da física: `t` é o relógio da tela (s). */
    quadro(t: number, dt: number): void {
      agora = t;
      const s = sentadoNaVista(d.vista(), d.voce);
      if (s && (!atual || atual.b !== s.b || atual.i !== s.i)) {
        // sentou: o pulinho sai de onde ela está
        atual = s;
        descendo = null;
        saidaDada = null;
        de = [d.jogador.x, d.jogador.y, d.jogador.z];
        sentouEm = t;
        empurrando = 0;
        soltouDepoisDeSentar = !d.andando();
        if (s.b === 'roda') {
          zoomAntes = d.camera.zoom();
          d.camera.definirZoom(Math.max(zoomAntes, ZOOM_NA_RODA));
          viraDesde = { em: t, yaw: d.camera.yaw(), pitch: d.camera.pitch() };
        }
        d.aoSentar?.(s);
      } else if (!s && atual) {
        // desceu: o pulinho até o chão do lado de fora (o lugar do núcleo; sem ele, a mesma conta)
        const fim = atual;
        const ate = saidaDada ?? saidaDaCadeira(d.parque, fim.b, fim.i, d.tempoNucleo(), d.chao);
        descendo = {
          de: ultimo ?? { x: d.jogador.x, y: d.jogador.y, z: d.jogador.z, yaw: 0 },
          ate,
          em: t,
        };
        atual = null;
        saidaDada = null;
        viraDesde = null;
        if (zoomAntes !== null) d.camera.definirZoom(zoomAntes);
        zoomAntes = null;
        d.aoDescer?.(fim);
      }
      if (descendo && t - descendo.em >= DURA_DESCER) {
        // chegou ao chão: a física volta a valer daqui
        d.jogador.x = descendo.ate[0];
        d.jogador.y = descendo.ate[1];
        d.jogador.z = descendo.ate[2];
        descendo = null;
      }
      // sair andando (carrossel e bate-bate): o controle solto depois de sentar e empurrado de novo
      if (atual && atual.b !== 'roda' && t - sentouEm > DURA_SENTAR) {
        const anda = d.andando();
        if (!anda) {
          soltouDepoisDeSentar = true;
          empurrando = 0;
        } else if (soltouDepoisDeSentar) {
          empurrando += dt;
          if (empurrando >= SEGURAR_PARA_SAIR) {
            empurrando = -1e9;
            d.sair();
          }
        }
      }
      // na roda-gigante a câmera vai devagar para trás da cadeirinha (até a criança mexer nela):
      // a cadeirinha olha para o bairro, ao longo da roda, e a câmera fica entre os dois aros
      // (nada na frente da vista)
      if (atual?.b === 'roda' && viraDesde) {
        if (d.camera.mexeuEm() > viraDesde.em) viraDesde = null;
        else {
          const k = suave((t - viraDesde.em) / VIRA_NA_RODA);
          const alvo = lugarDaVez()?.yaw ?? viraDesde.yaw;
          d.camera.apontar(
            viraDesde.yaw + dif(alvo, viraDesde.yaw) * k,
            viraDesde.pitch + (PITCH_NA_RODA - viraDesde.pitch) * k,
          );
          if (k >= 1) viraDesde = null;
        }
      }
      ultimo = lugarDaVez();
    },
    /** Onde o boneco fica agora (null: em pé, a física vale). */
    lugar: (): Lugar | null => ultimo,
    /** Em qual cadeira está (null: em pé ou descendo). */
    sentado: (): Sentado | null => atual,
    /** O núcleo disse onde pisar ao descer. */
    desceu(x: number, y: number, z: number): void {
      saidaDada = [x, y, z];
    },
    /** A pose de sentado por cima da pose do boneco (entra e sai com o pulinho). */
    pose(pose: Pose): Pose {
      if (atual)
        return aplicarJuntas(pose, JUNTAS_SENTADO[atual.b], suave((agora - sentouEm) / 0.3));
      return pose;
    },
    /** Quanto da volta da roda-gigante já foi (0 a 1; 0 fora dela). */
    progresso(): number {
      if (atual?.b !== 'roda' || atual.fim === undefined) return 0;
      return progressoDoPasseio(atual.i, atual.fim, d.tempoNucleo(), impulsoDaVista(d.vista()));
    },
  };
}

export type Passeio = ReturnType<typeof criarPasseio>;

/** O lugar e a pose de um amigo sentado (os outros jogadores, na tela de quem olha). */
export function lugarDoAmigo(
  parque: ParqueVila,
  vista: ParqueVista | null | undefined,
  id: string,
  tNucleo: number,
): (Lugar & { b: Brinquedo }) | null {
  const s = sentadoNaVista(vista, id);
  if (!s) return null;
  return { ...lugarDaCadeira(parque, s.b, s.i, tNucleo, impulsoDaVista(vista)), b: s.b };
}
