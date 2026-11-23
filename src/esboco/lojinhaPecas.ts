/**
 * Esboço da spec 036 (Lojinha maior): as peças dos candidatos que a criança veste ou em que anda,
 * no plano do boneco de verdade (`planoBoneco`), com as mesmas formas dos premium de hoje
 * (`Pecas` de `bonecoPremium.ts`: caixas de canto redondo, bolinhas, cones, anéis e placas).
 * Nada de modelo pronto: tudo aqui, em código.
 *
 * - Os brinquedos de andar moram na junta `prancha` (no chão, fora do corpo, como o skate da
 *   026): o corpo sobe ou senta em cima deles na pose (`lojinha.ts`).
 * - As partes que se mexem sozinhas (rodas, pedal, hélice, asas) ficam em nós próprios
 *   (`subjunta`), que o palco gira a cada quadro.
 * - As partes acesas levam o nome com `luz-<cor>-`: o palco troca o material delas por uma luz
 *   do esboço, mansa e fora do brilho que borra (o defeito do unicórnio que o dono apontou).
 */
import type { Junta, Peca, PlanoBoneco, SubjuntaPremium } from '../personagem/boneco';
import { ajeitarCabeloDebaixo } from '../personagem/boneco';
import { perfilEstrela, perfilFolha } from '../personagem/bonecoFantasia';
import { Pecas, misturarCor } from '../personagem/bonecoPremium';

export type V3 = [number, number, number];
type P2 = [number, number];

// ------------------------------------------------------------------ catálogo dos candidatos
export type TipoCandidato = 'andar' | 'bicho' | 'chapeu' | 'roupa' | 'costas' | 'mao';
export type IdCandidato =
  | 'patinete'
  | 'carrinho'
  | 'bicicleta'
  | 'nuvem'
  | 'cachorro'
  | 'coelho'
  | 'tartaruga'
  | 'passarinho'
  | 'coroa'
  | 'bone'
  | 'explorador'
  | 'pijama'
  | 'jardineira'
  | 'borboleta'
  | 'foguete'
  | 'bolhas';

export interface Candidato {
  numero: number;
  id: IdCandidato;
  tipo: TipoCandidato;
  nome: string;
  /** Preço fixo sugerido (moedinhas). */
  preco: number;
  efeito: string;
  /** Quem veste na foto (as duas crianças do jogo, alternando). */
  quem: 'menina' | 'menino';
}

export const CANDIDATOS: readonly Candidato[] = [
  {
    numero: 1,
    id: 'patinete',
    tipo: 'andar',
    nome: 'Patinete de luz',
    preco: 110,
    efeito: 'anda de pé, dando impulso com o pé; as três rodinhas acendem em verde-água quando rodam',
    quem: 'menino',
  },
  {
    numero: 2,
    id: 'carrinho',
    tipo: 'andar',
    nome: 'Carrinho de pedal',
    preco: 140,
    efeito: 'sentada no carrinho aberto, com volante e bandeirinha; os faróis acendem de noite',
    quem: 'menina',
  },
  {
    numero: 3,
    id: 'bicicleta',
    tipo: 'andar',
    nome: 'Bicicletinha',
    preco: 120,
    efeito: 'pedala de verdade, com rodinhas de apoio e a cestinha com uma flor',
    quem: 'menino',
  },
  {
    numero: 4,
    id: 'nuvem',
    tipo: 'andar',
    nome: 'Nuvem fofa',
    preco: 150,
    efeito: 'sentada na nuvem, flutua baixinho balançando devagar e deixa nuvenzinhas para trás',
    quem: 'menina',
  },
  {
    numero: 5,
    id: 'cachorro',
    tipo: 'bicho',
    nome: 'Cachorrinho',
    preco: 70,
    efeito: 'segue trotando e abanando o rabo; senta quando a criança para',
    quem: 'menino',
  },
  {
    numero: 6,
    id: 'coelho',
    tipo: 'bicho',
    nome: 'Coelhinho',
    preco: 60,
    efeito: 'segue aos pulinhos, com as orelhas balançando; parado, mexe o nariz',
    quem: 'menina',
  },
  {
    numero: 7,
    id: 'tartaruga',
    tipo: 'bicho',
    nome: 'Tartaruguinha',
    preco: 50,
    efeito: 'segue no passinho dela, balançando o casco; parada, cochila de olho fechado',
    quem: 'menino',
  },
  {
    numero: 8,
    id: 'passarinho',
    tipo: 'bicho',
    nome: 'Passarinho de ombro',
    preco: 45,
    efeito: 'mora no ombro, balança junto e bate as asinhas de vez em quando',
    quem: 'menina',
  },
  {
    numero: 9,
    id: 'coroa',
    tipo: 'chapeu',
    nome: 'Coroa de flores',
    preco: 25,
    efeito: 'flores de pano rosa, branca e lilás com folhinhas, que balançam de leve',
    quem: 'menina',
  },
  {
    numero: 10,
    id: 'bone',
    tipo: 'chapeu',
    nome: 'Boné de hélice',
    preco: 30,
    efeito: 'a hélice gira devagar parada e rápido quando a criança corre',
    quem: 'menino',
  },
  {
    numero: 11,
    id: 'explorador',
    tipo: 'chapeu',
    nome: 'Chapéu de explorador',
    preco: 30,
    efeito: 'aba larga com fita, a bússola de ouro na frente e uma pena de lado',
    quem: 'menina',
  },
  {
    numero: 12,
    id: 'pijama',
    tipo: 'roupa',
    nome: 'Pijama de nuvem',
    preco: 35,
    efeito: 'azul-céu com nuvenzinhas, gola fofinha e pantufas de nuvem',
    quem: 'menino',
  },
  {
    numero: 13,
    id: 'jardineira',
    tipo: 'roupa',
    nome: 'Jardineira de pintor',
    preco: 35,
    efeito: 'jardineira creme com respingos azuis, amarelos e rosa e o pincel no bolso',
    quem: 'menina',
  },
  {
    numero: 14,
    id: 'borboleta',
    tipo: 'costas',
    nome: 'Asas de borboleta',
    preco: 55,
    efeito: 'asas lilás e rosa com bolinhas, que batem devagar e mais rápido correndo',
    quem: 'menina',
  },
  {
    numero: 15,
    id: 'foguete',
    tipo: 'costas',
    nome: 'Mochila-foguete',
    preco: 65,
    efeito: 'foguetinho de janelinha nas costas, soltando fumacinha branca; no pulo, um puf maior',
    quem: 'menino',
  },
  {
    numero: 16,
    id: 'bolhas',
    tipo: 'mao',
    nome: 'Varinha de bolhas',
    preco: 40,
    efeito: 'na mão, solta bolhas de sabão que sobem devagar e estouram sozinhas',
    quem: 'menina',
  },
];

export const candidato = (id: IdCandidato): Candidato => CANDIDATOS.find((c) => c.id === id)!;

// ------------------------------------------------------------------ medidas do boneco
export interface Medidas {
  larg: number;
  troncoH: number;
  prof: number;
  frente: number;
  quadril: number;
  xBraco: number;
  cab: { w: number; h: number; d: number };
  topo: number;
  topoTampa: number;
  baseChapeu: number;
  zRosto: number;
}

/** As medidas do boneco a partir do plano (como o esboço da 027 fazia). */
export function medir(p: PlanoBoneco): Medidas {
  const peito = p.pecas.find((q) => q.nome === 'peito')!;
  const cabeca = p.pecas.find((q) => q.nome === 'cabeca' && q.junta === 'cabeca')!;
  const cabelo = p.pecas.find((q) => q.nome === 'cabelo' && q.junta === 'cabeca');
  const cab = { w: cabeca.tamanho[0], h: cabeca.tamanho[1], d: cabeca.tamanho[2] };
  const topo = cab.h / 2;
  const topoTampa = cabelo ? cabelo.pos[1] + cabelo.tamanho[1] / 2 : topo + 0.07;
  return {
    larg: peito.tamanho[0],
    troncoH: peito.tamanho[1],
    prof: peito.tamanho[2],
    frente: peito.tamanho[2] / 2 + 0.005,
    quadril: p.juntas.tronco.pos[1],
    xBraco: p.juntas.bracoD.pos[0],
    cab,
    topo,
    topoTampa,
    baseChapeu: topo + (topoTampa - (topo + 0.07)),
    zRosto: cab.d / 2 + 0.005,
  };
}

// ------------------------------------------------------------------ ajudantes
const sub = (nome: string, pivo: V3) => ({ subjunta: { nome: nome as SubjuntaPremium, pivo } });

/**
 * Um tubo (cilindro) de `a` até `b`: o meio, o comprimento e o giro que leva o eixo y do cilindro
 * para a direção a→b (o Babylon gira em z, depois em x, depois em y).
 */
function tubo(
  P: Pecas,
  nome: string,
  junta: Junta,
  a: V3,
  b: V3,
  r: number,
  cor: string,
  extra: Partial<Peca> = {},
): void {
  const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const n: V3 = [d[0] / l, d[1] / l, d[2] / l];
  const rz = -Math.asin(Math.max(-1, Math.min(1, n[0])));
  const rx = Math.atan2(n[2], n[1]);
  P.cone(nome, junta, undefined, l, r, r, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], cor, {
    rot: [rx, 0, rz],
    ...extra,
  });
}

/** Contorno de respingo (bolinha com ondas, como tinta que caiu). */
function perfilRespingo(r: number, ondas = 6, fase = 0): P2[] {
  const pts: P2[] = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const k = 1 + 0.22 * Math.sin(a * ondas + fase) + 0.08 * Math.sin(a * 3 + fase * 2);
    pts.push([Math.cos(a) * r * k, Math.sin(a) * r * k]);
  }
  return pts;
}

/** Contorno de nuvenzinha (três bolinhas juntas, a do meio mais alta). */
function perfilNuvem(w: number): P2[] {
  const pts: P2[] = [];
  const bolas: Array<[number, number, number]> = [
    [-0.3, -0.05, 0.24],
    [0, 0.06, 0.32],
    [0.3, -0.05, 0.24],
  ];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    // o contorno da união: o mais longe do centro entre as três bolinhas, nesta direção
    let melhor = 0;
    for (const [bx, by, br] of bolas) {
      // distância do centro da peça até a borda da bolinha na direção a
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const pb = bx * dx + by * dy;
      const q = pb * pb - (bx * bx + by * by - br * br);
      if (q >= 0) melhor = Math.max(melhor, pb + Math.sqrt(q));
    }
    // a base é reta (nuvem de desenho)
    const y = Math.max(-0.12, Math.sin(a) * melhor);
    pts.push([Math.cos(a) * melhor * w, y * w]);
  }
  return pts;
}

/**
 * Contorno de asa de borboleta: uma elipse (centro, raios, giro) puxada para a raiz no (0,0),
 * como uma gota com a ponta no corpo.
 */
function perfilGota(c: P2, a: number, b: number, giro: number, k: number): P2[] {
  const pts: P2[] = [];
  const raiz: P2 = [0.02, 0];
  const ux = raiz[0] - c[0];
  const uy = raiz[1] - c[1];
  const ul = Math.hypot(ux, uy);
  for (let i = 0; i < 40; i++) {
    const t = (i / 40) * Math.PI * 2;
    const ex = a * Math.cos(t);
    const ey = b * Math.sin(t);
    let x = c[0] + ex * Math.cos(giro) - ey * Math.sin(giro);
    let y = c[1] + ex * Math.sin(giro) + ey * Math.cos(giro);
    const dl = Math.hypot(x - c[0], y - c[1]) || 1;
    const w = Math.max(0, ((x - c[0]) * ux + (y - c[1]) * uy) / (dl * ul)) ** 3;
    x += (raiz[0] - x) * w * 0.85;
    y += (raiz[1] - y) * w * 0.85;
    pts.push([x * k, y * k]);
  }
  return pts;
}

/** A asa de cima: larga e redonda, para fora e para cima. */
const perfilAsaCima = (k: number) => perfilGota([0.27, 0.22], 0.26, 0.2, 0.55, k);
/** A asa de baixo: menor, para fora e para baixo. */
const perfilAsaBaixo = (k: number) => perfilGota([0.19, -0.15], 0.17, 0.13, -0.6, k);

/** As peças da roupa de baixo que saem com uma roupa nova (os enfeites do estilo). */
const ENFEITES_DA_ROUPA =
  /^(tunica-barra|cinto|fivela|avental|camiseta|gola|listra\d|colete-?1|colete1|bandoleira|bolso|saia)$/;

function pintar(lista: Peca[], re: RegExp, cor: string): void {
  for (const p of lista)
    if (re.test(p.nome)) {
      p.cor = cor;
      p.viva = undefined;
    }
}

// ------------------------------------------------------------------ brinquedos de andar
/** Como a criança fica no brinquedo (o palco monta a pose com isto). */
export interface Montaria {
  /** O quanto o corpo sobe (ou desce) na pose. */
  corpoY: number;
  sentado: boolean;
  /** Braços para a frente (rad) e abertos (positivo para fora) até o guidão ou o volante. */
  bracoX: number;
  bracoAbre: number;
  /** Pernas (rad, negativo para a frente) e o vaivém do pedal. */
  perna: number;
  pedal: number;
  troncoX: number;
  /** Raio das rodas (no plano), para girar com o andar (0: não tem roda). */
  raioRoda: number;
  /** A altura em que o brinquedo flutua (a nuvem). */
  flutua?: number;
}

export const MONTARIAS: Partial<Record<IdCandidato, Montaria>> = {
  patinete: { corpoY: 0.135, sentado: false, bracoX: -1.0, bracoAbre: -0.12, perna: 0, pedal: 0, troncoX: 0.08, raioRoda: 0.075 },
  carrinho: { corpoY: 0.05, sentado: true, bracoX: -0.85, bracoAbre: -0.16, perna: -1.45, pedal: 0.1, troncoX: 0.04, raioRoda: 0.13 },
  bicicleta: { corpoY: 0.3, sentado: true, bracoX: -1.05, bracoAbre: -0.05, perna: -0.62, pedal: 0.3, troncoX: 0.28, raioRoda: 0.2 },
  nuvem: { corpoY: 0.36, sentado: true, bracoX: -0.25, bracoAbre: 0.35, perna: -1.3, pedal: 0, troncoX: 0, raioRoda: 0, flutua: 0.1 },
};

function patinete(P: Pecas): void {
  const VIOLETA = '#7b5cff';
  const VIOLETA_ESC = '#5b40d8';
  const BRANCO = '#f4f6ff';
  const GRAFITE = '#3b3650';
  const j: Junta = 'prancha';
  // o deque baixinho, com a lixa e duas estrelinhas brancas
  P.caixa('patinete-deque', j, undefined, [0.32, 0.055, 0.74], [0, 0.1, -0.03], VIOLETA, 0.027, { brilho: 0.5 });
  P.caixa('patinete-lixa', j, undefined, [0.27, 0.01, 0.56], [0, 0.131, -0.06], GRAFITE, 0.004);
  for (const [x, z, g] of [
    [0.075, -0.27, 0.3],
    [-0.08, -0.31, -0.5],
  ])
    P.placa(`patinete-estrela${x}`, j, undefined, perfilEstrela(0.035), 0.008, [x, 0.137, z], BRANCO, {
      rot: [-Math.PI / 2, 0, g],
    });
  // o para-lama de trás e o bloco da frente (onde as duas rodas da frente se prendem)
  P.caixa('patinete-paralama', j, undefined, [0.1, 0.03, 0.17], [0, 0.165, -0.37], VIOLETA, 0.015, { rot: [0.3, 0, 0] });
  P.caixa('patinete-frente', j, undefined, [0.36, 0.07, 0.14], [0, 0.1, 0.3], VIOLETA_ESC, 0.03);
  // a haste, o colar e o guidão com os punhos
  P.cone('patinete-haste', j, undefined, 0.58, 0.032, 0.03, [0, 0.42, 0.29], BRANCO, { brilho: 0.6 });
  P.caixa('patinete-colar', j, undefined, [0.09, 0.07, 0.09], [0, 0.17, 0.29], VIOLETA, 0.03);
  P.cone('patinete-guidao', j, undefined, 0.5, 0.026, 0.026, [0, 0.71, 0.27], BRANCO, { rot: [0, 0, Math.PI / 2], brilho: 0.6 });
  P.bola('patinete-trava', j, undefined, 0.045, [0, 0.71, 0.28], VIOLETA_ESC);
  for (const s of [-1, 1]) {
    P.cone(`patinete-punho${s}`, j, undefined, 0.13, 0.04, 0.04, [s * 0.2, 0.71, 0.27], VIOLETA, { rot: [0, 0, Math.PI / 2] });
    P.bola(`patinete-ponta${s}`, j, undefined, 0.041, [s * 0.265, 0.71, 0.27], VIOLETA_ESC, [0.6, 1, 1]);
  }
  // as rodinhas: duas na frente e uma atrás, de luz verde-água, com o miolo branco e a bolinha
  // que mostra que estão girando
  const rodas: Array<[string, V3, number[]]> = [
    ['rodaF', [0, 0.075, 0.3], [-0.135, 0.135]],
    ['rodaT', [0, 0.075, -0.37], [0]],
  ];
  for (const [nome, pivo, xs] of rodas)
    for (const x of xs) {
      P.cone(`luz-menta-${nome}${x}`, j, undefined, 0.07, 0.075, 0.075, [x, 0, 0], '#5fe8cf', {
        rot: [0, 0, Math.PI / 2],
        luz: 'perola',
        ...sub(nome, pivo),
      });
      P.cone(`patinete-cubo-${nome}${x}`, j, undefined, 0.076, 0.036, 0.036, [x, 0, 0], BRANCO, {
        rot: [0, 0, Math.PI / 2],
        ...sub(nome, pivo),
      });
      const fora = x === 0 ? 0.04 : Math.sign(x) * 0.04 + x;
      P.bola(`patinete-marca-${nome}${x}`, j, undefined, 0.016, [fora, 0.047, 0], BRANCO, [0.6, 1, 1], sub(nome, pivo));
      if (x === 0)
        P.bola(`patinete-marca2-${nome}`, j, undefined, 0.016, [-0.04, -0.047, 0], BRANCO, [0.6, 1, 1], sub(nome, pivo));
    }
}

function carrinho(P: Pecas): void {
  const AZUL = '#2fb2ea';
  const AZUL_ESC = '#1f86c6';
  const CREME = '#fff3da';
  const AMARELO = '#ffd23a';
  const PNEU = '#35313f';
  const CINZA = '#e6e9f2';
  const LARANJA = '#ff8a3d';
  const j: Junta = 'prancha';
  // o assoalho, as laterais com o friso branco, o capô e a traseira (aberto em cima)
  P.caixa('carrinho-assoalho', j, undefined, [0.7, 0.07, 1.06], [0, 0.16, 0.02], AZUL_ESC, 0.03);
  for (const s of [-1, 1]) {
    P.caixa(`carrinho-lado${s}`, j, undefined, [0.1, 0.27, 0.96], [s * 0.34, 0.29, 0.02], AZUL, 0.05, { brilho: 0.55 });
    P.caixa(`carrinho-friso${s}`, j, undefined, [0.012, 0.045, 0.74], [s * 0.392, 0.32, 0.02], '#ffffff', 0.008);
  }
  P.caixa('carrinho-capo', j, undefined, [0.78, 0.3, 0.42], [0, 0.3, 0.4], AZUL, 0.13, { brilho: 0.55 });
  P.caixa('carrinho-painel', j, undefined, [0.62, 0.1, 0.12], [0, 0.46, 0.21], AZUL_ESC, 0.045);
  P.caixa('carrinho-traseira', j, undefined, [0.78, 0.34, 0.24], [0, 0.3, -0.44], AZUL, 0.11, { brilho: 0.55 });
  P.caixa('carrinho-parachoque', j, undefined, [0.8, 0.08, 0.08], [0, 0.18, 0.63], CINZA, 0.04, { brilho: 0.6 });
  P.caixa('carrinho-parachoque2', j, undefined, [0.8, 0.08, 0.08], [0, 0.18, -0.58], CINZA, 0.04, { brilho: 0.6 });
  // os faróis redondos (acendem de leve) com o aro
  for (const s of [-1, 1]) {
    P.bola(`luz-creme-farol${s}`, j, undefined, 0.058, [s * 0.22, 0.35, 0.6], '#fff4d0', [1, 1, 0.6], { luz: 'perola' });
    P.anel(`carrinho-aro${s}`, j, undefined, 0.13, 0.026, [s * 0.22, 0.35, 0.595], CINZA, { rot: [Math.PI / 2, 0, 0], brilho: 0.6 });
  }
  // o banco creme com o encosto
  P.caixa('carrinho-assento', j, undefined, [0.52, 0.07, 0.32], [0, 0.22, -0.16], CREME, 0.03);
  P.caixa('carrinho-encosto', j, undefined, [0.52, 0.28, 0.07], [0, 0.4, -0.33], CREME, 0.03);
  // o volante na frente da criança
  tubo(P, 'carrinho-coluna', j, [0, 0.45, 0.27], [0, 0.55, 0.15], 0.022, CINZA);
  P.anel('carrinho-volante', j, undefined, 0.27, 0.04, [0, 0.56, 0.14], '#3c3a48', { rot: [-0.95, 0, 0] });
  P.bola('carrinho-buzina', j, undefined, 0.045, [0, 0.565, 0.145], AMARELO, [1, 0.55, 1], { rot: [-0.95, 0, 0] });
  // a bandeirinha laranja atrás
  tubo(P, 'carrinho-mastro', j, [0.28, 0.44, -0.5], [0.28, 1.05, -0.52], 0.012, CINZA);
  P.placa(
    'carrinho-bandeira',
    j,
    undefined,
    [
      [0, 0.09],
      [0, -0.09],
      [0.2, 0],
    ],
    0.012,
    [0.28, 0.98, -0.52],
    LARANJA,
    { rot: [0, Math.PI / 2, 0] },
  );
  // as quatro rodas (pneu, a calota amarela e o parafuso que mostra o giro)
  for (const [nome, z] of [
    ['rodaF', 0.38],
    ['rodaT', -0.34],
  ] as const) {
    const pivo: V3 = [0, 0.13, z];
    for (const s of [-1, 1]) {
      P.cone(`carrinho-pneu-${nome}${s}`, j, undefined, 0.1, 0.13, 0.13, [s * 0.4, 0, 0], PNEU, {
        rot: [0, 0, Math.PI / 2],
        ...sub(nome, pivo),
      });
      P.cone(`carrinho-calota-${nome}${s}`, j, undefined, 0.106, 0.065, 0.065, [s * 0.4, 0, 0], AMARELO, {
        rot: [0, 0, Math.PI / 2],
        brilho: 0.6,
        ...sub(nome, pivo),
      });
      P.bola(`carrinho-parafuso-${nome}${s}`, j, undefined, 0.018, [s * 0.455, 0.035, 0], '#ffffff', [0.6, 1, 1], sub(nome, pivo));
    }
  }
}

function bicicleta(P: Pecas): void {
  const MENTA = '#34c995';
  const MENTA_ESC = '#22a477';
  const CREME = '#fff3da';
  const PNEU = '#3a3644';
  const CARAMELO = '#d8a15a';
  const ROSA = '#ff8fbf';
  const PRATA = '#dfe3ee';
  const j: Junta = 'prancha';
  const R = 0.2;
  const tras: V3 = [0, R, -0.24];
  const frente: V3 = [0, R, 0.56];
  const pedal: V3 = [0, 0.24, 0.14];
  // as rodas: pneu, raios e o miolo (gira inteira no nó dela)
  for (const [nome, c] of [
    ['rodaT', tras],
    ['rodaF', frente],
  ] as const) {
    P.anel(`bici-pneu-${nome}`, j, undefined, R * 2 - 0.06, 0.065, [0, 0, 0], PNEU, { rot: [0, 0, Math.PI / 2], ...sub(nome, c) });
    P.anel(`bici-aro-${nome}`, j, undefined, R * 2 - 0.13, 0.02, [0, 0, 0], CREME, { rot: [0, 0, Math.PI / 2], ...sub(nome, c) });
    for (let k = 0; k < 3; k++)
      P.caixa(`bici-raio-${nome}${k}`, j, undefined, [0.014, R * 2 - 0.14, 0.014], [0, 0, 0], CREME, 0.005, {
        rot: [(k * Math.PI) / 3, 0, 0],
        ...sub(nome, c),
      });
    P.cone(`bici-cubo-${nome}`, j, undefined, 0.07, 0.035, 0.035, [0, 0, 0], MENTA_ESC, { rot: [0, 0, Math.PI / 2], ...sub(nome, c) });
  }
  // o quadro
  const selim: V3 = [0, 0.47, 0];
  const caixaDirecao: V3 = [0, 0.62, 0.47];
  tubo(P, 'bici-canote', j, pedal, [0, 0.5, -0.01], 0.028, MENTA);
  tubo(P, 'bici-baixo-tras', j, tras, pedal, 0.022, MENTA);
  tubo(P, 'bici-cima-tras', j, tras, [0, 0.45, -0.005], 0.02, MENTA);
  tubo(P, 'bici-diagonal', j, pedal, [0, 0.58, 0.45], 0.03, MENTA);
  tubo(P, 'bici-cima', j, [0, 0.46, 0.0], [0, 0.64, 0.45], 0.026, MENTA);
  tubo(P, 'bici-garfo', j, frente, [0, 0.86, 0.43], 0.025, MENTA_ESC);
  P.cone('bici-caixa', j, undefined, 0.16, 0.034, 0.034, caixaDirecao, MENTA_ESC, { rot: [-0.2, 0, 0] });
  // o guidão com os punhos rosa e a campainha
  P.cone('bici-guidao', j, undefined, 0.5, 0.022, 0.022, [0, 0.87, 0.42], PRATA, { rot: [0, 0, Math.PI / 2], brilho: 0.6 });
  for (const s of [-1, 1]) {
    P.cone(`bici-punho${s}`, j, undefined, 0.12, 0.034, 0.034, [s * 0.21, 0.87, 0.42], ROSA, { rot: [0, 0, Math.PI / 2] });
    P.bola(`bici-ponta${s}`, j, undefined, 0.036, [s * 0.275, 0.87, 0.42], ROSA, [0.6, 1, 1]);
  }
  P.bola('bici-campainha', j, undefined, 0.032, [-0.13, 0.905, 0.42], '#ffc93d', [1, 0.6, 1], { brilho: 0.85 });
  // o selim creme
  P.caixa('bici-selim', j, undefined, [0.18, 0.06, 0.26], selim, CREME, 0.03);
  // a cestinha de vime com a flor
  P.caixa('bici-cesta', j, undefined, [0.3, 0.17, 0.2], [0, 0.72, 0.6], CARAMELO, 0.035);
  P.caixa('bici-cesta-borda', j, undefined, [0.32, 0.03, 0.22], [0, 0.805, 0.6], misturarCor(CARAMELO, '#7a4e2a', 0.4), 0.015);
  for (const y of [0.68, 0.74])
    P.caixa(`bici-cesta-fio${y}`, j, undefined, [0.305, 0.012, 0.205], [0, y, 0.6], misturarCor(CARAMELO, '#ffffff', 0.35), 0.005);
  P.bola('bici-flor', j, undefined, 0.05, [0.06, 0.83, 0.6], ROSA, [1, 1, 0.7]);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    P.bola(`bici-petala${k}`, j, undefined, 0.032, [0.06 + Math.cos(a) * 0.045, 0.83 + Math.sin(a) * 0.045, 0.6], ROSA, [1, 1, 0.5]);
  }
  P.bola('bici-miolo', j, undefined, 0.025, [0.06, 0.83, 0.625], '#ffd23a', [1, 1, 0.6]);
  P.placa('bici-folha', j, undefined, perfilFolha(0.08), 0.012, [-0.04, 0.82, 0.6], '#4cc26a', { rot: [0, 0, 0.8] });
  // o pedal (gira no nó dele) e a coroa
  P.cone('bici-coroa', j, undefined, 0.02, 0.07, 0.07, [0.045, 0, 0], MENTA_ESC, { rot: [0, 0, Math.PI / 2], ...sub('pedal', pedal) });
  for (const s of [-1, 1]) {
    P.caixa(`bici-pedivela${s}`, j, undefined, [0.026, 0.11, 0.03], [s * 0.065, s * 0.05, 0], PRATA, 0.01, sub('pedal', pedal));
    P.caixa(`bici-pedal${s}`, j, undefined, [0.08, 0.026, 0.06], [s * 0.11, s * 0.1, 0], '#3c3a48', 0.01, sub('pedal', pedal));
  }
  // as rodinhas de apoio, atrás
  for (const s of [-1, 1]) {
    const c: V3 = [s * 0.22, 0.08, -0.24];
    tubo(P, `bici-apoio${s}`, j, [s * 0.22, 0.08, -0.24], [s * 0.03, 0.2, -0.24], 0.014, PRATA);
    P.cone(`bici-rodinha${s}`, j, undefined, 0.045, 0.08, 0.08, [0, 0, 0], CREME, { rot: [0, 0, Math.PI / 2], ...sub(`rodinha${s > 0 ? 'D' : 'E'}`, c) });
    P.cone(`bici-rodinha-cubo${s}`, j, undefined, 0.05, 0.03, 0.03, [0, 0, 0], MENTA, { rot: [0, 0, Math.PI / 2], ...sub(`rodinha${s > 0 ? 'D' : 'E'}`, c) });
    P.bola(`bici-rodinha-marca${s}`, j, undefined, 0.012, [s * 0.024, 0.05, 0], MENTA_ESC, [0.6, 1, 1], sub(`rodinha${s > 0 ? 'D' : 'E'}`, c));
  }
}

function nuvem(P: Pecas): void {
  const B = '#ffffff';
  const B2 = '#f1f4ff';
  const B3 = '#dfe6ff';
  const j: Junta = 'prancha';
  const n = 'nuvem';
  // a almofada de nuvem: bolinhas fofas juntas, o fundo um tico azulado, o encosto atrás e as
  // duas bochechas na frente onde as pernas descansam (tudo no nó da nuvem, que balança)
  const bolas: Array<[number, number, number, number, string]> = [
    [0, 0.36, 0, 0.34, B],
    [-0.31, 0.35, 0.06, 0.25, B],
    [0.31, 0.35, 0.06, 0.25, B],
    [0, 0.34, 0.38, 0.26, B],
    [-0.27, 0.33, 0.38, 0.19, B2],
    [0.27, 0.33, 0.38, 0.19, B2],
    [0, 0.35, -0.36, 0.27, B],
    [-0.28, 0.34, -0.3, 0.21, B2],
    [0.28, 0.34, -0.3, 0.21, B2],
    [-0.17, 0.52, -0.33, 0.19, B],
    [0.17, 0.52, -0.33, 0.19, B],
    [0, 0.58, -0.4, 0.2, B],
    [-0.15, 0.47, 0.47, 0.15, B],
    [0.15, 0.47, 0.47, 0.15, B],
    [0, 0.21, 0.02, 0.29, B3],
    [-0.26, 0.23, 0.14, 0.18, B3],
    [0.26, 0.23, 0.14, 0.18, B3],
    [0, 0.22, -0.3, 0.2, B3],
  ];
  bolas.forEach(([x, y, z, r, cor], i) =>
    P.bola(`${n}-fofo${i}`, j, undefined, r, [x, y, z], cor, [1, 0.78, 1], { brilho: 0.15, ...sub('nuvem', [0, 0, 0]) }),
  );
}

// ------------------------------------------------------------------ chapéus
function coroa(P: Pecas, m: Medidas): void {
  const FOLHA = '#4fbf68';
  const FOLHA_ESC = '#2f9a4f';
  const cores = ['#ff8fc0', '#fff7fb', '#c9a2ff'];
  const y = m.topoTampa - 0.13;
  // o aro de ramos verdes em volta da cabeça
  P.anel('coroa-aro', 'cabeca', 'cabeca', 0.92, 0.035, [0, y, -0.01], FOLHA_ESC, { brilho: 0.3 });
  // dez flores de cinco pétalas (rosa, branca e lilás) e folhinhas entre elas; a da frente é a
  // maior, em cima da testa
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.sin(a) * 0.45;
    const z = Math.cos(a) * 0.43 - 0.01;
    const frente = i === 0;
    const r = frente ? 0.07 : 0.055;
    const cor = cores[i % 3];
    const yy = y + (frente ? 0.04 : 0.02);
    for (let k = 0; k < 5; k++) {
      const b = (k / 5) * Math.PI * 2 + i;
      // as pétalas no plano da flor, virada para fora (de lado à cabeça)
      const px = Math.cos(b) * r * 0.75;
      const py = Math.sin(b) * r * 0.75;
      P.bola(
        `coroa-petala${i}-${k}`,
        'cabeca',
        'cabeca',
        r * 0.62,
        [x + Math.cos(a) * px + Math.sin(a) * 0.012, yy + py, z - Math.sin(a) * px + Math.cos(a) * 0.012],
        cor,
        [1, 1, 0.45],
        { rot: [0, a, 0], brilho: 0.25 },
      );
    }
    P.bola(`coroa-miolo${i}`, 'cabeca', 'cabeca', r * 0.42, [x + Math.sin(a) * 0.03, yy, z + Math.cos(a) * 0.03], '#ffd23a', [1, 1, 0.6], {
      rot: [0, a, 0],
      brilho: 0.4,
    });
    // a folhinha depois de cada flor
    const a2 = a + Math.PI / n;
    P.placa(
      `coroa-folha${i}`,
      'cabeca',
      'cabeca',
      perfilFolha(0.11),
      0.014,
      [Math.sin(a2) * 0.465, y + 0.01, Math.cos(a2) * 0.445 - 0.01],
      FOLHA,
      { rot: [0, a2, Math.PI / 2 + 0.3] },
    );
  }
}

function bone(P: Pecas, m: Medidas): void {
  const AZUL = '#2f6fe0';
  const AMARELO = '#ffcf3a';
  const VERMELHO = '#ff5a5a';
  const b = m.baseChapeu;
  // a cúpula azul (cobre a tampa de cabelo inteira) e a faixa amarela
  // a cúpula amarela (cobre a tampa de cabelo inteira), a aba vermelha e a estrela azul na
  // frente (cores que se destacam de qualquer roupa)
  P.bola('bone-cupula', 'cabeca', 'cabeca', 0.48, [0, b - 0.06, -0.01], AMARELO, [1, 0.55, 1], { brilho: 0.4 });
  P.placa('bone-estrela', 'cabeca', 'cabeca', perfilEstrela(0.07), 0.02, [0, b + 0.07, 0.41], AZUL, { rot: [-0.5, 0, 0], brilho: 0.4 });
  P.caixa('bone-aba', 'cabeca', 'cabeca', [0.6, 0.04, 0.3], [0, b - 0.09, 0.5], VERMELHO, 0.02, { rot: [-0.08, 0, 0], brilho: 0.4 });
  // o pino e a hélice (gira no nó dela), duas pás em azul e vermelho
  P.cone('bone-pino', 'cabeca', 'cabeca', 0.12, 0.028, 0.022, [0, b + 0.24, -0.01], '#e6e9f2', { brilho: 0.6 });
  const pivo: V3 = [0, b + 0.31, -0.01];
  P.bola('bone-botao', 'cabeca', 'cabeca', 0.04, [0, 0, 0], VERMELHO, [1, 0.8, 1], { brilho: 0.5, ...sub('helice', pivo) });
  for (const [s, cor] of [
    [-1, VERMELHO],
    [1, AZUL],
  ] as const)
    P.placa(
      `bone-pa${s}`,
      'cabeca',
      'cabeca',
      perfilFolha(0.3),
      0.018,
      [s * 0.16, 0, 0],
      cor,
      { rot: [Math.PI / 2, 0.25 * s, Math.PI / 2], brilho: 0.45, ...sub('helice', pivo) },
    );
  ajeitarCabeloDebaixo(P.lista, 'chapeu', m.topoTampa, m.cab);
}

function explorador(P: Pecas, m: Medidas): void {
  const CAQUI = '#dcc08a';
  const CAQUI_ESC = '#b99a62';
  const FITA = '#7a4e2a';
  const b = m.baseChapeu;
  // o chapéu fundo, encaixado na cabeça (a aba logo acima das sobrancelhas e a copa larga
  // engolindo a tampa de cabelo: nada de chapéu pousado em cima)
  const aba = b - 0.03;
  P.cone('explorador-aba', 'cabeca', 'cabeca', 0.045, 0.62, 0.62, [0, aba, 0.01], CAQUI, { brilho: 0.25 });
  P.anel('explorador-borda', 'cabeca', 'cabeca', 1.22, 0.04, [0, aba, 0.01], CAQUI_ESC);
  P.cone('explorador-copa', 'cabeca', 'cabeca', 0.28, 0.5, 0.43, [0, aba + 0.15, 0], CAQUI, { brilho: 0.25 });
  P.bola('explorador-topo', 'cabeca', 'cabeca', 0.43, [0, aba + 0.29, 0], CAQUI, [1, 0.22, 1], { brilho: 0.25 });
  P.cone('explorador-fita', 'cabeca', 'cabeca', 0.075, 0.505, 0.49, [0, aba + 0.07, 0], FITA);
  // a bússola de ouro na frente da fita, com a agulha
  const zb = 0.5;
  P.cone('explorador-bussola', 'cabeca', 'cabeca', 0.03, 0.065, 0.065, [0, aba + 0.075, zb], '#ffc93d', { rot: [Math.PI / 2, 0, 0], brilho: 0.85 });
  P.cone('explorador-vidro', 'cabeca', 'cabeca', 0.032, 0.048, 0.048, [0, aba + 0.075, zb + 0.005], '#fff8e6', { rot: [Math.PI / 2, 0, 0] });
  P.caixa('explorador-agulha', 'cabeca', 'cabeca', [0.012, 0.075, 0.008], [0, aba + 0.075, zb + 0.025], '#ff5a5a', 0.003, { rot: [0, 0, 0.5] });
  // a pena de lado, presa na fita
  P.placa('explorador-pena', 'cabeca', 'cabeca', perfilFolha(0.32), 0.014, [0.47, aba + 0.22, -0.12], '#3fb0a0', {
    rot: [0, Math.PI / 2, -0.4],
    viva: true,
    pintar: (_x, y) => misturarCor('#2a8f86', '#8fe6d4', (y - (aba + 0.07)) / 0.32),
  });
  ajeitarCabeloDebaixo(P.lista, 'chapeu', m.topoTampa, m.cab);
}

// ------------------------------------------------------------------ roupas
function pijama(P: Pecas, m: Medidas): void {
  const CEU = '#9fd3ff';
  const CEU_ESC = '#7bbcf2';
  const B = '#ffffff';
  const L = P.lista;
  P.tirar(ENFEITES_DA_ROUPA);
  pintar(L, /^(peito|quadril|braco[ED]-(manga|ombro)|perna[ED]-perna)$/, CEU);
  pintar(L, /^braco[ED]-punho$/, B);
  const { larg, troncoH, frente, prof } = m;
  // a gola fofa de nuvem
  for (let i = -2; i <= 2; i++)
    P.bola(`pijama-gola${i}`, 'tronco', 'tronco', 0.06, [i * 0.07, troncoH - 0.02, frente - 0.04 - Math.abs(i) * 0.03], B, [1.1, 0.7, 1]);
  // os botões de estrelinha amarela
  for (const y of [0.3, 0.2, 0.1])
    P.placa(`pijama-botao${y}`, 'tronco', 'tronco', perfilEstrela(0.03), 0.012, [0, troncoH * y * 2.1, frente + 0.006], '#ffd84a', {
      rot: [0, 0, 0.2],
    });
  // as nuvenzinhas brancas: no peito, nas costas, nas mangas e nas pernas
  const nuvemEm = (nome: string, junta: Junta, pos: V3, w: number, rotY = 0) =>
    P.placa(nome, junta, undefined, perfilNuvem(w), 0.014, pos, B, { rot: [0, rotY, 0] });
  nuvemEm('pijama-nuvem-peito', 'tronco', [larg * 0.23, troncoH * 0.62, frente + 0.004], 0.16);
  nuvemEm('pijama-nuvem-peito2', 'tronco', [-larg * 0.24, troncoH * 0.25, frente + 0.004], 0.12);
  nuvemEm('pijama-nuvem-costas', 'tronco', [0, troncoH * 0.5, -prof / 2 - 0.004], 0.2, Math.PI);
  for (const s of [-1, 1]) {
    const lado = s < 0 ? 'E' : 'D';
    nuvemEm(`pijama-nuvem-manga${lado}`, s < 0 ? 'bracoE' : 'bracoD', [s * 0.068, -0.1, 0], 0.09, (s * Math.PI) / 2);
    nuvemEm(`pijama-nuvem-perna${lado}`, s < 0 ? 'pernaE' : 'pernaD', [0, -0.12, 0.095], 0.1);
  }
  // a barra da calça e as pantufas de nuvem (no lugar do sapato)
  P.tirar(/^perna[ED]-sapato$/);
  for (const lado of ['pernaE', 'pernaD'] as const) {
    P.caixa(`${lado}-pijama-barra`, lado, 'perna', [0.19, 0.04, 0.2], [0, -m.quadril + 0.16, 0], CEU_ESC, 0.02);
    P.caixa(`${lado}-sapato`, lado, 'perna', [0.22, 0.12, 0.29], [0, -m.quadril + 0.06, 0.03], B, 0.06, { brilho: 0.2 });
    for (const [x, z, r] of [
      [-0.06, 0.13, 0.065],
      [0.05, 0.15, 0.06],
      [0, 0.06, 0.07],
      [0.07, -0.05, 0.055],
      [-0.07, -0.04, 0.055],
    ])
      P.bola(`${lado}-pantufa${x}${z}`, lado, 'perna', r, [x, -m.quadril + 0.11, z], B, [1, 0.8, 1], { brilho: 0.15 });
  }
}

function jardineira(P: Pecas, m: Medidas): void {
  const CREME = '#f3ecdc';
  const CREME_ESC = '#d9cfb8';
  const CAMISA = '#ffd0dc';
  const L = P.lista;
  P.tirar(ENFEITES_DA_ROUPA);
  // a camiseta rosinha por baixo e a calça da jardineira creme
  pintar(L, /^(peito|braco[ED]-(manga|ombro))$/, CAMISA);
  pintar(L, /^braco[ED]-punho$/, misturarCor(CAMISA, '#d86a8c', 0.3));
  pintar(L, /^(quadril|perna[ED]-perna)$/, CREME);
  const { larg, troncoH, frente, prof } = m;
  // o peitilho, as alças cruzando o ombro, os botões e o bolso com o pincel
  P.caixa('jardineira-peitilho', 'tronco', 'tronco', [larg * 0.62, troncoH * 0.62, 0.03], [0, troncoH * 0.33, frente + 0.004], CREME, 0.03);
  P.caixa('jardineira-cos', 'tronco', 'tronco', [larg + 0.02, 0.09, prof + 0.02], [0, 0.04, 0], CREME, 0.04);
  for (const s of [-1, 1]) {
    P.caixa(`jardineira-alca${s}`, 'tronco', 'tronco', [0.06, 0.03, prof + 0.04], [s * larg * 0.27, troncoH - 0.005, 0], CREME, 0.012);
    P.caixa(`jardineira-alca-costas${s}`, 'tronco', 'tronco', [0.06, troncoH * 0.9, 0.03], [s * larg * 0.24, troncoH * 0.52, -prof / 2 - 0.006], CREME, 0.012, {
      rot: [0, 0, s * 0.18],
    });
    P.caixa(`jardineira-alca-frente${s}`, 'tronco', 'tronco', [0.06, troncoH * 0.36, 0.03], [s * larg * 0.27, troncoH * 0.8, frente + 0.006], CREME, 0.012);
    P.bola(`jardineira-botao${s}`, 'tronco', 'tronco', 0.024, [s * larg * 0.27, troncoH * 0.64, frente + 0.03], '#ffc93d', [1, 1, 0.5], { brilho: 0.8 });
  }
  P.caixa('jardineira-bolso', 'tronco', 'tronco', [0.15, 0.1, 0.02], [0.03, troncoH * 0.36, frente + 0.024], CREME_ESC, 0.02);
  // o pincel no bolso: o cabo de madeira e a ponta azul
  P.cone('jardineira-pincel', 'tronco', 'tronco', 0.2, 0.014, 0.012, [-0.02, troncoH * 0.48, frente + 0.03], '#c98a4a', { rot: [0, 0, 0.25] });
  P.caixa('jardineira-pincel-metal', 'tronco', 'tronco', [0.032, 0.03, 0.024], [-0.045, troncoH * 0.48 + 0.11, frente + 0.03], '#dfe3ee', 0.006, { rot: [0, 0, 0.25] });
  P.cone('jardineira-pincel-ponta', 'tronco', 'tronco', 0.05, 0.016, 0.004, [-0.056, troncoH * 0.48 + 0.15, frente + 0.03], '#4fa3ff', { rot: [0, 0, 0.25] });
  // os respingos de tinta (azul, amarelo e rosa): no peitilho, na calça e nas costas
  const respingos: Array<[string, Junta, V3, number, string, number]> = [
    ['peito1', 'tronco', [-0.1, troncoH * 0.5, frente + 0.022], 0.028, '#4fa3ff', 0],
    ['peito2', 'tronco', [0.07, troncoH * 0.18, frente + 0.022], 0.022, '#ff7fae', 1],
    ['peito3', 'tronco', [-0.05, troncoH * 0.22, frente + 0.022], 0.016, '#ffcf3a', 2],
    ['cos', 'tronco', [0.16, 0.05, frente + 0.016], 0.02, '#4fa3ff', 3],
    ['costas', 'tronco', [0.05, troncoH * 0.4, -prof / 2 - 0.006], 0.035, '#ffcf3a', 4],
    ['pernaE1', 'pernaE', [0.02, -0.08, 0.096], 0.03, '#ff7fae', 5],
    ['pernaE2', 'pernaE', [-0.03, -0.18, 0.096], 0.018, '#4fa3ff', 6],
    ['pernaD1', 'pernaD', [-0.02, -0.14, 0.096], 0.028, '#ffcf3a', 7],
    ['pernaD2', 'pernaD', [0.04, -0.05, 0.096], 0.016, '#ff7fae', 8],
  ];
  for (const [n, junta, pos, r, cor, f] of respingos)
    P.placa(`jardineira-respingo-${n}`, junta, undefined, perfilRespingo(r, 5 + (f % 3), f), 0.01, pos, cor, {
      rot: [0, n === 'costas' ? Math.PI : 0, f],
      brilho: 0.5,
    });
}

// ------------------------------------------------------------------ costas
function borboleta(P: Pecas, m: Medidas): void {
  const { troncoH, prof } = m;
  const LILAS = '#b48cff';
  const ROSA = '#ff9fd2';
  const BORDA = '#7a4fd0';
  for (const s of [-1, 1]) {
    const nome = s < 0 ? 'borbE' : 'borbD';
    const pivo: V3 = [s * 0.05, troncoH - 0.12, -prof / 2 - 0.03];
    // (espelhada, a volta do contorno inverte: o da esquerda volta ao sentido de sempre, como
    // as asas do dragãozinho)
    const espelhar = (pts: P2[]) => {
      const m = pts.map(([x, y]) => [x * s, y] as P2);
      return s < 0 ? m.reverse() : m;
    };
    const K = 1.4;
    const cima = espelhar(perfilAsaCima(K));
    const baixo = espelhar(perfilAsaBaixo(K));
    // a borda (um tico maior, atrás) e a asa em degradê (lilás perto do corpo, rosa na ponta)
    P.placa(`borboleta-borda-cima${s}`, 'tronco', undefined, espelhar(perfilAsaCima(K * 1.07)), 0.014, [0, -0.012, -0.006], BORDA, sub(nome, pivo));
    P.placa(`borboleta-borda-baixo${s}`, 'tronco', undefined, espelhar(perfilAsaBaixo(K * 1.09)), 0.014, [0, 0.006, -0.006], BORDA, sub(nome, pivo));
    // (a asa colorida dos dois lados da borda: por trás também é lilás e rosa)
    for (const [n, perfil] of [
      ['cima', cima],
      ['baixo', baixo],
    ] as const)
      for (const z of [0.008, -0.02])
        P.placa(`borboleta-asa-${n}${s}${z > 0 ? 'f' : 't'}`, 'tronco', undefined, perfil, 0.012, [0, 0, z], LILAS, {
          viva: true,
          brilho: 0.45,
          pintar: (x, y) => misturarCor(LILAS, ROSA, Math.min(1, Math.hypot(x, y) / (0.5 * K))),
          ...sub(nome, pivo),
        });
    // as bolinhas brancas e uma lilás-escura em cada asa, dos dois lados
    const bolinhas: Array<[number, number, number, string]> = [
      [0.3, 0.32, 0.045, '#ffffff'],
      [0.18, 0.18, 0.03, '#fff3fb'],
      [0.36, 0.14, 0.025, BORDA],
      [0.16, -0.14, 0.03, '#ffffff'],
    ];
    for (const [bx, by, r, cor] of bolinhas)
      for (const lado of [1, -1])
        P.bola(`borboleta-bolinha${s}${bx}${lado}`, 'tronco', undefined, r * K, [s * bx * K, by * K, lado > 0 ? 0.016 : -0.028], cor, [1, 1, 0.3], sub(nome, pivo));
  }
  // o corpinho no meio das costas, onde as asas se prendem
  P.caixa('borboleta-corpo', 'tronco', 'tronco', [0.08, 0.3, 0.06], [0, troncoH - 0.2, -prof / 2 - 0.03], BORDA, 0.035);
}

function foguete(P: Pecas, m: Medidas): void {
  const { troncoH, prof, larg } = m;
  const BRANCO = '#f6f7ff';
  const CORAL = '#ff6b5e';
  const AZUL = '#7fd4ff';
  const z = -prof / 2 - 0.17;
  // (baixo nas costas: o bico não entra na nuca da cabeça grande)
  const y = troncoH * 0.3;
  // o corpo do foguete, o bico e o anel coral, a janelinha (virada para trás) e as aletas
  P.cone('foguete-corpo', 'tronco', 'tronco', 0.32, 0.125, 0.135, [0, y, z], BRANCO, { brilho: 0.55 });
  P.cone('foguete-bico', 'tronco', 'tronco', 0.15, 0.13, 0.012, [0, y + 0.235, z], CORAL, { brilho: 0.5 });
  P.cone('foguete-anel', 'tronco', 'tronco', 0.05, 0.138, 0.138, [0, y + 0.12, z], CORAL, { brilho: 0.5 });
  P.anel('foguete-aro', 'tronco', 'tronco', 0.13, 0.03, [0, y + 0.02, z - 0.13], '#c9cfe0', { rot: [Math.PI / 2, 0, 0], brilho: 0.6 });
  P.bola('foguete-janela', 'tronco', 'tronco', 0.055, [0, y + 0.02, z - 0.125], AZUL, [1, 1, 0.4], { brilho: 0.8 });
  P.bola('foguete-reflexo', 'tronco', 'tronco', 0.016, [-0.018, y + 0.04, z - 0.147], '#ffffff', [1, 1, 0.4]);
  for (const a of [-Math.PI / 2, Math.PI / 2, Math.PI]) {
    const x = Math.sin(a) * 0.14;
    const zz = z + Math.cos(a) * 0.14;
    P.placa(
      `foguete-aleta${a.toFixed(1)}`,
      'tronco',
      'tronco',
      [
        [0, 0.1],
        [0, -0.08],
        [0.11, -0.12],
        [0.09, -0.02],
      ],
      0.022,
      [x, y - 0.1, zz],
      CORAL,
      { rot: [0, a - Math.PI / 2, 0], brilho: 0.5 },
    );
  }
  // o bocal e a chaminha mansa (luz morna, pequena)
  P.cone('foguete-bocal', 'tronco', 'tronco', 0.06, 0.07, 0.1, [0, y - 0.19, z], '#5a5870', { brilho: 0.6 });
  P.cone('luz-chama-foguete', 'tronco', 'tronco', 0.12, 0.05, 0.008, [0, y - 0.28, z], '#ffd27a', { rot: [Math.PI, 0, 0], luz: 'perola' });
  // as alças pelos ombros
  for (const s of [-1, 1]) {
    P.caixa(`foguete-alca${s}`, 'tronco', 'tronco', [0.06, 0.035, prof + 0.06], [s * larg * 0.27, troncoH + 0.005, 0], CORAL, 0.014);
    P.caixa(`foguete-alca-frente${s}`, 'tronco', 'tronco', [0.06, troncoH * 0.55, 0.03], [s * larg * 0.28, troncoH * 0.72, m.frente + 0.006], CORAL, 0.014);
  }
}

// ------------------------------------------------------------------ na mão
function varinha(P: Pecas): void {
  const TURQUESA = '#2fc7d8';
  const LILAS = '#b48cff';
  // o cabo sai da mão para a frente e para cima (o braço levantado leva a varinha ao alto)
  P.cone('varinha-cabo', 'maoD', 'mao', 0.36, 0.026, 0.022, [0, -0.2, 0.02], TURQUESA, { brilho: 0.5 });
  for (let i = 0; i < 3; i++)
    P.cone(`varinha-listra${i}`, 'maoD', 'mao', 0.025, 0.028, 0.028, [0, -0.1 - i * 0.09, 0.02], '#ffffff', { brilho: 0.5 });
  P.bola('varinha-pomo', 'maoD', 'mao', 0.04, [0, 0.03, 0.02], LILAS, [1, 1, 1], { brilho: 0.5 });
  // o aro das bolhas, na ponta, com a película de sabão
  P.anel('varinha-aro', 'maoD', 'mao', 0.2, 0.03, [0, -0.47, 0.02], LILAS, { rot: [0, 0, Math.PI / 2], brilho: 0.6 });
  P.cone('varinha-pelicula', 'maoD', 'mao', 0.006, 0.09, 0.09, [0, -0.47, 0.02], '#dff4ff', {
    rot: [0, 0, Math.PI / 2],
    alfa: 0.35,
    brilho: 0.9,
  });
}

// ------------------------------------------------------------------ vestir
/** Acrescenta ao plano as peças do candidato (os bichinhos vêm à parte, em `lojinhaBichos.ts`). */
export function vestirCandidato(id: IdCandidato | null, plano: PlanoBoneco): void {
  if (!id) return;
  const P = new Pecas(plano.pecas);
  const m = medir(plano);
  if (id === 'patinete') patinete(P);
  else if (id === 'carrinho') carrinho(P);
  else if (id === 'bicicleta') bicicleta(P);
  else if (id === 'nuvem') nuvem(P);
  else if (id === 'coroa') coroa(P, m);
  else if (id === 'bone') bone(P, m);
  else if (id === 'explorador') explorador(P, m);
  else if (id === 'pijama') pijama(P, m);
  else if (id === 'jardineira') jardineira(P, m);
  else if (id === 'borboleta') borboleta(P, m);
  else if (id === 'foguete') foguete(P, m);
  else if (id === 'bolhas') varinha(P);
}

/** As cores das luzes do esboço (pelo nome da peça: `luz-<cor>-...`). */
export const CORES_LUZ: Record<string, string> = {
  menta: '#5fe8cf',
  creme: '#fff1c8',
  chama: '#ffc86a',
};
