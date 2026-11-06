import { tema } from '../temas/ativo';
import { AR_MAX, FOME_MAX, VIDA_MAX, type EstadoSobrevivencia } from '../jogo/sobrevivencia';

export const CSS_STATUS = `
.status {
  position: fixed; left: 50%; z-index: 9; pointer-events: none;
  bottom: calc(max(12px, env(safe-area-inset-bottom)) + 66px);
  transform: translateX(-50%) scale(var(--escala-ui, 1)); transform-origin: bottom center;
  width: min(470px, calc(100vw - 16px));
  display: grid; grid-template-columns: 1fr 1fr; gap: 2px 12px;
}
.status[hidden] { display: none; }
.status .linha-icones { display: flex; gap: 1px; }
.status .linha-icones.direita { flex-direction: row-reverse; }
.status img { width: clamp(14px, 3.6vw, 20px); height: clamp(14px, 3.6vw, 20px); image-rendering: pixelated; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.7)); }
.status .vida.pulsando img { animation: pulso-vida 0.6s ease-in-out infinite; }
@keyframes pulso-vida { 50% { transform: translateY(-2px); } }
.status .ar { grid-column: 2; }
.vinheta-dano {
  position: fixed; inset: 0; z-index: 8; pointer-events: none; opacity: 0;
  background: radial-gradient(ellipse at center, transparent 45%, rgba(190, 20, 20, 0.55));
  transition: opacity 0.5s ease;
}
.vinheta-dano.ativa { opacity: 1; transition: none; }
.morte-fundo {
  position: fixed; inset: 0; z-index: 35; display: flex; align-items: center; justify-content: center;
  flex-direction: column; gap: 18px; padding: 16px; box-sizing: border-box; text-align: center;
  background: radial-gradient(ellipse at center, rgba(90, 10, 16, 0.55), rgba(20, 2, 6, 0.88));
  font-family: system-ui, 'Segoe UI', sans-serif; color: #ffe6e6; animation: modal-entra 0.6s ease-out;
}
.morte-fundo[hidden] { display: none; }
.morte-fundo h2 { margin: 0; font-size: clamp(2.2rem, 8vw, 4rem); text-shadow: 0 4px 24px rgba(0,0,0,0.6); }
.morte-fundo p { margin: 0; color: #f0b9b9; }
.morte-fundo .btn { min-width: 220px; min-height: 48px; font-size: 1.05rem; }
`;

const DESENHOS: Record<string, { cores: Record<string, string>; linhas: string[] }> = {
  coracao: {
    cores: { k: '#1b0a0a', r: '#e0303a', R: '#ff6b70', w: '#ffd0d2' },
    linhas: [
      '.kk...kk.',
      'kRRk.krrk',
      'kRwRkrrrk',
      'krRrrrrrk',
      'krrrrrrrk',
      '.krrrrrk.',
      '..krrrk..',
      '...krk...',
      '....k....',
    ],
  },
  vazio: {
    cores: { k: '#1b0a0a', g: '#3a2a2c' },
    linhas: [
      '.kk...kk.',
      'kggk.kggk',
      'kgggkgggk',
      'kgggggggk',
      'kgggggggk',
      '.kgggggk.',
      '..kgggk..',
      '...kgk...',
      '....k....',
    ],
  },
  coxa: {
    cores: { k: '#1b0f05', m: '#b8642c', M: '#e08a46', o: '#f3ead8' },
    linhas: [
      '....kkkk.',
      '...kMMMMk',
      '..kMMmmmk',
      '..kMmmmmk',
      '..kmmmmk.',
      '.kokkkk..',
      'kook.....',
      'kok......',
      '.k.......',
    ],
  },
  coxaVazia: {
    cores: { k: '#1b0f05', g: '#3a3028' },
    linhas: [
      '....kkkk.',
      '...kggggk',
      '..kgggggk',
      '..kgggggk',
      '..kggggk.',
      '.kgkkkk..',
      'kggk.....',
      'kgk......',
      '.k.......',
    ],
  },
  bolha: {
    cores: { k: '#0b2236', b: '#5cc4ff', w: '#e8f8ff' },
    linhas: [
      '..kkkkk..',
      '.kbbbbbk.',
      'kbwwbbbbk',
      'kbwbbbbbk',
      'kbbbbbbbk',
      'kbbbbbbbk',
      '.kbbbbbk.',
      '..kkkkk..',
      '.........',
    ],
  },
};

const cache = new Map<string, string>();
function icone(nome: string, metade = false, base?: string): string {
  const chave = `${nome}|${metade}|${base}`;
  const c0 = cache.get(chave);
  if (c0) return c0;
  const c = document.createElement('canvas');
  c.width = 9;
  c.height = 9;
  const ctx = c.getContext('2d')!;
  const pintar = (n: string, ate = 9) => {
    const d = DESENHOS[n];
    d.linhas.forEach((l, y) =>
      [...l].forEach((ch, x) => {
        if (x >= ate || !d.cores[ch]) return;
        ctx.fillStyle = d.cores[ch];
        ctx.fillRect(x, y, 1, 1);
      }),
    );
  };
  if (base) pintar(base);
  pintar(nome, metade ? 5 : 9);
  const url = c.toDataURL();
  cache.set(chave, url);
  return url;
}

export function criarStatus(raiz: HTMLElement) {
  const el = document.createElement('div');
  el.className = 'status';
  el.setAttribute('data-status', '');
  el.hidden = true;
  const vida = document.createElement('div');
  vida.className = 'linha-icones vida';
  vida.setAttribute('aria-label', 'Vida');
  const fome = document.createElement('div');
  fome.className = 'linha-icones direita fome';
  fome.setAttribute('aria-label', 'Fome');
  const ar = document.createElement('div');
  ar.className = 'linha-icones direita ar';
  el.append(vida, fome, document.createElement('div'), ar);
  const vinheta = document.createElement('div');
  vinheta.className = 'vinheta-dano';
  raiz.append(el, vinheta);

  const linha = (alvo: HTMLElement, n: number) => {
    while (alvo.children.length < n) alvo.appendChild(document.createElement('img'));
    while (alvo.children.length > n) alvo.lastElementChild!.remove();
    return [...alvo.children] as HTMLImageElement[];
  };
  const definir = (img: HTMLImageElement, src: string) => {
    if (img.getAttribute('src') !== src) img.setAttribute('src', src);
  };
  let ultimo = '';
  return {
    mostrar(v: boolean) {
      el.hidden = !v;
    },
    atualizar(e: Readonly<EstadoSobrevivencia>) {
      const chave = `${e.vida}|${e.fome}|${Math.ceil(e.ar)}`;
      if (chave === ultimo) return;
      ultimo = chave;
      linha(vida, VIDA_MAX / 2).forEach((img, i) => {
        const v = e.vida - i * 2;
        definir(
          img,
          v >= 2 ? icone('coracao') : v === 1 ? icone('coracao', true, 'vazio') : icone('vazio'),
        );
      });
      vida.classList.toggle('pulsando', e.vida <= 4 && !e.morto);
      linha(fome, FOME_MAX / 2).forEach((img, i) => {
        const v = e.fome - i * 2;
        definir(
          img,
          v >= 2 ? icone('coxa') : v === 1 ? icone('coxa', true, 'coxaVazia') : icone('coxaVazia'),
        );
      });
      const bolhas = e.ar < AR_MAX ? Math.ceil(e.ar) : 0;
      linha(ar, bolhas).forEach((img) => definir(img, icone('bolha')));
      el.setAttribute('aria-label', `Vida ${e.vida / 2} de 10, fome ${e.fome / 2} de 10`);
    },
    piscarDano() {
      vinheta.classList.add('ativa');
      requestAnimationFrame(() => requestAnimationFrame(() => vinheta.classList.remove('ativa')));
    },
  };
}

const CAUSAS: Record<string, string> = {
  queda: 'Você caiu de muito alto.',
  afogamento: 'Faltou ar debaixo d’água.',
  fome: 'A fome venceu.',
  criatura: 'Uma criatura da bruma te pegou.',
  outro: 'Algo deu errado.',
};

export function criarTelaMorte(raiz: HTMLElement, renascer: () => void) {
  const f = document.createElement('div');
  f.className = 'morte-fundo';
  f.hidden = true;
  f.setAttribute('data-morte', '');
  const h = document.createElement('h2');
  h.textContent = tema().textos.morte;
  const p = document.createElement('p');
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn primario';
  b.textContent = 'Renascer';
  b.setAttribute('data-renascer', '');
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    f.hidden = true;
    delete document.body.dataset.overlay;
    renascer();
  });
  f.append(h, p, b);
  f.addEventListener('click', (e) => e.stopPropagation());
  raiz.appendChild(f);
  return {
    mostrar(causa: string) {
      p.textContent = CAUSAS[causa] ?? CAUSAS.outro;
      f.hidden = false;
      document.body.dataset.overlay = 'morte';
    },
  };
}
