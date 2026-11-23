/**
 * Esboço da spec 036 (Lojinha maior): os quatro bichinhos candidatos, no mesmo traço dos da
 * lojinha (`render/bichoPremium.ts`: peças do boneco presas em ossos, uma malha só com
 * esqueleto por material, olhos de bolinha com brilho e bochechas) e montados pelo mesmo
 * `montarDesenhoBicho`. O jeito de seguir é o de `render/premiumMundo.ts` (o lugar atrás e ao
 * lado da criança, a rapidez, virar para onde anda e, parado, olhar para ela).
 *
 * Diferente do unicórnio (o que o dono não gostou): sem contorno claro em volta, sem brilho
 * aceso, e o chão é seguido sem degrau (nada de tremer).
 */
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import {
  bola,
  caixa,
  cone,
  montarDesenhoBicho,
  olho,
  type BichoMontado,
  type Desenho,
  type Osso,
  type PecaBicho,
} from '../render/bichoPremium';
import { perfilFolha } from '../personagem/bonecoFantasia';

export type IdBichoEsboco = 'cachorro' | 'coelho' | 'tartaruga' | 'passarinho';

// ------------------------------------------------------------------ cachorrinho
function desenhoCachorro(): Desenho {
  const CARAMELO = '#eaa95e';
  const CREME = '#fff2dc';
  const MARROM = '#a8643a';
  const TURQUESA = '#2fc7d8';
  const ossos: Osso[] = [
    { nome: 'corpo', pai: null, pos: [0, 0, 0] },
    { nome: 'pernaFE', pai: 'corpo', pos: [-0.1, 0.2, 0.14] },
    { nome: 'pernaFD', pai: 'corpo', pos: [0.1, 0.2, 0.14] },
    { nome: 'pernaTE', pai: 'corpo', pos: [-0.1, 0.2, -0.14] },
    { nome: 'pernaTD', pai: 'corpo', pos: [0.1, 0.2, -0.14] },
    { nome: 'cabeca', pai: 'corpo', pos: [0, 0.56, 0.24] },
    { nome: 'olhos', pai: 'cabeca', pos: [0, 0.035, 0.16] },
    { nome: 'orelhaE', pai: 'cabeca', pos: [-0.17, 0.1, -0.01] },
    { nome: 'orelhaD', pai: 'cabeca', pos: [0.17, 0.1, -0.01] },
    { nome: 'rabo', pai: 'corpo', pos: [0, 0.38, -0.22] },
  ];
  const p: PecaBicho[] = [];
  p.push(caixa('corpo', 'tronco', [0.3, 0.26, 0.44], [0, 0.32, 0], CARAMELO, 0.12));
  p.push(caixa('corpo', 'barriga', [0.22, 0.06, 0.34], [0, 0.2, 0], CREME, 0.03));
  p.push(bola('corpo', 'peito', 0.13, [0, 0.33, 0.17], CREME, [1, 1, 0.7]));
  // o pescoço curtinho (a cabeça fica por cima do peito, sem esconder o corpo)
  p.push(caixa('corpo', 'pescoco', [0.2, 0.16, 0.16], [0, 0.45, 0.18], CARAMELO, 0.07));
  p.push(bola('corpo', 'mancha', 0.12, [0.06, 0.445, -0.07], MARROM, [1.1, 0.32, 1.2]));
  // a coleira turquesa com a plaquinha de ouro
  p.push({ osso: 'corpo', nome: 'coleira', forma: 'anel', tamanho: [0.23, 0.045, 0], pos: [0, 0.45, 0.19], rot: [-0.3, 0, 0], cor: TURQUESA, brilho: 0.4 });
  p.push(cone('corpo', 'plaquinha', 0.02, 0.032, 0.032, [0, 0.4, 0.3], '#ffc93d', { rot: [Math.PI / 2 - 0.3, 0, 0], brilho: 0.85 }));
  for (const n of ['pernaFE', 'pernaFD', 'pernaTE', 'pernaTD']) {
    p.push(caixa(n, 'perna', [0.1, 0.18, 0.1], [0, -0.09, 0], CARAMELO, 0.045));
    p.push(bola(n, 'patinha', 0.06, [0, -0.18, 0.015], CREME, [1, 0.6, 1.25]));
  }
  // a cabeça grande de filhote, o focinho creme, o nariz, a linguinha e as bochechas
  p.push(caixa('cabeca', 'cabeca', [0.37, 0.33, 0.32], [0, 0, 0], CARAMELO, 0.145));
  p.push(caixa('cabeca', 'focinho', [0.2, 0.13, 0.14], [0, -0.075, 0.17], CREME, 0.06));
  p.push(bola('cabeca', 'nariz', 0.036, [0, -0.03, 0.245], '#2a1d26', [1.3, 0.9, 0.8], { brilho: 0.7 }));
  p.push(bola('cabeca', 'lingua', 0.032, [0, -0.135, 0.215], '#ff8fa8', [1, 0.55, 0.7]));
  for (const s of [-1, 1])
    p.push(bola('cabeca', `bochecha${s}`, 0.032, [s * 0.135, -0.065, 0.15], '#ff9cc4', [1, 0.62, 0.3], { brilho: 0 }));
  p.push(...olho('olhos', -1, 0.085, 0, 0, 0.05));
  p.push(...olho('olhos', 1, 0.085, 0, 0, 0.05));
  // as orelhas caídas, marrons
  for (const [n, s] of [
    ['orelhaE', -1],
    ['orelhaD', 1],
  ] as const)
    p.push(caixa(n, 'orelha', [0.08, 0.21, 0.11], [s * 0.01, -0.09, 0], MARROM, 0.04, { rot: [0, 0, s * 0.18] }));
  // o rabinho para cima, com a pontinha creme
  p.push(bola('rabo', 'rabo', 0.05, [0, 0.07, -0.025], CARAMELO, [0.8, 1.8, 0.8], { rot: [-0.55, 0, 0] }));
  p.push(bola('rabo', 'rabo-ponta', 0.042, [0, 0.15, -0.075], CREME));
  return { ossos, pecas: p, escala: 1.15 };
}

// ------------------------------------------------------------------ coelhinho
function desenhoCoelho(): Desenho {
  const BRANCO = '#fbf7f2';
  const CREME = '#fff0e0';
  const ROSA = '#ffb3c9';
  const ROSA_FORTE = '#ff7aa5';
  const ossos: Osso[] = [
    { nome: 'corpo', pai: null, pos: [0, 0, 0] },
    { nome: 'tronco', pai: 'corpo', pos: [0, 0, 0] },
    { nome: 'cabeca', pai: 'tronco', pos: [0, 0.42, 0.08] },
    { nome: 'olhos', pai: 'cabeca', pos: [0, 0.02, 0.16] },
    { nome: 'nariz', pai: 'cabeca', pos: [0, -0.035, 0.2] },
    { nome: 'orelhaE', pai: 'cabeca', pos: [-0.075, 0.15, -0.02] },
    { nome: 'orelhaD', pai: 'cabeca', pos: [0.075, 0.15, -0.02] },
    { nome: 'orelhaE2', pai: 'orelhaE', pos: [0, 0.17, 0] },
    { nome: 'orelhaD2', pai: 'orelhaD', pos: [0, 0.17, 0] },
    { nome: 'peE', pai: 'corpo', pos: [-0.09, 0.04, 0.02] },
    { nome: 'peD', pai: 'corpo', pos: [0.09, 0.04, 0.02] },
    { nome: 'maoE', pai: 'tronco', pos: [-0.08, 0.17, 0.15] },
    { nome: 'maoD', pai: 'tronco', pos: [0.08, 0.17, 0.15] },
    { nome: 'rabinho', pai: 'tronco', pos: [0, 0.17, -0.21] },
  ];
  const p: PecaBicho[] = [];
  p.push(bola('tronco', 'corpo', 0.21, [0, 0.22, 0], BRANCO, [1, 1.02, 1.06]));
  p.push(bola('tronco', 'barriga', 0.15, [0, 0.2, 0.095], CREME, [1, 1.1, 0.6]));
  p.push(bola('cabeca', 'cabeca', 0.19, [0, 0, 0], BRANCO, [1.1, 0.95, 1]));
  for (const s of [-1, 1]) {
    p.push(bola('cabeca', `fofo${s}`, 0.09, [s * 0.1, -0.065, 0.1], BRANCO, [1, 0.9, 0.9]));
    p.push(bola('cabeca', `bochecha${s}`, 0.03, [s * 0.13, -0.04, 0.15], '#ff9cc4', [1, 0.62, 0.3], { brilho: 0 }));
  }
  p.push(...olho('olhos', -1, 0.085, 0.01, 0, 0.048));
  p.push(...olho('olhos', 1, 0.085, 0.01, 0, 0.048));
  p.push(bola('nariz', 'nariz', 0.026, [0, 0, 0], ROSA_FORTE, [1.3, 0.9, 0.8], { brilho: 0.5 }));
  p.push(bola('cabeca', 'boquinha', 0.014, [0, -0.085, 0.185], '#c45a7f', [1.6, 0.6, 0.5]));
  // as orelhas compridas em dois gomos, com o miolo rosa
  for (const [n, n2, s] of [
    ['orelhaE', 'orelhaE2', -1],
    ['orelhaD', 'orelhaD2', 1],
  ] as const) {
    p.push(caixa(n, 'orelha', [0.085, 0.19, 0.05], [0, 0.08, 0], BRANCO, 0.038, { rot: [0, 0, s * 0.08] }));
    p.push(caixa(n, 'orelha-dentro', [0.045, 0.14, 0.02], [0, 0.08, 0.022], ROSA, 0.018, { rot: [0, 0, s * 0.08] }));
    p.push(caixa(n2, 'orelha2', [0.085, 0.15, 0.05], [0, 0.065, 0], BRANCO, 0.038));
    p.push(caixa(n2, 'orelha2-dentro', [0.045, 0.1, 0.02], [0, 0.06, 0.022], ROSA, 0.018));
  }
  for (const n of ['peE', 'peD']) p.push(bola(n, 'pe', 0.07, [0, 0, 0.045], BRANCO, [0.9, 0.55, 1.5]));
  for (const n of ['maoE', 'maoD']) p.push(bola(n, 'mao', 0.045, [0, 0, 0], BRANCO, [1, 1.1, 1]));
  p.push(bola('rabinho', 'rabinho', 0.075, [0, 0, 0], '#ffffff'));
  return { ossos, pecas: p, escala: 1.15 };
}

// ------------------------------------------------------------------ tartaruguinha
function desenhoTartaruga(): Desenho {
  // (o casco verde-azulado com a borda âmbar: não some no gramado)
  const VERDE = '#2a9a86';
  const VERDE_CLARO = '#8fe3c6';
  const AMARELO = '#f0b443';
  const PELE = '#a8e07c';
  const CREME = '#fff1bf';
  const ossos: Osso[] = [
    { nome: 'corpo', pai: null, pos: [0, 0, 0] },
    { nome: 'casco', pai: 'corpo', pos: [0, 0.17, 0] },
    { nome: 'cabeca', pai: 'corpo', pos: [0, 0.21, 0.26] },
    { nome: 'olhos', pai: 'cabeca', pos: [0, 0.07, 0.15] },
    // (as patinhas um tico para fora do casco: aparecem de frente e de lado)
    { nome: 'pernaFE', pai: 'corpo', pos: [-0.2, 0.07, 0.17] },
    { nome: 'pernaFD', pai: 'corpo', pos: [0.2, 0.07, 0.17] },
    { nome: 'pernaTE', pai: 'corpo', pos: [-0.2, 0.07, -0.15] },
    { nome: 'pernaTD', pai: 'corpo', pos: [0.2, 0.07, -0.15] },
    { nome: 'rabo', pai: 'corpo', pos: [0, 0.1, -0.26] },
  ];
  const p: PecaBicho[] = [];
  // o casco alto de gomos: a cúpula verde, as placas claras em volta da do meio e a borda
  p.push(bola('casco', 'casco', 0.26, [0, 0.02, 0], VERDE, [1, 0.8, 1.1], { brilho: 0.45 }));
  p.push(bola('casco', 'placa-meio', 0.1, [0, 0.205, 0], VERDE_CLARO, [1, 0.36, 1.05]));
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
    p.push(bola('casco', `placa${k}`, 0.078, [Math.sin(a) * 0.155, 0.15, Math.cos(a) * 0.17], VERDE_CLARO, [1, 0.42, 1], {
      rot: [Math.cos(a) * 0.65, 0, -Math.sin(a) * 0.65],
    }));
  }
  p.push({ osso: 'casco', nome: 'borda', forma: 'anel', tamanho: [0.5, 0.06, 0], pos: [0, -0.03, 0], cor: AMARELO, brilho: 0.4 });
  p.push(bola('casco', 'barriga', 0.235, [0, -0.07, 0], CREME, [1, 0.3, 1.1]));
  // uma florzinha no alto do casco (o detalhe só dela)
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    p.push(bola('casco', `petala${k}`, 0.026, [Math.cos(a) * 0.032, 0.24, Math.sin(a) * 0.032], '#ff9fd2', [1, 0.5, 1]));
  }
  p.push(bola('casco', 'miolo', 0.019, [0, 0.25, 0], '#ffd23a', [1, 0.6, 1]));
  // a cabeça redonda com os olhos grandes, o sorriso e as bochechas
  p.push(bola('cabeca', 'pescoco', 0.07, [0, -0.02, -0.06], PELE, [1, 0.9, 1.3]));
  p.push(bola('cabeca', 'cabeca', 0.115, [0, 0.03, 0.04], PELE, [1.05, 0.95, 1.1]));
  p.push(...olho('olhos', -1, 0.052, 0, 0.0, 0.034));
  p.push(...olho('olhos', 1, 0.052, 0, 0.0, 0.034));
  p.push(bola('cabeca', 'sorriso', 0.016, [0, -0.02, 0.155], '#2f7a48', [2, 0.5, 0.5]));
  for (const s of [-1, 1])
    p.push(bola('cabeca', `bochecha${s}`, 0.022, [s * 0.075, 0.0, 0.148], '#ff9cc4', [1, 0.62, 0.3], { brilho: 0 }));
  for (const n of ['pernaFE', 'pernaFD', 'pernaTE', 'pernaTD'])
    p.push(bola(n, 'pata', 0.075, [0, -0.03, 0], PELE, [1, 0.75, 1.25]));
  p.push(cone('rabo', 'rabo', 0.08, 0.035, 0.006, [0, 0, -0.03], PELE, { rot: [-Math.PI / 2, 0, 0] }));
  return { ossos, pecas: p, escala: 1.55 };
}

// ------------------------------------------------------------------ passarinho
function desenhoPassarinho(): Desenho {
  const AZUL = '#5cb8ff';
  const AZUL_ESC = '#3a86e0';
  const CREME = '#fff6e0';
  const LARANJA = '#ffa53a';
  const ossos: Osso[] = [
    { nome: 'corpo', pai: null, pos: [0, 0, 0] },
    { nome: 'cabeca', pai: 'corpo', pos: [0, 0.25, 0.03] },
    { nome: 'olhos', pai: 'cabeca', pos: [0, 0.02, 0.105] },
    { nome: 'asaE', pai: 'corpo', pos: [-0.13, 0.17, -0.01] },
    { nome: 'asaD', pai: 'corpo', pos: [0.13, 0.17, -0.01] },
    { nome: 'rabo', pai: 'corpo', pos: [0, 0.1, -0.13] },
  ];
  const p: PecaBicho[] = [];
  p.push(bola('corpo', 'corpo', 0.155, [0, 0.14, 0], AZUL, [1, 1.05, 1.1]));
  p.push(bola('corpo', 'barriga', 0.115, [0, 0.12, 0.065], CREME, [1, 1.1, 0.7]));
  p.push(bola('cabeca', 'cabeca', 0.13, [0, 0, 0], AZUL));
  p.push(...olho('olhos', -1, 0.055, 0, 0, 0.034));
  p.push(...olho('olhos', 1, 0.055, 0, 0, 0.034));
  p.push(cone('cabeca', 'bico', 0.065, 0.034, 0.004, [0, -0.025, 0.135], LARANJA, { rot: [Math.PI / 2, 0, 0], brilho: 0.5 }));
  for (const s of [-1, 1])
    p.push(bola('cabeca', `bochecha${s}`, 0.025, [s * 0.08, -0.03, 0.095], '#ff9cc4', [1, 0.62, 0.3], { brilho: 0 }));
  // o topetinho de duas penas
  p.push({ osso: 'cabeca', nome: 'pena1', forma: 'placa', tamanho: [0.05, 0.1, 0.014], perfil: perfilFolha(0.1), pos: [0.01, 0.15, -0.01], rot: [-0.3, 0, -0.35], cor: AZUL_ESC });
  p.push({ osso: 'cabeca', nome: 'pena2', forma: 'placa', tamanho: [0.04, 0.08, 0.014], perfil: perfilFolha(0.08), pos: [-0.025, 0.14, -0.02], rot: [-0.3, 0, 0.35], cor: AZUL_ESC });
  for (const [n, s] of [
    ['asaE', -1],
    ['asaD', 1],
  ] as const)
    p.push(bola(n, 'asa', 0.1, [s * 0.015, -0.05, -0.02], AZUL_ESC, [0.32, 0.75, 1.1]));
  p.push(bola('rabo', 'rabo', 0.08, [0, 0, -0.05], AZUL_ESC, [0.75, 0.25, 1.4], { rot: [0.45, 0, 0] }));
  for (const s of [-1, 1]) p.push(bola('corpo', `pe${s}`, 0.022, [s * 0.05, 0.0, 0.03], LARANJA, [1, 0.5, 1.6]));
  return { ossos, pecas: p, escala: 0.72 };
}

const DESENHOS: Record<IdBichoEsboco, () => Desenho> = {
  cachorro: desenhoCachorro,
  coelho: desenhoCoelho,
  tartaruga: desenhoTartaruga,
  passarinho: desenhoPassarinho,
};

// ------------------------------------------------------------------ seguir e animar
/** O jeito de seguir de cada um (como o unicórnio e o pinguim em `premiumMundo.ts`). */
const SEGUE: Record<Exclude<IdBichoEsboco, 'passarinho'>, { atras: number; lado: number; rapidez: number }> = {
  cachorro: { atras: 1.1, lado: 0.85, rapidez: 6.5 },
  coelho: { atras: 1.0, lado: 0.8, rapidez: 5.5 },
  // a tartaruguinha anda no passo dela (a criança a pé chega a ~4,3 blocos por segundo: ela
  // fica um tico para trás e alcança quando a criança para)
  tartaruga: { atras: 0.95, lado: 0.75, rapidez: 3.4 },
};

export interface BichoEsboco {
  id: IdBichoEsboco;
  b: Omit<BichoMontado, 'id'>;
  x: number;
  y: number;
  z: number;
  yaw: number;
  fase: number;
  t: number;
  /** Quanto tempo está parado (s) e o quanto está sentado ou cochilando (0..1, suavizado). */
  parado: number;
  quieto: number;
  /** Passarinho: a próxima batida de asas (s) e quanto falta da batida. */
  proxima: number;
  batendo: number;
  /** Coelho: a altura do pulinho de agora. */
  pulo: number;
  /** Pisca de vez em quando (nas fotos paradas, não: nada de foto de olho fechado). */
  piscar: boolean;
}

/** O piscar de olhos: fechado por um instante a cada `periodo` segundos. */
const piscando = (b: BichoEsboco, periodo: number) => b.piscar && b.t % periodo < 0.12;

/** Monta o bichinho (as malhas levam o prefixo do boneco do esboço: ficam fora do brilho). */
export function montarBicho(scene: Scene, id: IdBichoEsboco): BichoEsboco {
  const b = montarDesenhoBicho(scene, DESENHOS[id](), `personagem-esboco-bicho-${id}`);
  return { id, b, x: 0, y: 0, z: 0, yaw: 0, fase: 0, t: 0, parado: 0, quieto: 0, proxima: 1.2, batendo: 0, pulo: 0, piscar: true };
}

/** O passarinho no ombro: preso no nó do tronco do boneco, por fora da quina da cabeça. */
export function pousarNoOmbro(bicho: BichoEsboco, tronco: TransformNode, lado: -1 | 1, troncoH: number): void {
  const r = bicho.b.raiz;
  r.parent = tronco;
  r.position.set(lado * 0.4, troncoH - 0.015, 0.04);
  r.rotation.set(0, lado * 0.25, 0);
}

/** Põe o bicho num lugar, virado para `yaw` (a foto parada). */
export function colocarBicho(bicho: BichoEsboco, x: number, y: number, z: number, yaw: number): void {
  bicho.x = x;
  bicho.y = y;
  bicho.z = z;
  bicho.yaw = yaw;
  bicho.b.raiz.position.set(x, y, z);
  bicho.b.raiz.rotation.y = yaw;
}

export interface Crianca {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

/** Um passo de seguir a criança (o chão do palco é plano, na altura `chao`). */
export function seguirCrianca(bicho: BichoEsboco, c: Crianca, chao: number, dt: number): void {
  if (bicho.id === 'passarinho') {
    animar(bicho, dt, false, 0, c);
    return;
  }
  const s = SEGUE[bicho.id];
  const lx = c.x - Math.sin(c.yaw) * s.atras + Math.cos(c.yaw) * s.lado;
  const lz = c.z - Math.cos(c.yaw) * s.atras - Math.sin(c.yaw) * s.lado;
  const ddx = lx - bicho.x;
  const ddz = lz - bicho.z;
  const dist = Math.hypot(ddx, ddz);
  const quer = dist > 0.4 ? Math.min(s.rapidez, dist * 2.2) : 0;
  const vx = dist > 0.01 ? (ddx / dist) * quer : 0;
  const vz = dist > 0.01 ? (ddz / dist) * quer : 0;
  bicho.x += vx * dt;
  bicho.z += vz * dt;
  const andando = quer > 0.35;
  const alvoYaw = andando ? Math.atan2(vx, vz) : Math.atan2(c.x - bicho.x, c.z - bicho.z);
  let d = alvoYaw - bicho.yaw;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  bicho.yaw += d * Math.min(1, dt * 6);
  bicho.y = chao;
  bicho.b.raiz.position.set(bicho.x, bicho.y, bicho.z);
  bicho.b.raiz.rotation.y = bicho.yaw;
  animar(bicho, dt, andando, quer, c);
}

const suave = (x: number) => x * x * (3 - 2 * x);

/** A graça de cada um (andando ou parado), nos ossos. */
export function animar(bicho: BichoEsboco, dt: number, andando: boolean, quer: number, c?: Crianca): void {
  const n = bicho.b.nos;
  bicho.t += dt;
  const t = bicho.t;
  bicho.parado = andando ? 0 : bicho.parado + dt;
  // sentar ou cochilar depois de um tempinho parado, levantar na hora de andar
  // (a tartaruguinha só cochila depois de um bom tempo parada)
  const quieto = bicho.parado > (bicho.id === 'tartaruga' ? 4 : 0.7) ? 1 : 0;
  bicho.quieto += (quieto - bicho.quieto) * Math.min(1, dt * (quieto ? 3 : 10));
  const q = suave(Math.max(0, Math.min(1, bicho.quieto)));
  if (bicho.id === 'cachorro') {
    bicho.fase += dt * (andando ? 2.1 + quer * 0.5 : 0);
    const ciclo = bicho.fase * Math.PI * 2;
    const passo = andando ? Math.sin(ciclo) : 0;
    n.pernaFE.rotation.x = passo * 0.75 + q * 0.25;
    n.pernaTD.rotation.x = passo * 0.75 - q * 1.25;
    n.pernaFD.rotation.x = -passo * 0.75 + q * 0.25;
    n.pernaTE.rotation.x = -passo * 0.75 - q * 1.25;
    // sentado: a frente sobe e o bumbum desce (o corpo gira para trás em volta das patas de trás)
    n.corpo.rotation.x = -q * 0.42;
    n.corpo.position.y = (andando ? Math.abs(Math.sin(ciclo)) * 0.05 : 0) - q * 0.02;
    n.corpo.position.z = -q * 0.06;
    n.cabeca.rotation.x = q * 0.42 + (andando ? Math.sin(ciclo * 2) * 0.06 : Math.sin(t * 1.1) * 0.04);
    n.cabeca.rotation.z = andando ? 0 : Math.sin(t * 0.8) * 0.14;
    // o rabo abana sem parar (mais depressa andando), as orelhas balançam com o trote
    n.rabo.rotation.y = Math.sin(t * (andando ? 16 : 11)) * 0.55;
    n.rabo.rotation.x = 0.2;
    n.orelhaE.rotation.z = (andando ? Math.sin(ciclo * 2) * 0.2 : 0) - 0.05;
    n.orelhaD.rotation.z = (andando ? -Math.sin(ciclo * 2) * 0.2 : 0) + 0.05;
    n.olhos.scaling.y = piscando(bicho, 3.1) ? 0.12 : 1;
  } else if (bicho.id === 'coelho') {
    // aos pulinhos: cada pulo é uma parábola; no ar as orelhas vão para trás e os pés esticam
    bicho.fase += dt * (andando ? 2.4 + quer * 0.2 : 0);
    const f = bicho.fase % 1;
    const alto = andando ? 4 * f * (1 - f) * 0.2 : 0;
    bicho.pulo = alto;
    n.corpo.position.y = alto;
    const noAr = andando ? Math.sin(f * Math.PI) : 0;
    n.tronco.rotation.x = andando ? (f - 0.5) * 0.5 : 0;
    const esmaga = andando && f < 0.12 ? 1 - (0.12 - f) * 1.2 : 1 + Math.sin(t * 2.4) * 0.015;
    n.tronco.scaling.set(1 / Math.sqrt(esmaga), esmaga, 1 / Math.sqrt(esmaga));
    n.peE.rotation.x = noAr * 0.7;
    n.peD.rotation.x = noAr * 0.7;
    n.orelhaE.rotation.x = -noAr * 0.5 + Math.sin(t * 1.7) * 0.05;
    n.orelhaD.rotation.x = -noAr * 0.5 + Math.sin(t * 1.7 + 1) * 0.05;
    n.orelhaE2.rotation.x = -noAr * 0.4 + (andando ? 0 : Math.max(0, Math.sin(t * 0.9) - 0.6) * 1.6);
    n.orelhaD2.rotation.x = -noAr * 0.4;
    n.orelhaE.rotation.z = -0.12;
    n.orelhaD.rotation.z = 0.12;
    // parado, o nariz mexe (fungando) e a cabeça olha em volta
    const fun = andando ? 1 : 1 + Math.max(0, Math.sin(t * 14)) * 0.25 * (Math.sin(t * 1.3) > 0 ? 1 : 0);
    n.nariz.scaling.set(fun, 1 / fun, 1);
    n.cabeca.rotation.z = andando ? 0 : Math.sin(t * 0.7) * 0.12;
    n.maoE.rotation.x = andando ? -noAr * 0.6 : 0;
    n.maoD.rotation.x = andando ? -noAr * 0.6 : 0;
    n.olhos.scaling.y = piscando(bicho, 2.8) ? 0.12 : 1;
  } else if (bicho.id === 'tartaruga') {
    bicho.fase += dt * (andando ? 1.6 + quer * 0.35 : 0);
    const ciclo = bicho.fase * Math.PI * 2;
    const passo = andando ? Math.sin(ciclo) : 0;
    // as patinhas remam em diagonal e o casco balança de lado
    n.pernaFE.rotation.x = passo * 0.6;
    n.pernaTD.rotation.x = passo * 0.6;
    n.pernaFD.rotation.x = -passo * 0.6;
    n.pernaTE.rotation.x = -passo * 0.6;
    n.casco.rotation.z = passo * 0.07;
    n.casco.position.y = andando ? Math.abs(Math.sin(ciclo)) * 0.015 : Math.sin(t * 1.4) * 0.006 * (1 - q);
    // parada, recolhe um pouco a cabeça e cochila de olho fechado; andando, estica a cabeça
    n.cabeca.position.z = 0.26 + (andando ? 0.03 + Math.sin(ciclo * 2) * 0.012 : 0) - q * 0.07;
    n.cabeca.position.y = 0.21 - q * 0.04;
    n.cabeca.rotation.x = q * 0.2;
    n.olhos.scaling.y = q > 0.6 ? 0.15 : piscando(bicho, 3.6) ? 0.12 : 1;
    n.rabo.rotation.y = Math.sin(t * 3) * 0.2;
  } else {
    // passarinho: bate as asinhas de vez em quando (mais vezes com a criança andando),
    // balança no ombro e inclina a cabeça
    const andandoC = !!c && quer > 0;
    bicho.proxima -= dt;
    if (bicho.proxima <= 0) {
      bicho.proxima = andandoC ? 1.0 : 2.2;
      bicho.batendo = 0.55;
    }
    bicho.batendo = Math.max(0, bicho.batendo - dt);
    const bate = bicho.batendo > 0 ? Math.sin(t * 38) * 0.5 + 0.55 : 0.08;
    n.asaE.rotation.z = -bate;
    n.asaD.rotation.z = bate;
    n.corpo.position.y = bicho.batendo > 0 ? 0.04 * Math.sin((bicho.batendo / 0.55) * Math.PI) : 0;
    n.cabeca.rotation.z = Math.sin(t * 1.3) * 0.25 * (Math.sin(t * 0.45) > 0 ? 1 : 0);
    n.cabeca.rotation.x = Math.sin(t * 2.1) * 0.06;
    n.rabo.rotation.x = Math.sin(t * 5) * 0.12;
    n.olhos.scaling.y = piscando(bicho, 3.3) ? 0.12 : 1;
  }
}

/** Passarinho: a graça no ombro (a criança andando faz ele bater as asas mais vezes). */
export function animarPassarinho(bicho: BichoEsboco, dt: number, criancaAndando: boolean): void {
  animar(bicho, dt, false, criancaAndando ? 1 : 0, criancaAndando ? { x: 0, y: 0, z: 0, yaw: 0 } : undefined);
}

export function zerarBicho(bicho: BichoEsboco): void {
  bicho.fase = 0;
  bicho.t = 0;
  bicho.parado = 0;
  bicho.quieto = 0;
  bicho.proxima = 1.2;
  bicho.batendo = 0;
  bicho.pulo = 0;
}
