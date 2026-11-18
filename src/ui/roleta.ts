/**
 * A roleta do menu (spec 033, dono, 18 nov 2026): no lugar da roda da spec 015, em todo mundo,
 * modo e aparelho.
 *
 * Uma fileira de botões redondos (os mesmos da roda: creme, contorno marrom, os mesmos ícones)
 * numa bandeja como a da barrinha. A criança arrasta para a esquerda ou para a direita; o do
 * meio fica maior, com a borda dourada do item escolhido da barrinha e o nome embaixo; os
 * vizinhos encolhem e somem para as pontas, e a fileira dá a volta sem fim. Só 3 a 5 aparecem
 * de cada vez, então cabe qualquer número de itens sem encostar.
 *
 * Roletas ligadas: escolher um item que tem lista (Gestos) troca a fileira pela dele, e a
 * plaquinha de cima da bandeja vira "‹ [ícone de onde veio] Voltar" (na de cima, "✕ Fechar"):
 * um lugar só para sair, em pé no meio (o canto é do joystick) e deitado à esquerda. Tocar
 * fora sobe um nível (na de cima, fecha). Qualquer profundidade: cada nível é uma roleta igual.
 *
 * Embaixo, por cima da barrinha: aberta, a barrinha, o joystick e os botões de correr e pular
 * dão licença e voltam quando ela fecha. Fecha sozinha em 8 s. Tocar num vizinho rola até ele;
 * tocar no do meio escolhe. Cada item que passa pelo meio faz um "toc" baixinho.
 *
 * No computador: arrastar com o mouse, a rodinha, as setas, Enter (ou espaço) escolhe,
 * Backspace sobe um nível e Esc fecha (o menu cuida do Esc e dos números dos gestos).
 */
import { tocarSomInterface } from '../audio/somInterface';
import type { ItemRoda, ListaRoda, OpcoesRoda, Roda } from './roda';

// ------------------------------------------------------------------------ contas (puras)

/** Lado do botão do meio (px); os vizinhos ficam com 78 % e os seguintes com 58 %. */
export const TAM_ROLETA = 96;

/** O resto sempre positivo (a fileira dá a volta). */
export const modulo = (i: number, n: number) => ((i % n) + n) % n;

/** Encolhe para as pontas: o do meio inteiro, o vizinho 78 %, o seguinte 58 % (nunca menos de 42 %). */
export function escalaNaRoleta(u: number): number {
  const a = Math.abs(u);
  return Math.max(0.42, 1 - 0.22 * Math.min(a, 1) - 0.2 * Math.max(0, Math.min(a, 2.6) - 1));
}

/**
 * Some para as pontas: inteiro até o vizinho, pouco mais da metade no seguinte (bem apagado ele
 * parecia sujeira no chão claro), nada passando de 3,2.
 */
export function opacidadeNaRoleta(u: number): number {
  const a = Math.abs(u);
  if (a <= 1) return 1;
  return Math.max(0, 1 - (a - 1) * 0.45);
}

/**
 * Distância do meio (px) do item a `u` passos do meio: os menores ficam mais juntos (a soma das
 * metades dos botões e de um vão que também encolhe).
 */
export function deslocamentoNaRoleta(u: number, tamanho: number, vao = 14): number {
  const a = Math.abs(u);
  // integra (metade do botão + vão) ao longo do caminho, em passos de 0,05
  let x = 0;
  const passo = 0.05;
  for (let t = 0; t < a; t += passo) {
    const d = Math.min(passo, a - t);
    const m = t + d / 2;
    x += d * (tamanho * escalaNaRoleta(m) + vao * escalaNaRoleta(m));
  }
  return Math.sign(u) * x;
}

/** Quantos vizinhos de cada lado mostrar com `n` itens (sem o mesmo item aparecer duas vezes). */
export function vizinhosVisiveis(n: number, maximo = 3): number {
  if (n <= 1) return 0;
  return Math.max(0, Math.min(maximo, Math.floor((n - 1) / 2)));
}

/**
 * Onde a fileira para quando o dedo solta: perdoa (um quarto de passo já anda um item) e um
 * piparote anda até mais dois. `de` é onde ela estava quando o dedo encostou, `agora` onde está,
 * `vel` em itens por segundo (positivo: para a direita da lista).
 */
export function pararRoleta(de: number, agora: number, vel: number): number {
  const andou = agora - de;
  let alvo = Math.round(agora);
  if (alvo === Math.round(de) && Math.abs(andou) >= 0.25) alvo = Math.round(de) + Math.sign(andou);
  const extra = Math.max(-2, Math.min(2, Math.round(vel * 0.18)));
  if (Math.abs(vel) > 2.5) alvo += extra;
  return alvo;
}

// ------------------------------------------------------------------------------ o desenho

const SETA =
  '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M18 8 L10 16 L18 24" fill="none" stroke="#3b2a1e" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const XIS =
  '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M10 10 L22 22 M22 10 L10 22" fill="none" stroke="#3b2a1e" stroke-width="3.4" stroke-linecap="round"/></svg>';

export const CSS_ROLETA = `
.roleta { position: fixed; inset: 0; z-index: 55; pointer-events: none; touch-action: none; user-select: none; -webkit-user-select: none; --tam: 96px; }
.roleta.aberta { pointer-events: auto; }
.roleta .bandeja { position: absolute; left: 50%; width: min(560px, calc(100vw - 16px)); height: calc(var(--tam) + 58px);
  transform: translate(-50%, 40px); opacity: 0; transition: transform 0.24s cubic-bezier(0.3, 1.3, 0.5, 1), opacity 0.16s;
  border-radius: 26px; background: rgba(255, 247, 232, 0.42);
  box-shadow: 0 4px 0 rgba(150, 110, 60, 0.28), 0 10px 22px rgba(40, 25, 10, 0.22), inset 0 2px 0 rgba(255, 255, 255, 0.7);
  -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 13%, #000 87%, transparent 100%);
          mask-image: linear-gradient(90deg, transparent 0, #000 13%, #000 87%, transparent 100%); }
.roleta.aberta .bandeja { transform: translate(-50%, 0); opacity: 1; }
/* embaixo, por cima da barrinha (que dá licença enquanto ela está aberta) */
.roleta .bandeja { bottom: max(8px, env(safe-area-inset-bottom)); }
/* a trilha dos botões: o meio da bandeja, um pouco acima (o nome vai embaixo) */
.roleta .trilho { position: absolute; left: 50%; top: calc(8px + var(--tam) / 2); width: 0; height: 0; }
.roleta .item { position: absolute; left: 0; top: 0; width: var(--tam); height: var(--tam); margin: calc(var(--tam) / -2); padding: 0; border: 0;
  border-radius: 999px; display: grid; place-items: center; cursor: pointer; color: var(--tinta, #3b2a1e); background: var(--creme, #fff7e8);
  box-shadow: 0 4px 0 #e9d6b2, 0 8px 14px rgba(60, 35, 10, 0.22), inset 0 2px 0 rgba(255, 255, 255, 0.85);
  will-change: transform, opacity; touch-action: none; }
.roleta .item svg { width: 56%; height: 56%; pointer-events: none; }
.roleta .item.meio { background: #ffe4a8; box-shadow: 0 0 0 4px #f5b52e, 0 5px 0 #d99a1f, 0 10px 18px rgba(60, 35, 10, 0.28), inset 0 2px 0 rgba(255, 255, 255, 0.85); }
.roleta .item.escolhido { animation: roleta-pulo 0.2s ease-out; }
@keyframes roleta-pulo { 50% { transform: var(--tf) scale(1.12); } }
.roleta .item:focus-visible { outline: 3px solid #ffb547; outline-offset: 3px; }
/* o nome do meio, numa plaquinha creme (letra grande, marrom) */
.roleta .nome-meio { position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%); max-width: calc(100% - 40px);
  padding: 3px 14px; border-radius: 999px; background: #fff7e8; color: #3b2a1e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  font: 800 1.05rem/1.25 var(--jogo, system-ui), sans-serif; box-shadow: 0 2px 0 #e9d6b2; pointer-events: none; }
/* a plaquinha de cima da bandeja: dentro de uma lista, "Voltar" com o ícone de onde a criança
   veio; na de cima, "Fechar". Sempre no mesmo lugar (um lugar só para sair). */
.roleta .voltar { position: absolute; left: 0; top: 0; height: 58px; margin: 0; padding: 0 18px 0 8px; border: 0; border-radius: 999px;
  display: flex; align-items: center; gap: 6px; cursor: pointer; background: #fff7e8; opacity: 0; pointer-events: none; white-space: nowrap;
  box-shadow: 0 4px 0 #e9d6b2, 0 8px 14px rgba(60, 35, 10, 0.22), inset 0 2px 0 rgba(255, 255, 255, 0.85);
  transition: transform 0.28s cubic-bezier(0.3, 1.2, 0.5, 1), opacity 0.16s; will-change: transform, opacity; touch-action: none; }
.roleta .voltar .seta { width: 40px; height: 40px; border-radius: 999px; background: #ffe4a8; display: grid; place-items: center; box-shadow: 0 2px 0 #d9b56a; flex: none; }
.roleta .voltar .seta svg { width: 24px; height: 24px; }
.roleta .voltar .pai { width: 40px; height: 40px; display: grid; place-items: center; flex: none; }
.roleta .voltar .pai:empty { display: none; }
.roleta .voltar .pai svg { width: 40px; height: 40px; }
.roleta .voltar .rotulo { color: #3b2a1e; font: 800 1.05rem/1 var(--jogo, system-ui), sans-serif; }
.roleta.aberta .voltar.ativo { opacity: 1; pointer-events: auto; }
.roleta .item kbd { position: absolute; top: -2px; right: -2px; min-width: 20px; height: 20px; padding: 0 4px; border-radius: 10px;
  display: grid; place-items: center; font: 800 0.7rem var(--jogo, system-ui), sans-serif; color: var(--tinta, #3b2a1e);
  background: #ffe4a8; box-shadow: 0 1px 0 #d9b56a; pointer-events: none; }
body.toque-ativo .roleta kbd, body.sem-teclas .roleta kbd { display: none; }
body[data-overlay] .roleta, body.modo-foto .roleta, body.tela-titulo .roleta { display: none; }
/* roleta aberta: os avisos e o que fica embaixo dela dão licença (voltam quando ela fecha) */
.toast-area.sob-roda, .legendas.sob-roda { opacity: 0; transition: opacity 0.15s; }
.sob-roleta { opacity: 0 !important; pointer-events: none !important; transition: opacity 0.15s; }
/* tela baixa (celular deitado): a bandeja mais baixa, o nome encostado no botão (cobre menos o boneco) */
@media (max-height: 520px) { .roleta .bandeja { height: calc(var(--tam) + 44px); } .roleta .nome-meio { bottom: 5px; } }
@media (prefers-reduced-motion: reduce) { .roleta .bandeja, .roleta .voltar { transition: none; } }
`;

let cssPosto = false;

/** O que fica embaixo da roleta e dá licença enquanto ela está aberta. */
export const TAPA_ROLETA =
  '.barra, .nome-item, .status, .toque .joystick, .toque .botoes';

/** Passos do arraste (px) por item: o espaço do meio ao vizinho. */
const passoPx = (tamanho: number) => deslocamentoNaRoleta(1, tamanho);

export function criarRoleta(op: OpcoesRoda, raiz: HTMLElement = document.body): Roda {
  const tamanho = TAM_ROLETA;
  if (!cssPosto) {
    cssPosto = true;
    const st = document.createElement('style');
    st.textContent = CSS_ROLETA;
    document.head.append(st);
  }
  const el = document.createElement('div');
  el.className = 'roleta';
  el.style.setProperty('--tam', `${tamanho}px`);
  el.setAttribute('role', 'menu');
  el.setAttribute('aria-label', op.rotulo);
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('data-roda', '');
  el.setAttribute('data-roleta', '');
  const bandeja = document.createElement('div');
  bandeja.className = 'bandeja';
  const trilho = document.createElement('div');
  trilho.className = 'trilho';
  const nomeMeio = document.createElement('div');
  nomeMeio.className = 'nome-meio';
  nomeMeio.setAttribute('data-nome-meio', '');
  bandeja.append(trilho, nomeMeio);
  const bVoltar = document.createElement('button');
  bVoltar.type = 'button';
  bVoltar.className = 'voltar';
  bVoltar.setAttribute('aria-label', 'Voltar');
  bVoltar.setAttribute('data-item', 'voltar');
  bVoltar.innerHTML = `<span class="seta">${SETA}</span><span class="pai"></span><span class="rotulo">Voltar</span>`;
  el.append(bandeja, bVoltar);
  raiz.append(el);

  let aberta = false;
  let lista: ListaRoda | null = null;
  /** Onde cada lista estava (o meio, em índice contínuo): voltar a ela volta no mesmo item. */
  const posDe = new Map<ListaRoda, number>();
  let pos = 0;
  /** Para onde a fileira está indo (animação de assentar). */
  let alvo = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timerEscolha: ReturnType<typeof setTimeout> | undefined;
  /** O pai de cada lista aberta por um item (a abinha "Voltar" mostra o ícone dele). */
  const paiDe = new Map<ListaRoda, ItemRoda>();
  let focoAntes: HTMLElement | null = null;

  // os botões reaproveitados (um por lugar da fileira, -R..R)
  const R = 3;
  const chips: { b: HTMLButtonElement; i: number }[] = [];
  for (let k = -R; k <= R; k++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'item';
    b.setAttribute('role', 'menuitem');
    b.tabIndex = -1;
    trilho.append(b);
    chips.push({ b, i: Number.NaN });
  }

  const n = () => lista?.itens.length ?? 0;
  const passo = () => passoPx(tamanho);

  function desenhar(): void {
    const l = lista;
    if (!l) return;
    const N = l.itens.length;
    const viz = vizinhosVisiveis(N, 2);
    // mais um de cada lado, sumindo na ponta (só se nenhum item aparecer duas vezes)
    const lado = N >= 2 * (viz + 1) + 1 ? viz + 1 : viz;
    const base = Math.round(pos);
    const meioI = modulo(base, N);
    chips.forEach((c, j) => {
      const k = j - R;
      const u = base + k - pos;
      const vis = Math.abs(k) <= lado && N > 0;
      if (!vis) {
        c.b.style.opacity = '0';
        c.b.style.pointerEvents = 'none';
        c.b.style.visibility = 'hidden';
        return;
      }
      c.b.style.visibility = '';
      const i = modulo(base + k, N);
      if (c.i !== i || c.b.dataset.lista !== listaId(l)) {
        const it = l.itens[i];
        c.i = i;
        c.b.dataset.lista = listaId(l);
        c.b.innerHTML = it.icone + (it.tecla ? `<kbd>${it.tecla}</kbd>` : '');
        c.b.setAttribute('aria-label', it.nome);
        c.b.setAttribute('data-item', it.id);
      }
      const x = deslocamentoNaRoleta(u, tamanho);
      const s = escalaNaRoleta(u);
      const tf = `translate(${x.toFixed(1)}px, ${((1 - s) * tamanho * 0.18).toFixed(1)}px) scale(${s.toFixed(3)})`;
      c.b.style.transform = tf;
      c.b.style.setProperty('--tf', tf);
      c.b.style.opacity = opacidadeNaRoleta(u).toFixed(3);
      c.b.style.zIndex = String(10 - Math.round(Math.abs(u) * 2));
      c.b.style.pointerEvents = opacidadeNaRoleta(u) > 0.3 ? '' : 'none';
      c.b.classList.toggle('meio', k === 0 && Math.abs(u) < 0.5);
      c.b.tabIndex = k === 0 ? 0 : -1;
    });
    const nome = l.itens[meioI]?.nome ?? '';
    if (nomeMeio.textContent !== nome) nomeMeio.textContent = nome;
    el.dataset.meio = l.itens[meioI]?.id ?? '';
  }

  const ids = new WeakMap<ListaRoda, string>();
  let proxId = 0;
  function listaId(l: ListaRoda): string {
    let s = ids.get(l);
    if (!s) ids.set(l, (s = String(++proxId)));
    return s;
  }

  // a animação de assentar (mola sem passar do ponto)
  let quadro = 0;
  let ultimoT = 0;
  let meioAntes = Number.NaN;
  function animar(): void {
    cancelAnimationFrame(quadro);
    ultimoT = performance.now();
    delete el.dataset.parada;
    const passo = (t: number) => {
      const dt = Math.min(0.05, Math.max(0, t - ultimoT) / 1000);
      ultimoT = t;
      if (!arrastando) {
        const d = alvo - pos;
        pos += d * Math.min(1, dt * 14);
        if (Math.abs(d) < 0.002) pos = alvo;
      }
      tique();
      desenhar();
      if (arrastando || pos !== alvo) quadro = requestAnimationFrame(passo);
      // assentou (os testes esperam por isto antes do próximo toque)
      else el.dataset.parada = '';
    };
    quadro = requestAnimationFrame(passo);
  }
  /** Um "toc" baixinho a cada item que passa pelo meio. */
  function tique(): void {
    const m = Math.round(pos);
    if (m !== meioAntes) {
      if (!Number.isNaN(meioAntes)) tocarSomInterface('toc');
      meioAntes = m;
    }
  }

  function irPara(novo: number): void {
    alvo = novo;
    adiar();
    animar();
  }

  // ------------------------------------------------------------------ o dedo (e o mouse)
  let arrastando = false;
  let dedo: number | null = null;
  let x0 = 0;
  let pos0 = 0;
  let t0 = 0;
  let moveu = false;
  let tocado: HTMLElement | null = null;
  /** Quando a abinha "Voltar" apareceu (ms). */
  let voltarDesde = -Infinity;
  const historico: { t: number; p: number }[] = [];
  el.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    if (!aberta) return;
    const naBandeja = bandeja.contains(e.target as Node);
    if (e.target === bVoltar || bVoltar.contains(e.target as Node)) return;
    if (!naBandeja) {
      // tocar fora: sobe um nível (na de cima, fecha)
      e.preventDefault();
      subirOuFechar();
      return;
    }
    e.preventDefault();
    dedo = e.pointerId;
    // o botão em que o dedo encostou (um toque escolhe por ele, não por onde o dedo soltou)
    tocado = ((e.target as Element | null)?.closest?.('.item') as HTMLElement | null) ?? null;
    arrastando = true;
    moveu = false;
    x0 = e.clientX;
    pos0 = pos;
    t0 = performance.now();
    historico.length = 0;
    historico.push({ t: t0, p: pos });
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // sem captura (dedo já saiu)
    }
    adiar();
    animar();
  });
  el.addEventListener('pointermove', (e) => {
    if (!arrastando || e.pointerId !== dedo) return;
    const dx = e.clientX - x0;
    if (Math.abs(dx) > 8) moveu = true;
    // arrastar para a direita traz os da esquerda (a fileira anda com o dedo)
    pos = pos0 - dx / passo();
    const t = performance.now();
    historico.push({ t, p: pos });
    while (historico.length > 2 && t - historico[0].t > 120) historico.shift();
  });
  const soltar = (e: PointerEvent) => {
    if (!arrastando || e.pointerId !== dedo) return;
    arrastando = false;
    dedo = null;
    const dur = performance.now() - t0;
    if (!moveu && dur < 600) {
      // um toque: em qual botão?
      pos = pos0;
      const c = chips.find((q) => q.b === tocado);
      if (c) {
        const k = chips.indexOf(c) - R;
        // o do meio escolhe; um vizinho rola até o meio (outro toque escolhe)
        if (k === 0) escolherMeio();
        else irPara(Math.round(pos0) + k);
      } else irPara(Math.round(pos0));
      return;
    }
    const h0 = historico[0];
    const h1 = historico[historico.length - 1];
    // o dedo parou antes de soltar: sem piparote (assenta onde está)
    const parado = performance.now() - h1.t > 100;
    const vel = h1.t > h0.t && !parado ? ((h1.p - h0.p) / (h1.t - h0.t)) * 1000 : 0;
    irPara(pararRoleta(pos0, pos, vel));
  };
  el.addEventListener('pointerup', soltar);
  el.addEventListener('pointercancel', soltar);
  // o toque que escolhe já abriu a tela do item (a pausa, o mapa...) quando o dedo sai: sem
  // isto, o clique de compatibilidade do navegador cairia no botão que está ali na tela nova
  // (a plaquinha de sair, que age pelo clique, fica de fora)
  el.addEventListener(
    'touchend',
    (e) => {
      if (bVoltar.contains(e.target as Node)) return;
      if (e.cancelable) e.preventDefault();
    },
    { passive: false },
  );
  // a rodinha do mouse e o touchpad andam um item por vez
  let rodaAcum = 0;
  el.addEventListener(
    'wheel',
    (e) => {
      if (!aberta) return;
      e.preventDefault();
      // nem a câmera nem a barrinha (Shift) andam junto
      e.stopPropagation();
      rodaAcum += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(rodaAcum) >= 60) {
        irPara(Math.round(alvo) + Math.sign(rodaAcum));
        rodaAcum = 0;
      }
    },
    { passive: false },
  );
  // setas andam, Enter e espaço escolhem o do meio (com a roleta aberta, no computador, as
  // setas são dela e não andam com o boneco)
  window.addEventListener(
    'keydown',
    (e) => {
      if (!aberta) return;
      const alvoEl = e.target as HTMLElement | null;
      if (alvoEl && (alvoEl.tagName === 'INPUT' || alvoEl.tagName === 'TEXTAREA')) return;
      if (e.code === 'ArrowRight') irPara(Math.round(alvo) + 1);
      else if (e.code === 'ArrowLeft') irPara(Math.round(alvo) - 1);
      else if (e.code === 'Enter' || e.code === 'Space') escolherMeio();
      else if (e.code === 'Backspace') subirOuFechar();
      else return;
      e.preventDefault();
      e.stopImmediatePropagation();
    },
    true,
  );
  el.addEventListener('keydown', (e) => {
    if (!aberta) return;
    if (e.code === 'ArrowRight' || e.code === 'ArrowDown') irPara(Math.round(alvo) + 1);
    else if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') irPara(Math.round(alvo) - 1);
    else if (e.code === 'Enter' || e.code === 'Space') escolherMeio();
    else if (e.code === 'Backspace') subirOuFechar();
    else return;
    e.preventDefault();
    e.stopPropagation();
    focarMeio();
  });
  bVoltar.addEventListener('pointerdown', (e) => e.stopPropagation());
  bVoltar.addEventListener('click', (e) => {
    e.stopPropagation();
    // a abinha nasce no meio (do item escolhido) e voa para o canto: o clique do próprio toque
    // que abriu a lista cairia nela e voltaria na hora
    if (performance.now() - voltarDesde < 450) return;
    subirOuFechar();
  });

  function focarMeio(): void {
    chips[R].b.focus({ preventScroll: true });
  }

  function subirOuFechar(): void {
    if (lista?.aoVoltar) lista.aoVoltar();
    else fechar();
  }

  function escolherMeio(): void {
    escolherNoIndice(modulo(Math.round(alvo), n()));
  }

  function escolherNoIndice(i: number): void {
    const l = lista;
    const it = l?.itens[i];
    if (!l || !it || !aberta) return;
    const c = chips[R];
    c.b.classList.remove('escolhido');
    void c.b.offsetWidth;
    c.b.classList.add('escolhido');
    if (l.manter?.(it.id)) paiPendente = it;
    l.aoEscolher(it.id);
    paiPendente = null;
    if (l.manter?.(it.id) || lista !== l) return;
    clearTimeout(timerEscolha);
    timerEscolha = setTimeout(fechar, 200);
  }
  /** O item que está abrindo uma lista (vira a abinha da lista nova). */
  let paiPendente: ItemRoda | null = null;

  function adiar(): void {
    clearTimeout(timer);
    timer = setTimeout(fechar, (op.fecharEm ?? 8) * 1000);
  }

  /** O que fica embaixo da roleta dá licença (a barrinha, e no toque o joystick e os botões). */
  function licenca(sob: boolean): void {
    for (const a of document.querySelectorAll('.toast-area, .legendas'))
      a.classList.toggle('sob-roda', sob);
    for (const a of document.querySelectorAll(TAPA_ROLETA)) a.classList.toggle('sob-roleta', sob);
  }

  function posicionarVoltar(l: ListaRoda, animarDoMeio: boolean): void {
    const pai = l.aoVoltar ? (l.pai ?? paiDe.get(l) ?? null) : null;
    // dentro de uma lista: "Voltar" com o ícone de onde veio; na de cima: "Fechar"
    (bVoltar.querySelector('.seta') as HTMLElement).innerHTML = pai ? SETA : XIS;
    (bVoltar.querySelector('.pai') as HTMLElement).innerHTML = pai?.icone ?? '';
    (bVoltar.querySelector('.rotulo') as HTMLElement).textContent = pai ? 'Voltar' : 'Fechar';
    bVoltar.setAttribute('aria-label', pai ? `Voltar (${pai.nome})` : 'Fechar');
    bVoltar.setAttribute('data-item', pai ? 'voltar' : 'fechar');
    // em cima da bandeja (pela posição de layout dela, sem a animação de abrir): em pé, no meio
    // (o canto de baixo é do joystick); deitado, no canto esquerdo (o meio é do boneco)
    const emPe = innerHeight > innerWidth;
    const larg = bVoltar.offsetWidth || 150;
    const esq = bandeja.offsetLeft - bandeja.offsetWidth / 2;
    const fimX = emPe ? (innerWidth - larg) / 2 : esq + 10;
    const fimY = bandeja.offsetTop - 66;
    if (animarDoMeio) {
      // nasce do botão escolhido, no meio da fileira, e sobe para o lugar dela
      bVoltar.style.transition = 'none';
      bVoltar.style.transform = `translate(${((innerWidth - larg) / 2).toFixed(1)}px, ${(bandeja.offsetTop + 8).toFixed(1)}px) scale(0.8)`;
      void bVoltar.offsetWidth;
      bVoltar.style.transition = '';
    }
    bVoltar.style.transform = `translate(${fimX.toFixed(1)}px, ${fimY.toFixed(1)}px) scale(1)`;
    if (animarDoMeio || !bVoltar.classList.contains('ativo')) voltarDesde = performance.now();
    bVoltar.classList.add('ativo');
  }

  function abrir(l: ListaRoda, focar = false): void {
    clearTimeout(timerEscolha);
    const focoDentro = el.contains(document.activeElement);
    if (focar && !focoDentro) focoAntes = document.activeElement as HTMLElement | null;
    const entrando = !!paiPendente && aberta;
    if (paiPendente && !paiDe.has(l)) paiDe.set(l, paiPendente);
    if (lista && lista !== l) posDe.set(lista, Math.round(alvo));
    const trocou = lista !== l;
    lista = l;
    if (trocou || !aberta) {
      pos = alvo = posDe.get(l) ?? 0;
      meioAntes = Math.round(pos);
      // a lista nova nasce um pouco de lado e corre para o lugar (a criança vê que mudou)
      if (aberta && trocou) pos = alvo + (entrando ? 1.6 : -1.6);
      for (const c of chips) c.i = Number.NaN;
      // a lista inteira (só 5 a 7 botões existem de cada vez): leitores de tela e testes
      el.dataset.itens = l.itens.map((it) => it.id).join(' ');
      el.dataset.nivel = l.aoVoltar ? 'dentro' : 'topo';
    }
    el.classList.add('aberta');
    el.setAttribute('aria-hidden', 'false');
    desenhar();
    animar();
    posicionarVoltar(l, entrando);
    adiar();
    if (focar || focoDentro) focarMeio();
    if (!aberta) {
      aberta = true;
      licenca(true);
      op.aoMudar?.(true);
      tocarSomInterface('rodaAbrir');
    }
  }

  function fechar(): void {
    clearTimeout(timer);
    const devolver = el.contains(document.activeElement);
    el.classList.remove('aberta');
    el.setAttribute('aria-hidden', 'true');
    bVoltar.classList.remove('ativo');
    if (lista) posDe.set(lista, Math.round(alvo));
    if (devolver) {
      (document.activeElement as HTMLElement | null)?.blur?.();
      if (focoAntes?.isConnected) focoAntes.focus();
    }
    focoAntes = null;
    arrastando = false;
    if (aberta) {
      aberta = false;
      licenca(false);
      op.aoMudar?.(false);
      tocarSomInterface('rodaFechar');
    }
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
    preparar: () => undefined,
    fechar,
    /** Escolhe o item i da lista (as teclas 1 a 9): a fileira corre até ele e ele vale. */
    escolher(i: number) {
      if (!lista || !aberta || i < 0 || i >= n()) return;
      const base = Math.round(alvo);
      const d = modulo(i - modulo(base, n()), n());
      alvo = base + (d > n() / 2 ? d - n() : d);
      pos = alvo;
      desenhar();
      escolherNoIndice(i);
    },
    descartar() {
      clearTimeout(timer);
      clearTimeout(timerEscolha);
      cancelAnimationFrame(quadro);
      el.remove();
    },
  };
}
