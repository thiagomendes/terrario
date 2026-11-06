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
.seletor-temas { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.cartao-tema {
  position: relative; display: grid; grid-template-rows: auto 1fr; gap: 0; padding: 0; overflow: hidden;
  min-height: 44px; cursor: pointer; text-align: left; color: #f4efe6;
  border: 3px solid #120e16; background: #2a2533;
  box-shadow: inset 2px 2px 0 rgba(255, 255, 255, 0.1), inset -2px -3px 0 rgba(0, 0, 0, 0.35);
  font: inherit; transition: transform 0.08s ease, filter 0.12s ease;
}
.cartao-tema:hover { filter: brightness(1.12); }
.cartao-tema:focus-visible { outline: 3px solid #ffd98f; outline-offset: 2px; }
.cartao-tema[aria-checked='true'] {
  border-color: var(--acento, #ffd98f);
  box-shadow: 0 0 0 2px var(--acento, #ffd98f), 0 0 18px color-mix(in srgb, var(--acento, #ffd98f) 55%, transparent);
}
.cartao-tema[aria-checked='true']::after {
  content: ''; position: absolute; top: 6px; right: 6px; width: 16px; height: 16px;
  background: var(--acento, #ffd98f); border: 2px solid #120e16;
  clip-path: polygon(14% 52%, 0 66%, 38% 100%, 100% 22%, 86% 8%, 38% 70%);
}
.cartao-tema .previa { aspect-ratio: 16 / 9; width: 100%; overflow: hidden; }
.cartao-tema .previa img, .vitrine-temas .previa img { display: block; width: 100%; height: 100%; object-fit: cover; image-rendering: pixelated; }
.cartao-tema .texto { display: grid; gap: 2px; padding: 7px 9px 9px; }
.cartao-tema .nome { font-weight: 800; font-size: 0.95rem; color: var(--acento, #ffd98f); text-shadow: 1px 1px 0 #120e16; }
.cartao-tema .convite { font-size: 0.78rem; line-height: 1.3; color: #ddd6e8; }
.visual-tema { display: flex; align-items: center; gap: 8px; font-size: 0.86rem; color: #ddd6e8; cursor: pointer; }
.visual-tema input { width: 20px; height: 20px; accent-color: #ffd98f; }

.vitrine-temas {
  position: relative; display: grid; grid-template-columns: 132px 1fr; align-items: center; gap: 12px;
  width: min(400px, 88vw); box-sizing: border-box; padding: 8px; cursor: pointer; text-align: left;
  border: 3px solid #120e16; background: rgba(20, 16, 28, 0.72); color: #f4efe6; font: inherit;
  box-shadow: inset 2px 2px 0 rgba(255, 255, 255, 0.1), inset -2px -3px 0 rgba(0, 0, 0, 0.35), 0 8px 18px rgba(0, 0, 0, 0.35);
}
.vitrine-temas:hover { filter: brightness(1.1); }
.vitrine-temas:focus-visible { outline: 3px solid #ffd98f; outline-offset: 2px; }
.vitrine-temas .previa { position: relative; aspect-ratio: 16 / 9; overflow: hidden; border: 2px solid #120e16; }
.vitrine-temas .previa > div { position: absolute; inset: 0; opacity: 0; transition: opacity 0.9s ease; }
.vitrine-temas .previa > div.ativa { opacity: 1; }
.vitrine-temas .texto { display: grid; gap: 2px; min-width: 0; }
.vitrine-temas .rotulo { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #cfc6dc; }
.vitrine-temas .nome { font-weight: 800; font-size: 1.02rem; color: var(--acento, #ffd98f); text-shadow: 1px 1px 0 #120e16; }
.vitrine-temas .lema-tema { font-size: 0.78rem; line-height: 1.3; color: #ece6f4; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.vitrine-temas .pontos { display: flex; gap: 4px; margin-top: 4px; }
.vitrine-temas .pontos i { width: 7px; height: 7px; background: rgba(255, 255, 255, 0.28); }
.vitrine-temas .pontos i.ativa { background: var(--acento, #ffd98f); }
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
    aoEscolher(temas[i].id);
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
