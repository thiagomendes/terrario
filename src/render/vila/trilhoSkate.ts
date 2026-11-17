/**
 * O skate na rampa em U (spec 026, parte 3), no aparelho. O núcleo é dono do trilho (de que lado
 * e quando começou); aqui fica o que a criança faz e vê:
 *
 * - **entrar:** de skate, no fundo da rampa, empurrando o controle para uma das curvas, perto do
 *   pé dela, o aparelho pede o trilho (e pede de novo, de tempos em tempos, se o núcleo ainda não
 *   respondeu);
 * - **no trilho:** o boneco fica onde a conta do relógio diz (`src/jogo/rampa.ts`): sobe a curva,
 *   para lá em cima com o "clac" da prancha na borda e vira de frente, desce e atravessa o fundo;
 *   a criança só segura o controle;
 * - **vai e vem:** chegando ao pé da outra curva com o controle ainda empurrado (para qualquer
 *   lado), o próximo trilho já é pedido dali; soltando, ela para ali, de pé no skate;
 * - **a câmera** vira devagar para olhar ao longo da rampa (a curva da esquerda e a da direita na
 *   tela, o vai e vem de lado); se a criança arrasta o dedo, a câmera é dela.
 */
import {
  entraNoTrilho,
  instanteDoClac,
  lugarNoTrilho,
  trilhoDaRede,
  type NoTrilho,
  type RampaSkate,
  type Trilho,
  type TrilhoNaRede,
} from '../../jogo/rampa';
import type { Juntas } from '../../personagem/gestos';

/** De quanto em quanto o aparelho pede o trilho de novo, enquanto o núcleo não responde (s). */
export const PEDIR_DE_NOVO = 0.3;
/** A câmera no trilho: o olhar um pouco de cima, de longe, e quanto ela vira por segundo. */
export const PITCH_NA_RAMPA = 0.3;
export const ZOOM_NA_RAMPA = 8;
export const VIRA_NA_RAMPA = 2.2;
/** Depois de a criança mexer na câmera, ela só volta a seguir passado este tempo (s). */
export const ESPERA_NA_RAMPA = 3;
/** Quanto tempo o vai e vem insiste no pedido da volta, se o núcleo ainda não respondeu (s). */
export const ESPERA_DA_VOLTA = 1.5;

/** A pose de quem anda no trilho: os joelhos um tico dobrados, os braços abertos para o lado. */
export const JUNTAS_NA_RAMPA: Juntas = {
  pernaD: 0.18,
  pernaE: -0.12,
  bdZ: 0.55,
  beZ: -0.55,
  bdX: -0.2,
  beX: -0.2,
};

export interface DepsTrilho {
  rampa: RampaSkate;
  voce: string;
  vista(): Record<string, TrilhoNaRede> | undefined | null;
  tempoNucleo(): number;
  jogador: { x: number; y: number; z: number };
  /** O rumo do controle no chão (pela câmera; 0 solto). */
  controle(): { x: number; z: number };
  deSkate(): boolean;
  pedir(lado: 1 | -1): void;
  camera: {
    yaw(): number;
    pitch(): number;
    apontar(yaw: number, pitch: number): void;
    mexeuEm(): number;
    zoom(): number;
    definirZoom(d: number): void;
  };
  aoClac?(): void;
  aoComecar?(): void;
}

const dif = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export function criarTrilhoSkate(d: DepsTrilho) {
  const r = d.rampa;
  let atual: Trilho | null = null;
  let ultimo: NoTrilho | null = null;
  let pedidoEm = -Infinity;
  let clacFeito = false;
  /** O vai e vem já começou (a câmera de lado) e o zoom de antes dele. */
  let andando = false;
  let zoomAntes: number | null = null;
  let viraDesde = -Infinity;
  let agora = 0;
  /** O trilho que acabou aqui (a tela não o usa de novo enquanto o quadro novo não chega). */
  let acabou: string | null = null;
  /** A volta do vai e vem: o lado pedido no fim do trilho e até quando insistir (s). */
  let volta: 1 | -1 | 0 = 0;
  let voltaAte = -Infinity;

  const chave = (t: Trilho) => `${t.lado}:${t.desde}`;

  return {
    /** Uma vez por quadro, antes da física: `t` é o relógio da tela (s). */
    quadro(t: number, dt: number): void {
      agora = t;
      const tn = d.tempoNucleo();
      const meu = trilhoDaRede(d.vista()?.[d.voce]);
      const novo = meu && chave(meu) !== acabou ? meu : null;
      if (novo && (!atual || chave(novo) !== chave(atual))) {
        atual = novo;
        clacFeito = false;
        if (!andando) {
          andando = true;
          zoomAntes = d.camera.zoom();
          d.camera.definirZoom(Math.max(zoomAntes, ZOOM_NA_RAMPA));
          viraDesde = t;
        }
        d.aoComecar?.();
      }
      ultimo = null;
      if (atual) {
        const l = lugarNoTrilho(r, atual, tn);
        if (!clacFeito && tn - atual.desde >= instanteDoClac(r, atual)) {
          clacFeito = true;
          d.aoClac?.();
        }
        if (l.fase === 'fim') {
          // o fim do trilho: de pé no skate, no pé da outra curva (a física volta daqui)
          d.jogador.x = l.x;
          d.jogador.y = l.y;
          d.jogador.z = l.z;
          acabou = chave(atual);
          const lado = atual.lado;
          atual = null;
          // segurando o controle, o próximo trilho já vem dali (o vai e vem)
          const c = d.controle();
          if (Math.hypot(c.x, c.z) > 0.25 && d.deSkate()) {
            volta = lado > 0 ? -1 : 1;
            voltaAte = t + ESPERA_DA_VOLTA;
            d.pedir(volta);
            pedidoEm = t;
          }
        } else ultimo = l;
      }
      if (!atual) {
        // de skate no fundo, empurrando para uma curva: pede o trilho (de novo, se não veio);
        // no vai e vem, o controle segurado vale para a volta, para onde quer que aponte (a
        // câmera de lado vira o "para a frente")
        const c = d.controle();
        const segura = Math.hypot(c.x, c.z) > 0.25;
        const lado = !d.deSkate()
          ? 0
          : volta && segura && t < voltaAte
            ? volta
            : entraNoTrilho(r, d.jogador.x, d.jogador.z, c.x, c.z);
        if (!segura) volta = 0;
        if (lado && t - pedidoEm > PEDIR_DE_NOVO) {
          d.pedir(lado);
          pedidoEm = t;
        }
        // parou de vez (soltou o controle, ou saiu do fundo): a câmera volta a ser só dela
        const parado = Math.hypot(c.x, c.z) < 0.1 && t - pedidoEm > 1.2;
        if (andando && (parado || Math.abs(d.jogador.x - r.x) > r.meia + r.curva + 1)) {
          andando = false;
          if (zoomAntes !== null) d.camera.definirZoom(zoomAntes);
          zoomAntes = null;
        }
      }
      // a câmera de lado: olha ao longo da rampa (para o lado do eixo mais perto de onde já olha)
      if (andando && t - d.camera.mexeuEm() > ESPERA_NA_RAMPA) {
        const yaw = d.camera.yaw();
        const alvo = Math.abs(dif(0, yaw)) < Math.PI / 2 ? 0 : Math.PI;
        const k = Math.min(1, dt * VIRA_NA_RAMPA);
        const pitch = d.camera.pitch();
        const kp = t - viraDesde < 2 ? Math.min(1, dt * 3) : 0;
        d.camera.apontar(yaw + dif(alvo, yaw) * k, pitch + (PITCH_NA_RAMPA - pitch) * kp);
      }
    },
    /** Onde o boneco fica agora (null: fora do trilho, a física vale). */
    lugar: (): NoTrilho | null => ultimo,
    /** Está no trilho? */
    noTrilho: (): boolean => !!ultimo,
    /** Testes: o trilho de agora e quantos "clacs". */
    estado: () => ({ trilho: atual ? { ...atual } : null, fase: ultimo?.fase ?? null, agora }),
    /** A criança foi para outro lugar de uma vez (para casa, para um amigo): larga o trilho. */
    largar(): void {
      if (atual) acabou = chave(atual);
      atual = null;
      ultimo = null;
      if (andando && zoomAntes !== null) d.camera.definirZoom(zoomAntes);
      andando = false;
      zoomAntes = null;
    },
  };
}

export type TrilhoSkate = ReturnType<typeof criarTrilhoSkate>;

/** O lugar de um amigo no trilho (na tela de quem olha), ou null. */
export function lugarDoAmigoNoTrilho(
  r: RampaSkate,
  vista: Record<string, TrilhoNaRede> | undefined | null,
  id: string,
  tNucleo: number,
): NoTrilho | null {
  const t = trilhoDaRede(vista?.[id]);
  if (!t) return null;
  const l = lugarNoTrilho(r, t, tNucleo);
  return l.fase === 'fim' ? null : l;
}
