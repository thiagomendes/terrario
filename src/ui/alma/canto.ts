/**
 * Spec 031: o canto das missões no aparelho (o do Doce Reino). O núcleo decide tudo (os bichos
 * do pasto, o bolo, as moedinhas); aqui fica o que a criança vê e toca:
 *
 * - o "pop" da comida que aparece na mão perto do bicho (e2), com som, já na mão;
 * - a mãozinha no lugar (o bicho sem comida), em até 1,5 s ao chegar, que pula para o próximo
 *   depois de cada toque (a do bolo é a da obra, `maoObra`, no mesmo jeito);
 * - o toque generoso: com a missão no lugar, o dedo pega o fantasma do bolo da camada de agora
 *   ou o bicho ainda sem comida que estiver perto dele (alvo de 56 px ou mais);
 * - o boneco ~40% transparente quando a mãozinha fica atrás dele.
 */
import type { Scene } from '@babylonjs/core/scene';
import type { EstadoDepuracao } from '../../render/cena';
import type { GuiaMissao } from '../../render/guiaMissao';
import type { AlmaUi } from './index';
import { missaoFixada } from './hud';
import { figura } from './figuras';
import { tocarSomInterface } from '../../audio/somInterface';

export const CSS_CANTO = `
.canto-pop { position: fixed; z-index: 9; width: 74px; height: 74px; margin: -37px 0 0 -37px; pointer-events: none;
  border-radius: 50%; background: radial-gradient(circle, #fffbe8 0 52%, rgba(255, 233, 160, 0.9) 60%, rgba(255, 233, 160, 0) 72%);
  display: grid; place-items: center; animation: canto-pop 1.25s cubic-bezier(.2,1.5,.4,1) forwards; }
.canto-pop .alma-fig { width: 54px; height: 54px; }
@keyframes canto-pop { 0% { transform: scale(0.2); opacity: 0; } 18% { transform: scale(1.25); opacity: 1; }
  32% { transform: scale(1); } 70% { transform: scale(1); opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) scale(0.45); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .canto-pop { animation-duration: 2s; } }
`;

/** Raio do toque (px): alvo de pelo menos 56 px, mais folga para o dedo de criança. */
const RAIO_TOQUE = 40;
/** A mãozinha aparece este tanto depois de chegar (s) e volta este tanto depois do toque. */
const MAO_CHEGA = 1.2;
const MAO_VOLTA = 0.55;

type Tela = { x: number; y: number };
interface Alvo {
  t: Tela;
  tocar(): void;
}

/**
 * A mãozinha (a ponta do dedo em `t`) cai em cima do boneco na tela? Então o boneco fica meio
 * transparente: a coisa para tocar aparece através dele (o canto das missões e as dicas de
 * toque da Vila Neon).
 */
export function maoAtrasDoBoneco(e: EstadoDepuracao, t: { x: number; y: number }): boolean {
  const pes = e.jogadorPes?.();
  if (!pes) return false;
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const dx of [-0.4, 0.4])
    for (const dz of [-0.4, 0.4])
      for (const dy of [0, 1.9]) {
        const q = e.telaDoPonto?.(pes[0] + dx, pes[1] + dy, pes[2] + dz) ?? null;
        if (!q) continue;
        x0 = Math.min(x0, q.x);
        x1 = Math.max(x1, q.x);
        y0 = Math.min(y0, q.y);
        y1 = Math.max(y1, q.y);
      }
  // a mãozinha toda (o dedo e a palma, uns 80 px abaixo da ponta) conta
  return t.x > x0 - 30 && t.x < x1 + 30 && t.y + 80 > y0 && t.y < y1;
}

export function ligarCantoMissoes(
  e: EstadoDepuracao,
  ui: AlmaUi,
  guia: GuiaMissao,
  scene: Scene,
): void {
  const p = e.canto?.();
  if (!p) return;
  const plano = p;
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

  // ---------------------------------------------------------------- a comida na mão (pop)
  window.addEventListener('brumaluz:coletou', (ev) => {
    const d = (ev as CustomEvent<{ item: string; qtd: number }>).detail;
    const m = missao();
    if (d.item !== 'trigo' || m !== 'e2') return;
    // a casinha da comida vira a da mão (o toque no bicho já dá a comida)
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
    el.setAttribute('data-canto-pop', '');
    el.appendChild(figura('item:trigo'));
    el.style.left = `${de.x + 34}px`;
    el.style.top = `${de.y - 40}px`;
    // depois do pulo, ele desce para a mão do boneco
    el.style.setProperty('--dx', '-30px');
    el.style.setProperty('--dy', '34px');
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1300);
    tocarSomInterface('mochila');
    setTimeout(() => tocarSomInterface('plim'), 180);
  });

  // ---------------------------------------------------------------- os alvos de agora
  /** O que dá para tocar agora no lugar da missão (o centro na tela e o que acontece). */
  function alvos(): Alvo[] {
    if (!noJogo() || !guia.chegou()) return [];
    const m = missao();
    const pes = e.jogadorPes?.();
    if (!pes) return [];
    const r: Alvo[] = [];
    if (m === 'e2') {
      const [px, , pz] = plano.pasto;
      for (const c of e.criaturas?.() ?? []) {
        if (c.tipo !== 'cervo' || c.criado || Math.hypot(c.x - px, c.z - pz) > 16) continue;
        if (Math.hypot(c.x - pes[0], c.z - pes[2]) > 6) continue;
        const t = tela(c.x, c.y + 0.75, c.z);
        if (t) r.push({ t, tocar: () => void e.missaoToque?.alimentar(c.id) });
      }
    } else if (m === 'e1') {
      const lista = e.fantasmasPerto?.() ?? [];
      const doBolo = lista.filter((f) =>
        plano.bolo.some((b) => b.x === f.x && b.y === f.y && b.z === f.z),
      );
      const yMin = Math.min(...doBolo.map((f) => f.y));
      for (const f of doBolo) {
        if (f.y > yMin) continue;
        const t = tela(f.x + 0.5, f.y + 0.5, f.z + 0.5);
        if (t) r.push({ t, tocar: () => void e.missaoToque?.encher(f.x, f.y, f.z) });
      }
    }
    return r;
  }

  // ---------------------------------------------------------------- o toque generoso
  let engoliuAte = 0;
  let tocouEm = -Infinity;
  window.addEventListener(
    'pointerdown',
    (ev) => {
      const alvo = ev.target as HTMLElement | null;
      if (alvo?.closest?.('button, .alma-fundo, .roleta, .barra, .joystick, .menu-hud')) return;
      const lista = alvos();
      if (!lista.length) return;
      const preso = !!document.pointerLockElement;
      const x = preso ? innerWidth / 2 : ev.clientX;
      const y = preso ? innerHeight / 2 : ev.clientY;
      let melhor: { d: number; a: Alvo } | null = null;
      for (const a of lista) {
        const d = Math.hypot(a.t.x - x, a.t.y - y);
        if (d <= RAIO_TOQUE && (!melhor || d < melhor.d)) melhor = { d, a };
      }
      if (!melhor) return;
      melhor.a.tocar();
      tocouEm = agoraS();
      engoliuAte = performance.now() + 400;
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

  // ---------------------------------------------------------------- a mãozinha (o bicho)
  const modelo = document.querySelector<HTMLElement>('[data-guia-mao]');
  const maoCanto = document.createElement('div');
  maoCanto.className = 'guia-mao';
  maoCanto.innerHTML = modelo?.innerHTML ?? '';
  maoCanto.setAttribute('data-canto-mao', '');
  const onda = document.createElement('div');
  onda.className = 'guia-onda';
  document.body.append(onda, maoCanto);
  let chegouEm = -Infinity;
  let chegouLa = false;
  let maoTela: Tela | null = null;
  let maoAlvo: Alvo | null = null;
  function esconderMao(): void {
    maoCanto.classList.remove('mostra');
    onda.classList.remove('mostra');
    maoTela = null;
    maoAlvo = null;
  }
  /** Longe das bordas (os botões). */
  function boaParaMao(t: Tela): boolean {
    return t.x > 64 && t.x < innerWidth - 64 && t.y > 64 && t.y < innerHeight - 120;
  }

  // ---------------------------------------------------------------- a cada quadro
  scene.onBeforeRenderObservable.add(() => {
    const m = missao();
    // os fantasmas do bolo aceitam o toque de quem tem a missão do bolo no selinho
    e.boloLiberado = m === 'e1';
    const agora = agoraS();
    const la = guia.chegou();
    if (la && !chegouLa) chegouEm = agora;
    chegouLa = la;
    if (m === 'e2') {
      const lista =
        la && agora - chegouEm > MAO_CHEGA && agora - tocouEm > MAO_VOLTA ? alvos() : [];
      if (!lista.length) esconderMao();
      else {
        // o mais perto do meio de baixo da tela (onde o dedo alcança), longe dos botões
        const bons = lista.filter((a) => boaParaMao(a.t));
        const escolha = (bons.length ? bons : lista).sort(
          (a, b) =>
            Math.hypot(a.t.x - innerWidth / 2, a.t.y - innerHeight * 0.6) -
            Math.hypot(b.t.x - innerWidth / 2, b.t.y - innerHeight * 0.6),
        )[0];
        maoAlvo = escolha;
        maoTela = escolha.t;
        for (const el of [maoCanto, onda]) {
          el.style.setProperty('--x', `${escolha.t.x}px`);
          el.style.setProperty('--y', `${escolha.t.y}px`);
          el.classList.add('mostra');
        }
      }
    } else esconderMao();
    // o boneco fica transparente quando a mãozinha (esta ou a do bolo) fica atrás dele
    const ponta = maoTela ?? window.__guia?.mao?.() ?? null;
    e.limiteOpacidade = ponta && maoAtrasDoBoneco(e, ponta) ? 0.6 : 1;
  });

  // testes: a mãozinha do canto e os alvos de agora
  (window as unknown as { __canto?: unknown }).__canto = {
    plano: () => plano,
    mao: () => maoTela,
    alvos: () => alvos().map((a) => a.t),
    transparente: () => (e.limiteOpacidade ?? 1) < 1,
  };
}
