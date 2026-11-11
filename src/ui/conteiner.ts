import type { Slot } from '../jogo/inventario';
import type { EstadoFornalha } from '../jogo/fornalha';
import { COMBUSTIVEL, FUNDICAO } from '../jogo/receitas';
import { obterItem } from '../jogo/itens';
import type { Inventario } from '../jogo/inventario';
import type { InventarioUI } from './inventario';

export const CSS_CONTEINER = `
/* baú e fornalha são seções do inventário: sem fundo nem sombra próprios */
.painel-conteiner { display: grid; gap: 8px; }
.painel-conteiner[hidden] { display: none; }
.painel-fornalha { display: grid; grid-template-columns: auto auto auto; align-items: center; gap: 10px 16px; }
.painel-fornalha .coluna { display: grid; gap: 8px; justify-items: center; }
.painel-fornalha .chama { width: 30px; height: 30px; position: relative; }
.painel-fornalha .chama::before, .painel-fornalha .chama i {
  content: ''; position: absolute; inset: 0; border-radius: 50% 50% 40% 40%;
  background: var(--poco);
  clip-path: polygon(50% 0, 80% 35%, 95% 70%, 75% 100%, 25% 100%, 5% 70%, 20% 35%);
}
.painel-fornalha .chama i { background: linear-gradient(0deg, #f06a1e, #ffd45a); clip-path: inset(var(--vazio, 100%) 0 0 0); }
.painel-fornalha .progresso { width: 56px; height: 12px; border-radius: 6px; background: var(--poco); box-shadow: var(--sombra-poco); overflow: hidden; }
.painel-fornalha .progresso i { display: block; height: 100%; width: 0; border-radius: 6px; background: linear-gradient(90deg, #ffd45a, #ff9b2f); }
.grade-bau { display: grid; grid-template-columns: repeat(9, var(--slot)); gap: 5px; }
`;

export const TAMANHO_BAU = 27;

const maxPilha = (item: string) => obterItem(item)?.pilha ?? 64;

/** Troca entre um slot do contêiner e o cursor, respeitando o máximo da pilha. */
export function trocar(alvo: Slot, cursor: Slot, botao: 'esquerdo' | 'direito'): [Slot, Slot] {
  if (botao === 'direito') {
    if (!cursor && alvo) {
      const metade = Math.ceil(alvo.qtd / 2);
      const resto = alvo.qtd - metade;
      return [resto > 0 ? { ...alvo, qtd: resto } : null, { ...alvo, qtd: metade }];
    }
    if (
      cursor &&
      (!alvo ||
        (alvo.item === cursor.item && alvo.dur === undefined && alvo.qtd < maxPilha(alvo.item)))
    ) {
      const novo = alvo ? { ...alvo, qtd: alvo.qtd + 1 } : { ...cursor, qtd: 1 };
      return [novo, cursor.qtd > 1 ? { ...cursor, qtd: cursor.qtd - 1 } : null];
    }
    return [alvo, cursor];
  }
  if (cursor && alvo && alvo.item === cursor.item && alvo.dur === undefined) {
    const max = maxPilha(alvo.item);
    const n = Math.min(max - alvo.qtd, cursor.qtd);
    const resto = cursor.qtd - n;
    return [{ ...alvo, qtd: alvo.qtd + n }, resto > 0 ? { ...cursor, qtd: resto } : null];
  }
  return [cursor ? { ...cursor } : null, alvo];
}

/**
 * Junta uma pilha nos slots (primeiro nas pilhas iguais, depois nos vazios).
 * Devolve o que não coube (null = coube tudo).
 */
export function juntarEm(slots: Slot[], indices: readonly number[], p: NonNullable<Slot>): Slot {
  let resto = p.qtd;
  const max = maxPilha(p.item);
  if (p.dur === undefined)
    for (const i of indices) {
      const s = slots[i];
      if (resto <= 0) break;
      if (s && s.item === p.item && s.dur === undefined && s.qtd < max) {
        const n = Math.min(max - s.qtd, resto);
        slots[i] = { ...s, qtd: s.qtd + n };
        resto -= n;
      }
    }
  for (const i of indices) {
    if (resto <= 0) break;
    if (!slots[i]) {
      const n = Math.min(max, resto);
      slots[i] = { ...p, qtd: n };
      resto -= n;
    }
  }
  return resto > 0 ? { ...p, qtd: resto } : null;
}

/**
 * Pega a saída da fornalha para o cursor sem passar do máximo da pilha.
 * Devolve o novo cursor, o que fica na saída e quanto foi pego (0 = nada).
 */
export function pegarSaida(cursor: Slot, saida: Slot): { cursor: Slot; saida: Slot; pego: number } {
  if (!saida || (cursor && cursor.item !== saida.item)) return { cursor, saida, pego: 0 };
  const atual = cursor?.qtd ?? 0;
  const n = Math.max(0, Math.min(maxPilha(saida.item) - atual, saida.qtd));
  if (n === 0) return { cursor, saida, pego: 0 };
  const resto = saida.qtd - n;
  return {
    cursor: cursor ? { ...cursor, qtd: atual + n } : { ...saida, qtd: n },
    saida: resto > 0 ? { ...saida, qtd: resto } : null,
    pego: n,
  };
}

export function criarPainelBau(ui: InventarioUI, inv: Inventario) {
  const raiz = document.createElement('div');
  raiz.className = 'painel-conteiner';
  raiz.hidden = true;
  raiz.setAttribute('data-painel-bau', '');
  const rot = document.createElement('div');
  rot.className = 'rotulo-secao';
  rot.textContent = 'Baú';
  const grade = document.createElement('div');
  grade.className = 'grade-bau';
  const slots = Array.from({ length: TAMANHO_BAU }, (_, i) => {
    const s = ui.criarSlot();
    s.dataset.externo = `bau:${i}`;
    grade.appendChild(s);
    return s;
  });
  raiz.append(rot, grade);
  ui.areaExtra.appendChild(raiz);
  let conteudo: Slot[] | null = null;
  const render = () => slots.forEach((s, i) => ui.desenharSlot(s, conteudo?.[i] ?? null));
  ui.clicarExterno((el, cursor, botao, shift) => {
    const a = el.dataset.externo ?? '';
    if (!a.startsWith('bau:') || !conteudo) return cursor;
    const i = Number(a.slice(4));
    if (shift && !cursor && conteudo[i]) {
      const p = conteudo[i]!;
      const resto = inv.adicionar(p.item, p.qtd, p.dur);
      conteudo[i] = resto > 0 ? { ...p, qtd: resto } : null;
      render();
      return cursor;
    }
    const [novo, c] = trocar(conteudo[i], cursor, botao);
    conteudo[i] = novo;
    render();
    return c;
  });
  // Shift+clique na mochila com o baú aberto: vai para o baú
  ui.moverRapidoPara((p) => {
    if (!conteudo) return undefined;
    const resto = juntarEm(
      conteudo,
      Array.from({ length: TAMANHO_BAU }, (_, k) => k),
      p,
    );
    render();
    return resto;
  });
  return {
    elemento: raiz,
    abrir(c: Slot[]) {
      conteudo = c;
      raiz.hidden = false;
      render();
    },
    fechar() {
      conteudo = null;
      raiz.hidden = true;
    },
    /** Redesenha (o conteúdo mudou fora da tela: outro jogador, o núcleo). */
    render,
    get aberto() {
      return conteudo !== null;
    },
  };
}

export function criarPainelFornalha(ui: InventarioUI) {
  const raiz = document.createElement('div');
  raiz.className = 'painel-conteiner';
  raiz.hidden = true;
  raiz.setAttribute('data-painel-fornalha', '');
  const rot = document.createElement('div');
  rot.className = 'rotulo-secao';
  rot.textContent = 'Fornalha';
  const corpo = document.createElement('div');
  corpo.className = 'painel-fornalha';
  const col1 = document.createElement('div');
  col1.className = 'coluna';
  const entrada = ui.criarSlot();
  entrada.dataset.externo = 'forn:entrada';
  entrada.title = 'Item para fundir ou cozinhar';
  const chama = document.createElement('div');
  chama.className = 'chama';
  const chamaI = document.createElement('i');
  chama.appendChild(chamaI);
  const comb = ui.criarSlot();
  comb.dataset.externo = 'forn:comb';
  comb.title = 'Combustível (carvão, madeira, gravetos)';
  col1.append(entrada, chama, comb);
  const prog = document.createElement('div');
  prog.className = 'progresso';
  const progI = document.createElement('i');
  prog.appendChild(progI);
  const saida = ui.criarSlot();
  saida.classList.add('resultado');
  saida.dataset.externo = 'forn:saida';
  corpo.append(col1, prog, saida);
  raiz.append(rot, corpo);
  ui.areaExtra.appendChild(raiz);

  let f: EstadoFornalha | null = null;
  const render = () => {
    if (!f) return;
    ui.desenharSlot(entrada, f.entrada);
    ui.desenharSlot(comb, f.combustivel);
    ui.desenharSlot(saida, f.saida);
    const q = f.queimaTotal > 0 ? f.queima / f.queimaTotal : 0;
    chamaI.style.setProperty('--vazio', `${(1 - q) * 100}%`);
    progI.style.width = `${Math.min(1, f.progresso) * 100}%`;
  };
  ui.clicarExterno((el, cursor, botao) => {
    const a = el.dataset.externo ?? '';
    if (!a.startsWith('forn:') || !f) return cursor;
    if (a === 'forn:saida') {
      const r = pegarSaida(cursor, f.saida);
      if (r.pego === 0) return cursor;
      window.dispatchEvent(
        new CustomEvent('brumaluz:fundiu', { detail: { ...f.saida!, qtd: r.pego } }),
      );
      f.saida = r.saida;
      render();
      return r.cursor;
    }
    const campo = a === 'forn:entrada' ? 'entrada' : 'combustivel';
    // só aceita o que serve para aquele slot
    if (cursor && campo === 'entrada' && !FUNDICAO[cursor.item]) return cursor;
    if (cursor && campo === 'combustivel' && !COMBUSTIVEL[cursor.item]) return cursor;
    const [novo, c] = trocar(f[campo], cursor, botao);
    f[campo] = novo;
    render();
    return c;
  });
  // Shift+clique na mochila com a fornalha aberta: o que funde vai para a entrada, o que
  // queima vai para o combustível
  ui.moverRapidoPara((p) => {
    if (!f) return undefined;
    const campo = FUNDICAO[p.item] ? 'entrada' : COMBUSTIVEL[p.item] ? 'combustivel' : null;
    if (!campo) return undefined;
    const slots: Slot[] = [f[campo]];
    const resto = juntarEm(slots, [0], p);
    f[campo] = slots[0];
    render();
    return resto;
  });
  return {
    elemento: raiz,
    abrir(estado: EstadoFornalha) {
      f = estado;
      raiz.hidden = false;
      render();
    },
    fechar() {
      f = null;
      raiz.hidden = true;
    },
    render,
    get aberta() {
      return f;
    },
  };
}
