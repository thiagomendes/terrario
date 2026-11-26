/**
 * Menu da tela (spec 015, decisão do dono: opção C do esboço `referencia/menus.html`, em todo
 * aparelho). Em cima à esquerda, o botão de informações e, ao lado, UM botão de roda; embaixo
 * do minimapa, só a mochila (um toque); tocar no minimapa abre o mapa grande. A roda (a mesma
 * peça da roda de gestos, em volta do boneco) tem Mapa, Diário, Personagem, Foto, Gestos,
 * Para casa (spec 016), Tela cheia e Pausa; "Gestos" troca a roda pelos 8 gestos, com "Voltar" no meio; segurar o
 * botão da roda abre os gestos direto. No computador as teclas continuam (E, Tab, J, C, P, G,
 * Esc) e cada item mostra a dele; 1 a 8 só com a roda de gestos aberta. O (de "opções") abre e
 * fecha a roda do menu: o mouse preso na câmera é solto sem a pausa e volta a prender quando a
 * roda fecha, a não ser que o item escolhido abra uma tela.
 *
 * Spec 033 (dono, 18 nov 2026): a roda virou a roleta (src/ui/roleta.ts), embaixo, por cima da
 * barrinha, em todo mundo e aparelho. Os itens, os extras de cada mundo, os gestos (agora uma
 * roleta ligada, com "Voltar" mostrando a carinha de Gestos) e as teclas continuam os mesmos.
 */
import { teclaDaRoda, type ItemRoda, type ListaRoda, type Roda } from './roda';
import { criarRoleta } from './roleta';
import { alternarTelaCheia, podeAlternarTelaCheia } from './telaCheia';
import { ICONE_CARINHA, svgDoIcone } from './iconesGestos';

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
  tela: '<path d="M6 12 V6 H12 M20 6 H26 V12 M26 20 V26 H20 M12 26 H6 V20" fill="none" stroke="#3b2a1e" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  casa: '<path d="M5 15 L16 5 L27 15" fill="none" stroke="#3b2a1e" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 14 V27 H24 V14" fill="#ffd45a" stroke="#3b2a1e" stroke-width="2" stroke-linejoin="round"/><path d="M5 15 L16 5 L27 15 Z" fill="#e8463c" stroke="#3b2a1e" stroke-width="2" stroke-linejoin="round"/><rect x="13.5" y="19" width="5" height="8" rx="1" fill="#c9884a" stroke="#3b2a1e" stroke-width="1.6"/>',
  pausa:
    '<rect x="9" y="7" width="5" height="18" rx="2" fill="#3b2a1e"/><rect x="18" y="7" width="5" height="18" rx="2" fill="#3b2a1e"/>',
  roda: '<circle cx="16" cy="16" r="3.2" fill="#3b2a1e"/><circle cx="16" cy="6.5" r="3" fill="#ff8fb3" stroke="#3b2a1e" stroke-width="1.6"/><circle cx="25" cy="13" r="3" fill="#7cc6ff" stroke="#3b2a1e" stroke-width="1.6"/><circle cx="21.5" cy="24" r="3" fill="#7cc35a" stroke="#3b2a1e" stroke-width="1.6"/><circle cx="10.5" cy="24" r="3" fill="#ffd45a" stroke="#3b2a1e" stroke-width="1.6"/><circle cx="7" cy="13" r="3" fill="#c9884a" stroke="#3b2a1e" stroke-width="1.6"/>',
} as const;

const svg = (miolo: string) =>
  `<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">${miolo}</svg>`;

/** O olhinho (spec 037): o branco do olho, a íris azul, a pupila e o brilho. */
const OLHO =
  '<path d="M2.5 16 Q16 3 29.5 16 Q16 29 2.5 16 Z" fill="#ffffff" stroke="#24314d" stroke-width="2.4" stroke-linejoin="round"/>' +
  '<circle cx="16" cy="16" r="6" fill="#3f8be0" stroke="#24314d" stroke-width="1.6"/>' +
  '<circle cx="16" cy="16" r="2.9" fill="#24314d"/>' +
  '<circle cx="18.1" cy="13.9" r="1.4" fill="#ffffff"/>';
/** Ver de dentro: o olhinho. */
export const ICONE_OLHINHO = svg(OLHO);
/**
 * Ver de fora (já está dentro): o bonequinho inteiro, de pé no chão, como a criança se vê de fora
 * (portão da 037: o mesmo olhinho nos dois não se distinguia sem ler). Diferente do "Personagem"
 * (só a cabeça e o peito): aqui tem cabelo, braços, pernas e o chãozinho verde.
 */
export const ICONE_VER_DE_FORA = svg(
  '<ellipse cx="16" cy="28.6" rx="10" ry="2.3" fill="#7cc35a" stroke="#3b2a1e" stroke-width="1.4"/>' +
    '<rect x="11.6" y="20.5" width="3.8" height="7" rx="1.4" fill="#2b4f8f" stroke="#3b2a1e" stroke-width="1.4"/>' +
    '<rect x="16.6" y="20.5" width="3.8" height="7" rx="1.4" fill="#2b4f8f" stroke="#3b2a1e" stroke-width="1.4"/>' +
    '<rect x="6.6" y="13.6" width="4" height="7.4" rx="1.8" fill="#3b6fb6" stroke="#3b2a1e" stroke-width="1.4"/>' +
    '<rect x="21.4" y="13.6" width="4" height="7.4" rx="1.8" fill="#3b6fb6" stroke="#3b2a1e" stroke-width="1.4"/>' +
    '<circle cx="8.6" cy="21.6" r="1.7" fill="#e8b48a" stroke="#3b2a1e" stroke-width="1.2"/>' +
    '<circle cx="23.4" cy="21.6" r="1.7" fill="#e8b48a" stroke="#3b2a1e" stroke-width="1.2"/>' +
    '<rect x="10.2" y="12.8" width="11.6" height="9.4" rx="2.6" fill="#3b6fb6" stroke="#3b2a1e" stroke-width="1.6"/>' +
    '<rect x="10" y="2.6" width="12" height="10.6" rx="3" fill="#e8b48a" stroke="#3b2a1e" stroke-width="1.6"/>' +
    '<path d="M10 7.6 V5.6 a3 3 0 0 1 3 -3 H19 a3 3 0 0 1 3 3 V7.6 Q16 5.4 10 7.6 Z" fill="#7a4a2a" stroke="#3b2a1e" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<circle cx="13.8" cy="9.6" r="1.1" fill="#3b2a1e"/><circle cx="18.2" cy="9.6" r="1.1" fill="#3b2a1e"/>',
);
/** O ícone de cada item; o de "Gestos" é a carinha do boneco (spec 034, a dos ícones dos gestos). */
const iconeDoItem = (id: ItemMenu['id']) =>
  id === 'gestos' ? svgDoIcone(ICONE_CARINHA) : svg(IC[id]);

/** O que cada item do menu faz: a tecla de sempre (o jogo já sabe o que fazer com ela). */
export interface ItemMenu {
  id: 'mapa' | 'diario' | 'personagem' | 'foto' | 'gestos' | 'casa' | 'tela' | 'pausa';
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
    // spec 016: a saída de quem ficou cercado
    { id: 'casa', nome: 'Para casa' },
    { id: 'tela', nome: 'Tela cheia' },
    { id: 'pausa', nome: 'Pausa', tecla: 'Esc' },
  ];
  return telaCheia ? l : l.filter((i) => i.id !== 'tela');
}

/**
 * Itens a mais na roda do menu: a lojinha premium da 023 (o main.ts põe antes da cena montar a
 * roda). Entram logo depois de "Personagem" e abrem uma tela (a não ser os `semTela`).
 *
 * Spec 026 (dono, 16 nov 2026): um item pode aparecer só quando serve (`visivel`): "Tirar
 * patins" só existe na roda enquanto a criança está de patins (a roda não ganha item à toa).
 */
export interface ExtraRoda {
  id: string;
  nome: string;
  icone: string;
  aoEscolher(): void;
  /** O item aparece agora? (conferido cada vez que a roda abre; sem a função, sempre) */
  visivel?(): boolean;
  /** Escolher não abre tela nenhuma (o mouse volta para a câmera). */
  semTela?: true;
  /**
   * Spec 036 (T04): à vista, a roda abre com este item no meio (montar e descer em 2 toques:
   * abrir a roda e tocar no meio). Entre vários, vale o de número maior.
   */
  inicio?: number;
}
export const EXTRAS_RODA: ExtraRoda[] = [];

/** Tecla que abre e fecha a roda do menu no computador (O de "opções"). */
export const TECLA_MENU = 'KeyO';

/** Itens que abrem uma tela por cima do jogo: depois deles o mouse fica solto. */
const ABREM_TELA: ReadonlySet<ItemMenu['id']> = new Set([
  'mapa',
  'diario',
  'personagem',
  'foto',
  'pausa',
]);

/**
 * Marca no `body` enquanto a roda do menu está aberta com o mouse solto pelo O: quem abre a
 * pausa quando o mouse solta (a interface) não abre.
 */
export const SOLTO_PELA_RODA = 'roda';

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
body.toque-ativo .menu-hud kbd, body.sem-teclas .menu-hud kbd { display: none; }
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
/* spec 037 (decisão do dono): na paisagem baixa, a mochila e os amigos vão para a esquerda, ao
   lado do minimapa (o canto de baixo à direita fica para a mão de dentro) */
@media (orientation: landscape) and (max-height: 500px) {
  .menu-hud.mochila { --topo: 104px; right: auto; left: calc(max(10px, env(safe-area-inset-left)) + 106px); }
  body .botao-amigos { top: calc(160px + env(safe-area-inset-top)); right: auto; left: calc(max(10px, env(safe-area-inset-left)) + 108px); }
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
  /** Prende o mouse na câmera de novo (computador). */
  travar?(): void;
}

export interface MenuRoda {
  readonly roda: Roda;
  /** Qual lista está aberta: 'menu', 'gestos' ou null (fechada). */
  readonly aberta: 'menu' | 'gestos' | null;
  abrirMenu(focar?: boolean): void;
  /** Abre os gestos (com Voltar no meio, para o menu). */
  abrirGestos(): void;
  fechar(): void;
  /** Spec 023: troca os gestos da roda (os presentes de nível entram quando chegam). */
  definirGestos(gestos: readonly ItemRoda[]): void;
}

let cssPosto = false;

/**
 * O selinho da tecla do i-ésimo gesto (de 0): 1 a 9 e o 0 para o décimo (`teclaDaRoda`). Do 11º
 * em diante (o roqueiro da Vila Neon com os dois de presente) não há tecla nem selinho (spec
 * 034: o "1" aparecia de novo no roqueiro, e a tecla 1 é a do Acenar).
 */
export function teclaDoGesto(i: number): string | undefined {
  return i >= 0 && i < 10 ? String((i + 1) % 10) : undefined;
}

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

  const travar =
    op.travar ??
    (() => {
      try {
        const r = document.getElementById('cena')?.requestPointerLock?.() as unknown;
        if (r && typeof (r as Promise<void>).catch === 'function')
          (r as Promise<void>).catch(() => {});
      } catch {
        // o navegador recusou (sem gesto da criança): o jogo pausa logo abaixo
      }
    });
  /** A roda do menu foi aberta pelo O com o mouse preso (fechar prende de novo). */
  let soltouPeloO = false;
  /** O item escolhido abre uma tela: o mouse fica solto. */
  let abriuTela = false;

  const roda = criarRoleta({
    rotulo: 'Menu',
    aoMudar: (aberta) => {
      bRoda.classList.toggle('ativo', aberta);
      bRoda.setAttribute('aria-expanded', String(aberta));
      if (!aberta && soltouPeloO) voltarAoJogo();
    },
  });

  function voltarAoJogo(): void {
    soltouPeloO = false;
    if (document.body.dataset.solto === SOLTO_PELA_RODA) delete document.body.dataset.solto;
    if (abriuTela) {
      abriuTela = false;
      return;
    }
    travar();
    // fechou sozinha (o tempo da roda acabou, sem gesto): o navegador não prende, e o mouse
    // solto sem tela nenhuma vira a pausa de sempre
    setTimeout(() => {
      if (!document.pointerLockElement && !document.body.dataset.overlay && !roda.aberta) pausar();
    }, 400);
  }

  const itens = itensDoMenu(podeAlternarTelaCheia());
  /**
   * A lista do menu de agora: os itens de sempre e os extras que aparecem neste momento (cada
   * conjunto de extras tem a sua lista, montada uma vez; abrir de novo não cria nada).
   */
  const listasMenu = new Map<string, ListaRoda>();
  function listaDoMenu(): ListaRoda {
    const extras = EXTRAS_RODA.filter((x) => !x.visivel || x.visivel());
    const chave = extras.map((x) => x.id).join(',');
    let l = listasMenu.get(chave);
    if (l) return l;
    const itensRoda = itens.map((i) => ({
      id: i.id as string,
      nome: i.nome,
      icone: iconeDoItem(i.id),
      tecla: i.tecla,
    }));
    if (extras.length) {
      const k = itensRoda.findIndex((i) => i.id === 'personagem') + 1;
      itensRoda.splice(
        k,
        0,
        ...extras.map((x) => ({ id: x.id, nome: x.nome, icone: x.icone, tecla: undefined })),
      );
    }
    const inicio = extras
      .filter((x) => x.inicio !== undefined)
      .reduce<ExtraRoda | null>((a, x) => (!a || x.inicio! > a.inicio! ? x : a), null);
    l = {
      itens: itensRoda,
      manter: (id) => id === 'gestos',
      aoEscolher: escolherDoMenu,
      inicio: inicio?.id,
    };
    listasMenu.set(chave, l);
    return l;
  }
  function escolherDoMenu(id: string): void {
    const extra = EXTRAS_RODA.find((x) => x.id === id);
    if (extra) {
      abriuTela = !extra.semTela;
      roda.fechar();
      extra.aoEscolher();
      return;
    }
    const it = itens.find((i) => i.id === id);
    if (!it) return;
    if (id === 'gestos') return abrirGestos();
    abriuTela = ABREM_TELA.has(it.id);
    // a roda fecha antes (o painel que abre não fica embaixo dela)
    roda.fechar();
    if (id === 'tela') alternarTelaCheia();
    else if (id === 'casa') window.dispatchEvent(new CustomEvent('brumaluz:voltarCasa'));
    else if (id === 'pausa') pausar();
    else if (it.codigo) tecla(it.codigo);
  }
  let gestos = op.gestos;
  /** O item de cima dos gestos (a plaquinha "Voltar" mostra a carinha dele). */
  const paiGestos: ItemRoda = { id: 'gestos', nome: 'Gestos', icone: iconeDoItem('gestos') };
  const listaDeGestos = (gs: readonly ItemRoda[]): ListaRoda => ({
    itens: gs.map((g, i) => ({ ...g, tecla: teclaDoGesto(i) })),
    aoEscolher: (id) => op.fazerGesto(id),
    aoVoltar: () => abrirMenu(),
    pai: paiGestos,
  });
  let listaGestos: ListaRoda = listaDeGestos(gestos);
  // desempenho: os botões das duas listas já ficam montados (abrir não cria nada)
  roda.preparar(listaDoMenu());
  roda.preparar(listaGestos);

  function abrirMenu(focar = false): void {
    if (!roda.aberta && !op.pode()) return;
    roda.abrir(listaDoMenu(), focar);
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
  bRoda.innerHTML = svg(IC.roda) + '<kbd>O</kbd>';
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
    // Enter ou espaço no botão (clique sem ponteiro): o foco entra na roda
    else abrirMenu(e.detail === 0);
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

  /** O: abre a roda do menu (soltando o mouse sem a pausa) ou fecha a que está aberta. */
  function alternarPeloO(): boolean {
    if (roda.aberta) {
      roda.fechar();
      return true;
    }
    if (!op.pode()) return false;
    abriuTela = false;
    if (document.pointerLockElement) {
      soltouPeloO = true;
      document.body.dataset.solto = SOLTO_PELA_RODA;
      document.exitPointerLock?.();
    }
    roda.abrir(listaDoMenu());
    return true;
  }

  // G abre os gestos; com a roda de gestos aberta, 1 a 8 escolhem; Esc fecha a roda; O abre e
  // fecha a roda do menu
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.repeat && (e.code === 'KeyG' || e.code === TECLA_MENU)) return;
      const alvo = e.target as HTMLElement | null;
      if (
        alvo &&
        (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.isContentEditable)
      )
        return;
      if (e.code === TECLA_MENU) {
        if (!alternarPeloO()) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      const a = teclaDaRoda(e.code, roda.aberta, emGestos() ? gestos.length : 0);
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
    definirGestos(novos) {
      if (novos.length === gestos.length && novos.every((g, i) => g.id === gestos[i].id)) return;
      const aberta = emGestos();
      gestos = novos;
      listaGestos = listaDeGestos(gestos);
      roda.preparar(listaGestos);
      if (aberta) roda.abrir(listaGestos);
    },
    fechar: () => roda.fechar(),
  };
}
