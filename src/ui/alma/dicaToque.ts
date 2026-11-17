/**
 * A dica de toque (pedido do dono, 16 nov 2026: no suporte dos patins "tem que adivinhar"): perto
 * de uma coisa que se toca, a mãozinha do jogo toca nela (a mesma da obra e do canto das
 * missões) e um balãozinho mostra o que o toque faz, com um desenho que uma criança de 3 anos
 * entende sem ler (os patins com a setinha de calçar ou de tirar; a cadeirinha do brinquedo) e
 * duas ou três palavras para quem já lê.
 *
 * A tela continua limpa: uma dica por vez, só perto e com a coisa à vista, longe dos botões das
 * bordas; some quando a criança usa ou vai embora, e nunca pega o dedo (não é botão).
 */
import { CSS_MAO, MAO_SVG } from './maoObra';

const CSS = `
.dica-toque { position: fixed; left: 0; top: 0; z-index: 8; pointer-events: none; opacity: 0;
  display: flex; align-items: center; gap: 8px; padding: 6px 14px 6px 8px; border-radius: 999px;
  background: rgba(255, 250, 240, 0.95); color: #3b2a1e; white-space: nowrap;
  font: 800 15px var(--jogo, system-ui), sans-serif;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9), 0 3px 0 rgba(150, 110, 60, 0.35), 0 6px 14px rgba(40, 25, 10, 0.25);
  transform: translate(var(--x), var(--y)) translate(-50%, -100%) scale(0.6); transition: opacity 0.18s, transform 0.22s cubic-bezier(.2,1.5,.4,1); }
.dica-toque.mostra { opacity: 1; transform: translate(var(--x), var(--y)) translate(-50%, -100%) scale(1); }
.dica-toque .dica-figura { width: 40px; height: 40px; flex: none; }
.dica-toque .dica-figura svg { width: 100%; height: 100%; display: block; }
body[data-overlay] .dica-toque, body.modo-foto .dica-toque, body.tela-titulo .dica-toque,
body[data-overlay] [data-dica-toque], body.modo-foto [data-dica-toque], body.tela-titulo [data-dica-toque] { display: none; }
@media (prefers-reduced-motion: reduce) { .dica-toque { transition: opacity 0.18s; } }
`;

export interface Dica {
  /** O nome da dica (muda quando muda o que o toque faz: calçar ou tirar). */
  chave: string;
  /** Onde a coisa está na tela (a ponta do dedo da mãozinha). */
  t: { x: number; y: number };
  /** O desenho (SVG) e as palavras. */
  figura: string;
  texto: string;
  /** Só o balãozinho, sem a mãozinha que toca (a dica não é de tocar: guiar, parar no tapete). */
  semMao?: boolean;
}

export interface DicaToque {
  /** A dica de agora (null: nenhuma). */
  mostrar(d: Dica | null): void;
  /** Testes: a dica à vista. */
  estado(): { chave: string; texto: string; t: { x: number; y: number } } | null;
}

/** Os controles de toque à vista (o joystick e os botões de pular e correr), lidos de vez em quando. */
let controles: { ate: number; larg: number; alt: number; caixas: DOMRect[] } | null = null;
const LONGE_DOS_CONTROLES = 48;
function caixasDosControles(larg: number, alt: number): DOMRect[] {
  const agora = performance.now();
  if (controles && controles.ate > agora && controles.larg === larg && controles.alt === alt)
    return controles.caixas;
  const caixas: DOMRect[] = [];
  if (typeof document === 'undefined') return caixas;
  const toque = document.querySelector<HTMLElement>('[data-toque]');
  if (toque && !toque.hidden)
    for (const el of toque.querySelectorAll<HTMLElement>('.joystick, .botoes > *')) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) caixas.push(r);
    }
  controles = { ate: agora + 1000, larg, alt, caixas };
  return caixas;
}

/**
 * A coisa está num lugar bom da tela para a dica (longe dos botões das bordas e dos controles de
 * toque: a mãozinha em cima do joystick confunde, e o dedo da criança ali pega o joystick)?
 */
export function boaParaDica(t: { x: number; y: number }, larg: number, alt: number): boolean {
  if (!(t.x > 70 && t.x < larg - 70 && t.y > 120 && t.y < alt - 150)) return false;
  const m = LONGE_DOS_CONTROLES;
  for (const r of caixasDosControles(larg, alt))
    if (t.x > r.left - m && t.x < r.right + m && t.y > r.top - m && t.y < r.bottom + m) return false;
  return true;
}

export function criarDicaToque(): DicaToque {
  const st = document.createElement('style');
  st.textContent = CSS_MAO + CSS;
  document.head.appendChild(st);
  const mao = document.createElement('div');
  mao.className = 'guia-mao';
  mao.setAttribute('data-dica-toque', 'mao');
  mao.innerHTML = MAO_SVG;
  const onda = document.createElement('div');
  onda.className = 'guia-onda';
  onda.setAttribute('data-dica-toque', 'onda');
  const balao = document.createElement('div');
  balao.className = 'dica-toque';
  const figura = document.createElement('span');
  figura.className = 'dica-figura';
  const texto = document.createElement('span');
  balao.append(figura, texto);
  document.body.append(onda, mao, balao);
  let atual: Dica | null = null;
  return {
    mostrar(d) {
      if (!d) {
        if (atual) for (const el of [mao, onda, balao]) el.classList.remove('mostra');
        atual = null;
        return;
      }
      if (atual?.chave !== d.chave) {
        figura.innerHTML = d.figura;
        texto.textContent = d.texto;
      }
      for (const el of [mao, onda]) {
        el.style.setProperty('--x', `${d.t.x.toFixed(1)}px`);
        el.style.setProperty('--y', `${d.t.y.toFixed(1)}px`);
        el.classList.toggle('mostra', !d.semMao);
      }
      // o balãozinho fica em cima da coisa (a mãozinha vem por baixo), inteiro na tela (parte 3B:
      // a TV no canto da sala cortava o "Toque para pôr a fita" na beira)
      const meia = (balao.offsetWidth || 220) / 2 + 8;
      const larg = typeof innerWidth === 'number' ? innerWidth : 1e4;
      const bx = Math.max(meia, Math.min(larg - meia, d.t.x));
      balao.style.setProperty('--x', `${bx.toFixed(1)}px`);
      balao.style.setProperty('--y', `${(d.t.y - 34).toFixed(1)}px`);
      balao.classList.add('mostra');
      atual = d;
    },
    estado: () => (atual ? { chave: atual.chave, texto: atual.texto, t: atual.t } : null),
  };
}
