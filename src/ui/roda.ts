/**
 * Roda de botões (spec 015): abre no meio da tela, em volta do boneco, com botões grandes de
 * ícone e nome curto; tocar fora fecha, Esc fecha e ela fecha sozinha. Como no esboço
 * aprovado (`.sdd/specs/015-terceira-pessoa/referencia/camera-e-gestos.html`). Serve para
 * qualquer lista: o menu da tela e os gestos usam a mesma roda, trocando de lista no lugar.
 */
import { tocarSomInterface } from '../audio/somInterface';

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
  /** O desenho da última vez que abriu (os raios, o botão e se nada encosta em nada). */
  readonly desenho: DesenhoRoda | null;
  /**
   * Abre (ou troca, se já aberta) com esta lista. `focar`: aberta pelo teclado (Enter no
   * botão), o foco entra no primeiro item e volta para quem tinha ao fechar.
   */
  abrir(lista: ListaRoda, focar?: boolean): void;
  /** Monta os botões de uma lista antes (abrir não cria nada na hora). */
  preparar(lista: ListaRoda): void;
  fechar(): void;
  /** Escolhe o item da posição i (0 = o de cima), como um clique. */
  escolher(i: number): void;
  descartar(): void;
}

/** Raio da roda (px) para o tamanho da tela: cabe no celular deitado e no computador. */
export function raioDaRoda(largura: number, altura: number): number {
  return Math.max(92, Math.min(130, Math.min(largura, altura) * 0.3));
}

/**
 * Onde fica cada botão, a partir do centro (px): o primeiro no alto, em sentido horário. Com
 * `raioY`, a roda é oval (mais alta que larga no celular em pé, mais larga que alta deitado).
 */
export function posicoesDaRoda(n: number, raio: number, raioY = raio): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    out.push([Math.cos(a) * raio, Math.sin(a) * raioY]);
  }
  return out;
}

// ------------------------------------------------------------------ o desenho sem encosto
/**
 * Dono, 16 nov 2026: "na Vila Neon os ícones e os nomes da roda ficam um em cima do outro" (a
 * roda cresceu: 11 gestos com os presentes de nível e o roqueiro, 11 itens no menu com as
 * missões, o baú e a lojinha). A roda agora mede os nomes e escolhe o tamanho do botão e os
 * dois raios (oval, quando a tela é estreita) para nada encostar em nada, com qualquer número
 * de itens, e nada sair da tela.
 */
export interface CaixaRotulo {
  w: number;
  h: number;
}
export interface DesenhoRoda {
  /** Os raios (px) na horizontal e na vertical, e o lado do botão (px). */
  rx: number;
  ry: number;
  botao: number;
  pos: [number, number][];
  /** Nada encosta em nada e tudo cabe na tela. */
  livre: boolean;
}
type Caixa = [x0: number, y0: number, x1: number, y1: number];

/** Do botão ao nome dele (px) e a folga mínima entre duas coisas da roda (px). */
export const VAO_NOME = 4;
export const FOLGA_RODA = 3;
/** Da roda à beira da tela (px) e o menor botão que um dedo pequeno ainda acerta (px). */
const MARGEM_RODA = 6;
export const BOTAO_MINIMO = 46;

/** As caixas de cada item (px, a partir do centro): o botão e o nome embaixo dele. */
export function caixasDaRoda(
  pos: readonly [number, number][],
  botao: number,
  rotulos: readonly CaixaRotulo[],
): [Caixa, Caixa][] {
  return pos.map(([x, y], i) => {
    const r = rotulos[i] ?? { w: 0, h: 0 };
    const b = botao / 2;
    return [
      [x - b, y - b, x + b, y + b],
      [x - r.w / 2, y + b + VAO_NOME, x + r.w / 2, y + b + VAO_NOME + r.h],
    ];
  });
}

const encosta = (a: Caixa, b: Caixa, folga: number) =>
  a[0] < b[2] + folga && b[0] < a[2] + folga && a[1] < b[3] + folga && b[1] < a[3] + folga;

/** Algum botão ou nome encosta no botão ou no nome de outro item? */
export function rodaEncosta(caixas: readonly [Caixa, Caixa][], folga = FOLGA_RODA): boolean {
  for (let i = 0; i < caixas.length; i++)
    for (let j = i + 1; j < caixas.length; j++)
      for (const a of caixas[i]) for (const b of caixas[j]) if (encosta(a, b, folga)) return true;
  return false;
}

/**
 * O desenho da roda para `rotulos.length` itens numa tela de `largura` × `altura`: começa do
 * botão e do raio de sempre (`raio0`) e abre a roda (oval, se uma das medidas da tela acabar
 * antes) até nada encostar; se a tela acabar, o botão diminui (até `BOTAO_MINIMO`).
 */
export function desenharRoda(
  largura: number,
  altura: number,
  botaoBase: number,
  rotulos: readonly CaixaRotulo[],
  raio0 = raioDaRoda(largura, altura),
): DesenhoRoda {
  const n = rotulos.length;
  const maiorW = Math.max(0, ...rotulos.map((r) => r.w));
  const maiorH = Math.max(0, ...rotulos.map((r) => r.h));
  let ultimo: DesenhoRoda | null = null;
  for (let botao = botaoBase; botao >= BOTAO_MINIMO; botao -= 2) {
    const rxLim = largura / 2 - MARGEM_RODA - Math.max(botao, maiorW) / 2;
    const ryLim = altura / 2 - MARGEM_RODA - botao / 2 - VAO_NOME - maiorH;
    for (let r = raio0; ; r += 3) {
      const rx = Math.max(40, Math.min(r, rxLim));
      const ry = Math.max(40, Math.min(r, ryLim));
      // a roda de sempre (o primeiro no alto, de ângulo em ângulo); oval, os botões se apertam
      // nas pontas: aí eles vão de passo em passo pela beira (com e sem um botão bem na ponta)
      const jeitos =
        rx === ry
          ? [posicoesDaRoda(n, rx, ry)]
          : [
              posicoesDaRoda(n, rx, ry),
              posicoesNaBeira(n, rx, ry, 0),
              posicoesNaBeira(n, rx, ry, 0.5),
            ];
      for (const pos of jeitos) {
        const livre = !rodaEncosta(caixasDaRoda(pos, botao, rotulos));
        ultimo = { rx, ry, botao, pos, livre: livre && rxLim >= 40 && ryLim >= 40 };
        if (ultimo.livre) return ultimo;
      }
      if (r >= rxLim && r >= ryLim) break;
    }
  }
  return (
    ultimo ?? {
      rx: raio0,
      ry: raio0,
      botao: botaoBase,
      pos: posicoesDaRoda(n, raio0),
      livre: false,
    }
  );
}

/**
 * Os botões pela beira de uma roda oval, de passo em passo (o mesmo tanto de beira entre um e o
 * outro), em sentido horário a partir do alto; `fase` (0 a 1) adianta todos uma fração do passo
 * (com 0,5 nenhum botão cai bem na ponta da oval, onde a curva é mais fechada).
 */
export function posicoesNaBeira(n: number, rx: number, ry: number, fase = 0): [number, number][] {
  const N = 720;
  const pts: [number, number][] = [];
  const soma: number[] = [0];
  for (let i = 0; i <= N; i++) {
    const a = -Math.PI / 2 + (i / N) * Math.PI * 2;
    pts.push([Math.cos(a) * rx, Math.sin(a) * ry]);
    if (i)
      soma.push(soma[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const total = soma[N];
  const out: [number, number][] = [];
  let k = 0;
  for (let i = 0; i < n; i++) {
    const s = ((i + fase) / n) * total;
    while (k < N - 1 && soma[k + 1] < s) k++;
    const f = (s - soma[k]) / Math.max(1e-9, soma[k + 1] - soma[k]);
    out.push([
      pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f,
      pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f,
    ]);
  }
  return out;
}

/**
 * O tamanho do nome sem a tela (testes, e o aparelho antes de desenhar): letras gordinhas de
 * `fonte` px, quebrando nas palavras quando passa de `maximo` px.
 */
export function estimarRotulo(nome: string, fonte: number, maximo: number): CaixaRotulo {
  const larg = (s: string) => s.length * fonte * 0.62;
  const linhas: string[] = [];
  for (const p of nome.split(' ')) {
    const ult = linhas[linhas.length - 1];
    if (ult !== undefined && larg(`${ult} ${p}`) <= maximo)
      linhas[linhas.length - 1] = `${ult} ${p}`;
    else linhas.push(p);
  }
  return { w: Math.max(...linhas.map(larg)), h: linhas.length * fonte * 1.12 };
}

/** O nome na roda: a letra (px) e a largura em que ele quebra (px), folgado ou apertado. */
export const ROTULO_RODA = {
  normal: { fonte: 11.84, maximo: 84 },
  aperto: { fonte: 10.4, maximo: 62 },
} as const;

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
  const m = /^(?:Digit|Numpad)([0-9])$/.exec(code);
  // spec 023: com 10 gestos, o 0 é o décimo
  const i = m ? (Number(m[1]) === 0 ? 10 : Number(m[1])) : 0;
  if (m && i <= n) return { acao: 'escolher', i: i - 1 };
  return null;
}

/**
 * Setas com o foco num item da roda: direita e baixo vão para o próximo (sentido horário),
 * esquerda e cima para o anterior, dando a volta; Home e End vão às pontas. null: não é seta.
 */
export function focoDaSeta(code: string, i: number, n: number): number | null {
  if (n <= 0) return null;
  if (code === 'ArrowRight' || code === 'ArrowDown') return (i + 1) % n;
  if (code === 'ArrowLeft' || code === 'ArrowUp') return (i - 1 + n) % n;
  if (code === 'Home') return 0;
  if (code === 'End') return n - 1;
  return null;
}

export const CSS_RODA = `
.roda { position: fixed; inset: 0; z-index: 55; pointer-events: none; touch-action: none; user-select: none; -webkit-user-select: none; }
.roda::before { content: ""; position: absolute; left: 50%; top: 50%; width: var(--diam, 300px); height: var(--diam-y, var(--diam, 300px));
  margin: calc(var(--diam-y, var(--diam, 300px)) / -2) calc(var(--diam, 300px) / -2); border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 247, 232, 0) 34%, rgba(255, 247, 232, 0.42) 36%, rgba(255, 247, 232, 0.42) 100%);
  opacity: 0; transform: scale(0.6); transition: transform 0.22s, opacity 0.15s; }
.roda.aberta { pointer-events: auto; }
.roda.aberta::before { opacity: 1; transform: scale(1); }
.roda button {
  position: absolute; left: 50%; top: 50%; width: var(--botao, 60px); height: var(--botao, 60px); margin: calc(var(--botao, 60px) / -2); padding: 0; border: 0; border-radius: 999px;
  display: grid; place-items: center; cursor: pointer; color: var(--tinta, #3b2a1e); background: var(--creme, #fff7e8);
  box-shadow: 0 4px 0 #e9d6b2, 0 8px 14px rgba(60, 35, 10, 0.22), inset 0 2px 0 rgba(255, 255, 255, 0.85);
  opacity: 0; transform: translate(0, 0) scale(0.4); transition: transform 0.22s cubic-bezier(0.3, 1.4, 0.5, 1), opacity 0.15s;
  pointer-events: none; touch-action: none;
}
.roda.aberta button.ativo { opacity: 1; pointer-events: auto; }
/* desempenho: cada botão já nasce na sua camada (abrir só move e acende, sem pintar nada) */
.roda button, .roda::before { will-change: transform, opacity; }
.roda button:focus-visible { outline: 3px solid #ffb547; outline-offset: 2px; }
.roda button svg { width: calc(var(--botao, 60px) * 0.533); height: calc(var(--botao, 60px) * 0.533); pointer-events: none; }
/* o nome embaixo do botão, no meio dele; nome comprido quebra em duas linhas nas palavras (a
   roda mede o nome e abre até nenhum encostar em nada: desenharRoda) */
.roda button .nome { position: absolute; top: 100%; left: 50%; transform: translateX(-50%); margin-top: 4px; width: max-content; max-width: 84px;
  font: 800 0.74rem/1.12 var(--jogo, system-ui), sans-serif; color: #fff; text-align: center;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6), 0 0 6px rgba(0, 0, 0, 0.35); white-space: normal; pointer-events: none; }
.roda.aperto button .nome { max-width: 62px; font-size: 0.65rem; }
.roda button kbd { position: absolute; top: -4px; right: -4px; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 9px;
  display: grid; place-items: center; font: 800 0.66rem var(--jogo, system-ui), sans-serif; color: var(--tinta, #3b2a1e);
  background: #ffe4a8; box-shadow: 0 1px 0 #d9b56a; pointer-events: none; }
.roda button.escolhido, .roda button.voltar { background: #ffe4a8; }
/* (no toque o botão é de 64 px: a roda põe a medida em --botao quando abre) */
body.toque-ativo .roda button kbd { display: none; }
body[data-overlay] .roda, body.modo-foto .roda, body.tela-titulo .roda { display: none; }
/* roda aberta: os avisos dão licença (voltam quando ela fecha) */
.toast-area.sob-roda, .legendas.sob-roda { opacity: 0; transition: opacity 0.15s; }
/* tela baixa (celular deitado): a roda passa por cima da barra de itens; a barra dá licença */
@media (max-height: 520px) { .barra.sob-roda { opacity: 0; pointer-events: none; transition: opacity 0.15s; } }
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
  // setas movem o foco entre os itens (sem andar com o boneco)
  el.addEventListener('keydown', (e) => {
    const i = botoes.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const j = focoDaSeta(e.code, i, botoes.length);
    if (j === null) return;
    e.preventDefault();
    e.stopPropagation();
    botoes[j].focus();
  });
  raiz.append(el);

  let aberta = false;
  /** Quem tinha o foco antes de o teclado entrar na roda (volta para ele ao fechar). */
  let focoAntes: HTMLElement | null = null;
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

  /** Botões já montados de cada lista (montados uma vez; trocar de lista não cria nada). */
  const montadas = new Map<ListaRoda, HTMLButtonElement[]>();
  function montar(l: ListaRoda): HTMLButtonElement[] {
    const ja = montadas.get(l);
    if (ja) return ja;
    const bs = l.itens.map((it, i) => botao(it, i));
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
      bs.push(v);
    }
    el.append(...bs);
    montadas.set(l, bs);
    return bs;
  }

  /**
   * Os avisos (e, em tela baixa, a barra de itens) dão licença enquanto a roda está aberta
   * (só eles: nada de mexer no body).
   */
  function avisos(sob: boolean): void {
    for (const a of document.querySelectorAll('.toast-area, .legendas, .barra'))
      a.classList.toggle('sob-roda', sob);
  }

  let desenho: DesenhoRoda | null = null;
  let pos: [number, number][] = [];
  function abrir(l: ListaRoda, focar = false): void {
    clearTimeout(timerEscolha);
    // trocando de lista com o foco dentro (Gestos, Voltar), o foco continua na roda
    const focoDentro = el.contains(document.activeElement);
    if (focar && !focoDentro) focoAntes = document.activeElement as HTMLElement | null;
    const levarFoco = focar || focoDentro;
    const novos = !montadas.has(l);
    const bs = montar(l);
    if (l !== lista) {
      // a lista de antes volta para o meio, encolhida e apagada
      for (const b of botoes) {
        b.classList.remove('ativo');
        b.style.transform = '';
        b.tabIndex = -1;
      }
    }
    lista = l;
    botoes = bs;
    for (const b of botoes) b.classList.remove('escolhido');
    // spec 023: com mais de 8 (os gestos dos presentes de nível), a roda abre um pouco mais
    const r0 = raioDaRoda(innerWidth, innerHeight) * (l.itens.length > 8 ? 1.15 : 1);
    // spec 026 (dono, 16 nov 2026): nada encosta em nada. A roda mede os nomes e abre (oval, se
    // a tela for estreita) até caber; se nem assim, os nomes apertam (letra menor, duas linhas)
    const base = document.body.classList.contains('toque-ativo') ? 64 : 60;
    const medir = (modo: keyof typeof ROTULO_RODA) =>
      l.itens.map((it, i) => {
        const nome = botoes[i]?.querySelector<HTMLElement>('.nome');
        return nome && nome.offsetWidth > 0
          ? { w: nome.offsetWidth, h: nome.offsetHeight }
          : estimarRotulo(it.nome, ROTULO_RODA[modo].fonte, ROTULO_RODA[modo].maximo);
      });
    el.classList.remove('aperto');
    let d = desenharRoda(innerWidth, innerHeight, base, medir('normal'), r0);
    if (!d.livre) {
      el.classList.add('aperto');
      d = desenharRoda(innerWidth, innerHeight, base, medir('aperto'), r0);
    }
    desenho = d;
    el.style.setProperty('--botao', `${d.botao}px`);
    el.style.setProperty('--diam', `${d.rx * 2 + 96}px`);
    el.style.setProperty('--diam-y', `${d.ry * 2 + 96}px`);
    pos = d.pos;
    const colocar = () =>
      botoes.forEach((b, i) => {
        b.classList.add('ativo');
        b.style.transform = pos[i]
          ? `translate(${pos[i][0].toFixed(1)}px, ${pos[i][1].toFixed(1)}px) scale(1)`
          : 'translate(0, 0) scale(0.85)';
        b.tabIndex = 0;
      });
    // montados agora: um quadro para nascerem encolhidos no meio e abrirem com o pulinho
    const focarPrimeiro = () => {
      if (levarFoco) botoes[0]?.focus();
    };
    if (novos)
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          colocar();
          focarPrimeiro();
        }),
      );
    else {
      colocar();
      focarPrimeiro();
    }
    el.classList.add('aberta');
    el.setAttribute('aria-hidden', 'false');
    clearTimeout(timer);
    timer = setTimeout(fechar, (op.fecharEm ?? 6) * 1000);
    if (!aberta) {
      aberta = true;
      avisos(true);
      op.aoMudar?.(true);
      tocarSomInterface('rodaAbrir');
    }
  }

  function fechar(): void {
    clearTimeout(timer);
    const devolver = el.contains(document.activeElement);
    el.classList.remove('aberta');
    el.setAttribute('aria-hidden', 'true');
    for (const b of botoes) {
      b.classList.remove('ativo');
      b.style.transform = '';
      b.tabIndex = -1;
    }
    if (devolver) {
      // o foco não fica num botão escondido: volta para quem tinha antes
      (document.activeElement as HTMLElement | null)?.blur?.();
      if (focoAntes?.isConnected) focoAntes.focus();
    }
    focoAntes = null;
    if (aberta) {
      aberta = false;
      avisos(false);
      op.aoMudar?.(false);
      tocarSomInterface('rodaFechar');
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
    get desenho() {
      return desenho;
    },
    abrir,
    preparar: (l) => void montar(l),
    fechar,
    escolher,
    descartar() {
      clearTimeout(timer);
      clearTimeout(timerEscolha);
      el.remove();
    },
  };
}
