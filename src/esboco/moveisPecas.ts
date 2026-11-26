/**
 * Esboço da spec 039 "Móveis e utensílios": o desenho de cada móvel (só com `?esboco=moveis`).
 *
 * Peças de brinquedo, quadradas e de quina macia, no mesmo traço das peças da Casa anos 80
 * (`render/vila/pecasCasa.ts`) e com as mesmas ferramentas (`Ref`: caixa, barra, prisma, placa).
 * Tudo inventado aqui, sem marca: duas ou três cores por móvel, nada de arco-íris.
 *
 * Coordenadas de cada móvel: a origem no meio do pé dele, no chão; x para a direita de quem olha a
 * frente, y para cima, z para a frente. Uma célula é um bloco. O que mexe ao toque (a porta da
 * geladeira, o cobertor, a tampa da panela, as notinhas do som) vai numa `parte`, desenhada no
 * referencial dela (o pivô na origem) e montada pelo palco (`moveis.ts`).
 */
import { perfilEstrela, type Ref } from '../render/vila/ref';
import type { V3 } from '../render/solidos';

/** A paleta da casinha (madeira de mel, creme, coral, menta, azul e manteiga). */
export const M = {
  mel: '#c98a4e',
  melClaro: '#dfab6e',
  melEscuro: '#8a5530',
  cabeceira: '#8a5a34',
  creme: '#f6eedd',
  branco: '#fbf8f1',
  lencol: '#f4efe6',
  coral: '#ef7b63',
  coralEscuro: '#cf5c47',
  cobertor: '#d9504a',
  cobertorEscuro: '#b9403b',
  menta: '#8fd1b5',
  mentaEscura: '#62ae92',
  azul: '#7fb0e4',
  azulEscuro: '#4f7fbf',
  azulNoite: '#3c5a9a',
  manteiga: '#f5d06a',
  grafite: '#3a3944',
  preto: '#24232a',
  cromo: '#d4d8e2',
  vidro: '#26313b',
  quente: '#ffe2a0',
  chama: '#ffa64a',
} as const;

export type TipoMovel =
  | 'sofa'
  | 'tv'
  | 'som'
  | 'tapete'
  | 'abajur'
  | 'fogao'
  | 'geladeira'
  | 'pia'
  | 'mesa'
  | 'cadeira'
  | 'cama'
  | 'guarda-roupa'
  | 'criado-mudo';

/** O que o palco oferece ao desenho de um móvel. */
export interface Oficina {
  /** O corpo parado do móvel. */
  r: Ref;
  /** Uma parte que mexe, com o pivô em `pivo` (local do móvel), girada `quartos` a mais. */
  parte(nome: string, pivo: V3, desenhar: (r: Ref) => void, opcoes?: { agua?: boolean }): void;
  /** A tela da TV (o meio dela, local do móvel, e o tamanho). */
  tela(meio: V3, w: number, h: number): void;
}

/** Tamanho de cada móvel em células (largura em x, fundo em z, altura em y). */
export const CELULAS: Record<TipoMovel, [number, number, number]> = {
  sofa: [2, 1, 1],
  tv: [2, 1, 2],
  som: [1, 1, 1],
  tapete: [3, 2, 0],
  abajur: [1, 1, 2],
  fogao: [1, 1, 1],
  geladeira: [1, 1, 2],
  pia: [1, 1, 2],
  mesa: [2, 1, 1],
  cadeira: [1, 1, 1],
  cama: [1, 2, 1],
  'guarda-roupa': [2, 1, 2],
  'criado-mudo': [1, 1, 1],
};

/**
 * A escala de cada móvel na segunda volta (a conta de proporção com o boneco, no estudo): x, y, z
 * sobre o desenho da primeira volta. Cabe sempre nas células do móvel.
 */
export const ESCALA: Record<TipoMovel, [number, number, number]> = {
  sofa: [1, 1.3, 1.1],
  tv: [1.05, 1.25, 1.1],
  som: [1.15, 1.2, 1.15],
  tapete: [1, 1, 1],
  abajur: [1.2, 1.25, 1.2],
  fogao: [1.1, 1.15, 1.1],
  geladeira: [1.08, 1.07, 1.05],
  pia: [1.05, 1.15, 1.05],
  mesa: [1.05, 1.2, 1.1],
  cadeira: [1.2, 1.2, 1.2],
  cama: [1, 1.25, 1.03],
  'guarda-roupa': [1.05, 1, 1.1],
  'criado-mudo': [1.2, 1.3, 1.2],
};

export function desenharMovel(o: Oficina, tipo: TipoMovel, versao: 'a' | 'b'): void {
  switch (tipo) {
    case 'sofa':
      return versao === 'a' ? sofaGordinho(o.r) : sofaDeBlocos(o.r);
    case 'tv':
      return versao === 'a' ? tvDeRack(o) : tvDePezinhos(o);
    case 'som':
      return som(o);
    case 'tapete':
      return tapetePista(o);
    case 'abajur':
      return abajur(o);
    case 'fogao':
      return fogao(o);
    case 'geladeira':
      return geladeira(o);
    case 'pia':
      return pia(o);
    case 'mesa':
      return mesa(o);
    case 'cadeira':
      return cadeira(o.r);
    case 'cama':
      return versao === 'a' ? camaDoIcone(o) : camaDeEstrelas(o);
    case 'guarda-roupa':
      return guardaRoupa(o);
    case 'criado-mudo':
      return criadoMudo(o);
  }
}

// ================================================================== a sala

/** Sofá A (recomendado): gordinho de almofadas, coral, com o rolo nos braços e os botõezinhos. */
function sofaGordinho(r: Ref): void {
  for (const x of [-0.84, 0.84])
    for (const z of [-0.32, 0.32]) r.caixa(0.1, 0.1, 0.1, x, 0, z, M.melEscuro, 0.02);
  r.caixa(1.96, 0.2, 0.9, 0, 0.09, 0, M.coralEscuro, 0.06);
  // o encosto: a armação atrás e as duas almofadas em pé, com três botões cada
  r.caixa(1.96, 0.95, 0.24, 0, 0.09, -0.33, M.coralEscuro, 0.1);
  for (const x of [-0.42, 0.42]) {
    r.caixa(0.8, 0.22, 0.7, x, 0.27, 0.08, M.coral, 0.1);
    r.caixa(0.8, 0.58, 0.22, x, 0.45, -0.18, M.coral, 0.11);
    for (const dx of [-0.22, 0, 0.22]) r.caixa(0.05, 0.05, 0.03, x + dx, 0.76, -0.07, M.creme, 0.02);
    // o vivo creme na frente do assento
    r.caixa(0.7, 0.03, 0.02, x, 0.38, 0.43, M.creme, 0);
  }
  // os braços: o bloco e o rolo redondo em cima
  for (const s of [-1, 1]) {
    r.caixa(0.2, 0.52, 0.88, s * 0.88, 0.09, 0, M.coral, 0.08);
    r.prisma(10, 0.14, 0.9, s * 0.88, 0.64, 0, M.coral, 'z');
    r.prisma(10, 0.085, 0.92, s * 0.88, 0.64, 0, M.coralEscuro, 'z');
  }
  // a almofadinha manteiga no canto
  r.caixa(0.34, 0.32, 0.12, -0.6, 0.48, -0.05, M.manteiga, 0.07);
  r.caixa(0.06, 0.06, 0.02, -0.6, 0.62, 0.015, M.creme, 0.02);
}

/** Sofá B: de blocos, menta, baixo, com o encosto capitonê e os pés redondos. */
function sofaDeBlocos(r: Ref): void {
  for (const x of [-0.82, 0.82])
    for (const z of [-0.3, 0.3]) r.prisma(8, 0.06, 0.12, x, 0.06, z, M.creme, 'y');
  r.caixa(1.94, 0.16, 0.88, 0, 0.12, 0, M.mentaEscura, 0.04);
  r.caixa(1.5, 0.2, 0.74, 0, 0.28, 0.06, M.menta, 0.06);
  // o encosto de quatro blocos com o capitonê (os botões em grade)
  for (let i = 0; i < 4; i++) {
    const x = -0.72 + i * 0.48;
    r.caixa(0.46, 0.66, 0.2, x, 0.28, -0.32, M.menta, 0.05);
    for (const [dx, y] of [
      [-0.11, 0.52],
      [0.11, 0.52],
      [0, 0.72],
    ] as const)
      r.caixa(0.04, 0.04, 0.02, x + dx, y, -0.215, M.mentaEscura, 0.015);
  }
  // os braços quadrados, mais baixos que o encosto
  for (const s of [-1, 1]) r.caixa(0.2, 0.42, 0.88, s * 0.87, 0.28, 0, M.mentaEscura, 0.05);
  r.caixa(0.34, 0.3, 0.12, 0.55, 0.48, -0.15, M.creme, 0.07);
}

/**
 * TV A (recomendada): a tela larga de moldura azul gordinha, no rack de madeira de duas portas;
 * os dois alto-falantes redondos do lado e o botão de ligar coral.
 */
function tvDeRack(o: Oficina): void {
  const r = o.r;
  for (const x of [-0.82, 0.82])
    for (const z of [-0.18, 0.18]) r.caixa(0.08, 0.08, 0.08, x, 0, z, M.melEscuro, 0.02);
  r.caixa(1.84, 0.46, 0.5, 0, 0.08, 0, M.mel, 0.05);
  for (const s of [-1, 1]) {
    r.caixa(0.86, 0.36, 0.03, s * 0.45, 0.13, 0.255, M.melClaro, 0.02);
    r.prisma(8, 0.03, 0.03, s * 0.09, 0.31, 0.28, M.melEscuro, 'z');
  }
  // o pé e a tela
  r.caixa(0.4, 0.04, 0.24, 0, 0.54, -0.02, M.grafite, 0.015);
  r.caixa(0.12, 0.1, 0.06, 0, 0.58, -0.04, M.grafite, 0.01);
  r.caixa(1.36, 0.86, 0.14, 0, 0.66, -0.02, M.azul, 0.09);
  r.caixa(1.12, 0.64, 0.02, 0, 0.75, 0.055, M.vidro, 0.02);
  o.tela([0, 1.07, 0.067], 1.08, 0.6);
  // os alto-falantes do lado e o botão de ligar embaixo da tela
  for (const s of [-1, 1]) {
    r.prisma(10, 0.13, 0.1, s * 0.82, 0.92, -0.02, M.azulEscuro, 'z');
    r.prisma(10, 0.09, 0.11, s * 0.82, 0.92, -0.02, M.grafite, 'z');
  }
  r.prisma(10, 0.035, 0.03, 0.5, 0.7, 0.06, M.coral, 'z');
  // o controle remoto no rack
  r.caixa(0.1, 0.03, 0.26, 0.62, 0.54, 0.12, M.grafite, 0.015);
  r.caixa(0.04, 0.012, 0.04, 0.62, 0.57, 0.04, M.coral, 0.01);
}

/** TV B: a TV caixote manteiga de pezinhos abertos, com os dois botões redondos do lado. */
function tvDePezinhos(o: Oficina): void {
  const r = o.r;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) r.barra([sx * 0.3, 0.42, sz * 0.18], [sx * 0.4, 0, sz * 0.26], 0.06, M.melEscuro);
  r.caixa(0.86, 0.06, 0.5, 0, 0.38, 0, M.melEscuro, 0.02);
  r.caixa(1.0, 0.82, 0.62, 0, 0.44, 0, M.manteiga, 0.13);
  r.caixa(0.7, 0.58, 0.02, -0.1, 0.56, 0.31, M.vidro, 0.06);
  o.tela([-0.1, 0.85, 0.322], 0.66, 0.54);
  for (const y of [1.06, 0.88]) {
    r.prisma(10, 0.06, 0.04, 0.36, y, 0.31, M.coral, 'z');
    r.caixa(0.016, 0.06, 0.02, 0.36, y - 0.01, 0.33, M.creme, 0);
  }
  for (let i = 0; i < 4; i++) r.caixa(0.12, 0.016, 0.02, 0.36, 0.56 + i * 0.05, 0.31, M.melEscuro, 0);
}

/**
 * O aparelho de som: a caixinha manteiga com a alça, os dois alto-falantes (os cones pulam com a
 * música), o botão grande de tocar em cima e as três notinhas que sobem quando toca.
 */
function som(o: Oficina): void {
  const r = o.r;
  r.caixa(0.66, 0.05, 0.36, 0, 0, 0, M.grafite, 0.02);
  r.caixa(0.78, 0.96, 0.44, 0, 0.05, 0, M.manteiga, 0.08);
  for (const y of [0.3, 0.74]) {
    r.prisma(14, 0.2, 0.04, 0, y, 0.215, M.grafite, 'z');
    o.parte(`cone${y > 0.5 ? 1 : 0}`, [0, y, 0.235], (p) => {
      p.prisma(14, 0.15, 0.03, 0, 0, 0, M.preto, 'z');
      p.prisma(10, 0.06, 0.05, 0, 0, 0.01, M.cromo, 'z');
    });
  }
  // o botão de tocar e a luzinha
  r.prisma(12, 0.09, 0.05, 0.16, 1.03, 0.02, M.coral, 'y');
  r.caixa(0.2, 0.06, 0.02, -0.17, 0.92, 0.22, M.grafite, 0.01);
  o.parte('luzSom', [-0.17, 0.935, 0.232], (p) => p.luz(0.16, 0.03, 0.01, 0, 0, 0, M.menta));
  // a alça
  for (const x of [-0.28, 0.28]) r.barra([x, 1.0, -0.06], [x, 1.16, -0.06], 0.05, M.grafite);
  r.caixa(0.62, 0.05, 0.06, 0, 1.14, -0.06, M.grafite, 0.02);
  // as notinhas (a colcheia de blocos: a cabeça, a haste e a bandeirinha)
  for (let i = 0; i < 3; i++)
    o.parte(`nota${i}`, [0, 1.1, 0.1], (p) => {
      const cor = i === 1 ? M.coral : M.azulEscuro;
      p.caixa(0.12, 0.09, 0.05, 0, 0, 0, cor, 0.035);
      p.caixa(0.03, 0.22, 0.03, 0.045, 0.05, 0, cor, 0);
      p.caixa(0.08, 0.04, 0.03, 0.08, 0.24, 0, cor, 0.01);
    });
}

/** O tapete de pista (3 × 2): o gramadinho menta, a estrada em volta e o carrinho que dá a volta. */
function tapetePista(o: Oficina): void {
  const r = o.r;
  const L = 2.9;
  const P = 1.9;
  r.caixa(L, 0.02, P, 0, 0, 0, M.menta, 0);
  for (const s of [-1, 1]) {
    r.caixa(L, 0.012, 0.08, 0, 0.02, s * (P / 2 - 0.04), M.creme, 0);
    r.caixa(0.08, 0.012, P, s * (L / 2 - 0.04), 0.02, 0, M.creme, 0);
  }
  // a estrada: um anel de cantos em degrau, com a faixa tracejada
  const a = 1.1;
  const b = 0.62;
  const larg = 0.26;
  for (const s of [-1, 1]) {
    r.caixa(2 * a - 0.2, 0.01, larg, 0, 0.02, s * b, M.grafite, 0);
    r.caixa(larg, 0.01, 2 * b - 0.2, s * a, 0.02, 0, M.grafite, 0);
    r.caixa(0.2, 0.01, 0.2, s * (a - 0.12), 0.02, b - 0.12, M.grafite, 0);
    r.caixa(0.2, 0.01, 0.2, s * (a - 0.12), 0.02, -b + 0.12, M.grafite, 0);
    for (let i = -3; i <= 3; i++) r.caixa(0.12, 0.012, 0.03, i * 0.26, 0.026, s * b, M.creme, 0);
    for (let i = -1; i <= 1; i++) r.caixa(0.03, 0.012, 0.12, s * a, 0.026, i * 0.3, M.creme, 0);
  }
  // a casinha e as arvorezinhas no miolo (pintadas, rentes ao tapete)
  r.caixa(0.3, 0.012, 0.24, -0.3, 0.02, 0, M.manteiga, 0);
  r.caixa(0.34, 0.014, 0.1, -0.3, 0.02, -0.14, M.coral, 0);
  for (const [x, z] of [
    [0.25, 0.1],
    [0.5, -0.12],
  ] as const)
    r.prisma(8, 0.1, 0.012, x, 0.026, z, M.mentaEscura, 'y');
  // o carrinho (o pivô no meio dele; o palco o leva pela estrada)
  o.parte('carrinho', [0, 0.02, b], (p) => {
    p.caixa(0.3, 0.08, 0.16, 0, 0.03, 0, M.coral, 0.03);
    p.caixa(0.15, 0.07, 0.14, -0.02, 0.11, 0, M.creme, 0.025);
    for (const x of [-0.09, 0.09])
      for (const z of [-0.085, 0.085]) p.prisma(8, 0.035, 0.03, x, 0.035, z, M.grafite, 'z');
  });
}

/** O abajur de pé: a base e a haste de mel e a cúpula de gomos menta (acesa, fica morna). */
function abajur(o: Oficina): void {
  const r = o.r;
  r.prisma(8, 0.17, 0.06, 0, 0.03, 0, M.melEscuro, 'y');
  r.barra([0, 0.06, 0], [0, 1.08, 0], 0.05, M.creme);
  const cupula = (p: Ref, cor: string, escura: string, luz: boolean) => {
    p.prisma(8, 0.27, 0.12, 0, 0.06, 0, cor, 'y', luz);
    p.prisma(8, 0.24, 0.12, 0, 0.18, 0, cor, 'y', luz);
    p.prisma(8, 0.2, 0.1, 0, 0.29, 0, cor, 'y', luz);
    p.prisma(8, 0.285, 0.03, 0, 0.0, 0, escura, 'y');
    p.prisma(6, 0.04, 0.05, 0, 0.36, 0, escura, 'y');
  };
  o.parte('cupula', [0, 1.06, 0], (p) => cupula(p, M.menta, M.mentaEscura, false));
  o.parte('cupulaAcesa', [0, 1.06, 0], (p) => cupula(p, M.quente, M.mentaEscura, true));
}

// ================================================================== a cozinha

/** O fogão creme: o forno de janelinha, quatro bocas (acendem em anel) e a panela coral. */
function fogao(o: Oficina): void {
  const r = o.r;
  r.caixa(0.84, 0.05, 0.56, 0, 0, 0, M.grafite, 0.02);
  r.caixa(0.9, 0.84, 0.62, 0, 0.05, 0, M.creme, 0.06);
  r.caixa(0.72, 0.46, 0.03, 0, 0.12, 0.31, M.branco, 0.03);
  r.caixa(0.5, 0.24, 0.02, 0, 0.22, 0.33, M.vidro, 0.03);
  r.barra([-0.26, 0.62, 0.36], [0.26, 0.62, 0.36], 0.035, M.cromo);
  for (const x of [-0.3, -0.1, 0.1, 0.3]) r.prisma(10, 0.04, 0.04, x, 0.76, 0.33, M.coral, 'z');
  r.caixa(0.9, 0.2, 0.06, 0, 0.89, -0.28, M.creme, 0.03);
  const bocas: Array<[number, number]> = [
    [-0.2, -0.12],
    [0.2, -0.12],
    [-0.2, 0.14],
    [0.2, 0.14],
  ];
  for (const [x, z] of bocas) {
    r.prisma(12, 0.11, 0.02, x, 0.9, z, M.grafite, 'y');
    r.prisma(12, 0.06, 0.024, x, 0.9, z, M.preto, 'y');
  }
  // o anel aceso (de brinquedo, laranja manso; sem chama de verdade)
  o.parte('bocas', [0, 0.912, 0], (p) => {
    for (const [x, z] of bocas)
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        p.luz(0.035, 0.008, 0.035, x + Math.cos(a) * 0.085, 0, z + Math.sin(a) * 0.085, M.chama);
      }
  });
  // a panela na boca da frente e a tampa que pula; o vapor de cubinhos
  r.prisma(12, 0.15, 0.14, 0.2, 0.98, 0.14, M.coral, 'y');
  r.caixa(0.08, 0.03, 0.04, 0.2 + 0.19, 1.0, 0.14, M.coralEscuro, 0.01);
  o.parte('tampa', [0.2, 1.05, 0.14], (p) => {
    p.prisma(12, 0.16, 0.025, 0, 0.012, 0, M.coralEscuro, 'y');
    p.prisma(8, 0.035, 0.04, 0, 0.04, 0, M.creme, 'y');
  });
  for (let i = 0; i < 3; i++)
    o.parte(`vapor${i}`, [0.2, 1.1, 0.14], (p) => p.caixa(0.09, 0.09, 0.09, 0, 0, 0, M.branco, 0.04));
}

/**
 * A geladeira menta de duas portas (2 de altura): a de baixo abre na dobradiça da direita e mostra
 * a luz de dentro, as prateleiras e a comidinha.
 */
function geladeira(o: Oficina): void {
  const r = o.r;
  const W = 0.9;
  const D = 0.68;
  const A = 1.86;
  // a caixa aberta na frente: o fundo, os lados, o alto e o rodapé
  r.caixa(W, 0.1, D, 0, 0, 0, M.mentaEscura, 0.03);
  for (const s of [-1, 1]) r.caixa(0.06, A - 0.1, D, s * (W / 2 - 0.03), 0.1, 0, M.menta, 0.03);
  r.caixa(W, 0.06, D, 0, A - 0.06, 0, M.menta, 0.04);
  r.caixa(W - 0.12, A - 0.16, 0.05, 0, 0.1, -D / 2 + 0.025, M.menta, 0.01);
  // a divisória do congelador
  r.caixa(W - 0.12, 0.05, D - 0.06, 0, 1.36, 0.0, M.menta, 0.01);
  // dentro: o forro claro (aceso quando a porta abre), as prateleiras e a comida
  r.caixa(W - 0.13, 1.24, 0.02, 0, 0.11, -D / 2 + 0.06, M.branco, 0);
  o.parte('luzDentro', [0, 0.11, -D / 2 + 0.072], (p) => p.luz(W - 0.16, 1.22, 0.005, 0, 0, 0, '#eef8ff'));
  for (const y of [0.52, 0.94]) r.caixa(W - 0.13, 0.025, D - 0.14, 0, y, -0.02, M.branco, 0.005);
  // a comidinha desenhada (some quando a geladeira mostra a comida guardada de verdade)
  o.parte('comidinha', [0, 0, 0], (r) => {
    // prateleira de baixo: a garrafa de leite e a caixinha de suco
    r.prisma(8, 0.07, 0.26, -0.22, 0.27, -0.05, M.branco, 'y');
    r.prisma(8, 0.05, 0.06, -0.22, 0.42, -0.05, M.azulEscuro, 'y');
    r.caixa(0.14, 0.22, 0.1, 0.0, 0.14, -0.06, '#f29a3a', 0.02);
    r.caixa(0.14, 0.05, 0.101, 0.0, 0.24, -0.06, M.branco, 0);
    r.prisma(8, 0.05, 0.16, 0.22, 0.22, -0.04, M.coral, 'y');
    // do meio: a fatia de bolo e as frutinhas
    r.caixa(0.2, 0.12, 0.16, -0.18, 0.545, -0.04, M.creme, 0.02);
    r.caixa(0.2, 0.035, 0.16, -0.18, 0.665, -0.04, '#f2a6b8', 0.015);
    r.caixa(0.04, 0.04, 0.04, -0.18, 0.7, -0.04, M.coralEscuro, 0.015);
    for (const [x, z] of [
      [0.12, -0.02],
      [0.2, -0.08],
      [0.24, 0.02],
      [0.16, 0.06],
    ] as const)
      r.prisma(8, 0.045, 0.07, x, 0.58, z, '#d8343a', 'y');
    // de cima: a manteiga e os ovinhos
    r.caixa(0.22, 0.04, 0.14, 0.12, 0.965, -0.04, M.branco, 0.015);
    for (const x of [0.06, 0.12, 0.18]) r.prisma(8, 0.03, 0.07, x, 1.03, -0.04, M.creme, 'y');
    r.caixa(0.16, 0.08, 0.1, -0.18, 0.965, -0.04, M.manteiga, 0.02);
  });
  // as portas: a do congelador (fica fechada) e a grande, com o pivô na dobradiça da direita
  r.caixa(W, 0.46, 0.08, 0, 1.4, D / 2 + 0.04, M.menta, 0.05);
  r.barra([-W / 2 + 0.1, 1.48, D / 2 + 0.1], [-W / 2 + 0.1, 1.72, D / 2 + 0.1], 0.04, M.cromo);
  o.parte('porta', [W / 2, 0.1, D / 2], (p) => {
    p.caixa(W, 1.26, 0.08, -W / 2, 0, 0.04, M.menta, 0.05);
    p.barra([-W + 0.1, 0.84, 0.1], [-W + 0.1, 1.14, 0.1], 0.04, M.cromo);
    for (const y of [0.84, 1.14]) p.caixa(0.04, 0.04, 0.04, -W + 0.1, y - 0.02, 0.085, M.cromo, 0);
    // o lado de dentro da porta: as duas caixinhas de porta
    for (const y of [0.28, 0.72]) {
      p.caixa(W - 0.2, 0.12, 0.08, -W / 2, y, -0.04, M.branco, 0.02);
      p.prisma(8, 0.035, 0.14, -W / 2 - 0.15 + (y > 0.5 ? 0.2 : 0), y + 0.16, -0.04, y > 0.5 ? M.manteiga : M.coral, 'y');
    }
  });
}

/** A pia: o armário de portinhas menta, o tampo branco, a cuba e a torneira (a água cai ao toque). */
function pia(o: Oficina): void {
  const r = o.r;
  r.caixa(0.84, 0.06, 0.56, 0, 0, -0.02, M.grafite, 0.02);
  r.caixa(0.9, 0.8, 0.6, 0, 0.06, -0.02, M.creme, 0.04);
  for (const s of [-1, 1]) {
    r.caixa(0.41, 0.62, 0.03, s * 0.215, 0.14, 0.29, M.menta, 0.03);
    r.prisma(8, 0.025, 0.03, s * 0.06, 0.62, 0.31, M.cromo, 'z');
  }
  r.caixa(0.96, 0.06, 0.66, 0, 0.86, 0, M.branco, 0.03);
  // a cuba: o fundo cinza azulado e a borda de cromo
  r.caixa(0.52, 0.012, 0.36, 0, 0.92, 0.04, '#a8bccb', 0);
  for (const s of [-1, 1]) {
    r.caixa(0.56, 0.025, 0.03, 0, 0.92, 0.04 + s * 0.195, M.cromo, 0);
    r.caixa(0.03, 0.025, 0.36, s * 0.275, 0.92, 0.04, M.cromo, 0);
  }
  r.caixa(0.08, 0.012, 0.08, 0, 0.933, 0.04, M.grafite, 0.01);
  // a torneira curva e os dois registros
  r.barra([0, 0.92, -0.22], [0, 1.2, -0.22], 0.05, M.cromo);
  r.barra([0, 1.2, -0.22], [0, 1.2, -0.04], 0.05, M.cromo);
  r.caixa(0.06, 0.06, 0.06, 0, 1.12, -0.04, M.cromo, 0.015);
  for (const s of [-1, 1]) {
    r.prisma(8, 0.035, 0.05, s * 0.14, 0.97, -0.22, M.cromo, 'y');
    r.caixa(0.04, 0.03, 0.03, s * 0.14, 1.0, -0.22, s < 0 ? M.azulEscuro : M.coral, 0.01);
  }
  // a parede de azulejo atrás (metade da altura do bloco de cima)
  r.caixa(0.96, 0.4, 0.04, 0, 0.92, -0.31, M.branco, 0.01);
  for (let i = 0; i < 4; i++)
    for (let k = 0; k < 2; k++)
      if ((i + k) % 2 === 0) r.caixa(0.2, 0.17, 0.012, -0.33 + i * 0.22, 0.95 + k * 0.19, -0.288, M.azul, 0);
  o.parte('agua', [0, 1.11, -0.04], (p) => p.caixa(0.06, 0.19, 0.06, 0, -0.19, 0, '#5fb8f6', 0.02), { agua: true });
  // as bolhinhas na cuba quando a água cai (cubinhos de quina bem redonda)
  o.parte('bolhas', [0, 0.935, 0.04], (p) => {
    for (const [x, z, k] of [
      [-0.07, 0.03, 0.05],
      [0.05, -0.06, 0.04],
      [0.11, 0.07, 0.035],
      [-0.14, -0.07, 0.03],
      [0.0, 0.1, 0.03],
      [0.16, -0.02, 0.025],
    ] as const)
      p.caixa(k, k, k, x, 0, z, '#e8f6ff', k * 0.45);
  });
}

/** A mesa de duas células: mel, com a toalha xadrez coral; ao toque, os pratinhos e os copos. */
function mesa(o: Oficina): void {
  const r = o.r;
  for (const x of [-0.8, 0.8])
    for (const z of [-0.32, 0.32]) r.caixa(0.1, 0.7, 0.1, x, 0, z, M.melEscuro, 0.02);
  r.caixa(1.84, 0.08, 0.84, 0, 0.7, 0, M.mel, 0.04);
  // a toalha xadrez (coral e creme), com a barra caindo na frente e atrás
  const n = 8;
  const m = 4;
  const lx = 1.4 / n;
  const lz = 0.84 / m;
  for (let i = 0; i < n; i++)
    for (let k = 0; k < m; k++)
      r.caixa(lx, 0.012, lz, -0.7 + (i + 0.5) * lx, 0.78, -0.42 + (k + 0.5) * lz, (i + k) % 2 ? M.coral : M.creme, 0);
  for (const s of [-1, 1]) r.caixa(1.4, 0.12, 0.012, 0, 0.67, s * 0.426, M.coral, 0);
  o.parte('pratos', [0, 0.792, 0], (p) => {
    for (const x of [-0.45, 0.45]) {
      p.prisma(12, 0.16, 0.02, x, 0.01, 0.12, M.branco, 'y');
      p.prisma(12, 0.1, 0.022, x, 0.012, 0.12, M.creme, 'y');
      p.prisma(8, 0.045, 0.14, x + 0.22, 0.07, -0.08, M.azul, 'y');
    }
    // a fruteira no meio
    p.prisma(10, 0.15, 0.08, 0, 0.04, -0.1, M.creme, 'y');
    for (const [x, z, c] of [
      [-0.05, -0.12, '#d8343a'],
      [0.06, -0.08, M.manteiga],
      [0.0, -0.02, '#d8343a'],
    ] as const)
      p.prisma(8, 0.055, 0.1, x, 0.12, z, c, 'y');
  });
}

/** A cadeira de madeira com a almofada coral e o encosto de duas travessas. */
function cadeira(r: Ref): void {
  for (const x of [-0.2, 0.2])
    for (const z of [-0.18, 0.18]) r.caixa(0.06, 0.42, 0.06, x, 0, z, M.melEscuro, 0.015);
  r.caixa(0.5, 0.06, 0.46, 0, 0.42, 0, M.mel, 0.025);
  r.caixa(0.42, 0.05, 0.4, 0, 0.48, 0.01, M.coral, 0.04);
  for (const x of [-0.21, 0.21]) r.caixa(0.06, 0.56, 0.06, x, 0.48, -0.2, M.melEscuro, 0.015);
  r.caixa(0.5, 0.14, 0.05, 0, 0.88, -0.2, M.mel, 0.03);
  r.caixa(0.42, 0.06, 0.04, 0, 0.66, -0.2, M.mel, 0.015);
}

// ================================================================== o quarto

/**
 * Cama A (recomendada), a do ícone da barra: dois blocos de comprimento, a cabeceira de madeira
 * escura em degrau, o colchão claro, o lençol dobrado, o travesseiro gordinho e o cobertor
 * vermelho de retalhos. O cobertor é uma parte: com a criança deitada, ele sobe por cima dela.
 */
function camaDoIcone(o: Oficina): void {
  const r = o.r;
  for (const x of [-0.44, 0.44])
    for (const z of [-0.9, 0.9]) r.caixa(0.12, 0.14, 0.12, x, 0, z, M.melEscuro, 0.02);
  for (const s of [-1, 1]) r.caixa(0.08, 0.2, 1.84, s * 0.46, 0.12, 0, M.mel, 0.03);
  r.caixa(0.86, 0.08, 1.82, 0, 0.16, 0, M.melClaro, 0.02);
  // a cabeceira: a tábua alta em degrau e os dois postes com a bolinha
  r.caixa(0.92, 0.88, 0.1, 0, 0.06, -0.95, M.cabeceira, 0.04);
  r.caixa(0.7, 0.08, 0.1, 0, 0.94, -0.95, M.cabeceira, 0.03);
  r.caixa(0.4, 0.06, 0.1, 0, 1.02, -0.95, M.cabeceira, 0.02);
  for (const s of [-1, 1]) {
    r.caixa(0.12, 1.0, 0.14, s * 0.47, 0, -0.95, M.mel, 0.03);
    r.caixa(0.15, 0.1, 0.17, s * 0.47, 1.0, -0.95, M.mel, 0.05);
  }
  r.caixa(0.5, 0.2, 0.02, 0, 0.6, -0.895, M.melClaro, 0.02);
  // a pezeira, baixa
  r.caixa(0.92, 0.44, 0.08, 0, 0.06, 0.96, M.cabeceira, 0.03);
  for (const s of [-1, 1]) r.caixa(0.12, 0.54, 0.12, s * 0.47, 0, 0.96, M.mel, 0.03);
  // o colchão, o lençol e o travesseiro
  r.caixa(0.86, 0.2, 1.8, 0, 0.24, 0, M.lencol, 0.07);
  r.caixa(0.72, 0.15, 0.36, 0, 0.44, -0.66, '#ffffff', 0.08);
  o.parte('cobertor', [0, 0.44, 0.3], (p) => {
    p.caixa(0.92, 0.07, 1.22, 0, 0, 0, M.cobertor, 0.04);
    // a dobra do lençol por cima, na ponta da cabeceira
    p.caixa(0.92, 0.06, 0.16, 0, 0.035, -0.55, '#ffffff', 0.03);
    // os retalhos (dois vermelhos) e a costura creme na beirada
    for (let i = 0; i < 3; i++)
      for (let k = 0; k < 4; k++)
        if ((i + k) % 2 === 0) p.caixa(0.27, 0.01, 0.24, -0.29 + i * 0.29, 0.07, -0.31 + k * 0.27, M.cobertorEscuro, 0);
    for (const s of [-1, 1]) p.caixa(0.03, 0.2, 1.2, s * 0.47, -0.17, 0.0, M.cobertor, 0.01);
    p.caixa(0.92, 0.012, 0.03, 0, 0.07, 0.57, M.creme, 0);
  });
  edredom(o, 0.44, M.cobertor, (p, y, zs) => {
    for (const [i, z] of zs.entries())
      for (const x of [-0.24, 0.24])
        if ((i + (x > 0 ? 1 : 0)) % 2 === 0) p.caixa(0.36, 0.012, 0.22, x, y[i], z, M.cobertorEscuro, 0);
  });
}

/**
 * O edredom de quando a criança deita: uma peça só, fofa e baixa, do queixo até os pés (nada do
 * corpo aparece no meio), a dobra do lençol perto do queixo e a beirada caindo até o colchão. A
 * cabeça fica de fora, no travesseiro. O palco ajusta a altura ao corpo deitado. Os enfeites de
 * cima (retalhos, estrelinhas) vêm de `enfeitar`.
 */
export const EDREDOM = { altura: 0.42, beirada: 0.12, inicio: -0.24, fim: 0.95 } as const;
function edredom(
  o: Oficina,
  colchao: number,
  cor: string,
  enfeitar: (p: Ref, alturas: readonly number[], zs: readonly number[]) => void,
): void {
  const { altura: H, beirada: B, inicio: z0, fim: z1 } = EDREDOM;
  o.parte('edredom', [0, colchao, 0], (p) => {
    p.caixa(1.0, H, z1 - z0, 0, -B, (z0 + z1) / 2, cor, 0.1);
    // o lombinho do corpo, mansinho (a perna fica um tico mais baixa)
    p.caixa(0.84, 0.04, 0.5, 0, H - B - 0.02, z0 + 0.36, cor, 0.02);
    p.caixa(0.98, 0.08, 0.14, 0, H - B - 0.05, z0 + 0.04, '#ffffff', 0.04);
    enfeitar(p, [H - B + 0.02, H - B, H - B], [z0 + 0.36, z0 + 0.72, z0 + 1.0]);
  });
}

/** Cama B: a cama azul de estrelas, com a cabeceira em três montinhos e os postes de bolinha. */
function camaDeEstrelas(o: Oficina): void {
  const r = o.r;
  for (const x of [-0.44, 0.44])
    for (const z of [-0.9, 0.9]) r.prisma(8, 0.07, 0.14, x, 0.07, z, M.branco, 'y');
  r.caixa(0.96, 0.16, 1.9, 0, 0.12, 0, M.azul, 0.05);
  // a cabeceira: três montinhos (o do meio mais alto) com as estrelinhas manteiga
  r.caixa(0.96, 0.6, 0.12, 0, 0.12, -0.95, M.azul, 0.05);
  r.caixa(0.36, 0.4, 0.12, 0, 0.6, -0.95, M.azul, 0.16);
  for (const s of [-1, 1]) r.caixa(0.3, 0.26, 0.12, s * 0.31, 0.6, -0.95, M.azul, 0.12);
  for (const [x, y, k] of [
    [0, 0.82, 0.09],
    [-0.31, 0.7, 0.06],
    [0.31, 0.7, 0.06],
  ] as const)
    r.placa(perfilEstrela(k), 0.02, x, y, -0.885, M.manteiga);
  for (const s of [-1, 1]) {
    r.caixa(0.1, 0.86, 0.12, s * 0.48, 0, -0.95, M.branco, 0.03);
    r.prisma(8, 0.075, 0.12, s * 0.48, 0.92, -0.95, M.branco, 'y');
    r.prisma(8, 0.06, 0.1, s * 0.48, 1.0, -0.95, M.branco, 'y');
  }
  r.caixa(0.96, 0.3, 0.1, 0, 0.12, 0.95, M.azul, 0.04);
  r.caixa(0.86, 0.2, 1.78, 0, 0.26, 0, M.lencol, 0.07);
  r.caixa(0.7, 0.15, 0.34, 0, 0.46, -0.66, M.branco, 0.08);
  o.parte('cobertor', [0, 0.46, 0.3], (p) => {
    p.caixa(0.92, 0.07, 1.22, 0, 0, 0, M.azulNoite, 0.04);
    p.caixa(0.92, 0.06, 0.16, 0, 0.035, -0.55, M.branco, 0.03);
    for (const [x, z] of [
      [-0.25, -0.25],
      [0.2, -0.05],
      [-0.1, 0.2],
      [0.28, 0.38],
      [-0.3, 0.45],
    ] as const) {
      p.caixa(0.08, 0.012, 0.025, x, 0.07, z, M.manteiga, 0);
      p.caixa(0.025, 0.012, 0.08, x, 0.07, z, M.manteiga, 0);
    }
    for (const s of [-1, 1]) p.caixa(0.03, 0.2, 1.2, s * 0.47, -0.17, 0, M.azulNoite, 0.01);
  });
  edredom(o, 0.46, M.azulNoite, (p, y, zs) => {
    for (const [i, z] of zs.entries())
      for (const x of i === 0 ? [-0.2, 0.22] : [0.15]) {
        p.caixa(0.08, 0.012, 0.025, x, y[i], z, M.manteiga, 0);
        p.caixa(0.025, 0.012, 0.08, x, y[i], z, M.manteiga, 0);
      }
  });
}

/** O guarda-roupa de duas portas (2 × 2): mel, as portas abrem e mostram as roupinhas no cabide. */
function guardaRoupa(o: Oficina): void {
  const r = o.r;
  const W = 1.8;
  const A = 1.9;
  const D = 0.58;
  for (const x of [-0.8, 0.8])
    for (const z of [-0.2, 0.2]) r.caixa(0.1, 0.08, 0.1, x, 0, z, M.melEscuro, 0.02);
  for (const s of [-1, 1]) r.caixa(0.06, A - 0.08, D, s * (W / 2 - 0.03), 0.08, 0, M.mel, 0.03);
  r.caixa(W, 0.08, D, 0, 0.08, 0, M.mel, 0.02);
  r.caixa(W - 0.1, A - 0.16, 0.04, 0, 0.12, -D / 2 + 0.02, M.melEscuro, 0.01);
  r.caixa(W + 0.08, 0.1, D + 0.06, 0, A - 0.02, 0, M.melEscuro, 0.04);
  r.caixa(0.06, A - 0.2, D - 0.06, 0, 0.16, 0, M.mel, 0.01);
  // dentro: o cabideiro e as três camisetas (coral, azul e manteiga), e a gaveta embaixo
  r.barra([-W / 2 + 0.08, 1.6, 0], [-0.06, 1.6, 0], 0.03, M.cromo);
  ([
    [-0.66, M.coral],
    [-0.42, M.azul],
    [-0.2, M.manteiga],
  ] as const).forEach(([x, cor]) => {
    r.barra([x - 0.1, 1.5, 0], [x + 0.1, 1.5, 0], 0.025, M.cromo);
    r.caixa(0.2, 0.36, 0.06, x, 1.12, 0, cor, 0.03);
    for (const s of [-1, 1]) r.caixa(0.07, 0.12, 0.06, x + s * 0.12, 1.36, 0, cor, 0.02);
  });
  for (const y of [0.55, 1.05]) r.caixa(W / 2 - 0.1, 0.03, D - 0.08, W / 4, y, 0, M.mel, 0.005);
  r.caixa(0.22, 0.12, 0.3, 0.3, 0.58, 0, M.coral, 0.03);
  r.caixa(0.22, 0.1, 0.3, 0.58, 0.58, 0, M.creme, 0.03);
  r.caixa(0.5, 0.14, 0.32, 0.45, 1.08, 0, M.azul, 0.04);
  // as portas (pivô na dobradiça de fora de cada uma)
  for (const s of [-1, 1])
    o.parte(s < 0 ? 'portaE' : 'portaD', [s * (W / 2), 0.12, D / 2], (p) => {
      const cx = -s * (W / 4);
      p.caixa(W / 2 - 0.01, A - 0.18, 0.05, cx, 0, 0.025, M.melClaro, 0.03);
      p.caixa(W / 2 - 0.2, A - 0.5, 0.012, cx, 0.16, 0.055, M.mel, 0.01);
      p.prisma(10, 0.045, 0.05, cx - s * (W / 4 - 0.1), 0.86, 0.07, M.melEscuro, 'z');
    });
}

/** O criado-mudo: a caixinha de gaveta e a luminária de lua em cima (acende devagar ao toque). */
function criadoMudo(o: Oficina): void {
  const r = o.r;
  for (const x of [-0.2, 0.2])
    for (const z of [-0.15, 0.15]) r.caixa(0.06, 0.08, 0.06, x, 0, z, M.melEscuro, 0.015);
  r.caixa(0.56, 0.46, 0.44, 0, 0.08, 0, M.mel, 0.04);
  r.caixa(0.46, 0.16, 0.03, 0, 0.32, 0.22, M.melClaro, 0.02);
  r.caixa(0.46, 0.16, 0.03, 0, 0.12, 0.22, M.melClaro, 0.02);
  for (const y of [0.4, 0.2]) r.prisma(8, 0.025, 0.03, 0, y, 0.24, M.melEscuro, 'z');
  r.caixa(0.14, 0.04, 0.14, 0.05, 0.54, -0.02, M.creme, 0.015);
  const lua = (p: Ref, cor: string, luz: boolean) => {
    p.prisma(10, 0.09, 0.06, 0, 0.03, 0, cor, 'y', luz);
    p.prisma(10, 0.12, 0.08, 0, 0.1, 0, cor, 'y', luz);
    p.prisma(10, 0.11, 0.06, 0, 0.17, 0, cor, 'y', luz);
    p.prisma(10, 0.07, 0.04, 0, 0.22, 0, cor, 'y', luz);
  };
  o.parte('lua', [0.05, 0.58, -0.02], (p) => lua(p, '#e9dcae', false));
  o.parte('luaAcesa', [0.05, 0.58, -0.02], (p) => lua(p, '#fff1b0', true));
}
