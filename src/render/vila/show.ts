/**
 * O Show da Vila na tela (spec 026): o que muda com o estado do núcleo.
 * - os estojos no chão (um por zona): a maleta grafite de faixa amarela com o raio vermelho,
 *   girando devagar, com a estrelinha dourada e um facho de luz para a criança achar de longe;
 * - os instrumentos no palco depois de achados (o teclado aceso, a guitarra-raio no apoio, as
 *   baquetas na bateria);
 * - as três caixas do palco, apagadas ou acesas (o cone brilha e pulsa com a batida);
 * - o palco de noite: o reflexo do cromo na treliça, as lampadinhas da grade, metade dos
 *   holofotes acesos e a parede de amplificadores com o friso dourado e as luzinhas;
 * - o show: os holofotes varrem no tempo da música e pousam no chão escuro, o siga-me branco
 *   fica no vocalista (sem fumaça: decisão do dono, ela só atrapalhava), os chafarizes soltam estrelinhas
 *   frias douradas (sempre para cima e longe de gente), o raio da logo e a beira do palco
 *   pulsam com a batida; no chamado o palco pisca na passarela; no acorde final, todos os
 *   feixes ficam brancos e sobem, um clarão macio, a explosão de estrelinhas douradas e brancas
 *   da passarela e o confete de seis cores (só agora).
 *
 * Tudo só com o chão do palco desenhado (a regra do campo de visão): nada aparece antes do
 * chunk onde fica. Os feixes, as estrelinhas e o confete são três malhas (uma
 * chamada de desenho cada), com um número fixo de pedaços (nada é criado durante o show).
 */
import type { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Constants } from '@babylonjs/core/Engines/constants';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { criarPlasticos } from '../formas';
import { Pecas } from '../solidos';
import type { PecaVila, PlanoVila } from '../../world/vilaNeon';
import type { VilaVista, EventoVila } from '../../nucleo/vila';
import { CONTAGEM, faseDoShow, type FaseShow } from '../../jogo/show';
import { aplicarGesto } from '../../personagem/gestos';
import type { Pose } from '../../personagem/poses';
import { COR, Ref, perfilRaio, type Desenho } from './ref';
import { criarPaletaLuz, type PaletaLuz } from './luzes';

export interface OpcoesShowVila {
  temMalha(cx: number, cz: number): boolean;
  brilha?(m: Mesh): void;
  tapaOGlow?(m: Mesh): void;
  /** A malha fica fora do brilho (os feixes e as estrelinhas: transparentes). */
  semBrilho?(m: Mesh): void;
  /** Celular: menos estrelinhas e confete. */
  leve?: boolean;
}

export interface ShowVila {
  quadro(t: number, vista: VilaVista | null, tempoNucleo: number, noite: number): void;
  evento(e: EventoVila): void;
  /** Testes: o que está à vista (estojos no chão, instrumentos e caixas acesas). */
  estado(): {
    estojos: number;
    instrumentos: number;
    caixasAcesas: number;
    fase: string | null;
    /** Feixes acesos, estrelinhas e confetes no ar e triângulos das malhas do show. */
    feixes: number;
    estrelinhas: number;
    confetes: number;
    triangulos: number;
  };
  /**
   * A pose de um morador do palco no show: o vocalista e a guitarrista batem cabeça no tempo
   * (o gesto "roqueiro", com a cabeça embaixo em cada batida) e a banda pula no acorde final.
   */
  poseDoMorador(povoado: string, n: number, pose: Pose): Pose;
  /** O giro da banda no show (de frente para a plateia), ou null fora dele. */
  giroDoMorador(povoado: string, n: number): number | null;
  descartar(): void;
}

type V3 = [number, number, number];

/** As cores dos holofotes (vermelho, azul, branco quente e amarelo: nunca rosa no palco). */
const CORES_FEIXE: V3[] = [
  // (o vermelho puxa para o laranja: somado ao céu roxo, o vermelho puro virava rosa)
  [1, 0.26, 0.08],
  [0.2, 0.56, 1],
  [1, 0.93, 0.76],
  [1, 0.86, 0.26],
];
const CORES_LENTE = ['#ff4a3a', '#4aa0ff', '#fff1c4', '#ffe14a'];
/** O confete: seis cores, sorteadas (nunca em ordem de arco-íris, nunca rosa). */
const CORES_CONFETE: V3[] = [
  [0.91, 0.19, 0.16],
  [1, 0.88, 0.29],
  [0.18, 0.55, 1],
  [0.97, 0.96, 0.92],
  [0.13, 0.76, 0.69],
  [1, 0.54, 0.16],
];
const OURO: V3 = [1, 0.8, 0.34];
const BRANCO: V3 = [1, 0.97, 0.9];

const LADOS_FEIXE = 8;
const LADOS_POCA = 10;
const VERT_FEIXE = LADOS_FEIXE * 2 + LADOS_POCA + 1;
const LADOS_CLARAO = 12;
/** O losango da estrelinha (o meio e as quatro pontas) e os cantos do papel de confete. */
const LOSANGO = [0, 0, 1, 0, 0, 1, -1, 0, 0, -1];
const CANTOS = [-1, -1, 1, -1, 1, 1, -1, 1];

export function criarShowVila(scene: Scene, plano: PlanoVila, opcoes: OpcoesShowVila): ShowVila {
  const p = plano.pontos;
  const Y = plano.h + 1;
  const { palco } = p;
  const topo = palco.y + 1;
  /** A frente do tablado (a passarela entra 5 blocos na plateia). */
  const zFrente = palco.z0 + 5;
  const pass = p.passarela;
  const meioX = (palco.x0 + palco.x1 + 1) / 2;
  const leve = !!opcoes.leve;

  // ------------------------------------------------------------------ o chão desenhado
  const chunkTem = (x: number, z: number) =>
    opcoes.temMalha(Math.floor(x / 16), Math.floor(z / 16));
  /** Os chunks do palco e do pedaço da plateia onde os feixes pousam. */
  const chunksDoPalco: [number, number][] = [];
  for (let cx = Math.floor((palco.x0 - 8) / 16); cx <= Math.floor((palco.x1 + 9) / 16); cx++)
    for (let cz = Math.floor((palco.z0 - 14) / 16); cz <= Math.floor((palco.z1 + 2) / 16); cz++)
      chunksDoPalco.push([cx, cz]);
  const palcoPronto = () => chunksDoPalco.every(([cx, cz]) => opcoes.temMalha(cx, cz));
  /** A altura do chão em (x, z): o tablado, a passarela ou o gramado. */
  const chaoEm = (x: number, z: number): number => {
    if (x >= palco.x0 && x <= palco.x1 + 1 && z >= zFrente && z <= palco.z1 + 1) return topo;
    if (x >= pass[0] - 3 && x <= pass[0] + 3 && z >= palco.z0 && z <= zFrente) return topo;
    return Y;
  };

  // ------------------------------------------------------------------ materiais
  const pl = criarPlasticos(scene, 'vila-show');
  const matCorpo = pl.corVertice(0.3) ?? pl.cor('#ffffff', 0.3);
  const paleta = criarPaletaLuz(scene, 'vila-show-luz');
  /** As luzes que pulsam com a batida (o nível da textura acesa sobe e desce). */
  const paletaPulso = criarPaletaLuz(scene, 'vila-show-pulso');
  const semLuz = (nome: string, somar: boolean) => {
    const m = new StandardMaterial(nome, scene);
    m.disableLighting = true;
    m.emissiveColor = Color3.White();
    m.diffuseColor = Color3.Black();
    m.specularColor = Color3.Black();
    m.backFaceCulling = false;
    m.fogEnabled = false;
    if (somar) {
      m.alphaMode = Constants.ALPHA_ADD;
      m.disableDepthWrite = true;
    }
    return m;
  };
  const matFeixe = semLuz('vila-show-feixe', true);
  const matConfete = semLuz('vila-show-confete', false);
  const todas: Mesh[] = [];

  const mundo = (): Desenho => ({
    corpo: new Pecas(),
    luz: new Pecas(),
    noite: new Pecas(),
    vidro: new Pecas(),
    quadros: [],
    ox: 0,
    oz: 0,
    chao: Y,
    recorte: { x0: -Infinity, z0: -Infinity, x1: Infinity, z1: Infinity },
  });
  const ref = (d: Desenho, x: number, y: number, z: number, dir = 0, escala = 1) =>
    new Ref(d, { tipo: 'banco', x, y, z, dir } as PecaVila, escala);
  const malhaCorpo = (nome: string, pecas: Pecas): Mesh | null => {
    if (!pecas.partes.length) return null;
    const m = new Mesh(nome, scene);
    pecas.juntar().applyToMesh(m);
    m.material = matCorpo;
    m.isPickable = false;
    m.setEnabled(false);
    opcoes.tapaOGlow?.(m);
    todas.push(m);
    return m;
  };
  const malhaLuz = (nome: string, pecas: Pecas, pal: PaletaLuz = paleta): Mesh => {
    const m = new Mesh(nome, scene);
    const vd = pecas.juntar();
    pal.aplicar(vd);
    vd.applyToMesh(m);
    m.material = pal.material;
    m.isPickable = false;
    m.setEnabled(false);
    opcoes.brilha?.(m);
    todas.push(m);
    return m;
  };
  const ligar = (m: Mesh | null, ver: boolean) => {
    if (m && m.isEnabled() !== ver) m.setEnabled(ver);
  };

  // ------------------------------------------------------------------ os estojos
  const estojos = p.estojos.map(([x, y, z], i) => {
    const d = mundo();
    const r = ref(d, 0, 0, 0, 0, 1.2);
    // a maleta em pé: grafite, a faixa amarela, os cantos e os fechos de cromo, a alça
    r.caixa(0.96, 0.62, 0.28, 0, 0.08, 0, '#3d3c48', 0.05);
    r.caixa(0.98, 0.03, 0.3, 0, 0.5, 0, COR.grafite, 0);
    r.caixa(0.2, 0.64, 0.3, -0.24, 0.07, 0, '#ffd23d', 0);
    for (const sx of [-1, 1]) {
      for (const sy of [0, 1])
        for (const sz of [-1, 1])
          r.caixa(0.09, 0.09, 0.07, sx * 0.45, 0.07 + sy * 0.55, sz * 0.12, COR.cromo, 0.015);
      r.caixa(0.1, 0.1, 0.06, sx * 0.3, 0.02, 0, COR.preto, 0.02);
      r.caixa(0.09, 0.07, 0.03, sx * 0.14 + 0.12, 0.47, 0.15, COR.cromo, 0.01);
      r.caixa(0.04, 0.07, 0.04, 0.1 + sx * 0.13, 0.7, 0, COR.cromo, 0);
    }
    r.caixa(0.34, 0.05, 0.07, 0.1, 0.76, 0, COR.preto, 0.02);
    // o raio vermelho de beira amarela dos dois lados
    for (const q of [0, 2]) {
      const s = r.sub(q ? -0.16 : 0.16, 0.36, q ? -0.145 : 0.145, q);
      s.placa(perfilRaio(0.5), 0.02, 0, 0, 0, '#ffd23d');
      s.placa(perfilRaio(0.38), 0.02, 0.01, 0, 0.012, COR.vermelho);
    }
    const corpo = malhaCorpo(`vila-estojo-${i}`, d.corpo)!;
    corpo.position.set(x, y, z);
    // a estrelinha dourada em cima
    const de = mundo();
    const re = ref(de, 0, 0, 0);
    re.luz(0.5, 0.09, 0.09, 0, -0.045, 0, '#ffe9a0');
    re.luz(0.09, 0.5, 0.09, 0, -0.25, 0, '#ffe9a0');
    re.luz(0.09, 0.09, 0.5, 0, -0.045, 0, '#ffe9a0');
    re.luz(0.17, 0.17, 0.17, 0, -0.085, 0, '#fff8dc');
    const estrela = malhaLuz(`vila-estojo-estrela-${i}`, de.luz);
    estrela.position.set(x, y + 1.55, z);
    // o facho dourado que sobe (duas lâminas cruzadas, somando luz, sumindo no alto)
    const facho = new Mesh(`vila-estojo-facho-${i}`, scene);
    const P: number[] = [];
    const C: number[] = [];
    const I: number[] = [];
    for (const [ax, az] of [
      [1, 0],
      [0, 1],
    ]) {
      const b = P.length / 3;
      const w = 0.34;
      P.push(-ax * w, 0.1, -az * w, ax * w, 0.1, az * w, ax * w * 0.5, 5.2, az * w * 0.5);
      P.push(-ax * w * 0.5, 5.2, -az * w * 0.5);
      C.push(1, 0.82, 0.36, 0.3, 1, 0.82, 0.36, 0.3, 1, 0.82, 0.36, 0, 1, 0.82, 0.36, 0);
      I.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    const vd = new VertexData();
    vd.positions = P;
    vd.colors = C;
    vd.indices = I;
    vd.applyToMesh(facho);
    facho.material = matFeixe;
    facho.hasVertexAlpha = true;
    facho.isPickable = false;
    facho.position.set(x, y, z);
    facho.setEnabled(false);
    opcoes.semBrilho?.(facho);
    todas.push(facho);
    return { corpo, estrela, facho, x, y, z };
  });

  // ------------------------------------------------------------------ os instrumentos no palco
  const pecaDe = (tipo: string, n?: number) =>
    plano.pecas.find((q) => q.tipo === tipo && (n === undefined || (q.n ?? 0) === n));
  const instrumentos: (Mesh | null)[] = [null, null, null];
  {
    // 0: o teclado aceso (a luz embaixo das teclas e o mostrador)
    const t = pecaDe('teclado');
    if (t) {
      const d = mundo();
      const r = new Ref(d, t, 1.3);
      r.luz(2.0, 0.035, 0.03, 0, 0.845, 0.32, '#6fb8ff');
      r.luz(0.34, 0.035, 0.12, 0.5, 1.02, 0.16, '#ffb24a');
      for (let i = 0; i < 5; i++)
        r.luz(0.05, 0.035, 0.05, -0.78 + i * 0.14, 1.025, 0.16, '#ff5a4a');
      instrumentos[0] = malhaLuz('vila-show-teclado', d.luz);
    }
    // 1: a guitarra-raio no apoio, ao lado da guitarrista (o corpo é um raio gordinho vermelho:
    // forma inventada aqui, nunca um V nem silhueta de marca)
    const g = p.postos.guitarrista;
    {
      const d = mundo();
      const r = ref(d, g[0] + 1.9, topo, g[2] - 0.9, 2, 1.45);
      r.caixa(0.56, 0.05, 0.42, 0, 0, 0, COR.grafite, 0.02);
      r.barra([0, 0.04, -0.14], [0, 1.02, -0.2], 0.05, COR.cromo);
      r.caixa(0.4, 0.05, 0.16, 0, 0.22, 0, COR.cromo, 0.01);
      const gordo = (k: number): Array<[number, number]> =>
        perfilRaio(k).map(([x, y]) => [x * 1.45, y]);
      r.placa(gordo(1.06), 0.08, -0.03, 0.78, -0.03, '#ffd23d');
      r.placa(gordo(0.92), 0.13, -0.02, 0.78, 0, COR.vermelho);
      // os captadores, a ponte e os botões
      r.caixa(0.3, 0.05, 0.03, 0.14, 0.86, 0.07, COR.cromo, 0);
      r.caixa(0.3, 0.05, 0.03, 0.08, 0.72, 0.07, COR.cromo, 0);
      r.caixa(0.22, 0.04, 0.035, 0.0, 0.58, 0.07, COR.grafite, 0);
      for (const [x, y] of [
        [-0.12, 0.48],
        [-0.04, 0.42],
      ])
        r.caixa(0.05, 0.05, 0.03, x, y, 0.075, '#ffd23d', 0);
      // o braço grosso, a escala, os trastes, a mão e as tarraxas grandes
      r.caixa(0.13, 0.86, 0.06, 0.22, 1.16, 0, '#c58a4c', 0.015);
      r.caixa(0.1, 0.84, 0.02, 0.22, 1.17, 0.035, COR.preto, 0);
      for (let i = 0; i < 6; i++)
        r.caixa(0.1, 0.012, 0.024, 0.22, 1.26 + i * 0.12, 0.035, COR.cromo, 0);
      r.caixa(0.24, 0.26, 0.06, 0.22, 2.0, 0, COR.vermelho, 0.03);
      for (const s of [-1, 1])
        for (const y of [2.05, 2.17])
          r.caixa(0.07, 0.06, 0.05, 0.22 + s * 0.15, y, 0, COR.cromo, 0.01);
      // as cordas
      for (const x of [0.19, 0.22, 0.25]) r.caixa(0.008, 1.5, 0.008, x, 0.58, 0.062, '#e6e9f0', 0);
      instrumentos[1] = malhaCorpo('vila-show-guitarra', d.corpo);
    }
    // 2: as baquetas cruzadas em cima da caixa da bateria
    const b = pecaDe('bateria');
    if (b) {
      const d = mundo();
      const r = new Ref(d, b, 1.7);
      for (const s of [-1, 1]) {
        r.barra(
          [-1.3 - 0.3, 0.83, -0.15 - s * 0.14],
          [-1.3 + 0.3, 0.86, -0.15 + s * 0.14],
          0.035,
          '#e8c890',
        );
        r.caixa(0.05, 0.05, 0.05, -1.3 + 0.3, 0.84, -0.15 + s * 0.14, '#f4ecdc', 0.01);
      }
      instrumentos[2] = malhaCorpo('vila-show-baquetas', d.corpo);
    }
  }
  /** Onde cada instrumento fica no palco (para as estrelinhas da chegada). */
  const lugarDoInstrumento = instrumentos.map((m): V3 | null => {
    if (!m) return null;
    const c = m.getBoundingInfo().boundingBox.center;
    return [c.x, c.y, c.z];
  });

  // ------------------------------------------------------------------ as caixas acesas
  const acesas = p.caixas.map(([x, y, z], i) => {
    const d = mundo();
    const forte = i === 1 ? '#4aa0ff' : '#ff4a3a';
    const fundo = i === 1 ? '#15407a' : '#7a1a16';
    // o cone aceso dos dois lados (a plateia e quem está no palco), nas duas caixas da pilha
    for (const q of [2, 0]) {
      const r = ref(d, x + 0.5, y, z + 0.5, q);
      for (const k of [0, 1]) {
        r.prisma(8, 0.36, 0.02, 0, 0.5 + k, 0.515, forte, 'z', true);
        r.prisma(8, 0.29, 0.02, 0, 0.5 + k, 0.525, fundo, 'z', true);
        r.prisma(8, 0.12, 0.02, 0, 0.5 + k, 0.535, forte, 'z', true);
      }
      r.luz(0.9, 0.04, 0.02, 0, 0.02, 0.515, forte);
      r.luz(0.9, 0.04, 0.02, 0, 1.94, 0.515, forte);
    }
    return malhaLuz(`vila-caixa-acesa-${i}`, d.luz, paletaPulso);
  });

  // ------------------------------------------------------------------ o palco de noite e no show
  const holofotes = plano.pecas.filter((q) => q.tipo === 'holofote');
  /** O holofote do siga-me (o branco do meio da grade). */
  const sigaMe = holofotes.find((q) => (q.n ?? 0) >= 8) ?? null;
  const varredores = holofotes.filter((q) => q !== sigaMe);
  /** A lente de um holofote (mundo): de onde sai o feixe. */
  const lente = (q: PecaVila): V3 => {
    const a = (q.dir & 3) * (Math.PI / 2);
    return [q.x + Math.sin(a) * 0.47, q.y - 0.77, q.z + Math.cos(a) * 0.47];
  };
  const xA = palco.x0 - 2;
  const xB = palco.x1 + 3;
  const zTrel = zFrente - 1;
  let noiteBase: Mesh;
  let showLuz: Mesh;
  let pulso: Mesh;
  let chamado: Mesh;
  {
    // de noite: o reflexo do cromo na treliça da frente e nas torres, as lampadinhas da grade,
    // metade dos holofotes acesos e o friso dourado com as luzinhas dos amplificadores
    const d = mundo();
    const r = ref(d, 0, 0, 0);
    const REFLEXO = '#93a4dc';
    for (const y of [Y + 16.02, Y + 16.93])
      r.luz(xB - xA, 0.05, 0.04, (xA + xB) / 2, y, zTrel - 0.02, REFLEXO);
    for (const tx of [palco.x0 - 2, palco.x1 + 2])
      for (const dx of [0.05, 0.95]) {
        r.luz(0.05, 16, 0.04, tx + dx, Y, zTrel - 0.02, REFLEXO);
        r.luz(0.04, 16, 0.05, tx + (dx < 0.5 ? -0.02 : 1.02), Y, zTrel + 0.06, REFLEXO);
      }
    for (let x = palco.x0 + 0.5; x <= palco.x1 + 0.5; x += 4) {
      r.luz(0.1, 0.1, 0.1, x, Y + 15.9, zTrel + 0.5, '#8a6a3a');
      r.luz(0.17, 0.17, 0.17, x, Y + 15.74, zTrel + 0.5, '#ffe9a8');
    }
    varredores.forEach((q, i) => {
      if (i % 2) return;
      const rq = new Ref(d, q);
      rq.luz(0.4, 0.4, 0.03, 0, -0.97, 0.47, CORES_LENTE[(q.n ?? 0) % 4]);
    });
    const face = palco.z1 - 1;
    for (const ax of [palco.x0 + 1, palco.x1 - 4]) {
      r.luz(4, 0.06, 0.05, ax + 2, topo + 2.96, face - 0.025, '#f0b83c');
      for (let bx = 0; bx < 4; bx++)
        for (let by = 0; by < 3; by++)
          r.luz(0.07, 0.07, 0.03, ax + bx + 0.87, topo + by + 0.09, face - 0.015, '#ff4a3a');
    }
    noiteBase = malhaLuz('vila-palco-noite', d.luz);
  }
  {
    // no show: todos os holofotes acesos, o neon dos amplificadores e das caixas penduradas
    const d = mundo();
    const r = ref(d, 0, 0, 0);
    holofotes.forEach((q) => {
      const rq = new Ref(d, q);
      const cor = q === sigaMe ? '#fffbe8' : CORES_LENTE[(q.n ?? 0) % 4];
      rq.luz(0.42, 0.42, 0.03, 0, -0.98, 0.475, cor);
    });
    const face = palco.z1 - 1;
    for (const [ax, cor] of [
      [palco.x0 + 1, '#ff4a3a'],
      [palco.x1 - 4, '#4aa0ff'],
    ] as const) {
      r.luz(4, 0.08, 0.06, ax + 2, topo + 0.02, face - 0.04, cor);
      for (const x of [ax + 0.03, ax + 3.97])
        r.luz(0.06, 2.9, 0.06, x, topo + 0.05, face - 0.04, cor);
    }
    // as caixas penduradas (2 × 4 de cada lado): a moldura de neon
    for (const [sx, cor] of [
      [palco.x0 - 5, '#ff4a3a'],
      [palco.x1 + 3, '#4aa0ff'],
    ] as const) {
      const zf = zTrel - 0.04;
      for (const y of [Y + 9.02, Y + 12.92]) r.luz(2, 0.07, 0.06, sx + 1, y, zf, cor);
      for (const x of [sx + 0.03, sx + 1.97]) r.luz(0.07, 3.9, 0.06, x, Y + 9.05, zf, cor);
    }
    showLuz = malhaLuz('vila-palco-show', d.luz);
  }
  {
    // o que pulsa com a batida: o miolo do raio da logo, a beira do tablado e da passarela
    const d = mundo();
    const r = ref(d, 0, 0, 0);
    const raio = pecaDe('raio-palco', 0);
    if (raio) {
      const rr = new Ref(d, raio);
      rr.placa(perfilRaio(3.9), 0.06, 0.1, 5.8, -0.2, '#fff6c8', true);
    }
    const BEIRA = '#ffe14a';
    const y = topo - 0.1;
    const z = zFrente - 0.035;
    r.luz(pass[0] - 3 - palco.x0, 0.07, 0.05, (palco.x0 + pass[0] - 3) / 2, y, z, BEIRA);
    r.luz(palco.x1 - 2 - pass[0], 0.07, 0.05, (palco.x1 + 4 + pass[0]) / 2, y, z, BEIRA);
    for (const s of [-1, 1])
      r.luz(0.05, 0.07, 5, pass[0] + s * 3.035, y, (zFrente + palco.z0) / 2, BEIRA);
    r.luz(6, 0.07, 0.05, pass[0], y, palco.z0 - 0.035, BEIRA);
    pulso = malhaLuz('vila-palco-pulso', d.luz, paletaPulso);
  }
  {
    // o chamado do acorde final: a ponta da passarela acende inteira, com as lampadinhas
    const d = mundo();
    const r = ref(d, 0, 0, 0);
    const COR_CHAMA = '#fff1a0';
    r.luz(6.1, 0.22, 0.06, pass[0], topo - 0.3, palco.z0 - 0.05, COR_CHAMA);
    for (const s of [-1, 1])
      r.luz(0.06, 0.22, 5, pass[0] + s * 3.05, topo - 0.3, (zFrente + palco.z0) / 2, COR_CHAMA);
    for (let i = 0; i < 7; i++)
      r.luz(0.2, 0.2, 0.2, pass[0] - 2.7 + i * 0.9, topo + 0.02, palco.z0 + 0.14, '#ffffff');
    chamado = malhaLuz('vila-palco-chamado', d.luz);
  }

  // ------------------------------------------------------------------ as malhas que mexem
  const dinamica = (nome: string, vertices: number, indices: number[], mat: StandardMaterial) => {
    const m = new Mesh(nome, scene);
    const pos = new Float32Array(vertices * 3);
    const cor = new Float32Array(vertices * 4);
    const vd = new VertexData();
    vd.positions = pos;
    vd.colors = cor;
    vd.indices = indices;
    vd.applyToMesh(m, true);
    m.material = mat;
    m.hasVertexAlpha = true;
    m.isPickable = false;
    m.alwaysSelectAsActiveMesh = true;
    m.setEnabled(false);
    opcoes.semBrilho?.(m);
    todas.push(m);
    return {
      m,
      pos,
      cor,
      enviar() {
        m.updateVerticesData(VertexBuffer.PositionKind, pos, false, false);
        m.updateVerticesData(VertexBuffer.ColorKind, cor, false, false);
      },
    };
  };
  // os feixes: um cone que some na ponta e a poça de luz no chão, por holofote; e o clarão
  const N_FEIXES = varredores.length + (sigaMe ? 1 : 0);
  const idxFeixes: number[] = [];
  for (let f = 0; f < N_FEIXES; f++) {
    const b = f * VERT_FEIXE;
    for (let j = 0; j < LADOS_FEIXE; j++) {
      const j2 = (j + 1) % LADOS_FEIXE;
      idxFeixes.push(b + j, b + j2, b + LADOS_FEIXE + j2);
      idxFeixes.push(b + j, b + LADOS_FEIXE + j2, b + LADOS_FEIXE + j);
    }
    const c = b + LADOS_FEIXE * 2;
    for (let j = 0; j < LADOS_POCA; j++)
      idxFeixes.push(c, c + 1 + j, c + 1 + ((j + 1) % LADOS_POCA));
  }
  const baseClarao = N_FEIXES * VERT_FEIXE;
  for (let j = 0; j < LADOS_CLARAO; j++)
    idxFeixes.push(baseClarao, baseClarao + 1 + j, baseClarao + 1 + ((j + 1) % LADOS_CLARAO));
  const feixes = dinamica('vila-show-feixes', baseClarao + LADOS_CLARAO + 1, idxFeixes, matFeixe);

  // as estrelinhas (losangos que somam luz) e o confete (papeizinhos que giram)
  const MAX_E = leve ? 180 : 340;
  const MAX_C = leve ? 90 : 170;
  const idxE: number[] = [];
  for (let i = 0; i < MAX_E; i++) {
    const b = i * 5;
    idxE.push(b, b + 1, b + 2, b, b + 2, b + 3, b, b + 3, b + 4, b, b + 4, b + 1);
  }
  const estrelas = dinamica('vila-show-estrelinhas', MAX_E * 5, idxE, matFeixe);
  const idxC: number[] = [];
  for (let i = 0; i < MAX_C; i++) {
    const b = i * 4;
    idxC.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  const confete = dinamica('vila-show-confete', MAX_C * 4, idxC, matConfete);
  /** x, y, z, vx, vy, vz, vida, vidaTotal, tamanho, r, g, b, fase (13 por pedaço). */
  const CAMPOS = 13;
  const dadosE = new Float32Array(MAX_E * CAMPOS);
  const dadosC = new Float32Array(MAX_C * CAMPOS);
  let proxE = 0;
  let vivasE = 0;
  let vivosC = 0;
  const soltar = (
    dados: Float32Array,
    i: number,
    pos: V3,
    vel: V3,
    vida: number,
    tam: number,
    cor: V3,
  ) => {
    const o = i * CAMPOS;
    dados.set(pos, o);
    dados.set(vel, o + 3);
    dados[o + 6] = vida;
    dados[o + 7] = vida;
    dados[o + 8] = tam;
    dados.set(cor, o + 9);
    dados[o + 12] = Math.random() * 6.28;
  };
  const estrelinha = (pos: V3, vel: V3, vida: number, tam: number, cor: V3) => {
    soltar(dadosE, proxE, pos, vel, vida, tam, cor);
    proxE = (proxE + 1) % MAX_E;
  };
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  /** Um punhado de estrelinhas para cima (o plim do estojo, o toque na caixa, o acorde). */
  const punhado = (x: number, y: number, z: number, n: number, forcaP: number, tam: number) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28;
      const h = rnd(0.2, 1) * forcaP * 0.45;
      estrelinha(
        [x, y, z],
        [Math.cos(a) * h, rnd(0.6, 1) * forcaP, Math.sin(a) * h],
        rnd(0.5, 1.0),
        tam * rnd(0.7, 1.2),
        Math.random() < 0.3 ? BRANCO : OURO,
      );
    }
  };

  /** Os quatro chafarizes de estrelinhas: os cantos da frente do tablado e os pés da passarela. */
  const chafarizes: V3[] = [
    [palco.x0 + 2.5, topo + 0.1, zFrente + 0.7],
    [palco.x1 - 1.5, topo + 0.1, zFrente + 0.7],
    [pass[0] - 5, topo + 0.1, zFrente + 0.7],
    [pass[0] + 5, topo + 0.1, zFrente + 0.7],
  ];
  const acumulado = [0, 0, 0, 0];

  // ------------------------------------------------------------------ o estado
  let fase: FaseShow | null = null;
  let insVistos = 0;
  let ultimoT = -1;
  /** 0 apagado, 1 no show (sobe e desce macio). */
  let forca = 0;
  let acordes: number[] = [];
  let golpe = 0;
  /** O show (pelo começo dele) que já teve a festa do acorde final. */
  let finalFeito = -1;
  let idadeFinal = Infinity;
  let vistaAtual: VilaVista | null = null;
  let tempoAtual = 0;
  let feixesAcesos = 0;
  let tinhaVista = false;
  const feito = [false, false, false];

  /** A festa do acorde final: a explosão da passarela e o confete. */
  function festaFinal(): void {
    // o estouro dourado e branco no alto, por cima do palco (abre em roda e some caindo)
    const no = leve ? 50 : 90;
    for (let i = 0; i < no; i++) {
      const a = Math.random() * 6.283;
      const e = Math.acos(rnd(-0.35, 1));
      const v = rnd(5.5, 8);
      estrelinha(
        [pass[0], topo + 8.5, zFrente - 1],
        [
          Math.cos(a) * Math.sin(e) * v,
          Math.cos(e) * v * 0.8 + 2,
          Math.sin(a) * Math.sin(e) * v * 0.6,
        ],
        rnd(1.0, 1.6),
        rnd(0.3, 0.5),
        i % 3 === 0 ? BRANCO : OURO,
      );
    }
    const n = leve ? 70 : 130;
    for (let i = 0; i < n; i++) {
      // das beiradas da passarela, sempre para cima e para fora (o vocalista fica no meio)
      const s = i % 2 ? 1 : -1;
      estrelinha(
        [pass[0] + s * 3.1, topo + 0.2, rnd(palco.z0 + 0.3, zFrente - 0.3)],
        [s * rnd(0.3, 3.2), rnd(6, 12.5), rnd(-1.6, 1.2)],
        rnd(1.1, 2.1),
        rnd(0.26, 0.48),
        i % 3 === 0 ? BRANCO : OURO,
      );
    }
    for (let i = 0; i < MAX_C; i++)
      soltar(
        dadosC,
        i,
        [pass[0] + rnd(-13, 13), Y + rnd(11, 16.5), rnd(palco.z0 - 9, zFrente + 3)],
        [rnd(-0.6, 0.6), rnd(-2.6, -1.3), rnd(-0.5, 0.5)],
        rnd(4.5, 7),
        rnd(0.12, 0.2),
        CORES_CONFETE[(Math.random() * CORES_CONFETE.length) | 0],
      );
  }

  /** Onde a câmera está (o feixe some perto dela: não vira uma parede de cor na cara). */
  const cam: V3 = [0, 0, 0];
  const pertoDaCamera = (x: number, y: number, z: number) => {
    const d = Math.hypot(x - cam[0], y - cam[1], z - cam[2]);
    return Math.min(1, Math.max(0, (d - 2.5) / 7));
  };
  const tmpA: V3 = [0, 0, 0];
  const tmpB: V3 = [0, 0, 0];
  const tmpC: V3 = [0, 0, 0];

  /** Escreve um feixe: o cone da lente até `fim` (raio `rp`) e a poça no chão. */
  function escreverFeixe(
    f: number,
    de: V3,
    fim: V3,
    rp: number,
    cor: V3,
    alfa: number,
    poca: number,
  ): void {
    const P = feixes.pos;
    const C = feixes.cor;
    let ux = fim[0] - de[0];
    let uy = fim[1] - de[1];
    let uz = fim[2] - de[2];
    const L = Math.hypot(ux, uy, uz) || 1;
    ux /= L;
    uy /= L;
    uz /= L;
    // dois eixos de lado (e1 horizontal)
    let e1x = -uz;
    let e1z = ux;
    const l1 = Math.hypot(e1x, e1z);
    if (l1 < 1e-4) {
      e1x = 1;
      e1z = 0;
    } else {
      e1x /= l1;
      e1z /= l1;
    }
    const e2x = uy * e1z;
    const e2y = uz * e1x - ux * e1z;
    const e2z = -uy * e1x;
    const b = f * VERT_FEIXE;
    for (let j = 0; j < LADOS_FEIXE; j++) {
      const a = (j * 2 * Math.PI) / LADOS_FEIXE;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const dx = e1x * c + e2x * s;
      const dy = e2y * s;
      const dz = e1z * c + e2z * s;
      let o = (b + j) * 3;
      P[o] = de[0] + dx * 0.2;
      P[o + 1] = de[1] + dy * 0.2;
      P[o + 2] = de[2] + dz * 0.2;
      o = (b + LADOS_FEIXE + j) * 3;
      P[o] = fim[0] + dx * rp;
      P[o + 1] = fim[1] + dy * rp;
      P[o + 2] = fim[2] + dz * rp;
      let k = (b + j) * 4;
      C[k] = cor[0];
      C[k + 1] = cor[1];
      C[k + 2] = cor[2];
      C[k + 3] = alfa * pertoDaCamera(P[(b + j) * 3], P[(b + j) * 3 + 1], P[(b + j) * 3 + 2]);
      k = (b + LADOS_FEIXE + j) * 4;
      C[k] = cor[0];
      C[k + 1] = cor[1];
      C[k + 2] = cor[2];
      o = (b + LADOS_FEIXE + j) * 3;
      C[k + 3] = alfa * 0.06 * pertoDaCamera(P[o], P[o + 1], P[o + 2]);
    }
    // a poça de luz no chão
    const cb = b + LADOS_FEIXE * 2;
    const gy = chaoEm(fim[0], fim[2]) + 0.05;
    const rr = rp * 1.25;
    P[cb * 3] = fim[0];
    P[cb * 3 + 1] = gy;
    P[cb * 3 + 2] = fim[2];
    C[cb * 4] = cor[0];
    C[cb * 4 + 1] = cor[1];
    C[cb * 4 + 2] = cor[2];
    C[cb * 4 + 3] = poca;
    for (let j = 0; j < LADOS_POCA; j++) {
      const a = (j * 2 * Math.PI) / LADOS_POCA;
      const o = (cb + 1 + j) * 3;
      P[o] = fim[0] + Math.cos(a) * rr;
      P[o + 1] = gy;
      P[o + 2] = fim[2] + Math.sin(a) * rr * 1.2;
      const k = (cb + 1 + j) * 4;
      C[k] = cor[0];
      C[k + 1] = cor[1];
      C[k + 2] = cor[2];
      C[k + 3] = 0;
    }
  }

  const mistura = (a: V3, b: V3, k: number, out: V3): V3 => {
    out[0] = a[0] + (b[0] - a[0]) * k;
    out[1] = a[1] + (b[1] - a[1]) * k;
    out[2] = a[2] + (b[2] - a[2]) * k;
    return out;
  };

  return {
    quadro(t, vista, tempoNucleo, noite) {
      const dt = ultimoT < 0 ? 0 : Math.min(0.1, Math.max(0, t - ultimoT));
      ultimoT = t;
      vistaAtual = vista;
      tempoAtual = tempoNucleo;
      pl.definirLuz(1 - 0.5 * noite);
      const pronto = palcoPronto();
      const show = vista?.show ?? null;
      fase = show ? faseDoShow(show, tempoNucleo) : null;
      const noShow = pronto && !!show && fase !== 'acabou';
      forca += ((noShow ? 1 : 0) - forca) * Math.min(1, dt * (noShow ? 1.6 : 1.1));
      // as batidas desde o primeiro tempo (a contagem das baquetas vem antes)
      const d = show ? tempoNucleo - show.inicio - CONTAGEM : 0;
      const batidas = d / 0.5;
      const naBatida = batidas - Math.floor(batidas);
      const pulsoBatida = noShow && d >= 0 ? Math.exp(-naBatida * 4.5) : 0;

      // ---- os estojos e os instrumentos
      const ins = vista?.ins ?? [false, false, false];
      insVistos = ins.filter(Boolean).length;
      estojos.forEach((e, i) => {
        const ver = !ins[i] && chunkTem(e.x, e.z);
        ligar(e.corpo, ver);
        ligar(e.estrela, ver);
        ligar(e.facho, ver);
        if (!ver) return;
        const sobe = Math.sin(t * 2.2 + i * 1.7) * 0.09;
        e.corpo.position.y = e.y + 0.28 + sobe;
        e.corpo.rotation.y = t * 0.9 + i * 2;
        e.estrela.scaling.setAll(0.8 + 0.3 * Math.sin(t * 5 + i));
        e.estrela.rotation.y = -t * 1.6;
        e.estrela.position.y = e.y + 1.62 + sobe;
      });
      instrumentos.forEach((m, i) => ligar(m, pronto && ins[i]));
      // o instrumento que acabou de chegar: um punhado de estrelinhas no lugar dele no palco
      ins.forEach((tem, i) => {
        const l = lugarDoInstrumento[i];
        if (tem && !feito[i] && tinhaVista && pronto && l)
          punhado(l[0], l[1] + 0.4, l[2], 16, 4, 0.22);
        feito[i] = tem;
      });
      tinhaVista = !!vista;

      // ---- as caixas e as luzes do palco
      const cx = vista?.cx ?? [false, false, false];
      acesas.forEach((m, i) => ligar(m, pronto && cx[i]));
      ligar(noiteBase, pronto && (noite > 0.3 || forca > 0.05));
      ligar(showLuz, pronto && forca > 0.3);
      ligar(pulso, pronto && forca > 0.3);
      // o chamado: a ponta da passarela pisca no tempo (aceso meio tempo, apagado meio tempo)
      ligar(chamado, noShow && fase === 'chamando' && naBatida < 0.5);
      golpe = Math.max(0, golpe - dt * 4);
      const tex = paletaPulso.material.emissiveTexture;
      if (tex)
        tex.level = noShow
          ? 0.5 + 0.5 * Math.max(pulsoBatida, golpe)
          : 0.72 + 0.1 * Math.sin(t * 2.4);

      // ---- os acordes de cada toque (no instante do núcleo) e o acorde final
      if (acordes.length) {
        const fica: number[] = [];
        for (const q of acordes) {
          if (tempoNucleo < q) fica.push(q);
          else if (tempoNucleo - q < 1 && pronto) {
            golpe = 1;
            for (const c of chafarizes.slice(2)) punhado(c[0], c[1], c[2], leve ? 5 : 9, 6.5, 0.2);
          }
        }
        acordes = fica;
      }
      idadeFinal = show && show.final !== null ? tempoNucleo - show.final : Infinity;
      if (show && show.final !== null && finalFeito !== show.inicio && idadeFinal >= 0) {
        finalFeito = show.inicio;
        if (pronto && idadeFinal < 1.5) festaFinal();
      }
      const noFinal = noShow && idadeFinal >= 0 && idadeFinal < 5;

      // ---- os chafarizes de estrelinhas (de dois em dois, a cada quatro compassos)
      if (noShow && d >= 0 && dt > 0) {
        const compasso = Math.floor(d / 2);
        const noCompasso = d / 2 - compasso;
        chafarizes.forEach((c, i) => {
          const par = i < 2 ? 2 : 0;
          const ligado =
            (noFinal && idadeFinal < 2.6) ||
            (fase === 'tocando' && compasso >= 2 && compasso % 4 === par && noCompasso < 0.62);
          if (!ligado) return;
          acumulado[i] += dt * (leve ? 16 : 30);
          while (acumulado[i] >= 1) {
            acumulado[i] -= 1;
            estrelinha(
              [c[0] + rnd(-0.1, 0.1), c[1], c[2] + rnd(-0.1, 0.1)],
              [rnd(-0.8, 0.8), rnd(6.2, 8.6), rnd(-0.5, 0.5)],
              rnd(0.9, 1.4),
              rnd(0.14, 0.24),
              Math.random() < 0.25 ? BRANCO : OURO,
            );
          }
        });
      }

      // ---- a câmera (os pedaços que olham para ela)
      const mm = scene.activeCamera ? scene.activeCamera.getWorldMatrix().m : null;
      const rx = mm ? mm[0] : 1;
      const ry = mm ? mm[1] : 0;
      const rz = mm ? mm[2] : 0;
      const ux = mm ? mm[4] : 0;
      const uy = mm ? mm[5] : 1;
      const uz = mm ? mm[6] : 0;

      // ---- os feixes
      const verFeixes = pronto && forca > 0.02;
      if (scene.activeCamera) {
        const g = scene.activeCamera.globalPosition;
        cam[0] = g.x;
        cam[1] = g.y;
        cam[2] = g.z;
      }
      ligar(feixes.m, verFeixes);
      feixesAcesos = 0;
      if (verFeixes) {
        // de dia o feixe some no claro: fica mais fraco; de noite ele pousa no chão escuro
        const base = forca * (0.15 + 0.13 * noite) * (0.8 + 0.25 * pulsoBatida + 0.35 * golpe);
        // no acorde final: brancos e para o céu por um instante, depois voltam
        const sobe = noFinal
          ? Math.min(1, idadeFinal / 0.2) * Math.max(0, Math.min(1, (2.4 - idadeFinal) / 0.8))
          : 0;
        const branco = noFinal ? Math.max(0, Math.min(1, (1.6 - idadeFinal) / 0.7)) : 0;
        const ceu = sobe * sobe * (3 - 2 * sobe);
        varredores.forEach((q, i) => {
          const de = lente(q);
          // o alvo no chão: varrendo a plateia no tempo; no chamado, em roda na ponta da passarela
          let ax: number;
          let az: number;
          if (fase === 'chamando') {
            const a = (i / varredores.length) * 6.283 + batidas * 0.785;
            ax = pass[0] + Math.cos(a) * 3.6;
            az = pass[2] + 0.8 + Math.sin(a) * 2.6;
          } else {
            ax = de[0] * 0.5 + meioX * 0.5 + 7 * Math.sin((batidas / 16) * 6.283 + i * 1.7);
            az = palco.z0 - 6.5 + 4.6 * Math.sin((batidas / 8) * 6.283 + i * 0.9);
          }
          tmpA[0] = ax;
          tmpA[1] = chaoEm(ax, az) + 0.05;
          tmpA[2] = az;
          // para o céu: em leque, para a frente e para cima
          // (fora do acorde final a idade é infinita: o seno daria NaN e apagaria o feixe)
          tmpB[0] =
            de[0] + (de[0] - meioX) * 1.1 + (noFinal ? Math.sin(idadeFinal * 2 + i) * 2 : 0);
          tmpB[1] = de[1] + 13;
          tmpB[2] = de[2] - 22;
          const fim = mistura(tmpA, tmpB, ceu, tmpA);
          const cor = mistura(CORES_FEIXE[(q.n ?? 0) % 4], BRANCO, branco, tmpC);
          const poca = base * 1.5 * (1 - ceu) ** 3;
          escreverFeixe(i, de, fim, 1.2 + 1.2 * ceu, cor, base * (1 + 0.8 * branco), poca);
          feixesAcesos++;
        });
        if (sigaMe) {
          const de = lente(sigaMe);
          tmpA[0] = pass[0] + Math.sin(t * 0.7) * 0.15;
          tmpA[1] = topo + 0.05;
          tmpA[2] = pass[2] + 0.1;
          escreverFeixe(varredores.length, de, tmpA, 1.15, BRANCO, base * 1.25, base * 1.7);
          feixesAcesos++;
        }
        // o clarão macio do acorde final (um disco de luz por cima do palco, some em meio segundo)
        const clarao = noFinal ? Math.exp(-idadeFinal * 2.4) * 0.85 : 0;
        const P = feixes.pos;
        const C = feixes.cor;
        const cym = topo + 4;
        const czm = zFrente - 1;
        P[baseClarao * 3] = pass[0];
        P[baseClarao * 3 + 1] = cym;
        P[baseClarao * 3 + 2] = czm;
        C[baseClarao * 4] = 1;
        C[baseClarao * 4 + 1] = 0.98;
        C[baseClarao * 4 + 2] = 0.9;
        C[baseClarao * 4 + 3] = clarao;
        for (let j = 0; j < LADOS_CLARAO; j++) {
          const a = (j * 6.283) / LADOS_CLARAO;
          const c = Math.cos(a) * 20;
          const s = Math.sin(a) * 13;
          const o = (baseClarao + 1 + j) * 3;
          P[o] = pass[0] + rx * c + ux * s;
          P[o + 1] = cym + ry * c + uy * s;
          P[o + 2] = czm + rz * c + uz * s;
          const k = (baseClarao + 1 + j) * 4;
          C[k] = 1;
          C[k + 1] = 0.98;
          C[k + 2] = 0.9;
          C[k + 3] = 0;
        }
        feixes.enviar();
      }

      // ---- as estrelinhas
      vivasE = 0;
      {
        const P = estrelas.pos;
        const C = estrelas.cor;
        for (let i = 0; i < MAX_E; i++) {
          const o = i * CAMPOS;
          let vida = dadosE[o + 6];
          const b = i * 5;
          if (vida <= 0) {
            for (let j = 1; j < 5; j++) {
              P[(b + j) * 3] = P[b * 3];
              P[(b + j) * 3 + 1] = P[b * 3 + 1];
              P[(b + j) * 3 + 2] = P[b * 3 + 2];
            }
            continue;
          }
          vida -= dt;
          dadosE[o + 6] = vida;
          dadosE[o + 4] -= 9.5 * dt;
          const ar = Math.exp(-dt * 0.9);
          dadosE[o + 3] *= ar;
          dadosE[o + 5] *= ar;
          dadosE[o] += dadosE[o + 3] * dt;
          dadosE[o + 1] += dadosE[o + 4] * dt;
          dadosE[o + 2] += dadosE[o + 5] * dt;
          const k = Math.max(0, vida / dadosE[o + 7]);
          // a estrelinha pisca um pouco e encolhe no fim
          const s =
            dadosE[o + 8] * (0.45 + 0.55 * k) * (0.8 + 0.2 * Math.sin(t * 30 + dadosE[o + 12]));
          for (let j = 0; j < 5; j++) {
            const a = LOSANGO[j * 2] * s;
            const c = LOSANGO[j * 2 + 1] * s;
            P[(b + j) * 3] = dadosE[o] + rx * a + ux * c;
            P[(b + j) * 3 + 1] = dadosE[o + 1] + ry * a + uy * c;
            P[(b + j) * 3 + 2] = dadosE[o + 2] + rz * a + uz * c;
            C[(b + j) * 4] = dadosE[o + 9];
            C[(b + j) * 4 + 1] = dadosE[o + 10];
            C[(b + j) * 4 + 2] = dadosE[o + 11];
            C[(b + j) * 4 + 3] = j === 0 ? Math.min(1, k * 2.4) : 0.12 * k;
          }
          vivasE++;
        }
        const ver = vivasE > 0;
        if (ver || estrelas.m.isEnabled()) estrelas.enviar();
        ligar(estrelas.m, ver);
      }

      // ---- o confete
      vivosC = 0;
      {
        const P = confete.pos;
        const C = confete.cor;
        // de noite o papel fica na luz do palco (não some no escuro)
        const claro = 0.62 + 0.38 * (1 - noite);
        for (let i = 0; i < MAX_C; i++) {
          const o = i * CAMPOS;
          let vida = dadosC[o + 6];
          const b = i * 4;
          if (vida <= 0) {
            for (let j = 1; j < 4; j++) {
              P[(b + j) * 3] = P[b * 3];
              P[(b + j) * 3 + 1] = P[b * 3 + 1];
              P[(b + j) * 3 + 2] = P[b * 3 + 2];
            }
            continue;
          }
          vida -= dt;
          const chao = chaoEm(dadosC[o], dadosC[o + 2]) + 0.04;
          if (dadosC[o + 1] > chao) {
            // cai rodopiando, balançando de lado
            const f = dadosC[o + 12] + t * 3.2;
            dadosC[o] += (dadosC[o + 3] + Math.sin(f) * 0.7) * dt;
            dadosC[o + 1] += dadosC[o + 4] * dt;
            dadosC[o + 2] += (dadosC[o + 5] + Math.cos(f * 0.8) * 0.5) * dt;
            if (dadosC[o + 1] <= chao) {
              dadosC[o + 1] = chao;
              vida = Math.min(vida, 1.2);
            }
          }
          dadosC[o + 6] = vida;
          const s = dadosC[o + 8] * Math.min(1, vida / 0.5);
          const gira = dadosC[o + 12] + t * 5;
          const noChao = dadosC[o + 1] <= chao;
          // o papel gira no próprio eixo (a largura abre e fecha); no chão, fica deitado
          const c = Math.cos(gira);
          const sn = Math.sin(gira);
          const abre = noChao ? 1 : Math.cos(gira * 1.7);
          const ax = noChao ? c * s : (rx * c + ux * sn) * s;
          const ay = noChao ? 0 : (ry * c + uy * sn) * s;
          const az = noChao ? sn * s : (rz * c + uz * sn) * s;
          const bx = noChao ? -sn * s * 0.6 : (-rx * sn + ux * c) * s * 0.62 * abre;
          const by = noChao ? 0 : (-ry * sn + uy * c) * s * 0.62 * abre;
          const bz = noChao ? c * s * 0.6 : (-rz * sn + uz * c) * s * 0.62 * abre;
          const luz = claro * (abre < 0 ? 0.78 : 1);
          for (let j = 0; j < 4; j++) {
            const u = CANTOS[j * 2];
            const v = CANTOS[j * 2 + 1];
            P[(b + j) * 3] = dadosC[o] + ax * u + bx * v;
            P[(b + j) * 3 + 1] = dadosC[o + 1] + ay * u + by * v;
            P[(b + j) * 3 + 2] = dadosC[o + 2] + az * u + bz * v;
            C[(b + j) * 4] = dadosC[o + 9] * luz;
            C[(b + j) * 4 + 1] = dadosC[o + 10] * luz;
            C[(b + j) * 4 + 2] = dadosC[o + 11] * luz;
            C[(b + j) * 4 + 3] = 1;
          }
          vivosC++;
        }
        const ver = vivosC > 0;
        if (ver || confete.m.isEnabled()) confete.enviar();
        ligar(confete.m, ver);
      }
    },
    evento(e) {
      if (e.e === 'vilaAcorde') acordes.push(e.quando);
      else if (e.e === 'vilaEstojo') {
        // o plim: as estrelinhas sobem de onde o estojo estava
        const q = estojos[e.i];
        if (q && chunkTem(q.x, q.z)) punhado(q.x, q.y + 0.6, q.z, leve ? 14 : 24, 5.5, 0.24);
      } else if (e.e === 'vilaCaixa') {
        const c = p.caixas[e.i];
        if (c && e.acesa && palcoPronto()) {
          punhado(c[0] + 0.5, c[1] + 2.1, c[2] + 0.5, leve ? 10 : 18, 5, 0.22);
          golpe = 1;
        }
      }
      // (o acorde final vem pelo estado do show: vale também para quem chegou no meio)
    },
    estado: () => ({
      estojos: estojos.filter((e) => e.corpo.isEnabled()).length,
      instrumentos: insVistos,
      caixasAcesas: acesas.filter((m) => m.isEnabled()).length,
      fase,
      feixes: feixes.m.isEnabled() ? feixesAcesos : 0,
      estrelinhas: vivasE,
      confetes: vivosC,
      triangulos: todas.reduce(
        (n, m) => n + (m.isEnabled() ? (m.getTotalIndices() / 3) | 0 : 0),
        0,
      ),
    }),
    poseDoMorador(povoado, n, pose) {
      const show = vistaAtual?.show;
      // a banda (0 a 2) e a moça do lanche (3, dentro do festival, a plateia de casa)
      if (!show || povoado !== 'vila' || n > 3) return pose;
      if (faseDoShow(show, tempoAtual) === 'acabou') return pose;
      if (show.final !== null) {
        // o acorde final: todo mundo pula de braços para o alto
        const idade = tempoAtual - show.final;
        return idade >= 0 && idade < 1.5 ? aplicarGesto(pose, 'pulo-estrela', idade + 0.05) : pose;
      }
      const d = tempoAtual - show.inicio - CONTAGEM;
      if (d < 0) return pose;
      // a moça do lanche pula de braços em V no tempo (um pulo a cada compasso)
      if (n === 3) return aplicarGesto(pose, 'pulo-estrela', 0.25 + (((d % 2) + 2) % 2) * 0.6);
      // o roadie bate palma no tempo
      if (n === 1) return aplicarGesto(pose, 'aplaudir', 0.3 + (((d % 1) + 1) % 1));
      // o vocalista e a guitarrista batem cabeça no tempo: a cabeça embaixo em cada batida
      return aplicarGesto(pose, 'roqueiro', 1 + ((((d + 0.125) % 0.5) + 0.5) % 0.5));
    },
    giroDoMorador(povoado, n) {
      const show = vistaAtual?.show;
      if (!show || povoado !== 'vila' || n > 2) return null;
      if (faseDoShow(show, tempoAtual) === 'acabou') return null;
      // a plateia fica do lado da ponta da passarela (z menor que o fundo do palco)
      return Math.PI;
    },
    descartar() {
      for (const m of todas) m.dispose();
      matFeixe.dispose();
      matConfete.dispose();
      paleta.descartar();
      paletaPulso.descartar();
      pl.descartar();
    },
  };
}
