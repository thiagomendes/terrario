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
 *   pulsam com a batida; no acorde final (que vem sozinho), todos os
 *   feixes ficam brancos e sobem, um clarão macio, a explosão de estrelinhas douradas e brancas
 *   da passarela e o confete de seis cores (só agora).
 *
 * O show de verdade (o dono, 16 nov 2026): na abertura o palco escurece, os feixes varrem a
 * plateia, as caixas pulsam em cada batida, os chafarizes soltam estrelinhas, o raio da logo
 * acende piscando como neon e as quatro batidas da contagem piscam o palco até o estouro (tudo
 * aceso de uma vez); na entrada o siga-me acha o vocalista; nas músicas os feixes andam no tempo
 * de cada uma e os chafarizes são do refrão; nas pausas os feixes sobem devagar; no fim, os fogos
 * de estrelinhas por cima do palco.
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
import {
  CONTA_INTRO,
  ESCURO_INTRO,
  INTRO,
  RAIO_ACENDE,
  faseDoShow,
  momentoDoShow,
  type FaseShow,
  type MomentoShow,
} from '../../jogo/show';
import { N0_PUBLICO, daTurma, papelNaBanda } from '../../nucleo/vila';
import { noPalco, paraOMundo, posturaNaBanda, REVERENCIA } from '../../jogo/coreografia';
import {
  TECLADO_DO_PALCO,
  arpejoDoTeclado,
  poseDaBanda,
  xDaTecla,
  type TeclaTocada,
} from './banda';
import { lugarDoPublico, publicoDaVila } from '../../world/publicoVila';
import { aplicarGesto } from '../../personagem/gestos';
import type { Pose } from '../../personagem/poses';
import { COR, Ref, perfilEstrela, perfilRaio, type Desenho } from './ref';
import { ARCO } from './pecasFestival';
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

/**
 * Perto assim do lugar dele, o morador da turma já chegou (o núcleo para o morador a até ~1,2
 * bloco do posto): dança no show e fica de frente para o palco.
 */
const CHEGOU_AO_LUGAR = 1.6;

/** Quem da turma do show segura um bastão de luz (oito dos 20 de sempre e sete dos que vêm). */
const BASTAO: readonly number[] = [0, 3, 5, 8, 11, 13, 16, 19, 21, 24, 27, 30, 33, 36, 38];

/** O neon dos bastões de luz da turma do show (sorteado por pessoa; nunca isqueiro nem fogo). */
const NEON_BASTAO = ['#4df07a', '#3aa8ff', '#ffe44a', '#2ee8d8', '#ff9a3a'];

export interface ShowVila {
  /**
   * `noiteShow`: a hora é noite de show (`noiteDeShow`). Quando ela chega (e não há show), o
   * palco "aquece": a beira e o raio acendem devagar e os holofotes sobem num leque macio.
   */
  quadro(
    t: number,
    vista: VilaVista | null,
    tempoNucleo: number,
    noite: number,
    noiteShow?: boolean,
  ): void;
  evento(e: EventoVila): void;
  /** Testes: o que está à vista (estojos no chão, instrumentos e caixas acesas). */
  estado(): {
    estojos: number;
    instrumentos: number;
    /** Os arcos do rinque acesos agora e quantas vezes algum piscou (alguém passou). */
    arcosAcesos: number;
    arcosPiscados: number;
    caixasAcesas: number;
    fase: string | null;
    /** Feixes acesos, estrelinhas e confetes no ar e triângulos das malhas do show. */
    feixes: number;
    estrelinhas: number;
    confetes: number;
    triangulos: number;
    /** O palco aquecendo agora (a noite acabou de chegar). */
    aquecendo: boolean;
    /** Quantas vezes o palco aqueceu (a noite chegou). */
    aquecimentos: number;
    /** A turma do show: quantos no lugar e quantos longe dele (andando), no último quadro. */
    turma: { noLugar: number; andando: number; longe: number[] };
  };
  /**
   * A pose de um morador do palco no show: o vocalista e a guitarrista batem cabeça no tempo
   * (o gesto "roqueiro", com a cabeça embaixo em cada batida) e a banda pula no acorde final.
   */
  poseDoMorador(povoado: string, n: number, pose: Pose, onde?: { x: number; z: number }): Pose;
  /**
   * O giro fixo do morador: a banda no show (de frente para a plateia), a turma da grade (de
   * frente para o palco no show, para o meio da rodinha de papo), ou null (o giro dele).
   */
  giroDoMorador(povoado: string, n: number, onde?: { x: number; z: number }): number | null;
  /** A cor do bastão de luz na mão de um morador da turma (null: mão vazia). */
  luzNaMao(povoado: string, n: number): string | null;
  /** O bastão aparece agora (a noite do show, ou com o show tocando)? */
  mostrarLuzNaMao(): boolean;
  /**
   * O neon do palco agora (0 a 1): na abertura ele apaga no escuro e acende piscando com o raio
   * da logo, inteiro no estouro.
   */
  luzDoPalco(): number;
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
/** O neon dos arcos do rinque aceso (branco-azul, do tubo que acende). */
const NEON_ACESO = '#9fe6ff';
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

  // ------------------------------------------------------------------ os arcos do rinque (f4)
  /**
   * O neon aceso de cada arco da volta no rinque, por cima do tubo apagado da peça: o tubo
   * branco-azul por dentro do vão, as lampadinhas de cubo e a estrela. Fica aceso para quem já
   * passou por ele de patins nesta volta (o quadro de cada um diz quais); quem passa (qualquer
   * um) faz o arco piscar e soltar estrelinhas.
   */
  const arcos = p.arcos.map((a, i) => {
    const peca = plano.pecas.find((q) => q.tipo === 'arco-rinque' && (q.n ?? 0) === i);
    const d = mundo();
    if (peca) {
      const r = new Ref(d, peca, 1);
      const { meia, poste, vao, alto } = ARCO;
      for (const sx of [-1, 1])
        r.luz(0.13, vao - 0.26, 0.21, sx * meia - sx * (poste / 2 + 0.035), 0.23, 0, NEON_ACESO);
      r.luz(2 * meia - poste - 0.06, 0.13, 0.21, 0, vao - 0.13, 0, NEON_ACESO);
      for (const z of [-1, 1])
        for (let k = 0; k < 7; k++)
          r.luz(0.17, 0.17, 0.065, -2.4 + k * 0.8, vao + 0.265, z * (poste / 2 + 0.025), '#fff1c4');
      for (const z of [-0.09, 0.09])
        r.placa(perfilEstrela(0.52), 0.09, 0, alto + 0.7, z - 0.045, COR.amarelo, true);
    }
    const m = malhaLuz(`vila-arco-aceso-${i}`, d.luz);
    return { a, m, piscou: -Infinity };
  });
  /** Os arcos que piscaram (alguém passou) e quando, para os testes. */
  let arcosPiscados = 0;

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
      r.luz(2.0, 0.035, 0.03, 0, 0.405, 0.32, '#6fb8ff');
      r.luz(0.34, 0.035, 0.12, 0.5, 0.58, 0.16, '#ffb24a');
      for (let i = 0; i < 5; i++)
        r.luz(0.05, 0.035, 0.05, -0.78 + i * 0.14, 0.585, 0.16, '#ff5a4a');
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

  // ------------------------------------------------------------------ as teclas que acendem
  /**
   * A tecladista tocando (o teclado toca de verdade): a tecla do arpejo da mão direita acende
   * verde-água em cada colcheia e o acorde da esquerda acende dourado a cada dois tempos, embaixo
   * das mãos dela (`arpejoDoTeclado`, o mesmo das mãos da pose). Uma malha só, de três teclas de
   * luz que mudam de lugar quando a nota muda (nada é criado no quadro; brilha no glow).
   */
  const TECLAS_ACESAS = 3;
  const teclas = (() => {
    const t = pecaDe('teclado');
    if (!t) return null;
    const { escala, pe, tampo, tecla } = TECLADO_DO_PALCO;
    const alto = pe + tampo + tecla;
    /** A luz em cima de uma tecla (as brancas inteiras; as pretas por cima delas). */
    const caixaDa = (d: Desenho, tt: TeclaTocada) => {
      const r = new Ref(d, t, escala);
      if (tt.preta) r.luz(0.07, 0.012, 0.16, xDaTecla(tt), alto + tecla, -0.08, '#ffffff');
      else r.luz(0.104, 0.01, 0.25, xDaTecla(tt), alto, -0.14, '#ffffff');
    };
    const formas = new Map<string, Float32Array>();
    const formaDe = (tt: TeclaTocada): Float32Array => {
      const k = `${tt.i}${tt.preta ? 'p' : ''}`;
      let f = formas.get(k);
      if (!f) {
        const d = mundo();
        caixaDa(d, tt);
        formas.set(k, (f = new Float32Array(d.luz.juntar().positions as number[])));
      }
      return f;
    };
    const base = mundo();
    caixaDa(base, { i: 0, preta: false });
    const vb = base.luz.juntar();
    const nv = (vb.positions as number[]).length / 3;
    const idx: number[] = [];
    for (let k = 0; k < TECLAS_ACESAS; k++)
      for (const i of vb.indices as number[]) idx.push(i + k * nv);
    const m = new Mesh('vila-show-teclas', scene);
    const pos = new Float32Array(nv * TECLAS_ACESAS * 3);
    const cor = new Float32Array(nv * TECLAS_ACESAS * 4);
    const vd = new VertexData();
    vd.positions = pos;
    vd.colors = cor;
    vd.indices = idx;
    vd.applyToMesh(m, true);
    m.material = matConfete;
    m.isPickable = false;
    m.alwaysSelectAsActiveMesh = true;
    m.setEnabled(false);
    opcoes.brilha?.(m);
    todas.push(m);
    return {
      m,
      nv,
      pos,
      cor,
      formaDe,
      /** O que está desenhado (a colcheia e a mão direita no alto): só refaz quando muda. */
      desenhado: '',
    };
  })();
  /** A cor de cada mão nas teclas acesas: o arpejo verde-água, o acorde dourado. */
  const LUZ_DIREITA: V3 = [0.15, 1, 0.82];
  const LUZ_ESQUERDA: V3 = [1, 0.7, 0.12];

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
  const MAX_E = leve ? 340 : 640;
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
  /** x, y, z, vx, vy, vz, vida, vidaTotal, tamanho, r, g, b, fase, peso (14 por pedaço). */
  const CAMPOS = 14;
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
    dados[o + 13] = 1;
  };
  /** `peso`: o quanto a gravidade puxa (os fogos caem devagar, como faísca no ar). */
  const estrelinha = (pos: V3, vel: V3, vida: number, tam: number, cor: V3, peso = 1) => {
    soltar(dadosE, proxE, pos, vel, vida, tam, cor);
    dadosE[proxE * CAMPOS + 13] = peso;
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
  let momentoAtual: MomentoShow | null = null;
  /** Os fogos do fim já soltos (pelo índice da explosão) e o show deles. */
  let fogosDoShow = -1;
  let fogosSoltos = 0;
  /** As batidas da contagem da abertura e o estouro já piscados (no show de `introDoShow`). */
  let introDoShow = -1;
  let introBatidas = 0;
  /** O siga-me aceso (sobe e desce macio) e onde ele está. */
  let forcaSiga = 0;
  /** O neon do palco (o raio da logo e o arco): a abertura apaga e acende. */
  let nivelNeonPalco = 1;
  const sigaPos: V3 = [0, 0, 0];
  let insVistos = 0;
  let ultimoT = -1;
  /** 0 apagado, 1 no show (sobe e desce macio). */
  let forca = 0;
  let golpe = 0;
  /** O show (pelo começo dele) que já teve a festa do acorde final. */
  let finalFeito = -1;
  let idadeFinal = Infinity;
  let vistaAtual: VilaVista | null = null;
  let tempoAtual = 0;
  let feixesAcesos = 0;
  let tinhaVista = false;
  const feito = [false, false, false];
  /** A noite do show (a hora): quando chega, o palco aquece (o aviso macio, sem texto). */
  let noiteShowAtual = false;
  let primeiroQuadro = true;
  let aquecerDesde = -Infinity;
  let aquecimentos = 0;
  /** Quanto dura o aquecimento (s): os holofotes sobem do chão ao céu e somem. */
  const AQUECER_S = 6;
  const aquecimento = (t: number) => {
    const k = (t - aquecerDesde) / AQUECER_S;
    return k > 0 && k < 1 ? Math.sin(Math.PI * k) : 0;
  };
  const pub = publicoDaVila(plano);

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

  /**
   * Os fogos do fim (s depois do acorde final, x relativo ao meio da passarela, altura e cor):
   * cada um sobe um rastro curto da beira do palco e abre uma roda de estrelinhas que cai devagar.
   */
  const FOGOS: readonly [number, number, number, V3][] = [
    [0.25, -8, 15, CORES_CONFETE[1]],
    [0.95, 7.5, 16.2, CORES_CONFETE[2]],
    [1.65, -1.5, 17.2, CORES_CONFETE[0]],
    [2.4, 11, 15.2, CORES_CONFETE[4]],
    [3.2, -11.5, 15.8, CORES_CONFETE[5]],
    [4.0, 3, 16.8, CORES_CONFETE[1]],
    [5.0, -5, 15.5, CORES_CONFETE[2]],
    [5.7, 8.5, 16.9, CORES_CONFETE[0]],
  ];
  const SUBIDA_FOGO = 0.7;
  /** Os fogos sobem por trás da treliça da frente (de longe, abrem no céu por cima do palco). */
  const zFogo = palco.z0 + 9;
  function rastro(x: number, h: number): void {
    // o rastro: uns poucos pontinhos dourados subindo do fundo do palco até a altura da roda
    // (peso baixo: sobem quase retos e chegam lá na hora da roda)
    const peso = 0.3;
    const v = h / SUBIDA_FOGO + 9.5 * peso * SUBIDA_FOGO * 0.5;
    for (let i = 0; i < (leve ? 3 : 5); i++)
      estrelinha(
        [x + rnd(-0.1, 0.1), topo + 0.4 - i * 0.25, zFogo],
        [rnd(-0.15, 0.15), v * (1 + i * 0.02), rnd(-0.15, 0.15)],
        SUBIDA_FOGO,
        0.2 - i * 0.02,
        OURO,
        peso,
      );
  }
  function fogo(x: number, y: number, cor: V3): void {
    const n = leve ? 34 : 56;
    for (let i = 0; i < n; i++) {
      // uma roda quase redonda (de frente para a plateia), as faíscas caindo devagar
      const a = (i / n) * 6.283 + rnd(-0.06, 0.06);
      const v = rnd(7, 8.4);
      const fora = rnd(-0.35, 0.35);
      estrelinha(
        [x, y, zFogo],
        [Math.cos(a) * v, Math.sin(a) * v + 1.2, fora * v],
        rnd(1.6, 2.2),
        rnd(0.42, 0.62),
        i % 4 === 0 ? BRANCO : i % 4 === 1 ? OURO : cor,
        0.22,
      );
    }
    // o miolo branco do estouro
    for (let i = 0; i < (leve ? 6 : 10); i++)
      estrelinha(
        [x, y, zFogo],
        [rnd(-1, 1), rnd(-1, 1), rnd(-0.5, 0.5)],
        rnd(0.3, 0.5),
        0.7,
        BRANCO,
        0,
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
    // a câmera dentro do cone (no meio do povo, onde o feixe varre): o feixe inteiro fica mais
    // leve, para não virar uma parede de cor na cara de quem assiste
    {
      const k = Math.max(
        0,
        Math.min(L, (cam[0] - de[0]) * ux + (cam[1] - de[1]) * uy + (cam[2] - de[2]) * uz),
      );
      const d = Math.hypot(
        de[0] + ux * k - cam[0],
        de[1] + uy * k - cam[1],
        de[2] + uz * k - cam[2],
      );
      const raio = 0.2 + (rp - 0.2) * (k / L);
      alfa *= 0.18 + 0.82 * Math.min(1, Math.max(0, (d - raio * 0.6) / (raio * 2.2 + 2)));
    }
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

  /** Um gesto que se repete: `dur` s de gesto a cada `periodo` s (fase própria de cada um). */
  const deVezEmQuando = (
    pose: Pose,
    g: Parameters<typeof aplicarGesto>[1],
    periodo: number,
    dur: number,
    fase0: number,
    lento = 1,
  ): Pose => {
    const f = (((tempoAtual + fase0) % periodo) + periodo) % periodo;
    return f < dur ? aplicarGesto(pose, g, f * lento) : pose;
  };
  /**
   * A passagem de som (sem show, de dia ou à espera da noite): a guitarrista balança a cabeça
   * devagar afinando, o vocalista testa o microfone (aponta para a frente) e a roadie confere as
   * caixas. Calmo, de vez em quando: o palco está vivo, mas o show é de noite.
   */
  function passagemDeSom(n: number, pose: Pose): Pose {
    if (n === 2) return deVezEmQuando(pose, 'roqueiro', 7, 3.2, 1.3, 0.55);
    if (n === 0) return deVezEmQuando(pose, 'apontar', 11, 1.8, 4.1);
    return deVezEmQuando(pose, 'apontar', 9, 1.8, 0.4);
  }
  /**
   * A turma da grade. No show, cada um do seu jeito e no tempo da música: pula de braços em V,
   * bate cabeça, bate palma, ou braços para o alto balançando; no acorde final, todos pulam.
   * De papo (sem show), de vez em quando um acena, cumprimenta, bate palma ou dança.
   */
  /** A distância de cada um da turma ao lugar dele (testes). */
  const turmaAgora = new Map<number, number>();
  function poseDoPublico(
    k: number,
    pose: Pose,
    onde: { x: number; z: number } | undefined,
    show: VilaVista['show'],
  ): Pose {
    const l = lugarDoPublico(pub, k, { noite: noiteShowAtual, show: !!show, t: tempoAtual });
    // andando para o lugar: o passo de sempre
    const longe = !l.alvo || !onde ? Infinity : Math.hypot(onde.x - l.alvo[0], onde.z - l.alvo[2]);
    turmaAgora.set(k, longe);
    if (longe > CHEGOU_AO_LUGAR) return pose;
    if (!show) {
      const gestos = ['acenar', 'cumprimentar', 'aplaudir', 'dancar'] as const;
      const g = gestos[(k + Math.floor((tempoAtual + k * 2.3) / 9)) % gestos.length];
      return deVezEmQuando(pose, g, 9, g === 'dancar' ? 3.2 : 1.6, k * 2.3);
    }
    const m = momentoAtual;
    const fr = (x: number) => x - Math.floor(x);
    /** Os braços em V não sobem retos (de costas, o braço reto some atrás da cabeça grande). */
    const emV = (q: Pose) => {
      q.bracoDireitoAbre = Math.min(q.bracoDireitoAbre ?? 0, 2.3);
      q.bracoEsquerdoAbre = Math.min(q.bracoEsquerdoAbre ?? 0, 2.3);
      return q;
    };
    const pula = (b: number) => emV(aplicarGesto(pose, 'pulo-estrela', 0.15 + fr(b / 2) * 0.8));
    const vibra = (b: number) => emV(aplicarGesto(pose, 'comemorar', 0.25 + fr(b / 2) * 0.838));
    const palma = (b: number) => aplicarGesto(pose, 'aplaudir', 0.3 + fr(b) * 0.393);
    const bastao = BASTAO.includes(k);
    if (!m) return pose;
    if (show.final !== null && m.idadeFinal >= -0.1) {
      const idade = m.idadeFinal;
      if (idade < 2.5)
        return aplicarGesto(pose, 'pulo-estrela', Math.max(0, idade) + 0.05 + (k % 3) * 0.04);
      // a reverência da banda: o povo vibra de braços para o alto; quando ela sai, acena
      if (idade >= REVERENCIA && idade < REVERENCIA + 2.6) return vibra(tempoAtual * 2.2 + k * 0.3);
      if (idade >= REVERENCIA + 2.6 && (bastao || k % 3 === 0))
        return aplicarGesto(pose, 'acenar', 0.4 + fr((tempoAtual + k * 0.37) / 1.2) * 1.2);
      return palma(tempoAtual * 2.6 + k * 0.13);
    }
    const dS = m.d;
    if (m.fase === 'intro') {
      // o escuro: todo mundo quieto, olhando; as varreduras: os bastões no alto, palmas no tempo;
      // as quatro batidas: um pulo em cada
      if (dS < ESCURO_INTRO) return pose;
      if (dS >= CONTA_INTRO[0]) return pula(dS * 2 + 0.6);
      return bastao ? vibra(dS * 1.0 + k * 0.2) : palma(dS * 2);
    }
    if (m.fase === 'entrada') {
      // a banda entrando: o povo vibra (uns de braços para o alto, outros batendo palma rápido)
      const vez = Math.floor((tempoAtual + k * 1.7) / 3) % 2;
      return bastao || vez ? vibra(tempoAtual * 2.4 + k * 0.4) : palma(tempoAtual * 2.8 + k * 0.2);
    }
    if (m.fase === 'pausa')
      return k % 2 ? vibra(tempoAtual * 2.4 + k * 0.4) : palma(tempoAtual * 2.8);
    if (m.fase === 'contagem') return palma(m.batida);
    const b = m.batida;
    if (m.fase === 'chamando') return vibra(b);
    // nas músicas, cada um do seu jeito, no andamento de cada uma
    if (m.musica === 2) {
      // o hino: palmas no 2 e no 4 (quem não tem bastão) e os bastões balançando no alto
      if (!bastao) return k % 3 === 2 ? pula(b) : palma((b - 1) / 2);
      return vibra(b * 0.5 + k * 0.1);
    }
    // a rápida: quase todo mundo pulando; a primeira: pulos, cabeça batendo e braços no alto
    const jeito =
      m.musica === 1
        ? [0, 0, 2, 0, 1, 0][k % 6]
        : bastao
          ? k % 2
            ? 2
            : 0
          : [0, 1, 2, 1, 0, 2][k % 6];
    if (jeito === 0) return pula(b);
    if (jeito === 1) return aplicarGesto(pose, 'roqueiro', 1 + fr(b + 0.25) * 0.5);
    return vibra(b);
  }

  /**
   * O raio da logo na abertura: apagado até `RAIO_ACENDE`, depois acende piscando como neon
   * pegando (uns piscos curtos) e fica aceso.
   */
  function raioDaIntro(d: number): boolean {
    const x = d - RAIO_ACENDE;
    if (x < 0) return false;
    if (x > 1.25) return true;
    // aceso nestes pedacinhos (s depois de começar): o neon pegando
    return x < 0.08 || (x > 0.3 && x < 0.36) || (x > 0.45 && x < 0.62) || x > 1.0;
  }

  /** Onde o siga-me pousa (o vocalista, ou a guitarrista no solo), se a pessoa está no palco. */
  function quemOSigaMeSegue(
    show: { inicio: number; final: number | null },
    t: number,
    m: MomentoShow | null,
  ): V3 | null {
    const papel = m?.pedaco === 'solo' && m.fase === 'tocando' ? 'guitarrista' : 'vocalista';
    const q = posturaNaBanda(papel, show, t);
    if (!noPalco(q.a, q.b)) return null;
    return paraOMundo(palco, q.a, q.b, q.altura) as V3;
  }

  const mistura = (a: V3, b: V3, k: number, out: V3): V3 => {
    out[0] = a[0] + (b[0] - a[0]) * k;
    out[1] = a[1] + (b[1] - a[1]) * k;
    out[2] = a[2] + (b[2] - a[2]) * k;
    return out;
  };

  return {
    quadro(t, vista, tempoNucleo, noite, noiteShow = noite > 0.5) {
      const dt = ultimoT < 0 ? 0 : Math.min(0.1, Math.max(0, t - ultimoT));
      ultimoT = t;
      vistaAtual = vista;
      tempoAtual = tempoNucleo;
      // a noite do show chegou (não na abertura do mundo, nem no meio de um show): o palco aquece
      if (noiteShow && !noiteShowAtual && !primeiroQuadro && !vista?.show && palcoPronto()) {
        aquecerDesde = t;
        aquecimentos++;
      }
      noiteShowAtual = noiteShow;
      primeiroQuadro = false;
      const aq = aquecimento(t);
      pl.definirLuz(1 - 0.5 * noite);
      const pronto = palcoPronto();
      const show = vista?.show ?? null;
      const mom = show ? momentoDoShow(show, tempoNucleo) : null;
      momentoAtual = mom;
      fase = mom?.fase ?? null;
      const noShow = pronto && !!show && fase !== 'acabou';
      /** s desde o começo do show. */
      const dS = mom?.d ?? 0;
      const naIntro = noShow && fase === 'intro';
      const comMusica =
        noShow && (fase === 'tocando' || fase === 'chamando' || fase === 'contagem');
      // a abertura: o palco apaga (as luzes de sempre só voltam no estouro)
      const alvoForca = noShow ? (naIntro ? (dS < ESCURO_INTRO ? 0 : 0.85) : 1) : 0;
      forca += (alvoForca - forca) * Math.min(1, dt * (naIntro ? 3.5 : noShow ? 1.6 : 1.1));
      // as batidas: as da música de agora (no andamento dela); na abertura, a grade de 120
      const batidas = comMusica && mom ? mom.batida : naIntro ? dS / 0.5 : 0;
      const naBatida = batidas - Math.floor(batidas);
      const pulsoBatida =
        (comMusica && mom && mom.dm >= 0) || (naIntro && dS >= ESCURO_INTRO)
          ? Math.exp(-naBatida * 4.5)
          : 0;
      // a contagem da abertura e o estouro: cada batida pisca o palco inteiro
      if (show && naIntro && introDoShow !== show.inicio) {
        introDoShow = show.inicio;
        introBatidas = CONTA_INTRO.filter((b) => b <= dS).length + (dS >= INTRO ? 1 : 0);
      }
      if (show && noShow && introDoShow === show.inicio) {
        const marcas = [...CONTA_INTRO, INTRO];
        while (introBatidas < marcas.length && dS >= marcas[introBatidas]) {
          const estouro = introBatidas === marcas.length - 1;
          if (dS - marcas[introBatidas] < 0.5) {
            golpe = 1;
            if (estouro) {
              // o estouro: tudo acende e as quatro beiradas soltam estrelinhas
              for (const c of chafarizes) punhado(c[0], c[1], c[2], leve ? 14 : 24, 9, 0.24);
            } else {
              const c = chafarizes[introBatidas % 4];
              punhado(c[0], c[1], c[2], leve ? 6 : 10, 6.5, 0.2);
            }
          }
          introBatidas++;
        }
      }
      // o neon do palco: apaga no escuro da abertura, acende piscando com o raio, inteiro no estouro
      {
        const alvo = !naIntro
          ? 1
          : dS < ESCURO_INTRO
            ? 1 - 0.88 * Math.min(1, dS / 1.2)
            : raioDaIntro(dS)
              ? 0.55 + 0.45 * Math.min(1, Math.max(0, (dS - RAIO_ACENDE - 1.2) / 2.8))
              : 0.12;
        nivelNeonPalco = alvo;
      }
      /** O estouro acabou de acontecer (a abertura virou entrada): a luz sobe por um instante. */
      const idadeEstouro = noShow && dS >= INTRO ? dS - INTRO : Infinity;
      const noEstouro = idadeEstouro < 2.2;

      // ---- os arcos do rinque: acesos para quem já passou; piscando quando alguém passa
      arcos.forEach((q, i) => {
        const idade = t - q.piscou;
        const pisca = idade < 1.3 && Math.floor(idade / 0.18) % 2 === 0;
        ligar(q.m, chunkTem(q.a.x, q.a.z) && (!!vista?.arcos?.[i] || pisca));
      });

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

      // ---- as teclas que acendem embaixo das mãos da tecladista (só tocando no teclado)
      if (teclas) {
        const tocandoMusica =
          noShow && !!show && !!mom && (fase === 'tocando' || fase === 'chamando') && mom.dm >= 0;
        const q = tocandoMusica && show ? posturaNaBanda('tecladista', show, tempoNucleo) : null;
        const noTeclado =
          !!q && !q.andando && (q.acao === 'teclado' || q.acao === 'tecladoMao') && q.desde > 0.2;
        ligar(teclas.m, noTeclado);
        if (noTeclado && q && mom) {
          const a = arpejoDoTeclado(mom.batida);
          // com a mão direita no alto, só o acorde da esquerda
          const maoNoAlto = q.acao === 'tecladoMao';
          const notas = maoNoAlto ? a.esquerda : [a.direita, ...a.esquerda];
          const chave = `${a.colcheia}|${maoNoAlto}`;
          if (chave !== teclas.desenhado) {
            teclas.desenhado = chave;
            teclas.pos.fill(0);
            notas.forEach((n, k) => teclas.pos.set(teclas.formaDe(n), k * teclas.nv * 3));
            teclas.m.updateVerticesData(VertexBuffer.PositionKind, teclas.pos, false, false);
          }
          // a tecla acende forte quando a mão desce e fica acesa mais fraca até a próxima
          const fr = (x: number) => x - Math.floor(x);
          const fD = 0.5 + 0.5 * Math.pow(1 - fr(mom.batida * 2), 2);
          const fE = 0.45 + 0.4 * Math.pow(1 - fr(mom.batida), 2);
          notas.forEach((n, k) => {
            const direita = !maoNoAlto && k === 0;
            const c = direita ? LUZ_DIREITA : LUZ_ESQUERDA;
            const f = direita ? fD : fE;
            for (let v = 0; v < teclas.nv; v++) {
              const o = (k * teclas.nv + v) * 4;
              teclas.cor[o] = c[0] * f;
              teclas.cor[o + 1] = c[1] * f;
              teclas.cor[o + 2] = c[2] * f;
              teclas.cor[o + 3] = 1;
            }
          });
          teclas.m.updateVerticesData(VertexBuffer.ColorKind, teclas.cor, false, false);
        }
      }
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
      // na abertura o palco fica escuro: só as caixas, os feixes e o raio (que acende piscando)
      ligar(noiteBase, pronto && !naIntro && (noite > 0.3 || forca > 0.05 || aq > 0.05));
      ligar(showLuz, pronto && !naIntro && forca > 0.3);
      ligar(pulso, pronto && (naIntro ? raioDaIntro(dS) : forca > 0.3 || aq > 0.04));
      golpe = Math.max(0, golpe - dt * 4);
      const tex = paletaPulso.material.emissiveTexture;
      // nas pausas e na entrada o palco respira devagar (sem batida)
      const respira = 0.62 + 0.14 * Math.sin(t * 2.2);
      if (tex)
        tex.level = noShow
          ? comMusica || naIntro
            ? (naIntro && dS < ESCURO_INTRO ? 0.35 : 0.45) + 0.55 * Math.max(pulsoBatida, golpe)
            : Math.max(respira, golpe)
          : aq > 0 && forca < 0.3
            ? 0.25 + 0.75 * aq
            : 0.72 + 0.1 * Math.sin(t * 2.4);

      // ---- o acorde final
      idadeFinal = show && show.final !== null ? tempoNucleo - show.final : Infinity;
      if (show && show.final !== null && finalFeito !== show.inicio && idadeFinal >= 0) {
        finalFeito = show.inicio;
        if (pronto && idadeFinal < 1.5) festaFinal();
      }
      const noFinal = noShow && idadeFinal >= 0 && idadeFinal < 5;
      // os fogos de estrelinhas por cima do palco, um depois do outro (quem chega no meio vê os
      // que faltam)
      if (show && noShow && show.final !== null && idadeFinal >= -SUBIDA_FOGO) {
        if (fogosDoShow !== show.inicio) {
          fogosDoShow = show.inicio;
          fogosSoltos = FOGOS.filter((f) => f[0] < idadeFinal - 0.6).length * 2;
        }
        // dois passos por fogo: o rastro (antes) e a roda
        while (fogosSoltos < FOGOS.length * 2) {
          const [quando, dx, h, cor] = FOGOS[fogosSoltos >> 1];
          const roda = fogosSoltos % 2 === 1;
          if (idadeFinal < quando - (roda ? 0 : SUBIDA_FOGO)) break;
          if (roda) fogo(pass[0] + dx, topo + 0.4 + h, cor);
          else rastro(pass[0] + dx, h);
          fogosSoltos++;
        }
      }

      // ---- os chafarizes de estrelinhas: nos refrões (de dois em dois, um compasso sim, outro
      // não), na ponta durante o solo, no fim da música e no acorde final; na abertura, um par por
      // compasso a partir das varreduras
      if (noShow && dt > 0) {
        const compasso = Math.floor(batidas / 4);
        const noCompasso = batidas / 4 - compasso;
        const parte = mom?.pedaco ?? null;
        chafarizes.forEach((c, i) => {
          const par = i < 2 ? 0 : 1;
          const ligado =
            (noFinal && idadeFinal < 1.3) ||
            (noEstouro && idadeEstouro < 1.4) ||
            (naIntro &&
              dS >= 6 &&
              dS < CONTA_INTRO[0] &&
              compasso % 2 === par &&
              noCompasso < 0.3) ||
            (comMusica &&
              ((parte === 'refrao' && compasso % 2 === par && noCompasso < 0.55) ||
                (parte === 'solo' && i >= 2 && noCompasso < 0.3) ||
                (parte === 'fim' && noCompasso < 0.5)));
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
      const verFeixes = pronto && (forca > 0.02 || aq > 0.02);
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
        const base =
          forca * (0.15 + 0.13 * noite) * (0.8 + 0.25 * pulsoBatida + 0.35 * golpe) +
          aq * (1 - forca) * 0.16;
        // no acorde final e no estouro da abertura: brancos e para o céu por um instante, depois
        // voltam; nas pausas, sobem devagar até o meio; no aquecimento (a noite chegou), sobem
        // devagar do chão ao céu num leque macio e somem
        const pausa = noShow && (fase === 'pausa' || fase === 'entrada');
        const sobe = noFinal
          ? Math.min(1, idadeFinal / 0.2) * Math.max(0, Math.min(1, (2.4 - idadeFinal) / 0.8))
          : noEstouro
            ? Math.min(1, idadeEstouro / 0.15) *
              Math.max(0, Math.min(1, (2.2 - idadeEstouro) / 0.9))
            : pausa
              ? 0.4 + 0.12 * Math.sin(t * 0.6)
              : forca < 0.3 && aq > 0
                ? Math.min(1, (t - aquecerDesde) / AQUECER_S + 0.15)
                : 0;
        const branco = noFinal
          ? Math.max(0, Math.min(1, (1.6 - idadeFinal) / 0.7))
          : noEstouro
            ? Math.max(0, Math.min(1, (1.2 - idadeEstouro) / 0.6))
            : 0;
        const ceu = sobe * sobe * (3 - 2 * sobe);
        // as quatro batidas da contagem da abertura juntam os feixes na ponta da passarela
        const naConta = naIntro && dS >= CONTA_INTRO[0];
        varredores.forEach((q, i) => {
          const de = lente(q);
          // o alvo no chão: varrendo a plateia no tempo; no chamado, em roda na ponta da passarela
          let ax: number;
          let az: number;
          if (fase === 'chamando' || naConta) {
            const a = (i / varredores.length) * 6.283 + batidas * (naConta ? 1.6 : 0.785);
            const r = naConta ? 1.8 + 1.8 * Math.exp(-naBatida * 3) : 3.6;
            ax = pass[0] + Math.cos(a) * r;
            az = pass[2] + 0.8 + Math.sin(a) * r * 0.72;
          } else if (naIntro) {
            // a abertura: os feixes varrem a plateia inteira, rápido, cruzando uns com os outros
            const k = Math.max(0, (dS - ESCURO_INTRO) / 4);
            ax = meioX + 15 * Math.sin(dS * (1.25 + (i % 3) * 0.22) + i * 2.1) * Math.min(1, k);
            az = palco.z0 - 8 + 7 * Math.sin(dS * 0.9 + i * 1.3);
          } else {
            ax = de[0] * 0.5 + meioX * 0.5 + 7 * Math.sin((batidas / 16) * 6.283 + i * 1.7);
            az = palco.z0 - 6.5 + 4.6 * Math.sin((batidas / 8) * 6.283 + i * 0.9);
            if (pausa && !comMusica) {
              // sem música: varre devagar, no relógio
              ax = de[0] * 0.5 + meioX * 0.5 + 7 * Math.sin(t * 0.35 + i * 1.7);
              az = palco.z0 - 6.5 + 4.6 * Math.sin(t * 0.5 + i * 0.9);
            }
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
          // na abertura as cores trocam a cada dois compassos (a mesma ordem, nunca arco-íris)
          const corBase = naIntro
            ? CORES_FEIXE[((q.n ?? 0) + Math.floor(dS / 4)) % 4]
            : CORES_FEIXE[(q.n ?? 0) % 4];
          const cor = mistura(corBase, BRANCO, branco, tmpC);
          const poca = base * 1.5 * (1 - ceu) ** 3;
          escreverFeixe(i, de, fim, 1.2 + 1.2 * ceu, cor, base * (1 + 0.8 * branco), poca);
          feixesAcesos++;
        });
        if (sigaMe) {
          // o siga-me acha quem canta (ou a guitarrista no solo) quando está no palco
          const alvo = show && noShow && !naIntro ? quemOSigaMeSegue(show, tempoNucleo, mom) : null;
          forcaSiga += ((alvo ? 1 : 0) - forcaSiga) * Math.min(1, dt * 2.5);
          if (alvo) {
            const k = Math.min(1, dt * 6);
            sigaPos[0] += (alvo[0] - sigaPos[0]) * k;
            sigaPos[1] += (alvo[1] - sigaPos[1]) * k;
            sigaPos[2] += (alvo[2] - sigaPos[2]) * k;
            if (forcaSiga < 0.05) sigaPos.splice(0, 3, ...alvo);
          }
          const de = lente(sigaMe);
          tmpA[0] = sigaPos[0];
          tmpA[1] = sigaPos[1] + 0.05;
          tmpA[2] = sigaPos[2];
          const b = base * forcaSiga;
          escreverFeixe(varredores.length, de, tmpA, 1.15, BRANCO, b * 1.25, b * 1.7);
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
          dadosE[o + 4] -= 9.5 * dadosE[o + 13] * dt;
          const ar = Math.exp(-dt * (dadosE[o + 13] < 1 ? 1.6 : 0.9));
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
      if (e.e === 'vilaArco') {
        // o arco pisca e solta estrelinhas da estrela e dos dois postes
        const q = arcos[e.i];
        if (q && chunkTem(q.a.x, q.a.z)) {
          q.piscou = ultimoT;
          arcosPiscados++;
          const { meia, alto } = ARCO;
          punhado(q.a.x, q.a.y + alto + 0.8, q.a.z, leve ? 10 : 18, 4.5, 0.22);
          for (const sx of [-1, 1]) {
            const dx = q.a.eixo === 'x' ? sx * meia : 0;
            const dz = q.a.eixo === 'z' ? sx * meia : 0;
            punhado(q.a.x + dx, q.a.y + 2.4, q.a.z + dz, leve ? 4 : 7, 3, 0.18);
          }
        }
      } else if (e.e === 'vilaEstojo') {
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
      arcosAcesos: arcos.filter((q) => q.m.isEnabled()).length,
      arcosPiscados,
      caixasAcesas: acesas.filter((m) => m.isEnabled()).length,
      fase,
      feixes: feixes.m.isEnabled() ? feixesAcesos : 0,
      estrelinhas: vivasE,
      confetes: vivosC,
      triangulos: todas.reduce(
        (n, m) => n + (m.isEnabled() ? (m.getTotalIndices() / 3) | 0 : 0),
        0,
      ),
      aquecendo: aquecimento(ultimoT) > 0,
      aquecimentos,
      turma: {
        noLugar: [...turmaAgora.values()].filter((d) => d <= CHEGOU_AO_LUGAR).length,
        andando: [...turmaAgora.values()].filter((d) => d > CHEGOU_AO_LUGAR).length,
        longe: [...turmaAgora.values()]
          .map((d) => Math.round(d * 10) / 10)
          .filter((d) => d > CHEGOU_AO_LUGAR),
      },
    }),
    luzNaMao(povoado, n) {
      // o vocalista segura o microfone
      if (povoado === 'vila' && n === 0) return 'microfone';
      // a tecladista tem o teclado de pendurar: aparece só enquanto ela toca nele (e anda com
      // ele até a frente do palco e de volta), no último refrão da segunda música
      if (povoado === 'vila' && papelNaBanda(n) === 'tecladista') {
        const show = vistaAtual?.show ?? null;
        const ativo = !!show && faseDoShow(show, tempoAtual) !== 'acabou';
        return ativo && show && posturaNaBanda('tecladista', show, tempoAtual).acao === 'keytar'
          ? 'keytar'
          : 'keytar-guardado';
      }
      if (povoado !== 'vila' || !daTurma(n)) return null;
      const k = n - N0_PUBLICO;
      // uns oito da turma seguram um bastão de luz, em neon sorteado (nunca na ordem do arco-íris)
      if (!BASTAO.includes(k)) return null;
      return NEON_BASTAO[(k * 3) % NEON_BASTAO.length];
    },
    luzDoPalco: () => nivelNeonPalco,
    mostrarLuzNaMao: () =>
      noiteShowAtual ||
      (!!vistaAtual?.show && faseDoShow(vistaAtual.show, tempoAtual) !== 'acabou'),
    poseDoMorador(povoado, n, pose, onde) {
      if (povoado !== 'vila') return pose;
      const show = vistaAtual?.show ?? null;
      const ativo = !!show && faseDoShow(show, tempoAtual) !== 'acabou';
      if (daTurma(n)) return poseDoPublico(n - N0_PUBLICO, pose, onde, ativo ? show : null);
      const papel = papelNaBanda(n);
      if (papel && ativo && show) {
        // a banda no show: o que a coreografia manda, no tempo da música de agora
        const q = posturaNaBanda(papel, show, tempoAtual);
        const m = momentoAtual;
        const comMusica =
          m && (m.fase === 'tocando' || m.fase === 'chamando' || m.fase === 'contagem');
        const batida =
          comMusica && m
            ? { batida: m.batida, seg: m.segBatida }
            : { batida: tempoAtual * 2, seg: 0.5 };
        return poseDaBanda(papel, q.acao, q.desde, q.andando, batida, pose);
      }
      if (papel && !ativo) {
        // sem show: a passagem de som (a banda afina, testa o microfone, confere as caixas; o
        // baterista no banquinho testa o bumbo e a baixista acompanha); de noite, na coxia, só
        // a espera
        const local = onde ? [onde.x - palco.x0, onde.z - palco.z0] : null;
        const noPalcoAgora = !!local && noPalco(local[0], local[1]);
        if (!noPalcoAgora) return pose;
        if (papel === 'baterista')
          return poseDaBanda(
            papel,
            tempoAtual % 9 < 2.4 ? 'bateria' : 'sentado',
            1,
            false,
            { batida: tempoAtual * 1.6, seg: 0.6 },
            pose,
          );
        if (papel === 'baixista')
          return tempoAtual % 10 < 3.4
            ? poseDaBanda(
                papel,
                'tocar',
                1,
                false,
                { batida: tempoAtual * 1.5 + 0.3, seg: 0.66 },
                pose,
              )
            : pose;
        return n <= 2 ? passagemDeSom(n, pose) : pose;
      }
      // a moça do lanche (3, dentro do festival, a plateia de casa) pula no tempo das músicas
      if (n !== 3 || !ativo || !show) return pose;
      const m = momentoAtual;
      if (!m) return pose;
      if (show.final !== null && m.idadeFinal >= 0)
        return m.idadeFinal < 2.5 ? aplicarGesto(pose, 'pulo-estrela', m.idadeFinal + 0.05) : pose;
      if (m.fase !== 'tocando' && m.fase !== 'chamando') return pose;
      return aplicarGesto(
        pose,
        'pulo-estrela',
        0.25 + (m.batida / 2 - Math.floor(m.batida / 2)) * 0.6,
      );
    },
    giroDoMorador(povoado, n, onde) {
      if (povoado !== 'vila') return null;
      const show = vistaAtual?.show;
      const ativo = !!show && faseDoShow(show, tempoAtual) !== 'acabou';
      if (daTurma(n)) {
        // a turma: parada no lugar, de frente para o palco (no show) ou para a rodinha
        const l = lugarDoPublico(pub, n - N0_PUBLICO, {
          noite: noiteShowAtual,
          show: ativo,
          t: tempoAtual,
        });
        if (!l.alvo || !l.olhar || !onde) return null;
        if (Math.hypot(onde.x - l.alvo[0], onde.z - l.alvo[2]) > CHEGOU_AO_LUGAR) return null;
        return Math.atan2(l.olhar[0] - onde.x, l.olhar[1] - onde.z);
      }
      // a banda: o giro vem do núcleo (a coreografia), igual para todos
      return null;
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
