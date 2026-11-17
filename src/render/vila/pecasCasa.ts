/**
 * O desenho das peças paradas da Casa anos 80 e da pista de skate (spec 026, parte 3). Peças de
 * brinquedo, quadradas e com quina macia, como o resto do bairro; tudo inventado aqui, sem marca
 * nenhuma, em duas ou três cores por coisa (nada de arco-íris).
 *
 * - **A casa** (`desenharPecaCasa`) vai numa malha só dela, com a luz de dentro da casa
 *   (`render/vila/casa.ts`): o que mexe (a tela da TV, o prato e o braço do toca-discos, o fone,
 *   os ponteiros do relógio, os brinquedos do quarto) é desenhado lá, por cima destas.
 * - **A pista** (`desenharPecaRampa`) vai na malha do pedaço, como as outras peças da rua.
 *
 * As medidas batem com as caixas de colisão de `world/vilaSolidos.ts` (o teste confere).
 */
import type { Item, V3 } from '../solidos';
import { COR, Ref, perfilEstrela, perfilRaio } from './ref';
import { TELA_TV, PRATO } from '../../world/vilaCasa';
import { MEDIDA_RAMPA, alturaDoDeck, alturaNaRampa } from '../../jogo/rampa';
import { COMPRIMENTO_RAMPA } from '../../world/vilaRampa';
import type { TipoPecaVila } from '../../world/vilaNeon';

/** As cores da casa (madeira, o xadrez do sofá, o tapete, o quarto). */
export const CASA = {
  madeira: '#8a5530',
  madeiraClara: '#b98250',
  madeiraEscura: '#5e3820',
  latao: '#c9a24a',
  creme: '#f2e2bd',
  ferrugem: '#b8562e',
  marrom: '#6a3a20',
  vinho: '#8e2b3a',
  mostarda: '#d9a52a',
  vidroTv: '#1d2a33',
  telefone: '#d8322a',
  laranja: '#e0893a',
  laranjaEscuro: '#c06a24',
  azulQuarto: '#4a8ad8',
  vermelhoEva: '#e8463a',
  azulEva: '#3a7ad8',
  amareloEva: '#f2c230',
} as const;

// ================================================================== a casa

export function desenharPecaCasa(r: Ref, tipo: TipoPecaVila, n: number): boolean {
  switch (tipo) {
    case 'casa-tv':
      tv(r);
      return true;
    case 'casa-fitas':
      estanteDeFitas(r);
      return true;
    case 'casa-planta':
      planta(r);
      return true;
    case 'casa-relogio':
      relogio(r);
      return true;
    case 'casa-tapete':
      tapete(r);
      return true;
    case 'casa-sofa':
      sofa(r);
      return true;
    case 'casa-abajur':
      abajur(r);
      return true;
    case 'casa-telefone':
      mesinhaDoTelefone(r);
      return true;
    case 'casa-discos':
      tocaDiscos(r);
      return true;
    case 'casa-cortina':
      cortina(r, n);
      return true;
    case 'casa-capacho':
      r.caixa(1.3, 0.03, 0.72, 0, 0, 0, CASA.marrom, 0.01);
      r.caixa(1.1, 0.012, 0.52, 0, 0.03, 0, CASA.madeiraClara, 0);
      return true;
    case 'casa-quebra-cabeca':
      quebraCabeca(r);
      return true;
    case 'casa-ioio':
      suporteDoIoio(r);
      return true;
    case 'casa-bau':
      bau(r);
      return true;
    // (o pião, o cubo, o robô e a bola mexem: são todos de `casa.ts`)
    case 'casa-piao':
    case 'casa-cubo':
    case 'casa-robo':
    case 'casa-bola':
      return true;
    default:
      return false;
  }
}

/**
 * A TV de tubo de madeira com antena, em cima do móvel baixo: o videocassete na prateleira aberta
 * do móvel, o console de cartucho (genérico) do lado da TV e os dois controles no tapete, com fio.
 */
function tv(r: Ref): void {
  // o móvel baixo de pezinhos, com a prateleira aberta (o videocassete) e a porta de madeira
  for (const x of [-1.02, 1.02])
    for (const z of [-0.24, 0.24]) r.caixa(0.08, 0.1, 0.08, x, 0, z, CASA.madeiraEscura, 0.01);
  r.caixa(2.2, 0.52, 0.62, 0, 0.1, 0, CASA.madeira, 0.04);
  r.caixa(1.0, 0.34, 0.05, -0.5, 0.18, 0.3, CASA.madeiraEscura, 0.01);
  r.caixa(0.96, 0.34, 0.03, 0.5, 0.18, 0.31, CASA.madeiraClara, 0.02);
  r.caixa(0.06, 0.12, 0.04, 0.12, 0.3, 0.33, CASA.latao, 0.015);
  // o videocassete (a fita da locadora entra nele): prata, a boca da fita e o relógio verde
  r.caixa(0.86, 0.15, 0.48, -0.5, 0.2, 0.06, '#c9ccd4', 0.02);
  r.caixa(0.42, 0.04, 0.02, -0.62, 0.29, 0.305, COR.preto, 0);
  r.luz(0.14, 0.035, 0.01, -0.22, 0.26, 0.31, '#5aff8a');
  r.caixa(0.05, 0.03, 0.02, -0.1, 0.25, 0.305, COR.vermelho, 0);
  // a TV: a caixa de madeira funda, a moldura escura, o vidro da tela (a imagem vem de casa.ts),
  // o painel dos botões do lado e a grade do alto-falante
  const tx = -0.12;
  r.caixa(1.34, 1.06, 0.76, tx, 0.62, 0.05, CASA.madeira, 0.07);
  r.caixa(1.2, 0.94, 0.05, tx, 0.68, 0.43, COR.grafite, 0.03);
  const [sx, sy] = TELA_TV;
  r.caixa(0.88, 0.68, 0.03, sx, sy - 0.34, 0.455, CASA.vidroTv, 0.03);
  r.caixa(0.26, 0.86, 0.02, 0.33, 0.72, 0.46, CASA.madeiraClara, 0.01);
  for (const y of [1.36, 1.17]) {
    r.prisma(10, 0.065, 0.05, 0.33, y, 0.48, COR.cromo, 'z');
    r.caixa(0.016, 0.06, 0.02, 0.33, y - 0.03, 0.505, COR.preto, 0);
  }
  for (let i = 0; i < 5; i++) r.caixa(0.18, 0.016, 0.02, 0.33, 0.8 + i * 0.05, 0.47, COR.preto, 0);
  // a antena de coelho: a base redonda e as duas varetas com bolinha na ponta
  r.prisma(10, 0.11, 0.07, tx, 1.71, 0.02, COR.grafite, 'y');
  for (const s of [-1, 1]) {
    const ponta: V3 = [tx + s * 0.42, 2.32, -0.06];
    r.barra([tx, 1.73, 0.02], ponta, 0.022, COR.cromo);
    r.caixa(0.05, 0.05, 0.05, ponta[0], ponta[1] - 0.02, ponta[2], COR.cromo, 0.02);
  }
  // o console de cartucho (genérico, sem nome): a caixa grafite, a faixa creme, o cartucho
  // vermelho espetado e os dois botões
  const cx = 0.8;
  r.caixa(0.52, 0.11, 0.38, cx, 0.62, 0.04, COR.grafite2, 0.03);
  r.caixa(0.52, 0.02, 0.2, cx, 0.73, 0.1, CASA.creme, 0.01);
  r.caixa(0.24, 0.16, 0.05, cx, 0.72, -0.06, COR.vermelho, 0.015);
  r.caixa(0.16, 0.07, 0.01, cx, 0.78, -0.03, CASA.creme, 0);
  for (const x of [cx - 0.16, cx - 0.06]) r.caixa(0.06, 0.03, 0.04, x, 0.72, 0.2, COR.vermelho, 0.01);
  // os dois controles no tapete (entre a TV e o sofá) e o fio de cada um até o console
  for (const [x, z, k] of [
    [-0.25, 2.9, 1],
    [0.55, 2.75, -1],
  ] as const) {
    r.caixa(0.3, 0.05, 0.15, x, 0.03, z, COR.preto, 0.02);
    r.caixa(0.08, 0.012, 0.024, x - 0.08, 0.08, z, COR.grafite2, 0);
    r.caixa(0.024, 0.012, 0.08, x - 0.08, 0.08, z, COR.grafite2, 0);
    for (const dx of [0.06, 0.11])
      r.caixa(0.035, 0.016, 0.035, x + dx, 0.08, z + 0.01 * k, COR.vermelho, 0.01);
    r.barra([cx + 0.18 * k, 0.66, 0.24], [cx + 0.2 * k, 0.04, 0.42], 0.018, COR.preto);
    r.barra([cx + 0.2 * k, 0.03, 0.42], [x, 0.04, z - 0.08], 0.018, COR.preto);
  }
}

/** A estante de fitas cassete: madeira clara, quatro prateleiras de fitas e o rádio-gravador em cima. */
function estanteDeFitas(r: Ref): void {
  const L = 1.44;
  const A = 2.1;
  const D = 0.4;
  r.caixa(L, A, 0.04, 0, 0, -D / 2 + 0.02, CASA.madeira, 0.01);
  for (const x of [-L / 2 + 0.03, L / 2 - 0.03]) r.caixa(0.06, A, D, x, 0, 0, CASA.madeiraClara, 0.02);
  const cores = [CASA.creme, COR.vermelho, '#3a6ad0', COR.grafite2, CASA.creme, CASA.mostarda];
  for (let k = 0; k <= 4; k++) {
    const y = 0.06 + k * 0.42;
    r.caixa(L - 0.06, 0.05, D, 0, y, 0, CASA.madeiraClara, 0.01);
    if (k === 4) break;
    // as fitas em pé, de lombada para a frente (cada prateleira com a sua mistura e um vão)
    let x = -L / 2 + 0.12;
    let i = k * 3;
    while (x < L / 2 - 0.12) {
      if ((i * 7 + k) % 9 === 4) {
        x += 0.1;
        i++;
        continue;
      }
      const cor = cores[(i * 5 + k * 2) % cores.length];
      r.caixa(0.07, 0.26, 0.24, x, y + 0.05, 0.02, cor, 0.008);
      r.caixa(0.075, 0.05, 0.005, x, y + 0.17, 0.142, CASA.creme, 0);
      x += 0.085;
      i++;
    }
  }
  r.caixa(L, 0.05, D, 0, A - 0.05, 0, CASA.madeiraClara, 0.01);
  // o rádio-gravador em cima: grafite, os dois alto-falantes e a alça
  r.caixa(0.86, 0.36, 0.22, 0.05, A, 0, COR.grafite2, 0.04);
  for (const x of [-0.22, 0.32]) {
    r.prisma(10, 0.12, 0.03, x, A + 0.17, 0.115, COR.preto, 'z');
    r.prisma(8, 0.045, 0.04, x, A + 0.17, 0.12, COR.cromo, 'z');
  }
  r.caixa(0.18, 0.08, 0.02, 0.05, A + 0.18, 0.115, CASA.creme, 0.01);
  for (const x of [-0.3, 0.4]) r.barra([x, A + 0.36, 0], [x, A + 0.48, 0], 0.03, COR.cromo);
  r.caixa(0.73, 0.03, 0.03, 0.05, A + 0.47, 0, COR.cromo, 0);
}

/** A planta no vaso de barro (espada de folhas compridas, verde com a beirada clara). */
function planta(r: Ref): void {
  r.prisma(8, 0.27, 0.44, 0, 0.22, 0, '#c8643a', 'y');
  r.prisma(8, 0.3, 0.06, 0, 0.44, 0, '#d8744a', 'y');
  r.prisma(8, 0.24, 0.02, 0, 0.47, 0, '#4a3020', 'y');
  const folhas: [number, number, number, number][] = [
    [0, 0, 1.35, 0],
    [0.16, 0.05, 1.12, 0.3],
    [-0.15, 0.06, 1.18, -0.3],
    [0.05, -0.16, 1.05, 0.2],
    [-0.06, 0.15, 1.0, -0.2],
    [0.18, -0.12, 0.9, 0.4],
    [-0.18, -0.08, 0.95, -0.4],
  ];
  folhas.forEach(([x, z, alt, inc], i) => {
    const pe: V3 = [x * 0.4, 0.46, z * 0.4];
    const ponta: V3 = [x * 1.6 + inc * 0.25, 0.46 + alt, z * 1.6];
    r.barra([pe[0], pe[1] + 0.1, pe[2]], [ponta[0], ponta[1] - 0.05, ponta[2]], 0.085, '#cfd86a');
    r.barra(pe, ponta, 0.075, i % 2 ? '#3f8f3a' : '#2f7a34');
  });
}

/** O relógio de parede: aro de madeira, o mostrador creme e os doze risquinhos (os ponteiros andam). */
function relogio(r: Ref): void {
  r.prisma(12, 0.32, 0.07, 0, 0, 0.035, CASA.madeira, 'z');
  r.prisma(12, 0.27, 0.02, 0, 0, 0.075, CASA.creme, 'z');
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    const k = i % 3 === 0 ? 0.06 : 0.035;
    r.caixa(0.024, k, 0.01, Math.sin(a) * 0.21, Math.cos(a) * 0.21 - k / 2, 0.087, COR.preto, 0);
  }
}

/** O tapete grande da sala: vinho com a barra creme e os losangos de mostarda (três cores). */
function tapete(r: Ref): void {
  const L = 5.6;
  const P = 4.0;
  r.caixa(L, 0.022, P, 0, 0, 0, CASA.vinho, 0);
  for (const s of [-1, 1]) {
    r.caixa(L - 0.3, 0.012, 0.14, 0, 0.022, s * (P / 2 - 0.25), CASA.creme, 0);
    r.caixa(0.14, 0.012, P - 0.36, s * (L / 2 - 0.25), 0.022, 0, CASA.creme, 0);
  }
  // os losangos: degraus de mostarda com o miolo creme
  for (const cx of [-1.6, 0, 1.6])
    for (let i = -3; i <= 3; i++) {
      const w = (3 - Math.abs(i)) * 0.16 + 0.1;
      r.caixa(w, 0.012, 0.16, cx, 0.022, i * 0.16, CASA.mostarda, 0);
      if (Math.abs(i) <= 1)
        r.caixa(Math.max(0.08, w - 0.4), 0.014, 0.12, cx, 0.024, i * 0.16, CASA.creme, 0);
    }
  // as franjas nas pontas
  for (const s of [-1, 1])
    for (let i = 0; i < 18; i++)
      r.caixa(0.05, 0.01, 0.12, -L / 2 + 0.2 + i * ((L - 0.4) / 17), 0, s * (P / 2 + 0.05), CASA.creme, 0);
}

/** Uma almofada de xadrez: o fundo ferrugem e as listras que se cruzam (marrom e creme). */
function almofadaXadrez(
  r: Ref,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  frente: 'cima' | 'frente',
): void {
  r.caixa(w, h, d, x, y, z, CASA.ferrugem, 0.08);
  const e = 0.006;
  // (as listras ficam no miolo da face, longe das quinas macias: nunca soltas no ar)
  const fio = '#e0a070';
  const listra = '#8a4426';
  if (frente === 'cima') {
    // por cima: as listras ao longo e de través, a escura grossa e o fio claro do lado
    for (const k of [-0.25, 0.25]) {
      r.caixa(0.1, e, d - 0.22, x + k * w, y + h, z, listra, 0);
      r.caixa(w - 0.22, e, 0.1, x, y + h, z + k * d, listra, 0);
      r.caixa(0.022, e * 2, d - 0.22, x + k * w + 0.085, y + h, z, fio, 0);
      r.caixa(w - 0.22, e * 2, 0.022, x, y + h, z + k * d + 0.085, fio, 0);
    }
    // e na frente da almofada as listras descem
    for (const k of [-0.25, 0.25])
      r.caixa(0.1, h - 0.18, e, x + k * w, y + 0.09, z + d / 2, listra, 0);
  } else {
    // de frente (o encosto e os braços): as listras em pé e as deitadas
    for (const k of [-0.25, 0.25]) {
      r.caixa(0.1, h - 0.2, e, x + k * w, y + 0.1, z + d / 2, listra, 0);
      r.caixa(0.022, h - 0.2, e * 2, x + k * w + 0.085, y + 0.1, z + d / 2, fio, 0);
    }
    for (const k of [0.32, 0.68]) {
      r.caixa(w - 0.2, 0.1, e, x, y + h * k, z + d / 2, listra, 0);
      r.caixa(w - 0.2, 0.022, e * 2, x, y + h * k + 0.12, z + d / 2, fio, 0);
    }
  }
}

/** O sofá xadrez de três lugares (a almofada a 0,5 do chão), de pezinhos de madeira. */
function sofa(r: Ref): void {
  for (const x of [-1.5, 1.5])
    for (const z of [-0.38, 0.38]) r.caixa(0.08, 0.08, 0.08, x, 0, z, CASA.madeiraEscura, 0.01);
  r.caixa(3.3, 0.18, 1.0, 0, 0.07, 0, CASA.marrom, 0.04);
  // o encosto: a armação atrás e as três almofadas em pé
  r.caixa(3.3, 1.04, 0.16, 0, 0.07, -0.42, CASA.marrom, 0.05);
  for (const x of [-1.05, 0, 1.05]) {
    almofadaXadrez(r, 0.98, 0.25, 0.8, x, 0.24, 0.08, 'cima');
    almofadaXadrez(r, 0.98, 0.64, 0.24, x, 0.44, -0.24, 'frente');
  }
  // os braços (largos, de almofada)
  for (const s of [-1, 1]) almofadaXadrez(r, 0.28, 0.72, 1.0, s * 1.505, 0.07, 0, 'frente');
}

/** O abajur de pé: a base e a haste de latão e a cúpula creme (acende de noite, em casa.ts). */
function abajur(r: Ref): void {
  r.prisma(8, 0.22, 0.05, 0, 0.025, 0, CASA.latao, 'y');
  r.barra([0, 0.05, 0], [0, 1.28, 0], 0.045, CASA.latao);
  r.prisma(6, 0.27, 0.36, 0, 1.44, 0, '#f4e2b8', 'y');
  for (const y of [1.28, 1.6]) r.prisma(6, 0.285, 0.04, 0, y, 0, CASA.laranja, 'y');
}

/** A mesinha do telefone: madeira, uma gaveta, e a base vermelha com o disco creme (o fone mexe). */
function mesinhaDoTelefone(r: Ref): void {
  for (const x of [-0.24, 0.24])
    for (const z of [-0.24, 0.24]) r.caixa(0.06, 0.5, 0.06, x, 0, z, CASA.madeiraEscura, 0.01);
  r.caixa(0.62, 0.12, 0.62, 0, 0.5, 0, CASA.madeira, 0.03);
  r.caixa(0.36, 0.07, 0.02, 0, 0.52, 0.31, CASA.madeiraClara, 0.01);
  r.caixa(0.06, 0.02, 0.02, 0, 0.55, 0.325, CASA.latao, 0);
  // a base do telefone (dois degraus, mais baixa na frente) e o disco de furinhos
  r.caixa(0.36, 0.1, 0.28, 0, 0.62, -0.01, CASA.telefone, 0.04);
  r.caixa(0.34, 0.05, 0.16, 0, 0.7, -0.06, CASA.telefone, 0.025);
  r.prisma(12, 0.095, 0.02, 0, 0.725, 0.07, CASA.creme, 'y');
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 1.5 + 0.6;
    r.prisma(6, 0.014, 0.012, Math.cos(a) * 0.065, 0.738, 0.07 + Math.sin(a) * 0.065, COR.preto, 'y');
  }
  r.prisma(8, 0.03, 0.014, 0, 0.738, 0.07, CASA.telefone, 'y');
  // os dois apoios do fone
  for (const x of [-0.13, 0.13]) r.caixa(0.06, 0.05, 0.08, x, 0.75, -0.06, CASA.telefone, 0.02);
}

/**
 * O toca-discos: o móvel de madeira com as portinhas e os discos guardados, o tampo grafite com
 * o prato (gira em casa.ts) e as duas caixinhas de som no chão, dos lados.
 */
function tocaDiscos(r: Ref): void {
  for (const x of [-0.72, 0.72])
    for (const z of [-0.24, 0.24]) r.caixa(0.07, 0.08, 0.07, x, 0, z, CASA.madeiraEscura, 0.01);
  r.caixa(1.6, 0.66, 0.6, 0, 0.08, 0, CASA.madeira, 0.04);
  r.caixa(0.72, 0.5, 0.03, -0.38, 0.16, 0.3, CASA.madeiraClara, 0.02);
  r.caixa(0.04, 0.1, 0.03, -0.05, 0.38, 0.32, CASA.latao, 0.01);
  r.caixa(0.7, 0.5, 0.04, 0.4, 0.16, 0.28, CASA.madeiraEscura, 0.01);
  const capas = [CASA.mostarda, '#3a6ad0', COR.vermelho, CASA.creme, '#2a8a6a', CASA.mostarda];
  capas.forEach((cor, i) => r.caixa(0.035, 0.42, 0.4, 0.12 + i * 0.1, 0.18, 0.06, cor, 0.008));
  // o tampo, o feltro do prato, o pino do braço e os dois botões
  r.caixa(1.04, 0.07, 0.54, -0.18, 0.74, 0, COR.grafite, 0.02);
  r.prisma(16, 0.24, 0.02, PRATO[0], PRATO[1] - 0.02, PRATO[2], COR.preto, 'y');
  r.prisma(8, 0.05, 0.05, 0.18, 0.835, 0.16, COR.cromo, 'y');
  for (const x of [0.06, 0.18]) r.caixa(0.06, 0.03, 0.06, x, 0.81, -0.16, COR.cromo, 0.015);
  for (const s of [-1, 1]) {
    const x = s * 1.14;
    r.caixa(0.46, 0.8, 0.42, x, 0, 0, CASA.madeira, 0.03);
    r.caixa(0.4, 0.72, 0.02, x, 0.04, 0.21, '#3a2a22', 0.01);
    r.prisma(12, 0.15, 0.03, x, 0.3, 0.225, COR.preto, 'z');
    r.prisma(10, 0.06, 0.035, x, 0.3, 0.235, COR.grafite2, 'z');
    r.prisma(10, 0.06, 0.03, x, 0.6, 0.225, COR.preto, 'z');
  }
}

/**
 * As cortinas de uma janela de dois blocos (de dentro): o varão, dois panos de pregas em dois
 * tons presos com a faixa, abertos para a luz entrar. `n` escolhe a cor (a sala, o quarto).
 */
function cortina(r: Ref, n: number): void {
  const [claro, escuro] =
    n === 3 ? [CASA.azulQuarto, '#2f6ab8'] : [CASA.laranja, CASA.laranjaEscuro];
  // a janela fica de y 1 a 3 (os blocos 2 e 3), com 2 de largura
  r.barra([-1.42, 3.22, 0.1], [1.42, 3.22, 0.1], 0.045, CASA.madeiraEscura);
  for (const s of [-1, 1]) {
    r.caixa(0.08, 0.08, 0.08, s * 1.44, 3.18, 0.1, CASA.madeiraEscura, 0.02);
    for (let i = 0; i < 4; i++) {
      const x = s * (0.88 + i * 0.13);
      r.caixa(0.13, 2.5, 0.08 + (i % 2) * 0.04, x, 0.72, 0.1, i % 2 ? escuro : claro, 0.02);
    }
    r.caixa(0.56, 0.08, 0.16, s * 1.08, 1.7, 0.12, CASA.creme, 0.02);
  }
}

/** O tapete de quebra-cabeça (EVA): 4 × 4 placas em xadrez de três cores, com os dentinhos. */
function quebraCabeca(r: Ref): void {
  const cores = [CASA.vermelhoEva, CASA.azulEva, CASA.amareloEva];
  const cor = (i: number, j: number) => cores[(((i + 2 * j) % 3) + 3) % 3];
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      const x = -1.5 + i;
      const z = -1.5 + j;
      r.caixa(0.98, 0.04, 0.98, x, 0, z, cor(i, j), 0.006);
      // o dentinho que entra na vizinha (para o leste e para o sul)
      if (i < 3) r.caixa(0.14, 0.04, 0.2, x + 0.52, 0, z + (j % 2 ? 0.15 : -0.15), cor(i, j), 0.004);
      if (j < 3) r.caixa(0.2, 0.04, 0.14, x + (i % 2 ? -0.15 : 0.15), 0, z + 0.52, cor(i, j), 0.004);
    }
}

/** O suporte do ioiô: a base e o poste de madeira e o braço de onde ele pendura (o ioiô mexe). */
function suporteDoIoio(r: Ref): void {
  r.caixa(0.5, 0.06, 0.5, 0, 0, 0, CASA.madeiraClara, 0.02);
  r.caixa(0.08, 1.24, 0.08, 0, 0.06, -0.14, CASA.madeira, 0.015);
  r.caixa(0.08, 0.08, 0.42, 0, 1.22, 0.03, CASA.madeira, 0.015);
  r.caixa(0.05, 0.05, 0.05, 0, 1.18, 0.2, CASA.latao, 0.01);
}

/** O baú de brinquedos: azul de tampa amarela, a estrela na frente e a alça vermelha. */
function bau(r: Ref): void {
  r.caixa(0.92, 0.5, 0.58, 0, 0.02, 0, CASA.azulQuarto, 0.05);
  r.caixa(0.96, 0.13, 0.62, 0, 0.52, 0, CASA.amareloEva, 0.05);
  r.placa(perfilEstrela(0.15), 0.02, 0, 0.29, 0.295, CASA.amareloEva);
  r.caixa(0.2, 0.05, 0.05, 0, 0.6, 0.31, COR.vermelho, 0.02);
  for (const x of [-0.42, 0.42]) r.caixa(0.06, 0.48, 0.6, x, 0.03, 0, '#3a74c0', 0.02);
}

// ================================================================== a pista de skate

export function desenharPecaRampa(r: Ref, tipo: TipoPecaVila, n: number): boolean {
  switch (tipo) {
    case 'rampa-skate':
      rampa(r);
      return true;
    case 'suporte-skate':
      suporteDosSkates(r);
      return true;
    case 'bmx':
      bmx(r, n);
      return true;
    default:
      return false;
  }
}

const CONCRETO = '#9d9a93';
const CONCRETO_LADO = '#837f78';
/** O fundo plano, um tom abaixo das curvas (a divisa do U lê de longe). */
const CONCRETO_FUNDO = '#8b8780';
/** As pontas da rampa pintadas (o contorno do U). */
const PONTA_PINTADA = '#4f6f9a';
/** O grafite de formas (sem palavra): duas ou três cores por desenho. */
const GRAFITE = { rosa: '#ff5fa8', turquesa: '#22c2b0', amarelo: '#ffd23a', roxo: '#7a4ad8' };

/** O contorno de uma onda (três cristas) em volta do meio, `l` de largura e `a` de altura. */
function perfilOndas(l: number, a: number): Array<[number, number]> {
  const cima: Array<[number, number]> = [];
  const baixo: Array<[number, number]> = [];
  const N = 24;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = -l / 2 + t * l;
    const y = Math.sin(t * Math.PI * 3) * a * 0.32;
    cima.push([x, y + a * 0.18]);
    baixo.push([x, y - a * 0.18]);
  }
  return [...baixo, ...cima.reverse()];
}

/**
 * A mini rampa em U de concreto: as duas curvas (a superfície lisa, como a conta do trilho), os
 * decks em cima, a borda de cromo e o grafite de formas nas paredes de fora e nas pontas. O fundo
 * é o chão de concreto do bairro.
 */
function rampa(r: Ref): void {
  const m = MEDIDA_RAMPA;
  const L = COMPRIMENTO_RAMPA;
  const H = alturaDoDeck(m);
  const fora = m.meia + m.curva + m.deck;
  // o fundo de concreto (a mesma cor das curvas), com as juntas de través
  r.caixa(m.meia * 2 + 0.04, 0.02, L, 0, 0, 0, CONCRETO_FUNDO, 0);
  for (let k = -1; k <= 1; k++) r.caixa(m.meia * 2, 0.008, 0.05, 0, 0.02, k * 3, CONCRETO_LADO, 0);
  for (const s of [-1, 1]) {
    // a curva e o deck: o contorno no plano (de lado, altura), puxado ao longo da rampa
    // (`sub` girado: o z dele é o lado da rampa, o x dele corre ao longo)
    const lado = r.sub(0, 0, 0, s > 0 ? 1 : 3);
    const pts: Item[] = [{ x: m.meia - 0.01, y: 0 }];
    const N = 14;
    for (let i = 1; i <= N; i++) {
      const d = (i / N) * m.curva;
      pts.push({ x: m.meia + d, y: alturaNaRampa(m, m.meia + d), suave: i < N });
    }
    pts.push({ x: fora, y: H }, { x: fora, y: 0 });
    lado.perfil(pts, -L / 2, L / 2, 0, CONCRETO);
    // a beira de baixo de cada parede, mais escura (o rodapé)
    lado.caixa(L, 0.18, 0.04, 0, 0, fora + 0.01, CONCRETO_LADO, 0);
    // as juntas do concreto, de través, a cada três blocos
    for (let k = -1; k <= 1; k++)
      lado.caixa(0.04, 0.012, m.deck - 0.05, k * 3, H, fora - m.deck / 2, CONCRETO_LADO, 0);
    // a borda de cromo (redonda, como as de verdade) e a chapa do deck
    lado.prisma(10, 0.075, L, 0, H - 0.02, m.meia + m.curva - 0.04, COR.cromo, 'x');
    lado.caixa(L, 0.03, 0.42, 0, H - 0.01, m.meia + m.curva + 0.2, '#9a968e', 0);
  }
  // o grafite: nas paredes de fora (ondas grandes) e nas pontas (raio e estrela)
  for (const s of [-1, 1]) {
    const parede = r.sub(s * (fora + 0.02), 0, 0, s > 0 ? 1 : 3);
    parede.placa(perfilOndas(5.2, 1.0), 0.02, 0, H * 0.5, 0, s > 0 ? GRAFITE.turquesa : GRAFITE.rosa);
    parede.placa(perfilOndas(4.4, 0.55), 0.03, 0.4, H * 0.5, 0.005, GRAFITE.amarelo);
    parede.placa(perfilEstrela(0.32), 0.035, s > 0 ? -3.6 : 3.6, H * 0.52, 0.01, GRAFITE.amarelo);
  }
  // o contorno da curva, de lado (do pé ao deck), para pintar as pontas
  const contorno: Array<[number, number]> = [[m.meia, 0]];
  for (let i = 1; i <= 14; i++) {
    const d = (i / 14) * m.curva;
    contorno.push([m.meia + d, alturaNaRampa(m, m.meia + d)]);
  }
  contorno.push([fora, H], [fora, 0]);
  for (const pz of [-1, 1]) {
    for (const s of [-1, 1]) {
      // a ponta da rampa: pintada de azul (de longe, o U lê pelo contorno) e o desenho no meio
      // dele (de frente para quem chega)
      const ponta = r.sub(0, 0, pz * (L / 2 + 0.015), pz > 0 ? 0 : 2);
      const sg = s * pz;
      ponta.placa(
        contorno.map(([x, y]) => [sg * x, y] as [number, number]),
        0.012,
        0,
        0,
        -0.008,
        PONTA_PINTADA,
      );
      const x = s * pz * (m.meia + m.curva + 0.6);
      if (s * pz > 0) {
        ponta.placa(perfilRaio(0.95), 0.02, x, H * 0.55, 0, GRAFITE.amarelo);
        ponta.placa(perfilRaio(0.7), 0.03, x + 0.03, H * 0.55, 0.005, GRAFITE.rosa);
      } else {
        ponta.placa(perfilEstrela(0.42), 0.02, x, H * 0.5, 0, GRAFITE.turquesa);
        ponta.placa(perfilEstrela(0.22), 0.03, x, H * 0.5, 0.005, GRAFITE.amarelo);
      }
    }
  }
}

/** Um skate de pé no suporte (a prancha de frente, as rodas de lado). */
function skateDePe(r: Ref, x: number, cor: string, lista: string): void {
  r.caixa(0.27, 0.92, 0.05, x, 0.14, 0.02, cor, 0.04);
  r.caixa(0.06, 0.82, 0.008, x, 0.19, 0.047, lista, 0);
  for (const y of [0.3, 0.92]) {
    r.caixa(0.2, 0.05, 0.06, x, y, -0.04, COR.cromo, 0.01);
    for (const sx of [-0.11, 0.11]) r.roda(0.045, 0.05, x + sx, y + 0.025, -0.1, COR.amarelo, 'x');
  }
}

/** O suporte dos skates: a armação de madeira e três skates de pé (cada um de uma cor). */
function suporteDosSkates(r: Ref): void {
  for (const x of [-0.78, 0.78]) r.caixa(0.1, 1.32, 0.48, x, 0, 0, CASA.madeira, 0.02);
  r.caixa(1.66, 0.1, 0.5, 0, 0, 0, CASA.madeiraEscura, 0.02);
  r.caixa(1.66, 0.08, 0.12, 0, 1.22, -0.16, CASA.madeira, 0.02);
  r.caixa(1.66, 0.06, 0.1, 0, 0.62, -0.17, CASA.madeira, 0.02);
  skateDePe(r, -0.45, GRAFITE.turquesa, GRAFITE.amarelo);
  skateDePe(r, 0, GRAFITE.rosa, '#f6f4ee');
  skateDePe(r, 0.45, GRAFITE.amarelo, GRAFITE.rosa);
}

/** A BMX de enfeite (não se monta): rodas de raio grosso, o quadro e a placa sem número. */
function bmx(r: Ref, n: number): void {
  const cor = n % 2 ? GRAFITE.turquesa : '#2f8cff';
  const R = 0.32;
  for (const x of [-0.52, 0.52]) {
    r.roda(R, 0.09, x, R, 0, '#24232a', 'z');
    r.roda(R * 0.7, 0.1, x, R, 0, '#3a3944', 'z');
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI * 2) / 3 + 0.4;
      r.barra([x, R, 0], [x + Math.cos(a) * R * 0.68, R + Math.sin(a) * R * 0.68, 0], 0.05, COR.amarelo);
    }
    r.roda(0.06, 0.14, x, R, 0, COR.cromo, 'z');
  }
  const A: V3 = [-0.52, R, 0];
  const B: V3 = [-0.06, R - 0.02, 0];
  const C: V3 = [-0.18, 0.72, 0];
  const D: V3 = [0.3, 0.76, 0];
  const E: V3 = [0.52, R, 0];
  const t = 0.065;
  r.barra(A, B, t, cor);
  r.barra(B, C, t, cor);
  r.barra(A, C, t, cor);
  r.barra(C, D, t, cor);
  r.barra(B, D, t, cor);
  r.barra(D, E, t, COR.cromo);
  // o guidão alto com a almofada e os punhos, o banco baixo
  r.barra(D, [0.26, 1.06, 0], t, COR.cromo);
  r.caixa(0.06, 0.06, 0.6, 0.26, 1.04, 0, COR.cromo, 0);
  r.caixa(0.1, 0.1, 0.24, 0.26, 1.03, 0, GRAFITE.amarelo, 0.03);
  for (const z of [-0.26, 0.26]) r.caixa(0.08, 0.08, 0.1, 0.26, 1.03, z, COR.preto, 0.02);
  r.caixa(0.28, 0.07, 0.15, -0.22, 0.8, 0, COR.preto, 0.03);
  // a placa da frente, redonda, com um raio (sem número)
  r.caixa(0.04, 0.24, 0.3, 0.33, 0.84, 0, COR.branco, 0.06);
  r.sub(0.36, 0, 0, 1).placa(perfilRaio(0.2), 0.012, 0, 0.96, 0, GRAFITE.rosa);
  // o pezinho (descansa em pé, um pouco de lado)
  r.barra(B, [-0.12, 0.0, 0.2], 0.035, COR.cromo);
}
