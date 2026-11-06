import { icone, rotuloComIcone } from './pixicones';
import type { Inventario, Pilha, Slot } from '../jogo/inventario';
import { obterItem } from '../jogo/itens';
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
import type { InventarioUI } from './inventario';

export const CSS_CRIACAO = `
.criacao { display: grid; gap: 8px; }
.criacao[hidden] { display: none; }
.criacao .linha-criacao { display: flex; align-items: center; gap: 10px; }
.criacao .grade-criacao { display: grid; gap: 4px; }
.criacao .seta { font-size: 1.6rem; color: #a59f93; }
.criacao .resultado { width: calc(var(--slot) * 1.25); height: calc(var(--slot) * 1.25); }
.criacao .resultado.pronto { border-color: #ffd98f; box-shadow: 0 0 12px rgba(255, 217, 143, 0.35); }
.livro { display: grid; gap: 8px; min-width: min(320px, 80vw); }
.livro input {
  min-height: 36px; padding: 6px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.3); color: #ece6da; font: 500 0.9rem system-ui, sans-serif;
}
.livro .lista { display: grid; gap: 4px; max-height: calc(var(--slot) * 4.6); overflow-y: auto; padding-right: 4px; }
.receita {
  display: grid; grid-template-columns: 36px 1fr; gap: 8px; align-items: center; text-align: left;
  padding: 4px 8px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.03); color: #b9b2a6; cursor: pointer; font: 600 0.82rem system-ui, sans-serif;
}
.receita:hover { background: rgba(255,255,255,0.09); }
.receita.disponivel { color: #fff; border-color: rgba(255, 217, 143, 0.35); }
.receita.bloqueada { opacity: 0.55; }
.receita img { width: 32px; height: 32px; image-rendering: pixelated; }
.receita .ingr { display: flex; gap: 2px; margin-top: 2px; flex-wrap: wrap; }
.receita .ingr img { width: 16px; height: 16px; }
.receita small { font-weight: 500; color: #8f897e; }
.receita.mesa-necessaria::after { content: 'mesa'; font-size: 0.66rem; color: #ffb39f; margin-left: 4px; }
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
  /** Devolve à mochila o que ficou na grade (ao fechar). */
  devolver(): void;
  render(): void;
}

export function criarCriacao(
  ui: InventarioUI,
  inv: Inventario,
  op: { criativo: () => boolean; aoFabricar?: (r: Receita) => void },
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
  const lista = document.createElement('div');
  lista.className = 'lista';
  livro.append(busca, lista);
  botaoLivro.addEventListener('mousedown', (e) => {
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
    const itens = RECEITAS.map((r) => ({ r, def: obterItem(r.resultado.item) }))
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
      el.addEventListener('mousedown', (e) => {
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
    if (botao === 'direito' && cursor) {
      if (!s) {
        grade[i] = { ...cursor, qtd: 1 };
        novo = cursor.qtd > 1 ? { ...cursor, qtd: cursor.qtd - 1 } : null;
      } else if (s.item === cursor.item) {
        s.qtd += 1;
        novo = cursor.qtd > 1 ? { ...cursor, qtd: cursor.qtd - 1 } : null;
      }
    } else if (shift && s && !cursor) {
      const resto = inv.adicionar(s.item, s.qtd, s.dur);
      grade[i] = resto > 0 ? { ...s, qtd: resto } : null;
    } else if (cursor && s && s.item === cursor.item && s.dur === undefined) {
      s.qtd += cursor.qtd;
      novo = null;
    } else {
      grade[i] = cursor ? { ...cursor } : null;
      novo = s;
    }
    render();
    return novo;
  });

  function devolver(): void {
    for (const p of grade) if (p) inv.adicionar(p.item, p.qtd, p.dur);
    grade = Array.from({ length: lado * lado }, () => null);
  }

  montar();
  return {
    mostrar(v) {
      raiz.hidden = !v;
      if (!v) livro.hidden = true;
    },
    definirLado(n) {
      if (n === lado) return;
      devolver();
      lado = n;
      grade = Array.from({ length: n * n }, () => null);
      montar();
      render();
    },
    devolver() {
      devolver();
      render();
    },
    render,
  };
}
