/**
 * Cadeadinho da mira (spec 016, T04): aparece ao lado da mira do centro (computador) ou em
 * cima do bloco que o dedo pegou (toque) quando o bloco não quebra. Sem ler: a criança vê o
 * cadeado antes de bater.
 */
const CSS = `
.cadeado-mira {
  position: fixed; left: 0; top: 0; width: 30px; height: 34px; z-index: 6; pointer-events: none;
  transform: translate(-50%, -50%); filter: drop-shadow(0 2px 0 rgba(90, 60, 20, 0.45));
  animation: cadeado-entra 0.18s ease-out;
}
.cadeado-mira[hidden] { display: none; }
body.toque-ativo .cadeado-mira { width: 38px; height: 43px; }
@keyframes cadeado-entra { from { transform: translate(-50%, -50%) scale(0.6); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .cadeado-mira { animation: none; } }
`;

/** Cadeado de brinquedo: arco cinza claro e corpo dourado com o furinho da chave. */
const SVG = `<svg viewBox="0 0 30 34" width="100%" height="100%" aria-hidden="true">
<path d="M8 15V10a7 7 0 0 1 14 0v5" fill="none" stroke="#fffaf0" stroke-width="6" stroke-linecap="round"/>
<path d="M8 15V10a7 7 0 0 1 14 0v5" fill="none" stroke="#9aa3b5" stroke-width="3.2" stroke-linecap="round"/>
<rect x="3" y="14" width="24" height="18" rx="5" fill="#fffaf0"/>
<rect x="4.6" y="15.6" width="20.8" height="14.8" rx="3.8" fill="#f6b73c"/>
<rect x="4.6" y="15.6" width="20.8" height="4" rx="2" fill="#ffd977"/>
<circle cx="15" cy="22" r="2.6" fill="#7a4a12"/>
<rect x="13.9" y="23" width="2.2" height="4.6" rx="1.1" fill="#7a4a12"/>
</svg>`;

export interface Cadeado {
  /** Mostra o cadeado no ponto da tela (coordenadas CSS da janela). */
  mostrar(x: number, y: number): void;
  esconder(): void;
  readonly visivel: boolean;
}

export function criarCadeado(raiz: HTMLElement = document.body): Cadeado {
  if (!document.querySelector('style[data-cadeado]')) {
    const st = document.createElement('style');
    st.dataset.cadeado = '';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const el = document.createElement('div');
  el.className = 'cadeado-mira';
  el.setAttribute('data-cadeado', '');
  el.innerHTML = SVG;
  el.hidden = true;
  raiz.appendChild(el);
  let ultimo = '';
  return {
    mostrar(x, y) {
      // só mexe no DOM quando muda (nada de layout a cada quadro)
      const k = `${Math.round(x)},${Math.round(y)}`;
      if (el.hidden) el.hidden = false;
      if (k === ultimo) return;
      ultimo = k;
      el.style.left = `${Math.round(x)}px`;
      el.style.top = `${Math.round(y)}px`;
    },
    esconder() {
      if (!el.hidden) el.hidden = true;
      ultimo = '';
    },
    get visivel() {
      return !el.hidden;
    },
  };
}
