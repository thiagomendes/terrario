/**
 * A barra de progresso da obra (spec 014, T06): uma casinha no alto da tela que vai se
 * enchendo de baixo para cima, sem números. Aparece perto de um canteiro aberto e some longe
 * dele. A cena manda `brumaluz:progressoObra` com a fração (0 a 1) ou null.
 */
const CSS = `
.progresso-obra { position: fixed; top: max(10px, env(safe-area-inset-top)); left: 50%;
  transform: translateX(-50%); width: 64px; height: 60px; pointer-events: none; z-index: 6;
  opacity: 0; transition: opacity 0.4s; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.35)); }
.progresso-obra.visivel { opacity: 1; }
.progresso-obra svg { width: 100%; height: 100%; overflow: visible; }
.progresso-obra .cheio { transition: y 0.35s ease-out, height 0.35s ease-out; }
.progresso-obra.cresceu svg { animation: obra-cresceu 0.35s ease-out; }
@keyframes obra-cresceu { 50% { transform: scale(1.12); } }
`;

/** Contorno da casinha (telhado e corpo) num quadro de 64 × 60. */
const CASINHA = 'M32 3 L61 27 L54 27 L54 57 L10 57 L10 27 L3 27 Z';

export function criarProgressoObra(pai: HTMLElement = document.body): { el: HTMLElement } {
  const estilo = document.createElement('style');
  estilo.textContent = CSS;
  document.head.appendChild(estilo);
  const el = document.createElement('div');
  el.className = 'progresso-obra';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<svg viewBox="0 0 64 60">
    <defs><clipPath id="casinha-obra"><path d="${CASINHA}"/></clipPath></defs>
    <path d="${CASINHA}" fill="#dbe9ff" fill-opacity="0.85"/>
    <rect class="cheio" x="0" y="60" width="64" height="0" fill="#f28b2c" clip-path="url(#casinha-obra)"/>
    <path d="${CASINHA}" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linejoin="round"/>
    <rect x="27" y="40" width="10" height="17" rx="2" fill="#ffffff" fill-opacity="0.75"/>
  </svg>`;
  pai.appendChild(el);
  const cheio = el.querySelector<SVGRectElement>('.cheio')!;
  let antes = -1;
  window.addEventListener('brumaluz:progressoObra', (e) => {
    const f = (e as CustomEvent<number | null>).detail;
    if (f === null || f === undefined) {
      el.classList.remove('visivel');
      antes = -1;
      return;
    }
    const v = Math.max(0, Math.min(1, f));
    el.classList.add('visivel');
    const h = 4 + v * 56;
    cheio.setAttribute('y', String(60 - h));
    cheio.setAttribute('height', String(h));
    el.dataset.fracao = v.toFixed(3);
    if (antes >= 0 && v > antes) {
      el.classList.remove('cresceu');
      void el.offsetWidth;
      el.classList.add('cresceu');
    }
    antes = v;
  });
  return { el };
}
