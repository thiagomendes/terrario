/**
 * Spec 039b: os quatro desenhos da TV da casa (a TV de rack que a criança põe), inventados aqui,
 * mansos e sem texto, em laço curto, e diferentes dos da Casa anos 80 (o sol, o peixinho, o
 * foguete e o carrinho). Formas simples, cores de brinquedo e nada de personagem de ninguém.
 * Puro (desenha num canvas 2D); a tela (`ligados.ts`) chama a uns 12 quadros por segundo.
 *
 * - **0, a joaninha no jardim:** as flores balançam, a joaninha anda pela folha e a borboleta voa.
 * - **1, o barquinho:** o barquinho de vela balança nas ondas, as nuvens passam e a gaivota plana.
 * - **2, o trenzinho:** o trem de três vagões passa pelos morros, soltando nuvenzinhas brancas.
 * - **3, as ovelhinhas:** de noite, as ovelhinhas pulam a cerquinha, uma de cada vez, e a lua sorri.
 */
import { carinha, ceu, circulo, elipse, linhasDeTv } from '../vila/desenhosTv';

type G = CanvasRenderingContext2D;

function joaninha(g: G, W: number, H: number, t: number): void {
  ceu(g, W, H, '#9fe0ff', '#dff6ff');
  // o gramado e as flores que balançam
  g.fillStyle = '#6cc25a';
  g.fillRect(0, H * 0.72, W, H * 0.28);
  for (let i = 0; i < 5; i++) {
    const x = W * (0.1 + i * 0.2);
    const b = Math.sin(t * 1.6 + i) * 3;
    g.strokeStyle = '#3f9a3a';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x, H * 0.78);
    g.lineTo(x + b, H * 0.52);
    g.stroke();
    const cor = ['#ff8fb1', '#ffd23a', '#b48cff', '#ff8fb1', '#ffd23a'][i];
    for (let p = 0; p < 5; p++) {
      const a = (p * Math.PI * 2) / 5 + t * 0.4;
      circulo(g, x + b + Math.cos(a) * 5, H * 0.5 + Math.sin(a) * 5, 4, cor);
    }
    circulo(g, x + b, H * 0.5, 3, '#fff3b0');
  }
  // a folha grande e a joaninha andando nela, de lá para cá
  elipse(g, W * 0.5, H * 0.82, W * 0.34, H * 0.08, '#4cb84a');
  const jx = W * 0.5 + Math.sin(t * 0.6) * W * 0.24;
  const jy = H * 0.76;
  elipse(g, jx, jy, 9, 7, '#e8413a');
  g.fillStyle = '#2a2430';
  g.fillRect(jx - 0.6, jy - 7, 1.2, 14);
  for (const [dx, dy] of [
    [-4, -2],
    [4, -2],
    [-3, 3],
    [3, 3],
  ])
    circulo(g, jx + dx, jy + dy, 1.6, '#2a2430');
  circulo(g, jx + (Math.cos(t * 0.6) > 0 ? 9 : -9), jy, 4, '#2a2430');
  // a borboleta (as asas batendo)
  const bx = ((t * 16) % (W + 40)) - 20;
  const by = H * 0.25 + Math.sin(t * 2) * 6;
  const asa = 0.5 + 0.5 * Math.abs(Math.sin(t * 9));
  elipse(g, bx - 4, by, 5 * asa, 6, '#ffb21e');
  elipse(g, bx + 4, by, 5 * asa, 6, '#ffb21e');
  g.fillStyle = '#4a3020';
  g.fillRect(bx - 0.8, by - 5, 1.6, 10);
}

function barquinho(g: G, W: number, H: number, t: number): void {
  ceu(g, W, H, '#7cc8ff', '#e6f6ff');
  // as nuvens que passam
  for (const [k, y, r] of [
    [0.6, 0.18, 8],
    [0.35, 0.32, 6],
  ] as const) {
    const nx = W - (((t * 10 * k + y * 200) % (W + 60)) - 30);
    for (const [dx, dy, rr] of [
      [0, 0, r],
      [r, -r * 0.4, r * 1.2],
      [r * 2.2, 0, r],
    ])
      circulo(g, nx + dx, H * y + dy, rr, '#ffffff');
  }
  // o mar em duas ondas
  const onda = (base: number, cor: string, fase: number) => {
    g.fillStyle = cor;
    g.beginPath();
    g.moveTo(0, H);
    for (let x = 0; x <= W; x += 4) g.lineTo(x, H * base + Math.sin(x * 0.09 + t * 1.4 + fase) * 3);
    g.lineTo(W, H);
    g.fill();
  };
  onda(0.66, '#3c9ae0', 0);
  // o barquinho (balança devagar)
  const cx = W * 0.5 + Math.sin(t * 0.4) * W * 0.12;
  const cy = H * 0.66 + Math.sin(t * 1.4) * 2;
  g.save();
  g.translate(cx, cy);
  g.rotate(Math.sin(t * 1.4) * 0.08);
  g.fillStyle = '#e8634a';
  g.beginPath();
  g.moveTo(-18, -4);
  g.lineTo(18, -4);
  g.lineTo(12, 6);
  g.lineTo(-12, 6);
  g.fill();
  g.fillStyle = '#6a4630';
  g.fillRect(-1, -30, 2, 26);
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.moveTo(1, -30);
  g.lineTo(15, -7);
  g.lineTo(1, -7);
  g.fill();
  g.fillStyle = '#ffd23a';
  g.beginPath();
  g.moveTo(-1, -26);
  g.lineTo(-12, -7);
  g.lineTo(-1, -7);
  g.fill();
  g.restore();
  onda(0.74, '#5ab4f0', 1.7);
  // a gaivota (um "v" que plana)
  const gx = ((t * 12) % (W + 40)) - 20;
  const gy = H * 0.24 + Math.sin(t * 1.2) * 4;
  g.strokeStyle = '#2a3a50';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(gx - 7, gy - 2);
  g.quadraticCurveTo(gx - 3, gy - 5, gx, gy);
  g.quadraticCurveTo(gx + 3, gy - 5, gx + 7, gy - 2);
  g.stroke();
}

function trenzinho(g: G, W: number, H: number, t: number): void {
  ceu(g, W, H, '#bfe8ff', '#fff4d8');
  // os morros de trás e o trilho
  g.fillStyle = '#8fd17a';
  g.beginPath();
  g.moveTo(0, H);
  for (let x = 0; x <= W; x += 4) g.lineTo(x, H * 0.55 + Math.sin(x * 0.05 + 1) * H * 0.08);
  g.lineTo(W, H);
  g.fill();
  g.fillStyle = '#6cbf5c';
  g.fillRect(0, H * 0.74, W, H * 0.26);
  g.fillStyle = '#8a6040';
  g.fillRect(0, H * 0.76, W, 2);
  for (let x = -((t * 30) % 10); x < W; x += 10) g.fillRect(x, H * 0.76, 3, 5);
  // o trem: a locomotiva e dois vagões, andando da esquerda para a direita, em laço
  const vai = ((t * 22) % (W + 120)) - 110;
  const y = H * 0.76;
  const roda = (x: number) => {
    circulo(g, x, y, 4, '#3a3944');
    circulo(g, x, y, 1.6, '#d4d8e2');
  };
  const vagoes: Array<[number, string]> = [
    [vai, '#ffb21e'],
    [vai + 30, '#7fb0e4'],
  ];
  for (const [x, cor] of vagoes) {
    g.fillStyle = cor;
    g.fillRect(x, y - 16, 26, 13);
    g.fillStyle = '#ffffff';
    g.fillRect(x + 4, y - 13, 7, 5);
    g.fillRect(x + 15, y - 13, 7, 5);
    roda(x + 6);
    roda(x + 20);
  }
  const lx = vai + 60;
  g.fillStyle = '#e8634a';
  g.fillRect(lx, y - 18, 30, 15);
  g.fillRect(lx, y - 26, 12, 9);
  g.fillStyle = '#3a3944';
  g.fillRect(lx + 20, y - 26, 6, 9);
  g.fillStyle = '#fff3b0';
  g.fillRect(lx + 2, y - 24, 8, 5);
  roda(lx + 7);
  roda(lx + 23);
  // as nuvenzinhas brancas que saem da chaminé (sobem e somem)
  for (let i = 0; i < 3; i++) {
    const u = (t * 0.8 + i / 3) % 1;
    circulo(g, lx + 23 - u * 18, y - 30 - u * 22, 3 + u * 5, `rgba(255,255,255,${(1 - u).toFixed(2)})`);
  }
}

function ovelhinhas(g: G, W: number, H: number, t: number): void {
  ceu(g, W, H, '#2c3f7a', '#5a74b8');
  // as estrelinhas piscando e a lua de carinha
  for (let i = 0; i < 9; i++) {
    const x = ((i * 37) % W) + 4;
    const y = ((i * 23) % (H * 0.4)) + 4;
    const k = 0.5 + 0.5 * Math.sin(t * 2 + i);
    circulo(g, x, y, 1 + k, '#fff3b0');
  }
  circulo(g, W * 0.82, H * 0.2, 11, '#fff1b0');
  carinha(g, W * 0.82, H * 0.2, 11, '#8a6a30');
  // o morro e a cerquinha
  g.fillStyle = '#4f9a58';
  g.fillRect(0, H * 0.74, W, H * 0.26);
  g.fillStyle = '#e8d2a8';
  const fx = W * 0.5;
  for (const dx of [-8, 8]) g.fillRect(fx + dx - 1.5, H * 0.6, 3, H * 0.15);
  g.fillRect(fx - 12, H * 0.63, 24, 2.5);
  g.fillRect(fx - 12, H * 0.69, 24, 2.5);
  // a ovelhinha da vez pula a cerca num arco, de 4 em 4 s
  const ciclo = 4;
  const u = (t % ciclo) / ciclo;
  const x = -20 + u * (W + 40);
  const pulo = Math.max(0, Math.sin(((x - (fx - 26)) / 52) * Math.PI));
  const y = H * 0.72 - (x > fx - 26 && x < fx + 26 ? pulo * H * 0.24 : 0);
  const ovelha = (ox: number, oy: number) => {
    for (const [dx, dy] of [
      [-6, 0],
      [0, -3],
      [6, 0],
      [-3, 3],
      [3, 3],
    ])
      circulo(g, ox + dx, oy + dy - 6, 6, '#ffffff');
    elipse(g, ox + 10, oy - 7, 4, 5, '#3a3040');
    circulo(g, ox + 11, oy - 8, 0.9, '#ffffff');
    g.fillStyle = '#3a3040';
    for (const dx of [-5, 4]) g.fillRect(ox + dx, oy - 1, 2, 6);
  };
  ovelha(x, y);
  // e a próxima esperando a vez, do lado de cá (quando a da vez já saiu de perto)
  if (x > W * 0.3) ovelha(W * 0.12, H * 0.72);
}

const DESENHOS = [joaninha, barquinho, trenzinho, ovelhinhas] as const;

/** O desenho `programa` (0 a 3) no instante `t` (s; o desenho anda em laço). */
export function pintarDesenho(g: G, W: number, H: number, programa: number, t: number): void {
  const f = DESENHOS[((programa % DESENHOS.length) + DESENHOS.length) % DESENHOS.length];
  f(g, W, H, t);
  linhasDeTv(g, W, H);
}
