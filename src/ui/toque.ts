import { icone, type NomeIcone } from './pixicones';
export const CSS_TOQUE = `
.toque { position: fixed; inset: 0; z-index: 6; pointer-events: none; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
.toque[hidden] { display: none; }
/* a tela toda: arrastar olha, tocar coloca/usa, segurar quebra */
.toque .olhar { position: absolute; inset: 0; pointer-events: auto; }
.toque .joystick {
  position: absolute; left: max(18px, env(safe-area-inset-left)); bottom: 110px; width: 128px; height: 128px; border-radius: 50%;
  background: rgba(10, 12, 20, 0.35); border: 2px solid rgba(255,255,255,0.25); pointer-events: auto; touch-action: none;
}
.toque .pino { position: absolute; left: 50%; top: 50%; width: 54px; height: 54px; margin: -27px; border-radius: 50%; background: rgba(255,255,255,0.4); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
.toque .botoes { position: absolute; right: max(14px, env(safe-area-inset-right)); bottom: 100px; display: grid; grid-template-columns: repeat(2, 68px); grid-template-rows: 68px 68px; gap: 10px; pointer-events: none; }
.toque .botoes button { pointer-events: auto; }
.toque .botoes .descer { grid-column: 2; grid-row: 1; }
.toque .botoes .correr { grid-column: 1; grid-row: 2; }
.toque .botoes .pular { grid-column: 2; grid-row: 2; }
.toque .botoes .descer[hidden] { display: none; }
.toque .topo { position: absolute; top: 156px; right: 10px; display: grid; gap: 8px; pointer-events: auto; }
.toque button {
  width: 68px; height: 68px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3);
  background: rgba(10, 12, 20, 0.45); color: #fff; font-size: 1.7rem; touch-action: none;
  display: grid; place-items: center; padding: 0;
}
.toque .topo button { width: 46px; height: 46px; font-size: 1.1rem; }
.toque button.ativo { background: rgba(255, 217, 143, 0.45); border-color: #ffd98f; color: #fff7dc; }
/* anel de progresso ao segurar para quebrar */
.toque .anel {
  position: absolute; width: 56px; height: 56px; margin: -28px 0 0 -28px; border-radius: 50%;
  border: 3px solid rgba(255, 241, 214, 0.9); box-shadow: 0 0 10px rgba(0,0,0,0.4);
  pointer-events: none; opacity: 0; transform: scale(0.6); transition: opacity 0.12s, transform 0.25s;
}
.toque .anel.visivel { opacity: 1; transform: scale(1); }
.legendas { position: fixed; left: 12px; bottom: 120px; z-index: 9; display: grid; gap: 4px; pointer-events: none; }
.legendas div { padding: 4px 10px; border-radius: 6px; background: rgba(0,0,0,0.72); color: #fff; font: 600 0.9rem system-ui, sans-serif; animation: toast 3.2s ease forwards; }
/* no toque a mira some: aponta-se com o dedo */
body.toque-ativo .hud .mira { display: none; }
`;

let semZoom = false;
/** iOS ignora user-scalable=no: bloqueia o zoom por pinça (o toque duplo sai via touch-action). */
export function bloquearZoomDoNavegador(): void {
  if (semZoom) return;
  semZoom = true;
  for (const g of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(g, (e) => e.preventDefault(), { passive: false });
  }
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
  const atualizarVoo = () => {
    const voando = !!c.voando?.();
    if (bDescer.hidden === voando) bDescer.hidden = !voando;
    requestAnimationFrame(atualizarVoo);
  };
  requestAnimationFrame(atualizarVoo);
  const anel = document.createElement('div');
  anel.className = 'anel';
  el.appendChild(anel);

  topo.append(
    segurar(
      'mochila',
      'Inventário',
      () => c.teclaDom('KeyE'),
      () => undefined,
    ),
    segurar(
      'olho',
      'Câmera',
      () => c.teclaDom('KeyV'),
      () => undefined,
    ),
    segurar(
      'mapa',
      'Mapa',
      () => c.teclaDom('Tab'),
      () => undefined,
    ),
    segurar(
      'pausa',
      'Pausa',
      () => c.teclaDom('Pausa'),
      () => undefined,
    ),
  );

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
  olhar.addEventListener('pointerdown', (e) => {
    if (gesto) return; // um dedo por vez na tela
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
    }
    c.olhar(dx * 2.2, dy * 2.2);
  });
  const terminar = (e: PointerEvent) => {
    const g = gesto;
    if (!g || e.pointerId !== g.id) return;
    clearTimeout(g.timer);
    gesto = null;
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

  return {
    mostrar(v: boolean) {
      el.hidden = !v;
      document.body.classList.toggle('toque-ativo', v);
    },
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
      if (apertou(3)) c.teclaDom('KeyV');
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
