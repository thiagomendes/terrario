/**
 * Spec 030 "Guia da missão", a ligação: a missão escolhida (a vista do núcleo) vira a trilha
 * de pegadinhas e a placa (`render/guiaMissao`); o "brincar" do quadro e o toque no selinho
 * acendem de novo (a ondinha forte e a virada macia); sem missão, depois de ~2 min brincando,
 * o selinho vira o convite (o baú com "?").
 */
import type { Scene } from '@babylonjs/core/scene';
import type { EstadoDepuracao } from '../../render/cena';
import { criarGuiaMissao, type ApiGuia, type GuiaMissao } from '../../render/guiaMissao';
import { criarRelogioConvite, CONVITE_S, type MundoDoGuia } from '../../jogo/guia';
import { Bloco } from '../../world/blocks';
import type { AlmaUi } from './index';
import { missaoFixada } from './hud';
import { medirHud } from '../carinhasAmigos';

/** O quadro de cortiça com as duas missões (o ícone de "Missões" na roda do menu). */
export const QUADRO_SVG = `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="3" y="5" width="26" height="22" rx="3" fill="#e6b877" stroke="#5a3a22" stroke-width="2"/>
  <rect x="6" y="8" width="20" height="16" rx="1.5" fill="#f3d9a4"/>
  <rect x="7.5" y="10" width="7.5" height="9" rx="1.2" fill="#fffaf0" stroke="#5a3a22" stroke-width="1.3" transform="rotate(-6 11 14)"/>
  <rect x="17" y="10.5" width="7.5" height="9" rx="1.2" fill="#fffaf0" stroke="#5a3a22" stroke-width="1.3" transform="rotate(5 21 15)"/>
  <path d="M11.2 12.4 l0.9 1.9 2 .2 -1.5 1.3 .5 2 -1.9-1.1 -1.8 1.1 .4-2 -1.5-1.3 2-.2 z" fill="#ffc93d"/>
  <path d="M18.6 16 l2.4-2.2 2.4 2.2 v2.6 h-4.8 z" fill="#5fe3c4" stroke="#5a3a22" stroke-width="1"/>
  <circle cx="11" cy="9.6" r="1.4" fill="#e8402f"/><circle cx="21" cy="10" r="1.4" fill="#e8402f"/>
</svg>`;

declare global {
  interface Window {
    /** Spec 030 (testes de tela): o guia da missão. */
    __guia?: ApiGuia & { conviteEm(s: number): void; convite(): { mostra: boolean; segundos: number } };
  }
}

/** O jogo à vista (sem painel por cima, sem tela de entrada, sem modo foto)? */
function noJogo(): boolean {
  const b = document.body;
  return (
    !b.dataset.overlay &&
    !b.classList.contains('modo-foto') &&
    !b.classList.contains('tela-titulo') &&
    !document.querySelector('.entrada:not([hidden])')
  );
}

export function ligarGuiaMissao(e: EstadoDepuracao, ui: AlmaUi): GuiaMissao | null {
  const scene = e.cenaBabylon?.() as Scene | undefined;
  if (!scene) return null;
  const AR = Bloco.AR;
  /** O aparelho tem a coluna? (o chão de baixo de tudo existe) */
  const temColuna = (x: number, z: number) => (e.bloco?.(Math.floor(x), 0, Math.floor(z)) ?? AR) !== AR;
  /** Os blocos carregados (com as edições); longe, o terreno gerado. */
  const bloco = (x: number, y: number, z: number) =>
    temColuna(x, z) ? e.bloco!(x, y, z) : (e.blocoGerado?.(x, y, z) ?? AR);
  let sitios: { em: number; lista: ReturnType<NonNullable<EstadoDepuracao['sitios']>> } | null = null;
  const mundo: MundoDoGuia = {
    get cidade() {
      return e.cidade?.() ?? null;
    },
    get sitios() {
      // a lista dos sítios perto muda devagar: lida de novo a cada 5 s
      const agora = performance.now();
      if (!sitios || agora - sitios.em > 5000) sitios = { em: agora, lista: e.sitios?.() ?? [] };
      return sitios.lista;
    },
    bloco,
    moradores: () => (e.criaturas?.() ?? []).filter((c) => c.profissao),
  };
  const guia = criarGuiaMissao({
    scene,
    pes: () => {
      const p = e.jogadorPes?.() ?? [0, 0, 0];
      return [p[0], p[1], p[2]];
    },
    bloco,
    conhecido: () => true,
    mundo: () => mundo,
    tela: (x, y, z) => e.telaDoPonto?.(x, y, z) ?? null,
    caixasHud: () => medirHud(),
    camera: {
      olhar: () => (e.rotacao ? { pitch: e.rotacao[0], yaw: e.rotacao[1] } : null),
      apontar: (yaw, pitch) => (e.camera?.virar ?? e.apontar)?.(yaw, pitch),
      mexendo: () => e.camera?.mexendo?.() ?? false,
    },
    pode: noJogo,
  });

  // ---------------------------------------------------------------- a missão escolhida
  /** O "brincar" pediu a trilha desta missão: acende com a virada quando o núcleo confirmar. */
  let pedida: string | null = null;
  const sincronizar = () => {
    const c = missaoFixada(ui.vista());
    const vistos = new Set(c?.usos ?? []);
    guia.definir(c?.m ?? null, vistos);
    if (c && pedida === c.m.id) {
      pedida = null;
      guia.chamar();
    }
  };
  ui.aoMudarVista(() => sincronizar());
  ui.aoBrincar((id) => {
    pedida = id;
    // a mesma missão de novo (já era a fixada): o núcleo não manda nada novo
    if (missaoFixada(ui.vista())?.m.id === id) sincronizar();
  });
  ui.aoTocarSelo(() => guia.chamar());
  // o selinho mostra o mesmo desenho da placa (o lugar de agora)
  guia.aoTrocarFigura((fig) => ui.hud.figuraDoSelo(fig));
  sincronizar();

  // ---------------------------------------------------------------- o convite
  let limite = CONVITE_S;
  let relogio = criarRelogioConvite(limite);
  let ultimo = 0;
  let mostra = false;
  scene.onBeforeRenderObservable.add(() => {
    const t = performance.now() / 1000;
    const dt = ultimo ? t - ultimo : 0;
    ultimo = t;
    const v = ui.vista();
    if (!v) return;
    const r = relogio.passo(dt, { missao: !!missaoFixada(v), noJogo: noJogo() });
    if (r.mostra !== mostra || r.acendeu) ui.hud.definirConvite(r.mostra, r.acendeu);
    mostra = r.mostra;
  });

  window.__guia = Object.assign(guia.api, {
    /** Testes e vídeos: o convite em s segundos (o relógio volta a zero). */
    conviteEm(s: number) {
      limite = s;
      relogio = criarRelogioConvite(limite);
    },
    convite: () => ({ mostra, segundos: relogio.segundos }),
  });
  return guia;
}
