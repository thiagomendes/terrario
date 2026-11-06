import { atlasParaCanvas, gerarAtlas, TAM_TILE } from '../art/atlas';
import { criarHotbar, deltaRodaParaPasso, teclaParaSlot, type Hotbar } from '../player/hotbar';

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
  width: 52px;
  height: 52px;
  min-width: 44px;
  min-height: 44px;
  padding: 4px;
  box-sizing: border-box;
  border: 2px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: transform 0.12s ease, border-color 0.12s ease, background 0.12s ease;
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

/** Desenha o bloco em perspectiva isométrica (topo e dois lados sombreados). */
function desenharIsometrico(
  ctx: CanvasRenderingContext2D,
  fonte: HTMLCanvasElement,
  faces: { topo: [number, number]; lado: [number, number] },
  tam: number,
  planta: boolean,
): void {
  const T = TAM_TILE;
  ctx.imageSmoothingEnabled = false;
  if (planta) {
    ctx.drawImage(
      fonte,
      faces.lado[0],
      faces.lado[1],
      T,
      T,
      tam * 0.1,
      tam * 0.1,
      tam * 0.8,
      tam * 0.8,
    );
    return;
  }
  const a = tam / 2;
  const q = tam / 4;
  const sombra = (f: number) => {
    ctx.fillStyle = `rgba(0,0,0,${f})`;
    ctx.fillRect(0, 0, T, T);
  };
  // topo: losango
  ctx.save();
  ctx.setTransform(a / T, q / T, -a / T, q / T, a, 0);
  ctx.drawImage(fonte, faces.topo[0], faces.topo[1], T, T, 0, 0, T, T);
  ctx.restore();
  // lado esquerdo
  ctx.save();
  ctx.setTransform(a / T, q / T, 0, a / T, 0, q);
  ctx.drawImage(fonte, faces.lado[0], faces.lado[1], T, T, 0, 0, T, T);
  sombra(0.22);
  ctx.restore();
  // lado direito
  ctx.save();
  ctx.setTransform(a / T, -q / T, 0, a / T, a, a);
  ctx.drawImage(fonte, faces.lado[0], faces.lado[1], T, T, 0, 0, T, T);
  sombra(0.4);
  ctx.restore();
}

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
    icone.width = 64;
    icone.height = 64;
    const topo = atlas.uvDaFace(slot.bloco, 'topo');
    const lado = atlas.uvDaFace(slot.bloco, 'lado');
    const ctx = icone.getContext('2d');
    if (topo && lado && ctx) {
      const px = (uv: { u0: number; v0: number }): [number, number] => [
        Math.round(uv.u0 * atlas.largura),
        Math.round(uv.v0 * atlas.altura),
      ];
      desenharIsometrico(ctx, fonte, { topo: px(topo), lado: px(lado) }, 64, false);
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
