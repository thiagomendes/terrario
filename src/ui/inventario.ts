import { botaoFechar, icone } from './pixicones';
import { tocarSomInterface } from '../audio/somInterface';
import { TAMANHO_BARRA, TAMANHO_INVENTARIO, type Inventario, type Slot } from '../jogo/inventario';
import { obterItem, todosItens, type DefItem } from '../jogo/itens';
import { itensDoCatalogo } from '../jogo/catalogo';
import { categoriaDoItem } from '../jogo/receitas';
import { CSS_ABAS_CATEGORIA, criarAbasCategoria } from './abasCategoria';
import { estiloMundo } from '../world/chunk';
import { EVENTO_ICONES, iconeDoItem } from './icones';
import {
  FOLGA_TOQUE_INV,
  TEMPO_TOQUE_LONGO,
  acoesDeArrastar,
  acoesDoGesto,
  classificarToqueInventario,
} from './gestosInventario';

export const CSS_INVENTARIO = `
.inventario-fundo {
  position: fixed; inset: 0; z-index: 33;
  display: flex; align-items: center; justify-content: center;
  padding: 12px; box-sizing: border-box;
  background: rgba(60, 45, 80, 0.32); backdrop-filter: blur(6px) saturate(0.95);
  font-family: var(--jogo); color: var(--tinta);
  animation: modal-entra 0.15s ease-out;
  /* cabe 9 slots na largura (390px) e não estica demais na altura (paisagem) */
  --slot: clamp(28px, min(calc((100vw - 104px) / 9), 9vh), 54px);
}
.inventario-fundo[hidden] { display: none; }
.inventario {
  position: relative;
  display: grid; gap: 14px; max-height: 94vh; max-height: calc(100dvh - 24px); overflow-y: auto; box-sizing: border-box;
  max-width: 100%; overscroll-behavior: contain; touch-action: pan-y;
  padding: 18px 18px 20px; border: 0; border-radius: 24px;
  background: var(--painel); color: var(--tinta);
  box-shadow: 0 8px 0 var(--painel-borda), 0 22px 40px rgba(40, 25, 10, 0.35);
  animation: cartao-entra 0.18s ease-out;
}
.inventario h2 { margin: 0; padding-right: 52px; font: 700 1.5rem/1.1 var(--display); color: var(--titulo); }
/* slots: arrastar e soltar no toque (o catálogo continua rolando) */
.inventario .slot-inv { touch-action: none; -webkit-touch-callout: none; user-select: none; -webkit-user-select: none; }
.inventario .catalogo .slot-inv { touch-action: pan-y; }
.inventario .topo { display: flex; gap: 18px; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; }
.inventario .secao { display: grid; gap: 8px; align-content: start; }
.inventario .rotulo-secao { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--tinta-suave); }
.grade-slots { display: grid; grid-template-columns: repeat(9, var(--slot)); gap: 5px; }
/* poço de cada item */
.slot-inv {
  position: relative; width: var(--slot); height: var(--slot); padding: 0;
  border: 0; border-radius: 12px; background: var(--poco); box-shadow: var(--sombra-poco);
  cursor: pointer; transition: background 0.1s ease;
}
.slot-inv:hover { background: #fff3d6; }
.slot-inv:focus-visible { outline: 3px solid var(--azul); outline-offset: 1px; }
.slot-inv.ativo { background: #fff3d6; outline: 3px solid var(--amarela); outline-offset: -1px; }
.slot-inv img { position: absolute; inset: 12%; width: 76%; height: 76%; image-rendering: pixelated; pointer-events: none; filter: drop-shadow(0 2px 1px rgba(90, 55, 20, 0.3)); }
.slot-inv .qtd, .cursor-item .qtd { position: absolute; right: 4px; bottom: 1px; font: 900 0.78rem var(--jogo); color: #fff; text-shadow: 0 1px 0 rgba(0, 0, 0, 0.55), 0 0 3px rgba(0, 0, 0, 0.45); pointer-events: none; }
.slot-inv .dur { position: absolute; left: 14%; right: 14%; bottom: 4px; height: 4px; border-radius: 2px; background: rgba(90, 60, 30, 0.3); pointer-events: none; }
.slot-inv .dur i { display: block; height: 100%; border-radius: 2px; }
.separador { height: 0; border-top: 2px dashed var(--painel-borda); margin: 2px 0; }
.catalogo { display: grid; gap: 8px; }
.catalogo[hidden], .livro[hidden] { display: none !important; }
.inventario .topo > .secao:first-child { display: flex; gap: 18px; align-items: flex-start; flex-wrap: wrap; }
/* trocas e livro ocupam a largura toda do painel (não ficam numa coluna estreita) */
.inventario .topo > .secao:first-child:has(> .painel-trocas:not([hidden])) { flex: 1 1 100%; }
.inventario .topo > .secao:first-child > .painel-trocas { flex: 1 1 100%; }
.catalogo input {
  min-height: 42px; padding: 6px 14px; border: 0; border-radius: 14px;
  background: var(--poco); color: var(--tinta); font: 700 0.95rem var(--jogo); box-shadow: var(--sombra-poco);
}
.catalogo input::placeholder, .livro input::placeholder { color: var(--tinta-suave); }
.catalogo input:focus-visible, .livro input:focus-visible { outline: 3px solid var(--azul); outline-offset: 1px; }
.catalogo .grade-slots { max-height: calc(var(--slot) * 3 + 14px); overflow-y: auto; padding: 2px 4px 2px 0; overscroll-behavior: contain; }
.cursor-item { position: fixed; z-index: 60; width: 44px; height: 44px; pointer-events: none; transform: translate(-50%, -50%); }
.cursor-item img { width: 100%; height: 100%; filter: drop-shadow(0 5px 5px rgba(60, 35, 10, 0.4)); }
.cursor-item .qtd { right: -2px; bottom: -4px; font-size: 0.85rem; }
.dica-item {
  position: fixed; z-index: 61; pointer-events: none; padding: 6px 12px; border-radius: 12px;
  background: var(--painel); color: var(--tinta); font: 800 0.86rem var(--jogo);
  box-shadow: 0 3px 0 var(--painel-borda), 0 8px 16px rgba(40, 25, 10, 0.25);
}
.dica-item small { display: block; color: var(--tinta-suave); font-weight: 600; }
body[data-modo='criativo'] .slot-inv .qtd { display: none; }
/* jogar no chão (dar a um amigo): área tracejada, acende com algo na mão */
.inventario .soltar-chao {
  display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 44px;
  padding: 4px 16px; border: 3px dashed var(--painel-borda); border-radius: 16px;
  background: transparent; color: var(--tinta-suave); font: 800 0.95rem var(--jogo);
  cursor: pointer; touch-action: none; -webkit-touch-callout: none; user-select: none; -webkit-user-select: none;
  transition: background 0.1s ease, border-color 0.1s ease, color 0.1s ease;
}
.inventario .soltar-chao .pixicone-caixa { font-size: 1.5rem; display: inline-flex; }
.inventario .soltar-chao.pronto { border-color: var(--amarela); color: var(--tinta); background: #fff6dc; }
.inventario .soltar-chao.pronto:hover { background: #fff1c4; }
.inventario .soltar-chao:focus-visible { outline: 3px solid var(--azul); outline-offset: 1px; }
.ajuda-inv, .ajuda-inv-toque { font-size: 0.78rem; font-weight: 600; color: var(--tinta-suave); }
/* as dicas quebram linha na largura das grades (não alargam a janela) */
.ajuda-inv, .ajuda-inv-toque { width: 0; min-width: 100%; }
.catalogo .abas-categoria { max-width: calc(var(--slot) * 9 + 40px); }
${CSS_ABAS_CATEGORIA}`;

/** Teclado virtual (iOS): ao focar, o campo rola para a área visível. */
export function rolarAoFocar(campo: HTMLElement): void {
  campo.addEventListener('focus', () => {
    setTimeout(() => campo.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 300);
  });
}

export interface OpcoesInventarioUI {
  inventario: Inventario;
  criativo: () => boolean;
  /** Índice ativo da barra (para destacar). */
  ativo: () => number;
  /** O que sobrar no cursor ao fechar (sem espaço) é entregue aqui. */
  aoSobrar?: (p: NonNullable<Slot>) => void;
  /** Jogar no chão de propósito (área "Soltar no chão" ou fora da janela). */
  aoJogar?: (p: NonNullable<Slot>) => void;
  aoAbrir?: () => void;
  aoFechar?: () => void;
}

export interface InventarioUI {
  readonly aberto: boolean;
  abrir(): void;
  fechar(): void;
  alternar(): void;
  /** Área à esquerda do topo, para a grade de criação (T08). */
  readonly areaExtra: HTMLElement;
  /** Liga um slot externo (criação, fornalha) ao mesmo cursor. */
  clicarExterno(
    f: (el: HTMLElement, cursor: Slot, botao: 'esquerdo' | 'direito', shift: boolean) => Slot,
  ): void;
  /**
   * Roda ao fechar por qualquer caminho (E, Esc, o X, tocar fora): devolve a grade de
   * criação, fecha o baú ou a fornalha. Roda antes de o cursor voltar para a mochila.
   */
  antesDeFechar(f: () => void): void;
  /**
   * Shift+clique (dois toques) na mochila ou na barra com um baú ou fornalha aberta: a pilha
   * vai para lá. `f` devolve o que sobrou na mochila, ou undefined se não está aberto.
   */
  moverRapidoPara(f: (p: NonNullable<Slot>) => Slot | undefined): void;
  /** Redesenha os slots (após mudança externa). */
  render(): void;
  /** Item preso ao cursor (entra nas transações de itens). */
  cursor: Slot;
  criarSlot(): HTMLButtonElement;
  desenharSlot(el: HTMLElement, p: Slot): void;
}

export function criarInventarioUI(raiz: HTMLElement, op: OpcoesInventarioUI): InventarioUI {
  const inv = op.inventario;
  const fundo = document.createElement('div');
  fundo.className = 'inventario-fundo';
  fundo.hidden = true;
  fundo.setAttribute('data-inventario', '');
  const painel = document.createElement('div');
  painel.className = 'inventario';
  painel.setAttribute('role', 'dialog');
  painel.setAttribute('aria-label', 'Inventário');
  fundo.appendChild(painel);

  const topo = document.createElement('div');
  topo.className = 'topo';
  const areaExtra = document.createElement('div');
  areaExtra.className = 'secao';
  const catalogo = document.createElement('div');
  catalogo.className = 'catalogo secao';
  const busca = document.createElement('input');
  busca.type = 'search';
  busca.placeholder = 'Buscar blocos e itens…';
  busca.setAttribute('data-busca-catalogo', '');
  const gradeCat = document.createElement('div');
  gradeCat.className = 'grade-slots';
  const rotCat = document.createElement('div');
  rotCat.className = 'rotulo-secao';
  rotCat.textContent = 'Catálogo criativo';
  // spec 039: as abas de ícone em cima do catálogo (as mesmas categorias do livro de receitas)
  const abasCat = criarAbasCategoria(() => renderCatalogo());
  catalogo.append(rotCat, abasCat.raiz, busca, gradeCat);
  topo.append(areaExtra, catalogo);

  const titulo = document.createElement('h2');
  titulo.textContent = 'Inventário';
  const mochilaRot = document.createElement('div');
  mochilaRot.className = 'rotulo-secao';
  mochilaRot.textContent = 'Mochila';
  const mochila = document.createElement('div');
  mochila.className = 'grade-slots';
  const barra = document.createElement('div');
  barra.className = 'grade-slots';
  const ajuda = document.createElement('div');
  ajuda.className = 'ajuda-inv';
  ajuda.textContent =
    'Clique: pegar e soltar · Botão direito: metade ou um · Shift+clique: mover rápido · Clique fora ou em Soltar no chão: dar a um amigo · Q no jogo: jogar um · E ou Esc: fechar';
  // no toque (sem teclas): a linha própria aparece no lugar da de mouse/teclado
  const ajudaToque = document.createElement('div');
  ajudaToque.className = 'ajuda-inv-toque ajuda-toque';
  ajudaToque.textContent =
    'Toque: pegar e soltar · Segure: metade ou um · Dois toques: mover rápido · Arraste até outro espaço para soltar · Arraste até Soltar no chão (ou para fora): dar a um amigo · No jogo, segure um item da barra: joga um';
  // jogar no chão: dar um item a um amigo, como no Minecraft
  const soltarChao = document.createElement('button');
  soltarChao.type = 'button';
  soltarChao.className = 'soltar-chao';
  soltarChao.setAttribute('data-soltar-chao', '');
  soltarChao.setAttribute('aria-label', 'Soltar no chão (para um amigo pegar)');
  soltarChao.append(icone('chao'), 'Soltar no chão');
  soltarChao.addEventListener('contextmenu', (e) => e.preventDefault());
  const sep = document.createElement('div');
  sep.className = 'separador';
  painel.append(
    titulo,
    topo,
    mochilaRot,
    mochila,
    sep,
    barra,
    soltarChao,
    ajuda,
    ajudaToque,
    botaoFechar(() => fechar()),
  );

  const cursorEl = document.createElement('div');
  cursorEl.className = 'cursor-item';
  cursorEl.hidden = true;
  const cursorImg = document.createElement('img');
  const cursorQtd = document.createElement('span');
  cursorQtd.className = 'qtd';
  cursorEl.append(cursorImg, cursorQtd);
  const dica = document.createElement('div');
  dica.className = 'dica-item';
  dica.hidden = true;
  fundo.append(cursorEl, dica);
  raiz.appendChild(fundo);

  let cursor: Slot = null;
  let aberto = false;

  function criarSlot(): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'slot-inv';
    const img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    const q = document.createElement('span');
    q.className = 'qtd';
    b.append(img, q);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    return b;
  }

  function desenharSlot(el: HTMLElement, p: Slot): void {
    const img = el.querySelector('img')!;
    const q = el.querySelector('.qtd')!;
    const src = p ? iconeDoItem(p.item) : '';
    if (img.getAttribute('src') !== src) img.setAttribute('src', src);
    img.style.visibility = p ? 'visible' : 'hidden';
    q.textContent = p && p.qtd > 1 ? String(p.qtd) : '';
    let dur = el.querySelector<HTMLElement>('.dur');
    const def = p ? obterItem(p.item) : undefined;
    if (p && p.dur !== undefined && def?.durabilidade) {
      if (!dur) {
        dur = document.createElement('span');
        dur.className = 'dur';
        dur.appendChild(document.createElement('i'));
        el.appendChild(dur);
      }
      const f = Math.max(0, Math.min(1, p.dur / def.durabilidade));
      const barraDur = dur.firstElementChild as HTMLElement;
      barraDur.style.width = `${f * 100}%`;
      barraDur.style.background = `hsl(${f * 120}, 80%, 50%)`;
      dur.hidden = f >= 1;
    } else if (dur) {
      dur.hidden = true;
    }
    el.dataset.item = p?.item ?? '';
    // leitor de tela: nome e quantidade
    const nome = def?.nome ?? p?.item;
    const rotulo = p ? (p.qtd > 1 ? `${nome}, ${p.qtd} unidades` : `${nome}`) : 'Espaço vazio';
    if (el.getAttribute('aria-label') !== rotulo) el.setAttribute('aria-label', rotulo);
  }

  const slotsEl: HTMLButtonElement[] = [];
  for (let i = 0; i < TAMANHO_INVENTARIO; i++) {
    const b = criarSlot();
    b.dataset.indice = String(i);
    (i < TAMANHO_BARRA ? barra : mochila).appendChild(b);
    slotsEl.push(b);
  }
  // a mochila vem em ordem de linhas (9..35)

  function desenharCursor(): void {
    cursorEl.hidden = !cursor;
    soltarChao.classList.toggle('pronto', !!cursor);
    if (!cursor) return;
    cursorImg.src = iconeDoItem(cursor.item);
    cursorQtd.textContent = cursor.qtd > 1 && !op.criativo() ? String(cursor.qtd) : '';
  }

  // os ícones de brinquedo chegam aos poucos: redesenha o que estiver aberto
  // (spec 039: o catálogo também, senão os móveis da aba "casa" ficavam com o ícone de pixel)
  window.addEventListener(EVENTO_ICONES, () => {
    render();
    // (no lugar, sem trocar os botões: um toque no meio não se perde)
    if (aberto && op.criativo())
      for (const b of gradeCat.querySelectorAll<HTMLElement>('[data-catalogo]'))
        desenharSlot(b, { item: b.dataset.catalogo!, qtd: 1 });
  });

  function render(): void {
    if (!aberto) return;
    slotsEl.forEach((el, i) => {
      desenharSlot(el, inv.obter(i));
      el.classList.toggle('ativo', i === op.ativo());
    });
    desenharCursor();
  }

  function mostrarDica(def: DefItem | undefined, casa: DOMRect, extra = ''): void {
    if (!def || cursor) {
      dica.hidden = true;
      return;
    }
    dica.hidden = false;
    const tipo: Record<string, string> = {
      bloco: 'Bloco',
      ferramenta: 'Ferramenta',
      comida: 'Comida',
      material: 'Material',
    };
    dica.innerHTML = '';
    dica.append(def.nome);
    const s = document.createElement('small');
    s.textContent = tipo[def.tipo] + extra;
    dica.appendChild(s);
    // spec 039b (portão visual): a dica fica embaixo da casa apontada, centrada nela, e sempre
    // inteira na tela (sem espaço embaixo, vai para cima da casa; nas beiradas, encosta)
    const w = dica.offsetWidth;
    const h = dica.offsetHeight;
    const margem = 6;
    let top = casa.bottom + margem;
    if (top + h > innerHeight - margem) top = Math.max(margem, casa.top - h - margem);
    const left = Math.min(
      Math.max(margem, casa.left + casa.width / 2 - w / 2),
      innerWidth - w - margem,
    );
    dica.style.left = `${left}px`;
    dica.style.top = `${top}px`;
  }

  const posicionarCursor = (x: number, y: number) => {
    cursorEl.style.left = `${x}px`;
    cursorEl.style.top = `${y}px`;
  };
  fundo.addEventListener('pointermove', (e) => {
    posicionarCursor(e.clientX, e.clientY);
    const alvo = (e.target as HTMLElement).closest<HTMLElement>('.slot-inv');
    const id = alvo?.dataset.item;
    if (!id) {
      dica.hidden = true;
      return;
    }
    const i = alvo.dataset.indice ? Number(alvo.dataset.indice) : -1;
    const p = i >= 0 ? inv.obter(i) : null;
    const def = obterItem(id);
    const extra =
      p?.dur !== undefined && def?.durabilidade ? ` · ${p.dur}/${def.durabilidade}` : '';
    mostrarDica(def, alvo.getBoundingClientRect(), extra);
  });

  const destinosRapidos: ((p: NonNullable<Slot>) => Slot | undefined)[] = [];
  function clicarSlot(i: number, botao: 'esquerdo' | 'direito', shift: boolean): void {
    if (shift && !cursor) {
      const p = inv.obter(i);
      let feito = false;
      for (const f of destinosRapidos) {
        if (!p) break;
        const resto = f({ ...p });
        if (resto === undefined) continue;
        inv.definir(i, resto);
        feito = true;
        break;
      }
      if (!feito) inv.moverRapido(i);
    } else {
      cursor = inv.clicar(i, cursor, botao);
    }
    render();
  }

  /** O que está na mão vai para o chão (botão direito: só um). */
  function jogarDaMao(botao: 'esquerdo' | 'direito'): void {
    if (!cursor) return;
    const qtd = botao === 'direito' ? 1 : cursor.qtd;
    const p = { ...cursor, qtd };
    cursor = cursor.qtd > qtd ? { ...cursor, qtd: cursor.qtd - qtd } : null;
    render();
    op.aoJogar?.(p);
  }

  type Externo = (
    el: HTMLElement,
    cursor: Slot,
    botao: 'esquerdo' | 'direito',
    shift: boolean,
  ) => Slot;
  const externos: Externo[] = [];
  const SELETOR_SLOT =
    '.slot-inv[data-indice], [data-catalogo], [data-externo], [data-soltar-chao]';
  const alvoSlot = (el: EventTarget | Element | null): HTMLElement | null =>
    el instanceof Element ? el.closest<HTMLElement>(SELETOR_SLOT) : null;
  /**
   * Onde um arraste pode soltar. Soltar no catálogo não guarda nada e soltar num resultado
   * (criação, saída da fornalha) pegaria mais um em vez de soltar: nos dois, nada acontece.
   */
  const recebeArraste = (el: HTMLElement) =>
    !el.dataset.catalogo && !el.classList.contains('resultado');
  /** Um "clique" num slot qualquer (mochila, barra, catálogo, criação, baú, fornalha). */
  function acionar(el: HTMLElement, botao: 'esquerdo' | 'direito', shift: boolean): void {
    if (el.dataset.soltarChao !== undefined) {
      jogarDaMao(botao);
    } else if (el.dataset.catalogo) {
      clicarCatalogo(el.dataset.catalogo, botao, shift);
    } else if (el.dataset.externo !== undefined) {
      for (const f of externos) cursor = f(el, cursor, botao, shift);
      render();
    } else if (el.dataset.indice !== undefined) {
      clicarSlot(Number(el.dataset.indice), botao, shift);
    }
  }

  // Mouse: age no pointerdown (como antes) e, se arrastou até outro slot, solta lá no pointerup.
  // Toque: tocar = clique; segurar = botão direito; dois toques = Shift; arrastar = soltar no destino.
  let arrasteMouse: HTMLElement | null = null;
  let toque: {
    id: number;
    el: HTMLElement;
    x0: number;
    y0: number;
    t0: number;
    timer: number;
    longo: boolean;
    moveu: boolean;
    cursorVazio: boolean;
  } | null = null;
  let ultimoToque: { el: HTMLElement; t: number } | null = null;
  let fundoPressionado = false;
  fundo.addEventListener('pointerdown', (e) => {
    posicionarCursor(e.clientX, e.clientY);
    fundoPressionado = e.target === fundo;
    const el = alvoSlot(e.target);
    if (!el) return;
    if (e.pointerType === 'mouse') {
      e.preventDefault();
      // (o item saiu ou mudou de casa: a dica de antes não fica em cima da casa errada)
      dica.hidden = true;
      acionar(el, e.button === 2 ? 'direito' : 'esquerdo', e.shiftKey);
      arrasteMouse = e.button === 0 ? el : null;
      return;
    }
    if (toque) return; // um dedo por vez
    dica.hidden = true;
    const t = {
      id: e.pointerId,
      el,
      x0: e.clientX,
      y0: e.clientY,
      t0: performance.now(),
      timer: 0,
      longo: false,
      moveu: false,
      cursorVazio: !cursor,
    };
    t.timer = window.setTimeout(() => {
      if (toque !== t || t.moveu) return;
      t.longo = true;
      acionar(el, 'direito', false);
      navigator.vibrate?.(12);
    }, TEMPO_TOQUE_LONGO);
    toque = t;
  });
  /**
   * Arrastando perto da borda de cima ou de baixo da janela, ela rola sozinha (celular
   * deitado: a barra fica abaixo da dobra e o dedo não rola enquanto arrasta um item).
   */
  let yArraste = -1;
  let rolando = 0;
  function rolarNoArraste(): void {
    rolando = 0;
    if (yArraste < 0 || painel.scrollHeight <= painel.clientHeight) return;
    const r = painel.getBoundingClientRect();
    const borda = 56;
    let v = 0;
    if (yArraste > r.bottom - borda) v = Math.min(1, (yArraste - (r.bottom - borda)) / borda);
    else if (yArraste < r.top + borda) v = -Math.min(1, (r.top + borda - yArraste) / borda);
    if (v) painel.scrollTop += v * 14;
    rolando = requestAnimationFrame(rolarNoArraste);
  }
  function pararRolagem(): void {
    yArraste = -1;
    if (rolando) cancelAnimationFrame(rolando);
    rolando = 0;
  }
  fundo.addEventListener('pointermove', (e) => {
    const arrastando =
      e.pointerType === 'mouse'
        ? !!arrasteMouse && !!cursor && (e.buttons & 1) === 1
        : !!toque && e.pointerId === toque.id && toque.moveu;
    if (arrastando) {
      yArraste = e.clientY;
      if (!rolando) rolando = requestAnimationFrame(rolarNoArraste);
    } else if (yArraste >= 0 && e.pointerType === 'mouse') pararRolagem();
  });
  fundo.addEventListener('pointermove', (e) => {
    const t = toque;
    if (!t || e.pointerId !== t.id || t.moveu) return;
    if (Math.hypot(e.clientX - t.x0, e.clientY - t.y0) > FOLGA_TOQUE_INV) {
      t.moveu = true;
      clearTimeout(t.timer);
    }
  });
  fundo.addEventListener('pointerup', (e) => {
    pararRolagem();
    const noFundo = e.target === fundo && fundoPressionado;
    fundoPressionado = false;
    if (e.pointerType === 'mouse') {
      const origem = arrasteMouse;
      arrasteMouse = null;
      // clicar fora da janela: com algo na mão, joga no chão (como no Minecraft); sem nada,
      // fecha
      if (noFundo) {
        if (cursor) jogarDaMao(e.button === 2 ? 'direito' : 'esquerdo');
        else fechar();
        return;
      }
      if (!origem || e.button !== 0 || !cursor) return;
      const sob = document.elementFromPoint(e.clientX, e.clientY);
      const destino = alvoSlot(sob);
      if (destino && destino !== origem && recebeArraste(destino))
        acionar(destino, 'esquerdo', false);
      // arrastou até fora da janela: joga no chão
      else if (sob === fundo) jogarDaMao('esquerdo');
      return;
    }
    const t = toque;
    if (!t || e.pointerId !== t.id) {
      if (noFundo) {
        if (cursor) jogarDaMao('esquerdo');
        else fechar();
      }
      return;
    }
    clearTimeout(t.timer);
    toque = null;
    const agora = performance.now();
    const desloc = Math.hypot(e.clientX - t.x0, e.clientY - t.y0);
    if (t.moveu || desloc > FOLGA_TOQUE_INV) {
      ultimoToque = null;
      const sob = document.elementFromPoint(e.clientX, e.clientY);
      const destino = alvoSlot(sob);
      // arrastou até fora da janela: joga no chão o que arrastou
      if (!destino && sob === fundo) {
        if (acoesDeArrastar(t.cursorVazio, t.longo).includes('origem'))
          acionar(t.el, 'esquerdo', false);
        jogarDaMao('esquerdo');
        return;
      }
      if (!destino || destino === t.el || !recebeArraste(destino)) return;
      for (const qual of acoesDeArrastar(t.cursorVazio, t.longo)) {
        acionar(qual === 'origem' ? t.el : destino, 'esquerdo', false);
      }
      return;
    }
    if (t.longo) {
      ultimoToque = null;
      return;
    }
    const g = classificarToqueInventario({
      duracaoMs: agora - t.t0,
      deslocamentoPx: desloc,
      desdeUltimoMs: ultimoToque ? agora - ultimoToque.t : Infinity,
      mesmoSlot: ultimoToque?.el === t.el,
    });
    for (const a of acoesDoGesto(g, t.el.dataset.externo === 'resultado')) {
      acionar(t.el, a.botao, a.shift);
    }
    ultimoToque = g === 'simples' ? { el: t.el, t: agora } : null;
  });
  fundo.addEventListener('pointercancel', (e) => {
    pararRolagem();
    if (toque && e.pointerId === toque.id) {
      clearTimeout(toque.timer);
      toque = null;
    }
    arrasteMouse = null;
    fundoPressionado = false;
  });

  // Catálogo criativo
  function renderCatalogo(): void {
    const termo = busca.value.trim().toLowerCase();
    // spec 014: o que é só de outro tema não aparece no criativo deste mundo
    const aba = abasCat.atual();
    const itens = itensDoCatalogo(estiloMundo()).filter(
      (d) =>
        (!termo || d.nome.toLowerCase().includes(termo)) && (!aba || categoriaDoItem(d) === aba),
    );
    gradeCat.replaceChildren();
    for (const d of itens) {
      const b = criarSlot();
      b.dataset.catalogo = d.id;
      desenharSlot(b, { item: d.id, qtd: 1 });
      gradeCat.appendChild(b);
    }
  }
  busca.addEventListener('input', renderCatalogo);
  busca.addEventListener('keydown', (e) => e.stopPropagation());
  rolarAoFocar(busca);
  function clicarCatalogo(id: string, botao: 'esquerdo' | 'direito', shift: boolean): void {
    const def = obterItem(id);
    if (!def) return;
    if (cursor) {
      cursor = null;
    } else if (shift) {
      inv.adicionar(def.id, def.pilha, def.durabilidade);
    } else {
      cursor = {
        item: def.id,
        qtd: botao === 'direito' ? 1 : def.pilha,
        ...(def.durabilidade ? { dur: def.durabilidade } : {}),
      };
    }
    render();
  }
  fundo.addEventListener('contextmenu', (e) => e.preventDefault());
  inv.ouvir(render);

  function abrir(): void {
    if (aberto) return;
    aberto = true;
    fundo.hidden = false;
    document.body.dataset.overlay = 'inventario';
    catalogo.hidden = !op.criativo();
    if (op.criativo()) renderCatalogo();
    render();
    op.aoAbrir?.();
    tocarSomInterface('mochila');
  }
  const aoFecharAntes: (() => void)[] = [];
  function fechar(): void {
    if (!aberto) return;
    for (const f of aoFecharAntes) f();
    if (cursor) {
      const resto = op.criativo() ? 0 : inv.adicionar(cursor.item, cursor.qtd, cursor.dur);
      // o que não coube fica na mão até sair para o chão (a conta dos itens fecha em cada
      // passo: mochila mais mão, depois a mão para o chão)
      if (resto > 0) {
        cursor = { ...cursor, qtd: resto };
        op.aoSobrar?.(cursor);
      }
      cursor = null;
    }
    aberto = false;
    fundo.hidden = true;
    dica.hidden = true;
    if (toque) clearTimeout(toque.timer);
    toque = null;
    arrasteMouse = null;
    pararRolagem();
    delete document.body.dataset.overlay;
    op.aoFechar?.();
  }

  return {
    get cursor() {
      return cursor;
    },
    set cursor(p: Slot) {
      cursor = p;
      render();
    },
    get aberto() {
      return aberto;
    },
    abrir,
    fechar,
    alternar: () => (aberto ? fechar() : abrir()),
    areaExtra,
    clicarExterno(f) {
      externos.push(f);
    },
    antesDeFechar(f) {
      aoFecharAntes.push(f);
    },
    moverRapidoPara(f) {
      destinosRapidos.push(f);
    },
    criarSlot,
    desenharSlot,
    render,
  };
}
