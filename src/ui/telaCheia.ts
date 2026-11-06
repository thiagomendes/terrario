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

/** Pede a tela cheia. Precisa ser chamada dentro de um gesto do usuário (clique). */
export function entrarTelaCheia(): void {
  if (!podeAlternarTelaCheia() || emTelaCheia()) return;
  const el = document.documentElement as ElWebkit;
  try {
    if (typeof el.requestFullscreen === 'function')
      silenciar(el.requestFullscreen({ navigationUI: 'hide' }));
    else silenciar(el.webkitRequestFullscreen?.());
  } catch {
    // recusado (sem gesto do usuário ou bloqueado): segue em janela
  }
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
