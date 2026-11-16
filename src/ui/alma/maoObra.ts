/**
 * Spec 030: a mãozinha da obra. Chegou no canteiro da missão: a mãozinha (desenho nosso) vem,
 * toca num bloco azul e uma ondinha sai do dedo. Mostra duas vezes; volta com calma se a
 * criança ficar ~8 s parada sem pôr bloco. Nunca trava nada.
 *
 * Só a camada de baixo (um bloco de cima sem nada embaixo o núcleo não aceita) e só onde o raio
 * do dedo naquele ponto pega **esse** bloco (a mesma conta do jogo, `fantasmaNoRaio`), sem
 * outro fantasma na frente nem bloco no caminho; nunca em cima de gente (o pedreiro abriria as
 * trocas), do próprio boneco ou dos botões das bordas.
 */
import { Matrix } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import type { EstadoDepuracao } from '../../render/cena';
import { fantasmaNoRaio } from '../../jogo/miraObra';
import { Bloco } from '../../world/blocks';
import { CANTEIRO_BOLO } from '../../world/protecao';

const CONTORNO = '#5a3a22';
const MENTA = '#5fe3c4';
/** Parada sem pôr bloco: a mãozinha mostra de novo (s). */
const ESPERA_MAO = 8;

/** A mãozinha (desenho nosso); também a da dica de toque (`dicaToque.ts`). */
export const MAO_SVG = `<svg viewBox="0 0 80 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g stroke="${CONTORNO}" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round">
    <path d="M30 8 Q30 2 36 2 Q42 2 42 8 L42 44 L46 42 Q52 38 56 42 L58 44 Q64 40 68 45 L70 48 Q76 46 78 52 L78 70 Q78 92 54 94 L44 94 Q26 92 20 76 L10 60 Q6 52 12 50 Q18 48 22 54 L30 64 Z" fill="#ffd9b5"/>
    <path d="M46 44 L46 58 M58 46 L58 60 M70 50 L70 62" fill="none" stroke-width="2.6"/>
    <path d="M33 10 Q36 7 39 10" fill="none" stroke="#fff3e2" stroke-width="2.4"/>
  </g>
</svg>`;

const CSS = `
.guia-mao { position: fixed; left: 0; top: 0; z-index: 8; width: 74px; height: 89px; margin: -4px 0 0 -26px; opacity: 0; pointer-events: none;
  will-change: transform, opacity; filter: drop-shadow(0 4px 0 rgba(90, 58, 34, 0.25)) drop-shadow(0 6px 10px rgba(20, 14, 6, 0.3)); }
.guia-mao svg { width: 100%; height: 100%; display: block; transform-origin: 36px 6px; }
.guia-mao.mostra { animation: guia-mao-vem 2.6s ease-in-out infinite; }
.guia-mao.mostra svg { animation: guia-mao-toca 2.6s ease-in-out infinite; }
@keyframes guia-mao-vem { 0% { opacity: 0; transform: translate(var(--x), var(--y)) translate(70px, 90px); }
  18% { opacity: 1; } 38% { transform: translate(var(--x), var(--y)); } 70% { opacity: 1; transform: translate(var(--x), var(--y)); }
  100% { opacity: 0; transform: translate(var(--x), var(--y)) translate(40px, 60px); } }
@keyframes guia-mao-toca { 0%, 40% { transform: scale(1); } 47% { transform: scale(0.84) translateY(4px); } 56%, 100% { transform: scale(1); } }
.guia-onda { position: fixed; left: 0; top: 0; z-index: 8; width: 60px; height: 60px; margin: -30px 0 0 -30px; border-radius: 50%; pointer-events: none;
  border: 5px solid ${MENTA}; box-shadow: 0 0 12px ${MENTA}; opacity: 0; }
.guia-onda.mostra { animation: guia-onda 2.6s ease-out infinite; }
@keyframes guia-onda { 0%, 45% { opacity: 0; transform: translate(var(--x), var(--y)) scale(0.3); }
  48% { opacity: 1; } 75%, 100% { opacity: 0; transform: translate(var(--x), var(--y)) scale(1.6); } }
@media (prefers-reduced-motion: reduce) { .guia-mao.mostra, .guia-mao.mostra svg, .guia-onda.mostra { animation-duration: 5s; } }
`;
/** O estilo da mãozinha e da ondinha (a dica de toque usa o mesmo). */
export const CSS_MAO = CSS;

type Ponto = { x: number; y: number; z: number };

export interface MaoObra {
  /** Chegou ao canteiro n (a mãozinha começa); null: saiu. */
  definir(canteiro: number | null): void;
  /** Testes: onde ela mostra (tela) e o bloco. */
  tela(): { x: number; y: number } | null;
  fantasma(): Ponto | null;
  motivo(): string;
}

export function criarMaoObra(e: EstadoDepuracao, scene: Scene): MaoObra {
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  const mao = document.createElement('div');
  mao.className = 'guia-mao';
  mao.setAttribute('data-guia-mao', '');
  mao.innerHTML = MAO_SVG;
  const onda = document.createElement('div');
  onda.className = 'guia-onda';
  document.body.append(onda, mao);

  let canteiro: number | null = null;
  let chegouEm = 0;
  let ultimaObra = 0;
  let colocadosAntes = 0;
  let pausada = false;
  /**
   * Spec 031: no bolo, a mãozinha pula sozinha para o próximo bloco (logo depois de cada
   * toque, até a vela), em vez de esperar a criança ficar parada.
   */
  let seguida = false;
  let voltaEm = 0;
  let alvo: Ponto | null = null;
  const agoraS = () => performance.now() / 1000;
  const AR = Bloco.AR;

  /** O raio do dedo nesse ponto da tela pega o fantasma f (a mesma conta do jogo)? */
  function toquePega(x: number, y: number, f: Ponto, lista: readonly Ponto[]): boolean {
    const cam = scene.getCameraByName('camera-visao') ?? scene.activeCamera;
    if (!cam) return false;
    const r = scene.createPickingRay(x, y, Matrix.Identity(), cam);
    const o = { x: r.origin.x, y: r.origin.y, z: r.origin.z };
    const d = { x: r.direction.x, y: r.direction.y, z: r.direction.z };
    // o primeiro bloco de verdade no caminho (o tapume, um poste): o dedo bate nele antes
    let solido = Infinity;
    for (let s = 0.3; s < 14; s += 0.1) {
      const b =
        e.bloco?.(
          Math.floor(o.x + d.x * s),
          Math.floor(o.y + d.y * s),
          Math.floor(o.z + d.z * s),
        ) ?? AR;
      if (b !== AR) {
        solido = s;
        break;
      }
    }
    const p = fantasmaNoRaio(o, d, lista, { limite: 40, ima: 0.5, solido, alcanca: () => true });
    return !!p && p.x === f.x && p.y === f.y && p.z === f.z;
  }

  /** Testes: por que a mãozinha do bolo não achou lugar (o último motivo). */
  let motivo = '';
  function escolher(): Ponto | null {
    const pes = e.jogadorPes?.();
    if (!pes || canteiro === null) return null;
    const todos = e.fantasmasPerto?.() ?? [];
    const lista = todos.filter((f) => f.canteiro === canteiro);
    if (!lista.length) return null;
    const yMin = Math.min(...lista.map((f) => f.y));
    const tela = (x: number, y: number, z: number) => e.telaDoPonto?.(x, y, z) ?? null;
    // gente perto (o pedreiro) e o próprio boneco: o dedo cairia neles
    const gente = (e.criaturas?.() ?? [])
      .filter((c) => Math.hypot(c.x - pes[0], c.z - pes[2]) < 10)
      .flatMap((c) => [tela(c.x, c.y + 0.7, c.z), tela(c.x, c.y + 1.5, c.z)]);
    // (no bolo, a mãozinha pode ficar atrás do boneco: ele fica transparente, spec 031)
    if (!seguida) for (const dy of [0.5, 1.1, 1.7]) gente.push(tela(pes[0], pes[1] + dy, pes[2]));
    const pessoas = gente.filter((t): t is { x: number; y: number } => !!t);
    let melhor: Ponto | null = null;
    let custo = Infinity;
    for (const f of lista) {
      if (f.y > yMin) continue;
      const t = tela(f.x + 0.5, f.y + 0.5, f.z + 0.5);
      // longe dos botões das bordas (em pé a tela é estreita: a margem encolhe)
      const mx = seguida ? 34 : Math.min(190, innerWidth * 0.2);
      const cima = seguida ? 44 : 130;
      const baixo = seguida ? 110 : 150;
      if (!t || t.x < mx || t.x > innerWidth - mx || t.y < cima || t.y > innerHeight - baixo) {
        if (seguida) motivo = `tela ${t ? `${Math.round(t.x)},${Math.round(t.y)}` : 'atras'}`;
        continue;
      }
      if (!seguida && pessoas.some((g) => Math.hypot(g.x - t.x, g.y - t.y) < 75)) continue;
      // no bolo o toque é do canto (o fantasma mais perto do dedo na tela), sem conferir o raio
      if (!seguida && !toquePega(t.x, t.y, f, todos)) continue;
      const k = Math.hypot(f.x + 0.5 - pes[0], f.z + 0.5 - pes[2]);
      // nem colado no boneco (o corpo tapa), nem longe (o dedo não alcança)
      if (k > (seguida ? 6 : 4.5)) {
        if (seguida) motivo = `longe ${k.toFixed(1)}`;
        continue;
      }
      // no bolo, o de trás primeiro (o da frente, cheio, taparia o de trás)
      const c = seguida ? -k : Math.abs(k - 2.5);
      if (c < custo) {
        custo = c;
        melhor = { x: f.x, y: f.y, z: f.z };
      }
    }
    return melhor;
  }

  function esconder(): void {
    mao.classList.remove('mostra');
    onda.classList.remove('mostra');
  }

  scene.onBeforeRenderObservable.add(() => {
    if (canteiro === null) return esconder();
    const agora = agoraS();
    const colocados = e.obraColocados ?? 0;
    if (colocados > colocadosAntes) {
      // pôs um bloco: a mãozinha sai e só volta se ela ficar parada de novo (no bolo, ela
      // pula para o próximo bloco num instantinho)
      colocadosAntes = colocados;
      ultimaObra = agora;
      pausada = !seguida;
      voltaEm = agora + 0.55;
      alvo = null;
      esconder();
    }
    const vista = !document.body.dataset.overlay && agora - chegouEm > 1.2;
    if (seguida) {
      if (!vista || agora < voltaEm) {
        esconder();
        return;
      }
      if (!alvo || !mao.classList.contains('mostra')) alvo = escolher();
      if (!alvo) return esconder();
      const t = e.telaDoPonto?.(alvo.x + 0.5, alvo.y + 0.5, alvo.z + 0.5);
      if (!t) return;
      for (const el of [mao, onda]) {
        el.style.setProperty('--x', `${t.x}px`);
        el.style.setProperty('--y', `${t.y}px`);
        el.classList.add('mostra');
      }
      return;
    }
    // mostra duas vezes ao chegar (2 voltas de 2,6 s); depois, só com ESPERA_MAO s parada
    const mostrar =
      vista &&
      ((!pausada && agora - chegouEm < 1.2 + 5.2) ||
        (agora - ultimaObra > ESPERA_MAO && (agora - ultimaObra - ESPERA_MAO) % 20 < 5.2));
    if (!mostrar) {
      esconder();
      if (!vista) alvo = null;
      return;
    }
    if (!alvo || !mao.classList.contains('mostra')) alvo = escolher();
    if (!alvo) return;
    const t = e.telaDoPonto?.(alvo.x + 0.5, alvo.y + 0.5, alvo.z + 0.5);
    if (!t) return;
    for (const el of [mao, onda]) {
      el.style.setProperty('--x', `${t.x}px`);
      el.style.setProperty('--y', `${t.y}px`);
      el.classList.add('mostra');
    }
  });

  return {
    definir(n) {
      if (n === canteiro) return;
      canteiro = n;
      alvo = null;
      seguida = n === CANTEIRO_BOLO;
      if (n === null) return esconder();
      chegouEm = agoraS();
      ultimaObra = chegouEm;
      colocadosAntes = e.obraColocados ?? 0;
      pausada = false;
    },
    tela: () =>
      mao.classList.contains('mostra')
        ? {
            x: parseFloat(mao.style.getPropertyValue('--x')),
            y: parseFloat(mao.style.getPropertyValue('--y')),
          }
        : null,
    fantasma: () => alvo ?? escolher(),
    motivo: () => motivo,
  };
}
