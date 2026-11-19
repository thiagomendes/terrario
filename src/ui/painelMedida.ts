import { medirJanela, rodandoComoApp, tamanhoDoCanvas } from './telaCheia';

/**
 * Spec 034 (T01): o painel de medida da janela, para achar a causa da faixa azul embaixo no
 * iPhone aberto pelo ícone da tela de início. Abre pelo gesto escondido nas Configurações
 * (`toquesEscondidos.ts`) e só existe depois de aberto: quem não abre não carrega nem vê nada.
 *
 * Mostra o que o navegador diz da janela e onde o canvas e o contêiner do jogo de fato estão,
 * em pé e deitado: cada posição guarda a última medida dela, e a da posição atual se atualiza
 * ao girar. Um print do painel nas duas posições basta para o conserto.
 */

type Posicao = 'empe' | 'deitado';

interface Medida {
  chave: string;
  rotulo: string;
  ler(): string;
}

const CSS = `
.painel-medida {
  position: fixed; inset: 0; z-index: 1000; overflow-y: auto; overscroll-behavior: contain;
  touch-action: pan-y; -webkit-user-select: text; user-select: text;
  background: #fffaf0; color: #24180c;
  padding: calc(env(safe-area-inset-top, 0px) + 12px) calc(env(safe-area-inset-right, 0px) + 14px)
    calc(env(safe-area-inset-bottom, 0px) + 24px) calc(env(safe-area-inset-left, 0px) + 14px);
  font: 600 16px/1.3 system-ui, -apple-system, sans-serif; box-sizing: border-box;
}
.painel-medida[hidden] { display: none; }
.painel-medida .cabeca {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px;
}
.painel-medida h2 { margin: 0; font-size: 22px; }
.painel-medida .fechar-medida {
  min-width: 140px; min-height: 60px; padding: 8px 20px; border: 0; border-radius: 16px;
  background: #ffd23f; color: #24180c; font: 800 22px system-ui, -apple-system, sans-serif;
  box-shadow: 0 4px 0 #c48a00; cursor: pointer;
}
.painel-medida .agora { margin: 0 0 8px; font-size: 17px; }
.painel-medida .tabela-medida {
  display: grid; grid-template-columns: 1fr 1fr; column-gap: 8px; row-gap: 2px;
}
.painel-medida .canto { display: none; }
.painel-medida .titulo-coluna { font-size: 18px; font-weight: 800; padding: 2px 8px; border-radius: 8px; }
.painel-medida .rotulo {
  grid-column: 1 / -1; margin-top: 6px; font: 600 13px/1.2 ui-monospace, Menlo, monospace;
  color: #6b5640; overflow-wrap: anywhere;
}
.painel-medida .valor {
  font: 800 18px/1.25 ui-monospace, Menlo, monospace; padding: 1px 8px; border-radius: 8px;
  overflow-wrap: anywhere; min-height: 1.25em;
}
/* deitado: o nome e as duas posições na mesma linha (cabe mais numa tela baixa) */
@media (orientation: landscape) {
  .painel-medida .tabela-medida { grid-template-columns: minmax(0, 1.25fr) 1fr 1fr; align-items: center; }
  .painel-medida .canto { display: block; }
  .painel-medida .rotulo { grid-column: auto; margin-top: 0; }
}
.painel-medida .atual { background: #ffe9a8; }
.painel-medida .prova-seguranca {
  position: fixed; left: 0; top: 0; width: 0; height: 0; visibility: hidden; pointer-events: none;
  padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px)
    env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px);
}
`;

const num = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(2));
const par = (a: number, b: number): string => `${num(a)} × ${num(b)}`;
const simNao = (v: boolean | undefined): string =>
  v === undefined ? 'não existe' : v ? 'sim' : 'não';

function retangulo(el: Element | null): string {
  if (!el) return 'não achado';
  const r = el.getBoundingClientRect();
  return `x ${num(r.x)}, y ${num(r.y)}, ${par(r.width, r.height)}`;
}

function medidas(prova: HTMLElement): Medida[] {
  const de = document.documentElement;
  const vv = () => window.visualViewport;
  const mm = (q: string) =>
    typeof window.matchMedia === 'function' ? simNao(window.matchMedia(q).matches) : 'não existe';
  const seguranca = () => getComputedStyle(prova);
  const canvas = () => document.getElementById('cena') as HTMLCanvasElement | null;
  return [
    { chave: 'inner', rotulo: 'innerWidth × innerHeight', ler: () => par(innerWidth, innerHeight) },
    {
      chave: 'client',
      rotulo: 'documentElement.clientWidth × clientHeight',
      ler: () => par(de.clientWidth, de.clientHeight),
    },
    {
      chave: 'vv',
      rotulo: 'visualViewport.width × height',
      ler: () => {
        const v = vv();
        return v ? par(v.width, v.height) : 'não existe';
      },
    },
    {
      chave: 'vv-topo-escala',
      rotulo: 'visualViewport.offsetTop · scale',
      ler: () => {
        const v = vv();
        return v ? `${num(v.offsetTop)} · ${num(v.scale)}` : 'não existe';
      },
    },
    {
      chave: 'screen',
      rotulo: 'screen.width × height',
      ler: () => par(screen.width, screen.height),
    },
    { chave: 'dpr', rotulo: 'devicePixelRatio', ler: () => num(devicePixelRatio) },
    {
      chave: 'seguro',
      rotulo: 'env(safe-area-inset-*) em px: top · right · bottom · left',
      ler: () => {
        const s = seguranca();
        return [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft]
          .map((v) => num(parseFloat(v) || 0))
          .join(' · ');
      },
    },
    {
      chave: 'modos',
      rotulo: 'navigator.standalone · (display-mode: standalone) · (display-mode: fullscreen)',
      ler: () =>
        [
          simNao((navigator as Navigator & { standalone?: boolean }).standalone),
          mm('(display-mode: standalone)'),
          mm('(display-mode: fullscreen)'),
        ].join(' · '),
    },
    { chave: 'app', rotulo: 'rodandoComoApp()', ler: () => simNao(rodandoComoApp()) },
    {
      chave: 'tamanho-canvas',
      rotulo: 'tamanhoDoCanvas(medirJanela())',
      ler: () => {
        const t = tamanhoDoCanvas(medirJanela());
        return par(t.largura, t.altura);
      },
    },
    {
      chave: 'canvas',
      rotulo: 'canvas#cena: getBoundingClientRect',
      ler: () => retangulo(canvas()),
    },
    {
      chave: 'canvas-pixels',
      rotulo: 'canvas#cena: width × height (pixels de desenho)',
      ler: () => {
        const c = canvas();
        return c ? par(c.width, c.height) : 'não achado';
      },
    },
    {
      chave: 'conteiner',
      rotulo: 'div#app: getBoundingClientRect',
      ler: () => retangulo(document.getElementById('app')),
    },
    { chave: 'body', rotulo: 'body: getBoundingClientRect', ler: () => retangulo(document.body) },
    { chave: 'html', rotulo: 'html: getBoundingClientRect', ler: () => retangulo(de) },
  ];
}

let painel: { abrir(): void; fechar(): void } | null = null;

/** Abre o painel de medida (cria na primeira vez). */
export function abrirPainelMedida(): void {
  painel ??= criarPainelMedida();
  painel.abrir();
}

function criarPainelMedida(): { abrir(): void; fechar(): void } {
  const estilo = document.createElement('style');
  estilo.textContent = CSS;
  document.head.appendChild(estilo);

  const raiz = document.createElement('div');
  raiz.className = 'painel-medida';
  raiz.setAttribute('data-painel-medida', '');
  raiz.setAttribute('role', 'dialog');
  raiz.setAttribute('aria-modal', 'true');
  raiz.setAttribute('aria-label', 'Medidas da janela');
  raiz.hidden = true;

  const cabeca = document.createElement('div');
  cabeca.className = 'cabeca';
  const titulo = document.createElement('h2');
  titulo.textContent = 'Medidas da janela';
  const fechar = document.createElement('button');
  fechar.type = 'button';
  fechar.className = 'fechar-medida';
  fechar.textContent = 'Fechar';
  cabeca.append(titulo, fechar);

  const agora = document.createElement('p');
  agora.className = 'agora';

  const tabela = document.createElement('div');
  tabela.className = 'tabela-medida';
  const colunas: Record<Posicao, HTMLElement> = {
    empe: document.createElement('div'),
    deitado: document.createElement('div'),
  };
  colunas.empe.textContent = 'Em pé';
  colunas.deitado.textContent = 'Deitado';
  // a célula vazia em cima dos nomes (só deitado, quando o nome fica na mesma linha)
  const canto = document.createElement('div');
  canto.className = 'canto';
  tabela.appendChild(canto);
  for (const p of ['empe', 'deitado'] as const) {
    colunas[p].className = 'titulo-coluna';
    colunas[p].dataset.posicao = p;
    tabela.appendChild(colunas[p]);
  }

  const prova = document.createElement('div');
  prova.className = 'prova-seguranca';
  raiz.append(cabeca, agora, tabela, prova);
  document.body.appendChild(raiz);

  const lista = medidas(prova);
  const celulas = new Map<string, Record<Posicao, HTMLElement>>();
  for (const m of lista) {
    const rotulo = document.createElement('div');
    rotulo.className = 'rotulo';
    rotulo.textContent = m.rotulo;
    const linha = {} as Record<Posicao, HTMLElement>;
    for (const p of ['empe', 'deitado'] as const) {
      const v = document.createElement('div');
      v.className = 'valor';
      v.dataset.medida = m.chave;
      v.dataset.posicao = p;
      v.textContent = '';
      linha[p] = v;
    }
    tabela.append(rotulo, linha.empe, linha.deitado);
    celulas.set(m.chave, linha);
  }

  const ultimas: Partial<Record<Posicao, Record<string, string>>> = {};
  /** A primeira leitura depois de abrir vale na hora; a leitura anterior, para comparar. */
  let primeira = true;
  let anterior = '';
  function medir(): void {
    const posicao: Posicao = innerWidth > innerHeight ? 'deitado' : 'empe';
    const valores: Record<string, string> = {};
    for (const m of lista) {
      try {
        valores[m.chave] = m.ler();
      } catch {
        valores[m.chave] = 'erro ao medir';
      }
    }
    // no meio do giro as medidas vêm misturadas (a janela já virou e a tela não, ou o
    // contrário): a coluna só guarda a leitura que se repetiu igual na leitura seguinte
    const chave = posicao + JSON.stringify(valores);
    if (primeira || chave === anterior) ultimas[posicao] = valores;
    primeira = false;
    anterior = chave;
    agora.textContent =
      `Agora: ${posicao === 'empe' ? 'em pé' : 'deitado'}. ` +
      (ultimas[posicao === 'empe' ? 'deitado' : 'empe']
        ? 'As duas posições já foram medidas.'
        : 'Gire o aparelho para medir a outra posição.');
    for (const p of ['empe', 'deitado'] as const) {
      colunas[p].classList.toggle('atual', p === posicao);
      for (const m of lista) {
        const c = celulas.get(m.chave)![p];
        c.textContent = ultimas[p]?.[m.chave] ?? '';
        c.classList.toggle('atual', p === posicao);
      }
    }
  }

  // o iPhone às vezes só acerta o tamanho um pouco depois de girar: mede de novo depois
  let atrasos: number[] = [];
  const aoMudar = () => {
    medir();
    for (const ms of [300, 700, 1200]) atrasos.push(window.setTimeout(medir, ms));
    if (atrasos.length > 30) atrasos = atrasos.slice(-12);
  };
  let relogio = 0;
  const aoTecla = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    api.fechar();
  };
  const api = {
    abrir(): void {
      if (!raiz.hidden) return;
      raiz.hidden = false;
      window.addEventListener('resize', aoMudar);
      window.addEventListener('orientationchange', aoMudar);
      window.visualViewport?.addEventListener('resize', aoMudar);
      window.visualViewport?.addEventListener('scroll', aoMudar);
      window.addEventListener('keydown', aoTecla, true);
      relogio = window.setInterval(medir, 1000);
      primeira = true;
      medir();
      fechar.focus({ preventScroll: true });
    },
    fechar(): void {
      if (raiz.hidden) return;
      raiz.hidden = true;
      window.removeEventListener('resize', aoMudar);
      window.removeEventListener('orientationchange', aoMudar);
      window.visualViewport?.removeEventListener('resize', aoMudar);
      window.visualViewport?.removeEventListener('scroll', aoMudar);
      window.removeEventListener('keydown', aoTecla, true);
      window.clearInterval(relogio);
      for (const t of atrasos.splice(0)) window.clearTimeout(t);
    },
  };
  fechar.addEventListener('click', () => api.fechar());
  return api;
}
