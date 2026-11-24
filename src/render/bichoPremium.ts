/**
 * Spec 023 (T13): os bichinhos da lojinha premium, que não existem no jogo e seguem a criança:
 * o unicórnio-pônei (o sonho da lojinha) e o pinguinzinho.
 *
 * Desempenho (meta da 012 com 4 amigos e 2 bichos): cada bicho é uma malha só com esqueleto
 * (as peças do mesmo material fundidas, cada vértice preso ao osso dele), mais a malha da luz
 * (o chifre). O unicórnio ainda tem o contorno claro de leve (lê de longe). No máximo 3
 * chamadas de desenho por bicho; a meta da spec é 6.
 *
 * Os ossos são nós comuns (`TransformNode`) ligados ao esqueleto: a animação (premiumMundo.ts)
 * gira os nós e a placa de vídeo dobra a malha. Tudo procedural, feito aqui, no traço de
 * brinquedo da 012 (plástico, olhos de bolinha com brilho, bochechas).
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Skeleton } from '@babylonjs/core/Bones/skeleton';
import { Bone } from '@babylonjs/core/Bones/bone';
import '@babylonjs/core/Rendering/outlineRenderer';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Scene } from '@babylonjs/core/scene';
import type { IdLuzPremium, Junta, Peca } from '../personagem/boneco';
import { dadosDaPeca } from './boneco';
import { criarPlasticos, type Plasticos } from './formas';
import { luzPremium } from './premiumLuzes';

type V3 = [number, number, number];

export type IdBichoPremium = 'unicornio' | 'pinguim';

export interface Osso {
  nome: string;
  pai: string | null;
  pos: V3;
}

/** Peça do bicho: a mesma peça do boneco, presa num osso (pelo nome, em `junta`). */
export type PecaBicho = Omit<Peca, 'junta'> & { osso: string };

export interface Desenho {
  ossos: Osso[];
  pecas: PecaBicho[];
  escala: number;
  /** Contorno claro de leve (o unicórnio: reconhecível a 12 blocos). */
  contorno?: string;
}

export interface BichoMontado {
  id: IdBichoPremium;
  raiz: TransformNode;
  /** Os nós dos ossos (a animação gira estes). */
  nos: Record<string, TransformNode>;
  /** Posição de repouso de cada nó (a animação soma em cima). */
  repouso: Record<string, V3>;
  malhas: Mesh[];
  definirLuz(f: number): void;
  descartar(): void;
}

/**
 * O degradê de sonho da crina e do rabo (t de 0 a 1): rosa-chiclete, rosa-claro, lilás e
 * lavanda. Só rosa e lilás (decisão do dono: nada de arco-íris nos premium).
 */
const CRINA = ['#ff4fae', '#ff7cc6', '#d98cff', '#a46bff'] as const;
function degradeCrina(t: number): string {
  const A = CRINA;
  const k = Math.max(0, Math.min(0.9999, t)) * (A.length - 1);
  const i = Math.floor(k);
  const f = k - i;
  const a = parseInt(A[i].slice(1), 16);
  const b = parseInt(A[i + 1].slice(1), 16);
  const c = [16, 8, 0].map((s) => Math.round(((a >> s) & 255) * (1 - f) + ((b >> s) & 255) * f));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * O quanto o ponto da crina está longe do pescoço (0 na borda de dentro, 1 na ponta das
 * mechas). A placa da crina gira um quarto de volta: o "para trás" do perfil vira o -z.
 */
const beiradaCrina = (y: number, z: number): number => (-z - (0.2 - (y + 0.08) * 0.34)) / 0.2;

/** A crina com o fio de cetim: o miolo no degradê e a beirada das mechas clarinha. */
function corDaMecha(t: number, beirada: number): string {
  const base = degradeCrina(t);
  const k = Math.max(0, Math.min(1, beirada)) * 0.42;
  const a = parseInt(base.slice(1), 16);
  const c = [16, 8, 0].map((s) => Math.round(((a >> s) & 255) * (1 - k) + 255 * k));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Contorno de mecha (no plano: u para trás, y para cima): a borda de dentro reta de `topo` a
 * `base`, a de fora em ondas (cada onda uma mecha), afinando nas pontas.
 */
function perfilMecha(
  dentro: Array<[number, number]>,
  largura: (t: number) => number,
  ondas: number,
): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  const n = 40;
  const ponto = (t: number): [number, number] => {
    const k = t * (dentro.length - 1);
    const i = Math.min(dentro.length - 2, Math.floor(k));
    const f = k - i;
    return [
      dentro[i][0] + (dentro[i + 1][0] - dentro[i][0]) * f,
      dentro[i][1] + (dentro[i + 1][1] - dentro[i][1]) * f,
    ];
  };
  // a borda de dentro só pelos pontos dados (pontos em linha travam a triangulação)
  for (const d of dentro) pts.push([d[0], d[1]]);
  for (let i = n; i >= 0; i--) {
    const t = i / n;
    const [u, y] = ponto(t);
    const onda = 0.55 + 0.45 * Math.abs(Math.sin(t * Math.PI * ondas));
    const w = Math.max(0.012, largura(t) * onda);
    pts.push([u + w, y - w * 0.25]);
  }
  // sem pontos repetidos (a placa triangula o contorno)
  return pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 1e-4);
}

// ---------------------------------------------------------------------------------- peças
export const caixa = (
  osso: string,
  nome: string,
  t: V3,
  pos: V3,
  cor: string,
  raio = 0.06,
  extra: Partial<PecaBicho> = {},
): PecaBicho => ({ osso, nome, forma: 'caixa', tamanho: t, raio, pos, cor, ...extra });
export const bola = (
  osso: string,
  nome: string,
  r: number,
  pos: V3,
  cor: string,
  esc: V3 = [1, 1, 1],
  extra: Partial<PecaBicho> = {},
): PecaBicho => ({
  osso,
  nome,
  forma: 'esfera',
  tamanho: [r * esc[0], r * esc[1], r * esc[2]],
  pos,
  cor,
  ...extra,
});
export const cone = (
  osso: string,
  nome: string,
  h: number,
  rb: number,
  rc: number,
  pos: V3,
  cor: string,
  extra: Partial<PecaBicho> = {},
): PecaBicho => ({ osso, nome, forma: 'cilindro', tamanho: [h, rb, rc], pos, cor, ...extra });

/** Olho de bichinho: a bolinha escura achatada, o brilho grande e o brilho pequeno. */
export function olho(osso: string, s: number, x: number, y: number, z: number, r: number): PecaBicho[] {
  return [
    bola(osso, `olho${s}`, r, [s * x, y, z], '#1d1430', [0.82, 1, 0.36], { brilho: 0.5 }),
    bola(osso, `olho-brilho${s}`, r * 0.3, [s * x + s * r * 0.2, y + r * 0.38, z + r * 0.3], '#ffffff', [1, 1, 0.45], { brilho: 0.2 }),
    bola(osso, `olho-brilho2${s}`, r * 0.14, [s * x - s * r * 0.24, y - r * 0.4, z + r * 0.32], '#ffffff', [1, 1, 0.45], { brilho: 0.2 }),
  ];
}

// --------------------------------------------------------------------------- unicórnio
/** O unicórnio-pônei: branco perolado, crina e rabo de rosa e lilás, chifre de luz. */
function desenhoUnicornio(): Desenho {
  const branco = '#fffbff';
  const sombra = '#f3e6ff';
  const rosa = '#ffd3e8';
  const focinho = '#ffeaf4';
  const ouro = '#ffb81f';
  const ossos: Osso[] = [
    { nome: 'corpo', pai: null, pos: [0, 0, 0] },
    { nome: 'pernaFE', pai: 'corpo', pos: [-0.13, 0.36, 0.2] },
    { nome: 'pernaFD', pai: 'corpo', pos: [0.13, 0.36, 0.2] },
    { nome: 'pernaTE', pai: 'corpo', pos: [-0.13, 0.36, -0.2] },
    { nome: 'pernaTD', pai: 'corpo', pos: [0.13, 0.36, -0.2] },
    { nome: 'pescoco', pai: 'corpo', pos: [0, 0.56, 0.22] },
    { nome: 'cabeca', pai: 'pescoco', pos: [0, 0.3, 0.1] },
    { nome: 'olhos', pai: 'cabeca', pos: [0, 0.04, 0.17] },
    { nome: 'orelhaE', pai: 'cabeca', pos: [-0.12, 0.19, -0.05] },
    { nome: 'orelhaD', pai: 'cabeca', pos: [0.12, 0.19, -0.05] },
    { nome: 'rabo1', pai: 'corpo', pos: [0, 0.56, -0.31] },
    { nome: 'rabo2', pai: 'rabo1', pos: [0, -0.08, -0.08] },
    { nome: 'rabo3', pai: 'rabo2', pos: [0, -0.1, -0.05] },
  ];
  const p: PecaBicho[] = [];
  // corpo redondinho com a barriga lilás clarinha
  p.push(caixa('corpo', 'tronco', [0.46, 0.4, 0.6], [0, 0.46, 0], branco, 0.19));
  p.push(caixa('corpo', 'barriga', [0.36, 0.08, 0.48], [0, 0.27, 0], sombra, 0.04));
  p.push(bola('corpo', 'peito', 0.2, [0, 0.5, 0.22], branco, [1.05, 1, 0.8]));
  p.push(bola('corpo', 'anca', 0.21, [0, 0.5, -0.2], branco, [1.08, 1, 0.85]));
  // pernas (pivô no alto) com o casco de ouro e a franjinha
  for (const n of ['pernaFE', 'pernaFD', 'pernaTE', 'pernaTD']) {
    p.push(caixa(n, 'perna', [0.13, 0.26, 0.13], [0, -0.14, 0], branco, 0.055));
    p.push(caixa(n, 'casco', [0.145, 0.075, 0.145], [0, -0.31, 0.005], ouro, 0.03, { brilho: 0.85 }));
    p.push(bola(n, 'franja', 0.06, [0, -0.255, 0], sombra, [1.25, 0.55, 1.25]));
  }
  // pescoço
  p.push(caixa('pescoco', 'pescoco', [0.22, 0.32, 0.22], [0, 0.11, 0.03], branco, 0.09, { rot: [0.35, 0, 0] }));
  // cabeça grande de bichinho, focinho rosado com narinas, bochechas
  p.push(caixa('cabeca', 'cabeca', [0.42, 0.38, 0.4], [0, 0, 0], branco, 0.17));
  p.push(caixa('cabeca', 'focinho', [0.3, 0.2, 0.2], [0, -0.095, 0.2], focinho, 0.1));
  for (const s of [-1, 1]) {
    p.push(bola('cabeca', `narina${s}`, 0.014, [s * 0.06, -0.065, 0.3], '#f0a0c0', [1.3, 0.8, 0.5]));
    p.push(bola('cabeca', `bochecha${s}`, 0.038, [s * 0.165, -0.035, 0.195], '#ff9cc4', [1, 0.62, 0.28], { brilho: 0 }));
    p.push(caixa('cabeca', `cilio${s}`, [0.04, 0.012, 0.012], [s * 0.185, 0.15, 0.2], '#2a1d3a', 0.005, { rot: [0, 0, s * 0.7] }));
    p.push(caixa('cabeca', `cilio2${s}`, [0.032, 0.011, 0.011], [s * 0.2, 0.125, 0.2], '#2a1d3a', 0.005, { rot: [0, 0, s * 1.15] }));
  }
  p.push(...olho('olhos', -1, 0.12, 0.035, 0.03, 0.08));
  p.push(...olho('olhos', 1, 0.12, 0.035, 0.03, 0.08));
  // boquinha sorrindo
  p.push(bola('cabeca', 'boca', 0.026, [0, -0.135, 0.297], '#d0607f', [1.6, 0.4, 0.35], { brilho: 0.1 }));
  // orelhas com o miolo rosa
  for (const [n, s] of [
    ['orelhaE', -1],
    ['orelhaD', 1],
  ] as const) {
    p.push(caixa(n, 'orelha', [0.075, 0.14, 0.05], [0, 0.05, 0], branco, 0.032, { rot: [0, 0, -s * 0.25] }));
    p.push(caixa(n, 'orelha-dentro', [0.04, 0.09, 0.02], [s * -0.008, 0.045, 0.022], rosa, 0.015, { rot: [0, 0, -s * 0.25] }));
  }
  // o chifre: o cone de luz (lê de longe) com a espiral de ouro em volta
  p.push(cone('cabeca', 'chifre', 0.4, 0.064, 0.008, [0, 0.35, 0.09], '#fff1a8', { rot: [0.35, 0, 0], luz: 'chifre' }));
  for (let i = 0; i < 4; i++) {
    const y = -0.13 + i * 0.075;
    const r = 0.058 - i * 0.013;
    // a espiral: o anel inclinado em volta do cone, subindo
    const dy = 0.35 + Math.cos(0.35) * y;
    const dz = 0.09 + Math.sin(0.35) * y;
    p.push({
      osso: 'cabeca',
      nome: `espiral${i}`,
      forma: 'anel',
      tamanho: [r * 2 + 0.014, 0.02, 0],
      pos: [0, dy, dz],
      rot: [0.35 + 0.3, 0, 0.25],
      cor: ouro,
      brilho: 0.85,
    });
  }
  // a crina: uma onda só pelo pescoço (o degradê corre do rosa-chiclete da testa ao lilás da
  // cernelha, a beirada das mechas clarinha), com o topete rosa e lilás caindo na testa
  const crina = perfilMecha(
    [
      [-0.02, 0.56],
      [0.07, 0.4],
      [0.12, 0.22],
      [0.16, 0.04],
      [0.2, -0.08],
    ],
    (t) => 0.08 + Math.sin(Math.min(1, t * 1.15) * Math.PI) * 0.13,
    4.5,
  );
  p.push({
    osso: 'pescoco',
    nome: 'crina',
    forma: 'placa',
    tamanho: [0.3, 0.6, 0.19],
    perfil: crina,
    pos: [0, 0, 0],
    rot: [0, Math.PI / 2, 0],
    cor: CRINA[0],
    pintar: (_x, y, z) => corDaMecha((0.58 - y) / 0.66, beiradaCrina(y, z)),
  });
  p.push(bola('cabeca', 'topete1', 0.042, [0.035, 0.2, 0.135], CRINA[0], [0.6, 1.5, 0.85], { rot: [1.15, 0, 0.35] }));
  p.push(bola('cabeca', 'topete2', 0.038, [-0.03, 0.2, 0.125], CRINA[2], [0.6, 1.5, 0.85], { rot: [1.2, 0, -0.3] }));
  // o rabo: três ondas de rosa e lilás (uma em cada osso, balançando em cadeia) com o miolo
  // cheio; começa no lilás da cernelha e volta ao rosa na ponta
  const raboPerfil = (comp: number, larg: number) =>
    perfilMecha(
      [
        [0, 0.02],
        [0.04, -comp * 0.5],
        [0.06, -comp],
      ],
      (t) => larg * (0.5 + Math.sin(t * Math.PI) * 0.6),
      2,
    ).map(([u, y]) => [u - larg * 0.4, y] as [number, number]);
  const pedacos: Array<[string, number, number, number, number]> = [
    // osso, comprimento, largura, cor do começo, cor do fim
    ['rabo1', 0.14, 0.12, 0, 0.33],
    ['rabo2', 0.16, 0.15, 0.33, 0.66],
    ['rabo3', 0.2, 0.15, 0.66, 1],
  ];
  for (const [n, comp, larg, c0, c1] of pedacos) {
    p.push({
      osso: n,
      nome: 'rabo',
      forma: 'placa',
      tamanho: [larg * 2, comp, 0.12],
      perfil: raboPerfil(comp, larg),
      pos: [0, 0, -0.02],
      rot: [0, Math.PI / 2, 0],
      cor: CRINA[3],
      pintar: (_x, y, z) =>
        corDaMecha(1 - (c0 + (c1 - c0) * Math.min(1, Math.max(0, -y / comp))), (-z - larg * 0.1) / (larg * 0.9)),
    });
    p.push(bola(n, 'miolo', larg * 0.5, [0, -comp * 0.45, -0.02], degradeCrina(1 - (c0 + c1) / 2), [0.95, 1.6, 0.95]));
  }
  return { ossos, pecas: p, escala: 1.4, contorno: '#fff6ff' };
}

// ----------------------------------------------------------------------------- pinguim
/**
 * O pinguinzinho: azul-real com o dorso mais escuro, a barriga creme, a cabeça grande de filhote
 * com o topetinho, o cachecol turquesa com a ponta voando e o floquinho de luz.
 */
function desenhoPinguim(): Desenho {
  const azul = '#2f5bc4';
  const azulFundo = '#1f3c8a';
  const branco = '#fdfcf6';
  const laranja = '#ffa53a';
  const cachecol = '#2fd0e8';
  const ossos: Osso[] = [
    { nome: 'corpo', pai: null, pos: [0, 0, 0] },
    { nome: 'tronco', pai: 'corpo', pos: [0, 0.06, 0] },
    { nome: 'cabeca', pai: 'tronco', pos: [0, 0.44, 0.0] },
    { nome: 'olhos', pai: 'cabeca', pos: [0, 0.135, 0.222] },
    { nome: 'asaE', pai: 'tronco', pos: [-0.225, 0.32, 0] },
    { nome: 'asaD', pai: 'tronco', pos: [0.225, 0.32, 0] },
    { nome: 'peE', pai: 'corpo', pos: [-0.085, 0.03, 0.05] },
    { nome: 'peD', pai: 'corpo', pos: [0.085, 0.03, 0.05] },
    { nome: 'ponta', pai: 'tronco', pos: [0.1, 0.4, 0.17] },
  ];
  const p: PecaBicho[] = [];
  const dorso = (cy: number, r: number) => (_x: number, y: number, z: number) =>
    z < -r * 0.2 ? azulFundo : y > cy + r * 0.7 ? '#3b6ad6' : azul;
  // corpo de ovo (o dorso mais escuro) com a barriga creme
  p.push(bola('tronco', 'corpo', 0.25, [0, 0.22, 0], azul, [1, 1.02, 0.94], { pintar: dorso(0.22, 0.25) }));
  p.push(bola('tronco', 'barriga', 0.2, [0, 0.2, 0.125], branco, [0.92, 1, 0.66]));
  p.push(bola('tronco', 'rabinho', 0.065, [0, 0.05, -0.22], azulFundo, [1.2, 0.5, 1]));
  // a cabeça grande (filhote), a máscara em coração, os olhos grandes, o bico e as bochechas
  p.push(bola('cabeca', 'cabeca', 0.245, [0, 0.12, 0], azul, [1, 0.96, 1], { pintar: dorso(0.12, 0.245) }));
  for (const s of [-1, 1])
    p.push(bola('cabeca', `mascara${s}`, 0.125, [s * 0.072, 0.105, 0.168], branco, [1, 1.12, 0.74]));
  p.push(...olho('olhos', -1, 0.078, 0, 0.035, 0.058));
  p.push(...olho('olhos', 1, 0.078, 0, 0.035, 0.058));
  p.push(cone('cabeca', 'bico', 0.1, 0.05, 0.006, [0, 0.06, 0.29], laranja, { rot: [Math.PI / 2 + 0.15, 0, 0], brilho: 0.5 }));
  for (const s of [-1, 1])
    p.push(bola('cabeca', `bochecha${s}`, 0.042, [s * 0.13, 0.05, 0.215], '#ff9cc4', [1, 0.62, 0.3], { brilho: 0 }));
  // o topetinho de penas (três penas curvas no alto da cabeça)
  for (let i = -1; i <= 1; i++)
    p.push(bola('cabeca', `topete${i}`, 0.04, [i * 0.035, 0.37 - Math.abs(i) * 0.02, 0.02], azulFundo, [0.55, 1.5, 0.8], { rot: [-0.35, 0, -i * 0.5] }));
  // o cachecol turquesa com as listras brancas, a ponta voando e o floquinho de luz
  p.push({ osso: 'tronco', nome: 'cachecol', forma: 'anel', tamanho: [0.39, 0.085, 0], pos: [0, 0.41, 0.005], cor: cachecol, brilho: 0.4 });
  p.push({ osso: 'tronco', nome: 'cachecol-listra', forma: 'anel', tamanho: [0.4, 0.024, 0], pos: [0, 0.415, 0.005], cor: branco });
  p.push(caixa('ponta', 'ponta', [0.075, 0.19, 0.04], [0, -0.09, 0], cachecol, 0.022, { rot: [0.15, 0, 0.12] }));
  for (const [i, y] of [
    [0, -0.12],
    [1, -0.06],
  ] as const)
    p.push(caixa('ponta', `ponta-listra${i}`, [0.079, 0.022, 0.044], [0.0, y, 0], branco, 0.008, { rot: [0.15, 0, 0.12] }));
  p.push(bola('ponta', 'ponta-franja', 0.03, [0.02, -0.19, 0], branco, [1.4, 0.6, 0.9]));
  for (let i = 0; i < 3; i++)
    p.push(caixa('tronco', `floco${i}`, [0.085, 0.016, 0.014], [-0.095, 0.41, 0.215], '#e8fbff', 0.006, { rot: [0.25, 0, (i * Math.PI) / 3], luz: 'perola' }));
  // asinhas (pivô no ombro) e os pezinhos de pato
  for (const [n, s] of [
    ['asaE', -1],
    ['asaD', 1],
  ] as const)
    p.push(bola(n, 'asa', 0.115, [s * 0.02, -0.11, 0], azul, [0.3, 1, 0.62], { rot: [0, 0, s * 0.18], pintar: () => azulFundo }));
  for (const n of ['peE', 'peD'])
    p.push(bola(n, 'pe', 0.075, [0, 0, 0.04], laranja, [0.95, 0.38, 1.3], { brilho: 0.4 }));
  return { ossos, pecas: p, escala: 1.25, contorno: '#eaf6ff' };
}

// ------------------------------------------------------------------------- montagem
const DESENHOS: Record<IdBichoPremium, () => Desenho> = {
  unicornio: desenhoUnicornio,
  pinguim: desenhoPinguim,
};

/**
 * Spec 036: o bichinho que segue a criança pelo chão (o pinguim e o unicórnio). O passarinho de
 * ombro também é `bicho`, mas mora no boneco, e o id que este aparelho não conhece não monta.
 */
export const ehBichoQueSegue = (id: unknown): id is IdBichoPremium =>
  typeof id === 'string' && Object.hasOwn(DESENHOS, id);

/** As peças do bicho (testes: toda placa triangula inteira). */
export function pecasDoBicho(id: IdBichoPremium): Array<Omit<Peca, 'junta'> & { osso: string }> {
  return DESENHOS[id]().pecas;
}

/** Monta o bicho: os nós, o esqueleto e as malhas fundidas por material. */
export function montarBichoPremium(scene: Scene, id: IdBichoPremium): BichoMontado {
  return { ...montarDesenhoBicho(scene, DESENHOS[id](), `premium-${id}`), id };
}

/**
 * Monta um desenho de bicho qualquer (os da lojinha e, na spec 036, os candidatos novos do
 * esboço): os nós, o esqueleto e as malhas fundidas por material.
 */
export function montarDesenhoBicho(
  scene: Scene,
  d: Desenho,
  prefixo: string,
): Omit<BichoMontado, 'id'> {
  const mats: Plasticos = criarPlasticos(scene, prefixo);
  const raiz = new TransformNode(prefixo, scene);
  const escala = new TransformNode(`${prefixo}-escala`, scene);
  escala.parent = raiz;
  escala.scaling.setAll(d.escala);
  const esqueleto = new Skeleton(`${prefixo}-esqueleto`, `${prefixo}-esqueleto`, scene);
  const nos: Record<string, TransformNode> = {};
  const repouso: Record<string, V3> = {};
  const ossos: Record<string, Bone> = {};
  const indice: Record<string, number> = {};
  const absoluta: Record<string, Matrix> = {};
  d.ossos.forEach((o, i) => {
    const no = new TransformNode(`${prefixo}-osso-${o.nome}`, scene);
    no.parent = o.pai ? nos[o.pai] : escala;
    no.position.set(o.pos[0], o.pos[1], o.pos[2]);
    nos[o.nome] = no;
    repouso[o.nome] = [...o.pos];
    const local = Matrix.Translation(o.pos[0], o.pos[1], o.pos[2]);
    const osso = new Bone(o.nome, esqueleto, o.pai ? ossos[o.pai] : null, local);
    osso.linkTransformNode(no);
    ossos[o.nome] = osso;
    indice[o.nome] = i;
    absoluta[o.nome] = o.pai ? local.multiply(absoluta[o.pai]) : local;
  });
  // as peças do mesmo material juntas, cada vértice preso ao osso da peça
  const grupos = new Map<StandardMaterial, { dados: VertexData[] }>();
  for (const pc of d.pecas) {
    // dois plásticos só (o fosco e o brilhante: olhos e ouro) e a luz: poucas chamadas
    const material = pc.luz
      ? luzPremium(scene, pc.luz as IdLuzPremium)
      : mats.corVertice((pc.brilho ?? 0.3) >= 0.6 ? 0.75 : 0.3)!;
    const peca = { ...pc, junta: 'corpo' as Junta } as Peca;
    const vd = dadosDaPeca(peca, undefined, !pc.luz);
    vd.transform(absoluta[pc.osso]);
    const n = vd.positions!.length / 3;
    const idx = new Float32Array(n * 4);
    const pes = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      idx[i * 4] = indice[pc.osso];
      pes[i * 4] = 1;
    }
    vd.matricesIndices = idx;
    vd.matricesWeights = pes;
    if (pc.luz) vd.colors = null;
    let g = grupos.get(material);
    if (!g) grupos.set(material, (g = { dados: [] }));
    g.dados.push(vd);
  }
  const malhas: Mesh[] = [];
  for (const [material, g] of grupos) {
    const vd = g.dados.length === 1 ? g.dados[0] : g.dados[0].merge(g.dados.slice(1), true);
    const m = new Mesh(`${prefixo}-malha`, scene);
    vd.applyToMesh(m);
    m.material = material;
    m.skeleton = esqueleto;
    m.numBoneInfluencers = 1;
    m.parent = escala;
    m.isPickable = false;
    m.receiveShadows = false;
    m.hasVertexAlpha = false;
    // o bicho anda pelo mundo: a caixa dele é a do corpo inteiro, sem recalcular
    m.alwaysSelectAsActiveMesh = true;
    if (d.contorno && material === mats.corVertice(0.3)) {
      m.renderOutline = true;
      m.outlineColor = Color3.FromHexString(d.contorno);
      m.outlineWidth = 0.012;
      // o contorno some de muito longe (premiumMundo): marca quem tem
      m.metadata = { ...(m.metadata ?? {}), contorno: true };
    }
    malhas.push(m);
  }
  return {
    raiz,
    nos,
    repouso,
    malhas,
    definirLuz: (f) => mats.definirLuz(f),
    descartar() {
      for (const m of malhas) m.dispose();
      esqueleto.dispose();
      raiz.dispose(false, false);
      mats.descartar();
    },
  };
}

/** Para os testes: quantas chamadas de desenho o bicho custa (malhas mais o contorno). */
export function chamadasDoBicho(b: BichoMontado): number {
  return b.malhas.reduce((s, m) => s + 1 + (m.renderOutline ? 1 : 0), 0);
}
