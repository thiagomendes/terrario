import { atlasParaCanvas, gerarAtlas, TAM_TILE } from '../art/atlas';
import { criarHotbar, deltaRodaParaPasso, teclaParaSlot, type Hotbar } from '../player/hotbar';

const CSS = `
.barra {
  position: fixed;
  left: 50%;
  bottom: max(12px, env(safe-area-inset-bottom));
  transform: translateX(-50%);
  display: flex;
  gap: clamp(4px, 1.5vw, 8px);
  padding: 6px;
  box-sizing: border-box;
  max-width: calc(100vw - 8px);
  border: 1px solid #5a438a;
  border-radius: 12px;
  background: rgba(18, 10, 36, 0.78);
  pointer-events: auto;
  z-index: 10;
}
.barra button {
  position: relative;
  flex: 0 0 auto;
  width: 48px;
  height: 48px;
  min-width: 44px;
  min-height: 44px;
  padding: 3px;
  box-sizing: border-box;
  border: 2px solid #5a438a;
  border-radius: 8px;
  background: #2b1b4d;
  cursor: pointer;
}
.barra button[aria-pressed='true'] {
  border-color: #ffb35c;
  background: #4a3170;
  box-shadow: 0 0 10px rgba(255, 179, 92, 0.6);
  transform: translateY(-3px);
}
.barra button:focus-visible { outline: 2px solid #fff1d6; }
.barra .icone {
  display: block;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
}
.barra .numero {
  position: absolute;
  top: 1px;
  left: 4px;
  color: #fff1d6;
  font: 700 0.7rem system-ui, sans-serif;
  text-shadow: 0 0 3px #120a24, 0 0 3px #120a24;
}
`;

export function criarBarra(app: HTMLElement, hotbar: Hotbar = criarHotbar()): Hotbar {
  const estilo = document.createElement('style');
  estilo.textContent = CSS;
  document.head.appendChild(estilo);

  const atlas = gerarAtlas();
  const fonte = atlasParaCanvas(atlas);

  const barra = document.createElement('div');
  barra.className = 'barra';
  barra.setAttribute('role', 'toolbar');
  barra.setAttribute('aria-label', 'Barra de blocos');

  const botoes = hotbar.slots.map((slot, i) => {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.dataset.slot = String(i);
    botao.title = slot.nome;
    botao.setAttribute('aria-label', `${slot.nome} (tecla ${i + 1})`);

    const icone = document.createElement('canvas');
    icone.className = 'icone';
    icone.width = TAM_TILE;
    icone.height = TAM_TILE;
    const uv = atlas.uvDoBloco(slot.bloco);
    const ctx = icone.getContext('2d');
    if (uv && ctx) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        fonte,
        Math.round(uv.u0 * atlas.largura),
        Math.round(uv.v0 * atlas.altura),
        TAM_TILE,
        TAM_TILE,
        0,
        0,
        TAM_TILE,
        TAM_TILE,
      );
    }
    const numero = document.createElement('span');
    numero.className = 'numero';
    numero.textContent = String(i + 1);
    botao.append(icone, numero);
    barra.appendChild(botao);
    return botao;
  });

  const atualizar = () => {
    botoes.forEach((b, i) => b.setAttribute('aria-pressed', String(i === hotbar.ativo)));
  };

  barra.addEventListener('click', (e) => {
    const alvo = (e.target as HTMLElement).closest<HTMLElement>('[data-slot]');
    if (!alvo) return;
    hotbar.selecionar(Number(alvo.dataset.slot));
    atualizar();
  });
  document.addEventListener('keydown', (e) => {
    const i = teclaParaSlot(e.code);
    if (i === null) return;
    hotbar.selecionar(i);
    atualizar();
  });
  document.addEventListener(
    'wheel',
    (e) => {
      const passo = deltaRodaParaPasso(e.deltaY);
      if (passo > 0) hotbar.proximo();
      else if (passo < 0) hotbar.anterior();
      else return;
      atualizar();
    },
    { passive: true },
  );

  window.addEventListener('brumaluz:slot', atualizar);
  atualizar();
  app.appendChild(barra);
  return hotbar;
}
