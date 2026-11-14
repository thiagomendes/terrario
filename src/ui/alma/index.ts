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
  /** Onde o HUD mora (o `.hud` do jogo). */
  raiz: HTMLElement;
  /** O mundo aberto (para o quadro abrir só na primeira visita); null: sempre abre. */
  chaveMundo: string | null;
  armazenamento: Storage | null;
  fixar(missao: string | null): void;
  /** Um painel fechou: volta a travar o ponteiro (se nada mais estiver aberto). */
  aoFechar(): void;
}

export interface AlmaUi {
  hud: HudAlma;
  vista(): VistaAlmaMundo | null;
}

export function ligarAlmaUi(op: OpcoesAlmaUi): AlmaUi {
  const estilo = document.createElement('style');
  estilo.textContent = CSS_ALMA_HUD;
  document.head.appendChild(estilo);

  let vista: VistaAlmaMundo | null = null;
  const hud = criarHudAlma(op.raiz, {
    perfil: () => op.perfil.perfil,
    vista: () => vista,
    fixar: (id) => op.fixar(id),
    aoTocarCarteira: () => {
      // o baú da criança vem na T07; até lá, o quadro (onde há missões)
      hud.quadro();
    },
    aoTocarCartao: () => {
      hud.quadro();
    },
    aoAbrir: () => undefined,
    aoFechar: () => op.aoFechar(),
  });

  // o que o núcleo manda: o quadro inteiro (entrou, mudou a lista) e o que andou
  let quadroPendente = false;
  window.addEventListener('brumaluz:alma', (ev) => {
    const e = (ev as CustomEvent<Extract<EventoNucleo, { e: 'alma' }>>).detail;
    if (!e || typeof e !== 'object') return;
    const primeiro = !vista && !!e.quadro;
    if (e.quadro) vista = e.quadro;
    if (vista)
      for (const m of e.missoes ?? []) {
        if (m.concluiu || m.pulou) continue;
        const a = vista.abertas.find((x) => x.id === m.id);
        if (a) {
          a.feito = m.feito;
          a.meta = m.meta;
        }
      }
    hud.renderHud(true);
    if (primeiro) quadroPendente = true;
    if (primeiro) abrirNaPrimeiraVisita();
  });

  // o ganho já foi somado ao perfil (main.ts): a carteira mostra (a T08 põe a festa na frente)
  op.perfil.ouvir((_p, aviso) => {
    if (aviso.tipo === 'ganho') void hud.mostrarGanho();
    else hud.renderHud();
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
        document.body.classList.contains('tela-titulo');
      if (ocupado) return void setTimeout(tentar, 500);
      if (!hud.quadro()) return void setTimeout(tentar, 500);
      quadroPendente = false;
      if (op.chaveMundo) marcarQuadroVisto(op.armazenamento, op.chaveMundo);
    };
    setTimeout(tentar, 1200);
  }

  const ui: AlmaUi = { hud, vista: () => vista };
  (window as unknown as { __almaUi?: AlmaUi }).__almaUi = ui;
  return ui;
}
