/**
 * Spec 032: "Toque para comer", em todos os mundos. Com comida na mão (de qualquer jeito: comprada,
 * colhida, do catálogo do criativo) e a criança parada, a mãozinha do jogo toca na comida, na mão
 * do boneco, e o balãozinho mostra a carinha mordendo o biscoito. Uma criança de 3 anos que nunca
 * comeu descobre sem ler.
 *
 * A tela continua limpa: só no toque (no computador, a dica de texto perto da mira já diz "Clique
 * direito (ou F): comer"), só parada, nunca em cima do joystick; a dica de uma coisa da Vila vem
 * antes; some quando ela come e só volta com outra comida na mão.
 */
import type { Scene } from '@babylonjs/core/scene';
import type { EstadoDepuracao } from '../../render/cena';
import { obterItem } from '../../jogo/itens';
import { boaParaDica, criarDicaToque } from './dicaToque';
import { arte } from './arte';

declare global {
  interface Window {
    /** Spec 032 (testes): a dica de comer à vista. */
    __dicaComer?: { estado(): { chave: string; texto: string; t: { x: number; y: number } } | null };
  }
}

/** Quanto tempo (ms) com a comida na mão, parada, até a dica aparecer. */
const ESPERA = 600;

export function ligarDicaComer(e: EstadoDepuracao, scene: Scene): void {
  const dica = criarDicaToque();
  /** A comida da mão de agora (o espaço e o item) e desde quando ela está lá, parada. */
  let chave = '';
  let desde = 0;
  /** Com esta comida na mão ela já comeu: a dica só volta com outra. */
  let comeuCom: string | null = null;
  let ultimo: [number, number, number] | null = null;
  const noJogo = () => {
    const b = document.body;
    return !b.dataset.overlay && !b.classList.contains('modo-foto') && !b.classList.contains('tela-titulo');
  };
  window.addEventListener('brumaluz:comendo', () => {
    comeuCom = chave;
  });
  scene.onBeforeRenderObservable.add(() => {
    const slot = e.slotAtivo ?? 0;
    const p = e.inventario?.obter(slot) ?? null;
    const comida = !!p && !!obterItem(p.item)?.comida;
    const k = comida && p ? `${slot}|${p.item}` : '';
    const agora = performance.now();
    if (k !== chave) {
      chave = k;
      desde = agora;
      if (comeuCom !== null && comeuCom !== k) comeuCom = null;
    }
    // andando, a espera recomeça (a mãozinha não fica correndo atrás da mão)
    const pes = e.jogadorPes?.() ?? null;
    if (pes && ultimo && Math.hypot(pes[0] - ultimo[0], pes[2] - ultimo[2]) > 0.02) desde = agora;
    ultimo = pes;
    const pode =
      comida &&
      comeuCom !== k &&
      document.body.classList.contains('toque-ativo') &&
      noJogo() &&
      !e.comendo?.() &&
      !e.dicaVila?.() &&
      !e.pertoDeComprar?.() &&
      agora - desde >= ESPERA;
    const t = pode ? (e.maoNaTela?.() ?? null) : null;
    if (!t || !boaParaDica(t, innerWidth, innerHeight)) {
      dica.mostrar(null);
      return;
    }
    dica.mostrar({ chave: 'comer', t, figura: arte('dicaComer'), texto: 'Toque para comer' });
  });
  window.__dicaComer = { estado: () => dica.estado() };
}
