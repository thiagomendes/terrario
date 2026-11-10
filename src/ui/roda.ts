/**
 * Roda de botões (spec 015): abre no meio da tela, em volta do boneco, com botões grandes de
 * ícone e nome curto; tocar fora fecha, Esc fecha e ela fecha sozinha. Como no esboço
 * aprovado (`.sdd/specs/015-terceira-pessoa/referencia/camera-e-gestos.html`). Serve para
 * qualquer lista: o menu da tela e os gestos usam a mesma roda, trocando de lista no lugar.
 */

export interface ItemRoda {
  id: string;
  /** Nome curto embaixo do botão (e o nome para leitores de tela). */
  nome: string;
  /** SVG do ícone (innerHTML). */
  icone: string;
  /** Tecla do computador, num selinho no botão (some no toque). */
  tecla?: string;
}

/** Uma lista que a roda mostra (a roda troca de lista no mesmo lugar). */
export interface ListaRoda {
  itens: readonly ItemRoda[];
  aoEscolher(id: string): void;
  /** Botão "Voltar" no meio (volta para a lista de antes). */
  aoVoltar?(): void;
  /** Escolher não fecha a roda (quem escolheu troca de lista). */
  manter?(id: string): boolean;
}

export interface OpcoesRoda {
  /** Nome da roda (leitores de tela). */
  rotulo: string;
  /** Abriu ou fechou (o botão que abre mostra o estado). */
  aoMudar?(aberta: boolean): void;
  /** Fecha sozinha depois de tantos segundos aberta (padrão 6). */
  fecharEm?: number;
}

export interface Roda {
  readonly elemento: HTMLElement;
  readonly aberta: boolean;
  /** A lista na roda agora. */
  readonly lista: ListaRoda | null;
  /** Abre (ou troca, se já aberta) com esta lista. */
  abrir(lista: ListaRoda): void;
  fechar(): void;
  /** Escolhe o item da posição i (0 = o de cima), como um clique. */
  escolher(i: number): void;
  descartar(): void;
}

/** Raio da roda (px) para o tamanho da tela: cabe no celular deitado e no computador. */
export function raioDaRoda(largura: number, altura: number): number {
  return Math.max(92, Math.min(130, Math.min(largura, altura) * 0.3));
}

/** Onde fica cada botão, a partir do centro (px): o primeiro no alto, em sentido horário. */
export function posicoesDaRoda(n: number, raio: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    out.push([Math.cos(a) * raio, Math.sin(a) * raio]);
  }
  return out;
}

export type AcaoTeclaRoda =
  | { acao: 'alternar' }
  | { acao: 'fechar' }
  | { acao: 'escolher'; i: number };

/**
 * O que uma tecla faz com a roda: `tecla` alterna; com ela aberta, Esc fecha e os números
 * escolhem (fechada, os números são da barra de itens e a roda não pega).
 */
export function teclaDaRoda(
  code: string,
  aberta: boolean,
  n: number,
  tecla = 'KeyG',
): AcaoTeclaRoda | null {
  if (code === tecla) return { acao: 'alternar' };
  if (!aberta) return null;
  if (code === 'Escape') return { acao: 'fechar' };
  const m = /^(?:Digit|Numpad)([1-9])$/.exec(code);
  if (m && Number(m[1]) <= n) return { acao: 'escolher', i: Number(m[1]) - 1 };
  return null;
}

export const CSS_RODA = `
.roda { position: fixed; inset: 0; z-index: 55; pointer-events: none; touch-action: none; user-select: none; -webkit-user-select: none; }
.roda::before { content: ""; position: absolute; left: 50%; top: 50%; width: var(--diam, 300px); height: var(--diam, 300px); margin: calc(var(--diam, 300px) / -2); border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 247, 232, 0) 34%, rgba(255, 247, 232, 0.42) 36%, rgba(255, 247, 232, 0.42) 100%);
  opacity: 0; transform: scale(0.6); transition: transform 0.22s, opacity 0.15s; }
.roda.aberta { pointer-events: auto; }
.roda.aberta::before { opacity: 1; transform: scale(1); }
.roda button {
  position: absolute; left: 50%; top: 50%; width: 60px; height: 60px; margin: -30px; padding: 0; border: 0; border-radius: 999px;
  display: grid; place-items: center; cursor: pointer; color: var(--tinta, #3b2a1e); background: var(--creme, #fff7e8);
  box-shadow: 0 4px 0 #e9d6b2, 0 8px 14px rgba(60, 35, 10, 0.22), inset 0 2px 0 rgba(255, 255, 255, 0.85);
  opacity: 0; transform: translate(0, 0) scale(0.4); transition: transform 0.22s cubic-bezier(0.3, 1.4, 0.5, 1), opacity 0.15s;
  pointer-events: none; touch-action: none;
}
.roda.aberta button { opacity: 1; pointer-events: auto; }
.roda button:focus-visible { outline: 3px solid #ffb547; outline-offset: 2px; }
.roda button svg { width: 32px; height: 32px; pointer-events: none; }
.roda button .nome { position: absolute; top: 100%; margin-top: 4px; font: 800 0.74rem var(--jogo, system-ui), sans-serif; color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6), 0 0 6px rgba(0, 0, 0, 0.35); white-space: nowrap; pointer-events: none; }
.roda button kbd { position: absolute; top: -4px; right: -4px; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 9px;
  display: grid; place-items: center; font: 800 0.66rem var(--jogo, system-ui), sans-serif; color: var(--tinta, #3b2a1e);
  background: #ffe4a8; box-shadow: 0 1px 0 #d9b56a; pointer-events: none; }
.roda button.escolhido, .roda button.voltar { background: #ffe4a8; }
body.toque-ativo .roda button { width: 64px; height: 64px; margin: -32px; }
body.toque-ativo .roda button svg { width: 34px; height: 34px; }
body.toque-ativo .roda button kbd { display: none; }
body[data-overlay] .roda, body.modo-foto .roda, body.tela-titulo .roda { display: none; }
/* roda aberta: os avisos dão licença (voltam quando ela fecha) */
body.roda-aberta .toast-area, body.roda-aberta .legendas { opacity: 0; transition: opacity 0.15s; }
@media (prefers-reduced-motion: reduce) { .roda button, .roda::before { transition: none; } }
`;

let cssPosto = false;

export function criarRoda(op: OpcoesRoda, raiz: HTMLElement = document.body): Roda {
  if (!cssPosto) {
    cssPosto = true;
    const st = document.createElement('style');
    st.textContent = CSS_RODA;
    document.head.append(st);
  }
  const el = document.createElement('div');
  el.className = 'roda';
  el.setAttribute('role', 'menu');
  el.setAttribute('aria-label', op.rotulo);
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('data-roda', '');
  // tocar fora (no fundo da roda) fecha
  el.addEventListener('pointerdown', (e) => {
    if (e.target === el) {
      e.preventDefault();
      fechar();
    }
  });
  raiz.append(el);

  let aberta = false;
  let lista: ListaRoda | null = null;
  let botoes: HTMLButtonElement[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timerEscolha: ReturnType<typeof setTimeout> | undefined;

  function botao(it: ItemRoda, i: number | null): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'menuitem');
    b.setAttribute('aria-label', it.nome);
    b.setAttribute('data-item', it.id);
    b.tabIndex = -1;
    b.innerHTML = it.icone;
    const nome = document.createElement('span');
    nome.className = 'nome';
    nome.textContent = it.nome;
    b.append(nome);
    if (it.tecla) {
      const k = document.createElement('kbd');
      k.textContent = it.tecla;
      b.append(k);
    }
    // não deixa o toque virar toque no mundo atrás; escolhe no clique (vale como gesto do
    // usuário para a tela cheia, no toque e no mouse)
    b.addEventListener('pointerdown', (e) => e.stopPropagation());
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (i === null) lista?.aoVoltar?.();
      else escolher(i);
    });
    return b;
  }

  function montar(l: ListaRoda): void {
    for (const b of botoes) b.remove();
    botoes = l.itens.map((it, i) => botao(it, i));
    if (l.aoVoltar) {
      const v = botao(
        {
          id: 'voltar',
          nome: 'Voltar',
          icone:
            '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M18 8 L10 16 L18 24" fill="none" stroke="#3b2a1e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        },
        null,
      );
      v.classList.add('voltar');
      botoes.push(v);
    }
    el.append(...botoes);
  }

  function abrir(l: ListaRoda): void {
    clearTimeout(timerEscolha);
    const trocar = l !== lista || botoes.length === 0;
    lista = l;
    if (trocar) montar(l);
    for (const b of botoes) b.classList.remove('escolhido');
    const r = raioDaRoda(innerWidth, innerHeight);
    el.style.setProperty('--diam', `${r * 2 + 96}px`);
    const pos = posicoesDaRoda(l.itens.length, r);
    // um quadro para a roda nascer encolhida no meio e abrir com o pulinho
    const colocar = () =>
      botoes.forEach((b, i) => {
        b.style.transform = pos[i]
          ? `translate(${pos[i][0].toFixed(1)}px, ${pos[i][1].toFixed(1)}px) scale(1)`
          : 'translate(0, 0) scale(0.85)';
        b.tabIndex = 0;
      });
    if (trocar) requestAnimationFrame(() => requestAnimationFrame(colocar));
    else colocar();
    el.classList.add('aberta');
    el.setAttribute('aria-hidden', 'false');
    clearTimeout(timer);
    timer = setTimeout(fechar, (op.fecharEm ?? 6) * 1000);
    if (!aberta) {
      aberta = true;
      document.body.classList.add('roda-aberta');
      op.aoMudar?.(true);
    }
  }

  function fechar(): void {
    clearTimeout(timer);
    el.classList.remove('aberta');
    el.setAttribute('aria-hidden', 'true');
    for (const b of botoes) {
      b.style.transform = '';
      b.tabIndex = -1;
    }
    if (aberta) {
      aberta = false;
      document.body.classList.remove('roda-aberta');
      op.aoMudar?.(false);
    }
  }

  function escolher(i: number): void {
    const l = lista;
    const it = l?.itens[i];
    if (!l || !it || !aberta) return;
    botoes.forEach((b, j) => b.classList.toggle('escolhido', j === i));
    l.aoEscolher(it.id);
    if (l.manter?.(it.id) || lista !== l) return;
    // o botão escolhido acende um instante antes de a roda fechar
    clearTimeout(timerEscolha);
    timerEscolha = setTimeout(fechar, 180);
  }

  return {
    elemento: el,
    get aberta() {
      return aberta;
    },
    get lista() {
      return lista;
    },
    abrir,
    fechar,
    escolher,
    descartar() {
      clearTimeout(timer);
      clearTimeout(timerEscolha);
      el.remove();
    },
  };
}
