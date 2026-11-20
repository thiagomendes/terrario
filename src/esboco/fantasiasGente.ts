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
  // a gola alta: um painel atrás da cabeça e duas abas que abrem para a frente dos dois lados
  // do rosto (bem mais largas que a cabeça: de frente, aparecem com o forro laranja), sem
  // encostar no cabelo
  const zGola = -(cab.d / 2) - 0.105;
  const yBase = troncoH - 0.02;
  const painel = (nome: string, w: number, alto: number, x: number, z: number, giro: number) => {
    const perfil = perfilArredondado(w, alto, 0.11);
    const nx = Math.sin(giro);
    const nz = Math.cos(giro);
    a.placa(`${nome}-fora`, 'tronco', perfil, 0.03, [x - nx * 0.014, yBase, z - nz * 0.014], capa, {
      rot: [-0.12, giro, 0],
    });
    a.placa(
      `${nome}-forro`,
      'tronco',
      perfil.map(([px, py]) => [px * 0.9, py * 0.93] as P2),
      0.012,
      [x + nx * 0.008, yBase + 0.012, z + nz * 0.008],
      COR.laranja,
      { rot: [-0.12, giro, 0] },
    );
  };
  const meia = 0.37;
  painel('gola', meia * 2 + 0.02, 0.44, 0, zGola, 0);
  for (const s of [-1, 1]) {
    // a aba sai da beira do painel de trás e abre para a frente e para fora (curta e redonda:
    // grande, de frente, parecia orelha de fone)
    const g = -s * 0.85;
    const w = 0.3;
    const ux = Math.cos(g) * s;
    const uz = -Math.sin(g) * s;
    painel(`gola${s}`, w, 0.38, s * meia + (ux * w) / 2, zGola + (uz * w) / 2, g);
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

let medidasLulu: Medidas | null = null;
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
  // (na junta da capa: y = 0 no alto dos ombros; o meio do corpo fica em z = prof/2 - 0.02)
  const zc = prof / 2 - 0.02;
  const comp = quadril + troncoH - 0.03 - 0.07;
  const fazer = (nome: string, cor: string, dr: number, encurta: number) => {
    const NV = 16;
    const NU = 28;
    const P: number[] = [];
    const I: number[] = [];
    for (let i = 0; i <= NV; i++) {
      const t = i / NV;
      const r = 0.27 + 0.19 * t ** 0.9 - dr;
      const ang = 1.02 + 0.3 * t;
      for (let j = 0; j <= NU; j++) {
        const th = -ang + (2 * ang * j) / NU;
        // a barra um tico ondulada (o pano caindo)
        const y = -(comp - encurta) * t - 0.025 * t ** 4 * (0.5 + 0.5 * Math.cos(5 * th));
        P.push(r * Math.sin(th), y, zc - r * Math.cos(th));
      }
    }
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
    mm.material = mat;
    mm.parent = no;
    mm.isPickable = false;
    ctx.semBrilho(mm);
  };
  fazer('capa', '#3a2850', 0, 0);
  fazer('capa-forro', COR.laranja, 0.016, 0.03);
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
  // ---- a cúpula: um ovo em volta da cabeça, sem o fundo (o pescoço) e com o furo oval do rosto
  // (a cúpula contém a cabeça de cantos redondos inteira, com folga: nada de bochecha furando)
  const c: V3 = [0, 0.08, -0.02];
  const R: V3 = [0.55, 0.58, 0.5];
  const furo = { ax: 0.28, ay: 0.27, oy: -0.08 };
  const noFuro = (x: number, y: number, z: number) =>
    z > 0.05 && (x / furo.ax) ** 2 + ((y - furo.oy) / furo.ay) ** 2 < 1;
  const NA = 40;
  const NB = 64;
  const P: number[] = [];
  const I: number[] = [];
  const corte = 0.74; // (até onde a cúpula desce: 74% do raio abaixo do meio)
  const ponto = (i: number, j: number): V3 => {
    const fi = -Math.asin(corte) + (i / NA) * (Math.PI / 2 + Math.asin(corte));
    const u = (j / NB) * Math.PI * 2;
    return [
      c[0] + R[0] * Math.cos(fi) * Math.sin(u),
      c[1] + R[1] * Math.sin(fi),
      c[2] + R[2] * Math.cos(fi) * Math.cos(u),
    ];
  };
  for (let i = 0; i <= NA; i++) for (let j = 0; j <= NB; j++) P.push(...ponto(i, j));
  const idx = (i: number, j: number) => i * (NB + 1) + j;
  for (let i = 0; i < NA; i++)
    for (let j = 0; j < NB; j++) {
      const q = [idx(i, j), idx(i + 1, j), idx(i + 1, j + 1), idx(i, j + 1)];
      // o quadradinho sai inteiro quando o meio dele cai no furo do rosto
      const meio = [0, 1, 2].map((k) => (P[q[0] * 3 + k] + P[q[2] * 3 + k]) / 2);
      if (noFuro(meio[0], meio[1], meio[2])) continue;
      I.push(q[0], q[1], q[2], q[0], q[2], q[3]);
    }
  malha('capuz', P, I, cabeca);
  // a beirada do furo: um rolinho de pano em volta do rosto
  const beira: Vector3[] = [];
  for (let k = 0; k <= 48; k++) {
    const t = (k / 48) * Math.PI * 2;
    const x = Math.cos(t) * furo.ax;
    const y = furo.oy + Math.sin(t) * furo.ay;
    const zz = c[2] + R[2] * Math.sqrt(Math.max(0, 1 - (x / R[0]) ** 2 - ((y - c[1]) / R[1]) ** 2));
    beira.push(new Vector3(x, y, zz - 0.01));
  }
  const rolo = MeshBuilder.CreateTube(`${prefixo}-beira`, { path: beira, radius: 0.035, tessellation: 10 }, scene);
  rolo.material = mat;
  rolo.parent = cabeca ?? null;
  rolo.isPickable = false;
  // a pontinha mole: sai do alto da cúpula, sobe um tico e cai de lado, afinando
  const topo: V3 = [c[0], c[1] + R[1] - 0.04, c[2] - 0.02];
  const ponta: Vector3[] = [];
  for (let k = 0; k <= 14; k++) {
    const t = k / 14;
    ponta.push(new Vector3(topo[0] - 0.3 * t * t, topo[1] + 0.2 * t - 0.2 * t * t * t, topo[2] - 0.1 * t));
  }
  const tubo = MeshBuilder.CreateTube(
    `${prefixo}-pontinha`,
    { path: ponta, radiusFunction: (k) => 0.2 * (1 - k / 14) + 0.045, tessellation: 18, cap: Mesh.CAP_ALL },
    scene,
  );
  tubo.material = mat;
  tubo.parent = cabeca ?? null;
  tubo.isPickable = false;
  const bolinha = MeshBuilder.CreateSphere(`${prefixo}-pontinha-bola`, { diameter: 0.11, segments: 12 }, scene);
  bolinha.position.copyFrom(ponta[ponta.length - 1]);
  bolinha.material = mat;
  bolinha.parent = cabeca ?? null;
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
  const todas = [rolo, tubo, bolinha, ...scene.meshes.filter((x) => x.name === `${prefixo}-capuz` || x.name === `${prefixo}-sino`)];
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
  const pelo = COR.musgo;
  // (tons bem próximos: o pelo é um só, os tufos só dão a textura)
  const pelos = [COR.musgo, '#64843a', '#5a7731'];
  // (o cabelo que aparece debaixo da aba vira a testa do capuz, no mesmo pelo)
  pintarRoupa(p, { camisa: pelo, calca: pelo, sapato: COR.musgoEscuro, cabelo: '#557330' });
  const m = medir(p);
  const a = alfaiate(p.pecas);
  const { troncoH, prof, frente, larg, xBraco } = m;
  // o grandão: um quarto maior que os outros
  p.escala *= 1.24;
  // a barriga clarinha
  a.bola('barriga', 'tronco', 0.2, [0, troncoH * 0.45, frente - 0.02], COR.musgoClaro, [larg * 2.1, 1.05, 0.3]);
  // os tufos do pelo: bolinhas espalhadas pelo tronco, mangas e pernas
  let k = 0;
  // tufos grandes e achatados, encavalados (um pelo fofo, não bolinhas soltas)
  const tufo = (junta: Junta, pos: V3, r = 0.065) =>
    a.bola(`tufo${k}`, junta, r * (0.95 + sorte(k, 7) * 0.25), pos, pelos[k++ % 3], [1, 0.8, 0.45]);
  for (let i = 0; i < 5; i++)
    for (let j = 0; j < 4; j++) {
      const x = -larg / 2 + 0.06 + ((larg - 0.12) * i) / 4 + (sorte(i, j) - 0.5) * 0.03;
      const y = 0.06 + j * 0.105 + (sorte(j, i) - 0.5) * 0.03;
      // costas inteiras; na frente, só nas beiradas (a barriga e o bumbo ficam no meio)
      tufo('tronco', [x, y, -prof / 2 + 0.01]);
      if (Math.abs(x) > larg * 0.3) tufo('tronco', [x, y, frente - 0.015]);
    }
  // os tufos da silhueta: saindo bem dos lados do tronco e por cima dos ombros (o pelo se lê de
  // longe, no contorno)
  for (const s of [-1, 1]) {
    for (let j = 0; j < 4; j++)
      for (const z of [-0.1, 0.0, 0.1])
        a.bola(`tufo${k}`, 'tronco', 0.07, [s * (larg / 2 + 0.015), 0.05 + j * 0.105 + (sorte(s, j + z) - 0.5) * 0.03, z], pelos[k++ % 3], [0.75, 0.8, 1]);
    for (const z of [-0.1, 0.06])
      a.bola(`tufo${k}`, 'tronco', 0.065, [s * (larg / 2 - 0.06), troncoH + 0.0, z], pelos[k++ % 3], [1, 0.7, 1]);
  }
  for (const lado of ['bracoE', 'bracoD'] as const)
    for (let j = 0; j < 3; j++)
      for (const [x, z, e] of [
        [0.065, 0, [0.75, 0.8, 1]],
        [-0.065, 0, [0.75, 0.8, 1]],
        [0, 0.065, [1, 0.8, 0.7]],
        [0, -0.065, [1, 0.8, 0.7]],
      ] as const)
        a.bola(`tufo${k}`, lado, 0.055, [x, -0.03 - j * 0.07, z], pelos[k++ % 3], [...e]);
  for (const lado of ['pernaE', 'pernaD'] as const)
    for (const [x, z, e] of [
      [0.075, 0, [0.6, 0.8, 1]],
      [-0.075, 0, [0.6, 0.8, 1]],
      [0, 0.08, [1, 0.8, 0.6]],
      [0, -0.08, [1, 0.8, 0.6]],
    ] as const)
      a.bola(`tufo${k}`, lado, 0.06, [x, -0.1, z], pelos[k++ % 3], [...e]);
  // o capuz peludo com os chifrinhos redondos laranja e as orelhinhas redondas
  capuzDePano(a, m, 'monstro-capuz', pelo, 0.04);
  const wCapuz = m.cab.w + 0.22;
  for (let i = 0; i < 9; i++) {
    const t = (i / 8) * Math.PI;
    a.bola(
      `capuz-tufo${i}`,
      'cabeca',
      0.08,
      [Math.cos(t) * (wCapuz / 2 - 0.06), m.topoTampa + 0.02 + Math.sin(t) * 0.07, -0.22],
      pelos[i % 3],
      [1, 0.8, 0.8],
    );
  }
  // os tufos dos lados do capuz (o contorno da cabeça também peludo)
  for (const s of [-1, 1])
    for (const y of [-0.22, -0.08, 0.27])
      a.bola(`capuz-lado${s}${y}`, 'cabeca', 0.075, [s * (wCapuz / 2 - 0.005), y, -0.12], pelos[(k++ + 1) % 3], [0.6, 0.85, 1]);
  for (const s of [-1, 1]) {
    // os chifrinhos: bolinhas lisas e redondas (nada de broto)
    a.bola(`chifre${s}`, 'cabeca', 0.085, [s * 0.21, m.topoTampa + 0.14, 0.0], COR.laranja, [1, 1.08, 1], { brilho: 0.4 });
    a.bola(`orelha${s}`, 'cabeca', 0.09, [s * (wCapuz / 2 + 0.02), 0.1, -0.1], pelo, [0.55, 1, 0.9], {
      rot: [0, 0, s * 0.35],
    });
    a.bola(`orelha-dentro${s}`, 'cabeca', 0.05, [s * (wCapuz / 2 + 0.045), 0.1, -0.06], COR.musgoClaro, [0.4, 1, 0.8], {
      rot: [0, 0, s * 0.35],
    });
  }
  ajeitarCabeloDebaixo(p.pecas, 'capuz', m.topoTampa, m.cab);
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
  // o bumbo na frente da barriga (a correia roxa no ombro), faces creme e aros roxos
  const rB = 0.27;
  const zB = frente + rB + 0.02;
  const yB = troncoH * 0.3;
  a.cilindro('bumbo', 'tronco', 0.3, rB, rB, [0, yB, zB], COR.laranja, { rot: [0, 0, Math.PI / 2] });
  for (const s of [-1, 1]) {
    a.cilindro(`bumbo-pele${s}`, 'tronco', 0.012, rB - 0.02, rB - 0.02, [s * 0.155, yB, zB], COR.creme, {
      rot: [0, 0, Math.PI / 2],
    });
    a.anel(`bumbo-aro${s}`, 'tronco', rB * 2, 0.045, [s * 0.15, yB, zB], COR.roxo, { rot: [0, 0, Math.PI / 2] });
  }
  for (let i = 0; i < 6; i++) {
    const t = (i / 6) * Math.PI * 2;
    a.caixa(`bumbo-corda${i}`, 'tronco', [0.3, 0.025, 0.025], [0, yB + Math.sin(t) * (rB + 0.004), zB + Math.cos(t) * (rB + 0.004)], COR.creme, 0.01);
  }
  a.caixa('bumbo-correia', 'tronco', [0.07, troncoH * 1.25, prof + 0.04], [0, troncoH * 0.55, 0], COR.roxo, 0.025, {
    rot: [0, 0, -0.72],
  });
  // a maceta na mão direita: cabo de madeira e a bola creme
  a.cilindro('maceta-cabo', 'maoD', 0.32, 0.02, 0.02, [0, -0.02, 0.17], '#a8703c', { rot: [Math.PI / 2, 0, 0] });
  a.bola('maceta-bola', 'maoD', 0.075, [0, -0.02, 0.34], COR.creme);
  void xBraco;
}

/** Seu Jerônimo: o dono da horta (palha com fita laranja, macacão jeans, xadrez, regador). */
function vestirJeronimo(p: PlanoBoneco): void {
  roupaLisa(p);
  const jeans = '#4a6aa6';
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
    aparencia: { corpo: 'masculino', pele: 0, rosto: 0, cabeloEstilo: 1, roupaEstilo: 0, acessorio: 'nenhum' },
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
    pose: { bdX: -1.0, bdZ: 0.55, beX: -0.5, beZ: -0.1, cabZ: 0.08 },
  },
  {
    id: 'jeronimo',
    modelo: 'lanterneiro',
    aparencia: { corpo: 'masculino', pele: 2, rosto: 5, cabeloEstilo: 1, roupaEstilo: 0, acessorio: 'chapeu-palha' },
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
    gr.addColorStop(0, 'rgba(255,214,120,0.85)');
    gr.addColorStop(0.35, 'rgba(255,190,90,0.3)');
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
    haloDudu = MeshBuilder.CreatePlane('esboco-dudu-halo', { size: 1.9 }, scene);
    haloDudu.material = mh;
    haloDudu.billboardMode = Mesh.BILLBOARDMODE_ALL;
    haloDudu.parent = mao;
    haloDudu.position.set(...L.em(0.2));
    haloDudu.isPickable = false;
    ctx.foraDoBrilho(haloDudu);
  }
  const fila = (i: number) => ({ x: ox + 49.3 + i * 1.7, y: Y, z: oz + 46.5, giro: 0 });
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
  const fx = 49.3 + 2 * 1.7;
  api.tomadas.fila = {
    deitado: tm(P(fx, 2.0, 52.2), P(fx, 1.85, 46.5), 50),
    // (em pé, a fila só cabe de longe: a abóbora gigante atrás enche o alto do quadro)
    empe: tm(P(fx, 1.9, 56.3), P(fx, 2.6, 46.5), 88),
  };
  const L = (id: string) => lugares[id];
  const perto = (id: string, dx: number, dz: number, h: number, alvoH: number, fovD: number, fovE: number, dzE = dz) => {
    const l = L(id);
    const ax = l.x;
    const az = l.z;
    const ay = l.y + alvoH;
    return {
      deitado: tm([ax + dx, l.y + h, az + dz], [ax, ay, az], fovD),
      empe: tm([ax + dx * (dzE / dz), l.y + h, az + dzE], [ax, ay, az], fovE),
    };
  };
  api.tomadas.vovo = perto('vovo', 0.3, 3.7, 1.5, 0.95, 56, 68, 4.3);
  api.tomadas.dudu = perto('dudu', -0.3, 3.4, 1.4, 0.9, 56, 68, 4.0);
  // (de longe e fechado, do outro lado da rua: a quina da casinha esconde um pedaço dela)
  api.tomadas.lulu = perto('lulu', -5.1, 8.05, 1.5, 0.9, 30, 40, 8.05);
  api.tomadas.bento = perto('bento', 0, 3.6, 1.6, 1.05, 56, 68, 4.2);
  api.tomadas.jeronimo = perto('jeronimo', -0.5, 3.6, 1.5, 0.95, 56, 68, 4.2);
  // (só para conferir a gola da capa por trás: não vai para o dono)
  api.tomadas.duduCostas = perto('dudu', 2.2, -2.6, 1.6, 1.2, 50, 60);
  return api;
}
