/**
 * As peças do Festival Trovão, do fliperama e do rinque (spec 026): o palco (o raio da logo, as
 * lâmpadas, os holofotes, a bateria, o teclado, o pedestal), o rádio e a fita gigantes, a mesa
 * de som, as máquinas do fliperama, o globo de espelhos e o suporte dos patins. As regras e as
 * coordenadas locais são as de `pecas.ts`.
 */
import type { TipoPecaVila } from '../../world/vilaNeon';
import type { Item } from '../solidos';
import { COR, LAMPADAS, Ref, perfilEstrela, perfilRaio } from './ref';
import { patimNeon, pintarTela, fundoPlaca } from './neon';

const VIDRO_ESC = '#6fb4d8';
const OURO = '#e8c040';

export function desenharPecaFestival(r: Ref, tipo: TipoPecaVila, n: number): void {
  switch (tipo) {
    case 'maquina':
      return maquina(new Ref(r.d, r.p, 1.3), n);
    case 'globo':
      return globo(r);
    case 'suporte-patins':
      return suportePatins(r);
    case 'holofote':
      return holofote(r, n);
    case 'bateria':
      return bateria(new Ref(r.d, r.p, 1.7));
    case 'teclado':
      return teclado(new Ref(r.d, r.p, 1.3));
    case 'pedestal':
      return pedestal(new Ref(r.d, r.p, 1.2));
    case 'radio-gigante':
      return radioGigante(r);
    case 'fita-gigante':
      return fitaGigante(r);
    case 'mesa-som':
      return mesaSom(r);
    case 'raio-portao':
      return raioPortao(r);
    case 'flamula':
      return flamula(r, n);
    case 'raio-palco':
      return raioPalco(r, n);
    case 'arco-lampadas':
      return arcoLampadas(r);
    default:
      return;
  }
}

// ------------------------------------------------------------------ o fliperama

const CORES_MAQUINA = [COR.vermelho, COR.azul, COR.amarelo, COR.vermelho, COR.azul];

/** Máquina de fliperama: o gabinete de lado clássico, a tela acesa com um jogo nosso. */
function maquina(r: Ref, n: number): void {
  const cor = CORES_MAQUINA[n % CORES_MAQUINA.length];
  const gabinete: Item[] = [
    { x: -0.42, y: 0.1 },
    { x: 0.4, y: 0.1 },
    { x: 0.4, y: 0.92 },
    { x: 0.54, y: 1.0 },
    { x: 0.54, y: 1.1 },
    { x: 0.2, y: 1.16 },
    { x: 0.2, y: 1.8 },
    { x: 0.44, y: 1.86 },
    { x: 0.44, y: 2.14 },
    { x: -0.42, y: 2.14 },
  ];
  r.perfil(gabinete, -0.42, 0.42, 0.03, cor);
  r.caixa(0.9, 0.12, 0.9, 0, 0, 0, COR.grafite, 0.03);
  // os lados grafite com a faixa clara (o desenho de lado dos anos 80)
  for (const s of [-1, 1]) {
    r.caixa(0.02, 1.9, 0.5, s * 0.43, 0.16, -0.14, COR.grafite2, 0);
    r.caixa(0.024, 0.12, 0.84, s * 0.43, 0.78, 0, COR.branco, 0);
    r.caixa(0.024, 0.06, 0.84, s * 0.43, 0.68, 0, n % 3 === 2 ? COR.vermelho : COR.amarelo, 0);
  }
  // a tela (acesa) na moldura escura
  r.caixa(0.76, 0.6, 0.02, 0, 1.18, 0.205, COR.preto, 0);
  r.quadro(0.66, 0.52, 0, 1.48, 0.222, (g, L, A) => pintarTela(g, L, A, n), true, 128);
  // o letreiro de cima aceso e a moldura
  r.luz(0.74, 0.2, 0.02, 0, 1.9, 0.445, n % 3 === 2 ? '#ff9a6a' : '#fff1c4');
  r.luz(0.14, 0.12, 0.024, -0.2, 1.94, 0.447, n % 3 === 0 ? COR.azul : COR.vermelho);
  r.luz(0.3, 0.05, 0.024, 0.12, 1.98, 0.447, n % 3 === 0 ? COR.vermelho : COR.azul);
  // a mesa de controle: a alavanca e os botões acesos
  r.caixa(0.05, 0.14, 0.05, -0.18, 1.11, 0.4, COR.cromo, 0);
  r.caixa(0.1, 0.1, 0.1, -0.18, 1.23, 0.4, COR.vermelho, 0.03);
  r.luz(0.08, 0.04, 0.08, 0.06, 1.12, 0.4, COR.amarelo);
  r.luz(0.08, 0.04, 0.08, 0.2, 1.12, 0.4, n % 3 === 1 ? COR.vermelho : COR.azul);
  // a portinha da ficha
  r.caixa(0.34, 0.36, 0.02, 0, 0.4, 0.405, COR.grafite, 0);
  r.caixa(0.26, 0.28, 0.02, 0, 0.44, 0.412, COR.grafite2, 0);
  r.luz(0.05, 0.1, 0.02, 0, 0.56, 0.425, '#ff9a2a');
}

/** O globo de espelhos: facetado em gomos de oito lados, com espelhinhos que acendem. */
function globo(r: Ref): void {
  const R = 0.8;
  const cy = 0.9;
  const h = 0.32;
  for (let i = -2; i <= 2; i++) {
    const y = cy + i * h;
    const raio = R * Math.sqrt(1 - Math.pow((i * h) / (R + 0.08), 2));
    r.prisma(8, raio, h, 0, y, 0, i % 2 ? '#aab4cc' : COR.cromo, 'y');
    const d = raio * Math.cos(Math.PI / 8);
    for (let k = 0; k < 8; k++) {
      const m = (k + i + 6) % 3;
      if (m === 2) continue;
      const a = (k * Math.PI) / 4;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      if (m === 0) r.luz(0.17, 0.17, 0.17, x, y - 0.085, z, k % 2 ? '#ffffff' : '#ffd0ea');
      else r.caixa(0.17, 0.17, 0.17, x, y - 0.085, z, '#7f8fb8', 0);
    }
  }
  r.prisma(8, 0.3, 0.08, 0, cy + 2.5 * h + 0.02, 0, '#aab4cc', 'y');
  r.prisma(8, 0.3, 0.08, 0, cy - 2.5 * h - 0.02, 0, '#aab4cc', 'y');
  // o motorzinho e a haste até a treliça
  r.caixa(0.07, 0.4, 0.07, 0, cy + R - 0.04, 0, COR.grafite, 0);
  r.caixa(0.3, 0.14, 0.3, 0, cy + R + 0.24, 0, COR.grafite2, 0.03);
}

const BOTA: [number, number][] = [
  [-0.2, 0],
  [0.24, 0],
  [0.24, 0.13],
  [0.04, 0.2],
  [0.02, 0.46],
  [-0.2, 0.46],
];

/** O suporte dos patins: as botas grandes com a faixa de cor e o patim de neon em cima. */
function suportePatins(r: Ref): void {
  const W = 2.8;
  for (const s of [-1, 1]) {
    r.caixa(0.12, 2.0, 0.12, (s * W) / 2, 0, -0.2, COR.cromo, 0.03);
    r.caixa(0.3, 0.1, 0.6, (s * W) / 2, 0, 0, COR.grafite2, 0.03);
  }
  r.caixa(W, 1.3, 0.06, 0, 0.36, -0.2, COR.turquesa, 0.02);
  r.caixa(W, 0.1, 0.07, 0, 1.56, -0.2, COR.rosa, 0);
  const faixas = [COR.rosa, COR.azul, COR.amarelo, COR.vermelho, COR.rosa, COR.azul];
  [0.36, 1.0].forEach((y, j) => {
    r.caixa(W + 0.1, 0.07, 0.56, 0, y, 0.02, COR.branco, 0.02);
    for (let i = 0; i < 3; i++) {
      const x = -0.9 + i * 0.9;
      const cor = faixas[j * 3 + i];
      const yb = y + 0.07 + 0.19;
      r.placa(BOTA, 0.22, x, yb, 0.05, COR.branco);
      r.caixa(0.225, 0.07, 0.23, x - 0.09, yb + 0.3, 0.05, cor, 0);
      r.caixa(0.5, 0.05, 0.26, x + 0.02, yb - 0.05, 0.05, cor, 0.02);
      for (const dx of [-0.13, 0.17])
        r.roda(0.075, 0.28, x + dx, yb - 0.115, 0.05, COR.amarelo, 'z');
    }
  });
  // o patim de neon em cima (o desenho diz o que é)
  r.caixa(1.7, 0.86, 0.16, 0, 1.74, -0.16, COR.grafite, 0.04);
  r.quadro(
    1.56,
    0.72,
    0,
    2.17,
    -0.07,
    (g, L, A) => {
      fundoPlaca(g, L, A, '#1d1430');
      patimNeon(g, L * 0.5, A * 0.44, A * 0.6, '#ff6fb4', A * 0.045);
    },
    true,
    128,
  );
  for (let i = 0; i < 6; i++) r.luz(0.1, 0.1, 0.1, -0.75 + i * 0.3, 2.62, -0.16, LAMPADAS[i % 2]);
}

// ------------------------------------------------------------------ o palco

const CORES_HOLOFOTE = [COR.vermelho, COR.azul, '#f4e8c0', COR.amarelo];

/** Holofote pendurado na grade (apagado: a lente de cor, sem brilho; o show acende depois). */
function holofote(r: Ref, n: number): void {
  const cor = CORES_HOLOFOTE[n % CORES_HOLOFOTE.length];
  r.caixa(0.14, 0.2, 0.14, 0, -0.2, 0, COR.cromo, 0.02);
  r.caixa(0.7, 0.06, 0.12, 0, -0.26, 0, COR.grafite, 0);
  for (const s of [-1, 1]) r.caixa(0.05, 0.5, 0.12, s * 0.33, -0.74, 0, COR.grafite, 0);
  r.caixa(0.54, 0.54, 0.7, 0, -1.04, 0.06, COR.grafite2, 0.06);
  r.caixa(0.5, 0.5, 0.05, 0, -1.02, 0.42, COR.cromo, 0.02);
  r.caixa(0.4, 0.4, 0.03, 0, -0.97, 0.45, cor, 0);
  // as abas da frente
  r.caixa(0.5, 0.03, 0.2, 0, -0.5, 0.52, COR.grafite, 0);
  r.caixa(0.5, 0.03, 0.2, 0, -1.07, 0.52, COR.grafite, 0);
}

function tambor(r: Ref, raio: number, alt: number, x: number, y: number, z: number): void {
  r.prisma(8, raio, alt, x, y + alt / 2, z, COR.vermelho, 'y');
  r.prisma(8, raio + 0.02, 0.04, x, y + alt, z, COR.cromo, 'y');
  r.prisma(8, raio - 0.03, 0.02, x, y + alt + 0.03, z, COR.branco, 'y');
}

/** A bateria vermelha no praticável: dois bumbos brancos com a estrela amarela. */
function bateria(r: Ref): void {
  for (const s of [-1, 1]) {
    const x = s * 0.56;
    r.prisma(10, 0.46, 0.56, x, 0.46, 0.1, COR.vermelho, 'z');
    r.prisma(10, 0.49, 0.05, x, 0.46, 0.36, COR.cromo, 'z');
    r.prisma(10, 0.49, 0.05, x, 0.46, -0.16, COR.cromo, 'z');
    r.prisma(10, 0.42, 0.03, x, 0.46, 0.395, COR.branco, 'z');
    r.placa(perfilEstrela(0.26), 0.03, x, 0.46, 0.42, COR.amarelo);
    // o tom-tom em cima de cada bumbo
    r.caixa(0.05, 0.16, 0.05, x * 0.6, 0.9, 0, COR.cromo, 0);
    tambor(r, 0.22, 0.24, x * 0.62, 1.04, 0);
  }
  tambor(r, 0.3, 0.52, 1.36, 0.14, -0.3);
  for (const [dx, dz] of [
    [-0.2, -0.2],
    [0.2, -0.2],
    [0, 0.24],
  ] as const)
    r.caixa(0.04, 0.16, 0.04, 1.36 + dx, 0, -0.3 + dz, COR.cromo, 0);
  // a caixa no pedestal
  r.caixa(0.05, 0.62, 0.05, -1.3, 0, -0.15, COR.cromo, 0);
  r.prisma(8, 0.26, 0.16, -1.3, 0.7, -0.15, COR.cromo, 'y');
  r.prisma(8, 0.24, 0.02, -1.3, 0.79, -0.15, COR.branco, 'y');
  // os pratos e o chimbal
  for (const [x, y, z, raio] of [
    [-1.5, 1.56, -0.5, 0.38],
    [1.6, 1.62, -0.55, 0.42],
    [0, 1.72, -0.75, 0.34],
  ] as const) {
    r.caixa(0.05, y, 0.05, x, 0, z, COR.cromo, 0);
    r.prisma(8, raio, 0.035, x, y, z, OURO, 'y');
    r.caixa(0.08, 0.08, 0.08, x, y + 0.01, z, COR.cromo, 0);
  }
  r.caixa(0.05, 1.04, 0.05, -1.85, 0, 0.1, COR.cromo, 0);
  r.prisma(8, 0.25, 0.03, -1.85, 1.0, 0.1, OURO, 'y');
  r.prisma(8, 0.25, 0.03, -1.85, 1.06, 0.1, OURO, 'y');
  // o banquinho
  r.caixa(0.08, 0.5, 0.08, 0, 0, -0.75, COR.cromo, 0);
  r.caixa(0.44, 0.12, 0.44, 0, 0.5, -0.75, COR.grafite, 0.05);
}

/** O teclado azul-elétrico no pé em X. */
function teclado(r: Ref): void {
  for (const z of [-0.2, 0.2]) {
    r.barra([-0.75, 0, z], [0.75, 0.86, z], 0.06, COR.cromo);
    r.barra([0.75, 0, z], [-0.75, 0.86, z], 0.06, COR.cromo);
  }
  r.caixa(2.0, 0.16, 0.6, 0, 0.86, 0, COR.azul, 0.04);
  r.caixa(2.02, 0.05, 0.02, 0, 0.92, 0.305, COR.amarelo, 0);
  r.placa(perfilRaio(0.16), 0.02, -0.8, 0.94, 0.31, COR.amarelo);
  // as teclas (do lado de quem toca, atrás) e os botões
  r.caixa(1.8, 0.03, 0.26, 0, 1.02, -0.14, COR.branco, 0);
  for (let i = 0; i < 15; i++) {
    if (i % 7 === 2 || i % 7 === 6) continue;
    r.caixa(0.06, 0.03, 0.15, -0.84 + i * 0.12, 1.05, -0.08, COR.grafite, 0);
  }
  for (let i = 0; i < 6; i++)
    r.caixa(0.07, 0.04, 0.07, -0.8 + i * 0.14, 1.02, 0.16, i % 2 ? COR.branco : COR.grafite, 0);
  r.luz(0.3, 0.03, 0.1, 0.5, 1.02, 0.16, '#ff9a2a');
  r.luz(0.06, 0.03, 0.06, 0.8, 1.02, 0.16, COR.vermelho);
}

function pedestal(r: Ref): void {
  r.caixa(0.44, 0.06, 0.44, 0, 0, 0, COR.grafite, 0.03);
  r.caixa(0.06, 1.3, 0.06, 0, 0.06, 0, COR.cromo, 0);
  r.caixa(0.1, 0.08, 0.1, 0, 0.8, 0, COR.grafite, 0);
  r.barra([0, 1.34, 0], [0, 1.44, 0.2], 0.08, COR.grafite);
  r.caixa(0.13, 0.13, 0.13, 0, 1.4, 0.2, COR.cromo, 0.04);
}

/** O arco de lâmpadas de cubinho (de uma cor só) no fundo do palco, em volta do raio. */
function arcoLampadas(r: Ref): void {
  const R = 7.4;
  const cy = 1.4;
  for (let i = 0; i <= 22; i++) {
    const a = (16 + (i * 148) / 22) * (Math.PI / 180);
    const x = Math.cos(a) * R;
    const y = cy + Math.sin(a) * R;
    r.caixa(0.2, 0.2, 0.1, x, y - 0.1, -0.45, COR.grafite, 0);
    r.luz(0.24, 0.24, 0.16, x, y - 0.12, -0.36, '#fff1c4');
  }
}

/** O raio de neon da logo no fundo do palco (0) e os raios menores (1 a 4). */
function raioPalco(r: Ref, n: number): void {
  if (n === 0) {
    const y = 5.8;
    r.placa(perfilRaio(7.6), 0.1, 0, y, -0.44, COR.cromo);
    r.placa(perfilRaio(6.6), 0.16, 0.04, y, -0.4, COR.vermelho, true);
    r.placa(perfilRaio(5.0), 0.22, 0.08, y, -0.36, COR.amarelo, true);
    return;
  }
  if (n >= 3) {
    // os raios grandes das abas (vistos de lado, de longe): a logo inteira
    r.placa(perfilRaio(8.2), 0.1, 0, 4.2, -0.44, COR.cromo);
    r.placa(perfilRaio(7.2), 0.16, 0.04, 4.2, -0.4, COR.vermelho, true);
    r.placa(perfilRaio(5.4), 0.22, 0.08, 4.2, -0.36, COR.amarelo, true);
    return;
  }
  const cor = n % 2 ? COR.azul : COR.amarelo;
  r.placa(perfilRaio(3.3), 0.08, 0, 1.7, -0.45, COR.cromo);
  r.placa(perfilRaio(2.7), 0.14, 0.02, 1.7, -0.41, cor, true);
}

/** O raio da logo em cima do portão: cromo, vermelho e o miolo amarelo aceso (dos dois lados). */
function raioPortao(r: Ref): void {
  // (o pé do raio entra na travessa: de baixo, ele nunca parece solto no ar)
  r.caixa(1.6, 0.2, 1.1, -0.3, 0, 0, COR.cromo, 0.04);
  r.placa(perfilRaio(3.5), 0.16, 0, 1.5, 0, COR.cromo);
  r.placa(perfilRaio(2.95), 0.26, 0.04, 1.5, 0, COR.vermelho, true);
  r.placa(perfilRaio(2.2), 0.36, 0.08, 1.5, 0, COR.amarelo, true);
}

/** A flâmula do raio pendurada na torre de treliça. */
function flamula(r: Ref, n: number): void {
  const cor = n % 2 ? COR.azul : COR.vermelho;
  r.caixa(0.08, 0.08, 1.0, 0, 0, 0.8, COR.cromo, 0);
  r.caixa(1.3, 0.08, 0.08, 0, 0, 1.2, COR.cromo, 0);
  r.placa(
    [
      [-0.58, 0],
      [0.58, 0],
      [0.58, -1.6],
      [0, -2.2],
      [-0.58, -1.6],
    ],
    0.05,
    0,
    -0.04,
    1.2,
    cor,
  );
  r.placa(perfilRaio(1.2), 0.09, -0.04, -1.0, 1.2, COR.amarelo);
}

// ------------------------------------------------------------------ o campo do festival

/** O rádio gigante prateado: dois alto-falantes facetados, o toca-fitas e a alça. */
function radioGigante(r: Ref): void {
  const W = 5.0;
  const H = 2.6;
  for (const x of [-1.9, 1.9]) r.caixa(0.6, 0.14, 1.0, x, 0, 0, COR.grafite, 0.03);
  r.caixa(W, H, 1.3, 0, 0.12, 0, COR.cromo, 0.14);
  const zf = 0.65;
  // a faixa de cima: o mostrador, o ponteiro e as luzinhas
  r.caixa(W - 0.4, 0.56, 0.03, 0, 2.02, zf, COR.grafite, 0);
  r.caixa(2.2, 0.28, 0.03, 0.5, 2.16, zf + 0.02, '#f4ecdc', 0);
  for (let i = 0; i < 9; i++)
    r.caixa(0.03, 0.12, 0.035, -0.4 + i * 0.22, 2.2, zf + 0.025, COR.grafite, 0);
  r.luz(0.05, 0.28, 0.04, 0.9, 2.16, zf + 0.03, COR.vermelho);
  for (let i = 0; i < 5; i++)
    r.luz(0.14, 0.14, 0.04, -2.0 + i * 0.22, 2.22, zf + 0.02, i < 3 ? COR.amarelo : COR.vermelho);
  // os alto-falantes
  for (const x of [-1.62, 1.62]) {
    r.prisma(10, 0.84, 0.06, x, 1.02, zf, COR.cromo, 'z');
    r.prisma(10, 0.76, 0.1, x, 1.02, zf + 0.01, COR.grafite, 'z');
    r.prisma(10, 0.52, 0.12, x, 1.02, zf + 0.02, COR.grafite2, 'z');
    r.prisma(8, 0.2, 0.16, x, 1.02, zf + 0.03, COR.cromo, 'z');
  }
  // o toca-fitas no meio
  r.caixa(1.3, 0.9, 0.04, 0, 0.72, zf, COR.grafite, 0);
  r.caixa(0.96, 0.4, 0.03, 0, 1.08, zf + 0.025, VIDRO_ESC, 0);
  for (const x of [-0.24, 0.24]) r.prisma(8, 0.12, 0.04, x, 1.28, zf + 0.04, COR.branco, 'z');
  for (let i = 0; i < 5; i++)
    r.caixa(
      0.2,
      0.14,
      0.1,
      -0.48 + i * 0.24,
      0.8,
      zf + 0.03,
      i === 2 ? COR.vermelho : COR.cromo,
      0.02,
    );
  // os botões grandes de cima, a alça e a antena
  const botoes = [COR.vermelho, COR.branco, COR.azul, COR.branco, COR.amarelo];
  botoes.forEach((c, i) => r.caixa(0.44, 0.16, 0.4, -1.1 + i * 0.55, H + 0.1, 0.1, c, 0.04));
  for (const x of [-2.2, 2.2]) r.caixa(0.16, 0.7, 0.2, x, H, -0.2, COR.grafite, 0.04);
  r.caixa(4.6, 0.2, 0.24, 0, H + 0.62, -0.2, COR.grafite, 0.06);
  r.barra([2.0, H + 0.1, -0.45], [3.3, H + 1.9, -0.45], 0.08, COR.cromo);
  r.caixa(0.16, 0.16, 0.16, 3.3, H + 1.84, -0.45, COR.vermelho, 0.04);
}

/** A fita cassete gigante vermelha em pé na base, com o lápis no carretel. */
function fitaGigante(r: Ref): void {
  const W = 3.9;
  const H = 2.5;
  const y0 = 0.3;
  r.caixa(W + 0.5, 0.3, 1.1, 0, 0, 0, COR.grafite2, 0.06);
  r.caixa(W, H, 0.5, 0, y0, 0, COR.vermelho, 0.1);
  // o trapézio de baixo (com os furos), um fio para fora dos dois lados
  r.placa(
    [
      [-1.4, y0 + 0.04],
      [1.4, y0 + 0.04],
      [1.08, y0 + 0.62],
      [-1.08, y0 + 0.62],
    ],
    0.58,
    0,
    0,
    0,
    '#b8241e',
  );
  for (const s of [-1, 1]) {
    const z = s * 0.25;
    // o rótulo com as faixas e a janela dos carretéis
    r.caixa(3.4, 1.34, 0.03, 0, y0 + 0.9, z, '#f4ecdc', 0);
    r.caixa(3.4, 0.2, 0.034, 0, y0 + 2.02, z, COR.azul, 0);
    r.caixa(3.4, 0.1, 0.034, 0, y0 + 1.9, z, COR.amarelo, 0);
    r.caixa(1.9, 0.56, 0.04, 0, y0 + 1.1, z + s * 0.005, COR.grafite, 0);
    for (const x of [-0.56, 0.56]) {
      r.prisma(8, 0.22, 0.05, x, y0 + 1.38, z + s * 0.03, COR.branco, 'z');
      r.prisma(8, 0.09, 0.07, x, y0 + 1.38, z + s * 0.03, COR.grafite, 'z');
    }
    for (const x of [-0.9, -0.3, 0.3, 0.9])
      r.caixa(0.14, 0.14, 0.03, x, y0 + 0.24, z + s * 0.045, COR.grafite, 0);
    for (const [x, y] of [
      [-1.8, 0.1],
      [1.8, 0.1],
      [-1.8, H - 0.2],
      [1.8, H - 0.2],
    ] as const)
      r.caixa(0.1, 0.1, 0.03, x, y0 + y, z + s * 0.01, COR.cromo, 0);
  }
  // o lápis no carretel da esquerda (a ponta dentro, a borracha para fora)
  const lx = -0.56;
  const ly = y0 + 1.38;
  r.caixa(0.1, 0.1, 0.24, lx, ly - 0.05, 0.4, '#e8c9a0', 0);
  r.caixa(0.18, 0.18, 1.3, lx, ly - 0.09, 1.16, COR.amarelo, 0.03);
  r.caixa(0.2, 0.2, 0.14, lx, ly - 0.1, 1.88, COR.cromo, 0.02);
  r.caixa(0.18, 0.18, 0.22, lx, ly - 0.09, 2.06, '#ff8fb8', 0.04);
}

/** A mesa de som debaixo da torre: a mesa inclinada de botõezinhos e as caixas dos lados. */
function mesaSom(r: Ref): void {
  r.caixa(2.9, 0.82, 1.0, 0, 0, 0, COR.grafite2, 0.05);
  const tampo: Item[] = [
    { x: -0.52, y: 0.8 },
    { x: 0.52, y: 0.8 },
    { x: 0.52, y: 1.16 },
    { x: -0.52, y: 0.92 },
  ];
  r.perfil(tampo, -1.45, 1.45, 0.02, COR.grafite);
  const cores = [COR.branco, COR.vermelho, COR.branco, COR.amarelo, COR.branco, COR.azul];
  for (let i = 0; i < 14; i++)
    for (let j = 0; j < 3; j++) {
      const z = -0.34 + j * 0.3;
      const y = 0.92 + ((z + 0.52) / 1.04) * 0.24;
      const x = -1.24 + i * 0.19;
      if (j === 2) r.luz(0.07, 0.05, 0.07, x, y, z, i % 5 === 4 ? COR.vermelho : '#8dff9a');
      else r.caixa(0.07, 0.07, 0.1, x, y, z + ((i * 7 + j * 3) % 5) * 0.02, cores[(i + j) % 6], 0);
    }
  for (const s of [-1, 1]) {
    r.caixa(0.7, 1.5, 0.8, s * 2.0, 0, 0, COR.grafite, 0.05);
    r.prisma(8, 0.24, 0.05, s * 2.0, 1.1, -0.4, COR.grafite2, 'z');
    r.prisma(8, 0.16, 0.05, s * 2.0, 0.5, -0.4, COR.grafite2, 'z');
    r.caixa(0.72, 0.05, 0.82, s * 2.0, 1.5, 0, COR.cromo, 0);
  }
  // o banquinho e o abajur de mesa
  r.caixa(0.08, 0.5, 0.08, 0, 0, 0.95, COR.cromo, 0);
  r.caixa(0.44, 0.12, 0.44, 0, 0.5, 0.95, COR.vermelho, 0.05);
  r.barra([1.3, 1.1, 0.4], [1.1, 1.5, 0.2], 0.04, COR.cromo);
  r.luz(0.2, 0.06, 0.14, 1.06, 1.46, 0.16, '#fff1c4');
}
