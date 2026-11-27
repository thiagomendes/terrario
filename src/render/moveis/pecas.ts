/**
 * Spec 039 (T05): o desenho dos móveis da parte 1, saído do esboço aprovado pelo dono (os estilos
 * recomendados e a escala da segunda volta, pela conta de proporção com o boneco: os assentos a
 * 0,64, o colchão a 0,55, a bancada a 1,06, o guarda-roupa até os dois blocos).
 *
 * Peças de brinquedo, quadradas e de quina macia, com as ferramentas das peças da Vila Neon (`Ref`:
 * caixa, barra, prisma) e a cor nos vértices. Duas ou três cores por móvel, nada de arco-íris,
 * nada copiado de outro jogo.
 *
 * Coordenadas de cada modelo: a origem no meio do pé do móvel inteiro, no chão; x para a direita
 * de quem olha a frente do móvel, y para cima, z para a frente. A cama é a exceção: a frente dela
 * é o pé (a cabeceira fica em -z).
 *
 * O que mexe vai numa `parte` (no referencial dela, o pivô na origem): as portas do guarda-roupa
 * (paradas, entram fechadas no corpo), a água e as bolhas da pia (só abertas) e o edredom da cama
 * (só com alguém deitado; parado, o cobertor esticado entra no corpo).
 */
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Bloco } from '../../world/blocks';
import { Pecas, mover, type V3 } from '../solidos';
import { Ref, type Desenho } from '../vila/ref';
import type { PecaVila } from '../../world/vilaNeon';

/** A paleta da casinha (madeira de mel, creme, coral, menta, azul e manteiga). */
export const COR_MOVEL = {
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
  manteiga: '#f5d06a',
  grafite: '#3a3944',
  cromo: '#d4d8e2',
  quente: '#ffe2a0',
  lua: '#f2d675',
  luaAcesa: '#fff1b0',
  manta: '#fcedcf',
  mantaSombra: '#f0d9ae',
  // spec 039b: a parte 2
  preto: '#24232a',
  vidro: '#26313b',
  chama: '#ffa64a',
  luzFria: '#eef8ff',
} as const;
const M = COR_MOVEL;

/**
 * A escala de cada móvel sobre o desenho do esboço (x, y, z): a da segunda volta, pela conta de
 * proporção com o boneco (o estudo, seção 7). Cabe sempre nas células do móvel.
 */
export const ESCALA_MOVEL: Readonly<Record<number, V3>> = {
  [Bloco.SOFA]: [1, 1.3, 1.1],
  [Bloco.CADEIRA]: [1.2, 1.2, 1.2],
  [Bloco.CRIADO_MUDO]: [1.2, 1.3, 1.2],
  [Bloco.CRIADO_MUDO_ACESO]: [1.2, 1.3, 1.2],
  [Bloco.ABAJUR]: [1.2, 1.25, 1.2],
  [Bloco.ABAJUR_ACESO]: [1.2, 1.25, 1.2],
  [Bloco.TAPETE]: [1, 1, 1],
  [Bloco.PIA]: [1.05, 1.15, 1.05],
  [Bloco.GUARDA_ROUPA]: [1.05, 1, 1.1],
  [Bloco.CAMA]: [1, 1.25, 1],
  // spec 039b: a parte 2 (a do esboço; o fogão e a mesa um tico mais baixos, para caber na célula
  // e no tampo da colisão, a 0,875)
  [Bloco.FOGAO]: [1.1, 0.92, 1.1],
  [Bloco.GELADEIRA]: [1.08, 1.07, 1.05],
  [Bloco.MESA]: [1.05, 1.12, 1.1],
  [Bloco.TV]: [1.05, 1.25, 1.1],
  [Bloco.SOM]: [1, 1, 1],
};

/**
 * Spec 039b: a tela da TV no modelo (o meio, já na escala, e o tamanho): o desenho que passa vai
 * num retângulo aqui, um tico na frente do vidro.
 */
export const TELA_TV = { meio: [0, 1.07 * 1.25, 0.072 * 1.1] as V3, w: 1.08 * 1.05, h: 0.6 * 1.25 };

/** As medidas que a pose de deitar lê (já na escala): o colchão, o travesseiro e a cabeceira. */
export const MEDIDA_CAMA = {
  /** O alto do colchão. */
  colchao: 0.44 * 1.25,
  /** O alto do travesseiro acima do colchão. */
  travesseiro: 0.15 * 1.25,
  /** A cabeceira por dentro, a partir do meio da cama (em -z). */
  cabeceira: 0.87,
  /** A curtinha: a cabeceira por dentro, a partir do meio da célula. */
  cabeceiraCurtinha: 0.38,
} as const;
/** O edredom (antes da escala): a altura, a beirada que cai, e onde começa e acaba em z. */
export const EDREDOM = { altura: 0.42, beirada: 0.12, inicio: -0.24, fim: 0.95 } as const;

/** Uma parte que mexe: o pivô (no modelo) e o desenho dela no referencial do pivô. */
export interface ParteModelo {
  pivo: V3;
  corpo: VertexData | null;
  luz: VertexData | null;
  /** A água da pia: meio transparente. */
  agua?: boolean;
  /** O edredom e a manta: o alto da coberta acima do pivô (na escala), que a pose estica. */
  topo?: number;
}
export interface ModeloMovel {
  /** O móvel parado (as partes de repouso já no lugar). */
  corpo: VertexData | null;
  luz: VertexData | null;
  /** O móvel sem as partes de repouso (para quando elas mexem). */
  corpoSemPartes: VertexData | null;
  luzSemPartes: VertexData | null;
  partes: Readonly<Record<string, ParteModelo>>;
}

/**
 * O `Ref` com a escala do móvel em cada eixo: as caixas e as barras crescem em cada eixo, e o
 * redondo (os prismas: botões, rolos, cúpulas) cresce por igual, sem virar oval.
 */
class RefEscala extends Ref {
  constructor(
    d: Desenho,
    p: PecaVila,
    readonly esc: V3,
  ) {
    super(d, p);
  }
  override caixa(w: number, h: number, d: number, x: number, y: number, z: number, cor: string, b = 0.03, luz = false): void {
    const [a, c, e] = this.esc;
    super.caixa(w * a, h * c, d * e, x * a, y * c, z * e, cor, b, luz);
  }
  override barra(p: V3, q: V3, lado: number, cor: string, luz = false): void {
    const [a, c, e] = this.esc;
    super.barra([p[0] * a, p[1] * c, p[2] * e], [q[0] * a, q[1] * c, q[2] * e], lado * Math.min(a, e), cor, luz);
  }
  override placa(perfil: Array<[number, number]>, esp: number, x: number, y: number, z: number, cor: string, luz = false): void {
    const [a, c, e] = this.esc;
    const k = Math.min(a, c);
    super.placa(perfil.map(([u, v]) => [u * k, v * k] as [number, number]), esp * e, x * a, y * c, z * e, cor, luz);
  }
  override prisma(n: number, r: number, larg: number, x: number, y: number, z: number, cor: string, eixo: 'x' | 'y' | 'z' = 'z', luz = false): void {
    const [a, c, e] = this.esc;
    const raio = eixo === 'y' ? Math.min(a, e) : eixo === 'z' ? Math.min(a, c) : Math.min(c, e);
    const comp = eixo === 'x' ? a : eixo === 'y' ? c : e;
    super.prisma(n, r * raio, larg * comp, x * a, y * c, z * e, cor, eixo, luz);
  }
}

const NA_ORIGEM: PecaVila = { tipo: 'banco', x: 0, y: 0, z: 0, dir: 0 };
function desenho(): Desenho {
  return {
    corpo: new Pecas(),
    luz: new Pecas(),
    noite: new Pecas(),
    vidro: new Pecas(),
    quadros: [],
    ox: 0,
    oz: 0,
    chao: 0,
    recorte: { x0: -Infinity, z0: -Infinity, x1: Infinity, z1: Infinity },
  };
}

interface Oficina {
  r: Ref;
  /**
   * Uma parte que mexe, com o pivô em `pivo` (antes da escala). `repouso`: parada, ela entra no
   * corpo no lugar dela (as portas fechadas, o cobertor esticado).
   */
  parte(nome: string, pivo: V3, desenhar: (r: Ref) => void, op?: { repouso?: boolean; agua?: boolean; topo?: number }): void;
}

export const copia = (vd: VertexData): VertexData => {
  const c = new VertexData();
  c.positions = Array.from(vd.positions!);
  c.normals = vd.normals ? Array.from(vd.normals) : null;
  c.colors = vd.colors ? Array.from(vd.colors) : null;
  c.indices = Array.from(vd.indices!);
  c.uvs = null;
  return c;
};
const juntar = (p: Pecas): VertexData | null => (p.partes.length ? p.juntar() : null);

/**
 * Monta o modelo do móvel `bloco` (a curtinha: a cama numa célula só). Puro de cena: só a
 * geometria, montada uma vez por quem desenha.
 */
export function montarModeloMovel(bloco: number, curtinha = false): ModeloMovel {
  const E = ESCALA_MOVEL[bloco] ?? [1, 1, 1];
  const d = desenho();
  /** As partes de repouso no lugar delas (entram só no corpo parado). */
  const repouso = { corpo: [] as VertexData[], luz: [] as VertexData[] };
  const partes: Record<string, ParteModelo> = {};
  const o: Oficina = {
    r: new RefEscala(d, NA_ORIGEM, E),
    parte(nome, pivo, desenhar, op) {
      const dp = desenho();
      desenhar(new RefEscala(dp, NA_ORIGEM, E));
      const p: V3 = [pivo[0] * E[0], pivo[1] * E[1], pivo[2] * E[2]];
      const corpo = juntar(dp.corpo);
      const luz = juntar(dp.luz);
      partes[nome] = {
        pivo: p,
        corpo,
        luz,
        ...(op?.agua ? { agua: true } : {}),
        ...(op?.topo !== undefined ? { topo: op.topo * E[1] } : {}),
      };
      if (op?.repouso) {
        if (corpo) repouso.corpo.push(mover(copia(corpo), p));
        if (luz) repouso.luz.push(mover(copia(luz), p));
      }
    },
  };
  desenhar(o, bloco, curtinha);
  // (o `juntar` das peças muda a primeira: o corpo parado sai de cópias)
  const com = (base: Pecas, extra: VertexData[]): VertexData | null => {
    const p = new Pecas();
    p.partes.push(...base.partes.map(copia), ...extra);
    return juntar(p);
  };
  return {
    corpo: com(d.corpo, repouso.corpo),
    luz: com(d.luz, repouso.luz),
    corpoSemPartes: juntar(d.corpo),
    luzSemPartes: juntar(d.luz),
    partes,
  };
}

function desenhar(o: Oficina, bloco: number, curtinha: boolean): void {
  switch (bloco) {
    case Bloco.SOFA:
      sofa(o.r);
      almofadaDoSofa(o);
      return mantaDoSofa(o);
    case Bloco.CADEIRA:
      return cadeira(o.r);
    case Bloco.CRIADO_MUDO:
    case Bloco.CRIADO_MUDO_ACESO:
      return criadoMudo(o.r, bloco === Bloco.CRIADO_MUDO_ACESO);
    case Bloco.ABAJUR:
    case Bloco.ABAJUR_ACESO:
      return abajur(o.r, bloco === Bloco.ABAJUR_ACESO);
    case Bloco.TAPETE:
      return tapete(o.r);
    case Bloco.PIA:
      return pia(o);
    case Bloco.GUARDA_ROUPA:
      return guardaRoupa(o);
    case Bloco.CAMA:
      return curtinha ? camaCurtinha(o) : cama(o);
    case Bloco.FOGAO:
      return fogao(o);
    case Bloco.GELADEIRA:
      return geladeira(o);
    case Bloco.MESA:
      return mesa(o.r);
    case Bloco.TV:
      return tv(o.r);
    case Bloco.SOM:
      return som(o);
  }
}

// ================================================================== a parte 2 (spec 039b)

/**
 * O fogão creme: o forno de janelinha, os quatro botões, as quatro bocas e a panela coral. Ligado
 * (cozinhando), o anel laranja manso nas bocas e o vapor de cubinhos (as partes `anel` e `vapor`,
 * que só aparecem cozinhando; de brinquedo, sem fogo de verdade nem fumaça escura).
 */
function fogao(o: Oficina): void {
  const r = o.r;
  r.caixa(0.84, 0.05, 0.56, 0, 0, 0, M.grafite, 0.02);
  r.caixa(0.9, 0.84, 0.62, 0, 0.05, 0, M.creme, 0.06);
  r.caixa(0.72, 0.46, 0.03, 0, 0.12, 0.31, M.branco, 0.03);
  r.caixa(0.5, 0.24, 0.02, 0, 0.22, 0.33, M.vidro, 0.03);
  r.barra([-0.26, 0.62, 0.36], [0.26, 0.62, 0.36], 0.035, M.cromo);
  for (const x of [-0.3, -0.1, 0.1, 0.3]) r.prisma(10, 0.04, 0.04, x, 0.76, 0.33, M.coral, 'z');
  r.caixa(0.9, 0.2, 0.06, 0, 0.89, -0.28, M.creme, 0.03);
  // as costas: o painel com as duas frisas e o rodapé
  r.caixa(0.78, 0.6, 0.012, 0, 0.15, -0.316, M.branco, 0.01);
  for (const y of [0.32, 0.56]) r.caixa(0.7, 0.03, 0.014, 0, y, -0.322, M.cromo, 0);
  r.caixa(0.9, 0.08, 0.02, 0, 0.05, -0.318, M.grafite, 0.01);
  for (const [x, z] of BOCAS) {
    r.prisma(12, 0.11, 0.02, x, 0.9, z, M.grafite, 'y');
    r.prisma(12, 0.06, 0.024, x, 0.9, z, M.preto, 'y');
  }
  // a panela na boca da frente, com a tampa e o puxador
  r.prisma(12, 0.15, 0.14, 0.2, 0.98, 0.14, M.coral, 'y');
  r.caixa(0.08, 0.03, 0.04, 0.39, 1.0, 0.14, M.coralEscuro, 0.01);
  r.prisma(12, 0.16, 0.025, 0.2, 1.062, 0.14, M.coralEscuro, 'y');
  r.prisma(8, 0.035, 0.04, 0.2, 1.09, 0.14, M.creme, 'y');
  // cozinhando: o anel laranja manso, liso, na boca da panela (aparece em volta do fundo dela) e
  // os três cubinhos de vapor saindo da tampa
  o.parte('anel', [0.2, 0.905, 0.14], (p) => p.prisma(18, 0.2, 0.016, 0, 0, 0, M.chama, 'y'));
  // (cinco bolinhas de vapor, uma atrás da outra: com três, ele quase sumia entre uma e outra)
  for (let i = 0; i < VAPORES; i++) o.parte(`vapor${i}`, [0.2, 1.1, 0.14], (p) => p.caixa(0.12, 0.12, 0.12, 0, 0, 0, M.branco, 0.055));
}
/** Quantas bolinhas de vapor o fogão solta cozinhando. */
export const VAPORES = 5;
const BOCAS: Array<[number, number]> = [
  [-0.2, -0.12],
  [0.2, -0.12],
  [-0.2, 0.14],
  [0.2, 0.14],
];

/**
 * A geladeira menta de duas portas (2 de altura): a de baixo abre na dobradiça da direita e mostra
 * a luz de dentro, as prateleiras e a comidinha (a `porta` fica fechada no corpo; a `luzDentro` e
 * a `comidinha` só aparecem com ela aberta).
 */
function geladeira(o: Oficina): void {
  const r = o.r;
  const W = 0.9;
  const D = 0.68;
  const A = 1.86;
  r.caixa(W, 0.1, D, 0, 0, 0, M.mentaEscura, 0.03);
  for (const s of [-1, 1]) r.caixa(0.06, A - 0.1, D, s * (W / 2 - 0.03), 0.1, 0, M.menta, 0.03);
  r.caixa(W, 0.06, D, 0, A - 0.06, 0, M.menta, 0.04);
  r.caixa(W - 0.12, A - 0.16, 0.05, 0, 0.1, -D / 2 + 0.025, M.menta, 0.01);
  // as costas: a grade da serpentina (as barrinhas) e as duas hastes
  for (let i = 0; i < 6; i++) r.caixa(W - 0.24, 0.025, 0.012, 0, 0.36 + i * 0.2, -D / 2 - 0.004, M.mentaEscura, 0);
  for (const x of [-0.3, 0.3]) r.caixa(0.025, 1.04, 0.012, x, 0.35, -D / 2 - 0.006, M.mentaEscura, 0);
  r.caixa(W - 0.12, 0.05, D - 0.06, 0, 1.36, 0.0, M.menta, 0.01);
  r.caixa(W - 0.13, 1.24, 0.02, 0, 0.11, -D / 2 + 0.06, M.branco, 0);
  for (const y of [0.52, 0.94]) r.caixa(W - 0.13, 0.025, D - 0.14, 0, y, -0.02, M.branco, 0.005);
  // a luz de dentro (o forro claro aceso) e a comidinha, só com a porta aberta
  o.parte('luzDentro', [0, 0.11, -D / 2 + 0.072], (p) => p.caixa(W - 0.16, 1.22, 0.006, 0, 0, 0, M.luzFria, 0));
  o.parte('comidinha', [0, 0, 0], (p) => {
    p.prisma(8, 0.07, 0.26, -0.22, 0.27, -0.05, M.branco, 'y');
    p.prisma(8, 0.05, 0.06, -0.22, 0.42, -0.05, M.azulEscuro, 'y');
    p.caixa(0.14, 0.22, 0.1, 0.0, 0.14, -0.06, '#f29a3a', 0.02);
    p.caixa(0.14, 0.05, 0.101, 0.0, 0.24, -0.06, M.branco, 0);
    p.prisma(8, 0.05, 0.16, 0.22, 0.22, -0.04, M.coral, 'y');
    p.caixa(0.2, 0.12, 0.16, -0.18, 0.545, -0.04, M.creme, 0.02);
    p.caixa(0.2, 0.035, 0.16, -0.18, 0.665, -0.04, '#f2a6b8', 0.015);
    p.caixa(0.04, 0.04, 0.04, -0.18, 0.7, -0.04, M.coralEscuro, 0.015);
    for (const [x, z] of [
      [0.12, -0.02],
      [0.2, -0.08],
      [0.24, 0.02],
      [0.16, 0.06],
    ] as const)
      p.prisma(8, 0.045, 0.07, x, 0.58, z, '#d8343a', 'y');
    p.caixa(0.22, 0.04, 0.14, 0.12, 0.965, -0.04, M.branco, 0.015);
    for (const x of [0.06, 0.12, 0.18]) p.prisma(8, 0.03, 0.07, x, 1.03, -0.04, M.creme, 'y');
    p.caixa(0.16, 0.08, 0.1, -0.18, 0.965, -0.04, M.manteiga, 0.02);
  });
  // a porta do congelador (fica fechada) e a grande, com o pivô na dobradiça da direita
  r.caixa(W, 0.46, 0.08, 0, 1.4, D / 2 + 0.04, M.menta, 0.05);
  // (os puxadores gordinhos e a fresta escura entre as portas: no ícone pequeno, a frente se lê)
  r.barra([-W / 2 + 0.1, 1.48, D / 2 + 0.11], [-W / 2 + 0.1, 1.72, D / 2 + 0.11], 0.065, M.cromo);
  r.caixa(W - 0.04, 0.035, 0.02, 0, 1.365, D / 2 + 0.07, M.mentaEscura, 0);
  r.prisma(8, 0.04, 0.03, 0.12, 1.62, D / 2 + 0.095, M.azulEscuro, 'z');
  o.parte(
    'porta',
    [W / 2, 0.1, D / 2],
    (p) => {
      p.caixa(W, 1.26, 0.08, -W / 2, 0, 0.04, M.menta, 0.05);
      p.barra([-W + 0.1, 0.84, 0.11], [-W + 0.1, 1.14, 0.11], 0.065, M.cromo);
      // o desenho da criança preso na porta (a folha creme com o solzinho e o ímã): a frente se
      // reconhece de longe e no ícone
      p.caixa(0.34, 0.3, 0.012, -W / 2 + 0.06, 0.62, 0.086, M.creme, 0.01);
      p.prisma(10, 0.07, 0.014, -W / 2 + 0.06, 0.8, 0.094, M.manteiga, 'z');
      p.caixa(0.22, 0.05, 0.014, -W / 2 + 0.06, 0.66, 0.094, M.menta, 0);
      p.prisma(8, 0.03, 0.03, -W / 2 + 0.06, 0.91, 0.1, M.coral, 'z');
      for (const y of [0.84, 1.14]) p.caixa(0.04, 0.04, 0.04, -W + 0.1, y - 0.02, 0.085, M.cromo, 0);
      for (const y of [0.28, 0.72]) {
        p.caixa(W - 0.2, 0.12, 0.08, -W / 2, y, -0.04, M.branco, 0.02);
        p.prisma(8, 0.035, 0.14, -W / 2 - 0.15 + (y > 0.5 ? 0.2 : 0), y + 0.16, -0.04, y > 0.5 ? M.manteiga : M.coral, 'y');
      }
    },
    { repouso: true },
  );
}

/**
 * Spec 039b: o pratinho que aparece na mesa quando alguém põe a comida (na origem: o meio dele no
 * tampo), branco com a borda creme e o copinho azul do lado. Já na escala do mundo.
 */
export function pratinho(): VertexData {
  const dd = desenho();
  const r = new RefEscala(dd, NA_ORIGEM, [1, 1, 1]);
  r.prisma(12, 0.15, 0.02, 0, 0.01, 0, M.branco, 'y');
  r.prisma(12, 0.1, 0.022, 0, 0.012, 0, M.creme, 'y');
  r.prisma(8, 0.04, 0.12, 0.2, 0.06, -0.1, M.azul, 'y');
  return dd.corpo.juntar();
}

/**
 * A mesa de duas células: mel, com a toalha xadrez coral e creme por cima. A toalha fica por
 * dentro do tampo, com a beirada de madeira à mostra em volta (sem barra caindo): da câmera de
 * cima, a toalha encostava no assento da cadeira de trás e parecia entrar nela. O tampo é um tico
 * mais raso que a célula (0,76), com folga para a cadeira encostada.
 */
function mesa(r: Ref): void {
  for (const x of [-0.8, 0.8])
    for (const z of [-0.28, 0.28]) r.caixa(0.1, 0.7, 0.1, x, 0, z, M.melEscuro, 0.02);
  // as travessas de baixo (a mesa de costas também tem cara)
  for (const z of [-0.28, 0.28]) r.caixa(1.5, 0.05, 0.05, 0, 0.18, z, M.mel, 0.015);
  r.caixa(1.84, 0.08, 0.76, 0, 0.7, 0, M.mel, 0.04);
  const n = 8;
  const m = 4;
  const lx = 1.36 / n;
  const lz = 0.6 / m;
  for (let i = 0; i < n; i++)
    for (let k = 0; k < m; k++)
      r.caixa(lx, 0.012, lz, -0.68 + (i + 0.5) * lx, 0.78, -0.3 + (k + 0.5) * lz, (i + k) % 2 ? M.coral : M.creme, 0);
}

/**
 * A TV de rack: a tela larga de moldura azul gordinha no rack de madeira de duas portas, os dois
 * alto-falantes redondos do lado e o botão coral. Ligada, o desenho passa num retângulo na frente
 * do vidro (`TELA_TV`, desenhado pelo `index.ts`).
 */
function tv(r: Ref): void {
  for (const x of [-0.82, 0.82])
    for (const z of [-0.18, 0.18]) r.caixa(0.08, 0.08, 0.08, x, 0, z, M.melEscuro, 0.02);
  r.caixa(1.84, 0.46, 0.5, 0, 0.08, 0, M.mel, 0.05);
  for (const s of [-1, 1]) {
    r.caixa(0.86, 0.36, 0.03, s * 0.45, 0.13, 0.255, M.melClaro, 0.02);
    r.prisma(8, 0.03, 0.03, s * 0.09, 0.31, 0.28, M.melEscuro, 'z');
  }
  // as costas do rack (as tábuas) e as da tela: a tampa gordinha de brinquedo (uma caixa azul
  // funda e redonda, com as frestas e os quatro parafusinhos), não uma folha
  for (let i = 0; i < 4; i++) r.caixa(0.42, 0.34, 0.012, -0.66 + i * 0.44, 0.14, -0.254, M.melClaro, 0.01);
  r.caixa(1.08, 0.66, 0.16, 0, 0.76, -0.16, M.azulEscuro, 0.08);
  for (let i = 0; i < 4; i++) r.caixa(0.6, 0.03, 0.014, 0, 0.9 + i * 0.1, -0.243, M.azul, 0.01);
  for (const [x, y] of [
    [-0.42, 0.84],
    [0.42, 0.84],
    [-0.42, 1.34],
    [0.42, 1.34],
  ] as const)
    r.prisma(8, 0.035, 0.02, x, y, -0.245, M.cromo, 'z');
  r.caixa(0.4, 0.04, 0.24, 0, 0.54, -0.02, M.grafite, 0.015);
  r.caixa(0.12, 0.1, 0.06, 0, 0.58, -0.04, M.grafite, 0.01);
  r.caixa(1.36, 0.86, 0.14, 0, 0.66, -0.02, M.azul, 0.09);
  r.caixa(1.12, 0.64, 0.02, 0, 0.75, 0.055, M.vidro, 0.02);
  // as caixinhas de som em pé no rack, encostadas na moldura (soltas no ar pareciam voar)
  for (const s of [-1, 1]) {
    r.caixa(0.2, 0.3, 0.2, s * 0.8, 0.54, -0.02, M.azulEscuro, 0.05);
    r.prisma(10, 0.07, 0.03, s * 0.8, 0.72, 0.085, M.grafite, 'z');
    r.prisma(8, 0.03, 0.035, s * 0.8, 0.72, 0.09, M.cromo, 'z');
  }
  r.prisma(10, 0.035, 0.03, 0.5, 0.7, 0.06, M.coral, 'z');
  r.caixa(0.1, 0.03, 0.26, 0.62, 0.54, 0.12, M.grafite, 0.015);
  r.caixa(0.04, 0.012, 0.04, 0.62, 0.57, 0.04, M.coral, 0.01);
}

/**
 * O aparelho de som: a caixinha manteiga larga e baixa (a de levar pela alça), os dois alto-falantes
 * lado a lado (os cones pulam com a música), o botão de tocar em cima, a luzinha e as três notinhas
 * que sobem quando toca. Cabe na caixa da colisão (0,75 × 0,62 × 0,69).
 */
function som(o: Oficina): void {
  const r = o.r;
  r.caixa(0.7, 0.04, 0.36, 0, 0, 0, M.grafite, 0.015);
  r.caixa(0.76, 0.5, 0.42, 0, 0.04, 0, M.manteiga, 0.08);
  for (const x of [-0.2, 0.2]) {
    r.prisma(14, 0.15, 0.04, x, 0.27, 0.2, M.grafite, 'z');
    o.parte(
      `cone${x > 0 ? 1 : 0}`,
      [x, 0.27, 0.22],
      (p) => {
        p.prisma(14, 0.11, 0.03, 0, 0, 0, M.preto, 'z');
        p.prisma(10, 0.045, 0.05, 0, 0, 0.01, M.cromo, 'z');
      },
      { repouso: true },
    );
  }
  // a faixa do meio com a luzinha; os botões de tocar em cima
  r.caixa(0.12, 0.1, 0.02, 0, 0.32, 0.205, M.grafite, 0.01);
  r.prisma(12, 0.07, 0.04, 0.18, 0.555, 0.0, M.coral, 'y');
  r.prisma(12, 0.05, 0.04, -0.06, 0.555, 0.0, M.azulEscuro, 'y');
  // as costas: a tampinha da pilha e as frestas
  r.caixa(0.4, 0.22, 0.012, 0, 0.12, -0.214, M.melClaro, 0.01);
  for (let i = 0; i < 3; i++) r.caixa(0.5, 0.02, 0.012, 0, 0.4 + i * 0.035, -0.214, M.grafite, 0);
  // a alça
  for (const x of [-0.26, 0.26]) r.barra([x, 0.52, -0.06], [x, 0.66, -0.06], 0.045, M.grafite);
  r.caixa(0.58, 0.045, 0.06, 0, 0.64, -0.06, M.grafite, 0.02);
  // tocando: a luzinha acesa e as notinhas (a colcheia de blocos: a cabeça, a haste e a bandeirinha)
  o.parte('luzSom', [0, 0.32, 0.217], (p) => p.caixa(0.08, 0.06, 0.006, 0, 0.02, 0, M.menta, 0));
  for (let i = 0; i < 3; i++)
    o.parte(`nota${i}`, [0, 0.72, 0.05], (p) => {
      const cor = i === 1 ? M.coral : M.azulEscuro;
      // a colcheia, como se escreve: a bolinha embaixo, à esquerda da haste, e a bandeirinha que
      // sai do alto da haste para a direita, curvinha, em dois gomos (o +x do modelo fica à
      // esquerda de quem olha a frente: por isso a haste e a bandeirinha vão para -x)
      p.prisma(14, 0.085, 0.06, 0, 0.06, 0, cor, 'z');
      p.caixa(0.04, 0.32, 0.045, -0.07, 0.06, 0, cor, 0);
      p.barra([-0.07, 0.375, 0], [-0.15, 0.32, 0], 0.045, cor);
      p.barra([-0.15, 0.32, 0], [-0.18, 0.22, 0], 0.04, cor);
    });
}

// ================================================================== a sala

/** O sofá gordinho coral: almofadas fofas, os rolos nos braços e os botõezinhos. */
function sofa(r: Ref): void {
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
    r.caixa(0.2, 0.52, 0.88, s * 0.87, 0.09, 0, M.coral, 0.08);
    r.prisma(10, 0.13, 0.9, s * 0.87, 0.64, 0, M.coral, 'z');
    r.prisma(10, 0.08, 0.92, s * 0.87, 0.64, 0, M.coralEscuro, 'z');
  }
}

/**
 * A almofadinha manteiga em pé no canto do sofá (uma parte parada no lugar dela): com alguém
 * deitado, ela sai do canto e vira o travesseiro debaixo da cabeça (`almofadaDeitada`).
 */
function almofadaDoSofa(o: Oficina): void {
  o.parte(
    'almofada',
    [-0.6, 0.64, -0.05],
    (p) => {
      p.caixa(0.34, 0.32, 0.12, 0, -0.16, 0, M.manteiga, 0.07);
      p.caixa(0.06, 0.06, 0.02, 0, -0.02, 0.065, M.creme, 0.02);
    },
    { repouso: true },
  );
}

/**
 * A almofadinha do sofá deitada debaixo da cabeça de quem dorme ali (na origem: o meio dela no
 * chão; `w` em x, `d` em z, `h` de alto), com o botão creme em cima. Já na escala do mundo.
 */
export function almofadaDeitada(w: number, h: number, d: number): VertexData {
  const dd = desenho();
  const r = new RefEscala(dd, NA_ORIGEM, [1, 1, 1]);
  r.caixa(w, h, d, 0, 0, 0, M.manteiga, Math.min(0.07, h * 0.45));
  r.caixa(0.07, 0.015, 0.07, 0, h - 0.004, 0, M.creme, 0.006);
  return dd.corpo.juntar();
}

/**
 * A mantinha do sofá (de noite, quem não tem cama deita no sofá, encolhidinha): creme de
 * quadradinhos coral, por cima do corpo inteiro, de um braço ao outro, caindo na frente do
 * assento. Só aparece com alguém deitado; a pose estica a altura dela ao corpo.
 */
function mantaDoSofa(o: Oficina): void {
  // (a cabeça fica na almofadinha do lado da âncora, em +x aqui; a manta vai do pescoço aos pés,
  // com o morrinho dos joelhos dobrados e a beirada caindo na frente do assento)
  const alto = 0.26;
  o.parte(
    'edredom',
    [0, 0.49, 0.06],
    (p) =>
      coberta(p, 'x', {
        ini: -0.8,
        fim: -0.02,
        largura: 0.76,
        alto,
        cair: 0.1,
        cor: M.manta,
        sombra: M.mantaSombra,
        xadrez: M.coral,
        dobra: { lado: 'fim', cor: M.coral },
        montes: [
          { meio: -0.22, comp: 0.36, alto: 0.05 },
          { meio: -0.56, comp: 0.26, alto: 0.12 },
        ],
        frente: 0.3,
      }),
    { topo: alto },
  );
}

/**
 * Uma coberta fofa de brinquedo (o edredom e a manta): a parte baixa, larga, que cai pelos lados
 * até o colchão (ou o assento), o morro do corpo por cima, mais estreito e bem redondo, os
 * morrinhos (os ombros, os joelhos, os pés), a dobra virada na ponta da cabeça e, na manta, a
 * beirada que cai na frente do assento. `eixo`: ao longo de que eixo a coberta corre (z na cama,
 * x no sofá); a largura vai no outro. O alto do morro (acima do pivô) é `alto`.
 */
function coberta(
  p: Ref,
  eixo: 'x' | 'z',
  o: {
    ini: number;
    fim: number;
    largura: number;
    alto: number;
    cair: number;
    cor: string;
    sombra: string;
    xadrez?: string;
    dobra?: { lado: 'ini' | 'fim'; cor: string };
    montes: Array<{ meio: number; comp: number; alto: number }>;
    frente?: number;
  },
): void {
  /** Uma caixa com o comprimento `c` no eixo da coberta e a largura `l` no outro. */
  const cx = (c: number, h: number, l: number, meio: number, y: number, cor: string, b: number, lado = 0) =>
    eixo === 'z' ? p.caixa(l, h, c, lado, y, meio, cor, b) : p.caixa(c, h, l, meio, y, lado, cor, b);
  const comp = o.fim - o.ini;
  const meio = (o.ini + o.fim) / 2;
  // a parte baixa (cai pelos lados) e o morro do corpo, redondo
  cx(comp, o.alto * 0.55 + o.cair, o.largura, meio, -o.cair, o.sombra, 0.06);
  cx(comp - 0.04, o.alto * 0.62, o.largura * 0.84, meio, o.alto * 0.38, o.cor, 0.14);
  for (const m of o.montes) cx(m.comp, m.alto + 0.08, o.largura * 0.66, m.meio, o.alto - 0.08, o.cor, 0.09);
  // os quadradinhos (ou os retalhos) por cima do morro, longe das pontas
  if (o.xadrez)
    for (let i = 0, a = o.ini + 0.16; a < o.fim - 0.12; i++, a += 0.2)
      for (const s of [-1, 1])
        if ((i + (s > 0 ? 1 : 0)) % 2 === 0) cx(0.14, 0.012, o.largura * 0.26, a, o.alto - 0.002, o.xadrez, 0, s * o.largura * 0.2);
  // a dobra virada na ponta da cabeça (o peito): mais alta que o morro, de quina redonda
  if (o.dobra) {
    const a = o.dobra.lado === 'ini' ? o.ini + 0.07 : o.fim - 0.07;
    cx(0.14, o.alto * 0.4 + 0.06, o.largura * 0.9, a, o.alto * 0.68, o.dobra.cor, 0.06);
  }
  // a beirada que cai na frente do assento (a manta do sofá)
  if (o.frente) {
    const z = o.largura / 2 - 0.02;
    if (eixo === 'x') p.caixa(comp - 0.06, o.frente, 0.05, meio, -o.cair - o.frente + 0.1, z, o.sombra, 0.02);
  }
}

/** O tapete de pista (3 × 2): o gramadinho menta, a estrada em volta e o carrinho estacionado. */
function tapete(r: Ref): void {
  const L = 2.94;
  const P = 1.94;
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
  // o carrinho estacionado na estrada da frente
  r.caixa(0.3, 0.08, 0.16, 0, 0.05, b, M.coral, 0.03);
  r.caixa(0.15, 0.07, 0.14, -0.02, 0.13, b, M.creme, 0.025);
  for (const x of [-0.09, 0.09])
    for (const z of [-0.085, 0.085]) r.prisma(8, 0.035, 0.03, x, 0.055, b + z, M.grafite, 'z');
}

/** O abajur de pé: a base e a haste de mel e a cúpula de gomos menta (acesa, fica morna). */
function abajur(r: Ref, aceso: boolean): void {
  r.prisma(8, 0.17, 0.06, 0, 0.03, 0, M.melEscuro, 'y');
  r.barra([0, 0.06, 0], [0, 1.08, 0], 0.05, M.creme);
  const cor = aceso ? M.quente : M.menta;
  const y = 1.06;
  r.prisma(8, 0.27, 0.12, 0, y + 0.06, 0, cor, 'y', aceso);
  r.prisma(8, 0.24, 0.12, 0, y + 0.18, 0, cor, 'y', aceso);
  r.prisma(8, 0.2, 0.1, 0, y + 0.29, 0, cor, 'y', aceso);
  r.prisma(8, 0.285, 0.03, 0, y, 0, M.mentaEscura, 'y');
  r.prisma(6, 0.04, 0.05, 0, y + 0.36, 0, M.mentaEscura, 'y');
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

// ================================================================== a pia

/** A pia: o armário de portinhas menta, o tampo branco, a cuba e a torneira (a água cai ao toque). */
function pia(o: Oficina): void {
  const r = o.r;
  r.caixa(0.84, 0.06, 0.56, 0, 0, -0.02, M.grafite, 0.02);
  r.caixa(0.9, 0.8, 0.6, 0, 0.06, -0.02, M.creme, 0.04);
  for (const s of [-1, 1]) {
    r.caixa(0.41, 0.62, 0.03, s * 0.215, 0.14, 0.29, M.menta, 0.03);
    r.prisma(8, 0.025, 0.03, s * 0.06, 0.62, 0.31, M.cromo, 'z');
  }
  // as costas: o painel menta com os frisos creme e o rodapé, e o verso do azulejo com a faixa
  r.caixa(0.78, 0.6, 0.02, 0, 0.16, -0.325, M.menta, 0.02);
  for (const y of [0.34, 0.56]) r.caixa(0.7, 0.025, 0.012, 0, y, -0.34, M.creme, 0);
  r.caixa(0.9, 0.08, 0.02, 0, 0.06, -0.33, M.grafite, 0.01);
  r.caixa(0.92, 0.06, 0.012, 0, 1.12, -0.335, M.menta, 0);
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
  // a parede de azulejo atrás
  r.caixa(0.96, 0.4, 0.04, 0, 0.92, -0.31, M.branco, 0.01);
  for (let i = 0; i < 4; i++)
    for (let k = 0; k < 2; k++)
      if ((i + k) % 2 === 0) r.caixa(0.2, 0.17, 0.012, -0.33 + i * 0.22, 0.95 + k * 0.19, -0.288, M.azul, 0);
  // o fio d'água fininho e meio transparente (grosso e cheio parecia um tubo) e os pinguinhos
  // caindo do lado dele
  o.parte(
    'agua',
    [0, 1.11, -0.04],
    (p) => {
      p.caixa(0.04, 0.19, 0.04, 0, -0.19, 0, '#8fd6ff', 0.016);
      for (const [x, y, z, k] of [
        [0.035, -0.07, 0.01, 0.022],
        [-0.03, -0.13, -0.005, 0.018],
        [0.028, -0.17, -0.012, 0.016],
      ] as const)
        p.caixa(k, k * 1.3, k, x, y, z, '#8fd6ff', k * 0.45);
    },
    { agua: true },
  );
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

// ================================================================== o quarto

/** A cama do ícone (dois blocos): a cabeceira em degrau, o colchão, o travesseiro e o cobertor. */
function cama(o: Oficina): void {
  const r = o.r;
  // (tudo dentro da largura de uma célula: os postes com a bolinha vão até 0,495 do meio)
  for (const x of [-0.42, 0.42])
    for (const z of [-0.9, 0.9]) r.caixa(0.12, 0.14, 0.12, x, 0, z, M.melEscuro, 0.02);
  for (const s of [-1, 1]) r.caixa(0.08, 0.2, 1.84, s * 0.44, 0.12, 0, M.mel, 0.03);
  r.caixa(0.86, 0.08, 1.82, 0, 0.16, 0, M.melClaro, 0.02);
  // a cabeceira: a tábua alta em degrau e os dois postes com a bolinha
  r.caixa(0.86, 0.88, 0.1, 0, 0.06, -0.92, M.cabeceira, 0.04);
  r.caixa(0.66, 0.08, 0.1, 0, 0.94, -0.92, M.cabeceira, 0.03);
  r.caixa(0.4, 0.06, 0.1, 0, 1.02, -0.92, M.cabeceira, 0.02);
  for (const s of [-1, 1]) {
    r.caixa(0.12, 1.0, 0.12, s * 0.42, 0, -0.92, M.mel, 0.03);
    r.caixa(0.15, 0.1, 0.14, s * 0.42, 1.0, -0.92, M.mel, 0.05);
  }
  r.caixa(0.5, 0.2, 0.02, 0, 0.6, -0.895, M.melClaro, 0.02);
  // a pezeira, baixa
  r.caixa(0.86, 0.44, 0.08, 0, 0.06, 0.93, M.cabeceira, 0.03);
  for (const s of [-1, 1]) r.caixa(0.12, 0.54, 0.12, s * 0.42, 0, 0.93, M.mel, 0.03);
  // o colchão e o travesseiro
  r.caixa(0.86, 0.2, 1.8, 0, 0.24, 0, M.lencol, 0.07);
  r.caixa(0.72, 0.15, 0.36, 0, 0.44, -0.66, '#ffffff', 0.08);
  o.parte(
    'cobertor',
    [0, 0.44, 0.3],
    (p) => {
      p.caixa(0.92, 0.07, 1.22, 0, 0, 0, M.cobertor, 0.04);
      // a dobra do lençol por cima, na ponta da cabeceira
      p.caixa(0.92, 0.06, 0.16, 0, 0.035, -0.55, '#ffffff', 0.03);
      // os retalhos (dois vermelhos) e a costura creme na beirada
      for (let i = 0; i < 3; i++)
        for (let k = 0; k < 4; k++)
          if ((i + k) % 2 === 0) p.caixa(0.27, 0.01, 0.24, -0.29 + i * 0.29, 0.07, -0.31 + k * 0.27, M.cobertorEscuro, 0);
      for (const s of [-1, 1]) p.caixa(0.03, 0.2, 1.2, s * 0.465, -0.17, 0.0, M.cobertor, 0.01);
      p.caixa(0.92, 0.012, 0.03, 0, 0.07, 0.57, M.creme, 0);
    },
    { repouso: true },
  );
  // do peito (o queixo fica logo acima) aos pés: o morro dos ombros e o dos pés
  edredom(o, 0.44, 0.0, 0.9, [
    { meio: 0.24, comp: 0.4, alto: 0.04 },
    { meio: 0.8, comp: 0.16, alto: 0.05 },
  ]);
}

/**
 * A cama curtinha: a cama de antes, onde a nova não coube, com o desenho novo numa célula só. A
 * cabeceira em degrau, o travesseiro e o cobertor de retalhos dobrado no pé.
 */
function camaCurtinha(o: Oficina): void {
  const r = o.r;
  for (const x of [-0.42, 0.42])
    for (const z of [-0.4, 0.4]) r.caixa(0.12, 0.14, 0.12, x, 0, z, M.melEscuro, 0.02);
  for (const s of [-1, 1]) r.caixa(0.08, 0.2, 0.84, s * 0.44, 0.12, 0, M.mel, 0.03);
  r.caixa(0.84, 0.08, 0.84, 0, 0.16, 0, M.melClaro, 0.02);
  r.caixa(0.86, 0.8, 0.1, 0, 0.06, -0.43, M.cabeceira, 0.04);
  r.caixa(0.62, 0.08, 0.1, 0, 0.86, -0.43, M.cabeceira, 0.03);
  for (const s of [-1, 1]) {
    r.caixa(0.12, 0.92, 0.14, s * 0.42, 0, -0.42, M.mel, 0.03);
    r.caixa(0.15, 0.1, 0.15, s * 0.42, 0.92, -0.42, M.mel, 0.05);
  }
  r.caixa(0.86, 0.36, 0.08, 0, 0.06, 0.44, M.cabeceira, 0.03);
  r.caixa(0.84, 0.2, 0.82, 0, 0.24, 0, M.lencol, 0.07);
  r.caixa(0.66, 0.14, 0.26, 0, 0.44, -0.26, '#ffffff', 0.08);
  o.parte(
    'cobertor',
    [0, 0.44, 0.17],
    (p) => {
      p.caixa(0.9, 0.08, 0.5, 0, 0, 0, M.cobertor, 0.04);
      for (const [x, z] of [
        [-0.22, -0.12],
        [0.22, 0.12],
      ] as const)
        p.caixa(0.36, 0.01, 0.22, x, 0.08, z, M.cobertorEscuro, 0);
      for (const s of [-1, 1]) p.caixa(0.03, 0.18, 0.5, s * 0.46, -0.16, 0, M.cobertor, 0.01);
    },
    { repouso: true },
  );
  // a criança encolhidinha: do peito aos pés, com o morrinho dos joelhos dobrados
  edredom(o, 0.44, 0.06, 0.42, [{ meio: 0.28, comp: 0.18, alto: 0.07 }]);
}

/**
 * O edredom de quando a criança deita: uma peça só, fofa e baixa, do queixo até os pés (nada do
 * corpo aparece no meio), a dobra do lençol perto do queixo e a beirada caindo até o colchão. Só
 * a cabeça fica de fora, no travesseiro. A pose ajusta a altura dele ao corpo deitado.
 */
function edredom(
  o: Oficina,
  colchao: number,
  z0: number,
  z1: number,
  montes: Array<{ meio: number; comp: number; alto: number }>,
): void {
  const alto = EDREDOM.altura - EDREDOM.beirada;
  o.parte(
    'edredom',
    [0, colchao, 0],
    (p) =>
      coberta(p, 'z', {
        ini: z0,
        fim: z1,
        largura: 1.0,
        alto,
        cair: EDREDOM.beirada + 0.04,
        cor: M.cobertor,
        sombra: M.cobertorEscuro,
        xadrez: M.cobertorEscuro,
        // a dobra branca do lençol virada por cima, no peito
        dobra: { lado: 'ini', cor: '#ffffff' },
        montes,
      }),
    { topo: alto },
  );
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
  // as costas de madeira: as tábuas de pé (mel, com o friso escuro entre elas), a travessa do
  // meio e o rodapé, para o guarda-roupa ter cara de móvel de qualquer lado
  for (let i = 0; i < 4; i++) r.caixa(W / 4 - 0.04, A - 0.24, 0.02, -W / 2 + W / 8 + (i * W) / 4, 0.16, -D / 2 - 0.005, M.mel, 0.01);
  r.caixa(W - 0.06, 0.08, 0.025, 0, 0.95, -D / 2 - 0.012, M.melClaro, 0.01);
  r.caixa(W, 0.1, 0.03, 0, 0.06, -D / 2 - 0.01, M.melEscuro, 0.01);
  r.caixa(W + 0.08, 0.1, D + 0.06, 0, A - 0.02, 0, M.melEscuro, 0.04);
  r.caixa(0.06, A - 0.2, D - 0.06, 0, 0.16, 0, M.mel, 0.01);
  // dentro: o cabideiro e as três camisetas (coral, azul e manteiga), e as prateleiras
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
  // as portas (pivô na dobradiça de fora de cada uma; paradas, fechadas)
  for (const s of [-1, 1])
    o.parte(
      s < 0 ? 'portaE' : 'portaD',
      [s * (W / 2), 0.12, D / 2],
      (p) => {
        const cx = -s * (W / 4);
        p.caixa(W / 2 - 0.01, A - 0.18, 0.05, cx, 0, 0.025, M.melClaro, 0.03);
        p.caixa(W / 2 - 0.2, A - 0.5, 0.012, cx, 0.16, 0.055, M.mel, 0.01);
        p.prisma(10, 0.045, 0.05, cx - s * (W / 4 - 0.1), 0.86, 0.07, M.melEscuro, 'z');
      },
      { repouso: true },
    );
}

/** O criado-mudo: a caixinha de gaveta e a luminária de lua em cima (acesa, morna). */
function criadoMudo(r: Ref, aceso: boolean): void {
  for (const x of [-0.2, 0.2])
    for (const z of [-0.15, 0.15]) r.caixa(0.06, 0.08, 0.06, x, 0, z, M.melEscuro, 0.015);
  r.caixa(0.56, 0.46, 0.44, 0, 0.08, 0, M.mel, 0.04);
  r.caixa(0.46, 0.16, 0.03, 0, 0.32, 0.22, M.melClaro, 0.02);
  r.caixa(0.46, 0.16, 0.03, 0, 0.12, 0.22, M.melClaro, 0.02);
  for (const y of [0.4, 0.2]) r.prisma(8, 0.025, 0.03, 0, y, 0.24, M.melEscuro, 'z');
  // a luminária de lua: o pezinho creme e a lua em crescente amarelinha, de pé, virada para a
  // frente (apagada também se lê como uma luz; acesa, brilha morna)
  r.prisma(8, 0.07, 0.03, 0.05, 0.555, -0.02, M.creme, 'y');
  r.barra([0.05, 0.57, -0.02], [0.05, 0.62, -0.02], 0.025, M.creme);
  r.placa(perfilCrescente(0.13), 0.06, 0.06, 0.74, -0.02, aceso ? M.luaAcesa : M.lua, aceso);
}

/** A lua em crescente (as pontas para a direita), em volta de (0, 0), com o raio `r`. */
export function perfilCrescente(r: number): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  const n = 18;
  // a borda de fora (da ponta de cima à de baixo, pela esquerda) e a de dentro, de volta
  const a0 = Math.PI * 0.32;
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((Math.PI * 2 - 2 * a0) * i) / n;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const ri = r * 0.78;
  const cx = r * 0.42;
  const b0 = Math.PI * 0.42;
  for (let i = n; i >= 0; i--) {
    const a = b0 + ((Math.PI * 2 - 2 * b0) * i) / n;
    pts.push([cx + Math.cos(a) * ri, Math.sin(a) * ri]);
  }
  // (o contorno no sentido anti-horário, como a estrela: a de fora vai, a de dentro volta)
  return pts;
}
