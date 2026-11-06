import type { Inventario } from '../jogo/inventario';
import { obterItem } from '../jogo/itens';
import { fazerTroca, podeTrocar, TROCAS, type Troca } from '../jogo/trocas';
import { povoadoDoTema } from '../temas/ativo';
import type { Profissao } from '../world/povoado';
import type { InventarioUI } from './inventario';

export const CSS_TROCAS = `
.painel-trocas { display: grid; gap: 8px; min-width: 0; }
.painel-trocas[hidden] { display: none; }
.painel-trocas .quem { font-weight: 800; font-size: 1rem; color: #ffd98f; }
.painel-trocas .quem small { display: block; font-weight: 600; font-size: 0.78rem; color: #cfc6dc; }
.lista-trocas { display: grid; gap: 6px; }
.troca {
  display: grid; grid-template-columns: auto auto auto 1fr; align-items: center; gap: 8px;
  padding: 4px 6px; border: 2px solid #120e16; background: rgba(255, 255, 255, 0.05);
}
.troca .dar { display: flex; gap: 4px; }
.troca .seta { color: #cfc6dc; font-weight: 800; }
.troca .slot { pointer-events: none; }
.troca button.fazer {
  justify-self: end; min-height: 48px; min-width: 92px; padding: 4px 12px; cursor: pointer;
  border: 2px solid #120e16; background: #4c7a3e; color: #f6f2ea; font: 800 0.9rem system-ui, sans-serif;
  box-shadow: inset 2px 2px 0 rgba(255, 255, 255, 0.2), inset -2px -3px 0 rgba(0, 0, 0, 0.35);
}
.troca button.fazer:hover, .troca button.fazer:focus-visible { filter: brightness(1.15); outline: 3px solid #ffd98f; outline-offset: 1px; }
.troca button.fazer:disabled { background: #3a3542; color: #9a93a6; cursor: not-allowed; filter: none; }
.troca.feita { animation: troca-feita 0.5s ease; }
@keyframes troca-feita { 40% { background: rgba(140, 220, 120, 0.3); } }
@media (prefers-reduced-motion: reduce) { .troca.feita { animation: none; } }
`;

export interface OpcoesTrocas {
  /** Solta no chão o que não couber no inventário. */
  soltar(item: string, qtd: number): void;
  /** Avisos (faltam itens) e eventos de troca feita (diário, voz). */
  aviso(texto: string): void;
  trocou(profissao: Profissao, t: Troca): void;
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
    for (const l of linhas) l.botao.disabled = !podeTrocar(inv, l.troca);
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
        if (!fazerTroca(inv, t, op.soltar)) {
          op.aviso(tp.textos.faltam);
          return;
        }
        el.classList.remove('feita');
        void el.offsetWidth;
        el.classList.add('feita');
        op.trocou(profissao, t);
        ui.render();
        atualizar();
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
