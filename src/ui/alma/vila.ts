/**
 * Spec 026: a Vila Neon no aparelho (o que a criança toca). O núcleo decide tudo (estojos,
 * caixas, show, lhamas, arcos, moedinhas); aqui fica o toque generoso:
 *
 * - **as três caixas do palco** (brinquedo livre fora do show): com a criança perto (no palco, no
 *   pé dele ou na plateia), o dedo pega a caixa que estiver perto dele (alvo de 80 px, como a 031);
 * - **o show é só para ver e dançar** (o dono, 16 nov 2026): nenhum toque toca acorde nem
 *   dispara o fim; o dedo é todo do jogo (o arrastar gira a câmera o show inteiro);
 * - **o suporte dos patins** (um toque calça, outro tira) e os brinquedos de tocar;
 * - **o feno na mão (f2):** o "pop" do feno que aparece perto das lhamas, já selecionado.
 */
import type { Scene } from '@babylonjs/core/scene';
import type { EstadoDepuracao } from '../../render/cena';
import type { GuiaMissao } from '../../render/guiaMissao';
import type { AlmaUi } from './index';
import { missaoFixada } from './hud';
import { figura } from './figuras';
import { tocarSomInterface } from '../../audio/somInterface';
import { alcancaOPalco, faseDoShow, type FaseShow } from '../../jogo/show';
import { CSS_CANTO } from './canto';

declare global {
  interface Window {
    /** Spec 026 (testes de tela): as caixas na tela e a fase do show. */
    __vila?: {
      plano(): unknown;
      caixas(): { i: number; t: { x: number; y: number } }[];
      show(): FaseShow | null;
    };
  }
}

/** Raio do toque na caixa (px): o alvo generoso da 031 (80 px de diâmetro). */
const RAIO_TOQUE = 40;

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
  /** O show acontecendo agora (da abertura ao aplauso), e a criança perto o bastante: a fase. */
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
      }
      // (no show o dedo é todo do jogo: nenhum toque muda o show, e o arrastar gira a câmera)
      if (!feito) return;
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

  void guia;
  void scene;

  // testes: as caixas na tela e o show
  window.__vila = {
    plano: () => plano,
    caixas: () => caixasNaTela(),
    show: () => showTocando(),
  };
}
