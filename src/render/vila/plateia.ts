/**
 * O povo de longe do Show da Vila (spec 026, pedido do dono: "uma multidão de 40 a 60 pessoas
 * no show"). Atrás da turma da grade (os moradores de verdade do núcleo), ~40 bonecos só da
 * tela enchem o campo até perto do portão.
 *
 * - **O boneco do jogo visto de longe:** as mesmas proporções (cabeça grande, tronco, pernas,
 *   braços de camiseta), em caixas simples. Cada pedaço é uma malha com instâncias (uma chamada
 *   de desenho), a cor de cada um vem da instância (pele, camiseta, calça, cabelo, boné).
 * - **Nada de bolo de cabelo:** quatro cortes (curto, rabo, topete, comprido; o comprido é
 *   raro), metade de boné (para a frente ou para trás) ou faixa colorida, ombros e braços de
 *   fora; no show, braços para o alto.
 * - **No show:** cada um pula, bate cabeça ou balança os braços no tempo da música (pela batida
 *   do núcleo); alguns seguram bastão de luz ou usam pulseira de luz, em cores de neon
 *   sorteadas (nunca em ordem de arco-íris, nunca isqueiro nem fogo).
 * - **Só de noite** (a noite do show, ou com o show tocando): aparecem devagar ao escurecer e
 *   somem devagar de manhã. De dia o campo fica leve (só a turma de dia, no núcleo).
 * - **Campo de visão:** cada boneco só aparece com a malha do chunk onde pisa desenhada.
 * - **Sem colisão** (só tela), mas nunca no caminho: os lugares vêm de `publicoDaVila`, fora do
 *   caminho de cascalho, do corredor das lhamas e da volta da escadinha. Quem chega perto da
 *   criança dá um passinho para o lado (o boneco nunca fica dentro de um deles).
 */
import type { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import type { PlanoVila } from '../../world/vilaNeon';
import type { VilaVista } from '../../nucleo/vila';
import { CONTAGEM, faseDoShow } from '../../jogo/show';
import { publicoDaVila } from '../../world/publicoVila';
import { hash2 } from '../../world/noise';

export interface OpcoesPlateiaVila {
  temMalha(cx: number, cz: number): boolean;
  /** O que brilha (os bastões e as pulseiras de luz). */
  brilha?(m: Mesh): void;
  /** O que tapa o brilho de trás (os bonecos). */
  tapaOGlow?(m: Mesh): void;
}

export interface PlateiaVila {
  quadro(
    t: number,
    vista: VilaVista | null,
    tempoNucleo: number,
    noite: number,
    noiteShow: boolean,
    pes: { x: number; z: number },
  ): void;
  estado(): {
    total: number;
    visiveis: number;
    alfa: number;
    triangulos: number;
    malhas: number;
    luzes: number;
  };
  descartar(): void;
}

type V3 = [number, number, number];
type Cor = [number, number, number];

const hex = (h: string): Cor => {
  const c = Color3.FromHexString(h);
  return [c.r, c.g, c.b];
};
// as cores da época (sem rosa: é da dançarina; nada em ordem de arco-íris)
const PELES = ['#f4d2b4', '#f0c8a0', '#e0a882', '#c99064', '#9a6844', '#6e4a2e'].map(hex);
const CAMISAS = [
  '#e8302a',
  '#f6f4ee',
  '#2f8cff',
  '#ffd23d',
  '#22c2b0',
  '#3a3944',
  '#ff8a2a',
  '#3d5f8f',
  '#24232a',
  '#7a4422',
].map(hex);
const CALCAS = ['#2a3350', '#3a6fb8', '#24232a', '#4a4a56', '#5a6a8a'].map(hex);
const CABELOS = ['#1e1a22', '#2e2018', '#5a3422', '#a8401a', '#d8b060', '#e8c070'].map(hex);
const BONES = ['#e8302a', '#2f8cff', '#ffe14a', '#f6f4ee', '#22c2b0'].map(hex);
const FAIXAS = ['#ffe14a', '#e8302a', '#2f8cff', '#f6f4ee'].map(hex);
/** O neon dos bastões e pulseiras (sorteado por boneco: nunca em sequência de arco-íris). */
const NEON = ['#4df07a', '#3aa8ff', '#ffe44a', '#2ee8d8', '#ff9a3a'].map(hex);

// ------------------------------------------------------------------ as caixas
interface Geo {
  pos: number[];
  cor: number[];
  ind: number[];
}
const novaGeo = (): Geo => ({ pos: [], cor: [], ind: [] });
/**
 * Uma caixa (centro, tamanho) com a luz pintada nos vértices: o topo claro, os lados um pouco
 * mais escuros, a base escura (o desenho da tela não usa luz de cena: a cor é da instância).
 * `tom` escurece a caixa toda (o sapato, os olhos).
 */
function caixa(g: Geo, c: V3, t: V3, tom = 1): void {
  const [x, y, z] = c;
  const [w, h, d] = [t[0] / 2, t[1] / 2, t[2] / 2];
  const faces: [V3, V3, V3, V3, number][] = [
    [
      [x - w, y + h, z - d],
      [x - w, y + h, z + d],
      [x + w, y + h, z + d],
      [x + w, y + h, z - d],
      1,
    ],
    [
      [x - w, y - h, z + d],
      [x - w, y - h, z - d],
      [x + w, y - h, z - d],
      [x + w, y - h, z + d],
      0.55,
    ],
    [
      [x - w, y - h, z + d],
      [x + w, y - h, z + d],
      [x + w, y + h, z + d],
      [x - w, y + h, z + d],
      0.86,
    ],
    [
      [x + w, y - h, z - d],
      [x - w, y - h, z - d],
      [x - w, y + h, z - d],
      [x + w, y + h, z - d],
      0.8,
    ],
    [
      [x + w, y - h, z + d],
      [x + w, y - h, z - d],
      [x + w, y + h, z - d],
      [x + w, y + h, z + d],
      0.72,
    ],
    [
      [x - w, y - h, z - d],
      [x - w, y - h, z + d],
      [x - w, y + h, z + d],
      [x - w, y + h, z - d],
      0.72,
    ],
  ];
  for (const [a, b, cc, dd, l] of faces) {
    const base = g.pos.length / 3;
    for (const q of [a, b, cc, dd]) {
      g.pos.push(q[0], q[1], q[2]);
      g.cor.push(l * tom, l * tom, l * tom, 1);
    }
    g.ind.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
}

// o boneco (os pés no chão, de frente para +z), nas medidas do morador do jogo
const OMBRO_Y = 1.4;
const OMBRO_X = 0.34;
const PESCOCO_Y = 1.45;
function geoPernas(): Geo {
  const g = novaGeo();
  for (const s of [-1, 1]) {
    caixa(g, [s * 0.12, 0.45, 0], [0.2, 0.66, 0.22]);
    // o tênis (escuro)
    caixa(g, [s * 0.12, 0.06, 0.02], [0.21, 0.12, 0.25], 0.32);
  }
  return g;
}
function geoTronco(): Geo {
  const g = novaGeo();
  caixa(g, [0, 1.11, 0], [0.5, 0.66, 0.28]);
  // as mangas curtas da camiseta (os braços saem de pele)
  for (const s of [-1, 1]) caixa(g, [s * OMBRO_X, 1.31, 0], [0.18, 0.2, 0.2]);
  return g;
}
function geoCabeca(): Geo {
  const g = novaGeo();
  caixa(g, [0, 1.66, 0], [0.42, 0.42, 0.42]);
  // os olhos (a pele bem escura) e a boquinha
  for (const s of [-1, 1]) caixa(g, [s * 0.09, 1.68, 0.214], [0.07, 0.08, 0.02], 0.14);
  return g;
}
/** Os cortes de cabelo (por cima da cabeça): curto, rabo de cavalo, topete e comprido. */
function geoCabelo(qual: number): Geo {
  const g = novaGeo();
  // o topo e a nuca (o curto do morador)
  const alto = qual === 2 ? 0.2 : 0.12;
  caixa(g, [0, 1.85 + (alto - 0.12) / 2, -0.01], [0.44, alto, 0.44]);
  caixa(g, [0, 1.74, -0.18], [0.44, 0.24, 0.1]);
  if (qual === 1) caixa(g, [0, 1.6, -0.27], [0.13, 0.3, 0.12]);
  if (qual === 2) caixa(g, [0, 1.93, 0.17], [0.3, 0.12, 0.14]);
  if (qual === 3) {
    // comprido, nunca mais largo que a cabeça e só até os ombros
    caixa(g, [0, 1.6, -0.19], [0.44, 0.5, 0.08]);
    for (const s of [-1, 1]) caixa(g, [s * 0.2, 1.66, -0.06], [0.06, 0.38, 0.22]);
  }
  return g;
}
function geoBone(): Geo {
  const g = novaGeo();
  caixa(g, [0, 1.9, 0], [0.46, 0.14, 0.46]);
  caixa(g, [0, 1.85, 0.3], [0.36, 0.035, 0.2]);
  return g;
}
function geoFaixa(): Geo {
  const g = novaGeo();
  caixa(g, [0, 1.79, 0], [0.45, 0.07, 0.45]);
  return g;
}
/** O braço de pele (o ombro na origem, pendurado para baixo). */
function geoBraco(): Geo {
  const g = novaGeo();
  caixa(g, [0, -0.3, 0], [0.15, 0.52, 0.17]);
  return g;
}
/** O bastão de luz na mão e a pulseira de luz no pulso (no referencial do braço). */
function geoBastao(): Geo {
  const g = novaGeo();
  caixa(g, [0, -0.62, 0.02], [0.07, 0.44, 0.07]);
  return g;
}
function geoPulseira(): Geo {
  const g = novaGeo();
  caixa(g, [0, -0.47, 0], [0.19, 0.06, 0.21]);
  return g;
}

// ------------------------------------------------------------------ cada boneco
interface Pessoa {
  x: number;
  z: number;
  giro: number;
  pele: Cor;
  camisa: Cor;
  calca: Cor;
  cabelo: Cor;
  corte: number;
  /** 0 nada, 1 boné para a frente, 2 boné para trás, 3 faixa. */
  chapeu: number;
  chapeuCor: Cor;
  /** O jeito no show: 0 braços em V, 1 punho no tempo, 2 balança os braços, 3 bate cabeça. */
  jeito: number;
  /** 0 nada, 1 bastão na mão direita, 2 pulseira no pulso direito. */
  luz: number;
  luzCor: Cor;
  fase: number;
  chunk: [number, number];
  /** O passinho para o lado (perto da criança). */
  ox: number;
  oz: number;
}

/** Quanto tempo o povo leva para aparecer ao escurecer (e sumir de manhã), em s. */
const APARECER_S = 3;

export function criarPlateiaVila(
  scene: Scene,
  plano: PlanoVila,
  opcoes: OpcoesPlateiaVila,
): PlateiaVila {
  const pub = publicoDaVila(plano);
  const Y = plano.h + 1;
  const sorteio = (k: number, n: number) => hash2(k, n, plano.semente + 7400);
  const de = <T>(l: readonly T[], k: number, n: number) =>
    l[Math.floor(sorteio(k, n) * l.length) % l.length];
  const pessoas: Pessoa[] = pub.fundo.map(([x, z, giro], k) => {
    const r = sorteio(k, 1);
    const corte = r < 0.42 ? 0 : r < 0.68 ? 1 : r < 0.86 ? 2 : 3;
    const rc = sorteio(k, 2);
    // o boné não vai com o topete; a faixa vai com o curto e o rabo
    let chapeu = rc < 0.25 ? 1 : rc < 0.45 ? 2 : rc < 0.75 ? 3 : 0;
    if (corte === 2 && chapeu !== 3) chapeu = 0;
    if (corte === 3 && chapeu === 3) chapeu = 0;
    const rl = sorteio(k, 3);
    return {
      x,
      z,
      giro,
      pele: de(PELES, k, 4),
      camisa: de(CAMISAS, k, 5),
      calca: de(CALCAS, k, 6),
      cabelo: de(CABELOS, k, 7),
      corte,
      chapeu,
      chapeuCor: chapeu === 3 ? de(FAIXAS, k, 8) : de(BONES, k, 8),
      jeito: Math.floor(sorteio(k, 9) * 4) % 4,
      luz: rl < 0.38 ? 1 : rl < 0.58 ? 2 : 0,
      luzCor: de(NEON, k, 10),
      fase: (sorteio(k, 11) - 0.5) * 0.12,
      chunk: [Math.floor(x / 16), Math.floor(z / 16)],
      ox: 0,
      oz: 0,
    };
  });

  // ---------------------------------------------------------------- as malhas
  // sem luz de cena: a cor sai só do emissivo (vezes a cor do vértice e a da instância); com o
  // difuso, sem luz, o boneco saía preto
  const mat = new StandardMaterial('vila-plateia', scene);
  mat.disableLighting = true;
  mat.specularColor = Color3.Black();
  mat.diffuseColor = Color3.Black();
  mat.emissiveColor = Color3.White();
  const matLuz = new StandardMaterial('vila-plateia-luz', scene);
  matLuz.disableLighting = true;
  matLuz.specularColor = Color3.Black();
  matLuz.diffuseColor = Color3.Black();
  matLuz.emissiveColor = Color3.White();

  interface Parte {
    m: Mesh;
    /** Quem tem esta parte (índices em `pessoas`) e, nos braços, qual lado. */
    quem: { p: number; lado: number }[];
    mat: Float32Array;
    cor: Float32Array;
  }
  const partes: Parte[] = [];
  function parte(
    nome: string,
    g: Geo,
    quem: { p: number; lado: number }[],
    cor: (p: Pessoa) => Cor,
    luz = false,
  ): Parte {
    const m = new Mesh(`vila-plateia-${nome}`, scene);
    const vd = new VertexData();
    vd.positions = g.pos;
    vd.colors = g.cor;
    vd.indices = g.ind;
    vd.applyToMesh(m);
    m.material = luz ? matLuz : mat;
    m.isPickable = false;
    m.hasVertexAlpha = false;
    const n = Math.max(1, quem.length);
    const mt = new Float32Array(n * 16);
    const cr = new Float32Array(n * 4);
    quem.forEach(({ p }, i) => {
      const c = cor(pessoas[p]);
      cr.set([c[0], c[1], c[2], 1], i * 4);
    });
    m.thinInstanceSetBuffer('matrix', mt, 16, false);
    m.thinInstanceSetBuffer('color', cr, 4, true);
    m.thinInstanceCount = quem.length;
    m.setEnabled(false);
    if (luz) opcoes.brilha?.(m);
    else opcoes.tapaOGlow?.(m);
    const pt = { m, quem, mat: mt, cor: cr };
    partes.push(pt);
    return pt;
  }
  const todos = pessoas.map((_, p) => ({ p, lado: 0 }));
  const com = (f: (q: Pessoa) => boolean) =>
    pessoas.flatMap((q, p) => (f(q) ? [{ p, lado: 0 }] : []));
  parte('pernas', geoPernas(), todos, (q) => q.calca);
  parte('tronco', geoTronco(), todos, (q) => q.camisa);
  const cabeca = [
    parte('cabeca', geoCabeca(), todos, (q) => q.pele),
    ...[0, 1, 2, 3].map((c) =>
      parte(
        `cabelo${c}`,
        geoCabelo(c),
        com((q) => q.corte === c),
        (q) => q.cabelo,
      ),
    ),
    parte(
      'bone',
      geoBone(),
      com((q) => q.chapeu === 1 || q.chapeu === 2),
      (q) => q.chapeuCor,
    ),
    parte(
      'faixa',
      geoFaixa(),
      com((q) => q.chapeu === 3),
      (q) => q.chapeuCor,
    ),
  ];
  const bracos = parte(
    'bracos',
    geoBraco(),
    pessoas.flatMap((_, p) => [
      { p, lado: -1 },
      { p, lado: 1 },
    ]),
    (q) => q.pele,
  );
  const luzes = [
    parte(
      'bastao',
      geoBastao(),
      com((q) => q.luz === 1),
      (q) => q.luzCor,
      true,
    ),
    parte(
      'pulseira',
      geoPulseira(),
      com((q) => q.luz === 2),
      (q) => q.luzCor,
      true,
    ),
  ];

  // ---------------------------------------------------------------- a cada quadro
  let alfa = 0;
  let ultimoT = -1;
  let caixaVisiveis = -1;
  let caixaEm = -Infinity;
  let visiveis = 0;
  const corpo = new Matrix();
  const local = new Matrix();
  const tmp = new Matrix();
  const q = new Quaternion();
  const um = new Vector3(1, 1, 1);
  const zero = new Vector3(0, 0, 0);
  const pos = new Vector3();
  /** Escondido (o chunk sem malha): tamanho zero, no próprio lugar (a caixa da malha não estica). */
  const nada = pessoas.map((p) =>
    Matrix.Compose(new Vector3(0, 0, 0), Quaternion.Identity(), new Vector3(p.x, Y + 1, p.z)),
  );
  /** Por pessoa: o corpo, a cabeça e os dois braços deste quadro. */
  const mCorpo: Matrix[] = pessoas.map(() => new Matrix());
  const mCabeca: Matrix[] = pessoas.map(() => new Matrix());
  const mBraco: Matrix[][] = pessoas.map(() => [new Matrix(), new Matrix()]);
  const ve = pessoas.map(() => false);

  /** O braço (o ombro de cada lado) num ângulo: `abre` para o lado, `frente` para a frente. */
  function braco(out: Matrix, base: Matrix, lado: number, abre: number, frente: number): void {
    Quaternion.RotationYawPitchRollToRef(0, -frente, lado * abre, q);
    pos.set(lado * OMBRO_X, OMBRO_Y, 0);
    Matrix.ComposeToRef(um, q, pos, local);
    local.multiplyToRef(base, out);
  }

  return {
    quadro(t, vista, tempoNucleo, noite, noiteShow, pes) {
      const dt = ultimoT < 0 ? 0 : Math.min(0.1, Math.max(0, t - ultimoT));
      ultimoT = t;
      const show = vista?.show ?? null;
      const fase = show ? faseDoShow(show, tempoNucleo) : null;
      const tocando = !!show && fase !== 'acabou';
      const quer = noiteShow || tocando ? 1 : 0;
      alfa += Math.sign(quer - alfa) * Math.min(Math.abs(quer - alfa), dt / APARECER_S);
      if (alfa <= 0.001) {
        for (const pt of partes) pt.m.setEnabled(false);
        visiveis = 0;
        return;
      }
      // de noite, o povo fica na luz do palco e dos postes (nunca preto: a criança vê a festa)
      const luz = (1 - 0.47 * noite) * (tocando ? 1.08 : 1);
      mat.emissiveColor.set(luz, luz, luz);
      mat.alpha = alfa;
      matLuz.alpha = alfa;
      const transp = alfa < 0.999;
      mat.transparencyMode = transp ? 2 : 0;
      matLuz.transparencyMode = transp ? 2 : 0;
      // a batida (meio segundo) desde o primeiro tempo
      const d = show ? tempoNucleo - show.inicio - CONTAGEM : 0;
      const batendo = tocando && d >= 0;
      const final = show && show.final !== null ? tempoNucleo - show.final : Infinity;
      visiveis = 0;
      pessoas.forEach((p, i) => {
        ve[i] = opcoes.temMalha(p.chunk[0], p.chunk[1]);
        if (!ve[i]) return;
        visiveis++;
        // o passinho para o lado: perto da criança, sai da frente (e volta devagar depois)
        const bx = p.x - pes.x;
        const bz = p.z - pes.z;
        const bd = Math.hypot(bx, bz);
        const afasta = bd < 1.25 && bd > 1e-3 ? (1.25 - bd) / bd : 0;
        const k = Math.min(1, dt * 6);
        p.ox += (bx * afasta - p.ox) * k;
        p.oz += (bz * afasta - p.oz) * k;
        // o tempo de cada um (um tiquinho fora do tempo: gente de verdade)
        const b = (d + p.fase) / 0.5;
        const naBatida = b - Math.floor(b);
        let sobe = 0;
        let balanco = Math.sin(t * 1.3 + i * 1.7) * 0.03;
        let cabecaX = 0;
        let abreE = 0.12;
        let abreD = 0.12;
        let frenteE = 0.05;
        let frenteD = 0.05;
        if (final >= 0 && final < 2.5) {
          // o acorde final: todo mundo pula de braços para o alto
          const pulo = Math.max(0, Math.sin(Math.min(1, final / 0.7) * Math.PI));
          sobe = pulo * 0.35;
          abreE = abreD = 2.6;
        } else if (batendo) {
          switch (p.jeito) {
            case 0:
              // braços em V e um pulinho a cada dois tempos
              sobe = Math.abs(Math.sin(((b / 2) % 1) * Math.PI)) * 0.16;
              abreE = abreD = 2.55 + Math.sin(b * Math.PI) * 0.12;
              break;
            case 1:
              // o punho no tempo (o direito sobe e desce), o esquerdo no alto
              abreD = 2.2 + 0.6 * Math.exp(-naBatida * 4);
              frenteD = 0.6;
              abreE = 2.75;
              sobe = Math.exp(-naBatida * 6) * 0.06;
              break;
            case 2:
              // os dois braços no alto balançando de um lado para o outro a cada compasso
              abreE = abreD = 2.8;
              balanco = Math.sin(d * Math.PI * 0.5) * 0.16;
              break;
            default:
              // bate cabeça (a cabeça embaixo em cada batida), braços de leve no alto
              cabecaX = Math.exp(-naBatida * 5) * 0.5;
              abreE = 0.4;
              abreD = 2.7;
              sobe = Math.exp(-naBatida * 6) * 0.04;
          }
        } else if (tocando) {
          // a contagem das baquetas: palmas no alto
          abreE = abreD = 2.4;
        }
        // o corpo: os pés no chão (ou um pulinho), virado para o palco, balançando de leve
        Quaternion.RotationYawPitchRollToRef(p.giro, 0, balanco, q);
        pos.set(p.x + p.ox, Y + sobe, p.z + p.oz);
        Matrix.ComposeToRef(um, q, pos, corpo);
        mCorpo[i].copyFrom(corpo);
        // a cabeça (o pescoço de eixo) e o que vai nela
        Quaternion.RotationYawPitchRollToRef(0, cabecaX, 0, q);
        Matrix.TranslationToRef(0, -PESCOCO_Y, 0, local);
        Matrix.ComposeToRef(um, q, zero, tmp);
        local.multiplyToRef(tmp, local);
        Matrix.TranslationToRef(0, PESCOCO_Y, 0, tmp);
        local.multiplyToRef(tmp, local);
        local.multiplyToRef(corpo, mCabeca[i]);
        braco(mBraco[i][0], corpo, -1, abreE, frenteE);
        braco(mBraco[i][1], corpo, 1, abreD, frenteD);
      });
      // escreve as instâncias de cada pedaço
      for (const pt of partes) {
        const ehCabeca = cabeca.includes(pt);
        const ehBraco = pt === bracos;
        const ehLuz = luzes.includes(pt);
        pt.quem.forEach(({ p, lado }, k) => {
          let m: Matrix;
          if (!ve[p]) m = nada[p];
          else if (ehCabeca) m = mCabeca[p];
          else if (ehBraco) m = mBraco[p][lado < 0 ? 0 : 1];
          else if (ehLuz) m = mBraco[p][1];
          else m = mCorpo[p];
          // o boné para trás: gira meia volta em cima da cabeça
          if (pt === cabeca[5] && pessoas[p].chapeu === 2 && ve[p]) {
            Matrix.RotationYToRef(Math.PI, tmp);
            tmp.multiplyToRef(mCabeca[p], tmp);
            tmp.copyToArray(pt.mat, k * 16);
            return;
          }
          m.copyToArray(pt.mat, k * 16);
        });
        pt.m.thinInstanceBufferUpdated('matrix');
        pt.m.setEnabled(visiveis > 0 && pt.quem.length > 0);
      }
      // a caixa de cada malha (o teste de vista da câmera) refeita quando muda quem aparece e de
      // vez em quando (os pulos e os braços mexem pouco)
      if (visiveis !== caixaVisiveis || t - caixaEm > 1) {
        caixaVisiveis = visiveis;
        caixaEm = t;
        for (const pt of partes) if (pt.quem.length) pt.m.thinInstanceRefreshBoundingInfo(false);
      }
    },
    estado() {
      let triangulos = 0;
      let malhas = 0;
      for (const pt of partes)
        if (pt.m.isEnabled()) {
          malhas++;
          triangulos += ((pt.m.getTotalIndices() / 3) | 0) * pt.quem.length;
        }
      return {
        total: pessoas.length,
        visiveis,
        alfa: Math.round(alfa * 1000) / 1000,
        triangulos,
        malhas,
        luzes: pessoas.filter((p) => p.luz).length,
      };
    },
    descartar() {
      for (const pt of partes) pt.m.dispose();
      mat.dispose();
      matLuz.dispose();
    },
  };
}
