import { icone, type NomeIcone } from './pixicones';

/** Funções do jogo com ícone, nome e tecla: a mesma lista na barra do HUD e na pausa. */
export interface FuncaoJogo {
  codigo: string;
  tecla: string;
  nome: string;
  icone: NomeIcone;
}

export const FUNCOES_JOGO: readonly FuncaoJogo[] = [
  { codigo: 'KeyE', tecla: 'E', nome: 'Inventário', icone: 'mochila' },
  { codigo: 'Tab', tecla: 'Tab', nome: 'Mapa', icone: 'mapa' },
  { codigo: 'KeyJ', tecla: 'J', nome: 'Diário', icone: 'livro' },
  { codigo: 'KeyC', tecla: 'C', nome: 'Personagem', icone: 'pessoa' },
  { codigo: 'KeyP', tecla: 'P', nome: 'Modo foto', icone: 'foto' },
  // spec 015: a roda de gestos
  { codigo: 'KeyG', tecla: 'G', nome: 'Gestos', icone: 'carinha' },
];

export const CSS_ATALHOS = `
.barra-atalhos {
  position: fixed; z-index: 7; left: max(10px, env(safe-area-inset-left, 0px));
  bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  display: flex; gap: 6px; padding: 6px 6px 10px; border-radius: 18px;
  background: rgba(255, 250, 240, 0.7); pointer-events: auto;
  box-shadow: 0 4px 0 rgba(150, 110, 60, 0.3), 0 10px 20px rgba(40, 25, 10, 0.15);
  transform: scale(var(--escala-ui, 1)); transform-origin: bottom left;
}
.barra-atalhos[hidden] { display: none; }
/* desktop mais estreito: coluna na lateral, sem encostar na barra de itens */
@media (max-width: 1180px) {
  /* duas colunas: a barra fica baixa e não sobe por cima dos avisos e da missão */
  .barra-atalhos { display: grid; grid-template-columns: repeat(2, auto);
    bottom: calc(90px + env(safe-area-inset-bottom, 0px)); }
}
/* a peça vem de brinquedo.ts; aqui só a medida */
.barra-atalhos button {
  display: grid; justify-items: center; gap: 1px; min-width: 46px; padding: 5px 6px 3px; border-radius: 12px;
  font-size: 0.68rem;
  box-shadow: 0 3px 0 var(--f), 0 5px 8px rgba(60, 35, 10, 0.18), inset 0 2px 0 rgba(255, 255, 255, 0.75);
}
.barra-atalhos button:active { transform: translateY(2px); box-shadow: 0 1px 0 var(--f); }
.barra-atalhos .pixicone-caixa { font-size: 1.15rem; }
.barra-atalhos kbd { font: 800 0.62rem var(--jogo); color: var(--tinta-suave); }
body.tela-titulo .barra-atalhos, body.toque-ativo .barra-atalhos, body[data-overlay] .barra-atalhos,
body.modo-foto .barra-atalhos { display: none; }
/* na pausa: grade de botões grandes, um por função */
.pausa .grade-funcoes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; padding-bottom: 5px; }
.pausa .grade-funcoes button {
  display: grid; justify-items: center; align-content: center; gap: 3px; padding: 10px 6px; min-height: 78px;
  font-size: 0.86rem;
}
.pausa .grade-funcoes .pixicone-caixa { font-size: 1.7rem; }
.pausa .grade-funcoes kbd { font: 800 0.68rem var(--jogo); color: var(--tinta-suave); }
body.toque-ativo .pausa .grade-funcoes kbd { display: none; }
`;

function botaoFuncao(f: FuncaoJogo, abrir: (codigo: string) => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.title = `${f.nome} (${f.tecla})`;
  b.setAttribute('aria-label', `${f.nome}, tecla ${f.tecla}`);
  b.setAttribute('data-funcao', f.codigo);
  const nome = document.createElement('span');
  nome.textContent = f.nome;
  const k = document.createElement('kbd');
  k.textContent = f.tecla;
  b.append(icone(f.icone), nome, k);
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    abrir(f.codigo);
  });
  return b;
}

/** Grade de botões grandes (menu de pausa): para quem não decorou os atalhos. */
export function criarGradeFuncoes(abrir: (codigo: string) => void): HTMLElement {
  const g = document.createElement('div');
  g.className = 'grade-funcoes';
  g.setAttribute('role', 'group');
  g.setAttribute('aria-label', 'Abrir');
  for (const f of FUNCOES_JOGO) g.appendChild(botaoFuncao(f, abrir));
  return g;
}

/**
 * Barra de atalhos do HUD (desktop): lembra o ícone e a tecla de cada função e
 * é clicável quando o mouse está livre. "Esc · menu" leva aos botões grandes da pausa.
 */
export function criarBarraAtalhos(raiz: HTMLElement, abrir: (codigo: string) => void) {
  const barra = document.createElement('nav');
  barra.className = 'barra-atalhos';
  barra.setAttribute('aria-label', 'Atalhos');
  barra.setAttribute('data-barra-atalhos', '');
  for (const f of FUNCOES_JOGO) {
    const b = botaoFuncao(f, abrir);
    b.replaceChildren(b.firstChild!, b.lastChild!); // na barra: só ícone e tecla
    barra.appendChild(b);
  }
  const menu = botaoFuncao({ codigo: 'Pausa', tecla: 'Esc', nome: 'Menu', icone: 'pausa' }, abrir);
  menu.replaceChildren(menu.firstChild!, menu.lastChild!);
  barra.appendChild(menu);
  raiz.appendChild(barra);
  return {
    definir(visivel: boolean) {
      barra.hidden = !visivel;
    },
  };
}
