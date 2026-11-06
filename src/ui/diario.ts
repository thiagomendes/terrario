import { MISSOES, type Diario } from '../jogo/diario';
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
  position: absolute; top: 136px; left: 8px; max-width: 240px; padding: 6px 10px; border-radius: 10px;
  background: rgba(10, 12, 20, 0.5); color: #ece6da; font: 600 0.78rem system-ui, sans-serif;
  border-left: 3px solid #ffd98f; transform: scale(var(--escala-ui, 1)); transform-origin: top left;
}
.missao-hud small { display: block; color: #a59f93; font-weight: 500; margin-top: 2px; }
.missao-hud .barra-progresso { height: 4px; border-radius: 2px; background: rgba(255,255,255,0.12); margin-top: 4px; overflow: hidden; }
.missao-hud .barra-progresso i { display: block; height: 100%; background: linear-gradient(90deg, #ffd98f, #ffb35c); }
.diario .capitulo { margin: 14px 0 6px; font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.1em; color: #a59f93; }
.diario .missao { display: grid; grid-template-columns: 36px 1fr auto; gap: 10px; align-items: center; padding: 8px 10px; border-radius: 10px; background: rgba(255,255,255,0.03); margin-bottom: 4px; }
.diario .missao.feita { background: rgba(255, 217, 143, 0.08); }
.diario .missao .icone { font-size: 1.4rem; display: grid; place-items: center; filter: grayscale(0.6); }
.diario .icone-item, .missao-hud .icone-item { width: 28px; height: 28px; image-rendering: pixelated; vertical-align: middle; }
.missao-hud .icone-item { width: 18px; height: 18px; }
.diario .missao.feita .icone { filter: none; }
.diario .missao .nome { font-weight: 700; }
.diario .missao small { color: #a59f93; }
.diario .missao .estado { font: 700 0.8rem ui-monospace, monospace; color: #ffd98f; }
.diario .resumo { color: #cfc8bb; margin: 0 0 6px; }
/* paisagem baixa: cartão da missão compacto (não desce até o joystick) */
@media (orientation: landscape) and (max-height: 500px) {
  .missao-hud { max-width: 200px; padding: 4px 8px; }
  .missao-hud small { display: none; }
}
.toast.conquista { border-color: rgba(255, 217, 143, 0.6); background: linear-gradient(90deg, rgba(60, 44, 12, 0.92), rgba(18, 16, 24, 0.92)); }
`;

export function criarUiDiario(
  raiz: HTMLElement,
  hud: HTMLElement,
  d: Diario,
  op: { aoFechar?: () => void } = {},
) {
  // overlay 'diario': perder o ponteiro ao abrir não abre a pausa por baixo
  const modal = criarModal('Diário', 'data-diario', 'diario');
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
    r.textContent = `${d.total} de ${MISSOES.length} conquistas`;
    corpo.appendChild(r);
    let capitulo = '';
    for (const m of MISSOES) {
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
