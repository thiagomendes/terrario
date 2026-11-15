/**
 * As pinturas das placas da Vila Neon (spec 026): os letreiros de tubo de neon (letras de
 * traço nosso, dobradas como tubo de vidro: iguais em todo aparelho, sem depender de fonte), os
 * desenhos das telas do fliperama (jogos inventados por nós), os cartazes e os cartões do
 * mural. Nada de marca, logotipo ou desenho conhecido; texto só nos letreiros do mundo.
 */
export type G = CanvasRenderingContext2D;
type Pt = [number, number];

/** Letras de traço numa grade de 4 × 6 (y para baixo); cada traço é um tubo dobrado. */
const LETRAS: Record<string, { w: number; t: Pt[][] }> = {
  A: {
    w: 4,
    t: [
      [
        [0, 6],
        [0, 2],
        [2, 0],
        [4, 2],
        [4, 6],
      ],
      [
        [0, 4],
        [4, 4],
      ],
    ],
  },
  B: {
    w: 4,
    t: [
      [
        [0, 0],
        [0, 6],
        [3, 6],
        [4, 5],
        [4, 4],
        [3, 3],
        [0, 3],
      ],
      [
        [0, 0],
        [2.8, 0],
        [3.7, 0.9],
        [3.7, 2.1],
        [3, 3],
      ],
    ],
  },
  C: {
    w: 4,
    t: [
      [
        [4, 1],
        [3, 0],
        [1, 0],
        [0, 1],
        [0, 5],
        [1, 6],
        [3, 6],
        [4, 5],
      ],
    ],
  },
  D: {
    w: 4,
    t: [
      [
        [0, 0],
        [0, 6],
        [2.5, 6],
        [4, 4.5],
        [4, 1.5],
        [2.5, 0],
        [0, 0],
      ],
    ],
  },
  E: {
    w: 3.6,
    t: [
      [
        [3.6, 0],
        [0, 0],
        [0, 6],
        [3.6, 6],
      ],
      [
        [0, 3],
        [2.8, 3],
      ],
    ],
  },
  F: {
    w: 3.6,
    t: [
      [
        [3.6, 0],
        [0, 0],
        [0, 6],
      ],
      [
        [0, 3],
        [2.8, 3],
      ],
    ],
  },
  G: {
    w: 4,
    t: [
      [
        [4, 1],
        [3, 0],
        [1, 0],
        [0, 1],
        [0, 5],
        [1, 6],
        [3, 6],
        [4, 5],
        [4, 3.2],
        [2.2, 3.2],
      ],
    ],
  },
  H: {
    w: 4,
    t: [
      [
        [0, 0],
        [0, 6],
      ],
      [
        [4, 0],
        [4, 6],
      ],
      [
        [0, 3],
        [4, 3],
      ],
    ],
  },
  I: {
    w: 0.6,
    t: [
      [
        [0.3, 0],
        [0.3, 6],
      ],
    ],
  },
  L: {
    w: 3.4,
    t: [
      [
        [0, 0],
        [0, 6],
        [3.4, 6],
      ],
    ],
  },
  M: {
    w: 5,
    t: [
      [
        [0, 6],
        [0, 0],
        [2.5, 3.6],
        [5, 0],
        [5, 6],
      ],
    ],
  },
  N: {
    w: 4,
    t: [
      [
        [0, 6],
        [0, 0],
        [4, 6],
        [4, 0],
      ],
    ],
  },
  O: {
    w: 4,
    t: [
      [
        [1, 0],
        [3, 0],
        [4, 1],
        [4, 5],
        [3, 6],
        [1, 6],
        [0, 5],
        [0, 1],
        [1, 0],
      ],
    ],
  },
  P: {
    w: 4,
    t: [
      [
        [0, 6],
        [0, 0],
        [3, 0],
        [4, 1],
        [4, 2.5],
        [3, 3.5],
        [0, 3.5],
      ],
    ],
  },
  Q: {
    w: 4,
    t: [
      [
        [1, 0],
        [3, 0],
        [4, 1],
        [4, 5],
        [3, 6],
        [1, 6],
        [0, 5],
        [0, 1],
        [1, 0],
      ],
      [
        [2.6, 4.4],
        [4.3, 6.3],
      ],
    ],
  },
  R: {
    w: 4,
    t: [
      [
        [0, 6],
        [0, 0],
        [3, 0],
        [4, 1],
        [4, 2.5],
        [3, 3.5],
        [0, 3.5],
      ],
      [
        [2, 3.5],
        [4, 6],
      ],
    ],
  },
  S: {
    w: 4,
    t: [
      [
        [4, 1],
        [3, 0],
        [1, 0],
        [0, 1],
        [0, 2],
        [1, 3],
        [3, 3],
        [4, 4],
        [4, 5],
        [3, 6],
        [1, 6],
        [0, 5],
      ],
    ],
  },
  T: {
    w: 4,
    t: [
      [
        [0, 0],
        [4, 0],
      ],
      [
        [2, 0],
        [2, 6],
      ],
    ],
  },
  U: {
    w: 4,
    t: [
      [
        [0, 0],
        [0, 5],
        [1, 6],
        [3, 6],
        [4, 5],
        [4, 0],
      ],
    ],
  },
  V: {
    w: 4,
    t: [
      [
        [0, 0],
        [2, 6],
        [4, 0],
      ],
    ],
  },
};
const AGUDO: Pt[] = [
  [1.7, -0.7],
  [2.9, -1.7],
];
const TIL: Pt[] = [
  [0.7, -1],
  [1.5, -1.6],
  [2.5, -1],
  [3.3, -1.6],
];
LETRAS['Á'] = { w: 4, t: [...LETRAS.A.t, AGUDO] };
LETRAS['Ã'] = { w: 4, t: [...LETRAS.A.t, TIL] };

const ESPACO_LETRA = 1.5;
const ESPACO_PALAVRA = 2.6;

/** Clareia a cor para o miolo quente do tubo. */
function claro(cor: string, k: number): string {
  const n = parseInt(cor.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** Um tubo de neon pelo caminho já traçado em `g`: o halo, o vidro colorido e o miolo quente. */
export function acender(g: G, cor: string, esp: number): void {
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.save();
  g.shadowColor = cor;
  g.shadowBlur = esp * 2.4;
  g.strokeStyle = cor;
  g.lineWidth = esp;
  g.stroke();
  g.stroke();
  g.restore();
  g.strokeStyle = claro(cor, 0.72);
  g.lineWidth = esp * 0.4;
  g.stroke();
}

/** Tubo de neon por uma linha de pontos. */
export function tubo(g: G, pts: Pt[], cor: string, esp: number, fechado = false): void {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  if (fechado) g.closePath();
  acender(g, cor, esp);
}

/** Largura do texto (px) com as letras de altura `alt`. */
export function larguraTexto(texto: string, alt: number): number {
  const u = alt / 6;
  let w = 0;
  for (const ch of texto) {
    if (ch === ' ') w += ESPACO_PALAVRA * u;
    else w += ((LETRAS[ch]?.w ?? 4) + ESPACO_LETRA) * u;
  }
  return w - ESPACO_LETRA * u;
}

/** Escreve em tubo de neon, com o meio em (cx, cy). `cores`: uma por palavra (ou uma só). */
export function textoNeon(
  g: G,
  texto: string,
  cx: number,
  cy: number,
  alt: number,
  cores: string | string[],
  esp = alt * 0.13,
): void {
  const u = alt / 6;
  let x = cx - larguraTexto(texto, alt) / 2;
  const y = cy - alt / 2;
  let palavra = 0;
  for (const ch of texto) {
    if (ch === ' ') {
      x += ESPACO_PALAVRA * u;
      palavra++;
      continue;
    }
    const L = LETRAS[ch];
    if (!L) continue;
    const cor = typeof cores === 'string' ? cores : cores[palavra % cores.length];
    for (const t of L.t)
      tubo(
        g,
        t.map(([a, b]) => [x + a * u, y + b * u] as Pt),
        cor,
        esp,
      );
    x += (L.w + ESPACO_LETRA) * u;
  }
}

/** O fundo de uma placa de neon: a chapa escura e o tubo de moldura. */
export function fundoPlaca(g: G, L: number, A: number, fundo: string, moldura?: string): void {
  g.fillStyle = fundo;
  g.fillRect(0, 0, L, A);
  // um brilho de leve no meio (a chapa pintada reflete o tubo)
  const gr = g.createRadialGradient(L / 2, A / 2, 0, L / 2, A / 2, L * 0.55);
  gr.addColorStop(0, 'rgba(255,255,255,0.07)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, L, A);
  if (moldura) {
    const m = A * 0.09;
    const r = A * 0.12;
    g.beginPath();
    g.moveTo(m + r, m);
    g.lineTo(L - m - r, m);
    g.quadraticCurveTo(L - m, m, L - m, m + r);
    g.lineTo(L - m, A - m - r);
    g.quadraticCurveTo(L - m, A - m, L - m - r, A - m);
    g.lineTo(m + r, A - m);
    g.quadraticCurveTo(m, A - m, m, A - m - r);
    g.lineTo(m, m + r);
    g.quadraticCurveTo(m, m, m + r, m);
    acender(g, moldura, A * 0.035);
  }
}

// ------------------------------------------------------------------ desenhos de tubo

/** O raio da logo (tubo fechado), com o meio em (cx, cy) e a altura `h`. */
export function raioNeon(g: G, cx: number, cy: number, h: number, cor: string, esp: number): void {
  const p: Pt[] = [
    [0.1, -0.5],
    [0.42, -0.5],
    [0.12, -0.06],
    [0.36, -0.06],
    [-0.16, 0.5],
    [0.02, 0.08],
    [-0.24, 0.08],
  ];
  tubo(
    g,
    p.map(([x, y]) => [cx + x * h, cy + y * h] as Pt),
    cor,
    esp,
    true,
  );
}

/** Estrela de cinco pontas (tubo fechado). */
export function estrelaNeon(g: G, cx: number, cy: number, r: number, cor: string, esp: number) {
  const p: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  tubo(g, p, cor, esp, true);
}

/** O copo de vitamina com dois canudos (a lanchonete). */
export function copoNeon(g: G, cx: number, cy: number, h: number, esp: number): void {
  const w = h * 0.34;
  tubo(
    g,
    [
      [cx - w, cy - h * 0.18],
      [cx - w * 0.7, cy + h * 0.5],
      [cx + w * 0.7, cy + h * 0.5],
      [cx + w, cy - h * 0.18],
      [cx - w, cy - h * 0.18],
    ],
    '#ff6fb4',
    esp,
  );
  tubo(
    g,
    [
      [cx - w * 0.2, cy - h * 0.18],
      [cx - w * 0.75, cy - h * 0.55],
    ],
    '#ffe14a',
    esp,
  );
  tubo(
    g,
    [
      [cx + w * 0.2, cy - h * 0.18],
      [cx + w * 0.8, cy - h * 0.5],
    ],
    '#2ee0d0',
    esp,
  );
}

/** A fita de vídeo (a locadora): a caixa e os dois carretéis. */
export function fitaNeon(g: G, cx: number, cy: number, h: number, esp: number): void {
  const w = h * 0.8;
  tubo(
    g,
    [
      [cx - w, cy - h * 0.45],
      [cx + w, cy - h * 0.45],
      [cx + w, cy + h * 0.45],
      [cx - w, cy + h * 0.45],
    ],
    '#ffe14a',
    esp,
    true,
  );
  for (const s of [-1, 1]) {
    g.beginPath();
    g.arc(cx + s * w * 0.45, cy, h * 0.17, 0, Math.PI * 2);
    acender(g, '#ff6fb4', esp);
  }
}

/** O controle do fliperama: a base, a alavanca com a bolinha e dois botões. */
export function controleNeon(g: G, cx: number, cy: number, h: number, esp: number): void {
  const w = h * 0.75;
  tubo(
    g,
    [
      [cx - w, cy + h * 0.5],
      [cx - w * 0.8, cy + h * 0.12],
      [cx + w * 0.8, cy + h * 0.12],
      [cx + w, cy + h * 0.5],
    ],
    '#2f8cff',
    esp,
    true,
  );
  tubo(
    g,
    [
      [cx - w * 0.3, cy + h * 0.12],
      [cx - w * 0.45, cy - h * 0.28],
    ],
    '#f6f4ee',
    esp,
  );
  g.beginPath();
  g.arc(cx - w * 0.5, cy - h * 0.38, h * 0.11, 0, Math.PI * 2);
  acender(g, '#e8302a', esp);
  for (const k of [0.25, 0.6]) {
    g.beginPath();
    g.arc(cx + w * k, cy - h * 0.02, h * 0.06, 0, Math.PI * 2);
    acender(g, '#ffe14a', esp * 0.8);
  }
}

/** O patim de quatro rodas (o rinque): a bota, a base e as rodinhas. */
export function patimNeon(g: G, cx: number, cy: number, h: number, cor: string, esp: number) {
  const w = h * 0.62;
  tubo(
    g,
    [
      [cx - w * 0.75, cy - h * 0.5],
      [cx - w * 0.1, cy - h * 0.5],
      [cx - w * 0.05, cy - h * 0.05],
      [cx + w * 0.75, cy + h * 0.02],
      [cx + w, cy + h * 0.22],
      [cx - w * 0.85, cy + h * 0.22],
    ],
    cor,
    esp,
    true,
  );
  for (const k of [-0.5, 0.55]) {
    g.beginPath();
    g.arc(cx + w * k, cy + h * 0.4, h * 0.11, 0, Math.PI * 2);
    acender(g, '#ffe14a', esp);
  }
}

// ------------------------------------------------------------------ pinturas (sem luz)

/** Sorteio manso e sempre igual (a pintura não muda de um aparelho para o outro). */
export function sorteio(k: number): () => number {
  let s = (k * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

function estrela(g: G, cx: number, cy: number, r: number): void {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}
function raio(g: G, cx: number, cy: number, h: number): void {
  const p: Pt[] = [
    [0.1, -0.5],
    [0.42, -0.5],
    [0.12, -0.06],
    [0.36, -0.06],
    [-0.16, 0.5],
    [0.02, 0.08],
    [-0.24, 0.08],
  ];
  g.beginPath();
  for (const [x, y] of p) g.lineTo(cx + x * h, cy + y * h);
  g.closePath();
  g.fill();
}
function nota(g: G, cx: number, cy: number, h: number): void {
  g.fillRect(cx + h * 0.1, cy - h * 0.5, h * 0.09, h * 0.8);
  g.fillRect(cx + h * 0.1, cy - h * 0.5, h * 0.36, h * 0.14);
  g.beginPath();
  g.ellipse(cx - h * 0.04, cy + h * 0.3, h * 0.2, h * 0.15, -0.4, 0, Math.PI * 2);
  g.fill();
}
function coracaoDeBolas(g: G, cx: number, cy: number, r: number): void {
  // um balão (bolinha com a pontinha e o fio)
  g.beginPath();
  g.ellipse(cx, cy - r * 0.15, r * 0.62, r * 0.75, 0, 0, Math.PI * 2);
  g.fill();
  g.fillRect(cx - r * 0.03, cy + r * 0.55, r * 0.06, r * 0.5);
}

type Forma = 'raio' | 'estrela' | 'nota' | 'balao' | 'patim' | 'sol';
function forma(g: G, f: Forma, cx: number, cy: number, s: number): void {
  if (f === 'raio') raio(g, cx, cy, s * 1.5);
  else if (f === 'estrela') estrela(g, cx, cy, s * 0.7);
  else if (f === 'nota') nota(g, cx, cy, s * 1.2);
  else if (f === 'balao') coracaoDeBolas(g, cx, cy, s * 0.75);
  else if (f === 'sol') {
    g.beginPath();
    g.arc(cx, cy, s * 0.42, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      g.fillRect(
        cx + Math.cos(a) * s * 0.62 - s * 0.05,
        cy + Math.sin(a) * s * 0.62 - s * 0.05,
        s * 0.1,
        s * 0.1,
      );
    }
  } else {
    // patim
    g.fillRect(cx - s * 0.5, cy - s * 0.5, s * 0.5, s * 0.75);
    g.fillRect(cx - s * 0.5, cy, s * 1.1, s * 0.28);
    g.beginPath();
    g.arc(cx - s * 0.28, cy + s * 0.45, s * 0.14, 0, Math.PI * 2);
    g.arc(cx + s * 0.38, cy + s * 0.45, s * 0.14, 0, Math.PI * 2);
    g.fill();
  }
}

/** O mural de recados: a cortiça e os cartões coloridos presos com percevejo (sem palavra). */
export function pintarMural(g: G, L: number, A: number): void {
  const r = sorteio(77);
  g.fillStyle = '#c9965a';
  g.fillRect(0, 0, L, A);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = r() > 0.5 ? 'rgba(120,80,40,0.25)' : 'rgba(255,225,170,0.25)';
    g.fillRect(r() * L, r() * A, 2 + r() * 3, 2);
  }
  const cartoes: [number, number, number, number, string, string, Forma, number][] = [
    [0.03, 0.08, 0.28, 0.5, '#fff6dc', '#e8302a', 'raio', -0.05],
    [0.36, 0.06, 0.26, 0.42, '#bfe7ff', '#2f6fd8', 'nota', 0.04],
    [0.67, 0.1, 0.29, 0.52, '#ffe9a0', '#e8602a', 'estrela', -0.03],
    [0.08, 0.62, 0.2, 0.32, '#ffd0e4', '#d83a8a', 'balao', 0.06],
    [0.33, 0.54, 0.3, 0.4, '#d6f5d0', '#2f8a4a', 'patim', -0.04],
    [0.69, 0.66, 0.22, 0.28, '#fff6dc', '#2f8cff', 'sol', 0.05],
  ];
  for (const [x, y, w, h, papel, tinta, f, giro] of cartoes) {
    g.save();
    g.translate((x + w / 2) * L, (y + h / 2) * A);
    g.rotate(giro);
    g.fillStyle = 'rgba(60,35,10,0.35)';
    g.fillRect((-w / 2) * L + 3, (-h / 2) * A + 4, w * L, h * A);
    g.fillStyle = papel;
    g.fillRect((-w / 2) * L, (-h / 2) * A, w * L, h * A);
    g.fillStyle = tinta;
    forma(g, f, 0, h * A * 0.06, Math.min(w * L, h * A) * 0.42);
    // o percevejo
    g.fillStyle = '#e8302a';
    g.beginPath();
    g.arc(0, (-h / 2) * A + A * 0.045, A * 0.028, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffb0a8';
    g.fillRect(-A * 0.012, (-h / 2) * A + A * 0.03, A * 0.012, A * 0.012);
    g.restore();
  }
}

/** Cartaz inventado (sem palavra): faixas largas, uma forma grande e a moldura. */
export function pintarCartaz(g: G, L: number, A: number, n: number): void {
  const temas: [string, string, string, Forma][] = [
    ['#2e2d36', '#e8302a', '#ffe14a', 'raio'],
    ['#2f6fd8', '#f6f4ee', '#ffe14a', 'estrela'],
    ['#ffe14a', '#e8302a', '#2e2d36', 'nota'],
    ['#22b8a8', '#f6f4ee', '#ff6fb4', 'patim'],
    ['#e8302a', '#ffe14a', '#f6f4ee', 'sol'],
    ['#f6f4ee', '#2f8cff', '#e8302a', 'balao'],
  ];
  const [fundo, faixa, tinta, f] = temas[n % temas.length];
  g.fillStyle = '#f4f1ea';
  g.fillRect(0, 0, L, A);
  const m = L * 0.05;
  g.fillStyle = fundo;
  g.fillRect(m, m, L - 2 * m, A - 2 * m);
  g.fillStyle = faixa;
  g.beginPath();
  g.moveTo(m, A * 0.62);
  g.lineTo(L - m, A * 0.42);
  g.lineTo(L - m, A * 0.6);
  g.lineTo(m, A * 0.8);
  g.closePath();
  g.fill();
  g.fillStyle = tinta;
  forma(g, f, L / 2, A * 0.4, Math.min(L, A) * 0.42);
  // as linhas de "letrinha" de mentira embaixo (tracinhos, nunca palavra)
  g.fillStyle = tinta;
  for (let i = 0; i < 3; i++)
    g.fillRect(L * 0.2 + i * L * 0.04, A * (0.86 + i * 0.03), L * (0.6 - i * 0.16), A * 0.012);
}

/** A tela de um fliperama (32 × 26 pontos): navinha, carrinho ou blocos caindo. */
export function pintarTela(g: G, L: number, A: number, n: number): void {
  const C = 32;
  const R = 26;
  const px = L / C;
  const py = A / R;
  const p = (x: number, y: number, cor: string, w = 1, h = 1) => {
    g.fillStyle = cor;
    g.fillRect(Math.floor(x * px), Math.floor(y * py), Math.ceil(w * px), Math.ceil(h * py));
  };
  const r = sorteio(31 + n * 7);
  const jogo = n % 3;
  if (jogo === 0) {
    // navinha: o espaço, as estrelas, os bichinhos de bloco e a nave embaixo
    p(0, 0, n === 3 ? '#1a0f3a' : '#0c1030', C, R);
    for (let i = 0; i < 26; i++)
      p(Math.floor(r() * C), Math.floor(r() * R), r() > 0.5 ? '#ffffff' : '#8fb8ff');
    const cores = ['#ff6fb4', '#2ee0d0', '#ffe14a'];
    for (let j = 0; j < 3; j++)
      for (let i = 0; i < 5; i++) {
        const x = 3 + i * 5.5;
        const y = 3 + j * 4;
        p(x, y, cores[j], 3, 2);
        p(x - 1, y + 1, cores[j]);
        p(x + 3, y + 1, cores[j]);
        p(x + 0.5, y + 0.4, '#0c1030', 0.7, 0.7);
        p(x + 1.8, y + 0.4, '#0c1030', 0.7, 0.7);
      }
    p(14, 21, '#f6f4ee', 4, 2);
    p(15.5, 19, '#f6f4ee', 1, 2);
    p(13, 22.5, '#e8302a', 1, 1.5);
    p(18, 22.5, '#e8302a', 1, 1.5);
    p(15.6, 13, '#ffe14a', 0.8, 3);
    p(0, 25, '#2ee0d0', C, 1);
  } else if (jogo === 1) {
    // carrinho: a estrada que some no horizonte, o pôr do sol e o carrinho de bloco
    p(0, 0, '#ff8a5a', C, 5);
    p(0, 5, '#ffb45a', C, 4);
    p(11, 3, '#ffe14a', 10, 6);
    p(0, 9, '#3a2a6a', C, 1);
    p(0, 10, n === 4 ? '#2f8a4a' : '#22a08a', C, R - 10);
    for (let y = 10; y < R; y++) {
      const t = (y - 10) / (R - 10);
      const w = 3 + t * 22;
      p(16 - w / 2, y, '#3a3944', w, 1);
      p(16 - w / 2 - 1, y, y % 2 ? '#f6f4ee' : '#e8302a', 1, 1);
      p(16 + w / 2, y, y % 2 ? '#f6f4ee' : '#e8302a', 1, 1);
      if (y % 4 < 2) p(15.6, y, '#ffe14a', 0.8, 1);
    }
    const cor = n === 4 ? '#2f8cff' : '#e8302a';
    p(11, 18, cor, 9, 4);
    p(12.5, 16, cor, 6, 2);
    p(13.2, 16.4, '#bfe7ff', 4.6, 1.4);
    p(11, 21.5, '#1f1e25', 2, 2);
    p(18, 21.5, '#1f1e25', 2, 2);
    p(11.5, 19, '#ffe14a', 1.5, 1);
    p(17, 19, '#ffe14a', 1.5, 1);
  } else {
    // blocos caindo: o poço, as pilhas de quadradinhos e um par caindo
    p(0, 0, '#141230', C, R);
    p(8, 1, '#2a2850', 16, 24);
    const cores = ['#e8302a', '#2f8cff', '#ffe14a', '#2ee0d0', '#ff6fb4'];
    const alt = [5, 3, 6, 2, 4, 1, 3, 5];
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < alt[i]; j++) {
        const cor = cores[Math.floor(r() * cores.length)];
        p(8 + i * 2, 23 - j * 2, cor, 2, 2);
        p(8 + i * 2, 23 - j * 2, 'rgba(255,255,255,0.35)', 2, 0.4);
        p(8 + i * 2 + 1.6, 23 - j * 2, 'rgba(0,0,0,0.25)', 0.4, 2);
      }
    p(14, 5, '#ffe14a', 2, 2);
    p(16, 5, '#ff6fb4', 2, 2);
    p(14, 5, 'rgba(255,255,255,0.4)', 4, 0.4);
    p(7, 1, '#d4d8e2', 1, 24);
    p(24, 1, '#d4d8e2', 1, 24);
    p(7, 25, '#d4d8e2', 18, 1);
    for (let i = 0; i < 4; i++) p(27, 4 + i * 3, i < 3 ? '#ffe14a' : '#3a3860', 3, 2);
    for (let i = 0; i < 3; i++) p(2, 6 + i * 4, cores[i], 3, 3);
  }
  // as linhas da tela de tubo
  g.fillStyle = 'rgba(0,0,0,0.16)';
  for (let y = 0; y < A; y += 4) g.fillRect(0, y, L, 1);
}

/** As capas das revistinhas da banca (inventadas, sem palavra), numa grade. */
export function pintarRevistas(g: G, L: number, A: number, col: number, lin: number): void {
  g.fillStyle = '#7a4f2a';
  g.fillRect(0, 0, L, A);
  const r = sorteio(53);
  const fundos = ['#e8302a', '#2f8cff', '#ffe14a', '#f6f4ee', '#22b8a8', '#ff8a2a', '#2e2d36'];
  const tintas = ['#ffe14a', '#f6f4ee', '#e8302a', '#2f6fd8', '#2e2d36'];
  const formas: Forma[] = ['raio', 'estrela', 'nota', 'balao', 'patim', 'sol'];
  const w = L / col;
  const h = A / lin;
  for (let j = 0; j < lin; j++)
    for (let i = 0; i < col; i++) {
      const fi = Math.floor(r() * fundos.length);
      let ti = Math.floor(r() * tintas.length);
      if (tintas[ti] === fundos[fi]) ti = (ti + 1) % tintas.length;
      const x = i * w + w * 0.08;
      const y = j * h + h * 0.07;
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.fillRect(x + 2, y + 3, w * 0.84, h * 0.84);
      g.fillStyle = fundos[fi];
      g.fillRect(x, y, w * 0.84, h * 0.84);
      g.fillStyle =
        tintas[(ti + 2) % tintas.length] === fundos[fi]
          ? '#f6f4ee'
          : tintas[(ti + 2) % tintas.length];
      g.fillRect(x, y, w * 0.84, h * 0.16);
      g.fillStyle = tintas[ti];
      forma(
        g,
        formas[Math.floor(r() * formas.length)],
        x + w * 0.42,
        y + h * 0.52,
        Math.min(w, h) * 0.36,
      );
    }
}
