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

export function criarDicaMira(raiz: HTMLElement = document.body): HTMLElement {
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.append(st);
  const d = document.createElement('div');
  d.className = 'dica-mira';
  d.setAttribute('role', 'status');
  raiz.append(d);
  window.addEventListener('brumaluz:dicaMira', (e) => {
    const t = String((e as CustomEvent<string>).detail ?? '');
    if (t) d.textContent = t;
    d.classList.toggle('visivel', !!t);
  });
  return d;
}
