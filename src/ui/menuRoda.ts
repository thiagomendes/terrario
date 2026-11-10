/**
 * Menu da tela (spec 015, decisão do dono: opção C do esboço `referencia/menus.html`, em todo
 * aparelho). Em cima à esquerda, o botão de informações e, ao lado, UM botão de roda; embaixo
 * do minimapa, só a mochila (um toque); tocar no minimapa abre o mapa grande. A roda (a mesma
 * peça da roda de gestos, em volta do boneco) tem Mapa, Diário, Personagem, Foto, Gestos,
 * Tela cheia e Pausa; "Gestos" troca a roda pelos 8 gestos, com "Voltar" no meio; segurar o
 * botão da roda abre os gestos direto. No computador as teclas continuam (E, Tab, J, C, P, G,
 * Esc) e cada item mostra a dele; 1 a 8 só com a roda de gestos aberta.
 */
import { criarRoda, teclaDaRoda, type ItemRoda, type ListaRoda, type Roda } from './roda';
import { alternarTelaCheia, podeAlternarTelaCheia } from './telaCheia';

/** Ícones do esboço dos menus (viewBox 0 0 32 32). */
const IC = {
  mochila:
    '<path d="M9 11 a7 7 0 0 1 14 0 V26 a2 2 0 0 1 -2 2 H11 a2 2 0 0 1 -2 -2 Z" fill="#c9884a" stroke="#3b2a1e" stroke-width="2"/><path d="M12 11 a4 4 0 0 1 8 0" fill="none" stroke="#3b2a1e" stroke-width="2"/><rect x="12" y="17" width="8" height="6" rx="1.5" fill="#f2d16b" stroke="#3b2a1e" stroke-width="1.6"/>',
  mapa: '<path d="M5 8 L12 5 L20 8 L27 5 V24 L20 27 L12 24 L5 27 Z" fill="#cfe8a8" stroke="#3b2a1e" stroke-width="2" stroke-linejoin="round"/><path d="M12 5 V24 M20 8 V27" stroke="#3b2a1e" stroke-width="1.6"/><circle cx="17" cy="15" r="2.4" fill="#e8463c"/>',
  diario:
    '<rect x="7" y="5" width="18" height="22" rx="2" fill="#7cc6ff" stroke="#3b2a1e" stroke-width="2"/><path d="M11 5 V27" stroke="#3b2a1e" stroke-width="1.6"/><path d="M14 11 H21 M14 15 H21" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>',
  personagem:
    '<rect x="10" y="4" width="12" height="11" rx="3" fill="#e8b48a" stroke="#3b2a1e" stroke-width="2"/><rect x="9" y="16" width="14" height="10" rx="3" fill="#3b6fb6" stroke="#3b2a1e" stroke-width="2"/><circle cx="13.5" cy="10" r="1.3" fill="#3b2a1e"/><circle cx="18.5" cy="10" r="1.3" fill="#3b2a1e"/>',
  foto: '<rect x="5" y="10" width="22" height="15" rx="3" fill="#b9bec6" stroke="#3b2a1e" stroke-width="2"/><path d="M11 10 L13 6 H19 L21 10" fill="#b9bec6" stroke="#3b2a1e" stroke-width="2" stroke-linejoin="round"/><circle cx="16" cy="17.5" r="4.3" fill="#7cc6ff" stroke="#3b2a1e" stroke-width="2"/>',
  gestos:
    '<circle cx="16" cy="16" r="11" fill="#ffd45a" stroke="#3b2a1e" stroke-width="2.2"/><circle cx="12" cy="14" r="1.7" fill="#3b2a1e"/><circle cx="20" cy="14" r="1.7" fill="#3b2a1e"/><path d="M11 18.5 Q16 23.5 21 18.5" fill="none" stroke="#3b2a1e" stroke-width="2.2" stroke-linecap="round"/>',
  tela: '<path d="M6 12 V6 H12 M20 6 H26 V12 M26 20 V26 H20 M12 26 H6 V20" fill="none" stroke="#3b2a1e" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  pausa:
    '<rect x="9" y="7" width="5" height="18" rx="2" fill="#3b2a1e"/><rect x="18" y="7" width="5" height="18" rx="2" fill="#3b2a1e"/>',
  roda: '<circle cx="16" cy="16" r="3.2" fill="#3b2a1e"/><circle cx="16" cy="6.5" r="3" fill="#ff8fb3" stroke="#3b2a1e" stroke-width="1.6"/><circle cx="25" cy="13" r="3" fill="#7cc6ff" stroke="#3b2a1e" stroke-width="1.6"/><circle cx="21.5" cy="24" r="3" fill="#7cc35a" stroke="#3b2a1e" stroke-width="1.6"/><circle cx="10.5" cy="24" r="3" fill="#ffd45a" stroke="#3b2a1e" stroke-width="1.6"/><circle cx="7" cy="13" r="3" fill="#c9884a" stroke="#3b2a1e" stroke-width="1.6"/>',
} as const;

const svg = (miolo: string) =>
  `<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">${miolo}</svg>`;

/** O que cada item do menu faz: a tecla de sempre (o jogo já sabe o que fazer com ela). */
export interface ItemMenu {
  id: 'mapa' | 'diario' | 'personagem' | 'foto' | 'gestos' | 'tela' | 'pausa';
  nome: string;
  /** Tecla que o item aperta (e que aparece no selinho). */
  codigo?: string;
  tecla?: string;
}

/** Os itens da roda do menu, na ordem do esboço (o primeiro no alto). */
export function itensDoMenu(telaCheia: boolean): ItemMenu[] {
  const l: ItemMenu[] = [
    { id: 'mapa', nome: 'Mapa', codigo: 'Tab', tecla: 'Tab' },
    { id: 'diario', nome: 'Diário', codigo: 'KeyJ', tecla: 'J' },
    { id: 'personagem', nome: 'Personagem', codigo: 'KeyC', tecla: 'C' },
    { id: 'foto', nome: 'Foto', codigo: 'KeyP', tecla: 'P' },
    { id: 'gestos', nome: 'Gestos', tecla: 'G' },
    { id: 'tela', nome: 'Tela cheia' },
    { id: 'pausa', nome: 'Pausa', tecla: 'Esc' },
  ];
  return telaCheia ? l : l.filter((i) => i.id !== 'tela');
}

/** Segurar o botão da roda por tanto tempo (ms) abre os gestos direto. */
export const SEGURAR_GESTOS = 450;

export const CSS_MENU_RODA = `
.menu-hud { position: fixed; z-index: 7; display: grid; place-items: center; width: 44px; height: 44px; padding: 0; border: 0;
  border-radius: 50%; cursor: pointer; color: var(--tinta, #3b2a1e); background: rgba(255, 250, 240, 0.95);
  box-shadow: 0 3px 0 rgba(150, 110, 60, 0.35), 0 6px 12px rgba(40, 25, 10, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.85);
  touch-action: none; -webkit-touch-callout: none; user-select: none; -webkit-user-select: none; }
.menu-hud svg { width: 26px; height: 26px; pointer-events: none; }
.menu-hud:active { transform: translateY(2px); }
.menu-hud:focus-visible { outline: 3px solid #ffb547; outline-offset: 2px; }
.menu-hud.ativo { background: #ffe4a8; }
.menu-hud kbd { position: absolute; bottom: -6px; right: -6px; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px;
  display: grid; place-items: center; font: 800 0.6rem var(--jogo, system-ui), sans-serif; color: var(--tinta, #3b2a1e);
  background: #ffe4a8; box-shadow: 0 1px 0 #d9b56a; pointer-events: none; }
body.toque-ativo .menu-hud kbd, body.sem-teclas .menu-hud kbd, body.sem-teclas .roda kbd { display: none; }
.menu-hud.botao-roda { top: calc(8px + env(safe-area-inset-top)); left: calc(60px + env(safe-area-inset-left)); }
/* acima do fundo da roda aberta: tocar nele de novo fecha */
.menu-hud.botao-roda.ativo { z-index: 56; }
/* a mochila embaixo do minimapa, à direita (e os amigos logo abaixo dela) */
.menu-hud.mochila { --topo: 222px; top: calc(var(--topo) + env(safe-area-inset-top)); right: max(14px, env(safe-area-inset-right)); width: 48px; height: 48px; }
.menu-hud.mochila svg { width: 28px; height: 28px; }
body .botao-amigos { top: calc(280px + env(safe-area-inset-top)); right: max(16px, env(safe-area-inset-right)); left: auto; }
@media (max-width: 560px) {
  .menu-hud.mochila { --topo: 164px; }
  body .botao-amigos { top: calc(222px + env(safe-area-inset-top)); }
}
@media (orientation: landscape) and (max-height: 520px) {
  .menu-hud.mochila { --topo: 162px; }
  body .botao-amigos { top: calc(164px + env(safe-area-inset-top)); right: max(72px, calc(env(safe-area-inset-right) + 60px)); }
}
/* tocar no minimapa abre o mapa grande */
body:not(.tela-titulo) .minimapa { pointer-events: auto; cursor: pointer; }
/* o botão de informações em todo aparelho (as pílulas abrem nele) */
body[data-overlay] .menu-hud, body.tela-titulo .menu-hud, body.modo-foto .menu-hud,
body:has(.entrada:not([hidden])) .menu-hud { display: none; }
`;

export interface OpcoesMenuRoda {
  /** Os 8 gestos (ícone, nome e o número de cada um). */
  gestos: readonly ItemRoda[];
  fazerGesto(id: string): void;
  /** Pode abrir agora (no jogo, sem painel, sem modo foto, acordado). */
  pode(): boolean;
  /** Aperta uma tecla do jogo (o item faz o que a tecla faz). */
  tecla?(codigo: string): void;
  pausar?(): void;
}

export interface MenuRoda {
  readonly roda: Roda;
  /** Qual lista está aberta: 'menu', 'gestos' ou null (fechada). */
  readonly aberta: 'menu' | 'gestos' | null;
  abrirMenu(): void;
  /** Abre os gestos (com Voltar no meio, para o menu). */
  abrirGestos(): void;
  fechar(): void;
}

let cssPosto = false;

export function criarMenuRoda(op: OpcoesMenuRoda, raiz: HTMLElement = document.body): MenuRoda {
  if (!cssPosto) {
    cssPosto = true;
    const st = document.createElement('style');
    st.textContent = CSS_MENU_RODA;
    document.head.append(st);
  }
  const tecla =
    op.tecla ?? ((code: string) => window.dispatchEvent(new KeyboardEvent('keydown', { code })));
  const pausar = op.pausar ?? (() => window.dispatchEvent(new CustomEvent('brumaluz:pausar')));

  const roda = criarRoda({
    rotulo: 'Menu',
    aoMudar: (aberta) => {
      bRoda.classList.toggle('ativo', aberta);
      bRoda.setAttribute('aria-expanded', String(aberta));
    },
  });

  const itens = itensDoMenu(podeAlternarTelaCheia());
  const listaMenu: ListaRoda = {
    itens: itens.map((i) => ({ id: i.id, nome: i.nome, icone: svg(IC[i.id]), tecla: i.tecla })),
    manter: (id) => id === 'gestos',
    aoEscolher: (id) => {
      const it = itens.find((i) => i.id === id);
      if (!it) return;
      if (id === 'gestos') return abrirGestos();
      // a roda fecha antes (o painel que abre não fica embaixo dela)
      roda.fechar();
      if (id === 'tela') alternarTelaCheia();
      else if (id === 'pausa') pausar();
      else if (it.codigo) tecla(it.codigo);
    },
  };
  const listaGestos: ListaRoda = {
    itens: op.gestos.map((g, i) => ({ ...g, tecla: String(i + 1) })),
    aoEscolher: (id) => op.fazerGesto(id),
    aoVoltar: () => abrirMenu(),
  };
  // desempenho: os botões das duas listas já ficam montados (abrir não cria nada)
  roda.preparar(listaMenu);
  roda.preparar(listaGestos);

  function abrirMenu(): void {
    if (!roda.aberta && !op.pode()) return;
    roda.abrir(listaMenu);
  }
  function abrirGestos(): void {
    if (!roda.aberta && !op.pode()) return;
    roda.abrir(listaGestos);
  }
  const emGestos = () => roda.aberta && roda.lista === listaGestos;

  // o botão da roda: toque abre o menu; segurar abre os gestos
  const bRoda = document.createElement('button');
  bRoda.type = 'button';
  bRoda.className = 'menu-hud botao-roda';
  bRoda.setAttribute('aria-label', 'Menu (segure para os gestos)');
  bRoda.setAttribute('aria-expanded', 'false');
  bRoda.setAttribute('data-botao-roda', '');
  bRoda.innerHTML = svg(IC.roda);
  let segurando: ReturnType<typeof setTimeout> | undefined;
  let abriuSegurando = false;
  bRoda.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    abriuSegurando = false;
    clearTimeout(segurando);
    segurando = setTimeout(() => {
      abriuSegurando = true;
      abrirGestos();
    }, SEGURAR_GESTOS);
  });
  const soltar = () => clearTimeout(segurando);
  for (const t of ['pointerup', 'pointerleave', 'pointercancel'] as const)
    bRoda.addEventListener(t, soltar);
  bRoda.addEventListener('contextmenu', (e) => e.preventDefault());
  bRoda.addEventListener('click', (e) => {
    e.stopPropagation();
    if (abriuSegurando) {
      abriuSegurando = false;
      return;
    }
    if (roda.aberta) roda.fechar();
    else abrirMenu();
  });

  // a mochila, embaixo do minimapa
  const bMochila = document.createElement('button');
  bMochila.type = 'button';
  bMochila.className = 'menu-hud mochila';
  bMochila.setAttribute('aria-label', 'Mochila');
  bMochila.setAttribute('data-botao-mochila', '');
  bMochila.innerHTML = svg(IC.mochila) + '<kbd>E</kbd>';
  bMochila.addEventListener('pointerdown', (e) => e.stopPropagation());
  bMochila.addEventListener('click', (e) => {
    e.stopPropagation();
    roda.fechar();
    tecla('KeyE');
  });
  raiz.append(bRoda, bMochila);

  // tocar no minimapa abre o mapa grande
  document.addEventListener('click', (e) => {
    const alvo = e.target as Element | null;
    if (!alvo?.closest?.('[data-minimapa]') || !op.pode()) return;
    roda.fechar();
    tecla('Tab');
  });

  // G abre os gestos; com a roda de gestos aberta, 1 a 8 escolhem; Esc fecha a roda
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.repeat && e.code === 'KeyG') return;
      const alvo = e.target as HTMLElement | null;
      if (
        alvo &&
        (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.isContentEditable)
      )
        return;
      const a = teclaDaRoda(e.code, roda.aberta, emGestos() ? op.gestos.length : 0);
      if (!a) return;
      if (a.acao === 'alternar') {
        if (emGestos()) roda.fechar();
        else if (op.pode() || roda.aberta) roda.abrir(listaGestos);
        else return;
      } else if (a.acao === 'fechar') roda.fechar();
      else roda.escolher(a.i);
      e.preventDefault();
      e.stopImmediatePropagation();
    },
    true,
  );

  return {
    roda,
    get aberta() {
      return roda.aberta ? (emGestos() ? 'gestos' : 'menu') : null;
    },
    abrirMenu,
    abrirGestos,
    fechar: () => roda.fechar(),
  };
}
