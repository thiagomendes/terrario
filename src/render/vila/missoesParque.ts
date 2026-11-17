/**
 * As missões do parque na tela (spec 026, parte 2, etapa B): o que a criança vê nas quatro
 * missões novas. As regras e os lugares são de `src/jogo/missoesParque.ts` (a mesma conta do
 * núcleo); aqui ficam as malhas.
 *
 * - **os balões fugidos (f6):** três balões soltos da Dona Flor (vermelho, amarelo e azul, o
 *   mesmo balão facetado do maço dela, com o fio pendurado), presos no pé da roda-gigante, na
 *   copa da árvore e na barra do toldo do carrossel (este gira com ele). No toque, o balão desce
 *   flutuando até a mão da criança, fica um pouco com ela e sobe de volta para a Dona Flor, com
 *   estrelinhas;
 * - **o balão de presente:** quem devolveu os três leva um balão (turquesa ou amarelo) preso na
 *   mão direita, que acompanha com um atraso macio, como balão de verdade. Cópias finas: oito
 *   crianças com balão custam duas chamadas de desenho;
 * - **o lanche das lhamas (f7):** os montes de feno dourado no cocho (nenhum, um ou dois);
 * - **a prenda (f8):** a lhama de pelúcia aparece no balcão da barraca e voa em arco até a
 *   criança; os corações e as estrelinhas em volta da vovó quando ela ganha a prenda.
 *
 * Tudo só com o chão do pedaço desenhado (a regra do campo de visão) e com um número fixo de
 * malhas (nada é criado depois do começo).
 */
import type { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { criarPlasticos } from '../formas';
import { Pecas } from '../solidos';
import type { PecaVila, PlanoVila } from '../../world/vilaNeon';
import { lugarDoBalao } from '../../jogo/missoesParque';
import { COR, Ref, perfilEstrela, type Desenho } from './ref';
import { criarPaletaLuz } from './luzes';
import { balao } from './pecasParque';
import type { Faisca } from './parque';

export interface OpcoesMissoesParque {
  plano: PlanoVila;
  temMalha(cx: number, cz: number): boolean;
  brilha?(m: Mesh): void;
  tapaOGlow?(m: Mesh): void;
  /** Solta partículas do jogo (o feno que cai no cocho, o brilho do balão que vai embora). */
  emitir?(lista: Faisca[], tipo: 'confete' | 'gota'): void;
}

export interface QuadroMissoes {
  /** O relógio da tela (s). */
  t: number;
  /** O relógio do mundo (s): `lugarDoBalao(pq, chao, i, tNucleo)`. */
  tNucleo: number;
  /** Os balões fugidos que esta criança vê (a missão aberta e o balão ainda não devolvido). */
  fugidos: readonly [boolean, boolean, boolean];
  /** A criança deste aparelho: os pés e para onde olha (null: ainda não está no mundo). */
  eu: { x: number; y: number; z: number; yaw: number } | null;
  /** Quem leva o balão de presente agora (a criança daqui também, se tem): os pés e o giro. */
  comBalao: readonly { id: string; x: number; y: number; z: number; yaw: number }[];
  /** Quantas braçadas de feno aparecem no cocho (0 a 2). */
  feno: number;
}

export interface RenderMissoesParque {
  quadro(q: QuadroMissoes): void;
  /**
   * O balão `i` desce de onde está até a mão da criança (~1,2 s), fica com ela (~1,5 s) e sobe
   * embora com estrelinhas (voltou para a Dona Flor). `presente`: era o terceiro.
   */
  pegar(i: number, presente: boolean): void;
  /** A lhama de pelúcia aparece no balcão `de` da barraca e voa em arco até a criança (~1 s). */
  pelucia(de: readonly [number, number, number]): void;
  /** Corações e estrelinhas em volta da vovó (os pés dela em x, y, z). */
  vovo(x: number, y: number, z: number): void;
  /** O feno caiu no cocho: a nuvenzinha de palha. */
  lanche(): void;
  /** Testes: o que está à vista. */
  estado(): { fugidos: number; descendo: number; naMao: number; feno: number; pelucia: boolean };
  descartar(): void;
}

/** O balão fugido é grande, de brinquedo (o maço da Dona Flor é 1,4): vê-se de longe. */
const TAM_FUGIDO = 1.3;
/** O fio do balão fugido (do nó para baixo, na medida do molde). */
const FIO_FUGIDO = 1.1;
/** As cores dos três fugidos (uma cada; nunca em ordem de arco-íris). */
const CORES_FUGIDOS = [COR.vermelho, COR.amarelo, COR.azul] as const;
/** As duas cores do balão de presente (pelo id de quem leva). */
const CORES_PRESENTE = [COR.turquesa, COR.amarelo] as const;
/** Quantos balões de presente de cada cor cabem na tela. */
const MAX_PRESENTES = 8;
/** A mão que segura o fio: quanto para a direita do corpo e a que altura dos pés. */
const MAO = { lado: 0.42, y: 0.8 } as const;
/** O balão de presente flutua este tanto acima da mão (2,5 blocos acima dos pés). */
const ALTURA_PRESENTE = 1.7;
/**
 * O balão de presente puxa um pouco para fora, para o lado da mão: o fio fica à vista ao lado da
 * cabeça (com o balão bem em cima, a câmera atrás via só um balão solto no ar).
 */
const DERIVA_PRESENTE = 0.42;
/** O toque no balão fugido: desce, fica na mão, sobe embora (s). */
const DESCE = 1.2;
const NA_MAO = 1.5;
const SOBE = 1.6;
/** A pelúcia: aparece no balcão, espera um instante e voa (s). */
const PELUCIA_SURGE = 0.45;
const PELUCIA_ESPERA = 0.35;
const PELUCIA_VOA = 1.0;
/** Mais longe que isto (blocos) nada daqui é desenhado. */
const LONGE = 96;
const N_ESTRELAS = 16;
const N_CORACOES = 8;

const desenhoMundo = (): Desenho => ({
  corpo: new Pecas(),
  luz: new Pecas(),
  noite: new Pecas(),
  vidro: new Pecas(),
  quadros: [],
  ox: 0,
  oz: 0,
  chao: 0,
  recorte: { x0: -Infinity, z0: -Infinity, x1: Infinity, z1: Infinity },
});
const NA_ORIGEM = { tipo: 'banco', x: 0, y: 0, z: 0, dir: 0 } as PecaVila;

const CREME = '#f6ecd8';
const CREME2 = '#fff7e6';

/** O balão fugido (o meio do balão em 0, 0, 0): o balão do maço e o fio solto pendurado. */
function balaoFugido(r: Ref, cor: string): void {
  balao(r, 0, 0, 0, cor);
  // o fio cai quase reto, com duas dobrinhas (fio solto de balão)
  r.barra([0, -0.44, 0], [0.04, -0.44 - FIO_FUGIDO * 0.4, 0.02], 0.03, COR.branco);
  r.barra(
    [0.04, -0.44 - FIO_FUGIDO * 0.4, 0.02],
    [-0.03, -0.44 - FIO_FUGIDO * 0.75, -0.01],
    0.03,
    COR.branco,
  );
  r.barra([-0.03, -0.44 - FIO_FUGIDO * 0.75, -0.01], [0, -0.44 - FIO_FUGIDO, 0], 0.03, COR.branco);
}

/** O balão de presente (a mão em 0, 0, 0): o fio esticado, o lacinho e o balão lá em cima. */
function balaoDePresente(r: Ref, cor: string): void {
  r.barra([0, 0, 0], [0, ALTURA_PRESENTE - 0.42, 0], 0.03, COR.branco);
  r.caixa(0.16, 0.06, 0.06, 0, ALTURA_PRESENTE - 0.5, 0, CREME, 0.02);
  balao(r, 0, ALTURA_PRESENTE, 0, cor);
}

/**
 * A lhama de pelúcia (as patinhas em 0, 0, 0; olha para +z): creme, de cachecol vermelho e
 * mantinha azul, as orelhinhas em pé e o topete claro.
 */
export function peluciaDePrenda(r: Ref): void {
  for (const x of [-0.15, 0.15])
    for (const z of [-0.2, 0.2]) r.caixa(0.15, 0.24, 0.15, x, 0, z, '#ecdcc0', 0.04);
  r.caixa(0.5, 0.36, 0.7, 0, 0.2, 0, CREME, 0.09);
  r.caixa(0.11, 0.11, 0.09, 0, 0.42, -0.37, CREME2, 0.03);
  // a mantinha azul, com a barra creme, caindo dos dois lados
  r.caixa(0.54, 0.08, 0.36, 0, 0.5, -0.08, COR.azul, 0.03);
  for (const x of [-0.26, 0.26]) {
    r.caixa(0.04, 0.22, 0.36, x, 0.32, -0.08, COR.azul, 0.015);
    r.caixa(0.045, 0.05, 0.37, x, 0.3, -0.08, CREME2, 0);
  }
  // o pescoço, o cachecol vermelho com a ponta caída e a cabeça
  r.caixa(0.25, 0.44, 0.25, 0, 0.44, 0.22, CREME, 0.06);
  r.caixa(0.31, 0.1, 0.31, 0, 0.6, 0.22, COR.vermelho, 0.035);
  r.caixa(0.1, 0.22, 0.05, 0.09, 0.4, 0.385, COR.vermelho, 0.02);
  r.caixa(0.32, 0.27, 0.36, 0, 0.82, 0.28, CREME, 0.08);
  r.caixa(0.2, 0.14, 0.12, 0, 0.83, 0.49, CREME2, 0.04);
  r.caixa(0.07, 0.04, 0.02, 0, 0.91, 0.555, '#d98a7a', 0);
  for (const x of [-0.1, 0.1]) {
    r.caixa(0.055, 0.065, 0.02, x, 0.975, 0.46, '#3a2a22', 0);
    r.caixa(0.08, 0.17, 0.07, x, 1.06, 0.2, CREME, 0.025);
    r.caixa(0.04, 0.09, 0.02, x, 1.09, 0.236, '#f2c8b4', 0);
  }
  r.caixa(0.18, 0.08, 0.18, 0, 1.07, 0.3, CREME2, 0.03);
}

/** O monte de feno do cocho (a base em 0, 0, 0): três camadas douradas e as palhinhas de pé. */
function monteDeFeno(r: Ref, v: number): void {
  const s = v ? -1 : 1;
  r.caixa(0.78, 0.2, 0.48, 0, 0, 0, '#e8c860', 0.05);
  r.caixa(0.58, 0.16, 0.4, s * 0.05, 0.17, 0.01, '#f0d878', 0.05);
  r.caixa(0.34, 0.12, 0.28, s * -0.04, 0.3, -0.01, '#f6e290', 0.04);
  for (const [x, z, a, h] of [
    [-0.3, 0.12, -0.35, 0.3],
    [0.31, -0.1, 0.4, 0.28],
    [0.12, 0.16, 0.18, 0.34],
    [-0.1, -0.15, -0.15, 0.36],
    [0.02, 0.02, 0.05, 0.3],
  ] as const)
    r.barra(
      [s * x, 0.16, z],
      [s * (x + Math.sin(a) * h), 0.16 + Math.cos(a) * h, z * 1.3],
      0.035,
      '#d9a53a',
    );
}

/** O coração de brinquedo: contorno no plano xy, largura ~1. */
function perfilCoracao(k: number): Array<[number, number]> {
  return (
    [
      [0, -0.5],
      [0.36, -0.14],
      [0.5, 0.12],
      [0.46, 0.34],
      [0.3, 0.48],
      [0.12, 0.46],
      [0, 0.3],
      [-0.12, 0.46],
      [-0.3, 0.48],
      [-0.46, 0.34],
      [-0.5, 0.12],
      [-0.36, -0.14],
    ] as Array<[number, number]>
  ).map(([x, y]) => [x * k, y * k]);
}

const rgb = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16) / 255,
  parseInt(h.slice(3, 5), 16) / 255,
  parseInt(h.slice(5, 7), 16) / 255,
];
const suave = (u: number) => u * u * (3 - 2 * u);
/** De 0 a 1 passando um pouco de 1 (o "pop" das coisas que aparecem). */
const pulo = (u: number) => {
  const k = Math.max(0, Math.min(1, u)) - 1;
  return 1 + 2.70158 * k * k * k + 1.70158 * k * k;
};
/** Um número estável de 0 a 1 para o id (a cor e o jeito do balão de cada criança). */
const sorteDoId = (id: string): number => {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
};

/** Uma estrelinha ou um coração solto: de onde saiu, para onde vai e desde quando. */
interface Brilho {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Quanto cai (a estrelinha cai; o coração só sobe). */
  peso: number;
  desde: number;
  dura: number;
  tam: number;
}

export function criarMissoesParque(scene: Scene, op: OpcoesMissoesParque): RenderMissoesParque {
  const pq = op.plano.pontos.parque;
  /** A altura dos pés no parque (a mesma do núcleo). */
  const chao = op.plano.h + 1;
  const todas: Mesh[] = [];
  const pl = criarPlasticos(scene, 'vila-missoes');
  const matCorpo = pl.corVertice(0.3) ?? pl.cor('#ffffff', 0.3);
  const paleta = criarPaletaLuz(scene, 'vila-missoes-luz');
  const ligar = (m: Mesh, ver: boolean) => {
    if (m.isEnabled() !== ver) m.setEnabled(ver);
  };
  /** Um molde em 0, 0, 0. */
  const molde = (desenhar: (r: Ref) => void) => {
    const d = desenhoMundo();
    desenhar(new Ref(d, NA_ORIGEM));
    return d;
  };
  const malhaCorpo = (nome: string, pecas: Pecas): Mesh => {
    const m = new Mesh(nome, scene);
    pecas.juntar().applyToMesh(m);
    m.material = matCorpo;
    m.isPickable = false;
    m.setEnabled(false);
    op.tapaOGlow?.(m);
    todas.push(m);
    return m;
  };
  const malhaLuz = (nome: string, pecas: Pecas): Mesh => {
    const m = new Mesh(nome, scene);
    const vd = pecas.juntar();
    paleta.aplicar(vd);
    vd.applyToMesh(m);
    m.material = paleta.material;
    m.isPickable = false;
    m.setEnabled(false);
    op.brilha?.(m);
    todas.push(m);
    return m;
  };
  /** Cópias finas: `n` lugares, cada um com a matriz dele (as que não aparecem ficam sumidas). */
  const copias = (m: Mesh, n: number) => {
    const buf = new Float32Array(16 * n);
    m.thinInstanceSetBuffer('matrix', buf, 16, false);
    // (as cópias andam pelo parque todo, com as crianças: a malha não tem uma caixa só dela)
    m.alwaysSelectAsActiveMesh = true;
    return buf;
  };
  const q = new Quaternion();
  const pos = new Vector3();
  const esc = new Vector3(1, 1, 1);
  const eixo = new Vector3();
  const mat = new Matrix();
  const por = (buf: Float32Array, i: number, x: number, y: number, z: number, tam: number) => {
    pos.set(x, y, z);
    esc.set(tam, tam, tam);
    Matrix.ComposeToRef(esc, q, pos, mat);
    mat.copyToArray(buf, i * 16);
  };
  const temChaoEm = (x: number, z: number) => op.temMalha(Math.floor(x / 16), Math.floor(z / 16));

  // ------------------------------------------------------------------ os balões fugidos
  const fugidos = CORES_FUGIDOS.map((cor, i) => ({
    m: malhaCorpo(`vila-balao-fugido-${i}`, molde((r) => balaoFugido(r, cor)).corpo),
    /** O toque: desde quando (−∞: preso), de onde saiu e se era o terceiro. */
    desde: -Infinity,
    de: null as [number, number, number] | null,
    sobeDe: null as [number, number, number] | null,
    presente: false,
    /** Onde o balão estava no último quadro (de onde ele desce no toque). */
    x: 0,
    y: 0,
    z: 0,
  }));
  for (const f of fugidos) f.m.scaling.setAll(TAM_FUGIDO);

  // ------------------------------------------------------------------ o balão de presente
  const presentes = CORES_PRESENTE.map((cor, v) => {
    const m = malhaCorpo(`vila-balao-presente-${v}`, molde((r) => balaoDePresente(r, cor)).corpo);
    return { m, buf: copias(m, MAX_PRESENTES), n: 0 };
  });
  /** O balão de cada criança: onde o balão está (atrasado em relação à mão) e desde quando. */
  const levando = new Map<string, { bx: number; bz: number; desde: number; visto: number }>();

  // ------------------------------------------------------------------ o feno no cocho
  const pecaCocho = op.plano.pecas.find((p) => p.tipo === 'cocho') ?? null;
  const refCocho = new Ref(
    desenhoMundo(),
    pecaCocho ?? ({ ...NA_ORIGEM, x: pq.cocho[0], y: pq.cocho[1], z: pq.cocho[2] } as PecaVila),
  );
  const montes = [0, 1].map((v) => {
    const m = malhaCorpo(`vila-cocho-feno-${v}`, molde((r) => monteDeFeno(r, v)).corpo);
    const [x, y, z] = refCocho.mundo(v ? 0.42 : -0.42, 0.5, 0);
    m.position.set(x, y, z);
    m.rotation.y = refCocho.giro;
    return { m, desde: -Infinity, x, y, z };
  });
  let fenoAgora = 0;

  // ------------------------------------------------------------------ a pelúcia
  const pelucia = malhaCorpo('vila-pelucia', molde(peluciaDePrenda).corpo);
  let peluciaDesde = -Infinity;
  let peluciaDe: [number, number, number] = [0, 0, 0];
  let peluciaVoando = false;

  // ------------------------------------------------------------------ estrelinhas e corações
  const estrela = malhaLuz(
    'vila-missoes-estrelinhas',
    molde((r) => r.placa(perfilEstrela(0.2), 0.06, 0, 0, 0, COR.amarelo, true)).luz,
  );
  const coracao = malhaLuz(
    'vila-missoes-coracoes',
    molde((r) => r.placa(perfilCoracao(0.34), 0.08, 0, 0, 0, '#ff5a7a', true)).luz,
  );
  const novoBrilho = (): Brilho => ({
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    peso: 0,
    desde: -Infinity,
    dura: 1,
    tam: 1,
  });
  const estrelas = {
    m: estrela,
    buf: copias(estrela, N_ESTRELAS),
    lista: Array.from({ length: N_ESTRELAS }, novoBrilho),
    prox: 0,
    vivas: 0,
  };
  const coracoes = {
    m: coracao,
    buf: copias(coracao, N_CORACOES),
    lista: Array.from({ length: N_CORACOES }, novoBrilho),
    prox: 0,
    vivas: 0,
  };
  const soltar = (grupo: typeof estrelas, b: Omit<Brilho, 'desde'> & { atraso?: number }) => {
    const e = grupo.lista[grupo.prox];
    grupo.prox = (grupo.prox + 1) % grupo.lista.length;
    Object.assign(e, b, { desde: agora + (b.atraso ?? 0) });
  };
  /** Um leque de estrelinhas a partir de (x, y, z). */
  const leque = (x: number, y: number, z: number, n: number, forca = 1) => {
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + x;
      soltar(estrelas, {
        x,
        y,
        z,
        vx: Math.cos(a) * 1.3 * forca,
        vy: 1.9 + (k % 2) * 0.7,
        vz: Math.sin(a) * 1.3 * forca,
        peso: 2.6,
        dura: 0.9,
        tam: 1.3,
      });
    }
  };
  const animar = (grupo: typeof estrelas, t: number) => {
    let vivas = 0;
    grupo.lista.forEach((e, i) => {
      const f = t - e.desde;
      const viva = f >= 0 && f < e.dura;
      if (viva) vivas++;
      const u = viva ? f / e.dura : 0;
      Quaternion.RotationYawPitchRollToRef(f * (e.peso ? 9 : 2.2) + i, 0, 0, q);
      por(
        grupo.buf,
        i,
        e.x + e.vx * f + (e.peso ? 0 : Math.sin(f * 4 + i) * 0.12),
        e.y + e.vy * f - e.peso * f * f,
        e.z + e.vz * f,
        viva ? (Math.sin(u * Math.PI) * 0.9 + 0.1) * e.tam : 0.001,
      );
    });
    grupo.vivas = vivas;
    ligar(grupo.m, vivas > 0);
    if (vivas > 0) grupo.m.thinInstanceBufferUpdated('matrix');
  };

  let agora = 0;
  let tNucleo = 0;
  let eu: QuadroMissoes['eu'] = null;
  let presos = 0;
  let descendo = 0;
  let naMao = 0;
  /** A mão direita de quem está em (x, y, z) olhando para `yaw`. */
  const mao = (p: { x: number; y: number; z: number; yaw: number }): [number, number, number] => [
    p.x + Math.cos(p.yaw) * MAO.lado,
    p.y + MAO.y,
    p.z - Math.sin(p.yaw) * MAO.lado,
  ];

  return {
    pegar(i, presente) {
      const f = fugidos[i];
      if (!f) return;
      f.desde = agora;
      f.de = null;
      f.sobeDe = null;
      f.presente = presente;
    },
    pelucia(de) {
      peluciaDesde = agora;
      peluciaDe = [de[0], de[1], de[2]];
      leque(de[0], de[1] + 0.5, de[2], 6);
    },
    vovo(x, y, z) {
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + 0.4;
        soltar(coracoes, {
          x: x + Math.cos(a) * 0.6,
          y: y + 1.25 + (k % 3) * 0.28,
          z: z + Math.sin(a) * 0.6,
          vx: Math.cos(a) * 0.18,
          vy: 0.85,
          vz: Math.sin(a) * 0.18,
          peso: 0,
          dura: 1.7,
          tam: 0.75 + (k % 2) * 0.3,
          atraso: k * 0.16,
        });
      }
      leque(x, y + 1.7, z, 7, 1.1);
    },
    lanche() {
      const [x, y, z] = refCocho.mundo(0, 0.86, 0);
      op.emitir?.(
        Array.from({ length: 12 }, (_, k) => {
          const a = (k / 12) * Math.PI * 2 + k;
          const v = 0.5 + ((k * 37) % 10) / 14;
          return {
            x: x + Math.cos(a) * 0.3,
            y,
            z: z + Math.sin(a) * 0.2,
            vx: Math.cos(a) * v,
            vy: 1.6 + ((k * 13) % 7) / 6,
            vz: Math.sin(a) * v,
            cor: rgb(k % 3 ? '#f0d878' : '#d9a53a'),
          };
        }),
        'confete',
      );
    },
    quadro(qd) {
      const t = qd.t;
      const dt = agora > 0 ? Math.min(0.1, Math.max(0, t - agora)) : 0;
      agora = t;
      tNucleo = qd.tNucleo;
      eu = qd.eu;
      const perto = (x: number, z: number) => !eu || Math.hypot(x - eu.x, z - eu.z) < LONGE;

      // ---- os balões fugidos: presos (balançando) ou no toque (descem, ficam, sobem embora)
      presos = 0;
      descendo = 0;
      let presenteChegando = false;
      fugidos.forEach((f, i) => {
        const g = t - f.desde;
        if (g >= 0 && g < DESCE + NA_MAO + SOBE) {
          descendo++;
          ligar(f.m, true);
          if (!f.de) f.de = [f.x, f.y, f.z];
          // a ponta do fio na mão: o meio do balão fica este tanto acima dela
          const alto = (0.44 + FIO_FUGIDO) * TAM_FUGIDO;
          const m = eu ? mao(eu) : [f.de[0], chao + MAO.y, f.de[2]];
          const alvo: [number, number, number] = [m[0], m[1] + alto, m[2]];
          if (g < DESCE) {
            // desce flutuando, num vaivém de folha (nunca cai reto)
            const u = suave(g / DESCE);
            const vai = Math.sin(u * Math.PI * 2) * 0.35 * (1 - u);
            f.m.position.set(
              f.de[0] + (alvo[0] - f.de[0]) * u + vai,
              f.de[1] + (alvo[1] - f.de[1]) * u + Math.sin(u * Math.PI) * 0.3,
              f.de[2] + (alvo[2] - f.de[2]) * u,
            );
            f.m.rotation.z = -vai * 0.6;
            f.m.rotation.x = 0;
            f.m.scaling.setAll(TAM_FUGIDO);
            if (f.presente) presenteChegando = true;
          } else if (g < DESCE + NA_MAO) {
            // na mão: o fio preso nela, o balão puxando para cima
            f.m.position.set(alvo[0], alvo[1] + Math.sin(t * 2.4) * 0.04, alvo[2]);
            f.m.rotation.z = Math.sin(t * 1.9) * 0.06;
            f.m.rotation.x = Math.sin(t * 1.5 + 1) * 0.05;
            f.m.scaling.setAll(TAM_FUGIDO);
            if (f.presente) presenteChegando = true;
          } else {
            // sobe embora (voltou para a Dona Flor), com as estrelinhas na saída
            if (!f.sobeDe) {
              const de = alvo;
              f.sobeDe = [de[0], de[1], de[2]];
              leque(de[0], de[1], de[2], f.presente ? 8 : 5);
              op.emitir?.(
                Array.from({ length: 8 }, (_, k) => {
                  const a = (k / 8) * Math.PI * 2;
                  return {
                    x: de[0] + Math.cos(a) * 0.2,
                    y: de[1],
                    z: de[2] + Math.sin(a) * 0.2,
                    vx: Math.cos(a) * 0.9,
                    vy: 1.8,
                    vz: Math.sin(a) * 0.9,
                    cor: rgb(k % 2 ? CORES_FUGIDOS[i] : '#fff6d8'),
                  };
                }),
                'confete',
              );
            }
            const u = (g - DESCE - NA_MAO) / SOBE;
            const de = f.sobeDe;
            f.m.position.set(
              de[0] + Math.sin(u * 5) * 0.3,
              de[1] + u * u * 7 + u * 1.2,
              de[2] + Math.cos(u * 4) * 0.2 - 0.2,
            );
            f.m.rotation.z = Math.sin(u * 7) * 0.12;
            f.m.scaling.setAll(TAM_FUGIDO * (u > 0.6 ? 1 - suave((u - 0.6) / 0.4) * 0.97 : 1));
          }
          return;
        }
        const l = lugarDoBalao(pq, chao, i, tNucleo);
        const ver = qd.fugidos[i] && perto(l.x, l.z) && temChaoEm(l.x, l.z);
        ligar(f.m, ver);
        f.x = l.x;
        f.y = l.y;
        f.z = l.z;
        if (!ver) return;
        presos++;
        // preso, puxando para cima: balança de leve (o fio balança junto)
        f.m.position.set(l.x, l.y + Math.sin(t * 1.6 + i * 2.1) * 0.035, l.z);
        f.m.rotation.z = Math.sin(t * 1.1 + i * 1.7) * 0.08;
        f.m.rotation.x = Math.sin(t * 0.8 + i) * 0.06;
        f.m.rotation.y = i * 2.1 + Math.sin(t * 0.3 + i) * 0.4;
        f.m.scaling.setAll(TAM_FUGIDO);
      });

      // ---- o balão de presente: preso na mão direita, atrasado no passo (balão de verdade)
      for (const p of presentes) p.n = 0;
      naMao = 0;
      for (const c of qd.comBalao) {
        // (o terceiro balão ainda está descendo até a mão: o de presente aparece quando ele sobe)
        if (presenteChegando && eu && Math.hypot(c.x - eu.x, c.z - eu.z) < 0.05) continue;
        if (!perto(c.x, c.z) || !temChaoEm(c.x, c.z)) continue;
        const sorte = sorteDoId(c.id);
        const p = presentes[sorte < 0.5 ? 0 : 1];
        if (p.n >= MAX_PRESENTES) continue;
        const [mx, my, mz] = mao(c);
        let e = levando.get(c.id);
        if (!e) {
          e = { bx: mx, bz: mz, desde: t, visto: t };
          levando.set(c.id, e);
        }
        e.visto = t;
        // o balão vai atrás da mão com atraso e nunca fica para trás mais que meio bloco
        const k = 1 - Math.exp(-dt * 3.2);
        e.bx += (mx - e.bx) * k;
        e.bz += (mz - e.bz) * k;
        let dx = e.bx - mx;
        let dz = e.bz - mz;
        const longe = Math.hypot(dx, dz);
        if (longe > 0.75) {
          dx *= 0.75 / longe;
          dz *= 0.75 / longe;
          e.bx = mx + dx;
          e.bz = mz + dz;
        }
        // o vento de leve
        dx += Math.sin(t * 1.3 + sorte * 40) * 0.07;
        dz += Math.cos(t * 1.1 + sorte * 23) * 0.06;
        // e puxa para fora, para o lado da mão (o fio à vista ao lado da cabeça)
        dx += Math.cos(c.yaw) * DERIVA_PRESENTE;
        dz -= Math.sin(c.yaw) * DERIVA_PRESENTE;
        // o fio aponta da mão para o balão: o molde (em pé) inclina para lá
        const comp = Math.hypot(dx, ALTURA_PRESENTE, dz);
        const inclina = Math.acos(ALTURA_PRESENTE / comp);
        if (inclina > 1e-4) {
          eixo.set(dz, 0, -dx).normalize();
          Quaternion.RotationAxisToRef(eixo, inclina, q);
        } else q.set(0, 0, 0, 1);
        const tam = Math.max(0.001, pulo((t - e.desde) / 0.4));
        por(p.buf, p.n++, mx, my + Math.sin(t * 2 + sorte * 9) * 0.03, mz, tam);
        naMao++;
      }
      for (const [id, e] of levando) if (e.visto !== t) levando.delete(id);
      for (const p of presentes) {
        ligar(p.m, p.n > 0);
        if (p.n > 0) {
          p.m.thinInstanceCount = p.n;
          p.m.thinInstanceBufferUpdated('matrix');
        }
      }

      // ---- o feno no cocho: cada braçada é um monte que aparece com um pulinho
      const feno = Math.max(0, Math.min(2, Math.floor(qd.feno)));
      const verCocho = perto(pq.cocho[0], pq.cocho[2]) && temChaoEm(pq.cocho[0], pq.cocho[2]);
      montes.forEach((mt, v) => {
        const tem = v < feno;
        if (tem && v >= fenoAgora) mt.desde = t;
        ligar(mt.m, tem && verCocho);
        if (!tem || !verCocho) return;
        const g = t - mt.desde;
        const k = pulo(g / 0.35);
        mt.m.scaling.set(k, k * (1 + (g < 0.6 ? Math.sin(g * 16) * 0.08 * (1 - g / 0.6) : 0)), k);
      });
      fenoAgora = feno;

      // ---- a pelúcia: aparece no balcão, dá um pulinho e voa em arco até a criança
      const g = t - peluciaDesde;
      peluciaVoando = g >= 0 && g < PELUCIA_SURGE + PELUCIA_ESPERA + PELUCIA_VOA;
      ligar(pelucia, peluciaVoando);
      if (peluciaVoando) {
        const [x0, y0, z0] = peluciaDe;
        // (a pelúcia olha para a criança)
        const yaw = eu ? Math.atan2(eu.x - x0, eu.z - z0) : 0;
        if (g < PELUCIA_SURGE + PELUCIA_ESPERA) {
          const k = pulo(g / PELUCIA_SURGE) * 0.9;
          const salto = g < PELUCIA_SURGE ? Math.sin((g / PELUCIA_SURGE) * Math.PI) * 0.3 : 0;
          pelucia.position.set(x0, y0 + salto, z0);
          pelucia.scaling.setAll(Math.max(0.001, k));
          pelucia.rotation.set(0, yaw, Math.sin(g * 14) * 0.1 * Math.max(0, 1 - g / 0.7));
        } else {
          const u = (g - PELUCIA_SURGE - PELUCIA_ESPERA) / PELUCIA_VOA;
          const s = suave(u);
          const ate: [number, number, number] = eu ? [eu.x, eu.y + 0.9, eu.z] : [x0, y0, z0];
          pelucia.position.set(
            x0 + (ate[0] - x0) * s,
            y0 + (ate[1] - y0) * s + Math.sin(u * Math.PI) * 1.5,
            z0 + (ate[2] - z0) * s,
          );
          // chega pequena, nos braços (some dentro da criança, sem atravessar a tela)
          pelucia.scaling.setAll(0.9 * (u > 0.7 ? 1 - suave((u - 0.7) / 0.3) * 0.85 : 1));
          pelucia.rotation.set(Math.sin(u * Math.PI) * -0.5, yaw + s * Math.PI * 2, 0);
        }
      }

      animar(estrelas, t);
      animar(coracoes, t);
    },
    estado: () => ({
      fugidos: presos,
      descendo,
      naMao,
      feno: montes.filter((m) => m.m.isEnabled()).length,
      pelucia: peluciaVoando,
    }),
    descartar() {
      for (const m of todas) m.dispose();
      paleta.descartar();
      pl.descartar();
      levando.clear();
    },
  };
}
