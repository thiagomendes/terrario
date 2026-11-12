/**
 * Dica curta logo abaixo da mira: como trocar com o morador, dar frutinhas à raposa ou
 * comer (com o jeito certo para mouse ou toque). A cena manda o texto pelo evento
 * brumaluz:dicaMira; texto vazio esconde.
 */
const CSS = `
.dica-mira { position: fixed; left: 50%; top: calc(50% + 26px); transform: translateX(-50%);
  z-index: 8; pointer-events: none; padding: 5px 14px; border-radius: 999px;
  background: rgba(255, 250, 240, 0.94); color: var(--tinta); font: 800 0.86rem var(--jogo);
  box-shadow: 0 3px 0 rgba(150, 110, 60, 0.3), 0 8px 18px rgba(40, 25, 10, 0.2);
  white-space: nowrap; opacity: 0; transition: opacity 0.18s; }
.dica-mira.visivel { opacity: 1; }
body[data-overlay] .dica-mira, body.modo-foto .dica-mira, body.tela-titulo .dica-mira { display: none; }
`;

/** Prefixo da dica com a mãozinha (spec 014: tocar no fantasma da obra). */
export const MAO = 'mao:';
const SVG_MAO = `<svg class="mao" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"
  style="vertical-align:-6px;margin-right:6px"><rect x="3" y="2" width="9" height="9" rx="1.5"
  fill="#7fb2ff" fill-opacity="0.8" stroke="#fff" stroke-width="1.5"/><path d="M11 22c-2.6 0-4.6-1.8-5.3-4.1l-1.4-4.2c-.3-.8.6-1.5 1.3-1l1.6 1.2V8.5c0-.8.6-1.4 1.4-1.4s1.4.6 1.4 1.4v4.1l4.8.8c1.5.3 2.5 1.6 2.4 3.1l-.3 3.1c-.2 1.3-1.3 2.4-2.7 2.4z" fill="#ffd9b8" stroke="#a5683e" stroke-width="1.2"/></svg>`;

export function criarDicaMira(raiz: HTMLElement = document.body): HTMLElement {
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.append(st);
  const d = document.createElement('div');
  d.className = 'dica-mira';
  d.setAttribute('role', 'status');
  raiz.append(d);
  window.addEventListener('brumaluz:dicaMira', (e) => {
    let t = String((e as CustomEvent<string>).detail ?? '');
    // spec 014: "mao:" na frente desenha a mãozinha tocando (para quem ainda não lê)
    const mao = t.startsWith(MAO);
    if (mao) t = t.slice(MAO.length);
    if (t) {
      d.textContent = t;
      if (mao) d.insertAdjacentHTML('afterbegin', SVG_MAO);
    }
    d.classList.toggle('visivel', !!t);
  });
  return d;
}
