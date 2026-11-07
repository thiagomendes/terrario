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

export interface AcoesFoto {
  filtro(f: Filtro): void;
  desfoque(v: number): void;
  fov(graus: number): void;
  hora(h: number): void;
  capturar(): void;
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
    botao('Grade', () => (grade.hidden = !grade.hidden), 'btn', 'grade'),
    botao(
      'Capturar',
      () => {
        flash.style.transition = 'none';
        flash.style.opacity = '0.85';
        requestAnimationFrame(() => {
          flash.style.transition = 'opacity 0.4s ease';
          flash.style.opacity = '0';
        });
        acoes.capturar();
      },
      'btn primario',
      'foto',
    ),
    botao('Sair', acoes.sair, 'btn', 'fechar'),
  );
  painel.addEventListener('click', (e) => e.stopPropagation());
  raiz.append(painel, grade, flash);
  return {
    mostrar(v: boolean, horaAtual?: number) {
      painel.hidden = !v;
      if (!v) grade.hidden = true;
      document.body.classList.toggle('modo-foto', v);
      if (v && horaAtual !== undefined) {
        const r = painel.querySelectorAll<HTMLInputElement>('input[type=range]')[2];
        if (r) r.value = String(horaAtual);
      }
    },
  };
}
