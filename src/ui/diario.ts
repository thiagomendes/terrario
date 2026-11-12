import { tema } from '../temas/ativo';
import type { Diario } from '../jogo/diario';
import { criarModal } from './mundos';
import { iconeDoItem } from './icones';
import { icone, type NomeIcone, PIXICONES } from './pixicones';

/** Ícone da missão: item do jogo ou pixícone. */
function iconeMissao(nome: string): HTMLElement {
  if (nome.startsWith('item:')) {
    const img = document.createElement('img');
    img.src = iconeDoItem(nome.slice(5));
    img.alt = '';
    img.className = 'icone-item';
    return img;
  }
  return icone((nome in PIXICONES ? nome : 'ok') as NomeIcone);
}

export const CSS_DIARIO = `
.missao-hud {
  position: absolute; top: 136px; left: 8px; max-width: 240px; padding: 7px 12px 8px; border-radius: 16px;
  background: rgba(255, 250, 240, 0.9); color: var(--tinta); font: 800 0.78rem var(--jogo);
  box-shadow: 0 3px 0 rgba(150, 110, 60, 0.35);
  transform: scale(var(--escala-ui, 1)); transform-origin: top left;
}
.missao-hud small { display: block; color: var(--tinta-suave); font-weight: 700; margin-top: 2px; }
.missao-hud .barra-progresso { height: 7px; border-radius: 4px; background: #f0e2c8; margin-top: 5px; overflow: hidden; }
.missao-hud .barra-progresso i { display: block; height: 100%; border-radius: 4px; background: linear-gradient(90deg, #8fdc6f, #5cbf4f); }
.diario .capitulo { margin: 16px 0 8px; font-size: 0.74rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--tinta-suave); }
.diario .missao {
  display: grid; grid-template-columns: 40px 1fr auto; gap: 10px; align-items: center; padding: 8px 12px; margin-bottom: 6px;
  border-radius: 16px; background: var(--poco); box-shadow: var(--sombra-poco);
}
.diario .missao.feita { background: #e4f6d8; box-shadow: inset 0 0 0 2px var(--verde); }
.diario .missao .icone { font-size: 1.4rem; display: grid; place-items: center; filter: grayscale(0.5); opacity: 0.8; }
.diario .icone-item, .missao-hud .icone-item { width: 28px; height: 28px; vertical-align: middle; }
.missao-hud .icone-item { width: 18px; height: 18px; }
.diario .missao.feita .icone { filter: none; opacity: 1; }
.diario .missao .nome { font-weight: 800; color: var(--tinta); }
.diario .missao small { font-weight: 600; color: var(--tinta-suave); }
.diario .missao .estado { font: 800 0.82rem var(--jogo); color: var(--tinta); }
.diario .missao.feita .estado { color: #24661c; }
.diario .resumo { margin: 0 0 6px; font-weight: 700; color: var(--tinta); }
/* paisagem baixa: cartão da missão compacto (não desce até o joystick) */
@media (orientation: landscape) and (max-height: 500px) {
  .missao-hud { max-width: 200px; padding: 4px 8px; }
  .missao-hud small { display: none; }
}
`;

export function criarUiDiario(
  raiz: HTMLElement,
  hud: HTMLElement,
  d: Diario,
  op: { aoFechar?: () => void } = {},
) {
  // overlay 'diario': perder o ponteiro ao abrir não abre a pausa por baixo
  const modal = criarModal(tema().textos.diario, 'data-diario', 'diario');
  const { fundo, corpo } = modal;
  if (op.aoFechar) modal.aoFechar(op.aoFechar);
  corpo.classList.add('diario');
  raiz.appendChild(fundo);
  const cartao = document.createElement('div');
  cartao.className = 'missao-hud';
  cartao.setAttribute('data-missao-atual', '');
  hud.appendChild(cartao);

  function renderHud(): void {
    const m = d.atual();
    cartao.hidden = !m;
    if (!m) return;
    cartao.replaceChildren();
    cartao.append(iconeMissao(m.icone), ` ${m.titulo}`);
    const s = document.createElement('small');
    s.textContent = m.descricao;
    const b = document.createElement('div');
    b.className = 'barra-progresso';
    const i = document.createElement('i');
    i.style.width = `${d.progresso(m) * 100}%`;
    b.appendChild(i);
    cartao.append(s, b);
  }

  function render(): void {
    corpo.replaceChildren();
    const r = document.createElement('p');
    r.className = 'resumo';
    r.textContent = `${d.total} de ${d.missoes.length} conquistas`;
    corpo.appendChild(r);
    let capitulo = '';
    for (const m of d.missoes) {
      if (m.capitulo !== capitulo) {
        capitulo = m.capitulo;
        const h = document.createElement('div');
        h.className = 'capitulo';
        h.textContent = capitulo;
        corpo.appendChild(h);
      }
      const feita = d.concluida(m.id);
      const el = document.createElement('div');
      el.className = `missao${feita ? ' feita' : ''}`;
      const ic = document.createElement('div');
      ic.className = 'icone';
      ic.appendChild(iconeMissao(m.icone));
      const t = document.createElement('div');
      const n = document.createElement('div');
      n.className = 'nome';
      n.textContent = m.titulo;
      const s = document.createElement('small');
      s.textContent = m.descricao;
      t.append(n, s);
      const e = document.createElement('div');
      e.className = 'estado';
      if (feita) e.appendChild(icone('ok'));
      else e.textContent = `${Math.round(d.progresso(m) * 100)}%`;
      el.append(ic, t, e);
      corpo.appendChild(el);
    }
  }

  renderHud();
  return {
    alternar() {
      if (!modal.aberto) {
        render();
        modal.abrir();
      } else modal.fechar();
      return modal.aberto;
    },
    renderHud,
  };
}
