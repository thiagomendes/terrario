/**
 * Dica curta logo abaixo da mira: como trocar com o morador, dar frutinhas à raposa ou
 * comer (com o jeito certo para mouse ou toque). A cena manda o texto pelo evento
 * brumaluz:dicaMira; texto vazio esconde.
 */
const CSS = `
.dica-mira { position: fixed; left: 50%; top: calc(50% + 26px); transform: translateX(-50%);
  z-index: 8; pointer-events: none; padding: 4px 12px; border-radius: 10px;
  background: rgba(14, 10, 20, 0.62); color: #fff4d8; font: 700 0.85rem system-ui, sans-serif;
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
