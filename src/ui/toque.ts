import { icone, type NomeIcone } from './pixicones';
export const CSS_TOQUE = `
.toque { position: fixed; inset: 0; z-index: 6; pointer-events: none; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
.toque[hidden] { display: none; }
/* a tela toda: arrastar olha, tocar coloca/usa, segurar quebra */
.toque .olhar { position: absolute; inset: 0; pointer-events: auto; }
/* joystick: um poço creme translúcido com a bolinha de peça no meio */
.toque .joystick {
  position: absolute; left: max(18px, env(safe-area-inset-left)); bottom: calc(env(safe-area-inset-bottom, 0px) + 132px); width: 128px; height: 128px; border-radius: 50%;
  background: rgba(255, 250, 240, 0.38); box-shadow: inset 0 4px 0 rgba(120, 80, 30, 0.18), 0 3px 0 rgba(150, 110, 60, 0.3);
  pointer-events: auto; touch-action: none;
}
.toque .pino {
  position: absolute; left: 50%; top: 50%; width: 54px; height: 54px; margin: -27px; border-radius: 50%;
  background: radial-gradient(circle at 38% 32%, #fff, var(--creme) 55%, #f1e0c0);
  box-shadow: 0 4px 0 var(--creme-fundo), 0 8px 12px rgba(60, 35, 10, 0.3);
}
.toque .botoes { position: absolute; right: max(14px, env(safe-area-inset-right)); bottom: calc(env(safe-area-inset-bottom, 0px) + 124px); display: grid; grid-template-columns: repeat(2, 68px); grid-template-rows: 68px 68px; gap: 10px; pointer-events: none; }
.toque .botoes button { pointer-events: auto; }
.toque .botoes .descer { grid-column: 2; grid-row: 1; }
.toque .botoes .correr { grid-column: 1; grid-row: 2; }
.toque .botoes .pular { grid-column: 2; grid-row: 2; }
.toque .botoes .descer[hidden] { display: none; }
.toque .topo { position: absolute; top: calc(env(safe-area-inset-top, 0px) + 156px); right: max(10px, env(safe-area-inset-right)); display: grid; gap: 10px; pointer-events: auto; }
.toque .mais { position: relative; }
.toque .extras { position: absolute; top: 0; right: calc(100% + 8px); display: flex; flex-direction: row-reverse; gap: 8px; }
.toque .extras[hidden] { display: none; }
/* cada botão é uma peça redonda creme, meio transparente para não tampar o mundo */
.toque button {
  width: 68px; height: 68px; border-radius: 50%; border: 0; padding: 0;
  background: radial-gradient(circle at 40% 30%, rgba(255, 255, 255, 0.92), rgba(255, 246, 228, 0.8) 60%, rgba(240, 222, 190, 0.8));
  box-shadow: 0 4px 0 rgba(200, 170, 120, 0.85), 0 8px 14px rgba(60, 35, 10, 0.25), inset 0 2px 0 rgba(255, 255, 255, 0.8);
  color: var(--tinta); font-size: 1.7rem; touch-action: none;
  display: grid; place-items: center; transition: transform 0.06s, box-shadow 0.06s;
}
.toque button:active { transform: translateY(3px); box-shadow: 0 1px 0 rgba(200, 170, 120, 0.85), 0 3px 6px rgba(60, 35, 10, 0.25); }
.toque .topo button { width: 46px; height: 46px; font-size: 1.1rem; box-shadow: 0 3px 0 rgba(200, 170, 120, 0.85), 0 6px 10px rgba(60, 35, 10, 0.22), inset 0 2px 0 rgba(255, 255, 255, 0.8); }
/* paisagem baixa (ex.: 844x390): ícones em linha no alto, joystick e botões nos cantos de baixo */
@media (orientation: landscape) and (max-height: 500px) {
  .toque .joystick { bottom: max(10px, env(safe-area-inset-bottom)); left: max(14px, env(safe-area-inset-left)); width: 112px; height: 112px; }
  .toque .pino { width: 46px; height: 46px; margin: -23px; }
  .toque .botoes { bottom: max(10px, env(safe-area-inset-bottom)); right: max(10px, env(safe-area-inset-right)); grid-template-columns: repeat(2, 56px); grid-template-rows: 56px 56px; gap: 8px; }
  .toque .botoes button { width: 56px; height: 56px; font-size: 1.4rem; }
  .toque .topo { top: max(6px, env(safe-area-inset-top)); grid-auto-flow: column; gap: 8px; }
  .toque .topo button { width: 44px; height: 44px; }
  .toque .extras { top: calc(100% + 8px); right: 0; flex-direction: column; gap: 8px; }
}
.toque button.ativo {
  background: radial-gradient(circle at 40% 30%, #ffe9a8, var(--amarela) 60%, #f5b42e);
  box-shadow: 0 4px 0 var(--amarela-fundo), 0 8px 14px rgba(60, 35, 10, 0.25), inset 0 2px 0 rgba(255, 255, 255, 0.6);
}
/* anel de progresso ao segurar para quebrar */
.toque .anel {
  position: absolute; width: 56px; height: 56px; margin: -28px 0 0 -28px; border-radius: 50%;
  border: 4px solid rgba(255, 255, 255, 0.95); box-shadow: 0 0 0 2px rgba(217, 134, 26, 0.6), 0 3px 8px rgba(40, 25, 10, 0.3);
  pointer-events: none; opacity: 0; transform: scale(0.6); transition: opacity 0.12s, transform 0.25s;
}
.toque .anel.visivel { opacity: 1; transform: scale(1); }
.legendas { position: fixed; left: 12px; bottom: 120px; z-index: 9; display: grid; gap: 4px; pointer-events: none; }
/* no toque o canto de baixo é do joystick: legendas no centro, acima da mira */
body.toque-ativo .legendas { left: 50%; bottom: auto; top: 30%; transform: translateX(-50%); justify-items: center; }
.legendas div {
  padding: 5px 14px; border-radius: 999px; background: rgba(255, 250, 240, 0.94); color: var(--tinta);
  font: 800 0.9rem var(--jogo); box-shadow: 0 2px 0 rgba(150, 110, 60, 0.3); animation: toast 3.2s ease forwards;
}
/* no toque a mira some: aponta-se com o dedo */
body.toque-ativo .hud .mira { display: none; }
`;

let semZoom = false;
/** Margem das bordas laterais onde o deslize vira "voltar/avançar" no Android (px). */
export const MARGEM_BORDA = 24;

/** Alvo onde o usuário digita/seleciona texto (gestos do navegador continuam valendo). */
export function ehEditavel(alvo: EventTarget | null): boolean {
  return (
    alvo instanceof Element &&
    !!alvo.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')
  );
}

/** Toque perto da borda lateral (deslize de voltar/avançar do navegador). */
export function tocouNaBorda(x: number, largura: number, margem = MARGEM_BORDA): boolean {
  return x < margem || x > largura - margem;
}

/**
 * Desliga gestos do navegador que atrapalham o jogo no toque:
 * zoom por pinça (iOS), menu de contexto/callout do toque longo (segurar para quebrar),
 * seleção de texto/lupa e o deslize de voltar pela borda (Android, só sem painel aberto).
 * Rolagem dentro dos painéis e digitação em campos continuam funcionando.
 */
export function bloquearZoomDoNavegador(): void {
  if (semZoom) return;
  semZoom = true;
  for (const g of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(g, (e) => e.preventDefault(), { passive: false });
  }
  // toque longo: sem "salvar imagem/recarregar" (vale também em tablet com pointer: fine)
  document.addEventListener('contextmenu', (e) => {
    if (!ehEditavel(e.target)) e.preventDefault();
  });
  document.addEventListener('selectstart', (e) => {
    if (!ehEditavel(e.target)) e.preventDefault();
  });
  window.addEventListener(
    'touchstart',
    (e) => {
      if (!e.cancelable || document.body.dataset.overlay) return;
      if (document.querySelector('.entrada:not([hidden])')) return;
      const t = e.touches[0];
      if (t && tocouNaBorda(t.clientX, window.innerWidth) && !ehEditavel(e.target)) {
        e.preventDefault();
      }
    },
    { passive: false },
  );
}

export interface ControleToque {
  olhar(dx: number, dy: number): void;
  mover(frente: number, direita: number): void;
  tecla(acao: 'pular' | 'correr' | 'rapido', ativo: boolean): void;
  quebrar(ativo: boolean): void;
  usar(): void;
  teclaDom(code: string): void;
  /** Aponta para o ponto tocado (coordenadas do canvas, em CSS). */
  mirar?(x: number, y: number): void;
  soltarMira?(): void;
  /** Pinça na tela: multiplica a distância da câmera (> 1 afasta, < 1 aproxima). */
  zoom?(fator: number): void;
  /** Dedo arrastando a câmera (true) ou soltou (false): ela não gira sozinha enquanto isso. */
  arrastar?(ativo: boolean): void;
  /** Toque rápido: ataca a criatura ou coloca/usa no ponto mirado. */
  tocar?(): void;
  voando?(): boolean;
}

/** Tempo segurando parado para começar a quebrar (ms) e folga de movimento (px). */
export const TEMPO_SEGURAR = 300;
export const FOLGA_TOQUE = 12;

export type GestoTela = 'toque' | 'segurar' | 'arrastar';

/** Classifica o gesto: parado e rápido = toque; parado e demorado = segurar; mexeu = arrastar. */
export function classificarGesto(duracaoMs: number, deslocamentoPx: number): GestoTela {
  if (deslocamentoPx > FOLGA_TOQUE) return 'arrastar';
  return duracaoMs >= TEMPO_SEGURAR ? 'segurar' : 'toque';
}

/** Controles de toque: joystick à esquerda, arrastar à direita para olhar e botões de ação. */
export function criarToque(raiz: HTMLElement, c: ControleToque) {
  const el = document.createElement('div');
  el.className = 'toque';
  el.hidden = true;
  el.setAttribute('data-toque', '');
  const olhar = document.createElement('div');
  olhar.className = 'olhar';
  const joy = document.createElement('div');
  joy.className = 'joystick';
  const pino = document.createElement('div');
  pino.className = 'pino';
  joy.appendChild(pino);
  const botoes = document.createElement('div');
  botoes.className = 'botoes';
  const topo = document.createElement('div');
  topo.className = 'topo';
  el.append(olhar, joy, botoes, topo);
  raiz.appendChild(el);
  // Toques nos controles nunca viram zoom, seleção ou rolagem do navegador.
  for (const tipo of ['touchstart', 'touchend', 'touchmove', 'dblclick'] as const) {
    el.addEventListener(tipo, (e) => e.cancelable && e.preventDefault(), { passive: false });
  }

  const segurar = (rotulo: NomeIcone, titulo: string, inicio: () => void, fim: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.appendChild(icone(rotulo));
    b.setAttribute('aria-label', titulo);
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      b.classList.add('ativo');
      inicio();
    });
    const soltar = () => {
      b.classList.remove('ativo');
      fim();
    };
    b.addEventListener('pointerup', soltar);
    b.addEventListener('pointercancel', soltar);
    b.addEventListener('pointerleave', soltar);
    return b;
  };
  // correr: interruptor (um toque liga, outro desliga)
  let correndo = false;
  const bCorrer = document.createElement('button');
  bCorrer.type = 'button';
  bCorrer.className = 'correr';
  bCorrer.setAttribute('aria-label', 'Correr');
  bCorrer.setAttribute('aria-pressed', 'false');
  bCorrer.appendChild(icone('correr'));
  bCorrer.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    correndo = !correndo;
    bCorrer.classList.toggle('ativo', correndo);
    bCorrer.setAttribute('aria-pressed', String(correndo));
    c.tecla('rapido', correndo);
  });
  // teclado (Enter/Espaço no botão focado): o click vem com detail 0
  bCorrer.addEventListener('click', (e) => {
    if (e.detail !== 0) return;
    correndo = !correndo;
    bCorrer.classList.toggle('ativo', correndo);
    bCorrer.setAttribute('aria-pressed', String(correndo));
    c.tecla('rapido', correndo);
  });
  // pular: segurar; dois toques no criativo ligam/desligam o voo
  const bPular = segurar(
    'pular',
    'Pular (dois toques: voar)',
    () => c.tecla('pular', true),
    () => c.tecla('pular', false),
  );
  bPular.classList.add('pular');
  // descer: só aparece voando
  const bDescer = segurar(
    'descer',
    'Descer',
    () => c.tecla('correr', true),
    () => c.tecla('correr', false),
  );
  bDescer.classList.add('descer');
  bDescer.hidden = true;
  botoes.append(bDescer, bCorrer, bPular);
  // o botão descer acompanha o voo; o laço só roda com os controles visíveis
  let vooRodando = false;
  const atualizarVoo = () => {
    if (el.hidden) {
      vooRodando = false;
      return;
    }
    const voando = !!c.voando?.();
    if (bDescer.hidden === voando) bDescer.hidden = !voando;
    requestAnimationFrame(atualizarVoo);
  };
  const ligarVoo = () => {
    if (vooRodando) return;
    vooRodando = true;
    requestAnimationFrame(atualizarVoo);
  };
  const anel = document.createElement('div');
  anel.className = 'anel';
  el.appendChild(anel);

  // spec 015 (opção C do menu): os atalhos da direita (mochila, mapa, pausa e "+") saíram;
  // a mochila fica embaixo do minimapa e o resto na roda do botão de cima (src/ui/menuRoda.ts)

  // joystick
  let joyId: number | null = null;
  const moverJoy = (e: PointerEvent) => {
    const r = joy.getBoundingClientRect();
    let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const n = Math.hypot(dx, dy);
    if (n > 1) {
      dx /= n;
      dy /= n;
    }
    pino.style.transform = `translate(${dx * 36}px, ${dy * 36}px)`;
    c.mover(-dy, dx);
  };
  joy.addEventListener('pointerdown', (e) => {
    joyId = e.pointerId;
    joy.setPointerCapture(e.pointerId);
    moverJoy(e);
  });
  joy.addEventListener('pointermove', (e) => e.pointerId === joyId && moverJoy(e));
  const soltarJoy = () => {
    joyId = null;
    pino.style.transform = '';
    c.mover(0, 0);
  };
  joy.addEventListener('pointerup', soltarJoy);
  joy.addEventListener('pointercancel', soltarJoy);
  joy.addEventListener('lostpointercapture', (e) => e.pointerId === joyId && soltarJoy());

  // Tela: arrastar olha; tocar coloca/usa no ponto; segurar parado quebra no ponto.
  let gesto: {
    id: number;
    x0: number;
    y0: number;
    x: number;
    y: number;
    t0: number;
    modo: 'indefinido' | 'arrastar' | 'segurar';
    timer: number;
  } | null = null;
  const pontoCanvas = (x: number, y: number) => {
    const cv = document.getElementById('cena');
    const r = cv?.getBoundingClientRect();
    return r ? { x: x - r.left, y: y - r.top } : { x, y };
  };
  const mostrarAnel = (x: number, y: number, v: boolean) => {
    anel.style.left = `${x}px`;
    anel.style.top = `${y}px`;
    anel.classList.toggle('visivel', v);
  };
  /** Pinça (dois dedos na tela): aproxima e afasta a câmera; nada de quebrar nem colocar. */
  let pinca: { dedos: Map<number, { x: number; y: number }>; dist: number } | null = null;
  const distPinca = (p: { dedos: Map<number, { x: number; y: number }> }) => {
    const [a, b] = [...p.dedos.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  olhar.addEventListener('pointerdown', (e) => {
    if (pinca) return;
    if (gesto) {
      // segundo dedo: vira pinça (cancela o toque, o segurar e o arrastar do primeiro)
      const g = gesto;
      soltarGesto();
      try {
        olhar.setPointerCapture(e.pointerId);
      } catch {
        // ponteiro já liberado: segue sem captura
      }
      pinca = {
        dedos: new Map([
          [g.id, { x: g.x, y: g.y }],
          [e.pointerId, { x: e.clientX, y: e.clientY }],
        ]),
        dist: 0,
      };
      pinca.dist = distPinca(pinca);
      return;
    }
    try {
      olhar.setPointerCapture(e.pointerId);
    } catch {
      // ponteiro já liberado: segue sem captura
    }
    const g = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      x: e.clientX,
      y: e.clientY,
      t0: performance.now(),
      modo: 'indefinido' as 'indefinido' | 'arrastar' | 'segurar',
      timer: 0,
    };
    g.timer = window.setTimeout(() => {
      if (gesto !== g || g.modo !== 'indefinido') return;
      // segurou parado: quebra no ponto tocado até soltar
      g.modo = 'segurar';
      const p = pontoCanvas(g.x, g.y);
      c.mirar?.(p.x, p.y);
      c.quebrar(true);
      mostrarAnel(g.x, g.y, true);
    }, TEMPO_SEGURAR);
    gesto = g;
  });
  olhar.addEventListener('pointermove', (e) => {
    if (pinca) {
      const d = pinca.dedos.get(e.pointerId);
      if (!d) return;
      d.x = e.clientX;
      d.y = e.clientY;
      const agora = distPinca(pinca);
      // abrir os dedos aproxima (a distância da câmera diminui), fechar afasta
      if (agora > 8 && pinca.dist > 8) c.zoom?.(pinca.dist / agora);
      pinca.dist = agora;
      return;
    }
    const g = gesto;
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    g.x = e.clientX;
    g.y = e.clientY;
    if (g.modo === 'segurar') {
      // segurando: o dedo arrasta a mira (quebra o que estiver embaixo dele)
      const p = pontoCanvas(g.x, g.y);
      c.mirar?.(p.x, p.y);
      mostrarAnel(g.x, g.y, true);
      return;
    }
    if (g.modo === 'indefinido') {
      const desloc = Math.hypot(g.x - g.x0, g.y - g.y0);
      if (classificarGesto(0, desloc) !== 'arrastar') return;
      g.modo = 'arrastar';
      clearTimeout(g.timer);
      c.arrastar?.(true);
    }
    c.olhar(dx * 2.2, dy * 2.2);
  });
  const terminar = (e: PointerEvent) => {
    if (pinca) {
      // a pinça acaba quando um dos dedos sai; o outro só volta a valer depois de soltar
      if (pinca.dedos.delete(e.pointerId) && pinca.dedos.size < 2) pinca.dist = 0;
      if (pinca.dedos.size === 0) pinca = null;
      return;
    }
    const g = gesto;
    if (!g || e.pointerId !== g.id) return;
    clearTimeout(g.timer);
    gesto = null;
    if (g.modo === 'arrastar') c.arrastar?.(false);
    if (g.modo === 'segurar') {
      c.quebrar(false);
      c.soltarMira?.();
      mostrarAnel(0, 0, false);
      return;
    }
    if (g.modo === 'indefinido' && e.type === 'pointerup') {
      const tipo = classificarGesto(performance.now() - g.t0, Math.hypot(g.x - g.x0, g.y - g.y0));
      if (tipo === 'toque') {
        const p = pontoCanvas(g.x, g.y);
        c.mirar?.(p.x, p.y);
        if (c.tocar) c.tocar();
        else c.usar();
        c.soltarMira?.();
      }
    }
  };
  olhar.addEventListener('pointerup', terminar);
  olhar.addEventListener('pointercancel', terminar);
  // perdeu o dedo sem pointerup (sistema tomou o gesto, aba trocou): solta o que estava preso
  olhar.addEventListener('lostpointercapture', (e) => {
    if (pinca?.dedos.delete(e.pointerId) && pinca.dedos.size === 0) pinca = null;
    if (gesto && e.pointerId === gesto.id) soltarGesto();
  });

  /** Encerra o gesto da tela sem agir (sem colocar nem usar). */
  function soltarGesto(): void {
    const g = gesto;
    gesto = null;
    if (g) clearTimeout(g.timer);
    if (g?.modo === 'arrastar') c.arrastar?.(false);
    c.quebrar(false);
    c.soltarMira?.();
    mostrarAnel(0, 0, false);
  }
  /** Solta tudo o que pode estar segurado: joystick, quebrar, pular e descer. */
  function soltarTudo(): void {
    soltarGesto();
    pinca = null;
    if (joyId !== null || pino.style.transform) soltarJoy();
    for (const b of [bPular, bDescer]) b.classList.remove('ativo');
    c.tecla('pular', false);
    c.tecla('correr', false);
  }
  window.addEventListener('blur', () => !el.hidden && soltarTudo());

  return {
    /**
     * Mostra/esconde os controles. `modo` marca o corpo com .toque-ativo (jogando por toque),
     * mesmo com os controles escondidos por um painel aberto.
     */
    mostrar(v: boolean, modo = v) {
      document.body.classList.toggle('toque-ativo', modo);
      if (el.hidden === !v) return;
      el.hidden = !v;
      if (v) ligarVoo();
      else soltarTudo();
    },
    soltarTudo,
  };
}

/** Gamepad: analógicos andam e olham; gatilhos quebram e usam; ombros trocam o slot. */
export function ligarGamepad(c: ControleToque, slot: (passo: number) => void) {
  const antes: boolean[] = [];
  let quebrando = false;
  // só faz polling enquanto houver controle conectado
  let ativo = false;
  function quadro(): void {
    if (!ativo) return;
    const g = navigator.getGamepads?.().find((x) => !!x);
    if (g) {
      const zona = (v: number) => (Math.abs(v) < 0.18 ? 0 : v);
      c.mover(-zona(g.axes[1] ?? 0), zona(g.axes[0] ?? 0));
      c.olhar(zona(g.axes[2] ?? 0) * 14, zona(g.axes[3] ?? 0) * 14);
      const b = (i: number) => !!g.buttons[i]?.pressed;
      const apertou = (i: number) => b(i) && !antes[i];
      c.tecla('pular', b(0));
      c.tecla('correr', b(10) || b(1));
      if (b(7) !== quebrando) {
        quebrando = b(7);
        c.quebrar(quebrando);
      }
      if (apertou(6)) c.usar();
      if (apertou(4)) slot(-1);
      if (apertou(5)) slot(1);
      if (apertou(2)) c.teclaDom('KeyE');
      if (apertou(8)) c.teclaDom('Tab');
      if (apertou(9)) c.teclaDom('Pausa');
      for (let i = 0; i < g.buttons.length; i++) antes[i] = b(i);
    }
    requestAnimationFrame(quadro);
  }
  window.addEventListener('gamepadconnected', () => {
    if (ativo) return;
    ativo = true;
    requestAnimationFrame(quadro);
  });
  window.addEventListener('gamepaddisconnected', () => {
    ativo = !!navigator.getGamepads?.().some((x) => !!x);
  });
  if (navigator.getGamepads?.().some((x) => !!x)) {
    ativo = true;
    requestAnimationFrame(quadro);
  }
}

/** Legendas de sons importantes (acessibilidade). */
export function criarLegendas(raiz: HTMLElement) {
  const el = document.createElement('div');
  el.className = 'legendas';
  el.setAttribute('aria-live', 'polite');
  raiz.appendChild(el);
  let ativo = false;
  return {
    definir(v: boolean) {
      ativo = v;
    },
    mostrar(texto: string) {
      if (!ativo) return;
      const d = document.createElement('div');
      d.textContent = texto;
      el.appendChild(d);
      setTimeout(() => d.remove(), 3200);
      while (el.children.length > 4) el.firstElementChild?.remove();
    },
  };
}
