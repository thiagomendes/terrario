/**
 * Setas para os amigos longe (spec 010): na borda da tela, uma seta da cor de cada um
 * com o apelido e a distância, apontando para onde ele está em relação ao seu olhar.
 */
import { corDoAmigo } from './mapa';

export const CSS_SETAS = `
.setas-amigos { position: fixed; inset: 0; pointer-events: none; z-index: 5; }
.seta-amigo {
  position: absolute; display: flex; align-items: center; gap: 6px; transform: translate(-50%, -50%);
  padding: 3px 10px 3px 5px; border-radius: 999px; background: rgba(255, 250, 240, 0.72);
  color: var(--tinta); font: 800 0.74rem var(--jogo); white-space: nowrap;
  box-shadow: 0 2px 0 rgba(150, 110, 60, 0.2);
  /* discreta: mostra onde o amigo está sem tapar o jogo */
  opacity: 0.72;
}
/* bolinha da cor do amigo com a setinha branca apontando */
.seta-amigo i {
  width: 16px; height: 16px; border-radius: 50%; background: var(--cor); box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.18);
  position: relative;
}
.seta-amigo i::after {
  content: ''; position: absolute; left: 4px; top: 3px; border-left: 4px solid transparent; border-right: 4px solid transparent; border-bottom: 7px solid #fff;
}
body[data-overlay] .setas-amigos, body.tela-titulo .setas-amigos { display: none; }
`;

export interface FonteSetas {
  posicao(): { x: number; z: number; yaw: number } | null;
  amigos(): { id: string; apelido: string; x: number; z: number }[];
}

/** Perto disto o amigo já aparece na tela: sem seta. */
const PERTO = 20;

export function criarSetasAmigos(raiz: HTMLElement, fonte: FonteSetas) {
  const camada = document.createElement('div');
  camada.className = 'setas-amigos';
  camada.setAttribute('aria-hidden', 'true');
  raiz.appendChild(camada);
  const setas = new Map<string, HTMLElement>();
  function atualizar(): void {
    const p = fonte.posicao();
    const vivos = new Set<string>();
    if (p) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const raio = Math.min(w, h) * 0.42;
      for (const a of fonte.amigos()) {
        const dx = a.x - p.x;
        const dz = a.z - p.z;
        const d = Math.hypot(dx, dz);
        if (d < PERTO) continue;
        vivos.add(a.id);
        let el = setas.get(a.id);
        if (!el) {
          el = document.createElement('div');
          el.className = 'seta-amigo';
          el.style.setProperty('--cor', corDoAmigo(a.id));
          el.append(document.createElement('i'), document.createElement('span'));
          camada.appendChild(el);
          setas.set(a.id, el);
        }
        // ângulo em relação ao olhar: 0 = à frente (topo da tela)
        const ang = Math.atan2(dx, dz) - p.yaw;
        const rel = Math.atan2(Math.sin(ang), Math.cos(ang));
        el.style.left = `${w / 2 + Math.sin(rel) * raio * 1.3}px`;
        el.style.top = `${h / 2 - Math.cos(rel) * raio}px`;
        (el.firstChild as HTMLElement).style.transform = `rotate(${rel}rad)`;
        (el.lastChild as HTMLElement).textContent = `${a.apelido} · ${Math.round(d)} m`;
      }
    }
    for (const [id, el] of setas)
      if (!vivos.has(id)) {
        el.remove();
        setas.delete(id);
      }
  }
  setInterval(atualizar, 200);
  return { atualizar };
}
