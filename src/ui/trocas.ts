import type { Inventario } from '../jogo/inventario';
import { obterItem } from '../jogo/itens';
import { podeTrocar, TROCAS, type Troca } from '../jogo/trocas';
import { povoadoDoTema } from '../temas/ativo';
import type { Profissao } from '../world/povoado';
import type { InventarioUI } from './inventario';

export const CSS_TROCAS = `
/* trocas são uma seção do inventário: sem fundo nem sombra próprios */
.painel-trocas { display: grid; gap: 10px; min-width: 0; }
.painel-trocas[hidden] { display: none; }
.painel-trocas .quem { font: 700 1.1rem var(--display); color: var(--tinta); }
.painel-trocas .quem small { display: block; font: 600 0.8rem var(--jogo); color: var(--tinta-suave); }
.lista-trocas { display: grid; gap: 8px; }
.troca {
  display: grid; grid-template-columns: auto auto auto 1fr; align-items: center; gap: 8px;
  padding: 6px 8px 10px; border-radius: 16px; background: rgba(243, 230, 204, 0.45);
}
.troca .dar { display: flex; gap: 4px; }
.troca .seta { color: var(--amarela-fundo); font-weight: 900; font-size: 1.2rem; }
.troca .slot { pointer-events: none; }
/* Trocar: peça verde; sem como pagar fica a peça creme apagada */
.troca button.fazer {
  --c: var(--verde); --f: var(--verde-fundo);
  justify-self: end; min-height: 46px; min-width: 92px; padding: 4px 14px; cursor: pointer;
  border: 0; border-radius: 14px; color: #173d12; font: 800 0.92rem var(--jogo);
  background: linear-gradient(to bottom, color-mix(in srgb, var(--c), white 35%) 0%, var(--c) 45%, color-mix(in srgb, var(--c), black 6%) 100%);
  box-shadow: 0 4px 0 var(--f), 0 7px 12px rgba(60, 35, 10, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.7);
  transition: transform 0.08s, box-shadow 0.08s;
}
.troca button.fazer:hover { filter: brightness(1.04); }
.troca button.fazer:focus-visible { outline: 3px solid var(--azul); outline-offset: 2px; }
.troca button.fazer:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--f); }
.troca button.fazer[aria-disabled='true'] {
  --c: var(--creme); --f: var(--creme-fundo); color: var(--tinta-suave); cursor: not-allowed; transform: none;
}
.troca.feita { animation: troca-feita 0.5s ease; }
@keyframes troca-feita { 40% { background: rgba(127, 208, 106, 0.45); } }
@media (prefers-reduced-motion: reduce) { .troca.feita { animation: none; } }
`;

export interface OpcoesTrocas {
  /** Avisos (faltam itens). */
  aviso(texto: string): void;
  /** Pede a troca ao núcleo (ele confere, faz e manda o inventário novo). */
  fazer(profissao: Profissao, t: Troca): void;
}

/** Descrição falada da troca (leitores de tela e dica do botão). */
function descrever(t: Troca): string {
  const nome = (item: string) => obterItem(item)?.nome ?? item;
  const dar = t.dar.map((d) => `${d.qtd} ${nome(d.item)}`).join(' e ');
  return `Dar ${dar} e receber ${t.receber.qtd} ${nome(t.receber.item)}`;
}

export function criarPainelTrocas(ui: InventarioUI, inv: Inventario, op: OpcoesTrocas) {
  const raiz = document.createElement('div');
  raiz.className = 'painel-trocas';
  raiz.hidden = true;
  raiz.setAttribute('data-painel-trocas', '');
  const quem = document.createElement('div');
  quem.className = 'quem';
  const lista = document.createElement('div');
  lista.className = 'lista-trocas';
  lista.setAttribute('role', 'list');
  raiz.append(quem, lista);
  ui.areaExtra.appendChild(raiz);

  let profissao: Profissao | null = null;
  const linhas: { troca: Troca; el: HTMLElement; botao: HTMLButtonElement }[] = [];

  const atualizar = () => {
    // indisponível continua focável (o leitor de tela lê a troca e o aviso de itens faltando)
    for (const l of linhas)
      l.botao.setAttribute('aria-disabled', String(!podeTrocar(inv, l.troca)));
  };
  inv.ouvir(() => {
    if (!raiz.hidden) atualizar();
  });

  function montar(p: Profissao): void {
    const tp = povoadoDoTema();
    lista.replaceChildren();
    linhas.length = 0;
    for (const t of TROCAS[p]) {
      const el = document.createElement('div');
      el.className = 'troca';
      el.setAttribute('role', 'listitem');
      el.dataset.troca = t.id;
      const dar = document.createElement('div');
      dar.className = 'dar';
      for (const d of t.dar) {
        const s = ui.criarSlot();
        s.tabIndex = -1;
        s.setAttribute('aria-hidden', 'true');
        ui.desenharSlot(s, { item: d.item, qtd: d.qtd });
        dar.appendChild(s);
      }
      const seta = document.createElement('span');
      seta.className = 'seta';
      seta.textContent = '→';
      seta.setAttribute('aria-hidden', 'true');
      const recebe = ui.criarSlot();
      recebe.tabIndex = -1;
      recebe.setAttribute('aria-hidden', 'true');
      ui.desenharSlot(recebe, { item: t.receber.item, qtd: t.receber.qtd });
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'fazer';
      botao.textContent = tp.textos.trocar;
      const desc = descrever(t);
      botao.setAttribute('aria-label', `${tp.textos.trocar}: ${desc}`);
      botao.title = desc;
      botao.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!profissao) return;
        if (!podeTrocar(inv, t)) {
          op.aviso(tp.textos.faltam);
          return;
        }
        el.classList.remove('feita');
        void el.offsetWidth;
        el.classList.add('feita');
        op.fazer(profissao, t);
      });
      el.append(dar, seta, recebe, botao);
      lista.appendChild(el);
      linhas.push({ troca: t, el, botao });
    }
  }

  return {
    elemento: raiz,
    abrir(p: Profissao, nome: string) {
      profissao = p;
      const tp = povoadoDoTema();
      quem.replaceChildren(nome);
      const sub = document.createElement('small');
      sub.textContent = `${tp.profissoes[p]} · ${tp.textos.trocas}`;
      quem.appendChild(sub);
      montar(p);
      atualizar();
      raiz.hidden = false;
      // o foco vai para a primeira troca (teclado e leitor de tela começam por ela)
      requestAnimationFrame(() => linhas[0]?.botao.focus());
    },
    fechar() {
      profissao = null;
      raiz.hidden = true;
    },
    get aberto() {
      return profissao;
    },
  };
}
