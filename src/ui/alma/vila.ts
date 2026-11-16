/**
 * Spec 026: a Vila Neon no aparelho (o que a criança toca). O núcleo decide tudo (estojos,
 * caixas, show, lhamas, moedinhas); aqui fica o toque generoso e a mãozinha:
 *
 * - **as três caixas do palco:** com a criança perto (no palco, no pé dele ou na plateia), o dedo pega a
 *   caixa que estiver perto dele (alvo de 80 px, como a 031); a mãozinha aponta a próxima
 *   apagada com a f3 no selinho;
 * - **o show:** enquanto a música toca, qualquer toque na tela de quem está no palco ou na
 *   plateia toca um acorde (fora os botões, a barra e o controle); no chamado do fim, o toque
 *   dispara o acorde final. **O arrastar sempre gira a câmera** (o dono, 16 nov 2026: "depois de
 *   acender as 3 caixas a câmera parou"): o toque do show nunca segura o `pointerdown`; o acorde
 *   sai no soltar de um toque curto (no dedo) ou no clique (no mouse), e só o que vem depois do
 *   toque curto deixa de chegar ao jogo (para o toque não colocar bloco no palco);
 * - **o feno na mão (f2):** o "pop" do feno que aparece perto das lhamas, já selecionado.
 */
import type { Scene } from '@babylonjs/core/scene';
import type { EstadoDepuracao } from '../../render/cena';
import type { GuiaMissao } from '../../render/guiaMissao';
import type { AlmaUi } from './index';
import { missaoFixada } from './hud';
import { figura } from './figuras';
import { tocarSomInterface } from '../../audio/somInterface';
import {
  alcancaOPalco,
  faseComMusica,
  faseDoShow,
  noiteDeShow,
  type FaseShow,
} from '../../jogo/show';
import { FOLGA_TOQUE, TEMPO_SEGURAR } from '../toque';
import { CSS_CANTO } from './canto';

declare global {
  interface Window {
    /** Spec 026 (testes de tela): as caixas na tela, a mãozinha e a fase do show. */
    __vila?: {
      plano(): unknown;
      caixas(): { i: number; t: { x: number; y: number } }[];
      mao(): { x: number; y: number } | null;
      show(): FaseShow | null;
    };
  }
}

/** Raio do toque na caixa (px): o alvo generoso da 031 (80 px de diâmetro). */
const RAIO_TOQUE = 40;
/** A mãozinha aparece este tanto depois de chegar ao palco (s) e volta depois do toque. */
const MAO_CHEGA = 1.2;
const MAO_VOLTA = 0.55;

type Tela = { x: number; y: number };

export function ligarVilaNeon(
  e: EstadoDepuracao,
  ui: AlmaUi,
  guia: GuiaMissao,
  scene: Scene,
): void {
  const plano = e.vila?.();
  if (!plano) return;
  const p = plano.pontos;
  const st = document.createElement('style');
  st.textContent = CSS_CANTO;
  document.head.appendChild(st);
  const agoraS = () => performance.now() / 1000;
  const tela = (x: number, y: number, z: number) => e.telaDoPonto?.(x, y, z) ?? null;
  const missao = () => missaoFixada(ui.vista())?.m.id ?? null;
  const noJogo = () => {
    const b = document.body;
    return (
      !b.dataset.overlay &&
      !b.classList.contains('modo-foto') &&
      !b.classList.contains('tela-titulo')
    );
  };
  /**
   * A criança está no palco, no pé dele ou na plateia (as caixas ao alcance do dedo): a mesma
   * conta do núcleo (`alcancaOPalco`), para todo toque que a tela aceita valer lá também.
   */
  const pertoDoPalco = () => {
    const pes = e.jogadorPes?.();
    return !!pes && alcancaOPalco(p.palco, pes[0], pes[2]);
  };
  /**
   * O show acontecendo agora (da abertura ao aplauso), e a criança perto o bastante: a fase (a
   * música toca nas fases de `faseComMusica`).
   */
  const showTocando = (): FaseShow | null => {
    const v = e.vilaEstado?.();
    if (!v?.show) return null;
    const fase = faseDoShow(v.show, e.vilaTempo?.() ?? v.t);
    if (fase === 'acabou') return null;
    const pes = e.jogadorPes?.();
    if (!pes) return null;
    const r = p.palco;
    const g = p.plateia;
    const naPlateia =
      pes[0] >= g.x0 - 2 && pes[0] <= g.x1 + 2 && pes[2] >= g.z0 - 4 && pes[2] <= r.z1 + 2;
    return pertoDoPalco() || naPlateia ? fase : null;
  };
  /** As caixas à vista (o centro na tela de cada uma). */
  function caixasNaTela(): { i: number; t: Tela }[] {
    if (!noJogo() || !pertoDoPalco()) return [];
    const r: { i: number; t: Tela }[] = [];
    p.caixas.forEach(([x, y, z], i) => {
      const t = tela(x + 0.5, y + 1, z + 0.5);
      if (t) r.push({ i, t });
    });
    return r;
  }

  /**
   * O brinquedo de tocar perto do dedo: as máquinas (a tela), o rádio e a fita gigantes (o meio
   * da peça, com o alvo do tamanho dela). Só com a criança perto (nada toca do outro lado da rua).
   */
  type QualBrinquedo = 'fliperama' | 'radio' | 'fita';
  const BRINQUEDOS: {
    qual: QualBrinquedo;
    i: number;
    p: [number, number, number];
    alt: number;
    perto: number;
    raio: number;
  }[] = [
    ...plano.pecas
      .filter((q) => q.tipo === 'maquina')
      .sort((a, b) => (a.n ?? 0) - (b.n ?? 0))
      .map((q, i) => ({
        qual: 'fliperama' as const,
        i,
        p: [q.x, q.y, q.z] as [number, number, number],
        alt: 1.9,
        perto: 6,
        raio: RAIO_TOQUE * 1.2,
      })),
    { qual: 'radio', i: 0, p: p.radio, alt: 1.4, perto: 9, raio: RAIO_TOQUE * 2.6 },
    { qual: 'fita', i: 0, p: p.fita, alt: 1.6, perto: 9, raio: RAIO_TOQUE * 2.4 },
  ];
  function brinquedoNoDedo(x: number, y: number): { qual: QualBrinquedo; i: number } | null {
    const pes = e.jogadorPes?.();
    if (!pes) return null;
    let melhor: { d: number; qual: QualBrinquedo; i: number } | null = null;
    for (const b of BRINQUEDOS) {
      const dist = Math.hypot(pes[0] - b.p[0], pes[2] - b.p[2]);
      if (dist > b.perto) continue;
      const t = tela(b.p[0], b.p[1] + b.alt, b.p[2]);
      if (!t) continue;
      // de perto a peça fica grande na tela: o alvo cresce junto
      const raio = b.raio * Math.max(1, 4 / Math.max(1, dist));
      const d = Math.hypot(t.x - x, t.y - y);
      if (d <= raio && (!melhor || d < melhor.d)) melhor = { d, qual: b.qual, i: b.i };
    }
    return melhor;
  }

  // ---------------------------------------------------------------- o toque generoso
  let engoliuAte = 0;
  let tocouEm = -Infinity;
  /** O dedo que encostou no show (o acorde sai no soltar, se for um toque curto). */
  let toqueDoShow: { id: number; x: number; y: number; t0: number } | null = null;
  /** Depois do toque curto do show, os eventos de compatibilidade (mouse, clique) não chegam. */
  let engoliuShowAte = 0;
  window.addEventListener(
    'pointermove',
    (ev) => {
      const g = toqueDoShow;
      if (
        g &&
        ev.pointerId === g.id &&
        Math.hypot(ev.clientX - g.x, ev.clientY - g.y) > FOLGA_TOQUE
      )
        toqueDoShow = null;
    },
    { capture: true, passive: true },
  );
  window.addEventListener(
    'pointercancel',
    (ev) => {
      if (toqueDoShow?.id === ev.pointerId) toqueDoShow = null;
    },
    { capture: true },
  );
  window.addEventListener(
    'pointerup',
    (ev) => {
      const g = toqueDoShow;
      if (!g || ev.pointerId !== g.id) return;
      toqueDoShow = null;
      const curto =
        Math.hypot(ev.clientX - g.x, ev.clientY - g.y) <= FOLGA_TOQUE &&
        performance.now() - g.t0 < TEMPO_SEGURAR;
      const fase = showTocando();
      if (!curto || !fase) return;
      if (faseComMusica(fase)) e.vilaComando?.({ a: 'palco' });
      tocouEm = agoraS();
      // o toque curto é do show: o controle do jogo solta o dedo sem agir (nada de bloco no palco)
      ev.stopImmediatePropagation();
      engoliuShowAte = performance.now() + 350;
      const alvo = ev.target as EventTarget | null;
      alvo?.dispatchEvent(
        new PointerEvent('pointercancel', {
          pointerId: ev.pointerId,
          pointerType: ev.pointerType,
          bubbles: true,
          clientX: ev.clientX,
          clientY: ev.clientY,
        }),
      );
    },
    { capture: true },
  );
  for (const tipo of ['mousedown', 'mouseup', 'touchend', 'click'])
    window.addEventListener(
      tipo,
      (ev) => {
        if (performance.now() < engoliuShowAte) {
          ev.stopImmediatePropagation();
          if (ev.cancelable) ev.preventDefault();
        }
      },
      { capture: true, passive: false },
    );
  window.addEventListener(
    'pointerdown',
    (ev) => {
      const alvo = ev.target as HTMLElement | null;
      if (
        alvo?.closest?.('button, .alma-fundo, .roda, .barra, .joystick, .menu-hud, .controle-toque')
      )
        return;
      if (!noJogo()) return;
      const preso = !!document.pointerLockElement;
      const x = preso ? innerWidth / 2 : ev.clientX;
      const y = preso ? innerHeight / 2 : ev.clientY;
      let feito = false;
      // a caixa perto do dedo (fora do show: acende e apaga)
      let melhor: { d: number; i: number } | null = null;
      for (const c of caixasNaTela()) {
        const d = Math.hypot(c.t.x - x, c.t.y - y);
        if (d <= RAIO_TOQUE && (!melhor || d < melhor.d)) melhor = { d, i: c.i };
      }
      // o suporte dos patins: perto dele, o toque calça (ou tira) os patins
      const pes = e.jogadorPes?.();
      const [sx, sy, sz] = p.patins;
      const ts = pes && Math.hypot(pes[0] - sx, pes[2] - sz) < 4 ? tela(sx, sy + 1, sz) : null;
      // os brinquedos de tocar (fliperama, rádio e fita): perto deles, o dedo na peça toca
      const brinquedo = showTocando() ? null : brinquedoNoDedo(x, y);
      if (brinquedo) {
        e.vilaBrinquedo?.(brinquedo.qual, brinquedo.i);
        feito = true;
      } else if (ts && Math.hypot(ts.x - x, ts.y - y) <= RAIO_TOQUE * 1.5) {
        const calcados = !!e.personagem?.aparencia().patins;
        e.vilaPatins?.(!calcados);
        tocarSomInterface(calcados ? 'mochila' : 'plim');
        feito = true;
      } else if (melhor && !showTocando()) {
        e.vilaComando?.({ a: 'caixa', i: melhor.i });
        tocarSomInterface('plim');
        feito = true;
      } else if (showTocando()) {
        // no show, o toque toca um acorde (o núcleo encaixa no tempo e sempre na nota certa), mas
        // o dedo segue para o jogo: arrastar gira a câmera. No mouse o clique toca já; no dedo,
        // o acorde sai no soltar, se foi um toque curto (o arrastar nunca toca)
        if (ev.pointerType === 'mouse') {
          if (faseComMusica(showTocando())) e.vilaComando?.({ a: 'palco' });
        } else
          toqueDoShow = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, t0: performance.now() };
        return;
      }
      if (!feito) return;
      tocouEm = agoraS();
      engoliuAte = performance.now() + 300;
      ev.stopImmediatePropagation();
      ev.preventDefault();
    },
    { capture: true },
  );
  for (const tipo of ['pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click'])
    window.addEventListener(
      tipo,
      (ev) => {
        if (performance.now() < engoliuAte) {
          ev.stopImmediatePropagation();
          if (ev.cancelable) ev.preventDefault();
        }
      },
      { capture: true, passive: false },
    );

  // ---------------------------------------------------------------- o feno na mão (f2)
  window.addEventListener('brumaluz:coletou', (ev) => {
    const d = (ev as CustomEvent<{ item: string; qtd: number }>).detail;
    if (d.item !== 'trigo' || missao() !== 'f2') return;
    for (let i = 0; i < 9; i++)
      if (e.inventario?.obter(i)?.item === 'trigo') {
        e.selecionarSlot?.(i);
        break;
      }
    const pes = e.jogadorPes?.();
    const de = pes ? tela(pes[0], pes[1] + 1.1, pes[2]) : null;
    if (!de) return;
    const el = document.createElement('div');
    el.className = 'canto-pop';
    el.appendChild(figura('item:trigo'));
    el.style.left = `${de.x + 34}px`;
    el.style.top = `${de.y - 40}px`;
    el.style.setProperty('--dx', '-30px');
    el.style.setProperty('--dy', '34px');
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1300);
    tocarSomInterface('mochila');
    setTimeout(() => tocarSomInterface('plim'), 180);
  });

  // ---------------------------------------------------------------- a mãozinha da caixa
  const mao = document.createElement('div');
  mao.className = 'guia-mao';
  mao.innerHTML = document.querySelector<HTMLElement>('[data-guia-mao]')?.innerHTML ?? '';
  mao.setAttribute('data-vila-mao', '');
  const onda = document.createElement('div');
  onda.className = 'guia-onda';
  document.body.append(onda, mao);
  let maoTela: Tela | null = null;
  let chegouEm = -Infinity;
  let estava = false;
  scene.onBeforeRenderObservable.add(() => {
    const agora = agoraS();
    const perto = pertoDoPalco();
    if (perto && !estava) chegouEm = agora;
    estava = perto;
    const v = e.vilaEstado?.();
    let escolha: Tela | null = null;
    // (de dia a f3 espera a noite: a mãozinha não chama para as caixas)
    if (
      missao() === 'f3' &&
      v &&
      !v.show &&
      noiteDeShow(e.hora ?? 0.5) &&
      agora - chegouEm > MAO_CHEGA &&
      agora - tocouEm > MAO_VOLTA
    ) {
      const lista = caixasNaTela().filter((c) => !v.cx[c.i]);
      escolha =
        lista.sort(
          (a, b) =>
            Math.hypot(a.t.x - innerWidth / 2, a.t.y - innerHeight * 0.6) -
            Math.hypot(b.t.x - innerWidth / 2, b.t.y - innerHeight * 0.6),
        )[0]?.t ?? null;
    }
    maoTela = escolha;
    for (const el of [mao, onda]) {
      if (!escolha) {
        el.classList.remove('mostra');
        continue;
      }
      el.style.setProperty('--x', `${escolha.x}px`);
      el.style.setProperty('--y', `${escolha.y}px`);
      el.classList.add('mostra');
    }
  });
  void guia;

  // testes: as caixas na tela, a mãozinha e o show
  window.__vila = {
    plano: () => plano,
    caixas: () => caixasNaTela(),
    mao: () => maoTela,
    show: () => showTocando(),
  };
}
