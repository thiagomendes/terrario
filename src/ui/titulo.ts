import { montarPartes, type NomeParte } from '../personagem/modelo';
import { PX_POR_BLOCO, gerarTexturaParte } from '../personagem/textura';
import type { Aparencia } from '../personagem/aparencia';
import { hash2 } from '../world/noise';
import { tema } from '../temas/ativo';
import type { Tema } from '../temas/tipos';

/** Letras 5x7 do logo, desenhadas como pequenos blocos. */
export const GLIFOS: Record<string, readonly string[]> = {
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
};

/** Letras acentuadas: a letra de base e os pixels do acento (linhas acima da letra). */
const ACENTOS: Record<string, { base: string; pixels: { x: number; y: number }[] }> = {
  Á: {
    base: 'A',
    pixels: [
      { x: 3, y: -2 },
      { x: 2, y: -1 },
    ],
  },
};

/** Pixels acesos do texto em grade (coluna, linha), com 1 coluna entre letras. */
export function pixelsDoTexto(texto: string): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  [...texto].forEach((ch, i) => {
    const acento = ACENTOS[ch];
    if (acento) for (const p of acento.pixels) pts.push({ x: i * 6 + p.x, y: p.y });
    const g = GLIFOS[acento?.base ?? ch];
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
/** A extrusão escurece para o fundo (o Bruma e Luz vai de 122,58,18 a 70,30,10). */
const escuro = (c: Rgb): Rgb => [c[0] * 0.574, c[1] * 0.517, c[2] * 0.556];
type CoresLogo = Tema['cores']['logo'];
const css = (c: Rgb, f = 1) =>
  `rgb(${Math.round(Math.min(255, c[0] * f))}, ${Math.round(Math.min(255, c[1] * f))}, ${Math.round(Math.min(255, c[2] * f))})`;

/**
 * Logo em pixel-art: cada pixel da letra é um bloquinho com chanfro, cor de luz
 * (dourado no topo, âmbar embaixo), bruma lilás na base e extrusão 3D escura.
 */
export function desenharLogo(
  canvas: HTMLCanvasElement,
  texto = 'TERRÁRIO',
  cores: CoresLogo = tema().cores.logo,
): void {
  const c = 12;
  const prof = 5;
  const borda = 3;
  const pts = pixelsDoTexto(texto);
  // acentos sobem acima da linha das letras: o canvas cresce para cima
  const yMin = Math.min(0, ...pts.map((p) => p.y));
  const colunas = [...texto].length * 6 - 1;
  const pad = 8;
  canvas.width = colunas * c + pad * 2 + prof * 2 + borda * 2;
  canvas.height = (7 - yMin) * c + pad * 2 + prof * 2 + borda * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  const ox = pad + borda;
  const oy = pad + borda - yMin * c;
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
    ctx.fillStyle = css(mix(cores.extrusao as Rgb, escuro(cores.extrusao as Rgb), t));
    for (const p of pts) ctx.fillRect(ox + p.x * c + d, oy + p.y * c + d, c, c);
  }
  // face
  const topo = cores.topo as Rgb;
  const meio = cores.meio as Rgb;
  const base = cores.base as Rgb;
  for (const p of pts) {
    const t = Math.max(0, p.y) / 6;
    let cor = t < 0.5 ? mix(topo, meio, t * 2) : mix(meio, base, (t - 0.5) * 2);
    // névoa do tema na base das letras
    if (p.y >= 5) cor = mix(cor, cores.bruma as Rgb, p.y === 6 ? 0.32 : 0.14);
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
/* o mundo atrás fica claro como no esboço: só um véu leve embaixo, para o rodapé ler bem */
.entrada {
  position: fixed; inset: 0; z-index: 5; overflow-y: auto; overflow-x: hidden; box-sizing: border-box;
  cursor: pointer; color: #fff; font-family: var(--jogo);
  background: linear-gradient(180deg, rgba(120, 170, 230, 0.12), rgba(0, 0, 0, 0) 35%, rgba(0, 0, 0, 0) 75%, rgba(40, 30, 60, 0.35));
}
.entrada[hidden] { display: none; }
/* bruma e faíscas eram do visual antigo: o céu de brinquedo fica limpo */
.entrada .bruma-titulo, .entrada .faisca { display: none; }

.titulo-menu {
  position: relative; min-height: 100%; box-sizing: border-box;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: clamp(10px, 2.2vh, 22px); padding: clamp(16px, 5vh, 56px) 16px clamp(64px, 10vh, 96px);
}
.titulo-menu[hidden] { display: none; }
/* o logo é o próprio título em letras gordinhas; o canvas antigo fica guardado */
.logo-titulo { display: none; }
@keyframes logo-flutua { 50% { transform: translateY(-6px); } }
.titulo-oculto {
  margin: 0; white-space: nowrap;
  font: 700 clamp(3.2rem, 13vw, 8.6rem)/0.95 var(--display); letter-spacing: 0.02em;
  background: linear-gradient(to bottom, #fff3b0 0%, #ffd24a 35%, #ff9b2f 75%, #f0742a 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 4px 0 #b8541b) drop-shadow(0 6px 0 #8a3c13) drop-shadow(0 14px 12px rgba(60, 25, 5, 0.35));
  animation: logo-flutua 5s ease-in-out infinite;
}
.lema {
  margin: -4px 0 clamp(4px, 2vh, 18px); max-width: 92vw; text-align: center;
  font-size: clamp(0.95rem, 2.6vw, 1.15rem); font-weight: 800; letter-spacing: 0.01em; color: #fff;
  text-shadow: 0 2px 0 rgba(40, 60, 90, 0.45), 0 0 12px rgba(40, 60, 90, 0.35);
}
.menu-titulo { display: grid; gap: 14px; width: min(400px, 88vw); }
.menu-titulo .dupla { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
/* a peça de cada botão vem de brinquedo.ts; aqui só a medida */
.botao-jogo {
  position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  min-height: 54px; padding: 8px 18px; box-sizing: border-box; cursor: pointer;
  font-size: 1.08rem; line-height: 1.1;
}
.botao-jogo .sub { font-size: 0.76rem; font-weight: 700; color: var(--tinta); opacity: 0.75; }
.botao-jogo.primario { min-height: 76px; font: 700 1.7rem/1.05 var(--display); letter-spacing: 0.02em; }
.botao-jogo.primario .sub { font-family: var(--jogo); font-size: 0.8rem; }
.botao-jogo .icone { font-size: 1.1em; }
.botao-jogo .linha { display: inline-flex; align-items: center; gap: 10px; white-space: nowrap; }
@media (max-width: 420px) { .menu-titulo .dupla .botao-jogo { font-size: 0.98rem; padding: 8px 10px; } .menu-titulo .dupla .linha { gap: 6px; } }
.rodape-titulo {
  position: fixed; left: 0; right: 0; bottom: 0; display: flex; justify-content: space-between; align-items: flex-end; gap: 12px;
  padding: 10px 14px; pointer-events: none; font-size: 0.8rem; font-weight: 700; color: #fff; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
}
.rodape-titulo ul { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px 12px; margin: 0; padding: 0; list-style: none; }
.rodape-titulo kbd {
  padding: 1px 7px; border-radius: 7px; background: rgba(255, 255, 255, 0.9); color: var(--tinta);
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.2); text-shadow: none; font: 800 0.72rem var(--jogo);
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
  background: radial-gradient(closest-side, rgba(255, 246, 228, 0.6), rgba(255, 246, 228, 0));
}
.palco-personagem .pedestal::after {
  content: ''; position: absolute; left: 24%; right: 24%; bottom: 3%; height: 5%; border-radius: 50%; background: rgba(40, 30, 20, 0.35);
}
.palco-personagem canvas {
  position: relative; z-index: 1; height: 92%; width: auto;
  filter: drop-shadow(0 6px 10px rgba(40, 25, 10, 0.3)); animation: previa-respira 3.2s ease-in-out infinite; transform-origin: bottom center;
}
@keyframes previa-respira { 50% { transform: scaleY(1.012) translateY(-2px); } }
.palco-personagem .nome-previa {
  padding: 4px 16px; border-radius: 999px; background: rgba(255, 250, 240, 0.92); color: var(--tinta);
  font: 700 1.3rem var(--display); box-shadow: 0 3px 0 rgba(150, 110, 60, 0.35);
}
.palco-personagem .nome-previa:empty { display: none; }
.voltar-titulo { justify-self: start; }
.tela-personagem .painel-personagem { max-height: none; }
@media (min-width: 900px) { .tela-personagem .painel-personagem { max-height: min(88vh, 780px); min-height: min(470px, 88vh); } }
`;
