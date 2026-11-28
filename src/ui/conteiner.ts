import type { Slot } from '../jogo/inventario';
import type { EstadoFornalha } from '../jogo/fornalha';
import { mudancaAceita, noFogao, type EstadoFogao } from '../jogo/fogao';
import { icone as iconePix } from './pixicones';
import { iconeDoItem } from './icones';
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
/* spec 039b: o ícone do móvel ao lado do nome (a geladeira e o fogão) e o fogão sem carvão */
.painel-conteiner .rotulo-secao { display: flex; align-items: center; gap: 8px; }
.painel-conteiner .icone-conteiner { width: 40px; height: 40px; margin: -6px 0; image-rendering: pixelated; filter: drop-shadow(0 2px 1px rgba(90, 55, 20, 0.3)); }
.painel-fogao { grid-template-columns: auto auto auto; }
/* (portão visual) a seta em cima da barrinha e a sombrinha do que vai sair */
.painel-fogao .meio-fogao { display: grid; justify-items: center; gap: 4px; }
.painel-fogao .seta-fogao { font-size: 1.4rem; color: #e39a2b; }
.painel-fogao .lugar-saida-fogao { position: relative; }
.painel-fogao .sombra-saida { position: absolute; inset: 12%; width: 76%; height: 76%; opacity: 0.35; pointer-events: none; }
.painel-fogao .sombra-saida[hidden] { display: none; }
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

/**
 * Spec 039b: o painel de lugares (o baú, e a geladeira: 9 lugares, só comida). `aceita` é a mesma
 * regra do núcleo (`mudancaAceita`): o que não serve nem entra na tela.
 */
export interface OpcoesPainelLugares {
  tamanho: number;
  /** O prefixo dos lugares (`bau:3`, `gel:3`). */
  prefixo: string;
  rotulo: string;
  /** O ícone do móvel ao lado do nome (a geladeira). */
  icone?: () => string;
  /** O lugar `i` aceita esta mudança (antes → depois)? Sem ela, tudo entra (o baú). */
  aceita?: (i: number, antes: Slot, depois: Slot) => boolean;
}

/** O nome do painel com o ícone do móvel na frente (spec 039b). */
function rotuloComIconeDoMovel(rot: HTMLElement, texto: string, icone?: () => string) {
  rot.textContent = texto;
  if (!icone) return () => undefined;
  const img = document.createElement('img');
  img.className = 'icone-conteiner';
  img.alt = '';
  img.src = icone();
  rot.prepend(img);
  // (o ícone de brinquedo chega depois: troca no lugar)
  return () => {
    img.src = icone();
  };
}

export function criarPainelBau(ui: InventarioUI, inv: Inventario, op?: OpcoesPainelLugares) {
  const tamanho = op?.tamanho ?? TAMANHO_BAU;
  const prefixo = op?.prefixo ?? 'bau';
  const aceita = op?.aceita ?? (() => true);
  const raiz = document.createElement('div');
  raiz.className = 'painel-conteiner';
  raiz.hidden = true;
  raiz.setAttribute(prefixo === 'bau' ? 'data-painel-bau' : `data-painel-${prefixo}`, '');
  const rot = document.createElement('div');
  rot.className = 'rotulo-secao';
  const icone = rotuloComIconeDoMovel(rot, op?.rotulo ?? 'Baú', op?.icone);
  const grade = document.createElement('div');
  grade.className = 'grade-bau';
  const slots = Array.from({ length: tamanho }, (_, i) => {
    const s = ui.criarSlot();
    s.dataset.externo = `${prefixo}:${i}`;
    grade.appendChild(s);
    return s;
  });
  raiz.append(rot, grade);
  ui.areaExtra.appendChild(raiz);
  let conteudo: Slot[] | null = null;
  const render = () => {
    icone();
    slots.forEach((s, i) => ui.desenharSlot(s, conteudo?.[i] ?? null));
  };
  ui.clicarExterno((el, cursor, botao, shift) => {
    const a = el.dataset.externo ?? '';
    if (!a.startsWith(`${prefixo}:`) || !conteudo) return cursor;
    const i = Number(a.slice(prefixo.length + 1));
    if (shift && !cursor && conteudo[i]) {
      const p = conteudo[i]!;
      const resto = inv.adicionar(p.item, p.qtd, p.dur);
      conteudo[i] = resto > 0 ? { ...p, qtd: resto } : null;
      render();
      return cursor;
    }
    const [novo, c] = trocar(conteudo[i], cursor, botao);
    // (o que o lugar não aceita fica na mão: o graveto não entra na geladeira nem por um quadro)
    if (!aceita(i, conteudo[i], novo)) return cursor;
    conteudo[i] = novo;
    render();
    return c;
  });
  // Shift+clique na mochila com o baú aberto: vai para o baú (o que o lugar não aceita, não)
  ui.moverRapidoPara((p) => {
    if (!conteudo || !aceita(0, null, p)) return undefined;
    const resto = juntarEm(
      conteudo,
      Array.from({ length: tamanho }, (_, k) => k),
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

/**
 * Spec 039b: o painel do fogão: a entrada (só o que ele cozinha) e a saída (só tirar), sem lugar
 * de carvão; o progresso vem do núcleo. A regra é a mesma do núcleo (`mudancaAceita`).
 */
export function criarPainelFogao(ui: InventarioUI, icone?: () => string) {
  const raiz = document.createElement('div');
  raiz.className = 'painel-conteiner';
  raiz.hidden = true;
  raiz.setAttribute('data-painel-fogao', '');
  const rot = document.createElement('div');
  rot.className = 'rotulo-secao';
  const desenharIcone = rotuloComIconeDoMovel(rot, 'Fogão', icone);
  const corpo = document.createElement('div');
  corpo.className = 'painel-fornalha painel-fogao';
  const entrada = ui.criarSlot();
  entrada.dataset.externo = 'fog:entrada';
  entrada.title = 'Comida para cozinhar';
  // (portão visual) a seta em cima da barrinha: a comida vai da entrada para a saída
  const meio = document.createElement('div');
  meio.className = 'meio-fogao';
  const seta = iconePix('seta');
  seta.classList.add('seta-fogao');
  const prog = document.createElement('div');
  prog.className = 'progresso';
  const progI = document.createElement('i');
  prog.appendChild(progI);
  meio.append(seta, prog);
  const saida = ui.criarSlot();
  saida.classList.add('resultado');
  saida.dataset.externo = 'fog:saida';
  // a sombrinha do que vai sair (meio transparente), com a saída vazia e comida na entrada
  const lugarSaida = document.createElement('div');
  lugarSaida.className = 'lugar-saida-fogao';
  const sombra = document.createElement('img');
  sombra.className = 'sombra-saida';
  sombra.alt = '';
  sombra.hidden = true;
  sombra.setAttribute('data-sombra-saida', '');
  lugarSaida.append(saida, sombra);
  corpo.append(entrada, meio, lugarSaida);
  raiz.append(rot, corpo);
  ui.areaExtra.appendChild(raiz);

  let f: EstadoFogao | null = null;
  const render = () => {
    desenharIcone();
    if (!f) return;
    ui.desenharSlot(entrada, f.entrada);
    ui.desenharSlot(saida, f.saida);
    progI.style.width = `${Math.min(1, f.progresso) * 100}%`;
    const vai = !f.saida && f.entrada ? noFogao(f.entrada.item) : undefined;
    sombra.hidden = !vai;
    if (vai) {
      sombra.src = iconeDoItem(vai);
      sombra.dataset.item = vai;
    }
  };
  ui.clicarExterno((el, cursor, botao) => {
    const a = el.dataset.externo ?? '';
    if (!a.startsWith('fog:') || !f) return cursor;
    if (a === 'fog:saida') {
      const r = pegarSaida(cursor, f.saida);
      if (r.pego === 0) return cursor;
      f.saida = r.saida;
      render();
      return r.cursor;
    }
    const [novo, c] = trocar(f.entrada, cursor, botao);
    // só o que o fogão cozinha entra (a mesma regra do núcleo); o resto fica na mão
    if (!mudancaAceita('fog', 0, f.entrada, novo)) return cursor;
    f.entrada = novo;
    render();
    return c;
  });
  // Shift+clique na mochila com o fogão aberto: o que ele cozinha vai para a entrada
  ui.moverRapidoPara((p) => {
    if (!f || !mudancaAceita('fog', 0, null, p)) return undefined;
    const slots: Slot[] = [f.entrada];
    const resto = juntarEm(slots, [0], p);
    f.entrada = slots[0];
    render();
    return resto;
  });
  return {
    elemento: raiz,
    abrir(estado: EstadoFogao) {
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
