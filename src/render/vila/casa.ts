/**
 * A Casa anos 80 por dentro, na tela (spec 026, parte 3): a sala e o quarto de brinquedos.
 *
 * - **As peças paradas** (o sofá xadrez, a TV de madeira, a estante de fitas, o tapete...) numa
 *   malha só, com a luz de dentro da casa (de noite o abajur e a TV acendem e a sala fica morna,
 *   nunca escura como a rua): `pecasCasa.ts`.
 * - **A TV** passa o canal da sala (os quatro desenhos inventados de `desenhosTv.ts`), o chuvisco
 *   de quando o canal muda e o filme da fita; tudo no relógio do núcleo (os amigos veem o mesmo).
 * - **O toca-discos:** o prato gira e o braço desce no disco enquanto toca; notinhas sobem das
 *   caixinhas de som.
 * - **O telefone de disco:** o fone pula no gancho tocando e levanta quando a voz atende.
 * - **O relógio de parede** anda com a hora do mundo.
 * - **Os brinquedos do quarto** (cada um faz o que faz, só na tela de quem toca): o ioiô desce e
 *   sobe duas vezes, o pião fica de pé e roda até deitar de novo, o cubo de cores gira a face de
 *   cima, o robô de lata anda dois passos e para, a bola quica.
 *
 * Tudo só com o chão da casa desenhado (a regra do campo de visão), com um número fixo de malhas.
 */
import type { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateSphereVertexData } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { criarPlasticos } from '../formas';
import { Pecas } from '../solidos';
import type { PecaVila, PlanoVila, RetanguloVila } from '../../world/vilaNeon';
import { TELA_TV } from '../../world/vilaCasa';
import { naTela, passaFilme, type EstadoCasa } from '../../jogo/casa';
import { COR, Ref, type Desenho } from './ref';
import { criarPaletaLuz } from './luzes';
import { CASA, desenharPecaCasa } from './pecasCasa';
import { pintarCanal, pintarChuvisco, pintarFilme, pintarNumeroDoCanal } from './desenhosTv';

export type ToqueCasa = 'telefone' | 'ioio' | 'piao' | 'cubo' | 'robo' | 'bola';

export interface OpcoesCasaVila {
  temMalha(cx: number, cz: number): boolean;
  brilha?(m: Mesh): void;
  tapaOGlow?(m: Mesh): void;
}

export interface QuadroCasa {
  /** O relógio da tela e o do núcleo (s). */
  t: number;
  tNucleo: number;
  /** 0 de dia, 1 de noite. */
  noite: number;
  /** A hora do mundo (0 a 1): o relógio de parede. */
  hora: number;
  sala: EstadoCasa;
  /** Onde a câmera está (a tela só pinta perto). */
  cam: { x: number; z: number };
}

export interface CasaVila {
  quadro(q: QuadroCasa): void;
  /** Quanto cada parede já sumiu (sul, norte, oeste, leste, meio): o que fica nela some junto. */
  paredes(k: readonly number[]): void;
  tocar(qual: ToqueCasa): void;
  /** Testes: o que a casa mostra agora. */
  estado(): {
    visivel: boolean;
    tela: string;
    disco: boolean;
    telefone: boolean;
    ioio: boolean;
    piao: boolean;
    cubo: number;
    robo: boolean;
    bola: boolean;
  };
  descartar(): void;
}

/** Quanto dura cada brinquedo depois do toque (s). */
export const DURA_TOQUE_CASA: Readonly<Record<ToqueCasa, number>> = {
  telefone: 3.2,
  ioio: 2.6,
  piao: 4.6,
  cubo: 0.4,
  robo: 1.9,
  bola: 1.7,
};
/** O telefone toca este tanto e depois a voz atende (o fone levanta). */
const TOQUE_TELEFONE = 1.1;
/** A tela pinta a tantos quadros por segundo e só com a câmera a até tantos blocos. */
const QUADROS_TELA = 12;
/** O pião é grande (de cima, a criança de 3 anos acha). */
const ESC_PIAO = 1.6;
const PERTO_DA_TELA = 34;

const desenhoNoMundo = (): Desenho => ({
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
/** Uma peça de mentira na origem (para desenhar partes soltas no referencial delas). */
const naOrigem = (): PecaVila => ({ tipo: 'banco', x: 0, y: 0, z: 0, dir: 0 });

const suave = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

export function criarCasaVila(
  scene: Scene,
  plano: PlanoVila,
  opcoes: OpcoesCasaVila,
): CasaVila {
  const pc = plano.pontos.casa;
  const pecas = plano.pecas.filter((p) => p.tipo.startsWith('casa-'));
  const achar = (tipo: PecaVila['tipo']) => pecas.find((p) => p.tipo === tipo)!;
  const pl = criarPlasticos(scene, 'casa');
  const matCorpo = pl.corVertice(0.3) ?? pl.cor('#ffffff', 0.3);
  const paleta = criarPaletaLuz(scene, 'casa-luz');
  const todas: Mesh[] = [];
  const nos: TransformNode[] = [];
  const materiais: StandardMaterial[] = [];
  const texturas: DynamicTexture[] = [];

  const malha = (nome: string, d: Pecas, luz = false): Mesh | null => {
    if (!d.partes.length) return null;
    const m = new Mesh(nome, scene);
    const vd = d.juntar();
    if (luz) paleta.aplicar(vd);
    vd.applyToMesh(m);
    m.material = luz ? paleta.material : matCorpo;
    m.isPickable = false;
    m.hasVertexAlpha = false;
    if (luz) opcoes.brilha?.(m);
    else opcoes.tapaOGlow?.(m);
    todas.push(m);
    return m;
  };
  /** Uma parte que mexe: desenhada no referencial dela (na origem). */
  const parte = (nome: string, desenhar: (r: Ref) => void): Mesh => {
    const d = desenhoNoMundo();
    desenhar(new Ref(d, naOrigem()));
    const corpo = malha(nome, d.corpo);
    const luz = malha(`${nome}-luz`, d.luz, true);
    if (corpo && luz) {
      luz.parent = corpo;
      return corpo;
    }
    return (corpo ?? luz)!;
  };
  const no = (nome: string, pai?: TransformNode): TransformNode => {
    const n = new TransformNode(nome, scene);
    if (pai) n.parent = pai;
    nos.push(n);
    return n;
  };
  /** O mundo de um ponto no referencial de uma peça. */
  const mundo = (p: PecaVila, x: number, y: number, z: number) =>
    new Ref(desenhoNoMundo(), p).mundo(x, y, z);
  const giroDe = (p: PecaVila) => (p.dir & 3) * (Math.PI / 2);

  // ------------------------------------------------------------------ as peças paradas
  // (o que fica pendurado numa parede, o relógio e as cortinas, vai à parte: some com ela quando
  // a parede sai da frente da câmera)
  const naParede = (p: PecaVila): number =>
    p.tipo === 'casa-relogio' ? 1 : p.tipo === 'casa-cortina' ? (p.n === 2 ? 2 : 0) : -1;
  const parado = desenhoNoMundo();
  const daParede = [0, 1, 2].map(() => desenhoNoMundo());
  for (const p of pecas) {
    const i = naParede(p);
    desenharPecaCasa(new Ref(i >= 0 ? daParede[i] : parado, p), p.tipo, p.n ?? 0);
  }
  const mParado = malha('casa-pecas', parado.corpo)!;
  mParado.receiveShadows = true;
  mParado.freezeWorldMatrix();
  const mParadoLuz = malha('casa-pecas-luz', parado.luz, true);
  mParadoLuz?.freezeWorldMatrix();
  const mParedes = daParede.map((d, i) => malha(`casa-parede-${i}`, d.corpo));
  /** Quanto cada parede já sumiu (a do sul, a do norte, a do oeste, a do leste, a do meio). */
  let kParedes: readonly number[] = [0, 0, 0, 0, 0];

  // ------------------------------------------------------------------ a tela da TV
  const pTv = achar('casa-tv');
  const W = 128;
  const H = 96;
  const texTv = new DynamicTexture('casa-tv-tela', { width: W, height: H }, scene, false);
  texTv.wrapU = Texture.CLAMP_ADDRESSMODE;
  texTv.wrapV = Texture.CLAMP_ADDRESSMODE;
  texturas.push(texTv);
  const matTv = new StandardMaterial('casa-tv-mat', scene);
  matTv.disableLighting = true;
  matTv.emissiveTexture = texTv;
  matTv.diffuseColor = Color3.Black();
  matTv.specularColor = Color3.Black();
  matTv.backFaceCulling = false;
  materiais.push(matTv);
  const tela = new Mesh('casa-tv-tela', scene);
  {
    const vd = new VertexData();
    const w = 0.84 / 2;
    const h = 0.64 / 2;
    vd.positions = [-w, -h, 0, w, -h, 0, w, h, 0, -w, h, 0];
    vd.normals = [0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1];
    vd.uvs = [0, 0, 1, 0, 1, 1, 0, 1];
    vd.indices = [0, 1, 2, 0, 2, 3];
    vd.applyToMesh(tela);
  }
  tela.material = matTv;
  const [tx, ty, tz] = mundo(pTv, TELA_TV[0], TELA_TV[1], TELA_TV[2] + 0.022);
  tela.position.set(tx, ty, tz);
  tela.rotation.y = giroDe(pTv) + Math.PI;
  tela.isPickable = false;
  opcoes.brilha?.(tela);
  todas.push(tela);
  let ultimoQuadroTela = -1;
  let rotuloTela = '';

  // ------------------------------------------------------------------ o toca-discos
  const pDiscos = achar('casa-discos');
  const prato = parte('casa-prato', (r) => {
    r.prisma(16, 0.22, 0.02, 0, 0.01, 0, '#1c1c22', 'y');
    for (const rr of [0.18, 0.13]) r.prisma(16, rr, 0.022, 0, 0.011, 0, '#2c2c34', 'y');
    r.prisma(16, 0.165, 0.023, 0, 0.012, 0, '#1c1c22', 'y');
    r.prisma(16, 0.11, 0.024, 0, 0.012, 0, '#1c1c22', 'y');
    r.prisma(10, 0.07, 0.026, 0, 0.012, 0, COR.vermelho, 'y');
    r.caixa(0.05, 0.004, 0.012, 0.035, 0.026, 0, CASA.creme, 0);
    r.prisma(6, 0.012, 0.05, 0, 0.02, 0, COR.cromo, 'y');
  });
  {
    const [x, y, z] = mundo(pDiscos, -0.3, 0.8, 0.02);
    prato.position.set(x, y, z);
  }
  // o braço: o pino fica parado; a haste e a cabeça giram em volta dele
  const braco = parte('casa-braco', (r) => {
    r.barra([0, 0.06, 0], [0, 0.06, -0.3], 0.025, COR.cromo);
    r.barra([0, 0.06, -0.3], [-0.06, 0.04, -0.36], 0.025, COR.cromo);
    r.caixa(0.05, 0.03, 0.07, -0.07, 0.02, -0.38, COR.grafite2, 0.01);
    r.caixa(0.05, 0.05, 0.08, 0, 0.04, 0.06, COR.grafite2, 0.015);
  });
  const pivoBraco = mundo(pDiscos, 0.18, 0.79, 0.16);
  braco.position.set(pivoBraco[0], pivoBraco[1], pivoBraco[2]);
  let giroPrato = 0;
  let bracoNoDisco = 0;
  // as notinhas que sobem das caixinhas de som
  const notas: { m: Mesh; vida: number; x: number; y: number; z: number }[] = [];
  for (let k = 0; k < 4; k++) {
    const cor = [COR.amarelo, CASA.laranja, '#f6f4ee', COR.rosa][k];
    const d = desenhoNoMundo();
    const r = new Ref(d, naOrigem());
    r.prisma(8, 0.07, 0.03, 0, 0, 0, cor, 'z', true);
    r.luz(0.025, 0.2, 0.03, 0.055, 0, 0, cor);
    r.luz(0.09, 0.03, 0.03, 0.095, 0.17, 0, cor);
    const m = malha(`casa-nota-${k}`, d.luz, true)!;
    m.billboardMode = Mesh.BILLBOARDMODE_Y;
    notas.push({ m, vida: 0, x: 0, y: 0, z: 0 });
  }
  let proxNota = 0;
  let ladoNota = 0;

  // ------------------------------------------------------------------ o telefone
  const pFone = achar('casa-telefone');
  const fone = parte('casa-fone', (r) => {
    r.caixa(0.36, 0.05, 0.08, 0, 0, 0, CASA.telefone, 0.025);
    for (const x of [-0.16, 0.16]) r.caixa(0.09, 0.07, 0.1, x, -0.035, 0, CASA.telefone, 0.03);
  });
  const lugarFone = mundo(pFone, 0, 0.785, -0.06);
  fone.position.set(lugarFone[0], lugarFone[1], lugarFone[2]);
  fone.rotation.y = giroDe(pFone);
  let foneDesde = -Infinity;

  // ------------------------------------------------------------------ o relógio de parede
  const pRelogio = achar('casa-relogio');
  const ponteiros = (hora: number) => {
    const d = desenhoNoMundo();
    const r = new Ref(d, { ...pRelogio });
    // a hora do mundo: 0 é meia-noite; o ponteiro pequeno dá duas voltas por dia
    const minutos = hora * 24 * 60;
    const aH = ((minutos / 60) % 12) * (Math.PI / 6);
    const aM = (minutos % 60) * (Math.PI / 30);
    for (const [a, l, e] of [
      [aH, 0.13, 0.03],
      [aM, 0.2, 0.02],
    ] as const) {
      r.barra([0, 0, 0.1], [Math.sin(a) * l, Math.cos(a) * l, 0.1], e, COR.preto);
    }
    r.prisma(8, 0.025, 0.02, 0, 0, 0.11, COR.vermelho, 'z');
    return d.corpo;
  };
  let mPonteiros: Mesh | null = null;
  let minutoVisto = -1;

  // ------------------------------------------------------------------ o abajur (de noite)
  const pAbajur = achar('casa-abajur');
  const abajurAceso = (() => {
    const d = desenhoNoMundo();
    const r = new Ref(d, pAbajur);
    r.prisma(6, 0.28, 0.33, 0, 1.445, 0, '#ffe2a0', 'y', true);
    r.prisma(6, 0.1, 0.06, 0, 1.33, 0, '#fff4c8', 'y', true);
    return malha('casa-abajur-aceso', d.luz, true)!;
  })();

  // ------------------------------------------------------------------ o ioiô
  const pIoio = achar('casa-ioio');
  const ioio = parte('casa-ioio', (r) => {
    for (const s of [-1, 1]) {
      r.prisma(12, 0.1, 0.045, s * 0.03, 0, 0, COR.vermelho, 'x');
      r.prisma(12, 0.06, 0.047, s * 0.032, 0, 0, '#ff6a5a', 'x');
    }
    r.prisma(8, 0.02, 0.02, 0, 0, 0, COR.branco, 'x');
    r.caixa(0.012, 0.12, 0.012, 0.055, -0.06, 0, COR.branco, 0);
  });
  ioio.rotation.y = giroDe(pIoio);
  // (os brinquedos são grandes, de brinquedo de verdade: de cima, a criança de 3 anos acha)
  ioio.scaling.setAll(1.5);
  const fio = parte('casa-ioio-fio', (r) => r.caixa(0.012, 1, 0.012, 0, -1, 0, '#f6f4ee', 0));
  const pontaIoio = mundo(pIoio, 0, 1.2, 0.2);
  fio.position.set(pontaIoio[0], pontaIoio[1], pontaIoio[2]);
  let ioioDesde = -Infinity;
  let giroIoio = 0;

  // ------------------------------------------------------------------ o pião
  const pPiao = achar('casa-piao');
  const piaoBase = no('casa-piao-base');
  const piaoGiro = no('casa-piao-giro', piaoBase);
  const piao = parte('casa-piao', (r) => {
    r.prisma(8, 0.022, 0.06, 0, 0.03, 0, CASA.madeiraClara, 'y');
    const camadas: [number, number, string][] = [
      [0.07, 0.07, COR.vermelho],
      [0.12, 0.13, CASA.creme],
      [0.16, 0.19, COR.vermelho],
      [0.17, 0.235, CASA.creme],
      [0.15, 0.275, COR.vermelho],
      [0.1, 0.305, CASA.creme],
    ];
    for (const [raio, y, cor] of camadas) r.prisma(10, raio, 0.05, 0, y, 0, cor, 'y');
    r.prisma(8, 0.03, 0.09, 0, 0.36, 0, CASA.madeira, 'y');
  });
  piao.parent = piaoGiro;
  piao.scaling.setAll(ESC_PIAO);
  const lugarPiao = mundo(pPiao, 0, 0.04, 0);
  piaoBase.position.set(lugarPiao[0], lugarPiao[1], lugarPiao[2]);
  let piaoDesde = -Infinity;
  let giroPiao = 0;
  /** O pião deitado (de lado no tapete): a inclinação e a altura de quando está parado. */
  const DEITADO = 1.16;

  // ------------------------------------------------------------------ o cubo de cores 2 × 2
  const pCubo = achar('casa-cubo');
  const lado = 0.27;
  const camadaDoCubo = (y0: number, nome: string) =>
    parte(nome, (r) => {
      for (const x of [-1, 1])
        for (const z of [-1, 1]) {
          const cx = (x * lado) / 2;
          const cz = (z * lado) / 2;
          r.caixa(lado - 0.006, lado - 0.006, lado - 0.006, cx, y0, cz, '#1c1c24', 0.02);
          const e = 0.008;
          const s = lado - 0.05;
          // as três cores: amarelo em cima e embaixo, vermelho dos lados x, azul dos lados z
          r.caixa(s, e, s, cx, y0 + (y0 > 0 ? lado - 0.004 : -0.004), cz, '#ffd23a', 0.004);
          r.caixa(e, s, s, cx + x * (lado / 2 - 0.0005), y0 + 0.025, cz, COR.vermelho, 0.004);
          r.caixa(s, s, e, cx, y0 + 0.025, cz + z * (lado / 2 - 0.0005), '#2f6fd8', 0.004);
        }
    });
  const cuboBaixo = camadaDoCubo(0, 'casa-cubo-baixo');
  const cuboCima = camadaDoCubo(lado, 'casa-cubo-cima');
  const lugarCubo = mundo(pCubo, 0, 0.04, 0);
  for (const m of [cuboBaixo, cuboCima]) {
    m.position.set(lugarCubo[0], lugarCubo[1], lugarCubo[2]);
    m.rotation.y = giroDe(pCubo) + 0.3;
  }
  let cuboVoltas = 0;
  let cuboDesde = -Infinity;

  // ------------------------------------------------------------------ o robô de lata
  const pRobo = achar('casa-robo');
  const roboNo = no('casa-robo');
  const roboCorpo = parte('casa-robo-corpo', (r) => {
    r.caixa(0.36, 0.34, 0.26, 0, 0.3, 0, '#c8ccd6', 0.04);
    r.caixa(0.22, 0.14, 0.02, 0, 0.42, 0.13, COR.vermelho, 0.02);
    for (const x of [-0.06, 0, 0.06]) r.prisma(8, 0.022, 0.02, x, 0.48, 0.145, COR.amarelo, 'z');
    r.caixa(0.26, 0.22, 0.22, 0, 0.64, 0, '#d4d8e2', 0.04);
    for (const x of [-0.06, 0.06]) r.luz(0.06, 0.05, 0.02, x, 0.74, 0.11, '#ffe14a');
    for (let i = 0; i < 3; i++) r.caixa(0.12, 0.012, 0.02, 0, 0.67 + i * 0.022, 0.112, COR.grafite, 0);
    r.barra([0, 0.86, 0], [0, 0.98, 0], 0.02, COR.grafite);
    r.prisma(8, 0.035, 0.05, 0, 1.0, 0, COR.vermelho, 'y');
    for (const x of [-0.14, 0.14]) r.prisma(8, 0.03, 0.04, x, 0.72, 0, COR.vermelho, 'x');
  });
  roboCorpo.parent = roboNo;
  roboNo.scaling.setAll(1.3);
  const perna = (s: number) => {
    const p = no(`casa-robo-perna${s}`, roboNo);
    p.position.set(s * 0.09, 0.3, 0);
    const m = parte(`casa-robo-perna-m${s}`, (r) => {
      r.caixa(0.11, 0.26, 0.13, 0, -0.28, 0, '#9aa0ae', 0.03);
      r.caixa(0.13, 0.05, 0.19, 0, -0.3, 0.03, COR.vermelho, 0.02);
    });
    m.parent = p;
    return p;
  };
  const pernas = [perna(-1), perna(1)];
  const braco2 = (s: number) => {
    const p = no(`casa-robo-braco${s}`, roboNo);
    p.position.set(s * 0.21, 0.58, 0);
    const m = parte(`casa-robo-braco-m${s}`, (r) => {
      r.caixa(0.07, 0.22, 0.08, 0, -0.22, 0, '#9aa0ae', 0.02);
      r.caixa(0.09, 0.05, 0.09, 0, -0.27, 0, COR.vermelho, 0.02);
    });
    m.parent = p;
    return p;
  };
  const bracos = [braco2(-1), braco2(1)];
  const roboA = pc.robo;
  const roboB = pc.roboAte;
  let roboDesde = -Infinity;
  /** O robô está na ponta de lá (B) ou de cá (A); cada toque anda até a outra. */
  let roboEmB = false;
  let roboDe: readonly number[] = roboA;
  let roboPara: readonly number[] = roboA;
  const yawRobo = giroDe(pRobo);

  // ------------------------------------------------------------------ a bola
  const pBola = achar('casa-bola');
  const bola = (() => {
    const vd = CreateSphereVertexData({ diameter: 0.6, segments: 8 });
    const P = vd.positions as number[];
    const n = P.length / 3;
    const cores: number[] = [];
    const tons = [
      [0.91, 0.19, 0.16],
      [0.96, 0.95, 0.93],
      [0.18, 0.44, 0.85],
      [0.96, 0.95, 0.93],
    ];
    for (let i = 0; i < n; i++) {
      const [x, y, z] = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]];
      // os gomos pela longitude e as tampinhas brancas em cima e embaixo
      const g = Math.floor(((Math.atan2(z, x) + Math.PI) / (Math.PI * 2)) * 6) % 4;
      const c = Math.abs(y) > 0.25 ? [0.98, 0.97, 0.95] : tons[g];
      cores.push(c[0], c[1], c[2], 1);
    }
    vd.colors = cores;
    const m = new Mesh('casa-bola', scene);
    vd.applyToMesh(m);
    m.material = matCorpo;
    m.isPickable = false;
    opcoes.tapaOGlow?.(m);
    todas.push(m);
    return m;
  })();
  const lugarBola = mundo(pBola, 0, 0.3, 0);
  bola.position.set(lugarBola[0], lugarBola[1], lugarBola[2]);
  let bolaDesde = -Infinity;

  // ------------------------------------------------------------------ o chão de cada parte
  const chunksDa = (r: RetanguloVila) => {
    const out: [number, number][] = [];
    for (let cx = Math.floor((r.x0 - 1) / 16); cx <= Math.floor((r.x1 + 1) / 16); cx++)
      for (let cz = Math.floor((r.z0 - 1) / 16); cz <= Math.floor((r.z1 + 1) / 16); cz++)
        out.push([cx, cz]);
    return out;
  };
  const chunksCasa = chunksDa(pc.dentro);
  let visivel = false;
  const mostrar = (v: boolean) => {
    for (const m of todas) if (m.isEnabled() !== v) m.setEnabled(v);
    if (mPonteiros && mPonteiros.isEnabled() !== v) mPonteiros.setEnabled(v);
  };
  mostrar(false);

  let agora = 0;
  let luzDentro = 1;

  return {
    quadro(q) {
      const dt = agora > 0 ? Math.min(0.1, Math.max(0, q.t - agora)) : 0;
      agora = q.t;
      const ver = chunksCasa.every(([cx, cz]) => opcoes.temMalha(cx, cz));
      if (ver !== visivel) {
        visivel = ver;
        mostrar(ver);
      }
      if (!ver) return;
      // o que fica pendurado numa parede que saiu da frente da câmera some junto com ela
      mParedes.forEach((m, i) => {
        const v = kParedes[i] < 0.3;
        if (m && m.isEnabled() !== v) m.setEnabled(v);
      });
      if (mPonteiros) {
        const v = kParedes[1] < 0.3;
        if (mPonteiros.isEnabled() !== v) mPonteiros.setEnabled(v);
      }
      // a luz de dentro: de noite o abajur acende e a sala fica morna (nunca a escuridão da rua)
      const l = 1 - 0.32 * q.noite;
      if (Math.abs(l - luzDentro) > 0.01) {
        luzDentro = l;
        pl.definirLuz(l);
      }
      const acesa = q.noite > 0.3;
      if (abajurAceso.isEnabled() !== acesa) abajurAceso.setEnabled(acesa);

      // ---- a tela da TV (pinta só com a câmera perto)
      const perto = Math.hypot(q.cam.x - tx, q.cam.z - tz) < PERTO_DA_TELA;
      if (tela.isEnabled() !== perto) tela.setEnabled(perto);
      if (perto) {
        const quadroTela = Math.floor(q.tNucleo * QUADROS_TELA);
        if (quadroTela !== ultimoQuadroTela) {
          ultimoQuadroTela = quadroTela;
          const g = texTv.getContext() as unknown as CanvasRenderingContext2D;
          const o = naTela(q.sala, q.tNucleo);
          if (o.o === 'filme') pintarFilme(g, W, H, o.f);
          else if (o.o === 'chuvisco') pintarChuvisco(g, W, H, o.f);
          else {
            pintarCanal(g, W, H, o.canal, o.f);
            if (q.tNucleo - q.sala.trocou < 1.6) pintarNumeroDoCanal(g, W, o.canal);
          }
          rotuloTela = o.o === 'filme' ? 'filme' : o.o === 'chuvisco' ? 'chuvisco' : `canal${o.canal}`;
          texTv.update(true);
        }
      }

      // ---- o toca-discos
      const tocando = q.sala.disco >= 0;
      bracoNoDisco += ((tocando ? 1 : 0) - bracoNoDisco) * Math.min(1, dt * 4);
      braco.rotation.y = giroDe(pDiscos) + 0.15 + bracoNoDisco * 0.5;
      if (tocando && bracoNoDisco > 0.85) giroPrato += dt * 3.5;
      prato.rotation.y = giroPrato;
      if (tocando) {
        proxNota -= dt;
        if (proxNota <= 0) {
          proxNota = 0.62;
          const n = notas.find((k) => k.vida <= 0);
          if (n) {
            ladoNota = 1 - ladoNota;
            [n.x, n.y, n.z] = mundo(pDiscos, ladoNota ? 1.14 : -1.14, 0.95, 0.1);
            n.vida = 2;
          }
        }
      }
      for (const n of notas) {
        if (n.vida > 0) n.vida -= dt;
        const vivo = n.vida > 0;
        if (n.m.isEnabled() !== vivo) n.m.setEnabled(vivo);
        if (!vivo) continue;
        const idade = 2 - n.vida;
        n.m.position.set(n.x + Math.sin(idade * 3) * 0.12, n.y + idade * 0.45, n.z);
        n.m.scaling.setAll(Math.min(1, idade * 4) * Math.min(1, n.vida * 1.5));
      }

      // ---- o telefone: pula tocando, levanta quando atende, volta
      {
        const f = q.t - foneDesde;
        let dy = 0;
        let inclina = 0;
        if (f >= 0 && f < TOQUE_TELEFONE) {
          dy = Math.abs(Math.sin(f * 38)) * 0.025;
          inclina = Math.sin(f * 41) * 0.06;
        } else if (f >= TOQUE_TELEFONE && f < DURA_TOQUE_CASA.telefone) {
          const k = suave((f - TOQUE_TELEFONE) / 0.25) * suave((DURA_TOQUE_CASA.telefone - f) / 0.3);
          dy = k * 0.16;
          inclina = k * 0.35;
        }
        fone.position.y = lugarFone[1] + dy;
        fone.rotation.z = inclina;
      }

      // ---- o relógio de parede (refeito quando o minuto mostrado muda)
      const minuto = Math.floor(q.hora * 24 * 60);
      if (minuto !== minutoVisto) {
        minutoVisto = minuto;
        const d = ponteiros(q.hora);
        if (mPonteiros) {
          const i = todas.indexOf(mPonteiros);
          if (i >= 0) todas.splice(i, 1);
          mPonteiros.dispose();
        }
        mPonteiros = malha('casa-ponteiros', d);
      }

      // ---- o ioiô: desce e sobe duas vezes, girando
      {
        const f = q.t - ioioDesde;
        let desce = 0;
        if (f >= 0 && f < DURA_TOQUE_CASA.ioio) {
          const u = (f % (DURA_TOQUE_CASA.ioio / 2)) / (DURA_TOQUE_CASA.ioio / 2);
          desce = u < 0.42 ? suave(u / 0.42) : u < 0.58 ? 1 : 1 - suave((u - 0.58) / 0.42);
          giroIoio += dt * 22;
        }
        const comp = 0.12 + desce * 0.78;
        ioio.position.set(pontaIoio[0], pontaIoio[1] - comp - 0.1, pontaIoio[2]);
        ioio.rotation.x = giroIoio;
        fio.scaling.y = comp;
      }

      // ---- o pião: de pé, rodando e bambeando até deitar de novo
      {
        const f = q.t - piaoDesde;
        const D = DURA_TOQUE_CASA.piao;
        let inclina = DEITADO;
        let precessao = 0.6;
        let alt = 0.07 * ESC_PIAO;
        if (f >= 0 && f < D) {
          const levanta = suave(f / 0.25);
          const deita = suave((f - (D - 0.7)) / 0.6);
          const bamba = 0.06 + 0.22 * suave((f - D * 0.55) / (D * 0.35));
          inclina = DEITADO * (1 - levanta) + bamba * levanta * (1 - deita) + DEITADO * deita;
          precessao = 0.6 + f * (6 - f);
          alt = 0.07 * ESC_PIAO * (1 - levanta + deita) + Math.abs(Math.sin(f * 30)) * 0.004;
          giroPiao += dt * 26 * (1 - f / D);
        }
        piaoBase.rotation.y = precessao;
        piaoGiro.rotation.z = inclina;
        piaoGiro.position.y = alt;
        piao.rotation.y = giroPiao;
      }

      // ---- o cubo: a face de cima gira um quarto de volta
      {
        const f = q.t - cuboDesde;
        const k = f >= 0 && f < DURA_TOQUE_CASA.cubo ? suave(f / DURA_TOQUE_CASA.cubo) : 1;
        cuboCima.rotation.y = giroDe(pCubo) + 0.3 + (cuboVoltas - 1 + k) * (Math.PI / 2);
      }

      // ---- o robô: vira, anda dois passos e para
      {
        const f = q.t - roboDesde;
        const D = DURA_TOQUE_CASA.robo;
        let px = roboPara[0];
        let pz = roboPara[2];
        let passo = 0;
        let yaw = Math.atan2(roboPara[0] - roboDe[0], roboPara[2] - roboDe[2]);
        if (!(f >= 0)) yaw = yawRobo;
        if (f >= 0 && f < D) {
          const vira = suave(f / 0.3);
          const anda = suave((f - 0.3) / (D - 0.45));
          const ida = Math.atan2(roboPara[0] - roboDe[0], roboPara[2] - roboDe[2]);
          const antes = Math.atan2(roboDe[0] - roboPara[0], roboDe[2] - roboPara[2]);
          const dif = Math.atan2(Math.sin(ida - antes), Math.cos(ida - antes));
          yaw = antes + dif * vira;
          px = roboDe[0] + (roboPara[0] - roboDe[0]) * anda;
          pz = roboDe[2] + (roboPara[2] - roboDe[2]) * anda;
          passo = f > 0.3 && f < D - 0.15 ? Math.sin((f - 0.3) * 8) : 0;
        }
        roboNo.position.set(px, pc.y + Math.abs(passo) * 0.03, pz);
        roboNo.rotation.y = yaw;
        pernas[0].rotation.x = passo * 0.45;
        pernas[1].rotation.x = -passo * 0.45;
        bracos[0].rotation.x = -passo * 0.5;
        bracos[1].rotation.x = passo * 0.5;
      }

      // ---- a bola quica três vezes, cada vez mais baixo
      {
        const f = q.t - bolaDesde;
        let y = 0;
        if (f >= 0 && f < DURA_TOQUE_CASA.bola) {
          const u = f / DURA_TOQUE_CASA.bola;
          const quique = Math.floor(u * 3);
          const v = (u * 3) % 1;
          y = Math.sin(v * Math.PI) * 0.7 * Math.pow(0.5, quique);
          bola.rotation.z -= dt * 3;
        }
        bola.position.y = lugarBola[1] + y;
      }
    },
    paredes(k) {
      kParedes = k;
    },
    tocar(qual) {
      const t = agora;
      if (qual === 'telefone') foneDesde = t;
      else if (qual === 'ioio') ioioDesde = t;
      else if (qual === 'piao') {
        if (!(t - piaoDesde < DURA_TOQUE_CASA.piao)) piaoDesde = t;
      } else if (qual === 'cubo') {
        if (t - cuboDesde < DURA_TOQUE_CASA.cubo) return;
        cuboVoltas++;
        cuboDesde = t;
      } else if (qual === 'robo') {
        if (t - roboDesde < DURA_TOQUE_CASA.robo) return;
        roboDe = roboEmB ? roboB : roboA;
        roboPara = roboEmB ? roboA : roboB;
        roboEmB = !roboEmB;
        roboDesde = t;
      } else if (qual === 'bola') bolaDesde = t;
    },
    estado: () => ({
      visivel,
      tela: rotuloTela,
      disco: bracoNoDisco > 0.5,
      telefone: agora - foneDesde < DURA_TOQUE_CASA.telefone,
      ioio: agora - ioioDesde < DURA_TOQUE_CASA.ioio,
      piao: agora - piaoDesde < DURA_TOQUE_CASA.piao,
      cubo: cuboVoltas,
      robo: agora - roboDesde < DURA_TOQUE_CASA.robo,
      bola: agora - bolaDesde < DURA_TOQUE_CASA.bola,
    }),
    descartar() {
      for (const m of todas) m.dispose();
      mPonteiros?.dispose();
      for (const n of nos) n.dispose();
      for (const m of materiais) m.dispose();
      for (const t of texturas) t.dispose();
      paleta.descartar();
      pl.descartar();
    },
  };
}

/** O filme passa agora (para o som). */
export { passaFilme };
