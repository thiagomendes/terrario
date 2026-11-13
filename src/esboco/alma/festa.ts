/**
 * Esboço da spec 023: a festa do prêmio. Raios girando, confete, o prêmio que chega pulando
 * (a fantasia no boneco de verdade da criança, ou a figurinha), as moedinhas caindo uma a uma
 * com um tlim que sobe, e então dois botões: vestir agora (camiseta) e "oba!" (o visto). Ao
 * fechar, a figurinha voa para o baú e o número das moedas sobe.
 */
import { figura, desenhoDaFigurinha } from './figuras';
import type { Missao, Habilidade } from './dados';
import type { UiAlma } from './ui';
import { tocarSomInterface } from '../../audio/somInterface';

let ctxAudio: AudioContext | null = null;
/** Tlim de moedinha (sintetizado aqui: duas notas de sino bem curtas, subindo a cada moeda). */
export function tlim(i: number): void {
  try {
    ctxAudio ??= new AudioContext();
    const c = ctxAudio;
    const t = c.currentTime;
    const base = 1318.5 * Math.pow(2, (Math.min(i, 8) * 2) / 12);
    for (const [f, g, d] of [
      [base, 0.12, 0.25],
      [base * 2.01, 0.05, 0.12],
    ] as const) {
      const o = c.createOscillator();
      const v = c.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      v.gain.setValueAtTime(0.0001, t);
      v.gain.exponentialRampToValueAtTime(g, t + 0.005);
      v.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(v).connect(c.destination);
      o.start(t);
      o.stop(t + d + 0.02);
    }
  } catch {
    // sem áudio
  }
}

const CORES = ['#ff5a5a', '#ffc93d', '#5cbf4f', '#2f7fe8', '#ff7aa8', '#8a5ad8', '#ff9a3a'];

function confete(cv: HTMLCanvasElement): () => void {
  const ctx = cv.getContext('2d')!;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = innerWidth * dpr;
  cv.height = innerHeight * dpr;
  const W = cv.width;
  const H = cv.height;
  const ps = Array.from({ length: 140 }, (_, i) => {
    const a = (i / 140) * Math.PI * 2;
    const v = (0.5 + ((i * 7919) % 100) / 100) * 14 * dpr;
    return {
      x: W / 2,
      y: H * 0.45,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 8 * dpr,
      r: (5 + (i % 4) * 2) * dpr,
      giro: i,
      cor: CORES[i % CORES.length],
      forma: i % 3,
    };
  });
  let vivo = true;
  const quadro = () => {
    if (!vivo) return;
    ctx.clearRect(0, 0, W, H);
    for (const p of ps) {
      p.vy += 0.35 * dpr;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.giro += 0.15;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.giro);
      ctx.fillStyle = p.cor;
      if (p.forma === 0) ctx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r);
      else if (p.forma === 1) {
        ctx.beginPath();
        ctx.arc(0, 0, p.r * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -p.r);
        ctx.lineTo(p.r, p.r);
        ctx.lineTo(-p.r, p.r);
        ctx.fill();
      }
      ctx.restore();
    }
    requestAnimationFrame(quadro);
  };
  quadro();
  return () => (vivo = false);
}

export interface Festa {
  missao: Missao;
  moedas: number;
  fantasia?: string;
  /** Subiu de nível junto (a medalha com a estrela nova). */
  nivel?: { h: Habilidade; nivel: number };
}

export function festejar(ui: UiAlma, f: Festa, vestir: (id: string) => void, moedasAte: number): Promise<void> {
  return new Promise((pronto) => {
    const el = document.createElement('div');
    el.className = 'alma-festa';
    el.setAttribute('data-alma-festa', f.missao.id);
    const raios = document.createElement('div');
    raios.className = 'raios';
    const cv = document.createElement('canvas');
    cv.className = 'confete';
    const meio = document.createElement('div');
    meio.className = 'meio';
    const premio = document.createElement('div');
    premio.className = 'premio';
    const figurinha = figura(desenhoDaFigurinha(f.missao), 'figurinha');
    if (f.fantasia) {
      premio.appendChild(figura(`fantasia:${f.fantasia}`));
      premio.appendChild(figurinha);
    } else {
      figurinha.classList.remove('figurinha');
      premio.appendChild(figurinha);
    }
    const chuva = document.createElement('div');
    chuva.className = 'chuva';
    const botoes = document.createElement('div');
    botoes.className = 'botoes';
    meio.append(premio, chuva, botoes);
    el.append(raios, cv, meio);
    if (f.nivel) {
      const n = document.createElement('div');
      n.className = 'nivel';
      const d = figura(f.nivel.h.desenho);
      d.style.cssText = `width:84px;height:84px;padding:10px;box-sizing:border-box;border-radius:50%;background:#fffaf0;box-shadow:0 0 0 6px ${f.nivel.h.cor},0 6px 0 6px rgba(120,60,10,0.3)`;
      const est = document.createElement('span');
      est.className = 'alma-estrelas';
      for (let i = 0; i < 3; i++) est.appendChild(ui.svgEl(i < f.nivel.nivel ? 'estrela' : 'estrelaVazia'));
      n.append(d, est);
      el.appendChild(n);
    }
    document.body.appendChild(el);
    document.exitPointerLock?.();
    const parar = confete(cv);
    tocarSomInterface('festa');
    // as moedinhas caem uma a uma
    for (let i = 0; i < f.moedas; i++)
      setTimeout(() => {
        chuva.appendChild(ui.svgEl('moeda', 'moeda'));
        tlim(i);
      }, 700 + i * 260);
    const fim = () => {
      parar();
      // a figurinha voa para o baú, e as moedas também; o número sobe
      const alvo = ui.bau.getBoundingClientRect();
      ui.voar(figurinha, figurinha.getBoundingClientRect(), alvo);
      chuva.querySelectorAll<HTMLElement>('.moeda').forEach((m, i) =>
        setTimeout(() => ui.voar(m, m.getBoundingClientRect(), alvo), 80 * i),
      );
      el.style.transition = 'opacity 0.4s';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 420);
      setTimeout(() => {
        void ui.contarMoedas(moedasAte, (i) => tlim(i)).then(() => {
          ui.renderHud();
          pronto();
        });
      }, 650);
    };
    setTimeout(() => {
      if (f.fantasia) {
        const v = document.createElement('button');
        v.type = 'button';
        v.className = 'alma-botao azul';
        v.setAttribute('aria-label', 'Vestir agora');
        v.setAttribute('data-alma-vestir', '');
        v.innerHTML = `<span class="alma-svg"><svg viewBox="0 0 64 64"><path d="M22 8 L32 14 L42 8 L58 18 L52 30 L46 27 L46 58 L18 58 L18 27 L12 30 L6 18 Z" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg></span>`;
        v.addEventListener('click', () => {
          vestir(f.fantasia!);
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
      ok.appendChild(ui.svgEl('ok'));
      ok.addEventListener('click', fim);
      botoes.appendChild(ok);
    }, 900 + f.moedas * 260);
  });
}
