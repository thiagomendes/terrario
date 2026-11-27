import { icone, rotuloComIcone } from './pixicones';
import type { Inventario, Pilha, Slot } from '../jogo/inventario';
import { obterItem } from '../jogo/itens';
import { receitaNoMundo } from '../jogo/exclusivos';
import { estiloMundo } from '../world/chunk';
import {
  RECEITAS,
  TAGS,
  aceita,
  consumirGrade,
  encontrarReceita,
  podeFazer,
  type Grade,
  type Receita,
} from '../jogo/receitas';
import { iconeDoItem } from './icones';
import { rolarAoFocar, type InventarioUI } from './inventario';
import { trocar } from './conteiner';
import { criarAbasCategoria } from './abasCategoria';

export const CSS_CRIACAO = `
/* criação e livro são seções do inventário: sem fundo nem sombra próprios */
.criacao { display: grid; gap: 10px; }
.criacao[hidden] { display: none; }
.criacao .linha-criacao { display: flex; align-items: center; gap: 12px; }
.criacao .grade-criacao { display: grid; gap: 5px; }
.criacao .seta { font-size: 1.6rem; font-weight: 800; color: var(--amarela-fundo); }
.criacao .resultado { width: calc(var(--slot) * 1.25); height: calc(var(--slot) * 1.25); }
.criacao .resultado.pronto { background: #fff1c4; box-shadow: inset 0 0 0 3px var(--amarela), 0 3px 0 var(--amarela-fundo); }
.criacao .btn { width: 100%; }
.livro { display: grid; gap: 8px; width: 100%; min-width: min(320px, 100%); max-width: 100%; box-sizing: border-box; justify-self: stretch; }
.livro input {
  min-height: 42px; padding: 6px 14px; border: 0; border-radius: 14px; box-sizing: border-box; width: 100%;
  background: var(--poco); color: var(--tinta); font: 700 0.95rem var(--jogo); box-shadow: var(--sombra-poco);
}
.livro .lista { display: grid; gap: 6px; max-height: calc(var(--slot) * 4.6); overflow-y: auto; padding: 2px 4px 4px 0; overscroll-behavior: contain; touch-action: pan-y; }
.receita {
  display: grid; grid-template-columns: 36px 1fr; gap: 10px; align-items: center; text-align: left;
  padding: 6px 10px; border: 0; border-radius: 14px; background: var(--poco); box-shadow: var(--sombra-poco);
  color: var(--tinta); cursor: pointer; font: 800 0.86rem var(--jogo);
}
.receita:hover { background: #fff3d6; }
.receita:focus-visible { outline: 3px solid var(--azul); outline-offset: 1px; }
.receita.disponivel { background: #fff6dc; box-shadow: inset 0 0 0 2px var(--amarela), 0 3px 0 var(--amarela-fundo); }
.receita.bloqueada { color: var(--tinta); }
/* falta ingrediente: a receita segue legível (não parece desligada); só os ingredientes que
   faltam ficam um pouco apagados */
.receita.bloqueada img { opacity: 0.85; }
.receita.bloqueada .ingr img { opacity: 0.6; }
.receita img { width: 32px; height: 32px; }
.receita .ingr { display: flex; gap: 2px; margin-top: 2px; flex-wrap: wrap; }
.receita .ingr img { width: 16px; height: 16px; }
.receita small { font-weight: 600; color: var(--tinta-suave); }
/* Livro aberto em tela larga: ao lado da grade, não por cima da mochila. Em largura toda,
   num notebook (720 ou 768 de altura) a barra e quase toda a mochila saíam da janela e não
   dava para arrastar o resultado até elas. */
@media (min-width: 600px) {
  .inventario .topo > .secao:first-child:has(> .livro:not([hidden])) { flex: 1 1 100%; flex-wrap: nowrap; }
  .inventario .livro { flex: 1 1 0; width: auto; min-width: 0; }
  .inventario .livro .lista { max-height: calc(var(--slot) * 3.4); }
}
.receita.mesa-necessaria::after {
  content: 'mesa'; justify-self: start; grid-column: 2; padding: 1px 8px; border-radius: 999px;
  font-size: 0.68rem; font-weight: 800; color: #9a2f12; background: #ffe0d6;
}
`;

const NOMES_TAG: Record<string, string> = {
  '#tabuas': 'qualquer tábua',
  '#troncos': 'qualquer tronco',
  '#pedra': 'pedra ou pedregulho',
  '#areia': 'areia',
  '#la': 'qualquer lã',
};

export interface Criacao {
  mostrar(v: boolean): void;
  definirLado(lado: 2 | 3): void;
  /** Devolve à mochila o que ficou na grade (ao fechar); o que não couber vai para o chão. */
  devolver(): void;
  /** Grade de criação (até 9 casas), para as transações de itens. */
  lerGrade(i: number): Slot;
  gravarGrade(i: number, p: Slot): void;
  render(): void;
}

export function criarCriacao(
  ui: InventarioUI,
  inv: Inventario,
  op: {
    criativo: () => boolean;
    aoFabricar?: (r: Receita) => void;
    /** O que não coube na mochila ao esvaziar a grade (vai para o chão). */
    aoSobrar?: (p: Pilha) => void;
  },
): Criacao {
  let lado: 2 | 3 = 2;
  let grade: Grade = [null, null, null, null];
  const raiz = document.createElement('div');
  raiz.className = 'criacao';
  const rot = document.createElement('div');
  rot.className = 'rotulo-secao';
  const linha = document.createElement('div');
  linha.className = 'linha-criacao';
  const gradeEl = document.createElement('div');
  gradeEl.className = 'grade-criacao';
  const seta = document.createElement('span');
  seta.className = 'seta';
  seta.appendChild(icone('seta'));
  const resultado = ui.criarSlot();
  resultado.classList.add('resultado');
  resultado.dataset.externo = 'resultado';
  resultado.setAttribute('data-resultado-criacao', '');
  linha.append(gradeEl, seta, resultado);
  const botaoLivro = document.createElement('button');
  botaoLivro.type = 'button';
  botaoLivro.className = 'btn';
  rotuloComIcone(botaoLivro, 'livro', 'Livro de receitas');
  botaoLivro.setAttribute('data-livro', '');
  raiz.append(rot, linha, botaoLivro);

  // livro de receitas
  const livro = document.createElement('div');
  livro.className = 'livro';
  livro.hidden = true;
  const busca = document.createElement('input');
  busca.type = 'search';
  busca.placeholder = 'Buscar receita…';
  busca.addEventListener('keydown', (e) => e.stopPropagation());
  rolarAoFocar(busca);
  const lista = document.createElement('div');
  lista.className = 'lista';
  // spec 039: as abas de ícone das categorias (as mesmas do catálogo do criativo)
  const abas = criarAbasCategoria(() => renderLivro());
  livro.append(abas.raiz, busca, lista);
  botaoLivro.addEventListener('click', (e) => {
    e.preventDefault();
    livro.hidden = !livro.hidden;
    renderLivro();
  });
  busca.addEventListener('input', () => renderLivro());
  ui.areaExtra.append(raiz, livro);

  let celulas: HTMLButtonElement[] = [];
  function montar(): void {
    gradeEl.replaceChildren();
    gradeEl.style.gridTemplateColumns = `repeat(${lado}, var(--slot))`;
    rot.textContent = lado === 3 ? 'Mesa de trabalho' : 'Criação';
    celulas = Array.from({ length: lado * lado }, (_, i) => {
      const c = ui.criarSlot();
      c.dataset.externo = `grade:${i}`;
      c.setAttribute('data-grade-criacao', String(i));
      gradeEl.appendChild(c);
      return c;
    });
  }

  const atual = () => encontrarReceita(grade, lado);

  function render(): void {
    celulas.forEach((c, i) => ui.desenharSlot(c, grade[i]));
    const r = atual();
    ui.desenharSlot(resultado, r ? { item: r.resultado.item, qtd: r.resultado.qtd } : null);
    resultado.classList.toggle('pronto', !!r);
    if (!livro.hidden) renderLivro();
  }

  function contar(item: string): number {
    return inv.contar(item) + grade.reduce((t, p) => t + (p && p.item === item ? p.qtd : 0), 0);
  }

  function renderLivro(): void {
    const termo = busca.value.trim().toLowerCase();
    lista.replaceChildren();
    // spec 014: receitas com algo só de outro tema não aparecem neste mundo
    const aba = abas.atual();
    const itens = RECEITAS.filter(
      (r) => receitaNoMundo(r, estiloMundo()) && (!aba || r.categoria === aba),
    )
      .map((r) => ({ r, def: obterItem(r.resultado.item) }))
      .filter(({ def }) => !!def && (!termo || def.nome.toLowerCase().includes(termo)))
      .map((x) => ({ ...x, ok: podeFazer(x.r, contar) && (!x.r.mesa || lado === 3) }))
      .sort((a, b) => Number(b.ok) - Number(a.ok));
    for (const { r, def, ok } of itens) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `receita ${ok ? 'disponivel' : 'bloqueada'}${r.mesa && lado < 3 ? ' mesa-necessaria' : ''}`;
      el.dataset.receita = r.id;
      const img = document.createElement('img');
      img.src = iconeDoItem(r.resultado.item);
      img.alt = '';
      const txt = document.createElement('div');
      txt.append(`${def!.nome}${r.resultado.qtd > 1 ? ` ×${r.resultado.qtd}` : ''}`);
      const ingr = document.createElement('div');
      ingr.className = 'ingr';
      const lista2 =
        r.ingredientes ??
        r
          .forma!.join('')
          .split('')
          .filter((c) => c !== ' ')
          .map((c) => r.chaves![c]);
      for (const c of lista2) {
        const i = document.createElement('img');
        const exemplo = c.startsWith('#') ? TAGS[c]?.[0] : c;
        if (exemplo) i.src = iconeDoItem(exemplo);
        i.title = c.startsWith('#') ? (NOMES_TAG[c] ?? c) : (obterItem(c)?.nome ?? c);
        ingr.appendChild(i);
      }
      txt.appendChild(ingr);
      el.append(img, txt);
      // click (e não pointerdown): no toque a lista rola sem escolher receita por engano
      el.addEventListener('click', (e) => {
        e.preventDefault();
        preencher(r);
      });
      lista.appendChild(el);
    }
  }

  /** Coloca na grade os ingredientes da receita, tirando da mochila. */
  function preencher(r: Receita): void {
    if (r.mesa && lado < 3) return;
    devolver();
    // mochila cheia: o que estava na grade ficou nela (não some)
    if (grade.some((p) => p)) {
      render();
      return;
    }
    if (!podeFazer(r, (i) => inv.contar(i))) return;
    const pos: { i: number; chave: string }[] = [];
    if (r.forma) {
      r.forma.forEach((l, y) =>
        [...l].forEach(
          (ch, x) => ch !== ' ' && pos.push({ i: y * lado + x, chave: r.chaves![ch] }),
        ),
      );
    } else {
      r.ingredientes!.forEach((c, k) => pos.push({ i: k, chave: c }));
    }
    for (const { i, chave } of pos) {
      const fonte = inv.slots.findIndex((s) => !!s && aceita(chave, s.item));
      if (fonte < 0) continue;
      const s = inv.obter(fonte)!;
      inv.remover(fonte, 1);
      grade[i] = { item: s.item, qtd: 1 };
    }
    render();
  }

  function pegarResultado(cursor: Slot, maximo: boolean): Slot {
    let r = atual();
    if (!r) return cursor;
    if (maximo) {
      while (r) {
        const resto = inv.adicionar(r.resultado.item, r.resultado.qtd);
        grade = consumirGrade(grade);
        op.aoFabricar?.(r);
        if (resto > 0) break;
        r = atual();
      }
      return cursor;
    }
    const def = obterItem(r.resultado.item);
    if (
      cursor &&
      (cursor.item !== r.resultado.item || cursor.qtd + r.resultado.qtd > (def?.pilha ?? 64))
    ) {
      return cursor;
    }
    const novo: Pilha = cursor
      ? { ...cursor, qtd: cursor.qtd + r.resultado.qtd }
      : {
          item: r.resultado.item,
          qtd: r.resultado.qtd,
          ...(def?.durabilidade ? { dur: def.durabilidade } : {}),
        };
    grade = consumirGrade(grade);
    op.aoFabricar?.(r);
    return novo;
  }

  ui.clicarExterno((el, cursor, botao, shift) => {
    const alvo = el.dataset.externo ?? '';
    if (alvo === 'resultado') {
      const c = pegarResultado(cursor, shift);
      render();
      return c;
    }
    if (!alvo.startsWith('grade:')) return cursor;
    const i = Number(alvo.slice(6));
    const s = grade[i];
    let novo: Slot = cursor;
    if (shift && s && !cursor) {
      const resto = inv.adicionar(s.item, s.qtd, s.dur);
      grade[i] = resto > 0 ? { ...s, qtd: resto } : null;
    } else {
      // as mesmas regras do baú: botão direito põe um (ou pega metade), juntar não passa
      // da pilha
      [grade[i], novo] = trocar(s, cursor, botao);
    }
    render();
    return novo;
  });

  /** Grade de volta para a mochila; o que não couber fica na grade. */
  function devolver(): void {
    grade = grade.map((p) => {
      if (!p) return null;
      const resto = inv.adicionar(p.item, p.qtd, p.dur);
      return resto > 0 ? { ...p, qtd: resto } : null;
    });
  }
  /** Esvazia a grade: volta para a mochila e o que não couber vai para o chão. */
  function esvaziar(): void {
    devolver();
    grade.forEach((p, i) => {
      if (!p) return;
      op.aoSobrar?.(p);
      grade[i] = null;
    });
  }

  montar();
  return {
    lerGrade: (i) => grade[i] ?? null,
    gravarGrade(i, p) {
      if (i < grade.length) grade[i] = p;
      render();
    },
    mostrar(v) {
      raiz.hidden = !v;
      if (!v) livro.hidden = true;
    },
    definirLado(n) {
      if (n === lado) return;
      esvaziar();
      lado = n;
      grade = Array.from({ length: n * n }, () => null);
      montar();
      render();
    },
    devolver() {
      esvaziar();
      render();
    },
    render,
  };
}
