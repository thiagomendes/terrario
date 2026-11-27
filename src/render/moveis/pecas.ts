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
  lua: '#e9dcae',
  luaAcesa: '#fff1b0',
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
};

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
  }
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
  // a almofadinha manteiga no canto
  r.caixa(0.34, 0.32, 0.12, -0.6, 0.48, -0.05, M.manteiga, 0.07);
  r.caixa(0.06, 0.06, 0.02, -0.6, 0.62, 0.015, M.creme, 0.02);
}

/**
 * A mantinha do sofá (de noite, quem não tem cama deita no sofá, encolhidinha): creme de
 * quadradinhos coral, por cima do corpo inteiro, de um braço ao outro, caindo na frente do
 * assento. Só aparece com alguém deitado; a pose estica a altura dela ao corpo.
 */
function mantaDoSofa(o: Oficina): void {
  const H = 0.4;
  const B = 0.1;
  // (a cabeça fica no braço do lado da âncora, em +x aqui; a manta cobre do pescoço aos pés)
  const x0 = -0.8;
  const x1 = 0.04;
  const cx = (x0 + x1) / 2;
  const w = x1 - x0;
  o.parte(
    'edredom',
    [0, 0.49, 0.06],
    (p) => {
      p.caixa(w, H, 0.72, cx, -B, 0, M.creme, 0.1);
      // a beirada que cai na frente do assento
      p.caixa(w - 0.04, 0.2, 0.05, cx, -0.24, 0.37, M.creme, 0.02);
      for (let i = 0; i < 2; i++)
        for (let k = 0; k < 2; k++)
          if ((i + k) % 2 === 0) p.caixa(0.3, 0.012, 0.26, x0 + 0.24 + i * 0.36, H - B, -0.16 + k * 0.32, M.coral, 0);
      p.caixa(w - 0.04, 0.03, 0.05, cx, H - B - 0.03, 0.34, M.coral, 0.01);
    },
    { topo: H - B },
  );
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
  edredom(o, 0.44, EDREDOM.inicio, EDREDOM.fim);
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
  edredom(o, 0.44, -0.12, 0.47);
}

/**
 * O edredom de quando a criança deita: uma peça só, fofa e baixa, do queixo até os pés (nada do
 * corpo aparece no meio), a dobra do lençol perto do queixo e a beirada caindo até o colchão. Só
 * a cabeça fica de fora, no travesseiro. A pose ajusta a altura dele ao corpo deitado.
 */
function edredom(o: Oficina, colchao: number, z0: number, z1: number): void {
  const { altura: H, beirada: B } = EDREDOM;
  o.parte('edredom', [0, colchao, 0], (p) => desenharEdredom(p, H, B, z0, z1), { topo: H - B });
}
function desenharEdredom(p: Ref, H: number, B: number, z0: number, z1: number): void {
  {
    p.caixa(1.0, H, z1 - z0, 0, -B, (z0 + z1) / 2, M.cobertor, 0.1);
    // o lombinho do corpo, mansinho
    p.caixa(0.84, 0.04, Math.min(0.5, (z1 - z0) * 0.45), 0, H - B - 0.02, z0 + 0.3, M.cobertor, 0.02);
    p.caixa(0.98, 0.08, 0.14, 0, H - B - 0.05, z0 + 0.04, '#ffffff', 0.04);
    // os retalhos de cima
    for (let i = 0, z = z0 + 0.36; z < z1 - 0.12; i++, z += 0.32)
      for (const x of [-0.24, 0.24])
        if ((i + (x > 0 ? 1 : 0)) % 2 === 0) p.caixa(0.36, 0.012, 0.22, x, H - B + (i === 0 ? 0.02 : 0), z, M.cobertorEscuro, 0);
  }
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
  r.caixa(0.14, 0.04, 0.14, 0.05, 0.54, -0.02, M.creme, 0.015);
  const cor = aceso ? M.luaAcesa : M.lua;
  const y = 0.58;
  r.prisma(10, 0.09, 0.06, 0.05, y + 0.03, -0.02, cor, 'y', aceso);
  r.prisma(10, 0.12, 0.08, 0.05, y + 0.1, -0.02, cor, 'y', aceso);
  r.prisma(10, 0.11, 0.06, 0.05, y + 0.17, -0.02, cor, 'y', aceso);
  r.prisma(10, 0.07, 0.04, 0.05, y + 0.22, -0.02, cor, 'y', aceso);
}
