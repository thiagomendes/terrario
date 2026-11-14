/**
 * Spec 031: o canto das missões no aparelho (Era dos Dinos e Doce Reino). O núcleo decide tudo
 * (os ovinhos, os bichos do pasto, as rochas de osso, o bolo, as moedinhas); aqui fica o que a
 * criança vê e toca:
 *
 * - o ninho de gravetos e o brilhinho em cima de cada ovinho ainda no chão;
 * - o "pop" da comida que aparece na mão perto do bicho (d2, e2), com som, já na mão;
 * - a mãozinha no lugar (a rocha de osso, o bicho sem comida), em até 1,5 s ao chegar, que pula
 *   para o próximo depois de cada toque (a do bolo é a da obra, `maoObra`, no mesmo jeito);
 * - o toque generoso: com a missão no lugar, o dedo pega a rocha, o fantasma do bolo da camada
 *   de agora ou o bicho ainda sem comida que estiver perto dele (alvo de 56 px ou mais);
 * - o osso que sai da rocha e voa até o selinho;
 * - o boneco ~40% transparente quando a mãozinha fica atrás dele.
 */
import type { Scene } from '@babylonjs/core/scene';
import type { EstadoDepuracao } from '../../render/cena';
import type { GuiaMissao } from '../../render/guiaMissao';
import type { AlmaUi } from './index';
import { criarBrilhoOvos, criarNinho } from '../../render/ninhoCanto';
import { missaoFixada } from './hud';
import { figura } from './figuras';
import { tocarSomInterface } from '../../audio/somInterface';
import { Bloco } from '../../world/blocks';

const CSS = `
.canto-pop { position: fixed; z-index: 9; width: 74px; height: 74px; margin: -37px 0 0 -37px; pointer-events: none;
  border-radius: 50%; background: radial-gradient(circle, #fffbe8 0 52%, rgba(255, 233, 160, 0.9) 60%, rgba(255, 233, 160, 0) 72%);
  display: grid; place-items: center; animation: canto-pop 1.25s cubic-bezier(.2,1.5,.4,1) forwards; }
.canto-pop .alma-fig { width: 54px; height: 54px; }
@keyframes canto-pop { 0% { transform: scale(0.2); opacity: 0; } 18% { transform: scale(1.25); opacity: 1; }
  32% { transform: scale(1); } 70% { transform: scale(1); opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) scale(0.45); opacity: 0; } }
.canto-voa { position: fixed; z-index: 9; width: 54px; height: 54px; margin: -27px 0 0 -27px; pointer-events: none;
  transition: transform 0.75s cubic-bezier(.45,-0.35,.6,1), opacity 0.75s; }
.canto-voa .alma-fig { width: 100%; height: 100%; }
.canto-voa.sai { animation: canto-sai 0.3s ease-out both; }
@keyframes canto-sai { from { transform: scale(0.3) translateY(10px); } 70% { transform: scale(1.2) translateY(-6px); } to { transform: scale(1) translateY(-6px); } }
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
  st.textContent = CSS;
  document.head.appendChild(st);
  if (p.ninho) criarNinho(scene, p.ninho[0], p.ninho[1], p.ninho[2]);
  const brilhos = p.ovos.length ? criarBrilhoOvos(scene, p.ovos) : null;
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
    if (d.item !== 'trigo' || (m !== 'd2' && m !== 'e2')) return;
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
    if (m === 'd3')
      for (const [x, y, z] of plano.fosseis) {
        if ((e.bloco?.(x, y, z) ?? Bloco.AR) !== Bloco.MINERIO_FERRO) continue;
        const t = tela(x + 0.5, y + 0.75, z + 0.5);
        if (t) r.push({ t, tocar: () => escavar(x, y, z, t) });
      }
    else if (m === 'd2' || m === 'e2') {
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
      if (alvo?.closest?.('button, .alma-fundo, .roda, .barra, .joystick, .menu-hud')) return;
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

  /** A rocha de osso: sai com um pó, e o osso voa até o selinho. */
  function escavar(x: number, y: number, z: number, t: Tela): void {
    e.missaoToque?.escavar(x, y, z);
    tocarSomInterface('plim');
    const el = document.createElement('div');
    el.className = 'canto-voa sai';
    el.appendChild(figura('osso'));
    el.style.left = `${t.x}px`;
    el.style.top = `${t.y}px`;
    document.body.appendChild(el);
    const selo = document.querySelector('.alma-missao:not([hidden])')?.getBoundingClientRect();
    setTimeout(() => {
      el.classList.remove('sai');
      if (selo) {
        el.style.transform = `translate(${selo.left + selo.width / 2 - t.x}px, ${selo.top + selo.height / 2 - t.y}px) scale(0.5)`;
        el.style.opacity = '0.4';
      }
    }, 380);
    setTimeout(() => el.remove(), 1250);
  }

  // ---------------------------------------------------------------- a mãozinha (rocha e bicho)
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
    // o brilhinho dos ovinhos ainda no chão (só com a d1 no selinho)
    if (brilhos) {
      const noChao =
        m === 'd1' && noJogo() ? (e.itensNoChao?.() ?? []).filter((i) => i.item === 'ovo') : [];
      brilhos.quadro(
        plano.ovos.map((o) => noChao.some((q) => Math.hypot(q.x - o[0], q.z - o[2]) < 1.2)),
        agoraS(),
      );
    }
    const agora = agoraS();
    const la = guia.chegou();
    if (la && !chegouLa) chegouEm = agora;
    chegouLa = la;
    if (m === 'd3' || m === 'd2' || m === 'e2') {
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
    e.limiteOpacidade = ponta && atrasDoBoneco(ponta) ? 0.6 : 1;
  });

  /** A mãozinha cai em cima do boneco na tela? */
  function atrasDoBoneco(t: Tela): boolean {
    const pes = e.jogadorPes?.();
    if (!pes) return false;
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const dx of [-0.4, 0.4])
      for (const dz of [-0.4, 0.4])
        for (const dy of [0, 1.9]) {
          const q = tela(pes[0] + dx, pes[1] + dy, pes[2] + dz);
          if (!q) continue;
          x0 = Math.min(x0, q.x);
          x1 = Math.max(x1, q.x);
          y0 = Math.min(y0, q.y);
          y1 = Math.max(y1, q.y);
        }
    // a mãozinha toda (o dedo e a palma, uns 80 px abaixo da ponta) conta
    return t.x > x0 - 30 && t.x < x1 + 30 && t.y + 80 > y0 && t.y < y1;
  }

  // testes: a mãozinha do canto e os alvos de agora
  (window as unknown as { __canto?: unknown }).__canto = {
    plano: () => plano,
    mao: () => maoTela,
    alvos: () => alvos().map((a) => a.t),
    transparente: () => (e.limiteOpacidade ?? 1) < 1,
  };
}
