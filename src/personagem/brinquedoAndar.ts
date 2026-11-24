/**
 * Spec 036: o brinquedo de andar no boneco (o patinete de luz, o carrinho de pedal, a
 * bicicletinha e a nuvem fofa) e a pose de quem está montada. Só dados e contas: o desenho
 * (`render/boneco.ts`) monta as peças uma vez, quando o brinquedo está vestido, num nó próprio
 * (`brinquedo`, na junta `prancha`, debaixo dos pés), e o `montado` só acende esse nó e troca a
 * pose. Montar e descer nunca refazem o boneco (T04).
 *
 * T05: os modelos de verdade, saídos do esboço aprovado (`src/esboco/lojinhaPecas.ts`), no traço
 * das peças do boneco (caixas de canto redondo, bolinhas, cones, anéis e placas), com a correção
 * da spec (a bicicletinha maior), e as animações:
 * - o impulso com o pé no patinete andando e, parado, um pé descansando para trás;
 * - o pedal no carrinho e na bicicletinha, com as pernas acompanhando a volta do pedal;
 * - as rodinhas girando pela velocidade de verdade (o caminho andado sobre o raio da roda);
 * - a nuvem boiando devagar, com a criança junto (um seno só: nada treme).
 *
 * As partes que giram ficam em nós próprios dentro do nó do brinquedo (`andarRodaF`,
 * `andarRodaT`, `andarRodinhaE` com as duas rodinhas de apoio, `andarPedal`); a nuvem boia com o
 * nó do brinquedo inteiro (uma malha só). O estado do andar
 * (`EstadoAndar`) anda a cada quadro em `avancarAndar`, e a pose e os nós leem dele: as pernas e o
 * pedal ficam sempre na mesma volta.
 */
import type { Junta, Peca, RotacoesPose, SubjuntaPremium } from './boneco';
import type { Pose } from './poses';
import { Pecas, misturarCor } from './bonecoPremium';
import { perfilEstrela, perfilFolha } from './bonecoFantasia';

type V3 = [number, number, number];

/** Os brinquedos de andar da 036 (os ids do catálogo, categoria `andar`). */
export const IDS_ANDAR = ['patinete-luz', 'carrinho-pedal', 'bicicletinha', 'nuvem-fofa'] as const;
export type IdAndar = (typeof IDS_ANDAR)[number];

export const ehBrinquedoAndar = (id: unknown): id is IdAndar =>
  typeof id === 'string' && (IDS_ANDAR as readonly string[]).includes(id);

/** Como a criança fica em cada brinquedo (as medidas do esboço aprovado). */
export interface Montaria {
  /** A altura do corpo (o mesmo `corpoY` da pose: 0 é de pé no chão). */
  corpoY: number;
  sentada: boolean;
  /** Os braços para a frente (rad, negativo para a frente) e abertos para fora. */
  bracoX: number;
  bracoAbre: number;
  /** As pernas (rad, negativo para a frente). */
  perna: number;
  /** O vaivém das pernas no pedal (rad; 0 sem pedal). */
  pedal: number;
  troncoX: number;
  /** O raio das rodas (0: não tem roda), para girar com o caminho andado. */
  raioRoda: number;
  /** O balanço de sobe e desce (só a nuvem). */
  flutua?: number;
}

/** A bicicletinha maior que no esboço (spec: ela ficava pequena perto do boneco). */
const BICI = 1.2;
/** O meio do guidão da bicicletinha (antes da escala dela). */
const GUIDAO_BICI: V3 = [0, 0.84, 0.36];

export const MONTARIA: Readonly<Record<IdAndar, Montaria>> = {
  'patinete-luz': { corpoY: 0.135, sentada: false, bracoX: -1.0, bracoAbre: -0.12, perna: 0, pedal: 0, troncoX: 0.08, raioRoda: 0.075 },
  // (portão: as pernas descem para dentro do capô, onde ficam os pedais; esticadas para a frente,
  // os sapatos saíam por cima dele)
  'carrinho-pedal': { corpoY: 0.025, sentada: true, bracoX: -0.85, bracoAbre: -0.16, perna: -1.05, pedal: 0.1, troncoX: 0.04, raioRoda: 0.13 },
  bicicletinha: { corpoY: 0.3 + 0.47 * (BICI - 1), sentada: true, bracoX: -1.05, bracoAbre: -0.05, perna: -0.62, pedal: 0.3, troncoX: 0.42, raioRoda: 0.2 * BICI },
  'nuvem-fofa': { corpoY: 0.36, sentada: true, bracoX: -0.25, bracoAbre: 0.35, perna: -1.3, pedal: 0, troncoX: 0, raioRoda: 0, flutua: 0.035 },
};

/**
 * Onde as mãos fecham em cada brinquedo (no espaço da prancha, antes da escala do boneco): os
 * punhos do guidão (o patinete, a bicicletinha), os dois lados do volante (o carrinho) e, na nuvem,
 * a almofada da frente. `folga`: o quanto a mão pode ficar longe do ponto (em blocos).
 */
export const GUIDAO: Readonly<Record<IdAndar, { E: V3; D: V3; folga: number }>> = {
  'patinete-luz': { E: [-0.2, 0.71, 0.27], D: [0.2, 0.71, 0.27], folga: 0.07 },
  'carrinho-pedal': { E: [-0.13, 0.57, 0.15], D: [0.13, 0.57, 0.15], folga: 0.07 },
  bicicletinha: {
    E: [-0.21 * BICI, GUIDAO_BICI[1] * BICI, GUIDAO_BICI[2] * BICI],
    D: [0.21 * BICI, GUIDAO_BICI[1] * BICI, GUIDAO_BICI[2] * BICI],
    folga: 0.07,
  },
  'nuvem-fofa': { E: [-0.37, 0.8, 0.1], D: [0.37, 0.8, 0.1], folga: 0.07 },
};

// ------------------------------------------------------------------ o estado do andar
/** O que anda de um quadro para o outro (as fases), um por boneco. */
export interface EstadoAndar {
  t: number;
  /** O giro das rodas (rad) e o do pedal (rad). */
  roda: number;
  pedal: number;
  /** Andando (0 a 1, suavizado) e a velocidade (blocos por segundo, suavizada). */
  andando: number;
  vel: number;
}

export const estadoAndar = (): EstadoAndar => ({ t: 0, roda: 0, pedal: 0, andando: 0, vel: 0 });

/** A escala do boneco (o plano é medido antes dela: o chão anda em blocos de verdade). */
const ESCALA = 1.15;

/**
 * Um quadro do andar: `vel` é a velocidade da criança (blocos por segundo). As rodas giram pelo
 * caminho andado sobre o raio (nada de roda patinando), o pedal pela volta da roda (a bicicleta
 * numa marcha leve, o carrinho no ritmo do pé).
 */
export function avancarAndar(e: EstadoAndar, id: string, dt: number, vel: number): void {
  if (!ehBrinquedoAndar(id) || dt <= 0) return;
  const m = MONTARIA[id];
  e.t += dt;
  e.vel += (vel - e.vel) * Math.min(1, dt * 8);
  e.andando += ((e.vel > 0.4 ? 1 : 0) - e.andando) * Math.min(1, dt * 6);
  if (m.raioRoda > 0) e.roda = (e.roda + (e.vel / (m.raioRoda * ESCALA)) * dt) % (Math.PI * 2);
  if (id === 'bicicletinha') e.pedal = (e.pedal + (e.vel / (m.raioRoda * ESCALA)) * dt * 0.55) % (Math.PI * 2);
  if (id === 'carrinho-pedal') e.pedal = (e.pedal + e.vel * dt * 2.2) % (Math.PI * 2);
}

/** A nuvem sobe e desce devagar (o nó dela e o corpo da criança, juntos). */
export const boiarNuvem = (e: EstadoAndar): number => Math.sin(e.t * 1.6) * (MONTARIA['nuvem-fofa'].flutua ?? 0);

/** O impulso do patinete (0 a 1): a cada 1,3 s, andando, o pé esquerdo empurra o chão. */
export function impulsoPatinete(e: EstadoAndar): number {
  const k = (e.t % 1.3) / 1.3;
  return (k < 0.5 ? Math.sin((k / 0.5) * Math.PI) : 0) * e.andando;
}

// ------------------------------------------------------------------ as peças
const J: Junta = 'prancha';
/** O nó do brinquedo (o desenho acende e apaga ele inteiro ao montar e descer). */
const NO = { subjunta: { nome: 'brinquedo' as const, pivo: [0, 0, 0] as V3 } };
/** Um nó que gira dentro do brinquedo (as rodas, o pedal, a nuvem que boia). */
const giro = (nome: SubjuntaPremium, pivo: V3) => ({ subjunta: { nome, pivo, pai: 'brinquedo' as const } });

/**
 * Um tubo (cilindro) de `a` até `b`: o meio, o comprimento e o giro que leva o eixo y do cilindro
 * para a direção a→b (o Babylon gira em z, depois em x, depois em y).
 */
function tubo(P: Pecas, nome: string, a: V3, b: V3, r: number, cor: string): void {
  const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const n: V3 = [d[0] / l, d[1] / l, d[2] / l];
  const rz = -Math.asin(Math.max(-1, Math.min(1, n[0])));
  const rx = Math.atan2(n[2], n[1]);
  P.cone(nome, J, undefined, l, r, r, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], cor, { rot: [rx, 0, rz], ...NO });
}

function patinete(P: Pecas): void {
  const VIOLETA = '#7b5cff';
  const VIOLETA_ESC = '#5b40d8';
  const BRANCO = '#f4f6ff';
  const GRAFITE = '#3b3650';
  // o deque baixinho, com a lixa e duas estrelinhas brancas
  P.caixa('andar-patinete-deque', J, undefined, [0.32, 0.055, 0.74], [0, 0.1, -0.03], VIOLETA, 0.027, { brilho: 0.5, ...NO });
  P.caixa('andar-patinete-lixa', J, undefined, [0.27, 0.01, 0.56], [0, 0.131, -0.06], GRAFITE, 0.004, NO);
  for (const [x, z, g] of [
    [0.075, -0.27, 0.3],
    [-0.08, -0.31, -0.5],
  ])
    P.placa(`andar-patinete-estrela${x}`, J, undefined, perfilEstrela(0.035), 0.008, [x, 0.137, z], BRANCO, { rot: [-Math.PI / 2, 0, g], ...NO });
  // o para-lama de trás e o bloco da frente (onde as duas rodas da frente se prendem)
  P.caixa('andar-patinete-paralama', J, undefined, [0.1, 0.03, 0.17], [0, 0.165, -0.37], VIOLETA, 0.015, { rot: [0.3, 0, 0], ...NO });
  P.caixa('andar-patinete-frente', J, undefined, [0.36, 0.07, 0.14], [0, 0.1, 0.3], VIOLETA_ESC, 0.03, NO);
  // a haste, o colar e o guidão com os punhos
  P.cone('andar-patinete-haste', J, undefined, 0.58, 0.032, 0.03, [0, 0.42, 0.29], BRANCO, { brilho: 0.5, ...NO });
  P.caixa('andar-patinete-colar', J, undefined, [0.09, 0.07, 0.09], [0, 0.17, 0.29], VIOLETA, 0.03, NO);
  P.cone('andar-patinete-guidao', J, undefined, 0.5, 0.026, 0.026, [0, 0.71, 0.27], BRANCO, { rot: [0, 0, Math.PI / 2], brilho: 0.5, ...NO });
  P.bola('andar-patinete-trava', J, undefined, 0.045, [0, 0.71, 0.28], VIOLETA_ESC, [1, 1, 1], NO);
  for (const s of [-1, 1]) {
    P.cone(`andar-patinete-punho${s}`, J, undefined, 0.13, 0.04, 0.04, [s * 0.2, 0.71, 0.27], VIOLETA, { rot: [0, 0, Math.PI / 2], ...NO });
    P.bola(`andar-patinete-ponta${s}`, J, undefined, 0.041, [s * 0.265, 0.71, 0.27], VIOLETA_ESC, [0.6, 1, 1], NO);
  }
  // as rodinhas: duas na frente e uma atrás, de luz verde-água mansa, com o miolo branco e a
  // bolinha que mostra que estão girando
  const rodas: Array<[SubjuntaPremium, V3, number[]]> = [
    ['andarRodaF', [0, 0.075, 0.3], [-0.135, 0.135]],
    ['andarRodaT', [0, 0.075, -0.37], [0]],
  ];
  for (const [nome, pivo, xs] of rodas)
    for (const x of xs) {
      const g = giro(nome, pivo);
      P.cone(`andar-patinete-luz-${nome}${x}`, J, undefined, 0.07, 0.075, 0.075, [x, 0, 0], '#5fe8cf', { rot: [0, 0, Math.PI / 2], luz: 'menta', ...g });
      P.cone(`andar-patinete-cubo-${nome}${x}`, J, undefined, 0.076, 0.036, 0.036, [x, 0, 0], BRANCO, { rot: [0, 0, Math.PI / 2], ...g });
      const fora = x === 0 ? 0.04 : Math.sign(x) * 0.04 + x;
      P.bola(`andar-patinete-marca-${nome}${x}`, J, undefined, 0.016, [fora, 0.047, 0], BRANCO, [0.6, 1, 1], g);
      if (x === 0) P.bola(`andar-patinete-marca2-${nome}`, J, undefined, 0.016, [-0.04, -0.047, 0], BRANCO, [0.6, 1, 1], g);
    }
}

function carrinho(P: Pecas): void {
  const AZUL = '#2fb2ea';
  const AZUL_ESC = '#1f86c6';
  const CREME = '#fff3da';
  const AMARELO = '#ffd23a';
  const PNEU = '#35313f';
  const CINZA = '#e6e9f2';
  const LARANJA = '#ff8a3d';
  // o assoalho, as laterais com o friso branco, o capô e a traseira (aberto em cima, sem teto)
  P.caixa('andar-carrinho-assoalho', J, undefined, [0.7, 0.07, 1.06], [0, 0.16, 0.02], AZUL_ESC, 0.03, NO);
  for (const s of [-1, 1]) {
    P.caixa(`andar-carrinho-lado${s}`, J, undefined, [0.1, 0.27, 0.96], [s * 0.34, 0.29, 0.02], AZUL, 0.05, { brilho: 0.5, ...NO });
    P.caixa(`andar-carrinho-friso${s}`, J, undefined, [0.012, 0.045, 0.74], [s * 0.392, 0.32, 0.02], '#ffffff', 0.008, NO);
  }
  P.caixa('andar-carrinho-capo', J, undefined, [0.78, 0.3, 0.42], [0, 0.3, 0.4], AZUL, 0.13, { brilho: 0.5, ...NO });
  P.caixa('andar-carrinho-painel', J, undefined, [0.62, 0.1, 0.12], [0, 0.46, 0.21], AZUL_ESC, 0.045, NO);
  P.caixa('andar-carrinho-traseira', J, undefined, [0.78, 0.34, 0.24], [0, 0.3, -0.44], AZUL, 0.11, { brilho: 0.5, ...NO });
  P.caixa('andar-carrinho-parachoque', J, undefined, [0.8, 0.08, 0.08], [0, 0.18, 0.63], CINZA, 0.04, { brilho: 0.5, ...NO });
  P.caixa('andar-carrinho-parachoque2', J, undefined, [0.8, 0.08, 0.08], [0, 0.18, -0.58], CINZA, 0.04, { brilho: 0.5, ...NO });
  // os faróis redondos (luz morna e mansa) com o aro
  for (const s of [-1, 1]) {
    P.bola(`andar-carrinho-farol${s}`, J, undefined, 0.058, [s * 0.22, 0.35, 0.6], '#fff4d0', [1, 1, 0.6], { luz: 'farol', ...NO });
    P.anel(`andar-carrinho-aro${s}`, J, undefined, 0.13, 0.026, [s * 0.22, 0.35, 0.595], CINZA, { rot: [Math.PI / 2, 0, 0], brilho: 0.5, ...NO });
  }
  // o banco creme com o encosto
  P.caixa('andar-carrinho-assento', J, undefined, [0.52, 0.07, 0.32], [0, 0.22, -0.16], CREME, 0.03, NO);
  P.caixa('andar-carrinho-encosto', J, undefined, [0.52, 0.28, 0.07], [0, 0.4, -0.33], CREME, 0.03, NO);
  // o volante na frente da criança
  tubo(P, 'andar-carrinho-coluna', [0, 0.45, 0.27], [0, 0.55, 0.15], 0.022, CINZA);
  P.anel('andar-carrinho-volante', J, undefined, 0.27, 0.04, [0, 0.56, 0.14], '#3c3a48', { rot: [-0.95, 0, 0], ...NO });
  P.bola('andar-carrinho-buzina', J, undefined, 0.045, [0, 0.565, 0.145], AMARELO, [1, 0.55, 1], { rot: [-0.95, 0, 0], ...NO });
  // a bandeirinha laranja atrás
  tubo(P, 'andar-carrinho-mastro', [0.28, 0.44, -0.5], [0.28, 1.05, -0.52], 0.012, CINZA);
  P.placa(
    'andar-carrinho-bandeira',
    J,
    undefined,
    [
      [0, 0.09],
      [0, -0.09],
      [0.2, 0],
    ],
    0.012,
    [0.28, 0.98, -0.52],
    LARANJA,
    { rot: [0, Math.PI / 2, 0], ...NO },
  );
  // as quatro rodas (pneu, a calota amarela e o parafuso que mostra o giro)
  for (const [nome, z] of [
    ['andarRodaF', 0.38],
    ['andarRodaT', -0.34],
  ] as const) {
    const g = giro(nome, [0, 0.13, z]);
    for (const s of [-1, 1]) {
      P.cone(`andar-carrinho-pneu-${nome}${s}`, J, undefined, 0.1, 0.13, 0.13, [s * 0.4, 0, 0], PNEU, { rot: [0, 0, Math.PI / 2], ...g });
      P.cone(`andar-carrinho-calota-${nome}${s}`, J, undefined, 0.106, 0.065, 0.065, [s * 0.4, 0, 0], AMARELO, { rot: [0, 0, Math.PI / 2], brilho: 0.5, ...g });
      P.bola(`andar-carrinho-parafuso-${nome}${s}`, J, undefined, 0.018, [s * 0.455, 0.035, 0], '#ffffff', [0.6, 1, 1], g);
    }
  }
}

function bicicleta(P: Pecas): void {
  const MENTA = '#34c995';
  const MENTA_ESC = '#22a477';
  const CREME = '#fff3da';
  const PNEU = '#3a3644';
  const CARAMELO = '#d8a15a';
  const ROSA = '#ff8fbf';
  const PRATA = '#dfe3ee';
  const k = BICI;
  const K = (v: V3): V3 => [v[0] * k, v[1] * k, v[2] * k];
  const R = 0.2 * k;
  const tras = K([0, 0.2, -0.24]);
  const frente = K([0, 0.2, 0.56]);
  const pedal = K([0, 0.24, 0.14]);
  // o quadro primeiro (o nó do brinquedo nasce antes dos nós que giram dentro dele)
  tubo(P, 'andar-bici-canote', pedal, K([0, 0.5, -0.01]), 0.028 * k, MENTA);
  tubo(P, 'andar-bici-baixo-tras', tras, pedal, 0.022 * k, MENTA);
  tubo(P, 'andar-bici-cima-tras', tras, K([0, 0.45, -0.005]), 0.02 * k, MENTA);
  tubo(P, 'andar-bici-diagonal', pedal, K([0, 0.58, 0.45]), 0.03 * k, MENTA);
  tubo(P, 'andar-bici-cima', K([0, 0.46, 0]), K([0, 0.64, 0.45]), 0.026 * k, MENTA);
  tubo(P, 'andar-bici-garfo', frente, K([0, 0.86, 0.43]), 0.025 * k, MENTA_ESC);
  P.cone('andar-bici-caixa', J, undefined, 0.16 * k, 0.034 * k, 0.034 * k, K([0, 0.62, 0.47]), MENTA_ESC, { rot: [-0.2, 0, 0], ...NO });
  // as rodas: pneu, raios e o miolo (gira inteira no nó dela)
  for (const [nome, c] of [
    ['andarRodaT', tras],
    ['andarRodaF', frente],
  ] as const) {
    const g = giro(nome, c);
    P.anel(`andar-bici-pneu-${nome}`, J, undefined, R * 2 - 0.06 * k, 0.065 * k, [0, 0, 0], PNEU, { rot: [0, 0, Math.PI / 2], ...g });
    P.anel(`andar-bici-aro-${nome}`, J, undefined, R * 2 - 0.13 * k, 0.02 * k, [0, 0, 0], CREME, { rot: [0, 0, Math.PI / 2], ...g });
    for (let i = 0; i < 3; i++)
      P.caixa(`andar-bici-raio-${nome}${i}`, J, undefined, [0.014, R * 2 - 0.14 * k, 0.014], [0, 0, 0], CREME, 0.005, { rot: [(i * Math.PI) / 3, 0, 0], ...g });
    P.cone(`andar-bici-cubo-${nome}`, J, undefined, 0.07 * k, 0.035 * k, 0.035 * k, [0, 0, 0], MENTA_ESC, { rot: [0, 0, Math.PI / 2], ...g });
  }
  // o guidão com os punhos rosa e a campainha
  // (T05, acerto do dono: o guidão um tico para trás e para baixo, com a mesa saindo do garfo, para
  // as mãos da criança alcançarem os punhos)
  const [, gy, gz] = GUIDAO_BICI;
  tubo(P, 'andar-bici-mesa', K([0, 0.86, 0.43]), K([0, gy, gz]), 0.022 * k, MENTA_ESC);
  P.cone('andar-bici-guidao', J, undefined, 0.5 * k, 0.022 * k, 0.022 * k, K([0, gy, gz]), PRATA, { rot: [0, 0, Math.PI / 2], brilho: 0.5, ...NO });
  for (const s of [-1, 1]) {
    P.cone(`andar-bici-punho${s}`, J, undefined, 0.12 * k, 0.034 * k, 0.034 * k, K([s * 0.21, gy, gz]), ROSA, { rot: [0, 0, Math.PI / 2], ...NO });
    P.bola(`andar-bici-ponta${s}`, J, undefined, 0.036 * k, K([s * 0.275, gy, gz]), ROSA, [0.6, 1, 1], NO);
  }
  P.bola('andar-bici-campainha', J, undefined, 0.032 * k, K([-0.13, gy + 0.035, gz]), '#ffc93d', [1, 0.6, 1], { brilho: 0.8, ...NO });
  // o selim creme
  P.caixa('andar-bici-selim', J, undefined, [0.18 * k, 0.06 * k, 0.26 * k], K([0, 0.47, 0]), CREME, 0.03 * k, NO);
  // a cestinha de vime com a flor
  P.caixa('andar-bici-cesta', J, undefined, [0.3 * k, 0.17 * k, 0.2 * k], K([0, 0.72, 0.6]), CARAMELO, 0.035 * k, NO);
  P.caixa('andar-bici-cesta-borda', J, undefined, [0.32 * k, 0.03 * k, 0.22 * k], K([0, 0.805, 0.6]), misturarCor(CARAMELO, '#7a4e2a', 0.4), 0.015, NO);
  for (const y of [0.68, 0.74])
    P.caixa(`andar-bici-cesta-fio${y}`, J, undefined, [0.305 * k, 0.012, 0.205 * k], K([0, y, 0.6]), misturarCor(CARAMELO, '#ffffff', 0.35), 0.005, NO);
  P.bola('andar-bici-flor', J, undefined, 0.05 * k, K([0.06, 0.83, 0.6]), ROSA, [1, 1, 0.7], NO);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    P.bola(`andar-bici-petala${i}`, J, undefined, 0.032 * k, K([0.06 + Math.cos(a) * 0.045, 0.83 + Math.sin(a) * 0.045, 0.6]), ROSA, [1, 1, 0.5], NO);
  }
  P.bola('andar-bici-miolo', J, undefined, 0.025 * k, K([0.06, 0.83, 0.625]), '#ffd23a', [1, 1, 0.6], NO);
  P.placa('andar-bici-folha', J, undefined, perfilFolha(0.08 * k), 0.012, K([-0.04, 0.82, 0.6]), '#4cc26a', { rot: [0, 0, 0.8], ...NO });
  // o pedal (gira no nó dele) e a coroa
  const gp = giro('andarPedal', pedal);
  P.cone('andar-bici-coroa', J, undefined, 0.02 * k, 0.07 * k, 0.07 * k, [0.045 * k, 0, 0], MENTA_ESC, { rot: [0, 0, Math.PI / 2], ...gp });
  for (const s of [-1, 1]) {
    P.caixa(`andar-bici-pedivela${s}`, J, undefined, [0.026 * k, 0.11 * k, 0.03 * k], [s * 0.065 * k, s * 0.05 * k, 0], PRATA, 0.01, gp);
    P.caixa(`andar-bici-pedal${s}`, J, undefined, [0.08 * k, 0.026 * k, 0.06 * k], [s * 0.11 * k, s * 0.1 * k, 0], '#3c3a48', 0.01, gp);
  }
  // as rodinhas de apoio, atrás (as duas no mesmo eixo: um nó só gira as duas, uma malha a menos)
  const gr = giro('andarRodinhaE', K([0, 0.08, -0.24]));
  for (const s of [-1, 1]) {
    const c = K([s * 0.22, 0.08, -0.24]);
    tubo(P, `andar-bici-apoio${s}`, c, K([s * 0.03, 0.2, -0.24]), 0.014 * k, PRATA);
    const x = s * 0.22 * k;
    P.cone(`andar-bici-rodinha${s}`, J, undefined, 0.045 * k, 0.08 * k, 0.08 * k, [x, 0, 0], CREME, { rot: [0, 0, Math.PI / 2], ...gr });
    P.cone(`andar-bici-rodinha-cubo${s}`, J, undefined, 0.05 * k, 0.03 * k, 0.03 * k, [x, 0, 0], MENTA, { rot: [0, 0, Math.PI / 2], ...gr });
    P.bola(`andar-bici-rodinha-marca${s}`, J, undefined, 0.012 * k, [x + s * 0.024 * k, 0.05 * k, 0], MENTA_ESC, [0.6, 1, 1], gr);
  }
}

function nuvem(P: Pecas): void {
  const B = '#ffffff';
  const B2 = '#f1f4ff';
  const B3 = '#dfe6ff';
  // a almofada de nuvem: bolinhas fofas juntas, o fundo um tico azulado, o encosto atrás e as
  // duas bochechas na frente onde as pernas descansam (tudo no nó do brinquedo, que boia inteiro:
  // uma malha só)
  const bolas: Array<[number, number, number, number, string]> = [
    [0, 0.36, 0, 0.34, B],
    [-0.31, 0.35, 0.06, 0.25, B],
    [0.31, 0.35, 0.06, 0.25, B],
    [0, 0.34, 0.38, 0.26, B],
    [-0.27, 0.33, 0.38, 0.19, B2],
    [0.27, 0.33, 0.38, 0.19, B2],
    [0, 0.35, -0.36, 0.27, B],
    [-0.28, 0.34, -0.3, 0.21, B2],
    [0.28, 0.34, -0.3, 0.21, B2],
    [-0.17, 0.52, -0.33, 0.19, B],
    [0.17, 0.52, -0.33, 0.19, B],
    [0, 0.58, -0.4, 0.2, B],
    // (T05: os dois bracinhos da poltrona de nuvem, onde as mãos descansam)
    [-0.37, 0.66, 0.1, 0.16, B],
    [0.37, 0.66, 0.1, 0.16, B],
    [-0.15, 0.47, 0.47, 0.15, B],
    [0.15, 0.47, 0.47, 0.15, B],
    [0, 0.21, 0.02, 0.29, B3],
    [-0.26, 0.23, 0.14, 0.18, B3],
    [0.26, 0.23, 0.14, 0.18, B3],
    [0, 0.22, -0.3, 0.2, B3],
  ];
  bolas.forEach(([x, y, z, r, cor], i) => P.bola(`andar-nuvem-fofo${i}`, J, undefined, r, [x, y, z], cor, [1, 0.78, 1], { brilho: 0.15, ...NO }));
}

/**
 * As peças do brinquedo de andar vestido, todas na junta `prancha`: no nó `brinquedo` (que só
 * aparece com a criança montada) ou num nó que gira dentro dele.
 */
export function vestirBrinquedoAndar(id: string, lista: Peca[]): void {
  if (!ehBrinquedoAndar(id)) return;
  const antes = lista.length;
  const P = new Pecas(lista);
  if (id === 'patinete-luz') patinete(P);
  else if (id === 'carrinho-pedal') carrinho(P);
  else if (id === 'bicicletinha') bicicleta(P);
  else nuvem(P);
  // desempenho (T05, a meta da spec: no máximo +20 chamadas de desenho com 4 amigos montados):
  // cada nó leva uma malha por brilho; o brinquedo inteiro num brilho só (o acetinado, o mesmo
  // degrau dos tesouros) deixa uma malha por nó, e a luz das rodinhas e dos faróis à parte
  for (let i = antes; i < lista.length; i++) if (!lista[i].luz) lista[i].brilho = lista[i].nome.startsWith('andar-nuvem') ? 0.15 : 0.45;
}

/** Os nós que giram dentro do brinquedo (o desenho gira; os testes conferem). */
export const NOS_DO_ANDAR: readonly SubjuntaPremium[] = ['andarRodaF', 'andarRodaT', 'andarRodinhaE', 'andarPedal'];

/**
 * A pose de quem está montada: o corpo na altura do brinquedo, as pernas (de pé no deque com o
 * impulso, ou sentada no pedal) e as mãos no guidão. Durante um gesto, o gesto manda nos braços
 * (montada, a criança faz tudo). Muda `alvo` no lugar. Sem `e` (o estado do andar), parada.
 */
export function poseNoBrinquedo(id: string, alvo: RotacoesPose, pose: Pose, e?: EstadoAndar): void {
  if (!ehBrinquedoAndar(id)) return;
  const m = MONTARIA[id];
  alvo.corpoY = m.corpoY + (m.flutua && e ? boiarNuvem(e) : 0);
  alvo.escala = 1;
  const ped = e ? m.pedal * Math.sin(e.pedal) : 0;
  let pernaE = m.perna - ped;
  let pernaD = m.perna + ped;
  let troncoX = m.troncoX;
  if (id === 'patinete-luz' && e) {
    // andando, o impulso com o pé esquerdo; parado, o pé esquerdo descansa um tico para trás
    const chuta = impulsoPatinete(e);
    pernaE = 0.62 * chuta + 0.28 * (1 - e.andando);
    pernaD = -0.06 * chuta;
    troncoX += 0.1 * chuta;
  }
  alvo.pernaD = [pernaD, 0, 0];
  alvo.pernaE = [pernaE, 0, 0];
  // (T05, acerto do dono: o volante parecia mexer a cada passo. Era o corpo de quem anda a pé:
  // o tronco torcendo para um lado e para o outro a cada passo e o corpo inclinando na corrida,
  // levando os braços junto. Montada, quem anda é o brinquedo: o tronco e o corpo ficam firmes)
  alvo.tronco = [troncoX, 0, 0];
  alvo.corpo = [0, 0, 0];
  const w = 1 - Math.min(1, Math.max(0, (pose.pesoGesto ?? 0) / 0.3));
  if (w <= 0) return;
  const mistura = (a: V3, b: V3): V3 => [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w, a[2] + (b[2] - a[2]) * w];
  alvo.bracoD = mistura(alvo.bracoD, [m.bracoX, 0, 0.06 + m.bracoAbre]);
  alvo.bracoE = mistura(alvo.bracoE, [m.bracoX, 0, -0.06 - m.bracoAbre]);
}

/** O raio de cada roda no mundo (a roda anda o caminho sem patinar). */
export const raioDaRoda = (id: IdAndar): number => MONTARIA[id].raioRoda * ESCALA;
