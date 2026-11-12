/** Tela cheia da página (com fallback webkit) e detecção de app instalado. */

type DocWebkit = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type ElWebkit = HTMLElement & {
  webkitRequestFullscreen?: (opcoes?: unknown) => Promise<void> | void;
};

const silenciar = (r: unknown) => {
  if (r && typeof (r as Promise<void>).catch === 'function') (r as Promise<void>).catch(() => {});
};

/** O navegador permite pôr a página em tela cheia (iPhone não permite). */
export function suportaTelaCheia(): boolean {
  if (typeof document === 'undefined') return false;
  const d = document as DocWebkit;
  const el = document.documentElement as ElWebkit;
  const api = typeof el.requestFullscreen === 'function' || !!el.webkitRequestFullscreen;
  return api && d.fullscreenEnabled !== false && d.webkitFullscreenEnabled !== false;
}

export function emTelaCheia(): boolean {
  if (typeof document === 'undefined') return false;
  const d = document as DocWebkit;
  return !!(d.fullscreenElement ?? d.webkitFullscreenElement);
}

/** Rodando como app instalado (já ocupa a tela toda): não há o que alternar. */
export function rodandoComoApp(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  if (nav.standalone) return true;
  const mm = window.matchMedia;
  if (typeof mm !== 'function') return false;
  return mm('(display-mode: fullscreen)').matches || mm('(display-mode: standalone)').matches;
}

/** Mostrar o botão de alternar a tela cheia? */
export function podeAlternarTelaCheia(): boolean {
  return suportaTelaCheia() && !rodandoComoApp();
}

type TecladoTravavel = { lock?: (teclas?: string[]) => Promise<void>; unlock?: () => void };
const teclado = (): TecladoTravavel | undefined =>
  typeof navigator !== 'undefined'
    ? (navigator as Navigator & { keyboard?: TecladoTravavel }).keyboard
    : undefined;

/**
 * Em tela cheia o Esc é do jogo (fecha a janela aberta, pausa), não do navegador: no Chrome e
 * no Edge o teclado trava o Esc e, para sair da tela cheia, é só segurar o Esc (o próprio
 * navegador avisa). Onde não existe a trava, as teclas que abrem cada janela também a fecham.
 */
function travarEsc(): void {
  if (emTelaCheia()) silenciar(teclado()?.lock?.(['Escape']));
  else teclado()?.unlock?.();
}
let travaLigada = false;
function ligarTrava(): void {
  if (travaLigada || typeof document === 'undefined') return;
  travaLigada = true;
  document.addEventListener('fullscreenchange', travarEsc);
}

/** Pede a tela cheia. Precisa ser chamada dentro de um gesto do usuário (clique). */
export function entrarTelaCheia(): void {
  if (!podeAlternarTelaCheia() || emTelaCheia()) return;
  ligarTrava();
  const el = document.documentElement as ElWebkit;
  try {
    if (typeof el.requestFullscreen === 'function')
      silenciar(el.requestFullscreen({ navigationUI: 'hide' }));
    else silenciar(el.webkitRequestFullscreen?.());
  } catch {
    // recusado (sem gesto do usuário ou bloqueado): segue em janela
  }
}

/**
 * Quando o jogo começa sem um toque (entrar direto na sala pelo convite ou pelo código), o
 * navegador não deixa pôr em tela cheia na hora: ela entra no primeiro toque, clique ou tecla
 * no jogo. `quer` confere a configuração naquele momento. No iPhone a página não tem tela
 * cheia (só instalada na tela de início), então não faz nada.
 */
export function telaCheiaNoPrimeiroToque(quer: () => boolean): void {
  if (typeof document === 'undefined' || !podeAlternarTelaCheia()) return;
  const eventos = ['pointerup', 'touchend', 'keydown'] as const;
  const soltar = () => {
    for (const ev of eventos) document.removeEventListener(ev, aoGesto, true);
  };
  function aoGesto(e: Event): void {
    if (e instanceof KeyboardEvent && (e.key === 'Escape' || e.repeat)) return;
    const alvo = e.target;
    if (alvo instanceof HTMLInputElement || alvo instanceof HTMLTextAreaElement) return;
    soltar();
    if (quer() && !emTelaCheia()) entrarTelaCheia();
  }
  for (const ev of eventos) document.addEventListener(ev, aoGesto, true);
}

export function sairTelaCheia(): void {
  if (!emTelaCheia()) return;
  const d = document as DocWebkit;
  try {
    if (typeof d.exitFullscreen === 'function') silenciar(d.exitFullscreen());
    else silenciar(d.webkitExitFullscreen?.());
  } catch {
    // já saiu
  }
}

export function alternarTelaCheia(): void {
  if (emTelaCheia()) sairTelaCheia();
  else entrarTelaCheia();
}

/** Avisa quando a tela cheia muda (inclusive pelo Esc do navegador). */
export function ouvirTelaCheia(f: () => void): void {
  document.addEventListener('fullscreenchange', f);
  document.addEventListener('webkitfullscreenchange', f);
}

/** O que se sabe da janela para o tamanho do canvas (separado para testar). */
export interface MedidasJanela {
  innerWidth: number;
  innerHeight: number;
  clientWidth: number;
  clientHeight: number;
  /** visualViewport (sem o teclado aberto é a janela inteira). */
  vvWidth?: number;
  vvHeight?: number;
  screenWidth: number;
  screenHeight: number;
  app: boolean;
}

/**
 * Tamanho do canvas em pixels de CSS (correção de 12 nov). Aberto pelo ícone da tela de início
 * do iPhone (barra de status translúcida), o Safari às vezes faz a janela 47 px mais baixa que
 * a tela (o tamanho da barra de status) e o `100vh` do canvas parava antes do fim: uma faixa
 * azul (o fundo da página) embaixo da barra de itens. Como app, a página ocupa a tela toda:
 * o canvas vai até o tamanho da tela (o `screen` do iPhone é sempre em pé; deitado, troca).
 */
export function tamanhoDoCanvas(m: MedidasJanela): { largura: number; altura: number } {
  let largura = Math.max(m.innerWidth, m.clientWidth, m.vvWidth ?? 0);
  let altura = Math.max(m.innerHeight, m.clientHeight, m.vvHeight ?? 0);
  if (m.app && m.screenWidth > 0 && m.screenHeight > 0) {
    const deitado = largura > altura;
    const maior = Math.max(m.screenWidth, m.screenHeight);
    const menor = Math.min(m.screenWidth, m.screenHeight);
    const [sw, sh] = deitado ? [maior, menor] : [menor, maior];
    // só completa o que falta (até ~1/8 da tela): nunca encolhe nem estica uma janela dividida
    if (sh > altura && sh - altura <= sh / 8) altura = sh;
    if (sw > largura && sw - largura <= sw / 8) largura = sw;
  }
  return { largura, altura };
}

/** Mede a janela agora. */
export function medirJanela(): MedidasJanela {
  const de = document.documentElement;
  const vv = window.visualViewport;
  return {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    clientWidth: de.clientWidth,
    clientHeight: de.clientHeight,
    // com o zoom do vv (teclado, pinça) a medida não é a da janela
    vvWidth: vv && Math.abs(vv.scale - 1) < 0.01 ? vv.width : undefined,
    vvHeight: vv && Math.abs(vv.scale - 1) < 0.01 ? vv.height : undefined,
    screenWidth: window.screen?.width ?? 0,
    screenHeight: window.screen?.height ?? 0,
    app: rodandoComoApp(),
  };
}
