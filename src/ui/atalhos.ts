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
  { codigo: 'KeyV', tecla: 'V', nome: 'Câmera', icone: 'olho' },
  { codigo: 'KeyP', tecla: 'P', nome: 'Modo foto', icone: 'foto' },
];

export const CSS_ATALHOS = `
.barra-atalhos {
  position: fixed; z-index: 7; left: max(10px, env(safe-area-inset-left, 0px));
  bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  display: flex; gap: 6px; padding: 6px; border-radius: 10px;
  background: rgba(10, 12, 20, 0.45); pointer-events: auto;
  transform: scale(var(--escala-ui, 1)); transform-origin: bottom left;
}
.barra-atalhos[hidden] { display: none; }
/* desktop mais estreito: coluna na lateral, sem encostar na barra de itens */
@media (max-width: 1180px) {
  .barra-atalhos { flex-direction: column; bottom: calc(90px + env(safe-area-inset-bottom, 0px)); }
}
.barra-atalhos button {
  display: grid; justify-items: center; gap: 1px; min-width: 46px; padding: 5px 6px 3px;
  border: 2px solid #120e16; background: #3a3542; color: #f6f2ea; cursor: pointer;
  box-shadow: inset 2px 2px 0 rgba(255, 255, 255, 0.16), inset -2px -3px 0 rgba(0, 0, 0, 0.35);
  font: 700 0.68rem system-ui, sans-serif;
}
.barra-atalhos button:hover, .barra-atalhos button:focus-visible { background: #4a4454; color: #ffe7a3; outline: none; }
.barra-atalhos .pixicone-caixa { font-size: 1.15rem; }
.barra-atalhos kbd { font: 700 0.62rem ui-monospace, monospace; color: #ffd98f; }
body.tela-titulo .barra-atalhos, body.toque-ativo .barra-atalhos, body[data-overlay] .barra-atalhos,
body.modo-foto .barra-atalhos { display: none; }
/* na pausa: grade de botões grandes, um por função */
.pausa .grade-funcoes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.pausa .grade-funcoes button {
  display: grid; justify-items: center; gap: 4px; padding: 10px 6px; min-height: 72px; cursor: pointer;
  border: 2px solid #120e16; background: #3a3542; color: #f6f2ea;
  box-shadow: inset 2px 2px 0 rgba(255, 255, 255, 0.16), inset -2px -3px 0 rgba(0, 0, 0, 0.35);
  font: 700 0.85rem system-ui, sans-serif;
}
.pausa .grade-funcoes button:hover, .pausa .grade-funcoes button:focus-visible { background: #4a4454; color: #ffe7a3; outline: none; }
.pausa .grade-funcoes .pixicone-caixa { font-size: 1.6rem; }
.pausa .grade-funcoes kbd { font: 700 0.7rem ui-monospace, monospace; color: #ffd98f; }
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
