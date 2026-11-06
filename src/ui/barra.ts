import { criarHotbar, deltaRodaParaPasso, teclaParaSlot, type Hotbar } from '../player/hotbar';
import { iconeDoItem } from './icones';
import { modoToque } from './pixicones';

const CSS = `
.barra {
  position: fixed;
  left: 50%;
  bottom: max(12px, env(safe-area-inset-bottom));
  transform: translateX(-50%);
  display: flex;
  gap: clamp(3px, 1vw, 6px);
  padding: 5px;
  box-sizing: border-box;
  max-width: calc(100vw - 8px);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  background: rgba(10, 12, 20, 0.55);
  backdrop-filter: blur(6px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
  pointer-events: auto;
  z-index: 10;
}
.barra button {
  position: relative;
  flex: 0 0 auto;
  width: clamp(36px, 9.4vw, 52px);
  height: clamp(36px, 9.4vw, 52px);
  min-width: 36px;
  min-height: 36px;
  padding: 4px;
  box-sizing: border-box;
  border: 2px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: transform 0.12s ease, background 0.12s ease;
}
.barra button:hover { background: rgba(255, 255, 255, 0.12); }
.barra button[aria-pressed='true'] {
  border-color: #fff4dc;
  background: rgba(255, 244, 220, 0.16);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5), 0 0 14px rgba(255, 220, 150, 0.45);
  transform: translateY(-4px) scale(1.06);
}
.barra button:focus-visible { outline: 2px solid #fff1d6; }
.barra .icone {
  display: block;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.45));
}
.barra .qtd {
  position: absolute;
  right: 4px;
  bottom: 1px;
  color: #fff;
  font: 800 0.78rem system-ui, sans-serif;
  text-shadow: 1px 1px 0 #000, -1px -1px 0 rgba(0,0,0,0.6);
}
body[data-modo='criativo'] .barra .qtd { display: none; }
.barra .icone[src=''] { visibility: hidden; }
.nome-item {
  position: fixed;
  left: 50%;
  bottom: calc(max(12px, env(safe-area-inset-bottom)) + 74px);
  transform: translateX(-50%);
  padding: 4px 12px;
  border-radius: 8px;
  background: rgba(10, 12, 20, 0.55);
  color: #fff;
  font: 700 0.9rem system-ui, sans-serif;
  text-shadow: 1px 1px 0 #000;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 10;
}
.nome-item.visivel { opacity: 1; }
body.toque-ativo .barra .numero { display: none; }
.barra .numero {
  position: absolute;
  top: 1px;
  left: 4px;
  color: #fff;
  font: 700 0.68rem system-ui, sans-serif;
  text-shadow: 1px 1px 0 #000;
  opacity: 0.85;
}
`;

export function criarBarra(app: HTMLElement, hotbar: Hotbar = criarHotbar()): Hotbar {
  const estilo = document.createElement('style');
  estilo.textContent = CSS;
  document.head.appendChild(estilo);

  const barra = document.createElement('div');
  barra.className = 'barra';
  barra.setAttribute('role', 'toolbar');
  barra.setAttribute('aria-label', 'Barra de itens');
  const nomeItem = document.createElement('div');
  nomeItem.className = 'nome-item';
  nomeItem.setAttribute('aria-live', 'polite');

  const botoes = hotbar.slots.map((_, i) => {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.dataset.slot = String(i);
    const icone = document.createElement('img');
    icone.className = 'icone';
    icone.alt = '';
    icone.draggable = false;
    const numero = document.createElement('span');
    numero.className = 'numero';
    numero.textContent = String(i + 1);
    const qtd = document.createElement('span');
    qtd.className = 'qtd';
    botao.append(icone, numero, qtd);
    barra.appendChild(botao);
    return { botao, icone, qtd };
  });

  let ultimoAtivo = -1;
  let timerNome: ReturnType<typeof setTimeout> | null = null;
  const atualizar = () => {
    const slots = hotbar.slots;
    const toque = modoToque();
    botoes.forEach(({ botao, icone, qtd }, i) => {
      const s = slots[i];
      const p = s.pilha;
      botao.setAttribute('aria-pressed', String(i === hotbar.ativo));
      botao.title = p ? s.nome : '';
      const nome = p ? (p.qtd > 1 ? `${s.nome}, ${p.qtd}` : s.nome) : 'vazio';
      // no toque não há teclas numéricas
      const rotulo = toque ? nome : `${nome} (tecla ${i + 1})`;
      if (botao.getAttribute('aria-label') !== rotulo) botao.setAttribute('aria-label', rotulo);
      const src = p ? iconeDoItem(p.item) : '';
      if (icone.getAttribute('src') !== src) icone.setAttribute('src', src);
      qtd.textContent = p && p.qtd > 1 ? String(p.qtd) : '';
    });
    if (hotbar.ativo !== ultimoAtivo) {
      ultimoAtivo = hotbar.ativo;
      const p = hotbar.pilhaAtiva();
      if (p) {
        nomeItem.textContent = slots[hotbar.ativo].nome;
        nomeItem.classList.add('visivel');
        if (timerNome) clearTimeout(timerNome);
        timerNome = setTimeout(() => nomeItem.classList.remove('visivel'), 1500);
      }
    }
  };

  barra.addEventListener('click', (e) => {
    const alvo = (e.target as HTMLElement).closest<HTMLElement>('[data-slot]');
    if (!alvo) return;
    hotbar.selecionar(Number(alvo.dataset.slot));
    atualizar();
  });
  document.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement)?.closest?.('input, textarea')) return;
    const i = teclaParaSlot(e.code);
    if (i === null) return;
    hotbar.selecionar(i);
    atualizar();
  });
  document.addEventListener(
    'wheel',
    (e) => {
      if (document.querySelector('.modal-fundo:not([hidden]), .inventario-fundo:not([hidden])'))
        return;
      const passo = deltaRodaParaPasso(e.deltaY);
      if (passo > 0) hotbar.proximo();
      else if (passo < 0) hotbar.anterior();
      else return;
      atualizar();
    },
    { passive: true },
  );

  hotbar.inventario.ouvir(atualizar);
  window.addEventListener('brumaluz:slot', atualizar);
  atualizar();
  app.append(barra, nomeItem);
  return hotbar;
}
