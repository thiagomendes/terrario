/**
 * Spec 023: a alma na tela. Junta o perfil da criança (no aparelho, `almaCrianca.ts`), o que o
 * núcleo manda (`brumaluz:alma`: o quadro de missões deste mundo e o que andou) e o HUD.
 *
 * - A carteira e o nível aparecem em todo mundo (o nível sobe brincando em qualquer um).
 * - O cartão da missão e o quadro, só onde o núcleo manda o quadro (Cidade Grande e Rancho).
 * - O quadro abre sozinho uma vez por mundo (a primeira visita), nunca de novo.
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

/** Mundos em que o quadro já abriu sozinho (no aparelho; o quadro só abre na primeira visita). */
export const CHAVE_QUADRO_VISTO = 'terrario:alma-quadro-visto';
const MAX_MUNDOS_VISTOS = 200;

export function quadroJaVisto(armazenamento: Storage | null, mundo: string): boolean {
  try {
    const l = JSON.parse(armazenamento?.getItem(CHAVE_QUADRO_VISTO) ?? '[]') as unknown;
    return Array.isArray(l) && l.includes(mundo);
  } catch {
    return false;
  }
}
export function marcarQuadroVisto(armazenamento: Storage | null, mundo: string): void {
  if (!armazenamento) return;
  let l: unknown = [];
  try {
    l = JSON.parse(armazenamento.getItem(CHAVE_QUADRO_VISTO) ?? '[]');
  } catch {
    // guardado estragado: começa de novo
  }
  try {
    const lista = Array.isArray(l) ? l.filter((x): x is string => typeof x === 'string') : [];
    if (!lista.includes(mundo)) lista.push(mundo);
    armazenamento.setItem(CHAVE_QUADRO_VISTO, JSON.stringify(lista.slice(-MAX_MUNDOS_VISTOS)));
  } catch {
    // sem armazenamento: abre de novo na próxima vez, sem problema
  }
}

export interface OpcoesAlmaUi {
  perfil: PerfilCrianca;
  /** Onde o HUD mora (o corpo da página, como os botões da roda). */
  raiz: HTMLElement;
  /** O mundo aberto (para o quadro abrir só na primeira visita); null: sempre abre. */
  chaveMundo: string | null;
  armazenamento: Storage | null;
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
}

/** A roda do menu pede a lojinha por este evento (ela é montada antes da alma). */
export const EVENTO_LOJINHA = 'brumaluz:lojinha';

export function ligarAlmaUi(op: OpcoesAlmaUi): AlmaUi {
  const estilo = document.createElement('style');
  estilo.textContent = CSS_ALMA_HUD + CSS_ALMA_BAU + CSS_FESTA + CSS_LOJA;
  document.head.appendChild(estilo);

  let vista: VistaAlmaMundo | null = null;
  const hud = criarHudAlma(op.raiz, {
    perfil: () => op.perfil.perfil,
    vista: () => vista,
    fixar: (id) => op.fixar(id),
    aoTocarCarteira: () => bau.abrir(),
    aoTocarCartao: () => {
      hud.quadro();
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
  window.addEventListener(EVENTO_LOJINHA, () => {
    if (document.querySelector('.entrada:not([hidden])')) return;
    loja.abrir();
  });
  /** As missões que acabaram no evento de agora (o perfil soma o ganho logo depois). */
  let concluidas: MissaoMovida[] = [];

  // o que o núcleo manda: o quadro inteiro (entrou, mudou a lista) e o que andou
  let quadroPendente = false;
  window.addEventListener('brumaluz:alma', (ev) => {
    const e = (ev as CustomEvent<Extract<EventoNucleo, { e: 'alma' }>>).detail;
    if (!e || typeof e !== 'object') return;
    concluidas = (e.missoes ?? []).filter((m) => m.concluiu);
    const primeiro = !vista && !!e.quadro;
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
    // o baú da banca mudou (o pacote entrou sozinho na mochila): a aba à vista se atualiza
    if (e.quadro && bau.aba === 'banca') bau.atualizar();
    if (primeiro) quadroPendente = true;
    if (primeiro) abrirNaPrimeiraVisita();
  });

  // o ganho já foi somado ao perfil (main.ts): missão acabada ou nível novo viram festa (na
  // fila, uma depois da outra); o resto só sobe na carteira
  op.perfil.ouvir((_p, aviso) => {
    if (aviso.tipo === 'ganho') {
      festas.receber({ missoes: concluidas, mudanca: aviso.mudanca });
      concluidas = [];
    } else if (!festas.festando) hud.renderHud();
  });

  /** Primeira visita: o quadro aparece sozinho depois da tela de entrada (até 3 s). */
  function abrirNaPrimeiraVisita(): void {
    if (!quadroPendente) return;
    if (op.chaveMundo && quadroJaVisto(op.armazenamento, op.chaveMundo)) {
      quadroPendente = false;
      return;
    }
    const tentar = () => {
      if (!quadroPendente) return;
      const ocupado =
        !!document.querySelector('.entrada:not([hidden])') ||
        !!document.body.dataset.overlay ||
        // a sugestão de fantasia do mundo novo (017) vem primeiro
        !!document.body.dataset.sugestaoPendente ||
        document.body.classList.contains('tela-titulo');
      if (ocupado) return void setTimeout(tentar, 500);
      if (!hud.quadro()) return void setTimeout(tentar, 500);
      quadroPendente = false;
      if (op.chaveMundo) marcarQuadroVisto(op.armazenamento, op.chaveMundo);
    };
    setTimeout(tentar, 1200);
  }

  // no computador: H abre e fecha o baú (com o ponteiro preso no jogo, o toque não chega)
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyH' || e.repeat) return;
    if ((e.target as HTMLElement)?.closest?.('input, textarea')) return;
    if (document.querySelector('.entrada:not([hidden])')) return;
    if (hud.aberto()) return bau.fechar();
    if (document.body.dataset.overlay) return;
    bau.abrir();
  });

  const ui: AlmaUi = { hud, bau, festas, loja, vista: () => vista };
  (window as unknown as { __almaUi?: AlmaUi }).__almaUi = ui;
  return ui;
}
