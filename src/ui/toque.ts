export const CSS_TOQUE = `
.toque { position: fixed; inset: 0; z-index: 6; pointer-events: none; touch-action: none; user-select: none; -webkit-user-select: none; }
.toque[hidden] { display: none; }
.toque .olhar { position: absolute; top: 0; right: 0; bottom: 0; left: 40%; pointer-events: auto; }
.toque .joystick {
  position: absolute; left: max(18px, env(safe-area-inset-left)); bottom: 110px; width: 128px; height: 128px; border-radius: 50%;
  background: rgba(10, 12, 20, 0.35); border: 2px solid rgba(255,255,255,0.25); pointer-events: auto; touch-action: none;
}
.toque .pino { position: absolute; left: 50%; top: 50%; width: 54px; height: 54px; margin: -27px; border-radius: 50%; background: rgba(255,255,255,0.4); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
.toque .botoes { position: absolute; right: max(14px, env(safe-area-inset-right)); bottom: 100px; display: grid; grid-template-columns: repeat(2, 64px); gap: 10px; pointer-events: auto; }
.toque .topo { position: absolute; top: 156px; right: 10px; display: grid; gap: 8px; pointer-events: auto; }
.toque button {
  width: 64px; height: 64px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3);
  background: rgba(10, 12, 20, 0.45); color: #fff; font-size: 1.5rem; touch-action: none;
}
.toque .topo button { width: 46px; height: 46px; font-size: 1.1rem; }
.toque button.ativo { background: rgba(255, 217, 143, 0.4); }
.legendas { position: fixed; left: 12px; bottom: 120px; z-index: 9; display: grid; gap: 4px; pointer-events: none; }
.legendas div { padding: 4px 10px; border-radius: 6px; background: rgba(0,0,0,0.72); color: #fff; font: 600 0.9rem system-ui, sans-serif; animation: toast 3.2s ease forwards; }
`;

export interface ControleToque {
  olhar(dx: number, dy: number): void;
  mover(frente: number, direita: number): void;
  tecla(acao: 'pular' | 'correr' | 'rapido', ativo: boolean): void;
  quebrar(ativo: boolean): void;
  usar(): void;
  teclaDom(code: string): void;
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

  const segurar = (rotulo: string, titulo: string, inicio: () => void, fim: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = rotulo;
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
  botoes.append(
    segurar(
      '✋',
      'Usar ou colocar',
      () => c.usar(),
      () => undefined,
    ),
    segurar(
      '⛏',
      'Quebrar',
      () => c.quebrar(true),
      () => c.quebrar(false),
    ),
    segurar(
      '🏃',
      'Correr',
      () => c.tecla('correr', true),
      () => c.tecla('correr', false),
    ),
    segurar(
      '⬆',
      'Pular',
      () => c.tecla('pular', true),
      () => c.tecla('pular', false),
    ),
  );
  topo.append(
    segurar(
      '🎒',
      'Inventário',
      () => c.teclaDom('KeyE'),
      () => undefined,
    ),
    segurar(
      '🎥',
      'Câmera',
      () => c.teclaDom('KeyV'),
      () => undefined,
    ),
    segurar(
      '🗺',
      'Mapa',
      () => c.teclaDom('Tab'),
      () => undefined,
    ),
    segurar(
      '⏸',
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

  // arrastar para olhar
  let ultimo: { id: number; x: number; y: number } | null = null;
  olhar.addEventListener('pointerdown', (e) => {
    ultimo = { id: e.pointerId, x: e.clientX, y: e.clientY };
    olhar.setPointerCapture(e.pointerId);
  });
  olhar.addEventListener('pointermove', (e) => {
    if (!ultimo || e.pointerId !== ultimo.id) return;
    c.olhar((e.clientX - ultimo.x) * 2.2, (e.clientY - ultimo.y) * 2.2);
    ultimo = { id: e.pointerId, x: e.clientX, y: e.clientY };
  });
  olhar.addEventListener('pointerup', () => (ultimo = null));

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
  function quadro(): void {
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
  requestAnimationFrame(quadro);
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
