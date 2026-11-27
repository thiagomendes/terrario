/**
 * Spec 039: as abas de ícone das categorias, as mesmas no livro de receitas e no catálogo do
 * criativo (a criança aprende um ícone só para os dois lugares). Só ícone, sem texto: o nome
 * fica no `aria-label` e no `title`.
 */
import { icone } from './pixicones';
import { EVENTO_ICONES, iconeDoItem } from './icones';
import { idDoBloco } from '../jogo/itens';
import { CATEGORIAS_RECEITA, type CategoriaReceita } from '../jogo/receitas';
import { Bloco } from '../world/blocks';

export const CSS_ABAS_CATEGORIA = `
.abas-categoria { display: flex; gap: 5px; flex-wrap: nowrap; overflow-x: auto; padding: 2px 2px 6px; scrollbar-width: none; }
.abas-categoria::-webkit-scrollbar { display: none; }
.abas-categoria button {
  flex: 0 0 auto; position: relative; width: calc(var(--slot) * 0.92); height: calc(var(--slot) * 0.92);
  min-width: 32px; min-height: 32px; padding: 0; border: 0; border-radius: 12px;
  background: var(--poco); box-shadow: var(--sombra-poco); color: var(--tinta); cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  transition: background 0.1s ease, transform 0.1s ease;
}
.abas-categoria button img { width: 72%; height: 72%; image-rendering: pixelated; pointer-events: none; filter: drop-shadow(0 2px 1px rgba(90, 55, 20, 0.3)); }
.abas-categoria button .pixicone { font-size: 1.3rem; }
.abas-categoria button[aria-selected='true'] { background: #fff1c4; box-shadow: inset 0 0 0 3px var(--amarela), 0 3px 0 var(--amarela-fundo); transform: translateY(-1px); }
.abas-categoria button:focus-visible { outline: 3px solid var(--azul); outline-offset: 1px; }
`;

/** O nome (para quem ouve a tela) e o ícone de cada aba: um item que a criança conhece. */
const ABAS: Readonly<Record<CategoriaReceita, { nome: string; item: string }>> = {
  blocos: { nome: 'Blocos', item: idDoBloco(Bloco.TABUAS) },
  casa: { nome: 'Casa', item: idDoBloco(Bloco.SOFA) },
  comida: { nome: 'Comida', item: 'maca' },
  ferramentas: { nome: 'Ferramentas', item: 'picareta_ferro' },
  luz: { nome: 'Luz', item: idDoBloco(Bloco.TOCHA) },
  decoracao: { nome: 'Decoração', item: idDoBloco(Bloco.FLOR) },
  materiais: { nome: 'Materiais', item: 'lingote_ferro' },
};

export interface AbasCategoria {
  raiz: HTMLElement;
  /** A aba escolhida (null: tudo). */
  atual(): CategoriaReceita | null;
  escolher(c: CategoriaReceita | null): void;
}

/** A fileira de abas (com o "tudo" na frente); `aoEscolher` vem a cada troca. */
export function criarAbasCategoria(
  aoEscolher: (c: CategoriaReceita | null) => void,
  inicial: CategoriaReceita | null = null,
): AbasCategoria {
  const raiz = document.createElement('div');
  raiz.className = 'abas-categoria';
  raiz.setAttribute('role', 'tablist');
  raiz.setAttribute('data-abas-categoria', '');
  let atual: CategoriaReceita | null = inicial;
  const botoes: { b: HTMLButtonElement; c: CategoriaReceita | null; img?: HTMLImageElement }[] =
    [];
  const marcar = () => {
    for (const { b, c } of botoes) b.setAttribute('aria-selected', String(c === atual));
  };
  for (const c of [null, ...CATEGORIAS_RECEITA]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('data-aba-categoria', c ?? 'tudo');
    const nome = c ? ABAS[c].nome : 'Tudo';
    b.setAttribute('aria-label', nome);
    b.title = nome;
    let img: HTMLImageElement | undefined;
    if (c) {
      img = document.createElement('img');
      img.alt = '';
      img.src = iconeDoItem(ABAS[c].item);
      b.appendChild(img);
    } else b.appendChild(icone('grade'));
    b.addEventListener('click', (e) => {
      e.preventDefault();
      if (atual === c) return;
      atual = c;
      marcar();
      aoEscolher(c);
    });
    botoes.push({ b, c, img });
    raiz.appendChild(b);
  }
  marcar();
  // os ícones de brinquedo chegam aos poucos
  window.addEventListener(EVENTO_ICONES, () => {
    for (const { c, img } of botoes) if (c && img) img.src = iconeDoItem(ABAS[c].item);
  });
  return {
    raiz,
    atual: () => atual,
    escolher(c) {
      atual = c;
      marcar();
    },
  };
}
