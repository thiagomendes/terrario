/**
 * Esboço da spec 027 (Noite das Fantasias), parte 2: os moradores fantasiados, com o boneco de
 * verdade do jogo (`render/boneco.ts`: o mesmo rosto, as mesmas proporções e o mesmo plástico)
 * e as peças de fantasia NOVAS feitas aqui, presas às juntas do boneco no mesmo jeito das peças
 * de `personagem/bonecoFantasia.ts` (formas de brinquedo arredondadas, cores chapadas):
 * - Vovó Zuleica: chapéu de bruxa de aba mole e ponta caída, xale, vestido musgo, óculos
 *   redondos e a varinha de condão; na varanda dela, ao lado do caldeirão.
 * - Conde Dudu: capa de gola alta (forro laranja), colete e gravatinha, a lanterninha acesa;
 *   sem presas (o sorriso de sempre do boneco). No Bosque das Lanternas.
 * - Lulu: o lençol de capuz com o rosto à mostra, a barra ondulada nos joelhos e as mãozinhas
 *   de fora; espiando da quina de uma casinha da rua.
 * - Bento: o macacão peludo de tufos, os chifrinhos redondos, os pezões e o bumbo; no palco.
 * - Seu Jerônimo: chapéu de palha de fita laranja, macacão jeans, camisa xadrez e o regador;
 *   na horta.
 *
 * Tudo PROVISÓRIO (o palco do esboço): na implementação, viram fantasias do catálogo.
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import { aparenciaPadrao, type Aparencia, type ModeloId } from '../personagem/aparencia';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import {
  ajeitarCabeloDebaixo,
  misturar,
  rotacoesDaPose,
  type Junta,
  type Peca,
  type PlanoBoneco,
  type RotacoesPose,
} from '../personagem/boneco';
import { perfilEstrela } from '../personagem/bonecoFantasia';
import { aplicarJuntas, type Juntas } from '../personagem/gestos';
import { calcularPose, type Pose } from '../personagem/poses';
import { criarBoneco } from '../render/boneco';
import type { Personagem } from '../render/personagem';

type V3 = [number, number, number];
type P2 = [number, number];

/** O que o palco (`fantasias.ts`) dá aos moradores e aos bichos. */
export interface CtxPalco {
  scene: Scene;
  O: { ox: number; oz: number; y: number };
  pontos: Record<string, V3>;
  /** O plástico não brilha de noite, mas tapa o brilho de trás (como as peças). */
  semBrilho(m: Mesh): void;
  /** Fica fora do mapa do brilho (os halos). */
  foraDoBrilho(m: Mesh): void;
  /** Material aceso (luz própria) na cor dada. */
  acesa(hex: string): StandardMaterial;
  /** O meio da trilha do bosque (x local) em cada z local. */
  trilha(z: number): number;
}

export const COR = {
  roxo: '#6a3e9c',
  roxoEscuro: '#46305e',
  lilas: '#b9a0e0',
  laranja: '#ef8a2c',
  laranjaEscuro: '#c8621a',
  musgo: '#5f7d34',
  musgoEscuro: '#4a6326',
  musgoClaro: '#93a85a',
  creme: '#f6efe2',
  ouro: '#ffd45a',
} as const;

const escurecer = (c: string, t: number) => misturar(c, '#000000', t);
const clarear = (c: string, t: number) => misturar(c, '#ffffff', t);

// ------------------------------------------------------------------ medidas do boneco

/** As medidas do plano que as peças usam (as mesmas que `planoBoneco` dá às fantasias). */
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

/** As peças de uma fantasia nova, presas às juntas (como em `bonecoFantasia.ts`). */
export function alfaiate(pecas: Peca[]) {
  const por = (p: Peca) => pecas.push(p);
  return {
    caixa(
      nome: string,
      junta: Junta,
      t: V3,
      pos: V3,
      cor: string,
      raio = 0.04,
      extra: Partial<Peca> = {},
    ) {
      por({ nome, junta, forma: 'caixa', tamanho: t, raio, pos, cor, ...extra });
    },
    bola(
      nome: string,
      junta: Junta,
      r: number,
      pos: V3,
      cor: string,
      esc: V3 = [1, 1, 1],
      extra: Partial<Peca> = {},
    ) {
      por({
        nome,
        junta,
        forma: 'esfera',
        tamanho: [r * esc[0], r * esc[1], r * esc[2]],
        pos,
        cor,
        ...extra,
      });
    },
    cilindro(
      nome: string,
      junta: Junta,
      altura: number,
      rBaixo: number,
      rCima: number,
      pos: V3,
      cor: string,
      extra: Partial<Peca> = {},
    ) {
      por({ nome, junta, forma: 'cilindro', tamanho: [altura, rBaixo, rCima], pos, cor, ...extra });
    },
    anel(
      nome: string,
      junta: Junta,
      diametro: number,
      espessura: number,
      pos: V3,
      cor: string,
      extra: Partial<Peca> = {},
    ) {
      por({ nome, junta, forma: 'anel', tamanho: [diametro, espessura, 0], pos, cor, ...extra });
    },
    placa(
      nome: string,
      junta: Junta,
      perfil: P2[],
      espessura: number,
      pos: V3,
      cor: string,
      extra: Partial<Peca> = {},
    ) {
      let w = 0;
      let h = 0;
      for (const [x, y] of perfil) {
        w = Math.max(w, Math.abs(x) * 2);
        h = Math.max(h, Math.abs(y) * 2);
      }
      por({ nome, junta, forma: 'placa', tamanho: [w, h, espessura], perfil, pos, cor, ...extra });
    },
  };
}

/** Tira do plano os enfeites da roupa de sempre (cinto, bolso, listras...). */
export function roupaLisa(p: PlanoBoneco): void {
  const fora = /^(tunica-barra|cinto|fivela|bolso|listra|colete|camiseta|gola|bandoleira|avental)/;
  for (let i = p.pecas.length - 1; i >= 0; i--) if (fora.test(p.pecas[i].nome)) p.pecas.splice(i, 1);
}

interface Roupa {
  camisa: string;
  manga?: string;
  calca: string;
  sapato: string;
  saia?: string;
  cabelo?: string;
}

/** Pinta a roupa de baixo (camisa, mangas, calça, sapato) e o cabelo. */
export function pintarRoupa(p: PlanoBoneco, r: Roupa): void {
  const cabeloAntes = p.cores.cabelo;
  const manga = r.manga ?? r.camisa;
  for (const q of p.pecas) {
    const n = q.nome;
    if (n === 'peito') q.cor = r.camisa;
    else if (/-(manga|ombro)$/.test(n)) q.cor = manga;
    else if (/-punho$/.test(n)) q.cor = escurecer(manga, 0.18);
    else if (n === 'quadril' || /-perna$/.test(n)) q.cor = r.calca;
    else if (/-sapato$/.test(n)) q.cor = r.sapato;
    else if (n === 'saia') q.cor = r.saia ?? r.camisa;
    else if (r.cabelo && q.cor === cabeloAntes && q.junta === 'cabeca') q.cor = r.cabelo;
    else if (r.cabelo && q.cor === cabeloAntes && q.junta === 'topete') q.cor = r.cabelo;
  }
  if (r.cabelo) p.cores.cabelo = r.cabelo;
  p.cores.roupa = manga;
  p.cores.calca = r.calca;
}

/** Contorno de retângulo de cantos redondos (largura w, altura h, de y = 0 para cima). */
function perfilArredondado(w: number, h: number, r: number, base = 0): P2[] {
  const pts: P2[] = [];
  const canto = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= 4; i++) {
      const a = a0 + (i / 4) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  pts.push([-w / 2, base], [w / 2, base]);
  canto(w / 2 - r, base + h - r, 0);
  canto(-w / 2 + r, base + h - r, Math.PI / 2);
  return pts;
}

/** O pano da capa (como em `bonecoFantasia.ts`): estreito em cima, largo e redondo embaixo. */
function perfilCapa(cima: number, baixo: number, comprimento: number): P2[] {
  const r = Math.min(0.07, baixo / 6);
  const pts: P2[] = [
    [-cima / 2, 0],
    [cima / 2, 0],
  ];
  const meioBaixo = baixo / 2;
  pts.push([meioBaixo, -comprimento + r]);
  for (let i = 1; i <= 3; i++) {
    const a = (i / 4) * (Math.PI / 2);
    pts.push([meioBaixo - r + Math.cos(a) * r, -comprimento + r - Math.sin(a) * r]);
  }
  pts.push([0, -comprimento - 0.01]);
  for (let i = 3; i >= 1; i--) {
    const a = (i / 4) * (Math.PI / 2);
    pts.push([-meioBaixo + r - Math.cos(a) * r, -comprimento + r - Math.sin(a) * r]);
  }
  pts.push([-meioBaixo, -comprimento + r]);
  return pts.reverse();
}

/** Número de 0 a 1 que só depende de (a, b): o espalhado dos tufos sai sempre igual. */
const sorte = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// ------------------------------------------------------------------ as fantasias

/**
 * O capuz de pano (lençol da Lulu, macacão do Bento): o alto, as costas e os lados em volta da
 * cabeça, o rosto inteiro de fora, a beira da frente redonda e o pescoço fechado até os ombros.
 */
function capuzDePano(
  a: ReturnType<typeof alfaiate>,
  m: Medidas,
  nome: string,
  cor: string,
  folga = 0,
): void {
  const { cab } = m;
  // um travesseiro de pano bem redondo em volta da cabeça: a frente dele fica um tico atrás do
  // rosto, então o rosto inteiro (e a franja) sai para fora do capuz, como num capuz de verdade
  const W = cab.w + 0.18 + folga;
  const topoY = m.topoTampa + 0.06 + folga / 2;
  const baixoY = -cab.h / 2 - 0.07;
  const H = topoY - baixoY;
  const zFrente = cab.d / 2 - 0.07;
  const zTras = -cab.d / 2 - 0.1 - folga / 2;
  const D = zFrente - zTras;
  a.caixa(nome, 'cabeca', [W, H, D], [0, baixoY + H / 2, (zFrente + zTras) / 2], cor, Math.min(0.28, D / 2 - 0.02));
  // a aba dobrada por cima da testa (cobre a beira da tampa de cabelo)
  a.caixa(`${nome}-aba`, 'cabeca', [W - 0.16, 0.13, 0.14], [0, m.topoTampa - 0.015, zFrente + 0.05], clarear(cor, 0.05), 0.065);
}

/** Vovó Zuleica: a bruxinha boa. */
function vestirVovo(p: PlanoBoneco): void {
  roupaLisa(p);
  pintarRoupa(p, {
    camisa: COR.musgo,
    calca: '#4e3a66',
    sapato: COR.roxoEscuro,
    saia: COR.musgo,
    cabelo: '#f2eee8',
  });
  const m = medir(p);
  const a = alfaiate(p.pecas);
  const { troncoH, prof, frente, larg, zRosto, baseChapeu } = m;
  // a barra do vestido: uma faixa roxa e os pontinhos laranja
  const saia = p.pecas.find((q) => q.nome === 'saia');
  if (saia) {
    const [h, rb] = saia.tamanho;
    const yb = saia.pos[1] - h / 2 + 0.035;
    a.cilindro('vestido-barra', 'tronco', 0.07, rb + 0.012, rb + 0.004, [0, yb, 0], COR.roxo);
  }
  // o xale roxo nos ombros e nas costas (o pescoço livre, nada perto do queixo): o triângulo
  // nas costas, o pano por cima de cada ombro e as duas pontas caindo na frente, dos lados do
  // peito, com a franjinha lilás na beira
  const xale = '#7c50b4';
  const franja = COR.lilas;
  const bT = troncoH * 0.72;
  a.placa(
    'xale-costas',
    'tronco',
    [
      [-(larg / 2 + 0.02), 0],
      [larg / 2 + 0.02, 0],
      [0.04, -bT],
      [-0.04, -bT],
    ],
    0.03,
    [0, troncoH - 0.03, -prof / 2 - 0.016],
    xale,
  );
  for (let k = 0; k <= 6; k++) {
    const t = k / 6;
    for (const s of [-1, 1])
      a.bola(
        `xale-franja-costas${s}${k}`,
        'tronco',
        0.018,
        [s * ((larg / 2 + 0.02) * (1 - t) + 0.04 * t), troncoH - 0.03 - bT * t - 0.012, -prof / 2 - 0.024],
        franja,
        [1, 1.5, 0.8],
      );
  }
  for (const s of [-1, 1]) {
    const x = s * (larg / 2 - 0.075);
    a.caixa(`xale-ombro${s}`, 'tronco', [0.12, 0.05, prof + 0.05], [x, troncoH - 0.035, 0], xale, 0.022);
    a.caixa(`xale-ponta${s}`, 'tronco', [0.11, troncoH * 0.62, 0.035], [x, troncoH * 0.67, frente + 0.016], xale, 0.02);
    for (const dx of [-0.035, 0, 0.035])
      a.bola(`xale-franja${s}${dx}`, 'tronco', 0.018, [x + dx, troncoH * 0.36 - 0.012, frente + 0.016], franja, [1, 1.6, 0.8]);
  }
  // os óculos redondos dourados
  for (const x of [-0.15, 0.15])
    a.anel(`oculos${x}`, 'cabeca', 0.18, 0.022, [x, -0.04, zRosto + 0.03], '#c9962e', {
      rot: [Math.PI / 2, 0, 0],
    });
  a.caixa('oculos-ponte', 'cabeca', [0.12, 0.022, 0.022], [0, -0.03, zRosto + 0.03], '#c9962e', 0.008);
  // o chapéu de bruxa roxo: a aba mole (um tico caída nas beiradas), a fita musgo e a copa em
  // gomos que vai entortando até a ponta caída, com a bolinha na ponta
  const roxo = COR.roxo;
  a.cilindro('chapeu-aba', 'cabeca', 0.05, 0.66, 0.58, [0, baseChapeu + 0.075, 0], roxo, {
    rot: [0.05, 0, -0.05],
  });
  a.cilindro('chapeu-fita', 'cabeca', 0.075, 0.372, 0.36, [0, baseChapeu + 0.14, 0], COR.musgo);
  const gomos: Array<[number, number, number, number]> = [
    // altura, raio de baixo, raio de cima, giro (z)
    [0.2, 0.36, 0.3, 0],
    [0.17, 0.3, 0.22, 0.12],
    [0.15, 0.22, 0.15, 0.42],
    [0.13, 0.15, 0.085, 0.85],
    [0.1, 0.085, 0.05, 1.35],
  ];
  let base: V3 = [0, baseChapeu + 0.1, 0];
  gomos.forEach(([h, rb, rc, g], i) => {
    const d: V3 = [-Math.sin(g), Math.cos(g), 0];
    const c: V3 = [base[0] + (d[0] * h) / 2, base[1] + (d[1] * h) / 2, base[2]];
    a.cilindro(`chapeu-copa${i}`, 'cabeca', h, rb, rc, c, roxo, { rot: [0, 0, g] });
    // a junta entre dois gomos fica redonda (a copa entorta sem quina)
    base = [base[0] + d[0] * h * 0.92, base[1] + d[1] * h * 0.92, base[2]];
    if (i > 0) a.bola(`chapeu-dobra${i}`, 'cabeca', rb * 0.98, [c[0] - (d[0] * h) / 2, c[1] - (d[1] * h) / 2, 0], roxo);
  });
  a.bola('chapeu-ponta', 'cabeca', 0.065, base, COR.laranja);
  ajeitarCabeloDebaixo(p.pecas, 'chapeu', m.topoTampa, m.cab);
  // a varinha de condão na mão esquerda: cabo de madeira e a estrela dourada na ponta
  const ang = 1.1;
  const comp = 0.4;
  const ini: V3 = [0, -0.01, 0.05];
  const eixo: V3 = [0, Math.cos(ang), Math.sin(ang)];
  a.cilindro(
    'varinha-cabo',
    'maoE',
    comp,
    0.019,
    0.019,
    [0, ini[1] + (eixo[1] * comp) / 2, ini[2] + (eixo[2] * comp) / 2],
    '#7a4e2a',
    { rot: [ang, 0, 0] },
  );
  a.placa(
    'varinha-estrela',
    'maoE',
    perfilEstrela(0.095),
    0.04,
    [0, ini[1] + eixo[1] * (comp + 0.05), ini[2] + eixo[2] * (comp + 0.05)],
    COR.ouro,
    { brilho: 0.45 },
  );
}

/** Conde Dudu: o vampirinho com medo do escuro (capa de gola alta, colete, lanterninha). */
function vestirDudu(p: PlanoBoneco, info: InfoPose): void {
  roupaLisa(p);
  pintarRoupa(p, {
    camisa: '#f4ead8',
    calca: '#3a2c50',
    sapato: '#2a2232',
    cabelo: '#2a2234',
  });
  const m = medir(p);
  const a = alfaiate(p.pecas);
  const { troncoH, prof, frente, larg, quadril, cab } = m;
  const capa = '#3a2850';
  // o colete roxo com os botões dourados e a gravatinha laranja
  for (const s of [-1, 1])
    a.caixa(
      `colete${s}`,
      'tronco',
      [larg * 0.36, troncoH * 0.92, prof + 0.024],
      [s * larg * 0.32, troncoH * 0.47, 0],
      COR.roxo,
      0.06,
    );
  for (const y of [0.11, 0.21, 0.31])
    a.bola(`botao${y}`, 'tronco', 0.022, [-larg * 0.15, troncoH * y * 2.1, frente + 0.016], COR.ouro, [1, 1, 0.6]);
  for (const s of [-1, 1])
    a.bola(`lacinho${s}`, 'tronco', 0.05, [s * 0.055, troncoH - 0.05, frente + 0.03], COR.laranja, [1.15, 0.8, 0.5], {
      rot: [0, 0, s * 0.25],
    });
  a.bola('lacinho-no', 'tronco', 0.028, [0, troncoH - 0.05, frente + 0.045], COR.laranjaEscuro);
  // a capa contínua que cai dos ombros é uma malha própria (`capaDoDudu`), curva em volta das
  // costas, com o forro laranja do lado de dentro
  medidasDudu = medir(p);
  void quadril;
  // a gola alta é uma malha própria (`capaDoDudu`): um pano curvo e fechado atrás da cabeça,
  // que abre dos dois lados do rosto, com o forro laranja por dentro (nada de aba solta)
  void cab;
  // o bico de vampiro: a pontinha do cabelo descendo no meio da testa (um "V")
  const tampa = p.pecas.find((q) => q.nome === 'cabelo' && q.junta === 'cabeca');
  if (tampa) {
    const yBaixoTampa = tampa.pos[1] - tampa.tamanho[1] / 2;
    // (o alto do losango some debaixo da beira do cabelo: só a ponta do "V" desce na testa)
    a.caixa('bico', 'cabeca', [0.15, 0.15, 0.05], [0, yBaixoTampa + 0.1, m.zRosto + 0.014], '#2a2234', 0.025, {
      rot: [0, 0, Math.PI / 4],
    });
  }
  // a pala que liga a gola aos ombros (debaixo da nuca, sem entrar na cabeça)
  a.caixa('gola-pala', 'tronco', [larg + 0.1, 0.06, 0.24], [0, troncoH - 0.035, -prof / 2 - 0.06], capa, 0.03);
  // a lanterninha pendurada na mão (a armação roxa; o vidro aceso é uma luz à parte, em
  // `montarMoradores`): cai para baixo de verdade, qualquer que seja o braço
  const L = lanternaNaMao(info.baixoMaoE);
  a.anel('lanterna-alca', 'maoE', 0.12, 0.022, L.em(0.04), COR.roxoEscuro, { rot: L.rot(Math.PI / 2) });
  a.caixa('lanterna-tampa', 'maoE', [0.15, 0.045, 0.15], L.em(0.1), COR.roxoEscuro, 0.02, { rot: L.rot() });
  a.caixa('lanterna-fundo', 'maoE', [0.15, 0.04, 0.15], L.em(0.3), COR.roxoEscuro, 0.02, { rot: L.rot() });
  for (const [x, z] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ])
    a.caixa(`lanterna-grade${x}${z}`, 'maoE', [0.02, 0.17, 0.02], L.em(0.2, x * 0.062, z * 0.062), COR.roxoEscuro, 0.008, {
      rot: L.rot(),
    });
}

/**
 * O que pende da mão (a lanterninha): `baixo` é o "para baixo" do mundo no espaço da mão. Dá a
 * posição de um ponto a `d` da mão nessa direção (com um deslocamento de lado em x e z da peça)
 * e o giro que põe o alto da peça para cima.
 */
function lanternaNaMao(baixo: V3) {
  const cima: V3 = [-baixo[0], -baixo[1], -baixo[2]];
  // o giro em x leva o y da peça para (0, cos, sen); o giro em z, um tico de lado
  const gx = Math.atan2(cima[2], cima[1]);
  const gz = -Math.asin(Math.max(-1, Math.min(1, cima[0])));
  const c = Math.cos(gx);
  const s = Math.sin(gx);
  return {
    em(d: number, lx = 0, lz = 0): V3 {
      // o deslocamento de lado da peça (lx, lz) gira junto com ela
      return [baixo[0] * d + lx, baixo[1] * d - lz * s, baixo[2] * d + lz * c];
    },
    rot(rz = 0): V3 {
      return [gx, 0, gz + rz];
    },
  };
}

/** Lulu: a fantasminha do lençol de capuz, com o rosto à mostra (decisão do dono). */
function vestirLulu(p: PlanoBoneco): void {
  roupaLisa(p);
  const lencol = COR.creme;
  pintarRoupa(p, { camisa: lencol, calca: '#c4b0e6', sapato: '#7a54b0' });
  // o cabelo fica todo guardado dentro do capuz (nada de castanho aparecendo)
  const cabelo = p.cores.cabelo;
  for (let i = p.pecas.length - 1; i >= 0; i--) {
    const q = p.pecas[i];
    if ((q.junta === 'cabeca' || q.junta === 'topete') && q.cor === cabelo) p.pecas.splice(i, 1);
  }
  // as mãozinhas cobertas pelo lençol: tocos redondos de pano no fim das mangas de fantasma
  for (const q of p.pecas) {
    if (/-punho$/.test(q.nome)) q.cor = lencol;
    if (/-mao$/.test(q.nome)) {
      q.cor = lencol;
      q.tamanho = [0.1, 0.105, 0.1];
      q.pos = [0, -0.02, 0];
    }
  }
  // o capuz de cúpula e o lençol em sino são malhas próprias (`lencolDaLulu`): precisam da
  // abertura oval do rosto e da barra em pontas, que as peças do plano não fazem
  medidasLulu = medir(p);
}

/** A forma da cúpula de pano (no espaço da cabeça): o meio, os raios e o furo oval do rosto. */
interface FormaCupula {
  c: V3;
  R: V3;
  furo: { ax: number; ay: number; oy: number };
}
/** (contém a cabeça de cantos redondos inteira, com folga: nada de bochecha furando) */
const CUPULA: FormaCupula = { c: [0, 0.08, -0.02], R: [0.55, 0.58, 0.5], furo: { ax: 0.64, ay: 0.6, oy: 0.3 } };

/**
 * A cúpula de pano em volta da cabeça (o capuz do fantasma, o do monstrinho): um ovo sem o fundo
 * (o pescoço), a frente um tico achatada (a beira do furo rente ao rosto, sem cara de capacete)
 * e o furo oval do rosto; com `ponta`, o alto do pano puxado e caído de lado. Devolve a malha e
 * um ponto da superfície (com a normal) para pôr enfeites nela.
 */
function cupula(f: FormaCupula, ponta: boolean) {
  const { c, R, furo } = f;
  const corte = 0.74; // (até onde a cúpula desce: 74% do raio abaixo do meio)
  // a malha é feita em anéis em volta do eixo do rosto (um tico inclinado para baixo): o
  // primeiro anel é a beira do furo oval, exata e lisa (o furo cortado em quadradinhos deixava a
  // beira em escadinha), e o último é a nuca
  const ci = Math.cos(furo.oy);
  const si = Math.sin(furo.oy);
  const dirDe = (rho: number, th: number): V3 => {
    const x = Math.sin(rho) * Math.cos(th);
    const y = Math.sin(rho) * Math.sin(th);
    const z = Math.cos(rho);
    return [x, y * ci - z * si, y * si + z * ci];
  };
  const sup = (d: V3): V3 => {
    let x = c[0] + R[0] * d[0];
    let y = c[1] + R[1] * d[1];
    let z = c[2] + R[2] * d[2];
    if (z > c[2]) z = c[2] + (z - c[2]) * 0.9;
    if (ponta && d[1] > 0.5) {
      const s = (d[1] - 0.5) / 0.5;
      y += 0.24 * s * s;
      x -= 0.2 * s * s * s;
      z -= 0.04 * s * s;
    }
    return [x, y, z];
  };
  const beiraAng = (th: number) => 1 / Math.sqrt((Math.cos(th) / furo.ax) ** 2 + (Math.sin(th) / furo.ay) ** 2);
  const NA = 40;
  const NB = 96;
  const P: number[] = [];
  const I: number[] = [];
  const baixos: boolean[] = [];
  for (let i = 0; i <= NA; i++)
    for (let j = 0; j <= NB; j++) {
      const th = (j / NB) * Math.PI * 2;
      const r0 = beiraAng(th);
      const d = dirDe(r0 + (Math.PI - r0) * (i / NA), th);
      P.push(...sup(d));
      baixos.push(d[1] < -corte);
    }
  const idx = (i: number, j: number) => i * (NB + 1) + j;
  for (let i = 0; i < NA; i++)
    for (let j = 0; j < NB; j++) {
      const q = [idx(i, j), idx(i + 1, j), idx(i + 1, j + 1), idx(i, j + 1)];
      // (o pescoço fica aberto: a cúpula para um tico abaixo do queixo)
      if (q.every((v) => baixos[v])) continue;
      I.push(q[0], q[2], q[1], q[0], q[3], q[2]);
    }
  // a beirinha do furo: um rolinho fino e macio (sem aro grosso de capacete)
  const beira: Vector3[] = [];
  for (let j = 0; j <= NB; j++) {
    const th = (j / NB) * Math.PI * 2;
    beira.push(new Vector3(...sup(dirDe(beiraAng(th), th))));
  }
  return { P, I, beira };
}

/** O giro (x, y, z) que leva o "para cima" de uma peça para a direção `n`. */
function giroPara(n: V3): V3 {
  const l = Math.hypot(...n) || 1;
  const [x, y, z] = [n[0] / l, n[1] / l, n[2] / l];
  return [Math.acos(Math.max(-1, Math.min(1, y))), Math.atan2(x, z), 0];
}

let medidasLulu: Medidas | null = null;
let medidasBento: Medidas | null = null;
let medidasDudu: Medidas | null = null;

/**
 * A capa do Conde Dudu: um pano só, curvo em volta das costas, que sai dos ombros (debaixo da
 * gola) e abre até os tornozelos; o forro laranja por dentro (aparece nas beiradas, de frente).
 * Presa na junta da capa do boneco (balança com ele, como a capa de herói).
 */
function capaDoDudu(ctx: CtxPalco, b: Personagem, prefixo: string, m: Medidas) {
  const { scene } = ctx;
  const no = noDaJunta(b, prefixo, 'capa');
  if (!no) return;
  const { quadril, troncoH, prof } = m;
  const tronco = noDaJunta(b, prefixo, 'tronco');
  // (na junta da capa: y = 0 no alto dos ombros; o meio do corpo fica em z = prof/2 - 0.02)
  const zc = prof / 2 - 0.02;
  const comp = quadril + troncoH - 0.03 - 0.07;
  /** Um pano curvo em volta de um eixo em pé: raio, meia abertura e altura em cada t (0 a 1). */
  type Forma = (t: number, th: number) => V3;
  const fazer = (nome: string, cor: string, forma: Forma, pai: TransformNode) => {
    const NV = 16;
    const NU = 28;
    const P: number[] = [];
    const I: number[] = [];
    for (let i = 0; i <= NV; i++) for (let j = 0; j <= NU; j++) P.push(...forma(i / NV, -1 + (2 * j) / NU));
    for (let i = 0; i < NV; i++)
      for (let j = 0; j < NU; j++) {
        const a0 = i * (NU + 1) + j;
        const b0 = (i + 1) * (NU + 1) + j;
        I.push(a0, b0 + 1, b0, a0, a0 + 1, b0 + 1);
      }
    const vd = new VertexData();
    vd.positions = P;
    vd.indices = I;
    const N: number[] = [];
    VertexData.ComputeNormals(P, I, N);
    vd.normals = N;
    const mm = new Mesh(`${prefixo}-${nome}`, scene);
    vd.applyToMesh(mm);
    const mat = new StandardMaterial(`${prefixo}-${nome}`, scene);
    mat.diffuseColor = Color3.FromHexString(cor);
    mat.specularColor = new Color3(0.14, 0.14, 0.14);
    mat.emissiveColor = Color3.FromHexString(cor).scale(0.3);
    mat.backFaceCulling = false;
    mat.twoSidedLighting = true;
    mm.material = mat;
    mm.parent = pai;
    mm.isPickable = false;
    ctx.semBrilho(mm);
  };
  // a capa: cai dos ombros e abre até os tornozelos, a barra um tico ondulada
  const capa = (dr: number, encurta: number): Forma => (t, u) => {
    const r = 0.27 + 0.19 * t ** 0.9 - dr;
    const th = u * (1.02 + 0.3 * t);
    const y = -(comp - encurta) * t - 0.025 * t ** 4 * (0.5 + 0.5 * Math.cos(5 * th));
    return [r * Math.sin(th), y, zc - r * Math.cos(th)];
  };
  fazer('capa', '#3a2850', capa(0, 0), no);
  fazer('capa-forro', COR.laranja, capa(0.016, 0.03), no);
  // a gola alta: fechada atrás da cabeça, abrindo dos dois lados do rosto (bem por fora do
  // cabelo), do alto dos ombros até a altura dos olhos, um tico aberta em cima
  if (!tronco) return;
  const gola = (dr: number, baixa: number): Forma => (t, u) => {
    const r = 0.44 + 0.1 * t ** 1.5 - dr;
    const th = u * (1.22 + 0.2 * t);
    // as duas pontas de cima, redondas, um tico mais altas nos lados (a gola de vampirinho)
    const y = troncoH - 0.04 + (0.42 - baixa) * t + 0.06 * t * Math.abs(u) ** 2;
    return [r * Math.sin(th), y, -r * Math.cos(th)];
  };
  fazer('gola', '#3a2850', gola(0, 0), tronco);
  fazer('gola-forro', COR.laranja, gola(0.016, 0.02), tronco);
}

/**
 * O lençol de fantasma da Lulu, preso às juntas do boneco: a cúpula do capuz (mais alta que a
 * cabeça, com a pontinha mole caída) com a abertura oval do rosto, e o lençol largo que cai
 * dos ombros em sino até os joelhos, com a barra em pontas arredondadas. De noite, um brilho
 * leve creme-azulado.
 */
function lencolDaLulu(ctx: CtxPalco, b: Personagem, prefixo: string, m: Medidas) {
  const { scene } = ctx;
  const cabeca = noDaJunta(b, prefixo, 'cabeca');
  const tronco = noDaJunta(b, prefixo, 'tronco');
  const mat = new StandardMaterial(`${prefixo}-lencol`, scene);
  mat.diffuseColor = Color3.FromHexString('#f4efe4');
  // (pano fosco: com o brilho de plástico, o lençol ganhava uma faixa clara de um lado)
  mat.specularColor = new Color3(0.05, 0.05, 0.05);
  mat.specularPower = 40;
  mat.backFaceCulling = false;
  // (o lado de dentro do pano com a mesma luz do de fora: nada de buraco escuro visto de lado)
  mat.twoSidedLighting = true;
  const malha = (nome: string, P: number[], I: number[], pai?: TransformNode) => {
    const vd = new VertexData();
    vd.positions = P;
    vd.indices = I;
    const N: number[] = [];
    VertexData.ComputeNormals(P, I, N);
    vd.normals = N;
    const mm = new Mesh(`${prefixo}-${nome}`, scene);
    vd.applyToMesh(mm);
    mm.material = mat;
    mm.isPickable = false;
    if (pai) mm.parent = pai;
    return mm;
  };
  // ---- a cúpula com a pontinha mole caída
  const cup = cupula(CUPULA, true);
  malha('capuz', cup.P, cup.I, cabeca);
  const rolo = MeshBuilder.CreateTube(`${prefixo}-capuz-beira`, { path: cup.beira, radius: 0.02, tessellation: 8 }, scene);
  rolo.material = mat;
  rolo.parent = cabeca ?? null;
  rolo.isPickable = false;
  ctx.semBrilho(rolo);
  // ---- o lençol em sino: dos ombros (debaixo da beira da cúpula) até os joelhos
  const { troncoH, quadril } = m;
  const yTopo = troncoH + 0.04;
  const yBaixo = -quadril + 0.17;
  const NV = 24;
  const NU = 84;
  const S: number[] = [];
  const SI: number[] = [];
  for (let i = 0; i <= NV; i++) {
    const t = i / NV;
    for (let j = 0; j <= NU; j++) {
      const u = (j / NU) * Math.PI * 2;
      // as pontas da barra: arredondadas, descendo (7 pontas em volta)
      const onda = (0.5 + 0.5 * Math.cos(7 * u)) ** 0.55;
      const k = t ** 0.75;
      const rx = 0.31 + 0.27 * k;
      const rz = 0.27 + 0.21 * k;
      // (a dobra do pano: um tico de onda no raio, que cresce para baixo)
      const dobra = 1 + 0.035 * t * Math.cos(7 * u);
      const y = yTopo + (yBaixo - yTopo) * t - 0.11 * onda * t ** 5;
      S.push(Math.sin(u) * rx * dobra, y, Math.cos(u) * rz * dobra);
    }
  }
  for (let i = 0; i < NV; i++)
    for (let j = 0; j < NU; j++) {
      const a0 = i * (NU + 1) + j;
      const b0 = (i + 1) * (NU + 1) + j;
      SI.push(a0, b0, b0 + 1, a0, b0 + 1, a0 + 1);
    }
  // a tampinha de cima (os ombros), fechando o sino debaixo da cúpula
  const meioTopo = S.length / 3;
  S.push(0, yTopo + 0.01, 0);
  for (let j = 0; j < NU; j++) SI.push(meioTopo, j + 1, j);
  malha('sino', S, SI, tronco);
  const todas = [...scene.meshes.filter((x) => x.name === `${prefixo}-capuz` || x.name === `${prefixo}-sino`)];
  for (const x of todas) if (x instanceof Mesh) ctx.semBrilho(x);
  // o brilho de noite: um halo macio creme-azulado atrás dela (como o das fantasminhas)
  const tex = new DynamicTexture(`${prefixo}-halo`, { width: 64, height: 64 }, scene, false);
  const g = tex.getContext();
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(225,230,255,0.42)');
  gr.addColorStop(0.5, 'rgba(205,210,255,0.14)');
  gr.addColorStop(1, 'rgba(190,195,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  tex.update();
  tex.hasAlpha = true;
  const mh = new StandardMaterial(`${prefixo}-halo`, scene);
  mh.disableLighting = true;
  mh.emissiveTexture = tex;
  mh.opacityTexture = tex;
  mh.diffuseColor = Color3.Black();
  mh.specularColor = Color3.Black();
  mh.alphaMode = 1;
  mh.backFaceCulling = false;
  const halo = MeshBuilder.CreatePlane(`${prefixo}-halo`, { size: 2.4 }, scene);
  halo.material = mh;
  halo.billboardMode = Mesh.BILLBOARDMODE_ALL;
  halo.parent = tronco ?? null;
  halo.position.set(0, 0.45, -0.2);
  halo.isPickable = false;
  ctx.foraDoBrilho(halo);
  return {
    hora(noite: boolean) {
      // de noite, o lençol fica creme-azulado com uma luzinha própria (nunca branco estourado)
      mat.emissiveColor = noite ? new Color3(0.36, 0.37, 0.43) : new Color3(0.38, 0.37, 0.35);
      mat.diffuseColor = noite ? new Color3(0.74, 0.75, 0.8) : Color3.FromHexString('#f3eee4');
      halo.setEnabled(noite);
    },
  };
}

/** Bento: o monstrinho peludo grandão (macacão de tufos, chifrinhos e pezões) com o bumbo. */
export function vestirBento(p: PlanoBoneco): void {
  roupaLisa(p);
  // verde-musgo de verdade: oliva apagado (o verde-folha saturado puxava para planta), em três
  // tons bem próximos, tudo fosco (nada de brilho de plástico no pelo)
  const pelo = '#6b7444';
  const pelos = [pelo, '#737c4a', '#636b3e'];
  const fosco = { brilho: 0 } as const;
  pintarRoupa(p, { camisa: pelo, calca: pelo, sapato: '#565e35', cabelo: '#5f6840' });
  // o cabelo fica guardado dentro do capuz
  for (let i = p.pecas.length - 1; i >= 0; i--) {
    const q = p.pecas[i];
    if ((q.junta === 'cabeca' || q.junta === 'topete') && q.cor === '#5f6840') p.pecas.splice(i, 1);
  }
  // o grandalhão fofo de abraço: o corpo, os braços, as mãos e as pernas mais largos e grossos
  // (não só o capuz), os ombros mais para fora
  for (const q of p.pecas) {
    const [w, h, d] = q.tamanho;
    if (q.nome === 'peito' || q.nome === 'quadril') q.tamanho = [w * 1.28, h, d * 1.15];
    else if (/-(manga|punho)$/.test(q.nome)) q.tamanho = [w * 1.45, h, d * 1.45];
    else if (/-(ombro|mao)$/.test(q.nome)) q.tamanho = [w * 1.45, h * 1.45, d * 1.45];
    else if (/-perna$/.test(q.nome)) q.tamanho = [w * 1.3, h, d * 1.3];
    if (q.junta !== 'cabeca') q.brilho = 0;
  }
  const m = medir(p);
  for (const s of [-1, 1] as const) {
    const j = s < 0 ? p.juntas.bracoE : p.juntas.bracoD;
    j.pos = [s * (m.larg / 2 + 0.07), j.pos[1], j.pos[2]];
    const pe = s < 0 ? p.juntas.pernaE : p.juntas.pernaD;
    pe.pos = [pe.pos[0] * 1.2, pe.pos[1], pe.pos[2]];
  }
  const a = alfaiate(p.pecas);
  const { troncoH, prof, frente, larg } = m;
  // grande, mas cabendo no túnel do trem (o alto dele sentado fica abaixo de 3,55)
  p.escala *= 1.32;
  // a barriga clara e fosca (nada de brilho de lâmpada), por cima do bumbo
  a.bola('barriga', 'tronco', 0.2, [0, troncoH * 0.62, frente - 0.03], '#b3b78a', [larg * 2.0, 0.95, 0.32], fosco);
  // o pelo de bichinho de pelúcia: tufos curvos (três gotas encavaladas, a base larga, a ponta
  // virando para fora), densos e sobrepostos como penugem, quebrando o contorno em toda a volta;
  // nada de bola solta, espinho ou mecha dura
  let k = 0;
  const tufo = (junta: Junta, base: V3, n: V3, tam = 1) => {
    const ln = Math.hypot(...n) || 1;
    const nn: V3 = [n[0] / ln, n[1] / ln, n[2] / ln];
    // (deitado na superfície, escorrendo para baixo como pelo penteado, e só a pontinha virando
    // para fora: espetado para fora, o tufo parecia minhoca ou cacho de cobra)
    const t0: V3 = [nn[1] * nn[0], -1 + nn[1] * nn[1], nn[1] * nn[2]];
    let lt = Math.hypot(...t0);
    let tg: V3 = lt > 0.25 ? [t0[0] / lt, t0[1] / lt, t0[2] / lt] : [0, 0, -1];
    if (lt <= 0.25) {
      // (no alto do capuz, o pelo escorre para trás)
      lt = 1;
      tg = [0, -0.2, -1];
    }
    const d0: V3 = [tg[0] + nn[0] * 0.3, tg[1] + nn[1] * 0.3, tg[2] + nn[2] * 0.3];
    const ld = Math.hypot(...d0) || 1;
    const d: V3 = [d0[0] / ld, d0[1] / ld, d0[2] / ld];
    const s = tam * (0.9 + sorte(k, 13) * 0.25);
    const cor = pelos[k % 3];
    const rot = giroPara(d);
    const em = (fd: number, fn: number): V3 => [
      base[0] + (d[0] * fd + nn[0] * fn) * s,
      base[1] + (d[1] * fd + nn[1] * fn) * s,
      base[2] + (d[2] * fd + nn[2] * fn) * s,
    ];
    a.bola(`tufo${k}a`, junta, 0.075 * s, em(0, 0.005), cor, [1.15, 1.0, 0.55], { rot, brilho: 0 });
    a.bola(`tufo${k}b`, junta, 0.052 * s, em(0.06, 0.018), cor, [1.1, 1.0, 0.6], { rot, brilho: 0 });
    a.bola(`tufo${k}c`, junta, 0.03 * s, em(0.095, 0.035), cor, [1, 1, 0.8], { rot, brilho: 0 });
    k++;
  };
  // o tronco: fileiras desencontradas em volta (dos ombros até o quadril), a barriga livre
  for (let j = 0; j < 5; j++) {
    const y = troncoH + 0.01 - j * 0.1;
    const n = 26;
    for (let q = 0; q < n; q++) {
      const t = ((q + (j % 2) * 0.5) / n) * Math.PI * 2;
      const x = Math.sin(t) * (larg / 2 + 0.005);
      const z = Math.cos(t) * (prof / 2 + 0.005);
      if (z > 0 && Math.abs(x) < larg * 0.3 && j > 0) continue;
      tufo('tronco', [x, y, z], [Math.sin(t), j === 0 ? 0.5 : 0, Math.cos(t)]);
    }
  }
  // os braços e as pernas: tufos em volta
  for (const lado of ['bracoE', 'bracoD'] as const)
    for (let j = 0; j < 3; j++)
      for (let q = 0; q < 8; q++) {
        const t = ((q + (j % 2) * 0.5) / 8) * Math.PI * 2;
        tufo(lado, [Math.sin(t) * 0.09, 0.02 - j * 0.08, Math.cos(t) * 0.09], [Math.sin(t), 0, Math.cos(t)], 0.85);
      }
  for (const lado of ['pernaE', 'pernaD'] as const)
    for (let j = 0; j < 2; j++)
      for (let q = 0; q < 8; q++) {
        const t = ((q + j * 0.5) / 8) * Math.PI * 2;
        tufo(lado, [Math.sin(t) * 0.1, -0.02 - j * 0.09, Math.cos(t) * 0.1], [Math.sin(t), 0, Math.cos(t)], 0.9);
      }
  // o capuz de monstro: uma bola redonda e fosca por trás e por cima da cabeça, coberta de tufos
  // em toda a volta (em cima, atrás e dos lados); na frente, os tufos em volta emolduram o rosto
  const cc: V3 = [0, 0.1, -0.2];
  const RR: V3 = [0.53, 0.56, 0.48];
  a.bola('monstro-capuz', 'cabeca', 1, cc, pelo, RR, fosco);
  const naCasca = (fi: number, u: number) => {
    const p: V3 = [cc[0] + RR[0] * Math.cos(fi) * Math.sin(u), cc[1] + RR[1] * Math.sin(fi), cc[2] + RR[2] * Math.cos(fi) * Math.cos(u)];
    const n: V3 = [(p[0] - cc[0]) / RR[0] ** 2, (p[1] - cc[1]) / RR[1] ** 2, (p[2] - cc[2]) / RR[2] ** 2];
    return { p, n };
  };
  for (const [fi, nq] of [
    [1.35, 5],
    [1.05, 11],
    [0.7, 16],
    [0.3, 19],
    [-0.1, 19],
    [-0.45, 16],
  ] as const)
    for (let q = 0; q < nq; q++) {
      const uu = ((q + (nq % 2) * 0.5) / nq) * Math.PI * 2;
      // (na frente, só por cima e dos lados do rosto: o rosto fica livre)
      if (Math.cos(uu) > 0.5 && fi < 0.85) continue;
      const { p: pp, n } = naCasca(fi, uu);
      tufo('cabeca', pp, n, 1.15);
    }
  // a moldura do rosto: tufos em volta da abertura, apontando para fora (de orelha a orelha)
  for (let q = 0; q < 14; q++) {
    const t = (q / 14) * Math.PI * 2 + 0.2;
    if (Math.sin(t) < -0.75) continue;
    tufo('cabeca', [Math.cos(t) * 0.4, -0.03 + Math.sin(t) * 0.37, 0.25], [Math.cos(t), Math.sin(t), 0.45], 0.8);
  }
  // a franjinha de pelo na testa: cobre o alto da cabeça na frente (o rosto fica dentro do capuz)
  for (let q = 0; q < 7; q++) {
    const x = -0.33 + q * 0.11;
    tufo('cabeca', [x, 0.33 - Math.abs(x) * 0.15, 0.3], [0, 0.35, 1], 0.95);
  }
  for (const s of [-1, 1]) {
    // os chifrinhos: curtos e redondos, saindo do pelo um tico para fora (laranja apagado, fosco)
    const h = naCasca(1.05, s * 0.5);
    a.caixa(`chifre${s}`, 'cabeca', [0.1, 0.17, 0.1], [h.p[0] + s * 0.02, h.p[1] + 0.07, h.p[2]], '#d9863c', 0.05, {
      rot: [0, 0, -s * 0.38],
      brilho: 0,
    });
  }
  // os pezões: no lugar do sapato, pés grandes e redondos com três dedinhos claros
  for (const lado of ['pernaE', 'pernaD'] as const) {
    const sapato = p.pecas.find((q) => q.nome === `${lado}-sapato`);
    if (!sapato) continue;
    sapato.tamanho = [0.25, 0.15, 0.36];
    sapato.pos = [sapato.pos[0], sapato.pos[1] + 0.01, sapato.pos[2] + 0.05];
    sapato.raio = 0.07;
    for (const x of [-0.07, 0, 0.07])
      a.bola(`${lado}-dedo${x}`, lado, 0.045, [x, sapato.pos[1] - 0.01, sapato.pos[2] + 0.17], COR.musgoClaro, [1, 0.8, 0.8]);
  }
  // o bumbo grande na frente, embaixo da barriga, com a pele creme virada para a frente, os aros
  // roxos e a alça roxa atravessada no ombro; a baqueta da mão direita encosta na pele
  const rB = 0.27;
  const fundo = 0.26;
  const xB = 0.12;
  const yB = -0.03;
  const zB = frente + fundo / 2 + 0.05;
  const deFrente = { rot: [Math.PI / 2, 0, 0] as V3 };
  a.cilindro('bumbo', 'tronco', fundo, rB, rB, [xB, yB, zB], COR.laranja, { ...deFrente, brilho: 0.2 });
  for (const s of [-1, 1]) {
    a.cilindro(`bumbo-pele${s}`, 'tronco', 0.012, rB - 0.02, rB - 0.02, [xB, yB, zB + s * (fundo / 2 + 0.004)], COR.creme, deFrente);
    a.anel(`bumbo-aro${s}`, 'tronco', rB * 2, 0.05, [xB, yB, zB + s * (fundo / 2 - 0.004)], COR.roxo, deFrente);
  }
  for (let i = 0; i < 8; i++) {
    const t = (i / 8) * Math.PI * 2;
    a.caixa(`bumbo-corda${i}`, 'tronco', [0.025, 0.025, fundo], [xB + Math.cos(t) * (rB + 0.004), yB + Math.sin(t) * (rB + 0.004), zB], COR.creme, 0.01);
  }
  a.caixa('bumbo-correia', 'tronco', [0.08, troncoH * 1.3, prof + 0.05], [0.02, troncoH * 0.5, 0], COR.roxo, 0.03, {
    rot: [0, 0, -0.62],
  });
  // a baqueta na mão direita, ao longo do braço para baixo: a bola encosta na pele do bumbo
  a.cilindro('maceta-cabo', 'maoD', 0.28, 0.022, 0.022, [0, -0.15, 0.02], '#a8703c');
  a.bola('maceta-bola', 'maoD', 0.07, [0, -0.3, 0.02], COR.creme);
}

/** Seu Jerônimo: o dono da horta (palha com fita laranja, macacão jeans, xadrez, regador). */
function vestirJeronimo(p: PlanoBoneco): void {
  roupaLisa(p);
  // (jeans desbotado, suave: o azul royal brigava com o roxo e o laranja)
  const jeans = '#6a83a8';
  pintarRoupa(p, { camisa: COR.musgo, calca: jeans, sapato: '#6a4428', cabelo: '#e6e2da' });
  const m = medir(p);
  const a = alfaiate(p.pecas);
  const { troncoH, prof, frente, larg } = m;
  for (const q of p.pecas) if (q.nome === 'palha-fita') q.cor = COR.laranja;
  // a camisa xadrez: faixas laranja em pé e deitadas no musgo, e nas mangas
  for (const y of [0.3, 0.62, 0.88])
    a.caixa(`xadrez-h${y}`, 'tronco', [larg + 0.008, 0.032, prof + 0.008], [0, troncoH * y, 0], COR.laranja, 0.012);
  for (const x of [-0.3, 0, 0.3])
    a.caixa(`xadrez-v${x}`, 'tronco', [0.032, troncoH - 0.02, prof + 0.006], [x * larg, troncoH / 2, 0], COR.laranja, 0.012);
  for (const lado of ['bracoE', 'bracoD'] as const)
    for (const y of [-0.05, -0.15])
      a.caixa(`${lado}-xadrez${y}`, lado, [0.138, 0.028, 0.148], [0, y, 0], COR.laranja, 0.012);
  // o macacão jeans: a cintura, o peitilho, as alças com os botões dourados e o bolso
  a.caixa('macacao-cintura', 'tronco', [larg + 0.016, 0.15, prof + 0.016], [0, 0.065, 0], jeans, 0.05);
  a.caixa('macacao-peito', 'tronco', [larg * 0.58, troncoH * 0.55, 0.03], [0, troncoH * 0.36, frente + 0.01], jeans, 0.02);
  a.caixa('macacao-bolso', 'tronco', [larg * 0.3, 0.09, 0.02], [0, troncoH * 0.4, frente + 0.03], escurecer(jeans, 0.15), 0.015);
  for (const s of [-1, 1]) {
    const x = s * larg * 0.23;
    a.caixa(`alca${s}-frente`, 'tronco', [0.06, troncoH * 0.4, 0.025], [x, troncoH * 0.8, frente + 0.012], jeans, 0.012);
    a.caixa(`alca${s}-ombro`, 'tronco', [0.06, 0.03, prof + 0.04], [x, troncoH + 0.005, 0], jeans, 0.012);
    a.caixa(`alca${s}-costas`, 'tronco', [0.06, troncoH * 0.6, 0.025], [x, troncoH * 0.7, -prof / 2 - 0.012], jeans, 0.012);
    a.bola(`botao${s}`, 'tronco', 0.028, [x, troncoH * 0.62, frente + 0.03], COR.ouro, [1, 1, 0.6]);
  }
  // o regador laranja na mão esquerda (a alça na mão, o bico para a frente)
  const cor = COR.laranja;
  a.anel('regador-alca', 'maoE', 0.14, 0.026, [0, -0.04, 0], escurecer(cor, 0.15), { rot: [0, 0, Math.PI / 2] });
  a.cilindro('regador-corpo', 'maoE', 0.2, 0.11, 0.1, [0, -0.2, 0], cor);
  a.cilindro('regador-tampa', 'maoE', 0.03, 0.1, 0.07, [0, -0.085, 0], escurecer(cor, 0.15));
  a.cilindro('regador-bico', 'maoE', 0.26, 0.022, 0.03, [0, -0.17, 0.18], escurecer(cor, 0.15), { rot: [1.0, 0, 0] });
  a.bola('regador-crivo', 'maoE', 0.045, [0, -0.09, 0.29], COR.musgo, [1, 1, 0.7], { rot: [1.0, 0, 0] });
}

// ------------------------------------------------------------------ os moradores

/** O que a pose diz às peças: o "para baixo" do mundo no espaço de cada mão. */
interface InfoPose {
  baixoMaoE: V3;
  baixoMaoD: V3;
}

/** O "para baixo" do mundo no espaço da mão (o braço e o tronco girados pela pose). */
function baixoNaMao(r: RotacoesPose, lado: 'bracoE' | 'bracoD'): V3 {
  const giro = (v: [number, number, number]) =>
    Matrix.FromQuaternionToRef(Quaternion.RotationYawPitchRoll(v[1], v[0], v[2]), new Matrix());
  // mundo <- corpo <- tronco <- braço (vetores em linha, como no Babylon)
  const m = giro(r[lado]).multiply(giro(r.tronco)).multiply(giro(r.corpo));
  const inv = m.clone().invert();
  const v = Vector3.TransformNormal(new Vector3(0, -1, 0), inv).normalize();
  return [v.x, v.y, v.z];
}

interface DefMorador {
  id: string;
  modelo: ModeloId;
  aparencia: Partial<Aparencia>;
  vestir: (p: PlanoBoneco, info: InfoPose) => void;
  /** A pose parada (por cima da pose de ficar em pé). */
  pose: Juntas & { corpoZ?: number; corpoX?: number; troncoZ?: number };
}

const MORADORES: DefMorador[] = [
  {
    id: 'vovo',
    modelo: 'herbolaria',
    // (rosto sem cílios: de óculos, os cílios inclinados pareciam sobrancelha brava)
    aparencia: { corpo: 'feminino', pele: 5, rosto: 0, cabeloEstilo: 6, roupaEstilo: 8, acessorio: 'nenhum' },
    vestir: vestirVovo,
    // (a varinha aberta para o lado, a estrela longe do rosto)
    pose: { bdZ: 2.5, bdX: 0, beX: -0.5, beZ: -0.45, cabZ: 0.06 },
  },
  {
    id: 'dudu',
    modelo: 'andarilho',
    aparencia: { corpo: 'masculino', pele: 0, rosto: 0, cabeloEstilo: 0, roupaEstilo: 0, acessorio: 'nenhum' },
    vestir: vestirDudu,
    // a lanterninha bem na frente e a outra mão encolhida na barriga (o medinho do escuro)
    pose: { beX: -1.45, beZ: 0.05, bdX: -0.75, bdZ: -0.3, cabZ: -0.1, cabX: 0.06 },
  },
  {
    id: 'lulu',
    modelo: 'tecela',
    aparencia: { corpo: 'feminino', pele: 7, rosto: 2, cabeloEstilo: 8, cabeloCor: 1, roupaEstilo: 0, acessorio: 'nenhum' },
    vestir: vestirLulu,
    // o "buu!": os braços de pano abertos para os lados, na altura dos ombros
    pose: { beX: -0.35, bdX: -0.35, beZ: -1.35, bdZ: 1.35, cabZ: 0.12, corpoZ: 0.06 },
  },
  {
    id: 'bento',
    modelo: 'ferreiro',
    aparencia: { corpo: 'masculino', pele: 3, rosto: 0, cabeloEstilo: 0, cabeloCor: 1, roupaEstilo: 0, acessorio: 'nenhum' },
    vestir: vestirBento,
    // (a mão direita com a baqueta encostando na pele do bumbo, a esquerda apoiada nele)
    pose: { bdX: -1.1, bdZ: -0.25, beX: -0.6, beZ: 0.2, cabZ: 0.08 },
  },
  {
    id: 'jeronimo',
    modelo: 'lanterneiro',
    // (cabelo curtinho debaixo do chapéu: a franja branca de lado parecia um curativo)
    aparencia: { corpo: 'masculino', pele: 2, rosto: 5, cabeloEstilo: 3, roupaEstilo: 0, acessorio: 'chapeu-palha' },
    vestir: vestirJeronimo,
    pose: { bdZ: 2.5, bdX: 0, beX: -0.15, cabZ: 0.05 },
  },
];

/** A pose parada de ficar em pé (um instante sem piscar). */
export const emPe = (): Pose =>
  calcularPose({ andando: false, correndo: false, noAr: false, minerando: false, colocando: false, tempo: 1 });

/** A sombrinha de contato no chão (um disco escuro e macio), de todos os moradores e bichos. */
let matSombra: StandardMaterial | null = null;
export function sombrinha(ctx: CtxPalco, nome: string, raio: number): Mesh {
  const { scene } = ctx;
  if (!matSombra) {
    const tex = new DynamicTexture('esboco-gente-sombra', { width: 64, height: 64 }, scene, false);
    const g = tex.getContext();
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,0.55)');
    gr.addColorStop(0.5, 'rgba(0,0,0,0.38)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    tex.update();
    tex.hasAlpha = true;
    matSombra = new StandardMaterial('esboco-gente-sombra', scene);
    matSombra.diffuseColor = new Color3(0.12, 0.08, 0.16);
    matSombra.specularColor = Color3.Black();
    matSombra.disableLighting = true;
    matSombra.emissiveColor = new Color3(0.1, 0.06, 0.14);
    matSombra.opacityTexture = tex;
  }
  const m = MeshBuilder.CreateGround(nome, { width: raio * 2, height: raio * 2 }, scene);
  m.material = matSombra;
  m.isPickable = false;
  ctx.semBrilho(m);
  return m;
}

export interface Morador {
  id: string;
  boneco: Personagem;
  sombra: Mesh;
  pose: Pose;
  info: InfoPose;
  /** Onde ele mora (lugar) e na fila da praça. */
  lugar: { x: number; y: number; z: number; giro: number };
}

export interface Moradores {
  lista: Morador[];
  /** Os cinco lado a lado na praça (fila) ou cada um no seu lugar. */
  modo(m: 'lugares' | 'fila'): void;
  hora(noite: boolean): void;
  /** As tomadas das fotos dos moradores. */
  tomadas: Record<string, Record<'deitado' | 'empe', { pos: V3; alvo: V3; fov: number }>>;
}

export function noDaJunta(b: Personagem, prefixo: string, junta: Junta): TransformNode | undefined {
  return b.raiz.getChildTransformNodes(false).find((n) => n.name === `${prefixo}-junta-${junta}`);
}

export function montarMoradores(ctx: CtxPalco): Moradores {
  const { scene, O, pontos } = ctx;
  const Y = O.y + 1;
  const { ox, oz } = O;
  const t = ctx.trilha;
  // os lugares de cada um (o pé no chão; o giro 0 olha para +z, para a câmera das fotos)
  const [vx, , vz] = pontos.vovo;
  const [px, py, pz] = pontos.palco;
  const lugares: Record<string, { x: number; y: number; z: number; giro: number }> = {
    vovo: { x: vx - 0.3, y: Y, z: vz + 2.15, giro: -0.25 },
    dudu: { x: ox + t(79) + 0.5, y: Y, z: oz + 79.3, giro: 0.15 },
    lulu: { x: ox + 14.8, y: Y, z: oz + 18.45, giro: -0.6 },
    bento: { x: px, y: py, z: pz + 0.4, giro: 0 },
    jeronimo: { x: ox + 15.7, y: Y, z: oz + 49.4, giro: -0.35 },
  };
  const lista: Morador[] = MORADORES.map((def) => {
    const ap: Aparencia = { ...aparenciaPadrao(def.modelo), ...def.aparencia, nome: def.id };
    const prefixo = `esboco-${def.id}`;
    const pose = emPe();
    aplicarJuntas(pose, def.pose, 1);
    if (def.pose.corpoZ) pose.corpoZ = def.pose.corpoZ;
    if (def.pose.corpoX) pose.corpoX = def.pose.corpoX;
    if (def.pose.troncoZ) pose.troncoZ = def.pose.troncoZ;
    const r = rotacoesDaPose(pose, 0, false);
    const info: InfoPose = { baixoMaoE: baixoNaMao(r, 'bracoE'), baixoMaoD: baixoNaMao(r, 'bracoD') };
    const boneco = criarBoneco(
      scene,
      ap,
      prefixo,
      (pl) => {
        def.vestir(pl, info);
        return pl;
      },
      true,
    );
    boneco.aplicarPose(pose);
    for (const mm of boneco.raiz.getChildMeshes()) {
      if (mm instanceof Mesh) ctx.semBrilho(mm);
      mm.isPickable = false;
    }
    const sombra = sombrinha(ctx, `${prefixo}-sombra`, def.id === 'bento' ? 0.62 : 0.5);
    return { id: def.id, boneco, sombra, pose, info, lugar: lugares[def.id] };
  });
  // o lençol de fantasma da Lulu (capuz de cúpula e sino), nas juntas dela
  const lulu = lista.find((q) => q.id === 'lulu')!;
  const lencol = medidasLulu ? lencolDaLulu(ctx, lulu.boneco, 'esboco-lulu', medidasLulu) : null;
  // a capa contínua do Dudu
  if (medidasDudu) capaDoDudu(ctx, lista.find((q) => q.id === 'dudu')!.boneco, 'esboco-dudu', medidasDudu);
  // a luz da lanterninha do Dudu: o vidro aceso (luz própria) e o halo de noite
  const dudu = lista.find((q) => q.id === 'dudu')!;
  const mao = noDaJunta(dudu.boneco, 'esboco-dudu', 'maoE');
  let haloDudu: Mesh | null = null;
  if (mao) {
    const vidro = MeshBuilder.CreateBox('esboco-dudu-vidro', { width: 0.11, height: 0.15, depth: 0.11 }, scene);
    vidro.material = ctx.acesa('#ffd36a');
    vidro.parent = mao;
    const L = lanternaNaMao(dudu.info.baixoMaoE);
    vidro.position.set(...L.em(0.2));
    vidro.rotation.set(...L.rot());
    vidro.isPickable = false;
    const tex = new DynamicTexture('esboco-dudu-halo', { width: 64, height: 64 }, scene, false);
    const g = tex.getContext();
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    // (pequeno e fraco: o halo grande, somado por cima, lavava a calça roxa até a cor de pele)
    gr.addColorStop(0, 'rgba(255,214,120,0.6)');
    gr.addColorStop(0.4, 'rgba(255,190,90,0.16)');
    gr.addColorStop(1, 'rgba(255,170,60,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    tex.update();
    tex.hasAlpha = true;
    const mh = new StandardMaterial('esboco-dudu-halo', scene);
    mh.disableLighting = true;
    mh.emissiveTexture = tex;
    mh.opacityTexture = tex;
    mh.diffuseColor = Color3.Black();
    mh.specularColor = Color3.Black();
    mh.alphaMode = 1; // ALPHA_ADD
    mh.backFaceCulling = false;
    haloDudu = MeshBuilder.CreatePlane('esboco-dudu-halo', { size: 0.62 }, scene);
    haloDudu.material = mh;
    haloDudu.billboardMode = Mesh.BILLBOARDMODE_ALL;
    haloDudu.parent = mao;
    haloDudu.position.set(...L.em(0.2));
    haloDudu.isPickable = false;
    ctx.foraDoBrilho(haloDudu);
  }
  // (um tico mais espaçados: o Bento grandão e o bumbo precisam de lugar)
  // (juntinhos, ombro com ombro: em pé, a fila inteira cabe de mais perto)
  const fila = (i: number) => ({ x: ox + 49.3 + i * 1.6, y: Y, z: oz + 46.5, giro: 0 });
  const ordemFila = ['vovo', 'dudu', 'lulu', 'bento', 'jeronimo'];
  const por = (q: Morador, l: { x: number; y: number; z: number; giro: number }) => {
    q.boneco.posicionar(l.x, l.y, l.z, l.giro);
    q.sombra.position.set(l.x, l.y + 0.025, l.z);
  };
  const api: Moradores = {
    lista,
    modo(m) {
      for (const q of lista) por(q, m === 'fila' ? fila(ordemFila.indexOf(q.id)) : q.lugar);
    },
    hora(noite) {
      for (const q of lista) q.boneco.definirLuz(noite ? 0.8 : 1);
      haloDudu?.setEnabled(noite);
      lencol?.hora(noite);
    },
    tomadas: {},
  };
  api.modo('lugares');
  api.hora(false);
  // ---------------------------------------------------------------- as tomadas
  const tm = (pos: V3, alvo: V3, fov: number) => ({ pos, alvo, fov });
  const P = (x: number, h: number, z: number): V3 => [ox + x, O.y + h, oz + z];
  const fx = 49.3 + 2 * 1.6;
  api.tomadas.fila = {
    // (o alto da abóbora gigante inteiro no quadro: os olhos dela não saem cortados)
    deitado: tm(P(fx, 2.0, 53.6), P(fx, 2.65, 46.5), 54),
    // (em pé, a fila só cabe de longe: a abóbora gigante atrás enche o alto do quadro)
    empe: tm(P(fx, 1.75, 55.0), P(fx, 2.55, 46.5), 90),
  };
  const L = (id: string) => lugares[id];
  /**
   * A câmera de perto. Em pé, ela fica um tico mais baixa e olha mais para cima: o morador cai
   * para o terço de baixo e o lugar dele aparece atrás (antes, 40% da foto era chão vazio).
   */
  const perto = (id: string, dx: number, dz: number, h: number, alvoH: number, fovD: number, fovE: number, dzE = dz) => {
    const l = L(id);
    const ax = l.x;
    const az = l.z;
    const ay = l.y + alvoH;
    return {
      deitado: tm([ax + dx, l.y + h, az + dz], [ax, ay, az], fovD),
      empe: tm([ax + dx * (dzE / dz), l.y + h - 0.25, az + dzE], [ax, ay + 0.75, az], fovE),
    };
  };
  api.tomadas.vovo = perto('vovo', 0.3, 3.7, 1.5, 0.95, 56, 72, 5.6);
  // (em pé, o meio do quadro entre o caldeirão e o banquinho: os dois inteiros)
  api.tomadas.vovo.empe.pos[0] += 0.05;
  api.tomadas.vovo.empe.alvo[0] += 0.05;
  api.tomadas.dudu = perto('dudu', -0.3, 3.4, 1.4, 0.9, 56, 68, 4.0);
  // (de longe e fechado, do outro lado da rua: a quina da casinha esconde um pedaço dela)
  api.tomadas.lulu = perto('lulu', -5.1, 8.05, 1.5, 0.9, 30, 40, 8.05);
  // (de mais longe: as abóboras dos cantos do palco inteiras)
  api.tomadas.bento = perto('bento', 0, 5.4, 1.8, 1.3, 52, 68, 5.6);
  api.tomadas.jeronimo = perto('jeronimo', -0.5, 3.6, 1.5, 0.95, 56, 68, 4.2);
  // (só para conferir a gola da capa por trás: não vai para o dono)
  api.tomadas.duduCostas = perto('dudu', 2.2, -2.6, 1.6, 1.2, 50, 60);
  return api;
}
