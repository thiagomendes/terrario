import { rotuloComIcone, type NomeIcone } from './pixicones';
export const CSS_FOTO = `
body.modo-foto .hud, body.modo-foto .barra, body.modo-foto .nome-item, body.modo-foto .status,
body.modo-foto .painel-construcao, body.modo-foto .toast-area, body.modo-foto .minimapa { display: none !important; }
.painel-foto {
  position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%); z-index: 30;
  display: flex; flex-wrap: wrap; gap: 10px 14px; align-items: center; justify-content: center;
  max-width: calc(100vw - 24px); padding: 12px 16px 10px; box-sizing: border-box; border-radius: 22px;
  background: rgba(255, 250, 240, 0.94); color: var(--tinta); font: 800 0.84rem var(--jogo);
  box-shadow: 0 6px 0 var(--painel-borda), 0 14px 26px rgba(40, 25, 10, 0.3);
}
.painel-foto[hidden] { display: none; }
.painel-foto label { display: grid; gap: 2px; }
.painel-foto input[type='range'] { width: 110px; accent-color: var(--amarela-fundo); }
.grade-foto { position: fixed; inset: 0; pointer-events: none; z-index: 29;
  background:
    linear-gradient(to right, transparent calc(33.33% - 0.5px), rgba(255,255,255,0.35) 33.33%, transparent calc(33.33% + 0.5px), transparent calc(66.66% - 0.5px), rgba(255,255,255,0.35) 66.66%, transparent calc(66.66% + 0.5px)),
    linear-gradient(to bottom, transparent calc(33.33% - 0.5px), rgba(255,255,255,0.35) 33.33%, transparent calc(33.33% + 0.5px), transparent calc(66.66% - 0.5px), rgba(255,255,255,0.35) 66.66%, transparent calc(66.66% + 0.5px));
}
.grade-foto[hidden] { display: none; }
.moldura-foto { position: fixed; inset: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 29; }
.moldura-foto[hidden] { display: none; }
.flash-foto { position: fixed; inset: 0; z-index: 60; background: #fff; opacity: 0; pointer-events: none; transition: opacity 0.4s ease; }
`;

export const FILTROS = ['natural', 'quente', 'frio', 'pb', 'sepia', 'sonho'] as const;
export type Filtro = (typeof FILTROS)[number];
const NOMES: Record<Filtro, string> = {
  natural: 'Natural',
  quente: 'Quente',
  frio: 'Frio',
  pb: 'Preto e branco',
  sepia: 'Sépia',
  sonho: 'Sonho',
};

/**
 * Spec 023 (T09): a moldura de flores, presente do nível 5. Uma faixa creme com a guirlanda de
 * florzinhas em volta e os buquês nos cantos. A mesma conta desenha a moldura na tela (por cima
 * do jogo, no modo foto) e na foto salva.
 */
export function desenharMoldura(c: CanvasRenderingContext2D, w: number, h: number): void {
  const t = Math.max(10, Math.min(w, h) * 0.04);
  const r = t * 1.6;
  c.save();
  // a faixa creme com a borda de dentro arredondada
  c.beginPath();
  c.rect(0, 0, w, h);
  c.moveTo(t + r, t);
  c.arcTo(w - t, t, w - t, h - t, r);
  c.arcTo(w - t, h - t, t, h - t, r);
  c.arcTo(t, h - t, t, t, r);
  c.arcTo(t, t, w - t, t, r);
  c.closePath();
  c.fillStyle = 'rgba(255, 248, 236, 0.96)';
  c.fill('evenodd');
  c.strokeStyle = 'rgba(255, 186, 214, 0.9)';
  c.lineWidth = Math.max(2, t * 0.12);
  c.beginPath();
  c.roundRect(t, t, w - 2 * t, h - 2 * t, r);
  c.stroke();
  const cores = ['#ff7ab8', '#ffd45a', '#b48cff', '#ffffff', '#5cc8ff', '#ff9a5c'];
  const flor = (x: number, y: number, raio: number, cor: string, giro: number) => {
    c.fillStyle = cor;
    c.strokeStyle = 'rgba(160, 90, 120, 0.35)';
    c.lineWidth = Math.max(1, raio * 0.12);
    for (let i = 0; i < 5; i++) {
      const a = giro + (i / 5) * Math.PI * 2;
      c.beginPath();
      c.ellipse(x + Math.cos(a) * raio * 0.62, y + Math.sin(a) * raio * 0.62, raio * 0.52, raio * 0.4, a, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
    c.fillStyle = '#ffc93d';
    c.beginPath();
    c.arc(x, y, raio * 0.36, 0, Math.PI * 2);
    c.fill();
  };
  const folha = (x: number, y: number, raio: number, a: number) => {
    c.fillStyle = '#6fcf6a';
    c.beginPath();
    c.ellipse(x, y, raio * 0.7, raio * 0.3, a, 0, Math.PI * 2);
    c.fill();
  };
  // a guirlanda em volta, no meio da faixa
  const passo = t * 2.3;
  let k = 0;
  const lado = (x0: number, y0: number, x1: number, y1: number) => {
    const comp = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.floor(comp / passo));
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const y = y0 + ((y1 - y0) * i) / n;
      if (i % 2) folha(x, y, t * 0.6, Math.atan2(y1 - y0, x1 - x0) + 0.6);
      else flor(x, y, t * 0.42, cores[k++ % cores.length], k);
    }
  };
  const m = t / 2;
  lado(m + r, m, w - m - r, m);
  lado(w - m, m + r, w - m, h - m - r);
  lado(w - m - r, h - m, m + r, h - m);
  lado(m, h - m - r, m, m + r);
  // os buquês dos cantos
  for (const [x, y] of [
    [m * 1.4, m * 1.4],
    [w - m * 1.4, m * 1.4],
    [w - m * 1.4, h - m * 1.4],
    [m * 1.4, h - m * 1.4],
  ]) {
    folha(x - t * 0.7, y + t * 0.2, t, -0.4);
    folha(x + t * 0.7, y - t * 0.2, t, 0.5);
    flor(x, y, t * 0.85, '#ff7ab8', 0.3);
    flor(x + t * 0.75, y + t * 0.55, t * 0.5, '#ffffff', 1);
    flor(x - t * 0.6, y - t * 0.6, t * 0.45, '#b48cff', 2);
  }
  c.restore();
}

export interface AcoesFoto {
  filtro(f: Filtro): void;
  desfoque(v: number): void;
  fov(graus: number): void;
  hora(h: number): void;
  /** `moldura`: a foto sai com a moldura de flores (presente do nível 5). */
  capturar(moldura: boolean): void;
  /** Spec 023: a criança já ganhou a moldura de flores? */
  temMoldura?(): boolean;
  /** Câmera de frente para o boneco. */
  selfie(): void;
  sair(): void;
}

export function criarPainelFoto(raiz: HTMLElement, acoes: AcoesFoto) {
  const painel = document.createElement('div');
  painel.className = 'painel-foto';
  painel.hidden = true;
  painel.setAttribute('data-painel-foto', '');
  const grade = document.createElement('div');
  grade.className = 'grade-foto';
  grade.hidden = true;
  const flash = document.createElement('div');
  flash.className = 'flash-foto';
  // spec 023 (T09): a moldura de flores, na tela e na foto
  const moldura = document.createElement('canvas');
  moldura.className = 'moldura-foto';
  moldura.hidden = true;
  let comMoldura = false;
  const desenharNaTela = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    moldura.width = Math.round(innerWidth * dpr);
    moldura.height = Math.round(innerHeight * dpr);
    const c = moldura.getContext('2d');
    if (!c) return;
    c.clearRect(0, 0, moldura.width, moldura.height);
    desenharMoldura(c, moldura.width, moldura.height);
  };
  window.addEventListener('resize', () => {
    if (!moldura.hidden) desenharNaTela();
  });
  const botao = (t: string, f: () => void, classe = 'btn', ic?: NomeIcone) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = classe;
    if (ic) rotuloComIcone(b, ic, t);
    else b.textContent = t;
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      f();
    });
    return b;
  };
  const faixa = (
    rot: string,
    min: number,
    max: number,
    passo: number,
    valor: number,
    f: (v: number) => void,
  ) => {
    const l = document.createElement('label');
    l.textContent = rot;
    const r = document.createElement('input');
    r.type = 'range';
    r.min = String(min);
    r.max = String(max);
    r.step = String(passo);
    r.value = String(valor);
    r.addEventListener('input', () => f(Number(r.value)));
    r.addEventListener('keydown', (e) => e.stopPropagation());
    l.appendChild(r);
    return l;
  };
  const bMoldura = botao(
    'Moldura',
    () => {
      comMoldura = !comMoldura;
      moldura.hidden = !comMoldura;
      bMoldura.setAttribute('aria-pressed', String(comMoldura));
      if (comMoldura) desenharNaTela();
    },
    'btn',
  );
  bMoldura.setAttribute('data-moldura-foto', '');
  bMoldura.setAttribute('aria-pressed', 'false');
  bMoldura.innerHTML =
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><g fill="#ff7ab8" stroke="#a8487a" stroke-width="0.8"><ellipse cx="12" cy="6.5" rx="3.4" ry="4"/><ellipse cx="17.2" cy="10.4" rx="3.4" ry="4" transform="rotate(72 17.2 10.4)"/><ellipse cx="15.2" cy="16.6" rx="3.4" ry="4" transform="rotate(144 15.2 16.6)"/><ellipse cx="8.8" cy="16.6" rx="3.4" ry="4" transform="rotate(216 8.8 16.6)"/><ellipse cx="6.8" cy="10.4" rx="3.4" ry="4" transform="rotate(288 6.8 10.4)"/></g><circle cx="12" cy="12" r="3" fill="#ffc93d"/></svg><span>Moldura</span>';
  let filtro = 0;
  const bFiltro = botao(
    NOMES[FILTROS[0]],
    () => {
      filtro = (filtro + 1) % FILTROS.length;
      rotuloComIcone(bFiltro, 'paleta', NOMES[FILTROS[filtro]]);
      acoes.filtro(FILTROS[filtro]);
    },
    'btn',
    'paleta',
  );
  painel.append(
    bFiltro,
    faixa('Desfoque', 0, 1, 0.05, 0, acoes.desfoque),
    faixa('Campo de visão', 30, 110, 1, 70, acoes.fov),
    faixa('Hora', 0, 1, 0.005, 0.35, acoes.hora),
    botao('Selfie', acoes.selfie, 'btn', 'pessoa'),
    botao('Grade', () => (grade.hidden = !grade.hidden), 'btn', 'grade'),
    bMoldura,
    botao(
      'Capturar',
      () => {
        flash.style.transition = 'none';
        flash.style.opacity = '0.85';
        requestAnimationFrame(() => {
          flash.style.transition = 'opacity 0.4s ease';
          flash.style.opacity = '0';
        });
        acoes.capturar(comMoldura);
      },
      'btn primario',
      'foto',
    ),
    botao('Sair', acoes.sair, 'btn', 'fechar'),
  );
  painel.addEventListener('click', (e) => e.stopPropagation());
  raiz.append(painel, moldura, grade, flash);
  return {
    mostrar(v: boolean, horaAtual?: number) {
      painel.hidden = !v;
      if (!v) grade.hidden = true;
      // a moldura só aparece para quem ganhou (nível 5); some ao sair do modo foto
      bMoldura.hidden = !acoes.temMoldura?.();
      if (!v || bMoldura.hidden) {
        comMoldura = false;
        moldura.hidden = true;
        bMoldura.setAttribute('aria-pressed', 'false');
      }
      document.body.classList.toggle('modo-foto', v);
      if (v && horaAtual !== undefined) {
        const r = painel.querySelectorAll<HTMLInputElement>('input[type=range]')[2];
        if (r) r.value = String(horaAtual);
      }
    },
  };
}
