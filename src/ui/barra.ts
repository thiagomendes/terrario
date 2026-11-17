import { criarHotbar, deltaRodaParaPasso, teclaParaSlot, type Hotbar } from '../player/hotbar';
import { EVENTO_ICONES, iconeDoItem } from './icones';
import { modoToque } from './pixicones';

const CSS = `
/* spec 014: a casinha que pisca (bloco certo da obra, colher que chegou) */
@keyframes piscar-slot { 0%, 100% { transform: scale(1); box-shadow: none; }
  30%, 70% { transform: scale(1.14); box-shadow: 0 0 0 3px #ffd45a, 0 0 14px #ffd45a; } }
[data-slot].piscando { animation: piscar-slot 0.6s ease-in-out 2; }

/* barra de itens: bandeja creme com um poço por item; o escolhido sobe com borda amarela */
.barra {
  position: fixed;
  left: 50%;
  bottom: max(12px, env(safe-area-inset-bottom));
  transform: translateX(-50%);
  display: flex;
  gap: clamp(3px, 1vw, 6px);
  padding: 7px;
  box-sizing: border-box;
  max-width: calc(100vw - 8px);
  border: 0;
  border-radius: 20px;
  background: rgba(255, 250, 240, 0.78);
  box-shadow: 0 4px 0 rgba(150, 110, 60, 0.35), 0 10px 20px rgba(40, 25, 10, 0.18);
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
  border: 0;
  border-radius: 12px;
  background: var(--poco);
  box-shadow: var(--sombra-poco);
  cursor: pointer;
  transition: transform 0.1s ease, background 0.1s ease;
}
.barra button:hover { background: #fff3d6; }
.barra button[aria-pressed='true'] {
  background: #fff3d6;
  outline: 3px solid var(--amarela);
  outline-offset: -1px;
  box-shadow: inset 0 3px 0 rgba(120, 80, 30, 0.1), 0 4px 0 var(--amarela-fundo);
  transform: translateY(-4px);
}
.barra button:focus-visible { outline: 3px solid var(--azul); }
.barra .icone {
  display: block;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
  filter: drop-shadow(0 2px 1px rgba(90, 55, 20, 0.3));
}
.barra .qtd {
  position: absolute;
  right: 4px;
  bottom: 1px;
  color: #fff;
  font: 900 0.78rem var(--jogo);
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.55), 0 0 3px rgba(0, 0, 0, 0.45);
}
body[data-modo='criativo'] .barra .qtd { display: none; }
.barra .icone[src=''] { visibility: hidden; }
.nome-item {
  position: fixed;
  left: 50%;
  bottom: calc(max(12px, env(safe-area-inset-bottom)) + 78px);
  transform: translateX(-50%);
  padding: 4px 14px;
  border-radius: 999px;
  background: rgba(255, 250, 240, 0.92);
  color: var(--tinta);
  font: 800 0.9rem var(--jogo);
  box-shadow: 0 2px 0 rgba(150, 110, 60, 0.3);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 10;
}
.nome-item.visivel { opacity: 1; }
body.toque-ativo .barra .numero { display: none; }
/* segurar um espaço da barra joga um no chão: sem menu de cópia nem seleção no iPhone */
.barra button { -webkit-touch-callout: none; user-select: none; -webkit-user-select: none; }
.barra .numero {
  position: absolute;
  top: 1px;
  left: 5px;
  color: var(--tinta-suave);
  font: 800 0.66rem var(--jogo);
}
`;

/** Segurar um espaço da barra por este tempo (toque) joga um item dele no chão. */
export const TEMPO_SEGURAR_JOGAR = 550;

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
  /** O espaço mudou sozinho com o "+1" do item já na tela: sem o nome de novo embaixo. */
  let semNome = false;
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
      if (p && !semNome) {
        nomeItem.textContent = slots[hotbar.ativo].nome;
        nomeItem.classList.add('visivel');
        if (timerNome) clearTimeout(timerNome);
        timerNome = setTimeout(() => nomeItem.classList.remove('visivel'), 1500);
      }
    }
  };

  // Toque: segurar um espaço da barra joga um item dele no chão (dar a um amigo)
  let segurando: { id: number; slot: number; x: number; y: number; timer: number } | null = null;
  const soltarSegurar = () => {
    if (segurando) clearTimeout(segurando.timer);
    segurando = null;
  };
  barra.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    const alvo = (e.target as HTMLElement).closest<HTMLElement>('[data-slot]');
    if (!alvo) return;
    soltarSegurar();
    const slot = Number(alvo.dataset.slot);
    const s = {
      id: e.pointerId,
      slot,
      x: e.clientX,
      y: e.clientY,
      timer: window.setTimeout(() => {
        if (segurando !== s) return;
        segurando = null;
        hotbar.selecionar(slot);
        atualizar();
        window.dispatchEvent(
          new CustomEvent('brumaluz:jogarDaBarra', { detail: { slot, qtd: 1 } }),
        );
        navigator.vibrate?.(12);
      }, TEMPO_SEGURAR_JOGAR),
    };
    segurando = s;
  });
  barra.addEventListener('pointermove', (e) => {
    if (segurando && e.pointerId === segurando.id)
      if (Math.hypot(e.clientX - segurando.x, e.clientY - segurando.y) > 12) soltarSegurar();
  });
  for (const t of ['pointerup', 'pointercancel', 'pointerleave'] as const)
    barra.addEventListener(t, (e) => {
      if (segurando && e.pointerId === segurando.id) soltarSegurar();
    });
  barra.addEventListener('contextmenu', (e) => e.preventDefault());
  // spec 014 (T06): o canteiro pisca a casinha do bloco certo (ou a da colher)
  window.addEventListener('brumaluz:piscarSlot', (e) => {
    const slot = (e as CustomEvent<number>).detail;
    const el = barra.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
    if (!el) return;
    el.classList.remove('piscando');
    void el.offsetWidth;
    el.classList.add('piscando');
    setTimeout(() => el.classList.remove('piscando'), 1300);
  });
  window.addEventListener('brumaluz:selecionarSlot', (e) => {
    hotbar.selecionar((e as CustomEvent<number>).detail);
    atualizar();
  });

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
      // no mundo a roda aproxima e afasta a câmera (spec 015): troca o item em cima da
      // barra ou com Shift (que alguns navegadores mandam como rolagem de lado)
      const naBarra = !!(e.target as HTMLElement | null)?.closest?.('.barra');
      if (!naBarra && !e.shiftKey) return;
      const passo = deltaRodaParaPasso(e.deltaY || e.deltaX);
      if (passo > 0) hotbar.proximo();
      else if (passo < 0) hotbar.anterior();
      else return;
      atualizar();
    },
    { passive: true },
  );

  hotbar.inventario.ouvir(atualizar);
  // os ícones de brinquedo chegam aos poucos depois que o jogo abre
  window.addEventListener(EVENTO_ICONES, atualizar);
  window.addEventListener('brumaluz:slot', (ev) => {
    semNome = !!(ev as CustomEvent<{ semNome?: boolean } | null>).detail?.semNome;
    atualizar();
    semNome = false;
  });
  atualizar();
  app.append(barra, nomeItem);
  return hotbar;
}
