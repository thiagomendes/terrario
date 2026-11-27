/**
 * Os desenhos da TV da Casa anos 80 (spec 026, parte 3): quatro desenhos animados inventados
 * aqui, em laço curto, e o "filme de cinema" de 20 s da fita da locadora. Nada de personagem,
 * nome ou letra de ninguém: só formas simples e cores fortes, no jeito dos desenhos da época.
 * Puro (desenha num canvas 2D); a tela da TV (`casa.ts`) chama a ~12 quadros por segundo.
 *
 * - **Canal 1, o sol saltitante:** o sol de carinha pula por cima dos morros, uma nuvem passa e
 *   um passarinho bate as asas.
 * - **Canal 2, o peixinho:** o peixe laranja nada em onda entre as algas, e as bolhas sobem.
 * - **Canal 3, o foguete:** o foguete vermelho e branco cruza o céu de estrelas até a lua.
 * - **Canal 4, o carrinho:** o carrinho vermelho anda pela estrada com as árvores passando.
 * - **O filme da fita (20 s), "a lhama e o balão":** a contagem de bolinhas do começo do filme, a
 *   lhama que perde o balão para o vento, corre atrás dele, o passarinho que o solta da árvore, o
 *   abraço com coraçõezinhos e a íris que fecha no fim. Com as tarjas pretas de cinema.
 */
import { DURA_FILME } from '../../jogo/casa';

type G = CanvasRenderingContext2D;

/** Um sorteio fixo (os pontinhos do chuvisco e das estrelas não pulam de quadro em quadro). */
function sorteio(semente: number): () => number {
  let s = semente >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10007) / 10007;
  };
}

// (os ajudantes de desenho também servem à TV da casa, spec 039b: `render/moveis/desenhosTv.ts`)
export const circulo = (g: G, x: number, y: number, r: number, cor: string) => {
  g.fillStyle = cor;
  g.beginPath();
  g.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2);
  g.fill();
};
export const elipse = (g: G, x: number, y: number, rx: number, ry: number, cor: string, giro = 0) => {
  g.fillStyle = cor;
  g.beginPath();
  g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), giro, 0, Math.PI * 2);
  g.fill();
};
export const ceu = (g: G, W: number, H: number, cima: string, baixo: string) => {
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, cima);
  gr.addColorStop(1, baixo);
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
};
/** Uma carinha feliz (os olhinhos e o sorriso), do tamanho `r`, em (x, y). */
export const carinha = (g: G, x: number, y: number, r: number, olho = '#3a2414') => {
  circulo(g, x - r * 0.35, y - r * 0.15, r * 0.12, olho);
  circulo(g, x + r * 0.35, y - r * 0.15, r * 0.12, olho);
  g.strokeStyle = olho;
  g.lineWidth = Math.max(1, r * 0.12);
  g.beginPath();
  g.arc(x, y + r * 0.05, r * 0.42, 0.2 * Math.PI, 0.8 * Math.PI);
  g.stroke();
};
const coracao = (g: G, x: number, y: number, r: number, cor: string) => {
  g.fillStyle = cor;
  g.beginPath();
  g.moveTo(x, y + r);
  g.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.4, x, y - r * 0.4);
  g.bezierCurveTo(x + r * 0.6, y - r * 1.4, x + r * 1.6, y - r * 0.2, x, y + r);
  g.fill();
};

// ------------------------------------------------------------------ os quatro canais

function solSaltitante(g: G, W: number, H: number, t: number): void {
  ceu(g, W, H, '#5ec8ff', '#bfeaff');
  // o sol pula (cai e sobe), com os raiozinhos girando
  const pulo = Math.abs(Math.sin(t * 2.4));
  const sx = W * 0.5 + Math.sin(t * 0.7) * W * 0.18;
  const sy = H * 0.62 - pulo * H * 0.36;
  g.save();
  g.translate(sx, sy);
  g.rotate(t * 0.8);
  g.fillStyle = '#ffb21e';
  for (let i = 0; i < 8; i++) {
    g.rotate(Math.PI / 4);
    g.fillRect(-2, -H * 0.17, 4, H * 0.07);
  }
  g.restore();
  elipse(g, sx, sy, H * 0.11 * (1 + (1 - pulo) * 0.08), H * 0.11 * (1 - (1 - pulo) * 0.08), '#ffd23a');
  carinha(g, sx, sy, H * 0.11);
  // os morros (passam devagar) e a nuvem
  for (const [k, cor, alt] of [
    [0.4, '#4cb84a', 0.78],
    [0.7, '#3a9a3c', 0.86],
  ] as const) {
    g.fillStyle = cor;
    g.beginPath();
    g.moveTo(0, H);
    for (let x = 0; x <= W; x += 4)
      g.lineTo(x, H * alt + Math.sin((x + t * 18 * k) * 0.06) * H * 0.07);
    g.lineTo(W, H);
    g.fill();
  }
  const nx = ((t * 14) % (W + 60)) - 30;
  for (const [dx, dy, r] of [
    [0, 0, 9],
    [10, -4, 11],
    [21, 0, 9],
  ])
    circulo(g, nx + dx, H * 0.2 + dy, r, '#ffffff');
  // o passarinho (um "v" que bate as asas)
  const bx = W - (((t * 22) % (W + 40)) - 20);
  const by = H * 0.32 + Math.sin(t * 3) * 4;
  const asa = Math.sin(t * 12) * 4;
  g.strokeStyle = '#2a2a40';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(bx - 6, by - asa);
  g.lineTo(bx, by);
  g.lineTo(bx + 6, by - asa);
  g.stroke();
}

function peixinho(g: G, W: number, H: number, t: number): void {
  ceu(g, W, H, '#1aa0c8', '#0a5a8a');
  // a areia e as algas que balançam
  g.fillStyle = '#f2d68a';
  g.fillRect(0, H * 0.86, W, H * 0.14);
  for (let i = 0; i < 6; i++) {
    const x0 = 10 + i * 22;
    g.strokeStyle = i % 2 ? '#2fae5a' : '#46c46e';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(x0, H * 0.88);
    for (let k = 1; k <= 6; k++)
      g.lineTo(x0 + Math.sin(t * 2 + i + k * 0.7) * 4, H * 0.88 - k * H * 0.07);
    g.stroke();
  }
  // as bolhas sobem
  const r = sorteio(77);
  for (let i = 0; i < 9; i++) {
    const x = r() * W;
    const v = 8 + r() * 10;
    const y = H - ((t * v + r() * H) % H);
    g.strokeStyle = 'rgba(255,255,255,0.8)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(x + Math.sin(t * 3 + i) * 2, y, 2 + r() * 2, 0, Math.PI * 2);
    g.stroke();
  }
  // o peixe laranja nada em onda, a cauda abana
  const fx = ((t * 26) % (W + 60)) - 30;
  const fy = H * 0.5 + Math.sin(t * 2.2) * H * 0.16;
  const abana = Math.sin(t * 14) * 0.5;
  g.save();
  g.translate(fx, fy);
  g.rotate(Math.cos(t * 2.2) * 0.25);
  g.fillStyle = '#ff8a2a';
  g.beginPath();
  g.moveTo(-14, 0);
  g.lineTo(-24, -9 + abana * 6);
  g.lineTo(-24, 9 + abana * 6);
  g.fill();
  elipse(g, 0, 0, 16, 11, '#ff8a2a');
  elipse(g, 2, 3, 9, 5, '#ffc06a');
  circulo(g, 8, -3, 3.2, '#ffffff');
  circulo(g, 9, -3, 1.6, '#1c1c24');
  g.restore();
}

function foguete(g: G, W: number, H: number, t: number): void {
  ceu(g, W, H, '#0c0f3a', '#2a1a5a');
  const r = sorteio(91);
  for (let i = 0; i < 30; i++) {
    const x = r() * W;
    const y = r() * H;
    const pisca = 0.5 + 0.5 * Math.sin(t * 4 + i * 1.7);
    g.fillStyle = `rgba(255,255,230,${0.35 + 0.65 * pisca})`;
    g.fillRect(x, y, 2, 2);
  }
  // a lua de carinha
  circulo(g, W * 0.82, H * 0.24, H * 0.13, '#ffe9a0');
  circulo(g, W * 0.86, H * 0.2, H * 0.12, '#2a1d50');
  // o planetinha de anel
  elipse(g, W * 0.18, H * 0.74, 13, 13, '#ff6fb4');
  g.strokeStyle = '#ffd23a';
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(W * 0.18, H * 0.74, 22, 6, -0.3, 0, Math.PI * 2);
  g.stroke();
  // o foguete cruza na diagonal, com o fogo piscando
  const k = (t * 0.22) % 1;
  const x = -20 + k * (W + 40);
  const y = H * 0.82 - k * H * 0.6 + Math.sin(t * 5) * 2;
  g.save();
  g.translate(x, y);
  g.rotate(-0.5);
  const fogo = 6 + Math.sin(t * 30) * 3;
  g.fillStyle = '#ffd23a';
  g.beginPath();
  g.moveTo(-12, -4);
  g.lineTo(-12 - fogo - 6, 0);
  g.lineTo(-12, 4);
  g.fill();
  g.fillStyle = '#ff8a2a';
  g.beginPath();
  g.moveTo(-12, -2.5);
  g.lineTo(-12 - fogo, 0);
  g.lineTo(-12, 2.5);
  g.fill();
  g.fillStyle = '#f6f4ee';
  g.fillRect(-12, -6, 20, 12);
  g.fillStyle = '#e8302a';
  g.beginPath();
  g.moveTo(8, -6);
  g.lineTo(18, 0);
  g.lineTo(8, 6);
  g.fill();
  g.fillRect(-14, -9, 6, 4);
  g.fillRect(-14, 5, 6, 4);
  circulo(g, 0, 0, 3, '#5ec8ff');
  g.restore();
}

function carrinho(g: G, W: number, H: number, t: number): void {
  ceu(g, W, H, '#7fd4ff', '#d6f2ff');
  // as montanhas de longe, a estrada e a faixa que corre
  g.fillStyle = '#9ab4d8';
  g.beginPath();
  g.moveTo(0, H * 0.62);
  for (let x = 0; x <= W; x += 8)
    g.lineTo(x, H * 0.5 + Math.abs(Math.sin((x + t * 4) * 0.03)) * -H * 0.16);
  g.lineTo(W, H * 0.62);
  g.fill();
  g.fillStyle = '#5cbc54';
  g.fillRect(0, H * 0.6, W, H * 0.16);
  g.fillStyle = '#4a4a56';
  g.fillRect(0, H * 0.74, W, H * 0.2);
  g.fillStyle = '#ffd23a';
  for (let x = -((t * 60) % 24); x < W; x += 24) g.fillRect(x, H * 0.83, 12, 2);
  // as árvores passando
  for (let i = 0; i < 5; i++) {
    const x = W - ((t * 40 + i * 34) % (W + 30)) + 10;
    g.fillStyle = '#7a4a2a';
    g.fillRect(x - 2, H * 0.58, 4, 10);
    circulo(g, x, H * 0.55, 8, i % 2 ? '#2f8a4a' : '#3fa65a');
  }
  // o carrinho vermelho, pulando de leve, as rodas girando
  const cx = W * 0.42 + Math.sin(t * 0.8) * 10;
  const cy = H * 0.8 - Math.abs(Math.sin(t * 9)) * 1.5;
  g.fillStyle = '#e8302a';
  g.fillRect(cx - 20, cy - 12, 40, 12);
  g.fillRect(cx - 10, cy - 21, 22, 10);
  g.fillStyle = '#bfe7ff';
  g.fillRect(cx - 7, cy - 19, 8, 7);
  g.fillRect(cx + 3, cy - 19, 7, 7);
  for (const dx of [-12, 12]) {
    circulo(g, cx + dx, cy, 6, '#1f1e25');
    g.save();
    g.translate(cx + dx, cy);
    g.rotate(-t * 12);
    g.fillStyle = '#d4d8e2';
    g.fillRect(-1, -4, 2, 8);
    g.restore();
  }
  circulo(g, cx + 20, cy - 7, 2, '#ffe14a');
}

const CANAIS = [solSaltitante, peixinho, foguete, carrinho] as const;

/** O canal `c` (0 a 3) no instante `t` (s; o desenho anda em laço). */
export function pintarCanal(g: G, W: number, H: number, canal: number, t: number): void {
  const f = CANAIS[((canal % CANAIS.length) + CANAIS.length) % CANAIS.length];
  f(g, W, H, t);
  linhasDeTv(g, W, H);
}

/** As bolinhas do canal no canto (o número do canal sem algarismo: 1 a 4 bolinhas verdes). */
export function pintarNumeroDoCanal(g: G, W: number, canal: number): void {
  for (let i = 0; i <= canal; i++) {
    circulo(g, W - 10 - i * 9, 9, 3.4, '#0c3a14');
    circulo(g, W - 10 - i * 9, 9, 2.6, '#5aff8a');
  }
}

/** O chuvisco de quando o canal muda (pontinhos e faixas que correm). */
export function pintarChuvisco(g: G, W: number, H: number, f: number): void {
  const r = sorteio(1 + Math.floor(f * 30) * 13);
  g.fillStyle = '#7a7a80';
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 520; i++) {
    const v = Math.floor(r() * 255);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(Math.floor(r() * W), Math.floor(r() * H), 2, 1);
  }
  const faixa = ((f * 400) % (H + 20)) - 10;
  g.fillStyle = 'rgba(255,255,255,0.25)';
  g.fillRect(0, faixa, W, 6);
}

/** As linhas da TV de tubo por cima de tudo (bem de leve). */
export function linhasDeTv(g: G, W: number, H: number): void {
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
}

// ------------------------------------------------------------------ o filme da fita

/** A lhama do filme (a mesma da pelúcia: creme, cachecol vermelho, mantinha azul), virada para +x. */
function lhama(g: G, x: number, y: number, k: number, passo: number, feliz = false): void {
  g.save();
  g.translate(x, y);
  g.scale(k, k);
  const pernas = Math.sin(passo) * 4;
  g.fillStyle = '#e8dcc0';
  for (const [dx, s] of [
    [-10, 1],
    [-4, -1],
    [6, 1],
    [11, -1],
  ])
    g.fillRect(dx - 2 + pernas * s * 0.4, 6, 4, 12);
  elipse(g, 0, 2, 16, 10, '#f6ecd8');
  g.fillStyle = '#2f6fd8';
  g.fillRect(-9, -7, 14, 8);
  g.fillStyle = '#f6ecd8';
  g.fillRect(9, -20, 8, 22);
  g.fillStyle = '#e8302a';
  g.fillRect(8, -6, 10, 4);
  elipse(g, 15, -22, 9, 7, '#f6ecd8');
  elipse(g, 21, -20, 5, 4, '#fff7e6');
  g.fillRect(10, -33, 3, 8);
  g.fillRect(15, -33, 3, 8);
  circulo(g, 17, -24, 1.8, '#3a2a22');
  if (feliz) {
    g.strokeStyle = '#3a2a22';
    g.lineWidth = 1.2;
    g.beginPath();
    g.arc(20, -20, 2.5, 0.1 * Math.PI, 0.9 * Math.PI);
    g.stroke();
  }
  g.restore();
}

/** O balão vermelho com o fio (o fio desce até `(fx, fy)`, ou solto se não houver). */
function balao(g: G, x: number, y: number, fio?: [number, number]): void {
  g.strokeStyle = '#3a2a22';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x, y + 11);
  if (fio) g.quadraticCurveTo(x + 4, (y + fio[1]) / 2, fio[0], fio[1]);
  else g.quadraticCurveTo(x - 4, y + 18, x + 1, y + 26);
  g.stroke();
  elipse(g, x, y, 9, 11, '#e8302a');
  elipse(g, x - 3, y - 4, 2.5, 3.5, 'rgba(255,255,255,0.6)');
}

function arvoreFilme(g: G, x: number, y: number): void {
  g.fillStyle = '#7a4a2a';
  g.fillRect(x - 4, y - 30, 8, 30);
  circulo(g, x, y - 38, 18, '#2f8a4a');
  circulo(g, x - 12, y - 30, 12, '#3fa65a');
  circulo(g, x + 12, y - 30, 12, '#3fa65a');
}

function passarinho(g: G, x: number, y: number, t: number): void {
  elipse(g, x, y, 6, 4.5, '#2f8cff');
  const asa = Math.sin(t * 16) * 4;
  g.fillStyle = '#5ab0ff';
  g.beginPath();
  g.moveTo(x - 2, y);
  g.lineTo(x - 4, y - 6 - asa);
  g.lineTo(x + 3, y - 1);
  g.fill();
  g.fillStyle = '#ffb21e';
  g.fillRect(x + 5, y - 1, 3, 2);
  circulo(g, x + 3, y - 1.5, 1, '#1c1c24');
}

/** O filme no instante `f` (s desde o começo, de 0 a `DURA_FILME`). */
export function pintarFilme(g: G, W: number, H: number, f: number): void {
  const chao = H * 0.8;
  if (f < 1.8) {
    // a contagem do começo do filme: o círculo que gira e as bolinhas (3, 2, 1), sem algarismo
    g.fillStyle = '#8a857a';
    g.fillRect(0, 0, W, H);
    const k = (f % 0.6) / 0.6;
    g.fillStyle = '#6a665e';
    g.beginPath();
    g.moveTo(W / 2, H / 2);
    g.arc(W / 2, H / 2, H * 0.4, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
    g.fill();
    g.strokeStyle = '#f2ece0';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(W / 2, H / 2, H * 0.4, 0, Math.PI * 2);
    g.stroke();
    const quantas = 3 - Math.floor(f / 0.6);
    for (let i = 0; i < quantas; i++) circulo(g, W / 2 + (i - (quantas - 1) / 2) * 14, H / 2, 5, '#f2ece0');
  } else if (f < 6.5) {
    // a lhama passeia com o balão; o vento leva o balão para cima
    ceu(g, W, H, '#8ad6ff', '#dff4ff');
    g.fillStyle = '#5cbc54';
    g.fillRect(0, chao, W, H - chao);
    const u = f - 1.8;
    const lx = 20 + Math.min(u, 2.4) * 18;
    lhama(g, lx, chao - 18, 1, u * 9);
    if (u < 2.6) balao(g, lx + 16, chao - 64, [lx + 18, chao - 40]);
    else {
      const v = u - 2.6;
      balao(g, lx + 16 + v * 26, chao - 64 - v * 18);
      // os risquinhos do vento
      g.strokeStyle = 'rgba(255,255,255,0.9)';
      g.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const y = 22 + i * 12;
        const x = ((v * 90 + i * 30) % (W + 40)) - 20;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + 18, y);
        g.stroke();
      }
    }
  } else if (f < 11) {
    // a lhama corre atrás do balão por cima dos morros
    ceu(g, W, H, '#8ad6ff', '#dff4ff');
    const u = f - 6.5;
    g.fillStyle = '#4cb84a';
    g.beginPath();
    g.moveTo(0, H);
    for (let x = 0; x <= W; x += 4) g.lineTo(x, chao + Math.sin((x + u * 50) * 0.05) * 5);
    g.lineTo(W, H);
    g.fill();
    lhama(g, W * 0.3, chao - 20 + Math.abs(Math.sin(u * 8)) * -4, 1, u * 18);
    balao(g, W * 0.72 + Math.sin(u * 2) * 8, H * 0.28 + Math.sin(u * 3) * 4);
  } else if (f < 15.4) {
    // o balão preso na árvore; o passarinho vem e solta o fio; o balão desce para a lhama
    ceu(g, W, H, '#8ad6ff', '#dff4ff');
    g.fillStyle = '#5cbc54';
    g.fillRect(0, chao, W, H - chao);
    arvoreFilme(g, W * 0.68, chao);
    const u = f - 11;
    lhama(g, W * 0.24, chao - 18, 1, 0);
    const preso: [number, number] = [W * 0.68, chao - 62];
    if (u < 2.2) {
      balao(g, preso[0] + 6, preso[1] - 14, [preso[0], preso[1] + 6]);
      passarinho(g, W + 10 - u * 36, H * 0.2 + u * 10, f);
    } else {
      const v = Math.min(1, (u - 2.2) / 2);
      const bx = preso[0] + 6 + (W * 0.24 + 18 - preso[0] - 6) * v;
      const by = preso[1] - 14 + (chao - 64 - preso[1] + 14) * v;
      balao(g, bx, by);
      passarinho(g, bx + 10, by + 22, f);
    }
  } else if (f < DURA_FILME - 1.6) {
    // o abraço: a lhama feliz com o balão de volta, os coraçõezinhos sobem
    ceu(g, W, H, '#ffd0e4', '#fff0f6');
    g.fillStyle = '#5cbc54';
    g.fillRect(0, chao, W, H - chao);
    const u = f - 15.4;
    lhama(g, W * 0.42, chao - 18 - Math.abs(Math.sin(u * 5)) * 4, 1.1, 0, true);
    balao(g, W * 0.42 + 22, chao - 70, [W * 0.42 + 20, chao - 44]);
    for (let i = 0; i < 4; i++) {
      const v = (u * 0.6 + i * 0.25) % 1;
      coracao(g, W * (0.25 + i * 0.16), chao - 30 - v * 50, 4 + i % 2, `rgba(232,48,90,${1 - v})`);
    }
  } else {
    // a íris que fecha no fim (o círculo preto aperta em volta da lhama e do coração)
    ceu(g, W, H, '#ffd0e4', '#fff0f6');
    g.fillStyle = '#5cbc54';
    g.fillRect(0, chao, W, H - chao);
    lhama(g, W * 0.42, chao - 18, 1.1, 0, true);
    coracao(g, W * 0.42 + 22, chao - 66, 7, '#e8305a');
    const k = Math.min(1, (f - (DURA_FILME - 1.6)) / 1.4);
    const r = (1 - k) * W * 0.75 + 2;
    g.fillStyle = '#000000';
    g.beginPath();
    g.rect(0, 0, W, H);
    g.arc(W * 0.48, chao - 40, r, 0, Math.PI * 2, true);
    g.fill('evenodd');
  }
  // o filme: as tarjas pretas de cinema, o granulado e um risco que pula de vez em quando
  const r = sorteio(7 + Math.floor(f * 12));
  g.fillStyle = 'rgba(40,30,20,0.12)';
  for (let i = 0; i < 40; i++) g.fillRect(r() * W, r() * H, 1, 1);
  if (r() < 0.3) {
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(r() * W, 0, 1, H);
  }
  g.fillStyle = '#000000';
  g.fillRect(0, 0, W, H * 0.1);
  g.fillRect(0, H * 0.9, W, H * 0.1);
}
