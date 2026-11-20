import '../temas/todos';
import { obterTema, temasDisponiveis, TEMA_PADRAO } from '../temas';
import type { IdTema, Tema } from '../temas/tipos';

/** Imagem de prévia do tema (capturada do próprio jogo e guardada em public/temas). */
export function urlPreviaTema(id: string): string {
  return `${import.meta.env.BASE_URL ?? '/'}temas/${id}.jpg`;
}

/** Fundo de reserva enquanto a imagem não carrega (ou se faltar). */
function fundoReserva(t: Tema): string {
  return `linear-gradient(160deg, ${t.cores.fundoTitulo[0]}, ${t.cores.fundoTitulo[1]})`;
}

function imagemTema(t: Tema, classe: string): HTMLElement {
  const caixa = document.createElement('div');
  caixa.className = classe;
  caixa.style.background = fundoReserva(t);
  const img = document.createElement('img');
  img.alt = '';
  img.decoding = 'async';
  img.loading = 'lazy';
  img.src = urlPreviaTema(t.id);
  img.addEventListener('error', () => img.remove());
  caixa.appendChild(img);
  return caixa;
}

export const CSS_TEMAS_UI = `
.seletor-temas { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; padding: 4px 2px 10px; }
.cartao-tema {
  position: relative; display: grid; grid-template-rows: auto 1fr; gap: 0; padding: 6px; overflow: visible;
  min-height: 44px; cursor: pointer; text-align: left; color: var(--tinta);
  border: 0; border-radius: 18px; background: var(--creme);
  box-shadow: 0 5px 0 var(--creme-fundo), 0 9px 14px rgba(60, 35, 10, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.8);
  font: inherit; transition: transform 0.08s ease, box-shadow 0.08s ease, filter 0.12s ease;
}
.cartao-tema:hover { filter: brightness(1.03); }
.cartao-tema:active { transform: translateY(4px); box-shadow: 0 1px 0 var(--creme-fundo), 0 3px 6px rgba(60, 35, 10, 0.2); }
.cartao-tema:focus-visible { outline: 3px solid var(--azul); outline-offset: 3px; }
.cartao-tema[aria-checked='true'] {
  background: #fff3d0;
  box-shadow: 0 5px 0 var(--amarela-fundo), 0 9px 14px rgba(60, 35, 10, 0.2), inset 0 0 0 3px var(--amarela);
}
.cartao-tema[aria-checked='true']::after {
  content: ''; position: absolute; top: -6px; right: -6px; width: 26px; height: 26px; border-radius: 50%;
  background: var(--amarela) no-repeat center / 15px 15px
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M2.5 8.5l3.5 3.5 7.5-8' fill='none' stroke='%233b2a1e' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  box-shadow: 0 3px 0 var(--amarela-fundo);
}
.cartao-tema .previa { aspect-ratio: 16 / 9; width: 100%; overflow: hidden; border-radius: 13px; }
.cartao-tema .previa img, .vitrine-temas .previa img { display: block; width: 100%; height: 100%; object-fit: cover; }
.cartao-tema .texto { display: grid; gap: 2px; padding: 7px 6px 4px; }
.cartao-tema .nome {
  font: 700 0.98rem/1.15 var(--display); color: color-mix(in srgb, var(--acento, #ffb35c), #3a1a00 68%);
}
.cartao-tema .convite { font-size: 0.8rem; line-height: 1.3; color: var(--tinta-suave); font-weight: 600; }
.visual-tema { display: flex; align-items: center; gap: 8px; font-size: 0.88rem; font-weight: 700; color: var(--tinta); cursor: pointer; }
.visual-tema input { width: 22px; height: 22px; accent-color: var(--amarela-fundo); }

.vitrine-temas {
  position: relative; display: grid; grid-template-columns: 132px 1fr; align-items: center; gap: 12px;
  width: min(400px, 88vw); box-sizing: border-box; padding: 8px; cursor: pointer; text-align: left;
  border: 0; border-radius: 20px; background: var(--painel); color: var(--tinta); font: inherit;
  box-shadow: 0 5px 0 var(--painel-borda), 0 12px 22px rgba(40, 25, 10, 0.25), inset 0 2px 0 rgba(255, 255, 255, 0.8);
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}
.vitrine-temas:hover { filter: brightness(1.03); }
.vitrine-temas:active { transform: translateY(4px); box-shadow: 0 1px 0 var(--painel-borda), 0 4px 8px rgba(40, 25, 10, 0.25); }
.vitrine-temas:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.vitrine-temas .previa { position: relative; aspect-ratio: 16 / 9; overflow: hidden; border-radius: 14px; }
.vitrine-temas .previa > div { position: absolute; inset: 0; opacity: 0; transition: opacity 0.9s ease; }
.vitrine-temas .previa > div.ativa { opacity: 1; }
.vitrine-temas .texto { display: grid; gap: 2px; min-width: 0; }
.vitrine-temas .rotulo { font-size: 0.7rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--tinta-suave); }
.vitrine-temas .nome { font: 700 1.08rem/1.15 var(--display); color: color-mix(in srgb, var(--acento, #ffb35c), #3a1a00 68%); }
.vitrine-temas .lema-tema { font-size: 0.8rem; line-height: 1.3; font-weight: 600; color: var(--tinta); overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.vitrine-temas .pontos { display: flex; gap: 5px; margin-top: 4px; }
.vitrine-temas .pontos i { width: 8px; height: 8px; border-radius: 50%; background: var(--painel-borda); }
.vitrine-temas .pontos i.ativa { background: var(--amarela-fundo); }
@media (prefers-reduced-motion: reduce) { .vitrine-temas .previa > div { transition: none; } }
`;

/**
 * Cartões de tema da criação de mundo: um grupo de opções (setas e Tab funcionam),
 * cada cartão com a prévia, o nome e o convite do tema.
 */
export function criarSeletorTemas(aoMudar?: (id: IdTema) => void) {
  const grupo = document.createElement('div');
  grupo.className = 'seletor-temas';
  grupo.setAttribute('role', 'radiogroup');
  grupo.setAttribute('aria-label', 'Tema do mundo');
  let atual: IdTema = TEMA_PADRAO;
  const cartoes = new Map<IdTema, HTMLButtonElement>();
  const ids = temasDisponiveis();
  const escolher = (id: IdTema, focar = false) => {
    atual = id;
    for (const [k, b] of cartoes) {
      const sim = k === id;
      b.setAttribute('aria-checked', String(sim));
      b.tabIndex = sim ? 0 : -1;
      if (sim && focar) b.focus();
    }
    aoMudar?.(id);
  };
  for (const id of ids) {
    const t = obterTema(id);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cartao-tema';
    b.setAttribute('role', 'radio');
    b.dataset.tema = id;
    b.style.setProperty('--acento', t.cores.acento);
    const texto = document.createElement('span');
    texto.className = 'texto';
    const nome = document.createElement('span');
    nome.className = 'nome';
    nome.textContent = t.nome;
    const convite = document.createElement('span');
    convite.className = 'convite';
    convite.textContent = t.convite;
    texto.append(nome, convite);
    b.append(imagemTema(t, 'previa'), texto);
    b.addEventListener('click', () => escolher(id));
    b.addEventListener('keydown', (e) => {
      const i = ids.indexOf(atual);
      let j = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % ids.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + ids.length) % ids.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = ids.length - 1;
      if (j < 0) return;
      e.preventDefault();
      escolher(ids[j], true);
    });
    cartoes.set(id, b);
    grupo.appendChild(b);
  }
  escolher(atual);
  return {
    elemento: grupo,
    get valor(): IdTema {
      return atual;
    },
    definir(id: IdTema) {
      if (cartoes.has(id)) escolher(id);
    },
  };
}

/**
 * Vitrine do título: as prévias dos temas se revezam devagar; clicar abre a criação
 * de mundo já com o tema mostrado.
 */
export function criarVitrineTitulo(aoEscolher: (id: IdTema) => void) {
  const ids = temasDisponiveis();
  const temas = ids.map((id) => obterTema(id));
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'vitrine-temas';
  b.setAttribute('data-vitrine-temas', '');
  const previa = document.createElement('div');
  previa.className = 'previa';
  const quadros = temas.map((t) => imagemTema(t, ''));
  previa.append(...quadros);
  const texto = document.createElement('span');
  texto.className = 'texto';
  const rotulo = document.createElement('span');
  rotulo.className = 'rotulo';
  rotulo.textContent = 'Criar mundo novo';
  const nome = document.createElement('span');
  nome.className = 'nome';
  const lema = document.createElement('span');
  lema.className = 'lema-tema';
  const pontos = document.createElement('span');
  pontos.className = 'pontos';
  pontos.setAttribute('aria-hidden', 'true');
  const marcas = temas.map(() => document.createElement('i'));
  pontos.append(...marcas);
  texto.append(rotulo, nome, lema, pontos);
  b.append(previa, texto);
  let i = 0;
  const mostrar = (k: number) => {
    i = (k + temas.length) % temas.length;
    const t = temas[i];
    quadros.forEach((q, j) => q.classList.toggle('ativa', j === i));
    marcas.forEach((m, j) => m.classList.toggle('ativa', j === i));
    nome.textContent = t.nome;
    lema.textContent = t.lema;
    b.style.setProperty('--acento', t.cores.acento);
    b.setAttribute('aria-label', `Criar mundo novo: ${t.nome}. ${t.lema}`);
    b.dataset.tema = t.id;
  };
  mostrar(0);
  // pausa quando o mouse ou o foco está em cima (dá tempo de ler)
  let parado = false;
  b.addEventListener('pointerenter', () => (parado = true));
  b.addEventListener('pointerleave', () => (parado = false));
  b.addEventListener('focus', () => (parado = true));
  b.addEventListener('blur', () => (parado = false));
  // revezamento só enquanto a vitrine está na tela (o relógio para quando ela some)
  let relogio: ReturnType<typeof setInterval> | null = null;
  const ligar = () => {
    if (relogio) return;
    relogio = setInterval(() => {
      if (!b.isConnected || b.offsetParent === null) {
        clearInterval(relogio!);
        relogio = null;
        return;
      }
      if (!parado && !document.hidden) mostrar(i + 1);
    }, 4200);
  };
  ligar();
  // ao voltar ao título a vitrine reaparece: religa
  new IntersectionObserver((e) => {
    if (e.some((x) => x.isIntersecting)) ligar();
  }).observe(b);
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    aoEscolher(ids[i]);
  });
  return {
    elemento: b,
    parar: () => {
      if (relogio) clearInterval(relogio);
      relogio = null;
    },
    mostrar,
  };
}
