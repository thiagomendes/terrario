/**
 * Spec 023: a alma na tela. Junta o perfil da criança (no aparelho, `almaCrianca.ts`), o que o
 * núcleo manda (`brumaluz:alma`: o quadro de missões deste mundo e o que andou) e o HUD.
 *
 * - A carteira e o nível aparecem em todo mundo (o nível sobe brincando em qualquer um).
 * - O selinho da missão e o quadro, só onde o núcleo manda o quadro (Cidade Grande e Rancho).
 * - Spec 030: o quadro nunca abre sozinho; ele mora na roda do menu ("Missões") e no convite.
 */
import type { EventoNucleo } from '../../nucleo/protocolo';
import type { VistaAlmaMundo } from '../../jogo/alma';
import type { PerfilCrianca } from '../../personagem/almaCrianca';
import { CSS_ALMA_HUD, criarHudAlma, type HudAlma } from './hud';
import { CSS_ALMA_BAU, criarBau, type BauAlma } from './bau';
import { CSS_FESTA } from './festa';
import { criarFestas, type FestasAlma } from './festas';
import { CSS_LOJA, criarLoja, type LojaAlma } from './loja';
import type { MissaoMovida } from '../../jogo/alma';
import type { Aparencia } from '../../personagem/aparencia';

export interface OpcoesAlmaUi {
  perfil: PerfilCrianca;
  /** Onde o HUD mora (o corpo da página, como os botões da roda). */
  raiz: HTMLElement;
  fixar(missao: string | null): void;
  /** Compra na banca pelo núcleo (o saldo é o do aparelho, até a 024). */
  comprarBanca(item: string, saldo: number): void;
  /** Um painel fechou: volta a travar o ponteiro (se nada mais estiver aberto). */
  aoFechar(): void;
}

export interface AlmaUi {
  hud: HudAlma;
  bau: BauAlma;
  festas: FestasAlma;
  loja: LojaAlma;
  vista(): VistaAlmaMundo | null;
  /** Spec 030: o "brincar" do quadro (a missão escolhida). */
  aoBrincar(f: (id: string) => void): void;
  /** Spec 030: o toque no selinho. */
  aoTocarSelo(f: () => void): void;
  /** Spec 030: o que o núcleo mandou (a vista já atualizada). */
  aoMudarVista(f: (e: Extract<EventoNucleo, { e: 'alma' }>) => void): void;
}

/** A roda do menu pede a lojinha por este evento (ela é montada antes da alma). */
export const EVENTO_LOJINHA = 'brumaluz:lojinha';
/** Spec 030: a roda do menu pede o quadro de missões e o baú. */
export const EVENTO_MISSOES = 'brumaluz:missoes';
export const EVENTO_BAU = 'brumaluz:bau';

export function ligarAlmaUi(op: OpcoesAlmaUi): AlmaUi {
  const estilo = document.createElement('style');
  estilo.textContent = CSS_ALMA_HUD + CSS_ALMA_BAU + CSS_FESTA + CSS_LOJA;
  document.head.appendChild(estilo);

  let vista: VistaAlmaMundo | null = null;
  /** Spec 030: quem ouve o "brincar" do quadro, o toque no selinho e a vista que mudou. */
  const ouvintes = {
    brincar: [] as ((id: string) => void)[],
    selo: [] as (() => void)[],
    vista: [] as ((e: Extract<EventoNucleo, { e: 'alma' }>) => void)[],
  };
  const hud = criarHudAlma(op.raiz, {
    perfil: () => op.perfil.perfil,
    vista: () => vista,
    fixar: (id) => {
      op.fixar(id);
      for (const f of ouvintes.brincar) f(id);
    },
    aoTocarCarteira: () => bau.abrir(),
    // spec 030: o toque no selinho repete a ondinha da trilha e a virada macia
    aoTocarCartao: () => {
      for (const f of ouvintes.selo) f();
    },
    aoAbrir: () => undefined,
    aoFechar: () => op.aoFechar(),
  });
  const bau = criarBau({
    hud,
    perfil: () => op.perfil.perfil,
    vista: () => vista,
    // as fantasias de prêmio: as das missões (perfil) e as do canteiro da 014 (aparência)
    fantasiasGanhas: () => [
      ...op.perfil.perfil.fantasias,
      ...((window as unknown as { __desbloqueios?: () => string[] }).__desbloqueios?.() ?? []),
    ],
    comprarBanca: (item, saldo) => op.comprarBanca(item, saldo),
    aparencia: () => (window.__brumaluz?.personagem?.aparencia?.() ?? {}) as Aparencia,
  });

  const festas = criarFestas({
    hud,
    perfil: () => op.perfil.perfil,
    vestir: (id) =>
      window.dispatchEvent(new CustomEvent('brumaluz:vestirFantasia', { detail: { id } })),
    aoFechar: () => op.aoFechar(),
  });
  // a lojinha premium (pela roda do menu, de qualquer mundo)
  const loja = criarLoja({ hud, festas, perfil: op.perfil, aoFechar: () => op.aoFechar() });
  // spec 030: "Missões" e o baú moram na roda do menu
  window.addEventListener(EVENTO_MISSOES, () => {
    if (document.querySelector('.entrada:not([hidden])')) return;
    hud.quadro();
  });
  window.addEventListener(EVENTO_BAU, () => {
    if (document.querySelector('.entrada:not([hidden])')) return;
    bau.abrir();
  });
  window.addEventListener(EVENTO_LOJINHA, () => {
    if (document.querySelector('.entrada:not([hidden])')) return;
    loja.abrir();
  });
  /** As missões que acabaram no evento de agora (o perfil soma o ganho logo depois). */
  let concluidas: MissaoMovida[] = [];

  // o que o núcleo manda: o quadro inteiro (entrou, mudou a lista) e o que andou
  window.addEventListener('brumaluz:alma', (ev) => {
    const e = (ev as CustomEvent<Extract<EventoNucleo, { e: 'alma' }>>).detail;
    if (!e || typeof e !== 'object') return;
    concluidas = (e.missoes ?? []).filter((m) => m.concluiu);
    if (e.quadro) vista = e.quadro;
    if (vista)
      for (const m of e.missoes ?? []) {
        if (m.concluiu || m.pulou) continue;
        const a = vista.abertas.find((x) => x.id === m.id);
        if (a) {
          a.feito = m.feito;
          a.meta = m.meta;
          if (Array.isArray(m.usos)) a.usos = m.usos;
        }
      }
    hud.renderHud(true);
    for (const f of ouvintes.vista) f(e);
    // o baú da banca mudou (o pacote entrou sozinho na mochila): a aba à vista se atualiza
    if (e.quadro && bau.aba === 'banca') bau.atualizar();
  });

  // o ganho já foi somado ao perfil (main.ts): missão acabada ou nível novo viram festa (na
  // fila, uma depois da outra); o resto só sobe na carteira
  op.perfil.ouvir((_p, aviso) => {
    if (aviso.tipo === 'ganho') {
      festas.receber({ missoes: concluidas, mudanca: aviso.mudanca });
      concluidas = [];
    } else if (!festas.festando) hud.renderHud();
  });

  // no computador: H abre e fecha o baú (com o ponteiro preso no jogo, o toque não chega)
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyH' || e.repeat) return;
    if ((e.target as HTMLElement)?.closest?.('input, textarea')) return;
    if (document.querySelector('.entrada:not([hidden])')) return;
    if (hud.aberto()) return bau.fechar();
    if (document.body.dataset.overlay) return;
    bau.abrir();
  });

  const ui: AlmaUi = {
    hud,
    bau,
    festas,
    loja,
    vista: () => vista,
    aoBrincar: (f) => void ouvintes.brincar.push(f),
    aoTocarSelo: (f) => void ouvintes.selo.push(f),
    aoMudarVista: (f) => void ouvintes.vista.push(f),
  };
  (window as unknown as { __almaUi?: AlmaUi }).__almaUi = ui;
  return ui;
}
