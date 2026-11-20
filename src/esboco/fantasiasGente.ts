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
interface Medidas {
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

function medir(p: PlanoBoneco): Medidas {
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
function alfaiate(pecas: Peca[]) {
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
function roupaLisa(p: PlanoBoneco): void {
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
function pintarRoupa(p: PlanoBoneco, r: Roupa): void {
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
  // o xale laranja: a volta no pescoço, o triângulo nas costas e as pontas com o nó na frente
  a.anel('xale-volta', 'tronco', 0.5, 0.12, [0, troncoH + 0.01, 0], COR.laranja);
  a.placa(
    'xale-costas',
    'tronco',
    [
      [-(larg / 2 + 0.03), 0],
      [larg / 2 + 0.03, 0],
      [0.03, -troncoH * 0.78],
      [-0.03, -troncoH * 0.78],
    ],
    0.03,
    [0, troncoH - 0.01, -prof / 2 - 0.016],
    COR.laranja,
  );
  for (const s of [-1, 1])
    a.caixa(
      `xale-ponta${s}`,
      'tronco',
      [0.09, 0.2, 0.04],
      [s * 0.06, troncoH - 0.13, frente + 0.02],
      COR.laranja,
      0.03,
      { rot: [0, 0, s * 0.28] },
    );
  a.bola('xale-no', 'tronco', 0.05, [0, troncoH - 0.04, frente + 0.035], COR.laranjaEscuro, [1.1, 0.9, 0.8]);
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
  // a capa nas costas, presa atrás dos ombros (balança com o boneco, como a capa de herói)
  const comp = Math.min(0.72, quadril + troncoH - 0.06);
  a.placa('capa-pano', 'capa', perfilCapa(0.38, 0.7, comp), 0.04, [0, -0.005, -0.045], capa, {
    brilho: 0.28,
  });
  // o forro laranja aparece na barra de baixo (a capa vira um tico na ponta)
  a.placa('capa-forro', 'capa', perfilCapa(0.37, 0.68, comp - 0.02), 0.012, [0, -0.012, -0.018], COR.laranja);
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
  painel('gola', meia * 2 + 0.02, 0.46, 0, zGola, 0);
  for (const s of [-1, 1]) {
    // a aba sai da beira do painel de trás e abre para a frente e para fora
    const g = -s * 0.6;
    const w = 0.44;
    const ux = Math.cos(g) * s;
    const uz = -Math.sin(g) * s;
    painel(`gola${s}`, w, 0.52, s * meia + (ux * w) / 2, zGola + (uz * w) / 2, g);
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
  const m = medir(p);
  const a = alfaiate(p.pecas);
  const { troncoH, larg, quadril } = m;
  capuzDePano(a, m, 'lencol-capuz', lencol, 0.02);
  // o lençol cobrindo os ombros e caindo em sino até os joelhos (os braços por dentro, as
  // mãozinhas de fora), com a barra ondulada
  a.caixa('lencol-ombros', 'tronco', [larg + 0.3, 0.2, 0.5], [0, troncoH - 0.06, -0.01], lencol, 0.1);
  const yBaixo = -quadril + 0.17;
  const h = troncoH - 0.04 - yBaixo;
  const rCima = larg / 2 + 0.13;
  const rBaixo = larg / 2 + 0.24;
  a.cilindro('lencol-sino', 'tronco', h, rBaixo, rCima, [0, yBaixo + h / 2, 0], lencol);
  const n = 16;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    a.bola(
      `lencol-barra${i}`,
      'tronco',
      0.075,
      [Math.sin(t) * (rBaixo - 0.02), yBaixo - 0.005, Math.cos(t) * (rBaixo - 0.02)],
      lencol,
      [1, 0.85, 1],
    );
  }
  // as mangas do lençol (os braços de pano) até o punho: só as mãos aparecem
  ajeitarCabeloDebaixo(p.pecas, 'capuz', m.topoTampa, m.cab);
}

/** Bento: o monstrinho peludo grandão (macacão de tufos, chifrinhos e pezões) com o bumbo. */
function vestirBento(p: PlanoBoneco): void {
  roupaLisa(p);
  const pelo = COR.musgo;
  // (tons bem próximos: o pelo é um só, os tufos só dão a textura)
  const pelos = [COR.musgo, '#64843a', '#5a7731'];
  // (o cabelo que aparece debaixo da aba vira a testa do capuz, no mesmo pelo)
  pintarRoupa(p, { camisa: pelo, calca: pelo, sapato: COR.musgoEscuro, cabelo: '#557330' });
  const m = medir(p);
  const a = alfaiate(p.pecas);
  const { troncoH, prof, frente, larg, xBraco } = m;
  p.escala *= 1.15;
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
  for (const s of [-1, 1])
    for (let j = 0; j < 4; j++)
      for (const z of [-0.09, 0.03])
        a.bola(`tufo${k}`, 'tronco', 0.065, [s * (larg / 2 - 0.01), 0.06 + j * 0.105, z + (sorte(s, j) - 0.5) * 0.04], pelos[k++ % 3], [0.6, 0.8, 1]);
  for (const lado of ['bracoE', 'bracoD'] as const)
    for (let j = 0; j < 3; j++)
      for (const [x, z, e] of [
        [0.055, 0, [0.6, 0.8, 1]],
        [-0.055, 0, [0.6, 0.8, 1]],
        [0, 0.06, [1, 0.8, 0.6]],
        [0, -0.06, [1, 0.8, 0.6]],
      ] as const)
        a.bola(`tufo${k}`, lado, 0.05, [x, -0.04 - j * 0.07, z], pelos[k++ % 3], [...e]);
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
  for (const s of [-1, 1]) {
    a.bola(`chifre${s}`, 'cabeca', 0.075, [s * 0.2, m.topoTampa + 0.16, 0.0], COR.laranja, [0.85, 1.25, 0.85], {
      rot: [0, 0, -s * 0.3],
    });
    a.bola(`chifre-ponta${s}`, 'cabeca', 0.052, [s * 0.232, m.topoTampa + 0.245, 0.0], '#f6a24a');
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
    pose: { beX: -1.05, bdX: -1.05, beZ: 0.3, bdZ: -0.3, cabZ: 0.16, corpoZ: 0.1 },
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
const emPe = (): Pose =>
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

function noDaJunta(b: Personagem, prefixo: string, junta: Junta): TransformNode | undefined {
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
    lulu: { x: ox + 14.62, y: Y, z: oz + 18.45, giro: -0.6 },
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
    empe: tm(P(fx, 1.9, 53.8), P(fx, 2.9, 46.5), 86),
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
