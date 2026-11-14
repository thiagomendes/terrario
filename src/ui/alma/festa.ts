/**
 * Spec 023 (T08): as festas, promovidas do esboço aprovado. Uma só peça para os três momentos, cada um com a sua cara:
 *
 * - **missão:** raios dourados girando, confete, o prêmio chega pulando (a fantasia no boneco
 *   de verdade da criança, ou a figurinha), as moedinhas caem uma a uma com um tlim que sobe;
 * - **nível:** a estrela do nível cresce com o número novo, o presentinho aparece embaixo;
 * - **premium:** fundo de veludo azul-noite com estrelas e o holofote, o item sobe no pedestal
 *   com o brilho que corre por ele.
 *
 * Ao fechar, o que foi ganho voa para o lugar dele no HUD (a carteira ou a estrela do nível).
 */
import { tocarSomInterface } from '../../audio/somInterface';
import { arte } from './arte';

/** Tlim da moedinha (régua da 019: pelo motor de som do jogo, com o volume dos efeitos). */
export function tlim(_i = 0): void {
  tocarSomInterface('moeda');
}

const CORES = ['#ff5a5a', '#ffc93d', '#5cbf4f', '#2f7fe8', '#ff7aa8', '#8a5ad8', '#ff9a3a'];

function confete(cv: HTMLCanvasElement, estrelas = false): () => void {
  const c2 = cv.getContext('2d')!;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = innerWidth * dpr;
  cv.height = innerHeight * dpr;
  const W = cv.width;
  const H = cv.height;
  const n = estrelas ? 90 : 140;
  const ps = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 * 1.7;
    const v = (0.5 + ((i * 7919) % 100) / 100) * 14 * dpr;
    return {
      x: W / 2,
      y: H * 0.45,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 8 * dpr,
      r: (5 + (i % 4) * 2) * dpr,
      giro: i,
      cor: estrelas ? ['#ffe27a', '#fff6c8', '#ffc93d', '#c9b8ff'][i % 4] : CORES[i % CORES.length],
      forma: estrelas ? 3 : i % 3,
    };
  });
  let vivo = true;
  const quadro = () => {
    if (!vivo) return;
    c2.clearRect(0, 0, W, H);
    for (const p of ps) {
      p.vy += (estrelas ? 0.12 : 0.35) * dpr;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.giro += 0.12;
      c2.save();
      c2.translate(p.x, p.y);
      c2.rotate(p.giro);
      c2.fillStyle = p.cor;
      c2.beginPath();
      if (p.forma === 0) c2.rect(-p.r, -p.r * 0.5, p.r * 2, p.r);
      else if (p.forma === 1) c2.arc(0, 0, p.r * 0.7, 0, Math.PI * 2);
      else if (p.forma === 2) {
        c2.moveTo(0, -p.r);
        c2.lineTo(p.r, p.r);
        c2.lineTo(-p.r, p.r);
      } else
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4;
          const r = k % 2 ? p.r * 0.35 : p.r * 1.2;
          c2.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
      c2.fill();
      c2.restore();
    }
    requestAnimationFrame(quadro);
  };
  quadro();
  return () => (vivo = false);
}

export const CSS_FESTA = `
.alma-festa { position: fixed; inset: 0; z-index: 70; display: grid; place-items: center; overflow: hidden;
  background: radial-gradient(circle at 50% 45%, rgba(255, 236, 160, 0.94), rgba(255, 170, 60, 0.86) 45%, rgba(120, 50, 20, 0.86)); }
.alma-festa.nivel { background: radial-gradient(circle at 50% 42%, rgba(255, 248, 210, 0.96), rgba(150, 205, 255, 0.9) 46%, rgba(40, 70, 160, 0.92)); }
.alma-festa.premium { background: radial-gradient(ellipse at 50% 38%, #4a3aa8 0%, #241a5e 45%, #0e0a2a 100%); }
.alma-festa .raios { position: absolute; left: 50%; top: 45%; width: 180vmax; height: 180vmax; margin: -90vmax 0 0 -90vmax; border-radius: 50%;
  background: repeating-conic-gradient(rgba(255,255,255,0.22) 0 10deg, transparent 10deg 20deg); animation: alma-gira 14s linear infinite; }
.alma-festa.premium .raios { background: repeating-conic-gradient(rgba(255,226,140,0.10) 0 6deg, transparent 6deg 18deg); }
.alma-festa.premium .holofote { position: absolute; left: 50%; top: -10%; width: 70vmin; height: 120%; transform: translateX(-50%);
  background: linear-gradient(180deg, rgba(255,240,190,0.35), rgba(255,240,190,0) 75%); clip-path: polygon(38% 0, 62% 0, 100% 100%, 0 100%); }
.alma-festa.premium .ceu i { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: #fff; animation: alma-pisca 2.4s ease-in-out infinite; }
@keyframes alma-pisca { 50% { opacity: 0.15; transform: scale(0.5); } }
@keyframes alma-gira { to { transform: rotate(1turn); } }
.alma-festa canvas.confete { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.alma-festa .meio { position: relative; display: grid; justify-items: center; gap: 10px; }
.alma-festa .premio { position: relative; width: min(42vh, 280px); height: min(42vh, 280px); display: grid; place-items: center;
  animation: alma-chega 0.7s cubic-bezier(.2,1.6,.4,1) both; }
.alma-festa .premio .alma-fig { width: 100%; height: 100%; filter: drop-shadow(0 8px 0 rgba(120,60,10,0.25)); }
.alma-festa .premio .figurinha { position: absolute; left: -18%; bottom: -4%; width: 44%; height: 44%; padding: 8px; box-sizing: border-box; border-radius: 18px; background: #fff;
  box-shadow: 0 0 0 4px #fff, 0 5px 0 6px rgba(150,110,60,0.3); transform: rotate(-8deg); animation: alma-chega 0.6s 0.35s cubic-bezier(.2,1.6,.4,1) both; }
.alma-festa.premium .premio { animation: alma-sobe 1s cubic-bezier(.2,1.3,.4,1) both; }
.alma-festa.premium .premio .alma-fig { filter: drop-shadow(0 0 22px rgba(255, 220, 120, 0.55)) drop-shadow(0 10px 0 rgba(0,0,0,0.25)); animation: alma-flutua 3s ease-in-out 1s infinite; }
.alma-festa.premium .pedestal { width: min(46vh, 300px); height: 34px; margin-top: -26px; border-radius: 50%;
  background: radial-gradient(ellipse at 50% 30%, #ffe9a8, #c9902a 60%, #7a5214); box-shadow: 0 10px 30px rgba(255,200,90,0.35); }
.alma-festa.premium .brilho { position: absolute; inset: 0; overflow: hidden; border-radius: 30px; pointer-events: none; }
.alma-festa.premium .brilho::after { content: ''; position: absolute; top: -20%; bottom: -20%; width: 30%; left: -40%; transform: skewX(-18deg);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent); animation: alma-varre 2.6s ease-in-out 1.1s infinite; }
@keyframes alma-varre { to { left: 130%; } }
@keyframes alma-sobe { from { transform: translateY(40%) scale(0.6); opacity: 0; } }
@keyframes alma-flutua { 50% { transform: translateY(-8px); } }
@keyframes alma-chega { from { transform: scale(0.1) rotate(-20deg); opacity: 0; } }
.alma-festa .estrelao { position: relative; width: min(40vh, 240px); height: min(40vh, 240px); display: grid; place-items: center; animation: alma-chega 0.8s cubic-bezier(.2,1.6,.4,1) both; }
.alma-festa .estrelao svg { position: absolute; inset: 0; width: 100%; height: 100%; filter: drop-shadow(0 10px 0 rgba(40,60,120,0.3)); }
.alma-festa .estrelao b { position: relative; font: 900 clamp(44px, 12vh, 88px) var(--display); color: #8a4a00; text-shadow: 0 3px 0 #fff3b0; margin-top: 8%; }
.alma-festa .presente { display: flex; align-items: center; gap: 12px; padding: 8px 16px 8px 8px; border-radius: 22px; background: #fffaf0;
  box-shadow: 0 0 0 4px #ffe27a, 0 8px 0 4px rgba(30,40,90,0.3); animation: alma-chega 0.6s 0.9s cubic-bezier(.2,1.6,.4,1) both; }
.alma-festa .presente .alma-fig { width: 64px; height: 64px; }
.alma-festa .chuva { display: flex; gap: 6px; min-height: 52px; }
.alma-festa .chuva .moeda { width: 52px; height: 52px; animation: alma-chega 0.45s cubic-bezier(.2,1.6,.4,1) both; }
.alma-festa .botoes { display: flex; gap: 18px; min-height: 70px; }
.alma-festa .botoes > * { animation: alma-chega 0.4s cubic-bezier(.2,1.6,.4,1) both; }
.alma-festa .canto { position: absolute; right: 6%; top: 10%; display: grid; justify-items: center; gap: 4px; animation: alma-chega 0.6s 1.2s both; }
@media (max-height: 500px) {
  .alma-festa .chuva .moeda { width: 40px; height: 40px; }
  .alma-festa .meio { gap: 6px; }
  .alma-festa .botoes { min-height: 60px; }
  .alma-festa .presente .alma-fig { width: 48px; height: 48px; }
}
`;

export interface Celebracao {
  tipo: 'missao' | 'nivel' | 'premium';
  /** A missão da festa (testes e leitor de tela). */
  missao?: string;
  /** O que chega no meio (a figura grande). */
  premio: HTMLElement;
  /** Figurinha que vai junto (missão com fantasia). */
  figurinha?: HTMLElement;
  /** Moedinhas (que caem, na missão; do presente, no nível). */
  moedas: number;
  /** Nível novo (festa de nível). */
  nivel?: number;
  /** O presentinho do nível (figura). */
  presente?: HTMLElement;
  /** Selo no canto (a habilidade que ganhou estrela). */
  canto?: HTMLElement;
  /** Botão a mais (vestir agora). */
  extra?: { rotulo: string; desenho: string; aoTocar(): void };
  /** Para onde voam a figura e as moedas ao fechar. */
  destino(): DOMRect;
  voar(el: HTMLElement, de: DOMRect, para: DOMRect): void;
  /** Depois do voo (o número das moedas sobe aqui). */
  depois(): Promise<void>;
  svg(nome: string, classe?: string): HTMLElement;
}

export function celebrar(c: Celebracao): Promise<void> {
  return new Promise((pronto) => {
    const el = document.createElement('div');
    el.className = `alma-festa ${c.tipo}`;
    el.setAttribute('data-alma-festa', c.tipo);
    el.setAttribute('role', 'dialog');
    el.setAttribute(
      'aria-label',
      c.tipo === 'nivel'
        ? `Nível ${c.nivel ?? ''}`
        : c.tipo === 'premium'
          ? 'Comprou'
          : 'Missão feita',
    );
    if (c.missao) el.dataset.missao = c.missao;
    const raios = document.createElement('div');
    raios.className = 'raios';
    el.appendChild(raios);
    if (c.tipo === 'premium') {
      const ceu = document.createElement('div');
      ceu.className = 'ceu';
      for (let i = 0; i < 40; i++) {
        const s = document.createElement('i');
        s.style.left = `${(i * 37.7) % 100}%`;
        s.style.top = `${(i * 61.3) % 100}%`;
        s.style.animationDelay = `${(i % 7) * 0.3}s`;
        ceu.appendChild(s);
      }
      const holofote = document.createElement('div');
      holofote.className = 'holofote';
      el.append(ceu, holofote);
    }
    const cv = document.createElement('canvas');
    cv.className = 'confete';
    const meio = document.createElement('div');
    meio.className = 'meio';
    if (c.tipo === 'nivel') {
      const e = document.createElement('div');
      e.className = 'estrelao';
      e.innerHTML = arte('nivel');
      const b = document.createElement('b');
      b.textContent = String(c.nivel ?? '');
      e.appendChild(b);
      meio.appendChild(e);
      if (c.presente) {
        const p = document.createElement('div');
        p.className = 'presente';
        p.appendChild(c.presente);
        if (c.moedas) {
          const m = c.svg('moeda', 'moeda');
          m.style.width = '34px';
          m.style.height = '34px';
          const n = document.createElement('b');
          n.style.font = '900 1.4rem var(--display)';
          n.style.color = '#8a5a10';
          n.textContent = `+${c.moedas}`;
          p.append(m, n);
        }
        meio.appendChild(p);
      }
    } else {
      const premio = document.createElement('div');
      premio.className = 'premio';
      premio.appendChild(c.premio);
      if (c.figurinha) {
        c.figurinha.classList.add('figurinha');
        premio.appendChild(c.figurinha);
      }
      if (c.tipo === 'premium') {
        const brilho = document.createElement('div');
        brilho.className = 'brilho';
        premio.appendChild(brilho);
      }
      meio.appendChild(premio);
      if (c.tipo === 'premium') {
        const ped = document.createElement('div');
        ped.className = 'pedestal';
        meio.appendChild(ped);
      }
    }
    const chuva = document.createElement('div');
    chuva.className = 'chuva';
    const botoes = document.createElement('div');
    botoes.className = 'botoes';
    if (c.tipo === 'missao') meio.appendChild(chuva);
    meio.appendChild(botoes);
    el.append(cv, meio);
    if (c.canto) {
      c.canto.classList.add('canto');
      el.appendChild(c.canto);
    }
    document.body.appendChild(el);
    document.exitPointerLock?.();
    const parar = confete(cv, c.tipo !== 'missao');
    // os sons na régua da 019 (pelo motor do jogo): o confete da missão, a caixinha de música
    // do nível e a da vitrine (mais alta, com o fundo macio)
    tocarSomInterface(c.tipo === 'missao' ? 'festa' : c.tipo === 'nivel' ? 'nivel' : 'vitrine');
    if (c.tipo === 'missao')
      for (let i = 0; i < c.moedas; i++)
        setTimeout(
          () => {
            chuva.appendChild(c.svg('moeda', 'moeda'));
            tlim(i);
          },
          700 + i * 260,
        );
    let fechou = false;
    const fim = () => {
      if (fechou) return;
      fechou = true;
      parar();
      const alvo = c.destino();
      const voa =
        c.tipo === 'nivel'
          ? meio.querySelector<HTMLElement>('.estrelao')
          : (c.figurinha ?? meio.querySelector<HTMLElement>('.premio'));
      if (voa && c.tipo !== 'premium') c.voar(voa, voa.getBoundingClientRect(), alvo);
      chuva
        .querySelectorAll<HTMLElement>('.moeda')
        .forEach((m, i) => setTimeout(() => c.voar(m, m.getBoundingClientRect(), alvo), 80 * i));
      el.style.transition = 'opacity 0.4s';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 420);
      setTimeout(() => void c.depois().then(pronto), 600);
    };
    const espera = c.tipo === 'missao' ? 900 + c.moedas * 260 : c.tipo === 'nivel' ? 1700 : 1500;
    setTimeout(() => {
      if (c.extra) {
        const v = document.createElement('button');
        v.type = 'button';
        v.className = 'alma-botao azul';
        v.setAttribute('aria-label', c.extra.rotulo);
        v.setAttribute('data-alma-vestir', '');
        v.innerHTML = `<span class="alma-svg">${c.extra.desenho}</span>`;
        v.addEventListener('click', () => {
          c.extra!.aoTocar();
          tocarSomInterface('criar');
          fim();
        });
        botoes.appendChild(v);
      }
      const ok = document.createElement('button');
      ok.type = 'button';
      ok.className = 'alma-botao chama';
      ok.setAttribute('aria-label', 'Oba!');
      ok.setAttribute('data-alma-oba', '');
      ok.appendChild(c.svg('ok'));
      ok.addEventListener('click', fim);
      botoes.appendChild(ok);
    }, espera);
  });
}

/** O desenho da camiseta (botão "vestir agora"). */
export const CAMISETA = `<svg viewBox="0 0 64 64"><path d="M22 8 L32 14 L42 8 L58 18 L52 30 L46 27 L46 58 L18 58 L18 27 L12 30 L6 18 Z" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>`;
