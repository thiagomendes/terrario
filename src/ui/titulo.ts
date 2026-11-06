import { montarPartes, type NomeParte } from '../personagem/modelo';
import { PX_POR_BLOCO, gerarTexturaParte } from '../personagem/textura';
import type { Aparencia } from '../personagem/aparencia';
import { hash2 } from '../world/noise';

/** Letras 5x7 do logo, desenhadas como pequenos blocos. */
export const GLIFOS: Record<string, readonly string[]> = {
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
};

/** Pixels acesos do texto em grade (coluna, linha), com 1 coluna entre letras. */
export function pixelsDoTexto(texto: string): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  [...texto].forEach((ch, i) => {
    const g = GLIFOS[ch];
    if (!g) return;
    g.forEach((linha, y) => {
      [...linha].forEach((c, x) => {
        if (c === '#') pts.push({ x: i * 6 + x, y });
      });
    });
  });
  return pts;
}

type Rgb = [number, number, number];
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const css = (c: Rgb, f = 1) =>
  `rgb(${Math.round(Math.min(255, c[0] * f))}, ${Math.round(Math.min(255, c[1] * f))}, ${Math.round(Math.min(255, c[2] * f))})`;

/**
 * Logo em pixel-art: cada pixel da letra é um bloquinho com chanfro, cor de luz
 * (dourado no topo, âmbar embaixo), bruma lilás na base e extrusão 3D escura.
 */
export function desenharLogo(canvas: HTMLCanvasElement, texto = 'BRUMALUZ'): void {
  const c = 12;
  const prof = 5;
  const borda = 3;
  const pts = pixelsDoTexto(texto);
  const colunas = texto.length * 6 - 1;
  const pad = 8;
  canvas.width = colunas * c + pad * 2 + prof * 2 + borda * 2;
  canvas.height = 7 * c + pad * 2 + prof * 2 + borda * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  const ox = pad + borda;
  const oy = pad + borda;
  // contorno escuro
  ctx.fillStyle = '#160b06';
  for (const p of pts) {
    for (let d = 0; d <= prof; d += 1) {
      ctx.fillRect(
        ox + p.x * c - borda + d,
        oy + p.y * c - borda + d,
        c + borda * 2,
        c + borda * 2,
      );
    }
  }
  // extrusão (lado de baixo/direita das letras)
  for (let d = prof; d >= 1; d--) {
    const t = d / prof;
    ctx.fillStyle = css(mix([122, 58, 18], [70, 30, 10], t));
    for (const p of pts) ctx.fillRect(ox + p.x * c + d, oy + p.y * c + d, c, c);
  }
  // face
  const topo: Rgb = [255, 243, 196];
  const meio: Rgb = [255, 204, 110];
  const base: Rgb = [232, 132, 44];
  for (const p of pts) {
    const t = p.y / 6;
    let cor = t < 0.5 ? mix(topo, meio, t * 2) : mix(meio, base, (t - 0.5) * 2);
    // bruma na base das letras
    if (p.y >= 5) cor = mix(cor, [214, 190, 255], p.y === 6 ? 0.32 : 0.14);
    const ruido = 0.94 + hash2(p.x, p.y, 77) * 0.12;
    const x = ox + p.x * c;
    const y = oy + p.y * c;
    ctx.fillStyle = css(cor, ruido);
    ctx.fillRect(x, y, c, c);
    // chanfro: luz em cima/esquerda, sombra embaixo/direita
    ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.fillRect(x, y, c, 2);
    ctx.fillRect(x, y, 2, c);
    ctx.fillStyle = 'rgba(90, 36, 6, 0.32)';
    ctx.fillRect(x, y + c - 2, c, 2);
    ctx.fillRect(x + c - 2, y, 2, c);
  }
}

const ORDEM_PREVIA: NomeParte[] = [
  'pernaEsquerda',
  'pernaDireita',
  'tronco',
  'saia',
  'bracoEsquerdo',
  'bracoDireito',
  'cabeca',
  'penteado',
  'cabelo',
  'acessorio',
];

/** Região da prévia, em blocos a partir dos pés (para miniaturas). */
export type RecortePrevia = 'corpo' | 'cabeca' | 'tronco' | 'pernas' | 'busto';
const RECORTES: Record<RecortePrevia, [number, number]> = {
  corpo: [-0.02, 2.05],
  cabeca: [1.36, 1.98],
  tronco: [0.62, 1.52],
  pernas: [-0.02, 1.0],
  busto: [0.55, 2.1],
};

/**
 * Prévia do personagem de frente, em pixel-art, desenhada com as mesmas texturas do jogo.
 * As partes são pintadas de trás para a frente (mochila atrás do tronco, óculos sobre o rosto).
 */
export function desenharPrevia(
  canvas: HTMLCanvasElement,
  aparencia: Aparencia,
  recorte: RecortePrevia = 'corpo',
): void {
  const frenteZ = (p: { posicao: number[]; tamanho: number[] }) => p.posicao[2] + p.tamanho[2] / 2;
  const partes = montarPartes(aparencia).sort(
    (a, b) =>
      frenteZ(a) - frenteZ(b) || ORDEM_PREVIA.indexOf(a.nome) - ORDEM_PREVIA.indexOf(b.nome),
  );
  const S = PX_POR_BLOCO;
  const [y0, y1] = RECORTES[recorte];
  const largura = Math.round((recorte === 'corpo' ? 1.3 : recorte === 'cabeca' ? 0.66 : 0.9) * S);
  const altura = Math.round((y1 - y0) * S);
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, largura, altura);
  const cx = largura / 2;
  // y da tela para a altura y1 (topo do recorte) = 0
  const topo = y1 * S;
  const temp = document.createElement('canvas');
  const tctx = temp.getContext('2d');
  if (!tctx) return;
  for (const parte of partes) {
    const t = gerarTexturaParte(aparencia, parte);
    temp.width = t.largura;
    temp.height = t.altura;
    tctx.putImageData(new ImageData(new Uint8ClampedArray(t.pixels), t.largura, t.altura), 0, 0);
    const f = t.faces[0];
    // de frente para quem olha: o lado direito do personagem fica à esquerda da tela
    const dx = Math.round(cx + (-parte.posicao[0] - parte.tamanho[0] / 2) * S);
    const dy = Math.round(topo - (parte.posicao[1] + parte.tamanho[1] / 2) * S);
    ctx.drawImage(temp, f.x, f.y, f.w, f.h, dx, dy, f.w, f.h);
  }
}

export const CSS_TITULO = `
body.tela-titulo #app > :not(.entrada):not(canvas):not(.modal-fundo):not(.pausa-fundo) { visibility: hidden !important; }
.entrada {
  position: fixed; inset: 0; z-index: 5; overflow-y: auto; overflow-x: hidden; box-sizing: border-box;
  cursor: pointer; color: #f4efe6; font-family: system-ui, 'Segoe UI', sans-serif;
  background:
    radial-gradient(ellipse 70% 60% at 50% 42%, rgba(10, 8, 24, 0) 30%, rgba(10, 8, 24, 0.55) 100%),
    linear-gradient(180deg, rgba(12, 8, 30, 0.35), rgba(12, 8, 30, 0) 30%, rgba(12, 8, 30, 0) 62%, rgba(8, 6, 18, 0.78));
}
.entrada[hidden] { display: none; }
.entrada .bruma-titulo { position: fixed; inset: auto 0 0 0; height: 40vh; pointer-events: none; overflow: hidden; }
.entrada .bruma-titulo i {
  position: absolute; bottom: -8vh; width: 60vw; height: 26vh; border-radius: 50%;
  background: radial-gradient(closest-side, rgba(214, 196, 255, 0.22), rgba(214, 196, 255, 0));
  animation: bruma-deriva 26s linear infinite;
}
.entrada .bruma-titulo i:nth-child(2) { left: 30vw; bottom: -4vh; animation-duration: 34s; animation-delay: -12s; opacity: 0.8; }
.entrada .bruma-titulo i:nth-child(3) { left: -20vw; bottom: 2vh; animation-duration: 40s; animation-delay: -25s; opacity: 0.6; }
@keyframes bruma-deriva { from { transform: translateX(-30vw); } to { transform: translateX(110vw); } }
.entrada .faisca {
  position: fixed; width: 4px; height: 4px; background: #ffe7a0; box-shadow: 0 0 8px 2px rgba(255, 210, 120, 0.7);
  pointer-events: none; animation: faisca-sobe linear infinite; opacity: 0;
}
@keyframes faisca-sobe { 0% { transform: translateY(0); opacity: 0; } 15% { opacity: 0.9; } 100% { transform: translateY(-46vh); opacity: 0; } }

.titulo-menu {
  position: relative; min-height: 100%; box-sizing: border-box;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: clamp(10px, 2.2vh, 22px); padding: clamp(16px, 5vh, 56px) 16px clamp(64px, 10vh, 96px);
}
.titulo-menu[hidden] { display: none; }
.logo-titulo {
  display: block; width: min(680px, 88vw); height: auto; image-rendering: pixelated;
  filter: drop-shadow(0 0 28px rgba(255, 186, 90, 0.42)) drop-shadow(0 10px 18px rgba(0, 0, 0, 0.5));
  animation: logo-flutua 6s ease-in-out infinite;
}
@keyframes logo-flutua { 50% { transform: translateY(-6px); } }
.titulo-oculto { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.lema {
  margin: -4px 0 clamp(4px, 2vh, 18px); max-width: 92vw; text-align: center;
  font-size: clamp(0.92rem, 2.6vw, 1.12rem); font-weight: 600; letter-spacing: 0.06em; color: #efe3ff;
  text-shadow: 2px 2px 0 rgba(20, 10, 40, 0.75);
}
.menu-titulo { display: grid; gap: 12px; width: min(400px, 88vw); }
.menu-titulo .dupla { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.botao-jogo {
  --textura: none;
  position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  min-height: 52px; padding: 8px 18px; box-sizing: border-box; cursor: pointer;
  border: 3px solid #120e16; border-radius: 0; color: #f6f2ea;
  font: 800 1.08rem/1.1 system-ui, 'Segoe UI', sans-serif; letter-spacing: 0.05em;
  text-shadow: 2px 2px 0 #2a2630;
  background: linear-gradient(rgba(255, 255, 255, 0.04), rgba(0, 0, 0, 0.26)), var(--textura) 0 0 / 48px 48px;
  image-rendering: pixelated;
  box-shadow: inset 3px 3px 0 rgba(255, 255, 255, 0.3), inset -3px -4px 0 rgba(0, 0, 0, 0.38),
    0 5px 0 #0b080e, 0 10px 22px rgba(0, 0, 0, 0.45);
  transition: transform 0.08s ease, filter 0.12s ease, color 0.12s ease;
}
.botao-jogo:hover, .botao-jogo:focus-visible { filter: brightness(1.16); color: #ffe7a3; outline: none; }
.botao-jogo:focus-visible { box-shadow: inset 3px 3px 0 rgba(255, 255, 255, 0.3), inset -3px -4px 0 rgba(0, 0, 0, 0.38), 0 5px 0 #0b080e, 0 0 0 3px #ffd98f; }
.botao-jogo:active { transform: translateY(4px); box-shadow: inset 3px 3px 0 rgba(255, 255, 255, 0.24), inset -3px -4px 0 rgba(0, 0, 0, 0.4), 0 1px 0 #0b080e; }
.botao-jogo .sub { font-size: 0.74rem; font-weight: 700; letter-spacing: 0.08em; opacity: 0.86; text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.7); }
.botao-jogo.primario {
  min-height: 74px; font-size: 1.55rem; letter-spacing: 0.12em; color: #fff8e4; text-shadow: 3px 3px 0 #6a3208;
  background: linear-gradient(rgba(255, 214, 120, 0.62), rgba(214, 112, 26, 0.72)), var(--textura) 0 0 / 48px 48px;
  box-shadow: inset 3px 3px 0 rgba(255, 246, 210, 0.55), inset -3px -4px 0 rgba(110, 46, 6, 0.55),
    0 5px 0 #0b080e, 0 0 34px rgba(255, 180, 80, 0.42), 0 10px 22px rgba(0, 0, 0, 0.45);
  animation: brilho-jogar 2.8s ease-in-out infinite;
}
.botao-jogo.primario:hover { color: #fff; filter: brightness(1.1); }
@keyframes brilho-jogar { 50% { box-shadow: inset 3px 3px 0 rgba(255, 246, 210, 0.55), inset -3px -4px 0 rgba(110, 46, 6, 0.55), 0 5px 0 #0b080e, 0 0 52px rgba(255, 196, 100, 0.7), 0 10px 22px rgba(0, 0, 0, 0.45); } }
.botao-jogo .icone { font-size: 1.1em; filter: drop-shadow(1px 1px 0 rgba(0, 0, 0, 0.6)); }
.botao-jogo .linha { display: inline-flex; align-items: center; gap: 10px; white-space: nowrap; }
@media (max-width: 420px) { .menu-titulo .dupla .botao-jogo { font-size: 0.98rem; padding: 8px 10px; } .menu-titulo .dupla .linha { gap: 6px; } }
.rodape-titulo {
  position: fixed; left: 0; right: 0; bottom: 0; display: flex; justify-content: space-between; align-items: flex-end; gap: 12px;
  padding: 10px 14px; pointer-events: none; font-size: 0.78rem; color: rgba(240, 232, 255, 0.72); text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.7);
}
.rodape-titulo ul { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px 12px; margin: 0; padding: 0; list-style: none; }
.rodape-titulo kbd {
  padding: 1px 6px; border: 2px solid #120e16; background: #3a3540; color: #ffe7a3;
  box-shadow: inset 1px 1px 0 rgba(255, 255, 255, 0.25), inset -1px -2px 0 rgba(0, 0, 0, 0.4);
  font: 700 0.72rem system-ui, sans-serif;
}
@media (max-width: 720px) { .rodape-titulo ul { display: none; } }

/* Tela do personagem */
.tela-personagem {
  min-height: 100%; box-sizing: border-box; display: grid; gap: clamp(12px, 3vw, 40px);
  grid-template-columns: minmax(0, 1fr); align-items: center; justify-items: center;
  padding: clamp(14px, 4vh, 40px) 16px 72px; max-width: 1180px; margin: 0 auto; cursor: default;
}
.tela-personagem[hidden] { display: none; }
@media (min-width: 900px) { .tela-personagem { grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); } }
.palco-personagem { display: grid; justify-items: center; gap: 12px; }
.palco-personagem .pedestal { position: relative; display: grid; place-items: end center; width: min(300px, 62vw); aspect-ratio: 3 / 4; }
.palco-personagem .pedestal::before {
  content: ''; position: absolute; left: 6%; right: 6%; bottom: 0; height: 18%; border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255, 210, 130, 0.45), rgba(255, 210, 130, 0));
}
.palco-personagem .pedestal::after {
  content: ''; position: absolute; left: 24%; right: 24%; bottom: 3%; height: 5%; border-radius: 50%; background: rgba(10, 6, 20, 0.55);
}
.palco-personagem canvas {
  position: relative; z-index: 1; height: 92%; width: auto; image-rendering: pixelated;
  filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.4)); animation: previa-respira 3.2s ease-in-out infinite; transform-origin: bottom center;
}
@keyframes previa-respira { 50% { transform: scaleY(1.012) translateY(-2px); } }
.palco-personagem .nome-previa {
  font: 800 1.3rem system-ui, sans-serif; letter-spacing: 0.06em; color: #fff3cf; text-shadow: 2px 2px 0 #3a1c06;
}
.voltar-titulo { justify-self: start; }
.tela-personagem .painel-personagem {
  border: 3px solid #120e16; border-radius: 0;
  background: linear-gradient(180deg, rgba(36, 30, 48, 0.94), rgba(22, 18, 30, 0.95));
  box-shadow: inset 3px 3px 0 rgba(255, 255, 255, 0.08), inset -3px -3px 0 rgba(0, 0, 0, 0.4), 0 18px 48px rgba(0, 0, 0, 0.5);
  max-height: none;
}
@media (min-width: 900px) { .tela-personagem .painel-personagem { max-height: min(88vh, 780px); min-height: min(470px, 88vh); } }
.tela-personagem .painel-personagem h2 { font-size: 1.3rem; letter-spacing: 0.05em; color: #ffd98f; text-shadow: 2px 2px 0 #2a1606; }
.tela-personagem .painel-personagem button {
  border: 2px solid #120e16; border-radius: 0; background: #3a3542;
  box-shadow: inset 2px 2px 0 rgba(255, 255, 255, 0.16), inset -2px -3px 0 rgba(0, 0, 0, 0.35);
  text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.6);
}
.tela-personagem .painel-personagem button:hover { background: #4a4454; }
.tela-personagem .painel-personagem button[aria-pressed='true'] {
  background: #8a5a1c; color: #fff4d6; border-color: #120e16;
  box-shadow: inset 2px 2px 0 rgba(255, 230, 170, 0.45), inset -2px -3px 0 rgba(60, 26, 4, 0.5), 0 0 0 2px #ffd98f;
}
.tela-personagem .painel-personagem input { border: 2px solid #120e16; border-radius: 0; background: #17131d; }
.tela-personagem .painel-personagem .jogar {
  min-height: 52px; font-size: 1.15rem; letter-spacing: 0.08em; color: #fff8e4; text-shadow: 2px 2px 0 #6a3208;
  background: linear-gradient(#ffcf7a, #e0892e);
  box-shadow: inset 2px 2px 0 rgba(255, 246, 210, 0.6), inset -2px -3px 0 rgba(110, 46, 6, 0.55);
}
`;
